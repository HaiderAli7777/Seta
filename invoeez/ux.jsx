/* ============================================================================
   3.13 — everyday experience.
   · The bell opens a notification centre: what needs doing, with one click to
     the right list (approvals, overdue invoices and bills, drafts, cheques
     maturing, stock, backups).
   · Deleting something offers Undo for a few seconds instead of asking first.
   · Keyboard shortcuts: ? for the list, g then a letter to go somewhere,
     n then a letter to create (Ctrl K and / keep searching as before).
   · Document lists open with summary tiles that double as filters.
   · Figures use tabular numerals in the interface font rather than the code
     font; long account names and memos no longer stretch rows.
   ========================================================================== */

/* Put a removed record back where it was (or at the end if the list has moved on). */
const restoreInto = (key, rec, at, idKey = "id") => (s) => {
  const l = s[key] || [];
  if (l.some((x) => x[idKey] === rec[idKey])) return s;
  const n = [...l]; n.splice(at < 0 ? n.length : Math.min(at, n.length), 0, rec);
  return { ...s, [key]: n };
};
/* Remove a record, then offer to bring it back. */
function removeWithUndo({ setState, toast, key, rec, idKey = "id", label, fallback, verb = "deleted" }) {
  const box = { at: -1 };
  setState((s) => { const l = s[key] || fallback || []; box.at = l.findIndex((x) => x[idKey] === rec[idKey]);
    return { ...s, [key]: l.filter((x) => x[idKey] !== rec[idKey]) }; });
  toast(`${label} ${verb}`, "warn", { undo: () => { setState(restoreInto(key, rec, box.at, idKey)); toast(`${label} restored`); } });
}

