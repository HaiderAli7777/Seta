/* ============================================================================
   3.16 — Refinement: smoother movement and a finer document editor.
   · Switches (period, status, filters, views) and tab bars: the selected
     highlight glides to the new choice instead of jumping. A "ghost" copies the
     chosen button's own computed look, so every variant — light, dark, coloured
     status, underline tabs — slides in its own style with no extra CSS.
   · Opening a document from a list, and going back to the list, glide in like a new screen.
   · Document totals: a clear summary with a discount on the whole document
     (a fixed amount or a percentage, before VAT) and a total that rolls to its
     new value.
   ========================================================================== */

const GLIDE = "cubic-bezier(.22,1,.36,1)";

/* ------------------------------------------------------- gliding selection */
function useSlideThumbs() {
  React.useEffect(() => {
    if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;
    const SEL = ".seg, .doc-tabs, .pdc-tabs";
    const last = new WeakMap();
    const isOn = (c) => c.classList.contains("on") || c.getAttribute("aria-selected") === "true";
    const clear = (cs) => (cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.backgroundColor === "transparent") && cs.backgroundImage === "none";
    const glide = (box, on, a, b) => {
      const cs = getComputedStyle(on);
      const line = clear(cs) && parseFloat(cs.borderBottomWidth) >= 2;      // underline tabs
      if (clear(cs) && !line) return;
      const old = box.querySelector(":scope > .th-ghost");
      if (old) {                                    // a quick second choice: carry on from where the highlight is now
        const c = getComputedStyle(old);
        if (!line) a = { x: parseFloat(c.left), y: parseFloat(c.top), w: parseFloat(c.width), h: parseFloat(c.height) };
        old.getAnimations().forEach((x) => x.cancel()); old.remove();
      }
      box.querySelectorAll(":scope > .th-hold").forEach((x) => x.classList.remove("th-hold"));
      const g = document.createElement("i"); g.className = "th-ghost"; g.setAttribute("aria-hidden", "true");
      const bw = line ? parseFloat(cs.borderBottomWidth) : 0;
      Object.assign(g.style, line ? { background: cs.borderBottomColor, borderRadius: "2px" }
        : { backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius });
      const at = (r) => (line ? { left: r.x + "px", top: r.y + r.h - bw + "px", width: r.w + "px", height: bw + "px" }
        : { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
      Object.assign(g.style, at(b));
      on.classList.add("th-hold");
      box.appendChild(g);
      const anim = g.animate([at(a), at(b)], { duration: 380, easing: GLIDE });
      const done = () => { g.remove(); on.classList.remove("th-hold"); };
      anim.onfinish = done; anim.oncancel = done;
    };
    const scan = () => {
      document.querySelectorAll(SEL).forEach((box) => {
        const on = [...box.children].find((c) => c.nodeType === 1 && !c.classList.contains("th-ghost") && isOn(c));
        const prev = last.get(box);
        const rect = on ? { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight } : null;
        last.set(box, on ? { el: on, rect } : null);
        if (!on || !prev || prev.el === on || !prev.rect || !prev.rect.w || !rect.w || reducedMotion()) return;
        if (!prev.el.isConnected || prev.el.parentNode !== box) return;               // a new list, not a new choice
        glide(box, on, prev.rect, rect);
      });
    };
    /* Runs before the browser paints the new choice, so the highlight never flashes at its destination first. */
    const relevant = (recs) => recs.some((r) => {
      const t = r.target;
      if (r.type === "attributes") return !!(t.parentElement && t.parentElement.matches(SEL));
      if (t.nodeType === 1 && (t.matches(SEL) || t.closest(SEL))) return true;
      return [...r.addedNodes].some((n) => n.nodeType === 1 && (n.matches(SEL) || !!n.querySelector(SEL)));
    });
    const mo = new MutationObserver((recs) => { if (relevant(recs)) scan(); });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-selected"] });
    scan();
    return () => mo.disconnect();
  }, []);
}

/* ------------------------------------------------------- a rolling number */
function TweenNum({ value, ms = 420 }) {
  const [shown, setShown] = useState(value);
  const from = React.useRef(value), raf = React.useRef(0);
  React.useEffect(() => {
    const a = from.current, b = value;
    if (a === b) return;
    if (reducedMotion()) { from.current = b; setShown(b); return; }
    const t0 = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      const v = k >= 1 ? b : a + (b - a) * e;
      from.current = v; setShown(v);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{money(shown, false)}</>;
}

/* ---------------------------------------------------- 3.17 line discount */
/* A line discount is a percentage or an amount in AED off the whole line; the switch beside it chooses. Switching keeps
   the same money off the line (10% of 7,350 becomes AED 735.00, and back). */
function DiscCell({ l, n, disabled, onValue, onMode, onKeyDown }) {
  const amt = isAmtDisc(l);
  return <div className={cx("disc-in", amt && "amt")}>
    <div className="seg disc-mode" role="group" aria-label={`Line ${n} discount type`}>
      <button type="button" className={cx(!amt && "on")} disabled={disabled} aria-pressed={!amt} title="A percentage off this line" onClick={() => onMode("percent")}>%</button>
      <button type="button" className={cx(amt && "on")} disabled={disabled} aria-pressed={amt} title="An amount in AED off this line" onClick={() => onMode("amount")}>AED</button>
    </div>
    <input className="inp n" type="number" min="0" max={amt ? undefined : 100} step="0.01" value={l.disc || ""} placeholder="0" disabled={disabled}
      onKeyDown={onKeyDown} onChange={(e) => onValue(e.target.value)} aria-label={`Discount on line ${n}${amt ? " in AED" : " in percent"}`} />
  </div>;
}

/* ------------------------------------------------------- document totals */
const normDisc = (x) => (x && +x.value > 0 ? { mode: x.mode === "percent" ? "percent" : "amount", value: R2(+x.value) } : undefined);

function DocTotals({ d, am, locked, set, settle }) {
  const noun = (DOCMETA[d.type] || {}).short ? DOCMETA[d.type].short.toLowerCase() : "document";
  const x = d.docDisc || null, has = !!(x && (x.value !== "" && x.value != null));
  const [editing, setEditing] = useState(false);
  const inp = React.useRef(null);
  const listed = R2(d.lines.reduce((s, l) => s + R2((+l.qty || 0) * (+l.price || 0)), 0));
  const lineOff = R2(listed - am.gross);
  const pct = x && x.mode === "percent";
  const capped = x && +x.value > 0 && (pct ? +x.value > 100 : +x.value > am.gross + 0.004);
  const saved = R2(lineOff + am.docDisc);
  const open = () => { set("docDisc", { mode: "amount", value: "" }); setEditing(true); requestAnimationFrame(() => inp.current && inp.current.focus()); };
  const remove = () => { set("docDisc", undefined); setEditing(false); };
  const showRow = has || editing;
  const label = `Discount on the whole ${noun}`;
  return (
    <div className="sumbox tot-card">
      <div className="sumrow tot-sub"><span className="k">Subtotal<small>{d.lines.length} {d.lines.length === 1 ? "line" : "lines"} at list price</small></span><span className="v">{money(listed, false)}</span></div>
      {lineOff > 0.004 && <div className="sumrow tot-off"><span className="k">Line discounts</span><span className="v">−{money(lineOff, false)}</span></div>}
      {showRow ? (
        <div className={cx("tot-disc", locked && "ro")} data-testid="doc-discount">
          <div className="td-top"><span className="k"><Tag size={13} />{label}{pct && am.docDisc > 0 && <em>{money(+x.value, false).replace(/\.00$/, "")}%</em>}</span>
            <span className="v neg">−{money(am.docDisc, false)}</span></div>
          {!locked && <div className="td-edit">
            <div className="seg td-mode" role="group" aria-label="Discount type">
              <button className={cx(!pct && "on")} onClick={() => set("docDisc", { ...(x || {}), mode: "amount" })}>AED</button>
              <button className={cx(pct && "on")} onClick={() => set("docDisc", { ...(x || {}), mode: "percent" })}>%</button>
            </div>
            <input ref={inp} className="inp n td-val" inputMode="decimal" aria-label={`${label} — ${pct ? "percent" : "amount in AED"}`}
              placeholder={pct ? "0" : "0.00"} value={x ? x.value : ""}
              onChange={(e) => set("docDisc", { ...(x || { mode: "amount" }), value: e.target.value.replace(/[^0-9.]/g, "") })} />
            <button className="td-x" onClick={remove} title="Remove the discount" aria-label="Remove the discount"><X size={14} /></button>
          </div>}
          {!locked && <small className={cx("td-note", capped && "warn")}>{capped ? (pct ? "A percentage above 100 counts as 100%." : `More than the ${noun} is worth — it is capped at AED ${money(am.gross, false)}.`)
            : "Taken off before VAT and shared across the lines in proportion to their value."}</small>}
        </div>
      ) : !locked && <button className="tot-add" onClick={open}><Plus size={14} strokeWidth={2.2} />Add a discount on the whole {noun}</button>}
      <div className="sumrow tot-net"><span className="k">Taxable amount <small>excl. VAT</small></span><span className="v">{money(am.net, false)}</span></div>
      <div className="sumrow"><span className="k">VAT charged</span><span className="v">{money(am.vat, false)}</span></div>
      {am.rcm > 0 && <div className="sumrow"><span className="k">Reverse charge</span><span className="v">{money(am.rcm, false)}</span></div>}
      <div className="sumrow total"><span className="k">Total · AED</span><span className="v"><TweenNum value={am.total} /></span></div>
      {saved > 0.004 && <div className="tot-saved"><Sparkles size={13} />Discounts take AED {money(saved, false)} off this {noun} ({(listed ? (saved / listed) * 100 : 0).toFixed(1)}%)</div>}
      {settle && <>
        <div className="sumrow paid"><span className="k">{d.type === "invoice" ? "Received" : "Paid"}{settle.items.length ? ` · ${settle.items.length} ${settle.items.length === 1 ? "payment" : "payments"}` : ""}</span>
          <span className="v">{settle.paid > 0.004 ? "(" + money(settle.paid, false) + ")" : money(0, false)}</span></div>
        <div className={cx("sumrow balance", settle.open <= 0.004 && "zero")}><span className="k">{settle.open <= 0.004 ? "Paid in full" : d.type === "invoice" ? "Balance receivable" : "Balance payable"}</span>
          <span className="v">{money(settle.open, false)}</span></div></>}
    </div>
  );
}

const REFINE_CSS = `
/* ---------- gliding selection ---------- */
.mz .seg,.mz .doc-tabs,.mz .pdc-tabs{position:relative}
.mz .seg>*:not(.th-ghost),.mz .doc-tabs>*:not(.th-ghost),.mz .pdc-tabs>*:not(.th-ghost){position:relative;z-index:1}
.th-ghost{position:absolute;z-index:0;pointer-events:none;will-change:left,width}
.mz .th-hold{background:transparent!important;background-image:none!important;box-shadow:none!important;border-bottom-color:transparent!important}
.mz .seg button,.mz .pdc-tabs button{transition:color .25s ${GLIDE}}
.mz .doc-tabs button{transition:color .25s ${GLIDE}}

/* ---------- screens and documents glide in ---------- */
.view,.mz .doc-workspace,.mz .doc-list-view{animation:viewIn .38s ${GLIDE}}
@keyframes viewIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* ---------- tactile controls ---------- */
.mz .btn{transition:background-color .18s,border-color .18s,box-shadow .2s,color .18s,transform .14s ${GLIDE}}
.mz .btn:active:not(:disabled){transform:translateY(1px) scale(.985)}
.mz .icon-btn{transition:background-color .18s,box-shadow .2s,transform .14s ${GLIDE}}
.mz .icon-btn:active{transform:scale(.94)}
.mz ::selection{background:color-mix(in srgb,var(--brand) 22%,transparent)}
.mz .page{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--ink-4) 45%,transparent) transparent}

/* ---------- the save bar sits on the window edge, nothing peeks out beneath it ---------- */
@media(min-width:901px){.mz .doc-form>.document-dock,.mz .document-dock{bottom:-40px;background:var(--surface)}}
.mz .lg-am small.lg-after{color:var(--pos)}

/* ---------- document totals ---------- */
.mz .tot-card{display:flex;flex-direction:column;gap:2px;padding:16px 18px 14px;border:1px solid var(--line);border-radius:16px;
  background:linear-gradient(180deg,var(--surface),color-mix(in srgb,var(--surface-2) 55%,var(--surface)));box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px -16px rgba(16,24,40,.18)}
.mz .tot-card .sumrow{padding:7px 0;font-size:13px;border:0}
.mz .tot-card .sumrow .k{color:var(--ink-2)}
.mz .tot-card .sumrow .k small{display:block;font-size:11px;color:var(--ink-4);margin-top:1px;font-weight:400}
.mz .tot-card .sumrow.tot-net .k small{display:inline;margin-left:4px}
.mz .tot-card .sumrow .v{font-variant-numeric:tabular-nums;color:var(--ink);font-weight:550}
.mz .tot-card .tot-off .v,.mz .tot-card .v.neg{color:var(--pos)}
.mz .tot-card .tot-net{border-top:1px dashed var(--line);margin-top:6px;padding-top:11px}
.mz .tot-card .sumrow.total{margin-top:8px;padding:13px 14px;border-radius:12px;align-items:baseline;
  background:linear-gradient(135deg,color-mix(in srgb,var(--brand) 9%,var(--surface)),color-mix(in srgb,var(--brand) 3%,var(--surface)));border:1px solid color-mix(in srgb,var(--brand) 18%,var(--line))}
.mz .tot-card .sumrow.total .k{font-weight:650;color:var(--ink);font-size:13.5px}
.mz .tot-card .sumrow.total .v{font-size:26px;font-weight:700;letter-spacing:-.025em;color:var(--ink)}
.tot-add{display:flex;align-items:center;justify-content:center;gap:7px;margin:6px 0 2px;height:36px;border-radius:10px;font-size:12.5px;font-weight:600;
  color:var(--brand);border:1.5px dashed color-mix(in srgb,var(--brand) 35%,var(--line));background:color-mix(in srgb,var(--brand) 3%,transparent);transition:background .2s,border-color .2s,transform .14s ${GLIDE}}
.tot-add:hover{background:color-mix(in srgb,var(--brand) 8%,transparent);border-color:var(--brand)}
.tot-add:active{transform:scale(.985)}
.tot-disc{margin:6px 0 2px;padding:11px 12px 10px;border-radius:12px;border:1px solid color-mix(in srgb,var(--pos) 28%,var(--line));
  background:color-mix(in srgb,var(--pos-50) 70%,var(--surface));animation:tdIn .36s ${GLIDE}}
.tot-disc.ro{padding:9px 12px}
@keyframes tdIn{from{opacity:0;transform:translateY(-4px) scale(.985)}to{opacity:1;transform:none}}
.td-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px}
.td-top .k{display:inline-flex;align-items:center;gap:7px;color:var(--ink);font-weight:600}
.td-top .k svg{color:var(--pos)}
.td-top .k em{font-style:normal;font-size:11px;font-weight:650;padding:1px 7px;border-radius:20px;background:var(--surface);color:var(--pos);border:1px solid color-mix(in srgb,var(--pos) 25%,transparent)}
.td-top .v{font-weight:650;font-variant-numeric:tabular-nums}
.td-edit{display:flex;align-items:center;gap:8px;margin-top:9px}
.mz .td-mode{flex:0 0 auto;background:var(--surface)}
.mz .td-mode button{min-width:38px;font-weight:650}
.mz .td-val{flex:1;min-width:0;height:34px;text-align:right;font-variant-numeric:tabular-nums;background:var(--surface)}
.td-x{flex:0 0 30px;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--ink-3);transition:background .15s,color .15s}
.td-x:hover{background:var(--neg-50);color:var(--neg)}
.td-note{display:block;margin-top:7px;font-size:11px;color:var(--ink-3);line-height:1.45}
.td-note.warn{color:var(--warn)}
.tot-saved{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11.5px;color:var(--pos);font-weight:550}
.mz .tot-card .sumrow.paid,.mz .tot-card .sumrow.balance{margin-top:2px}

/* ---------- dialogs rise in; the backdrop fades ---------- */
.mz .scrim>div:first-child,.mz .studio-modal{animation:dlgIn .38s ${GLIDE} both}
.mz .studio-overlay{animation:fade .2s ease-out}
@keyframes dlgIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}

/* ---------- a calmer line grid: a chosen product reads as text until the row is pointed at or edited ---------- */
.mz .line-grid tbody tr:not(:hover):not(:focus-within) .smart-picker .inp:not(:placeholder-shown){border-color:transparent;background:transparent;box-shadow:none}
.mz .line-grid tbody tr:not(:hover):not(:focus-within) .smart-picker:has(.inp:not(:placeholder-shown))>svg{opacity:0}
.mz .line-grid .smart-picker .inp,.mz .line-grid .smart-picker>svg{transition:border-color .18s,background-color .18s,opacity .18s}
.mz .line-grid tbody tr{transition:background-color .18s}

/* ---------- 3.17 line discount: % or AED ---------- */
.mz .lg-di{width:150px}
.mz .lg-t{width:96px}
.disc-in{display:flex;align-items:center;gap:5px;min-width:0}
.mz .disc-in .seg.disc-mode{flex:0 0 auto;width:auto;padding:2px;border-radius:7px;background:var(--surface-2);border:1px solid var(--line-2)}
.mz .disc-in .seg.disc-mode button{flex:0 0 auto;min-width:0;min-height:0;height:22px;padding:0 5px;font-size:10.5px;font-weight:650;line-height:22px;border-radius:5px;color:var(--ink-3)}
.mz .disc-in .seg.disc-mode button.on{color:var(--brand)}
.mz .disc-in .seg.disc-mode button:disabled{opacity:1;cursor:default}
.mz .disc-in .inp{flex:1;min-width:52px;padding-left:5px;padding-right:6px}
.mz .line-grid tbody tr:not(:hover):not(:focus-within) .disc-in .seg.disc-mode{background:transparent;border-color:transparent}
.mz .line-grid tbody tr:not(:hover):not(:focus-within) .disc-in .seg.disc-mode button:not(.on){opacity:.35}
.mz .line-card .disc-in .seg.disc-mode button,.mz .document-lines .disc-in .seg.disc-mode button{height:28px;line-height:28px;padding:0 9px}

@media (prefers-reduced-motion:reduce){.view,.mz .doc-workspace,.mz .doc-list-view,.tot-disc,.mz .scrim>div:first-child,.mz .studio-modal{animation:none}.mz .btn:active,.mz .icon-btn:active{transform:none}}
`;
