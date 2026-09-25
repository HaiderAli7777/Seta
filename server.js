/* EPIC DEVICES server.
   Serves the built website from dist/ and keeps the shop's shared data, so an order a
   customer places on their phone reaches the console on yours:
     GET  /api/health            is the server up, is admin sign-in configured
     GET  /api/state             catalogue, categories, offers and store settings
     PUT  /api/state             (admin) save catalogue and settings from the console
     POST /api/login             (admin) password in, signed session token out
     POST /api/orders            a customer places an order
     GET  /api/orders            (admin) every order
     PUT  /api/orders            (admin) save order changes from the console
     GET  /api/track?id=         order status for the Track order page, without personal details
     GET  /api/me                who is signed in and which console sections they may open
     POST /api/me/password       change your own password (staff users)
     GET/POST/PUT/DELETE /api/users   (owner and admins) console users and their access
     GET  /api/photos            official product photos the server has fetched so far
     POST /api/photos/sync       (admin) look again for missing official photos now
     POST /api/media/import      (admin) download a photo from a link and keep a copy here
     GET  /media/<file>          photos uploaded in the console and official product photos
   Data lives in EPIC_DATA_DIR (default ~/epic-data), outside the deployed folder, so a
   redeploy never touches it. No dependencies beyond Node.js itself.
   Official product photos: after it starts, the server downloads the main image from each
   product's official manufacturer page (src/catalog/photo-sources.json) into
   <data>/media/products/, one product at a time, and tries missing ones again once a day.
   The storefront shows them on products that have no photo of their own. Set
   EPIC_PHOTO_SYNC=off to switch this off. */
import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, resolve, dirname, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHmac, createHash, randomBytes, randomInt, timingSafeEqual, pbkdf2Sync } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants as zlib } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sellingPrice } from './src/catalog/logic.mjs';
import { fetchOfficialPhoto } from './scripts/official-photos.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const COMPRESS = /\.(html|js|css|json|svg|webmanifest|xml|txt)$/;
const CSP = 'default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; font-src \'self\'; img-src \'self\' data: blob: https:; media-src \'self\' data: blob: https:; connect-src \'self\'; frame-src \'self\' https://www.youtube.com https://player.vimeo.com; object-src \'none\'; base-uri \'self\'; form-action \'self\'; frame-ancestors \'self\'';
const SECURITY = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'Content-Security-Policy': CSP,
};
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STATE_KEYS = ['products', 'categories', 'promos', 'config'];
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

