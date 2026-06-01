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
        backgroundColor: selected ? '#e0e0e0' : 'transparent',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{file.title}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{file.stored_at}</div>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 16 }}>✕</button>
      <button onClick={e => { e.stopPropagation(); onToggleVisibility() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: visible ? 1 : 0.3 }}>👁</button>
      <button onClick={e => { e.stopPropagation(); onInfo() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>ℹ️</button>
    </div>
  )
}