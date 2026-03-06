# ============================================================
# DiscoTube – Music / Audio Reactive Module
# Analyzes microphone input for beat detection & FFT
# ============================================================

import math
import time

try:
    from machine import ADC, Pin
    HARDWARE = True
except ImportError:
    HARDWARE = False


class AudioAnalyzer:
    """
    Reads analog audio from a MAX4466 microphone on the Pico W,
    performs FFT-based frequency analysis, and detects beats.
    Outputs normalized frequency bands for LED effect mapping.
    """

    def __init__(self, mic_pin=26, sample_rate=8000, fft_size=256,
                 noise_floor=100, beat_threshold=1.4,
                 bass_range=(20, 250), mid_range=(250, 2000),
                 high_range=(2000, 4000)):
        self.sample_rate = sample_rate
        self.fft_size = fft_size
        self.noise_floor = noise_floor
        self.beat_threshold = beat_threshold
        self.bass_range = bass_range
        self.mid_range = mid_range
        self.high_range = high_range

        if HARDWARE:
            self.adc = ADC(Pin(mic_pin))
        else:
            self.adc = None

        # Frequency bin resolution
        self.bin_hz = sample_rate / fft_size

        # History for beat detection
        self._energy_history = []
        self._history_size = 30
        self._beat_cooldown = 0

        # Smoothed band values
        self.bands = {
            "bass": 0.0,
            "mid": 0.0,
            "high": 0.0,
            "overall": 0.0,
        }
        self.beat = False
        self.peak = 0.0

        # For equalizer columns mapping
        self.num_eq_bands = 20
        self.eq_bands = [0.0] * self.num_eq_bands

    def _read_samples(self):
        """Read a window of audio samples from the ADC."""
        if not HARDWARE:
            return self._simulate_samples()

        samples = []
        interval_us = 1_000_000 // self.sample_rate
        for _ in range(self.fft_size):
            val = self.adc.read_u16() >> 4  # 12-bit
            samples.append(val - 2048)       # Center around zero
            time.sleep_us(interval_us)
        return samples

    def _simulate_samples(self):
        """Generate simulated audio for testing without hardware."""
        t = time.ticks_ms() / 1000.0
        samples = []
        for i in range(self.fft_size):
            phase = 2 * math.pi * i / self.fft_size
            # Simulate a mix of bass, mid, and treble
            bass = math.sin(phase * 4 + t * 2) * 800
            mid = math.sin(phase * 20 + t * 5) * 400
            high = math.sin(phase * 60 + t * 8) * 200
            # Add some beat pulse
            beat_pulse = math.sin(t * 4) ** 8 * 600
            val = bass + mid + high + beat_pulse
            samples.append(int(val))
        return samples

    def _fft_magnitude(self, samples):
        """
        Compute approximate FFT magnitudes using DFT.
        MicroPython-friendly: no numpy required.
        Only computes bins we need (first half).
        """
        n = len(samples)
        half = n // 2
        magnitudes = []

        for k in range(half):
            real = 0.0
            imag = 0.0
            for i in range(n):
                angle = -2.0 * math.pi * k * i / n
                real += samples[i] * math.cos(angle)
                imag += samples[i] * math.sin(angle)
            mag = math.sqrt(real * real + imag * imag) / n
            magnitudes.append(mag)

        return magnitudes

    def _fast_magnitude(self, samples):
        """
        Faster approximate frequency analysis using zero-crossing
        and energy calculation. Suitable for real-time on Pico W.
        """
        n = len(samples)

        # Overall energy (RMS)
        energy = 0
        for s in samples:
            energy += s * s
        rms = math.sqrt(energy / n)

        # Zero crossing rate → rough frequency estimate
        crossings = 0
        for i in range(1, n):
            if (samples[i] >= 0) != (samples[i - 1] >= 0):
                crossings += 1
        freq_estimate = (crossings / 2) * (self.sample_rate / n)

        # Energy in frequency bands via band-pass filtering (simplified)
        bass_e = 0
        mid_e = 0
        high_e = 0

        # Simple moving average filters at different window sizes
        # Large window ≈ low freq, small window ≈ high freq
        bass_win = max(2, n // 8)
        mid_win = max(2, n // 32)

        for i in range(n):
            # Low-pass (bass)
            start = max(0, i - bass_win)
            avg = sum(samples[start:i + 1]) / (i - start + 1)
            bass_e += avg * avg

            # Band-pass (mid) - difference of averages
            start_m = max(0, i - mid_win)
            avg_m = sum(samples[start_m:i + 1]) / (i - start_m + 1)
            mid_val = avg_m - avg
            mid_e += mid_val * mid_val

            # High-pass (treble)
            high_val = samples[i] - avg_m
            high_e += high_val * high_val

        bass_e = math.sqrt(bass_e / n)
        mid_e = math.sqrt(mid_e / n)
        high_e = math.sqrt(high_e / n)

        return rms, bass_e, mid_e, high_e, freq_estimate

    def update(self):
        """
        Read audio, analyze, and update all band values.
        Call this once per frame/tick.
        """
        samples = self._read_samples()

        rms, bass, mid, high, freq = self._fast_magnitude(samples)

        # Normalize to 0.0 - 1.0 range
        max_val = max(1, max(rms, bass, mid, high))
        self.bands["bass"] = min(1.0, bass / max_val)
        self.bands["mid"] = min(1.0, mid / max_val)
        self.bands["high"] = min(1.0, high / max_val)
        self.bands["overall"] = min(1.0, rms / max_val)
        self.peak = min(1.0, rms / 500.0)

        # Beat detection
        self._energy_history.append(rms)
        if len(self._energy_history) > self._history_size:
            self._energy_history.pop(0)

        if len(self._energy_history) >= 5:
            avg_energy = sum(self._energy_history) / len(self._energy_history)
            if self._beat_cooldown <= 0 and rms > avg_energy * self.beat_threshold:
                self.beat = True
                self._beat_cooldown = 4  # Minimum frames between beats
            else:
                self.beat = False
                self._beat_cooldown = max(0, self._beat_cooldown - 1)
        else:
            self.beat = False

        # Generate equalizer bands
        self._update_eq_bands(samples)

    def _update_eq_bands(self, samples):
        """Map audio energy into N equalizer columns."""
        n = len(samples)
        chunk = max(1, n // self.num_eq_bands)
        smooth = 0.3  # Smoothing factor

        for b in range(self.num_eq_bands):
            start = b * chunk
            end = min(n, start + chunk)
            energy = 0
            for i in range(start, end):
                energy += samples[i] * samples[i]
            energy = math.sqrt(energy / max(1, end - start)) / 500.0
            energy = min(1.0, energy)
            # Smooth transition
            self.eq_bands[b] = self.eq_bands[b] * (1 - smooth) + energy * smooth

    def get_eq_bands(self, num_columns=20):
        """
        Get equalizer band values mapped to N columns.
        Returns list of floats 0.0 – 1.0.
        """
        if num_columns == self.num_eq_bands:
            return self.eq_bands[:]

        # Resample to desired column count
        result = []
        ratio = self.num_eq_bands / num_columns
        for i in range(num_columns):
            src = int(i * ratio)
            src = min(src, self.num_eq_bands - 1)
            result.append(self.eq_bands[src])
        return result

    def get_music_colors(self, num_leds, mode="spectrum"):
        """
        Generate LED colors based on audio analysis.

        Modes:
          - spectrum: Color mapped to frequency bands
          - pulse: Flash on beat
          - energy: Brightness follows energy
          - vu_meter: Fill from bottom proportional to volume
        """
        colors = [(0, 0, 0)] * num_leds

        if mode == "spectrum":
            bass = self.bands["bass"]
            mid = self.bands["mid"]
            high = self.bands["high"]
            third = num_leds // 3
            for i in range(third):
                intensity = bass
                colors[i] = (int(255 * intensity), 0, int(50 * intensity))
            for i in range(third, third * 2):
                intensity = mid
                colors[i] = (0, int(255 * intensity), int(100 * intensity))
            for i in range(third * 2, num_leds):
                intensity = high
                colors[i] = (0, int(100 * intensity), int(255 * intensity))

        elif mode == "pulse":
            if self.beat:
                for i in range(num_leds):
                    colors[i] = (255, 0, 128)
            else:
                v = int(30 * self.bands["overall"])
                for i in range(num_leds):
                    colors[i] = (v, 0, v // 2)

        elif mode == "energy":
            v = self.bands["overall"]
            for i in range(num_leds):
                colors[i] = (int(255 * v), int(100 * v), int(50 * v))

        elif mode == "vu_meter":
            level = int(self.peak * num_leds)
            for i in range(num_leds):
                if i < level:
                    frac = i / num_leds
                    if frac < 0.5:
                        colors[i] = (0, 255, 0)
                    elif frac < 0.8:
                        colors[i] = (255, 255, 0)
                    else:
                        colors[i] = (255, 0, 0)

        return colors

    def to_json(self):
        """Export current audio state as JSON-friendly dict."""
        return {
            "bass": round(self.bands["bass"], 3),
            "mid": round(self.bands["mid"], 3),
            "high": round(self.bands["high"], 3),
            "overall": round(self.bands["overall"], 3),
            "beat": self.beat,
            "peak": round(self.peak, 3),
            "eq": [round(b, 3) for b in self.eq_bands],
        }
