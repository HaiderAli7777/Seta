/* 3.17: line discounts as a percentage or an amount, and delivery addresses (customer branches).
   % / AED switch per line (the money off is kept when switching), limits, print column; branches on the customer,
   default branch, Deliver to on the quotation (place of supply follows), adding a branch from the document, saved copy,
   print "Deliver to", delivery note (quantities and signatures, no prices) on screen and as PDF, carried to the invoice,
   shown in the list, phone layout. Run: npm run build, then node tests/browser-delivery.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
const num = (t) => +String(t).replace(/−/g, '-').replace(/[^0-9.-]/g, '');
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
  const nav = async (p, k) => { await p.locator(`.sbar [data-k="${k}"]`).first().click(); await p.waitForTimeout(800); };
  const books = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const toasts = (p) => p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText).join(' / '));
  const pickSel = async (p, label, text) => { await p.locator(`button.inp.sel[aria-label="${label}"]`).first().click(); await p.waitForTimeout(250);
    await p.locator('[role=option]', { hasText: text }).first().click(); await p.waitForTimeout(400); };
  const openQuote = async (p, no) => { await nav(p, 'quotes'); await p.locator('.doc-list-tbl tbody tr.click', { hasText: no }).first().click(); await p.waitForTimeout(900); };
  const amtOf = async (p, i) => num((await p.locator('.line-grid tbody tr[data-line-id]').nth(i).locator('.lg-am b').innerText()));

  let { ctx, p } = await open();
  // ---------- 1. line discount: % or AED ----------
  await openQuote(p, 'QUO/2026/0018');
  const row = p.locator('.line-grid tbody tr[data-line-id]').first();
  check(await row.locator('.disc-in .seg button').count() === 2 && (await row.locator('.disc-in .seg button.on').innerText()).trim() === '%', 'each line has a % / AED switch, percentage by default');
  await row.locator('.disc-in input').fill('10'); await p.waitForTimeout(300);
  check(await amtOf(p, 0) === 6615, '10% off 3 × 2,450 = 6,615.00');
  await row.locator('.disc-in .seg button', { hasText: 'AED' }).click(); await p.waitForTimeout(450);
  check((await row.locator('.disc-in input').inputValue()) === '735' && await amtOf(p, 0) === 6615 && (await row.locator('.disc-in .seg button.on').innerText()).trim() === 'AED', 'switching to AED keeps the same money off (735)');
  await row.locator('.disc-in input').fill('500'); await p.waitForTimeout(300);
  check(await amtOf(p, 0) === 6850, 'AED 500 off the whole line = 6,850.00');
  const tot = await p.evaluate(() => { const r = {}; document.querySelectorAll('.tot-card .sumrow').forEach((x) => { const k = x.querySelector('.k'); if (k) r[k.childNodes[0].textContent.trim()] = +x.querySelector('.v').innerText.replace(/−/g, '-').replace(/[^0-9.-]/g, ''); }); return r; });
  check(tot['Line discounts'] === -500 || tot['Line discounts'] === 500, 'the totals show the line discount (' + tot['Line discounts'] + ')');
  await shot(p, 'delivery-01-line-discount', '.line-grid');
  await row.locator('.disc-in .seg button', { hasText: '%' }).click(); await p.waitForTimeout(450);
  check((await row.locator('.disc-in input').inputValue()) === '6.8', 'and back to % (500 of 7,350 = 6.8%)');
  await row.locator('.disc-in .seg button', { hasText: 'AED' }).click(); await row.locator('.disc-in input').fill('9000'); await p.waitForTimeout(200);
  await p.keyboard.press('Control+s'); await p.waitForTimeout(300);
  check(/discount on line 1 \(AED 9,000\.00\) is more than the line is worth/.test(await toasts(p)), 'an amount above the line value cannot be saved');
  await row.locator('.disc-in input').fill('500'); await p.keyboard.press('Control+s'); await p.waitForTimeout(500);
  let q = (await books(p)).docs.find((d) => d.number === 'QUO/2026/0018');
  check(q.lines[0].discMode === 'amount' && q.lines[0].disc === 500 && !('discMode' in q.lines[1]), 'saved: the first line as AED 500, the others stay percentages');
  // the next line inherits the kind of discount
  await p.locator('.lg-add button').click(); await p.waitForTimeout(300);
  check((await p.locator('.line-grid tbody tr[data-line-id]').last().locator('.disc-in .seg button.on').innerText()).trim() === '%', 'a new line starts as the last line was');
  await p.locator('.line-grid tbody tr[data-line-id]').last().locator('.lg-x button, button[aria-label*="Remove"], button[title*="Remove"]').first().click().catch(() => {}); await p.waitForTimeout(300);

  // ---------- 2. delivery addresses on the customer ----------
  await nav(p, 'customers');
  await p.locator('input[placeholder*="Search name"]').first().fill('Fujairah Port'); await p.waitForTimeout(300);
  await p.locator('tr', { hasText: 'Fujairah Port Services' }).first().locator('button[title="Edit"]').click(); await p.waitForTimeout(600);
  check(/Deliveries go to the main address/.test(await p.locator('.br-editor').innerText()), 'the customer form has delivery addresses (none yet)');
  const addBr = async (name, a1, emirate, contact) => {
    await p.locator('.br-editor .btn', { hasText: 'Add a delivery address' }).click(); await p.waitForTimeout(250);
    const c = p.locator('.br-card').last();
    await c.locator('.br-name').fill(name); await c.locator('input[placeholder="Building, street"]').fill(a1);
    await c.locator('button.inp.sel').click(); await p.waitForTimeout(200); await p.locator('[role=option]', { hasText: emirate }).first().click(); await p.waitForTimeout(200);
    if (contact) await c.locator('input[placeholder="Name of the person receiving"]').fill(contact);
  };
  await addBr('Khor Fakkan yard', 'Port Road, Gate 2', 'Sharjah', 'Rashid');
  await addBr('Dibba depot', 'Industrial Area 3', 'Fujairah', '');
  await p.locator('.br-card').nth(0).locator('.br-def input').check();
  await shot(p, 'delivery-02-customer', '.br-editor');
  await p.locator('.card .btn.pri', { hasText: 'Save changes' }).click(); await p.waitForTimeout(500);
  let cu = (await books(p)).partners.find((x) => x.name.startsWith('Fujairah Port'));
  check(cu.branches.length === 2 && cu.defaultBranch === cu.branches[0].id && cu.branches[0].emirate === 'Sharjah', 'two delivery addresses saved, the first one is the default');
  check(/2 delivery addresses/.test(await p.locator('tr', { hasText: 'Fujairah Port Services' }).first().innerText()), 'the customer list shows them');

  // ---------- 3. Deliver to on the quotation ----------
  await openQuote(p, 'QUO/2026/0018');
  check(/Main address/.test(await p.locator('button.inp.sel[aria-label="Deliver to"]').innerText()), 'an existing quotation keeps the main address');
  await pickSel(p, 'Deliver to', 'Khor Fakkan yard');
  const pos = await p.locator('.document-fields button.inp.sel').filter({ hasText: /^(Dubai|Abu Dhabi|Sharjah|Ajman|Umm Al Quwain|Ras Al Khaimah|Fujairah)$/ }).first().innerText();
  check(pos.trim() === 'Sharjah' && /Place of supply set to Sharjah/.test(await toasts(p)), 'choosing the branch sets the place of supply to Sharjah, and says so');
  check(/Khor Fakkan yard[\s\S]*Port Road, Gate 2[\s\S]*Receiving: Rashid/.test(await p.locator('.dl-prev').innerText()), 'the address is shown beside it');
  await pickSel(p, 'Deliver to', 'Add a delivery address');
  await p.locator('.studio-modal input').first().fill('Fujairah port office');
  await p.locator('.studio-modal input[placeholder="Building, street"]').fill('Port of Fujairah, Admin Block');
  await p.locator('.studio-modal .btn.pri', { hasText: 'Save & deliver here' }).click(); await p.waitForTimeout(500);
  cu = (await books(p)).partners.find((x) => x.name.startsWith('Fujairah Port'));
  check(cu.branches.length === 3 && /Fujairah port office/.test(await p.locator('button.inp.sel[aria-label="Deliver to"]').innerText()), 'a new delivery address can be added from the quotation, saved on the customer and chosen');
  await pickSel(p, 'Deliver to', 'Khor Fakkan yard');
  await shot(p, 'delivery-03-quote', '.doc-unit, .document-fields');
  await p.keyboard.press('Control+s'); await p.waitForTimeout(500);
  q = (await books(p)).docs.find((d) => d.number === 'QUO/2026/0018');
  check(q.deliverTo === cu.branches[0].id && q.delivery.name === 'Khor Fakkan yard' && q.delivery.emirate === 'Sharjah' && q.emirate === 'Sharjah', 'saved with a copy of the address and the place of supply');
  await p.reload(); await p.waitForTimeout(1300); await openQuote(p, 'QUO/2026/0018');
  check(/Khor Fakkan yard/.test(await p.locator('button.inp.sel[aria-label="Deliver to"]').innerText()), 'still chosen after reloading');

  // ---------- 4. print: Deliver to, and the delivery note ----------
  await p.locator('.btn', { hasText: 'Print / send' }).click(); await p.waitForTimeout(800);
  const sh = await p.locator('.sheet').first().innerText();
  check(/Deliver to[\s\S]*Khor Fakkan yard[\s\S]*Port Road, Gate 2/i.test(sh) && /Disc\./i.test(sh) && /AED 500\.00/.test(sh), 'the printed quotation shows Deliver to and the line discount column');
  await shot(p, 'delivery-04-print', '.sheet');
  const [d1] = await Promise.all([p.waitForEvent('download'), p.locator('.sendbar .btn', { hasText: 'Download PDF' }).click()]);
  check(/^QUO-2026-0018\.pdf$/.test(d1.suggestedFilename()) && fs.statSync(await d1.path()).size > 20000, 'quotation PDF (' + d1.suggestedFilename() + ')');
  await p.locator('.dn-seg button', { hasText: 'Delivery note' }).click(); await p.waitForTimeout(500);
  const dn = await p.locator('.sheet').first().evaluate((s) => ({ t: s.innerText, heads: [...s.querySelectorAll('.sheet-lines th')].map((x) => x.innerText.trim().toUpperCase()), boxes: s.querySelectorAll('.dn-sign>div').length }));
  check(/DELIVERY NOTE/i.test(dn.t) && dn.heads.includes('RECEIVED') && !dn.heads.includes('UNIT PRICE') && !/90,295|Taxable amount/i.test(dn.t) && dn.boxes === 2 && /Khor Fakkan yard/.test(dn.t),
    'the delivery note lists quantities with a Received column and two signature boxes, and no prices');
  await shot(p, 'delivery-05-note', '.sheet');
  const [d2] = await Promise.all([p.waitForEvent('download'), p.locator('.sendbar .btn', { hasText: 'Download PDF' }).click()]);
  check(/^Delivery-note-QUO-2026-0018\.pdf$/.test(d2.suggestedFilename()) && fs.statSync(await d2.path()).size > 15000, 'delivery note PDF (' + d2.suggestedFilename() + ')');
  await p.locator('.sendbar .btn', { hasText: 'Close' }).click(); await p.waitForTimeout(400);

  // ---------- 5. carried to the invoice, and shown in the list ----------
  await p.locator('.btn.pri', { hasText: 'Convert to invoice' }).click(); await p.waitForTimeout(1200);
  const inv = (await books(p)).docs.find((d) => d.origin && d.origin.number === 'QUO/2026/0018');
  check(inv && inv.deliverTo === q.deliverTo && inv.delivery.name === 'Khor Fakkan yard' && inv.emirate === 'Sharjah' && inv.lines[0].discMode === 'amount', 'the invoice keeps the delivery address, place of supply and line discounts');
  await nav(p, 'invoices');
  check(/Deliver to Khor Fakkan yard/.test(await p.locator('.doc-list-tbl tbody tr', { hasText: inv.number }).first().innerText()), 'the invoice list shows where it is delivered');
  await p.locator('input[placeholder*="Search"]').first().fill('Khor Fakkan'); await p.waitForTimeout(400);
  check((await p.locator('.doc-list-tbl tbody tr.click').count()) === 1, 'and the list can be searched by branch');
  // a new invoice picks the default branch
  await p.locator('.btn.pri', { hasText: 'New invoice' }).first().click(); await p.waitForTimeout(600);
  await p.keyboard.type('Fujairah Port'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  check(/Khor Fakkan yard/.test(await p.locator('button.inp.sel[aria-label="Deliver to"]').innerText()), 'a new invoice for this customer starts with the default delivery address');
  await ctx.close();

  // ---------- 6. phone ----------
  ({ ctx, p } = await open({ vp: { width: 390, height: 844 } }));
  await p.locator('.burger').click(); await p.waitForTimeout(400); await p.locator('.sbar [data-k="customers"]').first().click(); await p.waitForTimeout(700);
  await p.locator('button[title="Edit"]').first().click(); await p.waitForTimeout(500);
  await p.locator('.br-editor .btn', { hasText: 'Add a delivery address' }).click(); await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector('.page').scrollWidth <= document.querySelector('.page').clientWidth + 1), 'phone: the delivery address form fits');
  await ctx.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
