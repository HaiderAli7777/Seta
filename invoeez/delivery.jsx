/* ============================================================================
   3.17 — Delivery addresses.
   · A customer can have any number of delivery addresses (branches, sites,
     warehouses), each with its own emirate, contact and phone, and one can be
     the default.
   · Quotations, invoices and credit notes have "Deliver to": the customer's
     main address or one of its branches. Choosing a branch sets the place of
     supply to the branch's emirate (for goods that is where VAT is due) and
     keeps a copy of the address on the document, so later edits to the branch
     never change a posted invoice.
   · The address prints as "Deliver to", goes into the e-invoice, shows in the
     document list, and an invoice can be printed as a delivery note.
   ========================================================================== */

const branchesOf = (p) => (p && Array.isArray(p.branches) ? p.branches : []);
const blankBranch = (p) => ({ id: uid("br"), name: "", address: "", address2: "", emirate: (p && EMIRATES.includes(p.emirate) ? p.emirate : "Dubai"), contact: "", phone: "" });
/* The copy kept on a document. */
const snapBranch = (b) => (b ? { id: b.id, name: (b.name || "").trim(), address: b.address || "", address2: b.address2 || "", emirate: b.emirate || "", contact: b.contact || "", phone: b.phone || "" } : undefined);
const snapDelivery = (p, id) => snapBranch(branchesOf(p).find((x) => x.id === id));
const deliveryLines = (x) => (x ? [x.address, x.address2, x.emirate].filter((v) => v && String(v).trim()) : []);
const deliveryText = (x) => (x ? [x.name, ...deliveryLines(x)].filter(Boolean).join(", ") : "");
const deliveryContact = (x) => (x ? [x.contact, x.phone].filter(Boolean).join(" · ") : "");
const branchOk = (b) => (b.name || "").trim().length >= 2;

