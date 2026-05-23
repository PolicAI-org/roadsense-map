import sys
import os
import pandas as pd
import numpy as np
from scipy.signal import butter, filtfilt
from scipy.interpolate import interp1d
from scipy.signal import spectrogram
import torch
import uuid

SEGMENT_INTERVAL = 1
"""
Dolžina enega segmenta za vnos v nevronsko mrežo v sekundah.
"""
TARGET_FS = 100

# --- NASTAVITVE ZA 1-SEKUNDNE SEGMENTE ---
FS = 100          # 100 vzorcev na sekundo
SEGMENT_LEN = 100 # Dolžina segmenta v vzorcih (1 sekunda)

# Nastavitve spektrograma znotraj 1-sekundnega okna
NPERSEG = 32      # Dolžina oken znotraj sekunde
NOVERLAP = 24     # Prekrivanje znotraj sekunde (75% prekrivanje)

CLASSIFIER_PATH = "best_model.pt"


FS_GYRO = 100
FS_ACCEL = 25
TARGET_FS = 100

def butter_filter(data, cutoff, fs, btype='low', order=4):
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype=btype, analog=False)
    return filtfilt(b, a, data, axis=0)


def compute_spectrogram(signal):
    num_samples  = signal.shape[0]
    num_channels = signal.shape[1]
    num_segments = num_samples // SEGMENT_LEN

    if num_segments == 0:
        raise ValueError(
            f"Signal je prekratek ({num_samples} vzorcev) za 1-sekundni segment ({SEGMENT_LEN} vzorcev)."
        )

    all_segments_data = []
    freqs, times = np.array([]), np.array([])

    for seg_idx in range(num_segments):
        start_idx = seg_idx * SEGMENT_LEN
        end_idx   = start_idx + SEGMENT_LEN
        segment_channels = []

        for ch in range(num_channels):
            sig_crop = signal[start_idx:end_idx, ch]
            f, t, Sxx = spectrogram(sig_crop, fs=FS, nperseg=NPERSEG, noverlap=NOVERLAP)
            if len(freqs) == 0:
                freqs, times = f, t
            segment_channels.append(Sxx)

        all_segments_data.append(np.stack(segment_channels, axis=0))

    return freqs, times, np.stack(all_segments_data, axis=0)


def label(sensor_file, output_root, half_w=3000):
    df_sensors = pd.read_csv(sensor_file, low_memory=False)
    for col in ['x', 'y', 'z']:
        df_sensors[col] = pd.to_numeric(df_sensors[col], errors='coerce')

    ts_min = df_sensors['unix_ts_ms'].min()
    ts_max = df_sensors['unix_ts_ms'].max()

    label_dir = os.path.join(output_root, "unlabeled")
    os.makedirs(label_dir, exist_ok=True)

    print("Splitting, filtering, and computing spectrograms...")
    chunk_start = ts_min
    while chunk_start + half_w <= ts_max:
        chunk_end = chunk_start + half_w

        mask    = (df_sensors['unix_ts_ms'] >= chunk_start) & (df_sensors['unix_ts_ms'] < chunk_end)
        segment = df_sensors.loc[mask].copy()

        if not segment.empty:
            accel = segment[segment['sensor'] == 'accel'][['x', 'y', 'z']].values
            gyro  = segment[segment['sensor'] == 'gyro'][['x', 'y', 'z']].values

            if len(accel) < 13 or len(gyro) < 13:
                chunk_start = chunk_end
                continue

            # Upsample accel to TARGET_FS
            x_old     = np.linspace(0, 1, len(accel))
            x_new     = np.linspace(0, 1, len(gyro))
            accel_up  = interp1d(x_old, accel, axis=0, kind='linear')(x_new)

            # Filter
            accel_clean = butter_filter(accel_up,    0.5, TARGET_FS, btype='high')
            accel_clean = butter_filter(accel_clean, 40,  TARGET_FS, btype='low')
            gyro_clean  = butter_filter(gyro,        40,  TARGET_FS, btype='low')

            # Spectrogram
            try:
                freqs, times, accel_s = compute_spectrogram(accel_clean)
                _,     _,     gyro_s  = compute_spectrogram(gyro_clean)
            except ValueError as e:
                print(f"  Preskočeno chunk@{chunk_start}: {e}")
                chunk_start = chunk_end
                continue

            combined = np.concatenate([accel_s, gyro_s], axis=1)

            filename  = str(uuid.uuid4()) + "_spec.npz"
            save_path = os.path.join(label_dir, filename)
            np.savez_compressed(save_path,
                                data=combined,
                                freqs=freqs,
                                times=times,
                                timestamp=chunk_start,
                                window_size_ms=half_w)
            print(f"  Shranjeno: {save_path} (oblika: {combined.shape})")

        chunk_start = chunk_end
    
def classify(preprocessed) -> dict:
    model = torch.load(CLASSIFIER_PATH, map_location='cpu')
    #model.eval()
    #print(model)
    return 'a'

def process_file(file_path: str) -> dict:
    content = pd.read_csv(file_path, low_memory=False)

    preprocessed = preprocess(content)

    classified = classify(preprocessed)

    return classified

if __name__ == '__main__':
    file_path = sys.argv[1]
    #result = process_file(file_path)
    label(file_path, 'out')
    #print(result)