/* ============================================================================
   COMPARE WITH — financial reports sit beside an earlier period. Ranges compare
   with the previous period (previous month, quarter or year-to-date when the
   range is one of those, otherwise the same number of days just before), the
   same period last year, or dates you pick. The balance sheet compares as-at
   dates: previous month-end, last year-end, same date last year or any date.
   When the earlier period is before the books begin, the report says so and
   offers periods that can be compared instead of hiding the comparison.
   ========================================================================== */
const CMP_STORE = "mizan.compare";
const cmpDefaults = () => { let s = {}; try { s = JSON.parse(localStorage.getItem(CMP_STORE) || "{}") || {}; } catch (e) {}
  return { cmp: s.cmp || "prev", bsCmp: s.bsCmp || "ye" }; };
const saveCmp = (p) => { try { localStorage.setItem(CMP_STORE, JSON.stringify({ cmp: p.cmp, bsCmp: p.bsCmp })); } catch (e) {} };
const pad2 = (n) => String(n).padStart(2, "0");
/* Move a date by whole months, keeping the day (clamped to the month) or snapping to month-end. */
const shiftMonths = (s, n, toEnd) => { const f = addMonths(s, n), e = eom(f); return toEnd ? e : f.slice(0, 8) + pad2(Math.min(+s.slice(8), +e.slice(8))); };
const shiftYears = (s, n) => shiftMonths(s, 12 * n, s === eom(s));
const monthsSpanned = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7)) + 1;
const PRESET_MONTHS = { mtd: 1, lastm: 1, qtd: 3, lastq: 3, ytd: 12, fy: 12, d365: 12 };
const CMP_RANGE = [["prev", "Previous period"], ["yoy", "Same period last year"], ["custom", "Custom period"], ["off", "Don't compare"]];
const CMP_ASOF = [["ye", "Last year-end"], ["pm", "Previous month-end"], ["yoy", "Same date last year"], ["custom", "Another date"], ["off", "Don't compare"]];
const span = (f, t) => (f === t ? dmy(f) : `${dmy(f)} – ${dmy(t)}`);

function cmpRange(p, mode = p.cmp || "prev") {
  if (!mode || mode === "off") return null;
  const { from, to } = p; let f, t;
  if (mode === "custom") { if (!p.cmpFrom || !p.cmpTo) return null; f = p.cmpFrom <= p.cmpTo ? p.cmpFrom : p.cmpTo; t = p.cmpFrom <= p.cmpTo ? p.cmpTo : p.cmpFrom; }
  else if (mode === "yoy") { f = shiftYears(from, -1); t = shiftYears(to, -1); }
  else {
    const dayBased = ["today", "yesterday", "d7", "d30"].includes(p.preset);
    const k = PRESET_MONTHS[p.preset] || (!dayBased && from === som(from) ? monthsSpanned(from, to) : 0);
    if (k) { f = shiftMonths(from, -k); t = shiftMonths(to, -k, to === eom(to)); }
    else { const n = daysBetween(from, to) + 1; f = addDays(from, -n); t = addDays(from, -1); }
  }
  return { mode, from: f, to: t, dates: span(f, t), label: (CMP_RANGE.find((x) => x[0] === mode) || [])[1] };
}
function cmpAsOf(p, mode = p.bsCmp || "ye") {
  if (!mode || mode === "off") return null;
  const a = p.asOf; let d;
  if (mode === "pm") d = eom(addMonths(som(a), -1));
  else if (mode === "ye") d = `${+a.slice(0, 4) - 1}-12-31`;
  else if (mode === "yoy") d = shiftYears(a, -1);
  else d = p.cmpAsOf || null;
  if (!d) return null;
  return { mode, asOf: d, from: d, to: d, dates: dmy(d), label: (CMP_ASOF.find((x) => x[0] === mode) || [])[1] };
}
/* full: the books cover the whole comparison · partial: they start inside it · none: it is entirely before the books. */
function cmpCoverage(books, c) {
  if (!c) return null;
  const s = books.flat.reduce((m, l) => (l.date < m ? l.date : m), "9999-12-31");
  if (s === "9999-12-31" || c.to < s) return { status: "none", start: s === "9999-12-31" ? null : s };
  return { status: !c.asOf && c.from < s ? "partial" : "full", start: s };
}
function useCompare(books, p, asOf) {
  const c = asOf ? cmpAsOf(p) : cmpRange(p), cov = cmpCoverage(books, c);
  return { c, cov, on: !!c && cov.status !== "none" };
}
const cmpChip = (x) => (x.on ? { cmp: <><ArrowLeftRight size={12} /> vs {x.c.dates}</> } : null);

