import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The PHP fallback API (api/index.php) must behave like server.js for the storefront and console.
const hasPhp = spawnSync('php', ['-v']).status === 0;
const root = fileURLToPath(new URL('..', import.meta.url));
let base, proc, data;
if (hasPhp) {
  data = mkdtempSync(join(tmpdir(), 'epic-php-'));
  writeFileSync(join(data, 'admin-password.txt'), 'php pass 123\n');
  const port = 18000 + Math.floor(Math.random() * 2000);
  proc = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'dist', 'tests/php-router.php'], { cwd: root, env: { ...process.env, EPIC_DATA_DIR: data }, stdio: 'ignore' });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/health'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  after(() => proc.kill());
}
const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
};

test('PHP API: orders placed on standard hosting reach the console', { skip: !hasPhp && 'php is not installed' }, async () => {
  const h = await call('/api/health');
  assert.equal(h.status, 200); assert.equal(h.body.ok, true); assert.equal(h.body.admin, true); assert.equal(h.body.backend, 'php');
  assert.equal((await call('/api/orders', { method: 'POST', body: { customer: { name: 'A' }, lines: [] } })).status, 400);
  const placed = await call('/api/orders', { method: 'POST', body: {
    customer: { name: 'Sara Khan', email: 'sara@example.com', phone: '0301 2345678', city: 'Lahore', address: 'House 5, Street 9, DHA' },
    zoneId: 'z1', methodId: 'standard', paymentMethod: 'cod', lines: [{ id: 'k120', qty: 2, price: 2310 }], subtotal: 4620, shipping: 0, tax: 0, total: 4620, discount: 0 } });
  assert.equal(placed.status, 201);
  assert.match(placed.body.order.id, /^ED-[A-Z0-9]{6}$/);
  assert.equal(placed.body.order.total, 4620);
  assert.equal((await call('/api/orders')).status, 401, 'orders need a console session');
  assert.equal((await call('/api/login', { method: 'POST', body: { user: 'admin', password: 'wrong' } })).status, 401);
  const token = (await call('/api/login', { method: 'POST', body: { user: 'Admin', password: 'php pass 123' } })).body.token;
  const list = await call('/api/orders', { token });
  assert.equal(list.body.orders[0].id, placed.body.order.id);
  assert.equal(list.body.orders[0].customer.phone, '0301 2345678');
  const tracked = await call('/api/track?id=' + placed.body.order.id.toLowerCase());
  assert.equal(tracked.body.order.customer.phone, '', 'tracking hides personal details');
  assert.equal(tracked.body.order.customer.name, 'Sara');
  assert.equal((await call('/api/orders', { method: 'PUT', token, body: { orders: [{ ...list.body.orders[0], status: 'Packed' }] } })).body.count, 1);
  assert.equal((await call('/api/orders', { token })).body.orders[0].status, 'Packed');
  const png = 'data:image/png;base64,' + Buffer.alloc(600, 7).toString('base64');
  const saved = await call('/api/state', { method: 'PUT', token, body: { products: [{ id: 'k120', price: 2310, stock: 48, image: png }] } });
  assert.match(saved.body.saved.products[0].image, /^\.\/media\/[0-9a-f]{16}\.png$/);
  const img = await fetch(base + saved.body.saved.products[0].image.slice(1));
  assert.equal(img.status, 200); assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal((await call('/api/state')).body.products[0].stock, 48);
  /* nothing outside the media folder can be read through /media or the API */
  const { readFileSync } = await import('node:fs');
  const secret = readFileSync(join(data, 'secret.key'), 'utf8').trim();
  for (const sneaky of ['/media/..%2Fadmin-password.txt', '/media/%2e%2e/secret.key', '/media/..%2F..%2Fsecret.key', '/api/index.php?media=../secret.key', '/api/index.php?media=../admin-password.txt']) {
    const text = await (await fetch(base + sneaky)).text();
    assert.ok(!text.includes(secret) && !text.includes('php pass 123'), sneaky);
  }
});

test('PHP API: says where the password file goes, and reads one saved by Notepad', { skip: !hasPhp && 'php is not installed' }, async () => {
  const empty = mkdtempSync(join(tmpdir(), 'epic-php-empty-'));
  const port = 20100 + Math.floor(Math.random() * 500);
  const p2 = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'dist', 'tests/php-router.php'], { cwd: root, env: { ...process.env, EPIC_DATA_DIR: empty }, stdio: 'ignore' });
  try {
    const at = `http://127.0.0.1:${port}`;
    let h;
    for (let i = 0; i < 50; i++) { try { h = await (await fetch(at + '/api/health')).json(); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    assert.equal(h.admin, false);
    assert.equal(h.setup.passwordFile, join(empty, 'admin-password.txt'));
    const login = await fetch(at + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: 'admin', password: 'x' }) });
    assert.equal(login.status, 503);
    assert.match((await login.json()).error, new RegExp(empty.replace(/[/\\]/g, '.') + '.admin-password\\.txt'));
    /* Windows Notepad: byte-order mark, CRLF line ending */
    writeFileSync(join(empty, 'admin-password.txt'), '﻿Notepad Pass 9\r\n');
    assert.equal((await (await fetch(at + '/api/health')).json()).admin, true);
    const ok = await fetch(at + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: 'admin', password: 'Notepad Pass 9' }) });
    assert.equal(ok.status, 200);
  } finally { p2.kill(); }
});

test('PHP API: console users with limited sections, same rules as server.js', { skip: !hasPhp && 'php is not installed' }, async () => {
  const owner = (await call('/api/login', { method: 'POST', body: { user: 'admin', password: 'php pass 123' } })).body;
  assert.equal(owner.me.owner, true);
  const made = await call('/api/users', { method: 'POST', token: owner.token, body: { name: 'Ali', username: 'ali.sales', password: 'sales-pass-1', access: ['Sales'] } });
  const ali = made.body.users.find((u) => u.username === 'ali.sales');
  assert.ok(ali && !ali.hash);
  const staff = (await call('/api/login', { method: 'POST', body: { user: 'ali.sales', password: 'sales-pass-1' } })).body;
  assert.deepEqual(staff.me.access, ['Sales']);
  assert.equal((await call('/api/orders', { token: staff.token })).status, 200);
  assert.equal((await call('/api/users', { token: staff.token })).status, 403);
  const put = await call('/api/state', { method: 'PUT', token: staff.token, body: { config: { codEnabled: false }, products: [{ id: 'k120', price: 2310, stock: 5 }] } });
  assert.deepEqual(Object.keys(put.body.saved), ['products']);
  assert.equal((await call('/api/me/password', { method: 'POST', token: staff.token, body: { current: 'sales-pass-1', next: 'better-pass-2' } })).status, 200);
  await call('/api/users', { method: 'PUT', token: owner.token, body: { id: ali.id, active: false } });
  assert.equal((await call('/api/orders', { token: staff.token })).status, 401, 'switched off users are out at once');
  assert.equal((await call('/api/users', { method: 'PUT', token: owner.token, body: { id: ali.id, active: true, password: 'reset-pass-3' } })).status, 200);
  assert.equal((await call('/api/login', { method: 'POST', body: { user: 'ali.sales', password: 'reset-pass-3' } })).status, 200);
});
