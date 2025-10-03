document.addEventListener('DOMContentLoaded', () => {
    const checkTempBtn = document.getElementById('checkTempBtn');
    const useLocationBtn = document.getElementById('useLocationBtn');
    const locationInput = document.getElementById('locationInput');
    const cementTempDiv = document.getElementById('cement-temp');
    const asphaltTempDiv = document.getElementById('asphalt-temp');
    const safetyMessageDiv = document.getElementById('safety-message');
    const pawIcon = document.getElementById('paw-icon');
    const safetyText = document.getElementById('safety-text');
    const lastUpdatedSpan = document.getElementById('last-updated');
    const lastLocationData = localStorage.getItem('lastLocation');
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'suggestions-container';
    locationInput.parentNode.insertBefore(suggestionsContainer, locationInput.nextSibling);

    // Auto-load weather for last location
    if (lastLocationData) {
        try {
            const location = JSON.parse(lastLocationData);
            locationInput.value = location.name;
            getWeatherByCoords(location.latitude, location.longitude);
        } catch (error) {
            // Assuming the error is due to old string format
            console.warn("Could not parse lastLocation, assuming old format:", lastLocationData);
            locationInput.value = lastLocationData;
            getWeatherByCity(lastLocationData); // This will fetch and update to the new format
        }
    }

    checkTempBtn.addEventListener('click', () => {
        const locationName = locationInput.value;
        if (locationName) {
            getWeatherByCity(locationName);
        } else {
            alert('Please enter a location.');
        }
    });

    useLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // Fetch location name from coordinates
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    .then(response => response.json())
                    .then(data => {
                        const locationName = data.display_name || "Current Location";
                        locationInput.value = locationName;
                        const location = { name: locationName, latitude: lat, longitude: lon };
                        localStorage.setItem('lastLocation', JSON.stringify(location));
                        getWeatherByCoords(lat, lon);
                    })
                    .catch(() => {
                         // Fallback if reverse geocoding fails
                        locationInput.value = "Current Location";
                        const location = { name: "Current Location", latitude: lat, longitude: lon };
                        localStorage.setItem('lastLocation', JSON.stringify(location));
                        getWeatherByCoords(lat, lon);
                    });
            }, () => {
                alert('Unable to retrieve your location.');
            });
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    });

    locationInput.addEventListener('input', () => {
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
                            const locationData = {
                                name: locationName,
                                latitude: location.latitude,
                                longitude: location.longitude
                            };
                            locationInput.value = locationName;
                            localStorage.setItem('lastLocation', JSON.stringify(locationData));
                            suggestionsContainer.innerHTML = '';
                            getWeatherByCoords(location.latitude, location.longitude);
                        };
                        suggestionsContainer.appendChild(suggestionDiv);
                    });
                }
            });
    });

    function getWeatherByCity(city) {
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`)
            .then(response => response.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const locationResult = data.results[0];
                    const locationData = {
                        name: `${locationResult.name}, ${locationResult.admin1 || ''} ${locationResult.country_code}`,
                        latitude: locationResult.latitude,
                        longitude: locationResult.longitude
                    };
                    localStorage.setItem('lastLocation', JSON.stringify(locationData));
                    locationInput.value = locationData.name;
                    getWeatherByCoords(locationResult.latitude, locationResult.longitude);
                } else {
                    alert('Could not find location. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error fetching geocoding data:', error);
                alert('Error fetching geocoding data.');
            });
    }

    function getWeatherByCoords(lat, lon) {
        cementTempDiv.innerHTML = 'Calculating...';
        asphaltTempDiv.innerHTML = '';
        safetyText.textContent = '';
        pawIcon.style.color = '#333';
        lastUpdatedSpan.textContent = '';


        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&past_hours=10`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.hourly && data.hourly.temperature_2m) {
                    const temps = data.hourly.temperature_2m;
                    const weights = Array.from({length: temps.length}, (_, i) => i + 1);
                    const weightedSum = temps.reduce((sum, temp, i) => sum + (temp * weights[i]), 0);
                    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
                    const weightedAvgC = weightedSum / totalWeight;

                    displayResults(weightedAvgC);
                } else {
                    alert('Could not retrieve historical weather data.');
                }
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                alert('Error fetching weather data.');
            });
    }

    function displayResults(airTempC) {
        const airTempF = (airTempC * 9/5) + 32;

        const asphaltTempF = airTempF + 50;
        const cementTempF = airTempF + 40;
        const asphaltTempC = (asphaltTempF - 32) * 5/9;
        const cementTempC = (cementTempF - 32) * 5/9;

        cementTempDiv.innerHTML = `Estimated Cement Temperature: <strong>${cementTempF.toFixed(1)}°F</strong> <span class="celsius">(${cementTempC.toFixed(1)}°C)</span>`;
        asphaltTempDiv.innerHTML = `Estimated Asphalt Temperature: <strong>${asphaltTempF.toFixed(1)}°F</strong> <span class="celsius">(${asphaltTempC.toFixed(1)}°C)</span>`;

        let message = '';
        let color = '';

        if (asphaltTempF >= 130) {
            message = "DANGER: Pavement is too hot for paws! Avoid walking your dog.";
            color = 'red';
        } else if (asphaltTempF >= 110) {
            message = "CAUTION: Pavement might be uncomfortable. Check with the 7-second rule.";
            color = 'orange';
        } else {
            message = "SAFE: Pavement should be safe for paws.";
            color = 'green';
        }

        safetyText.textContent = message;
        safetyMessageDiv.style.color = color;
        pawIcon.style.color = color;

        const now = new Date();
        lastUpdatedSpan.textContent = `Last updated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }
});