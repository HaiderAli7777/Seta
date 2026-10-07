/* ============================================================================
   CLARITY — plain-language summaries, payment status and the reports hub, so
   people who are not accountants can read their numbers at a glance.
   ========================================================================== */

const aed = (v) => "AED " + money(v, false);
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/* One sentence that explains a screen's numbers. */
const Insight = ({ children, tone }) => (
  <div className={cx("insight", tone)} role="note"><span className="insight-ico"><Lightbulb size={17} /></span><p>{children}</p></div>);

/* What a reader wants to know about an invoice or bill: is it paid? */
function docStatus(d, open, type) {
  if (type === "quote") return null;
  if (d.state !== "posted") return { label: "Draft", tone: "" };
  if (type !== "invoice" && type !== "bill") return { label: "Issued", tone: "info" };
  const total = amounts(d).total;
  if (open <= 0.004) return { label: "Paid", tone: "ok" };
  const late = daysBetween(d.due, TODAY);
  if (late > 0) return { label: `Overdue ${late} ${late === 1 ? "day" : "days"}`, tone: "bad" };
  if (open < total - 0.004) return { label: "Partly paid", tone: "gold" };
  if (late === 0) return { label: "Due today", tone: "gold" };
  return { label: `Due in ${-late} ${late === -1 ? "day" : "days"}`, tone: "info" };
}

function PlainSummary({ state, books, from, to, label }) {
  const P = pnl(books.flat, from, to);
  const ar = aging(state, "receivable", to), ap = aging(state, "payable", to);
  const overdue = (a) => R2(a.rows.reduce((s, r) => s + r.items.filter((i) => i.due < to).reduce((t, i) => t + i.open, 0), 0));
  if (!books.flat.length) return (
    <Insight>Nothing has been recorded yet. Start with the <b>Setup guide</b>: add your products and customers, enter opening balances, then create your first invoice — this space will then explain your numbers in plain words.</Insight>);
  return (
    <Insight tone={P.net < 0 ? "warn" : ""}>
      In {label}, you sold <b>{aed(P.revenue)}</b> and spent <b>{aed(P.cost + P.expense)}</b>, so you made a{" "}
      <b className={P.net >= 0 ? "pos" : "neg"}>{P.net >= 0 ? "profit" : "loss"} of {aed(Math.abs(P.net))}</b>
      {P.revenue ? ` — ${Math.abs(P.nm).toFixed(1)}% of sales` : ""}. Customers owe you <b>{aed(ar.grand)}</b>
      {overdue(ar) > 0.004 ? <> (<b className="neg">{aed(overdue(ar))} overdue</b>)</> : " (none overdue)"}, and you owe vendors <b>{aed(ap.grand)}</b>.
    </Insight>);
}

