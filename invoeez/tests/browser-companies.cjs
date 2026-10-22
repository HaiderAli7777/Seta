/* 3.25: module colours, companies with their branches, several branches at once.
   - Module colours: each module wears its icon's colour (apps and sidebar mode, dark mode), Home and the dashboard keep the theme,
     printing keeps the theme, Settings › Appearance turns it off and on.
   - The company list shows each company with its branches underneath; picking a branch shows its figures and makes it the working
     branch; picking a branch of another company opens that company on it.
   - The dashboard's branch chips pick one or several branches; the Branches tab compares them and adds up to the company;
     reports and lists share the same choice; the report picker takes several branches; VAT, stock and cash stay company-wide.
   Run: npm run build, then node tests/browser-companies.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const base = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
const num = (t) => { const s = String(t).replace(/[−–]/g, '-'); const neg = /^\s*\(.*\)\s*$/.test(s) || /-\s*\d/.test(s); const v = +s.replace(/[^\d.]/g, ''); return neg ? -v : v; };
const near = (a, b) => Math.abs(a - b) < 0.02;

/* The test company with four branches (documents by the customer's or vendor's emirate, Dubai split in two; payments follow the
   document their memo names), and a second company, Gulf Star Trading, with three branches. */
function withBranches() {
  const f = JSON.parse(base);
  f.branches = [['br_dxb', 'Dubai head office', 'DXB', 'Dubai'], ['br_dei', 'Deira shop', 'DEI', 'Dubai'], ['br_auh', 'Abu Dhabi branch', 'AUH', 'Abu Dhabi'], ['br_shj', 'Sharjah outlet', 'SHJ', 'Sharjah']]
    .map(([id, name, code, emirate]) => ({ id, name, code, emirate, address: '', active: true }));
  f.defaultBranch = 'br_dxb';
  const em = Object.fromEntries(f.partners.map((p) => [p.id, p.emirate])); let i = 0;
  f.docs.forEach((d) => { const e = em[d.partner]; d.branch = e === 'Abu Dhabi' ? 'br_auh' : ['Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'].includes(e) ? 'br_shj' : (i++ % 3 === 1 ? 'br_dei' : 'br_dxb'); });
  const byNum = Object.fromEntries(f.docs.map((d) => [d.number, d.branch])), first = {};
  f.docs.forEach((d) => { first[d.partner] = first[d.partner] || d.branch; });
  f.payments.forEach((x) => { const m = /((?:INV|BILL|CN|DN)\/\d{4}\/\d{4})/.exec(x.memo || ''); x.branch = (m && byNum[m[1]]) || first[x.partner] || 'br_dxb'; });
  const g = JSON.parse(base);
  g.branches = [['g_shq', 'Sharjah HQ', 'SHQ', 'Sharjah'], ['g_ajm', 'Ajman warehouse', 'AJM', 'Ajman'], ['g_rak', 'RAK showroom', 'RAK', 'Ras Al Khaimah']].map(([id, name, code, emirate]) => ({ id, name, code, emirate, active: true }));
  g.defaultBranch = 'g_shq'; let j = 0; g.docs.forEach((d) => { d.branch = ['g_shq', 'g_ajm', 'g_rak'][j++ % 3]; });
  const reg = [{ id: 'main', name: 'My Company', trn: '' }, { id: 'co2', name: 'Gulf Star Trading L.L.C.', trn: '100555666700003', emirate: 'Sharjah', branches: 3,
    brs: JSON.stringify(g.branches.map((b) => ({ id: b.id, name: b.name, code: b.code, emirate: b.emirate }))) }];
  return { main: JSON.stringify(f), co2: JSON.stringify(g), reg: JSON.stringify(reg) };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const D = withBranches();
  const open = async (o = {}) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: o.dark ? 'dark' : 'light' });
    await ctx.addInitScript(([D, o]) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.navmode', o.mode || 'apps');
      localStorage.setItem('mizan.sidebar', 'pinned'); localStorage.setItem('mizan.navgroups', '{}');
      localStorage.setItem('mizan.books.v2', o.plain ? o.plain : D.main);
      if (!o.plain) { localStorage.setItem('mizan.books.v2@co2', D.co2); localStorage.setItem('mizan.company@co2', JSON.stringify({ name: 'Gulf Star Trading L.L.C.', trn: '100555666700003', emirate: 'Sharjah' }));
        localStorage.setItem('mizan.companies', D.reg); localStorage.setItem('mizan.accent@co2', 'desert'); }
      if (o.dark) localStorage.setItem('mizan.theme', 'dark');
      localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, [D, o]);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); await p.goto('file://' + HTML); await p.waitForTimeout(1800); return { ctx, p };
  };
  const shot = async (p, n) => { if (SHOTS) { await p.mouse.move(2, 600); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const mod = (p) => p.evaluate(() => document.querySelector('.mz').getAttribute('data-module'));
  const cssVar = (p, v) => p.evaluate((v) => getComputedStyle(document.querySelector('.mz')).getPropertyValue(v).trim().toLowerCase(), v);
  const rgb = (p, sel, prop) => p.evaluate(([s, pr]) => getComputedStyle(document.querySelector(s))[pr], [sel, prop]);
  const home = async (p) => { if (await p.locator('.ab-grid').count()) { await p.locator('.ab-grid').click(); await p.waitForTimeout(600); } };
  const app = async (p, id) => { await home(p); await p.locator(`.ah-card[data-app="${id}"]`).click(); await p.waitForTimeout(1100); };
  const toasts = (p) => p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText).join(' / '));
  const salesField = async (p) => { await p.waitForTimeout(1300); return num(await p.locator('.ds-field', { hasText: 'Sales' }).first().locator('.ds-val').innerText()); };

  // ---------- 1. module colours ----------
  let { ctx, p } = await open();
  check(await mod(p) === null, 'Home keeps the colour theme');
  const themeBrand = await cssVar(p, '--brand');
  await app(p, 'sales');
  check(await mod(p) === 'sales' && await cssVar(p, '--m') === '#1d4ed8', 'Sales wears its icon\'s blue');
  await app(p, 'purchase');
  check(await mod(p) === 'purchase' && await cssVar(p, '--m') === '#6d28d9', 'Purchase wears violet');
  const btn = await rgb(p, '.ao-head', 'backgroundImage'), bar = await rgb(p, '.topbar', 'backgroundImage');
  check(/109, 40, 217|42, 17, 102/.test(btn + bar), 'its top bar and banner are violet too');
  await shot(p, 'companies-01-purchase');
  await app(p, 'inventory');
  check(await mod(p) === 'inventory', 'Inventory wears orange');
  await p.locator('.ab-tabs > .ab-tab[data-k="products"]').click(); await p.waitForTimeout(900);
  check(await mod(p) === 'inventory', 'and so do its screens');
  await app(p, 'dash');
  check(await mod(p) === null && await cssVar(p, '--brand') === themeBrand, 'the dashboard keeps the colour theme');
  check((await p.locator('.ds-field[data-mod]').evaluateAll((els) => els.map((e) => e.getAttribute('data-mod')))).join(',') === 'sales,purchase,accounting,bank,sales,purchase,inventory,vat',
    'its key figures carry the colours of the modules they come from');
  await app(p, 'vat'); await p.emulateMedia({ media: 'print' });
  check(await cssVar(p, '--brand') === themeBrand, 'printing keeps the company\'s colours');
  await p.emulateMedia({ media: 'screen' });
  await app(p, 'settings');
  const sw = p.locator('button.mod-sw[role=switch]');
  check(await sw.count() === 1 && await sw.getAttribute('aria-checked') === 'true' && await p.locator('.mod-dots .mod-dot').count() === 11, 'Settings › Appearance: Module colours, on');
  const swBox = await sw.locator('.sw').boundingBox();
  check(swBox && swBox.width >= 30 && swBox.height >= 15, 'the Module colours switch is drawn full size (' + (swBox ? swBox.width + '×' + swBox.height : 'none') + ')');
  await sw.click(); await p.waitForTimeout(300);
  check(await mod(p) === null && await p.evaluate(() => localStorage.getItem('mizan.modcolors')) === 'off', 'turned off: one colour everywhere, remembered');
  await app(p, 'sales'); check(await mod(p) === null, 'Sales now in the theme colour');
  await app(p, 'settings'); await p.locator('button.mod-sw').click(); await p.waitForTimeout(300);
  await app(p, 'sales'); check(await mod(p) === 'sales', 'and back on');
  await ctx.close();
  ({ ctx, p } = await open({ mode: 'sidebar' }));
  const sbBefore = await rgb(p, '.sbar', 'backgroundImage') + await rgb(p, '.sbar', 'backgroundColor');
  await p.locator('.sbar [data-k="bills"]').first().click(); await p.waitForTimeout(800);
  check(await mod(p) === 'purchase' && (await rgb(p, '.sbar', 'backgroundImage') + await rgb(p, '.sbar', 'backgroundColor')) === sbBefore, 'sidebar mode: the screen takes its module\'s colour, the sidebar keeps the company\'s');
  await ctx.close();
  ({ ctx, p } = await open({ dark: true }));
  await app(p, 'sales');
  check(await mod(p) === 'sales' && await cssVar(p, '--brand') === '#7aaeff', 'dark mode uses the lighter tint of each module (' + await cssVar(p, '--brand') + ')');
  await ctx.close();

  // ---------- 2. companies with their branches ----------
  ({ ctx, p } = await open());
  await app(p, 'dash');
  const allSales = await salesField(p);
  await p.locator('.coswitch').click(); await p.waitForTimeout(500);
  const groups = await p.locator('.co-pop .co-grp').evaluateAll((els) => els.map((g) => g.getAttribute('data-company') + ':' + g.querySelectorAll('.co-br').length));
  check(groups.join(',') === 'main:5,co2:3', 'the company list shows each company with its branches underneath (' + groups.join(', ') + ')');
  check(/Working here/.test(await p.locator('.co-pop .co-br', { hasText: 'Dubai head office' }).innerText()), 'and where you are working');
  await shot(p, 'companies-02-switcher');
  await p.locator('.co-pop .co-br', { hasText: 'Deira shop' }).click(); await p.waitForTimeout(900);
  check(/Deira shop — its figures, and new records go there/.test(await toasts(p)), 'picking Deira shop shows its figures and makes it the working branch');
  check(/My Company · Deira shop/.test(await p.locator('.ds-crumb').textContent()) && /Deira shop/.test(await p.locator('.coswitch').innerText()), 'the dashboard and the header say Deira shop');
  const deiraSales = await salesField(p);
  check(deiraSales > 0 && deiraSales < allSales, 'its sales are Deira\'s (' + deiraSales + ' of ' + allSales + ')');
  await p.reload(); await p.waitForTimeout(2000);
  check(/Deira shop/.test(await p.locator('.coswitch').innerText()), 'the choice lasts for this browser tab');

  // ---------- 3. several branches ----------
  await app(p, 'dash');
  check(await p.locator('.ds-brs .ds-br').count() === 5 && await p.locator('.ds-br.on').count() === 1, 'branch chips: All and four branches, Deira on');
  await p.locator('.ds-br[data-branch="br_auh"]').click(); await p.waitForTimeout(400);
  check(/Deira shop \+ Abu Dhabi branch/.test(await p.locator('.ds-crumb').textContent()) && await p.locator('.ds-br.on').count() === 2, 'a second chip adds Abu Dhabi: two branches at once');
  const twoSales = await salesField(p);
  await p.locator('.ds-toolbar [data-tab="branches"]').click(); await p.waitForTimeout(900);
  const rows = await p.locator('.ds-br-tbl tbody tr').evaluateAll((trs) => trs.map((t) => ({ id: t.getAttribute('data-branch'), on: t.classList.contains('on'), sales: t.children[1].innerText, ar: t.children[6].innerText })));
  const S = Object.fromEntries(rows.map((r) => [r.id, num(r.sales)])), AR = rows.reduce((t, r) => t + num(r.ar), 0);
  check(rows.length === 4 && rows.filter((r) => r.on).map((r) => r.id).join(',') === 'br_dei,br_auh', 'Branches tab: every branch, the two on the dashboard ticked');
  check(near(S.br_dei + S.br_auh, twoSales) && near(S.br_dei, deiraSales), 'the two branches\' sales add up to what the dashboard shows (' + twoSales + ')');
  check(near(rows.reduce((t, r) => t + num(r.sales), 0), allSales) && near(num(await p.locator('.ds-br-tbl tfoot td').nth(1).innerText()), allSales), 'all four add up to the company (' + allSales + ')');
  check(AR > 0 && near(AR, num(await p.locator('.ds-br-tbl tfoot td').nth(6).innerText())), 'and so do the amounts to collect');
  check(/whole company/.test(await p.locator('.ds-field', { hasText: 'VAT' }).innerText()) && /whole company/.test(await p.locator('.ds-field', { hasText: 'Stock value' }).innerText()) && /whole company/.test(await p.locator('.ds-field', { hasText: 'Cash & bank' }).innerText()),
    'VAT, stock and cash stay the whole company\'s');
  await shot(p, 'companies-03-branches-tab');
  // reports share the choice, and take several branches
  await app(p, 'reports'); await p.locator('.ab-tabs > .ab-dd > .ab-tab', { hasText: 'Statements' }).click(); await p.waitForTimeout(300);
  await p.locator('.ab-menu button[data-k="r_pnl"]').click(); await p.waitForTimeout(1500);
  check(/Deira shop \+ Abu Dhabi/.test(await p.locator('.br-btn').innerText()) && /2\/4/.test(await p.locator('.br-btn').innerText()), 'the P&L opens on the same two branches');
  check(/Branch: Deira shop \+ Abu Dhabi branch/.test(await p.locator('.page').innerText()), 'and says which branches it covers');
  await p.locator('.br-btn').click(); await p.waitForTimeout(300);
  check(await p.locator('.br-menu .br-opt[aria-selected="true"]').count() === 2 && await p.locator('.br-menu .br-opt').count() === 5, 'the report picker: All branches and each branch, two ticked');
  await p.locator('.br-menu .br-row', { hasText: 'Sharjah outlet' }).locator('.br-opt').click(); await p.waitForTimeout(400);
  check(/3 branches/.test(await p.locator('.br-btn').innerText()), 'tick a third: three branches');
  await shot(p, 'companies-04-report-picker');
  await p.locator('.br-menu .br-opt.all').click(); await p.waitForTimeout(600);
  check(/All branches/.test(await p.locator('.br-btn').innerText()), 'All branches puts the whole company back');
  await app(p, 'dash');
  check(await p.locator('.ds-br.all.on').count() === 1 && near(await salesField(p), allSales), 'and the dashboard follows');
  // lists start on the same choice
  await p.locator('.ds-br[data-branch="br_auh"]').click(); await p.waitForTimeout(500);
  await app(p, 'sales'); await p.locator('.ab-tabs > .ab-tab[data-k="invoices"]').click(); await p.waitForTimeout(900);
  const invRows = await p.locator('.doc-list-tbl tbody tr.click').allInnerTexts();
  check(/Abu Dhabi branch/.test(await p.locator('.br-btn').innerText()) && invRows.length > 0 && invRows.every((r) => /Abu Dhabi branch/.test(r)), 'the invoice list opens on Abu Dhabi\'s invoices');
  await ctx.close();

  // ---------- 4. a branch of another company ----------
  ({ ctx, p } = await open());
  await p.locator('.coswitch').click(); await p.waitForTimeout(500);
  await Promise.all([p.waitForEvent('load'), p.locator('.co-pop .co-grp[data-company="co2"] .co-br', { hasText: 'Ajman warehouse' }).click()]); await p.waitForTimeout(2000);
  check(await p.evaluate(() => localStorage.getItem('mizan.activeCompany')) === 'co2', 'picking Ajman warehouse opens Gulf Star Trading');
  check(/Gulf Star Trading/.test(await p.locator('.coswitch').innerText()) && /Ajman warehouse/.test(await p.locator('.coswitch').innerText()), 'on Ajman warehouse');
  check(await p.evaluate(() => document.querySelector('.mz').getAttribute('data-accent')) === 'desert', 'in its own colour theme');
  await app(p, 'dash');
  check(/Gulf Star Trading L.L.C. · Ajman warehouse/.test(await p.locator('.ds-crumb').textContent()), 'its dashboard shows Ajman warehouse');
  await p.locator('.coswitch').click(); await p.waitForTimeout(500);
  check(/Working here/.test(await p.locator('.co-pop .co-br', { hasText: 'Ajman warehouse' }).innerText()), 'and works there');
  await shot(p, 'companies-05-other-company');
  await ctx.close();

  // ---------- 5. one company, no branches: nothing extra ----------
  ({ ctx, p } = await open({ plain: base }));
  await app(p, 'dash');
  check(await p.locator('.ds-brs').count() === 0 && await p.locator('.ds-toolbar [data-tab="branches"]').count() === 0 && await p.locator('.br-btn').count() === 0, 'without branches there are no chips, no Branches tab and no picker');
  await ctx.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
