import * as THREE from '../vendor/three.module.js';
import {HOOPS,CANNON,WIDTH,DEPTH,createState,hoopAt,nearestHoop,nearWall,climb,jump as jumpPlayer,tick} from './rules.js';
const $=s=>document.querySelector(s),canvas=$('#world');
const scene=new THREE.Scene();scene.background=new THREE.Color('#82bbc7');scene.fog=new THREE.Fog('#82bbc7',70,140);
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch(error){$('#loading').innerHTML='<p>This gym needs WebGL.<br>Try a browser with hardware acceleration enabled.</p>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const camera=new THREE.PerspectiveCamera(innerWidth<700?58:48,innerWidth/innerHeight,.1,160);scene.add(new THREE.HemisphereLight('#fff8de','#406979',2.3));
const sun=new THREE.DirectionalLight('#fff0c9',2.7);sun.position.set(-18,35,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:1,far:90});sun.shadow.normalBias=.03;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.55,...extra});
const wood=mat('#dea15c'),cream=mat('#fff1cb'),teal=mat('#318d98'),navy=mat('#203d58'),orange=mat('#f69235'),rubber=mat('#334554'),wallMat=mat('#d8e6d7');
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const sphere=new THREE.SphereGeometry(1,14,10);
function ball(parent,m,x,y,z,sx,sy=sx,sz=sx){const o=mesh(sphere,m,parent,x,y,z);o.scale.set(sx,sy,sz);return o;}
function line(points,color,parent){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));parent.add(o);return o;}
function cylinderBetween(a,b,r,material,parent){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material,parent);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
mesh(new THREE.BoxGeometry(33,.8,27),navy,scene,0,-.5,0);mesh(new THREE.BoxGeometry(30,.15,24),wood,scene,0,-.05,0);
for(let x=-14.8;x<15;x+=.75)line([[x,.04,-12],[x,.04,12]],'#bf8548',scene);
for(let z=-11;z<12;z+=2.4)for(let x=-15;x<15;x+=3)line([[x,.045,z+(x%2)*.3],[x+.7,.045,z+(x%2)*.3]],'#c48d50',scene);
const courtPaint=mat('#fff3c7');function stripe(x,z,w,d){mesh(new THREE.BoxGeometry(w,.015,d),courtPaint,scene,x,.06,z);}
stripe(0,0,27,.12);stripe(0,-10,27,.12);stripe(0,10,27,.12);stripe(-13.5,0,.12,20);stripe(13.5,0,.12,20);
const circle=mesh(new THREE.TorusGeometry(3,.065,6,64),cream,scene,0,.075,0);circle.rotation.x=Math.PI/2;
for(const z of [-7.7,7.7]){stripe(-3,z,.1,4.5);stripe(3,z,.1,4.5);stripe(0,z>0?5.5:-5.5,6,.1);}
// A roofless gym keeps the climbing and the cannon visible. Camera-facing walls
// become translucent so the climber never disappears behind the building.
const roomWalls=[];
for(let side=0;side<4;side++){
 const g=new THREE.Group();scene.add(g);const along=side%2?24:30;
 const material=wallMat.clone();material.transparent=true;
 const panel=mesh(new THREE.BoxGeometry(along,12,.25),material,g,0,6,0);
 const padMaterial=teal.clone();padMaterial.transparent=true;
 mesh(new THREE.BoxGeometry(along,2,.35),padMaterial,g,0,1,-.08);
 g.position.set(side===1?15:side===3?-15:0,0,side===0?12:side===2?-12:0);g.rotation.y=side*Math.PI/2;
 const holds=[];for(let y=1;y<11;y+=1.5)for(let x=-along/2+1;x<along/2;x+=2.5){const hold=mesh(new THREE.DodecahedronGeometry(.17),mat((Math.round(y+x)+60)%3===0?'#f0ae45':'#789eae'),g,x,y,-.25);hold.scale.set(1.4,.7,1);holds.push(hold);}
 // Rails make the hoops' sideways movement feel connected to the gym.
 if(side!==0){const h=side===2?3:side===3?6:9;mesh(new THREE.BoxGeometry(along-.8,.09,.09),navy,g,0,h+1,-.35);}
 roomWalls.push({group:g,materials:[material,padMaterial],holds,side});
}
const hoopMeshes=[];
for(const h of HOOPS){
 const g=new THREE.Group();scene.add(g);const color=mat(h.color);
 mesh(new THREE.BoxGeometry(3.4,2,.13),cream,g,0,.8,-.8);
 mesh(new THREE.BoxGeometry(3.55,.14,.2),color,g,0,1.82,-.8);
 for(const x of [-1.7,1.7])mesh(new THREE.BoxGeometry(.13,2,.2),color,g,x,.8,-.8);
 // Backboard target square and bright orange rim.
 line([[-.58,.22,-.71],[-.58,1,-.71],[.58,1,-.71],[.58,.22,-.71],[-.58,.22,-.71]],'#e77831',g);
 const rim=mesh(new THREE.TorusGeometry(.68,.075,8,36),orange,g);rim.rotation.x=Math.PI/2;
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,b=a+.3;line([[Math.cos(a)*.65,0,Math.sin(a)*.65],[Math.cos(b)*.4,-.85,Math.sin(b)*.4]],'#fff6df',g);}
 for(const [y,r] of [[-.35,.55],[-.7,.44]]){const net=mesh(new THREE.TorusGeometry(r,.012,4,24),cream,g,0,y,0);net.rotation.x=Math.PI/2;net.castShadow=false;}
 if(h.id===1)g.rotation.y=Math.PI/2;if(h.id===2)g.rotation.y=-Math.PI/2;
 hoopMeshes.push(g);
}
// A friendly toy cannon swivels to follow the hoop it is shooting at.
const cannon=new THREE.Group();scene.add(cannon);cannon.position.set(CANNON.x,0,CANNON.z);
mesh(new THREE.BoxGeometry(1.8,.55,1.4),teal,cannon,0,.5,0);
for(const x of [-.9,.9]){const wheel=mesh(new THREE.CylinderGeometry(.46,.46,.22,16),rubber,cannon,x,.45,0);wheel.rotation.z=Math.PI/2;}
const barrelPivot=new THREE.Group();barrelPivot.position.y=CANNON.y;cannon.add(barrelPivot);
const barrel=mesh(new THREE.CylinderGeometry(.38,.47,1.65,20),navy,barrelPivot,0,.65,0);
const lip=mesh(new THREE.TorusGeometry(.4,.08,8,24),orange,barrelPivot,0,1.48,0);lip.rotation.x=Math.PI/2;
mesh(new THREE.CircleGeometry(.31,24),rubber,barrelPivot,0,1.5,0).rotation.x=-Math.PI/2;
function basketball(){const g=new THREE.Group();ball(g,orange,0,0,0,.34);for(let i=0;i<3;i++){const seam=mesh(new THREE.TorusGeometry(.343,.012,4,36),navy,g);seam.rotation.set(i===1?Math.PI/2:0,i===2?Math.PI/2:0,0);seam.castShadow=false;}return g;}
const projectile=basketball();scene.add(projectile);projectile.visible=false;
// Rolled mats and a bench at the edge of the court.
for(let i=0;i<3;i++){const m=mesh(new THREE.CylinderGeometry(.4,.4,2,16),mat(HOOPS[i].color),scene,9+i*.9,.45,9);m.rotation.z=Math.PI/2;}
mesh(new THREE.BoxGeometry(4,.2,.8),cream,scene,-9,.85,9);for(const x of [-10.5,-7.5])mesh(new THREE.BoxGeometry(.2,.8,.6),navy,scene,x,.4,9);
let state=createState();
const skin=mat('#d99563'),shirt=mat('#ee8641'),shorts=mat('#257d8e'),hair=mat('#48382d'),eye=mat('#243f43');
// The boy: articulated arms and legs, soft rounded forms, and a little wind-swept fringe.
const boy=new THREE.Group();scene.add(boy);boy.position.set(0,0,6);const body=new THREE.Group();boy.add(body);
mesh(new THREE.CylinderGeometry(.26,.29,.58,8),shirt,body,0,.92,0);ball(body,skin,0,1.53,0,.31,.35,.29);ball(body,hair,0,1.75,-.045,.325,.2,.3);ball(body,hair,-.14,1.76,.2,.2,.13,.1);ball(body,hair,.1,1.78,.19,.18,.11,.11);ball(body,skin,-.31,1.5,0,.067,.09,.065);ball(body,skin,.31,1.5,0,.067,.09,.065);ball(body,eye,-.105,1.55,.27,.025,.035,.018);ball(body,eye,.105,1.55,.27,.025,.035,.018);ball(body,skin,0,1.47,.291,.047,.044,.06);line([[-.055,1.4,.267],[0,1.39,.28],[.055,1.4,.267]],'#8f4a34',body);
const limbs={};for(const side of [-1,1]){let arm=new THREE.Group();arm.position.set(side*.32,1.13,0);body.add(arm);mesh(new THREE.CylinderGeometry(.105,.10,.22,8),shirt,arm,side*.02,-.07,0);mesh(new THREE.CylinderGeometry(.078,.085,.34,8),skin,arm,side*.035,-.30,0);ball(arm,skin,side*.035,-.47,0,.087);limbs[side===-1?'leftArm':'rightArm']=arm;let leg=new THREE.Group();leg.position.set(side*.15,.65,0);body.add(leg);mesh(new THREE.CylinderGeometry(.13,.125,.26,8),shorts,leg,0,-.1,0);mesh(new THREE.CylinderGeometry(.075,.09,.30,8),skin,leg,0,-.35,0);ball(leg,skin,0,-.53,.055,.1,.075,.17);limbs[side===-1?'leftLeg':'rightLeg']=leg;}
const keys=new Set(),pointers=new Map();let yaw=.18,pitch=.67,distance=innerWidth<700?42:38,drag=false,lastX=0,lastY=0,pinchDistance=0,joy={x:0,y:0},touchId=null,toastTimer,riverToast=false;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function jump(){jumpPlayer(state);}
function clearControls(){keys.clear();joy={x:0,y:0};drag=false;pointers.clear();touchId=null;$('#stick').style.transform='none';}
addEventListener('keydown',e=>{if($('#help-dialog').open||e.target.closest('button,summary,nav,a'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.code==='Space'&&!e.repeat)jump();if(e.key.toLowerCase()==='e'&&!e.repeat)$('#interact').click();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearControls();});
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);distance=THREE.MathUtils.clamp(distance-(d-pinchDistance)*.055,18,64);pinchDistance=d;}else{yaw-=(e.clientX-lastX)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.003,.32,1.13);}lastX=e.clientX;lastY=e.clientY;});function releasePointer(e){pointers.delete(e.pointerId);const p=[...pointers.values()][0];drag=!!p;if(p){lastX=p.x;lastY=p.y;}}canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.02,18,64);},{passive:false});
$('#interact').onclick=()=>{if(state.mode==='climb')jump();else climb(state);};$('#jump').onclick=jump;$('#home').onclick=()=>{state=createState();clearControls();};$('#help').onclick=()=>{clearControls();$('#help-dialog').showModal();};$('#close-help').onclick=$('#back').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog'))$('#help-dialog').close();});
const joystick=$('#joystick');function moveJoy(e){const b=joystick.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,l=Math.max(32,Math.hypot(x,y));joy={x:x/l,y:y/l};$('#stick').style.transform=`translate(${joy.x*29}px,${joy.y*29}px)`;}joystick.addEventListener('pointerdown',e=>{touchId=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);});joystick.addEventListener('pointermove',e=>{if(touchId===e.pointerId)moveJoy(e);});function resetJoy(){touchId=null;joy={x:0,y:0};$('#stick').style.transform='none';}joystick.addEventListener('pointerup',resetJoy);joystick.addEventListener('pointercancel',resetJoy);
const target=new THREE.Vector3(0,2,1),desired=new THREE.Vector3(),clock=new THREE.Clock();let uiTick=0;
const map=$('#map'),ctx=map.getContext('2d');
function drawMap(){ctx.fillStyle='#dba264';ctx.fillRect(0,0,220,220);ctx.strokeStyle='#fff4cd';ctx.lineWidth=3;ctx.strokeRect(12,30,196,160);ctx.beginPath();ctx.arc(110,110,20,0,7);ctx.stroke();for(const h of HOOPS){const p=hoopAt(h.id,state.time);ctx.fillStyle=h.color;ctx.beginPath();ctx.arc(110+p.x*6,110+p.z*6,7,0,7);ctx.fill();}ctx.fillStyle='#193e59';ctx.beginPath();ctx.arc(110+state.x*6,110+state.z*6,5,0,7);ctx.fill();}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035),paused=$('#help-dialog').open||document.hidden;
 const sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
 if(!paused)tick(state,dt,{x:sx*Math.cos(yaw)+sy*Math.sin(yaw),z:-sx*Math.sin(yaw)+sy*Math.cos(yaw)});
 boy.position.set(state.x,state.y,state.z);const climbing=state.mode==='climb';
 if(climbing){boy.rotation.y=state.wall.axis==='x'?state.wall.sign*Math.PI/2:state.wall.sign===1?0:Math.PI;}
 else if(Math.hypot(sx,sy)>.1){const angle=Math.atan2(sx*Math.cos(yaw)+sy*Math.sin(yaw),-sx*Math.sin(yaw)+sy*Math.cos(yaw));boy.rotation.y+=Math.atan2(Math.sin(angle-boy.rotation.y),Math.cos(angle-boy.rotation.y))*Math.min(1,dt*10);}
 const step=Math.hypot(sx,sy)>.1?Math.sin(state.time*9)*.6:0;
 limbs.leftLeg.rotation.x=step;limbs.rightLeg.rotation.x=-step;limbs.leftArm.rotation.x=climbing?-2.5+step*.4:-step;limbs.rightArm.rotation.x=climbing?-2.5-step*.4:step;
 limbs.leftArm.rotation.z=state.mode==='fall'?.9:0;limbs.rightArm.rotation.z=-limbs.leftArm.rotation.z;
 for(const h of HOOPS){const p=hoopAt(h.id,state.time);hoopMeshes[h.id].position.set(p.x,p.y,p.z);}
 projectile.visible=!!state.shot;if(state.shot){const p=state.shot.ball;projectile.position.set(p.x,p.y,p.z);projectile.rotation.x+=dt*7;projectile.rotation.z+=dt*4;}
 const aim=state.shot?.target||hoopAt(nearestHoop(state).id,state.time);barrelPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(aim.x-CANNON.x,aim.y-CANNON.y+5,aim.z-CANNON.z).normalize());
 desired.set(state.x*.64,2+state.y*.65,state.z*.64);target.lerp(desired,1-Math.exp(-dt*4));camera.position.set(target.x+Math.sin(yaw)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(target);
 for(const w of roomWalls){const p=w.group.position,front=(p.x*camera.position.x+p.z*camera.position.z)>150;for(const m of w.materials){m.opacity=front?.12:1;m.depthWrite=!front;}w.holds.forEach(h=>h.visible=!front);}
 if(!paused&&state.event)toast(state.event);
 if((uiTick+=dt)>.12){uiTick=0;const near=nearWall(state).d<1.1,action=$('#interact');action.classList.toggle('ready',climbing||near);action.querySelector('strong').textContent=climbing?'Let go of the wall':near?'Grab the wall':'Find a climbing wall';action.querySelector('small').textContent=climbing?'Push toward the wall to climb higher':'Walk into any wall to start climbing';$('#zone').textContent=climbing?'Climbing':state.mode==='fall'?'Wheee!':'On the court';$('#motion-label').textContent=state.shot?'Watch the basketball!':climbing?`Climbing · ${state.y.toFixed(1)} m`:'Walk into a wall to climb';$('#hoop-label').textContent=state.shot?`Nearest hoop: ${HOOPS[state.shot.hoop].name}`:'Moving hoops · 3m / 6m / 9m';drawMap();}
 renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?58:48;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));});
