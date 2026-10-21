/* ============================================================================
   DASHBOARD 3.8 — animated overview. Numbers count up, bars grow from their
   baseline, lines draw in and cards rise into place; everything stays still
   for people who ask their system for reduced motion.
   ========================================================================== */
const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
function useCountUp(target, ms = 850) {
  const [v, setV] = useState(() => (reducedMotion() ? target : 0));
  const shown = React.useRef(reducedMotion() ? target : 0);
  React.useEffect(() => {
    if (reducedMotion() || !Number.isFinite(target)) { shown.current = target; setV(target); return; }
    const start = shown.current, t0 = performance.now(); let raf;
    const tick = (t) => { const f = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - f, 3); const x = start + (target - start) * e; shown.current = x; setV(x); if (f < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
/* Counts up once the figure is on screen, so numbers further down still animate when you reach them. */
const CountUp = ({ value, format = (x) => money(x, false) }) => {
  const ref = React.useRef(null), seen = useInView(ref, "0px");
  const v = useCountUp(seen ? +value || 0 : 0);
  return <span ref={ref} className="countup">{format(seen && Math.abs(v - value) < 0.005 ? value : v)}</span>; };

/* Units sold, value, cover and last sale for every stocked product. */
function stockMovement(state, books, stock, from, to) {
  const days = Math.max(1, daysBetween(from, to) + 1), sold = {}, last = {};
  state.docs.filter((d) => d.state === "posted" && (d.type === "invoice" || d.type === "credit_note") && d.date <= to).forEach((d) => {
    const sg = d.type === "invoice" ? 1 : -1, inP = d.date >= from;
    amounts(d).lines.forEach((l) => {
      if (!PROD[l.product] || PROD[l.product].kind !== "goods") return;
      if (sg > 0 && (!last[l.product] || d.date > last[l.product])) last[l.product] = d.date;
      if (inP) { const r = sold[l.product] || (sold[l.product] = { qty: 0, value: 0 }); r.qty = R2(r.qty + sg * +l.qty); r.value = R2(r.value + sg * l.amount); }
    });
  });
  return PRODUCTS.filter((p) => p.kind === "goods").map((p) => {
    const s = sold[p.id] || { qty: 0, value: 0 }, st = stock[p.id] || { qty: 0, value: 0 };
    const perDay = s.qty > 0 ? s.qty / days : 0, cover = perDay > 0 ? st.qty / perDay : null, since = last[p.id] ? daysBetween(last[p.id], to) : null;
    const cls = st.qty <= 0 ? (s.qty > 0 ? "fast" : "none") : s.qty <= 0 ? "dead" : cover <= 30 ? "fast" : cover <= 90 ? "normal" : "slow";
    return { p, qty: s.qty, value: s.value, perMonth: perDay * 30, stockQty: st.qty, stockValue: R2(st.value), cover, since, last: last[p.id], cls };
  });
}

function FastMovers({ rows, go, from, to }) {
  const fast = rows.filter((r) => r.qty > 0).sort((a, b) => b.qty - a.qty || b.value - a.value).slice(0, 6), max = Math.max(1, ...fast.map((r) => r.qty));
  return <section className="viz-card dash-list">
    <header><div><h3><span className="hd-ic fast"><Zap size={15} /></span>Fast-moving items</h3><p>Most units sold · {dmy(from)} – {dmy(to)}</p></div>
      <button className="icon-btn" title="Profit by product" onClick={() => go("r_prod")}><ArrowUpRight size={18} /></button></header>
    <div className="mv-list">{fast.map((r, i) => {
      const tone = r.stockQty <= 0 ? "bad" : r.cover != null && r.cover < 14 ? "bad" : r.cover != null && r.cover < 30 ? "warn" : "ok";
      return <button key={r.p.id} className="mv-row" onClick={() => go("products", r.p.id)} style={{ "--i": i }}>
        <span className="mv-rank">{i + 1}</span>
        <span className="mv-main"><b>{r.p.name}</b><small>{r.p.code} · AED {money(r.value, false)} sold</small>
          <span className="mv-bar"><i style={{ width: (r.qty / max) * 100 + "%" }} /></span></span>
        <span className="mv-side"><b>{R2(r.qty)} <small>{r.p.uom.toLowerCase()}</small></b>
          <em className={tone}>{r.stockQty <= 0 ? "Out of stock" : r.cover == null ? "—" : r.cover < 14 ? `${Math.round(r.cover)} days left · reorder` : `${Math.round(r.cover)} days of stock`}</em></span>
      </button>; })}
      {!fast.length && <div className="viz-empty" style={{ height: 180 }}>No goods sold in this period yet.</div>}</div>
  </section>;
}

function SlowMovers({ rows, go, to }) {
  const CLS = [["fast", "Fast", "var(--pos)"], ["normal", "Steady", "var(--s1)"], ["slow", "Slow", "var(--warn)"], ["dead", "Not moving", "var(--neg)"]];
  const parts = CLS.map(([k, label, color]) => ({ label, color, value: R2(rows.filter((r) => r.cls === k).reduce((s, r) => s + r.stockValue, 0)) }));
  const slow = rows.filter((r) => r.stockQty > 0 && (r.cls === "dead" || r.cls === "slow")).sort((a, b) => (a.cls === b.cls ? b.stockValue - a.stockValue : a.cls === "dead" ? -1 : 1)).slice(0, 5);
  const tied = R2(rows.filter((r) => r.cls === "dead" || r.cls === "slow").reduce((s, r) => s + r.stockValue, 0));
  return <section className="viz-card dash-list">
    <header><div><h3><span className="hd-ic slow"><Clock size={15} /></span>Slow-moving items</h3><p>Stock that is not selling · AED {money(tied, false)} tied up</p></div>
      <button className="icon-btn" title="Inventory valuation" onClick={() => go("r_stock")}><ArrowUpRight size={18} /></button></header>
    <div className="mv-share"><ShareBar parts={parts} legend={false} height={10} />
      <div className="mv-keys">{parts.map((x) => <span key={x.label}><i style={{ background: x.color }} />{x.label} <b>{money(x.value, false)}</b></span>)}</div></div>
    <div className="mv-list">{slow.map((r, i) => <button key={r.p.id} className="mv-row" onClick={() => go("products", r.p.id)} style={{ "--i": i }}>
      <span className={cx("mv-rank", r.cls)}>{r.cls === "dead" ? <Ban size={13} /> : <Clock size={13} />}</span>
      <span className="mv-main"><b>{r.p.name}</b><small>{r.stockQty} {r.p.uom.toLowerCase()} on hand · {r.last ? `last sold ${r.since} days ago` : "never sold"}</small></span>
      <span className="mv-side"><b>{money(r.stockValue, false)}</b><em className={r.cls === "dead" ? "bad" : "warn"}>{r.cls === "dead" ? "Not moving" : `${Math.round(r.cover)} days of stock`}</em></span>
    </button>)}
      {!slow.length && <div className="viz-empty" style={{ height: 150 }}>Every stocked item sold in this period — nothing is sitting idle.</div>}</div>
    <p className="mv-note">Fast: under 30 days of stock at the current sales rate · Slow: over 90 days · Not moving: no sales in the period.</p>
  </section>;
}

function TopCustomers({ state, ar, from, to, go }) {
  const data = useMemo(() => {
    const m = {}, b = bucketize(from, to, "auto");
    state.docs.filter((d) => d.state === "posted" && (d.type === "invoice" || d.type === "credit_note") && inRange(d.date, from, to)).forEach((d) => {
      const sg = d.type === "invoice" ? 1 : -1, net = amounts(d).net * sg;
      const r = m[d.partner] || (m[d.partner] = { id: d.partner, value: 0, n: 0, last: "", spark: b.rows.map(() => 0) });
      r.value = R2(r.value + net); if (sg > 0) { r.n++; if (d.date > r.last) r.last = d.date; }
      const k = b.rows.findIndex((x) => d.date >= x.from && d.date <= x.to); if (k >= 0) r.spark[k] += net;
    });
    const all = Object.values(m), total = all.reduce((s, r) => s + Math.max(0, r.value), 0);
    return { total, rows: all.filter((r) => r.value > 0.004).sort((a, b) => b.value - a.value).slice(0, 6) };
  }, [state, from, to]);
  const owe = {}; ar.rows.forEach((r) => (owe[r.partner.id] = { total: r.total, late: R2(r.total - r.b[0]) }));
  return <section className="viz-card dash-list">
    <header><div><h3><span className="hd-ic cust"><Users size={15} /></span>Top customers</h3><p>By net sales · AED {money(data.total, false)} from all customers</p></div>
      <button className="icon-btn" title="Profit by customer" onClick={() => go("r_cust")}><ArrowUpRight size={18} /></button></header>
    <div className="mv-list">{data.rows.map((r, i) => { const o = owe[r.id];
      return <button key={r.id} className="mv-row cust" onClick={() => go("r_partner", r.id)} style={{ "--i": i }}>
        <span className={cx("mv-medal", i < 3 && "m" + i)}>{i + 1}</span>
                <span className="mv-main"><b>{PMAP[r.id]?.name || r.id}</b><small>{r.n} invoice{r.n === 1 ? "" : "s"}{r.last ? ` · last ${dmy(r.last).slice(0, 6)}` : ""} · {data.total ? Math.round((r.value / data.total) * 100) : 0}% of sales</small>
          <span className="mv-bar cust"><i style={{ width: (r.value / (data.rows[0]?.value || 1)) * 100 + "%" }} /></span></span>
        {r.spark.length > 2 && <MiniSpark data={r.spark} w={52} h={22} />}
        <span className="mv-side"><b>{money(r.value, false)}</b>
          <em className={o && o.late > 0.004 ? "bad" : o && o.total > 0.004 ? "warn" : "ok"}>{o && o.late > 0.004 ? `${money(o.late, false)} overdue` : o && o.total > 0.004 ? `${money(o.total, false)} open` : "Paid up"}</em></span>
      </button>; })}
      {!data.rows.length && <div className="viz-empty" style={{ height: 180 }}>Post an invoice to start ranking customers.</div>}</div>
  </section>;
}

function DashHero({ user, company, range, setRange, mode, setMode, P, prior, comparable, cash, cashSeries, movement, newDoc, go, label, drafts, low, invoices = 0 }) {
  const now = new Date(TODAY + "T12:00:00Z");
  const dayName = now.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const d = comparable && Math.abs(prior.net) > 0.004 ? ((P.net - prior.net) / Math.abs(prior.net)) * 100 : null;
  const cmax = Math.max(1, ...cashSeries.map((x) => Math.abs(x))), W = 260, H = 64;
  const pts = cashSeries.map((v, i) => [(i / Math.max(1, cashSeries.length - 1)) * W, H - 6 - (Math.max(0, v) / cmax) * (H - 14)]);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  /* Year to date: where sales are heading if the daily rate holds. */
  const yr = TODAY.slice(0, 4), elapsed = daysBetween(yr + "-01-01", range.to) + 1, yearDays = daysBetween(yr + "-01-01", yr + "-12-31") + 1;
  const pace = range.preset === "ytd" && P.revenue > 0.004 && elapsed >= 30 ? (P.revenue / elapsed) * yearDays : null;
  return <section className="dash-hero">
    <div className="dh-glow g1" /><div className="dh-glow g2" /><div className="dh-grid" /><HeroParticles /><div className="dh-sheen" />
    <div className="dh-top">
      <div className="dh-status"><span className="dh-live"><i />{dayName}, {dmy(TODAY)} · Live from your books</span>
        {drafts > 0 && <button className="dh-pill" onClick={() => go("invoices")}><b>{drafts}</b> draft{drafts === 1 ? "" : "s"}</button>}
        {low > 0 && <button className="dh-pill" onClick={() => go("products", "__low_stock__")}><b>{low}</b> low stock</button>}
        {pace != null && <span className="dh-pill pace" title="Sales so far this year, carried to the year end at the same daily rate"><TrendingUp size={13} /> On pace for <b>AED {short(pace)}</b> sales in {yr}</span>}</div>
      <div className="dh-ctrl">
        <div className="seg dh-seg" aria-label="Dashboard period">{[["mtd", "Month"], ["qtd", "Quarter"], ["ytd", "Year"], ["d365", "12 months"]].map(([key, l]) =>
          <button key={key} className={range.preset === key ? "on" : ""} onClick={() => { const [f, t] = PRESETS.find((x) => x[0] === key)[2](); setRange({ ...range, preset: key, from: f, to: t }); }}>{l}</button>)}</div>
        <RangePicker value={range} onChange={(r) => setRange({ ...range, ...r })} />
        <BranchPick dark value={range.branch} onChange={(b) => setRange({ ...range, branch: b })} />
        <div className="seg dh-seg">{[["overview", "Overview"], ["detail", "Financial detail"]].map(([k, l]) => <button key={k} className={mode === k ? "on" : ""} onClick={() => { setMode(k); scrollPageTop(); }}>{l}</button>)}</div>
      </div>
    </div>
    <div className="dh-body">
      <div className="dh-left">
        <h1>{greeting()}, {user.name.split(" ")[0]}<span className="wave" aria-hidden="true">.</span></h1>
        <p className="dh-sub">Here’s how {(LOCK_BRANCH || range.branch) && BR[LOCK_BRANCH || range.branch] ? `${company.name} · ${BR[LOCK_BRANCH || range.branch].name}` : company.name} is doing {label}.</p>
        <div className="dh-figures">
          <div className="dh-main"><span>{P.net < 0 ? "Net loss" : "Net profit"}</span>
            <b><small>AED</small><CountUp value={P.net} /></b>
            {d != null && <em className={d >= 0 ? "up" : "down"}>{d >= 0 ? "▲" : "▼"} {Math.abs(d) >= 1000 ? ">999" : Math.abs(d).toFixed(1)}% vs previous period</em>}</div>
          <div className="dh-mini"><span>Invoices issued</span><b><CountUp value={invoices} format={(x) => String(Math.round(x))} /></b></div>
          <div className="dh-mini"><span>Gross margin</span><b><CountUp value={P.gm} format={(x) => x.toFixed(1) + "%"} /></b></div>
          <div className="dh-mini"><span>Net margin</span><b><CountUp value={P.nm} format={(x) => x.toFixed(1) + "%"} /></b></div>
        </div>
        <div className="dh-actions">
          {[[FileText, "New invoice", () => newDoc("invoice")], [ShoppingCart, "New bill", () => newDoc("bill")], [ArrowDownLeft, "Receive payment", () => go("payments")], [Boxes, "Stock count", () => go("stock_count")]].map(([I, l, f]) =>
            <button key={l} onClick={f}><I size={16} />{l}</button>)}
        </div>
      </div>
      <div className="dh-cash">
        <div className="dc-top"><span className="dc-ic"><Landmark size={17} /></span><span>Cash & bank</span><button onClick={() => go("banking")} title="Open banking"><ArrowUpRight size={16} /></button></div>
        <div className="dc-value"><small>AED</small><CountUp value={cash} /></div>
        <div className="dc-spark-wrap">
        <svg className="dc-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="dcfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
          {pts.length > 1 && <><path className="dc-area" d={path + ` L ${W} ${H} L 0 ${H} Z`} fill="url(#dcfill)" /><path className="dc-line" pathLength="1" d={path} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></>}
        </svg>
        {pts.length > 1 && <i className="dc-dot" style={{ left: `${(pts[pts.length - 1][0] / W) * 100}%`, top: `${(pts[pts.length - 1][1] / H) * 100}%` }} />}
        </div>
        <div className="dc-flow"><span><i className="in" />In <b>{money(movement.incoming, false)}</b></span><span><i className="out" />Out <b>{money(movement.outgoing, false)}</b></span></div>
      </div>
    </div>
  </section>;
}

const DASH_CSS = `
/* entrance motion */
@keyframes dashRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes barGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes barGrowX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes lineDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes reveal{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes glowDrift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-24px) scale(1.12)}100%{transform:translate(0,0) scale(1)}}
@keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes livePulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}70%{box-shadow:0 0 0 9px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
.dash2 .dash-kpis>*,.dash2 .dash-row>*{animation:dashRise .55s var(--ease) backwards}
.dash2 .dash-kpis>:nth-child(2){animation-delay:.05s}.dash2 .dash-kpis>:nth-child(3){animation-delay:.1s}.dash2 .dash-kpis>:nth-child(4){animation-delay:.15s}.dash2 .dash-kpis>:nth-child(5){animation-delay:.2s}
.dash2 .dash-row>:nth-child(2){animation-delay:.08s}.dash2 .dash-row>:nth-child(3){animation-delay:.16s}
.viz-svg .viz-bar{transform-box:fill-box;transform-origin:50% 100%;animation:barGrow .7s var(--ease) both;animation-delay:calc(var(--d,0) * 28ms)}
.viz-svg .viz-bar.neg{transform-origin:50% 0}
.viz-svg .viz-line{stroke-dasharray:1;animation:lineDraw 1.1s .35s var(--ease) both}
.hb-track i,.mv-bar i,.mt-track i{transform-origin:0 50%;animation:barGrowX .8s var(--ease) both}
.share-bar i{transform-origin:0 50%;animation:barGrowX .7s var(--ease) both}
.kt-spark,.dc-spark{animation:reveal 1.2s .2s var(--ease) both}
.kpi-tile .countup,.dc-value .countup,.dh-figures .countup{font-variant-numeric:tabular-nums}

/* hero banner */
.dash-hero{position:relative;overflow:hidden;border-radius:24px;padding:22px 26px 24px;margin:22px 0 18px;color:#fff;isolation:isolate;
  background:linear-gradient(120deg,var(--sb-2) 0%,var(--sb-1) 35%,var(--pri-b) 75%,var(--pri-a) 100%);background-size:180% 180%;animation:gradShift 18s ease-in-out infinite;
  box-shadow:0 22px 50px var(--pri-sh),inset 0 1px 0 rgba(255,255,255,.12)}
.dh-glow{position:absolute;border-radius:50%;filter:blur(40px);opacity:.55;z-index:-1;pointer-events:none;animation:glowDrift 14s ease-in-out infinite}
.dh-glow.g1{width:320px;height:320px;right:8%;top:-120px;background:var(--sb-acc)}
.dh-glow.g2{width:260px;height:260px;left:30%;bottom:-160px;background:var(--s3);animation-duration:18s;animation-direction:reverse;opacity:.4}
.dh-grid{position:absolute;inset:0;z-index:-1;opacity:.12;pointer-events:none;
  background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:34px 34px;
  -webkit-mask-image:radial-gradient(ellipse at 70% 30%,#000 10%,transparent 70%);mask-image:radial-gradient(ellipse at 70% 30%,#000 10%,transparent 70%)}
.dh-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.dh-live{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:500;color:rgba(255,255,255,.82);letter-spacing:.01em}
.dh-live i{width:8px;height:8px;border-radius:50%;background:#4ADE80;animation:livePulse 2s infinite}
.dh-ctrl{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mz .dh-seg{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18)}
.mz .dh-seg button{color:rgba(255,255,255,.85)}
.mz .dh-seg button.on{background:#fff;color:var(--sb-2);box-shadow:0 4px 12px rgba(0,0,0,.18)}
.dash-hero .dh-ctrl .btn{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:#fff}
.dash-hero .dh-ctrl .btn svg{color:#fff}
.dh-body{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(260px,1fr);gap:24px;margin-top:16px;align-items:stretch}
.dh-left h1{font-size:30px;font-weight:700;letter-spacing:-.035em;line-height:1.1;color:#fff}
.dh-left h1 .wave{color:var(--sb-acc)}
.dh-sub{margin-top:6px;font-size:14px;color:rgba(255,255,255,.78)}
.dh-figures{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:flex-end;margin-top:20px}
.dh-main>span,.dh-mini>span{display:block;font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.dh-main b{display:flex;align-items:baseline;gap:7px;font-size:40px;font-weight:700;letter-spacing:-.04em;line-height:1.05;margin-top:4px}
.dh-main b small{font-size:14px;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:.02em}
.dh-main em{display:inline-block;margin-top:6px;font-style:normal;font-size:12px;font-weight:650;padding:3px 9px;border-radius:20px;background:rgba(74,222,128,.18);color:#BBF7D0}
.dh-main em.down{background:rgba(248,113,113,.2);color:#FECACA}
.dh-mini{padding-left:20px;border-left:1px solid rgba(255,255,255,.18)}
.dh-mini b{display:block;font-size:20px;font-weight:650;letter-spacing:-.02em;margin-top:5px}
.dh-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.dh-actions button{display:inline-flex;align-items:center;gap:7px;height:35px;padding:0 12px;border-radius:11px;font-size:12.5px;font-weight:600;color:var(--sb-2);background:#fff;box-shadow:0 6px 16px rgba(0,0,0,.18);transition:transform .15s,box-shadow .15s}
.dh-actions button:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,.22)}
.dh-status{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dh-pill{height:24px;padding:0 10px;border-radius:20px;font-size:11.5px;font-weight:600;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);transition:background .15s}
.dh-pill:hover{background:rgba(255,255,255,.22)}.dh-pill b{color:var(--sb-acc);margin-right:2px}
.dh-cash{position:relative;display:flex;flex-direction:column;border-radius:18px;padding:16px 18px 14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
  backdrop-filter:blur(14px) saturate(1.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
.dc-top{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:rgba(255,255,255,.88)}
.dc-ic{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.16)}
.dc-top button{margin-left:auto;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.12)}
.dc-top button:hover{background:rgba(255,255,255,.24)}
.dc-value{display:flex;align-items:baseline;gap:7px;margin-top:12px;font-size:32px;font-weight:700;letter-spacing:-.035em}
.dc-value small{font-size:12px;font-weight:600;color:rgba(255,255,255,.7)}
.dc-spark{width:100%;height:64px;margin-top:auto;display:block}
.dc-flow{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:rgba(255,255,255,.78);margin-top:6px}
.dc-flow i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.dc-flow i.in{background:#4ADE80}.dc-flow i.out{background:#FCA5A5}
.dc-flow b{color:#fff;font-weight:650}

/* rows */
.dash-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:18px}
.dash-row{display:grid;gap:18px;margin-bottom:18px}
.dash-row.r21{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
.dash-row.r111{grid-template-columns:repeat(3,minmax(0,1fr))}
.dash-row>.card{margin:0}
.dash2 .viz-card,.dash2 .card{transition:box-shadow .2s,transform .2s,border-color .2s}
.dash2 .viz-card:hover,.dash2 .dash-row>.card:hover{box-shadow:0 14px 34px rgba(19,26,43,.09);border-color:var(--brand-100)}
.dash-list header h3{display:flex;align-items:center;gap:9px}
.hd-ic{width:28px;height:28px;border-radius:9px;display:grid;place-items:center}
.hd-ic.fast{background:var(--pos-50);color:var(--pos)}.hd-ic.slow{background:var(--warn-50);color:var(--warn)}.hd-ic.cust{background:var(--brand-50);color:var(--brand)}
.mv-list{display:grid;gap:2px}
.mv-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 6px;border-radius:11px;text-align:left;width:100%;transition:background .15s,transform .15s;
  animation:dashRise .45s var(--ease) backwards;animation-delay:calc(.25s + var(--i,0) * 50ms)}
.mv-row.cust{grid-template-columns:24px minmax(0,1fr) auto auto}
.mv-bar.cust i{background:linear-gradient(90deg,var(--pri-a),var(--s1))}
@media (max-width:1500px){.mv-row.cust .kt-spark{display:none}.mv-row.cust{grid-template-columns:24px minmax(0,1fr) auto}}
.mv-row:hover{background:var(--surface-2);transform:translateX(2px)}
.mv-rank{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--surface-3);color:var(--ink-2)}
.mv-row:first-child .mv-rank:not(.dead):not(.slow){background:linear-gradient(140deg,var(--pri-a),var(--pri-b));color:#fff}
.mv-rank.dead{background:var(--neg-50);color:var(--neg)}.mv-rank.slow{background:var(--warn-50);color:var(--warn)}
.mv-medal{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;background:var(--surface-3);color:var(--ink-3)}
.mv-medal.m0{background:linear-gradient(140deg,#FDE68A,#D4A017);color:#5B4300}.mv-medal.m1{background:linear-gradient(140deg,#F1F5F9,#A7B0BE);color:#2E3643}.mv-medal.m2{background:linear-gradient(140deg,#F5C9A0,#B86B2E);color:#4A2508}
.mv-main{min-width:0}.mv-main b{display:block;font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mv-main small{display:block;font-size:11px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.mv-bar{display:block;height:5px;border-radius:4px;background:var(--surface-3);margin-top:6px;overflow:hidden}
.mv-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--pos),color-mix(in srgb,var(--pos) 55%,var(--s1)))}
.mv-side{text-align:right;min-width:0}.mv-side b{display:block;font-size:13px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.mv-side b small{font-size:10.5px;font-weight:500;color:var(--ink-3)}
.mv-side em{display:inline-block;margin-top:3px;font-style:normal;font-size:10.5px;font-weight:650;padding:1px 7px;border-radius:20px;white-space:nowrap}
.mv-side em.ok{background:var(--pos-50);color:var(--pos)}.mv-side em.warn{background:var(--warn-50);color:var(--warn)}.mv-side em.bad{background:var(--neg-50);color:var(--neg)}
.mv-row .kt-spark{width:52px;height:22px;margin:0}
.mv-share{padding:2px 0 8px;margin-bottom:6px;border-bottom:1px solid var(--line-2)}
.mv-keys{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:11px;color:var(--ink-3)}
.mv-keys i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px}.mv-keys b{color:var(--ink-2);font-weight:600;font-variant-numeric:tabular-nums}
.mv-note{font-size:10.5px;color:var(--ink-4);margin-top:8px;line-height:1.4}
.dash2 .dashboard-footer{margin-top:4px}
.dash-row.r21 .flow-totals{grid-template-columns:1fr 1fr;gap:12px}
.dash-row.r21 .flow-totals>div:last-child{grid-column:1/-1;border-left:0;padding-left:0;border-top:1px solid var(--line-2);padding-top:10px}
.dash-row.r21 .flow-totals b{font-size:19px}
.dash-kpis .kpi-tile{padding:16px 18px 14px;border-radius:18px;gap:7px}
.dash-kpis .kpi-tile::after{width:100%;height:3px;bottom:auto;opacity:.9}
.dash-kpis .kt-ic{width:32px;height:32px;border-radius:10px}
.dash-kpis .kt-value{font-size:21px;font-weight:700}
.dash-kpis .kt-spark{height:34px;margin-top:auto}
.kt-meter{height:6px;border-radius:4px;background:var(--surface-3);overflow:hidden;margin-top:auto}
.kt-meter i{display:block;height:100%;border-radius:4px;background:var(--s1);transform-origin:0 50%;animation:barGrowX .9s .2s var(--ease) both}
.kt-meter.warn i{background:var(--warn)}.kt-meter.pos i{background:var(--pos)}
.dash-recv .collection-list button{min-width:0}

@media (max-width:1300px){.dash-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.dash-row.r111{grid-template-columns:repeat(2,minmax(0,1fr))}.dash-row.r111>:last-child{grid-column:1/-1}}
@media (max-width:1050px){.dash-row.r21{grid-template-columns:minmax(0,1fr)}.dh-body{grid-template-columns:minmax(0,1fr)}}
@media (max-width:760px){.dash-hero{padding:18px 16px;border-radius:18px;margin-top:14px}.dh-left h1{font-size:24px}.dh-main b{font-size:32px}.dh-mini{padding-left:14px}
  .dash-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dash-kpis>:last-child{grid-column:1/-1}.dash-row.r111{grid-template-columns:minmax(0,1fr)}.dh-ctrl{width:100%}
  .dash-kpis .kpi-tile{padding:14px 14px 12px}.dash-kpis .kt-value{font-size:17px}.dash-kpis .kt-value small{display:none}}
@media (prefers-reduced-motion:reduce){.dash-hero,.dh-glow,.dh-live i,.dash2 .dash-kpis>*,.dash2 .dash-row>*,.mv-row,.viz-svg .viz-bar,.viz-svg .viz-line,.hb-track i,.mv-bar i,.mt-track i,.share-bar i,.kt-spark,.dc-spark,.kt-meter i{animation:none!important}}
@media print{.dash-hero{animation:none;box-shadow:none}.dh-glow,.dh-grid{display:none}}
`;
