/* ============================================================================
   STATEMENTS 3.9 — IFRS 18 presentation, account groups and drill-down.
   · Every income and expense account sits in an IFRS 18 category: operating,
     investing, financing or income taxes. The statement of profit or loss
     shows the required subtotals: operating profit, profit before financing
     and income taxes, and profit for the period.
   · Account groups are the company's own report structure — groups inside
     groups (Assets › Current assets › Cash and cash equivalents › Petty
     cash …). Statements follow the tree, every group shows its subtotal and
     folds open or shut.
   · Any amount opens the account's transactions for that column's period;
     a transaction opens its invoice or bill, or the journal entry.
   ========================================================================== */
const IFRS_CATS = [["operating", "Operating"], ["investing", "Investing"], ["financing", "Financing"], ["tax", "Income taxes"]];
const IFRS_HELP = {
  operating: "Income and expenses from the main business activities: sales, cost of sales and running costs.",
  investing: "Returns from investments and assets held separately from the main business, such as interest or dividends received.",
  financing: "Costs of raising finance, such as interest on loans and finance charges.",
  tax: "Corporate income tax charged on the profit for the period.",
};
const BS_SECTIONS = [["assets", "Assets"], ["equity", "Equity"], ["liabilities", "Liabilities"]];
const PL_SECTIONS = [["revenue", "Revenue"], ["cost_of_sales", "Cost of sales"], ["other_income", "Other operating income"], ["operating_expenses", "Operating expenses"],
  ["investing", "Investing income and expenses"], ["financing", "Finance costs and income"], ["income_tax", "Income tax expense"]];
const SECTION_LABEL = Object.fromEntries([...BS_SECTIONS, ...PL_SECTIONS]);
const SECTION_TYPES = { assets: ["bank", "receivable", "inventory", "casset", "fasset"], liabilities: ["payable", "cliab", "ncliab"], equity: ["equity"],
  revenue: ["income"], other_income: ["income"], cost_of_sales: ["cogs"], operating_expenses: ["expense"], investing: ["income", "expense"], financing: ["income", "expense"], income_tax: ["expense"] };

function defaultIfrs(a) {
  if (!a || !IS_PL(a.type)) return null;
  const n = (a.name || "").toLowerCase();
  if (/corporate tax|income tax|deferred tax/.test(n)) return "tax";
  if (a.type === "income" && /interest income|dividend|investment income|share of (profit|loss)/.test(n)) return "investing";
  if (a.type !== "income" && /interest|finance (charge|cost)|loan|borrowing cost/.test(n)) return "financing";
  return "operating";
}
const ifrsOf = (a, state) => (a && state && state.ifrs && state.ifrs[a.code]) || defaultIfrs(a);
function sectionOf(a, state) {
  if (!a) return null;
  const t = a.type;
  if (SECTION_TYPES.assets.includes(t)) return "assets";
  if (SECTION_TYPES.liabilities.includes(t)) return "liabilities";
  if (t === "equity") return "equity";
  const c = ifrsOf(a, state);
  if (c === "investing") return "investing";
  if (c === "financing") return "financing";
  if (c === "tax") return "income_tax";
  if (t === "cogs") return "cost_of_sales";
  if (t === "income") return /other income|gain|discount received|miscellaneous|sundry/i.test(a.name) ? "other_income" : "revenue";
  return "operating_expenses";
}

/* Suggested groups until the company builds its own: the usual IFRS line items. */
function seedGroups(state) {
  const used = new Set(), out = [];
  const acc = ACCOUNTS;
  const add = (id, name, section, parent, test) => {
    const accounts = test ? acc.filter((a) => sectionOf(a, state) === section && !used.has(a.code) && test(a)).map((a) => a.code) : [];
    accounts.forEach((c) => used.add(c)); out.push({ id, name, section, parent, accounts });
  };
  const nm = (re) => (a) => re.test(a.name);
  add("g_nca", "Non-current assets", "assets", null);
  add("g_ppe", "Property, plant and equipment", "assets", "g_nca", (a) => a.type === "fasset");
  add("g_ca", "Current assets", "assets", null);
  add("g_inv", "Inventories", "assets", "g_ca", (a) => a.type === "inventory");
  add("g_rec", "Trade and other receivables", "assets", "g_ca", (a) => a.type === "receivable" || (a.type === "casset" && /receivab|advance|deposit|prepaid|cheque/i.test(a.name)));
  add("g_oca", "Other current assets", "assets", "g_ca", (a) => a.type === "casset");
  add("g_cash", "Cash and cash equivalents", "assets", "g_ca", (a) => a.type === "bank");
  add("g_ncl", "Non-current liabilities", "liabilities", null);
  add("g_borr", "Borrowings", "liabilities", "g_ncl", (a) => a.type === "ncliab" && /loan|borrowing|facility/i.test(a.name));
  add("g_emp", "Employee benefit obligations", "liabilities", "g_ncl", (a) => a.type === "ncliab" && /gratuity|end-of-service|employee/i.test(a.name));
  add("g_ncl_o", "Other non-current liabilities", "liabilities", "g_ncl", (a) => a.type === "ncliab");
  add("g_cl", "Current liabilities", "liabilities", null);
  add("g_pay", "Trade and other payables", "liabilities", "g_cl", (a) => a.type === "payable" || (a.type === "cliab" && !/vat|tax/i.test(a.name)));
  add("g_taxl", "Tax liabilities", "liabilities", "g_cl", (a) => a.type === "cliab");
  add("g_staff", "Employee benefits", "operating_expenses", null, nm(/salar|wage|staff|gratuity|commission|incentive|visa|labour|medical|employee/i));
  add("g_prem", "Premises and utilities", "operating_expenses", null, nm(/rent|utilit|dewa|cooling|telecom|etisalat|internet/i));
  add("g_sell", "Selling and distribution", "operating_expenses", null, nm(/marketing|advertis|freight|customs|courier|postage|clearing/i));
  add("g_depr", "Depreciation and amortisation", "operating_expenses", null, nm(/depreciation|amortis/i));
  add("g_admin", "Administrative and other expenses", "operating_expenses", null, () => true);
  return out.filter((g) => g.accounts.length || out.some((x) => x.parent === g.id));
}
const groupsOf = (state) => (Array.isArray(state.accountGroups) ? state.accountGroups : seedGroups(state));

