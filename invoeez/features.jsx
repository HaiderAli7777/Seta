/* ============================================================================
   PARTY SPECIAL PRICES — a price agreed with one customer (or vendor) for one
   product. It beats price lists and history whenever that party is invoiced.
   Set from an invoice line ("Party special") or managed here.
   ========================================================================== */
function PartySpecials({ state, setState, books, partner, role, toast }) {
  const side = role === "vendor" ? "purchase" : "sale";
  const list = (state.partySpecials || []).filter((x) => x.partner === partner && (x.side || "sale") === side)
    .sort((a, b) => (PROD[a.product]?.name || "").localeCompare(PROD[b.product]?.name || ""));
  const [add, setAdd] = useState(null);
  const save = () => {
    const price = R2(+add.price);
    if (!PROD[add.product] || !(price >= 0) || add.price === "") return;
    setState((s) => ({ ...s, partySpecials: [...(s.partySpecials || []).filter((x) => !(x.partner === partner && x.product === add.product && (x.side || "sale") === side)),
      { id: uid("ps"), partner, product: add.product, side, price, date: TODAY, doc: "" }] }));
    toast(`Special price saved for ${PROD[add.product].name}`); setAdd(null);
  };
  const remove = (x) => { setState((s) => ({ ...s, partySpecials: (s.partySpecials || []).filter((y) => y.id !== x.id) })); toast("Special price removed — normal pricing applies again"); };
  const normal = (pid) => { const p = PROD[pid]; if (!p) return ""; const r = pricingFor({ ...state, partySpecials: [] }, p, 1, TODAY, "", side, ""); return r.price; };
  return <div className="party-specials">
    <div className="ps-head"><span className="ps-ic"><Star size={15} /></span>
      <div><b>Party special prices</b><span>{side === "sale" ? "This customer is always offered these prices." : "Prices agreed with this vendor."} Set them here or with “Party special” on an {side === "sale" ? "invoice" : "bill"} line.</span></div>
      {!add && <Btn size="sm" icon={Plus} onClick={() => setAdd({ product: "", price: "" })}>Add special price</Btn>}</div>
    {add && <div className="ps-add">
      <SmartPicker label="Special price product" items={productOptions(books)} value={add.product} placeholder="Search product…" onChange={(pid) => setAdd((a) => ({ ...a, product: pid, price: a.price === "" ? normal(pid) : a.price }))} />
      <Input n type="number" min="0" step="0.01" aria-label="Special price" placeholder="Price · AED" value={add.price} onChange={(e) => setAdd((a) => ({ ...a, price: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
      <Btn onClick={() => setAdd(null)}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!PROD[add.product] || add.price === ""} onClick={save}>Save</Btn></div>}
    {list.length ? <table className="tbl ps-tbl"><thead><tr><th>Product</th><th className="n">Special · AED</th><th className="n">Normal · AED</th><th>Set</th><th /></tr></thead>
      <tbody>{list.map((x) => { const p = PROD[x.product], n = normal(x.product); return <tr key={x.id}>
        <td><b>{p ? p.name : x.product}</b><small className="subtext">{p?.code}</small></td>
        <td className="n num"><b>{money(x.price, false)}</b></td>
        <td className="n num muted">{n === "" ? "—" : money(n, false)}</td>
        <td className="muted">{dmy(x.date)}{x.doc ? " · " + x.doc : ""}</td>
        <td className="n"><button className="icon-btn" title={"Remove special price for " + (p ? p.name : "")} aria-label={"Remove special price for " + (p ? p.name : "")} onClick={() => remove(x)}><Trash2 size={14} /></button></td></tr>; })}</tbody></table>
      : !add && <p className="ps-empty">No special prices yet.</p>}
  </div>;
}

const FEATURES_CSS = `
.party-specials{margin-top:18px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)}
.ps-head{display:flex;align-items:center;gap:12px;padding:12px 14px;background:linear-gradient(90deg,var(--surface-2),var(--surface));border-bottom:1px solid var(--line-2)}
.ps-head>div{flex:1;min-width:0}.ps-head b{display:block;font-size:13.5px}.ps-head span{display:block;font-size:12px;color:var(--ink-3);margin-top:2px}
.ps-ic{width:32px;height:32px;flex:0 0 32px;border-radius:9px;display:grid;place-items:center;background:#FBF3DC;color:#B7861F}
.mz[data-theme="dark"] .ps-ic{background:#3A321C;color:#F2C14E}
.ps-add{display:grid;grid-template-columns:minmax(0,1fr) 150px auto auto;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line-2);align-items:center}
.ps-tbl td,.ps-tbl th{padding-left:14px;padding-right:14px}
.ps-empty{padding:12px 14px;font-size:12.5px;color:var(--ink-3)}
@media (max-width:700px){.ps-add{grid-template-columns:1fr 1fr}.ps-add .smart-picker{grid-column:1/-1}}

/* Tax invoice, credit note and statement sheets — graphite letterhead, brushed-silver rule */
.sheet{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.mz .sheet-crest{background:linear-gradient(118deg,var(--sheet-1) 0%,var(--sheet-2) 100%);color:#fff;position:relative;overflow:hidden}
.mz .sheet-crest::before{content:"";position:absolute;inset:-40% -10% auto auto;width:60%;height:180%;transform:rotate(18deg);pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.06) 45%,rgba(255,255,255,.11) 50%,rgba(255,255,255,.04) 56%,transparent)}
.mz .sheet-crest::after{content:"";position:absolute;left:0;right:0;top:auto;bottom:0;width:auto;height:4px;border-radius:0;
  background:linear-gradient(90deg,#8F98A3,#F2F4F6 30%,#C3C9D0 52%,#F7F8F9 74%,#A7AFB9)}
.mz .sheet-crest h1{color:#fff}
.mz .sheet-crest .h1-ar{font-size:18px;font-weight:600;color:#E2E5E9;margin-top:3px}
.mz .sheet-crest .sub{color:#B9BFC7}
.mz .sheet-crest .sub-ar{margin-top:5px;color:#B9BFC7}
.mz .sheet-crest .doc .no{color:#E6E9ED}
.mz .sheet-crest .badge{background:linear-gradient(180deg,#F6F7F9,#C6CCD3);color:#16191D;border:0;padding:6px 11px;border-radius:7px;
  box-shadow:inset 0 1px 0 #fff,0 2px 6px rgba(0,0,0,.25)}
.mz .sheet-crest .badge .ar{display:block;letter-spacing:0;text-transform:none;font-size:12.5px;font-weight:700;margin-top:3px}
.mz .sheet-crest .dt{color:#B9BFC7}
.mz .sheet-crest .dt .kv{display:flex;justify-content:flex-end;align-items:baseline;gap:9px}
.mz .sheet-crest .dt .kv b{color:#fff;font-weight:500}
.mz .sheet-crest .dt .ar{font-size:10.5px;color:#8F98A3}
.bi-l{display:inline-flex;flex-direction:column;gap:1px;line-height:1.25}
.sheet .ar,.sheet [lang="ar"],.bi-l .ar{letter-spacing:0!important;text-transform:none!important}
.sheet .h1-ar,.sheet .sub-ar,.sheet .nm-ar,.sheet .desc-ar{text-align:left}
.bi-l .ar{text-transform:none;letter-spacing:0;font-weight:500;font-size:1.08em;font-family:"Segoe UI","Geeza Pro",Tahoma,"Noto Naskh Arabic","Noto Sans Arabic",var(--sans)}
.sheet .ar,.sheet [lang="ar"]{font-family:"Segoe UI","Geeza Pro",Tahoma,"Noto Naskh Arabic","Noto Sans Arabic",var(--sans)}
th.n .bi-l{align-items:flex-end}
.mz .sheet table.tbl th{background:var(--sheet-1);color:#fff;border-bottom:0;vertical-align:top}
.mz .sheet table.tbl th .ar{color:#B9BFC7}
.mz .sheet table.tbl thead th:first-child{border-radius:8px 0 0 8px}.mz .sheet table.tbl thead th:last-child{border-radius:0 8px 8px 0}
.mz .sheet table.tbl tbody tr:nth-child(even) td{background:#F8F9FA}
.mz .sheet table.tbl td{border-bottom-color:#ECEEF1}
.mz .sheet-parties .trn{color:#3E444C}
.mz .sheet-parties .nm-ar{font-size:14px;font-weight:600;color:#16191D;margin-top:2px}
.mz .sheet .desc-ar{font-size:12.5px;color:#3E444C;margin-top:2px}
.mz .sheet .totbox{background:#F6F7F8;border:1px solid #E2E5E9}
.mz .sheet .totbox .grand{align-items:center;background:linear-gradient(118deg,var(--sheet-1),var(--sheet-2));border:0;border-radius:10px;padding:12px 14px;margin:14px -8px -6px}
.mz .sheet .totbox .grand b{color:#fff}.mz .sheet .totbox .grand b small{color:#B9BFC7;font-weight:500}
.mz .sheet .totbox .grand b span{font-family:inherit;font-size:inherit;margin-left:0;color:inherit;letter-spacing:inherit;font-weight:inherit}
.mz .sheet .totbox .grand b .ar{color:#C9CED4;font-size:12px;font-weight:600}
.mz .sheet .totbox .grand>span{margin-left:auto}
.mz .sheet .totbox .grand span{color:#fff}
.mz .sheet .sign{margin-top:40px;padding-top:10px;border-top:1px solid #C9CED4;font-size:10.5px;color:#8A9099}
.mz .sheet .foot-ar{display:block;margin-top:6px}
.hint-line{margin:12px 0 0;font-size:12px;color:var(--warn)}
`;

/* ============================================================================
   BILINGUAL DOCUMENTS — English, or English + Arabic when Settings → Invoice
   language says so. Arabic in PDFs is drawn by the browser onto a canvas and
   placed as an image, so it shapes and joins correctly with any system font.
   ========================================================================== */
const AR = {
  "Tax Invoice": "فاتورة ضريبية", "Tax Credit Note": "إشعار دائن ضريبي", "Statement of account": "كشف حساب",
  "Supplier": "المورد", "Billed to": "فاتورة إلى", "Recipient": "المستلم", "Payment terms": "شروط الدفع",
  "#": "م", "Description": "الوصف", "Qty": "الكمية", "Unit price": "سعر الوحدة", "Taxable": "الخاضع للضريبة",
  "VAT %": "النسبة", "VAT": "الضريبة", "Total": "الإجمالي", "Amount in words": "المبلغ كتابةً",
  "Payment": "الدفع", "Taxable amount": "المبلغ الخاضع للضريبة", "Subtotal": "المجموع الفرعي", "Disc.": "الخصم", "Deliver to": "التسليم إلى", "Delivery Note": "إشعار التسليم", "Reference": "المرجع", "Code": "الرمز", "Received": "المستلم", "Customer": "العميل", "Delivered by": "سلّمه", "Received in good condition by": "استلمه بحالة جيدة", "Discount": "الخصم", "Amount": "المبلغ", "VAT amount": "ضريبة القيمة المضافة", "Reverse charge": "الاحتساب العكسي",
  "TOTAL PAYABLE": "الإجمالي المستحق", "TOTAL CREDITED": "إجمالي المبلغ الدائن", "Authorised signatory": "التوقيع المعتمد",
  "Issued": "تاريخ الإصدار", "Due": "تاريخ الاستحقاق", "Place of supply": "مكان التوريد", "TRN": "الرقم الضريبي",
  "not registered": "غير مسجل", "Your ref": "مرجعكم", "Net": "صافي", "days": "يوم",
  "Quotation": "عرض سعر", "Purchase Order": "أمر شراء", "Buyer": "المشتري", "Vendor": "المورد", "Quoted to": "مقدم إلى",
  "Deliver by": "تاريخ التسليم", "Valid until": "صالح حتى", "ORDER TOTAL": "إجمالي الطلب", "TOTAL": "الإجمالي",
  "Approval": "الاعتماد", "Validity": "الصلاحية",
  "legal": "صادرة بموجب المرسوم بقانون اتحادي رقم 8 لسنة 2017 في شأن ضريبة القيمة المضافة ولائحته التنفيذية.",
};
const isBilingual = (co) => (co && co.invoiceLang) === "en_ar";
/* English label with its Arabic translation underneath (bilingual mode only). */
const biLabel = (bi, en, ar) => bi && (ar || AR[en]) ? <span className="bi-l"><span>{en}</span><span className="ar" lang="ar" dir="rtl">{ar || AR[en]}</span></span> : en;
const AR_FONT = (px, w) => `${w || 400} ${px}px "Segoe UI","Geeza Pro",Tahoma,"Noto Naskh Arabic","Noto Sans Arabic","DejaVu Sans",Arial,sans-serif`;
function arImage(text, size, color, weight) {
  const S = 4, probe = document.createElement("canvas").getContext("2d");
  probe.font = AR_FONT(size * S, weight);
  const w = Math.ceil(probe.measureText(text).width) + 4 * S, h = Math.ceil(size * S * 1.55);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.font = AR_FONT(size * S, weight); g.fillStyle = color || "#16191D";
  g.textBaseline = "middle"; g.direction = "rtl"; g.textAlign = "right"; g.fillText(text, w - 2 * S, h / 2);
  return { src: c.toDataURL("image/png"), w: w / S, h: h / S };
}
/* Draws Arabic text into a jsPDF page. y is the text baseline, as with doc.text. Returns the height used. */
function pdfAr(doc, text, x, y, size, color, align, maxW) {
  if (!text) return 0;
  try {
    const im = arImage(String(text), size, color);
    const k = maxW && im.w > maxW ? maxW / im.w : 1, w = im.w * k, h = im.h * k;
    const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    doc.addImage(im.src, "PNG", left, y - h * 0.72, w, h);
    return h;
  } catch (e) { return 0; }
}

/* ============================================================================
   OPENING BALANCES — one place to see and enter what the company brought
   forward: bank and cash, customer and vendor balances, and opening stock.
   ========================================================================== */
function OpeningScreen({ state, setState, books, toast, go }) {
  const [dlg, setDlg] = useState(false);
  const bank = (state.manual || []).filter((e) => /^OPEN\//.test(e.number));
  const parties = state.docs.filter((d) => d.state === "posted" && d.lines.some((l) => l.product === "ob_balance"));
  const stock = (state.stockOps || []).filter((o) => /opening/i.test(o.reason || ""));
  const sumBank = R2(bank.reduce((t, e) => t + e.lines.filter((l) => ACC[l.acc] && ACC[l.acc].type === "bank").reduce((n, l) => n + l.debit - l.credit, 0), 0));
  const sumAR = R2(parties.filter((d) => d.type === "invoice").reduce((t, d) => t + amounts(d).total, 0));
  const sumAP = R2(parties.filter((d) => d.type === "bill").reduce((t, d) => t + amounts(d).total, 0));
  const sumStock = R2(stock.reduce((t, o) => t + o.lines.reduce((n, l) => n + (+l.delta || 0) * (+l.unit || 0), 0), 0));
  return <div>
    <PageHead eyebrow="Master" title="Opening balances" sub="What the company brought forward on its start date. Opening Balance Equity (3900) holds the difference.">
      <Btn icon={FileSpreadsheet} onClick={() => go("setup")}>Import customers & products</Btn>
      <Btn kind="pri" icon={Scale} onClick={() => setDlg(true)}>Enter opening balances</Btn>
    </PageHead>
    <div className="pdc-kpis">
      {[["Bank & cash", sumBank, `${bank.length} entr${bank.length === 1 ? "y" : "ies"}`], ["Customers owe you", sumAR, `${parties.filter((d) => d.type === "invoice").length} opening balances`],
        ["You owe vendors", sumAP, `${parties.filter((d) => d.type === "bill").length} opening balances`], ["Opening stock", sumStock, `${stock.length} stock count${stock.length === 1 ? "" : "s"}`]]
        .map(([l, v, n]) => <div key={l} className="pdc-kpi"><span>{l}</span><b className="num">{money(v, false)}</b><small>{n}</small></div>)}
    </div>
    <Card pad={false} title="Recorded opening entries" sub="Open one from its own list to review the journal it posted">
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Number</th><th>Date</th><th>What</th><th className="n">Amount · AED</th></tr></thead>
        <tbody>
          {bank.map((e) => <tr key={e.id}><td className="mono">{e.number}</td><td>{dmy(e.date)}</td><td>{e.ref}</td><td className="n num">{money(e.lines.reduce((n, l) => n + l.debit, 0), false)}</td></tr>)}
          {parties.map((d) => <tr key={d.id} className="click" onClick={() => go(LIST_OF[d.type], d.id)}><td className="mono">{d.number}</td><td>{dmy(d.date)}</td><td>Opening balance · {PMAP[d.partner]?.name}</td><td className="n num">{money(amounts(d).total, false)}</td></tr>)}
          {stock.map((o) => <tr key={o.id}><td className="mono">{o.number}</td><td>{dmy(o.date)}</td><td>{o.reason}</td><td className="n num">{money(o.lines.reduce((n, l) => n + (+l.delta || 0) * (+l.unit || 0), 0), false)}</td></tr>)}
          {!bank.length && !parties.length && !stock.length && <tr><td colSpan="4"><EmptyState icon={Scale} title="No opening balances yet">
            Enter bank and cash balances, what customers owe you and what you owe vendors on your start date. Opening stock comes with your product import.</EmptyState></td></tr>}
        </tbody></table></div>
    </Card>
    {dlg && <OpeningBalancesDialog state={state} setState={setState} books={books} toast={toast} close={() => setDlg(false)} />}
  </div>;
}
