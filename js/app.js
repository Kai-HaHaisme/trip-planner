/* 路由、導覽、旅行列表、總覽、匯出入（階段 1） */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],DAY=864e5;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const todayStr=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dd=(a,b)=>Math.round((new Date(a)-new Date(b))/DAY),nDays=t=>dd(t.end,t.start)+1,fmt=d=>d.replace(/-/g,'/');
const agoDays=ts=>Math.floor((Date.now()-ts)/DAY),mb=n=>n<1?'不到 1 MB':n.toFixed(n<10?1:0)+' MB';
const stat=t=>{const T=todayStr();return T<t.start?[`${dd(t.start,T)} 天後出發`,1]:T<=t.end?['進行中',1]:['已結束',0]};
let ui={panel:null,msg:null},remind=14,cur=null,mem=null,cover,pend=null;
const PAGES=[['overview','總覽'],['timeline','時間軸'],['expenses','費用'],['packing','行李'],['wishlist','願望']];
const tripMB=t=>(new Blob([JSON.stringify(t)]).size+t.items.reduce((a,i)=>a+(i.photos||[]).reduce((b,p)=>b+(p.bytes||0),0),0))/1048576,photoN=t=>t.items.reduce((a,i)=>a+(i.photos?.length||0),0);
const needBackup=t=>remind>0&&t.meta.modifiedAt>(t.meta.lastBackupAt||0)&&(!t.meta.lastBackupAt||agoDays(t.meta.lastBackupAt)>=remind);

/* ---------- 路由與導覽 ---------- */
async function route(){const p=location.hash.slice(2).split('/');
if(p[0]=='trip'){cur=await DB.get(p[1]);if(!cur){location.hash='#/';return}if(p[2]=='item'){nav(cur,'timeline');$('#main').innerHTML=formPage(cur,p[3],p[4]);formInit();scrollTo(0,0);return}
const pg=PAGES.find(x=>x[0]==p[2])?p[2]:'overview';nav(cur,pg);
$('#main').innerHTML=(pg=='overview'?overview(cur):pg=='timeline'?timelinePage(cur):stub(cur,pg));if(pg=='overview')daysUI();scrollTo(0,0)}
else{cur=null;$('#side').hidden=true;$('#tabs').hidden=true;$('#top').innerHTML='<h1>旅遊規劃</h1>';$('#main').innerHTML=await tripsPage()}}
function nav(t,pg){const l=PAGES.map(([k,n])=>`<a href="#/trip/${t.id}/${k}" class="${k==pg?'on':''}">${n}</a>`).join('');
$('#side').hidden=false;$('#tabs').hidden=false;$('#side').innerHTML=`<a href="#/" style="padding-left:0">← 我的旅行</a><div class="tn">${esc(t.name)}</div><div class="mt" style="margin-bottom:12px">${fmt(t.start)} – ${fmt(t.end)}</div>${l}`;
$('#tabs').innerHTML=l;$('#top').innerHTML=`<a href="#/" aria-label="回旅行列表" style="text-decoration:none">←</a><h1>${esc(t.name)}</h1>`}
const stub=(t,pg)=>`<div class="ph"><h1>${PAGES.find(x=>x[0]==pg)[1]}</h1><p>此頁將在後續階段實作，畫面依已確認的原型。</p><p>目前這趟旅行：${t.items.length} 個行程、${t.packing.length} 個行李項目、${t.wishlist.length} 個願望。</p></div>`;

