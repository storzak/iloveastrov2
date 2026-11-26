'use strict';
const D=Math.PI/180,$=s=>document.querySelector(s),pick=a=>a[Math.random()*a.length|0];
const CDN='https://cdn.jsdelivr.net/gh/dieghernan/celestial_data@main/data/';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
mix=(a,b,c,s)=>[a[0]*c+b[0]*s,a[1]*c+b[1]*s,a[2]*c+b[2]*s],
nrm=v=>{const m=Math.hypot(...v);return v.map(x=>x/m)},
vec=(ra,dec)=>{ra*=D;dec*=D;return[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)]},
key=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,''),
clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- data (tries ./data/ first, then jsDelivr) ---------- */
async function fetchFirst(urls,json){for(const u of urls){try{const r=await fetch(u);if(r.ok)return json?await r.json():await r.text()}catch(e){}}throw new Error('Could not load '+urls[urls.length-1])}
const load=f=>fetchFirst(['data/'+f,CDN+f],true);
/* Sky & Telescope line patterns (the ones on the IAU charts): Stellarium "modern_st" sky culture, pairs of Hipparcos numbers */
const STEL='eb47095a9282cf6b981f6e37fe1ea3a3ae0fd167',FAB='skycultures/modern_st/constellationship.fab';
const loadFab=()=>fetchFirst(['data/constellationship.fab','https://raw.githubusercontent.com/Stellarium/stellarium/'+STEL+'/'+FAB,'https://cdn.jsdelivr.net/gh/Stellarium/stellarium@'+STEL+'/'+FAB],false);
const hip={},segs=[];
function parseFab(t){for(const ln of t.split('\n')){if(ln[0]==='#')continue;const n=ln.trim().split(/\s+/).slice(2).filter(x=>/^\d+$/.test(x)).map(Number);for(let i=0;i+1<n.length;i+=2)segs.push([n[i],n[i+1]])}}
function buildLines(){lines=segs.filter(s=>hip[s[0]]&&hip[s[1]]).map(s=>[vec(hip[s[0]][0],hip[s[0]][1]),vec(hip[s[1]][0],hip[s[1]][1])])}
const C={};let ids=[],adj={},stars=[],lines=[],borders=[];
function dens(r){const o=[];for(let i=0;i<r.length-1;i++){const a=r[i],b=r[i+1],n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0])*Math.cos((a[1]+b[1])*D/2),Math.abs(b[1]-a[1]))/2));for(let j=0;j<n;j++)o.push(vec(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n))}o.push(vec(r[r.length-1][0],r[r.length-1][1]));return o}
function prep(b,s,l,fab){
 for(const f of b.features){const p=f.properties,c=C[p.id]||(C[p.id]={id:p.id,name:p.name,polys:[],verts:[],dense:[],seen:new Set()});
  if(p.id==='Ser')c.name='Serpens'; /* data has Caput and Cauda as two features: merged */
  for(const poly of f.geometry.coordinates){const ring=poly[0],d=dens(ring);c.polys.push(ring);c.dense.push(d);borders.push(d);
   for(const q of ring){const k=((q[0]%360)+360)%360+'|'+q[1];if(!c.seen.has(k)){c.seen.add(k);c.verts.push(vec(q[0],q[1]))}}}}
 ids=Object.keys(C).sort();ids.forEach(i=>{adj[i]=new Set()});
 /* adjacency: neighbours share >=2 boundary vertices (0.6 deg tolerance) */
 const T=Math.cos(.6*D),near=(A,B)=>{let n=0;for(const p of A.verts)for(const q of B.verts)if(dot(p,q)>T){n++;break}return n};
 const link=(a,b)=>{if(adj[a]&&adj[b]){adj[a].add(b);adj[b].add(a)}};
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const A=C[ids[i]],B=C[ids[j]];if(near(A,B)>=2&&near(B,A)>=2)link(A.id,B.id)}
 link('UMi','Cep');
 stars=s.features.map(f=>({v:vec(f.geometry.coordinates[0],f.geometry.coordinates[1]),m:f.properties.mag??5}));
 const hipOf=f=>+(f.id??f.properties.id??f.properties.hip);
 const legacy=()=>{for(const f of l.features){const g=f.geometry;(g.type==='MultiLineString'?g.coordinates:[g.coordinates]).forEach(ls=>lines.push(ls.map(q=>vec(q[0],q[1]))))}};
 if(!fab)return legacy();
 parseFab(fab);const need=new Set(segs.flat());
 for(const f of s.features){const h=hipOf(f);if(need.has(h))hip[h]=f.geometry.coordinates}
 buildLines();
 if(!lines.length){segs.length=0;return legacy()} /* ids not matched: use the standard lines instead */
 if(segs.some(x=>!hip[x[0]]||!hip[x[1]])) /* a few pattern stars are fainter than mag 6: fetch the mag-8 catalogue just for them */
  fetchFirst(['data/stars.8.min.geojson',CDN+'stars.8.min.geojson'],true).then(j=>{for(const f of j.features){const h=hipOf(f);if(need.has(h)&&!hip[h])hip[h]=f.geometry.coordinates}buildLines();draw()}).catch(()=>{})
}
const keys=c=>c.k||(c.k=[key(c.name),...(c.id==='Ser'?['serpenscaput','serpenscauda']:[])]); /* full names only */
function inside(poly,x,y){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function edist(poly,x,y){const k=Math.cos(y*D);let m=1e9;for(let i=0;i<poly.length-1;i++){const a=poly[i],b=poly[i+1],ax=(a[0]-x)*k,ay=a[1]-y,dx=(b[0]-x)*k-ax,dy=b[1]-y-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));m=Math.min(m,Math.hypot(ax+t*dx,ay+t*dy))}return m}
function randPoint(c){ /* random point well inside the constellation */
 const cand=[];
 for(let t=0;t<4000&&cand.length<120;t++){const poly=pick(c.polys);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const q of poly){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])}
  const x=x0+Math.random()*(x1-x0),y=y0+Math.random()*(y1-y0);if(inside(poly,x,y))cand.push([edist(poly,x,y),x,y])}
 cand.sort((a,b)=>b[0]-a[0]);const q=cand[Math.random()*Math.ceil(cand.length*.2)|0];return[q[1],q[2]]}

