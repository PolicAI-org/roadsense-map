import { useState, useEffect } from "react"
import { Eye, EyeOff, Pencil, X, ZoomIn } from 'lucide-react'

interface Props {
  file: FileEntry
  stats: FileStats | null
  visible: boolean
  onClose: () => void
  onToggleVisibility: () => void
  onFitBounds: (bounds: [[number, number], [number, number]]) => void
  onRename: (id: number, name: string) => Promise<void>
}

type SectionData = {
  id: number
  section_name: string
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
  high_count: number
  medium_count: number
  low_count: number
}

function getSectionColor(section: SectionData): string {
  const total = section.high_count + section.medium_count + section.low_count
  if (total === 0) return 'inherit'
  const avg = (section.high_count * 1 + section.medium_count * 2 + section.low_count * 3) / total
  if (avg <= 1.25) return '#22c55e'
  if (avg <= 2.25) return '#eab308'
  return '#ef4444'
}

export default function InfoPanel({
  file,
  stats,
  visible,
  onClose,
  onToggleVisibility,
  onFitBounds,
  onRename
}: Props) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [sections, setSections] = useState<SectionData[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<number>(0)

  const selectedSection =
    sections.find(s => s.id === selectedSectionId) ?? null

  const hasLowQualitySection = sections.some(section => {
    const total =
      section.high_count +
      section.medium_count +
      section.low_count

    if (total === 0) return false

    const avg =
      (section.high_count * 1 +
      section.medium_count * 2 +
      section.low_count * 3) / total

    return avg > 2.25
  })

  const totalCount = selectedSection
    ? (selectedSection.low_count +
      selectedSection.medium_count +
      selectedSection.high_count)
    : 0

  useEffect(() => {
    window.electronAPI
      .getSectionStats(file.id)
      .then(setSections)

    setSelectedSectionId(0)
  }, [file.id])

  const Divider = (
    <hr
      style={{
        border: 'none',
        borderTop: '3px solid var(--border2)',
        margin: '8px 0',
      }}
    />
  )
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 300,
        height: '100vh',
        backgroundColor: 'var(--bg3)',
        borderRight: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}>
      <div
        style={{
          display: 'flex',
          gap: 4,
          justifyContent: 'flex-end',
          padding: 16,
          borderBottom: '1px solid var(--border2)',
          flexShrink: 0,
        }}>
        <button
          className="icon-btn"
          onClick={() => {
            if (stats?.bounds) {
              onFitBounds([
                [stats.bounds.minLon, stats.bounds.minLat],
                [stats.bounds.maxLon, stats.bounds.maxLat],
              ])
            }
          }}>
          <ZoomIn size={16} />
        </button>
        <button
          className="icon-btn"
          onClick={onToggleVisibility}
          style={{ opacity: visible ? 1 : 0.3 }}>
          {visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button className="icon-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
        }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
        }}>
          {renaming ? (
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  await onRename(file.id, newName)
                  setRenaming(false)
                }
                if (e.key === 'Escape') setRenaming(false)
              }}
              style={{ flex: 1, fontSize: 16, fontWeight: 'bold' }}/>
          ) : (
            <h2 style={{ margin: 0 }}>{file.title}</h2>
          )}
          <button
            className="icon-btn"
            onClick={() => {
              setNewName(file.title)
              setRenaming(true)
            }}>
            <Pencil size={16} />
          </button>
        </div>

        {Divider}
        <p><strong>Ime datoteke:</strong> {file.file_name}</p>
        <p><strong>Naloženo:</strong> {file.stored_at}</p>
        {Divider}
        {stats && (
          <div>
            <p><strong>Skupaj vzorcev:</strong> {stats.total.count}</p>
            <p><strong>Dobra:</strong> {(stats.high.count / stats.total.count * 100).toFixed(2)}%</p>
            <p><strong>Groba:</strong> {(stats.medium.count / stats.total.count * 100).toFixed(2)}%</p>
            <p><strong>Uničena:</strong> {(stats.low.count / stats.total.count * 100).toFixed(2)}%</p>
            {Divider}
            <p>
              <strong>Koordinate:</strong>{' '}
              {stats.bounds.minLat.toFixed(5)} – {stats.bounds.maxLat.toFixed(5)} lat,
              {stats.bounds.minLon.toFixed(5)} – {stats.bounds.maxLon.toFixed(5)} lon
            </p>
          </div>
        )}
        {Divider}
        <h3>Odseki</h3>
        <select
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "6px",
            marginBottom: "12px"
          }}>
          <option value={0}>Izberi odsek</option>
          {sections.map(section => (
            <option 
              key={section.id} 
              value={section.id}
              style={{ color: getSectionColor(section) }}
            >
              {section.section_name + " (" + section.id + ")"}
            </option>
          ))}
        </select>
        {hasLowQualitySection && (
          <div
            style={{
              background: '#ef4444',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 6,
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            ⚠ Uničena cesta zaznana
          </div>
        )}
        {selectedSection && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              className="icon-btn"
              onClick={() => {
                onFitBounds([
                  [selectedSection.min_lon, selectedSection.min_lat],
                  [selectedSection.max_lon, selectedSection.max_lat],
                ])
              }}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div>
            <p><strong>Ime:</strong> {selectedSection.section_name}</p>
            <p><strong>Skupaj vzorcev:</strong> {totalCount}</p>
            <p><strong>Dobra:</strong> {(selectedSection.high_count / totalCount * 100).toFixed(2)} %</p>
            <p><strong>Groba:</strong> {(selectedSection.medium_count / totalCount * 100).toFixed(2)} %</p>
            <p><strong>Uničena:</strong> {(selectedSection.low_count / totalCount * 100).toFixed(2)} %</p>

            <p>
              <strong>Koordinate:</strong>{' '}
              {selectedSection.min_lat.toFixed(5)} – {selectedSection.max_lat.toFixed(5)} lat,
              {selectedSection.min_lon.toFixed(5)} – {selectedSection.max_lon.toFixed(5)} lon
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}