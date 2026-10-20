/* ============================================================================
   3.15 — offline first, synced to the cloud.
   · Everything is saved on this device first, so InvoEez keeps working with no
     internet. When it is hosted (http/https) a service worker keeps the app
     itself available offline and it can be installed like a desktop/phone app.
   · With Cloud sync on, changes upload as soon as there is a connection:
     after each change, when the connection returns, when the window regains
     focus and every 20 seconds (which also brings in colleagues' changes).
   · The last synced copy is kept in IndexedDB. If the cloud moved on while
     this device was offline, the two are merged record by record against that
     copy: different records never clash; master data (customers, products…)
     merges field by field; a document, payment or entry changed on both sides
     keeps the cloud version and lists this device's version under conflicts,
     where it can be applied. Documents numbered offline that clash with a
     colleague's are renumbered to the next free number, and their references
     follow.
   ========================================================================== */

const CLOUD_KEY = "mizan.cloud", CONFLICT_KEY = "mizan.cloud.conflicts", CLOUD_LOG_KEY = "mizan.cloud.log";
const ATOMIC = new Set(["docs", "payments", "pdcs", "stockOps", "manual", "assets"]);
const NUMBERED = { docs: (d) => d.type || "", payments: (p) => p.kind || "", pdcs: (c) => c.kind || "", stockOps: (o) => o.kind || "", manual: () => "", assets: () => "" };

/* JSON with object keys in a fixed order, so two copies of the same data always compare equal. */
const stable = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x)
  ? Object.keys(x).sort().reduce((o, key) => { o[key] = x[key]; return o; }, {}) : x));
const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const recId = (r) => (isObj(r) ? (r.id != null ? "i:" + r.id : r.code != null ? "c:" + r.code : null) : null);
const isRecList = (...ls) => ls.some((l) => Array.isArray(l) && l.length > 0) && ls.every((l) => l == null || (Array.isArray(l) && l.every((x) => recId(x) != null)));
const recLabel = (r) => (r ? r.number || r.name || r.code || r.id || "" : "");