/* ---------- star chart renderer: stereographic, black stars on white ---------- */
function look(f){let n=[0,0,1];if(Math.abs(f[2])>.999)n=[1,0,0];const u=nrm(mix(n,f,1,-dot(n,f)));return{f,u,r:cross(f,u)}}
function path(cx,arr,P,col,w){cx.strokeStyle=col;cx.lineWidth=w;cx.beginPath();for(const a of arr){let pen=false;for(const v of a){const p=P(v);if(!p){pen=false;continue}pen?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);pen=true}}cx.stroke()}
function sky(cx,W,H,cam,fov,o){
 const k=(Math.min(W,H)/2)/(2*Math.tan(fov*D/4)),
 P=v=>{const d=dot(v,cam.f);if(d<-.98)return null;const q=2/(1+d);return[W/2+k*q*dot(v,cam.r),H/2-k*q*dot(v,cam.u)]};
 cx.fillStyle='#fff';cx.fillRect(0,0,W,H);if(o.under)o.under(cx,P);
 cx.fillStyle='#000';const gam=Math.min(2,Math.pow(145/fov,.25));
 for(const s of stars){const p=P(s.v);if(!p||p[0]<-8||p[0]>W+8||p[1]<-8||p[1]>H+8)continue;cx.beginPath();cx.arc(p[0],p[1],Math.max(.75,(6.3-s.m)*.675*gam),0,7);cx.fill()}
 if(o.lines)path(cx,lines,P,'#555',1.5);
 if(o.bounds)path(cx,borders,P,'#000',1);
 if(o.over)o.over(cx,P);
}

/* ---------- skyguessr ---------- */
const G={fov:145,cam:null,start:null,tp:null,target:null,solved:false,msg:'',ok:0,miss:0};
function turn(ax,a){const c=Math.cos(a),s=Math.sin(a),m=G.cam;
 if(ax==='x')[m.f,m.r]=[mix(m.f,m.r,c,s),mix(m.r,m.f,c,-s)];
 else if(ax==='y')[m.f,m.u]=[mix(m.f,m.u,c,s),mix(m.u,m.f,c,-s)];
 else[m.r,m.u]=[mix(m.r,m.u,c,s),mix(m.u,m.r,c,-s)]}
function draw(){
 if(!G.cam)return;
 sky($('#sky').getContext('2d'),900,900,G.cam,G.fov,{lines:$('#tl').checked,bounds:$('#tb').checked,over:(cx,P)=>{
  const p=G.tp&&P(vec(G.tp[0],G.tp[1]));
  if(p){cx.strokeStyle='#000';cx.lineWidth=2.5;cx.beginPath();cx.arc(p[0],p[1],24,0,7);cx.moveTo(p[0]-9,p[1]-9);cx.lineTo(p[0]+9,p[1]+9);cx.moveTo(p[0]+9,p[1]-9);cx.lineTo(p[0]-9,p[1]+9);cx.stroke()}}})}
function ui(){$('#fovv').textContent=Math.round(G.fov)+' degrees';$('#fov').value=G.fov;$('#msg').textContent=G.msg;
 const n=G.ok+G.miss;$('#score').textContent=`Correct: ${G.ok} | Not correct: ${G.miss} | Accuracy: ${n?Math.round(100*G.ok/n)+'%':'n/a'}`}
