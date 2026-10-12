/* 3.8.1 report comparison: Compare with previous period / same period last year / custom dates on P&L, balance sheet and profitability; notes when the books don't cover it (needs tests/fixture.json). Run: node tests/browser-compare.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
const num=(t)=>{const s=String(t).trim();const neg=/^\(.*\)$/.test(s)||/^[−-]/.test(s);const v=+s.replace(/[^\d.]/g,'');return neg?-v:v;};
const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const iso=(d)=>{const m=/(\d\d) (\w{3}) (\d{4})/.exec(d);return `${m[3]}-${String(M.indexOf(m[2])+1).padStart(2,'0')}-${m[1]}`;};
const dmy=(dt)=>`${String(dt.getUTCDate()).padStart(2,'0')} ${M[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));
await p.addInitScript((fx)=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);sessionStorage.setItem('x','1');}}catch(e){}},fx);
await p.goto('file://'+HTML);await p.waitForTimeout(1500);
const nav=async(k)=>{await p.locator(`.sbar [data-k="${k}"]`).first().click();await p.waitForTimeout(1300);};
const chip=async()=>(await p.locator('.rf-chips span.cmp').count())?(await p.locator('.rf-chips span.cmp').innerText()).trim():'';
const pick=async(label)=>{await p.locator('.cmp-btn').click();await p.waitForTimeout(200);await p.locator('.cmp-opt',{hasText:label}).click();await p.waitForTimeout(900);};
const rowCells=async(sel,label)=>(await p.locator(sel,{hasText:label}).first().locator('td').allInnerTexts()).map(s=>s.trim());

// 1. year to date: the earlier year is before the books — say so and offer periods that work
await nav('r_pnl');
check(await p.locator('.cmp-btn').count()===1&&/Previous period/.test(await p.locator('.cmp-btn').innerText()),'Compare control on the P&L, previous period by default');
const note=await p.locator('.cmp-note.none').innerText().catch(()=>'');
check(/Nothing to compare with yet/.test(note)&&/01 Nov 2025/.test(note),'explains that the comparison period predates the books');
check(await p.locator('.cmp-ideas button').count()>=1,'offers periods the books cover');
check(await p.locator('.cmp-tbl').count()===0&&await p.locator('.kt-delta').count()===0,'no empty comparison columns');

// 2. one click: this quarter vs last quarter
await p.locator('.cmp-ideas button',{hasText:'This quarter vs last quarter'}).click();await p.waitForTimeout(1300);
const c1=await chip();check(/^vs 01 \w{3} \d{4} – \d\d \w{3} \d{4}$/.test(c1),'comparison chip in the heading ('+c1+')');
check(await p.locator('.cmp-tbl').count()===1,'comparative statement table');
check(await p.locator('.kt-delta').count()>=4,'KPI tiles show the change');
check(await p.locator('.viz-card h3',{hasText:'This period vs comparison'}).count()===1&&await p.locator('.pair-row').count()===5,'this period vs comparison bars');
check(await p.locator('.viz-card h3',{hasText:'Biggest changes'}).count()===1,'biggest changes card');
check(/Compared with/.test(await p.locator('.insight, .rframe').first().innerText()),'plain-English comparison in the summary');
const tr=await rowCells('.cmp-tbl tr.sub','Total revenue');
check(Math.abs(num(tr[2])-num(tr[4])-num(tr[5]))<0.011,'revenue change = this period − comparison ('+tr.slice(2,7).join(' | ')+')');
const gp=await rowCells('.cmp-tbl tfoot tr.grand','for the period');
check(Math.abs(num(gp[2])-num(gp[4])-num(gp[5]))<0.011,'profit change adds up');
const head=await p.evaluate(()=>document.querySelector('table.cmp-tbl thead').textContent.replace(/\s+/g,' '));
check(/Comparison/.test(head)&&head.includes(c1.replace('vs ','')),'export headers carry both periods');

// 3. the comparison column equals the plain report for those dates
const [cf,ct]=c1.replace('vs ','').split(' – ');const prevRevenue=num(tr[4]);
await pick("Don't compare");
check((await chip())===''&&await p.locator('.cmp-tbl').count()===0,"Don't compare shows the period alone");
await p.locator('.rframe .acts .btn',{hasText:/This quarter|Year to date|—/}).first().click();await p.waitForTimeout(200);
const di=p.locator('.rangepop .rp-custom input[type=date]');await di.nth(0).fill(iso(cf));await di.nth(1).fill(iso(ct));await p.locator('.rangepop .btn.pri',{hasText:'Apply'}).click();await p.waitForTimeout(1200);
const plain=(await rowCells('table.tbl tr.sub','Total revenue'))[2];
check(Math.abs(num(plain)-prevRevenue)<0.011,'comparison column matches the P&L for '+cf+' – '+ct+' ('+plain+')');
check(JSON.parse(await p.evaluate(()=>localStorage.getItem('mizan.compare'))).cmp==='off','choice remembered');

// 4. same period last year, custom period, partial cover
await p.reload();await p.waitForTimeout(1500);await nav('r_pnl');
check(!/:/.test(await p.locator('.cmp-btn').innerText()),'remembered after reload (off)');
await pick('Same period last year');
check(new RegExp('01 Jan '+(new Date().getFullYear()-1)).test(await p.locator('.cmp-note.none').innerText().catch(()=>''))&&(await chip())==='','same period last year before the books → explained, no empty columns');
await p.locator('.cmp-btn').click();await p.waitForTimeout(200);await p.locator('.cmp-opt',{hasText:'Custom period'}).click();await p.waitForTimeout(200);
let ci=p.locator('.cmp-custom input[type=date]');await ci.nth(0).fill('2025-11-01');await ci.nth(1).fill('2025-12-31');await p.locator('.cmp-custom .btn.pri').click();await p.waitForTimeout(1200);
check((await chip())==='vs 01 Nov 2025 – 31 Dec 2025'&&await p.locator('.cmp-tbl').count()===1&&await p.locator('.cmp-note').count()===0,'custom comparison period');
await p.locator('.cmp-btn').click();await p.waitForTimeout(200);await p.locator('.cmp-opt',{hasText:'Custom period'}).click();
ci=p.locator('.cmp-custom input[type=date]');await ci.nth(0).fill('2025-10-01');await ci.nth(1).fill('2025-12-31');await p.locator('.cmp-custom .btn.pri').click();await p.waitForTimeout(1200);
check(await p.locator('.cmp-note.partial').count()===1&&await p.locator('.cmp-tbl').count()===1,'partly covered comparison is flagged');

// 5. balance sheet: last year-end by default, previous month-end, both sides balance
await nav('r_bs');
check((await chip())==='vs 31 Dec 2025'&&await p.locator('.cmp-tbl').count()===1,'balance sheet compares with last year-end');
const ta=await rowCells('.cmp-tbl tr.cmp-total','Total assets'),tle=await rowCells('.cmp-tbl tfoot tr.grand','Total liabilities and equity');
check(Math.abs(num(ta[3])-num(tle[3]))<0.011&&Math.abs(num(ta[2])-num(tle[2]))<0.011,'both dates balance (assets = liabilities + equity)');
await pick('Previous month-end');
const t=new Date();const pm=dmy(new Date(Date.UTC(t.getFullYear(),t.getMonth(),0)));
check((await chip())==='vs '+pm,'previous month-end ('+pm+')');
check(await p.locator('.viz-card h3',{hasText:'Then and now'}).count()===1,'then and now bars');

// 6. profitability by customer and the dashboard
await nav('r_cust');
check(await p.locator('.cmp-tbl thead th',{hasText:'Revenue'}).count()===2&&await p.locator('.viz-card h3',{hasText:'Growing customers'}).count()===1&&await p.locator('.viz-card h3',{hasText:'Declining customers'}).count()===1,'customer revenue vs comparison, growing and declining');
await nav('dash');
const foot=await p.locator('.dashboard-footer').innerText();
check(new RegExp('Period comparison: 01 Jan '+(t.getFullYear()-1)).test(foot),'dashboard compares year to date with last year to date ('+foot.split('Period comparison: ')[1]+')');
console.log('OK',ok.length);console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
