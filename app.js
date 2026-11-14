(()=>{'use strict';
const states=window.ATLAS_DATA, US=window.NATIONAL_DATA, city=window.CITY_DATA, areas=[US,...states,city];
const colors=['#78AFE0','#9270C2','#EA984B','#53A783','#AC8563','#46AFBA','#929BA9','#D180AB'];
const names=['White','Black','Hispanic / Latino','Asian','American Indian / Alaska Native','Native Hawaiian / Pacific Islander','Some other race','Two or more races'];
const metrics={population:'Population',income:'Household income',wealth:'Net worth',tax:'Federal income tax',corporateTax:'Corporate income tax',propertyTax:'Property tax'};
const $=id=>document.getElementById(id), ns='http://www.w3.org/2000/svg';
const ui={mode:'dominant',metric:'population',group:0,share:false,view:'total',state:'US',compare:'',sort:'population',direction:'desc',rankMetric:'population',rankDirection:'desc'};

/* ---------- formatting ---------- */
const integer=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const dec=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const pct=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n)+'%';
function short(n){if(n==null||!isFinite(n))return '—';const a=Math.abs(n);for(const [v,s]of [[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']])if(a>=v)return dec.format(n/v)+s;return integer.format(n);}
const isMoney=k=>k!=='population';
/* per-person amounts read better in full dollars; totals in compact form */
function fmt(n,key,per){if(n==null||!isFinite(n))return '—';if(!isMoney(key))return per?integer.format(n):short(n);return '$'+(per?integer.format(n):short(n));}
function exact(n,key){return n==null?'—':(isMoney(key)?'$':'')+integer.format(n);}
const perOn=key=>ui.view==='capita'&&key!=='population'&&key!=='name';
/* amount for an object (group or total) under a view */
function amount(obj,key,pop,per){const n=obj[key];if(n==null)return null;if(!per||key==='population')return n;return pop?n/pop:null;}
const tot=(a,key,per)=>amount(a.total,key,a.total.population,per);
const grp=(g,key,per)=>amount(g,key,g.population,per);
const usAvg=key=>US.total[key]==null?null:US.total[key]/US.total.population;
function vsUS(a,key){if(a.id==='US'||key==='population')return null;const avg=usAvg(key),v=tot(a,key,true);if(!avg||v==null)return null;return v/avg-1;}
function rankOf(a,key,per){if(!states.includes(a))return null;const sorted=[...states].sort((x,y)=>(tot(y,key,per)??-Infinity)-(tot(x,key,per)??-Infinity));return sorted.indexOf(a)+1;}
function deltaBadge(d,label='vs US'){if(d==null)return '';const cls=Math.abs(d)<.005?'flat':d>0?'up':'down';return `<span class="delta ${cls}" title="Per person, compared with the US average">${d>0?'+':''}${pct(d*100)} ${label}</span>`;}

/* ---------- map color ---------- */
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
let mapBase=[240,245,251];
function tint(hex,t){const c=rgb(hex);return 'rgb('+c.map((v,i)=>Math.round(mapBase[i]+(v-mapBase[i])*(.1+.9*t))).join(',')+')';}
function mapValue(s){const g=s.groups[ui.group];if(ui.share)return s.total[ui.metric]?g[ui.metric]/s.total[ui.metric]*100:0;return grp(g,ui.metric,perOn(ui.metric));}
function mapDisplay(n){return ui.share?pct(n):fmt(n,ui.metric,perOn(ui.metric));}
function dominant(s){return s.groups.reduce((best,g,i)=>g.population>s.groups[best].population?i:best,0);}

/* ---------- build static parts ---------- */
for(let i=0;i<8;i++){
  $('group').add(new Option(names[i],i));
  const b=document.createElement('button');b.innerHTML=`<span class="dot" style="background:${colors[i]}"></span><span>${names[i]}</span>`;b.title=states[0].groups[i].name;
  b.onclick=()=>{ui.group=i;ui.mode='metric';renderMap();$('legend-dialog').close();};$('legend').append(b);
}
const areaLabel=a=>a.id==='US'?'United States':a.id==='NYC'?'New York City':a.name;
for(const a of areas){$('area-list').append(new Option(areaLabel(a)));$('compare-select').add(new Option(a.id==='US'?'United States (national)':a.id==='NYC'?'New York City':a.name,a.id));}
for(const s of states){
  const path=document.createElementNS(ns,'path');path.setAttribute('d',s.path);path.setAttribute('class','state-path');path.setAttribute('tabindex','0');path.setAttribute('role','button');path.dataset.id=s.id;
  path.onclick=()=>selectState(s.id,true);path.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectState(s.id,true);}};
  path.onpointermove=e=>showTip(s,e.clientX,e.clientY);path.onpointerleave=hideTip;
  path.onfocus=()=>{const r=path.getBoundingClientRect();showTip(s,r.x+r.width/2,r.y+r.height/2);};path.onblur=hideTip;
  $('state-paths').append(path);
  if(!['CT','RI','NJ','DE','MD','MA'].includes(s.abbr)){const t=document.createElementNS(ns,'text');t.setAttribute('x',s.center[0]);t.setAttribute('y',s.center[1]+4);t.setAttribute('class','state-label');t.textContent=s.abbr;$('state-labels').append(t);}
}
const pathOf=id=>$('state-paths').querySelector(`[data-id="${id}"]`);

/* ---------- tooltip ---------- */
function showTip(s,x,y){
  const tip=$('tooltip');
  if(ui.mode==='dominant'){const d=dominant(s);tip.innerHTML=`<strong>${s.name}</strong><div class="tip-row"><span class="dot" style="background:${colors[d]}"></span>${names[d]}</div><div class="tip-value">${integer.format(s.groups[d].population)} · ${pct(s.groups[d].population/s.total.population*100)}</div><div class="tip-row">Total population: ${integer.format(s.total.population)}</div>`;}
  else{const g=s.groups[ui.group],per=perOn(ui.metric);const alt=ui.metric==='population'||ui.share?'':`<div class="tip-row">${per?'Total':'Per person'}: ${fmt(grp(g,ui.metric,!per),ui.metric,!per)}</div>`;
    tip.innerHTML=`<strong>${s.name}</strong><div class="tip-row"><span class="dot" style="background:${colors[ui.group]}"></span>${names[ui.group]}</div><div class="tip-value">${metrics[ui.metric]}${per&&!ui.share?' per person':''}: ${ui.share?pct(mapValue(s)):(per?fmt(mapValue(s),ui.metric,true):exact(mapValue(s),ui.metric))}</div>${alt}`;}
  tip.hidden=false;const r=tip.getBoundingClientRect();
  tip.style.left=Math.max(8,Math.min(x+15,innerWidth-r.width-10))+'px';tip.style.top=Math.max(8,Math.min(y+15,innerHeight-r.height-10))+'px';
}
function hideTip(){$('tooltip').hidden=true;}

/* ---------- render ---------- */
function syncControls(){
  const isMetric=ui.mode==='metric';
  $('mode-dominant').setAttribute('aria-pressed',!isMetric);$('mode-metric').setAttribute('aria-pressed',isMetric);
  for(const id of ['metric','group','unit'])$(id).disabled=!isMetric;
  $('metric').value=ui.metric;$('group').value=ui.group;$('unit').value=ui.share?'share':ui.view;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===ui.view));
  document.body.classList.toggle('per-capita',ui.view==='capita');
}
function renderMap(){
  hideTip();syncControls();
  const isMetric=ui.mode==='metric';
  const vals=states.map(s=>mapValue(s)??0), max=Math.max(...vals,1e-9), min=Math.min(...vals);
  const lo=ui.share||!perOn(ui.metric)?0:min, span=max-lo||1;
  for(const path of $('state-paths').children){
    const s=states.find(s=>s.id===path.dataset.id),v=mapValue(s)??0;
    path.style.fill=isMetric?tint(colors[ui.group],(v-lo)/span):colors[dominant(s)];
    path.classList.toggle('selected',s.id===ui.state);path.classList.toggle('compared',s.id===ui.compare);path.setAttribute('aria-pressed',s.id===ui.state);
    path.setAttribute('aria-label',`${s.name}: ${isMetric?names[ui.group]+', '+mapDisplay(v):names[dominant(s)]+', '+pct(s.groups[dominant(s)].population/s.total.population*100)}`);
  }
  for(const [i,b]of [...$('legend').children].entries())b.setAttribute('aria-pressed',isMetric&&i===ui.group);
  const per=perOn(ui.metric)&&!ui.share;
  $('map-title').textContent=isMetric?`${metrics[ui.metric]}${per?' per person':''} · ${names[ui.group]}`:'Largest population group';
  $('map-subtitle').textContent=isMetric?(ui.share?'Selected group’s share of the state total':per?'Group amount divided by the group’s residents':(ui.metric==='tax'?'Mean-income model · Single · $14,600 deduction':'Selected group’s aggregate values by state')):'Each state is colored by its largest population group';
  $('scale').hidden=!isMetric;$('dominant-legend').hidden=isMetric;
  $('scale').querySelector('.scale-line').style.background=`linear-gradient(to right,${tint(colors[ui.group],0)},${tint(colors[ui.group],1)})`;
  $('scale-min').textContent=mapDisplay(lo);$('scale-max').textContent=mapDisplay(max);
  const counts={};states.forEach(s=>{const d=dominant(s);counts[d]=(counts[d]||0)+1;});
  $('dominant-legend').innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([i,c])=>`<span><span class="dot" style="background:${colors[i]}"></span>${names[i]} <b>${c}</b></span>`).join('');
  renderPanel();renderRankings();writeHash();
}
function selectState(id,fromMap){
  if(!areas.some(s=>s.id===id))throw Error('Unknown area');
  if(ui.compare===id)ui.compare='';
  ui.state=id;renderMap();
  if(fromMap&&matchMedia('(max-width:850px)').matches)$('mobile-bar').classList.add('pulse'),setTimeout(()=>$('mobile-bar').classList.remove('pulse'),600);
}

