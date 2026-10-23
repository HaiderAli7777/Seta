/* ============================================================================
   3.26 — open a customer, vendor or product from wherever it is used.
   A quotation, invoice, credit note, purchase order, bill, debit note, receipt,
   payment, expense or post-dated cheque opens the record behind its customer,
   vendor or product in a panel that slides in from the right: the figures that
   matter at a glance, every detail to change, and its activity. Saving changes
   the record everywhere and brings an open draft up to date (payment terms,
   place of supply, salesperson, price list, product names and prices) without
   leaving it. The Customers, Vendors and Products screens use the same panel.
   ========================================================================== */
const REC_KINDS = {
  customer: { mod: "sales", area: "customers", noun: "customer", Icon: Users },
  vendor: { mod: "purchase", area: "vendors", noun: "vendor", Icon: Truck },
  product: { mod: "inventory", area: "products", noun: "product", Icon: Package },
};
/* May the signed-in person do this with records of this kind? */
const recCan = (kind, act) => accOk(REC_KINDS[kind].area, act);
const recKindOf = (p) => (p && p.role === "vendor" ? "vendor" : "customer");
const DOC_STATE_L = { draft: "Draft", posted: "Posted", sent: "Sent", accepted: "Accepted", invoiced: "Invoiced", submitted: "Awaiting approval",
  approved: "Approved", rejected: "Rejected", billed: "Billed", lost: "Lost", expired: "Expired" };
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------ the figures */
function partnerFigures(state, p) {
  const sale = p.role !== "vendor", y = TODAY.slice(0, 4);
  const charge = sale ? "invoice" : "bill", credit = sale ? "credit_note" : "debit_note";
  const row = aging(state, sale ? "receivable" : "payable", TODAY).rows.find((r) => r.partner.id === p.id);
  const docs = state.docs.filter((d) => d.partner === p.id), pays = state.payments.filter((x) => x.partner === p.id);
  const posted = docs.filter((d) => d.state === "posted");
  const year = R2(posted.filter((d) => d.date.slice(0, 4) === y && (d.type === charge || d.type === credit))
    .reduce((s, d) => s + (d.type === charge ? 1 : -1) * amounts(d).net, 0));
  const last = posted.filter((d) => d.type === charge).sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))[0];
  return { balance: row ? row.total : 0, overdue: row ? R2(row.items.filter((i) => i.due < TODAY).reduce((s, i) => s + i.open, 0)) : 0,
    open: row ? row.items.length : 0, year, last, docs, pays };
}
function productFigures(state, books, p) {
  const y = TODAY.slice(0, 4), sales = productHistory(state, p.id, "sale"), year = sales.filter((l) => l.date.slice(0, 4) === y);
  return { st: books.stock[p.id] || { qty: 0, value: 0 }, cost: currentCost(p, books), lastSale: sales[0], lastBuy: productHistory(state, p.id, "purchase")[0],
    soldQty: R2(year.reduce((s, l) => s + (+l.qty || 0), 0)), soldAmt: R2(year.reduce((s, l) => s + l.amount, 0)),
    uses: state.docs.filter((d) => d.lines.some((l) => l.product === p.id)).length };
}

/* ---------------------------------------------------------- check and save */
function partnerError(r) {
  if (r.name.trim().length < 2) return "Enter a name with at least two characters.";
  if (r.trn && !/^\d{15}$/.test(r.trn.trim())) return "A UAE TRN is exactly 15 digits — or leave it blank.";
  if (r.terms === "" || !Number.isFinite(+r.terms) || +r.terms < 0) return "Payment terms are a number of days, zero or more.";
  if (branchesOf(r).some((b) => !branchOk(b) && (b.address || b.address2 || b.contact || b.phone))) return "Give every delivery address a name, or remove it.";
  return "";
}
function partnerRecord(r) {
  const branches = branchesOf(r).filter(branchOk).map((b) => ({ ...b, name: b.name.trim() }));
  return { ...r, name: r.name.trim(), trn: (r.trn || "").trim(), terms: +r.terms || 0, branches: branches.length ? branches : undefined,
    defaultBranch: branches.some((b) => b.id === r.defaultBranch) ? r.defaultBranch : undefined };
}
function productError(r, books) {
  const c = CATEGORIES.find((x) => x.id === r.category);
  if (r.name.trim().length < 2) return "Enter a name with at least two characters.";
  if (r.code.trim() && PRODUCTS.some((x) => x.id !== r.id && normSearch(x.code) === normSearch(r.code))) return "This product code is already in use.";
  if ((r.barcode || "").trim() && PRODUCTS.some((x) => x.id !== r.id && x.barcode === r.barcode.trim())) return "This barcode already belongs to another product.";
  if (!c) return "Choose a product category.";
  if (![r.price, r.cost, r.reorder].every((x) => Number.isFinite(+x) && +x >= 0)) return "Prices, cost and the low stock threshold must be zero or more.";
  const old = PROD[r.id], st = books.stock[r.id];
  if (old && st && (Math.abs(st.qty) > 0.001 || Math.abs(st.value) > 0.001) && (old.inventory !== c.inventory || old.kind !== r.kind))
    return "Clear this product's stock before changing its inventory account or product type.";
  return "";
}
function productRecord(r, state) {
  const c = CATEGORIES.find((x) => x.id === r.category);
  return { ...r, code: r.code.trim() || (autoCodes(state) ? nextProductCode(state) : ""), name: r.name.trim(), barcode: (r.barcode || "").trim(),
    price: +r.price || 0, cost: +r.cost || 0, reorder: +r.reorder || 0, ...accountSnapshot(c) };
}
/* The record is usable on the open document at once, before the books catch up. */
function publishRecord(product, rec) {
  if (product) { const en = enrichProduct(rec), i = PRODUCTS.findIndex((p) => p.id === rec.id); PROD[rec.id] = en; if (i >= 0) PRODUCTS[i] = en; else PRODUCTS.push(en); }
  else { const i = PARTNERS.findIndex((p) => p.id === rec.id); PMAP[rec.id] = rec; if (i >= 0) PARTNERS[i] = rec; else PARTNERS.push(rec); }
}

