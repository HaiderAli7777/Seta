/* ============================================================================
   3.11 — one-piece document header and purchase-order approval.
   · DocUnit puts a document's identity, status, progress, actions and its
     fields in one card, so a form reads as a single unit. Everyday actions
     stay on the bar; rare ones sit behind More.
   · Purchase orders need one sign-off. Any active user marked as a purchase
     approver can approve or reject an order; with two or more approvers, any
     one of them is enough. Whoever raised an order cannot approve it while
     another approver exists. With no approvers set up, orders are confirmed
     directly.
   ========================================================================== */

const activeApprovers = (users) => (users || []).filter((u) => u.active !== false && u.approver);
const userName = (users, id) => ((users || []).find((u) => u.id === id) || {}).name || "a former user";
/* "A", "A or B", "A, B or C" */
const orList = (names) => names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " or " + names[names.length - 1];

/* Who may do what on a purchase order. */
function poRights(d, user, users) {
  const appr = activeApprovers(users);
  const none = appr.length === 0;
  const me = user && user.id ? user : null;
  const isApprover = !!(me && me.approver && me.active !== false);
  const raisedBy = d.requestedBy || (me ? me.id : null);
  const own = !!(me && raisedBy === me.id);
  const others = appr.filter((u) => u.id !== raisedBy);
  const canApprove = none || (isApprover && (!own || others.length === 0));
  return { appr, none, isApprover, own, canApprove, others,
    /* raising an order the current user may also approve skips the queue */
    directly: none || (isApprover && others.length === 0),
    waitingOn: others.length ? others : appr };
}

/* Each step on a purchase order is kept, with who did it and when. */
const poLog = (d, act, user, note) => ({ ...d, history: [...(d.history || []),
  { at: new Date().toISOString(), day: TODAY, by: user ? user.id : null, name: user ? user.name : "", act, note: note || "" }] });
const PO_ACT = {
  submitted: "Submitted for approval", approved: "Approved", confirmed: "Confirmed — no approver set up",
  rejected: "Rejected", withdrawn: "Withdrawn for changes", revised: "Reopened for changes",
  sent: "Sent to the vendor", billed: "Converted to a bill",
};
const lastAct = (d, act) => (d.history || []).filter((h) => h.act === act).pop();
const stampText = (h) => h ? [h.name, h.day ? dmy(h.day) : ""].filter(Boolean).join(" · ") : "";

/* Purchase orders waiting on this user's approval. */
function awaitingMe(state, user) {
  if (!user || !user.id) return [];
  const users = state.users || SEED_USERS;
  if (!activeApprovers(users).length) return [];
  return state.docs.filter((d) => d.type === "purchase_order" && d.state === "pending" && poRights(d, user, users).canApprove);
}

/* Dashboard reminder for approvers. */
function ApprovalInbox({ state, user, go }) {
  const mine = awaitingMe(state, user);
  if (!mine.length) return null;
  const users = state.users || SEED_USERS;
  const total = R2(mine.reduce((s, d) => s + amounts(d).total, 0));
  return <section className="appr-inbox" aria-label="Awaiting your approval">
    <header>
      <span className="ai-ico"><ClipboardCheck size={18} strokeWidth={1.9} /></span>
      <div><b>{mine.length} purchase {mine.length === 1 ? "order is" : "orders are"} waiting for your approval</b>
        <span>AED {money(total, false)} in total{activeApprovers(users).length > 1 ? " · any one approver can sign off" : ""}</span></div>
      <Btn size="sm" onClick={() => go("purchase_orders", "__pending__")}>Review all</Btn>
    </header>
    <div className="ai-list">{mine.slice(0, 4).map((d) => { const sub = lastAct(d, "submitted"); const days = sub && sub.day ? daysBetween(sub.day, TODAY) : 0;
      return <button key={d.id} onClick={() => go("purchase_orders", d.id)}>
        <span className="mono">{d.number}</span>
        <span className="ai-v">{(PMAP[d.partner] || {}).name || "No vendor"}<small>Raised by {userName(users, d.requestedBy)} · {days > 0 ? `waiting ${days} ${days === 1 ? "day" : "days"}` : "today"}</small></span>
        <b>{money(amounts(d).total, false)}</b><ChevronRight size={15} />
      </button>; })}</div>
  </section>;
}