function card(a,key,{label,period,cls=''}){
  const per=perOn(key),v=tot(a,key,per);if(a.total[key]==null)return '';
  const other=key==='population'?'':`<div class="total-alt">${per?'Total '+fmt(tot(a,key,false),key,false):fmt(tot(a,key,true),key,true)+' per person'}</div>`;
  const r=rankOf(a,key,per);
  return `<div class="total-card ${cls}" title="${exact(a.total[key],key)}${key!=='population'?' · '+exact(tot(a,key,true),key)+' per person':''}">
    <div class="total-top"><div class="total-label">${label}${per?' <em>per person</em>':''}</div>${r?`<span class="rank" title="Rank among 50 states">#${r}<small>/50</small></span>`:''}</div>
    <div class="total-value">${fmt(v,key,per)}</div>${other}
    <div class="total-foot">${period?`<span class="total-period">${period}</span>`:''}${deltaBadge(vsUS(a,key))}</div></div>`;
}
function renderPanel(){
  const s=areas.find(s=>s.id===ui.state),isCity=s.id==='NYC';
  if(!isCity&&ui.sort==='propertyTax'){ui.sort='population';ui.direction='desc';}
  document.querySelectorAll('[data-city-only]').forEach(el=>el.hidden=!isCity);
  $('group-table').classList.toggle('has-property-tax',isCity);
  document.querySelector('[data-city]').setAttribute('aria-current',isCity?'true':'false');
  $('area-scope').textContent=s.id==='US'?'National overview':isCity?'City overview':'Selected state';
  $('area-coverage').textContent=s.id==='US'?'50 states + District of Columbia':isCity?'Five boroughs · not the metropolitan area':'State totals · 2024';
  $('search').placeholder=areaLabel(s)+' — find another…';
  $('state-name').textContent=s.name;$('state-abbr').textContent=s.abbr;$('mobile-name').textContent=s.name;
  let html=card(s,'population',{label:'Population',cls:'wide'})+card(s,'income',{label:'Household income',period:'in 2024'})+card(s,'wealth',{label:'Net worth',period:isCity?'2026 Q1':'year-end 2024'})+card(s,'tax',{label:'Federal income tax',period:'model · Single · 2024'});
  html+=isCity?card(s,'propertyTax',{label:'Property tax',period:'residential · FY2024 model'}):card(s,'corporateTax',{label:'Corporate income tax',period:'IRS collections · FY2024'});
  $('totals').innerHTML=html;
  $('avg-note').textContent=s.id==='US'?`US per person: income ${fmt(usAvg('income'),'income',true)} · net worth ${fmt(usAvg('wealth'),'wealth',true)} · federal tax ${fmt(usAvg('tax'),'tax',true)}`:'Badges compare per-person values with the US average. Ranks are among 50 states.';
  $('group-period').textContent=isCity?'2024 · wealth 2026 Q1':'2024';
  $('data-period').textContent=isCity?'NYC: 2024 · wealth 2026 Q1':'2024 data';
  $('population-bar').innerHTML=s.groups.map((g,i)=>`<span style="width:${g.population/s.total.population*100}%;background:${colors[i]}" title="${names[i]}: ${pct(g.population/s.total.population*100)}"></span>`).join('');
  $('population-bar').setAttribute('aria-label',s.groups.map((g,i)=>names[i]+': '+pct(g.population/s.total.population*100)).join('; '));
  const d=dominant(s);$('leading-group').innerHTML=`<span class="dot" style="background:${colors[d]}"></span><span>Largest: ${names[d]}</span><strong>${pct(s.groups[d].population/s.total.population*100)}</strong>`;
  document.querySelectorAll('[data-unit-hint]').forEach(el=>{el.dataset.orig??=el.textContent;el.textContent=ui.view==='capita'?'per person':el.dataset.orig;});
  const sortVal=g=>ui.sort==='name'?0:grp(g,ui.sort,perOn(ui.sort))??-Infinity;
  const cell=(g,key)=>{const per=perOn(key),v=grp(g,key,per);
    const alt=key==='population'?pct(g.population/s.total.population*100):fmt(grp(g,key,!per),key,!per);
    return `<td title="${exact(g[key],key)}${key!=='population'?' · '+exact(grp(g,key,true),key)+' per person':''}">${fmt(v,key,per)}<small>${alt}</small></td>`;};
  $('group-rows').innerHTML=s.groups.map((g,i)=>({g,i})).sort((a,b)=>{const n=ui.sort==='name'?names[a.i].localeCompare(names[b.i]):sortVal(a.g)-sortVal(b.g);return (ui.direction==='asc'?n:-n)||a.i-b.i;})
    .map(({g,i})=>`<tr class="${ui.mode==='metric'&&ui.group===i?'row-active':''}"><td title="${g.name}"><div class="group-cell"><span class="dot" style="background:${colors[i]}"></span><span>${names[i]}</span></div></td>${cell(g,'population')}${cell(g,'income')}${cell(g,'wealth')}${cell(g,'tax')}${isCity?cell(g,'propertyTax'):''}</tr>`).join('');
  document.querySelectorAll('[data-sort]').forEach(th=>{const active=th.dataset.sort===ui.sort;th.setAttribute('aria-sort',active?(ui.direction==='asc'?'ascending':'descending'):'none');th.querySelector('.sort-arrow').textContent=active?(ui.direction==='asc'?' ↑':' ↓'):'';});
  renderCompare(s);
}
function renderCompare(a){
  const sel=$('compare-select');[...sel.options].forEach(o=>o.disabled=o.value===a.id);sel.value=ui.compare;
  const b=areas.find(x=>x.id===ui.compare);
  if(!b){$('compare-body').innerHTML='';$('compare-scope').textContent='Pick a second area';return;}
  $('compare-scope').textContent=ui.view==='capita'?'Per person':'Totals';
  const keys=['population','income','wealth','tax',...(a.total.corporateTax!=null&&b.total.corporateTax!=null?['corporateTax']:[]),...(a.total.propertyTax!=null&&b.total.propertyTax!=null?['propertyTax']:[])];
  const rows=keys.map(k=>{const per=perOn(k),va=tot(a,k,per),vb=tot(b,k,per),diff=vb?va/vb-1:null,w=Math.max(va,vb)||1;
    return `<tr><th scope="row">${metrics[k]}</th><td><div class="cbar"><i style="width:${va/w*100}%"></i></div>${fmt(va,k,per)}</td><td><div class="cbar b"><i style="width:${vb/w*100}%"></i></div>${fmt(vb,k,per)}</td><td>${diff==null?'—':`<span class="delta ${Math.abs(diff)<.005?'flat':diff>0?'up':'down'}">${diff>0?'+':''}${pct(diff*100)}</span>`}</td></tr>`;}).join('');
  $('compare-body').innerHTML=`<table class="compare-table"><thead><tr><th></th><th scope="col">${a.abbr}</th><th scope="col">${b.abbr}</th><th scope="col">${a.abbr} vs ${b.abbr}</th></tr></thead><tbody>${rows}</tbody></table><button class="chip-button" id="compare-swap">Swap ⇄</button>`;
  $('compare-swap').onclick=()=>{const x=ui.state;ui.state=ui.compare;ui.compare=x;renderMap();};
}
function renderRankings(){
  const key=ui.rankMetric,per=perOn(key);
  const val=s=>key==='name'?0:tot(s,key,per)??-Infinity;
  const sorted=[...states].sort((a,b)=>{const n=key==='name'?a.name.localeCompare(b.name):val(a)-val(b);return (ui.rankDirection==='asc'?n:-n)||a.name.localeCompare(b.name);});
  const max=key==='name'?1:Math.max(...states.map(val));
  $('rank-scope').textContent=(per?'Per person':'State totals')+' · 50 states';
  $('rank-direction').textContent=key==='name'?(ui.rankDirection==='asc'?'A to Z ↑':'Z to A ↓'):(ui.rankDirection==='asc'?'Low to high ↑':'High to low ↓');
  $('state-rankings').innerHTML=sorted.map((s,i)=>`<li><button data-rank-state="${s.id}"${ui.state===s.id?' aria-current="true"':''} style="--w:${key==='name'?0:Math.max(0,val(s)/max*100)}%"><span class="rank-number">${i+1}</span><span class="rank-name">${s.name}</span><strong>${key==='name'?s.abbr:fmt(val(s),key,per)}</strong></button></li>`).join('');
  $('state-rankings').querySelectorAll('button').forEach(b=>{b.onclick=()=>selectState(b.dataset.rankState);b.onpointerenter=()=>pathOf(b.dataset.rankState)?.classList.add('hl');b.onpointerleave=()=>pathOf(b.dataset.rankState)?.classList.remove('hl');});
  $('city-ranking-value').textContent=key==='name'?city.abbr:city.total[key]==null?'n/a':fmt(tot(city,key,per),key,per);
}

/* ---------- URL state ---------- */
function writeHash(){const p=new URLSearchParams();p.set('area',ui.state);if(ui.view!=='total')p.set('view',ui.view);if(ui.mode==='metric'){p.set('map',ui.metric);p.set('group',ui.group);if(ui.share)p.set('share','1');}if(ui.compare)p.set('vs',ui.compare);if(ui.rankMetric!=='population')p.set('rank',ui.rankMetric);try{history.replaceState(null,'','#'+p);}catch{}}
function readHash(){const p=new URLSearchParams(location.hash.slice(1));const has=id=>areas.some(a=>a.id===id);
  if(has(p.get('area')))ui.state=p.get('area');if(p.get('view')==='capita')ui.view='capita';
  if(['population','income','wealth','tax'].includes(p.get('map'))){ui.mode='metric';ui.metric=p.get('map');const g=+p.get('group');if(Number.isInteger(g)&&g>=0&&g<8)ui.group=g;ui.share=p.get('share')==='1';}
  if(has(p.get('vs'))&&p.get('vs')!==ui.state)ui.compare=p.get('vs');
  if([...$('rank-metric').options].some(o=>o.value===p.get('rank')))ui.rankMetric=p.get('rank');$('rank-metric').value=ui.rankMetric;}

/* ---------- toast / CSV ---------- */
let toastTimer;function toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,2200);}
function exportCSV(){
  const s=areas.find(a=>a.id===ui.state),isCity=s.id==='NYC';const keys=['income','wealth','tax',...(isCity?['propertyTax']:[])];
  const head=['Group','Population','Share of population %',...keys.flatMap(k=>[metrics[k]+' total $',metrics[k]+' per person $'])];
  const line=(label,o,pop)=>[label,Math.round(o.population),(o.population/s.total.population*100).toFixed(2),...keys.flatMap(k=>[Math.round(o[k]),pop?Math.round(o[k]/pop):''])];
  const rows=[head,...s.groups.map((g,i)=>line(names[i],g,g.population)),line('Total',s.total,s.total.population)];
  const csv=rows.map(r=>r.map(c=>/[",\n]/.test(String(c))?'"'+String(c).replace(/"/g,'""')+'"':c).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'}));a.download=`states-atlas-${s.abbr.toLowerCase()}-2024.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

/* ---------- theme ---------- */
function applyTheme(){const c=cssVar('--map-base');if(/^#[0-9a-f]{6}$/i.test(c))mapBase=rgb(c);}
$('theme-toggle').onclick=()=>{const dark=matchMedia('(prefers-color-scheme: dark)').matches;const cur=document.documentElement.dataset.theme||(dark?'dark':'light');const next=cur==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('atlas-theme',next);}catch{}applyTheme();renderMap();};
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{applyTheme();renderMap();});

/* ---------- events ---------- */
document.querySelectorAll('[data-group-sort]').forEach(b=>b.onclick=()=>{const key=b.dataset.groupSort;ui.direction=ui.sort===key?(ui.direction==='desc'?'asc':'desc'):(key==='name'?'asc':'desc');ui.sort=key;renderPanel();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{ui.view=b.dataset.view;ui.share=false;renderMap();});
$('rank-metric').onchange=e=>{ui.rankMetric=e.target.value;ui.rankDirection=ui.rankMetric==='name'?'asc':'desc';renderRankings();writeHash();};
$('rank-direction').onclick=()=>{ui.rankDirection=ui.rankDirection==='desc'?'asc':'desc';renderRankings();};
document.querySelector('[data-city]').onclick=()=>selectState('NYC');
$('national-open').onclick=()=>selectState('US');
$('legend-open').onclick=()=>{$('legend-dialog').showModal();hideTip();};$('legend-close').onclick=()=>$('legend-dialog').close();
$('mode-dominant').onclick=()=>{ui.mode='dominant';renderMap();};$('mode-metric').onclick=()=>{ui.mode='metric';renderMap();};
$('metric').onchange=e=>{ui.metric=e.target.value;renderMap();};$('group').onchange=e=>{ui.group=Number(e.target.value);renderMap();};
$('unit').onchange=e=>{if(e.target.value==='share')ui.share=true;else{ui.share=false;ui.view=e.target.value;}renderMap();};
$('compare-select').onchange=e=>{ui.compare=e.target.value;renderMap();};
function trySearch(final){const q=$('search').value.trim().toLowerCase();if(!q)return;const hit=areas.find(a=>areaLabel(a).toLowerCase()===q||a.abbr.toLowerCase()===q)||(final&&areas.find(a=>areaLabel(a).toLowerCase().startsWith(q)));if(hit){selectState(hit.id);$('search').value='';$('search').blur();}else if(final)toast('No state matches “'+$('search').value+'”');}
$('search').oninput=()=>trySearch(false);$('search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();trySearch(true);}};
$('csv-export').onclick=exportCSV;
$('share-link').onclick=async()=>{writeHash();try{await navigator.clipboard.writeText(location.href);toast('Link copied');}catch{toast('Copy the address bar to share this view');}};
document.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>selectState(states.find(s=>s.abbr===b.dataset.state).id));
for(const id of ['about-open','method-open'])$(id).onclick=()=>{$('about').showModal();hideTip();};
$('about-close').onclick=()=>$('about').close();
for(const d of [$('about'),$('legend-dialog')])d.onclick=e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}};
window.addEventListener('scroll',hideTip,{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='SELECT'){e.preventDefault();$('search').focus();}});
/* mobile: floating bar until the detail panel is on screen */
$('mobile-jump').onclick=()=>$('state-panel').scrollIntoView({behavior:'smooth',block:'start'});
if('IntersectionObserver' in window)new IntersectionObserver(([e])=>{$('mobile-bar').hidden=e.isIntersecting;},{threshold:.05}).observe($('state-panel'));

