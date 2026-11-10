// Car World simulation. Rendering and input devices share these same rules.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const COURSE=[[-20,12],[-12,7],[-21,1],[-12,-5],[-20,-11],[-10,-15]].map(([x,z],i)=>({x,z,number:i+1}));
export const CAFE={x:13,z:-8.2};
export const WASH={x:27,entry:10,exit:-10.5,duration:9};
export const MUD=[{x:13,z:14,rx:7,rz:3.3},{x:-35,z:8,rx:3.2,rz:7}];
export const SOLIDS=[{x:13,z:-15.8,w:14,d:8},{x:23,z:0,w:.7,d:14},{x:31,z:0,w:.7,d:14}];
export const CONES=COURSE.flatMap((p,i)=>{const q=COURSE[Math.min(i+1,5)],prev=COURSE[Math.max(i-1,0)],dx=q.x-prev.x,dz=q.z-prev.z,len=Math.hypot(dx,dz);return[-1,1].map(side=>({x:p.x+side*dz/len*3.8,z:p.z-side*dx/len*3.8}));});
export const TRACK_LENGTH=176+16*Math.PI;
export function trafficPose(distanceAlong){
 let d=((distanceAlong%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH;
 const straight=(length,fn)=>{if(d<=length)return fn(d);d-=length;return null;};
 let p=straight(52,t=>({x:-26+t,z:26,yaw:Math.PI/2}));if(p)return p;
 p=straight(4*Math.PI,t=>{const a=Math.PI/2-t/8;return{x:26+8*Math.cos(a),z:18+8*Math.sin(a),yaw:Math.PI-a};});if(p)return p;
 p=straight(36,t=>({x:34,z:18-t,yaw:Math.PI}));if(p)return p;
 p=straight(4*Math.PI,t=>{const a=-t/8;return{x:26+8*Math.cos(a),z:-18+8*Math.sin(a),yaw:Math.PI-a};});if(p)return p;
 p=straight(52,t=>({x:26-t,z:-26,yaw:-Math.PI/2}));if(p)return p;
 p=straight(4*Math.PI,t=>{const a=-Math.PI/2-t/8;return{x:-26+8*Math.cos(a),z:-18+8*Math.sin(a),yaw:Math.PI-a};});if(p)return p;
 p=straight(36,t=>({x:-34,z:-18+t,yaw:0}));if(p)return p;
 const a=Math.PI-d/8;return{x:-26+8*Math.cos(a),z:18+8*Math.sin(a),yaw:Math.PI-a};
}
export function createState(){return{x:3,z:21,y:0,yaw:Math.PI,vy:0,time:0,mode:'walk',car:{x:0,z:20,yaw:Math.PI,speed:0,steer:0,dirt:0},npcs:[['Pip',12,5.2],['Olive',89,5.6],['Sunny',164,5.4]].map(([name,d,speed])=>({name,d,speed,reply:0,...trafficPose(d)})),course:{active:false,next:0,time:0,penalty:0,runs:0,best:null,last:null,cooldown:0},cones:CONES.map(()=>0),wash:null,washes:0,food:0,orders:0,badges:{course:false,breakfast:false,clean:false},friends:[],greeting:0,socialCooldown:0,eatCooldown:0,event:'',effect:null,muddy:false,odometer:0};}
export function position(s){return s.mode==='walk'?s:s.car;}
export function nearCar(s){return s.mode==='walk'&&distance(s,s.car)<3.9;}
export function nearCafe(s){return s.mode==='walk'&&distance(s,CAFE)<3.3;}
function blocked(x,z,r){return Math.abs(x)>45-r||Math.abs(z)>37-r||SOLIDS.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
function move(body,dx,dz,r){const x=clamp(body.x+dx,-45+r,45-r),z=clamp(body.z+dz,-37+r,37-r);let hit=false;if(!blocked(x,body.z,r))body.x=x;else hit=true;if(!blocked(body.x,z,r))body.z=z;else hit=true;return hit;}
function event(s,message,effect){s.event=message;s.effect=effect||null;}
export function toggleCar(s){
 if(s.mode==='wash')return false;
 if(s.mode==='walk'){if(!nearCar(s))return false;s.mode='drive';s.car.speed=0;s.y=0;s.vy=0;event(s,'Buckle up! W / S to drive, A / D to steer.','enter');return true;}
 const c=s.car;
 for(const a of [c.yaw+Math.PI/2,c.yaw-Math.PI/2,c.yaw+Math.PI]){const x=c.x+Math.sin(a)*3,z=c.z+Math.cos(a)*3;if(blocked(x,z,.45)||s.npcs.some(n=>Math.hypot(x-n.x,z-n.z)<2.5))continue;s.x=x;s.z=z;s.y=0;s.vy=0;s.yaw=c.yaw;c.speed=0;s.mode='walk';if(s.course.active){s.course.active=false;s.course.next=0;event(s,'Course paused? Start again at gate 1 whenever you like.');}else event(s,'A little stroll. Press H to wave to a neighbor!');return true;}
 event(s,'A little more space, please! Move the car before hopping out.');return false;
}
export function jump(s){if(s.mode==='walk'&&s.y<.02){s.vy=7;return true;}return false;}
export function orderSandwich(s){if(!nearCafe(s)||s.food)return false;s.food=3;s.orders++;s.badges.breakfast=true;event(s,'One vegan breakfast sandwich, made with love! Press B for a bite.','breakfast');return true;}
export function eat(s){if(s.mode!=='walk'||!s.food||s.eatCooldown>0)return false;s.food--;s.eatCooldown=.7;event(s,s.food?'Mmm! Tofu scramble, avocado, and melty plant-based cheddar.':'Last delicious bite. Compliments to the chef!','crumbs');return true;}
export function social(s){if(s.mode==='wash'||s.socialCooldown>0)return false;s.socialCooldown=1.3;s.greeting=2.5;const p=position(s),n=[...s.npcs].sort((a,b)=>distance(a,p)-distance(b,p))[0];if(distance(n,p)<18){n.reply=3.2;if(!s.friends.includes(n.name))s.friends.push(n.name);event(s,`${n.name} ${s.mode==='drive'?'beeps':'waves'} back. Hello, neighbor!`,s.mode==='drive'?'honk':'wave');}else event(s,s.mode==='drive'?'Beep beep! A cheerful hello.':'Hello, little neighborhood!',s.mode==='drive'?'honk':'wave');return true;}
export function home(s){s.x=3;s.z=21;s.y=0;s.vy=0;s.yaw=Math.PI;s.mode='walk';Object.assign(s.car,{x:0,z:20,yaw:Math.PI,speed:0,steer:0});s.wash=null;s.course.active=false;s.course.next=0;s.course.cooldown=0;s.muddy=false;event(s,'Back at your parking spot. Your badges and sandwich came too.');}
export function washPhase(s){if(!s.wash)return'';return s.wash.time<2?'Foam party':s.wash.time<4.8?'Scrub-a-dub':s.wash.time<6.8?'Rainy rinse':'Fluffy air dry';}
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
export function tick(s,input,dt){
 dt=clamp(dt,0,.05);s.time+=dt;s.event='';s.effect=null;s.socialCooldown=Math.max(0,s.socialCooldown-dt);s.eatCooldown=Math.max(0,s.eatCooldown-dt);s.greeting=Math.max(0,s.greeting-dt);s.course.cooldown=Math.max(0,s.course.cooldown-dt);s.cones=s.cones.map(t=>Math.max(0,t-dt));
 if(s.mode==='wash'){
  const w=s.wash;w.time=Math.min(WASH.duration,w.time+dt);const t=w.time/WASH.duration,e=clamp(w.time,0,1);s.car.x=w.x+(WASH.x-w.x)*e;s.car.z=w.z+(WASH.exit-w.z)*t;s.car.yaw=w.yaw+(Math.PI-w.yaw)*e;s.car.dirt=w.dirt*(1-clamp((w.time-2)/4.5,0,1));s.car.speed=0;s.car.steer=0;
  if(w.time>=WASH.duration){s.washes++;if(w.dirt>.1)s.badges.clean=true;s.car.dirt=0;s.wash=null;s.mode='drive';event(s,'Sparkly clean! Go find another muddy adventure.','clean');}
 }else if(s.mode==='drive'){
  const c=s.car,prev={x:c.x,z:c.z},throttle=clamp(input.throttle||0,-1,1),steer=clamp(input.steer||0,-1,1),mud=MUD.some(m=>((c.x-m.x)/m.rx)**2+((c.z-m.z)/m.rz)**2<1);
  if(input.brake)c.speed=Math.sign(c.speed)*Math.max(0,Math.abs(c.speed)-22*dt);
  else if(throttle)c.speed+=throttle*(Math.sign(throttle)!==Math.sign(c.speed)&&Math.abs(c.speed)>.1?20:10)*dt;
  else c.speed=Math.sign(c.speed)*Math.max(0,Math.abs(c.speed)-3.4*dt);
  c.speed=clamp(c.speed,mud?-4:-6,mud?9:15);c.steer+=(steer-c.steer)*Math.min(1,dt*9);c.yaw-=c.steer*1.65*clamp(Math.abs(c.speed)/5,0,1)*Math.sign(c.speed)*dt;
  if(move(c,Math.sin(c.yaw)*c.speed*dt,Math.cos(c.yaw)*c.speed*dt,1.8))c.speed*=.3;
  for(const n of s.npcs)if(distance(c,n)<3.7){c.x=prev.x;c.z=prev.z;c.speed=0;}
  const traveled=distance(c,prev);s.odometer+=traveled;if(mud&&traveled>.001){c.dirt=clamp(c.dirt+traveled*.085,0,1);if(!s.muddy)event(s,'Splish, splosh! The car wash knows what to do.','mud');}s.muddy=mud;
  const course=s.course;
  if(course.active)course.time+=dt;
  const target=COURSE[course.active?course.next:0];
  if(course.cooldown===0&&traveled>.001&&segmentDistance(target,prev,c)<2.5){
   if(!course.active){Object.assign(course,{active:true,next:1,time:0,penalty:0});event(s,'Cone Club: go through the glowing gates in order!','gate');}
   else if(course.next===5){course.active=false;course.next=0;course.runs++;course.last=course.time+course.penalty;course.best=Math.min(course.best??Infinity,course.last);course.cooldown=4;s.badges.course=true;event(s,`Cone cruiser! ${course.last.toFixed(1)} seconds. A shiny little badge for you!`,'finish');}
   else{course.next++;event(s,`Lovely driving! Next stop: gate ${course.next+1}.`,'gate');}
  }
  CONES.forEach((cone,i)=>{if(!s.cones[i]&&segmentDistance(cone,prev,c)<1.65&&traveled>.005){s.cones[i]=8;c.speed*=.75;if(course.active){course.penalty+=2;event(s,'Oops! A wobbly cone. +2 seconds, keep going!','cone');}}});
  if(c.z<=WASH.entry&&prev.z>WASH.entry&&Math.abs(c.x-WASH.x)<2.2&&Math.cos(c.yaw)<-.7&&c.speed>0){
   // Normalize the angle so the entrance alignment takes the short turn.
   let yaw=c.yaw;while(yaw-Math.PI>Math.PI)yaw-=Math.PI*2;while(yaw-Math.PI< -Math.PI)yaw+=Math.PI*2;
   s.wash={time:0,dirt:c.dirt,x:c.x,z:c.z,yaw};s.mode='wash';s.course.active=false;s.course.next=0;event(s,'Welcome to Suds & Smiles. Sit back for the bubble ride!','wash');
  }
 }else{
  let dx=input.x||0,dz=input.z||0;const len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len;}const old={x:s.x,z:s.z};move(s,dx*6*dt,dz*6*dt,.45);if(distance(s,s.car)<1.85){s.x=old.x;s.z=old.z;}if(len>.05)s.yaw=Math.atan2(dx,dz);s.vy-=18*dt;s.y=Math.max(0,s.y+s.vy*dt);if(s.y===0)s.vy=0;
 }
 for(const n of s.npcs){n.reply=Math.max(0,n.reply-dt);const next=trafficPose(n.d+n.speed*dt),ahead=trafficPose(n.d+5),p=position(s);const wait=distance(ahead,p)<5||distance(ahead,s.car)<5||distance(next,p)<3.5||distance(next,s.car)<3.8||s.npcs.some(o=>o!==n&&distance(ahead,o)<4);if(!wait)n.d=(n.d+n.speed*dt)%TRACK_LENGTH;Object.assign(n,trafficPose(n.d));}
}
