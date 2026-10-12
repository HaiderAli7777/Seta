/* ============================================================================
   REPORT DESIGN SYSTEM — KPI tiles, chart cards and charts shared by every
   report and the dashboard. Colours are CSS roles (--s1..--s3 for series,
   --k1..--k5 for parts of a whole, status tokens for severity) so a colour
   theme or dark mode repaints every chart. Marks follow one spec: bars no
   thicker than 24px with a 4px rounded data end, 2px lines, solid hairline
   grid, a 2px surface gap between touching marks, a legend for two or more
   series, values in the tooltip and in the table under each chart.
   ========================================================================== */
const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)"];
const PARTS = ["var(--k1)", "var(--k2)", "var(--k3)", "var(--k4)", "var(--k5)"];
const OTHER = "var(--k0)";
const priorRange = (from, to) => { const n = daysBetween(from, to) + 1; return [addDays(from, -n), addDays(from, -1)]; };
const deltaPct = (v, p) => (Math.abs(p) > 0.004 ? ((v - p) / Math.abs(p)) * 100 : null);
/* A comparison only means something when the books already existed for the whole previous period. */
const booksStart = (books) => books.flat.reduce((m, l) => (l.date < m ? l.date : m), "9999-12-31");
const comparable = (books, from, to) => priorRange(from, to)[0] >= booksStart(books);
const niceStep = (raw) => { if (!(raw > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / e; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * e; };
const short = (v) => { const a = Math.abs(v), s = v < 0 ? "-" : "";
  return a >= 1e6 ? s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M" : a >= 1e3 ? s + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K" : s + Math.round(a); };
function periodSeries(flat, from, to, gran = "auto") {
  const b = bucketize(from, to, gran);
  return { g: b.g, rows: b.rows.map((x) => { const p = pnl(flat, x.from, x.to); return { ...x, revenue: p.revenue, costs: R2(p.cost + p.expense), profit: p.net }; }) };
}
/* Fold a ranked list into its top n and an "Other" row. */
function topN(rows, n, label = "Other") {
  if (rows.length <= n) return rows;
  const rest = rows.slice(n - 1);
  return [...rows.slice(0, n - 1), { key: "__other", label: `${label} (${rest.length})`, value: R2(rest.reduce((s, r) => s + r.value, 0)), other: true }];
}

/* ---------------------------------------------------------------- tiles -- */
function KpiTile({ label, value, prefix = "AED", text, delta, goodUp = true, sub, icon: I, tone, spark, onClick, foot, deltaTitle = "Compared with the previous period" }) {
  const dir = delta == null ? 0 : delta > 0.05 ? 1 : delta < -0.05 ? -1 : 0;
  const good = dir === 0 ? null : (dir > 0) === goodUp;
  const Tag = onClick ? "button" : "div";
  return <Tag className={cx("kpi-tile", tone, onClick && "click")} onClick={onClick}>
    <div className="kt-top"><span className="kt-label">{label}</span>{I && <span className="kt-ic"><I size={16} /></span>}</div>
    <div className="kt-value">{text != null ? text : <>{prefix && <small>{prefix}</small>}<CountUp value={value} /></>}</div>
    <div className="kt-foot">
      {delta != null && <span className={cx("kt-delta", good === true && "up", good === false && "down")} title={deltaTitle}>
        {dir > 0 ? "▲" : dir < 0 ? "▼" : "•"} {Math.abs(delta) >= 1000 ? ">999" : Math.abs(delta).toFixed(1)}%</span>}
      {sub && <span className="kt-sub">{sub}</span>}
    </div>
    {spark && spark.length > 1 && <MiniSpark data={spark} color={{ t2: "var(--s2)", t3: "var(--s3)", pos: "var(--pos)", neg: "var(--neg)", warn: "var(--warn)" }[tone] || "var(--s1)"} />}
    {foot}
  </Tag>;
}
function MiniSpark({ data, color = "var(--s1)", w = 120, h = 28 }) {
  const max = Math.max(...data), min = Math.min(...data, 0), span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return <svg className="kt-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
    <path d={d + ` L ${w} ${h} L 0 ${h} Z`} style={{ fill: color, opacity: 0.1 }} />
    <path d={d} style={{ fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} vectorEffect="non-scaling-stroke" />
  </svg>;
}
const KpiRow = ({ children }) => <div className="kpi-row">{children}</div>;
function VizCard({ title, sub, right, legend, children, className }) {
  return <section className={cx("viz-card", className)}>
    <header><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>{right && <div className="vc-right">{right}</div>}</header>
    {legend && legend.length > 1 && <div className="viz-legend">{legend.map((l) => <span key={l.name}><i className={l.line ? "ln" : ""} style={{ background: l.color }} />{l.name}</span>)}</div>}
    {children}
  </section>;
}

/* --------------------------------------------------------------- charts -- */
function ColumnChart({ data, series, line, height = 240, format = (v) => money(v, false), ariaLabel, onPick, empty }) {
  const [hi, setHi] = useState(null);
  const W = 720, H = height, pad = { t: 14, r: 10, b: 30, l: 50 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, n = data.length || 1;
  const vals = data.flatMap((d) => [...series.map((s) => +d[s.key] || 0), ...(line ? [+d[line.key] || 0] : [])]);
  if (!vals.some((v) => Math.abs(v) > 0.004)) return <div className="viz-empty" style={{ height }}>{empty || "Nothing to chart for this period yet."}</div>;
  const hiV = Math.max(0, ...vals), loV = Math.min(0, ...vals);
  const step = niceStep((hiV - loV) / 4), max = Math.ceil(hiV / step - 1e-9) * step, min = Math.floor(loV / step + 1e-9) * step, span = max - min || 1;
  const Y = (v) => pad.t + ih - ((v - min) / span) * ih, y0 = Y(0);
  const bw = iw / n, k = series.length, barW = Math.max(3, Math.min(24, (bw * 0.7 - (k - 1) * 2) / k)), groupW = k * barW + (k - 1) * 2;
  const cx0 = (i) => pad.l + bw * i + bw / 2;
  const ticks = []; for (let t = min; t <= max + step / 2; t += step) ticks.push(R2(t));
  const every = Math.max(1, Math.ceil(n / 10));
  const bar = (x, v) => { const y = Y(v), h = Math.abs(y - y0), r = Math.min(4, barW / 2, h);
    if (h < 0.5) return "";
    return v >= 0 ? `M${x},${y0} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y0} Z`
      : `M${x},${y0} L${x},${y - r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y - r} L${x + barW},${y0} Z`; };
  const linePts = line ? data.map((d, i) => [cx0(i), Y(+d[line.key] || 0)]) : [];
  return <div className="viz-wrap" onMouseLeave={() => setHi(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label={ariaLabel || series.map((s) => s.name).join(", ")}>
      {ticks.map((t, i) => <g key={i}><line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} className={Math.abs(t) < 0.004 ? "viz-base" : "viz-grid"} />
        <text x={pad.l - 8} y={Y(t) + 3.5} textAnchor="end" className="viz-tick">{short(t)}</text></g>)}
      {data.map((d, i) => <g key={i}>
        {hi === i && <rect x={pad.l + bw * i + 1} y={pad.t} width={bw - 2} height={ih} rx="6" className="viz-hover" />}
        {series.map((s, j) => <path key={s.key} d={bar(cx0(i) - groupW / 2 + j * (barW + 2), +d[s.key] || 0)} style={{ fill: s.color, "--d": i }} className={cx("viz-bar", (+d[s.key] || 0) < 0 && "neg", hi != null && hi !== i && "dim")} />)}
        {(i % every === 0 || i === n - 1) && <text x={cx0(i)} y={H - 10} textAnchor="middle" className="viz-tick">{d.label}</text>}
      </g>)}
      {line && linePts.length > 1 && <path className="viz-line" pathLength="1" d={linePts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ")} style={{ fill: "none", stroke: line.color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }} />}
      {line && linePts.map((p, i) => (n <= 16 || hi === i || i === n - 1) && <circle key={i} cx={p[0]} cy={p[1]} r={hi === i ? 5 : 4} style={{ fill: line.color, stroke: "var(--surface)", strokeWidth: 2 }} />)}
      {data.map((d, i) => <rect key={"h" + i} x={pad.l + bw * i} y={0} width={bw} height={H} fill="transparent" tabIndex={0} role="button"
        aria-label={`${d.full || d.label}: ${[...series, ...(line ? [line] : [])].map((s) => s.name + " " + format(+d[s.key] || 0)).join(", ")}`}
        onMouseEnter={() => setHi(i)} onFocus={() => setHi(i)} onBlur={() => setHi(null)} onClick={onPick ? () => onPick(d, i) : undefined} style={{ cursor: onPick ? "pointer" : "default", outline: "none" }} />)}
    </svg>
    {hi != null && data[hi] && <div className="viz-tip" style={{ left: `${(cx0(hi) / W) * 100}%`, top: 6, transform: `translateX(${cx0(hi) / W > 0.7 ? "-104%" : cx0(hi) / W < 0.3 ? "4%" : "-50%"})` }}>
      <div className="vt-h">{data[hi].full || data[hi].label}</div>
      {[...series, ...(line ? [{ ...line, ln: true }] : [])].map((s) => <div className="vt-r" key={s.key}><i className={s.ln ? "ln" : ""} style={{ background: s.color }} /><b>{format(+data[hi][s.key] || 0)}</b><span>{s.name}</span></div>)}
    </div>}
  </div>;
}

/* Horizontal ranked bars: one colour, value at the tip. */
function HBars({ rows, format = (v) => money(v, false), color = "var(--s1)", onPick, max: maxIn, empty, extra }) {
  if (!rows.length) return <div className="viz-empty" style={{ height: 120 }}>{empty || "Nothing to rank yet."}</div>;
  /* The folded "Other" row never sets the scale — it would squash the items being ranked. */
  const max = maxIn || Math.max(...rows.filter((r) => !r.other).map((r) => Math.abs(r.value)), 1);
  return <div className="hbars">{rows.map((r, i) => {
    const w = Math.min(100, Math.max(0.6, (Math.abs(r.value) / max) * 100)), Tag = onPick && !r.other ? "button" : "div";
    return <Tag key={r.key || r.label} className={cx("hb-row", onPick && !r.other && "click")} onClick={onPick && !r.other ? () => onPick(r) : undefined} title={`${r.label}: ${format(r.value)}`}>
      <span className="hb-label"><b>{r.label}</b>{r.sub && <small>{r.sub}</small>}</span>
      <span className="hb-track"><i style={{ width: w + "%", background: r.other ? OTHER : r.value < 0 ? "var(--neg)" : r.color || color }} /></span>
      <span className="hb-val">{format(r.value)}{r.extra != null && <small className={r.extraTone}>{r.extra}</small>}</span>
    </Tag>; })}</div>;
}

/* Part-to-whole as one bar with surface gaps, legend below with value and share. */
function ShareBar({ parts, format = (v) => money(v, false), height = 14, legend = true }) {
  const [hi, setHi] = useState(null);
  const pos = parts.filter((p) => p.value > 0.004), total = pos.reduce((s, p) => s + p.value, 0);
  if (!total) return <div className="viz-empty" style={{ height: 60 }}>Nothing to show yet.</div>;
  return <div className="share">
    <div className="share-bar" style={{ height }}>{pos.map((p, i) => <i key={p.label} title={`${p.label}: ${format(p.value)} (${((p.value / total) * 100).toFixed(1)}%)`}
      style={{ flexGrow: p.value, background: p.color || PARTS[i % PARTS.length], opacity: hi != null && hi !== i ? 0.35 : 1 }} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />)}</div>
    {legend && <div className="share-legend">{pos.map((p, i) => <div key={p.label} className={cx(hi === i && "on")} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
      <i style={{ background: p.color || PARTS[i % PARTS.length] }} /><span>{p.label}</span><b>{format(p.value)}</b><em>{((p.value / total) * 100).toFixed(0)}%</em></div>)}</div>}
  </div>;
}
function Meter({ label, value, max = 1, text, tone, note }) {
  const f = Math.max(0, Math.min(1, max ? value / max : 0));
  return <div className={cx("meter", tone)}><div className="mt-top"><span>{label}</span><b>{text}</b></div>
    <div className="mt-track"><i style={{ width: f * 100 + "%" }} /></div>{note && <small>{note}</small>}</div>;
}
/* Table twin for a chart (screen readers, and anyone who prefers numbers). */
function VizTable({ caption, cols, rows }) {
  return <details className="viz-table"><summary>View as table</summary>
    <table><caption className="sr-only">{caption}</caption><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? "n" : ""}>{c}</td>)}</tr>)}</tbody></table></details>;
}
const SectionTitle = ({ children, right }) => <div className="rpt-section"><h3>{children}</h3>{right}</div>;

const REPORTS_CSS = `
/* chart colour roles — validated categorical sets per theme (light and dark) */
.mz{--s1:#1D63ED;--s2:#E8590C;--s3:#7C3AED;--k1:#2a78d6;--k2:#eb6834;--k3:#1baf7a;--k4:#eda100;--k5:#e87ba4;--k0:#B4BDCC;--sev-1:#E9A23B;--sev-2:#E8590C;--sev-3:#D63B4A}
.mz[data-accent="teal"]{--s1:#0A9396;--s2:#D9480F;--s3:#4F46E5}
.mz[data-accent="royal"]{--s1:#5145CD;--s2:#E8590C;--s3:#0E8C7E}
.mz[data-accent="graphite"]{--s1:#2F62C4;--s2:#D9480F;--s3:#0E8C7E}
.mz[data-theme="dark"]{--s1:#3987e5;--s2:#d95926;--s3:#9085e9;--k1:#3987e5;--k2:#d95926;--k3:#199e70;--k4:#c98500;--k5:#d55181;--k0:#4B5568;--sev-1:#C98500;--sev-2:#D95926;--sev-3:#E66767}
.mz[data-theme="dark"][data-accent="teal"]{--s1:#14a38f;--s2:#d95926;--s3:#9085e9}
.mz[data-theme="dark"][data-accent="royal"]{--s1:#9085e9;--s2:#d95926;--s3:#199e70}
.mz[data-theme="dark"][data-accent="graphite"]{--s1:#3987e5;--s2:#d95926;--s3:#199e70}

/* report frame */
.mz .rframe{overflow:hidden}
.mz .rframe>.rframe-h{position:relative;padding:22px 24px 18px!important;background:linear-gradient(180deg,var(--brand-50),var(--surface) 85%);border-bottom:1px solid var(--line)!important}
.mz .rframe>.rframe-h::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--pri-a),var(--s2) 70%,var(--s3))}
.rf-title{display:flex;gap:14px;align-items:flex-start;min-width:0}
.rf-ic{width:44px;height:44px;flex:0 0 44px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(140deg,var(--pri-a),var(--pri-b));box-shadow:0 8px 18px var(--pri-sh)}
.rf-title h2{font-size:22px!important;font-weight:650!important;letter-spacing:-.03em;margin-top:5px!important}
.rf-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.rf-chips span{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:20px;font-size:11.5px;color:var(--ink-2);background:var(--surface);border:1px solid var(--line)}
.rf-chips span.acc{background:var(--brand-50);border-color:var(--brand-100);color:var(--brand-600);font-weight:600}
.rpt-viz{padding:18px 20px 6px;display:grid;gap:16px;background:var(--surface-2);border-bottom:1px solid var(--line)}
.rpt-grid{display:grid;gap:16px;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)}
.rpt-grid.even{grid-template-columns:repeat(2,minmax(0,1fr))}
.rpt-section{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px 10px;border-bottom:1px solid var(--line-2)}
.rpt-section h3{font-size:13px;font-weight:650;letter-spacing:.02em;text-transform:uppercase;color:var(--ink-3)}

/* KPI tiles */
.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.kpi-tile{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0;padding:14px 16px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);text-align:left;overflow:hidden}
.kpi-tile::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--s1)}
.kpi-tile.t2::after{background:var(--s2)}.kpi-tile.t3::after{background:var(--s3)}.kpi-tile.pos::after{background:var(--pos)}.kpi-tile.neg::after{background:var(--neg)}.kpi-tile.warn::after{background:var(--warn)}
.kpi-tile.click{cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s}
.kpi-tile.click:hover{transform:translateY(-2px);box-shadow:var(--sh-2);border-color:var(--brand-100)}
.kt-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.kt-label{font-size:12px;font-weight:500;color:var(--ink-3)}
.kt-ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.kpi-tile.t2 .kt-ic{background:color-mix(in srgb,var(--s2) 12%,var(--surface));color:var(--s2)}
.kpi-tile.t3 .kt-ic{background:color-mix(in srgb,var(--s3) 12%,var(--surface));color:var(--s3)}
.kpi-tile.pos .kt-ic{background:var(--pos-50);color:var(--pos)}.kpi-tile.neg .kt-ic{background:var(--neg-50);color:var(--neg)}.kpi-tile.warn .kt-ic{background:var(--warn-50);color:var(--warn)}
.kt-value{font-size:22px;font-weight:650;letter-spacing:-.03em;color:var(--ink);line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kt-value small{font-size:11px;font-weight:600;color:var(--ink-4);margin-right:5px;letter-spacing:.02em}
.kpi-tile.pos .kt-value{color:var(--pos)}.kpi-tile.neg .kt-value{color:var(--neg)}
.kt-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:18px}
.kt-delta{font-size:11.5px;font-weight:650;padding:1px 7px;border-radius:20px;background:var(--surface-3);color:var(--ink-3)}
.kt-delta.up{background:var(--pos-50);color:var(--pos)}.kt-delta.down{background:var(--neg-50);color:var(--neg)}
.kt-sub{font-size:11.5px;color:var(--ink-3)}
.kt-spark{width:100%;height:28px;display:block;margin-top:2px}

/* chart card */
.viz-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px 12px;box-shadow:var(--sh-1);min-width:0}
.viz-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
.viz-card h3{font-size:14.5px;font-weight:650;letter-spacing:-.01em;color:var(--ink)}
.viz-card header p{font-size:12px;color:var(--ink-3);margin-top:3px}
.vc-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.viz-legend{display:flex;flex-wrap:wrap;gap:14px;margin:2px 0 6px;font-size:12px;color:var(--ink-2)}
.viz-legend span{display:inline-flex;align-items:center;gap:6px}
.viz-legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
.viz-legend i.ln{width:14px;height:2px;border-radius:2px}
.viz-wrap{position:relative}
.viz-svg{width:100%;height:auto;display:block;overflow:visible}
.viz-grid{stroke:var(--line-2);stroke-width:1}
.viz-base{stroke:var(--line);stroke-width:1}
.viz-tick{font-size:10.5px;fill:var(--ink-3);font-family:var(--sans);font-variant-numeric:tabular-nums}
.viz-hover{fill:var(--brand-50);opacity:.7}
.viz-bar{transition:opacity .15s}.viz-bar.dim{opacity:.45}
.viz-tip{position:absolute;z-index:5;pointer-events:none;min-width:150px;padding:9px 11px;border-radius:10px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-2);font-size:12px}
.vt-h{font-size:11.5px;color:var(--ink-3);margin-bottom:5px}
.vt-r{display:flex;align-items:center;gap:7px;padding:2px 0}
.vt-r i{width:12px;height:3px;border-radius:2px;flex:0 0 12px}.vt-r i:not(.ln){height:10px;width:10px;flex-basis:10px;border-radius:3px}
.vt-r b{font-variant-numeric:tabular-nums;color:var(--ink);font-weight:650}.vt-r span{color:var(--ink-3)}
.viz-empty{display:grid;place-items:center;color:var(--ink-3);font-size:12.5px;border:1px dashed var(--line);border-radius:12px;background:var(--surface-2);text-align:center;padding:12px}
.viz-table{margin-top:6px;font-size:12px;color:var(--ink-3)}
.viz-table summary{cursor:pointer;width:max-content;padding:2px 0;color:var(--ink-3)}
.viz-table summary:hover{color:var(--brand)}
.viz-table table{width:100%;border-collapse:collapse;margin-top:6px}
.viz-table th,.viz-table td{padding:5px 8px;border-bottom:1px solid var(--line-2);text-align:left}
.viz-table td.n,.viz-table th:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ranked bars */
.hbars{display:grid;gap:4px}
.hb-row{display:grid;grid-template-columns:minmax(120px,30%) minmax(0,1fr) auto;align-items:center;gap:12px;padding:6px 6px;border-radius:9px;text-align:left;width:100%}
.hb-row.click{cursor:pointer}.hb-row.click:hover{background:var(--surface-2)}
.hb-label{min-width:0}.hb-label b{display:block;font-size:12.5px;font-weight:550;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-label small{display:block;font-size:11px;color:var(--ink-4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-track{height:12px;border-radius:0 4px 4px 0;background:var(--surface-3)}
.hb-track i{display:block;height:100%;border-radius:0 4px 4px 0}
.hb-val{font-size:12.5px;font-weight:650;color:var(--ink);font-variant-numeric:tabular-nums;text-align:right;min-width:86px}
.hb-val small{display:block;font-size:11px;font-weight:500;color:var(--ink-3)}
.hb-val small.neg{color:var(--neg)}.hb-val small.pos{color:var(--pos)}

/* part-to-whole */
.share-bar{display:flex;gap:2px;border-radius:6px;overflow:hidden;background:var(--surface)}
.share-bar i{display:block;min-width:3px;transition:opacity .15s}
.share-bar i:first-child{border-radius:6px 0 0 6px}.share-bar i:last-child{border-radius:0 6px 6px 0}
.share-legend{display:grid;gap:2px;margin-top:10px}
.share-legend>div{display:grid;grid-template-columns:10px minmax(0,1fr) auto 40px;gap:9px;align-items:center;padding:5px 6px;border-radius:8px;font-size:12.5px}
.share-legend>div.on{background:var(--surface-2)}
.share-legend i{width:10px;height:10px;border-radius:3px}
.share-legend span{color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.share-legend b{font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink)}
.share-legend em{font-style:normal;text-align:right;color:var(--ink-3);font-size:11.5px;font-variant-numeric:tabular-nums}
.meter{display:grid;gap:6px}
.mt-top{display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2)}.mt-top b{color:var(--ink);font-variant-numeric:tabular-nums}
.mt-track{height:8px;border-radius:6px;background:var(--brand-50);overflow:hidden}
.mt-track i{display:block;height:100%;border-radius:6px;background:var(--brand)}
.meter.pos .mt-track{background:var(--pos-50)}.meter.pos .mt-track i{background:var(--pos)}
.meter.warn .mt-track{background:var(--warn-50)}.meter.warn .mt-track i{background:var(--warn)}
.meter.neg .mt-track{background:var(--neg-50)}.meter.neg .mt-track i{background:var(--neg)}
.meter small{font-size:11.5px;color:var(--ink-3)}
.meters{display:grid;gap:16px;padding-top:4px}

/* report tables */
.mz .rframe .tbl thead th{position:sticky;top:0;z-index:1;background:var(--surface-2);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);border-bottom:1px solid var(--line)}
.mz .rframe .tbl td{font-variant-numeric:tabular-nums}
.mz .rframe .tbl tbody tr:not(.sec):not(.sub):hover td{background:var(--surface-2)}
.mz .rframe .tbl tr.sec td{background:transparent;color:var(--brand-600);font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding-top:16px;box-shadow:inset 3px 0 0 var(--brand)}
.mz .rframe .tbl tr.sub td{background:var(--surface-2);font-weight:600}
.mz .rframe .tbl tfoot td{background:var(--brand-50);font-weight:700;color:var(--ink);border-top:2px solid var(--brand-100)}
.mz .rframe .tbl tr.grand td{background:linear-gradient(90deg,var(--brand-50),var(--surface));font-size:14px}
.rpt-statusbar{display:flex;align-items:center;gap:9px;padding:12px 20px;font-size:12.5px}

.health-pair{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:2px}
.health-pair>div{padding:10px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line-2);min-width:0}
.health-pair span{display:block;font-size:11px;color:var(--ink-3)}.health-pair b{display:block;font-size:16px;font-weight:650;margin-top:3px;color:var(--ink);white-space:nowrap}
.health-pair small{display:block;font-size:10.5px;color:var(--ink-3);margin-top:2px;line-height:1.3}
.agenda-sum{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.agenda-sum span,.agenda-sum button{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:20px;font-size:12px;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--line-2)}
.agenda-sum span.in b{color:var(--pos)}.agenda-sum span.out b{color:var(--s2)}
.agenda-sum button.late{background:var(--neg-50);border-color:transparent;color:var(--neg);font-weight:600;cursor:pointer}
.agenda{display:grid;gap:2px}
.ag-row{display:grid;grid-template-columns:42px 28px minmax(0,1fr) auto;align-items:center;gap:10px;padding:7px 6px;border-radius:10px;text-align:left;width:100%}
.ag-row:hover{background:var(--surface-2)}
.ag-date{display:grid;place-items:center;height:40px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line-2);line-height:1}
.ag-date b{font-size:15px;font-weight:700;color:var(--ink)}.ag-date small{font-size:10px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.ag-ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center}
.ag-row.in .ag-ic{background:var(--pos-50);color:var(--pos)}.ag-row.out .ag-ic{background:color-mix(in srgb,var(--s2) 12%,var(--surface));color:var(--s2)}.ag-row.tax .ag-ic{background:var(--brand-50);color:var(--brand)}
.ag-t{min-width:0}.ag-t b{display:block;font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-t small{display:block;font-size:11px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-amt{font-size:12.5px;font-weight:650;font-variant-numeric:tabular-nums;color:var(--ink)}
.ag-more{font-size:11.5px;color:var(--ink-3);padding:6px 8px}
.dashboard-plus-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr) minmax(0,1fr);gap:20px;margin-bottom:20px}
.mz .revenue-card .viz-legend{margin:0 0 4px}
@media (max-width:1250px){.dashboard-plus-row{grid-template-columns:repeat(2,minmax(0,1fr))}.dashboard-plus-row>:last-child{grid-column:1/-1}}
@media (max-width:1100px){.rpt-grid,.rpt-grid.even{grid-template-columns:minmax(0,1fr)}}
@media (max-width:760px){.dashboard-plus-row{grid-template-columns:minmax(0,1fr)}.health-pair{grid-template-columns:minmax(0,1fr)}}
@media (max-width:700px){.rpt-viz{padding:14px 12px 4px}.kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}.kt-value{font-size:18px}.hb-row{grid-template-columns:minmax(90px,40%) minmax(0,1fr) auto;gap:8px}.rf-ic{display:none}}
@media print{.rpt-viz{background:#fff}.viz-table,.viz-tip{display:none}.kpi-tile,.viz-card{box-shadow:none;break-inside:avoid}}
`;

/* ===================================================== report visuals ==== */
function PnlVisuals({ books, r, p, c, q }) {
  const prev = q || {}, cmp = !!q, vs = cmp ? `vs ${c.dates}` : null, dt = cmp ? `Compared with ${c.dates}` : undefined;
  const dl = (v, w) => (cmp ? deltaPct(v, w) : null);
  const ser = useMemo(() => periodSeries(books.flat, p.from, p.to), [books, p.from, p.to]);
  const costs = [...r.cos, ...r.exp].map((x) => ({ key: x.acc.code, label: x.acc.name, sub: x.acc.code, value: x.amount, extra: r.revenue ? ((x.amount / r.revenue) * 100).toFixed(1) + "% of sales" : null }))
    .filter((x) => x.value > 0.004).sort((a, b) => b.value - a.value);
  const unit = { day: "day", week: "week", month: "month" }[ser.g];
  return <div className="rpt-viz">
    <KpiRow>
      <KpiTile label="Revenue" value={r.revenue} icon={TrendingUp} delta={dl(r.revenue, prev.revenue)} deltaTitle={dt} sub={cmp ? `was ${money(prev.revenue, false)}` : "this period"} spark={ser.rows.map((x) => x.revenue)} />
      <KpiTile label="Gross profit" value={r.gross} icon={Layers} tone="t3" delta={dl(r.gross, prev.gross)} deltaTitle={dt} sub={cmp ? `${r.gm.toFixed(1)}% margin · was ${prev.gm.toFixed(1)}%` : `${r.gm.toFixed(1)}% gross margin`} />
      <KpiTile label="Operating expenses" value={r.expense} icon={Wallet} tone="t2" goodUp={false} delta={dl(r.expense, prev.expense)} deltaTitle={dt} sub={cmp ? `was ${money(prev.expense, false)}` : r.revenue ? `${((r.expense / r.revenue) * 100).toFixed(1)}% of revenue` : "running costs"} />
      <KpiTile label={r.net >= 0 ? "Net profit" : "Net loss"} value={r.net} icon={r.net >= 0 ? TrendingUp : TrendingDown} tone={r.net >= 0 ? "pos" : "neg"} delta={dl(r.net, prev.net)} deltaTitle={dt} sub={cmp ? `was ${money(prev.net, false)}` : `${r.nm.toFixed(1)}% net margin`} spark={ser.rows.map((x) => x.profit)} />
    </KpiRow>
    {cmp && <PnlCompareViz r={r} q={q} c={c} />}
    <div className="rpt-grid">
      <VizCard title={`Revenue, costs and profit by ${unit}`} sub={`${dmy(p.from)} – ${dmy(p.to)} · AED · hover a ${unit} for the figures`}
        legend={[{ name: "Revenue", color: "var(--s1)" }, { name: "Costs & expenses", color: "var(--s2)" }, { name: "Net profit", color: "var(--s3)", line: true }]}>
        <ColumnChart data={ser.rows} series={[{ key: "revenue", name: "Revenue", color: "var(--s1)" }, { key: "costs", name: "Costs & expenses", color: "var(--s2)" }]}
          line={{ key: "profit", name: "Net profit", color: "var(--s3)" }} ariaLabel="Revenue, costs and net profit over time" empty="No sales or costs in this period." />
        <VizTable caption="Revenue, costs and profit" cols={["Period", "Revenue", "Costs & expenses", "Net profit"]} rows={ser.rows.map((x) => [x.full, money(x.revenue, false), money(x.costs, false), money(x.profit, false)])} />
      </VizCard>
      <VizCard title="Margins" sub="How much of each dirham of sales you keep">
        <div className="meters">
          <Meter label="Gross margin" value={Math.max(0, r.gm)} max={100} text={`${r.gm.toFixed(1)}%`} tone={r.gm < 0 ? "neg" : undefined} note={`AED ${money(r.gross, false)} after cost of sales`} />
          <Meter label="Net margin" value={Math.max(0, r.nm)} max={100} text={`${r.nm.toFixed(1)}%`} tone={r.nm < 0 ? "neg" : r.nm < 5 ? "warn" : "pos"} note={`AED ${money(r.net, false)} after all costs`} />
          <Meter label="Expenses vs revenue" value={r.expense} max={Math.max(r.revenue, r.expense, 1)} text={r.revenue ? `${((r.expense / r.revenue) * 100).toFixed(1)}%` : "—"} tone={r.revenue && r.expense / r.revenue > 0.3 ? "warn" : undefined} note="Running costs as a share of sales" />
        </div>
      </VizCard>
    </div>
    <VizCard title="Where the money goes" sub="Largest cost of sales and expense accounts · share of revenue">
      <HBars rows={topN(costs, 8, "Other accounts")} color="var(--s2)" empty="No costs recorded in this period." />
    </VizCard>
  </div>;
}

/* Single-series trend: 2px line over a 10% wash, crosshair + tooltip. */
function LineChart({ data, color = "var(--s1)", height = 200, name = "Balance", format = (v) => money(v, false), ariaLabel }) {
  const [hi, setHi] = useState(null);
  const W = 720, H = height, pad = { t: 12, r: 12, b: 28, l: 52 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, n = data.length;
  if (n < 2) return <div className="viz-empty" style={{ height: 120 }}>Not enough movement to draw a trend.</div>;
  const vals = data.map((d) => d.value), hiV = Math.max(0, ...vals), loV = Math.min(0, ...vals);
  const step = niceStep((hiV - loV) / 4 || 1), max = Math.ceil(hiV / step - 1e-9) * step, min = Math.floor(loV / step + 1e-9) * step, span = max - min || 1;
  const X = (i) => pad.l + (i / (n - 1)) * iw, Y = (v) => pad.t + ih - ((v - min) / span) * ih;
  const ticks = []; for (let t = min; t <= max + step / 2; t += step) ticks.push(R2(t));
  const d = data.map((x, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(x.value).toFixed(1)).join(" ");
  const every = Math.max(1, Math.ceil(n / 8));
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); const f = ((e.clientX - r.left) / r.width) * W; setHi(Math.max(0, Math.min(n - 1, Math.round(((f - pad.l) / iw) * (n - 1))))); };
  return <div className="viz-wrap" onMouseLeave={() => setHi(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label={ariaLabel || name} onMouseMove={move}>
      {ticks.map((t, i) => <g key={i}><line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} className={Math.abs(t) < 0.004 ? "viz-base" : "viz-grid"} />
        <text x={pad.l - 8} y={Y(t) + 3.5} textAnchor="end" className="viz-tick">{short(t)}</text></g>)}
      <path d={d + ` L ${X(n - 1)} ${Y(Math.max(min, 0))} L ${X(0)} ${Y(Math.max(min, 0))} Z`} style={{ fill: color, opacity: 0.1 }} />
      <path d={d} style={{ fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }} />
      {data.map((x, i) => (i % every === 0 || i === n - 1) && <text key={i} x={X(i)} y={H - 9} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="viz-tick">{x.label}</text>)}
      <circle cx={X(n - 1)} cy={Y(data[n - 1].value)} r="4" style={{ fill: color, stroke: "var(--surface)", strokeWidth: 2 }} />
      {hi != null && <g><line x1={X(hi)} x2={X(hi)} y1={pad.t} y2={pad.t + ih} className="viz-base" />
        <circle cx={X(hi)} cy={Y(data[hi].value)} r="5" style={{ fill: color, stroke: "var(--surface)", strokeWidth: 2 }} /></g>}
    </svg>
    {hi != null && <div className="viz-tip" style={{ left: `${(X(hi) / W) * 100}%`, top: 6, transform: `translateX(${X(hi) / W > 0.7 ? "-104%" : X(hi) / W < 0.3 ? "4%" : "-50%"})` }}>
      <div className="vt-h">{data[hi].full || data[hi].label}</div><div className="vt-r"><i className="ln" style={{ background: color }} /><b>{format(data[hi].value)}</b><span>{name}</span></div></div>}
  </div>;
}

function BsVisuals({ b, books, p, q, c }) {
  const dl = (v, w) => (q ? deltaPct(v, w) : null), dt = q ? `Compared with ${c.dates}` : undefined, was = (v) => (q ? `was ${money(v, false)} on ${c.dates}` : null);
  const isCur = (g) => /current/i.test(g.name) && !/non/i.test(g.name);
  const ca = R2(b.assets.filter(isCur).reduce((s, g) => s + g.total, 0)), cl = R2(b.liab.filter(isCur).reduce((s, g) => s + g.total, 0));
  const cashOf = (bs) => R2(bs.assets.flatMap((g) => g.rows).filter((x) => ACC[x.acc.code] && ACC[x.acc.code].type === "bank").reduce((s, x) => s + x.amount, 0));
  const cash = cashOf(b), qCash = q ? cashOf(q) : 0;
  const assetRows = b.assets.flatMap((g) => g.rows).filter((x) => x.amount > 0.004).map((x) => ({ label: x.acc.name, value: x.amount })).sort((x, y) => y.value - x.value);
  const fund = [...b.liab.flatMap((g) => g.rows).filter((x) => x.amount > 0.004).map((x) => ({ label: x.acc.name, value: x.amount })).sort((x, y) => y.value - x.value)];
  const fold = (rows, n) => { const t = topN(rows, n, "Other"); return t.map((x, i) => ({ ...x, color: x.other ? OTHER : PARTS[i % PARTS.length] })); };
  const ratio = cl > 0.004 ? ca / cl : null;
  return <div className="rpt-viz">
    <KpiRow>
      <KpiTile label="Total assets" value={b.totA} icon={Layers} delta={dl(b.totA, q && q.totA)} deltaTitle={dt} sub={was(q && q.totA) || "What the business owns"} />
      <KpiTile label="Total liabilities" value={b.totL} icon={Receipt} tone="t2" goodUp={false} delta={dl(b.totL, q && q.totL)} deltaTitle={dt} sub={was(q && q.totL) || "What it owes"} />
      <KpiTile label="Net worth (equity)" value={b.totE} icon={Scale} tone={b.totE >= 0 ? "pos" : "neg"} delta={dl(b.totE, q && q.totE)} deltaTitle={dt} sub={was(q && q.totE) || (b.totA ? `${((b.totE / b.totA) * 100).toFixed(0)}% of assets` : "Owners' share")} />
      <KpiTile label="Current ratio" text={ratio == null ? "—" : ratio.toFixed(2) + "×"} icon={CircleCheck} tone={ratio == null ? "t3" : ratio >= 1.5 ? "pos" : ratio >= 1 ? "warn" : "neg"} sub={ratio == null ? "No current liabilities" : ratio >= 1.5 ? "Comfortable cover" : ratio >= 1 ? "Just covered" : "Short-term debts exceed assets"} />
      <KpiTile label="Cash & bank" value={cash} icon={Landmark} tone="t3" delta={q ? dl(cash, qCash) : null} deltaTitle={dt} sub={q ? `was ${money(qCash, false)}` : `As at ${dmy(p.asOf)}`} />
    </KpiRow>
    {q && <div className="rpt-grid even">
      <VizCard title="Then and now" sub={`AED · as at ${dmy(p.asOf)} and ${c.dates} (grey)`} legend={[{ name: `As at ${dmy(p.asOf)}`, color: "var(--s1)" }, { name: `As at ${c.dates}`, color: "var(--k0)" }]}>
        <PairBars rows={[["Total assets", b.totA, q.totA, true], ["Total liabilities", b.totL, q.totL, false], ["Net worth (equity)", b.totE, q.totE, true], ["Cash & bank", cash, qCash, true]].map(([label, cur, prev, goodUp]) => ({ label, cur, prev, goodUp }))}
          curName={`As at ${dmy(p.asOf)}`} prevName={`As at ${c.dates}`} />
      </VizCard>
      <VizCard title="Biggest changes" sub="Balances that moved most · green is good news, red is not">
        <ChangeList rows={biggest([...mergeGroups(b.assets, q.assets).flatMap((g) => g.rows).map((x) => ({ ...x, goodUp: true })), ...mergeGroups(b.liab, q.liab).flatMap((g) => g.rows).map((x) => ({ ...x, goodUp: false })), ...mergeRows(b.eqRows, q.eqRows).map((x) => ({ ...x, goodUp: true }))]
          .map((x) => ({ key: x.acc.code + x.acc.name, label: x.acc.name, cur: x.cur, prev: x.prev, goodUp: x.goodUp })))} /></VizCard>
    </div>}
    <div className="rpt-grid even">
      <VizCard title="What the business owns" sub={`Assets by account · AED ${money(b.totA, false)}`}><ShareBar parts={fold(assetRows, 6)} /></VizCard>
      <VizCard title="How it is funded" sub="Liabilities and owners' equity">
        <ShareBar parts={[{ label: "Liabilities", value: b.totL, color: "var(--s2)" }, { label: "Equity", value: Math.max(0, b.totE), color: "var(--s1)" }]} />
        <div style={{ marginTop: 14 }}><div className="micro" style={{ marginBottom: 8 }}>Largest liabilities</div>
          <HBars rows={topN(fund.map((x) => ({ ...x, key: x.label })), 5, "Other")} color="var(--s2)" empty="No liabilities." /></div>
      </VizCard>
    </div>
  </div>;
}

function AgedVisuals({ a, isAR, p, onPick }) {
  const SEV = ["var(--s1)", "var(--sev-1)", "var(--sev-2)", "var(--sev-3)", "var(--sev-3)", "var(--sev-3)"];
  const overdue = R2(a.grand - a.tot[0]), late60 = R2(a.tot[3] + a.tot[4] + a.tot[5]);
  const items = a.rows.flatMap((r) => r.items.filter((i) => daysBetween(i.due, p.asOf) > 0).map((i) => ({ ...i, days: daysBetween(i.due, p.asOf) })));
  const avgLate = items.length ? Math.round(items.reduce((s, i) => s + i.days * i.open, 0) / Math.max(0.01, items.reduce((s, i) => s + i.open, 0))) : 0;
  const parties = a.rows.slice().sort((x, y) => y.total - x.total).map((r) => ({ key: r.partner.id, label: r.partner.name, sub: `${r.items.length} open`, value: r.total,
    extra: R2(r.total - r.b[0]) > 0.004 ? `${money(R2(r.total - r.b[0]), false)} overdue` : "nothing overdue", extraTone: R2(r.total - r.b[0]) > 0.004 ? "neg" : "pos" }));
  return <div className="rpt-viz">
    <KpiRow>
      <KpiTile label={isAR ? "Customers owe you" : "You owe vendors"} value={a.grand} icon={Receipt} sub={`${a.rows.length} ${isAR ? "customer" : "vendor"}${a.rows.length === 1 ? "" : "s"}`} />
      <KpiTile label="Not yet due" value={a.tot[0]} icon={Clock} tone="t3" sub={a.grand ? `${pct(a.tot[0], a.grand)}% of the total` : ""} />
      <KpiTile label="Overdue" value={overdue} icon={AlertTriangle} tone={overdue > 0.004 ? "warn" : "pos"} sub={a.grand ? `${pct(overdue, a.grand)}% of the total` : "Nothing late"} />
      <KpiTile label="More than 60 days late" value={late60} icon={CircleAlert} tone={late60 > 0.004 ? "neg" : "pos"} sub={late60 > 0.004 ? "Chase these first" : "None"} />
      <KpiTile label="Average days late" text={items.length ? `${avgLate} days` : "—"} icon={Calendar} tone="t2" sub="Weighted by amount overdue" />
    </KpiRow>
    <div className="rpt-grid">
      <VizCard title="How late the money is" sub={`Open balance by age on ${dmy(p.asOf)} · AED`}>
        <HBars rows={a.tot.map((v, i) => ({ key: BUCKETS[i], label: i ? `${BUCKETS[i]} days` : "Not yet due", value: v, color: SEV[i], extra: a.grand ? `${pct(v, a.grand)}%` : null }))} />
      </VizCard>
      <VizCard title={isAR ? "Who owes the most" : "Who you owe the most"} sub="Largest open balances · overdue part underneath">
        <HBars rows={topN(parties, 6, isAR ? "Other customers" : "Other vendors")} onPick={onPick} empty="Nothing outstanding." />
      </VizCard>
    </div>
  </div>;
}

function ProfitVisuals({ r, isProd, q, c }) {
  const dl = (v, w) => (q ? deltaPct(v, w) : null), dt = q ? `Compared with ${c.dates}` : undefined;
  const best = r.rows.filter((x) => x.profit > 0).slice().sort((a, b) => b.profit - a.profit).map((x) => ({ key: x.key, label: x.name, sub: x.code, value: x.profit, extra: `${x.margin.toFixed(1)}% margin`, extraTone: x.margin < 0 ? "neg" : "" }));
  const thin = r.rows.filter((x) => x.revenue > 0.004).slice().sort((a, b) => a.margin - b.margin).slice(0, 6).map((x) => ({ key: x.key, label: x.name, sub: `AED ${money(x.revenue, false)} sold`, value: x.margin, color: x.margin < 0 ? "var(--neg)" : x.margin < 10 ? "var(--warn)" : "var(--s3)" }));
  return <div className="rpt-viz">
    <KpiRow>
      <KpiTile label="Revenue" value={r.t.revenue} icon={TrendingUp} delta={dl(r.t.revenue, q && q.t.revenue)} deltaTitle={dt} sub={`${r.rows.length} ${isProd ? "products" : "customers"}${q ? ` · was ${q.rows.length}` : ""}`} />
      <KpiTile label="Cost of sales" value={r.t.cost} icon={Wallet} tone="t2" goodUp={false} delta={dl(r.t.cost, q && q.t.cost)} deltaTitle={dt} sub={q ? `was ${money(q.t.cost, false)}` : "Goods at cost"} />
      <KpiTile label="Gross profit" value={r.t.profit} icon={BarChart3} tone={r.t.profit >= 0 ? "pos" : "neg"} delta={dl(r.t.profit, q && q.t.profit)} deltaTitle={dt} sub={q ? `was ${money(q.t.profit, false)}` : "Revenue minus cost of sales"} />
      <KpiTile label="Blended margin" text={`${r.margin.toFixed(1)}%`} icon={Percent} tone="t3" sub={q ? `was ${q.margin.toFixed(1)}% · ${ptsText(r.margin - q.margin)}` : best[0] ? `Best: ${best[0].label}` : ""} />
    </KpiRow>
    {q && (() => { const qk = {}; q.rows.forEach((z) => (qk[z.key] = z)); const all = [...r.rows, ...q.rows.filter((z) => !r.rows.some((y) => y.key === z.key)).map((z) => ({ ...z, revenue: 0 }))];
      const moves = all.map((x) => ({ key: x.key, label: x.name, cur: x.revenue, prev: qk[x.key] ? qk[x.key].revenue : 0 }));
      const up = biggest(moves.filter((x) => x.cur > x.prev), 6), down = biggest(moves.filter((x) => x.cur < x.prev), 6);
      return <div className="rpt-grid even">
        <VizCard title={`Growing ${isProd ? "products" : "customers"}`} sub={`Revenue change vs ${c.dates}`}><ChangeList rows={up} empty="Nothing grew compared with the earlier period." /></VizCard>
        <VizCard title={`Declining ${isProd ? "products" : "customers"}`} sub={`Revenue change vs ${c.dates}`}><ChangeList rows={down} empty="Nothing declined compared with the earlier period." /></VizCard>
      </div>; })()}
    <div className="rpt-grid">
      <VizCard title={`Top ${isProd ? "products" : "customers"} by gross profit`} sub="Profit in AED · margin underneath"><HBars rows={topN(best, 10, "Others")} empty="No profitable sales in this period." /></VizCard>
      <VizCard title="Thinnest margins" sub="Lowest gross margin first — review prices or costs"><HBars rows={thin} format={(v) => v.toFixed(1) + "%"} max={Math.max(100, ...thin.map((x) => Math.abs(x.value)))} empty="No sales in this period." /></VizCard>
    </div>
  </div>;
}

function VatVisuals({ state, v, p }) {
  const ser = useMemo(() => { const b = bucketize(p.from, p.to, "auto"); return { g: b.g, rows: b.rows.map((x) => { const t = vat201(state, x.from, x.to); return { ...x, out: t.out.vat, inp: t.inp.vat }; }) }; }, [state, p.from, p.to]);
  const due = addDays(p.to, 28), left = daysBetween(TODAY, due);
  return <div className="rpt-viz">
    <KpiRow>
      <KpiTile label="Output VAT (you charged)" value={v.out.vat} icon={ArrowUpRight} sub={`On AED ${money(v.out.net, false)} of supplies`} />
      <KpiTile label="Input VAT (you can recover)" value={v.inp.vat} icon={ArrowDownLeft} tone="t2" sub={`On AED ${money(v.inp.net, false)} of purchases`} />
      <KpiTile label={v.due >= 0 ? "Payable to the FTA" : "Refundable by the FTA"} value={Math.abs(v.due)} icon={Building2} tone={v.due >= 0 ? "neg" : "pos"} sub="Box 14" />
      <KpiTile label="Filing deadline" text={dmy(due)} icon={Calendar} tone={left < 0 ? "neg" : left <= 7 ? "warn" : "t3"} sub={left < 0 ? `${-left} days ago` : left === 0 ? "Today" : `${left} days left · 28 days after period end`} />
    </KpiRow>
    <VizCard title={`VAT charged and recoverable by ${ser.g}`} sub={`${dmy(p.from)} – ${dmy(p.to)} · AED`}
      legend={[{ name: "Output VAT", color: "var(--s1)" }, { name: "Input VAT", color: "var(--s2)" }]}>
      <ColumnChart data={ser.rows} height={210} series={[{ key: "out", name: "Output VAT", color: "var(--s1)" }, { key: "inp", name: "Input VAT", color: "var(--s2)" }]} ariaLabel="Output and input VAT over time" empty="No VAT in this period." />
      <VizTable caption="VAT by period" cols={["Period", "Output VAT", "Input VAT"]} rows={ser.rows.map((x) => [x.full, money(x.out, false), money(x.inp, false)])} />
    </VizCard>
  </div>;
}

function StockVisuals({ rows, total }) {
  const low = rows.filter((r) => r.qty > 0 && r.qty <= (r.pr.reorder ?? 5)), out = rows.filter((r) => r.qty <= 0);
  const byCat = {}; rows.forEach((r) => { const c = categoryOf(r.pr)?.name || "Uncategorised"; byCat[c] = R2((byCat[c] || 0) + r.value); });
  const cats = Object.entries(byCat).map(([label, value]) => ({ label, value })).filter((x) => x.value > 0.004).sort((a, b) => b.value - a.value);
  const top = rows.filter((r) => r.value > 0.004).sort((a, b) => b.value - a.value).map((r) => ({ key: r.pr.id, label: r.pr.name, sub: `${r.pr.code} · ${r.qty} ${r.pr.uom}`, value: r.value }));
  return <div className="rpt-viz">
    <KpiRow>
      <KpiTile label="Stock value" value={total} icon={Package} sub="At cost" />
      <KpiTile label="Products in stock" text={`${rows.filter((r) => r.qty > 0).length} of ${rows.length}`} icon={Boxes} tone="t3" sub="Storable goods" />
      <KpiTile label="Running low" text={String(low.length)} icon={AlertTriangle} tone={low.length ? "warn" : "pos"} sub="At or below the low-stock level" />
      <KpiTile label="Out of stock" text={String(out.length)} icon={CircleAlert} tone={out.length ? "neg" : "pos"} sub="Nothing on hand" />
    </KpiRow>
    <div className="rpt-grid">
      <VizCard title="Highest stock value" sub="Top products by value at cost · AED"><HBars rows={topN(top, 8, "Other products")} empty="No stock on hand." /></VizCard>
      <VizCard title="Stock by category" sub="Share of total stock value"><ShareBar parts={topN(cats.map((c) => ({ ...c, key: c.label })), 6, "Other").map((x, i) => ({ ...x, color: x.other ? OTHER : PARTS[i % PARTS.length] }))} /></VizCard>
    </div>
  </div>;
}

function TbVisuals({ tb }) {
  const diff = R2(tb.t.cd - tb.t.cc);
  return <div className="rpt-viz"><KpiRow>
    <KpiTile label="Total debits" value={tb.t.d} icon={ArrowDownLeft} sub="Movement in the period" />
    <KpiTile label="Total credits" value={tb.t.c} icon={ArrowUpRight} tone="t2" sub="Movement in the period" />
    <KpiTile label="Closing difference" value={Math.abs(diff)} icon={Math.abs(diff) < 0.01 ? CircleCheck : AlertTriangle} tone={Math.abs(diff) < 0.01 ? "pos" : "neg"} sub={Math.abs(diff) < 0.01 ? "Debits equal credits — balanced" : "Out of balance"} />
    <KpiTile label="Accounts with balances" text={String(tb.rows.length)} icon={BookOpen} tone="t3" sub="Shown below by group" />
  </KpiRow></div>;
}

function LedgerVisuals({ g, title }) {
  const pts = []; let last = null;
  g.rows.forEach((l) => { if (last && last.date === l.date) last.value = l.run; else { last = { date: l.date, label: dmy(l.date).slice(0, 6), full: dmy(l.date), value: l.run }; pts.push(last); } });
  if (pts.length) pts.unshift({ date: "", label: "Open", full: "Opening balance", value: g.open });
  return <div className="rpt-viz">
    <KpiRow>
      <KpiTile label="Opening balance" value={g.open} icon={Clock} tone="t3" sub="Brought forward" />
      <KpiTile label="Debits" value={g.d} icon={ArrowDownLeft} sub={`${g.rows.filter((l) => l.debit).length} postings`} />
      <KpiTile label="Credits" value={g.c} icon={ArrowUpRight} tone="t2" sub={`${g.rows.filter((l) => l.credit).length} postings`} />
      <KpiTile label="Closing balance" value={g.close} icon={Scale} tone={g.close < 0 ? "neg" : "pos"} sub="Carried forward" />
    </KpiRow>
    {pts.length > 2 && <VizCard title="Running balance" sub={title}><LineChart data={pts} name="Balance" ariaLabel={"Running balance — " + title} /></VizCard>}
  </div>;
}

/* ======================================================== dashboard ==== */
function DashHealth({ books, P, ar, cash, from, to, go }) {
  const days = Math.max(1, daysBetween(from, to) + 1);
  const overdue = R2(ar.grand - ar.tot[0]), onTime = ar.grand > 0.004 ? (ar.tot[0] / ar.grand) * 100 : 100;
  const dso = P.revenue > 0.004 ? Math.round((ar.grand / P.revenue) * days) : null;
  const b = balanceSheet(books.flat, to, to.slice(0, 4) + "-01-01");
  const isCur = (g) => /current/i.test(g.name) && !/non/i.test(g.name);
  const ca = b.assets.filter(isCur).reduce((s, g) => s + g.total, 0), cl = b.liab.filter(isCur).reduce((s, g) => s + g.total, 0);
  const ratio = cl > 0.004 ? ca / cl : null;
  const burn = ((P.cost + P.expense) / days) * 30, runway = burn > 0.004 ? cash / burn : null;
  return <VizCard title="Business health" sub={`${dmy(from)} – ${dmy(to)}`} right={<button className="icon-btn" title="Profit & loss" onClick={() => go("r_pnl")}><ArrowUpRight size={18} /></button>}>
    <div className="meters">
      <Meter label="Gross margin" value={Math.max(0, P.gm)} max={100} text={`${P.gm.toFixed(1)}%`} tone={P.gm < 0 ? "neg" : undefined} note="Kept from each sale after cost of goods" />
      <Meter label="Net margin" value={Math.max(0, P.nm)} max={100} text={`${P.nm.toFixed(1)}%`} tone={P.nm < 0 ? "neg" : P.nm < 5 ? "warn" : "pos"} note="Kept after every cost" />
      <Meter label="Receivables on time" value={onTime} max={100} text={`${onTime.toFixed(0)}%`} tone={onTime < 60 ? "neg" : onTime < 80 ? "warn" : "pos"} note={overdue > 0.004 ? `AED ${money(overdue, false)} is overdue` : "Nothing overdue"} />
      <div className="health-pair">
        <div><span>Days to get paid</span><b>{dso == null ? "—" : `${dso} days`}</b><small>{dso == null ? "No sales yet" : dso > 60 ? "Slow — chase overdue invoices" : dso > 40 ? "Average" : "Quick"}</small></div>
        <div><span>Current ratio</span><b>{ratio == null ? "—" : ratio.toFixed(2) + "×"}</b><small>{ratio == null ? "No short-term debts" : ratio >= 1.5 ? "Comfortable" : ratio >= 1 ? "Just covered" : "Tight"}</small></div>
        <div><span>Cash runway</span><b>{runway == null ? "—" : runway >= 24 ? "24+ months" : `${runway.toFixed(1)} months`}</b><small>At the current spending rate</small></div>
      </div>
    </div>
  </VizCard>;
}

function DashAgenda({ state, go }) {
  const end = addDays(TODAY, 14), out = [];
  const arN = aging(state, "receivable", TODAY), apN = aging(state, "payable", TODAY);
  const late = arN.rows.flatMap((r) => r.items.filter((i) => i.due < TODAY));
  arN.rows.forEach((r) => r.items.filter((i) => i.due >= TODAY && i.due <= end).forEach((i) => out.push({ date: i.due, kind: "in", icon: ArrowDownLeft, t: `Collect from ${r.partner.name}`, s: i.number, amt: i.open, go: () => go("invoices", i.id) })));
  apN.rows.forEach((r) => r.items.filter((i) => i.due >= TODAY && i.due <= end).forEach((i) => out.push({ date: i.due, kind: "out", icon: ArrowUpRight, t: `Pay ${r.partner.name}`, s: i.number, amt: i.open, go: () => go("bills", i.id) })));
  (state.pdcs || []).filter((c) => pdcOpen(c) && c.chequeDate <= end).forEach((c) => out.push({ date: c.chequeDate < TODAY ? TODAY : c.chequeDate, kind: c.kind === "in" ? "in" : "out", icon: CalendarClock,
    t: c.kind === "in" ? `Deposit cheque ${c.chequeNo}` : `Cheque ${c.chequeNo} presented`, s: `${PMAP[c.partner]?.name || ""}${c.chequeDate < TODAY ? " · past its date" : ""}`, amt: +c.amount, go: () => go("pdc") }));
  const qEnd = addDays(addMonths(soq(TODAY), 3), -1), vatDue = addDays(qEnd, 28);
  if (daysBetween(TODAY, vatDue) <= 45) out.push({ date: vatDue, kind: "tax", icon: Building2, t: "VAT return due", s: `Quarter ending ${dmy(qEnd)} · file on EmaraTax`, go: () => go("r_vat") });
  out.sort((a, b) => a.date.localeCompare(b.date));
  const tot = (k) => R2(out.filter((x) => x.kind === k).reduce((s, x) => s + (x.amt || 0), 0));
  return <VizCard title="Coming up" sub={`Next 14 days · to ${dmy(end)}`}>
    <div className="agenda-sum"><span className="in">In <b>{money(tot("in"), false)}</b></span><span className="out">Out <b>{money(tot("out"), false)}</b></span>
      {late.length > 0 && <button className="late" onClick={() => go("r_aged_ar")}>{late.length} overdue invoice{late.length === 1 ? "" : "s"} · AED {money(late.reduce((s, i) => s + i.open, 0), false)}</button>}</div>
    <div className="agenda">{out.slice(0, 7).map((x, i) => <button key={i} className={cx("ag-row", x.kind)} onClick={x.go}>
      <span className="ag-date"><b>{+x.date.slice(8)}</b><small>{MONTHS[+x.date.slice(5, 7) - 1]}</small></span>
      <span className="ag-ic"><x.icon size={15} /></span>
      <span className="ag-t"><b>{x.t}</b><small>{x.s}</small></span>
      {x.amt != null && <span className="ag-amt">{money(x.amt, false)}</span>}</button>)}
      {!out.length && <div className="viz-empty" style={{ height: 150 }}>Nothing due in the next two weeks.</div>}
      {out.length > 7 && <div className="ag-more">+ {out.length - 7} more in the next 14 days</div>}</div>
  </VizCard>;
}

function DashCategories({ state, from, to, go }) {
  const m = {};
  state.docs.filter((d) => d.state === "posted" && (d.type === "invoice" || d.type === "credit_note") && inRange(d.date, from, to)).forEach((d) => {
    const sg = d.type === "invoice" ? 1 : -1;
    amounts(d).lines.forEach((l) => { const c = PROD[l.product] ? categoryOf(PROD[l.product])?.name || "Uncategorised" : "Other"; m[c] = R2((m[c] || 0) + sg * l.amount); });
  });
  const rows = Object.entries(m).map(([label, value]) => ({ key: label, label, value })).filter((x) => x.value > 0.004).sort((a, b) => b.value - a.value);
  return <VizCard title="Sales by category" sub={`Net sales · ${dmy(from)} – ${dmy(to)}`} right={<button className="icon-btn" title="Profit by product" onClick={() => go("r_prod")}><ArrowUpRight size={18} /></button>}>
    <ShareBar parts={topN(rows, 6, "Other").map((x, i) => ({ ...x, color: x.other ? OTHER : PARTS[i % PARTS.length] }))} />
  </VizCard>;
}
