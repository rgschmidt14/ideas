document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const checkUVBtn = document.getElementById('checkUVBtn');
    const useLocationBtn = document.getElementById('useLocationBtn');
    const locationInput = document.getElementById('locationInput');
    const suggestionsContainer = document.getElementById('suggestions-container');

    // Current Conditions
    const uvIndexDiv = document.getElementById('uv-index');
    const timeToBurnDiv = document.getElementById('time-to-burn');
    const safetyMessageDiv = document.getElementById('safety-message');
    const sunIcon = document.getElementById('sun-icon');
    const safetyText = document.getElementById('safety-text');
    const lastUpdatedSpan = document.getElementById('last-updated');

    // Calculation Explorer
    const uvIndexInput = document.getElementById('uvIndexInput');
    const skinTypeSelect = document.getElementById('skinTypeSelect');
    const calcTimeToBurnDiv = document.getElementById('calc-time-to-burn');

    // Forecast Table
    const forecastBody = document.getElementById('forecast-body');
    const showMoreBtn = document.getElementById('showMoreBtn');
    const showLessBtn = document.getElementById('showLessBtn');

    // --- App State ---
    let forecastHoursToShow = 10; // Initial number of hours to show
    const FORECAST_INCREMENT = 10; // How many hours to add/remove
    const MAX_FORECAST_HOURS = 30;

    // --- Skin Type Data (Fitzpatrick scale) ---
    // Minutes of sun exposure to receive 1 MED (Minimal Erythemal Dose)
    // This is a simplified model for the calculator.
    const skinTypeFactors = {
        1: 2.5, // Type I
        2: 3.3, // Type II
        3: 5,   // Type III
        4: 6.7, // Type IV
        5: 10,  // Type V
        6: 16.7 // Type VI
    };

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
    checkUVBtn.addEventListener('click', () => {
        const locationName = locationInput.value;
        if (locationName) getWeatherByCity(locationName);
        else alert('Please enter a location.');
    });

    useLocationBtn.addEventListener('click', getUserLocation);
    locationInput.addEventListener('input', handleLocationInput);

    // Listen for changes in the calculator and forecast skin type selector
    [uvIndexInput, skinTypeSelect].forEach(input => {
        input.addEventListener('input', () => {
            // When calculator values change, update the calculator result
            if (document.activeElement === uvIndexInput || document.activeElement === skinTypeSelect) {
                 updateCalculator();
            }
            // Also, re-process the full weather data to update the main forecast table
            const lastData = window.lastWeatherData;
            if (lastData) {
                processWeatherData(lastData);
            }
        });
    });

    showMoreBtn.addEventListener('click', () => {
        if (forecastHoursToShow < MAX_FORECAST_HOURS) {
            forecastHoursToShow += FORECAST_INCREMENT;
            localStorage.setItem('forecastHoursToShow', forecastHoursToShow);
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
        forecastBody.innerHTML = '<tr><td colspan="4">Loading forecast...</td></tr>';
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index&timezone=auto&past_hours=4&forecast_days=2`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.hourly && data.hourly.time) {
                    window.lastWeatherData = data; // Store data for re-processing
                    processWeatherData(data);
                } else {
                    alert('Could not retrieve UV forecast.');
                }
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                alert('Error fetching weather data.');
            });
    }

    function processWeatherData(data) {
        const { time, uv_index } = data.hourly;
        const now = new Date();
        // Find the closest hour in the past, not just the same hour number
        const nowEpoch = now.getTime();
        let currentHourIndex = time.map(t => new Date(t).getTime()).findIndex((timeEpoch, index) => {
            const nextTimeEpoch = time[index + 1] ? new Date(time[index + 1]).getTime() : Infinity;
            return nowEpoch >= timeEpoch && nowEpoch < nextTimeEpoch;
        });

        if (currentHourIndex === -1) {
            console.error("Could not find current hour in forecast data, defaulting to first entry.");
            currentHourIndex = 0; // Fallback
        }

        const currentUvIndex = uv_index[currentHourIndex];
        displayCurrentResults(currentUvIndex);
        populateCalculator(currentUvIndex);
        populateForecastGrid(time, uv_index, currentHourIndex);
    }

    function calculateTimeToBurn(uvIndex, skinType) {
        if (uvIndex <= 0) return Infinity;
        // Formula: Time (min) = (MED constant * Skin Type Factor) / UV Index
        const medConstant = 200; // A baseline constant
        const timeInMinutes = (medConstant * skinTypeFactors[skinType]) / (3 * uvIndex);
        return timeInMinutes;
    }

    // --- UI Update Functions ---
    function displayCurrentResults(uvIndex) {
        const skinType = skinTypeSelect.value;
        const timeToBurn = calculateTimeToBurn(uvIndex, skinType);

        uvIndexDiv.innerHTML = `Current UV Index: <strong>${uvIndex.toFixed(1)}</strong>`;
        timeToBurnDiv.innerHTML = `Est. Time to Burn: <strong>${formatTimeToBurn(timeToBurn)}</strong>`;

        updateSafetyMessage(uvIndex);
        const now = new Date();
        lastUpdatedSpan.textContent = `Last updated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }

    function populateCalculator(uvIndex) {
        uvIndexInput.value = uvIndex.toFixed(1);
        updateCalculator();
    }

    function updateCalculator() {
        const uvIndex = parseFloat(uvIndexInput.value) || 0;
        const skinType = skinTypeSelect.value;
        const timeToBurn = calculateTimeToBurn(uvIndex, skinType);
        calcTimeToBurnDiv.innerHTML = `Est. Time to Burn: <strong>${formatTimeToBurn(timeToBurn)}</strong>`;
    }

    function populateForecastGrid(times, uvIndexes, currentHourIndex) {
        forecastBody.innerHTML = '';
        const skinType = skinTypeSelect.value;
        const totalHoursAvailable = times.length;

        // Determine the slice of forecast to show
        const startIndex = currentHourIndex;
        const endIndex = Math.min(startIndex + forecastHoursToShow, totalHoursAvailable);

        const visibleHours = times.slice(startIndex, endIndex);

        visibleHours.forEach((timeStr, relativeIndex) => {
            const absoluteIndex = startIndex + relativeIndex;
            const date = new Date(timeStr);
            const hour = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const uvIndex = uvIndexes[absoluteIndex];
            const timeToBurn = calculateTimeToBurn(uvIndex, skinType);
            const { message, color } = getRiskInfo(uvIndex);

            const row = document.createElement('tr');
            if (absoluteIndex === currentHourIndex) {
                row.classList.add('current-hour');
            }
            row.innerHTML = `
                <td>${hour}</td>
                <td>${uvIndex.toFixed(1)}</td>
                <td>${formatTimeToBurn(timeToBurn)}</td>
                <td style="color: ${color};">${message}</td>
            `;
            forecastBody.appendChild(row);
        });

        // Update button visibility
        showLessBtn.style.display = forecastHoursToShow > FORECAST_INCREMENT ? 'inline-block' : 'none';
        showMoreBtn.style.display = endIndex < totalHoursAvailable ? 'inline-block' : 'none';
    }

    function updateSafetyMessage(uvIndex) {
        const { message, color } = getRiskInfo(uvIndex);
        safetyText.textContent = `${message.toUpperCase()}: ${getSafetyAdvice(uvIndex)}`;
        safetyMessageDiv.style.color = color;
        sunIcon.style.color = color;
    }

    function getRiskInfo(uvIndex) {
        if (uvIndex >= 11) return { message: "Extreme", color: 'purple' };
        if (uvIndex >= 8) return { message: "Very High", color: 'red' };
        if (uvIndex >= 6) return { message: "High", color: 'orange' };
        if (uvIndex >= 3) return { message: "Moderate", color: 'gold' };
        return { message: "Low", color: 'green' };
    }

    function getSafetyAdvice(uvIndex) {
        if (uvIndex >= 11) return "Stay inside! Skin can burn in minutes.";
        if (uvIndex >= 8) return "Extra protection needed. Be careful outside.";
        if (uvIndex >= 6) return "Protection essential. Wear a hat, sunglasses, and sunscreen.";
        if (uvIndex >= 3) return "Protection needed. Seek shade during peak hours.";
        return "No protection needed. You can safely stay outside.";
    }

    function formatTimeToBurn(minutes) {
        if (minutes === Infinity || minutes > 1000) return "Over 12 hours";
        if (minutes < 1) return "Less than 1 minute";
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        if (h > 0) {
            return `${h} hr ${m} min`;
        }
        return `${m} min`;
    }
});