/* Each report card shows a live headline, so the hub itself answers questions. */
function ReportsHub({ state, books, go, allowed }) {
  const y0 = TODAY.slice(0, 4) + "-01-01";
  const P = pnl(books.flat, y0, TODAY), B = balanceSheet(books.flat, TODAY, y0);
  const ar = aging(state, "receivable", TODAY), ap = aging(state, "payable", TODAY);
  const late = (a) => R2(a.rows.reduce((s, r) => s + r.items.filter((i) => i.due < TODAY).reduce((t, i) => t + i.open, 0), 0));
  const stock = R2(Object.values(books.stock).reduce((s, x) => s + x.value, 0));
  const v = vat201(state, soq(TODAY), TODAY);
  const groups = [
    ["How is the business doing?", [
      ["r_pnl", BarChart3, "Profit & loss", "Sales minus costs — are you making money?", P.net >= 0 ? `Profit this year ${aed(P.net)}` : `Loss this year ${aed(-P.net)}`, P.net >= 0 ? "pos" : "neg"],
      ["r_prod", Package, "Profit by product", "Which products earn the most, and which barely pay.", null],
      ["r_cust", Users, "Profit by customer", "Your most and least valuable customers.", null]]],
    ["Who owes whom?", [
      ["r_aged_ar", Receipt, "Aged receivable", "Customers who owe you, and how late they are.", `${aed(ar.grand)} owed · ${aed(late(ar))} overdue`, late(ar) > 0.004 ? "neg" : ""],
      ["r_aged_ap", Receipt, "Aged payable", "Vendors you owe, by how soon payment is due.", `${aed(ap.grand)} to pay`, ""],
      ["r_stmt", Send, "Customer statement", "A statement to send a customer by PDF, email or WhatsApp.", null]]],
    ["What do you own and owe?", [
      ["r_bs", Scale, "Balance sheet", "Everything the business owns, owes, and is worth today.", `Net worth ${aed(B.totE)}`, ""],
      ["banking", Landmark, "Bank & cash", "Balances of every bank and cash account.", null],
      ["r_stock", Boxes, "Inventory valuation", "Stock on hand and what it cost.", `Stock value ${aed(stock)}`, ""]]],
    ["Tax", [
      ["r_vat", Building2, "VAT return — FTA 201", "The figures for your VAT return, box by box.", v.due >= 0 ? `This quarter so far: ${aed(v.due)} payable` : `This quarter so far: ${aed(-v.due)} refundable`, ""],
      ["fta", ShieldCheck, "FTA & e-invoicing", "Audit file and e-invoicing readiness.", null]]],
    ["For your accountant", [
      ["r_tb", CircleDot, "Trial balance", "Every account's debit and credit totals.", null],
      ["r_gl", BookOpen, "General ledger", "Every posting, account by account.", null],
      ["r_partner", Users, "Partner ledger", "Every posting with one customer or vendor.", null],
      ["r_method", Banknote, "Payments by method", "Money received and paid by bank, cash, cheque or card.", null],
      ["journal", BookOpen, "Journal entries", "All journals, including manual entries.", null]]],
  ];
  return (
    <div>
      <PageHead eyebrow="Reports" title="All reports" sub="Pick a question — every report opens for the current year and can be exported to PDF or Excel." />
      <PlainSummary state={state} books={books} from={y0} to={TODAY} label="this year" />
      {groups.map(([title, items]) => {
        const shown = items.filter(([k]) => allowed(k));
        if (!shown.length) return null;
        return (<section key={title} className="report-group"><h2>{title}</h2>
          <div className="report-grid">{shown.map(([k, I, t, s, head, tone]) => (
            <button key={k} className="report-card" onClick={() => go(k)}>
              <span className="rc-ico"><I size={19} /></span>
              <span className="rc-text"><b>{t}</b><small>{s}</small>{head && <em className={tone}>{head}</em>}</span>
              <ChevronRight size={16} className="rc-go" />
            </button>))}</div></section>);
      })}
    </div>);
}

