/* ============================================================================
   3.23 — Cost centres and budgets.
   · Cost centres: departments, projects or locations. An invoice, bill,
     expense or journal line can carry one; its income and expense lines
     then report under it. "Profit by cost centre" puts them side by side,
     with an "Unassigned" column so the total always equals the P&L.
   · Budgets: an amount per profit-and-loss account per month, for the whole
     company or one cost centre. Start from last year's actuals, this year's
     run rate or blank; "Budget vs actual" shows variance and how much of
     each line is used, month by month.
   ========================================================================== */

var COST_CENTERS = [];
const CCS = {};
function syncCostCenters(list) {
  COST_CENTERS = (list || []).filter((c) => c && c.id);
  Object.keys(CCS).forEach((k) => delete CCS[k]);
  COST_CENTERS.forEach((c) => (CCS[c.id] = c));
}
const ccOn = () => COST_CENTERS.some((c) => c.active !== false);
const ccName = (id) => (CCS[id] ? CCS[id].name : "");
const ccLabel = (id) => (CCS[id] ? (CCS[id].code ? CCS[id].code + " · " : "") + CCS[id].name : "");
const CC_KINDS = [["department", "Department"], ["project", "Project"], ["location", "Location"], ["other", "Other"]];
const CC_STARTERS = [["Head office", "HO", "department"], ["Sales & marketing", "SAL", "department"], ["Operations", "OPS", "department"], ["Warehouse", "WH", "location"], ["Projects", "PRJ", "project"]];
const ccCode = (name, taken) => { const base = (name.match(/\b[A-Za-z]/g) || []).join("").toUpperCase().slice(0, 3) || name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "CC";
  let c = base, n = 2; while (taken.includes(c)) c = base + n++; return c; };

/* Ledger lines of one cost centre; "__none" is what has no cost centre. */
const ccFlat = (flat, cc) => (!cc ? flat : cc === "__none" ? flat.filter((l) => !l.cc || !CCS[l.cc]) : flat.filter((l) => l.cc === cc));
/* Profit and loss for every cost centre, the unassigned part and the whole company (which equals the P&L). */
function ccProfit(flat, from, to) {
  const cols = COST_CENTERS.map((c) => ({ c, r: pnl(ccFlat(flat, c.id), from, to) }));
  return { cols, none: pnl(ccFlat(flat, "__none"), from, to), all: pnl(flat, from, to) };
}

/* ------------------------------------------------------------- budgets */
const BUD_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PL_TYPES = ["income", "cogs", "expense"];
const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
/* How much of each month of the year a period covers (a part month counts by its days). */
function monthShares(year, from, to) {
  return BUD_MONTHS.map((_, m) => {
    const ms = `${year}-${String(m + 1).padStart(2, "0")}-01`, me = `${year}-${String(m + 1).padStart(2, "0")}-${String(daysIn(year, m)).padStart(2, "0")}`;
    const a = from > ms ? from : ms, b = to < me ? to : me;
    if (a > b) return 0;
    return (daysBetween(a, b) + 1) / daysIn(year, m);
  });
}
/* Actual amounts per P&L account, as positive figures (revenue and costs alike). */
function plActuals(flat, from, to) {
  const r = pnl(flat, from, to), o = {};
  [...r.rev, ...r.cos, ...r.exp].forEach((x) => (o[x.acc.code] = x.amount));
  return o;
}
/* Budget against actual for a period: one row per account, grouped, with totals and net profit. Variance is positive when it helps profit. */
function budgetVsActual(b, flat, from, to) {
  const y = +b.year, lo = from > `${y}-01-01` ? from : `${y}-01-01`, hi = to < `${y}-12-31` ? to : `${y}-12-31`;
  const share = monthShares(y, lo, hi);
  const actual = plActuals(ccFlat(flat, b.cc || ""), lo, hi);
  const budgetOf = (acc) => R2((b.amounts[acc] || []).reduce((s, v, i) => s + (+v || 0) * share[i], 0));
  const codes = [...new Set([...Object.keys(b.amounts || {}), ...Object.keys(actual)])].filter((c) => ACC[c] && PL_TYPES.includes(ACC[c].type));
  const rows = codes.map((c) => { const a = ACC[c], bud = budgetOf(c), act = R2(actual[c] || 0), inc = a.type === "income";
    return { acc: a, type: a.type, budget: bud, actual: act, variance: R2(inc ? act - bud : bud - act), used: bud ? (act / bud) * 100 : null }; })
    .filter((r) => r.budget || r.actual).sort((p, q) => p.acc.code.localeCompare(q.acc.code));
  const sum = (t, k) => R2(rows.filter((r) => r.type === t).reduce((s, r) => s + r[k], 0));
  const tot = (k) => ({ income: sum("income", k), cogs: sum("cogs", k), expense: sum("expense", k) });
  const B = tot("budget"), A = tot("actual");
  const net = { budget: R2(B.income - B.cogs - B.expense), actual: R2(A.income - A.cogs - A.expense) };
  net.variance = R2(net.actual - net.budget);
  return { rows, B, A, net, from: lo, to: hi, empty: hi < lo };
}
/* Monthly budget and actual net profit for the budget's year, for the chart. */
function budgetByMonth(b, flat) {
  const y = +b.year;
  return BUD_MONTHS.map((m, i) => { const from = `${y}-${String(i + 1).padStart(2, "0")}-01`, to = `${y}-${String(i + 1).padStart(2, "0")}-${String(daysIn(y, i)).padStart(2, "0")}`;
    const r = budgetVsActual(b, flat, from, to);
    return { label: m, budget: r.net.budget, actual: from <= TODAY ? r.net.actual : null }; });
}
const budgetTotal = (b, types) => R2(Object.entries(b.amounts || {}).filter(([c]) => ACC[c] && types.includes(ACC[c].type)).reduce((s, [, v]) => s + v.reduce((t, x) => t + (+x || 0), 0), 0));
/* Start a budget from actual figures: each month as it was (last year), or this year's monthly average for every month. */
function budgetFrom(flat, year, from, cc, growth) {
  const g = 1 + (+growth || 0) / 100, lines = ccFlat(flat, cc || ""), out = {};
  if (from === "blank") return out;
  if (from === "last") {
    const y = year - 1;
    BUD_MONTHS.forEach((_, i) => { const a = plActuals(lines, `${y}-${String(i + 1).padStart(2, "0")}-01`, `${y}-${String(i + 1).padStart(2, "0")}-${String(daysIn(y, i)).padStart(2, "0")}`);
      Object.entries(a).forEach(([c, v]) => { (out[c] = out[c] || Array(12).fill(0))[i] = Math.round(v * g); }); });
  } else {
    const y = +TODAY.slice(0, 4), months = +TODAY.slice(5, 7) || 1, a = plActuals(lines, `${y}-01-01`, TODAY);
    Object.entries(a).forEach(([c, v]) => { out[c] = Array(12).fill(Math.round((v / months) * g)); });
  }
  return out;
}

