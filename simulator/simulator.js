// ============================================================
// DiscoTube 3D Simulator – Three.js Cylinder Visualization
// Renders a 5-foot vertical cylinder with 100 individually
// controllable LED pixels, with real-time effect preview
// and simulated music reactivity.
// ============================================================

// ── Cylinder Configuration ──────────────────────────────────
const CONFIG = {
    heightCm: 152.4,        // 5 feet tall
    diameterCm: 8.255,      // 3 1/4 inch white acrylic tube
    circumferenceCm: 25.93, // pi * diameter
    // LED strip: 1 × WS2811 24V, 10m, 60 LEDs/m, 100 addressable pixels
    stripLengthM: 10,
    totalLeds: 100,         // 100 addressable pixels (6 LEDs per IC)
    pixelSpacingCm: 10.0,   // spacing between addressable pixels
    // Spiral (helix) geometry
    ledsPerWrap: 2.593,     // pixels per 360° revolution (circumference / spacing)
    totalWraps: 38.57,      // total spiral revolutions
    wrapPitchCm: 3.95,      // vertical rise per revolution
    layout: 'spiral',       // LED layout type
    // Virtual grid for grid-based effects (fire, matrix, rain)
    ledsPerRow: 5,          // virtual row width for effects
    rows: 20,               // virtual rows (100 / 5)
    // Rendering
    ledSize: 0.06,          // LED sphere radius (3D units) – larger for fewer pixels
    cylinderScale: 0.02,    // cm -> 3D units
    // Wood base
    baseHeightCm: 5.08,     // 2 inch tall
    baseDiameterCm: 30.48,  // 1 foot (12 inch) circle
};

// ── Three.js Scene Setup ────────────────────────────────────
let scene, camera, renderer, controls;
let ledMeshes = [];
let cylinderMesh;
let autoOrbit = false;
let clock;

// ── Effect State ────────────────────────────────────────────
let currentEffect = 'rainbow';
let musicMode = 'off';
let brightness = 0.8;
let speed = 0.5;
let blur = 0.7;          // 0 = sharp individual LEDs, 1 = max frosted diffusion
let color1 = { r: 255, g: 0, b: 128 };
let color2 = { r: 0, g: 128, b: 255 };
let tick = 0;

// ── Fire heat buffer ────────────────────────────────────────
let fireHeat = new Float32Array(CONFIG.totalLeds);

// ── Rain drops ──────────────────────────────────────────────
let rainDrops = [];

// ── Sparkles ────────────────────────────────────────────────
let sparkles = [];

// ── Audio simulation ────────────────────────────────────────
let audioSim = {
    bass: 0, mid: 0, high: 0, overall: 0,
    beat: false, peak: 0, eq: new Float32Array(20),
};

// FPS counter
let frameCount = 0;
let lastFpsTime = performance.now();

// ── Glow diffusion system ───────────────────────────────
let glowSegments = [];      // inner cylinder ring segments for diffused color
let envLights = [];         // PointLights that cast color onto the room
let diffusionLayer1 = null; // inner diffusion cylinder (stored for blur control)
let diffusionLayer2 = null; // second diffusion shell  (stored for blur control)
const NUM_GLOW_SEGMENTS = 60;  // vertical segments for ultra-smooth color bands
const NUM_ENV_LIGHTS = 8;      // colored lights illuminating the environment

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

function init() {
    const container = document.getElementById('canvas-container');

    // Scene – dark room, lit primarily by the tube itself
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080e);
    scene.fog = new THREE.FogExp2(0x08080e, 0.06);

    // Camera – front-on angle matching the reference photo
    camera = new THREE.PerspectiveCamera(
        42, container.clientWidth / container.clientHeight, 0.1, 100
    );
    camera.position.set(0, 1.8, 5.5);

    // Renderer with shadows for realistic lighting
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.6, 0);
    controls.update();

    // Clock
    clock = new THREE.Clock();

    // Ambient – very dim, the tube provides most illumination
    const ambient = new THREE.AmbientLight(0x0a0a18, 0.35);
    scene.add(ambient);

    // Subtle overhead fill
    const fillLight = new THREE.DirectionalLight(0x1a1a30, 0.12);
    fillLight.position.set(0, 6, 3);
    scene.add(fillLight);

    // Room (floor, wall, baseboard)
    createRoom();

    // Cylinder frame (wood base + acrylic tube)
    createCylinderFrame();

    // LEDs (spiral helix)
    createLEDs();

    // Glow diffusion system (color bands + environment lights)
    createGlowSystem();

    // UI events
    setupControls();

    // Resize handler
    window.addEventListener('resize', onResize);

    // Start animation
    animate();
}

// ═══════════════════════════════════════════════════════════
// 3D OBJECTS
// ═══════════════════════════════════════════════════════════

