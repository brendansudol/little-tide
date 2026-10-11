import * as THREE from '../vendor/three.module.js';
import {BOUNDS,HAND,HAND_DURATION,BRIDGE_X,riverZ,inRiver,ground,createState,nearCar,nearHand,interact,jump as jumpPlayer,tick} from './rules.js';
const $=s=>document.querySelector(s),canvas=$('#world');
const scene=new THREE.Scene();scene.background=new THREE.Color('#8da8b3');scene.fog=new THREE.Fog('#8da8b3',75,145);
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch(error){$('#loading').innerHTML='<p>This tissue world needs WebGL.<br>Try a browser with hardware acceleration enabled.</p>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
const camera=new THREE.PerspectiveCamera(innerWidth<700?58:47,innerWidth/innerHeight,.1,180);
scene.add(new THREE.HemisphereLight('#fffcf0','#6c8596',2.1));
const sun=new THREE.DirectionalLight('#fff3dc',2.7);sun.position.set(-24,42,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:1,far:110});sun.shadow.normalBias=.04;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true,...extra});
const ivory=mat('#fdfaf0',{side:THREE.DoubleSide}),white=mat('#ffffff',{side:THREE.DoubleSide}),shadowPaper=mat('#c6d5d8',{side:THREE.DoubleSide}),mint=mat('#abc6bb',{side:THREE.DoubleSide}),blue=mat('#b0d5df',{side:THREE.DoubleSide}),ink=mat('#435b68'),blush=mat('#e7c4b8');
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const sphere=new THREE.SphereGeometry(1,12,8);
function ball(parent,m,x,y,z,sx,sy=sx,sz=sx){const o=mesh(sphere,m,parent,x,y,z);o.scale.set(sx,sy,sz);return o;}
function line(points,color,parent){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));parent.add(o);return o;}
let seed=271;function rand(){seed=seed*16807%2147483647;return(seed-1)/2147483646;}const range=(a,b)=>a+rand()*(b-a);
// Geometry carries the paper texture: thin edges, wrinkles, triangular facets,
// turned-up corners, and soft, matte layers rather than smooth plastic surfaces.
function sheet(w,d,wrinkle=.18,nx=10,nz=10){
 const g=new THREE.PlaneGeometry(w,d,nx,nz);g.rotateX(-Math.PI/2);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),edge=Math.pow(Math.max(Math.abs(x)/(w/2),Math.abs(z)/(d/2)),5);p.setY(i,wrinkle*(Math.sin(x*3.7+z*1.8)*.5+Math.cos(z*4.4-x)*.35+edge*.9));}
 g.computeVertexNormals();return g;
}
function crumple(parent,material,x,y,z,sx,sy=sx,sz=sx){
 const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),r=1+.085*Math.sin(px*19+py*9)*Math.cos(pz*16-py*12);p.setXYZ(i,px*r,py*r,pz*r);}g.computeVertexNormals();const o=mesh(g,material,parent,x,y,z);o.scale.set(sx,sy,sz);return o;
}
const floor=mesh(sheet(58,52,.11,80,72),ivory,scene);floor.receiveShadow=true;
for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(58-i*.18,.13,52-i*.1),i%2?shadowPaper:ivory,scene,0,-.25-i*.16,0);
// Faint quilted seams and overlapping corners make the floor unmistakably tissue.
for(let x=-26;x<=26;x+=6)line([[x,.06,-25],[x+.12,.065,0],[x,.06,25]],'#d7dfdc',scene);
for(let z=-23;z<=23;z+=6)line([[-28,.065,z],[0,.07,z-.1],[28,.065,z]],'#d7dfdc',scene);
for(let i=0;i<22;i++){const x=range(-25,25),z=range(-22,22);if(inRiver(x,z))continue;const patch=mesh(sheet(range(1,2.5),range(1,2),.05,3,3),white,scene,x,.1,z);patch.rotation.y=range(-.4,.4);patch.castShadow=false;}
const walls=[];
for(let side=0;side<4;side++){
 const w=side%2?52:58,h=side===0?4:7,material=ivory.clone();material.transparent=true;
 const g=new THREE.PlaneGeometry(w,h,Math.round(w*1.2),12),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(x*2.1)*.2+Math.cos(x*5+y*3)*.06);if(y>h/2-.05)p.setY(i,y+Math.sin(x*3)*.24+Math.cos(x*8)*.1);}g.computeVertexNormals();
 const panel=mesh(g,material,scene,side===1?28.5:side===3?-28.5:0,h/2-.05,side===0?25.5:side===2?-25.5:0);panel.rotation.y=side*Math.PI/2;walls.push(panel);
 const foldedTop=mesh(new THREE.BoxGeometry(w,.1,.6),ivory,panel,0,h/2-.1,0);foldedTop.castShadow=false;
}
// The river is made of overlapping tissue ribbons. Individual sheets travel
// downstream and flutter at their corners; it is never a flat water plane.
const riverLayers=[];
for(let k=0;k<7;k++){
 const vertices=[],indices=[];for(let i=0;i<=100;i++){const x=-29+i*.58,z=riverZ(x)+(k-3)*.73,y=.12+k*.025;vertices.push(x,y,z-.55,x,y,z+.55);if(i<100){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const o=mesh(g,k%3===0?ivory:blue,scene);o.castShadow=false;riverLayers.push({mesh:o,base:Float32Array.from(g.attributes.position.array),phase:k});
}
const riverSheets=[];
for(let i=0;i<27;i++){const x=range(-29,29),lane=range(-2,2),o=mesh(sheet(range(1.1,2),range(.65,1.2),.1,5,4),i%3===0?ivory:white,scene);o.rotation.y=range(-.25,.25);o.castShadow=false;riverSheets.push({mesh:o,x,lane,speed:range(.75,1.5)});}
// An accordion-fold bridge spans the tissue stream.
const bridge=new THREE.Group();bridge.position.set(BRIDGE_X,0,riverZ(BRIDGE_X));scene.add(bridge);
for(let i=0;i<20;i++){const z=-3.5+(i+.5)*.35,y=.55*Math.sin(Math.PI*(z+3.5)/7);const step=mesh(new THREE.BoxGeometry(4.5,.13,.39),i%2?white:shadowPaper,bridge,0,y,z);step.rotation.x=Math.cos(Math.PI*(z+3.5)/7)*.23;}
for(const x of [-2.15,2.15]){const pts=[];for(let i=0;i<=20;i++){const z=-3.5+i*.35;pts.push(new THREE.Vector3(x,.45+.55*Math.sin(Math.PI*i/20),z));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,.055,5,false),ivory,bridge);}
// Rolled tissue trees and folded flowers decorate the edges without blocking play.
for(let i=0;i<16;i++){
 const a=i/16*Math.PI*2,x=Math.cos(a)*25,z=Math.sin(a)*22;if(inRiver(x,z)||Math.hypot(x-HAND.x,z-HAND.z)<8)continue;
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);mesh(new THREE.CylinderGeometry(.13,.22,2,7),shadowPaper,g,0,1,0);
 for(let j=0;j<5;j++){const leaf=mesh(sheet(2.6,1.8,.25,5,4),j%2?ivory:white,g,Math.cos(j*1.25)*.55,2+j*.25,Math.sin(j*1.25)*.55);leaf.rotation.set(j*.23,j*1.25,.45);}
}
for(let i=0;i<25;i++){const x=range(-24,24),z=range(-21,21);if(inRiver(x,z)||Math.hypot(x-HAND.x,z-HAND.z)<7)continue;const g=new THREE.Group();g.position.set(x,.18,z);scene.add(g);for(let j=0;j<4;j++){const petal=mesh(sheet(.65,.4,.08,2,2),i%3?white:blush,g);petal.rotation.y=j*Math.PI/2;petal.position.z=Math.cos(j*Math.PI/2)*.2;petal.position.x=Math.sin(j*Math.PI/2)*.2;}}
function sign(text,x,z,color='#607f8c'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fffdf3';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#d5dfdf';ctx.lineWidth=4;ctx.strokeRect(8,8,496,112);ctx.fillStyle=color;ctx.font='600 39px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.PlaneGeometry(4.7,1.17),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}),scene,x,1.2,z);m.rotation.x=-.25;mesh(new THREE.CylinderGeometry(.065,.09,1.3,6),shadowPaper,scene,x,.6,z);return m;
}
sign('THE TISSUE RIVER',-16,riverZ(-16)+4.6);sign('FLICK & CATCH',HAND.x-4.5,HAND.z+5.6);sign('FOLDMOBILE',-10,13.5);
// The Foldmobile: folded bonnet, open paper seats, tissue-roll wheels, no rubber.
const carMesh=new THREE.Group();scene.add(carMesh);const carWheels=[];
mesh(new THREE.BoxGeometry(2.4,.6,4.2),mint,carMesh,0,.9,0);
const bonnet=mesh(sheet(2.5,1.7,.11,4,3),ivory,carMesh,0,1.32,1.2);bonnet.rotation.x=-.12;
const rear=mesh(sheet(2.45,1,.15,4,3),ivory,carMesh,0,1.32,-1.65);rear.rotation.x=.2;
for(const x of [-1.15,1.15]){mesh(new THREE.BoxGeometry(.17,.75,2.3),ivory,carMesh,x,1.35,-.35);line([[x,1.3,-1.5],[x,1.65,-.4],[x,1.3,.7]],'#a4b9b9',carMesh);}
for(const x of [-1.3,1.3])for(const z of [-1.25,1.25]){
 const wheel=new THREE.Group();wheel.position.set(x,.57,z);carMesh.add(wheel);const roll=mesh(new THREE.CylinderGeometry(.58,.58,.35,20),ivory,wheel);roll.rotation.z=Math.PI/2;
 const pts=[];for(let j=0;j<=90;j++){const a=j/90*Math.PI*6,r=.08+j/90*.46;pts.push([x>0?.19:-.19,Math.cos(a)*r,Math.sin(a)*r]);}line(pts,'#879faa',wheel);carWheels.push(wheel);
}
mesh(new THREE.BoxGeometry(1.65,.25,1.2),shadowPaper,carMesh,0,1.22,-.45);mesh(new THREE.BoxGeometry(1.65,.8,.22),ivory,carMesh,0,1.7,-1.05);
for(const x of [-.8,.8])crumple(carMesh,white,x,1.15,2.12,.22,.17,.1);
for(let i=-3;i<=3;i++)mesh(new THREE.BoxGeometry(.1,.35,.1),shadowPaper,carMesh,i*.18,.8,2.15);
const steering=mesh(new THREE.TorusGeometry(.3,.045,6,20),shadowPaper,carMesh,0,1.7,.42);steering.rotation.x=-.6;
// Sniffles is a big crumpled tissue with an uneven hanky skirt and floppy arms.
const monsterMesh=new THREE.Group();scene.add(monsterMesh);const monsterBody=new THREE.Group();monsterMesh.add(monsterBody);
crumple(monsterBody,ivory,0,1.7,0,1.45,1.8,1.1);crumple(monsterBody,white,.12,3.15,-.05,1.15,1,.92);
for(let i=0;i<8;i++){const a=i/8*Math.PI*2,p=mesh(sheet(1.5,1.7,.3,4,4),i%2?ivory:white,monsterBody,Math.cos(a)*.9,.7,Math.sin(a)*.7);p.rotation.set(.35,a,.3);}
const monsterArms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*1.2,2.1,0);monsterBody.add(arm);const strip=mesh(sheet(.7,2.4,.2,3,8),white,arm,side*.35,-.2,.4);strip.rotation.z=side*.6;strip.rotation.x=1;crumple(arm,ivory,side*.6,-.65,1,.32);monsterArms.push(arm);crumple(monsterBody,shadowPaper,side*.7,.18,.2,.55,.2,.72);}
for(const x of [-.39,.39]){ball(monsterBody,white,x,3.3,.83,.29,.33,.12);ball(monsterBody,ink,x,3.31,.96,.13,.19,.045);ball(monsterBody,white,x-.035,3.38,1,.043);}
const monsterNose=crumple(monsterBody,blush,0,2.97,1,.24,.2,.23);line([[-.3,2.67,.92],[0,2.57,1.03],[.3,2.67,.92]],'#718892',monsterBody);
const crest=mesh(sheet(1.4,1.5,.3,4,4),white,monsterBody,0,4,.1);crest.rotation.z=-.3;
// The giant hand is built from layered tissue, five jointed paper fingers,
// visible fold seams, and a wrist curled out of the floor.
const handMesh=new THREE.Group();handMesh.position.set(HAND.x,0,HAND.z);scene.add(handMesh);
crumple(handMesh,shadowPaper,0,.7,2.5,2.05,.9,2.2);
const palmGroup=new THREE.Group();palmGroup.position.y=2.05;handMesh.add(palmGroup);
crumple(palmGroup,ivory,0,0,0,2.6,.7,2.5);
for(let i=0;i<3;i++){const g=sheet(4.7,4.3,.11,8,8),p=g.attributes.position;for(let j=0;j<p.count;j++)p.setX(j,p.getX(j)*(1-.16*Math.pow(p.getZ(j)/2.15,2)));g.computeVertexNormals();const layer=mesh(g,i%2?ivory:white,palmGroup,0,.37+i*.08,.08);layer.rotation.y=i*.025;}
line([[-1.8,.74,.9],[-.65,.78,-.1],[.9,.76,-.4],[1.8,.65,.1]],'#c6d3d5',palmGroup);
line([[-1.3,.72,1.5],[.2,.78,.9],[1.5,.7,1.1]],'#c6d3d5',palmGroup);
const fingers=[];
for(let i=0;i<4;i++){
 const finger=new THREE.Group();finger.position.set(-1.8+i*1.18,.38,-1.8);palmGroup.add(finger);const length=[4.2,5.2,4.7,3.7][i];
 for(let j=0;j<3;j++){const z=-(j+.5)*length/3;crumple(finger,j%2?ivory:white,0,0,z,.48,.46,length/6+.12);line([[-.36,.34,z],[0,.45,z-.1],[.36,.34,z]],'#c1d0d3',finger);}
 fingers.push(finger);
}
const thumb=new THREE.Group();thumb.position.set(2.05,.1,.65);thumb.rotation.y=-1.05;palmGroup.add(thumb);for(let i=0;i<2;i++)crumple(thumb,ivory,.2,0,-.45-i*1.15,.58,.5,.9);
// A pale folded landing marker shows exactly where to meet the hand.
const handMarker=mesh(new THREE.RingGeometry(1.35,1.48,48),mat('#8daab3',{side:THREE.DoubleSide}),scene,HAND.x,.17,HAND.z+4.5);handMarker.rotation.x=-Math.PI/2;
// Loose scraps flutter above the world; a reused particle pool handles sneezes.
const motes=[];for(let i=0;i<26;i++){const o=mesh(sheet(.3,.24,.035,2,2),ivory,scene,range(-28,28),range(4,14),range(-24,24));o.castShadow=false;motes.push(o);}
const scraps=[];for(let i=0;i<32;i++){const o=mesh(new THREE.PlaneGeometry(.25,.18),i%3?ivory:mint,scene);o.visible=false;o.castShadow=false;scraps.push({mesh:o,life:0,v:new THREE.Vector3()});}
function burst(x,y,z){for(const p of scraps){p.mesh.position.set(x,y,z);p.v.set(range(-3,3),range(2,6),range(-3,3));p.life=range(.8,1.7);p.mesh.visible=true;}}
let state=createState();
const skin=mat('#f5ece0'),shirt=mat('#6c9e9c'),shorts=mat('#dfddd4'),hair=mat('#c2c9c7'),eye=mat('#243f43');
// The boy: articulated arms and legs, soft rounded forms, and a little wind-swept fringe.
const boy=new THREE.Group();scene.add(boy);boy.position.set(0,.08,13);const body=new THREE.Group();boy.add(body);
mesh(new THREE.CylinderGeometry(.26,.29,.58,8),shirt,body,0,.92,0);ball(body,skin,0,1.53,0,.31,.35,.29);ball(body,hair,0,1.75,-.045,.325,.2,.3);ball(body,hair,-.14,1.76,.2,.2,.13,.1);ball(body,hair,.1,1.78,.19,.18,.11,.11);ball(body,skin,-.31,1.5,0,.067,.09,.065);ball(body,skin,.31,1.5,0,.067,.09,.065);ball(body,eye,-.105,1.55,.27,.025,.035,.018);ball(body,eye,.105,1.55,.27,.025,.035,.018);ball(body,skin,0,1.47,.291,.047,.044,.06);line([[-.055,1.4,.267],[0,1.39,.28],[.055,1.4,.267]],'#8f4a34',body);
const limbs={};for(const side of [-1,1]){let arm=new THREE.Group();arm.position.set(side*.32,1.13,0);body.add(arm);mesh(new THREE.CylinderGeometry(.105,.10,.22,8),shirt,arm,side*.02,-.07,0);mesh(new THREE.CylinderGeometry(.078,.085,.34,8),skin,arm,side*.035,-.30,0);ball(arm,skin,side*.035,-.47,0,.087);limbs[side===-1?'leftArm':'rightArm']=arm;let leg=new THREE.Group();leg.position.set(side*.15,.65,0);body.add(leg);mesh(new THREE.CylinderGeometry(.13,.125,.26,8),shorts,leg,0,-.1,0);mesh(new THREE.CylinderGeometry(.075,.09,.30,8),skin,leg,0,-.35,0);ball(leg,skin,0,-.53,.055,.1,.075,.17);limbs[side===-1?'leftLeg':'rightLeg']=leg;}
const keys=new Set(),pointers=new Map();let yaw=.18,pitch=.73,distance=innerWidth<700?37:31,drag=false,lastX=0,lastY=0,pinchDistance=0,joy={x:0,y:0},touchId=null,toastTimer,riverToast=false;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function jump(){jumpPlayer(state);}
function clearControls(){keys.clear();joy={x:0,y:0};drag=false;pointers.clear();touchId=null;$('#stick').style.transform='none';}
addEventListener('keydown',e=>{if($('#help-dialog').open||e.target.closest('button,summary,nav,a'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.code==='Space'&&!e.repeat)jump();if(e.key.toLowerCase()==='e'&&!e.repeat)$('#interact').click();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearControls();});
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);distance=THREE.MathUtils.clamp(distance-(d-pinchDistance)*.055,18,64);pinchDistance=d;}else{yaw-=(e.clientX-lastX)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.003,.32,1.13);}lastX=e.clientX;lastY=e.clientY;});function releasePointer(e){pointers.delete(e.pointerId);const p=[...pointers.values()][0];drag=!!p;if(p){lastX=p.x;lastY=p.y;}}canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.02,18,64);},{passive:false});
$('#interact').onclick=()=>{if(interact(state))toast(state.event);};$('#jump').onclick=jump;$('#home').onclick=()=>{state=createState();clearControls();toast('A fresh sheet. Let’s go!');};$('#help').onclick=()=>{clearControls();$('#help-dialog').showModal();};$('#close-help').onclick=$('#back').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog'))$('#help-dialog').close();});
const joystick=$('#joystick');function moveJoy(e){const b=joystick.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,l=Math.max(32,Math.hypot(x,y));joy={x:x/l,y:y/l};$('#stick').style.transform=`translate(${joy.x*29}px,${joy.y*29}px)`;}joystick.addEventListener('pointerdown',e=>{touchId=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);});joystick.addEventListener('pointermove',e=>{if(touchId===e.pointerId)moveJoy(e);});function resetJoy(){touchId=null;joy={x:0,y:0};$('#stick').style.transform='none';}joystick.addEventListener('pointerup',resetJoy);joystick.addEventListener('pointercancel',resetJoy);
// A little tissue cape flutters on the familiar explorer.
const cape=mesh(sheet(.65,.8,.12,3,4),ivory,body,0,.95,-.22);cape.rotation.x=1.3;
const clock=new THREE.Clock(),target=new THREE.Vector3(0,.8,9),desired=new THREE.Vector3();let uiTick=0,lastTags=0,lastCatches=0;
const map=$('#map'),ctx=map.getContext('2d');
function drawMap(){ctx.fillStyle='#f0f2e9';ctx.fillRect(0,0,220,220);ctx.strokeStyle='#d0dadd';ctx.lineWidth=3;ctx.strokeRect(10,20,200,180);ctx.strokeStyle='#9ebfcf';ctx.lineWidth=17;ctx.beginPath();for(let x=-28;x<=28;x++)ctx.lineTo(110+x*3.5,110+riverZ(x)*3.5);ctx.stroke();ctx.fillStyle='#ffffff';ctx.fillRect(110+BRIDGE_X*3.5-8,110+riverZ(BRIDGE_X)*3.5-12,16,24);for(const [x,z,color,r] of [[HAND.x,HAND.z,'#a49cb8',8],[state.car.x,state.car.z,'#699b90',5],[state.monster.x,state.monster.z,'#c48b76',6],[state.x,state.z,'#304f63',4]]){ctx.fillStyle=color;ctx.beginPath();ctx.arc(110+x*3.5,110+z*3.5,r,0,7);ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();}}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035),paused=$('#help-dialog').open||$('.world-menu').open||document.hidden;
 const sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
 if(!paused)tick(state,dt,{x:sx*Math.cos(yaw)+sy*Math.sin(yaw),z:-sx*Math.sin(yaw)+sy*Math.cos(yaw),run:keys.has('shift')});
 const t=state.time,riding=!!state.ride,driving=state.mode==='drive',moving=Math.hypot(sx,sy)>.1;
 boy.position.set(state.x,state.y,state.z);boy.rotation.y+=Math.atan2(Math.sin(state.yaw-boy.rotation.y),Math.cos(state.yaw-boy.rotation.y))*Math.min(1,dt*10);
 const air=state.mode==='flight';body.rotation.z=air?Math.sin((state.ride.age-.8)/3*Math.PI)*.6:0;body.rotation.x=driving?-.08:0;body.position.y=state.mode==='catch'?-Math.sin((state.ride.age-3.8)*Math.PI)*.1:0;
 const step=moving&&!riding&&!driving?Math.sin(t*11)*.65:0;limbs.leftLeg.rotation.x=driving?-1.2:step;limbs.rightLeg.rotation.x=driving?-1.2:-step;limbs.leftArm.rotation.x=driving?-1.1:-step;limbs.rightArm.rotation.x=driving?-1.1:step;limbs.leftArm.rotation.z=air?1.9:0;limbs.rightArm.rotation.z=air?-1.9:0;cape.rotation.x=1.3+Math.sin(t*5)*.13;
 carMesh.position.set(state.car.x,ground(state.car.x,state.car.z),state.car.z);carMesh.rotation.y=state.car.yaw;carMesh.rotation.z=driving?Math.sin(t*6)*state.car.speed*.002:0;carWheels.forEach(w=>w.rotation.x+=driving?state.car.speed*dt:0);
 const m=state.monster;monsterMesh.position.set(m.x,ground(m.x,m.z),m.z);monsterMesh.rotation.y=m.yaw;const chasing=m.cooldown===0&&!riding;
 monsterBody.position.y=chasing?Math.abs(Math.sin(t*5))*.16:Math.sin(t*2)*.055;monsterBody.rotation.z=Math.sin(t*4)*.07;monsterBody.scale.set(1,m.sneeze>0?1-Math.sin(m.sneeze*Math.PI)*.15:1,1);monsterArms.forEach((a,i)=>a.rotation.x=Math.sin(t*5+i*Math.PI)*.28);crest.rotation.x=Math.sin(t*4)*.2;
 const age=state.ride?.age||0;fingers.forEach((f,i)=>f.rotation.x=state.mode==='flick'?(i===0?Math.sin(age/.8*Math.PI)*1.1:.25):state.mode==='catch'?-.3:-.17+Math.sin(t*.7+i)*.045);thumb.rotation.z=state.mode==='catch'?-.2:0;palmGroup.position.y=2.05+(state.mode==='catch'?-.3*Math.sin((age-3.8)*Math.PI):0);
 handMarker.material.opacity=.65+Math.sin(t*2)*.3;handMarker.material.transparent=true;
 for(const layer of riverLayers){const p=layer.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=layer.base[i*3],z=layer.base[i*3+2];p.setY(i,layer.base[i*3+1]+Math.sin(x*1.4-t*2+layer.phase)*.055+Math.sin(z*4+t)*.025);}p.needsUpdate=true;}
 for(const p of riverSheets){const x=((p.x+t*p.speed+29)%58)-29;p.mesh.position.set(x,.34+Math.sin(t*2+x)*.045,riverZ(x)+p.lane);p.mesh.rotation.z=Math.sin(t*2+x)*.04;}
 motes.forEach((p,i)=>{p.rotation.set(t*.4+i,t*.25+i,Math.sin(t+i)*.3);p.position.y+=Math.sin(t*.5+i)*dt*.08;});
 if(state.tags>lastTags){lastTags=state.tags;burst(m.x,2.8,m.z);}if(state.catches>lastCatches){lastCatches=state.catches;burst(HAND.x,3,HAND.z);}
 for(const p of scraps)if(p.life>0){p.life-=dt;p.v.y-=dt*3;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=dt*4;p.mesh.rotation.z+=dt*3;p.mesh.visible=p.life>0;}
 // During the flick, widen gently and keep both the boy and the catching palm in view.
 desired.set(riding?HAND.x:state.x,.8+(riding?state.y*.48:state.y*.65),riding?HAND.z:state.z-2);
 target.lerp(desired,1-Math.exp(-dt*4));const rideZoom=riding?7*Math.sin(Math.min(age/HAND_DURATION,1)*Math.PI):0,dist=distance+rideZoom;
 camera.position.set(target.x+Math.sin(yaw)*dist*Math.cos(pitch),target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*dist*Math.cos(pitch));camera.lookAt(target);
 for(const wall of walls){const toward=(wall.position.x*(camera.position.x-target.x)+wall.position.z*(camera.position.z-target.z))>250;wall.material.opacity=toward?.18:1;wall.material.depthWrite=!toward;wall.children.forEach(c=>c.visible=!toward);}
 if(!paused&&state.event)toast(state.event);
 if((uiTick+=dt)>.12){
  uiTick=0;document.body.classList.toggle('riding',riding);const action=$('#interact'),ready=driving||(!riding&&nearCar(state));action.classList.toggle('ready',ready);action.disabled=riding;action.querySelector('strong').textContent=driving?'Hop out of the car':ready?'Drive the tissue car':'Find the Foldmobile';action.querySelector('small').textContent=driving?'Steer with WASD or the joystick':'A little paper getaway';
  $('#jump').disabled=driving||riding;$('#zone').textContent=driving?'Foldmobile':riding?'Flick & catch':inRiver(state.x,state.z)?'Tissue river':'The soft side';
  const gap=Math.hypot(state.x-m.x,state.z-m.z);$('.monster-status').classList.toggle('close',gap<7&&!riding);$('#monster-label').textContent=m.sneeze>0?'A-choo! Keep running!':m.cooldown>0?'Sniffles is catching his breath':gap<7?'Sniffles is right behind you!':'Sniffles is on your trail';
  $('#ride-title').textContent=state.mode==='flick'?'Ready…':state.mode==='flight'?'Up, up, and tissue!':state.mode==='catch'?'Got you!':'Soft landing';$('#ride-progress').style.width=`${age/HAND_DURATION*100}%`;drawMap();
 }
 renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?58:47;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));});
