/* 3.18: several companies and several branches, and reporting by branch and for the group.
   Branches: set up from the Utilities menu (head office from the company, then the next branch), user home branch, the
   Branch field on invoices, payments and journals (a payment follows the invoice it settles), branch filter on the P&L,
   trial balance, balance sheet, dashboard and document lists, Branch performance adds up to the P&L, printed branch address,
   VAT return stays company-wide. Companies: add a company from the menu (copy users), it opens with clean books, switch
   back, Group report adds the companies up, phone layout.
   Run: npm run build, then node tests/browser-branches.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
const num = (t) => { const s = String(t).trim(), neg = /^\(.*\)$/.test(s) || /^[−-]/.test(s); const v = +s.replace(/[^0-9.]/g, ''); return neg ? -v : v; };
const near = (a, b) => Math.abs(a - b) < 0.02;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (o = {}) => {
    const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 }, acceptDownloads: true });
    await ctx.addInitScript((fx) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.sidebar', 'pinned'); localStorage.setItem('mizan.navgroups', '{}');
      localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, fx);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
    await p.goto('file://' + HTML); await p.waitForTimeout(1500); return { ctx, p };
  };
  const shot = async (p, n, el) => { if (SHOTS) await (el ? p.locator(el).first().screenshot({ path: path.join(SHOTS, n + '.png') }) : p.screenshot({ path: path.join(SHOTS, n + '.png') })); };
  const nav = async (p, k) => { await p.locator(`.sbar [data-k="${k}"]`).first().click(); await p.waitForTimeout(900); };
  const books = (p, key = 'mizan.books.v2') => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const toasts = (p) => p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText).join(' / '));
  const pick = async (p, sel, text) => { await sel.click(); await p.waitForTimeout(250); await p.locator('[role=option]', { hasText: text }).first().click(); await p.waitForTimeout(500); };
  const branchSel = (p) => p.locator('button.inp.sel[aria-label="Branch"]');
  /* A financial table as { row label: [numbers…] }. */
  const table = (p, sel) => p.locator(sel).first().evaluate((t) => { const out = {}; t.querySelectorAll('tbody tr').forEach((r) => { const c = [...r.children].map((x) => x.innerText.trim());
    if (c.length > 1) out[c[0]] = c.slice(1); }); return out; });

  let { ctx, p } = await open();
  // ---------- 1. before branches: nothing changes ----------
  await nav(p, 'invoices'); await p.locator('.doc-list-tbl tbody tr.click').first().click(); await p.waitForTimeout(800);
  check(await branchSel(p).count() === 0, 'with one company and no branches, documents have no Branch field');
  await nav(p, 'r_pnl');
  check(await branchSel(p).count() === 0, 'and reports have no branch filter');
  await nav(p, 'r_branch');
  check(/Add branches to compare them/.test(await p.locator('.page').innerText()), 'Branch performance explains how to start');

  // ---------- 2. set up branches ----------
  await nav(p, 'branches');
  check(/Set up branches in two steps/.test(await p.locator('.br-intro').innerText()), 'Branches screen: a two-step introduction');
  await shot(p, 'branches-01-intro');
  await p.locator('.br-intro .btn', { hasText: 'Set up branches' }).click(); await p.waitForTimeout(600);
  let s = await books(p);
  check(s.branches.length === 1 && s.branches[0].name === 'Head office' && s.branches[0].code === 'HO' && s.defaultBranch === s.branches[0].id, 'one click: the company becomes Head office, the default branch');
  check(await p.locator('.card', { hasText: 'New branch' }).count() > 0 && /Head office created/.test(await toasts(p)), 'and the form for the next branch is already open');
  const fillBranch = async (name, code, a1, emirate) => {
    const f = p.locator('.card', { has: p.locator('input[placeholder="e.g. Deira shop"]') });
    await f.locator('input[placeholder="e.g. Deira shop"]').fill(name); await f.locator('input[placeholder="e.g. DRA"]').fill(code);
    await f.locator('input[placeholder="Building, street"]').fill(a1);
    if (emirate) await pick(p, f.locator('button.inp.sel').first(), emirate);
  };
  await fillBranch('Deira shop', 'dra', 'Al Rigga Road, Shop 4', '');
  await shot(p, 'branches-02-form');
  await p.locator('.btn.pri', { hasText: 'Save branch' }).click(); await p.waitForTimeout(500);
  await p.locator('.btn.pri', { hasText: 'New branch' }).click(); await p.waitForTimeout(400);
  await fillBranch('deira SHOP', 'X', 'x', '');
  check(await p.locator('.btn.pri', { hasText: 'Save branch' }).isDisabled() && /Another branch already has that name/.test(await p.locator('.form-error').innerText()), 'two branches cannot share a name');
  await fillBranch('Abu Dhabi branch', 'auh', 'Hamdan Street, Tower 2', 'Abu Dhabi');
  await p.locator('.btn.pri', { hasText: 'Save branch' }).click(); await p.waitForTimeout(500);
  s = await books(p);
  const [HO, DRA, AUH] = s.branches.map((x) => x.id);
  check(s.branches.length === 3 && s.branches[1].code === 'DRA' && s.branches[2].emirate === 'Abu Dhabi' && s.defaultBranch === HO, 'three branches saved; codes in capitals; Head office stays the default');
  check(await p.locator('.br-own').count() === 3 && /Default/.test(await p.locator('.br-own').first().innerText()), 'a card per branch, the default marked');
  const hoDocs = num(await p.locator('.br-own').first().locator('.bo-stats > div').nth(2).locator('b').innerText());
  check(hoDocs > 100, 'everything recorded before branches belongs to Head office (' + hoDocs + ' documents)');
  // switch off / remove rules
  await p.locator('.br-own').first().locator('.btn', { hasText: 'Switch off' }).click(); await p.waitForTimeout(300);
  check(/default branch cannot be switched off/.test(await toasts(p)), 'the default branch cannot be switched off');
  await p.locator('.br-own').first().locator('button[aria-label^="Remove"]').click(); await p.waitForTimeout(300);
  check((await books(p)).branches.length === 3 && /switch it off instead/.test(await toasts(p)), 'a branch with transactions cannot be removed');
  await shot(p, 'branches-03-cards');

  // ---------- 3. a user's home branch ----------
  await nav(p, 'users');
  await p.locator('tr', { hasText: 'Administrator' }).locator('button[title="Edit"]').click(); await p.waitForTimeout(400);
  check(/Head office/.test(await p.locator('button.inp.sel[aria-label="Home branch"]').innerText()), 'users start in the default branch');
  await pick(p, p.locator('button.inp.sel[aria-label="Home branch"]'), 'Deira shop');
  await p.locator('.btn.pri', { hasText: 'Save changes' }).click(); await p.waitForTimeout(500);
  check((await books(p)).users[0].branch === DRA, 'home branch saved on the user');
  await nav(p, 'branches');
  check(await p.locator('.br-own').nth(1).locator('.bo-people span').count() === 1, 'the Deira card shows its user');

  // ---------- 4. an invoice in the home branch ----------
  await nav(p, 'invoices');
  await p.locator('.btn.pri', { hasText: 'New invoice' }).first().click(); await p.waitForTimeout(700);
  check(/Deira shop/.test(await branchSel(p).innerText()), 'a new invoice starts in the user\'s home branch');
  await p.keyboard.type('Fujairah Port'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  await p.locator('[data-line-id] input[role="combobox"]').first().click(); await p.keyboard.type('HP EliteBook'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('[data-line-id] .q-qty').first().fill('2'); await p.waitForTimeout(200);
  await shot(p, 'branches-04-invoice', '.doc-unit');
  await p.locator('.du-acts .btn', { hasText: 'Post to ledger' }).click(); await p.waitForTimeout(900);
  const invNo = (await p.locator('.du-no').innerText()).trim();
  s = await books(p); const inv = s.docs.find((d) => d.number === invNo);
  check(inv && inv.branch === DRA && inv.state === 'posted', invNo + ' posted under Deira shop');
  // the printed invoice carries the branch address
  await p.locator('.btn', { hasText: 'Print / send' }).click(); await p.waitForTimeout(800);
  const sh = await p.locator('.sheet').first().innerText();
  check(/Al Rigga Road, Shop 4/.test(sh) && /Deira shop/.test(sh), 'the printed invoice shows the branch and its address');
  await shot(p, 'branches-05-print', '.sheet');
  await p.locator('.sendbar .btn', { hasText: 'Close' }).click(); await p.waitForTimeout(400);
  // pay it from the invoice: the receipt follows the invoice
  await p.locator('.du-acts .btn.pri', { hasText: 'Record payment' }).click(); await p.waitForTimeout(500);
  await p.locator('.df-pay .btn.pri', { hasText: 'Record' }).click(); await p.waitForTimeout(600);
  s = await books(p); const rc = s.payments.find((x) => x.doc === inv.id);
  check(rc && rc.branch === DRA, 'the receipt recorded on the invoice is in the invoice\'s branch');
  // an old (Head office) invoice paid from Receipts & payments: the branch follows the invoice and is locked
  await nav(p, 'payments');
  await p.locator('.btn', { hasText: 'Record receipt' }).click(); await p.waitForTimeout(400);
  check(/Deira shop/.test(await branchSel(p).innerText()), 'a receipt not tied to an invoice starts in the home branch');
  const pf = p.locator('.card', { hasText: 'New customer receipt' });
  await pick(p, pf.locator('button.inp.sel').nth(0), 'Fujairah Port');
  await pick(p, pf.locator('button.inp.sel').nth(1), 'INV/');
  check(/Head office/.test(await branchSel(p).innerText()) && await branchSel(p).isDisabled(), 'choosing an old invoice moves the receipt to Head office and locks it');
  await pf.locator('input[type=number]').fill('100'); await p.locator('.btn.pri', { hasText: 'Record' }).click(); await p.waitForTimeout(500);
  s = await books(p); const rc2 = s.payments[s.payments.length - 1];
  check(rc2.amount === 100 && rc2.branch === HO, 'saved in Head office');
  // a journal in a chosen branch
  await nav(p, 'journal');
  await p.locator('.btn.pri', { hasText: /New (journal )?entry/ }).first().click(); await p.waitForTimeout(500);
  check(/Deira shop/.test(await branchSel(p).innerText()), 'a new journal starts in the home branch');
  await pick(p, branchSel(p), 'Abu Dhabi branch');
  check(/Abu Dhabi branch/.test(await branchSel(p).innerText()), 'and can be moved to another branch');
  await p.locator('.btn', { hasText: 'Cancel' }).first().click(); await p.waitForTimeout(300);
  // stock counts and cheques too
  await nav(p, 'stock_count'); await p.locator('.btn.pri', { hasText: 'New stock count' }).click(); await p.waitForTimeout(400);
  check(/Deira shop/.test(await p.locator('.studio-modal').last().locator('button.inp.sel[aria-label="Branch"]').innerText()), 'a stock count has a branch');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await nav(p, 'pdc'); await p.locator('.btn.pri', { hasText: 'Receive cheque' }).click(); await p.waitForTimeout(400);
  check(await p.locator('.studio-modal').last().locator('button.inp.sel[aria-label="Branch"]').count() === 1, 'so does a post-dated cheque');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // ---------- 5. reports by branch ----------
  await nav(p, 'r_branch');
  const bt = await table(p, '.br-tbl');
  const heads = await p.locator('.br-tbl thead th').allInnerTexts();
  check(heads.slice(1).map((x) => x.trim().toUpperCase()).join('|') === 'HEAD OFFICE|DEIRA SHOP|ABU DHABI BRANCH|ALL BRANCHES', 'Branch performance: a column per branch and the total');
  const rev = bt['Revenue'].map(num), net = bt['Net profit'].map(num);
  check(near(rev[0] + rev[1] + rev[2], rev[3]) && near(net[0] + net[1] + net[2], net[3]), 'the branches add up to All branches (revenue ' + bt['Revenue'].join(' + ') + ')');
  check(near(rev[1], inv.lines.reduce((t, l) => t + l.qty * l.price * (1 - (l.disc || 0) / 100), 0)) && num(bt['Invoices issued'][1]) === 1, 'Deira shows the one invoice it issued (' + bt['Revenue'][1] + ')');
  check(num(bt['Cash collected'][1]) > 0 && near(num(bt['Customers owe (at period end)'][1]), 0), 'Deira collected its invoice and is owed nothing');
  await p.waitForTimeout(1200); await shot(p, 'branches-06-performance');
  // P&L, all branches vs one branch
  await nav(p, 'r_pnl');
  check(/All branches/.test(await branchSel(p).innerText()), 'P&L: branch filter, all branches by default');
  const pnlRev = async () => num((await table(p, '.fin-tbl'))['Revenue'][0]);
  const allRev = await pnlRev();
  check(near(allRev, rev[3]), 'All branches equals the company P&L (' + allRev + ')');
  await pick(p, branchSel(p), 'Deira shop'); await p.waitForTimeout(1500);
  check(near(await pnlRev(), rev[1]) && /Branch: Deira shop/.test(await p.locator('.page').innerText()), 'Deira\'s P&L matches its column and says which branch it is');
  await shot(p, 'branches-07-pnl-branch');
  // the filter carries to the trial balance and balance sheet, which balance per branch
  await nav(p, 'r_tb');
  check(/Deira shop/.test(await branchSel(p).innerText()), 'the branch filter stays on across reports');
  const tbTot = (await p.locator('.page table tr', { hasText: /^\s*Totals/ }).last().innerText()).split(/\t|\n/).map((x) => x.trim()).filter((x) => /\d/.test(x)).map(num);
  check(tbTot.length >= 2 && tbTot[0] > 0 && near(tbTot[tbTot.length - 2], tbTot[tbTot.length - 1]), 'Deira\'s trial balance balances (' + tbTot.join(' / ') + ')');
  await nav(p, 'r_bs');
  check(/The statement balances/.test(await p.locator('.page').innerText()) && /Branch: Deira shop/.test(await p.locator('.page').innerText()), 'and its balance sheet balances');
  // every other report opens for one branch
  const errsBefore = errs.length; let shown = 0;
  for (const k of ['r_gl', 'r_partner', 'r_aged_ar', 'r_aged_ap', 'r_stmt', 'r_prod', 'r_cust', 'r_method', 'r_stock', 'banking', 'expenses', 'pdc', 'assets', 'stock_count', 'reports']) {
    await nav(p, k); if ((await p.locator('.page').innerText()).length > 80) shown++; }
  check(errs.length === errsBefore && shown === 15, 'all other reports and screens open with a branch chosen (' + shown + ')');
  await nav(p, 'r_pnl'); await pick(p, branchSel(p), 'All branches');
  await nav(p, 'r_vat');
  check(await branchSel(p).count() === 0, 'the VAT return stays one return for the whole company');
  // dashboard
  await nav(p, 'dash');
  const heroNet = async () => num(await p.locator('.dash-hero, .hero').first().evaluate((h) => { const e = [...h.querySelectorAll('*')].find((x) => /NET PROFIT/i.test(x.textContent) && x.children.length === 0); const box = e && e.parentElement; return box ? box.innerText.replace(/NET PROFIT/i, '') : ''; }));
  await pick(p, branchSel(p), 'Deira shop'); await p.waitForTimeout(1600);
  check(/Deira shop/.test(await branchSel(p).innerText()) && near(await heroNet(), net[1]) && /My Company · Deira shop is doing/.test(await p.locator('.dh-sub').innerText()), 'dashboard for one branch (net profit ' + net[1] + ')');
  const stockTile = await p.locator('.kpi-tile', { hasText: 'Stock value' }).last().innerText();
  check(/whole company/.test(stockTile) && !/\(/.test(stockTile.split('\n').find((x) => /\d/.test(x)) || ''), 'stock value stays the whole company\'s, never negative for a branch');
  await shot(p, 'branches-08-dashboard');
  await pick(p, branchSel(p), 'All branches');
  // document list filter
  await nav(p, 'invoices');
  await pick(p, branchSel(p), 'Deira shop');
  const rows = await p.locator('.doc-list-tbl tbody tr.click').allInnerTexts();
  check(rows.length === 1 && rows[0].includes(invNo) && /Deira shop/.test(rows[0]), 'the invoice list filters by branch and names it');
  await pick(p, branchSel(p), 'All branches');

  // ---------- 6. a second company ----------
  await p.locator('.sb-co').click(); await p.waitForTimeout(400);
  check(await p.locator('.co-pop .co-row').count() === 1, 'the company card opens the company switcher');
  await shot(p, 'branches-09-switcher', '.co-pop');
  await p.locator('.co-pop .btn', { hasText: 'Add a company' }).click(); await p.waitForTimeout(500);
  const m = p.locator('.studio-modal').last();
  await m.locator('input[placeholder="e.g. Al Manara Trading L.L.C."]').fill('Gulf Star Trading L.L.C.');
  await m.locator('input[placeholder="15 digits, or leave blank"]').fill('100234567800003');
  await m.locator('input[placeholder="Office / building, street"]').fill('Office 1204, Al Ghaith Tower');
  check(await m.locator('.same-users input').isChecked(), 'the same users are copied by default');
  await shot(p, 'branches-10-add-company', '.studio-modal');
  await m.locator('.btn.pri', { hasText: 'Next: choose what to copy' }).click(); await p.waitForTimeout(400);
  await m.locator('.keep-row', { hasText: 'Products & services' }).locator('input').check();
  check(/stays exactly as it is/.test(await m.innerText()), 'the current company is left untouched');
  const before = JSON.stringify(await books(p));
  await Promise.all([p.waitForEvent('load'), m.locator('.btn.pri', { hasText: 'Create Gulf Star' }).click()]); await p.waitForTimeout(1600);
  const reg = await p.evaluate(() => ({ list: JSON.parse(localStorage.getItem('mizan.companies')), act: localStorage.getItem('mizan.activeCompany') }));
  check(reg.list.length === 2 && reg.list[1].name === 'Gulf Star Trading L.L.C.' && reg.act === reg.list[1].id, 'the new company is registered and open');
  check(/Gulf Star Trading/.test(await p.locator('.sb-co').innerText()), 'the menu shows the new company');
  const nb = await books(p, 'mizan.books.v2@' + reg.act);
  check(nb.docs.length === 0 && nb.payments.length === 0 && nb.products.length > 50 && nb.users.length === 1 && !(nb.branches || []).length, 'clean books with the copied products and users, and no branches');
  check(JSON.stringify(await books(p)) === before, 'the first company\'s books did not change');
  await nav(p, 'branches');
  check(await p.locator('.br-intro').count() === 1, 'branches belong to each company');
  await nav(p, 'r_group');
  const gt = await table(p, '.br-tbl');
  const gh = (await p.locator('.br-tbl thead th').allInnerTexts()).map((x) => x.trim().toUpperCase());
  check(gh.length === 4 && /GULF STAR/.test(gh[2]) && gh[3] === 'GROUP TOTAL', 'Group report: both companies and the group total (' + gh.slice(1).join(' | ') + ')');
  check(near(num(gt['Revenue'][0]), rev[3]) && near(num(gt['Revenue'][2]), rev[3]) && near(num(gt['Revenue'][1]), 0), 'the group adds up: the first company\'s revenue plus nothing yet');
  check(num(gt['Cost of sales'][0]) < 0 && near(num(gt['Net profit'][2]), net[3]), 'costs in brackets, net profit as in Branch performance');
  await p.waitForTimeout(1200);
  await shot(p, 'branches-11-group');
  // back to the first company
  await p.locator('.sb-co').click(); await p.waitForTimeout(400);
  await Promise.all([p.waitForEvent('load'), p.locator('.co-pop .co-row').first().click()]); await p.waitForTimeout(1600);
  check(!/Gulf Star/.test(await p.locator('.sb-co').innerText()) && (await p.evaluate(() => localStorage.getItem('mizan.activeCompany'))) === 'main', 'switched back to the first company');
  await nav(p, 'r_branch');
  check(await p.locator('.br-tbl').count() === 1, 'its branches are still there');
  await nav(p, 'settings');
  check(await p.locator('#companies .co-setrow').count() === 2, 'Settings lists both companies');
  await p.waitForTimeout(500); await shot(p, 'branches-13-settings', '#companies');
  await p.locator('#companies .co-setrow', { hasText: 'Gulf Star' }).locator('button[aria-label^="Remove"]').click(); await p.waitForTimeout(500);
  const left = await p.evaluate((id) => ({ n: JSON.parse(localStorage.getItem('mizan.companies')).length, books: localStorage.getItem('mizan.books.v2@' + id), main: !!localStorage.getItem('mizan.books.v2') }), reg.act);
  check(left.n === 1 && left.books === null && left.main && await p.locator('#companies .co-setrow').count() === 1, 'a company can be removed from the other one, with its books');
  await ctx.close();

  // ---------- 7. phone ----------
  ({ ctx, p } = await open({ vp: { width: 390, height: 844 } }));
  await p.locator('.burger').click(); await p.waitForTimeout(400); await p.locator('.sbar [data-k="branches"]').first().click(); await p.waitForTimeout(700);
  await p.locator('.br-intro .btn', { hasText: 'Set up branches' }).click(); await p.waitForTimeout(500);
  const fits = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  check(await fits(), 'phone: the branch form fits');
  await shot(p, 'branches-12-phone');
  await ctx.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
