/* 3.15: offline first, synced to the cloud. Two devices share one company through the sync server (server/index.mjs):
   connect and upload, a colleague's device downloads, working offline with changes waiting, both sides numbering the
   same invoice, merge on reconnect with renumbering, a field edited on both devices ("Use mine"), deletions, the app
   opening with no internet (service worker), a wrong key, and sync switching off when the books are replaced.
   Run: npm run build, then node tests/browser-offline-sync.cjs [files|postgres]  (postgres needs DATABASE_URL; needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), { pathToFileURL } = require('url');
const ROOT = path.resolve(__dirname, '..'), MODE = process.argv[2] || 'files', SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
if (MODE === 'files') delete process.env.DATABASE_URL; else if (!process.env.DATABASE_URL) { console.error('postgres mode needs DATABASE_URL'); process.exit(2); }
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'invoeez-sync-'));
process.env.APP_DIR = path.join(ROOT, 'dist');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
(async () => {
  const { startServer } = await import(pathToFileURL(path.join(ROOT, 'server', 'index.mjs')).href);
  const srv = await startServer({ port: 0 }), URL0 = `http://localhost:${srv.port}`;
  const { key } = await srv.store.createCompany('Gulf Trading LLC');
  const cloud = async () => { const r = await fetch(URL0 + '/api/books', { headers: { Authorization: 'Bearer ' + key } }); return r.status === 204 ? null : r.json(); };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const device = async (books) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    await ctx.addInitScript(([fx, books]) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.sidebar', 'pinned'); localStorage.setItem('mizan.navgroups', '{}');
      if (books) localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, [fx, books]);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto(URL0 + '/'); await p.waitForTimeout(1600);
    return { ctx, p };
  };
  const books = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const nav = async (p, k) => { await p.locator(`.sbar [data-k="${k}"]`).first().click(); await p.waitForTimeout(800); };
  const chip = async (p) => ((await p.locator('.sync-chip').count()) ? (await p.locator('.sync-chip').getAttribute('title')) + ' | ' + (await p.locator('.sync-chip span').innerText()) : '');
  const toasts = (p) => p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText).join(' / '));
  const waitFor = async (fn, ms = 9000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
  /* Another window on the same device changes the books (the app's own cross-window path). */
  const edit = (p, fn) => p.evaluate((src) => { const s = JSON.parse(localStorage.getItem('mizan.books.v2')); const n = (0, eval)(src)(s);
    const v = JSON.stringify(n); localStorage.setItem('mizan.books.v2', v); window.dispatchEvent(new StorageEvent('storage', { key: 'mizan.books.v2', newValue: v })); }, fn.toString());
  const connect = async (p, k) => { await nav(p, 'settings'); await p.locator('#cloud-sync input[type=password]').fill(k); await p.locator('#cloud-sync .btn.pri', { hasText: 'Connect' }).click(); await p.waitForTimeout(1500); };
  const newInvoice = async (p, customer, code) => { await nav(p, 'invoices'); await p.locator('.btn.pri', { hasText: 'New invoice' }).first().click(); await p.waitForTimeout(600);
    await p.keyboard.type(customer); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    await p.locator('[data-line-id] input[role="combobox"]').first().click(); await p.keyboard.type(code); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    await p.keyboard.type('2'); await p.waitForTimeout(150);
    const no = (await p.locator('.du-no').innerText()).trim();
    await p.locator('.du-acts .btn', { hasText: 'Post to ledger' }).first().click(); await p.waitForTimeout(700); return no; };
  const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png') }); };

  // ---------- 1. the first device connects and uploads its books ----------
  const A = await device(true);
  check((await A.p.locator('.sync-chip').count()) === 0, 'no sync chip before connecting');
  await nav(A.p, 'settings');
  check(await A.p.locator('#cloud-sync').isVisible(), 'Settings has a Cloud sync card');
  check((await A.p.locator('#cloud-sync .cc-note.ok').innerText()).includes('served by your InvoEez sync server') && (await A.p.locator('#cloud-sync input').first().inputValue()) === URL0, 'served by the sync server: the address is filled in');
  await shot(A.p, 'sync-01-connect');
  await A.p.locator('#cloud-sync input[type=password]').fill('0123456789ab.not-the-right-key-at-all');
  await A.p.locator('#cloud-sync .btn.pri', { hasText: 'Connect' }).click(); await A.p.waitForTimeout(700);
  check(/access key was not accepted/.test(await A.p.locator('#cloud-sync .form-error').innerText()), 'a wrong key is refused clearly');
  await A.p.locator('#cloud-sync input[type=password]').fill(key); await A.p.locator('#cloud-sync .btn.pri', { hasText: 'Connect' }).click(); await A.p.waitForTimeout(1500);
  let c = await cloud();
  check(c && c.version === 1 && c.payload.books.docs.length === 474 && c.company.name === 'Gulf Trading LLC' && (await A.p.evaluate(() => JSON.parse(localStorage.getItem('mizan.cloud')).company.name)) === 'Gulf Trading LLC', 'the books are in the cloud (v' + (c && c.version) + ', ' + (c && c.payload.books.docs.length) + ' documents)');
  await waitFor(async () => /Synced/.test(await chip(A.p)));
  check(/Synced/.test(await chip(A.p)), 'the top bar shows Synced (' + (await chip(A.p)) + ')');
  check(/Connected — your books are in the cloud/.test(await toasts(A.p)), 'connect confirms the upload');
  await shot(A.p, 'sync-02-connected');

  // the company profile travels with the books, and an open Settings form follows it
  await A.p.locator('input[aria-label="Registered name"]').fill('Gulf Trading LLC'); await A.p.locator('input[aria-label="Telephone"]').fill('+971 4 555 0100');
  await A.p.locator('.btn', { hasText: 'Save profile' }).click();
  await waitFor(async () => (await cloud()).payload.company.phone === '+971 4 555 0100');
  check((await cloud()).payload.company.name === 'Gulf Trading LLC', 'a company profile change uploads too');

  // ---------- 2. a colleague's new device downloads them ----------
  const B = await device(false);
  check((await books(B.p)).docs.length === 0, 'a new device starts with empty books');
  await connect(B.p, key);
  await waitFor(async () => /Synced/.test(await chip(B.p)));
  check((await B.p.locator('input[aria-label="Telephone"]').inputValue()) === '+971 4 555 0100' && (await B.p.locator('input[aria-label="Registered name"]').inputValue()) === 'Gulf Trading LLC'
    && /Everything is saved/.test(await B.p.locator('.card', { hasText: 'Company profile' }).first().innerText()), 'the open Settings form shows the downloaded profile, with nothing unsaved');
  let bb = await books(B.p);
  check(bb.docs.length === 474 && !bb.sample, 'the colleague now has the company books (' + bb.docs.length + ' documents)');
  check(/Synced/.test(await chip(B.p)), 'and is synced');
  await B.p.waitForTimeout(1500);
  check(/Synced/.test(await chip(B.p)), 'routine checks with nothing to send do not flash "Syncing…"');

  // ---------- 3. the first device loses its connection and keeps working ----------
  await A.p.waitForTimeout(400);
  await A.ctx.setOffline(true); await A.p.waitForTimeout(500);
  const vOff = (await cloud()).version;
  check(/Offline/.test(await chip(A.p)) && /You are offline/.test(await toasts(A.p)), 'going offline is shown (' + (await chip(A.p)) + ')');
  const noA = await newInvoice(A.p, 'Al Futtaim', 'LT-EB14');
  await edit(A.p, (s) => ({ ...s, partners: s.partners.map((x) => (x.id === 'p2' ? { ...x, phone: '+971 4 111 1111' } : x)) }));
  await A.p.waitForTimeout(2200);
  const chA = await chip(A.p);
  check(noA === 'INV/2026/0288' && /Offline · \d+ waiting/.test(chA), 'an invoice is posted offline and waits (' + noA + ', ' + chA + ')');
  check((await books(A.p)).docs.some((d) => d.number === noA && d.state === 'posted'), 'it is saved on the device');
  await A.p.locator('.sync-chip').click(); await A.p.waitForTimeout(300);
  check(/saved on this device, waiting to upload/.test(await A.p.locator('.sync-pop').innerText()), 'the sync panel explains what is waiting');
  await shot(A.p, 'sync-03-offline');
  await A.p.keyboard.press('Escape'); await A.p.locator('.pop-scrim').click({ force: true }).catch(() => {});
  c = await cloud(); check(c.version === vOff, 'nothing reached the cloud while offline');

  // ---------- 4. meanwhile the colleague works online ----------
  const noB = await newInvoice(B.p, 'Gulf Marine', 'LT-TP15');
  const gone = (await books(B.p)).docs.find((d) => d.type === 'quote').id;
  await edit(B.p, (s) => ({ ...s, partners: s.partners.map((x) => (x.id === 'p2' ? { ...x, phone: '+971 4 222 2222' } : x)) }));
  await B.p.evaluate((id) => { const s = JSON.parse(localStorage.getItem('mizan.books.v2')); s.docs = s.docs.filter((d) => d.id !== id); const v = JSON.stringify(s);
    localStorage.setItem('mizan.books.v2', v); window.dispatchEvent(new StorageEvent('storage', { key: 'mizan.books.v2', newValue: v })); }, gone);
  await waitFor(async () => { const x = await cloud(); return x.payload.books.docs.length === 474 && x.payload.books.docs.some((d) => d.number === noB); });
  c = await cloud();
  check(noB === 'INV/2026/0288' && c.version >= 2 && c.payload.books.docs.some((d) => d.number === noB) && !c.payload.books.docs.some((d) => d.id === gone), 'the colleague\'s invoice ' + noB + ' and deletion are in the cloud (v' + c.version + ')');

  // ---------- 5. back online: changes upload and merge ----------
  await A.ctx.setOffline(false);
  await waitFor(async () => /Synced/.test(await chip(A.p)), 12000);
  await A.p.waitForTimeout(600);
  const ab = await books(A.p); c = await cloud();
  const mine = ab.docs.find((d) => d.partner === 'p1' && d.number === 'INV/2026/0289'), theirs = ab.docs.find((d) => d.number === 'INV/2026/0288');
  check(/Back online/.test(await toasts(A.p)), 'coming back online is announced');
  check(mine && theirs && theirs.partner === 'p3', 'the offline invoice became INV/2026/0289; the colleague kept 0288');
  check(/INV\/2026\/0288 is now INV\/2026\/0289/.test(await toasts(A.p)), 'the renumbering is announced');
  check(!ab.docs.some((d) => d.id === gone), 'the colleague\'s deletion reached this device');
  check(c.payload.books.docs.length === 475 && c.payload.books.docs.some((d) => d.number === 'INV/2026/0289'), 'the cloud has both invoices (' + c.payload.books.docs.length + ' documents)');
  check(ab.partners.find((x) => x.id === 'p2').phone === '+971 4 222 2222' && /also edited by a colleague/.test(await toasts(A.p)), 'a field changed on both devices keeps the cloud value and says so');
  check((await A.p.locator('.sync-chip .sc-dot').innerText()) === '1', 'the chip flags one record to review');

  // ---------- 6. review the clash: use mine ----------
  await A.p.locator('.sync-chip').click(); await A.p.waitForTimeout(300);
  await A.p.locator('.sync-pop .linkish', { hasText: 'Cloud sync settings' }).click(); await A.p.waitForTimeout(900);
  const conf = await A.p.locator('#cloud-sync .cc-conf').innerText();
  check(/Changed on two devices at once/.test(conf) && /Jumeirah Hospitality/.test(conf), 'Settings lists the record changed on both devices');
  check(/renumbered INV\/2026\/0289/.test(await A.p.locator('#cloud-sync .cc-log').innerText()), 'the sync notes keep the renumbering');
  await shot(A.p, 'sync-04-review');
  await A.p.locator('#cloud-sync .cc-crow .btn', { hasText: 'Use mine' }).click();
  await waitFor(async () => (await cloud()).payload.books.partners.find((x) => x.id === 'p2').phone === '+971 4 111 1111');
  check((await cloud()).payload.books.partners.find((x) => x.id === 'p2').phone === '+971 4 111 1111' && (await A.p.locator('.sync-chip .sc-dot').count()) === 0, '"Use mine" uploads this device\'s version');

  // ---------- 7. the colleague receives everything ----------
  await B.p.locator('.sync-chip').click(); await B.p.waitForTimeout(200);
  await B.p.locator('.sync-pop .btn', { hasText: 'Sync now' }).click(); await B.p.waitForTimeout(1500);
  bb = await books(B.p);
  check(bb.docs.length === 475 && bb.docs.some((d) => d.number === 'INV/2026/0289') && bb.partners.find((x) => x.id === 'p2').phone === '+971 4 111 1111', 'the colleague receives the offline work');
  const cur = await cloud(), quick = await (await fetch(URL0 + '/api/books?have=' + cur.version, { headers: { Authorization: 'Bearer ' + key } })).json();
  const stale = await (await fetch(URL0 + '/api/books?have=' + (cur.version - 1), { headers: { Authorization: 'Bearer ' + key } })).json();
  check(quick.same === true && quick.payload === undefined && quick.version === cur.version && stale.payload && stale.payload.books.docs.length === 475, 'routine checks get a short "nothing new" answer; an older version gets the books');
  const hist = await (await fetch(URL0 + '/api/books/history', { headers: { Authorization: 'Bearer ' + key } })).json();
  check(hist.versions.length >= 4 && hist.versions.every((v, i, a) => i === 0 || a[i - 1].version > v.version), 'every version is kept on the server (' + hist.versions.length + ')');

  // ---------- 8. the app opens with no internet ----------
  check(await A.p.evaluate(async () => !!(await navigator.serviceWorker.ready).active && !!document.querySelector('link[rel=manifest]')), 'the app shell is installed (service worker and manifest)');
  await A.p.reload(); await A.p.waitForTimeout(1500);
  await A.ctx.setOffline(true);
  await A.p.reload(); await A.p.waitForTimeout(2000);
  check((await A.p.locator('.sbar').count()) === 1 && (await books(A.p)).docs.length === 475, 'reloading with no internet still opens the app and its books');
  check(/Offline/.test(await chip(A.p)), 'and it knows it is offline');
  await shot(A.p, 'sync-05-offline-reload');
  await A.ctx.setOffline(false); await A.p.waitForTimeout(1500);

  // ---------- 9. restoring a backup switches sync off, so it is never uploaded over the cloud copy ----------
  const before = (await cloud()).version, file = path.join(process.env.DATA_DIR, 'old-backup.json');
  const old = JSON.parse(fx); old.docs = old.docs.slice(0, 400); fs.writeFileSync(file, JSON.stringify(old));
  await nav(A.p, 'settings'); await A.p.locator('input[type=file][accept="application/json"]').setInputFiles(file); await A.p.waitForTimeout(2500);
  const cfgA = await A.p.evaluate(() => JSON.parse(localStorage.getItem('mizan.cloud')));
  check((await books(A.p)).docs.length === 400 && cfgA.enabled === false && (await A.p.locator('.sync-chip').count()) === 0 && /Cloud sync is off because the books on this device were replaced/.test(await toasts(A.p)), 'restoring a backup turns sync off and says why');
  c = await cloud(); check(c.version === before && c.payload.books.docs.length === 475, 'and the cloud books are untouched (v' + c.version + ', ' + c.payload.books.docs.length + ')');
  check(/Connect/.test(await A.p.locator('#cloud-sync').innerText()), 'the card offers to connect again');

  console.log(MODE, 'OK', ok.length, '\n ' + ok.join('\n '), '\nERR', JSON.stringify(errs, null, 1));
  await b.close(); await srv.close();
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log('OK so far:\n ' + ok.join('\n ') + '\nERR', JSON.stringify(errs, null, 1)); process.exit(1); });
