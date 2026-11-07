// Each release of the offline shell should use a new cache version.
const CACHE = 'real-check-shell-v2';
const assets = ['/', '/index.html', '/style.css', '/records.css', '/compare.css', '/app.js', '/content.js', '/icons.js', '/guide-art.js', '/records.js', '/home-model.js', '/compare.js', '/logo.svg', '/art/neighborhood.svg', '/art/notebook.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assets.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('real-check-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(caches.open(CACHE).then(cache=>cache.match('/')).then(hit=>hit||fetch(event.request)));
  } else if (assets.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(hit=>hit||fetch(event.request)));
  }
});
