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
