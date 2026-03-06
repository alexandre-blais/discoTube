# ============================================================
# DiscoTube – LED Effects Engine
# 20+ visual effects for the vertical LED cylinder
# ============================================================

import math
import time

try:
    from urandom import getrandbits, randint
except ImportError:
    from random import getrandbits, randint


def _hsv_to_rgb(h, s, v):
    """Convert HSV (0-1 range) to RGB (0-255 range)."""
    if s == 0:
        val = int(v * 255)
        return (val, val, val)
    i = int(h * 6.0)
    f = (h * 6.0) - i
    p = int(v * (1.0 - s) * 255)
    q = int(v * (1.0 - s * f) * 255)
    t = int(v * (1.0 - s * (1.0 - f)) * 255)
    v = int(v * 255)
    i = i % 6
    if i == 0: return (v, t, p)
    if i == 1: return (q, v, p)
    if i == 2: return (p, v, t)
    if i == 3: return (p, q, v)
    if i == 4: return (t, p, v)
    return (v, p, q)


def _clamp(val, lo=0, hi=255):
    return max(lo, min(hi, int(val)))


def _blend(c1, c2, t):
    """Blend two RGB tuples by factor t (0.0 = c1, 1.0 = c2)."""
    return (
        _clamp(c1[0] + (c2[0] - c1[0]) * t),
        _clamp(c1[1] + (c2[1] - c1[1]) * t),
        _clamp(c1[2] + (c2[2] - c1[2]) * t),
    )


