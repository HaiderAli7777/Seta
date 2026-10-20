/* 3.9: folded sidebar (hover on desktop, drawer on phone), tighter document form, IFRS 18 statement of profit or loss, account groups, multi-period comparison, drill-down to transactions and documents (needs tests/fixture.json). Run: node tests/browser-statements.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
const num=(t)=>{const s=String(t).trim();const neg=/^\(.*\)$/.test(s)||/^[−-]/.test(s);const v=+s.replace(/[^\d.]/g,'');return neg?-v:v;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const open=async(opts={},pin=true)=>{const ctx=await b.newContext({viewport:{width:1440,height:950},...opts});
 await ctx.addInitScript(([fx,pin])=>{try{if(!localStorage.getItem('fx-loaded')){localStorage.clear();localStorage.setItem('mizan.navgroups','{}');if(pin)localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.books.v2',fx);localStorage.setItem('fx-loaded','1');}}catch(e){}},[fx,pin]);
 const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));await p.goto('file://'+HTML);await p.waitForTimeout(1500);return p;};
const cells=async(p,sel,label)=>(await p.locator(sel,{hasText:label}).first().locator('td').allInnerTexts()).map(s=>s.trim());

// 1. sidebar: folded by default, opens on hover, can be pinned; drawer on phones
let p=await open({},false);
/* 3.16: folded sections stay in the page (so they can unfold smoothly) but are hidden and out of reach */
check(await p.locator('.sbar.rail').count()===1&&!(await p.locator('.sbar [data-k="r_pnl"]').isVisible())&&await p.locator('.sbar [data-k="r_pnl"]').evaluate(e=>!!e.closest('[inert]')),'sidebar starts folded');
await p.mouse.move(30,320);await p.waitForTimeout(500);
check(await p.locator('.sbar.peek').count()===1&&await p.locator('.sbar .sb-search').isVisible(),'hovering opens the full menu');
const mainX=await p.evaluate(()=>document.querySelector('.main').getBoundingClientRect().left);
check(mainX>250,'the open menu sits beside the page instead of covering it ('+Math.round(mainX)+')');
await p.mouse.move(900,400);await p.waitForTimeout(600);
check(await p.locator('.sbar.rail').count()===1,'moving away folds it again');
await p.mouse.move(30,320);await p.waitForTimeout(500);await p.locator('.sb-foot .collapse').click();await p.mouse.move(900,400);await p.waitForTimeout(500);
check(await p.locator('.sbar.rail').count()===0&&(await p.evaluate(()=>localStorage.getItem('mizan.sidebar')))==='pinned','pin keeps it open');
await p.context().close();
p=await open({viewport:{width:390,height:844}},false);
check(await p.evaluate(()=>document.querySelector('.sbar').getBoundingClientRect().right<=1),'phone: menu hidden until asked');
await p.locator('.burger').click();await p.waitForTimeout(450);
check(await p.locator('.sbar.open').count()===1&&await p.locator('.sbar [data-k="r_pnl"]').count()>0,'phone: menu button opens the full menu');
await p.context().close();

// 2. document form: no layout switch, one Add line, tight header
p=await open();
await p.locator('.sb-row:has([data-k="quotes"]) .sb-add').click();await p.waitForTimeout(900);
check(await p.locator('.line-view-switch').count()===0,'Compact / Detailed switch removed');
check(await p.locator('.document-dock button',{hasText:'Add line'}).count()===0&&await p.locator('button',{hasText:'Add a line'}).count()===1,'only one Add line, in the grid');
const gap=await p.evaluate(()=>{const h=document.querySelector('.doc-unit'),t=h.querySelector('h1').getBoundingClientRect(),f=h.querySelector('.document-fields').getBoundingClientRect();return {top:Math.round(t.top-h.getBoundingClientRect().top),gap:Math.round(f.top-t.bottom)};});
check(gap.top<=60&&gap.gap<=130,'tight header ('+JSON.stringify(gap)+')');
check(!/— journal/i.test(await p.locator('.doc-unit .du-kind').innerText()),'no empty journal label on quotations');
await p.context().close();

