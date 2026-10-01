
/* ============================================================================
   INVOEEZ — ENTERPRISE EDITION
   A double-entry accounting workspace built for the UAE market.
   Everything below the ledger is derived: journal entries, stock, and every
   report are replayed from posted documents, so the books cannot drift.
   ========================================================================== */



/* ---------------------------------------------------------------- utils -- */
const R2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const NF = new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n, dash = true) => {
  const v = R2(n || 0);
  if (dash && Math.abs(v) < 0.005) return "—";
  return v < 0 ? `(${NF.format(Math.abs(v))})` : NF.format(v);
};
const dmy = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`;
};
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
const BUILD = "3.3.0";
const TODAY = (()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();
const _D = (s) => new Date(s + "T00:00:00Z");
const _iso = (d) => d.toISOString().slice(0, 10);
const som = (s) => s.slice(0, 8) + "01";
const eom = (s) => { const d = _D(s); return _iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))); };
const soq = (s) => { const d = _D(s); return `${d.getUTCFullYear()}-${String(Math.floor(d.getUTCMonth() / 3) * 3 + 1).padStart(2, "0")}-01`; };
const addMonths = (s, n) => { const d = _D(s); return _iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))); };
const eoq = (s) => eom(addMonths(soq(s), 2));
let _uid = 0;
const uid = (p) => `${p}_${globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+"_"+(++_uid)+"_"+Math.random().toString(36).slice(2))}`;

/* ------------------------------------------------------ account taxonomy -- */
const AT = {
  bank:      { label: "Bank & Cash",          side: "D", group: "Assets",        sub: "Current assets" },
  receivable:{ label: "Receivable",           side: "D", group: "Assets",        sub: "Current assets" },
  inventory: { label: "Inventory",            side: "D", group: "Assets",        sub: "Current assets" },
  casset:    { label: "Current asset",        side: "D", group: "Assets",        sub: "Current assets" },
  fasset:    { label: "Fixed asset",          side: "D", group: "Assets",        sub: "Non-current assets" },
  payable:   { label: "Payable",              side: "C", group: "Liabilities",   sub: "Current liabilities" },
  cliab:     { label: "Current liability",    side: "C", group: "Liabilities",   sub: "Current liabilities" },
  ncliab:    { label: "Non-current liability",side: "C", group: "Liabilities",   sub: "Non-current liabilities" },
  equity:    { label: "Equity",               side: "C", group: "Equity",        sub: "Equity" },
  income:    { label: "Income",               side: "C", group: "Income",        sub: "Revenue" },
  cogs:      { label: "Cost of sales",        side: "D", group: "Cost of sales", sub: "Cost of sales" },
  expense:   { label: "Expense",              side: "D", group: "Expenses",      sub: "Operating expenses" },
};
const IS_PL = (t) => ["income", "cogs", "expense"].includes(t);

const ACCOUNTS_SEED = [
  ["1110", "Cash on Hand", "bank"],
  ["1120", "Bank — Emirates NBD Current A/C", "bank"],
  ["1200", "Accounts Receivable", "receivable"],
  ["1300", "Inventory — Trading Stock", "inventory"],
  ["1400", "VAT Input — Recoverable", "casset"],
  ["1450", "Prepaid Expenses & Advances", "casset"],
  ["1610", "Furniture, Fixtures & Equipment", "fasset"],
  ["1620", "Accumulated Depreciation", "fasset"],
  ["2100", "Accounts Payable", "payable"],
  ["2200", "VAT Output — Payable", "cliab"],
  ["2300", "Accrued Expenses", "cliab"],
  ["2400", "Employees' End-of-Service Gratuity", "ncliab"],
  ["3100", "Share Capital", "equity"],
  ["3200", "Retained Earnings", "equity"],
  ["4100", "Revenue — Goods", "income"],
  ["4200", "Revenue — Services", "income"],
  ["4300", "Sales Returns & Allowances", "income"],
  ["4900", "Other Income", "income"],
  ["5100", "Cost of Goods Sold", "cogs"],
  ["5200", "Cost of Services Delivered", "cogs"],
  ["6100", "Salaries & Wages", "expense"],
  ["6150", "Visa, Labour Card & PRO Charges", "expense"],
  ["6200", "Rent — Office & Warehouse", "expense"],
  ["6250", "Trade Licence & Government Fees", "expense"],
  ["6300", "Utilities — DEWA & Cooling", "expense"],
  ["6350", "Telecommunication — Etisalat / du", "expense"],
  ["6400", "Freight, Customs & Clearing", "expense"],
  ["6450", "Bank Charges & Commission", "expense"],
  ["6500", "Professional & Audit Fees", "expense"],
  ["6600", "Marketing & Advertising", "expense"],
  ["6700", "Depreciation Expense", "expense"],
  ["6900", "General & Administrative", "expense"],
].map(([code, name, type]) => ({ id: code, code, name, type }));

let ACCOUNTS = ACCOUNTS_SEED.slice();
let ACC = Object.fromEntries(ACCOUNTS.map((a) => [a.code, a]));
function syncAccounts(extra) {
  const ov = {}; (extra || []).forEach((a) => (ov[a.code] = a));
  ACCOUNTS = ACCOUNTS_SEED.map((a) => ov[a.code] || a)
    .concat((extra || []).filter((a) => !ACCOUNTS_SEED.some((q) => q.code === a.code)))
    .sort((a, b) => a.code.localeCompare(b.code));
  ACC = Object.fromEntries(ACCOUNTS.map((a) => [a.code, a]));
  return ACCOUNTS;
}
const isSeedAccount = (code) => ACCOUNTS_SEED.some((a) => a.code === code);
const A = { AR: "1200", AP: "2100", INV: "1300", VIN: "1400", VOUT: "2200", COGS: "5100", BANK: "1120", CASH: "1110", RE: "3200" };

/* ------------------------------------------------------------- UAE VAT -- */
const TAXES = [
  { id: "s5",  name: "VAT 5% (Standard)",       rate: 5, kind: "standard", scope: "both" },
  { id: "z0",  name: "Zero-rated 0% (Export)",  rate: 0, kind: "zero",     scope: "both" },
  { id: "ex",  name: "Exempt",                  rate: 0, kind: "exempt",   scope: "both" },
  { id: "rc5", name: "Reverse Charge 5% (Import)", rate: 5, kind: "rcm",   scope: "purchase" },
  { id: "nt",  name: "Out of scope",            rate: 0, kind: "none",     scope: "both" },
];
const TAX = Object.fromEntries(TAXES.map((t) => [t.id, t]));

const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];

const COMPANY = {
  name: "Zenith General Trading L.L.C.",
  trn: "100412887600003",
  address: "Office 1204, Burlington Tower, Business Bay",
  city: "Dubai, United Arab Emirates",
  phone: "+971 4 512 8840",
  email: "accounts@zenithtrading.ae",
  licence: "CN-1148372",
  emirate: "Dubai",
  currency: "AED",
};

/* ----------------------------------------------------------- master data -- */
/* Customers, vendors and products live in the books (state), so a company can
   remove what it does not use. These are the records that older versions kept
   in code; migrateBooks copies them into books saved before schema 5. */
const PARTNERS_SEED = [];
const LEGACY_PARTNERS = [
  { id: "p1", name: "Al Futtaim Electronics L.L.C.", role: "customer", trn: "100234567800003", emirate: "Dubai", address: "Festival Plaza, Dubai Festival City", terms: 30, contact: "ap@afelectronics.ae", phone: "+971501234567" },
  { id: "p2", name: "Jumeirah Hospitality Group", role: "customer", trn: "100889221400003", emirate: "Dubai", address: "Umm Suqeim 3, Jumeirah Road", terms: 45, contact: "finance@jhg.ae", phone: "+971502345678" },
  { id: "p3", name: "Gulf Marine Supplies FZE", role: "customer", trn: "", emirate: "Sharjah", address: "Hamriyah Free Zone, Phase 2", terms: 30, contact: "accounts@gulfmarine.ae", phone: "+971503456789", designatedZone: true },
  { id: "p4", name: "Capital Business Centre — Abu Dhabi", role: "customer", trn: "100556677800003", emirate: "Abu Dhabi", address: "Al Maryah Island, Tower B", terms: 60, contact: "payables@cbc.ae", phone: "+971504567890" },
  { id: "p5", name: "Nova Retail Concepts L.L.C.", role: "customer", trn: "100774411900003", emirate: "Dubai", address: "Al Quoz Industrial 3", terms: 15, contact: "hello@novaretail.ae", phone: "+971505678901" },
  { id: "p6", name: "Riyadh Tech Distribution Co.", role: "customer", trn: "", emirate: "Export", address: "Olaya District, Riyadh, KSA", terms: 30, contact: "po@riyadhtech.sa", phone: "+966501234567", export: true },
  { id: "v1", name: "Shenzhen Kingtech Industrial Ltd.", role: "vendor", trn: "", emirate: "Import", address: "Bao'an District, Shenzhen, China", terms: 30, contact: "sales@kingtech.cn", import: true },
  { id: "v2", name: "Emirates Computer Trading L.L.C.", role: "vendor", trn: "100331122500003", emirate: "Dubai", address: "Al Fahidi Street, Bur Dubai", terms: 30, contact: "ar@ectdubai.ae" },
  { id: "v3", name: "Falcon Logistics & Clearing", role: "vendor", trn: "100998877600003", emirate: "Dubai", address: "Jebel Ali Free Zone, South", terms: 15, contact: "billing@falconlog.ae" },
  { id: "v4", name: "Burlington Tower Facilities", role: "vendor", trn: "100445566700003", emirate: "Dubai", address: "Business Bay, Dubai", terms: 7, contact: "leasing@burlington.ae" },
  { id: "v5", name: "Meridian Audit & Advisory", role: "vendor", trn: "100112233400003", emirate: "Dubai", address: "One Central, DWTC", terms: 30, contact: "invoices@meridianaudit.ae" },
];
let PARTNERS = PARTNERS_SEED.slice();
let PMAP = Object.fromEntries(PARTNERS.map((p) => [p.id, p]));
function syncPartners(extra) {
  const ov = {}; (extra || []).forEach((p) => (ov[p.id] = p));
  PARTNERS = PARTNERS_SEED.map((p) => ov[p.id] || p)
    .concat((extra || []).filter((p) => !PARTNERS_SEED.some((q) => q.id === p.id)));
  PMAP = Object.fromEntries(PARTNERS.map((p) => [p.id, p]));
  return PARTNERS;
}
const isSeedPartner = (id) => PARTNERS_SEED.some((p) => p.id === id);

const PRODUCTS_SEED = [];
const LEGACY_PRODUCTS = [
  { id: "g1", code: "LT-EB14", name: 'EliteBook 14" i7 / 16GB / 512GB', kind: "goods", uom: "Units", price: 3450, cost: 2480, tax: "s5", income: "4100", expense: "5100" },
  { id: "g2", code: "LT-TP15", name: 'ThinkPad 15" i5 / 16GB / 1TB', kind: "goods", uom: "Units", price: 4180, cost: 3010, tax: "s5", income: "4100", expense: "5100" },
  { id: "g3", code: "MN-27Q", name: '27" QHD IPS Monitor 165Hz', kind: "goods", uom: "Units", price: 1180, cost: 790, tax: "s5", income: "4100", expense: "5100" },
  { id: "g4", code: "KB-MX3", name: "Wireless Mechanical Keyboard", kind: "goods", uom: "Units", price: 385, cost: 226, tax: "s5", income: "4100", expense: "5100" },
  { id: "g5", code: "DK-USBC", name: "USB-C Docking Station 11-in-1", kind: "goods", uom: "Units", price: 620, cost: 398, tax: "s5", income: "4100", expense: "5100" },
  { id: "g6", code: "SSD-2T", name: "NVMe Portable SSD 2TB", kind: "goods", uom: "Units", price: 740, cost: 486, tax: "s5", income: "4100", expense: "5100" },
  { id: "s1", code: "SV-INST", name: "On-site Installation & Configuration", kind: "service", uom: "Hours", price: 220, cost: 0, tax: "s5", income: "4200", expense: "5200" },
  { id: "s2", code: "SV-AMC", name: "Annual Maintenance Contract", kind: "service", uom: "Months", price: 1500, cost: 0, tax: "s5", income: "4200", expense: "5200" },
  { id: "s3", code: "SV-CONS", name: "IT Infrastructure Consultancy", kind: "service", uom: "Days", price: 2600, cost: 0, tax: "s5", income: "4200", expense: "5200" },
  { id: "e1", code: "EX-RENT", name: "Office & Warehouse Rent", kind: "service", uom: "Months", price: 0, cost: 12500, tax: "s5", income: "4900", expense: "6200" },
  { id: "e2", code: "EX-FRT", name: "Freight, Customs & Clearing", kind: "service", uom: "Shipments", price: 0, cost: 0, tax: "s5", income: "4900", expense: "6400" },
  { id: "e3", code: "EX-PROF", name: "Audit & Professional Services", kind: "service", uom: "Engagements", price: 0, cost: 0, tax: "s5", income: "4900", expense: "6500" },
  { id: "e4", code: "EX-MKT", name: "Marketing & Advertising", kind: "service", uom: "Campaigns", price: 0, cost: 0, tax: "s5", income: "4900", expense: "6600" },
];
let PRODUCTS = PRODUCTS_SEED.slice();
let PROD = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
function syncProducts(extra, categories = DEFAULT_CATEGORIES) {
  CATEGORIES = categories;
  const ov = {}; (extra || []).forEach((p) => (ov[p.id] = p));
  PRODUCTS = PRODUCTS_SEED.map((p) => ov[p.id] || p)
    .concat((extra || []).filter((p) => !PRODUCTS_SEED.some((q) => q.id === p.id))).map(enrichProduct);
  PROD = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  return PRODUCTS;
}
const isSeedProduct = (id) => PRODUCTS_SEED.some((p) => p.id === id);

/* ---------------------------------------------------------- payment methods */
const METHOD_KINDS = {
  bank:   { label: "Bank transfer", grad: "g1" },
  cash:   { label: "Cash",          grad: "g3" },
  cheque: { label: "Cheque",        grad: "g5" },
  card:   { label: "Card",          grad: "g2" },
  online: { label: "Online / POS",  grad: "g4" },
};
const METHODS_SEED = [
  { id: "m1", name: "Bank transfer", kind: "bank", account: "1120", needsRef: true,
    refLabel: "TT reference", direction: "both", active: true },
  { id: "m2", name: "Cash", kind: "cash", account: "1110", needsRef: false,
    refLabel: "", direction: "both", active: true },
  { id: "m3", name: "Cheque", kind: "cheque", account: "1120", needsRef: true,
    refLabel: "Cheque number", direction: "both", active: true },
  { id: "m4", name: "Credit card", kind: "card", account: "1120", needsRef: true,
    refLabel: "Authorisation code", direction: "in", active: true },
  { id: "m5", name: "Online / POS", kind: "online", account: "1120", needsRef: true,
    refLabel: "Transaction ID", direction: "in", active: true },
];
let METHODS = METHODS_SEED.slice();
let MET = Object.fromEntries(METHODS.map((m) => [m.id, m]));
function syncMethods(extra) {
  const ov = {}; (extra || []).forEach((m) => (ov[m.id] = m));
  METHODS = METHODS_SEED.map((m) => ov[m.id] || m)
    .concat((extra || []).filter((m) => !METHODS_SEED.some((q) => q.id === m.id)));
  MET = Object.fromEntries(METHODS.map((m) => [m.id, m]));
  return METHODS;
}
const isSeedMethod = (id) => METHODS_SEED.some((m) => m.id === id);
const methodsFor = (dir) => METHODS.filter((m) => m.active && (m.direction === "both" || m.direction === dir));
const methodName = (id) => (MET[id] ? MET[id].name : "Unassigned");

/* ========================================================================== */
/*  ENGINE — everything is replayed from documents. No stored balances.       */
/* ========================================================================== */

function amounts(d) {
  let net = 0, vat = 0, rcm = 0;
  const lines = d.lines.map((l) => {
    const t = TAX[l.tax] || TAX.nt;
    const amount = R2(l.qty * l.price * (1 - (l.disc || 0) / 100));
    const taxAmt = R2((amount * t.rate) / 100);
    return { ...l, amount, taxAmt, kind: t.kind, rate: t.rate };
  });
  lines.forEach((l) => { net += l.amount; if (l.kind === "rcm") rcm += l.taxAmt; else vat += l.taxAmt; });
  return { lines, net: R2(net), vat: R2(vat), rcm: R2(rcm), total: R2(net + vat) };
}
const SIGNS = { invoice: 1, credit_note: -1, bill: 1, debit_note: -1, quote: 1 };
const DOCMETA = {
  invoice:     { label: "Customer Invoice", short: "Invoice",     journal: "Sales",     side: "sale",     prefix: "INV" },
  credit_note: { label: "Credit Note",      short: "Credit Note", journal: "Sales",     side: "sale",     prefix: "CN" },
  bill:        { label: "Vendor Bill",      short: "Bill",        journal: "Purchases", side: "purchase", prefix: "BILL" },
  debit_note:  { label: "Debit Note",       short: "Debit Note",  journal: "Purchases", side: "purchase", prefix: "DN" },
  quote:       { label: "Quotation",        short: "Quotation",   journal: "—",         side: "sale",     prefix: "QUO", offLedger: true },
};
const QUOTE_STATES = {
  draft:    { label: "Draft",    tone: "" },
  sent:     { label: "Sent",     tone: "info" },
  accepted: { label: "Accepted", tone: "ok" },
  declined: { label: "Declined", tone: "bad" },
  invoiced: { label: "Invoiced", tone: "gold" },
};

const COSTING = {
  avco: { label: "Weighted average (AVCO)", note: "Every purchase blends into one running average cost. The default in Odoo and most GCC trading businesses." },
  fifo: { label: "First in, first out (FIFO)", note: "Oldest purchase layers are consumed first. Closest to physical flow and preferred by many auditors." },
  standard: { label: "Standard cost", note: "Always uses the cost held on the product. Simplest to explain, but variances are not tracked." },
};
function deriveBooks(state) {
  const method = COSTING[state.costing] ? state.costing : "avco";
  const stock = {};                       // productId -> { qty, value, layers }
  const moves = [];
  const entries = [];
  const std = (pid) => (PROD[pid] ? PROD[pid].cost : 0);
  const bin = (pid) => stock[pid] || (stock[pid] = { qty: 0, value: 0, layers: [] });
  /* Unit cost for a return coming back into stock. */
  const cost = (pid) => {
    const s = stock[pid];
    if (method === "standard") return std(pid);
    if (s && s.qty > 0.0001) return s.value / s.qty;
    return std(pid);
  };
  /* Consume stock and report what it cost, honouring the chosen method. */
  const drain = (pid, qty) => {
    const s = bin(pid);
    if (method === "standard") return R2(std(pid) * qty);
    if (method === "fifo") {
      let need = qty, val = 0;
      while (need > 0.0001 && s.layers.length) {
        const l = s.layers[0], take = Math.min(l.qty, need);
        val += take * l.unit; need = R2(need - take); l.qty = R2(l.qty - take);
        if (l.qty <= 0.0001) s.layers.shift();
      }
      if (need > 0.0001) val += need * std(pid);
      return R2(val);
    }
    return R2(cost(pid) * qty);
  };
  const move = (d, pid, qty, value) => {
    const s = bin(pid);
    if (qty > 0.0001) s.layers.push({ qty, unit: qty ? value / qty : std(pid) });
    else if (qty < -0.0001 && method !== "fifo") {
      let need = -qty;
      while (need > 0.0001 && s.layers.length) {
        const l = s.layers[0], take = Math.min(l.qty, need);
        need = R2(need - take); l.qty = R2(l.qty - take);
        if (l.qty <= 0.0001) s.layers.shift();
      }
    }
    s.qty = R2(s.qty + qty); s.value = R2(s.value + value);
    moves.push({ id: uid("sm"), date: d.date, docId: d.id, docNo: d.number, docType: d.type,
      product: pid, qty, unit: qty ? R2(Math.abs(value / qty)) : 0, value, balQty: s.qty, balValue: s.value });
  };

  state.manual.forEach((je) => entries.push({ ...je, source: "manual", lines: je.lines.map((l) => ({ ...l })) }));

  [...state.docs.filter((d) => d.state === "posted" && d.type !== "quote"), ...(state.stockOps||[]).filter(o=>o.state==='posted').map(o=>({...o,stockOperation:true,type:o.kind}))].sort((a, b) => a.date.localeCompare(b.date) || (a.seq||0) - (b.seq||0)).forEach((d) => {
    if(d.stockOperation){
      const L=[];
      d.lines.forEach(l=>{
        const p=PROD[l.product];if(!p)return;
        const delta=+l.delta, ac=l.accounts||accountSnapshot(p);
        const value=delta>=0?R2(delta*(l.unit??cost(p.id))):-drain(p.id,-delta);
        if(Math.abs(delta)>0.00001)move(d,p.id,delta,value);
        if(Math.abs(value)>0.004){
          L.push({acc:ac.inventory,debit:value>0?value:0,credit:value<0?-value:0,label:`${d.kind==='scrap'?'Scrap':'Physical count'} · ${p.code}`});
          L.push({acc:ac.adjustment,debit:value<0?-value:0,credit:value>0?value:0,label:d.reason});
        }
      });
      entries.push({id:'entry_'+d.id,number:d.number,date:d.date,ref:d.reason,journal:'Stock adjustments',source:'stock',stockOpId:d.id,lines:L});
      return;
    }
    const am = amounts(d);
    const L = [];
    const add = (acc, debit, credit, label, partner) => {
      if (R2(debit) === 0 && R2(credit) === 0) return;
      L.push({ acc, debit: R2(debit), credit: R2(credit), label, partner: partner || null });
    };
    const bucket = {};
    const push = (acc, v) => { bucket[acc] = R2((bucket[acc] || 0) + v); };

    if (d.type === "invoice" || d.type === "credit_note") {
      const s = d.type === "invoice" ? 1 : -1;
      add(A.AR, s > 0 ? am.total : 0, s > 0 ? 0 : am.total, s > 0 ? "Trade receivable" : "Receivable reversed", d.partner);
      am.lines.forEach((l) => {
        const acc = l.account || l.accounts?.income || (PROD[l.product] ? PROD[l.product].income : "4100");
        add(acc, s > 0 ? 0 : l.amount, s > 0 ? l.amount : 0, l.desc);
      });
      add(A.VOUT, s > 0 ? 0 : am.vat, s > 0 ? am.vat : 0, "Output VAT");
      am.lines.forEach((l) => {
        const p = PROD[l.product];
        if (!p || p.kind !== "goods") return;
        if (s > 0) {                       // invoice — relieve stock
          const val = drain(l.product, l.qty);
          move(d, l.product, -l.qty, -val);
          push((l.accounts?.expense || p.expense || A.COGS)+"|"+(l.accounts?.inventory||p.inventory||A.INV), val);
        } else {                           // credit note — goods come back
          const val = R2(cost(l.product) * l.qty);
          move(d, l.product, l.qty, val);
          push((l.accounts?.expense || p.expense || A.COGS)+"|"+(l.accounts?.inventory||p.inventory||A.INV), -val);
        }
      });
      Object.entries(bucket).forEach(([key, v]) => {
        const [acc,inventory]=key.split("|");
        add(acc, v > 0 ? v : 0, v > 0 ? 0 : -v, "Cost of goods sold");
        add(inventory || A.INV, v > 0 ? 0 : -v, v > 0 ? v : 0, v > 0 ? "Inventory relieved" : "Inventory returned");
      });
    } else {
      const s = d.type === "bill" ? 1 : -1;
      am.lines.forEach((l) => {
        const p = PROD[l.product];
        const goods = p && p.kind === "goods";
        const acc = goods ? (l.accounts?.inventory||p.inventory||A.INV) : l.account || l.accounts?.expense || (p ? p.expense : "6900");
        add(acc, s > 0 ? l.amount : 0, s > 0 ? 0 : l.amount, l.desc);
        if (goods) move(d, l.product, l.qty * s, R2(l.amount * s));
      });
      add(A.VIN, s > 0 ? am.vat : 0, s > 0 ? 0 : am.vat, "Input VAT recoverable");
      if (am.rcm > 0) {
        add(A.VIN, s > 0 ? am.rcm : 0, s > 0 ? 0 : am.rcm, "Input VAT — reverse charge");
        add(A.VOUT, s > 0 ? 0 : am.rcm, s > 0 ? am.rcm : 0, "Output VAT — reverse charge");
      }
      add(A.AP, s > 0 ? 0 : am.total, s > 0 ? am.total : 0, s > 0 ? "Trade payable" : "Payable reversed", d.partner);
    }
    entries.push({ id: uid("e"), number: d.number, date: d.date, ref: d.ref || DOCMETA[d.type].label,
      journal: DOCMETA[d.type].journal, source: "doc", docId: d.id, docType: d.type, partner: d.partner, lines: L });
  });

  state.payments.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((p) => {
    const inb = p.kind === "in";
    const mName = MET[p.method] ? MET[p.method].name : inb ? "Customer receipt" : "Vendor payment";
    entries.push({ id: uid("e"), number: p.number, date: p.date,
      ref: [mName, p.memo].filter(Boolean).join(" · "),
      journal: inb ? "Bank Receipts" : "Bank Payments", source: "payment", payId: p.id,
      partner: p.partner, method: p.method,
      lines: inb
        ? [{ acc: p.account, debit: p.amount, credit: 0, label: `Received by ${mName.toLowerCase()}` },
           { acc: A.AR, debit: 0, credit: p.amount, label: `Settled by ${mName.toLowerCase()}`, partner: p.partner }]
        : [{ acc: A.AP, debit: p.amount, credit: 0, label: `Settled by ${mName.toLowerCase()}`, partner: p.partner },
           { acc: p.account, debit: 0, credit: p.amount, label: `Paid by ${mName.toLowerCase()}` }],
    });
  });

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
  const flat = [];
  entries.forEach((e) => e.lines.forEach((l, i) =>
    flat.push({ ...l, entryId: e.id, date: e.date, number: e.number, ref: e.ref, journal: e.journal, docId: e.docId, key: e.id + "_" + i })));
  const totalD = R2(flat.reduce((s, l) => s + l.debit, 0));
  const totalC = R2(flat.reduce((s, l) => s + l.credit, 0));
  return { entries, flat, stock, moves, totalD, totalC, balanced: Math.abs(totalD - totalC) < 0.01 };
}

/* ========================================================================== */
/*  REPORTS                                                                   */
/* ========================================================================== */

const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

function trialBalance(flat, from, to) {
  const m = {};
  ACCOUNTS.forEach((a) => (m[a.code] = { acc: a, open: 0, d: 0, c: 0 }));
  flat.forEach((l) => {
    const r = m[l.acc]; if (!r) return;
    if (from && l.date < from) r.open = R2(r.open + l.debit - l.credit);
    else if (inRange(l.date, from, to)) { r.d = R2(r.d + l.debit); r.c = R2(r.c + l.credit); }
  });
  const rows = Object.values(m).map((r) => ({ ...r, close: R2(r.open + r.d - r.c) }))
    .filter((r) => Math.abs(r.open) > 0.004 || r.d > 0.004 || r.c > 0.004);
  const t = rows.reduce((s, r) => ({
    od: s.od + Math.max(r.open, 0), oc: s.oc + Math.max(-r.open, 0), d: s.d + r.d, c: s.c + r.c,
    cd: s.cd + Math.max(r.close, 0), cc: s.cc + Math.max(-r.close, 0),
  }), { od: 0, oc: 0, d: 0, c: 0, cd: 0, cc: 0 });
  return { rows, t };
}

function generalLedger(flat, accId, from, to) {
  let open = 0;
  const rows = [];
  flat.filter((l) => l.acc === accId).forEach((l) => {
    if (from && l.date < from) open = R2(open + l.debit - l.credit);
    else if (inRange(l.date, from, to)) rows.push(l);
  });
  let run = open;
  const out = rows.map((l) => { run = R2(run + l.debit - l.credit); return { ...l, run }; });
  return { open, rows: out, close: run,
    d: R2(out.reduce((s, l) => s + l.debit, 0)), c: R2(out.reduce((s, l) => s + l.credit, 0)) };
}

function partnerLedger(flat, partnerId, from, to) {
  let open = 0; const rows = [];
  flat.filter((l) => l.partner === partnerId && (l.acc === A.AR || l.acc === A.AP)).forEach((l) => {
    if (from && l.date < from) open = R2(open + l.debit - l.credit);
    else if (inRange(l.date, from, to)) rows.push(l);
  });
  let run = open;
  const out = rows.map((l) => { run = R2(run + l.debit - l.credit); return { ...l, run }; });
  return { open, rows: out, close: run,
    d: R2(out.reduce((s, l) => s + l.debit, 0)), c: R2(out.reduce((s, l) => s + l.credit, 0)) };
}

const BUCKETS = ["Not due", "1 – 30", "31 – 60", "61 – 90", "91 – 120", "120 +"];
function bucketOf(due, asOf) {
  const n = daysBetween(due, asOf);
  if (n <= 0) return 0; if (n <= 30) return 1; if (n <= 60) return 2;
  if (n <= 90) return 3; if (n <= 120) return 4; return 5;
}

function aging(state, kind, asOf) {
  const isAR = kind === "receivable";
  const chargeT = isAR ? "invoice" : "bill";
  const creditT = isAR ? "credit_note" : "debit_note";
  const payK = isAR ? "in" : "out";
  const out = [];
  PARTNERS.filter((p) => (isAR ? p.role === "customer" : p.role === "vendor")).forEach((p) => {
    const charges = state.docs
      .filter((d) => d.state === "posted" && d.partner === p.id && d.type === chargeT && d.date <= asOf)
      .map((d) => ({ id: d.id, number: d.number, date: d.date, due: d.due, ref: d.ref, amount: amounts(d).total, open: 0 }))
      .sort((a, b) => a.due.localeCompare(b.due) || a.number.localeCompare(b.number));
    let credit = 0;
    state.docs.filter((d) => d.state === "posted" && d.partner === p.id && d.type === creditT && d.date <= asOf)
      .forEach((d) => (credit = R2(credit + amounts(d).total)));
    state.payments.filter((x) => x.partner === p.id && x.kind === payK && x.date <= asOf)
      .forEach((x) => (credit = R2(credit + x.amount)));
    charges.forEach((c) => { const ap = Math.min(credit, c.amount); credit = R2(credit - ap); c.open = R2(c.amount - ap); });
    const items = charges.filter((c) => c.open > 0.004).map((c) => ({ ...c, b: bucketOf(c.due, asOf) }));
    if (!items.length && credit < 0.005) return;
    const b = [0, 0, 0, 0, 0, 0];
    items.forEach((i) => (b[i.b] = R2(b[i.b] + i.open)));
    if (credit > 0.004) b[0] = R2(b[0] - credit);
    out.push({ partner: p, items, b, total: R2(b.reduce((s, x) => s + x, 0)), unapplied: credit });
  });
  const tot = [0, 0, 0, 0, 0, 0];
  out.forEach((r) => r.b.forEach((v, i) => (tot[i] = R2(tot[i] + v))));
  return { rows: out.filter((r) => Math.abs(r.total) > 0.004), tot, grand: R2(tot.reduce((s, x) => s + x, 0)) };
}

function pnl(flat, from, to) {
  const bal = {};
  flat.forEach((l) => { if (inRange(l.date, from, to)) bal[l.acc] = R2((bal[l.acc] || 0) + l.debit - l.credit); });
  const pick = (types) => ACCOUNTS.filter((a) => types.includes(a.type) && Math.abs(bal[a.code] || 0) > 0.004)
    .map((a) => ({ acc: a, amount: a.type === "income" ? R2(-(bal[a.code] || 0)) : R2(bal[a.code] || 0) }));
  const rev = pick(["income"]), cos = pick(["cogs"]), exp = pick(["expense"]);
  const sum = (r) => R2(r.reduce((s, x) => s + x.amount, 0));
  const revenue = sum(rev), cost = sum(cos), expense = sum(exp);
  const gross = R2(revenue - cost), net = R2(gross - expense);
  return { rev, cos, exp, revenue, cost, expense, gross, net,
    gm: revenue ? (gross / revenue) * 100 : 0, nm: revenue ? (net / revenue) * 100 : 0 };
}

function balanceSheet(flat, asOf, fyStart) {
  const bal = {};
  flat.forEach((l) => { if (l.date <= asOf) bal[l.acc] = R2((bal[l.acc] || 0) + l.debit - l.credit); });
  let cy = 0, py = 0;
  flat.forEach((l) => {
    if (!ACC[l.acc] || !IS_PL(ACC[l.acc].type)) return;
    const v = l.debit - l.credit;
    if (l.date < fyStart) py = R2(py - v);
    else if (l.date <= asOf) cy = R2(cy - v);
  });
  const grp = (g) => {
    const subs = {};
    ACCOUNTS.filter((a) => AT[a.type].group === g && Math.abs(bal[a.code] || 0) > 0.004).forEach((a) => {
      const s = AT[a.type].sub;
      (subs[s] || (subs[s] = [])).push({ acc: a, amount: g === "Assets" ? R2(bal[a.code]) : R2(-(bal[a.code] || 0)) });
    });
    return Object.entries(subs).map(([name, rows]) => ({ name, rows, total: R2(rows.reduce((s, r) => s + r.amount, 0)) }));
  };
  const assets = grp("Assets"), liab = grp("Liabilities"), eq = grp("Equity");
  const totA = R2(assets.reduce((s, x) => s + x.total, 0));
  const totL = R2(liab.reduce((s, x) => s + x.total, 0));
  const eqRows = eq.flatMap((x) => x.rows);
  if (Math.abs(py) > 0.004) eqRows.push({ acc: { code: "3250", name: "Prior year results" }, amount: py });
  eqRows.push({ acc: { code: "3300", name: "Current year earnings" }, amount: cy });
  const totE = R2(eqRows.reduce((s, r) => s + r.amount, 0));
  return { assets, liab, eqRows, totA, totL, totE, cy, py, diff: R2(totA - totL - totE) };
}

function vat201(state, from, to) {
  const z = () => ({ net: 0, vat: 0 });
  const b1 = {}; EMIRATES.forEach((e) => (b1[e] = z()));
  const R = { b1, b3: z(), b4: z(), b5: z(), b9: z(), b10: z() };
  state.docs.filter((d) => d.state === "posted" && inRange(d.date, from, to)).forEach((d) => {
    const s = SIGNS[d.type];
    const sale = DOCMETA[d.type].side === "sale";
    amounts(d).lines.forEach((l) => {
      const net = R2(l.amount * s), vat = R2(l.taxAmt * s);
      if (sale) {
        if (l.kind === "standard") {
          const em = EMIRATES.includes(d.emirate) ? d.emirate : COMPANY.emirate;
          b1[em].net = R2(b1[em].net + net); b1[em].vat = R2(b1[em].vat + vat);
        } else if (l.kind === "zero") R.b4.net = R2(R.b4.net + net);
        else if (l.kind === "exempt") R.b5.net = R2(R.b5.net + net);
      } else {
        if (l.kind === "standard") { R.b9.net = R2(R.b9.net + net); R.b9.vat = R2(R.b9.vat + vat); }
        else if (l.kind === "rcm") {
          R.b3.net = R2(R.b3.net + net); R.b3.vat = R2(R.b3.vat + vat);
          R.b10.net = R2(R.b10.net + net); R.b10.vat = R2(R.b10.vat + vat);
        }
      }
    });
  });
  const em = EMIRATES.map((e) => ({ name: e, ...b1[e] })).filter((e) => Math.abs(e.net) > 0.004);
  const b1t = em.reduce((s, e) => ({ net: R2(s.net + e.net), vat: R2(s.vat + e.vat) }), z());
  const out = { net: R2(b1t.net + R.b3.net + R.b4.net + R.b5.net), vat: R2(b1t.vat + R.b3.vat) };
  const inp = { net: R2(R.b9.net + R.b10.net), vat: R2(R.b9.vat + R.b10.vat) };
  return { ...R, em, b1t, out, inp, due: R2(out.vat - inp.vat) };
}
/* ==========================================================================
   PRESENTATION LAYER — enterprise workspace, light and dark
   ========================================================================== */

const CSS = `
.mz{
  --nav-900:#071417; --nav-800:#0D2229; --nav-700:#153039; --nav-600:#1F4450;
  --ink:#141B36; --ink-2:#41507C; --ink-3:#636F99; --ink-4:#9AA5C6;
  --bg:#F3F5FC; --surface:#FFFFFF; --surface-2:#F7F9FE; --surface-3:#EEF2FC;
  --line:#E2E7F5; --line-2:#EDF1FA;
  --brand:#3A63E0; --brand-600:#2D51C6; --brand-50:#EAEFFE; --brand-100:#D3DEFC;
  --gold:#96620B; --gold-50:#FDF3E0;
  --pos:#0B7B55; --pos-50:#E3F7EF; --neg:#CC3355; --neg-50:#FDEBEF;
  --warn:#96620B; --warn-50:#FDF3E0; --info:#2B6FD6; --info-50:#E9F1FD;
  --c1:#4F7CFF; --c2:#DB2777; --c3:#0891B2;
  --sh-1:0 1px 2px rgba(24,35,80,.05), 0 1px 3px rgba(24,35,80,.04);
  --sh-2:0 2px 6px rgba(24,35,80,.06), 0 10px 26px rgba(24,35,80,.08);
  --sh-3:0 22px 60px rgba(24,35,80,.2), 0 5px 16px rgba(24,35,80,.1);
  --ring:0 0 0 3px rgba(58,99,224,.22);
  --post-bg:#071417; --post-line:rgba(255,255,255,.07);
  --nav-bg:#FFFFFF; --nav-edge:#E2E7F5; --nav-txt:#41507C; --nav-hi:#141B36;
  --nav-hover:#F1F4FD; --nav-active:#EAEFFE; --nav-group:#697699; --nav-brand:#141B36;
  --nav-sub:#697699; --nav-mark:#3A63E0; --nav-chip:#EEF2FC; --nav-chipt:#697699;
  --nav-card:#F7F9FE; --nav-cardline:#E6EBF8; --nav-scroll:#C3CCE6;
  --violet:#7C3AED; --pink:#DB2777; --cyan:#0891B2;
  --app-bg:radial-gradient(1100px 560px at 78% -10%, rgba(124,58,237,.09), transparent 62%),
           radial-gradient(900px 480px at 4% 2%, rgba(58,99,224,.09), transparent 60%), #F3F5FC;
  --r-xs:5px; --r-s:8px; --r:11px; --r-l:15px;
  --sans:'Geist Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --mono:'Geist Mono',ui-monospace,'SF Mono',Menlo,monospace;
  --ease:cubic-bezier(.32,.72,0,1);
  color-scheme:light;
  font-family:var(--sans); font-size:14px; color:var(--ink); background:var(--app-bg);
  height:100%; display:flex; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.mz[data-theme="dark"]{
  --ink:#EDF1FF; --ink-2:#A9B5DE; --ink-3:#7C89BC; --ink-4:#5B679B;
  --bg:#080C22; --surface:#121938; --surface-2:#182046; --surface-3:#1E2755;
  --line:rgba(255,255,255,.09); --line-2:rgba(255,255,255,.055);
  --brand:#4F7CFF; --brand-600:#6E92FF; --brand-50:rgba(79,124,255,.16); --brand-100:rgba(79,124,255,.28);
  --gold:#F5B544; --gold-50:rgba(245,181,68,.16);
  --pos:#22C58B; --pos-50:rgba(34,197,139,.15); --neg:#F65F7B; --neg-50:rgba(246,95,123,.15);
  --warn:#F5B544; --warn-50:rgba(245,181,68,.15); --info:#38BDF8; --info-50:rgba(56,189,248,.15);
  --violet:#9061F9; --pink:#EC4899; --cyan:#22D3EE;
  --c1:#4F7CFF; --c2:#EC4899; --c3:#22D3EE;
  --sh-1:0 1px 2px rgba(0,0,0,.5);
  --sh-2:0 4px 10px rgba(0,0,0,.45), 0 14px 34px rgba(0,0,0,.4);
  --sh-3:0 26px 70px rgba(0,0,0,.7), 0 8px 22px rgba(0,0,0,.5);
  --ring:0 0 0 3px rgba(79,124,255,.3);
  --post-bg:#0B1130; --post-line:rgba(255,255,255,.09);
  --nav-bg:#0B1030; --nav-edge:rgba(255,255,255,.07); --nav-txt:#98A5D4; --nav-hi:#FFFFFF;
  --nav-hover:rgba(255,255,255,.06); --nav-active:rgba(255,255,255,.08); --nav-group:#7E8ABC;
  --nav-brand:#FFFFFF; --nav-sub:#8B97C9; --nav-mark:#4F7CFF; --nav-chip:rgba(255,255,255,.08);
  --nav-chipt:#98A5D4; --nav-card:rgba(255,255,255,.05); --nav-cardline:rgba(255,255,255,.08);
  --nav-scroll:#2A3466;
  --app-bg:radial-gradient(1200px 620px at 76% -8%, rgba(144,97,249,.22), transparent 62%),
           radial-gradient(940px 520px at 6% 4%, rgba(79,124,255,.16), transparent 60%), #080C22;
  color-scheme:dark;
}
.mz *,.mz *::before,.mz *::after{box-sizing:border-box}
.mz :where(button){font:inherit;cursor:pointer;border:none;background:none;color:inherit}
.mz input,.mz select,.mz textarea{font:inherit;color:inherit}
.mz h1,.mz h2,.mz h3,.mz p,.mz ul{margin:0}
.mz :focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:var(--r-xs)}
.mz ::-webkit-scrollbar{width:11px;height:11px}
.mz ::-webkit-scrollbar-thumb{background:var(--ink-4);border-radius:9px;border:3px solid transparent;background-clip:content-box}
.mz[data-theme="dark"] ::-webkit-scrollbar-thumb{background:#2E3A70;background-clip:content-box}
.mz[data-theme="dark"] ::-webkit-scrollbar-thumb:hover{background:#3C4A88;background-clip:content-box}
.mz ::-webkit-scrollbar-thumb:hover{background:var(--ink-3);background-clip:content-box}
.mz ::-webkit-scrollbar-track{background:transparent}

.num{font-family:var(--mono);font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1;letter-spacing:-.012em}
.mono{font-family:var(--mono);letter-spacing:-.01em}
.micro{font-size:10.5px;font-weight:600;letter-spacing:.085em;text-transform:uppercase;color:var(--ink-3)}
.muted{color:var(--ink-3)}
.pos{color:var(--pos)} .neg{color:var(--neg)}

/* ---------------------------------------------------------------- sidebar */
.side{width:256px;flex:0 0 256px;background:var(--nav-bg);display:flex;flex-direction:column;
  border-right:1px solid var(--nav-edge);transition:width .22s var(--ease),flex-basis .22s var(--ease)}
.side.mini{width:68px;flex-basis:68px}
.side-top{padding:16px 17px 13px;display:flex;align-items:center;gap:11px}
.logo{width:35px;height:35px;border-radius:10px;flex:0 0 35px;display:grid;place-items:center;
  background:linear-gradient(148deg,#13755F,#0A4033);box-shadow:inset 0 1px 0 rgba(255,255,255,.24)}
.wordmark{min-width:0}
.wordmark b{display:block;color:var(--nav-brand);font-size:16.5px;font-weight:600;letter-spacing:-.024em;line-height:1.1}
.wordmark span{display:block;color:var(--nav-sub);font-size:9.5px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;margin-top:4px}
.side.mini .wordmark,.side.mini .co-card,.side.mini .nav-group,.side.mini .nav-item .lbl,
.side.mini .nav-item .ct,.side.mini .side-foot .who{display:none}
.side.mini .side-top{justify-content:center;padding:17px 0 15px}
.side.mini .nav-item{justify-content:center;padding:9px 0;margin:2px 12px}
.side.mini .side-foot{padding:13px 0;justify-content:center}

.co-card{margin:2px 13px 10px;padding:9px 11px;border-radius:var(--r);background:var(--nav-card);
  border:1px solid var(--nav-cardline);display:flex;align-items:center;gap:10px;width:calc(100% - 26px);
  text-align:left;transition:background .14s,border-color .14s}
.co-card:hover{background:var(--nav-hover);border-color:var(--nav-edge)}
.co-card .av{width:29px;height:29px;border-radius:8px;flex:0 0 29px;display:grid;place-items:center;
  background:linear-gradient(148deg,#D0A343,#A0721B);color:#221603;font-weight:700;font-size:12px}
.co-card .t{min-width:0;flex:1}
.co-card .t b{display:block;color:var(--nav-hi);font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.co-card .t span{display:block;color:var(--nav-sub);font-size:10px;font-family:var(--mono);margin-top:2px}

.nav-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:10px}
.nav-scroll::-webkit-scrollbar-thumb{background:var(--nav-scroll);background-clip:content-box}
.nav-group{display:flex;align-items:center;gap:8px;width:calc(100% - 24px);margin:7px 12px 2px;padding:5px 10px;
  border-radius:var(--r-s);font-size:9.5px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;
  color:var(--nav-group);text-align:left;transition:background .13s,color .13s}
.nav-group:hover{background:var(--nav-hover);color:var(--nav-hi)}
.nav-group .cv{margin-left:auto;transition:transform .18s var(--ease);opacity:.7}
.nav-group.shut .cv{transform:rotate(-90deg)}
.nav-grp-items{overflow:hidden}
.nav-item{position:relative;display:flex;align-items:center;gap:11px;width:calc(100% - 24px);margin:1px 12px;
  padding:8px 10px;border-radius:var(--r-s);color:var(--nav-txt);text-align:left;font-size:13.5px;
  font-weight:450;transition:background .14s,color .14s}
.nav-item:hover{background:var(--nav-hover);color:var(--nav-hi)}
.nav-item.on{background:var(--nav-active);color:var(--nav-hi);font-weight:600}
.nav-item.on svg{color:var(--nav-mark)}
.nav-item.on::before{content:"";position:absolute;left:-12px;top:50%;transform:translateY(-50%);
  width:3px;height:19px;border-radius:0 3px 3px 0;background:var(--nav-mark)}
.nav-item .lbl{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav-item .ct{font-family:var(--mono);font-size:10.5px;color:var(--nav-chipt);background:var(--nav-chip);
  padding:1px 6px;border-radius:20px}
.nav-item.on .ct{color:var(--nav-hi);background:var(--nav-chip)}
.side-foot{border-top:1px solid var(--nav-edge);padding:13px 15px;display:flex;align-items:center;gap:10px}
.side-foot .av{width:31px;height:31px;border-radius:50%;flex:0 0 31px;display:grid;place-items:center;
  background:var(--nav-active);color:var(--nav-txt);font-size:11.5px;font-weight:600}
.side-foot .who{flex:1;min-width:0}
.side-foot .who b{display:block;color:var(--nav-hi);font-size:12.5px;font-weight:500}
.side-foot .who span{display:block;color:var(--nav-sub);font-size:10.5px}
.side-foot .collapse{color:var(--nav-sub);padding:6px;border-radius:var(--r-xs);transition:background .14s,color .14s}
.side-foot .collapse:hover{background:var(--nav-hover);color:var(--nav-hi)}

/* ---------------------------------------------------------------- topbar */
.main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.topbar{height:70px;flex:0 0 70px;background:var(--surface);border-bottom:1px solid var(--line);
  display:grid;grid-template-columns:minmax(180px,1fr) minmax(280px,540px) minmax(180px,1fr);
  align-items:center;gap:28px;padding:0 24px;position:relative;z-index:20}
.mz[data-theme="dark"] .topbar{background:rgba(18,25,56,.82);backdrop-filter:blur(14px) saturate(1.3)}
.tb-l{display:flex;align-items:center;gap:12px;min-width:0}
.tb-r{display:flex;align-items:center;gap:8px;justify-content:flex-end;min-width:0}
.tb-div{width:1px;height:26px;background:var(--line);flex:0 0 1px;margin:0 6px}
.tb-icons{display:flex;align-items:center;gap:2px;padding:3px;border-radius:22px;background:var(--surface-2);
  border:1px solid var(--line)}
.tb-icons .icon-btn{width:34px;height:34px;border-radius:18px}
.tb-icons .icon-btn:hover{background:var(--surface);border-color:transparent;box-shadow:var(--sh-1)}
@media (max-width:1400px){.tb-r .userchip .ux{display:none}.tb-r .userchip{padding-right:6px}}
@media (max-width:1240px){.topbar{grid-template-columns:auto minmax(0,1fr) auto;gap:16px}.crumb{display:none}
  .tb-l .chip span.lbl{display:none}.coswitch .cx{display:none}.coswitch{padding:0 9px}}
.crumb{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink-3)}
.crumb b{color:var(--ink);font-weight:500}
.omni{width:100%;display:flex;align-items:center;gap:12px;height:44px;padding:0 8px 0 8px;
  font-size:14px;border:1px solid var(--line);border-radius:24px;background:var(--surface-2);
  color:var(--ink-3);transition:border-color .16s,background .16s,box-shadow .16s}
.omni:hover{border-color:var(--brand);background:var(--surface);box-shadow:0 0 0 4px var(--brand-50)}
.omni .oi{width:30px;height:30px;border-radius:16px;flex:0 0 30px;display:grid;place-items:center;
  background:var(--brand-50);color:var(--brand)}
.omni .ot{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:1px}
.omni kbd{font-family:var(--mono);font-size:10.5px;background:var(--surface);margin-right:8px;
  border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;padding:3px 8px;color:var(--ink-3)}
.chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:20px;
  font-size:12px;font-weight:500;background:var(--surface-2);border:1px solid var(--line);white-space:nowrap}
.chip.ok{background:var(--pos-50);border-color:transparent;color:var(--pos)}
.chip.bad{background:var(--neg-50);border-color:transparent;color:var(--neg)}
.icon-btn{width:34px;height:34px;border-radius:var(--r-s);display:grid;place-items:center;color:var(--ink-3);
  border:1px solid transparent;transition:background .14s,color .14s,border-color .14s}
.icon-btn:hover{background:var(--surface-2);color:var(--ink);border-color:var(--line)}
.me{width:33px;height:33px;border-radius:50%;display:grid;place-items:center;font-size:11.5px;font-weight:600;
  background:linear-gradient(148deg,#16785F,#0A4033);color:#fff;transition:box-shadow .14s,transform .14s}
.me:hover{box-shadow:var(--ring);transform:translateY(-1px)}

/* --------------------------------------------------------------- popover */
.pop-scrim{position:fixed;inset:0;z-index:900}
.pop{position:fixed;top:56px;right:20px;z-index:901;width:240px;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh-3);overflow:hidden;
  animation:popIn .15s var(--ease)}
@keyframes popIn{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}
.pop-head{padding:14px 16px;border-bottom:1px solid var(--line-2)}
.pop-head b{display:block;font-size:13.5px;font-weight:500}
.pop-head span{display:block;font-size:11.5px;color:var(--ink-3);margin-top:3px}
.pop-item{display:flex;align-items:center;gap:11px;width:100%;padding:10px 16px;font-size:13px;
  color:var(--ink-2);text-align:left;transition:background .12s,color .12s}
.pop-item:hover{background:var(--surface-2);color:var(--ink)}
.pop-sep{height:1px;background:var(--line-2);margin:5px 0}
.sw{width:34px;height:19px;border-radius:20px;background:var(--line);position:relative;flex:0 0 34px;
  margin-left:auto;transition:background .18s var(--ease)}
.sw.on{background:var(--brand)}
.sw i{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:var(--surface);
  box-shadow:var(--sh-1);transition:transform .18s var(--ease)}
.sw.on i{transform:translateX(15px)}

/* ------------------------------------------------------------------ page */
.page{flex:1;overflow-y:auto;padding:0 26px 46px}
.view{animation:viewIn .26s var(--ease)}
@keyframes viewIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.page-head{position:sticky;top:0;z-index:6;background:var(--app-bg);display:flex;align-items:flex-start;
  gap:18px;padding:24px 0 18px;flex-wrap:wrap}
.page-head h1{font-size:27px;font-weight:600;letter-spacing:-.03em;line-height:1.16}
.page-head p{color:var(--ink-3);font-size:13px;margin-top:6px;max-width:74ch}
.page-head .acts{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* ---------------------------------------------------------------- buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:35px;padding:0 14px;
  border-radius:var(--r-s);font-size:13px;font-weight:500;background:var(--surface);
  border:1px solid var(--line);color:var(--ink-2);box-shadow:var(--sh-1);white-space:nowrap;
  transition:background .14s,border-color .14s,color .14s,box-shadow .14s,transform .1s}
.btn:hover{background:var(--surface-2);border-color:var(--ink-4);color:var(--ink);box-shadow:var(--sh-2)}
.btn:active{transform:translateY(1px);box-shadow:var(--sh-1)}
.btn.pri{background:var(--brand);border-color:var(--brand);color:#fff}
.btn.pri:hover{background:var(--brand-600);border-color:var(--brand-600);color:#fff}
.btn.danger{color:var(--neg);border-color:var(--line)}
.btn.danger:hover{background:var(--neg-50);border-color:var(--neg);color:var(--neg)}
.btn.ghost{background:transparent;border-color:transparent;box-shadow:none;color:var(--ink-3)}
.btn.ghost:hover{background:var(--surface-2);color:var(--ink);box-shadow:none}
.btn.sm{height:30px;padding:0 11px;font-size:12.5px}
.btn.wa{background:#1FA855;border-color:#1FA855;color:#fff}
.btn.wa:hover{background:#189046;border-color:#189046;color:#fff}
.btn:disabled{opacity:.42;cursor:not-allowed;box-shadow:none;transform:none}

/* ---------------------------------------------------------------- surfaces */
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-l);box-shadow:var(--sh-1);
  transition:box-shadow .2s var(--ease),border-color .2s}
.mz[data-theme="dark"] .card{background:rgba(18,25,56,.72);backdrop-filter:blur(12px) saturate(1.25);
  box-shadow:0 1px 0 rgba(255,255,255,.05) inset, var(--sh-1)}
.mz[data-theme="dark"] .hero,.mz[data-theme="dark"] .banner{backdrop-filter:blur(12px) saturate(1.25)}
.card-h{display:flex;align-items:center;gap:12px;padding:16px 19px;border-bottom:1px solid var(--line-2)}
.card-h .r .btn.ghost{color:var(--brand);font-weight:600}
.card-h .r .btn.ghost:hover{background:var(--brand-50)}
.card-h h3{font-size:14.5px;font-weight:600;letter-spacing:-.015em}
.card-h p{font-size:12px;color:var(--ink-3);margin-top:3px}
.card-h .r{margin-left:auto;display:flex;gap:8px;align-items:center}
.card-b{padding:19px}
.grid{display:grid;gap:16px}

/* ---------------------------------------------------------------- stat card */
.stat{padding:17px 19px 15px;position:relative;overflow:hidden}
.stat:hover,.kpi:hover{box-shadow:var(--sh-2);transform:translateY(-2px)}
.kpi{transition:box-shadow .2s var(--ease),transform .18s var(--ease),border-color .2s}
.kpi.t1{background:linear-gradient(145deg,rgba(79,124,255,.13),transparent 60%),var(--surface);border-color:rgba(79,124,255,.26)}
.kpi.t2{background:linear-gradient(145deg,rgba(236,72,153,.13),transparent 60%),var(--surface);border-color:rgba(236,72,153,.26)}
.kpi.t3{background:linear-gradient(145deg,rgba(18,185,129,.13),transparent 60%),var(--surface);border-color:rgba(18,185,129,.26)}
.kpi.t4{background:linear-gradient(145deg,rgba(34,211,238,.13),transparent 60%),var(--surface);border-color:rgba(34,211,238,.26)}
.kpi.t5{background:linear-gradient(145deg,rgba(245,181,68,.13),transparent 60%),var(--surface);border-color:rgba(245,181,68,.26)}
.kpi.t6{background:linear-gradient(145deg,rgba(144,97,249,.13),transparent 60%),var(--surface);border-color:rgba(144,97,249,.26)}
.kpi.t7{background:linear-gradient(145deg,rgba(246,95,123,.13),transparent 60%),var(--surface);border-color:rgba(246,95,123,.26)}
.kpi.t1:hover{border-color:#4F7CFF} .kpi.t2:hover{border-color:#EC4899} .kpi.t3:hover{border-color:#12B981}
.kpi.t4:hover{border-color:#22D3EE} .kpi.t5:hover{border-color:#F5B544} .kpi.t6:hover{border-color:#9061F9}
.kpi.t7:hover{border-color:#F65F7B}
.stat .top{display:flex;align-items:center;gap:9px}
.stat .ico{width:29px;height:29px;border-radius:9px;display:grid;place-items:center;
  background:var(--brand-50);color:var(--brand)}
.stat .ico.g{background:var(--gold-50);color:var(--gold)}
.stat .ico.i{background:var(--info-50);color:var(--info)}
.stat .ico.n{background:var(--neg-50);color:var(--neg)}
.stat .v{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:26px;font-weight:500;
  letter-spacing:-.035em;margin-top:13px;line-height:1.1}
.stat .sub{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--ink-3)}
.delta{display:inline-flex;align-items:center;gap:3px;font-family:var(--mono);font-size:11px;font-weight:500;
  padding:2px 6px;border-radius:5px}
.delta.up{background:var(--pos-50);color:var(--pos)} .delta.down{background:var(--neg-50);color:var(--neg)}
.spark{position:absolute;right:0;bottom:0;opacity:.55;pointer-events:none}
.kspark .spark{position:static;opacity:1;width:100%;height:auto}

/* ---------------------------------------------------------------- pills */
.pill{display:inline-flex;align-items:center;gap:5px;height:21px;padding:0 8px;border-radius:20px;
  font-size:11px;font-weight:600;background:var(--surface-3);color:var(--ink-2);white-space:nowrap}
.pill i{width:5px;height:5px;border-radius:50%;background:currentColor;display:block}
.pill.ok{background:var(--pos-50);color:var(--pos)}
.pill.warn{background:var(--warn-50);color:var(--warn)}
.pill.bad{background:var(--neg-50);color:var(--neg)}
.pill.info{background:var(--info-50);color:var(--info)}
.pill.gold{background:var(--gold-50);color:var(--gold)}
.av{width:29px;height:29px;border-radius:9px;flex:0 0 29px;display:grid;place-items:center;
  font-size:11px;font-weight:600;background:var(--surface-3);color:var(--ink-2)}
.who-cell{display:flex;align-items:center;gap:10px;min-width:0}
.who-cell b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.who-cell span{font-size:11.5px;color:var(--ink-4);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ---------------------------------------------------------------- tables */
.tbl-wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.tbl th{background:var(--surface-2);font-size:10.5px;font-weight:600;letter-spacing:.075em;
  text-transform:uppercase;color:var(--ink-3);text-align:left;padding:10px 15px;
  border-bottom:1px solid var(--line);white-space:nowrap;user-select:none}
.tbl th.srt{cursor:pointer;transition:color .13s,background .13s}
.tbl th.srt:hover{color:var(--ink);background:var(--surface-3)}
.tbl th .thi{display:inline-flex;align-items:center;gap:5px}
.tbl th.n .thi{flex-direction:row-reverse}
.sarr{width:0;height:0;border-left:3.5px solid transparent;border-right:3.5px solid transparent;
  border-bottom:4.5px solid currentColor;opacity:0;transition:opacity .13s,transform .13s}
.tbl th.srt:hover .sarr{opacity:.35}
.sarr.on{opacity:.9} .sarr.desc{transform:rotate(180deg)}
.tbl td{padding:12px 15px;border-bottom:1px solid var(--line-2);vertical-align:middle;transition:background .12s}
.tbl tbody tr:last-child td{border-bottom:none}
.tbl tbody tr.click{cursor:pointer}
.tbl tbody tr.click:hover td{background:var(--surface-2)}
.tbl tbody tr.click:hover td:first-child{box-shadow:inset 2px 0 0 var(--brand)}
.tbl th.n,.tbl td.n{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums;
  letter-spacing:-.012em;white-space:nowrap}
.tbl tfoot td{background:var(--surface-2);font-weight:600;border-top:1px solid var(--line);
  border-bottom:none;padding:13px 15px}
.tbl tr.sec td{background:var(--surface-3);font-size:10.5px;font-weight:600;letter-spacing:.085em;
  text-transform:uppercase;color:var(--ink-2);padding:9px 15px;border-bottom:1px solid var(--line)}
.tbl tr.sub td{font-weight:600}
.tbl tr.rule td{border-top:1px solid var(--line)}
.tbl tr.grand td{border-top:2px solid var(--ink);font-weight:600;font-size:14px}
.toolbar{display:flex;align-items:center;gap:10px;padding:13px 17px;border-bottom:1px solid var(--line-2);flex-wrap:wrap}
.srch{display:flex;align-items:center;gap:9px;height:34px;padding:0 12px;border:1px solid var(--line);
  border-radius:var(--r-s);background:var(--surface-2);min-width:224px;
  transition:border-color .14s,box-shadow .14s,background .14s}
.srch:focus-within{border-color:var(--brand);background:var(--surface);box-shadow:var(--ring)}
.srch input{border:none;background:none;outline:none;flex:1;min-width:0;font-size:13px}
.seg{display:inline-flex;background:var(--surface-3);border-radius:var(--r-s);padding:3px}
.seg button{height:27px;padding:0 12px;border-radius:6px;font-size:12.5px;color:var(--ink-3);font-weight:500;
  transition:background .16s var(--ease),color .16s}
.seg button.on{background:var(--surface);color:var(--ink);box-shadow:var(--sh-1)}
.empty{padding:60px 24px;text-align:center;color:var(--ink-3)}
.empty .eico{width:46px;height:46px;border-radius:13px;margin:0 auto 15px;display:grid;place-items:center;
  background:var(--surface-3);color:var(--ink-4)}
.empty b{display:block;color:var(--ink);font-weight:600;font-size:14px;margin-bottom:6px}

/* ---------------------------------------------------------------- forms */
.fld{display:block}
.fld > .lb{display:block;font-size:11.5px;font-weight:500;color:var(--ink-2);margin-bottom:6px}
.inp{width:100%;height:35px;padding:0 11px;border:1px solid var(--line);border-radius:var(--r-s);
  background:var(--surface);transition:border-color .14s,box-shadow .14s}
.inp:hover:not(:disabled){border-color:var(--ink-4)}
.inp:focus{outline:none;border-color:var(--brand);box-shadow:var(--ring)}
.inp:disabled{background:var(--surface-2);color:var(--ink-2);cursor:default}
.inp.n{font-family:var(--mono);text-align:right;font-variant-numeric:tabular-nums}
textarea.inp{height:auto;padding:10px 11px;resize:vertical;line-height:1.58}
select.inp{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2367818C' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
.readonly{height:35px;padding:0 11px;display:flex;align-items:center;border:1px solid var(--line-2);
  border-radius:var(--r-s);background:var(--surface-2);color:var(--ink-2);font-family:var(--mono);font-size:12.5px}

.lines{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.lines th{background:var(--surface-2);font-size:10.5px;font-weight:600;letter-spacing:.075em;text-transform:uppercase;
  color:var(--ink-3);text-align:left;padding:10px 11px;border-bottom:1px solid var(--line);white-space:nowrap}
.lines th.n{text-align:right}
.lines td{padding:5px 7px;border-bottom:1px solid var(--line-2);transition:background .12s}
.lines tr:last-child td{border-bottom:none}
.lines tbody tr:hover td{background:var(--surface-2)}
.lines .inp{height:32px;border-color:transparent;background:transparent}
.lines .inp:hover:not(:disabled){border-color:var(--line);background:var(--surface)}
.lines .inp:focus{background:var(--surface)}
.lines .inp:disabled{background:transparent;border-color:transparent}
.sumbox{padding:17px 19px;border-left:1px solid var(--line-2);width:330px;flex:0 0 330px}
.sumrow{display:flex;align-items:center;gap:12px;padding:6px 0;font-size:13px}
.sumrow .k{color:var(--ink-2)}
.sumrow .v{margin-left:auto;font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.012em}
.sumrow.total{margin-top:10px;padding-top:13px;border-top:1px solid var(--line);font-weight:600}
.sumrow.total .v{font-size:20px;letter-spacing:-.03em}

/* ------------------------------------------------------- posting preview */
.post{background:var(--post-bg);border:1px solid var(--post-line);border-radius:var(--r-l);
  overflow:hidden;box-shadow:var(--sh-2)}
.post-h{display:flex;align-items:center;gap:9px;padding:14px 17px;border-bottom:1px solid var(--post-line);
  color:#8CA7B1;font-size:10.5px;font-weight:600;letter-spacing:.095em;text-transform:uppercase}
.post-h .st{margin-left:auto;font-size:10px;letter-spacing:.03em;padding:2px 8px;border-radius:20px;
  background:rgba(52,180,137,.17);color:#4FD0A6;text-transform:none;font-weight:500}
.post-h .st.bad{background:rgba(226,129,112,.17);color:#F0A18C}
.post table{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11.5px;
  font-variant-numeric:tabular-nums;letter-spacing:-.012em}
.post thead th{padding:8px 17px;color:#547079;font-size:9.5px;letter-spacing:.095em;text-transform:uppercase;
  font-weight:500;text-align:right;border-bottom:1px solid var(--post-line)}
.post thead th:first-child{text-align:left}
.post td{padding:8px 17px;color:#C3D6DD;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:top}
.post td .ac{color:#7A959F;font-size:10px;display:block;margin-top:3px;font-family:var(--sans);letter-spacing:0}
.post td.d{text-align:right;color:#4FD0A6;white-space:nowrap}
.post td.c{text-align:right;color:#F0A18C;white-space:nowrap}
.post .gut{box-shadow:inset 1px 0 0 rgba(214,171,87,.45)}
.post tfoot td{border-top:1px solid rgba(214,171,87,.45);border-bottom:none;color:#fff;padding-top:11px}
.explain{font-size:12.5px;color:var(--ink-2);line-height:1.66}
.explain li{margin-bottom:8px} .explain li:last-child{margin-bottom:0}
.explain b{font-weight:600;color:var(--ink)}

/* ---------------------------------------------------------------- charts */
.chart-legend{display:flex;gap:17px;flex-wrap:wrap;font-size:12px;color:var(--ink-2)}
.chart-legend span{display:inline-flex;align-items:center;gap:7px}
.chart-legend i{width:9px;height:9px;border-radius:3px;display:block}
.tip{position:absolute;pointer-events:none;background:var(--nav-900);color:#fff;border-radius:var(--r-s);
  padding:10px 12px;font-size:12px;box-shadow:var(--sh-3);z-index:5;white-space:nowrap;
  transform:translate(-50%,-118%);border:1px solid rgba(255,255,255,.09)}
.tip .tk{color:#8CA7B1;font-size:10.5px;letter-spacing:.055em;text-transform:uppercase;margin-bottom:6px}
.tip .tr{display:flex;align-items:center;gap:9px;margin-top:4px}
.tip .tr i{width:7px;height:7px;border-radius:2px}
.tip .tr b{margin-left:auto;font-family:var(--mono);font-variant-numeric:tabular-nums;font-weight:500;padding-left:16px}
.draw{stroke-dasharray:2600;stroke-dashoffset:2600;animation:draw 1.15s var(--ease) forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.fadein{opacity:0;animation:fadein .8s var(--ease) .25s forwards}
@keyframes fadein{to{opacity:1}}
.bars{display:flex;flex-direction:column;gap:12px}
.bar-row{display:flex;align-items:center;gap:13px;font-size:12.5px}
.bar-row .bk{width:66px;color:var(--ink-2);flex:0 0 66px;font-weight:500}
.bar-row .bt{flex:1;height:9px;border-radius:20px;background:var(--surface-3);overflow:hidden}
.bar-row .bt i{display:block;height:100%;border-radius:20px;transform-origin:left;animation:grow .75s var(--ease) forwards}
@keyframes grow{from{transform:scaleX(0)}to{transform:none}}
.bar-row .bv{width:98px;text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums;flex:0 0 98px}

/* ---------------------------------------------------------------- overlays */
.scrim{position:fixed;inset:0;background:rgba(6,15,18,.56);backdrop-filter:blur(3px);z-index:60;
  display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto;
  animation:fade .16s ease-out}
@keyframes fade{from{opacity:0}to{opacity:1}}
.cmdk{width:100%;max-width:576px;margin-top:8vh;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-l);box-shadow:var(--sh-3);overflow:hidden;animation:popIn .16s var(--ease)}
.cmdk-in{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line-2)}
.cmdk-in input{flex:1;border:none;outline:none;font-size:15px;background:none}
.cmdk-list{max-height:min(392px,52vh);overflow-y:auto;padding:8px}
.cmdk-item{display:flex;align-items:center;gap:12px;width:100%;padding:9px 12px;border-radius:var(--r-s);
  text-align:left;font-size:13.5px;color:var(--ink-2)}
.cmdk-item.on{background:var(--brand-50);color:var(--ink)}
.cmdk-item .kind{margin-left:auto;font-size:10.5px;color:var(--ink-4);font-family:var(--mono)}
.cmdk-foot{padding:10px 16px;border-top:1px solid var(--line-2);background:var(--surface-2);
  font-size:11px;color:var(--ink-3);display:flex;gap:15px}
.cmdk-foot kbd{font-family:var(--mono);font-size:10px;border:1px solid var(--line);border-bottom-width:2px;
  border-radius:4px;padding:0 4px;background:var(--surface)}

.toasts{position:fixed;right:22px;bottom:22px;z-index:80;display:flex;flex-direction:column;gap:10px}
.toast{display:flex;align-items:center;gap:12px;background:var(--nav-900);color:#E7EFF2;padding:13px 16px;
  border-radius:var(--r);box-shadow:var(--sh-3);font-size:13px;min-width:258px;
  border:1px solid rgba(255,255,255,.09);animation:slide .22s var(--ease)}
@keyframes slide{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
.toast .tico{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;flex:0 0 22px;
  background:rgba(79,208,166,.19);color:#4FD0A6}
.toast.warn .tico{background:rgba(240,161,140,.19);color:#F0A18C}

/* ---------------------------------------------------------------- print */
.sheet{background:#fff;color:#08191F;max-width:860px;margin:0 auto;border-radius:var(--r-l);
  box-shadow:var(--sh-3);overflow:hidden}
.sheet-crest{background:linear-gradient(135deg,#0B4133 0%,#0E5C4A 48%,#12705B 100%);color:#fff;
  padding:30px 46px 26px;position:relative;overflow:hidden}
.sheet-crest::after{content:"";position:absolute;right:-70px;top:-90px;width:280px;height:280px;border-radius:50%;
  background:radial-gradient(circle,rgba(214,171,87,.28),transparent 62%)}
.sheet-crest .rowtop{display:flex;align-items:flex-start;gap:26px;position:relative;z-index:1;flex-wrap:wrap}
.sheet-crest h1{font-size:25px;font-weight:600;letter-spacing:-.03em;color:#fff}
.sheet-crest .sub{font-size:12px;color:rgba(255,255,255,.72);margin-top:6px;line-height:1.6}
.sheet-crest .doc{margin-left:auto;text-align:right}
.sheet-crest .doc .no{font-family:var(--mono);font-size:17px;letter-spacing:-.02em;color:#F2D79B}
.sheet-crest .doc .dt{font-size:11.5px;color:rgba(255,255,255,.72);margin-top:6px;line-height:1.75}
.sheet-crest .badge{display:inline-block;font-size:9.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);padding:4px 10px;border-radius:20px;margin-bottom:12px}
.sheet-logo{max-height:46px;max-width:180px;object-fit:contain;display:block;margin-bottom:13px;
  background:#fff;border-radius:6px;padding:5px}
.sheet-body{padding:30px 46px 44px}
.sheet-parties{display:flex;gap:30px;flex-wrap:wrap;padding-bottom:24px;border-bottom:1px solid #E1E9ED}
.sheet-parties .blk{flex:1 1 190px;min-width:0}
.sheet-parties .lb{font-size:9.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#8CA0AA}
.sheet-parties .nm{font-weight:600;margin-top:7px;font-size:14px}
.sheet-parties .ad{font-size:12px;color:#5A737F;margin-top:4px;line-height:1.55}
.sheet-parties .trn{font-family:var(--mono);font-size:11.5px;margin-top:7px;color:#0E5C4A}
.sheet table.tbl th{background:#F2F6F7;color:#5A737F;border-bottom:1px solid #DFE8EC}
.sheet table.tbl td{border-bottom:1px solid #EDF2F4;color:#08191F}
.sheet .totbox{background:#F5F9F8;border:1px solid #DCEAE5;border-radius:var(--r);padding:16px 18px}
.sheet .totbox .sumrow .k{color:#5A737F}
.sheet .totbox .grand{display:flex;align-items:baseline;gap:12px;margin-top:12px;padding-top:13px;border-top:1px solid #CBE0D9}
.sheet .totbox .grand b{font-size:12px;font-weight:600;color:#0E5C4A;letter-spacing:.02em}
.sheet .totbox .grand span{margin-left:auto;font-family:var(--mono);font-size:23px;font-weight:600;letter-spacing:-.03em;color:#0B4133}
.sheet .payblk{background:#FAFBFC;border:1px solid #E7EEF0;border-radius:var(--r);padding:14px 16px;font-size:11.5px;color:#5A737F;line-height:1.7}
.sheet .foot{margin-top:30px;padding-top:18px;border-top:1px solid #E1E9ED;display:flex;gap:26px;flex-wrap:wrap;
  font-size:10.5px;color:#8CA0AA;line-height:1.6}
.sendbar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:14px;flex-wrap:wrap}
.wa{background:#1FA855;border-color:#1FA855;color:#fff}
.wa:hover{background:#18904699;background:#189046;border-color:#189046;color:#fff}
.rule{height:1px;background:var(--line);margin:22px 0}
@media print{
  .side,.topbar,.noprint,.page-head .acts{display:none!important}
  .mz,.page{display:block;height:auto;overflow:visible;background:#fff;padding:0}
  .page-head{position:static;padding:0 0 14px}
  .scrim{position:static;background:none;padding:0;display:block;backdrop-filter:none}
  .sheet,.card{box-shadow:none;border:none;max-width:none;break-inside:avoid}
  .rframe-h{border-bottom:2px solid #0E5C4A!important;padding-left:0!important;padding-right:0!important}
  .tbl tbody tr{break-inside:avoid}
  @page{margin:14mm}
}
@media (prefers-reduced-motion:reduce){.mz *,.mz *::before,.mz *::after{
  animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}

/* ---------------------------------------------------------------- range picker */
.rangepop{position:fixed;z-index:901;display:flex;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r);box-shadow:var(--sh-3);overflow:hidden;animation:popIn .15s var(--ease)}
.rp-presets{width:172px;padding:7px;border-right:1px solid var(--line-2);background:var(--surface-2)}
.rp-item{display:block;width:100%;text-align:left;padding:7px 11px;border-radius:var(--r-xs);font-size:13px;
  color:var(--ink-2);transition:background .12s,color .12s;white-space:nowrap}
.rp-item:hover{background:var(--surface-3);color:var(--ink)}
.rp-item.on{background:var(--brand);color:#fff;font-weight:500}
.rp-custom{padding:15px 16px;width:228px}

/* ---------------------------------------------------------------- density */
.mz[data-density="compact"] .tbl td{padding:7px 15px}
.mz[data-density="compact"] .tbl th{padding:7px 15px}
.mz[data-density="compact"] .tbl tfoot td{padding:9px 15px}
.mz[data-density="compact"] .card-b{padding:15px}
.mz[data-density="compact"] .who-cell span{display:none}
.mz[data-density="compact"] .av{width:23px;height:23px;flex-basis:23px;border-radius:7px;font-size:9.5px}
.mz[data-density="compact"] .grid{gap:12px}

/* ---------------------------------------------------------------- gradient tiles */
.gt{width:40px;height:40px;border-radius:12px;flex:0 0 40px;display:grid;place-items:center;color:#fff;
  box-shadow:0 6px 16px rgba(0,0,0,.22)}
.gt.sm{width:34px;height:34px;flex-basis:34px;border-radius:10px}
.gt.g1{background:linear-gradient(135deg,#4F7CFF,#3358E8)}
.gt.g2{background:linear-gradient(135deg,#B14BE8,#EC4899)}
.gt.g3{background:linear-gradient(135deg,#12B981,#0E9F72)}
.gt.g4{background:linear-gradient(135deg,#22D3EE,#2B9BF0)}
.gt.g5{background:linear-gradient(135deg,#F5B544,#F0832A)}
.gt.g6{background:linear-gradient(135deg,#9061F9,#6D46E0)}
.gt.g7{background:linear-gradient(135deg,#F65F7B,#D93A5C)}

/* ---------------------------------------------------------------- greeting */
.hero{position:relative;overflow:hidden;border-radius:var(--r-l);border:1px solid var(--line);
  background:var(--surface);padding:22px 26px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px}
.mz[data-theme="dark"] .hero{background:linear-gradient(120deg,rgba(79,124,255,.2),rgba(144,97,249,.16) 45%,rgba(236,72,153,.1));border-color:rgba(255,255,255,.1)}
.hero::after{content:"";position:absolute;right:-90px;top:-120px;width:340px;height:340px;border-radius:50%;
  background:radial-gradient(circle,rgba(144,97,249,.26),transparent 65%);pointer-events:none}
.hero-wave{position:absolute;right:0;top:0;height:100%;width:min(62%,660px);pointer-events:none;
  opacity:.95;mask-image:linear-gradient(90deg,transparent,#000 22%)}
@media (max-width:900px){.hero-wave{display:none}}
.hero .sun{width:46px;height:46px;border-radius:14px;flex:0 0 46px;display:grid;place-items:center;
  background:linear-gradient(135deg,#F5B544,#F0722A);color:#fff;box-shadow:0 8px 22px rgba(240,114,42,.34)}
.hero h1{font-size:24px;font-weight:600;letter-spacing:-.03em}
.hero p{color:var(--ink-3);font-size:13px;margin-top:5px}
.hero .hact{margin-left:auto;display:flex;gap:9px;align-items:center;position:relative;z-index:1;flex-wrap:wrap}

/* ---------------------------------------------------------------- kpi */
.kpi{position:relative;overflow:hidden;padding:17px 19px 0}
.kpi .kh{display:flex;align-items:flex-start;gap:12px}
.kpi .kl{font-size:12.5px;color:var(--ink-3);font-weight:500}
.kpi .kv{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:25px;font-weight:600;
  letter-spacing:-.035em;margin-top:9px;line-height:1.1}
.kpi .kd{display:flex;align-items:center;gap:7px;margin-top:8px;font-size:11.5px;color:var(--ink-3)}
.kpi .kspark{margin:12px -19px 0;display:block;width:calc(100% + 38px)}

/* ---------------------------------------------------------------- feed */
.feed-row{display:flex;gap:13px;padding:13px 0;border-bottom:1px solid var(--line-2)}
.feed-row:last-child{border-bottom:none;padding-bottom:0}
.feed-row .fx{flex:1;min-width:0}
.feed-row .fx b{display:block;font-size:13px;font-weight:500;letter-spacing:-.01em}
.feed-row .fx span{display:block;font-size:11.5px;color:var(--ink-3);margin-top:3px}
.feed-row .fr{text-align:right;flex:0 0 auto}
.feed-row .fr b{display:block;font-family:var(--mono);font-size:12.5px;font-variant-numeric:tabular-nums}
.feed-row .fr span{display:block;font-size:10.5px;color:var(--ink-4);margin-top:3px}

/* ---------------------------------------------------------------- quick actions */
.qa{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.qa button{display:flex;flex-direction:column;align-items:center;gap:9px;padding:14px 8px;border-radius:var(--r);
  border:1px solid var(--line);background:var(--surface-2);font-size:11.5px;font-weight:500;color:var(--ink-2);
  text-align:center;line-height:1.3;transition:border-color .15s,background .15s,transform .12s}
.qa button:hover{border-color:var(--brand);background:var(--brand-50);color:var(--ink);transform:translateY(-2px)}

/* ---------------------------------------------------------------- upcoming */
.up-row{display:flex;gap:13px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line-2)}
.up-row:last-child{border-bottom:none;padding-bottom:0}
.up-row .cal{width:48px;height:48px;border-radius:13px;flex:0 0 48px;display:grid;place-items:center;
  text-align:center;line-height:1.05;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.22)}
.up-row .cal b{display:block;font-size:17px;font-weight:700;letter-spacing:-.02em}
.up-row .cal span{display:block;font-size:9px;font-weight:600;color:rgba(255,255,255,.82);
  text-transform:uppercase;letter-spacing:.1em;margin-top:1px}
.up-row.soon .cal{background:linear-gradient(140deg,#F65F7B,#D93A5C)}
.up-row .ux b{display:block;font-size:13px;font-weight:500}
.up-row .ux span{display:block;font-size:11.5px;color:var(--ink-3);margin-top:3px}

/* ---------------------------------------------------------------- banner */
.banner{margin-top:16px;border-radius:var(--r-l);border:1px solid var(--line);background:var(--surface);
  padding:18px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;position:relative;overflow:hidden}
.mz[data-theme="dark"] .banner{background:linear-gradient(110deg,rgba(79,124,255,.22),rgba(144,97,249,.16) 55%,rgba(34,211,238,.1));border-color:rgba(255,255,255,.1)}
.banner b{display:block;font-size:15px;font-weight:600;letter-spacing:-.02em}
.banner p{color:var(--ink-3);font-size:12.5px;margin-top:4px}

/* ---------------------------------------------------------------- topbar cluster */
.bell{position:relative}
.bell .dot{position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:9px;padding:0 4px;
  background:linear-gradient(135deg,#F65F7B,#D93A5C);color:#fff;font-size:9.5px;font-weight:700;
  display:grid;place-items:center;border:2px solid var(--surface)}
.coswitch{display:flex;align-items:center;gap:10px;height:42px;padding:0 12px;border-radius:var(--r);
  border:1px solid var(--line);background:var(--surface-2);transition:border-color .15s,background .15s}
.coswitch:hover{border-color:var(--brand);background:var(--surface)}
.coswitch .cx{text-align:left;min-width:0}
.coswitch .cx b{display:block;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:148px}
.coswitch .cx span{display:block;font-size:10px;color:var(--ink-3)}
.userchip{display:flex;align-items:center;gap:10px;height:42px;padding:0 10px 0 4px;border-radius:22px;
  border:1px solid transparent;transition:background .15s,border-color .15s}
.userchip:hover{background:var(--surface-2);border-color:var(--line)}
.userchip .ux{text-align:left}
.userchip .ux b{display:block;font-size:12.5px;font-weight:600}
.userchip .ux span{display:block;font-size:10.5px;color:var(--ink-3)}

/* ---------------------------------------------------------------- sidebar dark polish */
.nav-item.on{background:linear-gradient(120deg,#4F7CFF,#6D46E0)!important;color:#fff!important;
  box-shadow:0 8px 20px rgba(79,124,255,.3)}
.nav-item.on::before{display:none}
.nav-item.on svg{color:#fff!important}
.nav-item.on .ct{background:rgba(255,255,255,.22);color:#fff}
.logo{background:linear-gradient(135deg,#4F7CFF,#9061F9)}
.me{background:linear-gradient(135deg,#4F7CFF,#9061F9)}
.co-card .av{background:linear-gradient(148deg,#4F7CFF,#9061F9);color:#fff}
.sysline{display:flex;align-items:center;gap:8px;padding:11px 17px;font-size:11px;color:var(--nav-sub);
  border-top:1px solid var(--nav-edge)}
.sysline i{width:7px;height:7px;border-radius:50%;background:#22C58B;box-shadow:0 0 8px rgba(34,197,139,.8)}
.sysline .v{margin-left:auto;font-family:var(--mono);font-size:10.5px}
.side.mini .sysline .txt,.side.mini .sysline .v{display:none}
.side.mini .sysline{justify-content:center;padding:11px 0}

/* ---------------------------------------------------------------- dashboard rail */
.dash{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
.dash-rail{display:flex;flex-direction:column;gap:16px;position:sticky;top:96px}
@media (max-width:1340px){.dash{grid-template-columns:minmax(0,1fr)}.dash-rail{position:static}}

/* ---------------------------------------------------------------- pick cards */
.picks{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px}
.pick{display:flex;align-items:flex-start;gap:12px;padding:14px 15px;border:1.5px solid var(--line);
  border-radius:var(--r);background:var(--surface);text-align:left;width:100%;
  transition:border-color .15s,background .15s,box-shadow .15s}
.pick:hover{border-color:var(--ink-4);background:var(--surface-2)}
.pick.on{border-color:var(--brand);background:var(--brand-50);box-shadow:var(--ring)}
.pick .pi{width:34px;height:34px;border-radius:10px;flex:0 0 34px;display:grid;place-items:center;
  background:var(--surface-3);color:var(--ink-3);transition:background .15s,color .15s}
.pick.on .pi{background:var(--brand);color:#fff}
.pick .pt{flex:1;min-width:0}
.pick .pt b{display:block;font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.pick .pt span{display:block;font-size:12px;color:var(--ink-3);margin-top:4px;line-height:1.5}
.pick .chk{flex:0 0 18px;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line);
  display:grid;place-items:center;margin-top:2px}
.pick.on .chk{border-color:var(--brand);background:var(--brand);color:#fff}

/* ---------------------------------------------------------------- attention */
.att{border-color:var(--line)}
.att-h{display:flex;align-items:center;gap:11px;padding:15px 19px;border-bottom:1px solid var(--line-2)}
.att-h .n{margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--ink-3)}
.att-row{display:flex;align-items:center;gap:14px;padding:13px 19px;border-bottom:1px solid var(--line-2);
  transition:background .13s}
.att-row:last-child{border-bottom:none}
.att-row:hover{background:var(--surface-2)}
.att-row .ico{width:32px;height:32px;border-radius:10px;flex:0 0 32px;display:grid;place-items:center}
.att-row .ico.bad{background:var(--neg-50);color:var(--neg)}
.att-row .ico.warn{background:var(--warn-50);color:var(--warn)}
.att-row .ico.info{background:var(--info-50);color:var(--info)}
.att-row .ico.ok{background:var(--pos-50);color:var(--pos)}
.att-row .tx{flex:1;min-width:0}
.att-row .tx b{display:block;font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.att-row .tx span{display:block;font-size:12.5px;color:var(--ink-3);margin-top:3px;line-height:1.5}
.att-clear{display:flex;align-items:center;gap:13px;padding:26px 19px;color:var(--ink-3);font-size:13px}
.att-clear .ico{width:38px;height:38px;border-radius:12px;flex:0 0 38px;display:grid;place-items:center;
  background:var(--pos-50);color:var(--pos)}

/* ---------------------------------------------------------------- timeline */
.tl{padding:4px 0}
.tl-row{display:flex;gap:13px;position:relative;padding-bottom:16px}
.tl-row:last-child{padding-bottom:0}
.tl-row .dot{flex:0 0 20px;position:relative}
.tl-row .dot i{display:block;width:11px;height:11px;border-radius:50%;margin:3px 0 0 4px;
  background:var(--surface);border:2px solid var(--line)}
.tl-row.done .dot i{background:var(--brand);border-color:var(--brand)}
.tl-row:not(:last-child) .dot::after{content:"";position:absolute;left:9px;top:17px;bottom:-3px;width:1px;background:var(--line)}
.tl-row .tt{flex:1;min-width:0}
.tl-row .tt b{display:block;font-size:13px;font-weight:500}
.tl-row .tt span{display:block;font-size:11.5px;color:var(--ink-3);margin-top:2px}
.tl-row.pending .tt b{color:var(--ink-3);font-weight:400}

/* ---------------------------------------------------------------- new menu */
.newpop{position:fixed;z-index:901;width:250px;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r);box-shadow:var(--sh-3);overflow:hidden;animation:popIn .15s var(--ease);padding:6px}
.newpop .gl{font-size:9.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-4);
  padding:9px 11px 5px}
.newpop button{display:flex;align-items:center;gap:11px;width:100%;padding:9px 11px;border-radius:var(--r-s);
  font-size:13.5px;color:var(--ink-2);text-align:left;transition:background .12s,color .12s}
.newpop button:hover{background:var(--brand-50);color:var(--ink)}

/* ---------------------------------------------------------------- rank list */
.rank{display:flex;flex-direction:column}
.rank-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-2)}
.rank-row:last-child{border-bottom:none}
.rank-row .rn{width:16px;font-family:var(--mono);font-size:11px;color:var(--ink-4);flex:0 0 16px}
.rank-row .rl{flex:1;min-width:0}
.rank-row .rl b{display:block;font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rank-row .rb{height:5px;border-radius:20px;background:var(--surface-3);margin-top:7px;overflow:hidden}
.rank-row .rb i{display:block;height:100%;border-radius:20px;transform-origin:left;animation:grow .8s var(--ease) forwards}
.rank-row .rv{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:12.5px;white-space:nowrap}
.rank-row .rv span{display:block;font-size:11px;color:var(--ink-4);margin-top:4px;font-family:var(--sans)}
.wcbar{display:flex;height:10px;border-radius:20px;overflow:hidden;background:var(--surface-3);margin:4px 0 2px}
.wcbar i{display:block;height:100%;transform-origin:left;animation:grow .8s var(--ease) forwards}

/* ---------------------------------------------------------------- logo */
.logodrop{display:flex;align-items:center;gap:16px;padding:15px;border:1px dashed var(--line);
  border-radius:var(--r);background:var(--surface-2)}
.logobox{width:78px;height:78px;flex:0 0 78px;border-radius:var(--r);background:var(--surface);
  border:1px solid var(--line);display:grid;place-items:center;overflow:hidden;color:var(--ink-4)}
.logobox img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.co-card .logoimg{width:29px;height:29px;flex:0 0 29px;border-radius:8px;background:#fff;object-fit:contain;padding:2px}
.sheet-logo{max-height:56px;max-width:190px;object-fit:contain;display:block;margin-bottom:12px}

/* ---------------------------------------------------------------- settings */
.setsec{padding:19px}
.setsec + .setsec{border-top:1px solid var(--line-2)}
.setgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(212px,1fr));gap:15px}
.setrow{display:flex;align-items:center;gap:16px;padding:13px 0;border-bottom:1px solid var(--line-2)}
.setrow:last-child{border-bottom:none;padding-bottom:0}
.setrow:first-child{padding-top:0}
.setrow .st{flex:1;min-width:0}
.setrow .st b{display:block;font-size:13.5px;font-weight:500}
.setrow .st span{display:block;font-size:12px;color:var(--ink-3);margin-top:3px}
.savebar{position:sticky;bottom:0;display:flex;align-items:center;gap:12px;padding:13px 19px;
  background:var(--surface-2);border-top:1px solid var(--line);border-radius:0 0 var(--r-l) var(--r-l);
  font-size:12.5px;color:var(--ink-3)}

/* ---------------------------------------------------------------- responsive */
@media (max-width:1024px){ .side{width:68px;flex-basis:68px}
  .side .wordmark,.side .co-card,.side .nav-group,.side .nav-item .lbl,.side .nav-item .ct,.side .side-foot .who{display:none}
  .side .side-top{justify-content:center;padding:17px 0 15px}
  .side .nav-item{justify-content:center;padding:9px 0;margin:2px 12px}
  .side .side-foot{padding:13px 0;justify-content:center} }
@media (max-width:900px){
  /* Off-canvas navigation instead of a squeezed rail */
  .mz{flex-direction:row}
  .side{position:fixed;top:0;left:0;bottom:0;width:284px;flex-basis:284px;z-index:950;
    transform:translateX(-101%);transition:transform .26s var(--ease);flex-direction:column;
    overflow-y:auto;border-right:1px solid var(--nav-edge)}
  .side.open{transform:none;box-shadow:var(--sh-3)}
  .side .wordmark,.side .co-card,.side .nav-group,.side .nav-item .lbl,
  .side .nav-item .ct,.side .side-foot .who,.side .sysline .txt,.side .sysline .v{display:revert}
  .side .side-top{justify-content:flex-start;padding:16px 17px 13px}
  .side .nav-item{width:calc(100% - 24px);justify-content:flex-start;padding:11px 12px;margin:1px 12px}
  .side .nav-group{display:flex}
  .side .side-foot{display:flex;padding:13px 15px;justify-content:flex-start}
  .side .sysline{display:flex;padding:11px 17px}
  .side-scrim{position:fixed;inset:0;background:rgba(4,8,26,.62);backdrop-filter:blur(2px);z-index:940;
    animation:fade .18s ease-out}
  .burger{display:grid!important}

  /* Compact bar: menu, page title, search, alerts, you */
  .topbar{display:flex;height:60px;flex:0 0 60px;align-items:center;gap:8px;padding:0 12px}
  .tb-l{flex:1;min-width:0;gap:8px}
  .crumb,.tb-l .chip,.tb-div,.coswitch,.userchip .ux{display:none}
  .tb-title{display:block;font-size:15px;font-weight:600;letter-spacing:-.02em;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .omni{width:42px;flex:0 0 42px;height:42px;padding:0;justify-content:center;border-radius:21px}
  .omni .ot,.omni kbd{display:none}
  .tb-r{gap:6px;flex:0 0 auto}
  .tb-icons{background:none;border:none;padding:0;gap:0}
  .tb-icons .icon-btn:nth-child(2){display:none}
  .userchip{padding:0}

  /* Content */
  .page{padding:0 12px 90px}
  .page-head{padding:14px 0 12px;gap:12px}
  .page-head h1{font-size:21px}
  .page-head p{font-size:12.5px}
  .page-head .acts{margin-left:0;width:100%}
  .page-head .acts .btn,.hero .hact .btn{flex:1;justify-content:center}
  .grid{grid-template-columns:1fr!important}
  .hero{padding:18px 18px;gap:14px}
  .hero h1{font-size:20px} .hero .hact{margin-left:0;width:100%}
  .card{border-radius:12px}
  .card-h{padding:14px 15px;flex-wrap:wrap}
  .card-h .r{margin-left:auto;width:auto}
  .card-b,.setsec{padding:15px}
  .toolbar{padding:11px 13px;gap:8px}
  .srch{min-width:0!important;width:100%}
  .seg{width:100%} .seg button{flex:1}
  .sumbox{width:100%;flex:1 1 auto;border-left:none;border-top:1px solid var(--line-2)}
  .qa{grid-template-columns:repeat(2,1fr)}
  .dash-rail{position:static}

  /* Tables scroll sideways with a hint that there is more */
  .tbl-wrap{-webkit-overflow-scrolling:touch;
    background:linear-gradient(90deg,var(--surface) 30%,transparent),
      linear-gradient(90deg,transparent,var(--surface) 70%) 100% 0,
      radial-gradient(farthest-side at 0 50%,rgba(0,0,0,.14),transparent),
      radial-gradient(farthest-side at 100% 50%,rgba(0,0,0,.14),transparent) 100% 0;
    background-repeat:no-repeat;background-size:36px 100%,36px 100%,14px 100%,14px 100%;
    background-attachment:local,local,scroll,scroll}
  .tbl td,.tbl th{padding:10px 12px}

  /* Sheets and dialogs go full width */
  .scrim{padding:0;align-items:stretch}
  .cmdk{max-width:none;margin-top:0;border-radius:0;min-height:100%}
  .cmdk-list{max-height:none}
  .rangepop{flex-direction:column;width:calc(100vw - 24px);left:12px!important;max-height:76vh;overflow-y:auto}
  .rp-presets{width:100%;border-right:none;border-bottom:1px solid var(--line-2);
    display:grid;grid-template-columns:1fr 1fr}
  .rp-custom{width:100%}
  .pop,.newpop{width:calc(100vw - 24px);right:12px!important;left:auto!important}
  .sheet{padding:0;border-radius:0}
  .sheet-crest{padding:22px 18px} .sheet-body{padding:20px 18px 32px}
  .sheet-crest .doc{margin-left:0;text-align:left;margin-top:14px}
  .sendbar{padding:10px 12px;margin:0;position:sticky;top:0;background:var(--bg);z-index:2}
  .sendbar .btn{flex:1;min-width:44%}
  .toasts{left:12px;right:12px;bottom:12px}
  .toast{min-width:0}

  /* Comfortable touch targets */
  .btn{height:40px;padding:0 15px}
  .btn.sm{height:34px}
  .icon-btn{width:40px;height:40px}
  .inp,.readonly{height:42px}
  .nav-item{font-size:14.5px}
}
@media (max-width:520px){
  .page-head .acts{flex-direction:column;align-items:stretch}
  .page-head .acts > *{width:100%}
  .qa{grid-template-columns:repeat(2,1fr)}
  .kpi .kv{font-size:22px}
  .picks{grid-template-columns:1fr}
}
@media (min-width:901px){.burger,.tb-title,.side-scrim{display:none}}
`;


/* ========================================================================== */
/*  PRIMITIVES                                                                */
/* ========================================================================== */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULLM = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const cx = (...a) => a.filter(Boolean).join(" ");

/* Accept a full-resolution logo and shrink it, rather than refusing the upload.
   A 5 MB photo comes out around 40 KB, which keeps local storage healthy. */
function prepareLogo(file, cb, onError) {
  const MAX_BYTES = 5 * 1024 * 1024, MAX_EDGE = 640;
  if (file.size > MAX_BYTES) { onError(`That file is ${(file.size / 1048576).toFixed(1)} MB — the limit is 5 MB`); return; }
  const reader = new FileReader();
  reader.onerror = () => onError("That image could not be read");
  reader.onload = () => {
    const raw = String(reader.result);
    if (/^data:image\/svg/i.test(raw)) { cb(raw, file.size, file.size); return; }   // vectors need no resizing
    const img = new window.Image();
    img.onerror = () => cb(raw, file.size, file.size);
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width || 1, img.height || 1));
        if (scale >= 1 && file.size < 220 * 1024) { cb(raw, file.size, file.size); return; }
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round((img.width || MAX_EDGE) * scale));
        cv.height = Math.max(1, Math.round((img.height || MAX_EDGE) * scale));
        const ctx = cv.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        let out = cv.toDataURL("image/png");
        if (out.length > 300 * 1024) out = cv.toDataURL("image/jpeg", 0.86);
        cb(out, file.size, Math.round(out.length * 0.75));
      } catch (e) { cb(raw, file.size, file.size); }
    };
    img.src = raw;
  };
  reader.readAsDataURL(file);
}

/* Browsers ignore a click on a detached anchor, and revoking the object URL
   in the same tick cancels the transfer. Both are silent failures, so every
   download in the app goes through here. */
function saveBlob(blob, filename) {
  try {
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename); return true;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 5000);
    return true;
  } catch (e) { return false; }
}
const saveText = (text, filename, mime) =>
  saveBlob(new Blob([text], { type: mime || "text/plain;charset=utf-8" }), filename);

const PRESETS = [
  ["today", "Today", () => [TODAY, TODAY]],
  ["yesterday", "Yesterday", () => [addDays(TODAY, -1), addDays(TODAY, -1)]],
  ["d7", "Last 7 days", () => [addDays(TODAY, -6), TODAY]],
  ["d30", "Last 30 days", () => [addDays(TODAY, -29), TODAY]],
  ["mtd", "This month", () => [som(TODAY), TODAY]],
  ["lastm", "Last month", () => { const p = addMonths(som(TODAY), -1); return [p, eom(p)]; }],
  ["qtd", "This quarter", () => [soq(TODAY), TODAY]],
  ["lastq", "Last quarter", () => { const p = addMonths(soq(TODAY), -3); return [p, eoq(p)]; }],
  ["ytd", "Year to date", () => [TODAY.slice(0, 4) + "-01-01", TODAY]],
  ["d365", "Last 12 months", () => [addMonths(som(TODAY), -11), TODAY]],
  ["fy", "Full year " + TODAY.slice(0, 4), () => [TODAY.slice(0, 4) + "-01-01", TODAY.slice(0, 4) + "-12-31"]],
];
const presetLabel = (r) => {
  const p = PRESETS.find((x) => x[0] === r.preset);
  if (p) return p[1];
  return r.from === r.to ? dmy(r.from) : `${dmy(r.from)} — ${dmy(r.to)}`;
};
const rangeDays = (r) => daysBetween(r.from, r.to) + 1;

function RangePicker({ value, onChange, align = "right" }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState({ top: 0, left: 0 });
  const btnRef = React.useRef(null);
  const [d, setD] = useState({ from: value.from, to: value.to });
  React.useEffect(() => { if (open) setD({ from: value.from, to: value.to }); }, [open]);
  const toggle = () => {
    const el = btnRef.current;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      const w = 402, vw = window.innerWidth || 1280;
      setAt({ top: Math.round(r.bottom + 6), left: Math.round(Math.min(Math.max(8, r.right - w), vw - w - 8)) });
    }
    setOpen((v) => !v);
  };
  const pick = (key, fn) => { const [f, t] = fn(); onChange({ preset: key, from: f, to: t }); setOpen(false); };
  const applyCustom = () => {
    const f = d.from <= d.to ? d.from : d.to, t = d.from <= d.to ? d.to : d.from;
    onChange({ preset: "custom", from: f, to: t }); setOpen(false);
  };
  return (
    <div style={{ position: "relative" }} className="noprint">
      <button className="btn" ref={btnRef} onClick={toggle}>
        <Calendar size={14} strokeWidth={1.9} />{presetLabel(value)}
        <ChevronDown size={13} strokeWidth={2} style={{ opacity: .55, marginLeft: 1 }} />
      </button>
      {open && (<>
        <div className="pop-scrim" onMouseDown={() => setOpen(false)} />
        <div className="rangepop" style={{ top: at.top, left: at.left }}>
          <div className="rp-presets">
            {PRESETS.map(([k, label, fn]) => (
              <button key={k} className={cx("rp-item", value.preset === k && "on")} onClick={() => pick(k, fn)}>{label}</button>))}
          </div>
          <div className="rp-custom">
            <div className="micro" style={{ marginBottom: 11 }}>Custom range</div>
            <Field label="From"><Input type="date" value={d.from} onChange={(e) => setD({ ...d, from: e.target.value })} /></Field>
            <div style={{ height: 10 }} />
            <Field label="To"><Input type="date" value={d.to} onChange={(e) => setD({ ...d, to: e.target.value })} /></Field>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Btn onClick={() => setOpen(false)}>Cancel</Btn>
              <Btn kind="pri" onClick={applyCustom} style={{ flex: 1 }}>Apply</Btn>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-3)" }}>
              {daysBetween(d.from, d.to) + 1} day{daysBetween(d.from, d.to) === 0 ? "" : "s"} selected
            </div>
          </div>
        </div></>)}
    </div>
  );
}

/* Chart buckets — daily, weekly or monthly across any range. */
function bucketize(from, to, gran) {
  const days = daysBetween(from, to) + 1;
  const g = gran === "auto" ? (days <= 45 ? "day" : days <= 200 ? "week" : "month") : gran;
  const out = [];
  if (g === "day") {
    for (let x = from; x <= to; x = addDays(x, 1))
      out.push({ from: x, to: x, label: `${+x.slice(8)} ${MONTHS[+x.slice(5, 7) - 1]}`, full: dmy(x) });
  } else if (g === "week") {
    for (let x = from; x <= to;) {
      const end = addDays(x, 6) > to ? to : addDays(x, 6);
      out.push({ from: x, to: end, label: `${+x.slice(8)} ${MONTHS[+x.slice(5, 7) - 1]}`, full: `${dmy(x)} — ${dmy(end)}` });
      x = addDays(end, 1);
    }
  } else {
    for (let x = som(from); x <= to; x = addMonths(x, 1)) {
      const end = eom(x) > to ? to : eom(x), start = x < from ? from : x;
      out.push({ from: start, to: end, label: MONTHS[+x.slice(5, 7) - 1], full: `${FULLM[+x.slice(5, 7) - 1]} ${x.slice(0, 4)}` });
    }
  }
  return { g, rows: out };
}

/* Chart colours can't read CSS variables from SVG presentation attributes,
   so the active palette travels through context instead. */
const PALETTE = {
  light: { c1: "#0E5C4A", c2: "#B0801F", c3: "#1D5DA4", pos: "#0C7A56", neg: "#AE3123",
    grid: "#DFE8EC", axis: "#668078", ring: "#FFFFFF" },
  dark:  { c1: "#2FA184", c2: "#D6AB57", c3: "#66A7E8", pos: "#34B489", neg: "#E28170",
    grid: "#22383F", axis: "#96B3A6", ring: "#111E23" },
};
const ThemeCtx = React.createContext(PALETTE.light);
const useC = () => React.useContext(ThemeCtx);
const CompanyCtx = React.createContext(COMPANY);
const useCo = () => React.useContext(CompanyCtx);

function useCountUp(target, ms = 750) {
  const [v, setV] = useState(target);
  const from = React.useRef(target);
  React.useEffect(() => {
    const still = !window.requestAnimationFrame ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (still) { from.current = target; setV(target); return; }
    const a = from.current, d = target - a, t0 = Date.now();
    let raf;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setV(a + d * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = window.requestAnimationFrame(step); else from.current = target;
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
const Switch = ({ on }) => <span className={cx("sw", on && "on")}><i /></span>;
const SortTh = ({ id, sort, setSort, className, style, children }) => (
  <th className={cx(className, "srt")} style={style}
    onClick={() => setSort((x) => ({ k: id, dir: x.k === id && x.dir === "asc" ? "desc" : "asc" }))}>
    <span className="thi">{children}<i className={cx("sarr", sort.k === id && "on", sort.k === id && sort.dir)} /></span>
  </th>
);
const sortRows = (rows, sort, get) => {
  if (!sort.k) return rows;
  const m = sort.dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const x = get(a, sort.k), y = get(b, sort.k);
    if (typeof x === "number" && typeof y === "number") return (x - y) * m;
    return String(x).localeCompare(String(y)) * m;
  });
};
const initials = (s) => s.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const AV_TONES = ["#0E5C4A", "#1F5FA6", "#A9741A", "#7A3E86", "#0D6E7A", "#A2452F"];
const toneFor = (s) => AV_TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_TONES.length];

const Btn = ({ kind, size, icon: Ic, children, ...p }) => (
  <button className={cx("btn", kind, size)} {...p}>{Ic && <Ic size={14} strokeWidth={1.9} />}{children}</button>
);
const Card = ({ title, sub, right, children, pad = true, style, className }) => (
  <div className={cx("card", className)} style={style}>
    {(title || right) && (
      <div className="card-h">
        <div>{title && <h3>{title}</h3>}{sub && <p>{sub}</p>}</div>
        {right && <div className="r">{right}</div>}
      </div>
    )}
    {pad ? <div className="card-b">{children}</div> : children}
  </div>
);
const Pill = ({ tone, dot, children }) => <span className={cx("pill", tone)}>{dot && <i />}{children}</span>;
const Avatar = ({ name, size = 28 }) => (
  <span className="av" style={{ width: size, height: size, flexBasis: size, background: toneFor(name) + "18", color: toneFor(name) }}>{initials(name)}</span>
);
const Party = ({ name, meta }) => (
  <div className="who-cell"><Avatar name={name} /><div style={{ minWidth: 0 }}><b>{name}</b>{meta && <span>{meta}</span>}</div></div>
);
const Field = ({ label, children, span }) => {
  const id=React.useId();
  return <div className="fld" style={span ? {gridColumn:`span ${span}`} : undefined}><label className="lb" htmlFor={id}>{label}</label>{React.Children.map(children,child=>React.isValidElement(child)&&[Input,Select,'input','select','textarea'].includes(child.type)?React.cloneElement(child,{id:child.props.id||id,'aria-label':child.props['aria-label']||label}):child)}</div>;
};
const Input = ({ n, ...p }) => <input className={cx("inp", n && "n")} {...p} />;
const Select = ({ children, ...p }) => <select className="inp" {...p}>{children}</select>;
const Money = ({ v, dash = true, tone, bold }) => (
  <span className="num" style={{ color: tone ? `var(--${tone})` : undefined, fontWeight: bold ? 600 : undefined }}>{money(v, dash)}</span>
);
const SearchBox = ({ value, onChange, placeholder, width }) => (
  <div className="srch" style={width ? { minWidth: width } : undefined}>
    <Search size={15} strokeWidth={1.9} style={{ color: "var(--ink-3)", flex: "0 0 15px" }} />
    <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    {value && <button className="icon-btn" style={{ width: 21, height: 21 }} onClick={() => onChange("")}
      aria-label="Clear search"><X size={13} /></button>}
  </div>
);
const hits = (q, ...parts) => !!searchScore(q, parts.filter(Boolean).join(" "));

const EmptyState = ({ icon: Ic = Inbox, title, children }) => (
  <div className="empty"><div className="eico"><Ic size={20} strokeWidth={1.6} /></div><b>{title}</b>{children}</div>
);
const PageHead = ({ eyebrow, title, sub, children }) => (
  <div className="page-head">
    <div>{eyebrow && <div className="micro" style={{ marginBottom: 7 }}>{eyebrow}</div>}
      <h1>{title}</h1>{sub && <p>{sub}</p>}</div>
    {children && <div className="acts">{children}</div>}
  </div>
);

/* --------------------------------------------------------------- charting */
const niceMax = (v) => { if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v))), r = v / e;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * e; };
const kfmt = (v) => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + "m"
  : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v));
let _gid = 0;
function smoothPath(pts) {
  if (!pts.length) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Sparkline({ data, color, w = 168, h = 46 }) {
  const C = useC();
  const col = color || C.c1;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, h - ((v - min) / (max - min || 1)) * (h - 6) - 3]);
  const id = useMemo(() => "sk" + ++_gid, []);
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={col} stopOpacity=".24" /><stop offset="1" stopColor={col} stopOpacity="0" />
      </linearGradient></defs>
      {pts.length>0&&<path d={`${smoothPath(pts)} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />}
      <path d={smoothPath(pts)} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AreaChart({ data, series, height = 250, labelEvery = 1 }) {
  const C = useC();
  const [hi, setHi] = useState(null);
  const gid = useMemo(() => "ac" + ++_gid, []);
  const W = 720, H = height, pad = { t: 16, r: 14, b: 30, l: 62 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const values=data.flatMap(d=>series.map(s=>d[s.key]||0));
  const low=Math.min(0,...values),high=Math.max(0,...values);
  const min=low<0?-niceMax(-low):0,max=high>0?niceMax(high):(min<0?0:1);
  const X = (i) => pad.l + (data.length < 2 ? iw / 2 : (i / (data.length - 1)) * iw);
  const Y = (v) => pad.t + ih - ((v-min) / (max-min)) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min+(max-min)*f);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    const i = Math.round(((f * W - pad.l) / iw) * (data.length - 1));
    setHi(i >= 0 && i < data.length ? i : null);
  };
  return (
    <div style={{ position: "relative" }} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={series.map(s=>s.name).join(' and ')+' trend'}>
        <defs>{series.map((s) => (
          <linearGradient key={s.key} id={gid + s.key} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s.color} stopOpacity={s.fill == null ? 0.2 : s.fill} />
            <stop offset="1" stopColor={s.color} stopOpacity="0" />
          </linearGradient>))}
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke={C.grid} strokeWidth="1" strokeDasharray={i ? "3 4" : ""} />
            <text x={pad.l - 10} y={Y(t) + 3.5} textAnchor="end" fontSize="10" fill={C.axis} fontFamily="Geist Mono, monospace">{kfmt(t)}</text>
          </g>))}
        {series.map((s) => {
          const pts = data.map((d, i) => [X(i), Y(d[s.key])]);
          if(!pts.length)return null;
          return (<g key={s.key}>
            <path className="fadein" d={`${smoothPath(pts)} L ${X(data.length - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`} fill={`url(#${gid + s.key})`} />
            <path className="draw" d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.length===1&&<circle cx={pts[0][0]} cy={pts[0][1]} r="4" fill={s.color}/>}
          </g>);
        })}
        {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1) ?
          <text key={i} x={X(i)} y={H - 9} textAnchor="middle" fontSize="10.5" fill={C.axis}>{d.label}</text> : null)}
        {hi != null && (<g>
          <line x1={X(hi)} x2={X(hi)} y1={pad.t} y2={pad.t + ih} stroke={C.axis} strokeWidth="1" />
          {series.map((s) => <circle key={s.key} cx={X(hi)} cy={Y(data[hi][s.key])} r="4.5" fill={C.ring} stroke={s.color} strokeWidth="2.4" />)}
        </g>)}
      </svg>
      {hi != null && (
        <div className="tip" style={{ left: `${(X(hi) / W) * 100}%`, top: `${(Math.min(...series.map((s) => Y(data[hi][s.key]))) / H) * 100}%` }}>
          <div className="tk">{data[hi].full || data[hi].label}</div>
          {series.map((s) => (<div className="tr" key={s.key}>
            <i style={{ background: s.color }} /><span>{s.name}</span><b>{money(data[hi][s.key], false)}</b></div>))}
        </div>)}
    </div>
  );
}

function Donut({ slices, caption, sub, size = 190 }) {
  const [hi, setHi] = useState(null);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = size / 2, r = R - 15, ri = r - 26;
  let a0 = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const a1 = a0 + (s.value / total) * Math.PI * 2;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, ang) => [R + rad * Math.cos(ang), R + rad * Math.sin(ang)];
    const [x0, y0] = p(r, a0), [x1, y1] = p(r, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0);
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${big} 1 ${x1} ${y1} L ${x2} ${y2} A ${ri} ${ri} 0 ${big} 0 ${x3} ${y3} Z`;
    a0 = a1; return { ...s, d, i };
  });
  const shown = hi == null ? null : slices[hi];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flex: `0 0 ${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((a) => (
            <path key={a.i} d={a.d} fill={a.color} opacity={hi == null || hi === a.i ? 1 : 0.32}
              onMouseEnter={() => setHi(a.i)} onMouseLeave={() => setHi(null)} style={{ transition: "opacity .15s" }} />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", pointerEvents: "none" }}>
          <div className="num" style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.02em" }}>
            {money(shown ? shown.value : total, false)}</div>
          <div className="micro" style={{ marginTop: 5 }}>{shown ? shown.label : caption}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 150 }}>
        {slices.map((s, i) => (
          <div key={s.label} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
            style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: i < slices.length - 1 ? "1px solid var(--line-2)" : "none", fontSize: 12.5 }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: "0 0 9px" }} />
            <span style={{ color: "var(--ink-2)" }}>{s.label}</span>
            <b className="num" style={{ marginLeft: "auto", fontWeight: 500 }}>{money(s.value, false)}</b>
            <span className="num" style={{ width: 44, textAlign: "right", color: "var(--ink-4)", fontSize: 11.5 }}>
              {((s.value / total) * 100).toFixed(0)}%</span>
          </div>))}
        {sub && <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>{sub}</div>}
      </div>
    </div>
  );
}

const BarList = ({ rows, color = "var(--brand)" }) => {
  const mx = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return (<div className="bars">{rows.map((r) => (
    <div className="bar-row" key={r.label}>
      <span className="bk">{r.label}</span>
      <span className="bt"><i style={{ width: `${(Math.abs(r.value) / mx) * 100}%`, background: r.color || color }} /></span>
      <span className="bv" style={{ color: r.tone }}>{money(r.value)}</span>
    </div>))}</div>);
};

/* ------------------------------------------------------- posting preview */
function PostingPreview({ lines, title = "Journal entry" }) {
  const d = R2(lines.reduce((s, l) => s + l.debit, 0));
  const c = R2(lines.reduce((s, l) => s + l.credit, 0));
  const ok = Math.abs(d - c) < 0.01;
  return (
    <div className="post">
      <div className="post-h"><Scale size={13} strokeWidth={1.9} />{title}
        <span className={cx("st", !ok && "bad")}>{ok ? "Balanced" : "Out of balance"}</span></div>
      <table>
        <thead><tr><th>Account</th><th>Debit</th><th className="gut">Credit</th></tr></thead>
        <tbody>
          {lines.length === 0 && <tr><td colSpan={3} style={{ padding: "22px 16px", color: "#587682" }}>Add a line to see how it will post.</td></tr>}
          {lines.map((l, i) => (
            <tr key={i}>
              <td>{l.acc}<span className="ac">{ACC[l.acc] ? ACC[l.acc].name : ""}{l.label ? ` · ${l.label}` : ""}</span></td>
              <td className="d">{l.debit ? NF.format(l.debit) : ""}</td>
              <td className="c gut">{l.credit ? NF.format(l.credit) : ""}</td>
            </tr>))}
        </tbody>
        <tfoot><tr><td>Total</td><td style={{ textAlign: "right" }}>{NF.format(d)}</td>
          <td className="gut" style={{ textAlign: "right" }}>{NF.format(c)}</td></tr></tfoot>
      </table>
    </div>
  );
}

/* ---------------------------------------------------- PDF / Excel export */
function scrapeTables(root) {
  const out = [];
  if (!root) return out;
  root.querySelectorAll("table.tbl").forEach((t) => {
    const head = [], body = [], bold = [];
    Array.from(t.querySelectorAll("tr")).forEach((tr) => {
      const cells = [];
      Array.from(tr.querySelectorAll("th,td")).forEach((td) => {
        cells.push((td.textContent || "").replace(/\s+/g, " ").trim());
        for (let i = 1; i < (td.colSpan || 1); i++) cells.push("");
      });
      if (!cells.some((c) => c !== "")) return;
      const isHead = tr.parentElement && tr.parentElement.tagName === "THEAD";
      if (isHead) head.push(cells);
      else {
        if (/\bsub\b|\bgrand\b|\bsec\b/.test(tr.className) ||
            (tr.parentElement && tr.parentElement.tagName === "TFOOT")) bold.push(body.length);
        body.push(cells);
      }
    });
    if (body.length || head.length) out.push({ head, body, bold });
  });
  return out;
}
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function exportExcel(title, meta, CO, tables, name) {
  const rows = [[title], [`${CO.name} · TRN ${CO.trn}`], [meta], []];
  const head = [], bold = [1, 2];
  tables.forEach((t, i) => {
    if (i) rows.push([]);
    t.head.forEach((h) => { head.push(rows.length); rows.push(h); });
    t.body.forEach((b, bi) => { if (t.bold.indexOf(bi) >= 0) bold.push(rows.length); rows.push(b); });
  });
  rows.push([], [`Generated by Invoeez on ${dmy(TODAY)}`]);
  const bytes = buildXlsx([{ name: title.slice(0, 31), rows, head, bold }]);
  return saveBlob(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    name + ".xlsx");
}

function exportPdf(title, meta, CO, tables, name) {
  const JS = window.jspdf && window.jspdf.jsPDF;
  if (!JS) { window.print(); return false; }
  const doc = new JS({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 44;
  if (CO.logo) { try { doc.addImage(CO.logo, 40, 26, 0, 30); y = 74; } catch (e) { /* unsupported image */ } }
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(12, 32, 42);
  doc.text(title, 40, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(105, 128, 140);
  doc.text(`${CO.name}   ·   TRN ${CO.trn}`, 40, y + 15);
  doc.text(meta, 40, y + 28);
  doc.setDrawColor(14, 92, 74); doc.setLineWidth(1.4);
  doc.line(40, y + 38, W - 40, y + 38);
  let startY = y + 50;
  tables.forEach((t) => {
    doc.autoTable({
      head: t.head.length ? t.head : undefined, body: t.body, startY,
      margin: { left: 40, right: 40, bottom: 46 },
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4.5, textColor: [20, 42, 52], lineColor: [225, 233, 237], lineWidth: 0.4 },
      headStyles: { fillColor: [239, 244, 246], textColor: [70, 96, 107], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      didParseCell: (h) => {
        if (h.section === "body" && t.bold.indexOf(h.row.index) >= 0) {
          h.cell.styles.fontStyle = "bold"; h.cell.styles.fillColor = [243, 247, 248];
        }
        if (h.section === "body" && /^\(?-?[\d,]*\d\.\d{2}\)?$/.test(String(h.cell.raw || ""))) h.cell.styles.halign = "right";
        if (h.section === "head" && /^(Debit|Credit|Amount|Total|Net|VAT|Balance|Qty|Quantity)/i.test(String(h.cell.raw || ""))) h.cell.styles.halign = "right";
      },
    });
    startY = doc.lastAutoTable.finalY + 18;
  });
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(150, 168, 178);
    doc.text(`${CO.name} · generated by Invoeez on ${dmy(TODAY)}`, 40, doc.internal.pageSize.getHeight() - 22);
    doc.text(`Page ${i} of ${pages}`, W - 40, doc.internal.pageSize.getHeight() - 22, { align: "right" });
  }
  return saveBlob(doc.output("blob"), name + ".pdf");
}

function ExportBar({ frameRef, title, meta, toast }) {
  const CO = useCo();
  const run = (kind) => {
    const tables = scrapeTables(frameRef.current);
    if (!tables.length) { toast && toast("Nothing to export on this view", "warn"); return; }
    const name = `${slug(title)}-${TODAY}`;
    try {
      if (kind === "xlsx") {
        const ok = exportExcel(title, meta, CO, tables, name);
        toast && toast(ok ? `${name}.xlsx downloaded` : "The browser blocked that download", ok ? "" : "warn");
      } else {
        const ok = exportPdf(title, meta, CO, tables, name);
        toast && toast(ok ? `${name}.pdf downloaded` : "PDF unavailable — opening the print dialog", ok ? "" : "warn");
      }
    } catch (e) {
      toast && toast(`Export failed: ${e && e.message ? e.message : "unknown error"}`, "warn");
    }
  };
  return (<>
    <Btn icon={FileDown} onClick={() => run("pdf")}>PDF</Btn>
    <Btn icon={Sheet} onClick={() => run("xlsx")}>Excel</Btn>
    <Btn icon={Printer} onClick={() => window.print()}>Print</Btn>
  </>);
}

/* -------------------------------------------------------- report wrapper */
const ReportFrame = ({ title, meta, right, children, toast }) => {
  const CO = useCo();
  const frameRef = React.useRef(null);
  return (
  <div className="card" ref={frameRef}>
    <div className="rframe-h" style={{ padding: "20px 22px 18px", borderBottom: "1px solid var(--line)", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div>
        {CO.logo && <img src={CO.logo} alt="" style={{ maxHeight: 34, maxWidth: 150, objectFit: "contain", display: "block", marginBottom: 9 }} />}
        <div className="micro">{CO.name} · TRN {CO.trn}</div>
        <h2 style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.025em", marginTop: 7 }}>{title}</h2>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>{meta}</p>
      </div>
      <div className="acts noprint" style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        {right}<ExportBar frameRef={frameRef} title={title} meta={meta} toast={toast} /></div>
    </div>
    {children}
  </div>);
};

const Toasts = ({ items }) => (
  <div className="toasts noprint">{items.map((t) => (
    <div className={cx("toast", t.tone)} key={t.id}>
      <span className="tico">{t.tone === "warn" ? <AlertTriangle size={12} strokeWidth={2.2} /> : <Check size={13} strokeWidth={2.6} />}</span>
      {t.msg}</div>))}</div>
);

/* -------------------------------------------------------- command palette */
function CommandPalette({ items, close, run }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const hits = items.filter((i) => searchScore(q, i.label + " " + (i.hint || "")+" "+(i.search||""))).slice(0, 40);
  React.useEffect(() => setSel(0), [q]);
  const key = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hits[sel]) { run(hits[sel]); close(); } }
    else if (e.key === "Escape") close();
  };
  return (
    <div className="scrim" onMouseDown={close}>
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-in">
          <Search size={17} strokeWidth={1.9} style={{ color: "var(--ink-3)" }} />
          <input autoFocus placeholder="Search names, product IDs, barcodes, documents…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={key} />
          <button className="icon-btn" onClick={close}><X size={15} /></button>
        </div>
        <div className="cmdk-list">
          {hits.length === 0 && <div style={{ padding: "26px 14px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Nothing matches “{q}”.</div>}
          {hits.map((h, i) => (
            <button key={h.key + i} className={cx("cmdk-item", i === sel && "on")} onMouseEnter={() => setSel(i)}
              onClick={() => { run(h); close(); }}>
              <h.icon size={15} strokeWidth={1.8} style={{ color: "var(--ink-3)" }} />
              <span>{h.label}</span>{h.hint && <span className="kind">{h.hint}</span>}
            </button>))}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  DASHBOARD                                                                 */
/* ========================================================================== */

const monthEnd = (y, i) => `${y}-${String(i + 1).padStart(2, "0")}-${new Date(Date.UTC(y, i + 1, 0)).getUTCDate()}`;

function StatCard({ label, num, icon: Ic, tone, delta, deltaLabel, spark, sparkColor, grad = "g1", prefix = "AED" }) {
  const shown = useCountUp(num);
  return (
    <div className={cx("card kpi", "t" + grad.slice(1))}>
      <div className="kh">
        <span className={cx("gt", grad)}><Ic size={18} strokeWidth={1.9} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kl">{label}</div>
          <div className="kv">{prefix ? prefix + " " : ""}{money(shown, false)}</div>
          <div className="kd">
            {delta != null && (
              <span className={cx("delta", delta >= 0 ? "up" : "down")}>
                {delta >= 0 ? <TrendingUp size={11} strokeWidth={2.4} /> : <TrendingDown size={11} strokeWidth={2.4} />}
                {Math.abs(delta).toFixed(1)}%</span>)}
            <span>{deltaLabel}</span>
          </div>
        </div>
      </div>
      {spark && <div className="kspark"><Sparkline data={spark} color={sparkColor} w={320} h={54} /></div>}
    </div>
  );
}

const UPCOMING = [
  { iso: "2026-09-30", d: "30", m: "Sep", label: "Quarter 3 closes" },
  { iso: "2026-10-28", d: "28", m: "Oct", label: "VAT 201 filing deadline" },
  { iso: "2026-10-30", d: "30", m: "Oct", label: "Appoint an e-invoicing provider" },
  { iso: "2026-12-31", d: "31", m: "Dec", label: "Financial year end" },
];
function HeroWave() {
  const C = useC();
  const id = useMemo(() => "hw" + ++_gid, []);
  return (
    <svg className="hero-wave" viewBox="0 0 640 200" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id + "f"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.c1} stopOpacity=".34" />
          <stop offset="0.55" stopColor="#9061F9" stopOpacity=".2" />
          <stop offset="1" stopColor={C.c3} stopOpacity=".05" />
        </linearGradient>
        <linearGradient id={id + "a"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.c1} stopOpacity="0" />
          <stop offset="0.5" stopColor={C.c1} stopOpacity=".85" />
          <stop offset="1" stopColor="#9061F9" stopOpacity=".15" />
        </linearGradient>
        <linearGradient id={id + "b"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9061F9" stopOpacity="0" />
          <stop offset="0.55" stopColor="#9061F9" stopOpacity=".7" />
          <stop offset="1" stopColor={C.c2} stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={id + "c"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.c3} stopOpacity="0" />
          <stop offset="0.6" stopColor={C.c3} stopOpacity=".6" />
          <stop offset="1" stopColor={C.c3} stopOpacity=".05" />
        </linearGradient>
      </defs>
      <path d="M0,132 C110,74 210,182 342,116 C450,62 546,138 640,86 L640,200 L0,200 Z" fill={`url(#${id}f)`} />
      <path d="M0,120 C112,60 208,172 340,104 C452,46 548,124 640,70" fill="none"
        stroke={`url(#${id}a)`} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M0,150 C120,96 212,196 348,132 C458,80 552,150 640,102" fill="none"
        stroke={`url(#${id}b)`} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M0,92 C124,40 216,148 352,80 C462,26 556,102 640,48" fill="none"
        stroke={`url(#${id}c)`} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 7" />
      <circle cx="340" cy="104" r="3.6" fill={C.c1} />
      <circle cx="640" cy="70" r="3" fill="#9061F9" opacity=".7" />
    </svg>
  );
}
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
function LegacyDashboard({ state, books, go, newDoc, range, setRange, user = { name: "there" } }) {
  const C = useC();
  const [gran, setGran] = useState("auto");
  const FY = TODAY.slice(0, 4), fy = FY + "-01-01";
  const from = range.from, to = range.to, rlabel = presetLabel(range).toLowerCase();
  const P = useMemo(() => pnl(books.flat, from, to), [books, from, to]);
  const ar = useMemo(() => aging(state, "receivable", TODAY), [state]);
  const ap = useMemo(() => aging(state, "payable", TODAY), [state]);
  const q3 = useMemo(() => vat201(state, "2026-07-01", "2026-09-30"), [state]);
  const balAt = (codes, d) => R2(books.flat.filter((l) => codes.includes(l.acc) && l.date <= d).reduce((s, l) => s + l.debit - l.credit, 0));
  const cash = balAt([A.BANK, A.CASH], TODAY);
  const stockVal = R2(Object.values(books.stock).reduce((s, x) => s + x.value, 0));

  const bk = useMemo(() => bucketize(from, to, gran), [from, to, gran]);
  const months = useMemo(() => bk.rows.map((b) => {
    const r = pnl(books.flat, b.from, b.to);
    return { label: b.label, full: b.full, revenue: r.revenue, cost: R2(r.cost + r.expense),
      profit: r.net, cash: balAt([A.BANK, A.CASH], b.to) };
  }), [books, bk]);
  const labelEvery = Math.ceil(months.length / 12);
  const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
  const last = months[months.length - 1] || { revenue: 0, cost: 0, profit: 0, cash: 0 };
  const prev = months[months.length - 2] || last;
  const grainWord = bk.g === "day" ? "day" : bk.g === "week" ? "week" : "month";

  const CO = useCo();
  const bs = useMemo(() => balanceSheet(books.flat, TODAY, fy), [books]);
  const grp = (list, n) => (list.find((g) => g.name === n) || { total: 0 }).total;
  const ca = grp(bs.assets, "Current assets"), cl = grp(bs.liab, "Current liabilities");
  const ratio = cl ? ca / cl : 0;

  const topCustomers = useMemo(() => {
    const m = {};
    state.docs.filter((d) => d.state === "posted" && DOCMETA[d.type].side === "sale" && d.date >= from && d.date <= to)
      .forEach((d) => { m[d.partner] = R2((m[d.partner] || 0) + amounts(d).net * SIGNS[d.type]); });
    const rows = Object.entries(m).map(([id, v]) => ({ partner: PMAP[id], value: v }))
      .filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const tot = rows.reduce((s, r) => s + r.value, 0) || 1;
    return rows.slice(0, 5).map((r) => ({ ...r, share: (r.value / tot) * 100 }));
  }, [state, from, to]);

  const mix = useMemo(() => {
    const m = { goods: 0, services: 0, export: 0 };
    state.docs.filter((d) => d.state === "posted" && DOCMETA[d.type].side === "sale" && d.date >= from && d.date <= to).forEach((d) => {
      amounts(d).lines.forEach((l) => {
        const v = R2(l.amount * SIGNS[d.type]);
        if (l.kind === "zero") m.export += v;
        else if (PROD[l.product] && PROD[l.product].kind === "service") m.services += v;
        else m.goods += v;
      });
    });
    return [{ label: "Goods — domestic", value: R2(m.goods), color: C.c1 },
      { label: "Services", value: R2(m.services), color: C.c3 },
      { label: "Exports — zero rated", value: R2(m.export), color: C.c2 }];
  }, [state, C, from, to]);

  const overdue = R2(ar.tot.slice(1).reduce((s, v) => s + v, 0));

  const attention = useMemo(() => {
    const out = [];
    const late = [];
    ar.rows.forEach((r) => r.items.forEach((i) => {
      const days = daysBetween(i.due, TODAY);
      if (days > 0) late.push({ ...i, days, partner: r.partner });
    }));
    late.sort((a, b) => b.days - a.days);
    if (late.length) {
      const w = late[0];
      out.push({ tone: late.some((x) => x.days > 90) ? "bad" : "warn", icon: AlertTriangle,
        title: `${late.length} invoice${late.length > 1 ? "s" : ""} past due · ${money(R2(late.reduce((s, x) => s + x.open, 0)), false)}`,
        detail: `Oldest is ${w.number} to ${w.partner.name}, ${w.days} days late at ${money(w.open, false)}. Chase this one first.`,
        cta: "Aged receivable", go: () => go("r_aged_ar") });
    }
    const drafts = state.docs.filter((d) => d.state === "draft");
    if (drafts.length) {
      const val = R2(drafts.reduce((s, d) => s + amounts(d).total, 0));
      out.push({ tone: "info", icon: FileText,
        title: `${drafts.length} document${drafts.length > 1 ? "s" : ""} still in draft`,
        detail: `${money(val, false)} is not in the ledger yet, so it is missing from your reports and VAT return.`,
        cta: `Open ${drafts[0].number}`, go: () => go(LIST_OF[drafts[0].type], drafts[0].id) });
    }
    const badEinv = state.docs.filter((d) => d.state === "posted" && DOCMETA[d.type].side === "sale"
      && d.date >= fy && einvoiceCheck(d, CO).length);
    if (badEinv.length) {
      out.push({ tone: "warn", icon: ShieldCheck,
        title: `${badEinv.length} invoice${badEinv.length > 1 ? "s" : ""} would fail e-invoicing`,
        detail: `Missing fields the PINT AE dictionary requires — usually a buyer TRN. Mandatory from 1 January 2027.`,
        cta: "Submission queue", go: () => go("fta") });
    }
    const neg = PRODUCTS.filter((p) => p.kind === "goods" && (books.stock[p.id] || { qty: 0 }).qty < 0);
    if (neg.length) {
      out.push({ tone: "bad", icon: Layers,
        title: `${neg.length} product${neg.length > 1 ? "s are" : " is"} oversold`,
        detail: `${neg.map((p) => p.code).join(", ")} shows negative stock, so cost of sales is being valued at standard cost.`,
        cta: "Inventory", go: () => go("r_stock") });
    }
    const unapplied = ar.rows.filter((r) => r.unapplied > 0.004);
    if (unapplied.length) {
      out.push({ tone: "info", icon: Wallet,
        title: `${money(R2(unapplied.reduce((s, r) => s + r.unapplied, 0)), false)} received but unallocated`,
        detail: `${unapplied.map((r) => r.partner.name).slice(0, 2).join(", ")} paid more than the open invoices cover.`,
        cta: "Receipts", go: () => go("payments") });
    }
    const dueDate = "2026-10-28", daysToFile = daysBetween(TODAY, dueDate);
    if (daysToFile <= 90 && q3.due > 0) {
      out.push({ tone: daysToFile <= 21 ? "warn" : "info", icon: Building2,
        title: `VAT return due in ${daysToFile} days · ${money(q3.due, false)} payable`,
        detail: `Quarter 3 closes 30 September. File on EmaraTax by 28 October 2026.`,
        cta: "Form 201", go: () => go("r_vat") });
    }
    return out;
  }, [state, books, ar, q3, CO]);
  const recent = state.docs.slice().sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)).slice(0, 8);

  const ago = (iso) => { const n = daysBetween(iso, TODAY);
    return n <= 0 ? "today" : n === 1 ? "yesterday" : n < 30 ? `${n} days ago` : dmy(iso); };
  const activity = useMemo(() => {
    const docs = state.docs.filter((x) => x.state === "posted")
      .map((x) => ({ when: ago(x.date), date: x.date, amount: amounts(x).total,
        title: `${DOCMETA[x.type].short} ${x.number}`,
        sub: PMAP[x.partner] ? PMAP[x.partner].name : "",
        icon: x.type === "invoice" ? FileText : x.type === "bill" ? ShoppingCart : FileMinus,
        grad: x.type === "invoice" ? "g1" : x.type === "bill" ? "g4" : "g2" }));
    const pays = state.payments.map((p) => ({ when: ago(p.date), date: p.date, amount: p.amount,
      title: p.kind === "in" ? "Payment received" : "Payment made",
      sub: PMAP[p.partner] ? PMAP[p.partner].name : "",
      icon: Wallet, grad: p.kind === "in" ? "g3" : "g5" }));
    return docs.concat(pays).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [state]);

  const topReceivables = useMemo(() => {
    const rows = [];
    ar.rows.forEach((r) => r.items.forEach((i) => rows.push({ ...i, partner: r.partner, days: daysBetween(i.due, TODAY) })));
    return rows.sort((a, b) => b.open - a.open).slice(0, 4);
  }, [ar]);

  return (
    <div>
      <div className="hero">
        <HeroWave />
        <span className="sun"><Zap size={21} strokeWidth={2} /></span>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1>{greeting()}, {user.name.split(" ")[0]}</h1>
          <p>Here is what is happening across the books · {dmy(from)} to {dmy(to)}</p>
        </div>
        <div className="hact">
          <RangePicker value={range} onChange={setRange} />
          <Btn kind="pri" icon={Plus} onClick={() => newDoc("invoice")}>New invoice</Btn>
        </div>
      </div>

      <Card className="att" pad={false} style={{ marginBottom: 16 }}>
        <div className="att-h">
          <Zap size={16} strokeWidth={1.9} style={{ color: attention.length ? "var(--warn)" : "var(--pos)" }} />
          <h3 style={{ fontSize: 14.5, fontWeight: 600 }}>Needs your attention</h3>
          {attention.length > 0 && <span className="n">{attention.length} item{attention.length > 1 ? "s" : ""}</span>}
        </div>
        {attention.length === 0 ? (
          <div className="att-clear">
            <span className="ico"><CircleCheck size={19} strokeWidth={1.9} /></span>
            <div><b style={{ color: "var(--ink)", display: "block", fontSize: 13.5 }}>Nothing outstanding</b>
              Everything is posted, settled and compliant as at {dmy(TODAY)}.</div>
          </div>
        ) : attention.map((a, i) => (
          <div className="att-row" key={i}>
            <span className={cx("ico", a.tone)}><a.icon size={16} strokeWidth={1.9} /></span>
            <div className="tx"><b>{a.title}</b><span>{a.detail}</span></div>
            <Btn size="sm" onClick={a.go}>{a.cta} <ArrowRight size={13} /></Btn>
          </div>))}
      </Card>

      <div className="dash">
      <div className="dash-main">
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(232px,1fr))" }}>
        <StatCard label="Total revenue" grad="g1" icon={TrendingUp} num={P.revenue}
          delta={pct(last.revenue, prev.revenue)} deltaLabel={`vs previous ${grainWord}`} spark={months.map((m) => m.revenue)} />
        <StatCard label="Total expenses" grad="g2" icon={Wallet} num={R2(P.cost + P.expense)}
          delta={pct(last.cost, prev.cost)} deltaLabel={`${rlabel}`}
          spark={months.map((m) => m.cost)} sparkColor={C.c2} />
        <StatCard label="Net profit" grad="g3" icon={BarChart3} num={P.net}
          delta={pct(last.profit, prev.profit)} deltaLabel={`${P.nm.toFixed(1)}% net margin`}
          spark={months.map((m) => m.profit)} sparkColor={P.net >= 0 ? "#22C58B" : C.neg} />
        <StatCard label="Cash balance" grad="g4" icon={Banknote} num={cash}
          delta={pct(last.cash, prev.cash)} deltaLabel="bank and cash on hand"
          spark={months.map((m) => m.cash)} sparkColor={C.c3} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.55fr 1fr", marginTop: 16 }}>
        <Card title="Revenue against total cost" sub={`Per ${grainWord} · ${money(P.revenue, false)} over ${rangeDays(range)} ${rangeDays(range) === 1 ? "day" : "days"}`}
          right={<>
            <div className="seg">{[["day", "Day"], ["week", "Week"], ["month", "Month"], ["auto", "Auto"]].map(([k, l]) => (
              <button key={k} className={cx(gran === k && "on")} onClick={() => setGran(k)}>{l}</button>))}</div>
            <div className="chart-legend">
              <span><i style={{ background: C.c1 }} />Revenue</span>
              <span><i style={{ background: C.c2 }} />Cost</span></div></>}>
          <AreaChart data={months} height={252} labelEvery={labelEvery} series={[
            { key: "revenue", name: "Revenue", color: C.c1, fill: 0.18 },
            { key: "cost", name: "Cost & expenses", color: C.c2, fill: 0.14 }]} />
        </Card>
        <Card title="Revenue mix" sub={`By supply type · ${presetLabel(range)}`}>
          <Donut slices={mix} caption="Total revenue"
            sub="Exports are zero-rated under Article 45 and carry no output VAT." />
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.25fr 1fr", marginTop: 16 }}>
        <Card title="Top customers" sub={`By net revenue · ${presetLabel(range)}`}
          right={<Btn size="sm" kind="ghost" onClick={() => go("partners")}>All accounts <ChevronRight size={13} /></Btn>}>
          {topCustomers.length === 0
            ? <EmptyState icon={Users} title="No sales in this period">Widen the range above to see the ranking.</EmptyState>
            : <div className="rank">{topCustomers.map((r, i) => (
              <div className="rank-row" key={r.partner.id}>
                <span className="rn">{i + 1}</span>
                <Avatar name={r.partner.name} />
                <span className="rl"><b>{r.partner.name}</b>
                  <span className="rb"><i style={{ width: `${r.share}%`, background: i === 0 ? C.c1 : "var(--brand)", opacity: 1 - i * 0.14 }} /></span></span>
                <span className="rv">{money(r.value)}<span>{r.share.toFixed(1)}% of sales</span></span>
              </div>))}</div>}
        </Card>
        <Card title="Working capital" sub={`Current position as at ${dmy(TODAY)}`}>
          <div className="num" style={{ fontSize: 23, fontWeight: 500, letterSpacing: "-.03em" }}>{money(R2(ca - cl), false)}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 5 }}>
            Current ratio {ratio.toFixed(2)} to 1 · {ratio >= 2 ? "comfortable headroom" : ratio >= 1 ? "solvent but watch it" : "under pressure"}</div>
          <div className="wcbar" style={{ marginTop: 16 }}>
            <i style={{ width: `${(cl / Math.max(ca, cl, 1)) * 100}%`, background: "var(--warn)" }} />
          </div>
          <div className="sumrow" style={{ marginTop: 10 }}><span className="k">Current assets</span><span className="v">{money(ca)}</span></div>
          <div className="sumrow"><span className="k">Current liabilities</span><span className="v">{money(cl)}</span></div>
          <div className="sumrow"><span className="k">Inventory held</span><span className="v">{money(stockVal)}</span></div>
          <div className="sumrow total"><span className="k">Net working capital</span><span className="v">{money(R2(ca - cl), false)}</span></div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 16 }}>
        <Card title="Aged receivable" sub={`${ar.rows.length} customers open`}
          right={<Btn size="sm" kind="ghost" onClick={() => go("r_aged_ar")}>Report <ChevronRight size={13} /></Btn>}>
          <div className="num" style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-.035em", marginBottom: 18 }}>{money(ar.grand, false)}</div>
          <BarList rows={ar.tot.map((v, i) => ({ label: BUCKETS[i], value: v, color: i > 2 ? "var(--neg)" : i > 0 ? "var(--warn)" : "var(--brand)" }))} />
        </Card>
        <Card title="Aged payable" sub={`${ap.rows.length} vendors open`}
          right={<Btn size="sm" kind="ghost" onClick={() => go("r_aged_ap")}>Report <ChevronRight size={13} /></Btn>}>
          <div className="num" style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-.035em", marginBottom: 18 }}>{money(ap.grand, false)}</div>
          <BarList rows={ap.tot.map((v, i) => ({ label: BUCKETS[i], value: v, color: i > 2 ? "var(--neg)" : i > 0 ? "var(--warn)" : "var(--info)" }))} />
        </Card>
        <Card title="VAT position" sub="Quarter 3 · Jul – Sep 2026"
          right={<Btn size="sm" kind="ghost" onClick={() => go("r_vat")}>Form 201 <ChevronRight size={13} /></Btn>}>
          <div className="sumrow"><span className="k">Output tax on supplies</span><span className="v">{money(q3.out.vat)}</span></div>
          <div className="sumrow"><span className="k">Recoverable input tax</span><span className="v">{money(q3.inp.vat)}</span></div>
          <div className="sumrow total"><span className="k">{q3.due >= 0 ? "Payable to FTA" : "Refundable by FTA"}</span>
            <span className="v" style={{ color: q3.due >= 0 ? "var(--neg)" : "var(--pos)" }}>{money(Math.abs(q3.due), false)}</span></div>
          <div style={{ marginTop: 15, padding: "12px 13px", borderRadius: "var(--r)", background: "var(--brand-50)",
            border: "1px solid var(--brand-100)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55,
            display: "flex", gap: 10 }}>
            <Calendar size={15} strokeWidth={1.9} style={{ flex: "0 0 15px", marginTop: 1, color: "var(--brand)" }} />
            <span>Return due <b style={{ color: "var(--ink)" }}>28 October 2026</b> on EmaraTax. Reverse-charge
              imports self-account in Box 3 and recover in Box 10.</span>
          </div>
        </Card>
      </div>

      <Card title="Recent transactions" sub="Latest documents across sales and purchases" pad={false} style={{ marginTop: 16 }}
        right={<Btn size="sm" kind="ghost" onClick={() => go("invoices")}>View all <ChevronRight size={13} /></Btn>}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Document</th><th>Counterparty</th><th>Date</th><th className="n">Net</th><th className="n">VAT</th><th className="n">Total</th><th>Status</th></tr></thead>
          <tbody>{recent.map((d) => { const a = amounts(d), s = SIGNS[d.type]; return (
            <tr key={d.id} className="click" onClick={() => go(LIST_OF[d.type], d.id)}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className="mono" style={{ fontSize: 12 }}>{d.number}</span>
                <Pill tone={d.type === "invoice" ? "ok" : d.type === "bill" ? "info" : "gold"}>{DOCMETA[d.type].short}</Pill></div></td>
              <td><Party name={PMAP[d.partner].name} meta={PMAP[d.partner].emirate} /></td>
              <td className="muted">{dmy(d.date)}</td>
              <td className="n">{money(a.net * s)}</td><td className="n">{money(a.vat * s)}</td>
              <td className="n" style={{ fontWeight: 600 }}>{money(a.total * s)}</td>
              <td><Pill tone={d.state === "posted" ? "ok" : ""} dot>{d.state}</Pill></td>
            </tr>); })}</tbody>
        </table></div>
      </Card>

      <div className="banner">
        <span className="gt g6"><Zap size={19} strokeWidth={2} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b>Streamline your finances</b>
          <p>Every figure here is replayed from posted documents — nothing is stored twice, so the books cannot drift.</p>
        </div>
        <Btn kind="pri" onClick={() => go("r_pnl")}>View reports <ArrowRight size={14} /></Btn>
      </div>
      </div>

      <aside className="dash-rail">
        <Card title="Recent activity" pad={false}
          right={<Btn size="sm" kind="ghost" onClick={() => go("journal")}>View all</Btn>}>
          <div style={{ padding: "4px 18px 16px" }}>
            {activity.map((a, i) => (
              <div className="feed-row" key={i}>
                <span className={cx("gt sm", a.grad)}><a.icon size={15} strokeWidth={1.9} /></span>
                <div className="fx"><b>{a.title}</b><span>{a.sub}</span></div>
                <div className="fr"><b>{money(a.amount, false)}</b><span>{a.when}</span></div>
              </div>))}
          </div>
        </Card>

        <Card title="Quick actions">
          <div className="qa">
            {[["Create invoice", FileText, "g1", () => newDoc("invoice")],
              ["Record expense", Wallet, "g2", () => go("expenses")],
              ["Add journal entry", Landmark, "g6", () => go("journal")],
              ["Create bill", ShoppingCart, "g4", () => newDoc("bill")],
              ["Transfer money", Banknote, "g3", () => go("banking")],
              ["Fixed assets", Layers, "g5", () => go("assets")]].map(([l, I, g, fn]) => (
              <button key={l} onClick={fn}>
                <span className={cx("gt sm", g)}><I size={15} strokeWidth={1.9} /></span>{l}</button>))}
          </div>
        </Card>

        <Card title="Top receivables" pad={false}
          right={<Btn size="sm" kind="ghost" onClick={() => go("r_aged_ar")}>View all</Btn>}>
          <div style={{ padding: "4px 18px 16px" }}>
            {topReceivables.length === 0
              ? <div style={{ padding: "16px 0", fontSize: 12.5, color: "var(--ink-3)" }}>Nothing outstanding.</div>
              : topReceivables.map((r) => (
              <div className="feed-row" key={r.id}>
                <Avatar name={r.partner.name} size={34} />
                <div className="fx"><b>{r.partner.name}</b><span>{r.number}</span></div>
                <div className="fr"><b>{money(r.open, false)}</b>
                  <span style={{ color: r.days > 0 ? "var(--neg)" : "var(--ink-4)" }}>
                    {r.days > 0 ? `Overdue ${r.days} days` : `Due ${dmy(r.due)}`}</span></div>
              </div>))}
          </div>
        </Card>

        <Card title="Upcoming" pad={false}
          right={<Btn size="sm" kind="ghost" onClick={() => go("r_vat")}>Calendar</Btn>}>
          <div style={{ padding: "4px 18px 16px" }}>
            {UPCOMING.map((u, i) => {
              const near = daysBetween(TODAY, u.iso) <= 45;
              return (
              <div className={cx("up-row", near && "soon")} key={u.label}>
                <span className="cal" style={near ? undefined
                  : { background: ["linear-gradient(140deg,#4F7CFF,#3358E8)", "linear-gradient(140deg,#9061F9,#6D46E0)",
                      "linear-gradient(140deg,#22D3EE,#2B9BF0)", "linear-gradient(140deg,#12B981,#0E9F72)"][i % 4] }}>
                  <b>{u.d}</b><span>{u.m}</span></span>
                <div className="ux"><b>{u.label}</b>
                  <span style={near ? { color: "var(--neg)" } : undefined}>
                    {daysBetween(TODAY, u.iso) > 0 ? `Due in ${daysBetween(TODAY, u.iso)} days` : "Overdue"}</span></div>
              </div>); })}
          </div>
        </Card>
      </aside>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  DOCUMENT LIST                                                             */
/* ========================================================================== */

const LIST_OF = { quote: "quotes", invoice: "invoices", credit_note: "credit_notes", bill: "bills", debit_note: "debit_notes" };

function nextNumber(docs, type) {
  const n = docs.filter((d) => d.type === type).reduce((m, d) => Math.max(m, +d.number.split("/").pop() || 0), 0);
  return `${DOCMETA[type].prefix}/${TODAY.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`;
}
/* A new document starts with no counterparty, so nothing is ever posted to the wrong customer by default. */
function blankDoc(docs, type) {
  return { id: uid("d"), type, number: nextNumber(docs, type), partner: "", salesman: "", pricelist: "", date: TODAY,
    due: TODAY, lines: [{ id: uid("l"), product: "", desc: "", qty: 1, price: 0, disc: 0, tax: "s5", account: null }],
    ref: "", note: "", state: "draft", seq: 0, emirate: COMPANY.emirate || "Dubai", isNew: true };
}

function DocumentsScreen({ type, state, setState, books, openId, clearOpen, toast, go, fta }) {
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [sort, setSort] = useState({ k: "date", dir: "desc" });
  const [limit, setLimit] = useState(100);
  const meta = DOCMETA[type], sale = meta.side === "sale";
  const payable = type === "invoice" || type === "bill";

  React.useEffect(() => {
    if (!openId) return;
    if (openId === "__list__") setEditing(null);
    else if (openId === "__new__") setEditing(blankDoc(state.docs, type));
    else { const d = state.docs.find((x) => x.id === openId); if (d) setEditing(d); }
    clearOpen();
  }, [openId]);

  const openMap = useMemo(() => {
    if (type !== "invoice" && type !== "bill") return {};
    const a = aging(state, type === "invoice" ? "receivable" : "payable", TODAY);
    const m = {}; a.rows.forEach((r) => r.items.forEach((i) => (m[i.id] = i.open))); return m;
  }, [state, type]);

  React.useEffect(()=>{scrollPageTop();},[editing?.id]);
  if (editing) return <DocEditor key={editing.id} doc={editing} state={state} setState={setState} books={books}
    toast={toast} fta={fta} go={go} close={() => setEditing(null)} />;

  const filtered = state.docs.filter((d) => d.type === type)
    .filter((d) => f === "all" || (f === "open" ? (openMap[d.id] || 0) > 0.004 : f === "overdue" ? (openMap[d.id] || 0) > 0.004 && d.due < TODAY : d.state === f))
    .filter((d) => hits(q, d.number, PMAP[d.partner].name, PMAP[d.partner].trn, d.ref, d.emirate,
      d.lines.map((l) => (PROD[l.product] ? productText(PROD[l.product]) : "") + " " + l.desc).join(" ")));
  const field = (d, k) => {
    const a = amounts(d);
    if (k === "partner") return PMAP[d.partner].name;
    if (k === "ref") return d.ref || "";
    if (k === "open") return openMap[d.id] || 0;
    if (k === "net" || k === "vat" || k === "total") return a[k];
    return d[k] || "";
  };
  const list = sortRows(filtered, sort, field);
  const t = list.filter((d) => (type === "quote" ? d.state !== "declined" : d.state === "posted")).reduce((s, d) => { const a = amounts(d);
    return { net: R2(s.net + a.net), vat: R2(s.vat + a.vat), total: R2(s.total + a.total) }; }, { net: 0, vat: 0, total: 0 });
  const totalOpen = R2(list.reduce((s, d) => s + (openMap[d.id] || 0), 0));

  return (
    <div>
      <PageHead eyebrow={sale ? "Sales" : "Purchases"} title={meta.label + "s"}
        sub={type === "quote"
          ? `${list.length} quotations · ${money(t.total, false)} in play · nothing posts until one is converted`
          : `${list.length} documents · ${money(t.total, false)} posted${totalOpen > 0.004 ? ` · ${money(totalOpen, false)} outstanding` : ""}`}>
        <Btn kind="pri" icon={Plus} onClick={() => setEditing(blankDoc(state.docs, type))}>New {meta.short.toLowerCase()}</Btn>
      </PageHead>

      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} width={300}
            placeholder={`Search number, ${sale ? "customer" : "vendor"}, TRN, product or reference`} />
          <div className="seg">{(type === "quote"
            ? [["all", "All"], ["draft", "Draft"], ["sent", "Sent"], ["accepted", "Accepted"], ["invoiced", "Invoiced"]]
            : [["all", "All"], ["posted", "Posted"], ["draft", "Draft"], ...(payable ? [["open", "Unpaid"], ["overdue", "Overdue"]] : [])]).map(([k, l]) => (
            <button key={k} className={cx(f === k && "on")} onClick={() => { setF(k); setLimit(100); }}>{l}</button>))}</div>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>{list.length} of {state.docs.filter((d) => d.type === type).length}</span>
        </div>
        <div className="tbl-wrap"><table className="tbl doc-list-tbl">
          <thead><tr>
            <SortTh id="number" sort={sort} setSort={setSort}>Number</SortTh>
            <SortTh id="partner" sort={sort} setSort={setSort}>{sale ? "Customer" : "Vendor"}</SortTh>
            <SortTh id="date" sort={sort} setSort={setSort}>Date</SortTh>
            <SortTh id="due" sort={sort} setSort={setSort}>{type === "quote" ? "Valid until" : "Due"}</SortTh>
            <SortTh id="ref" sort={sort} setSort={setSort} className="hide-narrow">Reference</SortTh>
            <SortTh id="net" sort={sort} setSort={setSort} className="n">Net</SortTh>
            <SortTh id="vat" sort={sort} setSort={setSort} className="n">VAT</SortTh>
            <SortTh id="total" sort={sort} setSort={setSort} className="n">Total</SortTh>
            <SortTh id="open" sort={sort} setSort={setSort} className="n">Outstanding</SortTh>
            <SortTh id="state" sort={sort} setSort={setSort}>Status</SortTh>
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={10}>
              <EmptyState icon={FileText} title={q || f !== "all" ? "Nothing matches this filter" : `No ${meta.label.toLowerCase()}s yet`}>
                {q || f !== "all" ? "Clear the search or switch back to All." : `Create the first ${meta.short.toLowerCase()} to start posting to the ledger.`}
              </EmptyState></td></tr>}
            {list.slice(0, limit).map((d) => { const a = amounts(d); const op = openMap[d.id] || 0;
              const late = d.state === "posted" && op > 0.004 && d.due < TODAY;
              return (
                <tr key={d.id} className="click" onClick={() => setEditing(d)}>
                  <td className="mono nowrap" style={{ fontSize: 12.5 }}>{d.number}</td>
                  <td><Party name={PMAP[d.partner].name} meta={PMAP[d.partner].trn ? "TRN " + PMAP[d.partner].trn : "Not VAT registered"} /></td>
                  <td className="muted nowrap">{dmy(d.date)}</td>
                  <td className="nowrap" style={{ color: late ? "var(--neg)" : "var(--ink-3)" }}>{dmy(d.due)}
                    {late && <div className="late-note">{daysBetween(d.due, TODAY)} {daysBetween(d.due, TODAY) === 1 ? "day" : "days"} overdue</div>}</td>
                  <td className="muted ref-cell hide-narrow" style={{ fontSize: 12.5 }} title={d.ref || ""}>{d.ref || "—"}</td>
                  <td className="n">{money(a.net)}</td>
                  <td className="n">{money(a.vat)}{a.rcm > 0 && <span style={{ color: "var(--gold)", fontSize: 11 }}> +RC</span>}</td>
                  <td className="n" style={{ fontWeight: 600 }}>{money(a.total)}</td>
                  <td className="n">{d.state !== "posted" ? "—" : op > 0.004 ? money(op) : <span className="pos">Settled</span>}</td>
                  <td><Pill tone={type === "quote" ? (QUOTE_STATES[d.state] || QUOTE_STATES.draft).tone
                    : d.state === "posted" ? "ok" : ""} dot>
                    {type === "quote" ? (QUOTE_STATES[d.state] || QUOTE_STATES.draft).label : d.state}</Pill></td>
                </tr>); })}
          </tbody>
          {list.length > limit && <tbody><tr><td colSpan={10} className="show-more">
            <Btn onClick={() => setLimit((n) => n + 200)}>Show {Math.min(200, list.length - limit)} more · {list.length - limit} not shown</Btn></td></tr></tbody>}
          {list.length > 0 && <tfoot><tr><td colSpan={4}>{type === "quote" ? "Live quotations" : "Posted totals"}</td><td className="hide-narrow" />
            <td className="n">{money(t.net)}</td><td className="n">{money(t.vat)}</td><td className="n">{money(t.total)}</td>
            <td className="n">{money(totalOpen)}</td><td /></tr></tfoot>}
        </table></div>
      </Card>
    </div>
  );
}

/* ========================================================================== */
/*  DOCUMENT EDITOR                                                           */
/* ========================================================================== */

function DocEditor({ doc: initial, state, setState, books, close, toast, fta, go }) {
  const [d, setD] = useState(initial);
  const [print, setPrint] = useState(false);
  const [tab,setTab]=useState('items'),[quick,setQuick]=useState(null),[showCost,setShowCost]=useState(false),[showAccounts,setShowAccounts]=useState(false),[historyLine,setHistoryLine]=useState(null),[historyProduct,setHistoryProduct]=useState('');
  const [lineView,setLineView]=useState(()=>{try{return localStorage.getItem('mizan.lineView')||'compact';}catch{return 'compact';}});
  const [expandedLines,setExpandedLines]=useState({});
  React.useEffect(()=>{try{localStorage.setItem('mizan.lineView',lineView);}catch{}},[lineView]);
  const pendingLine=React.useRef(null);
  React.useEffect(()=>{scrollPageTop();},[initial.id]);
  React.useEffect(()=>{if(pendingLine.current){const id=pendingLine.current;pendingLine.current=null;requestAnimationFrame(()=>{const row=document.querySelector('[data-line-id="'+id+'"]');row?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});row?.querySelector('input[role="combobox"]')?.focus({preventScroll:true});});}},[d.lines.length]);
  const CO = useCo();
  const meta = DOCMETA[d.type], sale = meta.side === "sale";
  const isQuote = d.type === "quote";
  const locked = isQuote ? d.state === "invoiced" : d.state === "posted";
  const am = amounts(d);

  const preview = useMemo(() => {
    const live = books.entries.find((x) => x.docId === d.id);
    if (locked && live) return live.lines;
    const b = deriveBooks({ ...state, docs: [...state.docs.filter((x) => x.id !== d.id), { ...d, state: "posted", seq: 1e6 }], payments: [], manual: [] });
    const e = b.entries.find((x) => x.docId === d.id);
    return e ? e.lines : [];
  }, [d, state, books, locked]);

  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const reprice=(s,force=false)=>({...s,lines:s.lines.map(l=>PROD[l.product]&&(force||!l.manualPricing)?{...l,...pricingFor(state,PROD[l.product],l.qty,s.date,s.pricelist,meta.side),manualPricing:false}:l)});
  const changePricing=(patch,force=false)=>setD(s=>reprice({...s,...patch},force));
  const setLine=(id,k,v)=>setD(s=>({...s,lines:s.lines.map(l=>{
    if(l.id!==id)return l;const next={...l,[k]:v,...(k==='price'?{manualPricing:true}:{})};
    return k==='qty'&&!next.manualPricing&&PROD[next.product]?{...next,...pricingFor(state,PROD[next.product],v,s.date,s.pricelist,meta.side)}:next;
  })}));
  const addLine=()=>{const id=uid('l');pendingLine.current=id;setTab('items');setD(s=>({...s,lines:[...s.lines,{id,product:'',desc:'',qty:1,price:0,disc:0,tax:'s5',account:null}]}));};
  const pickProduct=(id,pid)=>{const p=PROD[pid];if(!p)return;
    setD(s=>({...s,lines:s.lines.map(l=>l.id===id?{...l,product:pid,desc:p.name,disc:0,...pricingFor(state,p,l.qty,s.date,s.pricelist,meta.side),tax:sale&&p.tax==='rc5'?'s5':p.tax,account:null,accounts:undefined,manualPricing:false}:l)}));setHistoryProduct(pid);
  };
  const pickPartner=pid=>{const p=PMAP[pid];if(!p)return;setD(s=>reprice({...s,partner:pid,due:addDays(s.date,p.terms||0),emirate:p.emirate,salesman:p.salesman||'',pricelist:p.pricelist||''},true));};
  const validate=(posting=false)=>{
    if(!PMAP[d.partner])return 'Select a customer or vendor.';
    if(!d.date||!d.due)return 'Set the document and due dates.';
    if(posting&&!d.lines.length)return 'Add at least one product line.';
    if(d.lines.some(l=>!PROD[l.product]))return 'Choose a product on every line, or remove the empty line.';
    if(d.lines.some(l=>!Number.isFinite(+l.qty)||+l.qty<=0||!Number.isFinite(+l.price)||+l.price<0||!Number.isFinite(+l.disc)||+l.disc<0||+l.disc>100))return 'Use quantities above zero, non-negative prices, and discounts between 0 and 100%.';
    if(posting&&state.stockOps.some(o=>o.date>d.date&&o.lines.some(x=>d.lines.some(l=>l.product===x.product))))return 'A later stock adjustment exists for one of these products. Use a date on or after that adjustment.';
    return '';
  };

  const commit = (next) => setState((s) => {
    const exists = s.docs.some((x) => x.id === d.id);
    const seq = next.state === "posted" && !next.seq ? Math.max(0, ...s.docs.map((x) => x.seq||0), ...(s.stockOps||[]).map(x=>x.seq||0)) + 1 : next.seq;
    const clean = { ...(next.state === "posted" ? freezeAccounts(next) : next), seq: next.state === "posted" ? seq : 0, isNew: undefined };
    return { ...s, docs: exists ? s.docs.map((x) => (x.id === d.id ? clean : x)) : [...s.docs, clean] };
  });
  const save = () => { const err=validate();if(err)return toast(err,"warn");commit(d); toast(`${d.number} saved as draft`); close(); };

  const spawn = (type, lines, ref, note) => {
    const nd = { id: uid("d"), type, number: nextNumber(state.docs, type), partner: d.partner,salesman:d.salesman||"",pricelist:d.pricelist||"",
      date: TODAY, due: addDays(TODAY, PMAP[d.partner].terms), lines, ref: ref || "", note: note || "",
      state: "draft", seq: 0, emirate: d.emirate };
    setState((x) => ({ ...x, docs: [...x.docs, nd] }));
    toast(`${nd.number} created as a draft`);
    go(LIST_OF[type], nd.id);
  };
  const duplicate = () => spawn(d.type, d.lines.map((l) => ({ ...l, accounts:undefined, id: uid("l") })), d.ref,
    `Duplicated from ${d.number}`);
  const reverseDoc = () => spawn(d.type === "invoice" ? "credit_note" : "debit_note",
    d.lines.map((l) => ({ ...l, id: uid("l") })), d.number,
    `${d.type === "invoice" ? "Credits" : "Reverses"} ${d.number} in full. Adjust the lines before posting if this is a partial.`);

  const outstanding = useMemo(() => {
    if (!locked || (d.type !== "invoice" && d.type !== "bill")) return 0;
    const a = aging(state, d.type === "invoice" ? "receivable" : "payable", TODAY);
    const r = a.rows.find((x) => x.partner.id === d.partner);
    const it = r && r.items.find((x) => x.id === d.id);
    return it ? it.open : 0;
  }, [state, d, locked]);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmt, setPayAmt] = useState(0);
  const [payMethod, setPayMethod] = useState("m1");
  const [payRef, setPayRef] = useState("");
  React.useEffect(() => { setPayAmt(outstanding); }, [outstanding]);
  const recordPayment = () => {
    const kind = d.type === "invoice" ? "in" : "out";
    const m = MET[payMethod] || METHODS[0];
    const pm = { id: uid("pm"), kind, number: nextPay(state.payments, kind), partner: d.partner,
      date: TODAY, amount: R2(+payAmt || 0), method: m.id, account: m.account,
      memo: [`Settlement of ${d.number}`, payRef].filter(Boolean).join(" · ") };
    setState((x) => ({ ...x, payments: [...x.payments, pm] }));
    toast(`${pm.number} recorded · ${money(pm.amount, false)} against ${d.number}`);
    setPayOpen(false);
  };

  const einvRec = state.einv && state.einv[d.id];
  const timeline = [
    { done: true, t: "Created", s: dmy(d.date) },
    { done: locked, t: locked ? "Posted to the ledger" : "Not yet posted",
      s: locked ? `${meta.journal} journal` : "Draft — nothing has hit the accounts" },
    ...(sale ? [{ done: !!einvRec && einvRec.status !== "invalid",
      t: einvRec ? EINV_STATES[einvRec.status].label : "Not submitted for e-invoicing",
      s: einvRec && einvRec.hash ? `Hash ${einvRec.hash.slice(0, 12)}…` : "PINT AE not generated" }] : []),
    ...(d.type === "invoice" || d.type === "bill" ? [{ done: locked && outstanding < 0.005,
      t: !locked ? "Awaiting posting" : outstanding < 0.005 ? "Settled in full" : `${money(outstanding, false)} outstanding`,
      s: locked ? `Due ${dmy(d.due)}` : "" }] : []),
  ];
  const post = () => {
    const err=validate(true);if(err)return toast(err,"warn");
    const n = freezeAccounts({ ...d, state: "posted" }); setD(n); commit(n);
    toast(`${d.number} posted to the ledger`);
    if (!(fta && fta.autoSubmit && sale)) return;
    const fails = einvoiceCheck(n, CO);
    const xml = fails.length ? "" : buildPINT(n, CO);
    setState((x) => ({ ...x, einv: { ...(x.einv || {}), [n.id]: {
      status: fails.length ? "invalid" : fta.endpoint ? "submitted" : "queued",
      uuid: uuidv4(), hash: xml ? sha256(xml) : "", at: new Date().toISOString(),
      note: fails.length ? fails[0]
        : fta.endpoint ? `Sent to ${fta.asp || "provider"}` : "Held — no provider connected",
    } } }));
    toast(fails.length ? `E-invoice check — ${fails[0]}` : `${n.number} queued for e-invoicing`,
      fails.length ? "warn" : "");
  };
  const unpost = () => { if(state.stockOps.some(o=>(o.date>d.date||(o.date===d.date&&(o.seq||0)>(d.seq||0)))&&o.lines.some(x=>d.lines.some(l=>l.product===x.product))))return toast("A stock adjustment follows this document. Use a return or correcting document to preserve the count history.","warn");const n = { ...d, state: "draft", seq: 0,lines:d.lines.map(l=>({...l,accounts:undefined})) }; setD(n); commit(n); toast(`${d.number} reset to draft`, "warn"); };
  const remove = () => { setState((s) => ({ ...s, docs: s.docs.filter((x) => x.id !== d.id) })); toast(`${d.number} deleted`, "warn"); close(); };

  const partners = PARTNERS.filter((p) => (sale ? p.role === "customer" : p.role === "vendor"));
  const taxes = TAXES.filter((t) => t.scope === "both" || t.scope === meta.side);
  const accounts = ACCOUNTS.filter((a) => (sale ? a.type === "income" : ["expense", "cogs", "casset", "fasset"].includes(a.type)));

  return (
    <div>
      {print && <PrintDoc d={d} close={() => setPrint(false)} fta={fta} toast={toast} />}
      <div className="page-head">
        <div>
          <button className="btn ghost" style={{ marginBottom: 9, marginLeft: -9 }} onClick={close}>
            <ArrowLeft size={14} /> All {meta.short.toLowerCase()}s</button>
          <div className="micro">{meta.label} · {meta.journal} journal</div>
          <h1 style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 11 }}>
            {d.number}
            <Pill tone={isQuote ? (QUOTE_STATES[d.state] || QUOTE_STATES.draft).tone : locked ? "ok" : ""} dot>
              {isQuote ? (QUOTE_STATES[d.state] || QUOTE_STATES.draft).label : d.state}</Pill>
            {sale && state.einv && state.einv[d.id] &&
              <Pill tone={EINV_STATES[state.einv[d.id].status].tone} dot>
                {EINV_STATES[state.einv[d.id].status].label}</Pill>}</h1>
        </div>
        <div className="acts">
          {isQuote && !locked && <Btn icon={Send} onClick={() => { const n = { ...d, state: "sent" }; setD(n); commit(n);
            toast(`${d.number} marked as sent`); }}>Mark sent</Btn>}
          {isQuote && !locked && <Btn icon={Check} onClick={() => { const n = { ...d, state: "accepted" }; setD(n); commit(n);
            toast(`${d.number} accepted by the customer`); }}>Accepted</Btn>}
          {isQuote && !locked && <Btn kind="danger" icon={X} onClick={() => { const n = { ...d, state: "declined" }; setD(n); commit(n);
            toast(`${d.number} declined`, "warn"); }}>Declined</Btn>}
          {isQuote && <Btn kind="pri" icon={ArrowRight} disabled={!d.lines.length || locked}
            onClick={() => { const err=validate(true);if(err)return toast(err,"warn");commit({ ...d, state: "invoiced" });
              spawn("invoice", d.lines.map((l) => ({ ...l, id: uid("l") })), d.number,
                `Raised from quotation ${d.number}`); }}>Convert to invoice</Btn>}
          {!d.isNew && <Btn icon={Copy} onClick={duplicate}>Duplicate</Btn>}
          {locked && (d.type === "invoice" || d.type === "bill") &&
            <Btn icon={FileMinus} onClick={reverseDoc}>{d.type === "invoice" ? "Credit note" : "Debit note"}</Btn>}
          {locked && outstanding > 0.004 &&
            <Btn icon={Wallet} onClick={() => setPayOpen((v) => !v)}>Record payment</Btn>}
          {sale && <Btn icon={Send} onClick={() => setPrint(true)}>Print / send</Btn>}
          {!locked && !d.isNew && <Btn kind="danger" icon={Trash2} onClick={remove}>Delete</Btn>}
          {locked && !isQuote && <Btn icon={RotateCcw} onClick={unpost}>Reset to draft</Btn>}
          {!locked && <Btn onClick={save}>{isQuote ? "Save quotation" : "Save draft"}</Btn>}
          {!locked && !isQuote && <Btn kind="pri" icon={Check} onClick={post} disabled={!d.lines.length}>Post to ledger</Btn>}
        </div>
      </div>

      {payOpen && (
        <Card title={`Settle ${d.number}`} sub={`${money(outstanding, false)} outstanding · clears the oldest open document first`}
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setPayOpen(false)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!(+payAmt > 0)} onClick={recordPayment}>Record</Btn></>}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            <Field label="Amount · AED">
              <Input n type="number" step="0.01" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} /></Field>
            <MethodPicker dir={d.type === "invoice" ? "in" : "out"} value={payMethod}
              onChange={setPayMethod} refValue={payRef} onRef={setPayRef} />
            <Field label="Quick fill">
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setPayAmt(outstanding)}>Full {money(outstanding, false)}</Btn>
                <Btn onClick={() => setPayAmt(R2(outstanding / 2))}>Half</Btn></div></Field>
          </div>
        </Card>)}

      <div className="doc-workspace">
        <Card title="Document details" sub={sale?'Customer, ownership and pricing':'Vendor and purchase terms'}>
          <div className={cx("document-fields",sale&&"sales-document-fields")}>
            <Field label={sale?'Customer':'Vendor'} span={2}><SmartPicker items={partnerOptions(meta.side)} value={d.partner} disabled={locked} autoFocus={!!d.isNew&&!d.partner} onChange={pickPartner} label={sale?'Select customer':'Select vendor'} placeholder={'Search '+(sale?'customers':'vendors')+'…'} onCreate={!locked?name=>setQuick({kind:sale?'customer':'vendor',record:{...newPartner(sale?'customer':'vendor'),name}}):undefined}/></Field>
            <Field label="Counterparty TRN"><div className="readonly">{PMAP[d.partner]?.trn||'Not registered'}</div></Field>
            {sale&&<Field label="Salesperson"><Select value={d.salesman||''} disabled={locked} onChange={e=>set('salesman',e.target.value)}><option value="">Unassigned</option>{state.salespeople.map(p=><option key={p.id} value={p.id}>{p.name}{p.active?'':' (inactive)'}</option>)}</Select></Field>}
            <Field label="Price list"><Select value={d.pricelist||''} disabled={locked} onChange={e=>changePricing({pricelist:e.target.value},true)}><option value="">Product {sale?'sales prices':'costs'}</option>{state.priceLists.filter(x=>x.side===meta.side).map(x=><option key={x.id} value={x.id}>{x.name}{x.active?'':' (inactive)'}</option>)}</Select></Field>
            <Field label={isQuote?'Quotation date':sale?'Invoice date':'Bill date'}><Input type="date" value={d.date} disabled={locked} onChange={e=>changePricing({date:e.target.value})}/></Field>
            <Field label="Payment due"><Input type="date" value={d.due} disabled={locked} onChange={e=>set('due',e.target.value)}/></Field>
            <Field label="Place of supply"><Select value={d.emirate} disabled={locked} onChange={e=>set('emirate',e.target.value)}>{[...EMIRATES,'Export','Import'].map(x=><option key={x}>{x}</option>)}</Select></Field>
            <Field span={sale?2:1} label={sale?'Customer purchase order':'Supplier invoice number'}><Input value={d.ref} disabled={locked} onChange={e=>set('ref',e.target.value)} placeholder="Optional reference"/></Field>
          </div>
        </Card>
        <div className="document-toolbar"><div className="doc-tabs" role="tablist" aria-label="Document views">{[['items','Line items',Layers],...(!isQuote?[['journal','Journal entry',BookOpen]]:[]),['history','Price history',Clock],['status','Activity',CircleCheck]].map(([k,label,I])=><button role="tab" aria-selected={tab===k} key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}><I size={15}/>{label}{k==='items'&&<span>{d.lines.length}</span>}</button>)}</div><div className="acts">{tab==='items'&&<><div className="seg line-view-switch" aria-label="Line layout"><button className={lineView==='compact'?'on':''} onClick={()=>setLineView('compact')}>Compact</button><button className={lineView==='detail'?'on':''} onClick={()=>setLineView('detail')}>Detailed</button></div><Btn size="sm" aria-pressed={showAccounts} onClick={()=>setShowAccounts(x=>!x)}>{showAccounts?'Hide accounts':'Show accounts'}</Btn><Btn size="sm" aria-pressed={showCost} onClick={()=>setShowCost(x=>!x)}>{showCost?'Hide cost':'Show cost'}</Btn>{!locked&&<Btn size="sm" onClick={()=>changePricing({},true)}>Reapply pricing</Btn>}</>}</div></div>
        {tab==='items'&&<>
          <div className="line-section-head"><div><h2>Products & services</h2><p>Search by name, code or barcode. Select a product to fill the line.</p></div>{!locked&&<Btn icon={Plus} kind="pri" onClick={addLine}>Add line</Btn>}</div>
          {!d.lines.length&&<Card><EmptyState icon={Package} title="Start with your first product">Add a blank line, then search or scan a product.</EmptyState>{!locked&&<div className="center"><Btn kind="pri" icon={Plus} onClick={addLine}>Add first line</Btn></div>}</Card>}
          <div className="document-lines">{am.lines.map((l,i)=>{const p=PROD[l.product],st=p&&books.stock[p.id]||{qty:0,value:0},cost=p?(st.qty>0?st.value/st.qty:p.cost):0;
            const last=p?productHistory(state,p.id,meta.side,d.partner,d.id,d.date)[0]:null;
            const def=sale?(l.accounts?.income||p?.income):(p?.kind==='goods'?(l.accounts?.inventory||p?.inventory):(l.accounts?.expense||p?.expense));
            return <article key={l.id} className={cx('doc-line',!p&&'blank',lineView==='compact'&&'compact',expandedLines[l.id]&&'expanded')} data-line-id={l.id}>
              <div className="line-product"><span className="line-num">{String(i+1).padStart(2,'0')}</span><div className="line-picker"><SmartPicker label={'Product on line '+(i+1)} items={productOptions(books)} value={l.product} disabled={locked} placeholder="Search product, ID or barcode…" onChange={pid=>pickProduct(l.id,pid)} onCreate={!locked?name=>setQuick({kind:'product',line:l.id,record:{...newProduct(),name}}):undefined}/>{p&&<small className="product-meta">{[p.brand,categoryOf(p)?.name,p.barcode&&'Barcode '+p.barcode,p.packing].filter(Boolean).join(' · ')||p.id}</small>}</div>
              {p&&<div className="line-stock"><span>Available stock</span>{p.kind==='goods'?<b className={st.qty<=0?'neg':'pos'}>{st.qty} <small>{p.uom}</small></b>:<b>Service</b>}</div>}
              {!locked&&<button className="icon-btn" title={'Remove line '+(i+1)} aria-label={'Remove line '+(i+1)} onClick={()=>setD(s=>({...s,lines:s.lines.filter(x=>x.id!==l.id)}))}><Trash2 size={16}/></button>}
              </div>
              <div className="line-fields">
                <Field label="Description"><Input value={l.desc} disabled={locked||!p} onChange={e=>setLine(l.id,'desc',e.target.value)}/></Field>
              </div>
              <div className="line-values">
                <Field label={'Quantity'+(p?' · '+p.uom:'')}><Input n type="number" min="0" step="0.01" value={l.qty} disabled={locked||!p} onChange={e=>setLine(l.id,'qty',e.target.value)}/></Field>
                <Field label="Unit price · AED"><Input n type="number" min="0" step="0.01" value={l.price} disabled={locked||!p} onChange={e=>setLine(l.id,'price',e.target.value)}/></Field>
                <Field label="Discount %"><Input n type="number" min="0" max="100" step="0.01" value={l.disc||0} disabled={locked||!p} onChange={e=>setLine(l.id,'disc',e.target.value)}/></Field>
                <Field label="VAT treatment"><Select value={l.tax} disabled={locked||!p} onChange={e=>setLine(l.id,'tax',e.target.value)}>{taxes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
                <div className="line-amount"><small>Amount excl. VAT</small><b>{money(l.amount,false)}</b><span>VAT {money(l.taxAmt,false)}</span></div>
              </div>
              {p&&<div className="line-insights"><button className="line-detail-toggle" aria-expanded={!!expandedLines[l.id]} onClick={()=>setExpandedLines(x=>({...x,[l.id]:!x[l.id]}))}><ChevronDown size={13}/>{expandedLines[l.id]?"Hide description":"Description"}</button><span className="price-source">{l.manualPricing?'Manual price':l.priceSource||'Product price'}</span><span>{last?<>Last {sale?'sold':'purchased'}: <b>AED {money(last.unitNet,false)}</b> / {p.uom.toLowerCase()} · {dmy(last.date)} · Qty {last.qty}</>:<>No previous {sale?'sale to this customer':'purchase from this vendor'}</>}</span><button onClick={()=>setHistoryLine(l)}><Clock size={13}/>View history</button>{showCost&&<div className="runtime-cost"><span>Standard cost <b>{money(p.cost,false)}</b></span><span>Current stock cost <b>{money(cost,false)}</b></span>{sale&&<span>Est. margin / unit <b className={l.price*(1-(l.disc||0)/100)-cost<0?'neg':'pos'}>{money(l.price*(1-(l.disc||0)/100)-cost,false)}</b></span>}<small>Current costs · AED · before VAT</small></div>}{showAccounts&&<div className="runtime-account"><Field label="Account">{p?.kind==='goods'&&!sale?<div className="readonly">{def} · {ACC[def]?.name}</div>:<Select aria-label={'Account on line '+(i+1)} value={l.account||def||''} disabled={locked||!p} onChange={e=>setLine(l.id,'account',e.target.value)}><option value="">Select product first</option>{accounts.map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</Select>}</Field><span className="account-source">{p.kind==='goods'&&!sale?'Inventory account from product category':l.account?'Line account override':'Default from product category'}</span>{!locked&&l.account&&!(p.kind==='goods'&&!sale)&&<button onClick={()=>setLine(l.id,'account',null)}><RotateCcw size={13}/>Use category default</button>}</div>}</div>}
            </article>;})}</div>
          <Card><div className="document-bottom"><Field label="Internal note"><textarea className="inp" rows={3} value={d.note} disabled={locked} placeholder="Delivery terms, references or notes…" onChange={e=>set('note',e.target.value)}/></Field><div className="sumbox"><div className="sumrow"><span className="k">Subtotal before discount</span><span className="v">{money(d.lines.reduce((s,l)=>s+R2(l.qty*l.price),0),false)}</span></div><div className="sumrow"><span className="k">Line discounts</span><span className="v">{money(d.lines.reduce((s,l)=>s+R2(l.qty*l.price),0)-am.net,false)}</span></div><div className="sumrow"><span className="k">Subtotal excluding VAT</span><span className="v">{money(am.net,false)}</span></div><div className="sumrow"><span className="k">VAT charged</span><span className="v">{money(am.vat,false)}</span></div>{am.rcm>0&&<div className="sumrow"><span>Reverse charge</span><span>{money(am.rcm,false)}</span></div>}<div className="sumrow total"><span className="k">Total · AED</span><span className="v">{money(am.total,false)}</span></div></div></div></Card>
          {!locked&&<div className="document-dock"><Btn icon={Plus} onClick={addLine}>Add line</Btn><span>{d.lines.length} items</span><div><small>Total · AED</small><b>{money(am.total,false)}</b></div><Btn onClick={save}>Save {isQuote?'quotation':'draft'}</Btn></div>}
        </>}
        {tab==='journal'&&<div className="journal-tab"><div className="info-strip"><BookOpen size={20}/><span><b>{locked?'Posted journal entry':'Journal preview'}</b><br/>{locked?'The ledger entry for this document.':'This preview updates as you edit. Posting creates the ledger entry.'}</span></div><PostingPreview lines={preview} title={locked?'Posted journal entry':'Journal preview · AED'}/></div>}
        {tab==='history'&&<Card title={sale?'Customer purchase history':'Vendor purchase history'} sub="Select a product to compare posted prices."><SmartPicker items={productOptions(books)} value={historyProduct} label="History product" onChange={setHistoryProduct}/>{historyProduct?<HistoryTable key={historyProduct+d.partner} state={state} product={historyProduct} side={meta.side} partner={d.partner} exclude={d.id} date={d.date}/>:<EmptyState icon={Clock} title="Choose a product">See transaction date, quantity, price, discount and net unit price.</EmptyState>}</Card>}
        {tab==='status'&&<Card title={isQuote?'Quotation progress':'Document activity'}><div className="tl">{(isQuote?['draft','sent','accepted','invoiced'].map(k=>({t:QUOTE_STATES[k].label,done:['draft','sent','accepted','invoiced'].indexOf(d.state)>=['draft','sent','accepted','invoiced'].indexOf(k)})):timeline).map((t,i)=><div key={i} className={cx('tl-row',t.done?'done':'pending')}><span className="dot"><i/></span><span className="tt"><b>{t.t}</b>{t.s&&<span>{t.s}</span>}</span></div>)}</div></Card>}
      </div>
      {quick&&<MasterModal kind={quick.kind} initial={quick.record} state={state} setState={setState} books={books} toast={toast} close={()=>setQuick(null)} onSaved={rec=>{if(quick.kind==='product')pickProduct(quick.line,rec.id);else pickPartner(rec.id);}}/>}
      {historyLine&&<StudioModal wide title={PROD[historyLine.product]?.name||'Product history'} sub={sale?'Previous prices charged to your customer':'Previous prices charged by your vendor'} close={()=>setHistoryLine(null)}><HistoryTable state={state} product={historyLine.product} side={meta.side} partner={d.partner} exclude={d.id} date={d.date} apply={!locked?l=>{setD(s=>({...s,lines:s.lines.map(x=>x.id===historyLine.id?{...x,price:l.price,disc:l.disc||0,manualPricing:true}:x)}));setHistoryLine(null);toast('Historical price and discount applied');}:undefined}/></StudioModal>}
    </div>
  );
}

/* ------------------------------------------------- FTA-compliant printout */
const CAP_NOTE = {
  yes: null,
  maybe: null,
  insecure: {
    head: "This page is not on a secure origin",
    body: "Browsers only allow file sharing over https:// or on localhost. You are on a plain http:// address, so the PDF cannot be handed to WhatsApp. Open Invoeez at http://localhost:8080 or put it behind https and the attachment works automatically — this is the usual reason it stops working after it worked once.",
  },
  unsupported: {
    head: "This browser cannot share files",
    body: "Web Share with attachments is missing here. Chrome and Edge on Windows 11, Safari on macOS and iOS, and Chrome on Android all support it.",
  },
  nofiles: {
    head: "This browser shares links but not files",
    body: "Web Share is present but refuses file payloads, which some desktop builds still do.",
  },
};
function SendDialog({ channel, close, deliver, doc, party, msg, fileName, cap, waNumber }) {
  const wa = channel === "wa";
  const attaches = cap.ok;
  const note = CAP_NOTE[cap.why];
  const target = wa ? (party.phone || "no number on file") : (party.contact || "no email on file");
  const missing = wa ? !waNumber : !party.contact;
  return (
    <div className="scrim" style={{ zIndex: 70 }} onMouseDown={close}>
      <div className="cmdk" style={{ maxWidth: 560, marginTop: "9vh" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="card-h">
          <span className={cx("gt sm", wa ? "g3" : "g1")}>
            {wa ? <MessageCircle size={16} strokeWidth={1.9} /> : <Mail size={16} strokeWidth={1.9} />}</span>
          <div><h3>Send {doc.number} by {wa ? "WhatsApp" : "email"}</h3>
            <p>To {party.name} · {target}</p></div>
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={close}><X size={16} /></button>
        </div>
        <div style={{ padding: "16px 19px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            border: "1px solid var(--line)", borderRadius: "var(--r)", background: "var(--surface-2)" }}>
            <span className="gt sm g7"><FileDown size={16} strokeWidth={1.9} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 13, fontWeight: 600, display: "block" }}>{fileName}</b>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Tax invoice PDF, generated from this document</span>
            </div>
            <Pill tone={attaches ? "ok" : "warn"} dot>{attaches ? "Attaches automatically" : "Manual attach"}</Pill>
          </div>

          <div className="micro" style={{ margin: "17px 0 8px" }}>Message</div>
          <div style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: "var(--r)",
            background: "var(--surface-2)", fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap",
            maxHeight: 150, overflowY: "auto", color: "var(--ink-2)" }}>{msg}</div>

          <div style={{ marginTop: 16, padding: "13px 14px", borderRadius: "var(--r)",
            background: attaches ? "var(--pos-50)" : "var(--warn-50)",
            color: attaches ? "var(--pos)" : "var(--warn)", fontSize: 12, lineHeight: 1.6,
            display: "flex", gap: 11 }}>
            {attaches ? <Check size={16} strokeWidth={2.2} style={{ flex: "0 0 16px", marginTop: 1 }} />
              : <CircleAlert size={16} strokeWidth={1.9} style={{ flex: "0 0 16px", marginTop: 1 }} />}
            <span>{attaches
              ? "Your browser can hand the PDF straight to the share sheet, so it goes across attached to the message."
              : <>
                {note && <><b style={{ display: "block", marginBottom: 4 }}>{note.head}</b>{note.body}{" "}</>}
                {wa
                  ? "Meanwhile a wa.me link cannot carry a file — that is a WhatsApp limitation, not a setting. Invoeez will save the PDF, copy the message to your clipboard and open the chat; attach it with the paperclip. Fully automatic sending needs the WhatsApp Business API and a server."
                  : "Your mail client opens with the message ready. The PDF is saved to your downloads — attach it before sending."}
              </>}</span>
          </div>

          {missing && <div style={{ marginTop: 12, fontSize: 12, color: "var(--neg)" }}>
            No {wa ? "WhatsApp number" : "email address"} on file for {party.name}. Add one under Customers &amp; vendors.</div>}
        </div>
        <div className="savebar">
          <span>{attaches ? "One step" : "Two steps: send, then attach"}</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Btn onClick={close}>Cancel</Btn>
            <Btn kind={wa ? "wa" : "pri"} icon={Send} disabled={missing} onClick={() => deliver(channel)}>
              {attaches ? "Share with PDF" : wa ? "Open WhatsApp" : "Open email"}</Btn>
          </span>
        </div>
      </div>
    </div>
  );
}

function PrintDoc({ d, close, fta, toast }) {
  const CO = useCo();
  const am = amounts(d), p = PMAP[d.partner], isCN = d.type === "credit_note";
  const words = (n) => {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const w = (x) => x < 20 ? a[x] : x < 100 ? b[Math.floor(x / 10)] + (x % 10 ? "-" + a[x % 10] : "")
      : x < 1000 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + w(x % 100) : "")
      : x < 1e6 ? w(Math.floor(x / 1000)) + " Thousand" + (x % 1000 ? " " + w(x % 1000) : "")
      : w(Math.floor(x / 1e6)) + " Million" + (x % 1e6 ? " " + w(x % 1e6) : "");
    const whole = Math.floor(n), fils = Math.round((n - whole) * 100);
    return `${w(whole) || "Zero"} Dirhams${fils ? ` and ${w(fils)} Fils` : ""} only`;
  };
  const title = isCN ? "Tax Credit Note" : "Tax Invoice";
  const msg = (fta.waTemplate || DEFAULT_WA)
    .replace(/{customer}/g, p.name).replace(/{document}/g, d.number).replace(/{title}/g, title)
    .replace(/{amount}/g, `AED ${money(am.total, false)}`).replace(/{due}/g, dmy(d.due))
    .replace(/{company}/g, CO.name).replace(/{date}/g, dmy(d.date));

  const buildPdf = () => {
    const JS = window.jspdf && window.jspdf.jsPDF;
    if (!JS) { window.print(); return; }
    const doc = new JS({ orientation: "portrait", unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(11, 65, 51); doc.rect(0, 0, W, 118, "F");
    doc.setFillColor(214, 171, 87); doc.rect(0, 116, W, 2.5, "F");
    let ty = 44;
    if (CO.logo) { try { doc.addImage(CO.logo, 40, 26, 0, 26); ty = 68; } catch (e) {} }
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(CO.name, 40, ty);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(196, 216, 210);
    doc.text(`${CO.address}\n${CO.city}\n${CO.phone}  ·  ${CO.email}`, 40, ty + 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), W - 40, 44, { align: "right" });
    doc.setFont("courier", "normal"); doc.setFontSize(11); doc.setTextColor(242, 215, 155);
    doc.text(d.number, W - 40, 62, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(196, 216, 210);
    doc.text(`Issued ${dmy(d.date)}\nDue ${dmy(d.due)}\nPlace of supply: ${d.emirate}`, W - 40, 78, { align: "right" });
    doc.setTextColor(20, 42, 52); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text("SUPPLIER", 40, 148); doc.text("RECIPIENT", W / 2, 148);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`${CO.name}\n${CO.address}\n${CO.city}\nTRN ${CO.trn}`, 40, 162);
    doc.text(`${p.name}\n${p.address}\n${p.emirate}\nTRN ${p.trn || "not registered"}`, W / 2, 162);
    doc.autoTable({
      startY: 224, margin: { left: 40, right: 40 },
      head: [["#", "Description", "Qty", "Unit price", "Taxable", "VAT %", "VAT", "Total"]],
      body: am.lines.map((l, i) => [i + 1, l.desc, `${l.qty}`, money(l.price, false), money(l.amount, false),
        `${l.rate}%`, money(l.taxAmt, false), money(l.amount + l.taxAmt, false)]),
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 6, lineColor: [225, 233, 237], lineWidth: 0.4 },
      headStyles: { fillColor: [242, 246, 247], textColor: [70, 96, 107], fontStyle: "bold", fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 22 }, 2: { halign: "right" }, 3: { halign: "right" },
        4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right", fontStyle: "bold" } },
    });
    let fy = doc.lastAutoTable.finalY + 22;
    doc.setFillColor(245, 249, 248); doc.setDrawColor(220, 234, 229);
    doc.roundedRect(W - 250, fy - 14, 210, 78, 5, 5, "FD");
    doc.setFontSize(9); doc.setTextColor(90, 115, 127);
    doc.text("Taxable amount", W - 236, fy + 2); doc.text("VAT", W - 236, fy + 20);
    doc.setTextColor(20, 42, 52);
    doc.text(money(am.net, false), W - 54, fy + 2, { align: "right" });
    doc.text(money(am.vat, false), W - 54, fy + 20, { align: "right" });
    doc.setDrawColor(203, 224, 217); doc.line(W - 236, fy + 30, W - 54, fy + 30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(11, 65, 51);
    doc.text("TOTAL AED", W - 236, fy + 48);
    doc.text(money(am.total, false), W - 54, fy + 48, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 115, 127);
    doc.text(doc.splitTextToSize(words(am.total), W / 2 - 30), 40, fy + 2);
    doc.setFontSize(7); doc.setTextColor(150, 168, 178);
    doc.text(doc.splitTextToSize(`Issued under Federal Decree-Law No. 8 of 2017 on Value Added Tax and its Executive Regulations. All amounts in ${CO.currency}. Trade licence ${CO.licence}.`, W - 80),
      40, doc.internal.pageSize.getHeight() - 54);
    return doc;
  };
  const fileName = `${d.number.replace(/\//g, "-")}.pdf`;
  const savePdf = () => {
    const doc = buildPdf();
    if (!doc) { window.print(); return; }
    if (!saveBlob(doc.output("blob"), fileName)) toast && toast("The browser blocked that download", "warn");
    else toast && toast(`${fileName} downloaded`);
  };

  /* Share sheets accept real files, so the customer gets the PDF, not just a link. */
  /* File sharing needs a secure context and Web Share Level 2. Work out which
     of those is missing so the dialog can say something useful. */
  const shareCap = () => {
    if (typeof window === "undefined" || !window.navigator) return { ok: false, why: "unsupported" };
    if (window.isSecureContext === false) return { ok: false, why: "insecure" };
    if (typeof navigator.share !== "function") return { ok: false, why: "unsupported" };
    if (typeof File !== "function") return { ok: false, why: "unsupported" };
    if (typeof navigator.canShare !== "function") return { ok: true, why: "maybe" };
    try {
      const probe = new File([new Blob(["%PDF-1.4"], { type: "application/pdf" })], "probe.pdf", { type: "application/pdf" });
      return navigator.canShare({ files: [probe] }) ? { ok: true, why: "yes" } : { ok: false, why: "nofiles" };
    } catch (e) { return { ok: true, why: "maybe" }; }
  };
  const cap = shareCap();
  const [sendTo, setSendTo] = useState(null);
  const waNumber = String(p.phone || "").replace(/[^0-9]/g, "");

  const deliver = async (channel) => {
    const doc = buildPdf();
    const blob = doc ? doc.output("blob") : null;
    /* Try the real file even when the probe was only "maybe" — some browsers
       expose share() without canShare(), and a synthetic probe can under-report. */
    if (blob && cap.ok) {
      try {
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${title} ${d.number}`, text: msg });
          toast && toast(`${d.number} shared with the PDF attached`);
          setSendTo(null);
          return;
        }
      } catch (e) { if (e && e.name === "AbortError") { setSendTo(null); return; } }
    }
    if (blob) saveBlob(blob, fileName);
    try { if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(msg); } catch (e) {}
    if (channel === "wa") {
      if (!waNumber) { toast && toast(`No WhatsApp number on file for ${p.name}`, "warn"); return; }
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      const body = msg + `\n\n${CO.name}\n${CO.phone}\n${CO.email}`;
      window.open(`mailto:${encodeURIComponent(p.contact || "")}?subject=${encodeURIComponent(`${title} ${d.number} from ${CO.name}`)}&body=${encodeURIComponent(body)}`, "_blank");
    }
    toast && toast(`${fileName} saved — attach it with the paperclip in the window that opened`, "warn");
    setSendTo(null);
  };


  return (
    <div className="scrim" onMouseDown={close}>
      {sendTo && <SendDialog channel={sendTo} close={() => setSendTo(null)} deliver={deliver}
        doc={d} party={p} msg={msg} fileName={fileName} cap={cap} waNumber={waNumber} />}
      <div style={{ maxWidth: 880, width: "100%", margin: "0 auto" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sendbar noprint">
          <Btn icon={FileDown} onClick={savePdf}>Download PDF</Btn>
          <Btn icon={Printer} onClick={() => window.print()}>Print</Btn>
          <Btn icon={Mail} onClick={() => setSendTo("mail")}>Email</Btn>
          <Btn kind="wa" icon={MessageCircle} onClick={() => setSendTo("wa")}>WhatsApp</Btn>
          <Btn icon={X} onClick={close}>Close</Btn>
        </div>
        <div className="sheet">
          <div className="sheet-crest">
            <div className="rowtop">
              <div style={{ flex: 1, minWidth: 0 }}>
                {CO.logo && <img className="sheet-logo" src={CO.logo} alt="" />}
                <h1>{CO.name}</h1>
                <div className="sub">{CO.address}<br />{CO.city}<br />{CO.phone} · {CO.email}</div>
              </div>
              <div className="doc">
                <span className="badge">{title}</span>
                <div className="no">{d.number}</div>
                <div className="dt">Issued {dmy(d.date)}<br />Due {dmy(d.due)}<br />Place of supply: {d.emirate}</div>
              </div>
            </div>
          </div>
          <div className="sheet-body">
            <div className="sheet-parties">
              {[["Supplier", CO.name, `${CO.address}, ${CO.city}`, CO.trn],
                ["Billed to", p.name, p.address, p.trn]].map(([t, n, ad, trn]) => (
                <div className="blk" key={t}>
                  <div className="lb">{t}</div><div className="nm">{n}</div><div className="ad">{ad}</div>
                  <div className="trn">TRN {trn || <span style={{ color: "#98ADB7" }}>not registered</span>}</div>
                </div>))}
              <div className="blk" style={{ flex: "0 0 168px" }}>
                <div className="lb">Payment terms</div>
                <div className="ad" style={{ marginTop: 7 }}>
                  Net {daysBetween(d.date, d.due)} days<br />Due {dmy(d.due)}
                  {d.ref && <><br />Your ref: {d.ref}</>}</div>
              </div>
            </div>
            <div className="tbl-wrap" style={{ marginTop: 22 }}><table className="tbl" style={{ fontSize: 12.5 }}>
              <thead><tr><th style={{ width: 32 }}>#</th><th>Description</th><th className="n">Qty</th>
                <th className="n">Unit price</th><th className="n">Taxable</th><th className="n">VAT %</th>
                <th className="n">VAT</th><th className="n">Total</th></tr></thead>
              <tbody>{am.lines.map((l, i) => (
                <tr key={l.id}>
                  <td className="mono" style={{ fontSize: 11.5, color: "#98ADB7" }}>{i + 1}</td>
                  <td><b style={{ fontWeight: 500 }}>{l.desc}</b>
                    <div style={{ fontSize: 11, color: "#98ADB7", marginTop: 2 }}>{PROD[l.product].code}</div></td>
                  <td className="n">{l.qty} {PROD[l.product].uom}</td>
                  <td className="n">{money(l.price, false)}</td><td className="n">{money(l.amount, false)}</td>
                  <td className="n">{l.rate}%</td><td className="n">{money(l.taxAmt, false)}</td>
                  <td className="n" style={{ fontWeight: 600 }}>{money(l.amount + l.taxAmt, false)}</td>
                </tr>))}</tbody>
            </table></div>
            <div style={{ display: "flex", gap: 28, marginTop: 26, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 290px", minWidth: 0 }}>
                <div className="sheet-parties" style={{ border: "none", padding: 0 }}>
                  <div className="blk"><div className="lb">Amount in words</div>
                    <div style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.6 }}>{words(am.total)}</div></div>
                </div>
                {d.note && <div className="payblk" style={{ marginTop: 16 }}>{d.note}</div>}
                <div className="payblk" style={{ marginTop: 16 }}>
                  <b style={{ color: "#08191F" }}>Payment</b><br />
                  Bank transfer to {CO.name}<br />Quote {d.number} as the payment reference.
                </div>
              </div>
              <div style={{ flex: "0 0 288px" }}>
                <div className="totbox">
                  <div className="sumrow"><span className="k">Taxable amount</span><span className="v">{money(am.net, false)}</span></div>
                  <div className="sumrow"><span className="k">VAT</span><span className="v">{money(am.vat, false)}</span></div>
                  {am.rcm > 0 && <div className="sumrow"><span className="k">Reverse charge</span><span className="v">{money(am.rcm, false)}</span></div>}
                  <div className="grand"><b>{isCN ? "TOTAL CREDITED" : "TOTAL PAYABLE"} · AED</b><span>{money(am.total, false)}</span></div>
                </div>
                <div style={{ marginTop: 40, paddingTop: 10, borderTop: "1px solid #DFE8EC", fontSize: 10.5, color: "#8CA0AA" }}>
                  Authorised signatory</div>
              </div>
            </div>
            <div className="foot">
              <span style={{ flex: "1 1 340px" }}>Issued under Federal Decree-Law No. 8 of 2017 on Value Added Tax
                and its Executive Regulations. All amounts in {CO.currency}. Trade licence {CO.licence}.</span>
              <span>{CO.name} · TRN {CO.trn}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function nextPay(list, kind) {
  const n = list.filter((p) => p.kind === kind).reduce((m, p) => Math.max(m, +p.number.split("/").pop() || 0), 0);
  return `${kind === "in" ? "RCPT" : "PAYM"}/${TODAY.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`;
}

function PaymentsScreen({ state, setState, toast }) {
  const [nw, setNw] = useState(null);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const blank = (kind) => {
    const m = methodsFor(kind === "in" ? "in" : "out")[0] || METHODS[0];
    return { id: uid("pm"), kind, number: nextPay(state.payments, kind),
      partner: "",
      date: TODAY, amount: 0, method: m.id, account: m.account, memo: "" };
  };
  const pickMethod = (id) => setNw((p) => ({ ...p, method: id, account: MET[id] ? MET[id].account : p.account }));
  const list = state.payments.slice().sort((a, b) => b.date.localeCompare(a.date))
    .filter((p) => hits(q, p.number, PMAP[p.partner] ? PMAP[p.partner].name : "", p.memo,
      methodName(p.method), ACC[p.account] ? ACC[p.account].name : "", String(p.amount)));
  const rec = R2(list.filter((p) => p.kind === "in").reduce((s, p) => s + p.amount, 0));
  const paid = R2(list.filter((p) => p.kind === "out").reduce((s, p) => s + p.amount, 0));
  const add = () => { setState((s) => ({ ...s, payments: [...s.payments, nw] }));
    toast(`${nw.number} recorded`); setNw(null); };

  return (
    <div>
      <PageHead eyebrow="Treasury" title="Receipts &amp; payments"
        sub="Settled against the oldest open document for each counterparty.">
        <Btn icon={ArrowDownLeft} onClick={() => setNw(blank("in"))}>Record receipt</Btn>
        <Btn icon={ArrowUpRight} onClick={() => setNw(blank("out"))}>Record payment</Btn>
      </PageHead>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(232px,1fr))", marginBottom: 16 }}>
        <StatCard label="Received from customers" icon={ArrowDownLeft} num={rec} deltaLabel={`${list.filter((p) => p.kind === "in").length} receipts`} />
        <StatCard label="Paid to vendors" icon={ArrowUpRight} tone="g" num={paid} deltaLabel={`${list.filter((p) => p.kind === "out").length} payments`} />
        <StatCard label="Net cash movement" icon={Banknote} tone="i" num={R2(rec - paid)} deltaLabel="year to date" />
      </div>

      {nw && (
        <Card title={nw.kind === "in" ? "New customer receipt" : "New vendor payment"}
          right={<><Btn onClick={() => setNw(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} onClick={add} disabled={!nw.amount || !PMAP[nw.partner]}>Record</Btn></>}
          style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            <Field label="Number"><Input value={nw.number} onChange={(e) => setNw({ ...nw, number: e.target.value })} /></Field>
            <Field label={nw.kind === "in" ? "Customer" : "Vendor"}>
              <Select value={nw.partner} onChange={(e) => setNw({ ...nw, partner: e.target.value })}>
                <option value="">{nw.kind === "in" ? "Choose a customer…" : "Choose a vendor…"}</option>
                {PARTNERS.filter((p) => (nw.kind === "in" ? p.role === "customer" : p.role === "vendor")).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select></Field>
            <Field label="Date"><Input type="date" value={nw.date} onChange={(e) => setNw({ ...nw, date: e.target.value })} /></Field>
            <Field label="Amount · AED"><Input n type="number" step="0.01" value={nw.amount} onChange={(e) => setNw({ ...nw, amount: +e.target.value || 0 })} /></Field>
            <MethodPicker dir={nw.kind === "in" ? "in" : "out"} value={nw.method} onChange={pickMethod}
              refValue={nw.memo} onRef={(v) => setNw({ ...nw, memo: v })} />
            <Field label="Notes"><Input value={nw.memo} placeholder="Anything worth recording"
              onChange={(e) => setNw({ ...nw, memo: e.target.value })} /></Field>
          </div>
        </Card>)}

      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search number, counterparty, memo or amount" width={310} />
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>
            {list.length} of {state.payments.length}</span>
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Number</th><th>Direction</th><th>Counterparty</th><th>Date</th><th>Method</th>
            <th>Account</th><th>Memo</th><th className="n">Amount</th><th style={{ width: 44 }} /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9}>
              <EmptyState icon={Wallet} title={`Nothing matches “${q}”`} /></td></tr>}
            {list.slice(0, limit).map((p) => (
            <tr key={p.id}>
              <td className="mono" style={{ fontSize: 12.5 }}>{p.number}</td>
              <td><Pill tone={p.kind === "in" ? "ok" : "info"} dot>{p.kind === "in" ? "Received" : "Paid"}</Pill></td>
              <td><Party name={PMAP[p.partner].name} /></td>
              <td className="muted">{dmy(p.date)}</td>
              <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={cx("gt sm", MET[p.method] ? METHOD_KINDS[MET[p.method].kind].grad : "g1")}
                  style={{ width: 26, height: 26, flexBasis: 26, borderRadius: 8 }}>
                  <Banknote size={13} strokeWidth={1.9} /></span>
                <span style={{ fontSize: 12.5 }}>{methodName(p.method)}</span></div></td>
              <td className="muted" style={{ fontSize: 12.5 }}>{ACC[p.account].code} {ACC[p.account].name}</td>
              <td className="muted" style={{ fontSize: 12.5 }}>{p.memo || "—"}</td>
              <td className="n" style={{ fontWeight: 600, color: p.kind === "in" ? "var(--pos)" : undefined }}>{money(p.amount)}</td>
              <td><button className="icon-btn" style={{ width: 28, height: 28 }}
                onClick={() => { setState((s) => ({ ...s, payments: s.payments.filter((x) => x.id !== p.id) })); toast(`${p.number} deleted`, "warn"); }}>
                <Trash2 size={14} /></button></td>
            </tr>))}</tbody>
          {list.length > limit && <tbody><tr><td colSpan={9} className="show-more">
            <Btn onClick={() => setLimit((n) => n + 200)}>Show {Math.min(200, list.length - limit)} more · {list.length - limit} older</Btn></td></tr></tbody>}
        </table></div>
      </Card>
    </div>
  );
}

function PartnersScreen({ state, setState, go, toast, books, param }) {
  const [role, setRole] = useState("all");
  const [imp, setImp] = useState(false);
  const [q, setQ] = useState("");
  const [ed, setEd] = useState(null);
  React.useEffect(()=>{if(param && PMAP[param]){setEd({...PMAP[param]});scrollPageTop();}},[param]);
  const custom = state.partners || [];
  const blank = (r) => ({ id: uid("p"), name: "", role: r, trn: "", emirate: "Dubai", address: "",
    contact: "", phone: "", terms: 30, custom: true });
  const valid = ed && ed.name.trim().length > 1 && (!ed.trn || /^\d{15}$/.test(ed.trn.trim()));
  const isNew = ed && !PARTNERS.some((p) => p.id === ed.id);
  const save = () => {
    const rec = { ...ed, name: ed.name.trim(), trn: ed.trn.trim(), terms: +ed.terms || 0 };
    setState((x) => { const list = x.partners || [];
      return { ...x, partners: list.some((p) => p.id === rec.id)
        ? list.map((p) => (p.id === rec.id ? rec : p)) : [...list, rec] }; });
    toast(`${rec.name} saved`); setEd(null);
  };
  const remove = (p) => {
    if (state.docs.some((d) => d.partner === p.id) || state.payments.some((x) => x.partner === p.id)) {
      toast(`${p.name} has documents and cannot be deleted`, "warn"); return; }
    setState((x) => ({ ...x, partners: (x.partners || []).filter((q) => q.id !== p.id) }));
    toast(`${p.name} removed`, "warn");
  };
  const ar = useMemo(() => aging(state, "receivable", TODAY), [state]);
  const ap = useMemo(() => aging(state, "payable", TODAY), [state]);
  const balOf = (p) => { const r = (p.role === "customer" ? ar : ap).rows.find((x) => x.partner.id === p.id); return r ? r.total : 0; };
  const list = PARTNERS.filter((p) => role === "all" || p.role === role)
    .filter((p) => hits(q, p.name, p.trn, p.contact, p.phone, p.emirate, p.address));
  return (
    <div>
      <PageHead eyebrow="Master data" title="Customers &amp; vendors"
        sub={`${PARTNERS.filter((p) => p.role === "customer").length} customers · ${PARTNERS.filter((p) => p.role === "vendor").length} vendors. TRN and territory drive the VAT treatment on every document.`}>
        <Btn icon={FileSpreadsheet} onClick={() => setImp(true)}>Import from Excel</Btn>
        <Btn kind="pri" icon={Plus} onClick={() => setEd(blank("customer"))}>New customer or vendor</Btn>
      </PageHead>
      {imp && <ImportDialog kind="partners" state={state} setState={setState} books={books} toast={toast} close={() => setImp(false)} />}

      {ed && (
        <Card title={isNew ? "New customer or vendor" : `Edit ${ed.name || ed.role}`}
          sub="A 15-digit TRN makes the counterparty VAT registered; leave it blank for unregistered or export parties"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setEd(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>{isNew ? "Create" : "Save changes"}</Btn></>}>
          <div className="picks">
            {[["customer", "Customer", Receipt, "You invoice them. Supplies are reported by emirate in Box 1 of the VAT return."],
              ["vendor", "Vendor", ShoppingCart, "They bill you. Input VAT is recovered in Box 9, or self-accounted if imported."]]
              .map(([k, label, I, note]) => (
              <button key={k} className={cx("pick", ed.role === k && "on")}
                onClick={() => setEd({ ...ed, role: k })}>
                <span className="pi"><I size={17} strokeWidth={1.8} /></span>
                <span className="pt"><b>{label}</b><span>{note}</span></span>
                <span className="chk">{ed.role === k && <Check size={11} strokeWidth={3.2} />}</span>
              </button>))}
          </div>
          <div className="setgrid">
            <Field label="Registered name" span={2}>
              <Input value={ed.name} placeholder="Al Manara Trading L.L.C." onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
            <Field label="TRN">
              <Input value={ed.trn} placeholder="15 digits, or blank" onChange={(e) => setEd({ ...ed, trn: e.target.value })} />
              {ed.trn && !/^\d{15}$/.test(ed.trn.trim()) &&
                <div style={{ fontSize: 11.5, color: "var(--neg)", marginTop: 5 }}>A UAE TRN is exactly 15 digits</div>}</Field>
            <Field label="Territory">
              <Select value={ed.emirate} onChange={(e) => setEd({ ...ed, emirate: e.target.value })}>
                {[...EMIRATES, "Export", "Import"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Payment terms (days)">
              <Input n type="number" value={ed.terms} onChange={(e) => setEd({ ...ed, terms: e.target.value })} /></Field>
            {ed.role === "customer" && <Field label="Salesperson"><Select value={ed.salesman||""} onChange={e=>setEd({...ed,salesman:e.target.value})}><option value="">Unassigned</option>{(state.salespeople||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>}
            <Field label="Default price list"><Select value={ed.pricelist||""} onChange={e=>setEd({...ed,pricelist:e.target.value})}><option value="">Product prices</option>{(state.priceLists||[]).filter(x=>x.side===(ed.role==="customer"?"sale":"purchase")).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
            <Field label="Address" span={2}>
              <Input value={ed.address} placeholder="Office, street, area" onChange={(e) => setEd({ ...ed, address: e.target.value })} /></Field>
            <Field label="Email">
              <Input value={ed.contact} placeholder="accounts@company.ae" onChange={(e) => setEd({ ...ed, contact: e.target.value })} /></Field>
            <Field label="WhatsApp number">
              <Input value={ed.phone} placeholder="+971 50 123 4567" onChange={(e) => setEd({ ...ed, phone: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-3)" }}>
            {ed.role === "customer"
              ? ed.emirate === "Export" ? "Exports are zero-rated — invoices will default to 0% VAT."
                : `Standard-rated supplies will be reported under ${ed.emirate} in Box 1 of the return.`
              : ed.emirate === "Import" ? "Imports self-account under the reverse charge — Box 3 and Box 10."
                : "Local purchases recover input VAT in Box 9."}
          </div>
        </Card>)}
      <Card pad={false}>
        <div className="toolbar">
          <div className="seg">{[["all", "All"], ["customer", "Customers"], ["vendor", "Vendors"]].map(([k, l]) => (
            <button key={k} className={cx(role === k && "on")} onClick={() => setRole(k)}>{l}</button>))}</div>
          <SearchBox value={q} onChange={setQ} placeholder="Search name, TRN, email or phone" width={280} />
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>
            {list.length} of {PARTNERS.length}</span>
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Name</th><th>Role</th><th>TRN</th><th>Territory</th><th>Address</th>
            <th className="n">Terms</th><th className="n">Open balance</th><th style={{ width: 168 }} /></tr></thead>
          <tbody>{!list.length && <tr><td colSpan={8}>
            <EmptyState icon={Users} title={PARTNERS.length ? "Nothing matches this search" : "Add your customers and vendors"}>
              {PARTNERS.length ? "Clear the search or switch back to All." : "Add them one by one, or import a list from Excel with TRN, terms and opening balances."}</EmptyState>
            {!PARTNERS.length && <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}>
              <Btn icon={FileSpreadsheet} onClick={() => setImp(true)}>Import from Excel</Btn>
              <Btn kind="pri" icon={Plus} onClick={() => setEd(blank("customer"))}>New customer or vendor</Btn></div>}</td></tr>}
            {list.map((p) => (
            <tr key={p.id}>
              <td><Party name={p.name} meta={[p.contact || p.phone,(state.salespeople||[]).find(x=>x.id===p.salesman)?.name].filter(Boolean).join(" · ")} /></td>
              <td><Pill tone={p.role === "customer" ? "ok" : "info"}>{p.role}</Pill></td>
              <td className="mono" style={{ fontSize: 12.5 }}>{p.trn || <span className="muted">Unregistered</span>}</td>
              <td>{p.emirate}{p.designatedZone && <div><Pill tone="gold">Designated zone</Pill></div>}</td>
              <td className="muted" style={{ fontSize: 12.5 }}>{p.address}</td>
              <td className="n">{p.terms} days</td>
              <td className="n" style={{ fontWeight: 600 }}>{money(balOf(p))}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="icon-btn" style={{ width: 28, height: 28, display: "inline-grid", verticalAlign: "-8px" }}
                  title="Statement of account" onClick={() => go("r_stmt", p.id)}><Send size={13} /></button>
                <button className="icon-btn" style={{ width: 28, height: 28, display: "inline-grid", verticalAlign: "-8px" }}
                  title="Edit" onClick={() => setEd({ ...p })}><Pencil size={13} /></button>
                <button className="icon-btn" style={{ width: 28, height: 28, display: "inline-grid", verticalAlign: "-8px" }}
                  title="Remove" onClick={() => remove(p)}><Trash2 size={13} /></button>
                <Btn size="sm" kind="ghost" onClick={() => go("r_partner", p.id)}>Ledger <ChevronRight size={13} /></Btn></td>
            </tr>))}</tbody>
        </table></div>
      </Card>
    </div>
  );
}

function LegacyProductsScreen({ books, state, setState, toast }) {
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [ed, setEd] = useState(null);
  const custom = state.products || [];
  const blank = (k) => ({ id: uid("pr"), code: "", name: "", kind: k, uom: k === "goods" ? "Units" : "Hours",
    price: 0, cost: 0, tax: "s5", income: k === "goods" ? "4100" : "4200",
    expense: k === "goods" ? "5100" : "6900", custom: true });
  const codeTaken = ed && PRODUCTS.some((p) => p.code.toLowerCase() === ed.code.trim().toLowerCase() && p.id !== ed.id);
  const valid = ed && ed.code.trim().length > 1 && ed.name.trim().length > 1 && !codeTaken;
  const isNew = ed && !PRODUCTS.some((p) => p.id === ed.id);
  const save = () => {
    const rec = { ...ed, code: ed.code.trim(), name: ed.name.trim(), price: +ed.price || 0, cost: +ed.cost || 0 };
    setState((x) => { const list = x.products || [];
      return { ...x, products: list.some((p) => p.id === rec.id)
        ? list.map((p) => (p.id === rec.id ? rec : p)) : [...list, rec] }; });
    toast(`${rec.code} ${rec.name} saved`); setEd(null);
  };
  const remove = (p) => {
    if (state.docs.some((doc) => doc.lines.some((l) => l.product === p.id))) {
      toast(`${p.code} is used on documents and cannot be deleted`, "warn"); return; }
    setState((x) => ({ ...x, products: (x.products || []).filter((q) => q.id !== p.id) }));
    toast(`${p.code} removed`, "warn");
  };
  const rows = PRODUCTS.filter((p) => kind === "all" || p.kind === kind)
    .filter((p) => hits(q, p.code, p.name, p.uom)).map((p) => {
    const s = books.stock[p.id] || { qty: 0, value: 0 };
    return { p, qty: s.qty, value: s.value, avg: s.qty > 0.0001 ? s.value / s.qty : p.cost };
  });
  const total = R2(rows.reduce((s, r) => s + r.value, 0));
  return (
    <div>
      <PageHead eyebrow="Master data" title="Products &amp; services"
        sub={`${PRODUCTS.length} items · ${custom.length} added by you. Goods carry stock at weighted-average cost; services post straight to an account.`}>
        <div style={{ textAlign: "right", marginRight: 6 }}><div className="micro">Inventory at cost</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 500, marginTop: 3 }}>{money(total, false)}</div></div>
        <Btn kind="pri" icon={Plus} onClick={() => setEd(blank("goods"))}>New product or service</Btn>
      </PageHead>

      {ed && (
        <Card title={isNew ? "New product or service" : `Edit ${ed.code || ed.name}`}
          sub="Start by choosing what kind of item this is — it decides how the item posts"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setEd(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>{isNew ? "Create" : "Save changes"}</Btn></>}>
          <div className="picks">
            {[["goods", "Storable goods", Package, "Carries stock at weighted-average cost. Selling it relieves inventory and posts cost of goods sold."],
              ["service", "Service or expense", Layers, "Never touches stock. Posts revenue on an invoice and straight to an expense account on a bill."]]
              .map(([k, label, I, note]) => (
              <button key={k} className={cx("pick", ed.kind === k && "on")}
                onClick={() => setEd({ ...ed, kind: k, uom: k === "goods" ? "Units" : "Hours",
                  income: k === "goods" ? "4100" : "4200", expense: k === "goods" ? "5100" : "6900" })}>
                <span className="pi"><I size={17} strokeWidth={1.8} /></span>
                <span className="pt"><b>{label}</b><span>{note}</span></span>
                <span className="chk">{ed.kind === k && <Check size={11} strokeWidth={3.2} />}</span>
              </button>))}
          </div>
          <div className="setgrid">
            <Field label="Code">
              <Input value={ed.code} placeholder="LT-EB14" onChange={(e) => setEd({ ...ed, code: e.target.value })} />
              {codeTaken && <div style={{ fontSize: 11.5, color: "var(--neg)", marginTop: 5 }}>That code is already in use</div>}</Field>
            <Field label="Name" span={2}>
              <Input value={ed.name} placeholder="EliteBook 14 i7 / 16GB" onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
            <Field label="Sales price · AED">
              <Input n type="number" step="0.01" value={ed.price} onChange={(e) => setEd({ ...ed, price: e.target.value })} /></Field>
            <Field label={ed.kind === "goods" ? "Standard cost · AED" : "Default bill amount · AED"}>
              <Input n type="number" step="0.01" value={ed.cost} onChange={(e) => setEd({ ...ed, cost: e.target.value })} /></Field>
            <Field label="Unit of measure">
              <Input value={ed.uom} placeholder="Units" onChange={(e) => setEd({ ...ed, uom: e.target.value })} /></Field>
            <Field label="Default VAT">
              <Select value={ed.tax} onChange={(e) => setEd({ ...ed, tax: e.target.value })}>
                {TAXES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            <Field label="Revenue account">
              <Select value={ed.income} onChange={(e) => setEd({ ...ed, income: e.target.value })}>
                {ACCOUNTS.filter((a) => a.type === "income").map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</Select></Field>
            <Field label={ed.kind === "goods" ? "Cost of sales account" : "Expense account"}>
              <Select value={ed.expense} onChange={(e) => setEd({ ...ed, expense: e.target.value })}>
                {ACCOUNTS.filter((a) => ["cogs", "expense"].includes(a.type)).map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</Select></Field>
          </div>
          {+ed.price > 0 && +ed.cost > 0 && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-3)" }}>
              Margin at these figures: <b style={{ color: "var(--pos)" }}>{money(R2(+ed.price - +ed.cost))} AED</b>
              {" "}({(((+ed.price - +ed.cost) / +ed.price) * 100).toFixed(1)}%)
            </div>)}
        </Card>)}
      <Card pad={false}>
        <div className="toolbar">
          <div className="seg">{[["all", "All"], ["goods", "Storable goods"], ["service", "Services"]].map(([k, l]) => (
            <button key={k} className={cx(kind === k && "on")} onClick={() => setKind(k)}>{l}</button>))}</div>
          <SearchBox value={q} onChange={setQ} placeholder="Search by name or code" width={270} />
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>
            {rows.length} of {PRODUCTS.length}</span>
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Default VAT</th><th>Revenue account</th>
            <th>Cost / expense account</th><th className="n">Sales price</th><th className="n">On hand</th>
            <th className="n">Avg cost</th><th className="n">Stock value</th><th style={{ width: 70 }} /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={11}>
              <EmptyState icon={Package} title={`Nothing matches “${q}”`}>Search covers product name and code.</EmptyState></td></tr>}
            {rows.map(({ p, qty, value, avg }) => (
            <tr key={p.id}>
              <td className="mono" style={{ fontSize: 12.5 }}>{p.code}</td>
              <td style={{ fontWeight: 500 }}>{p.name}{!isSeedProduct(p.id) && <> <Pill tone="gold">Custom</Pill></>}
                <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>per {p.uom.toLowerCase()}</div></td>
              <td><Pill tone={p.kind === "goods" ? "gold" : "info"}>{p.kind === "goods" ? "Goods" : "Service"}</Pill></td>
              <td className="muted" style={{ fontSize: 12.5 }}>{TAX[p.tax].name}</td>
              <td className="muted" style={{ fontSize: 12.5 }}>{p.income} {ACC[p.income].name}</td>
              <td className="muted" style={{ fontSize: 12.5 }}>{p.expense} {ACC[p.expense].name}</td>
              <td className="n">{p.price ? money(p.price) : "—"}</td>
              <td className="n" style={{ color: p.kind === "goods" && qty <= 0 ? "var(--neg)" : undefined, fontWeight: 500 }}>{p.kind === "goods" ? qty : "—"}</td>
              <td className="n">{p.kind === "goods" ? money(avg) : "—"}</td>
              <td className="n" style={{ fontWeight: 600 }}>{p.kind === "goods" ? money(value) : "—"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid" }}
                  title="Edit" onClick={() => setEd({ ...p })}><Pencil size={13} /></button>
                {!isSeedProduct(p.id) && <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid" }}
                  title="Remove" onClick={() => remove(p)}><Trash2 size={13} /></button>}</td>
            </tr>))}</tbody>
          <tfoot><tr><td colSpan={9}>Inventory carrying value — agrees to account 1300</td>
            <td className="n">{money(total)}</td><td /></tr></tfoot>
        </table></div>
      </Card>
    </div>
  );
}

function AccountsScreen({ books, go, state, setState, toast }) {
  const [nw, setNw] = useState(null);
  const [q, setQ] = useState("");
  const bal = {};
  books.flat.forEach((l) => (bal[l.acc] = R2((bal[l.acc] || 0) + l.debit - l.credit)));
  let group = "";
  const custom = (state.accounts || []).filter((a) => !a.std && !isSeedAccount(a.code));
  const blank = () => ({ code: "", name: "", type: "expense" });
  const codeTaken = nw && !nw.editing && ACC[nw.code.trim()];
  const valid = nw && /^\d{3,6}$/.test(nw.code.trim()) && nw.name.trim().length > 1 && !codeTaken;
  const save = () => {
    const prev = ACC[nw.code.trim()];
    const a = nw.editing ? { ...prev, name: nw.name.trim(), type: nw.type }
      : { id: nw.code.trim(), code: nw.code.trim(), name: nw.name.trim(), type: nw.type, custom: true };
    setState((x) => { const l = x.accounts || [];
      return { ...x, accounts: l.some((y) => y.code === a.code) ? l.map((y) => (y.code === a.code ? a : y)) : [...l, a] }; });
    toast(nw.editing ? `Account ${a.code} updated` : `Account ${a.code} ${a.name} created`); setNw(null);
  };
  const inUse = (code) => books.flat.some((l) => l.acc === code) || (state.categories || []).some((c) => [c.income, c.expense, c.inventory, c.adjustment].includes(code))
    || METHODS.some((m) => m.account === code) || (state.assets || []).some((x) => [x.acc, x.accum, x.exp].includes(code));
  const remove = (code) => {
    if (inUse(code)) { toast("That account is in use by postings, a category, a payment method or an asset", "warn"); return; }
    if (!window.confirm(`Delete account ${code} ${ACC[code] ? ACC[code].name : ""}?`)) return;
    setState((x) => ({ ...x, accounts: (x.accounts || []).filter((a) => a.code !== code) }));
    toast(`Account ${code} removed`, "warn");
  };
  return (
    <div>
      <PageHead eyebrow="Accounting" title="Chart of accounts"
        sub={`${ACCOUNTS.length} accounts${custom.length ? ` · ${custom.length} added by you` : ""}. The code range drives which statement an account lands on.`}>
        <Btn kind="pri" icon={Plus} onClick={() => setNw(blank())}>New account</Btn>
      </PageHead>

      {nw && (
        <Card title={nw.editing ? `Edit account ${nw.code}` : "New account"} sub="1xxx assets · 2xxx liabilities · 3xxx equity · 4xxx income · 5xxx cost of sales · 6xxx expenses"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setNw(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>{nw.editing ? "Save changes" : "Create account"}</Btn></>}>
          <div className="grid" style={{ gridTemplateColumns: "150px minmax(0,1fr) 250px", gap: 14 }}>
            <Field label="Code">
              <Input value={nw.code} placeholder="6870" disabled={nw.editing} onChange={(e) => setNw({ ...nw, code: e.target.value })} />
              {codeTaken && <div style={{ fontSize: 11.5, color: "var(--neg)", marginTop: 5 }}>
                Already used by {ACC[nw.code.trim()].name}</div>}
            </Field>
            <Field label="Account name">
              <Input value={nw.name} placeholder="Repairs & maintenance" onChange={(e) => setNw({ ...nw, name: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={nw.type} disabled={nw.editing && (Object.values(A).includes(nw.code) || books.flat.some((l) => l.acc === nw.code))} onChange={(e) => setNw({ ...nw, type: e.target.value })}>
                {Object.entries(AT).map(([k, m]) => <option key={k} value={k}>{m.label} — {m.group}</option>)}
              </Select></Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, color: "var(--ink-3)", flexWrap: "wrap" }}>
            <Pill tone={IS_PL(nw.type) ? "gold" : "info"}>{IS_PL(nw.type) ? "Profit & loss" : "Balance sheet"}</Pill>
            Normal balance is a {AT[nw.type].side === "D" ? "debit" : "credit"}. It will sit under {AT[nw.type].sub}.
          </div>
        </Card>)}
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search by code or account name" width={290} />
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>
            {ACCOUNTS.filter((a) => hits(q, a.code, a.name, AT[a.type].label)).length} of {ACCOUNTS.length}</span>
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th style={{ width: 80 }}>Code</th><th>Account</th><th>Type</th><th>Statement</th>
            <th className="n">Balance</th><th style={{ width: 104 }} /></tr></thead>
          <tbody>{ACCOUNTS.filter((a) => hits(q, a.code, a.name, AT[a.type].label)).map((a) => {
            const g = AT[a.type].group, head = g !== group && !q; group = g;
            const v = bal[a.code] || 0, show = AT[a.type].side === "D" ? v : -v;
            return (<React.Fragment key={a.code}>
              {head && <tr className="sec"><td colSpan={6}>{g}</td></tr>}
              <tr className="click" onClick={() => go("r_gl", a.code)}>
                <td className="mono">{a.code}</td>
                <td style={{ fontWeight: 500 }}>{a.name}{!isSeedAccount(a.code) && !a.std && <> <Pill tone="gold">Custom</Pill></>}</td>
                <td className="muted">{AT[a.type].label}</td>
                <td><Pill tone={IS_PL(a.type) ? "gold" : "info"}>{IS_PL(a.type) ? "Profit & loss" : "Balance sheet"}</Pill></td>
                <td className="n" style={{ color: show < 0 ? "var(--neg)" : undefined, fontWeight: 500 }}>{money(show)}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ color: "var(--ink-4)", whiteSpace: "nowrap" }}>
                  <button className="icon-btn" style={{ width: 26, height: 26, display: "inline-grid", verticalAlign: "-7px" }}
                    title="Rename account" onClick={() => { setNw({ code: a.code, name: a.name, type: a.type, editing: true }); scrollPageTop(); }}>
                    <Pencil size={13} /></button>
                  {!isSeedAccount(a.code) && <button className="icon-btn" style={{ width: 26, height: 26, display: "inline-grid", verticalAlign: "-7px" }}
                    title="Remove account" onClick={() => remove(a.code)}><Trash2 size={13} /></button>}
                  <ChevronRight size={14} style={{ verticalAlign: "-3px", marginLeft: 4 }} /></td>
              </tr></React.Fragment>);
          })}</tbody>
        </table></div>
      </Card>
    </div>
  );
}

function JournalScreen({ books, state, setState, toast }) {
  const [j, setJ] = useState("All");
  const [q, setQ] = useState("");
  const [nw, setNw] = useState(null);
  const [limit, setLimit] = useState(60);
  const journals = ["All", "Sales", "Purchases", "Bank Receipts", "Bank Payments", "Miscellaneous"];
  const list = books.entries.filter((e) => j === "All" || e.journal === j)
    .filter((e) => hits(q, e.number, e.ref, e.journal,
      e.lines.map((l) => l.acc + " " + (ACC[l.acc] ? ACC[l.acc].name : "") + " " + (l.label || "")).join(" ")))
    .slice().reverse();

  const nextJE = () => {
    const n = (state.manual || []).filter((e) => e.number.indexOf("JE/") === 0)
      .reduce((m, e) => Math.max(m, +e.number.split("/").pop() || 0), 0);
    return `JE/${TODAY.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`;
  };
  const newLine = () => ({ id: uid("jl"), acc: "6900", label: "", debit: 0, credit: 0, partner: "" });
  const blankJE = () => ({ id: uid("je"), number: nextJE(), date: TODAY, ref: "", journal: "Miscellaneous",
    lines: [newLine(), { ...newLine(), id: uid("jl"), acc: A.BANK }] });
  const jd = nw ? R2(nw.lines.reduce((x, l) => x + (+l.debit || 0), 0)) : 0;
  const jc = nw ? R2(nw.lines.reduce((x, l) => x + (+l.credit || 0), 0)) : 0;
  const balanced = Math.abs(jd - jc) < 0.005 && jd > 0;
  const setL = (id, k, v) => setNw((p) => ({ ...p, lines: p.lines.map((l) => (l.id === id ? { ...l, [k]: v } : l)) }));
  const post = () => {
    const clean = { id: nw.id, number: nw.number, date: nw.date, ref: nw.ref || "Manual journal entry",
      journal: nw.journal, lines: nw.lines.filter((l) => (+l.debit || 0) || (+l.credit || 0))
        .map((l) => ({ acc: l.acc, label: l.label || (ACC[l.acc] ? ACC[l.acc].name : l.acc),
          debit: R2(+l.debit || 0), credit: R2(+l.credit || 0), partner: l.partner || null })) };
    setState((x) => ({ ...x, manual: [...x.manual, clean] }));
    toast(`${nw.number} posted to the ledger`); setNw(null);
  };
  const del = (id) => { setState((x) => ({ ...x, manual: x.manual.filter((e) => e.id !== id) })); toast("Manual entry removed", "warn"); };

  return (
    <div>
      <PageHead eyebrow="Accounting" title="Journal entries"
        sub={`${books.entries.length} entries · ${books.flat.length} lines. Document entries are derived; manual ones you post here.`}>
        <Btn kind="pri" icon={Plus} onClick={() => setNw(blankJE())}>New journal entry</Btn>
      </PageHead>

      {nw && (
        <Card title="New journal entry" sub="Debits must equal credits before it can post" pad={false} style={{ marginBottom: 16 }}>
          <div className="setsec" style={{ paddingBottom: 0 }}>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
              <Field label="Entry number"><Input value={nw.number} onChange={(e) => setNw({ ...nw, number: e.target.value })} /></Field>
              <Field label="Date"><Input type="date" value={nw.date} onChange={(e) => setNw({ ...nw, date: e.target.value })} /></Field>
              <Field label="Journal">
                <Select value={nw.journal} onChange={(e) => setNw({ ...nw, journal: e.target.value })}>
                  {journals.slice(1).map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label="Narration"><Input value={nw.ref} placeholder="Depreciation for the month…"
                onChange={(e) => setNw({ ...nw, ref: e.target.value })} /></Field>
            </div>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 16 }}><table className="lines">
            <thead><tr><th style={{ minWidth: 240 }}>Account</th><th style={{ minWidth: 170 }}>Label</th>
              <th style={{ minWidth: 150 }}>Counterparty</th><th className="n" style={{ width: 130 }}>Debit</th>
              <th className="n" style={{ width: 130 }}>Credit</th><th style={{ width: 42 }} /></tr></thead>
            <tbody>{nw.lines.map((l) => (
              <tr key={l.id}>
                <td><Select value={l.acc} onChange={(e) => setL(l.id, "acc", e.target.value)}>
                  {ACCOUNTS.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</Select></td>
                <td><Input value={l.label} placeholder={ACC[l.acc] ? ACC[l.acc].name : ""}
                  onChange={(e) => setL(l.id, "label", e.target.value)} /></td>
                <td><Select value={l.partner} onChange={(e) => setL(l.id, "partner", e.target.value)}>
                  <option value="">None</option>
                  {PARTNERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></td>
                <td><Input n type="number" step="0.01" value={l.debit || ""}
                  onChange={(e) => setL(l.id, "debit", e.target.value ? +e.target.value : 0)} /></td>
                <td><Input n type="number" step="0.01" value={l.credit || ""}
                  onChange={(e) => setL(l.id, "credit", e.target.value ? +e.target.value : 0)} /></td>
                <td>{nw.lines.length > 2 && <button className="icon-btn" style={{ width: 28, height: 28 }}
                  onClick={() => setNw((p) => ({ ...p, lines: p.lines.filter((x) => x.id !== l.id) }))}><X size={14} /></button>}</td>
              </tr>))}</tbody>
            <tfoot><tr>
              <td colSpan={3} style={{ padding: "10px 11px" }}>
                <Btn size="sm" icon={Plus} onClick={() => setNw((p) => ({ ...p, lines: [...p.lines, newLine()] }))}>Add line</Btn></td>
              <td className="n" style={{ padding: "10px 17px", fontWeight: 600 }}>{money(jd)}</td>
              <td className="n" style={{ padding: "10px 17px", fontWeight: 600 }}>{money(jc)}</td><td /></tr></tfoot>
          </table></div>
          <div className="savebar">
            <Pill tone={balanced ? "ok" : "bad"} dot>
              {balanced ? "Balanced" : (jd || jc) ? `Out by ${money(Math.abs(jd - jc))}` : "Enter amounts"}</Pill>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Btn onClick={() => setNw(null)}>Cancel</Btn>
              <Btn kind="pri" icon={Check} disabled={!balanced} onClick={post}>Post entry</Btn></span>
          </div>
        </Card>)}
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Search entry number, narration or account" width={300} />
          <div className="seg">{journals.map((x) => (
            <button key={x} className={cx(j === x && "on")} onClick={() => setJ(x)}>{x}</button>))}</div>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>
            {list.length} of {books.entries.length}</span></div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th style={{ width: 100 }}>Date</th><th style={{ width: 110 }}>Account</th><th>Narration</th>
            <th style={{ width: 120 }}>Journal</th><th className="n" style={{ width: 120 }}>Debit</th>
            <th className="n" style={{ width: 120 }}>Credit</th></tr></thead>
          <tbody>{list.slice(0, limit).map((e) => {
            const tot = R2(e.lines.reduce((s, l) => s + l.debit, 0));
            return (<React.Fragment key={e.id}>
              <tr className="sec"><td colSpan={6}>
                {e.source === "manual" && <button className="icon-btn" style={{ width: 22, height: 22, display: "inline-grid", verticalAlign: "-5px", marginRight: 6 }}
                  title="Remove this manual entry" onClick={() => del(e.id)}><Trash2 size={12} /></button>}
                <span className="mono" style={{ fontSize: 11.5 }}>{e.number}</span>
                <span style={{ margin: "0 8px", color: "var(--ink-4)" }}>·</span>{dmy(e.date)}
                <span style={{ margin: "0 8px", color: "var(--ink-4)" }}>·</span>
                <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>{e.ref}</span></td></tr>
              {e.lines.map((l, i) => (
                <tr key={i}>
                  <td className="muted">{i === 0 ? dmy(e.date) : ""}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{l.acc}</td>
                  <td>{ACC[l.acc].name}<div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                    {l.label}{l.partner ? ` — ${PMAP[l.partner].name}` : ""}</div></td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{i === 0 ? e.journal : ""}</td>
                  <td className="n" style={{ color: l.debit ? "var(--pos)" : undefined }}>{l.debit ? money(l.debit) : ""}</td>
                  <td className="n" style={{ color: l.credit ? "var(--neg)" : undefined }}>{l.credit ? money(l.credit) : ""}</td>
                </tr>))}
              <tr className="rule"><td colSpan={4} style={{ textAlign: "right", fontSize: 11.5, color: "var(--ink-4)" }}>Entry total</td>
                <td className="n" style={{ fontWeight: 600 }}>{money(tot)}</td><td className="n" style={{ fontWeight: 600 }}>{money(tot)}</td></tr>
            </React.Fragment>);
          })}</tbody>
          {list.length > limit && <tbody><tr><td colSpan={9} className="show-more">
            <Btn onClick={() => setLimit((n) => n + 120)}>Show {Math.min(120, list.length - limit)} more · {list.length - limit} older entries</Btn></td></tr></tbody>}
        </table></div>
      </Card>
    </div>
  );
}

/* ========================================================================== */
/*  REPORTS                                                                   */
/* ========================================================================== */

function PeriodBar({ p, setP, mode = "range", onExport }) {
  return (<>
    {mode === "range"
      ? <RangePicker value={{ preset: p.preset, from: p.from, to: p.to }}
          onChange={(r) => setP({ ...p, ...r })} />
      : <Field label="As at"><Input type="date" value={p.asOf} onChange={(e) => setP({ ...p, asOf: e.target.value })} /></Field>}
  </>);
}
const DrCr = ({ v }) => (<>
  <td className="n" style={{ color: v > 0.004 ? "var(--pos)" : undefined }}>{v > 0.004 ? money(v) : ""}</td>
  <td className="n" style={{ color: v < -0.004 ? "var(--neg)" : undefined }}>{v < -0.004 ? money(-v) : ""}</td></>);

function csv(rows, name) {
  const body = rows.map((r) => r.map((c) => {
    const s = c == null ? "" : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  return saveText(body, name, "text/csv;charset=utf-8");
}

function TrialBalance({ books, p, setP , toast }) {
  const tb = trialBalance(books.flat, p.from, p.to);
  let group = "";
  return (
    <ReportFrame toast={toast} title="Trial Balance" meta={`${dmy(p.from)} to ${dmy(p.to)} · all amounts in AED`}
      right={<PeriodBar p={p} setP={setP} />}>
      <div className="tbl-wrap"><table className="tbl">
        <thead>
          <tr><th colSpan={2} /><th className="n" colSpan={2} style={{ textAlign: "center", borderLeft: "1px solid var(--line)" }}>Opening</th>
            <th className="n" colSpan={2} style={{ textAlign: "center", borderLeft: "1px solid var(--line)" }}>Movement</th>
            <th className="n" colSpan={2} style={{ textAlign: "center", borderLeft: "1px solid var(--line)" }}>Closing</th></tr>
          <tr><th style={{ width: 80 }}>Code</th><th>Account</th>
            <th className="n" style={{ borderLeft: "1px solid var(--line)" }}>Debit</th><th className="n">Credit</th>
            <th className="n" style={{ borderLeft: "1px solid var(--line)" }}>Debit</th><th className="n">Credit</th>
            <th className="n" style={{ borderLeft: "1px solid var(--line)" }}>Debit</th><th className="n">Credit</th></tr>
        </thead>
        <tbody>{tb.rows.map((r) => { const g = AT[r.acc.type].group, head = g !== group; group = g;
          return (<React.Fragment key={r.acc.code}>
            {head && <tr className="sec"><td colSpan={8}>{g}</td></tr>}
            <tr><td className="mono">{r.acc.code}</td><td>{r.acc.name}</td>
              <DrCr v={r.open} />
              <td className="n">{r.d ? money(r.d) : ""}</td><td className="n">{r.c ? money(r.c) : ""}</td>
              <DrCr v={r.close} /></tr></React.Fragment>); })}
        </tbody>
        <tfoot><tr><td colSpan={2}>Totals — {tb.rows.length} accounts</td>
          <td className="n">{money(tb.t.od)}</td><td className="n">{money(tb.t.oc)}</td>
          <td className="n">{money(tb.t.d)}</td><td className="n">{money(tb.t.c)}</td>
          <td className="n">{money(tb.t.cd)}</td><td className="n">{money(tb.t.cc)}</td></tr></tfoot>
      </table></div>
    </ReportFrame>
  );
}

function GeneralLedger({ books, p, setP, param , toast }) {
  const [acc, setAcc] = useState(param || A.AR);
  React.useEffect(() => { if (param) setAcc(param); }, [param]);
  const g = generalLedger(books.flat, acc, p.from, p.to);
  return (
    <ReportFrame toast={toast} title="General Ledger" meta={`${ACC[acc].code} — ${ACC[acc].name} · ${dmy(p.from)} to ${dmy(p.to)}`}
      right={<><Field label="Account"><Select value={acc} onChange={(e) => setAcc(e.target.value)} style={{ width: 268 }}>
        {ACCOUNTS.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</Select></Field>
        <PeriodBar p={p} setP={setP} /></>}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th style={{ width: 104 }}>Date</th><th style={{ width: 148 }}>Entry</th><th>Narration</th>
          <th style={{ width: 128 }}>Journal</th><th className="n">Debit</th><th className="n">Credit</th><th className="n">Balance</th></tr></thead>
        <tbody>
          <tr className="sub"><td colSpan={4}>Opening balance carried forward</td><td /><td /><td className="n">{money(g.open)}</td></tr>
          {g.rows.length === 0 && <tr><td colSpan={7}><EmptyState icon={BookOpen} title="No movement in this period">Widen the date range or pick another account.</EmptyState></td></tr>}
          {g.rows.map((l) => (
            <tr key={l.key}><td className="muted">{dmy(l.date)}</td>
              <td className="mono" style={{ fontSize: 12.5 }}>{l.number}</td>
              <td>{l.label}{l.partner ? <span className="muted"> — {PMAP[l.partner].name}</span> : ""}</td>
              <td className="muted" style={{ fontSize: 12.5 }}>{l.journal}</td>
              <td className="n" style={{ color: l.debit ? "var(--pos)" : undefined }}>{l.debit ? money(l.debit) : ""}</td>
              <td className="n" style={{ color: l.credit ? "var(--neg)" : undefined }}>{l.credit ? money(l.credit) : ""}</td>
              <td className="n">{money(l.run)}</td></tr>))}
        </tbody>
        <tfoot><tr><td colSpan={4}>Closing balance</td><td className="n">{money(g.d)}</td>
          <td className="n">{money(g.c)}</td><td className="n">{money(g.close)}</td></tr></tfoot>
      </table></div>
    </ReportFrame>
  );
}

function PartnerLedgerRep({ books, p, setP, param , toast }) {
  const [pid, setPid] = useState(param || PARTNERS[0].id);
  React.useEffect(() => { if (param) setPid(param); }, [param]);
  const g = partnerLedger(books.flat, pid, p.from, p.to), pt = PMAP[pid];
  return (
    <ReportFrame toast={toast} title="Partner Ledger" meta={`${pt.name} · TRN ${pt.trn || "unregistered"} · ${dmy(p.from)} to ${dmy(p.to)}`}
      right={<><Field label="Counterparty"><Select value={pid} onChange={(e) => setPid(e.target.value)} style={{ width: 250 }}>
        <optgroup label="Customers">{PARTNERS.filter((x) => x.role === "customer").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>
        <optgroup label="Vendors">{PARTNERS.filter((x) => x.role === "vendor").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>
      </Select></Field><PeriodBar p={p} setP={setP} /></>}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th style={{ width: 104 }}>Date</th><th style={{ width: 156 }}>Document</th><th>Narration</th>
          <th style={{ width: 150 }}>Account</th><th className="n">Debit</th><th className="n">Credit</th><th className="n">Balance</th></tr></thead>
        <tbody>
          <tr className="sub"><td colSpan={4}>Opening balance</td><td /><td /><td className="n">{money(g.open)}</td></tr>
          {g.rows.length === 0 && <tr><td colSpan={7}><EmptyState icon={Users} title="Nothing posted in this period" /></td></tr>}
          {g.rows.map((l) => (
            <tr key={l.key}><td className="muted">{dmy(l.date)}</td>
              <td className="mono" style={{ fontSize: 12.5 }}>{l.number}</td><td>{l.label}</td>
              <td className="muted" style={{ fontSize: 12.5 }}>{l.acc} {ACC[l.acc].name}</td>
              <td className="n" style={{ color: l.debit ? "var(--pos)" : undefined }}>{l.debit ? money(l.debit) : ""}</td>
              <td className="n" style={{ color: l.credit ? "var(--neg)" : undefined }}>{l.credit ? money(l.credit) : ""}</td>
              <td className="n">{money(l.run)}</td></tr>))}
        </tbody>
        <tfoot><tr><td colSpan={4}>{g.close >= 0 ? "Balance due from counterparty" : "Balance due to counterparty"}</td>
          <td className="n">{money(g.d)}</td><td className="n">{money(g.c)}</td>
          <td className="n">{money(Math.abs(g.close))}</td></tr></tfoot>
      </table></div>
    </ReportFrame>
  );
}

function Aged({ state, kind, p, setP , toast }) {
  const a = aging(state, kind, p.asOf), isAR = kind === "receivable";
  const [open, setOpen] = useState({});
  return (
    <ReportFrame toast={toast} title={isAR ? "Aged Receivable" : "Aged Payable"}
      meta={`As at ${dmy(p.asOf)} · aged on due date · AED`} right={<PeriodBar p={p} setP={setP} mode="asOf" />}>
      <div className="card-b" style={{ borderBottom: "1px solid var(--line)" }}>
        <BarList rows={a.tot.map((v, i) => ({ label: BUCKETS[i], value: v,
          color: i > 2 ? "var(--neg)" : i > 0 ? "var(--warn)" : isAR ? "var(--brand)" : "var(--info)" }))} />
      </div>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>{isAR ? "Customer" : "Vendor"}</th>{BUCKETS.map((b) => <th key={b} className="n">{b}</th>)}<th className="n">Total</th></tr></thead>
        <tbody>
          {a.rows.length === 0 && <tr><td colSpan={8}><EmptyState icon={Check} title="Nothing outstanding">Every document is settled as at this date.</EmptyState></td></tr>}
          {a.rows.map((r) => (<React.Fragment key={r.partner.id}>
            <tr className="click" onClick={() => setOpen((o) => ({ ...o, [r.partner.id]: !o[r.partner.id] }))}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <ChevronRight size={14} style={{ color: "var(--ink-4)", transform: open[r.partner.id] ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                <Party name={r.partner.name} meta={`${r.items.length} open document${r.items.length === 1 ? "" : "s"}`} />
                {r.unapplied > 0.004 && <Pill tone="gold">{money(r.unapplied)} unapplied</Pill>}</div></td>
              {r.b.map((v, i) => <td key={i} className="n" style={{ color: i > 2 && v > 0.004 ? "var(--neg)" : undefined }}>{money(v)}</td>)}
              <td className="n" style={{ fontWeight: 600 }}>{money(r.total)}</td>
            </tr>
            {open[r.partner.id] && r.items.map((it) => (
              <tr key={it.id} style={{ background: "var(--surface-2)" }}>
                <td style={{ paddingLeft: 46 }}><span className="mono" style={{ fontSize: 12.5 }}>{it.number}</span>
                  <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>due {dmy(it.due)} ·{" "}
                    {daysBetween(it.due, p.asOf) > 0 ? `${daysBetween(it.due, p.asOf)} days overdue` : "not yet due"}</span></td>
                {BUCKETS.map((_, i) => <td key={i} className="n">{i === it.b ? money(it.open) : ""}</td>)}
                <td className="n">{money(it.open)}</td></tr>))}
          </React.Fragment>))}
        </tbody>
        <tfoot><tr><td>Total {isAR ? "receivable" : "payable"}</td>
          {a.tot.map((v, i) => <td key={i} className="n">{money(v)}</td>)}
          <td className="n">{money(a.grand)}</td></tr></tfoot>
      </table></div>
    </ReportFrame>
  );
}

function ProfitLoss({ books, p, setP , toast }) {
  const r = pnl(books.flat, p.from, p.to);
  const share = (v) => (r.revenue ? ((v / r.revenue) * 100).toFixed(1) + "%" : "—");
  const Line = ({ a }) => (<tr><td className="mono muted" style={{ width: 80 }}>{a.acc.code}</td>
    <td>{a.acc.name}</td><td className="n">{money(a.amount)}</td>
    <td className="n muted" style={{ width: 92 }}>{share(a.amount)}</td></tr>);
  return (
    <ReportFrame toast={toast} title="Statement of Profit or Loss" meta={`${dmy(p.from)} to ${dmy(p.to)} · AED`}
      right={<PeriodBar p={p} setP={setP} />}>
      <div className="card-b" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
          {[["Revenue", r.revenue, ""], ["Gross profit", r.gross, `${r.gm.toFixed(1)}% margin`],
            ["Operating expenses", r.expense, ""], [r.net >= 0 ? "Profit for the period" : "Loss for the period", r.net, `${r.nm.toFixed(1)}% margin`]].map(([k, v, s], i) => (
            <div key={k} style={{ padding: "2px 0" }}>
              <div className="micro">{k}</div>
              <div className="num" style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-.025em", marginTop: 7,
                color: i === 3 ? (r.net >= 0 ? "var(--pos)" : "var(--neg)") : undefined }}>{money(v, false)}</div>
              {s && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{s}</div>}
            </div>))}
        </div>
      </div>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th style={{ width: 80 }}>Code</th><th>Account</th><th className="n">Amount</th><th className="n" style={{ width: 92 }}>% revenue</th></tr></thead>
        <tbody>
          <tr className="sec"><td colSpan={4}>Revenue</td></tr>
          {r.rev.map((x) => <Line key={x.acc.code} a={x} />)}
          <tr className="sub rule"><td /><td>Total revenue</td><td className="n">{money(r.revenue)}</td><td className="n muted">100.0%</td></tr>
          <tr className="sec"><td colSpan={4}>Cost of sales</td></tr>
          {r.cos.map((x) => <Line key={x.acc.code} a={x} />)}
          <tr className="sub rule"><td /><td>Gross profit</td><td className="n">{money(r.gross)}</td><td className="n muted">{r.gm.toFixed(1)}%</td></tr>
          <tr className="sec"><td colSpan={4}>Operating expenses</td></tr>
          {r.exp.map((x) => <Line key={x.acc.code} a={x} />)}
          <tr className="sub rule"><td /><td>Total operating expenses</td><td className="n">{money(r.expense)}</td><td className="n muted">{share(r.expense)}</td></tr>
        </tbody>
        <tfoot><tr className="grand"><td /><td>{r.net >= 0 ? "Profit for the period" : "Loss for the period"}</td>
          <td className="n" style={{ color: r.net >= 0 ? "var(--pos)" : "var(--neg)" }}>{money(r.net)}</td>
          <td className="n muted">{r.nm.toFixed(1)}%</td></tr></tfoot>
      </table></div>
    </ReportFrame>
  );
}

function BalanceSheetRep({ books, p, setP , toast }) {
  const b = balanceSheet(books.flat, p.asOf, p.asOf.slice(0, 4) + "-01-01");
  const Block = ({ title, groups, rows, total, label }) => (
    <table className="tbl">
      <tbody>
        <tr className="sec"><td colSpan={3}>{title}</td></tr>
        {groups && groups.map((g) => (<React.Fragment key={g.name}>
          <tr className="sub"><td colSpan={3} style={{ paddingTop: 14 }}>{g.name}</td></tr>
          {g.rows.map((x) => (<tr key={x.acc.code}><td className="mono muted" style={{ width: 78 }}>{x.acc.code}</td>
            <td>{x.acc.name}</td><td className="n">{money(x.amount)}</td></tr>))}
          <tr className="sub rule"><td /><td>Total {g.name.toLowerCase()}</td><td className="n">{money(g.total)}</td></tr>
        </React.Fragment>))}
        {rows && rows.map((x) => (<tr key={x.acc.code}><td className="mono muted" style={{ width: 78 }}>{x.acc.code}</td>
          <td>{x.acc.name}</td><td className="n">{money(x.amount)}</td></tr>))}
      </tbody>
      <tfoot><tr><td /><td>{label}</td><td className="n">{money(total)}</td></tr></tfoot>
    </table>
  );
  const balanced = Math.abs(b.diff) < 0.01;
  return (
    <ReportFrame toast={toast} title="Statement of Financial Position" meta={`As at ${dmy(p.asOf)} · AED`}
      right={<PeriodBar p={p} setP={setP} mode="asOf" />}>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <div style={{ borderRight: "1px solid var(--line)" }}>
          <Block title="Assets" groups={b.assets} total={b.totA} label="Total assets" /></div>
        <div>
          <Block title="Liabilities" groups={b.liab} total={b.totL} label="Total liabilities" />
          <Block title="Equity" rows={b.eqRows} total={b.totE} label="Total equity" />
          <table className="tbl"><tfoot><tr className="grand"><td /><td>Total liabilities and equity</td>
            <td className="n">{money(R2(b.totL + b.totE))}</td></tr></tfoot></table>
        </div>
      </div>
      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 9,
        fontSize: 12.5, color: balanced ? "var(--pos)" : "var(--neg)", background: balanced ? "var(--pos-50)" : "var(--neg-50)" }}>
        {balanced ? <Check size={15} strokeWidth={2.3} /> : <AlertTriangle size={15} strokeWidth={2.1} />}
        {balanced ? "Assets equal liabilities plus equity. The statement balances." : `Out of balance by ${money(b.diff)}.`}
      </div>
    </ReportFrame>
  );
}

function VatReturn({ state, p, setP , toast }) {
  const CO = useCo();
  const v = vat201(state, p.from, p.to);
  const Row = ({ n, label, note, net, vat, tone }) => (
    <tr><td className="mono muted" style={{ width: 52 }}>{n}</td>
      <td>{label}{note && <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 2 }}>{note}</div>}</td>
      <td className="n">{net === null ? "" : money(net)}</td>
      <td className="n" style={{ color: tone }}>{vat === null ? "" : money(vat)}</td></tr>);
  return (
    <ReportFrame toast={toast} title="VAT Return — FTA Form 201"
      meta={`Tax period ${dmy(p.from)} to ${dmy(p.to)} · TRN ${CO.trn} · AED`} right={<PeriodBar p={p} setP={setP} />}>
      <div className="card-b" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
          {[["Output tax due · Box 12", v.out.vat, "neg"], ["Recoverable input tax · Box 13", v.inp.vat, "pos"],
            [v.due >= 0 ? "Payable to FTA · Box 14" : "Refundable by FTA · Box 14", Math.abs(v.due), v.due >= 0 ? "neg" : "pos"]].map(([k, val, tone]) => (
            <div key={k}><div className="micro">{k}</div>
              <div className="num" style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-.025em", marginTop: 7, color: `var(--${tone})` }}>{money(val, false)}</div></div>))}
        </div>
      </div>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th style={{ width: 52 }}>Box</th><th>Description</th>
          <th className="n" style={{ width: 160 }}>Amount (AED)</th><th className="n" style={{ width: 160 }}>VAT (AED)</th></tr></thead>
        <tbody>
          <tr className="sec"><td colSpan={4}>VAT on sales and all other outputs</td></tr>
          {v.em.map((e, i) => <Row key={e.name} n={i === 0 ? "1" : ""} label={`Standard rated supplies — ${e.name}`} net={e.net} vat={e.vat} />)}
          {v.em.length === 0 && <Row n="1" label="Standard rated supplies" net={0} vat={0} />}
          <Row n="2" label="Tax refunds to tourists" note="Tax Refunds for Tourists Scheme" net={0} vat={0} />
          <Row n="3" label="Supplies subject to the reverse charge provisions" note="Imported goods and services self-accounted at 5%" net={v.b3.net} vat={v.b3.vat} />
          <Row n="4" label="Zero rated supplies" note="Exports outside the GCC implementing states" net={v.b4.net} vat={null} />
          <Row n="5" label="Exempt supplies" net={v.b5.net} vat={null} />
          <Row n="6" label="Goods imported into the UAE" note="Auto-populated by the FTA from customs declarations" net={0} vat={0} />
          <Row n="7" label="Adjustments to goods imported into the UAE" net={0} vat={0} />
          <tr className="sub rule"><td className="mono">8</td><td>Totals — output tax due</td>
            <td className="n">{money(v.out.net)}</td><td className="n">{money(v.out.vat)}</td></tr>
          <tr className="sec"><td colSpan={4}>VAT on expenses and all other inputs</td></tr>
          <Row n="9" label="Standard rated expenses" note="Recoverable input tax on local purchases and overheads" net={v.b9.net} vat={v.b9.vat} />
          <Row n="10" label="Supplies subject to the reverse charge provisions" note="Input tax recovered against the Box 3 self-charge" net={v.b10.net} vat={v.b10.vat} />
          <tr className="sub rule"><td className="mono">11</td><td>Totals — recoverable input tax</td>
            <td className="n">{money(v.inp.net)}</td><td className="n">{money(v.inp.vat)}</td></tr>
        </tbody>
        <tfoot>
          <tr><td className="mono muted">12</td><td>Total value of due tax for the period</td><td /><td className="n">{money(v.out.vat)}</td></tr>
          <tr><td className="mono muted">13</td><td>Total value of recoverable tax for the period</td><td /><td className="n">{money(v.inp.vat)}</td></tr>
          <tr className="grand"><td className="mono">14</td><td>{v.due >= 0 ? "Payable tax for the period" : "Refundable tax for the period"}</td><td />
            <td className="n" style={{ color: v.due >= 0 ? "var(--neg)" : "var(--pos)" }}>{money(Math.abs(v.due))}</td></tr>
        </tfoot>
      </table></div>
      <div style={{ padding: "14px 20px 18px", fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.65, borderTop: "1px solid var(--line-2)" }}>
        Prepared from posted documents only. Reverse-charge imports appear in Box 3 as output tax and in Box 10 as recoverable
        input tax, so they are cash-neutral where the business is fully taxable. Returns are filed on EmaraTax within 28 days of period end.
      </div>
    </ReportFrame>
  );
}

function StockReport({ books, p, setP , toast }) {
  const rows = PRODUCTS.filter((x) => x.kind === "goods").map((pr) => {
    const s = books.stock[pr.id] || { qty: 0, value: 0 };
    return { pr, ...s, avg: s.qty > 0.0001 ? s.value / s.qty : 0 };
  });
  const total = R2(rows.reduce((s, r) => s + r.value, 0));
  const moves = books.moves.filter((m) => inRange(m.date, p.from, p.to)).slice().reverse();
  return (
    <div className="grid">
      <ReportFrame toast={toast} title="Inventory Valuation" meta={`As at ${dmy(TODAY)} · inventory carrying value · AED`}
        right={<PeriodBar p={p} setP={setP} />}>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          <div style={{ borderRight: "1px solid var(--line)" }}>
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Code</th><th>Product</th><th className="n">On hand</th><th className="n">Avg cost</th><th className="n">Value</th></tr></thead>
              <tbody>{rows.map((r) => (<tr key={r.pr.id}>
                <td className="mono" style={{ fontSize: 12.5 }}>{r.pr.code}</td>
                <td>{r.pr.name}</td>
                <td className="n" style={{ color: r.qty <= 0 ? "var(--neg)" : undefined }}>{r.qty}</td>
                <td className="n">{money(r.avg)}</td>
                <td className="n" style={{ fontWeight: 600 }}>{money(r.value)}</td></tr>))}</tbody>
              <tfoot><tr><td colSpan={4}>Total inventory carrying value</td><td className="n">{money(total)}</td></tr></tfoot>
            </table></div>
          </div>
          <div className="card-b">
            <div className="micro" style={{ marginBottom: 14 }}>Value by product</div>
            <BarList rows={rows.filter((r) => r.value > 0).map((r) => ({ label: r.pr.code, value: r.value }))} />
          </div>
        </div>
      </ReportFrame>
      <Card title="Stock movements" pad={false}
        sub={`${moves.length} movements in the period — posted sales, purchases, returns, physical counts and scrap`}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Date</th><th>Document</th><th>Product</th><th>Direction</th><th className="n">Quantity</th>
            <th className="n">Unit cost</th><th className="n">Value</th><th className="n">Qty after</th><th className="n">Value after</th></tr></thead>
          <tbody>
            {moves.length === 0 && <tr><td colSpan={9}><EmptyState icon={Layers} title="No stock movements in this period" /></td></tr>}
            {moves.map((m) => (<tr key={m.id}>
              <td className="muted">{dmy(m.date)}</td>
              <td className="mono" style={{ fontSize: 12.5 }}>{m.docNo}</td>
              <td>{PROD[m.product].name}</td>
              <td><Pill tone={m.qty > 0 ? "ok" : "bad"} dot>{m.qty > 0 ? "In" : "Out"}</Pill></td>
              <td className="n" style={{ color: m.qty > 0 ? "var(--pos)" : "var(--neg)", fontWeight: 500 }}>{m.qty > 0 ? "+" : ""}{m.qty}</td>
              <td className="n">{money(m.unit)}</td><td className="n">{money(m.value)}</td>
              <td className="n">{m.balQty}</td><td className="n">{money(m.balValue)}</td></tr>))}
          </tbody>
        </table></div>
      </Card>
    </div>
  );
}

function AssetsScreen({ state, setState, books, toast }) {
  const [ed, setEd] = useState(null);
  const [q, setQ] = useState("");
  const all = state.assets || [];
  const list = all.filter((a) => hits(q, a.code, a.name));
  const blank = () => ({ id: uid("fa"), code: "", name: "", cost: 0, salvage: 0, life: 5,
    acquired: TODAY, acc: "1610", accum: "1620", exp: "6700" });
  const valid = ed && ed.name.trim().length > 1 && +ed.cost > 0 && +ed.life > 0;
  const monthly = (a) => R2((a.cost - (+a.salvage || 0)) / (+a.life * 12));
  const monthsHeld = (a) => Math.max(0, (+TODAY.slice(0, 4) - +a.acquired.slice(0, 4)) * 12
    + (+TODAY.slice(5, 7) - +a.acquired.slice(5, 7)));
  const posted = (a) => R2((state.manual || []).filter((e) => e.ref === `Depreciation — ${a.code || a.name}`)
    .reduce((s, e) => s + e.lines.reduce((t, l) => t + l.debit, 0), 0));
  const due = (a) => R2(Math.max(0, Math.min(monthly(a) * monthsHeld(a), a.cost - (+a.salvage || 0)) - posted(a)));
  const save = () => {
    const rec = { ...ed, cost: +ed.cost || 0, salvage: +ed.salvage || 0, life: +ed.life || 1, name: ed.name.trim() };
    setState((x) => { const l = x.assets || [];
      return { ...x, assets: l.some((a) => a.id === rec.id) ? l.map((a) => (a.id === rec.id ? rec : a)) : [...l, rec] }; });
    toast(`${rec.name} added to the register`); setEd(null);
  };
  const depreciate = (a) => {
    const amt = due(a);
    if (amt <= 0) { toast(`${a.name} is already up to date`, "warn"); return; }
    const n = (state.manual || []).filter((e) => e.number.indexOf("DEP/") === 0)
      .reduce((m, e) => Math.max(m, +e.number.split("/").pop() || 0), 0);
    const je = { id: uid("je"), number: `DEP/${TODAY.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`,
      date: TODAY, ref: `Depreciation — ${a.code || a.name}`, journal: "Miscellaneous",
      lines: [{ acc: a.exp, debit: amt, credit: 0, label: `Depreciation on ${a.name}`, partner: null },
              { acc: a.accum, debit: 0, credit: amt, label: "Accumulated depreciation", partner: null }] };
    setState((x) => ({ ...x, manual: [...x.manual, je] }));
    toast(`${je.number} · ${money(amt, false)} depreciation posted`);
  };
  const totCost = R2(all.reduce((s, a) => s + a.cost, 0));
  const totDep = R2(all.reduce((s, a) => s + posted(a), 0));
  const totDue = R2(all.reduce((s, a) => s + due(a), 0));

  return (
    <div>
      <PageHead eyebrow="Balance sheet" title="Fixed assets"
        sub="Straight-line register. Posting depreciation writes a real journal entry against the asset's accounts.">
        <Btn kind="pri" icon={Plus} onClick={() => setEd(blank())}>Add asset</Btn>
      </PageHead>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", marginBottom: 16 }}>
        {[["Cost of assets held", totCost, "g1", Layers],
          ["Depreciation posted", totDep, "g5", TrendingDown],
          ["Net book value", R2(totCost - totDep), "g3", Landmark],
          ["Depreciation due now", totDue, totDue > 0 ? "g7" : "g4", Clock]].map(([l, v, g, I]) => (
          <div className="card kpi" key={l}>
            <div className="kh"><span className={cx("gt", g)}><I size={18} strokeWidth={1.9} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="kl">{l}</div>
                <div className="kv">AED {money(v, false)}</div>
                <div className="kd"><span>{all.length} asset{all.length === 1 ? "" : "s"} on register</span></div></div></div>
            <div style={{ height: 17 }} />
          </div>))}
      </div>

      {ed && (
        <Card title={list.some((a) => a.id === ed.id) ? `Edit ${ed.name}` : "Add a fixed asset"}
          sub="Straight line: (cost less residual) spread evenly across the useful life"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setEd(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>Save asset</Btn></>}>
          <div className="setgrid">
            <Field label="Asset tag"><Input value={ed.code} placeholder="FA-014" onChange={(e) => setEd({ ...ed, code: e.target.value })} /></Field>
            <Field label="Description" span={2}><Input value={ed.name} placeholder="Toyota Hiace delivery van"
              onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
            <Field label="Cost · AED"><Input n type="number" step="0.01" value={ed.cost}
              onChange={(e) => setEd({ ...ed, cost: e.target.value })} /></Field>
            <Field label="Residual value · AED"><Input n type="number" step="0.01" value={ed.salvage}
              onChange={(e) => setEd({ ...ed, salvage: e.target.value })} /></Field>
            <Field label="Useful life (years)"><Input n type="number" value={ed.life}
              onChange={(e) => setEd({ ...ed, life: e.target.value })} /></Field>
            <Field label="Acquired"><Input type="date" value={ed.acquired}
              onChange={(e) => setEd({ ...ed, acquired: e.target.value })} /></Field>
            <Field label="Asset account">
              <Select value={ed.acc} onChange={(e) => setEd({ ...ed, acc: e.target.value })}>
                {ACCOUNTS.filter((a) => a.type === "fasset").map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</Select></Field>
            <Field label="Depreciation expense">
              <Select value={ed.exp} onChange={(e) => setEd({ ...ed, exp: e.target.value })}>
                {ACCOUNTS.filter((a) => a.type === "expense").map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</Select></Field>
          </div>
          {+ed.cost > 0 && +ed.life > 0 && (
            <div style={{ marginTop: 15, fontSize: 12.5, color: "var(--ink-3)" }}>
              Charge is <b style={{ color: "var(--ink)" }}>{money(monthly(ed), false)} AED per month</b>
              {" "}({money(R2(monthly(ed) * 12), false)} a year) for {ed.life} years.
            </div>)}
        </Card>)}

      <Card title="Asset register" pad={false} sub="Depreciation posts to the ledger and flows into the balance sheet"
        right={<SearchBox value={q} onChange={setQ} placeholder="Search tag or asset" width={230} />}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Tag</th><th>Asset</th><th>Acquired</th><th className="n">Cost</th>
            <th className="n">Monthly</th><th className="n">Depreciated</th><th className="n">Net book value</th>
            <th className="n">Due now</th><th style={{ width: 150 }} /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9}>
              <EmptyState icon={Layers} title="No assets on the register">
                Add your first asset and Invoeez will handle the monthly charge.</EmptyState></td></tr>}
            {list.map((a) => (
              <tr key={a.id}>
                <td className="mono" style={{ fontSize: 12.5 }}>{a.code || "—"}</td>
                <td style={{ fontWeight: 500 }}>{a.name}
                  <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{a.life} year life · straight line</div></td>
                <td className="muted">{dmy(a.acquired)}</td>
                <td className="n">{money(a.cost)}</td>
                <td className="n">{money(monthly(a))}</td>
                <td className="n">{money(posted(a))}</td>
                <td className="n" style={{ fontWeight: 600 }}>{money(R2(a.cost - posted(a)))}</td>
                <td className="n" style={{ color: due(a) > 0 ? "var(--warn)" : undefined }}>{money(due(a))}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Btn size="sm" disabled={due(a) <= 0} onClick={() => depreciate(a)}>Post</Btn>
                  <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                    onClick={() => setEd({ ...a })}><Pencil size={13} /></button>
                  <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                    onClick={() => { setState((x) => ({ ...x, assets: (x.assets || []).filter((q) => q.id !== a.id) }));
                      toast(`${a.name} removed`, "warn"); }}><Trash2 size={13} /></button></td>
              </tr>))}
          </tbody>
        </table></div>
      </Card>
    </div>
  );
}

function MethodsScreen({ state, setState, books, toast }) {
  const [ed, setEd] = useState(null);
  const [q, setQ] = useState("");
  const list = METHODS.filter((m) => hits(q, m.name, METHOD_KINDS[m.kind].label, ACC[m.account] ? ACC[m.account].name : ""));
  const blank = () => ({ id: uid("mth"), name: "", kind: "bank", account: A.BANK, needsRef: true,
    refLabel: "Reference", direction: "both", active: true });
  const isNew = ed && !METHODS.some((m) => m.id === ed.id);
  const valid = ed && ed.name.trim().length > 1 && ed.account;
  const save = () => {
    const rec = { ...ed, name: ed.name.trim() };
    setState((x) => { const l = x.methods || [];
      return { ...x, methods: l.some((m) => m.id === rec.id) ? l.map((m) => (m.id === rec.id ? rec : m)) : [...l, rec] }; });
    toast(`${rec.name} saved`); setEd(null);
  };
  const used = (m) => state.payments.filter((p) => p.method === m.id).length;
  const remove = (m) => {
    if (used(m)) { toast(`${m.name} is used on ${used(m)} payments and cannot be deleted`, "warn"); return; }
    if (isSeedMethod(m.id)) { toast("Standard methods can be edited or deactivated, not deleted", "warn"); return; }
    setState((x) => ({ ...x, methods: (x.methods || []).filter((y) => y.id !== m.id) }));
    toast(`${m.name} removed`, "warn");
  };
  const toggle = (m) => {
    const rec = { ...m, active: !m.active };
    setState((x) => { const l = x.methods || [];
      return { ...x, methods: l.some((y) => y.id === m.id) ? l.map((y) => (y.id === m.id ? rec : y)) : [...l, rec] }; });
    toast(`${m.name} ${rec.active ? "activated" : "deactivated"}`, rec.active ? "" : "warn");
  };

  return (
    <div>
      <PageHead eyebrow="Treasury" title="Payment methods"
        sub="Each method points at a ledger account, so choosing it on a receipt decides where the money lands.">
        <Btn kind="pri" icon={Plus} onClick={() => setEd(blank())}>New method</Btn>
      </PageHead>

      {ed && (
        <Card title={isNew ? "New payment method" : `Edit ${ed.name || "method"}`}
          sub="The account you pick here is debited on a receipt and credited on a payment"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setEd(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>{isNew ? "Create method" : "Save changes"}</Btn></>}>
          <div className="picks" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
            {Object.entries(METHOD_KINDS).map(([k, kd]) => (
              <button key={k} className={cx("pick", ed.kind === k && "on")}
                onClick={() => setEd({ ...ed, kind: k, account: k === "cash" ? A.CASH : A.BANK,
                  needsRef: k !== "cash" })}>
                <span className={cx("gt sm", kd.grad)}><Banknote size={15} strokeWidth={1.9} /></span>
                <span className="pt"><b>{kd.label}</b></span>
                <span className="chk">{ed.kind === k && <Check size={11} strokeWidth={3.2} />}</span>
              </button>))}
          </div>
          <div className="setgrid">
            <Field label="Method name" span={2}><Input value={ed.name} placeholder="Emirates NBD transfer"
              onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
            <Field label="Posts to account">
              <Select value={ed.account} onChange={(e) => setEd({ ...ed, account: e.target.value })}>
                {ACCOUNTS.filter((a) => a.type === "bank").map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}
              </Select></Field>
            <Field label="Available for">
              <Select value={ed.direction} onChange={(e) => setEd({ ...ed, direction: e.target.value })}>
                <option value="both">Receipts and payments</option>
                <option value="in">Customer receipts only</option>
                <option value="out">Vendor payments only</option></Select></Field>
            <Field label="Requires a reference">
              <Select value={ed.needsRef ? "y" : "n"} onChange={(e) => setEd({ ...ed, needsRef: e.target.value === "y" })}>
                <option value="y">Yes</option><option value="n">No</option></Select></Field>
            {ed.needsRef && <Field label="Reference label">
              <Input value={ed.refLabel} placeholder="Cheque number"
                onChange={(e) => setEd({ ...ed, refLabel: e.target.value })} /></Field>}
            <Field label="Status">
              <Select value={ed.active ? "y" : "n"} onChange={(e) => setEd({ ...ed, active: e.target.value === "y" })}>
                <option value="y">Active</option><option value="n">Retired</option></Select></Field>
          </div>
          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-3)" }}>
            A receipt on this method debits <b style={{ color: "var(--ink)" }}>{ed.account} {ACC[ed.account] ? ACC[ed.account].name : ""}</b>
            {" "}and credits accounts receivable. A payment does the reverse.
          </div>
        </Card>)}

      <Card title="Methods" pad={false} sub={`${METHODS.filter((m) => m.active).length} active of ${METHODS.length}`}
        right={<SearchBox value={q} onChange={setQ} placeholder="Search method or account" width={240} />}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Method</th><th>Type</th><th>Posts to</th><th>Available for</th><th>Reference</th>
            <th>Status</th><th className="n">Used on</th><th style={{ width: 100 }} /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={8}><EmptyState icon={Wallet} title={`Nothing matches “${q}”`} /></td></tr>}
            {list.map((m) => (
              <tr key={m.id} style={m.active ? undefined : { opacity: .55 }}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={cx("gt sm", METHOD_KINDS[m.kind].grad)}><Banknote size={14} strokeWidth={1.9} /></span>
                  <b style={{ fontWeight: 500 }}>{m.name}</b>
                  {!isSeedMethod(m.id) && <Pill tone="gold">Custom</Pill>}</div></td>
                <td className="muted">{METHOD_KINDS[m.kind].label}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{m.account} {ACC[m.account] ? ACC[m.account].name : ""}</td>
                <td><Pill tone={m.direction === "both" ? "ok" : "info"}>
                  {m.direction === "both" ? "Both" : m.direction === "in" ? "Receipts" : "Payments"}</Pill></td>
                <td className="muted" style={{ fontSize: 12.5 }}>{m.needsRef ? m.refLabel || "Required" : "Not required"}</td>
                <td><Pill tone={m.active ? "ok" : "bad"} dot>{m.active ? "Active" : "Retired"}</Pill></td>
                <td className="n">{used(m)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                    title="Edit" onClick={() => setEd({ ...m })}><Pencil size={13} /></button>
                  <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                    title={m.active ? "Retire" : "Reactivate"} onClick={() => toggle(m)}>
                    {m.active ? <X size={13} /> : <Check size={13} />}</button>
                  {!isSeedMethod(m.id) && <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                    title="Remove" onClick={() => remove(m)}><Trash2 size={13} /></button>}
                </td>
              </tr>))}
          </tbody>
        </table></div>
      </Card>
    </div>
  );
}

function MethodPicker({ dir, value, onChange, refValue, onRef }) {
  const opts = methodsFor(dir);
  const m = MET[value];
  return (<>
    <Field label="Payment method">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </Select>
      {m && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>
        Posts to {m.account} {ACC[m.account] ? ACC[m.account].name : ""}</div>}
    </Field>
    {m && m.needsRef && (
      <Field label={m.refLabel || "Reference"}>
        <Input value={refValue} placeholder={m.refLabel || "Reference"} onChange={(e) => onRef(e.target.value)} />
      </Field>)}
  </>);
}

function BankingScreen({ state, setState, books, toast, go }) {
  const [tf, setTf] = useState(null);
  const accts = ACCOUNTS.filter((a) => a.type === "bank");
  const bal = (code) => R2(books.flat.filter((l) => l.acc === code).reduce((s, l) => s + l.debit - l.credit, 0));
  const total = R2(accts.reduce((s, a) => s + bal(a.code), 0));
  const blank = () => ({ from: A.BANK, to: A.CASH, amount: 0, date: TODAY, memo: "" });
  const ok = tf && +tf.amount > 0 && tf.from !== tf.to;
  const post = () => {
    const n = (state.manual || []).filter((e) => e.number.indexOf("TRF/") === 0)
      .reduce((m, e) => Math.max(m, +e.number.split("/").pop() || 0), 0);
    const je = { id: uid("je"), number: `TRF/${TODAY.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`,
      date: tf.date, ref: tf.memo || `Transfer to ${ACC[tf.to].name}`, journal: "Miscellaneous",
      lines: [{ acc: tf.to, debit: R2(+tf.amount), credit: 0, label: "Funds in", partner: null },
              { acc: tf.from, debit: 0, credit: R2(+tf.amount), label: "Funds out", partner: null }] };
    setState((x) => ({ ...x, manual: [...x.manual, je] }));
    toast(`${je.number} · ${money(je.lines[0].debit, false)} transferred`); setTf(null);
  };
  const moves = books.flat.filter((l) => accts.some((a) => a.code === l.acc)).slice().reverse().slice(0, 40);

  return (
    <div>
      <PageHead eyebrow="Treasury" title="Banking"
        sub="Balances are derived from every posted entry that touches a bank or cash account.">
        <Btn kind="pri" icon={Banknote} onClick={() => setTf(blank())}>Transfer money</Btn>
      </PageHead>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", marginBottom: 16 }}>
        {accts.map((a, i) => (
          <div className="card kpi" key={a.code}>
            <div className="kh">
              <span className={cx("gt", i === 0 ? "g4" : "g3")}><Landmark size={18} strokeWidth={1.9} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="kl">{a.name}</div>
                <div className="kv">AED {money(bal(a.code), false)}</div>
                <div className="kd"><Pill tone="ok" dot>Reconciled to the ledger</Pill></div>
              </div>
            </div>
            <div style={{ height: 17 }} />
          </div>))}
        <div className="card kpi">
          <div className="kh">
            <span className="gt g1"><Wallet size={18} strokeWidth={1.9} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kl">Total liquid funds</div>
              <div className="kv">AED {money(total, false)}</div>
              <div className="kd"><span>{accts.length} accounts</span></div>
            </div>
          </div>
          <div style={{ height: 17 }} />
        </div>
      </div>

      {tf && (
        <Card title="Transfer between accounts" sub="Posts a balanced journal — money out of one account, into the other"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setTf(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!ok} onClick={post}>Post transfer</Btn></>}>
          <div className="setgrid">
            <Field label="From">
              <Select value={tf.from} onChange={(e) => setTf({ ...tf, from: e.target.value })}>
                {accts.map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</Select>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>Available {money(bal(tf.from), false)}</div></Field>
            <Field label="To">
              <Select value={tf.to} onChange={(e) => setTf({ ...tf, to: e.target.value })}>
                {accts.map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</Select>
              {tf.from === tf.to && <div style={{ fontSize: 11.5, color: "var(--neg)", marginTop: 5 }}>Pick a different account</div>}</Field>
            <Field label="Amount · AED">
              <Input n type="number" step="0.01" value={tf.amount} onChange={(e) => setTf({ ...tf, amount: e.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={tf.date} onChange={(e) => setTf({ ...tf, date: e.target.value })} /></Field>
            <Field label="Memo" span={2}><Input value={tf.memo} placeholder="Cash drawn for petty cash float"
              onChange={(e) => setTf({ ...tf, memo: e.target.value })} /></Field>
          </div>
        </Card>)}

      <Card title="Bank and cash movements" sub="Every posted line touching a treasury account, newest first" pad={false}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Date</th><th>Entry</th><th>Account</th><th>Narration</th>
            <th className="n">In</th><th className="n">Out</th></tr></thead>
          <tbody>{moves.map((l) => (
            <tr key={l.key}>
              <td className="muted">{dmy(l.date)}</td>
              <td className="mono" style={{ fontSize: 12.5 }}>{l.number}</td>
              <td>{ACC[l.acc].name}</td>
              <td className="muted">{l.label}{l.partner ? ` — ${PMAP[l.partner].name}` : ""}</td>
              <td className="n" style={{ color: l.debit ? "var(--pos)" : undefined }}>{l.debit ? money(l.debit) : ""}</td>
              <td className="n" style={{ color: l.credit ? "var(--neg)" : undefined }}>{l.credit ? money(l.credit) : ""}</td>
            </tr>))}</tbody>
        </table></div>
      </Card>
    </div>
  );
}

function ExpensesScreen({ state, setState, books, toast }) {
  const [ex, setEx] = useState(null);
  const cats = ACCOUNTS.filter((a) => a.type === "expense");
  const firstVendor = (PARTNERS.find((p) => p.role === "vendor") || {}).id || "";
  const blank = () => ({ acc: "6900", amount: 0, vat: "s5", date: TODAY, memo: "",
    method: (methodsFor("out")[0] || METHODS[0]).id, payFrom: A.BANK, vendor: firstVendor, paid: true, ref: "" });
  const ok = ex && +ex.amount > 0 && ex.vendor;
  const vatOf = (e) => (TAX[e.vat] && TAX[e.vat].kind === "rcm" ? 0
    : R2((+e.amount || 0) * (TAX[e.vat] ? TAX[e.vat].rate : 0) / 100));
  /* An expense is a purchase. Booking it as a vendor bill means it reaches the
     VAT return, the audit file and aged payable exactly like any other bill. */
  const post = () => {
    const net = R2(+ex.amount), v = PMAP[ex.vendor];
    const base = PRODUCTS.find((p) => p.kind === "service" && /^EX-/.test(p.code)) || PRODUCTS.find((p) => p.kind === "service") || PRODUCTS[0];
    if (!base || !v) { toast(!v ? "Add a vendor first" : "Add an expense item under Products & services first", "warn"); return; }
    const bill = { id: uid("d"), type: "bill", number: nextNumber(state.docs, "bill"),
      partner: ex.vendor, date: ex.date, due: ex.paid ? ex.date : addDays(ex.date, v.terms),
      lines: [{ id: uid("l"), product: base.id, desc: ex.memo || ACC[ex.acc].name, qty: 1,
        price: net, disc: 0, tax: ex.vat, account: ex.acc }],
      ref: "", note: "Recorded through Expenses", state: "posted",
      seq: Math.max(0, ...state.docs.map((x) => x.seq||0), ...(state.stockOps||[]).map(x=>x.seq||0)) + 1, emirate: v.emirate };
    const gross = amounts(bill).total;
    const m = MET[ex.method] || METHODS[0];
    const pays = ex.paid ? [{ id: uid("pm"), kind: "out", number: nextPay(state.payments, "out"),
      partner: ex.vendor, date: ex.date, amount: gross, method: m.id, account: m.account,
      memo: [`Paid — ${ex.memo || ACC[ex.acc].name}`, ex.ref].filter(Boolean).join(" · ") }] : [];
    setState((x) => ({ ...x, docs: [...x.docs, freezeAccounts(bill)], payments: [...x.payments, ...pays] }));
    toast(`${bill.number} · ${money(gross, false)} recorded${ex.paid ? " and paid" : ""}`); setEx(null);
  };
  const fy = TODAY.slice(0, 4) + "-01-01";
  const spend = cats.map((a) => ({ a, v: R2(books.flat.filter((l) => l.acc === a.code && l.date >= fy)
    .reduce((s, l) => s + l.debit - l.credit, 0)) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const total = R2(spend.reduce((s, x) => s + x.v, 0));
  const logged = state.docs.filter((x) => x.note === "Recorded through Expenses").slice().reverse();

  return (
    <div>
      <PageHead eyebrow="Spending" title="Expenses"
        sub="Fast entry for overheads. Each one is booked as a vendor bill, so it reaches the VAT return, the audit file and aged payable like any other purchase.">
        <Btn kind="pri" icon={Plus} onClick={() => setEx(blank())}>Record expense</Btn>
      </PageHead>

      {ex && (
        <Card title="Record an expense" sub="VAT is separated automatically and lands in Box 9 of the return"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setEx(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!ok} onClick={post}>Post expense</Btn></>}>
          <div className="setgrid">
            <Field label="Category" span={2}>
              <Select value={ex.acc} onChange={(e) => setEx({ ...ex, acc: e.target.value })}>
                {cats.map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}</Select></Field>
            <Field label="Amount excluding VAT · AED">
              <Input n type="number" step="0.01" value={ex.amount} onChange={(e) => setEx({ ...ex, amount: e.target.value })} /></Field>
            <Field label="VAT treatment">
              <Select value={ex.vat} onChange={(e) => setEx({ ...ex, vat: e.target.value })}>
                {TAXES.filter((t) => t.scope !== "sale").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            <Field label="Date"><Input type="date" value={ex.date} onChange={(e) => setEx({ ...ex, date: e.target.value })} /></Field>
            <Field label="Supplier">
              <Select value={ex.vendor} onChange={(e) => setEx({ ...ex, vendor: e.target.value })}>
                {PARTNERS.filter((p) => p.role === "vendor").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Settlement">
              <Select value={ex.paid ? "paid" : "owed"} onChange={(e) => setEx({ ...ex, paid: e.target.value === "paid" })}>
                <option value="paid">Paid now</option><option value="owed">On credit</option></Select></Field>
            {ex.paid && <MethodPicker dir="out" value={ex.method}
              onChange={(id) => setEx({ ...ex, method: id, payFrom: MET[id] ? MET[id].account : ex.payFrom })}
              refValue={ex.ref} onRef={(v) => setEx({ ...ex, ref: v })} />}
            <Field label="Description" span={2}><Input value={ex.memo} placeholder="Etisalat — August"
              onChange={(e) => setEx({ ...ex, memo: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 26, flexWrap: "wrap", fontSize: 13 }}>
            <span className="muted">Net <b className="num" style={{ color: "var(--ink)" }}>{money(+ex.amount || 0, false)}</b></span>
            <span className="muted">Input VAT <b className="num" style={{ color: "var(--ink)" }}>{money(vatOf(ex), false)}</b></span>
            <span className="muted">Total <b className="num" style={{ color: "var(--ink)", fontSize: 15 }}>{money(R2((+ex.amount || 0) + vatOf(ex)), false)}</b></span>
          </div>
        </Card>)}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Expenses by category" sub={`Year to date · ${money(total, false)} AED`}>
          {spend.length === 0 ? <EmptyState icon={Wallet} title="Nothing recorded yet" />
            : <Donut caption="Total spend" slices={spend.slice(0, 6).map((x, i) => ({
                label: x.a.name, value: x.v,
                color: ["#4F7CFF", "#EC4899", "#22D3EE", "#F5B544", "#9061F9", "#22C58B"][i] }))} />}
        </Card>
        <Card title="Recent quick expenses" pad={false} sub={`${logged.length} recorded through this screen`}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Entry</th><th>Date</th><th>Description</th><th className="n">Amount</th></tr></thead>
            <tbody>
              {logged.length === 0 && <tr><td colSpan={4}>
                <EmptyState icon={Wallet} title="No quick expenses yet">Use Record expense above.</EmptyState></td></tr>}
              {logged.slice(0, 12).map((e) => (
                <tr key={e.id}>
                  <td className="mono" style={{ fontSize: 12.5 }}>{e.number}</td>
                  <td className="muted">{dmy(e.date)}</td><td>{e.lines[0] ? e.lines[0].desc : ""}</td>
                  <td className="n">{money(amounts(e).total)}</td>
                </tr>))}
            </tbody>
          </table></div>
        </Card>
      </div>
    </div>
  );
}

/* Gross profit attributed line by line: revenue from the document, cost from
   the stock movement the same document raised. */
function profitability(state, books, from, to, by) {
  const costOf = {};
  books.moves.forEach((m) => {
    if (m.docType !== "invoice" && m.docType !== "credit_note") return;
    const k = m.docId + "|" + m.product;
    costOf[k] = R2((costOf[k] || 0) - m.value);   // outbound value is negative
  });
  const rows = {};
  state.docs.filter((d) => d.state === "posted" && DOCMETA[d.type].side === "sale" && inRange(d.date, from, to))
    .forEach((d) => {
      const sgn = SIGNS[d.type];
      amounts(d).lines.forEach((l) => {
        const p = PROD[l.product];
        const key = by === "product" ? l.product : d.partner;
        const r = rows[key] || (rows[key] = { key, revenue: 0, cost: 0, qty: 0, docs: new Set() });
        r.revenue = R2(r.revenue + l.amount * sgn);
        r.qty = R2(r.qty + l.qty * sgn);
        r.docs.add(d.id);
        if (p && p.kind === "goods") r.cost = R2(r.cost + (costOf[d.id + "|" + l.product] || 0));
      });
    });
  const out = Object.values(rows).map((r) => ({
    ...r, docs: r.docs.size, profit: R2(r.revenue - r.cost),
    margin: r.revenue ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
    name: by === "product" ? (PROD[r.key] ? PROD[r.key].name : r.key) : (PMAP[r.key] ? PMAP[r.key].name : r.key),
    code: by === "product" ? (PROD[r.key] ? PROD[r.key].code : "") : (PMAP[r.key] ? PMAP[r.key].emirate : ""),
    kind: by === "product" && PROD[r.key] ? PROD[r.key].kind : null,
  })).filter((r) => Math.abs(r.revenue) > 0.004).sort((a, b) => b.profit - a.profit);
  const t = out.reduce((s, r) => ({ revenue: R2(s.revenue + r.revenue), cost: R2(s.cost + r.cost),
    profit: R2(s.profit + r.profit) }), { revenue: 0, cost: 0, profit: 0 });
  return { rows: out, t, margin: t.revenue ? (t.profit / t.revenue) * 100 : 0 };
}

function StatementScreen({ state, books, p, setP, toast, fta, param }) {
  const CO = useCo();
  const [pid, setPid] = useState(param || (PARTNERS.find((x) => x.role === "customer") || PARTNERS[0]).id);
  const [sheet, setSheet] = useState(false);
  React.useEffect(() => { if (param) setPid(param); }, [param]);
  const pt = PMAP[pid] || PARTNERS[0];
  const isCust = pt.role === "customer";
  const g = partnerLedger(books.flat, pid, p.from, p.to);
  const age = aging(state, isCust ? "receivable" : "payable", p.to);
  const row = age.rows.find((r) => r.partner.id === pid);
  const buckets = row ? row.b : [0, 0, 0, 0, 0, 0];
  const due = row ? row.total : 0;
  const oldest = row && row.items.length
    ? row.items.slice().sort((a, b) => a.due.localeCompare(b.due))[0] : null;

  const msg = `Dear ${pt.name},\n\nPlease find your statement of account from ${CO.name} as at ${dmy(p.to)}.\n\n` +
    `Balance outstanding: AED ${money(due, false)}\n` +
    (oldest ? `Oldest open item: ${oldest.number}, due ${dmy(oldest.due)}\n` : "") +
    `\nWe would be grateful for settlement of any overdue amounts. Thank you for your business.`;

  return (
    <div className="grid">
      {sheet && <StatementSheet close={() => setSheet(false)} party={pt} g={g} buckets={buckets}
        due={due} p={p} msg={msg} toast={toast} isCust={isCust} />}
      <PageHead eyebrow="Collections" title="Statement of account"
        sub="Send a customer their full activity and what is still open. The fastest way to get paid.">
        <Field label="Counterparty">
          <Select value={pid} onChange={(e) => setPid(e.target.value)} style={{ width: 260 }}>
            <optgroup label="Customers">{PARTNERS.filter((x) => x.role === "customer").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>
            <optgroup label="Vendors">{PARTNERS.filter((x) => x.role === "vendor").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>
          </Select></Field>
        <RangePicker value={{ preset: p.preset, from: p.from, to: p.to }} onChange={(r) => setP({ ...p, ...r })} />
        <Btn kind="pri" icon={Send} onClick={() => setSheet(true)}>Print / send</Btn>
      </PageHead>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {[["Opening balance", g.open, "g4", Landmark], ["Invoiced in period", g.d, "g1", FileText],
          ["Received in period", g.c, "g3", Wallet],
          [isCust ? "Balance due" : "Balance owed", due, due > 0 ? "g7" : "g3", Receipt]].map(([l, v, gr, I]) => (
          <div className="card kpi" key={l}>
            <div className="kh"><span className={cx("gt", gr)}><I size={18} strokeWidth={1.9} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="kl">{l}</div>
                <div className="kv">AED {money(v, false)}</div>
                <div className="kd"><span>{dmy(p.from)} to {dmy(p.to)}</span></div></div></div>
            <div style={{ height: 17 }} />
          </div>))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <Card title="Activity" pad={false} sub={`${g.rows.length} movements in the period`}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Date</th><th>Document</th><th>Detail</th>
              <th className="n">Charges</th><th className="n">Credits</th><th className="n">Balance</th></tr></thead>
            <tbody>
              <tr className="sub"><td colSpan={3}>Balance brought forward</td><td /><td />
                <td className="n">{money(g.open)}</td></tr>
              {g.rows.length === 0 && <tr><td colSpan={6}>
                <EmptyState icon={Receipt} title="Nothing moved in this period" /></td></tr>}
              {g.rows.map((l) => (
                <tr key={l.key}>
                  <td className="muted">{dmy(l.date)}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{l.number}</td>
                  <td>{l.label}</td>
                  <td className="n">{l.debit ? money(l.debit) : ""}</td>
                  <td className="n">{l.credit ? money(l.credit) : ""}</td>
                  <td className="n">{money(l.run)}</td></tr>))}
            </tbody>
            <tfoot><tr><td colSpan={3}>Closing balance</td>
              <td className="n">{money(g.d)}</td><td className="n">{money(g.c)}</td>
              <td className="n">{money(g.close)}</td></tr></tfoot>
          </table></div>
        </Card>
        <div className="grid">
          <Card title="How old is it" sub={`Aged on due date as at ${dmy(p.to)}`}>
            <BarList rows={buckets.map((v, i) => ({ label: BUCKETS[i], value: v,
              color: i > 2 ? "var(--neg)" : i > 0 ? "var(--warn)" : "var(--brand)" }))} />
            {oldest && <div style={{ marginTop: 16, padding: "12px 13px", borderRadius: "var(--r)",
              background: daysBetween(oldest.due, p.to) > 0 ? "var(--neg-50)" : "var(--surface-2)",
              color: daysBetween(oldest.due, p.to) > 0 ? "var(--neg)" : "var(--ink-2)", fontSize: 12.5, lineHeight: 1.6 }}>
              Oldest open item is <b>{oldest.number}</b> for {money(oldest.open, false)},
              {daysBetween(oldest.due, p.to) > 0
                ? ` ${daysBetween(oldest.due, p.to)} days past due.`
                : ` due ${dmy(oldest.due)}.`}
            </div>}
          </Card>
          <Card title="Contact">
            <div className="sumrow"><span className="k">TRN</span><span className="v">{pt.trn || "—"}</span></div>
            <div className="sumrow"><span className="k">Terms</span><span className="v">{pt.terms} days</span></div>
            <div className="sumrow"><span className="k">Email</span>
              <span style={{ marginLeft: "auto", fontSize: 12.5 }}>{pt.contact || "not on file"}</span></div>
            <div className="sumrow"><span className="k">WhatsApp</span>
              <span style={{ marginLeft: "auto", fontSize: 12.5 }}>{pt.phone || "not on file"}</span></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatementSheet({ close, party, g, buckets, due, p, msg, toast, isCust }) {
  const CO = useCo();
  const fileName = `Statement-${party.name.replace(/[^A-Za-z0-9]+/g, "-")}-${p.to}.pdf`;
  const buildPdf = () => {
    const JS = window.jspdf && window.jspdf.jsPDF;
    if (!JS) return null;
    const doc = new JS({ orientation: "portrait", unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(11, 65, 51); doc.rect(0, 0, W, 108, "F");
    doc.setFillColor(214, 171, 87); doc.rect(0, 106, W, 2.5, "F");
    let ty = 42;
    if (CO.logo) { try { doc.addImage(CO.logo, 40, 24, 0, 24); ty = 64; } catch (e) {} }
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(CO.name, 40, ty);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(196, 216, 210);
    doc.text(`${CO.address}\n${CO.city}\nTRN ${CO.trn}`, 40, ty + 13);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text("STATEMENT OF ACCOUNT", W - 40, 42, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(196, 216, 210);
    doc.text(`${dmy(p.from)} to ${dmy(p.to)}`, W - 40, 60, { align: "right" });
    doc.setTextColor(20, 42, 52); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text("ACCOUNT", 40, 136);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.text(`${party.name}\n${party.address || ""}\nTRN ${party.trn || "not registered"}`, 40, 150);
    doc.autoTable({
      startY: 200, margin: { left: 40, right: 40 },
      head: [["Date", "Document", "Detail", "Charges", "Credits", "Balance"]],
      body: [["", "", "Balance brought forward", "", "", money(g.open, false)]].concat(
        g.rows.map((l) => [dmy(l.date), l.number, l.label, l.debit ? money(l.debit, false) : "",
          l.credit ? money(l.credit, false) : "", money(l.run, false)])),
      foot: [["", "", "Closing balance", money(g.d, false), money(g.c, false), money(g.close, false)]],
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, lineColor: [225, 233, 237], lineWidth: 0.4 },
      headStyles: { fillColor: [242, 246, 247], textColor: [70, 96, 107], fontStyle: "bold", fontSize: 7.5 },
      footStyles: { fillColor: [242, 246, 247], textColor: [20, 42, 52], fontStyle: "bold" },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    });
    let y = doc.lastAutoTable.finalY + 24;
    doc.autoTable({
      startY: y, margin: { left: 40, right: 40 },
      head: [BUCKETS], body: [buckets.map((v) => money(v, false))],
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, halign: "right" },
      headStyles: { fillColor: [242, 246, 247], textColor: [70, 96, 107], fontStyle: "bold", fontSize: 7.5, halign: "right" },
    });
    y = doc.lastAutoTable.finalY + 26;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(11, 65, 51);
    doc.text(isCust ? "TOTAL DUE  AED" : "TOTAL OWED  AED", W - 200, y);
    doc.text(money(due, false), W - 40, y, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(150, 168, 178);
    doc.text(`${CO.name} · TRN ${CO.trn} · generated by Invoeez on ${dmy(TODAY)}`,
      40, doc.internal.pageSize.getHeight() - 34);
    return doc;
  };
  const savePdf = () => { const doc = buildPdf(); if (!doc) { window.print(); return; }
    saveBlob(doc.output("blob"), fileName); toast(`${fileName} downloaded`); };
  const deliver = async (channel) => {
    const doc = buildPdf(), blob = doc ? doc.output("blob") : null;
    if (blob && window.isSecureContext !== false && typeof navigator.share === "function" && typeof File === "function") {
      try {
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Statement — ${party.name}`, text: msg });
          toast("Statement shared with the PDF attached"); close(); return;
        }
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    if (blob) saveBlob(blob, fileName);
    try { if (navigator.clipboard) await navigator.clipboard.writeText(msg); } catch (e) {}
    if (channel === "wa") {
      const num = String(party.phone || "").replace(/[^0-9]/g, "");
      if (!num) { toast(`No WhatsApp number on file for ${party.name}`, "warn"); return; }
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      window.open(`mailto:${encodeURIComponent(party.contact || "")}?subject=${encodeURIComponent(`Statement of account — ${dmy(p.to)}`)}&body=${encodeURIComponent(msg)}`, "_blank");
    }
    toast(`${fileName} saved — attach it in the window that opened`, "warn");
  };

  return (
    <div className="scrim" onMouseDown={close}>
      <div style={{ maxWidth: 880, width: "100%", margin: "0 auto" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sendbar noprint">
          <Btn icon={FileDown} onClick={savePdf}>Download PDF</Btn>
          <Btn icon={Printer} onClick={() => window.print()}>Print</Btn>
          <Btn icon={Mail} onClick={() => deliver("mail")}>Email</Btn>
          <Btn kind="wa" icon={MessageCircle} onClick={() => deliver("wa")}>WhatsApp</Btn>
          <Btn icon={X} onClick={close}>Close</Btn>
        </div>
        <div className="sheet">
          <div className="sheet-crest">
            <div className="rowtop">
              <div style={{ flex: 1, minWidth: 0 }}>
                {CO.logo && <img className="sheet-logo" src={CO.logo} alt="" />}
                <h1>{CO.name}</h1>
                <div className="sub">{CO.address}<br />{CO.city}<br />TRN {CO.trn}</div>
              </div>
              <div className="doc">
                <span className="badge">Statement of account</span>
                <div className="no">{party.name}</div>
                <div className="dt">{dmy(p.from)} to {dmy(p.to)}</div>
              </div>
            </div>
          </div>
          <div className="sheet-body">
            <div className="tbl-wrap"><table className="tbl" style={{ fontSize: 12.5 }}>
              <thead><tr><th>Date</th><th>Document</th><th>Detail</th>
                <th className="n">Charges</th><th className="n">Credits</th><th className="n">Balance</th></tr></thead>
              <tbody>
                <tr className="sub"><td colSpan={3}>Balance brought forward</td><td /><td /><td className="n">{money(g.open)}</td></tr>
                {g.rows.map((l) => (
                  <tr key={l.key}><td className="muted">{dmy(l.date)}</td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{l.number}</td><td>{l.label}</td>
                    <td className="n">{l.debit ? money(l.debit) : ""}</td>
                    <td className="n">{l.credit ? money(l.credit) : ""}</td>
                    <td className="n">{money(l.run)}</td></tr>))}
              </tbody>
              <tfoot><tr><td colSpan={3}>Closing balance</td><td className="n">{money(g.d)}</td>
                <td className="n">{money(g.c)}</td><td className="n">{money(g.close)}</td></tr></tfoot>
            </table></div>
            <div style={{ display: "flex", gap: 28, marginTop: 26, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 320px" }}>
                <div className="micro" style={{ marginBottom: 12 }}>Ageing at {dmy(p.to)}</div>
                <BarList rows={buckets.map((v, i) => ({ label: BUCKETS[i], value: v,
                  color: i > 2 ? "#CC3355" : i > 0 ? "#96620B" : "#0E5C4A" }))} />
              </div>
              <div style={{ flex: "0 0 280px" }}>
                <div className="totbox">
                  <div className="grand"><b>{isCust ? "TOTAL DUE" : "TOTAL OWED"} · AED</b>
                    <span>{money(due, false)}</span></div>
                </div>
                <div className="payblk" style={{ marginTop: 14 }}>
                  Please settle any overdue amounts by bank transfer, quoting the invoice number as the reference.
                </div>
              </div>
            </div>
            <div className="foot">
              <span style={{ flex: "1 1 340px" }}>This statement reflects all documents posted up to {dmy(p.to)}.
                Please advise within seven days of any discrepancy.</span>
              <span>{CO.name} · TRN {CO.trn}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodReport({ state, books, p, setP, toast }) {
  const C = useC();
  const inRangePays = state.payments.filter((x) => inRange(x.date, p.from, p.to));
  const rows = METHODS.map((m) => {
    const mine = inRangePays.filter((x) => (x.method || "m1") === m.id);
    const rec = R2(mine.filter((x) => x.kind === "in").reduce((s, x) => s + x.amount, 0));
    const paid = R2(mine.filter((x) => x.kind === "out").reduce((s, x) => s + x.amount, 0));
    return { m, inN: mine.filter((x) => x.kind === "in").length, outN: mine.filter((x) => x.kind === "out").length,
      rec, paid, net: R2(rec - paid) };
  }).filter((r) => r.inN || r.outN);
  const t = rows.reduce((s, r) => ({ rec: R2(s.rec + r.rec), paid: R2(s.paid + r.paid), net: R2(s.net + r.net),
    inN: s.inN + r.inN, outN: s.outN + r.outN }), { rec: 0, paid: 0, net: 0, inN: 0, outN: 0 });

  /* Every method points at an account, so the two views must agree. */
  const byAcc = {};
  rows.forEach((r) => { byAcc[r.m.account] = R2((byAcc[r.m.account] || 0) + r.net); });
  const ledger = {};
  books.flat.filter((l) => inRange(l.date, p.from, p.to) && ACC[l.acc] && ACC[l.acc].type === "bank"
    && (l.journal === "Bank Receipts" || l.journal === "Bank Payments"))
    .forEach((l) => { ledger[l.acc] = R2((ledger[l.acc] || 0) + l.debit - l.credit); });
  const accRows = ACCOUNTS.filter((a) => a.type === "bank")
    .map((a) => ({ a, method: byAcc[a.code] || 0, ledger: ledger[a.code] || 0 }))
    .filter((x) => Math.abs(x.method) > 0.004 || Math.abs(x.ledger) > 0.004);
  const tied = accRows.every((x) => Math.abs(x.method - x.ledger) < 0.02);
  const palette = ["#4F7CFF", "#22C58B", "#F5B544", "#EC4899", "#22D3EE", "#9061F9"];

  return (
    <div className="grid">
      <ReportFrame toast={toast} title="Receipts &amp; Payments by Method"
        meta={`${dmy(p.from)} to ${dmy(p.to)} · ${inRangePays.length} transactions · AED`}
        right={<PeriodBar p={p} setP={setP} />}>
        <div className="card-b" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            {[["Received", t.rec, "pos", `${t.inN} receipts`], ["Paid out", t.paid, "neg", `${t.outN} payments`],
              ["Net movement", t.net, t.net >= 0 ? "pos" : "neg", "across all methods"],
              ["Methods in use", null, "", `${rows.length} of ${METHODS.length} configured`]].map(([k, v, tone, note], i) => (
              <div key={k}><div className="micro">{k}</div>
                <div className="num" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.03em", marginTop: 7,
                  color: tone ? `var(--${tone})` : undefined }}>
                  {i === 3 ? rows.length : money(v, false)}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{note}</div></div>))}
          </div>
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Method</th><th>Type</th><th>Posts to</th>
            <th className="n">Receipts</th><th className="n">Received</th>
            <th className="n">Payments</th><th className="n">Paid</th><th className="n">Net</th>
            <th style={{ width: 130 }}>Share of receipts</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9}>
              <EmptyState icon={Wallet} title="No money moved in this period">Widen the range above.</EmptyState></td></tr>}
            {rows.map((r) => (
              <tr key={r.m.id}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={cx("gt sm", METHOD_KINDS[r.m.kind].grad)}><Banknote size={14} strokeWidth={1.9} /></span>
                  <b style={{ fontWeight: 500 }}>{r.m.name}</b></div></td>
                <td className="muted">{METHOD_KINDS[r.m.kind].label}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{r.m.account} {ACC[r.m.account] ? ACC[r.m.account].name : ""}</td>
                <td className="n">{r.inN || ""}</td>
                <td className="n" style={{ color: r.rec ? "var(--pos)" : undefined }}>{money(r.rec)}</td>
                <td className="n">{r.outN || ""}</td>
                <td className="n" style={{ color: r.paid ? "var(--neg)" : undefined }}>{money(r.paid)}</td>
                <td className="n" style={{ fontWeight: 600 }}>{money(r.net)}</td>
                <td><span style={{ display: "block", height: 8, borderRadius: 20, background: "var(--surface-3)", overflow: "hidden" }}>
                  <i style={{ display: "block", height: "100%", borderRadius: 20,
                    width: `${t.rec ? (r.rec / t.rec) * 100 : 0}%`, background: "var(--brand)" }} /></span></td>
              </tr>))}
          </tbody>
          <tfoot><tr><td colSpan={3}>Totals</td>
            <td className="n">{t.inN}</td><td className="n">{money(t.rec)}</td>
            <td className="n">{t.outN}</td><td className="n">{money(t.paid)}</td>
            <td className="n">{money(t.net)}</td><td /></tr></tfoot>
        </table></div>
      </ReportFrame>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="How customers pay you" sub={`Receipts by method · ${presetLabel(p)}`}>
          {rows.filter((r) => r.rec > 0).length === 0
            ? <EmptyState icon={Wallet} title="No receipts in this period" />
            : <Donut caption="Total received" slices={rows.filter((r) => r.rec > 0)
                .map((r, i) => ({ label: r.m.name, value: r.rec, color: palette[i % palette.length] }))}
                sub="Useful for deciding which channels to keep and which to retire." />}
        </Card>
        <Card title="Reconciliation" pad={false}
          sub="Method totals against what actually hit each bank and cash account">
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Account</th><th className="n">By method</th><th className="n">Per ledger</th><th className="n">Difference</th></tr></thead>
            <tbody>{accRows.map((x) => (
              <tr key={x.a.code}>
                <td>{x.a.code} {x.a.name}</td>
                <td className="n">{money(x.method)}</td>
                <td className="n">{money(x.ledger)}</td>
                <td className="n" style={{ color: Math.abs(x.method - x.ledger) < 0.02 ? "var(--pos)" : "var(--neg)" }}>
                  {Math.abs(x.method - x.ledger) < 0.02 ? "—" : money(R2(x.method - x.ledger))}</td>
              </tr>))}</tbody>
          </table></div>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5,
            background: tied ? "var(--pos-50)" : "var(--neg-50)", color: tied ? "var(--pos)" : "var(--neg)" }}>
            {tied ? <Check size={15} strokeWidth={2.3} /> : <AlertTriangle size={15} strokeWidth={2.1} />}
            {tied ? "Every method reconciles to its ledger account."
              : "A method total does not match its account — check for payments posted outside a method."}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProfitReport({ state, books, p, setP, by, toast }) {
  const C = useC();
  const r = profitability(state, books, p.from, p.to, by);
  const isProd = by === "product";
  const top = r.rows.filter((x) => x.profit > 0).slice(0, 6);
  return (
    <div className="grid">
      <ReportFrame toast={toast} title={isProd ? "Profitability by Product" : "Profitability by Customer"}
        meta={`${dmy(p.from)} to ${dmy(p.to)} · costed on ${COSTING[state.costing || "avco"].label} · AED`}
        right={<PeriodBar p={p} setP={setP} />}>
        <div className="card-b" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            {[["Revenue", r.t.revenue, ""], ["Cost of sales", r.t.cost, ""],
              ["Gross profit", r.t.profit, r.t.profit >= 0 ? "pos" : "neg"],
              ["Blended margin", null, ""]].map(([k, v, tone], i) => (
              <div key={k}><div className="micro">{k}</div>
                <div className="num" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.03em", marginTop: 7,
                  color: tone ? `var(--${tone})` : undefined }}>
                  {i === 3 ? `${r.margin.toFixed(1)}%` : money(v, false)}</div></div>))}
          </div>
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr>
            <th>{isProd ? "Product" : "Customer"}</th>
            <th>{isProd ? "Type" : "Territory"}</th>
            <th className="n">{isProd ? "Units sold" : "Invoices"}</th>
            <th className="n">Revenue</th><th className="n">Cost of sales</th>
            <th className="n">Gross profit</th><th className="n">Margin</th><th style={{ width: 130 }}>Share</th>
          </tr></thead>
          <tbody>
            {r.rows.length === 0 && <tr><td colSpan={8}>
              <EmptyState icon={BarChart3} title="No sales in this period">Widen the range above.</EmptyState></td></tr>}
            {r.rows.map((x) => (
              <tr key={x.key}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isProd ? <span className={cx("gt sm", x.kind === "goods" ? "g5" : "g6")}>
                    {x.kind === "goods" ? <Package size={14} strokeWidth={1.9} /> : <Layers size={14} strokeWidth={1.9} />}</span>
                    : <Avatar name={x.name} />}
                  <div style={{ minWidth: 0 }}><b style={{ fontWeight: 500 }}>{x.name}</b>
                    {isProd && <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{x.code}</div>}</div></div></td>
                <td>{isProd ? <Pill tone={x.kind === "goods" ? "gold" : "info"}>{x.kind === "goods" ? "Goods" : "Service"}</Pill>
                  : <span className="muted">{x.code}</span>}</td>
                <td className="n">{isProd ? x.qty : x.docs}</td>
                <td className="n">{money(x.revenue)}</td>
                <td className="n">{money(x.cost)}</td>
                <td className="n" style={{ fontWeight: 600, color: x.profit >= 0 ? "var(--pos)" : "var(--neg)" }}>{money(x.profit)}</td>
                <td className="n" style={{ color: x.margin < 15 ? "var(--warn)" : undefined }}>{x.margin.toFixed(1)}%</td>
                <td><span className="bt" style={{ display: "block", height: 8, borderRadius: 20, background: "var(--surface-3)", overflow: "hidden" }}>
                  <i style={{ display: "block", height: "100%", borderRadius: 20,
                    width: `${r.t.profit > 0 ? Math.max(0, (x.profit / r.t.profit) * 100) : 0}%`,
                    background: x.profit >= 0 ? "var(--brand)" : "var(--neg)" }} /></span></td>
              </tr>))}
          </tbody>
          <tfoot><tr><td colSpan={3}>Totals — {r.rows.length} {isProd ? "items" : "customers"}</td>
            <td className="n">{money(r.t.revenue)}</td><td className="n">{money(r.t.cost)}</td>
            <td className="n">{money(r.t.profit)}</td><td className="n">{r.margin.toFixed(1)}%</td><td /></tr></tfoot>
        </table></div>
      </ReportFrame>

      {top.length > 0 && (
        <Card title={`Where the profit comes from`} sub={`Top ${top.length} by gross profit · ${presetLabel(p)}`}>
          <Donut caption="Gross profit" slices={top.map((x, i) => ({ label: x.name, value: x.profit,
            color: ["#4F7CFF", "#EC4899", "#22D3EE", "#F5B544", "#9061F9", "#22C58B"][i] }))}
            sub={`Costed on ${COSTING[state.costing || "avco"].label.toLowerCase()}. Switch the method in Settings to see the effect.`} />
        </Card>)}
    </div>
  );
}

/* ==========================================================================
   FTA COMPLIANCE — audit file, VAT 201 filing pack, PINT AE e-invoicing
   The UAE runs a 5-corner Peppol (DCTCE) model: no system connects to the FTA
   directly. Structured documents are handed to an Accredited Service Provider,
   which validates, transmits and reports tax data onward. Everything below is
   built to be handed to an ASP or an auditor.
   ========================================================================== */

/* Compact SHA-256 — every submitted e-invoice is fingerprinted, as ZATCA does in KSA. */
function sha256(msg) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const utf8 = unescape(encodeURIComponent(msg));
  const len = utf8.length, words = [];
  for (let i = 0; i < len; i++) words[i >> 2] = (words[i >> 2] || 0) | (utf8.charCodeAt(i) << (24 - (i % 4) * 8));
  words[len >> 2] = (words[len >> 2] || 0) | (0x80 << (24 - (len % 4) * 8));
  const total = (((len + 8) >> 6) + 1) * 16;
  for (let i = 0; i < total; i++) words[i] = words[i] || 0;
  words[total - 1] = len * 8;
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < total; i += 16) {
    const w = words.slice(i, i + 16);
    for (let t = 16; t < 64; t++) {
      const s0 = rr(w[t - 15], 7) ^ rr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rr(w[t - 2], 17) ^ rr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = H.map((v, j) => (v + [a, b, c, d, e, f, g, h][j]) | 0);
  }
  return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}
const uuidv4 = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
});

const EINV_STATES = {
  none:      { label: "Not submitted", tone: "" },
  invalid:   { label: "Validation failed", tone: "bad" },
  ready:     { label: "Ready to send", tone: "info" },
  queued:    { label: "Queued", tone: "gold" },
  submitted: { label: "Sent to provider", tone: "gold" },
  accepted:  { label: "Accepted", tone: "ok" },
  rejected:  { label: "Rejected", tone: "bad" },
};

const DEFAULT_WA = `Dear {customer},

Please find {title} {document} from {company}.

Amount due: {amount}
Payment due by: {due}

The PDF follows in the next message. Thank you for your business.`;

const TAXCODE = { s5: "SR", z0: "ZR", ex: "EX", rc5: "RC", nt: "OS" };
const dl = (text, name, mime) => saveText(text, name, mime);
const xesc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---- FTA Audit File: company block, purchases, supplies, general ledger -- */
function buildFAF(state, books, CO, from, to) {
  const q = (v) => { const x = v == null ? "" : String(v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
  const L = [];
  const row = (...c) => L.push(c.map(q).join(","));

  row("COMPANY INFORMATION");
  row("Company Name", CO.name);
  row("Tax Registration Number", CO.trn);
  row("Tax Agency Name", "");
  row("Tax Agency TAN", "");
  row("Tax Agent Name", "");
  row("Tax Agent TAAN", "");
  row("Period Start", from);
  row("Period End", to);
  row("FAF Creation Date", TODAY);
  row("Product Version", `Invoeez Enterprise Edition ${BUILD}`);
  row("FAF Version", "FAF v1.0");
  row("");

  const docs = state.docs.filter((d) => d.state === "posted" && inRange(d.date, from, to));
  const pur = docs.filter((d) => DOCMETA[d.type].side === "purchase");
  const sup = docs.filter((d) => DOCMETA[d.type].side === "sale");

  row("PURCHASE");
  row("Supplier Name", "Supplier TRN", "Invoice Date", "Invoice Number", "Permit Number",
    "Line Description", "Product Code", "Quantity", "Amount AED", "VAT AED", "Tax Code",
    "FC Currency", "FC Amount", "FC VAT");
  let pn = 0, pv = 0;
  pur.forEach((d) => { const sgn = SIGNS[d.type];
    amounts(d).lines.forEach((l) => {
      const net = R2(l.amount * sgn), vat = R2(l.taxAmt * sgn);
      pn = R2(pn + net); pv = R2(pv + vat);
      row(PMAP[d.partner].name, PMAP[d.partner].trn || "", d.date, d.number, "",
        l.desc, PROD[l.product] ? PROD[l.product].code : "", l.qty * sgn, net, vat,
        TAXCODE[l.tax] || "SR", CO.currency, net, vat);
    });
  });
  row("Total", "", "", "", "", "", "", "", pn, pv);
  row("");

  row("SUPPLY");
  row("Customer Name", "Customer TRN", "Invoice Date", "Invoice Number", "Line Description",
    "Product Code", "Quantity", "Amount AED", "VAT AED", "Tax Code", "Country / Emirate",
    "FC Currency", "FC Amount", "FC VAT");
  let sn = 0, sv = 0;
  sup.forEach((d) => { const sgn = SIGNS[d.type];
    amounts(d).lines.forEach((l) => {
      const net = R2(l.amount * sgn), vat = R2(l.taxAmt * sgn);
      sn = R2(sn + net); sv = R2(sv + vat);
      row(PMAP[d.partner].name, PMAP[d.partner].trn || "", d.date, d.number, l.desc,
        PROD[l.product] ? PROD[l.product].code : "", l.qty * sgn, net, vat,
        TAXCODE[l.tax] || "SR", d.emirate, CO.currency, net, vat);
    });
  });
  row("Total", "", "", "", "", "", "", sn, sv);
  row("");

  row("GENERAL LEDGER");
  row("Transaction Date", "Account ID", "Account Name", "Description", "Name", "TRN",
    "Transaction ID", "Source Document", "Source Type", "Debit", "Credit", "Balance");
  let bal = 0, gd = 0, gc = 0;
  books.flat.filter((l) => inRange(l.date, from, to)).forEach((l) => {
    bal = R2(bal + l.debit - l.credit); gd = R2(gd + l.debit); gc = R2(gc + l.credit);
    row(l.date, l.acc, ACC[l.acc] ? ACC[l.acc].name : "", l.label,
      l.partner ? PMAP[l.partner].name : "", l.partner ? PMAP[l.partner].trn || "" : "",
      l.number, l.number, l.journal, l.debit, l.credit, bal);
  });
  row("Total", "", "", "", "", "", "", "", "", gd, gc, bal);

  return { csv: L.join("\n"), purchaseLines: pur.length, supplyLines: sup.length,
    glLines: books.flat.filter((l) => inRange(l.date, from, to)).length,
    purNet: pn, purVat: pv, supNet: sn, supVat: sv };
}

/* ---- PINT AE: UBL 2.1 invoice shaped for the UAE Peppol specification ---- */
function buildPINT(d, CO) {
  const am = amounts(d), p = PMAP[d.partner];
  const party = (n, trn, street, city, scheme) => `    <cac:Party>
      <cbc:EndpointID schemeID="${scheme}">${xesc(trn || "0000000000000000")}</cbc:EndpointID>
      <cac:PostalAddress>
        <cbc:StreetName>${xesc(street)}</cbc:StreetName>
        <cbc:CityName>${xesc(city)}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>AE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xesc(trn)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${xesc(n)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>`;
  const cat = (k) => (k === "standard" ? "S" : k === "zero" ? "Z" : k === "exempt" ? "E" : k === "rcm" ? "AE" : "O");
  const lines = am.lines.map((l, i) => `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">${l.qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="AED">${l.amount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${xesc(l.desc)}</cbc:Name>
      <cac:SellersItemIdentification><cbc:ID>${xesc(PROD[l.product] ? PROD[l.product].code : "")}</cbc:ID></cac:SellersItemIdentification>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${cat(l.kind)}</cbc:ID>
        <cbc:Percent>${l.rate.toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="AED">${l.price.toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>
  <cbc:ProfileID>urn:peppol:bis:billing</cbc:ProfileID>
  <cbc:ID>${xesc(d.number)}</cbc:ID>
  <cbc:IssueDate>${d.date}</cbc:IssueDate>
  <cbc:DueDate>${d.due}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${d.type === "credit_note" ? "381" : "380"}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>AED</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>AED</cbc:TaxCurrencyCode>
  <cbc:BuyerReference>${xesc(d.ref || d.number)}</cbc:BuyerReference>
  <cac:InvoicePeriod><cbc:StartDate>${d.date}</cbc:StartDate><cbc:EndDate>${d.date}</cbc:EndDate></cac:InvoicePeriod>
  <cac:AccountingSupplierParty>
${party(CO.name, CO.trn, CO.address, CO.city, "AE:TRN")}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
${party(p.name, p.trn, p.address, p.emirate, "AE:TRN")}
  </cac:AccountingCustomerParty>
  <cac:Delivery><cbc:ActualDeliveryDate>${d.date}</cbc:ActualDeliveryDate></cac:Delivery>
  <cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode></cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="AED">${am.vat.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="AED">${am.net.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="AED">${am.vat.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${cat(am.lines[0] ? am.lines[0].kind : "standard")}</cbc:ID>
        <cbc:Percent>${am.lines[0] ? am.lines[0].rate.toFixed(2) : "5.00"}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="AED">${am.net.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="AED">${am.net.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="AED">${am.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="AED">${am.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}

/* ---- readiness: mandatory data-dictionary fields, per document ----------- */
function einvoiceCheck(d, CO) {
  const p = PMAP[d.partner], am = amounts(d), fails = [];
  if (!CO.trn || CO.trn.length !== 15) fails.push("Supplier TRN must be 15 digits");
  if (!CO.address || !CO.city) fails.push("Supplier address incomplete");
  if (!p.trn && !p.export && !p.import) fails.push("Buyer TRN missing for a domestic B2B supply");
  if (p.trn && p.trn.length !== 15) fails.push("Buyer TRN is not 15 digits");
  if (!p.address) fails.push("Buyer address missing");
  if (!d.lines.length) fails.push("No invoice lines");
  if (am.lines.some((l) => !l.desc || !l.desc.trim())) fails.push("A line has no description");
  if (am.lines.some((l) => !l.qty)) fails.push("A line has zero quantity");
  if (am.lines.some((l) => l.kind === "none")) fails.push("A line has no VAT category");
  if (!d.emirate) fails.push("Place of supply not set");
  if (!d.date || !d.due) fails.push("Issue or due date missing");
  return fails;
}

function FtaScreen({ state, setState, books, company, fta, setFta, p, setP, toast, go }) {
  const setEinv = (id, rec) => setState((x) => ({ ...x, einv: { ...(x.einv || {}), [id]: rec } }));
  const [tab, setTab] = useState("status");
  const CO = company;
  const v = useMemo(() => vat201(state, p.from, p.to), [state, p]);
  const faf = useMemo(() => buildFAF(state, books, CO, p.from, p.to), [state, books, CO, p]);
  const sales = state.docs.filter((d) => d.state === "posted" && DOCMETA[d.type].side === "sale" && inRange(d.date, p.from, p.to));
  const checks = sales.map((d) => ({ d, fails: einvoiceCheck(d, CO) }));
  const ready = checks.filter((c) => !c.fails.length).length;
  const pctReady = checks.length ? Math.round((ready / checks.length) * 100) : 100;

  const MILESTONES = [
    ["1 July 2026", "Voluntary pilot opened", "Any business may exchange PINT AE invoices through an accredited provider.", true],
    ["30 October 2026", "Appoint an ASP — revenue AED 50m and above", "Extended from 31 July 2026. The go-live date behind it did not move.", false],
    ["1 January 2027", "Mandatory e-invoicing — revenue AED 50m and above", "Structured PINT AE only. PDFs and scans stop qualifying as invoices.", false],
    ["31 March 2027", "Appoint an ASP — everyone else", "Businesses under AED 50m and government entities.", false],
    ["1 July 2027", "Mandatory e-invoicing — everyone else", "Full B2B and B2G coverage across the UAE.", false],
  ];

  const box = (n, label, net, vat) => ({ n, label, net, vat });
  const boxes = [
    ...v.em.map((e, i) => box(i === 0 ? "1" : "1", `Standard rated supplies — ${e.name}`, e.net, e.vat)),
    box("2", "Tax refunds to tourists", 0, 0),
    box("3", "Supplies subject to the reverse charge", v.b3.net, v.b3.vat),
    box("4", "Zero rated supplies", v.b4.net, null),
    box("5", "Exempt supplies", v.b5.net, null),
    box("6", "Goods imported into the UAE", 0, 0),
    box("7", "Adjustments to goods imported", 0, 0),
    box("8", "Totals — output tax due", v.out.net, v.out.vat),
    box("9", "Standard rated expenses", v.b9.net, v.b9.vat),
    box("10", "Supplies subject to the reverse charge (inputs)", v.b10.net, v.b10.vat),
    box("11", "Totals — recoverable input tax", v.inp.net, v.inp.vat),
    box("12", "Total due tax for the period", null, v.out.vat),
    box("13", "Total recoverable tax for the period", null, v.inp.vat),
    box("14", v.due >= 0 ? "Payable tax for the period" : "Refundable tax for the period", null, Math.abs(v.due)),
  ];

  const TABS = [["status", "Status & timeline"], ["queue", "Submission queue"], ["vat", "VAT 201 filing pack"],
    ["faf", "FTA Audit File"], ["einv", "E-invoicing (PINT AE)"], ["conn", "Provider connection"]];

  const log = state.einv || {};
  const stateOf = (doc) => (log[doc.id] && log[doc.id].status) || (einvoiceCheck(doc, CO).length ? "invalid" : "ready");
  const submit = async (doc) => {
    const fails = einvoiceCheck(doc, CO);
    if (fails.length) {
      setEinv(doc.id, { status: "invalid", at: new Date().toISOString(), note: fails[0] });
      toast(`${doc.number}: ${fails[0]}`, "warn"); return;
    }
    const xml = buildPINT(doc, CO);
    const rec = { status: "queued", uuid: (log[doc.id] && log[doc.id].uuid) || uuidv4(),
      hash: sha256(xml), at: new Date().toISOString(), note: "" };
    if (!fta.endpoint) {
      rec.note = "No accredited provider connected — held in the queue";
      setEinv(doc.id, rec); toast(`${doc.number} queued · hash ${rec.hash.slice(0, 12)}…`); return;
    }
    setEinv(doc.id, { ...rec, status: "submitted", note: `Sent to ${fta.asp || "provider"}` });
    toast(`${doc.number} handed to ${fta.asp || "your provider"}`);
    try {
      const r = await fetch(fta.endpoint, { method: "POST",
        headers: { "Content-Type": "application/xml", Authorization: fta.key ? `Bearer ${fta.key}` : undefined },
        body: xml });
      setEinv(doc.id, { ...rec, status: r.ok ? "accepted" : "rejected",
        note: `${fta.asp || "Provider"} responded ${r.status}`, at: new Date().toISOString() });
    } catch (e) {
      setEinv(doc.id, { ...rec, status: "rejected",
        note: "Could not reach the provider from the browser — this belongs on the server" });
    }
  };
  const submitAll = () => { sales.filter((doc) => stateOf(doc) === "ready").forEach(submit); };
  const counts = {};
  Object.keys(EINV_STATES).forEach((k) => (counts[k] = sales.filter((doc) => stateOf(doc) === k).length));

  return (
    <div>
      <PageHead eyebrow="Compliance" title="Federal Tax Authority"
        sub="Filing pack, audit file and Peppol e-invoicing, prepared straight from the posted ledger.">
        <RangePicker value={{ preset: p.preset, from: p.from, to: p.to }} onChange={(r) => setP({ ...p, ...r })} />
      </PageHead>

      <Card pad={false} style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ borderBottom: "none" }}>
          <div className="seg">{TABS.map(([k, l]) => (
            <button key={k} className={cx(tab === k && "on")} onClick={() => setTab(k)}>{l}</button>))}</div>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>
            Tax period {dmy(p.from)} to {dmy(p.to)}</span>
        </div>
      </Card>

      {tab === "status" && (<>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(232px,1fr))", marginBottom: 16 }}>
          <StatCard label="Net VAT position" icon={Building2} tone={v.due >= 0 ? "n" : ""} num={Math.abs(v.due)}
            deltaLabel={v.due >= 0 ? "payable to the FTA" : "refundable by the FTA"} />
          <StatCard label="Invoices e-invoice ready" icon={ShieldCheck} tone={pctReady === 100 ? "" : "g"} num={ready}
            deltaLabel={`of ${checks.length} sales documents · ${pctReady}%`} />
          <StatCard label="Audit file rows" icon={FileCode} tone="i" num={faf.glLines}
            deltaLabel={`${faf.supplyLines} supplies · ${faf.purchaseLines} purchases`} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
          <Card title="UAE e-invoicing rollout" sub="Ministerial Decisions 243 and 244 of 2025 · MoF guidelines v1.1">
            {MILESTONES.map(([date, title, note, done]) => (
              <div key={date} style={{ display: "flex", gap: 14, paddingBottom: 18, position: "relative" }}>
                <div style={{ flex: "0 0 22px", position: "relative" }}>
                  <span style={{ display: "block", width: 11, height: 11, borderRadius: "50%", marginTop: 4,
                    background: done ? "var(--pos)" : "var(--surface)", border: `2px solid ${done ? "var(--pos)" : "var(--line)"}` }} />
                  <span style={{ position: "absolute", left: 5, top: 18, bottom: -18, width: 1, background: "var(--line)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</b>
                    <Pill tone={done ? "ok" : "gold"}>{date}</Pill></div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 5, lineHeight: 1.55 }}>{note}</div>
                </div>
              </div>))}
          </Card>
          <Card title="How the UAE model works" sub="Decentralised CTC — the five-corner model">
            <p className="explain" style={{ marginBottom: 14 }}>
              The UAE does not use a central clearance portal. Invoices travel supplier &rarr; supplier&rsquo;s
              accredited provider &rarr; buyer&rsquo;s provider &rarr; buyer, with tax data reported onward to the
              FTA as the fifth corner.
            </p>
            {[["Corner 1", "You — Invoeez issues the structured invoice"],
              ["Corner 2", "Your Accredited Service Provider validates and transmits"],
              ["Corner 3", "The buyer's provider receives it"],
              ["Corner 4", "Your customer"],
              ["Corner 5", "The Federal Tax Authority receives the tax data"]].map(([k, t], i) => (
              <div key={k} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "9px 0",
                borderBottom: i < 4 ? "1px solid var(--line-2)" : "none" }}>
                <Pill tone={i === 0 ? "ok" : ""}>{k}</Pill>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>{t}</span></div>))}
            <div style={{ marginTop: 15, padding: "12px 13px", borderRadius: "var(--r-s)", background: "var(--warn-50)",
              color: "var(--warn)", fontSize: 12, lineHeight: 1.55, display: "flex", gap: 10 }}>
              <CircleAlert size={16} strokeWidth={1.9} style={{ flex: "0 0 16px", marginTop: 1 }} />
              <span>No accounting system can post directly to the FTA. Everything below is built to hand to your
                accredited provider or to an auditor.</span>
            </div>
          </Card>
        </div>
      </>)}

      {tab === "queue" && (
        <div className="grid">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
            {[["ready", "Ready to send"], ["queued", "Queued"], ["accepted", "Accepted"], ["invalid", "Needs fixing"]].map(([k, l]) => (
              <div className="card stat" key={k}>
                <div className="top"><span className={cx("ico", k === "invalid" ? "n" : k === "accepted" ? "" : "g")}>
                  <Send size={15} strokeWidth={1.9} /></span><span className="micro">{l}</span></div>
                <div className="v">{counts[k]}</div>
                <div className="sub">of {sales.length} sales documents</div>
              </div>))}
          </div>
          <Card title="E-invoice submission queue" pad={false}
            sub="Each document is validated, fingerprinted with SHA-256 and handed to your accredited provider"
            right={<><Btn icon={ShieldCheck} onClick={() => sales.forEach((doc) => {
                const fails = einvoiceCheck(doc, CO);
                setEinv(doc.id, { status: fails.length ? "invalid" : "ready", note: fails[0] || "",
                  at: new Date().toISOString(), uuid: (log[doc.id] && log[doc.id].uuid) || uuidv4() });
              }) || toast("All documents revalidated")}>Validate all</Btn>
              <Btn kind="pri" icon={Send} disabled={!counts.ready} onClick={submitAll}>
                Submit {counts.ready || ""} ready</Btn></>}>
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Document</th><th>Customer</th><th className="n">Total</th>
                <th>Status</th><th>Document hash</th><th>Last action</th><th style={{ width: 120 }} /></tr></thead>
              <tbody>
                {sales.length === 0 && <tr><td colSpan={7}>
                  <EmptyState icon={Send} title="No sales documents in this period">Widen the range above.</EmptyState></td></tr>}
                {sales.map((doc) => {
                  const st = stateOf(doc), rec = log[doc.id] || {};
                  return (<tr key={doc.id}>
                    <td className="mono" style={{ fontSize: 12.5 }}>{doc.number}
                      {rec.uuid && <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 3 }}>{rec.uuid}</div>}</td>
                    <td><Party name={PMAP[doc.partner].name} meta={PMAP[doc.partner].trn || "no TRN"} /></td>
                    <td className="n">{money(amounts(doc).total)}</td>
                    <td><Pill tone={EINV_STATES[st].tone} dot>{EINV_STATES[st].label}</Pill>
                      {rec.note && <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4, maxWidth: 230 }}>{rec.note}</div>}</td>
                    <td className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {rec.hash ? rec.hash.slice(0, 16) + "…" : "—"}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{rec.at ? dmy(rec.at.slice(0, 10)) : "—"}</td>
                    <td><Btn size="sm" icon={Send} disabled={st === "invalid"} onClick={() => submit(doc)}>
                      {st === "queued" || st === "submitted" ? "Retry" : "Submit"}</Btn></td>
                  </tr>);
                })}
              </tbody>
            </table></div>
            <div className="savebar">
              <Pill tone={fta.endpoint ? "gold" : ""} dot>{fta.endpoint ? `Routing via ${fta.asp || "provider"}` : "No provider connected"}</Pill>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>
                Auto-submit on posting is {fta.autoSubmit ? "on" : "off"} — change it under Provider connection</span>
            </div>
          </Card>
        </div>)}

      {tab === "vat" && (
        <ReportFrame toast={toast} title="VAT 201 filing pack" meta={`Enter these values on EmaraTax · ${dmy(p.from)} to ${dmy(p.to)} · AED`}
          right={<><Btn icon={Download} onClick={() => {
            dl(["Box,Description,Amount AED,VAT AED",
              ...boxes.map((b) => `"${b.n}","${b.label}",${b.net == null ? "" : b.net},${b.vat == null ? "" : b.vat}`)].join("\n"),
              `vat201-${p.from}-to-${p.to}.csv`, "text/csv"); toast("VAT 201 pack exported"); }}>Export CSV</Btn>
            <Btn icon={Printer} onClick={() => window.print()}>Print</Btn></>}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th style={{ width: 60 }}>Box</th><th>Description</th>
              <th className="n" style={{ width: 170 }}>Amount (AED)</th><th className="n" style={{ width: 170 }}>VAT (AED)</th></tr></thead>
            <tbody>{boxes.map((b, i) => (
              <tr key={i} className={cx(["8", "11", "14"].includes(b.n) && "sub rule")}>
                <td className="mono muted">{b.n}</td><td>{b.label}</td>
                <td className="n">{b.net == null ? "" : money(b.net)}</td>
                <td className="n" style={{ color: b.n === "14" ? (v.due >= 0 ? "var(--neg)" : "var(--pos)") : undefined }}>
                  {b.vat == null ? "" : money(b.vat)}</td></tr>))}</tbody>
          </table></div>
          <div style={{ padding: "15px 20px 19px", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.65, borderTop: "1px solid var(--line-2)" }}>
            Box numbers map one-for-one to the EmaraTax return form. Reverse-charge imports self-account in Box 3 and
            recover in Box 10, so they net to nil where the business is fully taxable. File within 28 days of period end.
          </div>
        </ReportFrame>)}

      {tab === "faf" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
          <Card title="FTA Audit File (FAF)" pad={false}
            sub="Four sections in the Authority's prescribed structure — company, purchases, supplies, general ledger">
            <div className="setsec">
              {[["Company information", "Name, TRN, tax agency, period and product version", 11],
                ["Purchase", `Every purchase line with supplier TRN and tax code`, faf.purchaseLines],
                ["Supply", `Every sales line with customer TRN, emirate and tax code`, faf.supplyLines],
                ["General ledger", "Every posted journal line with a running balance", faf.glLines]].map(([t, note, n]) => (
                <div className="setrow" key={t}>
                  <div className="st"><b>{t}</b><span>{note}</span></div>
                  <span className="num" style={{ fontSize: 14 }}>{n}</span></div>))}
            </div>
            <div className="savebar">
              Generated live from posted documents — never from a spreadsheet
              <span style={{ marginLeft: "auto" }}>
                <Btn kind="pri" icon={Download} onClick={() => {
                  dl(faf.csv, `FAF-${CO.trn}-${p.from}-to-${p.to}.csv`, "text/csv");
                  toast("Audit file generated"); }}>Generate FAF</Btn></span>
            </div>
          </Card>
          <div className="grid">
            <Card title="Control totals" sub="Cross-check against your filed return">
              <div className="sumrow"><span className="k">Supplies — net</span><span className="v">{money(faf.supNet)}</span></div>
              <div className="sumrow"><span className="k">Supplies — VAT</span><span className="v">{money(faf.supVat)}</span></div>
              <div className="sumrow"><span className="k">Purchases — net</span><span className="v">{money(faf.purNet)}</span></div>
              <div className="sumrow"><span className="k">Purchases — VAT</span><span className="v">{money(faf.purVat)}</span></div>
              <div className="sumrow total"><span className="k">Net VAT</span>
                <span className="v">{money(R2(faf.supVat - faf.purVat))}</span></div>
            </Card>
            <Card title="Why this matters">
              <p className="explain">
                The FAF is the UAE&rsquo;s equivalent of SAF-T. During a tax audit the FTA asks for it and expects it
                at <b>invoice line level</b>, not as a summary. Missing or invalid counterparty TRNs are the most
                common reason a file gets flagged. Failing to produce records in the required format carries penalties
                on its own, whether or not any tax was underpaid.
              </p>
            </Card>
          </div>
        </div>)}

      {tab === "einv" && (
        <div className="grid">
          <Card title="Data dictionary readiness" pad={false}
            sub={`${ready} of ${checks.length} sales documents carry every field PINT AE requires`}
            right={<Pill tone={pctReady === 100 ? "ok" : pctReady > 70 ? "gold" : "bad"}>{pctReady}% ready</Pill>}>
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Document</th><th>Customer</th><th>Buyer TRN</th><th>Place of supply</th>
                <th className="n">Total</th><th>Validation</th><th style={{ width: 130 }} /></tr></thead>
              <tbody>
                {checks.length === 0 && <tr><td colSpan={7}>
                  <EmptyState icon={FileCode} title="No sales documents in this period">Widen the range above.</EmptyState></td></tr>}
                {checks.map(({ d, fails }) => (
                  <tr key={d.id}>
                    <td className="mono" style={{ fontSize: 12.5 }}>{d.number}</td>
                    <td><Party name={PMAP[d.partner].name} /></td>
                    <td className="mono" style={{ fontSize: 12.5 }}>
                      {PMAP[d.partner].trn || <span className="muted">none</span>}</td>
                    <td>{d.emirate}</td>
                    <td className="n">{money(amounts(d).total)}</td>
                    <td>{fails.length === 0
                      ? <Pill tone="ok" dot>Valid</Pill>
                      : <span title={fails.join(" · ")}><Pill tone="bad" dot>{fails.length} issue{fails.length > 1 ? "s" : ""}</Pill>
                          <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{fails[0]}</div></span>}</td>
                    <td><Btn size="sm" icon={Download} onClick={() => {
                      dl(buildPINT(d, CO), `${d.number.replace(/\//g, "-")}-PINT-AE.xml`, "application/xml");
                      toast(`${d.number} exported as PINT AE XML`); }}>XML</Btn></td>
                  </tr>))}
              </tbody>
            </table></div>
            <div className="savebar">
              Structured XML only — the Ministry of Finance is explicit that PDFs and scans do not qualify
              <span style={{ marginLeft: "auto" }}>
                <Btn kind="pri" icon={Download} disabled={!checks.length} onClick={() => {
                  const bundle = checks.map(({ d }) => buildPINT(d, CO)).join("\n\n<!-- ============ -->\n\n");
                  dl(bundle, `PINT-AE-batch-${p.from}-to-${p.to}.xml`, "application/xml");
                  toast(`${checks.length} invoices exported for your provider`); }}>Export all as PINT AE</Btn></span>
            </div>
          </Card>
        </div>)}

      {tab === "conn" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <Card title="Accredited Service Provider" pad={false}
            sub="Invoeez hands structured documents to your ASP, which validates, transmits and reports to the FTA">
            <div className="setsec">
              <div className="setgrid">
                <Field label="Provider name" span={2}>
                  <Select value={fta.asp} onChange={(e) => setFta({ ...fta, asp: e.target.value })}>
                    <option value="">Not appointed yet</option>
                    {["Avalara", "EDICOM", "Thomson Reuters (Pagero)", "Tradeshift", "Taxilla", "Other"].map((x) => <option key={x}>{x}</option>)}
                  </Select></Field>
                <Field label="Environment">
                  <Select value={fta.env} onChange={(e) => setFta({ ...fta, env: e.target.value })}>
                    <option value="pilot">Voluntary pilot</option>
                    <option value="production">Production</option>
                  </Select></Field>
                <Field label="Peppol participant ID">
                  <Input placeholder="0235:100412887600003" value={fta.peppol}
                    onChange={(e) => setFta({ ...fta, peppol: e.target.value })} /></Field>
                <Field label="Access point endpoint" span={2}>
                  <Input placeholder="https://ap.your-provider.ae/as4" value={fta.endpoint}
                    onChange={(e) => setFta({ ...fta, endpoint: e.target.value })} /></Field>
                <Field label="API key" span={2}>
                  <Input type="password" placeholder="Stored locally in this browser only" value={fta.key}
                    onChange={(e) => setFta({ ...fta, key: e.target.value })} /></Field>
              </div>
              <div className="setrow" style={{ marginTop: 6 }}>
                <div className="st"><b>Submit automatically when an invoice is posted</b>
                  <span>Validates, fingerprints and queues the document the moment it hits the ledger</span></div>
                <button onClick={() => setFta({ ...fta, autoSubmit: !fta.autoSubmit })}
                  aria-label="Toggle auto-submit"><Switch on={!!fta.autoSubmit} /></button>
              </div>
            </div>
            <div className="savebar">
              <Pill tone={fta.asp && fta.endpoint ? "gold" : ""} dot>
                {fta.asp && fta.endpoint ? "Configured — not yet connected" : "Not configured"}</Pill>
              <span style={{ marginLeft: "auto" }}>
                <Btn icon={Link2} disabled={!fta.asp || !fta.endpoint}
                  onClick={() => toast("Live transmission needs the server backend — export the XML meanwhile", "warn")}>
                  Test connection</Btn></span>
            </div>
          </Card>
          <div className="grid">
            <Card title="What is and isn't wired">
              <div className="setrow"><div className="st"><b>VAT 201 figures</b>
                <span>Computed box-for-box from the ledger</span></div><Pill tone="ok" dot>Working</Pill></div>
              <div className="setrow"><div className="st"><b>FTA Audit File</b>
                <span>Generated in the prescribed CSV structure</span></div><Pill tone="ok" dot>Working</Pill></div>
              <div className="setrow"><div className="st"><b>PINT AE XML</b>
                <span>UBL 2.1 output for your provider to validate</span></div><Pill tone="ok" dot>Working</Pill></div>
              <div className="setrow"><div className="st"><b>Live transmission to an ASP</b>
                <span>Needs a server: credentials cannot be held in a browser</span></div><Pill tone="warn" dot>Pending</Pill></div>
              <div className="setrow"><div className="st"><b>Direct filing to the FTA</b>
                <span>Not possible for any vendor — the model routes through an ASP</span></div><Pill tone="bad" dot>N/A</Pill></div>
            </Card>
            <Card title="UAE is not ZATCA — the difference matters">
              <p className="explain" style={{ marginBottom: 14 }}>
                In Saudi Arabia, ZATCA runs <b>central clearance</b>: a standard B2B invoice is posted to ZATCA&rsquo;s
                API, cleared and stamped with a QR before you may issue it. That is a direct, government-facing integration.
              </p>
              <p className="explain" style={{ marginBottom: 16 }}>
                The UAE deliberately chose the opposite. The FTA runs a <b>decentralised</b> Peppol model with no
                clearance endpoint. Invoices are exchanged provider to provider and the tax data is reported onward.
                There is nothing to connect an accounting system directly to &mdash; not for Invoeez, not for SAP.
                If a vendor sells you &ldquo;direct FTA submission&rdquo;, they are describing an ASP relationship.
              </p>
              {[["Clearance before issuing", "Required", "Not used"],
                ["Direct government API", "Yes", "No"],
                ["Mandatory QR on invoice", "Yes", "No"],
                ["Goes through a provider", "Optional", "Required"],
                ["Invoice format", "UBL 2.1 XML", "PINT AE (UBL 2.1)"]].map(([k, ksa, uae], i) => (
                <div key={k} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0",
                  borderBottom: i < 4 ? "1px solid var(--line-2)" : "none", fontSize: 12.5 }}>
                  <span style={{ flex: 1, color: "var(--ink-2)" }}>{k}</span>
                  <span style={{ width: 92, textAlign: "right", color: "var(--ink-3)" }}>{ksa}</span>
                  <span style={{ width: 118, textAlign: "right", fontWeight: 500 }}>{uae}</span>
                </div>))}
              <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--line)",
                fontSize: 10.5, color: "var(--ink-4)" }}>
                <span style={{ flex: 1 }} /><span style={{ width: 92, textAlign: "right" }}>Saudi</span>
                <span style={{ width: 118, textAlign: "right" }}>UAE</span></div>
            </Card>
          </div>
        </div>)}
    </div>
  );
}

/* ==========================================================================
   USERS AND ACCESS RIGHTS
   Enforced in the interface here. Real enforcement belongs on the server —
   a browser can only ever hide a button, never protect the data behind it.
   ========================================================================== */
const PERMS = [
  ["view",     "View the books",        "Dashboard, documents and reports"],
  ["sell",     "Raise sales documents", "Invoices, credit notes and customer receipts"],
  ["buy",      "Raise purchases",       "Vendor bills, debit notes, expenses and payments"],
  ["post",     "Post to the ledger",    "Move a draft into the accounts"],
  ["bank",     "Treasury",              "Bank transfers and fixed assets"],
  ["master",   "Manage master data",    "Customers, vendors, products and the chart of accounts"],
  ["journal",  "Manual journals",       "Free-form entries straight to the ledger"],
  ["reports",  "Financial statements",  "P&L, balance sheet, ledgers and profitability"],
  ["tax",      "Tax and compliance",    "VAT return, audit file and e-invoicing"],
  ["settings", "Company settings",      "Profile, costing method, backups and users"],
];
const ROLES = {
  admin:      { label: "Administrator", note: "Everything, including users and settings", grad: "g6",
                perms: PERMS.map((p) => p[0]) },
  accountant: { label: "Accountant", note: "Full books and filing, no user administration", grad: "g1",
                perms: ["view", "sell", "buy", "post", "bank", "master", "journal", "reports", "tax"] },
  sales:      { label: "Sales", note: "Raise and send customer documents only", grad: "g3",
                perms: ["view", "sell", "post"] },
  clerk:      { label: "Purchase clerk", note: "Enter bills and expenses, cannot post", grad: "g5",
                perms: ["view", "buy"] },
  viewer:     { label: "Viewer", note: "Read-only access to reports", grad: "g4",
                perms: ["view", "reports"] },
};
const SEED_USERS = [
  { id: "u1", name: "Haider Ali", email: "haider@zenithtrading.ae", role: "admin", active: true },
  { id: "u2", name: "Fatima Rahman", email: "fatima@zenithtrading.ae", role: "accountant", active: true },
  { id: "u3", name: "Omar Siddiqui", email: "omar@zenithtrading.ae", role: "sales", active: true },
  { id: "u4", name: "Priya Nair", email: "priya@zenithtrading.ae", role: "clerk", active: true },
  { id: "u5", name: "Meridian Audit & Advisory", email: "audit@meridianaudit.ae", role: "viewer", active: false },
];
const SCREEN_PERM = {
  categories:"master",pricelists:"master",salespeople:"master",stock_count:"journal",scrap:"journal",
  dash: "view", quotes: "sell", invoices: "sell", credit_notes: "sell", partners: "master", bills: "buy", debit_notes: "buy",
  banking: "bank", expenses: "buy", assets: "bank", payments: "buy", products: "master", methods: "bank", r_method: "reports", r_stmt: "reports",
  accounts: "master", journal: "journal", r_stock: "reports", r_pnl: "reports", r_bs: "reports",
  r_tb: "reports", r_gl: "reports", r_partner: "reports", r_aged_ar: "reports", r_aged_ap: "reports",
  r_prod: "reports", r_cust: "reports", r_vat: "tax", fta: "tax", settings: "settings", users: "settings", setup: "master",
};

function UsersScreen({ state, setState, me, setMe, toast }) {
  const [ed, setEd] = useState(null);
  const [q, setQ] = useState("");
  const users = state.users || SEED_USERS;
  const list = users.filter((u) => hits(q, u.name, u.email, ROLES[u.role].label));
  const blank = () => ({ id: uid("u"), name: "", email: "", role: "sales", active: true });
  const isNew = ed && !users.some((u) => u.id === ed.id);
  const valid = ed && ed.name.trim().length > 1 && /.+@.+\..+/.test(ed.email.trim());
  const save = () => {
    const rec = { ...ed, name: ed.name.trim(), email: ed.email.trim() };
    setState((x) => { const l = x.users || SEED_USERS;
      return { ...x, users: l.some((u) => u.id === rec.id) ? l.map((u) => (u.id === rec.id ? rec : u)) : [...l, rec] }; });
    toast(`${rec.name} saved as ${ROLES[rec.role].label}`); setEd(null);
  };
  const toggle = (u) => {
    if (u.id === me) { toast("You cannot deactivate the account you are signed in as", "warn"); return; }
    setState((x) => ({ ...x, users: (x.users || SEED_USERS).map((y) => (y.id === u.id ? { ...y, active: !y.active } : y)) }));
    toast(`${u.name} ${u.active ? "deactivated" : "reactivated"}`, u.active ? "warn" : "");
  };
  const remove = (u) => {
    if (u.id === me) { toast("You cannot delete the account you are signed in as", "warn"); return; }
    setState((x) => ({ ...x, users: (x.users || SEED_USERS).filter((y) => y.id !== u.id) }));
    toast(`${u.name} removed`, "warn");
  };

  return (
    <div>
      <PageHead eyebrow="Configuration" title="Users &amp; access rights"
        sub="Roles decide what each person can reach. Sign in as any of them to see the effect immediately.">
        <Btn kind="pri" icon={Plus} onClick={() => setEd(blank())}>New user</Btn>
      </PageHead>

      {ed && (
        <Card title={isNew ? "New user" : `Edit ${ed.name || "user"}`}
          sub="Pick the role that matches what this person actually does day to day"
          style={{ marginBottom: 16 }}
          right={<><Btn onClick={() => setEd(null)}>Cancel</Btn>
            <Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>{isNew ? "Create user" : "Save changes"}</Btn></>}>
          <div className="setgrid" style={{ marginBottom: 18 }}>
            <Field label="Full name"><Input value={ed.name} placeholder="Aisha Khan"
              onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
            <Field label="Work email"><Input value={ed.email} placeholder="aisha@company.ae"
              onChange={(e) => setEd({ ...ed, email: e.target.value })} />
              {ed.email && !/.+@.+\..+/.test(ed.email) &&
                <div style={{ fontSize: 11.5, color: "var(--neg)", marginTop: 5 }}>That is not a valid email</div>}</Field>
            <Field label="Status">
              <Select value={ed.active ? "y" : "n"} onChange={(e) => setEd({ ...ed, active: e.target.value === "y" })}>
                <option value="y">Active</option><option value="n">Suspended</option></Select></Field>
          </div>
          <div className="micro" style={{ marginBottom: 11 }}>Role</div>
          <div className="picks" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", marginBottom: 16 }}>
            {Object.entries(ROLES).map(([k, r]) => (
              <button key={k} className={cx("pick", ed.role === k && "on")} onClick={() => setEd({ ...ed, role: k })}>
                <span className={cx("gt sm", r.grad)}><Users size={15} strokeWidth={1.9} /></span>
                <span className="pt"><b>{r.label}</b><span>{r.note}</span></span>
                <span className="chk">{ed.role === k && <Check size={11} strokeWidth={3.2} />}</span>
              </button>))}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {PERMS.map(([k, l]) => (
              <Pill key={k} tone={ROLES[ed.role].perms.includes(k) ? "ok" : ""}>
                {ROLES[ed.role].perms.includes(k) ? "✓" : "✕"} {l}</Pill>))}
          </div>
        </Card>)}

      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <Card title="People" pad={false} sub={`${users.filter((u) => u.active).length} active of ${users.length}`}
          right={<SearchBox value={q} onChange={setQ} placeholder="Search name, email or role" width={250} />}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="n">Permissions</th>
              <th style={{ width: 190 }} /></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6}><EmptyState icon={Users} title={`Nothing matches “${q}”`} /></td></tr>}
              {list.map((u) => (
                <tr key={u.id} style={u.active ? undefined : { opacity: .55 }}>
                  <td><Party name={u.name} meta={u.id === me ? "Signed in as this user" : ""} /></td>
                  <td className="muted">{u.email}</td>
                  <td><Pill tone={u.role === "admin" ? "gold" : u.role === "viewer" ? "" : "info"}>{ROLES[u.role].label}</Pill></td>
                  <td><Pill tone={u.active ? "ok" : "bad"} dot>{u.active ? "Active" : "Suspended"}</Pill></td>
                  <td className="n">{ROLES[u.role].perms.length} of {PERMS.length}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {u.id !== me && u.active &&
                      <Btn size="sm" onClick={() => { setMe(u.id); toast(`Now signed in as ${u.name}`); }}>Sign in as</Btn>}
                    <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                      title="Edit" onClick={() => setEd({ ...u })}><Pencil size={13} /></button>
                    <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                      title={u.active ? "Suspend" : "Reactivate"} onClick={() => toggle(u)}>
                      {u.active ? <X size={13} /> : <Check size={13} />}</button>
                    <button className="icon-btn" style={{ width: 27, height: 27, display: "inline-grid", verticalAlign: "-8px" }}
                      title="Remove" onClick={() => remove(u)}><Trash2 size={13} /></button>
                  </td>
                </tr>))}
            </tbody>
          </table></div>
        </Card>

        <Card title="Permission matrix" pad={false}
          sub="What each role can reach. The interface hides or disables anything outside it.">
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th style={{ minWidth: 230 }}>Capability</th>
              {Object.entries(ROLES).map(([k, r]) => <th key={k} className="n">{r.label}</th>)}</tr></thead>
            <tbody>{PERMS.map(([k, l, note]) => (
              <tr key={k}>
                <td><b style={{ fontWeight: 500 }}>{l}</b>
                  <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{note}</div></td>
                {Object.entries(ROLES).map(([rk, r]) => (
                  <td key={rk} className="n">
                    {r.perms.includes(k)
                      ? <Check size={15} strokeWidth={2.6} style={{ color: "var(--pos)" }} />
                      : <X size={15} strokeWidth={2.2} style={{ color: "var(--ink-4)", opacity: .5 }} />}</td>))}
              </tr>))}</tbody>
          </table></div>
          <div className="savebar">
            <CircleAlert size={15} strokeWidth={1.9} style={{ color: "var(--warn)" }} />
            <span>These rules are applied in the interface. Once the server backend lands they move behind
              the API, which is the only place they can actually protect data.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsScreen({ company, setCompany, theme, setTheme, density, setDensity, backup, restore, reset, startCompany, go, toast, books, state, fta, setFta, setCosting }) {
  const [d, setD] = useState(company);
  const dirty = JSON.stringify(d) !== JSON.stringify(company);
  const f = (k) => ({ value: d[k] || "", onChange: (e) => setD({ ...d, [k]: e.target.value }) });
  return (
    <div>
      <PageHead eyebrow="Configuration" title="Settings"
        sub="Company details flow straight through to every tax invoice, statement and report." />
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", alignItems: "start" }}>
        <div className="grid">
          <Card title="Company profile" sub="Shown on tax invoices and as the letterhead on every statement" pad={false}>
            <div className="setsec">
              <div className="logodrop" style={{ marginBottom: 17 }}>
                <span className="logobox">
                  {d.logo ? <img src={d.logo} alt="Company logo" /> : <ImagePlus size={22} strokeWidth={1.6} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13.5, fontWeight: 500 }}>Company logo</b>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", margin: "4px 0 11px", lineHeight: 1.5 }}>
                    PNG, JPG, WebP or SVG up to 5 MB — large images are resized automatically.
                    Appears on the sidebar, every tax invoice and each statement letterhead.
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label className="btn sm" style={{ cursor: "pointer" }}>
                      <CloudUpload size={14} strokeWidth={1.9} />{d.logo ? "Replace" : "Upload logo"}
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files[0]; if (!file) return;
                          prepareLogo(file,
                            (data, was, now) => {
                              setD((x) => ({ ...x, logo: data }));
                              toast(was > now * 1.4
                                ? `Logo added — resized from ${(was / 1024).toFixed(0)} KB to ${(now / 1024).toFixed(0)} KB`
                                : "Logo added");
                            },
                            (msg) => toast(msg, "warn"));
                          e.target.value = "";
                        }} /></label>
                    {d.logo && <Btn size="sm" kind="danger" icon={Trash2} onClick={() => setD({ ...d, logo: "" })}>Remove</Btn>}
                  </div>
                </div>
              </div>
              <div className="setgrid">
                <Field label="Registered name" span={2}><Input {...f("name")} /></Field>
                <Field label="Tax Registration Number (TRN)"><Input {...f("trn")} /></Field>
                <Field label="Trade licence"><Input {...f("licence")} /></Field>
                <Field label="Address" span={2}><Input {...f("address")} /></Field>
                <Field label="City and country"><Input {...f("city")} /></Field>
                <Field label="Emirate">
                  <Select {...f("emirate")}>{EMIRATES.map((e) => <option key={e}>{e}</option>)}</Select></Field>
                <Field label="Telephone"><Input {...f("phone")} /></Field>
                <Field label="Email"><Input {...f("email")} /></Field>
                <Field label="Reporting currency"><Input {...f("currency")} /></Field>
              </div>
            </div>
            <div className="savebar">
              {dirty ? "Unsaved changes" : "Everything is saved"}
              <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <Btn onClick={() => setD(company)} disabled={!dirty}>Discard</Btn>
                <Btn kind="pri" icon={Check} disabled={!dirty}
                  onClick={() => { setCompany(d); toast("Company profile updated"); }}>Save profile</Btn>
              </span>
            </div>
          </Card>

          <Card title="Fiscal year and tax" sub="Fixed for this build — configurable once the server backend lands" pad={false}>
            <div className="setsec">
              <div className="setrow"><div className="st"><b>Financial year</b>
                <span>1 January to 31 December, matching the UAE corporate tax default</span></div>
                <Pill tone="info">Calendar year</Pill></div>
              <div className="setrow"><div className="st"><b>VAT period</b>
                <span>Quarterly, filed on EmaraTax within 28 days of period end</span></div>
                <Pill tone="info">Quarterly</Pill></div>
              <div className="setrow" style={{ display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div className="st"><b>Inventory costing method</b>
                    <span>Changing this re-values every stock movement and restates cost of sales</span></div>
                  <Pill tone="gold">{(state.costing || "avco").toUpperCase()}</Pill>
                </div>
                <div className="picks" style={{ marginTop: 14, marginBottom: 0,
                  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
                  {Object.entries(COSTING).map(([k, m]) => (
                    <button key={k} className={cx("pick", (state.costing || "avco") === k && "on")}
                      onClick={() => { setCosting(k); toast(`Costing switched to ${m.label}`); }}>
                      <span className="pi"><Layers size={16} strokeWidth={1.8} /></span>
                      <span className="pt"><b>{m.label}</b><span>{m.note}</span></span>
                      <span className="chk">{(state.costing || "avco") === k && <Check size={11} strokeWidth={3.2} />}</span>
                    </button>))}
                </div>
              </div>
              <div className="setrow"><div className="st"><b>Settlement rule</b>
                <span>Receipts and payments clear the oldest open document first</span></div>
                <Pill tone="gold">FIFO</Pill></div>
            </div>
          </Card>
        </div>

        <div className="grid">
          <Card title="WhatsApp & email delivery" pad={false}
            sub="Send invoices straight from the document view">
            <div className="setsec">
              <div className="setrow"><div className="st"><b>WhatsApp Click to Chat</b>
                <span>Opens WhatsApp with the message prefilled — works today, no account needed</span></div>
                <Pill tone="ok" dot>Active</Pill></div>
              <div className="setrow"><div className="st"><b>Email</b>
                <span>Opens your mail client with the invoice details drafted</span></div>
                <Pill tone="ok" dot>Active</Pill></div>
              <Field label="Message template" style={{ marginTop: 6 }}>
                <textarea className="inp" rows={7} value={fta.waTemplate || DEFAULT_WA}
                  onChange={(e) => setFta({ ...fta, waTemplate: e.target.value })} /></Field>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 9, lineHeight: 1.65 }}>
                Placeholders: <code style={{ fontFamily: "var(--mono)" }}>
                &#123;customer&#125; &#123;company&#125; &#123;document&#125; &#123;title&#125; &#123;amount&#125; &#123;date&#125; &#123;due&#125;</code>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
                <Btn size="sm" onClick={() => setFta({ ...fta, waTemplate: DEFAULT_WA })}>Reset template</Btn>
                <Btn size="sm" kind="wa" icon={MessageCircle} onClick={() => {
                  const num = String(d.phone || "").replace(/[^0-9]/g, "");
                  if (!num) { toast("Add a company WhatsApp number below first", "warn"); return; }
                  window.open(`https://wa.me/${num}?text=${encodeURIComponent("Test message from " + d.name + " via Invoeez.")}`, "_blank");
                }}>Send yourself a test</Btn>
              </div>
            </div>
            <div className="setsec">
              <div className="micro" style={{ marginBottom: 13 }}>WhatsApp Business API — for automatic sending</div>
              <div className="setgrid">
                <Field label="Phone number ID">
                  <Input placeholder="From Meta Business Manager" value={fta.waPhoneId || ""}
                    onChange={(e) => setFta({ ...fta, waPhoneId: e.target.value })} /></Field>
                <Field label="Approved template name">
                  <Input placeholder="invoice_notification" value={fta.waTemplateName || ""}
                    onChange={(e) => setFta({ ...fta, waTemplateName: e.target.value })} /></Field>
                <Field label="Permanent access token" span={2}>
                  <Input type="password" placeholder="Held in this browser only" value={fta.waToken || ""}
                    onChange={(e) => setFta({ ...fta, waToken: e.target.value })} /></Field>
              </div>
              <div style={{ marginTop: 13, padding: "12px 13px", borderRadius: "var(--r-s)", background: "var(--warn-50)",
                color: "var(--warn)", fontSize: 12, lineHeight: 1.6, display: "flex", gap: 10 }}>
                <CircleAlert size={16} strokeWidth={1.9} style={{ flex: "0 0 16px", marginTop: 1 }} />
                <span>Automatic sending needs a server — a browser cannot hold a Meta token safely, and
                  Meta requires business-initiated messages to use a pre-approved template. Click to Chat above
                  works right now and needs none of this.</span>
              </div>
            </div>
          </Card>

          <Card title="Appearance" pad={false}>
            <div className="setsec">
              <div className="setrow"><div className="st"><b>Theme</b><span>Follows your system on first run</span></div>
                <div className="seg">{[["light", "Light"], ["dark", "Dark"]].map(([k, l]) => (
                  <button key={k} className={cx(theme === k && "on")} onClick={() => setTheme(k)}>{l}</button>))}</div></div>
              <div className="setrow"><div className="st"><b>Row density</b><span>Compact fits roughly a third more rows on screen</span></div>
                <div className="seg">{[["comfortable", "Comfortable"], ["compact", "Compact"]].map(([k, l]) => (
                  <button key={k} className={cx(density === k && "on")} onClick={() => setDensity(k)}>{l}</button>))}</div></div>
            </div>
          </Card>

          <Card title="Data" sub="Everything lives in this browser until the server backend lands" pad={false}>
            <div className="setsec">
              <div className="setrow"><div className="st"><b>Back up the books</b>
                <span>Downloads every document and payment as JSON</span></div>
                <Btn icon={Download} onClick={backup}>Back up</Btn></div>
              <div className="setrow"><div className="st"><b>Restore</b>
                <span>Replaces the current books with a backup file</span></div>
                <label className="btn" style={{ cursor: "pointer" }}><Upload size={14} strokeWidth={1.9} />Restore
                  <input type="file" accept="application/json" onChange={restore} style={{ display: "none" }} /></label></div>
              <div className="setrow"><div className="st"><b>Setup guide</b>
                <span>Step-by-step: company, accounts, products, customers, opening balances</span></div>
                <Btn icon={ListChecks} onClick={() => go("setup")}>Open guide</Btn></div>
              <div className="setrow"><div className="st"><b>{state.sample ? "Start my company" : "Start a new company"}</b>
                <span>Clears transactions; keeps the chart of accounts, categories and expense items</span></div>
                <Btn kind={state.sample ? "pri" : "danger"} icon={Rocket} onClick={startCompany}>{state.sample ? "Start" : "Start over"}</Btn></div>
              <div className="setrow"><div className="st"><b>Load the sample company</b>
                <span>Replaces your books with twelve months of demo trading</span></div>
                <Btn kind="danger" icon={RotateCcw} onClick={reset}>Load sample</Btn></div>
            </div>
          </Card>

          <Card title="This ledger">
            <div className="sumrow"><span className="k">Build</span>
              <span className="v" style={{ color: "var(--brand)", fontWeight: 600 }}>{BUILD}</span></div>
            <div className="sumrow"><span className="k">Documents</span><span className="v">{state.docs.length}</span></div>
            <div className="sumrow"><span className="k">Journal entries</span><span className="v">{books.entries.length}</span></div>
            <div className="sumrow"><span className="k">Posted lines</span><span className="v">{books.flat.length}</span></div>
            <div className="sumrow"><span className="k">Stock movements</span><span className="v">{books.moves.length}</span></div>
            <div className="sumrow total"><span className="k">Total debits</span><span className="v">{money(books.totalD)}</span></div>
            <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--line-2)", fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.6 }}>
              If something looks out of date, reload with <b>Ctrl+Shift+R</b> (<b>Cmd+Shift+R</b> on a Mac)
              and check the build number above matches the file you were sent.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  APP SHELL                                                                 */
/* ========================================================================== */

const NAV = [
 {g:"Workspace",items:[{k:"dash",l:"Dashboard",i:LayoutDashboard},{k:"setup",l:"Setup guide",i:ListChecks}]},
 {g:"Master data",items:[{k:"partners",l:"Customers & vendors",i:Users},{k:"products",l:"Products & services",i:Package},{k:"categories",l:"Product categories",i:Layers},{k:"pricelists",l:"Price lists",i:Banknote},{k:"salespeople",l:"Sales team",i:Users},{k:"accounts",l:"Chart of accounts",i:BookOpen}]},
 {g:"Sales",items:[{k:"quotes",l:"Quotations",i:FileText},{k:"invoices",l:"Invoices",i:Receipt},{k:"credit_notes",l:"Credit notes",i:FileMinus}]},
 {g:"Purchases",items:[{k:"bills",l:"Vendor bills",i:ShoppingCart},{k:"debit_notes",l:"Debit notes",i:FilePlus}]},
 {g:"Stock management",items:[{k:"stock_count",l:"Stock counts & adjustments",i:Layers},{k:"scrap",l:"Damage & scrap",i:Trash2},{k:"r_stock",l:"Inventory valuation",i:Package}]},
 {g:"Accounting & banking",items:[{k:"journal",l:"Journal entries",i:BookOpen},{k:"payments",l:"Receipts & payments",i:Receipt},{k:"banking",l:"Banking",i:Landmark},{k:"methods",l:"Payment methods",i:Banknote},{k:"expenses",l:"Expenses",i:Wallet},{k:"assets",l:"Fixed assets",i:Layers}]},
  { g: "Financial reports", items: [
    { k: "r_pnl", l: "Profit & loss", i: BarChart3 },
    { k: "r_bs", l: "Balance sheet", i: Scale },
    { k: "r_tb", l: "Trial balance", i: CircleDot },
    { k: "r_gl", l: "General ledger", i: BookOpen },
    { k: "r_partner", l: "Partner ledger", i: Users },
    { k: "r_stmt", l: "Customer statement", i: Send },
    { k: "r_aged_ar", l: "Aged receivable", i: Receipt },
    { k: "r_aged_ap", l: "Aged payable", i: Receipt },
    { k: "r_method", l: "Payments by method", i: Banknote },
    { k: "r_prod", l: "Profit by product", i: Package },
    { k: "r_cust", l: "Profit by customer", i: Users },
    { k: "r_vat", l: "VAT return — FTA 201", i: Building2 }] },
 {g:"Compliance",items:[{k:"fta",l:"FTA & e-invoicing",i:ShieldCheck}]},
 {g:"Settings & tools",items:[{k:"users",l:"Users & access",i:Users},{k:"settings",l:"Settings & backup",i:Settings}]},
];
const DOC_VIEWS = { quotes: "quote", invoices: "invoice", credit_notes: "credit_note", bills: "bill", debit_notes: "debit_note" };
const STORE_KEY = "mizan.books.v2";
const THEME_KEY = "mizan.theme";
const CO_KEY = "mizan.company";
const FTA_KEY = "mizan.fta";
const NAVGRP_KEY = "mizan.navgroups";
const ME_KEY = "mizan.me";
const DENSITY_KEY = "mizan.density";
const DEMO = () => buildSampleBooks(TODAY);
function loadBooks() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.docs) && Array.isArray(p.payments)) return migrateBooks(p); }
  } catch (e) { /* private mode or corrupt payload — fall through to the demo company */ }
  return migrateBooks(DEMO());
}
let _tid = 0;

function Invoeez() {
  const [state, setState] = useState(loadBooks);
  const [view, setView] = useState("dash");
  const [param, setParam] = useState(null);
  const [period, setPeriod] = useState({ preset: "ytd", from: TODAY.slice(0,4)+"-01-01", to: TODAY, asOf: TODAY });
  const [range, setRange] = useState({ preset: "ytd", from: TODAY.slice(0,4)+"-01-01", to: TODAY });
  const [toasts, setToasts] = useState([]);
  const [cmdk, setCmdk] = useState(false);
  const [navSearch,setNavSearch]=useState("");
  const [mini, setMini] = useState(false);
  const [menu, setMenu] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const [newAt, setNewAt] = useState({ top: 0, left: 0 });
  const [drawer, setDrawer] = useState(false);
  const [starting, setStarting] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const newRef = React.useRef(null);
  const [me, setMe] = useState(() => {
    try { return window.localStorage.getItem(ME_KEY) || "u1"; } catch (e) { return "u1"; }
  });
  const [closed, setClosed] = useState(() => {
    try { const c = window.localStorage.getItem(NAVGRP_KEY); if (c) return JSON.parse(c); } catch (e) {}
    return {"Master data":true,"Purchases":true,"Accounting & banking":true,"Financial reports":true,"Compliance":true,"Settings & tools":true};
  });
  React.useEffect(() => {
    try { window.localStorage.setItem(NAVGRP_KEY, JSON.stringify(closed)); } catch (e) {}
  }, [closed]);
  React.useEffect(() => { try { window.localStorage.setItem(ME_KEY, me); } catch (e) {} }, [me]);
  const [company, setCompany] = useState(() => {
    try { const c = window.localStorage.getItem(CO_KEY); if (c) return { ...COMPANY, ...JSON.parse(c) }; } catch (e) {}
    return COMPANY;
  });
  const [fta, setFta] = useState(() => {
    try { const x = window.localStorage.getItem(FTA_KEY); if (x) return JSON.parse(x); } catch (e) {}
    return { asp: "", env: "pilot", peppol: "", endpoint: "", key: "", autoSubmit: false };
  });
  const [density, setDensity] = useState(() => {
    try { return window.localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable"; } catch (e) { return "comfortable"; }
  });
  const [theme, setTheme] = useState(() => {
    try {
      const t = window.localStorage.getItem(THEME_KEY);
      if (t === "dark" || t === "light") return t;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) { return "light"; }
  });
  useMemo(() => syncAccounts(state.accounts || []), [state.accounts]);
  useMemo(() => syncPartners(state.partners || []), [state.partners]);
  useMemo(() => syncProducts(state.products || [], state.categories || DEFAULT_CATEGORIES), [state.products, state.categories]);
  useMemo(() => syncMethods(state.methods || []), [state.methods]);
  const books = useMemo(() => deriveBooks(state), [state]);
  const palette = PALETTE[theme];

  React.useEffect(() => {
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    if (document.documentElement) document.documentElement.setAttribute("data-mz-theme", theme);
  }, [theme]);
  React.useEffect(() => {
    try { window.localStorage.setItem(CO_KEY, JSON.stringify(company)); } catch (e) {}
  }, [company]);
  React.useEffect(() => {
    try { window.localStorage.setItem(DENSITY_KEY, density); } catch (e) {}
  }, [density]);
  React.useEffect(() => {
    try { window.localStorage.setItem(FTA_KEY, JSON.stringify(fta)); } catch (e) {}
  }, [fta]);

  React.useEffect(() => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);
  React.useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdk((v) => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const toast = (msg, tone) => {
    const id = ++_tid;
    setToasts((t) => [...t, { id, msg, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  };
  const go = (k, p) => {
    scrollPageTop(); setNavSearch("");
    const group=NAV.find(g=>g.items.some(i=>i.k===k));if(group)setClosed(c=>({...c,[group.g]:false}));
    setDrawer(false);
    if (p == null && k === view) { setParam("__list__"); setView(k); return; }
    setView(k); setParam(p != null ? p : null);
  };
  const newDoc = (type) => go(LIST_OF[type], "__new__");

  const backup = () => {
    saveText(JSON.stringify(state, null, 2), `invoeez-books-${TODAY}.json`, "application/json");
    if (!state.sample) setState((s) => ({ ...s, setup: { ...(s.setup || {}), backup: TODAY } }));
    toast("Backup downloaded");
  };
  const restore = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { const p = JSON.parse(r.result);
        if (p && Array.isArray(p.docs)) { setState(migrateBooks(p)); toast("Books restored from backup"); }
        else toast("That file is not a compatible books backup", "warn");
      } catch (x) { toast("That file could not be read as JSON", "warn"); }
    };
    r.readAsText(f); e.target.value = "";
  };
  const reset = () => {
    if (window.confirm("Load the sample company? It replaces your current books — download a backup first if you need them."))
      { setState(migrateBooks(DEMO())); setCompany(COMPANY); setMe("u1"); setBannerHidden(false); toast("Sample company loaded", "warn"); go("dash"); }
  };
  const startCompany = () => setStarting(true);
  const companyStarted = (books, profile) => {
    setState(books); setCompany(profile); setMe("u1"); setStarting(false);
    toast(`${profile.name} is ready. Follow the setup guide to add your data.`); go("setup");
  };

  const counts = {
    quotes: state.docs.filter((d) => d.type === "quote").length,
    invoices: state.docs.filter((d) => d.type === "invoice").length,
    bills: state.docs.filter((d) => d.type === "bill").length,
    credit_notes: state.docs.filter((d) => d.type === "credit_note").length,
    debit_notes: state.docs.filter((d) => d.type === "debit_note").length,
    payments: state.payments.length,
  };
  const users = state.users || SEED_USERS;
  const meUser = users.find((u) => u.id === me) || users[0] || SEED_USERS[0];
  const role = ROLES[meUser.role] || ROLES.admin;
  const can = (p) => role.perms.indexOf(p) >= 0;
  const allowed = (k) => !SCREEN_PERM[k] || can(SCREEN_PERM[k]);
  const NAV_VISIBLE = NAV.map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.k) && hits(navSearch,g.g,i.l)) }))
    .filter((g) => g.items.length);
  React.useEffect(() => { if (!allowed(view)) setView("dash"); }, [me, view]);
  const here = NAV.flatMap((g) => g.items.map((i) => ({ ...i, g: g.g }))).find((i) => i.k === view) || { l: "Dashboard", g: "Overview" };
  const alerts = useMemo(() => {
    let n = state.docs.filter((d) => d.state === "draft").length ? 1 : 0;
    const a = aging(state, "receivable", TODAY);
    if (a.rows.some((r) => r.items.some((i) => daysBetween(i.due, TODAY) > 0))) n++;
    if (PRODUCTS.some((p) => p.kind === "goods" && (books.stock[p.id] || { qty: 0 }).qty < 0)) n++;
    return n;
  }, [state, books]);

  const cmdItems = useMemo(() => [
    ...NAV.flatMap((g) => g.items.map((i) => ({ key: i.k, label: i.l, hint: g.g, icon: i.i, act: () => go(i.k) }))),
    { key: "new_inv", label: "Create a new invoice", hint: "Action", icon: Plus, act: () => newDoc("invoice") },
    { key: "new_bill", label: "Create a new vendor bill", hint: "Action", icon: Plus, act: () => newDoc("bill") },
    { key: "backup", label: "Back up the books to JSON", hint: "Action", icon: Download, act: backup },
    { key: "start_company", label: state.sample ? "Start my company (clear the sample data)" : "Start a new company", hint: "Action", icon: Rocket, act: startCompany },
    { key: "setup_guide", label: "Setup guide — import products, customers, opening balances", hint: "Action", icon: ListChecks, act: () => go("setup") },
    ...state.docs.map((d) => ({ key: d.id, label: `${d.number} · ${PMAP[d.partner].name}`,
      hint: DOCMETA[d.type].short, search:d.lines.map(l=>productText(PROD[l.product])).join(" "), icon: FileText, act: () => go(LIST_OF[d.type], d.id) })),
    ...PRODUCTS.map(p=>({key:"product_"+p.id,label:p.code+" · "+p.name,hint:[p.id,p.barcode,p.brand,p.packing].filter(Boolean).join(" · "),icon:Package,act:()=>go("products",p.id)})),
    ...PARTNERS.map(p=>({key:"partner_"+p.id,label:p.name,hint:[p.role,p.phone,p.contact,p.trn].join(" · "),icon:Users,act:()=>go("partners",p.id)})),
    ...ACCOUNTS.map((a) => ({ key: a.code, label: `${a.code} — ${a.name}`, hint: "Ledger", icon: BookOpen,
      act: () => go("r_gl", a.code) })),
  ], [state]);

  const body = () => {
    if (!allowed(view)) return (
      <div>
        <PageHead eyebrow="Access" title="Not available on your role"
          sub={`You are signed in as ${meUser.name}, a ${role.label.toLowerCase()}.`} />
        <Card>
          <EmptyState icon={ShieldCheck} title="This area is restricted">
            {role.label} accounts do not have the “{(PERMS.find((p) => p[0] === SCREEN_PERM[view]) || ["", view])[1]}”
            permission. An administrator can change that under Users &amp; access.</EmptyState>
        </Card>
      </div>);
    if (DOC_VIEWS[view]) return <DocumentsScreen key={view} type={DOC_VIEWS[view]} state={state} setState={setState}
      books={books} openId={param} clearOpen={() => setParam(null)} toast={toast} go={go} fta={fta} />;
    switch (view) {
      case "dash": return <Dashboard state={state} books={books} go={go} newDoc={newDoc} range={range} setRange={setRange} user={meUser}
        setup={!state.sample && !(state.setup && state.setup.hidden) && <SetupProgress state={state} company={company} go={go} />} />;
      case "setup": return <SetupScreen state={state} setState={setState} books={books} company={company} go={go} newDoc={newDoc} toast={toast}
        backup={backup} startCompany={startCompany} loadSample={reset} />;
      case "methods": return <MethodsScreen state={state} setState={setState} books={books} toast={toast} />;
      case "r_stmt": return <StatementScreen state={state} books={books} p={period} setP={setPeriod}
        toast={toast} fta={fta} param={param} />;
      case "r_method": return <MethodReport state={state} books={books} p={period} setP={setPeriod} toast={toast} />;
      case "banking": return <BankingScreen state={state} setState={setState} books={books} toast={toast} go={go} />;
      case "expenses": return <ExpensesScreen state={state} setState={setState} books={books} toast={toast} />;
      case "assets": return <AssetsScreen state={state} setState={setState} books={books} toast={toast} />;
      case "payments": return <PaymentsScreen state={state} setState={setState} toast={toast} />;
      case "partners": return <PartnersScreen state={state} setState={setState} go={go} toast={toast} books={books} param={param} />;
      case "products": return <ProductsScreen books={books} state={state} setState={setState} toast={toast} param={param} />;
      case "categories": return <CategoriesScreen state={state} setState={setState} books={books} toast={toast}/>;
      case "pricelists": return <PricingScreen state={state} setState={setState} toast={toast}/>;
      case "salespeople": return <SalespeopleScreen state={state} setState={setState} toast={toast}/>;
      case "stock_count": return <StockOpsScreen state={state} setState={setState} books={books} toast={toast} kind="count"/>;
      case "scrap": return <StockOpsScreen state={state} setState={setState} books={books} toast={toast} kind="scrap"/>;
      case "accounts": return <AccountsScreen books={books} go={go} state={state} setState={setState} toast={toast} />;
      case "journal": return <JournalScreen books={books} state={state} setState={setState} toast={toast} />;
      case "fta": return <FtaScreen state={state} setState={setState} books={books} company={company} fta={fta} setFta={setFta}
        p={period} setP={setPeriod} toast={toast} go={go} />;
      case "users": return <UsersScreen state={state} setState={setState} me={me} setMe={setMe} toast={toast} />;
      case "settings": return <SettingsScreen setCosting={(k) => setState((x) => ({ ...x, costing: k }))} fta={fta} setFta={setFta} company={company} setCompany={setCompany} theme={theme} setTheme={setTheme}
        density={density} setDensity={setDensity} backup={backup} restore={restore} reset={reset} startCompany={startCompany} go={go}
        toast={toast} books={books} state={state} />;
      case "r_tb": return <TrialBalance books={books} p={period} setP={setPeriod} toast={toast} />;
      case "r_gl": return <GeneralLedger books={books} p={period} setP={setPeriod} toast={toast} param={param} />;
      case "r_partner": return <PartnerLedgerRep books={books} p={period} setP={setPeriod} toast={toast} param={param} />;
      case "r_aged_ar": return <Aged state={state} kind="receivable" p={period} setP={setPeriod} toast={toast} />;
      case "r_aged_ap": return <Aged state={state} kind="payable" p={period} setP={setPeriod} toast={toast} />;
      case "r_pnl": return <ProfitLoss books={books} p={period} setP={setPeriod} toast={toast} />;
      case "r_bs": return <BalanceSheetRep books={books} p={period} setP={setPeriod} toast={toast} />;
      case "r_prod": return <ProfitReport state={state} books={books} p={period} setP={setPeriod} by="product" toast={toast} />;
      case "r_cust": return <ProfitReport state={state} books={books} p={period} setP={setPeriod} by="customer" toast={toast} />;
      case "r_vat": return <VatReturn state={state} p={period} setP={setPeriod} toast={toast} />;
      case "r_stock": return <StockReport books={books} p={period} setP={setPeriod} toast={toast} />;
      default: return null;
    }
  };

  return (
    <ThemeCtx.Provider value={palette}>
    <CompanyCtx.Provider value={company}>
    <div className="mz" data-theme={theme} data-density={density} style={{ height: "100vh" }}>
      <style>{CSS + DESIGN_CSS + ONBOARD_CSS}</style>
      {starting && <StartCompanyDialog state={state} company={company} backup={backup} close={() => setStarting(false)} onDone={companyStarted} />}
      {cmdk && <CommandPalette items={cmdItems} close={() => setCmdk(false)} run={(i) => i.act()} />}
      <Toasts items={toasts} />

      {drawer && <div className="side-scrim" onMouseDown={() => setDrawer(false)}
        onClick={() => setDrawer(false)} role="presentation" />}
      <nav className={cx("side", mini && "mini", drawer && "open")}>
        <div className="side-top">
          <span className="logo">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#EFD9A8" strokeWidth="1.7"
              strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M6 7h12M7 7l-3 6.4a3.4 3.4 0 0 0 6 0zM20 7l-3 6.4a3.4 3.4 0 0 0 6 0z" /></svg>
          </span>
          <span className="wordmark"><b>Invoeez</b><span className="edition">Enterprise Edition</span></span>
        </div>
        <button className="co-card" onClick={() => go("settings")} title="Company profile">
          {company.logo ? <img className="logoimg" src={company.logo} alt="" />
            : <span className="av">{initials(company.name)}</span>}
          <span className="t"><b>{company.name}</b><span>TRN {company.trn}</span></span>
        </button>
        <div className="nav-search"><Search size={14}/><input aria-label="Search navigation" placeholder="Find a section…" value={navSearch} onChange={e=>setNavSearch(e.target.value)}/></div>
        <div className="nav-scroll">
          {NAV_VISIBLE.map((g) => {
            const shut = closed[g.g] && !mini && !navSearch;
            return (
            <div key={g.g}>
              <button className={cx("nav-group", shut && "shut")} onClick={() => setClosed((c) => ({ ...c, [g.g]: !c[g.g] }))}>
                {g.g}<ChevronDown size={13} strokeWidth={2.4} className="cv" /></button>
              {!shut && <div className="nav-grp-items">{g.items.map((it) => (
                <button key={it.k} className={cx("nav-item", view === it.k && "on")} onClick={() => go(it.k)} title={it.l}>
                  <it.i size={16} strokeWidth={1.8} />
                  <span className="lbl">{it.l}</span>
                  {counts[it.k] != null && <span className="ct">{counts[it.k]}</span>}
                </button>))}</div>}
            </div>); })}
        </div>
        <div className="sysline"><i /><span className="txt">Local workspace</span>
          <span className="v">{BUILD}</span></div>
        <div className="side-foot">
          <span className="av">{initials(meUser.name)}</span>
          <span className="who"><b>{meUser.name}</b><span>{role.label}</span></span>
          <button className="collapse" onClick={() => setMini((v) => !v)} title={mini ? "Expand sidebar" : "Collapse sidebar"}>
            {mini ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}</button>
        </div>
      </nav>

      <div className="main">
        <div className="topbar">
          <div className="tb-l">
            <button className="icon-btn burger" onClick={() => setDrawer(true)} aria-label="Open navigation">
              <Menu size={20} strokeWidth={1.9} /></button>
            <div className="tb-title">{here.l}</div>
            <div className="crumb">{here.g}<ChevronRight size={13} /><b>{here.l}</b></div>
            <span className={cx("chip", books.balanced ? "ok" : "bad")}
              title="Total debits versus total credits across every posted entry">
              <Scale size={13} strokeWidth={1.9} />
              <span className="lbl">{books.balanced ? "Balanced" : `Out by ${money(books.totalD - books.totalC)}`}</span></span>
          </div>
          <button className="omni" onClick={() => setCmdk(true)}>
            <span className="oi"><Search size={15} strokeWidth={2.2} /></span>
            <span className="ot">Search products, barcode, invoices…</span><kbd>⌘K</kbd></button>
          <div className="tb-r">
          <div style={{ position: "relative" }}>
            <button className="btn pri" ref={newRef} onClick={() => {
              const el = newRef.current;
              if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect();
                setNewAt({ top: Math.round(r.bottom + 8), left: Math.round(Math.max(8, r.right - 250)) }); }
              setNewMenu((v) => !v);
            }}><Plus size={15} strokeWidth={2.1} />New</button>
          </div>
          <span className="tb-div" />
          <div className="tb-icons">
            <button className="icon-btn bell" onClick={() => go("dash")} title="Items needing attention">
              <Bell size={17} strokeWidth={1.9} />
              {alerts > 0 && <span className="dot">{alerts}</span>}</button>
            <button className="icon-btn" onClick={() => go("r_vat")} title="Filing calendar">
              <Calendar size={17} strokeWidth={1.9} /></button>
            <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle colour theme">
              {theme === "dark" ? <Sun size={17} strokeWidth={1.9} /> : <Moon size={17} strokeWidth={1.9} />}
            </button>
          </div>
          <span className="tb-div" />
          <button className="coswitch" onClick={() => go("settings")} title="Company profile">
            {company.logo ? <img src={company.logo} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "contain", background: "#fff" }} />
              : <span className="gt sm" style={{ width: 26, height: 26, flexBasis: 26, borderRadius: 7 }}>
                  <Building2 size={14} strokeWidth={2} /></span>}
            <span className="cx"><b>{company.name}</b><span>Company</span></span>
            <ChevronDown size={14} strokeWidth={2} style={{ opacity: .55 }} /></button>
          <button className="userchip" onClick={() => setMenu(true)} aria-label="Account menu">
            <span className="me">{initials(meUser.name)}</span>
            <span className="ux"><b>{meUser.name}</b><span>{role.label}</span></span>
            <ChevronDown size={14} strokeWidth={2} style={{ opacity: .55 }} /></button>
          {newMenu && (<>
            <div className="pop-scrim" onMouseDown={() => setNewMenu(false)} />
            <div className="newpop" style={{ top: newAt.top, left: newAt.left }}>
              {can("sell") && <div className="gl">Sales</div>}
              {can("sell") && <>
              <button onClick={() => { setNewMenu(false); newDoc("quote"); }}>
                <FileText size={15} strokeWidth={1.8} />Quotation</button>
              {[["invoice", "Customer invoice", FileText], ["credit_note", "Credit note", FileMinus]].map(([t, l, I]) => (
                <button key={t} onClick={() => { setNewMenu(false); newDoc(t); }}>
                  <I size={15} strokeWidth={1.8} />{l}</button>))}
              </>}
              {can("buy") && <div className="gl">Purchases</div>}
              {can("buy") && <>{[["bill", "Vendor bill", ShoppingCart], ["debit_note", "Debit note", FilePlus]].map(([t, l, I]) => (
                <button key={t} onClick={() => { setNewMenu(false); newDoc(t); }}>
                  <I size={15} strokeWidth={1.8} />{l}</button>))}</>}
              {(can("journal") || can("master")) && <div className="gl">Records</div>}
              {can("journal") && <button onClick={() => { setNewMenu(false); go("journal"); }}>
                <Landmark size={15} strokeWidth={1.8} />Journal entry</button>}
              {can("master") && <><button onClick={() => { setNewMenu(false); go("partners"); }}>
                <Users size={15} strokeWidth={1.8} />Customer or vendor</button>
              <button onClick={() => { setNewMenu(false); go("products"); }}>
                <Package size={15} strokeWidth={1.8} />Product or service</button>
              <button onClick={() => { setNewMenu(false); go("accounts"); }}>
                <BookOpen size={15} strokeWidth={1.8} />Ledger account</button></>}
            </div></>)}
          {menu && (<>
            <div className="pop-scrim" onMouseDown={() => setMenu(false)} />
            <div className="pop">
              <div className="pop-head"><b>{meUser.name}</b>
                <span>{role.label} · build {BUILD}</span></div>
              {can("settings") && <button className="pop-item" onClick={() => { setMenu(false); go("users"); }}>
                <Users size={15} strokeWidth={1.8} />Users &amp; access</button>}
              <button className="pop-item" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Moon size={15} strokeWidth={1.8} /> : <Sun size={15} strokeWidth={1.8} />}
                Dark mode<Switch on={theme === "dark"} /></button>
              <button className="pop-item" onClick={() => { setMenu(false); go("settings"); }}>
                <Settings size={15} strokeWidth={1.8} />Settings</button>
              <div className="pop-sep" />
              <button className="pop-item" onClick={() => { backup(); setMenu(false); }}>
                <Download size={15} strokeWidth={1.8} />Back up the books</button>
              <label className="pop-item" style={{ cursor: "pointer" }}>
                <Upload size={15} strokeWidth={1.8} />Restore from backup
                <input type="file" accept="application/json"
                  onChange={(e) => { restore(e); setMenu(false); }} style={{ display: "none" }} /></label>
              <div className="pop-sep" />
              <button className="pop-item" onClick={() => { setMenu(false); startCompany(); }}>
                <Rocket size={15} strokeWidth={1.8} />{state.sample ? "Start my company" : "Start a new company"}</button>
              <button className="pop-item" onClick={() => { setMenu(false); reset(); }}>
                <RotateCcw size={15} strokeWidth={1.8} />Load sample company</button>
            </div></>)}
          </div>
        </div>
        <div className="page"><div className="view" key={view}>
          {state.sample && !bannerHidden && view !== "setup" && <SampleBanner onStart={startCompany} onHide={() => setBannerHidden(true)} />}
          {body()}</div></div>
      </div>
    </div>
    </CompanyCtx.Provider>
    </ThemeCtx.Provider>
  );
}