const CLARITY_CSS = `
.insight{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;margin:0 0 20px;border-radius:14px;
  background:linear-gradient(90deg,var(--brand-50),var(--surface));border:1px solid var(--brand-100);color:var(--ink-2);font-size:13.5px;line-height:1.6}
.insight p{margin:0}.insight b{color:var(--ink);font-weight:600}.insight b.pos{color:var(--pos)}.insight b.neg{color:var(--neg)}
.insight.warn{background:linear-gradient(90deg,var(--warn-50),var(--surface));border-color:#ecd7ae}
.insight-ico{width:30px;height:30px;flex:0 0 30px;border-radius:9px;display:grid;place-items:center;background:var(--surface);color:var(--brand);border:1px solid var(--brand-100)}
.rframe .insight,.card .insight{margin:16px 22px 0}
.report-group{margin-bottom:26px}.report-group h2{font-size:13px;font-weight:650;color:var(--ink-2);margin:0 0 12px;letter-spacing:-.005em}
.report-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.report-card{display:flex;align-items:flex-start;gap:13px;text-align:left;padding:16px;border-radius:14px;border:1px solid var(--line);background:var(--surface);cursor:pointer;color:var(--ink-3);box-shadow:var(--sh-1);transition:border-color .15s,transform .15s,box-shadow .15s}
.report-card:hover{border-color:var(--brand);box-shadow:0 8px 24px #1B1A3D12;transform:translateY(-1px)}
.rc-ico{width:38px;height:38px;flex:0 0 38px;border-radius:11px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.rc-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.rc-text b{font-size:14px;color:var(--ink);font-weight:600}
.rc-text small{font-size:12.5px;line-height:1.45;color:var(--ink-3)}.rc-text em{font-style:normal;font-size:12.5px;font-weight:600;color:var(--ink);margin-top:6px}
.rc-text em.pos{color:var(--pos)}.rc-text em.neg{color:var(--neg)}.rc-go{color:var(--ink-4);margin-top:10px}
.status-pill{white-space:nowrap}
.total-cell small{display:block;font-size:10.5px;color:var(--ink-4);font-weight:400;margin-top:3px}
.addr-cell{max-width:260px}.addr-cell b{font-weight:500;color:var(--ink)}.addr-cell small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}
.chart-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center}.flow-empty{min-height:170px}
.av-t0{background:#2A17B518;color:#2A17B5}.av-t1{background:#1F45D618;color:#1F45D6}.av-t2{background:#A9741A18;color:#8E6114}
.av-t3{background:#6A4FB818;color:#5B42A8}.av-t4{background:#1F6C8A18;color:#1F6C8A}.av-t5{background:#A2452F18;color:#A2452F}
.mz[data-theme="dark"] .av-t0{background:#A9A3FF24;color:#C9C5FF}.mz[data-theme="dark"] .av-t1{background:#7F9BFF24;color:#A9BDFF}
.mz[data-theme="dark"] .av-t2{background:#E0B97724;color:#EBCB8E}.mz[data-theme="dark"] .av-t3{background:#B3A9FF24;color:#D2CBFF}
.mz[data-theme="dark"] .av-t4{background:#6CC3E024;color:#9ED6EA}.mz[data-theme="dark"] .av-t5{background:#F0917824;color:#F4AE9C}
@media (max-width:760px){
  .setup-progress .sp-text{flex:1 1 calc(100% - 72px)}.setup-progress .btn{width:100%;justify-content:center}
  .doc-list-tbl{display:block;min-width:0!important;width:100%}.doc-list-tbl tbody,.doc-list-tbl tfoot{display:block;width:100%}.doc-list-tbl tfoot tr{display:flex;justify-content:space-between;padding:12px 16px}
  .doc-list-tbl tbody tr.click td{background:transparent!important;box-shadow:none!important}
  .doc-list-tbl thead{display:none}.doc-list-tbl tfoot td:empty{display:none}
  .doc-list-tbl tbody tr.click{display:grid;grid-template-columns:1fr auto;grid-template-areas:"no status" "party party" "date total" "due bal";gap:4px 12px;padding:14px 16px;border-bottom:1px solid var(--line-2)}
  .doc-list-tbl tbody tr.click td{padding:0!important;border:0!important}
  .doc-list-tbl .c-no{grid-area:no;font-weight:600}.doc-list-tbl .c-status{grid-area:status;justify-self:end}
  .doc-list-tbl .c-party{grid-area:party;margin:4px 0}.doc-list-tbl .c-date{grid-area:date;font-size:12px}
  .doc-list-tbl .c-date:before{content:"Date ";color:var(--ink-4)}.doc-list-tbl .c-due{grid-area:due;font-size:12px}.doc-list-tbl .c-due:before{content:"Due ";color:var(--ink-4)}
  .doc-list-tbl .c-total{grid-area:total;text-align:right}.doc-list-tbl .c-bal{grid-area:bal;text-align:right;font-size:12px}.doc-list-tbl .c-bal:before{content:"Balance ";color:var(--ink-4);font-weight:400}
  .doc-list-tbl .ref-cell{display:none}}
/* Compact document entry — one row per line, like a ledger */
.line-grid input[type=number]{-moz-appearance:textfield}.line-grid input[type=number]::-webkit-inner-spin-button,.line-grid input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.line-grid-wrap{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow-x:auto;margin-bottom:14px;box-shadow:var(--sh-1)}
.line-grid{width:100%;border-collapse:collapse;font-size:13px;min-width:860px}
.line-grid th{font-size:10.5px;font-weight:600;letter-spacing:.02em;color:var(--ink-3);text-align:left;padding:9px 6px;background:var(--surface-2);border-bottom:1px solid var(--line);white-space:nowrap}
.line-grid td{padding:3px 6px;border-bottom:1px solid var(--line-2);vertical-align:top}
.line-grid tbody tr:hover td{background:var(--surface-2)}
.line-grid .inp{min-height:30px!important;height:30px;padding:4px 8px;font-size:13px;border-radius:7px;border-color:transparent;background:transparent;width:100%}
.line-grid tr:hover .inp,.line-grid .inp:focus{border-color:var(--line);background:var(--surface)}
.line-grid .inp:focus{border-color:var(--brand)}
.line-grid select.inp{padding-right:20px}
.line-grid .smart-picker .inp{border-color:var(--line);background:var(--surface);min-height:30px!important;height:30px}.line-grid .smart-picker>svg{top:8px}
.line-grid .smart-picker{min-width:0}
.lg-n{width:28px;color:var(--ink-4);font-size:11px;text-align:center!important;padding-top:10px!important}
.lg-p{min-width:250px;width:30%}.lg-d{min-width:150px;width:20%}.lg-q{width:76px}.lg-u{width:58px;color:var(--ink-3);font-size:12px;padding-top:12px!important}
.lg-pr{width:104px}.lg-di{width:66px}.lg-t{width:104px}.lg-a{width:150px}.lg-c{width:96px;text-align:right}.lg-am{width:112px;text-align:right}.lg-x{width:34px}
.line-grid th.lg-q,.line-grid th.lg-pr,.line-grid th.lg-di,.line-grid th.lg-am,.line-grid th.lg-c{text-align:right}
.lg-am{padding-top:8px!important}.lg-am b{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--ink)}.lg-am small,.lg-c small{display:block;font-size:10.5px;color:var(--ink-4);margin-top:1px}
.lg-c{padding-top:11px!important;font-family:var(--mono);font-size:12px}
.lg-meta{display:flex;align-items:center;gap:4px;font-size:10.5px;line-height:1.2;color:var(--ink-3);margin:1px 0 1px 4px}.lg-meta b{color:var(--pos);font-weight:600}.lg-meta b.neg{color:var(--neg)}
.lg-hist{border:0;background:none;color:var(--ink-4);cursor:pointer;padding:0 2px;display:inline-grid}.lg-hist:hover{color:var(--brand)}
.lg-ro{display:block;padding-top:7px;font-family:var(--mono);font-size:12px;color:var(--ink-3)}
.lg-x .icon-btn{width:28px;height:28px;margin-top:2px}
.lg-add td{border-bottom:0!important;padding:8px 6px!important}.lg-add button{display:inline-flex;align-items:center;gap:6px;border:0;background:none;color:var(--brand);font-weight:600;font-size:13px;cursor:pointer;padding:4px 2px}
.lg-add span{margin-left:14px;font-size:11.5px;color:var(--ink-4)}
/* Compact header: fields in a tight grid, less padding */
.doc-workspace>.card .card-h{padding:12px 18px}.doc-workspace>.card .card-h p{display:none}.doc-workspace>.card .card-b{padding:12px 18px 14px}
.doc-workspace .document-fields{gap:8px 14px!important}.doc-workspace .document-fields .inp,.doc-workspace .document-fields .readonly{min-height:34px!important}
.doc-workspace .document-fields .fld .lb{margin-bottom:4px}
.document-bottom{gap:16px!important}.document-bottom textarea{min-height:64px}
@media (max-width:760px){.line-grid{min-width:760px}}
.kpi-hint{display:block;font-size:11.5px;color:var(--ink-3);margin-top:2px}
`;