/* ---------------------------------------------------------------- toasts */
const Toasts = ({ items, dismiss }) => (
  <div className="toasts noprint" role="status" aria-live="polite">{items.map((t) => (
    <div className={cx("toast", t.tone, t.undo && "has-act")} key={t.id} style={{ "--life": (t.life || 3400) + "ms" }}>
      <span className="tico">{t.tone === "warn" ? <AlertTriangle size={12} strokeWidth={2.2} /> : <Check size={13} strokeWidth={2.6} />}</span>
      <span className="tmsg">{t.msg}</span>
      {t.undo && <button className="toast-act" onClick={() => { dismiss && dismiss(t.id); t.undo(); }}><RotateCcw size={13} strokeWidth={2.2} />Undo</button>}
      {dismiss && <button className="toast-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={13} strokeWidth={2.2} /></button>}
      <i className="toast-life" aria-hidden="true" />
    </div>))}</div>
);

/* ------------------------------------------------------ notification centre */
function attentionItems({ state, books, user, can, allowed, backup }) {
  const out = [], aed = (v) => "AED " + money(v, false);
  const mine = awaitingMe(state, user);
  if (mine.length && allowed("purchase_orders")) out.push({ k: "appr", tone: "gold", icon: ClipboardCheck,
    title: `${mine.length} purchase ${mine.length === 1 ? "order needs" : "orders need"} your approval`,
    sub: `${aed(mine.reduce((s, d) => s + amounts(d).total, 0))} in total`, go: ["purchase_orders", "__pending__"] });
  const late = (kind) => { const a = aging(state, kind, TODAY); let n = 0, v = 0;
    a.rows.forEach((r) => r.items.forEach((i) => { if (i.open > 0.004 && i.due < TODAY) { n++; v += i.open; } })); return { n, v: R2(v) }; };
  if (allowed("invoices")) {
    const o = late("receivable");
    if (o.n) out.push({ k: "ar", tone: "bad", icon: Receipt, title: `${o.n} overdue ${o.n === 1 ? "invoice" : "invoices"}`, sub: `${aed(o.v)} to collect`, go: ["invoices", "__f:overdue"] });
    const dr = state.docs.filter((d) => d.type === "invoice" && d.state === "draft").length;
    if (dr) out.push({ k: "dinv", tone: "info", icon: FileText, title: `${dr} draft ${dr === 1 ? "invoice" : "invoices"} not posted`, sub: "Post them so they reach the ledger and the VAT return", go: ["invoices", "__f:draft"] });
  }
  if (allowed("bills")) {
    const o = late("payable");
    if (o.n) out.push({ k: "ap", tone: "warn", icon: ShoppingCart, title: `${o.n} vendor ${o.n === 1 ? "bill is" : "bills are"} overdue`, sub: `${aed(o.v)} to pay`, go: ["bills", "__f:overdue"] });
    const dr = state.docs.filter((d) => d.type === "bill" && d.state === "draft").length;
    if (dr) out.push({ k: "dbill", tone: "info", icon: ShoppingCart, title: `${dr} draft ${dr === 1 ? "bill" : "bills"} not posted`, sub: "Post them to record what you owe", go: ["bills", "__f:draft"] });
  }
  if (allowed("pdc")) {
    const soon = (state.pdcs || []).filter((c) => pdcOpen(c) && c.chequeDate <= addDays(TODAY, 7));
    if (soon.length) out.push({ k: "pdc", tone: "gold", icon: CalendarClock, title: `${soon.length} post-dated ${soon.length === 1 ? "cheque matures" : "cheques mature"} within a week`,
      sub: `${aed(soon.reduce((s, c) => s + (+c.amount || 0), 0))} · deposit or present on the date`, go: ["pdc"] });
  }
  if (allowed("products")) {
    const goods = PRODUCTS.filter((p) => p.kind === "goods");
    const neg = goods.filter((p) => (books.stock[p.id] || { qty: 0 }).qty < 0).length;
    const low = goods.filter((p) => { const q = (books.stock[p.id] || { qty: 0 }).qty; return q >= 0 && q <= (p.reorder ?? 5); }).length;
    if (neg) out.push({ k: "neg", tone: "bad", icon: Package, title: `${neg} ${neg === 1 ? "product is" : "products are"} below zero stock`, sub: "Check the last sales or count the shelf", go: ["products", "__low_stock__"] });
    else if (low) out.push({ k: "low", tone: "warn", icon: Package, title: `${low} ${low === 1 ? "product is" : "products are"} at or below reorder level`, sub: "Time to raise a purchase order", go: ["products", "__low_stock__"] });
  }
  if (can("settings") && !state.sample) {
    const last = state.setup && state.setup.backup, days = last ? daysBetween(last, TODAY) : null;
    if (days == null || days > 7) out.push({ k: "bak", tone: "info", icon: Download, title: days == null ? "Your books have not been backed up yet" : `Last backup was ${days} days ago`,
      sub: "Download a backup file to keep a copy safe", run: backup, cta: "Back up now" });
  }
  return out;
}

function NotificationCenter({ items, go, close }) {
  React.useEffect(() => { const esc = (e) => { if (e.key === "Escape") close(); }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, []);
  return <>
    <div className="pop-scrim" onMouseDown={close} />
    <div className="notif-pop" role="dialog" aria-label="Needs attention">
      <header><span><b>Needs attention</b><small>{items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : "Nothing waiting"}</small></span>
        <button className="icon-btn" aria-label="Close" onClick={close}><X size={15} /></button></header>
      {items.length ? <div className="nt-list">{items.map((it, i) => (
        <button key={it.k} className={cx("nt-item", it.tone)} style={{ "--i": i }} onClick={() => { close(); if (it.run) it.run(); else go(...it.go); }}>
          <span className="nt-ico"><it.icon size={16} strokeWidth={1.9} /></span>
          <span className="nt-t"><b>{it.title}</b><small>{it.sub}</small></span>
          {it.cta ? <span className="nt-cta">{it.cta}</span> : <ChevronRight size={15} className="nt-go" />}
        </button>))}</div>
        : <div className="nt-empty"><span><CircleCheck size={22} strokeWidth={1.9} /></span><b>You are all caught up</b><small>Nothing needs your attention right now.</small></div>}
      <footer><button className="linkish" onClick={() => { close(); go("dash"); }}>Open the dashboard</button><span><kbd>g</kbd> <kbd>d</kbd></span></footer>
    </div></>;
}

/* ------------------------------------------------------- keyboard shortcuts */
const GO_KEYS = [["d", "dash", "Dashboard"], ["q", "quotes", "Quotations"], ["i", "invoices", "Invoices"], ["o", "purchase_orders", "Purchase orders"],
  ["b", "bills", "Vendor bills"], ["e", "expenses", "Expenses"], ["p", "payments", "Receipts & payments"], ["c", "customers", "Customers"],
  ["v", "vendors", "Vendors"], ["s", "products", "Products & services"], ["j", "journal", "Journal entries"], ["r", "reports", "All reports"], ["l", "r_pnl", "Profit or loss"], ["k", "companies", "Companies"]];
const NEW_KEYS = [["i", "invoice", "Invoice"], ["q", "quote", "Quotation"], ["o", "purchase_order", "Purchase order"], ["b", "bill", "Vendor bill"], ["c", "credit_note", "Credit note"]];
const isTyping = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const modalOpen = () => !!document.querySelector(".studio-overlay, .scrim, .cmdk, .notif-pop, .newpop, .pop");

/* Single keys and two-key chords (g then i). Returns the chord being typed, for the on-screen hint. */
function useShortcuts({ enabled, allowed, canAdd, go, newDoc, openHelp, openSearch, toast }) {
  const [chord, setChord] = useState(null);
  const ref = React.useRef(null);
  ref.current = { enabled, allowed, canAdd, go, newDoc, openHelp, openSearch, toast, chord, setChord };
  React.useEffect(() => {
    let timer = 0;
    const h = (e) => {
      const c = ref.current;
      if (!c.enabled || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(document.activeElement)) return;
      const k = e.key;
      if (c.chord) {
        clearTimeout(timer); c.setChord(null);
        const list = c.chord === "g" ? GO_KEYS : NEW_KEYS, hit = list.find((x) => x[0] === k.toLowerCase());
        if (!hit) return;
        e.preventDefault();
        if (c.chord === "g") { if (c.allowed(hit[1])) c.go(hit[1]); else c.toast(`${hit[2]} is not available on your role`, "warn"); }
        else { if (c.canAdd(LIST_OF[hit[1]])) c.newDoc(hit[1]); else c.toast(`You cannot create a ${hit[2].toLowerCase()} on your role`, "warn"); }
        return;
      }
      if (modalOpen()) return;
      if (k === "?") { e.preventDefault(); c.openHelp(); return; }
      if (k === "g" || k === "n") { c.setChord(k); timer = setTimeout(() => ref.current.setChord(null), 1500); }
    };
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); clearTimeout(timer); };
  }, []);
  return chord;
}

