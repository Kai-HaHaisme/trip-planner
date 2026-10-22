/* 階段 5：地圖（Leaflet + OpenStreetMap）、地址查詢（Nominatim）、天氣（Open-Meteo） */
const TILE='https://tile.openstreetmap.org/{z}/{x}/{y}.png',ATTR='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',PIN={radius:7,color:'#fff',weight:2,fillColor:'#7a2e2e',fillOpacity:1};
let ovDest=null,lastGeo=0,bigMap=null;
const WMO={0:'晴',1:'大致晴朗',2:'多雲',3:'陰',45:'霧',48:'霧',51:'毛毛雨',53:'毛毛雨',55:'毛毛雨',56:'凍雨',57:'凍雨',61:'小雨',63:'雨',65:'大雨',66:'凍雨',67:'凍雨',71:'小雪',73:'雪',75:'大雪',77:'雪粒',80:'陣雨',81:'陣雨',82:'強陣雨',85:'陣雪',86:'強陣雪',95:'雷雨',96:'雷雨冰雹',99:'雷雨冰雹'};
const gdd=(a,b)=>Math.round((new Date(a)-new Date(b))/864e5);
async function geocode(q){const w=Math.max(0,1100-(Date.now()-lastGeo));if(w)await new Promise(r=>setTimeout(r,w));lastGeo=Date.now();
const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q='+encodeURIComponent(q));if(!r.ok)throw new Error('http');const j=await r.json();return j[0]?{lat:+j[0].lat,lng:+j[0].lon,name:j[0].display_name}:null}
function baseMap(el,mini){const m=L.map(el,{zoomControl:!mini,attributionControl:!mini,dragging:!mini,scrollWheelZoom:!mini,touchZoom:!mini,doubleClickZoom:!mini,boxZoom:false,keyboard:!mini});L.tileLayer(TILE,{maxZoom:19,crossOrigin:true,attribution:ATTR}).addTo(m);return m}
const gmapUrl=(l,n)=>`https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
/* ---------- 時間軸：小地圖、天氣、預載 ---------- */
function dayLoc(t,d){const it=t.items.filter(i=>i.date==d&&i.location).sort((a,b)=>(a.isAlt-b.isAlt)||byTime(a,b))[0];if(it)return{...it.location};return t.destination?.lat!=null?{lat:t.destination.lat,lng:t.destination.lng,dest:1}:null}
function tlAfter(){if(window.L)$$('.mapb').slice(0,24).forEach(b=>{const l={lat:+b.dataset.lat,lng:+b.dataset.lng},m=baseMap(b.querySelector('.mi'),true).setView([l.lat,l.lng],15);L.circleMarker([l.lat,l.lng],PIN).addTo(m)});wxLoad(cur)}
const geoFoot=t=>`<div class="mt" style="margin-top:30px;border-top:1px solid var(--line);padding-top:10px"><button class="btn sm" data-g="pre">預載地圖（離線用）</button> <span id="pre"></span><div style="margin-top:8px">地圖資料 © OpenStreetMap contributors　｜　天氣資料 <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a>（CC BY 4.0）　｜　地址查詢 Nominatim</div></div>`;
async function wxFetch(d,l,range){const past=range<-5,dly='weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum'+(past?'':',precipitation_probability_max');
const j=await(await fetch(`https://${past?'archive-api':'api'}.open-meteo.com/v1/${past?'archive':'forecast'}?latitude=${l.lat}&longitude=${l.lng}&daily=${dly}&timezone=auto&start_date=${d}&end_date=${d}`)).json();
if(!j.daily?.time?.length||j.daily.weather_code[0]==null)throw 0;const g=k=>j.daily[k]?.[0];return{code:g('weather_code'),max:g('temperature_2m_max'),min:g('temperature_2m_min'),pop:g('precipitation_probability_max')??null,sum:g('precipitation_sum'),at:Date.now()}}
const wxShow=(el,c,l,stale)=>{el.innerHTML=`<b>${WMO[c.code]||'—'}</b><span>${Math.round(c.min)}–${Math.round(c.max)}°C</span><span>${c.pop!=null?'降雨 '+c.pop+'%':c.sum!=null?'降水 '+c.sum+' mm':''}</span><span class="mt">${l.dest?'依目的地 · ':''}更新於 ${new Date(c.at).toLocaleString(LT(),{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}${stale?'（離線，顯示上次資料）':''}</span>`};
async function wxLoad(t){const T=todayStr(),cache=(await DB.getMeta('wx:'+t.id))||{};let dirty=false;
for(const d of daysOf(t)){const el=$(`[data-wx="${d}"]`),l=dayLoc(t,d);if(!el||!l)continue;const range=gdd(d,T),k=`${d}|${l.lat.toFixed(2)},${l.lng.toFixed(2)}`,c=cache[k];
if(range>15){el.innerHTML='<span class="mt">尚無預報（預報約涵蓋未來 16 天，日期接近時會自動顯示）</span>';continue}
if(c)wxShow(el,c,l);if(c&&(range<-6||Date.now()-c.at<3*36e5))continue;
try{const x=await wxFetch(d,l,range);cache[k]=x;dirty=true;wxShow(el,x,l)}catch(e){if(c)wxShow(el,c,l,true);else el.innerHTML='<span class="mt">離線或無法取得天氣，目前沒有資料。</span>'}}
if(dirty)await DB.setMeta('wx:'+t.id,cache)}
const t2x=(lng,z)=>Math.floor((lng+180)/360*2**z),t2y=(lat,z)=>Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*2**z);
async function prefetch(){const t=cur,el=$('#pre');if(!navigator.serviceWorker?.controller){el.textContent='離線快取尚未啟用，請重新整理一次頁面再試。';return}
const pts=[...t.items.filter(i=>i.location).map(i=>i.location),...(t.destination?.lat!=null?[t.destination]:[])],set=new Set(),z=15;
pts.forEach(p=>{const x=t2x(p.lng,z),y=t2y(p.lat,z);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)set.add(`${x+a}/${y+b}`)});
const list=[...set].slice(0,150);if(!list.length){el.textContent='還沒有設定位置的行程。';return}
let n=0;for(const s of list){try{await fetch(`https://tile.openstreetmap.org/${z}/${s}.png`,{mode:'cors'})}catch(e){}n++;el.textContent=`預載中 ${n} / ${list.length}…`;await new Promise(r=>setTimeout(r,120))}
el.textContent=`已預載 ${list.length} 張地圖（各地點周邊，離線時可看到）。`}
/* ---------- 放大地圖 ---------- */
function openBig(l,name){$('#mo').hidden=false;$('#moa').href=gmapUrl(l);$('#mon').textContent=name||'';if(bigMap)bigMap.remove();bigMap=baseMap('mom',false).setView([l.lat,l.lng],16);L.circleMarker([l.lat,l.lng],PIN).addTo(bigMap)}
const closeBig=()=>{$('#mo').hidden=true;if(bigMap){bigMap.remove();bigMap=null}};
/* ---------- 行程表單：位置 ---------- */
const gs=s=>{$('#gs').textContent=s};
function fcenter(){const t=F.t,i=t.items.find(x=>x.location);return t.destination?.lat!=null?{lat:t.destination.lat,lng:t.destination.lng,z:12}:i?{...i.location,z:12}:{lat:25.04,lng:121.56,z:4}}
function setPin(l){if(F.pin)F.pin.setLatLng([l.lat,l.lng]);else F.pin=L.circleMarker([l.lat,l.lng],PIN).addTo(F.map)}
function fmapShow(){if(!window.L)return;$('#fmap').hidden=false;if(F.map){F.map.invalidateSize();return}const c=F.loc||fcenter();F.map=baseMap('fmap',false).setView([c.lat,c.lng],F.loc?16:c.z);F.pin=null;if(F.loc)setPin(F.loc);
F.map.on('click',e=>{F.loc={lat:e.latlng.lat,lng:e.latlng.lng};setPin(F.loc);gs('已手動設定位置。')})}
function fmapInit(){if(F.loc){fmapShow();gs('已設定位置。位置不對的話，直接點地圖重新選擇。')}}
/* ---------- 事件 ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-g]');if(!b)return;const a=b.dataset.g;
if(a=='map'){const i=cur.items.find(x=>x.id==b.dataset.id);if(i?.location)openBig(i.location,i.name+(i.address?'｜'+i.address:''));return}
if(a=='mx'){closeBig();return}if(a=='pre'){prefetch();return}
if(a=='geo'){const q=$('#ad').value.trim();if(!q){gs('請先輸入地址。');return}gs('查詢中…');try{const r=await geocode(q);if(!r){gs('查不到這個地址。請修改地址再查，或按「在地圖上選位置」手動點選。');fmapShow();return}
F.loc={lat:r.lat,lng:r.lng};fmapShow();F.map.setView([r.lat,r.lng],16);setPin(F.loc);gs(`已定位：${r.name.slice(0,60)}。位置不對的話，直接點地圖重新選擇。`)}catch(x){gs('無法查詢（可能離線）。請在地圖上手動點選位置。');fmapShow()}return}
if(a=='pick'){fmapShow();gs('請在地圖上點選位置。');return}
if(a=='clr'){F.loc=null;if(F.pin){F.pin.remove();F.pin=null}gs('已清除位置。');return}
if(a=='dgeo'){const q=$('#dest').value.trim(),s=$('#dgs');if(!q){s.textContent='請先輸入目的地。';return}s.textContent='查詢中…';try{const r=await geocode(q);if(!r){s.textContent='查不到這個地點，請換個寫法（例如加上國家）。';return}ovDest={lat:r.lat,lng:r.lng};s.textContent=`已定位：${r.name.slice(0,50)}（按「儲存」後生效）`}catch(x){s.textContent='無法查詢（可能離線），之後連線時再試。'}}});
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&!$('#mo').hidden)closeBig()});
