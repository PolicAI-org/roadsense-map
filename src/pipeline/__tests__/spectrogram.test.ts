import { describe, it, expect } from 'vitest';
import { computeSpectrogram } from '../spectrogram';
import fixtureRaw from './fixtures/d7c627f9_labeler.json';

const REL_TOL   = 0.02;
const ABS_FLOOR = 1e-10;

type Axis = 'x' | 'y' | 'z';
type SensorPrefix = 'accel' | 'gyro';
type ChannelName = `${SensorPrefix}_${Axis}`;

const fixture = fixtureRaw as any;
const st = fixture.spectrogram_test as {
  accel_input: Record<Axis, number[]>;
  gyro_input:  Record<Axis, number[]>;
  spectrogram: Record<ChannelName, number[][]>;
};

function checkSpectrogram(channel: ChannelName) {
  const [sensor, axis] = channel.split('_') as [SensorPrefix, Axis];
  const signal = new Float64Array(st[`${sensor}_input`][axis]);

  const { sxx, nFrames } = computeSpectrogram(signal);
  const pyFlat = st.spectrogram[channel].flat();

  expect(nFrames).toBe(18);
  expect(pyFlat.length / nFrames).toBe(17);

  for (let i = 0; i < pyFlat.length; i++) {
    const relErr = Math.abs(sxx[i] - pyFlat[i]) / Math.max(Math.abs(pyFlat[i]), ABS_FLOOR);
    if (relErr > REL_TOL) {
      throw new Error(
        `${channel} freq=${Math.floor(i / nFrames)} frame=${i % nFrames}: ` +
        `JS=${sxx[i].toExponential(4)} Python=${pyFlat[i].toExponential(4)} relErr=${relErr.toFixed(4)}`
      );
    }
  }
}

describe('computeSpectrogram vs Labeler/spektrogram.py', () => {
  it('accel x', () => checkSpectrogram('accel_x'));
  it('accel y', () => checkSpectrogram('accel_y'));
  it('accel z', () => checkSpectrogram('accel_z'));
  it('gyro x',  () => checkSpectrogram('gyro_x'));
  it('gyro y',  () => checkSpectrogram('gyro_y'));
  it('gyro z',  () => checkSpectrogram('gyro_z'));
});
