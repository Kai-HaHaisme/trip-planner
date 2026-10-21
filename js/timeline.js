/* 階段 2：時間軸與行程表單 */
const CAT6=['景點','美食','交通','住宿','購物','其他'];
const TZS=[['Asia/Taipei','台北'],['Asia/Tokyo','東京'],['Asia/Seoul','首爾'],['Asia/Hong_Kong','香港'],['Asia/Bangkok','曼谷'],['Asia/Singapore','新加坡'],['Europe/London','倫敦'],['Europe/Paris','巴黎'],['America/New_York','紐約'],['America/Los_Angeles','洛杉磯'],['Australia/Sydney','雪梨']];
const CURS=['TWD','JPY','USD','EUR','KRW','HKD','THB','SGD','GBP','CNY','AUD'];
let tl={sel:'all',del:null,pick:null},F=null;
const tzOff=(tz,d)=>{try{const s=new Intl.DateTimeFormat('en',{timeZone:tz,timeZoneName:'shortOffset'}).formatToParts(new Date((d||'2026-01-01')+'T12:00:00Z')).find(x=>x.type=='timeZoneName').value,m=s.match(/GMT([+-])(\d+)(?::(\d+))?/);return m?(m[1]=='-'?-1:1)*(+m[2]*60+ +(m[3]||0)):0}catch(e){return 0}};
const tzLab=(tz,d)=>{const o=tzOff(tz,d),a=Math.abs(o);return'GMT'+(o<0?'-':'+')+Math.floor(a/60)+(a%60?':'+String(a%60).padStart(2,'0'):'')};
const daysOf=t=>{const r=[];for(let d=new Date(t.start+'T00:00:00Z');d<=new Date(t.end+'T00:00:00Z');d=new Date(+d+864e5))r.push(d.toISOString().slice(0,10));return r};
const wk=d=>'日一二三四五六'[new Date(d+'T00:00:00Z').getUTCDay()];
const byTime=(a,b)=>(a.start?.time||'99').localeCompare(b.start?.time||'99');
const opts=(a,sel)=>a.map(x=>`<option value="${esc(x[0])}" ${x[0]==sel?'selected':''}>${esc(x[1])}</option>`).join('');

