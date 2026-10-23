/* ============================================================================
   3.14 — dashboard motion. Every section waits until it scrolls into view and
   then plays its entrance (cards rise, bars grow, lines draw, numbers count
   up), so animations are seen rather than finished off-screen. Cards carry a
   soft light that follows the pointer; sales by category is a donut that
   draws itself; business health shows ring gauges. Everything stays still
   for people who ask their system for reduced motion, and in print.
   ========================================================================== */

/* True once the element has been on screen (or at once when motion is reduced). */
function useInView(ref, margin = "0px 0px -6% 0px") {
  const [seen, setSeen] = useState(() => reducedMotion() || typeof IntersectionObserver === "undefined");
  React.useEffect(() => {
    if (seen) return;
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return seen;
}

/* Sections hold their entrance until they are scrolled to; cards light up under the pointer. */
function useDashMotion(rootRef, deps) {
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion() || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    root.querySelectorAll(".dash-kpis > *, .dash-row > *, .ds-fields > *, .dash-reveal").forEach((el) => {
      if (el.classList.contains("in")) return;
      el.classList.add("rv"); io.observe(el);
    });
    return () => io.disconnect();
  }, deps);
  return (e) => {
    const c = e.target && e.target.closest && e.target.closest(".kpi-tile, .ds-field, .viz-card, .dash-row > .card");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${Math.round(e.clientX - r.left)}px`);
    c.style.setProperty("--my", `${Math.round(e.clientY - r.top)}px`);
  };
}

/* A donut that draws itself; hovering a slice or its legend row highlights both. */
function DrawDonut({ parts, total, label = "Total", format = (v) => money(v, false) }) {
  const [hi, setHi] = useState(null);
  const ref = React.useRef(null), seen = useInView(ref);
  const size = 176, stroke = 24, r = (size - stroke) / 2, C = 2 * Math.PI * r, sum = parts.reduce((s, p) => s + p.value, 0) || 1;
  const gap = parts.length > 1 ? 2.5 : 0;
  let acc = 0;
  const segs = parts.map((p) => { const len = (p.value / sum) * C, s = { ...p, len, off: acc }; acc += len; return s; });
  const cur = hi != null ? segs[hi] : null;
  return <div className={cx("donut-box", seen && "in")} ref={ref}><div className="donut-in">
    <div className="donut-fig">
      <svg viewBox={`0 0 ${size} ${size}`} className="donut" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={r} className="donut-track" strokeWidth={stroke} />
        {segs.map((s, i) => <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
          strokeWidth={hi === i ? stroke + 6 : stroke} strokeDasharray={`${Math.max(0.5, s.len - gap)} ${C}`} strokeDashoffset={-s.off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className={cx("donut-seg", hi != null && hi !== i && "dim")} style={{ "--i": i }}
          onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />)}
      </svg>
      <div className="donut-mid">{cur ? <><small>{cur.label}</small><b>{((cur.value / sum) * 100).toFixed(0)}%</b><span>AED {format(cur.value)}</span></>
        : <><small>{label}</small><b className="sm">{seen ? <CountUp value={total} format={(x) => short(x)} /> : "0"}</b><span>AED</span></>}</div>
    </div>
    <div className="donut-legend">{segs.map((s, i) => <button key={s.key} className={cx("dl-row", hi === i && "on", hi != null && hi !== i && "dim")} style={{ "--i": i }}
      onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)}>
      <i style={{ background: s.color }} /><span>{s.label}</span><b>{format(s.value)}</b><em>{((s.value / sum) * 100).toFixed(0)}%</em></button>)}</div>
  </div></div>;
}

/* A ring that fills to a percentage, with the figure counting up in the middle. */
function RingGauge({ value, label, note, tone, suffix = "%", digits = 1 }) {
  const ref = React.useRef(null), seen = useInView(ref);
  const size = 96, stroke = 9, r = (size - stroke) / 2, C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, (+value || 0) / 100));
  return <div className={cx("ring", tone, seen && "in")} ref={ref}>
    <div className="ring-fig">
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-val" strokeWidth={stroke} strokeDasharray={`${f * C} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <b>{seen ? <CountUp value={value} format={(x) => x.toFixed(digits) + suffix} /> : (0).toFixed(digits) + suffix}</b>
    </div>
    <span className="ring-l">{label}</span>
    <small>{note}</small>
  </div>;
}

/* Small lights drifting up through the dashboard banner. */
const HeroParticles = () => <div className="dh-sparks" aria-hidden="true">{Array.from({ length: 14 }, (_, i) =>
  <i key={i} style={{ left: `${(i * 37) % 100}%`, "--s": `${2 + (i % 3)}px`, "--t": `${9 + (i * 7) % 8}s`, "--dl": `${-(i * 1.3).toFixed(1)}s`, "--x": `${((i % 5) - 2) * 14}px` }} />)}</div>;

const MOTION_CSS = `
/* sections play their entrance when they scroll into view */
.dash2 .rv:not(.in),.dash2 .rv:not(.in) *{animation-play-state:paused!important}
.dash2 .rv:not(.in){opacity:0}
.dash2 .rv.in{animation:dashRise .6s var(--ease) both}
.dash2 .dash-row>.rv.in:nth-child(2),.dash2 .dash-kpis>.rv.in:nth-child(2){animation-delay:.07s}
.dash2 .dash-row>.rv.in:nth-child(3),.dash2 .dash-kpis>.rv.in:nth-child(3){animation-delay:.14s}
.dash2 .dash-kpis>.rv.in:nth-child(4){animation-delay:.21s}
.dash2 .dash-kpis>.rv.in:nth-child(5){animation-delay:.28s}

/* a soft light follows the pointer across cards */
.dash2 .kpi-tile,.dash2 .viz-card,.dash2 .dash-row>.card{isolation:isolate;transition:transform .25s var(--ease),box-shadow .25s var(--ease),border-color .25s}
.dash2 .viz-card,.dash2 .dash-row>.card{position:relative}
.dash2 .viz-card::before,.dash2 .dash-row>.card::before,.dash2 .kpi-tile::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;opacity:0;transition:opacity .3s;
  background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),color-mix(in srgb,var(--brand) 10%,transparent),transparent 62%)}
.dash2 .viz-card:hover::before,.dash2 .dash-row>.card:hover::before,.dash2 .kpi-tile:hover::before{opacity:1}
.dash2 .viz-card:hover,.dash2 .dash-row>.card:hover{box-shadow:0 18px 40px -26px color-mix(in srgb,var(--brand) 55%,transparent),var(--sh-1);border-color:color-mix(in srgb,var(--brand) 22%,var(--line))}
.dash2 .kpi-tile.click:hover{transform:translateY(-3px);box-shadow:0 16px 34px -22px color-mix(in srgb,var(--brand) 60%,transparent),var(--sh-1)}
.dash2 .kpi-tile.click:hover .kt-ic{animation:icWiggle .6s var(--ease)}
@keyframes icWiggle{0%,100%{transform:none}30%{transform:rotate(-10deg) scale(1.1)}60%{transform:rotate(6deg) scale(1.05)}}

/* sparklines draw from left to right */
.kt-spark .ks-line{stroke-dasharray:1;animation:lineDraw 1.3s .35s var(--ease) both}
.kt-spark .ks-area{animation:ksFade 1s .9s ease both}
@keyframes ksFade{from{opacity:0}to{opacity:.1}}
.dc-spark .dc-line{stroke-dasharray:1;animation:lineDraw 1.6s .5s var(--ease) both}
.dc-spark .dc-area{animation:siFade 1.2s 1.2s ease both}
.mz .kt-spark,.mz .dc-spark{animation:none}
.dc-spark-wrap{position:relative;margin-top:auto}
.dc-dot{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#fff;box-shadow:0 0 12px rgba(255,255,255,.85);animation:siFade .3s 2s both,dcPulse 2.2s 2.3s ease-in-out infinite}
@keyframes dcPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.65}}

/* the banner: drifting lights and a slow sheen */
.dash-hero{isolation:isolate}
.dh-sparks{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:-1}
.dh-sparks i{position:absolute;bottom:-12px;width:var(--s);height:var(--s);border-radius:50%;background:rgba(255,255,255,.75);box-shadow:0 0 10px rgba(160,200,255,.9);opacity:0;animation:spark var(--t) linear infinite;animation-delay:var(--dl)}
@keyframes spark{0%{transform:translate(0,0);opacity:0}12%{opacity:.85}80%{opacity:.5}100%{transform:translate(var(--x),-420px);opacity:0}}
.dh-sheen{position:absolute;inset:0;pointer-events:none;z-index:-1;border-radius:inherit;overflow:hidden}
.dh-sheen::after{content:"";position:absolute;top:-20%;bottom:-20%;width:38%;left:-45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.09),transparent);transform:skewX(-12deg);animation:sheen 9s 2s ease-in-out infinite}
@keyframes sheen{0%{left:-45%}45%,100%{left:120%}}
.dh-pill.pace{background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.32);color:#C8F7D8}
.dh-pill.pace b{color:#fff}
.dh-main b .countup{display:inline-block;background:linear-gradient(90deg,#fff 0%,#fff 40%,#BFE3FF 50%,#fff 60%,#fff 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:numShine 6s 1.6s linear infinite}
@keyframes numShine{from{background-position:120% 0}to{background-position:-120% 0}}

/* charts: bars with depth */
.viz-svg .viz-bar{transition:opacity .2s,filter .2s}
.viz-svg .viz-bar:not(.dim):hover{filter:brightness(1.08)}

/* donut */
.donut-box{container-type:inline-size;padding:4px 0}
.donut-in{display:grid;grid-template-columns:176px minmax(0,1fr);gap:22px;align-items:center}
@container (max-width:470px){.donut-in{grid-template-columns:1fr;justify-items:center;gap:14px}.donut-legend{width:100%}}
.donut-fig{position:relative;width:176px;height:176px}
.donut{width:176px;height:176px;overflow:visible;transform:rotate(-40deg) scale(.9);opacity:0;transition:transform 1.1s var(--ease),opacity .5s}
.donut-box.in .donut{transform:none;opacity:1}
.donut-track{fill:none;stroke:var(--surface-2)}
.donut-seg{transition:stroke-width .2s var(--ease),opacity .2s;cursor:pointer}
.donut-box.in .donut-seg{animation:donutIn 1s var(--ease) backwards;animation-delay:calc(.15s + var(--i) * 110ms)}
.donut-box:not(.in) .donut-seg{stroke-dasharray:0 1000}
.donut-seg.dim{opacity:.35}
@keyframes donutIn{from{stroke-dasharray:0 1000}}
.donut-mid{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none}
.donut-mid>small{font-size:11px;color:var(--ink-3);max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 auto}
.donut-mid b.sm{font-size:24px}
.donut-mid b{font-size:26px;font-weight:700;letter-spacing:-.03em;color:var(--ink);line-height:1.15;font-variant-numeric:tabular-nums}
.donut-mid>span{font-size:10.5px;color:var(--ink-4);font-weight:600}
.donut-legend{display:grid;gap:2px;min-width:0}
.mz .dl-row{display:grid;grid-template-columns:10px minmax(0,1fr) auto 38px;align-items:center;gap:9px;padding:6px 8px;border-radius:9px;text-align:left;font-size:12.5px;color:var(--ink-2);transition:background .15s,opacity .15s}
.donut-box.in .dl-row{animation:ntRow .4s var(--ease) backwards;animation-delay:calc(.3s + var(--i) * 70ms)}
.mz .dl-row:hover,.mz .dl-row.on{background:var(--surface-2)}
.dl-row.dim{opacity:.5}
.dl-row i{width:10px;height:10px;border-radius:3px}
.dl-row span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dl-row b{font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}
.dl-row em{font-style:normal;text-align:right;color:var(--ink-4);font-size:11.5px;font-variant-numeric:tabular-nums}

/* ring gauges */
.rings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:4px 0 14px}
.ring{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;padding:12px 6px 10px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line-2)}
.ring-fig{position:relative;width:96px;height:96px;margin-bottom:4px}
.ring-fig svg{width:96px;height:96px}
.ring-fig b{position:absolute;inset:0;display:grid;place-items:center;font-size:17px;font-weight:700;letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums}
.ring-track{fill:none;stroke:color-mix(in srgb,var(--ink-4) 18%,transparent)}
.ring-val{fill:none;stroke:var(--s1);stroke-linecap:round}
.ring.pos .ring-val{stroke:var(--pos)}.ring.warn .ring-val{stroke:var(--warn)}.ring.neg .ring-val{stroke:var(--neg)}
.ring:not(.in) .ring-val{stroke-dasharray:0 1000}
.ring.in .ring-val{animation:donutIn 1.3s .1s var(--ease) backwards}
.ring-l{font-size:12.5px;font-weight:600;color:var(--ink)}
.ring small{font-size:11px;color:var(--ink-3);line-height:1.35}

/* lists arrive one row at a time */
.dash2 .rv.in .recent-table tbody tr,.dash2 .rv.in .collection-list>button,.dash2 .rv.in .ag-row{animation:ntRow .45s var(--ease) backwards;animation-delay:calc(.2s + var(--i,0) * 55ms)}
.dash2 .rv.in .flow-period i{transform-origin:50% 100%;animation:barGrow .8s var(--ease) backwards;animation-delay:calc(.25s + var(--d,0) * 35ms)}

@media(max-width:650px){.rings{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.ring{padding:10px 2px}.ring-fig,.ring-fig svg{width:76px;height:76px}.ring-fig b{font-size:14px}.dh-sparks{display:none}}
@media (prefers-reduced-motion:reduce){.dash2 .rv,.dash2 .rv *,.dh-sparks i,.dh-sheen::after,.dh-main b .countup,.donut,.donut-seg,.dl-row,.ring-val,.kt-spark .ks-line,.kt-spark .ks-area,.dc-spark .dc-line,.dc-spark .dc-area,.dc-dot{animation:none!important;transition:none!important}
  .dash2 .rv{opacity:1}.donut{transform:none;opacity:1}.dh-sparks,.dh-sheen{display:none}}
@media print{.dash2 .rv{opacity:1!important;animation:none!important}.dh-sparks,.dh-sheen{display:none}.donut{transform:none;opacity:1}}
`;