/* ----------------------------------------------------------------- values */
/* P&L: income positive, expenses negative, so every subtotal is the sum of the lines above it. */
function plValues(flat, cols) {
  return cols.map((c) => { const m = {}; flat.forEach((l) => { if (l.date >= c.from && l.date <= c.to && ACC[l.acc] && IS_PL(ACC[l.acc].type)) m[l.acc] = R2((m[l.acc] || 0) + l.credit - l.debit); }); return m; });
}
/* Financial position: assets as debit balances, liabilities and equity as credit balances; the year's result split out. */
function bsValues(flat, cols) {
  return cols.map((c) => {
    const m = {}, fy = c.asOf.slice(0, 4) + "-01-01"; let cy = 0, py = 0;
    flat.forEach((l) => { if (l.date > c.asOf || !ACC[l.acc]) return; const a = ACC[l.acc];
      if (IS_PL(a.type)) { if (l.date < fy) py = R2(py + l.credit - l.debit); else cy = R2(cy + l.credit - l.debit); return; }
      const v = SECTION_TYPES.assets.includes(a.type) ? l.debit - l.credit : l.credit - l.debit; m[l.acc] = R2((m[l.acc] || 0) + v); });
    m.__py = py; m.__cy = cy; return m;
  });
}
const sumVals = (nodes, n) => Array.from({ length: n }, (_, i) => R2(nodes.reduce((s, x) => s + (x.values[i] || 0), 0)));
const isZero = (vals) => vals.every((v) => Math.abs(v) < 0.005);

function sectionTree(section, state, groups, vals, n, goodUp = true) {
  const gs = groups.filter((g) => g.section === section);
  const owner = new Map(); gs.forEach((g) => g.accounts.forEach((c) => owner.set(c, g.id)));
  const accs = ACCOUNTS.filter((a) => sectionOf(a, state) === section);
  const accNode = (a) => ({ kind: "account", id: "a" + a.code, acc: a, label: a.name, code: a.code, values: vals.map((m) => m[a.code] || 0), goodUp });
  const groupNode = (g, seen) => {
    if (seen.has(g.id)) return null; seen.add(g.id);
    const kids = [...gs.filter((x) => x.parent === g.id).map((x) => groupNode(x, seen)).filter(Boolean), ...accs.filter((a) => owner.get(a.code) === g.id).map(accNode)]
      .filter((k) => k.kind === "group" ? k.children.length : !isZero(k.values));
    return { kind: "group", id: g.id, label: g.name, children: kids, values: sumVals(kids, n), goodUp };
  };
  const seen = new Set();
  const roots = gs.filter((g) => !g.parent || !gs.some((x) => x.id === g.parent)).map((g) => groupNode(g, seen)).filter((g) => g && g.children.length);
  const loose = accs.filter((a) => !owner.has(a.code)).map(accNode).filter((k) => !isZero(k.values));
  return [...roots, ...loose];
}

/* Statement of profit or loss by IFRS 18 category. */
function plStatement(books, state, cols) {
  const n = cols.length, vals = plValues(books.flat, cols), groups = groupsOf(state);
  const sec = (key, label) => { const children = sectionTree(key, state, groups, vals, n); return { kind: "section", id: "s_" + key, key, label, children, values: sumVals(children, n), goodUp: true }; };
  const rev = sec("revenue", "Revenue"), cos = sec("cost_of_sales", "Cost of sales"), oth = sec("other_income", "Other operating income"),
    opx = sec("operating_expenses", "Operating expenses"), inv = sec("investing", "Investing income and expenses"),
    fin = sec("financing", "Finance costs and income"), tax = sec("income_tax", "Income tax expense");
  const add = (...xs) => Array.from({ length: n }, (_, i) => R2(xs.reduce((s, x) => s + x.values[i], 0)));
  const sub = (id, label, values, help, kind = "subtotal") => ({ kind, id, label, values, help, goodUp: true });
  const gross = sub("t_gross", "Gross profit", add(rev, cos), "Revenue less the cost of what was sold.");
  const op = sub("t_op", "Operating profit", add(rev, cos, oth, opx), "IFRS 18 required subtotal: everything from the main business activities, before investing, financing and tax.");
  const pbfit = sub("t_pbfit", "Profit before financing and income taxes", add(rev, cos, oth, opx, inv), "IFRS 18 required subtotal: operating profit plus the investing category.");
  const pbt = sub("t_pbt", "Profit before income tax", add(rev, cos, oth, opx, inv, fin), "Profit after finance costs, before corporate tax.");
  const net = sub("t_net", "Profit for the period", add(rev, cos, oth, opx, inv, fin, tax), "IFRS 18 required total: the result of all categories.", "total");
  if (net.values[0] < 0) net.label = "Loss for the period";
  const keep = (s) => s.children.length > 0;
  const rows = [{ kind: "category", id: "c_op", label: "Operating", help: IFRS_HELP.operating }];
  rows.push(rev);
  if (keep(cos)) { rows.push(cos); rows.push(gross); }
  if (keep(oth)) rows.push(oth);
  if (keep(opx)) rows.push(opx);
  rows.push(op);
  rows.push({ kind: "category", id: "c_inv", label: "Investing", help: IFRS_HELP.investing });
  if (keep(inv)) rows.push(inv); else rows.push({ kind: "note", id: "n_inv", label: "No investing income or expenses in these periods" });
  rows.push(pbfit);
  rows.push({ kind: "category", id: "c_fin", label: "Financing", help: IFRS_HELP.financing });
  if (keep(fin)) rows.push(fin); else rows.push({ kind: "note", id: "n_fin", label: "No finance costs or income in these periods" });
  if (keep(tax)) { rows.push(pbt); rows.push({ kind: "category", id: "c_tax", label: "Income taxes", help: IFRS_HELP.tax }); rows.push(tax); }
  rows.push(net);
  return { rows, revenue: rev.values, op: op.values, net: net.values, gross: gross.values, vals, sections: { rev, cos, oth, opx, inv, fin, tax } };
}

/* Statement of financial position following the account groups. */
function bsStatement(books, state, cols) {
  const n = cols.length, vals = bsValues(books.flat, cols), groups = groupsOf(state);
  const a = sectionTree("assets", state, groups, vals, n, true), l = sectionTree("liabilities", state, groups, vals, n, false);
  const e = sectionTree("equity", state, groups, vals, n, true);
  const py = vals.map((m) => m.__py), cy = vals.map((m) => m.__cy);
  if (!isZero(py)) e.push({ kind: "account", id: "a_py", label: "Retained results of earlier years", values: py, goodUp: true, computed: true });
  e.push({ kind: "account", id: "a_cy", label: "Profit or loss for the current year", values: cy, goodUp: true, computed: true });
  const ta = sumVals(a, n), tl = sumVals(l, n), te = sumVals(e, n);
  const rows = [
    { kind: "heading", id: "h_a", label: "Assets" }, ...a, { kind: "subtotal", id: "t_a", label: "Total assets", values: ta, goodUp: true },
    { kind: "heading", id: "h_e", label: "Equity" }, ...e, { kind: "subtotal", id: "t_e", label: "Total equity", values: te, goodUp: true },
    { kind: "heading", id: "h_l", label: "Liabilities" }, ...l, { kind: "subtotal", id: "t_l", label: "Total liabilities", values: tl, goodUp: false },
    { kind: "total", id: "t_el", label: "Total equity and liabilities", values: Array.from({ length: n }, (_, i) => R2(te[i] + tl[i])), goodUp: true },
  ];
  return { rows, ta, tl, te, diff: ta.map((v, i) => R2(v - te[i] - tl[i])) };
}

