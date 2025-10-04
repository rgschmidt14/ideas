document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const checkTempBtn = document.getElementById('checkTempBtn');
    const useLocationBtn = document.getElementById('useLocationBtn');
    const locationInput = document.getElementById('locationInput');
    const suggestionsContainer = document.getElementById('suggestions-container');

    // Current Conditions
    const cementTempDiv = document.getElementById('cement-temp');
    const asphaltTempDiv = document.getElementById('asphalt-temp');
    const safetyMessageDiv = document.getElementById('safety-message');
    const pawIcon = document.getElementById('paw-icon');
    const safetyText = document.getElementById('safety-text');
    const lastUpdatedSpan = document.getElementById('last-updated');

    // Calculation Explorer
    const airTempInput = document.getElementById('airTempInput');
    const solarRadiationInput = document.getElementById('solarRadiationInput');
    const windSpeedInput = document.getElementById('windSpeedInput');
    const calcCementTempDiv = document.getElementById('calc-cement-temp');
    const calcAsphaltTempDiv = document.getElementById('calc-asphalt-temp');

    // Forecast Table
    const forecastBody = document.getElementById('forecast-body');

    // --- Initial State ---
    const lastLocationData = localStorage.getItem('lastLocation');
    if (lastLocationData) {
        try {
            const location = JSON.parse(lastLocationData);
            if (location.name && location.latitude && location.longitude) {
                locationInput.value = location.name;
                getWeatherByCoords(location.latitude, location.longitude);
            }
        } catch (error) {
            console.error("Error parsing lastLocation from localStorage:", error);
        }
    }

    // --- Event Listeners ---
    checkTempBtn.addEventListener('click', () => {
        const locationName = locationInput.value;
        if (locationName) getWeatherByCity(locationName);
        else alert('Please enter a location.');
    });

    useLocationBtn.addEventListener('click', getUserLocation);

    locationInput.addEventListener('input', handleLocationInput);

    [airTempInput, solarRadiationInput, windSpeedInput].forEach(input => {
        input.addEventListener('input', updateCalculator);
    });

    // --- Geocoding Functions ---
    function handleLocationInput() {
        const query = locationInput.value;
        if (query.length < 3) {
            suggestionsContainer.innerHTML = '';
            return;
        }
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5`)
            .then(response => response.json())
            .then(data => {
                suggestionsContainer.innerHTML = '';
                if (data.results) {
                    data.results.forEach(location => {
                        const suggestionDiv = document.createElement('div');
                        suggestionDiv.classList.add('suggestion-item');
                        const locationName = `${location.name}, ${location.admin1 || ''} ${location.country_code}`;
                        suggestionDiv.textContent = locationName;
                        suggestionDiv.onclick = () => {
                            const locationData = { name: locationName, latitude: location.latitude, longitude: location.longitude };
                            locationInput.value = locationName;
                            localStorage.setItem('lastLocation', JSON.stringify(locationData));
                            suggestionsContainer.innerHTML = '';
                            getWeatherByCoords(location.latitude, location.longitude);
                        };
                        suggestionsContainer.appendChild(suggestionDiv);
                    });
                }
            });
    }

    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude } = position.coords;
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                    .then(response => response.json())
                    .then(data => {
                        const locationName = data.display_name || "Current Location";
                        locationInput.value = locationName;
                        const location = { name: locationName, latitude, longitude };
                        localStorage.setItem('lastLocation', JSON.stringify(location));
                        getWeatherByCoords(latitude, longitude);
                    })
                    .catch(() => {
                        locationInput.value = "Current Location";
                        const location = { name: "Current Location", latitude, longitude };
                        localStorage.setItem('lastLocation', JSON.stringify(location));
                        getWeatherByCoords(latitude, longitude);
                    });
            }, () => alert('Unable to retrieve your location.'));
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    }

    function getWeatherByCity(city) {
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`)
            .then(response => response.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const loc = data.results[0];
                    const locationData = { name: `${loc.name}, ${loc.admin1 || ''} ${loc.country_code}`, latitude: loc.latitude, longitude: loc.longitude };
                    localStorage.setItem('lastLocation', JSON.stringify(locationData));
                    locationInput.value = locationData.name;
                    getWeatherByCoords(loc.latitude, loc.longitude);
                } else {
                    alert('Could not find location. Please try again.');
                }
            });
    }

    // --- Weather & Calculation Functions ---
    function getWeatherByCoords(lat, lon) {
        // Reset UI
        forecastBody.innerHTML = '<tr><td colspan="5">Loading forecast...</td></tr>';

        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,shortwave_radiation,windspeed_10m&timezone=auto&forecast_days=1`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.hourly && data.hourly.time) {
                    processWeatherData(data);
                } else {
                    alert('Could not retrieve weather forecast.');
                }
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                alert('Error fetching weather data.');
            });
    }

    function processWeatherData(data) {
        const { time, temperature_2m, shortwave_radiation, windspeed_10m } = data.hourly;

        // Find the current hour's index
        const now = new Date();
        const currentHourIndex = time.findIndex(t => new Date(t).getHours() === now.getHours());

        if (currentHourIndex === -1) {
            console.error("Could not find current hour in forecast data.");
            return;
        }

        // Update current conditions
        const currentAirTempC = temperature_2m[currentHourIndex];
        const currentRadiation = shortwave_radiation[currentHourIndex];
        const currentWindKmh = windspeed_10m[currentHourIndex];

        displayCurrentResults(currentAirTempC, currentRadiation, currentWindKmh);
        populateCalculator(currentAirTempC, currentRadiation, currentWindKmh);

        // Populate forecast table
        populateForecastGrid(time, temperature_2m, shortwave_radiation, windspeed_10m);
    }

    function calculatePavementTemp(airTempC, radiation, windKmh, surfaceType) {
        const albedo = surfaceType === 'asphalt' ? 0.05 : 0.30; // Asphalt is dark, cement is lighter
        const windMs = windKmh / 3.6; // Convert km/h to m/s

        // Simplified heat transfer coefficient
        const h_conv = 5.7 + 3.8 * windMs;

        // If there's no sun or it's night, radiation effect is minimal.
        if (radiation <= 0) {
            return airTempC; // At night, pavement temp is close to air temp.
        }

        const tempIncrease = ((1 - albedo) * radiation) / h_conv;
        return airTempC + tempIncrease;
    }

    // --- UI Update Functions ---
    function displayCurrentResults(airTempC, radiation, windKmh) {
        const cementTempC = calculatePavementTemp(airTempC, radiation, windKmh, 'cement');
        const asphaltTempC = calculatePavementTemp(airTempC, radiation, windKmh, 'asphalt');
        const cementTempF = (cementTempC * 9/5) + 32;
        const asphaltTempF = (asphaltTempC * 9/5) + 32;

        cementTempDiv.innerHTML = `Est. Cement Temp: <strong>${cementTempF.toFixed(1)}°F</strong> (${cementTempC.toFixed(1)}°C)`;
        asphaltTempDiv.innerHTML = `Est. Asphalt Temp: <strong>${asphaltTempF.toFixed(1)}°F</strong> (${asphaltTempC.toFixed(1)}°C)`;

        updateSafetyMessage(asphaltTempF);

        const now = new Date();
        lastUpdatedSpan.textContent = `Last updated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }

    function populateCalculator(airTempC, radiation, windKmh) {
        airTempInput.value = airTempC.toFixed(1);
        solarRadiationInput.value = radiation.toFixed(0);
        windSpeedInput.value = windKmh.toFixed(1);
        updateCalculator();
    }

    function updateCalculator() {
        const airTempC = parseFloat(airTempInput.value) || 0;
        const radiation = parseFloat(solarRadiationInput.value) || 0;
        const windKmh = parseFloat(windSpeedInput.value) || 0;

        const cementTempC = calculatePavementTemp(airTempC, radiation, windKmh, 'cement');
        const asphaltTempC = calculatePavementTemp(airTempC, radiation, windKmh, 'asphalt');
        const cementTempF = (cementTempC * 9/5) + 32;
        const asphaltTempF = (asphaltTempC * 9/5) + 32;

        calcCementTempDiv.innerHTML = `Est. Cement: <strong>${cementTempF.toFixed(1)}°F</strong> (${cementTempC.toFixed(1)}°C)`;
        calcAsphaltTempDiv.innerHTML = `Est. Asphalt: <strong>${asphaltTempF.toFixed(1)}°F</strong> (${asphaltTempC.toFixed(1)}°C)`;
    }

    function populateForecastGrid(times, airTemps, radiations, winds) {
        forecastBody.innerHTML = ''; // Clear previous forecast

        times.forEach((timeStr, index) => {
            const date = new Date(timeStr);
            const hour = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const airTempC = airTemps[index];
            const airTempF = (airTempC * 9/5) + 32;

            const cementTempC = calculatePavementTemp(airTempC, radiations[index], winds[index], 'cement');
            const cementTempF = (cementTempC * 9/5) + 32;
            const asphaltTempC = calculatePavementTemp(airTempC, radiations[index], winds[index], 'asphalt');
            const asphaltTempF = (asphaltTempC * 9/5) + 32;

            const { message, color } = getSafetyInfo(asphaltTempF);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${hour}</td>
                <td>${airTempC.toFixed(1)}°C / ${airTempF.toFixed(1)}°F</td>
                <td>${cementTempC.toFixed(1)}°C / ${cementTempF.toFixed(1)}°F</td>
                <td>${asphaltTempC.toFixed(1)}°C / ${asphaltTempF.toFixed(1)}°F</td>
                <td style="color: ${color};">${message}</td>
            `;
            forecastBody.appendChild(row);
        });
    }

    function updateSafetyMessage(asphaltTempF) {
        const { message, color } = getSafetyInfo(asphaltTempF);
        safetyText.textContent = message;
        safetyMessageDiv.style.color = color;
        pawIcon.style.color = color;
    }

    function getSafetyInfo(asphaltTempF) {
        if (asphaltTempF >= 130) {
            return { message: "DANGER", color: 'red' };
        } else if (asphaltTempF >= 110) {
            return { message: "CAUTION", color: 'orange' };
        } else {
            return { message: "SAFE", color: 'green' };
        }
    }
});