/* ---------- 時間軸 ---------- */
function icard(t,i,k,D){const s=i.start||{},multi=t.members.length>1;
const tm=s.time?`<div class="time">${s.time}${i.end?.time?' → '+i.end.time:''}<small>${tzLab(s.tz,i.date)}${i.end&&i.end.tz!=s.tz?' → '+tzLab(i.end.tz,i.date):''}</small></div>`:`<div class="time" style="color:var(--sub)">${k=='u'?'未排程':'未設定時間'}</div>`;
const tg=[];if(i.amount>0){tg.push(`<span class="tag2 money">${i.currency} ${i.amount.toLocaleString()}</span>`);
if(multi&&i.split){const m=t.members.find(x=>x.id==i.split.payer),n=(i.split.shares||[]).filter(x=>x.included).length;tg.push(`<span class="tag2">付款人：${esc(m?.name||'')}</span><span class="tag2">${i.split.mode=='A'?'均分 '+t.members.length+' 人':i.split.mode=='B'?'指定 '+n+' 人':'各自金額'}</span>`)}}
let p='';if(tl.del==i.id)p=`<div class="panel w">刪除「${esc(i.name)}」？${i.photos?.length?`其中 ${i.photos.length} 張照片也會一併刪除。`:''}<div class="r"><button class="btn sm" data-t="delc">取消</button><button class="btn sm d" data-t="dely" data-id="${i.id}">確認刪除</button></div></div>`;
if(tl.pick==i.id)p=`<div class="panel"><label>排入哪一天<select id="pk">${D.map((d,n)=>`<option value="${d}">第 ${n+1} 天（${fmt(d)}）</option>`).join('')}</select></label><div class="r"><button class="btn sm" data-t="delc">取消</button><button class="btn main sm" data-t="picky" data-id="${i.id}">排入</button></div></div>`;
return`<article class="ic${k=='a'?' alt':''}${i.location?' hm':''}"><span class="cat">${k=='a'?'<b class="bk2">備案</b>':''}${esc(i.category)}</span><div class="icl">${tm}<div class="nm">${esc(i.name)}</div>${i.address?`<div class="ir">${esc(i.address)}</div>`:''}${i.note?`<div class="ir"><span>${esc(i.note)}</span></div>`:''}${tg.length?`<div class="tgs">${tg.join('')}</div>`:''}${i.photos?.length?`<div class="ths">${i.photos.map(x=>`<button class="thb" data-t="ph" data-id="${x.id}" aria-label="放大 ${esc(x.name)}"><img src="${x.thumb}" alt="${esc(x.name)}"></button>`).join('')}</div>`:''}</div>${i.location?`<button class="mapb" data-g="map" data-id="${i.id}" data-lat="${i.location.lat}" data-lng="${i.location.lng}" aria-label="放大地圖：${esc(i.name)}"><div class="mi"></div></button>`:''}
<div class="ia">${k=='a'?`<button data-t="a2n" data-id="${i.id}">轉為正式行程</button>`:''}${k=='u'?`<button data-t="pick" data-id="${i.id}">排入某一天</button>`:''}<a href="#/trip/${t.id}/item/${i.id}">編輯</a><button data-t="del" data-id="${i.id}">刪除</button></div>${p}</article>`}
function timelinePage(t){const D=daysOf(t),sel=tl.sel=='all'||tl.sel=='u'||D.includes(tl.sel)?tl.sel:'all';tl.sel=sel;
const un=t.items.filter(i=>!i.date),tabs=[['all','全部天數'],...D.map((d,n)=>[d,`第 ${n+1} 天（${d.slice(5).replace('-','/')}）`]),['u',`未排程（${un.length}）`]];
let h=`<div class="tabs2">${tabs.map(([k,n])=>`<button data-t="tab" data-v="${k}" aria-pressed="${k==sel}">${n}</button>`).join('')}</div><a class="btn main addb" href="#/trip/${t.id}/item/new/${sel=='all'?'':sel}">＋ 新增行程項目</a>`;
D.forEach((d,n)=>{if(sel!='all'&&sel!=d)return;const its=t.items.filter(i=>i.date==d),main=its.filter(i=>!i.isAlt).sort(byTime),alt=its.filter(i=>i.isAlt).sort(byTime);
const st=t.items.filter(i=>i.category=='住宿'&&!i.isAlt&&i.checkOut&&i.date<d&&d<=i.checkOut).map(i=>`<div class="stay">${i.checkOut==d?'今天退房':'住宿中'}：${esc(i.name)}</div>`).join('');
h+=`<section class="day"><h2>第 ${n+1} 天<small>${fmt(d)}（週${wk(d)}）</small></h2>${dayLoc(t,d)?`<div class="wx" data-wx="${d}">天氣載入中…</div>`:''}${st}${main.map(i=>icard(t,i,'n',D)).join('')||'<div class="empty">這天還沒有行程。</div>'}${alt.length?`<p class="sub">備案（不計入費用與分帳）</p>`+alt.map(i=>icard(t,i,'a',D)).join(''):''}</section>`});
if(sel=='all'||sel=='u')h+=`<section class="day"><h2>未排程（${un.length}）<small>不計入費用</small></h2>${un.map(i=>icard(t,i,'u',D)).join('')||'<div class="empty">沒有未排程項目。尚未決定日期的景點，可以先在「新增行程項目」把日期選成「未排程」。</div>'}</section>`;
h+=geoFoot(t);return h}

