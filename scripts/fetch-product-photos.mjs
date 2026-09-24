/* Downloads product photos from the official manufacturer pages listed in
   src/catalog/photo-sources.json and saves them as assets/products/{id}.{ext}.
   The build (scripts/product-photos.mjs) then trims, centres and optimises them.

   Run it on a computer with normal internet access:
     npm run photos:fetch                 fetch every product that has no photo yet
     npm run photos:fetch -- --force      replace photos that already exist
     npm run photos:fetch -- b100 k120    only these products

   For each page it takes the page's main product image (og:image, twitter:image or the
   product's structured data). A product's "image" field, when set, is used instead.
   reports/photo-fetch.csv lists what was saved and from where. Look through the photos
   before publishing: make sure each one shows the model and colour you sell, and use
   manufacturer images only where the brand or your distributor allows resellers to. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));
const OUT = 'assets/products';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = new Set(args.filter((a) => !a.startsWith('--')));
const { products: sources } = JSON.parse(readFileSync('src/catalog/photo-sources.json', 'utf8'));
const catalog = JSON.parse(readFileSync('src/catalog/products.json', 'utf8'));
mkdirSync(OUT, { recursive: true });
mkdirSync('reports', { recursive: true });

const existing = (id) => (existsSync(OUT) ? readdirSync(OUT).find((f) => f.replace(/\.[^.]+$/, '') === id) : null);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&quot;/g, '"');
const absolute = (url, base) => { try { return new URL(decode(url.trim()), base).href; } catch { return null; } };

/* the page's own choice of main image, in order of how reliably sites fill it in */
function findImage(html, page) {
  const meta = (name) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
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
  /* last resort: the first sizeable image that looks like a product shot */
  const img = [...html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/gi)].map((m) => m[1])
    .find((src) => /product|pro_|upload|media|images/i.test(src) && !/logo|icon|sprite|banner/i.test(src));
  return img ? absolute(img, page) : null;
}

async function get(url, accept) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept, 'accept-language': 'en' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

const rows = [['id', 'name', 'status', 'file', 'image', 'page', 'check']];
let saved = 0;
for (const product of catalog) {
  const id = product.id;
  if (only.size && !only.has(id)) continue;
  const src = sources[id] || {};
  const row = (status, file = '', image = '') => rows.push([id, product.name, status, file, image, src.page || '', src.check || '']);
  const have = existing(id);
  if (have && !force) { row('kept existing photo', have); continue; }
  if (!src.page && !src.image) { row('no official source listed'); continue; }
  try {
    let image = src.image;
    if (!image) image = findImage(await (await get(src.page, 'text/html')).text(), src.page);
    if (!image) { row('page has no product image'); continue; }
    const res = await get(image, 'image/avif,image/webp,image/png,image/jpeg,*/*');
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = TYPES[type] || (image.match(/\.(jpe?g|png|webp|avif)(?:$|\?)/i)?.[1] || '').toLowerCase().replace('jpeg', 'jpg');
    if (!ext) { row(`not a photo (${type || 'unknown type'})`, '', image); continue; }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 4000) { row('image too small', '', image); continue; }
    const file = `${id}.${ext}`;
    writeFileSync(`${OUT}/${file}`, buffer);
    saved++;
    row('saved', file, image);
    console.log(`saved ${file}  (${Math.round(buffer.length / 1024)} KB)`);
  } catch (error) {
    row(`failed: ${error.message}`);
    console.log(`failed ${id}: ${error.message}`);
  }
}
const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\n');
writeFileSync('reports/photo-fetch.csv', csv + '\n');
console.log(`\n${saved} photo(s) saved to ${OUT}/. Details: reports/photo-fetch.csv`);
console.log('Look through the photos, then run npm run build (or push) to publish them.');