/* Column headings: a whole month reads "Sep 2026", a whole year "FY 2025". */
function colTitle(from, to) {
  if (from === to) return dmy(from);
  const m = (s) => MONTHS[+s.slice(5, 7) - 1] + " " + s.slice(0, 4);
  if (from === som(from) && to === eom(to) && from.slice(0, 7) === to.slice(0, 7)) return m(from);
  if (from.endsWith("-01-01") && to.endsWith("-12-31") && from.slice(0, 4) === to.slice(0, 4)) return "FY " + from.slice(0, 4);
  if (from === som(from) && from.slice(0, 7) === to.slice(0, 7)) return `${m(from)} (1–${+to.slice(8)})`;
  if (from.endsWith("-01-01") && from.slice(0, 4) === to.slice(0, 4)) return `YTD ${dmy(to).slice(0, 6)} ${to.slice(0, 4)}`;
  return `${dmy(from).slice(0, 6)} – ${dmy(to)}`;
}
/* The current period plus up to N earlier ones the books cover, newest first unless asked otherwise. */
function statementCols(books, p, asOf) {
  const nWant = Math.max(1, Math.min(12, +p.cmpN || 1)), start = books.flat.reduce((m, l) => (l.date < m ? l.date : m), "9999-12-31");
  const base = asOf ? { key: "c0", asOf: p.asOf, title: `${dmy(p.asOf)}`, sub: "As at" } : { key: "c0", from: p.from, to: p.to, title: colTitle(p.from, p.to), sub: span(p.from, p.to) };
  const out = [base]; let dropped = 0;
  const mode = asOf ? p.bsCmp || "ye" : p.cmp || "prev";
  if (mode !== "off") {
    let prev = asOf ? { ...p } : { preset: p.preset, from: p.from, to: p.to, cmpFrom: p.cmpFrom, cmpTo: p.cmpTo, cmpAsOf: p.cmpAsOf };
    const n = mode === "custom" ? 1 : nWant;
    for (let i = 0; i < n; i++) {
      const c = asOf ? cmpAsOf(prev, mode) : cmpRange(prev, mode);
      if (!c) break;
      if (start === "9999-12-31" || c.to < start) dropped++;
      else out.push(asOf ? { key: "c" + (i + 1), asOf: c.asOf, title: dmy(c.asOf), sub: "As at" } : { key: "c" + (i + 1), from: c.from, to: c.to, title: colTitle(c.from, c.to), sub: c.dates });
      prev = asOf ? { ...prev, asOf: c.asOf } : { preset: p.preset, from: c.from, to: c.to };
    }
  }
  return { cols: (p.cmpOrder === "asc" ? out.slice().reverse() : out), dropped, cur: base };
}

/* ------------------------------------------------------------ the table */
function FinTable({ cols, rows, onDrill, pctBase, asOf, caption }) {
  const [shut, setShut] = useState({});
  const ci = cols.findIndex((c) => c.key === "c0"), cj = cols.length === 2 ? 1 - ci : -1;
  const change = cols.length === 2;
  const toggle = (id) => setShut((s) => ({ ...s, [id]: !s[id] }));
  const all = (open) => { const m = {}; const walk = (xs) => xs.forEach((x) => { if (x.children) { m[x.id] = !open; walk(x.children); } }); walk(rows); setShut(m); };
  const out = [];
  const valCells = (x, drill) => cols.map((c, i) => {
    const v = x.values[i];
    return <td key={c.key} className={cx("n", c.key !== "c0" && "cmp-prev", c.key === "c0" && cols.length > 1 && "cmp-cur")}>
      {drill ? <button className="fin-v" onClick={() => drill(i)} title={`Open the transactions behind ${money(v, false)}`}>{money(v)}</button> : money(v)}</td>; });
  const chgCells = (x) => { if (!change) return null; const c = chg(x.values[ci], x.values[cj], x.goodUp !== false), t = c.good === true ? "up" : c.good === false ? "down" : "";
    return <><td className={cx("n cmp-d", t)}>{dText(c)}</td><td className={cx("n cmp-p", t)}>{c.dir !== 0 && <i aria-hidden="true">{c.dir > 0 ? "▲" : "▼"}</i>}{pctText(c, x.values[ci])}</td></>; };
  const pctCell = (x) => pctBase ? <td className="n muted fin-pct">{Math.abs(pctBase[0]) > 0.004 ? (((x.kind === "subtotal" || x.kind === "total" ? x.values[0] : Math.abs(x.values[0])) / Math.abs(pctBase[0])) * 100).toFixed(1) + "%" : "—"}</td> : null;
  const walk = (xs, depth) => xs.forEach((x) => {
    if (x.kind === "category") { out.push(<tr key={x.id} className="fin-cat"><td colSpan={1 + cols.length + (change ? 3 : 0) + (pctBase ? 1 : 0)}><span>{x.label}</span>{x.help && <small>{x.help}</small>}</td></tr>); return; }
    if (x.kind === "heading") { out.push(<tr key={x.id} className="fin-head"><td colSpan={1 + cols.length + (change ? 3 : 0) + (pctBase ? 1 : 0)}>{x.label}</td></tr>); return; }
    if (x.kind === "note") { out.push(<tr key={x.id} className="fin-note"><td colSpan={1 + cols.length + (change ? 3 : 0) + (pctBase ? 1 : 0)}>{x.label}</td></tr>); return; }
    if (x.kind === "subtotal" || x.kind === "total") {
      out.push(<tr key={x.id} className={cx("fin-sub", x.kind === "total" && "fin-total")}><td><span className="fin-lbl" title={x.help}>{x.label}{x.help && <Info size={12} className="fin-i" />}</span></td>{valCells(x)}{pctCell(x)}{chgCells(x)}</tr>); return; }
    if (x.kind === "account") {
      const drill = x.acc && onDrill ? (i) => onDrill(x.acc, cols[i]) : null;
      out.push(<tr key={x.id} className="fin-acc" style={{ "--d": depth }}><td>
        {drill ? <button className="fin-name" onClick={() => drill(ci)}><span className="mono">{x.code}</span>{x.label}<ArrowUpRight size={12} className="fin-go" /></button>
          : <span className="fin-name static">{x.code && <span className="mono">{x.code}</span>}{x.label}</span>}</td>
        {valCells(x, drill)}{pctCell(x)}{chgCells(x)}</tr>); return; }
    const open = !shut[x.id];
    out.push(<tr key={x.id} className={cx("fin-grp", x.kind === "section" && "fin-sec", !open && "shut")} style={{ "--d": depth }}>
      <td><button className="fin-tog" onClick={() => toggle(x.id)} aria-expanded={open}><ChevronRight size={13} className="cv" />{x.label}
        {!open && <span className="fin-cnt">{x.children.length}</span>}</button></td>{valCells(x)}{pctCell(x)}{chgCells(x)}</tr>);
    if (open) walk(x.children, depth + 1);
  });
  walk(rows, 0);
  return <div className="fin-wrap">
    <div className="fin-tools noprint"><button onClick={() => all(true)}>Expand all</button><button onClick={() => all(false)}>Collapse all</button>
      {onDrill && <span><ArrowUpRight size={12} /> Click any account or amount to see its transactions</span>}</div>
    <div className="tbl-wrap fin-scroll"><table className={cx("tbl fin-tbl cmp-tbl", cols.length > 3 && "many")} aria-label={caption}>
      <thead><tr><th>{asOf ? "Line item / account" : "Line item / account"}</th>
        {cols.map((c) => <th key={c.key} className={cx("n", c.key !== "c0" && "cmp-prev", c.key === "c0" && cols.length > 1 && "cmp-cur")}>{c.title} <span className="th-d">{c.sub}</span></th>)}
        {pctBase && <th className="n fin-pct" style={{ width: 74 }}>% rev.</th>}
        {change && <><th className="n">Change <span className="th-d">AED</span></th><th className="n" style={{ width: 92 }}>Change <span className="th-d">%</span></th></>}</tr></thead>
      <tbody>{out}</tbody>
    </table></div></div>;
}

