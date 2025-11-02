import React, { useState } from 'react'

export default function WeatherForm({ onFetched, onSaved }){
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUseLocation(){
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      const coords = `${pos.coords.latitude},${pos.coords.longitude}`
      setInput(coords)
      await handleFetch(coords)
    }, (err)=>{ alert('Geolocation denied or failed') })
  }

  async function handleFetch(value){
    try{
      setLoading(true)
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`)
      if (!geoRes.ok) throw new Error(await geoRes.text())
      const geo = await geoRes.json()
      const weatherRes = await fetch(`/api/weather?lat=${geo.lat}&lon=${geo.lon}`)
      if (!weatherRes.ok) throw new Error('Weather fetch failed')
      const weather = await weatherRes.json()
      onFetched({ geo, weather })
    }catch(e){
      alert('Fetch failed: ' + (e.message || e))
    }finally{ setLoading(false) }
  }

  async function handleSave(e){
    e.preventDefault()
    if (!input) return alert('Enter a location')
    try{
      setLoading(true)
      const body = { locationInput: input }
      const res = await fetch('/api/records', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'save failed'}))
        throw new Error(err.error || 'save failed')
      }
      const saved = await res.json()
      onSaved(saved)
      alert('Saved')
    }catch(e){ alert('Save failed: '+(e.message||e)) }
    finally{ setLoading(false) }
  }

  return (
    <form className="weather-form" onSubmit={handleSave}>
      <label>Location</label>
      <div className="row">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="City, zip, lat,lon, or landmark" />
        <button type="button" onClick={handleUseLocation}>Use My Location</button>
      </div>
      <div className="actions">
        <button type="button" onClick={()=>handleFetch(input)} disabled={loading}>Fetch</button>
        <button type="submit" disabled={loading}>Save</button>
      </div>
    </form>
  )
}
