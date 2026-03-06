# ============================================================
# DiscoTube – WS2811 LED Strip Driver
# Direct NeoPixel control via Pico W GPIO using PIO
# ============================================================

import array
import time

try:
    from machine import Pin
    import rp2
    HARDWARE = True
except ImportError:
    HARDWARE = False


class LEDStrip:
    """
    Drives a WS2811 addressable LED strip directly from a Pico W
    GPIO pin using the RP2040 PIO (Programmable I/O) state machine.

    WS2811 specs:
      - 24V, data signal is 5V tolerant (3.3V from Pico works
        with short runs or a level shifter for reliability)
      - GRB color order (standard for WS2811/WS2812)
      - 800kHz data rate
      - 100 addressable pixels (each IC controls 3 physical LEDs)
    """

    def __init__(self, pin_num, num_pixels, order="GRB"):
        self.num_pixels = num_pixels
        self.order = order
        self._brightness = 1.0

        # Pixel buffer: array of 32-bit values (packed GRB)
        self.pixels = array.array("I", [0] * num_pixels)

        if HARDWARE:
            self._setup_pio(pin_num)
        else:
            self._sm = None

    def _setup_pio(self, pin_num):
        """Configure PIO state machine for WS2811/WS2812 protocol."""

        # PIO program for WS2812/WS2811 at 800kHz
        @rp2.asm_pio(sideset_init=rp2.PIO.OUT_LOW,
                      out_shiftdir=rp2.PIO.SHIFT_LEFT,
                      autopull=True, pull_thresh=24)
        def ws2812():
            # Timing: T0H=0.4us T0L=0.85us T1H=0.8us T1L=0.45us
            # At 800kHz, each bit = 1.25us
            wrap_target()
            label("bitloop")
            out(x, 1)               .side(0)    [2]
            jmp(not_x, "do_zero")   .side(1)    [1]
            jmp("bitloop")          .side(1)    [4]
            label("do_zero")
            nop()                   .side(0)    [4]
            wrap()

        self._sm = rp2.StateMachine(
            0, ws2812,
            freq=8_000_000,
            sideset_base=Pin(pin_num)
        )
        self._sm.active(1)

    def set_brightness(self, brightness):
        """Set global brightness 0-100."""
        self._brightness = max(0, min(100, brightness)) / 100.0

    def set_pixel(self, index, r, g, b):
        """Set a single pixel color (0-255 per channel)."""
        if 0 <= index < self.num_pixels:
            # Apply brightness
            br = self._brightness
            r = int(r * br)
            g = int(g * br)
            b = int(b * br)
            # Pack as GRB (WS2811 standard)
            if self.order == "GRB":
                self.pixels[index] = (g << 16) | (r << 8) | b
            elif self.order == "RGB":
                self.pixels[index] = (r << 16) | (g << 8) | b
            else:  # BRG
                self.pixels[index] = (b << 16) | (r << 8) | g

    def set_all(self, colors):
        """
        Set all pixels from a list of (r, g, b) tuples.
        colors must be a list of exactly num_pixels tuples.
        """
        br = self._brightness
        for i in range(min(len(colors), self.num_pixels)):
            r, g, b = colors[i]
            r = int(r * br)
            g = int(g * br)
            b = int(b * br)
            if self.order == "GRB":
                self.pixels[i] = (g << 16) | (r << 8) | b
            elif self.order == "RGB":
                self.pixels[i] = (r << 16) | (g << 8) | b
            else:
                self.pixels[i] = (b << 16) | (r << 8) | g

    def show(self):
        """Push pixel buffer to the LED strip."""
        if self._sm:
            self._sm.put(self.pixels, 8)
            time.sleep_us(60)  # Reset signal (>50us low)

    def clear(self):
        """Turn off all pixels."""
        for i in range(self.num_pixels):
            self.pixels[i] = 0
        self.show()

    def fill(self, r, g, b):
        """Set all pixels to the same color."""
        self.set_all([(r, g, b)] * self.num_pixels)
        self.show()