const readState=()=>({position:{x:state.x,y:state.y,z:state.z},mode:state.mode,monster:{...state.monster,distance:Math.hypot(state.x-state.monster.x,state.z-state.monster.z)},car:state.car,nearCar:nearCar(state),nearHand:nearHand(state),hand:HAND,ride:state.ride,flicks:state.flicks,catches:state.catches,tags:state.tags,driveDistance:state.driveDistance});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
register({name:'read_tissue_world_state',description:'Read explorer position, tissue monster chase, car position, and flick-and-catch state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:readState});
register({name:'move_in_tissue_world',description:'Walk or drive using the same camera-relative WASD controls for up to three seconds.',inputSchema:{type:'object',properties:{direction:{type:'string',enum:['forward','back','left','right']},seconds:{type:'number',minimum:.1,maximum:3}},required:['direction','seconds'],additionalProperties:false},annotations:{readOnlyHint:false},async execute(input){const mapping={forward:'w',back:'s',left:'a',right:'d'};if(!input||!Object.hasOwn(mapping,input.direction)||!Number.isFinite(input.seconds)||input.seconds<.1||input.seconds>3)throw new Error('Choose a direction and duration from 0.1 to 3 seconds.');if($('#help-dialog').open)throw new Error('Close help first.');const key=mapping[input.direction];keys.add(key);try{await new Promise(r=>setTimeout(r,input.seconds*1000));}finally{keys.delete(key);}return readState();}});
register({name:'use_tissue_car',description:'Get into the tissue car when nearby, or hop out, using the same action as E.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(){if($('#help-dialog').open)throw new Error('Close help first.');if(!interact(state))throw new Error('Walk closer to the car first.');toast(state.event);return readState();}});
register({name:'jump_in_tissue_world',description:'Jump using the same action as Space or the touch jump button.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(){jump();return readState();}});addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),600);
