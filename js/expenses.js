/* 階段 3：費用與預算（圓環圖、預算、明細、分帳、匯率） */
const XC=['景點','美食','交通','住宿','購物','其他'],XCOL=['#8c7b6b','#a65e4e','#6f8277','#c2a878','#7d8aa0','#b0a99f'];
let ex={sk:'t',sd:1,fc:'',fp:''};const XDEF={t:1,c:1,a:-1,p:1},XLB={t:'日期時間',c:'類別',a:'金額',p:'付款人'},XLD={t:['早→晚','晚→早'],c:['分類順序','反向'],a:['大→小','小→大'],p:['旅伴順序','反向']};
const xr=u=>u==cur.baseCurrency?1:(cur.rates[u]?.manual??cur.rates[u]?.auto??null),xv=i=>{const r=xr(i.currency);return r==null?0:i.amount*r};
const xf=n=>Math.round(n).toLocaleString(),xn=n=>`${cur.baseCurrency} ${xf(n)}`,xsum=a=>a.reduce((s,i)=>s+xv(i),0),xmulti=()=>cur.members.length>1;
const xcounted=()=>cur.items.filter(i=>!i.isAlt&&i.date&&i.amount>0),xused=()=>[...new Set(cur.items.map(i=>i.currency).filter(c=>c&&c!=cur.baseCurrency))];
function expensesPage(t){return`<h1 style="margin-top:14px">費用與預算</h1><div class="mt" id="xmeta"></div><div id="xpg"><div class="cols"><div class="col2">
<fieldset><legend>費用統計</legend><div class="donut" id="xd"></div></fieldset>
<fieldset><legend>預算</legend><div class="br" id="xbt"></div><div id="xbc"></div><div class="err" id="xbw" hidden></div><div class="hint">預算以主幣別（${esc(t.baseCurrency)}）設定；分類預算可留白。</div></fieldset></div>
<div class="col2"><fieldset id="xsb"><legend>分帳</legend><div class="tbl"><table id="xmt"></table></div><div class="set" id="xst"></div><div class="hint">備案與未排程不計入分帳。外幣依下方匯率換算成主幣別後結算。</div></fieldset>
<fieldset><legend>匯率（1 外幣 = ? ${esc(t.baseCurrency)}）</legend><div class="tbl"><table id="xrt" class="rt"></table></div><div class="hint" id="xrh"></div><div style="margin-top:8px"><button class="btn sm" data-x="rf">立即更新匯率</button></div><div class="hint">匯率資料來自 <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>，每日更新一次。手動值優先於自動值。</div></fieldset></div></div>
<fieldset><legend>費用明細</legend><div class="hint">由時間軸自動帶入，不能在此新增；要新增或修改請回到時間軸。</div><div class="srt" id="xs"></div><div class="srt" id="xfl"></div><div class="tbl"><table id="xdt"></table></div><div class="hint" id="xex"></div></fieldset></div>`}
function exInit(){const t=cur,B=t.budget;
$('#xbt').innerHTML=`<div class="h"><span>總預算</span><input type="number" id="xbi" min="0" value="${B.total||''}" aria-label="總預算"></div><div class="tr"><i></i></div><div class="st"></div>`;
$('#xbc').innerHTML=XC.map(c=>`<div class="br" data-c="${c}"><div class="h"><span>${c}</span><input type="number" min="0" value="${B.byCategory?.[c]||''}" aria-label="${c}預算"></div><div class="tr"><i></i></div><div class="st"></div></div>`).join('');
$('#xfl').innerHTML=`<span class="hint">篩選：</span><select id="xfc" aria-label="類別篩選"><option value="">全部類別</option>${XC.map(c=>`<option>${c}</option>`).join('')}</select><span id="xfpw"><select id="xfp" aria-label="付款人篩選"><option value="">全部付款人</option>${t.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></span><span class="hint" id="xfn"></span>`;
$('#xfc').value=ex.fc;$('#xfp').value=ex.fp;exUpdate();fetchRates(false)}
async function fetchRates(force){const t=cur,used=xused();if(!used.length)return;
const stale=used.some(u=>t.rates[u]?.auto==null)||!t.ratesAt||Date.now()-t.ratesAt>6*36e5;if(!force&&!stale)return;
try{const j=await(await fetch(`https://open.er-api.com/v6/latest/${t.baseCurrency}`)).json();if(j.result!='success')throw 0;
used.forEach(u=>{if(j.rates[u])t.rates[u]={manual:null,...t.rates[u],auto:1/j.rates[u]}});t.ratesAt=(j.time_last_update_unix||Date.now()/1e3)*1e3;await DB.put(t,false);if($('#xpg'))exUpdate();if(force)$('#xrh').textContent+='　已更新。'}
catch(e){if($('#xrh'))$('#xrh').textContent='無法取得匯率（可能離線），沿用上次的值。'}}
function xbar(el,spent,bud){el.classList.toggle('over',bud>0&&spent>bud);el.querySelector('.tr i').style.width=(bud>0?Math.min(100,spent/bud*100):0)+'%';
el.querySelector('.st').textContent=bud>0?`已花費 ${xn(spent)} / ${xn(bud)}（${Math.round(spent/bud*100)}%）`+(spent>bud?`，超支 ${xn(spent-bud)}`:`，剩 ${xn(bud-spent)}`):`已花費 ${xn(spent)}（未設預算）`}
function exUpdate(){if(!$('#xpg'))return;const t=cur,ok=xcounted(),tot=xsum(ok),by=XC.map(c=>xsum(ok.filter(i=>i.category==c))),pc=xmulti(),miss=xused().filter(u=>xr(u)==null);
$('#xmeta').innerHTML=miss.length?`<span class="err">缺少 ${miss.join('、')} 的匯率，相關項目暫未換算（請在下方手動輸入，或連線後更新）。</span>`:'';
let off=0;const C=2*Math.PI*60;$('#xd').innerHTML=`<svg viewBox="0 0 170 170" role="img" aria-label="各類別費用比例"><circle r="60" cx="85" cy="85" fill="none" stroke="var(--chip)" stroke-width="26"/>${by.map((v,k)=>{const l=tot?v/tot*C:0,s=`<circle r="60" cx="85" cy="85" fill="none" stroke="${XCOL[k]}" stroke-width="26" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`;off+=l;return s}).join('')}<text x="85" y="80" text-anchor="middle" font-size="11" style="fill:var(--sub)">總費用</text><text x="85" y="100" text-anchor="middle" font-size="15">${xf(tot)}</text></svg><div class="lg">${XC.map((c,k)=>by[k]?`<div><i style="background:${XCOL[k]}"></i><span>${c}</span><em>${xn(by[k])}　${Math.round(by[k]/tot*100)}%</em></div>`:`<div style="opacity:.5"><i style="background:${XCOL[k]}"></i><span>${c}</span><em>—</em></div>`).join('')}</div>`;
const tin=+$('#xbi').value||0;xbar($('#xbt'),tot,tin);let cs=0;$$('#xbc .br').forEach(e=>{const b=+e.querySelector('input').value||0;cs+=b;xbar(e,by[XC.indexOf(e.dataset.c)],b)});
$('#xbw').hidden=!(tin&&cs>tin);$('#xbw').textContent=`分類預算合計 ${xn(cs)}，超過總預算 ${xn(cs-tin)}（僅提示，不阻擋）。`;
const used=xused();$('#xrt').innerHTML=used.length?'<tr><th>幣別</th><th class="r">自動</th><th class="r">手動覆蓋</th><th class="r">使用中</th><th></th></tr>'+used.map(u=>{const r=t.rates[u]||{},e=xr(u);return`<tr><td>${u}</td><td class="r">${r.auto!=null?+r.auto.toFixed(4):'—'}</td><td class="r"><input type="number" step="any" min="0" data-u="${u}" value="${r.manual??''}" placeholder="—" aria-label="${u}手動匯率"></td><td class="r">${e!=null?+e.toFixed(4):'—'}<span class="tag" style="margin-left:6px">${r.manual!=null?'手動':'自動'}</span></td><td class="r">${r.manual!=null?`<button class="btn sm" data-x="rs" data-u="${u}">恢復自動</button>`:''}</td></tr>`}).join(''):'<tr><td class="hint">目前沒有外幣項目，不需要匯率。</td></tr>';
$('#xrh').textContent=used.length?(t.ratesAt?`自動匯率更新於 ${new Date(t.ratesAt).toLocaleString('zh-TW',{hour12:false})}（離線沿用上次的值）。`:'尚未取得自動匯率。'):'';
/* 明細 */const kf={t:i=>0,c:i=>XC.indexOf(i.category),a:xv,p:i=>t.members.findIndex(m=>m.id==(i.split?.payer||t.members[0].id))}[ex.sk],tm=(a,b)=>(a.date+(a.start?.time||'99')).localeCompare(b.date+(b.start?.time||'99'));
if(ex.sk=='p'&&!pc)ex.sk='t';$('#xfpw').hidden=!pc;ex.fc=$('#xfc').value;ex.fp=pc?$('#xfp').value:'';
const rows=ok.filter(i=>(!ex.fc||i.category==ex.fc)&&(!ex.fp||(i.split?.payer||t.members[0].id)==ex.fp)).sort((a,b)=>ex.sk=='t'?ex.sd*tm(a,b):(kf(a)-kf(b))*ex.sd||tm(a,b)),fl=ex.fc||ex.fp;
$('#xs').innerHTML='<span class="hint">排序：</span>'+Object.keys(XLB).filter(x=>x!='p'||pc).map(x=>`<button data-x="s" data-k="${x}" aria-pressed="${x==ex.sk}">${XLB[x]}${x==ex.sk?'（'+XLD[x][ex.sd==XDEF[x]?0:1]+'）':''}</button>`).join('');
$('#xfn').textContent=fl?`顯示 ${rows.length} / ${ok.length} 筆`:'';
const pn=i=>esc(t.members.find(m=>m.id==(i.split?.payer||t.members[0].id))?.name||'');
$('#xdt').innerHTML=`<tr><th>日期時間</th><th>項目地點</th><th>類別</th>${pc?'<th>付款人</th>':''}<th class="r">金額</th><th class="r">約合 ${esc(t.baseCurrency)}</th></tr>`+(rows.length?'':`<tr><td colspan="6" class="hint">${ok.length?'沒有符合條件的項目':'還沒有計入費用的項目。到時間軸新增行程並填入金額。'}</td></tr>`)+rows.map(i=>`<tr><td>${i.date.slice(5).replace('-','/')} ${i.start?.time||''}</td><td>${esc(i.name)}</td><td>${i.category}</td>${pc?`<td>${pn(i)}</td>`:''}<td class="r">${i.currency} ${i.amount.toLocaleString()}</td><td class="r">${i.currency==t.baseCurrency?'—':(xr(i.currency)==null?'—':xf(xv(i)))}</td></tr>`).join('')+`<tr><td colspan="${pc?4:3}"><b>${fl?'篩選結果合計':'合計'}</b></td><td></td><td class="r"><b>${xf(xsum(rows))}</b></td></tr>`;
const alt=t.items.filter(i=>i.isAlt&&i.amount>0),un=t.items.filter(i=>!i.isAlt&&!i.date&&i.amount>0);
$('#xex').textContent=alt.length||un.length?`另有 ${alt.length} 個備案、${un.length} 個未排程項目（含金額者），約 ${xn(xsum([...alt,...un]))} 未計入。`:'';
/* 分帳 */$('#xsb').hidden=!pc;if(!pc)return;const paid={},owe={};t.members.forEach(m=>{paid[m.id]=0;owe[m.id]=0});
ok.forEach(i=>{const s=i.split||{payer:t.members[0].id,mode:'A',shares:[]},v=xv(i),r=xr(i.currency)||0;paid[s.payer]=(paid[s.payer]||0)+v;
if(s.mode=='C')(s.shares||[]).forEach(x=>owe[x.member]=(owe[x.member]||0)+(x.amount||0)*r);else{const g=s.mode=='B'?(s.shares||[]).filter(x=>x.included).map(x=>x.member):t.members.map(m=>m.id);g.forEach(m=>owe[m]=(owe[m]||0)+v/(g.length||1))}});
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
