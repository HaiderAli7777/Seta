import {transform} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const files=['invoeez-source.jsx','enhancements-data.jsx','company-template.jsx','enhancements-ui.jsx','dashboard.jsx','design.jsx','onboarding.jsx'];
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
console.log('Built invoeez.html, compatibility mizan.html and dist/index.html ('+Math.round(html.length/1024)+' KB). No external assets required.');
