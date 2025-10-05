document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const checkTempBtn = document.getElementById('checkTempBtn');
    const useLocationBtn = document.getElementById('useLocationBtn');
    const locationInput = document.getElementById('locationInput');
    const suggestionsContainer = document.getElementById('suggestions-container');

    // Current Conditions
    const cementTempDiv = document.getElementById('cement-temp');
    const asphaltTempDiv = document.getElementById('asphalt-temp');
    const cloudCoverDiv = document.getElementById('cloud-cover');
    const safetyMessageDiv = document.getElementById('safety-message');
    const pawIcon = document.getElementById('paw-icon');
    const safetyText = document.getElementById('safety-text');
    const lastUpdatedSpan = document.getElementById('last-updated');

    // Calculation Explorer
    const airTempInput = document.getElementById('airTempInput');
    const solarRadiationInput = document.getElementById('solarRadiationInput');
    const windSpeedInput = document.getElementById('windSpeedInput');
    const cloudCoverInput = document.getElementById('cloudCoverInput');
    const calcCementTempDiv = document.getElementById('calc-cement-temp');
    const calcAsphaltTempDiv = document.getElementById('calc-asphalt-temp');

    // Forecast Table
    const forecastBody = document.getElementById('forecast-body');
    const showMoreBtn = document.getElementById('showMoreBtn');
    const showLessBtn = document.getElementById('showLessBtn');


    // --- App State ---
    let forecastHoursToShow = 10; // Initial number of hours to show
    const FORECAST_INCREMENT = 10; // How many hours to add/remove
    const MAX_FORECAST_HOURS = 30;

    // --- Physics & Material Constants ---
    const ASPHALT_ALBEDO = 0.05; // Reflectivity (5%)
    const CEMENT_ALBEDO = 0.35;  // Reflectivity (35%)
    // Energy (Joules) to raise 1m^2 of material by 1°C. Higher means more inertia.
    const ASPHALT_THERMAL_MASS = 100000;
    const CEMENT_THERMAL_MASS = 120000;
    const STEFAN_BOLTZMANN = 5.67e-8; // W/m^2/K^4
    const EMISSIVITY = 0.95; // How effectively the surface radiates heat.
    const TIME_STEP_SECONDS = 3600; // Each forecast step is 1 hour

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
    // Load user's forecast preference
    const savedHours = localStorage.getItem('forecastHoursToShow');
    if (savedHours) {
        forecastHoursToShow = parseInt(savedHours, 10);
    }


    // --- Event Listeners ---
    checkTempBtn.addEventListener('click', () => {
        const locationName = locationInput.value;
        if (locationName) getWeatherByCity(locationName);
        else alert('Please enter a location.');
    });

    useLocationBtn.addEventListener('click', getUserLocation);

    locationInput.addEventListener('input', handleLocationInput);

    [airTempInput, solarRadiationInput, windSpeedInput, cloudCoverInput].forEach(input => {
        input.addEventListener('input', updateCalculator);
    });

    showMoreBtn.addEventListener('click', () => {
        if (forecastHoursToShow < MAX_FORECAST_HOURS) {
            forecastHoursToShow += FORECAST_INCREMENT;
            localStorage.setItem('forecastHoursToShow', forecastHoursToShow);
            // Re-render the forecast with the existing data
            const lastData = window.lastWeatherData;
            if (lastData) processWeatherData(lastData);
        }
    });

    showLessBtn.addEventListener('click', () => {
        if (forecastHoursToShow > FORECAST_INCREMENT) {
            forecastHoursToShow -= FORECAST_INCREMENT;
            localStorage.setItem('forecastHoursToShow', forecastHoursToShow);
            const lastData = window.lastWeatherData;
            if (lastData) processWeatherData(lastData);
        }
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

        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,shortwave_radiation,windspeed_10m,cloudcover&timezone=auto&past_hours=4&forecast_days=2`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.hourly && data.hourly.time) {
                    window.lastWeatherData = data; // Store data for re-use
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
        const { hourly } = data;

        // Find the current hour's index
        const now = new Date();
        // Find the closest hour in the past, not just the same hour number
        const nowEpoch = now.getTime();
        let currentHourIndex = hourly.time.map(t => new Date(t).getTime()).findIndex((timeEpoch, index) => {
            const nextTimeEpoch = hourly.time[index + 1] ? new Date(hourly.time[index + 1]).getTime() : Infinity;
            return nowEpoch >= timeEpoch && nowEpoch < nextTimeEpoch;
        });


        if (currentHourIndex === -1) {
            console.error("Could not find current hour in forecast data, defaulting to first entry.");
            currentHourIndex = 0; // Fallback
        }

        // Calculate the full day's forecast using the iterative model
        const { cementTemps, asphaltTemps } = calculateHourlyPavementTemps(hourly);

        // Update current conditions display using the new calculated forecast
        const currentAsphaltTempC = asphaltTemps[currentHourIndex];
        const currentCementTempC = cementTemps[currentHourIndex];
        const currentCloudCover = hourly.cloudcover[currentHourIndex];

        displayCurrentResults(currentCementTempC, currentAsphaltTempC, currentCloudCover);

        // Populate the calculator with the weather data for the current hour
        populateCalculator(
            hourly.temperature_2m[currentHourIndex],
            hourly.shortwave_radiation[currentHourIndex],
            hourly.windspeed_10m[currentHourIndex],
            hourly.cloudcover[currentHourIndex]
        );

        // Populate forecast table with the new calculated temperatures
        populateForecastGrid(hourly, cementTemps, asphaltTemps, currentHourIndex);
    }

    /**
     * Calculates the pavement temperature for a single, instantaneous set of conditions.
     * Used for the "Calculation Explorer" feature.
     */
    function calculateInstantaneousPavementTemp(airTempC, radiation, windKmh, cloudCover, surfaceType) {
        const albedo = surfaceType === 'asphalt' ? ASPHALT_ALBEDO : CEMENT_ALBEDO;
        const windMs = windKmh / 3.6;

        // Simplified heat transfer coefficient for convection
        const h_conv = 5.7 + 3.8 * windMs;

        if (radiation < 5) { // Nighttime simplified model
            const maxCooling = 6.0;
            const cloudEffect = 1 - (cloudCover / 100);
            const windFactor = Math.exp(-0.2 * windMs);
            const tempDecrease = maxCooling * cloudEffect * windFactor;
            return airTempC - tempDecrease;
        }

        // Daytime simplified model
        const tempIncrease = ((1 - albedo) * radiation) / h_conv;
        return airTempC + tempIncrease;
    }

/**
 * Calculates the full 24-hour pavement temperature forecast using an iterative energy balance model.
 * This version uses AVERAGED weather conditions over each time step for a more accurate simulation.
 * @param {object} hourlyData - The `hourly` object from the Open-Meteo API response.
 * @returns {{cementTemps: number[], asphaltTemps: number[]}}
 */
function calculateHourlyPavementTemps(hourlyData) {
    const { temperature_2m, shortwave_radiation, windspeed_10m, cloudcover } = hourlyData;
    const numHours = temperature_2m.length;

    // Initialize the starting pavement temperatures from the first data point (which is in the past).
    // This provides a "run-up" period for the simulation to stabilize.
    let cementTemps = [temperature_2m[0]];
    let asphaltTemps = [temperature_2m[0]];

    for (let i = 1; i < numHours; i++) {
        // --- Calculate average conditions for the interval between (i-1) and (i) ---
        const avgAirTemp = (temperature_2m[i - 1] + temperature_2m[i]) / 2;
        const avgRadiation = (shortwave_radiation[i - 1] + shortwave_radiation[i]) / 2;
        const avgWindspeed = (windspeed_10m[i - 1] + windspeed_10m[i]) / 2;
        const avgCloudcover = (cloudcover[i - 1] + cloudcover[i]) / 2;

        // --- Calculate temperature change for Cement using AVERAGED data ---
        const cementT_prev = cementTemps[i - 1];
        const cementDeltaT = calculateTemperatureChange(
            cementT_prev,
            avgAirTemp,
            avgRadiation,
            avgWindspeed,
            avgCloudcover,
            CEMENT_ALBEDO,
            CEMENT_THERMAL_MASS
        );
        cementTemps.push(cementT_prev + cementDeltaT);

        // --- Calculate temperature change for Asphalt using AVERAGED data ---
        const asphaltT_prev = asphaltTemps[i - 1];
        const asphaltDeltaT = calculateTemperatureChange(
            asphaltT_prev,
            avgAirTemp,
            avgRadiation,
            avgWindspeed,
            avgCloudcover,
            ASPHALT_ALBEDO,
            ASPHALT_THERMAL_MASS
        );
        asphaltTemps.push(asphaltT_prev + asphaltDeltaT);
    }
    return { cementTemps, asphaltTemps };
}

    /**
     * Helper function to calculate the temperature change (ΔT) for one time step.
     */
    function calculateTemperatureChange(pavementTempC, airTempC, radiation, windKmh, cloudCover, albedo, thermalMass) {
        const pavementTempK = pavementTempC + 273.15;
        const airTempK = airTempC + 273.15;

        // --- Energy In ---
        const absorbedRadiation = radiation * (1 - albedo); // in W/m^2

        // --- Energy Out ---
        // 1. Convection
        const windMs = windKmh / 3.6;
        const h_conv = 5.7 + 3.8 * windMs; // Convective heat transfer coefficient
        const convectiveLoss = h_conv * (pavementTempC - airTempC);

        // 2. Radiation
        // Estimate sky temperature. Brunt's formula is complex, so we use a simplified model.
        // Clear sky is colder. Cloudy sky is closer to air temp.
        const cloudFactor = 1 - (cloudCover / 100);
        const skyTempK = airTempK * Math.pow(0.8 + cloudCover / 400, 0.25); // Simplified sky temp estimation
        const radiativeLoss = EMISSIVITY * STEFAN_BOLTZMANN * (Math.pow(pavementTempK, 4) - Math.pow(skyTempK, 4));

        // --- Net Energy & Temperature Change ---
        const netEnergyFlux = absorbedRadiation - convectiveLoss - radiativeLoss; // in W/m^2 (Joules per second per m^2)
        const totalEnergyJ = netEnergyFlux * TIME_STEP_SECONDS; // Total Joules over the hour
        const deltaT_C = totalEnergyJ / thermalMass; // Change in temperature in °C

        return deltaT_C;
    }

    // --- UI Update Functions ---
    function displayCurrentResults(cementTempC, asphaltTempC, cloudCover) {
        const cementTempF = (cementTempC * 9/5) + 32;
        const asphaltTempF = (asphaltTempC * 9/5) + 32;

        cementTempDiv.innerHTML = `Est. Cement Temp: <strong>${cementTempF.toFixed(1)}°F</strong> <span class="celsius">(${cementTempC.toFixed(1)}°C)</span>`;
        asphaltTempDiv.innerHTML = `Est. Asphalt Temp: <strong>${asphaltTempF.toFixed(1)}°F</strong> <span class="celsius">(${asphaltTempC.toFixed(1)}°C)</span>`;
        cloudCoverDiv.innerHTML = `Cloud Cover: <strong>${cloudCover}%</strong>`;

        updateSafetyMessage(asphaltTempF);

        const now = new Date();
        lastUpdatedSpan.textContent = `Last updated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }

    function populateCalculator(airTempC, radiation, windKmh, cloudCover) {
        airTempInput.value = airTempC.toFixed(1);
        solarRadiationInput.value = radiation.toFixed(0);
        windSpeedInput.value = windKmh.toFixed(1);
        cloudCoverInput.value = cloudCover.toFixed(0);
        updateCalculator();
    }

    function updateCalculator() {
        const airTempC = parseFloat(airTempInput.value) || 0;
        const radiation = parseFloat(solarRadiationInput.value) || 0;
        const windKmh = parseFloat(windSpeedInput.value) || 0;
        const cloudCover = parseFloat(cloudCoverInput.value) || 0;

        const cementTempC = calculateInstantaneousPavementTemp(airTempC, radiation, windKmh, cloudCover, 'cement');
        const asphaltTempC = calculateInstantaneousPavementTemp(airTempC, radiation, windKmh, cloudCover, 'asphalt');
        const cementTempF = (cementTempC * 9/5) + 32;
        const asphaltTempF = (asphaltTempC * 9/5) + 32;

        calcCementTempDiv.innerHTML = `Est. Cement: <strong>${cementTempF.toFixed(1)}°F</strong> <span class="celsius">(${cementTempC.toFixed(1)}°C)</span>`;
        calcAsphaltTempDiv.innerHTML = `Est. Asphalt: <strong>${asphaltTempF.toFixed(1)}°F</strong> <span class="celsius">(${asphaltTempC.toFixed(1)}°C)</span>`;
    }

    function populateForecastGrid(hourlyData, cementTemps, asphaltTemps, currentHourIndex) {
        forecastBody.innerHTML = ''; // Clear previous forecast
        const { time, temperature_2m, cloudcover } = hourlyData;
        const totalHoursAvailable = time.length;

        // Determine the slice of forecast to show
        const startIndex = currentHourIndex; // Start from the current hour
        const endIndex = Math.min(startIndex + forecastHoursToShow, totalHoursAvailable);

        const visibleHours = time.slice(startIndex, endIndex);

        visibleHours.forEach((timeStr, relativeIndex) => {
            const absoluteIndex = startIndex + relativeIndex;
            const date = new Date(timeStr);
            const hour = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const airTempC = temperature_2m[absoluteIndex];
            const airTempF = (airTempC * 9/5) + 32;

            const cementTempC = cementTemps[absoluteIndex];
            const cementTempF = (cementTempC * 9/5) + 32;
            const asphaltTempC = asphaltTemps[absoluteIndex];
            const asphaltTempF = (asphaltTempC * 9/5) + 32;

            const { message, color } = getSafetyInfo(asphaltTempF);

            const row = document.createElement('tr');
            if (absoluteIndex === currentHourIndex) {
                row.classList.add('current-hour');
            }
            row.innerHTML = `
                <td>${hour}</td>
                <td>${airTempF.toFixed(1)}°F <span class="celsius">(${airTempC.toFixed(1)}°C)</span></td>
                <td>${cloudcover[absoluteIndex]}%</td>
                <td>${cementTempF.toFixed(1)}°F <span class="celsius">(${cementTempC.toFixed(1)}°C)</span></td>
                <td>${asphaltTempF.toFixed(1)}°F <span class="celsius">(${asphaltTempC.toFixed(1)}°C)</span></td>
                <td style="color: ${color};">${message}</td>
            `;
            forecastBody.appendChild(row);
        });

        // Update button visibility
        showLessBtn.style.display = forecastHoursToShow > FORECAST_INCREMENT ? 'inline-block' : 'none';
        showMoreBtn.style.display = endIndex < totalHoursAvailable ? 'inline-block' : 'none';
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