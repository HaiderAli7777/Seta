/* One bundle for both pages: index.html opens the store, console.html opens the console. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app.jsx';

const isConsole = /\/console(\.html)?$/.test(window.location.pathname);
createRoot(document.getElementById('root')).render(<App initialView={isConsole ? 'console' : 'store'} />);
requestAnimationFrame(() => document.getElementById('boot')?.remove());
// Service worker for fast repeat visits (only on HTTPS or a local preview).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
