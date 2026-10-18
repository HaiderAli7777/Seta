/* 3.10: payments and balance on invoices and bills (screen, print, PDF), sidebar opens beside the page, professional report exports (needs tests/fixture.json). Run: node tests/browser-payments-exports.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
const num=(t)=>{const s=String(t).trim();const neg=/^\(.*\)$/.test(s)||/^[−-]/.test(s);const v=+s.replace(/[^\d.]/g,'');return neg?-v:v;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const open=async(pin=true)=>{const ctx=await b.newContext({viewport:{width:1440,height:950},acceptDownloads:true});
 await ctx.addInitScript(([fx,pin])=>{try{if(!localStorage.getItem('fx-loaded')){localStorage.clear();localStorage.setItem('mizan.navgroups','{}');if(pin)localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.books.v2',fx);localStorage.setItem('fx-loaded','1');}}catch(e){}},[fx,pin]);
 const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));await p.goto('file://'+HTML);await p.waitForTimeout(1500);return p;};
const nav=async(p,k)=>{await p.locator(`.sbar [data-k="${k}"]`).first().click();await p.waitForTimeout(1200);};
const openDoc=async(p,list,no)=>{await nav(p,list);await p.locator('input[placeholder*="Search"]').first().fill(no);await p.waitForTimeout(500);await p.locator('tr',{hasText:no}).first().click();await p.waitForTimeout(1000);};
const pay=async(p,amt)=>{await p.locator('.btn',{hasText:'Record payment'}).first().click();await p.waitForTimeout(300);const c=p.locator('.card',{hasText:'Settle'});await c.locator('input[type=number]').first().fill(String(amt));await c.locator('.btn.pri',{hasText:'Record'}).click();await p.waitForTimeout(1000);};

// 1. part payment on an invoice
let p=await open();
await openDoc(p,'invoices','INV/2026/0286');
const total=num(await p.locator('.sumrow.total .v').innerText());
check(await p.locator('.pay-panel').count()===1&&/Due/.test(await p.locator('.pay-state').innerText()),'unpaid invoice shows its payment panel');
await pay(p,10000);
const figs=(await p.locator('.pay-figs b').allInnerTexts()).map(num);
check(Math.abs(figs[0]-total)<0.01&&Math.abs(figs[1]-10000)<0.01&&Math.abs(figs[2]-(total-10000))<0.01,'total / received / balance ('+figs.join(' / ')+')');
check(/Part paid/.test(await p.locator('.pay-state').innerText()),'part paid');
check(await p.locator('.pay-tbl tbody tr').count()===1&&/RCPT\//.test(await p.locator('.pay-tbl tbody tr').innerText()),'the receipt is listed');
check(Math.abs(num(await p.locator('.sumrow.balance .v').innerText())-(total-10000))<0.01,'balance receivable in the totals');
// printed copy and PDF
await p.locator('.btn',{hasText:'Print / send'}).click();await p.waitForTimeout(800);
check(/BALANCE DUE/.test(await p.locator('.totbox').innerText())&&/received to date/i.test(await p.locator('.totbox').innerText()),'printed invoice shows received and balance due');
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.locator('.btn',{hasText:'Download PDF'}).first().click()]);
const pdfTxt=dl?fs.readFileSync(await dl.path()).toString('latin1'):'';
check(/BALANCE DUE/.test(pdfTxt)&&/received to date/.test(pdfTxt),'invoice PDF carries the balance due');
await p.locator('.btn',{hasText:'Close'}).first().click();await p.waitForTimeout(400);
// pay the rest
await pay(p,(total-10000).toFixed(2));
check(/Paid in full/.test(await p.locator('.pay-state').innerText())&&num(await p.locator('.sumrow.balance .v').innerText())===0&&await p.locator('.pay-tbl tbody tr').count()===2,'paid in full after the second receipt');
check(await p.locator('.pay-cta').count()===0,'no record button once settled');
// a bill
await openDoc(p,'bills','BILL/2026/0160');
check(await p.locator('.pay-panel h3',{hasText:'Payments made'}).count()===1&&/Balance payable|Paid in full/.test(await p.locator('.sumrow.balance').innerText()),'bills show payments made and balance payable');
await p.context().close();

// 2. sidebar opens beside the page
p=await open(false);
const x0=await p.evaluate(()=>document.querySelector('.main').getBoundingClientRect().left);
await p.mouse.move(30,320);await p.waitForTimeout(800);
const x1=await p.evaluate(()=>document.querySelector('.main').getBoundingClientRect().left);
check(x0<90&&x1>250,'hovering the menu moves the page aside instead of covering it ('+Math.round(x0)+' → '+Math.round(x1)+')');
await p.mouse.move(900,500);await p.waitForTimeout(800);
check((await p.evaluate(()=>document.querySelector('.main').getBoundingClientRect().left))<90,'page takes the space back when the menu folds');
await p.context().close();

// 3. professional exports
p=await open();
await nav(p,'r_pnl');
check(await p.locator('.stmt-head h3',{hasText:'Statement of profit or loss'}).count()===1,'statement heading in the app');
const ff=await p.evaluate(()=>getComputedStyle(document.querySelector('.fin-tbl td.n')).fontFamily);
check(!/Mono/i.test(ff),'figures in proportional tabular numerals ('+ff.split(',')[0]+')');
for(const [k,ext] of [['PDF','pdf'],['Excel','xlsx']]){
  const [d]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.locator('.exp-group .btn',{hasText:k}).click()]);
  const buf=d?fs.readFileSync(await d.path()):Buffer.alloc(0),txt=buf.toString('latin1');
  if(ext==='pdf'){check(buf.length>5000&&/Profit for the period/.test(txt)&&/Operating profit/.test(txt),'P&L PDF has the statement');
    check(!/[−▲▼]|%¼|%²/.test(buf.toString('utf8'))&&!/\(4100Revenue/.test(txt),'P&L PDF free of garbled characters');}
  else check(buf.length>2000&&txt.startsWith('PK'),'P&L Excel workbook');
}
await nav(p,'r_bs');
const [d2]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.locator('.exp-group .btn',{hasText:'PDF'}).click()]);
const bsTxt=d2?fs.readFileSync(await d2.path()).toString('latin1'):'';
check(/Total equity and liabilities/.test(bsTxt)&&/ASSETS/.test(bsTxt),'balance sheet PDF with sections');
console.log('OK',ok.length);console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
