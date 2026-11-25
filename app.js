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
async function load(f){for(const u of ['data/'+f,CDN+f]){try{const r=await fetch(u);if(r.ok)return await r.json()}catch(e){}}throw new Error('Could not load '+f)}
const C={};let ids=[],adj={},stars=[],lines=[],borders=[];
function dens(r){const o=[];for(let i=0;i<r.length-1;i++){const a=r[i],b=r[i+1],n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0])*Math.cos((a[1]+b[1])*D/2),Math.abs(b[1]-a[1]))/2));for(let j=0;j<n;j++)o.push(vec(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n))}o.push(vec(r[r.length-1][0],r[r.length-1][1]));return o}
function prep(b,s,l){
 for(const f of b.features){const p=f.properties,c=C[p.id]||(C[p.id]={id:p.id,name:p.name,polys:[],verts:[],dense:[],seen:new Set()});
  if(p.id==='Ser')c.name='Serpens'; /* data has Caput and Cauda as two features: merged */
  for(const poly of f.geometry.coordinates){const ring=poly[0],d=dens(ring);c.polys.push(ring);c.dense.push(d);borders.push(d);
   for(const q of ring){const k=((q[0]%360)+360)%360+'|'+q[1];if(!c.seen.has(k)){c.seen.add(k);c.verts.push(vec(q[0],q[1]))}}}}
 ids=Object.keys(C).sort();ids.forEach(i=>{adj[i]=new Set();C[i].lab=randPoint(C[i])});
 /* adjacency: neighbours share >=2 boundary vertices (0.6 deg tolerance) */
 const T=Math.cos(.6*D),near=(A,B)=>{let n=0;for(const p of A.verts)for(const q of B.verts)if(dot(p,q)>T){n++;break}return n};
 const link=(a,b)=>{if(adj[a]&&adj[b]){adj[a].add(b);adj[b].add(a)}};
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const A=C[ids[i]],B=C[ids[j]];if(near(A,B)>=2&&near(B,A)>=2)link(A.id,B.id)}
 link('UMi','Cep');
 stars=s.features.map(f=>({v:vec(f.geometry.coordinates[0],f.geometry.coordinates[1]),m:f.properties.mag??5}));
 for(const f of l.features){const g=f.geometry;(g.type==='MultiLineString'?g.coordinates:[g.coordinates]).forEach(ls=>lines.push(ls.map(q=>vec(q[0],q[1]))))}
}
const keys=c=>c.k||(c.k=[key(c.name),key(c.id),...(c.id==='Ser'?['serpenscaput','serpenscauda']:[])]);
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
 if(o.lines)path(cx,lines,P,'#8a8a8a',1.2);
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
 const t=key($('#ans').value),c=C[G.target];if(!t)return;
 if(keys(c).includes(t)){G.solved=true;G.msg='correct'}
 else if(!quiet){G.msg=[...adj[c.id]].some(i=>keys(C[i]).includes(t))?'close':'incorrect'}
 ui()}
function nextRound(){G.solved?G.ok++:G.miss++;newRound()}

/* ---------- skyrace ---------- */
const R={start:'',end:'',path:[],done:false};
function bfs(a){const d={[a]:0},p={},q=[a];for(let i=0;i<q.length;i++)for(const n of adj[q[i]])if(!(n in d)){d[n]=d[q[i]]+1;p[n]=q[i];q.push(n)}return{d,p}}
function newRace(){
 let m=Math.max(2,+$('#minsteps').value||2),a,c=[];
 for(let t=0;t<300&&!c.length;t++){a=pick(ids);const{d}=bfs(a);c=ids.filter(i=>d[i]>=m);if(t==299)m=2}
 Object.assign(R,{start:a,end:pick(c),path:[a],done:false});drawRace()}
