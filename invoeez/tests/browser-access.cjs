/* 3.23 access management: users for each role (salesperson linked to a salesperson, procurement manager, purchaser, accountant, viewer),
   a live preview of what each can do, Who can do what, roles (eight built in, adjust one, add a custom role), access rules from templates
   and from scratch (people, roles, hidden apps, blocked actions, read-only fields, read-only user, no exports, switch on/off), and the
   effect when each person signs in: apps and Home for their job, own documents only, no cost, discount limit, no delete or reset,
   no posting for a purchaser, hidden apps, locked prices, read-only, no exports; administrators never restricted.
   Run: npm run build, then node tests/browser-access.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const fxb = JSON.parse(fx), rashid = fxb.salespeople.find((x) => /Rashid/.test(x.name));
  const nRashid = fxb.docs.filter((d) => d.type === 'invoice' && d.salesman === rashid.id).length;
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((fx) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.navmode', 'apps'); localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, fx);
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
  await p.goto('file://' + HTML); await p.waitForTimeout(1600);
  const shot = async (n) => { if (SHOTS) { await p.mouse.move(2, 500); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const books = () => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const pick = async (sel, text) => { await sel.click(); await p.waitForTimeout(250); await p.locator('[role=option]', { hasText: text }).first().click(); await p.waitForTimeout(300); };
  const fld = (label) => p.locator('.fld', { hasText: label }).first().locator('input');
  const home = async () => { if (await p.locator('.ab-grid').count()) { await p.locator('.ab-grid').click(); await p.waitForTimeout(700); } };
  const app = async (id) => { await home(); await p.locator(`.ah-card[data-app="${id}"]`).click(); await p.waitForTimeout(1000); };
  const tab = async (k) => { const t = p.locator(`.ab-tabs > .ab-tab[data-k="${k}"]`); if (await t.count()) { await t.click(); await p.waitForTimeout(900); return true; }
    for (const dd of await p.locator('.ab-tabs > .ab-dd > .ab-tab').all()) { await dd.click(); await p.waitForTimeout(200); const it = p.locator(`.ab-menu button[data-k="${k}"]`);
      if (await it.count()) { await it.click(); await p.waitForTimeout(900); return true; } await p.keyboard.press('Escape'); await p.mouse.click(5, 990); await p.waitForTimeout(150); } return false; };
  const apps = () => p.locator('.ah-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-app')));
  const as = async (name) => { await p.locator('.userchip').click(); await p.waitForTimeout(200); await p.locator('.pop-item', { hasText: 'Switch user' }).click(); await p.waitForTimeout(300);
    await p.locator('.su-row', { hasText: name }).click(); await p.waitForTimeout(1200); await home(); };
  const who = async () => { await p.locator('.userchip').click(); await p.waitForTimeout(150); const n = (await p.locator('.pop-head b').innerText()).trim(); await p.keyboard.press('Escape'); await p.mouse.click(5, 990); await p.waitForTimeout(150); return n; };
  const back = async () => { await p.locator('.du-back').click(); await p.waitForTimeout(400);
    if (await p.locator('.studio-modal', { hasText: 'Save changes' }).count()) { await p.locator('.studio-modal .btn', { hasText: 'Discard' }).click(); await p.waitForTimeout(300); } await p.waitForTimeout(300); };
  const moreItems = async () => { await p.locator('.du-more-btn').click(); await p.waitForTimeout(250);
    const t = await p.locator('.du-menu [role=menuitem]').allInnerTexts(); await p.keyboard.press('Escape'); await p.waitForTimeout(150); return t.map((x) => x.split('\n')[0].trim()); };

  // ---------- 1. people, one for each job ----------
  await app('users');
  check(await p.locator('.u-kpis > div').count() === 4, 'Users & access: people, roles in use, rules and approvers at a glance');
  const newUser = async (name, role, extra) => { await p.locator('.page-head .btn.pri', { hasText: 'New user' }).click(); await p.waitForTimeout(250);
    await fld('Full name').fill(name); await p.locator(`.pick[data-role="${role}"]`).click(); await p.waitForTimeout(150); if (extra) await extra();
    await p.locator('.card .btn.pri', { hasText: 'Create user' }).click(); await p.waitForTimeout(450); };
  await newUser('Sara Seller', 'sales', async () => {
    await pick(p.locator('button.inp.sel[aria-label="Sells as"]'), 'Rashid');
    const pv = await p.locator('.u-preview').innerText();
    check(/Own documents only/.test(pv) && /No cost prices or margins/.test(pv) && /Discounts up to 10%/.test(pv), 'the form previews what a salesperson can do');
    await shot('access-01-user-form'); });
  await newUser('Paula Proc', 'procurement', async () => { await p.locator('.appr-toggle').click(); });
  await newUser('Pete Buyer', 'clerk');
  await newUser('Aisha Accts', 'accountant');
  await newUser('Vera View', 'viewer');
  let s = await books();
  const U = Object.fromEntries(s.users.map((u) => [u.name.split(' ')[0], u]));
  check(U.Sara.role === 'sales' && U.Sara.salesperson === rashid.id && U.Paula.approver === true && U.Pete.role === 'clerk', 'saved with their roles, Sara linked to ' + rashid.name);
  check(await p.locator('.acc-ov tbody tr').count() === 6, 'Who can do what lists everyone');
  const saraRow = await p.locator(`.acc-ov tr[data-user="${U.Sara.id}"]`).innerText();
  check(/Edit/.test(saraRow) && /Own documents only/.test(saraRow), 'Sara: works in Sales, own documents only');
  await shot('access-02-people');

  // ---------- 2. roles ----------
  await tab('roles');
  check(await p.locator('.rl-item').count() === 8, 'eight roles built in (' + (await p.locator('.rl-item b').allInnerTexts()).join(', ') + ')');
  await p.locator('.rl-item[data-role="sales"]').click(); await p.waitForTimeout(300);
  check((await p.locator('.rm-row[data-area="sales"] .lv-seg button.on').innerText()) === 'Full' && (await p.locator('.rm-row[data-area="finance_reports"] .lv-seg button.on').innerText()) === 'None', 'Salesperson: sales documents in full, no financial statements');
  await p.locator('.opt-num input[aria-label="Discount limit %"]').fill('12'); await p.waitForTimeout(150);
  await p.locator('.rl-acts .btn.pri', { hasText: 'Save role' }).click(); await p.waitForTimeout(400);
  s = await books(); check(s.roles && s.roles.sales && s.roles.sales.opts.maxDisc === 12, 'a role can be adjusted (Salesperson discount limit 12%)');
  check(await p.locator('.rl-item[data-role="sales"] em', { hasText: 'Adjusted' }).count() === 1, 'and is marked Adjusted, with a way back to its standard rights');
  await p.locator('.page-head .btn.pri', { hasText: 'New role' }).click(); await p.waitForTimeout(300);
  await p.locator('.rl-ht input[aria-label="Role name"]').fill('Cashier');
  for (const r of await p.locator('.rm-row').all()) { const on = r.locator('.lv-seg button.on'); if ((await on.count()) && (await on.innerText()) !== 'None') { await r.locator('.lv-seg button', { hasText: 'None' }).click(); await p.waitForTimeout(40); } }
  await p.locator('.rm-row[data-area="payments"] .lv-seg button', { hasText: 'Create & edit' }).click();
  await p.locator('.rm-row[data-area="dashboard"] .lv-seg button', { hasText: 'View' }).click();
  await p.locator('.rl-acts .btn.pri', { hasText: 'Save role' }).click(); await p.waitForTimeout(400);
  s = await books(); const cashier = Object.entries(s.roles).find(([, r]) => r.label === 'Cashier');
  check(cashier && cashier[1].rights.payments.includes('create') && !cashier[1].rights.payments.includes('delete') && cashier[1].rights.dashboard.includes('view') && !(cashier[1].rights.sales || []).length, 'a new role with exactly its rights (Cashier)');
  await shot('access-03-roles');

  // ---------- 3. access rules ----------
  await tab('access_rules');
  check(await p.locator('.ar-tpl button').count() === 6, 'six ready-made rules to start from');
  // from a template: no deleting or resetting documents, for Aisha
  await p.locator('.ar-tpl button[data-tpl="no-delete"]').click(); await p.waitForTimeout(300);
  await p.locator(`.ar-person[data-user="${U.Aisha.id}"]`).click();
  check(await p.locator(`.ar-person[data-user="${s.users.find((u) => u.role === 'admin').id}"]`).isDisabled(), 'administrators can’t be picked — they are never restricted');
  check(/Aisha Accts/.test(await p.locator('.ar-side').innerText()), 'the side shows who it affects');
  await p.locator('.page-head .btn.pri', { hasText: 'Save rule' }).click(); await p.waitForTimeout(400);
  // from scratch: Paula — no Bank & cash app, locked prices
  await p.locator('.page-head .btn.pri', { hasText: 'New rule' }).click(); await p.waitForTimeout(300);
  await p.locator('.ar-body .fld', { hasText: 'Rule name' }).locator('input').fill('Procurement — no banking, fixed prices');
  await p.locator(`.ar-person[data-user="${U.Paula.id}"]`).click();
  await p.locator('.ar-tabs button[data-tab="menus"]').click(); await p.waitForTimeout(200);
  await p.locator('.ar-app', { hasText: 'Bank & cash' }).locator('.ar-app-h input').check(); await p.waitForTimeout(150);
  await p.locator('.ar-tabs button[data-tab="fields"]').click(); await p.waitForTimeout(200);
  await p.locator('.ar-field[data-field="price"] .seg button', { hasText: 'Read-only' }).click();
  await shot('access-04-rule-fields');
  await p.locator('.ar-tabs button[data-tab="actions"]').click(); await p.waitForTimeout(200);
  await shot('access-05-rule-actions');
  await p.locator('.page-head .btn.pri', { hasText: 'Save rule' }).click(); await p.waitForTimeout(400);
  // Vera: read-only and no exports
  await p.locator('.page-head .btn.pri', { hasText: 'New rule' }).click(); await p.waitForTimeout(300);
  await p.locator('.ar-body .fld', { hasText: 'Rule name' }).locator('input').fill('Auditor — no exports');
  await p.locator(`.ar-person[data-user="${U.Vera.id}"]`).click();
  await p.locator('.ar-tabs button[data-tab="general"]').click(); await p.waitForTimeout(200);
  await p.locator('.ar-body .opt-sw', { hasText: 'No exports' }).click(); await p.locator('.ar-body .opt-sw', { hasText: 'Read-only' }).first().click();
  await p.locator('.page-head .btn.pri', { hasText: 'Save rule' }).click(); await p.waitForTimeout(400);
  s = await books();
  const rNo = s.accessRules.find((r) => /deleting/.test(r.name)), rPaula = s.accessRules.find((r) => /Procurement/.test(r.name)), rVera = s.accessRules.find((r) => /Auditor/.test(r.name));
  check(rNo && rNo.users.includes(U.Aisha.id) && rNo.deny.sales.includes('delete') && rNo.buttons.includes('reset'), 'template rule saved for Aisha: no delete, no reset');
  check(rPaula && rPaula.hide.includes('payments') && rPaula.hide.includes('banking') && rPaula.fields.price === 'readonly', 'rule from scratch: hide Bank & cash, prices read-only');
  check(rVera && rVera.readOnly && rVera.noExport, 'read-only with no exports');
  check(await p.locator('.ar-card').count() === 3 && /Blocks 4 actions/.test(await p.locator('.ar-card', { hasText: 'deleting' }).innerText()), 'the list summarises each rule');
  await p.locator('.ar-card', { hasText: 'Auditor' }).locator('.ar-sw').click(); await p.waitForTimeout(300);
  s = await books(); check(s.accessRules.find((r) => r.id === rVera.id).active === false, 'a rule can be switched off…');
  await p.locator('.ar-card', { hasText: 'Auditor' }).locator('.ar-sw').click(); await p.waitForTimeout(300);
  s = await books(); check(s.accessRules.find((r) => r.id === rVera.id).active !== false, '…and on again');
  await shot('access-06-rules');

  // ---------- 4. Sara, salesperson ----------
  await as('Sara Seller');
  check(await who() === 'Sara Seller', 'signed in as Sara');
  const sa = await apps();
  check(sa[0] === 'sales' && !sa.includes('accounting') && !sa.includes('bank') && !sa.includes('dash') && !sa.includes('users'), 'her Home: Sales first, no accounting, banking, dashboard or users (' + sa.join(', ') + ')');
  check(/Salesperson · your documents/.test(await p.locator('.aw-who').innerText()) && /sold this month/.test(await p.locator('.ah-work').innerText()), 'her work: what she sold, her quotations, what to chase');
  check(await p.evaluate(() => document.querySelector('.mz').hasAttribute('data-hidecost')), 'cost prices hidden everywhere');
  await shot('access-07-sara-home');
  const other = fxb.docs.find((d) => d.type === 'invoice' && d.salesman && d.salesman !== rashid.id), mine = fxb.docs.find((d) => d.type === 'invoice' && d.salesman === rashid.id);
  const found = async (q) => { await p.locator('.ah-search input').fill(q); await p.waitForTimeout(350); const t = await p.locator('.ah-res').allInnerTexts(); await p.locator('.ah-search input').fill(''); return t.join(' | '); };
  check((await found(mine.number)).includes(mine.number) && !(await found(other.number)).includes(other.number), 'search finds her invoices, not a colleague’s (' + other.number + ')');
  check(!/Trial balance/.test(await found('Trial balance')) && !/Back up the books/.test(await found('Back up')), 'nor screens or actions she can’t use');
  await app('sales');
  check(/^My sales this month/.test((await p.locator('.ao-kpi small').first().innerText()).trim()), 'the Sales overview reads “My …” for her');
  await tab('invoices');
  check(new RegExp('^' + nRashid + ' documents').test((await p.locator('.page-head p').innerText()).trim()), 'Invoices lists only hers — ' + nRashid + ' as ' + rashid.name);
  await p.locator('.page-head .btn.pri', { hasText: 'New invoice' }).click(); await p.waitForTimeout(700);
  check(await p.locator('.btn', { hasText: 'Show cost' }).count() === 0, 'no Show cost on her invoice');
  await p.keyboard.type('Fujairah Port'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  await p.locator('[data-line-id] input[role="combobox"]').first().click(); await p.keyboard.type('HP EliteBook'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('[data-line-id] .q-qty').first().fill('1');
  await p.locator('[data-line-id] .lg-di input').first().fill('15'); await p.waitForTimeout(200);
  await p.locator('.du-acts .btn', { hasText: 'Post to ledger' }).click(); await p.waitForTimeout(600);
  const t1 = await p.locator('.toasts').innerText().catch(() => '');
  check(/above your limit of 12%/.test(t1), 'a 15% discount is stopped at her 12% limit');
  await p.locator('[data-line-id] .lg-di input').first().fill('10'); await p.waitForTimeout(200);
  await p.locator('.du-acts .btn', { hasText: 'Post to ledger' }).click(); await p.waitForTimeout(900);
  s = await books(); const saraInv = s.docs.find((d) => d.number === (s.docs.filter((x) => x.type === 'invoice').map((x) => x.number).sort().pop()));
  check(saraInv && saraInv.state === 'posted' && saraInv.createdBy === U.Sara.id, '10% posts, and the invoice is hers (' + (saraInv && saraInv.number) + ')');
  await back();
  check(new RegExp('^' + (nRashid + 1) + ' documents').test((await p.locator('.page-head p').innerText()).trim()), 'and joins her list');
  await shot('access-08-sara-invoices');

  // ---------- 5. Aisha, accountant with a no-delete rule ----------
  await as('Aisha Accts');
  check(!(await apps()).includes('users') && (await apps()).includes('accounting'), 'Aisha: the books, no Users & access');
  await app('sales'); await tab('invoices');
  await p.locator('.seg button', { hasText: 'Draft' }).first().click(); await p.waitForTimeout(400);
  await p.locator('.doc-list-tbl tbody tr').first().click(); await p.waitForTimeout(800);
  const draftMore = await moreItems();
  check(!draftMore.includes('Delete') && draftMore.includes('Duplicate'), 'a draft has no Delete for her (' + draftMore.join(', ') + ')');
  await back();
  await p.locator('.seg button', { hasText: 'Posted' }).first().click(); await p.waitForTimeout(400);
  await p.locator('.doc-list-tbl tbody tr').first().click(); await p.waitForTimeout(800);
  const postedMore = await moreItems();
  check(!postedMore.includes('Reset to draft') && postedMore.includes('Credit note'), 'a posted invoice has no Reset to draft (' + postedMore.join(', ') + ')');
  await back();

  // ---------- 6. Paula, procurement manager: no banking, locked prices ----------
  await as('Paula Proc');
  const pa = await apps();
  check(pa[0] === 'purchase' && !pa.includes('bank') && !pa.includes('sales'), 'Paula: Purchase first, Bank & cash hidden by the rule (' + pa.join(', ') + ')');
  await app('purchase'); await tab('purchase_orders');
  await p.locator('.page-head .btn.pri', { hasText: 'New purchase order' }).click(); await p.waitForTimeout(700);
  await p.keyboard.type('Shenzhen'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  await p.locator('[data-line-id] input[role="combobox"]').first().click(); await p.keyboard.type('LT-EB14'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  check(await p.locator('[data-line-id] .q-price').first().isDisabled(), 'unit prices are read-only for her');
  await back();

  // ---------- 7. Pete, purchaser: raises but cannot post ----------
  await as('Pete Buyer');
  await app('purchase'); await tab('bills');
  await p.locator('.page-head .btn.pri', { hasText: 'New bill' }).click(); await p.waitForTimeout(700);
  check(await p.locator('.du-acts .btn', { hasText: 'Post to ledger' }).count() === 0 && await p.locator('.du-acts .btn', { hasText: 'Save draft' }).count() === 1, 'Pete can enter a bill but not post it');
  await back();

  // ---------- 8. Vera, viewer: read-only, no exports ----------
  await as('Vera View');
  const va = await apps();
  check(va.includes('dash') && va.includes('reports') && !va.includes('sales'), 'Vera: dashboard and reports (' + va.join(', ') + ')');
  await app('reports'); await tab('r_pnl'); await p.waitForTimeout(500);
  check(await p.locator('.rframe').count() === 1 && !(await p.locator('.exp-group').isVisible().catch(() => false)), 'reports open, but no PDF, Excel or Print for her');

  // ---------- 9. administrators are never restricted ----------
  await as('Administrator');
  const aa = await apps();
  check(aa.length === 12 && !(await p.evaluate(() => document.querySelector('.mz').hasAttribute('data-hidecost'))), 'the administrator still sees all twelve apps and every cost');
  await app('users');
  check(/Own documents only/.test(await p.locator('tr', { hasText: 'Sara Seller' }).first().innerText()), 'the people list shows each person’s restrictions');
  await ctx.close();

  // ---------- 10. the sidebar follows the same rights ----------
  const c2 = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const st = JSON.parse(fx); st.users = [...(st.users || []), { id: 'ux1', name: 'Sid Sales', role: 'sales', active: true }];
  await c2.addInitScript((fx) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.sidebar', 'pinned'); localStorage.setItem('mizan.navgroups', '{}'); localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('mizan.me', 'ux1'); sessionStorage.setItem('mizan.me', 'ux1'); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, JSON.stringify(st));
  const q = await c2.newPage(); q.on('pageerror', (e) => errs.push('PAGE ' + e.message)); await q.goto('file://' + HTML); await q.waitForTimeout(1600);
  const keys = await q.locator('.sbar [data-k]').evaluateAll((els) => els.map((e) => e.getAttribute('data-k')));
  check(keys.includes('invoices') && !keys.includes('r_pnl') && !keys.includes('dash') && !keys.includes('users') && !keys.includes('r_prod'), 'sidebar mode: a salesperson’s menu holds only their screens');
  check(await q.locator('.page-head h1, .view h1').first().count() === 1 && !(await q.locator('.view').innerText()).includes('This area is restricted'), 'and opens on a screen they may use');
  await c2.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
