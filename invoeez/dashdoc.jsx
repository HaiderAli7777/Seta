/* ============================================================================
   3.24 — the dashboard laid out like a document. It reads top to bottom the
   way an invoice does: a header with the period, its status and the bottom
   line (net profit) where an invoice shows its total; a progress line through
   the period with the actions beside it; the key figures as labelled fields;
   tabs over the detail; then a plain-words summary beside a profit-and-loss
   totals panel, and a bar that stays at the foot of the screen.
   ========================================================================== */

const qOf = (d) => Math.floor((+d.slice(5, 7) - 1) / 3) + 1;
const monthOf = (d, style = "long") => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { month: style, timeZone: "UTC" });

/* "October 2026", "Q4 2026", "2026 so far", "Last 12 months" or the dates. */
function periodTitle(range) {
  const { preset: p, from: f, to: t } = range, y = f.slice(0, 4);
  const named = { today: "Today", yesterday: "Yesterday", d7: "Last 7 days", d30: "Last 30 days", d365: "Last 12 months" }[p];
  if (named) return named;
  if (p === "mtd") return `${monthOf(f)} ${y}`;
  if (p === "qtd") return `Q${qOf(f)} ${y}`;
  if (p === "ytd") return `${y} so far`;
  if (p === "fy") return `Full year ${y}`;
  if (f === som(f) && t === eom(f)) return `${monthOf(f)} ${y}`;
  if (f === soq(f) && t === eoq(f)) return `Q${qOf(f)} ${y}`;
  if (f.slice(5) === "01-01" && t === y + "-12-31") return `Year ${y}`;
  return f === t ? dmy(f) : `${dmy(f)} – ${dmy(t)}`;
}

/* The parts a period is made of — quarters of a year, months of a quarter, weeks of a month — each done, under way or still to come.
   The kind follows the period chosen, so on 22 October "this quarter" still shows October, November and December. */
function periodSteps(range) {
  const { preset: p, from: f, to: t } = range, y = f.slice(0, 4), ref = t < TODAY ? t : TODAY;
  const kind = ["ytd", "fy"].includes(p) ? "year" : ["qtd", "lastq"].includes(p) ? "quarter" : ["mtd", "lastm"].includes(p) ? "month"
    : p !== "custom" ? null
    : f.slice(5) === "01-01" && t.slice(0, 4) === y && daysBetween(f, t) > 92 ? "year"
    : f === soq(f) && t <= eoq(f) && (t === eoq(f) || t === TODAY) && daysBetween(f, t) > 31 ? "quarter"
    : f === som(f) && t <= eom(f) && (t === eom(f) || t === TODAY) && daysBetween(f, t) > 6 ? "month" : null;
  let parts = null;
  if (kind === "year") parts = [1, 2, 3, 4].map((q) => { const s = `${y}-${String((q - 1) * 3 + 1).padStart(2, "0")}-01`; return { label: `Q${q}`, from: s, to: eoq(s), cur: "qtd" }; });
  else if (kind === "quarter") parts = [0, 1, 2].map((m) => { const s = addMonths(f, m); return { label: monthOf(s, "short"), from: s, to: eom(s), cur: "mtd" }; });
  else if (kind === "month") { parts = []; for (let s = f; s <= eom(f); s = addDays(s, 7)) { const e = addDays(s, 6) < eom(f) ? addDays(s, 6) : eom(f); parts.push({ label: `${+s.slice(8)}–${+e.slice(8)}`, from: s, to: e }); } }
  if (!parts) return null;
  return parts.map((x) => {
    const st = ref >= x.to ? "done" : ref >= x.from ? "now" : "todo";
    /* The part under way today is the same as "this quarter" / "this month"; earlier parts are shown in full. */
    const pick = st === "now" && x.cur && x.from <= TODAY && TODAY <= x.to ? { preset: x.cur, from: x.from, to: TODAY } : { preset: "custom", from: x.from, to: x.to < TODAY ? x.to : TODAY };
    return { ...x, st, pick, pct: st === "now" ? Math.round(((daysBetween(x.from, ref) + 1) / (daysBetween(x.from, x.to) + 1)) * 100) : st === "done" ? 100 : 0 };
  });
}

