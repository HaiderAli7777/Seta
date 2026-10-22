import {transform} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const files=['invoeez-source.jsx','enhancements-data.jsx','company-template.jsx','enhancements-ui.jsx','dashboard.jsx','design.jsx','onboarding.jsx','brand-assets.jsx','brand.jsx','clarity.jsx','sidebar.jsx','select.jsx','features.jsx','pdc.jsx','reports.jsx','dash.jsx','compare.jsx','users.jsx','ifrs.jsx','pro.jsx','approval.jsx','ux.jsx','motion.jsx','sync.jsx','refine.jsx','delivery.jsx','group.jsx','costing.jsx','apps.jsx','access.jsx'];
const source=(await Promise.all(files.map(x=>readFile(new URL(x,import.meta.url),'utf8')))).join('\n\n');
const result=await transform(source,{loader:'jsx',target:'es2020',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',legalComments:'inline'});
const prefix=await readFile(new URL('runtime-prefix.js',import.meta.url),'utf8');
const shell=await readFile(new URL('shell.html',import.meta.url),'utf8');
const html=shell.replace('__INVOEEZ_APP_CODE__',()=>prefix+'\n'+result.code+'\nwindow.__Invoeez=Invoeez;');
await writeFile(new URL('invoeez.html',import.meta.url),html);
// Keep the old entry filename available for in-place browser storage upgrades.
await writeFile(new URL('mizan.html',import.meta.url),html);
await mkdir(new URL('dist',import.meta.url),{recursive:true});
await writeFile(new URL('dist/index.html',import.meta.url),html);
// Hosted copy (dist/) also gets an offline app shell: a service worker and a manifest so it can be installed.
const build=(/const BUILD = "([^"]+)"/.exec(source)||[,'dev'])[1];
const icons=['icon-192.png','icon-512.png','icon-maskable-512.png'];
await mkdir(new URL('dist/icons',import.meta.url),{recursive:true});
for(const i of icons) await copyFile(new URL('icons/'+i,import.meta.url),new URL('dist/icons/'+i,import.meta.url));
await writeFile(new URL('dist/manifest.webmanifest',import.meta.url),JSON.stringify({
  name:'InvoEez — Invoice Made Easy',short_name:'InvoEez',description:'UAE VAT accounting that works offline and syncs to your company cloud.',
  id:'./',start_url:'./',scope:'./',display:'standalone',background_color:'#F2F3F5',theme_color:'#0F2A5C',
  icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png'},
    {src:'icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,2));
await writeFile(new URL('dist/sw.js',import.meta.url),`/* InvoEez offline app shell, build ${build}. The books themselves live in the browser's storage. */
const CACHE = "invoeez-app-${build}";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", ${icons.map(i=>`"./icons/${i}"`).join(', ')}];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("invoeez-app-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/api/")) return;
  if (r.mode === "navigate") {   // newest app when online, the saved one when not
    e.respondWith(fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res; }
      return caches.match("./index.html").then((x) => x || res);
    }).catch(() => caches.match("./index.html").then((x) => x || caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => {
    if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
    return res;
  })));
});
`);
console.log('Built invoeez.html, compatibility mizan.html and dist/ (index.html '+Math.round(html.length/1024)+' KB, sw.js, manifest, icons). The single file needs no other assets.');
