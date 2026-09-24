import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createApp } from '../server.js';

const server = createApp({ dataDir: mkdtempSync(join(tmpdir(), 'epic-data-')), adminPassword: 'correct horse battery' });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => { server.closeAllConnections(); server.close(); });
const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
};
const order = () => ({
  customer: { name: 'Ali Raza', email: 'ali@example.com', phone: '0300 1234567', city: 'Lahore', address: 'House 1, Street 2, Gulberg III' },
  zoneId: 'z1', methodId: 'standard', paymentMethod: 'cod', lines: [{ id: 'lexar-ddr4-8', qty: 2, price: 16500 }],
  subtotal: 33000, shipping: 250, tax: 0, total: 33250, discount: 0, etaMin: 1, etaMax: 3,
});
let placed, token;

test('health and public catalogue', async () => {
  const h = await call('/api/health');
  assert.equal(h.status, 200); assert.equal(h.body.ok, true); assert.equal(h.body.admin, true);
  assert.deepEqual((await call('/api/state')).body, {});
});
test('a customer places an order and the server issues the order number', async () => {
  const r = await call('/api/orders', { method: 'POST', body: order() });
  assert.equal(r.status, 201);
  placed = r.body.order;
  assert.match(placed.id, /^ED-[A-Z2-9]{6}$/);
  assert.equal(placed.total, 33250); assert.equal(placed.status, 'Processing'); assert.equal(placed.channel, 'website');
  assert.equal(placed.lines[0].price, 16500);
});
test('incomplete or tampered orders are refused with a clear message', async () => {
  const shortPhone = order(); shortPhone.customer.phone = '123';
  assert.match((await call('/api/orders', { method: 'POST', body: shortPhone })).body.error, /phone/);
  const unknown = order(); unknown.lines = [{ id: 'not-a-product', qty: 1, price: 10 }];
  assert.equal((await call('/api/orders', { method: 'POST', body: unknown })).status, 400);
  const cheap = order(); cheap.lines = [{ id: 'lexar-ddr4-8', qty: 1, price: 100 }];
  const flagged = await call('/api/orders', { method: 'POST', body: cheap });
  assert.match(flagged.body.order.note, /check before confirming/);
});
test('orders are only visible after the admin signs in', async () => {
  assert.equal((await call('/api/orders')).status, 401);
  assert.equal((await call('/api/login', { method: 'POST', body: { user: 'admin', password: 'wrong' } })).status, 401);
  const login = await call('/api/login', { method: 'POST', body: { user: 'Admin', password: 'correct horse battery' } });
  assert.equal(login.status, 200); token = login.body.token;
  const list = await call('/api/orders', { token });
  assert.ok(list.body.orders.some((o) => o.id === placed.id && o.customer.address.includes('Gulberg')));
});
test('status changes made in the console are saved', async () => {
  const shipped = { ...placed, status: 'Shipped' };
  assert.equal((await call('/api/orders', { method: 'PUT', body: { orders: [shipped] }, token })).status, 200);
  assert.equal((await call('/api/orders', { token })).body.orders.find((o) => o.id === placed.id).status, 'Shipped');
  assert.equal((await call('/api/orders', { method: 'PUT', body: { orders: [shipped] }, token: 'forged.token' })).status, 401);
});
test('tracking shows the status but no personal details', async () => {
  const t = await call('/api/track?id=' + placed.id.toLowerCase());
  assert.equal(t.status, 200); assert.equal(t.body.order.status, 'Shipped');
  const text = JSON.stringify(t.body);
  for (const secret of ['ali@example.com', '0300', 'Gulberg', 'Raza']) assert.ok(!text.includes(secret), 'leaked ' + secret);
  assert.equal((await call('/api/track?id=ED-NOPE00')).status, 404);
});
test('console catalogue edits are saved and uploaded photos become files', async () => {
  const png = 'data:image/png;base64,' + Buffer.alloc(600, 7).toString('base64');
  const r = await call('/api/state', { method: 'PUT', token, body: { products: [{ id: 'lexar-ddr4-8', name: 'Lexar 8GB', price: 16000, stock: 5, image: png }] } });
  assert.equal(r.status, 200);
  const image = r.body.saved.products[0].image;
  assert.match(image, /^\.\/media\/[0-9a-f]{16}\.png$/);
  const media = await fetch(base + image.slice(1));
  assert.equal(media.status, 200); assert.match(media.headers.get('cache-control'), /immutable/);
  assert.equal((await call('/api/state')).body.products[0].price, 16000);
  await call('/api/orders', { method: 'POST', body: order() });
  assert.equal((await call('/api/state')).body.products[0].stock, 3, 'stock goes down when an order is placed');
  assert.equal((await call('/api/state', { method: 'PUT', body: { products: [] } })).status, 401);
});
test('the website is served compressed, with page fallback and no source files', async () => {
  const raw = await new Promise((ok) => request(base + '/', { headers: { 'Accept-Encoding': 'br' } }, ok).end());
  assert.equal(raw.statusCode, 200); assert.equal(raw.headers['content-encoding'], 'br'); assert.match(raw.headers['cache-control'], /no-cache/);
  raw.resume();
  assert.equal((await fetch(base + '/some/page')).status, 200);
  assert.equal((await fetch(base + '/server.js')).status, 404);
  assert.equal((await fetch(base + '/src/app.jsx')).status, 404);
});