/* ------------------------------------------------------------- controls */
function CostCentreField({ value, onChange, disabled, label = "Cost centre", span }) {
  if (!ccOn() && !(value && CCS[value])) return null;
  return <Field label={label} span={span}><Select value={value || ""} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.value)}>
    <option value="">No cost centre</option>
    {COST_CENTERS.filter((c) => c.active !== false || c.id === value).map((c) => <option key={c.id} value={c.id}>{(c.code ? c.code + " · " : "") + c.name}</option>)}
  </Select></Field>;
}

/* ------------------------------------------------------- cost centres */
function CostCentersScreen({ state, setState, books, toast, go, create }) {
  const list = state.costCenters || [];
  const blank = () => ({ id: uid("cc"), name: "", code: "", kind: "department", manager: "", note: "", active: true });
  const [ed, setEd] = useState(null);
  useCreate(create, () => setEd(blank()));
  const y0 = TODAY.slice(0, 4) + "-01-01";
  const fig = useMemo(() => ccProfit(books.flat, y0, TODAY), [books, list]);
  const used = (id) => books.flat.some((l) => l.cc === id) || (state.budgets || []).some((b) => b.cc === id);
  const isNew = ed && !list.some((c) => c.id === ed.id);
  const taken = list.filter((c) => !ed || c.id !== ed.id).map((c) => c.code);
  const dup = ed && ed.code && taken.includes(ed.code.toUpperCase());
  const save = () => {
    const rec = { ...ed, name: ed.name.trim(), code: (ed.code || ccCode(ed.name, taken)).toUpperCase().trim() };
    setState((x) => { const l = x.costCenters || []; return { ...x, costCenters: l.some((c) => c.id === rec.id) ? l.map((c) => (c.id === rec.id ? rec : c)) : [...l, rec] }; });
    toast(`${rec.code} · ${rec.name} saved`); setEd(null);
  };
  const quick = (name, code, kind) => {
    if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const rec = { ...blank(), name, code: taken.includes(code) ? ccCode(name, taken) : code, kind };
    setState((x) => ({ ...x, costCenters: [...(x.costCenters || []), rec] })); toast(`${rec.name} added`);
  };
  const toggle = (c) => { setState((x) => ({ ...x, costCenters: (x.costCenters || []).map((y) => (y.id === c.id ? { ...y, active: y.active === false } : y)) }));
    toast(`${c.name} ${c.active === false ? "reactivated" : "switched off — kept on past records"}`, c.active === false ? "" : "warn"); };
  const remove = (c) => { if (used(c.id)) { toast(`${c.name} is used on records or a budget — switch it off instead`, "warn"); return; }
    removeWithUndo({ setState, toast, key: "costCenters", rec: c, label: c.name, fallback: [], verb: "removed" }); };
  const max = Math.max(1, ...fig.cols.map((x) => Math.abs(x.r.revenue) + Math.abs(x.r.cost + x.r.expense)));
  const users = state.users || SEED_USERS;
  return <div>
    <PageHead eyebrow="Accounting" title="Cost centres" sub="Departments, projects or locations. Tag invoices, bills, expenses and journal lines with one to see profit for each.">
      {list.length > 0 && <Btn icon={BarChart3} onClick={() => go("r_cc")}>Profit by cost centre</Btn>}
      <Btn kind="pri" icon={Plus} className="act-create" onClick={() => setEd(blank())}>New cost centre</Btn>
    </PageHead>
    {ed && <Card title={isNew ? "New cost centre" : `Edit ${ed.name || "cost centre"}`} sub="A short code keeps reports and exports tidy" style={{ marginBottom: 16 }}
      right={<><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!ed.name.trim() || dup} onClick={save}>{isNew ? "Add cost centre" : "Save changes"}</Btn></>}>
      <div className="setgrid">
        <Field label="Name" span={2}><Input value={ed.name} autoFocus placeholder="Sales & marketing" onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
        <Field label="Code"><Input value={ed.code} placeholder={ed.name ? ccCode(ed.name, taken) : "SAL"} maxLength={8} onChange={(e) => setEd({ ...ed, code: e.target.value.toUpperCase() })} />
          {dup && <div className="form-error">Another cost centre uses {ed.code}</div>}</Field>
        <Field label="Kind"><Select value={ed.kind} onChange={(e) => setEd({ ...ed, kind: e.target.value })}>{CC_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Responsible person"><Select value={ed.manager || ""} onChange={(e) => setEd({ ...ed, manager: e.target.value })}>
          <option value="">Nobody yet</option>{users.filter((u) => u.active !== false).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Note" span={3}><Input value={ed.note} placeholder="What it covers" onChange={(e) => setEd({ ...ed, note: e.target.value })} /></Field>
      </div>
    </Card>}
    {!list.length && !ed ? <Card className="cc-empty">
      <EmptyState icon={Target} title="Track profit by department, project or location">
        Add your cost centres, then pick one on an invoice, bill, expense or journal line. Reports split income and costs by cost centre, and budgets can be set for each.</EmptyState>
      <div className="cc-starters"><span>Quick start</span>{CC_STARTERS.map(([n, c, k]) => <button key={c} className="act-create" onClick={() => quick(n, c, k)}><Plus size={13} />{n}</button>)}</div>
    </Card> : <div className="cc-grid">{list.map((c) => { const f = fig.cols.find((x) => x.c.id === c.id), r = f ? f.r : { revenue: 0, cost: 0, expense: 0, net: 0 };
      const costs = R2(r.cost + r.expense), mgr = c.manager && users.find((u) => u.id === c.manager);
      return <div key={c.id} className={cx("cc-card", c.active === false && "off")} data-cc={c.id}>
        <header><span className="cc-code">{c.code}</span><span className="cc-t"><b>{c.name}</b><small>{(CC_KINDS.find((k) => k[0] === c.kind) || CC_KINDS[3])[1]}{mgr ? " · " + mgr.name : ""}{c.active === false ? " · switched off" : ""}</small></span>
          <span className="cc-acts">
            <button className="icon-btn act-edit" title="Edit" onClick={() => setEd({ ...c })}><Pencil size={14} /></button>
            <button className="icon-btn act-edit" title={c.active === false ? "Reactivate" : "Switch off"} onClick={() => toggle(c)}>{c.active === false ? <Check size={14} /> : <X size={14} />}</button>
            <button className="icon-btn act-delete" title="Delete" onClick={() => remove(c)}><Trash2 size={14} /></button></span></header>
        <div className="cc-fig"><div><small>Income this year</small><b>{money(r.revenue, false)}</b></div><div><small>Costs</small><b>{money(costs, false)}</b></div>
          <div><small>Net</small><b className={r.net < 0 ? "neg" : r.net > 0 ? "pos" : ""}>{money(r.net, false)}</b></div></div>
        {Math.abs(r.revenue) + Math.abs(costs) > 0.004 ? <div className="cc-bars" aria-hidden="true"><i style={{ width: `${(Math.abs(r.revenue) / max) * 100}%` }} /><i className="c" style={{ width: `${(Math.abs(costs) / max) * 100}%` }} /></div>
          : <p className="cc-note">Nothing tagged yet — pick {c.code} on an invoice, bill, expense or journal line.</p>}
        {c.note && <p className="cc-note">{c.note}</p>}
      </div>; })}</div>}
    {list.length > 0 && CC_STARTERS.some(([n]) => !list.some((c) => c.name.toLowerCase() === n.toLowerCase())) && <div className="cc-starters left"><span>Quick add</span>
      {CC_STARTERS.filter(([n]) => !list.some((c) => c.name.toLowerCase() === n.toLowerCase())).map(([n, c, k]) => <button key={c} className="act-create" onClick={() => quick(n, c, k)}><Plus size={13} />{n}</button>)}</div>}
    {list.length > 0 && <p className="br-note">Income and costs this year by cost centre. {Math.abs(fig.none.revenue) + Math.abs(fig.none.cost + fig.none.expense) > 0.004
      ? <>Not tagged yet: income {aed(fig.none.revenue)}, costs {aed(R2(fig.none.cost + fig.none.expense))} — pick a cost centre on new invoices, bills, expenses and journal lines.</> : "Everything this year is tagged."}</p>}
  </div>;
}

/* ------------------------------------------------- profit by cost centre */
function CostCentreReport({ state, books, p, setP, toast, go }) {
  const fig = useMemo(() => ccProfit(books.flat, p.from, p.to), [books, p.from, p.to, state.costCenters]);
  if (!COST_CENTERS.length) return <ReportFrame toast={toast} title="Profit by cost centre" icon={Target} chips={[`${dmy(p.from)} – ${dmy(p.to)}`]}>
    <EmptyState icon={Target} title="Add cost centres to compare them">Set them up under Accounting › Configuration › Cost centres, then tag your invoices, bills and expenses.</EmptyState>
    <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}><Btn kind="pri" icon={Target} onClick={() => go("cost_centers")}>Set up cost centres</Btn></div></ReportFrame>;
  const showNone = Math.abs(fig.none.revenue) + Math.abs(fig.none.cost) + Math.abs(fig.none.expense) > 0.004;
  const cols = [...fig.cols.map((x) => ({ id: x.c.id, name: x.c.name, code: x.c.code, r: x.r })), ...(showNone ? [{ id: "__none", name: "Unassigned", code: "", r: fig.none }] : [])];
  const accRows = (key) => { const codes = new Set(); [...cols.map((x) => x.r), fig.all].forEach((r) => r[key].forEach((y) => codes.add(y.acc.code)));
    return [...codes].sort().map((c) => ({ c, label: `${c} ${ACC[c] ? ACC[c].name : ""}`, f: (r) => (r[key].find((y) => y.acc.code === c) || { amount: 0 }).amount })); };
  const sections = [["Revenue", "rev", (r) => r.revenue], ["Cost of sales", "cos", (r) => r.cost], ["Gross profit", null, (r) => r.gross], ["Operating expenses", "exp", (r) => r.expense], ["Net profit", null, (r) => r.net]];
  const best = fig.cols.slice().sort((a, b) => b.r.net - a.r.net)[0];
  return <div className="grid">
    <ReportFrame toast={toast} title="Profit by cost centre" icon={Target} chips={[`${dmy(p.from)} – ${dmy(p.to)}`, `${COST_CENTERS.length} cost centres`, "AED"]}
      meta={`${dmy(p.from)} to ${dmy(p.to)} · ${COST_CENTERS.length} cost centres · AED`} right={<PeriodBar p={p} setP={setP} />}>
      <Insight tone={showNone ? "warn" : ""}>{best && best.r.net > 0 ? <><b>{best.c.name}</b> made the most: net <b>{aed(best.r.net)}</b> on income of {aed(best.r.revenue)}. </> : null}
        Whole company: income {aed(fig.all.revenue)}, net profit {aed(fig.all.net)}.{showNone ? <> Income {aed(fig.none.revenue)} and costs {aed(R2(fig.none.cost + fig.none.expense))} have no cost centre yet.</> : " Every line is tagged."}</Insight>
      <div className="rpt-grid">
        <VizCard title="Income and net profit by cost centre" sub={`${dmy(p.from)} – ${dmy(p.to)} · AED`} legend={[{ name: "Income", color: "var(--s1)" }, { name: "Net profit", color: "var(--s2)" }]}>
          <ColumnChart data={cols.map((x) => ({ label: x.code || x.name, full: x.name, revenue: x.r.revenue, net: x.r.net }))}
            series={[{ key: "revenue", name: "Income", color: "var(--s1)" }, { key: "net", name: "Net profit", color: "var(--s2)" }]} ariaLabel="Income and net profit by cost centre" />
        </VizCard>
        <VizCard title="Share of costs" sub="Cost of sales and expenses carried by each cost centre">
          <div className="meters">{cols.map((x) => { const c = R2(x.r.cost + x.r.expense), all = R2(fig.all.cost + fig.all.expense);
            return <Meter key={x.id} label={x.name} value={Math.max(0, c)} max={Math.max(all, 1)} text={all ? `${((c / all) * 100).toFixed(1)}%` : "—"} note={`AED ${money(c, false)}`} />; })}</div>
        </VizCard>
      </div>
      <SectionTitle>Side by side</SectionTitle>
      <div className="tbl-wrap"><table className="tbl fin-tbl br-tbl cc-tbl">
        <thead><tr><th></th>{cols.map((x) => <th key={x.id} className="n">{x.name}{x.id !== "__none" && <small> {x.code}</small>}</th>)}<th className="n">Whole company</th></tr></thead>
        <tbody>{sections.map(([label, key, f]) => <React.Fragment key={label}>
          {key && accRows(key).map((a) => <tr key={key + a.c} className="fin-acc"><td className="cc-acc">{a.label}</td>{cols.map((x) => <td key={x.id} className="n">{money(a.f(x.r))}</td>)}<td className="n">{money(a.f(fig.all))}</td></tr>)}
          <tr className={label === "Net profit" ? "fin-total" : "fin-sub"}><td>{key ? "Total " + label.toLowerCase() : label}</td>
            {cols.map((x) => <td key={x.id} className={cx("n", label.endsWith("profit") && f(x.r) < 0 && "neg")}>{money(f(x.r))}</td>)}<td className="n" style={{ fontWeight: 650 }}>{money(f(fig.all))}</td></tr>
        </React.Fragment>)}</tbody>
      </table></div>
      <p className="br-note">Each column holds the income and costs recorded under that cost centre. "Unassigned" is what has no cost centre; with it, the columns always add up to the whole company, which equals the profit and loss statement.</p>
    </ReportFrame>
  </div>;
}

