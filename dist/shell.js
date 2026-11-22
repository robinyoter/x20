(()=>{'use strict';
/* Each section is its own page, shown in an iframe. The sidebar only switches between them. */
const I={
  money:'<path d="M4 20V12h4v8M10 20V5h4v15M16 20V9h4v11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  senate:'<path d="M3 20h18M5 17V10M9.5 17V10M14.5 17V10M19 17V10M3 8l9-5 9 5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  billion:'<path d="M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l3 16 3-16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  ancestry:'<circle cx="12" cy="5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="5.5" cy="18" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="18.5" cy="18" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12M5.5 15.5V12h13v3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  religion:'<path d="M12 3v4M10 5h4M5 21V12l7-5 7 5v9M10 21v-4a2 2 0 0 1 4 0v4M3 21h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  fertility:'<path d="M3 17l5-5 4 3 8-8M15 7h5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'
};
const SECTIONS=[
  {id:'atlas',title:'Money',sub:'Income, wealth & tax per person',icon:I.money},
  {id:'senate',title:'Senators',sub:'Surname origins, 1789–2026',icon:I.senate},
  {id:'billionaires',title:'Billionaires',sub:'Origins by birth state, 2026',icon:I.billion},
  {id:'ancestry',title:'Ancestry',sub:'White Americans by origin',icon:I.ancestry},
  {id:'religion',title:'Religion',sub:'380 bodies, 2020 & ≈2025',icon:I.religion},
  {id:'fertility',title:'Fertility',sub:'NH-White TFR by region',icon:I.fertility}
];
const $=id=>document.getElementById(id);
const frames={};
/* build stamp from index.html: new section URLs after each deploy, so browsers skip the 10-minute Pages cache */
const BUILD=(document.querySelector('meta[name="build"]')||{}).content||'';
let current=null;

$('nav').innerHTML=SECTIONS.map(s=>`<a href="#${s.id}" data-id="${s.id}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${s.icon}</svg><b>${s.title}</b><small>${s.sub}</small></a>`).join('');

/* ---------- theme, shared with every section ---------- */
const KEY='atlas-theme', root=document.documentElement;
const systemDark=()=>matchMedia('(prefers-color-scheme: dark)').matches;
function themeInto(f){try{const t=root.dataset.theme;const r=f.contentDocument.documentElement;if(t)r.dataset.theme=t;else delete r.dataset.theme;}catch(e){}}
$('theme-toggle').onclick=()=>{
  const cur=root.dataset.theme||(systemDark()?'dark':'light'),next=cur==='dark'?'light':'dark';
  root.dataset.theme=next;try{localStorage.setItem(KEY,next);}catch(e){}
  Object.values(frames).forEach(themeInto);
};

/* ---------- routing: #section or #section/inner-hash ---------- */
function parse(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(/^(area|view|map|vs|rank)=/.test(h))return {id:'atlas',inner:h};   // links shared before the sidebar existed
  const i=h.indexOf('/'),id=i<0?h:h.slice(0,i),inner=i<0?'':h.slice(i+1);
  return SECTIONS.some(s=>s.id===id)?{id,inner}:{id:'atlas',inner:''};
}
function show({id,inner}){
  const s=SECTIONS.find(x=>x.id===id);
  if(!frames[id]){
    /* created only when first opened, so the page lays itself out while visible */
    const f=document.createElement('iframe');
    f.title=s.title+' — '+s.sub;f.src=id+'/'+(BUILD?'?v='+BUILD:'')+(inner?'#'+inner:'');
    f.addEventListener('load',()=>themeInto(f));
    frames[id]=f;$('stage').append(f);
  }else if(inner){
    /* a link to a specific view of a section that is already open */
    try{const w=frames[id].contentWindow;if(w.location.hash.slice(1)!==inner)w.location.hash=inner;}catch(e){}
  }else if(id==='atlas'){
    /* back on Money: keep its current view in the address bar */
    try{const h=frames.atlas.contentWindow.location.hash.slice(1);if(h)history.replaceState(null,'','#atlas/'+h);}catch(e){}
  }
  for(const [k,f] of Object.entries(frames))f.hidden=k!==id;
  document.querySelectorAll('#nav a').forEach(a=>{if(a.dataset.id===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelector(`#nav a[data-id="${id}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});
  document.title=(id==='atlas'?'States Atlas':s.title+' · States Atlas')+' — United States in numbers';
  current=id;
}
window.addEventListener('hashchange',()=>show(parse()));
show(parse());

/* The Money section reports its own view (state, metric…) so the address bar can be shared. */
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!e.data||e.data.type!=='atlas-hash'||current!=='atlas')return;
  if(frames.atlas&&e.source!==frames.atlas.contentWindow)return;
  try{history.replaceState(null,'','#atlas/'+String(e.data.hash).replace(/^#/,''));}catch(err){}
});
})();
