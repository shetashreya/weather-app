import React from 'react'

function downloadBlob(data, filename, type){
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export default function ExportButtons(){
  async function handleExportJSON(){
    const res = await fetch('/api/exports/json')
    const data = await res.json()
    downloadBlob(JSON.stringify(data, null, 2), 'weather_records.json', 'application/json')
  }
  async function handleExportCSV(){
    const res = await fetch('/api/exports/csv')
    const txt = await res.text()
    downloadBlob(txt, 'weather_records.csv', 'text/csv')
  }
  async function handleExportPDF(){
    const res = await fetch('/api/exports/pdf')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'weather_records.pdf'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="export-buttons">
      <button onClick={handleExportJSON}>Export JSON</button>
      <button onClick={handleExportCSV}>Export CSV</button>
      <button onClick={handleExportPDF}>Export PDF</button>
    </div>
  )
}
