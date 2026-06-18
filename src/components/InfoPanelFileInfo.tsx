import { useState } from 'react'
import { Pencil } from 'lucide-react'

interface Props {
  file: FileEntry
  onRename: (id: number, name: string) => Promise<void>
}

export default function InfoPanelFileInfo({ file, onRename }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
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
            style={{ flex: 1, fontSize: 16, fontWeight: 'bold' }} />
        ) : (
          <h2 style={{ margin: 0 }}>{file.title}</h2>
        )}
        <button
          className="icon-btn"
          onClick={() => {
            setNewName(file.title)
            setRenaming(true)
          }}>
          <Pencil size={16} />
        </button>
      </div>

      <p><strong>Ime datoteke:</strong> {file.file_name}</p>
      <p><strong>Naloženo:</strong> {file.stored_at}</p>
    </div>
  )
}
