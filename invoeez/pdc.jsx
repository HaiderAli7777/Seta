/* ============================================================================
   POST-DATED CHEQUES (PDC)
   Received cheques sit in 1210 "Post-dated Cheques Received" from the day
   they arrive (the customer's balance is settled), move to the bank when they
   clear, and go back onto the customer's account if they bounce or are
   returned. Issued cheques mirror this through 2110 "Post-dated Cheques
   Issued". Every step is a dated event, so the ledger, aging and statements
   always agree with the register.
   ========================================================================== */
const PDC_ACC = { in: "1210", out: "2110" };
const PDC_CHARGES = "6450";
const PDC_STATUS = {
  in:  { hand: ["In hand", "info"], deposited: ["Deposited", "gold"], cleared: ["Cleared", "ok"], bounced: ["Bounced", "bad"], cancelled: ["Returned", ""] },
  out: { hand: ["Issued", "info"], deposited: ["Presented", "gold"], cleared: ["Cleared", "ok"], bounced: ["Bounced", "bad"], cancelled: ["Cancelled", ""] },
};
const PDC_REASONS = ["Insufficient funds", "Signature mismatch", "Account closed", "Payment stopped by drawer", "Date or amount discrepancy", "Other"];
const pdcEnd = (c) => (c.events || []).find((e) => e.type === "cleared" || e.type === "bounced" || e.type === "cancelled");
const pdcStatus = (c) => { const e = pdcEnd(c); if (e) return e.type; return (c.events || []).some((x) => x.type === "deposited") ? "deposited" : "hand"; };
const pdcOpen = (c) => ["hand", "deposited"].includes(pdcStatus(c));
/* Settles the customer/vendor balance as at a date: registered and not yet bounced or returned. */
const pdcSettles = (c, asOf) => c.date <= asOf && !(c.events || []).some((e) => (e.type === "bounced" || e.type === "cancelled") && e.date <= asOf);
function nextPdcNo(state, kind, date) {
  const y = (date || TODAY).slice(0, 4), pre = (kind === "in" ? "PDCR/" : "PDCI/") + y + "/";
  const n = (state.pdcs || []).filter((c) => c.number.startsWith(pre)).reduce((m, c) => Math.max(m, +c.number.slice(pre.length) || 0), 0);
  return pre + String(n + 1).padStart(4, "0");
}
function pdcEntries(state) {
  const out = [];
  (state.pdcs || []).forEach((c) => {
    const inb = c.kind === "in", acc = PDC_ACC[c.kind], amt = R2(+c.amount || 0);
    if (!(amt > 0)) return;
    const tag = `cheque ${c.chequeNo}${c.bank ? " · " + c.bank : ""}`;
    const push = (number, date, ref, lines) => out.push({ id: uid("e"), number, date, ref, journal: inb ? "Bank Receipts" : "Bank Payments",
      source: "pdc", pdcId: c.id, partner: c.partner, lines });
    push(c.number, c.date, (inb ? "Post-dated cheque received · " : "Post-dated cheque issued · ") + tag, inb
      ? [{ acc, debit: amt, credit: 0, label: `Cheque ${c.chequeNo} in hand` }, { acc: A.AR, debit: 0, credit: amt, label: "Settled by post-dated cheque", partner: c.partner }]
      : [{ acc: A.AP, debit: amt, credit: 0, label: "Settled by post-dated cheque", partner: c.partner }, { acc, debit: 0, credit: amt, label: `Cheque ${c.chequeNo} issued` }]);
    const e = pdcEnd(c); if (!e) return;
    const bank = e.account || c.account || A.BANK;
    if (e.type === "cleared") push(c.number + "/CLR", e.date, "Cheque cleared · " + tag, inb
      ? [{ acc: bank, debit: amt, credit: 0, label: `Cheque ${c.chequeNo} cleared` }, { acc, debit: 0, credit: amt, label: "Post-dated cheque cleared" }]
      : [{ acc, debit: amt, credit: 0, label: "Post-dated cheque cleared" }, { acc: bank, debit: 0, credit: amt, label: `Cheque ${c.chequeNo} paid` }]);
    else {
      const what = e.type === "bounced" ? "bounced" : inb ? "returned" : "cancelled";
      push(c.number + (e.type === "bounced" ? "/RTN" : "/CXL"), e.date, `Cheque ${what} · ${tag}${e.reason ? " · " + e.reason : ""}`, inb
        ? [{ acc: A.AR, debit: amt, credit: 0, label: `Cheque ${c.chequeNo} ${what} — balance due again`, partner: c.partner }, { acc, debit: 0, credit: amt, label: `Post-dated cheque ${what}` }]
        : [{ acc, debit: amt, credit: 0, label: `Post-dated cheque ${what}` }, { acc: A.AP, debit: 0, credit: amt, label: `Cheque ${c.chequeNo} ${what} — balance owed again`, partner: c.partner }]);
      const ch = R2(+e.charges || 0);
      if (ch > 0) push(c.number + "/CHG", e.date, "Returned cheque charges · " + tag,
        [{ acc: PDC_CHARGES, debit: ch, credit: 0, label: "Returned cheque charges" }, { acc: bank, debit: 0, credit: ch, label: "Bank charges" }]);
    }
  });
  return out;
}

