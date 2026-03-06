# ============================================================
# DiscoTube – Web Server for Phone Control
# Serves UI and handles REST API on the Pico W
# ============================================================

import network
import socket
import time
import ujson
import gc


class DiscoWebServer:
    """
    Lightweight HTTP server for the Pico W.
    Serves the phone control UI and handles REST API requests
    for controlling effects, colors, brightness, music mode, etc.
    """

    MIME_TYPES = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".ico": "image/x-icon",
    }

    def __init__(self, controller, port=80):
        self.controller = controller
        self.port = port
        self.server = None
        self.wlan = None
        self.ip = "0.0.0.0"

    def connect_wifi(self, ssid, password, timeout=20):
        """Connect to WiFi and return IP address."""
        self.wlan = network.WLAN(network.STA_IF)
        self.wlan.active(True)

        # If already connected, just grab the IP
        if self.wlan.isconnected():
            self.ip = self.wlan.ifconfig()[0]
            print(f"WiFi already connected! IP: {self.ip}")
            return self.ip

        self.wlan.connect(ssid, password)

        print(f"Connecting to WiFi '{ssid}'...")
        start = time.time()
        while not self.wlan.isconnected():
            if time.time() - start > timeout:
                raise RuntimeError("WiFi connection timed out")
            time.sleep(0.5)
            print(".", end="")

        self.ip = self.wlan.ifconfig()[0]
        print(f"\nConnected! IP: {self.ip}")
        return self.ip

    def start(self):
        """Start the HTTP server."""
        # Close any leftover socket from a previous run
        if self.server:
            try:
                self.server.close()
            except:
                pass
            self.server = None

        addr = socket.getaddrinfo(self.ip, self.port)[0][-1]

        # Retry binding in case of EADDRINUSE after soft reset
        for attempt in range(5):
            try:
                self.server = socket.socket()
                self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.server.bind(addr)
                self.server.listen(5)
                self.server.settimeout(0.05)
                print(f"DiscoTube server running at http://{self.ip}:{self.port}")
                return
            except OSError as e:
                print(f"Bind attempt {attempt + 1} failed: {e}")
                try:
                    self.server.close()
                except:
                    pass
                self.server = None
                time.sleep(2)

        raise RuntimeError("Could not bind to port after 5 attempts")

    def poll(self):
        """
        Non-blocking poll for incoming HTTP requests.
        Call this in the main loop.
        """
        try:
            cl, addr = self.server.accept()
            cl.settimeout(3)
            try:
                request = cl.recv(4096).decode("utf-8")
                if request:
                    self._handle_request(cl, request)
            except Exception as e:
                print("Request error:", e)
            finally:
                cl.close()
        except OSError:
            pass  # No incoming connection (timeout)
        gc.collect()

    def _handle_request(self, client, request):
        """Parse and route an HTTP request."""
        try:
            lines = request.split("\r\n")
            method, path, _ = lines[0].split(" ", 2)

            # Extract body for POST/PUT
            body = ""
            if "\r\n\r\n" in request:
                body = request.split("\r\n\r\n", 1)[1]

            # Route: API endpoints
            if path.startswith("/api/"):
                self._handle_api(client, method, path, body)
            else:
                # Route: Static files
                self._serve_static(client, path)
        except Exception as e:
            print("Handler error:", e)
            self._send_response(client, 500, "text/plain", "Internal Server Error")

    def _handle_api(self, client, method, path, body):
        """Handle REST API requests."""
        try:
            data = ujson.loads(body) if body else {}
        except:
            data = {}

        ctrl = self.controller
        response = {"ok": True}

        # ── Power ──────────────────────────────────────────
        if path == "/api/power/on":
            ctrl.power_on()
        elif path == "/api/power/off":
            ctrl.power_off()
        elif path == "/api/power/toggle":
            ctrl.toggle_power()

        # ── Brightness ─────────────────────────────────────
        elif path == "/api/brightness":
            if method == "POST" and "value" in data:
                ctrl.set_brightness(data["value"])
            response["brightness"] = ctrl.brightness

        # ── Color ──────────────────────────────────────────
        elif path == "/api/color":
            if method == "POST":
                if "hex" in data:
                    ctrl.set_color_hex(data["hex"])
                elif "r" in data:
                    ctrl.set_color(data["r"], data["g"], data["b"])
            response["color"] = ctrl.current_color

        # ── Color Temperature ──────────────────────────────
        elif path == "/api/colortemp":
            if method == "POST" and "value" in data:
                ctrl.set_color_temp(data["value"])
            response["colorTemp"] = ctrl.color_temp

        # ── Effects ────────────────────────────────────────
        elif path == "/api/effects":
            response["effects"] = ctrl.get_effects_list()
            response["current"] = ctrl.current_effect

        elif path == "/api/effect":
            if method == "POST" and "name" in data:
                ctrl.set_effect(data["name"])
            response["effect"] = ctrl.current_effect

        # ── Speed ──────────────────────────────────────────
        elif path == "/api/speed":
            if method == "POST" and "value" in data:
                ctrl.set_speed(data["value"])
            response["speed"] = ctrl.speed

        # ── Music Mode ─────────────────────────────────────
        elif path == "/api/music/mode":
            if method == "POST" and "mode" in data:
                ctrl.set_music_mode(data["mode"])
            response["musicMode"] = ctrl.music_mode
            response["musicModes"] = ["off", "spectrum", "pulse", "energy", "vu_meter", "equalizer"]

        elif path == "/api/music/sensitivity":
            if method == "POST" and "value" in data:
                ctrl.set_music_sensitivity(data["value"])
            response["sensitivity"] = ctrl.music_sensitivity

        elif path == "/api/music/state":
            response["audio"] = ctrl.get_audio_state()

        # ── Zones ──────────────────────────────────────────
        elif path == "/api/zones":
            if method == "POST":
                ctrl.set_zone_color(data.get("zone", 0),
                                    data.get("r", 255),
                                    data.get("g", 255),
                                    data.get("b", 255))
            response["zones"] = ctrl.get_zones()

        # ── Presets / Scenes ───────────────────────────────
        elif path == "/api/presets":
            response["presets"] = ctrl.get_presets()

        elif path == "/api/preset/apply":
            if method == "POST" and "name" in data:
                ctrl.apply_preset(data["name"])
            response["preset"] = data.get("name")

        elif path == "/api/preset/save":
            if method == "POST" and "name" in data:
                ctrl.save_preset(data["name"])

        # ── Full State ─────────────────────────────────────
        elif path == "/api/state":
            response = ctrl.get_full_state()

        # ── Schedule / Timer ───────────────────────────────
        elif path == "/api/timer":
            if method == "POST":
                ctrl.set_timer(data.get("minutes", 0))
            response["timer"] = ctrl.timer_remaining

        # ── Device Info ─────────────────────────────────────\n        elif path == \"/api/devices\":\n            response[\"device\"] = ctrl.get_device_info()

        else:
            response = {"ok": False, "error": "Unknown endpoint"}

        self._send_json(client, response)

    def _serve_static(self, client, path):
        """Serve static files from the web/ directory, streaming from disk."""
        if path == "/" or path == "":
            path = "/index.html"

        # Security: prevent directory traversal
        path = path.replace("..", "")
        filepath = "web" + path

        # Determine MIME type
        ext = ""
        if "." in path:
            ext = "." + path.rsplit(".", 1)[1]
        content_type = self.MIME_TYPES.get(ext, "text/plain")

        try:
            # Get file size without reading into RAM
            import os
            stat = os.stat(filepath)
            size = stat[6]

            # Send header first
            header = (
                f"HTTP/1.1 200 OK\r\n"
                f"Content-Type: {content_type}\r\n"
                f"Content-Length: {size}\r\n"
                f"Cache-Control: max-age=86400\r\n"
                f"Connection: close\r\n\r\n"
            )
            client.send(header.encode())

            # Stream file in chunks to save RAM
            with open(filepath, "rb") as f:
                while True:
                    chunk = f.read(1024)
                    if not chunk:
                        break
                    client.send(chunk)
        except OSError:
            self._send_response(client, 404, "text/html",
                                "<h1>404</h1>")

    def _send_json(self, client, data):
        """Send a JSON response."""
        body = ujson.dumps(data)
        self._send_response(client, 200, "application/json", body)

    def _send_response(self, client, status, content_type, body):
        """Send an HTTP response."""
        status_text = {200: "OK", 404: "Not Found", 500: "Internal Server Error"}
        header = (
            f"HTTP/1.1 {status} {status_text.get(status, 'Error')}\r\n"
            f"Content-Type: {content_type}\r\n"
            f"Content-Length: {len(body)}\r\n"
            f"Access-Control-Allow-Origin: *\r\n"
            f"Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS\r\n"
            f"Access-Control-Allow-Headers: Content-Type\r\n"
            f"Connection: close\r\n\r\n"
        )
        try:
            client.send(header.encode())
            # Send body in chunks for large responses
            if isinstance(body, str):
                body = body.encode()
            chunk_size = 1024
            for i in range(0, len(body), chunk_size):
                client.send(body[i:i + chunk_size])
        except Exception as e:
            print("Send error:", e)