/* Change between two amounts: signed AED, % and whether it is good news. */
function chg(cur, prev, goodUp = true) {
  const d = R2(cur - prev), dir = d > 0.004 ? 1 : d < -0.004 ? -1 : 0;
  const pct = Math.abs(prev) > 0.004 ? (d / Math.abs(prev)) * 100 : null;
  return { d, dir, pct, good: dir === 0 ? null : (dir > 0) === goodUp };
}
const pctText = (x, cur) => (x.pct == null ? (Math.abs(cur) > 0.004 ? "New" : "—") : Math.abs(x.pct) >= 1000 ? (x.pct > 0 ? ">+999%" : "<−999%") : (x.pct > 0 ? "+" : x.pct < 0 ? "−" : "") + Math.abs(x.pct).toFixed(1) + "%");
const dText = (x) => (x.dir === 0 ? "—" : (x.dir > 0 ? "+" : "−") + money(Math.abs(x.d)));
function ChangeCells({ cur, prev, goodUp = true }) {
  const x = chg(cur, prev, goodUp), tone = x.good === true ? "up" : x.good === false ? "down" : "";
  return <><td className="n cmp-prev">{money(prev)}</td>
    <td className={cx("n cmp-d", tone)}>{dText(x)}</td>
    <td className={cx("n cmp-p", tone)}>{x.dir !== 0 && <i aria-hidden="true">{x.dir > 0 ? "▲" : "▼"}</i>}{pctText(x, cur)}</td></>;
}
const CmpHead = ({ cur, prev, curLabel = "This period", prevLabel = "Comparison" }) => <>
  <th className="n cmp-cur">{curLabel} <span className="th-d">{cur}</span></th>
  <th className="n cmp-prev">{prevLabel} <span className="th-d">{prev}</span></th>
  <th className="n">Change <span className="th-d">AED</span></th><th className="n" style={{ width: 92 }}>Change <span className="th-d">%</span></th></>;