function drawChart(id){
 const c=C[id];let s=[0,0,0],n=0;for(const a of c.dense)for(const v of a){s[0]+=v[0];s[1]+=v[1];s[2]+=v[2];n++}
 const f=Math.hypot(...s)/n<.1?vec(c.lab[0],c.lab[1]):nrm(s);
 let r=0;for(const a of c.dense)for(const v of a)r=Math.max(r,Math.acos(Math.min(1,dot(f,v))));
 const fov=Math.min(170,Math.max(25,2*r/D*1.2+8)),W=1000,H=760;
 $('#ctitle').textContent='IAU chart: '+c.name;
 sky($('#chart').getContext('2d'),W,H,look(f),fov,{bounds:true,lines:true,
  under:(cx,P)=>{for(const a of c.dense){const pts=a.map(P);if(pts.some(p=>!p))continue;cx.beginPath();pts.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fillStyle='rgba(0,0,0,.09)';cx.fill()}},
  over:(cx,P)=>{path(cx,c.dense,P,'#000',3.5);cx.textAlign='center';cx.textBaseline='middle';
   for(const i of ids){const p=P(vec(C[i].lab[0],C[i].lab[1]));if(!p||p[0]<30||p[0]>W-30||p[1]<14||p[1]>H-14)continue;
    cx.font=(i===id?'bold 17px':'14px')+' Arial';cx.lineWidth=4;cx.strokeStyle='#fff';cx.strokeText(C[i].name,p[0],p[1]);cx.fillStyle='#000';cx.fillText(C[i].name,p[0],p[1])}}})}
function drawRace(){
 const cur=R.path[R.path.length-1],nm=i=>C[i].name,b=$('#rbtns');b.innerHTML='';
 $('#rinfo').innerHTML=`Start: <b>${nm(R.start)}</b><br>Destination: <b>${nm(R.end)}</b><br>Current: <b>${nm(cur)}</b><br>Moves so far: ${R.path.length-1}<br>Path so far: ${R.path.map(nm).join(' &gt; ')}`;
 drawChart(cur);
 if(R.done){const{p}=bfs(R.start),s=[R.end];while(s[0]!==R.start)s.unshift(p[s[0]]);const n=R.path.length;
  $('#nexth').textContent='Destination reached';
  $('#rres').innerHTML=`<p>You went through ${n} constellations (${n-1} moves), start and destination included.</p><p>The shortest possible is ${s.length} constellations (${s.length-1} moves).</p><p>Suggested shortest path: ${s.map(nm).join(' &gt; ')}</p>${n===s.length?'<p><b>You found a shortest path.</b></p>':''}`;return}
 $('#nexth').textContent='Go to';$('#rres').textContent='';
 [...adj[cur]].sort((x,y)=>nm(x)<nm(y)?-1:1).forEach(i=>{const e=document.createElement('button');e.textContent=nm(i);e.onclick=()=>{R.path.push(i);if(i===R.end)R.done=true;drawRace()};b.append(e)})}

/* ---------- saves (3 slots, localStorage) + page wiring ---------- */
let game='guess';
function show(g){game=g;$('#guess').hidden=g!=='guess';$('#race').hidden=g!=='race';$('#tg').classList.toggle('on',g==='guess');$('#tr').classList.toggle('on',g==='race');if(g==='guess'){ui();draw()}else drawRace()}
function slots(){const el=$('#slots');el.innerHTML='';
 for(let i=1;i<=3;i++){let s=null;try{s=JSON.parse(localStorage.getItem('ioaa-slot-'+i))}catch(e){}
  const d=document.createElement('div'),r=document.createElement('div');r.className='row';d.append(`Slot ${i}: ${s?s.label:'empty'}`,r);
  const add=(t,f)=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;r.append(b)};
  add('Save',()=>{if(!ids.length)return;const now=new Date().toLocaleString(),label=game==='guess'?`Skyguessr, ${G.ok+G.miss} rounds played, ${now}`:`Skyrace ${C[R.start].name} to ${C[R.end].name}, ${R.path.length-1} moves, ${now}`;
   try{localStorage.setItem('ioaa-slot-'+i,JSON.stringify({game,label,state:clone(game==='guess'?G:R)}))}catch(e){alert('Could not save in this browser.')}slots()});
  add('Load',()=>{if(!s)return;Object.assign(s.game==='guess'?G:R,s.state);show(s.game);$('#menu').hidden=true});
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
 try{const[b,s,l]=await Promise.all([load('constellations.bounds.min.geojson'),load('stars.6.min.geojson'),load('constellations.lines.min.geojson')]);
  prep(b,s,l);wire();slots();newRound();newRace();$('#status').textContent=`Ready (v3): ${ids.length} constellations loaded`}
 catch(e){$('#status').textContent='Error: '+e.message+' (see README)'}
})();
