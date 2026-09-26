"""Puntero virtual Wayland (zwlr_virtual_pointer_v1) sin dependencias: mover y hacer scroll."""
import os, socket, struct, sys, time

def pad(n): return (n + 3) & ~3
def s_str(s):
    b = s.encode() + b"\0"
    return struct.pack("<I", len(b)) + b + b"\0" * (pad(len(b)) - len(b))

class Conn:
    def __init__(self):
        path = os.path.join(os.environ["XDG_RUNTIME_DIR"], os.environ.get("WAYLAND_DISPLAY", "wayland-0"))
        self.s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM); self.s.connect(path); self.buf = b""
    def send(self, obj, op, payload=b""):
        self.s.sendall(struct.pack("<II", obj, ((8 + len(payload)) << 16) | op) + payload)
    def events(self):
        while True:
            while len(self.buf) >= 8:
                obj, so = struct.unpack("<II", self.buf[:8]); size = so >> 16
                if len(self.buf) < size: break
                body, self.buf = self.buf[8:size], self.buf[size:]
                yield obj, so & 0xFFFF, body
            self.buf += self.s.recv(65536)

def globals_(c):
    c.send(1, 1, struct.pack("<I", 2)); c.send(1, 0, struct.pack("<I", 3))
    g = {}
    for obj, op, body in c.events():
        if obj == 2 and op == 0:
            name, ln = struct.unpack("<II", body[:8]); iface = body[8:8 + ln - 1].decode()
            ver = struct.unpack("<I", body[8 + pad(ln):12 + pad(ln)])[0]; g[iface] = (name, ver)
        elif obj == 3 and op == 0:
            return g

def main():
    c = Conn(); g = globals_(c)
    if sys.argv[1] == "list":
        print({k: v for k, v in g.items() if "pointer" in k or k == "wl_seat"}); return
    mgr, seat = g["zwlr_virtual_pointer_manager_v1"], g["wl_seat"]
    c.send(2, 0, struct.pack("<I", mgr[0]) + s_str("zwlr_virtual_pointer_manager_v1") + struct.pack("<II", 1, 4))
    c.send(2, 0, struct.pack("<I", seat[0]) + s_str("wl_seat") + struct.pack("<II", 1, 5))
    c.send(4, 0, struct.pack("<II", 5, 6))
    t = lambda: int(time.monotonic() * 1000) & 0xFFFFFFFF
    W, H = 2560, 1080
    for cmd in sys.argv[1:]:
        kind, *a = cmd.split(":")
        if kind == "move":  # move:x,y  (motion_absolute)
            x, y = map(int, a[0].split(","))
            c.send(6, 1, struct.pack("<IIIII", t(), x, y, W, H)); c.send(6, 4, struct.pack("<I", t()))
        elif kind == "scroll":  # scroll:+1 / scroll:-1  (1 paso de rueda vertical)
            steps = int(a[0])
            c.send(6, 5, struct.pack("<I", 0))  # axis_source wheel
            c.send(6, 7, struct.pack("<IIiI", t(), 0, 15 * 256 * steps, steps & 0xFFFFFFFF))
            c.send(6, 4, struct.pack("<I", t()))
        elif kind == "click":  # click izquierdo (BTN_LEFT) en la posición actual
            for state in (1, 0):
                c.send(6, 2, struct.pack("<III", t(), 0x110, state)); c.send(6, 4, struct.pack("<I", t()))
                time.sleep(0.05)
        elif kind == "sleep":
            time.sleep(float(a[0]))
    time.sleep(0.2); c.send(6, 8)  # destroy
    time.sleep(0.1)

main()
