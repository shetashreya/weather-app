import React from 'react'

function iconUrl(icon){
  if (!icon) return null
  // full URL from some providers
  if (icon.startsWith('http://') || icon.startsWith('https://')) return icon
  if (icon.startsWith('//')) return 'https:' + icon
  // numeric codes from WeatherAPI -> build CDN path
  if (/^\d+$/.test(icon)) return `https://cdn.weatherapi.com/weather/64x64/day/${icon}.png`
  // fallback assume OpenWeatherMap icon code
  return `http://openweathermap.org/img/wn/${icon}@2x.png`
}

export default function Forecast({ current, forecast, locationMeta }){
  return (
    <div className="forecast">
      <h3>{locationMeta ? `${locationMeta.city}, ${locationMeta.country}` : 'Forecast'}</h3>
      {current ? (
        <div className="current">
          {iconUrl(current.weather && current.weather[0] && current.weather[0].icon) ? (
            <img src={iconUrl(current.weather && current.weather[0] && current.weather[0].icon)} alt="icon" />
          ) : null}
          <div>
            <div className="temp">{Math.round(current.temp)}°C</div>
            <div className="desc">{current.weather && current.weather[0] && current.weather[0].description}</div>
            <div className="meta">Feels: {Math.round(current.feels_like)}°C • Humidity: {current.humidity}% • Wind: {current.wind_speed} m/s</div>
          </div>
        </div>
      ) : <div className="no-data">No current weather</div>}

      <div className="daily-grid">
        {forecast && forecast.length ? forecast.map((d, i)=> (
          <div className="card" key={i}>
            <div className="date">{new Date(d.dt * 1000).toLocaleDateString()}</div>
            {iconUrl(d.weather && d.weather[0] && d.weather[0].icon) ? (
              <img src={iconUrl(d.weather && d.weather[0] && d.weather[0].icon)} alt="" />
            ) : null}
            <div className="temps">High {Math.round(d.temp.max)}°C • Low {Math.round(d.temp.min)}°C</div>
          </div>
        )) : <div>No forecast</div>}
      </div>
    </div>
  )
}