/* ------------------------------------------------------------ the control */
function CompareBar({ p, setP, mode = "range" }) {
  const asOf = mode === "asOf", key = asOf ? "bsCmp" : "cmp", opts = asOf ? CMP_ASOF : CMP_RANGE;
  const cur = p[key] || (asOf ? "ye" : "prev");
  const [open, setOpen] = useState(false), [at, setAt] = useState({ top: 0, left: 0 });
  const btnRef = React.useRef(null);
  const now = asOf ? cmpAsOf(p) : cmpRange(p);
  const [d, setD] = useState({ from: p.cmpFrom || "", to: p.cmpTo || "", asOf: p.cmpAsOf || "" }), [sel, setSel] = useState(cur);
  React.useEffect(() => { if (!open) return; setSel(cur);
    const r = cmpRange({ ...p, cmp: "prev" }, "prev");
    setD({ from: p.cmpFrom || r.from, to: p.cmpTo || r.to, asOf: p.cmpAsOf || cmpAsOf({ ...p }, "ye").asOf }); }, [open]);
  const toggle = () => { const el = btnRef.current;
    if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect(), w = 340, vw = window.innerWidth || 1280;
      setAt({ top: Math.round(r.bottom + 6), left: Math.round(Math.min(Math.max(8, r.right - w), vw - w - 8)) }); }
    setOpen((v) => !v); };
  const apply = (patch) => { const np = { ...p, ...patch }; setP(np); saveCmp(np); setOpen(false); };
  const preview = (k) => { const c = asOf ? cmpAsOf(p, k) : cmpRange(p, k); return k === "off" ? "Show this period only" : k === "custom" ? (p[key] === "custom" && now ? now.dates : "Pick the dates") : c ? (asOf ? "As at " : "") + c.dates : ""; };
  return <div style={{ position: "relative" }} className="noprint">
    <button className={cx("btn cmp-btn", cur !== "off" && "on")} ref={btnRef} onClick={toggle} aria-haspopup="dialog" aria-expanded={open}>
      <ArrowLeftRight size={14} />{cur === "off" ? "Compare" : <>Compare: <b>{(opts.find((o) => o[0] === cur) || [])[1]}</b></>}
      <ChevronDown size={13} strokeWidth={2} style={{ opacity: .55, marginLeft: 1 }} /></button>
    {open && <>
      <div className="pop-scrim" onMouseDown={() => setOpen(false)} />
      <div className="rangepop cmp-pop" role="dialog" aria-label="Compare with" style={{ top: at.top, left: at.left }}>
        <div className="cmp-pop-h"><b>Compare with</b><span>{asOf ? `Balances as at ${dmy(p.asOf)}` : `This period: ${span(p.from, p.to)}`}</span></div>
        <div className="cmp-opts">{opts.map(([k, label]) => <button key={k} className={cx("cmp-opt", sel === k && "on")} aria-pressed={sel === k} onClick={() => (k === "custom" ? setSel("custom") : apply({ [key]: k }))}>
          <span className="cmp-radio" /><span><b>{label}</b><small>{preview(k)}</small></span></button>)}</div>
        {sel === "custom" && <div className="cmp-custom">
          {asOf ? <Field label="Compare with balances as at"><Input type="date" value={d.asOf} onChange={(e) => setD({ ...d, asOf: e.target.value })} /></Field>
            : <div className="cmp-dates"><Field label="From"><Input type="date" value={d.from} onChange={(e) => setD({ ...d, from: e.target.value })} /></Field>
              <Field label="To"><Input type="date" value={d.to} onChange={(e) => setD({ ...d, to: e.target.value })} /></Field></div>}
          <Btn kind="pri" style={{ width: "100%", marginTop: 10 }} onClick={() => apply(asOf ? { bsCmp: "custom", cmpAsOf: d.asOf } : { cmp: "custom", cmpFrom: d.from <= d.to ? d.from : d.to, cmpTo: d.from <= d.to ? d.to : d.from })}
            disabled={asOf ? !d.asOf : !d.from || !d.to}>Compare</Btn></div>}
      </div></>}
  </div>;
}

