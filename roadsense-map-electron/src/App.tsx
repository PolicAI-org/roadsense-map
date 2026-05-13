import Map from './Map';
import { useState } from 'react'

export default function App() {
  const [file, setFile] = useState<string | null>(null)

  const openFile = async () => {
    const files = await window.electronAPI.openFile()
    if (!files) return

    setFile(files[0])

    const text = await window.electronAPI.readFile(files[0])
    window.electronAPI.insertRows(parseCSV(text))
  }

  type TableRow = {
      lat: number
      lon: number
      quality: number
  }
  
  function parseCSV(text: string): TableRow[] {
    const rows = text.trim().split('\n').slice(1);
  
    const result: TableRow[] = [];
  
    for (let i = 0; i < rows.length; i += 100) {
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
        Select File
      </button>

      {file && (
        <p style={{ marginTop: 10 }}>
          Selected: {file}
        </p>
      )}
      <Map />
    </div>
  );
}