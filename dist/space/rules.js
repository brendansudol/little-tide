export const PLANETS=[
 {id:'mercury',name:'Mercury',p:[24,1,-12],r:4,color:'#bca7ab',accent:'#f8d7af',tag:'The crater playground',gravity:7},
 {id:'venus',name:'Venus',p:[41,-1,16],r:6,color:'#e6ad6e',accent:'#ffe4a6',tag:'Cloud nine, all the time',gravity:8},
 {id:'earth',name:'Earth',p:[5,0,52],r:8,color:'#539fbe',accent:'#9de3ae',tag:'Home, sweet little home',gravity:10},
 {id:'mars',name:'Mars',p:[-38,3,38],r:5.8,color:'#dc806e',accent:'#ffc5a1',tag:'Tiny volcano. Big bounce.',gravity:7},
 {id:'jupiter',name:'Jupiter',p:[-64,-4,-6],r:12,color:'#d8ae8e',accent:'#ffdbad',tag:'A very swirly giant',gravity:11},
 {id:'saturn',name:'Saturn',p:[-36,3,-62],r:10,color:'#e6c887',accent:'#f6dfa9',tag:'Put a ring on adventure',gravity:8},
 {id:'uranus',name:'Uranus',p:[35,-2,-77],r:7.5,color:'#8bdfda',accent:'#d0fff3',tag:'The crystal garden',gravity:6},
 {id:'neptune',name:'Neptune',p:[78,4,-36],r:8.5,color:'#647de4',accent:'#b2d3ff',tag:'Bubbles at the edge of space',gravity:7}
];
export const SUN={p:[0,0,0],r:12};
export const NEW_MOON={id:'new-moon',name:'New Moon',p:[5,17,29],r:4.2,color:'#7c6ba9',accent:'#dfc7ff',gravity:5};
export const MOON_INDEX=PLANETS.length,BODIES=[...PLANETS,NEW_MOON],SUN_HITS=8;
export const UP=[0,1,0];
export const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
export const length=a=>Math.hypot(...a),unit=a=>mul(a,1/(length(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function rotate(v,axis,a){return add(add(mul(v,Math.cos(a)),mul(cross(axis,v),Math.sin(a))),mul(axis,dot(axis,v)*(1-Math.cos(a))));}
export function normalMix(a,b,t){const d=Math.max(-1,Math.min(1,dot(a,b)));if(d>.99999)return unit(mix(a,b,t));let axis=cross(a,b);if(length(axis)<.001)axis=cross(a,Math.abs(a[0])<.8?[1,0,0]:[0,0,1]);return rotate(a,unit(axis),Math.acos(d)*t);}
export const surface=(planet,n,h=0)=>add(planet.p,mul(n,planet.r+h));
export const starNormals=[unit([.48,1,.12]),unit([-.48,1,-.48]),unit([.1,1,-.85])];
export const padNormal=unit([-.58,1,.25]);
export function createState(){return{planet:2,n:[...UP],north:[0,0,-1],height:0,vy:0,facing:Math.PI,time:0,mode:'walk',ride:null,visited:[2],stars:[],meteors:[],nextMeteor:10,meteorId:0,hits:0,dodges:0,bounces:0,padCooldown:0,moonFriendly:false,sunHits:0,sunGlow:1,nextSunMeteor:0,sunShots:0,event:'',effect:null};}
export function position(s){return s.mode==='walk'?surface(BODIES[s.planet],s.n,s.height):s.ride.position;}
export function monsterPosition(){return [...NEW_MOON.p];}
export const sunRadius=s=>SUN.r*(.1+.9*s.sunGlow);
export const sunIsOut=s=>s.sunHits>=SUN_HITS;
export function jump(s){if(s.mode==='walk'&&s.height===0){s.vy=7.5;s.height=.01;return true;}return false;}
export function home(s){s.planet=2;s.n=[...UP];s.north=[0,0,-1];s.height=s.vy=0;s.mode='walk';s.ride=null;s.meteors=s.meteors.filter(m=>m.aim==='sun');s.nextMeteor=10;s.event='Welcome home, space explorer!';}
export function restoreSun(s){home(s);s.meteors=[];s.moonFriendly=false;s.sunHits=s.sunShots=0;s.sunGlow=1;s.nextSunMeteor=0;s.event='Good morning, universe! Land on New Moon to play again.';s.effect='sunrise';}
export const FLIGHT_SPEED=22;
export function startFlight(s){
 if(s.mode!=='walk')return false;
 const from=position(s);s.mode='flight';s.ride={time:0,position:add(from,mul(s.n,.06)),velocity:[0,0,0],launchNormal:[...s.n],heading:[0,0,-1],landing:null};s.meteors=s.meteors.filter(m=>m.aim==='sun');s.vy=0;s.event='Jetpack on! Fly to a planet—or land on New Moon!';return true;
}
export function landingTarget(s,maxClearance=Infinity){
 if(s.mode!=='flight')return null;
 const targets=BODIES.map((p,index)=>({index,name:p.name,clearance:Math.max(0,length(sub(position(s),p.p))-p.r)})).sort((a,b)=>a.clearance-b.clearance);
 return targets[0].clearance<=maxClearance?targets[0]:null;
}
export function requestLanding(s){const target=landingTarget(s,6);if(!target||s.ride.time<.8)return false;s.ride.landing=target.index;s.event=`Easy landing on ${target.name}. Move to cancel.`;return true;}
function land(s,index,n=UP,northHint=[0,0,-1]){
 s.planet=index;s.n=[...n];let north=sub(northHint,mul(n,dot(northHint,n)));if(length(north)<.01)north=cross(n,Math.abs(n[0])<.8?[1,0,0]:[0,0,1]);s.north=unit(north);s.height=s.vy=0;s.facing=Math.PI;s.mode='walk';s.ride=null;s.meteors=s.meteors.filter(m=>m.aim==='sun');s.nextMeteor=8;s.padCooldown=1;if(index<MOON_INDEX&&!s.visited.includes(index))s.visited.push(index);
 if(index===MOON_INDEX&&!s.moonFriendly){s.moonFriendly=true;s.nextSunMeteor=.7;s.sunShots=s.sunHits;}
}
// Sweep the whole movement segment so a fast approach cannot pass through a planet.
export function sphereContact(start,end,center,radius){
 const offset=sub(start,center),delta=sub(end,start),a=dot(delta,delta),c=dot(offset,offset)-radius*radius;
 if(c<=0)return 0;if(a<1e-12)return null;
 const b=dot(offset,delta),d=b*b-a*c;if(d<0)return null;const t=(-b-Math.sqrt(d))/a;return t>=0&&t<=1?t:null;
}
function fly(s,dt,input){
 const r=s.ride;r.time+=dt;
 const direction=input.flight||[0,0,0],amount=length(direction),near=landingTarget(s);
 if(input.heading&&length(input.heading)>.01)r.heading=unit(input.heading);
 if(amount>.01)r.landing=null;
 // Throttle down close to surfaces; let go to hover, without an endless drift.
 const speed=near.clearance<8?7+15*clamp(near.clearance/8):FLIGHT_SPEED;
 let wanted=mul(direction,speed/Math.max(1,amount));
 if(r.landing!==null)wanted=mul(unit(sub(BODIES[r.landing].p,r.position)),5);
 if(r.time<.7)wanted=add(wanted,mul(r.launchNormal,12*(1-r.time/.7)));
 const rate=amount>.01||r.landing!==null?6:10,decay=Math.exp(-rate*dt),old=r.velocity;
 r.velocity=add(wanted,mul(sub(old,wanted),decay));
 const next=add(r.position,add(mul(wanted,dt),mul(sub(old,wanted),(1-decay)/rate)));
 let first=null;
 for(const [index,p] of [...BODIES,{...SUN,r:sunRadius(s)}].entries()){
  if(index===s.planet&&r.time<.8)continue;
  const t=sphereContact(r.position,next,p.p,p.r+(index===BODIES.length?1.1:.12));
  if(t!==null&&(!first||t<first.t))first={t,index,p};
 }
 if(first){
  r.position=mix(r.position,next,first.t);
  if(first.index===BODIES.length){if(sunIsOut(s)){r.position=surface(first.p,unit(r.position),1.12);r.velocity=[0,0,0];s.event='Just a cool little ember now.';}else knockIntoSun(s,'sun');return;}
  const n=unit(sub(r.position,first.p.p)),heading=r.heading,wasNew=!s.visited.includes(first.index);
  land(s,first.index,n,heading);s.event=first.index===MOON_INDEX?(sunIsOut(s)?'Welcome back, captain! Look at all those stars.':'You landed on New Moon! He’s aiming at the sun!'):wasNew&&s.visited.length===8?'All eight planets! Rainbow jetpack unlocked!':`Touchdown on ${first.p.name}! Your boots are in charge.`;s.effect='arrival';return;
 }
 r.position=next;
 if(r.time<.8){const p=BODIES[s.planet],offset=sub(r.position,p.p);if(length(offset)<p.r+.13)r.position=surface(p,unit(offset),.13);}
}
export function knockIntoSun(s,cause='meteor'){
 if((s.mode!=='walk'&&s.mode!=='flight')||sunIsOut(s))return false;
 const start=position(s),hot=surface(SUN,unit(sub(start,SUN.p)),1.1);s.mode='sun';s.ride={time:cause==='sun'?2.2:0,phase:cause==='sun'?'hot':'knock',start,hot,home:s.planet,position:cause==='sun'?hot:start};s.meteors=s.meteors.filter(m=>m.aim==='sun');if(cause==='meteor')s.hits++;s.vy=0;s.event=cause==='sun'?"Oh, that's hot, hot, hot!":'BONK! New Moon sent you sunward!';if(cause==='sun')s.effect='hot';return true;
}
export const SUN_DURATION=8;
export function sunPose(ride){let t=ride.time;
 if(t<2.2){const u=smooth(t/2.2),n=unit(ride.hot),bend=unit(sub(UP,mul(n,dot(UP,n))));const arc=length(bend)<.01?[1,0,0]:bend;return{phase:'knock',p:add(mix(ride.start,ride.hot,u),mul(arc,Math.sin(u*Math.PI)*23))};}
 t-=2.2;if(t<2){const n=unit(ride.hot);return{phase:'hot',p:add(ride.hot,mul(n,Math.abs(Math.sin(t*Math.PI*3))*2.5))};}
 t-=2;if(t<1.2){const u=smooth(t/1.2);return{phase:'rescue',p:surface(SUN,normalMix(unit(ride.hot),UP,u),1.1+Math.sin(u*Math.PI)*5)};}const u=smooth((t-1.2)/2.6),p=mix(surface(SUN,UP,1.1),surface(BODIES[ride.home],UP),u);p[1]+=Math.sin(u*Math.PI)*42;return{phase:t>=3.8?'done':'rescue',p};
}
export function meteorPosition(m){const delay=m.aim==='sun'?.4:1.8,duration=m.aim==='sun'?1.55:1.4;if(m.age<delay)return m.from;const u=clamp((m.age-delay)/duration);return add(mix(m.from,m.target,u),mul(m.n,Math.sin(u*Math.PI)*4));}
function solarShow(s,dt){
 s.sunGlow=Math.max(1-s.sunHits/SUN_HITS,s.sunGlow-dt*.65);
 if(!s.moonFriendly)return;
 s.nextSunMeteor-=dt;
 if(s.sunShots<SUN_HITS&&s.nextSunMeteor<=0){s.sunShots++;s.nextSunMeteor=2.1;const from=add(NEW_MOON.p,[4.5,1,-2]);s.meteors.push({id:s.meteorId++,aim:'sun',kind:s.sunShots%2?'asteroid':'meteorite',age:0,from,target:surface(SUN,unit(from),sunRadius(s)-SUN.r),n:UP});}
 for(const m of s.meteors){if(m.aim!=='sun')continue;m.age+=dt;m.target=surface(SUN,unit(m.from),sunRadius(s)-SUN.r);if(m.age>=1.95){m.done=true;s.sunHits=Math.min(SUN_HITS,s.sunHits+1);s.impact=[...m.target];s.event=sunIsOut(s)?'Pfffft! The sun is out. Hello, starry night!':`Bonk! The sun shrank! ${SUN_HITS-s.sunHits} ${SUN_HITS-s.sunHits===1?'hit':'hits'} until lights out.`;s.effect=sunIsOut(s)?'sun-out':'sun-hit';}}
 s.meteors=s.meteors.filter(m=>!m.done);
}
export function tick(s,dt,input={x:0,z:0}){
 s.time+=dt;s.event='';s.effect=null;
 solarShow(s,dt);
 if(s.mode==='flight'){fly(s,dt,input);return;}
 if(s.mode==='sun'){const r=s.ride,old=r.phase;if(sunIsOut(s)){land(s,r.home);s.event='Lights out! The comet brings you back to watch the stars.';return;}r.time+=dt;const p=sunPose(r);r.position=p.p;r.phase=p.phase;if(p.phase==='hot'&&old!=='hot'){s.event="Oh, that's hot, hot, hot!";s.effect='hot';}if(p.phase==='rescue'&&old!=='rescue'){s.event='Cooling comet to the rescue!';s.effect='rescue';}if(p.phase==='done'){land(s,r.home);s.nextMeteor=12;s.event='Phew! Back on your planet. Your stardust is safe.';s.effect='arrival';}return;}
 const planet=BODIES[s.planet],amount=Math.hypot(input.x||0,input.z||0);
 if(amount>.01){const right=cross(s.north,s.n),dir=unit(add(mul(right,input.x),mul(s.north,-input.z))),axis=unit(cross(s.n,dir)),angle=5.5*Math.min(1,amount)*dt/planet.r;s.n=unit(rotate(s.n,axis,angle));s.north=unit(rotate(s.north,axis,angle));s.facing=Math.atan2(input.x,-input.z);}
 if(s.height>0||s.vy>0){s.height+=s.vy*dt;s.vy-=planet.gravity*dt;if(s.height<0)s.height=s.vy=0;}
 s.padCooldown=Math.max(0,s.padCooldown-dt);
 if(s.planet<MOON_INDEX&&s.height<.12&&s.padCooldown===0&&length(sub(surface(planet,s.n),surface(planet,padNormal)))<1.3){s.height=.15;s.vy=10;s.padCooldown=3;s.bounces++;s.event='Boing! A little extra planet power.';s.effect='bounce';}
 if(s.planet<MOON_INDEX)for(let i=0;i<starNormals.length;i++){const id=`${s.planet}:${i}`;if(!s.stars.includes(id)&&length(sub(position(s),surface(planet,starNormals[i],.7)))<1.8){s.stars.push(id);s.event=s.stars.length===24?'24 / 24 stardust! You’re a cosmic superstar!':`Stardust! ${s.stars.length} / 24 collected.`;s.effect='star';}}
 if(s.moonFriendly)return;
 s.nextMeteor-=dt;
 if(s.nextMeteor<=0){const n=[...s.n];s.meteors.push({id:s.meteorId++,kind:['rock','asteroid','meteorite'][s.meteorId%3],age:0,from:monsterPosition(s),target:surface(planet,n,.8),n});s.nextMeteor=9;s.event='New Moon is throwing! Dodge the glowing target—or jump!';}
 for(const m of s.meteors){m.age+=dt;if(m.age>=3.2&&!m.done){m.done=true;const chest=surface(planet,s.n,s.height+.8);if(length(sub(chest,m.target))<2.05){knockIntoSun(s);return;}s.dodges++;s.event='Missed me! Nice dodge.';s.effect='dodge';}}
 s.meteors=s.meteors.filter(m=>!m.done);
}
