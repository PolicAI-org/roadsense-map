import { useState } from 'react';
import Map from './Map';
import Sidebar from './components/Sidebar';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [, setSelectedFileId] = useState<number | null>(null)
  type Bounds = [[number, number], [number, number]]
  const [boundsToFit, setBoundsToFit] = useState<Bounds | null>(null)

  const [visibleFileIds, setVisibleFileIds] = useState<number[]>([])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
       <Sidebar 
          refreshKey={refreshKey} 
          onSelect={(id) => setSelectedFileId(id)} 
          onDelete={() => setRefreshKey(prev => prev + 1)} 
          onVisibilityChange={setVisibleFileIds} 
          onFitBounds={setBoundsToFit} />
      <Map refreshKey={refreshKey} visibleFileIds={[]} boundsToFit={null}/>
    </div>
  );
}
