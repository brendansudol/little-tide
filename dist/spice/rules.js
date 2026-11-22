export const TAU = Math.PI * 2;
export const MAZE = { cols: 6, rows: 5, size: 6, left: -18, top: -23 };
export const START = { x: -15, z: 11 }, FINISH = { x: 15, z: -27 }, SPAWN = { x: 0, z: 24 };
export const SHOWER = { x: -24, z: 21 }, BOUNCE = { x: 20, z: 20 }, MIXER = { x: 23, z: 12 };
export const RACE_SPEED=5.5, RACE_HEAD_START=1;
export const FINISH_HALF_WIDTH=3, FINISH_LINE_Z=FINISH.z+.35, SAUCE_RANGE=14;
export const SAUCES=[
 {id:'ketchup',name:'Ketchup',color:'#f54c53'},
 {id:'mustard',name:'Mustard',color:'#ffcf42'},
 {id:'pesto',name:'Pesto',color:'#77d8a5'},
 {id:'bbq',name:'Barbecue',color:'#b96a45'},
 {id:'berry',name:'Berry glaze',color:'#b883f5'},
 {id:'garlic',name:'Garlic cream',color:'#fff0d6'},
];
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
export const RACE_FINISH_TIME=RACE_HEAD_START+(ROUTE_LENGTH-.35)/RACE_SPEED;
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
 monster:{x:5,z:15,yaw:0,cooldown:3,shot:null,color:'#d83c23',painted:0},splats:[],shotId:0,stain:0,bump:{x:0,z:0},
 found:[],badges:{race:false,spices:false,comeback:false},wins:0,losses:0,bounces:0,squirts:0,
 bounceCooldown:0,showerCooldown:0,shield:3,hints:false,event:'',effect:null,
 mixer:{recipe:[],phase:'idle',time:0,pour:null,result:null,batches:0},apronColor:'#fff1cd',
 carriedSauce:null,sauceShot:null,sauceCooldown:0,sauceHits:0,
};}
function say(s,event,effect=null){s.event=event;s.effect=effect;}
export function nearby(s){
 if(s.mode==='orbit')return{kind:'orbit',name:s.orbit.cruise?'Pause flying':'Fly around the world'};
 if(s.mode==='mixing')return{kind:'mix',name:s.mixer.phase==='stirring'?'Whirling…':'Mix & splash!'};
 if(s.mode==='race')return{kind:'hint',name:s.hints?'Hide mustard trail':'Show mustard trail'};
 if(s.mode!=='explore')return null;
 if(dist(s,MIXER)<4.5)return{kind:'mixer',name:'Mix some sauces!'};
 if(dist(s,START)<4)return{kind:'race',name:'Race Squeeze!'};
 if(dist(s,SHOWER)<3.5)return{kind:'shower',name:'Seasoning shower!'};
 return null;
}
export function act(s){
 const near=nearby(s);if(!near)return false;
 if(near.kind==='mixer'){
  s.mode='mixing';s.x=MIXER.x;s.z=MIXER.z+3.8;s.y=0;s.vy=0;s.yaw=Math.PI;s.bump={x:0,z:0};s.monster.shot=null;s.sauceShot=null;s.splats=[];say(s,'Welcome to the Sauce Lab! Pick two or more sauces, then mix!','lab');
 }else if(near.kind==='mix')return stirSauces(s);
 else if(near.kind==='race'){
  Object.assign(s,{...START,y:0,vy:0,yaw:Math.PI,stain:0,bump:{x:0,z:0},mode:'countdown',race:{elapsed:0,countdown:3,checkpoint:1,monsterDistance:0},splats:[]});
  Object.assign(s.monster,{...START,shot:null,yaw:Math.PI});s.sauceShot=null;say(s,'Ready, steady… spaghetti! Follow the maze to the golden finish.','start');
 }else if(near.kind==='hint'){s.hints=!s.hints;say(s,s.hints?'Follow the little mustard dots. You can do this!':'Mustard trail tucked away. Trust your spice instincts!');}
 else if(near.kind==='orbit'){s.orbit.cruise=!s.orbit.cruise;say(s,s.orbit.cruise?'French-fry wings, go! Two laps and you’re home.':'Hovering. Tap Fly or use your movement controls to keep going.');}
 else if(near.kind==='shower'){
  if(s.showerCooldown>0)return false;s.showerCooldown=3;s.stain=0;s.apronColor='#fff1cd';s.shield=10;say(s,'Sprinkle sprinkle! A clean apron and ten seconds of squirt protection.','shower');
 }
 return true;
}
export function jump(s){if(s.mode==='mixing')closeMixer(s);if(!['explore','race'].includes(s.mode)||s.y>.03)return false;s.vy=8;s.y=.04;return true;}
export function home(s){
 if(['flick','orbit','return'].includes(s.mode)){say(s,'Two laps unlock the way home. Tap Fly to get going!');return false;}
 if(s.mode==='mixing')closeMixer(s);
 if(s.race)s.monster.returnDistance=s.race.monsterDistance;
 Object.assign(s,{...SPAWN,y:0,vy:0,yaw:Math.PI,mode:'explore',race:null,ride:null,orbit:null,stain:0,bump:{x:0,z:0},shield:5,splats:[],sauceShot:null});s.monster.shot=null;s.monster.cooldown=4;say(s,'Back at the tasting table. All your discoveries came too.');return true;
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
 s.losses++;s.mode='flick';s.ride={time:0,start:{x:s.x,y:s.y,z:s.z}};s.race=null;s.monster.shot=null;s.sauceShot=null;s.splats=[];s.stain=0;
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
 s.sauceCooldown=Math.max(0,s.sauceCooldown-dt);s.monster.painted=Math.max(0,s.monster.painted-dt);
 if(s.mode==='mixing'){
  if(Math.hypot(input.x||0,input.z||0)>.12)closeMixer(s);
  else{tickMixer(s,dt);return;}
 }
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
  if(s.race.countdown===0){s.mode='race';s.shield=1000;say(s,'GO! One-second head start. Squeeze is coming FAST!','go');}return;
 }
 const before={x:s.x,z:s.z},amount=Math.hypot(input.x||0,input.z||0);
 if(amount>.01){const scale=7.2*dt/Math.max(1,amount);move(s,(input.x||0)*scale,(input.z||0)*scale);s.yaw=Math.atan2(input.x||0,input.z||0);}
 if(Math.hypot(s.bump.x,s.bump.z)>.03){move(s,s.bump.x*dt,s.bump.z*dt);const decay=Math.exp(-6*dt);s.bump.x*=decay;s.bump.z*=decay;}
 s.y=Math.max(0,s.y+s.vy*dt);s.vy=s.y>0?s.vy-18*dt:0;
 if(s.mode==='explore'&&s.bounceCooldown===0&&dist(s,BOUNCE)<2.6&&s.y<.3){s.vy=16;s.y=.05;s.bounceCooldown=2.2;s.bounces++;say(s,'DILL-IGHTFUL! Pickle trampoline!','bounce');}
 SPICES.forEach((p,i)=>{if(!s.found.includes(i)&&dist(s,p)<1.6&&s.y<2){s.found.push(i);say(s,`${p.name} joins your spice club! ${s.found.length} / 6.`, 'spice');if(s.found.length===6){s.badges.spices=true;say(s,'THE SPICE CLUB IS COMPLETE! A crown for your collection.','badge');}}});
 if(s.mode==='race'){
  const r=s.race,finishFraction=advanceRace(r,before,s),arrival=r.elapsed+finishFraction*dt;r.elapsed+=dt;
  if(Number.isFinite(finishFraction)&&arrival<=RACE_FINISH_TIME+1e-9){s.monster.returnDistance=Math.max(0,arrival-RACE_HEAD_START)*RACE_SPEED;s.mode='explore';s.race=null;s.wins++;s.badges.race=true;s.shield=8;s.sauceShot=null;say(s,'YOU BEAT SQUEEZE! The Golden Squeeze Cup is yours!','win');return;}
  r.monsterDistance=Math.max(0,r.elapsed-RACE_HEAD_START)*RACE_SPEED;Object.assign(s.monster,routePose(r.monsterDistance));
  if(r.elapsed>=RACE_FINISH_TIME)lose(s);else tickSauceShot(s,dt);return;
 }
 const m=s.monster;
 tickSauceShot(s,dt);
 if(m.returnDistance>0){m.returnDistance=Math.max(0,m.returnDistance-6*dt);Object.assign(m,routePose(m.returnDistance));m.yaw+=Math.PI;return;}
 const target={x:5+4*Math.sin(s.time*.23),z:15+2*Math.cos(s.time*.19)},d=dist(m,target);
 if(!m.shot&&d>.1){const step=Math.min(d,2*dt);move(m,(target.x-m.x)/d*step,(target.z-m.z)/d*step);}
 m.yaw=Math.atan2(s.x-m.x,s.z-m.z);squirt(s,dt);
}

