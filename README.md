# DiscoTube 🎵💡

## Vertical LED Cylinder Controller

A comprehensive system for controlling a WS2811 addressable LED strip wrapped helically inside a 5-foot white acrylic tube, powered by a Raspberry Pi Pico W with MicroPython. Includes a native mobile app (Android + iOS) and a web-based controller.

### App Preview

<p align="center">
  <img src="docs/preview_colors.png" alt="Colors" width="180"/>
  <img src="docs/preview_effects.png" alt="Effects" width="180"/>
  <img src="docs/preview_music.png" alt="Music" width="180"/>
  <img src="docs/preview_scenes.png" alt="Scenes" width="180"/>
  <img src="docs/preview_settings.png" alt="Settings" width="180"/>
</p>
<p align="center"><i>Colors · Effects · Music · Scenes · Settings</i></p>

> **[▶ Interactive Preview](docs/preview.html)** – Open `docs/preview.html` in any browser to try the full app UI with working tabs, controls, and simulated audio visualizer. No phone or emulator needed.

### Features
- **Direct WS2811 Control** – 100 addressable pixels via Pico W PIO GPIO
- **Native Mobile App** – React Native app for Android & iOS
- **Phone Control** – Full web-based UI served directly from the Pico W
- **Music Reactive** – Real-time audio analysis drives LED patterns
- **3D Simulator** – Browser-based Three.js cylinder visualization
- **20+ Effects** – Rainbow, fire, plasma, matrix, aurora, pulse, and more
- **Zone Control** – Split the cylinder into independent vertical zones
- **Color Picker** – Full HSV/RGB color control
- **Scenes** – Save and recall lighting presets
- **Scheduling** – Timer-based automation

### Hardware Requirements
- Raspberry Pi Pico W
- BTF-LIGHTING WS2811 RGB 5050SMD LED strip (24V, 10m, 100 pixels)
- MAX4466 analog microphone module (for music reactivity)
- 24V DC power supply (5A recommended)
- USB power for Pico W
- 5-foot white acrylic tube (3.25" diameter)
- 12" circular wood base

### Project Structure
```
DiscoTube/
├── pico/                    # MicroPython firmware for Pico W
│   ├── main.py              # Entry point + main controller
│   ├── config.py            # All configuration (WiFi, pins, dimensions)
│   ├── led_driver.py        # WS2811 PIO driver
│   ├── effects.py           # LED effect engine with 26 patterns
│   ├── music.py             # Music/audio reactive module
│   ├── web_server.py        # HTTP server for phone control
│   ├── cylinder.py          # Cylinder geometry mapping
│   └── govee_api.py         # Govee API client (optional)
├── mobile/                  # React Native app (Android + iOS)
│   ├── android/             # Native Android project
│   ├── ios/                 # Native iOS project
│   ├── src/
│   │   ├── screens/         # App screens (Colors, Effects, Music, Scenes, Settings)
│   │   ├── navigation/      # Bottom tab navigator
│   │   ├── services/        # API client for Pico W REST API
│   │   ├── store/           # React Context state management
│   │   └── constants/       # Theme colors, effect lists, presets
│   ├── App.tsx              # App entry point
│   └── package.json
├── web/                     # Phone control UI (served from Pico W)
│   ├── index.html           # Main control interface
│   ├── style.css            # Mobile-first styling
│   └── app.js               # Control logic & REST API client
├── simulator/               # 3D visualization
│   ├── index.html           # Three.js 3D simulator
│   ├── simulator.js         # Cylinder renderer & effect preview
│   └── style.css            # Simulator styling
├── docs/                    # Documentation
│   └── PINOUT.md            # Full pinout & wiring guide
├── firmware.uf2             # MicroPython firmware
└── README.md
```

### Pinout & Wiring
See [docs/PINOUT.md](docs/PINOUT.md) for the full pinout diagram, wiring guide, and hardware specifications.

**Quick reference:**
| Connection | Pico W Pin | Purpose |
|------------|-----------|---------|
| LED Data   | GP28 (Pin 34) | WS2811 data line (PIO) |
| Mic Out    | GP26 (Pin 31) | MAX4466 analog audio |
| Mic VCC    | 3V3 (Pin 36)  | Microphone power |
| GND        | GND (Pin 33)  | Common ground |

### Setup – Pico W
1. Edit `pico/config.py` with your WiFi credentials
2. Flash MicroPython to your Pico W (or use `firmware.uf2`)
3. Upload all files from `pico/` to the Pico W
4. Upload files from `web/` to the Pico W (served as static files)
5. Power on and connect your phone to the same WiFi network
6. Navigate to the Pico W's IP address in your phone browser

### Setup – Mobile App
1. `cd mobile && npm install`
2. **Android:** `npx react-native run-android`
3. **iOS:** `cd ios && pod install && cd .. && npx react-native run-ios`
4. Open the Settings tab in the app and enter the Pico W's IP address

### 3D Simulator
Open `simulator/index.html` in any modern browser to preview effects on a virtual cylinder without hardware.
