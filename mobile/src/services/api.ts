// ============================================================
// DiscoTube Mobile – API Service
// Communicates with the Pico W REST API over WiFi
// ============================================================

const DEFAULT_TIMEOUT = 5000;

class DiscoTubeAPI {
  private baseUrl: string = '';
  private connected: boolean = false;

  setHost(ip: string): void {
    this.baseUrl = `http://${ip}`;
  }

  getHost(): string {
    return this.baseUrl;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: Record<string, any>,
  ): Promise<T | null> {
    if (!this.baseUrl) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const opts: RequestInit = {
        method,
        headers: {'Content-Type': 'application/json'},
        signal: controller.signal,
      };
      if (data) {
        opts.body = JSON.stringify(data);
      }

      const resp = await fetch(this.baseUrl + endpoint, opts);
      clearTimeout(timeout);

      const json = await resp.json();
      this.connected = true;
      return json as T;
    } catch (e) {
      this.connected = false;
      console.warn('API error:', endpoint, e);
      return null;
    }
  }

  // ── Power ─────────────────────────────────────────────
  togglePower() {
    return this.request('/api/power/toggle', 'POST');
  }
  powerOn() {
    return this.request('/api/power/on', 'POST');
  }
  powerOff() {
    return this.request('/api/power/off', 'POST');
  }

  // ── State ─────────────────────────────────────────────
  getState() {
    return this.request<DiscoTubeState>('/api/state');
  }

  // ── Brightness ────────────────────────────────────────
  setBrightness(value: number) {
    return this.request('/api/brightness', 'POST', {value});
  }

  // ── Speed ─────────────────────────────────────────────
  setSpeed(value: number) {
    return this.request('/api/speed', 'POST', {value});
  }

  // ── Color ─────────────────────────────────────────────
  setColor(r: number, g: number, b: number) {
    return this.request('/api/color', 'POST', {r, g, b});
  }
  setColorHex(hex: string) {
    return this.request('/api/color', 'POST', {hex});
  }

  // ── Color Temperature ─────────────────────────────────
  setColorTemp(value: number) {
    return this.request('/api/colortemp', 'POST', {value});
  }

  // ── Effects ───────────────────────────────────────────
  setEffect(name: string) {
    return this.request('/api/effect', 'POST', {name});
  }
  getEffects() {
    return this.request('/api/effects');
  }

  // ── Music ─────────────────────────────────────────────
  setMusicMode(mode: string) {
    return this.request('/api/music/mode', 'POST', {mode});
  }
  setMusicSensitivity(value: number) {
    return this.request('/api/music/sensitivity', 'POST', {value});
  }
  getMusicState() {
    return this.request('/api/music/state');
  }

  // ── Zones ─────────────────────────────────────────────
  setZoneColor(zone: number, r: number, g: number, b: number) {
    return this.request('/api/zones', 'POST', {zone, r, g, b});
  }

  // ── Presets / Scenes ──────────────────────────────────
  getPresets() {
    return this.request('/api/presets');
  }
  applyPreset(name: string) {
    return this.request('/api/preset/apply', 'POST', {name});
  }
  savePreset(name: string) {
    return this.request('/api/preset/save', 'POST', {name});
  }

  // ── Timer ─────────────────────────────────────────────
  setTimer(minutes: number) {
    return this.request('/api/timer', 'POST', {minutes});
  }

  // ── Device Info ───────────────────────────────────────
  getDeviceInfo() {
    return this.request('/api/devices');
  }
}

// ── Types ─────────────────────────────────────────────────
export interface DiscoTubeState {
  power: boolean;
  brightness: number;
  speed: number;
  effect: string;
  color: {r: number; g: number; b: number};
  colorTemp: number;
  musicMode: string;
  musicSensitivity: number;
  timer: number;
  effects: string[];
  musicModes: string[];
  audio: AudioState;
  zones: {name: string; zone: [number, number]}[];
  ip: string;
}

export interface AudioState {
  bass: number;
  mid: number;
  high: number;
  overall: number;
  beat: boolean;
  peak: number;
  eq: number[];
}

// Singleton
export const api = new DiscoTubeAPI();
export default api;