/* ---------- 旅行列表 ---------- */
function card(t){const[st,on]=stat(t),b=t.meta.lastBackupAt?`上次備份：${agoDays(t.meta.lastBackupAt)} 天前${t.meta.modifiedAt>t.meta.lastBackupAt?'（之後有修改）':''}`:'尚未備份',P=ui.panel,m=tripMB(t);let p='';
if(P&&P.id==t.id&&P.k=='exp')p=`<div class="panel"><b>匯出「${esc(t.name)}」</b><label class="o"><input type="radio" name="ph" value="1" checked><span>含照片（約 ${mb(m)}）<br><span class="mt">適合換手機或完整備份</span></span></label><label class="o"><input type="radio" name="ph" value="0"><span>不含照片<br><span class="mt">檔案小，適合傳給朋友查看行程</span></span></label><input id="fn" value="${esc(t.name)}_${todayStr()}.json" aria-label="檔名"><div class="r"><button class="btn sm" data-a="pc">取消</button><button class="btn main" data-a="pe" data-id="${t.id}">匯出</button></div></div>`;
if(P&&P.id==t.id&&P.k=='del')p=`<div class="panel w">刪除「${esc(t.name)}」後無法復原，其中的 ${t.items.length} 個行程和 ${photoN(t)} 張照片都會一併刪除。${t.meta.lastBackupAt?'':'<span class="err">這趟旅行還沒有備份。</span>'}<div class="r"><button class="btn sm" data-a="pc">取消</button><button class="btn sm" data-a="ex" data-id="${t.id}">先匯出備份</button><button class="btn sm d" data-a="dy" data-id="${t.id}">確認刪除</button></div></div>`;
return`<div class="card"><div class="top"><div class="cov" style="${t.cover?`background-image:url(${t.cover})`:''}" aria-hidden="true">${t.cover?'':esc(t.name[0]||'旅')}</div><div class="inf"><h2>${esc(t.name)}<span class="tag${on?' on':''}">${st}</span></h2><div class="mt">${fmt(t.start)} – ${fmt(t.end)}（${nDays(t)} 天）${t.destination.name?'· '+esc(t.destination.name):''}</div><div class="mt">${t.members.length} 位旅伴 · ${t.items.length} 個行程 · ${photoN(t)} 張照片 · ${mb(m)}</div><div class="bk${needBackup(t)?' w':''}">${b}</div></div></div><div class="ca"><a class="btn main sm" style="text-decoration:none;border-color:var(--ink)" href="#/trip/${t.id}/overview">開啟</a><button class="btn sm" data-a="ex" data-id="${t.id}">匯出</button><button class="btn sm" data-a="cp" data-id="${t.id}">複製</button><button class="btn sm d" data-a="dl" data-id="${t.id}">刪除</button></div>${p}</div>`}
async function tripsPage(){const all=await DB.all(),T=todayStr(),act=all.filter(t=>t.end>=T).sort((a,b)=>a.start.localeCompare(b.start)),old=all.filter(t=>t.end<T).sort((a,b)=>b.start.localeCompare(a.start)),nb=all.filter(needBackup),P=ui.panel;
let h=`<div class="bar" style="margin-top:10px"><button class="btn" data-a="imp">匯入檔案</button><button class="btn main" data-a="new">＋ 新增旅行</button></div><input type="file" id="file" accept=".json,application/json" hidden>`;
if(nb.length)h+=`<div class="note"><b>提醒備份</b>：${nb.map(t=>'「'+esc(t.name)+'」').join('、')}有尚未備份的修改。請按「匯出」備份。</div>`;
if(ui.msg)h+=`<div class="msg${ui.msg.e?' e':''}">${ui.msg.t}</div>`;
if(P&&P.k=='new')h+=`<div class="panel"><b>新增旅行</b><input id="nn" placeholder="旅行名稱，例如：大阪三日遊" aria-label="旅行名稱"><div class="g2"><input type="date" id="ns" aria-label="出發日期"><input type="date" id="ne" aria-label="結束日期"></div><div class="err" id="ne2"></div><div class="mt">其他設定（封面、目的地、旅伴）建立後在「總覽」補充。</div><div class="r"><button class="btn sm" data-a="pc">取消</button><button class="btn main" data-a="nok">建立</button></div></div>`;
if(P&&P.k=='conf'){const o=P.o.trip,ex=all.find(t=>t.id==o.id);h+=`<div class="panel w"><b>已有相同的旅行</b>檔案中的「${esc(o.name)}」與現有的「${esc(ex.name)}」是同一趟旅行。<label class="o"><input type="radio" name="cf" value="new" checked><span>另存為新旅行（兩份都保留）</span></label><label class="o"><input type="radio" name="cf" value="over"><span>覆蓋現有旅行（現有的修改會被檔案內容取代）</span></label><div class="r"><button class="btn sm" data-a="pc">取消匯入</button><button class="btn main" data-a="cok">匯入</button></div></div>`}
h+=`<div class="sec">進行中與即將出發（${act.length}）</div><div class="grid">${act.map(card).join('')||'<div class="mt">沒有即將到來的旅行。按「新增旅行」開始，或「匯入檔案」載入朋友分享的行程。</div>'}</div>`;
if(old.length)h+=`<div class="sec">已結束（${old.length}）</div><div class="grid">${old.map(card).join('')}</div>`;
h+=`<div class="sec">備份與儲存空間</div><div class="mt" style="margin-top:8px"><div id="st1">正在讀取儲存空間資訊…</div><div id="st2" style="margin-top:4px"></div><div style="margin-top:8px">備份提醒：<select id="rm" style="width:auto;display:inline-block"><option value="7">每 7 天</option><option value="14">每 14 天</option><option value="30">每 30 天</option><option value="0">不提醒</option></select></div><div style="margin-top:6px">資料只存在這個裝置的瀏覽器裡。清除瀏覽器資料或解除安裝可能讓資料消失，出發前請匯出備份。</div></div>`;
setTimeout(()=>{const r=$('#rm');if(r)r.value=remind;storage();$('#nn')?.focus()});return h}
async function storage(){try{const s=navigator.storage,[u,p]=await Promise.all([s.estimate(),s.persisted()]);$('#st1').textContent=`已使用 ${(u.usage/1048576).toFixed(1)} MB，可用上限約 ${Math.round(u.quota/1048576).toLocaleString()} MB。`;
const pe=ok=>{$('#st2').innerHTML=ok?'持久儲存：已啟用。':'持久儲存：尚未啟用 <button class="btn sm" id="ps">申請持久儲存</button>';$('#ps')&&($('#ps').onclick=async()=>pe(await s.persist()))};pe(p)}catch(e){$('#st1').textContent='此瀏覽器無法讀取儲存空間資訊。'}}

