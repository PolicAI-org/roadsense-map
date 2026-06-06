interface Props {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export default function InfoPanelCoords({ minLat, maxLat, minLon, maxLon }: Props) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--text2)',
          whiteSpace: 'nowrap',
        }}>
          KOORDINATE
        </span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border2)', margin: 0 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text2)', marginBottom: 2 }}>LAT</div>
          <div style={{ fontSize: 14, color: 'var(--text)' }}>{minLat.toFixed(5)} – {maxLat.toFixed(5)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text2)', marginBottom: 2 }}>LON</div>
          <div style={{ fontSize: 14, color: 'var(--text)' }}>{minLon.toFixed(5)} – {maxLon.toFixed(5)}</div>
        </div>
      </div>
    </div>
  )
}