/* What one unit of a product costs right now, following the costing method chosen in Settings:
   weighted average, the oldest remaining purchase (FIFO) or the standard cost on the product. */
function currentCost(p, books) {
  if (!p) return 0;
  const st = books && books.stock[p.id], method = books && books.method;
  if (p.kind !== "goods" || method === "standard") return +p.cost || 0;
  if (st && st.qty > 0.0001) {
    if (method === "fifo" && st.layers && st.layers.length) return R2(st.layers[0].unit);
    return R2(st.value / st.qty);
  }
  return +p.lastPurchase || +p.cost || 0;
}
const COSTING_HELP = { avco: "Average of everything in stock", fifo: "Cost of the oldest stock still on hand", standard: "The fixed cost on the product" };

/* A dropdown whose last option creates a new record on the spot (salesperson, category, brand…). */
function CreatableSelect({ value, onChange, options, placeholder, createLabel, onCreate, disabled, ariaLabel, hint }) {
  const [ask, setAsk] = useState(false), [name, setName] = useState(''), [err, setErr] = useState('');
  const done = () => {
    const v = name.trim();
    if (v.length < 2) return setErr('Enter at least two characters.');
    if (options.some((o) => normSearch(o.label) === normSearch(v))) return setErr('That name already exists — pick it from the list.');
    const id = onCreate(v); onChange(id); setAsk(false);
  };
  return <>
    <Select value={value || ''} disabled={disabled} aria-label={ariaLabel}
      onChange={(e) => { if (e.target.value === '__new__') { setName(''); setErr(''); setAsk(true); } else onChange(e.target.value); }}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {!disabled && <option value="__new__">＋ {createLabel}…</option>}
    </Select>
    {ask && <StudioModal title={createLabel} sub={hint} close={() => setAsk(false)}>
      <Field label="Name"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } }} /></Field>
      {err && <div role="alert" className="form-error">{err}</div>}
      <footer className="modal-actions"><Btn onClick={() => setAsk(false)}>Cancel</Btn><Btn kind="pri" icon={Check} onClick={done}>Create &amp; select</Btn></footer>
    </StudioModal>}
  </>;
}
const salespersonOptions = (state) => (state.salespeople || []).filter((x) => x.active !== false).map((x) => ({ value: x.id, label: x.name }));
const addSalesperson = (setState) => (name) => { const rec = { id: uid('sales'), name, active: true }; setState((s) => ({ ...s, salespeople: [...(s.salespeople || []), rec] })); return rec.id; };
const brandOptions = (state) => [...new Set([...(state.brands || []), ...PRODUCTS.map((p) => p.brand)].filter(Boolean).map((b) => b.trim()))]
  .sort((a, b) => a.localeCompare(b)).map((b) => ({ value: b, label: b }));
