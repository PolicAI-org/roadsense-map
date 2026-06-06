import { Eye, EyeOff, ZoomIn, X } from 'lucide-react'

interface Props {
  visible: boolean
  hasBounds: boolean
  onFitBounds: () => void
  onToggleVisibility: () => void
  onClose: () => void
}

export default function InfoPanelButtonBox({ visible, hasBounds, onFitBounds, onToggleVisibility, onClose }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        justifyContent: 'flex-end',
        padding: 16,
        borderBottom: '1px solid var(--border2)',
        flexShrink: 0,
      }}>
      <button className="icon-btn icon-btn--outlined" onClick={onFitBounds} disabled={!hasBounds}>
        <ZoomIn size={16} />
      </button>
      <button className="icon-btn icon-btn--outlined" onClick={onToggleVisibility} style={{ opacity: visible ? 1 : 0.3 }}>
        {visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      <button className="icon-btn icon-btn--outlined" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  )
}
