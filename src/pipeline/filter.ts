import type { Vec3TimeSeries } from './resample';

// order=4, high-pass 0.5Hz @ 100Hz fs  (butter(4, 0.5/50, 'high'))
const HP_B = [0.9597822300872386, -3.8391289203489545,  5.7586933805234315, -3.8391289203489545, 0.9597822300872386];
const HP_A = [1.0,                -3.9179078653919865,   5.7570763791180655, -3.7603495076945257, 0.921181929191236];

// order=4, low-pass 40Hz @ 100Hz fs  (butter(4, 40/50, 'low'))
const LP_B = [0.43284664499029185, 1.7313865799611674, 2.597079869941751, 1.7313865799611674, 0.43284664499029185];
const LP_A = [1.0,                  2.369513007182037,  2.313988414415879, 1.0546654058785672, 0.18737949236818482];


function gaussianElim(M: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const aug = M.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = new Array<number>(n);
  for (let row = n - 1; row >= 0; row--) {
    x[row] = aug[row][n] / aug[row][row];
    for (let col = row + 1; col < n; col++) x[row] -= (aug[row][col] / aug[row][row]) * x[col];
  }
  return x;
}

// Steady-state initial conditions for lfilter — matches scipy.signal.lfilter_zi
function lfilterZi(b: number[], a: number[]): number[] {
  const n = Math.max(b.length, a.length);
  const B = Array.from({ length: n }, (_, i) => (b[i] ?? 0) / a[0]);
  const A = Array.from({ length: n }, (_, i) => (a[i] ?? 0) / a[0]);
  const m = n - 1;

  const zin: number[][] = Array.from({ length: m }, (_, i) => {
    const row = new Array<number>(m).fill(0);
    row[i] = 1;
    row[0] -= -A[i + 1];
    if (i < m - 1) row[i + 1] -= 1;
    return row;
  });

  const zid = Array.from({ length: m }, (_, i) => B[i + 1] - A[i + 1] * B[0]);
  return gaussianElim(zin, zid);
}

// Transposed direct form II — supports optional initial state zi (length = filter order)
function lfilter(b: number[], a: number[], signal: number[], zi?: number[]): number[] {
  const n  = signal.length;
  const m  = Math.max(b.length, a.length) - 1;
  const a0 = a[0];
  const z  = zi ? [...zi] : new Array<number>(m).fill(0);
  const out = new Array<number>(n);

  for (let i = 0; i < n; i++) {
    const x = signal[i];
    out[i] = (b[0] / a0) * x + z[0];
    for (let j = 0; j < m - 1; j++) {
      z[j] = ((b[j + 1] ?? 0) / a0) * x - ((a[j + 1] ?? 0) / a0) * out[i] + z[j + 1];
    }
    z[m - 1] = ((b[m] ?? 0) / a0) * x - ((a[m] ?? 0) / a0) * out[i];
  }
  return out;
}

// Zero-phase forward-backward filter — matches scipy.signal.filtfilt (padtype='odd')
function filtfilt(b: number[], a: number[], signal: number[]): number[] {
  const padLen = 3 * Math.max(b.length, a.length);

  if (signal.length <= padLen) {
    return lfilter(b, a, signal);
  }

  const zi = lfilterZi(b, a);

  const padded: number[] = [];
  for (let i = padLen; i > 0; i--) padded.push(2 * signal[0] - signal[i]);
  padded.push(...signal);
  for (let i = 1; i <= padLen; i++) padded.push(2 * signal[signal.length - 1] - signal[signal.length - 1 - i]);

  const forward  = lfilter(b, a, padded, zi.map(v => v * padded[0]));
  const backward = lfilter(b, a, [...forward].reverse(), zi.map(v => v * forward[forward.length - 1]));
  return [...backward].reverse().slice(padLen, padLen + signal.length);
}

// Accel: HP 0.5Hz + LP 40Hz  (matches filter.py butter_filter chain)
export function filterAccelChannel(signal: number[]): number[] {
  return filtfilt(LP_B, LP_A, filtfilt(HP_B, HP_A, signal));
}

// Gyro: LP 40Hz only  (filter.py applies LP only to gyro)
export function filterGyroChannel(signal: number[]): number[] {
  return filtfilt(LP_B, LP_A, signal);
}

function applySensor(fn: (s: number[]) => number[], ts: Vec3TimeSeries): Vec3TimeSeries {
  return { ts: ts.ts, x: fn(ts.x), y: fn(ts.y), z: fn(ts.z) };
}

export function filterAccelSensor(ts: Vec3TimeSeries): Vec3TimeSeries {
  return applySensor(filterAccelChannel, ts);
}

export function filterGyroSensor(ts: Vec3TimeSeries): Vec3TimeSeries {
  return applySensor(filterGyroChannel, ts);
}
