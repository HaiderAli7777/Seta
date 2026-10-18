/* 3.8.2 users: create users with roles and PINs, sign out / sign-in screen, switch user from any role (PIN asked), each tab keeps its own user, books stay in step between tabs (needs tests/fixture.json). Run: node tests/browser-users.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const ctx=await b.newContext({viewport:{width:1440,height:950}});
await ctx.addInitScript((fx)=>{try{if(!localStorage.getItem('fx-loaded')){localStorage.clear();localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);localStorage.setItem('fx-loaded','1');}}catch(e){}},fx);
const open=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));await p.goto('file://'+HTML);await p.waitForTimeout(1400);return p;};
const who=async(p)=>(await p.locator('.sb-foot .who b').innerText()).trim();
const fld=(p,label)=>p.locator('.fld',{hasText:label}).locator('input');
const newUser=async(p,name,email,role,pin)=>{await p.locator('.btn.pri',{hasText:'New user'}).click();await p.waitForTimeout(200);
 await fld(p,'Full name').fill(name);await fld(p,'Work email').fill(email);await p.locator('.pick',{hasText:role}).first().click();
 if(pin)await fld(p,'Sign-in PIN').fill(pin);await p.locator('.btn.pri',{hasText:'Create user'}).click();await p.waitForTimeout(500);};
const switchTo=async(p,name,pin,via='menu')=>{if(via==='menu'){await p.locator('.userchip').click();await p.waitForTimeout(150);await p.locator('.pop-item',{hasText:'Switch user'}).click();}else await p.locator('.sb-foot .who-btn').click();
 await p.waitForTimeout(250);await p.locator('.su-row',{hasText:name}).click();await p.waitForTimeout(250);
 if(pin!=null){await p.locator('.su-pin input').fill(pin);await p.locator('.su-pin .btn.pri').click();await p.waitForTimeout(400);}};

const a=await open();
await a.locator('.sbar [data-k="users"]').first().click();await a.waitForTimeout(500);
await newUser(a,'Sara Sales','sara@example.ae','Sales');
await newUser(a,'Vera Viewer','vera@example.ae','Viewer','2468');
check(await a.locator('tr',{hasText:'Vera Viewer'}).locator('.su-lock').count()===1,'PIN shown on the user list');
check(await a.locator('tr',{hasText:'Sara Sales'}).locator('.su-lock').count()===0,'no PIN for a user without one');
const stored=JSON.parse(await a.evaluate(()=>localStorage.getItem('mizan.books.v2'))).users.find(u=>u.name==='Vera Viewer');
check(stored&&/^[sf]:[0-9a-f]+$/.test(stored.pinHash||'')&&!JSON.stringify(stored).includes('2468'),'PIN stored only as a hash');
// administrator PIN
await a.locator('tr',{hasText:'Administrator'}).locator('button[title="Edit"]').click();await a.waitForTimeout(200);
await fld(a,'Sign-in PIN').fill('12');check(await a.locator('.btn.pri',{hasText:'Save changes'}).isDisabled(),'short PIN rejected');
await fld(a,'Sign-in PIN').fill('1357');await a.locator('.btn.pri',{hasText:'Save changes'}).click();await a.waitForTimeout(400);

// sign out from the account menu: the sign-in screen lists everyone; PIN asked
await a.locator('.userchip').click();await a.waitForTimeout(150);await a.locator('.pop-item',{hasText:'Sign out'}).click();await a.waitForTimeout(500);
check(await a.locator('.signin').count()===1&&await a.locator('.sbar').count()===0,'sign out shows the sign-in screen');
check(await a.locator('.signin .su-row').count()===3,'sign-in screen lists the active users');
await a.reload();await a.waitForTimeout(1400);
check(await a.locator('.signin').count()===1,'still signed out after reload');
await a.locator('.signin .su-row',{hasText:'Administrator'}).click();await a.waitForTimeout(200);
await a.locator('.su-pin input').fill('9999');await a.locator('.su-pin .btn.pri').click();await a.waitForTimeout(400);
check(await a.locator('.signin').count()===1&&/not right/.test(await a.locator('.su-pin .form-error').innerText().catch(()=>'')),'wrong PIN keeps you on the sign-in screen');
await a.locator('.su-pin input').fill('1357');await a.locator('.su-pin .btn.pri').click();await a.waitForTimeout(800);
check(await a.locator('.signin').count()===0&&(await who(a))==='Administrator','signed in as Administrator with the PIN');
// sign out from the sidebar, sign in as a user without a PIN
await a.locator('.sb-foot .signout').click();await a.waitForTimeout(400);
await a.locator('.signin .su-row',{hasText:'Sara Sales'}).click();await a.waitForTimeout(800);
check((await who(a))==='Sara Sales','signed in as Sara straight away (no PIN)');
await a.locator('.sb-foot .signout').click();await a.waitForTimeout(400);
await a.locator('.signin .su-row',{hasText:'Administrator'}).click();await a.locator('.su-pin input').fill('1357');await a.locator('.su-pin .btn.pri').click();await a.waitForTimeout(800);
// switch to a sales user and back
await switchTo(a,'Sara Sales',null,'menu');
check((await who(a))==='Sara Sales'&&/Sales/.test(await a.locator('.sb-foot .who span').innerText()),'switched to Sara (Sales)');
check(await a.locator('.sbar [data-k="users"]').count()===0&&await a.locator('.sbar [data-k="r_pnl"]').count()===0,'sales role cannot reach users or reports');
await a.locator('.sb-foot .who-btn').click();await a.waitForTimeout(250);
check(await a.locator('.su-row',{hasText:'Administrator'}).locator('.su-lock').count()===1,'administrator asks for a PIN');
await a.locator('.su-row',{hasText:'Administrator'}).click();await a.waitForTimeout(200);
await a.locator('.su-pin input').fill('0000');await a.locator('.su-pin .btn.pri').click();await a.waitForTimeout(400);
check(/not right/.test(await a.locator('.su-pin .form-error').innerText().catch(()=>''))&&(await who(a))==='Sara Sales','wrong PIN refused');
await a.locator('.su-pin input').fill('1357');await a.locator('.su-pin .btn.pri').click();await a.waitForTimeout(500);
check((await who(a))==='Administrator'&&await a.locator('.sbar [data-k="users"]').count()===1,'back to Administrator with the right PIN, from the sidebar');
await switchTo(a,'Vera Viewer','2468');
check((await who(a))==='Vera Viewer'&&await a.locator('.sbar [data-k="r_pnl"]').count()===1&&await a.locator('.sbar [data-k="invoices"]').count()===0,'viewer sees reports only');
await switchTo(a,'Administrator','1357');

// second tab: its own user, same books
const c=await open();
check(await c.locator('.signin').count()===1,'a new tab asks who is signing in');
await c.locator('.signin .su-row',{hasText:'Sara Sales'}).click();await c.waitForTimeout(800);
check((await who(c))==='Sara Sales'&&(await who(a))==='Administrator','two tabs signed in as different users');
await a.reload();await a.waitForTimeout(1400);await c.reload();await c.waitForTimeout(1400);
check((await who(a))==='Administrator'&&(await who(c))==='Sara Sales','each tab keeps its user after reload');
await a.locator('.sbar [data-k="users"]').first().click();await a.waitForTimeout(400);
await newUser(a,'Tom Temp','tom@example.ae','Purchase clerk');
await c.waitForTimeout(600);
check(/another window/.test(await c.locator('.toasts').innerText().catch(()=>'')),'other tab is told about the change');
await c.locator('.sb-foot .who-btn').click();await c.waitForTimeout(250);
check(await c.locator('.su-row',{hasText:'Tom Temp'}).count()===1,'new user appears in the other tab without reloading');
await c.locator('.su-row',{hasText:'Administrator'}).click();await c.locator('.su-pin input').fill('1357');await c.locator('.su-pin .btn.pri').click();await c.waitForTimeout(500);
await c.locator('.sbar [data-k="users"]').first().click();await c.waitForTimeout(400);
await newUser(c,'Uma Two','uma@example.ae','Accountant');await a.waitForTimeout(600);
const names=JSON.parse(await a.evaluate(()=>localStorage.getItem('mizan.books.v2'))).users.map(u=>u.name);
check(['Tom Temp','Uma Two','Sara Sales','Vera Viewer'].every(n=>names.includes(n)),'no change lost between tabs ('+names.join(', ')+')');
check(await a.locator('tr',{hasText:'Uma Two'}).count()===1,'first tab shows the second tab’s user');
console.log('OK',ok.length);console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