/* ------------------------------------------------- customer form: branches */
function BranchEditor({ ed, setEd }) {
  const list = branchesOf(ed);
  const put = (id, patch) => setEd((x) => ({ ...x, branches: branchesOf(x).map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const add = () => setEd((x) => ({ ...x, branches: [...branchesOf(x), blankBranch(x)] }));
  const drop = (id) => setEd((x) => ({ ...x, branches: branchesOf(x).filter((b) => b.id !== id), defaultBranch: x.defaultBranch === id ? "" : x.defaultBranch }));
  return <div className="br-editor">
    <div className="br-head"><div><b><Truck size={15} />Delivery addresses</b>
      <span>Branches or sites you deliver to. Pick one under "Deliver to" on a quotation or invoice; the place of supply follows its emirate.</span></div>
      <Btn size="sm" icon={Plus} onClick={add}>Add a delivery address</Btn></div>
    {!list.length && <div className="br-empty">Deliveries go to the main address above. Add branches if this customer receives goods at more than one place.</div>}
    {list.map((b, i) => <div key={b.id} className={cx("br-card", ed.defaultBranch === b.id && "def")} data-branch={b.id}>
      <div className="br-top"><span className="br-n">{i + 1}</span>
        <Input className="br-name" value={b.name} placeholder="Branch name, e.g. Deira warehouse" aria-label={`Delivery address ${i + 1} — name`} onChange={(e) => put(b.id, { name: e.target.value })} />
        <label className="br-def"><input type="radio" name={"defbr-" + ed.id} checked={ed.defaultBranch === b.id} onChange={() => setEd((x) => ({ ...x, defaultBranch: b.id }))} />Default</label>
        {ed.defaultBranch === b.id && <button className="linkish br-undef" onClick={() => setEd((x) => ({ ...x, defaultBranch: "" }))}>Use main address by default</button>}
        <button className="icon-btn br-x" title="Remove this delivery address" aria-label={`Remove delivery address ${b.name || i + 1}`} onClick={() => drop(b.id)}><Trash2 size={14} /></button></div>
      <div className="br-grid">
        <Field label="Address line 1"><Input value={b.address} placeholder="Building, street" onChange={(e) => put(b.id, { address: e.target.value })} /></Field>
        <Field label="Address line 2"><Input value={b.address2} placeholder="Area, P.O. Box (optional)" onChange={(e) => put(b.id, { address2: e.target.value })} /></Field>
        <Field label="Emirate"><Select value={b.emirate} onChange={(e) => put(b.id, { emirate: e.target.value })}>{[...EMIRATES, "Export"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Receiving contact"><Input value={b.contact} placeholder="Name of the person receiving" onChange={(e) => put(b.id, { contact: e.target.value })} /></Field>
        <Field label="Phone"><Input value={b.phone} placeholder="+971 50 123 4567" onChange={(e) => put(b.id, { phone: e.target.value })} /></Field>
      </div>
      {!branchOk(b) && (b.address || b.address2 || b.contact || b.phone) && <div className="br-warn">Give this address a name so it can be picked on documents.</div>}
    </div>)}
  </div>;
}

/* ---------------------------------------------- add one from the document */
function BranchDialog({ rec, partner, close, save }) {
  const [b, setB] = useState(rec);
  const ok = branchOk(b);
  return <StudioModal title="New delivery address" sub={`Saved on ${partner ? partner.name : "the customer"} and chosen for this document`} close={close}>
    <div className="studio-form">
      <Field label="Branch name" span={2}><Input autoFocus value={b.name} placeholder="e.g. Deira warehouse" onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
      <Field label="Address line 1"><Input value={b.address} placeholder="Building, street" onChange={(e) => setB({ ...b, address: e.target.value })} /></Field>
      <Field label="Address line 2"><Input value={b.address2} placeholder="Area, P.O. Box (optional)" onChange={(e) => setB({ ...b, address2: e.target.value })} /></Field>
      <Field label="Emirate"><Select value={b.emirate} onChange={(e) => setB({ ...b, emirate: e.target.value })}>{[...EMIRATES, "Export"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Receiving contact"><Input value={b.contact} placeholder="Name of the person receiving" onChange={(e) => setB({ ...b, contact: e.target.value })} /></Field>
      <Field label="Phone" span={2}><Input value={b.phone} placeholder="+971 50 123 4567" onChange={(e) => setB({ ...b, phone: e.target.value })} /></Field>
    </div>
    <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!ok} onClick={() => save({ ...b, name: b.name.trim() })}>Save &amp; deliver here</Btn></footer>
  </StudioModal>;
}

/* ------------------------------------------------- document: Deliver to */
function DeliverToField({ d, locked, pick, addBranch }) {
  const p = PMAP[d.partner], list = branchesOf(p);
  const [ask, setAsk] = useState(null);
  const gone = d.deliverTo && !list.some((b) => b.id === d.deliverTo) && d.delivery;
  return <>
    <Select value={d.deliverTo || ""} disabled={locked || !p} aria-label="Deliver to"
      onChange={(e) => { const v = e.target.value; if (v === "__new__") setAsk(blankBranch(p)); else pick(v); }}>
      <option value="">{p ? "Main address" + (addrText(p) ? " — " + addrText(p) : "") : "Choose the customer first"}</option>
      {list.filter(branchOk).map((b) => <option key={b.id} value={b.id}>{b.name + (b.emirate ? " · " + b.emirate : "")}</option>)}
      {gone && <option value={d.deliverTo}>{d.delivery.name + " (no longer on the customer)"}</option>}
      {!locked && p && <option value="__new__">＋ Add a delivery address…</option>}
    </Select>
    {ask && <BranchDialog rec={ask} partner={p} close={() => setAsk(null)} save={(b) => { addBranch(b); setAsk(null); }} />}
  </>;
}
function DeliveryPreview({ d }) {
  const p = PMAP[d.partner];
  if (!p) return <div className="dl-prev muted"><MapPin size={14} />Choose the customer to see where this goes.</div>;
  const x = d.deliverTo && d.delivery;
  return <div className={cx("dl-prev", x && "branch")}>
    <MapPin size={15} />
    {x ? <span><b>{x.name}</b>{deliveryLines(x).join(", ")}{deliveryContact(x) && <small>Receiving: {deliveryContact(x)}</small>}</span>
      : <span><b>Main address</b>{[addrText(p), p.emirate].filter(Boolean).join(", ") || "No address on the customer yet"}
        {branchesOf(p).length > 0 && <small>{branchesOf(p).length} other delivery address{branchesOf(p).length === 1 ? "" : "es"} on this customer</small>}</span>}
  </div>;
}

const DELIVERY_CSS = `
.br-editor{margin-top:18px;border-top:1px solid var(--line-2);padding-top:16px}
.br-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:10px}
.br-head b{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink)}
.br-head b svg{color:var(--brand)}
.br-head span{display:block;font-size:12px;color:var(--ink-3);margin-top:3px;line-height:1.5;max-width:560px}
.br-empty{font-size:12.5px;color:var(--ink-3);padding:12px 14px;border:1px dashed var(--line);border-radius:12px;background:var(--surface-2)}
.br-card{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-top:10px;background:var(--surface);transition:border-color .2s,box-shadow .2s;animation:tdIn .32s cubic-bezier(.22,1,.36,1)}
.br-card.def{border-color:color-mix(in srgb,var(--brand) 40%,var(--line));box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 8%,transparent)}
.br-top{display:flex;align-items:center;gap:10px}
.br-n{width:24px;height:24px;flex:0 0 24px;border-radius:7px;display:grid;place-items:center;font-size:11px;font-weight:700;background:var(--brand-50);color:var(--brand)}
.mz .br-name{flex:1;min-width:0;font-weight:600}
.br-def{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-2);white-space:nowrap;cursor:pointer}
.br-undef{font-size:11.5px;white-space:nowrap}
.br-x{flex:0 0 auto}
.br-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:10px}
.br-warn{margin-top:8px;font-size:11.5px;color:var(--warn)}
.dl-prev{display:flex;align-items:flex-start;gap:9px;min-height:40px;padding:9px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line-2);font-size:12.5px;color:var(--ink-2);line-height:1.45}
.dl-prev>svg{flex:0 0 auto;margin-top:2px;color:var(--ink-3)}
.dl-prev.branch{background:color-mix(in srgb,var(--brand) 5%,var(--surface));border-color:color-mix(in srgb,var(--brand) 22%,var(--line))}
.dl-prev.branch>svg{color:var(--brand)}
.dl-prev b{color:var(--ink);font-weight:600;margin-right:6px}
.dl-prev small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:1px}
.dl-prev.muted{color:var(--ink-4)}
.addr-cell .br-count{display:inline-flex;align-items:center;gap:4px;margin-top:3px;font-size:11px;color:var(--brand);font-weight:600}
.who-deliver{display:inline-flex;align-items:center;gap:4px;color:var(--brand)}
/* printed documents */
.sheet .sheet-parties .dl-blk .nm{color:#16191D}
.sendbar .seg.dn-seg{margin-right:auto;background:var(--surface);border:1px solid var(--line)}
.sendbar .seg.dn-seg button{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:7px 12px}
.sheet .dn-lines td{vertical-align:middle}
.sheet .dn-box{display:inline-block;width:64px;height:20px;border:1px solid #C9CED4;border-radius:4px}
.sheet .dn-sum{margin-top:12px;font-size:12px;color:#626973}
.sheet .dn-sign{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:26px}
.sheet .dn-sign>div{border:1px solid #DEE2E6;border-radius:10px;padding:14px 16px;background:#FAFAFB}
.sheet .dn-sign b{display:block;font-size:12px;color:#16191D;letter-spacing:.02em}
.sheet .dn-sign small{display:block;font-size:11px;color:#8A9099;margin-bottom:8px}
.sheet .dn-sign .ln{display:block;height:26px;border-bottom:1px solid #C9CED4}
.sheet .dn-sign em{display:block;font-style:normal;font-size:10.5px;color:#8A9099;margin-top:3px}
.mz .dl-fld .lb{visibility:hidden}
@media(max-width:1100px){.br-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.br-grid{grid-template-columns:1fr}.br-head{flex-direction:column}.br-top{flex-wrap:wrap}}
`;
