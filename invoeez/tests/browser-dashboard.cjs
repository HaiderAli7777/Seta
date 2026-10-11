/* 3.8 animated dashboard: hero, KPI tiles, fast/slow-moving items, top customers, count-up and entrance motion, reduced motion (needs tests/fixture.json). Run: node tests/browser-dashboard.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
const num=(t)=>+String(t).replace(/[^\d.-]/g,'');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const open=async(opts={})=>{const p=await (await b.newContext({viewport:{width:1440,height:1000},...opts})).newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));
 await p.addInitScript((fx)=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);sessionStorage.setItem('x','1');}}catch(e){}},fx);
 await p.goto('file://'+HTML);await p.waitForTimeout(2600);return p;};
const names=['dashRise','barGrow','barGrowX','lineDraw','reveal'];
const running=(p)=>p.evaluate((names)=>document.getAnimations().filter(a=>names.includes(a.animationName)&&a.playState==='running').length,names);
const back=async(p)=>{await p.locator('.sbar [data-k="r_pnl"]').first().click();await p.waitForTimeout(400);await p.locator('.sbar [data-k="dash"]').first().click();};

const p=await open();
check(await p.locator('.dash-hero').count()===1,'hero banner');
check(await p.locator('.dash-kpis .kpi-tile').count()===5,'five KPI tiles');
for(const t of ['Fast-moving items','Slow-moving items','Top customers','Business health','Coming up','Sales by category'])check(await p.locator('.viz-card h3',{hasText:t}).count()===1,'card: '+t);
const card=(t)=>p.locator('.viz-card',{has:p.locator('h3',{hasText:t})});
const summary=await p.locator('.plain-summary, .summary-line').first().innerText().catch(()=>'');
const heroNet=num(await p.locator('.dh-main b .countup').innerText());
const m=/(profit|loss) of AED ([\d,.]+)/.exec(await p.locator('.studio-dashboard').innerText());
check(m&&Math.abs(Math.abs(heroNet)-num(m[2]))<0.006,'hero net profit matches the plain-English summary ('+heroNet+')');
const sales=num(await p.locator('.dash-kpis .kpi-tile').first().locator('.kt-value').innerText());
check(m&&/sold AED ([\d,.]+)/.test(await p.locator('.studio-dashboard').innerText())&&Math.abs(sales-num(/sold AED ([\d,.]+)/.exec(await p.locator('.studio-dashboard').innerText())[1]))<0.006,'Sales tile counted up to the summary figure');
const fastUnits=(await card('Fast-moving items').locator('.mv-side b').allInnerTexts()).map(num);
check(fastUnits.length>=3&&fastUnits.every((v,i)=>!i||v<=fastUnits[i-1]),'fast movers ranked by units ('+fastUnits.join(',')+')');
const slowTags=await card('Slow-moving items').locator('.mv-side em').allInnerTexts();
check(slowTags.length>=1&&slowTags.every(t=>/days of stock|Not moving/.test(t)),'slow movers show days of stock / not moving');
check(await card('Slow-moving items').locator('.share-bar').count()===1,'stock value split by movement');
const custVals=(await card('Top customers').locator('.mv-side b').allInnerTexts()).map(num);
check(custVals.length>=3&&custVals.every((v,i)=>!i||v<=custVals[i-1]),'top customers ranked by net sales');
check(await card('Top customers').locator('.mv-medal.m0').count()===1,'gold medal for the top customer');
const custTags=await card('Top customers').locator('.mv-side em').allInnerTexts();
check(custTags.every(t=>/overdue|open|Paid up/.test(t)),'customer balance chip');

// motion: numbers count up and cards rise when the dashboard opens
await back(p);await p.waitForTimeout(120);
const mid=num(await p.locator('.dh-main b .countup').innerText()),run=await running(p);
check(run>10,'entrance animations running ('+run+')');
check(Math.abs(mid)<Math.abs(heroNet),'net profit is counting up ('+mid+' → '+heroNet+')');
await p.waitForTimeout(2200);
check(Math.abs(num(await p.locator('.dh-main b .countup').innerText())-heroNet)<0.006,'count-up settles on the exact figure');
check(await running(p)===0,'animations finish');

// period switch re-scopes the movers
await p.locator('.dh-seg button',{hasText:/^Month$/}).click();await p.waitForTimeout(1600);
const mtdSub=await card('Fast-moving items').locator('header p').innerText();
check(/01 [A-Z][a-z]{2} \d{4}/.test(mtdSub)&&/^Most units sold · 01 /.test(mtdSub),'fast movers follow the period ('+mtdSub+')');
await p.locator('.dh-seg button',{hasText:/^Year$/}).click();await p.waitForTimeout(1600);

// drill-downs
const firstCust=(await card('Top customers').locator('.mv-main b').first().innerText()).trim();
await card('Top customers').locator('.mv-row').first().click();await p.waitForTimeout(700);
check(await p.locator('.dash-hero').count()===0&&(await p.locator('.page').innerText()).includes(firstCust),'top customer opens their ledger');
await p.locator('.sbar [data-k="dash"]').first().click();await p.waitForTimeout(1500);
const firstProd=(await card('Fast-moving items').locator('.mv-main b').first().innerText()).trim();
await card('Fast-moving items').locator('.mv-row').first().click();await p.waitForTimeout(700);
check(await p.locator('.dash-hero').count()===0&&(await p.locator('body').innerText()).includes(firstProd),'fast mover opens the product');
await p.keyboard.press('Escape');await p.waitForTimeout(300);if(await p.locator('.studio-overlay').count())await p.locator('.studio-overlay').click({position:{x:5,y:5}});await p.waitForTimeout(300);
await p.locator('.sbar [data-k="dash"]').first().click();await p.waitForTimeout(600);
await p.locator('.dh-seg button',{hasText:'Financial detail'}).click();await p.waitForTimeout(600);
check(await p.locator('.dash-kpis').count()===0&&await p.locator('.dash-hero').count()===1,'financial detail view keeps the hero');

// reduced motion: everything is still and exact straight away
const q=await open({reducedMotion:'reduce'});await back(q);await q.waitForTimeout(120);
check(await running(q)===0,'no motion when reduced motion is requested');
check(Math.abs(num(await q.locator('.dh-main b .countup').innerText())-heroNet)<0.006,'exact figure immediately with reduced motion');

// dark theme renders without errors
const d=await open({colorScheme:'dark'});await d.evaluate(()=>{localStorage.setItem('mizan.theme','dark');});await d.reload();await d.waitForTimeout(2000);
check(await d.locator('.mz[data-theme="dark"] .dash-hero').count()===1,'dark theme dashboard');
console.log('OK',ok.length);console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
