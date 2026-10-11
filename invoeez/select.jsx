/* ============================================================================
   SELECT — every drop-down in the app. Written like a native <select>
   (<option>/<optgroup> children, onChange(e) with e.target.value) but drawn
   as a proper listbox: a check on the current choice, group headers, a
   search box on long lists, type-ahead, full keyboard support, and a bottom
   sheet on phones. "＋ New…" options (value "__new__") render as an action.
   ========================================================================== */
function selectOptions(children) {
  const out = [];
  const text = (c) => React.Children.toArray(c).map((x) => (typeof x === "string" || typeof x === "number" ? String(x) : x && x.props ? text(x.props.children) : "")).join("");
  const walk = (nodes, group) => React.Children.forEach(nodes, (n) => {
    if (!n || typeof n !== "object" || !n.props) return;
    if (n.type === React.Fragment) return walk(n.props.children, group);
    if (n.type === "optgroup") return walk(n.props.children, n.props.label);
    if (n.type === "option") {
      const label = text(n.props.children);
      out.push({ value: n.props.value != null ? String(n.props.value) : label, label, disabled: !!n.props.disabled, group });
    }
  });
  walk(children, null);
  return out;
}
function Select({ children, value, onChange, disabled, className, style, id, title, "aria-label": ariaLabel, placeholder, compact }) {
  const opts = selectOptions(children);
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [act, setAct] = useState(0), [pos, setPos] = useState(null);
  const btn = React.useRef(null), pop = React.useRef(null), list = React.useRef(null), typed = React.useRef({ s: "", t: 0 });
  const cur = String(value == null ? "" : value);
  const selected = opts.find((o) => o.value === cur);
  const shown = selected || (cur === "" ? opts.find((o) => o.value === "") : null) || (cur === "" ? null : opts[0]);
  const searchable = opts.length > 8;
  const found = q.trim() ? opts.filter((o) => o.value === "__new__" || normSearch(o.label + " " + (o.group || "")).includes(normSearch(q))) : opts;
  const sheet = typeof window !== "undefined" && window.innerWidth < 600;
  const place = () => {
    const el = btn.current; if (!el) return;
    const r = el.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
    const width = Math.min(Math.max(r.width, 220), vw - 16), below = vh - r.bottom - 10, above = r.top - 10;
    const h = Math.min(340, Math.max(below, above));
    const left = Math.min(Math.max(8, r.left), vw - width - 8);
    setPos(below >= Math.min(260, h) || below >= above ? { top: r.bottom + 6, left, width, maxHeight: Math.min(340, below) } : { bottom: vh - r.top + 6, left, width, maxHeight: Math.min(340, above) });
  };
  const choose = (o) => {
    if (!o || o.disabled) return;
    setOpen(false); setQ("");
    if (o.value !== cur || o.value === "__new__") onChange && onChange({ target: { value: o.value }, currentTarget: { value: o.value } });
    requestAnimationFrame(() => btn.current && btn.current.focus());
  };
  const show = () => { if (disabled) return; place(); setQ(""); const i = Math.max(0, opts.findIndex((o) => o.value === cur)); setAct(i); setOpen(true); };
  React.useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!btn.current?.contains(e.target) && !pop.current?.contains(e.target)) { setOpen(false); setQ(""); } };
    const move = (e) => { if (pop.current && pop.current.contains(e.target)) return; place(); };
    document.addEventListener("pointerdown", away); window.addEventListener("resize", place); document.addEventListener("scroll", move, true);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("resize", place); document.removeEventListener("scroll", move, true); };
  }, [open]);
  React.useEffect(() => { if (open) list.current?.querySelector('[data-act="1"]')?.scrollIntoView({ block: "nearest" }); }, [act, open]);
  React.useEffect(() => { setAct(0); }, [q]);
  const step = (d) => { if (!found.length) return; let i = act; for (let n = 0; n < found.length; n++) { i = (i + d + found.length) % found.length; if (!found[i].disabled) break; } setAct(i); };
  const ahead = (k) => {
    const now = Date.now(); typed.current = { s: (now - typed.current.t < 700 ? typed.current.s : "") + k.toLowerCase(), t: now };
    const s = typed.current.s, start = opts.findIndex((o) => o.value === cur);
    const order = opts.slice(start + 1).concat(opts.slice(0, start + 1));
    return order.find((o) => !o.disabled && o.label.toLowerCase().startsWith(s)) || order.find((o) => !o.disabled && o.label.toLowerCase().startsWith(k.toLowerCase()));
  };
  const onBtnKey = (e) => {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key) && !open) { e.preventDefault(); show(); return; }
    if (!open && e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { const o = ahead(e.key); if (o && o.value !== "__new__") { e.preventDefault(); choose(o); } }
  };
  const onListKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); step(-1); }
    else if (e.key === "Home") { e.preventDefault(); setAct(0); }
    else if (e.key === "End") { e.preventDefault(); setAct(found.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); choose(found[act]); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); setQ(""); btn.current && btn.current.focus(); }
    else if (e.key === "Tab") { setOpen(false); setQ(""); }
    else if (!searchable && e.key.length === 1 && /\S/.test(e.key)) { const o = ahead(e.key); if (o) setAct(found.indexOf(o)); }
  };
  const rid = React.useId();
  let lastGroup;
  const host = typeof document !== "undefined" ? document.querySelector(".mz") || document.body : null;
  return <>
    <button type="button" ref={btn} id={id} title={title} className={cx("inp sel", compact && "sel-c", open && "is-open", !shown && "is-empty", className)} style={style}
      role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? rid : undefined} aria-label={ariaLabel} data-value={cur}
      disabled={disabled} onClick={() => (open ? (setOpen(false), setQ("")) : show())} onKeyDown={onBtnKey}>
      <span className="sel-v">{shown ? shown.label : placeholder || "Select…"}</span>
      <ChevronDown size={14} strokeWidth={2.2} className="sel-cv" />
    </button>
    {open && pos && host && ReactDOM.createPortal(<>
      {sheet && <div className="sel-scrim" onPointerDown={() => { setOpen(false); setQ(""); }} />}
      <div ref={pop} className={cx("sel-pop", sheet && "sheet")} style={sheet ? undefined : pos} onKeyDown={onListKey}>
        {sheet && <div className="sel-sheet-h"><b>{ariaLabel || "Choose"}</b><button type="button" onClick={() => { setOpen(false); setQ(""); }} aria-label="Close"><X size={16} /></button></div>}
        {searchable && <div className="sel-search"><Search size={14} /><input autoFocus={!sheet} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to filter…" aria-label={"Filter " + (ariaLabel || "options")} /></div>}
        <div className="sel-list" role="listbox" id={rid} tabIndex={searchable ? -1 : 0} aria-label={ariaLabel}
          aria-activedescendant={found[act] ? rid + "-" + act : undefined} ref={(el) => { list.current = el; if (el && !searchable && document.activeElement === btn.current) el.focus(); }}>
          {found.map((o, i) => {
            const head = o.group && o.group !== lastGroup ? <div className="sel-g" key={"g" + i}>{o.group}</div> : null; lastGroup = o.group;
            const isNew = o.value === "__new__", on = o.value === cur && !isNew;
            return <React.Fragment key={o.value + "|" + i}>{head}
              <div id={rid + "-" + i} role="option" aria-selected={on} aria-disabled={o.disabled || undefined} data-act={i === act ? "1" : undefined}
                className={cx("sel-o", on && "on", i === act && "act", o.disabled && "dis", isNew && "new", o.value === "" && "none")}
                onPointerEnter={() => setAct(i)} onPointerDown={(e) => e.preventDefault()} onClick={() => choose(o)}>
                {isNew ? <Plus size={14} strokeWidth={2.4} /> : <span className="sel-ck">{on && <Check size={14} strokeWidth={2.6} />}</span>}
                <span className="sel-l">{isNew ? o.label.replace(/^[＋+]\s*/, "") : o.label || <i>None</i>}</span>
              </div></React.Fragment>;
          })}
          {!found.length && <div className="sel-empty">Nothing matches “{q}”.</div>}
        </div>
      </div></>, host)}
  </>;
}

