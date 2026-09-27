export const WIDTH=15, DEPTH=12, TOP=10.5;
export const CANNON={x:0,y:1.3,z:3};
export const HOOPS=[{id:0,name:'Little leap',height:3,color:'#f7a43a'},{id:1,name:'Halfway up',height:6,color:'#59cece'},{id:2,name:'Sky high',height:9,color:'#b194f5'}];
export function hoopAt(id,time){if(id===0)return{x:-7+Math.sin(time*.42)*4,y:3,z:-10.6};if(id===1)return{x:-13.6,y:6,z:Math.sin(time*.36)*5};return{x:13.6,y:9,z:Math.sin(time*.3+1)*5};}
export function createState(){return{x:0,y:0,z:6,vx:0,vy:0,vz:0,mode:'walk',wall:null,time:0,cooldown:1,shot:null,shots:0,hits:0,scored:0,event:''};}
export function nearestHoop(s){return HOOPS.map(h=>({...h,distance:Math.hypot(s.x-hoopAt(h.id,s.time).x,s.y+.9-h.height,s.z-hoopAt(h.id,s.time).z)})).sort((a,b)=>a.distance-b.distance)[0];}
export function nearWall(s){const choices=[{axis:'x',sign:-1,d:s.x+WIDTH},{axis:'x',sign:1,d:WIDTH-s.x},{axis:'z',sign:-1,d:s.z+DEPTH},{axis:'z',sign:1,d:DEPTH-s.z}];return choices.sort((a,b)=>a.d-b.d)[0];}
export function climb(s){if(s.mode==='fall')return false;const wall=nearWall(s);if(wall.d>1.1)return false;s.wall=wall;s.mode='climb';s[s.wall.axis]=s.wall.sign*((s.wall.axis==='x'?WIDTH:DEPTH)-.45);return true;}
export function jump(s){if(s.mode==='climb'){fall(s,4,4);s.event='Let go!';}else if(s.mode==='walk'&&s.y===0){s.vy=5.5;s.mode='fall';}}
function fall(s,push,lift){s.mode='fall';s.vx=s.wall?.axis==='x'?-s.wall.sign*push:0;s.vz=s.wall?.axis==='z'?-s.wall.sign*push:0;s.vy=lift;s.wall=null;s.cooldown=4;}
export function startShot(s){const hoop=nearestHoop(s);if(s.mode!=='climb'||s.cooldown>0||s.shot||hoop.distance>3.8)return false;const target=hoopAt(hoop.id,s.time+1.2);s.shot={hoop:hoop.id,age:0,phase:'basket',target,ball:{...CANNON}};s.cooldown=5;s.shots++;s.event=`Cannon → ${hoop.name}!`;return true;}
export function tick(s,dt,input={x:0,z:0}){
 s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.event='';
 const mag=Math.hypot(input.x,input.z),ix=input.x/Math.max(1,mag),iz=input.z/Math.max(1,mag);
 if(s.mode==='walk'){
  s.x+=ix*5*dt;s.z+=iz*5*dt;const wall=nearWall(s),outward=(wall.axis==='x'?ix:iz)*wall.sign;
  if(wall.d<.55&&outward>.25)climb(s);
 }else if(s.mode==='climb'){
  const w=s.wall,outward=(w.axis==='x'?ix:iz)*w.sign;
  s.y=Math.max(0,Math.min(TOP,s.y+outward*3.3*dt));
  if(w.axis==='x')s.z+=iz*3.5*dt;else s.x+=ix*3.5*dt;
  if(s.y===0&&outward<-.2){s.mode='walk';s[w.axis]-=w.sign*.25;s.wall=null;}
 }else{
  s.vy-=12*dt;s.x+=(s.vx+ix*2)*dt;s.z+=(s.vz+iz*2)*dt;s.y+=s.vy*dt;s.vx*=Math.exp(-dt*.8);s.vz*=Math.exp(-dt*.8);
  if(s.y<=0){s.y=0;s.vy=s.vx=s.vz=0;s.mode='walk';s.event='Soft landing. Climb again!';}
 }
 s.x=Math.max(-WIDTH+.45,Math.min(WIDTH-.45,s.x));s.z=Math.max(-DEPTH+.45,Math.min(DEPTH-.45,s.z));
 if(s.shot){
  const shot=s.shot;shot.age+=dt;
  if(shot.phase==='basket'){
   const u=Math.min(1,shot.age/1.2),p=shot.target;
   shot.ball={x:CANNON.x+(p.x-CANNON.x)*u,y:CANNON.y+(p.y-CANNON.y)*u+Math.sin(Math.PI*u)*5,z:CANNON.z+(p.z-CANNON.z)*u};
   if(u===1){shot.phase='drop';s.scored++;s.event='Swish… incoming!';}
  }else if(shot.phase==='drop'){
   shot.ball.y-=4*dt;if(shot.age>=1.4)shot.phase='return';
  }else{
   const p=shot.ball,dx=s.x-p.x,dy=s.y+.9-p.y,dz=s.z-p.z,d=Math.hypot(dx,dy,dz),step=16*dt;
   if(d<.65+step){s.hits++;fall(s,7,3.5);s.shot=null;s.event='Boop! Back to the court.';}
   else {p.x+=dx/d*step;p.y+=dy/d*step;p.z+=dz/d*step;}
  }
 }else startShot(s);
}
