import { useEffect, useRef } from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Coordinate = {
  lat: number
  lon: number
  quality: number
}

type Props = {
  refreshKey: number
}

/*function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000

  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}*/

export default function Map({ refreshKey }: Props) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  const reloadRoadData = async () => {
    if (!mapRef.current) return

    const data: Coordinate[] =
      await window.electronAPI.getCoordinates()

    const segments: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: []
    }

    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i]
      const next = data[i + 1]

      //if (distanceInMeters(current.lat, current.lon, next.lat, next.lon) > 50) continue

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
  }

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
        data: {
          type: 'FeatureCollection',
          features: []
        }
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
  }, [refreshKey])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%' }}
    />
  )
}