const addBrand = (setState) => (name) => { setState((s) => ({ ...s, brands: [...new Set([...(s.brands || []), name])] })); return name; };
const addCategory = (setState, kind) => (name) => {
  const base = CATEGORIES.find((c) => c.id === (kind === 'goods' ? 'cat_goods' : 'cat_services')) || CATEGORIES[0] || { income: '4100', expense: '5100', inventory: '1300', adjustment: '6900' };
  const rec = { id: uid('cat'), name, income: base.income, expense: base.expense, inventory: base.inventory, adjustment: base.adjustment };
  CATEGORIES = [...CATEGORIES, rec];
  setState((s) => ({ ...s, categories: [...(s.categories || []), rec] })); return rec.id;
};

/* Product codes: automatic sequence (prefix + zero-padded number) or manual and optional. */
function nextProductCode(state, extra = []) {
  const st = (state && state.settings) || {}, prefix = st.codePrefix ?? 'P-', digits = st.codeDigits || 5;
  const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), re = new RegExp('^' + esc + '(\\d+)$', 'i');
  const n = [...PRODUCTS.map((p) => p.code), ...extra].reduce((m, c) => { const x = re.exec(c || ''); return x ? Math.max(m, +x[1]) : m; }, 0);
  return prefix + String(n + 1).padStart(digits, '0');
}
const autoCodes = (state) => ((state && state.settings && state.settings.productCodes) || 'auto') === 'auto';
const prodLabel = (p) => (p.code ? p.code + ' · ' : '') + p.name;
