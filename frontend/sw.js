const C = 'zpi-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/main.js', 'js/commands.js', 'js/media.js', 'js/secure.js', 'js/speech.js', 'js/ui.js', 'manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