const Kbd = ({ k }) => <span className="kb">{k.split(" ").map((x, i) => <kbd key={i}>{x}</kbd>)}</span>;
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘" : "Ctrl";

function ShortcutSheet({ close, allowed, canAdd }) {
  const row = (k, l) => <div className="ks-row" key={k + l}><span>{l}</span><Kbd k={k} /></div>;
  return <StudioModal wide title="Keyboard shortcuts" sub="Work without the mouse. Shortcuts pause while you are typing in a field." close={close}>
    <div className="ks-grid">
      <section><h4>Anywhere</h4>
        {row(`${MOD} K`, "Search everything")}{row("/", "Find a screen in the menu")}{row("?", "Show these shortcuts")}{row("Esc", "Close a window or menu")}
        <h4>On a document</h4>
        {row(`${MOD} S`, "Save the draft and stay on it")}{row("Enter", "Next line (in quantity or price)")}</section>
      <section><h4>Go to — press g, then</h4>{GO_KEYS.filter((x) => allowed(x[1])).map(([k, , l]) => row(`g ${k}`, l))}</section>
      <section><h4>Create — press n, then</h4>{NEW_KEYS.filter((x) => canAdd(LIST_OF[x[1]])).map(([k, , l]) => row(`n ${k}`, l))}</section>
    </div>
  </StudioModal>;
}