// Check the whole traversable cell, not an invisible circle at its center.
// Swept rectangles also recognize corners crossed between frames.
function cellEntry(from,to,p,after=0){
 let enter=after,leave=1;
 for(const axis of ['x','z']){
  const delta=to[axis]-from[axis],lo=p[axis]-MAZE.size/2,hi=p[axis]+MAZE.size/2;
  if(Math.abs(delta)<1e-9){if(from[axis]<lo||from[axis]>hi)return Infinity;}
  else{const a=(lo-from[axis])/delta,b=(hi-from[axis])/delta;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));}
 }
 return enter<=leave?enter:Infinity;
}
function advanceRace(r,from,to){
 let fraction=0;
 while(r.checkpoint<ROUTE.length-1){
  const entry=cellEntry(from,to,ROUTE[r.checkpoint],fraction);
  if(!Number.isFinite(entry))return Infinity;
  fraction=entry;r.checkpoint++;
 }
 // Both racers cross the same visible stripe; jumping and either edge count.
 if(from.z<FINISH_LINE_Z||to.z>FINISH_LINE_Z)return Infinity;
 const dz=to.z-from.z,u=dz===0?0:(FINISH_LINE_Z-from.z)/dz;
 const x=from.x+(to.x-from.x)*u;
 return u>=fraction&&u<=1&&Math.abs(x-FINISH.x)<=FINISH_HALF_WIDTH?u:Infinity;
}

