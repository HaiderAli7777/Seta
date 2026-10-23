/* ============================================================================
   SIGN IN, SIGN OUT, SWITCH USER — a company with more than one person opens
   on a sign-in screen; everyone can sign out or hand over to someone else from
   the account menu or the foot of the sidebar. A user may have a 4–6 digit PIN
   which is asked on sign-in. Each browser tab keeps its own signed-in user and
   the books stay in step between tabs, so two people (or two roles) can work
   side by side on one computer. A company with a single user and no PIN opens
   straight away, as before.
   The PIN keeps colleagues on a shared computer in their own role; it is not a
   password against someone who can read the browser's stored data — that
   arrives with the server database.
   ========================================================================== */
const pinOk = (p) => /^\d{4,6}$/.test(p || "");
async function pinHash(userId, pin) {
  const text = `invoeez:${userId}:${pin}`;
  try {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return "s:" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {}
  let h = 0x811c9dc5; for (let r = 0; r < 64; r++) for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i) + r; h = Math.imul(h, 0x01000193) >>> 0; }
  return "f:" + h.toString(16);
}
const pinMatches = async (user, pin) => !user.pinHash || (await pinHash(user.id, pin)) === user.pinHash;

/* Who is signed in: this tab's user; otherwise the only user when there is one without a PIN; otherwise nobody (sign-in screen). */
const ME_TAB = "mizan.me";
const activeUsers = (users) => (users || []).filter((u) => u.active);
function initialMe(users) {
  const act = activeUsers(users);
  try { const s = window.sessionStorage.getItem(ME_TAB); if (s && act.some((u) => u.id === s)) return s; } catch (e) {}
  return act.length === 1 && !act[0].pinHash ? act[0].id : null;
}
const lastUser = () => { try { return window.localStorage.getItem(ME_TAB); } catch (e) { return null; } };
const writeMe = (id) => { try { if (id) { window.sessionStorage.setItem(ME_TAB, id); window.localStorage.setItem(ME_TAB, id); } else window.sessionStorage.removeItem(ME_TAB); } catch (e) {} };

/* PIN entry: dots that fill as you type, an optional keypad, a shake when the PIN is wrong. */
function PinPad({ value, onChange, onSubmit, keys, label, errN, bad }) {
  const ref = React.useRef(null);
  const set = (v) => { onChange(v.replace(/\D/g, "").slice(0, 6)); if (ref.current) ref.current.focus(); };
  /* after a wrong PIN, typing again goes straight back into the box */
  React.useEffect(() => { if (errN > 0 && ref.current) ref.current.focus(); }, [errN]);
  return <div className="pinpad">
    <label className="pp-field">
      <input ref={ref} type="password" inputMode="numeric" autoComplete="off" maxLength={6} autoFocus aria-label={label}
        value={value} onChange={(e) => set(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }} />
      <span key={errN} className={cx("pp-dots", errN > 0 && "shake", bad && "bad")} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={cx(i < value.length && "on", i >= 4 && "opt")} />)}</span>
    </label>
    {keys && <div className="pp-keys">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => k === ""
      ? <span key={i} />
      : <button key={i} type="button" className={cx("pp-k", k === "del" && "del")} aria-label={k === "del" ? "Delete last digit" : k}
          onClick={() => set(k === "del" ? value.slice(0, -1) : value + k)}>{k === "del" ? <DeleteKey size={18} strokeWidth={1.8} /> : k}</button>)}</div>}
  </div>;
}

