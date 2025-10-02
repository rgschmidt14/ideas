document.addEventListener('DOMContentLoaded', () => {
    const checkUVBtn = document.getElementById('checkUVBtn');
    const useLocationBtn = document.getElementById('useLocationBtn');
    const locationInput = document.getElementById('locationInput');
    const uvIndexDiv = document.getElementById('uv-index');
    const safetyMessageDiv = document.getElementById('safety-message');
    const sunIcon = document.getElementById('sun-icon');
    const safetyText = document.getElementById('safety-text');
    const lastUpdatedSpan = document.getElementById('last-updated');
    const lastLocation = localStorage.getItem('lastLocation');
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'suggestions-container';
    locationInput.parentNode.insertBefore(suggestionsContainer, locationInput.nextSibling);

    // Auto-load weather for last location
    if (lastLocation) {
        locationInput.value = lastLocation;
        getWeatherByCity(lastLocation);
    }

    checkUVBtn.addEventListener('click', () => {
        const location = locationInput.value;
        if (location) {
            localStorage.setItem('lastLocation', location);
            getWeatherByCity(location);
        } else {
            alert('Please enter a location.');
        }
    });

    useLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                locationInput.value = "Current Location";
                localStorage.removeItem('lastLocation');
                getWeatherByCoords(lat, lon);
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
                            locationInput.value = locationName;
                            localStorage.setItem('lastLocation', locationName);
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
                    const location = data.results[0];
                    getWeatherByCoords(location.latitude, location.longitude);
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
        uvIndexDiv.innerHTML = 'Calculating...';
        safetyText.textContent = '';
        sunIcon.style.color = '#333';
        lastUpdatedSpan.textContent = '';

        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=uv_index_max&timezone=auto`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.daily && data.daily.uv_index_max) {
                    const uvIndex = data.daily.uv_index_max[0];
                    displayResults(uvIndex);
                } else {
                    alert('Could not retrieve UV index data.');
                }
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                alert('Error fetching weather data.');
            });
    }

    function displayResults(uvIndex) {
        uvIndexDiv.innerHTML = `Estimated Maximum UV Index: <strong>${uvIndex.toFixed(1)}</strong>`;

        let message = '';
        let color = '';

        if (uvIndex >= 11) {
            message = "EXTREME: Stay inside! Skin can burn in minutes.";
            color = 'purple';
        } else if (uvIndex >= 8) {
            message = "VERY HIGH: Extra protection needed. Be careful outside.";
            color = 'red';
        } else if (uvIndex >= 6) {
            message = "HIGH: Protection essential. Wear a hat, sunglasses, and sunscreen.";
            color = 'orange';
        } else if (uvIndex >= 3) {
            message = "MODERATE: Protection needed. Seek shade during peak hours.";
            color = 'gold';
        } else {
            message = "LOW: No protection needed. You can safely stay outside.";
            color = 'green';
        }

        safetyText.textContent = message;
        safetyMessageDiv.style.color = color;
        sunIcon.style.color = color;

        const now = new Date();
        lastUpdatedSpan.textContent = `Last updated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }
});