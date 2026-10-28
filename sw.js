/* Cradle of Ages offline support (gameplay chat 1, Oct 27 2026; Josh: "Will the game work without internet?" -> "yes").
   - The page and the picture packs (pk/*.js) are fetched fresh when online and kept for offline (network first, saved copy when offline).
   - Art files (art/c/*.webp) are kept the first time they load (cache first; a new art version gets its own copy).
   - After the page asks (message 'precache'), every art file the site lists in art-list.json is downloaded in the background,
     so later ages work offline too. Progress goes back to the page.
   - Fonts (Google) are kept on first use. Online play still needs the internet. */
const V='coa-v1',CORE=V+'-core',ART=V+'-art',EXT=V+'-ext';
const SCOPE=self.registration.scope;
const u=p=>new URL(p,SCOPE).href;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil((async()=>{const c=await caches.open(CORE);
  try{await c.add(new Request(u('./'),{cache:'reload'}))}catch(err){}
  try{const r=await fetch(u('art-list.json'),{cache:'no-store'});if(r.ok){const L=await r.clone().json();await c.put(u('art-list.json'),r);
    for(const p of (L.pk||[]))try{await c.add(new Request(u(p),{cache:'reload'}))}catch(err){}}}catch(err){}})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(!k.startsWith(V))await caches.delete(k);await self.clients.claim()})())});
const plain=url=>{const x=new URL(url);return x.origin+x.pathname};
const artKey=url=>{const x=new URL(url);const v=x.searchParams.get('v');return x.origin+x.pathname+(v?'?v='+v:'')};
async function netFirst(req,key,cache){const c=await caches.open(cache);try{const r=await fetch(req);if(r&&r.ok)c.put(key,r.clone()).catch(()=>{});return r}catch(err){const h=await c.match(key);if(h)return h;throw err}}
async function cacheFirst(req,key,cache){const c=await caches.open(cache);const h=await c.match(key);if(h)return h;try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(key,r.clone()).catch(()=>{});return r}catch(err){const o=await c.match(req.url,{ignoreSearch:true});if(o)return o;throw err}}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(url.origin===location.origin&&req.url.startsWith(SCOPE)){const path=url.pathname.slice(new URL(SCOPE).pathname.length);
    if(req.mode==='navigate'||path===''||path==='index.html')return e.respondWith(netFirst(req,u('./'),CORE));
    if(path.startsWith('pk/'))return e.respondWith(netFirst(req,plain(req.url),CORE));
    if(path.startsWith('art/'))return e.respondWith(cacheFirst(req,artKey(req.url),ART));
    return e.respondWith(netFirst(req,plain(req.url),CORE));}
  if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))return e.respondWith(cacheFirst(req,req.url,EXT));});
let busy=false;
self.addEventListener('message',e=>{const m=e.data||{};if(m.k!=='precache'||busy)return;busy=true;e.waitUntil((async()=>{
  const say=async o=>{for(const c of await self.clients.matchAll())c.postMessage(Object.assign({k:'offline'},o))};
  try{const lr=await fetch(u('art-list.json'),{cache:'no-store'});const L=await lr.json();const cc=await caches.open(CORE);
    for(const p of (L.pk||[])){if(!(await cc.match(u(p))))try{await cc.add(new Request(u(p),{cache:'reload'}))}catch(err){}}
    const c=await caches.open(ART),want=new Set((L.art||[]).map(p=>u(p)+(m.v?'?v='+m.v:'')));
    for(const r of await c.keys())if(!want.has(r.url))await c.delete(r);   // old art versions
    const todo=[];for(const k of want)if(!(await c.match(k)))todo.push(k);
    let done=want.size-todo.length;await say({done,total:want.size});
    let i=0;const work=async()=>{while(i<todo.length){const k=todo[i++];try{const r=await fetch(k);if(r.ok)await c.put(k,r)}catch(err){}done++;if(done%10===0||done===want.size)await say({done,total:want.size})}};
    await Promise.all([work(),work(),work()]);await say({done,total:want.size,ok:1});}catch(err){await say({err:1})}busy=false})())});