/* What a reader needs to know about the comparison, right under the heading. */
const SUGGEST = [["qtd", "This quarter vs last quarter"], ["mtd", "This month vs last month"], ["lastq", "Last quarter vs the one before"], ["lastm", "Last month vs the month before"], ["d30", "Last 30 days vs the 30 before"]];
function CompareNote({ x, p, setP, asOf }) {
  if (!x.c || !x.cov || x.cov.status === "full") return null;
  if (x.cov.status === "partial") return <div className="cmp-note partial noprint"><Info size={15} />
    <span>Your books start on <b>{dmy(x.cov.start)}</b>, so only part of the comparison period ({x.c.dates}) has figures. Changes may look larger than they really are.</span></div>;
  const start = x.cov.start;
  const ideas = !start ? [] : asOf
    ? CMP_ASOF.filter(([k]) => k !== "custom" && k !== "off" && k !== p.bsCmp).map(([k, l]) => [k, l, cmpAsOf(p, k)]).filter((s) => s[2] && s[2].asOf >= start).map(([k, l, c]) => ({ label: `${l} (${c.dates})`, run: () => { const np = { ...p, bsCmp: k }; setP(np); saveCmp(np); } }))
    : SUGGEST.map(([k, l]) => { const f = PRESETS.find((z) => z[0] === k); if (!f) return null; const [from, to] = f[2](); const c = cmpRange({ preset: k, from, to }, "prev");
        return c.from >= start && !(p.preset === k && p.cmp === "prev") ? { label: l, run: () => { const np = { ...p, preset: k, from, to, cmp: "prev" }; setP(np); saveCmp(np); } } : null; }).filter(Boolean).slice(0, 3);
  return <div className="cmp-note none noprint"><span className="cmp-note-ic"><ArrowLeftRight size={17} /></span>
    <div><b>Nothing to compare with yet</b>
      <p>{start ? <>Your books start on <b>{dmy(start)}</b>, so there are no figures for {asOf ? <>{x.c.dates}</> : <>the comparison period {x.c.dates}</>}. </> : <>There are no posted transactions yet. </>}
        {ideas.length ? "Pick a period your books cover:" : "Choose other dates with Compare above."}</p>
      {ideas.length > 0 && <div className="cmp-ideas">{ideas.map((i) => <button key={i.label} onClick={i.run}>{i.label}<ArrowRight size={13} /></button>)}</div>}</div></div>;
}

/* ----------------------------------------------------- comparative tables */
function mergeRows(a, b) {
  const m = new Map();
  a.forEach((x) => m.set(x.acc.code, { acc: x.acc, cur: x.amount, prev: 0 }));
  b.forEach((x) => { const r = m.get(x.acc.code) || { acc: x.acc, cur: 0, prev: 0 }; r.prev = x.amount; m.set(x.acc.code, r); });
  return [...m.values()].sort((x, y) => String(x.acc.code).localeCompare(String(y.acc.code)));
}
function PnlCompareTable({ r, q, p, c }) {
  const share = (v, base) => (base ? ((v / base) * 100).toFixed(1) + "%" : "—");
  const Rows = ({ a, b, goodUp }) => mergeRows(a, b).map((x) => <tr key={x.acc.code}><td className="mono muted" style={{ width: 70 }}>{x.acc.code}</td><td>{x.acc.name}</td>
    <td className="n cmp-cur">{money(x.cur)}</td><td className="n muted" style={{ width: 70 }}>{share(x.cur, r.revenue)}</td><ChangeCells cur={x.cur} prev={x.prev} goodUp={goodUp} /></tr>);
  const Sub = ({ label, cur, prev, goodUp, pct, cls = "sub rule" }) => <tr className={cls}><td /><td>{label}</td><td className="n cmp-cur">{money(cur)}</td><td className="n muted">{pct}</td><ChangeCells cur={cur} prev={prev} goodUp={goodUp} /></tr>;
  return <div className="tbl-wrap"><table className="tbl cmp-tbl">
    <thead><tr><th style={{ width: 70 }}>Code</th><th>Account</th><th className="n cmp-cur">This period <span className="th-d">{span(p.from, p.to)}</span></th><th className="n" style={{ width: 70 }}>% rev.</th>
      <th className="n cmp-prev">Comparison <span className="th-d">{c.dates}</span></th><th className="n">Change <span className="th-d">AED</span></th><th className="n" style={{ width: 92 }}>Change <span className="th-d">%</span></th></tr></thead>
    <tbody>
      <tr className="sec"><td colSpan={7}>Revenue</td></tr>
      <Rows a={r.rev} b={q.rev} goodUp />
      <Sub label="Total revenue" cur={r.revenue} prev={q.revenue} goodUp pct="100.0%" />
      <tr className="sec"><td colSpan={7}>Cost of sales</td></tr>
      <Rows a={r.cos} b={q.cos} goodUp={false} />
      <Sub label="Gross profit" cur={r.gross} prev={q.gross} goodUp pct={r.gm.toFixed(1) + "%"} />
      <tr className="sec"><td colSpan={7}>Operating expenses</td></tr>
      <Rows a={r.exp} b={q.exp} goodUp={false} />
      <Sub label="Total operating expenses" cur={r.expense} prev={q.expense} goodUp={false} pct={share(r.expense, r.revenue)} />
    </tbody>
    <tfoot><tr className="grand"><td /><td>{r.net >= 0 ? "Profit for the period" : "Loss for the period"}</td>
      <td className="n cmp-cur" style={{ color: r.net >= 0 ? "var(--pos)" : "var(--neg)" }}>{money(r.net)}</td><td className="n muted">{r.nm.toFixed(1)}%</td>
      <ChangeCells cur={r.net} prev={q.net} goodUp /></tr>
      <tr className="cmp-margins"><td /><td>Gross margin · net margin</td><td className="n cmp-cur">{r.gm.toFixed(1)}% · {r.nm.toFixed(1)}%</td><td />
        <td className="n cmp-prev">{q.gm.toFixed(1)}% · {q.nm.toFixed(1)}%</td><td className="n" colSpan={2}>{ptsText(r.gm - q.gm)} gross · {ptsText(r.nm - q.nm)} net</td></tr></tfoot>
  </table></div>;
}
const ptsText = (v) => (Math.abs(v) < 0.05 ? "±0.0 pts" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(1) + " pts");

