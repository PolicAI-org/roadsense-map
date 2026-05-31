import { useEffect, useState } from 'react'

interface FileEntry {
  id: number
  file_name: string
  title: string
  stored_at: string
}

interface FileStats {
  total: { count: number }
  high: { count: number }
  medium: { count: number }
  low: { count: number }
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
}


export default function Sidebar({ refreshKey, onSelect, onDelete, onVisibilityChange, onFitBounds}: { 
  refreshKey: number
  onSelect: (id: number | null) => void
  onDelete: () => void
  onVisibilityChange: (visibleIds: number[]) => void
  onFitBounds: (bounds: [[number, number], [number, number]]) => void
}) {
    const Divider = <hr style={{
    border: 'none',
    borderTop: '3px solid black',
    margin: '8px 0',
    }} />

    const [files, setFiles] = useState<FileEntry[]>([])
    const [selected, setSelected] = useState<number | null>(null)

    const [visible, setVisible] = useState<Set<number>>(new Set())

    const [infoFile, setInfoFile] = useState<FileEntry | null>(null)

    const [renaming, setRenaming] = useState(false)
    const [newName, setNewName] = useState('')

    const [stats, setStats] = useState<FileStats | null>(null)

    const toggleVisibility = (id: number) => {
        setVisible(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    useEffect(() => {
        onVisibilityChange([...visible])
    }, [visible, onVisibilityChange])

    useEffect(() => {
        window.electronAPI.getFiles().then(setFiles)
    }, [refreshKey])

    useEffect(() => {
        if (infoFile) {
            window.electronAPI.getFileStats(infoFile.id).then(setStats)
        }
    }, [infoFile])

    return (
    <div style={{
        width: 348,
        height: '100vh',
        borderRight: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
    }}>
        <h3 style={{ padding: '12px 16px', margin: 0 }}>Meritve</h3>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
        {files.map(f => (
            <div
                key={f.id}
                onClick={() => { setSelected(f.id); onSelect(f.id) }}
                style={{
                padding: '10px 16px',
                cursor: 'pointer',
                backgroundColor: selected === f.id ? '#e0e0e0' : 'transparent',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                }}
            >
                <div>
                <div style={{ fontWeight: 'bold', fontSize: 14 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{f.stored_at}</div>
                </div>
                <button
                onClick={async (e) => {
                    e.stopPropagation()
                    await window.electronAPI.deleteFile(f.id)
                    setFiles(prev => prev.filter(file => file.id !== f.id))
                    if (selected === f.id) {
                        setSelected(null)
                        onSelect(null)
                    }
                    onDelete()
                }}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: '#e53e3e',
                    fontSize: 16,
                }}
                >
                ✕
                </button>
                <button
                onClick={(e) => {
                    e.stopPropagation()
                    toggleVisibility(f.id)
                }}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: 16,
                    opacity: visible.has(f.id) ? 1 : 0.3,
                }}
                >
                👁
                </button>
                <button
                onClick={(e) => {
                    e.stopPropagation()
                    setInfoFile(f)
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                >
                ℹ️
                </button>
            </div>
            ))}
        {files.length === 0 && (
            <p style={{ padding: 16, color: '#aaa' }}>...</p>
        )}
        </div>
        {infoFile && (
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
            <div style={{ display: 'flex', gap: 4, alignItems: 'right', marginBottom: 8, justifyContent: 'flex-end'}}>
                <button onClick={() => {
                    if (stats?.bounds) {
                    onFitBounds([
                        [stats.bounds.minLon, stats.bounds.minLat],
                        [stats.bounds.maxLon, stats.bounds.maxLat],
                    ])
                    }
                }}>🔍</button>
                <button
                    onClick={(e) => {
                    e.stopPropagation()
                    toggleVisibility(infoFile.id)
                    }}
                    style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: 16,
                    opacity: visible.has(infoFile.id) ? 1 : 0.3,
                    }}
                >👁</button>
                <button
                    onClick={() => setInfoFile(null)}
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
                    await window.electronAPI.renameFile(infoFile.id, newName)
                    setFiles(prev => prev.map(f => f.id === infoFile.id ? { ...f, title: newName } : f))
                    setInfoFile(prev => prev ? { ...prev, title: newName } : null)
                    setRenaming(false)
                    }
                    if (e.key === 'Escape') setRenaming(false)
                }}
                style={{ flex: 1, fontSize: 16, fontWeight: 'bold' }}
                />
            ) : (
                <h2 style={{ margin: 0 }}>{infoFile.title}</h2>
            )}
            <button onClick={() => { setNewName(infoFile.title); setRenaming(true) }}>
                ✏️
            </button>
            </div>
            {Divider}
            <p><strong>Ime datoteke:</strong> {infoFile.file_name}</p>
            <p><strong>Naloženo:</strong> {infoFile.stored_at}</p>
            {Divider}
            {stats && (
                <div>
                    <p><strong>Skupaj vorcev:</strong> {stats.total.count}</p>
                    <p><strong>Dobra:</strong> {(stats.high.count / stats.total.count * 100).toFixed(2)} % ({stats.high.count})</p>
                    <p><strong>Groba:</strong> {(stats.medium.count / stats.total.count * 100).toFixed(2)} % ({stats.medium.count})</p>
                    <p><strong>Uničena:</strong> {(stats.low.count / stats.total.count * 100).toFixed(2)} % ({stats.low.count})</p>
                    <p><strong>Povprečna kakovost:</strong> {((stats.high.count + stats.medium.count*2 + stats.low.count*3)/stats.total.count).toFixed(2)}</p>
                    {Divider}
                    <p><strong>Koordinate:</strong> {stats.bounds.minLat.toFixed(5)} - {stats.bounds.maxLat.toFixed(5)} lat, {stats.bounds.minLon.toFixed(5)} - {stats.bounds.maxLon.toFixed(5)} lon</p>
                </div>
            )}
        </div>
        )}
    </div>
    )
}