import React, { useState } from 'react'

export default function EditModal({ record, onClose }){
  const [locationInput, setLocationInput] = useState(record.locationInput)
  const [start, setStart] = useState(record.dateRange ? record.dateRange.start : '')
  const [end, setEnd] = useState(record.dateRange ? record.dateRange.end : '')

  async function handleSave(){
    const body = { locationInput, dateRange: { start, end } }
    const res = await fetch(`/api/records/${record.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
    if (!res.ok) {
      const e = await res.json().catch(()=>({error:'Update failed'}))
      return alert('Update failed: '+(e.error||''))
    }
    alert('Updated')
    onClose()
  }

  return (
    <div className="modal">
      <div className="modal-inner">
        <h3>Edit Record</h3>
        <label>Location Input</label>
        <input value={locationInput} onChange={e=>setLocationInput(e.target.value)} />
        <label>Start</label>
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} />
        <label>End</label>
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} />
        <div className="modal-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
