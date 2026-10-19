/* 3.12: animated sign-in page (brand showcase, greeting, user tiles, PIN pad with keypad, wrong-PIN shake, success, reduced motion, phone, dark)
   and the document editor as one form (no gaps, unsaved-changes indicator, Ctrl+S, leave prompt) (needs tests/fixture.json). Run: node tests/browser-signin-form.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs'),crypto=require('crypto');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=JSON.parse(fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8'));
const SHOTS=process.env.SHOTS||'';
const h=(id,pin)=>'s:'+crypto.createHash('sha256').update(`invoeez:${id}:${pin}`).digest('hex');
const team=[{id:'u1',name:'Administrator',email:'',role:'admin',active:true,pinHash:h('u1','1234')},{id:'u2',name:'Aisha Khan',email:'aisha@company.ae',role:'accountant',active:true},{id:'u3',name:'Omar Saeed',email:'',role:'sales',active:true},{id:'u4',name:'Sam Clerk',email:'',role:'clerk',active:true,pinHash:h('u4','9999')}];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const open=async(opts={})=>{const ctx=await b.newContext({viewport:opts.vp||{width:1440,height:900},reducedMotion:opts.reduced?'reduce':'no-preference',colorScheme:opts.dark?'dark':'light'});
  const books={...fx,users:opts.single?fx.users:team};
  await ctx.addInitScript(([bk,last,dark])=>{try{if(!localStorage.getItem('fx-loaded')){localStorage.clear();if(dark)localStorage.setItem('mizan.theme','dark');localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',bk);if(last)localStorage.setItem('mizan.me',last);localStorage.setItem('fx-loaded','1');}}catch(e){}},[JSON.stringify(books),opts.last||'',!!opts.dark]);
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));await p.goto('file://'+HTML);await p.waitForTimeout(opts.wait||1500);return p;};
const who=async(p)=>(await p.locator('.sb-foot .who b').innerText().catch(()=>'')).trim();

// ---------- 1. sign-in screen ----------
let p=await open({last:'u2',wait:3600});
check(await p.locator('.signin .si-show').isVisible()&&await p.locator('.si-fc').count()===4,'brand showcase with floating cards');
check(/Your books,\s*beautifully\s*in order/.test(await p.locator('.si-pitch h2').innerText()),'headline');
check(/Welcome back/.test(await p.locator('.si-panel h1').innerText())&&/Good (morning|afternoon|evening)/.test(await p.locator('.si-hello').innerText()),'greeting and welcome');
check(await p.locator('.signin .su-row').count()===4,'every active user has a tile');
check(await p.locator('.su-row',{hasText:'Aisha Khan'}).locator('.su-last').count()===1,'last user here is marked');
const anim=await p.evaluate(()=>({fc:getComputedStyle(document.querySelector('.si-fc')).animationName,au:getComputedStyle(document.querySelector('.si-aurora')).animationName,line:getComputedStyle(document.querySelector('.fc-line')).animationName,row:getComputedStyle(document.querySelector('.signin .su-row')).animationName}));
check(/siPop/.test(anim.fc)&&/siFloat/.test(anim.fc)&&anim.au==='siDrift'&&anim.line==='siDraw'&&anim.row==='siRow','animations are wired ('+JSON.stringify(anim)+')');
const rowsVisible=await p.evaluate(()=>[...document.querySelectorAll('.signin .su-row')].every(r=>+getComputedStyle(r).opacity>0.99));
check(rowsVisible,'tiles are fully visible once their entrance finishes');
if(SHOTS)await p.screenshot({path:path.join(SHOTS,'s1-signin.png')});
// PIN step with keypad
await p.locator('.signin .su-row',{hasText:'Administrator'}).click();await p.waitForTimeout(500);
check(await p.locator('.si-pin .si-pin-who').count()===1&&await p.locator('.pp-dots i').count()===6&&await p.locator('.pp-k').count()===11,'PIN step: avatar, six dots, keypad');
check(!(await p.locator('.si-sub').isVisible()),'the “choose your name” line steps aside on the PIN step');
for(const k of ['1','2','9'])await p.locator('.pp-k',{hasText:k}).first().click();
check(await p.locator('.pp-dots i.on').count()===3&&await p.locator('.su-pin input').inputValue()==='129','keypad fills the dots');
await p.locator('.pp-k.del').click();
check(await p.locator('.pp-dots i.on').count()===2,'delete key removes a digit');
await p.locator('.pp-k',{hasText:'9'}).first().click();await p.locator('.pp-k',{hasText:'9'}).first().click();
await p.locator('.su-pin .btn.pri').click();await p.waitForTimeout(120);
check(await p.locator('.pp-dots.shake').count()===1&&await p.locator('.pp-dots.bad').count()===1&&/not right/.test(await p.locator('.su-pin .form-error').innerText()),'wrong PIN shakes and explains');
check(await p.locator('.signin').count()===1,'still on the sign-in screen');
if(SHOTS)await p.screenshot({path:path.join(SHOTS,'s2-pin-wrong.png')});
await p.keyboard.type('1234');
check(await p.locator('.pp-dots.bad').count()===0,'typing clears the error');
await p.keyboard.press('Enter');await p.waitForTimeout(120);
check(await p.locator('.si-pin-who.ok').count()===1&&/Signing in/.test(await p.locator('.su-pin .btn.pri').innerText()),'right PIN shows a success check');
await p.waitForTimeout(900);
check(await p.locator('.signin').count()===0&&await who(p)==='Administrator','signed in with the PIN');
// sign out → no-PIN user → straight in with a check on the tile
await p.locator('.sb-foot .signout').click();await p.waitForTimeout(800);
await p.locator('.signin .su-row',{hasText:'Omar Saeed'}).click();await p.waitForTimeout(100);
check(await p.locator('.su-row.go',{hasText:'Omar Saeed'}).count()===1&&await p.locator('.su-list.leaving').count()===1,'the chosen tile turns into a check');
await p.waitForTimeout(800);
check(await who(p)==='Omar Saeed','signed in without a PIN');
// switch-user dialog: dots without a keypad
await p.locator('.sb-foot .who-btn').click();await p.waitForTimeout(250);await p.locator('.su-row',{hasText:'Sam Clerk'}).click();await p.waitForTimeout(200);
check(await p.locator('.studio-modal .pp-dots').count()===1&&await p.locator('.studio-modal .pp-k').count()===0,'switch user asks for the PIN with dots');
await p.locator('.su-pin input').fill('9999');await p.locator('.su-pin .btn.pri').click();await p.waitForTimeout(500);
check(await who(p)==='Sam Clerk','switched with the PIN');
await p.context().close();

// reduced motion: no animation, instant sign-in
p=await open({reduced:true});
const rm=await p.evaluate(()=>({fc:getComputedStyle(document.querySelector('.si-fc')).animationName,line:getComputedStyle(document.querySelector('.fc-line')).strokeDashoffset}));
check(rm.fc==='none'&&parseFloat(rm.line)===0,'reduced motion: still, chart fully drawn ('+JSON.stringify(rm)+')');
await p.locator('.signin .su-row',{hasText:'Omar Saeed'}).click();await p.waitForTimeout(150);
check(await p.locator('.signin').count()===0,'reduced motion signs in at once');
await p.context().close();

// phone and dark
p=await open({vp:{width:390,height:844},wait:2600});
const ph=await p.evaluate(()=>({over:document.documentElement.scrollWidth-innerWidth,stage:getComputedStyle(document.querySelector('.si-stage')).display,rows:[...document.querySelectorAll('.signin .su-row')].every(r=>r.getBoundingClientRect().right<=390)}));
check(ph.over<=0&&ph.stage==='none'&&ph.rows,'phone: compact brand band, tiles fit ('+JSON.stringify(ph)+')');
if(SHOTS)await p.screenshot({path:path.join(SHOTS,'s3-signin-phone.png')});
await p.context().close();
p=await open({dark:true,wait:2600});
const bg=await p.evaluate(()=>getComputedStyle(document.querySelector('.si-main')).backgroundColor);
check(!/255, 255, 255/.test(bg),'dark theme panel ('+bg+')');
if(SHOTS)await p.screenshot({path:path.join(SHOTS,'s4-signin-dark.png')});
await p.context().close();

// ---------- 2. the document editor is one form ----------
p=await open({single:true});
const nav=async(k)=>{await p.locator(`.sbar [data-k="${k}"]`).first().click();await p.waitForTimeout(900);};
await nav('quotes');await p.locator('.seg button',{hasText:'Draft'}).click();await p.waitForTimeout(300);await p.locator('.doc-list-tbl tbody tr.click').first().click();await p.waitForTimeout(800);
const qno=(await p.locator('.du-no').innerText()).trim();
const form=await p.evaluate(()=>{const f=document.querySelector('.doc-form');if(!f)return null;const g=f.querySelector('.line-grid-wrap').getBoundingClientRect(),ft=f.querySelector('.df-foot').getBoundingClientRect(),tb=f.querySelector('.document-toolbar').getBoundingClientRect(),u=f.querySelector('.doc-unit').getBoundingClientRect();
  return {parts:['.doc-unit','.document-toolbar','.line-grid-wrap','.df-foot','.document-dock'].every(s=>f.querySelector(':scope > '+s)),gap:Math.round(ft.top-g.bottom),gap2:Math.round(tb.top-u.bottom),cards:[...document.querySelectorAll('.doc-workspace .card')].filter(c=>!f.contains(c)&&/Internal note/.test(c.textContent)).length};});
check(form&&form.parts,'header, tabs, lines, totals and save bar sit in one form');
check(form&&Math.abs(form.gap)<=1&&Math.abs(form.gap2)<=1&&form.cards===0,'no gap between the lines and the totals ('+JSON.stringify(form)+')');
check(/all changes saved/.test(await p.locator('.document-dock').innerText()),'an untouched document says all changes are saved');
await p.locator('[data-line-id] .q-qty').first().fill('7');await p.waitForTimeout(200);
check(await p.locator('.dk-dirty').count()===1,'editing shows “Unsaved changes”');
if(SHOTS){await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:path.join(SHOTS,'s5-form.png')});}
await p.keyboard.press('Control+s');await p.waitForTimeout(400);
const saved=JSON.parse(await p.evaluate(()=>localStorage.getItem('mizan.books.v2'))).docs.find(d=>d.number===qno);
check(saved.lines[0].qty===7&&await p.locator('.dk-dirty').count()===0&&await p.locator('.doc-form').count()===1,'Ctrl+S saves and stays on the document');
await p.locator('[data-line-id] .q-qty').first().fill('9');await p.waitForTimeout(150);
await p.locator('.du-back').click();await p.waitForTimeout(250);
check(await p.locator('.studio-modal',{hasText:'Save changes to'}).count()===1,'leaving with unsaved changes asks first');
await p.locator('.studio-modal .btn',{hasText:'Keep editing'}).click();await p.waitForTimeout(200);
check(await p.locator('.doc-form').count()===1&&await p.locator('[data-line-id] .q-qty').first().inputValue()==='9','keep editing returns to the form');
await p.locator('.du-back').click();await p.waitForTimeout(250);await p.locator('.studio-modal .btn',{hasText:'Discard changes'}).click();await p.waitForTimeout(500);
const after=JSON.parse(await p.evaluate(()=>localStorage.getItem('mizan.books.v2'))).docs.find(d=>d.number===qno);
check(await p.locator('.doc-list-tbl').count()===1&&after.lines[0].qty===7,'discard leaves without saving');
await p.locator('.doc-list-tbl tbody tr.click',{hasText:qno}).click();await p.waitForTimeout(600);
await p.locator('[data-line-id] .q-qty').first().fill('8');await p.locator('.du-back').click();await p.waitForTimeout(250);
await p.locator('.studio-modal .btn',{hasText:'Save and leave'}).click();await p.waitForTimeout(500);
check(JSON.parse(await p.evaluate(()=>localStorage.getItem('mizan.books.v2'))).docs.find(d=>d.number===qno).lines[0].qty===8,'save and leave');
// posted invoice: no save bar, payments below the form
await nav('invoices');await p.locator('input[placeholder*="Search"]').first().fill('INV/2026/0286');await p.waitForTimeout(400);await p.locator('.doc-list-tbl tbody tr.click').first().click();await p.waitForTimeout(700);
check(await p.locator('.doc-form .document-dock').count()===0&&await p.locator('.doc-form + .pay-panel, .doc-workspace > .pay-panel').count()===1,'posted invoice: no save bar, payments panel follows the form');
// phone
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);
check(await p.evaluate(()=>{const r=document.querySelector('.doc-form').getBoundingClientRect();return r.right<=391&&r.left>=0&&document.documentElement.scrollWidth<=innerWidth;}),'one form fits a phone');
await p.context().close();

console.log(JSON.stringify({ok:ok.length,errors:errs},null,1));
await b.close();process.exit(errs.length?1:0);})();
