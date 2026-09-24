/* Finds and downloads a product's main photo from its official manufacturer page.
   Shared by `npm run photos:fetch` (run on your own computer) and by server.js, which
   fetches any missing photos in the background after it starts. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&quot;/g, '"');
const absolute = (url, base) => { try { return new URL(decode(url.trim()), base).href; } catch { return null; } };

/* the page's own choice of main image, in order of how reliably sites fill it in */
export function findImage(html, page) {
  const meta = (name) => {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i'))?.[0];
    return tag?.match(/content=["']([^"']+)["']/i)?.[1];
  };
  for (const name of ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) {
    const url = meta(name);
    if (url) return absolute(url, page);
  }
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = [].concat(JSON.parse(block[1]));
      for (const item of data.flatMap((d) => d['@graph'] || [d])) {
        const img = item && /Product/i.test(item['@type']) && [].concat(item.image || [])[0];
        const url = typeof img === 'string' ? img : img?.url;
        if (url) return absolute(url, page);
      }
    } catch { /* not every block is valid JSON */ }
  }
  /* last resort: the first image that looks like a product shot */
  const img = [...html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/gi)].map((m) => m[1])
    .find((src) => /product|pro_|upload|media|images/i.test(src) && !/logo|icon|sprite|banner/i.test(src));
  return img ? absolute(img, page) : null;
}

async function get(url, accept, timeoutMs) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept, 'accept-language': 'en' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

/* -> { buffer, ext, image } or throws with a short reason */
export async function fetchOfficialPhoto({ page, image }, { timeoutMs = 30000 } = {}) {
  let url = image;
  if (!url) {
    if (!page) throw new Error('no official source listed');
    url = findImage(await (await get(page, 'text/html', timeoutMs)).text(), page);
    if (!url) throw new Error('page has no product image');
  }
  const res = await get(url, 'image/avif,image/webp,image/png,image/jpeg,*/*', timeoutMs);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  const ext = PHOTO_TYPES[type] || (url.match(/\.(jpe?g|png|webp|avif)(?:$|\?)/i)?.[1] || '').toLowerCase().replace('jpeg', 'jpg');
  if (!ext) throw new Error(`not a photo (${type || 'unknown type'})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 4000) throw new Error('image too small');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('image too large');
  return { buffer, ext, image: url };
}
