const OSRM_BASE = 'https://router.project-osrm.org';
const CHUNK_SIZE = 9;
const OVERLAP = 2;
const RADIUS = 25;

export interface GpsPoint {
  lat: number;
  lon: number;
  timestamp: number;
  quality: number;
}

export interface SnappedPoint extends GpsPoint {
  snapped: boolean;
}

function dedup(points: GpsPoint[]): { unique: GpsPoint[]; indexMap: number[] } {
  const unique: GpsPoint[] = [];
  const indexMap: number[] = [];
  for (const p of points) {
    if (unique.length > 0 && unique[unique.length - 1].lat === p.lat && unique[unique.length - 1].lon === p.lon) {
      indexMap.push(unique.length - 1);
    } else {
      unique.push(p);
      indexMap.push(unique.length - 1);
    }
  }
  return { unique, indexMap };
}

function* chunks(points: GpsPoint[]): Generator<{ chunk: GpsPoint[]; skip: number }> {
  const n = points.length;
  if (n === 0) return;
  const stride = CHUNK_SIZE - OVERLAP;
  let i = 0;
  while (true) {
    const end = Math.min(i + CHUNK_SIZE, n);
    yield { chunk: points.slice(i, end), skip: i === 0 ? 0 : OVERLAP };
    if (end === n) return;
    i += stride;
  }
}

async function matchChunk(chunk: GpsPoint[]): Promise<SnappedPoint[]> {
  const coords = chunk.map(p => `${p.lon},${p.lat}`).join(';');
  const radiuses = chunk.map(() => RADIUS).join(';');

  const timestamps = chunk.map((p, i) => {
    let t = Math.floor(p.timestamp / 1000);
    if (i > 0) {
      const prev = Math.floor(chunk[i - 1].timestamp / 1000);
      if (t <= prev) t = prev + 1;
    }
    return t;
  });

  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    tidy: 'true',
    radiuses,
    timestamps: timestamps.join(';'),
  });

  const res = await fetch(`${OSRM_BASE}/match/v1/driving/${coords}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`OSRM ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.tracepoints) throw new Error(`OSRM match failed: ${data.code}`);

  return chunk.map((original, i) => {
    const tp = data.tracepoints[i];
    if (!tp) return { ...original, snapped: false };
    const [lon, lat] = tp.location;
    return { ...original, lat, lon, snapped: true };
  });
}

export async function snapToRoad(points: GpsPoint[]): Promise<SnappedPoint[]> {
  if (points.length < 2) return points.map(p => ({ ...p, snapped: false }));

  const { unique, indexMap } = dedup(points);

  const snappedUnique: SnappedPoint[] = [];
  for (const { chunk, skip } of chunks(unique)) {
    try {
      const result = await matchChunk(chunk);
      snappedUnique.push(...result.slice(skip));
    } catch {
      for (const p of chunk.slice(skip)) {
        snappedUnique.push({ ...p, snapped: false });
      }
    }
  }

  return indexMap.map(i => snappedUnique[i]);
}