/* Rarely used actions live behind one button. */
function MoreMenu({ items, label = "More" }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    requestAnimationFrame(() => ref.current && ref.current.querySelector('[role="menuitem"]') && ref.current.querySelector('[role="menuitem"]').focus());
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const list = items.filter(Boolean);
  if (!list.filter((x) => !x.sep).length) return null;
  const key = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = [...ref.current.querySelectorAll('[role="menuitem"]')], i = all.indexOf(document.activeElement);
    const n = all[(i + (e.key === "ArrowDown" ? 1 : all.length - 1)) % all.length]; n && n.focus();
  };
  return <div className="du-more" ref={ref}>
    <button className="btn du-more-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      <MoreHorizontal size={15} strokeWidth={2} />{label}</button>
    {open && <div className="du-menu" role="menu" onKeyDown={key}>{list.map((it, i) => it.sep
      ? (i > 0 && i < list.length - 1 ? <div key={"s" + i} className="du-sep" role="separator" /> : null)
      : <button key={it.label} role="menuitem" className={cx(it.danger && "danger")} disabled={it.disabled}
          onClick={() => { setOpen(false); it.onClick(); }}>
          {it.icon && <it.icon size={15} strokeWidth={1.9} />}<span><b>{it.label}</b>{it.hint && <small>{it.hint}</small>}</span></button>)}
    </div>}
  </div>;
}

/* Where a document is in its life: Draft → … → Paid / Billed. */
function DocSteps({ steps }) {
  return <ol className="du-steps" aria-label="Progress">{steps.map((s, i) => (
    <li key={i} className={cx("ds", s.state)} aria-current={s.state === "now" || s.state === "wait" ? "step" : undefined}>
      <i>{s.state === "done" ? <Check size={11} strokeWidth={3.2} /> : s.state === "bad" ? <X size={11} strokeWidth={3.2} /> : i + 1}</i>
      <span>{s.label}</span></li>))}</ol>;
}

/* The document header, progress bar, actions and fields as one card. */
function DocUnit({ back, backLabel, kind, number, status, pills, sub, total, totalLabel, totalSub, totalTone, progress, actions, note, children }) {
  return <section className="doc-unit">
    <div className="du-main">
      <div className="du-id">
        <div className="du-crumb">
          <button className="du-back" onClick={back} title={backLabel}><ArrowLeft size={14} strokeWidth={2} />{backLabel}</button>
          <span className="micro du-kind">{kind}</span></div>
        <h1><span className="du-no">{number}</span>{status}{pills}</h1>
        {sub && <div className="du-sub">{sub}</div>}
      </div>
      <div className="du-amt"><small>{totalLabel}</small><b>{total}</b>{totalSub && <span className={totalTone || ""}>{totalSub}</span>}</div>
    </div>
    <div className="du-bar">
      <div className="du-prog">{progress}</div>
      <div className="du-acts">{actions}</div>
    </div>
    {note}
    <div className="du-body">{children}</div>
  </section>;
}

/* What the approval rule means for this order, in one line. */
function PoNote({ d, rights, users, go }) {
  if (!rights) return null;
  const names = (l) => orList(l.map((u) => u.name));
  let tone = "info", I = Info, body = null;
  if (d.state === "draft" || d.state === "rejected") {
    const rej = d.state === "rejected" && lastAct(d, "rejected");
    if (rej) { tone = "bad"; I = CircleAlert;
      body = <>Rejected by <b>{rej.name || "an approver"}</b>{rej.day ? ` on ${dmy(rej.day)}` : ""}{rej.note ? <>: “{rej.note}”</> : ""}. Change the order and submit it again.</>; }
    else if (rights.none) body = <>No purchase approvers are set up, so this order is confirmed straight away. To require a sign-off, turn on <b>Can approve purchase orders</b> for a user in <button className="linkish" onClick={() => go("users")}>Users &amp; access</button></>;
    else if (rights.directly) body = <>You are the only purchase approver, so you can approve this order yourself.</>;
    else body = <>When you submit, <b>{names(rights.waitingOn)}</b> can approve it{rights.waitingOn.length > 1 ? " — any one of them is enough" : ""}.</>;
  } else if (d.state === "pending") {
    tone = "gold"; I = Clock;
    const sub = lastAct(d, "submitted");
    body = <>Waiting for approval from <b>{names(rights.waitingOn)}</b>{rights.waitingOn.length > 1 ? " — any one can approve" : ""}. Raised by {userName(users, d.requestedBy)}{sub && sub.day ? ` on ${dmy(sub.day)}` : ""}.
      {rights.canApprove ? " You can approve or reject it." : rights.own ? " Withdraw it if you need to make changes." : ""}</>;
  } else if (d.state === "approved" || d.state === "sent") {
    tone = "ok"; I = CircleCheck;
    const ok = lastAct(d, "approved") || lastAct(d, "confirmed"), sent = d.state === "sent" && lastAct(d, "sent");
    body = <>{ok && ok.act === "confirmed" ? "Confirmed" : "Approved"} by <b>{ok ? ok.name || "an approver" : "an approver"}</b>{ok && ok.day ? ` on ${dmy(ok.day)}` : ""}.
      {sent ? ` Sent to the vendor on ${dmy(sent.day)}.` : " Send it to the vendor, then convert it to a bill when their invoice arrives."}</>;
  } else if (d.state === "billed") {
    tone = "ok"; I = CircleCheck;
    const b = lastAct(d, "billed");
    body = <>Converted to bill {d.billId ? <button className="linkish" onClick={() => go("bills", d.billId)}>{b && b.note ? b.note : "open the bill"}</button> : b && b.note}{b && b.day ? ` on ${dmy(b.day)}` : ""}. Nothing posts to the ledger until that bill is posted.</>;
  }
  if (!body) return null;
  return <div className={cx("du-note", tone)} role="note"><I size={16} strokeWidth={1.9} /><span>{body}</span></div>;
}

