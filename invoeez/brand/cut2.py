import sys, io, base64, json
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
def crop(box, pad=8):
    c = im.crop(box); bb = c.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    return c.crop((max(0, bb[0]-pad), max(0, bb[1]-pad), min(c.width, bb[2]+pad), min(c.height, bb[3]+pad)))
mark = crop((0, 0, 800, im.height)); lock = crop((0, 0, im.width, im.height)); word = crop((800, 0, im.width, im.height))
def fit(img, h): return img.resize((round(img.width*h/img.height), h), Image.LANCZOS)
def b64(img, fmt, **kw): b = io.BytesIO(); img.save(b, fmt, **kw); return base64.b64encode(b.getvalue()).decode()
def tile(size, inset):
    t = Image.new('RGBA', (size, size), (0,0,0,0)); d = ImageDraw.Draw(t)
    d.rounded_rectangle((1,1,size-2,size-2), radius=size//5, fill=(255,255,255,255))
    m = mark.copy(); m.thumbnail((size-2*inset, size-2*inset), Image.LANCZOS)
    t.alpha_composite(m, ((size-m.width)//2, (size-m.height)//2)); return t
mk = fit(mark, 128); lk = fit(lock, 150)
fav = tile(64, 2)
apple = tile(180, 14)
for n, i in (('mark', mark), ('lockup', lock), ('wordmark', word)): i.save(f'{out}/{n}.png'); print(n, i.size)
assets = {'MARK': 'data:image/webp;base64,'+b64(mk,'WEBP',quality=92,method=6), 'LOCKUP': 'data:image/webp;base64,'+b64(lk,'WEBP',quality=92,method=6),
          'FAVICON': 'data:image/png;base64,'+b64(fav,'PNG',optimize=True), 'APPLE': 'data:image/png;base64,'+b64(apple,'PNG',optimize=True)}
for k,v in assets.items(): print(k, len(v)//1024, 'KB')
json.dump(assets, open(f'{out}/assets.json','w'))
fav.save(f'{out}/favicon-64.png'); apple.save(f'{out}/apple-180.png'); mk.save(f'{out}/mark-128.png'); lk.save(f'{out}/lockup-150.png')