const readState=()=>({position:{x:state.x,y:state.y,z:state.z},mode:state.mode,wall:state.wall,nearestHoop:nearestHoop(state),shots:state.shots,baskets:state.scored,bumps:state.hits,shot:state.shot,hoops:HOOPS.map(h=>({...h,...hoopAt(h.id,state.time)}))});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
register({name:'read_gym_state',description:'Read climbing position, the three moving hoops, cannon shot, baskets and bumps.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:readState});
register({name:'move_in_gym',description:'Walk or climb using the same camera-relative WASD controls for up to three seconds.',inputSchema:{type:'object',properties:{direction:{type:'string',enum:['forward','back','left','right']},seconds:{type:'number',minimum:.1,maximum:3}},required:['direction','seconds'],additionalProperties:false},annotations:{readOnlyHint:false},async execute(input){const mapping={forward:'w',back:'s',left:'a',right:'d'};if(!input||!Object.hasOwn(mapping,input.direction)||!Number.isFinite(input.seconds)||input.seconds<.1||input.seconds>3)throw new Error('Choose a direction and duration from 0.1 to 3 seconds.');if($('#help-dialog').open)throw new Error('Close help first.');const key=mapping[input.direction];keys.add(key);try{await new Promise(r=>setTimeout(r,input.seconds*1000));}finally{keys.delete(key);}return readState();}});
register({name:'jump_in_gym',description:'Jump from the floor or let go of the climbing wall.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(){jump();return readState();}});addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),600);
