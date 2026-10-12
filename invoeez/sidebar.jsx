/* ============================================================================
   SIDEBAR — graphite navigation tree. Sections open like a ledger index:
   Master holds the reference data in sub-groups, transaction sections carry
   a "+" to start a new record straight from the menu, and the collapsed rail
   shows each section's items in a flyout.
   ========================================================================== */

/* Opens a screen's "new" form when the sidebar's "+" asks for it. */
function useCreate(create, open) {
  React.useEffect(() => { if (create && create.n) open(create); }, [create && create.n]);
}
function useMedia(q) {
  const get = () => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  const [m, setM] = useState(get);
  React.useEffect(() => {
    let mq; try { mq = window.matchMedia(q); } catch (e) { return; }
    const h = () => setM(mq.matches); h();
    mq.addEventListener ? mq.addEventListener("change", h) : mq.addListener(h);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", h) : mq.removeListener(h); };
  }, [q]);
  return m;
}
function navFlat() {
  const out = [];
  NAV.forEach((g) => {
    if (g.k) return out.push({ k: g.k, l: g.g, i: g.i, g: g.g });
    g.items.forEach((x) => x.s ? x.items.forEach((y) => out.push({ ...y, g: g.g, sg: x.s })) : out.push({ ...x, g: g.g }));
  });
  return out;
}