/* ---------------------------------------------------------------- screen -- */
function PdcScreen({ state, setState, books, toast, create, go }) {
  const CO = useCo();
  const [tab, setTab] = useState("in");
  const [f, setF] = useState("open");
  const [q, setQ] = useState("");
  const [ed, setEd] = useState(null);
  const [act, setAct] = useState(null);
  const [view, setView] = useState(null);
  useCreate(create, (c) => { setTab(c.kind || "in"); setEd({ kind: c.kind || "in" }); });
  const all = (state.pdcs || []).filter((c) => c.kind === tab);
  const st = PDC_STATUS[tab];
  const week = addDays(TODAY, 7);
  const open = all.filter(pdcOpen);
  const sum = (l) => R2(l.reduce((s, c) => s + (+c.amount || 0), 0));
  const due7 = open.filter((c) => c.chequeDate >= TODAY && c.chequeDate <= week), late = open.filter((c) => c.chequeDate < TODAY);
  const bounced = all.filter((c) => pdcStatus(c) === "bounced" && (pdcEnd(c).date || "").slice(0, 4) === TODAY.slice(0, 4));
  const list = all.filter((c) => f === "all" || (f === "open" ? pdcOpen(c) : pdcStatus(c) === f))
    .filter((c) => hits(q, c.number, c.chequeNo, c.bank, PMAP[c.partner]?.name, c.memo, String(c.amount)))
    .sort((a, b) => (pdcOpen(a) && pdcOpen(b) ? a.chequeDate.localeCompare(b.chequeDate) : b.chequeDate.localeCompare(a.chequeDate)));
  /* Maturity calendar: past date, this week, then the next six weeks */
  const weeks = [{ l: "Past date", from: "0000-00-00", to: addDays(TODAY, -1) }, ...Array.from({ length: 7 }, (_, i) => ({ l: i === 0 ? "This week" : i === 1 ? "Next week" : `In ${i} weeks`, from: addDays(TODAY, i * 7), to: addDays(TODAY, i * 7 + 6) }))]
    .map((w) => ({ ...w, items: open.filter((c) => c.chequeDate >= w.from && c.chequeDate <= w.to) })).map((w) => ({ ...w, amt: sum(w.items) }));
  const peak = Math.max(1, ...weeks.map((w) => w.amt));
  const rel = (dte) => { const n = daysBetween(TODAY, dte); return n === 0 ? "today" : n > 0 ? `in ${n} day${n === 1 ? "" : "s"}` : `${-n} day${n === -1 ? "" : "s"} ago`; };
  const remove = (c) => { if (!window.confirm(`Delete ${c.number}? Its ledger entries are removed too.`)) return;
    setState((s) => ({ ...s, pdcs: (s.pdcs || []).filter((x) => x.id !== c.id) })); toast(`${c.number} deleted`); };
  const xlsx = () => {
    const head = [["Number", "Cheque no.", "Bank", tab === "in" ? "Customer" : "Vendor", "Against", tab === "in" ? "Received" : "Issued", "Cheque date", "Amount (AED)", "Status", "Status date"]];
    const body = list.map((c) => { const e = pdcEnd(c) || (c.events || []).slice(-1)[0];
      return [c.number, c.chequeNo, c.bank || (ACC[c.account]?.name || ""), PMAP[c.partner]?.name || "", docNo(state, c.doc), dmy(c.date), dmy(c.chequeDate), R2(+c.amount), st[pdcStatus(c)][0], e ? dmy(e.date) : ""]; });
    exportExcel(tab === "in" ? "Post-dated cheques received" : "Post-dated cheques issued", `As at ${dmy(TODAY)}`, CO, [{ head, body, bold: [] }], tab === "in" ? "pdc-received" : "pdc-issued");
    toast("Cheque register exported to Excel");
  };
  return <div className="pdc-page">
    <PageHead eyebrow="Banking" title="Post-dated cheques"
      sub="Every cheque from the day it arrives or leaves until it clears, bounces or is returned — with the ledger kept in step.">
      <Btn icon={FileSpreadsheet} onClick={xlsx} disabled={!list.length}>Excel</Btn>
      <Btn icon={ArrowUpRight} onClick={() => setEd({ kind: "out" })}>Issue cheque</Btn>
      <Btn kind="pri" icon={ArrowDownLeft} onClick={() => setEd({ kind: "in" })}>Receive cheque</Btn>
    </PageHead>
    <div className="pdc-tabs" role="tablist">
      {[["in", "Received from customers", ArrowDownLeft], ["out", "Issued to vendors", ArrowUpRight]].map(([k, l, I]) => (
        <button key={k} role="tab" aria-selected={tab === k} className={cx(tab === k && "on")} onClick={() => { setTab(k); setF("open"); }}>
          <I size={15} />{l}<span className="ct">{(state.pdcs || []).filter((c) => c.kind === k && pdcOpen(c)).length}</span></button>))}
    </div>
    <div className="pdc-kpis">
      <div className="pdc-kpi"><span>{tab === "in" ? "Cheques in hand" : "Issued, not yet cleared"}</span><b className="num">{money(sum(open), false)}</b><small>{open.length} cheque{open.length === 1 ? "" : "s"}</small></div>
      <div className="pdc-kpi"><span>Maturing in 7 days</span><b className="num">{money(sum(due7), false)}</b><small>{due7.length} cheque{due7.length === 1 ? "" : "s"}</small></div>
      <div className={cx("pdc-kpi", late.length && "warn")}><span>{tab === "in" ? "Past date — deposit now" : "Past date — not yet presented"}</span><b className="num">{money(sum(late), false)}</b><small>{late.length} cheque{late.length === 1 ? "" : "s"}</small></div>
      <div className={cx("pdc-kpi", bounced.length && "bad")}><span>Bounced this year</span><b className="num">{money(sum(bounced), false)}</b><small>{bounced.length} cheque{bounced.length === 1 ? "" : "s"}</small></div>
    </div>
    {open.length > 0 && <Card title="Maturity calendar" sub="Open cheques by cheque date · AED" className="pdc-cal-card">
      <div className="pdc-cal">{weeks.map((w) => <div key={w.l} className={cx("wk", w.l === "Past date" && w.items.length && "late")} title={`${w.items.length} cheque(s) · AED ${money(w.amt, false)}`}>
        <div className="bar"><i style={{ height: Math.max(w.amt ? 6 : 0, (w.amt / peak) * 100) + "%" }} /></div>
        <b className="num">{w.amt ? money(w.amt, false) : "—"}</b><span>{w.l}</span><small>{w.items.length || ""}</small></div>)}</div></Card>}
    <Card pad={false}>
      <div className="doc-filterbar">
        <SearchBox value={q} onChange={setQ} width={300} placeholder="Search cheque no., bank, party or amount" />
        <div className="seg">{[["open", "Open"], ["all", "All"], ["cleared", "Cleared"], ["bounced", "Bounced"], ["cancelled", st.cancelled[0]]].map(([k, l]) =>
          <button key={k} className={cx(f === k && "on")} onClick={() => setF(k)}>{l}</button>)}</div>
        <span className="pdc-count">{list.length} of {all.length}</span>
      </div>
      <div className="tbl-wrap"><table className="tbl pdc-tbl">
        <thead><tr><th>Cheque</th><th>{tab === "in" ? "Customer" : "Vendor"}</th><th>Against</th><th>{tab === "in" ? "Received" : "Issued"}</th><th>Cheque date</th><th className="n">Amount</th><th>Status</th><th /></tr></thead>
        <tbody>{list.map((c) => { const s = pdcStatus(c), e = pdcEnd(c), isOpen = pdcOpen(c);
          return <tr key={c.id} className="click" onClick={() => setView(c)}>
            <td><b className="mono">{c.chequeNo}</b><small className="subtext">{c.bank || ACC[c.account]?.name || "—"} · {c.number}</small></td>
            <td>{PMAP[c.partner]?.name || "—"}</td>
            <td className="mono">{docNo(state, c.doc) || <span className="muted">Oldest open</span>}</td>
            <td>{dmy(c.date)}</td>
            <td><b>{dmy(c.chequeDate)}</b><small className={cx("subtext", isOpen && c.chequeDate < TODAY && "neg")}>{isOpen ? rel(c.chequeDate) : e ? `${st[s][0]} ${dmy(e.date)}` : ""}</small></td>
            <td className="n num"><b>{money(+c.amount, false)}</b></td>
            <td><Pill tone={st[s][1]} dot>{st[s][0]}</Pill></td>
            <td className="n" onClick={(ev) => ev.stopPropagation()}><div className="pdc-acts">
              {tab === "in" && s === "hand" && <Btn size="sm" onClick={() => setAct({ c, type: "deposited" })}>Deposit</Btn>}
              {isOpen && <Btn size="sm" kind={s === "deposited" || tab === "out" ? "pri" : undefined} onClick={() => setAct({ c, type: "cleared" })}>Clear</Btn>}
              {isOpen && <Btn size="sm" onClick={() => setAct({ c, type: "bounced" })}>Bounce</Btn>}
              {s === "hand" && <Btn size="sm" onClick={() => setAct({ c, type: "cancelled" })}>{tab === "in" ? "Return" : "Cancel"}</Btn>}
              {s === "bounced" && !c.replacedBy && <Btn size="sm" icon={RotateCcw} onClick={() => setEd({ kind: c.kind, partner: c.partner, doc: c.doc, amount: c.amount, bank: c.bank, account: c.account, replaces: c.id })}>Replace</Btn>}
              {s === "hand" && !(c.events || []).length && <button className="icon-btn" title={"Delete " + c.number} aria-label={"Delete " + c.number} onClick={() => remove(c)}><Trash2 size={14} /></button>}
            </div></td></tr>; })}
          {!list.length && <tr><td colSpan="8"><EmptyState icon={CalendarClock} title={all.length ? "No cheques match" : tab === "in" ? "No post-dated cheques received yet" : "No post-dated cheques issued yet"}>
            {all.length ? "Try another filter or search." : tab === "in" ? "Record a customer's cheque with Receive cheque. It settles their balance now and reaches the bank when it clears." : "Record a cheque you have given a vendor with Issue cheque."}</EmptyState></td></tr>}
        </tbody></table></div>
    </Card>
    {ed && <PdcDialog state={state} setState={setState} toast={toast} init={ed} close={() => setEd(null)} onSaved={(c) => setTab(c.kind)} />}
    {act && <PdcActionDialog state={state} setState={setState} toast={toast} c={act.c} type={act.type} close={() => setAct(null)} />}
    {view && <PdcDetail state={state} books={books} c={(state.pdcs || []).find((x) => x.id === view.id) || view} close={() => setView(null)} />}
  </div>;
}
const docNo = (state, id) => (id && (state.docs.find((d) => d.id === id) || {}).number) || "";

