/* 3.6.1 regression: a mouse resting where the customer list opens must not change which customer Enter picks (needs tests/fixture.json). Run: node tests/browser-picker-pointer.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const fx=fs.readFileSync(path.join(__dirname,'fixture.json'),'utf8');
let fails=0,res=[];
for(const y of [360,400,440,480,520,560,600,640]){const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.addInitScript((fx)=>{try{if(!sessionStorage.getItem('x')){localStorage.clear();localStorage.setItem('mizan.books.v2',fx);sessionStorage.setItem('x','1');}}catch(e){}},fx);
await p.goto('file://'+path.resolve(__dirname,'../invoeez.html'));await p.waitForTimeout(1000);
await p.locator('.sbar [data-k="invoices"]').click();await p.waitForTimeout(300);await p.getByRole('button',{name:'New invoice'}).first().click();await p.waitForTimeout(400);
await p.mouse.move(520,y);
await p.keyboard.type('jumei');await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(300);
const v=await p.getByLabel('Select customer').inputValue();const modal=await p.locator('.studio-modal').count();res.push(y+':'+(v||'∅')+(modal?' MODAL':''));if(!/Jumeirah/.test(v))fails++;
await p.context().close();}
console.log(res.join(' | '));console.log('fails',fails);await b.close();})();