function ChordHint({ chord, allowed, canAdd }) {
  if (!chord) return null;
  const list = chord === "g" ? GO_KEYS.filter((x) => allowed(x[1])) : NEW_KEYS.filter((x) => canAdd(LIST_OF[x[1]]));
  return <div className="chord-hint noprint" role="status"><b>{chord === "g" ? "Go to…" : "Create…"}</b>
    {list.slice(0, 9).map(([k, , l]) => <span key={k}><kbd>{k}</kbd>{l}</span>)}</div>;
}

/* ------------------------------------------------- summary tiles on lists */
function DocSummary({ tiles, f, setF }) {
  return <div className="doc-sum" role="group" aria-label="Summary and quick filters">{tiles.map((t, i) => (
    <button key={t.f} className={cx("ds-tile", t.tone, f === t.f && "on")} style={{ "--i": i }} aria-pressed={f === t.f}
      onClick={() => setF(f === t.f ? "all" : t.f)}>
      <span className="ds-l">{t.label}</span>
      <b>{t.money != null ? <><small>AED</small>{money(t.money, false)}</> : t.count}</b>
      <span className="ds-s">{t.sub}</span>
    </button>))}</div>;
}

/* Tiles for each kind of document list. */
function summaryTiles(type, docs, openMap) {
  const sum = (l) => R2(l.reduce((s, d) => s + amounts(d).total, 0));
  const n = (l, w) => `${l.length} ${l.length === 1 ? w : w + "s"}`;
  if (type === "invoice" || type === "bill") {
    const open = docs.filter((d) => d.state === "posted" && (openMap[d.id] || 0) > 0.004), ob = (l) => R2(l.reduce((s, d) => s + (openMap[d.id] || 0), 0));
    const late = open.filter((d) => d.due < TODAY), soon = open.filter((d) => d.due >= TODAY && d.due <= addDays(TODAY, 7));
    const drafts = docs.filter((d) => d.state === "draft"), w = type === "invoice" ? "invoice" : "bill";
    return [
      { f: "open", label: type === "invoice" ? "To collect" : "To pay", money: ob(open), sub: n(open, w) },
      { f: "overdue", label: "Overdue", money: ob(late), sub: n(late, w), tone: late.length ? "bad" : "" },
      { f: "soon", label: "Due in 7 days", money: ob(soon), sub: n(soon, w), tone: soon.length ? "warn" : "" },
      { f: "draft", label: "Drafts", count: drafts.length, sub: drafts.length ? `${money(sum(drafts), false)} not posted` : "Nothing waiting" },
    ];
  }
  if (type === "quote") {
    const st = (s) => docs.filter((d) => d.state === s);
    return [
      { f: "draft", label: "Drafts", money: sum(st("draft")), sub: n(st("draft"), "quotation") },
      { f: "sent", label: "Awaiting reply", money: sum(st("sent")), sub: n(st("sent"), "quotation"), tone: st("sent").length ? "info" : "" },
      { f: "accepted", label: "Accepted · to invoice", money: sum(st("accepted")), sub: n(st("accepted"), "quotation"), tone: st("accepted").length ? "ok" : "" },
      { f: "invoiced", label: "Invoiced", money: sum(st("invoiced")), sub: n(st("invoiced"), "quotation") },
    ];
  }
  if (type === "purchase_order") {
    const st = (...s) => docs.filter((d) => s.includes(d.state));
    return [
      { f: "draft", label: "Drafts", money: sum(st("draft")), sub: n(st("draft"), "order") },
      { f: "pending", label: "Awaiting approval", money: sum(st("pending")), sub: n(st("pending"), "order"), tone: st("pending").length ? "warn" : "" },
      { f: "approved", label: "Approved · to bill", money: sum(st("approved", "sent")), sub: n(st("approved", "sent"), "order"), tone: st("approved", "sent").length ? "ok" : "" },
      { f: "billed", label: "Billed", money: sum(st("billed")), sub: n(st("billed"), "order") },
    ];
  }
  return null;
}

