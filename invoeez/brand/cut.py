import sys, base64, io
from collections import deque
from PIL import Image
import numpy as np
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)

def cutout(x0, y0, x1, y1, pad=6, full=False, split=None):
    a = im[y0:y1, x0:x1]
    H, W, _ = a.shape
    white = (a.min(axis=2) > 236)
    # background = near-white pixels connected to the border
    bg = np.zeros((H, W), bool); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    if full: bg = white.copy()
    if split is not None: bg[:, split:] |= white[:, split:]
    # edge zone: within 3px of background -> colour-to-alpha against white
    zone = bg.copy()
    for _ in range(3):
        z = zone.copy()
        z[1:] |= zone[:-1]; z[:-1] |= zone[1:]; z[:, 1:] |= zone[:, :-1]; z[:, :-1] |= zone[:, 1:]
        zone = z
    alpha = np.ones((H, W))
    ca = ((255 - a) / 255).max(axis=2)          # GIMP colour-to-alpha for white
    alpha[zone] = ca[zone]
    alpha[bg] = np.minimum(ca[bg], alpha[bg]) * (ca[bg] > 0.06)
    rgb = a.copy()
    m = alpha > 0.001
    for c in range(3):
        rgb[..., c][m] = np.clip((a[..., c][m] - (1 - alpha[m]) * 255) / alpha[m], 0, 255)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    img = img.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(W, bb[2] + pad), min(H, bb[3] + pad)))
    return img

mark = cutout(200, 70, 722, 400)
lock = cutout(200, 70, 1340, 400, split=740 - 200)
word = cutout(755, 150, 1340, 400, full=True)

for name, img in (('mark', mark), ('lockup', lock), ('wordmark', word)):
    img.save(f'{out}/{name}.png')
    print(name, img.size)

def fit(img, h):
    w = round(img.width * h / img.height); return img.resize((w, h), Image.LANCZOS)
def b64(img, fmt, **kw):
    buf = io.BytesIO(); img.save(buf, fmt, **kw); return base64.b64encode(buf.getvalue()).decode()

mk = fit(mark, 128); lk = fit(lock, 160)
fav = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
f = mark.copy(); f.thumbnail((60, 60), Image.LANCZOS); fav.paste(f, ((64 - f.width) // 2, (64 - f.height) // 2), f)
apple = Image.new('RGBA', (180, 180), (255, 255, 255, 255))
f2 = mark.copy(); f2.thumbnail((150, 150), Image.LANCZOS); apple.paste(f2, ((180 - f2.width) // 2, (180 - f2.height) // 2), f2)
assets = {
  'MARK': 'data:image/webp;base64,' + b64(mk, 'WEBP', quality=92, method=6),
  'LOCKUP': 'data:image/webp;base64,' + b64(lk, 'WEBP', quality=92, method=6),
  'FAVICON': 'data:image/png;base64,' + b64(fav, 'PNG', optimize=True),
  'APPLE': 'data:image/png;base64,' + b64(apple.convert('RGB'), 'PNG', optimize=True),
}
for k, v in assets.items(): print(k, len(v) // 1024, 'KB')
import json; json.dump(assets, open(f'{out}/assets.json', 'w'))
mk.save(f'{out}/mark-128.png'); lk.save(f'{out}/lockup-160.png'); fav.save(f'{out}/favicon-64.png'); apple.save(f'{out}/apple-180.png')

# brand colours
A = np.asarray(word).astype(float); sel = A[..., 3] > 250
print('wordmark ink', np.median(A[..., :3][sel], axis=0))
M = np.asarray(mark).astype(float); s2 = M[..., 3] > 250
px = M[..., :3][s2]; lum = px.mean(axis=1)
for lo, hi in ((0, 70), (70, 95), (95, 120), (120, 160), (160, 235)):
    sel2 = (lum >= lo) & (lum < hi)
    if sel2.any(): print('mark band', lo, hi, sel2.sum(), np.median(px[sel2], axis=0))