function setFov(v){G.fov=Math.max(5,Math.min(180,v));ui();draw()}
function newRound(){
 const c=C[pick(ids)],[ra,dec]=randPoint(c),t=vec(ra,dec),p=nrm(cross(t,[Math.random()-.5,Math.random()-.5,Math.random()-.5])),a=Math.random()*35*D;
 G.cam=look(mix(t,p,Math.cos(a),Math.sin(a)));turn('z',Math.random()*2*Math.PI);
 Object.assign(G,{target:c.id,tp:[ra,dec],solved:false,msg:''});G.start=clone(G.cam);$('#ans').value='';setFov(145)}
function check(quiet){
 /* quiet = typing: only an exact, complete name counts, and only if no longer name starts with it (Leo vs Leo Minor);
    Enter/Check judges what was typed: correct, close (full name of a neighbour) or incorrect */
 const t=key($('#ans').value),c=C[G.target],hit=keys(c).includes(t);
 if(hit&&(!quiet||!ids.some(i=>keys(C[i]).some(k=>k!==t&&k.startsWith(t)))))G.solved=true;
 if(G.solved)G.msg='correct';
 else if(quiet||!t)G.msg='';
 else G.msg=[...adj[c.id]].some(i=>keys(C[i]).includes(t))?'close':'incorrect';
 ui()}
function nextRound(){G.solved?G.ok++:G.miss++;newRound()}

/* ---------- skyrace ---------- */
const R={start:'',end:'',path:[],done:false};
function bfs(a){const d={[a]:0},p={},q=[a];for(let i=0;i<q.length;i++)for(const n of adj[q[i]])if(!(n in d)){d[n]=d[q[i]]+1;p[n]=q[i];q.push(n)}return{d,p}}
function newRace(){
 let m=Math.max(2,+$('#minsteps').value||2),a,c=[];
 for(let t=0;t<300&&!c.length;t++){a=pick(ids);const{d}=bfs(a);c=ids.filter(i=>d[i]>=m);if(t==299)m=2}
 Object.assign(R,{start:a,end:pick(c),path:[a],done:false});drawRace()}
const WIKI='https://commons.wikimedia.org/wiki/';
function chart(id){ /* official IAU / Sky & Telescope charts from Wikimedia Commons ("<Name> IAU.svg") */
 const box=$('#chartimgs');box.innerHTML='';
 for(const nm of id==='Ser'?['Serpens Caput','Serpens Cauda']:[C[id].name]){
  const files=[...new Set([nm,nm.normalize('NFD').replace(/[\u0300-\u036f]/g,'')])].map(n=>n.replace(/ /g,'_')+'_IAU.svg');
  const im=new Image();let h=0;const src=i=>WIKI+'Special:FilePath/'+encodeURIComponent(files[i])+'?width=1100';
  im.alt='IAU chart: '+nm;im.src=src(0);
  im.onerror=()=>{if(++h<files.length)im.src=src(h);else{const p=document.createElement('p');p.innerHTML='The chart could not be loaded. <a href="'+WIKI+'File:'+encodeURIComponent(files[0])+'" target="_blank" rel="noopener">Open it on Wikimedia Commons</a>.';im.replaceWith(p)}};
  box.append(im)}}
function drawRace(){
 const cur=R.path[R.path.length-1],nm=i=>C[i].name,b=$('#rbtns');b.innerHTML='';
 $('#rinfo').innerHTML=`Start: <b>${nm(R.start)}</b><br>Destination: <b>${nm(R.end)}</b><br>Current: <b>${nm(cur)}</b><br>Moves so far: ${R.path.length-1}<br>Path so far: ${R.path.map(nm).join(' &gt; ')}`;
 chart(cur);
 if(R.done){const{p}=bfs(R.start),s=[R.end];while(s[0]!==R.start)s.unshift(p[s[0]]);const n=R.path.length;
  $('#nexth').textContent='Destination reached';
  $('#rres').innerHTML=`<p>You went through ${n} constellations (${n-1} moves), start and destination included.</p><p>The shortest possible is ${s.length} constellations (${s.length-1} moves).</p><p>Suggested shortest path: ${s.map(nm).join(' &gt; ')}</p>${n===s.length?'<p><b>You found a shortest path.</b></p>':''}`;return}
 $('#nexth').textContent='Go to';$('#rres').textContent='';
 [...adj[cur]].sort((x,y)=>nm(x)<nm(y)?-1:1).forEach(i=>{const e=document.createElement('button');e.textContent=nm(i);e.onclick=()=>{R.path.push(i);if(i===R.end)R.done=true;drawRace()};b.append(e)})}

