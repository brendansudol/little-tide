export const TAU = Math.PI * 2;
export const MAZE = { cols: 6, rows: 5, size: 6, left: -18, top: -23 };
export const START = { x: -15, z: 11 }, FINISH = { x: 15, z: -27 }, SPAWN = { x: 0, z: 24 };
export const SHOWER = { x: -24, z: 21 }, BOUNCE = { x: 20, z: 20 };
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const cellPoint = id => ({ x: MAZE.left + (id % MAZE.cols + .5) * MAZE.size, z: MAZE.top + (Math.floor(id / MAZE.cols) + .5) * MAZE.size });
// A seeded perfect maze: every spice corner is reachable, with one clear route between cells.
function makeMaze() {
 let seed=98;
 const random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
 const links=Array.from({length:30},()=>[]), visited=new Set([24]), stack=[24];
 while(stack.length){
  const id=stack.at(-1), x=id%6, z=Math.floor(id/6);
  const candidates=[x>0?id-1:-1,x<5?id+1:-1,z>0?id-6:-1,z<4?id+6:-1].filter(n=>n>=0&&!visited.has(n));
  if(!candidates.length){stack.pop();continue;}
  const next=candidates[Math.floor(random()*candidates.length)];links[id].push(next);links[next].push(id);visited.add(next);stack.push(next);
 }
 return links;
}
export const LINKS = makeMaze();
export function cellRoute(from,to){
 const queue=[from],prev=new Map([[from,null]]);
 for(let i=0;i<queue.length;i++)for(const next of LINKS[queue[i]])if(!prev.has(next)){prev.set(next,queue[i]);queue.push(next);}
 const path=[];for(let id=to;id!==null;id=prev.get(id))path.unshift(id);return path;
}
export const ROUTE_CELLS=cellRoute(24,5);
export const ROUTE=[START,...ROUTE_CELLS.map(cellPoint),FINISH];
export const ROUTE_LENGTH=ROUTE.slice(1).reduce((sum,p,i)=>sum+dist(p,ROUTE[i]),0);
export const WALLS=[];
for(let id=0;id<30;id++){
 const p=cellPoint(id),x=id%6,z=Math.floor(id/6);
 if(x===0)WALLS.push({x:p.x-3,z:p.z,w:.7,d:6.7});
 if(z===0&&id!==5)WALLS.push({x:p.x,z:p.z-3,w:6.7,d:.7});
 if(x===5||!LINKS[id].includes(id+1))WALLS.push({x:p.x+3,z:p.z,w:.7,d:6.7});
 if((z===4&&id!==24)||(z<4&&!LINKS[id].includes(id+6)))WALLS.push({x:p.x,z:p.z+3,w:6.7,d:.7});
}
const spiceCells=[...new Set([...LINKS.map((a,i)=>a.length===1?i:-1).filter(i=>i>=0&&i!==24&&i!==5),...ROUTE_CELLS.slice(2,-2)])].slice(0,6);
export const SPICES=spiceCells.map((id,i)=>({id,...cellPoint(id),name:['Paprika','Pepper','Cinnamon','Turmeric','Basil','Ginger'][i],color:['#ef784d','#6e6965','#b5764b','#f1c448','#7ea06c','#e7be89'][i]}));
export function routePose(distance){
 let left=clamp(distance,0,ROUTE_LENGTH);
 for(let i=1;i<ROUTE.length;i++){const a=ROUTE[i-1],b=ROUTE[i],length=dist(a,b);if(left<=length)return{x:a.x+(b.x-a.x)*left/length,z:a.z+(b.z-a.z)*left/length,yaw:Math.atan2(b.x-a.x,b.z-a.z)};left-=length;}
 return {...FINISH,yaw:Math.PI};
}
export function createState(){return{
 ...SPAWN,y:0,vy:0,yaw:Math.PI,time:0,mode:'explore',race:null,ride:null,orbit:null,
 monster:{x:5,z:15,yaw:0,cooldown:3,shot:null},splats:[],shotId:0,stain:0,bump:{x:0,z:0},
 found:[],badges:{race:false,spices:false,comeback:false},wins:0,losses:0,bounces:0,squirts:0,
 bounceCooldown:0,showerCooldown:0,shield:3,hints:false,event:'',effect:null,
};}
function say(s,event,effect=null){s.event=event;s.effect=effect;}
export function nearby(s){
 if(s.mode==='orbit')return{kind:'orbit',name:s.orbit.cruise?'Pause flying':'Fly around the world'};
 if(s.mode==='race')return{kind:'hint',name:s.hints?'Hide mustard trail':'Show mustard trail'};
 if(s.mode!=='explore')return null;
 if(dist(s,START)<4)return{kind:'race',name:'Race Squeeze!'};
 if(dist(s,SHOWER)<3.5)return{kind:'shower',name:'Seasoning shower!'};
 return null;
}
export function act(s){
 const near=nearby(s);if(!near)return false;
 if(near.kind==='race'){
  Object.assign(s,{...START,y:0,vy:0,yaw:Math.PI,stain:0,bump:{x:0,z:0},mode:'countdown',race:{elapsed:0,countdown:3,checkpoint:1,monsterDistance:0},splats:[]});
  Object.assign(s.monster,{...START,shot:null,yaw:Math.PI});say(s,'Ready, steady… spaghetti! Follow the maze to the golden finish.','start');
 }else if(near.kind==='hint'){s.hints=!s.hints;say(s,s.hints?'Follow the little mustard dots. You can do this!':'Mustard trail tucked away. Trust your spice instincts!');}
 else if(near.kind==='orbit'){s.orbit.cruise=!s.orbit.cruise;say(s,s.orbit.cruise?'French-fry wings, go! Two laps and you’re home.':'Hovering. Tap Fly or use your movement controls to keep going.');}
 else if(near.kind==='shower'){
  if(s.showerCooldown>0)return false;s.showerCooldown=3;s.stain=0;s.shield=10;say(s,'Sprinkle sprinkle! A clean apron and ten seconds of squirt protection.','shower');
 }
 return true;
}
export function jump(s){if(!['explore','race'].includes(s.mode)||s.y>.03)return false;s.vy=8;s.y=.04;return true;}
export function home(s){
 if(['flick','orbit','return'].includes(s.mode)){say(s,'Two laps unlock the way home. Tap Fly to get going!');return false;}
 if(s.race)s.monster.returnDistance=s.race.monsterDistance;
 Object.assign(s,{...SPAWN,y:0,vy:0,yaw:Math.PI,mode:'explore',race:null,ride:null,orbit:null,stain:0,bump:{x:0,z:0},shield:5,splats:[]});s.monster.shot=null;s.monster.cooldown=4;say(s,'Back at the tasting table. All your discoveries came too.');return true;
}
export function move(s,dx,dz){
 // Small substeps prevent crossing a wall at low frame rates or during a squirt bump.
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 const blocked=(x,z)=>WALLS.some(b=>Math.abs(x-b.x)<b.w/2+.42&&Math.abs(z-b.z)<b.d/2+.42);
 for(let i=0;i<steps;i++){const x=clamp(s.x+dx/steps,-30.8,30.8),z=clamp(s.z+dz/steps,-30.8,30.8);if(!blocked(x,s.z))s.x=x;if(!blocked(s.x,z))s.z=z;}
}
export function clearSight(a,b){
 const steps=Math.ceil(dist(a,b)/.25);
 for(let i=1;i<steps;i++){const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps;if(WALLS.some(w=>Math.abs(x-w.x)<w.w/2&&Math.abs(z-w.z)<w.d/2))return false;}
 return true;
}
function squirt(s,dt){
 const m=s.monster;m.cooldown=Math.max(0,m.cooldown-dt);
 if(!m.shot&&m.cooldown===0&&s.shield===0&&dist(s,m)<7.5&&clearSight(m,s)){
  m.shot={age:0,target:{x:s.x,z:s.z},from:{x:m.x,z:m.z}};m.cooldown=4;say(s,'Squeeze is aiming… dodge the ketchup ring!','aim');
 }
 if(m.shot){
  const shot=m.shot;shot.age+=dt;
  if(shot.age>=1.35){
   s.splats.push({...shot.target,id:s.shotId++,life:3});m.shot=null;
   if(dist(s,shot.target)<1.65&&s.y<1.5&&s.shield===0){
    const d=Math.max(.1,dist(s,shot.from));s.bump={x:(s.x-shot.from.x)/d*5,z:(s.z-shot.from.z)/d*5};s.stain=3;s.squirts++;s.shield=1;say(s,'PLOP! A little ketchup on your apron!','splat');
   }else say(s,'Whoosh! Ketchup missed you.','miss');
  }
 }
}
export function shotPosition(shot){const u=clamp((shot.age-.65)/.7,0,1);return{x:shot.from.x+(shot.target.x-shot.from.x)*u,z:shot.from.z+(shot.target.z-shot.from.z)*u,y:2.7*(1-u)+.15*u+Math.sin(u*Math.PI)*1.6};}
function lose(s){
 s.losses++;s.mode='flick';s.ride={time:0,start:{x:s.x,y:s.y,z:s.z}};s.race=null;s.monster.shot=null;s.splats=[];s.stain=0;
 say(s,'Squeeze wins… FLICK! Fly two laps around Spice World to get back!','flick');
}
const smooth=u=>u*u*(3-2*u),lerp=(a,b,u)=>a+(b-a)*u;
export function recoveryPose(s){
 if(s.mode==='orbit')return{x:50*Math.cos(s.orbit.angle),z:48*Math.sin(s.orbit.angle),y:5+Math.sin(s.orbit.angle*2)*1.5,yaw:-s.orbit.angle};
 const r=s.ride,u=clamp(r.time/(s.mode==='flick'?2.3:2.4),0,1),e=smooth(u),end=s.mode==='flick'?{x:50,z:0,y:5}:{...SPAWN,y:0};
 return{x:lerp(r.start.x,end.x,e),z:lerp(r.start.z,end.z,e),y:lerp(r.start.y,end.y,e)+Math.sin(u*Math.PI)*15,yaw:Math.PI};
}
export function tick(s,dt,input={x:0,z:0}){
 s.event='';s.effect=null;s.time+=dt;
 for(const key of ['bounceCooldown','showerCooldown','shield','stain'])s[key]=Math.max(0,s[key]-dt);
 s.splats.forEach(p=>p.life-=dt);s.splats=s.splats.filter(p=>p.life>0);
 if(['flick','return'].includes(s.mode)){
  s.ride.time+=dt;Object.assign(s,recoveryPose(s));
  if(s.mode==='flick'&&s.ride.time>=2.3){s.mode='orbit';s.ride=null;s.orbit={angle:0,cruise:false};say(s,'Two laps to come home! Tap Fly, or hold ↑ / W / the joystick.','orbit');}
  else if(s.mode==='return'&&s.ride.time>=2.4){s.mode='explore';s.ride=null;s.orbit=null;s.badges.comeback=true;s.monster.returnDistance=ROUTE_LENGTH;s.shield=8;s.vy=0;say(s,'TWO LAPS! Welcome back, french-fry flyer!','badge');}
  return;
 }
 if(s.mode==='orbit'){
  const drive=Math.abs(input.z||0)>.08?-(input.z||0):input.x||0;
  s.orbit.angle+=clamp(Math.abs(drive)>.08?drive:s.orbit.cruise?1:0,-1,1)*1.05*dt;Object.assign(s,recoveryPose(s));
  if(Math.abs(s.orbit.angle)>=TAU*2){s.mode='return';s.ride={time:0,start:{x:s.x,y:s.y,z:s.z}};say(s,'Two whole laps! Coming in for a saucy landing.','return');}
  return;
 }
 if(s.mode==='countdown'){
  s.race.countdown=Math.max(0,s.race.countdown-dt);
  if(s.race.countdown===0){s.mode='race';s.shield=1000;say(s,'GO! Squeeze gives you a four-second head start!','go');}return;
 }
 const amount=Math.hypot(input.x||0,input.z||0);
 if(amount>.01){const scale=7.2*dt/Math.max(1,amount);move(s,(input.x||0)*scale,(input.z||0)*scale);s.yaw=Math.atan2(input.x||0,input.z||0);}
 if(Math.hypot(s.bump.x,s.bump.z)>.03){move(s,s.bump.x*dt,s.bump.z*dt);const decay=Math.exp(-6*dt);s.bump.x*=decay;s.bump.z*=decay;}
 s.y=Math.max(0,s.y+s.vy*dt);s.vy=s.y>0?s.vy-18*dt:0;
 if(s.mode==='explore'&&s.bounceCooldown===0&&dist(s,BOUNCE)<2.6&&s.y<.3){s.vy=16;s.y=.05;s.bounceCooldown=2.2;s.bounces++;say(s,'DILL-IGHTFUL! Pickle trampoline!','bounce');}
 SPICES.forEach((p,i)=>{if(!s.found.includes(i)&&dist(s,p)<1.6&&s.y<2){s.found.push(i);say(s,`${p.name} joins your spice club! ${s.found.length} / 6.`, 'spice');if(s.found.length===6){s.badges.spices=true;say(s,'THE SPICE CLUB IS COMPLETE! A crown for your collection.','badge');}}});
 if(s.mode==='race'){
  const r=s.race;r.elapsed+=dt;
  if(r.checkpoint<ROUTE.length&&dist(s,ROUTE[r.checkpoint])<2.2)r.checkpoint++;
  if(r.checkpoint===ROUTE.length){s.monster.returnDistance=r.monsterDistance;s.mode='explore';s.race=null;s.wins++;s.badges.race=true;s.shield=8;say(s,'YOU BEAT SQUEEZE! The Golden Squeeze Cup is yours!','win');return;}
  r.monsterDistance=Math.max(0,r.elapsed-4)*(ROUTE_LENGTH/64);Object.assign(s.monster,routePose(r.monsterDistance));
  if(r.monsterDistance>=ROUTE_LENGTH)lose(s);return;
 }
 const m=s.monster;
 if(m.returnDistance>0){m.returnDistance=Math.max(0,m.returnDistance-6*dt);Object.assign(m,routePose(m.returnDistance));m.yaw+=Math.PI;return;}
 const target={x:5+4*Math.sin(s.time*.23),z:15+2*Math.cos(s.time*.19)},d=dist(m,target);
 if(!m.shot&&d>.1){const step=Math.min(d,2*dt);move(m,(target.x-m.x)/d*step,(target.z-m.z)/d*step);}
 m.yaw=Math.atan2(s.x-m.x,s.z-m.z);squirt(s,dt);
}
