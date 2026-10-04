const cityInput = document.getElementById("city");
const searchButton = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");
const locationElement = document.getElementById("location");
const temperatureElement = document.querySelector("#weather-section h1");
const conditionElement = document.querySelector("#weather-section p");
const feelsLikeElement = document.querySelector("#weather-section p:last-child");
const weatherIconElement = document.getElementById("weather-icon");
const hourlyContainer = document.getElementById("hourly-container");
const dailyContainer = document.getElementById("daily-container");
const detailCards = document.querySelectorAll(".detail-card");
const sunriseElement = document.getElementById("sunrise");
const sunsetElement = document.getElementById("sunset");
const moonriseElement = document.getElementById("moonrise");
const moonsetElement = document.getElementById("moonset");
const moonPhaseElement = document.getElementById("moon-phase");
const moonIlluminationElement = document.getElementById("moon-illumination");
const moonVisual = document.getElementById("moon-visual");
let suggestionTimer;
searchButton.addEventListener("click", function () {
    getWeather(cityInput.value.trim());
});
cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        getWeather(cityInput.value.trim());
        suggestionsBox.style.display = "none";
    }
});
cityInput.addEventListener("input", function () {
    const value = cityInput.value.trim();
    clearTimeout(suggestionTimer);
    if (value.length < 2) {
        suggestionsBox.innerHTML = "";
        suggestionsBox.style.display = "none";
        return;
    }
    suggestionTimer = setTimeout(function () {
        getSuggestions(value);
    }, 300);
});
async function getSuggestions(city) {
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`);
        const data = await response.json();
        suggestionsBox.innerHTML = "";
        if (!data.results) {
            suggestionsBox.style.display = "none";
            return;
        }
        data.results.forEach(function (place) {
            const suggestion = document.createElement("div");
            suggestion.className = "suggestion";
            const country = place.country || "";
            const state = place.admin1 || "";
            suggestion.innerHTML = `<strong>${place.name}</strong><span>${state ? state + ", " : ""}${country}</span>`;
            suggestion.addEventListener("click", function () {
                cityInput.value = place.name;
                suggestionsBox.style.display = "none";
                getWeatherByCoordinates(place);
            });
            suggestionsBox.appendChild(suggestion);
        });
        suggestionsBox.style.display = "block";
    } catch (error) {
        console.error("Suggestion error:", error);
    }
}
const savedCity = localStorage.getItem("weatherCity");
if (savedCity) {
    cityInput.value = savedCity;
    getWeather(savedCity);
}
async function getWeather(city) {
    if (!city) {
        alert("Please enter a city");
        return;
    }
    try {
        searchButton.textContent = "⏳";
        const locationResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const locationData = await locationResponse.json();
        if (!locationData.results || locationData.results.length === 0) {
            alert("City not found");
            return;
        }
        const place = locationData.results[0];
        await getWeatherByCoordinates(place);
    } catch (error) {
        console.error(error);
        alert("Something went wrong. Check the console.");
    } finally {
        searchButton.textContent = "🔍";
    }
}
async function getWeatherByCoordinates(place) {
    try {
        searchButton.textContent = "⏳";
        localStorage.setItem("weatherCity", place.name);
        cityInput.value = place.name;
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,moonrise,moonset,moon_phase&forecast_days=7&timezone=auto`);
        const weatherData = await weatherResponse.json();
        updateCurrentWeather(weatherData, place);
        updateDetails(weatherData);
        createHourlyForecast(weatherData);
        createDailyForecast(weatherData);
        updateAstronomy(weatherData);
        changeBackground(weatherData.current.temperature_2m, weatherData.current.weather_code);
    } catch (error) {
        console.error(error);
        alert("Could not load weather data.");
    } finally {
        searchButton.textContent = "🔍";
    }
}
function updateCurrentWeather(weatherData, place) {
    const current = weatherData.current;
    locationElement.textContent = `${place.name}, ${place.country}`;
    temperatureElement.textContent = `${Math.round(current.temperature_2m)}°C`;
    conditionElement.textContent = getWeatherCondition(current.weather_code);
    feelsLikeElement.textContent = `Feels like ${Math.round(current.apparent_temperature)}°`;
    weatherIconElement.textContent = getWeatherIcon(current.weather_code);
}
function updateDetails(weatherData) {
    const current = weatherData.current;
    const humidity = current.relative_humidity_2m;
    detailCards[0].querySelector("strong").textContent = `${humidity}%`;
    document.getElementById("humidity-fill").style.width = `${humidity}%`;
    const wind = current.wind_speed_10m;
    detailCards[1].querySelector("strong").textContent = `${Math.round(wind)} km/h`;
    const visibility = Math.round(current.visibility / 1000);
    detailCards[2].querySelector("strong").textContent = `${visibility} km`;
    const visibilityPercentage = Math.min((visibility / 10) * 100, 100);
    document.getElementById("visibility-fill").style.width = `${visibilityPercentage}%`;
    const pressure = Math.round(current.surface_pressure);
    detailCards[3].querySelector("strong").textContent = `${pressure} hPa`;
}
function createHourlyForecast(weatherData) {
    hourlyContainer.innerHTML = "";
    const hourly = weatherData.hourly;
    let currentIndex = hourly.time.findIndex(function (time) {
        return time.slice(0, 13) === weatherData.current.time.slice(0, 13);
    });
    if (currentIndex === -1) {
        currentIndex = 0;
    }
    for (let i = currentIndex; i < currentIndex + 24; i++) {
        if (i >= hourly.time.length) {
            break;
        }
        const card = document.createElement("div");
        card.className = "hour-card";
        const time = formatTime(hourly.time[i]);
        const temperature = Math.round(hourly.temperature_2m[i]);
        const rainChance = hourly.precipitation_probability[i];
        const icon = getWeatherIcon(hourly.weather_code[i]);
        card.innerHTML = `<span class="hour-time">${time}</span><div class="hour-icon">${icon}</div><div class="hour-temp">${temperature}°</div><div class="drop-container"><div class="drop-fill" style="height: ${rainChance}%"></div></div><div class="rain-percent">${rainChance}%</div>`;
        hourlyContainer.appendChild(card);
    }
}
function createDailyForecast(weatherData) {
    dailyContainer.innerHTML = "";
    const daily = weatherData.daily;
    for (let i = 0; i < 7; i++) {
        const card = document.createElement("div");
        card.className = "day-card";
        const day = formatDay(daily.time[i]);
        const icon = getWeatherIcon(daily.weather_code[i]);
        const maximum = Math.round(daily.temperature_2m_max[i]);
        const minimum = Math.round(daily.temperature_2m_min[i]);
        card.innerHTML = `<div class="day-name">${day}</div><div class="day-icon">${icon}</div><div class="day-temperature">${maximum}° / ${minimum}°</div>`;
        dailyContainer.appendChild(card);
    }
}
function updateAstronomy(weatherData) {
    const daily = weatherData.daily;
    sunriseElement.textContent = formatTime(daily.sunrise[0]);
    sunsetElement.textContent = formatTime(daily.sunset[0]);
    moonriseElement.textContent = formatTime(daily.moonrise[0]);
    moonsetElement.textContent = formatTime(daily.moonset[0]);
    const moonPhase = daily.moon_phase[0];
    const illumination = Math.round(((1 - Math.cos(moonPhase * 2 * Math.PI)) / 2) * 100);
    moonPhaseElement.textContent = getMoonPhaseName(moonPhase);
    moonIlluminationElement.textContent = `${illumination}% illuminated`;
    moonVisual.textContent = getMoonIcon(moonPhase);
}
function getMoonPhaseName(phase) {
    if (phase < 0.03 || phase >= 0.97) return "New Moon";
    if (phase < 0.22) return "Waxing Crescent";
    if (phase < 0.28) return "First Quarter";
    if (phase < 0.47) return "Waxing Gibbous";
    if (phase < 0.53) return "Full Moon";
    if (phase < 0.72) return "Waning Gibbous";
    if (phase < 0.78) return "Last Quarter";
    return "Waning Crescent";
}
function getMoonIcon(phase) {
    if (phase < 0.03 || phase >= 0.97) return "🌑";
    if (phase < 0.22) return "🌒";
    if (phase < 0.28) return "🌓";
    if (phase < 0.47) return "🌔";
    if (phase < 0.53) return "🌕";
    if (phase < 0.72) return "🌖";
    if (phase < 0.78) return "🌗";
    return "🌘";
}
function getWeatherCondition(code) {
    if (code === 0) return "Clear sky";
    if (code === 1) return "Mainly clear";
    if (code === 2) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if (code >= 45 && code <= 48) return "Foggy";
    if (code >= 51 && code <= 57) return "Drizzle";
    if (code >= 61 && code <= 67) return "Rainy";
    if (code >= 71 && code <= 77) return "Snowy";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 85 && code <= 86) return "Snow showers";
    if (code >= 95 && code <= 99) return "Thunderstorm";
    return "Unknown";
}
function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if (code === 1) return "🌤️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 57) return "🌦️";
    if (code >= 61 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 85 && code <= 86) return "🌨️";
    if (code >= 95 && code <= 99) return "⛈️";
    return "🌤️";
}
function formatTime(time) {
    if (!time) return "--:--";
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function formatDay(date) {
    return new Date(date).toLocaleDateString([], { weekday: "short" });
}
function changeBackground(temperature, code) {
    if (code >= 95) {
        document.body.style.background = "linear-gradient(180deg, #4c5875, #8995b3)";
    } else if (code >= 61 && code <= 82) {
        document.body.style.background = "linear-gradient(180deg, #8eb4cc, #d7e4ec)";
    } else if (code >= 3 && code <= 48) {
        document.body.style.background = "linear-gradient(180deg, #a9c5d8, #e3edf2)";
    } else if (temperature >= 35) {
        document.body.style.background = "linear-gradient(180deg, #ffbd6b, #ffe4b5)";
    } else if (temperature >= 25) {
        document.body.style.background = "linear-gradient(180deg, #78c8f5, #d9f2ff)";
    } else if (temperature >= 15) {
        document.body.style.background = "linear-gradient(180deg, #9bd9e8, #e3f7fa)";
    } else {
        document.body.style.background = "linear-gradient(180deg, #aebdcc, #e1e6ed)";
    }
}