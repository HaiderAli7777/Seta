/* Builds the complete website into dist/. server.js serves it (with the shop's data);
   Hostinger's React preset runs `npm run build` and publishes the "dist" folder,
   so everything a visitor needs is written there and nothing else is. */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { validateCatalog, writeAudit } from './scripts/validate-catalog.mjs';
import { buildProductPhotos, buildBrandLogos } from './scripts/product-photos.mjs';

process.chdir(dirname(fileURLToPath(import.meta.url)));
const OUT = 'dist';

validateCatalog();
writeAudit();

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/assets`, { recursive: true });

// Files published exactly as they are.
const STATIC = [
  '.htaccess', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'favicon.ico',
  'assets/brand', 'assets/slides', 'assets/fonts', 'assets/epic-collections.webp',
];
for (const path of STATIC) if (existsSync(path)) cpSync(path, `${OUT}/${path}`, { recursive: true });
// artwork used by the storefront sections (top-level images in assets/)
for (const file of readdirSync('assets')) if (/\.(webp|jpe?g|png)$/i.test(file)) cpSync(`assets/${file}`, `${OUT}/assets/${file}`);

// Product photos and brand logos: files kept in assets/products and assets/brands,
// optimised here and handed to the storefront.
const products = JSON.parse(readFileSync('src/catalog/products.json', 'utf8'));
const photos = await buildProductPhotos({ products, outDir: OUT });
const logos = await buildBrandLogos({ brands: [...new Set(products.map((p) => p.brand))].sort(), outDir: OUT });

const pages = [];
// One bundle serves both pages: index.html opens the store, console.html opens the console.
const result = await build({
  entryPoints: ['src/main.jsx'], bundle: true, minify: true, format: 'iife', target: 'es2019', jsx: 'automatic',
  loader: { '.jsx': 'jsx', '.css': 'text' },
  define: { 'process.env.NODE_ENV': '"production"', __EPIC_PHOTOS__: JSON.stringify(photos), __EPIC_BRAND_LOGOS__: JSON.stringify(logos) },
  outdir: `${OUT}/assets`, entryNames: 'app-[hash]', metafile: true, legalComments: 'eof', logLevel: 'warning',
});
const output = Object.keys(result.metafile.outputs).find((file) => file.endsWith('.js'));
if (!output) throw new Error('esbuild produced no JavaScript');
const bundle = output.slice(OUT.length + 1);
for (const [name, htmlFile] of [['store', 'index.html'], ['console', 'console.html']]) {
  let head = readFileSync('src/shell.head.html', 'utf8');
  if (name === 'console') head = head
    .replace('</head>', '<meta name="robots" content="noindex,nofollow" />\n</head>')
    .replace(/<title>[^<]*<\/title>/, '<title>EPIC DEVICES Console</title>')
    .replace(/<link rel="preload" as="image"[^>]*>\n?/, '')
    .replace(/<link rel="canonical"[^>]*>\n?/, '')
    .replace(/<script type="application\/ld\+json">.*?<\/script>\n?/, '');
  writeFileSync(`${OUT}/${htmlFile}`, head + `<script src="./${bundle}" defer></script>\n</body>\n</html>\n`);
  pages.push({ htmlFile, bundle, storefront: name === 'store' });
}
console.log(`Built ${OUT}/index.html and ${OUT}/console.html: ${bundle} (${Math.round(result.metafile.outputs[output].bytes / 1024)} KB)`);

// Service worker: instant repeat visits and offline browsing of pages already seen.
const shellFiles = ['./', './index.html', './' + pages.find((page) => page.storefront).bundle, './assets/fonts/epic-display-saira.woff2',
  './assets/fonts/epic-text-jakarta.woff2', './assets/brand/epic-lockup.svg', './assets/brand/epic-e-shape.svg', './assets/brand/favicon.svg',
  './assets/slides/slide-keyboard-700.webp', './site.webmanifest'].filter((url) => url === './' || existsSync(`${OUT}/${url}`));
const version = createHash('sha1').update(pages.map((page) => page.bundle).join() + JSON.stringify(photos) + JSON.stringify(logos)).digest('hex').slice(0, 10);
writeFileSync(`${OUT}/sw.js`, readFileSync('src/sw.template.js', 'utf8').replace('__VERSION__', version).replace('__SHELL__', JSON.stringify(shellFiles)));

// Fail the build if a page or the storefront points at a file that is not in dist/.
const missing = new Set();
const assetRef = /\.\/(assets\/[A-Za-z0-9_\-./]+\.(?:js|svg|webp|png|jpe?g|woff2|ico))/g;
for (const page of pages) {
  const sources = [readFileSync(`${OUT}/${page.htmlFile}`, 'utf8')];
  if (page.storefront) sources.push(readFileSync(`${OUT}/${page.bundle}`, 'utf8'));
  for (const text of sources) for (const [, ref] of text.matchAll(assetRef)) if (!existsSync(`${OUT}/${ref}`)) missing.add(ref);
}
for (const file of ['index.html', 'console.html', '.htaccess', 'sw.js']) if (!existsSync(`${OUT}/${file}`)) missing.add(file);
if (missing.size) throw new Error('Missing from dist/: ' + [...missing].join(', '));

console.log(`Ready: ${OUT}/ holds the finished website. Start it with: node server.js`);
