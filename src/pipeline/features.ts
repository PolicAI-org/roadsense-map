import { computeSegmentSpectrogram } from './spectrogram';
import { SPEED_MEAN, SPEED_STD } from '../inference/speedNormConstants';
import type { Vec3TimeSeries } from './resample';

const FREQ_BINS = 17;
const N_FRAMES  = 18;
const N_CHANNELS = 6;

export interface SegmentFeatures {
  /** Float32Array of shape (6, 17, 18) = 1836 elements, normalized */
  spectrogram: Float32Array;
  /** Float32Array of shape (7,), z-scored with training constants */
  speed: Float32Array;
}

export function buildSpectrogramTensor(
  accel: Vec3TimeSeries,
  gyro:  Vec3TimeSeries,
): Float32Array {
  const { data } = computeSegmentSpectrogram(accel, gyro);
  // data layout: (6, 17, 18) channel-major

  const frameSize = FREQ_BINS * N_FRAMES;  // 306
  const out = new Float32Array(N_CHANNELS * frameSize);

  for (let c = 0; c < N_CHANNELS; c++) {
    const offset = c * frameSize;

    // 1. log1p
    let mean = 0;
    for (let i = 0; i < frameSize; i++) {
      out[offset + i] = Math.log1p(data[offset + i]);
      mean += out[offset + i];
    }

    // 2. per-channel normalize
    mean /= frameSize;
    let variance = 0;
    for (let i = 0; i < frameSize; i++) {
      const d = out[offset + i] - mean;
      variance += d * d;
    }
    const std = Math.sqrt(variance / frameSize);
    const invStd = 1 / (std + 1e-8);

    for (let i = 0; i < frameSize; i++) {
      out[offset + i] = (out[offset + i] - mean) * invStd;
    }
  }

  return out;
}


export function buildSpeedTensor(speedSamples: number[]): Float32Array | null {
  const valid = speedSamples.filter(v => isFinite(v));
  if (valid.length === 0) return null;

  const sorted = [...valid].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = valid.reduce((a, b) => a + b, 0) / n;
  const std  = Math.sqrt(valid.reduce((a, b) => a + (b - mean) ** 2, 0) / n);

  function percentile(p: number): number {
    const idx = (p / 100) * (n - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  const raw = [
    mean,
    std,
    sorted[0],        // min
    sorted[n - 1],    // max
    percentile(25),
    percentile(50),
    percentile(75),
  ];

  const out = new Float32Array(7);
  for (let i = 0; i < 7; i++) {
    out[i] = (raw[i] - SPEED_MEAN[i]) / (SPEED_STD[i] + 1e-8);
  }

  return out;
}

export function buildFeatures(
  accel:        Vec3TimeSeries,
  gyro:         Vec3TimeSeries,
  speedSamples: number[],
): SegmentFeatures | null {
  const speed = buildSpeedTensor(speedSamples);
  if (speed === null) return null;

  const spectrogram = buildSpectrogramTensor(accel, gyro);
  return { spectrogram, speed };
}