/* The list of people, then the PIN step for a user who has one. */
function PickUser({ users, me, onPick, hint, keypad, leaving }) {
  const [target, setTarget] = useState(null), [pin, setPin] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [errN, setErrN] = useState(0), [q, setQ] = useState("");
  const act = activeUsers(users);
  const list = act.length > 6 && q ? act.filter((u) => hits(q, u.name, u.email, (ROLES[u.role] || ROLES.admin).label)) : act;
  const choose = (u) => { if (leaving) return; if (u.pinHash && u.id !== me) { setTarget(u); setPin(""); setErr(""); setErrN(0); } else onPick(u.id); };
  const submit = async () => {
    if (leaving) return;
    if (!pinOk(pin)) { setErr("Enter the 4 to 6 digit PIN"); setErrN((n) => n + 1); return; }
    setBusy(true); const ok = await pinMatches(target, pin); setBusy(false);
    if (ok) onPick(target.id); else { setErr("That PIN is not right. Try again."); setPin(""); setErrN((n) => n + 1); }
  };
  if (target) { const r = ROLES[target.role] || ROLES.admin, done = leaving === target.id;
    return <div className={cx("su-pin", keypad && "si-pin")}>
      {keypad
        ? <div className={cx("si-pin-who", done && "ok")}><span className={cx("su-av big", r.grad)}>{done ? <Check size={22} strokeWidth={3} /> : initials(target.name)}</span>
            <b>{target.name}</b><small>{r.label} · enter your PIN</small></div>
        : <div className="su-row on static"><span className={cx("su-av", r.grad)}>{initials(target.name)}</span><span className="su-who"><b>{target.name}</b><small>{r.label}</small></span><Lock size={15} className="su-go" /></div>}
      <PinPad value={pin} keys={keypad} errN={errN} bad={!!err} label={`PIN for ${target.name}`} onSubmit={submit} onChange={(v) => { setPin(v); setErr(""); }} />
      <div className="form-error" role="alert" style={err ? undefined : { visibility: "hidden" }}>{err || "\u00a0"}</div>
      <footer className="modal-actions"><Btn onClick={() => setTarget(null)} disabled={!!leaving}>Back</Btn>
        <Btn kind="pri" icon={done ? Check : Lock} disabled={busy || !!leaving} onClick={submit}>{done ? "Signing in…" : "Sign in"}</Btn></footer>
    </div>; }
  return <>
    {act.length > 6 && <div className="su-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find your name" aria-label="Find your name" /></div>}
    <div className={cx("su-list", leaving && "leaving")}>{list.map((u, i) => { const r = ROLES[u.role] || ROLES.admin, go = leaving === u.id;
    return <button key={u.id} style={{ "--i": i }} className={cx("su-row", u.id === me && "on", u.id === hint && !me && "hint", go && "go")} onClick={() => choose(u)}>
      <span className={cx("su-av", r.grad)}>{go ? <Check size={16} strokeWidth={3} /> : initials(u.name)}</span>
      <span className="su-who"><b>{u.name}</b><small>{r.label}{u.email ? ` · ${u.email}` : ""}</small></span>
      {u.id === hint && !me && !go && <span className="su-last">Last here</span>}
      {u.id === me ? <Pill tone="ok" dot>Signed in</Pill> : u.pinHash ? <span className="su-lock" title="Asks for a PIN"><Lock size={14} />PIN</span> : <ArrowRight size={15} className="su-go" />}
    </button>; })}</div>
    {!list.length && act.length > 0 && <p className="su-note">Nobody matches “{q}”.</p>}
    {!act.length && <p className="su-note">No active users. Restore a backup or ask the administrator.</p>}</>;
}

function SwitchUserDialog({ users, me, onSwitch, onSignOut, close, isAdmin, go }) {
  const act = activeUsers(users), admin = act.find((u) => u.role === "admin");
  return <StudioModal title="Switch user" sub="Choose who is using InvoEez now. Each person only sees what their role allows." close={close}>
    <PickUser users={users} me={me} onPick={(id) => (id === me ? close() : onSwitch(id))} />
    {act.length < 2 && <p className="su-note">There is only one user so far. {isAdmin ? <>Add people in <button className="linkish" onClick={() => { close(); go("users"); }}>Users &amp; access</button> and choose a role for each.</> : "Ask the administrator to add more."}</p>}
    {isAdmin && admin && !admin.pinHash && act.length > 1 && <p className="su-note warn"><Lock size={13} /> Anyone at this computer can sign in as {admin.name}. <button className="linkish" onClick={() => { close(); go("users"); }}>Set a PIN</button> to keep administrator access to yourself.</p>}
    <footer className="modal-actions su-foot"><Btn icon={LogOut} onClick={onSignOut}>Sign out</Btn><Btn onClick={close}>Cancel</Btn></footer>
  </StudioModal>;
}


