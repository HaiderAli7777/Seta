/* 3.6 pricing: empty unit price, last price to the customer, Don't store / Party special, empty payment amount. Run: node tests/browser-pricing.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('mizan.navgroups','{}');sessionStorage.setItem('x','1');}}catch(e){}});
await p.goto('file://'+path.resolve(__dirname,'../invoeez.html'));await p.waitForTimeout(1200);
const nav=async k=>{await p.locator(`.sbar [data-k="${k}"]`).first().click();await p.waitForTimeout(350);};
const books=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('mizan.books.v2')));
await nav('products');await p.getByRole('button',{name:'New product'}).first().click();await p.waitForTimeout(250);
await p.getByLabel('Product name').fill('Gizmo');await p.getByRole('button',{name:/^Save/}).click();await p.waitForTimeout(300);
await nav('customers');await p.getByRole('button',{name:/New customer/}).first().click();await p.waitForTimeout(250);
await p.getByLabel('Registered name').fill('Omega LLC');await p.getByRole('button',{name:/^Create$/}).click();await p.waitForTimeout(300);
const row=i=>p.locator('.line-grid tbody tr[data-line-id]').nth(i);
const newInv=async()=>{await nav('invoices');await p.getByRole('button',{name:'New invoice'}).first().click();await p.waitForTimeout(450);
 await p.keyboard.type('Omega');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(250);
 await row(0).locator('input[role=combobox]').click();await p.keyboard.type('Gizmo');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(250);};
const post=async()=>{await p.getByRole('button',{name:'Post to ledger'}).click();await p.waitForTimeout(450);};
// 1: no product price -> empty, validation
await newInv();check(await row(0).locator('.q-price').inputValue()==='','price empty when product has none');
await p.keyboard.type('2');await post();check(await p.getByText('Enter a unit price on every line.').count()>0,'empty price blocks posting');
check(await p.evaluate(()=>document.activeElement.classList.contains('q-price')),'focus jumps to price');
await p.keyboard.type('100');await p.waitForTimeout(150);
check(await p.locator('.lg-ask').count()===0,'no ask row on first price');
await post();let s=await books();check(s.docs.filter(d=>d.type==='invoice'&&d.state==='posted').length===1,'invoice 1 posted');
// 2: last price
await newInv();check(await row(0).locator('.q-price').inputValue()==='100','last price to customer prefilled: '+await row(0).locator('.q-price').inputValue());
await p.keyboard.type('1');await row(0).locator('.q-price').fill('90');await p.waitForTimeout(150);
check(await p.locator('.lg-ask').count()===1,'ask row appears on price change');
await p.screenshot({path:require('path').join(require('os').tmpdir(),'invoeez-price-ask.png')});
await p.getByRole('button',{name:"Don't store"}).click();await p.waitForTimeout(150);check(await p.locator('.lg-ask').count()===0,'ask row hides after choice');
await post();
// 3: don't-store price ignored, last stays 100
await newInv();check(await row(0).locator('.q-price').inputValue()==='100',"don't-store price skipped: "+await row(0).locator('.q-price').inputValue());
await p.keyboard.type('1');await row(0).locator('.q-price').fill('85');await p.waitForTimeout(150);
await p.getByRole('button',{name:'Party special'}).click();await p.waitForTimeout(200);
s=await books();check((s.partySpecials||[]).length===1&&s.partySpecials[0].price===85,'party special stored');
check(await row(0).locator('.lg-star').count()===1,'star shown on special line');
await post();
// 4: special applies
await newInv();check(await row(0).locator('.q-price').inputValue()==='85','party special prefilled: '+await row(0).locator('.q-price').inputValue());
// customer form lists special
await nav('customers');await p.locator('tr').filter({hasText:'Omega LLC'}).locator('button[title="Edit"]').click();await p.waitForTimeout(300);
check(await p.locator('.party-specials .ps-tbl tbody tr').count()===1,'customer form lists special');
await p.screenshot({path:require('path').join(require('os').tmpdir(),'invoeez-party-specials.png'),fullPage:false});
// payment amount empty
await nav('payments');await p.getByRole('button',{name:'Record receipt'}).click();await p.waitForTimeout(250);
check(await p.getByLabel('Amount · AED').inputValue()==='','payment amount empty');
console.log('OK',ok.length,ok);console.log('ERR',errs);await b.close();})();