/* ------------------------------------------------------------- budgets */
function BudgetsScreen({ state, setState, books, toast, go, create, param }) {
  const list = state.budgets || [];
  const [ed, setEd] = useState(null), [wiz, setWiz] = useState(null);
  const y = +TODAY.slice(0, 4);
  useCreate(create, () => setWiz({ name: `Budget ${y}`, year: y, cc: "", from: "run", growth: 5 }));
  React.useEffect(() => { if (param === "__new__") setWiz({ name: `Budget ${y}`, year: y, cc: "", from: "run", growth: 5 }); }, [param]);
  const start = () => {
    const amounts = budgetFrom(books.flat, +wiz.year, wiz.from, wiz.cc, wiz.growth);
    setEd({ id: uid("bud"), name: wiz.name.trim() || `Budget ${wiz.year}`, year: +wiz.year, cc: wiz.cc, amounts, created: TODAY, isNew: true });
    setWiz(null);
  };
  const save = () => { const rec = { ...ed }; delete rec.isNew;
    setState((x) => { const l = x.budgets || []; return { ...x, budgets: l.some((b) => b.id === rec.id) ? l.map((b) => (b.id === rec.id ? rec : b)) : [...l, rec] }; });
    toast(`${rec.name} saved`); setEd(null); };
  const duplicate = (b) => { const rec = { ...b, id: uid("bud"), name: b.name + " (copy)", amounts: JSON.parse(JSON.stringify(b.amounts)), created: TODAY };
    setState((x) => ({ ...x, budgets: [...(x.budgets || []), rec] })); toast(`${rec.name} created`); };
  const remove = (b) => removeWithUndo({ setState, toast, key: "budgets", rec: b, label: b.name, fallback: [], verb: "deleted" });
  if (ed) return <BudgetEditor b={ed} setB={setEd} books={books} cancel={() => setEd(null)} save={save} />;
  return <div>
    <PageHead eyebrow="Accounting" title="Budgets" sub="Plan income and costs month by month — for the whole company or one cost centre — then follow them in Budget vs actual.">
      {list.length > 0 && <Btn icon={BarChart3} onClick={() => go("r_budget")}>Budget vs actual</Btn>}
      <Btn kind="pri" icon={Plus} className="act-create" onClick={() => setWiz({ name: `Budget ${y}`, year: y, cc: "", from: "run", growth: 5 })}>New budget</Btn>
    </PageHead>
    {wiz && <Card title="New budget" sub="Start from real figures and adjust — quicker than typing every month" style={{ marginBottom: 16 }}
      right={<><Btn onClick={() => setWiz(null)}>Cancel</Btn><Btn kind="pri" icon={ArrowRight} onClick={start}>Continue</Btn></>}>
      <div className="setgrid">
        <Field label="Name" span={2}><Input value={wiz.name} onChange={(e) => setWiz({ ...wiz, name: e.target.value })} /></Field>
        <Field label="Year"><Select value={String(wiz.year)} onChange={(e) => setWiz({ ...wiz, year: +e.target.value, name: wiz.name.replace(/\d{4}/, e.target.value) })}>
          {[y - 1, y, y + 1].map((v) => <option key={v} value={String(v)}>{v}</option>)}</Select></Field>
        <Field label="For"><Select value={wiz.cc} onChange={(e) => setWiz({ ...wiz, cc: e.target.value })}><option value="">The whole company</option>
          {COST_CENTERS.filter((c) => c.active !== false).map((c) => <option key={c.id} value={c.id}>{(c.code ? c.code + " · " : "") + c.name}</option>)}</Select></Field>
      </div>
      <div className="micro" style={{ margin: "16px 0 10px" }}>Start from</div>
      <div className="picks bud-from">{[["run", "This year's run rate", `Each month = this year's monthly average so far${wiz.growth ? `, +${wiz.growth}%` : ""}`],
        ["last", "Last year's actuals", `Each month as it was in ${wiz.year - 1}${wiz.growth ? `, +${wiz.growth}%` : ""}`], ["blank", "Blank", "Type the amounts yourself"]].map(([k, t, s]) =>
        <button key={k} className={cx("pick", wiz.from === k && "on")} onClick={() => setWiz({ ...wiz, from: k })}><span className="pt"><b>{t}</b><span>{s}</span></span><span className="chk">{wiz.from === k && <Check size={11} strokeWidth={3.2} />}</span></button>)}</div>
      {wiz.from !== "blank" && <div className="bud-growth"><Field label="Growth or saving · %"><Input n type="number" step="1" value={wiz.growth} onChange={(e) => setWiz({ ...wiz, growth: e.target.value })} /></Field>
        <span>Applied to every line; use a negative figure to plan a cut.</span></div>}
    </Card>}
    {!list.length && !wiz ? <Card><EmptyState icon={PiggyBank} title="No budget yet">A budget sets what you expect to earn and spend each month. Start one from this year's run rate in a few seconds, then compare in Budget vs actual.</EmptyState>
      <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}><Btn kind="pri" icon={Plus} className="act-create" onClick={() => setWiz({ name: `Budget ${y}`, year: y, cc: "", from: "run", growth: 5 })}>Create a budget</Btn></div></Card>
    : <div className="bud-grid">{list.map((b) => { const ytdTo = +b.year === y ? TODAY : `${b.year}-12-31`;
      const r = budgetVsActual(b, books.flat, `${b.year}-01-01`, ytdTo), full = budgetVsActual(b, books.flat, `${b.year}-01-01`, `${b.year}-12-31`);
      const incUsed = r.B.income ? (r.A.income / r.B.income) * 100 : 0, cost = R2(r.B.cogs + r.B.expense), costUsed = cost ? ((r.A.cogs + r.A.expense) / cost) * 100 : 0;
      return <div key={b.id} className="bud-card" data-budget={b.id}>
        <header><span className="bud-ic"><PiggyBank size={18} /></span><span className="bud-t"><b>{b.name}</b><small>{b.year} · {b.cc ? ccLabel(b.cc) || "Cost centre removed" : "Whole company"}</small></span>
          <span className="cc-acts">
            <button className="icon-btn act-edit" title="Edit" onClick={() => setEd({ ...b, amounts: JSON.parse(JSON.stringify(b.amounts)) })}><Pencil size={14} /></button>
            <button className="icon-btn act-create" title="Duplicate" onClick={() => duplicate(b)}><Copy size={14} /></button>
            <button className="icon-btn act-delete" title="Delete" onClick={() => remove(b)}><Trash2 size={14} /></button></span></header>
        <div className="bud-fig"><div><small>Income budget {b.year}</small><b>{money(full.B.income, false)}</b></div><div><small>Costs budget</small><b>{money(R2(full.B.cogs + full.B.expense), false)}</b></div>
          <div><small>Net profit budget</small><b className={full.net.budget < 0 ? "neg" : ""}>{money(full.net.budget, false)}</b></div></div>
        <div className="bud-meter"><span>Income achieved {+b.year === y ? "so far" : ""}</span><em>{incUsed.toFixed(0)}%</em><i><b style={{ width: `${Math.min(100, incUsed)}%` }} /></i></div>
        <div className={cx("bud-meter", costUsed > 100 && "over")}><span>Costs used</span><em>{costUsed.toFixed(0)}%</em><i><b style={{ width: `${Math.min(100, costUsed)}%` }} /></i></div>
        <button className="bud-open" onClick={() => go("r_budget", b.id)}>Budget vs actual<ChevronRight size={14} /></button>
      </div>; })}</div>}
  </div>;
}