export function createApp(options = {}) {
  const dist = resolve(options.distDir || join(ROOT, 'dist'));
  const dataDir = resolve(options.dataDir || process.env.EPIC_DATA_DIR || join(homedir(), 'epic-data'));
  const adminUser = String(options.adminUser ?? process.env.EPIC_ADMIN_USER ?? 'admin').trim().toLowerCase();
  /* the environment variable, or (same as the PHP API) the first line of <data>/admin-password.txt */
  const passwordFile = join(dataDir, 'admin-password.txt');
  const adminPassword = String(options.adminPassword ?? (process.env.EPIC_ADMIN_PASSWORD
    || (existsSync(passwordFile) ? readFileSync(passwordFile, 'utf8').split('\n')[0].trim() : '')));
  const allowPrivateImports = !!options.allowPrivateImports;
  const catalog = new Map(JSON.parse(readFileSync(join(ROOT, 'src/catalog/products.json'), 'utf8')).map((p) => [p.id, { name: p.name, price: sellingPrice(p) }]));

  /* storage: small JSON files, written atomically, one write at a time */
  let queue = Promise.resolve();
  const serial = (fn) => { const run = queue.then(fn); queue = run.catch(() => {}); return run; };
  const readJson = async (name, fallback) => {
    try { return JSON.parse(await readFile(join(dataDir, name), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
  };
  const writeJson = async (name, value) => {
    await mkdir(dataDir, { recursive: true });
    const tmp = join(dataDir, `${name}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
    await writeFile(tmp, JSON.stringify(value));
    await rename(tmp, join(dataDir, name));
  };
  let secret = null;
  const getSecret = async () => {
    if (secret) return secret;
    const file = join(dataDir, 'secret.key');
    try { secret = (await readFile(file, 'utf8')).trim(); } catch { secret = randomBytes(32).toString('hex'); await mkdir(dataDir, { recursive: true }); await writeFile(file, secret, { mode: 0o600 }); }
    return secret;
  };

  /* sessions: a signed, expiring token; no server-side session store needed */
  const b64 = (s) => Buffer.from(s).toString('base64url');
  const sign = async (payload) => { const body = b64(JSON.stringify(payload)); return body + '.' + createHmac('sha256', await getSecret()).update(body).digest('base64url'); };
  const verify = async (token) => {
    const [body, mac] = String(token || '').split('.');
    if (!body || !mac) return null;
    const expected = createHmac('sha256', await getSecret()).update(body).digest('base64url');
    if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    try { const data = JSON.parse(Buffer.from(body, 'base64url').toString()); return data.exp > Date.now() ? data : null; } catch { return null; }
  };
  /* Console users. The owner signs in with the password from EPIC_ADMIN_PASSWORD or
     admin-password.txt and has full access; everyone else is a user kept in users.json with
     a salted PBKDF2 hash (the PHP API reads and writes the same format) and a list of
     console sections. Access is looked up on every request, so changes apply at once. */
  const ACCESS = JSON.parse(readFileSync(join(ROOT, 'src/catalog/access.json'), 'utf8'));
  const hashPassword = (password) => {
    const salt = randomBytes(16);
    return `pbkdf2_sha256$150000$${salt.toString('base64')}$${pbkdf2Sync(String(password), salt, 150000, 32, 'sha256').toString('base64')}`;
  };
  const checkPassword = (password, stored) => {
    const [kind, iter, salt, hash] = String(stored || '').split('$');
    if (kind !== 'pbkdf2_sha256' || !hash) return false;
    const got = pbkdf2Sync(String(password), Buffer.from(salt, 'base64'), Number(iter), 32, 'sha256');
    const want = Buffer.from(hash, 'base64');
    return got.length === want.length && timingSafeEqual(got, want);
  };
  const publicUser = ({ hash, ...u }) => u;
  const principal = async (req) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const data = await verify(token);
    if (!data) throw new HttpError(401, 'Please sign in again.');
    if (!data.uid) return { username: adminUser, name: 'Owner', owner: true, admin: true, access: ACCESS.sections };
    const user = (await readJson('users.json', [])).find((u) => u.id === data.uid);
    if (!user || !user.active) throw new HttpError(401, 'Your account is no longer active. Ask the store owner.');
    return { ...publicUser(user), owner: false, access: user.admin ? ACCESS.sections : (user.access || []).filter((a) => ACCESS.sections.includes(a)) };
  };
  const can = (who, sections) => who.admin || sections.some((s) => who.access.includes(s));
  const requireAccess = async (req, sections) => {
    const who = await principal(req);
    if (!can(who, sections)) throw new HttpError(403, "Your account doesn't have access to that. Ask the store owner.");
    return who;
  };
  const cleanUser = (b) => ({
    name: clean(b.name, 60), username: clean(b.username, 40).toLowerCase().replace(/[^a-z0-9._-]/g, ''),
    admin: !!b.admin, active: b.active !== false,
    access: (Array.isArray(b.access) ? b.access : []).filter((a) => ACCESS.sections.includes(a)),
  });
  const users = async (req, res, m, url) => {
    if (m === 'GET') { await requireAccess(req, []); return json(res, 200, { users: (await readJson('users.json', [])).map(publicUser), owner: adminUser }); }
    const who = await principal(req);
    if (!who.admin) throw new HttpError(403, 'Only the owner and admins can manage users.');
    const body = m === 'DELETE' ? {} : await readBody(req, 20 * 1024);
    return json(res, 200, { users: await serial(async () => {
      const list = await readJson('users.json', []);
      if (m === 'POST') {
        const u = cleanUser(body);
        if (!u.username || !u.name) throw new HttpError(400, 'Add a name and a username.');
        if (u.username === adminUser || list.some((x) => x.username === u.username)) throw new HttpError(400, 'That username is already taken.');
        if (String(body.password || '').length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
        list.push({ id: 'U' + randomBytes(5).toString('hex'), ...u, hash: hashPassword(body.password), createdAt: Date.now(), createdBy: who.username });
      } else if (m === 'PUT') {
        const i = list.findIndex((x) => x.id === body.id);
        if (i < 0) throw new HttpError(404, 'That user no longer exists.');
        const u = cleanUser({ ...list[i], ...body });
        if (u.username !== list[i].username && (u.username === adminUser || list.some((x) => x.username === u.username))) throw new HttpError(400, 'That username is already taken.');
        if (body.password !== undefined && body.password !== '') {
          if (String(body.password).length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
          list[i].hash = hashPassword(body.password);
        }
        list[i] = { ...list[i], ...u, updatedAt: Date.now() };
      } else if (m === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!list.some((x) => x.id === id)) throw new HttpError(404, 'That user no longer exists.');
        list.splice(list.findIndex((x) => x.id === id), 1);
      } else throw new HttpError(405, 'Method not allowed.');
      await writeJson('users.json', list);
      return list.map(publicUser);
    }) });
  };

  const same = (a, b) => timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest());
  const requireAdmin = (req) => requireAccess(req, ACCESS.media);

  /* simple per-address limits for orders and sign-in attempts */
  const hits = new Map();
  const limit = (key, max, windowMs) => {
    const now = Date.now(), list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
    list.push(now); hits.set(key, list);
    if (hits.size > 5000) hits.clear();
  };
  const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  const readBody = (req, max) => new Promise((ok, fail) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { fail(new HttpError(413, 'That request is too large.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { fail(new HttpError(400, 'The request could not be read.')); } });
    req.on('error', fail);
  });

  /* photos uploaded in the console arrive as data URLs; store them as files */
  const saveMedia = async (value) => {
    if (typeof value === 'string') {
      const m = value.match(/^data:image\/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=\s]+)$/);
      if (!m || value.length < 256) return value;
      const buffer = Buffer.from(m[2], 'base64');
      const name = createHash('sha1').update(buffer).digest('hex').slice(0, 16) + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
      await mkdir(join(dataDir, 'media'), { recursive: true });
      if (!existsSync(join(dataDir, 'media', name))) await writeFile(join(dataDir, 'media', name), buffer);
      return './media/' + name;
    }
    if (Array.isArray(value)) return Promise.all(value.map(saveMedia));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = await saveMedia(v);
      return out;
    }
    return value;
  };

  /* official product photos, fetched in the background and kept in the data folder */
  const photoDir = join(dataDir, 'media', 'products');
  let photoRun = null;
  const officialPhotos = async () => {
    const index = await readJson('photos.json', {});
    const out = {};
    for (const [id, e] of Object.entries(index)) if (e.file && existsSync(join(photoDir, e.file))) out[id] = './media/products/' + e.file;
    return out;
  };
  const syncPhotos = ({ sources, retryAfterMs = 86400000, pauseMs = 1200, timeoutMs = 20000 } = {}) => {
    if (photoRun) return photoRun;
    photoRun = (async () => {
      const list = sources || JSON.parse(readFileSync(join(ROOT, 'src/catalog/photo-sources.json'), 'utf8')).products;
      const summary = { saved: 0, failed: 0, skipped: 0 };
      for (const [id, src] of Object.entries(list)) {
        if (!src || (!src.page && !src.image)) { summary.skipped++; continue; }
        const index = await readJson('photos.json', {});
        const e = index[id];
        if (e?.file && existsSync(join(photoDir, e.file))) { summary.skipped++; continue; }
        if (e?.error && Date.now() - e.at < retryAfterMs) { summary.skipped++; continue; }
        let entry;
        try {
          const { buffer, ext, image } = await fetchOfficialPhoto(src, { timeoutMs });
          const file = id.replace(/[^a-z0-9-]/gi, '') + '-' + createHash('sha1').update(buffer).digest('hex').slice(0, 8) + '.' + ext;
          await mkdir(photoDir, { recursive: true });
          await writeFile(join(photoDir, file), buffer);
          entry = { file, image, page: src.page || '', at: Date.now() };
          summary.saved++;
        } catch (error) {
          entry = { error: String(error.message || error).slice(0, 200), page: src.page || '', at: Date.now() };
          summary.failed++;
        }
        await serial(async () => { const idx = await readJson('photos.json', {}); idx[id] = entry; await writeJson('photos.json', idx); });
        if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
      }
      return summary;
    })().finally(() => { photoRun = null; });
    return photoRun;
  };

  /* a photo link pasted in the console: download it once so the shop keeps its own copy
     (retailer sites often block other sites from showing their images) */
  const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?f[cd])/i;
  const importMedia = async (link) => {
    let url;
    try { url = new URL(String(link || '').trim()); } catch { throw new HttpError(400, 'That does not look like a web link.'); }
    if (!/^https?:$/.test(url.protocol)) throw new HttpError(400, 'Only http and https links can be imported.');
    if (!allowPrivateImports && PRIVATE_HOST.test(url.hostname)) throw new HttpError(400, 'That link points to a private address.');
    let res;
    try {
      res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    } catch { throw new HttpError(502, 'The photo could not be downloaded. Try another link.'); }
    if (!res.ok) throw new HttpError(502, `The other site answered ${res.status}. Try another link.`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' }[type];
    if (!ext) throw new HttpError(400, 'That link is not a photo. In Google Images, open the photo, right-click it and choose "Copy image address".');
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1500) throw new HttpError(400, 'That photo is too small.');
    if (buffer.length > 10 * 1024 * 1024) throw new HttpError(400, 'That photo is over 10 MB.');
    const name = createHash('sha1').update(buffer).digest('hex').slice(0, 16) + '.' + ext;
    await mkdir(join(dataDir, 'media'), { recursive: true });
    if (!existsSync(join(dataDir, 'media', name))) await writeFile(join(dataDir, 'media', name), buffer);
    return './media/' + name;
  };

  const newOrderId = (orders) => {
    const taken = new Set(orders.map((o) => o.id));
    for (;;) {
      let id = 'ED-';
      for (let i = 0; i < 6; i += 1) id += ID_CHARS[randomInt(ID_CHARS.length)];
      if (!taken.has(id)) return id;
    }
  };

  const createOrder = async (body, ip) => {
    limit('order:' + ip, 6, 10 * 60 * 1000);
    if (body.website) throw new HttpError(400, 'Order rejected.');              // honeypot field
    const c = body.customer || {};
    const customer = { name: clean(c.name, 80), email: clean(c.email, 120).toLowerCase(), phone: clean(c.phone, 30), city: clean(c.city, 60), address: clean(c.address, 300) };
    if (!customer.name) throw new HttpError(400, 'Add your name to continue.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new HttpError(400, 'Enter a valid email address.');
    if (customer.phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'That phone number looks too short.');
    if (!customer.city) throw new HttpError(400, 'Choose your city.');
    if (customer.address.length < 5) throw new HttpError(400, 'Add your delivery address.');
    const rawLines = Array.isArray(body.lines) ? body.lines.slice(0, 50) : [];
    if (!rawLines.length) throw new HttpError(400, 'Your bag is empty.');
    return serial(async () => {
      const state = await readJson('state.json', {});
      const stored = new Map((state.products || []).map((p) => [p.id, p]));
      let review = false;
      const lines = rawLines.map((l) => {
        const id = clean(l.id, 80), qty = Math.max(1, Math.min(99, parseInt(l.qty, 10) || 0));
        const known = stored.get(id) || catalog.get(id);
        if (!known) throw new HttpError(400, 'An item in your bag is no longer available. Please refresh the page.');
        const listed = Number(known.price) || 0, price = Number(l.price);
        const unit = Number.isFinite(price) && price > 0 ? price : listed;
        if (listed && Math.abs(unit - listed) / listed > 0.3) review = true;   // offers apply, but a big gap is flagged
        return { id, qty, price: Math.round(unit * 100) / 100, cost: Number(stored.get(id)?.cost) || 0 };
      });
      const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
      const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v) * 100) / 100 : 0);
      const shipping = num(body.shipping), tax = num(body.tax), discount = num(body.discount);
      const expected = Math.round((subtotal + shipping + tax - discount) * 100) / 100;
      const total = Math.abs(num(body.total) - expected) <= 1 ? num(body.total) : expected;
      const orders = await readJson('orders.json', []);
      const order = {
        id: newOrderId(orders), createdAt: Date.now(), customer,
        zoneId: clean(body.zoneId, 20), methodId: clean(body.methodId, 40), paymentMethod: clean(body.paymentMethod, 40) || 'cod',
        lines, subtotal, weight: num(body.weight), shipping, shipCost: num(body.shipCost), tax, total, discount,
        promoCode: body.promoCode ? clean(body.promoCode, 40) : null,
        etaMin: num(body.etaMin), etaMax: num(body.etaMax), status: 'Processing', paid: false,
        note: 'Placed on the website' + (review ? '. Prices differ from the catalogue, please check before confirming.' : ''),
        codPaid: 0, freightPaid: 0, serials: [], channel: 'website',
      };
      orders.unshift(order);
      await writeJson('orders.json', orders);
      await writeJson(`orders-backup-${new Date().toISOString().slice(0, 10)}.json`, orders);
      if (state.products) {
        state.products = state.products.map((p) => { const l = lines.find((x) => x.id === p.id); return l && Number.isFinite(p.stock) ? { ...p, stock: Math.max(0, p.stock - l.qty) } : p; });
        await writeJson('state.json', state);
      }
      return order;
    });
  };

  /* static files with compression and sensible caching */
  const cache = new Map();
  const cacheControl = (path) => {
    if (/\/assets\/[a-z]+-[A-Z0-9]{8}\.js$/.test(path) || path.startsWith('/media/') || /-[0-9a-f]{8}(-\d+)?\.(webp|svg|png)$/.test(path)) return 'public, max-age=31536000, immutable';
    if (/\.(html)$/.test(path) || path.endsWith('/sw.js') || path === '/') return 'no-cache';
    if (/\.(woff2)$/.test(path)) return 'public, max-age=2592000';
    return 'public, max-age=86400';
  };
  const sendFile = async (req, res, file, urlPath) => {
    const info = await stat(file);
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
    let entry = cache.get(file);
    if (!entry || entry.mtime !== info.mtimeMs) {
      const raw = await readFile(file);
      entry = { mtime: info.mtimeMs, raw };
      if (COMPRESS.test(file) && raw.length > 1024) {
        entry.br = brotliCompressSync(raw, { params: { [zlib.BROTLI_PARAM_QUALITY]: 9 } });
        entry.gz = gzipSync(raw, { level: 9 });
      }
      cache.set(file, entry);
    }
    const accept = String(req.headers['accept-encoding'] || '');
    const encoding = entry.br && /\bbr\b/.test(accept) ? 'br' : entry.gz && /\bgzip\b/.test(accept) ? 'gzip' : null;
    const body = encoding === 'br' ? entry.br : encoding === 'gzip' ? entry.gz : entry.raw;
    const headers = { ...SECURITY, 'Content-Type': type, 'Content-Length': body.length, 'Cache-Control': cacheControl(urlPath), 'Last-Modified': new Date(info.mtimeMs).toUTCString(), Vary: 'Accept-Encoding' };
    if (encoding) headers['Content-Encoding'] = encoding;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  const json = (res, status, data) => {
    const body = JSON.stringify(data);
    res.writeHead(status, { ...SECURITY, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
  };

  const api = async (req, res, url) => {
    const route = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
    const m = req.method;
    if (route === 'health' && m === 'GET') return json(res, 200, { ok: true, admin: !!adminPassword, time: Date.now() });
    if (route === 'photos' && m === 'GET') return json(res, 200, { photos: await officialPhotos() });
    if (route === 'photos/sync' && m === 'POST') {
      await requireAdmin(req);
      const running = !!photoRun;
      syncPhotos().then((r) => console.log('Official photos:', r)).catch((e) => console.error('Official photos failed:', e.message));
      return json(res, 202, { started: !running, running });
    }
    if (route === 'media/import' && m === 'POST') {
      await requireAdmin(req);
      const body = await readBody(req, 4 * 1024);
      return json(res, 201, { url: await importMedia(body.url) });
    }
    if (route === 'state' && m === 'GET') {
      const state = await readJson('state.json', {});
      const out = {}; for (const k of STATE_KEYS) if (state[k] !== undefined) out[k] = state[k];
      return json(res, 200, out);
    }
    if (route === 'state' && m === 'PUT') {
      const who = await principal(req);
      const body = await readBody(req, 40 * 1024 * 1024);
      const saved = await serial(async () => {
        const state = await readJson('state.json', {});
        const keys = [];
        /* each part is saved only by someone whose sections cover it */
        for (const k of STATE_KEYS) if (body[k] !== undefined && can(who, ACCESS.writeState[k] || [])) { state[k] = await saveMedia(body[k]); keys.push(k); }
        state.updatedAt = Date.now();
        await writeJson('state.json', state);
        const out = {}; for (const k of keys) out[k] = state[k];
        return out;
      });
      return json(res, 200, { ok: true, saved });
    }
    if (route === 'login' && m === 'POST') {
      limit('login:' + ipOf(req), 10, 15 * 60 * 1000);
      const body = await readBody(req, 10 * 1024);
      const name = String(body.user || '').trim().toLowerCase(), password = String(body.password || '');
      const expires = Date.now() + 12 * 60 * 60 * 1000;
      if (same(name, adminUser)) {
        if (!adminPassword) throw new HttpError(503, 'Owner sign-in is not set up on the server. Add EPIC_ADMIN_PASSWORD in Hostinger, or create admin-password.txt in the epic-data folder.');
        if (!same(password, adminPassword)) throw new HttpError(401, "That username and password don't match.");
        return json(res, 200, { token: await sign({ u: adminUser, exp: expires }), expires, me: await principal({ headers: { authorization: 'Bearer ' + await sign({ u: adminUser, exp: expires }) } }) });
      }
      const user = (await readJson('users.json', [])).find((u) => u.username === name);
      if (!user || !user.active || !checkPassword(password, user.hash)) throw new HttpError(401, "That username and password don't match.");
      const token = await sign({ u: user.username, uid: user.id, exp: expires });
      return json(res, 200, { token, expires, me: await principal({ headers: { authorization: 'Bearer ' + token } }) });
    }
    if (route === 'me' && m === 'GET') return json(res, 200, { me: await principal(req) });
    if (route === 'me/password' && m === 'POST') {
      const who = await principal(req);
      if (who.owner) throw new HttpError(400, "The owner's password lives in admin-password.txt (or EPIC_ADMIN_PASSWORD). Change it there.");
      const body = await readBody(req, 10 * 1024);
      if (String(body.next || '').length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
      await serial(async () => {
        const list = await readJson('users.json', []);
        const u = list.find((x) => x.id === who.id);
        if (!u || !checkPassword(String(body.current || ''), u.hash)) throw new HttpError(400, 'Your current password is not right.');
        u.hash = hashPassword(body.next); u.updatedAt = Date.now();
        await writeJson('users.json', list);
      });
      return json(res, 200, { ok: true });
    }
    if (route === 'users') return users(req, res, m, url);
    if (route === 'orders' && m === 'POST') return json(res, 201, { order: await createOrder(await readBody(req, 200 * 1024), ipOf(req)) });
    if (route === 'orders' && m === 'GET') { await requireAccess(req, ACCESS.readOrders); return json(res, 200, { orders: await readJson('orders.json', []) }); }
    if (route === 'orders' && m === 'PUT') {
      await requireAccess(req, ACCESS.writeOrders);
      const body = await readBody(req, 20 * 1024 * 1024);
      const changes = (Array.isArray(body.orders) ? body.orders : []).filter((o) => o && typeof o.id === 'string');
      const count = await serial(async () => {
        const orders = await readJson('orders.json', []);
        const index = new Map(orders.map((o, i) => [o.id, i]));
        for (const o of changes) { if (index.has(o.id)) orders[index.get(o.id)] = o; else { orders.unshift(o); } }
        await writeJson('orders.json', orders);
        return changes.length;
      });
      return json(res, 200, { ok: true, count });
    }
    if (route === 'track' && m === 'GET') {
      const id = clean(url.searchParams.get('id'), 20).toUpperCase();
      const order = (await readJson('orders.json', [])).find((o) => String(o.id).toUpperCase() === id);
      if (!order) throw new HttpError(404, 'No order found with that number.');
      const { customer, ...rest } = order;
      delete rest.serials; delete rest.note;
      return json(res, 200, { order: { ...rest, lines: order.lines.map(({ cost, ...l }) => l), customer: { name: String(customer?.name || '').split(' ')[0], city: customer?.city || '', address: '', email: '', phone: '' } } });
    }
    throw new HttpError(404, 'Not found.');
  };

  const handler = async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
      let path = decodeURIComponent(url.pathname);
      if (path.startsWith('/media/')) {
        const file = resolve(dataDir, 'media', path.slice(7));
        if (!file.startsWith(resolve(dataDir, 'media') + sep) || !existsSync(file)) throw new HttpError(404, 'Not found.');
        return await sendFile(req, res, file, path);
      }
      if (path.endsWith('/')) path += 'index.html';
      const file = resolve(dist, '.' + path);
      if (!file.startsWith(dist + sep)) throw new HttpError(404, 'Not found.');
      if (existsSync(file) && (await stat(file)).isFile()) return await sendFile(req, res, file, path);
      if (!extname(path)) return await sendFile(req, res, join(dist, 'index.html'), '/index.html');
      throw new HttpError(404, 'Not found.');
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error(error);
      if (!res.headersSent) json(res, status, { error: status === 500 ? 'Something went wrong on our side. Please try again.' : error.message });
    }
  };
  const server = createServer(handler);
  server.syncPhotos = syncPhotos;
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.PORT) || 3000;
  const app = createApp();
  app.listen(port, () => {
    console.log(`EPIC DEVICES is running on port ${port}. Data folder: ${process.env.EPIC_DATA_DIR || join(homedir(), 'epic-data')}.` +
      (process.env.EPIC_ADMIN_PASSWORD ? '' : ' Admin sign-in is off until EPIC_ADMIN_PASSWORD is set.'));
    if (process.env.EPIC_PHOTO_SYNC !== 'off') {
      const run = () => app.syncPhotos().then((r) => { if (r.saved || r.failed) console.log(`Official photos: ${r.saved} saved, ${r.failed} not available yet.`); })
        .catch((e) => console.error('Official photos failed:', e.message));
      setTimeout(run, 5000).unref();
      setInterval(run, 86400000).unref();
    }
  });
}
