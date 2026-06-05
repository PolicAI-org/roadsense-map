import { useEffect, useRef, useCallback} from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Coordinate = {
  lat: number
  lon: number
  quality: number
  file_id: number
}

export default function Map({ refreshKey, visibleFileIds, boundsToFit}: {
  refreshKey: number
  visibleFileIds: number[]
  boundsToFit: [[number, number], [number, number]] | null
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (boundsToFit && mapRef.current) {
      mapRef.current.fitBounds(boundsToFit, { padding: 40 })
    }
  }, [boundsToFit])

  const reloadRoadData = useCallback(async () => {
    if (!mapRef.current) return

    const data: Coordinate[] =
      await window.electronAPI.getCoordinates()

    const segments: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: []
    }

    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i]
      const current_id = current.file_id

      let id_found = false
      for(let j = 0; j < visibleFileIds.length; j++) {
        if(visibleFileIds[j] == current.file_id) {
          id_found = true;
          break;
        }
      }
      if (id_found == false) continue;

      const next = data[i + 1]
      const next_id = next.file_id

      if (current_id != next_id) {
        continue;
      }

      segments.features.push({
        type: 'Feature',
        properties: {
          quality: current.quality
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [current.lon, current.lat],
            [next.lon, next.lat]
          ]
        }
      })
    }

    const source = mapRef.current.getSource('road') as GeoJSONSource

    if (source && 'setData' in source) {
      source.setData(segments)
    }
  }, [visibleFileIds])

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
      center: [14.5058, 46.0569],
      zoom: 7
    })

    mapRef.current = map

    map.on('load', async () => {
      map.addSource('road', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.addLayer({
        id: 'road-layer',
        type: 'line',
        source: 'road',
        paint: {
          'line-width': 4,
          'line-color': [
            'interpolate',
            ['linear'],
            ['get', 'quality'],
            1, '#00ff00',
            2, '#ffff00',
            3, '#ff0000'
          ]
        }
      })

      await reloadRoadData()
    })

    return () => map.remove()
  }, [])

  useEffect(() => {
    reloadRoadData()
  }, [refreshKey, reloadRoadData])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%', flex: "3" }}
    />
  )
}