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
      <div style={{justifyContent: "right"}}>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--xbad)', fontSize: 16 }} title="Izbriši"><Trash2 /></button>
        <button onClick={e => { e.stopPropagation(); onToggleVisibility() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: visible ? 1 : 0.3 }} title={!visible ? "Skrij" : "Pokaži"}>{!visible ? <EyeOff /> : <Eye />}</button>
        <button onClick={e => { e.stopPropagation(); onInfo() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Več detajlov"><ChevronRight /></button>
      </div>
      
    </div>
  )
}