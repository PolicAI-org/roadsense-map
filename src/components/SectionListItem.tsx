import { ChevronRight, Eye, EyeOff, Trash2 } from "lucide-react"

interface Props {
  file: FileEntry
  selected: boolean
  visible: boolean
  onSelect: () => void
  onDelete: () => void
  onToggleVisibility: () => void
  onInfo: () => void
}

export default function FileListItem({ file, selected, visible, onSelect, onDelete, onToggleVisibility, onInfo }: Props) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 16px',
        cursor: 'pointer',
        backgroundColor: selected ? 'var(--card2)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{file.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{file.stored_at}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); onInfo() }}
          className="icon-btn" title="Več detajlov"><ChevronRight /></button>
      </div>
      
    </div>
  )
}