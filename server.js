// FILE: server.js
// Express server providing geocoding, weather, CRUD (file-based), and exports (JSON/CSV/PDF).
// Replace WEATHER_API_KEY with your OpenWeatherMap API key.

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { createObjectCsvStringifier } = require('csv-writer');
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors());
app.use(express.json());

// === USER MUST SET THIS ===
const WEATHER_API_KEY = '225cc61466bc4e6593c110059250111';
const API_BASE = 'http://api.weatherapi.com/v1';
// ==========================

const DATA_FILE = path.join(__dirname, 'data', 'weather_records.json');
const BACKUP_FILE = DATA_FILE + '.bak';
const PORT = process.env.PORT || 5000;

// Simple in-memory cache for weather responses (ttl ms)
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function readDataFile() {
  try {
    const txt = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, '[]');
      return [];
    }
    console.error('readDataFile error', err);
    throw err;
  }
}

async function writeDataFile(records) {
  try {
    // backup
    try {
      const exists = await fs.access(DATA_FILE).then(() => true).catch(() => false);
      if (exists) await fs.copyFile(DATA_FILE, BACKUP_FILE);
    } catch (e) { /* continue */ }
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('writeDataFile error', err);
    throw err;
  }
}

function cacheKey(lat, lon, start, end) {
  return `${lat}_${lon}_${start || ''}_${end || ''}`;
}

async function geocodeInput(input) {
  const url = `${API_BASE}/search.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(input)}`;
  const res = await axios.get(url);
  if (res.data && res.data.length) {
    const g = res.data[0];
    return { 
      lat: g.lat, 
      lon: g.lon, 
      city: g.name, 
      country: g.country 
    };
  }
  throw new Error('Location not found');
}

async function fetchWeather(lat, lon) {
  const key = cacheKey(lat, lon, '', '');
  const now = Date.now();
  if (cache.has(key)) {
    const entry = cache.get(key);
    if (now - entry.ts < CACHE_TTL) return entry.data;
  }
  
  const url = `${API_BASE}/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=5`;
  const res = await axios.get(url);

  // Transform WeatherAPI.com format to match our app's format
  const dailyForecasts = res.data.forecast.forecastday.map(day => ({
    dt: new Date(day.date).getTime() / 1000,
    temp: {
      min: day.day.mintemp_c,
      max: day.day.maxtemp_c
    },
    weather: [{
      main: day.day.condition.text,
      description: day.day.condition.text,
      icon: day.day.condition.icon.split('/').pop().replace('.png', '')
    }]
  }));

  const payload = {
    current: {
      temp: res.data.current.temp_c,
      feels_like: res.data.current.feelslike_c,
      humidity: res.data.current.humidity,
      wind_speed: res.data.current.wind_kph / 3.6, // Convert km/h to m/s
      weather: [{
        main: res.data.current.condition.text,
        description: res.data.current.condition.text,
        icon: res.data.current.condition.icon.split('/').pop().replace('.png', '')
      }],
      pressure: res.data.current.pressure_mb
    },
    daily: dailyForecasts
  };
  
  cache.set(key, { ts: now, data: payload });
  return payload;
}

// Basic validations for date range: start <= end, not past, max 5 days ahead
function validateDateRange(startStr, endStr) {
  if (!startStr || !endStr) return { ok: true };
  const start = new Date(startStr);
  const end = new Date(endStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (isNaN(start) || isNaN(end)) return { ok: false, msg: 'Invalid date format' };
  if (start > end) return { ok: false, msg: 'Start date must be <= end date' };
  if (start < today) return { ok: false, msg: 'Dates cannot be in the past' };
  const maxAllowed = new Date();
  maxAllowed.setDate(maxAllowed.getDate() + 5);
  if (end > maxAllowed) return { ok: false, msg: 'Max range is 5 days ahead' };
  return { ok: true };
}

// --- Routes ---
app.get('/api/geocode', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q is required' });
  try {
    const g = await geocodeInput(q);
    res.json(g);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Geocoding failed' });
  }
});

app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const w = await fetchWeather(lat, lon);
    res.json(w);
  } catch (err) {
    console.error('weather error', err.message);
    res.status(500).json({ error: 'Weather fetch failed' });
  }
});

// Create record
app.post('/api/records', async (req, res) => {
  const { locationInput, dateRange } = req.body || {};
  if (!locationInput) return res.status(400).json({ error: 'locationInput required' });
  const dr = dateRange || {};
  const v = validateDateRange(dr.start, dr.end);
  if (!v.ok) return res.status(400).json({ error: v.msg });
  try {
    const geo = await geocodeInput(locationInput);
    const weather = await fetchWeather(geo.lat, geo.lon);
    // produce the record
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      locationInput,
      resolvedCity: geo.city || '',
      country: geo.country || '',
      lat: geo.lat,
      lon: geo.lon,
      dateRange: { start: dr.start || now.split('T')[0], end: dr.end || now.split('T')[0] },
      currentWeather: weather.current || null,
      forecast: (weather.daily || []).slice(0, 5),
      createdAt: now,
      updatedAt: now
    };
    const records = await readDataFile();
    records.unshift(record);
    await writeDataFile(records);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Create failed' });
  }
});