function mergeGroups(A, B) {
  const names = [...new Set([...A.map((g) => g.name), ...B.map((g) => g.name)])];
  return names.map((n) => { const a = A.find((g) => g.name === n), b = B.find((g) => g.name === n);
    return { name: n, rows: mergeRows(a ? a.rows : [], b ? b.rows : []), cur: a ? a.total : 0, prev: b ? b.total : 0 }; });
}
function BsCompareTable({ b, q, p, c }) {
  const Sec = ({ title, groups, rows, cur, prev, label, goodUp }) => <>
    <tr className="sec"><td colSpan={6}>{title}</td></tr>
    {groups && mergeGroups(groups.a, groups.b).map((g) => <React.Fragment key={g.name}>
      <tr className="sub"><td colSpan={6} style={{ paddingTop: 12 }}>{g.name}</td></tr>
      {g.rows.map((x) => <tr key={x.acc.code}><td className="mono muted" style={{ width: 70 }}>{x.acc.code}</td><td>{x.acc.name}</td><td className="n cmp-cur">{money(x.cur)}</td><ChangeCells cur={x.cur} prev={x.prev} goodUp={goodUp} /></tr>)}
      <tr className="sub rule"><td /><td>Total {g.name.toLowerCase()}</td><td className="n cmp-cur">{money(g.cur)}</td><ChangeCells cur={g.cur} prev={g.prev} goodUp={goodUp} /></tr>
    </React.Fragment>)}
    {rows && mergeRows(rows.a, rows.b).map((x) => <tr key={x.acc.code}><td className="mono muted" style={{ width: 70 }}>{x.acc.code}</td><td>{x.acc.name}</td><td className="n cmp-cur">{money(x.cur)}</td><ChangeCells cur={x.cur} prev={x.prev} goodUp={goodUp} /></tr>)}
    <tr className="sub rule cmp-total"><td /><td>{label}</td><td className="n cmp-cur">{money(cur)}</td><ChangeCells cur={cur} prev={prev} goodUp={goodUp} /></tr></>;
  return <div className="tbl-wrap"><table className="tbl cmp-tbl">
    <thead><tr><th style={{ width: 70 }}>Code</th><th>Account</th><CmpHead cur={dmy(p.asOf)} prev={c.dates} curLabel="As at" prevLabel="As at" /></tr></thead>
    <tbody>
      <Sec title="Assets" groups={{ a: b.assets, b: q.assets }} cur={b.totA} prev={q.totA} label="Total assets" goodUp />
      <Sec title="Liabilities" groups={{ a: b.liab, b: q.liab }} cur={b.totL} prev={q.totL} label="Total liabilities" goodUp={false} />
      <Sec title="Equity" rows={{ a: b.eqRows, b: q.eqRows }} cur={b.totE} prev={q.totE} label="Total equity" goodUp />
    </tbody>
    <tfoot><tr className="grand"><td /><td>Total liabilities and equity</td><td className="n cmp-cur">{money(R2(b.totL + b.totE))}</td>
      <ChangeCells cur={R2(b.totL + b.totE)} prev={R2(q.totL + q.totE)} goodUp /></tr></tfoot>
  </table></div>;
}

