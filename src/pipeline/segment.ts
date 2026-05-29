import type { RawRow } from './parse';

export interface Segment {
  startTs: number;
  endTs: number;
  accel: RawRow[];   // raw accel rows in this window
  gyro: RawRow[];    // raw gyro rows in this window
  lat: number | null;
  lon: number | null;
  speedSamples: number[];  // non-stale speed_ms values for feature extraction
}

const WINDOW_MS = 1500;

export function segment(rows: RawRow[]): Segment[] {
  if (rows.length === 0) return [];

  const startTs = rows[0].unix_ts_ms;
  const endTs   = rows[rows.length - 1].unix_ts_ms;

  const segments: Segment[] = [];

  for (let windowStart = startTs; windowStart + WINDOW_MS <= endTs; windowStart += WINDOW_MS) {
    const windowEnd = windowStart + WINDOW_MS;

    const windowRows = rows.filter(
      r => r.unix_ts_ms >= windowStart && r.unix_ts_ms < windowEnd
    );

    const accel = windowRows.filter(r => r.sensor === 'accel');
    const gyro  = windowRows.filter(r => r.sensor === 'gyro');

    // need both sensors to have data
    if (accel.length === 0 || gyro.length === 0) continue;

    // representative GPS: median of non-stale fixes in this window
    const gpsRows = windowRows.filter(r => r.is_stale === false && r.lat != null && r.lon != null);
    let lat: number | null = null;
    let lon: number | null = null;

    if (gpsRows.length > 0) {
      const lats = gpsRows.map(r => r.lat as number).sort((a, b) => a - b);
      const lons = gpsRows.map(r => r.lon as number).sort((a, b) => a - b);
      const mid  = Math.floor(lats.length / 2);
      lat = lats[mid];
      lon = lons[mid];
    }

    // speed samples: non-stale, non-null speed_ms values
    const speedSamples = windowRows
      .filter(r => r.is_stale === false && r.speed_ms != null)
      .map(r => r.speed_ms as number);

    segments.push({ startTs: windowStart, endTs: windowEnd, accel, gyro, lat, lon, speedSamples });
  }

  return segments;
}