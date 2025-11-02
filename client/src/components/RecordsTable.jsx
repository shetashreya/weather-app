import React, { useEffect, useState } from 'react'
import EditModal from './EditModal'

export default function RecordsTable({ refreshSignal, onChange }){
  const [records, setRecords] = useState([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)

  async function load(){
    const res = await fetch('/api/records?q='+encodeURIComponent(q))
    const data = await res.json()
    setRecords(data)
  }

  useEffect(()=>{ load() }, [refreshSignal])

  async function handleDelete(id){
    if (!confirm('Delete this record?')) return
    await fetch(`/api/records/${id}`, { method: 'DELETE' })
    onChange()
    load()
  }

  return (
    <div className="records">
      <div className="search-row">
        <input placeholder="Search records" value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={load}>Search</button>
      </div>
      <table>
        <thead><tr><th>City</th><th>Input</th><th>Temp</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          {records.map(r=> (
            <tr key={r.id}>
              <td>{r.resolvedCity} {r.country}</td>
              <td>{r.locationInput}</td>
              <td>{r.currentWeather ? Math.round(r.currentWeather.temp)+'°C' : '-'}</td>
              <td>{r.dateRange ? r.dateRange.start : ''}</td>
              <td>
                <div className="action-group">
                  <button onClick={()=>setEditing(r)}>Edit</button>
                  <button onClick={()=>handleDelete(r.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && <EditModal record={editing} onClose={()=>{ setEditing(null); load(); onChange(); }} />}
    </div>
  )
}