/* ------------------------------------------------------- comparison charts */
/* Diverging bars: growth to the right, decline to the left; green is good news, red is bad. */
function ChangeList({ rows, empty = "No changes between the two periods." }) {
  const max = Math.max(1, ...rows.map((x) => Math.abs(x.cur - x.prev)));
  if (!rows.length) return <div className="viz-empty" style={{ height: 120 }}>{empty}</div>;
  return <div className="chg-list">{rows.map((x) => { const c = chg(x.cur, x.prev, x.goodUp !== false), w = (Math.abs(c.d) / max) * 50;
    return <div key={x.key} className="chg-row" title={`${x.label}: ${money(x.prev, false)} → ${money(x.cur, false)}`}>
      <span className="chg-name"><b>{x.label}</b><small>{money(x.prev, false)} → {money(x.cur, false)}</small></span>
      <span className="chg-track" aria-hidden="true"><i className={cx(c.good === false ? "bad" : "good", c.dir < 0 && "l")} style={c.dir >= 0 ? { left: "50%", width: w + "%" } : { right: "50%", width: w + "%" }} /></span>
      <span className={cx("chg-val", c.good === true && "up", c.good === false && "down")}>{dText(c).replace(".00", "")}<small>{pctText(c, x.cur)}</small></span>
    </div>; })}</div>;
}
/* Paired bars: this period (series colour) over the comparison (grey), one row per line item. */
function PairBars({ rows, curName = "This period", prevName = "Comparison" }) {
  const max = Math.max(1, ...rows.flatMap((x) => [Math.abs(x.cur), Math.abs(x.prev)]));
  return <div className="pair-list" role="list">{rows.map((x, i) => { const c = chg(x.cur, x.prev, x.goodUp !== false);
    return <div key={x.label} className="pair-row" role="listitem" aria-label={`${x.label}: ${curName} ${money(x.cur, false)}, ${prevName} ${money(x.prev, false)}`}>
      <div className="pair-h"><b>{x.label}</b><span className={cx("pair-chg", c.good === true && "up", c.good === false && "down")}>{c.dir !== 0 && (c.dir > 0 ? "▲ " : "▼ ")}{pctText(c, x.cur)}</span></div>
      <div className="pair-bar cur"><i className={x.cur < 0 ? "neg" : ""} style={{ width: (Math.abs(x.cur) / max) * 100 + "%", "--i": i }} /><span>{money(x.cur, false)}</span></div>
      <div className="pair-bar prev"><i style={{ width: (Math.abs(x.prev) / max) * 100 + "%", "--i": i }} /><span>{money(x.prev, false)}</span></div>
    </div>; })}</div>;
}
function biggest(rows, n = 7) { return rows.filter((x) => Math.abs(x.cur - x.prev) > 0.004).sort((a, b) => Math.abs(b.cur - b.prev) - Math.abs(a.cur - a.prev)).slice(0, n); }