/* ---------- 匯出入 ---------- */
function download(name,obj){const b=new Blob([JSON.stringify(obj)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2e3)}
async function doExport(t,withPhotos,fn){const o=JSON.parse(JSON.stringify(t));if(!withPhotos)o.items.forEach(i=>i.photos=[]);else for(const i of o.items)for(const p of i.photos||[]){const r=await DB.getPhoto(p.id);if(r)p.data=await new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(f.result);f.readAsDataURL(r.blob)})}
download(fn.replace(/[\\/:*?"<>|]/g,'_'),{app:'trip-planner',version:1,exportedAt:new Date().toISOString(),includesPhotos:withPhotos,trip:o});t.meta.lastBackupAt=Date.now();await DB.put(t,false)}
function normalize(x){const b=DB.blank(x.name||'未命名',x.start,x.end);return{...b,...x,destination:{...b.destination,...x.destination},budget:{...b.budget,...x.budget},meta:{...b.meta,...x.meta},members:x.members?.length?x.members:b.members,
packingCategories:x.packingCategories?.length?x.packingCategories:b.packingCategories}}
async function importObj(o){ui.msg=null;const t=o?.trip;
if(!o||o.app!=='trip-planner'||!t||!t.name||!t.start||!t.end){ui.msg={e:1,t:'這不是旅遊規劃的匯出檔，無法匯入。'};return route()}
if(o.version>1){ui.msg={e:1,t:'這個檔案來自較新版本，請先更新 App 再匯入。'};return route()}
if(await DB.get(t.id)){ui.panel={k:'conf',o};return route()}await finishImport(t,false)}
async function finishImport(t,asNew){const n=normalize(t);if(asNew){n.id=DB.uid('t')}else await DB.clearPhotos(n.id);for(const i of n.items)for(const p of i.photos||[]){if(p.data){const id=asNew?DB.uid('p'):p.id;await DB.putPhoto({id,tripId:n.id,blob:await(await fetch(p.data)).blob()});p.id=id;delete p.data}}n.meta.lastBackupAt=Date.now();n.meta.modifiedAt=Math.min(n.meta.modifiedAt||0,n.meta.lastBackupAt);await DB.put(n,false);ui.panel=null;ui.msg={t:`已匯入「${esc(n.name)}」。`};route()}

/* ---------- 總覽 ---------- */
function overview(t){mem=t.members.map(m=>({...m}));cover=t.cover;pend=null;
const mems=()=>mem.map((m,i)=>`<div class="mem"><input value="${esc(m.name)}" data-i="${i}" aria-label="旅伴 ${i+1}"><span class="me">${i?'':'（我）'}</span>${i?`<button class="btn sm" data-a="rmm" data-i="${i}" type="button">移除</button>`:''}</div>`).join('');
setTimeout(()=>{$('#cur').value=t.baseCurrency;memUI()});
return`<h1 style="margin-top:14px">旅行總覽</h1><div class="cols"><div class="col2"><fieldset><legend>基本資訊</legend>
<div class="cover" id="cv" style="${cover?`background-image:url(${cover})`:''}">${cover?'':'尚未設定封面圖'}</div>
<div style="display:flex;gap:8px;margin-top:8px"><label class="btn sm">選擇封面圖<input type="file" id="cf" accept="image/*" hidden></label><button class="btn sm" id="rmc" data-a="rmc" type="button" ${cover?'':'hidden'}>移除</button></div>
<div class="hint">封面圖會自動壓縮（長邊 1600px、品質 80%）。</div>
<label class="f">旅行名稱 *<input id="name" value="${esc(t.name)}"></label><div class="err" id="e-name" hidden>請輸入旅行名稱</div>
<div class="g2"><label class="f">出發日期 *<input type="date" id="d1" value="${t.start}"></label><label class="f">結束日期 *<input type="date" id="d2" value="${t.end}"></label></div>
<div class="days" id="days"></div><div class="err" id="e-date" hidden>結束日期不能早於出發日期</div>
<label class="f">行程簡介<textarea id="desc">${esc(t.description)}</textarea></label></fieldset></div>
<div class="col2"><fieldset><legend>目的地與幣別</legend><label class="f">目的地（用於天氣預報）<input id="dest" value="${esc(t.destination.name)}"></label><div class="hint">座標查詢與天氣將在階段 5 啟用，目前先記錄名稱。</div>
<label class="f">主幣別<select id="cur"><option value="TWD">TWD 新台幣</option><option>JPY</option><option>USD</option><option>EUR</option><option>KRW</option></select></label></fieldset>
<fieldset><legend>旅伴名單</legend><div id="mems">${mems()}</div><button class="btn sm" data-a="addm" type="button" style="margin-top:10px">＋ 新增旅伴</button><div class="hint" id="mh"></div><div class="err" id="e-mem" hidden>旅伴名稱不可空白或重複</div></fieldset></div></div>
<div id="warn"></div><div class="bar"><button class="btn" data-a="rst">還原</button><button class="btn main" data-a="sv">儲存</button></div><div id="sm"></div>`}
function daysUI(){const n=$('#d1')&&$('#d2')?(new Date($('#d2').value)-new Date($('#d1').value))/DAY+1:0;if(!$('#days'))return;$('#e-date').hidden=n>0||!$('#d1').value||!$('#d2').value;$('#days').innerHTML=n>0?`共 <b>${n}</b> 天 ${n>1?(n-1)+' 晚':'當日來回'}`:'請設定正確的日期'}
const memUI=()=>{if($('#mh'))$('#mh').textContent=mem.length==1?'目前只有 1 人：付款人、分擔與分帳欄位會自動隱藏。':`共 ${mem.length} 人：第一位為你本人，無法移除。`};
function renderMems(){$('#mems').innerHTML=mem.map((m,i)=>`<div class="mem"><input value="${esc(m.name)}" data-i="${i}" aria-label="旅伴 ${i+1}"><span class="me">${i?'':'（我）'}</span>${i?`<button class="btn sm" data-a="rmm" data-i="${i}" type="button">移除</button>`:''}</div>`).join('');memUI()}
async function save(ok){const t=cur,name=$('#name').value.trim(),a=$('#d1').value,b=$('#d2').value,nm=mem.map(m=>m.name.trim());let bad=false;
$('#e-name').hidden=!!name;if(!name)bad=true;if(!a||!b||b<a){$('#e-date').hidden=false;bad=true}
const dup=nm.some(x=>!x)||new Set(nm).size!=nm.length;$('#e-mem').hidden=!dup;if(dup)bad=true;
if(bad){document.querySelector('.err:not([hidden])')?.scrollIntoView({block:'center'});return}
const moved=t.items.filter(i=>i.date&&(i.date<a||i.date>b)).length;
if(moved&&!ok){$('#warn').innerHTML=`<div class="panel w" style="margin-top:14px">新的日期範圍會讓 ${moved} 個行程項目落在範圍之外，它們將移到「未排程」區（不會刪除，暫時不計入費用）。要繼續嗎？<div class="r"><button class="btn sm" data-a="wn">返回修改</button><button class="btn main" data-a="sy">確認並儲存</button></div></div>`;$('#warn').scrollIntoView({block:'center'});return}
$('#warn').innerHTML='';t.items.forEach(i=>{if(i.date&&(i.date<a||i.date>b)){i.date=null;i.checkOut=null}});
mem.forEach((m,i)=>m.name=nm[i]);const ids=new Set(mem.map(m=>m.id));
t.items.forEach(i=>{if(i.split){if(!ids.has(i.split.payer))i.split.payer=mem[0].id;i.split.shares=(i.split.shares||[]).filter(s=>ids.has(s.member))}});
Object.assign(t,{name,start:a,end:b,description:$('#desc').value,cover,baseCurrency:$('#cur').value,members:mem.map(m=>({...m}))});t.destination.name=$('#dest').value.trim();
await DB.put(t);nav(t,'overview');$('#sm').innerHTML='<div class="msg">已儲存。</div>';setTimeout(()=>$('#sm')&&($('#sm').innerHTML=''),2500)}
async function compress(f,L=1600){const b=await createImageBitmap(f),s=Math.min(1,L/Math.max(b.width,b.height)),c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);c.getContext('2d').drawImage(b,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.8)}

/* ---------- 事件 ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,id=b.dataset.id;
if(a=='imp'){$('#file').click();return}
if(a=='pc'){ui.panel=null}else if(a=='new'){ui={panel:{k:'new'},msg:null}}else if(a=='ex'){ui={panel:{k:'exp',id},msg:null}}else if(a=='dl'){ui={panel:{k:'del',id},msg:null}}
else if(a=='dy'){await DB.del(id);ui={panel:null,msg:{t:'已刪除。'}}}
else if(a=='cp'){const t=await DB.get(id),n=JSON.parse(JSON.stringify(t));n.id=DB.uid('t');for(const i of n.items)for(const p of i.photos||[]){const r=await DB.getPhoto(p.id);if(r){const q=DB.uid('p');await DB.putPhoto({id:q,tripId:n.id,blob:r.blob});p.id=q}}n.name+='（副本）';n.meta={...n.meta,createdAt:Date.now(),lastBackupAt:null};await DB.put(n);ui={panel:null,msg:{t:`已複製「${esc(t.name)}」。`}}}
else if(a=='pe'){const t=await DB.get(id),ph=$('[name=ph]:checked').value=='1';await doExport(t,ph,$('#fn').value.trim()||'trip.json');ui={panel:null,msg:{t:`已匯出「${esc(t.name)}」（${ph?'含照片':'不含照片'}），請到瀏覽器的下載位置查看。`}}}
else if(a=='nok'){const n=$('#nn').value.trim(),s=$('#ns').value,en=$('#ne').value;if(!n||!s||!en){$('#ne2').textContent='請填寫名稱、出發日期與結束日期';return}if(en<s){$('#ne2').textContent='結束日期不能早於出發日期';return}
const t=DB.blank(n,s,en);await DB.put(t);location.hash=`#/trip/${t.id}/overview`;ui.panel=null;return}
else if(a=='cok'){const o=ui.panel.o.trip,m=$('[name=cf]:checked').value;if(m=='new')return finishImport(o,true);await finishImport(o,false);return}
else if(a=='addm'){if(mem.length>=8)return;mem.push({id:DB.uid('m'),name:''});renderMems();$$('#mems input')[mem.length-1].focus();return}
else if(a=='rmm'){mem.splice(+b.dataset.i,1);renderMems();return}
else if(a=='rmc'){cover=null;$('#cv').style.backgroundImage='';$('#cv').textContent='尚未設定封面圖';$('#rmc').hidden=true;return}
else if(a=='sv'){save(false);return}else if(a=='sy'){save(true);return}else if(a=='wn'){$('#warn').innerHTML='';return}
else if(a=='rst'){route();return}else return;route()});
document.addEventListener('input',e=>{if(e.target.dataset.i!=null&&mem)mem[e.target.dataset.i].name=e.target.value;if(e.target.id=='d1'||e.target.id=='d2')daysUI()});
document.addEventListener('change',async e=>{const x=e.target;
if(x.id=='rm'){remind=+x.value;await DB.setMeta('settings',{remind});route()}
if(x.id=='file'){const f=x.files[0];x.value='';if(!f)return;try{await importObj(JSON.parse(await f.text()))}catch(err){ui.msg={e:1,t:'檔案內容無法讀取，請確認是正確的 JSON 檔。'};route()}}
if(x.id=='cf'&&x.files[0]){const f=x.files[0];try{cover=await compress(f);$('#cv').style.backgroundImage=`url(${cover})`;$('#cv').textContent='';$('#rmc').hidden=false}catch(err){alert('這張圖片無法讀取')}x.value=''}});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.id=='nn')$('[data-a=nok]').click()});
addEventListener('hashchange',()=>{ui={panel:null,msg:null};route()});
(async()=>{try{remind=(await DB.getMeta('settings'))?.remind??14}catch(e){}route()})();
