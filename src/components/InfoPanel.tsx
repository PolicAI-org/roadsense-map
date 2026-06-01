import { useState } from "react"

interface Props {
  file: FileEntry
  stats: FileStats | null
  visible: boolean
  onClose: () => void
  onToggleVisibility: () => void
  onFitBounds: (bounds: [[number, number], [number, number]]) => void
  onRename: (id: number, name: string) => void
}

export default function InfoPanel({ file, stats, visible, onClose, onToggleVisibility, onFitBounds, onRename }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')

  const Divider = <hr style={{
    border: 'none',
    borderTop: '3px solid black',
    margin: '8px 0',
    }} />

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: 300,
      height: '100vh',
      backgroundColor: 'white',
      borderRight: '1px solid #ccc',
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      padding: 24,
    }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'right', marginBottom: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => {
          if (stats?.bounds) {
            onFitBounds([
              [stats.bounds.minLon, stats.bounds.minLat],
              [stats.bounds.maxLon, stats.bounds.maxLat],
            ])
          }
        }}>🔍</button>
        <button
          onClick={onToggleVisibility}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            opacity: visible ? 1 : 0.3,
          }}
        >👁</button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
        >❌</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                await onRename(file.id, newName)
                setRenaming(false)
              }
              if (e.key === 'Escape') setRenaming(false)
            }}
            style={{ flex: 1, fontSize: 16, fontWeight: 'bold' }}
          />
        ) : (
          <h2 style={{ margin: 0 }}>{file.title}</h2>
        )}
        <button onClick={() => { setNewName(file.title); setRenaming(true) }}>✏️</button>
      </div>

      {Divider}
      <p><strong>Ime datoteke:</strong> {file.file_name}</p>
      <p><strong>Naloženo:</strong> {file.stored_at}</p>
      {Divider}

      {stats && (
        <div>
          <p><strong>Skupaj vzorcev:</strong> {stats.total.count}</p>
          <p><strong>Dobra:</strong> {(stats.high.count / stats.total.count * 100).toFixed(2)} % ({stats.high.count})</p>
          <p><strong>Groba:</strong> {(stats.medium.count / stats.total.count * 100).toFixed(2)} % ({stats.medium.count})</p>
          <p><strong>Uničena:</strong> {(stats.low.count / stats.total.count * 100).toFixed(2)} % ({stats.low.count})</p>
          <p><strong>Povprečna kakovost:</strong> {((stats.high.count + stats.medium.count * 2 + stats.low.count * 3) / stats.total.count).toFixed(2)}</p>
          {Divider}
          <p><strong>Koordinate:</strong> {stats.bounds.minLat.toFixed(5)} – {stats.bounds.maxLat.toFixed(5)} lat, {stats.bounds.minLon.toFixed(5)} – {stats.bounds.maxLon.toFixed(5)} lon</p>
        </div>
      )}
    </div>
  )
}