/* Header and progress bar — the dashboard's "document header". */
function DashDocHead({ user, company, range, setRange, P, prior, comparable, drafts, low, balanced, go, newDoc, canAdd = () => true, bars = [] }) {
  const [more, setMore] = useState(false);
  const d = comparable && Math.abs(prior.net) > 0.004 ? ((P.net - prior.net) / Math.abs(prior.net)) * 100 : null;
  const dayName = new Date(TODAY + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const yr = TODAY.slice(0, 4), elapsed = daysBetween(yr + "-01-01", range.to) + 1, yearDays = daysBetween(yr + "-01-01", yr + "-12-31") + 1;
  const pace = range.preset === "ytd" && P.revenue > 0.004 && elapsed >= 30 ? (P.revenue / elapsed) * yearDays : null;
  const branch = LOCK_BRANCH || range.branch, steps = periodSteps(range);
  const setPreset = (key) => { const [f, t] = PRESETS.find((x) => x[0] === key)[2](); setRange({ ...range, preset: key, from: f, to: t }); };
  const quick = [["invoices", "New invoice", FileText, () => newDoc("invoice")], ["bills", "New vendor bill", ShoppingCart, () => newDoc("bill")],
    ["payments", "Receive a payment", ArrowDownLeft, () => go("payments")], ["stock_count", "Count stock", Boxes, () => go("stock_count")]].filter(([k]) => canAdd(k));
  const extra = quick.filter(([k]) => k !== "invoices");
  return <div className="ds-top">
    <header className="ds-head">
      <div className="ds-deco" aria-hidden="true"><i className="g1" /><i className="g2" /><i className="gr" /></div>
      <div className="ds-id">
        <div className="ds-crumb"><span className="ds-live"><i />Live</span><span className="micro">Company dashboard · {company.name}{branch && BR[branch] ? " · " + BR[branch].name : ""}</span></div>
        <h1><span className="ds-title">{periodTitle(range)}</span>
          <span className={cx("ds-state", balanced ? "ok" : "warn")} title={balanced ? "Every journal balances" : "Some entries do not balance — see the trial balance"}><i />{balanced ? "Books balanced" : "Books need review"}</span></h1>
        <div className="ds-sub">
          <span><Sun size={14} /><span>{greeting()}, <b>{(user.name || "there").split(" ")[0]}</b></span></span>
          <span><Calendar size={14} /><span>{dayName}, <b>{dmy(TODAY)}</b></span></span>
          {drafts > 0 && <button className="ds-chip" onClick={() => go("invoices", "__f:draft")}><span><b>{drafts}</b> {drafts === 1 ? "draft" : "drafts"} to post</span></button>}
          {low > 0 && <button className="ds-chip" onClick={() => go("products", "__low_stock__")}><span><b>{low}</b> low on stock</span></button>}
          {pace != null && <span className="ds-chip pace" title="Sales so far this year, carried to the year end at the same daily rate"><TrendingUp size={13} /><span>On pace for <b>AED {short(pace)}</b> in {yr}</span></span>}
        </div>
      </div>
      <div className="ds-amt">
        <small>{P.net < 0 ? "Net loss" : "Net profit"} · AED</small>
        <b className="ds-net"><CountUp value={P.net} /></b>
        <span>{P.revenue ? `${P.nm.toFixed(1)}% of sales` : "No sales yet"}
          {d != null && <em className={d >= 0 ? "up" : "down"} title="Compared with the same length of time just before">{d >= 0 ? "▲" : "▼"} {Math.abs(d) >= 1000 ? ">999" : Math.abs(d).toFixed(1)}%</em>}</span>
        {bars.length > 1 && <NetBars bars={bars} />}
      </div>
    </header>
    <div className="ds-bar">
      <div className="ds-prog">{steps
        ? <ol className="du-steps ds-steps" aria-label="Progress through the period">{steps.map((s, i) => <li key={s.label} className={s.st}>
            <button onClick={() => setRange({ ...range, ...s.pick })} disabled={s.st === "todo"}
              title={s.st === "todo" ? "Still to come" : `Show ${s.label}${s.st === "now" ? ` · ${s.pct}% through` : ""}`}>
              <i>{s.st === "done" ? <Check size={11} strokeWidth={3} /> : i + 1}</i>{s.label}{s.st === "now" && <em>{s.pct}%</em>}</button></li>)}</ol>
        : <span className="ds-span"><Calendar size={14} /><span>{dmy(range.from)} – {dmy(range.to)} · {daysBetween(range.from, range.to) + 1} days</span></span>}</div>
      <div className="ds-acts">
        <div className="seg ds-seg" aria-label="Dashboard period">{[["mtd", "Month"], ["qtd", "Quarter"], ["ytd", "Year"], ["d365", "12 months"]].map(([key, l]) =>
          <button key={key} className={range.preset === key ? "on" : ""} onClick={() => setPreset(key)}>{l}</button>)}</div>
        <RangePicker value={range} onChange={(r) => setRange({ ...range, ...r })} />
        <BranchPick value={range.branch} onChange={(b) => setRange({ ...range, branch: b })} />
        <div className="ds-more">
          <Btn icon={MoreHorizontal} aria-haspopup="menu" aria-expanded={more} onClick={() => setMore((v) => !v)}>More</Btn>
          {more && <><div className="pop-scrim" onMouseDown={() => setMore(false)} />
            <div className="du-menu ds-menu" role="menu">
              {extra.map(([k, l, I, f]) => <button key={k} role="menuitem" onClick={() => { setMore(false); f(); }}><I size={15} /><span><b>{l}</b></span></button>)}
              {extra.length > 0 && <div className="du-sep" />}
              <button role="menuitem" onClick={() => { setMore(false); go("reports"); }}><BarChart3 size={15} /><span><b>All reports</b></span></button>
              <button role="menuitem" onClick={() => { setMore(false); setTimeout(() => window.print(), 60); }}><Printer size={15} /><span><b>Print the dashboard</b></span></button>
            </div></>}
        </div>
        {quick.some(([k]) => k === "invoices") && <Btn kind="pri" icon={Plus} onClick={() => newDoc("invoice")}>New invoice</Btn>}
      </div>
    </div>
  </div>;
}

/* Net profit period by period, as small white columns under the bottom line (losses hang below the line). */
function NetBars({ bars }) {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.v))), neg = bars.some((b) => b.v < 0);
  return <div className={cx("ds-bars", neg && "has-neg")} role="img" aria-label={"Net profit by period: " + bars.map((b) => `${b.l} ${money(b.v, false)}`).join(", ")}>
    {bars.map((b, i) => <span key={i} title={`${b.l}: ${money(b.v, false)}`} className={b.v < 0 ? "neg" : ""} style={{ "--h": Math.max(4, (Math.abs(b.v) / max) * 100) + "%", "--i": i }} />)}</div>;
}

