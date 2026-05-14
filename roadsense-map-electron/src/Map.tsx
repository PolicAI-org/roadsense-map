import { useEffect, useRef } from 'react'
import type { FeatureCollection, LineString, Point } from 'geojson'
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

      const segments: FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: []
      }

      for (let i = 0; i < data.length - 1; i++) {
        const current = data[i]
        const next = data[i + 1]

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

      map.addSource('road', {
        type: 'geojson',
        data: segments
      })

      /*
      const heatmap_data: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: data.map(p => ({
          type: 'Feature',
          properties: {
            quality: p.quality
          },
          geometry: {
            type: 'Point',
            coordinates: [p.lon, p.lat]
          }
        }))
      }
        */

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

      /*
      map.addSource('heat-points', {
        type: 'geojson',
        data: heatmap_data
      })

      map.addLayer({
        id: 'route-heat',
        type: 'heatmap',
        source: 'heat-points',
        paint: {
          // Use your quality column
          'heatmap-weight': [
            'get',
            'quality'
          ],

          'heatmap-intensity': 0.3,

          'heatmap-radius': 5,

          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,255,0)',
            0.3, 'blue',
            0.6, 'yellow',
            1.0, 'red'
          ]
        }
      })*/
    })

    return () => map.remove()
  }, [])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}