// ============================================================
// DiscoTube – Phone Control App (JavaScript)
// Communicates with the Pico W web server via REST API
// ============================================================

const API = '';  // Same origin when served from Pico W
// For development/testing against a different host:
// const API = 'http://192.168.1.100';

let state = {
    power: false,
    brightness: 80,
    speed: 50,
    effect: 'rainbow',
    color: { r: 255, g: 0, b: 128 },
    colorTemp: 4000,
    musicMode: 'off',
    musicSensitivity: 1.0,
    timer: 0,
};

let pollInterval = null;

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initColorWheel();
    initColorPresets();
    initEffectsGrid();
    initMusicModes();
    fetchState();
    startPolling();
});

function startPolling() {
    pollInterval = setInterval(() => {
        if (state.musicMode !== 'off') {
            fetchAudioState();
        }
    }, 200);

    // Poll full state every 5s
    setInterval(fetchState, 5000);
}

// ═══════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════

async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (data) opts.body = JSON.stringify(data);

        const resp = await fetch(API + endpoint, opts);
        const json = await resp.json();

        document.getElementById('connection-status').classList.add('connected');
        return json;
    } catch (e) {
        document.getElementById('connection-status').classList.remove('connected');
        console.error('API error:', e);
        return null;
    }
}

async function fetchState() {
    const s = await apiCall('/api/state');
    if (s) {
        state = { ...state, ...s };
        updateUI();
    }
}

async function fetchAudioState() {
    const s = await apiCall('/api/music/state');
    if (s && s.audio) {
        updateAudioVisualizer(s.audio);
    }
}

// ═══════════════════════════════════════════════════════════
// POWER
// ═══════════════════════════════════════════════════════════

async function togglePower() {
    state.power = !state.power;
    await apiCall('/api/power/toggle', 'POST');
    updatePowerUI();
}

function updatePowerUI() {
    const btn = document.getElementById('btn-power');
    btn.classList.toggle('on', state.power);
}

// ═══════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// COLOR WHEEL
// ═══════════════════════════════════════════════════════════

function initColorWheel() {
    const canvas = document.getElementById('color-wheel');
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 5;

    // Draw HSV color wheel
    for (let angle = 0; angle < 360; angle++) {
        const startAngle = (angle - 1) * Math.PI / 180;
        const endAngle = (angle + 1) * Math.PI / 180;

        const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // Touch/mouse events
    const handleColor = (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        const x = touch.clientX - rect.left - center;
        const y = touch.clientY - rect.top - center;
        const dist = Math.sqrt(x * x + y * y);

        if (dist <= radius) {
            const pixel = ctx.getImageData(
                touch.clientX - rect.left,
                touch.clientY - rect.top,
                1, 1
            ).data;
            setColorRGBDirect(pixel[0], pixel[1], pixel[2]);
        }
    };

    canvas.addEventListener('mousedown', handleColor);
    canvas.addEventListener('mousemove', (e) => { if (e.buttons) handleColor(e); });
    canvas.addEventListener('touchstart', handleColor, { passive: false });
    canvas.addEventListener('touchmove', handleColor, { passive: false });
}

// ═══════════════════════════════════════════════════════════
// COLOR CONTROLS
// ═══════════════════════════════════════════════════════════

function setColorRGBDirect(r, g, b) {
    state.color = { r, g, b };
    updateColorUI();
    apiCall('/api/color', 'POST', { r, g, b });
}

function setColorRGB() {
    const r = parseInt(document.getElementById('r-input').value) || 0;
    const g = parseInt(document.getElementById('g-input').value) || 0;
    const b = parseInt(document.getElementById('b-input').value) || 0;
    setColorRGBDirect(r, g, b);
}

function setColorHex(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 6) {
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        setColorRGBDirect(r, g, b);
    }
}

