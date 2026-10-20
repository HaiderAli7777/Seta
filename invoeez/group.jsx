/* ============================================================================
   3.18 — Several companies, several branches.
   · Companies: each company keeps its own books, profile, VAT settings, users
     and cloud link in this browser. The menu's company card switches between
     them; "Add a company" sets one up in a minute and can copy the chart of
     accounts, users, products, customers and price lists from the current one.
     The first company keeps the original storage keys, so nothing moves.
   · Branches: a company can have branches (Head office, Deira shop, Abu Dhabi
     warehouse…). Every invoice, bill, payment, expense, journal, transfer, stock
     count and cheque belongs to one; anything recorded before branches existed
     belongs to the default branch. Users have a home branch, which new records
     take automatically.
   · Reporting: every ledger entry carries its branch, so each financial report
     can be run for one branch or all of them; "Branch performance" compares the
     branches side by side and the "Group report" puts the companies together.
   ========================================================================== */

/* ------------------------------------------------------------ companies */
/* Function declarations, so the storage keys can be worked out while the rest of the app is still loading. */
function activeCompanyId() {
  try { const v = window.localStorage.getItem("mizan.activeCompany"); return v && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : "main"; } catch (e) { return "main"; }
}
function coKey(base, id) { const c = id || activeCompanyId(); return c === "main" ? base : base + "@" + c; }
function readJSONKey(k) { try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function companyList() {
  let list = readJSONKey("mizan.companies");
  if (!Array.isArray(list)) list = [];
  if (!list.some((c) => c.id === "main")) { const p = readJSONKey("mizan.company"); list.unshift({ id: "main", name: (p && p.name) || "My Company", trn: (p && p.trn) || "" }); }
  return list;
}
function saveCompanyList(list) { try { window.localStorage.setItem("mizan.companies", JSON.stringify(list)); return true; } catch (e) { return false; } }
/* Keep the list's name and TRN in step with the open company's profile. */
function touchCompany(profile) {
  const id = activeCompanyId(), list = companyList();
  const i = list.findIndex((c) => c.id === id), rec = { id, name: profile.name || "Company", trn: profile.trn || "", emirate: profile.emirate || "", logo: profile.logo ? 1 : 0 };
  if (i >= 0 && list[i].name === rec.name && list[i].trn === rec.trn && list[i].emirate === rec.emirate) return;
  if (i >= 0) list[i] = { ...list[i], ...rec }; else list.push(rec);
  saveCompanyList(list);
}
function switchCompany(id) {
  try { window.localStorage.setItem("mizan.activeCompany", id); } catch (e) { return; }
  window.setTimeout(() => window.location.reload(), 60);
}
/* A new company: its books and profile are written under its own keys, then the app reopens on it. */
function createCompany(books, profile) {
  const id = "co" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    window.localStorage.setItem(coKey("mizan.books.v2", id), JSON.stringify(books));
    window.localStorage.setItem(coKey("mizan.company", id), JSON.stringify(profile));
  } catch (e) {
    try { window.localStorage.removeItem(coKey("mizan.books.v2", id)); window.localStorage.removeItem(coKey("mizan.company", id)); } catch (x) {}
    return { error: "This browser has no room left for another company. Back up and remove one you no longer need, or use cloud sync." };
  }
  saveCompanyList([...companyList(), { id, name: profile.name, trn: profile.trn || "", emirate: profile.emirate || "" }]);
  switchCompany(id);
  return { id };
}
function removeCompany(id) {
  /* The open company, and the first one (whose books use the original storage keys), stay. */
  if (id === activeCompanyId() || id === "main") return false;
  ["mizan.books.v2", "mizan.company", "mizan.fta", "mizan.cloud", "mizan.cloud.conflicts", "mizan.cloud.log"].forEach((k) => { try { window.localStorage.removeItem(coKey(k, id)); } catch (e) {} });
  saveCompanyList(companyList().filter((c) => c.id !== id));
  return true;
}
/* Another company's books and profile, for the group report. */
function readCompany(id) {
  const raw = readJSONKey(coKey("mizan.books.v2", id)), prof = readJSONKey(coKey("mizan.company", id));
  const books = raw && Array.isArray(raw.docs) && !raw.sample ? migrateBooks(raw) : null;
  return { id, books, profile: { ...COMPANY, ...(prof || {}) } };
}