export function takeSauce(s){
 if(s.mode!=='mixing'||!s.mixer.result||s.mixer.phase==='stirring')return false;
 s.carriedSauce={...s.mixer.result};closeMixer(s);
 say(s,`${s.carriedSauce.name}, bottled! Find Squeeze and tap Squirt or press Q.`, 'bottle');return true;
}
export function sauceAim(s){
 if(!s.carriedSauce||!['explore','race'].includes(s.mode))return 'unavailable';
 if(s.sauceShot||s.sauceCooldown>0)return 'refilling';
 if(dist(s,s.monster)>SAUCE_RANGE)return 'far';
 if(!clearSight(s,s.monster))return 'blocked';
 return 'ready';
}
export function squirtSauce(s){
 if(sauceAim(s)!=='ready')return false;
 s.yaw=Math.atan2(s.monster.x-s.x,s.monster.z-s.z);
 s.sauceShot={age:0,from:{x:s.x,y:s.y+1.6,z:s.z},target:{x:s.monster.x,y:2.2,z:s.monster.z},...s.carriedSauce};s.sauceCooldown=1.2;
 say(s,'SQUUUUIRT!', 'sauce-fire');return true;
}
export function sauceShotPosition(shot,delay=0){
 const u=clamp((shot.age-delay)/.45,0,1);
 return{x:lerp(shot.from.x,shot.target.x,u),y:lerp(shot.from.y,shot.target.y,u)+Math.sin(u*Math.PI)*1.3,z:lerp(shot.from.z,shot.target.z,u)};
}
function tickSauceShot(s,dt){
 const shot=s.sauceShot;if(!shot)return;
 shot.age+=dt;Object.assign(shot.target,{x:s.monster.x,z:s.monster.z});
 if(shot.age>=.45){
  s.sauceShot=null;
  if(!clearSight(shot.from,s.monster)){say(s,'The sauce splashed a wall. Find a clear shot!');return;}
  s.monster.color=shot.color;s.monster.painted=2;s.monster.shot=null;s.monster.cooldown=Math.max(2.5,s.monster.cooldown);s.sauceHits++;
  say(s,`SPLASH! Squeeze is ${shot.name} colored!`, 'sauce-hit');
 }
}

