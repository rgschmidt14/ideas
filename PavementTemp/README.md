# 🐾 Pavement Paw-tection! 🐾

This is a simple web application designed to help pet owners determine if the pavement is a safe temperature for their furry friends' paws.

## Features

*   **Advanced Temperature Model:** Calculates pavement temperature using a formula that incorporates air temperature, direct solar radiation, and wind speed for greater accuracy.
*   **Extended Hourly Forecast:** Displays an hour-by-hour forecast starting from the current time and extending up to 30 hours into the future. The current hour is highlighted for easy reference, and you can use "Show More" / "Show Less" buttons to expand or collapse the view.
*   **Interactive "Calculation Explorer":** Adjust the core weather values (air temp, solar radiation, wind speed) to see exactly how they impact the pavement temperature in real-time.
*   **Location-Based:** Check temperatures by searching for a city or using your device's current location.
*   **Clear Safety Indicators:** Color-coded messages show you at a glance if the pavement is safe, requires caution, or is dangerous.

## How to Use

1.  **Enter a location:** Type a city name or click "Use My Location".
2.  **Review the Forecast:** Check the current conditions and browse the hourly forecast. The table starts at the current hour. Use the "Show More" button to see further into the future.
3.  **Explore the Calculator:** Scroll down to the "Calculation Explorer" to experiment with the values and understand the science behind the estimates.

---

## Changelog

**2025-10-04:**
- **Enhanced Forecast View:**
    - The forecast now includes data from the past 4 hours and extends up to 30 hours into the future, helping with trend analysis and planning.
    - The current hour is now highlighted in the forecast grid for quick reference.
    - Added "Show More" and "Show Less" buttons to control the number of forecast hours displayed (10, 20, or 30 hours). The user's preference is saved locally.

**2025-10-03:**
- **Major Feature Overhaul:**
    - Implemented a scientifically-backed formula for temperature calculation using air temperature, solar radiation, and wind speed.
    - Added an interactive "Calculation Explorer" allowing users to edit weather variables and see the immediate impact on pavement heat.
    - Integrated a full-day, hourly forecast grid, showing projected pavement temperatures and safety levels throughout the day.
    - Redesigned the UI to present current conditions, the interactive calculator, and the hourly forecast in a clear, user-friendly layout.

**2025-10-02:**
- **Robust Location Storage:** Fixed a bug where the app would crash if it found an old, non-JSON location entry in the browser's local storage. The app now correctly handles and updates the old data format, ensuring a smooth experience for returning users.