function createRoom() {
    // ── Hardwood floor ──
    const floorGeo = new THREE.PlaneGeometry(14, 14);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x8B6B42,
        roughness: 0.55,
        metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor plank lines
    for (let i = -8; i <= 8; i++) {
        const plankGeo = new THREE.PlaneGeometry(0.008, 14);
        const plankMat = new THREE.MeshBasicMaterial({
            color: 0x7A5A32, transparent: true, opacity: 0.2,
        });
        const plank = new THREE.Mesh(plankGeo, plankMat);
        plank.rotation.x = -Math.PI / 2;
        plank.position.set(i * 0.65, 0.001, 0);
        scene.add(plank);
    }

    // ── Back wall ──
    const wallGeo = new THREE.PlaneGeometry(14, 8);
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0xB5ADA5,
        roughness: 0.85,
        metalness: 0.0,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -2.5);
    wall.receiveShadow = true;
    scene.add(wall);

    // ── Baseboard molding ──
    const bbGeo = new THREE.BoxGeometry(14, 0.14, 0.05);
    const bbMat = new THREE.MeshStandardMaterial({
        color: 0xE5DDD5, roughness: 0.4,
    });
    const baseboard = new THREE.Mesh(bbGeo, bbMat);
    baseboard.position.set(0, 0.07, -2.475);
    scene.add(baseboard);
}

function createWoodBase() {
    const baseHeight = CONFIG.baseHeightCm * CONFIG.cylinderScale;
    const baseRadius = (CONFIG.baseDiameterCm / 2) * CONFIG.cylinderScale;

    // Main wood base cylinder
    const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 48);
    const woodColor = new THREE.Color(0x8B6914);  // Warm oak wood
    const baseMat = new THREE.MeshStandardMaterial({
        color: woodColor,
        roughness: 0.65,
        metalness: 0.05,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    // Dark wood grain ring on top edge
    const ringGeo = new THREE.TorusGeometry(baseRadius, 0.008, 8, 48);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x5C4010,
        roughness: 0.8,
        metalness: 0.0,
    });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.position.y = baseHeight;
    topRing.rotation.x = Math.PI / 2;
    scene.add(topRing);

    // Bottom edge ring
    const bottomRing = new THREE.Mesh(ringGeo, ringMat);
    bottomRing.position.y = 0.002;
    bottomRing.rotation.x = Math.PI / 2;
    scene.add(bottomRing);

    // Wood grain texture lines (simulated with thin cylinders)
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const grainGeo = new THREE.BoxGeometry(0.002, baseHeight * 0.8, baseRadius * 1.6);
        const grainMat = new THREE.MeshStandardMaterial({
            color: 0x7A5A12,
            roughness: 0.9,
            transparent: true,
            opacity: 0.15,
        });
        const grain = new THREE.Mesh(grainGeo, grainMat);
        grain.position.y = baseHeight / 2;
        grain.rotation.y = angle;
        scene.add(grain);
    }

    return baseHeight;
}

function createCylinderFrame() {
    const baseHeight = createWoodBase();
    const height = CONFIG.heightCm * CONFIG.cylinderScale;
    const radius = (CONFIG.diameterCm / 2) * CONFIG.cylinderScale;
    const yOffset = baseHeight;  // Tube sits on top of the wood base

    // Frosted white acrylic tube – opaque diffuser hides individual LEDs
    const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
    const cylMat = new THREE.MeshPhysicalMaterial({
        color: 0xf0ece8,
        transparent: true,
        opacity: 0.72,
        roughness: 0.7,
        metalness: 0.0,
        transmission: 0.08,
        thickness: 2.0,
        clearcoat: 0.08,
        clearcoatRoughness: 0.5,
        side: THREE.DoubleSide,
        envMapIntensity: 0.15,
    });
    cylinderMesh = new THREE.Mesh(cylGeo, cylMat);
    cylinderMesh.position.y = yOffset + height / 2;
    scene.add(cylinderMesh);

    // Inner diffusion layer – catches color and spreads it
    const innerGeo = new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, height, 64, 1, true);
    const innerMat = new THREE.MeshPhysicalMaterial({
        color: 0xf8f4f0,
        transparent: true,
        opacity: 0.35,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.BackSide,
        emissive: new THREE.Color(0x060606),
    });
    diffusionLayer1 = new THREE.Mesh(innerGeo, innerMat);
    diffusionLayer1.position.y = yOffset + height / 2;
    scene.add(diffusionLayer1);

    // Second inner diffusion shell – extra blurring
    const inner2Geo = new THREE.CylinderGeometry(radius * 0.88, radius * 0.88, height, 48, 1, true);
    const inner2Mat = new THREE.MeshBasicMaterial({
        color: 0xf0ece8,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    diffusionLayer2 = new THREE.Mesh(inner2Geo, inner2Mat);
    diffusionLayer2.position.y = yOffset + height / 2;
    scene.add(diffusionLayer2);

    // White acrylic top cap
    const capGeo = new THREE.CircleGeometry(radius, 48);
    const capMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
        side: THREE.DoubleSide,
    });
    const topCap = new THREE.Mesh(capGeo, capMat);
    topCap.position.y = yOffset + height;
    topCap.rotation.x = -Math.PI / 2;
    scene.add(topCap);

    // Subtle edge rings where tube meets base
    const ringGeo = new THREE.TorusGeometry(radius, 0.004, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });

    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.position.y = yOffset + height;
    topRing.rotation.x = Math.PI / 2;
    scene.add(topRing);

    const bottomRing = new THREE.Mesh(ringGeo, ringMat);
    bottomRing.position.y = yOffset;
    bottomRing.rotation.x = Math.PI / 2;
    scene.add(bottomRing);

    // Store offset for LED placement
    CONFIG._yOffset = yOffset;
}

