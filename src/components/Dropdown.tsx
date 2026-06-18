import { ChevronDown, ChevronUp } from 'lucide-react'
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
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {label.toUpperCase()}{count !== undefined ? ` (${count})` : ''}
        </span>
        {open ? <ChevronUp /> : <ChevronDown />}
      </div>
      {open && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}