/* 階段 3：費用與預算（圓環圖、預算、明細、分帳、匯率） */
const XC=['景點','美食','交通','住宿','購物','其他'],XCOL=['#8c7b6b','#a65e4e','#6f8277','#c2a878','#7d8aa0','#b0a99f'];
let ex={sk:'t',sd:1,fc:'',fp:''};const XDEF={t:1,c:1,a:-1,p:1},XLB={t:'日期時間',c:'類別',a:'金額',p:'付款人'},XLD={t:['早→晚','晚→早'],c:['分類順序','反向'],a:['大→小','小→大'],p:['旅伴順序','反向']};
const xr=u=>u==cur.baseCurrency?1:(cur.rates[u]?.manual??cur.rates[u]?.auto??null),xv=i=>{const r=xr(i.currency);return r==null?0:i.amount*r};
const xf=n=>Math.round(n).toLocaleString(),xn=n=>`${cur.baseCurrency} ${xf(n)}`,xsum=a=>a.reduce((s,i)=>s+xv(i),0),xmulti=()=>cur.members.length>1;
const xexps=()=>cur.expenses||(cur.expenses=[]);
const xcounted=()=>[...cur.items.filter(i=>!i.isAlt&&i.date&&i.amount>0),...xexps().filter(e=>e.amount>0).map(e=>({...e,start:null,exp:1}))],xused=()=>[...new Set([...cur.items,...xexps()].map(i=>i.currency).filter(c=>c&&c!=cur.baseCurrency))];
function expensesPage(t){return`<h1 style="margin-top:14px">費用與預算</h1><div class="mt" id="xmeta"></div><div id="xpg"><div style="margin-top:10px"><button class="btn main" data-x="fo">＋ 記一筆臨時花費</button></div><div class="hint">旅途中臨時產生的花費（餐費、禮品等）。會一併計入總額、預算與分帳。</div><div id="xform"></div><div class="cols"><div class="col2">
<fieldset><legend>費用統計</legend><div class="donut" id="xd"></div></fieldset>
<fieldset><legend>預算</legend><div class="br" id="xbt"></div><div id="xbc"></div><div class="err" id="xbw" hidden></div><div class="hint">預算以主幣別（${esc(t.baseCurrency)}）設定；分類預算可留白。</div></fieldset></div>
<div class="col2"><fieldset id="xsb"><legend>分帳</legend><div class="tbl"><table id="xmt"></table></div><div class="set" id="xst"></div><div class="hint">備案與未排程不計入分帳。外幣依下方匯率換算成主幣別後結算。</div><div class="hint" id="xsn" hidden>已付與應付包含「各自負擔」的金額，不影響結算。</div></fieldset>
<fieldset><legend>匯率（1 外幣 = ? ${esc(t.baseCurrency)}）</legend><div class="tbl"><table id="xrt" class="rt"></table></div><div class="hint" id="xrh"></div><div style="margin-top:8px"><button class="btn sm" data-x="rf">立即更新匯率</button></div><div class="hint">匯率資料來自 <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>，每日更新一次。手動值優先於自動值。</div></fieldset></div></div>
<fieldset><legend>費用明細</legend><div class="hint">行程項目由時間軸自動帶入（要修改請回到時間軸）；標示「臨時」的是在這裡記錄的花費，可直接編輯。</div><div class="srt" id="xs"></div><div class="srt" id="xfl"></div><div class="tbl"><table id="xdt"></table></div><div class="hint" id="xex"></div></fieldset></div>`}
function exInit(){const t=cur,B=t.budget;
$('#xbt').innerHTML=`<div class="h"><span>總預算</span><input type="number" id="xbi" min="0" value="${B.total||''}" aria-label="總預算"></div><div class="tr"><i></i></div><div class="st"></div>`;
$('#xbc').innerHTML=XC.map(c=>`<div class="br" data-c="${c}"><div class="h"><span>${c}</span><input type="number" min="0" value="${B.byCategory?.[c]||''}" aria-label="${c}預算"></div><div class="tr"><i></i></div><div class="st"></div></div>`).join('');
$('#xfl').innerHTML=`<span class="hint">篩選：</span><select id="xfc" aria-label="類別篩選"><option value="">全部類別</option>${XC.map(c=>`<option>${c}</option>`).join('')}</select><span id="xfpw"><select id="xfp" aria-label="付款人篩選"><option value="">全部付款人</option>${t.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}<option value="self">各自負擔</option></select></span><span class="hint" id="xfn"></span>`;
$('#xfc').value=ex.fc;$('#xfp').value=ex.fp;exUpdate();fetchRates(false)}
async function fetchRates(force){const t=cur,used=xused();if(!used.length)return;
const stale=used.some(u=>t.rates[u]?.auto==null)||!t.ratesAt||Date.now()-t.ratesAt>6*36e5;if(!force&&!stale)return;
try{const j=await(await fetch(`https://open.er-api.com/v6/latest/${t.baseCurrency}`)).json();if(j.result!='success')throw 0;
used.forEach(u=>{if(j.rates[u])t.rates[u]={manual:null,...t.rates[u],auto:1/j.rates[u]}});t.ratesAt=(j.time_last_update_unix||Date.now()/1e3)*1e3;await DB.put(t,false);if($('#xpg'))exUpdate();}
catch(e){if($('#xrh'))$('#xrh').textContent='無法取得匯率（可能離線），沿用上次的值。'}}
function xbar(el,spent,bud){el.classList.toggle('over',bud>0&&spent>bud);el.querySelector('.tr i').style.width=(bud>0?Math.min(100,spent/bud*100):0)+'%';
el.querySelector('.st').textContent=bud>0?`已花費 ${xn(spent)} / ${xn(bud)}（${Math.round(spent/bud*100)}%）`+(spent>bud?`，超支 ${xn(spent-bud)}`:`，剩 ${xn(bud-spent)}`):`已花費 ${xn(spent)}（未設預算）`}
function exUpdate(){if(!$('#xpg'))return;const t=cur,ok=xcounted(),tot=xsum(ok),by=XC.map(c=>xsum(ok.filter(i=>i.category==c))),pc=xmulti(),miss=xused().filter(u=>xr(u)==null);
$('#xmeta').innerHTML=miss.length?`<span class="err">缺少 ${miss.join('、')} 的匯率，相關項目暫未換算（請在下方手動輸入，或連線後更新）。</span>`:'';
let off=0;const C=2*Math.PI*60;$('#xd').innerHTML=`<svg viewBox="0 0 170 170" role="img" aria-label="各類別費用比例"><circle r="60" cx="85" cy="85" fill="none" stroke="var(--chip)" stroke-width="26"/>${by.map((v,k)=>{const l=tot?v/tot*C:0,s=`<circle r="60" cx="85" cy="85" fill="none" stroke="${XCOL[k]}" stroke-width="26" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`;off+=l;return s}).join('')}<text x="85" y="80" text-anchor="middle" font-size="11" style="fill:var(--sub)">總費用</text><text x="85" y="100" text-anchor="middle" font-size="15">${xf(tot)}</text></svg><div class="lg">${XC.map((c,k)=>by[k]?`<div><i style="background:${XCOL[k]}"></i><span>${c}</span><em>${xn(by[k])}&ensp;${Math.round(by[k]/tot*100)}%</em></div>`:`<div style="opacity:.5"><i style="background:${XCOL[k]}"></i><span>${c}</span><em>—</em></div>`).join('')}</div>`;
const tin=+$('#xbi').value||0;xbar($('#xbt'),tot,tin);let cs=0;$$('#xbc .br').forEach(e=>{const b=+e.querySelector('input').value||0;cs+=b;xbar(e,by[XC.indexOf(e.dataset.c)],b)});
$('#xbw').hidden=!(tin&&cs>tin);$('#xbw').textContent=`分類預算合計 ${xn(cs)}，超過總預算 ${xn(cs-tin)}（僅提示，不阻擋）。`;
const used=xused();$('#xrt').innerHTML=used.length?'<tr><th>幣別</th><th class="r">自動</th><th class="r">手動覆蓋</th><th class="r">使用中</th><th></th></tr>'+used.map(u=>{const r=t.rates[u]||{},e=xr(u);return`<tr><td>${u}</td><td class="r">${r.auto!=null?+r.auto.toFixed(4):'—'}</td><td class="r"><input type="number" step="any" min="0" data-u="${u}" value="${r.manual??''}" placeholder="—" aria-label="${u}手動匯率"></td><td class="r">${e!=null?+e.toFixed(4):'—'}<span class="tag" style="margin-left:6px">${r.manual!=null?'手動':'自動'}</span></td><td class="r">${r.manual!=null?`<button class="btn sm" data-x="rs" data-u="${u}">恢復自動</button>`:''}</td></tr>`}).join(''):'<tr><td class="hint">目前沒有外幣項目，不需要匯率。</td></tr>';
$('#xrh').textContent=used.length?(t.ratesAt?`自動匯率更新於 ${new Date(t.ratesAt).toLocaleString(LT(),{hour12:false})}（離線沿用上次的值）。`:'尚未取得自動匯率。'):'';
/* 明細 */const kf={t:i=>0,c:i=>XC.indexOf(i.category),a:xv,p:i=>{const p=i.split?.payer||t.members[0].id;return p=='self'?999:t.members.findIndex(m=>m.id==p)}}[ex.sk],tm=(a,b)=>((a.date||'9999')+(a.start?.time||'98')).localeCompare((b.date||'9999')+(b.start?.time||'98'));
if(ex.sk=='p'&&!pc)ex.sk='t';$('#xfpw').hidden=!pc;ex.fc=$('#xfc').value;ex.fp=pc?$('#xfp').value:'';
const rows=ok.filter(i=>(!ex.fc||i.category==ex.fc)&&(!ex.fp||(i.split?.payer||t.members[0].id)==ex.fp)).sort((a,b)=>ex.sk=='t'?ex.sd*tm(a,b):(kf(a)-kf(b))*ex.sd||tm(a,b)),fl=ex.fc||ex.fp;
$('#xs').innerHTML='<span class="hint">排序：</span>'+Object.keys(XLB).filter(x=>x!='p'||pc).map(x=>`<button data-x="s" data-k="${x}" aria-pressed="${x==ex.sk}">${XLB[x]}${x==ex.sk?'（'+XLD[x][ex.sd==XDEF[x]?0:1]+'）':''}</button>`).join('');
$('#xfn').textContent=fl?`顯示 ${rows.length} / ${ok.length} 筆`:'';
const pn=i=>{const p=i.split?.payer||t.members[0].id;return p=='self'?'各自負擔':esc(t.members.find(m=>m.id==p)?.name||'')};
$('#xdt').innerHTML=`<tr><th>日期時間</th><th>項目地點</th><th>類別</th>${pc?'<th>付款人</th>':''}<th class="r">金額</th><th class="r">約合 ${esc(t.baseCurrency)}</th><th></th></tr>`+(rows.length?'':`<tr><td colspan="7" class="hint">${ok.length?'沒有符合條件的項目':'還沒有計入費用的項目。到時間軸新增行程並填入金額。'}</td></tr>`)+rows.map(i=>`<tr><td>${i.date?i.date.slice(5).replace('-','/'):'—'} ${i.start?.time||''}</td><td>${esc(i.name)}${i.exp?'<span class="tag" style="margin-left:6px">臨時</span>':''}</td><td>${i.category}</td>${pc?`<td>${pn(i)}</td>`:''}<td class="r">${i.currency} ${i.amount.toLocaleString()}</td><td class="r">${i.currency==t.baseCurrency?'—':(xr(i.currency)==null?'—':xf(xv(i)))}</td><td class="r">${i.exp?`<button class="lk" data-x="ee" data-id="${i.id}">編輯</button> <button class="lk d" data-x="ed" data-id="${i.id}">刪除</button>`:''}</td></tr>`).join('')+`<tr><td colspan="${pc?4:3}"><b>${fl?'篩選結果合計':'合計'}</b></td><td></td><td class="r"><b>${xf(xsum(rows))}</b></td><td></td></tr>`;
const alt=t.items.filter(i=>i.isAlt&&i.amount>0),un=t.items.filter(i=>!i.isAlt&&!i.date&&i.amount>0);
$('#xex').textContent=alt.length||un.length?`另有 ${alt.length} 個備案、${un.length} 個未排程項目（含金額者），約 ${xn(xsum([...alt,...un]))} 未計入。`:'';
/* 分帳 */$('#xsb').hidden=!pc;if(!pc)return;$('#xsn').hidden=!ok.some(i=>i.split?.payer=='self');const paid={},owe={};t.members.forEach(m=>{paid[m.id]=0;owe[m.id]=0});
ok.forEach(i=>{const s=i.split||{payer:t.members[0].id,mode:'A',shares:[]},v=xv(i),r=xr(i.currency)||0,sh=[];
if(s.mode=='C')(s.shares||[]).forEach(x=>sh.push([x.member,(x.amount||0)*r]));else{const g=s.mode=='B'?(s.shares||[]).filter(x=>x.included).map(x=>x.member):t.members.map(m=>m.id);g.forEach(m=>sh.push([m,v/(g.length||1)]))}
if(s.payer=='self')sh.forEach(([m,a])=>paid[m]=(paid[m]||0)+a);else paid[s.payer]=(paid[s.payer]||0)+v;
sh.forEach(([m,a])=>owe[m]=(owe[m]||0)+a)});
const nm=id=>esc(t.members.find(m=>m.id==id)?.name||'');
$('#xmt').innerHTML='<tr><th>旅伴</th><th class="r">已付</th><th class="r">應付</th><th class="r">差額</th></tr>'+t.members.map(m=>{const d=paid[m.id]-owe[m.id];return`<tr><td>${nm(m.id)}</td><td class="r">${xf(paid[m.id])}</td><td class="r">${xf(owe[m.id])}</td><td class="r ${d<0?'neg':''}">${d>0?'+':''}${xf(d)}</td></tr>`}).join('');
const cr=t.members.map(m=>[m.id,paid[m.id]-owe[m.id]]).filter(x=>x[1]>.5).sort((a,b)=>b[1]-a[1]),db=t.members.map(m=>[m.id,owe[m.id]-paid[m.id]]).filter(x=>x[1]>.5).sort((a,b)=>b[1]-a[1]),tx=[];
while(cr.length&&db.length){const x=Math.min(cr[0][1],db[0][1]);tx.push(`${nm(db[0][0])} 付給 ${nm(cr[0][0])}　<b>${xn(x)}</b>`);cr[0][1]-=x;db[0][1]-=x;if(cr[0][1]<.5)cr.shift();if(db[0][1]<.5)db.shift()}
$('#xst').innerHTML=tx.length?'<div class="mt">結算建議（最少筆數）</div>'+tx.map(x=>`<div>${x}</div>`).join(''):'已結清，無需轉帳。'}
let xTimer;
document.addEventListener('input',e=>{if(!$('#xpg'))return;const x=e.target;if(x.dataset.u!=null)return;exUpdate();
if(x.closest('#xbt,#xbc')){clearTimeout(xTimer);xTimer=setTimeout(async()=>{const B=cur.budget;B.total=+$('#xbi').value||0;B.byCategory={};$$('#xbc .br').forEach(r=>{const v=+r.querySelector('input').value;if(v)B.byCategory[r.dataset.c]=v});await DB.put(cur)},500)}
});
document.addEventListener('change',async e=>{const x=e.target;if(!$('#xpg'))return;if(x.id=='xfc'||x.id=='xfp')exUpdate();
if(x.dataset.u!=null){const r=cur.rates[x.dataset.u]||(cur.rates[x.dataset.u]={});r.manual=x.value?+x.value:null;await DB.put(cur);exUpdate()}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-x]');if(!b||!$('#xpg'))return;const a=b.dataset.x;
if(a=='s'){const k=b.dataset.k;if(k==ex.sk)ex.sd=-ex.sd;else{ex.sk=k;ex.sd=XDEF[k]}exUpdate()}
else if(a=='rs'){cur.rates[b.dataset.u].manual=null;await DB.put(cur);exUpdate()}
else if(a=='rf'){$('#xrh').textContent='更新中…';await fetchRates(true)}});