/* Rejecting asks for a reason, so the requester knows what to change. */
function RejectDialog({ d, close, reject }) {
  const [why, setWhy] = useState("");
  return <StudioModal title={`Reject ${d.number}`} sub="The person who raised the order sees this reason" close={close}>
    <Field label="Reason for rejecting">
      <textarea className="inp" rows={3} value={why} placeholder="e.g. Price is above the agreed rate — ask for a revised quote"
        onChange={(e) => setWhy(e.target.value)} /></Field>
    <div className="du-dlg-acts"><Btn onClick={close}>Cancel</Btn>
      <Btn kind="danger" icon={X} disabled={why.trim().length < 3} onClick={() => reject(why.trim())}>Reject order</Btn></div>
  </StudioModal>;
}

/* The approval switch on the user form. */
function ApproverToggle({ value, onChange }) {
  return <label className={cx("appr-toggle", value && "on")}>
    <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    <span className="at-ico"><ClipboardCheck size={17} strokeWidth={1.9} /></span>
    <span className="at-t"><b>Can approve purchase orders</b>
      <span>Approves or rejects orders raised by others. With two or more approvers, any one of them can sign off.</span></span>
    <span className="at-sw" aria-hidden="true"><i /></span>
  </label>;
}

const APPROVAL_CSS = `
/* one-piece document header */
.mz .doc-unit{background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh-1);position:relative;margin-top:8px;min-width:0;max-width:100%}
.du-main{display:flex;align-items:flex-start;gap:18px;padding:14px 20px 13px}
.du-id{flex:1;min-width:0}
.du-crumb{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.mz .du-back{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px 0 6px;border-radius:7px;font-size:11.5px;font-weight:600;color:var(--brand-600);background:var(--brand-50);border:1px solid transparent;transition:border-color .15s}
.mz .du-back:hover{border-color:var(--brand-100)}
.mz .du-crumb .micro{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);font-weight:650;margin:0}
.mz .du-id h1{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;font-size:23px;font-weight:650;letter-spacing:-.02em;line-height:1.2;margin:0;color:var(--ink)}
.du-no{font-variant-numeric:tabular-nums}
.du-sub{display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px;margin-top:6px;font-size:12.5px;color:var(--ink-3)}
.du-sub>span{display:inline-flex;align-items:center;gap:5px;min-width:0}
.du-sub b{color:var(--ink-2);font-weight:600}
.du-sub svg{color:var(--ink-4)}
.du-sub .linkish{font-weight:600}
.du-amt{text-align:right;flex:0 0 auto;padding-left:20px;border-left:1px solid var(--line-2);min-width:150px}
.du-amt small{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);font-weight:650}
.du-amt b{display:block;font-size:24px;font-weight:650;letter-spacing:-.02em;margin-top:4px;font-variant-numeric:tabular-nums;color:var(--ink)}
.du-amt span{display:block;font-size:11.5px;color:var(--ink-3);margin-top:2px}
.du-amt span.due{color:var(--neg);font-weight:600}
.du-amt span.paid{color:var(--pos);font-weight:600}
.du-bar{display:flex;align-items:center;justify-content:space-between;gap:10px 14px;flex-wrap:wrap;padding:8px 14px 8px 20px;background:var(--surface-2);border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2)}
.du-prog{min-width:0;max-width:100%;display:flex;align-items:center;gap:10px}
.du-prog>.du-steps{min-width:0;flex:1 1 auto}
.du-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto;justify-content:flex-end}
.mz .du-acts .btn{height:34px;padding:0 13px;font-size:12px}
.mz .du-acts .btn.pri{padding:0 16px}
.du-body{padding:14px 20px 16px}
.mz .doc-unit .document-fields{gap:9px 14px!important}

/* progress */
.du-steps{display:flex;align-items:center;list-style:none;margin:0;padding:0;overflow-x:auto;scrollbar-width:none}
.du-steps::-webkit-scrollbar{display:none}
.du-steps li{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink-3);white-space:nowrap}
.du-steps li+li:before{content:"";width:24px;height:2px;background:var(--line);margin:0 9px 0 2px;border-radius:2px}
.du-steps li.done+li:before{background:color-mix(in srgb,var(--pos) 55%,var(--line))}
.du-steps i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;font-style:normal;font-size:10px;font-weight:700;background:var(--surface);border:1.5px solid var(--line);color:var(--ink-4);flex:0 0 20px}
.du-steps li.done{color:var(--ink-2)}
.du-steps li.done i{background:var(--pos);border-color:var(--pos);color:#fff}
.du-steps li.now{color:var(--ink);font-weight:600}
.du-steps li.now i{border-color:var(--brand);color:var(--brand);box-shadow:0 0 0 3px var(--brand-50)}
.du-steps li.wait{color:var(--ink);font-weight:600}
.du-steps li.wait i{border-color:var(--gold);color:var(--gold);box-shadow:0 0 0 3px var(--gold-50)}
.du-steps li.bad{color:var(--neg);font-weight:600}
.du-steps li.bad i{background:var(--neg);border-color:var(--neg);color:#fff}
.du-seg-l{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);font-weight:650}
.mz .du-seg{background:var(--surface)}
.mz .du-seg button{font-size:11.5px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px}
.mz .du-seg button i{width:7px;height:7px;border-radius:50%;background:var(--ink-4);opacity:.55}
.mz .du-seg button.on i{opacity:1}
.mz .du-seg button.sent i{background:var(--info)}
.mz .du-seg button.accepted i{background:var(--pos)}
.mz .du-seg button.declined i{background:var(--neg)}
.mz .du-seg button.on.declined{color:var(--neg)}
.mz .du-seg button.on.accepted{color:var(--pos)}

/* more menu */
.du-more{position:relative}
.mz .du-more-btn{gap:6px}
.du-menu{position:absolute;right:0;top:calc(100% + 6px);min-width:250px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--sh-3);padding:6px;z-index:40;animation:du-pop .14s ease-out}
.mz .du-menu button{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;padding:8px 10px;border-radius:8px;font-size:12.5px;color:var(--ink)}
.mz .du-menu button:hover,.mz .du-menu button:focus-visible{background:var(--surface-2);outline:0}
.du-menu button svg{margin-top:1px;color:var(--ink-3);flex:0 0 15px}
.du-menu button b{display:block;font-weight:550}
.du-menu button small{display:block;font-size:11px;color:var(--ink-4);margin-top:1px;line-height:1.35}
.mz .du-menu button.danger,.du-menu button.danger svg{color:var(--neg)}
.du-menu .du-sep{height:1px;background:var(--line-2);margin:5px 4px}
@keyframes du-pop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

/* status notes inside the card */
.du-note{display:flex;align-items:flex-start;gap:10px;padding:9px 20px;font-size:12.5px;line-height:1.5;border-bottom:1px solid var(--line-2);background:color-mix(in srgb,var(--info-50) 55%,var(--surface));color:var(--ink-2)}
.du-note svg{flex:0 0 16px;margin-top:2px;color:var(--info)}
.du-note b{color:var(--ink);font-weight:600}
.du-note.ok{background:color-mix(in srgb,var(--pos-50) 55%,var(--surface))}.du-note.ok svg{color:var(--pos)}
.du-note.bad{background:color-mix(in srgb,var(--neg-50) 55%,var(--surface))}.du-note.bad svg{color:var(--neg)}
.du-note.gold{background:color-mix(in srgb,var(--gold-50) 60%,var(--surface))}.du-note.gold svg{color:var(--gold)}
.du-note .linkish{font-weight:600}
.du-dlg-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.tl-row.bad .dot i{background:var(--neg)!important;border-color:var(--neg)!important}
.tl-row.bad .tt b{color:var(--neg)}

/* approvals on the dashboard */
.appr-inbox{border:1px solid color-mix(in srgb,var(--gold) 30%,var(--line));background:linear-gradient(180deg,color-mix(in srgb,var(--gold-50) 75%,var(--surface)),var(--surface));border-radius:16px;padding:14px 16px;margin:16px 0;box-shadow:var(--sh-1)}
.appr-inbox header{display:flex;align-items:center;gap:12px}
.appr-inbox header>div{flex:1;min-width:0}
.appr-inbox header b{display:block;font-size:14px;font-weight:650;color:var(--ink)}
.appr-inbox header span{display:block;font-size:12px;color:var(--ink-3);margin-top:2px}
.ai-ico{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--gold-50);color:var(--gold);flex:0 0 36px}
.ai-list{display:grid;gap:6px;margin-top:12px}
.mz .ai-list button{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:9px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line);text-align:left;font-size:12.5px;color:var(--ink);width:100%}
.mz .ai-list button:hover{border-color:var(--brand-100);background:var(--brand-50)}
.ai-list .mono{font-size:12px;color:var(--ink-2)}
.ai-v{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:550}
.ai-v small{display:block;font-weight:400;color:var(--ink-3);font-size:11px;overflow:hidden;text-overflow:ellipsis}
.ai-list b{font-variant-numeric:tabular-nums}
.ai-list svg{color:var(--ink-4)}
.po-mine{display:block;font-size:10.5px;color:var(--gold);font-weight:650;margin-top:4px;letter-spacing:.01em}

/* approver switch on the user form */
.appr-toggle{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;cursor:pointer;margin-bottom:18px;background:var(--surface);position:relative;transition:border-color .15s,background .15s}
.appr-toggle.on{border-color:var(--brand-100);background:var(--brand-50)}
.appr-toggle input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
.appr-toggle:focus-within{box-shadow:0 0 0 3px var(--ring)}
.at-ico{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:var(--surface-2);color:var(--ink-3);flex:0 0 34px}
.appr-toggle.on .at-ico{background:var(--surface);color:var(--brand)}
.at-t{flex:1;min-width:0}
.at-t b{display:block;font-size:13px;font-weight:600;color:var(--ink)}
.at-t span{display:block;font-size:12px;color:var(--ink-3);margin-top:2px;line-height:1.45}
.at-sw{width:36px;height:20px;border-radius:20px;background:var(--line);position:relative;flex:0 0 36px;transition:background .15s}
.at-sw i{position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.appr-toggle.on .at-sw{background:var(--brand)}
.appr-toggle.on .at-sw i{transform:translateX(16px)}
.su-appr{display:inline-flex;align-items:center;gap:4px;margin-left:6px;font-size:11px;font-weight:600;color:var(--pos);background:var(--pos-50);padding:2px 8px;border-radius:20px;vertical-align:1px}

@media(max-width:900px){
  .du-main{flex-wrap:wrap;gap:10px}
  .du-amt{border-left:0;padding-left:0;text-align:left;flex-basis:100%;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;min-width:0}
  .du-amt b{font-size:20px;margin:0}
  .du-amt span{margin:0}
  .du-bar{padding:8px 14px}
  .du-acts{margin-left:0;width:100%;justify-content:flex-start}
}
@media(max-width:650px){
  .du-main{padding:12px 14px 10px}
  .mz .du-id h1{font-size:19px}
  .du-body{padding:12px 14px 14px}
  .du-note{padding:9px 14px}
  .mz .du-acts .btn{flex:1 1 auto;justify-content:center;padding:0 10px}
  .du-more{flex:0 0 auto}
  .du-steps li+li:before{width:12px;margin:0 6px 0 1px}
  .du-steps li{font-size:11px}
  .du-steps li.done span,.du-steps li.todo span{display:none}
  .mz .du-seg button{padding:6px 8px;font-size:10.5px}
  .mz .ai-list button{grid-template-columns:minmax(0,1fr) auto;gap:4px 10px}
  .ai-list .mono{grid-column:1/-1}
  .ai-list svg{display:none}
}
@media print{.du-bar,.du-back,.du-note{display:none!important}.mz .doc-unit{box-shadow:none}}
`;
