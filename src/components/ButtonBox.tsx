import { FolderUp } from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'


export default function ButtonBox({ setRefreshKey }: { setRefreshKey: Dispatch<SetStateAction<number>> }) {
    const openFile = async () => {
        const files = await window.electronAPI.openFile()
        if (!files) return

        const text = await window.electronAPI.readFile(files[0])
        window.electronAPI.insertRows(parseCSV(text), files[0])

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
  
    for (let i = 0; i < rows.length; i++) {
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
    <div style={{ padding: "16px 18px", display: "flex", alignItems: 'stretch', borderBottom: "1px solid var(--border2)" }}>
        <button onClick={openFile} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: "6px 0 0 6px",
            padding: '6px 8px', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.15s, transform 0.1s'
            }} >
            <FolderUp size={12}/>
            <span>Uvozi posnetek</span>
        </button>
        <button onClick={async () => {
          await window.electronAPI.clearCoordinates()
          setRefreshKey(prev => prev + 1)
        }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#ff4a4a', color: '#fff', border: 'none', borderRadius: "0 6px 6px 0", padding: '6px 12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.15s, transform 0.1s'}}>
            <span>Počisti</span>
        </button>
      {}
    </div>
  )
}