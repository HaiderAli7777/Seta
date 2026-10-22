/* 3.23 cost centres and budgets: set up cost centres (quick start and form, unique codes), tag an invoice, an expense and a journal line,
   Profit by cost centre adds up to the company, a used cost centre can't be deleted, budgets from the run rate (spread a year evenly,
   save, Budget vs actual with figures and Excel), a budget for one cost centre, and the classic menu has every new screen.
   Run: npm run build, then node tests/browser-costing.cjs  (needs tests/fixture.json) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HTML = process.env.HTML || path.resolve(__dirname, '../invoeez.html'), SHOTS = process.env.SHOTS;
const fx = fs.readFileSync(process.env.FX || path.join(__dirname, 'fixture.json'), 'utf8');
const errs = [], ok = []; const check = (c, m) => (c ? ok : errs).push(m);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (extra = {}, vp = { width: 1440, height: 1000 }) => {
    const ctx = await b.newContext({ viewport: vp, acceptDownloads: true });
    await ctx.addInitScript(([fx, extra]) => { try { if (!localStorage.getItem('fx-loaded')) { localStorage.clear(); localStorage.setItem('mizan.sidebar', 'pinned'); localStorage.setItem('mizan.navgroups', '{}');
      Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v)); localStorage.setItem('mizan.books.v2', fx); localStorage.setItem('fx-loaded', '1'); } } catch (e) {} }, [fx, extra]);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('dialog', (d) => d.accept());
    await p.goto('file://' + HTML); await p.waitForTimeout(1600); return { ctx, p };
  };
  const shot = async (p, n) => { if (SHOTS) { await p.mouse.move(2, 500); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const books = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mizan.books.v2')));
  const pick = async (p, sel, text) => { await sel.click(); await p.waitForTimeout(250); await p.locator('[role=option]', { hasText: text }).first().click(); await p.waitForTimeout(350); };
  const tab = async (p, k) => { const t = p.locator(`.ab-tabs > .ab-tab[data-k="${k}"]`); if (await t.count()) { await t.click(); await p.waitForTimeout(900); return; }
    for (const dd of await p.locator('.ab-tabs > .ab-dd > .ab-tab').all()) { await dd.click(); await p.waitForTimeout(200); const it = p.locator(`.ab-menu button[data-k="${k}"]`);
      if (await it.count()) { await it.click(); await p.waitForTimeout(900); return; } await p.keyboard.press('Escape'); await p.mouse.click(5, 990); await p.waitForTimeout(150); } };
  const app = async (p, id) => { if (await p.locator('.ab-grid').count()) { await p.locator('.ab-grid').click(); await p.waitForTimeout(600); } await p.locator(`.ah-card[data-app="${id}"]`).click(); await p.waitForTimeout(1000); };

  let { ctx, p } = await open({ 'mizan.navmode': 'apps' });
  // ---------- 1. cost centres ----------
  await app(p, 'accounting');
  check(await p.locator('.ao-sec[data-kind="Planning"] .ao-card[data-k="budgets"]').count() === 1, 'Accounting shows Budgets under Planning');
  await tab(p, 'cost_centers');
  check(await p.locator('.cc-empty').count() === 1 && await p.locator('.cc-starters button').count() === 5, 'no cost centres yet: what they are for, and quick start');
  await p.locator('.cc-starters button', { hasText: 'Head office' }).click(); await p.waitForTimeout(300);
  await p.locator('.cc-starters button', { hasText: 'Sales & marketing' }).click(); await p.waitForTimeout(300);
  check(await p.locator('.cc-card').count() === 2 && await p.locator('.cc-starters.left button').count() === 3, 'two added in a click each; the rest stay offered');
  await p.locator('.page-head .btn.pri', { hasText: 'New cost centre' }).click(); await p.waitForTimeout(300);
  await p.locator('.fld', { hasText: 'Name' }).first().locator('input').fill('Projects East');
  await p.locator('.fld', { hasText: 'Code' }).locator('input').fill('HO');
  check(await p.locator('.form-error', { hasText: 'Another cost centre uses HO' }).count() === 1 && await p.locator('.card .btn.pri', { hasText: 'Add cost centre' }).isDisabled(), 'codes must be unique');
  await p.locator('.fld', { hasText: 'Code' }).locator('input').fill('');
  await pick(p, p.locator('button.inp.sel[aria-label="Kind"]'), 'Project');
  await p.locator('.card .btn.pri', { hasText: 'Add cost centre' }).click(); await p.waitForTimeout(400);
  let s = await books(p);
  const HO = s.costCenters.find((c) => c.name === 'Head office'), SAL = s.costCenters.find((c) => c.name === 'Sales & marketing'), PE = s.costCenters.find((c) => c.name === 'Projects East');
  check(HO && SAL && PE && PE.code === 'PE' && PE.kind === 'project', 'a cost centre from the form gets a code from its name (' + (PE && PE.code) + ')');
  await shot(p, 'cost-01-centres');
  // ---------- 2. tag an invoice ----------
  await app(p, 'sales'); await tab(p, 'invoices');
  await p.locator('.page-head .btn.pri', { hasText: 'New invoice' }).click(); await p.waitForTimeout(700);
  await p.keyboard.type('Fujairah Port'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  await p.locator('[data-line-id] input[role="combobox"]').first().click(); await p.keyboard.type('HP EliteBook'); await p.locator('.picker-pop [role=option]').first().waitFor(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.locator('[data-line-id] .q-qty').first().fill('2'); await p.waitForTimeout(200);
  await pick(p, p.locator('button.inp.sel[aria-label="Cost centre"]'), 'Sales & marketing');
  await p.locator('.du-acts .btn', { hasText: 'Post to ledger' }).click(); await p.waitForTimeout(900);
  const invNo = (await p.locator('.du-no').innerText()).trim();
  s = await books(p); const inv = s.docs.find((d) => d.number === invNo);
  check(inv && inv.cc === SAL.id && inv.state === 'posted', invNo + ' posted under Sales & marketing');
  await p.keyboard.press('Escape');
  // ---------- 3. an expense and a journal line ----------
  await app(p, 'purchase'); await tab(p, 'expenses');
  await p.locator('.page-head .btn.pri', { hasText: 'Record expense' }).click(); await p.waitForTimeout(300);
  await p.locator('.fld', { hasText: 'Amount excluding VAT' }).locator('input').fill('1000');
  await pick(p, p.locator('button.inp.sel[aria-label="Cost centre"]'), 'Head office');
  await p.locator('.btn.pri', { hasText: 'Post expense' }).click(); await p.waitForTimeout(600);
  s = await books(p); const exp = s.docs.filter((d) => d.note === 'Recorded through Expenses').pop();
  check(exp && exp.cc === HO.id, 'an expense carries its cost centre (' + (exp && exp.number) + ')');
  await app(p, 'accounting'); await tab(p, 'journal');
  await p.locator('.page-head .btn.pri', { hasText: 'New journal entry' }).click(); await p.waitForTimeout(300);
  const jl = p.locator('table.lines tbody tr');
  await pick(p, jl.nth(0).locator('button.inp.sel[aria-label="Cost centre"]'), 'Projects East');
  await jl.nth(0).locator('input.n').nth(0).fill('500'); await jl.nth(1).locator('input.n').nth(1).fill('500'); await p.waitForTimeout(200);
  await p.locator('.btn.pri', { hasText: 'Post entry' }).click(); await p.waitForTimeout(600);
  s = await books(p); const je = s.manual[s.manual.length - 1];
  check(je && je.lines[0].cc === PE.id && !je.lines[1].cc, 'a journal line carries its cost centre');
  // ---------- 4. Profit by cost centre ----------
  await tab(p, 'r_cc'); await p.waitForTimeout(600);
  const heads = await p.locator('.cc-tbl thead th').allInnerTexts();
  check(['Head office', 'Sales & marketing', 'Projects East', 'Unassigned', 'Whole company'].every((h) => heads.some((x) => x.toLowerCase().includes(h.toLowerCase()))), 'side by side: each cost centre, Unassigned and the whole company (' + heads.join(' | ').replace(/\s+/g, ' ') + ')');
  const net = await p.evaluate(() => { const row = [...document.querySelectorAll('.cc-tbl tbody tr')].find((r) => /^Net profit/.test(r.cells[0].innerText.trim()));
    const num = (t) => { const neg = /[−(-]/.test(t); const n = +t.replace(/[^0-9.]/g, ''); return neg ? -n : n; };
    const v = [...row.cells].slice(1).map((c) => num(c.innerText)); return { parts: v.slice(0, -1).reduce((a, x) => a + x, 0), whole: v[v.length - 1] }; });
  check(Math.abs(net.parts - net.whole) < 0.05, 'the columns add up to the whole company (' + net.parts.toFixed(2) + ' = ' + net.whole.toFixed(2) + ')');
  check(/Sales & marketing|made the most/.test(await p.locator('.rframe .insight').innerText()), 'and say who made the most');
  await shot(p, 'cost-02-report');
  // a used cost centre stays
  await tab(p, 'cost_centers');
  await p.locator(`.cc-card[data-cc="${HO.id}"] button[title="Delete"]`).click(); await p.waitForTimeout(400);
  check(await p.locator(`.cc-card[data-cc="${HO.id}"]`).count() === 1 && /switch it off instead/.test(await p.locator('.toasts').innerText()), 'a cost centre in use cannot be deleted — switch it off instead');
  check((await p.locator(`.cc-card[data-cc="${SAL.id}"] .cc-fig b`).first().innerText()).trim() !== '0.00' && await p.locator(`.cc-card[data-cc="${SAL.id}"] .cc-bars`).count() === 1, 'each card shows its figures this year');
  // ---------- 5. budgets ----------
  await tab(p, 'budgets');
  check(await p.locator('.page-head .btn.pri', { hasText: 'New budget' }).count() === 1, 'Budgets: start one');
  await p.locator('.page-head .btn.pri', { hasText: 'New budget' }).click(); await p.waitForTimeout(300);
  check(await p.locator('.bud-from .pick.on', { hasText: 'run rate' }).count() === 1, 'a new budget starts from this year’s run rate');
  await p.locator('.btn.pri', { hasText: 'Continue' }).click(); await p.waitForTimeout(700);
  check(await p.locator('.bud-tbl tbody tr').count() > 8, 'the plan is filled from real figures');
  // spread a year evenly
  const rentRow = p.locator('.bud-tbl tbody tr', { hasText: '6200' });
  if (!(await rentRow.count())) await pick(p, p.locator('button.inp.sel[aria-label="Add an account to the budget"]'), '6200');
  await p.locator('.bud-tbl tbody tr', { hasText: '6200' }).first().locator('input[aria-label$="total for the year"]').fill('120000'); await p.waitForTimeout(200);
  const months = await p.locator('.bud-tbl tbody tr', { hasText: '6200' }).first().locator('td input').evaluateAll((els) => els.slice(0, 12).map((e) => +e.value));
  check(months.every((v) => v === 10000), 'typing a year in Total spreads it evenly (' + months[0] + ' a month)');
  await shot(p, 'cost-03-budget-editor');
  await p.locator('.page-head .btn.pri', { hasText: 'Save budget' }).click(); await p.waitForTimeout(600);
  s = await books(p); const bud = s.budgets[0];
  check(bud && bud.amounts['6200'].every((v) => v === 10000) && Object.keys(bud.amounts).length > 8, 'saved with every month');
  check(await p.locator('.bud-card').count() === 1 && /Income achieved/.test(await p.locator('.bud-card').innerText()), 'the budget card shows how much is used');
  await shot(p, 'cost-04-budgets');
  await p.locator('.bud-open').click(); await p.waitForTimeout(1200);
  check(await p.locator('.bva-k').count() === 4 && await p.locator('.bva-tbl tbody tr').count() > 8, 'Budget vs actual: four figures and every line');
  check(/against a budget of/.test(await p.locator('.rframe .insight').innerText()), 'explained in a sentence');
  const dl = p.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await p.locator('.exp-group .btn', { hasText: 'Excel' }).click();
  const x = await dl; check(x && /\.xlsx$/.test(x.suggestedFilename()), 'exports to Excel (' + (x && x.suggestedFilename()) + ')');
  await shot(p, 'cost-05-budget-vs-actual');
  // a budget for one cost centre
  await tab(p, 'budgets');
  await p.locator('.page-head .btn.pri', { hasText: 'New budget' }).click(); await p.waitForTimeout(300);
  await p.locator('.fld', { hasText: 'Name' }).first().locator('input').fill('Sales team budget');
  await pick(p, p.locator('button.inp.sel[aria-label="For"]'), 'Sales & marketing');
  await p.locator('.bud-from .pick', { hasText: 'Blank' }).click(); await p.locator('.btn.pri', { hasText: 'Continue' }).click(); await p.waitForTimeout(600);
  check(await p.locator('.bud-tbl tbody tr input').count() === 0, 'blank starts empty');
  await pick(p, p.locator('button.inp.sel[aria-label="Add an account to the budget"]'), '4100');
  await p.locator('.bud-tbl tbody tr', { hasText: '4100' }).first().locator('input[aria-label$="total for the year"]').fill('60000');
  await p.locator('.page-head .btn.pri', { hasText: 'Save budget' }).click(); await p.waitForTimeout(600);
  await p.locator('.bud-card', { hasText: 'Sales team budget' }).locator('.bud-open').click(); await p.waitForTimeout(1000);
  check(/SAL · Sales & marketing/.test(await p.locator('.rf-chips').innerText()), 'a budget for one cost centre compares with that cost centre');
  await ctx.close();

  // ---------- 6. the classic menu has every new screen ----------
  ({ ctx, p } = await open());
  const keys = await p.locator('.sbar [data-k]').evaluateAll((els) => els.map((e) => e.getAttribute('data-k')));
  check(['cost_centers', 'budgets', 'r_budget', 'r_cc', 'roles', 'access_rules'].every((k) => keys.includes(k)), 'the sidebar lists cost centres, budgets, their reports, roles and access rules');
  await p.locator('.sbar [data-k="reports"]').first().click(); await p.waitForTimeout(800);
  check(/Budgets & cost centres/.test(await p.locator('.page').innerText()) && await p.locator('.report-card', { hasText: 'Budget vs actual' }).count() === 1, 'All reports has a Plans & cost centres group');
  await ctx.close();

  console.log(JSON.stringify({ ok: ok.length, errors: errs }, null, 1));
  if (process.env.VERBOSE) console.log(ok.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.log(JSON.stringify({ ok: ok.length, okList: ok, errors: errs }, null, 1)); process.exit(1); });