/* New or replacement cheque. Used by the PDC screen and from an invoice or bill. */
function PdcDialog({ state, setState, toast, init, close, onSaved }) {
  const kind = init.kind || "in", side = kind === "in" ? "sale" : "purchase";
  const banks = ACCOUNTS.filter((a) => a.type === "bank");
  const [r, setR] = useState(() => ({ id: uid("pdc"), kind, partner: init.partner || "", doc: init.doc || "", chequeNo: "", bank: init.bank || "",
    account: init.account || (kind === "out" ? (banks.find((b) => b.code === A.BANK) || banks[0] || {}).code : ""), chequeDate: "", date: TODAY,
    amount: init.amount != null ? String(init.amount) : "", memo: "", replaces: init.replaces || "" }));
  const [err, setErr] = useState("");
  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const openDocs = r.partner ? ((aging(state, kind === "in" ? "receivable" : "payable", TODAY).rows.find((x) => x.partner.id === r.partner) || { items: [] }).items) : [];
  const save = () => {
    const amt = R2(+r.amount);
    if (!PMAP[r.partner]) return setErr(`Choose the ${kind === "in" ? "customer" : "vendor"}.`);
    if (!String(r.chequeNo).trim()) return setErr("Enter the cheque number.");
    if (!r.chequeDate) return setErr("Enter the date written on the cheque.");
    if (!r.date) return setErr(`Enter the date the cheque was ${kind === "in" ? "received" : "issued"}.`);
    if (!(amt > 0)) return setErr("Enter the cheque amount.");
    if ((state.pdcs || []).some((c) => c.kind === kind && c.partner === r.partner && String(c.chequeNo).trim() === String(r.chequeNo).trim() && (c.bank || "") === (r.bank || "") && c.id !== r.replaces && pdcStatus(c) !== "cancelled"))
      return setErr("This cheque number is already recorded for this party.");
    const rec = { ...r, chequeNo: String(r.chequeNo).trim(), bank: r.bank.trim(), amount: amt, number: nextPdcNo(state, kind, r.date), events: [] };
    if (!rec.doc) delete rec.doc; if (!rec.replaces) delete rec.replaces;
    setState((s) => ({ ...s, pdcs: [...(s.pdcs || []).map((c) => (c.id === rec.replaces ? { ...c, replacedBy: rec.id } : c)), rec] }));
    toast(`${rec.number} recorded — cheque ${rec.chequeNo} for AED ${money(amt, false)}`);
    onSaved && onSaved(rec); close();
  };
  return <StudioModal title={init.replaces ? "Replacement cheque" : kind === "in" ? "Receive post-dated cheque" : "Issue post-dated cheque"}
    sub={kind === "in" ? "Settles the customer's balance now; the money reaches your bank when the cheque clears." : "Settles what you owe now; your bank pays when the cheque is presented."} close={close}>
    <div className="studio-form">
      <Field label={kind === "in" ? "Customer" : "Vendor"} span={2}><SmartPicker label={kind === "in" ? "Cheque customer" : "Cheque vendor"} items={partnerOptions(side)} value={r.partner}
        placeholder={`Search ${kind === "in" ? "customers" : "vendors"}…`} onChange={(pid) => setR((x) => ({ ...x, partner: pid, doc: "" }))} /></Field>
      <Field label={kind === "in" ? "Against invoice" : "Against bill"} span={2}>
        <Select value={r.doc} onChange={(e) => { const it = openDocs.find((d) => d.id === e.target.value); setR((x) => ({ ...x, doc: e.target.value, amount: it && !x.amount ? String(it.open) : x.amount })); }} disabled={!r.partner}>
          <option value="">Oldest open {kind === "in" ? "invoice" : "bill"} first</option>
          {openDocs.map((d) => <option key={d.id} value={d.id}>{d.number} · due {dmy(d.due)} · AED {money(d.open, false)} open</option>)}
        </Select></Field>
      <Field label="Cheque number"><Input value={r.chequeNo} onChange={(e) => set("chequeNo", e.target.value)} placeholder="e.g. 000245" /></Field>
      {kind === "in" ? <Field label="Drawn on bank"><Input value={r.bank} onChange={(e) => set("bank", e.target.value)} placeholder="Customer's bank, e.g. Emirates NBD" /></Field>
        : <Field label="Paid from"><Select value={r.account} onChange={(e) => set("account", e.target.value)}>{banks.map((b) => <option key={b.code} value={b.code}>{b.code} · {b.name}</option>)}</Select></Field>}
      <Field label="Cheque date (maturity)"><Input type="date" value={r.chequeDate} onChange={(e) => set("chequeDate", e.target.value)} /></Field>
      <Field label={kind === "in" ? "Received on" : "Issued on"}><Input type="date" value={r.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label="Amount · AED"><Input n type="number" min="0" step="0.01" placeholder="Enter amount" value={r.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
      <Field label="Memo"><Input value={r.memo} onChange={(e) => set("memo", e.target.value)} placeholder="Optional note" /></Field>
    </div>
    <div className="pdc-ledger-note"><BookOpen size={15} /><span>{kind === "in"
      ? <>Posts <b>Dr {PDC_ACC.in} {ACC[PDC_ACC.in]?.name || "Post-dated cheques received"}</b> · <b>Cr {A.AR} Accounts receivable</b> on the received date.</>
      : <>Posts <b>Dr {A.AP} Accounts payable</b> · <b>Cr {PDC_ACC.out} {ACC[PDC_ACC.out]?.name || "Post-dated cheques issued"}</b> on the issue date.</>}</span></div>
    {err && <div role="alert" className="form-error">{err}</div>}
    <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind="pri" icon={Check} onClick={save}>Record cheque</Btn></footer>
  </StudioModal>;
}

function PdcActionDialog({ state, setState, toast, c, type, close }) {
  const banks = ACCOUNTS.filter((a) => a.type === "bank");
  const dep = (c.events || []).find((e) => e.type === "deposited");
  const first = c.chequeDate > TODAY ? c.chequeDate : TODAY;
  const [r, setR] = useState({ date: type === "cancelled" || type === "bounced" ? TODAY : first, account: (dep && dep.account) || c.account || (banks.find((b) => b.code === A.BANK) || banks[0] || {}).code, reason: PDC_REASONS[0], charges: "", note: "" });
  const [err, setErr] = useState("");
  const inb = c.kind === "in", L = PDC_STATUS[c.kind];
  const title = { deposited: "Deposit cheque", cleared: "Cheque cleared", bounced: "Cheque bounced", cancelled: inb ? "Return cheque" : "Cancel cheque" }[type];
  const save = () => {
    if (!r.date) return setErr("Enter the date.");
    if (r.date < c.date) return setErr(`The date can't be before the cheque was ${inb ? "received" : "issued"} (${dmy(c.date)}).`);
    if ((type === "deposited" || type === "cleared") && r.date < c.chequeDate) return setErr(`A post-dated cheque can't be presented before its date (${dmy(c.chequeDate)}).`);
    if (dep && type !== "deposited" && r.date < dep.date) return setErr(`The date can't be before the deposit (${dmy(dep.date)}).`);
    if (+r.charges < 0) return setErr("Bank charges can't be negative.");
    const ev = { type, date: r.date, ...(type !== "cancelled" ? { account: r.account } : {}), ...(type === "bounced" ? { reason: r.reason, charges: R2(+r.charges || 0) } : {}), ...(r.note ? { note: r.note } : {}) };
    setState((s) => ({ ...s, pdcs: (s.pdcs || []).map((x) => (x.id === c.id ? { ...x, events: [...(x.events || []), ev] } : x)) }));
    toast(`${c.number} · cheque ${c.chequeNo} ${L[type][0].toLowerCase()}`, type === "bounced" ? "warn" : undefined); close();
  };
  return <StudioModal title={`${title} · ${c.chequeNo}`} sub={`${PMAP[c.partner]?.name || ""} · AED ${money(+c.amount, false)} · cheque date ${dmy(c.chequeDate)}`} close={close}>
    <div className="studio-form">
      <Field label="Date"><Input type="date" value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} /></Field>
      {type !== "cancelled" && <Field label={inb ? (type === "deposited" ? "Deposited into" : "Bank account") : "Paid from"}>
        <Select value={r.account} onChange={(e) => setR({ ...r, account: e.target.value })}>{banks.map((b) => <option key={b.code} value={b.code}>{b.code} · {b.name}</option>)}</Select></Field>}
      {type === "bounced" && <><Field label="Reason"><Select value={r.reason} onChange={(e) => setR({ ...r, reason: e.target.value })}>{PDC_REASONS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Bank charges · AED (optional)"><Input n type="number" min="0" step="0.01" placeholder="0.00" value={r.charges} onChange={(e) => setR({ ...r, charges: e.target.value })} /></Field></>}
      <Field label="Note" span={2}><Input value={r.note} onChange={(e) => setR({ ...r, note: e.target.value })} placeholder="Optional" /></Field>
    </div>
    <div className="pdc-ledger-note"><BookOpen size={15} /><span>{type === "deposited" ? "Recorded in the register only — the ledger moves when the bank clears the cheque."
      : type === "cleared" ? (inb ? <>Posts <b>Dr bank</b> · <b>Cr {PDC_ACC.in}</b>. The money is now in the bank.</> : <>Posts <b>Dr {PDC_ACC.out}</b> · <b>Cr bank</b>.</>)
      : inb ? <>Posts <b>Dr {A.AR} Accounts receivable</b> · <b>Cr {PDC_ACC.in}</b> — the invoice is open again{type === "bounced" ? <>; bank charges post to {PDC_CHARGES}</> : null}.</>
      : <>Posts <b>Dr {PDC_ACC.out}</b> · <b>Cr {A.AP} Accounts payable</b> — the bill is open again.</>}</span></div>
    {err && <div role="alert" className="form-error">{err}</div>}
    <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind={type === "bounced" ? "danger" : "pri"} icon={Check} onClick={save}>{title}</Btn></footer>
  </StudioModal>;
}

function PdcDetail({ state, books, c, close }) {
  const L = PDC_STATUS[c.kind], s = pdcStatus(c);
  const steps = [{ type: c.kind === "in" ? "received" : "issued", date: c.date }, ...(c.events || [])];
  const label = (t) => ({ received: "Received", issued: "Issued", deposited: c.kind === "in" ? "Deposited" : "Presented", cleared: "Cleared", bounced: "Bounced", cancelled: c.kind === "in" ? "Returned to customer" : "Cancelled" }[t]);
  const entries = books.entries.filter((e) => e.pdcId === c.id);
  const rep = c.replacedBy && (state.pdcs || []).find((x) => x.id === c.replacedBy), was = c.replaces && (state.pdcs || []).find((x) => x.id === c.replaces);
  return <StudioModal wide title={`Cheque ${c.chequeNo}`} sub={`${c.number} · ${PMAP[c.partner]?.name || ""} · AED ${money(+c.amount, false)}`} close={close}>
    <div className="pdc-detail">
      <div className="pdc-facts">
        {[["Status", <Pill tone={L[s][1]} dot>{L[s][0]}</Pill>], ["Cheque date", dmy(c.chequeDate)], [c.kind === "in" ? "Drawn on" : "Paid from", c.bank || ACC[c.account]?.name || "—"],
          ["Against", docNo(state, c.doc) || "Oldest open"], ...(was ? [["Replaces", `${was.number} · ${was.chequeNo}`]] : []), ...(rep ? [["Replaced by", `${rep.number} · ${rep.chequeNo}`]] : []), ...(c.memo ? [["Memo", c.memo]] : [])]
          .map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
      </div>
      <div className="tl">{steps.map((e, i) => <div key={i} className="tl-row done"><span className="dot"><i /></span><span className="tt"><b>{label(e.type)} · {dmy(e.date)}</b>
        <span>{[e.account && ACC[e.account] ? ACC[e.account].name : "", e.reason, +e.charges ? `Charges AED ${money(+e.charges, false)}` : "", e.note].filter(Boolean).join(" · ")}</span></span></div>)}</div>
      {entries.length > 0 && <div className="pdc-entries"><div className="micro">Ledger entries</div>
        <table className="tbl"><thead><tr><th>Entry</th><th>Date</th><th>Account</th><th className="n">Debit</th><th className="n">Credit</th></tr></thead>
          <tbody>{entries.flatMap((e) => e.lines.map((l, i) => <tr key={e.id + i}><td className="mono">{i ? "" : e.number}</td><td>{i ? "" : dmy(e.date)}</td>
            <td>{l.acc} · {ACC[l.acc]?.name}</td><td className="n num">{l.debit ? money(l.debit, false) : ""}</td><td className="n num">{l.credit ? money(l.credit, false) : ""}</td></tr>))}</tbody></table></div>}
    </div>
  </StudioModal>;
}

/* Dashboard reminder: cheques to deposit or that leave the bank soon. */
function PdcReminder({ state, go }) {
  const open = (state.pdcs || []).filter(pdcOpen), week = addDays(TODAY, 7);
  const soon = open.filter((c) => c.chequeDate <= week);
  if (!soon.length) return null;
  const inn = soon.filter((c) => c.kind === "in"), out = soon.filter((c) => c.kind === "out");
  const s = (l) => money(l.reduce((t, c) => t + +c.amount, 0), false);
  return <button className="pdc-remind" onClick={() => go("pdc")}>
    <span className="ic"><CalendarClock size={18} /></span>
    <span className="t"><b>Post-dated cheques need attention this week</b>
      <span>{inn.length ? `${inn.length} received (AED ${s(inn)}) to deposit` : ""}{inn.length && out.length ? " · " : ""}{out.length ? `${out.length} issued (AED ${s(out)}) will be presented` : ""}</span></span>
    <ChevronRight size={16} /></button>;
}

const PDC_CSS = `
.pdc-tabs{display:inline-flex;gap:4px;padding:4px;border-radius:12px;background:var(--surface);border:1px solid var(--line);margin-bottom:16px}
.pdc-tabs button{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:9px;font-size:13px;font-weight:500;color:var(--ink-2)}
.pdc-tabs button.on{background:linear-gradient(180deg,#323840,#1C2026);color:#fff;box-shadow:0 2px 8px rgba(16,18,22,.18)}
.mz[data-theme="dark"] .pdc-tabs button.on{background:linear-gradient(180deg,#F5F6F8,#CBD0D6);color:#14171B}
.pdc-tabs .ct{font-family:var(--mono);font-size:11px;padding:1px 7px;border-radius:20px;background:var(--surface-3);color:var(--ink-2)}
.pdc-tabs button.on .ct{background:rgba(255,255,255,.18);color:inherit}
.pdc-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.pdc-kpi{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;box-shadow:var(--sh-1);position:relative;overflow:hidden}
.pdc-kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#C9CED4,#6A7480)}
.pdc-kpi.warn::before{background:var(--warn)}.pdc-kpi.bad::before{background:var(--neg)}
.pdc-kpi span{display:block;font-size:12px;color:var(--ink-3)}
.pdc-kpi b{display:block;font-size:21px;font-weight:600;letter-spacing:-.03em;margin-top:6px}
.pdc-kpi small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:3px}
.pdc-kpi.warn b{color:var(--warn)}.pdc-kpi.bad b{color:var(--neg)}
.pdc-cal-card{margin-bottom:16px}
.pdc-cal{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px;align-items:end}
.pdc-cal .wk{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;min-width:0}
.pdc-cal .bar{height:70px;width:100%;max-width:46px;display:flex;align-items:flex-end;border-radius:8px;background:var(--surface-2);overflow:hidden}
.pdc-cal .bar i{display:block;width:100%;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#9AA2AC,#3E444C)}
.mz[data-theme="dark"] .pdc-cal .bar i{background:linear-gradient(180deg,#E6E9ED,#6A7480)}
.pdc-cal .wk.late .bar i{background:linear-gradient(180deg,#F0B35A,var(--warn))}
.pdc-cal .wk b{font-size:12px}.pdc-cal .wk span{font-size:11px;color:var(--ink-3)}.pdc-cal .wk small{font-size:10.5px;color:var(--ink-4);min-height:13px}
.doc-filterbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--line-2)}
.pdc-count{margin-left:auto;font-size:12.5px;color:var(--ink-3)}
.pdc-acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
.pdc-tbl td{vertical-align:middle}
.pdc-ledger-note{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line-2);font-size:12.5px;color:var(--ink-2);line-height:1.5}
.pdc-ledger-note svg{flex:0 0 auto;margin-top:2px;color:var(--ink-3)}
.pdc-detail{display:grid;gap:18px}
.pdc-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.pdc-facts>div{padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line-2)}
.pdc-facts>div>span{display:block;font-size:11px;color:var(--ink-3);margin-bottom:4px}.pdc-facts b{font-size:13px;font-weight:600}.pdc-facts .pill{display:inline-flex;width:auto}
.pdc-entries .micro{margin-bottom:8px}
.pdc-remind{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:14px 18px;margin-bottom:18px;border-radius:14px;
  background:linear-gradient(100deg,#FFF8EA,var(--surface) 70%);border:1px solid #F1DDB0;box-shadow:var(--sh-1)}
.mz[data-theme="dark"] .pdc-remind{background:linear-gradient(100deg,#2E2716,var(--surface) 70%);border-color:#4A3D1E}
.pdc-remind .ic{width:38px;height:38px;flex:0 0 38px;border-radius:11px;display:grid;place-items:center;background:#F7E7C2;color:#8A5F0E}
.pdc-remind .t{flex:1;min-width:0}.pdc-remind b{display:block;font-size:13.5px}.pdc-remind .t span{display:block;font-size:12.5px;color:var(--ink-3);margin-top:2px}
@media (max-width:900px){.pdc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pdc-cal{grid-template-columns:repeat(4,minmax(0,1fr))}.pdc-tabs{display:flex;width:100%}.pdc-tabs button{flex:1;justify-content:center;padding:0 8px;font-size:12px}}
`;
