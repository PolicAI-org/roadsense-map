import { useEffect, useState } from 'react'

interface FileEntry {
  id: number
  file_name: string
  title: string
  stored_at: string
}

export default function Sidebar({ refreshKey, onSelect, onDelete, onVisibilityChange}: { 
  refreshKey: number
  onSelect: (id: number) => void
  onDelete: () => void
  onVisibilityChange: (visibleIds: number[]) => void
}) {
    const [files, setFiles] = useState<FileEntry[]>([])
    const [selected, setSelected] = useState<number | null>(null)

    const [visible, setVisible] = useState<Set<number>>(new Set())

    const [infoFile, setInfoFile] = useState<FileEntry | null>(null)

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
    }, [visible])

    useEffect(() => {
    window.electronAPI.getFiles().then(setFiles)
    }, [refreshKey,])

    return (
    <div style={{
        width: 300,
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
            left: 300,
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
            <button
            onClick={() => setInfoFile(null)}
            style={{ alignSelf: 'flex-end', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
            >
            ✕
            </button>
            <h2>{infoFile.title}</h2>
            <p><strong>Ime datoteke:</strong> {infoFile.file_name}</p>
            <p><strong>Naloženo:</strong> {infoFile.stored_at}</p>
        </div>
        )}
    </div>
    )
}