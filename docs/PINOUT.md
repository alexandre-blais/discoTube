# DiscoTube – Pico W Pinout & Wiring Guide

## Raspberry Pi Pico W Pinout

```
                    ┌──────────────┐
              GP0  ─┤ 1          40 ├─ VBUS (5V from USB)
              GP1  ─┤ 2          39 ├─ VSYS (1.8V–5.5V input)
              GND  ─┤ 3          38 ├─ GND
              GP2  ─┤ 4          37 ├─ 3V3_EN
              GP3  ─┤ 5          36 ├─ 3V3 (OUT)
              GP4  ─┤ 6          35 ├─ ADC_VREF
              GP5  ─┤ 7          34 ├─ GP28 / ADC2  ◄── LED DATA
              GND  ─┤ 8          33 ├─ GND
              GP6  ─┤ 9          32 ├─ GP27 / ADC1
              GP7  ─┤ 10         31 ├─ GP26 / ADC0  ◄── MIC OUT
              GP8  ─┤ 11         30 ├─ RUN
              GP9  ─┤ 12         29 ├─ GP22
              GND  ─┤ 13         28 ├─ GND
             GP10  ─┤ 14         27 ├─ GP21
             GP11  ─┤ 15         26 ├─ GP20
             GP12  ─┤ 16         25 ├─ GP19
             GP13  ─┤ 17         24 ├─ GP18
              GND  ─┤ 18         23 ├─ GND
             GP14  ─┤ 19         22 ├─ GP17
             GP15  ─┤ 20         21 ├─ GP16
                    └──────────────┘
```

## Wiring Connections

### WS2811 LED Strip → Pico W

| WS2811 Wire | Color  | Pico W Pin           | Notes                                  |
|-------------|--------|----------------------|----------------------------------------|
| DATA        | Green  | **GP28** (Pin 34)    | PIO-driven at 800 kHz                  |
| GND         | White  | **GND** (Pin 33/38)  | Common ground with Pico                |
| +24V        | Red    | **External PSU**     | **NOT** from Pico — needs 24V supply   |

> **Important:** The WS2811 data line is 5V-tolerant. The Pico's 3.3V output works for short runs. For reliability over 10m, add a **SN74HCT125** or similar 3.3V→5V level shifter on the data line.

### MAX4466 Microphone → Pico W

| Mic Pin | Pico W Pin            | Notes                             |
|---------|-----------------------|-----------------------------------|
| OUT     | **GP26 / ADC0** (Pin 31) | Analog audio signal            |
| VCC     | **3V3** (Pin 36)      | 3.3V power supply                 |
| GND     | **GND** (Pin 33/38)   | Common ground                     |

### Power Supply

| Component       | Voltage | Current   | Notes                                   |
|-----------------|---------|------------|----------------------------------------|
| Pico W          | 5V USB  | ~150 mA   | USB-C or micro-USB                      |
| WS2811 Strip    | **24V** | ~5A max   | 100 pixels × 60mA/pixel at full white   |
| MAX4466 Mic     | 3.3V    | ~0.3 mA   | Powered from Pico's 3V3 rail            |

## LED Strip Specifications

| Parameter           | Value                                          |
|---------------------|------------------------------------------------|
| Model               | BTF-LIGHTING WS2811 RGB 5050SMD                |
| Voltage             | 24V DC                                         |
| LEDs per meter      | 60 (physical LEDs)                             |
| Addressable pixels  | 10 per meter (3 LEDs per WS2811 IC)            |
| Total pixels        | **100** addressable pixels                     |
| Total length        | **10 meters**                                  |
| Color order         | **GRB** (standard WS2811)                      |
| Protocol            | 800 kHz NRZ (via Pico PIO state machine)       |
| Max current         | ~5A at full white (derate for typical use)      |

## Cylinder Physical Layout

| Parameter               | Value        |
|--------------------------|-------------|
| Tube height              | 152.4 cm (5 feet)                    |
| Tube outer diameter      | 8.255 cm (3.25 inches)               |
| Tube circumference       | 25.93 cm                             |
| Tube material            | White acrylic                        |
| Pixel spacing            | 10.0 cm between each addressable pixel |
| Pixels per wrap          | ~2.59 (25.93 cm ÷ 10.0 cm)          |
| Total spiral wraps       | ~38.6 revolutions bottom → top       |
| Wrap pitch (vertical rise)| 3.95 cm per revolution              |
| Base                     | 30.48 cm (12 in) diameter × 5.08 cm (2 in) wood |

## Wiring Diagram

```
                                    24V PSU
                                   ┌───────┐
                                   │ +24V  ├────────────── WS2811 +24V (Red)
                                   │  GND  ├──┬────────── WS2811 GND  (White)
                                   └───────┘  │
                                              │
  ┌─────────────────┐                         │
  │   Pico W        │                         │
  │                 │                         │
  │  GP28 (Pin 34) ─┼──── (data) ──────────── WS2811 DATA (Green)
  │                 │                         │
  │  GND  (Pin 33) ─┼────────────────────────┘
  │                 │
  │  GP26 (Pin 31) ─┼──── (analog out) ───── MAX4466 OUT
  │  3V3  (Pin 36) ─┼──── (VCC) ──────────── MAX4466 VCC
  │  GND  (Pin 33) ─┼──── (GND) ──────────── MAX4466 GND
  │                 │
  │  USB-C / 5V    ─┼──── USB power source
  └─────────────────┘
```

## GPIO Summary

| GPIO | Pin # | Function         | Direction | Protocol     |
|------|-------|------------------|-----------|--------------|
| GP28 | 34    | LED strip data   | Output    | PIO / WS2811 |
| GP26 | 31    | Microphone ADC   | Input     | ADC (analog) |

## Software Configuration

All pin assignments and hardware parameters are defined in [`pico/config.py`](../pico/config.py):

```python
LED_PIN = 28        # GPIO28 – WS2811 data line
MIC_PIN = 26        # GPIO26 / ADC0 – MAX4466 microphone
TOTAL_PIXELS = 100  # 100 addressable WS2811 pixels
LED_ORDER = "GRB"   # WS2811 color order
SAMPLE_RATE = 8000  # Audio sample rate (Hz)
```

## Notes

- The Pico W's **WiFi** runs on the **CYW43439** chip and does **not** use any GPIO pins — it communicates over SPI internally.
- GP28 uses the **RP2040 PIO** (Programmable I/O) state machine for precise WS2811 timing — no CPU overhead.
- GP26 is one of three **ADC-capable** pins (GP26, GP27, GP28). GP28 is shared between ADC2 and the LED data line. Since we use GP28 for PIO output, the microphone uses GP26.
- The **3.3V output** on pin 36 can supply up to ~300mA — more than enough for the MAX4466 mic module.