// 3. IFRS 18 statement of profit or loss
p=await open();
await p.locator('.sbar [data-k="r_pnl"]').first().click();await p.waitForTimeout(1500);
const cats=await p.locator('.fin-tbl tr.fin-cat span').allInnerTexts();
check(['Operating','Investing','Financing'].every(c=>cats.map(x=>x.toLowerCase()).includes(c.toLowerCase())),'IFRS 18 categories ('+cats.join(', ')+')');
const sub=async(l)=>num((await cells(p,'.fin-tbl tr.fin-sub, .fin-tbl tr.fin-total',l))[1]);
const op=await sub('Operating profit'),pbfit=await sub('Profit before financing'),net=await sub('for the period');
const finc=num((await cells(p,'.fin-tbl tr.fin-sec','Finance costs'))[1]);
check(Math.abs(pbfit+finc-net)<0.011,'operating → before financing → profit adds up ('+op+' / '+pbfit+' / '+net+')');
check(/made a (profit|loss) of AED/.test(await p.locator('.insight').innerText())&&(await p.locator('.insight').innerText()).includes(Math.abs(net).toLocaleString('en-US',{minimumFractionDigits:2})),'summary matches the statement');
check(await p.locator('.ifrs-note-card h4',{hasText:'EBITDA'}).count()===1&&await p.locator('.ifrs-note-card h4',{hasText:'Specified expenses by nature'}).count()===1,'IFRS 18 notes: MPM reconciliation and expenses by nature');
// groups fold
const staffRows=await p.locator('.fin-tbl tr.fin-acc',{hasText:'Salaries & Wages'}).count();
await p.locator('.fin-tbl tr.fin-grp',{hasText:'Employee benefits'}).locator('.fin-tog').click();await p.waitForTimeout(200);
check(staffRows===1&&await p.locator('.fin-tbl tr.fin-acc',{hasText:'Salaries & Wages'}).count()===0,'groups fold shut');
await p.locator('.fin-tools button',{hasText:'Expand all'}).click();await p.waitForTimeout(200);
check(await p.locator('.fin-tbl tr.fin-acc',{hasText:'Salaries & Wages'}).count()===1,'expand all');

// 4. drill-down: account → transactions → invoice, and back
const revGoods=num((await cells(p,'.fin-tbl tr.fin-acc','Revenue — Goods'))[1]);
await p.locator('.fin-tbl tr.fin-acc',{hasText:'Revenue — Goods'}).locator('.fin-name').click();await p.waitForTimeout(1300);
check(await p.locator('.drill-trail .crumb',{hasText:'Profit or loss'}).count()===1,'breadcrumb back to the report');
const glFoot=(await p.locator('.gl-tbl tfoot td').allInnerTexts()).map(s=>s.trim());
check(Math.abs(num(glFoot[2])-num(glFoot[1])-revGoods)<0.011,'transactions add up to the amount clicked ('+revGoods+')');
const firstDoc=(await p.locator('.gl-row .gl-doc .mono').first().innerText()).trim();
await p.locator('.gl-row').first().click();await p.waitForTimeout(1300);
check((await p.locator('.doc-unit h1').innerText()).includes(firstDoc),'a transaction opens its invoice ('+firstDoc+')');
check(await p.locator('.drill-trail .crumb').count()===2,'trail: report › account › document');
await p.locator('.drill-trail .crumb',{hasText:'Profit or loss'}).click();await p.waitForTimeout(1200);
check(await p.locator('.fin-tbl').count()===1&&await p.locator('.drill-trail').count()===0,'back to the statement');
// a journal entry opens in a window
await p.locator('.fin-tbl tr.fin-acc',{hasText:'Salaries & Wages'}).locator('.fin-name').click();await p.waitForTimeout(1200);
const openTxt=(await p.locator('.gl-tbl tbody tr.sub td').last().innerText()).trim();
check(num(openTxt)===0,'expense accounts start the year at zero ('+openTxt+')');
await p.locator('.gl-row').first().click();await p.waitForTimeout(600);
check(await p.locator('.studio-modal, .studio-overlay').count()>0&&/balanced/.test(await p.locator('.studio-overlay').innerText()),'journal entry shown with all its lines');
await p.keyboard.press('Escape');await p.waitForTimeout(300);if(await p.locator('.studio-overlay').count())await p.locator('.studio-overlay .btn',{hasText:'Close'}).click();

// 5. multi-period comparison, oldest first
await p.locator('.drill-trail .back').click();await p.waitForTimeout(1000);
await p.locator('.rframe .acts .btn',{hasText:/Year to date|—/}).first().click();await p.waitForTimeout(200);await p.locator('.rp-item',{hasText:'This month'}).click();await p.waitForTimeout(600);
await p.locator('.cmp-btn').click();await p.waitForTimeout(200);for(let i=0;i<2;i++){await p.locator('.stepper button[aria-label="More periods"]').click();await p.waitForTimeout(80);}
await p.locator('.cmp-more .seg button',{hasText:'Oldest first'}).click();await p.mouse.click(5,600);await p.waitForTimeout(1000);
const heads=await p.locator('.fin-tbl thead th').allInnerTexts();
check(heads.length===5&&/3 previous periods/.test(await p.locator('.cmp-btn').innerText()),'three earlier months side by side ('+heads.slice(1).map(h=>h.split('\n')[0]).join(' | ')+')');
const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],mi=(h)=>M.map(x=>x.toUpperCase()).indexOf(h.trim().slice(0,3).toUpperCase());
check(mi(heads[1])<mi(heads[4])&&mi(heads[4])===new Date().getMonth(),'oldest first, this month last');
check(await p.locator('.viz-card h3',{hasText:'Across the compared periods'}).count()===1,'trend across the periods');

