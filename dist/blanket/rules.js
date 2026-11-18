export const FORT={x:-13,z:-9},TOSS={x:14,z:-5},CARPET={x:-16,z:13},BOUNCES=[{x:8,z:11},{x:-3,z:-18}];
export const COZY={x:10,z:18};
export const KIDS=[
 {name:'Pip',x:-5,z:12,color:'#e9a9b9'},
 {name:'Doodle',x:4,z:6,color:'#a9cdb9'},
 {name:'Mochi',x:17,z:7,color:'#e9c58e'},
 {name:'Button',x:-8,z:19,color:'#a7bed9'},
 {name:'Noodle',x:20,z:18,color:'#c2a5d7'},
 {name:'Pebble',x:4,z:-13,color:'#e7b29a'},
 {name:'Pudding',x:-12,z:-20,color:'#d7c68d'},
 {name:'Wisp',x:9,z:23,color:'#a6cdd0'},
];
export const BUTTONS=[{x:-3,z:9},{x:-21,z:0},{x:-21,z:-19},{x:4,z:-21},{x:22,z:9},{x:6,z:20}];
export const WALLS=[{x:-19,z:-9,w:.5,d:10},{x:-7,z:-9,w:.5,d:10},{x:-13,z:-14,w:12,d:.5},{x:-17.1,z:-4,w:3.8,d:.5},{x:-8.9,z:-4,w:3.8,d:.5}];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const groundHeight=(x,z)=>.25+2.4*Math.exp(-((x-22)**2+(z-16)**2)/55)+1.8*Math.exp(-((x+23)**2+(z+19)**2)/50)+1.3*Math.exp(-((x+5)**2+(z-24)**2)/34);
export const inFort=p=>p.x>-18.5&&p.x<-7.5&&p.z>-13.6&&p.z<-3.6;
export const weather=s=>s.time%58<27?'calm':s.time%58<31?'warning':s.time%58<46?'storm':'calm';
export const basketX=t=>TOSS.x+4.5*Math.sin(t*1.15);
export const throwReady=s=>!!s.game&&Math.abs(basketX(s.time+1.15)-TOSS.x)<2;
export function createState(){return{x:0,z:18,y:groundHeight(0,18),vy:0,yaw:Math.PI,time:0,buttons:[],badges:{fort:false,toss:false,flight:false,brave:false},monster:{x:-1,z:-8,nap:0},kids:KIDS.map(k=>({...k,met:false,happy:0,follow:0})),cozy:null,kidCooldown:0,ride:null,rideCooldown:0,bounceCooldown:0,tickleCooldown:0,game:null,throws:[],throwId:0,bounces:0,catches:0,rounds:0,lastScore:0,event:'',effect:null};}
function say(s,event,effect=null){s.event=event;s.effect=effect;}
export function nearby(s){if(s.ride)return null;if(s.cozy)return{kind:'peek',name:'Play peekaboo!'};if(s.game)return{kind:'throw',name:'Throw a pillow'};if(dist(s,COZY)<3.3)return{kind:'cozy',name:'Snuggle in the blanket'};if(dist(s,TOSS)<3.3)return{kind:'toss',name:'Play Pillow Toss'};if(dist(s,CARPET)<3.3&&s.rideCooldown===0)return{kind:'flight',name:'Ride the flying quilt'};if(inFort(s)||dist(s,{x:FORT.x,z:-2.5})<3.2)return{kind:'fort',name:s.badges.fort?'Make a wish':s.buttons.length===BUTTONS.length?'Light up the fort':`Bring ${BUTTONS.length-s.buttons.length} more buttons`};if(dist(s,s.monster)<4.8&&s.tickleCooldown===0)return{kind:'tickle',name:'Tickle Snooze!'};const kid=s.kids.reduce((closest,k,i)=>dist(s,k)<2.8&&(!closest||dist(s,k)<dist(s,s.kids[closest.index]))?{kind:'kid',index:i,name:`Tickle ${k.name}`} : closest,null);if(kid&&s.kidCooldown===0)return kid;return null;}
export function jump(s){if(s.cozy){leaveCozy(s);s.vy=8;s.y+=.04;return true;}if(!s.ride&&s.y<=groundHeight(s.x,s.z)+.03){s.vy=8;s.y+=.04;return true;}return false;}
export function home(s){s.x=0;s.z=18;s.y=groundHeight(s.x,s.z);s.vy=0;s.yaw=Math.PI;s.ride=null;s.cozy=null;s.game=null;s.throws=[];s.rideCooldown=3;s.monster.nap=Math.max(4,s.monster.nap);say(s,'Back at the welcome quilt. Your buttons and badges came too.');}
export function act(s){const near=nearby(s);if(!near)return false;
 if(near.kind==='cozy'){s.cozy={time:0,peek:0,peekCooldown:0,start:{x:s.x,y:s.y,z:s.z}};s.vy=0;say(s,'All tucked in! The little Snoozes are coming over for peekaboo.','snuggle');}
 else if(near.kind==='peek'){if(s.cozy.peekCooldown>0)return false;s.cozy.peek=1.6;s.cozy.peekCooldown=2.2;s.kids.forEach(k=>{k.happy=3;});say(s,'PEEKABOO! Eight little giggles, one very cozy blanket.','peek');}
 else if(near.kind==='kid'){const k=s.kids[near.index];k.met=true;k.happy=3;k.follow=18;s.kidCooldown=1.3;say(s,`${k.name} says hee-hee! You have a little blanket buddy.`, 'kid');}
 else if(near.kind==='toss'){s.game={left:40,score:0,cooldown:0};s.throws=[];s.rounds++;say(s,'Pillow Toss! Throw when the ring turns mint. Score 5 in 40 seconds!','start');}
 else if(near.kind==='throw'){if(s.game.cooldown>0)return false;s.throws.push({id:s.throwId++,age:0,from:{x:s.x,y:s.y+1.4,z:s.z},to:{x:TOSS.x,y:1.7,z:-16}});s.game.cooldown=.8;say(s,'Fwoomp!','throw');}
 else if(near.kind==='flight'){s.ride={kind:'flight',time:0,start:{x:s.x,y:s.y,z:s.z}};s.vy=0;say(s,'All aboard! This quilt has places to be.','flight');}
 else if(near.kind==='tickle'){s.monster.nap=16;s.tickleCooldown=6;s.badges.brave=true;say(s,'Hee hee! Snooze is too ticklish to be scary.','badge');}
 else if(near.kind==='fort'){if(s.buttons.length===BUTTONS.length){const first=!s.badges.fort;s.badges.fort=true;say(s,first?'Every button is home! The fort is full of wishing lights.':'A little wish, a little sparkle. You belong here.','fort');}else say(s,`The fort needs ${BUTTONS.length-s.buttons.length} more golden buttons. Follow their sparkles!`);}
 return true;
}
export function leaveCozy(s){
 if(!s.cozy)return false;
 s.cozy=null;s.vy=0;s.y=groundHeight(s.x,s.z);s.monster.nap=Math.max(3,s.monster.nap);
 say(s,'One last snuggle. Your blanket will be here when you come back.');return true;
}
export function kidTarget(s,index){
 const k=s.kids[index],a=index/8*Math.PI*2;
 if(s.cozy||weather(s)==='storm')return{x:COZY.x+Math.sin(a)*4.4,z:COZY.z+Math.cos(a)*4.4};
 if(k.follow>0&&!s.ride)return{x:s.x+Math.sin(a)*2.1,z:s.z+Math.cos(a)*2.1};
 const home=KIDS[index];return{x:home.x+Math.sin(s.time*.32+index)*1.5,z:home.z+Math.cos(s.time*.27+index)*1.3};
}
function tickKids(s,dt){
 s.kids.forEach((k,index)=>{
  k.happy=Math.max(0,k.happy-dt);k.follow=Math.max(0,k.follow-dt);
  const target=kidTarget(s,index),d=dist(k,target),step=Math.min(d,dt*(s.cozy||weather(s)==='storm'?3.2:k.follow>0?5:1.6));
  if(d>.08)move(k,(target.x-k.x)/d*step,(target.z-k.z)/d*step);
 });
}
const smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
export function ridePose(ride){const t=ride.time;
 if(ride.kind==='flight'){
  if(t<1.2){const u=smooth(t/1.2);return{x:mix(ride.start.x,CARPET.x,u),y:mix(ride.start.y,8,u),z:mix(ride.start.z,CARPET.z,u),phase:'lift'};}
  if(t<9.2){const a=(t-1.2)/8*Math.PI*2;return{x:CARPET.x+21*Math.sin(a),y:8+7*Math.sin(a/2),z:CARPET.z-30*Math.sin(a/2),phase:'fly'};}
  const u=smooth(clamp((t-9.2)/1.5,0,1));return{x:CARPET.x,y:mix(8,groundHeight(CARPET.x,CARPET.z),u),z:CARPET.z,phase:t>=10.7?'done':'land'};
 }
 const u=clamp(t/4.2,0,1),e=smooth(u),end={x:-13,z:-1.5};return{x:mix(ride.start.x,end.x,e),y:mix(ride.start.y,groundHeight(end.x,end.z),e)+Math.sin(u*Math.PI)*4,z:mix(ride.start.z,end.z,e),phase:u===1?'done':'burrito'};
}
export function pillowPosition(p){const u=clamp(p.age/1.15,0,1);return{x:mix(p.from.x,p.to.x,u),y:mix(p.from.y,p.to.y,u)+Math.sin(u*Math.PI)*5,z:mix(p.from.z,p.to.z,u)};}
function move(s,dx,dz){
 const blocked=(x,z)=>WALLS.some(b=>Math.abs(x-b.x)<b.w/2+.4&&Math.abs(z-b.z)<b.d/2+.4);
 const x=clamp(s.x+dx,-27,27),z=clamp(s.z+dz,-25,25);if(!blocked(x,s.z))s.x=x;if(!blocked(s.x,z))s.z=z;
}
export function tick(s,dt,input={x:0,z:0}){
 const oldWeather=weather(s);s.time+=dt;s.event='';s.effect=null;const sky=weather(s);
 for(const key of ['rideCooldown','bounceCooldown','tickleCooldown','kidCooldown'])s[key]=Math.max(0,s[key]-dt);s.monster.nap=Math.max(0,s.monster.nap-dt);
 if(sky!==oldWeather){if(sky==='warning')say(s,'Uh-oh… the bedtime wind is waking Snooze!','warning');if(sky==='storm')say(s,'BLANKET BLIZZARD! Hide in the fort, or tickle Snooze!','storm');if(sky==='calm')say(s,'The wind is sleepy again. Back to cozy adventures.');}
 tickKids(s,dt);
 if(s.cozy){
  if(Math.hypot(input.x||0,input.z||0)>.1)leaveCozy(s);
  else{s.monster.nap=Math.max(2,s.monster.nap);const c=s.cozy;c.time+=dt;c.peek=Math.max(0,c.peek-dt);c.peekCooldown=Math.max(0,c.peekCooldown-dt);const u=smooth(clamp(c.time/.65,0,1));s.x=mix(c.start.x,COZY.x,u);s.z=mix(c.start.z,COZY.z,u);s.y=mix(c.start.y,groundHeight(COZY.x,COZY.z),u);s.yaw=0;return;}
 }
 if(s.ride){const ride=s.ride;ride.time+=dt;const p=ridePose(ride);Object.assign(s,{x:p.x,y:p.y,z:p.z});if(p.phase==='done'){s.ride=null;s.rideCooldown=4;s.y=groundHeight(s.x,s.z);s.monster.nap=Math.max(5,s.monster.nap);if(ride.kind==='flight'){s.badges.flight=true;say(s,'Quilt pilot! A soft landing and a shiny little badge.','badge');}else say(s,'Special delivery: one cozy burrito! You kept all your buttons.','land');}return;}
 const amount=Math.hypot(input.x||0,input.z||0),floor=groundHeight(s.x,s.z),grounded=s.y<=floor+.03&&s.vy<=0;
 if(amount>.01){move(s,(input.x||0)/Math.max(1,amount)*7*dt,(input.z||0)/Math.max(1,amount)*7*dt);s.yaw=Math.atan2(input.x||0,input.z||0);}
 const nextFloor=groundHeight(s.x,s.z);if(grounded)s.y=nextFloor;else{s.y+=s.vy*dt;s.vy-=18*dt;if(s.y<=nextFloor){s.y=nextFloor;s.vy=0;}}
 if(!s.game&&s.bounceCooldown===0&&s.y<nextFloor+.3&&BOUNCES.some(p=>dist(s,p)<2.1)){s.y+=.05;s.vy=15;s.bounceCooldown=2;s.bounces++;say(s,'BOING! That quilt is extra springy.','bounce');}
 BUTTONS.forEach((b,i)=>{if(!s.buttons.includes(i)&&dist(s,b)<1.4&&Math.abs(s.y-groundHeight(b.x,b.z))<2){s.buttons.push(i);say(s,s.buttons.length===BUTTONS.length?'All six buttons! Take them to the blanket fort.':`A lost button! ${s.buttons.length} / ${BUTTONS.length} rescued.`,'button');}});
 const m=s.monster;
 if(m.nap===0){let target;if(sky==='storm'&&!inFort(s)&&!s.game)target=s;else target={x:2+5*Math.sin(s.time*.12),z:-9+4*Math.cos(s.time*.16)};const d=dist(m,target),speed=sky==='storm'&&!inFort(s)&&!s.game?5.5:1.4;if(d>.1){const step=Math.min(d,speed*dt);move(m,(target.x-m.x)/d*step,(target.z-m.z)/d*step);}
 if(sky==='storm'&&!inFort(s)&&!s.game&&dist(s,m)<2.2&&s.y-nextFloor<1.8){s.ride={kind:'burrito',time:0,start:{x:s.x,y:s.y,z:s.z}};s.vy=0;s.catches++;m.nap=10;say(s,'SNUGGLE ATTACK! You’re a flying blanket burrito!','burrito');return;}}
 const g=s.game;if(!g)return;
 if(dist(s,TOSS)>5){s.lastScore=g.score;s.game=null;s.throws=[];say(s,'Pillow game paused. Come back to the mat for another round.');return;}
 g.left=Math.max(0,g.left-dt);g.cooldown=Math.max(0,g.cooldown-dt);
 for(const p of s.throws){p.age+=dt;if(p.age>=1.15&&!p.done){p.done=true;if(Math.abs(basketX(s.time)-p.to.x)<2){g.score++;say(s,`Fluffy bullseye! ${g.score} / 5.`,'score');}else say(s,'Plop! Try throwing when the ring is mint.','miss');}}
 s.throws=s.throws.filter(p=>!p.done);
 if(g.score>=5||g.left===0){s.lastScore=g.score;s.game=null;s.throws=[];if(g.score>=5){s.badges.toss=true;say(s,'PILLOW CHAMPION! Five perfectly fluffy shots.','badge');}else say(s,`${s.lastScore} fluffy hits! The pillows are ready for a rematch.`);}
}