/* Three-way merge of base (last synced), local (this device) and remote (cloud). */
function merge3(b, l, r, at, log) {
  const sb = stable(b), sl = stable(l), sr = stable(r);
  if (sl === sb) return r;
  if (sr === sb || sl === sr) return l;
  if (isRecList(b, l, r)) return mergeList(b || [], l || [], r || [], at, log);
  if (isObj(l) && isObj(r) && (b == null || isObj(b))) {
    const out = {}, bb = b || {};
    for (const k of new Set([...Object.keys(r), ...Object.keys(l), ...Object.keys(bb)])) {
      const v = merge3(bb[k], l[k], r[k], at ? at + "." + k : k, log);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  log.conflicts.push({ at, local: l, remote: r });
  return r;
}
function mergeList(b, l, r, at, log) {
  const key = at.split(".").pop();
  const mb = new Map(b.map((x) => [recId(x), x])), ml = new Map(l.map((x) => [recId(x), x])), mr = new Map(r.map((x) => [recId(x), x]));
  const ids = [], seen = new Set();
  for (const x of [...r, ...l]) { const id = recId(x); if (!seen.has(id)) { seen.add(id); ids.push(id); } }
  const out = [];
  for (const id of ids) {
    const xb = mb.get(id), xl = ml.get(id), xr = mr.get(id);
    const sb = xb === undefined ? null : stable(xb), sl = xl === undefined ? null : stable(xl), sr = xr === undefined ? null : stable(xr);
    let v;
    if (sl === sb) v = xr;                               // untouched here: take the cloud's (or its deletion)
    else if (sr === sb || sl === sr) v = xl;             // untouched there: take ours (or our deletion)
    else if (xl === undefined) v = xr;                   // deleted here, edited there: keep the edit
    else if (xr === undefined) v = xl;                   // deleted there, edited here: keep the edit
    else if (!ATOMIC.has(key) && isObj(xl) && isObj(xr)) {
      const sub = { conflicts: [], renamed: [] };
      v = merge3(xb, xl, xr, at + "." + id, sub);       // master data: field by field
      if (sub.conflicts.length) log.conflicts.push({ at, id, label: recLabel(xr), local: xl, remote: xr });
    } else { v = xr; log.conflicts.push({ at, id, label: recLabel(xr), local: xl, remote: xr }); }
    if (v !== undefined) out.push(v);
  }
  return out;
}

/* Records created on this device that clash with a colleague's number get the next free one. */
function renumber(books, localNew, log) {
  for (const [key, grp] of Object.entries(NUMBERED)) {
    const list = books[key]; if (!Array.isArray(list)) continue;
    const isNew = (x) => localNew.has(key + ":" + recId(x));
    const taken = new Set(list.filter((x) => !isNew(x) && x.number).map((x) => grp(x) + "|" + x.number));
    list.forEach((x, i) => {
      if (!isNew(x) || !x.number) return;
      const k = grp(x) + "|" + x.number;
      if (!taken.has(k)) { taken.add(k); return; }
      const m = /^(.*?)(\d+)$/.exec(x.number); if (!m) return;
      const prefix = m[1], width = m[2].length;
      let max = 0;
      list.forEach((y) => { if (grp(y) === grp(x) && typeof y.number === "string" && y.number.startsWith(prefix)) { const n = +y.number.slice(prefix.length); if (Number.isFinite(n)) max = Math.max(max, n); } });
      const to = prefix + String(max + 1).padStart(width, "0");
      log.renamed.push({ key, kind: grp(x), from: x.number, to });
      list[i] = { ...x, number: to }; taken.add(grp(x) + "|" + to);
    });
  }
  /* Posting order (seq) decides stock costing on the same day: offline postings that clash go after the colleague's. */
  for (const key of ["docs", "stockOps"]) {
    const list = books[key]; if (!Array.isArray(list)) continue;
    const isNew = (x) => localNew.has(key + ":" + recId(x));
    const taken = new Set([...(books.docs || []), ...(books.stockOps || [])].filter((x) => !isNew(x) && x.seq).map((x) => x.seq));
    let top = Math.max(0, ...(books.docs || []).map((x) => x.seq || 0), ...(books.stockOps || []).map((x) => x.seq || 0));
    list.forEach((x, i) => { if (isNew(x) && x.seq && taken.has(x.seq)) { list[i] = { ...x, seq: ++top }; taken.add(top); } });
  }
  if (!log.renamed.length) return;
  for (const key of Object.keys(NUMBERED)) (books[key] || []).forEach((x, i, list) => {
    if (!localNew.has(key + ":" + recId(x))) return;
    let y = x;
    for (const rn of log.renamed) {
      for (const f of ["ref", "memo", "note"]) if (typeof y[f] === "string" && y[f].includes(rn.from)) y = { ...y, [f]: y[f].split(rn.from).join(rn.to) };
      if (y.origin && y.origin.number === rn.from) y = { ...y, origin: { ...y.origin, number: rn.to } };
    }
    if (y !== x) list[i] = y;
  });
}

function mergePayload(base, local, remote) {
  const log = { conflicts: [], renamed: [] };
  const payload = { ...merge3(base, local, remote, "", log) };
  payload.books = { ...payload.books };
  const localNew = new Set();
  for (const key of Object.keys(NUMBERED)) {
    const ids = (l) => new Set((l || []).map(recId));
    const bi = ids(base.books && base.books[key]), ri = ids(remote.books && remote.books[key]);
    ((local.books && local.books[key]) || []).forEach((x) => { const id = recId(x); if (!bi.has(id) && !ri.has(id)) localNew.add(key + ":" + id); });
    if (Array.isArray(payload.books[key])) payload.books[key] = [...payload.books[key]];
  }
  renumber(payload.books, localNew, log);
  return { payload, ...log };
}

/* How many records differ from the last synced copy — the "waiting to upload" count. */
function countChanges(base, local) {
  if (!base) return 0;
  let n = 0;
  const bb = base.books || {}, lb = local.books || {};
  for (const k of new Set([...Object.keys(bb), ...Object.keys(lb)])) {
    const a = bb[k], c = lb[k];
    if (a === c) continue;
    if (isRecList(a, c)) {
      const m = new Map((a || []).map((x) => [recId(x), stable(x)])), seen = new Set();
      (c || []).forEach((x) => { const id = recId(x); seen.add(id); if (m.get(id) !== stable(x)) n++; });
      m.forEach((_, id) => { if (!seen.has(id)) n++; });
    } else if (stable(a) !== stable(c)) n++;
  }
  if (stable(base.company) !== stable(local.company)) n++;
  return n;
}

/* ------------------------------------------------------------- storage */
const idbKV = (() => {
  let opening = null;
  const open = () => opening || (opening = new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("IndexedDB is not available"));
    const r = indexedDB.open("invoeez-sync", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => {
    const t = db.transaction("kv", mode), req = fn(t.objectStore("kv"));
    t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return { get: (k) => run("readonly", (s) => s.get(k)), set: (k, v) => run("readwrite", (s) => s.put(v, k)), del: (k) => run("readwrite", (s) => s.delete(k)) };
})();
const readLS = (k, d) => { try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const writeLS = (k, v) => { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const deviceName = () => { const u = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const b = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "Browser";
  const o = /Windows/.test(u) ? "Windows" : /Android/.test(u) ? "Android" : /iPhone|iPad/.test(u) ? "iOS" : /Mac OS/.test(u) ? "Mac" : /Linux/.test(u) ? "Linux" : "device";
  return `${b} on ${o}`; };
const readCloud = () => { const c = readLS(CLOUD_KEY, {}) || {};
  if (!c.device) { c.device = "dev-" + Math.random().toString(36).slice(2, 10); c.deviceName = deviceName(); writeLS(CLOUD_KEY, c); }
  return c; };
const baseKey = (cfg) => "base:" + String(cfg.key || "").split(".")[0];
const cleanUrl = (u) => String(u || "").trim().replace(/\/+$/, "");
const ago = (iso) => { if (!iso) return "never"; const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 10 ? "just now" : s < 60 ? `${s} seconds ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : dmy(new Date(iso).toISOString().slice(0, 10)); };
/* Real company data, not the chart of accounts and expense items every new company starts with. */
const hasBooks = (b) => !!b && ((b.docs || []).length + (b.payments || []).length + (b.manual || []).length + (b.partners || []).length + (b.stockOps || []).length + (b.pdcs || []).length
  + (b.products || []).filter((p) => !/^EX-/.test(p.code || "")).length) > 0;

async function cloudCall(cfg, method, body, have) {
  return fetch(cleanUrl(cfg.url) + "/api/books" + (have ? "?have=" + have : ""), { method, cache: "no-store",
    headers: { Authorization: "Bearer " + cfg.key, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined });
}
class SyncProblem extends Error {}
const problem = async (res) => { let m = ""; try { m = (await res.json()).error; } catch (e) {}
  return new SyncProblem(res.status === 401 ? "The access key was not accepted. Check it in Settings › Cloud sync." : m || `The server answered ${res.status}.`); };

/* ------------------------------------------------------------- engine */
function useCloudSync({ state, setState, company, setCompany, toast, user }) {
  const [cfg, setCfgRaw] = useState(readCloud);
  const [status, setStatus] = useState({ phase: "idle", pending: 0, last: readLS(CLOUD_KEY, {}).last || null, error: "" });
  const [conflicts, setConflictsRaw] = useState(() => readLS(CONFLICT_KEY, []));
  const [log, setLogRaw] = useState(() => readLS(CLOUD_LOG_KEY, []));
  const ref = React.useRef({}); ref.current = { state, company, cfg, user, setState, setCompany, toast, status };
  const busy = React.useRef(false), again = React.useRef(false), retryT = React.useRef(0), backoff = React.useRef(0), baseMem = React.useRef(null);
  const on = !!(cfg.enabled && cfg.url && cfg.key) && !state.sample;
  const setCfg = (c) => { writeLS(CLOUD_KEY, c); setCfgRaw(c); };
  const setConflicts = (f) => setConflictsRaw((c) => { const n = (typeof f === "function" ? f(c) : f).slice(-50); writeLS(CONFLICT_KEY, n); return n; });
  const addLog = (items) => setLogRaw((l) => { const n = [...items.map((x) => ({ ...x, at: new Date().toISOString() })), ...l].slice(0, 30); writeLS(CLOUD_LOG_KEY, n); return n; });
  const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
  const live = () => readLS(CLOUD_KEY, {}).enabled === true;
  const who = () => ({ user: (ref.current.user && ref.current.user.name) || "", device: `${ref.current.cfg.deviceName || "Device"} · ${ref.current.cfg.device}` });

  const recount = async () => {
    const c = ref.current.cfg; if (!c.key) return;
    try { if (!baseMem.current || baseMem.current.k !== baseKey(c)) { const b = await idbKV.get(baseKey(c)); baseMem.current = { k: baseKey(c), v: b }; }
      const b = baseMem.current.v;
      const n = b ? countChanges(b.payload, { books: ref.current.state, company: ref.current.company }) : 0;
      setStatus((s) => (s.pending === n ? s : { ...s, pending: n }));
    } catch (e) {}
  };
  const saveBase = async (c, version, payload) => { const v = { version, payload, at: new Date().toISOString() }; await idbKV.set(baseKey(c), v); baseMem.current = { k: baseKey(c), v }; };

  /* Bring cloud data into the app without losing anything typed while the sync was running. */
  const apply = (payload, start, force) => {
    if (!force && !live()) return;
    const R = ref.current, cur = { books: R.state, company: R.company };
    let next = payload;
    if (start && (cur.books !== start.books || cur.company !== start.company)) next = merge3(start, cur, payload, "", { conflicts: [], renamed: [] });
    if (stable(next.books) !== stable(cur.books)) R.setState(next.books);
    if (next.company && stable(next.company) !== stable(cur.company)) R.setCompany({ ...COMPANY, ...next.company });
  };

  const schedule = (ms) => { clearTimeout(retryT.current); retryT.current = setTimeout(() => run("retry"), ms); };
  const body = async () => {
    const c = ref.current.cfg;
    for (let round = 0; round < 5; round++) {
      if (!live()) return "off";
      const baseRec = await idbKV.get(baseKey(c));
      const start = { books: ref.current.state, company: ref.current.company };
      const res = await cloudCall(c, "GET", null, baseRec && baseRec.version);   // answers "same" without the books when nothing moved
      if (!res.ok && res.status !== 204) throw await problem(res);
      const remote = res.status === 204 ? null : await res.json();
      if (remote && remote.company && (!c.company || c.company.name !== remote.company.name) && live()) setCfg({ ...readCloud(), company: remote.company });
      if (!remote) {                                             // the cloud is empty: this device's books go up
        const put = await cloudCall(c, "PUT", { baseVersion: 0, payload: start, ...who() });
        if (put.status === 409) continue; if (!put.ok) throw await problem(put);
        await saveBase(c, (await put.json()).version, start); return "uploaded";
      }
      if (!baseRec) { setStatus((s) => ({ ...s, phase: "choose" })); return "choose"; }
      const lChanged = stable(start) !== stable(baseRec.payload), rChanged = remote.version !== baseRec.version;
      if (!lChanged && !rChanged) return "same";
      if (!lChanged) { apply(remote.payload, start); await saveBase(c, remote.version, remote.payload); return "downloaded"; }
      const m = rChanged ? mergePayload(baseRec.payload, start, remote.payload) : { payload: start, conflicts: [], renamed: [] };
      if (!live()) return "off";
      const put = await cloudCall(c, "PUT", { baseVersion: remote.version, payload: m.payload, ...who() });
      if (put.status === 409) continue;                          // someone saved a moment ago: merge again
      if (!put.ok) throw await problem(put);
      await saveBase(c, (await put.json()).version, m.payload);
      if (rChanged) apply(m.payload, start);
      if (m.conflicts.length) setConflicts((x) => [...x, ...m.conflicts.filter((k) => k.id).map((k) => ({ ...k, key: k.at + ":" + k.id, when: new Date().toISOString() }))]);
      if (m.renamed.length) {
        addLog(m.renamed.map((r) => ({ type: "renumber", text: `${r.from} was renumbered ${r.to} — a colleague used that number while this device was offline.` })));
        ref.current.toast(`${m.renamed.length === 1 ? m.renamed[0].from + " is now " + m.renamed[0].to : m.renamed.length + " documents renumbered"} — a colleague used the number while you were offline`, "warn");
      }
      if (m.conflicts.length) ref.current.toast(`${m.conflicts.length} change${m.conflicts.length === 1 ? "" : "s"} also edited by a colleague — the cloud version was kept. See Cloud sync.`, "warn");
      return rChanged ? "merged" : "uploaded";
    }
    throw new SyncProblem("The cloud kept changing while syncing. It will try again shortly.");
  };
  const run = async (why) => {
    const c = ref.current.cfg;
    if (!(c.enabled && c.url && c.key) || ref.current.state.sample || !live()) return;
    if (busy.current) { again.current = true; return; }
    if (!online()) { setStatus((s) => ({ ...s, phase: "offline" })); recount(); return; }
    /* Routine checks with nothing waiting stay quiet; the chip says "Syncing…" only when there is something to send. */
    const st = ref.current.status, quiet = ["poll", "focus", "start", "change", "retry"].includes(why) && !st.pending && st.phase === "synced";
    busy.current = true; if (!quiet) setStatus((s) => ({ ...s, phase: "syncing", error: "" }));
    const exec = async () => {
      try {
        const r = await body();
        if (r === "off") { setStatus((s) => ({ ...s, phase: "idle" })); return; }
        if (r !== "choose") { backoff.current = 0; const last = new Date().toISOString(); writeLS(CLOUD_KEY, { ...readLS(CLOUD_KEY, {}), last });
          setStatus((s) => ({ ...s, phase: "synced", last, error: "" })); }
      } catch (e) {
        const off = !online() || (e instanceof TypeError);
        setStatus((s) => ({ ...s, phase: off ? "offline" : "error", error: off ? "" : e.message || "Sync failed." }));
        backoff.current = Math.min(60000, (backoff.current || 2500) * 2); schedule(backoff.current);
      }
    };
    try {
      if (typeof navigator !== "undefined" && navigator.locks && navigator.locks.request) await navigator.locks.request("invoeez-cloud-sync", exec);
      else await exec();
    } finally {
      busy.current = false; recount();
      if (again.current) { again.current = false; schedule(400); }
    }
  };

  React.useEffect(() => {
    const h = (e) => { if (e.key === CLOUD_KEY) setCfgRaw(readCloud()); else if (e.key === CONFLICT_KEY) setConflictsRaw(readLS(CONFLICT_KEY, [])); };
    window.addEventListener("storage", h); return () => window.removeEventListener("storage", h);
  }, []);
  React.useEffect(() => { if (!on) return; recount(); const t = setTimeout(() => run("change"), 1500); return () => clearTimeout(t); }, [state, company, on]);
  React.useEffect(() => {
    if (!on) { setStatus((s) => ({ ...s, phase: "idle" })); return; }
    const iv = setInterval(() => run("poll"), 20000);
    const up = () => { ref.current.toast("Back online — uploading your changes"); run("online"); };
    const down = () => { setStatus((s) => ({ ...s, phase: "offline" })); ref.current.toast("You are offline. Keep working — your changes are saved here and upload when the connection returns.", "warn"); };
    const vis = () => { if (document.visibilityState === "visible") run("focus"); };
    window.addEventListener("online", up); window.addEventListener("offline", down); document.addEventListener("visibilitychange", vis);
    run("start");
    return () => { clearInterval(iv); clearTimeout(retryT.current); window.removeEventListener("online", up); window.removeEventListener("offline", down); document.removeEventListener("visibilitychange", vis); };
  }, [on, cfg.url, cfg.key]);

  /* Connecting: check the key, then decide which books to keep. */
  const check = async (url, key) => {
    url = cleanUrl(url); key = String(key || "").trim();
    if (!/^https?:\/\/[^\s]+$/.test(url)) return { error: "Enter the server address, starting with https://" };
    if (!/^[a-f0-9]{12}\.[A-Za-z0-9_-]{20,}$/.test(key)) return { error: "That access key does not look right — copy it exactly as you were given it." };
    let res;
    try { res = await cloudCall({ url, key }, "GET"); } catch (e) { return { error: online() ? "Could not reach the server. Check the address." : "You are offline. Connect to the internet to link this device." }; }
    if (!res.ok && res.status !== 204) return { error: (await problem(res)).message };
    const remote = res.status === 204 ? null : await res.json();
    return { url, key, remote, localHas: hasBooks(state), remoteHas: !!remote && hasBooks(remote.payload && remote.payload.books) };
  };
  const connect = async (ck, mode) => {
    const next = { ...readCloud(), url: ck.url, key: ck.key, enabled: true, company: ck.remote && ck.remote.company ? ck.remote.company : { id: ck.key.split(".")[0], name: company.name } };
    if (mode === "download") {
      apply(ck.remote.payload, null, true);
      await saveBase(next, ck.remote.version, ck.remote.payload);
    } else {
      const payload = { books: state, company };
      const put = await cloudCall(next, "PUT", { baseVersion: ck.remote ? ck.remote.version : 0, payload, ...who() });
      if (!put.ok) return { error: (await problem(put)).message };
      await saveBase(next, (await put.json()).version, payload);
    }
    setCfg(next);
    setStatus((s) => ({ ...s, phase: "synced", last: new Date().toISOString(), pending: 0 }));
    toast(mode === "download" ? "Connected — the cloud books are now on this device" : "Connected — your books are in the cloud");
    return { ok: true };
  };
  const disconnect = (why) => { const c = { ...readCloud(), enabled: false }; setCfg(c); setStatus((s) => ({ ...s, phase: "idle" }));
    if (why) toast(why, "warn"); };
  /* Put this device's version of a conflicting record back; it uploads on the next sync. */
  const useMine = (k) => {
    const [root, coll] = k.at.split(".");
    if (root === "books" && coll && k.id) setState((s) => { const list = s[coll] || [], i = list.findIndex((x) => recId(x) === k.id);
      return { ...s, [coll]: i >= 0 ? list.map((x, j) => (j === i ? k.local : x)) : [...list, k.local] }; });
    setConflicts((x) => x.filter((y) => y.key !== k.key));
    toast(`Your version of ${k.label || "the record"} is back — it uploads now`);
  };
  const dismiss = (k) => setConflicts((x) => x.filter((y) => y.key !== k.key));
  return { cfg, on, status, conflicts, log, check, connect, disconnect, syncNow: () => run("manual"), useMine, dismiss, recount };
}

/* ------------------------------------------------------- installable app */
function usePwa() {
  const [prompt, setPrompt] = useState(null);
  React.useEffect(() => {
    if (typeof location === "undefined" || !/^https?:$/.test(location.protocol)) return;
    fetch("manifest.webmanifest", { method: "HEAD", cache: "no-store" }).then((r) => {
      if (!r.ok) return;
      if (!document.querySelector('link[rel="manifest"]')) { const l = document.createElement("link"); l.rel = "manifest"; l.href = "manifest.webmanifest"; document.head.appendChild(l); }
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
    }).catch(() => {});
    const bip = (e) => { e.preventDefault(); setPrompt(e); }, done = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", bip); window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", bip); window.removeEventListener("appinstalled", done); };
  }, []);
  return { canInstall: !!prompt, install: async () => { if (!prompt) return; prompt.prompt(); try { await prompt.userChoice; } catch (e) {} setPrompt(null); } };
}

/* --------------------------------------------------------------- views */
const syncLook = (sync) => {
  const { phase, pending, last } = sync.status;
  if (phase === "offline") return { I: CloudOff, tone: "warn", label: pending ? `Offline · ${pending} waiting` : "Offline", line: pending ? `${pending} change${pending === 1 ? "" : "s"} saved on this device, waiting to upload` : "Working offline — nothing waiting to upload" };
  if (phase === "syncing") return { I: RefreshCw, tone: "info", label: "Syncing…", line: "Uploading and checking for colleagues' changes", spin: true };
  if (phase === "error") return { I: AlertTriangle, tone: "bad", label: "Sync problem", line: sync.status.error };
  if (phase === "choose") return { I: AlertTriangle, tone: "warn", label: "Action needed", line: "Choose which books to keep in Settings › Cloud sync" };
  if (pending) return { I: CloudUpload, tone: "info", label: `${pending} to upload`, line: `${pending} change${pending === 1 ? "" : "s"} waiting to upload` };
  return { I: Cloud, tone: "ok", label: "Synced", line: `Everything is in the cloud · ${ago(last)}` };
};

function SyncChip({ sync, go }) {
  const [open, setOpen] = useState(false);
  if (!sync.on) return null;
  const L = syncLook(sync);
  return <div className="nt-wrap">
    <button className={cx("sync-chip", L.tone, open && "on")} onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open} title={L.line}>
      <L.I size={15} strokeWidth={2} className={L.spin ? "spin" : ""} /><span>{L.label}</span>
      {sync.conflicts.length > 0 && <i className="sc-dot">{sync.conflicts.length}</i>}</button>
    {open && <><div className="pop-scrim" onMouseDown={() => setOpen(false)} />
      <div className="notif-pop sync-pop" role="dialog" aria-label="Cloud sync">
        <header><span><b>Cloud sync</b><small>{sync.cfg.company ? sync.cfg.company.name : ""}</small></span>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}><X size={15} /></button></header>
        <div className={cx("sp-state", L.tone)}><span className="sp-ic"><L.I size={18} className={L.spin ? "spin" : ""} /></span><div><b>{L.label}</b><small>{L.line}</small></div></div>
        <dl className="sp-facts"><div><dt>Last synced</dt><dd>{ago(sync.status.last)}</dd></div><div><dt>This device</dt><dd>{sync.cfg.deviceName}</dd></div>
          <div><dt>Server</dt><dd>{cleanUrl(sync.cfg.url).replace(/^https?:\/\//, "")}</dd></div></dl>
        {sync.conflicts.length > 0 && <div className="sp-warn"><AlertTriangle size={14} />{sync.conflicts.length} record{sync.conflicts.length === 1 ? "" : "s"} also changed by a colleague — review in Settings.</div>}
        <footer><button className="linkish" onClick={() => { setOpen(false); go("settings", "__cloud__"); }}>Cloud sync settings</button>
          <Btn size="sm" icon={RefreshCw} onClick={() => sync.syncNow()} disabled={sync.status.phase === "syncing"}>Sync now</Btn></footer>
      </div></>}
  </div>;
}

function CloudSyncCard({ sync, pwa, state, toast, backup, startCompany }) {
  const [url, setUrl] = useState(sync.cfg.url || "");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [ck, setCk] = useState(null), [served, setServed] = useState(false);
  React.useEffect(() => {
    if (sync.cfg.url || typeof location === "undefined" || !/^https?:$/.test(location.protocol)) return;
    fetch(location.origin + "/api/health", { cache: "no-store" }).then((r) => r.ok && r.json()).then((j) => { if (j && j.service === "invoeez-sync") { setUrl(location.origin); setServed(true); } }).catch(() => {});
  }, []);
  const tryConnect = async () => {
    setBusy(true); setErr("");
    const r = await sync.check(url, key);
    setBusy(false);
    if (r.error) return setErr(r.error);
    if (state.sample) return r.remoteHas ? finish(r, "download")       // a colleague's new device: never upload the sample company
      : setErr("This company has no books in the cloud yet. Start your company on one device and connect it first; then connect the others.");
    if (!r.remote) return finish(r, "upload");
    if (!r.localHas) return finish(r, "download");
    if (!r.remoteHas) return finish(r, "upload");
    setCk(r);
  };
  const finish = async (r, mode) => { setBusy(true); setErr(""); const x = await sync.connect(r, mode); setBusy(false); if (x.error) setErr(x.error); else { setCk(null); setKey(""); } };
  const L = syncLook(sync);
  const docsOf = (b) => (b && b.docs ? b.docs.length : 0);
  return <Card title="Cloud sync" sub="Work offline on any device; changes upload to your company's cloud books when you are connected" pad={false} className="cloud-card">
    <div className="setsec" id="cloud-sync">
      {sync.on ? <>
        <div className={cx("cc-status", L.tone)}><span className="sp-ic"><L.I size={18} className={L.spin ? "spin" : ""} /></span>
          <div><b>{L.label}</b><small>{L.line}</small></div>
          <Btn size="sm" icon={RefreshCw} onClick={() => sync.syncNow()} disabled={sync.status.phase === "syncing"}>Sync now</Btn></div>
        <div className="setrow"><div className="st"><b>{sync.cfg.company ? sync.cfg.company.name : "Company"}</b><span>{cleanUrl(sync.cfg.url)} · this device: {sync.cfg.deviceName} · last synced {ago(sync.status.last)}</span></div>
          <Btn kind="danger" onClick={() => sync.disconnect("Cloud sync is off on this device. Your books stay here.")}>Disconnect</Btn></div>
        {sync.status.phase === "choose" && <div className="cc-note warn"><AlertTriangle size={16} /><span>This device has no record of the last sync. Disconnect and connect again to choose which books to keep.</span></div>}
        {sync.conflicts.length > 0 && <div className="cc-conf"><b>Changed on two devices at once</b><small>The cloud version was kept. Use yours if it is the right one — it uploads straight away.</small>
          {sync.conflicts.slice().reverse().map((k) => <div key={k.key} className="cc-crow"><span><b>{k.label || k.id}</b><small>{(k.at || "").split(".").pop()} · {ago(k.when)}</small></span>
            <Btn size="sm" onClick={() => sync.useMine(k)}>Use mine</Btn><Btn size="sm" onClick={() => sync.dismiss(k)}>Keep cloud</Btn></div>)}</div>}
        {sync.log.length > 0 && <div className="cc-log"><b>Recent sync notes</b>{sync.log.slice(0, 5).map((x, i) => <div key={i}><Info size={13} />{x.text}<small>{ago(x.at)}</small></div>)}</div>}
      </> : ck ? <div className="cc-choose">
        <b>Both this device and the cloud already have books</b>
        <small>The cloud has <b>{ck.remote.company ? ck.remote.company.name : "a company"}</b> with {docsOf(ck.remote.payload.books)} documents (saved {ago(ck.remote.updatedAt)}{ck.remote.updatedBy ? " by " + ck.remote.updatedBy : ""}). This device has {docsOf(state)} documents. Choose which to keep — a backup of this device's books is downloaded first either way.</small>
        <div className="cc-acts"><Btn kind="pri" icon={Download} disabled={busy} onClick={() => { backup(); finish(ck, "download"); }}>Use the cloud books here</Btn>
          <Btn kind="danger" icon={CloudUpload} disabled={busy} onClick={() => { backup(); finish(ck, "upload"); }}>Replace the cloud with this device's</Btn>
          <Btn disabled={busy} onClick={() => setCk(null)}>Cancel</Btn></div>
        {err && <div className="form-error">{err}</div>}
      </div> : <div className="cc-form">
        <p className="cc-intro">Your administrator creates the company on the InvoEez sync server and gives you its <b>address</b> and an <b>access key</b>. Everyone who uses the same key works on the same books; each device keeps working offline.</p>
        {state.sample && <div className="cc-note"><Info size={16} /><span>This device shows the <b>sample company</b>. Connecting brings your company's books from the cloud in its place. Setting up the company for the first time? <button className="linkish" onClick={startCompany}>Start my company</button> first, then connect it.</span></div>}
        {served && <div className="cc-note ok"><CircleCheck size={16} /><span>This app is served by your InvoEez sync server — just paste the access key.</span></div>}
        <div className="cc-fields">
          <Field label="Server address"><Input value={url} placeholder="https://sync.yourcompany.ae" onChange={(e) => setUrl(e.target.value)} /></Field>
          <Field label="Access key"><Input type="password" autoComplete="off" value={key} placeholder="xxxxxxxxxxxx.xxxxxxxx…" onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") tryConnect(); }} /></Field>
        </div>
        {err && <div className="form-error">{err}</div>}
        <div className="cc-acts"><Btn kind="pri" icon={Cloud} disabled={busy || !url || !key} onClick={tryConnect}>{busy ? "Connecting…" : "Connect"}</Btn></div>
      </div>}
      <div className="setrow"><div className="st"><b>Install InvoEez</b><span>{pwa.canInstall ? "Adds InvoEez to this computer or phone like an app, and opens it even with no internet." : typeof location !== "undefined" && /^https?:$/.test(location.protocol) ? "Opens without internet once loaded. To install, use the browser's menu › Install app / Add to Home Screen." : "Open InvoEez from its web address to install it as an app."}</span></div>
        {pwa.canInstall && <Btn icon={Download} onClick={pwa.install}>Install app</Btn>}</div>
    </div>
  </Card>;
}

const SYNC_CSS = `
.mz .sync-chip{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 12px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);position:relative;white-space:nowrap;transition:background .15s,border-color .15s}
.mz .sync-chip.ok svg{color:var(--pos)}.mz .sync-chip.warn{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 35%,var(--line));background:var(--warn-50)}
.mz .sync-chip.bad{color:var(--neg);border-color:color-mix(in srgb,var(--neg) 35%,var(--line));background:var(--neg-50)}
.mz .sync-chip.info svg{color:var(--info)}.mz .sync-chip.on,.mz .sync-chip:hover{border-color:var(--brand-100)}
.sc-dot{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:9px;padding:0 4px;background:var(--neg);color:#fff;font-size:10px;font-style:normal;display:grid;place-items:center}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sync-pop{width:min(360px,calc(100vw - 24px))}
.sp-state,.cc-status{display:flex;align-items:center;gap:12px;padding:12px 16px}
.cc-status{margin:0 0 4px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line-2)}
.cc-status>div{flex:1;min-width:0}
.sp-state b,.cc-status b{display:block;font-size:13.5px;color:var(--ink)}
.sp-state small,.cc-status small{display:block;font-size:12px;color:var(--ink-3);margin-top:2px;line-height:1.4}
.sp-ic{width:36px;height:36px;flex:0 0 36px;border-radius:11px;display:grid;place-items:center;background:var(--pos-50);color:var(--pos)}
.warn .sp-ic{background:var(--warn-50);color:var(--warn)}.bad .sp-ic{background:var(--neg-50);color:var(--neg)}.info .sp-ic{background:var(--info-50);color:var(--info)}
.sp-facts{margin:0;padding:4px 16px 10px;display:grid;gap:6px}
.sp-facts div{display:flex;justify-content:space-between;gap:12px;font-size:12px}
.sp-facts dt{color:var(--ink-3)}.sp-facts dd{margin:0;color:var(--ink-2);font-weight:550;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-warn{display:flex;gap:8px;align-items:flex-start;margin:0 12px 10px;padding:9px 11px;border-radius:10px;background:var(--warn-50);color:var(--ink-2);font-size:12px}
.sp-warn svg{color:var(--warn);flex:0 0 auto;margin-top:1px}
.cc-form,.cc-choose{padding:0 0 6px}
.cc-intro{font-size:12.5px;color:var(--ink-3);line-height:1.55;margin:0 0 12px}
.cc-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cc-acts{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 8px}
.cc-note{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:10px 12px;border-radius:10px;background:var(--info-50);color:var(--ink-2);font-size:12.5px;line-height:1.5}
.cc-note svg{color:var(--info);flex:0 0 auto}.cc-note span{flex:1}
.cc-note.ok{background:var(--pos-50)}.cc-note.ok svg{color:var(--pos)}.cc-note.warn{background:var(--warn-50)}.cc-note.warn svg{color:var(--warn)}
.cc-choose>b{display:block;font-size:13.5px;color:var(--ink)}
.cc-choose>small{display:block;font-size:12.5px;color:var(--ink-3);line-height:1.55;margin-top:4px}
.cc-conf,.cc-log{margin:12px 0 4px;padding:12px 14px;border-radius:12px;border:1px solid var(--line-2)}
.cc-conf{border-color:color-mix(in srgb,var(--warn) 30%,var(--line));background:color-mix(in srgb,var(--warn-50) 60%,var(--surface))}
.cc-conf>b,.cc-log>b{display:block;font-size:13px;color:var(--ink)}
.cc-conf>small{display:block;font-size:12px;color:var(--ink-3);margin:2px 0 8px}
.cc-crow{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px dashed var(--line)}
.cc-crow>span{flex:1;min-width:0}.cc-crow b{display:block;font-size:12.5px;color:var(--ink)}.cc-crow small{display:block;font-size:11px;color:var(--ink-4)}
.cc-log>div{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:var(--ink-2);padding:6px 0;border-top:1px dashed var(--line-2);line-height:1.45}
.cloud-card .form-error{margin-top:4px}
.cc-log>div svg{color:var(--info);flex:0 0 auto;margin-top:2px}.cc-log>div small{margin-left:auto;white-space:nowrap;color:var(--ink-4);padding-left:8px}
@media(max-width:1250px){.mz .sync-chip span{display:none}.mz .sync-chip{padding:0;width:34px;justify-content:center}}
@media(max-width:650px){.cc-fields{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
`;
