/* 3.16: smoother movement and a finer document editor.
   Sidebar unfolds with a clip while the page glides (no per-frame layout), sections fold by height, phone drawer;
   switches and tab bars glide their highlight; documents glide in; discount on the whole quotation (amount and %,
   capped, saved, carried to the invoice, printed, posted); the save bar sits on the window edge; reduced motion.
   Run: npm run build, then node tests/browser-refine.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
const num = (t) => +String(t).replace(/\u2212/g, '-').replace(/[^0-9.-]/g, '');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (o = {}) => {
    const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 }, reducedMotion: o.reduced ? 'reduce' : 'no-preference', colorScheme: o.dark ? 'dark' : 'light', acceptDownloads: true });
    await ctx.addInitScript(([fx, side]) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.sidebar', side); localStorage.setItem('mizan.navgroups', '{}');
      localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, [fx, o.side || 'pinned']);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
    /* 3.20: the app opens on Home; these checks start on the dashboard. */
    await p.goto('file://' + HTML); await p.waitForTimeout(600); await p.evaluate(()=> {const b=document.querySelector('.sbar [data-k="dash"]');if(b)b.click();}); await p.waitForTimeout(1500); return { ctx, p };
  };
  const shot = async (p, n, el) => { if (SHOTS) await (el ? p.locator(el).first().screenshot({ path: path.join(SHOTS, n + '.png') }) : p.screenshot({ path: path.join(SHOTS, n + '.png') })); };
  const nav = async (p, k) => { await p.locator(`.sbar [data-k="${k}"]`).first().click(); await p.waitForTimeout(800); };
  const books = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const ghost = (p, sel) => p.evaluate((sel) => { const box = document.querySelector(sel), g = box && box.querySelector(':scope > .th-ghost');
    return { ghost: !!g, left: g ? parseFloat(getComputedStyle(g).left) : null, hold: box ? box.querySelectorAll('.th-hold').length : -1 }; }, sel);

  // ---------- 1. sidebar: folded rail unfolds with a clip; the page glides beside it ----------
  let { ctx, p } = await open({ side: 'mini' });
  const sb = () => p.evaluate(() => { const s = document.querySelector('.sbar'), m = document.querySelector('.main'), pn = document.querySelector('.sb-panel');
    return { cls: s.className, slot: s.getBoundingClientRect().width, panel: pn.getBoundingClientRect().width, clip: getComputedStyle(pn).clipPath,
      mainL: Math.round(m.getBoundingClientRect().left), anims: m.getAnimations().length, x: new DOMMatrixReadOnly(getComputedStyle(m).transform).m41 }; });
  let s0 = await sb();
  check(/rail/.test(s0.cls) && s0.slot === 76 && s0.panel === 272 && /inset\(0px 196px 0px 0px\)/.test(s0.clip) && s0.mainL === 76, 'folded: a 76px rail showing the first 76px of the full menu');
  await shot(p, 'refine-01-rail', null);
  await p.mouse.move(38, 320); await p.waitForTimeout(140 + 120);
  const mid = await sb();
  check(/peek/.test(mid.cls) && mid.slot === 272 && mid.anims === 1 && mid.x < -10 && mid.x > -196, 'pointing at it: the page is laid out once and glides (offset ' + Math.round(mid.x) + 'px mid-way)');
  await shot(p, 'refine-02-unfolding', null);
  await p.waitForTimeout(500);
  const s1 = await sb();
  check(s1.mainL === 272 && s1.anims === 0 && /inset\(0px\)|none|inset\(0px 0px 0px 0px\)/.test(s1.clip) && await p.locator('.sbar .sb-search input').evaluate((e) => getComputedStyle(e).opacity === '1'), 'unfolded: the menu sits beside the page');
  await p.mouse.move(900, 400); await p.waitForTimeout(240 + 120);
  const back = await sb();
  check(back.x > 10 && back.slot === 76, 'leaving folds it and the page glides back (offset ' + Math.round(back.x) + 'px)');
  await p.waitForTimeout(600);
  check((await sb()).mainL === 76 && /rail/.test((await sb()).cls), 'folded again');
  // reversing half-way continues from where the page is
  const rev = await p.evaluate(async () => { slideMain(-196); await new Promise((r) => setTimeout(r, 120));
    const m = document.querySelector('.main'), at = new DOMMatrixReadOnly(getComputedStyle(m).transform).m41; slideMain(196);
    const now = new DOMMatrixReadOnly(getComputedStyle(m).transform).m41; return { at, now, anims: m.getAnimations().length }; });
  check(rev.at < -5 && Math.abs(rev.now - (rev.at + 196)) < 6 && rev.anims === 1, 'changing direction half-way continues from where the page is, without a jump (' + Math.round(rev.at) + ' → ' + Math.round(rev.now) + 'px)');
  await p.waitForTimeout(700);
  // pinning from the open menu does not move the page; folding glides it
  await p.mouse.move(38, 320); await p.waitForTimeout(800);
  await p.locator('.sb-foot .collapse').click(); await p.waitForTimeout(60);
  check((await sb()).anims === 0 && (await p.evaluate(() => localStorage.getItem('mizan.sidebar'))) === 'pinned', 'pinning the open menu: the page is already in place');
  await p.locator('.sb-foot .collapse').click(); await p.waitForTimeout(80);
  check((await sb()).anims === 1, 'folding it glides the page back');
  await p.mouse.move(900, 400); await p.waitForTimeout(800);
  // sections fold by height
  await p.locator('.sb-foot .collapse').click({ force: true }).catch(() => {}); await p.mouse.move(38, 320); await p.waitForTimeout(700);
  const head = p.locator('.sb-head', { hasText: 'Purchase' }).first();
  const fold = head.locator('xpath=following-sibling::div[contains(@class,"sb-fold")]');
  const h0 = await fold.evaluate((e) => e.getBoundingClientRect().height);
  await head.click(); await p.waitForTimeout(130);
  const h1 = await fold.evaluate((e) => e.getBoundingClientRect().height);
  await p.waitForTimeout(500);
  const h2 = await fold.evaluate((e) => ({ h: e.getBoundingClientRect().height, inert: e.hasAttribute('inert') }));
  check(h0 > 60 && h1 > 1 && h1 < h0 && h2.h < 1 && h2.inert, 'a section folds smoothly (' + Math.round(h0) + ' → ' + Math.round(h1) + ' → 0px) and its links leave the tab order');
  await head.click(); await p.waitForTimeout(600);
  check((await fold.evaluate((e) => e.getBoundingClientRect().height)) > 60, 'and unfolds again');
  await ctx.close();

  // ---------- 2. gliding highlights and documents ----------
  ({ ctx, p } = await open());
  await p.locator('.ds-seg button').nth(0).click(); await p.waitForTimeout(90);
  const g1 = await ghost(p, '.ds-seg'); await p.waitForTimeout(500); const g1e = await ghost(p, '.ds-seg');
  check(g1.ghost && g1.hold === 1 && !g1e.ghost && g1e.hold === 0, 'the dashboard period highlight glides to the new choice and settles');
  await nav(p, 'quotes');
  await p.locator('.doc-list-tbl tbody tr.click').first().click(); await p.waitForTimeout(120);
  check(await p.evaluate(() => { const w = document.querySelector('.doc-workspace'); return !!w && w.getAnimations().some((a) => a.animationName === 'viewIn'); }), 'a document glides in when opened from the list');
  await p.waitForTimeout(700);
  await p.locator('.du-seg button', { hasText: 'Sent' }).click(); await p.waitForTimeout(100);
  const g2 = await ghost(p, '.du-seg'); await shot(p, 'refine-03-status-glide', '.du-seg');
  await p.waitForTimeout(500);
  check(g2.ghost && !(await ghost(p, '.du-seg')).ghost && (await p.locator('.du-seg button.on').innerText()).trim() === 'Sent', 'the quotation status highlight glides');
  await p.locator('.doc-tabs button', { hasText: 'Activity' }).click(); await p.waitForTimeout(100);
  const g3 = await ghost(p, '.doc-tabs'); await p.waitForTimeout(500);
  check(g3.ghost && (await p.locator('.doc-tabs button.on').evaluate((e) => getComputedStyle(e).borderBottomStyle)) === 'solid' && !(await ghost(p, '.doc-tabs')).ghost, 'the tab underline glides');
  await p.locator('.doc-tabs button', { hasText: 'Line items' }).click(); await p.waitForTimeout(500);

  // ---------- 3. discount on the whole quotation ----------
  const qno = (await p.locator('.du-no').innerText()).trim();
  const T = async () => p.evaluate(() => { const r = {}; document.querySelectorAll('.tot-card .sumrow').forEach((x) => { const k = x.querySelector('.k'); const v = x.querySelector('.v'); if (k && v) r[k.childNodes[0].textContent.trim()] = +v.innerText.replace(/[^0-9.-]/g, ''); }); return r; });
  const t0 = await T();
  check(await p.locator('.tot-add').isVisible() && /Add a discount on the whole quotation/.test(await p.locator('.tot-add').innerText()), 'a quotation offers a discount on the whole quotation');
  await p.locator('.tot-add').click(); await p.waitForTimeout(300);
  check(await p.locator('.td-val').evaluate((e) => e === document.activeElement), 'the amount box is ready to type in');
  await p.keyboard.type('2500'); await p.waitForTimeout(600);
  const t1 = await T();
  check(t1['Taxable amount'] === Math.round((t0['Subtotal'] - 2500) * 100) / 100 && Math.abs(t1['VAT charged'] - t1['Taxable amount'] * 0.05) < 0.05 && Math.abs(t1['Total · AED'] - t1['Taxable amount'] - t1['VAT charged']) < 0.006,
    'AED 2,500 off before VAT: ' + t0['Subtotal'] + ' → taxable ' + t1['Taxable amount'] + ', VAT ' + t1['VAT charged'] + ', total ' + t1['Total · AED']);
  check(num(await p.locator('.tot-disc .td-top .v').innerText()) === -2500 && /Discounts take AED 2,500\.00 off/.test(await p.locator('.tot-saved').innerText()), 'the discount and the saving are shown');
  const firstLine = await p.locator('.line-grid tbody tr[data-line-id] .lg-am').first().innerText();
  check(/^[\d,]+\.\d\d\s*net [\d,]+\.\d\d$/.test(firstLine.replace(/\n/g, ' ')), 'lines keep their list amount and show the net after the discount (' + firstLine.replace(/\n/g, ' ') + ')');
  await shot(p, 'refine-04-discount', '.df-foot');
  await p.locator('.td-mode button', { hasText: '%' }).click(); await p.locator('.td-val').fill('5'); await p.waitForTimeout(600);
  const t2 = await T();
  check(Math.abs(t2['Taxable amount'] - t0['Subtotal'] * 0.95) < 0.011 && /5%/.test(await p.locator('.tot-disc .td-top .k').innerText()), '5% works the same way (' + t2['Taxable amount'] + ')');
  await p.locator('.td-val').fill('150'); await p.waitForTimeout(200);
  check(/above 100 counts as 100%/.test(await p.locator('.td-note').innerText()), 'more than 100% is flagged');
  await p.keyboard.press('Control+s'); await p.waitForTimeout(300);
  check(/cannot be more than 100%/.test(await p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText).join(' '))), 'and cannot be saved');
  await p.locator('.td-mode button', { hasText: 'AED' }).click(); await p.locator('.td-val').fill('999999'); await p.waitForTimeout(200);
  check(/capped at AED/.test(await p.locator('.td-note').innerText()), 'an amount above the quotation value is flagged');
  await p.locator('.td-x').click(); await p.waitForTimeout(700);
  check(await p.locator('.tot-disc').count() === 0 && (await T())['Total · AED'] === t0['Total · AED'], 'removing it restores the total');
  await p.locator('.tot-add').click(); await p.keyboard.type('2500'); await p.waitForTimeout(200);
  check(/Unsaved changes/.test(await p.locator('.document-dock').innerText()), 'the change is unsaved until saved');
  await p.keyboard.press('Control+s'); await p.waitForTimeout(500);
  let q = (await books(p)).docs.find((d) => d.number === qno);
  check(q.docDisc && q.docDisc.mode === 'amount' && q.docDisc.value === 2500 && /all changes saved/.test(await p.locator('.document-dock').innerText()), 'saved with the quotation as a number (' + JSON.stringify(q.docDisc) + ')');
  await p.reload(); await p.waitForTimeout(1400); await nav(p, 'quotes'); await p.locator('.doc-list-tbl tbody tr.click', { hasText: qno }).first().click(); await p.waitForTimeout(900);
  check(num(await p.locator('.tot-disc .td-top .v').innerText()) === -2500, 'still there after reloading');
  const dock = await p.evaluate(() => Math.round(document.querySelector('.document-dock').getBoundingClientRect().bottom));
  check(dock === 900, 'the save bar sits on the window edge, nothing peeks out beneath it');
  // print
  await p.locator('.btn', { hasText: 'Print / send' }).click(); await p.waitForTimeout(800);
  const sheet = await p.locator('.sheet').first().evaluate((s) => ({ heads: [...s.querySelectorAll('.sheet-lines th')].map((t) => t.innerText.trim()), tot: s.querySelector('.totbox').innerText }));
  const H = sheet.heads.map((h) => h.toUpperCase());
  check(!H.includes('VAT') && H.includes('AMOUNT') && /Subtotal/i.test(sheet.tot) && /Discount\s*\(2,500\.00\)/i.test(sheet.tot) && /Taxable amount/i.test(sheet.tot), 'the printed quotation shows subtotal, discount, taxable amount, VAT and total');
  await shot(p, 'refine-05-print', '.sheet');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  if (await p.locator('.scrim').count()) await p.mouse.click(5, 450); await p.waitForTimeout(300);
  if (await p.locator('.scrim').count()) await p.locator('.scrim .btn', { hasText: /Close|Back/ }).first().click().catch(() => {}); await p.waitForTimeout(300);
  // convert and post
  const qTotal = (await T())['Total · AED'];
  await p.locator('.btn.pri', { hasText: 'Convert to invoice' }).click(); await p.waitForTimeout(1200);
  const inv = (await books(p)).docs.find((d) => d.origin && d.origin.number === qno);
  check(inv && inv.docDisc && inv.docDisc.value === 2500, 'the invoice raised from the quotation carries the discount');
  check(Math.abs((await T())['Total · AED'] - qTotal) < 0.006, 'and has the same total (' + qTotal + ')');
  await p.locator('.du-acts .btn', { hasText: 'Post to ledger' }).first().click(); await p.waitForTimeout(900);
  const posted = (await books(p)).docs.find((d) => d.id === inv.id);
  check(posted.state === 'posted' && /Balance receivable/.test(await p.locator('.tot-card').innerText()) && Math.abs(num(await p.locator('.sumrow.balance .v').innerText()) - qTotal) < 0.006 && await p.locator('.tot-add').count() === 0,
    'posted: the customer owes the discounted total, and the discount is read-only');
  await p.locator('.doc-tabs button', { hasText: 'Journal' }).click(); await p.waitForTimeout(500);
  const jr = await p.evaluate(() => { const rows = [...document.querySelectorAll('.journal-tab tbody tr')].map((r) => [...r.querySelectorAll('td')].map((t) => t.innerText)); return rows.length; });
  check(jr >= 3, 'its journal entry is there (' + jr + ' lines)');
  await ctx.close();

  // ---------- 4. phone drawer, dark, reduced motion ----------
  ({ ctx, p } = await open({ vp: { width: 390, height: 844 } }));
  check(await p.evaluate(() => document.querySelector('.sbar').getBoundingClientRect().right <= 1), 'phone: the menu waits off-screen');
  await p.locator('.burger').click(); await p.waitForTimeout(120);
  const dr = await p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.sbar')).transform).m41);
  await p.waitForTimeout(500);
  check(dr < -5 && (await p.evaluate(() => Math.round(document.querySelector('.sbar').getBoundingClientRect().left))) === 0, 'and slides in (' + Math.round(dr) + 'px on the way)');
  await p.locator('.sbar [data-k="quotes"]').first().click(); await p.waitForTimeout(700);
  await p.locator('.doc-list-tbl tbody tr.click, .doc-card').first().click().catch(() => {}); await p.waitForTimeout(800);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no sideways scrolling');
  await ctx.close();
  ({ ctx, p } = await open({ dark: true }));
  await p.evaluate(() => localStorage.setItem('mizan.theme', 'dark')); await p.reload(); await p.waitForTimeout(1300);
  await nav(p, 'quotes'); await p.locator('.doc-list-tbl tbody tr.click').nth(1).click(); await p.waitForTimeout(900);
  await p.locator('.tot-add').click(); await p.keyboard.type('1000'); await p.waitForTimeout(500);
  await p.locator('.tot-card').scrollIntoViewIfNeeded();
  check(await p.locator('.tot-card').evaluate((e) => getComputedStyle(e).backgroundImage !== 'none'), 'dark: the totals card');
  await shot(p, 'refine-06-dark', '.df-foot');
  await ctx.close();
  ({ ctx, p } = await open({ side: 'mini', reduced: true }));
  await p.mouse.move(38, 320); await p.waitForTimeout(400);
  check((await p.evaluate(() => document.querySelector('.main').getAnimations().length)) === 0, 'reduced motion: the page moves without gliding');
  await p.mouse.move(900, 400); await p.waitForTimeout(600);
  await p.locator('.ds-seg button').nth(1).click(); await p.waitForTimeout(60);
  check(!(await ghost(p, '.ds-seg')).ghost, 'reduced motion: highlights change without gliding');
  await ctx.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
