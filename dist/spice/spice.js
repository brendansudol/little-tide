import * as THREE from '../vendor/three.module.js';
import {TAU,MAZE,START,FINISH,SPAWN,SHOWER,BOUNCE,MIXER,SAUCES,RACE_HEAD_START,RACE_FINISH_TIME,SPICES,WALLS,ROUTE,ROUTE_LENGTH,createState,nearby,act,addSauce,clearRecipe,stirSauces,closeMixer,sauceResult,jump,home,tick,shotPosition,dist,clamp} from './rules.js?v=sauce-2';
const $=s=>document.querySelector(s),canvas=$('#world'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch(error){$('#loading').innerHTML='<p>Spice World needs WebGL.<br>Please enable hardware acceleration and try again.</p>';throw error;}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const scene=new THREE.Scene();scene.background=new THREE.Color('#ead1a6');scene.fog=new THREE.Fog('#ead1a6',105,240);
const camera=new THREE.PerspectiveCamera(innerWidth<700?57:45,innerWidth/innerHeight,.1,350);
scene.add(new THREE.HemisphereLight('#fff4cc','#905950',2));
const sun=new THREE.DirectionalLight('#fff2d2',2.6);sun.position.set(-30,60,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:120});sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;scene.add(sun);
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra}),basic=(color,extra={})=>new THREE.MeshBasicMaterial({color,...extra});
const cream=mat('#fff1cd'),red=mat('#d83c23',{roughness:.3}),bbq=mat('#87432b',{roughness:.38}),bbqTop=mat('#ad6137',{roughness:.4}),mustard=mat('#e8b629',{roughness:.4}),green=mat('#7a9c58'),dark=mat('#492d28'),pink=mat('#ed9478'),gold=mat('#efc968',{metalness:.25,roughness:.3}),metal=mat('#b9bcb0',{metalness:.45,roughness:.4});
const sphere=new THREE.SphereGeometry(1,18,12),cube=new THREE.BoxGeometry(1,1,1),cyl=new THREE.CylinderGeometry(1,1,1,20);
function group(x=0,y=0,z=0,parent=scene){const o=new THREE.Group();o.position.set(x,y,z);parent.add(o);return o;}
function mesh(geo,m,p=scene,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function ball(p,m,x,y,z,sx,sy=sx,sz=sx){const o=mesh(sphere,m,p,x,y,z);o.scale.set(sx,sy,sz);return o;}
function box(p,m,x,y,z,w,h,d){const o=mesh(cube,m,p,x,y,z);o.scale.set(w,h,d);return o;}
function cylinder(p,m,x,y,z,r,h){const o=mesh(cyl,m,p,x,y,z);o.scale.set(r,h,r);return o;}
function line(points,color,parent=scene){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color}));parent.add(o);return o;}
function ring(p,r,y,color,t=.055){const o=mesh(new THREE.TorusGeometry(r,t,6,48),basic(color),p,0,y,0);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;}
function label(text,width=5,bg='#fff1cf',color='#73432e'){
 const c=document.createElement('canvas');c.width=768;c.height=152;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(4,4,760,144,27);ctx.fill();ctx.fillStyle=color;ctx.font='600 60px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,79,710);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false,toneMapped:false}));o.scale.set(width,width*152/768,1);return o;
}
function sign(text,x,y,z,width=5){const o=label(text,width);o.position.set(x,y,z);scene.add(o);return o;}
let seed=216;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
// One glossy ketchup surface. Swirls are painted into its texture to avoid flashing layers.
const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=1536;const fc=floorCanvas.getContext('2d');fc.fillStyle='#b92e23';fc.fillRect(0,0,1536,1536);
for(let i=0;i<80;i++){const x=rand()*1536,y=rand()*1536,r=30+rand()*100;fc.strokeStyle=i%2?'#d75b352d':'#8f2d2722';fc.lineWidth=3+rand()*5;fc.beginPath();fc.ellipse(x,y,r,r*.3,rand(),0,Math.PI*1.6);fc.stroke();}
const floorTexture=new THREE.CanvasTexture(floorCanvas);floorTexture.colorSpace=THREE.SRGBColorSpace;floorTexture.anisotropy=4;
const floor=mesh(new THREE.PlaneGeometry(64,64),mat('#ffffff',{map:floorTexture,roughness:.34}));floor.rotation.x=-Math.PI/2;floor.castShadow=false;
box(scene,red,0,-1.45,0,64,2.8,64);box(scene,cream,0,-3,0,65,.4,65);
for(let i=0;i<24;i++){const a=i/24*TAU,x=Math.cos(a)*31.7,z=Math.sin(a)*31.7;ball(scene,red,x,-1.6,z,.8,1+rand(),.8);}
// Barbecue walls and a mustard roof, opened like a dollhouse so the maze stays readable.
const outerWalls=[];
for(const b of [{x:-31.7,z:0,w:.7,d:64},{x:31.7,z:0,w:.7,d:64},{x:0,z:-31.7,w:64,d:.7},{x:0,z:31.7,w:64,d:.7}]){
 const m=bbq.clone();m.transparent=true;m.opacity=b.z>30?.22:.8;m.depthWrite=b.z<30;const o=box(scene,m,b.x,2.3,b.z,b.w,4.6,b.d);outerWalls.push(o);
}
const roof=group(0,14,0),roofMat=mustard.clone();roofMat.transparent=true;roofMat.opacity=.1;roofMat.depthWrite=false;
box(roof,roofMat,0,0,0,63,.22,63).castShadow=false;
for(const b of [{x:-30,z:0,w:3.8,d:64},{x:30,z:0,w:3.8,d:64},{x:0,z:-30,w:60,d:4}])box(roof,mustard,b.x,0,b.z,b.w,.7,b.d);
for(let i=0;i<17;i++){const x=-29+i*3.6;ball(roof,mustard,x,-.55,-28.2,.5,.7+rand()*.7,.45);}
for(const side of [-1,1])for(let i=0;i<10;i++){const z=-27+i*5.8;ball(roof,mustard,side*28.3,-.4,z,.45,.8+rand()*.5,.45);}
for(const x of [-30,30])for(const z of [-29,29])cylinder(scene,bbq,x,7,z,.35,14);
sign('MUSTARD SKY',-24,15,-27,7);
// Low sauce walls are tall enough to be a real maze, without hiding the explorer.
WALLS.forEach((b,i)=>{
 box(scene,bbq,b.x,1.13,b.z,b.w,2.26,b.d);box(scene,bbqTop,b.x,2.28,b.z,b.w+.12,.22,b.d+.12);
 const horizontal=b.w>b.d;
 for(let j=-1;j<=1;j++){const x=b.x+(horizontal?j*1.8:0),z=b.z+(horizontal?0:j*1.8);ball(scene,bbqTop,x,1.9,z,.25,.4,.25);}
});
// Friendly giant shakers stand outside the racing lanes.
function shaker(x,z,color,name){const g=group(x,0,z);cylinder(g,cream,0,1.9,0,1.15,3.8);cylinder(g,mat(color),0,3.9,0,1.25,.5);for(let i=0;i<5;i++)ball(g,dark,Math.cos(i*TAU/5)*.55,4.17,Math.sin(i*TAU/5)*.55,.085,.02,.085);for(const sx of [-.35,.35])ball(g,dark,sx,2.1,1.05,.12);const text=label(name,3.4);text.position.set(0,1,1.3);g.add(text);return g;}
shaker(-24,-18,'#6d6455','PEPPER');shaker(24,-17,'#ece5d5','SALT');shaker(25,-5,'#d39548','CINNAMON');
for(let i=0;i<11;i++){const g=group(Math.cos(i*2)*85,2+rand()*14,Math.sin(i*2)*85);for(let j=-1;j<=1;j++)ball(g,cream,j*3,0,0,4,1.6,2.7);}
function arch(p,text,color){const g=group(p.x,0,p.z);box(g,cream,-3,2.4,0,.32,4.8,.32);box(g,cream,3,2.4,0,.32,4.8,.32);box(g,color,0,4.65,0,6.6,.8,.55);for(let i=0;i<10;i++)box(g,i%2?dark:cream,-2.8+i*.62,4.65,.29,.6,.65,.04);const s=label(text,6);s.position.y=5.7;g.add(s);return g;}
arch(START,'RACE SQUEEZE',red);arch(FINISH,'THE GOLDEN FINISH',mustard);
const startRing=group(START.x,0,START.z);ring(startRing,2.5,.06,'#ffe6a2');
const finishRing=group(FINISH.x,0,FINISH.z);ring(finishRing,2.5,.06,'#ffe6a2');
const trophy=group(23,0,-27);cylinder(trophy,bbq,0,.5,0,1.6,1);cylinder(trophy,gold,0,1.3,0,.35,.6);mesh(new THREE.CylinderGeometry(1,.45,1.5,20,1,true),gold,trophy,0,2.3,0);for(const side of [-1,1]){const handle=mesh(new THREE.TorusGeometry(.6,.12,8,24),gold,trophy,side*.9,2.4,0);handle.scale.x=.7;}sign('SQUEEZE CUP',23,4.6,-27,5);
const spiceObjects=SPICES.map((p,i)=>{
 const g=group(p.x,0,p.z),color=mat(p.color);ball(g,color,0,.8,0,.72,.8,.65);cylinder(g,cream,0,1.6,0,.5,.2);for(let j=0;j<4;j++)ball(g,dark,Math.cos(j*TAU/4)*.25,1.72,Math.sin(j*TAU/4)*.25,.04);
 for(const x of [-.23,.23]){ball(g,cream,x,1,.55,.18,.22,.08);ball(g,dark,x,1,.63,.075);}
 ball(g,pink,0,.72,.64,.13,.07,.035);for(const side of [-1,1])ball(g,color,side*.8,.7,0,.22,.13,.13);
 const tag=label(p.name.toUpperCase(),3.3);tag.position.y=2.5;g.add(tag);const halo=ring(g,1.1,.08,'#ffe7a5');return{g,halo,tag};
});
// A giant pickle trampoline and a theatrical, harmless seasoning shower.
const pickle=group(BOUNCE.x,0,BOUNCE.z);ball(pickle,green,0,.4,0,3,.7,2);for(let i=0;i<24;i++){const a=i/24*TAU;ball(pickle,mat('#a7b968'),Math.sin(a)*2.3,.8,Math.cos(a)*1.4,.12,.07,.12);}ring(pickle,3.2,.05,'#f0d485');sign('PICKLE BOING!',BOUNCE.x,3.5,BOUNCE.z,5);
const shower=group(SHOWER.x,0,SHOWER.z);cylinder(shower,green,0,.08,0,2.7,.16);for(const x of [-2.4,2.4])cylinder(shower,cream,x,3.5,0,.13,7);box(shower,cream,0,7,0,5.1,.2,.3);const shakerHead=cylinder(shower,metal,0,6.6,0,1.15,.7);ring(shower,2.7,.18,'#fff0cf');sign('SEASONING SHOWER',SHOWER.x,8,SHOWER.z,6);
// A hands-on sauce lab: six squeeze bottles, an open bowl, a spoon and six fountain arcs.
const lab=group(MIXER.x,0,MIXER.z),labMint=mat('#68c9b5'),labPink=mat('#cd7cad');
box(lab,labMint,0,.35,-.5,8.8,.7,6);cylinder(lab,cream,0,1.2,-.6,1.6,1.6);
mesh(new THREE.CylinderGeometry(3.15,2.2,2,48,1,true),mat('#f7dcbf',{side:THREE.DoubleSide}),lab,0,2.7,-.6);
const bowlRim=mesh(new THREE.TorusGeometry(3.15,.16,10,64),labPink,lab,0,3.7,-.6);bowlRim.rotation.x=Math.PI/2;
const sauceLiquid=mesh(new THREE.CircleGeometry(2.94,64),mat('#fff1cd',{roughness:.3}),lab,0,3.31,-.6);sauceLiquid.rotation.x=-Math.PI/2;
box(lab,labPink,0,4.15,-2.9,9.5,.3,1.1);for(const x of [-4.3,4.3])box(lab,cream,x,2,-2.9,.2,4,.25);
const sauceBottles=SAUCES.map((s,i)=>{
 const g=group((i-2.5)*1.5,4.3,-2.9,lab),m=mat(s.color,{roughness:.32});ball(g,m,0,.75,0,.43,.7,.4);cylinder(g,cream,0,1.3,0,.28,.18);mesh(new THREE.ConeGeometry(.21,.6,16),m,g,0,1.7,0);
 for(const x of [-.13,.13])ball(g,dark,x,.95,.37,.045);ball(g,cream,0,.47,.38,.2,.13,.035);return g;
});
const labSign=label('SAUCE LAB',7,'#fff2d8','#914269');labSign.position.set(0,8.1,-2.9);lab.add(labSign);const labRing=group(MIXER.x,0,MIXER.z+3.8);ring(labRing,1.7,.06,'#b5ead3');
const sauceSwirl=group(0,3.39,-.6,lab),swirlStrands=Array.from({length:4},(_,i)=>{
 const points=[];for(let j=0;j<=44;j++){const u=j/44,a=u*TAU*1.5+i*TAU/4,r=.25+u*2.5;points.push(v(Math.cos(a)*r,i*.015,Math.sin(a)*r));}
 return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),60,.075,6,false),mat(SAUCES[i].color,{roughness:.3}),sauceSwirl);
});
const spoon=group(0,3.7,-.6,lab);box(spoon,cream,1.2,1.1,0,.18,3,.18);ball(spoon,labPink,1.2,-.35,0,.45,.12,.65);
const pourStream=cylinder(lab,mat('#f54c53'),0,0,0,.1,1);pourStream.visible=false;
const sauceFountain=group(0,3.4,-.6,lab),fountainArcs=SAUCES.map((s,i)=>{
 const a=i/6*TAU,curve=new THREE.QuadraticBezierCurve3(v(0,0,0),v(Math.sin(a)*2.7,9,Math.cos(a)*2.7),v(Math.sin(a)*4.8,.2,Math.cos(a)*4.8));
 return mesh(new THREE.TubeGeometry(curve,35,.11,7,false),mat(s.color,{roughness:.25,emissive:s.color,emissiveIntensity:.12}),sauceFountain);
});sauceFountain.visible=false;
const mixBubbles=Array.from({length:14},(_,i)=>{const o=ball(lab,mat(SAUCES[i%6].color,{roughness:.25}),0,0,0,.12+(i%3)*.055);o.visible=false;return o;});
let labParticleTime=0;
// Squeeze: a squishy ketchup bottle with a nozzle, mittens, sneakers and a cheeky face.
const monster=group(),monsterBody=group(0,0,0,monster);ball(monsterBody,red,0,1.9,0,1.45,1.9,1.2);cylinder(monsterBody,cream,0,3.35,0,.75,.35);mesh(new THREE.ConeGeometry(.55,1.3,20),red,monsterBody,0,4.05,0);ball(monsterBody,dark,0,4.68,0,.15,.025,.15);
for(const x of [-.5,.5]){ball(monsterBody,cream,x,2.6,1,.4,.48,.16);ball(monsterBody,dark,x,2.58,1.16,.17,.23,.08);ball(monsterBody,cream,x-.05,2.68,1.23,.05);ball(monsterBody,pink,x*1.5,2.05,1.04,.25,.12,.07);}
ball(monsterBody,dark,0,1.95,1.2,.25,.13,.06);const labelPatch=ball(monsterBody,cream,0,1.25,1.08,.66,.4,.08);const ketchupMark=label('K',1,'#fff1cd','#b83e29');ketchupMark.position.set(0,1.28,1.2);monsterBody.add(ketchupMark);
const monsterArms=[];for(const side of [-1,1]){const arm=group(side*1.3,2.3,0,monsterBody);ball(arm,red,side*.5,-.2,0,.65,.22,.23);ball(arm,red,side*1,-.15,0,.3);monsterArms.push(arm);ball(monsterBody,cream,side*.75,.1,.25,.5,.25,.7);}
const monsterTag=label('SQUEEZE',4.3);monsterTag.position.y=5.4;monster.add(monsterTag);
const targetRing=group();const targetCircle=ring(targetRing,1.65,.08,'#fff2ce',.09);targetRing.visible=false;const ketchupShot=ball(scene,red,0,0,0,.4);
ketchupShot.visible=false;const puddles=new Map();
// A little chef explorer, ready for a ketchup adventure.
const player=group(),body=group(0,0,0,player),skin=mat('#e8b88f'),hair=mat('#6c4535');ball(body,green,0,1,0,.38,.58,.3);const apron=box(body,cream.clone(),0,1,.3,.65,.8,.08);ball(body,skin,0,1.84,0,.39,.42,.36);ball(body,hair,0,2.05,-.08,.4,.22,.3);for(const x of [-.13,.13])ball(body,dark,x,1.88,.34,.035);ball(body,pink,0,1.74,.36,.08,.035,.02);
cylinder(body,cream,0,2.3,0,.4,.3);for(const x of [-.25,0,.25])ball(body,cream,x,2.52,0,.28,.28,.3);
const limbs=[];for(const side of [-1,1]){const leg=group(side*.22,.55,0,body);box(leg,bbq,0,-.2,0,.23,.45,.25);ball(leg,cream,0,-.43,.13,.19,.12,.3);limbs.push(leg);const arm=group(side*.44,1.35,0,body);ball(arm,skin,0,-.25,0,.13,.32,.14);limbs.push(arm);}
const apronSplat=ball(body,red,.1,1.06,.36,.17,.21,.02);apronSplat.visible=false;
const crown=group(0,2.7,0,body);cylinder(crown,gold,0,0,0,.43,.15);for(let i=0;i<5;i++){const a=i/5*TAU;mesh(new THREE.ConeGeometry(.12,.3,6),gold,crown,Math.sin(a)*.35,.16,Math.cos(a)*.35);}crown.visible=false;
// The recovery lap is outside the world; a french fry catches the explorer.
const fry=group(0,-.2,0,player);box(fry,mustard,0,0,0,1.15,.35,3.6);box(fry,gold,0,.2,0,1.05,.06,3.45);for(const side of [-1,1]){const wing=box(fry,cream,side*1.2,.12,0,1.5,.12,.9);wing.rotation.z=side*.2;}fry.visible=false;const flightTag=label('YOU',4.7,'#fff2cb','#843c24');flightTag.position.y=4.2;player.add(flightTag);flightTag.visible=false;
const orbitTrack=group();const orbitPoints=[];for(let i=0;i<=160;i++){const a=i/160*TAU;orbitPoints.push(v(50*Math.cos(a),4.1,48*Math.sin(a)));}const orbitCurve=new THREE.CatmullRomCurve3(orbitPoints);mesh(new THREE.TubeGeometry(orbitCurve,160,.16,5,false),basic('#b76c37'),orbitTrack).castShadow=false;
for(let i=0;i<32;i++){const a=i/32*TAU,p=group(50*Math.cos(a),4.1,48*Math.sin(a),orbitTrack);p.rotation.y=-a;box(p,mustard,0,0,0,1.1,.22,.3);if(i%8===0){const gate=mesh(new THREE.TorusGeometry(2.1,.14,8,40),cream,p,0,2.2,0);gate.rotation.y=Math.PI/2;}}
orbitTrack.visible=false;
const flickHand=group();ball(flickHand,red,0,0,0,.9,.75,.5);for(let i=0;i<3;i++)ball(flickHand,red,-.55+i*.48,.8,0,.21,.7,.23);ball(flickHand,red,1,.15,.1,.6,.25,.3);flickHand.visible=false;
const hintDots=ROUTE.map(p=>{const o=mesh(new THREE.OctahedronGeometry(.22),basic('#ffe3a0'),scene,p.x,.3,p.z);o.visible=false;return o;});
const particleGeo=new THREE.OctahedronGeometry(.11),particles=Array.from({length:180},(_,i)=>{const o=mesh(particleGeo,basic(['#ffd260','#a5c376','#f8e2a9','#e9764a'][i%4]));o.castShadow=o.receiveShadow=false;o.visible=false;return{o,life:0,vel:v()};});let particleIndex=0;
function burst(x,y,z,n=35,colors=['#ffd260','#a5c376','#f8e2a9','#e9764a']){for(let i=0;i<(reduced?8:n);i++){const p=particles[particleIndex++%particles.length];p.o.material.color.set(colors[i%colors.length]);p.o.position.set(x,y,z);p.vel.set((rand()-.5)*8,2+rand()*5,(rand()-.5)*8);p.life=1+rand();p.o.visible=true;}}
const state=createState();let yaw=0,pitch=.83,distance=innerWidth<700?34:39,walkPhase=0,sound=false,audio,toastTimer;
const keys=new Set(),pointers=new Map();let joy={x:0,y:0},joyId=null,toolInput=null;
const recovering=()=>['flick','orbit','return'].includes(state.mode);
const paused=()=>document.hidden||$('.world-menu').open||!!$('dialog[open]');
function clearControls(){keys.clear();pointers.clear();joy={x:0,y:0};joyId=null;toolInput=null;$('#stick').style.transform='none';}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4600);}
function tone(f=550){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*1.35,audio.currentTime+.2);g.gain.setValueAtTime(.05,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.4);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.45);}catch{}}
function effects(){
 if(state.event)toast(state.event);
 if(state.effect){
  if(['spice','badge','win','bounce','splat','go'].includes(state.effect))burst(state.x,state.y+2,state.z,state.effect==='win'?90:35);
  if(state.effect==='mix-party')burst(MIXER.x,6,MIXER.z-.6,100,state.mixer.recipe.map(id=>SAUCES.find(s=>s.id===id).color));
  if(state.effect==='shower')for(let i=0;i<5;i++)burst(SHOWER.x+(rand()-.5)*3,6,SHOWER.z+(rand()-.5)*3,18);
  tone(state.effect==='flick'?170:state.effect==='aim'?250:state.effect==='splat'?200:600);
 }
 state.event='';state.effect=null;
}
function interact(){if(paused())return;act(state);if(state.mode==='mixing')clearControls();effects();refreshHud();canvas.focus({preventScroll:true});}
$('#interact').onclick=interact;
for(const button of document.querySelectorAll('[data-sauce]'))button.onclick=()=>{if(paused())return;addSauce(state,button.dataset.sauce);effects();refreshHud();};
$('#brew-sauce').onclick=()=>{if(paused())return;stirSauces(state);effects();refreshHud();};
$('#clear-sauce').onclick=()=>{if(paused())return;clearRecipe(state);effects();refreshHud();};
$('#close-mixer').onclick=()=>{closeMixer(state);clearControls();effects();refreshHud();canvas.focus({preventScroll:true});};
$('#jump').onclick=()=>{if(paused())return;if(state.mode==='orbit'){act(state);effects();refreshHud();}else if(jump(state))tone(300);};
$('#home').onclick=()=>{if(home(state)){clearControls();yaw=0;pitch=.83;}effects();refreshHud();canvas.focus({preventScroll:true});};
$('#leave-race').onclick=()=>{home(state);clearControls();effects();refreshHud();canvas.focus({preventScroll:true});};
$('#sound').onclick=()=>{sound=!sound;$('#sound').setAttribute('aria-pressed',String(sound));$('#sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('#sound').textContent=sound?'♫':'♪';tone();};
$('#help').onclick=()=>{clearControls();$('#help-dialog').showModal();};$('#close-help').onclick=$('#back').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('close',()=>{clearControls();canvas.focus({preventScroll:true});});
$('.world-menu').addEventListener('toggle',()=>{if($('.world-menu').open)clearControls();});addEventListener('blur',clearControls);document.addEventListener('visibilitychange',clearControls);
const keyMap={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};
addEventListener('keydown',e=>{if(paused()||e.target.closest('button,summary,a,input')||e.ctrlKey||e.metaKey||e.altKey)return;const k=keyMap[e.key.toLowerCase()]||e.key.toLowerCase();if(!['w','a','s','d',' ','e'].includes(k))return;e.preventDefault();keys.add(k);if(!e.repeat&&k===' ')jump(state);if(!e.repeat&&k==='e')interact();});
addEventListener('keyup',e=>keys.delete(keyMap[e.key.toLowerCase()]||e.key.toLowerCase()));
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;if(pointers.size===2){const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1],before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);distance=clamp(distance-(after-before)*.06,20,65);}else{yaw-=(e.clientX-old.x)*.006;pitch=clamp(pitch+(e.clientY-old.y)*.004,.4,1.25);}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>pointers.delete(e.pointerId));
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.025,20,65);},{passive:false});
const joystick=$('#joystick');function moveJoy(e){const r=joystick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,len=Math.max(32,Math.hypot(x,y));joy={x:x/len,y:y/len};$('#stick').style.transform=`translate(${joy.x*29}px,${joy.y*29}px)`;}
joystick.addEventListener('pointerdown',e=>{if(paused())return;joyId=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)moveJoy(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,()=>{joyId=null;joy={x:0,y:0};$('#stick').style.transform='none';});
const map=$('#map').getContext('2d');
function drawMap(){
 const point=(x,z)=>[120+x*3.5,120+z*3.5];map.fillStyle='#c56845';map.fillRect(0,0,240,240);map.fillStyle='#74432e';
 WALLS.forEach(b=>{const [x,z]=point(b.x-b.w/2,b.z-b.d/2);map.fillRect(x,z,b.w*3.5,b.d*3.5);});
 if(state.hints&&state.race){map.strokeStyle='#ffe4a0';map.lineWidth=2;map.setLineDash([3,4]);map.beginPath();ROUTE.slice(state.race.checkpoint-1).forEach((p,i)=>{const q=point(p.x,p.z);i?map.lineTo(...q):map.moveTo(...q);});map.stroke();map.setLineDash([]);}
 const dot=(p,r,color)=>{map.fillStyle=color;map.beginPath();map.arc(...point(p.x,p.z),r,0,TAU);map.fill();};
 SPICES.forEach((p,i)=>{if(!state.found.includes(i))dot(p,3,'#f3d58d');});dot(MIXER,4,'#bd8deb');dot(FINISH,5,'#fff0a6');dot(state.monster,4,'#ed4932');dot(state,4.5,'#fff7df');
}
function refreshHud(){
 const near=nearby(state),active=state.mode!=='explore',recovery=recovering();
 $('#zone').textContent=state.mode==='mixing'?'A splash of imagination':state.mode==='orbit'?'A french fry with a flight plan':state.mode==='race'?'The Great Sauce Race':state.y>3?'A little extra air seasoning':'Welcome to the sauce side';
 $('#spice-count').textContent=`✦ ${state.found.length} / 6 spice friends`;$('#badge-count').textContent=`${Object.values(state.badges).filter(Boolean).length} / 3 prizes`;
 for(const [id,earned] of Object.entries(state.badges)){$('#badge-'+id).classList.toggle('found',earned);$('#badge-'+id+' .check').textContent=earned?'✓':'○';}
 const button=$('#interact');button.classList.toggle('ready',!!near);button.disabled=!near||state.mode==='mixing'&&(state.mixer.phase==='stirring'||new Set(state.mixer.recipe).size<2);button.querySelector('strong').textContent=near?.name||'Meet the spice club';button.querySelector('small').textContent=near?.kind==='mixer'?'Six sauces. Your own colorful recipe.':near?.kind==='race'?'A maze, a rival, and one saucy trophy':near?.kind==='orbit'?'Two complete laps unlock your landing':near?.kind==='hint'?'A little help finding the golden exit':'Six little friends are in the maze';
 document.body.classList.toggle('active',active);document.body.classList.toggle('recovering',recovery);$('#home').disabled=recovery;$('#race-panel').hidden=!active||state.mode==='mixing';$('#leave-race').hidden=!['race','countdown'].includes(state.mode);
 $('#jump').disabled=['flick','return','countdown'].includes(state.mode);$('#jump').textContent=state.mode==='orbit'?(state.orbit.cruise?'Ⅱ':'↻'):'↑';$('#jump').setAttribute('aria-label',state.mode==='orbit'?(state.orbit.cruise?'Pause flying':'Fly around the world'):'Jump');
 let title='',detail='',progress=0,eyebrow='THE GREAT SAUCE RACE';
 if(state.mode==='countdown'){title=`Ready… ${Math.ceil(state.race.countdown)}`;detail='Start under the arch. Reach the golden maze exit!';progress=(3-state.race.countdown)/3;}
 if(state.mode==='race'){title=`${Math.max(0,Math.ceil(RACE_FINISH_TIME-state.race.elapsed))}s to beat Squeeze`;detail=state.race.elapsed<RACE_HEAD_START?'One-second head start. RUN!' :'Find the golden exit. Need help? Show the mustard trail.';progress=state.race.checkpoint/(ROUTE.length-1);}
 if(state.mode==='flick'){title='Squeeze wins… FLICK!';detail='A flying french fry is coming to catch you.';progress=state.ride.time/2.3;eyebrow='A VERY SAUCY DETOUR';}
 if(state.mode==='orbit'){const laps=Math.min(2,Math.abs(state.orbit.angle)/TAU);title=`${Math.floor(laps)} / 2 laps · ${Math.floor((laps%1)*100)}%`;detail=state.orbit.cruise?'Flying! Two full laps and you land back home.':'Tap Fly, or hold W / ↑ / the joystick to circle the world.';progress=laps/2;eyebrow='THE FRENCH-FRY FLIGHT CLUB';}
 if(state.mode==='return'){title='Two laps! Home sweet sauce.';detail='Coming in for a soft landing. Your prizes are safe.';progress=1;eyebrow='A LITTLE COMEBACK';}
 const m=state.mixer,mixing=state.mode==='mixing';$('#mix-panel').hidden=!mixing;document.body.classList.toggle('mixing',mixing);
 if(mixing){
  $('#mix-title').textContent=m.phase==='stirring'?'Whirl, swirl, splash…':m.phase==='party'?'A fountain of flavor!':'A splash of imagination.';
  $('#mix-description').textContent=m.phase==='stirring'?'Your sauces are swirling together!':m.recipe.length===4?'Bowl full! Mix it, or empty it to try again.':'Pick 2 different sauces. Up to 4 squirts!';
  $('#mix-count').textContent=`${m.recipe.length} / 4 squirts`;
  $('#mix-slots').innerHTML=Array.from({length:4},(_,i)=>`<i style="background:${m.recipe[i]?SAUCES.find(s=>s.id===m.recipe[i]).color:'transparent'}"></i>`).join('');
  for(const b of document.querySelectorAll('[data-sauce]'))b.disabled=m.phase==='stirring'||m.recipe.length>=4;
  $('#brew-sauce').disabled=m.phase==='stirring'||new Set(m.recipe).size<2;$('#brew-sauce').textContent=m.phase==='stirring'?'Mixing…':'Mix & splash!';$('#clear-sauce').disabled=m.phase==='stirring';
  $('#mix-result').hidden=!m.result;$('#mix-result').textContent=m.result?`${m.result.name} · ${m.batches} ${m.batches===1?'batch':'batches'} made!`:'';
 }
 $('#race-title').textContent=title;$('#race-detail').textContent=detail;$('#race-eyebrow').textContent=eyebrow;$('#race-progress').style.width=`${clamp(progress,0,1)*100}%`;drawMap();
}
const cameraTarget=v(SPAWN.x,1.3,SPAWN.z),clock=new THREE.Clock();let uiTime=0,currentDistance=distance,currentPitch=pitch;
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(.035,clock.getDelta()),isPaused=paused(),sx=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joy.x,sz=(keys.has('s')?1:0)-(keys.has('w')?1:0)+joy.y;
 const input=toolInput||(state.mode==='orbit'?{x:sx,z:sz}:{x:sx*Math.cos(yaw)+sz*Math.sin(yaw),z:-sx*Math.sin(yaw)+sz*Math.cos(yaw)});
 if(!isPaused){tick(state,dt,input);effects();}const t=state.time,recovery=recovering();
 const mixing=state.mode==='mixing',mix=state.mixer,recipeColors=mix.recipe.map(id=>SAUCES.find(s=>s.id===id).color);
 const mixColor=sauceResult(mix.recipe).color;sauceLiquid.material.color.set(mixColor);sauceSwirl.visible=mix.recipe.length>0;
 sauceSwirl.rotation.y=reduced?0:mix.phase==='stirring'?mix.time*8:t*.25;spoon.rotation.y=reduced?0:mix.phase==='stirring'?mix.time*10:t*.3;
 swirlStrands.forEach((o,i)=>o.material.color.set(recipeColors[i%recipeColors.length]||'#fff1cd'));
 sauceBottles.forEach((o,i)=>{const pouring=mix.pour?.id===SAUCES[i].id;o.scale.y=pouring?.82:1;o.rotation.x=pouring?.25:0;});
 pourStream.visible=!!mix.pour&&mixing;
 if(mix.pour){const i=SAUCES.findIndex(s=>s.id===mix.pour.id),from=v((i-2.5)*1.5,5.9,-2.9),to=v(0,3.4,-.6),direction=to.clone().sub(from);pourStream.position.copy(from.clone().add(to).multiplyScalar(.5));pourStream.scale.set(.1,direction.length(),.1);pourStream.quaternion.setFromUnitVectors(v(0,1,0),direction.normalize());pourStream.material.color.set(SAUCES[i].color);}
 sauceFountain.visible=mixing&&mix.phase==='party';
 if(sauceFountain.visible){const scale=reduced?.7:Math.min(1,mix.time*3,(5-mix.time)*2);sauceFountain.scale.setScalar(Math.max(.01,scale));fountainArcs.forEach((o,i)=>{o.material.color.set(recipeColors[i%recipeColors.length]);o.material.emissive.copy(o.material.color);});if(!isPaused&&!reduced&&(labParticleTime+=dt)>.14){labParticleTime=0;burst(MIXER.x,7,MIXER.z-.6,10,recipeColors);}}
 mixBubbles.forEach((o,i)=>{o.visible=mixing&&mix.recipe.length>0;const a=i/14*TAU+t*(mix.phase==='stirring'?3:.5);o.position.set(Math.sin(a)*2,3.5+Math.abs(Math.sin(t*3+i))*(mix.phase==='stirring'?1:.2),-.6+Math.cos(a)*2);o.material.color.set(recipeColors[i%recipeColors.length]||'#fff1cd');});
 apron.material.color.set(state.apronColor);
 player.position.set(state.x,state.y,state.z);player.rotation.set(0,state.yaw,state.mode==='flick'&&!reduced?Math.sin(state.ride.time*5)*.6:0);player.scale.setScalar(recovery?2:1);fry.visible=recovery;flightTag.visible=recovery;apronSplat.visible=state.stain>0;crown.visible=state.badges.spices;
 const moving=!isPaused&&!recovery&&state.mode!=='countdown'&&!mixing&&Math.hypot(input.x,input.z)>.1;if(moving)walkPhase+=dt*11;limbs.forEach((l,i)=>l.rotation.x=moving?Math.sin(walkPhase+(i<2?0:Math.PI))*.5:0);if(recovery)limbs.forEach((l,i)=>{l.rotation.x=i%2?-.7:0;});
 const m=state.monster;monster.position.set(m.x,reduced?0:Math.sin(t*3)*.07,m.z);monster.rotation.y=m.yaw;monsterBody.scale.set(1,m.shot?1+Math.sin(m.shot.age*12)*.05:1,1);monsterArms.forEach((a,i)=>a.rotation.z=state.mode==='flick'?(i?-.9:1.5):reduced?0:Math.sin(t*(state.mode==='race'?6:2)+i)*.16);
 targetRing.visible=!!m.shot;ketchupShot.visible=!!m.shot&&m.shot.age>=.65;
 if(m.shot){targetRing.position.set(m.shot.target.x,0,m.shot.target.z);targetCircle.scale.setScalar(.9+Math.sin(t*12)*.1);const p=shotPosition(m.shot);ketchupShot.position.set(p.x,p.y,p.z);}
 for(const p of state.splats){let o=puddles.get(p.id);if(!o){o=ball(scene,red,p.x,.025,p.z,1.3,.035,1.1);o.castShadow=o.receiveShadow=false;puddles.set(p.id,o);}o.scale.y=Math.max(.004,p.life/3*.035);}
 for(const [id,o] of puddles)if(!state.splats.some(p=>p.id===id)){o.removeFromParent();puddles.delete(id);}
 $('#splat-overlay').style.opacity=String(Math.min(.24,state.stain*.12));
 spiceObjects.forEach(({g,halo,tag},i)=>{const found=state.found.includes(i);g.position.y=reduced?0:Math.sin(t*2+i)*.12;g.rotation.y=Math.sin(t*.5+i)*.3;g.scale.setScalar(found?.6:1);halo.visible=!found;tag.visible=!found&&dist(state,SPICES[i])<15;});
 pickle.scale.y=1+(reduced?0:Math.sin(t*2)*.06);shakerHead.rotation.z=reduced?0:state.showerCooldown>0?Math.sin(t*15)*.2:0;
 hintDots.forEach((o,i)=>{o.visible=state.hints&&!!state.race&&i>=state.race.checkpoint;o.position.y=.3+(reduced?0:Math.sin(t*3-i)*.12);});
 orbitTrack.visible=recovery;flickHand.visible=state.mode==='flick'&&state.ride.time<1;
 if(flickHand.visible){const start=state.ride.start;flickHand.position.set(start.x-2,start.y+1.2,start.z);flickHand.rotation.z=-1+state.ride.time*2.8;}
 trophy.rotation.y=reduced?0:Math.sin(t*.7)*.1;
 if(!isPaused)for(const p of particles)if(p.life>0){p.life-=dt;p.vel.y-=5*dt;p.o.position.addScaledVector(p.vel,dt);p.o.rotation.y+=dt*3;p.o.visible=p.life>0;}
 const wanted=recovery?v(0,2,0):mixing?v(MIXER.x,3.5,MIXER.z-1):v(state.x-Math.sin(yaw)*2.5,state.y+1.1,state.z-Math.cos(yaw)*2.5);
 cameraTarget.lerp(wanted,1-Math.exp(-dt*4));const desiredDistance=recovery?Math.max(125,116/(2*Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect))):mixing?29:distance;scene.fog.near=recovery?200:105;scene.fog.far=recovery?500:240;currentDistance+=(desiredDistance-currentDistance)*(1-Math.exp(-dt*3));currentPitch+=((recovery?1.05:mixing?.83:pitch)-currentPitch)*(1-Math.exp(-dt*3));
 camera.position.copy(cameraTarget).add(v(Math.sin(yaw)*Math.cos(currentPitch)*currentDistance,Math.sin(currentPitch)*currentDistance,Math.cos(yaw)*Math.cos(currentPitch)*currentDistance));camera.lookAt(cameraTarget);roofMat.opacity=camera.position.y>14?.075:.65;
 if((uiTime+=dt)>.1){uiTime=0;refreshHud();}renderer.render(scene,camera);
}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?57:45;camera.updateProjectionMatrix();});
const readState=()=>({player:{x:state.x,y:state.y,z:state.z},mode:state.mode,time:state.time,mixer:state.mixer,apronColor:state.apronColor,nearby:nearby(state),race:state.race,orbit:state.orbit,ride:state.ride,monster:state.monster,spices:state.found,badges:state.badges,squirts:state.squirts,wins:state.wins,losses:state.losses,paused:paused(),landmarks:{start:START,finish:FINISH,shower:SHOWER,pickle:BOUNCE,sauceLab:MIXER,spices:SPICES},maze:{walls:WALLS,route:state.hints?ROUTE:undefined}});
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController(),register=t=>{try{Promise.resolve(document.modelContext.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_spice_world',description:'Read Spice World, the explorer, Squeeze, maze race, spice friends, sauce lab recipes and two-lap flight. Maze route is visible only after enabling the normal mustard trail.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:readState});
 register({name:'walk_spice_world',description:'Use ordinary walking controls along world axes for 0.1 to 3 seconds. In flight, negative z advances the orbit and positive z reverses. No teleporting or skipping race checkpoints.',inputSchema:{type:'object',properties:{x:{type:'number',minimum:-1,maximum:1},z:{type:'number',minimum:-1,maximum:1},seconds:{type:'number',minimum:.1,maximum:3},jump:{type:'boolean'}},required:['x','z','seconds'],additionalProperties:false},annotations:{readOnlyHint:false},async execute(a){if(paused()||![a.x,a.z,a.seconds].every(Number.isFinite)||Math.abs(a.x)>1||Math.abs(a.z)>1||a.seconds<.1||a.seconds>3)throw new Error('Close menus and use valid movement controls.');if(a.jump)jump(state);toolInput={x:a.x,z:a.z};try{await new Promise(r=>setTimeout(r,a.seconds*1000));}finally{toolInput=null;}return readState();}});
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
refreshHud();animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),600);
