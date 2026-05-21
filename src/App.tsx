import Map from './Map';
import { useState } from 'react'


export default function App() {
  const [file, setFile] = useState<string | null>(null)

  const [refreshKey, setRefreshKey] = useState(0)

  const openFile = async () => {
    const files = await window.electronAPI.openFile()
    if (!files) return

    setFile(files[0])

    const text = await window.electronAPI.readFile(files[0])
    window.electronAPI.insertRows(parseCSV(text))

    setRefreshKey(prev => prev + 1)
  }

  type TableRow = {
      lat: number
      lon: number
      quality: number
  }
  
  function parseCSV(text: string): TableRow[] {
    const rows = text.trim().split('\n').slice(1);
  
    const result: TableRow[] = [];
  
    for (let i = 0; i < rows.length; i += 50) {
      const row = rows[i];
  
      const [lat, lon, quality] = row.split(',');
  
      if (!lat || !lon || !quality) continue;
      if (lat === 'null' || lon === 'null' || quality === 'null') continue;
  
      result.push({
        lat: Number(lat),
        lon: Number(lon),
        quality: Number(quality)
      })
    }
  
    return result;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <button onClick={openFile}>
        Izberi datoteko
      </button>

      <button
        onClick={async () => {
          await window.electronAPI.clearCoordinates()
          setRefreshKey(prev => prev + 1)
        }}
      >
        Počisti podatke
      </button>

      {file && (
        <p style={{ marginTop: 10 }}>
          Selected: {file}
        </p>
      )}
      <Map refreshKey={refreshKey}/>
    </div>
  );
}