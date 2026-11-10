const CACHE_PREFIX='comancheria-table-companion-';
const CACHE=CACHE_PREFIX+'v0.57.0-final-local-candidate';
const ASSETS=['./','./index.html','./assets/style.css','./assets/app.js','./assets/engine.js','./assets/board-layout.js','./assets/board-analysis.js','./assets/board-counter-actions.js','./assets/map-evidence.js','./assets/map-fact-checks.js','./assets/map-topology-audit.js','./assets/save-safety.js','./assets/tts-asset-library.js','./assets/tts-source-manifest.js','./assets/war-card-effects.js','./assets/icon.svg','./manifest.webmanifest'];
const KNOWN=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const known=KNOWN.has(url.href);
 const navigation=req.mode==='navigate'&&url.pathname===new URL('./',self.registration.scope).pathname;
 if(!known&&!navigation)return;
 event.respondWith(fetch(req).then(response=>{
  if(response.ok&&response.type==='basic'&&known){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,clone)));}
  return response;
 }).catch(async()=>{
  const cached=await caches.match(req);
  if(cached)return cached;
  if(navigation)return caches.match(new URL('./index.html',self.registration.scope).href);
  return Response.error();
 }));
});
