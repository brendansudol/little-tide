import * as THREE from '../vendor/three.module.js';
import {wallState,createState,tickPlayer,jump as jumpPlayer,RADIUS} from './pizza.js';
const $=s=>document.querySelector(s),canvas=$('#world');
const scene=new THREE.Scene();scene.background=new THREE.Color('#efa759');scene.fog=new THREE.Fog('#efa759',75,170);
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch(error){$('#loading').innerHTML='<p>This pizza world needs WebGL.<br>Try a browser with hardware acceleration enabled.</p>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,200);
scene.add(new THREE.HemisphereLight('#fff4d8','#a12c24',2));
const sun=new THREE.DirectionalLight('#fff4d5',2.8);sun.position.set(-16,40,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:100});sun.shadow.normalBias=.04;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.6,...extra});
const crust=mat('#de8f35'),toastCrust=mat('#b96528'),dough=mat('#f6c86c'),sauce=mat('#d5351e',{roughness:.23,metalness:.04}),cheese=mat('#ffe093'),pepper=mat('#a92219',{roughness:.45}),pepperEdge=mat('#751e18'),fat=mat('#ecaa73'),herb=mat('#387c37');
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const sphere=new THREE.SphereGeometry(1,12,8);
function ball(parent,m,x,y,z,sx,sy=sx,sz=sx){const o=mesh(sphere,m,parent,x,y,z);o.scale.set(sx,sy,sz);return o;}
function line(points,color,parent){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));parent.add(o);return o;}
let seed=193;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};const range=(a,b)=>a+rand()*(b-a);
// A complete, thick pizza sits on a broad pizzeria table.
mesh(new THREE.CylinderGeometry(29,29,.5,96),mat('#83a6a0',{metalness:.35}),scene,0,-1.8,0);
mesh(new THREE.CylinderGeometry(RADIUS,RADIUS-.4,1.2,96),dough,scene,0,-.8,0);
mesh(new THREE.CylinderGeometry(25.5,25.5,.16,96),sauce,scene,0,-.11,0);
const rim=mesh(new THREE.TorusGeometry(25.3,1.05,12,96),crust,scene,0,.05,0);rim.rotation.x=Math.PI/2;
for(let i=0;i<66;i++){const a=i/66*Math.PI*2,r=range(24.8,25.8);ball(scene,i%3?dough:toastCrust,Math.cos(a)*r,.55,Math.sin(a)*r,range(.18,.55),.11,range(.15,.35));}
const table=mesh(new THREE.PlaneGeometry(200,200),mat('#df7547'),scene,0,-2.2,0);table.rotation.x=-Math.PI/2;
// Large checkered squares read as a picnic cloth, even at the edge of the pizza.
const tiles=new THREE.InstancedMesh(new THREE.PlaneGeometry(5,5),mat('#f3b977'),400);const matrix=new THREE.Matrix4();let tile=0;
for(let x=-10;x<10;x++)for(let z=-10;z<10;z++)if((x+z)%2===0){matrix.compose(new THREE.Vector3(x*5,-2.18,z*5),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),new THREE.Vector3(1,1,1));tiles.setMatrixAt(tile++,matrix);}tiles.count=tile;scene.add(tiles);
const diskGeo=new THREE.CylinderGeometry(1,1,.16,24),speckGeo=new THREE.SphereGeometry(1,6,4);
function pepperoni(parent,x,y,z,r=1){
  const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);group.scale.setScalar(r);
  mesh(diskGeo,pepperEdge,group);const face=mesh(diskGeo,pepper,group,0,.055,0);face.scale.set(.92,1,.92);
  // Fat flecks, dark toasted spots, and a curled edge make each slice recognizable.
  for(const [material,count] of [[fat,5],[pepperEdge,3]]){const flecks=new THREE.InstancedMesh(speckGeo,material,count),transform=new THREE.Matrix4();for(let j=0;j<count;j++){const a=range(0,7),d=range(.13,.77),size=range(.045,.1);transform.compose(new THREE.Vector3(Math.cos(a)*d,.15,Math.sin(a)*d),new THREE.Quaternion(),new THREE.Vector3(size,.018,size*.8));flecks.setMatrixAt(j,transform);}group.add(flecks);}
  return group;
}
const toppings=[];
for(let i=0;i<88;i++){
  const a=i*2.39996,r=Math.sqrt((i+1)/89)*23,x=Math.cos(a)*r,z=Math.sin(a)*r,size=range(.8,1.4);
  pepperoni(scene,x,.1,z,size);toppings.push({x,z,r:size});
}
// Small cheese islands and basil leaves sit between the many pepperonis.
for(let i=0;i<37;i++){const a=range(0,7),r=range(2,23),x=Math.cos(a)*r,z=Math.sin(a)*r;if(toppings.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+1))continue;ball(scene,cheese,x,.005,z,range(.4,1.1),.05,range(.3,.8));}
for(let i=0;i<20;i++){const a=range(0,7),r=range(7,23),leaf=ball(scene,herb,Math.cos(a)*r,.13,Math.sin(a)*r,.18,.055,.48);leaf.rotation.y=a;}
// Four solid walls faced with huge vertical pepperoni slices. The front wall is
// lower so the camera can see the boy while all four walls physically push him.
const walls=[];
for(let side=0;side<4;side++){
  const wall=new THREE.Group();scene.add(wall);const height=side===0?2.6:3.8;
  wall.userData.backing=mesh(new THREE.BoxGeometry(34,height,.48),pepperEdge,wall,0,height/2,0);
  wall.userData.slices=[];
  for(let j=-7;j<=7;j++)for(const face of [-1,1]){
    const p=pepperoni(wall,j*2.22,height*.49,face*.35,1.18);p.rotation.x=face*Math.PI/2;wall.userData.slices.push(p);
    if(side!==0){const top=pepperoni(wall,j*2.22+1,height*.86,face*.33,.7);top.rotation.x=face*Math.PI/2;wall.userData.slices.push(top);}
  }
  wall.rotation.y=side*Math.PI/2;walls.push(wall);
}
const state=createState();
const skin=mat('#d99563'),shirt=mat('#fff5d6'),shorts=mat('#328785'),hair=mat('#48382d'),eye=mat('#243f43');
// The boy: articulated arms and legs, soft rounded forms, and a little wind-swept fringe.
const boy=new THREE.Group();scene.add(boy);boy.position.set(0,.3,6);const body=new THREE.Group();boy.add(body);
mesh(new THREE.CylinderGeometry(.26,.29,.58,8),shirt,body,0,.92,0);ball(body,skin,0,1.53,0,.31,.35,.29);ball(body,hair,0,1.75,-.045,.325,.2,.3);ball(body,hair,-.14,1.76,.2,.2,.13,.1);ball(body,hair,.1,1.78,.19,.18,.11,.11);ball(body,skin,-.31,1.5,0,.067,.09,.065);ball(body,skin,.31,1.5,0,.067,.09,.065);ball(body,eye,-.105,1.55,.27,.025,.035,.018);ball(body,eye,.105,1.55,.27,.025,.035,.018);ball(body,skin,0,1.47,.291,.047,.044,.06);line([[-.055,1.4,.267],[0,1.39,.28],[.055,1.4,.267]],'#8f4a34',body);
const limbs={};for(const side of [-1,1]){let arm=new THREE.Group();arm.position.set(side*.32,1.13,0);body.add(arm);mesh(new THREE.CylinderGeometry(.105,.10,.22,8),shirt,arm,side*.02,-.07,0);mesh(new THREE.CylinderGeometry(.078,.085,.34,8),skin,arm,side*.035,-.30,0);ball(arm,skin,side*.035,-.47,0,.087);limbs[side===-1?'leftArm':'rightArm']=arm;let leg=new THREE.Group();leg.position.set(side*.15,.65,0);body.add(leg);mesh(new THREE.CylinderGeometry(.13,.125,.26,8),shorts,leg,0,-.1,0);mesh(new THREE.CylinderGeometry(.075,.09,.30,8),skin,leg,0,-.35,0);ball(leg,skin,0,-.53,.055,.1,.075,.17);limbs[side===-1?'leftLeg':'rightLeg']=leg;}
const keys=new Set(),pointers=new Map();let yaw=.18,pitch=.88,distance=innerWidth<700?32:40,drag=false,lastX=0,lastY=0,pinchDistance=0,joy={x:0,y:0},touchId=null,toastTimer,riverToast=false;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function jump(){jumpPlayer(state);}
function clearControls(){keys.clear();joy={x:0,y:0};drag=false;pointers.clear();touchId=null;$('#stick').style.transform='none';}
addEventListener('keydown',e=>{if($('#help-dialog').open||e.target.closest('button,summary,nav,a'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.code==='Space'&&!e.repeat)jump();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearControls();});
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);distance=THREE.MathUtils.clamp(distance-(d-pinchDistance)*.055,18,64);pinchDistance=d;}else{yaw-=(e.clientX-lastX)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.003,.32,1.13);}lastX=e.clientX;lastY=e.clientY;});function releasePointer(e){pointers.delete(e.pointerId);const p=[...pointers.values()][0];drag=!!p;if(p){lastX=p.x;lastY=p.y;}}canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.02,18,64);},{passive:false});
$('#interact').onclick=$('#jump').onclick=jump;$('#reset-camera').onclick=()=>{yaw=.18;pitch=.88;distance=innerWidth<700?32:40;};$('#help').onclick=()=>{clearControls();$('#help-dialog').showModal();};$('#close-help').onclick=$('#back').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog'))$('#help-dialog').close();});
const joystick=$('#joystick');function moveJoy(e){const b=joystick.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,l=Math.max(32,Math.hypot(x,y));joy={x:x/l,y:y/l};$('#stick').style.transform=`translate(${joy.x*29}px,${joy.y*29}px)`;}joystick.addEventListener('pointerdown',e=>{touchId=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);});joystick.addEventListener('pointermove',e=>{if(touchId===e.pointerId)moveJoy(e);});function resetJoy(){touchId=null;joy={x:0,y:0};$('#stick').style.transform='none';}joystick.addEventListener('pointerup',resetJoy);joystick.addEventListener('pointercancel',resetJoy);
const target=new THREE.Vector3(0,0,2),desired=new THREE.Vector3(),clock=new THREE.Clock();let time=0,uiTick=0,lastPhase='open',bumpCooldown=0;
const map=$('#map'),ctx=map.getContext('2d');
function drawMap(extent){ctx.clearRect(0,0,220,220);ctx.fillStyle='#e5a448';ctx.beginPath();ctx.arc(110,110,106,0,7);ctx.fill();ctx.fillStyle='#d94624';ctx.beginPath();ctx.arc(110,110,95,0,7);ctx.fill();ctx.fillStyle='#852b20';for(const p of toppings){ctx.beginPath();ctx.arc(110+p.x*3.6,110+p.z*3.6,p.r*3.6,0,7);ctx.fill();}ctx.strokeStyle='#ffe8b0';ctx.lineWidth=5;ctx.strokeRect(110-extent*3.6,110-extent*3.6,extent*7.2,extent*7.2);ctx.fillStyle='#55c5be';ctx.strokeStyle='white';ctx.lineWidth=2;ctx.beginPath();ctx.arc(110+state.x*3.6,110+state.z*3.6,5,0,7);ctx.fill();ctx.stroke();}
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035),paused=$('#help-dialog').open||document.hidden;if(!paused)time+=dt;
  let sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
  const input={x:sx*Math.cos(yaw)+sy*Math.sin(yaw),z:-sx*Math.sin(yaw)+sy*Math.cos(yaw)};
  const grip=paused?false:tickPlayer(state,dt,time,input,toppings),wall=wallState(time),speed=Math.hypot(state.vx,state.vz);
  boy.position.set(state.x,.22+state.jumpY,state.z);
  if(speed>.15){const angle=Math.atan2(state.vx,state.vz);boy.rotation.y+=Math.atan2(Math.sin(angle-boy.rotation.y),Math.cos(angle-boy.rotation.y))*Math.min(1,dt*9);}
  const step=Math.sin(time*10)*Math.min(speed/5,.65);limbs.leftLeg.rotation.x=step;limbs.rightLeg.rotation.x=-step;
  limbs.leftArm.rotation.z=.45+Math.min(speed*.08,.5);limbs.rightArm.rotation.z=-limbs.leftArm.rotation.z;limbs.leftArm.rotation.x=-step*.5;limbs.rightArm.rotation.x=step*.5;body.rotation.x=Math.min(speed*.026,.16);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;walls[i].position.set(Math.sin(a)*wall.extent,0,Math.cos(a)*wall.extent);walls[i].userData.backing.scale.x=wall.extent/17;for(const slice of walls[i].userData.slices)slice.visible=Math.abs(slice.position.x)<wall.extent-.7;}
  bumpCooldown=Math.max(0,bumpCooldown-dt);if(state.bumped&&!paused&&bumpCooldown===0){toast('Boop! A pepperoni nudge.');bumpCooldown=4;}
  if(wall.phase!==lastPhase){if(wall.phase==='closing')toast('Here come the pepperonis! Slide toward the middle.');if(wall.phase==='opening')toast('Aaand… extra room again!');lastPhase=wall.phase;}
  desired.set(state.x*.62,.4,state.z*.62);target.lerp(desired,1-Math.exp(-dt*4));camera.position.set(target.x+Math.sin(yaw)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(target);
  if((uiTick+=dt)>.12){uiTick=0;$('#zone').textContent=grip?'Pepperoni grip':'Slippery sauce';$('#wall-label').textContent=wall.label;$('#squeeze-fill').style.width=`${(17-wall.extent)/12*100}%`;drawMap(wall.extent);}
  renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));});