/* A key figure as a labelled field: label above, the value in a box, a note below — like the fields of a document. */
function DashField({ label, value, sub, delta, goodUp = true, spark, color = "var(--s1)", tone, meter, meterTone, onClick, cls, icon: I }) {
  const dir = delta == null ? 0 : delta > 0.05 ? 1 : delta < -0.05 ? -1 : 0, good = dir === 0 ? null : (dir > 0) === goodUp;
  return <button className={cx("ds-field", tone, cls)} onClick={onClick}>
    <span className="ds-fl">{I && <I size={13} />}{label}</span>
    <span className="ds-box">
      <span className="ds-row">
        <span className="ds-val"><small>AED</small><CountUp value={value} /></span>
        {delta != null && <em className={cx("ds-delta", good === true && "up", good === false && "down")} title="Compared with the previous period">
          {dir > 0 ? "▲" : dir < 0 ? "▼" : "•"} {Math.abs(delta) >= 1000 ? ">999" : Math.abs(delta).toFixed(1)}%</em>}
      </span>
      {spark && spark.length > 1 ? <span className="ds-trend"><MiniSpark data={spark} color={color} w={240} h={22} /></span>
        : meter != null ? <span className={cx("ds-meter", meterTone)}><i style={{ width: Math.max(0, Math.min(100, meter)) + "%" }} /></span> : <span className="ds-trend none" />}
    </span>
    <span className="ds-hint">{sub}</span>
  </button>;
}