// Read records (with simple search q)
app.get('/api/records', async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  try {
    const records = await readDataFile();
    const filtered = records.filter(r => {
      if (!q) return true;
      return (
        (r.locationInput || '').toLowerCase().includes(q) ||
        (r.resolvedCity || '').toLowerCase().includes(q) ||
        (r.country || '').toLowerCase().includes(q)
      );
    });
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Read failed' });
  }
});

// Update record
app.put('/api/records/:id', async (req, res) => {
  const id = req.params.id;
  const { locationInput, dateRange } = req.body || {};
  try {
    const records = await readDataFile();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const existing = records[idx];
    // If locationInput changed, re-geocode and fetch weather
    let geo = { lat: existing.lat, lon: existing.lon, city: existing.resolvedCity, country: existing.country };
    if (locationInput && locationInput !== existing.locationInput) {
      geo = await geocodeInput(locationInput);
    }
    const dr = dateRange || existing.dateRange || {};
    const v = validateDateRange(dr.start, dr.end);
    if (!v.ok) return res.status(400).json({ error: v.msg });
    const weather = await fetchWeather(geo.lat, geo.lon);
    const now = new Date().toISOString();
    const updated = Object.assign({}, existing, {
      locationInput: locationInput || existing.locationInput,
      resolvedCity: geo.city,
      country: geo.country,
      lat: geo.lat,
      lon: geo.lon,
      dateRange: { start: dr.start || existing.dateRange.start, end: dr.end || existing.dateRange.end },
      currentWeather: weather.current || existing.currentWeather,
      forecast: (weather.daily || []).slice(0, 5),
      updatedAt: now
    });
    records[idx] = updated;
    await writeDataFile(records);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

// Delete record
app.delete('/api/records/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const records = await readDataFile();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    records.splice(idx, 1);
    await writeDataFile(records);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Exports: JSON (download), CSV, PDF
app.get('/api/exports/json', async (req, res) => {
  try {
    const data = await readDataFile();
    res.setHeader('Content-Disposition', 'attachment; filename=weather_records.json');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Export JSON failed' });
  }
});

app.get('/api/exports/csv', async (req, res) => {
  try {
    const data = await readDataFile();
    const csvStringifier = createObjectCsvStringifier({
      header: [
        {id: 'id', title: 'ID'},
        {id: 'locationInput', title: 'LocationInput'},
        {id: 'resolvedCity', title: 'City'},
        {id: 'country', title: 'Country'},
        {id: 'lat', title: 'Lat'},
        {id: 'lon', title: 'Lon'},
        {id: 'temp', title: 'CurrentTemp'},
        {id: 'humidity', title: 'Humidity'},
        {id: 'date', title: 'Date'},
        {id: 'createdAt', title: 'CreatedAt'}
      ]
    });
    const records = data.map(r => ({
      id: r.id,
      locationInput: r.locationInput,
      resolvedCity: r.resolvedCity,
      country: r.country,
      lat: r.lat,
      lon: r.lon,
      temp: r.currentWeather ? r.currentWeather.temp : '',
      humidity: r.currentWeather ? r.currentWeather.humidity : '',
      date: r.dateRange ? `${r.dateRange.start} to ${r.dateRange.end}` : '',
      createdAt: r.createdAt
    }));
    let csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=weather_records.csv');
    res.send(csv);
  } catch (err) {
    console.error('CSV export error', err);
    res.status(500).json({ error: 'CSV export failed' });
  }
});

app.get('/api/exports/pdf', async (req, res) => {
  try {
    const data = await readDataFile();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=weather_records.pdf');
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(18).text('Weather Records', { align: 'center' });
    doc.moveDown();
    data.forEach((r, i) => {
      doc.fontSize(10).text(`${i+1}. ${r.resolvedCity} (${r.locationInput}) — ${r.dateRange ? r.dateRange.start : ''} to ${r.dateRange ? r.dateRange.end : ''}`);
      if (r.currentWeather) {
        doc.fontSize(9).text(`   Temp: ${r.currentWeather.temp}°C, Feels: ${r.currentWeather.feels_like}°C, Humidity: ${r.currentWeather.humidity}%`);
      }
      doc.moveDown(0.2);
    });
    doc.end();
  } catch (err) {
    console.error('PDF export error', err);
    res.status(500).json({ error: 'PDF export failed' });
  }
});

// Serve static client in production (optional)
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  if (WEATHER_API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY_HERE') {
    console.log('Reminder: set WEATHER_API_KEY in server.js to your OpenWeatherMap API key');
  }
});
