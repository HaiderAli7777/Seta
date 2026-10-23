/* 3.26: open a customer, vendor or product from wherever it is used, change it, and the open document follows.
   - On an invoice: an arrow in the customer field, one on every product line and the customer named in the heading open the record
     in a panel (figures at a glance, details, activity); Esc asks before throwing changes away; Ctrl S saves the record, not the invoice.
   - Saving brings the draft up to date: payment terms move the due date, the territory moves the place of supply, a new product
     price and name reach its lines while a price typed on a line stays; a posted invoice keeps its figures.
   - A customer created from the picker is saved and selected in one step; an overdue customer is flagged on a new draft.
   - The Customers screen (tiles that filter, rows that open, new and edit in the panel, TRN check), the product library, receipts,
     expenses and post-dated cheques open the same panel; a salesperson can change customers but only look at products, without costs.
   - Dark mode and a phone.
   Run: npm run build, then node tests/browser-records.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fxb = JSON.parse(fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8'));
/* a salesperson who sells as Omar Siddiqui, whose draft INV/2026/0287 is for Bluewave Marketing Studio */
fxb.users = [...fxb.users, { id: 'u_sam', name: 'Sam Seller', email: '', role: 'sales', active: true, salesperson: 'u3' }];
const fx = JSON.stringify(fxb);
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (o = {}) => {
    const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 950 } });
    await ctx.addInitScript(([fx, o]) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.navmode', 'apps'); localStorage.setItem('mizan.books.v2', fx);
      if (o.theme) localStorage.setItem('mizan.theme', o.theme); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, [fx, o]);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
    await p.goto('file://' + HTML); await p.waitForTimeout(1600);
    if (await p.locator('.signin .su-row').count()) { await p.locator('.signin .su-row', { hasText: 'Administrator' }).click(); await p.waitForTimeout(1400); }
    return { ctx, p };
  };
  let { ctx, p } = await open();
  const shot = async (n) => { if (SHOTS) { await p.mouse.move(2, 500); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const books = () => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const home = async () => { if (await p.locator('.ab-grid').count()) { await p.locator('.ab-grid').click(); await p.waitForTimeout(600); } };
  const app = async (id) => { await home(); await p.locator(`.ah-card[data-app="${id}"]`).click(); await p.waitForTimeout(1000); };
  const tab = async (k) => { await p.locator(`.ab-tabs > .ab-tab[data-k="${k}"]`).click(); await p.waitForTimeout(900); };
  const doc = async (no) => { await p.locator('.doc-list-tbl tbody tr', { hasText: no }).first().click(); await p.waitForTimeout(1200); };
  const back = async () => { await p.locator('.du-back').click(); await p.waitForTimeout(400);
    if (await p.locator('.studio-modal', { hasText: 'Save changes' }).count()) { await p.locator('.studio-modal .btn', { hasText: 'Discard' }).click(); await p.waitForTimeout(300); } await p.waitForTimeout(300); };
  const panel = () => p.locator('.rp');
  const save = async () => { await p.locator('.rp-foot .btn.pri').click(); await p.waitForTimeout(600); };
  const close = async () => { if (await panel().count()) { await p.locator('.rp-x').click(); await p.waitForTimeout(300);
    if (await p.locator('.rp-foot .btn', { hasText: 'Discard' }).count()) { await p.locator('.rp-foot .btn', { hasText: 'Discard' }).click(); await p.waitForTimeout(300); } } };
  const toasts = () => p.locator('.toasts').innerText().catch(() => '');
  const pick = async (label, text) => { await p.locator(`.rp button.inp.sel[aria-label="${label}"]`).click(); await p.waitForTimeout(250); await p.locator('[role=option]', { hasText: text }).first().click(); await p.waitForTimeout(250); };
  const dates = () => p.locator('.document-fields input[type=date]');

  // ---------- 0. 3.26.1: signing in opens Home, the main screen with every app, not the Dashboard app ----------
  check(await p.locator('.ah-grid').count() === 1 && await p.locator('.ds-head').count() === 0, 'signing in opens Home with every app, not the Dashboard app');

  // ---------- 1. a draft invoice opens its customer ----------
  await app('sales'); await tab('invoices'); await doc('INV/2026/0287');
  const arrow = p.locator('.document-fields .smart-picker .rec-open');
  check(await arrow.count() === 1 && (await arrow.getAttribute('title')) === 'Open Bluewave Marketing Studio', 'the customer field has an arrow that opens Bluewave Marketing Studio');
  check(await p.locator('.du-party', { hasText: 'Bluewave' }).count() === 1, 'the customer named in the heading opens it too');
  check(await p.locator('.line-grid tbody tr[data-line-id] .rec-open').count() === 2, 'every product line has its own arrow');
  await arrow.click(); await p.waitForTimeout(700);
  check(await panel().count() === 1 && (await panel().getAttribute('aria-label')) === 'Customer: Bluewave Marketing Studio' && (await panel().getAttribute('data-kind')) === 'customer',
    'the record opens in a panel beside the invoice');
  check(await p.locator('.rp-kpi').count() === 4 && /Owes you[\s\S]*Overdue[\s\S]*Sales this year[\s\S]*Last invoice/i.test(await p.locator('.rp-kpis').innerText()), 'four figures at a glance: owes you, overdue, sales this year, last invoice');
  check(/Saving also updates INV\/2026\/0287/.test(await p.locator('.rp-ctx').innerText()), 'the panel says what saving does to this invoice');
  check(/Business[\s\S]*Contact & address[\s\S]*Terms & pricing[\s\S]*Delivery addresses[\s\S]*Special prices/.test(await p.locator('.rp-body').innerText()), 'details in sections: business, contact, terms, delivery addresses, special prices');
  await shot('records-01-customer');
  await p.locator('.rp-tabs button', { hasText: 'Activity' }).click(); await p.waitForTimeout(500);
  check(await p.locator('.rp-ar').count() > 3 && await p.locator('.rp-ar', { hasText: 'INV/2026/0287' }).count() === 1 && await p.locator('.rp-ar', { hasText: 'Receipt' }).count() > 0, 'Activity lists its invoices and receipts');
  await p.locator('.rp-tabs button', { hasText: 'Details' }).click(); await p.waitForTimeout(300);

  // ---------- 2. change the terms: Esc asks first, Ctrl S saves the record and the draft follows ----------
  const due0 = await dates().nth(1).inputValue();
  await p.locator('.rp').getByLabel('Payment terms (days)').fill('45'); await p.waitForTimeout(200);
  check(/Unsaved changes/.test(await p.locator('.rp-foot').innerText()), 'a change shows as unsaved');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  check(/Discard your changes/.test(await p.locator('.rp-foot').innerText()) && await panel().count() === 1, 'Esc with changes asks before closing');
  await p.locator('.rp-foot .btn', { hasText: 'Keep editing' }).click(); await p.waitForTimeout(200);
  await p.locator('.rp').getByLabel('Payment terms (days)').focus(); await p.keyboard.press('Control+s'); await p.waitForTimeout(700);
  let s = await books();
  check(await panel().count() === 0 && s.partners.find((x) => x.id === 'p11').terms === 45, 'Ctrl S saves the customer and closes the panel');
  check(await dates().nth(1).inputValue() === '2026-11-20' && due0 === '2026-10-21', 'the invoice is now due 45 days after its date (21 Oct → 20 Nov)');
  check(/payment due 20 Nov 2026/.test(await toasts()), 'and says so');
  check(s.docs.find((d) => d.number === 'INV/2026/0287').due === '2026-10-21' && /Unsaved changes/.test(await p.locator('.document-dock').innerText()), 'Ctrl S in the panel did not save the invoice itself');
  await p.locator('.du-party').click(); await p.waitForTimeout(600);
  await pick('Territory', 'Sharjah'); await save();
  check((await p.locator('.document-fields button.inp.sel').filter({ hasText: /^(Dubai|Sharjah)$/ }).first().innerText()).trim() === 'Sharjah', 'a new territory moves the place of supply');
  check((await p.locator('.party-trn').innerText()).includes('45 days'), 'the payment terms show beside the TRN');

  // ---------- 3. a product: its new price and name reach the lines, a typed price stays ----------
  const row = (i) => p.locator('.line-grid tbody tr[data-line-id]').nth(i);
  await row(1).locator('.q-price').fill('400'); await p.waitForTimeout(200);
  await row(0).hover(); await row(0).locator('.rec-open').click(); await p.waitForTimeout(700);
  check((await panel().getAttribute('data-kind')) === 'product' && /--rc:\s*#C2410C/i.test(await panel().getAttribute('style')), 'a product opens in the Inventory colour');
  check(/On hand[\s\S]*Sales price[\s\S]*Unit cost[\s\S]*Sold this year/i.test(await p.locator('.rp-kpis').innerText()), 'with on hand, sales price, unit cost and sold this year');
  const name0 = await p.locator('.rp').getByLabel('Product name').inputValue();
  await p.locator('.rp').getByLabel('Sales price · AED').fill('5555'); await p.locator('.rp').getByLabel('Product name').fill(name0 + ' (2026)'); await save();
  check(await row(0).locator('.q-price').inputValue() === '5555' && (await row(0).locator('.lg-d input').inputValue()) === name0 + ' (2026)', 'the line takes the new price and name');
  check(/the new name and price on 1 line|the new price and name on 1 line/.test(await toasts()), 'and the message says which lines changed');
  s = await books(); check(s.products.find((x) => x.name === name0 + ' (2026)').price === 5555, 'the product itself is saved');
  await row(1).locator('.lg-p input').click(); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await row(1).hover(); await row(1).locator('.rec-open').click(); await p.waitForTimeout(600);
  await p.locator('.rp').getByLabel('Sales price · AED').fill('999'); await save();
  check(await row(1).locator('.q-price').inputValue() === '400', 'a price typed on the line stays');
  await row(0).locator('.q-qty').click(); await p.waitForTimeout(250);
  check(await p.locator('.line-info .li-open').count() === 1, 'the active line offers "Open product" as well');
  await shot('records-02-invoice');
  await back();

  // ---------- 4. a posted invoice keeps its figures ----------
  await doc('INV/2026/0281'); const dueP = await dates().nth(1).inputValue();
  await p.locator('.du-party').click(); await p.waitForTimeout(600);
  check(/is posted, so it keeps its figures/.test(await p.locator('.rp-ctx').innerText()), 'from a posted invoice the panel says it keeps its figures');
  await p.locator('.rp').getByLabel('Payment terms (days)').fill('7'); await save();
  check(await dates().nth(1).inputValue() === dueP, 'and its due date does not move');
  await back();

  // ---------- 5. a new customer from the picker, and an overdue one ----------
  await p.getByRole('button', { name: /New invoice/ }).first().click(); await p.waitForTimeout(900);
  await p.getByRole('combobox', { name: 'Select customer' }).fill('Zeta Trading'); await p.waitForTimeout(300);
  await p.locator('.picker-create').click(); await p.waitForTimeout(600);
  check(/New customer/i.test(await p.locator('.rp-kind').innerText()) && (await p.locator('.rp').getByLabel('Registered name').inputValue()) === 'Zeta Trading'
    && await p.locator('.rp-foot .btn.pri', { hasText: 'Save & select' }).count() === 1, 'Create opens a new customer with the name typed, ready to save and select');
  await p.locator('.rp').getByLabel('TRN').fill('12345'); await save();
  check(/exactly 15 digits/.test(await p.locator('.rp-msg').innerText()) && await panel().count() === 1, 'a short TRN is caught');
  await p.locator('.rp').getByLabel('TRN').fill(''); await save();
  check((await p.getByRole('combobox', { name: 'Select customer' }).inputValue()) === 'Zeta Trading' && (await books()).partners.some((x) => x.name === 'Zeta Trading'), 'saved and selected in one step');
  await back();
  await doc('INV/2026/0285');
  check(/Capital Business Centre[\s\S]*overdue on 3 invoices/.test(await p.locator('.party-alert').innerText()), 'a draft for an overdue customer says how much is overdue');
  await p.locator('.party-alert .linkish').click(); await p.waitForTimeout(600);
  check((await p.locator('.rp-tabs [aria-selected=true]').innerText()).includes('Activity'), '"See their account" opens the customer on Activity');
  await shot('records-03-overdue'); await close(); await back();

  // ---------- 6. the Customers screen ----------
  await tab('customers');
  check(await p.locator('.doc-sum .ds-tile').count() === 4, 'Customers: four tiles (owe you, overdue, sold to this year, without a TRN)');
  await p.locator('.doc-sum .ds-tile', { hasText: 'Overdue' }).click(); await p.waitForTimeout(400);
  const rows = await p.locator('table.tbl tbody tr.rowlink').count();
  check(rows > 0 && rows === await p.locator('table.tbl tbody tr.rowlink .late-note').count(), 'the Overdue tile shows only customers with something overdue, each with the amount');
  await p.locator('table.tbl tbody tr.rowlink').first().locator('td').nth(2).click(); await p.waitForTimeout(600);
  check(await panel().count() === 1, 'clicking a row opens the customer'); await close();
  await p.locator('.doc-sum .ds-tile', { hasText: 'Overdue' }).click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: /New customer/ }).first().click(); await p.waitForTimeout(600);
  await p.locator('.rp').getByLabel('Registered name').fill('Omega Test LLC'); await p.locator('.rp-foot .btn.pri', { hasText: /^Create$/ }).click(); await p.waitForTimeout(500);
  check(await panel().count() === 0 && await p.locator('tr', { hasText: 'Omega Test LLC' }).count() === 1, 'New customer is created in the panel and listed');
  await shot('records-04-customers');

  // ---------- 7. products, receipts, expenses and cheques open the same panel ----------
  await app('inventory'); await tab('products');
  await p.locator('.product-art').first().click(); await p.waitForTimeout(700);
  check((await p.locator('.rp-tabs [aria-selected=true]').innerText()).includes('Price history') && await p.locator('.rp .history-block').count() === 1, 'a product card opens on its price history');
  await p.locator('.rp-side button', { hasText: 'Purchases' }).click(); await p.waitForTimeout(300);
  check(/Purchase history/.test(await p.locator('.rp .history-block h3').innerText()), 'with sales and purchases'); await close();
  await app('bank'); await tab('payments');
  await p.getByRole('button', { name: 'Record receipt' }).click(); await p.waitForTimeout(400);
  await p.locator('button.inp.sel').filter({ hasText: 'Choose a customer' }).click(); await p.waitForTimeout(250); await p.locator('[role=option]', { hasText: 'Jumeirah' }).first().click(); await p.waitForTimeout(300);
  await p.locator('.fld > .rec-open').click(); await p.waitForTimeout(600);
  check((await panel().getAttribute('aria-label')) === 'Customer: Jumeirah Hospitality Group', 'a receipt opens its customer'); await close();
  await app('purchase'); await tab('expenses');
  await p.getByRole('button', { name: 'Record expense' }).click(); await p.waitForTimeout(400);
  await p.locator('.fld > .rec-open').click(); await p.waitForTimeout(600);
  check((await panel().getAttribute('data-kind')) === 'vendor', 'an expense opens its supplier'); await close();
  await app('bank'); await tab('pdc');
  await p.getByRole('button', { name: 'Receive cheque' }).click(); await p.waitForTimeout(500);
  await p.getByRole('combobox', { name: 'Cheque customer' }).click(); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('.studio-modal .smart-picker .rec-open').click(); await p.waitForTimeout(600);
  check(await p.evaluate(() => !!document.elementFromPoint(innerWidth - 200, innerHeight / 2).closest('.rp')), 'a cheque opens its customer above the cheque dialog');
  await close(); await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // ---------- 8. a salesperson: customers yes, products to look at only, no costs ----------
  await p.locator('.userchip').click(); await p.waitForTimeout(200); await p.locator('.pop-item', { hasText: 'Switch user' }).click(); await p.waitForTimeout(300);
  await p.locator('.su-row', { hasText: 'Sam Seller' }).click(); await p.waitForTimeout(1200);
  await app('sales'); await tab('invoices'); await doc('INV/2026/0287');
  await p.locator('.document-fields .smart-picker .rec-open').click(); await p.waitForTimeout(600);
  check(await p.locator('.rp-foot .btn.pri', { hasText: 'Save changes' }).count() === 1 && !(await p.locator('.rp-fs').evaluate((e) => e.disabled)) && await p.locator('.rp').getByLabel('Registered name').isEditable(), 'a salesperson can change the customer'); await close();
  await p.locator('.line-grid tbody tr[data-line-id]').first().hover(); await p.locator('.line-grid tbody tr[data-line-id]').first().locator('.rec-open').click(); await p.waitForTimeout(600);
  const vo = [await p.locator('.rp').getAttribute('data-kind'), await p.locator('.rp-bar').innerText(), await p.locator('.rp-foot .btn.pri').count(),
    await p.locator('.rp-fs').evaluate((e) => e.disabled) && await p.locator('.rp').getByLabel('Product name').isDisabled()];
  check(vo[0] === 'product' && /View only/i.test(vo[1]) && vo[2] === 0 && vo[3], 'but only look at a product' + (vo[0] === 'product' && /View only/i.test(vo[1]) && vo[2] === 0 && vo[3] ? '' : ' ' + JSON.stringify(vo)));
  check(!/Unit cost/i.test(await p.locator('.rp-kpis').innerText()) && await p.locator('.rp').getByLabel('Cost price · AED').count() === 0, 'and never sees its cost');
  await shot('records-05-view-only'); await close();
  await ctx.close();

  // ---------- 9. dark mode and a phone ----------
  ({ ctx, p } = await open({ theme: 'dark', vp: { width: 390, height: 844 } }));
  await p.keyboard.press('g'); await p.keyboard.press('i'); await p.waitForTimeout(1100);
  await p.locator('.doc-list-tbl tbody tr, .doc-card', { hasText: 'INV/2026/0287' }).first().click(); await p.waitForTimeout(1200);
  await p.locator('.document-fields .smart-picker .rec-open').click(); await p.waitForTimeout(700);
  const box = await panel().boundingBox();
  check(box && Math.abs(box.width - 390) < 2 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: the panel fills the screen, nothing scrolls sideways');
  check(await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.rp')).backgroundColor.match(/\d+/g).map(Number); return c[0] + c[1] + c[2] < 150; }), 'dark mode: the panel is dark');
  await shot('records-06-phone-dark');
  await ctx.close();

  await b.close();
  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
