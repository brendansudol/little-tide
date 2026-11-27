import * as THREE from './vendor/three.module.js';
import { shore, ground, canDive, nextDepth, petDistance, SWIMMER_Y, SHARK_REACH, REEF } from './ocean.js';
import { createReef } from './reef.js';

const canvas=document.querySelector('#world');
const scene=new THREE.Scene();scene.background=new THREE.Color('#93dfe2');scene.fog=new THREE.FogExp2('#a9e4df',.008);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}catch(error){document.querySelector('#loading').innerHTML='<p>This little world needs WebGL.<br>Try a browser with hardware acceleration turned on.</p>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,240);
scene.add(new THREE.HemisphereLight(0xd9ffff,0xc8b184,2.6));
const sun=new THREE.DirectionalLight(0xffeed3,3.8);sun.position.set(-23,40,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.06;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const sand=mat('#f2d599'),trunkMat=mat('#a17b51'),leafMat=mat('#4c9b68',{side:THREE.DoubleSide}),leafLight=mat('#79b46c',{side:THREE.DoubleSide}),skin=mat('#d99563'),shirt=mat('#f77647'),shorts=mat('#327b7b'),hair=mat('#48382d'),eye=mat('#243f43'),white=mat('#fff9e5');
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function ball(parent,m,x,y,z,sx,sy=sx,sz=sx){const o=mesh(new THREE.SphereGeometry(1,10,8),m,parent,x,y,z);o.scale.set(sx,sy,sz);return o;}
function cylinderBetween(a,b,r1,r2,m,parent){const v=new THREE.Vector3().subVectors(b,a);const o=mesh(new THREE.CylinderGeometry(r2,r1,v.length(),7),m,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function line(points,color,parent,width=1){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,linewidth:width}));parent.add(o);return o;}
let seed=47;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}function range(a,b){return a+rand()*(b-a);}
const landGeo=new THREE.PlaneGeometry(180,180,120,120);landGeo.rotateX(-Math.PI/2);let pos=landGeo.attributes.position,colors=[];
const reefSand = new THREE.Color('#75b3ae');
for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),d=z-shore(x);pos.setY(i,ground(x,z));const c=new THREE.Color(d>26?'#94ba71':d>23?'#c6c888':d<1?'#dfcc93':'#f4dbab');c.lerp(reefSand,THREE.MathUtils.smoothstep(-d,15,48));c.multiplyScalar(.97+rand()*.06);colors.push(c.r,c.g,c.b);}landGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));landGeo.computeVertexNormals();
const seaFloor = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const rippleTime = { value: 0 };
seaFloor.onBeforeCompile = shader => {
  shader.uniforms.rippleTime = rippleTime;
  shader.vertexShader = 'varying vec3 beachPoint;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>', '#include <begin_vertex>\nbeachPoint = position;'
  );
  shader.fragmentShader = 'varying vec3 beachPoint;\nuniform float rippleTime;\n' +
    shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float submerged = smoothstep(1.5, 5.0, -beachPoint.y);
      if (submerged > 0.0) {
        vec2 p = beachPoint.xz * 1.55;
        float t = rippleTime * .42;
        vec2 wave = p + .7 * vec2(sin(p.y * .6 + t), cos(p.x * .72 - t));
        float ridge = abs(sin(wave.x + t * .4) + .84 * cos(wave.y - t * .3));
        float light = 1.0 - smoothstep(.02, .22, ridge);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(.54, .81, .9), submerged);
        diffuseColor.rgb += submerged * light * vec3(.10, .17, .14);
      }`);
};
mesh(landGeo, seaFloor, scene);
const waterGeo=new THREE.PlaneGeometry(180,100,140,90);waterGeo.rotateX(-Math.PI/2);const wp=waterGeo.attributes.position;
for(let i=0;i<wp.count;i++){const x=wp.getX(i),t=(wp.getZ(i)+50)/100;wp.setZ(i,shore(x)-t*120);wp.setY(i,.38);}waterGeo.computeVertexNormals();
const waterMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`uniform float time;varying vec3 vP;void main(){vec3 p=position;p.y+=sin(p.x*.7+p.z*.6+time*.9)*.038;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float time;varying vec3 vP;void main(){float depth=clamp(-vP.z/42.,0.,1.);vec3 c=mix(vec3(.19,.78,.72),vec3(.04,.51,.63),depth);float a=sin(vP.x*1.9+sin(vP.z*1.5+time*.36)*2.+time*.4);float b=sin(vP.z*2.2+sin(vP.x*1.4-time*.3)*1.7);float shimmer=pow(max(0.,a*b),13.);c+=vec3(.30,.40,.30)*shimmer*.42;float band=pow(max(0.,sin(vP.z*1.2+vP.x*.24+time*.7)),35.)*.08;c+=band;gl_FragColor=vec4(c,.48+depth*.28);}`});const ocean=mesh(waterGeo,waterMat,scene);ocean.castShadow=false;ocean.receiveShadow=false;ocean.renderOrder=2;
const foam=[];for(let k=0;k<3;k++){const points=[];for(let x=-85;x<=85;x+=.45)points.push([x,.44,shore(x)-k*.75]);const f=line(points,'#fffdea',scene);f.material.opacity=.43-k*.1;f.renderOrder=3;foam.push(f);}
// Broad, faceted palm fronds give the island a handmade toy-world silhouette.
function palm(x,z,height,lean){const group=new THREE.Group();group.position.set(x,ground(x,z),z);scene.add(group);let prev=new THREE.Vector3();for(let i=1;i<=9;i++){const p=new THREE.Vector3(lean*Math.pow(i/9,2),height*i/9,0);cylinderBetween(prev,p,.19-(i-1)*.009,.19-i*.009,trunkMat,group);prev=p;}
for(let i=0;i<8;i++){const a=i*Math.PI/4+range(-.15,.15),len=range(3.1,4.3),verts=[],ids=[];for(let j=0;j<=9;j++){const t=j/9,w=Math.sin(Math.PI*t)*.54;const d=len*t,yy=height+Math.sin(t*Math.PI)*.7-t*t*1.1;for(let side=-1;side<=1;side++){verts.push(lean+Math.cos(a)*d+Math.sin(a)*w*side,yy+(side===0?.12:0),Math.sin(a)*d-Math.cos(a)*w*side);}}
for(let j=0;j<9;j++)for(let k=0;k<2;k++){let n=j*3+k;ids.push(n,n+3,n+1,n+1,n+3,n+4);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(ids);g.computeVertexNormals();mesh(g,i%2?leafMat:leafLight,group);}for(let i=0;i<3;i++)ball(group,mat('#897040'),lean+Math.cos(i*2)*.3,height-.25,Math.sin(i*2)*.3,.25);}
[[-9,7,7,1.1],[-20,11,8.5,-.6],[-14,15,6.9,1.2],[16,11,7.8,-1],[24,16,8.8,-1.4],[-32,16,8,1],[33,10,7,-1],[7,28,8,-1]].forEach(p=>palm(...p));
const rockMat=mat('#99a49a');for(const [x,z,s] of [[-21,-1,2.5],[-24,0,1.6],[-19,-2,1.2],[19,1,2],[22,2,2.8],[24,0,1.6],[-8,19,1.7]]){const r=mesh(new THREE.DodecahedronGeometry(1,0),rockMat,scene,x,ground(x,z)+s*.28,z);r.scale.set(s,s*.65,s*.85);r.rotation.set(rand(),rand()*3,rand());}
for(let i=0;i<170;i++){const x=range(-44,44),z=range(1,33);if(z<shore(x)+.2)continue;const o=mesh(new THREE.IcosahedronGeometry(range(.025,.095),0),mat(i%3?'#dcc18c':'#fff1d0'),scene,x,ground(x,z)+.03,z);o.scale.y=.35;}
// Beach umbrella, towel and shells.
const umbrella=new THREE.Group();umbrella.position.set(-9,ground(-9,10),10);scene.add(umbrella);mesh(new THREE.CylinderGeometry(.055,.055,3.7,8),white,umbrella,0,1.85,0);for(let i=0;i<10;i++){const a=i/10*Math.PI*2,b=(i+1)/10*Math.PI*2;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,3.9,0,Math.cos(a)*2,3.15,Math.sin(a)*2,Math.cos(b)*2,3.15,Math.sin(b)*2],3));g.computeVertexNormals();mesh(g,mat(i%2?'#fff3d6':'#ef855f',{side:THREE.DoubleSide}),umbrella);}ball(umbrella,white,0,3.93,0,.09);const towel=mesh(new THREE.PlaneGeometry(1.6,2.7),mat('#e6f4db',{side:THREE.DoubleSide}),scene,-7,ground(-7,11)+.04,11);towel.rotation.x=-Math.PI/2;towel.rotation.z=-.25;for(let i=0;i<5;i++){const stripe=mesh(new THREE.PlaneGeometry(1.6,.14),mat('#78b8ab'),towel,0,-1+i*.48,.01);} 
function star(x,z,size,color){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?size*.37:size;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();const m=mesh(new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.03}),mat(color),scene,x,ground(x,z)+.06,z);m.rotation.x=-Math.PI/2;}
star(4,2,.37,'#ef986d');star(-4,4,.24,'#f2ad70');star(11,-4,.45,'#e3a57a');
const grassMat=mat('#559e7e',{side:THREE.DoubleSide});for(let i=0;i<70;i++){const x=range(-27,27),z=range(-19,-5);const h=range(.25,.7);const g=new THREE.Group();g.position.set(x,ground(x,z),z);scene.add(g);for(let j=0;j<3;j++){const blade=mesh(new THREE.ConeGeometry(.08,h,3),grassMat,g,range(-.15,.15),h*.5,range(-.15,.15));blade.rotation.z=range(-.4,.4);}}
// The boy: articulated arms and legs, soft rounded forms, and a little wind-swept fringe.
const boy=new THREE.Group();scene.add(boy);boy.position.set(0,ground(0,6),6);const body=new THREE.Group();boy.add(body);
mesh(new THREE.CylinderGeometry(.26,.29,.58,8),shirt,body,0,.92,0);ball(body,skin,0,1.53,0,.31,.35,.29);ball(body,hair,0,1.75,-.045,.325,.2,.3);ball(body,hair,-.14,1.76,.2,.2,.13,.1);ball(body,hair,.1,1.78,.19,.18,.11,.11);ball(body,skin,-.31,1.5,0,.067,.09,.065);ball(body,skin,.31,1.5,0,.067,.09,.065);ball(body,eye,-.105,1.55,.27,.025,.035,.018);ball(body,eye,.105,1.55,.27,.025,.035,.018);ball(body,skin,0,1.47,.291,.047,.044,.06);line([[-.055,1.4,.267],[0,1.39,.28],[.055,1.4,.267]],'#8f4a34',body);
const limbs={};for(const side of [-1,1]){let arm=new THREE.Group();arm.position.set(side*.32,1.13,0);body.add(arm);mesh(new THREE.CylinderGeometry(.105,.10,.22,8),shirt,arm,side*.02,-.07,0);mesh(new THREE.CylinderGeometry(.078,.085,.34,8),skin,arm,side*.035,-.30,0);ball(arm,skin,side*.035,-.47,0,.087);limbs[side===-1?'leftArm':'rightArm']=arm;let leg=new THREE.Group();leg.position.set(side*.15,.65,0);body.add(leg);mesh(new THREE.CylinderGeometry(.13,.125,.26,8),shorts,leg,0,-.1,0);mesh(new THREE.CylinderGeometry(.075,.09,.30,8),skin,leg,0,-.35,0);ball(leg,skin,0,-.53,.055,.1,.075,.17);limbs[side===-1?'leftLeg':'rightLeg']=leg;}
const ring=mesh(new THREE.TorusGeometry(.43,.12,8,24),mat('#ffb85f'),body,0,.72,0);ring.rotation.x=Math.PI/2;ring.visible=false;
// Gentle rays with animated pectoral fins and spotted backs.
const rays=[];const rayMat=mat('#607f83',{side:THREE.DoubleSide}),raySpot=mat('#aac3b6');
function makeRay(x,z,name,index){const group=new THREE.Group();scene.add(group);const core=ball(group,rayMat,0,0,0,.57,.12,.64);const wings=[];for(const side of [-1,1]){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.52,side*1.38,-.035,-.12,0,0,-.55,side*.42,.12,-.05],3));geo.setIndex([0,1,3,1,2,3,2,0,3]);geo.computeVertexNormals();wings.push(mesh(geo,rayMat,group));ball(group,eye,side*.2,.13,.32,.047,.04,.045);for(let j=0;j<4;j++)ball(group,raySpot,side*(.3+j*.12),.09-j*.014,.04-j*.09,.04,.011,.035);}
const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,-.4),new THREE.Vector3(.02,-.03,-.95),new THREE.Vector3(.17,.05,-1.55),new THREE.Vector3(.28,.1,-1.95)]);mesh(new THREE.TubeGeometry(tailCurve,14,.024,5,false),rayMat,group);group.position.set(x,ground(x,z)+.55,z);rays.push({kind:'ray',group,wings,x,z,name,index,pet:0});}
makeRay(1,-4.5,'Sunny',0);makeRay(8,-9,'Pebble',1);makeRay(-10,-11,'Ripple',2);makeRay(17,-17,'Blue',3);
const shrimp=[];const shrimpMat=mat('#ed936e'),shrimpTail=mat('#f7b895');
for(let i=0;i<15;i++){const x=i<6?-4+(i%3)*.8:range(-16,15),z=i<6?-2.2-Math.floor(i/3)*1.1:range(-13,-3);const g=new THREE.Group();scene.add(g);for(let j=0;j<6;j++)ball(g,j%2?shrimpMat:shrimpTail,0,Math.sin(j*.45)*.12,-j*.10,.10-j*.009,.09-j*.006,.09);ball(g,shrimpMat,0,.12,-.63,.18,.035,.09);for(const side of [-1,1]){ball(g,eye,side*.055,.05,.11,.025);line([[side*.055,.06,.1],[side*.18,.13,.3],[side*.29,.14,.39]],'#da8f69',g);for(let j=0;j<3;j++)line([[0,.015,-j*.11],[side*.17,-.06,-j*.11-.07]],'#df9875',g);}g.scale.setScalar(1.3);g.position.set(x,ground(x,z)+.22,z);shrimp.push({group:g,x,z});}
// Distant islands and seabirds keep the horizon alive.
for(const [x,z,s] of [[-49,-48,10],[35,-65,13],[66,-47,8]]){let island=mesh(new THREE.SphereGeometry(1,9,6),mat('#79ae98'),scene,x,-.6,z);island.scale.set(s,2.4,s*.6);}const birds=[];for(let i=0;i<6;i++){const b=new THREE.Group();line([[-.5,0,0],[-.2,.14,0],[0,0,0],[.2,.14,0],[.5,0,0]],'#f6fff3',b);scene.add(b);birds.push(b);}
const reef = createReef(scene, { mat, mesh, ball });
const oceanFriends = [...rays, reef.friend];
const keys=new Set();let yaw=.28,pitch=.69,distance=25,drag=false,lastX=0,lastY=0,jumpV=0,jumpY=0,petUntil=0,joy={x:0,y:0},touchId=null,toastTimer;
const discovered = { ray: false, shrimp: false, shark: false };
let diving = false, depth = 0, viewBlend = 0;
const $=s=>document.querySelector(s);function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3800);}
function discover(kind) {
  if (discovered[kind]) return;
  discovered[kind] = true;
  const card = $('#' + kind + '-card');
  card.classList.add('found');
  card.querySelector('.check').textContent = '✓';
  const friends = Object.values(discovered);
  $('#friend-count').textContent = friends.filter(Boolean).length + ' / ' + friends.length;
  if (kind === 'shrimp') {
    $('#shrimp-status').textContent = 'Tiny dancers, big personalities';
    toast('Little shrimp! You found the shallows’ tiny dancers.');
  } else {
    $('#' + kind + '-status').textContent = kind === 'shark' ? 'Finn loves a gentle pat' : 'A new friend, gently petted';
  }
}
function nearbyFriend(kind) {
  let nearest = null, best = Infinity;
  for (const friend of oceanFriends) {
    if (kind && friend.kind !== kind) continue;
    const p = friend.group.position;
    // Rays can be petted from the surface as they glide beneath the swimmer.
    const distance = friend.kind === 'ray' && depth === 0
      ? Math.hypot(boy.position.x - p.x, boy.position.z - p.z)
      : petDistance(boy.position, p);
    if (distance < (friend.kind === 'shark' ? SHARK_REACH : 2.9) && distance < best) {
      nearest = friend;
      best = distance;
    }
  }
  return nearest;
}
function pet(friend) {
  const now = performance.now();
  if (now < petUntil) return;
  friend.pet = petUntil = now + 2500;
  const p = friend.group.position;
  boy.rotation.y = Math.atan2(p.x - boy.position.x, p.z - boy.position.z);
  discover(friend.kind);
  toast(friend.kind === 'shark' ? 'Finn gives a happy tail wiggle!' : friend.name + ' loves that gentle pat!');
  for (let i = 0; i < 7; i++) makeHeart(p, i);
  chime();
}
function setDiving(value) {
  if (value && !canDive(boy.position.x, boy.position.z)) return;
  diving = value;
  jumpV = jumpY = 0;
}
function interact() {
  const friend = nearbyFriend();
  if (friend) pet(friend);
  else if (canDive(boy.position.x, boy.position.z)) setDiving(!diving);
  else toast('Meet the stingrays in the shallows or swim out to the striped buoy.');
}
const hearts=[];const heartShape=new THREE.Shape();heartShape.moveTo(0,.1);heartShape.bezierCurveTo(.35,.45,.55,.0,0,-.35);heartShape.bezierCurveTo(-.55,0,-.35,.45,0,.1);const heartGeo=new THREE.ShapeGeometry(heartShape);
function makeHeart(p,i){const y=depth>.3?p.y+.7:Math.max(.8,p.y+.35);const h=mesh(heartGeo,new THREE.MeshBasicMaterial({color:i%2?'#ffad8b':'#f87666',side:THREE.DoubleSide,transparent:true}),scene,p.x+range(-.5,.5),y+i*.13,p.z+range(-.3,.3));h.scale.setScalar(.35);h.renderOrder=4;hearts.push({mesh:h,born:performance.now()+i*90});}
function jump() {
  if (diving || depth > 0) setDiving(false);
  else if (jumpY === 0) jumpV = 4.5;
}
addEventListener('keydown', e => {
  if ($('#help-dialog').open) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  const key = e.key.toLowerCase();
  keys.add(key);
  if (e.repeat) return;
  if (e.code === 'Space') jump();
  if (key === 'c') setDiving(!diving);
  if (key === 'e') interact();
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();joy={x:0,y:0};drag=false;});
const pointers=new Map();let pinchDistance=0;
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);distance=THREE.MathUtils.clamp(distance-(d-pinchDistance)*.055,10,38);pinchDistance=d;lastX=e.clientX;lastY=e.clientY;return;}yaw-=(e.clientX-lastX)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.003,.3,1.15);lastX=e.clientX;lastY=e.clientY;});canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);drag=false;});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=false;});canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.02,10,38);},{passive:false});
$('#interact').onclick=interact;$('#jump').onclick=jump;$('#help').onclick=()=>{keys.clear();$('#help-dialog').showModal();};$('#close-help').onclick=$('#back').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog'))$('#help-dialog').close();});
const joystick=$('#joystick');function moveJoy(e){const b=joystick.getBoundingClientRect(),x=e.clientX-b.left-48,y=e.clientY-b.top-48,l=Math.max(32,Math.hypot(x,y));joy={x:x/l,y:y/l};$('#stick').style.transform=`translate(${joy.x*29}px,${joy.y*29}px)`;}
joystick.addEventListener('pointerdown',e=>{touchId=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);});joystick.addEventListener('pointermove',e=>{if(touchId===e.pointerId)moveJoy(e);});function resetJoy(){touchId=null;joy={x:0,y:0};$('#stick').style.transform='none';}joystick.addEventListener('pointerup',resetJoy);joystick.addEventListener('pointercancel',resetJoy);
let audioCtx,audioGain,soundOn=false;function setupAudio(){audioCtx=new (window.AudioContext||window.webkitAudioContext)();const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*4,audioCtx.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.04-.02)/1.02;data[i]=brown*3;}const source=audioCtx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;audioGain=audioCtx.createGain();audioGain.gain.value=0;source.connect(filter).connect(audioGain).connect(audioCtx.destination);source.start();}
$('#sound').onclick=async()=>{try{if(!audioCtx)setupAudio();await audioCtx.resume();soundOn=!soundOn;audioGain.gain.setTargetAtTime(soundOn?.24:0,audioCtx.currentTime,.4);$('#sound .off-dot').style.display=soundOn?'none':'block';$('#sound').setAttribute('aria-label',soundOn?'Turn ocean sound off':'Turn ocean sound on');$('#sound').title=soundOn?'Turn ocean sound off':'Turn ocean sound on';}catch{toast('Ocean sound is unavailable in this browser.');}};
function chime(){if(!soundOn)return;[523.25,659.25,783.99].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*.12;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.065,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.6);o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+.6);});}
const map = $('#map'), ctx = map.getContext('2d');
const mapX = x => 110 + x * 1.85, mapZ = z => 132 + z * 1.85;
const mapSea = ctx.createLinearGradient(0, 20, 0, 125);
mapSea.addColorStop(0, '#357f90');
mapSea.addColorStop(1, '#85cec1');
function drawMap() {
  ctx.fillStyle = mapSea;
  ctx.fillRect(0, 0, 220, 220);
  ctx.beginPath();
  for (let x = -60; x <= 60; x += 2) ctx.lineTo(mapX(x), mapZ(shore(x)));
  ctx.strokeStyle = '#eff4c9';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.lineTo(222, 220);
  ctx.lineTo(-2, 220);
  ctx.fillStyle = '#e8d9a4';
  ctx.fill();
  ctx.fillStyle = '#407c7e';
  for (const r of rays) {
    ctx.beginPath();
    ctx.ellipse(mapX(r.group.position.x), mapZ(r.group.position.z), 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff7df';
  ctx.fillStyle = '#f5ab51';
  ctx.fillRect(mapX(REEF.x) - 3, mapZ(REEF.z) - 4, 6, 8);
  ctx.strokeRect(mapX(REEF.x) - 3, mapZ(REEF.z) - 4, 6, 8);
  ctx.fillStyle = '#ff8054';
  ctx.beginPath();
  ctx.arc(mapX(boy.position.x), mapZ(boy.position.z), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
const action = $('#interact'), actionTitle = action.querySelector('strong'), actionHint = action.querySelector('small');
const label = $('#creature-label'), labelPoint = new THREE.Vector3();
function updateHud() {
  const p = boy.position, underwater = depth > .25, offshore = canDive(p.x, p.z);
  const inWater = p.z < shore(p.x) - .5;
  const friend = nearbyFriend();
  $('#zone').textContent = underwater ? Math.max(1, Math.round(depth)) + ' m deep' :
    offshore ? 'Over the reef' : swimming ? 'Swimming' : inWater ? 'In the shallows' : 'On the beach';
  $('#weather-name').textContent = underwater ? 'Shark reef' : 'Sunny shores';
  $('.weather .sun').textContent = underwater ? '≈' : '☀';
  document.body.classList.toggle('submerged', underwater);
  $('#jump').setAttribute('aria-label', diving || depth > 0 ? 'Swim to the surface' : 'Jump');
  $('#space-action').textContent = diving || depth > 0 ? 'surface' : 'jump';
  action.classList.toggle('ready', Boolean(friend) || offshore);
  action.classList.toggle('water-action', !friend && offshore);
  action.querySelector('.action-key').textContent = friend ? 'E' : offshore ? 'C' : '↑';
  action.querySelector('.interact-icon').textContent = friend ? '♡' : '≈';
  if (friend) {
    actionTitle.textContent = friend.kind === 'shark' ? 'Pet Finn' : 'Say hello to ' + friend.name;
    actionHint.textContent = 'Give this friendly ' + (friend.kind === 'shark' ? 'shark' : 'stingray') + ' a gentle pat';
  } else if (offshore) {
    actionTitle.textContent = diving ? 'Surface' : 'Dive to the reef';
    actionHint.textContent = diving ? 'Float back up whenever you like' : 'Look for Finn by the striped buoy';
  } else {
    actionTitle.textContent = swimming ? 'Swim toward the striped buoy' : inWater ? 'Meet your ocean neighbors' : 'Dip your toes in';
    actionHint.textContent = swimming ? 'The water gets deeper out there' : inWater ? 'Get close to a stingray to pet it' : 'Walk toward the turquoise water';
  }
  for (const s of shrimp) {
    if (Math.hypot(s.group.position.x - p.x, s.group.position.z - p.z) < 2.4) { discover('shrimp'); break; }
  }
  if (underwater) {
    labelPoint.copy(reef.friend.group.position);
    labelPoint.y += 1.48;
    $('#creature-name').textContent = 'Finn the friendly shark';
  } else if (swimming) {
    labelPoint.copy(reef.buoy.position);
    labelPoint.y += 1.7;
    $('#creature-name').textContent = 'Shark reef';
  } else {
    labelPoint.copy(rays[0].group.position);
    labelPoint.y += .8;
    $('#creature-name').textContent = 'A friendly stingray';
  }
  const showLabel = swimming ? labelPoint.distanceTo(p) < (underwater ? 17 : 37) : !discovered.ray;
  labelPoint.project(camera);
  label.hidden = !showLabel || Math.abs(labelPoint.z) > 1 || Math.abs(labelPoint.x) > .94 || Math.abs(labelPoint.y) > .94;
  label.style.left = (labelPoint.x * .5 + .5) * innerWidth + 'px';
  label.style.top = (-labelPoint.y * .5 + .5) * innerHeight + 'px';
  drawMap();
}
const target=new THREE.Vector3(0,0,0),desired=new THREE.Vector3(),clock=new THREE.Clock();let uiTick=0;let moving=false;let swimming=false;
const beachSky = scene.background.clone(), seaMist = scene.fog.color.clone(), deepWater = new THREE.Color('#257f91');
function updateCamera(dt) {
  const p = boy.position;
  const immersion = THREE.MathUtils.smoothstep(depth, 0, .85);
  viewBlend = THREE.MathUtils.lerp(viewBlend, immersion, 1 - Math.exp(-dt * 4));
  // A portrait screen still needs room for the swimmer and Finn side by side.
  const zoom = THREE.MathUtils.lerp(1, THREE.MathUtils.clamp(camera.aspect / .9, .45, 1), viewBlend);
  if (Math.abs(camera.zoom - zoom) > .001) {
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }
  desired.set(p.x - Math.sin(yaw) * 1.6 * viewBlend, (p.y + .75) * viewBlend,
    p.z - 3.8 * (1 - viewBlend) - Math.cos(yaw) * 1.6 * viewBlend);
  if (viewBlend > .01) {
    const finn = reef.friend.group.position;
    const framing = .32 * viewBlend * (1 - THREE.MathUtils.smoothstep(petDistance(p, finn), 3, 6));
    desired.lerp(finn, framing);
  }
  target.lerp(desired, 1 - Math.exp(-dt * 4));
  const boom = THREE.MathUtils.lerp(distance, THREE.MathUtils.clamp(distance * .41, 5.5, 12), viewBlend);
  const angle = pitch * (1 - .58 * viewBlend);
  camera.position.set(target.x + Math.sin(yaw) * boom * Math.cos(angle), target.y + Math.sin(angle) * boom,
    target.z + Math.cos(yaw) * boom * Math.cos(angle));
  if (viewBlend > .001) {
    const floor = ground(camera.position.x, camera.position.z) + .7;
    camera.position.y = Math.max(floor, THREE.MathUtils.lerp(camera.position.y, Math.min(camera.position.y, -.25), viewBlend));
  }
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const tint = THREE.MathUtils.smoothstep(.38 - camera.position.y, 0, 1.2);
  scene.background.copy(beachSky).lerp(deepWater, tint);
  scene.fog.color.copy(seaMist).lerp(deepWater, tint);
  scene.fog.density = THREE.MathUtils.lerp(.008, .043, tint);
  sun.intensity = THREE.MathUtils.lerp(3.8, 2.5, tint);
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime,now=performance.now();waterMat.uniforms.time.value=rippleTime.value=t;
let sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;if($('#help-dialog').open)sx=sy=0;const mag=Math.hypot(sx,sy);moving=mag>.08;
if (moving) {
  sx /= Math.max(1, mag);
  sy /= Math.max(1, mag);
  const vx = sx * Math.cos(yaw) + sy * Math.sin(yaw), vz = -sx * Math.sin(yaw) + sy * Math.cos(yaw);
  const speed = (keys.has('shift') ? 6.5 : 4) * (swimming && !diving ? .74 : 1);
  boy.position.x = THREE.MathUtils.clamp(boy.position.x + vx * dt * speed, -37, 37);
  boy.position.z = THREE.MathUtils.clamp(boy.position.z + vz * dt * speed, -54, 30);
  const turn = Math.atan2(vx, vz) - boy.rotation.y;
  boy.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 12);
}
swimming = boy.position.z < shore(boy.position.x) - 5.8;
if (!canDive(boy.position.x, boy.position.z)) diving = false;
depth = nextDepth(depth, diving, boy.position.x, boy.position.z, dt);
if(jumpV!==0||jumpY>0){jumpY+=jumpV*dt;jumpV-=12*dt;if(jumpY<0){jumpY=0;jumpV=0;}}
boy.position.y = (swimming ? SWIMMER_Y - depth + Math.sin(t * 2) * .055 : ground(boy.position.x, boy.position.z)) + jumpY;
const stroke = THREE.MathUtils.smoothstep(depth, 0, .85);
ring.visible = swimming && stroke < .35;
body.rotation.x = swimming ? .15 + stroke * .96 : 0;
body.position.z = -.72 * stroke;
const walk=moving?Math.sin(t*(keys.has('shift')?14:10))*.65:Math.sin(t*2)*.025;
limbs.leftLeg.rotation.x=walk;limbs.rightLeg.rotation.x=-walk;
limbs.leftArm.rotation.x=-walk*.8-stroke*.9;limbs.rightArm.rotation.x=now<petUntil?-1.2+Math.sin(t*10)*.16:walk*.8-stroke*.9;limbs.rightArm.rotation.z=now<petUntil?-.38:0;body.position.y=moving&&!swimming?Math.abs(Math.sin(t*10))*.045:0;
reef.update(dt, t, now, boy.position);
for(const r of rays){const petted=now<r.pet;const a=t*.15+r.index*2;r.group.position.x=r.x+Math.sin(a)*1.15;r.group.position.z=r.z+Math.cos(a*.8)*.7;r.group.position.y=Math.max(-1.55,ground(r.group.position.x,r.group.position.z)+.47)+Math.sin(t*1.4+r.index)*.075;r.group.rotation.y=Math.atan2(Math.cos(a)*.17,-Math.sin(a*.8)*.084);r.wings.forEach((w,i)=>w.rotation.z=Math.sin(t*(petted?5:2)+r.index)*.13*(i===0?1:-1));}
for(let i=0;i<shrimp.length;i++){const s=shrimp[i];s.group.position.x=s.x+Math.sin(t*.9+i)*.18;s.group.position.y=ground(s.group.position.x,s.z)+.22+Math.abs(Math.sin(t*2+i))*.05;s.group.rotation.y=Math.sin(t*.5+i)*.4;}
for(let i=0;i<birds.length;i++){birds[i].position.set(Math.sin(t*.035+i)*29,12+i*.7,-20+Math.cos(t*.035+i)*14);birds[i].rotation.y=-t*.035-i;birds[i].rotation.z=Math.sin(t*3+i)*.12;}
foam.forEach((f,i)=>{f.position.z=Math.sin(t*.7-i*.9)*.3;f.material.opacity=(.31-i*.075)+Math.sin(t*.7-i*.9)*.09;});
for(let i=hearts.length-1;i>=0;i--){const h=hearts[i],life=(now-h.born)/1800;h.mesh.visible=life>=0;h.mesh.position.y+=dt*.6;h.mesh.quaternion.copy(camera.quaternion);h.mesh.material.opacity=Math.max(0,1-life);if(life>1){scene.remove(h.mesh);h.mesh.material.dispose();hearts.splice(i,1);}}
updateCamera(dt);
if ((uiTick += dt) > .1) { uiTick = 0; updateHud(); }
if(audioGain&&soundOn)audioGain.gain.setTargetAtTime(.19+Math.sin(t*.4)*.06,audioCtx.currentTime,.5);renderer.render(scene,camera);}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
const rounded = value => Math.round(value * 100) / 100;
const readState = () => ({
  position: { x: rounded(boy.position.x), y: rounded(boy.position.y), z: rounded(boy.position.z) },
  swimming, diving, depth: rounded(depth), canDive: canDive(boy.position.x, boy.position.z),
  discovered: { ...discovered },
  nearbyRay: nearbyFriend('ray')?.name ?? null,
  nearbyShark: nearbyFriend('shark')?.name ?? null,
});
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_beach_state',description:'Read the swimmer’s position, depth, dive availability, nearby stingray or shark, and discovered ocean friends.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:readState});
 register({name:'walk_on_beach',description:'Move the boy using the same camera-relative directions as the movement controls, for up to three seconds.',inputSchema:{type:'object',properties:{direction:{type:'string',enum:['forward','back','left','right']},seconds:{type:'number',minimum:.1,maximum:3}},required:['direction','seconds'],additionalProperties:false},annotations:{readOnlyHint:false},async execute(input){const mapping={forward:'w',back:'s',left:'a',right:'d'};if(!input||!Object.hasOwn(mapping,input.direction)||typeof input.seconds!=='number'||!Number.isFinite(input.seconds)||input.seconds<.1||input.seconds>3)throw new Error('Choose a direction and a duration from 0.1 to 3 seconds.');if($('#help-dialog').open)throw new Error('Close the controls panel before walking.');const key=mapping[input.direction];keys.add(key);try{await new Promise(resolve=>setTimeout(resolve,input.seconds*1000));}finally{keys.delete(key);}return readState();}});
 register({name:'set_beach_diving',description:'Dive toward the reef floor in deep water or float back to the surface.',inputSchema:{type:'object',properties:{diving:{type:'boolean'}},required:['diving'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){
   if ($('#help-dialog').open) throw new Error('Close the controls panel first.');
   if (typeof input?.diving !== 'boolean') throw new Error('Choose whether to dive.');
   if (input.diving && !canDive(boy.position.x, boy.position.z)) throw new Error('Swim out toward the striped buoy first.');
   setDiving(input.diving);
   return readState();
 }});
 for (const [kind, species] of [['ray','stingray'], ['shark','shark']]) {
   register({name:'pet_nearby_' + species,description:'Gently pet a ' + species + ' within reach.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(){
     const friend = nearbyFriend(kind);
     if (!friend) throw new Error('Get closer to the ' + species + ' first.');
     pet(friend);
     return readState();
   }});
 }
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
animate();$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),600);