function createLEDs() {
    const height = CONFIG.heightCm * CONFIG.cylinderScale;
    const radius = (CONFIG.diameterCm / 2) * CONFIG.cylinderScale;
    const yOffset = CONFIG._yOffset || 0;
    const ledsPerWrap = CONFIG.ledsPerWrap; // 7.74 – exact spiral pitch

    const ledGeo = new THREE.SphereGeometry(CONFIG.ledSize * 0.35, 6, 4);

    // ── Spiral guide removed – not visible through frosted acrylic ──

    // ── Place LEDs along the spiral helix (invisible – drive glow only) ──
    for (let idx = 0; idx < CONFIG.totalLeds; idx++) {
        // Continuous spiral position
        const spiralAngle = (idx / ledsPerWrap) * Math.PI * 2;
        const normalizedHeight = idx / (CONFIG.totalLeds - 1);
        const ledRadius = radius * 0.85;
        const x = ledRadius * Math.cos(spiralAngle);
        const z = ledRadius * Math.sin(spiralAngle);
        const y = yOffset + normalizedHeight * height;

        // Virtual grid for grid-based effects (fire, matrix, rain)
        const virtualRow = Math.floor(idx / CONFIG.ledsPerRow);
        const virtualCol = idx % CONFIG.ledsPerRow;

        const ledMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.0,   // controlled by blur potentiometer
        });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(x, y, z);

        // Store metadata – spiral position + virtual grid
        led.userData = {
            index: idx,
            row: virtualRow,            // virtual grid row
            col: virtualCol,            // virtual grid column
            angle: spiralAngle,
            normalizedY: normalizedHeight,
            normalizedAngle: ((spiralAngle / (Math.PI * 2)) % 1 + 1) % 1,
            spiralWrap: idx / ledsPerWrap,  // which revolution (float)
        };

        scene.add(led);
        ledMeshes.push(led);
    }
}

// ═══════════════════════════════════════════════════════════
// GLOW DIFFUSION SYSTEM
// Creates smooth color bands + environment lighting
// ═══════════════════════════════════════════════════════════

function createGlowSystem() {
    const height = CONFIG.heightCm * CONFIG.cylinderScale;
    const radius = (CONFIG.diameterCm / 2) * CONFIG.cylinderScale;
    const yOffset = CONFIG._yOffset || 0;
    const segHeight = height / NUM_GLOW_SEGMENTS;

    // ── Inner glow ring segments ──
    // Main diffused color bands seen through frosted acrylic
    for (let s = 0; s < NUM_GLOW_SEGMENTS; s++) {
        const segGeo = new THREE.CylinderGeometry(
            radius * 0.83, radius * 0.83,
            segHeight * 1.6,   // generous overlap for seamless blending
            32, 1, true
        );
        const segMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const seg = new THREE.Mesh(segGeo, segMat);
        seg.position.y = yOffset + (s + 0.5) * segHeight;
        scene.add(seg);
        glowSegments.push(seg);
    }

    // ── Second (wider) diffuse glow layer ──
    // Creates soft color spread behind acrylic
    for (let s = 0; s < NUM_GLOW_SEGMENTS; s++) {
        const segGeo = new THREE.CylinderGeometry(
            radius * 0.65, radius * 0.65,
            segHeight * 2.0,
            24, 1, true
        );
        const segMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const seg = new THREE.Mesh(segGeo, segMat);
        seg.position.y = yOffset + (s + 0.5) * segHeight;
        scene.add(seg);
        // Push to same array – first 40 are outer ring, next 40 are inner halo
        glowSegments.push(seg);
    }

    // ── Environment point lights ──
    // Cast colored light from the tube onto the room (wall, floor)
    for (let l = 0; l < NUM_ENV_LIGHTS; l++) {
        const frac = (l + 0.5) / NUM_ENV_LIGHTS;
        const ly = yOffset + frac * height;
        const light = new THREE.PointLight(0x000000, 0, 5.0);
        light.position.set(0, ly, 0);
        light.castShadow = false;
        scene.add(light);
        envLights.push(light);
    }
}