/* ------------------------------------------------------------- branches */
let BRANCHES = [], ME_BRANCH = "", REPORT_BRANCH = "", REPORT_BRANCH_ID = "", REPORT_SET_BRANCH = () => {};
const BR = {};
function syncBranches(list) {
  BRANCHES = (list || []).filter((b) => b && b.id);
  Object.keys(BR).forEach((k) => delete BR[k]);
  BRANCHES.forEach((b) => (BR[b.id] = b));
}
const branchOn = () => BRANCHES.length > 1;
function defaultBranchId(state) {
  const l = (state && state.branches) || [];
  const d = l.find((b) => b.id === state.defaultBranch) || l.find((b) => b.active !== false) || l[0];
  return d ? d.id : "";
}
/* New records go to the signed-in user's home branch, else the default branch. */
function homeBranch(state) { return ME_BRANCH && BR[ME_BRANCH] && BR[ME_BRANCH].active !== false ? ME_BRANCH : defaultBranchId(state); }
const branchName = (id) => (BR[id] ? BR[id].name : "");
function branchOfRecord(state, rec) { return (rec && rec.branch && BR[rec.branch] ? rec.branch : "") || defaultBranchId(state); }

/* Ledger entries carry their branch; reports filter on it. A balanced entry always sits in one branch, so a branch's books balance too. */
function tagBranches(state, entries) {
  const DEF = defaultBranchId(state);
  if (!DEF) return;
  const ok = (b) => (b && (state.branches || []).some((x) => x.id === b) ? b : DEF);
  const bd = new Map((state.docs || []).map((x) => [x.id, ok(x.branch)]));
  /* A payment or cheque against a document sits in that document's branch, so each branch's receivables and payables clear. */
  const follow = (list) => new Map((list || []).map((x) => [x.id, x.doc && bd.has(x.doc) ? bd.get(x.doc) : x.branch]));
  const bp = follow(state.payments), bc = follow(state.pdcs), bo = new Map((state.stockOps || []).map((x) => [x.id, x.branch]));
  entries.forEach((e) => {
    e.branch = ok(e.docId ? bd.get(e.docId) : e.payId ? bp.get(e.payId) : e.stockOpId ? bo.get(e.stockOpId) : e.pdcId ? bc.get(e.pdcId) : e.branch);
  });
}
function branchBooks(books, b) {
  if (!b) return books;
  const entries = books.entries.filter((e) => e.branch === b), flat = books.flat.filter((l) => l.branch === b);
  const totalD = R2(flat.reduce((s, l) => s + l.debit, 0)), totalC = R2(flat.reduce((s, l) => s + l.credit, 0));
  return { ...books, entries, flat, totalD, totalC, balanced: Math.abs(totalD - totalC) < 0.01, branch: b };
}
/* Transactions of one branch. A payment against a document follows that document, so what a customer owes a branch is right. */
function branchState(state, b) {
  if (!b) return state;
  const DEF = defaultBranchId(state), of = (x) => (x.branch && (state.branches || []).some((y) => y.id === x.branch) ? x.branch : DEF);
  const docB = new Map(state.docs.map((d) => [d.id, of(d)]));
  const mine = (x) => of(x) === b;
  return { ...state, docs: state.docs.filter(mine), manual: state.manual.filter(mine), stockOps: (state.stockOps || []).filter(mine),
    payments: state.payments.filter((p) => (p.doc && docB.has(p.doc) ? docB.get(p.doc) : of(p)) === b),
    pdcs: (state.pdcs || []).filter((c) => (c.doc && docB.has(c.doc) ? docB.get(c.doc) : of(c)) === b) };
}

