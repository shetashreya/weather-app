# Weather App - Tech Assessment 1 & 2 (FULLY COMPLETED)

This project is a full-stack Weather App that fulfills the assessment requirements:

- Tech 1: Current + 5-day forecast, flexible location input, geolocation, OpenWeatherMap icons.
- Tech 2: File-based CRUD stored in `data/weather_records.json`, client + server validation, exports (JSON/CSV/PDF), Unsplash background integration.

Setup (Replit / Glitch / Local)

1. Copy the project files into your workspace.
2. Replace the placeholder API key in `server.js`:

```js
const WEATHER_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY_HERE';
```

3. Install dependencies and run:

```powershell
# in Windows PowerShell
npm install
npm run dev
```

This runs the server (port 5000) and the client dev server concurrently.

Notes
- No external database is used. Data persists in `data/weather_records.json` and survives restarts.
- Export buttons download JSON, CSV, or PDF.
- Background image is loaded from Unsplash using the searched city (no API key required).

Demo flow

1. Enter a location (city, zip, coordinates, or landmark) and fetch weather.
2. Save the record. View it in Records table.
3. Edit or delete records. Export the dataset.

Footer
Weather App by [Your Name Here]