const UX_CSS = `
/* figures: tabular numerals in the interface font, not the code font */
.mz .tbl td.n,.mz .tbl th.n,.mz .kv,.mz .num,.mz .sumrow .v,.mz .lg-am b,.mz .inp.n,.mz .bar-row .bv,.mz .rank-row .rv,.mz .feed-row .fr b,.mz .tip .tr b,.mz .history-stats b,.mz .lg-c,.mz .document-dock b,.mz .du-amt b{font-family:var(--sans);font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum" 1,"lnum" 1}
.mz .tbl td.n{letter-spacing:-.005em}
.mz .kv{letter-spacing:-.02em}
.sheet .totbox .grand span{font-family:var(--sans)!important;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}

.mz .tbl tbody tr{transition:background .12s}
.mz .tbl td.nowrap,.mz .tbl td.c-date{white-space:nowrap}
.mz .pay-list .who-cell{max-width:200px}
.mz .pay-method{display:flex;align-items:center;gap:9px;min-width:0}
.mz .pay-method b{display:block;font-size:12.5px;font-weight:500;color:var(--ink);white-space:nowrap}
.mz .pay-method small{display:block;font-size:11.5px;color:var(--ink-4);max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mz .memo-cell{max-width:200px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}

/* toasts */
.mz .toast{position:relative;overflow:hidden;display:flex;align-items:center;gap:10px;padding-right:8px;animation:toastIn .32s var(--ease) both}
.mz .toast .tmsg{flex:1;min-width:0}
.toast-act{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:650;color:#fff;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);white-space:nowrap}
.toast-act:hover{background:rgba(255,255,255,.24)}
.toast-x{display:grid;place-items:center;width:24px;height:24px;border-radius:7px;color:rgba(255,255,255,.6)}
.toast-x:hover{background:rgba(255,255,255,.12);color:#fff}
.toast-life{position:absolute;left:0;bottom:0;height:2px;width:100%;background:currentColor;opacity:.28;transform-origin:left;animation:toastLife var(--life) linear forwards}
@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
@keyframes toastLife{from{transform:scaleX(1)}to{transform:scaleX(0)}}

/* notification centre */
.nt-wrap{position:relative}
.notif-pop{position:absolute;right:-8px;top:calc(100% + 12px);width:min(380px,calc(100vw - 24px));z-index:61;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh-3);overflow:hidden;animation:ntIn .2s var(--ease) both;text-align:left}
.notif-pop header{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px 16px;border-bottom:1px solid var(--line-2)}
.notif-pop header b{display:block;font-size:14px;color:var(--ink)}
.notif-pop header small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:1px}
.nt-list{display:grid;padding:6px;max-height:min(420px,60vh);overflow:auto}
.mz .nt-item{display:flex;align-items:center;gap:11px;padding:10px;border-radius:11px;text-align:left;width:100%;color:var(--ink);animation:ntRow .3s var(--ease) backwards;animation-delay:calc(var(--i) * 40ms)}
.mz .nt-item:hover,.mz .nt-item:focus-visible{background:var(--surface-2);outline:0}
.nt-ico{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:var(--info-50);color:var(--info)}
.nt-item.bad .nt-ico{background:var(--neg-50);color:var(--neg)}
.nt-item.warn .nt-ico{background:var(--warn-50);color:var(--warn)}
.nt-item.gold .nt-ico{background:var(--gold-50);color:var(--gold)}
.nt-t{flex:1;min-width:0}
.nt-t b{display:block;font-size:13px;font-weight:600;line-height:1.3}
.nt-t small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:2px;line-height:1.35}
.nt-go{color:var(--ink-4);flex:0 0 auto}
.nt-cta{font-size:11.5px;font-weight:650;color:var(--brand);background:var(--brand-50);padding:4px 9px;border-radius:20px;white-space:nowrap}
.nt-empty{display:grid;justify-items:center;text-align:center;gap:4px;padding:28px 18px}
.nt-empty span{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--pos-50);color:var(--pos);margin-bottom:6px}
.nt-empty b{font-size:14px;color:var(--ink)}
.nt-empty small{font-size:12px;color:var(--ink-3)}
.notif-pop footer{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid var(--line-2);background:var(--surface-2);font-size:12px;color:var(--ink-4)}
.mz .bell.on{background:var(--brand-50);color:var(--brand)}
@media(max-width:1250px){.mz .topbar .tb-icons .nt-wrap .icon-btn.bell{display:grid}}
@keyframes ntIn{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ntRow{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}

/* keyboard */
.kb{display:inline-flex;gap:4px}
.mz kbd,.kb kbd{font-family:var(--sans);font-size:11px;font-weight:650;min-width:22px;height:22px;padding:0 6px;display:inline-grid;place-items:center;border-radius:6px;color:var(--ink-2);background:var(--surface);border:1px solid var(--line);box-shadow:0 1px 0 var(--line)}
.ks-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.ks-grid h4{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);font-weight:650;margin:0 0 8px}
.ks-grid h4:not(:first-child){margin-top:18px}
.ks-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line-2);font-size:12.5px;color:var(--ink-2)}
.chord-hint{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:85;display:flex;align-items:center;gap:12px;flex-wrap:wrap;max-width:calc(100vw - 24px);padding:10px 14px;border-radius:14px;background:#141B2D;color:#E6ECF7;box-shadow:0 18px 40px rgba(8,12,24,.35);font-size:12px;animation:toastIn .2s var(--ease) both}
.chord-hint b{font-size:12.5px;color:#fff}
.chord-hint span{display:inline-flex;align-items:center;gap:5px;color:#C2CCDD}
.chord-hint kbd{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff;box-shadow:none}
.newpop button .nk{margin-left:auto;display:inline-flex;gap:3px;opacity:.75}
.newpop button .nk kbd{min-width:18px;height:18px;font-size:10px;padding:0 4px}
.pop-item .kb{margin-left:auto}

/* summary tiles on document lists */
.doc-sum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}
.mz .ds-tile{position:relative;text-align:left;padding:13px 15px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);transition:border-color .15s,transform .15s,box-shadow .15s;animation:ntRow .35s var(--ease) backwards;animation-delay:calc(var(--i) * 50ms);color:var(--ink)}
.mz .ds-tile:hover{border-color:var(--brand-100);transform:translateY(-1px)}
.mz .ds-tile.on{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-50)}
.ds-tile:before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:0 3px 3px 0;background:var(--line)}
.ds-tile.bad:before{background:var(--neg)}.ds-tile.warn:before{background:var(--warn)}.ds-tile.ok:before{background:var(--pos)}.ds-tile.info:before{background:var(--info)}.ds-tile.on:before{background:var(--brand)}
.ds-l{display:block;font-size:11.5px;font-weight:600;color:var(--ink-3)}
.ds-tile b{display:block;font-size:19px;font-weight:650;letter-spacing:-.02em;margin-top:5px;font-variant-numeric:tabular-nums}
.ds-tile b small{font-size:10.5px;font-weight:600;color:var(--ink-4);margin-right:5px;letter-spacing:0}
.ds-tile.bad b{color:var(--neg)}
.ds-s{display:block;font-size:11.5px;color:var(--ink-4);margin-top:2px}
@media(max-width:900px){.doc-sum{grid-template-columns:repeat(2,minmax(0,1fr))}.ks-grid{grid-template-columns:1fr}}
@media(max-width:650px){.ds-tile b{font-size:16px}.chord-hint{bottom:80px}.notif-pop{position:fixed;left:12px;right:12px;top:72px;width:auto}}
@media (prefers-reduced-motion:reduce){.mz .toast,.toast-life,.notif-pop,.mz .nt-item,.mz .ds-tile,.chord-hint{animation:none!important}}
`;
