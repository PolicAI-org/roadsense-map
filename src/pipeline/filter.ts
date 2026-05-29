import type { Vec3TimeSeries } from './resample';

// order=4, high-pass 0.5Hz @ 100Hz fs  (butter(4, 0.5/50, 'high'))
const HP_B = [0.9597822300872386, -3.8391289203489545,  5.7586933805234315, -3.8391289203489545, 0.9597822300872386];
const HP_A = [1.0,                -3.9179078653919865,   5.7570763791180655, -3.7603495076945257, 0.921181929191236];

// order=4, low-pass 40Hz @ 100Hz fs  (butter(4, 40/50, 'low'))
const LP_B = [0.43284664499029185, 1.7313865799611674, 2.597079869941751, 1.7313865799611674, 0.43284664499029185];
const LP_A = [1.0,                  2.369513007182037,  2.313988414415879, 1.0546654058785672, 0.18737949236818482];


function lfilter(b: number[], a: number[], signal: number[]): number[] {
  const n  = signal.length;
  const nb = b.length;
  const na = a.length;
  const out = new Array<number>(n).fill(0);
  const a0 = a[0];

  for (let i = 0; i < n; i++) {
    let y = (b[0] / a0) * signal[i];
    const maxJ = Math.max(nb, na) - 1;
    for (let j = 1; j <= maxJ; j++) {
      if (i - j >= 0) {
        if (j < nb) y += (b[j] / a0) * signal[i - j];
        if (j < na) y -= (a[j] / a0) * out[i - j];
      }
    }
    out[i] = y;
  }
  return out;
}

// Zero-phase forward-backward filter matching scipy.signal.filtfilt
function filtfilt(b: number[], a: number[], signal: number[]): number[] {
  const padLen = 3 * (Math.max(b.length, a.length) - 1);

  if (signal.length <= padLen) {
    return lfilter(b, a, signal);
  }

  // Odd-reflection padding (matches scipy default padtype='odd')
  const padded: number[] = [];
  for (let i = padLen; i > 0; i--) padded.push(2 * signal[0] - signal[i]);
  padded.push(...signal);
  for (let i = 1; i <= padLen; i++) padded.push(2 * signal[signal.length - 1] - signal[signal.length - 1 - i]);

  const forward  = lfilter(b, a, padded);
  const backward = lfilter(b, a, [...forward].reverse());
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