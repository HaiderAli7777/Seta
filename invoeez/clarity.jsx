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
.av-t0{background:#31268218;color:#312682}.av-t1{background:#2D47A618;color:#2D47A6}.av-t2{background:#A9741A18;color:#8E6114}
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
.kpi-hint{display:block;font-size:11.5px;color:var(--ink-3);margin-top:2px}
`;
