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

/* The list of people, then the PIN step for a user who has one. */
function PickUser({ users, me, onPick, hint }) {
  const [target, setTarget] = useState(null), [pin, setPin] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const act = activeUsers(users);
  const choose = (u) => { if (u.pinHash && u.id !== me) { setTarget(u); setPin(""); setErr(""); } else onPick(u.id); };
  const submit = async () => {
    if (!pinOk(pin)) { setErr("Enter the 4 to 6 digit PIN"); return; }
    setBusy(true); const ok = await pinMatches(target, pin); setBusy(false);
    if (ok) onPick(target.id); else { setErr("That PIN is not right. Try again."); setPin(""); }
  };
  if (target) { const r = ROLES[target.role] || ROLES.admin;
    return <div className="su-pin">
      <div className="su-row on static"><span className={cx("su-av", r.grad)}>{initials(target.name)}</span><span className="su-who"><b>{target.name}</b><small>{r.label}</small></span><Lock size={15} className="su-go" /></div>
      <Field label={`PIN for ${target.name}`}><Input type="password" inputMode="numeric" autoComplete="off" maxLength={6} autoFocus value={pin} placeholder="••••"
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} /></Field>
      {err && <div className="form-error" role="alert">{err}</div>}
      <footer className="modal-actions"><Btn onClick={() => setTarget(null)}>Back</Btn><Btn kind="pri" icon={Check} disabled={busy} onClick={submit}>Sign in</Btn></footer>
    </div>; }
  return <><div className="su-list">{act.map((u) => { const r = ROLES[u.role] || ROLES.admin;
    return <button key={u.id} className={cx("su-row", u.id === me && "on", u.id === hint && !me && "hint")} onClick={() => choose(u)}>
      <span className={cx("su-av", r.grad)}>{initials(u.name)}</span>
      <span className="su-who"><b>{u.name}</b><small>{r.label}{u.email ? ` · ${u.email}` : ""}</small></span>
      {u.id === me ? <Pill tone="ok" dot>Signed in</Pill> : u.pinHash ? <span className="su-lock" title="Asks for a PIN"><Lock size={14} />PIN</span> : <ArrowRight size={15} className="su-go" />}
    </button>; })}</div>
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

function SignInScreen({ users, company, onSignIn, theme, toggleTheme }) {
  const hint = lastUser();
  return <div className="signin">
    <div className="si-glow g1" /><div className="si-glow g2" /><div className="si-grid" />
    <div className="si-card" role="main" aria-label="Sign in">
      <img className="si-logo" src={BRAND_LOCKUP} alt="InvoEez — Invoice Made Easy" />
      <div className="si-co">{company.logo ? <img src={company.logo} alt="" /> : <span>{initials(company.name || "Company")}</span>}<b>{company.name}</b></div>
      <h1>Sign in</h1>
      <p className="si-sub">Choose your name. If you have a PIN, you will be asked for it.</p>
      <PickUser users={users} me={null} hint={hint} onPick={onSignIn} />
      <p className="si-note"><Lock size={12} /> Your books are kept in this browser on this computer. Each person sees only what their role allows.</p>
    </div>
    <button className="si-theme" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
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

/* sign-in screen */
.mz>.signin{flex:1 1 auto;width:100%;align-self:stretch}
.signin{position:relative;min-height:100vh;display:grid;place-items:center;padding:24px 16px;overflow:hidden;isolation:isolate;
  background:linear-gradient(130deg,var(--sb-2) 0%,var(--sb-1) 45%,var(--pri-b) 100%)}
.si-glow{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5;z-index:-1;animation:glowDrift 16s ease-in-out infinite}
.si-glow.g1{width:420px;height:420px;right:8%;top:-140px;background:var(--sb-acc)}
.si-glow.g2{width:360px;height:360px;left:6%;bottom:-160px;background:var(--s3);animation-direction:reverse;opacity:.35}
.si-grid{position:absolute;inset:0;z-index:-1;opacity:.1;background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:38px 38px;
  -webkit-mask-image:radial-gradient(ellipse at 50% 40%,#000 15%,transparent 70%);mask-image:radial-gradient(ellipse at 50% 40%,#000 15%,transparent 70%)}
.si-card{width:min(440px,100%);padding:28px 28px 22px;border-radius:24px;background:var(--surface);box-shadow:0 30px 80px rgba(0,0,0,.35);animation:dashRise .5s var(--ease) both}
.si-logo{display:block;height:46px;margin:0 auto 18px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.25));background:linear-gradient(135deg,var(--sb-2),var(--sb-1));padding:8px 14px;border-radius:14px;box-sizing:content-box}
.si-co{display:flex;align-items:center;justify-content:center;gap:9px;font-size:13px;color:var(--ink-2)}
.si-co img,.si-co span{width:26px;height:26px;border-radius:8px;object-fit:contain;display:grid;place-items:center;font-size:10.5px;font-weight:700;color:var(--brand);background:var(--brand-50)}
.si-card h1{text-align:center;font-size:24px;font-weight:700;letter-spacing:-.03em;margin-top:14px;color:var(--ink)}
.si-sub{text-align:center;font-size:12.5px;color:var(--ink-3);margin:4px 0 16px}
.si-note{display:flex;gap:6px;align-items:flex-start;margin-top:16px;font-size:11.5px;color:var(--ink-4);line-height:1.45}
.si-note svg{margin-top:2px;flex:0 0 auto}
.si-theme{position:absolute;top:16px;right:16px;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2)}
@media (prefers-reduced-motion:reduce){.si-glow,.si-card{animation:none!important}}
`;