/* ---------- saves (3 slots, localStorage) + page wiring ---------- */
let game='guess';
function show(g){game=g;$('#guess').hidden=g!=='guess';$('#race').hidden=g!=='race';$('#tg').classList.toggle('on',g==='guess');$('#tr').classList.toggle('on',g==='race');if(g==='guess'){ui();draw()}else drawRace()}
/* a save slot holds the whole site: both games, which tab is open, overlays, step size, race setting and typed answer */
function snapshot(){return clone({game,G,R,ui:{tl:$('#tl').checked,tb:$('#tb').checked,step:$('#step').value,min:$('#minsteps').value,ans:$('#ans').value}})}
function restore(s){Object.assign(G,s.G);Object.assign(R,s.R);const u=s.ui||{};
 $('#tl').checked=!!u.tl;$('#tb').checked=!!u.tb;if(u.step)$('#step').value=u.step;if(u.min)$('#minsteps').value=u.min;$('#ans').value=u.ans||'';
 game=s.game;ui();draw();drawRace();show(game)}
function slots(){const el=$('#slots');el.innerHTML='';
 for(let i=1;i<=3;i++){let s=null;try{s=JSON.parse(localStorage.getItem('ioaa-slot-'+i))}catch(e){}
  const d=document.createElement('div'),r=document.createElement('div');r.className='row';d.append(`Slot ${i}: ${s?s.label:'empty'}`,r);
  const add=(t,f)=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;r.append(b)};
  add('Save',()=>{if(!ids.length)return;const n=G.ok+G.miss,label=`${new Date().toLocaleString()}: ${game==='guess'?'Skyguessr':'Skyrace'} open. Skyguessr: ${n} rounds, ${n?Math.round(100*G.ok/n)+'%':'n/a'}. Skyrace: ${C[R.start].name} to ${C[R.end].name}, ${R.path.length-1} moves.`;
   try{localStorage.setItem('ioaa-slot-'+i,JSON.stringify({label,all:snapshot()}))}catch(e){alert('Could not save in this browser.')}slots()});
  add('Load',()=>{if(!s)return;if(s.all)restore(s.all);else{Object.assign(s.game==='guess'?G:R,s.state);ui();draw();show(s.game)}$('#menu').hidden=true});
  add('Clear',()=>{localStorage.removeItem('ioaa-slot-'+i);slots()});
  el.append(d)}}
function wire(){
 $('#tg').onclick=()=>show('guess');$('#tr').onclick=()=>show('race');
 $('#burger').onclick=e=>{e.stopPropagation();const m=$('#menu');m.hidden=!m.hidden;$('#burger').setAttribute('aria-expanded',!m.hidden)};
 document.addEventListener('click',e=>{if(!e.target.closest('#menuwrap'))$('#menu').hidden=true});
 $('#fov').oninput=e=>setFov(+e.target.value);$('#fm').onclick=()=>setFov(G.fov*.85);$('#fp').onclick=()=>setFov(G.fov/.85);
 $('#tl').onchange=$('#tb').onchange=draw;
 document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{turn(b.dataset.a,+b.dataset.s*(+$('#step').value)*D);draw()});
 $('#chk').onclick=()=>check(false);$('#ans').onkeydown=e=>{if(e.key==='Enter')check(false)};$('#ans').oninput=()=>check(true);
 $('#next').onclick=nextRound;$('#reset').onclick=()=>{G.cam=clone(G.start);setFov(145)};
 $('#newrace').onclick=newRace;$('#restart').onclick=()=>{Object.assign(R,{path:[R.start],done:false});drawRace()};
 const cv=$('#sky');let drag=null;
 cv.onpointerdown=e=>{drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId)};
 cv.onpointermove=e=>{if(!drag)return;const a=G.fov*D/cv.getBoundingClientRect().width;turn('x',-(e.clientX-drag[0])*a);turn('y',(e.clientY-drag[1])*a);drag=[e.clientX,e.clientY];draw()};
 cv.onpointerup=cv.onpointercancel=()=>drag=null;
 cv.onwheel=e=>{e.preventDefault();setFov(G.fov*(e.deltaY>0?1.1:.91))}}
(async()=>{
 try{const[b,s,l,fab]=await Promise.all([load('constellations.bounds.min.geojson'),load('stars.6.min.geojson'),load('constellations.lines.min.geojson').catch(()=>({features:[]})),loadFab().catch(()=>null)]);
  prep(b,s,l,fab);wire();slots();newRound();newRace();$('#status').textContent=`Ready (v7): ${ids.length} constellations, ${segs.length?'Sky & Telescope':'fallback'} lines`}
 catch(e){$('#status').textContent='Error: '+e.message+' (see README)'}
})();