/* -------------------------------------------- bring an open draft up to date */
/* A changed customer or vendor: the draft follows what it took from the record, unless someone had already changed it there. */
function applyPartnerChange(d, old, rec, reprice, salespeople) {
  const patch = {}, said = [], isQ = d.type === "quote", isPO = d.type === "purchase_order", sale = DOCMETA[d.type].side === "sale";
  if ((+old.terms || 0) !== (+rec.terms || 0)) { patch.due = addDays(d.date, rec.terms || 0); said.push(`${isQ ? "valid until" : isPO ? "deliver by" : "payment due"} ${dmy(patch.due)}`); }
  if (old.emirate !== rec.emirate && d.emirate === old.emirate && !d.deliverTo) { patch.emirate = rec.emirate; said.push(`place of supply ${rec.emirate}`); }
  if (sale && (old.salesman || "") !== (rec.salesman || "") && (d.salesman || "") === (old.salesman || "")) {
    patch.salesman = rec.salesman || ""; const who = (salespeople || []).find((x) => x.id === rec.salesman); said.push(rec.salesman ? `salesperson ${who ? who.name : "changed"}` : "no salesperson"); }
  if ((old.pricelist || "") !== (rec.pricelist || "") && (d.pricelist || "") === (old.pricelist || "")) { patch.pricelist = rec.pricelist || ""; said.push("its price list"); }
  if (d.deliverTo && d.delivery) { const b = branchesOf(rec).find((x) => x.id === d.deliverTo); if (b) { const snap = snapBranch(b); if (JSON.stringify(snap) !== JSON.stringify(d.delivery)) { patch.delivery = snap; said.push("the delivery address"); } } }
  if (!said.length) return null;
  const next = { ...d, ...patch };
  return { doc: "pricelist" in patch ? reprice(next) : next, said };
}
/* A changed product: lines still on its name, price and VAT take the new ones; a price typed on the line stays. */
function applyProductChange(d, old, rec, priceOf) {
  const sale = DOCMETA[d.type].side === "sale", tx = (t) => (sale && t === "rc5" ? "s5" : t);
  let n = 0; const what = new Set();
  const lines = d.lines.map((l) => {
    if (l.product !== rec.id) return l;
    let x = l;
    if (l.desc === old.name && rec.name !== old.name) { x = { ...x, desc: rec.name }; what.add("name"); }
    if (old.tax !== rec.tax && l.tax === tx(old.tax)) { x = { ...x, tax: tx(rec.tax) }; what.add("VAT"); }
    if (!l.manualPricing) { const pr = priceOf(x); if (R2(+pr.price || 0) !== R2(+l.price || 0)) what.add("price"); x = { ...x, ...pr }; }
    if (x !== l) n++;
    return x;
  });
  const w = [...what];
  return w.length ? { doc: { ...d, lines }, said: [`the new ${w.length > 1 ? w.slice(0, -1).join(", ") + " and " + w[w.length - 1] : w[0]} on ${n} ${n === 1 ? "line" : "lines"}`] } : null;
}

/* -------------------------------------------------------- small pieces */
/* The arrow that opens the record behind a field. */
function RecordOpen({ kind, id, onOpen, className }) {
  const rec = kind === "product" ? PROD[id] : PMAP[id];
  if (!rec || !onOpen || !recCan(kind, "view")) return null;
  const t = `Open ${rec.name}`;
  return <button type="button" className={cx("rec-open", className)} title={t} aria-label={t} onMouseDown={(e) => e.preventDefault()}
    onClick={(e) => { e.stopPropagation(); onOpen(id); }}><ArrowUpRight size={14} strokeWidth={2.2} /></button>;
}
const RpSec = ({ icon: I, title, hint, children, id }) => <section className="rp-sec" id={id}>
  <h3><span className="rp-si"><I size={14} /></span><span>{title}{hint && <small>{hint}</small>}</span></h3>{children}</section>;

