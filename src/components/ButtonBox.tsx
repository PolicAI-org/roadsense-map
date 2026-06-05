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

    const openGeoJSON = async () => {
        const files = await window.electronAPI.openFile()
        if (!files) return

        window.electronAPI.loadRoadFile(files[0])

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
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px solid var(--border2)" }}>
  
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={openFile} className="bb-import">
          <FolderUp size={12}/>
          <span>Uvozi posnetek</span>
        </button>

        <button
          onClick={async () => {
            await window.electronAPI.clearCoordinates();
            setRefreshKey(prev => prev + 1);
          }}
          className="bb-clear"
        >
          <span>Počisti</span>
        </button>
      </div>

      <div>
        <button onClick={openGeoJSON} className="bb-roadfile" style={{width: "100%"}}>
          <FolderUp size={12}/>
          <span>Uvozi podatke o cestah</span>
        </button>
      </div>

    </div>
  )
}