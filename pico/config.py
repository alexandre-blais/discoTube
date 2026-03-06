# ============================================================
# DiscoTube Configuration
# WS2811 addressable LED strip – direct Pico W GPIO control
# Edit these values before uploading to your Pico W
# ============================================================

# WiFi Configuration
WIFI_SSID = "wireless"
WIFI_PASSWORD = "banane1234"

# ── LED Strip Hardware ─────────────────────────────────────
# BTF-LIGHTING WS2811 RGB 5050SMD
# 24V, 60 LEDs/m, 10m, 100 addressable pixels (3 LEDs per IC)
LED_PIN = 28                  # GPIO pin connected to the data wire
TOTAL_PIXELS = 100            # 100 addressable pixels (WS2811 groups 3 LEDs)
PIXELS_PER_METER = 10         # 10 addressable pixels per meter (60LEDs/6)
STRIP_LENGTH_M = 10           # 10 meters total
STRIP_LENGTH_CM = 1000.0      # 10m in cm
LED_ORDER = "GRB"             # WS2811 color order (GRB is standard)

# Pixel spacing on the physical strip
PIXEL_SPACING_CM = 10.0       # 100cm / 10 pixels per meter = 10cm per pixel

# Cylinder Physical Dimensions
CYLINDER_HEIGHT_CM = 152.4    # 5 feet tall tube
CYLINDER_DIAMETER_CM = 8.255  # 3 1/4 inch diameter white acrylic tube
CYLINDER_CIRCUMFERENCE_CM = 25.93  # pi * 8.255 cm

# Spiral Layout – strip wraps helically inside the acrylic tube
# circumference / pixel spacing → pixels per revolution
PIXELS_PER_WRAP = 2.593       # Pixels per 360° revolution (25.93 / 10.0)
TOTAL_WRAPS = 38.57           # Total spiral revolutions (100 / 2.593)
WRAP_PITCH_CM = 3.95          # Vertical rise per revolution (152.4 / 38.57)

# Virtual grid for grid-based effects (fire, matrix, rain)
PIXELS_PER_ROW = 5            # Virtual row size for effect computations
ROWS = 20                     # Virtual rows (100 / 5)

# Wood Base Dimensions
BASE_HEIGHT_CM = 5.08         # 2 inch tall wood base
BASE_DIAMETER_CM = 30.48      # 1 foot (12 inch) circular wood base

# Audio / Music Configuration
MIC_PIN = 26                  # ADC pin for MAX4466 microphone
SAMPLE_RATE = 8000            # Audio sample rate (Hz)
FFT_SAMPLES = 256             # FFT window size
NOISE_FLOOR = 100             # Minimum ADC reading to register
BEAT_THRESHOLD = 1.4          # Beat detection sensitivity (1.0-2.0)
BASS_RANGE = (20, 250)        # Bass frequency range (Hz)
MID_RANGE = (250, 2000)       # Mid frequency range (Hz)
HIGH_RANGE = (2000, 4000)     # Treble frequency range (Hz)

# Web Server Configuration
WEB_PORT = 80
MAX_CONNECTIONS = 4

# Performance
TARGET_FPS = 30               # Target frame rate for LED updates
FRAME_INTERVAL_MS = 33        # ~30 FPS (1000/30)

# Effect Defaults
DEFAULT_BRIGHTNESS = 80       # 0-100
DEFAULT_SPEED = 50            # 0-100
DEFAULT_EFFECT = "rainbow"
AUTO_OFF_MINUTES = 0          # 0 = disabled

# Color Presets
COLOR_PRESETS = {
    "warm_white":  (255, 200, 150),
    "cool_white":  (200, 220, 255),
    "red":         (255, 0, 0),
    "green":       (0, 255, 0),
    "blue":        (0, 0, 255),
    "purple":      (128, 0, 255),
    "orange":      (255, 100, 0),
    "cyan":        (0, 255, 255),
    "pink":        (255, 50, 150),
    "gold":        (255, 180, 0),
    "disco_pink":  (255, 0, 128),
    "neon_green":  (57, 255, 20),
    "deep_blue":   (0, 0, 180),
    "sunset":      (255, 80, 20),
    "ice":         (150, 220, 255),
}