function updateGlowSystem(colors) {
    // ── Update glow ring segment colors with heavy blending ──
    for (let s = 0; s < NUM_GLOW_SEGMENTS; s++) {
        const startIdx = Math.floor(s * CONFIG.totalLeds / NUM_GLOW_SEGMENTS);
        const endIdx = Math.min(CONFIG.totalLeds, Math.floor((s + 1) * CONFIG.totalLeds / NUM_GLOW_SEGMENTS));
        let rr = 0, gg = 0, bb = 0, count = 0;

        // Blend radius scales with blur potentiometer (1 = sharp, 16 = max diffusion)
        const blendRadius = Math.max(1, Math.round(2 + blur * 14));
        const blendStart = Math.max(0, startIdx - blendRadius);
        const blendEnd = Math.min(CONFIG.totalLeds, endIdx + blendRadius);
        for (let i = blendStart; i < blendEnd; i++) {
            const c = colors[i] || { r: 0, g: 0, b: 0 };
            // Gaussian-like weight: full in center, tapers at edges
            let dist = 0;
            if (i < startIdx) dist = (startIdx - i) / blendRadius;
            else if (i >= endIdx) dist = (i - endIdx + 1) / blendRadius;
            const weight = Math.max(0.05, 1.0 - dist * dist);
            rr += c.r * weight;
            gg += c.g * weight;
            bb += c.b * weight;
            count += weight;
        }

        if (count > 0) {
            rr = clamp01((rr / count) * brightness);
            gg = clamp01((gg / count) * brightness);
            bb = clamp01((bb / count) * brightness);
        }

        // Outer glow ring layer (index 0..59)
        glowSegments[s].material.color.setRGB(rr, gg, bb);
        const segLum = rr * 0.299 + gg * 0.587 + bb * 0.114;
        const outerBase = 0.1 + blur * 0.5;   // 0.1 at blur=0, 0.6 at blur=1
        const outerRange = 0.2 + blur * 0.4;  // responsive to brightness
        glowSegments[s].material.opacity = outerBase + segLum * outerRange;

        // Inner halo layer (index 60..119)
        if (glowSegments[s + NUM_GLOW_SEGMENTS]) {
            glowSegments[s + NUM_GLOW_SEGMENTS].material.color.setRGB(rr, gg, bb);
            const haloBase = 0.05 + blur * 0.2;
            const haloRange = 0.1 + blur * 0.25;
            glowSegments[s + NUM_GLOW_SEGMENTS].material.opacity = haloBase + segLum * haloRange;
        }
    }

    // ── Update environment point lights ──
    for (let l = 0; l < envLights.length; l++) {
        const startIdx = Math.floor(l * CONFIG.totalLeds / NUM_ENV_LIGHTS);
        const endIdx = Math.min(CONFIG.totalLeds, Math.floor((l + 1) * CONFIG.totalLeds / NUM_ENV_LIGHTS));
        let rr = 0, gg = 0, bb = 0;
        for (let i = startIdx; i < endIdx; i++) {
            const c = colors[i] || { r: 0, g: 0, b: 0 };
            rr += c.r; gg += c.g; bb += c.b;
        }
        const n = endIdx - startIdx;
        rr = clamp01((rr / n) * brightness);
        gg = clamp01((gg / n) * brightness);
        bb = clamp01((bb / n) * brightness);
        envLights[l].color.setRGB(rr, gg, bb);
        const lum = rr * 0.299 + gg * 0.587 + bb * 0.114;
        envLights[l].intensity = lum * 3.0;
    }

    // ── Update acrylic shell tint ──
    if (cylinderMesh) {
        let avgR = 0, avgG = 0, avgB = 0;
        for (const c of colors) {
            avgR += c.r; avgG += c.g; avgB += c.b;
        }
        const n = colors.length;
        avgR = (avgR / n) * brightness;
        avgG = (avgG / n) * brightness;
        avgB = (avgB / n) * brightness;
        const emMul = 0.02 + blur * 0.08;  // emissive strength rises with blur
        cylinderMesh.material.emissive = new THREE.Color(
            avgR * emMul, avgG * emMul, avgB * emMul
        );
        const maxB = Math.max(avgR, avgG, avgB);
        // Acrylic opacity: transparent at blur=0, heavily frosted at blur=1
        cylinderMesh.material.opacity = (0.20 + blur * 0.52) + Math.min(0.18, maxB * 0.15);
        cylinderMesh.material.roughness = 0.2 + blur * 0.6;
        cylinderMesh.material.transmission = 0.35 - blur * 0.30;
    }

    // Update diffusion layers based on blur
    if (diffusionLayer1) {
        diffusionLayer1.material.opacity = blur * 0.45;
    }
    if (diffusionLayer2) {
        diffusionLayer2.material.opacity = blur * 0.22;
    }
}

// ═══════════════════════════════════════════════════════════
// EFFECT ENGINE (JavaScript port mirroring MicroPython)
// ═══════════════════════════════════════════════════════════

function hsvToRgb(h, s, v) {
    h = ((h % 1) + 1) % 1;
    if (s === 0) return { r: v, g: v, b: v };
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));
    switch (i % 6) {
        case 0: return { r: v, g: t, b: p };
        case 1: return { r: q, g: v, b: p };
        case 2: return { r: p, g: v, b: t };
        case 3: return { r: p, g: q, b: v };
        case 4: return { r: t, g: p, b: v };
        default: return { r: v, g: p, b: q };
    }
}

function blend(c1, c2, t) {
    return {
        r: c1.r + (c2.r - c1.r) * t,
        g: c1.g + (c2.g - c1.g) * t,
        b: c1.b + (c2.b - c1.b) * t,
    };
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function getColor1() { return { r: color1.r / 255, g: color1.g / 255, b: color1.b / 255 }; }
function getColor2() { return { r: color2.r / 255, g: color2.g / 255, b: color2.b / 255 }; }

// ── Effects ─────────────────────────────────────────────────

function fx_solid() {
    const c = getColor1();
    return ledMeshes.map(() => c);
}

function fx_rainbow() {
    const t = tick * speed * 0.02;
    return ledMeshes.map((led, i) => {
        const h = (i / CONFIG.totalLeds + t) % 1;
        return hsvToRgb(h, 1, 1);
    });
}

function fx_rainbow_wave() {
    const t = tick * speed * 0.03;
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const h = (ny * 0.5 + na * 0.5 + t) % 1;
        return hsvToRgb(h, 1, 1);
    });
}

