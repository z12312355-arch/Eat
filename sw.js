const CACHE='eat-wheel-v1';
const FILES=['./','./index.html','./style.css','./app.js','./core.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('eat-wheel-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin)return;
  const url=new URL(event.request.url),base=new URL('./',self.location.href);
  if(!FILES.some(file=>new URL(file,base).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok) {const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,clone)));}
    return response;
  }).catch(()=>caches.match(event.request).then(response=>response||Response.error())));
});

