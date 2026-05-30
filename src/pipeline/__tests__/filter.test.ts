import { describe, it, expect } from 'vitest';
import { filterAccelChannel, filterGyroChannel } from '../filter';
import fixtureRaw from './fixtures/d7c627f9_labeler.json';

const ATOL = 1e-5; // absolutna toleranca pod 0.00001

type Axis = 'x' | 'y' | 'z';
const fixture = fixtureRaw as any;
const ft = fixture.filter_test as {
  accel_input:    Record<Axis, number[]>;
  gyro_input:     Record<Axis, number[]>;
  accel_filtered: Record<Axis, number[]>;
  gyro_filtered:  Record<Axis, number[]>;
};

function checkChannel(actual: number[], expected: number[], label: string) {
  expect(actual).toHaveLength(expected.length);
  for (let i = 0; i < expected.length; i++) {
    if (Math.abs(actual[i] - expected[i]) > ATOL) {
      throw new Error(
        `${label}[${i}]: JS=${actual[i].toExponential(6)} ` +
        `Python=${expected[i].toExponential(6)} ` +
        `diff=${Math.abs(actual[i] - expected[i]).toExponential(3)}`
      );
    }
  }
}

describe('filterAccelChannel vs Labeler/filter.py', () => {
  it('x channel', () => checkChannel(filterAccelChannel(ft.accel_input.x), ft.accel_filtered.x, 'accel_x'));
  it('y channel', () => checkChannel(filterAccelChannel(ft.accel_input.y), ft.accel_filtered.y, 'accel_y'));
  it('z channel', () => checkChannel(filterAccelChannel(ft.accel_input.z), ft.accel_filtered.z, 'accel_z'));
});

describe('filterGyroChannel vs Labeler/filter.py', () => {
  it('x channel', () => checkChannel(filterGyroChannel(ft.gyro_input.x), ft.gyro_filtered.x, 'gyro_x'));
  it('y channel', () => checkChannel(filterGyroChannel(ft.gyro_input.y), ft.gyro_filtered.y, 'gyro_y'));
  it('z channel', () => checkChannel(filterGyroChannel(ft.gyro_input.z), ft.gyro_filtered.z, 'gyro_z'));
});
