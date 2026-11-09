const CACHE='comancheria-table-companion-v0.1.0';
const ASSETS=['./','./index.html','./assets/style.css','./assets/app.js','./assets/engine.js','./assets/icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const saved=response.clone();caches.open(CACHE).then(c=>c.put(event.request,saved));}return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
