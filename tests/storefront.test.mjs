import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
// Runs the built site from dist/ in a simulated browser, without the server (static preview).
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const app = html.match(/src="\.\/(assets\/app-[A-Z0-9]+\.js)"/)[1];
const bundle = readFileSync(new URL('../dist/' + app, import.meta.url), 'utf8');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function boot(path = '') {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(e.message)); vc.on('error', (e) => errors.push(String(e)));
  const dom = new JSDOM('<!doctype html><html><body><div id="boot"></div><div id="root"></div></body></html>',
    { url: 'https://preview.example/' + path, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.scrollTo = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.eval(bundle);
  await pause(400);
  return { w, d: w.document, errors };
}
test('the store opens with the single-tone slider and the real catalogue, without errors', async () => {
  const { w, d, errors } = await boot('');
  try {
  assert.match(d.querySelector('h1').textContent, /Your setup/);
  assert.ok(d.querySelector('.bh .bh-product.on img'), 'slider shows a product');
  assert.ok(!d.body.textContent.includes('Sold out'), 'products are orderable');
  assert.deepEqual(errors, []);
  } finally { w.close(); }
});
test('console.html opens the console sign-in', async () => {
  const { w, d, errors } = await boot('console.html');
  try {
    assert.ok(d.querySelector('input[type="password"]'), 'password field present');
    assert.deepEqual(errors, []);
  } finally { w.close(); }
});
test('the service worker ships with the current bundle', () => {
  const sw = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes('./' + app));
  assert.match(sw, /epic-images-v1/);
});
