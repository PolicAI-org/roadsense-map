interface Props {
  label: string
  high: number
  medium: number
  low: number
  total: number
}

const rows = [
  { key: 'high',   label: 'Dobra',    color: 'var(--nice)' },
  { key: 'medium', label: 'Groba',    color: 'var(--bad)'  },
  { key: 'low',    label: 'Zelo Groba',  color: 'var(--xbad)' },
] as const

export default function InfoPanelQualityStats({ label, high, medium, low, total }: Props) {
  const counts = { high, medium, low }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--text2)',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border2)', margin: 0 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(({ key, label: rowLabel, color }) => {
          const pct = total > 0 ? (counts[key] / total) * 100 : 0
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ width: 60, fontSize: 13, color: 'var(--text2)', flexShrink: 0 }}>{rowLabel}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color }} />
              </div>
              <span style={{ width: 40, fontSize: 13, textAlign: 'right', color: 'var(--text)', flexShrink: 0 }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