test('official product photos are fetched in the background, listed and served', async () => {
  const { readFileSync } = await import('node:fs');
  const { createServer } = await import('node:http');
  const photo = readFileSync(new URL('../assets/slides/slide-mouse-700.webp', import.meta.url));
  /* a stand-in manufacturer site: one page with og:image, one with Product JSON-LD, one missing */
  const maker = createServer((req, res) => {
    if (req.url === '/og.html') { res.setHeader('content-type', 'text/html'); return res.end('<html><head><meta property="og:image" content="/p.webp?a=1&amp;b=2"></head></html>'); }
    if (req.url === '/ld.html') { res.setHeader('content-type', 'text/html'); return res.end(`<script type="application/ld+json">{"@type":"Product","image":["http://127.0.0.1:${maker.address().port}/p.webp"]}</script>`); }
    if (req.url.startsWith('/p.webp')) { res.setHeader('content-type', 'image/webp'); return res.end(photo); }
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => maker.listen(0, '127.0.0.1', r));
  const site = `http://127.0.0.1:${maker.address().port}`;
  try {
    const summary = await server.syncPhotos({ pauseMs: 0, timeoutMs: 5000, sources: {
      g304: { page: site + '/og.html' }, k120: { page: site + '/ld.html' }, m90: { page: site + '/gone.html' }, hs8i: { page: null },
    } });
    assert.deepEqual(summary, { saved: 2, failed: 1, skipped: 1 });
    const { photos } = (await call('/api/photos')).body;
    assert.deepEqual(Object.keys(photos).sort(), ['g304', 'k120']);
    assert.match(photos.g304, /^\.\/media\/products\/g304-[0-9a-f]{8}\.webp$/);
    const img = await fetch(base + photos.g304.slice(1));
    assert.equal(img.status, 200);
    assert.equal(img.headers.get('content-type'), 'image/webp');
    assert.equal(Buffer.from(await img.arrayBuffer()).length, photo.length);
    /* a second run keeps what it has and waits a day before retrying the failure */
    assert.deepEqual(await server.syncPhotos({ pauseMs: 0, sources: { g304: { page: site + '/og.html' }, m90: { page: site + '/gone.html' } } }), { saved: 0, failed: 0, skipped: 2 });
    assert.equal((await call('/api/photos/sync', { method: 'POST' })).status, 401, 'starting a sync needs the console');
  } finally { maker.closeAllConnections(); maker.close(); }
});

test('a photo link pasted in the console is downloaded and kept on the server', async () => {
  const { readFileSync, mkdtempSync: tmp } = await import('node:fs');
  const { createServer } = await import('node:http');
  const photo = readFileSync(new URL('../assets/slides/slide-keyboard-700.webp', import.meta.url));
  const site = createServer((req, res) => {
    if (req.url === '/k120.webp') { res.setHeader('content-type', 'image/webp'); return res.end(photo); }
    res.setHeader('content-type', 'text/html'); res.end('<html>not a photo</html>');
  });
  await new Promise((r) => site.listen(0, '127.0.0.1', r));
  const shop = createApp({ dataDir: tmp(join(tmpdir(), 'epic-data-')), adminPassword: 'pw for import', allowPrivateImports: true });
  await new Promise((r) => shop.listen(0, '127.0.0.1', r));
  const at = `http://127.0.0.1:${shop.address().port}`;
  const post = async (path, body, auth) => { const r = await fetch(at + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  try {
    const src = `http://127.0.0.1:${site.address().port}`;
    assert.equal((await post('/api/media/import', { url: src + '/k120.webp' })).status, 401);
    const auth = (await post('/api/login', { user: 'admin', password: 'pw for import' })).body.token;
    const ok = await post('/api/media/import', { url: src + '/k120.webp' }, auth);
    assert.equal(ok.status, 201);
    assert.match(ok.body.url, /^\.\/media\/[0-9a-f]{16}\.webp$/);
    const img = await fetch(at + ok.body.url.slice(1));
    assert.equal(Buffer.from(await img.arrayBuffer()).length, photo.length);
    assert.equal((await post('/api/media/import', { url: src + '/page.html' }, auth)).status, 400, 'a web page is not a photo');
    assert.equal((await post('/api/media/import', { url: 'file:///etc/passwd' }, auth)).status, 400);
    /* the normal server refuses private addresses */
    assert.equal((await call('/api/media/import', { method: 'POST', body: { url: src + '/k120.webp' }, token })).status, 400);
  } finally { shop.closeAllConnections(); shop.close(); site.closeAllConnections(); site.close(); }
});