function fx_gradient() {
    const c1 = getColor1(), c2 = getColor2();
    return ledMeshes.map(led => blend(c1, c2, led.userData.normalizedY));
}

function fx_breathing() {
    const t = tick * speed * 0.04;
    const intensity = (Math.sin(t) + 1) / 2;
    const c = getColor1();
    return ledMeshes.map(() => ({
        r: c.r * intensity, g: c.g * intensity, b: c.b * intensity,
    }));
}

function fx_pulse() {
    const t = (tick * speed * 0.05) % 1;
    const c = getColor1();
    return ledMeshes.map(led => {
        const ny = led.userData.normalizedY;
        let dist = Math.abs(ny - t);
        if (dist > 0.5) dist = 1 - dist;
        const intensity = Math.max(0, 1 - dist * 8);
        return { r: c.r * intensity, g: c.g * intensity, b: c.b * intensity };
    });
}

function fx_strobe() {
    const on = (tick % Math.max(1, Math.floor(6 - speed * 5))) < 1;
    const c = on ? getColor1() : { r: 0, g: 0, b: 0 };
    return ledMeshes.map(() => c);
}

function fx_fire() {
    // Cooling
    for (let i = 0; i < CONFIG.totalLeds; i++) {
        fireHeat[i] = Math.max(0, fireHeat[i] - Math.random() * 15 / 255);
    }
    // Rising heat
    for (let row = CONFIG.rows - 1; row > 1; row--) {
        for (let col = 0; col < CONFIG.ledsPerRow; col++) {
            const idx = row * CONFIG.ledsPerRow + col;
            const below = (row - 1) * CONFIG.ledsPerRow + col;
            const below2 = Math.max(0, (row - 2) * CONFIG.ledsPerRow + col);
            fireHeat[idx] = (fireHeat[below] + fireHeat[below2]) / 2;
        }
    }
    // Sparking at bottom
    for (let col = 0; col < CONFIG.ledsPerRow; col++) {
        if (Math.random() < 0.25) {
            fireHeat[col] = Math.min(1, fireHeat[col] + 0.5 + Math.random() * 0.5);
        }
    }
    return ledMeshes.map((led, i) => {
        const h = fireHeat[i];
        return {
            r: Math.min(1, h * 3),
            g: Math.max(0, Math.min(1, (h - 0.23) * 1.5)),
            b: Math.max(0, Math.min(1, h / 3 - 0.3)),
        };
    });
}

function fx_ice_fire() {
    const base = fx_fire();
    return base.map(c => ({ r: c.b, g: c.g, b: c.r }));
}

function fx_plasma() {
    const t = tick * speed * 0.03;
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const v1 = Math.sin(ny * 10 + t);
        const v2 = Math.sin(na * 10 + t * 0.7);
        const v3 = Math.sin((ny + na) * 5 + t * 1.3);
        const v = (v1 + v2 + v3 + 3) / 6;
        return hsvToRgb(v, 1, 1);
    });
}

function fx_matrix() {
    const t = tick * speed * 0.08;
    const colors = new Array(CONFIG.totalLeds).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
    for (let col = 0; col < CONFIG.ledsPerRow; col++) {
        const headRow = Math.floor((t * 3 + col * 2.7) % (CONFIG.rows + 8));
        for (let row = 0; row < CONFIG.rows; row++) {
            const idx = row * CONFIG.ledsPerRow + col;
            const dist = headRow - row;
            if (dist >= 0 && dist < 8) {
                const intensity = Math.max(0, 1 - dist / 8);
                colors[idx] = {
                    r: dist === 0 ? 0.23 * intensity : 0,
                    g: intensity,
                    b: 0,
                };
            }
        }
    }
    return colors;
}

function fx_rain() {
    if (tick % Math.max(1, Math.floor(4 - speed * 3)) === 0) {
        rainDrops.push({
            col: Math.floor(Math.random() * CONFIG.ledsPerRow),
            row: 0,
            speed: 0.2 + speed * 0.3,
        });
    }
    const colors = new Array(CONFIG.totalLeds).fill(null).map(() => ({ r: 0, g: 0, b: 0.04 }));
    const alive = [];
    for (const drop of rainDrops) {
        drop.row += drop.speed;
        if (drop.row < CONFIG.rows) {
            alive.push(drop);
            const row = Math.floor(drop.row);
            for (let trail = 0; trail < 4; trail++) {
                const r = row - trail;
                if (r >= 0 && r < CONFIG.rows) {
                    const idx = r * CONFIG.ledsPerRow + drop.col;
                    const intensity = 1 - trail / 4;
                    colors[idx] = {
                        r: 0.39 * intensity,
                        g: 0.59 * intensity,
                        b: intensity,
                    };
                }
            }
        }
    }
    rainDrops = alive.slice(-50);
    return colors;
}

function fx_aurora() {
    const t = tick * speed * 0.02;
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const wave = Math.sin(ny * 4 + na * 2 + t) * 0.5 + 0.5;
        return hsvToRgb(0.3 + wave * 0.3, 0.6 + wave * 0.4, wave * 0.8 + 0.1);
    });
}