function PnlCompareViz({ r, q, c }) {
  const data = [["Revenue", r.revenue, q.revenue, true], ["Cost of sales", r.cost, q.cost, false], ["Gross profit", r.gross, q.gross, true], ["Operating expenses", r.expense, q.expense, false], [r.net < 0 ? "Net loss" : "Net profit", r.net, q.net, true]]
    .map(([label, cur, prev, goodUp]) => ({ label, full: label, cur, prev, goodUp }));
  const moves = biggest([...mergeRows(r.rev, q.rev).map((x) => ({ ...x, goodUp: true })), ...mergeRows([...r.cos, ...r.exp], [...q.cos, ...q.exp]).map((x) => ({ ...x, goodUp: false }))]
    .map((x) => ({ key: x.acc.code, label: x.acc.name, cur: x.cur, prev: x.prev, goodUp: x.goodUp })));
  return <div className="rpt-grid even">
    <VizCard title="This period vs comparison" sub={`AED · ${c.dates} in grey`} legend={[{ name: "This period", color: "var(--s1)" }, { name: "Comparison", color: "var(--k0)" }]}>
      <PairBars rows={data} />
      <VizTable caption="This period vs comparison" cols={["Line", "This period", "Comparison", "Change"]} rows={data.map((x) => [x.label, money(x.cur, false), money(x.prev, false), dText(chg(x.cur, x.prev))])} />
    </VizCard>
    <VizCard title="Biggest changes" sub="Accounts that moved most · green is good news, red is not"><ChangeList rows={moves} /></VizCard>
  </div>;
}

