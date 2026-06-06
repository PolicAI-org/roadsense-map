import InfoPanelButtonBox from './InfoPanelButtonBox'
import InfoPanelFileInfo from './InfoPanelFileInfo'
import InfoPanelQualityStats from './InfoPanelQualityStats'
import InfoPanelCoords from './InfoPanelCoords'
import InfoPanelSectionStats from './InfoPanelSectionStats'

interface Props {
  file: FileEntry
  stats: FileStats | null
  visible: boolean
  onClose: () => void
  onToggleVisibility: () => void
  onFitBounds: (bounds: [[number, number], [number, number]]) => void
  onRename: (id: number, name: string) => Promise<void>
  onDelete: () => void
}

const Divider = (
  <hr style={{ border: 'none', borderTop: '3px solid var(--border2)', margin: '8px 0' }} />
)

export default function InfoPanel({ file, stats, visible, onClose, onToggleVisibility, onFitBounds, onRename, onDelete }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '100%',
        width: 300,
        height: '100vh',
        backgroundColor: 'var(--bg3)',
        borderRight: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}>
      <InfoPanelButtonBox
        visible={visible}
        hasBounds={!!stats?.bounds}
        onFitBounds={() => {
          if (stats?.bounds) {
            onFitBounds([
              [stats.bounds.minLon, stats.bounds.minLat],
              [stats.bounds.maxLon, stats.bounds.maxLat],
            ])
          }
        }}
        onToggleVisibility={onToggleVisibility}
        onClose={onClose}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <InfoPanelFileInfo file={file} onRename={onRename} />
        {stats && (
          <>
            {Divider}
            <InfoPanelQualityStats
              label="KAKOVOST — SKUPAJ"
              high={stats.high.count}
              medium={stats.medium.count}
              low={stats.low.count}
              total={stats.total.count}
            />
            {Divider}
            <InfoPanelCoords
              minLat={stats.bounds.minLat}
              maxLat={stats.bounds.maxLat}
              minLon={stats.bounds.minLon}
              maxLon={stats.bounds.maxLon}
            />
          </>
        )}
        {Divider}
        <InfoPanelSectionStats fileId={file.id} onFitBounds={onFitBounds} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--border2)', flexShrink: 0 }}>
        <button
          onClick={onDelete}
          style={{
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: '1px solid var(--xbad)',
            borderRadius: 8,
            color: 'var(--xbad)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
          Izbriši posnetek
        </button>
      </div>
    </div>
  )
}