/* ------------------------------------------------------------- controls */
function BranchField({ value, onChange, disabled, label = "Branch", span }) {
  if (!branchOn()) return null;
  return <Field label={label} span={span}><Select value={value || ""} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.value)}>
    {BRANCHES.filter((b) => b.active !== false || b.id === value).map((b) => <option key={b.id} value={b.id}>{b.name + (b.code ? " · " + b.code : "")}</option>)}
  </Select></Field>;
}
function BranchPick({ value, onChange, dark }) {
  if (!branchOn()) return null;
  return <div className={cx("br-pick", dark && "dark")}><Store size={14} />
    <Select value={value || ""} aria-label="Branch" onChange={(e) => onChange(e.target.value)}>
      <option value="">All branches</option>
      {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </Select></div>;
}

/* --------------------------------------------------- company switcher */
function CompanySwitcher({ company, close, add, manage, at }) {
  const list = companyList(), active = activeCompanyId();
  return <><div className="pop-scrim" onMouseDown={close} />
    <div className="co-pop" role="dialog" aria-label="Companies" style={at}>
      <header><b>Companies</b><small>Each company has its own books, users and VAT settings</small></header>
      <div className="co-list">{list.map((c) => {
        const on = c.id === active, nm = on ? company.name : c.name;
        return <button key={c.id} className={cx("co-row", on && "on")} onClick={() => { if (!on) switchCompany(c.id); else close(); }}>
          <span className="co-av">{initials(nm)}</span><span className="co-t"><b>{nm}</b><small>{(on ? company.trn : c.trn) ? "TRN " + (on ? company.trn : c.trn) : "Not VAT registered"}{c.emirate ? " · " + c.emirate : ""}</small></span>
          {on ? <Pill tone="ok">Open</Pill> : <ArrowRight size={15} />}</button>; })}</div>
      <footer><Btn size="sm" kind="pri" icon={Plus} onClick={add}>Add a company</Btn><button className="linkish" onClick={manage}>Manage companies</button></footer>
    </div></>;
}

function CompaniesCard({ company, onAdd, toast, backup }) {
  const [list, setList] = useState(companyList);
  const active = activeCompanyId();
  const drop = (c) => {
    if (!window.confirm(`Remove ${c.name} and all its books from this browser? Download its backup first if you might need it — this cannot be undone here.`)) return;
    if (removeCompany(c.id)) { setList(companyList()); toast(`${c.name} removed from this browser`, "warn"); }
  };
  return <Card title="Companies" sub="Run several companies from one InvoEez — each with its own books, users, TRN and VAT return" pad={false}>
    <div className="setsec" id="companies">
      {list.map((c) => { const on = c.id === active; return <div key={c.id} className="setrow co-setrow">
        <span className="co-av">{initials(on ? company.name : c.name)}</span>
        <div className="st"><b>{on ? company.name : c.name}{on && <> <Pill tone="ok">Open now</Pill></>}</b><span>{(on ? company.trn : c.trn) ? "TRN " + (on ? company.trn : c.trn) : "Not VAT registered"}{c.emirate ? " · " + c.emirate : ""}</span></div>
        {on ? <Btn size="sm" icon={Download} onClick={backup}>Back up</Btn> : <><Btn size="sm" icon={ArrowRight} onClick={() => switchCompany(c.id)}>Open</Btn>
          {c.id !== "main" && <button className="icon-btn" title={`Remove ${c.name}`} aria-label={`Remove ${c.name}`} onClick={() => drop(c)}><Trash2 size={14} /></button>}</>}
      </div>; })}
      <div className="co-add"><Btn kind="pri" icon={Plus} onClick={onAdd}>Add a company</Btn>
        <span>Takes a minute: name, TRN and address, then choose what to copy from {company.name} — chart of accounts, users, products, customers.</span></div>
    </div>
  </Card>;
}

/* --------------------------------------------------------- branches screen */
const blankOwnBranch = (state, company) => ({ id: uid("bra"), name: "", code: "", address: "", address2: "", emirate: company.emirate || "Dubai", phone: "", email: "", active: true });
function BranchesScreen({ state, setState, books, company, toast, go, users, create }) {
  const list = state.branches || [];
  const [ed, setEd] = useState(null);
  useCreate(create, () => setEd(blankOwnBranch(state, company)));
  const def = defaultBranchId(state);
  const yr = TODAY.slice(0, 4) + "-01-01";
  const stats = useMemo(() => {
    const out = {};
    list.forEach((b) => { const bb = branchBooks(books, b.id); const r = pnl(bb.flat, yr, TODAY);
      out[b.id] = { revenue: r.revenue, net: r.net, docs: state.docs.filter((d) => d.state === "posted" && branchOfRecord(state, d) === b.id).length }; });
    return out;
  }, [books, list]);
  const save = () => {
    const rec = { ...ed, name: ed.name.trim(), code: (ed.code || "").trim().toUpperCase() };
    setState((s) => { const l = s.branches || []; const exists = l.some((x) => x.id === rec.id);
      return { ...s, branches: exists ? l.map((x) => (x.id === rec.id ? rec : x)) : [...l, rec], defaultBranch: s.defaultBranch || (exists ? s.defaultBranch : rec.id) }; });
    toast(`${rec.name} saved`); setEd(null);
  };
  /* The first time: the company itself becomes the head office, so everything already recorded has a home. */
  const start = () => {
    const head = { ...blankOwnBranch(state, company), name: "Head office", code: "HO", address: company.address || "", address2: company.address2 || "", phone: company.phone || "", email: company.email || "" };
    setState((s) => ({ ...s, branches: [head], defaultBranch: head.id }));
    setEd(blankOwnBranch(state, company));
    toast("Head office created — everything recorded so far belongs to it. Now add your next branch.");
  };
  const toggle = (b) => {
    if (b.id === def && b.active !== false) return toast("The default branch cannot be switched off — make another branch the default first", "warn");
    setState((s) => ({ ...s, branches: s.branches.map((x) => (x.id === b.id ? { ...x, active: x.active === false } : x)) }));
  };
  const remove = (b) => {
    const used = state.docs.some((d) => d.branch === b.id) || state.payments.some((p) => p.branch === b.id) || state.manual.some((e) => e.branch === b.id) || b.id === def;
    if (used) return toast(`${b.name} has transactions${b.id === def ? " (and is the default)" : ""} — switch it off instead of removing it`, "warn");
    setState((s) => ({ ...s, branches: s.branches.filter((x) => x.id !== b.id) })); toast(`${b.name} removed`, "warn");
  };
  const valid = ed && ed.name.trim().length >= 2 && !list.some((x) => x.id !== ed.id && x.name.trim().toLowerCase() === ed.name.trim().toLowerCase());
  return <div>
    <PageHead eyebrow="Utilities & tools" title="Branches" sub={list.length ? `${list.length} branch${list.length === 1 ? "" : "es"} — every transaction belongs to one, and every report can be run for one or all` : "Run shops, warehouses or offices as branches of this company, and report on each"}>
      {list.length > 0 && <Btn kind="pri" icon={Plus} onClick={() => setEd(blankOwnBranch(state, company))}>New branch</Btn>}
    </PageHead>
    {!list.length && !ed && <Card><div className="br-intro">
      <span className="br-intro-ic"><Store size={26} /></span>
      <div><h3>Set up branches in two steps</h3>
        <ol><li><b>Head office</b> is created from your company details. Everything recorded so far belongs to it.</li>
          <li>Add your other branches — name, short code, address and emirate. Then give each user a home branch in Users &amp; access.</li></ol>
        <p>From then on, invoices, bills, payments, expenses and journals carry a branch (your users' home branch by default), and every report has a branch filter. The VAT return stays one return for the whole company, as the FTA requires.</p>
        <Btn kind="pri" icon={Store} onClick={start}>Set up branches</Btn></div></div></Card>}
    {ed && <Card title={list.some((x) => x.id === ed.id) ? `Edit ${ed.name || "branch"}` : "New branch"} sub="Shown on the documents it issues; the company's TRN applies to every branch" style={{ marginBottom: 16 }}
      right={<><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>Save branch</Btn></>}>
      <div className="setgrid">
        <Field label="Branch name" span={2}><Input autoFocus value={ed.name} placeholder="e.g. Deira shop" onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
        <Field label="Short code"><Input value={ed.code} maxLength={6} placeholder="e.g. DRA" onChange={(e) => setEd({ ...ed, code: e.target.value })} /></Field>
        <Field label="Emirate"><Select value={ed.emirate} onChange={(e) => setEd({ ...ed, emirate: e.target.value })}>{EMIRATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Address line 1"><Input value={ed.address} placeholder="Building, street" onChange={(e) => setEd({ ...ed, address: e.target.value })} /></Field>
        <Field label="Address line 2"><Input value={ed.address2} placeholder="Area, P.O. Box" onChange={(e) => setEd({ ...ed, address2: e.target.value })} /></Field>
        <Field label="Telephone"><Input value={ed.phone} placeholder="+971 4 000 0000" onChange={(e) => setEd({ ...ed, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={ed.email} placeholder="branch@yourcompany.ae" onChange={(e) => setEd({ ...ed, email: e.target.value })} /></Field>
      </div>
      {ed.name.trim().length >= 2 && !valid && <div className="form-error">Another branch already has that name.</div>}
    </Card>}
    {list.length > 0 && <div className="br-grid-cards">{list.map((b) => { const st = stats[b.id] || {}, people = (users || []).filter((u) => u.branch === b.id && u.active !== false);
      return <div key={b.id} className={cx("card br-own", b.active === false && "off", b.id === def && "def")} data-branch={b.id}>
        <div className="bo-top"><span className="bo-ic"><Store size={18} /></span>
          <div className="bo-t"><b>{b.name}{b.code && <em>{b.code}</em>}</b><small>{[b.address, b.address2, b.emirate].filter(Boolean).join(", ") || "No address yet"}</small></div>
          {b.id === def ? <Pill tone="ok">Default</Pill> : b.active === false ? <Pill>Switched off</Pill> : null}</div>
        <div className="bo-stats"><div><small>Sales this year</small><b>{money(st.revenue || 0, false)}</b></div><div><small>Profit this year</small><b className={(st.net || 0) < 0 ? "neg" : ""}>{money(st.net || 0, false)}</b></div><div><small>Documents</small><b>{st.docs || 0}</b></div></div>
        <div className="bo-people">{people.length ? people.map((u) => <span key={u.id} title={u.name}>{initials(u.name)}</span>) : <small>No users have this as their home branch</small>}</div>
        <div className="bo-acts">
          <Btn size="sm" icon={Pencil} onClick={() => setEd({ ...b })}>Edit</Btn>
          {b.id !== def && b.active !== false && <Btn size="sm" icon={Star} onClick={() => setState((s) => ({ ...s, defaultBranch: b.id }))}>Make default</Btn>}
          <Btn size="sm" onClick={() => toggle(b)}>{b.active === false ? "Switch on" : "Switch off"}</Btn>
          <Btn size="sm" icon={BarChart3} onClick={() => go("r_branch")}>Report</Btn>
          <button className="icon-btn" title={`Remove ${b.name}`} aria-label={`Remove ${b.name}`} onClick={() => remove(b)}><Trash2 size={14} /></button>
        </div>
      </div>; })}</div>}
  </div>;
}

/* ------------------------------------------------------ branch performance */
function BranchPerformance({ state, books, p, setP, toast, go }) {
  const list = state.branches || [];
  const rows = useMemo(() => list.map((b) => {
    const bb = branchBooks(books, b.id), r = pnl(bb.flat, p.from, p.to), st = branchState(state, b.id);
    const inv = st.docs.filter((d) => d.state === "posted" && d.type === "invoice" && inRange(d.date, p.from, p.to));
    const ar = aging(st, "receivable", p.to);
    const cash = R2(st.payments.filter((x) => x.kind === "in" && inRange(x.date, p.from, p.to)).reduce((s, x) => s + x.amount, 0));
    return { b, r, invoices: inv.length, avg: inv.length ? R2(r.revenue / inv.length) : 0, ar: ar.grand, cash, balanced: bb.balanced };
  }), [state, books, p.from, p.to]);
  const all = pnl(books.flat, p.from, p.to);
  const sum = (f) => R2(rows.reduce((s, x) => s + f(x), 0));
  if (list.length < 2) return <ReportFrame toast={toast} title="Branch performance" icon={Store} nobranch chips={[`${dmy(p.from)} – ${dmy(p.to)}`]}>
    <EmptyState icon={Store} title="Add branches to compare them">Set up branches in Utilities & tools › Branches; this report then puts them side by side.</EmptyState>
    <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}><Btn kind="pri" icon={Store} onClick={() => go("branches")}>Set up branches</Btn></div></ReportFrame>;
  const best = rows.slice().sort((a, b) => b.r.net - a.r.net)[0];
  const lines = [["Revenue", (x) => x.r.revenue, true], ["Cost of sales", (x) => -x.r.cost], ["Gross profit", (x) => x.r.gross, true, "sub"], ["Gross margin", (x) => x.r.gm, false, "pct"],
    ["Operating expenses", (x) => -x.r.expense], ["Net profit", (x) => x.r.net, true, "total"], ["Net margin", (x) => x.r.nm, false, "pct"],
    ["Invoices issued", (x) => x.invoices, false, "count"], ["Average invoice", (x) => x.avg], ["Cash collected", (x) => x.cash], ["Customers owe (at period end)", (x) => x.ar]];
  const total = { r: { revenue: all.revenue, cost: all.cost, gross: all.gross, gm: all.gm, expense: all.expense, net: all.net, nm: all.nm }, invoices: sum((x) => x.invoices),
    avg: sum((x) => x.invoices) ? R2(all.revenue / sum((x) => x.invoices)) : 0, cash: sum((x) => x.cash), ar: sum((x) => x.ar) };
  const fmt = (v, kind) => (kind === "pct" ? `${(+v || 0).toFixed(1)}%` : kind === "count" ? String(v) : money(v));
  return <div className="grid">
    <ReportFrame toast={toast} title="Branch performance" icon={Store} nobranch
      chips={[`${dmy(p.from)} – ${dmy(p.to)}`, `${list.length} branches`, "AED"]} meta={`${dmy(p.from)} to ${dmy(p.to)} · ${list.length} branches · AED`}
      right={<PeriodBar p={p} setP={setP} nobranch />}>
      <Insight tone="">{best && best.r.net > 0 ? <><b>{best.b.name}</b> made the most profit: <b>{aed(best.r.net)}</b> on sales of {aed(best.r.revenue)} ({best.r.nm.toFixed(1)}% net margin). </> : null}
        All branches together: sales {aed(all.revenue)}, net profit {aed(all.net)}.</Insight>
      <div className="rpt-grid">
        <VizCard title="Sales and net profit by branch" sub={`${dmy(p.from)} – ${dmy(p.to)} · AED · hover a branch for the figures`}
          legend={[{ name: "Sales", color: "var(--s1)" }, { name: "Net profit", color: "var(--s2)" }]}>
          <ColumnChart data={rows.map((x) => ({ label: x.b.code || x.b.name, full: x.b.name, revenue: x.r.revenue, net: x.r.net }))}
            series={[{ key: "revenue", name: "Sales", color: "var(--s1)" }, { key: "net", name: "Net profit", color: "var(--s2)" }]} ariaLabel="Sales and net profit by branch" />
        </VizCard>
        <VizCard title="Share of sales" sub="Each branch's part of the company's revenue">
          <ShareMeters items={rows.map((x) => ({ id: x.b.id, name: x.b.name, r: x.r }))} total={all.revenue} />
        </VizCard>
      </div>
      <SectionTitle>Side by side</SectionTitle>
      <div className="tbl-wrap"><table className="tbl fin-tbl br-tbl">
        <thead><tr><th></th>{rows.map((x) => <th key={x.b.id} className="n">{x.b.name}{x.b.active === false && <small> (off)</small>}</th>)}<th className="n">All branches</th></tr></thead>
        <tbody>{lines.map(([label, f, , kind]) => <tr key={label} className={kind === "total" ? "fin-total" : kind === "sub" ? "fin-sub" : "fin-acc"}>
          <td>{label}</td>{rows.map((x) => <td key={x.b.id} className={cx("n", f(x) < 0 && kind !== "pct" && label !== "Cost of sales" && label !== "Operating expenses" && "neg")}>{fmt(f(x), kind)}</td>)}
          <td className="n" style={{ fontWeight: 650 }}>{fmt(f(total), kind)}</td></tr>)}</tbody>
      </table></div>
      <p className="br-note">Each branch's figures come from the transactions recorded under it; the "All branches" column is the whole company and always equals the profit and loss statement. Cash collected and what customers owe follow the invoice a payment settles. Open a single branch's statements with the Branch filter on any report.</p>
    </ReportFrame>
  </div>;
}

/* Each branch's or company's share of sales, with its net margin underneath. */
function ShareMeters({ items, total }) {
  return <div className="meters">{items.map((x) => <Meter key={x.id} label={x.name} value={Math.max(0, x.r.revenue)} max={Math.max(total, 1)}
    text={total ? `${((x.r.revenue / total) * 100).toFixed(1)}%` : "—"} tone={x.r.net < 0 ? "neg" : undefined}
    note={`AED ${money(x.r.revenue, false)} · ${x.r.revenue ? ((x.r.net / x.r.revenue) * 100).toFixed(1) : "0.0"}% net margin`} />)}</div>;
}

/* ------------------------------------------------------------ group report */
/* One company's headline figures, worked out with that company's own chart of accounts loaded. */
function companyFigures(bk, from, to) {
  const r = pnl(bk.flat, from, to), b = balanceSheet(bk.flat, to, to.slice(0, 4) + "-01-01");
  const bal = (t) => R2(bk.flat.filter((l) => l.date <= to && ACC[l.acc] && ACC[l.acc].type === t).reduce((s, l) => s + l.debit - l.credit, 0));
  return { r, assets: b.totA, liab: b.totL, equity: b.totE, cash: bal("bank"), recv: bal("receivable"), pay: -bal("payable"), balanced: bk.balanced && Math.abs(b.diff) < 0.01 };
}
function GroupReport({ state, books, company, p, setP, toast, onAdd }) {
  const list = companyList(), active = activeCompanyId();
  const cols = useMemo(() => list.map((c) => {
    if (c.id === active) return { c: { ...c, name: company.name }, ...companyFigures(books, p.from, p.to) };
    const x = readCompany(c.id);
    if (!x.books) return { c: { ...c, name: x.profile.name || c.name }, missing: true };
    /* Load the other company's accounts, products and customers, work out its ledger, then put this company's back. */
    try {
      syncAccounts(x.books.accounts || []); syncPartners(x.books.partners || []); syncProducts(x.books.products || [], x.books.categories || DEFAULT_CATEGORIES); syncMethods(x.books.methods || []);
      syncBranches(x.books.branches || []);
      return { c: { ...c, name: x.profile.name || c.name }, ...companyFigures(deriveBooks(x.books), p.from, p.to) };
    } finally {
      syncAccounts(state.accounts || []); syncPartners(state.partners || []); syncProducts(state.products || [], state.categories || DEFAULT_CATEGORIES); syncMethods(state.methods || []);
      syncBranches(state.branches || []);
    }
  }), [books, state, company, p.from, p.to]);
  const live = cols.filter((x) => !x.missing);
  const tot = (f) => R2(live.reduce((s, x) => s + f(x), 0));
  if (list.length < 2) return <ReportFrame toast={toast} title="Group report" icon={Building2} nobranch chips={[`${dmy(p.from)} – ${dmy(p.to)}`]}>
    <EmptyState icon={Building2} title="One company so far">Add your other companies (Settings › Companies, or the company name at the top of the menu) and this report puts them together.</EmptyState>
    <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}><Btn kind="pri" icon={Plus} onClick={onAdd}>Add a company</Btn></div></ReportFrame>;
  const pct = (x) => (x.r.revenue ? (x.r.net / x.r.revenue) * 100 : 0);
  const lines = [["Revenue", (x) => x.r.revenue], ["Cost of sales", (x) => -x.r.cost], ["Gross profit", (x) => x.r.gross, "sub"], ["Operating expenses", (x) => -x.r.expense], ["Net profit", (x) => x.r.net, "total"],
    ["Net margin", pct, "pct"], [null], ["Cash and bank", (x) => x.cash], ["Customers owe", (x) => x.recv], ["Owed to vendors", (x) => x.pay],
    ["Total assets", (x) => x.assets, "sub"], ["Total liabilities", (x) => x.liab], ["Equity", (x) => x.equity, "total"]];
  const T = { r: { revenue: tot((x) => x.r.revenue), cost: tot((x) => x.r.cost), gross: tot((x) => x.r.gross), expense: tot((x) => x.r.expense), net: tot((x) => x.r.net) },
    cash: tot((x) => x.cash), recv: tot((x) => x.recv), pay: tot((x) => x.pay), assets: tot((x) => x.assets), liab: tot((x) => x.liab), equity: tot((x) => x.equity) };
  return <div className="grid">
    <ReportFrame toast={toast} title="Group report" icon={Building2} nobranch chips={[`${dmy(p.from)} – ${dmy(p.to)}`, `${live.length} companies`, "AED"]}
      meta={`${dmy(p.from)} to ${dmy(p.to)} · balances at ${dmy(p.to)} · ${live.length} companies · AED`} right={<PeriodBar p={p} setP={setP} nobranch />}>
      <Insight tone="">The group made <b>{aed(T.r.net)}</b> net profit on sales of {aed(T.r.revenue)} from {dmy(p.from)} to {dmy(p.to)}, and holds {aed(T.cash)} in cash and bank.</Insight>
      <div className="rpt-grid">
        <VizCard title="Sales and net profit by company" sub={`${dmy(p.from)} – ${dmy(p.to)} · AED · hover a company for the figures`}
          legend={[{ name: "Sales", color: "var(--s1)" }, { name: "Net profit", color: "var(--s2)" }]}>
          <ColumnChart data={live.map((x) => ({ label: initials(x.c.name) || x.c.name.slice(0, 3), full: x.c.name, revenue: x.r.revenue, net: x.r.net }))}
            series={[{ key: "revenue", name: "Sales", color: "var(--s1)" }, { key: "net", name: "Net profit", color: "var(--s2)" }]} ariaLabel="Sales and net profit by company" />
        </VizCard>
        <VizCard title="Share of group sales" sub="Each company's part of the group's revenue">
          <ShareMeters items={live.map((x) => ({ id: x.c.id, name: x.c.name, r: x.r }))} total={T.r.revenue} />
        </VizCard>
      </div>
      <SectionTitle>Companies side by side</SectionTitle>
      <div className="tbl-wrap"><table className="tbl fin-tbl br-tbl">
        <thead><tr><th></th>{cols.map((x) => <th key={x.c.id} className="n">{x.c.name}{x.c.id === active && <small> (open)</small>}</th>)}<th className="n">Group total</th></tr></thead>
        <tbody>{lines.map(([label, f, kind], i) => label === null ? <tr key={"g" + i} className="fin-sec"><td colSpan={cols.length + 2}>Balances at {dmy(p.to)}</td></tr>
          : <tr key={label} className={kind === "total" ? "fin-total" : kind === "sub" ? "fin-sub" : "fin-acc"}><td>{label}</td>
            {cols.map((x) => <td key={x.c.id} className="n">{x.missing ? "—" : kind === "pct" ? `${f(x).toFixed(1)}%` : money(f(x))}</td>)}
            <td className="n" style={{ fontWeight: 650 }}>{kind === "pct" ? `${pct(T).toFixed(1)}%` : money(f(T))}</td></tr>)}</tbody>
      </table></div>
      <p className="br-note">Each company's figures come from its own books in this browser{cols.some((x) => x.missing) ? " (a company that is still the sample, or was never opened, shows —)" : ""}. The group total adds the companies together; sales, loans or balances between group companies are not eliminated, so adjust for them in your consolidation if you have any.</p>
    </ReportFrame>
  </div>;
}

const GROUP_CSS = `
.br-pick{display:inline-flex;align-items:center;gap:7px;min-width:190px}
.br-pick>svg{color:var(--ink-3);flex:0 0 auto}
.br-pick .inp.sel{min-width:160px}
.br-pick.dark>svg{color:rgba(255,255,255,.8)}
.br-pick.dark .inp.sel{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:#fff}
.co-pop{position:fixed;z-index:1300;width:340px;max-width:calc(100vw - 24px);background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh-3);overflow:hidden;animation:ntIn .22s cubic-bezier(.22,1,.36,1) both}
.co-pop header{padding:14px 16px 10px;border-bottom:1px solid var(--line-2)}
.co-pop header b{display:block;font-size:14px;color:var(--ink)}.co-pop header small{display:block;font-size:12px;color:var(--ink-3);margin-top:2px}
.co-list{max-height:320px;overflow:auto;padding:6px}
.co-row{display:flex;align-items:center;gap:11px;width:100%;padding:9px 10px;border-radius:11px;text-align:left;transition:background .15s}
.co-row:hover{background:var(--surface-2)}.co-row.on{background:var(--brand-50)}
.co-row svg{color:var(--ink-3)}
.co-av{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;font-size:12px;font-weight:700;background:linear-gradient(145deg,var(--brand-50),var(--surface-3));color:var(--brand)}
.co-t{flex:1;min-width:0}.co-t b{display:block;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.co-t small{display:block;font-size:11.5px;color:var(--ink-3)}
.co-pop footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-top:1px solid var(--line-2);background:var(--surface-2)}
.co-setrow{gap:12px}
.co-setrow .st b{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.co-setrow .st b .pill{flex:0 0 auto;width:auto}
.co-add{display:flex;align-items:center;gap:14px;padding-top:14px;font-size:12.5px;color:var(--ink-3);line-height:1.5}
.br-intro{display:flex;gap:18px;align-items:flex-start;padding:8px 4px}
.br-intro-ic{width:52px;height:52px;flex:0 0 52px;border-radius:16px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.br-intro h3{font-size:17px;margin-bottom:8px}.br-intro ol{margin:0 0 10px 18px;padding:0;font-size:13px;line-height:1.7;color:var(--ink-2)}
.br-intro p{font-size:12.5px;color:var(--ink-3);line-height:1.6;margin:0 0 14px;max-width:720px}
.br-grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}
.br-own{padding:16px 18px;display:flex;flex-direction:column;gap:12px;transition:box-shadow .2s,border-color .2s}
.br-own.def{border-color:color-mix(in srgb,var(--brand) 35%,var(--line))}
.br-own.off{opacity:.7}
.bo-top{display:flex;align-items:flex-start;gap:12px}
.bo-ic{width:38px;height:38px;flex:0 0 38px;border-radius:12px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.bo-t{flex:1;min-width:0}.bo-t b{display:flex;align-items:center;gap:8px;font-size:14.5px;color:var(--ink)}
.bo-t b em{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:6px;background:var(--surface-3);color:var(--ink-2)}
.bo-t small{display:block;font-size:12px;color:var(--ink-3);margin-top:3px}
.bo-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bo-stats>div{padding:9px 10px;border-radius:10px;background:var(--surface-2)}
.bo-stats small{display:block;font-size:11px;color:var(--ink-3)}.bo-stats b{display:block;font-size:14px;margin-top:3px;font-variant-numeric:tabular-nums}
.bo-stats b.neg{color:var(--neg)}
.bo-people{display:flex;gap:4px;align-items:center;min-height:26px}
.bo-people span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;background:var(--surface-3);color:var(--ink-2);border:2px solid var(--surface)}
.bo-people small{font-size:11.5px;color:var(--ink-4)}
.bo-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.bo-acts .icon-btn{margin-left:auto}
.br-tbl th small{font-weight:400;color:var(--ink-4)}
.br-note{font-size:12px;color:var(--ink-3);line-height:1.6;margin:14px 2px 4px;max-width:900px}
.sb-co .sb-co-cv{margin-left:auto;color:var(--sb-dim);flex:0 0 auto}
@media(max-width:650px){.br-grid-cards{grid-template-columns:1fr}.br-intro{flex-direction:column}.co-add{flex-direction:column;align-items:flex-start}}
`;
