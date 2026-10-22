/* 3.24 dashboard laid out like a document: header with the period, its status and net profit; progress through the period with the actions;
   key figures as fields; tabs (performance, money, products & customers, activity, financial detail) with counts and tools; period-by-period
   lines with a total; summary beside a profit & loss totals panel; the bar at the foot. Plus the 3.8 checks: figures match the plain-words
   summary, rankings, count-up and entrance motion, drill-downs, reduced motion, dark theme; and the five colour themes.
   Needs tests/fixture.json. Run: node tests/browser-dashboard.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
const SHOTS=process.env.SHOTS;
const num=(t)=>{const s=String(t).replace(/[−–]/g,'-');const neg=/^\s*\(.*\)\s*$/.test(s)||/-\s*[\d]/.test(s);const v=+s.replace(/[^\d.]/g,'');return neg?-v:v;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const open=async(opts={},init={})=>{const p=await (await b.newContext({viewport:{width:1440,height:1000},...opts})).newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));
 await p.addInitScript(([fx,init])=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);
   for(const [k,v] of Object.entries(init))localStorage.setItem(k,v);if(init['mizan.me'])sessionStorage.setItem('mizan.me',init['mizan.me']);sessionStorage.setItem('x','1');}}catch(e){}},[init.fx||fx,init]);
 await p.goto('file://'+HTML);await p.waitForTimeout(2600);return p;};
const names=['dashRise','barGrow','barGrowX','lineDraw','reveal','dsBar'];
const running=(p)=>p.evaluate((names)=>document.getAnimations().filter(a=>names.includes(a.animationName)&&a.playState==='running').length,names);
const back=async(p)=>{await p.locator('.sbar [data-k="r_pnl"]').first().click();await p.waitForTimeout(400);await p.locator('.sbar [data-k="dash"]').first().click();};
const tab=async(p,k)=>{await p.locator(`.ds-toolbar [data-tab="${k}"]`).click();await p.waitForTimeout(900);};
const shot=async(p,n)=>{if(SHOTS){await p.mouse.move(2,500);await p.waitForTimeout(300);await p.screenshot({path:path.join(SHOTS,n+'.png')});}};

const p=await open();
// ---- one sheet, read like a document ----
check(await p.locator('.ds-sheet').count()===1&&await p.locator('.ds-sheet > .ds-top .ds-head').count()===1,'the dashboard is one sheet with a header, like a document');
const title=(await p.locator('.ds-title').innerText()).trim();
check(title===new Date().getFullYear()+' so far'||/^\d{4} so far$/.test(title),'the header names the period ('+title+')');
check(/Books balanced/.test(await p.locator('.ds-state').innerText()),'status pill: books balanced');
const text=await p.locator('.ds-sheet').innerText();
const m=/(profit|loss) of AED ([\d,.]+)/.exec(text);
const heroNet=num(await p.locator('.ds-net .countup').innerText());
check(m&&Math.abs(Math.abs(heroNet)-num(m[2]))<0.006,'net profit sits where an invoice shows its total, and matches the summary ('+heroNet+')');
check(await p.locator('.ds-bars span').count()>=3,'with net profit period by period underneath');
const steps=await p.locator('.ds-steps li').evaluateAll(els=>els.map(e=>e.className+':'+e.innerText.replace(/\s+/g,' ').trim()));
check(steps.length===4&&steps.slice(0,3).every(s=>/^done/.test(s))&&/^now:4 Q4 \d+%$/.test(steps[3]),'progress through the year: Q1–Q3 done, Q4 under way ('+steps.join(' | ')+')');
check(await p.locator('.ds-acts .btn.pri',{hasText:'New invoice'}).count()===1&&await p.locator('.ds-seg button.on').innerText()==='Year','actions beside the progress: period and New invoice');
await p.locator('.ds-more .btn').click();await p.waitForTimeout(200);
const more=await p.locator('.ds-menu [role=menuitem]').allInnerTexts();
check(['New vendor bill','Receive a payment','Count stock','All reports','Print the dashboard'].every(x=>more.includes(x)),'More holds the other actions ('+more.join(', ')+')');
await p.keyboard.press('Escape');await p.mouse.click(5,990);await p.waitForTimeout(200);
// ---- key figures as fields ----
const fields=await p.locator('.ds-fields .ds-field .ds-fl').allInnerTexts();
check(fields.length===8&&['Sales','Costs & expenses','Gross profit','Cash & bank','To collect','To pay','Stock value'].every((x,i)=>fields[i].trim()===x)&&/^VAT (due|refund) this quarter$/.test(fields[7].trim()),'eight key figures, each a labelled field ('+fields.join(', ')+')');
const sales=num(await p.locator('.ds-fields .ds-field').first().locator('.ds-val').innerText());
check(/sold AED ([\d,.]+)/.test(text)&&Math.abs(sales-num(/sold AED ([\d,.]+)/.exec(text)[1]))<0.006,'Sales field counted up to the summary figure');
check(await p.locator('.ds-field .ds-trend .kt-spark').count()===4&&await p.locator('.ds-field .ds-meter').count()===3,'trend lines under the money figures, meters under the balances');
check(/overdue/.test(await p.locator('.ds-field',{hasText:'To collect'}).locator('.ds-hint').innerText()),'To collect says how much is overdue');
await shot(p,'dash-01-top');
// ---- totals and foot ----
const tot=await p.locator('.ds-totals').innerText();
check(/Sales/.test(tot)&&/Cost of sales/.test(tot)&&/Gross profit/.test(tot)&&/Operating expenses/.test(tot)&&Math.abs(num(await p.locator('.ds-totals .sumrow.total .v').innerText())-heroNet)<0.006,'profit & loss set out like an invoice\'s totals, ending on net profit');
check(Math.abs(num(await p.locator('.ds-totals .sumrow').first().locator('.v').innerText())-sales)<0.006,'its Sales line equals the Sales field');
check(await p.locator('.ds-dock').count()===1&&Math.abs(num(await p.locator('.ds-dk-t b').innerText())-heroNet)<0.006&&await p.evaluate(()=>getComputedStyle(document.querySelector('.ds-dock')).position)==='sticky','a bar stays at the foot of the screen with net profit');
// ---- tabs ----
const tabs=await p.locator('.ds-toolbar [role=tab]').evaluateAll(els=>els.map(e=>e.getAttribute('data-tab')+(e.getAttribute('aria-selected')==='true'?'*':'')));
check(tabs.join(',')==='perf*,money,items,activity,detail','five tabs, Performance first ('+tabs.join(',')+')');
check(/^\d+$/.test(await p.locator('.ds-toolbar [data-tab="money"] > span').innerText()),'Money in & out shows how many invoices are overdue');
const card=(t)=>p.locator('.viz-card, .card',{has:p.locator('h3',{hasText:t})}).first();
for(const t of ['Revenue & costs','Business health','Sales by category','Month by month'])check(await card(t).count()===1,'Performance: '+t);
const lines=await p.locator('.ds-lines tbody tr').count();
check(lines>=1&&lines<=12&&Math.abs(num(await p.locator('.ds-lines tfoot td').nth(2).innerText())-sales)<0.006,'month-by-month lines with a total that equals sales ('+lines+' months)');
check(Math.abs(num(await p.locator('.ds-lines tfoot td').nth(5).innerText())-heroNet)<0.006,'and the lines\' net profit adds up to the header');
await p.locator('.ds-toolbar .acts .seg button',{hasText:'Week'}).click();await p.waitForTimeout(700);
check(/^Week by week/.test(await card('by week').locator('h3').innerText().catch(()=>''))||await p.locator('h3',{hasText:'Week by week'}).count()===1,'the tab\'s tools regroup the chart and lines by week');
await p.locator('.ds-toolbar .acts .seg button',{hasText:'Month'}).click();await p.waitForTimeout(500);
await tab(p,'money');
for(const t of ['Money to collect','Coming up','Cash movement'])check(await card(t).count()===1,'Money in & out: '+t);
await shot(p,'dash-02-money');
await tab(p,'items');
for(const t of ['Fast-moving items','Slow-moving items','Top customers'])check(await card(t).count()===1,'Products & customers: '+t);
const fastUnits=(await card('Fast-moving items').locator('.mv-side b').allInnerTexts()).map(num);
check(fastUnits.length>=3&&fastUnits.every((v,i)=>!i||v<=fastUnits[i-1]),'fast movers ranked by units ('+fastUnits.join(',')+')');
const slowTags=await card('Slow-moving items').locator('.mv-side em').allInnerTexts();
check(slowTags.length>=1&&slowTags.every(t=>/days of stock|Not moving/.test(t)),'slow movers show days of stock / not moving');
check(await card('Slow-moving items').locator('.share-bar').count()===1,'stock value split by movement');
const custVals=(await card('Top customers').locator('.mv-side b').allInnerTexts()).map(num);
check(custVals.length>=3&&custVals.every((v,i)=>!i||v<=custVals[i-1]),'top customers ranked by net sales');
check(await card('Top customers').locator('.mv-medal.m0').count()===1,'gold medal for the top customer');
check((await card('Top customers').locator('.mv-side em').allInnerTexts()).every(t=>/overdue|open|Paid up/.test(t)),'customer balance chip');
await tab(p,'activity');
check(await card('Recent transactions').locator('tbody tr').count()>=6,'Activity: the latest documents');
await tab(p,'detail');
check(await p.locator('.ds-pane.detail').count()===1&&await p.locator('.ds-head').count()===1&&await p.locator('.ds-fields').count()===1,'Financial detail opens inside the sheet, under the same header');
const cashField=num(await p.locator('.ds-field',{hasText:'Cash & bank'}).locator('.ds-val').innerText()),legacy=/Cash balance\s*AED ([\d,.]+)/.exec(await p.locator('.ds-pane.detail').innerText());
check(legacy&&Math.abs(num(legacy[1])-cashField)<0.006&&await p.locator('.ds-pane.detail .hero').isHidden(),'its cash balance counts every bank and cash account, as the Cash & bank figure does ('+cashField+'), without a second greeting');
await p.reload();await p.waitForTimeout(2200);
check(await p.locator('.ds-toolbar [data-tab="detail"][aria-selected="true"]').count()===1,'the chosen tab is remembered');
await tab(p,'items');

// ---- motion: numbers count up and sections rise when the dashboard opens ----
await back(p);await p.waitForTimeout(120);
const mid=num(await p.locator('.ds-net .countup').innerText()),run=await running(p);
check(run>8,'entrance animations running ('+run+')');
check(Math.abs(mid)<Math.abs(heroNet),'net profit is counting up ('+mid+' → '+heroNet+')');
await p.waitForTimeout(2400);
check(Math.abs(num(await p.locator('.ds-net .countup').innerText())-heroNet)<0.006,'count-up settles on the exact figure');

// ---- period: the seg, and a step of the progress ----
await p.locator('.ds-seg button',{hasText:/^Month$/}).click();await p.waitForTimeout(1600);
const mtdSub=await card('Fast-moving items').locator('header p').innerText();
check(/01 [A-Z][a-z]{2} \d{4}/.test(mtdSub)&&/^Most units sold · 01 /.test(mtdSub),'fast movers follow the period ('+mtdSub+')');
check(/^[A-Z][a-z]+ \d{4}$/.test((await p.locator('.ds-title').innerText()).trim())&&await p.locator('.ds-steps li').count()>=4,'Month: titled by the month, progress by week');
await p.locator('.ds-seg button',{hasText:/^Year$/}).click();await p.waitForTimeout(1200);
await p.locator('.ds-steps li').nth(1).locator('button').click();await p.waitForTimeout(1400);
check(/^Q2 \d{4}$/.test((await p.locator('.ds-title').innerText()).trim())&&(await p.locator('.ds-steps li').allInnerTexts()).length===3,'clicking Q2 shows that quarter, its months as the progress');
const q2Sales=num(await p.locator('.ds-fields .ds-field').first().locator('.ds-val').innerText());
await p.waitForTimeout(1200);
check(num(await p.locator('.ds-fields .ds-field').first().locator('.ds-val').innerText())<sales,'and its figures ('+q2Sales+')');
await p.locator('.ds-seg button',{hasText:/^Year$/}).click();await p.waitForTimeout(1400);

// ---- drill-downs ----
const firstCust=(await card('Top customers').locator('.mv-main b').first().innerText()).trim();
await card('Top customers').locator('.mv-row').first().click();await p.waitForTimeout(700);
check(await p.locator('.ds-sheet').count()===0&&(await p.locator('.page').innerText()).includes(firstCust),'top customer opens their ledger');
await p.locator('.sbar [data-k="dash"]').first().click();await p.waitForTimeout(1500);
const firstProd=(await card('Fast-moving items').locator('.mv-main b').first().innerText()).trim();
await card('Fast-moving items').locator('.mv-row').first().click();await p.waitForTimeout(700);
check(await p.locator('.ds-sheet').count()===0&&(await p.locator('body').innerText()).includes(firstProd),'fast mover opens the product');
await p.keyboard.press('Escape');await p.waitForTimeout(300);if(await p.locator('.studio-overlay').count())await p.locator('.studio-overlay').click({position:{x:5,y:5}});await p.waitForTimeout(300);
await p.locator('.sbar [data-k="dash"]').first().click();await p.waitForTimeout(900);
await p.locator('.ds-field',{hasText:'To collect'}).click();await p.waitForTimeout(800);
check(/Aged receivable|Receivable/i.test(await p.locator('.page').innerText())&&await p.locator('.ds-sheet').count()===0,'a key figure opens its report');

// ---- reduced motion: everything is still and exact straight away ----
const q=await open({reducedMotion:'reduce'});await back(q);await q.waitForTimeout(120);
check(await running(q)===0,'no motion when reduced motion is requested');
check(Math.abs(num(await q.locator('.ds-net .countup').innerText())-heroNet)<0.006,'exact figure immediately with reduced motion');

// ---- dark theme and the five colour themes ----
const d=await open({colorScheme:'dark'},{'mizan.theme':'dark'});
check(await d.locator('.mz[data-theme="dark"] .ds-head').count()===1,'dark theme dashboard');
await shot(d,'dash-03-dark');
const heroes=new Set();
for(const a of ['ocean','teal','royal','graphite','desert']){const t=await open({},{'mizan.accent':a});
  const bg=await t.evaluate(()=>getComputedStyle(document.querySelector('.ds-head')).backgroundImage);heroes.add(bg);
  if(a==='desert')await shot(t,'dash-04-desert');
  await t.context().close();}
check(heroes.size===5,'each of the five colour themes gives the header its own gradient');

// ---- someone who may only look: no New invoice ----
const st=JSON.parse(fx);st.users=[...(st.users||[]),{id:'uv',name:'Vic Viewer',role:'viewer',active:true}];
const v=await open({},{fx:JSON.stringify(st),'mizan.me':'uv'});
check(await v.locator('.ds-sheet').count()===1&&await v.locator('.ds-acts .btn.pri',{hasText:'New invoice'}).count()===0,'a viewer sees the dashboard without New invoice');
console.log('OK',ok.length);console.log('ERR',errs);if(process.env.VERBOSE)console.log(ok.join('\n'));await b.close();process.exit(errs.length?1:0);})();
