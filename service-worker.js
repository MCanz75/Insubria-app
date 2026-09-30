const CACHE='insubria-v9';
const ASSETS=['./','./index.html','./styles.css?v=9','./app.js?v=9','./config.js','./manifest.json?v=9','./club-logo-v9.png','./icons/icon-180-v9.png','./icons/icon-192-v9.png','./icons/icon-512-v9.png','./icons/favicon-v9.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));});
