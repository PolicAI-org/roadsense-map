import sys
from random import randint
import pandas as pd
import numpy as np
from scipy.signal import butter, filtfilt
from scipy.interpolate import interp1d
from scipy.signal import spectrogram


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


def butter_filter(data, cutoff, fs, btype='low', order=4):
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype=btype, analog=False)
    return filtfilt(b, a, data, axis=0)

def compute_spectrogram(signal):
    """
    Razreže signal na 1-sekundne segmente in za vsakega izračuna spektrogram.
    Vrne dimenzije: (segmenti, kanali, frekvence, čas)
    """
    num_samples = signal.shape[0]
    num_channels = signal.shape[1]
    
    num_segments = num_samples // SEGMENT_LEN
    
    if num_segments == 0:
        raise ValueError("Signal je prekratek ({num_samples} vzorcev) za 1-sekundni segment ({SEGMENT_LEN} vzorcev).")

    all_segments_data = []
    freqs, times = np.array([]), np.array([])

    for seg_idx in range(num_segments):
        start_idx = seg_idx * SEGMENT_LEN
        end_idx = start_idx + SEGMENT_LEN
        
        segment_channels = []
        for ch in range(num_channels):
            # Vzamemo 1 sekundo dolg izrez za določen kanal
            sig_crop = signal[start_idx:end_idx, ch]
            
            f, t, Sxx = spectrogram(sig_crop, fs=FS, nperseg=NPERSEG, noverlap=NOVERLAP)
            
            if len(freqs) == 0:
                freqs, times = f, t
                
            segment_channels.append(Sxx)
            
        all_segments_data.append(np.stack(segment_channels, axis=0))
        
    return freqs, times, np.stack(all_segments_data, axis=0)

def mockup_process(csv_data):
    """
    Če ni funkcij za predprocesiranje in klasifikacijo se lahko ta uporabi za generiranje naključnih podatkov.
    """
    result = ''
    i = 0
    random_quality = str(randint(1, 3))
    for line in csv_data:
        split = line.split(",")
        if len(split) > 9:
            result += split[7] + "," + split[8] + "," + random_quality + '\n'
        i += 1
        if i % 400 == 0:
            random_quality = str(randint(1, 3))
        if i == 100000:
            break

    return result

def split(data, interval):
    """
    Razdeli podatke na x sekund dolge odseke in vrni np array z njimi. Ekvivalentno k Labeler.py skripti na Labeler repo.
    """
    for col in ['x', 'y', 'z']:
        data[col] = pd.to_numeric(data[col], errors='coerce')

    ts = data[0]['unix_ts_ms']

    last_ts = data[-1]['unix_ts_ms']

    result = np.array([])

    while ts < last_ts:
        mask = (data['unix_ts_ms'] >= ts - interval/2) & (data['unix_ts_ms'] <= ts + interval/2)
        segment = data.loc[mask].copy()

        if segment.empty:
            continue

        accel = segment[segment['sensor'] == 'accel'][['x', 'y', 'z']].values
        gyro = segment[segment['sensor'] == 'gyro'][['x', 'y', 'z']].values

        segment_data = {
            'accel': accel,
            'gyro': gyro,
            'timestamp': ts,
            'window_size_ms': interval
        }

        result = result.add(segment_data)

        ts += interval

    return result

def filter(data, target_fs):
    result = np.array([])

    for segment in data:
        accel = segment['accel']
        gyro = segment['gyro']
        timestamp = segment['timestamp']
        window_size = segment['window_size_ms']

        x_old = np.linspace(0, 1, len(accel))
        x_new = np.linspace(0, 1, len(gyro))
        f = interp1d(x_old, accel, axis=0, kind='linear')
        accel_up = f(x_new)

        accel_clean = butter_filter(accel_up, 0.5, target_fs, btype='high')
        accel_clean = butter_filter(accel_clean, 40, target_fs, btype='low')
        gyro_clean = butter_filter(gyro, 40, target_fs, btype='low')

        new_segment = {
            'accel': accel_clean,
            'gyro': gyro_clean,
            'timestamp': timestamp,
            'window_size_ms': window_size
        }

        result = result.add(new_segment)

    return result

def filtered_to_spectrogram(data):
    result = np.array([])
    for segment in data:
        accel = data['accel']
        gyro = data['gyro']
        timestamp = data['timestamp']

        try:
            freqs, times, accel_s = compute_spectrogram(accel)
            _, _, gyro_s = compute_spectrogram(gyro)
        except ValueError as e:
            continue

        combined = np.concatenate([accel_s, gyro_s], axis=1)

        if label.ndim > 0 and len(label) >= SEGMENT_LEN:
            label = label[::SEGMENT_LEN][:accel_s.shape[0]]
        if timestamp.ndim > 0 and len(timestamp) >= SEGMENT_LEN:
            timestamp = timestamp[::SEGMENT_LEN][:accel_s.shape[0]]

        spectrogram_segment = {
            'data': combined,
            'freqs': freqs,
            'times': times,
            'label': label,
            'timestamp': timestamp
        }

        result = result.add(spectrogram_segment)

    return result

def preprocess(content) -> dict:
    """
    Opravi vse funkcije predobdelave in vrne predobdelane podatke.
    """

    split_content = split(content, SEGMENT_INTERVAL)

    filtered = filter(split_content, TARGET_FS)

    spectrograms = filtered_to_spectrogram(filtered)

    return spectrograms

def classify(preprocessed) -> dict:
    return mockup_process(preprocessed)

def process_file(file_path: str) -> dict:
    content = pd.read_csv(file_path, low_memory=False)

    preprocessed = preprocess(content)

    classified = classify(preprocessed)



    return classified

if __name__ == '__main__':
    file_path = sys.argv[1]
    result = mockup_process(file_path)
    print(result)