/* IFRS 18 notes under the statement of profit or loss. */
function IfrsNotes({ st, cols }) {
  const S = st.sections, n = cols.length;
  const pick = (re, secs) => { const v = Array(n).fill(0); secs.forEach((s) => { const walk = (xs) => xs.forEach((x) => { if (x.kind === "account" && re.test(x.label)) x.values.forEach((y, i) => (v[i] = R2(v[i] - y))); if (x.children) walk(x.children); }); walk(s.children); }); return v; };
  const dep = pick(/depreciation|amortis/i, [S.opx, S.cos]);
  const staff = pick(/salar|wage|staff|gratuity|commission|incentive|employee|medical|visa|labour/i, [S.opx, S.cos]);
  const write = pick(/stock adjust|shrinkage|write.?down|obsolete/i, [S.opx, S.cos]);
  const bad = pick(/bad debt|impairment|expected credit/i, [S.opx]);
  const ebitda = st.op.map((v, i) => R2(v + dep[i]));
  const head = <tr><th>Item</th>{cols.map((c) => <th key={c.key} className="n">{c.title}</th>)}</tr>;
  const row = (label, v, cls) => <tr className={cls}><td>{label}</td>{v.map((x, i) => <td key={i} className="n">{money(x)}</td>)}</tr>;
  return <div className="ifrs-notes">
    <div className="ifrs-note-card"><h4><span>A</span>How this statement is organised</h4>
      <p>Under IFRS 18 every income and expense line sits in a category. <b>Operating</b> covers the main business; <b>investing</b> covers returns on investments held apart from it; <b>financing</b> covers the cost of borrowing; <b>income taxes</b> covers corporate tax. Three subtotals are required: <b>operating profit</b>, <b>profit before financing and income taxes</b>, and <b>profit for the period</b>. You choose each account's category in Account groups.</p></div>
    <div className="ifrs-note-card"><h4><span>B</span>Management-defined performance measure — EBITDA</h4>
      <p>EBITDA is not defined by IFRS. It is shown here because management uses it to judge operating performance, and it is reconciled to operating profit.</p>
      <div className="tbl-wrap"><table className="tbl ifrs-tbl"><thead>{head}</thead><tbody>
        {row("Operating profit (IFRS 18 subtotal)", st.op)}{row("Add back: depreciation and amortisation", dep)}{row("EBITDA", ebitda, "fin-sub")}</tbody></table></div></div>
    <div className="ifrs-note-card"><h4><span>C</span>Specified expenses by nature</h4>
      <p>Amounts included in the lines above.</p>
      <div className="tbl-wrap"><table className="tbl ifrs-tbl"><thead>{head}</thead><tbody>
        {row("Employee benefits", staff)}{row("Depreciation and amortisation", dep)}{row("Inventory write-downs and stock adjustments", write)}{row("Impairment of receivables (bad debts)", bad)}</tbody></table></div></div>
  </div>;
}

/* ------------------------------------------------------- journal entry view */
function EntryModal({ entry, close, drill }) {
  const lines = entry.lines || [], d = R2(lines.reduce((s, l) => s + l.debit, 0)), c = R2(lines.reduce((s, l) => s + l.credit, 0));
  const src = { doc: "Document", payment: "Receipt or payment", manual: "Journal entry", pdc: "Post-dated cheque", stock: "Stock adjustment" }[entry.source] || "Entry";
  const open = entry.source === "doc" && entry.docId ? () => { close(); drill(LIST_OF[entry.docType], entry.docId, entry.number); }
    : entry.source === "payment" ? () => { close(); drill("payments", null, "Receipts & payments"); }
    : entry.source === "pdc" ? () => { close(); drill("pdc", null, "Post-dated cheques"); }
    : entry.source === "manual" ? () => { close(); drill("journal", null, "Journal entries"); }
    : entry.source === "stock" ? () => { close(); drill("stock_count", null, "Stock counts"); } : null;
  return <StudioModal wide title={entry.number} sub={`${src} · ${dmy(entry.date)} · ${entry.journal || ""}${entry.ref ? " · " + entry.ref : ""}`} close={close}>
    <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Account</th><th>Label</th><th className="n">Debit</th><th className="n">Credit</th></tr></thead>
      <tbody>{lines.map((l, i) => <tr key={i}><td><span className="mono muted">{l.acc}</span> {ACC[l.acc] ? ACC[l.acc].name : ""}</td><td className="muted">{l.label}{l.partner && PMAP[l.partner] ? ` — ${PMAP[l.partner].name}` : ""}</td>
        <td className="n">{l.debit ? money(l.debit) : ""}</td><td className="n">{l.credit ? money(l.credit) : ""}</td></tr>)}</tbody>
      <tfoot><tr><td colSpan={2}>Totals {Math.abs(d - c) < 0.01 ? "· balanced" : ""}</td><td className="n">{money(d)}</td><td className="n">{money(c)}</td></tr></tfoot></table></div>
    <footer className="modal-actions"><Btn onClick={close}>Close</Btn>{open && <Btn kind="pri" icon={ArrowUpRight} onClick={open}>{entry.source === "doc" ? `Open ${entry.number}` : `Go to ${{ payment: "receipts & payments", pdc: "post-dated cheques", manual: "journal entries", stock: "stock adjustments" }[entry.source]}`}</Btn>}</footer>
  </StudioModal>;
}

