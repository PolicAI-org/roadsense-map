import * as ort from 'onnxruntime-node';
import * as path from 'path';
import type { SegmentFeatures } from '../pipeline/features';

export type Quality = 1 | 2 | 3;

let session: ort.InferenceSession | null = null;

export async function loadModel(modelPath?: string): Promise<void> {
  const resolved = modelPath ?? path.join(process.cwd(), 'best_model_speed.onnx');
  session = await ort.InferenceSession.create(resolved, {
    executionProviders: ['cpu'],
  });
}


export async function classify(features: SegmentFeatures): Promise<Quality> {
  if (!session) throw new Error('Model not loaded — call loadModel() first');

  // input tensor: (1, 6, 17, 18)
  const inputTensor = new ort.Tensor('float32', features.spectrogram, [1, 6, 17, 18]);

  // speed tensor: (1, 7)
  const speedTensor = new ort.Tensor('float32', features.speed, [1, 7]);

  const results = await session.run({ input: inputTensor, speed: speedTensor });

  const logits = results['output'].data as Float32Array;

  // argmax over 3 classes → quality 1/2/3
  let maxIdx = 0;
  for (let i = 1; i < 3; i++) {
    if (logits[i] > logits[maxIdx]) maxIdx = i;
  }

  return (maxIdx + 1) as Quality;
}