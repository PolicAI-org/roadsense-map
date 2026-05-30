import sys
import os
import pandas as pd
import numpy as np
from scipy.signal import butter, filtfilt
from scipy.interpolate import interp1d
from scipy.signal import spectrogram
import torch
import uuid
from random import randint
from math import isnan
from model import CNN
from osrm_client import OSRMClient

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


def label(sensor_file, model, half_w=1500):
    df_sensors = pd.read_csv(sensor_file, low_memory=False)
    for col in ['x', 'y', 'z']:
        df_sensors[col] = pd.to_numeric(df_sensors[col], errors='coerce')

    ts_min = df_sensors['unix_ts_ms'].min()
    ts_max = df_sensors['unix_ts_ms'].max()

    coords = []

    chunk_start = ts_min
    while chunk_start + half_w <= ts_max:
        chunk_end = chunk_start + half_w

        mask = (df_sensors['unix_ts_ms'] >= chunk_start) & (df_sensors['unix_ts_ms'] < chunk_end)
        segment = df_sensors.loc[mask]

        if not segment.empty:
            accel = segment[segment['sensor'] == 'accel'][['x', 'y', 'z']].values
            gyro = segment[segment['sensor'] == 'gyro'][['x', 'y', 'z']].values

            gps = (
                segment.dropna(subset=['lat', 'lon', 'gps_accuracy'])
                       .drop_duplicates(subset=['lat', 'lon'])
                       .sort_values('unix_ts_ms')
            )
            lat = gps['lat'].values
            lon = gps['lon'].values
            accuracies = gps['gps_accuracy'].values
            timestamps = gps['unix_ts_ms'].values

            if len(accel) < 13 or len(gyro) < 13:
                chunk_start = chunk_end
                continue

            x_old = np.linspace(0, 1, len(accel))
            x_new = np.linspace(0, 1, len(gyro))
            accel_up  = interp1d(x_old, accel, axis=0, kind='linear')(x_new)

            accel_clean = butter_filter(accel_up, 0.5,TARGET_FS, btype='high')
            accel_clean = butter_filter(accel_clean, 40, TARGET_FS, btype='low')
            gyro_clean = butter_filter(gyro, 40, TARGET_FS, btype='low')

            try:
                freqs, times, accel_s = compute_spectrogram(accel_clean)
                _, _, gyro_s  = compute_spectrogram(gyro_clean)
            except ValueError:
                chunk_start = chunk_end
                continue

            combined = np.concatenate([accel_s, gyro_s], axis=1)

            chunk = {
                'data': combined,
                'freqs': freqs,
                'times': times,
                'timestamp': chunk_start,
                'window_size_ms': half_w,
            }

            result = classify(chunk, model)

            for i in range(len(lat)):
                coord = {
                    'lat': lat[i],
                    'lon': lon[i],
                    'quality': result,
                    'timestamp': int(timestamps[i]),
                }

                coords.append(coord)


        chunk_start = chunk_end

    #print(len(coords))

    return coords
    
def classify(preprocessed, model) -> dict:

    data = torch.tensor(preprocessed['data'], dtype=torch.float32).unsqueeze(0)
    data = data.view(-1, data.shape[2], data.shape[3], data.shape[4])

    with torch.no_grad():
        output = model(data)
        #print(output.shape)
        predicted_class = output.argmax().item()+1

    return predicted_class

def process_output(coords: list) -> str:
    result = ""

    for coord in coords:
        if not coord.get('snapped', False):
            continue
        result += str(coord['lat']) + "," + str(coord['lon']) + "," + str(coord['quality']) + "\n"

    return result



if __name__ == '__main__':
    file_path = sys.argv[1]
    model = CNN()
    model.load_state_dict(torch.load(CLASSIFIER_PATH, map_location='cpu'))
    model.eval()
    osrm = OSRMClient()
    coords = label(file_path, model)
    print(coords)
    coords = osrm.snap(coords)
    result = process_output(coords)
    print(result)