/* ------------------------------------------------------- account groups */
function AccountGroupsScreen({ state, setState, books, toast, go }) {
  const [tab, setTab] = useState("bs"), [shut, setShut] = useState({}), [ed, setEd] = useState(null), [pick, setPick] = useState(null), [nacc, setNacc] = useState(null);
  const groups = groupsOf(state), custom = Array.isArray(state.accountGroups);
  const save = (next, msg) => { setState((s) => ({ ...s, accountGroups: next })); if (msg) toast(msg); };
  const bal = useMemo(() => { const m = {}; books.flat.forEach((l) => { if (!ACC[l.acc]) return; const a = ACC[l.acc];
    if (IS_PL(a.type)) { if (l.date >= TODAY.slice(0, 4) + "-01-01" && l.date <= TODAY) m[l.acc] = R2((m[l.acc] || 0) + (a.type === "income" ? l.credit - l.debit : l.debit - l.credit)); }
    else m[l.acc] = R2((m[l.acc] || 0) + (SECTION_TYPES.assets.includes(a.type) ? l.debit - l.credit : l.credit - l.debit)); }); return m; }, [books]);
  const sections = tab === "bs" ? BS_SECTIONS : PL_SECTIONS;
  const kids = (sec, parent) => groups.filter((g) => g.section === sec && (g.parent || null) === parent);
  const owner = new Map(); groups.forEach((g) => g.accounts.forEach((c) => owner.set(c, g.id)));
  const accsOf = (sec) => ACCOUNTS.filter((a) => sectionOf(a, state) === sec);
  const total = (g) => R2(g.accounts.reduce((s, c) => s + (bal[c] || 0), 0) + groups.filter((x) => x.parent === g.id).reduce((s, x) => s + total(x), 0));
  const descendants = (id) => { const out = [id]; groups.filter((x) => x.parent === id).forEach((x) => out.push(...descendants(x.id))); return out; };
  const indentOpts = (sec, skip) => { const out = []; const walk = (parent, d) => kids(sec, parent).forEach((g) => { if (skip && skip.includes(g.id)) return; out.push({ id: g.id, label: "  ".repeat(d * 2) + g.name }); walk(g.id, d + 1); }); walk(null, 0); return out; };
  const moveAcc = (code, gid) => save(groups.map((g) => ({ ...g, accounts: g.id === gid ? [...g.accounts.filter((c) => c !== code), code] : g.accounts.filter((c) => c !== code) })),
    gid ? `${code} moved to ${groups.find((g) => g.id === gid).name}` : `${code} is no longer in a group`);
  const reorder = (g, dir) => { const sib = groups.filter((x) => x.section === g.section && (x.parent || null) === (g.parent || null)); const i = sib.findIndex((x) => x.id === g.id), j = i + dir;
    if (j < 0 || j >= sib.length) return; const a = groups.indexOf(sib[i]), b = groups.indexOf(sib[j]); const next = groups.slice(); [next[a], next[b]] = [next[b], next[a]]; save(next); };
  const remove = (g) => { if (!window.confirm(`Delete the group “${g.name}”? Its accounts and sub-groups move up one level.`)) return;
    save(groups.filter((x) => x.id !== g.id).map((x) => x.parent === g.id ? { ...x, parent: g.parent || null } : x.id === g.parent ? { ...x, accounts: [...x.accounts, ...g.accounts] } : x), `Group “${g.name}” deleted`); };
  const saveEd = () => { const name = ed.name.trim(); if (!name) return;
    if (ed.id) save(groups.map((g) => (g.id === ed.id ? { ...g, name, parent: ed.parent || null } : g)), `Group renamed to “${name}”`);
    else save([...groups, { id: uid("grp"), name, section: ed.section, parent: ed.parent || null, accounts: [] }], `Group “${name}” added`);
    setEd(null); };
  const setCat = (code, cat) => { setState((s) => ({ ...s, ifrs: { ...(s.ifrs || {}), [code]: cat }, accountGroups: groups.map((g) => ({ ...g, accounts: g.accounts.filter((c) => c !== code) })) }));
    toast(`${code} now in the ${IFRS_CATS.find((x) => x[0] === cat)[1].toLowerCase()} category`); };
  const createAcc = () => { const code = nacc.code.trim(), name = nacc.name.trim();
    if (!/^\d{3,6}$/.test(code) || ACC[code] || name.length < 2) return;
    setState((s) => ({ ...s, accounts: [...(s.accounts || []), { id: code, code, name, type: nacc.type, custom: true }],
      ...(nacc.cat ? { ifrs: { ...(s.ifrs || {}), [code]: nacc.cat } } : {}),
      accountGroups: groupsOf(s).map((g) => (g.id === nacc.group ? { ...g, accounts: [...g.accounts, code] } : g)) }));
    toast(`Account ${code} ${name} created in ${groups.find((g) => g.id === nacc.group).name}`); setNacc(null); };
  const accRow = (a, depth, sec) => <div key={a.code} className="agp-row acc" style={{ "--d": depth }}>
    <span className="agp-name"><span className="mono">{a.code}</span>{a.name}</span>
    {tab === "pl" && <select className="agp-sel cat" aria-label={`IFRS 18 category of ${a.code}`} value={ifrsOf(a, state)} onChange={(e) => setCat(a.code, e.target.value)}>
      {IFRS_CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
    <select className="agp-sel" aria-label={`Group of ${a.code}`} value={owner.get(a.code) || ""} onChange={(e) => moveAcc(a.code, e.target.value || null)}>
      <option value="">— Not in a group —</option>{indentOpts(sec).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
    <b className="agp-bal">{money(bal[a.code] || 0, false)}</b></div>;
  const groupRow = (g, depth, sec) => { const open = !shut[g.id], sub = kids(sec, g.id), accs = accsOf(sec).filter((a) => owner.get(a.code) === g.id);
    return <div key={g.id} className="agp-group">
      <div className={cx("agp-row grp", depth === 0 && "top")} style={{ "--d": depth }}>
        <button className="agp-tog" onClick={() => setShut((s) => ({ ...s, [g.id]: !s[g.id] }))} aria-expanded={open}><ChevronRight size={14} className="cv" /><b>{g.name}</b>
          <span className="agp-meta">{accs.length} account{accs.length === 1 ? "" : "s"}{sub.length ? ` · ${sub.length} sub-group${sub.length === 1 ? "" : "s"}` : ""}</span></button>
        <span className="agp-acts">
          <button title="Add a sub-group" onClick={() => setEd({ section: sec, parent: g.id, name: "" })}><Plus size={14} />Sub-group</button>
          <button title="Choose accounts for this group" onClick={() => setPick({ group: g.id, sec, sel: new Set(accs.map((a) => a.code)) })}><ListChecks size={14} />Accounts</button>
          <button title="Create a new account in this group" onClick={() => setNacc({ group: g.id, sec, code: "", name: "", type: SECTION_TYPES[sec][0], cat: ["investing", "financing"].includes(sec) ? sec : sec === "income_tax" ? "tax" : null })}><BookPlus size={14} />New account</button>
          <button title="Rename or move" onClick={() => setEd({ id: g.id, section: sec, parent: g.parent || "", name: g.name })}><Pencil size={13} /></button>
          <button title="Move up" onClick={() => reorder(g, -1)}><ChevronUp size={14} /></button>
          <button title="Move down" onClick={() => reorder(g, 1)}><ChevronDown size={14} /></button>
          <button title="Delete group" className="del" onClick={() => remove(g)}><Trash2 size={13} /></button></span>
        <b className="agp-bal">{money(total(g), false)}</b></div>
      {open && <>{sub.map((x) => groupRow(x, depth + 1, sec))}{accs.map((a) => accRow(a, depth + 1, sec))}
        {!sub.length && !accs.length && <div className="agp-empty" style={{ "--d": depth + 1 }}>Empty — add accounts or a sub-group.</div>}</>}
    </div>; };
  return <div>
    <PageHead eyebrow="Accounts master" title="Account groups" sub="Build the structure of your reports. Groups can hold accounts and other groups — for example Assets › Current assets › Cash and cash equivalents › Petty cash and Head office cash. The balance sheet and profit or loss follow this tree.">
      {custom && <Btn onClick={() => { if (window.confirm("Go back to the suggested groups? Your own groups will be removed.")) { setState((s) => { const x = { ...s }; delete x.accountGroups; return x; }); toast("Suggested groups restored", "warn"); } }}>Reset to suggested</Btn>}
      <Btn icon={BarChart3} onClick={() => go(tab === "bs" ? "r_bs" : "r_pnl")}>Open {tab === "bs" ? "balance sheet" : "profit or loss"}</Btn>
    </PageHead>
    <div className="agp-tabs seg"><button className={tab === "bs" ? "on" : ""} onClick={() => setTab("bs")}>Statement of financial position</button><button className={tab === "pl" ? "on" : ""} onClick={() => setTab("pl")}>Statement of profit or loss</button></div>
    {!custom && <div className="agp-tip"><Lightbulb size={16} /><span>These are suggested groups based on IFRS line items. Change anything — the first edit saves them as your own.</span></div>}
    {tab === "pl" && <div className="agp-tip"><Info size={16} /><span>IFRS 18: pick each account's category — <b>Operating</b>, <b>Investing</b>, <b>Financing</b> or <b>Income taxes</b>. Changing the category moves the account to that part of the statement.</span></div>}
    {sections.map(([sec, label]) => { const loose = accsOf(sec).filter((a) => !owner.has(a.code) || !groups.some((g) => g.id === owner.get(a.code)));
      const tot = R2(accsOf(sec).reduce((s, a) => s + (bal[a.code] || 0), 0));
      return <Card key={sec} className="agp-card" title={label} sub={`${accsOf(sec).length} accounts · ${tab === "bs" ? "as at " + dmy(TODAY) : "year to date"} AED ${money(tot, false)}`}
        right={<Btn size="sm" icon={Plus} onClick={() => setEd({ section: sec, parent: "", name: "" })}>Add group</Btn>} pad={false}>
        <div className="agp-tree">{kids(sec, null).map((g) => groupRow(g, 0, sec))}
          {loose.length > 0 && <div className="agp-loose"><div className="agp-loose-h">Not in a group <span>{loose.length}</span></div>{loose.map((a) => accRow(a, 0, sec))}</div>}
          {!kids(sec, null).length && !loose.length && <div className="agp-empty" style={{ "--d": 0 }}>No accounts in this part of the statement.</div>}</div>
      </Card>; })}
    {ed && <StudioModal title={ed.id ? "Edit group" : "New group"} sub={SECTION_LABEL[ed.section]} close={() => setEd(null)}>
      <div className="studio-form"><Field label="Group name"><Input autoFocus value={ed.name} placeholder="e.g. Cash and cash equivalents" onChange={(e) => setEd({ ...ed, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") saveEd(); }} /></Field>
        <Field label="Inside"><select className="inp" value={ed.parent || ""} onChange={(e) => setEd({ ...ed, parent: e.target.value })}>
          <option value="">{SECTION_LABEL[ed.section]} (top level)</option>{indentOpts(ed.section, ed.id ? descendants(ed.id) : null).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field></div>
      <footer className="modal-actions"><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!ed.name.trim()} onClick={saveEd}>{ed.id ? "Save" : "Add group"}</Btn></footer>
    </StudioModal>}
    {pick && <StudioModal title={`Accounts in ${groups.find((g) => g.id === pick.group).name}`} sub="Tick the accounts that belong in this group. An account sits in one group at a time." close={() => setPick(null)}>
      <div className="agp-pick">{accsOf(pick.sec).map((a) => { const on = pick.sel.has(a.code), other = owner.get(a.code) && owner.get(a.code) !== pick.group ? groups.find((g) => g.id === owner.get(a.code)) : null;
        return <label key={a.code} className={cx("agp-pick-row", on && "on")}><input type="checkbox" checked={on} onChange={() => { const s = new Set(pick.sel); on ? s.delete(a.code) : s.add(a.code); setPick({ ...pick, sel: s }); }} />
          <span className="mono">{a.code}</span><span className="nm">{a.name}{other && <small>now in {other.name}</small>}</span><b>{money(bal[a.code] || 0, false)}</b></label>; })}</div>
      <footer className="modal-actions"><Btn onClick={() => setPick(null)}>Cancel</Btn><Btn kind="pri" icon={Check} onClick={() => {
        save(groups.map((g) => g.id === pick.group ? { ...g, accounts: accsOf(pick.sec).filter((a) => pick.sel.has(a.code)).map((a) => a.code) } : { ...g, accounts: g.accounts.filter((c) => !pick.sel.has(c)) }), `${pick.sel.size} account${pick.sel.size === 1 ? "" : "s"} in ${groups.find((g) => g.id === pick.group).name}`); setPick(null); }}>Save accounts</Btn></footer>
    </StudioModal>}
    {nacc && <StudioModal title="New account" sub={`In ${groups.find((g) => g.id === nacc.group).name}`} close={() => setNacc(null)}>
      <div className="studio-form">
        <Field label="Code"><Input autoFocus value={nacc.code} placeholder="e.g. 1115" onChange={(e) => setNacc({ ...nacc, code: e.target.value.replace(/\D/g, "") })} />
          {ACC[nacc.code.trim()] && <div className="form-error">Code {nacc.code} is already used by {ACC[nacc.code.trim()].name}</div>}</Field>
        <Field label="Account name"><Input value={nacc.name} placeholder="e.g. Petty cash — Head office" onChange={(e) => setNacc({ ...nacc, name: e.target.value })} /></Field>
        {SECTION_TYPES[nacc.sec].length > 1 && <Field label="Account type"><select className="inp" value={nacc.type} onChange={(e) => setNacc({ ...nacc, type: e.target.value })}>
          {SECTION_TYPES[nacc.sec].map((t) => <option key={t} value={t}>{AT[t].label}</option>)}</select></Field>}</div>
      <footer className="modal-actions"><Btn onClick={() => setNacc(null)}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!/^\d{3,6}$/.test(nacc.code.trim()) || !!ACC[nacc.code.trim()] || nacc.name.trim().length < 2} onClick={createAcc}>Create account</Btn></footer>
    </StudioModal>}
  </div>;
}

const IFRS_CSS = `
/* 3.9 tighter pages and forms */
.mz .page-head{padding-top:16px;padding-bottom:12px;margin-bottom:6px}
.mz .doc-head{padding-top:8px;padding-bottom:10px;margin-bottom:4px}
.mz .doc-head .doc-back{height:28px;padding:0 8px;margin:0 0 2px -8px;font-size:12.5px}
.mz .doc-head .micro{margin-top:0}
.mz .doc-workspace{gap:12px}
.mz .document-toolbar{margin-top:0}
.mz .document-dock{padding:8px 14px}
.mz .document-dock>span{font-size:12px}

/* drill trail */
.drill-trail{position:sticky;top:0;z-index:7;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:10px 0 0;padding:7px 10px;border-radius:12px;background:color-mix(in srgb,var(--brand-50) 85%,var(--surface));border:1px solid var(--brand-100);font-size:12.5px;box-shadow:0 6px 18px rgba(19,26,43,.06)}
.drill-trail .back{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:8px;background:var(--surface);border:1px solid var(--line);font-weight:600;color:var(--ink)}
.drill-trail .crumb{color:var(--brand-600);font-weight:600;padding:3px 6px;border-radius:6px}.drill-trail .crumb:hover{background:var(--surface)}
.drill-trail .sep{color:var(--ink-4)}.drill-trail .here{color:var(--ink-2);font-weight:600}
.drill-trail+.page-head,.drill-trail+.view>.page-head{padding-top:10px}

/* statement table */
.fin-wrap{margin-top:2px}
.fin-tools{display:flex;align-items:center;gap:6px;padding:10px 24px 6px;font-size:12px;color:var(--ink-3)}
.fin-tools button{height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);font-weight:600;color:var(--ink-2)}
.fin-tools button:hover{border-color:var(--brand-100);color:var(--brand-600)}
.fin-tools span{margin-left:auto;display:inline-flex;align-items:center;gap:5px}
.mz .tbl.fin-tbl td{padding-top:7px;padding-bottom:7px}
.mz .tbl.fin-tbl td:first-child{padding-left:calc(18px + var(--d,0) * 20px)}
.fin-tog{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--ink);text-align:left}
.fin-tog .cv{color:var(--ink-4);transform:rotate(90deg);transition:transform .15s}
.fin-grp.shut .fin-tog .cv{transform:none}
.fin-cnt{font-size:10.5px;font-weight:600;color:var(--ink-4);background:var(--surface-3);padding:0 6px;border-radius:10px}
.mz .tbl.fin-tbl tr.fin-sec td{background:var(--surface-2);font-weight:700}
.mz .tbl.fin-tbl tr.fin-sec .fin-tog{font-size:13.5px}
.mz .tbl.fin-tbl tr.fin-grp:not(.fin-sec) td{font-weight:600}
.fin-name{display:inline-flex;align-items:center;gap:8px;text-align:left;color:var(--ink-2)}
.fin-name .mono{font-size:11px;color:var(--ink-4);min-width:34px}
.fin-name:not(.static):hover{color:var(--brand)}
.fin-go{opacity:0;color:var(--brand);transition:opacity .15s}
.fin-acc:hover .fin-go{opacity:1}
.fin-v{font:inherit;color:inherit;border-radius:5px;padding:1px 4px;margin:-1px -4px}
.fin-v:hover{background:var(--brand-50);color:var(--brand-600);text-decoration:underline;text-underline-offset:2px}
.mz .tbl.fin-tbl tr.fin-cat td{padding-top:16px;padding-bottom:6px;padding-left:18px;background:transparent;border-bottom:1px solid var(--line-2)}
.fin-cat span{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--brand-600)}
.fin-cat small{display:block;font-size:11.5px;color:var(--ink-4);margin-top:2px;text-transform:none;letter-spacing:0;font-weight:400}
.mz .tbl.fin-tbl tr.fin-head td{padding-top:16px;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-600);box-shadow:inset 3px 0 0 var(--brand)}
.mz .tbl.fin-tbl tr.fin-note td{font-size:12px;color:var(--ink-4);font-style:italic}
.mz .tbl.fin-tbl tr.fin-sub td{font-weight:700;border-top:1.5px solid var(--ink-4);background:color-mix(in srgb,var(--brand-50) 55%,var(--surface))}
.mz .tbl.fin-tbl tr.fin-total td{font-size:14px;border-top:2px solid var(--ink-2);border-bottom:3px double var(--ink-3);background:color-mix(in srgb,var(--brand-50) 80%,var(--surface))}
.fin-lbl{display:inline-flex;align-items:center;gap:6px}.fin-i{color:var(--ink-4)}
.fin-scroll{overflow-x:auto}
.mz .tbl.fin-tbl td:first-child,.mz .tbl.fin-tbl th:first-child{min-width:260px}
.mz .tbl.fin-tbl.many td,.mz .tbl.fin-tbl.many th{padding-left:10px;padding-right:10px;font-size:12px;white-space:nowrap}
.mz .tbl.fin-tbl.many td:first-child,.mz .tbl.fin-tbl.many th:first-child{position:sticky;left:0;z-index:1;background:var(--surface);max-width:300px;overflow:hidden;text-overflow:ellipsis;box-shadow:1px 0 0 var(--line-2)}
.mz .tbl.fin-tbl.many td:first-child{padding-left:calc(14px + var(--d,0) * 16px)}
.mz .tbl.fin-tbl.many tr.fin-sec td:first-child{background:var(--surface-2)}
.mz .tbl.fin-tbl.many tr.fin-sub td:first-child{background:color-mix(in srgb,var(--brand-50) 55%,var(--surface))}
.mz .tbl.fin-tbl.many tr.fin-cat td:first-child,.mz .tbl.fin-tbl.many tr.fin-head td:first-child,.mz .tbl.fin-tbl.many tr.fin-note td:first-child{position:static;max-width:none;box-shadow:none;background:transparent}
.mz .tbl.fin-tbl.many .fin-name,.mz .tbl.fin-tbl.many .fin-tog{white-space:nowrap}
.ifrs-notes{display:grid;gap:12px;padding:6px 24px 22px}
.ifrs-note-card{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--surface)}
.ifrs-note-card h4{display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:650;color:var(--ink)}
.ifrs-note-card h4 span{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff;background:linear-gradient(140deg,var(--pri-a),var(--pri-b))}
.ifrs-note-card p{font-size:12.5px;color:var(--ink-3);line-height:1.55;margin:6px 0 8px}
.ifrs-note-card .tbl-wrap{border:1px solid var(--line-2);border-radius:10px}
.ifrs-badge{display:inline-flex;align-items:center;gap:5px}
.gl-row{cursor:pointer}.gl-row td:first-child{white-space:nowrap}
.mz .tbl.gl-tbl tbody tr.gl-row:hover td{background:var(--brand-50)}
.gl-row:focus-visible{outline:2px solid var(--brand);outline-offset:-2px}
.gl-doc{display:inline-flex;align-items:center;gap:6px;color:var(--brand-600);font-weight:600;white-space:nowrap}
.gl-doc .mono{font-size:12.5px}
.gl-pt{display:block;font-weight:600;color:var(--ink);font-size:12.5px}
.fin-foot{padding:8px 24px 4px;font-size:12px;color:var(--ink-3)}

/* account groups */
.agp-tabs{margin:0 0 12px}
.agp-tip{display:flex;gap:9px;align-items:flex-start;margin:0 0 12px;padding:10px 14px;border-radius:12px;background:var(--brand-50);border:1px solid var(--brand-100);font-size:12.5px;color:var(--ink-2);line-height:1.5}
.agp-tip svg{color:var(--brand);flex:0 0 auto;margin-top:1px}
.agp-card{margin-bottom:14px}
.agp-tree{padding:6px 8px 10px}
.agp-row{display:flex;align-items:center;gap:8px;min-height:38px;padding:4px 10px 4px calc(10px + var(--d,0) * 22px);border-radius:10px}
.agp-row:hover{background:var(--surface-2)}
.agp-row.grp.top{margin-top:4px}
.agp-tog{display:inline-flex;align-items:center;gap:7px;flex:1;min-width:0;text-align:left;color:var(--ink)}
.agp-tog .cv{color:var(--ink-4);transform:rotate(90deg);transition:transform .15s}
.agp-tog[aria-expanded="false"] .cv{transform:none}
.agp-tog b{font-size:13px;font-weight:650}
.agp-meta{font-size:11.5px;color:var(--ink-4);white-space:nowrap}
.agp-acts{display:flex;gap:2px;opacity:.35;transition:opacity .15s}
.agp-row:hover .agp-acts,.agp-row:focus-within .agp-acts{opacity:1}
.agp-acts button{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 8px;border-radius:8px;font-size:11.5px;font-weight:600;color:var(--ink-3)}
.agp-acts button:hover{background:var(--surface);color:var(--brand);box-shadow:0 0 0 1px var(--line)}
.agp-acts button.del:hover{color:var(--neg)}
.agp-bal{width:120px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums;color:var(--ink-2)}
.agp-row.acc .agp-name{flex:1;min-width:0;display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.agp-row.acc .agp-name .mono{font-size:11px;color:var(--ink-4);min-width:36px}
.agp-sel{height:30px;max-width:220px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink-2);font-size:12px;padding:0 8px}
.agp-sel.cat{max-width:130px;color:var(--brand-600);font-weight:600}
.agp-empty{padding:6px 10px 8px calc(34px + var(--d,0) * 22px);font-size:12px;color:var(--ink-4);font-style:italic}
.agp-loose{margin-top:8px;border-top:1px dashed var(--line);padding-top:6px}
.agp-loose-h{padding:6px 10px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--warn)}
.agp-loose-h span{margin-left:6px;padding:1px 7px;border-radius:10px;background:var(--warn-50)}
.agp-pick{display:grid;gap:4px;max-height:52vh;overflow:auto}
.agp-pick-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);cursor:pointer}
.agp-pick-row.on{border-color:var(--brand-100);background:var(--brand-50)}
.agp-pick-row .mono{font-size:11.5px;color:var(--ink-4)}
.agp-pick-row .nm{flex:1;font-size:12.5px}.agp-pick-row .nm small{display:block;font-size:11px;color:var(--warn)}
.agp-pick-row b{font-size:12px;font-variant-numeric:tabular-nums}
@media (max-width:760px){.mz .tbl.fin-tbl td:first-child,.mz .tbl.fin-tbl th:first-child{min-width:140px;max-width:180px}.mz .tbl.fin-tbl td,.mz .tbl.fin-tbl th{padding-left:8px;padding-right:8px;font-size:12px}.mz .tbl.fin-tbl td:first-child{padding-left:calc(8px + var(--d,0) * 10px)}.fin-name .mono{display:none}.fin-pct{display:none}
  .agp-acts{opacity:1;flex-wrap:wrap}.agp-row{flex-wrap:wrap}.agp-bal{width:auto}.agp-sel{max-width:100%}.fin-tools span{display:none}.ifrs-notes{padding:6px 12px 16px}}
@media print{.fin-tools,.drill-trail{display:none}.mz .tbl.fin-tbl tr.fin-sub td,.mz .tbl.fin-tbl tr.fin-total td,.mz .tbl.fin-tbl tr.fin-sec td{background:none}}
`;
