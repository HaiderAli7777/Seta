/* 3.7 reports and dashboard: KPI tiles and charts on every report, tooltips on hover and keyboard focus, new dashboard cards (needs tests/fixture.json). Run: node tests/browser-reports.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const fx=fs.readFileSync(path.join(__dirname,'fixture.json'),'utf8');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));
await p.addInitScript((fx)=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);sessionStorage.setItem('x','1');}}catch(e){}},fx);
await p.goto('file://'+path.resolve(__dirname,'../invoeez.html'));await p.waitForTimeout(1300);
const want={r_pnl:['.kpi-tile',4,'.viz-svg'],r_bs:['.kpi-tile',5,'.share-bar'],r_aged_ar:['.kpi-tile',5,'.hbars'],r_aged_ap:['.kpi-tile',5,'.hbars'],r_prod:['.kpi-tile',4,'.hbars'],r_cust:['.kpi-tile',4,'.hbars'],
 r_vat:['.kpi-tile',4,'.viz-svg'],r_stock:['.kpi-tile',4,'.share-bar'],r_tb:['.kpi-tile',4,null],r_gl:['.kpi-tile',4,'.viz-svg'],r_partner:['.kpi-tile',4,null],r_method:['.kpi-tile',4,'.share-bar'],reports:['.kpi-tile',5,null]};
for(const [k,[sel,n,chart]] of Object.entries(want)){await p.locator(`.sbar [data-k="${k}"]`).first().click();await p.waitForTimeout(500);
 const c=await p.locator('.view '+sel).count();check(c>=n,`${k}: ${c} tiles`);if(chart)check(await p.locator('.view '+chart).count()>0,`${k}: chart ${chart}`);}
await p.locator('.sbar [data-k="r_pnl"]').click();await p.waitForTimeout(400);
await p.locator('.viz-svg rect[role=button]').nth(2).hover();await p.waitForTimeout(150);check(await p.locator('.viz-tip').count()===1,'P&L chart tooltip on hover');
await p.locator('.viz-svg rect[role=button]').nth(4).focus();await p.waitForTimeout(150);check(/Revenue/.test(await p.locator('.viz-tip').innerText()),'tooltip on keyboard focus');
await p.locator('.sbar [data-k="dash"]').click();await p.waitForTimeout(500);
for(const t of ['Business health','Coming up','Sales by category'])check(await p.locator('.viz-card h3',{hasText:t}).count()===1,'dashboard card: '+t);
check(await p.locator('.revenue-card .viz-svg').count()===1,'dashboard performance chart');
console.log('OK',ok.length);console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
