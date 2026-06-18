import { useState, useEffect } from 'react'
import { ZoomIn, AlertTriangle } from 'lucide-react'
import InfoPanelQualityStats from './InfoPanelQualityStats'
import InfoPanelCoords from './InfoPanelCoords'

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
  meas_min_lat: number
  meas_max_lat: number
  meas_min_lon: number
  meas_max_lon: number
}

function getSectionColor(section: SectionData): string {
  const total = section.high_count + section.medium_count + section.low_count
  if (total === 0) return 'inherit'
  const avg = (section.high_count * 1 + section.medium_count * 2 + section.low_count * 3) / total
  if (avg <= 1.25) return 'var(--nice)'
  if (avg <= 2.25) return 'var(--bad)'
  return 'var(--xbad)'
}

interface Props {
  fileId: number
  onFitBounds: (bounds: [[number, number], [number, number]]) => void
}

export default function InfoPanelSectionStats({ fileId, onFitBounds }: Props) {
  const [sections, setSections] = useState<SectionData[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<number>(0)

  useEffect(() => {
    const load = async () => {
      const data = await window.electronAPI.getSectionStats(fileId)
      setSections(data)
      setSelectedSectionId(0)
    }
    load()
  }, [fileId])

  const selectedSection = sections.find(s => s.id === selectedSectionId) ?? null
  const totalCount = selectedSection
    ? selectedSection.high_count + selectedSection.medium_count + selectedSection.low_count
    : 0

  const hasLowQualitySection = selectedSection !== null && (() => {
    if (totalCount === 0) return false
    const avg = (selectedSection.high_count * 1 + selectedSection.medium_count * 2 + selectedSection.low_count * 3) / totalCount
    return avg > 2.25
  })()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--text2)',
          whiteSpace: 'nowrap',
        }}>
          ODSEKI
        </span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border2)', margin: 0 }} />
      </div>

      <select
        value={selectedSectionId}
        onChange={e => setSelectedSectionId(Number(e.target.value))}
        style={{
          width: '100%',
          padding: '8px 10px',
          marginBottom: 10,
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: 13,
        }}>
        <option value={0}>Izberi odsek</option>
        {sections.map(section => (
          <option key={section.id} value={section.id} style={{ color: getSectionColor(section) }}>
            {section.section_name} (g-s{section.id}-{section.id + 2})
          </option>
        ))}
      </select>

      {hasLowQualitySection && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--xbad-bg)',
          border: '1px solid var(--xbad)',
          color: 'var(--xbad)',
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 10,
          fontWeight: 600,
          fontSize: 13,
        }}>
          <AlertTriangle size={14} /> Zelo grob odsek zaznan
        </div>
      )}

      {selectedSection && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          borderRadius: 8,
          padding: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button
              className="icon-btn icon-btn--outlined"
              style={{ padding: 6 }}
              onClick={() => onFitBounds([
                [selectedSection.meas_min_lon, selectedSection.meas_min_lat],
                [selectedSection.meas_max_lon, selectedSection.meas_max_lat],
              ])}>
              <ZoomIn size={14} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {selectedSection.section_name}
            </span>
          </div>

          <InfoPanelQualityStats
            label=""
            high={selectedSection.high_count}
            medium={selectedSection.medium_count}
            low={selectedSection.low_count}
            total={totalCount}
          />

          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
            {totalCount} vzorcev skupaj
          </div>

          <InfoPanelCoords
            minLat={selectedSection.min_lat}
            maxLat={selectedSection.max_lat}
            minLon={selectedSection.min_lon}
            maxLon={selectedSection.max_lon}
          />
        </div>
      )}
    </div>
  )
}
