const CACHE='insubria-v10';
const ASSETS=[
  './', './index.html', './styles.css?v=10', './app.js?v=10', './config.js', './manifest.json?v=10',
  './club-logo.png', './apple-touch-icon.png', './apple-touch-icon-180x180.png',
  './icon-192.png', './icon-512.png', './favicon.png'
];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>caches.match(e.request))
  );
});
