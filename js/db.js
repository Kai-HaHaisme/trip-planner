/* IndexedDB 資料層：trips（整趟旅行一筆）、meta（設定） */
const DB=(()=>{let d;
const open=()=>d?Promise.resolve(d):new Promise((ok,no)=>{const r=indexedDB.open('trip-planner',1);
r.onupgradeneeded=()=>{r.result.createObjectStore('trips',{keyPath:'id'});r.result.createObjectStore('meta')};
r.onsuccess=()=>ok(d=r.result);r.onerror=()=>no(r.error)});
const tx=(s,m,f)=>open().then(db=>new Promise((ok,no)=>{const t=db.transaction(s,m),q=f(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)}));
const CATS=['證件物品','電子設備','穿搭衣物','日常用品','藥品清潔','其他'];
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const blank=(name,start,end)=>({id:uid('t'),name,start,end,description:'',cover:null,destination:{name:'',lat:null,lng:null},baseCurrency:'TWD',
budget:{total:0,byCategory:{}},members:[{id:uid('m'),name:'我'}],items:[],rates:{},
packingCategories:CATS.map((n,i)=>({id:'c'+(i+1),name:n,fixed:i==5})),packing:[],wishlist:[],meta:{createdAt:Date.now(),modifiedAt:Date.now(),lastBackupAt:null}});
return{uid,blank,all:()=>tx('trips','readonly',s=>s.getAll()),get:id=>tx('trips','readonly',s=>s.get(id)),
put:(t,touch=true)=>{if(touch)t.meta.modifiedAt=Date.now();return tx('trips','readwrite',s=>s.put(t))},
del:id=>tx('trips','readwrite',s=>s.delete(id)),getMeta:k=>tx('meta','readonly',s=>s.get(k)),setMeta:(k,v)=>tx('meta','readwrite',s=>s.put(v,k))}})();
