/* 離線快取：連得上網路時一律抓最新檔案（並更新快取），斷網時改用快取 */
const V='tp-v3',TV='tp-tiles',FILES=['./','index.html','css/style.css','vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css','js/geo.js','js/db.js','js/timeline.js','js/expenses.js','js/lists.js','js/app.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=V&&x!=TV).map(x=>caches.delete(x)))).then(()=>clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
if(u.hostname=='tile.openstreetmap.org'&&r.method=='GET'){e.respondWith(caches.open(TV).then(async c=>{const m=await c.match(r);if(m)return m;try{const res=await fetch(r);if(res.ok){c.put(r,res.clone());if(Math.random()<.05)c.keys().then(k=>{if(k.length>600)c.delete(k[0])})}return res}catch(x){return new Response('',{status:504})}}));return}
if(r.method!='GET'||u.origin!=location.origin)return;
e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))))});