/* ---------- 行程表單 ---------- */
const prev=(t,d)=>[...t.items].filter(i=>i.date==d&&i.start?.time).sort(byTime).pop()?.start.tz||[...t.items].reverse().find(i=>i.start?.tz)?.start.tz||'Asia/Taipei';
function formPage(t,id,arg){const old=id=='new'?null:t.items.find(i=>i.id==id);if(id!='new'&&!old){location.hash=`#/trip/${t.id}/timeline`;return''}
const D=daysOf(t),i=old||{category:'景點',name:'',date:arg=='u'?null:(D.includes(arg)?arg:(D.includes(tl.sel)?tl.sel:D[0])),checkOut:null,isAlt:false,start:{time:'',tz:''},end:null,address:'',note:'',amount:0,currency:t.baseCurrency,photos:[]};
if(!i.start.tz)i.start.tz=prev(t,i.date);
F={loc:i.location?{...i.location}:null,old,t,photos:(i.photos||[]).map(p=>({...p})),removed:[],end:!!i.end,item:i,shares:i.split?.shares||[]};
const multi=t.members.length>1,cur2=[...new Set([t.baseCurrency,...CURS])],z=i.start.tz,z2=i.end?.tz||z;
return`<h1 style="margin-top:14px">${old?'編輯':'新增'}行程項目</h1><div id="fm"><div class="cols"><div class="col2">
<fieldset><legend>基本資訊</legend><div class="seg" id="fcat">${CAT6.map(c=>`<label><input type="radio" name="cat" value="${c}" ${c==i.category?'checked':''}><span>${c}</span></label>`).join('')}</div>
<label class="f">地點／景點名稱 *<input id="nm" value="${esc(i.name)}"></label><div class="err" id="e-nm" hidden>請輸入名稱</div>
<div class="g2"><label class="f"><span id="dl">日期</span><select id="dt">${opts([...D.map((d,n)=>[d,`第 ${n+1} 天（${fmt(d)}）`]),['u','未排程（尚未決定日期）']],i.date||'u')}</select></label><label class="f" id="outw" hidden>退房日<select id="dt2"></select></label></div>
<label class="f" style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="alt" ${i.isAlt?'checked':''}>設為備案（不計入費用與分帳）</label></fieldset>
<fieldset><legend>時間</legend><div class="g3"><label class="f"><span id="t1l">開始時間 *</span><input type="time" id="t1" value="${i.start.time||''}"></label><label class="f">時區<select id="z1">${opts(TZS.map(x=>[x[0],x[1]+' '+tzLab(x[0],i.date)]),z)}</select></label></div><div class="err" id="e-t1" hidden>請設定開始時間，或將日期設為「未排程」</div>
<button class="btn sm" type="button" data-t="fend" id="fend" ${F.end?'hidden':''} style="margin-top:10px">＋ 加入結束時間</button>
<div class="g3" id="endb" ${F.end?'':'hidden'}><label class="f">結束時間<input type="time" id="t2" value="${i.end?.time||''}"></label><label class="f">時區<select id="z2">${opts(TZS.map(x=>[x[0],x[1]+' '+tzLab(x[0],i.date)]),z2)}</select></label></div>
<button class="btn sm" type="button" data-t="frm" id="frm" ${F.end?'':'hidden'} style="margin-top:8px">移除結束時間</button><div class="hint">時區預設帶入同日前一個項目的時區。</div><div class="hint" id="dur"></div></fieldset>
<fieldset><legend>地點</legend><label class="f">地址</label><div style="display:flex;gap:8px"><input id="ad" value="${esc(i.address)}" aria-label="地址" style="margin:0"><button class="btn" type="button" data-g="geo">查詢座標</button></div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm" type="button" data-g="pick">在地圖上選位置</button><button class="btn sm" type="button" data-g="clr">清除位置</button></div><div class="hint" id="gs">有位置的行程，時間軸卡片會顯示小地圖，也會用於當天的天氣。查詢需要網路；離線時可手動點選位置。</div><div id="fmap" hidden></div></fieldset></div>
<div class="col2"><fieldset><legend>備註／交通／票券資訊</legend><textarea id="nt">${esc(i.note)}</textarea></fieldset>
<fieldset><legend>照片（<span id="pc">0</span> / 50）</legend><div class="seg"><label><input type="radio" name="lv" value="1600" checked><span>一般照片</span></label><label><input type="radio" name="lv" value="2400"><span>文件／票券</span></label><label><input type="radio" name="lv" value="0"><span>原圖</span></label></div>
<div class="hint" id="lh">長邊 1600px、品質 80%。適合景點、餐點、風景。</div><label class="btn sm" style="display:inline-block;margin-top:10px">選擇照片<input type="file" id="pf" accept="image/*" multiple hidden></label><div class="err" id="e-ph" hidden></div><div class="fth" id="fth"></div></fieldset>
<fieldset><legend>費用</legend><div class="g3"><label class="f">金額<input type="number" id="am" min="0" step="any" value="${i.amount||''}" placeholder="0"></label><label class="f">幣別<select id="cu">${opts(cur2.map(c=>[c,c]),i.currency)}</select></label></div>
<div id="sp" ${multi?'':'hidden'}><label class="f">付款人<select id="py">${opts(t.members.map(m=>[m.id,m.name]),i.split?.payer||t.members[0].id)}</select></label><div class="f" style="margin-top:12px">分擔方式</div>
<div class="seg" id="md">${[['A','全員均分'],['B','指定部分人均分'],['C','每人指定金額']].map(([v,n])=>`<label><input type="radio" name="md" value="${v}" ${v==(i.split?.mode||'A')?'checked':''}><span>${n}</span></label>`).join('')}</div><div id="ms"></div><div class="hint" id="sm2"></div></div>
<div class="hint" id="an" hidden>備案不計入費用與分帳，金額僅供參考。</div></fieldset></div></div>
<div class="bar"><a class="btn" style="text-decoration:none" href="#/trip/${t.id}/timeline">取消</a><button class="btn main" data-t="fsave">儲存</button></div></div>`}
const fv=n=>document.querySelector(`[name=${n}]:checked`)?.value;
function formInit(){if(!F||!$('#fm'))return;fMems();fPh();fUI();fmapInit()}
function fMems(){const m=fv('md'),old={};$$('#ms .fm').forEach(r=>old[r.dataset.m]=[r.querySelector('[type=checkbox]').checked,r.querySelector('[type=number]')?.value]);
const sh=F.shares;$('#ms').innerHTML=F.t.members.map(x=>{const s=sh.find(y=>y.member==x.id),o=old[x.id];const on=m=='A'||(o?o[0]:(s?s.included:true)),v=o?o[1]:(s?.amount??'');
return`<div class="fm" data-m="${x.id}"><input type="checkbox" aria-label="${esc(x.name)}" ${on?'checked':''} ${m!='B'?'disabled':''} ${m=='C'?'hidden':''}><span class="n">${esc(x.name)}</span>${m=='C'?`<input type="number" min="0" step="any" value="${v}" aria-label="${esc(x.name)}的金額">`:'<span class="a"></span>'}</div>`}).join('');fCalc()}
function fCalc(){if(!$('#ms'))return true;const m=fv('md'),a=+$('#am').value||0,rows=$$('#ms .fm');
if(m=='C'){const s=rows.reduce((x,r)=>x+(+r.querySelector('[type=number]').value||0),0);$('#sm2').innerHTML=`已分配 ${s} / ${a}`+(Math.abs(s-a)>.001?`<span class="err">（差 ${+(a-s).toFixed(2)}）</span>`:' ✓');return Math.abs(s-a)<=.001}
const on=rows.filter(r=>r.querySelector('[type=checkbox]').checked);rows.forEach(r=>r.querySelector('.a').textContent=on.includes(r)&&a?`${+(a/on.length).toFixed(2)} ${$('#cu').value}`:'');
$('#sm2').innerHTML=on.length?'':'<span class="err">請至少選擇 1 位分擔者</span>';return on.length>0}
function fUI(){if(!$('#fm'))return;const stay=fv('cat')=='住宿',un=$('#dt').value=='u',alt=$('#alt').checked,D=daysOf(F.t);
$('#dl').textContent=stay?'入住日':'日期';$('#outw').hidden=!stay||un;
if(stay&&!un){const cur=$('#dt2').value||F.item.checkOut||'';$('#dt2').innerHTML='<option value="">不設定</option>'+D.filter(d=>d>$('#dt').value).map(d=>`<option value="${d}" ${d==cur?'selected':''}>${fmt(d)}</option>`).join('')}
$('#sp').classList.toggle('dim',alt);$('#an').hidden=!alt;$('#t1l').textContent=un?'開始時間（選填）':'開始時間 *';
const a=$('#t1').value,b=$('#t2').value;$('#dur').textContent='';if(F.end&&a&&b){const mn=t=>+t.slice(0,2)*60+ +t.slice(3,5),d0=un?'':$('#dt').value;let d=(mn(b)-tzOff($('#z2').value,d0))-(mn(a)-tzOff($('#z1').value,d0));if(d<0)d+=1440;$('#dur').textContent=`時間長度：${Math.floor(d/60)} 小時 ${d%60} 分（已換算時區）`}}
const kb=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';
function fPh(){$('#pc').textContent=photoN(F.t)-(F.old?.photos?.length||0)+F.photos.length;$('#fth').innerHTML=F.photos.map((p,k)=>`<div><img src="${p.thumb}" alt="${esc(p.name)}">${p.w}×${p.h}<br>${kb(p.bytes)}（${p.level}）<br><button type="button" data-t="rmp" data-k="${k}">移除</button></div>`).join('')}
async function prep(f,L,lab){const b=await createImageBitmap(f),m=Math.max(b.width,b.height),draw=(s,q)=>{const c=document.createElement('canvas');c.width=Math.round(b.width*s);c.height=Math.round(b.height*s);c.getContext('2d').drawImage(b,0,0,c.width,c.height);return c};
let blob=f,w=b.width,h=b.height;if(L&&m>L){const c=draw(L/m);w=c.width;h=c.height;blob=await new Promise(r=>c.toBlob(r,'image/jpeg',L==2400?.9:.8))}
return{id:DB.uid('p'),name:f.name,level:lab,w,h,bytes:blob.size,blob,thumb:draw(Math.min(1,160/m)).toDataURL('image/jpeg',.7)}}
async function fSave(){const t=F.t,un=$('#dt').value=='u',nm=$('#nm').value.trim(),alt=$('#alt').checked,multi=t.members.length>1;let ok=true;
$('#e-nm').hidden=!!nm;if(!nm)ok=false;const noT=!un&&!$('#t1').value;$('#e-t1').hidden=!noT;if(noT)ok=false;if(multi&&!alt&&!fCalc())ok=false;
if(!ok){document.querySelector('.err:not([hidden])')?.scrollIntoView({block:'center'});return}
const stay=fv('cat')=='住宿',m=fv('md'),rows=$$('#ms .fm'),old=F.old;
const it={id:old?.id||DB.uid('i'),category:fv('cat'),name:nm,date:un?null:$('#dt').value,checkOut:stay&&!un&&$('#dt2').value||null,isAlt:alt,start:{time:$('#t1').value||null,tz:$('#z1').value},end:F.end&&$('#t2').value?{time:$('#t2').value,tz:$('#z2').value}:null,
address:$('#ad').value.trim(),location:F.loc||null,note:$('#nt').value,amount:+$('#am').value||0,currency:$('#cu').value,photos:F.photos.map(({blob,...p})=>p)};
if(multi)it.split={payer:$('#py').value,mode:m,shares:rows.map(r=>({member:r.dataset.m,included:r.querySelector('[type=checkbox]').checked,amount:m=='C'?+r.querySelector('[type=number]').value||0:null}))};else if(old?.split)it.split=old.split;
for(const p of F.photos)if(p.blob)await DB.putPhoto({id:p.id,tripId:t.id,blob:p.blob});for(const id of F.removed)await DB.delPhoto(id);
if(old)t.items[t.items.indexOf(old)]=it;else t.items.push(it);await DB.put(t);tl.sel=it.date||'u';location.hash=`#/trip/${t.id}/timeline`}

