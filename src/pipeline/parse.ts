import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

export type SensorType = 'accel' | 'gyro';

export interface RawRow {
  unix_ts_ms: number;
  rel_ts_ms: number;
  packet_counter: number;
  sensor: SensorType;
  x: number;
  y: number;
  z: number;
  lat: number | null;
  lon: number | null;
  speed_ms: number | null;
  gps_accuracy: number | null;
  is_stale: boolean | null;
}

interface RawCsvRow {
  unix_ts_ms: string;
  rel_ts_ms: string;
  packet_counter: string;
  sensor: string;
  x: string;
  y: string;
  z: string;
  lat: string;
  lon: string;
  speed_ms: string;
  gps_accuracy: string;
  is_stale: string;
}

function parseIsStale(val: string): boolean | null {
  if (val === 'True' || val === 'true') return true;
  if (val === 'False' || val === 'false') return false;
  return null;
}

function parseNullableFloat(val: string): number | null {
  if (val === '' || val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export function parseCsv(path: string): RawRow[] {
  const content = fs.readFileSync(path, 'utf-8');

  const records: RawCsvRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const rows: RawRow[] = [];

  for (const r of records) {
    // drop mag — not used by the model
    if (r.sensor !== 'accel' && r.sensor !== 'gyro') continue;

    rows.push({
      unix_ts_ms:     Number(r.unix_ts_ms),
      rel_ts_ms:      Number(r.rel_ts_ms),
      packet_counter: Number(r.packet_counter),
      sensor:         r.sensor as SensorType,
      x:              Number(r.x),
      y:              Number(r.y),
      z:              Number(r.z),
      lat:            parseNullableFloat(r.lat),
      lon:            parseNullableFloat(r.lon),
      speed_ms:       parseNullableFloat(r.speed_ms),
      gps_accuracy:   parseNullableFloat(r.gps_accuracy),
      is_stale:       parseIsStale(r.is_stale),
    });
  }

  return rows;
}

export function parseCsvFromBuffer(buffer: Buffer): RawRow[] {
  const content = buffer.toString('utf-8');

  const records: RawCsvRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const rows: RawRow[] = [];

  for (const r of records) {
    if (r.sensor !== 'accel' && r.sensor !== 'gyro') continue;

    rows.push({
      unix_ts_ms:     Number(r.unix_ts_ms),
      rel_ts_ms:      Number(r.rel_ts_ms),
      packet_counter: Number(r.packet_counter),
      sensor:         r.sensor as SensorType,
      x:              Number(r.x),
      y:              Number(r.y),
      z:              Number(r.z),
      lat:            parseNullableFloat(r.lat),
      lon:            parseNullableFloat(r.lon),
      speed_ms:       parseNullableFloat(r.speed_ms),
      gps_accuracy:   parseNullableFloat(r.gps_accuracy),
      is_stale:       parseIsStale(r.is_stale),
    });
  }

  return rows;
}