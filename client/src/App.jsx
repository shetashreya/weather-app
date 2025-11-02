import React, { useEffect, useState } from 'react'
import WeatherForm from './components/WeatherForm'
import Forecast from './components/Forecast'
import RecordsTable from './components/RecordsTable'
import ExportButtons from './components/ExportButtons'
import './index.css'

export default function App() {
  const [current, setCurrent] = useState(null)
  const [forecast, setForecast] = useState([])
  const [locationMeta, setLocationMeta] = useState(null)
  const [recordsUpdatedAt, setRecordsUpdatedAt] = useState(Date.now())

  // handler when a fetch happens in WeatherForm
  function handleFetched({ geo, weather }){
    setCurrent(weather.current || null)
    setForecast((weather.daily || []).slice(0,5))
    setLocationMeta(geo)
  }

  return (
    <div className="app-root">
      <header className="hero" style={{backgroundImage: locationMeta ? `url(https://source.unsplash.com/1600x900/?${encodeURIComponent(locationMeta.city || 'weather')})` : undefined}}>
        <div className="hero-inner">
          <h1>Weather App</h1>
          <p className="sub">Current + 5-day forecast • Export CSV / PDF</p>
        </div>
        <div className="info-btn">Info</div>
      </header>

      <main className="container">
        <section className="left">
          <WeatherForm onFetched={handleFetched} onSaved={()=>setRecordsUpdatedAt(Date.now())} />
          <Forecast current={current} forecast={forecast} locationMeta={locationMeta} />
        </section>

        <aside className="right">
          <div className="records-header">
            <h2>Saved Records</h2>
            <ExportButtons onExported={()=>{}} />
          </div>
          <RecordsTable refreshSignal={recordsUpdatedAt} onChange={()=>setRecordsUpdatedAt(Date.now())} />
        </aside>
      </main>

      <footer className="footer">Weather App by Shreya Sheta</footer>
    </div>
  )
}
