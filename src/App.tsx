import Map from './Map'
import Sidebar from './Sidebar'
import { useState } from 'react'

export default function App() {
  const [file, setFile] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [, setSelectedFileId] = useState<number | null>(null)
  type Bounds = [[number, number], [number, number]]
  const [boundsToFit, setBoundsToFit] = useState<Bounds | null>(null)

  const openFile = async () => {
    const files = await window.electronAPI.openFile()
    if (!files) return
    setFile(files[0])
    const text = await window.electronAPI.readFile(files[0])
    window.electronAPI.insertRows(parseCSV(text), files[0])
    setRefreshKey(prev => prev + 1)
  }

  type TableRow = { lat: number; lon: number; quality: number }

  function parseCSV(text: string): TableRow[] {
    const rows = text.trim().split('\n').slice(1)
    const result: TableRow[] = []
    for (const row of rows) {
      const [lat, lon, quality] = row.split(',')
      if (!lat || !lon || !quality) continue
      if (lat === 'null' || lon === 'null' || quality === 'null') continue
      result.push({ lat: Number(lat), lon: Number(lon), quality: Number(quality) })
    }
    return result
  }

  const [visibleFileIds, setVisibleFileIds] = useState<number[]>([])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <Sidebar 
      refreshKey={refreshKey} 
      onSelect={(id) => setSelectedFileId(id)} 
      onDelete={() => setRefreshKey(prev => prev + 1)} 
      onVisibilityChange={setVisibleFileIds} 
      onFitBounds={setBoundsToFit} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 8, display: 'flex', gap: 8 }}>
          <button onClick={openFile}>Naloži</button>
          <button onClick={async () => {
            await window.electronAPI.clearCoordinates()
            setRefreshKey(prev => prev + 1)
          }}>Počisti podatke</button>
          {file && <span style={{ alignSelf: 'center', fontSize: 12 }}>Selected: {file}</span>}
        </div>
        <Map refreshKey={refreshKey} visibleFileIds={visibleFileIds} boundsToFit={boundsToFit}/>
      </div>
    </div>
  )
}