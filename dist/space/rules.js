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
export const UP=[0,1,0];
export const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
export const length=a=>Math.hypot(...a),unit=a=>mul(a,1/(length(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function rotate(v,axis,a){return add(add(mul(v,Math.cos(a)),mul(cross(axis,v),Math.sin(a))),mul(axis,dot(axis,v)*(1-Math.cos(a))));}
export function normalMix(a,b,t){const d=Math.max(-1,Math.min(1,dot(a,b)));if(d>.99999)return unit(mix(a,b,t));let axis=cross(a,b);if(length(axis)<.001)axis=cross(a,Math.abs(a[0])<.8?[1,0,0]:[0,0,1]);return rotate(a,unit(axis),Math.acos(d)*t);}
export const surface=(planet,n,h=0)=>add(planet.p,mul(n,planet.r+h));
export const starNormals=[unit([.48,1,.12]),unit([-.48,1,-.48]),unit([.1,1,-.85])];
export const padNormal=unit([-.58,1,.25]);
export function createState(){return{planet:2,n:[...UP],north:[0,0,-1],height:0,vy:0,facing:Math.PI,time:0,mode:'walk',ride:null,visited:[2],stars:[],meteors:[],nextMeteor:10,meteorId:0,hits:0,dodges:0,bounces:0,padCooldown:0,event:'',effect:null};}
export function position(s){return s.mode==='walk'?surface(PLANETS[s.planet],s.n,s.height):s.ride.position;}
export function monsterPosition(s){const right=cross(s.north,s.n);return add(surface(PLANETS[s.planet],s.n,3),add(mul(s.north,12),mul(right,-4)));}
export function jump(s){if(s.mode==='walk'&&s.height===0){s.vy=7.5;s.height=.01;return true;}return false;}
export function home(s){s.planet=2;s.n=[...UP];s.north=[0,0,-1];s.height=s.vy=0;s.mode='walk';s.ride=null;s.meteors=[];s.nextMeteor=10;s.event='Welcome home, space explorer!';}
export function startFlight(s,destination){if(s.mode!=='walk'||!Number.isInteger(destination)||destination<0||destination>=PLANETS.length||destination===s.planet)return false;s.mode='flight';s.ride={time:0,from:s.planet,to:destination,startN:[...s.n],startHeight:s.height,position:surface(PLANETS[s.planet],s.n,s.height),phase:'lift'};s.meteors=[];s.vy=0;s.event=`Jetpack on! Next stop: ${PLANETS[destination].name}.`;return true;}
export const FLIGHT_DURATION=6.6;
export function flightPose(ride){const from=PLANETS[ride.from],to=PLANETS[ride.to];let t=ride.time;
 if(t<.8)return{phase:'lift',p:surface(from,ride.startN,ride.startHeight+(5-ride.startHeight)*smooth(t/.8)),up:ride.startN};
 t-=.8;if(t<1.2){const n=normalMix(ride.startN,UP,smooth(t/1.2));return{phase:'orbit',p:surface(from,n,5),up:n};}
 t-=1.2;if(t<3.6){const u=smooth(t/3.6),a=surface(from,UP,5),b=surface(to,UP,5),p=mix(a,b,u);p[1]+=Math.sin(u*Math.PI)*48;return{phase:'cruise',p,up:UP};}
 t-=3.6;return{phase:t>=1?'done':'land',p:surface(to,UP,5*(1-smooth(t))),up:UP};
}
function land(s,index){s.planet=index;s.n=[...UP];s.north=[0,0,-1];s.height=s.vy=0;s.facing=Math.PI;s.mode='walk';s.ride=null;s.meteors=[];s.nextMeteor=8;if(!s.visited.includes(index))s.visited.push(index);}
export function knockIntoSun(s){if(s.mode!=='walk')return false;const start=position(s),hot=surface(SUN,unit(sub(start,SUN.p)),1.1);s.mode='sun';s.ride={time:0,phase:'knock',start,hot,home:s.planet,position:start};s.meteors=[];s.hits++;s.vy=0;s.event='BONK! New Moon sent you sunward!';return true;}
export const SUN_DURATION=8;
export function sunPose(ride){let t=ride.time;
 if(t<2.2){const u=smooth(t/2.2),n=unit(ride.hot),bend=unit(sub(UP,mul(n,dot(UP,n))));const arc=length(bend)<.01?[1,0,0]:bend;return{phase:'knock',p:add(mix(ride.start,ride.hot,u),mul(arc,Math.sin(u*Math.PI)*23))};}
 t-=2.2;if(t<2){const n=unit(ride.hot);return{phase:'hot',p:add(ride.hot,mul(n,Math.abs(Math.sin(t*Math.PI*3))*2.5))};}
 t-=2;if(t<1.2){const u=smooth(t/1.2);return{phase:'rescue',p:surface(SUN,normalMix(unit(ride.hot),UP,u),1.1+Math.sin(u*Math.PI)*5)};}const u=smooth((t-1.2)/2.6),p=mix(surface(SUN,UP,1.1),surface(PLANETS[ride.home],UP),u);p[1]+=Math.sin(u*Math.PI)*42;return{phase:t>=3.8?'done':'rescue',p};
}
export function meteorPosition(m){if(m.age<1.8)return m.from;const u=clamp((m.age-1.8)/1.4);return add(mix(m.from,m.target,u),mul(m.n,Math.sin(u*Math.PI)*4));}
export function tick(s,dt,input={x:0,z:0}){
 s.time+=dt;s.event='';s.effect=null;
 if(s.mode==='flight'){const r=s.ride;r.time+=dt;const p=flightPose(r);r.position=p.p;r.up=p.up;r.phase=p.phase;if(p.phase==='done'){const to=r.to;land(s,to);s.event=s.visited.length===8?'All eight planets! Rainbow jetpack unlocked!':`Welcome to ${PLANETS[to].name}! ${PLANETS[to].tag}.`;s.effect='arrival';}return;}
 if(s.mode==='sun'){const r=s.ride,old=r.phase;r.time+=dt;const p=sunPose(r);r.position=p.p;r.phase=p.phase;if(p.phase==='hot'&&old!=='hot'){s.event="Oh, that's hot, hot, hot!";s.effect='hot';}if(p.phase==='rescue'&&old!=='rescue'){s.event='Cooling comet to the rescue!';s.effect='rescue';}if(p.phase==='done'){land(s,r.home);s.nextMeteor=12;s.event='Phew! Back on your planet. Your stardust is safe.';s.effect='arrival';}return;}
 const planet=PLANETS[s.planet],amount=Math.hypot(input.x,input.z);
 if(amount>.01){const right=cross(s.north,s.n),dir=unit(add(mul(right,input.x),mul(s.north,-input.z))),axis=unit(cross(s.n,dir)),angle=5.5*Math.min(1,amount)*dt/planet.r;s.n=unit(rotate(s.n,axis,angle));s.north=unit(rotate(s.north,axis,angle));s.facing=Math.atan2(input.x,-input.z);}
 if(s.height>0||s.vy>0){s.height+=s.vy*dt;s.vy-=planet.gravity*dt;if(s.height<0)s.height=s.vy=0;}
 s.padCooldown=Math.max(0,s.padCooldown-dt);
 if(s.height<.12&&s.padCooldown===0&&length(sub(surface(planet,s.n),surface(planet,padNormal)))<1.3){s.height=.15;s.vy=10;s.padCooldown=3;s.bounces++;s.event='Boing! A little extra planet power.';s.effect='bounce';}
 for(let i=0;i<starNormals.length;i++){const id=`${s.planet}:${i}`;if(!s.stars.includes(id)&&length(sub(position(s),surface(planet,starNormals[i],.7)))<1.8){s.stars.push(id);s.event=s.stars.length===24?'24 / 24 stardust! You’re a cosmic superstar!':`Stardust! ${s.stars.length} / 24 collected.`;s.effect='star';}}
 s.nextMeteor-=dt;
 if(s.nextMeteor<=0){const n=[...s.n];s.meteors.push({id:s.meteorId++,kind:['rock','asteroid','meteorite'][s.meteorId%3],age:0,from:monsterPosition(s),target:surface(planet,n,.8),n});s.nextMeteor=9;s.event='New Moon is throwing! Dodge the glowing target—or jump!';}
 for(const m of s.meteors){m.age+=dt;if(m.age>=3.2&&!m.done){m.done=true;const chest=surface(planet,s.n,s.height+.8);if(length(sub(chest,m.target))<2.05){knockIntoSun(s);return;}s.dodges++;s.event='Missed me! Nice dodge.';s.effect='dodge';}}
 s.meteors=s.meteors.filter(m=>!m.done);
}
