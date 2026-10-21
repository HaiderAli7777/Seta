/* 3.20–3.22: two ways to get around. Sidebar (the default): the classic menu, no Home and no app overviews, opening on the
   dashboard. Apps dashboard: no sidebar; Home is just the search box and the apps — all of them in view at 1920×880 and
   1366×657; a light top bar with the app switcher and each app's menu (tabs, Reporting and Configuration dropdowns, More);
   every screen in one home app; app overviews with Transactions / Master data cards, the latest activity and Reporting /
   Configuration panels; apps limited by role, phone menu, dark mode. Switching from Settings and Ctrl K (no longer from the
   user menu).
   Run: npm run build, then node tests/browser-apps.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
/* Every screen InvoEez has — each must be reachable in both kinds of navigation. */
const SCREENS = ['dash', 'accounts', 'acct_groups', 'customers', 'vendors', 'products', 'categories', 'pricelists', 'salespeople', 'methods', 'opening', 'quotes', 'invoices', 'credit_notes',
  'purchase_orders', 'bills', 'debit_notes', 'expenses', 'payments', 'pdc', 'banking', 'journal', 'assets', 'stock_count', 'scrap', 'r_stock', 'reports', 'r_pnl', 'r_branch', 'r_group', 'r_bs',
  'r_aged_ar', 'r_aged_ap', 'r_stmt', 'r_prod', 'r_cust', 'r_method', 'r_tb', 'r_gl', 'r_partner', 'r_vat', 'fta', 'setup', 'users', 'companies', 'branches', 'settings'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (o = {}) => {
    const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 1000 }, acceptDownloads: true });
    await ctx.addInitScript(([fx, extra]) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.sidebar', 'pinned');
      localStorage.setItem('mizan.navgroups', '{}'); Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v)); localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} },
      [fx, { ...(o.apps ? { 'mizan.navmode': 'apps' } : {}), ...(o.theme ? { 'mizan.theme': o.theme } : {}), ...(o.pinned === false ? { 'mizan.sidebar': 'folded' } : {}) }]);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
    await p.goto('file://' + HTML); await p.waitForTimeout(1600); return { ctx, p };
  };
  const shot = async (p, n, el) => { if (SHOTS) await (el ? p.locator(el).first().screenshot({ path: path.join(SHOTS, n + '.png') }) : p.screenshot({ path: path.join(SHOTS, n + '.png') })); };
  const books = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const fxb = JSON.parse(fx), nInv = fxb.docs.filter((d) => d.type === 'invoice').length;
  const appName = (p) => p.locator('.ab-app b').innerText().catch(() => '');
  const onTab = (p) => p.locator('.ab-tab.on').first().innerText().then((t) => t.trim()).catch(() => '');
  const home = async (p) => { await p.locator('.ab-grid').click(); await p.waitForTimeout(700); };
  const card = async (p, id) => { await p.locator(`.ah-card[data-app="${id}"]`).click(); await p.waitForTimeout(900); };
  /* Opens a screen from the app bar: a tab, a dropdown item, or an item under More. */
  const viaBar = async (p, k) => {
    const tab = p.locator(`.ab-tabs > .ab-tab[data-k="${k}"]`);
    if (await tab.count()) { await tab.click(); await p.waitForTimeout(800); return true; }
    for (const dd of await p.locator('.ab-tabs > .ab-dd > .ab-tab').all()) {
      await dd.click(); await p.waitForTimeout(200);
      const it = p.locator(`.ab-menu button[data-k="${k}"]`);
      if (await it.count()) { await it.click(); await p.waitForTimeout(800); return true; }
      await p.keyboard.press('Escape'); await p.mouse.click(5, 990); await p.waitForTimeout(150);
    }
    return false;
  };

  // ---------- 1. Sidebar, the default ----------
  let { ctx, p } = await open();
  check(await p.locator('.sbar').count() === 1 && await p.locator('.dash-hero').count() === 1 && await p.locator('.ah-hero').count() === 0, 'Sidebar is the default and opens on the dashboard');
  const heads = await p.locator('.sbar .sb-head').evaluateAll((els) => els.map((e) => e.getAttribute('data-title')));
  check(heads.join('|') === 'Dashboard|Master|Sale|Purchase|Banking|Accounting trans.|Stock management|Reports|VAT & e-invoicing|Utilities & tools', 'the classic menu (' + heads.join(', ') + ')');
  const sideKeys = await p.locator('.sbar [data-k]').evaluateAll((els) => els.map((e) => e.getAttribute('data-k')));
  check(!sideKeys.includes('home') && !sideKeys.some((k) => /^app_/.test(k)) && await p.locator('.ab-l').count() === 0, 'no Home, no app overviews and no app bar in Sidebar mode');
  check(SCREENS.every((k) => sideKeys.includes(k)), 'every screen is in the menu (' + SCREENS.length + ')');
  await p.mouse.click(700, 600); await p.keyboard.press('g'); await p.keyboard.press('h'); await p.waitForTimeout(500);
  check(await p.locator('.ah-hero').count() === 0, 'g h does nothing in Sidebar mode');
  await p.locator('.sbar [data-k="settings"]').first().click(); await p.waitForTimeout(800);
  check(/In use/.test(await p.locator('.nc-opt[data-mode="sidebar"]').innerText()) && await p.locator('.nav-card').count() === 1, 'Settings opens with the Navigation choice, Sidebar in use');
  await shot(p, 'nav-01-settings', '.nav-card');
  // ---------- 2. switching to the apps dashboard ----------
  await p.locator('.nc-opt[data-mode="apps"]').click(); await p.waitForTimeout(1200);
  check(await p.locator('.sbar').count() === 0 && await p.locator('.ah-grid').count() === 1 && await p.locator('.ab-brand').count() === 1, 'Apps dashboard: the sidebar is gone and Home opens');
  check(await p.evaluate(() => localStorage.getItem('mizan.navmode')) === 'apps', 'remembered on this device');
  await p.reload(); await p.waitForTimeout(1500);
  check(await p.locator('.sbar').count() === 0 && await p.locator('.ah-grid').count() === 1, 'and still so after reloading');
  // the user menu no longer carries the switch; Settings › Navigation does
  await p.locator('.userchip').click(); await p.waitForTimeout(250);
  check(await p.locator('.pop').count() === 1 && !/Navigation/.test(await p.locator('.pop').innerText()) && await p.locator('.pop .nav-seg').count() === 0, 'the user menu has no Navigation switch');
  await p.locator('.pop-item', { hasText: 'Settings' }).click(); await p.waitForTimeout(900);
  await p.locator('.nc-opt[data-mode="sidebar"]').click(); await p.waitForTimeout(1000);
  check(await p.locator('.sbar').count() === 1 && await p.locator('.dash-hero').count() === 1, 'Settings › Navigation switches back to the sidebar, on the dashboard');
  // and to apps from Ctrl K
  await p.keyboard.press('Control+k'); await p.waitForTimeout(300); await p.keyboard.type('apps dashboard'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
  check(await p.locator('.ah-grid').count() === 1, 'Ctrl K › Switch to the apps dashboard');
  await ctx.close();

  // ---------- 3. Home in the apps dashboard: just the search and the apps ----------
  ({ ctx, p } = await open({ apps: true }));
  await p.waitForTimeout(800); await shot(p, 'nav-02-home');
  check(await p.locator('.ah-eyebrow, .ah-title, .ah-sub, .ah-recent, .ah-glance, .ah-g, .ah-create, .ah-chips').count() === 0 && await p.locator('.ah-search input').count() === 1,
    'Home: no greeting, headline, shortcuts, figures or filters — the search box and the apps');
  const cards = await p.locator('.ah-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-app')));
  check(cards.join(',') === 'sales,purchase,inventory,accounting,bank,vat,reports,dash,contacts,org,users,settings', 'twelve apps');
  check(new RegExp(nInv + ' invoices').test(await p.locator('.ah-card[data-app="sales"] em').innerText()), 'each app counts its records (Sales: ' + nInv + ' invoices)');
  check(await p.locator('.topbar .ab-brand .ab-word').innerText() === 'InvoEez' && !(await p.locator('.topbar .omni').isVisible()) && await p.locator('.topbar .tb-icons > .icon-btn:visible').count() === 0,
    'the top bar on Home: the logo, New, alerts, the company and you — no second search box');
  check(await p.locator('.topbar .tb-r .btn.pri', { hasText: 'New' }).isVisible() && await p.locator('.topbar .bell').isVisible() && await p.locator('.topbar .coswitch').isVisible() && await p.locator('.topbar .userchip').isVisible(), 'New, alerts, company and account are in the bar');
  // search
  await p.locator('.ah-search input').fill('fujairah port'); await p.waitForTimeout(400);
  check(await p.locator('.ah-res').count() > 2, 'search finds as you type');
  await p.locator('.ah-search input').fill('profit & loss'); await p.waitForTimeout(300); await p.locator('.ah-search input').press('Enter'); await p.waitForTimeout(900);
  check(await appName(p) === 'Reports' && await onTab(p) === 'Statements', 'Profit & loss opens in Reports › Statements');
  await home(p);
  check(await p.locator('.ah-grid').count() === 1, 'the apps button returns Home');
  // New in the top bar
  await p.locator('.topbar .tb-r .btn.pri', { hasText: 'New' }).click(); await p.waitForTimeout(300);
  await p.locator('.newpop button', { hasText: 'Customer invoice' }).click(); await p.waitForTimeout(900);
  check(/^INV\/\d{4}\/\d{4}$/.test((await p.locator('.du-no').innerText()).trim()) && await appName(p) === 'Sales' && await onTab(p) === 'Invoices', 'New › Customer invoice opens a new invoice in Sales › Invoices');
  await p.keyboard.press('Escape');
  await ctx.close();
  // every app in one view, without scrolling, at 100% zoom on a full-HD screen and on a laptop
  for (const vp of [{ width: 1920, height: 880 }, { width: 1366, height: 657 }, { width: 1280, height: 600 }]) {
    ({ ctx, p } = await open({ apps: true, vp })); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const c = [...document.querySelectorAll('.ah-card')].map((e) => e.getBoundingClientRect()); return { n: c.length, bottom: Math.max(...c.map((b) => b.bottom)), right: Math.max(...c.map((b) => b.right)) }; });
    check(r.n === 12 && r.bottom <= vp.height && r.right <= vp.width, `all twelve apps in view at ${vp.width}×${vp.height} (last card ends at ${Math.round(r.bottom)}px)`);
    await ctx.close();
  }
  ({ ctx, p } = await open({ apps: true }));

  // ---------- 4. inside an app ----------
  await card(p, 'sales');
  const tabs = await p.locator('.ab-tabs > .ab-tab, .ab-tabs > .ab-dd > .ab-tab').allInnerTexts();
  check(await appName(p) === 'Sales' && await onTab(p) === 'Overview' && tabs.map((t) => t.trim()).slice(0, 5).join('|') === 'Overview|Quotations|Invoices|Credit notes|Customers', 'Sales has its own menu bar (' + tabs.map((t) => t.trim()).join(', ') + ')');
  check(await p.locator('.ao-kpi').count() === 4 && await p.locator('.ao-card').count() === 4 && await p.locator('.ao-row').count() === 6 && await p.locator('.ao-li').count() === 6, 'and opens on its overview');
  const secs = await p.locator('.ao-sec[data-kind]').evaluateAll((els) => els.map((e) => e.getAttribute('data-kind') + ':' + [...e.querySelectorAll('.ao-card')].map((c) => c.getAttribute('data-k')).join('+')));
  const panels = await p.locator('.ao-panel').evaluateAll((els) => els.map((e) => e.getAttribute('data-group') + ':' + [...e.querySelectorAll('.ao-row')].map((c) => c.getAttribute('data-k')).join('+')));
  check(secs.join('|') === 'Transactions:quotes+invoices+credit_notes|Master data:customers' && panels.join('|') === 'Reporting:r_cust+r_prod+r_aged_ar+r_stmt|Configuration:pricelists+salespeople',
    'the overview is split into Transactions, Master data, Reporting and Configuration (' + secs.concat(panels).join(' · ') + ')');
  check(/INV\/|QUO\/|CN\//.test(await p.locator('.ao-li').first().innerText()), 'with the latest sales documents');
  await p.locator('.ao-li').first().click(); await p.waitForTimeout(900);
  check(await p.locator('.du-no').count() === 1 && await appName(p) === 'Sales', 'a latest document opens in place');
  await p.keyboard.press('Escape'); await viaBar(p, 'app_sales');
  check(await p.locator('.topbar.in-app').count() === 1 && await p.locator('.page.in-app').count() === 1, 'inside an app the bar and the page take its colour');
  await p.waitForTimeout(500); await shot(p, 'nav-03-sales');
  await viaBar(p, 'invoices');
  check(await onTab(p) === 'Invoices' && await p.locator('.doc-list-tbl tbody tr').count() > 5, 'Invoices tab: the invoice list');
  check(await p.locator('.page-head .micro').first().innerText().then((t) => t.trim().toLowerCase()) === 'sales', 'pages are labelled with their app');
  check(await viaBar(p, 'r_aged_ar') && await appName(p) === 'Sales' && /Aged Receivable/i.test(await p.locator('.page').innerText()), 'Reporting › Aged receivable stays inside Sales');
  // the app switcher
  await p.locator('.ab-app').click(); await p.waitForTimeout(300);
  check(await p.locator('.ab-switch .ab-sw').count() === 12 && await p.locator('.ab-switch .ab-sw.on').getAttribute('data-app') === 'sales', 'the app name opens the app switcher');
  await shot(p, 'nav-08-switcher');
  await p.locator('.ab-switch .ab-sw[data-app="purchase"]').click(); await p.waitForTimeout(900);
  check(await appName(p) === 'Purchase' && await onTab(p) === 'Overview', 'and jumps straight to another app');
  await p.locator('.ab-dd .ab-tab').first().click(); await p.waitForTimeout(300); await shot(p, 'nav-04-dropdown'); await p.mouse.click(5, 990); await p.waitForTimeout(200);
  // context follows where you came from
  await home(p); await card(p, 'contacts');
  await viaBar(p, 'customers');
  check(await appName(p) === 'Contacts' && await onTab(p) === 'Customers' && (await p.locator('.page-head .micro').first().innerText()).trim().toLowerCase() === 'contacts', 'Customers opened from Contacts stays in Contacts');
  // every screen is reachable from some app
  const reach = new Set(), homes = {}, menus = {};
  for (const id of cards) {
    await home(p); await card(p, id);
    const ks = await p.locator('.ab-tabs > .ab-tab[data-k]').evaluateAll((els) => els.map((e) => e.getAttribute('data-k')));
    const groups = [];
    for (const dd of await p.locator('.ab-tabs > .ab-dd > .ab-tab').all()) { await dd.click(); await p.waitForTimeout(150);
      groups.push((await dd.innerText()).trim());
      ks.push(...await p.locator('.ab-menu button[data-k]').evaluateAll((els) => els.map((e) => e.getAttribute('data-k'))));
      await p.mouse.click(5, 990); await p.waitForTimeout(120); }
    menus[id] = groups;
    ks.forEach((k) => { reach.add(k); if (!/^r_|^app_/.test(k) && k !== 'reports') (homes[k] = homes[k] || []).push(id); });
  }
  const lost = SCREENS.filter((k) => !reach.has(k));
  check(!lost.length, 'every screen is reachable from an app’s menu' + (lost.length ? ' — missing ' + lost.join(', ') : ' (' + SCREENS.length + ')'));
  const twice = Object.entries(homes).filter(([k, a]) => a.length > 1 && !(a.length === 2 && a.includes('contacts') && ['customers', 'vendors', 'salespeople'].includes(k)));
  check(!twice.length, 'each screen lives in one app (only customers, vendors and the sales team are also in Contacts)' + (twice.length ? ' — ' + twice.map(([k, a]) => k + ' in ' + a.join('+')).join(', ') : ''));
  const order = Object.entries(menus).filter(([id, g]) => !['reports'].includes(id) && g.length).map(([id, g]) => id + ':' + g.join('>'));
  check(order.every((x) => /:(Reporting(>Configuration)?|Configuration)$/.test(x)), 'every app ends its menu with Reporting, then Configuration (' + order.join(', ') + ')');
  await home(p); await card(p, 'settings');
  check(await appName(p) === 'Settings' && /Navigation/.test(await p.locator('.page').innerText()), 'Settings has the Navigation choice in the apps dashboard too');
  await p.keyboard.press('g'); await p.keyboard.press('h'); await p.waitForTimeout(600);
  check(await p.locator('.ah-grid').count() === 1, 'g h goes Home');
  await ctx.close();

  // ---------- 5. narrower screens: tabs that do not fit go under More ----------
  ({ ctx, p } = await open({ apps: true, vp: { width: 1100, height: 900 } }));
  await card(p, 'purchase');
  check(await p.locator('.ab-tabs > .ab-dd > .ab-tab', { hasText: 'More' }).count() === 1 && await p.evaluate(() => document.querySelector('.ab-tabs').scrollWidth <= document.querySelector('.ab-tabs').clientWidth + 2),
    'at 1100px Purchase’s last tabs move under More, without overlapping');
  check(await viaBar(p, 'r_partner') && /Partner ledger/i.test(await p.locator('.page').innerText()), 'and are reachable from it');
  await ctx.close();

  // ---------- 6. apps follow the role ----------
  ({ ctx, p } = await open({ apps: true }));
  await card(p, 'users');
  await p.locator('.btn.pri', { hasText: 'New user' }).click(); await p.waitForTimeout(300);
  await p.locator('.fld', { hasText: 'Full name' }).locator('input').fill('Sami Sales');
  await p.locator('.pick', { hasText: 'Sales' }).first().click();
  await p.locator('.btn.pri', { hasText: 'Create user' }).click(); await p.waitForTimeout(500);
  const sami = (await books(p)).users.find((u) => u.name === 'Sami Sales');
  await p.evaluate((id) => { sessionStorage.setItem('mizan.me', id); localStorage.setItem('mizan.me', id); }, sami.id); await p.reload(); await p.waitForTimeout(1600);
  const mine = await p.locator('.ah-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-app')));
  check(mine.includes('sales') && !mine.includes('accounting') && !mine.includes('bank') && !mine.includes('settings'), 'a salesperson sees only the apps their role opens (' + mine.join(', ') + ')');
  await ctx.close();

  // ---------- 7. dark and phone ----------
  ({ ctx, p } = await open({ apps: true, theme: 'dark' }));
  await card(p, 'inventory'); await p.waitForTimeout(500); await shot(p, 'nav-05-dark');
  check(await appName(p) === 'Inventory', 'dark mode');
  await ctx.close();
  ({ ctx, p } = await open({ apps: true, vp: { width: 390, height: 844 } }));
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await p.locator('.topbar .userchip').isVisible(), 'phone: Home fits, with the account button in the bar');
  await shot(p, 'nav-06-phone-home');
  await card(p, 'purchase');
  await p.locator('.ab-app').click(); await p.waitForTimeout(400);
  check(await p.locator('.ab-sheet button[data-k]').count() >= 6, 'phone: the app name opens its menu');
  await shot(p, 'nav-07-phone-menu');
  await p.locator('.ab-sheet button[data-k="bills"]').click(); await p.waitForTimeout(900);
  check(/Vendor Bills/i.test(await p.locator('.page').innerText()) && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: and opens the screen');
  await ctx.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
