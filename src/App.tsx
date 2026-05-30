import Map from './Map'
import DataPanel from './components/DataPanel';
import { useState } from 'react'

export default function App() {
  const [file, setFile] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  type Bounds = [[number, number], [number, number]]
  const [boundsToFit] = useState<Bounds | null>(null)

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

  const [visibleFileIds] = useState<number[]>([])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <DataPanel />
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