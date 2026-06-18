import { parseCsv, parseCsvFromBuffer } from './pipeline/parse';
import { segment } from './pipeline/segment';
import { resampleSegment } from './pipeline/resample';
import { filterAccelSensor, filterGyroSensor } from './pipeline/filter';
import { buildFeatures } from './pipeline/features';
import { loadModel, classify } from './inference/classify';
import { snapToRoad } from './osrm/client';

export interface ResultRow {
  lat: number;
  lon: number;
  quality: number;
  snapped: boolean;
}

let modelLoaded = false;

async function ensureModel(modelPath?: string): Promise<void> {
  if (!modelLoaded) {
    await loadModel(modelPath);
    modelLoaded = true;
  }
}

async function processParsed(
  rows: ReturnType<typeof parseCsv>,
  modelPath?: string,
): Promise<ResultRow[]> {
  await ensureModel(modelPath);

  const segments = segment(rows);
  const gpsPoints: Array<{ lat: number; lon: number; timestamp: number; quality: number }> = [];

  for (const seg of segments) {
    if (seg.lat === null || seg.lon === null) continue;

    const [accel, gyro] = resampleSegment(seg.accel, seg.gyro, seg.startTs, 1000);
    const filteredAccel = filterAccelSensor(accel);
    const filteredGyro  = filterGyroSensor(gyro);

    const features = buildFeatures(filteredAccel, filteredGyro, seg.speedSamples);
    if (features === null) continue;

    const quality = await classify(features);

    gpsPoints.push({ lat: seg.lat, lon: seg.lon, timestamp: seg.startTs, quality });
  }

  if (gpsPoints.length === 0) return [];

  const snapped = await snapToRoad(gpsPoints);

  return snapped
    .filter(p => p.snapped)
    .map(p => ({ lat: p.lat, lon: p.lon, quality: p.quality, snapped: p.snapped }));
}

export async function processFile(csvPath: string, modelPath?: string): Promise<ResultRow[]> {
  return processParsed(parseCsv(csvPath), modelPath);
}

export async function processBuffer(csvBuffer: Buffer, modelPath?: string): Promise<ResultRow[]> {
  return processParsed(parseCsvFromBuffer(csvBuffer), modelPath);
}