function fx_sparkle() {
    const colors = new Array(CONFIG.totalLeds).fill(null).map(() => ({ r: 0.02, g: 0.02, b: 0.06 }));
    for (let i = 0; i < Math.max(1, Math.floor(speed * 5)); i++) {
        sparkles.push({ idx: Math.floor(Math.random() * CONFIG.totalLeds), life: 10 });
    }
    const alive = [];
    for (const sp of sparkles) {
        sp.life--;
        if (sp.life > 0) {
            alive.push(sp);
            const intensity = sp.life / 10;
            colors[sp.idx] = { r: intensity, g: intensity, b: 0.86 * intensity };
        }
    }
    sparkles = alive.slice(-100);
    return colors;
}

function fx_comet() {
    const t = tick * speed * 0.06;
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const cometY = (t * 0.3) % 1;
        const cometA = (t * 2) % 1;
        const dy = Math.abs(ny - cometY);
        const da = Math.min(Math.abs(na - cometA), 1 - Math.abs(na - cometA));
        const dist = Math.sqrt(dy * dy + da * da);
        if (dist < 0.15) {
            const intensity = 1 - dist / 0.15;
            const c = getColor1();
            return { r: c.r * intensity, g: c.g * intensity, b: c.b * intensity };
        }
        return { r: 0, g: 0, b: 0 };
    });
}

function fx_theater_chase() {
    const offset = tick % 3;
    const c = getColor1();
    return ledMeshes.map((led, i) => (i + offset) % 3 === 0 ? c : { r: 0, g: 0, b: 0 });
}

function fx_color_wipe() {
    const t = tick * speed * 0.02;
    const progress = t % 2;
    const c1 = getColor1(), c2 = getColor2();
    return ledMeshes.map(led => {
        const ny = led.userData.normalizedY;
        if (progress < 1) return ny < progress ? c1 : c2;
        return ny < (progress - 1) ? c2 : c1;
    });
}

function fx_twinkle() {
    const t = tick * speed * 0.05;
    return ledMeshes.map((led, i) => {
        const phase = i * 0.73 + t;
        const v = (Math.sin(phase) + 1) / 2;
        const h = (i / CONFIG.totalLeds + t * 0.01) % 1;
        return hsvToRgb(h, 0.6, v * 0.8 + 0.1);
    });
}

function fx_lava_lamp() {
    const t = tick * speed * 0.01;
    const c1 = getColor1(), c2 = getColor2();
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const blob1 = Math.sin(ny * 3 + t) * Math.cos(na * 2 + t * 0.7);
        const blob2 = Math.sin(ny * 2 - t * 0.5) * Math.cos(na * 3 + t * 1.1);
        const v = (blob1 + blob2 + 2) / 4;
        return blend(c1, c2, v);
    });
}

function fx_vortex() {
    const t = tick * speed * 0.05;
    const c = getColor1();
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const spiral = ((na + ny * 3 + t) % 1 + 1) % 1;
        if (spiral < 0.15) {
            const intensity = 1 - spiral / 0.15;
            return { r: c.r * intensity, g: c.g * intensity, b: c.b * intensity };
        }
        return { r: 0, g: 0, b: 0 };
    });
}

function fx_dna_helix() {
    const t = tick * speed * 0.04;
    const c1 = getColor1(), c2 = getColor2();
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const strand1 = ((Math.sin(ny * 8 + t) * 0.5 + 0.5 - na) % 1 + 1) % 1;
        const strand2 = ((Math.sin(ny * 8 + t + Math.PI) * 0.5 + 0.5 - na) % 1 + 1) % 1;
        if (strand1 < 0.08 || Math.abs(1 - strand1) < 0.08) return c1;
        if (strand2 < 0.08 || Math.abs(1 - strand2) < 0.08) return c2;
        return { r: 0, g: 0, b: 0.04 };
    });
}

function fx_equalizer() {
    const colors = new Array(CONFIG.totalLeds).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
    for (let col = 0; col < CONFIG.ledsPerRow; col++) {
        const level = col < audioSim.eq.length ? audioSim.eq[col] : 0;
        const barHeight = Math.floor(level * CONFIG.rows);
        for (let row = 0; row < barHeight; row++) {
            const idx = row * CONFIG.ledsPerRow + col;
            if (idx < CONFIG.totalLeds) {
                const frac = row / CONFIG.rows;
                if (frac < 0.5) {
                    colors[idx] = { r: 0, g: frac * 2, b: 0 };
                } else if (frac < 0.8) {
                    colors[idx] = { r: (frac - 0.5) * 3, g: 1, b: 0 };
                } else {
                    colors[idx] = { r: 1, g: (1 - frac) * 5, b: 0 };
                }
            }
        }
    }
    return colors;
}

function fx_wave() {
    const t = tick * speed * 0.04;
    const c = getColor1();
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const wave = Math.sin(na * Math.PI * 6 + t + ny * 4) * 0.5 + 0.5;
        return blend({ r: 0, g: 0, b: 0.12 }, c, wave);
    });
}

function fx_candy() {
    const t = tick * speed * 0.03;
    const stripeColors = [
        { r: 1, g: 0.2, b: 0.4 }, { r: 1, g: 1, b: 1 },
        { r: 0.4, g: 0.8, b: 1 }, { r: 1, g: 1, b: 1 },
    ];
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const stripe = Math.floor(((ny * 8 + na * 4 + t) % stripeColors.length + stripeColors.length) % stripeColors.length);
        return stripeColors[stripe];
    });
}

