import {validateLocation,buildQuery,normalizePlaces,eligiblePlaces,randomIndex,targetRotation,mapsUrl} from './core.js';
const $ = id => document.getElementById(id);
const storeKey = 'eat-wheel:v1';
function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(storeKey) || '{}');
    const records = list => Array.isArray(list) ? list.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string').slice(0,500) : [];
    return {manual:records(value.manual).filter(p => p.source === 'manual').map(p => ({id:p.id,name:p.name,source:'manual',kind:'manual'})),history:records(value.history).filter(p => Number.isFinite(p.at)),blocked:records(value.blocked)};
  } catch { return {manual:[],history:[],blocked:[]}; }
}
const saved = readSaved();
const state = {location:null,remote:[],selected:new Set(saved.manual.map(p=>p.id)),rotation:0,busy:false,result:null,...saved};
const cache = new Map();
let lastRequest = 0;
const kindNames = {restaurant:'餐廳 / 正餐',fast_food:'速食 / 小吃',cafe:'咖啡 / 輕食',manual:'口袋名單'};
const cuisineNames = {chinese:'中式',taiwanese:'台式',japanese:'日式',korean:'韓式',italian:'義式',noodle:'麵食',noodles:'麵食',burger:'漢堡',pizza:'披薩',coffee_shop:'咖啡',vegetarian:'素食',regional:'地方料理',breakfast:'早餐',hotpot:'火鍋'};
function cuisines(value='') { return value.split(';').filter(Boolean).map(c=>cuisineNames[c] || c).join(' / '); }
function status(text,error=false) { $('status').hidden=!text; $('status').textContent=text; $('status').classList.toggle('error',error); }
function persist() {
  try { localStorage.setItem(storeKey,JSON.stringify({manual:state.manual,history:state.history,blocked:state.blocked})); }
  catch { status('瀏覽器無法儲存紀錄；目前仍可使用，重新開啟後可能消失。',true); }
}
function places() { return [...state.remote,...state.manual]; }
function pool() { return eligiblePlaces(places(),{...state,avoidRecent:$('avoid-recent').checked,kind:$('kind').value}); }
function distanceLabel(p) { return Number.isFinite(p.distance) ? (p.distance<1000 ? Math.round(p.distance)+' 公尺' : (p.distance/1000).toFixed(1)+' 公里') : p.source==='demo' ? '試玩範例，非真實搜尋結果' : '手動加入 · 距離未提供'; }
function make(tag,text,className) { const el=document.createElement(tag); if(text!==undefined) el.textContent=text; if(className) el.className=className; return el; }
function button(text,action,className='text-button') { const el=make('button',text,className); el.type='button'; el.addEventListener('click',action); return el; }
function link(text,url) { const el=make('a',text); el.href=url; el.target='_blank'; el.rel='noopener noreferrer'; return el; }
function clearResult() { state.result=null; $('result').hidden=true; document.querySelector('.wheel-card').classList.remove('has-result'); }
function update() {
  const candidates=pool();
  $('filter-summary').textContent=$('radius-label').textContent+' · '+($('kind').value==='all'?'類型不限':kindNames[$('kind').value]);
  $('pool-count').textContent=candidates.length+' 家候選';
  $('list-count').textContent=places().length;
  $('spin').disabled=state.busy || !candidates.length;
  $('search').disabled=state.busy || !state.location;
  $('wheel-caption').textContent=candidates.length ? (state.remote.some(p=>p.source==='demo') ? '試玩模式 · 範例店名，不代表附近餐廳' : candidates.length>40 ? '候選很多，轉盤以色塊呈現；全部 '+candidates.length+' 家均參與抽籤' : '準備好了？讓 '+candidates.length+' 家餐廳一起轉起來') : places().length ? '沒有可抽的餐廳，試著勾選店家或調整排除條件' : '先找附近餐廳，或放入你的口袋名單';
  $('wheel').setAttribute('aria-label',candidates.length ? '公平抽籤轉盤，'+candidates.length+' 家候選；完整名單列於下方' : '尚無候選餐廳');
  draw(candidates);
  renderList(candidates);
  renderSaved();
}
const colors=['#d8ec9b','#284d3a','#f0d99e','#91b79a','#edac83','#eae6d4','#b5ce9a','#55745a'];
function draw(candidates,rotation=state.rotation) {
  const ctx=$('wheel').getContext('2d'), size=760, center=size/2, radius=378;
  ctx.clearRect(0,0,size,size); ctx.save(); ctx.translate(center,center); ctx.rotate(rotation*Math.PI/180);
  const names=candidates.length ? candidates.map(p=>p.name) : ['你的下一餐','一點驚喜','附近好味道','今天吃什麼','隨心選擇','轉一下吧'];
  const slice=Math.PI*2/names.length;
  names.forEach((name,i)=>{
    const start=-Math.PI/2+i*slice;
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,radius,start,start+slice);ctx.closePath();
    ctx.fillStyle=colors[i%colors.length];ctx.fill();ctx.strokeStyle='#fffdf5';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.rotate(start+slice/2);ctx.translate(radius*.66,0);ctx.rotate(Math.PI/2);
    ctx.fillStyle=i%colors.length===1 || i%colors.length===7 ? '#fffdf4' : '#274735';
    ctx.font='600 '+(names.length>16 ? 18 : names.length>10 ? 22 : 26)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    if(names.length<=40) ctx.fillText(names.length>16 ? String(i+1) : name.length>8 ? name.slice(0,7)+'…' : name,0,0,names.length>16?38:160);ctx.restore();
  });
  ctx.restore();
}
function renderList(candidates) {
  const container=$('restaurants');container.replaceChildren();
  const eligible=new Set(candidates.map(p=>p.id)), indexes=new Map(candidates.map((p,i)=>[p.id,i+1]));
  const filter=$('name-filter').value.trim().toLowerCase();
  const visible=places().filter(p=>(p.source!=='osm' || $('kind').value==='all' || p.kind===$('kind').value) && (p.name+' '+p.cuisine+' '+cuisines(p.cuisine)).toLowerCase().includes(filter));
  if(!visible.length) {
    const empty=make('div',undefined,'empty-state');
    empty.append(make('span','🍽'),make('h3',places().length?'沒有符合的候選':'空著的肚子，空著的名單'),make('p',places().length?'調整類型或搜尋文字，手動候選仍會保留。':'搜尋附近餐廳，或在下面加進想吃的店。'));
    container.append(empty);return;
  }
  visible.forEach(p=>{
    const blocked=state.blocked.some(b=>b.id===p.id), recent=$('avoid-recent').checked && state.history.some(h=>h.id===p.id && Date.now()-h.at<7*86400000);
    const row=make('div',undefined,'restaurant'+(!eligible.has(p.id)?' excluded':''));
    const check=make('input');check.type='checkbox';check.checked=state.selected.has(p.id);check.disabled=blocked || recent || state.busy;check.setAttribute('aria-label','加入轉盤：'+p.name);
    check.addEventListener('change',()=>{check.checked?state.selected.add(p.id):state.selected.delete(p.id);clearResult();update();});
    const body=make('div',undefined,'restaurant-main');
    body.append(make('strong',(indexes.has(p.id)?indexes.get(p.id)+'. ':'')+p.name),make('small',distanceLabel(p)+' · '+(cuisines(p.cuisine)||kindNames[p.kind]||'範例')));
    if(blocked || recent) body.append(make('small',blocked?'已排除：不想再抽到':'已排除：最近 7 天吃過'));
    const actions=make('div',undefined,'restaurant-actions');
    if(p.source!=='demo') actions.append(link('查看餐廳 ↗',mapsUrl(p)));
    if(p.source==='manual') actions.append(button('刪除',()=>{state.manual=state.manual.filter(x=>x.id!==p.id);state.selected.delete(p.id);persist();clearResult();update();}));
    if(!blocked && p.source!=='demo') actions.append(button('不想再抽到',()=>{state.blocked.push({id:p.id,name:p.name});persist();clearResult();update();}));
    body.append(actions);row.append(check,body);container.append(row);
  });
}
function renderSaved() {
  $('history-count').textContent=state.history.length;$('blocked-count').textContent=state.blocked.length;
  for(const [key,id] of [['history','history-list'],['blocked','blocked-list']]) {
    const el=$(id);el.replaceChildren();
    if(!state[key].length) {el.textContent=key==='history'?'還沒有吃過紀錄。':'沒有永久排除的餐廳。';continue;}
    state[key].forEach((item,index)=>{
      const row=make('div',undefined,'saved-row');
      row.append(make('span',item.name+(key==='history'?' · '+new Date(item.at).toLocaleDateString('zh-TW'):'')),button(key==='history'?'刪除':'恢復',()=>{state[key].splice(index,1);persist();clearResult();update();}));
      el.append(row);
    });
  }
}
function setLocation(lat,lon,label) {
  if(state.busy)return;
  state.location={lat,lon};state.remote=[];state.selected=new Set(state.manual.map(p=>p.id));state.rotation=0;clearResult();
  $('latitude').value=lat;$('longitude').value=lon;$('location-label').textContent=label;
  status('位置已設定。按「搜尋附近餐廳」開始。');update();
}
$('locate').addEventListener('click',()=>{
  if(!window.isSecureContext) {status('手機定位需要 HTTPS 網址。你也可以展開「改用其他位置」，輸入座標或選地標。',true);return;}
  if(!navigator.geolocation) {status('瀏覽器不支援定位，請改用手動位置。',true);return;}
  $('locate').disabled=true;status('正在取得定位…');
  navigator.geolocation.getCurrentPosition(pos=>{
    $('locate').disabled=false;setLocation(pos.coords.latitude,pos.coords.longitude,'目前位置 · 精度約 '+Math.round(pos.coords.accuracy)+' 公尺');
    searchNearby();
  },error=>{
    $('locate').disabled=false;
    status(error.code===1?'定位權限未開啟。可到瀏覽器設定允許定位，或使用手動位置。':error.code===3?'定位逾時，請移到訊號較好的位置再試，或使用手動位置。':'暫時無法取得位置，請改用手動位置。',true);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
});
$('use-coordinates').addEventListener('click',()=>{
  const a=$('latitude').value.trim(),b=$('longitude').value.trim();
  if(!a || !b || !validateLocation(Number(a),Number(b))) {status('請輸入有效的緯度（−90～90）及經度（−180～180）。',true);return;}
  setLocation(Number(a),Number(b),'自訂位置 · '+Number(a).toFixed(4)+', '+Number(b).toFixed(4));
});
document.querySelectorAll('[data-location]').forEach(el=>el.addEventListener('click',()=>{const [lat,lon]=el.dataset.location.split(',').map(Number);setLocation(lat,lon,el.textContent+'附近');}));
function lock() {
  state.busy=true;
  const disabled=[...document.querySelectorAll('button,input,select')].map(el=>[el,el.disabled]);
  disabled.forEach(([el])=>el.disabled=true);
  return ()=>{state.busy=false;disabled.forEach(([el,value])=>{if(el.isConnected)el.disabled=value;});update();};
}
function installRemote(items) {
  $('search-options').open=false;
  state.remote=items;state.selected=new Set([...items.slice(0,12),...state.manual].map(p=>p.id));state.rotation=0;clearResult();update();
}
async function searchNearby() {
  if(!state.location || state.busy)return;
  const radius=Number($('radius').value),location={...state.location},key=location.lat+','+location.lon+','+radius;
  const stored=cache.get(key);
  if(stored && Date.now()-stored.at<300000) {installRemote(stored.items);status('找到 '+stored.items.length+' 家餐廳（5 分鐘內結果）'+(stored.items.length>12?'，預設勾選最近 12 家，其餘可自行勾選。':'。'));return;}
  if(Date.now()-lastRequest<15000) {status('請稍候 '+Math.ceil((15000-(Date.now()-lastRequest))/1000)+' 秒再查詢，讓免費服務有時間處理。',true);return;}
  const unlock=lock(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),35000);
  lastRequest=Date.now();status('正在找附近餐廳… 免費資料服務忙碌時可能需要約 30 秒。');
  try {
    const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:new URLSearchParams({data:buildQuery(location,radius)}),signal:controller.signal});
    if(!response.ok) throw new Error(response.status===429?'查詢太頻繁，請等一分鐘再試。':response.status===504?'免費資料服務忙碌，請縮小距離或稍後再試。':'免費資料服務暫時無法使用（'+response.status+'）。');
    const data=await response.json();
    if(!Array.isArray(data.elements) || data.remark) throw new Error('資料服務未完成查詢，請縮小距離後重試。');
    const items=normalizePlaces(data.elements,location,radius);
    cache.set(key,{at:Date.now(),items});
    installRemote(items);
    status(items.length?'找到 '+items.length+' 家餐廳。'+(items.length>12?'預設勾選最近 12 家，其餘可在名單勾選。':'取消不想吃的，接著轉一下！'):'這個範圍沒有已收錄的餐廳。可擴大距離，或手動加入 Google Maps 找到的店。');
  } catch(error) { status((error.name==='AbortError'?'查詢逾時，請縮小距離或稍後重試。':error instanceof TypeError?'無法連線，請確認網路或稍後再試。':error.message)+' 你仍可使用手動候選。',true); }
  finally {clearTimeout(timeout);unlock();}
  if(pool().length) { $('search-options').open=false; document.querySelector('.wheel-card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}); }
}
$('search').addEventListener('click',searchNearby);
$('radius').addEventListener('input',()=>{
  const r=Number($('radius').value);$('radius-label').textContent=r<1000?r+' 公尺':(r/1000).toLocaleString('zh-TW')+' 公里';
  $('filter-summary').textContent=$('radius-label').textContent+' · '+($('kind').value==='all'?'類型不限':kindNames[$('kind').value]);
  if(state.remote.some(p=>p.source==='osm')) {state.remote=[];state.selected=new Set(state.manual.map(p=>p.id));clearResult();status('距離已更改，請重新搜尋附近餐廳。');update();}
});
$('kind').addEventListener('change',()=>{clearResult();state.rotation=0;update();});
$('avoid-recent').addEventListener('change',()=>{clearResult();state.rotation=0;update();});
$('name-filter').addEventListener('input',()=>renderList(pool()));
$('select-all').addEventListener('click',()=>{places().forEach(p=>state.selected.add(p.id));clearResult();update();});
$('select-none').addEventListener('click',()=>{state.selected.clear();clearResult();update();});
$('add-form').addEventListener('submit',event=>{
  event.preventDefault();if(state.busy)return;
  const name=$('manual-name').value.trim();if(!name)return;
  if(state.manual.some(p=>p.name===name)) {status('這家店已在口袋名單裡。');return;}
  if(state.manual.length>=500) {status('口袋名單已滿，請先刪除一些候選。',true);return;}
  const p={id:'manual:'+(crypto.randomUUID?.() || Date.now().toString(36)+'-'+Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-')),name,source:'manual',kind:'manual'};
  state.manual.push(p);state.selected.add(p.id);$('manual-name').value='';persist();clearResult();update();status('已加入「'+name+'」。');
});
$('demo').addEventListener('click',()=>{
  installRemote(['巷口牛肉麵','日式咖哩飯','手工水餃','越式河粉','暖心小火鍋','義大利麵','香香滷肉飯','早午餐'].map((name,i)=>({id:'demo:'+i,name,kind:'demo',source:'demo'})));
  $('search-options').open=false;
  status('試玩模式：範例店名，非真實搜尋結果。');
});
function showResult(p) {
  state.result=p;const el=$('result');el.replaceChildren();el.hidden=false;
  document.querySelector('.wheel-card').classList.add('has-result');
  el.append(make('span',p.source==='demo'?'試玩結果':'今天就吃這家','eyebrow'));
  const title=make('h3');
  if(p.source==='demo') title.textContent=p.name;
  else {const titleLink=link(p.name,mapsUrl(p));titleLink.className='result-title-link';titleLink.setAttribute('aria-label','在 Google Maps 查看 '+p.name);title.append(titleLink);}
  el.append(title,make('p',distanceLabel(p)+(p.address?' · '+p.address:''),'result-meta'));
  const actions=make('div',undefined,'result-actions');
  if(p.source!=='demo') {
    const view=link('在 Google Maps 查看餐廳 ↗',mapsUrl(p));view.className='maps-view';
    const directions=link('步行導航',mapsUrl(p,true));directions.className='maps-directions';
    actions.append(view,directions,button('記錄吃過',event=>{
      if(state.history.some(h=>h.id===p.id && Date.now()-h.at<60000))return;
      state.history.unshift({id:p.id,name:p.name,at:Date.now()});state.history=state.history.slice(0,500);persist();
      status('已記錄「'+p.name+'」。');event.currentTarget.textContent='已記錄';event.currentTarget.disabled=true;update();
    },'secondary'));
  }
  actions.append(button('換一家',()=>{state.selected.delete(p.id);clearResult();update();if(pool().length)spin();else status('其他候選已抽完。打開候選名單按全選，可重新開始。');},'secondary'));
  el.append(actions);
  if(p.source!=='demo') el.append(make('p','營業狀態與價格請到 Google Maps 確認。','result-note'));
  if(matchMedia('(max-width:740px)').matches) document.querySelector('.wheel-card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
async function spin() {
  const candidates=pool();if(!candidates.length || state.busy)return;
  const picked=randomIndex(candidates.length),start=state.rotation,end=targetRotation(start,picked,candidates.length);
  clearResult();$('search-options').open=false;$('shortlist').open=false;const skip=$('quick').checked || matchMedia('(prefers-reduced-motion: reduce)').matches,unlock=lock();
  $('wheel-caption').textContent='命運正在挑選你的下一餐…';
  try {
    if(!skip) await new Promise(resolve=>{
      const began=performance.now(),duration=3200;
      function frame(time) {
        const progress=Math.min((time-began)/duration,1),eased=1-(1-progress)**4;
        draw(candidates,start+(end-start)*eased);
        if(progress<1)requestAnimationFrame(frame);else resolve();
      } requestAnimationFrame(frame);
    });
    state.rotation=end%360;
  } finally {unlock();}
  showResult(candidates[picked]);
  $('wheel-caption').textContent='決定了！今天就試試 '+candidates[picked].name;
}
$('spin').addEventListener('click',spin);
update();
if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(()=>{});