/* The grid: P&L accounts down, months across; typing in Total spreads it evenly. */
function BudgetEditor({ b, setB, books, cancel, save }) {
  const [add, setAdd] = useState("");
  const codes = Object.keys(b.amounts).filter((c) => ACC[c] && PL_TYPES.includes(ACC[c].type));
  const last = useMemo(() => plActuals(ccFlat(books.flat, b.cc || ""), `${b.year - 1}-01-01`, `${b.year - 1}-12-31`), [books, b.year, b.cc]);
  const setCell = (c, i, v) => setB((x) => { const a = (x.amounts[c] || Array(12).fill(0)).slice(); a[i] = v === "" ? 0 : +v; return { ...x, amounts: { ...x.amounts, [c]: a } }; });
  const spread = (c, total) => setB((x) => { const t = +total || 0, per = Math.round((t / 12) * 100) / 100, a = Array(12).fill(per); a[11] = R2(t - per * 11); return { ...x, amounts: { ...x.amounts, [c]: a } }; });
  const drop = (c) => setB((x) => { const a = { ...x.amounts }; delete a[c]; return { ...x, amounts: a }; });
  const scale = (pct) => setB((x) => ({ ...x, amounts: Object.fromEntries(Object.entries(x.amounts).map(([c, a]) => [c, a.map((v) => Math.round((+v || 0) * (1 + pct / 100)))])) }));
  const rowTotal = (c) => R2((b.amounts[c] || []).reduce((s, v) => s + (+v || 0), 0));
  const groups = [["income", "Revenue"], ["cogs", "Cost of sales"], ["expense", "Operating expenses"]];
  const colSum = (t, i) => R2(codes.filter((c) => ACC[c].type === t).reduce((s, c) => s + (+(b.amounts[c] || [])[i] || 0), 0));
  const netAt = (i) => R2(colSum("income", i) - colSum("cogs", i) - colSum("expense", i));
  const free = ACCOUNTS.filter((a) => PL_TYPES.includes(a.type) && !codes.includes(a.code));
  return <div className="bud-ed">
    <PageHead eyebrow="Accounting · Budgets" title={b.name} sub={`${b.year} · ${b.cc ? ccLabel(b.cc) : "Whole company"} · AED. Type a month, or type a year in Total to spread it evenly.`}>
      <Btn onClick={cancel}>Cancel</Btn><Btn kind="pri" icon={Check} onClick={save}>Save budget</Btn>
    </PageHead>
    <Card pad={false} title="Plan" sub={`Net profit budget ${money(R2(BUD_MONTHS.reduce((s, _, i) => s + netAt(i), 0)), false)}`}
      right={<div className="bud-tools"><Input value={b.name} aria-label="Budget name" onChange={(e) => setB({ ...b, name: e.target.value })} />
        <Btn size="sm" onClick={() => scale(5)}>+5% all</Btn><Btn size="sm" onClick={() => scale(-5)}>−5% all</Btn></div>}>
      <div className="tbl-wrap bud-wrap"><table className="bud-tbl">
        <thead><tr><th className="ba">Account</th>{BUD_MONTHS.map((m) => <th key={m} className="n">{m}</th>)}<th className="n bt">Total</th><th className="n bl">{b.year - 1} actual</th><th /></tr></thead>
        <tbody>{groups.map(([t, label]) => { const rows = codes.filter((c) => ACC[c].type === t).sort();
          return <React.Fragment key={t}><tr className="bud-gh"><td colSpan={16}>{label}</td></tr>
            {rows.map((c) => <tr key={c}><td className="ba"><b>{c}</b> {ACC[c].name}</td>
              {BUD_MONTHS.map((m, i) => <td key={m} className="n"><input className="inp n" type="number" step="any" aria-label={`${ACC[c].name} ${m}`} value={(b.amounts[c] || [])[i] || ""} onChange={(e) => setCell(c, i, e.target.value)} /></td>)}
              <td className="n bt"><input className="inp n" type="number" step="any" aria-label={`${ACC[c].name} total for the year`} value={rowTotal(c) || ""} onChange={(e) => spread(c, e.target.value)} /></td>
              <td className="n bl">{last[c] ? money(last[c], false) : "—"}</td>
              <td><button className="icon-btn" title={`Remove ${ACC[c].name}`} onClick={() => drop(c)}><X size={13} /></button></td></tr>)}
            <tr className="bud-st"><td className="ba">Total {label.toLowerCase()}</td>{BUD_MONTHS.map((m, i) => <td key={m} className="n">{money(colSum(t, i), false)}</td>)}
              <td className="n bt">{money(R2(BUD_MONTHS.reduce((s, _, i) => s + colSum(t, i), 0)), false)}</td><td className="n bl" /><td /></tr></React.Fragment>; })}
          <tr className="bud-net"><td className="ba">Net profit</td>{BUD_MONTHS.map((m, i) => <td key={m} className={cx("n", netAt(i) < 0 && "neg")}>{money(netAt(i), false)}</td>)}
            <td className="n bt">{money(R2(BUD_MONTHS.reduce((s, _, i) => s + netAt(i), 0)), false)}</td><td className="n bl" /><td /></tr>
        </tbody></table></div>
      <div className="bud-add"><Select value={add} aria-label="Add an account to the budget" onChange={(e) => { const c = e.target.value; setAdd(""); if (c) setB((x) => ({ ...x, amounts: { ...x.amounts, [c]: Array(12).fill(0) } })); }}>
        <option value="">Add an income or expense account…</option>{free.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</Select></div>
    </Card>
  </div>;
}

/* ------------------------------------------------------ budget vs actual */
function BudgetReport({ state, books, p, setP, toast, go, param }) {
  const list = state.budgets || [];
  const [pick, setPick] = useState(() => (param && list.some((b) => b.id === param) ? param : (list.find((b) => +b.year === +TODAY.slice(0, 4)) || list[0] || {}).id));
  React.useEffect(() => { if (param && list.some((b) => b.id === param)) setPick(param); }, [param]);
  const b = list.find((x) => x.id === pick);
  if (!b) return <ReportFrame toast={toast} title="Budget vs actual" icon={PiggyBank} chips={[`${dmy(p.from)} – ${dmy(p.to)}`]}>
    <EmptyState icon={PiggyBank} title="No budget to compare yet">Create a budget under Accounting › Budgets; this report then shows how the year is going against it.</EmptyState>
    <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}><Btn kind="pri" icon={PiggyBank} onClick={() => go("budgets", "__new__")}>Create a budget</Btn></div></ReportFrame>;
  const r = budgetVsActual(b, books.flat, p.from, p.to), months = budgetByMonth(b, books.flat);
  const groups = [["income", "Revenue"], ["cogs", "Cost of sales"], ["expense", "Operating expenses"]];
  const pc = (v) => (v == null ? "—" : `${v.toFixed(0)}%`);
  const tone = (row) => (Math.abs(row.variance) < 0.005 ? "" : row.variance > 0 ? "pos" : "neg");
  const scope = b.cc ? ccLabel(b.cc) : "Whole company";
  return <div className="grid">
    <ReportFrame toast={toast} title="Budget vs actual" icon={PiggyBank} chips={[b.name, scope, r.empty ? "Outside the budget year" : `${dmy(r.from)} – ${dmy(r.to)}`, "AED"]}
      meta={`${b.name} · ${scope} · ${dmy(r.from)} to ${dmy(r.to)} · AED`}
      right={<><Field label="Budget"><Select value={pick} onChange={(e) => setPick(e.target.value)}>{list.map((x) => <option key={x.id} value={x.id}>{x.name}{x.cc ? " · " + ccName(x.cc) : ""}</option>)}</Select></Field>
        <PeriodBar p={p} setP={setP} nobranch /></>}>
      {r.empty ? <EmptyState icon={Calendar} title={`Pick a period in ${b.year}`}>This budget covers {b.year}; choose dates inside that year.</EmptyState> : <>
      <Insight tone={r.net.variance < 0 ? "warn" : ""}>Income is <b className={r.A.income >= r.B.income ? "pos" : "neg"}>{aed(r.A.income)}</b> against a budget of {aed(r.B.income)}
        {r.B.income ? ` (${((r.A.income / r.B.income) * 100).toFixed(0)}%)` : ""}; costs are {aed(R2(r.A.cogs + r.A.expense))} against {aed(R2(r.B.cogs + r.B.expense))}.
        Net profit {aed(r.net.actual)} — <b className={r.net.variance >= 0 ? "pos" : "neg"}>{r.net.variance >= 0 ? `${aed(r.net.variance)} better than budget` : `${aed(-r.net.variance)} behind budget`}</b>.</Insight>
      <div className="bva-kpis">{[["Income", r.B.income, r.A.income, true], ["Cost of sales", r.B.cogs, r.A.cogs, false], ["Operating expenses", r.B.expense, r.A.expense, false], ["Net profit", r.net.budget, r.net.actual, true]].map(([l, bu, ac, up]) => {
        const v = R2(up ? ac - bu : bu - ac), used = bu ? (ac / bu) * 100 : 0;
        return <div key={l} className={cx("bva-k", v < -0.004 ? "bad" : "good")}><small>{l}</small><b>{money(ac, false)}</b><span>budget {money(bu, false)}</span>
          <i><em style={{ width: `${Math.min(100, Math.max(0, used))}%` }} /></i><span className="bv">{v >= 0 ? "+" : "−"}{money(Math.abs(v), false)} {v >= 0 ? (up ? "ahead" : "under") : (up ? "behind" : "over")}</span></div>; })}</div>
      <VizCard title={`Net profit by month · ${b.year}`} sub="Budget and actual, AED" legend={[{ name: "Budget", color: "var(--s3)" }, { name: "Actual", color: "var(--s1)" }]}>
        <ColumnChart data={months.map((m) => ({ label: m.label, full: `${m.label} ${b.year}`, budget: m.budget, actual: m.actual || 0 }))}
          series={[{ key: "budget", name: "Budget", color: "var(--s3)" }, { key: "actual", name: "Actual", color: "var(--s1)" }]} ariaLabel="Budget and actual net profit by month" />
      </VizCard>
      <SectionTitle>Line by line</SectionTitle>
      <div className="tbl-wrap"><table className="tbl fin-tbl bva-tbl">
        <thead><tr><th>Account</th><th className="n">Budget</th><th className="n">Actual</th><th className="n">Variance</th><th className="n">Used</th><th style={{ width: 160 }} /></tr></thead>
        <tbody>{groups.map(([t, label]) => { const rows = r.rows.filter((x) => x.type === t); if (!rows.length) return null;
          const bu = r.B[t], ac = r.A[t], v = R2(t === "income" ? ac - bu : bu - ac);
          return <React.Fragment key={t}>{rows.map((x) => <tr key={x.acc.code} className="fin-acc"><td>{x.acc.code} {x.acc.name}</td><td className="n">{money(x.budget)}</td><td className="n">{money(x.actual)}</td>
            <td className={cx("n", tone(x))}>{money(x.variance)}</td><td className="n">{pc(x.used)}</td>
            <td><span className={cx("bva-bar", t !== "income" && x.used > 100 && "over", t === "income" && x.used != null && x.used < 100 && "under")}><i style={{ width: `${Math.min(100, Math.max(0, x.used || 0))}%` }} /></span></td></tr>)}
            <tr className="fin-sub"><td>Total {label.toLowerCase()}</td><td className="n">{money(bu)}</td><td className="n">{money(ac)}</td><td className={cx("n", v < -0.004 ? "neg" : v > 0.004 ? "pos" : "")}>{money(v)}</td><td className="n">{pc(bu ? (ac / bu) * 100 : null)}</td><td /></tr>
          </React.Fragment>; })}
          <tr className="fin-total"><td>Net profit</td><td className="n">{money(r.net.budget)}</td><td className="n">{money(r.net.actual)}</td><td className={cx("n", r.net.variance < 0 && "neg")}>{money(r.net.variance)}</td><td className="n">{pc(r.net.budget ? (r.net.actual / r.net.budget) * 100 : null)}</td><td /></tr>
        </tbody></table></div>
      <p className="br-note">Budget figures cover the chosen dates: a part month counts by its days. Variance is positive when it helps profit — more income than planned, or less cost.</p></>}
    </ReportFrame>
  </div>;
}

