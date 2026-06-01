import { useState } from 'react'

interface Props {
  label: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function Dropdown({ label, count, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          borderBottom: '1px solid #eee',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {label.toUpperCase()}{count !== undefined ? ` (${count})` : ''}
        </span>
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>{children}</div>
      )}
    </div>
  )
}