import { useEffect, useState } from 'react'
import FileListItem from './FileListItem'
import InfoPanel from './InfoPanel'
import IconBar from './IconBar'
import ButtonBox from './ButtonBox'
import DropdownList from './DropdownList'
import Dropdown from './Dropdown'
import StatsBox from './StatsBox'

export default function Sidebar({ refreshKey, setRefreshKey, onSelect, onDelete, onVisibilityChange, onFitBounds }: {
  refreshKey: number
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>
  onSelect: (id: number | null) => void
  onDelete: () => void
  onVisibilityChange: (visibleIds: number[]) => void
  onFitBounds: (bounds: [[number, number], [number, number]]) => void
}) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [visible, setVisible] = useState<Set<number>>(new Set())
  const [infoFile, setInfoFile] = useState<FileEntry | null>(null)
  const [stats, setStats] = useState<FileStats | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)

  const toggleVisibility = (id: number) => {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    onVisibilityChange([...visible])
  }, [visible, onVisibilityChange])

  useEffect(() => {
    window.electronAPI.getFiles().then(setFiles)
    window.electronAPI.getGlobalStats().then(setGlobalStats)
  }, [refreshKey])

  useEffect(() => {
    if (infoFile) {
      window.electronAPI.getFileStats(infoFile.id).then(setStats)
    }
  }, [infoFile])

  return (
    <div style={{
      height: '100vh', 
      background: 'var(--bg2)',
      minWidth: "280px", 
      maxWidth: "480px", 
      flex: "1",
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <IconBar />
      <ButtonBox setRefreshKey={setRefreshKey} />
      <Dropdown label="Statistika" >
        <StatsBox stats={globalStats} />
      </Dropdown>
      <DropdownList label="Meritve" count={files.length}>
        {files.map(f => <FileListItem key={f.id} file={f} selected={selected === f.id} visible={visible.has(f.id)} 
        onSelect={() => { setSelected(f.id); onSelect(f.id) }}
        onDelete={async () => {
          await window.electronAPI.deleteFile(f.id)
          setFiles(prev => prev.filter(x => x.id !== f.id))
          if (selected === f.id) { setSelected(null); onSelect(null) }
          onDelete()
        }} 
        onToggleVisibility={() => toggleVisibility(f.id)}
        onInfo={() => { setStats(null); setInfoFile(f) }} />)}
      </DropdownList>

      {infoFile && (
        <InfoPanel
          file={infoFile}
          stats={stats}
          visible={visible.has(infoFile.id)}
          onClose={() => setInfoFile(null)}
          onToggleVisibility={() => toggleVisibility(infoFile.id)}
          onFitBounds={onFitBounds}
          onRename={async (id, name) => {
            await window.electronAPI.renameFile(id, name)
            setFiles(prev => prev.map(f => f.id === id ? { ...f, title: name } : f))
            setInfoFile((prev: any) => prev ? { ...prev, title: name } : null)
          }}
        />
      )} 
    </div>
  )
}