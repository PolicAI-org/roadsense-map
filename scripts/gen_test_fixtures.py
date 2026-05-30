import json
import os
import numpy as np
from scipy.signal import butter, filtfilt, spectrogram
from scipy.interpolate import interp1d

NPZ = os.path.join(os.path.dirname(__file__),
    "../../Labeler/output/Grob_odsek/d7c627f9-8fdc-436b-ac39-c7d24200b7da.npz")
OUT = os.path.join(os.path.dirname(__file__),
    "../src/pipeline/__tests__/fixtures/d7c627f9_labeler.json")

FS = 100
NPERSEG = 32
NOVERLAP = 28
SEGMENT_LEN = 100


def butter_filter(data, cutoff, btype, order=4):
    nyq = 0.5 * FS
    b, a = butter(order, cutoff / nyq, btype=btype, analog=False)
    return filtfilt(b, a, data)


def channel_spectrogram(signal_1d):
    _, _, Sxx = spectrogram(signal_1d, fs=FS, nperseg=NPERSEG, noverlap=NOVERLAP,
                            window="hann", scaling="density")
    return Sxx.tolist()


with np.load(NPZ) as d:
    accel_raw = d["accel"].astype(float)
    gyro_raw  = d["gyro"].astype(float)
    speed_raw = d["speed_ms"].astype(float)

x_old = np.linspace(0, 1, len(accel_raw))
x_new = np.linspace(0, 1, len(gyro_raw))
accel_up = interp1d(x_old, accel_raw, axis=0, kind="linear")(x_new)
speed_up = interp1d(x_old, speed_raw, kind="linear")(x_new)

# filter
accel_filtered = np.empty_like(accel_up)
for ch in range(3):
    accel_filtered[:, ch] = butter_filter(butter_filter(accel_up[:, ch], 0.5, "high"), 40, "low")

gyro_filtered = np.empty_like(gyro_raw)
for ch in range(3):
    gyro_filtered[:, ch] = butter_filter(gyro_raw[:, ch], 40, "low")

seg = slice(200, 200 + SEGMENT_LEN)
accel_seg = accel_filtered[seg]
gyro_seg  = gyro_filtered[seg]

def xyz(arr):
    return {"x": arr[:, 0].tolist(), "y": arr[:, 1].tolist(), "z": arr[:, 2].tolist()}

fixture = {
    "_comment": "Regenerate with: python3 scripts/gen_test_fixtures.py",
    "filter_test": {
        "accel_input":    xyz(accel_up),
        "gyro_input":     xyz(gyro_raw),
        "accel_filtered": xyz(accel_filtered),
        "gyro_filtered":  xyz(gyro_filtered),
    },
    "spectrogram_test": {
        "accel_input": xyz(accel_seg),
        "gyro_input":  xyz(gyro_seg),
        "spectrogram": {
            "accel_x": channel_spectrogram(accel_seg[:, 0]),
            "accel_y": channel_spectrogram(accel_seg[:, 1]),
            "accel_z": channel_spectrogram(accel_seg[:, 2]),
            "gyro_x":  channel_spectrogram(gyro_seg[:, 0]),
            "gyro_y":  channel_spectrogram(gyro_seg[:, 1]),
            "gyro_z":  channel_spectrogram(gyro_seg[:, 2]),
        },
    },
    "speed_samples": speed_up[:SEGMENT_LEN].tolist(),
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    json.dump(fixture, fh, indent=2)

sxx_shape = np.array(fixture["spectrogram_test"]["spectrogram"]["accel_x"]).shape
print(f"written {OUT}  |  spectrogram shape: {sxx_shape}")