const COMPARE_CSS = `
.cmp-btn b{font-weight:650;margin-left:2px}
.mz .cmp-btn.on{border-color:var(--brand-100);background:var(--brand-50);color:var(--brand-600)}
.mz .cmp-btn.on svg{color:var(--brand)}
.cmp-pop{flex-direction:column;width:340px;padding:0}
.cmp-pop-h{padding:13px 16px 10px;border-bottom:1px solid var(--line-2);background:var(--surface-2)}
.cmp-pop-h b{display:block;font-size:13.5px;color:var(--ink)}.cmp-pop-h span{font-size:11.5px;color:var(--ink-3)}
.cmp-opts{padding:6px}
.cmp-opt{display:flex;align-items:flex-start;gap:11px;width:100%;text-align:left;padding:9px 10px;border-radius:10px;transition:background .12s}
.cmp-opt:hover{background:var(--surface-2)}
.cmp-opt b{display:block;font-size:13px;font-weight:600;color:var(--ink)}.cmp-opt small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:1px}
.cmp-radio{flex:0 0 16px;width:16px;height:16px;margin-top:2px;border-radius:50%;border:1.5px solid var(--ink-4);display:grid;place-items:center}
.cmp-opt.on{background:var(--brand-50)}.cmp-opt.on .cmp-radio{border-color:var(--brand)}.cmp-opt.on .cmp-radio::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--brand)}
.cmp-custom{padding:4px 16px 16px;border-top:1px solid var(--line-2);margin-top:2px;padding-top:12px}
.cmp-dates{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rf-chips span.cmp{background:var(--surface-2);border-style:dashed;color:var(--ink-2);font-weight:600}
.cmp-note{display:flex;gap:12px;align-items:flex-start;margin:14px 24px 0;padding:12px 14px;border-radius:12px;font-size:12.5px;line-height:1.5}
.cmp-note.partial{align-items:center;background:var(--warn-50);color:var(--ink-2);border:1px solid color-mix(in srgb,var(--warn) 25%,transparent)}
.cmp-note.partial svg{color:var(--warn);flex:0 0 auto}
.cmp-note.none{background:var(--brand-50);border:1px solid var(--brand-100);color:var(--ink-2)}
.cmp-note.none>div>b{display:block;font-size:13.5px;color:var(--ink)}
.cmp-note p{margin-top:2px}
.cmp-note-ic{flex:0 0 34px;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff;background:linear-gradient(140deg,var(--pri-a),var(--pri-b))}
.cmp-ideas{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.cmp-ideas button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:9px;font-size:12.5px;font-weight:600;color:var(--brand-600);background:var(--surface);border:1px solid var(--brand-100);transition:transform .15s,box-shadow .15s}
.cmp-ideas button:hover{transform:translateY(-1px);box-shadow:var(--sh-2)}
.mz .rframe .tbl.cmp-tbl th .th-d{display:block;font-size:10px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink-4);margin-top:2px}
.mz .tbl.cmp-tbl td.cmp-cur{font-weight:600}
.mz .tbl.cmp-tbl th.cmp-prev,.mz .tbl.cmp-tbl td.cmp-prev{background:color-mix(in srgb,var(--surface-2) 70%,transparent);color:var(--ink-2)}
.mz .tbl.cmp-tbl td.cmp-d,.mz .tbl.cmp-tbl td.cmp-p{color:var(--ink-3);white-space:nowrap}
.mz .tbl.cmp-tbl td.cmp-d.up,.mz .tbl.cmp-tbl td.cmp-p.up{color:var(--pos)}
.mz .tbl.cmp-tbl td.cmp-d.down,.mz .tbl.cmp-tbl td.cmp-p.down{color:var(--neg)}
.mz .tbl.cmp-tbl td.cmp-p i{font-style:normal;font-size:9px;margin-right:4px;vertical-align:1px}
.mz .tbl.cmp-tbl tr.cmp-margins td{font-size:12px;font-weight:500;color:var(--ink-3);background:var(--surface)}
.pair-list{display:grid;gap:12px}
.pair-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:5px}
.pair-h b{font-size:12.5px;font-weight:600;color:var(--ink)}
.pair-chg{font-size:11.5px;font-weight:650;color:var(--ink-3);font-variant-numeric:tabular-nums}.pair-chg.up{color:var(--pos)}.pair-chg.down{color:var(--neg)}
.pair-bar{display:grid;grid-template-columns:minmax(0,1fr) 108px;gap:10px;align-items:center;height:14px}
.pair-bar+.pair-bar{margin-top:3px}
.pair-bar i{display:block;height:10px;border-radius:0 4px 4px 0;min-width:2px;transform-origin:0 50%;animation:barGrowX .8s var(--ease) both;animation-delay:calc(var(--i,0) * 60ms)}
.pair-bar.cur i{background:var(--s1)}.pair-bar.cur i.neg{background:var(--neg)}.pair-bar.prev i{background:var(--k0);height:8px}
.pair-bar span{font-size:11.5px;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink-2)}.pair-bar.prev span{color:var(--ink-3)}
.chg-list{display:grid;gap:4px}
.chg-row{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(70px,1fr) auto;gap:12px;align-items:center;padding:6px 2px;border-bottom:1px solid var(--line-2)}
.chg-row:last-child{border-bottom:0}
.chg-name b{display:block;font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chg-name small{display:block;font-size:11px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.chg-track{position:relative;height:10px;background:linear-gradient(90deg,transparent calc(50% - .5px),var(--line) calc(50% - .5px),var(--line) calc(50% + .5px),transparent calc(50% + .5px))}
.chg-track i{position:absolute;top:0;bottom:0;border-radius:3px;transform-origin:0 50%;animation:barGrowX .8s var(--ease) both}
.chg-track i.l{transform-origin:100% 50%}
.chg-track i.good{background:var(--pos)}.chg-track i.bad{background:var(--neg)}
.chg-val{text-align:right;font-size:12.5px;font-weight:650;font-variant-numeric:tabular-nums;color:var(--ink-2);white-space:nowrap}
.chg-val small{display:block;font-size:10.5px;font-weight:600}
.chg-val.up{color:var(--pos)}.chg-val.down{color:var(--neg)}
@media (max-width:700px){.cmp-note{margin:12px 12px 0}.cmp-pop{width:calc(100vw - 24px)}.chg-row{grid-template-columns:minmax(0,1fr) auto}.chg-track{display:none}}
@media (prefers-reduced-motion:reduce){.chg-track i,.pair-bar i{animation:none!important}}
@media print{.mz .tbl.cmp-tbl th.cmp-prev,.mz .tbl.cmp-tbl td.cmp-prev{background:none}}
`;
