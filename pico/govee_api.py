# ============================================================
# DiscoTube – Govee API Client for MicroPython (Pico W)
# Controls 2 Govee LED strips via the Govee Developer API
# ============================================================

import urequests
import ujson
import time

API_BASE = "https://developer-api.govee.com/v1"


class GoveeAPI:
    """
    Govee REST API client for MicroPython.
    Supports power, brightness, color, color temperature, and
    device discovery for WiFi-enabled Govee LED strips.
    Rate-limited to respect Govee's 100 req/min cap.
    """

    def __init__(self, api_key, devices_config):
        self.api_key = api_key
        self.devices_config = devices_config
        self.headers = {
            "Govee-API-Key": api_key,
            "Content-Type": "application/json",
        }
        self._last_request_ms = 0
        self._min_interval_ms = 650  # ~100 req/min safety margin
        self.device_states = {}
        for dev in devices_config:
            self.device_states[dev["device"]] = {
                "power": "off",
                "brightness": 80,
                "color": {"r": 255, "g": 255, "b": 255},
                "colorTem": 0,
            }

    def _rate_limit(self):
        """Ensure we don't exceed Govee API rate limits."""
        now = time.ticks_ms()
        elapsed = time.ticks_diff(now, self._last_request_ms)
        if elapsed < self._min_interval_ms:
            time.sleep_ms(self._min_interval_ms - elapsed)
        self._last_request_ms = time.ticks_ms()

    def _send_command(self, device, model, cmd):
        """Send a command to a single Govee device."""
        self._rate_limit()
        url = API_BASE + "/devices/control"
        payload = {
            "device": device,
            "model": model,
            "cmd": cmd,
        }
        try:
            resp = urequests.put(url, json=payload, headers=self.headers)
            result = resp.json()
            resp.close()
            return result
        except Exception as e:
            print("Govee API error:", e)
            return {"error": str(e)}

    def _send_to_all(self, cmd):
        """Send the same command to all configured devices."""
        results = []
        for dev in self.devices_config:
            r = self._send_command(dev["device"], dev["model"], cmd)
            results.append(r)
        return results

    def _send_to_device(self, device_index, cmd):
        """Send command to a specific device by index (0 or 1)."""
        dev = self.devices_config[device_index]
        return self._send_command(dev["device"], dev["model"], cmd)

    # ── Discovery ──────────────────────────────────────────────

    def get_devices(self):
        """Retrieve list of all Govee devices on the account."""
        self._rate_limit()
        url = API_BASE + "/devices"
        try:
            resp = urequests.get(url, headers=self.headers)
            data = resp.json()
            resp.close()
            return data.get("data", {}).get("devices", [])
        except Exception as e:
            print("Device discovery error:", e)
            return []

    # ── Power ──────────────────────────────────────────────────

    def power_on(self, device_index=None):
        """Turn on one or all devices."""
        cmd = {"name": "turn", "value": "on"}
        if device_index is not None:
            self._update_state(device_index, "power", "on")
            return self._send_to_device(device_index, cmd)
        for i in range(len(self.devices_config)):
            self._update_state(i, "power", "on")
        return self._send_to_all(cmd)

    def power_off(self, device_index=None):
        """Turn off one or all devices."""
        cmd = {"name": "turn", "value": "off"}
        if device_index is not None:
            self._update_state(device_index, "power", "off")
            return self._send_to_device(device_index, cmd)
        for i in range(len(self.devices_config)):
            self._update_state(i, "power", "off")
        return self._send_to_all(cmd)

    # ── Brightness ─────────────────────────────────────────────

    def set_brightness(self, brightness, device_index=None):
        """Set brightness (0-100) for one or all devices."""
        brightness = max(0, min(100, int(brightness)))
        cmd = {"name": "brightness", "value": brightness}
        if device_index is not None:
            self._update_state(device_index, "brightness", brightness)
            return self._send_to_device(device_index, cmd)
        for i in range(len(self.devices_config)):
            self._update_state(i, "brightness", brightness)
        return self._send_to_all(cmd)

    # ── Color ──────────────────────────────────────────────────

    def set_color(self, r, g, b, device_index=None):
        """Set RGB color (0-255 each) for one or all devices."""
        r, g, b = max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
        cmd = {"name": "color", "value": {"r": r, "g": g, "b": b}}
        color_val = {"r": r, "g": g, "b": b}
        if device_index is not None:
            self._update_state(device_index, "color", color_val)
            return self._send_to_device(device_index, cmd)
        for i in range(len(self.devices_config)):
            self._update_state(i, "color", color_val)
        return self._send_to_all(cmd)

    def set_color_hex(self, hex_color, device_index=None):
        """Set color from hex string like '#FF00AA'."""
        hex_color = hex_color.lstrip("#")
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return self.set_color(r, g, b, device_index)

    # ── Color Temperature ──────────────────────────────────────

    def set_color_temp(self, temp_k, device_index=None):
        """Set color temperature in Kelvin (2000-9000)."""
        temp_k = max(2000, min(9000, int(temp_k)))
        cmd = {"name": "colorTem", "value": temp_k}
        if device_index is not None:
            self._update_state(device_index, "colorTem", temp_k)
            return self._send_to_device(device_index, cmd)
        for i in range(len(self.devices_config)):
            self._update_state(i, "colorTem", temp_k)
        return self._send_to_all(cmd)

    # ── State Query ────────────────────────────────────────────

    def get_state(self, device_index):
        """Query the current state of a specific device."""
        self._rate_limit()
        dev = self.devices_config[device_index]
        url = (API_BASE + "/devices/state?device=" +
               dev["device"].replace(":", "%3A") +
               "&model=" + dev["model"])
        try:
            resp = urequests.get(url, headers=self.headers)
            data = resp.json()
            resp.close()
            props = data.get("data", {}).get("properties", [])
            state = {}
            for prop in props:
                for k, v in prop.items():
                    state[k] = v
            self.device_states[dev["device"]] = state
            return state
        except Exception as e:
            print("State query error:", e)
            return self.device_states.get(dev["device"], {})

    def get_all_states(self):
        """Query state of all devices."""
        states = []
        for i in range(len(self.devices_config)):
            states.append(self.get_state(i))
        return states

    # ── Zones (Cylinder Segments) ──────────────────────────────

    def set_zone_color(self, zone_index, r, g, b):
        """
        Set color for a specific zone of the cylinder.
        Zone 0 = top strip, Zone 1 = bottom strip.
        """
        return self.set_color(r, g, b, device_index=zone_index)

    def set_gradient(self, color_top, color_bottom):
        """Set a vertical gradient: top strip to one color, bottom to another."""
        self.set_color(*color_top, device_index=0)
        self.set_color(*color_bottom, device_index=1)

    # ── Internal State ─────────────────────────────────────────

    def _update_state(self, device_index, key, value):
        dev_id = self.devices_config[device_index]["device"]
        if dev_id not in self.device_states:
            self.device_states[dev_id] = {}
        self.device_states[dev_id][key] = value

    def get_cached_state(self):
        """Return locally cached state for all devices."""
        result = []
        for dev in self.devices_config:
            result.append({
                "name": dev["name"],
                "device": dev["device"],
                "state": self.device_states.get(dev["device"], {}),
            })
        return result
