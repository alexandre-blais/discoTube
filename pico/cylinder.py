# ============================================================
# DiscoTube – Cylinder Geometry Mapping
# Maps pixel indices to physical positions on the cylinder
# ============================================================

import math


class CylinderMap:
    """
    Maps pixel indices to 3D positions on a vertical cylinder
    using a continuous spiral (helix) layout.  A single WS2811
    LED strip (100 addressable pixels) is wound helically
    inside a white acrylic tube.

    The spiral is defined by the tube circumference and pixel
    spacing on the strip:
      pixels_per_wrap ≈ circumference / pixel_spacing

    A virtual grid (pixels_per_row × rows) is also maintained
    so that grid-based effects (fire, matrix, rain) keep working.

    Coordinate system:
      - Y axis = vertical (0 = bottom, height = top)
      - X, Z = horizontal plane (circle)
      - Angle 0 = front of cylinder
    """

    def __init__(self, height_cm, diameter_cm, total_pixels,
                 pixels_per_row, pixel_spacing_cm=10.0):
        self.height = height_cm
        self.radius = diameter_cm / 2.0
        self.circumference = math.pi * diameter_cm
        self.total_pixels = total_pixels
        self.total_leds = total_pixels          # alias for effects compatibility
        self.leds_per_row = pixels_per_row      # alias for effects compatibility
        self.rows = total_pixels // pixels_per_row  # virtual grid rows

        # Spiral geometry
        self.pixel_spacing = pixel_spacing_cm
        self.pixels_per_wrap = self.circumference / self.pixel_spacing
        self.leds_per_wrap = self.pixels_per_wrap  # alias
        self.total_wraps = self.total_pixels / self.pixels_per_wrap
        self.wrap_pitch = height_cm / max(1, self.total_wraps)

        self._build_map()

    def _build_map(self):
        """Pre-compute 3D spiral position for every pixel index."""
        self.positions = []
        self.angles = []
        self.row_indices = []   # virtual grid row
        self.col_indices = []   # virtual grid column

        for idx in range(self.total_pixels):
            # ── Spiral (helix) placement ──
            angle = (idx / self.pixels_per_wrap) * 2.0 * math.pi
            y = (idx / max(1, self.total_pixels - 1)) * self.height
            x = self.radius * math.cos(angle)
            z = self.radius * math.sin(angle)

            # Virtual grid indices (for grid-based effects)
            v_row = idx // self.leds_per_row
            v_col = idx % self.leds_per_row

            self.positions.append((x, y, z))
            self.angles.append(angle)
            self.row_indices.append(v_row)
            self.col_indices.append(v_col)

    def get_position(self, pixel_index):
        """Get (x, y, z) position in cm for a pixel index."""
        return self.positions[pixel_index]

    def get_normalized_y(self, pixel_index):
        """Get vertical position normalized to 0.0 – 1.0."""
        return self.row_indices[pixel_index] / max(1, self.rows - 1)

    def get_normalized_angle(self, pixel_index):
        """Get angular position normalized to 0.0 – 1.0."""
        return self.col_indices[pixel_index] / self.leds_per_row

    def leds_in_row(self, row):
        """Get global LED indices for a specific row."""
        start = row * self.leds_per_row
        return list(range(start, start + self.leds_per_row))

    def leds_in_column(self, col):
        """Get global LED indices for a specific column (vertical line)."""
        return [row * self.leds_per_row + col for row in range(self.rows)]

    def leds_in_ring(self, y_normalized, thickness=0.05):
        """Get pixel indices near a specific height (0.0 – 1.0)."""
        result = []
        for idx in range(self.total_pixels):
            ny = self.get_normalized_y(idx)
            if abs(ny - y_normalized) <= thickness:
                result.append(idx)
        return result

    def leds_in_arc(self, angle_start, angle_end, row=None):
        """Get pixels within an angular arc (radians), optionally in one row."""
        result = []
        for idx in range(self.total_pixels):
            a = self.angles[idx]
            if row is not None and self.row_indices[idx] != row:
                continue
            if angle_start <= a <= angle_end:
                result.append(idx)
        return result

    def distance_between(self, idx_a, idx_b):
        """Euclidean distance between two LEDs in cm."""
        pa = self.positions[idx_a]
        pb = self.positions[idx_b]
        return math.sqrt(
            (pa[0] - pb[0]) ** 2 +
            (pa[1] - pb[1]) ** 2 +
            (pa[2] - pb[2]) ** 2
        )

    def to_json(self):
        """Export map data for the simulator."""
        leds = []
        for idx in range(self.total_pixels):
            leds.append({
                "i": idx,
                "x": round(self.positions[idx][0], 2),
                "y": round(self.positions[idx][1], 2),
                "z": round(self.positions[idx][2], 2),
                "row": self.row_indices[idx],
                "col": self.col_indices[idx],
                "angle": round(self.angles[idx], 4),
                "wrap": round(idx / self.pixels_per_wrap, 3),
            })
        return {
            "height": self.height,
            "radius": self.radius,
            "totalLeds": self.total_pixels,
            "rows": self.rows,
            "ledsPerRow": self.leds_per_row,
            "ledsPerWrap": round(self.pixels_per_wrap, 2),
            "totalWraps": round(self.total_wraps, 2),
            "layout": "spiral",
            "leds": leds,
        }