class EffectsEngine:
    """
    Generates LED color arrays for the cylinder.
    Each effect function returns a list of (r, g, b) tuples
    for every LED on the cylinder.
    """

    # Registry of all available effects
    EFFECTS = [
        "solid", "rainbow", "rainbow_wave", "gradient", "breathing",
        "pulse", "strobe", "fire", "ice_fire", "plasma",
        "matrix", "rain", "aurora", "sparkle", "comet",
        "theater_chase", "color_wipe", "twinkle", "lava_lamp",
        "vortex", "dna_helix", "equalizer", "wave",
        "candy", "ocean", "sunset_glow",
    ]

    def __init__(self, cylinder_map, brightness=80, speed=50):
        self.cmap = cylinder_map
        self.total = cylinder_map.total_leds
        self.rows = cylinder_map.rows
        self.cols = cylinder_map.leds_per_row
        self.brightness = brightness / 100.0
        self.speed = speed / 100.0
        self.tick = 0
        self.color1 = (255, 0, 128)    # Primary color
        self.color2 = (0, 128, 255)    # Secondary color
        self.palette = [
            (255, 0, 0), (255, 128, 0), (255, 255, 0),
            (0, 255, 0), (0, 128, 255), (128, 0, 255),
        ]
        # Internal buffers
        self._fire_heat = [0] * self.total
        self._rain_drops = []
        self._sparkles = []

    def set_brightness(self, brightness):
        self.brightness = max(0, min(100, brightness)) / 100.0

    def set_speed(self, speed):
        self.speed = max(1, min(100, speed)) / 100.0

    def set_colors(self, color1, color2=None):
        self.color1 = color1
        if color2:
            self.color2 = color2

    def _apply_brightness(self, colors):
        b = self.brightness
        return [(_clamp(c[0] * b), _clamp(c[1] * b), _clamp(c[2] * b))
                for c in colors]

    def advance(self):
        """Advance the animation tick."""
        self.tick += 1

    def render(self, effect_name, audio_data=None):
        """Render a named effect and return LED color array."""
        self.advance()
        fn = getattr(self, "fx_" + effect_name, None)
        if fn is None:
            fn = self.fx_solid
        if audio_data and effect_name == "equalizer":
            colors = fn(audio_data)
        else:
            colors = fn()
        return self._apply_brightness(colors)

    # ═══════════════════════════════════════════════════════════
    # EFFECTS
    # ═══════════════════════════════════════════════════════════

    def fx_solid(self):
        """Solid single color across entire cylinder."""
        return [self.color1] * self.total

    def fx_rainbow(self):
        """Classic rainbow cycling across all LEDs."""
        t = self.tick * self.speed * 0.02
        colors = []
        for i in range(self.total):
            h = (i / self.total + t) % 1.0
            colors.append(_hsv_to_rgb(h, 1.0, 1.0))
        return colors

    def fx_rainbow_wave(self):
        """Rainbow wave spiraling up the cylinder."""
        t = self.tick * self.speed * 0.03
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            h = (ny * 0.5 + na * 0.5 + t) % 1.0
            colors.append(_hsv_to_rgb(h, 1.0, 1.0))
        return colors

    def fx_gradient(self):
        """Vertical gradient between two colors."""
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            colors.append(_blend(self.color1, self.color2, ny))
        return colors

    def fx_breathing(self):
        """Gentle breathing/pulsing effect."""
        t = self.tick * self.speed * 0.04
        intensity = (math.sin(t) + 1.0) / 2.0
        c = (
            _clamp(self.color1[0] * intensity),
            _clamp(self.color1[1] * intensity),
            _clamp(self.color1[2] * intensity),
        )
        return [c] * self.total

    def fx_pulse(self):
        """Sharp pulse wave traveling up the cylinder."""
        t = (self.tick * self.speed * 0.05) % 1.0
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            dist = abs(ny - t)
            if dist > 0.5:
                dist = 1.0 - dist
            intensity = max(0, 1.0 - dist * 8.0)
            colors.append((
                _clamp(self.color1[0] * intensity),
                _clamp(self.color1[1] * intensity),
                _clamp(self.color1[2] * intensity),
            ))
        return colors

    def fx_strobe(self):
        """Fast strobe flash."""
        on = (self.tick % max(1, int(6 - self.speed * 5))) < 1
        if on:
            return [self.color1] * self.total
        return [(0, 0, 0)] * self.total

    def fx_fire(self):
        """Realistic fire effect rising from the bottom."""
        for i in range(self.total):
            cooling = randint(0, 15)
            self._fire_heat[i] = max(0, self._fire_heat[i] - cooling)

        for row in range(self.rows - 1, 1, -1):
            for col in range(self.cols):
                idx = row * self.cols + col
                below = (row - 1) * self.cols + col
                below2 = max(0, (row - 2) * self.cols + col)
                self._fire_heat[idx] = (
                    self._fire_heat[below] +
                    self._fire_heat[below2]
                ) // 2

        for col in range(self.cols):
            if randint(0, 3) == 0:
                idx = col
                self._fire_heat[idx] = min(255, self._fire_heat[idx] + randint(120, 255))

        colors = []
        for i in range(self.total):
            h = self._fire_heat[i]
            r = min(255, h * 3)
            g = max(0, min(255, h - 60))
            b = max(0, min(255, h // 3 - 80))
            colors.append((_clamp(r), _clamp(g), _clamp(b)))
        return colors

    def fx_ice_fire(self):
        """Blue/cyan ice fire effect."""
        base = self.fx_fire()
        return [(c[2], c[1], c[0]) for c in base]  # Swap R↔B

    def fx_plasma(self):
        """Psychedelic plasma effect."""
        t = self.tick * self.speed * 0.03
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            v1 = math.sin(ny * 10 + t)
            v2 = math.sin(na * 10 + t * 0.7)
            v3 = math.sin((ny + na) * 5 + t * 1.3)
            v = (v1 + v2 + v3 + 3.0) / 6.0
            colors.append(_hsv_to_rgb(v, 1.0, 1.0))
        return colors

    def fx_matrix(self):
        """Matrix-style green falling code."""
        t = self.tick * self.speed * 0.08
        colors = [(0, 0, 0)] * self.total
        for col in range(self.cols):
            head_row = int((t * 3 + col * 2.7) % (self.rows + 8))
            for row in range(self.rows):
                idx = row * self.cols + col
                dist = head_row - row
                if 0 <= dist < 8:
                    intensity = max(0, 1.0 - dist / 8.0)
                    g = _clamp(255 * intensity)
                    r = _clamp(60 * intensity) if dist == 0 else 0
                    colors[idx] = (r, g, 0)
        return colors

    def fx_rain(self):
        """Raindrops falling down the cylinder."""
        t = self.tick
        if t % max(1, int(4 - self.speed * 3)) == 0:
            col = randint(0, self.cols - 1)
            self._rain_drops.append({"col": col, "row": 0.0, "speed": 0.2 + self.speed * 0.3})

        colors = [(0, 0, 10)] * self.total  # Dark blue background
        alive = []
        for drop in self._rain_drops:
            drop["row"] += drop["speed"]
            if drop["row"] < self.rows:
                alive.append(drop)
                row = int(drop["row"])
                for trail in range(4):
                    r = row - trail
                    if 0 <= r < self.rows:
                        idx = r * self.cols + drop["col"]
                        intensity = 1.0 - trail / 4.0
                        colors[idx] = (
                            _clamp(100 * intensity),
                            _clamp(150 * intensity),
                            _clamp(255 * intensity),
                        )
        self._rain_drops = alive[-50:]  # Limit active drops
        return colors

    def fx_aurora(self):
        """Northern lights / aurora borealis effect."""
        t = self.tick * self.speed * 0.02
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            wave = math.sin(ny * 4 + na * 2 + t) * 0.5 + 0.5
            h = 0.3 + wave * 0.3  # Green-cyan-blue range
            s = 0.6 + wave * 0.4
            v = wave * 0.8 + 0.1
            colors.append(_hsv_to_rgb(h, s, v))
        return colors

    def fx_sparkle(self):
        """Random sparkling/twinkling stars."""
        colors = [(5, 5, 15)] * self.total  # Deep space background
        # Add new sparkles
        for _ in range(max(1, int(self.speed * 5))):
            idx = randint(0, self.total - 1)
            self._sparkles.append({"idx": idx, "life": 10})

        alive = []
        for sp in self._sparkles:
            sp["life"] -= 1
            if sp["life"] > 0:
                alive.append(sp)
                intensity = sp["life"] / 10.0
                colors[sp["idx"]] = (
                    _clamp(255 * intensity),
                    _clamp(255 * intensity),
                    _clamp(220 * intensity),
                )
        self._sparkles = alive[-100:]
        return colors

    def fx_comet(self):
        """Comet spiraling around the cylinder."""
        t = self.tick * self.speed * 0.06
        colors = [(0, 0, 0)] * self.total
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            comet_y = (t * 0.3) % 1.0
            comet_a = (t * 2.0) % 1.0
            dy = abs(ny - comet_y)
            da = min(abs(na - comet_a), 1.0 - abs(na - comet_a))
            dist = math.sqrt(dy ** 2 + da ** 2)
            if dist < 0.15:
                intensity = 1.0 - dist / 0.15
                colors[i] = (
                    _clamp(self.color1[0] * intensity),
                    _clamp(self.color1[1] * intensity),
                    _clamp(self.color1[2] * intensity),
                )
        return colors

    def fx_theater_chase(self):
        """Classic theater chase marquee lights."""
        t = self.tick
        offset = t % 3
        colors = []
        for i in range(self.total):
            if (i + offset) % 3 == 0:
                colors.append(self.color1)
            else:
                colors.append((0, 0, 0))
        return colors

    def fx_color_wipe(self):
        """Progressive color wipe across the cylinder."""
        t = self.tick * self.speed * 0.02
        progress = t % 2.0
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            if progress < 1.0:
                if ny < progress:
                    colors.append(self.color1)
                else:
                    colors.append(self.color2)
            else:
                if ny < (progress - 1.0):
                    colors.append(self.color2)
                else:
                    colors.append(self.color1)
        return colors

    def fx_twinkle(self):
        """Gentle twinkling with color variation."""
        t = self.tick * self.speed * 0.05
        colors = []
        for i in range(self.total):
            phase = (i * 0.73 + t) 
            v = (math.sin(phase) + 1.0) / 2.0
            h = (i / self.total + t * 0.01) % 1.0
            colors.append(_hsv_to_rgb(h, 0.6, v * 0.8 + 0.1))
        return colors

    def fx_lava_lamp(self):
        """Slow-moving lava lamp blobs."""
        t = self.tick * self.speed * 0.01
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            blob1 = math.sin(ny * 3 + t) * math.cos(na * 2 + t * 0.7)
            blob2 = math.sin(ny * 2 - t * 0.5) * math.cos(na * 3 + t * 1.1)
            v = (blob1 + blob2 + 2.0) / 4.0
            colors.append(_blend(self.color1, self.color2, v))
        return colors

    def fx_vortex(self):
        """Spinning vortex/tornado effect."""
        t = self.tick * self.speed * 0.05
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            spiral = (na + ny * 3 + t) % 1.0
            if spiral < 0.15:
                intensity = 1.0 - spiral / 0.15
                colors.append((
                    _clamp(self.color1[0] * intensity),
                    _clamp(self.color1[1] * intensity),
                    _clamp(self.color1[2] * intensity),
                ))
            else:
                colors.append((0, 0, 0))
        return colors

    def fx_dna_helix(self):
        """Double helix DNA strand spiraling the cylinder."""
        t = self.tick * self.speed * 0.04
        colors = [(0, 0, 10)] * self.total
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            strand1 = (math.sin(ny * 8 + t) * 0.5 + 0.5 - na) % 1.0
            strand2 = (math.sin(ny * 8 + t + math.pi) * 0.5 + 0.5 - na) % 1.0
            if abs(strand1) < 0.08 or abs(1 - strand1) < 0.08:
                colors[i] = self.color1
            elif abs(strand2) < 0.08 or abs(1 - strand2) < 0.08:
                colors[i] = self.color2
        return colors

    def fx_equalizer(self, audio_data=None):
        """
        Audio-reactive equalizer bars.
        audio_data: list of frequency band magnitudes (one per column).
        """
        if audio_data is None:
            # Simulate with sine waves
            t = self.tick * self.speed * 0.1
            audio_data = [
                abs(math.sin(t + i * 0.5)) for i in range(self.cols)
            ]

        colors = [(0, 0, 0)] * self.total
        for col in range(min(self.cols, len(audio_data))):
            level = min(1.0, max(0.0, audio_data[col]))
            bar_height = int(level * self.rows)
            for row in range(bar_height):
                idx = row * self.cols + col
                if idx < self.total:
                    frac = row / max(1, self.rows)
                    if frac < 0.5:
                        colors[idx] = (0, _clamp(255 * frac * 2), 0)
                    elif frac < 0.8:
                        colors[idx] = (_clamp(255 * (frac - 0.5) * 3), 255, 0)
                    else:
                        colors[idx] = (255, _clamp(255 * (1.0 - frac) * 5), 0)
        return colors

    def fx_wave(self):
        """Smooth sine wave traveling around the cylinder."""
        t = self.tick * self.speed * 0.04
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            wave = math.sin(na * math.pi * 2 * 3 + t + ny * 4) * 0.5 + 0.5
            colors.append(_blend((0, 0, 30), self.color1, wave))
        return colors

    def fx_candy(self):
        """Candy stripe diagonal pattern."""
        t = self.tick * self.speed * 0.03
        colors = []
        stripe_colors = [
            (255, 50, 100), (255, 255, 255),
            (100, 200, 255), (255, 255, 255),
        ]
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            stripe = int((ny * 8 + na * 4 + t) % len(stripe_colors))
            colors.append(stripe_colors[stripe])
        return colors

    def fx_ocean(self):
        """Deep ocean waves effect."""
        t = self.tick * self.speed * 0.02
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            na = self.cmap.get_normalized_angle(i)
            wave1 = math.sin(ny * 6 + t) * 0.3
            wave2 = math.sin(na * 4 + t * 1.3) * 0.2
            v = (wave1 + wave2 + 0.5)
            v = max(0, min(1, v))
            colors.append((
                _clamp(20 * v),
                _clamp(80 + 100 * v),
                _clamp(150 + 105 * v),
            ))
        return colors

    def fx_sunset_glow(self):
        """Warm sunset gradient that slowly shifts."""
        t = self.tick * self.speed * 0.01
        colors = []
        for i in range(self.total):
            ny = self.cmap.get_normalized_y(i)
            shifted = (ny + math.sin(t) * 0.2) % 1.0
            if shifted < 0.3:
                colors.append(_blend((255, 50, 0), (255, 150, 0), shifted / 0.3))
            elif shifted < 0.6:
                colors.append(_blend((255, 150, 0), (255, 80, 150), (shifted - 0.3) / 0.3))
            else:
                colors.append(_blend((255, 80, 150), (100, 0, 150), (shifted - 0.6) / 0.4))
        return colors
