import {groups,sources} from './content.js';
import {icon} from './icons.js';
import {art} from './guide-art.js';
import {listRecords,openRecordForm,renderRecord,getRecordStorageWarning} from './records.js';
import {openCompare} from './compare.js';

const main=document.querySelector('#main');
const navItems=[
  ['home','대시보드','grid'],['visits','방문 기록','notebook'],
  ['favorites','관심 있는 집','heart'],['guide','체크 가이드','book']
];
const tips=[
  ['채광은 불을 끄고 보세요.','창 앞 건물이 햇빛을 가리는지도 확인하세요.'],
  ['수도는 두 곳을 같이 틀어 보세요.','샤워기와 세면대를 동시에 틀면 수압 차이가 느껴져요.'],
  ['월세와 관리비를 더해 보세요.','수도·인터넷처럼 별도로 내는 항목도 물어보세요.'],
  ['창을 열고 잠깐 귀를 기울이세요.','차 소리와 복도 소음은 문을 닫았을 때와 비교하세요.']
];
let tipIndex=0;
const date=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'long'}).format(new Date());
const total=groups.reduce((n,g)=>n+g.items.length,0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path=()=>location.hash.slice(1).split('/').filter(Boolean);
const label=key=>navItems.find(n=>n[0]===key)?.[1]||'대시보드';
const go=(route)=>{if(location.hash==='#'+route){render();return;}location.hash=route};
const brand='<a class="brand" href="#home" aria-label="집수첩 대시보드"><img src="/logo.svg" width="39" height="39" alt=""><span>집수첩</span></a>';
const addButton=(text='새 집 기록')=>'<button type="button" class="btn btn-primary" data-new>'+icon('plus',18)+text+'</button>';
function tipCard(){return '<div class="tip-label">'+icon('bulb',17)+'방문 팁<button type="button" class="tip-next" title="다음 방문 팁" aria-label="다음 방문 팁" data-tip>'+icon('arrow-right',16)+'</button></div><div aria-live="polite"><strong>'+tips[tipIndex][0]+'</strong><p>'+tips[tipIndex][1]+'</p></div>';}
function shell(mode,title){
  const links=navItems.map(([k,l,i])=>'<a href="#'+k+'" class="nav-link'+(k===mode?' active':'')+'"'+(k===mode?' aria-current="page"':'')+'>'+icon(i,20)+'<span>'+l+'</span></a>').join('');
  document.querySelector('#sidebar').innerHTML='<div>'+brand+'<div class="menu-cap">내 작업 공간</div><nav aria-label="주 메뉴">'+links+'</nav></div><div class="side-bottom"><aside class="side-tip">'+tipCard()+'</aside><div class="local-state">'+icon('phone',15)+'이 기기에 저장</div></div>';
  document.querySelector('#mobile-nav').innerHTML=links;
  document.querySelector('#topbar').innerHTML='<div class="crumb">'+icon('notebook',16)+'<span>내 수첩</span>'+icon('chevron-right',12)+'<b>'+esc(title)+'</b></div><div class="mobile-brand">'+brand+'</div><div class="top-date">'+icon('calendar',15)+'<span>'+date+'</span></div>';
}
function heading(title,action=''){return '<div class="section-head"><h2>'+title+'</h2>'+action+'</div>';}
function seeAll(route,text='전체 보기'){return '<a class="see-all" href="#'+route+'">'+text+icon('arrow-right',16)+'</a>';}
function guides(){return '<div class="guide-grid">'+groups.map((g,i)=>'<a class="guide-card tone-'+g.id+'" href="#guide/'+g.id+'"><div class="card-visual">'+art(g.id)+'<span class="guide-num">0'+(i+1)+'</span></div><h3>'+g.title+'</h3><p>'+g.description+'</p><div class="guide-card-foot"><span>'+g.items.length+'개 항목</span><span class="circle-arrow">'+icon('arrow-right',15)+'</span></div></a>').join('')+'</div>';}
function empty(kind='visits'){
 const fav=kind==='favorites';
 return '<div class="empty"><img src="/art/notebook.svg" alt="" width="95" height="74"><div><h3>'+(fav?'관심 있는 집이 없어요':'아직 방문 기록이 없어요')+'</h3><p>'+(fav?'방문 기록에서 하트를 누르면 여기에 모여요.':'주소를 입력하고 첫 번째 집을 기록해 보세요.')+'</p></div>'+(fav?seeAll('visits','방문 기록 보기'):'<button class="btn btn-secondary empty-add" data-new>'+icon('plus',15)+'집 추가</button>')+'</div>';
}
const price=n=>n===''||n==null?'미입력':Number(n).toLocaleString('ko-KR')+'만 원';
function recordCard(r){
 const cnt=Object.keys(r.checks).length;
 return '<a class="visit-card" href="#visit/'+encodeURIComponent(r.id)+'"><div class="visit-illustr">'+icon('house',24)+'</div><div class="visit-content"><div class="visit-title"><h3>'+esc(r.nickname||r.address)+'</h3>'+(r.favorite?'<span class="fav-mark" aria-label="관심 있는 집">'+icon('heart',15)+'</span>':'')+'</div><p>'+esc(r.nickname?r.address:r.date)+'<span> · </span>'+esc(r.deal)+' · 보증금 '+price(r.deposit)+(r.deal==='월세'?' / 월세 '+price(r.rent):'')+'</p></div><span class="checked-count">'+cnt+' / '+total+'</span>'+icon('chevron-right',16)+'</a>';
}
function notice(){const warn=getRecordStorageWarning();return warn?'<p role="alert" class="warning">'+esc(warn)+'</p>':'';}
function dashboard(records){
 main.innerHTML='<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="hero-tag">'+icon('notebook',13)+'방문 노트</span><h1 id="hero-title">오늘의 집 구경<span>.</span></h1><p>방문한 집의 조건과 장단점을 기록하세요.</p>'+addButton()+'</div><img class="hero-art" src="/art/neighborhood.svg" alt="" fetchpriority="high"></section>'
 +'<section class="dash-section">'+heading('현장 체크 가이드',seeAll('guide','가이드 보기'))+guides()+'</section>'
 +'<section class="dash-section visits-section">'+heading('최근 방문 기록 <span class="count">'+records.length+'</span>',seeAll('visits'))+notice()+(records.length?'<div class="visit-list">'+records.slice(0,3).map(recordCard).join('')+'</div>':empty())+'</section>';
}
function visits(records,kind){
 const fav=kind==='favorites', all=fav?records.filter(r=>r.favorite):records;
 main.innerHTML='<section class="inner-page"><div class="page-heading"><div class="section-marker">'+icon(fav?'heart':'notebook',16)+'내 수첩</div><div class="page-heading-row"><h1>'+label(kind)+' <span class="count">'+all.length+'</span></h1>'+addButton()+'</div></div>'+notice()+(all.length?'<div class="list-tools"><label class="searchbox">'+icon('search',17)+'<input type="search" id="query" aria-label="주소 또는 별칭 검색" placeholder="주소 또는 별칭 검색"></label>'+(all.length>=2?'<button class="btn btn-secondary" type="button" data-compare>'+icon('compare',17)+'집 비교</button>':'')+'</div><div class="visit-list" id="visit-results"></div>':empty(kind))+'</section>';
 if(!all.length)return;
 const results=main.querySelector('#visit-results'),q=main.querySelector('#query');
 const filter=()=>{const key=q.value.trim().toLocaleLowerCase('ko');const matches=all.filter(r=>(r.address+' '+r.nickname).toLocaleLowerCase('ko').includes(key));results.innerHTML=matches.length?matches.map(recordCard).join(''):'<p class="no-result" role="status">일치하는 방문 기록이 없어요.</p>';};
 q.addEventListener('input',filter);filter();
 main.querySelector('[data-compare]')?.addEventListener('click',()=>openCompare(all));
}
function guide(groupId){
 const g=groups.find(g=>g.id===groupId)||groups[0];
 main.innerHTML='<section class="inner-page"><div class="page-heading"><div class="section-marker">'+icon('book',16)+'총 '+total+'개 항목</div><h1>현장 체크 가이드</h1></div><nav class="guide-tabs" aria-label="가이드 분류">'+groups.map(x=>'<a href="#guide/'+x.id+'"'+(g===x?' class="selected" aria-current="page"':'')+'>'+icon(x.icon,16)+x.title+'</a>').join('')+'</nav><div class="guide-detail tone-'+g.id+'"><div class="guide-detail-head">'+art(g.id)+'<div><h2>'+g.title+'</h2><p>'+g.description+' · '+g.items.length+'개 항목</p></div></div><ol class="tip-list">'+g.items.map((item,i)=>'<li><span class="item-index">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+item.title+'</h3><p>'+item.tip+'</p></div></li>').join('')+'</ol></div><div class="sources"><h3>'+icon('book',15)+'참고 자료</h3>'+sources.filter(s=>s.groups.includes(g.id)).map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label)+icon('arrow-up-right',14)+'</a>').join('')+'</div></section>';
}
function render(scroll=false){
 const [raw='home',id='']=path(),mode=raw==='visit'?'visits':navItems.some(n=>n[0]===raw)?raw:'home';
 const title=raw==='visit'?'방문 상세':label(mode);
 shell(mode,title);document.title=title+' · 집수첩';
 const records=listRecords();
 if(raw==='visit'){
    const record=records.find(r=>encodeURIComponent(r.id)===id);
    if(record)renderRecord(main,record.id,{onBack:()=>go('visits'),onChange:()=>{},onDeleted:()=>go('visits')});
    else main.innerHTML='<section class="inner-page"><h1>방문 기록을 찾을 수 없어요</h1>'+notice()+seeAll('visits','방문 기록으로')+'</section>';
 }else if(mode==='home')dashboard(records);else if(mode==='guide')guide(id);else visits(records,mode);
 if(scroll){window.scrollTo(0,0);main.focus({preventScroll:true});}
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-new]'))openRecordForm({onSave:r=>go('visit/'+encodeURIComponent(r.id))});
 if(e.target.closest('[data-tip]')){tipIndex=(tipIndex+1)%tips.length;const el=document.querySelector('.side-tip');el.innerHTML=tipCard();el.querySelector('button').focus();}
 if(e.target.closest('.skip')){e.preventDefault();main.focus();}
});
window.addEventListener('hashchange',()=>render(true));
window.addEventListener('pageshow',e=>{if(e.persisted)render()});
window.addEventListener('storage',()=>{if(!document.querySelector('dialog[open]')&&path()[0]!=='visit')render()});
render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