function fx_ocean() {
    const t = tick * speed * 0.02;
    return ledMeshes.map(led => {
        const { normalizedY: ny, normalizedAngle: na } = led.userData;
        const wave1 = Math.sin(ny * 6 + t) * 0.3;
        const wave2 = Math.sin(na * 4 + t * 1.3) * 0.2;
        const v = clamp01(wave1 + wave2 + 0.5);
        return { r: 0.08 * v, g: 0.31 + 0.39 * v, b: 0.59 + 0.41 * v };
    });
}

function fx_sunset_glow() {
    const t = tick * speed * 0.01;
    return ledMeshes.map(led => {
        const ny = led.userData.normalizedY;
        const shifted = ((ny + Math.sin(t) * 0.2) % 1 + 1) % 1;
        if (shifted < 0.3) return blend({ r: 1, g: 0.2, b: 0 }, { r: 1, g: 0.59, b: 0 }, shifted / 0.3);
        if (shifted < 0.6) return blend({ r: 1, g: 0.59, b: 0 }, { r: 1, g: 0.31, b: 0.59 }, (shifted - 0.3) / 0.3);
        return blend({ r: 1, g: 0.31, b: 0.59 }, { r: 0.39, g: 0, b: 0.59 }, (shifted - 0.6) / 0.4);
    });
}

// ── Music reactive colors ───────────────────────────────────

function fx_music_spectrum() {
    const third = Math.floor(CONFIG.totalLeds / 3);
    return ledMeshes.map((led, i) => {
        if (i < third) return { r: audioSim.bass, g: 0, b: audioSim.bass * 0.2 };
        if (i < third * 2) return { r: 0, g: audioSim.mid, b: audioSim.mid * 0.4 };
        return { r: 0, g: audioSim.high * 0.4, b: audioSim.high };
    });
}

function fx_music_pulse() {
    if (audioSim.beat) {
        return ledMeshes.map(() => ({ r: 1, g: 0, b: 0.5 }));
    }
    const v = audioSim.overall * 0.12;
    return ledMeshes.map(() => ({ r: v, g: 0, b: v * 0.5 }));
}

function fx_music_energy() {
    const v = audioSim.overall;
    return ledMeshes.map(() => ({ r: v, g: v * 0.4, b: v * 0.2 }));
}

function fx_music_vu() {
    const level = Math.floor(audioSim.peak * CONFIG.totalLeds);
    return ledMeshes.map((led, i) => {
        if (i < level) {
            const frac = i / CONFIG.totalLeds;
            if (frac < 0.5) return { r: 0, g: 1, b: 0 };
            if (frac < 0.8) return { r: 1, g: 1, b: 0 };
            return { r: 1, g: 0, b: 0 };
        }
        return { r: 0, g: 0, b: 0 };
    });
}

// ═══════════════════════════════════════════════════════════
// AUDIO SIMULATION
// ═══════════════════════════════════════════════════════════

function updateAudioSimulation() {
    const t = performance.now() / 1000;

    // Simulate bass/mid/high with different frequency sine waves
    const rawBass = Math.abs(Math.sin(t * 2.1)) * 0.6 + Math.abs(Math.sin(t * 0.7)) * 0.4;
    const rawMid = Math.abs(Math.sin(t * 5.3)) * 0.5 + Math.abs(Math.sin(t * 3.1)) * 0.3;
    const rawHigh = Math.abs(Math.sin(t * 11.7)) * 0.4 + Math.abs(Math.sin(t * 7.9)) * 0.2;

    // Add some randomness for realism
    audioSim.bass = clamp01(rawBass + (Math.random() - 0.5) * 0.1);
    audioSim.mid = clamp01(rawMid + (Math.random() - 0.5) * 0.1);
    audioSim.high = clamp01(rawHigh + (Math.random() - 0.5) * 0.1);
    audioSim.overall = (audioSim.bass * 0.5 + audioSim.mid * 0.3 + audioSim.high * 0.2);
    audioSim.peak = clamp01(audioSim.overall * 1.2 + Math.random() * 0.1);

    // Beat detection simulation
    const beatPulse = Math.sin(t * 4) ** 8;
    audioSim.beat = beatPulse > 0.7;

    // EQ bands
    for (let i = 0; i < 20; i++) {
        const freq = 1 + i * 0.8;
        audioSim.eq[i] = clamp01(
            Math.abs(Math.sin(t * freq + i * 0.5)) * 0.7 +
            Math.random() * 0.3
        );
    }

    // Update UI visualizer
    const bassBar = document.getElementById('viz-bass');
    const midBar = document.getElementById('viz-mid');
    const highBar = document.getElementById('viz-high');
    const beatDot = document.getElementById('beat-dot');

    if (bassBar) bassBar.style.height = (audioSim.bass * 70) + 'px';
    if (midBar) midBar.style.height = (audioSim.mid * 70) + 'px';
    if (highBar) highBar.style.height = (audioSim.high * 70) + 'px';
    if (beatDot) beatDot.classList.toggle('active', audioSim.beat);
}

// ═══════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════

