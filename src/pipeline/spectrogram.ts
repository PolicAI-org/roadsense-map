import type { Vec3TimeSeries } from './resample';


const NPERSEG   = 32;
const NOVERLAP  = 28;
const HOP       = NPERSEG - NOVERLAP;  // 4
const FS        = 100;
const FREQ_BINS = NPERSEG / 2 + 1;     // 17

const HANN_32 = new Float64Array([
  0.0, 0.009607359798384785, 0.03806023374435663, 0.08426519384872733,
  0.14644660940672627, 0.22221488349019902, 0.30865828381745514, 0.4024548389919359,
  0.5, 0.5975451610080642, 0.6913417161825449, 0.7777851165098011,
  0.8535533905932737, 0.9157348061512727, 0.9619397662556434, 0.9903926402016152,
  1.0, 0.9903926402016152, 0.9619397662556434, 0.9157348061512727,
  0.8535533905932737, 0.7777851165098011, 0.6913417161825451, 0.5975451610080642,
  0.5, 0.4024548389919358, 0.30865828381745497, 0.22221488349019902,
  0.14644660940672627, 0.08426519384872733, 0.03806023374435674, 0.009607359798384785,
]);

const SCALE = FS * HANN_32.reduce((s, v) => s + v * v, 0);

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;

  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1.0, curIm = 0.0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k]           = uRe + vRe;
        im[i + k]           = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

export function computeSpectrogram(signal: Float64Array): { sxx: Float64Array; nFrames: number } {
  const n = signal.length;
  const nFrames = Math.floor((n - NPERSEG) / HOP) + 1;

  const sxx = new Float64Array(FREQ_BINS * nFrames);
  const re  = new Float64Array(NPERSEG);
  const im  = new Float64Array(NPERSEG);

  for (let frame = 0; frame < nFrames; frame++) {
    const start = frame * HOP;

    let frameMean = 0;
    for (let i = 0; i < NPERSEG; i++) frameMean += signal[start + i];
    frameMean /= NPERSEG;

    for (let i = 0; i < NPERSEG; i++) {
      re[i] = (signal[start + i] - frameMean) * HANN_32[i];
      im[i] = 0;
    }

    fft(re, im);

    for (let k = 0; k < FREQ_BINS; k++) {
      let power = (re[k] * re[k] + im[k] * im[k]) / SCALE;
      if (k > 0 && k < FREQ_BINS - 1) power *= 2;
      sxx[k * nFrames + frame] = power;
    }
  }

  return { sxx, nFrames };
}


export function computeSegmentSpectrogram(
  accel: Vec3TimeSeries,
  gyro:  Vec3TimeSeries,
): { data: Float64Array; freqBins: number; nFrames: number } {
  const channels = [
    new Float64Array(accel.x),
    new Float64Array(accel.y),
    new Float64Array(accel.z),
    new Float64Array(gyro.x),
    new Float64Array(gyro.y),
    new Float64Array(gyro.z),
  ];

  const results  = channels.map(ch => computeSpectrogram(ch));
  const nFrames  = results[0].nFrames;
  const data     = new Float64Array(6 * FREQ_BINS * nFrames);

  for (let c = 0; c < 6; c++) {
    data.set(results[c].sxx, c * FREQ_BINS * nFrames);
  }

  return { data, freqBins: FREQ_BINS, nFrames };
}