import { useState } from 'react';
import DataPanel from './components/DataPanel';
import Map from './Map';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <DataPanel setRefreshKey={setRefreshKey} />
      <Map refreshKey={refreshKey}/>
    </div>
  );
}
