# Sunburn Safety

A tool to check the UV index for your location.

## Description

This tool fetches the current UV index for a given city or your current location using the Open-Meteo API. It provides a simple, color-coded safety message to help you decide when to take precautions against sun exposure.

## How It Works (The "Gee-Wiz" Info)
This tool fetches the current UV index for your location. The UV index is a measure of the strength of the sun's ultraviolet (UV) radiation at a particular place and time.

The application uses the [Open-Meteo API](https://open-meteo.com/) to get the daily maximum UV index forecast. When you enter a city or use your current location, the app first uses a geocoding service to find the latitude and longitude, then queries the weather API for that spot.

## Future Ideas

- [ ] Add historical UV index data.
- [ ] Provide more detailed safety recommendations.
- [ ] Allow users to set a "home" location.

---

## Changelog

**2025-10-02:**
- **Robust Location Storage:** Fixed a bug where the app would crash if it found an old, non-JSON location entry in the browser's local storage. The app now correctly handles and updates the old data format, ensuring a smooth experience for returning users.