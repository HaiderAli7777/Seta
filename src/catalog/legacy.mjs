import products from './products.json';
import { CATEGORIES, sellingPrice } from './logic.mjs';
// Photos added to assets/products are prepared by the build and injected as __EPIC_PHOTOS__.
const PHOTOS = typeof __EPIC_PHOTOS__ === 'undefined' ? {} : __EPIC_PHOTOS__;
export const legacyCategories=CATEGORIES.map((c,i)=>({id:c.id,label:c.label,iconKey:c.icon,parentId:null,blurb:c.description,weight:0,featured:true,sort:i}));
// No vendor listing is treated as owned inventory, known acquisition cost, or a warranty promise.
export const legacyProducts=products.map(p=>({
  ...p, sku:'EPIC-'+p.id.toUpperCase(), barcode:'', price:sellingPrice(p), cost:0, compareAt:null,
  rating:0,reviews:0,baseSold:0,stock:50,reorderPoint:0,kind:'product',isNew:false,active:true,soldOut:false,
  blurb:p.specs.map(s=>s.join(': ')).join('. '),tags:[],warranty:0,weightKg:null,iconKey:null,tagline:'',
  image:PHOTOS[p.id]?.l||p.images[0]||'',video:'',
}));