applyTheme();readHash();renderMap();
window.addEventListener('hashchange',()=>{readHash();renderMap();});

/* ---------- programmatic API (kept from previous version) ---------- */
const api={getSelection:()=>({...ui}),getState:id=>areas.find(s=>s.id===id),configure(input){if(!input||typeof input!=='object')throw Error('Expected an object');const allowed={mode:['dominant','metric'],metric:['population','income','wealth','tax'],unit:['total','capita','share']};for(const [k,values]of Object.entries(allowed))if(input[k]!==undefined&&!values.includes(input[k]))throw Error('Invalid value for '+k);if(input.group!==undefined&&(!Number.isInteger(input.group)||input.group<0||input.group>7))throw Error('Group must be an integer from 0 to 7');if(input.state!==undefined&&!areas.some(s=>s.id===input.state))throw Error('Unknown area');for(const k of ['mode','metric','group','state'])if(input[k]!==undefined)ui[k]=input[k];if(input.unit==='share')ui.share=true;else if(input.unit){ui.share=false;ui.view=input.unit;}renderMap();return {selection:{...ui},state:areas.find(s=>s.id===ui.state).name};}};
window.atlas=api;
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'configure_us_atlas',title:'Configure the US atlas',description:'Choose an area, population group, metric, map mode and total vs per-person view.',inputSchema:{type:'object',properties:{state:{type:'string',description:'Two-digit state FIPS code, US for the national overview, or NYC for New York City'},mode:{type:'string',enum:['dominant','metric']},metric:{type:'string',enum:['population','income','wealth','tax']},group:{type:'integer',minimum:0,maximum:7},unit:{type:'string',enum:['total','capita','share']}},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>api.configure(input)})).catch(()=>{});}catch{}}
})();