function updateColorUI() {
    const { r, g, b } = state.color;
    const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');

    document.getElementById('hex-input').value = hex;
    document.getElementById('r-input').value = r;
    document.getElementById('g-input').value = g;
    document.getElementById('b-input').value = b;

    const preview = document.getElementById('color-preview');
    preview.style.background = hex;
    preview.style.boxShadow = `0 0 20px ${hex}80`;
}

// ═══════════════════════════════════════════════════════════
// COLOR PRESETS
// ═══════════════════════════════════════════════════════════

const COLOR_PRESETS = {
    warm_white: [255, 200, 150], cool_white: [200, 220, 255],
    red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255],
    purple: [128, 0, 255], orange: [255, 100, 0], cyan: [0, 255, 255],
    pink: [255, 50, 150], gold: [255, 180, 0],
    disco_pink: [255, 0, 128], neon_green: [57, 255, 20],
    deep_blue: [0, 0, 180], sunset: [255, 80, 20], ice: [150, 220, 255],
};

function initColorPresets() {
    const grid = document.getElementById('color-presets');
    for (const [name, [r, g, b]] of Object.entries(COLOR_PRESETS)) {
        const swatch = document.createElement('div');
        swatch.className = 'preset-swatch';
        swatch.style.background = `rgb(${r},${g},${b})`;
        swatch.onclick = () => {
            setColorRGBDirect(r, g, b);
            apiCall('/api/preset/apply', 'POST', { name });
        };

        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = name.replace(/_/g, ' ');
        swatch.appendChild(tooltip);

        grid.appendChild(swatch);
    }
}

// ═══════════════════════════════════════════════════════════
// Color Temperature
// ═══════════════════════════════════════════════════════════

function setColorTemp(value) {
    state.colorTemp = parseInt(value);
    document.getElementById('temp-value').textContent = value + 'K';
    apiCall('/api/colortemp', 'POST', { value: parseInt(value) });
}

// ═══════════════════════════════════════════════════════════
// BRIGHTNESS & SPEED
// ═══════════════════════════════════════════════════════════

function setBrightness(value) {
    state.brightness = parseInt(value);
    document.getElementById('brightness-value').textContent = value + '%';
    apiCall('/api/brightness', 'POST', { value: parseInt(value) });
}

function setSpeed(value) {
    state.speed = parseInt(value);
    document.getElementById('speed-value').textContent = value + '%';
    apiCall('/api/speed', 'POST', { value: parseInt(value) });
}

// ═══════════════════════════════════════════════════════════
// EFFECTS
// ═══════════════════════════════════════════════════════════

const EFFECT_ICONS = {
    solid: '⬛', rainbow: '🌈', rainbow_wave: '🌊', gradient: '📊',
    breathing: '💨', pulse: '💗', strobe: '⚡', fire: '🔥',
    ice_fire: '🧊', plasma: '🟣', matrix: '💚', rain: '🌧️',
    aurora: '🌌', sparkle: '✨', comet: '☄️', theater_chase: '🎭',
    color_wipe: '🖌️', twinkle: '⭐', lava_lamp: '🫧', vortex: '🌀',
    dna_helix: '🧬', equalizer: '📊', wave: '〰️', candy: '🍬',
    ocean: '🐋', sunset_glow: '🌅',
};

function initEffectsGrid() {
    const grid = document.getElementById('effects-grid');
    const effects = [
        'solid', 'rainbow', 'rainbow_wave', 'gradient', 'breathing',
        'pulse', 'strobe', 'fire', 'ice_fire', 'plasma',
        'matrix', 'rain', 'aurora', 'sparkle', 'comet',
        'theater_chase', 'color_wipe', 'twinkle', 'lava_lamp',
        'vortex', 'dna_helix', 'equalizer', 'wave', 'candy',
        'ocean', 'sunset_glow',
    ];

    effects.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'effect-btn';
        btn.dataset.effect = name;
        btn.textContent = (EFFECT_ICONS[name] || '💡') + ' ' + name.replace(/_/g, ' ');
        btn.onclick = () => setEffect(name);
        grid.appendChild(btn);
    });
}

