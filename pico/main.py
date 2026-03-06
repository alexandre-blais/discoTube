# ============================================================
# DiscoTube – Main Controller
# Orchestrates WS2811 LED strip, effects, music, and web server
# ============================================================

import time
import ujson

from config import *
from led_driver import LEDStrip
from effects import EffectsEngine
from music import AudioAnalyzer
from cylinder import CylinderMap
from web_server import DiscoWebServer


class DiscoTubeController:
    """
    Central controller that ties together all DiscoTube subsystems:
    - WS2811 LED strip via direct GPIO (PIO)
    - Effects engine for pattern generation
    - Audio analyzer for music reactivity
    - Web server for phone control
    """

    def __init__(self):
        # Cylinder geometry
        self.cylinder = CylinderMap(
            height_cm=CYLINDER_HEIGHT_CM,
            diameter_cm=CYLINDER_DIAMETER_CM,
            total_pixels=TOTAL_PIXELS,
            pixels_per_row=PIXELS_PER_ROW,
            pixel_spacing_cm=PIXEL_SPACING_CM,
        )

        # WS2811 LED strip driver (direct GPIO via PIO)
        self.strip = LEDStrip(
            pin_num=LED_PIN,
            num_pixels=TOTAL_PIXELS,
            order=LED_ORDER,
        )

        # Effects engine
        self.effects = EffectsEngine(
            self.cylinder,
            brightness=DEFAULT_BRIGHTNESS,
            speed=DEFAULT_SPEED,
        )

        # Audio analyzer
        self.audio = AudioAnalyzer(
            mic_pin=MIC_PIN,
            sample_rate=SAMPLE_RATE,
            fft_size=FFT_SAMPLES,
            noise_floor=NOISE_FLOOR,
            beat_threshold=BEAT_THRESHOLD,
            bass_range=BASS_RANGE,
            mid_range=MID_RANGE,
            high_range=HIGH_RANGE,
        )

        # State
        self.is_on = False
        self.brightness = DEFAULT_BRIGHTNESS
        self.speed = DEFAULT_SPEED
        self.current_effect = DEFAULT_EFFECT
        self.current_color = {"r": 255, "g": 0, "b": 128}
        self.color_temp = 0
        self.music_mode = "off"
        self.music_sensitivity = 1.0
        self.timer_remaining = 0
        self._timer_start = 0
        self._timer_duration = 0

        # Saved presets
        self.presets = {}
        self._load_presets()

        # Frame timing
        self._last_frame = time.ticks_ms()
        self._frame_interval = FRAME_INTERVAL_MS  # ~30 FPS for direct LED updates

    # ── Power ──────────────────────────────────────────────

    def power_on(self):
        self.is_on = True

    def power_off(self):
        self.is_on = False
        self.strip.clear()

    def toggle_power(self):
        if self.is_on:
            self.power_off()
        else:
            self.power_on()

    # ── Brightness ─────────────────────────────────────────

    def set_brightness(self, value):
        self.brightness = max(0, min(100, int(value)))
        self.effects.set_brightness(self.brightness)
        self.strip.set_brightness(self.brightness)

    # ── Speed ──────────────────────────────────────────────

    def set_speed(self, value):
        self.speed = max(1, min(100, int(value)))
        self.effects.set_speed(self.speed)

    # ── Color ──────────────────────────────────────────────

    def set_color(self, r, g, b):
        self.current_color = {"r": r, "g": g, "b": b}
        self.effects.set_colors((r, g, b))

    def set_color_hex(self, hex_color):
        hex_color = hex_color.lstrip("#")
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        self.set_color(r, g, b)

    def set_color_temp(self, temp_k):
        self.color_temp = temp_k

    # ── Effects ────────────────────────────────────────────

    def set_effect(self, name):
        if name in EffectsEngine.EFFECTS:
            self.current_effect = name

    def get_effects_list(self):
        return EffectsEngine.EFFECTS

    # ── Music Mode ─────────────────────────────────────────

    def set_music_mode(self, mode):
        self.music_mode = mode

    def set_music_sensitivity(self, value):
        self.music_sensitivity = max(0.1, min(3.0, float(value)))
        self.audio.beat_threshold = 2.0 - self.music_sensitivity + 0.4

    def get_audio_state(self):
        return self.audio.to_json()

    # ── Zones ──────────────────────────────────────────────

    def set_zone_color(self, zone, r, g, b):
        """Set color for a zone (top/bottom half)."""
        half = TOTAL_PIXELS // 2
        if zone == 0:
            start, end = 0, half
        else:
            start, end = half, TOTAL_PIXELS
        colors = [(r, g, b)] * (end - start)
        for i, c in enumerate(colors):
            self.strip.set_pixel(start + i, c[0], c[1], c[2])
        self.strip.show()

    def get_zones(self):
        half = TOTAL_PIXELS // 2
        return [
            {"name": "Bottom", "zone": (0, half - 1)},
            {"name": "Top", "zone": (half, TOTAL_PIXELS - 1)},
        ]

    # ── Presets ────────────────────────────────────────────

    def get_presets(self):
        # Built-in color presets + saved scenes
        combined = {}
        for name, c in COLOR_PRESETS.items():
            combined[name] = {"type": "color", "color": list(c)}
        combined.update(self.presets)
        return combined

    def apply_preset(self, name):
        all_presets = self.get_presets()
        if name in all_presets:
            preset = all_presets[name]
            if preset.get("type") == "color":
                c = preset["color"]
                self.set_color(c[0], c[1], c[2])
                self.set_effect("solid")
            elif preset.get("type") == "scene":
                self.set_effect(preset.get("effect", "rainbow"))
                self.set_brightness(preset.get("brightness", 80))
                self.set_speed(preset.get("speed", 50))
                if "color" in preset:
                    c = preset["color"]
                    self.set_color(c[0], c[1], c[2])

    def save_preset(self, name):
        c = self.current_color
        self.presets[name] = {
            "type": "scene",
            "effect": self.current_effect,
            "brightness": self.brightness,
            "speed": self.speed,
            "color": [c["r"], c["g"], c["b"]],
        }
        self._save_presets()

    def _load_presets(self):
        try:
            with open("presets.json", "r") as f:
                self.presets = ujson.load(f)
        except:
            self.presets = {}

    def _save_presets(self):
        try:
            with open("presets.json", "w") as f:
                ujson.dump(self.presets, f)
        except Exception as e:
            print("Error saving presets:", e)

    # ── Timer ──────────────────────────────────────────────

    def set_timer(self, minutes):
        if minutes > 0:
            self._timer_duration = minutes * 60
            self._timer_start = time.time()
            self.timer_remaining = minutes
        else:
            self._timer_duration = 0
            self.timer_remaining = 0

    def _check_timer(self):
        if self._timer_duration > 0:
            elapsed = time.time() - self._timer_start
            remaining = self._timer_duration - elapsed
            if remaining <= 0:
                self.power_off()
                self._timer_duration = 0
                self.timer_remaining = 0
            else:
                self.timer_remaining = int(remaining / 60) + 1

    # ── Device Info ─────────────────────────────────────────

    def get_device_info(self):
        """Return hardware info about the LED strip."""
        return {
            "strip": "WS2811 24V",
            "pixels": TOTAL_PIXELS,
            "length_m": STRIP_LENGTH_M,
            "pixels_per_m": PIXELS_PER_METER,
            "gpio_pin": LED_PIN,
        }

    # ── Full State ─────────────────────────────────────────

    def get_full_state(self):
        return {
            "power": self.is_on,
            "brightness": self.brightness,
            "speed": self.speed,
            "effect": self.current_effect,
            "color": self.current_color,
            "colorTemp": self.color_temp,
            "musicMode": self.music_mode,
            "musicSensitivity": self.music_sensitivity,
            "timer": self.timer_remaining,
            "effects": self.get_effects_list(),
            "musicModes": ["off", "spectrum", "pulse", "energy", "vu_meter", "equalizer"],
            "audio": self.audio.to_json(),
            "zones": self.get_zones(),
            "ip": self.ip if hasattr(self, 'ip') else "unknown",
        }

    # ── Main Loop Tick ─────────────────────────────────────

    def update(self):
        """
        Called every main loop iteration.
        Handles effect rendering and Govee API updates.
        """
        if not self.is_on:
            return

        now = time.ticks_ms()

        # Check timer
        self._check_timer()

        # Update audio analyzer
        if self.music_mode != "off":
            self.audio.update()

        # Render effects at frame rate
        if time.ticks_diff(now, self._last_frame) >= self._frame_interval:
            self._last_frame = now

            if self.music_mode == "equalizer":
                eq_data = self.audio.get_eq_bands(self.effects.cols)
                colors = self.effects.render("equalizer", eq_data)
            elif self.music_mode != "off":
                colors = self.audio.get_music_colors(
                    self.effects.total, mode=self.music_mode
                )
            else:
                colors = self.effects.render(self.current_effect)

            # Push colors directly to the WS2811 strip
            self.strip.set_all(colors)
            self.strip.show()

# ================================================================
# MAIN ENTRY POINT
# ================================================================

def main():
    print("=" * 50)
    print("  DiscoTube - WS2811 LED Cylinder Controller")
    print("  100 pixels · 24V · 10m · Direct GPIO")
    print("=" * 50)

    # Initialize controller
    ctrl = DiscoTubeController()

    # Start web server
    server = DiscoWebServer(ctrl, port=WEB_PORT)
    ctrl.ip = server.connect_wifi(WIFI_SSID, WIFI_PASSWORD)
    server.start()

    print(f"\nOpen http://{ctrl.ip} on your phone to control DiscoTube!\n")

    # Power on by default
    ctrl.power_on()
    ctrl.set_effect(DEFAULT_EFFECT)

    # Main loop
    while True:
        try:
            server.poll()      # Handle incoming HTTP requests
            ctrl.update()      # Render effects & update LEDs
            time.sleep_ms(10)  # Small yield
        except KeyboardInterrupt:
            print("\nShutting down...")
            ctrl.power_off()
            break
        except Exception as e:
            print("Main loop error:", e)
            time.sleep(1)


if __name__ == "__main__":
    main()
