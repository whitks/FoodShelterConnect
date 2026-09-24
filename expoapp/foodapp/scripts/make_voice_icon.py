"""Generate a simple microphone tab icon (voice.png) for the expoapp tab bar.

Pure stdlib (struct + zlib) — no Pillow required. Draws a classic mic shape
(mic capsule + stem + side mounts + base) as a single-color alpha mask at
96x96, supersampled 4x for smooth edges. Template rendering mode will tint it.
"""
import struct
import zlib
from pathlib import Path

W = H = 96
SS = 4  # supersample factor
SW = W * SS

OUT = Path(r"C:\Users\krish\Desktop\AI-gents\FoodShelter\expoapp\foodapp\assets\images\tabIcons\voice.png")


def in_mic(x: float, y: float) -> bool:
    """Point-in-mic test (coordinates in 96x96 space)."""
    # Mic capsule: vertical rounded rect, top of capsule.
    cx, cy, hw, hh, r = 48, 36, 16, 21, 12
    dx = max(abs(x - cx) - (hw - r), 0.0)
    dy = max(abs(y - cy) - (hh - r), 0.0)
    if dx * dx + dy * dy <= r * r:
        return True
    # Stem
    if 45.5 <= x <= 50.5 and 56 <= y <= 70:
        return True
    # Side mounts (discs)
    for mx, my in ((27, 64), (69, 64)):
        if (x - mx) ** 2 + (y - my) ** 2 <= 5.5 ** 2:
            return True
    # Base disc
    if (x - 48) ** 2 + (y - 75) ** 2 <= 8 ** 2:
        return True
    return False


def coverage(x0: float, y0: float) -> int:
    """Fraction (0..SS*SS) of the supersampled cell covered by the mic."""
    hit = 0
    for i in range(SS):
        for j in range(SS):
            if in_mic(x0 + (i + 0.5) / SS, y0 + (j + 0.5) / SS):
                hit += 1
    return hit


def chunk(tag: bytes, data: bytes) -> bytes:
    c = struct.pack(">I", len(data)) + tag + data
    c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    return c


rows = bytearray()
for py in range(H):
    row = bytearray()
    for px in range(W):
        cov = coverage(px, py)
        if cov == 0:
            row += b"\x00\x00\x00\x00"
        else:
            a = round(255 * cov / (SS * SS))
            row += bytes((0, 0, 0, a))  # black, alpha mask
    rows += b"\x00" + bytes(row)  # filter byte 0

raw = zlib.compress(bytes(rows), 9)
png = (
    b"\x89PNG\r\n\x1a\n"
    + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
    + chunk(b"IDAT", raw)
    + chunk(b"IEND", b"")
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(png)
print(f"Wrote {OUT} ({len(png)} bytes)")