const readState=()=>({position:{x:state.x,z:state.z},velocity:{x:state.vx,z:state.vz},jumpHeight:state.jumpY,walls:wallState(time),time});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
register({name:'read_pepperoni_world_state',description:'Read position, sliding velocity, jump height and pepperoni wall phase.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:readState});
register({name:'walk_in_pepperoni_world',description:'Move across the pizza with the same controls as WASD for up to three seconds.',inputSchema:{type:'object',properties:{direction:{type:'string',enum:['forward','back','left','right']},seconds:{type:'number',minimum:.1,maximum:3}},required:['direction','seconds'],additionalProperties:false},annotations:{readOnlyHint:false},async execute(input){const mapping={forward:'w',back:'s',left:'a',right:'d'};if(!input||!Object.hasOwn(mapping,input.direction)||!Number.isFinite(input.seconds)||input.seconds<.1||input.seconds>3)throw new Error('Choose a direction and duration from 0.1 to 3 seconds.');if($('#help-dialog').open)throw new Error('Close help first.');const key=mapping[input.direction];keys.add(key);try{await new Promise(r=>setTimeout(r,input.seconds*1000));}finally{keys.delete(key);}return readState();}});
register({name:'jump_in_pepperoni_world',description:'Jump using the same action as the jump button.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(){jump();return readState();}});addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),600);
