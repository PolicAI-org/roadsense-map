import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Coordinate = [number, number];

type TableRow = {
    lat: number
    lon: number
}

async function loadCSV(path: string) {
  const response = await fetch(path);
  const text = await response.text();

  console.log(text);

  return text;
}

function parseCSV(text: string): TableRow[] {
  const rows = text.trim().split('\n').slice(1);

  const result: TableRow[] = [];

  for (let i = 0; i < rows.length; i += 100) {
    const row = rows[i];

    const [lat, lon] = row.split(',');

    if (!lat || !lon) continue;
    if (lat === 'null' || lon === 'null') continue;

    result.push({
      lat: Number(lat),
      lon: Number(lon)
    });
  }

  return result;
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [14.5058, 46.0569],
      zoom: 7
    });

    loadCSV('/2026-04-19T13-02-14-380182.csv')
      .then(text => {
        const data = parseCSV(text);

        data.forEach(loc => {
          new maplibregl.Marker()
            .setLngLat([loc.lon, loc.lat])
            .addTo(map);
        });
      });

    const markers: Coordinate[] = [];

    map.on('click', (e) => {
      const coord: Coordinate = [e.lngLat.lng, e.lngLat.lat];

      markers.push(coord);

      localStorage.setItem('markers', JSON.stringify(markers));

      new maplibregl.Marker()
        .setLngLat(coord)
        .addTo(map);
    });

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%' }}
    />
  );
}