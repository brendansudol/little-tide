export const BOUNDS={x:27,z:24};
export const HAND={x:14,z:-10};
export const BRIDGE_X=-9;
export const riverZ=x=>-1+Math.sin(x*.16)*2.2;
export const inRiver=(x,z)=>Math.abs(z-riverZ(x))<2.7&&Math.abs(x-BRIDGE_X)>2.3;
export const ground=(x,z)=>Math.abs(x-BRIDGE_X)<2.3&&Math.abs(z-riverZ(BRIDGE_X))<3.5?.55*Math.sin(Math.PI*(z-riverZ(BRIDGE_X)+3.5)/7):.08;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
export const HAND_DURATION=5.6;
export function createState(){return{x:0,z:13,y:.08,yaw:Math.PI,mode:'walk',time:0,jumpY:0,jumpV:0,vx:0,vz:0,car:{x:-7,z:10,yaw:Math.PI,speed:0},monster:{x:-18,z:-17,yaw:0,cooldown:4,sneeze:0},handCooldown:0,ride:null,flicks:0,catches:0,tags:0,driveDistance:0,event:''};}
export function nearCar(s){return Math.hypot(s.x-s.car.x,s.z-s.car.z)<3.1;}
export function nearHand(s){return Math.hypot(s.x-HAND.x,s.z-(HAND.z+4.5))<2.8;}
export function interact(s){
 if(s.mode==='drive'){
  s.mode='walk';s.x=clamp(s.car.x+Math.cos(s.car.yaw)*2.5,-BOUNDS.x,BOUNDS.x);s.z=clamp(s.car.z-Math.sin(s.car.yaw)*2.5,-BOUNDS.z,BOUNDS.z);s.y=ground(s.x,s.z);s.monster.cooldown=Math.max(s.monster.cooldown,2);s.event='Out of the Foldmobile.';return true;
 }
 if(s.mode==='walk'&&nearCar(s)&&s.jumpY<.1){s.mode='drive';s.car.speed=0;s.x=s.car.x;s.z=s.car.z;s.event='Foldmobile! Steer with your movement controls.';return true;}
 return false;
}
export function jump(s){if(s.mode==='walk'&&s.jumpY===0)s.jumpV=6;}
export function beginFlick(s){if(s.mode!=='walk'||s.handCooldown>0||!nearHand(s))return false;s.ride={age:0,from:{x:s.x,y:s.y,z:s.z}};s.mode='flick';s.jumpY=s.jumpV=0;s.flicks++;s.event='One tiny flick…';return true;}
// One continuous path: fingertip → high arc → cupped palm → gentle set-down.
export function handPose(ride){
 const t=ride.age,from=ride.from,tip={x:HAND.x-1.25,y:3.1,z:HAND.z-2.7},palm={x:HAND.x,y:2.95,z:HAND.z+.15};
 if(t<.8){const u=smooth(t/.8);return {x:mix(from.x,tip.x,u),y:mix(from.y,tip.y,u),z:mix(from.z,tip.z,u),phase:'flick'};}
 if(t<3.8){const u=(t-.8)/3;return {x:mix(tip.x,palm.x,u)+Math.sin(Math.PI*u)*4,y:mix(tip.y,palm.y,u)+Math.sin(Math.PI*u)*17,z:mix(tip.z,palm.z,u)-Math.sin(Math.PI*u)*3,phase:'flight'};}
 if(t<4.8){const u=(t-3.8);return {...palm,y:palm.y-.3*Math.sin(Math.PI*u),phase:'catch'};}
 const u=smooth(clamp((t-4.8)/.8,0,1));return{x:mix(palm.x,HAND.x,u),y:mix(palm.y,.08,u)+Math.sin(Math.PI*u)*.5,z:mix(palm.z,HAND.z+7.6,u),phase:'release'};
}
export function tick(s,dt,input={x:0,z:0,run:false}){
 s.time+=dt;s.event='';s.handCooldown=Math.max(0,s.handCooldown-dt);s.monster.cooldown=Math.max(0,s.monster.cooldown-dt);s.monster.sneeze=Math.max(0,s.monster.sneeze-dt);
 const mag=Math.hypot(input.x,input.z),ix=input.x/Math.max(1,mag),iz=input.z/Math.max(1,mag);
 if(s.ride){
  const before=s.mode;s.ride.age=Math.min(HAND_DURATION,s.ride.age+dt);const p=handPose(s.ride);s.x=p.x;s.y=p.y;s.z=p.z;s.mode=p.phase;
  if(before!=='flight'&&s.mode==='flight')s.event='Fliiiick!';
  if(before!=='catch'&&s.mode==='catch'){s.catches++;s.event='Got you. A soft tissue catch!';}
  if(s.ride.age>=HAND_DURATION){s.ride=null;s.mode='walk';s.handCooldown=5;s.monster.cooldown=3;s.event='Back on your feet. Again?';}
 }else if(s.mode==='drive'){
  const car=s.car,targetSpeed=mag>.08?12:0;
  car.speed+=(targetSpeed-car.speed)*(1-Math.exp(-dt*3));
  if(mag>.08){const angle=Math.atan2(ix,iz);car.yaw+=Math.atan2(Math.sin(angle-car.yaw),Math.cos(angle-car.yaw))*(1-Math.exp(-dt*5));}
  const slow=inRiver(car.x,car.z)?.65:1,dx=Math.sin(car.yaw)*car.speed*dt*slow,dz=Math.cos(car.yaw)*car.speed*dt*slow;
  const oldX=car.x,oldZ=car.z;car.x=clamp(car.x+dx,-BOUNDS.x+1.4,BOUNDS.x-1.4);car.z=clamp(car.z+dz,-BOUNDS.z+1.8,BOUNDS.z-1.8);s.driveDistance+=Math.hypot(car.x-oldX,car.z-oldZ);s.x=car.x;s.z=car.z;s.y=ground(s.x,s.z)+.8;s.yaw=car.yaw;
 }else{
  const wet=inRiver(s.x,s.z)&&s.jumpY<.2,speed=(input.run?8.2:6.1)*(wet?.56:1);
  s.x+=(ix*speed+s.vx)*dt;s.z+=(iz*speed+s.vz+(wet?.65:0))*dt;s.vx*=Math.exp(-dt*3);s.vz*=Math.exp(-dt*3);
  s.x=clamp(s.x,-BOUNDS.x,BOUNDS.x);s.z=clamp(s.z,-BOUNDS.z,BOUNDS.z);
  if(mag>.08)s.yaw=Math.atan2(ix,iz);
  if(s.jumpY>0||s.jumpV>0){s.jumpY+=s.jumpV*dt;s.jumpV-=14*dt;if(s.jumpY<0)s.jumpY=s.jumpV=0;}
  s.y=ground(s.x,s.z)+s.jumpY;
  if(nearHand(s)&&s.handCooldown===0)beginFlick(s);
 }
 const m=s.monster,dx=s.x-m.x,dz=s.z-m.z,d=Math.hypot(dx,dz),safe=s.ride||Math.hypot(s.x-HAND.x,s.z-HAND.z)<7;
 // Sniffles follows, slows in the tissue river, and politely waits for the hand.
 if(m.cooldown===0&&!safe&&d>1.1){const speed=inRiver(m.x,m.z)?2:3.65;m.x+=dx/d*speed*dt;m.z+=dz/d*speed*dt;m.yaw=Math.atan2(dx,dz);}
 if(m.cooldown===0&&!safe&&s.mode==='walk'&&d<1.75&&s.jumpY<1){m.cooldown=6;m.sneeze=1.2;s.tags++;const length=d||1;s.vx=(d?dx/length:1)*7;s.vz=(d?dz/length:0)*7;s.jumpV=5;s.jumpY=.04;s.event='A-choo! Sniffles caught you. Keep running!';}
 m.x=clamp(m.x,-BOUNDS.x+1,BOUNDS.x-1);m.z=clamp(m.z,-BOUNDS.z+1,BOUNDS.z-1);
}