function Sidebar({ view, go, quickAdd, allowed, counts, closed, setClosed, mini, setMini, drawer, company, meUser, role, canAdd, onSwitchUser, onSignOut }) {
  const tablet = useMedia("(min-width:901px) and (max-width:1024px)");
  const rail = (mini || tablet) && !drawer;
  const [q, setQ] = useState("");
  const [fly, setFly] = useState(null);
  const flyT = React.useRef(0), search = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (e.key === "/" && !/input|textarea|select/i.test((e.target.tagName || "")) && !e.target.isContentEditable) { e.preventDefault(); search.current && search.current.focus(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  const match = (...t) => !q.trim() || hits(q, ...t);
  const visible = NAV.map((g) => {
    if (g.k) return allowed(g.k) && match(g.g) ? g : null;
    const items = g.items.map((x) => {
      if (!x.s) return allowed(x.k) && match(g.g, x.l) ? x : null;
      const sub = x.items.filter((y) => allowed(y.k) && match(g.g, x.s, y.l));
      return sub.length ? { ...x, items: sub } : null;
    }).filter(Boolean);
    return items.length ? { ...g, items } : null;
  }).filter(Boolean);
  const isOpen = (name) => !!q.trim() || !closed[name];
  const toggle = (name) => setClosed((c) => ({ ...c, [name]: isOpen(name) }));
  const contains = (g, k) => g.k === k || (g.items || []).some((x) => x.k === k || (x.items || []).some((y) => y.k === k));
  const openFly = (g, el) => { if (!rail || g.k) return; clearTimeout(flyT.current); const r = el.getBoundingClientRect(); setFly({ g: g.g, top: Math.max(8, Math.min(r.top - 6, window.innerHeight - 80)), left: r.right + 10 }); };
  const closeFly = () => { clearTimeout(flyT.current); flyT.current = setTimeout(() => setFly(null), 160); };
  const pick = (k) => { setFly(null); setQ(""); go(k); };
  const add = (k) => { setFly(null); setQ(""); quickAdd(k); };

  const leaf = (it) => (
    <div key={it.k} className={cx("sb-row", view === it.k && "on")}>
      <button className="sb-link" data-k={it.k} title={it.l} onClick={() => pick(it.k)} aria-current={view === it.k ? "page" : undefined}>
        <span className="sb-tick" aria-hidden="true" />
        <span className="lbl">{it.l}</span>
        {counts[it.k] != null && counts[it.k] > 0 && <span className="ct">{counts[it.k]}</span>}
      </button>
      {it.add && canAdd(it.k) && <button className="sb-add" title={`New — ${it.l}`} aria-label={`Create new: ${it.l}`} onClick={() => add(it.k)}><Plus size={13} strokeWidth={2.4} /></button>}
    </div>);
  const tree = (g) => (
    <div className="sb-tree">
      {g.items.map((x) => x.s ? (
        <div key={x.s} className={cx("sb-sub", isOpen(x.s) && "open", x.items.some((y) => y.k === view) && "has-on")}>
          <button className="sb-subhead" title={x.s} onClick={() => toggle(x.s)} aria-expanded={isOpen(x.s)}>
            <span className="sb-tick" aria-hidden="true" /><span className="lbl">{x.s}</span><ChevronRight size={13} strokeWidth={2.2} className="cv" /></button>
          {isOpen(x.s) && <div className="sb-tree inner">{x.items.map(leaf)}</div>}
        </div>) : leaf(x))}
    </div>);

  return (
    <nav className={cx("sbar", rail && "rail", drawer && "open")} aria-label="Main navigation">
      <div className="sb-brand">
        <img className="sb-lockup" src={BRAND_LOCKUP} alt="InvoEez — Invoice Made Easy" />
        <img className="sb-mark" src={BRAND_MARK} alt="InvoEez" />
      </div>
      <button className="sb-co" onClick={() => pick("settings")} title="Company profile">
        {company.logo ? <img src={company.logo} alt="" /> : <span className="av">{initials(company.name)}</span>}
        <span className="t"><b>{company.name}</b>{company.nameAr ? <span dir="rtl" className="ar">{company.nameAr}</span> : <span>{company.trn ? `TRN ${company.trn}` : "Add company details"}</span>}</span>
      </button>
      <label className="sb-search">
        <input ref={search} aria-label="Search navigation" placeholder="Type to search" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { setQ(""); e.currentTarget.blur(); } }} />
        {q ? <button className="x" onClick={() => setQ("")} aria-label="Clear search"><X size={13} /></button> : <Search size={15} strokeWidth={2.1} />}
      </label>
      <div className="sb-scroll" onMouseLeave={closeFly}>
        {visible.map((g) => {
          const on = contains(g, view), open = !g.k && isOpen(g.g) && !rail;
          return (
            <div key={g.g} className={cx("sb-sec", on && "has-on", open && "open")}>
              <button className={cx("sb-head", g.k && view === g.k && "on")} title={g.g} data-k={g.k || undefined}
                onClick={(e) => g.k ? pick(g.k) : rail ? openFly(g, e.currentTarget) : toggle(g.g)}
                onMouseEnter={(e) => openFly(g, e.currentTarget)} aria-expanded={g.k ? undefined : open}>
                <span className="ic"><g.i size={18} strokeWidth={1.8} /></span>
                <span className="lbl">{g.g}</span>
                {!g.k && <ChevronRight size={14} strokeWidth={2.2} className="cv" />}
              </button>
              {open && tree(g)}
            </div>);
        })}
        {!visible.length && <div className="sb-none">No section matches “{q}”.</div>}
      </div>
      {fly && rail && ReactDOM.createPortal((() => { const g = visible.find((x) => x.g === fly.g); if (!g) return null;
        return <div className="sb-fly mz-fly" style={{ top: fly.top, left: fly.left }} onMouseEnter={() => clearTimeout(flyT.current)} onMouseLeave={closeFly}>
          <div className="sb-fly-h"><g.i size={15} strokeWidth={1.9} />{g.g}</div>
          {g.items.map((x) => x.s ? <div key={x.s} className="sb-fly-grp"><div className="sb-fly-s">{x.s}</div>{x.items.map(flyItem)}</div> : flyItem(x))}
        </div>; })(), document.querySelector(".mz") || document.body)}
      <div className="sb-foot">
        <button className="who-btn" onClick={onSwitchUser} title="Switch user" aria-label={`Signed in as ${meUser.name}. Switch user`}>
          <span className="av">{initials(meUser.name)}</span>
          <span className="who"><b>{meUser.name}</b><span>{role.label} · v{BUILD}</span></span></button>
        {!mini && <button className="signout" onClick={onSignOut} title="Sign out" aria-label="Sign out"><LogOut size={15} /></button>}
        <button className="collapse" onClick={() => setMini((v) => !v)} title={mini ? "Expand sidebar" : "Collapse sidebar"} aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}>
          {mini ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}</button>
      </div>
    </nav>);
  function flyItem(it) {
    return <div key={it.k} className={cx("sb-fly-row", view === it.k && "on")}>
      <button className="sb-link" title={it.l} onClick={() => pick(it.k)}><it.i size={15} strokeWidth={1.8} /><span className="lbl">{it.l}</span>
        {counts[it.k] > 0 && <span className="ct">{counts[it.k]}</span>}</button>
      {it.add && canAdd(it.k) && <button className="sb-add" title={`New — ${it.l}`} aria-label={`Create new: ${it.l}`} onClick={() => add(it.k)}><Plus size={13} strokeWidth={2.4} /></button>}
    </div>;
  }
}