const COSTING_CSS = `
.cc-starters{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:0 22px 22px}
.cc-starters span{font-size:12px;color:var(--ink-3);margin-right:4px}.cc-starters.left{justify-content:flex-start;padding:16px 0 0}
.cc-starters button{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border-radius:999px;border:1px dashed color-mix(in srgb,var(--brand) 45%,var(--line));color:var(--brand);font-size:12.5px;font-weight:600;background:var(--surface)}
.cc-starters button:hover{background:var(--brand-50)}
.cc-grid,.bud-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.cc-card,.bud-card{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 18px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);overflow:hidden}
.cc-card::before,.bud-card::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--pri-a,var(--brand)),var(--sb-acc,#8B5CF6))}
.cc-card.off{opacity:.6}
.cc-card header,.bud-card header{display:flex;align-items:center;gap:11px}
.cc-code{min-width:44px;height:30px;padding:0 8px;border-radius:9px;display:grid;place-items:center;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--brand);background:var(--brand-50)}
.cc-t,.bud-t{flex:1;min-width:0;display:flex;flex-direction:column}.cc-t b,.bud-t b{font-size:14.5px;color:var(--ink)}.cc-t small,.bud-t small{font-size:12px;color:var(--ink-3)}
.cc-acts{display:flex;gap:2px}.cc-acts .icon-btn{width:30px;height:30px}
.cc-fig,.bud-fig{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.cc-fig small,.bud-fig small{display:block;font-size:11px;color:var(--ink-3)}.cc-fig b,.bud-fig b{font-size:15px;font-variant-numeric:tabular-nums;color:var(--ink)}
.cc-fig b.pos{color:var(--pos)}.cc-fig b.neg,.bud-fig b.neg{color:var(--neg)}
.cc-bars{display:flex;flex-direction:column;gap:4px}.cc-bars i{display:block;height:5px;border-radius:3px;background:var(--s1,var(--brand));min-width:2px}.cc-bars i.c{background:var(--s3,#F59E0B)}
.cc-note{margin:0;font-size:12px;color:var(--ink-3)}
.cc-tbl td.cc-acc{padding-left:22px;color:var(--ink-2)}
.bud-ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,var(--pri-a,var(--brand)),var(--pri-b,var(--brand)))}
.bud-meter{display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:12px;color:var(--ink-2)}
.bud-meter em{font-style:normal;font-weight:650;color:var(--ink);font-variant-numeric:tabular-nums}
.bud-meter i{grid-column:1 / -1;display:block;height:7px;border-radius:4px;background:var(--surface-3);overflow:hidden}
.bud-meter i b{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--pos),color-mix(in srgb,var(--pos) 60%,#fff))}
.bud-meter.over i b{background:linear-gradient(90deg,var(--neg),color-mix(in srgb,var(--neg) 60%,#fff))}
.bud-open{align-self:flex-start;display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:650;color:var(--brand);padding:4px 0}
.bud-from{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;margin-bottom:12px}
.bud-growth{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}.bud-growth .fld{width:200px}.bud-growth span{font-size:12px;color:var(--ink-3);padding-bottom:10px}
.bud-tools{display:flex;align-items:center;gap:8px}.bud-tools .inp{width:220px}
.bud-wrap{max-height:calc(100vh - 290px);overflow:auto}
.bud-tbl{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}
.bud-tbl th{position:sticky;top:0;z-index:2;background:var(--surface-2);font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);font-weight:650;padding:10px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
.bud-tbl td{padding:3px 4px;border-bottom:1px solid var(--line-2);white-space:nowrap;font-variant-numeric:tabular-nums}
.bud-tbl .ba{position:sticky;left:0;z-index:1;background:var(--surface);min-width:250px;max-width:280px;overflow:hidden;text-overflow:ellipsis;padding-left:16px;text-align:left}
.bud-tbl th.ba{z-index:3;background:var(--surface-2)}
.bud-tbl td .inp{width:84px;min-height:30px;height:30px;padding:0 7px;font-size:12.5px;border-radius:7px}
.bud-tbl td.bt .inp{width:100px;font-weight:650}.bud-tbl .bt{background:color-mix(in srgb,var(--brand) 5%,var(--surface))}
.bud-tbl .bl{color:var(--ink-3);padding-right:10px}
.bud-tbl tr.bud-gh td{background:var(--surface-2);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2);padding:9px 16px}
.bud-tbl tr.bud-st td{font-weight:650;color:var(--ink);padding:9px 8px;background:color-mix(in srgb,var(--surface-2) 60%,var(--surface))}
.bud-tbl tr.bud-st td.ba{background:color-mix(in srgb,var(--surface-2) 60%,var(--surface))}
.bud-tbl tr.bud-net td{font-weight:750;color:var(--ink);padding:11px 8px;border-top:2px solid var(--line);background:color-mix(in srgb,var(--brand) 6%,var(--surface))}
.bud-tbl tr.bud-net td.ba{background:color-mix(in srgb,var(--brand) 6%,var(--surface))}
.bud-tbl td.neg{color:var(--neg)}
.bud-add{padding:12px 16px;border-top:1px solid var(--line-2)}.bud-add .sel,.bud-add>*{max-width:380px}
.bva-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 22px}
.bva-k{position:relative;display:flex;flex-direction:column;gap:3px;padding:14px 16px;border-radius:16px;border:1px solid var(--line);background:var(--surface);overflow:hidden}
.bva-k::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--pos)}.bva-k.bad::before{background:var(--neg)}
.bva-k small{font-size:12px;color:var(--ink-3)}.bva-k b{font-size:21px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)}
.bva-k span{font-size:11.5px;color:var(--ink-3)}.bva-k .bv{font-weight:650;color:var(--pos)}.bva-k.bad .bv{color:var(--neg)}
.bva-k i{display:block;height:6px;border-radius:3px;background:var(--surface-3);overflow:hidden;margin:4px 0 2px}.bva-k i em{display:block;height:100%;background:var(--pos)}.bva-k.bad i em{background:var(--neg)}
.bva-bar{display:block;height:7px;border-radius:4px;background:var(--surface-3);overflow:hidden}.bva-bar i{display:block;height:100%;border-radius:4px;background:var(--s1,var(--brand))}
.bva-bar.over i{background:var(--neg)}.bva-bar.under i{background:#D97706}
@media(max-width:900px){.bva-kpis{grid-template-columns:1fr 1fr}.bud-tools .inp{width:150px}}
`;
