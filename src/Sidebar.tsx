import { useEffect, useState } from 'react'

interface FileEntry {
  id: number
  file_name: string
  title: string
  stored_at: string
}

export default function Sidebar({ refreshKey, onSelect }: { 
  refreshKey: number
  onSelect: (id: number) => void 
}) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    window.electronAPI.getFiles().then(setFiles)
  }, [refreshKey])

  return (
    <div style={{
      width: 250,
      height: '100vh',
      overflowY: 'auto',
      borderRight: '1px solid #ccc',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <h3 style={{ padding: '12px 16px', margin: 0 }}>Meritve</h3>
      {files.map(f => (
        <div
          key={f.id}
          onClick={() => { setSelected(f.id); onSelect(f.id) }}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            backgroundColor: selected === f.id ? '#e0e0e0' : 'transparent',
            borderBottom: '1px solid #eee',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{f.title}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{f.stored_at}</div>
        </div>
      ))}
      {files.length === 0 && (
        <p style={{ padding: 16, color: '#aaa' }}>No files yet</p>
      )}
    </div>
  )
}