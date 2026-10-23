#!/usr/bin/env node
/* ============================================================================
   InvoEez sync server.
   · Keeps each company's books as one versioned record. A change is accepted
     only on top of the latest version; otherwise the answer is 409 with the
     latest books, and the app merges record by record and tries again. This is
     what lets people work offline and catch up later without overwriting
     each other.
   · Every accepted version is kept (who, which device, when) for audit and
     recovery.
   · Storage: PostgreSQL when DATABASE_URL is set, otherwise JSON files in
     DATA_DIR (fine for a trial or a single small office).
   · Also serves the app itself (APP_DIR, the built dist folder), so it can be
     installed and opened offline from the same address.

   node index.mjs create-company "Company name"   → prints the access key
   node index.mjs rotate-key <companyId>          → prints a new access key
   node index.mjs [serve]                         → starts the server
   ========================================================================== */
import http from "node:http";
import zlib from "node:zlib";
import crypto from "node:crypto";
import path from "node:path";
import { promises as fs, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_VERSION = "1.0.0";
const PORT = +process.env.PORT || 8787;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(HERE, "data"));
const APP_DIR = path.resolve(process.env.APP_DIR || path.join(HERE, "..", "dist"));
const ORIGINS = (process.env.ALLOW_ORIGIN || "*").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_BODY = (+process.env.MAX_BODY_MB || 25) * 1024 * 1024;

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const newId = () => crypto.randomBytes(6).toString("hex");
const newSecret = () => crypto.randomBytes(24).toString("base64url");
const COMPANY_ID = /^[a-f0-9]{12}$/;
const clip = (s, n = 120) => (typeof s === "string" ? s.slice(0, n) : "");

const SCHEMA = `
create table if not exists companies (
  id text primary key,
  name text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists books (
  company_id text primary key references companies(id) on delete cascade,
  version integer not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  device text
);
create table if not exists book_versions (
  company_id text not null references companies(id) on delete cascade,
  version integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_by text,
  device text,
  primary key (company_id, version)
);`;

/* ------------------------------------------------------------ PostgreSQL */
async function pgStore(url) {
  let pg;
  try { pg = (await import("pg")).default; } catch (e) {
    throw new Error("DATABASE_URL is set but the 'pg' package is missing. Run: npm install (in the server folder).");
  }
  const pool = new pg.Pool({ connectionString: url, ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined, max: 10 });
  await pool.query(SCHEMA);
  const row = (x) => x && { version: x.version, payload: x.payload, updatedAt: new Date(x.updated_at).toISOString(), updatedBy: x.updated_by || "", device: x.device || "" };
  return {
    kind: "postgres",
    async company(id) { const r = await pool.query("select id, name, key_hash from companies where id = $1", [id]); return r.rows[0] || null; },
    async createCompany(name) {
      const id = newId(), secret = newSecret();
      await pool.query("insert into companies (id, name, key_hash) values ($1, $2, $3)", [id, name, sha(secret)]);
      return { id, key: `${id}.${secret}` };
    },
    async rotateKey(id) {
      const secret = newSecret();
      const r = await pool.query("update companies set key_hash = $2 where id = $1", [id, sha(secret)]);
      return r.rowCount ? { id, key: `${id}.${secret}` } : null;
    },
    async get(id) { const r = await pool.query("select version, payload, updated_at, updated_by, device from books where company_id = $1", [id]); return row(r.rows[0]); },
    async head(id) { const r = await pool.query("select version, null as payload, updated_at, updated_by, device from books where company_id = $1", [id]); const x = row(r.rows[0]); if (x) delete x.payload; return x; },
    async put(id, base, payload, who, device) {
      const c = await pool.connect();
      try {
        await c.query("begin");
        const cur = await c.query("select version from books where company_id = $1 for update", [id]);
        const v = cur.rows[0] ? cur.rows[0].version : 0;
        if (v !== base) { await c.query("rollback"); return { conflict: true }; }
        const nv = v + 1, json = JSON.stringify(payload);
        if (v === 0) await c.query("insert into books (company_id, version, payload, updated_at, updated_by, device) values ($1, $2, $3::jsonb, now(), $4, $5)", [id, nv, json, who, device]);
        else await c.query("update books set version = $2, payload = $3::jsonb, updated_at = now(), updated_by = $4, device = $5 where company_id = $1", [id, nv, json, who, device]);
        await c.query("insert into book_versions (company_id, version, payload, created_at, updated_by, device) values ($1, $2, $3::jsonb, now(), $4, $5)", [id, nv, json, who, device]);
        await c.query("commit");
        return { version: nv, updatedAt: new Date().toISOString() };
      } catch (e) {
        await c.query("rollback").catch(() => {});
        if (e && e.code === "23505") return { conflict: true };   // two first uploads at the same moment
        throw e;
      } finally { c.release(); }
    },
    async history(id, limit = 50) {
      const r = await pool.query("select version, created_at, updated_by, device, octet_length(payload::text) as size from book_versions where company_id = $1 order by version desc limit $2", [id, limit]);
      return r.rows.map((x) => ({ version: x.version, at: new Date(x.created_at).toISOString(), by: x.updated_by || "", device: x.device || "", size: +x.size }));
    },
    async version(id, v) {
      const r = await pool.query("select version, payload, created_at as updated_at, updated_by, device from book_versions where company_id = $1 and version = $2", [id, v]);
      return row(r.rows[0]);
    },
    close: () => pool.end(),
  };
}

