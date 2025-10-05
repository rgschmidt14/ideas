# ☀️ Sunburn Safety ☀️

A tool to check the UV index and estimate your time to sunburn for any location.

## Description

This tool provides a comprehensive, hourly forecast for sun exposure risk. It fetches the hourly UV index from the Open-Meteo API and calculates the estimated time to sunburn based on your selected skin type (using the Fitzpatrick scale). This allows for detailed planning to keep you safe in the sun.

## Features

*   **Extended Hourly UV Index Forecast:** Get an hour-by-hour breakdown of the UV index, starting from the current time and extending up to 30 hours into the future. The current hour is highlighted, and you can expand or collapse the forecast with "Show More" / "Show Less" buttons.
*   **Time-to-Burn Calculation:** Estimates how long you can be in the sun before getting a sunburn, personalized to one of six skin types.
*   **Interactive "Calculation Explorer":** Instantly see how changes in the UV index or your selected skin type affect your estimated time to burn.
*   **Location-Based:** Search for any city or use your device's current location for precise forecasts.
*   **Clear Risk Levels:** The hourly forecast is color-coded with clear risk levels (Low, Moderate, High, etc.) to help you make quick, informed decisions.

## How It Works (The "Gee-Wiz" Info)
This tool fetches the hourly UV index forecast for your location. The time it takes to get a sunburn is then estimated using a formula that considers the UV index and the Fitzpatrick Skin Type scale, which classifies skin based on its reaction to sun exposure. You can change your skin type at any time to see how the forecast applies to different people.

---

## Changelog

**2025-10-04:**
- **Enhanced Forecast View:**
    - The forecast now includes data from the past 4 hours and extends up to 30 hours into the future, helping with trend analysis and planning.
    - The current hour is now highlighted in the forecast grid for quick reference.
    - Added "Show More" and "Show Less" buttons to control the number of forecast hours displayed (10, 20, or 30 hours). The user's preference is saved locally.

**2025-10-03:**
- **Major Feature Overhaul:**
    - Replaced single daily UV value with a full-day, hourly UV index forecast.
    - Implemented a "time-to-burn" calculation based on the Fitzpatrick skin type scale.
    - Added an interactive "Calculation Explorer" to allow users to see how UV index and skin type affect burn time.
    - Redesigned the UI to include a skin-type selector and an hourly forecast grid, providing a much more detailed and personalized user experience.

**2025-10-02:**
- **Robust Location Storage:** Fixed a bug where the app would crash if it found an old, non-JSON location entry in the browser's local storage. The app now correctly handles and updates the old data format, ensuring a smooth experience for returning users.