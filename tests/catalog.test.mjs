import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sellingPaisa, sellingPrice, filterProducts, cleanBag, cleanIds, bagTotalPaisa, searchIntent } from '../src/catalog/logic.mjs';
import { validateRows } from '../scripts/validate-catalog.mjs';
const products=JSON.parse(readFileSync(new URL('../src/catalog/products.json',import.meta.url),'utf8'));

test('10% markup uses paisa and never rounds up to a whole rupee',()=>{
  assert.equal(sellingPaisa(13999),1539890);
  assert.equal(sellingPaisa(900),99000);
  assert.equal(sellingPaisa(123.45),13580);
  for(const p of products) assert.equal(sellingPaisa(p.sourcePrice),Math.round(p.sourcePrice*110));
  for(const n of [0,-1,NaN,Infinity,'100']) assert.throws(()=>sellingPaisa(n));
});
test('catalogue is limited to the five requested categories with honest coverage',()=>{
  assert.equal(validateRows(products).length,49);
  assert.deepEqual([...new Set(products.map(p=>p.category))].sort(),['audio','drives','keyboard','mouse','ram']);
  assert(products.every(p=>p.availability==='confirm' && p.liveVerifiedAt===null && p.images.length===0));
  assert.throws(()=>validateRows([...products,products[0]]),/duplicate/);
  assert.throws(()=>validateRows([{...products[0],category:'laptop'}]),/category/);
});
test('natural language searches combine category, features and budget',()=>{
  const rows=filterProducts(products,{query:'show me a wireless mouse under 10k'});
  assert(rows.length>=2);assert(rows.every(p=>p.category==='mouse' && sellingPrice(p)<=10000));
  assert(rows.some(p=>p.id==='g304'));
  const ram=filterProducts(products,{query:'16GB DDR4 RAM'});assert(ram.length>=2);assert(ram.every(p=>p.category==='ram'));
  const mic=filterProducts(products,{query:'microphone under Rs. 10,000'});assert(mic.length>0);assert(mic.every(p=>/microphone/i.test(p.name)));
  assert.deepEqual(searchIntent('under 2.5k'),{category:'',ceiling:2500,terms:[]});
});
test('filters, ordering and empty results use selling prices',()=>{
  const rows=filterProducts(products,{category:'mouse',brand:'Logitech',max:5500,sort:'price-desc'});
  assert(rows.length>1);assert(rows.every(p=>p.brand==='Logitech' && sellingPrice(p)<=5500));
  assert.deepEqual(rows.map(sellingPrice),rows.map(sellingPrice).sort((a,b)=>b-a));
  assert.equal(filterProducts(products,{query:'nonexistent-model-xyz'}).length,0);
  assert.equal(filterProducts(products,{category:'ram',max:1000}).length,0);
});
test('persisted bag data cannot inject unknown products, invalid quantities or duplicate rows',()=>{
  assert.deepEqual(cleanBag([{id:'b100',quantity:2},{id:'b100',quantity:3},{id:'missing',quantity:9},{id:'g304',quantity:NaN},{id:'h110',quantity:-5}],products),[{id:'b100',quantity:5}]);
  assert.deepEqual(cleanBag([{id:'b100',quantity:1000}],products),[{id:'b100',quantity:99}]);
  assert.deepEqual(cleanIds(['b100','b100','unknown','g304'],products,1),['b100']);
  assert.deepEqual(cleanBag({},products),[]);
  assert.equal(bagTotalPaisa([{id:'keys-to-go',quantity:3}],products),4619670);
});