function animate() {
    requestAnimationFrame(animate);

    tick++;

    // Update audio simulation
    if (musicMode !== 'off') {
        updateAudioSimulation();
    }

    // Get LED colors from current effect
    let colors;
    if (musicMode === 'off' || musicMode === 'equalizer') {
        const effectFn = effectMap[musicMode === 'equalizer' ? 'equalizer' : currentEffect];
        colors = effectFn ? effectFn() : fx_rainbow();
    } else {
        const musicFn = musicEffectMap[musicMode];
        colors = musicFn ? musicFn() : fx_rainbow();
    }

    // Apply brightness and update LED meshes (invisible – drive glow only)
    for (let i = 0; i < ledMeshes.length; i++) {
        const c = colors[i] || { r: 0, g: 0, b: 0 };
        const r = clamp01(c.r * brightness);
        const g = clamp01(c.g * brightness);
        const b = clamp01(c.b * brightness);

        ledMeshes[i].material.color.setRGB(r, g, b);
        // At low blur, LEDs become visible; at high blur, fully hidden
        const luminance = r * 0.299 + g * 0.587 + b * 0.114;
        const ledVis = Math.max(0, 1.0 - blur * 1.5);  // fades out by blur ~0.67
        ledMeshes[i].material.opacity = ledVis * (0.3 + luminance * 0.7);
        ledMeshes[i].scale.setScalar(0.5 + (1.0 - blur) * 0.8 + luminance * 0.3);
    }

    // Update glow diffusion system (color bands + environment lights)
    if (colors.length > 0) {
        updateGlowSystem(colors);
    }

    // Auto orbit camera (stays in front of wall)
    if (autoOrbit) {
        const t = clock.getElapsedTime() * 0.2;
        camera.position.x = Math.sin(t) * 3.5;
        camera.position.z = Math.abs(Math.cos(t)) * 2.5 + 2;
        camera.position.y = 1.6 + Math.sin(t * 0.3) * 0.6;
        camera.lookAt(0, 1.6, 0);
    }

    controls.update();
    renderer.render(scene, camera);

    // FPS counter
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }
}

// ═══════════════════════════════════════════════════════════
// EFFECT MAP
// ═══════════════════════════════════════════════════════════

const effectMap = {
    solid: fx_solid, rainbow: fx_rainbow, rainbow_wave: fx_rainbow_wave,
    gradient: fx_gradient, breathing: fx_breathing, pulse: fx_pulse,
    strobe: fx_strobe, fire: fx_fire, ice_fire: fx_ice_fire,
    plasma: fx_plasma, matrix: fx_matrix, rain: fx_rain,
    aurora: fx_aurora, sparkle: fx_sparkle, comet: fx_comet,
    theater_chase: fx_theater_chase, color_wipe: fx_color_wipe,
    twinkle: fx_twinkle, lava_lamp: fx_lava_lamp, vortex: fx_vortex,
    dna_helix: fx_dna_helix, equalizer: fx_equalizer, wave: fx_wave,
    candy: fx_candy, ocean: fx_ocean, sunset_glow: fx_sunset_glow,
};

const musicEffectMap = {
    spectrum: fx_music_spectrum,
    pulse: fx_music_pulse,
    energy: fx_music_energy,
    vu_meter: fx_music_vu,
    equalizer: fx_equalizer,
};

// ═══════════════════════════════════════════════════════════
// UI CONTROLS
// ═══════════════════════════════════════════════════════════

function setupControls() {
    document.getElementById('effect-select').addEventListener('change', (e) => {
        currentEffect = e.target.value;
    });

    document.getElementById('music-mode').addEventListener('change', (e) => {
        musicMode = e.target.value;
    });

    document.getElementById('color1').addEventListener('input', (e) => {
        const hex = e.target.value;
        color1 = {
            r: parseInt(hex.substr(1, 2), 16),
            g: parseInt(hex.substr(3, 2), 16),
            b: parseInt(hex.substr(5, 2), 16),
        };
    });

    document.getElementById('color2').addEventListener('input', (e) => {
        const hex = e.target.value;
        color2 = {
            r: parseInt(hex.substr(1, 2), 16),
            g: parseInt(hex.substr(3, 2), 16),
            b: parseInt(hex.substr(5, 2), 16),
        };
    });

    document.getElementById('brightness').addEventListener('input', (e) => {
        brightness = e.target.value / 100;
        document.getElementById('val-brightness').textContent = e.target.value;
    });

    document.getElementById('speed').addEventListener('input', (e) => {
        speed = e.target.value / 100;
        document.getElementById('val-speed').textContent = e.target.value;
    });

    document.getElementById('blur').addEventListener('input', (e) => {
        blur = e.target.value / 100;
        document.getElementById('val-blur').textContent = e.target.value;
    });
}

function setCameraPreset(preset) {
    autoOrbit = false;
    const height = CONFIG.heightCm * CONFIG.cylinderScale;

    const baseH = CONFIG.baseHeightCm * CONFIG.cylinderScale;
    const centerY = baseH + height / 2;
    switch (preset) {
        case 'front':
            camera.position.set(0, centerY, 4);
            break;
        case 'top':
            camera.position.set(0, baseH + height + 2, 0.1);
            break;
        case 'side':
            camera.position.set(4, centerY, 0);
            break;
        case 'orbit':
            autoOrbit = true;
            break;
    }
    controls.target.set(0, centerY, 0);
    controls.update();
}

function onResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ═══════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════

init();
