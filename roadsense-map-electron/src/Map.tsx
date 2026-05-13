import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Coordinate = {
  lat: number
  lon: number
  quality: number
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [14.5058, 46.0569],
      zoom: 7
    })

    mapRef.current = map

    map.on('load', async () => {
      const data: Coordinate[] = await window.electronAPI.getCoordinates()

      const coords = data.map(p => [p.lon, p.lat])

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords
          }
        }
      })

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#ff0000',
          'line-width': 3
        }
      })
    })

    return () => map.remove()
  }, [])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}