/* The period's results set out like the totals of an invoice. */
function DashTotals({ P, invoices, go }) {
  const row = (k, sub, v, cls) => <div className={cx("sumrow", cls)}><span className="k">{k}{sub && <small>{sub}</small>}</span><span className="v">{v}</span></div>;
  return <div className="sumbox tot-card ds-totals">
    <div className="ds-tot-h"><b>Profit & loss</b><span>for the period</span></div>
    {row("Sales", `${invoices} ${invoices === 1 ? "invoice" : "invoices"} issued · after returns`, money(P.revenue, false))}
    {row("Cost of sales", "what the goods sold cost you", "−" + money(P.cost, false), "cost-data")}
    {row("Gross profit", `${P.gm.toFixed(1)}% margin`, money(P.gross, false), "tot-net cost-data")}
    {row("Operating expenses", "rent, salaries and other running costs", "−" + money(P.expense, false))}
    <div className={cx("sumrow total", P.net < 0 && "loss")}><span className="k">{P.net < 0 ? "Net loss" : "Net profit"} · AED</span><span className="v"><TweenNum value={P.net} /></span></div>
    <button className="tot-add ds-pnl" onClick={() => go("r_pnl")}>Open the profit & loss statement <ArrowUpRight size={14} /></button>
  </div>;
}

/* Period by period, like the lines of a document. */
function DashLines({ series, P, gran, go }) {
  const [all, setAll] = useState(false);
  const rows = series.map((x, i) => ({ ...x, n: i + 1 })), shown = all || rows.length <= 12 ? rows : rows.slice(-12);
  const title = { day: "Day by day", week: "Week by week", month: "Month by month" }[gran] || "By period";
  const pc = (a, b) => (Math.abs(b) > 0.004 ? ((a / b) * 100).toFixed(1) + "%" : "—");
  return <Card className="ds-lines-card" title={title} sub={rows.length > shown.length ? `The latest ${shown.length} of ${rows.length}` : `${rows.length} ${rows.length === 1 ? "period" : "periods"} · AED`} pad={false}
    right={rows.length > 12 ? <Btn size="sm" onClick={() => setAll((v) => !v)}>{all ? "Show the latest 12" : `Show all ${rows.length}`}</Btn> : null}>
    <div className="tbl-wrap"><table className="tbl ds-lines">
      <thead><tr><th className="ln">#</th><th>Period</th><th className="n">Sales</th><th className="n">Costs & expenses</th><th className="n cost-data">Gross profit</th><th className="n">Net profit</th><th className="n">Margin</th></tr></thead>
      <tbody>{shown.map((x) => <tr key={x.n} style={{ "--i": x.n }}>
        <td className="ln">{x.n}</td><td><b>{x.full || x.label}</b></td><td className="n">{money(x.revenue, false)}</td><td className="n">{money(x.cost, false)}</td>
        <td className="n cost-data">{money(x.gross, false)}</td><td className={cx("n", x.profit < -0.004 ? "neg" : "pos")}><b>{money(x.profit, false)}</b></td><td className="n">{pc(x.profit, x.revenue)}</td></tr>)}</tbody>
      <tfoot><tr><td /><td>Total</td><td className="n">{money(P.revenue, false)}</td><td className="n">{money(P.cost + P.expense, false)}</td><td className="n cost-data">{money(P.gross, false)}</td>
        <td className={cx("n", P.net < -0.004 ? "neg" : "pos")}>{money(P.net, false)}</td><td className="n">{pc(P.net, P.revenue)}</td></tr></tfoot>
    </table></div>
  </Card>;
}