function setEffect(name) {
    state.effect = name;
    updateEffectsUI();
    apiCall('/api/effect', 'POST', { name });
}

function updateEffectsUI() {
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.effect === state.effect);
    });
}

// ═══════════════════════════════════════════════════════════
// MUSIC
// ═══════════════════════════════════════════════════════════

const MUSIC_MODES = [
    { id: 'off', label: '🔇 Off' },
    { id: 'spectrum', label: '🌈 Spectrum' },
    { id: 'pulse', label: '💗 Pulse' },
    { id: 'energy', label: '⚡ Energy' },
    { id: 'vu_meter', label: '📊 VU Meter' },
    { id: 'equalizer', label: '🎛️ Equalizer' },
];

function initMusicModes() {
    const grid = document.getElementById('music-modes');
    MUSIC_MODES.forEach(mode => {
        const btn = document.createElement('button');
        btn.className = 'effect-btn';
        btn.dataset.mode = mode.id;
        btn.textContent = mode.label;
        btn.onclick = () => setMusicMode(mode.id);
        grid.appendChild(btn);
    });
}

function setMusicMode(mode) {
    state.musicMode = mode;
    updateMusicUI();
    apiCall('/api/music/mode', 'POST', { mode });
}

function setMusicSensitivity(value) {
    const sensitivity = value / 100;
    state.musicSensitivity = sensitivity;
    document.getElementById('sensitivity-value').textContent = sensitivity.toFixed(1) + 'x';
    apiCall('/api/music/sensitivity', 'POST', { value: sensitivity });
}

function updateMusicUI() {
    document.querySelectorAll('#music-modes .effect-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.musicMode);
    });
}

// ═══════════════════════════════════════════════════════════
// AUDIO VISUALIZER
// ═══════════════════════════════════════════════════════════

function updateAudioVisualizer(audio) {
    // Update frequency bars
    const bassBar = document.getElementById('bar-bass');
    const midBar = document.getElementById('bar-mid');
    const highBar = document.getElementById('bar-high');

    if (bassBar) bassBar.style.width = (audio.bass * 100) + '%';
    if (midBar) midBar.style.width = (audio.mid * 100) + '%';
    if (highBar) highBar.style.width = (audio.high * 100) + '%';

    // Beat indicator
    const beatEl = document.getElementById('beat-indicator');
    if (beatEl) {
        beatEl.classList.toggle('active', audio.beat);
    }

    // Draw EQ visualization on canvas
    const canvas = document.getElementById('audio-viz');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#14141f';
    ctx.fillRect(0, 0, w, h);

    if (audio.eq && audio.eq.length > 0) {
        const barWidth = w / audio.eq.length - 2;
        audio.eq.forEach((val, i) => {
            const barHeight = val * h * 0.9;
            const x = i * (barWidth + 2) + 1;
            const y = h - barHeight;

            // Gradient per bar
            const gradient = ctx.createLinearGradient(x, h, x, y);
            gradient.addColorStop(0, '#ff0080');
            gradient.addColorStop(0.5, '#a855f7');
            gradient.addColorStop(1, '#00d4ff');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Glow on top
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(x, y, barWidth, 2);
        });
    }
}

// ═══════════════════════════════════════════════════════════
// ZONES
// ═══════════════════════════════════════════════════════════

function setZoneColor(zone, hexColor) {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    apiCall('/api/zones', 'POST', { zone, r, g, b });
}

function applyGradient() {
    const topColor = document.getElementById('zone-0-color').value;
    const bottomColor = document.getElementById('zone-1-color').value;
    setZoneColor(0, topColor);
    setTimeout(() => setZoneColor(1, bottomColor), 700);
    setEffect('gradient');
}

// ═══════════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════════

