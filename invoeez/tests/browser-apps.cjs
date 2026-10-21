/* 3.20: InvoEez as apps. Home (hero, search, Create new, Business applications with filters), an overview for each app,
   the menu grouped by app, the All apps button and g h, Jump back in, apps limited by role, every screen still in the menu,
   dark mode and phone. Run: npm run build, then node tests/browser-apps.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
/* Every screen InvoEez had before it became a set of apps — all must still be in the menu. */
const SCREENS = ['dash', 'accounts', 'acct_groups', 'customers', 'vendors', 'products', 'categories', 'pricelists', 'salespeople', 'methods', 'opening', 'quotes', 'invoices', 'credit_notes',
  'purchase_orders', 'bills', 'debit_notes', 'expenses', 'payments', 'pdc', 'banking', 'journal', 'assets', 'stock_count', 'scrap', 'r_stock', 'reports', 'r_pnl', 'r_branch', 'r_group', 'r_bs',
  'r_aged_ar', 'r_aged_ap', 'r_stmt', 'r_prod', 'r_cust', 'r_method', 'r_tb', 'r_gl', 'r_partner', 'r_vat', 'fta', 'setup', 'users', 'companies', 'branches', 'settings'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (o = {}) => {
    const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 1000 }, acceptDownloads: true });
    await ctx.addInitScript(([fx, theme, pinned]) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); if (pinned) localStorage.setItem('mizan.sidebar', 'pinned');
      localStorage.setItem('mizan.navgroups', '{}'); if (theme) localStorage.setItem('mizan.theme', theme); localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} },
      [fx, o.theme || '', o.pinned !== false]);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
    await p.goto('file://' + HTML); await p.waitForTimeout(1600); return { ctx, p };
  };
  const shot = async (p, n, el) => { if (SHOTS) await (el ? p.locator(el).first().screenshot({ path: path.join(SHOTS, n + '.png') }) : p.screenshot({ path: path.join(SHOTS, n + '.png') })); };
  const nav = async (p, k) => { await p.locator(`.sbar [data-k="${k}"]`).first().click(); await p.waitForTimeout(900); };
  const books = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const fxb = JSON.parse(fx), nInv = fxb.docs.filter((d) => d.type === 'invoice').length;

  // Home with the menu folded, as most people see it
  let { ctx, p } = await open({ pinned: false });
  await p.waitForTimeout(800); await shot(p, 'apps-01-home');
  await ctx.close();
  ({ ctx, p } = await open());
  // ---------- 1. Home ----------
  check(await p.locator('.ah-hero').count() === 1 && /Home/.test(await p.locator('.topbar .crumb').innerText()), 'InvoEez opens on Home');
  check(/Welcome back, Administrator/i.test(await p.locator('.ah-eyebrow').innerText()) && /Everything your business needs/i.test(await p.locator('.ah-title').innerText()), 'a welcome and the headline');
  const cards = await p.locator('.ah-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-app')));
  check(cards.join(',') === 'sales,purchase,inventory,accounting,bank,vat,reports,dash,contacts,org,users,settings', 'twelve business applications (' + cards.length + ')');
  check(new RegExp(nInv + ' invoices').test(await p.locator('.ah-card[data-app="sales"] em').innerText()), 'each card counts its records (Sales: ' + nInv + ' invoices)');
  check(await p.locator('.ah-card .app-art').count() === 12 && await p.locator('.ah-card .ah-go').count() === 12, 'each card has its illustration and an arrow');
  // filters
  const shown = async () => p.locator('.ah-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-app')).join(','));
  await p.locator('.ah-chips button', { hasText: 'Finance' }).click(); await p.waitForTimeout(300);
  check(await shown() === 'accounting,bank,vat', 'Finance: Accounting, Bank & cash, VAT');
  await p.locator('.ah-chips button', { hasText: 'Core' }).click(); await p.waitForTimeout(300);
  check(await shown() === 'sales,purchase,inventory', 'Core: Sales, Purchase, Inventory');
  await p.locator('.ah-chips button', { hasText: 'People' }).click(); await p.waitForTimeout(300);
  check(await shown() === 'contacts,users', 'People: Contacts, Users & access');
  await p.locator('.ah-chips button', { hasText: 'All' }).click(); await p.waitForTimeout(300);
  // search
  await p.locator('.ah-search input').fill('fujairah port'); await p.waitForTimeout(400);
  check(await p.locator('.ah-res').count() > 2 && /Fujairah Port Services/.test(await p.locator('.ah-res').first().innerText()), 'the search finds customers and documents as you type');
  await shot(p, 'apps-02-search');
  await p.locator('.ah-search input').fill('profit & loss'); await p.waitForTimeout(300);
  await p.locator('.ah-search input').press('Enter'); await p.waitForTimeout(900);
  check(/Profit & loss/.test(await p.locator('.topbar .crumb').innerText()), 'Enter opens the first result (Profit & loss)');
  await p.locator('.tb-apps').click(); await p.waitForTimeout(700);
  check(await p.locator('.ah-hero').count() === 1, 'the All apps button returns Home');
  // Create new
  await p.locator('.ah-create').click(); await p.waitForTimeout(300);
  const menu = (await p.locator('.ah-menu button').allInnerTexts()).map((x) => x.trim());
  check(['Invoice', 'Quotation', 'Purchase order', 'Vendor bill', 'Receipt or payment', 'Customer', 'Vendor', 'Product or service', 'Journal entry'].every((x) => menu.includes(x)), 'Create new: documents and records (' + menu.length + ')');
  await shot(p, 'apps-03-create', '.ah-hero');
  await p.locator('.ah-menu button', { hasText: 'Invoice' }).click(); await p.waitForTimeout(900);
  check(/^INV\/\d{4}\/\d{4}$/.test((await p.locator('.du-no').innerText()).trim()) && /Invoices/.test(await p.locator('.topbar .crumb').innerText()), 'Create new › Invoice opens a new invoice');
  await p.keyboard.press('Escape');
  await nav(p, 'home');
  await p.locator('.ah-create').click(); await p.waitForTimeout(300);
  await p.locator('.ah-menu button', { hasText: 'Customer' }).click(); await p.waitForTimeout(900);
  check(/Customers/.test(await p.locator('.topbar .crumb').innerText()) && await p.locator('input').count() > 3, 'Create new › Customer opens the customer form');
  // Jump back in
  await nav(p, 'home');
  const recent = (await p.locator('.ah-recent button').allInnerTexts()).map((x) => x.trim());
  check(recent[0] === 'Customers' && recent.includes('Invoices') && recent.includes('Profit & loss'), 'Jump back in lists the screens you opened (' + recent.join(', ') + ')');

  // ---------- 2. an app's overview ----------
  await p.locator('.ah-card[data-app="sales"]').click(); await p.waitForTimeout(1000);
  check(/Sales/.test(await p.locator('.ao-head h1').innerText()) && /Sales overview/.test(await p.locator('.topbar .crumb').innerText()), 'the Sales card opens the Sales overview');
  check(await p.locator('.ao-kpi').count() === 4 && /Customers owe/.test(await p.locator('.ao-kpis').innerText()), 'four Sales figures');
  const sc = await p.locator('.ao-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-k')));
  check(sc.join(',') === 'quotes,invoices,credit_notes,customers,pricelists,salespeople', 'every Sales screen as a card (' + sc.join(', ') + ')');
  check(+(await p.locator('.ao-card[data-k="invoices"] em').innerText()).replace(/,/g, '') === nInv, 'with its count');
  await p.waitForTimeout(400); await shot(p, 'apps-04-sales');
  await p.locator('.ao-card[data-k="invoices"] .ao-new').click(); await p.waitForTimeout(900);
  check(/^INV\//.test((await p.locator('.du-no').innerText()).trim()), '“+” on Invoices starts a new invoice');
  await p.keyboard.press('Escape');
  await nav(p, 'app_sales');
  await p.locator('.ao-reports button', { hasText: 'Profit by customer' }).click(); await p.waitForTimeout(900);
  check(/Profit by customer/.test(await p.locator('.topbar .crumb').innerText()), 'and its reports are one click away');
  // the other overviews
  const before = errs.length;
  for (const [k, n] of [['app_purchase', 5], ['app_inventory', 5], ['app_accounting', 5], ['app_bank', 4], ['app_vat', 2]]) {
    await nav(p, k);
    check(await p.locator('.ao-card').count() === n && await p.locator('.ao-kpi').count() === 4, k.slice(4) + ' overview: ' + n + ' screens and four figures');
  }
  await nav(p, 'app_bank'); await p.waitForTimeout(400); await shot(p, 'apps-05-bank');
  await nav(p, 'home'); await p.locator('.ah-card[data-app="contacts"]').click(); await p.waitForTimeout(900);
  check(await p.locator('.ao-card').count() === 4 && /Contacts overview/.test(await p.locator('.topbar .crumb').innerText()), 'Contacts brings customers, vendors, sales team and price lists together');
  check(errs.length === before, 'every overview opens without an error');
  for (const [app, k] of [['reports', 'All reports'], ['dash', 'Dashboard'], ['org', 'Companies'], ['users', 'Users & access'], ['settings', 'Settings']]) {
    await nav(p, 'home'); await p.locator(`.ah-card[data-app="${app}"]`).click(); await p.waitForTimeout(900);
    check(new RegExp(k.replace('&', '&')).test(await p.locator('.topbar .crumb').innerText()), `the ${app} card opens ${k}`);
  }

  // ---------- 3. the menu, grouped by app ----------
  const heads = await p.locator('.sbar .sb-head').evaluateAll((els) => els.map((e) => e.getAttribute('data-title')));
  check(heads.join('|') === 'Home|Dashboard|Sales|Purchase|Inventory|Accounting|Bank & cash|Reports|VAT & e-invoicing|Administration', 'the menu is grouped by app (' + heads.join(', ') + ')');
  check(await p.locator('.sbar .sb-head .ic.app').count() === 8, 'each app in the menu has its coloured icon');
  const keys = await p.locator('.sbar [data-k]').evaluateAll((els) => els.map((e) => e.getAttribute('data-k')));
  const missing = SCREENS.filter((k) => !keys.includes(k));
  check(!missing.length, 'every screen from before is still in the menu' + (missing.length ? ' — missing ' + missing.join(', ') : ' (' + SCREENS.length + ')'));
  await shot(p, 'apps-06-menu', '.sbar');
  await nav(p, 'invoices'); await p.mouse.click(700, 500); await p.keyboard.press('g'); await p.keyboard.press('h'); await p.waitForTimeout(700);
  check(await p.locator('.ah-hero').count() === 1, 'g then h goes Home');
  await ctx.close();

  // ---------- 4. apps follow the role ----------
  ({ ctx, p } = await open());
  await nav(p, 'users');
  await p.locator('.btn.pri', { hasText: 'New user' }).click(); await p.waitForTimeout(300);
  await p.locator('.fld', { hasText: 'Full name' }).locator('input').fill('Sami Sales');
  await p.locator('.pick', { hasText: 'Sales' }).first().click();
  await p.locator('.btn.pri', { hasText: 'Create user' }).click(); await p.waitForTimeout(500);
  const sami = (await books(p)).users.find((u) => u.name === 'Sami Sales');
  await p.evaluate((id) => { sessionStorage.setItem('mizan.me', id); localStorage.setItem('mizan.me', id); }, sami.id); await p.reload(); await p.waitForTimeout(1600);
  const mine = await p.locator('.ah-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-app')));
  check(mine.includes('sales') && mine.includes('dash') && !mine.includes('accounting') && !mine.includes('bank') && !mine.includes('settings') && !mine.includes('users'),
    'a salesperson sees only the apps their role opens (' + mine.join(', ') + ')');
  await p.locator('.ah-create').click(); await p.waitForTimeout(300);
  const sm = (await p.locator('.ah-menu button').allInnerTexts()).map((x) => x.trim());
  check(sm.includes('Invoice') && !sm.includes('Vendor bill') && !sm.includes('Journal entry'), 'and Create new offers only what they may create (' + sm.join(', ') + ')');
  await ctx.close();

  // ---------- 5. dark and phone ----------
  ({ ctx, p } = await open({ theme: 'dark' }));
  await p.waitForTimeout(600); await shot(p, 'apps-07-dark');
  check(await p.locator('.ah-card').count() === 12, 'dark mode');
  await ctx.close();
  ({ ctx, p } = await open({ vp: { width: 390, height: 844 } }));
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await p.locator('.ah-glass.left').isHidden(), 'phone: Home fits');
  await shot(p, 'apps-08-phone');
  await p.locator('.ah-card[data-app="purchase"]').click(); await p.waitForTimeout(900);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await p.locator('.ao-card').count() === 5, 'phone: an app overview fits');
  await ctx.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