const DASH_TAB_KEY = "mizan.dashtab";
const DASH_TABS = [["perf", "Performance", BarChart3], ["money", "Money in & out", Wallet], ["items", "Products & customers", Package], ["activity", "Activity", Clock], ["detail", "Financial detail", Scale]];
const readDashTab = () => { try { const t = localStorage.getItem(DASH_TAB_KEY); return DASH_TABS.some((x) => x[0] === t) ? t : "perf"; } catch (e) { return "perf"; } };

const DASHDOC_CSS = `
/* ---- the dashboard as one sheet, like a document ---- */
.mz .dash-doc{display:flex;flex-direction:column;gap:14px}
.mz .ds-sheet{background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:var(--sh-2);position:relative;min-width:0}
.mz .ds-top{position:relative;border-radius:20px 20px 0 0}
/* header: the theme's night-to-accent gradient, with the bottom line on the right */
.mz .ds-head{position:relative;display:flex;align-items:flex-start;gap:24px;padding:22px 26px 22px;border-radius:19px 19px 0 0;overflow:hidden;
  background:var(--hero);color:#E6EDFA;isolation:isolate}
.ds-deco{position:absolute;inset:0;z-index:-1;pointer-events:none}
.ds-deco .g1{position:absolute;width:520px;height:520px;right:-140px;top:-300px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--sb-acc) 38%,transparent),transparent 65%);opacity:.55}
.ds-deco .g2{position:absolute;width:460px;height:460px;left:22%;bottom:-360px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--pri-a) 60%,transparent),transparent 65%);opacity:.5}
.ds-deco .gr{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:32px 32px;
  -webkit-mask-image:linear-gradient(100deg,transparent 30%,#000 75%);mask-image:linear-gradient(100deg,transparent 30%,#000 75%)}
.ds-id{flex:1;min-width:0}
.ds-crumb{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.ds-live{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:7px;font-size:11px;font-weight:650;color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.ds-live i{width:7px;height:7px;border-radius:50%;background:#34D399;box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:dsLive 2s ease-out infinite}
@keyframes dsLive{0%{box-shadow:0 0 0 0 rgba(52,211,153,.55)}100%{box-shadow:0 0 0 8px rgba(52,211,153,0)}}
.mz .ds-crumb .micro{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:rgba(230,237,250,.72);font-weight:650;margin:0}
.mz .ds-id h1{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:0;font-size:30px;font-weight:700;letter-spacing:-.025em;line-height:1.15;color:#fff}
.ds-state{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:11.5px;font-weight:650;letter-spacing:0;background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.ds-state i{width:7px;height:7px;border-radius:50%;background:#34D399}.ds-state.warn i{background:#FBBF24}
.ds-sub{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin-top:12px;font-size:12.5px;color:rgba(230,237,250,.8)}
.ds-sub>span{display:inline-flex;align-items:center;gap:6px}
.ds-sub b{color:#fff;font-weight:650}
.ds-sub svg{color:rgba(230,237,250,.6)}
.mz .ds-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:999px;font-size:11.5px;color:#fff;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);transition:background .2s}
.mz button.ds-chip:hover{background:rgba(255,255,255,.2)}
.mz .ds-chip.pace{background:rgba(52,211,153,.14);box-shadow:inset 0 0 0 1px rgba(52,211,153,.35);color:#D1FAE5}.ds-chip.pace svg{color:#6EE7B7}
.ds-amt{flex:0 0 auto;text-align:right;padding-left:24px;border-left:1px solid rgba(255,255,255,.16);min-width:220px}
.ds-amt small{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:rgba(230,237,250,.72);font-weight:650}
.ds-amt b{display:block;margin-top:6px;font-size:40px;font-weight:700;letter-spacing:-.035em;line-height:1;color:#fff;font-variant-numeric:tabular-nums;text-shadow:0 6px 30px rgba(0,0,0,.25)}
.ds-amt>span{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:9px;font-size:12px;color:rgba(230,237,250,.8)}
.ds-amt em{font-style:normal;font-weight:700;font-size:11.5px;padding:2px 8px;border-radius:999px}
.ds-amt em.up{color:#A7F3D0;background:rgba(16,185,129,.18)}.ds-amt em.down{color:#FECACA;background:rgba(239,68,68,.2)}
.ds-bars{display:flex;align-items:flex-end;justify-content:flex-end;gap:5px;height:44px;margin:12px 0 0 auto;width:max-content}
.ds-bars span{width:10px;height:var(--h);min-height:3px;border-radius:3px 3px 1px 1px;background:linear-gradient(180deg,#fff,rgba(255,255,255,.5));transform-origin:bottom;animation:dsBar .7s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i) * 40ms + .2s)}
.ds-bars.has-neg{position:relative;align-items:stretch}
.ds-bars.has-neg:before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(255,255,255,.28)}
.ds-bars.has-neg span{height:calc(var(--h) / 2);align-self:flex-end;margin-bottom:22px}
.ds-bars.has-neg span.neg{align-self:flex-start;margin:22px 0 0;transform-origin:top;border-radius:1px 1px 3px 3px;background:linear-gradient(0deg,#FCA5A5,rgba(252,165,165,.55))}
@keyframes dsBar{from{transform:scaleY(0)}to{transform:none}}
/* progress bar with the actions, as under a document's header */
.mz .ds-bar{display:flex;align-items:center;justify-content:space-between;gap:10px 16px;flex-wrap:wrap;padding:10px 16px 10px 26px;background:var(--surface-2);border-bottom:1px solid var(--line-2)}
.ds-prog{min-width:0;display:flex;align-items:center}
.mz .ds-steps li button{display:flex;align-items:center;gap:7px;font:inherit;color:inherit;padding:4px 6px 4px 2px;border-radius:8px;transition:background .15s}
.mz .ds-steps li button:not(:disabled):hover{background:var(--surface-3)}
.mz .ds-steps li button:disabled{cursor:default}
.mz .ds-steps li em{font-style:normal;font-size:10.5px;font-weight:700;color:var(--brand);background:var(--brand-50);padding:1px 6px;border-radius:999px}
.mz .ds-steps li.todo{opacity:.7}
.ds-span{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-2);font-weight:550}.ds-span svg{color:var(--ink-4)}
.ds-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto;justify-content:flex-end}
.mz .ds-acts .btn{height:34px;font-size:12px}
.mz .ds-seg{background:var(--surface)}
.mz .ds-seg button{font-size:11.5px;padding:6px 12px}
.ds-more{position:relative}
.mz .ds-menu{right:0;left:auto;top:calc(100% + 6px);min-width:220px}
/* key figures as fields */
.mz .ds-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px 18px;padding:18px 26px 20px}
.mz .ds-field{display:flex;flex-direction:column;gap:6px;text-align:left;min-width:0;border-radius:12px;position:relative}
.ds-fl{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--ink-2)}
.ds-fl svg{color:var(--ink-4)}
.mz .ds-box{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:6px;height:74px;padding:10px 12px 9px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden;
  transition:border-color .2s,box-shadow .2s,background .2s}
.mz .ds-field:hover .ds-box{border-color:color-mix(in srgb,var(--brand) 45%,var(--line));background:var(--surface);box-shadow:0 0 0 3px var(--brand-50),0 10px 22px -16px rgba(16,24,40,.4)}
.mz .ds-field:focus-visible{outline:none}.mz .ds-field:focus-visible .ds-box{border-color:var(--brand);box-shadow:var(--ring)}
.ds-row{display:flex;align-items:center;gap:8px;min-width:0}
.ds-val{flex:1;min-width:0;display:flex;align-items:baseline;gap:5px;font-size:20px;font-weight:700;letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ds-val small{font-size:10.5px;font-weight:650;color:var(--ink-4);letter-spacing:.02em}
.ds-delta{flex:0 0 auto;font-style:normal;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;color:var(--ink-3);background:var(--surface-3);white-space:nowrap}
.ds-delta.up{color:var(--pos);background:var(--pos-50)}.ds-delta.down{color:var(--neg);background:var(--neg-50)}
.ds-trend{display:block;height:22px;margin:0 -2px}
.mz .ds-trend .kt-spark{display:block;width:100%;height:22px}
.ds-meter{display:block;height:5px;margin-bottom:6px;border-radius:5px;background:var(--surface-3);overflow:hidden}
.ds-meter i{display:block;height:100%;border-radius:5px;background:var(--brand);transform-origin:left;animation:barGrowX .9s cubic-bezier(.22,1,.36,1) both}
.ds-meter.warn i{background:var(--warn)}.ds-meter.pos i{background:var(--pos)}.ds-meter.neg i{background:var(--neg)}
.ds-hint{font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ds-field.warn .ds-hint{color:var(--warn)}.ds-field.neg .ds-hint{color:var(--neg)}
/* tabs over the detail, as over a document's lines */
.mz .ds-sheet>.document-toolbar{padding:0 26px;margin:0;border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2);background:var(--surface);align-items:center;flex-wrap:wrap;position:sticky;top:0;z-index:4}
.mz .ds-sheet>.document-toolbar .doc-tabs{gap:24px}
.mz .ds-sheet>.document-toolbar .doc-tabs button{padding:14px 1px;font-size:12.5px}
.mz .ds-sheet>.document-toolbar .doc-tabs button>span{font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;background:var(--brand-50);color:var(--brand)}
.mz .ds-sheet>.document-toolbar .doc-tabs button>span.warn{background:var(--warn-50);color:var(--warn)}
.mz .ds-sheet>.document-toolbar .acts{display:flex;align-items:center;gap:8px;padding:8px 0}
.mz .ds-pane{padding:18px 26px 6px;background:linear-gradient(180deg,color-mix(in srgb,var(--surface-2) 70%,var(--surface)),var(--surface) 240px)}
.mz .ds-pane>.dash-row{margin-bottom:16px}
.mz .ds-pane .flow-totals{display:grid!important;grid-template-columns:1fr 1fr;gap:10px 16px}.mz .ds-pane .flow-totals>div{min-width:0;border:0!important;padding:0!important}.mz .ds-pane .flow-totals>div:nth-child(3){grid-column:1/-1;padding-top:10px!important;border-top:1px solid var(--line-2)!important}
.mz .ds-pane .card,.mz .ds-pane .viz-card{box-shadow:0 1px 2px rgba(16,24,40,.04);border-color:var(--line)}
.mz .ds-pane.detail{padding-top:14px}
/* the header above already greets, picks the period and creates — the older view keeps only its detail */
.mz .ds-pane.detail>div>.hero:first-child{display:none}
/* the lines table */
.mz .ds-lines td.ln,.mz .ds-lines th.ln{width:44px;color:var(--ink-4);text-align:center}
.mz .ds-lines tbody tr{animation:dsRow .5s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0) * 22ms)}
@keyframes dsRow{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.mz .ds-lines td.pos{color:var(--ink)}.mz .ds-lines td.neg{color:var(--neg)}
.mz .ds-lines tfoot td{font-weight:700;border-top:2px solid var(--line);background:var(--surface-2);color:var(--ink)}
.mz .ds-lines tfoot td.neg{color:var(--neg)}
/* foot: summary on the left, totals on the right */
.mz .ds-foot{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,400px);gap:24px;align-items:start;padding:20px 26px 22px;border-top:1px solid var(--line-2)}
.ds-note{display:flex;flex-direction:column;gap:8px;min-width:0}
.ds-note-l{font-size:12px;font-weight:600;color:var(--ink-2)}
.mz .ds-note .insight{margin:0}
.ds-meta{display:flex;flex-direction:column;gap:4px;margin:4px 0 0;font-size:11.5px;color:var(--ink-3)}
.ds-meta span{display:inline-flex;align-items:center;gap:6px}.ds-meta svg{color:var(--ink-4)}
.ds-tot-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:0 0 8px;margin-bottom:4px;border-bottom:1px solid var(--line-2)}
.ds-tot-h b{font-size:13px;color:var(--ink)}.ds-tot-h span{font-size:11px;color:var(--ink-4)}
.mz .ds-totals .sumrow.total.loss .v{color:var(--neg)}
.mz .ds-totals{width:100%;max-width:none;flex:none;border-left:1px solid var(--line)}
.mz .ds-totals .ds-pnl{width:100%;margin-top:10px}
/* the bar that stays at the foot of the screen */
.mz .ds-dock{position:sticky;bottom:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px 10px 26px;
  background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(10px) saturate(1.2);border-top:1px solid var(--line);border-radius:0 0 19px 19px;box-shadow:0 -12px 24px -20px rgba(15,23,42,.45)}
.ds-dk-l{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-3);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ds-dk-l i{flex:0 0 8px;width:8px;height:8px;border-radius:50%;background:var(--pos)}.ds-dk-l i.warn{background:var(--warn)}
.ds-dk-r{display:flex;align-items:center;gap:14px;flex:0 0 auto}
.ds-dk-t{text-align:right;line-height:1.1}.ds-dk-t small{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-4);font-weight:650}
.ds-dk-t b{font-size:20px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)}.ds-dk-t b.neg{color:var(--neg)}
.mz .ds-dock .btn{height:36px}
/* dark theme */
.mz[data-theme="dark"] .ds-sheet{box-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 24px 48px -28px rgba(0,0,0,.7)}
.mz[data-theme="dark"] .ds-box{background:color-mix(in srgb,var(--surface-2) 80%,var(--bg))}
.mz[data-theme="dark"] .ds-pane{background:linear-gradient(180deg,color-mix(in srgb,var(--bg) 35%,var(--surface)),var(--surface) 240px)}
/* smaller screens */
@media(max-width:1180px){.mz .ds-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.mz .ds-foot{grid-template-columns:1fr}.ds-amt b{font-size:34px}}
@media(max-width:760px){
  .mz .ds-head{flex-direction:column;gap:14px;padding:18px 16px}.ds-amt{text-align:left;padding:14px 0 0;border-left:0;border-top:1px solid rgba(255,255,255,.16);min-width:0;width:100%}
  .ds-amt>span{justify-content:flex-start}.mz .ds-id h1{font-size:24px}
  .mz .ds-bar,.mz .ds-fields,.mz .ds-pane,.mz .ds-foot{padding-left:14px;padding-right:14px}.mz .ds-sheet>.document-toolbar{padding:0 14px}
  .mz .ds-fields{grid-template-columns:1fr 1fr;gap:12px}.ds-val{font-size:16px}.ds-trend{display:none}.mz .ds-box{height:auto;min-height:52px}
  .ds-acts{margin-left:0;justify-content:flex-start}
  .mz .ds-dock{padding:9px 14px}.ds-dk-l{display:none}
}
@media(max-width:460px){.mz .ds-fields{grid-template-columns:1fr}}
@media print{.mz .ds-dock,.mz .ds-acts,.mz .ds-sheet>.document-toolbar .acts{display:none!important}.mz .ds-sheet{box-shadow:none}.mz .ds-head{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media(prefers-reduced-motion:reduce){.ds-live i,.ds-bars span{animation:none}.mz .ds-lines tbody tr,.ds-meter i{animation:none}}
`;