const SELECT_CSS = `
.mz .inp.sel{display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer;background:var(--surface);
  background-image:none;padding-right:10px;transition:border-color .14s,box-shadow .14s,background .14s}
.mz .inp.sel:hover:not(:disabled){border-color:color-mix(in srgb,var(--ink-4) 70%,var(--line))}
.mz .inp.sel.is-open{border-color:var(--brand);box-shadow:var(--ring)}
.mz .inp.sel:disabled{cursor:not-allowed;background:var(--surface-2);color:var(--ink-3)}
.mz .inp.sel .sel-v{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mz .inp.sel.is-empty .sel-v{color:var(--ink-4)}
.mz .inp.sel .sel-cv{flex:0 0 auto;color:var(--ink-3);transition:transform .18s var(--ease)}
.mz .inp.sel.is-open .sel-cv{transform:rotate(180deg);color:var(--brand)}
.mz .line-grid .inp.sel{height:30px;padding:4px 6px 4px 8px;border-color:transparent;background:transparent;font-size:13px}
.mz .line-grid tr:hover .inp.sel:not(:disabled),.mz .line-grid .inp.sel:focus{border-color:var(--line);background:var(--surface)}
.mz .line-grid .inp.sel:disabled .sel-cv{opacity:0}
.sel-pop{position:fixed;z-index:1300;display:flex;flex-direction:column;overflow:hidden;border-radius:12px;background:var(--surface);
  border:1px solid var(--line);box-shadow:0 18px 44px rgba(16,18,22,.16),0 3px 10px rgba(16,18,22,.08);animation:selin .13s var(--ease)}
.mz[data-theme="dark"] .sel-pop{background:#1C2025;border-color:rgba(255,255,255,.1);box-shadow:0 22px 50px rgba(0,0,0,.55)}
@keyframes selin{from{opacity:0;transform:translateY(-3px) scale(.99)}to{opacity:1;transform:none}}
.sel-search{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line-2);color:var(--ink-3)}
.sel-search input{flex:1;min-width:0;border:0;outline:0;background:none;font-size:13px;color:var(--ink)}
.mz .sel-search input:focus-visible,.mz .sel-list:focus-visible{outline:none}
.sel-search:focus-within{color:var(--brand)}
.sel-list{overflow-y:auto;padding:5px;outline:none;flex:1}
.sel-g{padding:9px 10px 4px;font-size:10px;font-weight:650;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-4)}
.sel-o{display:flex;align-items:center;gap:8px;min-height:34px;padding:6px 10px 6px 8px;border-radius:8px;font-size:13px;color:var(--ink);cursor:pointer;line-height:1.3}
.sel-o .sel-ck{width:16px;flex:0 0 16px;display:grid;place-items:center;color:var(--brand)}
.sel-o .sel-l{flex:1;min-width:0;overflow-wrap:anywhere}
.sel-o.act{background:var(--surface-3)}
.sel-o.on{font-weight:600}
.sel-o.on.act,.sel-o.on{background:var(--brand-50)}
.sel-o.on.act{background:var(--brand-100)}
.sel-o.none .sel-l{color:var(--ink-3)}
.sel-o.dis{opacity:.45;cursor:not-allowed}
.sel-o.new{margin-top:4px;border-top:1px dashed var(--line);border-radius:0 0 8px 8px;color:var(--brand);font-weight:600}
.sel-o.new svg{flex:0 0 16px}
.sel-empty{padding:14px 10px;font-size:12.5px;color:var(--ink-3)}
.sel-scrim{position:fixed;inset:0;z-index:1290;background:rgba(10,12,15,.45);animation:fade .15s ease-out}
.sel-pop.sheet{left:0;right:0;bottom:0;top:auto;width:auto;max-height:72vh;border-radius:18px 18px 0 0;animation:selsheet .2s var(--ease);
  padding-bottom:env(safe-area-inset-bottom)}
@keyframes selsheet{from{transform:translateY(30px);opacity:.6}to{transform:none;opacity:1}}
.sel-sheet-h{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 8px;font-size:14px}
.sel-sheet-h button{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;color:var(--ink-3)}
.sel-pop.sheet .sel-o{min-height:44px;font-size:14.5px}
`;