// The lab is a repeatable toy: bounded recipes, deliberate mixing, and a colorful reward.
export function sauceResult(recipe){
 const sauces=recipe.map(id=>SAUCES.find(s=>s.id===id)).filter(Boolean);
 if(!sauces.length)return{name:'An empty bowl',color:'#fff1cd'};
 const channels=[16,8,0].map(shift=>Math.round(sauces.reduce((n,s)=>n+((parseInt(s.color.slice(1),16)>>shift)&255),0)/sauces.length));
 const color='#'+channels.map(n=>n.toString(16).padStart(2,'0')).join('');
 const unique=[...new Set(sauces.map(s=>s.id))].sort(),pair=unique.join('+');
 const names={'ketchup+mustard':'Sunset Sizzle','berry+garlic':'Purple Cloud','berry+mustard':'Confetti Custard','garlic+pesto':'Minty Moon','ketchup+pesto':'Garden Giggles','bbq+ketchup':'Dragon Drizzle','berry+ketchup':'Berry Volcano','garlic+ketchup':'Pink Comet','mustard+pesto':'Lime Lightning'};
 return{name:unique.length>=4?'Rainbow Ruckus':unique.length===3?'Triple Swirl Surprise':names[pair]||'Secret Sauce Swirl',color};
}
export function addSauce(s,id){
 const m=s.mixer;
 if(s.mode!=='mixing'||m.phase==='stirring'||!SAUCES.some(a=>a.id===id)||m.recipe.length>=4)return false;
 m.recipe.push(id);m.phase='idle';m.time=0;m.result=null;m.pour={id,left:.8};
 say(s,`${SAUCES.find(a=>a.id===id).name}… glug glug! ${m.recipe.length} / 4 squirts.`, 'pour');return true;
}
export function clearRecipe(s){
 if(s.mode!=='mixing'||s.mixer.phase==='stirring')return false;
 Object.assign(s.mixer,{recipe:[],phase:'idle',time:0,pour:null,result:null});say(s,'A fresh bowl. What will you make next?');return true;
}
export function stirSauces(s){
 const m=s.mixer;
 if(s.mode!=='mixing'||m.phase==='stirring')return false;
 if(new Set(m.recipe).size<2){say(s,'Choose at least two different sauces for a colorful mix!');return false;}
 m.phase='stirring';m.time=0;m.pour=null;m.result=null;say(s,'Whirrr… swirl… get ready for the sauce fountain!', 'stir');return true;
}
export function closeMixer(s){
 if(s.mode!=='mixing')return false;
 s.mode='explore';s.shield=Math.max(4,s.shield);s.mixer.pour=null;
 if(s.mixer.phase!=='idle'){s.mixer.phase='idle';s.mixer.time=0;}
 say(s,'See you at the Sauce Lab! Your recipe is saved for this visit.');return true;
}
function tickMixer(s,dt){
 const m=s.mixer;
 if(m.pour){m.pour.left=Math.max(0,m.pour.left-dt);if(m.pour.left===0)m.pour=null;}
 if(m.phase==='stirring'){
  m.time+=dt;
  if(m.time>=3.5){m.phase='party';m.time=0;m.result=sauceResult(m.recipe);m.batches++;s.apronColor=m.result.color;s.stain=0;say(s,`${m.result.name}! A rainbow splash and a brand-new apron color.`, 'mix-party');}
 }else if(m.phase==='party'){m.time+=dt;if(m.time>=5){m.phase='idle';m.time=0;}}
}
