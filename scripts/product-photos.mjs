/* Product photos and brand logos for the storefront.
   Both come only from files kept in this repository, so every deploy gives the same
   result and nothing is copied from other websites:
     assets/products/{product id}.jpg   one photo per product (jpg, png, webp or avif)
     assets/brands/{brand}.svg          one logo per brand (svg is best; png or webp work)
   Photos are trimmed, centred on white, evenly padded and saved as square WebP files:
   480 px for cards and search, 960 px for product pages. Logos are copied (SVG) or
   resized to 96 px high WebP. Every output name carries a short content hash, so
   browsers and the service worker can keep files for a long time and still pick up a
   replaced photo at once. A file that cannot be read never breaks the build;
   reports/product-photos.csv says what happened to each product. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';

const SIZES = [480, 960];
const PHOTO = /\.(webp|jpe?g|png|avif)$/i;
const LOGO = /\.(svg|webp|png)$/i;
const contentHash = (buffer) => createHash('sha1').update(buffer).digest('hex').slice(0, 8);
export const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const list = (dir, pattern) => (existsSync(dir) ? readdirSync(dir).filter((file) => pattern.test(file)).sort() : []);
const stem = (file) => file.slice(0, -extname(file).length);
/* Many logo files only have a viewBox; giving them a size lets every browser lay them out. */
const withSize = (svg) => svg.replace(/<svg\b[^>]*>/i, (tag) => {
  if (/\swidth=/.test(tag) && /\sheight=/.test(tag)) return tag;
  const box = tag.match(/viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i);
  return box ? tag.replace(/<svg\b/i, `<svg width="${box[1]}" height="${box[2]}"`) : tag;
});

async function loadSharp(log) {
  try {
    return (await import('sharp')).default;
  } catch {
    log('Images: sharp is not available, so files are copied without resizing.');
    return null;
  }
}

async function renderPhoto(sharp, input, base, dir) {
  let image = await sharp(input, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' }).png().toBuffer();
  try {
    image = await sharp(image).trim({ background: '#ffffff', threshold: 22 }).png().toBuffer();
  } catch {
    // nothing to trim: the photo is used as it is
  }
  const { width, height } = await sharp(image).metadata();
  if (!width || !height || Math.max(width, height) < 160) throw new Error('image too small (under 160 px)');
  const files = {};
  for (const size of SIZES) {
    const inner = Math.round(size * 0.84);
    const fitted = await sharp(image).resize(inner, inner, { fit: 'inside', kernel: 'lanczos3' }).toBuffer();
    const output = await sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
      .composite([{ input: fitted, gravity: 'centre' }])
      .webp({ quality: size > 600 ? 82 : 78, effort: 5 })
      .toBuffer();
    files[size] = `${base}-${size}.webp`;
    writeFileSync(join(dir, files[size]), output);
  }
  return files;
}

export async function buildProductPhotos({ products, outDir, sourceDir = process.env.EPIC_PHOTOS_DIR || 'assets/products', log = console.log }) {
  const dir = join(outDir, 'assets/products');
  mkdirSync(dir, { recursive: true });
  const sharp = await loadSharp(log);
  const ids = new Set(products.map((p) => p.id));
  const photos = {};
  const status = new Map();
  const unknown = [];
  for (const file of list(sourceDir, PHOTO)) {
    const id = stem(file);
    if (!ids.has(id)) { unknown.push(file); continue; }
    try {
      const input = readFileSync(join(sourceDir, file));
      const base = `${id}-${contentHash(input)}`;
      if (sharp) {
        const files = await renderPhoto(sharp, input, base, dir);
        photos[id] = { s: `./assets/products/${files[480]}`, l: `./assets/products/${files[960]}` };
      } else {
        const name = base + extname(file).toLowerCase();
        writeFileSync(join(dir, name), input);
        photos[id] = { s: `./assets/products/${name}`, l: `./assets/products/${name}` };
      }
      status.set(id, ['photo', file, '']);
    } catch (error) {
      status.set(id, ['placeholder', file, error.message]);
    }
  }
  mkdirSync('reports', { recursive: true });
  const csv = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = products.map((p) => [p.id, ...(status.get(p.id) || ['placeholder', '', 'no photo yet'])]);
  writeFileSync('reports/product-photos.csv', 'id,status,file,detail\n' + rows.map((row) => row.map(csv).join(',')).join('\n') + '\n');
  log(`Photos: ${Object.keys(photos).length} of ${products.length} products have a photo` +
    (unknown.length ? `; not matched to a product id: ${unknown.join(', ')}` : '') + '.');
  return photos;
}

export async function buildBrandLogos({ brands, outDir, sourceDir = process.env.EPIC_BRANDS_DIR || 'assets/brands', log = console.log }) {
  const dir = join(outDir, 'assets/brands');
  mkdirSync(dir, { recursive: true });
  const bySlug = new Map(brands.map((brand) => [slug(brand), brand]));
  const sharp = await loadSharp(() => {});
  const logos = {};
  const unknown = [];
  for (const file of list(sourceDir, LOGO)) {
    const brand = bySlug.get(slug(stem(file)));
    if (!brand) { unknown.push(file); continue; }
    try {
      const input = readFileSync(join(sourceDir, file));
      const base = `${slug(brand)}-${contentHash(input)}`;
      if (/\.svg$/i.test(file)) {
        if (!/<svg[\s>]/i.test(input.toString('utf8', 0, 4096))) throw new Error('not an SVG file');
        writeFileSync(join(dir, base + '.svg'), withSize(input.toString('utf8')));
        logos[brand] = `./assets/brands/${base}.svg`;
      } else if (sharp) {
        let image = sharp(input, { failOn: 'none' });
        try { image = sharp(await image.trim().toBuffer()); } catch { image = sharp(input, { failOn: 'none' }); }
        writeFileSync(join(dir, base + '.webp'), await image.resize({ height: 96, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 }).toBuffer());
        logos[brand] = `./assets/brands/${base}.webp`;
      } else {
        const name = base + extname(file).toLowerCase();
        writeFileSync(join(dir, name), input);
        logos[brand] = `./assets/brands/${name}`;
      }
    } catch (error) {
      log(`Brand logos: ${file} skipped (${error.message}).`);
    }
  }
  log(`Brand logos: ${Object.keys(logos).length} of ${brands.length} brands have a logo file` +
    (unknown.length ? `; not matched to a brand: ${unknown.join(', ')}` : '') + '.');
  return logos;
}
