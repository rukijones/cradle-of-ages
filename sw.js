/* r227: offline helper switched off. This version removes itself and its saved files, then the page loads straight from the site again. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{try{for(const k of await caches.keys())await caches.delete(k)}catch(err){}try{await self.registration.unregister()}catch(err){}})()));