/* ---------- 臨時花費（旅途中記一筆） ---------- */
let xe=null;
const xlast=()=>{try{return JSON.parse(LS('tp-lastexp-'+cur.id)||'{}')}catch(e){return{}}},xDefDate=()=>{const D=daysOf(cur),T=todayStr();return D.includes(T)?T:D[0]};
function xFormHtml(e,msg){const t=cur,L=xlast(),multi=t.members.length>1,D=daysOf(t),cs=[...new Set([t.baseCurrency,...CURS])],s=e?.split,mode=s?.mode||(L.mode&&L.mode!='C'?L.mode:'A');xe={id:e?.id||null,shares:s?.shares||[]};
return`${msg?`<div class="msg">${esc(msg)}</div>`:''}<div class="panel" id="xfm" style="margin-top:14px"><b>${e?'編輯臨時花費':'記一筆臨時花費'}</b>
<div class="seg">${XC.map(c=>`<label><input type="radio" name="ecat" value="${c}" ${c==(e?.category||L.category||'其他')?'checked':''}><span>${c}</span></label>`).join('')}</div>
<div class="g2"><label class="f" style="margin:0">項目名稱 *<input id="en" value="${esc(e?.name||'')}"></label><div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px"><label class="f" style="margin:0">金額 *<input type="number" id="ea" min="0" step="any" value="${e?.amount||''}"></label><label class="f" style="margin:0">幣別<select id="ec">${opts(cs.map(c=>[c,c]),e?.currency||L.currency||t.baseCurrency)}</select></label></div></div>
<div class="err" id="eer" hidden></div>
<div class="g2"><label class="f" style="margin:0">日期<select id="ed">${opts([...D.map((d,n)=>[d,`第 ${n+1} 天（${fmt(d)}）`]),['','不指定日期']],e?(e.date||''):xDefDate())}</select></label>${multi?`<label class="f" style="margin:0">付款人<select id="ep">${opts([...t.members.map(m=>[m.id,m.name]),['self','各自負擔']],s?.payer||L.payer||t.members[0].id)}</select></label>`:''}</div>
${multi?`<div class="hint" id="eph" ${(s?.payer||L.payer)=='self'?'':'hidden'}>各自負擔：每個人各付自己那一份，不產生轉帳；金額仍會計入統計。</div><div class="f" style="margin-top:4px">分擔方式</div><div class="seg">${[['A','全員均分'],['B','指定部分人均分'],['C','每人指定金額']].map(([v,n])=>`<label><input type="radio" name="emd" value="${v}" ${v==mode?'checked':''}><span>${n}</span></label>`).join('')}</div><div id="ems"></div><div class="hint" id="esm"></div>`:''}
<div class="r"><button class="btn sm" data-x="fc">取消</button>${e?'':'<button class="btn sm" data-x="fs" data-more="1">儲存並再記一筆</button>'}<button class="btn main sm" data-x="fs">儲存</button></div></div>`}
function eMems(){if(!$('#ems'))return;const m=$('[name=emd]:checked').value,old={};$$('#ems .fm').forEach(r=>old[r.dataset.m]=[r.querySelector('[type=checkbox]').checked,r.querySelector('[type=number]')?.value]);
$('#ems').innerHTML=cur.members.map(x=>{const s=xe.shares.find(y=>y.member==x.id),o=old[x.id],on=m=='A'||(o?o[0]:(s?s.included:true)),v=o?o[1]:(s?.amount??'');
return`<div class="fm" data-m="${x.id}"><input type="checkbox" aria-label="${esc(x.name)}" ${on?'checked':''} ${m!='B'?'disabled':''} ${m=='C'?'hidden':''}><span class="n">${esc(x.name)}</span>${m=='C'?`<input type="number" min="0" step="any" value="${v}" aria-label="${esc(x.name)}的金額">`:'<span class="a"></span>'}</div>`}).join('');eCalc()}
function eCalc(){if(!$('#ems'))return true;const m=$('[name=emd]:checked').value,a=+$('#ea').value||0,rows=$$('#ems .fm');
if(m=='C'){const s=rows.reduce((x,r)=>x+(+r.querySelector('[type=number]').value||0),0);$('#esm').innerHTML=`已分配 ${s} / ${a}`+(Math.abs(s-a)>.001?`<span class="err">（差 ${+(a-s).toFixed(2)}）</span>`:' ✓');return Math.abs(s-a)<=.001}
const on=rows.filter(r=>r.querySelector('[type=checkbox]').checked);rows.forEach(r=>r.querySelector('.a').textContent=on.includes(r)&&a?`${+(a/on.length).toFixed(2)} ${$('#ec').value}`:'');$('#esm').innerHTML=on.length?'':'<span class="err">請至少選擇 1 位分擔者</span>';return on.length>0}
const eOpen=(e,msg)=>{$('#xform').innerHTML=xFormHtml(e,msg);eMems();$('#xform').scrollIntoView({block:'center'});$('#en').focus()};
async function eSave(more){const t=cur,n=$('#en').value.trim(),a=+$('#ea').value,er=$('#eer'),multi=t.members.length>1;
if(!n){er.textContent='請輸入項目名稱';er.hidden=false;return}if(!(a>0)){er.textContent='請輸入大於 0 的金額';er.hidden=false;return}if(multi&&!eCalc())return;er.hidden=true;
const mode=multi?$('[name=emd]:checked').value:'A',rows=$$('#ems .fm'),old=xexps().find(e=>e.id==xe.id),now=Date.now();
const e={id:old?.id||DB.uid('e'),name:n,category:$('[name=ecat]:checked').value,date:$('#ed').value||null,amount:a,currency:$('#ec').value,createdAt:old?.createdAt||now,updatedAt:now};
if(multi)e.split={payer:$('#ep').value,mode,shares:rows.map(r=>({member:r.dataset.m,included:r.querySelector('[type=checkbox]').checked,amount:mode=='C'?+r.querySelector('[type=number]').value||0:null}))};
if(old)t.expenses[t.expenses.indexOf(old)]=e;else xexps().push(e);
LSet('tp-lastexp-'+t.id,JSON.stringify({payer:e.split?.payer,currency:e.currency,mode,category:e.category}));await DB.put(t);
const msg=`${old?'已更新':'已新增'}「${n}」。`;if(more)eOpen(null,msg);else $('#xform').innerHTML=`<div class="msg">${esc(msg)}</div>`;exUpdate();fetchRates(false)}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-x]');if(!b||!$('#xpg'))return;const a=b.dataset.x,id=b.dataset.id,x=id?xexps().find(i=>i.id==id):null;
if(a=='fo')eOpen(null);else if(a=='ee'&&x)eOpen(x);else if(a=='fc')$('#xform').innerHTML='';else if(a=='fs')eSave(!!b.dataset.more);
else if(a=='ed'&&x){$('#xform').innerHTML=`<div class="panel w" style="margin-top:14px">刪除「${esc(x.name)}」？<div class="r"><button class="btn sm" data-x="fc">取消</button><button class="btn sm d" data-x="edy" data-id="${x.id}">確認刪除</button></div></div>`;$('#xform').scrollIntoView({block:'center'})}
else if(a=='edy'&&x){cur.expenses.splice(cur.expenses.indexOf(x),1);await DB.put(cur);$('#xform').innerHTML=`<div class="msg">已刪除「${esc(x.name)}」。</div>`;exUpdate()}});
document.addEventListener('change',e=>{if(!$('#xfm'))return;if(e.target.name=='emd')eMems();else if(e.target.id=='ec')eCalc();else if(e.target.id=='ep')$('#eph').hidden=e.target.value!='self'});
document.addEventListener('input',e=>{if(!$('#xfm'))return;if(e.target.closest('#ems')||e.target.id=='ea')eCalc()});