/* ------------------------------------------------------------- the panel */
function RecordPanel({ kind, initial, isNew, state, setState, books, toast, close, onSaved, tab: startTab, selecting, context }) {
  const product = kind === "product", K = REC_KINDS[kind], mc = MODULE_COLORS[K.mod];
  const [r, setR] = useState(() => ({ ...(initial || (product ? newProduct() : newPartner(kind))) }));
  const base = React.useRef(JSON.stringify(r)), ref = React.useRef(null), keys = React.useRef({});
  const [tab, setTab] = useState(startTab || "details"), [err, setErr] = useState(""), [ask, setAsk] = useState(false), [side, setSide] = useState("sale");
  const can = recCan(kind, isNew ? "create" : "edit"), dirty = JSON.stringify(r) !== base.current;
  const f = (k, v) => { setErr(""); setAsk(false); setR((x) => ({ ...x, [k]: v })); };
  const fig = useMemo(() => (isNew ? null : product ? productFigures(state, books, PROD[r.id] || r) : partnerFigures(state, PMAP[r.id] || r)), [state, books]);
  const hideCost = accField("cost") === "hide", roPrice = accField("price") === "readonly";
  const tryClose = () => (dirty && can ? setAsk(true) : close());
  const save = () => {
    if (!can) return;
    const e = product ? productError(r, books) : partnerError(r);
    if (e) { setErr(e); setAsk(false); return; }
    const old = isNew ? null : product ? PROD[r.id] : PMAP[r.id];
    const rec = product ? productRecord(r, state) : partnerRecord(r);
    publishRecord(product, rec);
    saveMaster(setState, product ? "products" : "partners", rec);
    close();
    const said = onSaved ? onSaved(rec, old) : null;
    toast(said || `${rec.name} saved`);
  };
  keys.current = { tryClose, save, ask };
  /* Esc closes (asking first when there are changes), Ctrl S saves the record, not the document behind it, and Tab stays in the panel. */
  React.useEffect(() => {
    const el = ref.current, prev = document.activeElement;
    requestAnimationFrame(() => (isNew ? el.querySelector(".rp-body input:not(:disabled)") : el)?.focus({ preventScroll: true }));
    const key = (e) => {
      if (e.defaultPrevented || (e.target !== document.body && !el.contains(e.target))) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); keys.current.ask ? setAsk(false) : keys.current.tryClose(); }
      else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); e.stopPropagation(); keys.current.save(); }
      else if (e.key === "Tab") {
        const all = [...el.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex='0']")].filter((x) => x.offsetParent !== null);
        const first = all[0], last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last && last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first && first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prev && prev.focus && prev.focus({ preventScroll: true }); };
  }, []);

  const name = r.name.trim() || (isNew ? `New ${K.noun}` : cap1(K.noun));
  const cat = product ? CATEGORIES.find((c) => c.id === r.category) : null;
  const sub = product ? [r.code || (isNew ? (autoCodes(state) ? "Code " + nextProductCode(state) : "No code yet") : "No code"), cat && cat.name, r.uom].filter(Boolean)
    : [r.trn ? "TRN " + r.trn : "Not VAT registered", r.emirate, +r.terms ? `${+r.terms} days` : "Cash"];
  const sp = !product && r.salesman && (state.salespeople || []).find((x) => x.id === r.salesman);
  const low = product && fig && r.kind === "goods" && fig.st.qty <= (+r.reorder || 0);
  const tags = product ? [[r.kind === "goods" ? "Storable goods" : "Service", "info"], r.brand && [r.brand], r.barcode && ["Barcode " + r.barcode], low && [fig.st.qty <= 0 ? "Out of stock" : "Low stock", fig.st.qty <= 0 ? "neg" : "warn"]]
    : [[r.trn ? "VAT registered" : "Not VAT registered", r.trn ? "ok" : ""], r.emirate === "Export" && ["Export · zero-rated", "info"], r.emirate === "Import" && ["Import · reverse charge", "info"],
      r.designatedZone && ["Designated zone", "gold"], sp && ["Salesperson " + sp.name], branchesOf(r).length > 0 && [`${branchesOf(r).length} delivery address${branchesOf(r).length === 1 ? "" : "es"}`]];

  const kpis = !fig ? [] : product ? [
    { l: "On hand", v: r.kind === "goods" ? <>{fig.st.qty} <small>{r.uom}</small></> : "Service", tone: r.kind === "goods" && (fig.st.qty <= 0 ? "neg" : low ? "warn" : "") },
    { l: "Sales price", v: +r.price ? <><small>AED</small> {money(+r.price, false)}</> : "Priced per sale" },
    hideCost ? { l: "Last sold", v: fig.lastSale ? <><small>AED</small> {money(fig.lastSale.unitNet, false)}</> : "Not yet", s: fig.lastSale && dmy(fig.lastSale.date) }
      : { l: "Unit cost", v: <><small>AED</small> {money(fig.cost, false)}</>, s: r.kind === "goods" ? (COSTING[books.method] || COSTING.avco).label : "Service", cls: "cost-data" },
    { l: "Sold this year", v: <>{fig.soldQty} <small>{r.uom}</small></>, s: fig.soldAmt ? `AED ${money(fig.soldAmt, false)}` : "No sales yet" },
  ] : [
    { l: r.role === "vendor" ? "You owe" : "Owes you", v: <><small>AED</small> {money(fig.balance, false)}</>, s: fig.open ? `${fig.open} open ${r.role === "vendor" ? "bill" : "invoice"}${fig.open === 1 ? "" : "s"}` : "All settled", cls: "bal-data" },
    { l: "Overdue", v: <><small>AED</small> {money(fig.overdue, false)}</>, tone: fig.overdue > 0.004 ? "neg" : "", s: fig.overdue > 0.004 ? "Past its due date" : "Nothing overdue", cls: "bal-data" },
    { l: r.role === "vendor" ? "Purchases this year" : "Sales this year", v: <><small>AED</small> {money(fig.year, false)}</>, s: "Excluding VAT" },
    { l: r.role === "vendor" ? "Last bill" : "Last invoice", v: fig.last ? fig.last.number : "None yet", s: fig.last && dmy(fig.last.date), cls: "txt" },
  ];

  const tabs = [["details", "Details", Pencil], ...(isNew ? [] : product ? [["history", "Price history", History]] : [["activity", "Activity", Clock]])];
  const acts = !fig || product ? [] : [
    ...fig.docs.map((d) => ({ id: d.id, date: d.date, no: d.number, t: DOCMETA[d.type].short, st: DOC_STATE_L[d.state] || cap1(d.state || ""), amt: amounts(d).total,
      tone: d.state === "posted" ? "ok" : d.state === "rejected" ? "neg" : "", kind: d.type })),
    ...fig.pays.map((x) => ({ id: x.id, date: x.date, no: x.number, t: x.kind === "in" ? "Receipt" : "Payment", st: "Recorded", amt: x.amount, tone: "info", kind: "pay" })),
  ].sort((a, b) => b.date.localeCompare(a.date) || String(b.no).localeCompare(String(a.no)));

  const saveLabel = isNew ? (selecting ? "Save & select" : product ? "Save product" : "Create") : "Save changes";
  const fld = (label, k, p = {}) => <Field label={label} span={p.span}><Input value={r[k] ?? ""} onChange={(e) => f(k, e.target.value)} {...p.inp} /></Field>;

  return ReactDOM.createPortal(<div className="rp-layer">
    <div className="rp-scrim" onMouseDown={tryClose} />
    <aside ref={ref} tabIndex={-1} className={cx("rp", product && "is-prod", dirty && "dirty")} role="dialog" aria-modal="true" aria-label={`${cap1(K.noun)}: ${name}`} data-kind={kind}
      style={{ "--rc": mc.m, "--rc-l": mc.l, "--rc-hi": mc.hi, "--rc-deep": mc.deep }}>
      <header className="rp-head">
        <div className="rp-bar">
          <span className="rp-kind"><K.Icon size={13} />{isNew ? `New ${K.noun}` : cap1(K.noun)}</span>
          {!can && <span className="rp-ro"><Lock size={11} />View only</span>}
          {!isNew && fig && <span className="rp-uses">{product ? `On ${fig.uses} document${fig.uses === 1 ? "" : "s"}` : `${fig.docs.length} document${fig.docs.length === 1 ? "" : "s"} · ${fig.pays.length} payment${fig.pays.length === 1 ? "" : "s"}`}</span>}
          <button className="rp-x" onClick={tryClose} aria-label="Close" title="Close (Esc)"><X size={18} /></button>
        </div>
        <div className="rp-id">
          <span className="rp-av" aria-hidden="true">{product ? (r.kind === "goods" ? <Package size={24} strokeWidth={1.7} /> : <Layers size={24} strokeWidth={1.7} />) : initials(r.name) || <K.Icon size={24} strokeWidth={1.7} />}</span>
          <div className="rp-nm"><h2>{name}</h2><p>{sub.join(" · ")}</p></div>
        </div>
        <div className="rp-tags">{tags.filter(Boolean).map(([t, tone]) => <span key={t} className={cx("rp-tag", tone)}>{t}</span>)}</div>
      </header>
      {kpis.length > 0 && <div className="rp-kpis">{kpis.map((k) => <div key={k.l} className={cx("rp-kpi", k.tone, k.cls)}><small>{k.l}</small><b>{k.v}</b>{k.s && <span>{k.s}</span>}</div>)}</div>}
      {tabs.length > 1 && <div className="rp-tabs" role="tablist" aria-label={`${cap1(K.noun)} views`}>{tabs.map(([k, l, I]) =>
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><I size={14} />{l}
          {k === "activity" && <em>{acts.length}</em>}</button>)}</div>}

      <div className="rp-body">
        {context && <div className="rp-ctx"><Link2 size={14} /><span>{context}</span></div>}
        {tab === "details" && <fieldset className="rp-fs" disabled={!can}>
          {product ? <>
            <RpSec icon={Package} title="Product" hint="How it is named and found on documents">
              <div className="rp-grid">
                {fld("Product name", "name", { span: 2, inp: { placeholder: "e.g. Apple MacBook Air 13\" M3" } })}
                {fld("Name in Arabic (optional)", "nameAr", { span: 2, inp: { dir: "rtl", lang: "ar", placeholder: "اسم المنتج بالعربية" } })}
                {fld(autoCodes(state) ? "Product code / SKU · automatic" : "Product code / SKU · optional", "code", { inp: { placeholder: autoCodes(state) ? "Leave empty for " + nextProductCode(state) : "Optional" } })}
                {fld("Barcode", "barcode", { inp: { placeholder: "Scan or type the barcode" } })}
                <Field label="Brand"><CreatableSelect value={r.brand} onChange={(v) => f("brand", v)} options={brandOptions(state)} placeholder="No brand" createLabel="New brand" onCreate={addBrand(setState)} ariaLabel="Brand" disabled={!can} /></Field>
                <Field label="Category"><CreatableSelect value={r.category} onChange={(v) => f("category", v)} options={CATEGORIES.filter((c) => c.id !== "cat_opening").map((c) => ({ value: c.id, label: c.name }))} createLabel="New category"
                  hint={`It starts with the accounts of "${(CATEGORIES.find((c) => c.id === (r.kind === "goods" ? "cat_goods" : "cat_services")) || {}).name || "the default category"}". You can change them later under Product categories.`}
                  onCreate={addCategory(setState, r.kind)} ariaLabel="Category" disabled={!can} /></Field>
                <Field label="Item type"><Select value={r.kind} onChange={(e) => { const v = e.target.value; setErr(""); setR((x) => ({ ...x, kind: v, category: v === "goods" ? "cat_goods" : "cat_services" })); }}>
                  <option value="goods">Storable goods</option><option value="service">Service / expense</option></Select></Field>
                <Field label="Default VAT"><Select value={r.tax} onChange={(e) => f("tax", e.target.value)}>{TAXES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
              </div>
            </RpSec>
            <RpSec icon={Boxes} title="Units & stock" hint="Quantities on documents use the unit">
              <div className="rp-grid">
                {fld("Unit of measure", "uom", { inp: { placeholder: "Units, Boxes, Hours…" } })}
                {fld("Packing", "packing", { inp: { placeholder: "e.g. Box of 12 · 500 ml" } })}
                <Field label="Low stock threshold"><Input n type="number" min="0" value={r.reorder ?? 5} onChange={(e) => f("reorder", e.target.value)} /></Field>
                {fig && r.kind === "goods" && <Field label="On hand now"><div className={cx("readonly", low && "warn")}>{fig.st.qty} {r.uom}{!hideCost && <small className="subtext cost-data">Stock value AED {money(fig.st.value, false)}</small>}</div></Field>}
              </div>
            </RpSec>
            <RpSec icon={Tag} title="Prices & VAT" hint="Documents start from these; price lists and special prices can change them">
              <div className="rp-grid">
                <Field label="Sales price · AED"><Input n type="number" min="0" step="0.01" disabled={roPrice} value={+r.price === 0 ? "" : r.price} placeholder="Empty: price it on each invoice" onChange={(e) => f("price", e.target.value)} /></Field>
                {!hideCost && <Field label="Cost price · AED"><Input n type="number" min="0" step="0.01" value={+r.cost === 0 ? "" : r.cost} placeholder="Set by the first purchase" onChange={(e) => f("cost", e.target.value)} /></Field>}
                {!hideCost && r.kind === "goods" && <Field label={"Current unit cost · " + (COSTING[books.method] || COSTING.avco).label} span={2}><div className="readonly mono">{PROD[r.id] ? "AED " + money(currentCost(PROD[r.id], books), false) : "Set by the first purchase"}
                  {r.lastPurchase ? <small className="subtext">Last purchase AED {money(r.lastPurchase, false)}</small> : null}</div></Field>}
              </div>
              {cat && <div className="rp-note"><BookOpen size={15} /><span><b>Accounts from {cat.name}</b>: revenue {cat.income} · cost or expense {cat.expense} · inventory {cat.inventory}. Change them for the whole category under Product categories.</span></div>}
            </RpSec>
            <p className="rp-id-line">Internal ID <code>{r.id}</code></p>
          </> : <>
            <RpSec icon={Building2} title="Business" hint="As it appears on invoices and in the VAT return">
              <div className="rp-grid">
                {fld("Registered name", "name", { span: 2, inp: { placeholder: kind === "vendor" ? "Gulf Supplies L.L.C." : "Al Manara Trading L.L.C." } })}
                {fld("Name in Arabic (optional)", "nameAr", { span: 2, inp: { dir: "rtl", lang: "ar", placeholder: "الاسم بالعربية" } })}
                <Field label="TRN"><Input value={r.trn || ""} inputMode="numeric" placeholder="15 digits, or blank" onChange={(e) => f("trn", e.target.value)} aria-invalid={!!r.trn && !/^\d{15}$/.test(r.trn.trim())} />
                  {r.trn && !/^\d{15}$/.test(r.trn.trim()) && <span className="rp-fe">A UAE TRN is exactly 15 digits</span>}</Field>
                <Field label="Territory"><Select value={r.emirate} onChange={(e) => f("emirate", e.target.value)}>{[...EMIRATES, "Export", "Import"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
              </div>
              <div className="rp-note"><Info size={15} /><span>{kind === "customer"
                ? r.emirate === "Export" ? "Exports are zero-rated — invoices default to 0% VAT." : `Standard-rated sales are reported under ${r.emirate} in Box 1 of the VAT return.`
                : r.emirate === "Import" ? "Imports self-account under the reverse charge — Box 3 and Box 10." : "Local purchases recover input VAT in Box 9."}</span></div>
            </RpSec>
            <RpSec icon={Mail} title="Contact & address" hint="Printed on documents; WhatsApp and email send to these">
              <div className="rp-grid">
                {fld("Email", "contact", { inp: { type: "email", placeholder: "accounts@company.ae" } })}
                {fld("WhatsApp number", "phone", { inp: { placeholder: "+971 50 123 4567" } })}
                {fld("Address line 1", "address", { inp: { placeholder: "Office / building, street" } })}
                {fld("Address line 2", "address2", { inp: { placeholder: "Area, city, P.O. Box (optional)" } })}
              </div>
            </RpSec>
            <RpSec icon={Wallet} title="Terms & pricing" hint="New documents take these; changing them here updates open drafts">
              <div className="rp-grid">
                <Field label="Payment terms (days)"><Input n type="number" min="0" value={r.terms} onChange={(e) => f("terms", e.target.value)} /></Field>
                <Field label="Default price list"><Select value={r.pricelist || ""} onChange={(e) => f("pricelist", e.target.value)}>
                  <option value="">Product prices</option>{(state.priceLists || []).filter((x) => x.side === (kind === "customer" ? "sale" : "purchase")).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
                {kind === "customer" && <Field label="Salesperson" span={2}><CreatableSelect value={r.salesman} onChange={(v) => f("salesman", v)} options={salespersonOptions(state)} placeholder="Unassigned" createLabel="New salesperson" onCreate={addSalesperson(setState)} ariaLabel="Salesperson" disabled={!can} /></Field>}
              </div>
            </RpSec>
            {kind === "customer" && <RpSec icon={Truck} title="Delivery addresses" hint="Branches or sites this customer receives goods at"><BranchEditor ed={r} setEd={(fn) => { setErr(""); setR(fn); }} /></RpSec>}
            {!isNew && <RpSec icon={Star} title="Special prices" hint={`Prices agreed with this ${K.noun}; they apply on every new document`}>
              <PartySpecials state={state} setState={setState} books={books} partner={r.id} role={r.role} toast={toast} /></RpSec>}
          </>}
        </fieldset>}

        {tab === "activity" && <div className="rp-act">
          {!acts.length ? <EmptyState icon={FileText} title="Nothing yet">{`Quotations, invoices and payments with this ${K.noun} will be listed here.`}</EmptyState>
            : acts.slice(0, 40).map((a, i) => <div key={a.id} className="rp-ar" style={{ "--i": i }}>
              <span className={cx("rp-ai", a.kind)}>{a.kind === "pay" ? <Banknote size={14} /> : <FileText size={14} />}</span>
              <span className="rp-at"><b>{a.no}</b><small>{a.t} · {dmy(a.date)}</small></span>
              <span className="rp-aa"><b>{money(a.amt, false)}</b><Pill tone={a.tone}>{a.st}</Pill></span></div>)}
          {acts.length > 40 && <p className="rp-more">The latest 40 of {acts.length}. The full list is in the statement of account.</p>}
        </div>}

        {tab === "history" && <div className="rp-hist">
          <div className="seg rp-side">{[["sale", "Sales"], ["purchase", "Purchases"]].map(([k, l]) => <button key={k} className={side === k ? "on" : ""} onClick={() => setSide(k)}>{l}</button>)}</div>
          <HistoryTable key={side} state={state} product={r.id} side={side} />
        </div>}
      </div>

      <footer className={cx("rp-foot", ask && "asking")}>
        {ask ? <>
          <span className="rp-msg warn"><AlertTriangle size={15} />Discard your changes to {name}?</span>
          <Btn onClick={() => setAsk(false)}>Keep editing</Btn><Btn kind="danger" onClick={close}>Discard</Btn>
        </> : <>
          <span className={cx("rp-msg", err && "err")} role={err ? "alert" : undefined}>{err ? <><CircleAlert size={15} />{err}</>
            : !can ? <><Lock size={13} />{`Changing ${K.noun}s needs edit rights`}</>
            : dirty ? <><i className="rp-dot" />Unsaved changes <kbd>Ctrl S</kbd></>
            : isNew ? (selecting ? "Saved and put on your document in one step" : `A new ${K.noun}, ready for your next document`) : "No changes yet"}</span>
          <Btn onClick={tryClose}>{can ? "Cancel" : "Close"}</Btn>
          {can && <Btn kind="pri" icon={Check} onClick={save} disabled={!isNew && !dirty}>{saveLabel}</Btn>}
        </>}
      </footer>
    </aside>
  </div>, document.querySelector(".mz"));
}

const RECORD_CSS = `
/* the panel: slides in from the right over a dimmed page, in the colour of its kind's module */
.rp-layer{position:fixed;inset:0;z-index:1250}
.rp-layer~.studio-overlay{z-index:1300}
.rp-scrim{position:absolute;inset:0;background:color-mix(in srgb,#0B1020 42%,transparent);backdrop-filter:blur(2px);animation:fade .22s ease-out}
.rp{position:absolute;top:0;right:0;bottom:0;width:min(640px,100vw);display:flex;flex-direction:column;background:var(--bg);border-left:1px solid var(--line);
  box-shadow:-30px 0 80px rgba(8,12,30,.28);outline:none;animation:rpIn .42s cubic-bezier(.22,1,.36,1) both;color:var(--ink)}
@keyframes rpIn{from{transform:translateX(56px);opacity:0}to{transform:none;opacity:1}}
.mz[data-module] .rp{--brand:var(--rc);--brand-600:color-mix(in srgb,var(--rc) 82%,#000);--brand-50:color-mix(in srgb,var(--rc) 8%,#fff);--brand-100:color-mix(in srgb,var(--rc) 18%,#fff);
  --ring:0 0 0 3px color-mix(in srgb,var(--rc) 22%,transparent);--pri-a:color-mix(in srgb,var(--rc) 86%,#fff);--pri-b:var(--rc);--pri-ha:color-mix(in srgb,var(--rc) 93%,#fff);
  --pri-hb:color-mix(in srgb,var(--rc) 86%,#000);--pri-sh:color-mix(in srgb,var(--rc) 32%,transparent);--pri-txt:#fff}
.mz[data-module][data-theme="dark"] .rp{--brand:var(--rc-l);--brand-50:color-mix(in srgb,var(--rc-l) 13%,var(--surface));--brand-100:color-mix(in srgb,var(--rc-l) 22%,var(--surface));--ring:0 0 0 3px color-mix(in srgb,var(--rc-l) 30%,transparent)}
.rp-head{position:relative;padding:14px 22px 16px;color:#fff;background:var(--hero);overflow:hidden;flex:0 0 auto}
.mz[data-module] .rp-head{background:linear-gradient(120deg,var(--rc-deep) 0%,color-mix(in srgb,var(--rc) 55%,var(--rc-deep)) 52%,var(--rc) 100%)}
.rp-head::after{content:"";position:absolute;right:-60px;top:-80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.16),transparent 65%);pointer-events:none}
.rp-bar{display:flex;align-items:center;gap:8px;min-height:30px}
.rp-kind{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.82)}
.rp-ro,.rp-uses{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.13);color:rgba(255,255,255,.9)}
.rp-uses{background:none;padding:0 4px;color:rgba(255,255,255,.7)}
.rp-x{margin-left:auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);position:relative;z-index:1}
.rp-x:hover{background:rgba(255,255,255,.2)}.rp-x:focus-visible{outline:2px solid #fff;outline-offset:2px}
.rp-id{display:flex;align-items:center;gap:14px;margin-top:10px;position:relative;z-index:1}
.rp-av{width:54px;height:54px;flex:0 0 54px;border-radius:16px;display:grid;place-items:center;font-size:19px;font-weight:700;letter-spacing:.02em;color:#fff;
  background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
.rp-nm{min-width:0}.rp-nm h2{margin:0;font-size:21px;line-height:1.25;letter-spacing:-.02em;font-weight:700;color:#fff;overflow-wrap:anywhere}
.rp-nm p{margin:3px 0 0;font-size:12.5px;color:rgba(255,255,255,.78);font-variant-numeric:tabular-nums}
.rp-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;position:relative;z-index:1}
.rp-tag{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.18)}
.rp-tag.ok::before,.rp-tag.warn::before,.rp-tag.neg::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:6px;vertical-align:1px;background:#4ADE80}
.rp-tag.warn::before{background:#FBBF24}.rp-tag.neg::before{background:#F87171}
.rp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line);border-bottom:1px solid var(--line);flex:0 0 auto}
.rp-kpi{background:var(--surface);padding:11px 14px 12px;min-width:0}
.rp-kpi small{display:block;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3)}
.rp-kpi b{display:block;margin-top:4px;font-size:16px;font-weight:700;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-kpi b small{display:inline;font-size:10.5px;letter-spacing:0;text-transform:none;font-weight:600}
.rp-kpi.txt b{font-size:14px}.rp-kpi>span{display:block;margin-top:2px;font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-kpi.neg b{color:var(--neg)}.rp-kpi.warn b{color:var(--warn)}
.rp-tabs{display:flex;gap:4px;padding:0 18px;background:var(--surface);border-bottom:1px solid var(--line);flex:0 0 auto}
.rp-tabs button{display:inline-flex;align-items:center;gap:7px;padding:11px 10px 10px;font-size:13px;font-weight:600;color:var(--ink-3);border-bottom:2px solid transparent;margin-bottom:-1px}
.rp-tabs button:hover{color:var(--ink)}.rp-tabs button.on{color:var(--brand);border-bottom-color:var(--brand)}
.rp-tabs em{font-style:normal;font-size:11px;padding:1px 7px;border-radius:999px;background:var(--surface-2);color:var(--ink-2)}
.rp-body{flex:1 1 auto;overflow:auto;padding:18px 22px 26px;overscroll-behavior:contain}
.rp-fs{border:0;margin:0;padding:0;min-width:0;display:grid;gap:14px}
.rp-sec{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px 16px}
.rp-sec>h3{display:flex;align-items:flex-start;gap:10px;margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:-.01em}
.rp-sec>h3 small{display:block;margin-top:2px;font-size:12px;font-weight:500;color:var(--ink-3);letter-spacing:0}
.rp-si{width:26px;height:26px;flex:0 0 26px;border-radius:8px;display:grid;place-items:center;color:var(--brand);background:var(--brand-50)}
.rp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px}
.rp-grid .fld{min-width:0}
.rp-fe{display:block;font-size:11.5px;color:var(--neg);margin-top:5px}
.rp-note{display:flex;gap:10px;align-items:flex-start;margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--surface-2);font-size:12.5px;color:var(--ink-2);line-height:1.5}
.rp-note svg{flex:0 0 auto;margin-top:2px;color:var(--brand)}
.rp-sec .br-editor{margin-top:0;border:0;padding:0;background:none}
.rp-sec .party-specials{margin-top:0}
.rp-fs:disabled .rp-sec{background:color-mix(in srgb,var(--surface) 70%,var(--bg))}
.rp-fs:disabled .inp{background:var(--surface-2);color:var(--ink-2);border-color:var(--line-2,var(--line));cursor:default;box-shadow:none}
.rp-id-line{margin:0;font-size:11.5px;color:var(--ink-3)}.rp-id-line code{font-family:var(--mono);font-size:11px}
.readonly.warn{color:var(--warn)}
.rp-act{display:grid;gap:6px}
.rp-ar{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);animation:rpRow .4s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(min(var(--i),12) * 18ms)}
@keyframes rpRow{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.rp-ai{width:30px;height:30px;flex:0 0 30px;border-radius:9px;display:grid;place-items:center;color:var(--brand);background:var(--brand-50)}
.rp-ai.pay{color:var(--pos);background:var(--pos-50)}
.rp-at{min-width:0;flex:1}.rp-at b{display:block;font-size:13px;font-family:var(--mono);font-weight:600}.rp-at small{font-size:12px;color:var(--ink-3)}
.rp-aa{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.rp-aa b{font-size:13.5px;font-variant-numeric:tabular-nums}
.rp-more{font-size:12px;color:var(--ink-3);text-align:center;margin:8px 0 0}
.rp-hist{display:grid;gap:12px}.rp-side{justify-self:start}
.rp-hist .history-block{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
.rp-foot{display:flex;align-items:center;gap:8px;padding:12px 22px;background:var(--surface);border-top:1px solid var(--line);flex:0 0 auto}
.rp-foot.asking{background:color-mix(in srgb,var(--warn) 9%,var(--surface))}
.rp-msg{margin-right:auto;display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-3);min-width:0}
.rp-msg.err{color:var(--neg);font-weight:600}.rp-msg.warn{color:var(--ink);font-weight:600}.rp-msg.warn svg{color:var(--warn)}
.rp-msg kbd{font-family:var(--mono);font-size:10.5px;padding:1px 6px;border-radius:5px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2)}
.rp-dot{width:7px;height:7px;border-radius:50%;background:var(--warn);box-shadow:0 0 0 3px color-mix(in srgb,var(--warn) 22%,transparent)}
@media(max-width:700px){.rp{width:100vw;border-left:0}.rp-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-grid{grid-template-columns:1fr}.rp-grid .fld{grid-column:auto!important}
  .rp-head{padding:12px 16px 14px}.rp-body{padding:14px 14px 22px}.rp-foot{padding:10px 14px;flex-wrap:wrap}.rp-msg{flex:1 0 100%}.rp-foot .btn{flex:1}.rp-tabs{padding:0 10px}}
@media(prefers-reduced-motion:reduce){.rp,.rp-scrim,.rp-ar{animation:none}}
@media print{.rp-layer{display:none}}

.rp-ctx{display:flex;align-items:center;gap:9px;margin:-4px 0 14px;padding:9px 12px;border-radius:10px;font-size:12.5px;color:var(--ink-2);
  background:color-mix(in srgb,var(--brand) 7%,var(--surface));border:1px dashed color-mix(in srgb,var(--brand) 35%,transparent)}
.rp-ctx svg{flex:0 0 auto;color:var(--brand)}

/* the document: terms beside the TRN, and a line when the party is overdue */
.readonly.party-trn{display:flex;align-items:center;gap:8px}.party-trn span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.party-trn em{margin-left:auto;flex:0 0 auto;font-style:normal;font-family:var(--sans);font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--ink-2)}
.party-alert{display:flex;align-items:center;gap:10px;margin:12px 0 2px;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.45;
  background:color-mix(in srgb,var(--warn) 9%,var(--surface));border:1px solid color-mix(in srgb,var(--warn) 30%,transparent);animation:rpRow .45s cubic-bezier(.22,1,.36,1) both}
.party-alert>svg{flex:0 0 auto;color:var(--warn)}.party-alert>span{flex:1;min-width:0}
.party-alert.info{background:color-mix(in srgb,var(--brand) 6%,var(--surface));border-color:color-mix(in srgb,var(--brand) 22%,transparent)}.party-alert.info>svg{color:var(--brand)}
.party-alert .linkish{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-weight:600}
@media print{.party-alert{display:none}}

/* the arrow that opens a record, inside its field */
.smart-picker.has-open>.inp{padding-right:38px!important}
.mz .rec-open{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--brand);background:var(--brand-50);border:1px solid color-mix(in srgb,var(--brand) 22%,transparent);
  transition:background .15s,color .15s,transform .2s cubic-bezier(.22,1,.36,1),opacity .15s}
.mz .rec-open:hover{background:var(--brand);color:var(--pri-txt,#fff);transform:translate(1px,-1px)}
.mz .rec-open:focus-visible{outline:none;box-shadow:var(--ring)}
.smart-picker>.rec-open{position:absolute;right:6px;top:50%;margin-top:-13px}
.fld:has(>.rec-open){position:relative;align-self:start}
.fld>.rec-open{position:absolute;right:34px;bottom:6px;z-index:1}
.fld:has(>.rec-open)>.inp.sel{padding-right:68px}
/* on a line, the arrow shows when the line is in use; always on touch screens */
.line-grid .smart-picker>.rec-open{opacity:0;width:24px;height:24px;margin-top:-12px;right:4px}
.line-grid tr:hover .smart-picker>.rec-open,.line-grid tr.active .smart-picker>.rec-open,.line-grid .smart-picker>.rec-open:focus-visible{opacity:1}
@media(hover:none){.line-grid .smart-picker>.rec-open{opacity:1}}
/* a customer or vendor row opens the record; what is overdue shows under the balance */
.mz .late-note{display:block;margin-top:2px;font-size:11px;font-weight:600;color:var(--neg)}
.mz tr.rowlink{cursor:pointer}.mz tr.rowlink:hover td{background:color-mix(in srgb,var(--brand) 4%,var(--surface))}
/* the party named in a document's heading opens its record too */
.du-party{font:inherit;font-weight:700;color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 35%,transparent);text-underline-offset:3px}
.du-party:hover{color:var(--brand);text-decoration-color:currentColor}
`;