// 6. account groups: a Petty cash group inside Cash and cash equivalents, a new account, IFRS category
await p.locator('.sbar [data-k="acct_groups"]').first().click();await p.waitForTimeout(800);
const cashRow=p.locator('.agp-row.grp',{hasText:'Cash and cash equivalents'});
await cashRow.hover();await cashRow.locator('button[title="Add a sub-group"]').click();await p.waitForTimeout(200);
await p.locator('.studio-form input').first().fill('Petty cash');await p.locator('.btn.pri',{hasText:'Add group'}).click();await p.waitForTimeout(300);
check(await p.locator('.agp-row.grp',{hasText:'Petty cash'}).count()===1,'sub-group created');
await p.locator('.agp-row.acc',{hasText:'Cash on Hand'}).locator('select.agp-sel:not(.cat)').selectOption({label:'        Petty cash'}).catch(async()=>{const v=await p.evaluate(()=>{const s=[...document.querySelectorAll('.agp-row.acc')].find(r=>/Cash on Hand/.test(r.textContent)).querySelector('select.agp-sel:not(.cat)');return [...s.options].find(o=>/Petty cash/.test(o.textContent)).value;});await p.locator('.agp-row.acc',{hasText:'Cash on Hand'}).locator('select.agp-sel:not(.cat)').selectOption(v);});
await p.waitForTimeout(300);
const pcRow=p.locator('.agp-row.grp',{hasText:'Petty cash'});await pcRow.hover();await pcRow.locator('button[title="Create a new account in this group"]').click();await p.waitForTimeout(200);
await p.locator('.studio-form input').nth(0).fill('1115');await p.locator('.studio-form input').nth(1).fill('Petty cash — Head office');await p.locator('.btn.pri',{hasText:'Create account'}).click();await p.waitForTimeout(400);
const st=JSON.parse(await p.evaluate(()=>localStorage.getItem('mizan.books.v2')));
const pg=(st.accountGroups||[]).find(g=>g.name==='Petty cash');
check(pg&&pg.parent==='g_cash'&&pg.accounts.includes('1110')&&pg.accounts.includes('1115')&&st.accounts.some(a=>a.code==='1115'),'Petty cash holds Cash on Hand and the new Head office account');
await p.locator('.sbar [data-k="r_bs"]').first().click();await p.waitForTimeout(1500);
const order=await p.evaluate(()=>[...document.querySelectorAll('.fin-tbl tbody tr')].map(r=>r.textContent.trim().slice(0,40)));
const ic=order.findIndex(t=>t.startsWith('Cash and cash equivalents')),ip=order.findIndex(t=>t.startsWith('Petty cash')),ih=order.findIndex(t=>/Cash on Hand/.test(t));
check(ic>=0&&ip>ic&&ih>ip,'balance sheet shows Assets › Current assets › Cash and cash equivalents › Petty cash › Cash on Hand');
const ta=await cells(p,'.fin-tbl tr.fin-sub','Total assets'),tel=await cells(p,'.fin-tbl tr.fin-total','Total equity and liabilities');
check(ta.slice(1).every((v,i)=>Math.abs(num(v)-num(tel[i+1]))<0.011),'financial position balances on every date');
await p.locator('.fin-tbl tr.fin-acc',{hasText:'Cash on Hand'}).locator('.fin-name').click();await p.waitForTimeout(1200);
check(await p.locator('.drill-trail .crumb',{hasText:'Financial position'}).count()===1&&/Cash on Hand/.test(await p.locator('.rf-chips').innerText()),'balance sheet drills into the account');
// IFRS category moves a line, not the profit
await p.locator('.sbar [data-k="acct_groups"]').first().click();await p.waitForTimeout(700);
await p.locator('.agp-tabs button',{hasText:'profit or loss'}).click();await p.waitForTimeout(300);
await p.locator('.agp-row.acc',{hasText:'Marketing & Advertising'}).locator('select.cat').selectOption('investing');await p.waitForTimeout(300);
await p.locator('.sbar [data-k="r_pnl"]').first().click();await p.waitForTimeout(1500);
await p.locator('.cmp-btn').click();await p.waitForTimeout(200);await p.locator('.cmp-opt',{hasText:"Don't compare"}).click();await p.waitForTimeout(600);
await p.locator('.rframe .acts .btn',{hasText:/This month|—/}).first().click();await p.waitForTimeout(200);await p.locator('.rp-item',{hasText:'Year to date'}).click();await p.waitForTimeout(1000);
check(await p.locator('.fin-tbl tr.fin-sec',{hasText:'Investing'}).count()===1&&await p.locator('.fin-tbl tr.fin-acc',{hasText:'Marketing & Advertising'}).count()===1,'Marketing now reported under investing');
// trial balance drills too
await p.locator('.sbar [data-k="r_tb"]').first().click();await p.waitForTimeout(1200);
await p.locator('.tbl tr.fin-acc',{hasText:'Accounts Receivable'}).locator('.fin-name').click();await p.waitForTimeout(1200);
check(await p.locator('.drill-trail .crumb',{hasText:'Trial balance'}).count()===1,'trial balance drills into transactions');
console.log('OK',ok.length);console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