/* ------------------------------------------------------------ JSON files */
function fileStore(dir) {
  const cfile = path.join(dir, "companies.json");
  const readJSON = async (f, d) => { try { return JSON.parse(await fs.readFile(f, "utf8")); } catch (e) { return d; } };
  const writeJSON = async (f, v) => {
    await fs.mkdir(path.dirname(f), { recursive: true });
    const t = `${f}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(t, JSON.stringify(v));
    await fs.rename(t, f);
  };
  let chain = Promise.resolve();
  const serial = (fn) => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };
  const vfile = (id, v) => path.join(dir, id, "versions", String(v).padStart(8, "0") + ".json");
  return {
    kind: "files",
    async company(id) { const all = await readJSON(cfile, {}); return all[id] ? { id, ...all[id] } : null; },
    createCompany: (name) => serial(async () => {
      const all = await readJSON(cfile, {}), id = newId(), secret = newSecret();
      all[id] = { name, key_hash: sha(secret), created_at: new Date().toISOString() };
      await writeJSON(cfile, all);
      return { id, key: `${id}.${secret}` };
    }),
    rotateKey: (id) => serial(async () => {
      const all = await readJSON(cfile, {}); if (!all[id]) return null;
      const secret = newSecret(); all[id].key_hash = sha(secret); await writeJSON(cfile, all);
      return { id, key: `${id}.${secret}` };
    }),
    async get(id) { return readJSON(path.join(dir, id, "current.json"), null); },
    async head(id) { const x = await readJSON(path.join(dir, id, "current.json"), null); if (x) delete x.payload; return x; },
    put: (id, base, payload, who, device) => serial(async () => {
      const f = path.join(dir, id, "current.json"), cur = await readJSON(f, null), v = cur ? cur.version : 0;
      if (v !== base) return { conflict: true };
      const rec = { version: v + 1, updatedAt: new Date().toISOString(), updatedBy: who, device, payload };
      await writeJSON(vfile(id, rec.version), rec);
      await writeJSON(f, rec);
      return { version: rec.version, updatedAt: rec.updatedAt };
    }),
    async history(id, limit = 50) {
      let names = []; try { names = (await fs.readdir(path.join(dir, id, "versions"))).filter((n) => n.endsWith(".json")).sort().reverse().slice(0, limit); } catch (e) {}
      const out = [];
      for (const n of names) { const f = path.join(dir, id, "versions", n), r = await readJSON(f, null), s = await fs.stat(f);
        if (r) out.push({ version: r.version, at: r.updatedAt, by: r.updatedBy || "", device: r.device || "", size: s.size }); }
      return out;
    },
    async version(id, v) { return readJSON(vfile(id, v), null); },
    close: async () => {},
  };
}

const openStore = () => (process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : Promise.resolve(fileStore(DATA_DIR)));

/* ------------------------------------------------------------------ HTTP */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".webp": "image/webp", ".css": "text/css; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

function cors(req, res) {
  const o = req.headers.origin;
  const allow = ORIGINS.includes("*") ? "*" : o && ORIGINS.includes(o) ? o : "";
  if (allow) {
    res.setHeader("Access-Control-Allow-Origin", allow);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "600");
    if (allow !== "*") res.setHeader("Vary", "Origin");
  }
}
function send(req, res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  const gz = body.length > 2048 && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...(gz ? { "Content-Encoding": "gzip" } : {}) });
  res.end(gz ? zlib.gzipSync(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const parts = [];
    req.on("data", (c) => { n += c.length; if (n > MAX_BODY) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); } else parts.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(parts).toString("utf8") || "{}")); } catch (e) { reject(Object.assign(new Error("bad json"), { status: 400 })); } });
    req.on("error", reject);
  });
}
async function auth(store, req) {
  const m = /^Bearer\s+([a-f0-9]{12})\.([A-Za-z0-9_-]{20,})$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const co = await store.company(m[1]);
  if (!co) return null;
  const a = Buffer.from(sha(m[2])), b = Buffer.from(co.key_hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? co : null;
}
const validBooks = (p) => p && typeof p === "object" && p.books && typeof p.books === "object" && Array.isArray(p.books.docs) && Array.isArray(p.books.payments);

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!rel) rel = "index.html";
  const file = path.resolve(APP_DIR, rel);
  if (!file.startsWith(APP_DIR + path.sep) && file !== APP_DIR) { res.writeHead(403); return res.end(); }
  let st; try { st = await fs.stat(file); } catch (e) {
    if (!path.extname(rel)) return serveStatic(req, res, "/index.html");   // app routes fall back to the app
    res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found");
  }
  if (st.isDirectory()) return serveStatic(req, res, "/" + path.join(rel, "index.html"));
  const ext = path.extname(file).toLowerCase(), fresh = ext === ".html" || rel === "sw.js" || ext === ".webmanifest";
  res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Content-Length": st.size,
    "Cache-Control": fresh ? "no-cache" : "public, max-age=86400", "X-Content-Type-Options": "nosniff" });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

export async function startServer({ port = PORT, store } = {}) {
  store = store || (await openStore());
  const server = http.createServer(async (req, res) => {
    try {
      cors(req, res);
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
      const u = new URL(req.url, "http://local");
      if (u.pathname === "/api/health") return send(req, res, 200, { ok: true, service: "invoeez-sync", version: SERVER_VERSION, storage: store.kind });
      if (!u.pathname.startsWith("/api/")) return serveStatic(req, res, u.pathname);
      const co = await auth(store, req);
      if (!co) return send(req, res, 401, { error: "The access key was not accepted." });
      if (u.pathname === "/api/books" && req.method === "GET") {
        /* ?have=N: the routine check. If N is still the latest, answer without the books. */
        const have = +u.searchParams.get("have");
        if (have > 0) { const h = await store.head(co.id); if (h && h.version === have) return send(req, res, 200, { company: { id: co.id, name: co.name }, same: true, ...h }); }
        const b = await store.get(co.id);
        if (!b) { res.writeHead(204, { "Cache-Control": "no-store" }); return res.end(); }
        return send(req, res, 200, { company: { id: co.id, name: co.name }, ...b });
      }
      if (u.pathname === "/api/books" && req.method === "PUT") {
        const body = await readBody(req);
        if (!validBooks(body.payload)) return send(req, res, 400, { error: "That does not look like InvoEez books." });
        const base = Number.isInteger(body.baseVersion) && body.baseVersion >= 0 ? body.baseVersion : -1;
        if (base < 0) return send(req, res, 400, { error: "baseVersion is required." });
        const r = await store.put(co.id, base, body.payload, clip(body.user), clip(body.device));
        if (r.conflict) { const cur = await store.get(co.id); return send(req, res, 409, { error: "Someone else saved first.", company: { id: co.id, name: co.name }, ...cur }); }
        return send(req, res, 200, r);
      }
      if (u.pathname === "/api/books/history" && req.method === "GET") return send(req, res, 200, { versions: await store.history(co.id, Math.min(500, +u.searchParams.get("limit") || 50)) });
      const vm = /^\/api\/books\/versions\/(\d+)$/.exec(u.pathname);
      if (vm && req.method === "GET") { const v = await store.version(co.id, +vm[1]); return v ? send(req, res, 200, v) : send(req, res, 404, { error: "No such version." }); }
      return send(req, res, 404, { error: "Not found." });
    } catch (e) {
      if (e && e.status) return send(req, res, e.status, { error: e.status === 413 ? "Too large." : "Bad request." });
      console.error(e);
      return send(req, res, 500, { error: "Server error." });
    }
  });
  await new Promise((r) => server.listen(port, r));
  return { server, store, port: server.address().port, close: async () => { await new Promise((r) => server.close(r)); await store.close(); } };
}

/* ------------------------------------------------------------------- CLI */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd = "serve", ...args] = process.argv.slice(2);
  if (cmd === "create-company") {
    const store = await openStore();
    const name = args.join(" ").trim() || "My company";
    const r = await store.createCompany(name);
    console.log(`Company "${name}" created.\nCompany id: ${r.id}\nAccess key: ${r.key}\nKeep the key safe — anyone with it can read and change these books. Enter it in InvoEez › Settings › Cloud sync.`);
    await store.close();
  } else if (cmd === "rotate-key") {
    const store = await openStore();
    const id = args[0];
    const r = COMPANY_ID.test(id || "") ? await store.rotateKey(id) : null;
    console.log(r ? `New access key for ${id}: ${r.key}\nThe old key stops working now.` : "No company with that id.");
    await store.close();
  } else {
    const s = await startServer();
    console.log(`InvoEez sync server ${SERVER_VERSION} on http://localhost:${s.port} · storage: ${s.store.kind} · app: ${APP_DIR}`);
  }
}
