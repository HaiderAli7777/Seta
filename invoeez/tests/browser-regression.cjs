/* Full regression for the InvoEez build: empty company, data-entry flow, a year of data,
   old-data cleanup, exports, responsive layouts, branding and contrast. */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = 'file://' + path.resolve(__dirname, 'inv/invoeez.html');
const FIX = fs.readFileSync(path.join(__dirname, 'fixture.json'), 'utf8');
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };

async function open(b, { w = 1440, h = 900, theme = 'light', books = null, company = null, extra = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push('console: ' + m.text().slice(0, 160)); });
  p.on('dialog', (d) => d.accept());
  await p.addInitScript(([t, bk, co, ex]) => { try { if (!sessionStorage.getItem('x')) { localStorage.clear(); localStorage.setItem('mizan.navgroups', '{}'); localStorage.setItem('mizan.theme', t);
    if (bk) localStorage.setItem('mizan.books.v2', bk); if (co) localStorage.setItem('mizan.company', co); if (ex) Object.entries(ex).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('x', '1'); } } catch (e) {} }, [theme, books, company, extra]);
  await p.goto(HTML); await p.waitForTimeout(1300); return p;
}
const navTitles = (p) => p.locator('.nav-item').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
async function nav(p, t, mobile) { if (mobile) { await p.locator('.burger').click(); await p.waitForTimeout(250); } await p.locator(`.nav-item[title="${t}"]`).first().click({ timeout: 4000 }); await p.waitForTimeout(350); }
const books = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* 1. Branding and first start */
  const raw = fs.readFileSync(path.resolve(__dirname, 'inv/invoeez.html'), 'utf8');
  ok('no "Mizan" text in the shipped page', !/>[^<]*Miz<em>a<\/em>n|>\s*Mizan\s*</.test(raw) && !raw.includes('Miz<em>'));
  ok('title is InvoEez — Invoice Made Easy', raw.includes('<title>InvoEez — Invoice Made Easy</title>'));
  ok('splash shows the logo image', /id="boot"[\s\S]{0,400}<img src="data:image\/webp;base64,/.test(raw));
  ok('favicon is the InvoEez mark (PNG)', /<link rel="icon" type="image\/png" href="data:image\/png;base64,/.test(raw));
  let p = await open(b);
  ok('sidebar shows the logo', await p.locator('.side .brand-lockup').isVisible());
  ok('page text never says Mizan', !(await p.evaluate(() => document.body.innerText)).includes('Mizan'));
  let s = await books(p);
  ok('opens as a clean company', s.docs.length + s.payments.length + s.manual.length === 0 && s.accounts.length > 30 && s.categories.length > 20, `${s.accounts.length} accounts, ${s.categories.length} categories`);

  /* 2. Every screen and every create form in an empty company */
  const titles = await navTitles(p); const blank = [];
  for (const t of titles) { await nav(p, t); const txt = await p.locator('.view').innerText(); if (txt.trim().length < 20) blank.push(t); }
  ok(`all ${titles.length} screens render in an empty company`, !blank.length && !p.errs.length, blank.concat(p.errs).join(' | '));
  const forms = [['Quotations', 'New quotation'], ['Invoices', 'New invoice'], ['Credit notes', 'New credit note'], ['Vendor bills', 'New bill'], ['Debit notes', 'New debit note'],
    ['Customers', 'New customer'], ['Vendors', 'New vendor'], ['Products & services', 'New product'], ['Product categories', 'New category'], ['Price lists', 'New price list'],
    ['Sales team', 'New salesperson'], ['Stock counts & adjustments', 'New stock count'], ['Damage & scrap', 'Record scrap'], ['Receipts & payments', 'Record receipt'],
    ['Receipts & payments', 'Record payment'], ['Bank & cash', 'Transfer money'], ['Expenses', 'Record expense'], ['Chart of accounts', 'New account'],
    ['Journal entries', 'New journal entry'], ['Fixed assets', 'Add asset'], ['Payment methods', 'New method'], ['Users & access', 'New user']];
  const failed = [];
  for (const [t, btn] of forms) { const before = p.errs.length; try { await nav(p, t); await p.getByRole('button', { name: btn }).first().click({ timeout: 3000 }); await p.waitForTimeout(300); await p.keyboard.press('Escape'); } catch (e) { failed.push(btn + ': ' + e.message.split('\n')[0]); } if (p.errs.length > before) failed.push(btn + ': ' + p.errs.slice(before).join(';')); }
  ok(`all ${forms.length} create forms open in an empty company`, !failed.length, failed.join(' | '));
  await p.context().close();

  /* 3. A new customer's data-entry flow */
  p = await open(b);
  await nav(p, 'Setup guide');
  await p.locator('.tool-list button').filter({ hasText: 'Products & services' }).click(); await p.waitForTimeout(250);
  await p.locator('.drop-zone input[type=file]').setInputFiles(path.resolve(__dirname, 'testdata/my-products.xlsx')); await p.waitForTimeout(700);
  ok('Excel import checks rows', /4 ready/.test(await p.locator('.import-summary').innerText()) && /2 need fixing/.test(await p.locator('.import-summary').innerText()));
  await p.locator('.studio-modal .modal-actions .btn.pri').click(); await p.waitForTimeout(400);
  await p.locator('.tool-list button').filter({ hasText: 'Customers & vendors' }).click(); await p.waitForTimeout(250);
  await p.locator('.drop-zone input[type=file]').setInputFiles(path.resolve(__dirname, 'testdata/my-contacts.csv')); await p.waitForTimeout(600);
  await p.locator('.studio-modal .modal-actions .btn.pri').click(); await p.waitForTimeout(400);
  await p.locator('.tool-list button').filter({ hasText: 'Bank, receivables' }).click(); await p.waitForTimeout(250);
  await p.locator('.ob-banks input').nth(1).fill('50000'); await p.getByRole('button', { name: 'Post opening balances' }).click(); await p.waitForTimeout(400);
  s = await books(p);
  ok('imports and opening balances saved', s.products.length >= 18 && s.partners.length === 3 && s.manual.length === 1 && s.stockOps.length === 1, `${s.products.length} products, ${s.partners.length} partners`);
  await nav(p, 'Invoices'); await p.getByRole('button', { name: 'New invoice' }).first().click(); await p.waitForTimeout(500);
  ok('new invoice focuses the customer search', (await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'))) === 'Select customer');
  await p.keyboard.type('hilal'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('[data-line-id] input[role="combobox"]').first().click(); await p.keyboard.type('A-101'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('[data-line-id] input[type=number]').first().fill('5'); await p.waitForTimeout(150);
  await p.getByRole('button', { name: 'Post to ledger' }).click(); await p.waitForTimeout(500);
  const status1 = await p.locator('h1 .pill').first().innerText();
  const diag = JSON.stringify({ toasts: await p.locator('.toast').allInnerTexts(), docs: (await books(p)).docs.map((d) => [d.number, d.state, d.partner, d.lines.map((l) => [l.product, l.qty, l.price])]) });
  ok('posted invoice shows a payment status', /Due in|Due today/.test(status1), status1 + ' ' + diag);
  if (!/Due in|Due today/.test(status1)) { await p.screenshot({ path: path.resolve(__dirname, 'shots/final-postfail.png') }); }
  await p.getByRole('button', { name: 'Record payment' }).click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: /^Full/ }).click(); await p.getByRole('button', { name: 'Record', exact: true }).click();
  await p.waitForTimeout(500);
  await nav(p, 'Invoices');
  const rows = await p.locator('.doc-list-tbl tbody tr.click').allInnerTexts();
  ok('invoice paid from its own page is listed as Paid', rows.some((r) => /0002/.test(r) && /Paid/.test(r)) && rows.some((r) => /0001/.test(r) && /Due in/.test(r)), rows.slice(0, 2).join(' / ').replace(/\s+/g, ' '));
  // return 2 of the 5 mice with a credit note typed by hand, then check stock is 80 - 5 + 2
  await p.locator('.doc-list-tbl tbody tr.click').filter({ hasText: '0002' }).click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Credit note', exact: true }).click(); await p.waitForTimeout(500);
  await p.locator('[data-line-id] input[type=number]').first().fill('2'); await p.waitForTimeout(150);
  await p.getByRole('button', { name: 'Post to ledger' }).click(); await p.waitForTimeout(500);
  const mouse = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mizan.books.v2')); const id = s.products.find((x) => x.code === 'A-101').id; return { id, cn: s.docs.filter((d) => d.type === 'credit_note').map((d) => d.lines.map((l) => [typeof l.qty, l.qty])) }; });
  await nav(p, 'Inventory valuation');
  const row = (await p.locator('.tbl tbody tr').filter({ hasText: 'A-101' }).first().innerText()).replace(/\s+/g, ' ');
  ok('credit note with a typed quantity puts stock back correctly', / 77 /.test(' ' + row + ' ') && JSON.stringify(mouse.cn) === '[[["number",2]]]', row + ' ' + JSON.stringify(mouse.cn));
  await nav(p, 'All reports');
  ok('reports hub explains the numbers', /you sold AED/.test(await p.locator('.insight').innerText()));
  await nav(p, 'Customers');
  ok('customers page shows what each owes', (await p.locator('thead').innerText()).includes('OWES YOU') || (await p.locator('thead').innerText()).toLowerCase().includes('owes you'));
  ok('no errors during the data-entry flow', !p.errs.length, p.errs.join(' | '));
  await p.context().close();

  /* 4. A year of data: speed, documents, exports */
  const company = JSON.stringify({ name: 'Al Manara Trading L.L.C.', trn: '100123456700003', address: 'Office 402, Al Barsha 1', city: 'Dubai, United Arab Emirates', phone: '+971 4 000 0000', email: 'accounts@almanara.ae', licence: 'CN-1234567', emirate: 'Dubai', currency: 'AED' });
  p = await open(b, { books: FIX, company });
  const slow = [];
  for (const t of await navTitles(p)) { const t0 = Date.now(); await nav(p, t); const dt = Date.now() - t0 - 350; if (dt > 600) slow.push(`${t} ${dt}ms`); }
  ok('every screen with a year of data opens quickly', !slow.length && !p.errs.length, slow.concat(p.errs).join(' | '));
  for (const t of ['Quotations', 'Invoices', 'Credit notes', 'Vendor bills', 'Debit notes']) { await nav(p, t); await p.locator('.doc-list-tbl tbody tr.click').nth(1).click(); await p.waitForTimeout(350); }
  ok('one document of each type opens', !p.errs.length, p.errs.join(' | '));
  await nav(p, 'Invoices'); await p.getByRole('button', { name: 'Overdue', exact: true }).click(); await p.waitForTimeout(250);
  const od = await p.locator('.doc-list-tbl tbody tr.click').allInnerTexts();
  ok('Overdue filter lists only overdue invoices', od.length > 0 && od.every((r) => /Overdue \d+ day/.test(r)), `${od.length} rows`);
  await p.getByRole('button', { name: 'All', exact: true }).first().click(); await p.waitForTimeout(200);
  await p.locator('.doc-list-tbl tbody tr.click').first().click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Print / send' }).click(); await p.waitForTimeout(500);
  const [pdf] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.getByRole('button', { name: /Download PDF/ }).click()]);
  ok('invoice PDF downloads', pdf && /\.pdf$/.test(pdf.suggestedFilename()), pdf && pdf.suggestedFilename());
  if (pdf) await pdf.saveAs(path.resolve(__dirname, 'shots/final-invoice.pdf'));
  await p.reload(); await p.waitForTimeout(1200);
  await nav(p, 'Profit & loss');
  const [xl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.getByRole('button', { name: 'Excel', exact: true }).click()]);
  ok('P&L exports to Excel', xl && /\.xlsx$/.test(xl.suggestedFilename()), xl && xl.suggestedFilename());
  const [rp] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.getByRole('button', { name: 'PDF', exact: true }).click()]);
  ok('P&L exports to PDF', rp && /\.pdf$/.test(rp.suggestedFilename()), rp && rp.suggestedFilename());
  ok('P&L explains profit in words', /made a (profit|loss) of AED/.test(await p.locator('.insight').innerText()));
  await nav(p, 'Customer statement');
  const [st] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.getByRole('button', { name: /PDF/ }).first().click().catch(() => null)]);
  ok('statement screen works', !p.errs.length, (st && st.suggestedFilename()) || 'no download button pressed');
  ok('no errors with a year of data', !p.errs.length, p.errs.join(' | '));
  await p.context().close();

  /* 5. Old data cleanup vs real data */
  const legacy = JSON.stringify({ schemaVersion: 5, docs: [{ id: 'x', type: 'invoice', number: 'INV/2026/0001', partner: 'p1', date: '2026-02-01', due: '2026-03-01', lines: [], state: 'draft' }], payments: [], partners: [{ id: 'p1', name: 'Al Futtaim Electronics L.L.C.', role: 'customer' }],
    manual: [{ id: 'm', number: 'OPEN/2026/0001', date: '2026-01-01', ref: 'Opening balances — 01 Jan 2026', lines: [] }] });
  p = await open(b, { books: legacy, company: JSON.stringify({ name: 'Zenith General Trading L.L.C.' }) });
  s = await books(p);
  ok('old demo books are replaced by a clean company', s.docs.length === 0 && (await p.locator('.co-card b').innerText()) === 'My Company');
  await p.context().close();
  p = await open(b, { books: FIX, company });
  s = await books(p);
  ok('real company books are kept', s.docs.length > 400);
  await p.context().close();

  /* 6. Layouts: phone, tablet, dark */
  for (const [w, h, theme, label] of [[390, 844, 'light', 'phone'], [820, 1180, 'light', 'tablet'], [1440, 900, 'dark', 'dark desktop'], [390, 844, 'dark', 'dark phone']]) {
    p = await open(b, { w, h, theme, books: FIX, company }); const mobile = w < 900; const over = [];
    for (const t of await navTitles(p)) { await nav(p, t, mobile); const o = await p.evaluate(() => { const pg = document.querySelector('.page'); return Math.max(document.documentElement.scrollWidth - window.innerWidth, pg.scrollWidth - pg.clientWidth); }); if (o > 2) over.push(`${t} +${o}px`); }
    ok(`${label}: every screen fits without sideways scrolling`, !over.length && !p.errs.length, over.concat(p.errs).join(' | '));
    await p.context().close();
  }

  /* 7. Colour contrast of the brand tokens (WCAG AA 4.5:1 for text) */
  p = await open(b);
  const contrast = await p.evaluate(() => {
    const lum = (c) => { const [r, g, bb] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const probe = (fg, bg) => { const el = document.createElement('div'); el.style.color = fg; el.style.background = bg; document.querySelector('.mz').appendChild(el); const cs = getComputedStyle(el); const r = [cs.color, cs.backgroundColor]; el.remove(); return r; };
    const out = {};
    for (const theme of ['light', 'dark']) {
      document.querySelector('.mz').setAttribute('data-theme', theme);
      for (const [n, fg, bg] of [['ink on bg', 'var(--ink)', 'var(--bg)'], ['ink-2 on surface', 'var(--ink-2)', 'var(--surface)'], ['ink-3 on surface', 'var(--ink-3)', 'var(--surface)'],
        ['brand on surface', 'var(--brand)', 'var(--surface)'], ['pos on surface', 'var(--pos)', 'var(--surface)'], ['neg on surface', 'var(--neg)', 'var(--surface)'], ['brand on brand-50', 'var(--brand)', 'var(--brand-50)']]) {
        const [f, bgc] = probe(fg, bg); out[theme + ': ' + n] = Math.round(ratio(f, bgc) * 10) / 10; }
    }
    const nav = getComputedStyle(document.querySelector('.side .nav-item:not(.on)')).color; out['nav text on sidebar'] = Math.round(ratio(nav, 'rgb(28,23,96)') * 10) / 10;
    const btn = document.querySelector('.btn.pri'); document.querySelector('.mz').setAttribute('data-theme', 'light'); out['button text on button'] = Math.round(ratio(getComputedStyle(btn).color, 'rgb(61,49,173)') * 10) / 10;
    return out;
  });
  const low = Object.entries(contrast).filter(([, v]) => v < 4.5);
  ok('all brand text colours meet WCAG AA contrast', !low.length, Object.entries(contrast).map(([k, v]) => `${k} ${v}`).join(', '));
  await p.context().close();

  await b.close();
  const failedN = results.filter((r) => !r.pass).length;
  fs.writeFileSync(path.join(__dirname, 'final-results.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.length - failedN}/${results.length} checks passed`);
  process.exit(failedN ? 1 : 0);
})();