function setTimer(minutes) {
    apiCall('/api/timer', 'POST', { minutes });
    const statusEl = document.getElementById('timer-status');
    if (minutes > 0) {
        statusEl.textContent = `⏱️ Auto-off in ${minutes} minutes`;
    } else {
        statusEl.textContent = '';
    }
}

// ═══════════════════════════════════════════════════════════
// SCENES
// ═══════════════════════════════════════════════════════════

const QUICK_SCENES = {
    party:    { effect: 'rainbow_wave', speed: 80, brightness: 100, color: [255, 0, 128] },
    chill:    { effect: 'breathing', speed: 20, brightness: 50, color: [0, 128, 255] },
    focus:    { effect: 'solid', speed: 50, brightness: 70, color: [255, 200, 150] },
    romantic: { effect: 'lava_lamp', speed: 25, brightness: 40, color: [255, 50, 100] },
    ocean:    { effect: 'ocean', speed: 30, brightness: 60, color: [0, 100, 200] },
    forest:   { effect: 'aurora', speed: 30, brightness: 50, color: [0, 200, 50] },
    sunset:   { effect: 'sunset_glow', speed: 15, brightness: 70, color: [255, 80, 20] },
    disco:    { effect: 'strobe', speed: 90, brightness: 100, color: [255, 0, 255] },
};

function applyQuickScene(name) {
    const scene = QUICK_SCENES[name];
    if (!scene) return;

    state.effect = scene.effect;
    state.speed = scene.speed;
    state.brightness = scene.brightness;
    state.color = { r: scene.color[0], g: scene.color[1], b: scene.color[2] };

    // Send multiple API calls
    apiCall('/api/effect', 'POST', { name: scene.effect });
    apiCall('/api/speed', 'POST', { value: scene.speed });
    apiCall('/api/brightness', 'POST', { value: scene.brightness });
    apiCall('/api/color', 'POST', { r: scene.color[0], g: scene.color[1], b: scene.color[2] });

    updateUI();
}

async function saveScene() {
    const nameInput = document.getElementById('scene-name');
    const name = nameInput.value.trim();
    if (!name) return;

    await apiCall('/api/preset/save', 'POST', { name });
    nameInput.value = '';
    loadSavedScenes();
}

async function loadSavedScenes() {
    const result = await apiCall('/api/presets');
    if (!result || !result.presets) return;

    const container = document.getElementById('saved-scenes');
    container.innerHTML = '';

    for (const [name, preset] of Object.entries(result.presets)) {
        if (preset.type === 'scene') {
            const btn = document.createElement('button');
            btn.className = 'scene-btn';
            btn.textContent = '🎬 ' + name;
            btn.onclick = () => apiCall('/api/preset/apply', 'POST', { name });
            container.appendChild(btn);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// DEVICE DISCOVERY
// ═══════════════════════════════════════════════════════════

async function discoverDevices() {
    const info = document.getElementById('device-info');
    info.textContent = 'Querying...';
    const result = await apiCall('/api/devices');
    if (result && result.device) {
        info.textContent = JSON.stringify(result.device, null, 2);
    } else {
        info.textContent = 'No device info available.';
    }
}

// ═══════════════════════════════════════════════════════════
// UI UPDATE
// ═══════════════════════════════════════════════════════════

function updateUI() {
    updatePowerUI();
    updateColorUI();
    updateEffectsUI();
    updateMusicUI();

    document.getElementById('brightness').value = state.brightness;
    document.getElementById('brightness-value').textContent = state.brightness + '%';
    document.getElementById('speed').value = state.speed;
    document.getElementById('speed-value').textContent = state.speed + '%';
    document.getElementById('color-temp').value = state.colorTemp;
    document.getElementById('temp-value').textContent = state.colorTemp + 'K';

    const sensPct = Math.round(state.musicSensitivity * 100);
    document.getElementById('music-sensitivity').value = sensPct;
    document.getElementById('sensitivity-value').textContent = state.musicSensitivity.toFixed(1) + 'x';
}
