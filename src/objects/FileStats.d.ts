interface FileStats {
  total: { count: number }
  high: { count: number }
  medium: { count: number }
  low: { count: number }
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
}