/* ---------- 事件 ---------- */
async function openPhoto(id){const r=await DB.getPhoto(id);if(!r)return;$('#lbi').src=URL.createObjectURL(r.blob);$('#lbi').className='';$('#lb').hidden=false}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-t]');if(e.target.id=='lbi'){e.target.classList.toggle('z');return}if(!b)return;const a=b.dataset.t,id=b.dataset.id,t=cur,it=t&&id?t.items.find(x=>x.id==id):null;
if(a=='lbx'){$('#lb').hidden=true;URL.revokeObjectURL($('#lbi').src);return}
if(a=='ph'){openPhoto(id);return}
if(a=='tab')tl.sel=b.dataset.v;else if(a=='del')tl={...tl,del:id,pick:null};else if(a=='delc')tl={...tl,del:null,pick:null};else if(a=='pick')tl={...tl,pick:id,del:null};
else if(a=='dely'){for(const p of it.photos||[])await DB.delPhoto(p.id);t.items.splice(t.items.indexOf(it),1);await DB.put(t);tl.del=null}
else if(a=='a2n'){it.isAlt=false;await DB.put(t)}
else if(a=='picky'){it.date=$('#pk').value;if(it.checkOut&&it.checkOut<=it.date)it.checkOut=null;tl.pick=null;await DB.put(t);tl.sel=it.date}
else if(a=='fend'){F.end=true;$('#endb').hidden=false;$('#frm').hidden=false;$('#fend').hidden=true;$('#z2').value=$('#z1').value;fUI();return}
else if(a=='frm'){F.end=false;$('#endb').hidden=true;$('#frm').hidden=true;$('#fend').hidden=false;$('#t2').value='';fUI();return}
else if(a=='rmp'){const p=F.photos.splice(+b.dataset.k,1)[0];if(!p.blob)F.removed.push(p.id);fPh();return}
else if(a=='fsave'){fSave();return}else return;route()});
document.addEventListener('input',e=>{if(!$('#fm'))return;if(e.target.closest('#ms')||e.target.id=='am')fCalc();fUI()});
document.addEventListener('change',async e=>{if(!$('#fm'))return;const x=e.target;if(x.name=='md')fMems();if(x.id=='cu')fCalc();
if(x.name=='lv')$('#lh').textContent={1600:'長邊 1600px、品質 80%。適合景點、餐點、風景。',2400:'長邊 2400px、品質 90%。適合地圖、時刻表、票券、QR Code。',0:'不壓縮，保留原圖。單張可能達數 MB。'}[x.value];
if(x.id=='pf'){const lv=+fv('lv'),lab={1600:'一般照片',2400:'文件／票券',0:'原圖'}[lv];$('#e-ph').hidden=true;for(const f of x.files){if(photoN(F.t)-(F.old?.photos?.length||0)+F.photos.length>=50){$('#e-ph').textContent='每趟旅行最多 50 張照片';$('#e-ph').hidden=false;break}
try{F.photos.push(await prep(f,lv,lab))}catch(err){$('#e-ph').textContent=`「${f.name}」無法讀取，已略過`;$('#e-ph').hidden=false}}x.value='';fPh()}});
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&!$('#lb').hidden)$('#lbx').click()});