/* Decorative preview of the product on the sign-in screen: cards float, the chart draws itself. */
function SignInShowcase() {
  const year = new Date().getFullYear();
  return <aside className="si-show" aria-hidden="true">
    <div className="si-aurora a1" /><div className="si-aurora a2" /><div className="si-aurora a3" /><div className="si-mesh" />
    <img className="si-brand" src={BRAND_LOCKUP} alt="" />
    <div className="si-pitch">
      <span className="si-kicker"><Sparkles size={13} />Invoice Made Easy</span>
      <h2><span>Your books,</span> <span>beautifully</span> <span>in order.</span></h2>
      <p>Invoices, purchases, VAT returns and IFRS 18 statements for UAE businesses, in one place.</p>
      <ul className="si-feats"><li><ShieldCheck size={14} />UAE VAT · FTA 201</li><li><PieChart size={14} />IFRS 18 statements</li><li><ClipboardCheck size={14} />Purchase approvals</li></ul>
    </div>
    <div className="si-stage">
      <div className="si-fc fc-inv">
        <div className="fc-h"><span className="fc-ico"><FileText size={14} /></span><b>Tax invoice</b><em className="fc-paid"><Check size={11} strokeWidth={3} />Paid</em></div>
        <div className="fc-amt"><small>AED</small>48,250.00</div>
        <div className="fc-bar"><i /></div>
        <div className="fc-meta"><span>Received in full</span><span>VAT 5%</span></div>
      </div>
      <div className="si-fc fc-chart">
        <div className="fc-h"><b>Revenue</b><em className="fc-up">+12.4%</em></div>
        <svg viewBox="0 0 220 74" preserveAspectRatio="none">
          <defs><linearGradient id="siArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".35" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
          <path className="fc-area" d="M0 60 L22 52 L44 56 L66 40 L88 44 L110 30 L132 34 L154 20 L176 24 L198 10 L220 14 L220 74 L0 74 Z" />
          <path className="fc-line" d="M0 60 L22 52 L44 56 L66 40 L88 44 L110 30 L132 34 L154 20 L176 24 L198 10 L220 14" />
          <circle className="fc-dot" cx="198" cy="10" r="4" /></svg>
        <div className="fc-axis"><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
      </div>
      <div className="si-fc fc-vat"><span className="fc-check"><Check size={14} strokeWidth={3} /></span><div><b>VAT return ready</b><small>FTA 201 · this quarter</small></div></div>
      <div className="si-fc fc-appr"><span className="fc-badge"><ClipboardCheck size={14} /></span><div><b>Purchase order approved</b><small>by the purchase approver</small></div></div>
    </div>
    <footer className="si-foot">© {year} InvoEez · Invoice Made Easy</footer>
  </aside>;
}

function SignInScreen({ users, company, onSignIn, theme, toggleTheme }) {
  const hint = lastUser();
  const [leaving, setLeaving] = useState(null);
  /* A short "signing in" moment, then the books open. */
  const enter = (id) => { if (leaving) return; setLeaving(id); setTimeout(() => onSignIn(id), reducedMotion() ? 0 : 450); };
  const now = new Date(), h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const day = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return <div className={cx("signin", leaving && "leaving")}>
    <SignInShowcase />
    <main className="si-main" aria-label="Sign in">
      <button className="si-theme" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
      <div className="si-panel">
        <div className="si-co">{company.logo ? <img src={company.logo} alt="" /> : <span>{initials(company.name || "Company")}</span>}<b>{company.name}</b></div>
        <div className="si-hello"><i />{greet} · {day}</div>
        <h1>Welcome back</h1>
        <p className="si-sub">Choose your name to sign in. If you have a PIN, you will be asked for it.</p>
        <PickUser users={users} me={null} hint={hint} onPick={enter} keypad leaving={leaving} />
        <p className="si-note"><Lock size={12} />Your books are kept in this browser on this computer. Each person sees only what their role allows.</p>
      </div>
    </main>
  </div>;
}

