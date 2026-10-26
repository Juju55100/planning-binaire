'use strict';
const PREFIX='planning-binaire-'+self.registration.scope+'-';
const CACHE=PREFIX+'iphone-v1';
const FILES=['./','index.html','core.js','app.js','style.css','iphone.css','pwa.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const URLS=FILES.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(!URLS.includes(url.href))return;event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request))) });
