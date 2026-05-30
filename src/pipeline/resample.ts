import type { RawRow } from './parse';

export interface Vec3TimeSeries {
  ts: number[];   // timestamps (ms)
  x: number[];
  y: number[];
  z: number[];
}

const TARGET_HZ  = 100;
const TARGET_MS  = 1000 / TARGET_HZ;  // 10ms per sample


export function resampleToGrid(
  rows: RawRow[],
  startTs: number,
  nSamples: number,
): Vec3TimeSeries {
  // sort by timestamp just in case
  const sorted = [...rows].sort((a, b) => a.unix_ts_ms - b.unix_ts_ms);

  const srcTs = sorted.map(r => r.unix_ts_ms);
  const srcX  = sorted.map(r => r.x);
  const srcY  = sorted.map(r => r.y);
  const srcZ  = sorted.map(r => r.z);

  const ts: number[] = [];
  const x:  number[] = [];
  const y:  number[] = [];
  const z:  number[] = [];

  for (let i = 0; i < nSamples; i++) {
    const t = startTs + i * TARGET_MS;
    ts.push(t);

    // find surrounding source samples
    let lo = 0;
    let hi = srcTs.length - 1;

    // clamp to edges
    if (t <= srcTs[0]) {
      x.push(srcX[0]); y.push(srcY[0]); z.push(srcZ[0]);
      continue;
    }
    if (t >= srcTs[hi]) {
      x.push(srcX[hi]); y.push(srcY[hi]); z.push(srcZ[hi]);
      continue;
    }

    // binary search for bracket
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (srcTs[mid] <= t) lo = mid; else hi = mid;
    }

    const alpha = (t - srcTs[lo]) / (srcTs[hi] - srcTs[lo]);
    x.push(srcX[lo] + alpha * (srcX[hi] - srcX[lo]));
    y.push(srcY[lo] + alpha * (srcY[hi] - srcY[lo]));
    z.push(srcZ[lo] + alpha * (srcZ[hi] - srcZ[lo]));
  }

  return { ts, x, y, z };
}


export function resampleSegment(
  accelRows: RawRow[],
  gyroRows:  RawRow[],
  startTs:   number,
  windowMs:  number = 1500,
): [Vec3TimeSeries, Vec3TimeSeries] {
  const nSamples = Math.round(windowMs / TARGET_MS);  // 150 at 100Hz
  return [
    resampleToGrid(accelRows, startTs, nSamples),
    resampleToGrid(gyroRows,  startTs, nSamples),
  ];
}