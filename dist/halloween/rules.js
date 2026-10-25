export const SCARECROW={x:-16,z:-12};
export const PIE={x:12,z:10,r:3.2};
export const HOUSE={x:10,z:-12,w:10,d:9};
export const BOUNDS=26;
export function createState(){return{x:0,z:16,y:0,yaw:Math.PI,time:0,jumpV:0,vx:0,vz:0,tumble:0,immune:0,pumpkins:[],launchIn:2,launches:0,bumps:0,jumps:0,bites:0,eaten:0,biteCooldown:0,refill:0,event:''};}
export const nearPie=s=>Math.hypot(s.x-PIE.x,s.z-PIE.z)<PIE.r+2.3;
export const inHouse=s=>Math.abs(s.x-HOUSE.x)<HOUSE.w/2&&Math.abs(s.z-HOUSE.z)<HOUSE.d/2;
export function jump(s){if(s.y===0&&s.tumble===0){s.jumpV=8.8;return true;}return false;}
export function bite(s){if(!nearPie(s)||s.tumble>0||s.biteCooldown>0||s.eaten===8)return false;s.bites++;s.eaten++;s.biteCooldown=.85;if(s.eaten===8)s.refill=5;s.event=s.eaten===8?'The last bite! A fresh pie is baking…':'Mmm… pumpkin pie!';return true;}
export function launch(s){const angle=.72+[-.13,.12,0][s.launches%3],speed=6.2;s.pumpkins.push({id:s.launches++,x:SCARECROW.x+1.7,z:SCARECROW.z+1.3,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,age:0,cleared:false,hit:false});s.launchIn=3.7;}
function circleCollision(s,x,z,r){const dx=s.x-x,dz=s.z-z,d=Math.hypot(dx,dz);if(d<r){s.x=x+(d?dx/d:1)*r;s.z=z+(d?dz/d:0)*r;}}
export function tick(s,dt,input={x:0,z:0}){
 s.event='';s.time+=dt;s.immune=Math.max(0,s.immune-dt);s.biteCooldown=Math.max(0,s.biteCooldown-dt);s.tumble=Math.max(0,s.tumble-dt);
 const len=Math.max(1,Math.hypot(input.x,input.z)),speed=s.tumble>0?1.4:6;
 s.x+=(input.x/len*speed+s.vx)*dt;s.z+=(input.z/len*speed+s.vz)*dt;s.vx*=Math.exp(-dt*2.2);s.vz*=Math.exp(-dt*2.2);
 if(Math.hypot(input.x,input.z)>.1&&s.tumble===0)s.yaw=Math.atan2(input.x,input.z);
 if(s.y>0||s.jumpV>0){s.y+=s.jumpV*dt;s.jumpV-=16*dt;if(s.y<0)s.y=s.jumpV=0;}
 s.x=Math.max(-BOUNDS,Math.min(BOUNDS,s.x));s.z=Math.max(-BOUNDS,Math.min(BOUNDS,s.z));circleCollision(s,PIE.x,PIE.z,PIE.r+.45);circleCollision(s,SCARECROW.x,SCARECROW.z,1.6);
 // Walk through the open front doorway; the back and side walls are solid.
 for(const wall of [{x:5,z:-12,w:.45,d:9},{x:15,z:-12,w:.45,d:9},{x:10,z:-16.5,w:10,d:.45},{x:6.5,z:-7.5,w:3,d:.45},{x:13.5,z:-7.5,w:3,d:.45}]){
  const dx=s.x-wall.x,dz=s.z-wall.z,px=wall.w/2+.35-Math.abs(dx),pz=wall.d/2+.35-Math.abs(dz);
  if(px>0&&pz>0){if(px<pz)s.x+=Math.sign(dx||1)*px;else s.z+=Math.sign(dz||1)*pz;}
 }
 s.launchIn-=dt;if(s.launchIn<=0)launch(s);
 for(const p of s.pumpkins){p.age+=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;const d=Math.hypot(s.x-p.x,s.z-p.z);
  if(d<1.6&&!p.hit){if(s.y>1.45){if(!p.cleared){p.cleared=true;s.jumps++;s.event='Over the pumpkin! Nice jump.';}}else if(!p.cleared&&s.immune===0){p.hit=true;s.bumps++;s.immune=1.8;s.tumble=1.15;s.vx=p.vx*2.6;s.vz=p.vz*2.6;s.jumpV=4.8;s.y=Math.max(.08,s.y);s.yaw=Math.atan2(p.vx,p.vz);s.event='Pumpkin tumble! Wheee!';}}
 }
 s.pumpkins=s.pumpkins.filter(p=>p.age<10&&Math.abs(p.x)<30&&Math.abs(p.z)<30);
 if(s.refill>0){s.refill=Math.max(0,s.refill-dt);if(s.refill===0){s.eaten=0;s.event='A fresh pumpkin pie. Still warm!';}}
}
