const QUALITIES = [
  { key: 'highKm' as const,   label: 'Dobra',      color: '#4caf50' },
  { key: 'mediumKm' as const, label: 'Slaba',      color: '#ff9800' },
  { key: 'lowKm' as const,    label: 'Zelo slaba', color: '#f44336' },
]

export default function StatsBox({ stats }: { stats: GlobalStats | null }) {
  if (!stats) return null

  const pct = (km: number) => stats.totalKm > 0 ? Math.round((km / stats.totalKm) * 100) : 0

  return (
    <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border2)" }}>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        {stats.totalKm.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text2)' }}>km izmerjenih</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QUALITIES.map(({ key, label, color }) => {
          const km = stats[key]
          const p = pct(km)
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--text2)', marginRight: 8 }}>{p}%</span>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 52, textAlign: 'right' }}>{km.toFixed(1)} km</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--border2)' }}>
                <div style={{ height: '100%', width: `${p}%`, borderRadius: 2, background: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}