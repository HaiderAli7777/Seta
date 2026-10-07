/* Browser check for 3.5 features: inline brand/category/salesperson creation, automatic product codes,
   address line 2, first-purchase cost, last purchase price and empty default quantity. Run: node tests/browser-new-features.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const shot=n=>path.join(require('os').tmpdir(),'invoeez-'+n);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('mizan.navgroups','{}');sessionStorage.setItem('x','1');}}catch(e){}});
await p.goto('file://'+path.resolve(__dirname,'../invoeez.html'));await p.waitForTimeout(1300);
const nav=async t=>{await p.locator(`.nav-item[title="${t}"]`).first().click();await p.waitForTimeout(400);};
const books=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('mizan.books.v2')));
const create=async(label,name)=>{await p.getByLabel(label,{exact:true}).last().selectOption('__new__');await p.waitForTimeout(200);await p.locator('.studio-modal').last().getByLabel('Name').fill(name);await p.getByRole('button',{name:'Create & select'}).click();await p.waitForTimeout(250);};
// product
await nav('Products & services');await p.getByRole('button',{name:'New product'}).first().click();await p.waitForTimeout(300);
await p.getByLabel('Product name').fill('Test Widget');
await create('Category','Gadgets');await create('Brand','Acme');
check(await p.getByLabel('Category',{exact:true}).last().evaluate(e=>e.options[e.selectedIndex].text)==='Gadgets','category created+selected');
check(await p.getByLabel('Brand',{exact:true}).last().inputValue()==='Acme','brand created+selected');
await p.getByLabel('Sales price · AED').fill('25');await p.screenshot({path:shot('product-form.png')});
await p.getByRole('button',{name:/^Save/}).click();await p.waitForTimeout(400);
let s=await books();let w=s.products.find(x=>x.name==='Test Widget');check(w&&w.code==='P-00001','auto code '+(w&&w.code));check(w&&w.brand==='Acme'&&s.brands.includes('Acme'),'brand stored');check(s.categories.some(c=>c.name==='Gadgets'&&c.id===w.category),'category stored');
// second product same brand appears in dropdown
await p.getByRole('button',{name:'New product'}).first().click();await p.waitForTimeout(300);
check((await p.getByLabel('Brand',{exact:true}).last().locator('option').allInnerTexts()).includes('Acme'),'brand in dropdown');
await p.getByLabel('Product name').fill('Second');await p.getByRole('button',{name:/^Save/}).click();await p.waitForTimeout(300);
s=await books();check(s.products.find(x=>x.name==='Second').code==='P-00002','sequential 2');
// customer
await nav('Customers');await p.getByRole('button',{name:/New customer/}).first().click();await p.waitForTimeout(300);
await p.getByLabel('Registered name').fill('Alpha Trading');
await p.getByLabel(/^Address line 1/).last().fill('Office 12, Bay Square');await p.getByLabel(/^Address line 2/).last().fill('Business Bay, Dubai');
await create('Salesperson','Sara Khan');await p.screenshot({path:shot('customer-form.png')});
await p.getByRole('button',{name:/^(Save|Create)$/}).last().click();await p.waitForTimeout(400);
s=await books();let c=s.partners.find(x=>/Alpha/.test(x.name));check(c&&c.address2==='Business Bay, Dubai','address2 stored');check(c&&s.salespeople.some(x=>x.name==='Sara Khan'&&x.id===c.salesman),'salesperson inline');
// vendor
await nav('Vendors');await p.getByRole('button',{name:/New vendor/}).first().click();await p.waitForTimeout(300);
await p.getByLabel('Registered name').fill('Beta Supplies');await p.getByLabel(/^Address line 2/).last().fill('Jebel Ali');
await p.getByRole('button',{name:/^(Save|Create)$/}).last().click();await p.waitForTimeout(400);
// bill 1
await nav('Vendor bills');await p.getByRole('button',{name:/New (vendor )?bill/}).first().click();await p.waitForTimeout(500);
await p.keyboard.type('Beta');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(300);
const row=i=>p.locator('.line-grid tbody tr[data-line-id]').nth(i);
await row(0).locator('input[role=combobox]').click();await p.keyboard.type('Test Widget');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(250);
check(await row(0).locator('.q-qty').inputValue()==='','qty empty by default');
await p.keyboard.type('10');await row(0).locator('input.n').nth(1).fill('12.5').catch(()=>{});
const price=row(0).locator('input').filter({hasNot:p.locator('.q-qty')});
await p.screenshot({path:shot('bill-grid.png')});
await p.getByRole('button',{name:'Post to ledger'}).click();await p.waitForTimeout(500);
s=await books();w=s.products.find(x=>x.name==='Test Widget');const bill=s.docs.find(d=>d.type==='bill');
check(bill&&bill.state==='posted','bill posted');check(w.cost===+bill.lines[0].price&&w.lastPurchase===+bill.lines[0].price,'first purchase cost '+w.cost+' / '+(bill&&bill.lines[0].price));
// bill 2 default price
await nav('Vendor bills');await p.getByRole('button',{name:/New (vendor )?bill/}).first().click();await p.waitForTimeout(500);
await p.keyboard.type('Beta');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(300);
await row(0).locator('input[role=combobox]').click();await p.keyboard.type('Test Widget');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(250);
const vals=await row(0).locator('input').evaluateAll(es=>es.map(e=>e.value));check(vals.includes(String(w.lastPurchase)),'next bill defaults to last purchase '+vals.join('|'));
// invoice validation with empty qty
await nav('Invoices');await p.getByRole('button',{name:'New invoice'}).first().click();await p.waitForTimeout(500);
await p.keyboard.type('Alpha');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(300);
check(await p.getByLabel('Salesperson').last().evaluate(e=>e.options[e.selectedIndex].text)==='Sara Khan','invoice inherits salesperson');
await row(0).locator('input[role=combobox]').click();await p.keyboard.type('Test Widget');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(250);
await p.getByRole('button',{name:'Post to ledger'}).click();await p.waitForTimeout(300);
check(await p.getByText('Enter a quantity on every line.').count()>0,'empty qty blocks posting');
await p.keyboard.type('3');await p.waitForTimeout(150);const amt=await row(0).locator('td').nth(-2).innerText();check(/75/.test(amt),'amount updates with qty '+amt);
await p.screenshot({path:shot('invoice-grid.png')});
// settings
console.log('OK',ok.length,ok);console.log('ERR',errs);
console.log('OK',ok.length,ok);console.log('ERR',errs);await b.close();})();