const USERS_CSS = `
.su-list{display:grid;gap:6px;margin-top:4px}
.su-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);transition:border-color .15s,background .15s,transform .15s}
.su-row:not(.static):hover{border-color:var(--brand-100);background:var(--brand-50);transform:translateX(2px)}
.su-row.on,.su-row.hint{border-color:var(--brand-100);background:var(--brand-50)}
.su-row.static{margin-bottom:14px}
.su-av{width:36px;height:36px;flex:0 0 36px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--pri-a),var(--pri-b))}
.su-av.g1{background:linear-gradient(135deg,#7097DE,#4778D4)}.su-av.g3{background:linear-gradient(135deg,#12B981,#0E9F72)}.su-av.g4{background:linear-gradient(135deg,#22D3EE,#4778D4)}.su-av.g5{background:linear-gradient(135deg,#F5B544,#F0832A)}
.su-who{flex:1;min-width:0}.su-who b{display:block;font-size:13.5px;color:var(--ink)}.su-who small{display:block;font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.su-lock{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:var(--ink-3);padding:3px 9px;border-radius:20px;background:var(--surface-3)}
.su-go{color:var(--ink-4)}
.su-note{margin-top:12px;font-size:12.5px;color:var(--ink-3);line-height:1.5}
.su-note.warn{display:flex;gap:7px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:var(--warn-50);color:var(--ink-2)}
.su-note.warn svg{color:var(--warn);margin-top:3px;flex:0 0 auto}
.su-foot{justify-content:space-between}
.linkish{color:var(--brand);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.su-pin{margin-top:6px}
.mz .sb-foot .who-btn{flex:1;min-width:0;display:flex;align-items:center;gap:10px;text-align:left;border-radius:10px;padding:2px 4px;margin:-2px -4px;transition:background .15s}
.mz .sb-foot .who-btn:hover{background:rgba(255,255,255,.08)}
.mz .sb-foot .signout{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;color:var(--sb-dim)}
.mz .sb-foot .signout:hover{background:rgba(255,255,255,.08);color:#fff}

/* PIN entry */
.pinpad{display:grid;gap:16px;justify-items:center;margin-top:4px}
.pp-field{position:relative;display:block;width:100%;max-width:300px;cursor:text}
.pp-field input{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;font-size:16px;cursor:text;z-index:1}
.pp-dots{display:flex;justify-content:center;gap:13px;padding:15px 16px;border-radius:14px;border:1.5px solid var(--line);background:var(--surface-2);transition:border-color .15s,box-shadow .15s,background .15s}
.pp-field:focus-within .pp-dots{border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-50);background:var(--surface)}
.pp-dots.bad,.pp-field:focus-within .pp-dots.bad{border-color:var(--neg);box-shadow:0 0 0 4px var(--neg-50)}
.pp-dots i{width:14px;height:14px;border-radius:50%;border:2px solid var(--ink-4);transition:background .15s,border-color .15s}
.pp-dots i.opt{border-style:dashed;opacity:.5}
.pp-dots i.on{background:var(--brand);border-color:var(--brand);border-style:solid;opacity:1;animation:ppDot .25s var(--ease)}
.pp-dots.shake{animation:ppShake .42s ease}
@keyframes ppDot{0%{transform:scale(.4)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes ppShake{0%,100%{translate:0}20%{translate:-10px}40%{translate:8px}60%{translate:-5px}80%{translate:3px}}
.pp-keys{display:grid;grid-template-columns:repeat(3,66px);gap:10px;justify-content:center}
.mz .pp-k{height:50px;border-radius:14px;font-size:20px;font-weight:600;color:var(--ink);background:var(--surface);border:1px solid var(--line);box-shadow:0 1px 2px rgba(15,23,42,.05);display:grid;place-items:center;font-variant-numeric:tabular-nums;transition:background .12s,border-color .12s,transform .08s}
.mz .pp-k:hover{background:var(--brand-50);border-color:var(--brand-100)}
.mz .pp-k:active{transform:scale(.93);background:var(--brand-100)}
.mz .pp-k.del{color:var(--ink-3);background:transparent;border-color:transparent;box-shadow:none}
.su-pin .form-error{text-align:center;margin-top:10px}
.su-search{display:flex;align-items:center;gap:8px;padding:0 12px;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-3);margin-bottom:10px}
.su-search input{flex:1;min-width:0;border:0;outline:0;background:none;font-size:13px;color:var(--ink)}
.su-search:focus-within{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-50)}
.su-last{font-size:10.5px;font-weight:650;color:var(--brand);background:var(--brand-50);padding:3px 8px;border-radius:20px;white-space:nowrap}

/* sign-in screen */
.mz>.signin{flex:1 1 auto;width:100%;align-self:stretch}
.signin{position:relative;min-height:100vh;min-height:100dvh;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(440px,.9fr);background:var(--surface);isolation:isolate}

/* the brand side */
.si-show{position:relative;overflow:hidden;display:flex;flex-direction:column;padding:34px 52px 26px;color:#fff;isolation:isolate;
  background:radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--pri-a) 38%,var(--sb-1)) 0%,var(--sb-1) 46%,var(--sb-2) 100%)}
.si-aurora{position:absolute;border-radius:50%;filter:blur(72px);z-index:-1;opacity:.55;animation:siDrift 18s ease-in-out infinite}
.si-aurora.a1{width:540px;height:540px;left:-140px;top:-180px;background:var(--pri-a)}
.si-aurora.a2{width:460px;height:460px;right:-160px;top:28%;background:var(--sb-acc);opacity:.32;animation-duration:23s;animation-direction:reverse}
.si-aurora.a3{width:400px;height:400px;left:22%;bottom:-220px;background:#8B5CF6;opacity:.3;animation-duration:27s}
.si-mesh{position:absolute;inset:0;z-index:-1;opacity:.11;background-image:linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px);background-size:44px 44px;
  -webkit-mask-image:radial-gradient(ellipse 80% 70% at 40% 45%,#000 20%,transparent 75%);mask-image:radial-gradient(ellipse 80% 70% at 40% 45%,#000 20%,transparent 75%);animation:siMesh 50s linear infinite}
.si-brand{height:44px;width:auto;align-self:flex-start;filter:drop-shadow(0 4px 14px rgba(0,0,0,.35));animation:siUp .7s var(--ease) backwards}
.si-pitch{margin-top:auto;max-width:540px;padding-top:28px}
.si-kicker{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:30px;font-size:11.5px;font-weight:600;letter-spacing:.04em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);color:#DCE8FF;animation:siUp .7s .1s var(--ease) backwards}
.si-kicker svg{color:var(--sb-acc)}
.mz .signin .si-pitch h2{font-size:clamp(34px,3.5vw,52px);line-height:1.05;letter-spacing:-.035em;font-weight:750;margin:18px 0 14px;color:#fff}
.si-pitch h2 span{display:inline-block;animation:siUp .8s var(--ease) backwards}
.si-pitch h2 span:nth-child(1){animation-delay:.18s}
.si-pitch h2 span:nth-child(2){animation-delay:.3s;background:linear-gradient(90deg,#fff 0%,var(--sb-acc) 35%,#fff 70%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:siUp .8s .3s var(--ease) backwards,siShine 7s 1.4s linear infinite}
.si-pitch h2 span:nth-child(3){animation-delay:.42s}
.mz .signin .si-pitch p{font-size:15px;line-height:1.6;color:rgba(226,234,248,.82);max-width:450px;animation:siUp .8s .52s var(--ease) backwards}
.mz .signin .si-feats{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 0;padding:0;animation:siUp .8s .62s var(--ease) backwards}
.si-feats li{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:10px;font-size:12.5px;font-weight:550;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.13);color:#EAF1FF}
.si-feats svg{color:var(--sb-acc)}
.si-stage{position:relative;height:272px;margin:32px 0 8px;max-width:580px}
.si-fc{position:absolute;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);box-shadow:0 20px 50px rgba(3,8,20,.35);color:#fff;
  animation:siPop .8s var(--ease) backwards,siFloat 7s ease-in-out infinite}
.fc-inv{left:0;top:14px;width:250px;animation-delay:.6s,1.4s}
.fc-chart{right:0;top:0;width:256px;animation-delay:.75s,2.2s;animation-duration:.8s,8.5s}
.fc-vat{left:36px;bottom:4px;display:flex;gap:11px;align-items:center;animation-delay:.9s,3s;animation-duration:.8s,7.5s}
.fc-appr{right:24px;bottom:22px;display:flex;gap:11px;align-items:center;animation-delay:1.05s,2.6s;animation-duration:.8s,9s}
.fc-h{display:flex;align-items:center;gap:8px;font-size:12px}
.fc-h b{font-weight:600;flex:1}
.fc-ico{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:rgba(255,255,255,.14)}
.fc-paid{display:inline-flex;align-items:center;gap:3px;font-style:normal;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:20px;background:rgba(52,211,153,.2);color:#6EE7B7}
.fc-amt{font-size:25px;font-weight:700;letter-spacing:-.02em;margin:12px 0 10px;font-variant-numeric:tabular-nums}
.fc-amt small{font-size:11px;font-weight:600;opacity:.7;margin-right:6px}
.fc-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden}
.fc-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#34D399,var(--sb-acc));transform-origin:left;animation:siFill 1.6s 1.3s var(--ease) backwards}
.fc-meta{display:flex;justify-content:space-between;font-size:11px;color:rgba(226,234,248,.7);margin-top:9px}
.fc-up{font-style:normal;font-size:11px;font-weight:700;color:#6EE7B7}
.fc-chart svg{display:block;width:100%;height:74px;margin-top:10px;color:var(--sb-acc);overflow:visible}
.fc-area{fill:url(#siArea);animation:siFade 1s 2.3s ease backwards}
.fc-line{fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:320;stroke-dashoffset:0;animation:siDraw 2s 1.1s var(--ease) backwards}
.fc-dot{fill:#fff;stroke:currentColor;stroke-width:3;transform-box:fill-box;transform-origin:center;animation:siFade .4s 2.9s backwards,siPulse 2.4s 3.3s ease-in-out infinite}
.fc-axis{display:flex;justify-content:space-between;font-size:10px;color:rgba(226,234,248,.55);margin-top:6px}
.fc-check{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#10B981;color:#fff;animation:siRing 2.6s 2s ease-out infinite}
.fc-badge{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,var(--pri-a),var(--pri-b));color:#fff}
.fc-vat b,.fc-appr b{display:block;font-size:12.5px;font-weight:600}
.fc-vat small,.fc-appr small{display:block;font-size:11px;color:rgba(226,234,248,.7);margin-top:1px}
.si-foot{font-size:11.5px;color:rgba(226,234,248,.5);margin-top:auto;padding-top:16px}

/* the sign-in side */
.si-main{position:relative;display:grid;place-items:center;padding:48px 32px;min-width:0;background:var(--surface);overflow:hidden}
.si-main:before{content:"";position:absolute;inset:0;background:radial-gradient(55% 40% at 100% 0%,var(--brand-50),transparent 72%),radial-gradient(40% 30% at 0% 100%,color-mix(in srgb,var(--brand-50) 70%,transparent),transparent 70%);pointer-events:none}
.si-panel{position:relative;width:min(420px,100%);animation:siUp .7s .12s var(--ease) backwards}
.signin.leaving .si-panel{animation:siOut .45s var(--ease) forwards}
.si-co{display:inline-flex;align-items:center;gap:9px;padding:5px 13px 5px 5px;border-radius:30px;background:var(--surface-2);border:1px solid var(--line);font-size:12.5px;color:var(--ink-2)}
.si-co img,.si-co span{width:26px;height:26px;border-radius:50%;object-fit:contain;display:grid;place-items:center;font-size:10.5px;font-weight:700;color:var(--brand);background:var(--brand-50)}
.mz .signin .si-hello{display:flex;align-items:center;gap:8px;margin-top:26px;font-size:12px;font-weight:650;color:var(--brand);letter-spacing:.02em}
.si-hello i{width:8px;height:8px;border-radius:50%;background:var(--pos);animation:siLive 2s ease-out infinite}
.mz .signin .si-panel h1{font-size:34px;font-weight:750;letter-spacing:-.035em;color:var(--ink);margin-top:6px;line-height:1.1}
.mz .signin .si-sub{font-size:13.5px;color:var(--ink-3);margin:8px 0 22px;line-height:1.5}
.mz .signin .si-panel:has(.si-pin) .si-sub{display:none}
.mz .signin .si-panel:has(.si-pin) h1{margin-bottom:18px}
.mz .signin .si-note{display:flex;gap:7px;align-items:flex-start;margin-top:22px;padding-top:16px;border-top:1px dashed var(--line);font-size:11.5px;color:var(--ink-4);line-height:1.5}
.si-note svg{margin-top:2px;flex:0 0 auto}
.mz .si-theme{position:absolute;top:18px;right:18px;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--ink-2);background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);z-index:2;transition:transform .25s var(--ease)}
.mz .si-theme:hover{transform:rotate(-14deg)}
.signin .su-list{gap:8px}
.signin .su-row{padding:12px 14px;border-radius:14px;box-shadow:0 1px 2px rgba(15,23,42,.04);animation:siRow .5s var(--ease) backwards;animation-delay:calc(.32s + var(--i,0) * 70ms);transition:border-color .18s,background .18s,transform .18s,box-shadow .18s,opacity .3s}
.signin .su-row:not(.static):hover{transform:translateY(-2px);background:var(--surface);border-color:var(--brand-100);box-shadow:0 12px 26px -14px color-mix(in srgb,var(--brand) 55%,transparent)}
.signin .su-row:active{transform:scale(.99)}
.signin .su-row .su-av{width:40px;height:40px;flex-basis:40px;font-size:13px;box-shadow:0 6px 14px -6px rgba(0,0,0,.35)}
.signin .su-row .su-go{transition:transform .2s,color .2s}
.signin .su-row:hover .su-go{transform:translateX(3px);color:var(--brand)}
.su-list.leaving .su-row:not(.go){opacity:.35;transform:scale(.98)}
.signin .su-row.go{border-color:var(--pos);background:var(--pos-50)}
.su-row.go .su-av{background:var(--pos)!important;animation:siPopIn .45s var(--ease)}
.si-pin{animation:siUp .45s var(--ease) backwards}
.mz .signin .si-pin-who{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;margin-bottom:16px}
.su-av.big{width:64px;height:64px;flex-basis:64px;font-size:20px;margin-bottom:9px;box-shadow:0 0 0 5px var(--surface),0 0 0 7px var(--brand-100);transition:background .3s,box-shadow .3s}
.si-pin-who b{font-size:17px;color:var(--ink);font-weight:650}
.si-pin-who small{font-size:12px;color:var(--ink-3)}
.si-pin-who.ok .su-av{background:var(--pos);box-shadow:0 0 0 5px var(--surface),0 0 0 7px var(--pos);animation:siPopIn .45s var(--ease)}
.mz .signin .si-pin .modal-actions{display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:8px;padding:0;border:0;background:none}
.mz .si-pin .modal-actions .btn{justify-content:center;height:44px}

@keyframes siUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes siOut{to{opacity:0;transform:translateY(-12px) scale(.98)}}
@keyframes siRow{from{opacity:0;translate:18px 0}to{opacity:1;translate:0 0}}
@keyframes siPop{from{opacity:0;transform:translateY(26px) scale(.95)}to{opacity:1;transform:none}}
@keyframes siFloat{0%,100%{translate:0 0}50%{translate:0 -10px}}
@keyframes siDrift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,40px) scale(1.12)}66%{transform:translate(-40px,20px) scale(.94)}}
@keyframes siMesh{to{background-position:44px 44px,44px 44px}}
@keyframes siShine{from{background-position:120% 0}to{background-position:-120% 0}}
@keyframes siFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes siDraw{from{stroke-dashoffset:320}to{stroke-dashoffset:0}}
@keyframes siFade{from{opacity:0}to{opacity:1}}
@keyframes siPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}
@keyframes siRing{0%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}100%{box-shadow:0 0 0 14px rgba(16,185,129,0)}}
@keyframes siLive{0%{box-shadow:0 0 0 0 rgba(16,185,129,.55)}100%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
@keyframes siPopIn{0%{transform:scale(.6)}70%{transform:scale(1.12)}100%{transform:scale(1)}}

@media (max-height:820px) and (min-width:901px){.si-stage{height:228px;margin-top:24px}.fc-vat,.fc-appr{display:none}.mz .signin .si-pitch h2{font-size:clamp(30px,3vw,44px)}}
@media (max-height:660px) and (min-width:901px){.si-stage{display:none}}
@media (max-width:1100px) and (min-width:901px){.si-show{padding:30px 34px 22px}.fc-chart{width:220px}.fc-inv{width:224px}.fc-appr{display:none}}
@media (max-width:900px){
  .signin{grid-template-columns:1fr;grid-template-rows:auto 1fr}
  .si-show{padding:20px 20px 54px}
  .si-stage,.mz .signin .si-feats,.si-foot,.mz .signin .si-pitch p{display:none}
  .si-pitch{margin-top:16px;padding-top:0}
  .mz .signin .si-pitch h2{font-size:27px;margin:12px 0 0}
  .si-brand{height:32px}
  .si-main{margin-top:-30px;border-radius:24px 24px 0 0;padding:28px 18px 30px;place-items:start center;box-shadow:0 -12px 30px rgba(3,8,20,.2);overflow:visible}
  .mz .si-theme{top:14px;right:14px}
  .mz .signin .si-panel h1{font-size:28px}
  .mz .signin .si-hello{margin-top:18px}
}
@media (prefers-reduced-motion:reduce){.signin *,.signin *::before{animation:none!important;transition:none!important}}
`;
