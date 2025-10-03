# 🐾 Pavement Paw-tection! 🐾

This is a simple web application designed to help pet owners determine if the pavement is a safe temperature for their furry friends' paws.

## Features

*   **Temperature Estimation:** The app estimates the temperature of both cement and asphalt based on the current air temperature.
*   **Location-Based:** You can check the temperature by either entering a city name or by using your device's current location.
*   **Safety Indicator:** The app provides a clear, color-coded safety message to let you know if the pavement is too hot for your pet.

## How to Use

1.  **Enter a location:** Type a city name into the input field and click "Check Temperature".
2.  **Use your location:** Click the "Use My Location" button to allow the app to access your current location.
3.  **Check the results:** The app will display the estimated pavement temperatures and a safety message.

## Future Enhancements

*   Implement a more sophisticated temperature calculation model that takes into account weather data from the previous 10 hours.
*   Add support for a wider range of locations.

---

## Changelog

**2025-10-02:**
- **Robust Location Storage:** Fixed a bug where the app would crash if it found an old, non-JSON location entry in the browser's local storage. The app now correctly handles and updates the old data format, ensuring a smooth experience for returning users.