const SIDEBAR_CSS = `
.sbar{--sb-w:272px;--sb-hi:#FFFFFF;
  width:var(--sb-w);flex:0 0 var(--sb-w);display:flex;flex-direction:column;position:relative;z-index:30;
  background:linear-gradient(180deg,var(--sb-1) 0%,var(--sb-2) 46%,var(--sb-3) 100%);color:var(--sb-txt);
  box-shadow:inset -1px 0 0 rgba(255,255,255,.06),1px 0 0 rgba(0,0,0,.25);transition:width .22s var(--ease),flex-basis .22s var(--ease)}
.sbar::before{content:"";position:absolute;inset:0 0 auto 0;height:180px;pointer-events:none;
  background:radial-gradient(260px 120px at 30% 0%,rgba(255,255,255,.07),transparent 70%)}
.sb-brand{position:relative;padding:20px 20px 14px;display:flex;align-items:center}
.sb-brand::after{content:"";position:absolute;left:20px;right:20px;bottom:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,206,212,.45) 30%,rgba(255,255,255,.75) 50%,rgba(201,206,212,.45) 70%,transparent)}
.sb-lockup{display:block;width:100%;max-width:214px;height:auto;filter:brightness(1.08) contrast(1.04) drop-shadow(0 2px 6px rgba(0,0,0,.35))}
.sb-mark{display:none;width:38px;height:auto;filter:drop-shadow(0 2px 5px rgba(0,0,0,.35))}
.sb-co{margin:14px 14px 10px;padding:9px 10px;display:flex;align-items:center;gap:10px;border-radius:12px;text-align:left;
  background:rgba(255,255,255,.045);border:1px solid var(--sb-line);transition:background .15s,border-color .15s}
.sb-co:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14)}
.sb-co .av,.sb-co img{width:32px;height:32px;flex:0 0 32px;border-radius:9px;display:grid;place-items:center;font-weight:700;font-size:12px;
  background:linear-gradient(145deg,#F4F6F8,#B9C0C8);color:#1B1F25;object-fit:contain}
.sb-co .t{min-width:0;flex:1}
.sb-co .t b{display:block;color:#fff;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-co .t span{display:block;color:var(--sb-dim);font-size:10.5px;font-family:var(--mono);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-co .t span.ar{font-family:var(--sans);font-size:12px}
.sb-search{margin:0 14px 4px;display:flex;align-items:center;gap:8px;height:38px;padding:0 10px 0 12px;border-radius:10px;
  background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.10);color:var(--sb-dim);transition:border-color .15s,box-shadow .15s}
.sb-search:focus-within{border-color:var(--sb-acc);box-shadow:0 0 0 3px var(--sb-on)}
.sb-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:#fff;font-size:13px}
.sb-search input::placeholder{color:#7D858F}
.sb-search .x{display:grid;place-items:center;width:20px;height:20px;border-radius:6px;color:var(--sb-dim)}
.sb-search .x:hover{background:var(--sb-hover);color:#fff}
.sb-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 10px 18px;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 12px,#000 calc(100% - 18px),transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 12px,#000 calc(100% - 18px),transparent 100%)}
.sb-scroll::-webkit-scrollbar{width:8px}.sb-scroll::-webkit-scrollbar-thumb{background:#363C44;border-radius:8px;border:2px solid transparent;background-clip:content-box}
.sb-sec{position:relative;margin:2px 0;border-radius:11px;transition:background .18s}
.sb-sec.open{background:rgba(255,255,255,.025)}
.sb-head{position:relative;display:flex;align-items:center;gap:11px;width:100%;height:40px;padding:0 10px 0 12px;border-radius:10px;
  color:var(--sb-txt);font-size:13.5px;font-weight:500;letter-spacing:-.005em;text-align:left;transition:background .14s,color .14s}
.sb-head:hover{background:var(--sb-hover);color:#fff}
.sb-head .ic{display:grid;place-items:center;width:20px;color:#9AA2AC;transition:color .14s}
.sb-head:hover .ic{color:#E6E9ED}
.sb-head .lbl{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-head .cv{color:#7D858F;transition:transform .2s var(--ease)}
.sb-sec.open>.sb-head .cv{transform:rotate(90deg);color:#C3C9D1}
.sb-sec.has-on>.sb-head{color:#fff}
.sb-sec.has-on>.sb-head .ic{color:var(--sb-acc)}
.sb-sec.has-on>.sb-head::before,.sb-head.on::before{content:"";position:absolute;left:-10px;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;
  background:linear-gradient(180deg,#F1F3F5,var(--sb-acc))}
.sb-head.on{background:linear-gradient(90deg,var(--sb-on),transparent);color:#fff}
.sb-head.on .ic{color:var(--sb-acc)}
.sb-tree{position:relative;margin:0 0 6px 21px;padding-left:12px;border-left:1px solid var(--sb-tree)}
.sb-tree.inner{margin:0 0 4px 9px}
.sb-row,.sb-fly-row{position:relative;display:flex;align-items:center;gap:4px;border-radius:8px;transition:background .14s}
.sb-row:hover,.sb-fly-row:hover{background:var(--sb-hover)}
.sb-link{flex:1;min-width:0;display:flex;align-items:center;gap:9px;height:32px;padding:0 6px 0 4px;color:var(--sb-txt);font-size:13px;text-align:left;
  border-radius:8px;transition:color .14s}
.sb-row:hover .sb-link,.sb-fly-row:hover .sb-link{color:#fff}
.sb-link .lbl{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-tick{position:relative;width:9px;flex:0 0 9px;height:1px;background:var(--sb-tree);margin-left:-16px}
.sb-tick::after{content:"";position:absolute;right:-3px;top:-2px;width:5px;height:5px;border-radius:50%;background:#565E68;transition:background .14s,box-shadow .14s}
.sb-row.on{background:var(--sb-on)}
.sb-row.on .sb-link{color:#fff;font-weight:600}
.sb-row.on{box-shadow:inset 2px 0 0 var(--sb-acc)}
.sb-row.on .sb-tick{background:var(--sb-acc)}
.sb-row.on .sb-tick::after{background:var(--sb-acc);box-shadow:0 0 0 3px var(--sb-on)}
.sb-link .ct{font-family:var(--mono);font-size:10.5px;color:#C3C9D1;background:rgba(255,255,255,.08);padding:1px 7px;border-radius:20px}
.sb-row.on .ct{background:var(--sb-acc);color:var(--sb-3)}
.sb-add{flex:0 0 24px;width:24px;height:24px;margin-right:4px;display:grid;place-items:center;border-radius:7px;color:#9AA2AC;
  border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);transition:background .14s,color .14s,border-color .14s,transform .14s}
.sb-add:hover{background:linear-gradient(180deg,#F4F6F8,#C3C9D1);border-color:#fff;color:#16191D;transform:scale(1.05)}
.sb-add:focus-visible{outline:2px solid var(--sb-acc);outline-offset:1px}
.sb-subhead{display:flex;align-items:center;gap:9px;width:100%;height:32px;padding:0 8px 0 4px;border-radius:8px;color:#C3C9D1;font-size:13px;font-weight:500;text-align:left}
.sb-subhead:hover{background:var(--sb-hover);color:#fff}
.sb-subhead .lbl{flex:1}
.sb-subhead .cv{color:#7D858F;transition:transform .2s var(--ease)}
.sb-sub.open>.sb-subhead .cv{transform:rotate(90deg)}
.sb-sub.has-on>.sb-subhead{color:#fff}
.sb-sub.has-on>.sb-subhead .sb-tick::after{background:var(--sb-acc)}
.sb-none{padding:16px 12px;color:var(--sb-dim);font-size:12.5px}
.sb-foot{display:flex;align-items:center;gap:10px;padding:12px 14px;border-top:1px solid var(--sb-line);background:rgba(0,0,0,.18)}
.sb-foot .av{width:32px;height:32px;flex:0 0 32px;border-radius:50%;display:grid;place-items:center;font-size:11.5px;font-weight:700;
  background:linear-gradient(145deg,#F4F6F8,#AEB6C1);color:#16191D;box-shadow:0 0 0 2px rgba(255,255,255,.08)}
.sb-foot .who{flex:1;min-width:0}
.sb-foot .who b{display:block;color:#fff;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-foot .who span{display:block;color:var(--sb-dim);font-size:10.5px}
.sb-foot .collapse{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;color:var(--sb-dim)}
.sb-foot .collapse:hover{background:var(--sb-hover);color:#fff}

/* Collapsed rail */
.sbar.rail{--sb-w:76px}
.sbar.rail .sb-lockup,.sbar.rail .sb-co,.sbar.rail .sb-search,.sbar.rail .sb-head .lbl,.sbar.rail .sb-head .cv,.sbar.rail .sb-foot .who{display:none}
.sbar.rail .sb-mark{display:block}
.sbar.rail .sb-brand{justify-content:center;padding:18px 0 14px}
.sbar.rail .sb-brand::after{left:14px;right:14px}
.sbar.rail .sb-scroll{padding:10px 10px}
.sbar.rail .sb-head{justify-content:center;padding:0;height:44px}
.sbar.rail .sb-head .ic{width:auto}
.sbar.rail .sb-sec.has-on>.sb-head{background:var(--sb-on)}
.sbar.rail .sb-foot{flex-direction:column;padding:12px 0}
.sb-fly{position:fixed;z-index:1200;min-width:248px;max-width:300px;max-height:calc(100vh - 24px);overflow:auto;padding:8px;border-radius:14px;
  background:linear-gradient(180deg,var(--sb-1),var(--sb-2));border:1px solid rgba(255,255,255,.12);
  box-shadow:0 22px 50px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);color:#C3C9D1;animation:sbfly .14s var(--ease)}
@keyframes sbfly{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
.sb-fly-h{display:flex;align-items:center;gap:8px;padding:6px 8px 9px;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.08);color:#fff;font-size:12.5px;font-weight:600}
.sb-fly-s{padding:8px 8px 3px;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#7D858F}
.sb-fly .sb-link{padding-left:8px}
.sb-fly .sb-link svg{color:#8C949E}
.sb-fly-row.on{background:var(--sb-on)}.sb-fly-row.on .sb-link{color:#fff;font-weight:600}

/* Phones: off-canvas drawer */
@media (max-width:900px){
  .sbar{position:fixed;top:0;left:0;bottom:0;--sb-w:292px;z-index:950;transform:translateX(-102%);transition:transform .26s var(--ease)}
  .sbar.open{transform:none;box-shadow:0 30px 80px rgba(0,0,0,.45)}
  .sb-link,.sb-subhead{height:38px}
  .sb-head{height:44px}
  .sb-add{width:30px;height:30px;flex-basis:30px}
  .sb-foot .collapse{display:none}
}
@media print{.sbar{display:none}}
`;
