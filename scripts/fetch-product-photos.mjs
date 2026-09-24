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
import { fetchOfficialPhoto } from './official-photos.mjs';
import { fileURLToPath } from 'node:url';

process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));
const OUT = 'assets/products';
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = new Set(args.filter((a) => !a.startsWith('--')));
const { products: sources } = JSON.parse(readFileSync('src/catalog/photo-sources.json', 'utf8'));
const catalog = JSON.parse(readFileSync('src/catalog/products.json', 'utf8'));
mkdirSync(OUT, { recursive: true });
mkdirSync('reports', { recursive: true });
const existing = (id) => (existsSync(OUT) ? readdirSync(OUT).find((f) => f.replace(/\.[^.]+$/, '') === id) : null);

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
    const { buffer, ext, image } = await fetchOfficialPhoto(src);
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
