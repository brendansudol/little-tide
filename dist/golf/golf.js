import * as THREE from '../vendor/three.module.js';
import { HOLES, MILL, START, nextHole, tubePoints, createState, tickState, enterHole, canEnter } from './course.js';
const $=s=>document.querySelector(s), canvas=$('#world');
const scene=new THREE.Scene();scene.background=new THREE.Color('#b9ddce');scene.fog=new THREE.FogExp2('#b9ddce',.009);
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true}); }
catch(error){$('#loading').innerHTML='<p>This little course needs WebGL.<br>Try a browser with hardware acceleration enabled.</p>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.07;
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,220);
scene.add(new THREE.HemisphereLight('#fff6dd','#6e9e8a',2.25));
const sunlight=new THREE.DirectionalLight('#fff0cc',2.7);sunlight.position.set(-24,43,28);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);Object.assign(sunlight.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:110});sunlight.shadow.normalBias=.04;scene.add(sunlight);
const surface=new THREE.Group(), underground=new THREE.Group();scene.add(surface,underground);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...extra});
const cream=mat('#fff3ce'),dark=mat('#255e50'),coral=mat('#ed8a70'),gold=mat('#f4cd67'),wood=mat('#c69061'),water=mat('#74c8cb',{roughness:.18,metalness:.1}),stone=mat('#bbc3ab');
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function ball(parent,m,x,y,z,sx,sy=sx,sz=sx){const o=mesh(new THREE.SphereGeometry(1,12,9),m,parent,x,y,z);o.scale.set(sx,sy,sz);return o;}
function line(points,color,parent){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));parent.add(o);return o;}
function tube(curve,radius,material,parent,segments=80){return mesh(new THREE.TubeGeometry(curve,segments,radius,10,false),material,parent);}
function cylinder(a,b,r,material,parent){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),material,parent);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
let seed=203;function random(){seed=seed*16807%2147483647;return(seed-1)/2147483646;}const range=(a,b)=>a+random()*(b-a);
function ellipseShape(cx,cz,rx,rz,holes=[]){const s=new THREE.Shape();s.absellipse(cx,-cz,rx,rz,0,Math.PI*2,false,0);for(const h of holes){const p=new THREE.Path();p.absarc(h.x,-h.z,.98,0,Math.PI*2,true);s.holes.push(p);}return s;}
function topShape(shape,material,y=0){const g=new THREE.ShapeGeometry(shape,64);g.rotateX(-Math.PI/2);return mesh(g,material,surface,0,y,0);}
// A tiny elevated island, with six actual openings cut into its playing surface.
const islandShape=ellipseShape(0,0,31,27,HOLES);
const turf=mat('#87b66f');topShape(islandShape,turf,.015);
const baseGeo=new THREE.ExtrudeGeometry(islandShape,{depth:5.7,bevelEnabled:false,curveSegments:64});baseGeo.rotateX(-Math.PI/2);
mesh(baseGeo,mat('#c79268'),surface,0,-5.8,0);
const islandRim=new THREE.CatmullRomCurve3(Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2;return new THREE.Vector3(Math.cos(a)*31,.01,Math.sin(a)*27);}));tube(islandRim,.15,cream,surface,192);
const groundShadow=mesh(new THREE.CircleGeometry(34,64),mat('#87b9a7'),scene,0,-6.2,0);groundShadow.rotation.x=-Math.PI/2;groundShadow.scale.y=.89;
const tubeCurves=HOLES.map((_,i)=>new THREE.CatmullRomCurve3(tubePoints(i).map(p=>new THREE.Vector3(...p))));
const tubeSkins=[], tubeRings=[], flags=[];
function labelTexture(text,color='#245d4f',bg=null,size=100){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,256,128);}ctx.fillStyle=color;ctx.font=`700 ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,69);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function sign(text,x,y,z,width=2.4,color='#245d4f',bg='#fff3cf'){return mesh(new THREE.PlaneGeometry(width,width/2),new THREE.MeshBasicMaterial({map:labelTexture(text,color,bg,text.length>3?36:90),transparent:true,side:THREE.DoubleSide}),surface,x,y,z);}
for(let i=0;i<HOLES.length;i++){
  const h=HOLES[i],colorMat=mat(h.color),green=mat(i%2?'#a7cb7a':'#b8d88b');
  topShape(ellipseShape(h.x,h.z+1.05,4.6,6,[h]),green,.055);
  const boundary=new THREE.CatmullRomCurve3(Array.from({length:65},(_,j)=>{const a=j/64*Math.PI*2;return new THREE.Vector3(h.x+Math.cos(a)*4.6,.12,h.z+1.05+Math.sin(a)*6);}));tube(boundary,.1,cream,surface,100);
  const lip=mesh(new THREE.TorusGeometry(1.05,.105,10,40),colorMat,surface,h.x,.09,h.z);lip.rotation.x=Math.PI/2;
  const inside=mesh(new THREE.CylinderGeometry(.94,.94,1.8,32,1,true),mat('#264e4c',{side:THREE.DoubleSide}),underground,h.x,-.85,h.z);
  const cupBottom=mesh(new THREE.CircleGeometry(.94,32),new THREE.MeshBasicMaterial({color:'#173f42',side:THREE.DoubleSide}),surface,h.x,-1.7,h.z);cupBottom.rotation.x=-Math.PI/2;
  mesh(new THREE.CylinderGeometry(.045,.045,3.6,8),cream,surface,h.x+1.5,1.8,h.z-.2);
  const flag=sign(String(h.id),h.x+2.07,3.07,h.z-.2,1.12,'#fff8df',h.color);flags.push(flag);
  const painted=sign(String(h.id).padStart(2,'0'),h.x,.082,h.z+3,2.5,'#477452',null);painted.rotation.x=-Math.PI/2;
  const skin=new THREE.MeshStandardMaterial({color:h.color,transparent:true,opacity:.25,roughness:.2,metalness:.1,side:THREE.DoubleSide,depthWrite:false});
  const pipe=tube(tubeCurves[i],.97,skin,underground,110);pipe.castShadow=false;tubeSkins.push(skin);
  for(let j=0;j<=22;j++){const t=j/22,p=tubeCurves[i].getPointAt(t),tangent=tubeCurves[i].getTangentAt(t);const ring=mesh(new THREE.TorusGeometry(.98,.055,6,22),colorMat,underground);ring.position.copy(p);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tangent);ring.castShadow=false;tubeRings.push(ring);}
  // Tee blocks, a golf ball, and a tiny curved obstacle on each green.
  mesh(new THREE.BoxGeometry(.55,.19,.27),colorMat,surface,h.x-1,.17,h.z+4.1);mesh(new THREE.BoxGeometry(.55,.19,.27),colorMat,surface,h.x+1,.17,h.z+4.1);
}
// Paths are short stepping stones so all six greens remain freely walkable.
for(let i=0;i<HOLES.length;i++){const a=HOLES[i],b=HOLES[nextHole(i)];for(let j=1;j<8;j++){const t=j/8,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);if(HOLES.some(h=>Math.hypot(x-h.x,z-h.z)<5.6))continue;const p=mesh(new THREE.CylinderGeometry(.52,.57,.09,8),cream,surface,x,.07,z);p.rotation.y=range(0,3);}}
// Four oversized irons spin grip-first around the hub, with their offset heads at the tips.
const mill=new THREE.Group();mill.position.set(MILL.x,0,MILL.z-1.1);surface.add(mill);
mesh(new THREE.CylinderGeometry(.85,1.4,3.7,10),cream,mill,0,1.85,0);mesh(new THREE.ConeGeometry(1.6,1.6,10),coral,mill,0,4.35,0);mesh(new THREE.BoxGeometry(.6,1.1,.08),dark,mill,0,.57,1.17);
const rotor=new THREE.Group();rotor.position.set(MILL.x,MILL.hubY,MILL.z);surface.add(rotor);
const clubMetal=mat('#dbe5e5',{metalness:.58,roughness:.24});
const clubEdge=mat('#96abb4',{metalness:.48,roughness:.3});
const clubFace=mat('#ecf0ec',{metalness:.32,roughness:.36});
const clubGrip=mat('#273d42',{roughness:.95});
const gripWrap=mat('#607979',{roughness:.9});
const faceGroove=mat('#546b70',{metalness:.2,roughness:.6});
// Rounded toe, narrow heel and sloping top line: an iron silhouette, not a centered mallet.
const ironOutline=new THREE.Shape();
ironOutline.moveTo(-.1,-.12);
ironOutline.quadraticCurveTo(-.14,-.25,.08,-.31);
ironOutline.lineTo(.95,-.52);
ironOutline.quadraticCurveTo(1.25,-.57,1.32,-.35);
ironOutline.lineTo(1.30,.02);
ironOutline.quadraticCurveTo(1.27,.22,1.04,.23);
ironOutline.quadraticCurveTo(.48,.24,.12,.15);
ironOutline.quadraticCurveTo(-.08,.11,-.1,-.12);
const ironGeometry=new THREE.ExtrudeGeometry(ironOutline,{depth:.16,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:3,curveSegments:14,steps:1});
const ironFaceGeometry=new THREE.ShapeGeometry(ironOutline,14);
for(let i=0;i<4;i++){
  const club=new THREE.Group();club.rotation.z=i*Math.PI/2;rotor.add(club);
  // Long, tapered chrome shaft and a dark rubber grip with spiral wrap and end cap.
  mesh(new THREE.CylinderGeometry(.047,.068,2.63,12),clubMetal,club,0,1.48,0);
  mesh(new THREE.CylinderGeometry(.092,.115,.88,12),clubGrip,club,0,.66,0);
  mesh(new THREE.CylinderGeometry(.123,.123,.055,12),cream,club,0,.205,0);
  mesh(new THREE.CylinderGeometry(.098,.098,.06,12),coral,club,0,1.08,0);
  const wrap=[];
  for(let j=0;j<=160;j++){const t=j/160,a=t*Math.PI*16,r=.113-t*.02;wrap.push(new THREE.Vector3(Math.cos(a)*r,.25+t*.8,Math.sin(a)*r));}
  tube(new THREE.CatmullRomCurve3(wrap),.01,gripWrap,club,160);
  // The bent hosel joins the shaft to the heel, leaving almost all of the blade on one side.
  const hosel=new THREE.CatmullRomCurve3([new THREE.Vector3(0,2.47,0),new THREE.Vector3(-.025,2.64,.005),new THREE.Vector3(.055,2.82,.035),new THREE.Vector3(.15,2.93,.07)]);
  tube(hosel,.072,clubMetal,club,18);
  mesh(new THREE.CylinderGeometry(.073,.073,.14,12),clubGrip,club,0,2.49,0);
  const iron=new THREE.Group();iron.position.set(0,MILL.radius,0);iron.rotation.x=-.2;club.add(iron);
  mesh(ironGeometry,clubEdge,iron);
  mesh(ironFaceGeometry,clubFace,iron,0,0,.211);
  // Parallel score lines on the lofted striking face stay legible while the iron spins.
  for(let row=0;row<5;row++){
    const y=-.31+row*.095;
    mesh(new THREE.BoxGeometry(.83,.018,.009),faceGroove,iron,.73,y,.219);
  }
  // A recessed back and thin raised sole make the club recognizable from behind, too.
  const back=mesh(ironFaceGeometry,clubMetal,iron,.035,-.035,-.052);back.rotation.y=Math.PI;
  back.scale.set(-.82,.75,1);
  mesh(new THREE.BoxGeometry(.65,.13,.035),dark,iron,.72,-.13,-.071);
  mesh(new THREE.BoxGeometry(.36,.026,.008),cream,iron,.72,-.13,-.092);
}
ball(rotor,gold,0,0,.25,.31,.31,.2);
const launchMark=mesh(new THREE.CircleGeometry(1.15,36),coral,surface,MILL.x,.12,MILL.z);launchMark.rotation.x=-Math.PI/2;
const launchArrow=sign('STAND HERE',MILL.x,.14,MILL.z+.35,2.15,'#fff4d4',null);launchArrow.rotation.x=-Math.PI/2;
sign('FORE!',MILL.x+2.8,1.7,MILL.z+1,2,'#245d4f','#ffdb75');mesh(new THREE.CylinderGeometry(.06,.06,1.7,7),wood,surface,MILL.x+2.8,.85,MILL.z+1);
// A rainbow arch at hole 3, a duck pond at hole 4, and small friendly spectators.
for(let i=0;i<4;i++){const points=[];for(let j=0;j<=40;j++){const a=j/40*Math.PI;points.push(new THREE.Vector3(Math.cos(a)*(2.6+i*.25),Math.sin(a)*(2.6+i*.25),0));}const arch=tube(new THREE.CatmullRomCurve3(points),.13,mat(['#ea8a77','#f0cb69','#91cbb1','#b899d4'][i]),surface,60);arch.position.set(0,.08,-13.1);}
const pond=mesh(new THREE.CylinderGeometry(2.35,2.5,.15,40),water,surface,21,.13,-7);pond.scale.z=1.3;
const ducks=[];function duck(x,z,s=1){const g=new THREE.Group();surface.add(g);g.position.set(x,.32,z);g.scale.setScalar(s);ball(g,gold,0,.18,0,.36,.27,.48);ball(g,gold,0,.55,.27,.23);ball(g,coral,0,.51,.53,.15,.06,.15);ball(g,dark,-.14,.62,.4,.025);ball(g,dark,.14,.62,.4,.025);ducks.push(g);}duck(21,-7);duck(22,-6,.6);duck(20.8,-5.6,.5);
const blockers=[];
function tree(x,z,s){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);surface.add(g);mesh(new THREE.CylinderGeometry(.15,.2,1.7,7),wood,g,0,.85,0);ball(g,mat('#5e9979'),0,2.1,0,1,1.35,1);ball(g,mat('#7bae78'),.35,2.7,.1,.8,.85,.8);blockers.push({x,z,r:s*.35});}
[[-24,9,1.3],[-24,-10,1],[-19,-18,1.4],[-7,-23,1.2],[8,-22,1.1],[24,7,1.1],[23,15,1],[-21,20,.9],[7,22,1]].forEach(p=>tree(...p));
const golfBalls=[];
for(let i=0;i<HOLES.length;i++){const h=HOLES[i];const b=ball(surface,cream,h.x+.4,.3,h.z+3.3,.23);golfBalls.push({mesh:b,x:b.position.x,z:b.position.z,vx:0,vz:0,homeX:b.position.x,homeZ:b.position.z});}
function buddy(x,z,color){const g=new THREE.Group();g.position.set(x,.15,z);surface.add(g);const m=mat(color);ball(g,m,0,.6,0,.57);for(const side of [-1,1]){ball(g,dark,side*.15,.72,.51,.048);ball(g,cream,side*.27,.08,.08,.17,.09,.25);ball(g,m,side*.62,.48,.02,.12,.24,.12);}line([[-.1,.48,.56],[0,.44,.58],[.1,.48,.56]],'#285e50',g);return g;}
const buddies=[buddy(-18,13,'#fff3cd'),buddy(12,-12,'#f1ad97'),buddy(12,18,'#ffdc74')];
const springPads=[];for(const [x,z] of [[-8,-5],[6,9]]){const p=mesh(new THREE.CylinderGeometry(.9,1,.3,24),gold,surface,x,.2,z);springPads.push(p);const mark=sign('↑',x,.36,z,1,'#467653',null);mark.rotation.x=-Math.PI/2;}
// Benches, mushrooms, flowers and bunting around the little park.
for(const [x,z] of [[-7,19],[23,-1]]){mesh(new THREE.BoxGeometry(2.3,.17,.65),wood,surface,x,.65,z);mesh(new THREE.BoxGeometry(2.3,.55,.12),wood,surface,x,1,z-.3);for(const d of [-.8,.8])mesh(new THREE.BoxGeometry(.13,.7,.5),dark,surface,x+d,.3,z);}
for(let i=0;i<38;i++){const a=range(0,Math.PI*2),r=range(.87,.97),x=Math.cos(a)*29*r,z=Math.sin(a)*25*r;const color=i%2?coral:gold;mesh(new THREE.CylinderGeometry(.04,.04,.45,5),dark,surface,x,.22,z);for(let p=0;p<5;p++)ball(surface,color,x+Math.cos(p*1.256)*.13,.47,z+Math.sin(p*1.256)*.13,.095,.04,.095);ball(surface,cream,x,.49,z,.06);}
for(const [x,z] of [[-20,5],[8,-16],[18,19]]){mesh(new THREE.CylinderGeometry(.15,.22,.55,8),cream,surface,x,.3,z);ball(surface,coral,x,.65,z,.55,.25,.55);for(let i=0;i<5;i++)ball(surface,cream,x+Math.cos(i*1.25)*.3,.83,z+Math.sin(i*1.25)*.3,.055,.02,.055);}
for(const x of [-18,-8])mesh(new THREE.CylinderGeometry(.06,.06,3.4,8),wood,surface,x,1.7,20);const buntingPts=[];for(let i=0;i<=30;i++){const t=i/30;buntingPts.push([-18+t*10,3.3-Math.sin(t*Math.PI)*.55,20]);}line(buntingPts,'#fff2c9',surface);for(let i=0;i<9;i++){const t=(i+.5)/9,x=-18+t*10,y=3.3-Math.sin(t*Math.PI)*.55;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.35,0,0,.35,0,0,0,-.55,0],3));geo.computeVertexNormals();mesh(geo,mat(HOLES[i%6].color,{side:THREE.DoubleSide}),surface,x,y,20);}

const skin=mat('#d99563'),shirt=mat('#f1a255'),shorts=mat('#3b8f96'),hair=mat('#48382d'),eye=mat('#243f43');
// The boy: articulated arms and legs, soft rounded forms, and a little wind-swept fringe.
const boy=new THREE.Group();scene.add(boy);boy.position.set(START.x,.08,START.z);const body=new THREE.Group();boy.add(body);
mesh(new THREE.CylinderGeometry(.26,.29,.58,8),shirt,body,0,.92,0);ball(body,skin,0,1.53,0,.31,.35,.29);ball(body,hair,0,1.75,-.045,.325,.2,.3);ball(body,hair,-.14,1.76,.2,.2,.13,.1);ball(body,hair,.1,1.78,.19,.18,.11,.11);ball(body,skin,-.31,1.5,0,.067,.09,.065);ball(body,skin,.31,1.5,0,.067,.09,.065);ball(body,eye,-.105,1.55,.27,.025,.035,.018);ball(body,eye,.105,1.55,.27,.025,.035,.018);ball(body,skin,0,1.47,.291,.047,.044,.06);line([[-.055,1.4,.267],[0,1.39,.28],[.055,1.4,.267]],'#8f4a34',body);
const limbs={};for(const side of [-1,1]){let arm=new THREE.Group();arm.position.set(side*.32,1.13,0);body.add(arm);mesh(new THREE.CylinderGeometry(.105,.10,.22,8),shirt,arm,side*.02,-.07,0);mesh(new THREE.CylinderGeometry(.078,.085,.34,8),skin,arm,side*.035,-.30,0);ball(arm,skin,side*.035,-.47,0,.087);limbs[side===-1?'leftArm':'rightArm']=arm;let leg=new THREE.Group();leg.position.set(side*.15,.65,0);body.add(leg);mesh(new THREE.CylinderGeometry(.13,.125,.26,8),shorts,leg,0,-.1,0);mesh(new THREE.CylinderGeometry(.075,.09,.30,8),skin,leg,0,-.35,0);ball(leg,skin,0,-.53,.055,.1,.075,.17);limbs[side===-1?'leftLeg':'rightLeg']=leg;}
// Clone only the surface materials so the underground tubes stay bright in cutaway view.
const fading=[];surface.traverse(o=>{if(o.material&&!Array.isArray(o.material)){o.material=o.material.clone();fading.push({object:o,material:o.material,opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite});}});
let state=createState(),yaw=.17,pitch=.69,distance=32,overview=false,joy={x:0,y:0},joystickPointer=null,nearest=null,toastTimer,activeWalk=false;
const keys=new Set(),pointers=new Map();let pinchDistance=0,lastX=0,lastY=0,drag=false,cutaway=0,bounceCooldown=0,allVisited=false;
const confetti=[],confettiGeo=new THREE.BoxGeometry(.08,.13,.04),confettiMats=HOLES.map(h=>mat(h.color));
function celebrate(x,z){for(let i=0;i<36;i++){const m=mesh(confettiGeo,confettiMats[i%6],scene,x,.8,z);m.castShadow=false;confetti.push({mesh:m,v:new THREE.Vector3(range(-3,3),range(3,7),range(-3,3)),life:2.2});}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3800);}
function jump(){if(state.mode==='walk'&&state.jumpY===0)state.jumpV=5;}
function resetControls(){keys.clear();joy={x:0,y:0};pointers.clear();drag=false;joystickPointer=null;$('#stick').style.transform='none';}
function setOverview(){overview=!overview;$('#overview').setAttribute('aria-label',overview?'Follow the avatar':'Show the whole course');$('#overview').setAttribute('aria-pressed',String(overview));}
function nearbyHole(){let result=null,best=2.8;for(let i=0;i<HOLES.length;i++){const h=HOLES[i],d=Math.hypot(h.x-state.x,h.z-state.z);if(d<best){result=i;best=d;}}return result;}
function interact(){if(state.mode!=='walk')return;const i=nearbyHole();if(i!==null&&canEnter(state,i)){enterHole(state,i);resetControls();return;}jump();}
function home(){const visited=state.visited,rides=state.rides,launches=state.launches;state=createState();Object.assign(state,{visited,rides,launches});resetControls();overview=false;body.rotation.set(0,0,0);toast('Back at the first tee. Another round?');}
$('#interact').onclick=interact;$('#jump').onclick=jump;$('#home').onclick=home;$('#overview').onclick=setOverview;
$('#help').onclick=()=>{resetControls();$('#help-dialog').showModal();};$('#close-help').onclick=$('#back').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog'))$('#help-dialog').close();});
addEventListener('keydown',e=>{if($('#help-dialog').open||e.target.closest?.('summary,nav,a'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(!e.repeat){if(e.code==='Space')jump();if(e.key.toLowerCase()==='e')interact();if(e.key.toLowerCase()==='m')setOverview();}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',resetControls);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetControls();});
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);distance=THREE.MathUtils.clamp(distance-(d-pinchDistance)*.06,12,48);pinchDistance=d;}else{yaw-=(e.clientX-lastX)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.003,.3,1.2);}lastX=e.clientX;lastY=e.clientY;});
function release(e){pointers.delete(e.pointerId);const p=[...pointers.values()][0];drag=!!p;if(p){lastX=p.x;lastY=p.y;}}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.025,12,48);},{passive:false});
const joystick=$('#joystick');function moveJoy(e){const r=joystick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.max(32,Math.hypot(x,y));joy={x:x/l,y:y/l};$('#stick').style.transform=`translate(${joy.x*29}px,${joy.y*29}px)`;}
joystick.addEventListener('pointerdown',e=>{joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);});joystick.addEventListener('pointermove',e=>{if(joystickPointer===e.pointerId)moveJoy(e);});function endJoy(){joystickPointer=null;joy={x:0,y:0};$('#stick').style.transform='none';}joystick.addEventListener('pointerup',endJoy);joystick.addEventListener('pointercancel',endJoy);
const map=$('#map'),ctx=map.getContext('2d');function drawMap(){ctx.clearRect(0,0,240,240);ctx.fillStyle='#91b89a';ctx.fillRect(0,0,240,240);ctx.fillStyle='#d8e6b7';ctx.beginPath();ctx.ellipse(120,120,112,102,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7eaa80';ctx.lineWidth=2;ctx.setLineDash([3,4]);ctx.beginPath();HOLES.forEach((h,i)=>{const x=120+h.x*3.35,z=120+h.z*3.35;i?ctx.lineTo(x,z):ctx.moveTo(x,z);});ctx.closePath();ctx.stroke();ctx.setLineDash([]);for(const h of HOLES){ctx.fillStyle=state.visited.has(h.id)?'#286650':'#fbf3d9';ctx.beginPath();ctx.arc(120+h.x*3.35,120+h.z*3.35,10,0,7);ctx.fill();ctx.fillStyle=state.visited.has(h.id)?'#fff6d9':'#35694f';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(h.id,120+h.x*3.35,120+h.z*3.35);}ctx.fillStyle='#df8965';ctx.fillRect(111,111,10,10);ctx.fillStyle='#faad46';ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(120+state.x*3.35,120+state.z*3.35,5.5,0,7);ctx.fill();ctx.stroke();}
function updateUI(){nearest=nearbyHole();const closest=HOLES.reduce((a,h)=>Math.hypot(h.x-state.x,h.z-state.z)<Math.hypot(a.x-state.x,a.z-state.z)?h:a,HOLES[0]);const inSwing=Math.hypot(state.x-MILL.x,state.z-MILL.z)<3;
  $('#zone').textContent=state.mode==='tube'?'Underground express':state.mode==='flight'?'Airborne!':inSwing?'The club windmill':`${String(closest.id).padStart(2,'0')} · ${closest.name}`;
  $('#visit-count').textContent=`${state.visited.size} / 6`;document.querySelectorAll('[data-hole]').forEach(el=>el.classList.toggle('visited',state.visited.has(Number(el.dataset.hole))));
  const busy=state.mode!=='walk';document.body.classList.toggle('riding',busy);const action=$('#interact');const ready=nearest!==null&&canEnter(state,nearest);action.disabled=busy;action.classList.toggle('ready',ready);action.querySelector('.action-key').textContent=ready?'E':'↑';
  action.querySelector('strong').textContent=busy?(state.mode==='flight'?'Fore! You’re flying!':'Enjoy the underground express'):ready?`Hole ${HOLES[nearest].id} → Hole ${HOLES[nextHole(nearest)].id}`:inSwing?'Stand on the coral mark':'Take a little wander';
  action.querySelector('small').textContent=busy?'Your next landing is taken care of':ready?'Step into the cup, or press E to ride':inSwing?'Wait for a golf club to swing around':'Step into a hole. Nudge a ball. Try the windmill.';
  if(state.ride){$('#ride-kind').textContent=state.mode==='emerge'?'POPPING BACK UP':'THE UNDERGROUND EXPRESS';$('#ride-route').textContent=`Hole ${String(state.ride.from+1).padStart(2,'0')} → Hole ${String(state.ride.to+1).padStart(2,'0')}`;$('#ride-progress').style.width=(state.mode==='emerge'?100:state.ride.elapsed/state.ride.duration*100)+'%';}
  else if(state.flight){$('#ride-kind').textContent='THE WINDMILL HAS OTHER PLANS';$('#ride-route').textContent='Foooore! Across the course!';$('#ride-progress').style.width=state.flight.elapsed/state.flight.duration*100+'%';}
  if(state.visited.size===6&&!allVisited){allVisited=true;toast('All six holes explored! The course is yours to play in.');celebrate(state.x,state.z);}drawMap();
}
const target=new THREE.Vector3(START.x,.7,START.z-4),desired=new THREE.Vector3(),cameraGoal=new THREE.Vector3(),clock=new THREE.Clock();let uiTime=0;
camera.position.set(START.x+8,24,START.z+24);
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),time=clock.elapsedTime,paused=$('#help-dialog').open;
  rotor.rotation.z=time*MILL.speed;
  let sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,sz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
  if(paused)sx=sz=0;const vx=sx*Math.cos(yaw)+sz*Math.sin(yaw),vz=-sx*Math.sin(yaw)+sz*Math.cos(yaw),moving=Math.hypot(vx,vz)>.05,previousMode=state.mode;
  if(!paused)tickState(state,dt,time,{x:vx,z:vz,run:keys.has('shift')},(i,t)=>tubeCurves[i].getPointAt(t));
  if(previousMode!==state.mode){if(state.mode==='tube'){overview=false;toast(`Whoosh! Hole ${state.ride.from+1} to hole ${state.ride.to+1}.`);}if(state.mode==='flight'){overview=false;resetControls();toast('The golf club says: FOOOOORE!');}if(previousMode==='flight'&&state.mode==='walk'){celebrate(state.x,state.z);toast('A perfect landing on the other side!');}if(previousMode==='emerge'&&state.mode==='walk'){celebrate(state.x,state.z);toast(`Hello, hole ${state.blockedHole+1}! Step out, then back in for another ride.`);}}
  bounceCooldown=Math.max(0,bounceCooldown-dt);
  if(state.mode==='walk'){
    for(const c of blockers){const dx=state.x-c.x,dz=state.z-c.z,d=Math.hypot(dx,dz),r=c.r+.27;if(d<r&&d>.0001){state.x=c.x+dx/d*r;state.z=c.z+dz/d*r;}}
    const spring=springPads.find(p=>Math.hypot(p.position.x-state.x,p.position.z-state.z)<.88);if(spring&&state.jumpY<.1&&bounceCooldown===0){state.jumpV=8.3;state.jumpY=.05;bounceCooldown=1.4;toast('Boing! A little lift for your little tour.');}
  }
  boy.position.set(state.x,state.y,state.z);
  if(state.mode==='tube'){const tangent=tubeCurves[state.ride.from].getTangentAt(Math.min(state.ride.elapsed/state.ride.duration,1));boy.rotation.y=Math.atan2(tangent.x,tangent.z);body.rotation.set(Math.sin(time*5)*.15,0,Math.sin(time*4)*.2);}
  else if(state.mode==='flight'){boy.rotation.y+=dt*2.5;body.rotation.x=state.flight.elapsed*Math.PI*2;body.rotation.z=.2;}
  else {body.rotation.set(0,0,0);if(moving){const a=Math.atan2(vx,vz);boy.rotation.y+=Math.atan2(Math.sin(a-boy.rotation.y),Math.cos(a-boy.rotation.y))*Math.min(1,dt*12);}}
  const step=moving&&state.mode==='walk'?Math.sin(time*(keys.has('shift')?14:10))*.68:Math.sin(time*2)*.03;limbs.leftLeg.rotation.x=step;limbs.rightLeg.rotation.x=-step;limbs.leftArm.rotation.x=-step*.8;limbs.rightArm.rotation.x=step*.8;limbs.leftArm.rotation.z=state.mode!=='walk'||state.jumpY>.6?.9:0;limbs.rightArm.rotation.z=state.mode!=='walk'||state.jumpY>.6?-.9:0;
  const cutawayTarget=state.mode==='tube'?1:0;cutaway+=(cutawayTarget-cutaway)*Math.min(1,dt*5);
  for(const f of fading){const fade=1-cutaway*.94;f.material.opacity=f.opacity*fade;const transparent=cutaway>.002||f.transparent;if(f.material.transparent!==transparent){f.material.transparent=transparent;f.material.needsUpdate=true;}f.material.depthWrite=cutaway>.04?false:f.depthWrite;f.object.castShadow=cutaway<.1;}
  groundShadow.material.color.lerp(new THREE.Color(cutaway>.5?'#366c72':'#87b9a7'),dt*3);
  for(let i=0;i<tubeSkins.length;i++)tubeSkins[i].opacity=state.ride?.from===i?.34:.16;
  buddies.forEach((b,i)=>{b.position.y=.15+Math.abs(Math.sin(time*1.8+i))*.07;b.rotation.z=Math.sin(time*1.6+i)*.07;});ducks.forEach((d,i)=>{d.position.y=.32+Math.sin(time*2+i)*.035;d.rotation.y=Math.sin(time*.4+i)*.45;});flags.forEach((f,i)=>f.rotation.y=Math.sin(time*2+i)*.07);
  for(const b of golfBalls){if(state.mode==='walk'&&moving&&Math.hypot(state.x-b.x,state.z-b.z)<.7&&state.jumpY<.4){const d=Math.hypot(vx,vz)||1;b.vx=vx/d*4;b.vz=vz/d*4;}b.x+=b.vx*dt;b.z+=b.vz*dt;b.vx*=Math.exp(-dt*1.6);b.vz*=Math.exp(-dt*1.6);if((b.x/29)**2+(b.z/25)**2>1){b.vx*=-.8;b.vz*=-.8;b.x*=.98;b.z*=.98;}const h=HOLES.find(h=>Math.hypot(h.x-b.x,h.z-b.z)<.83);if(h){const dest=HOLES[h.id%6];b.x=dest.x;b.z=dest.z+2.3;b.vx=b.vz=0;toast('Even the golf balls take the secret tubes!');}b.mesh.position.set(b.x,.3,b.z);b.mesh.rotation.x+=b.vz*dt;b.mesh.rotation.z-=b.vx*dt;}
  for(let i=confetti.length-1;i>=0;i--){const p=confetti[i];p.life-=dt;p.v.y-=7*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=dt*4;p.mesh.rotation.z+=dt*3;if(p.life<0){scene.remove(p.mesh);confetti.splice(i,1);}}
  if(state.mode==='tube'){desired.set(state.x,state.y+.8,state.z);target.lerp(desired,1-Math.exp(-dt*5));cameraGoal.set(target.x+9,target.y+7,target.z+13);}
  else if(state.mode==='flight'){desired.set(state.x,state.y*.55,state.z);target.lerp(desired,1-Math.exp(-dt*3));cameraGoal.set(target.x+10,target.y+16,target.z+23);}
  else if(overview){desired.set(0,-.5,0);target.lerp(desired,1-Math.exp(-dt*3));const overviewDistance=innerWidth<650?91:73;cameraGoal.set(Math.sin(yaw)*overviewDistance*.62,overviewDistance*.8,Math.cos(yaw)*overviewDistance*.62);}
  else {desired.set(state.x,.7,state.z-3.5);target.lerp(desired,1-Math.exp(-dt*4));cameraGoal.set(target.x+Math.sin(yaw)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*distance*Math.cos(pitch));}
  camera.position.lerp(cameraGoal,1-Math.exp(-dt*3.5));camera.lookAt(target);
  if((uiTime+=dt)>.09){uiTime=0;updateUI();}renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
const readState=()=>({position:{x:+state.x.toFixed(2),y:+state.y.toFixed(2),z:+state.z.toFixed(2)},mode:state.mode,nearbyHole:nearbyHole()===null?null:nearbyHole()+1,visited:[...state.visited],tubeRides:state.rides,windmillLaunches:state.launches,route:state.ride?{from:state.ride.from+1,to:state.ride.to+1}:null});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_impossible_golf_state',description:'Read avatar position, motion mode, visited holes, tube route, and windmill launch count.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:readState});
  register({name:'walk_in_impossible_golf',description:'Walk using the same camera-relative movement as WASD for 0.1 to 3 seconds. Walking into a cup starts its tube ride; an actual windmill-club collision starts a flight.',inputSchema:{type:'object',properties:{direction:{type:'string',enum:['forward','back','left','right']},seconds:{type:'number',minimum:.1,maximum:3}},required:['direction','seconds'],additionalProperties:false},annotations:{readOnlyHint:false},async execute(input){const mapping={forward:'w',back:'s',left:'a',right:'d'};if(!input||!Object.hasOwn(mapping,input.direction)||!Number.isFinite(input.seconds)||input.seconds<.1||input.seconds>3)throw new Error('Choose a direction and 0.1 to 3 seconds.');if($('#help-dialog').open||state.mode!=='walk'||activeWalk)throw new Error('Wait for the current ride or action to finish and close the help panel.');const key=mapping[input.direction];activeWalk=true;keys.add(key);try{await new Promise(resolve=>setTimeout(resolve,input.seconds*1000));}finally{keys.delete(key);activeWalk=false;}return readState();}});
  register({name:'enter_nearby_golf_hole',description:'Enter a hole within 2.8 steps using the same action as E or the ride button. Starts the animated trip to the next hole.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(){const i=nearbyHole();if($('#help-dialog').open||i===null||!canEnter(state,i))throw new Error('Walk close to a hole, finish the current ride, and step away from the exit before riding again.');interact();return readState();}});
  addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),600);
