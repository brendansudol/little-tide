import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,tick,taste,openOrder,serveCake,startCatch,stopCatch,cookiePosition,DOUGH,MIXER,mixerPose,returnHome,jump} from '../dist/bakery/rules.js';
function step(s,t,input={x:0,z:0},fps=60){for(let i=0;i<t*fps;i++)tick(s,1/fps,input);}
test('Cake orders require proximity, match both choices, and award once',()=>{const s=createState();assert.equal(openOrder(s),null);s.x=10;s.z=3.5;const order=openOrder(s);assert.deepEqual(order,{flavor:0,topping:0});assert.equal(serveCake(s,1,0),'retry');assert.equal(s.cakes,0);assert.equal(serveCake(s,0,0),'correct');assert.equal(serveCake(s,0,0),'ignored');assert.equal(s.cakes,1);assert.equal(s.badges.cake,true);assert.deepEqual(openOrder(s),{flavor:1,topping:0});});
test('Tasting requires the counter and a cooldown; all five tastes earn a badge',()=>{const s=createState();assert.equal(taste(s),false);s.x=8;s.z=12.5;for(let i=0;i<5;i++){assert.ok(taste(s));assert.equal(taste(s),false);assert.equal(s.badges.treats,i===4);step(s,1.3);}assert.equal(s.tasted,5);});
test('Dough bounces and lands without getting stuck at 30, 60 and 120 fps',()=>{for(const fps of [30,60,120]){const s=createState();s.x=DOUGH.x;s.z=DOUGH.z;step(s,.1,undefined,fps);assert.equal(s.bounces,1);step(s,.5,undefined,fps);assert.ok(s.y>4);step(s,2,{x:1,z:0},fps);assert.equal(s.y,0);}});
test('Cookie game is winnable by following targets, scores only once, and terminates',()=>{for(const fps of [30,60,120]){const s=createState();assert.equal(startCatch(s),false);s.x=-9;s.z=-8;assert.ok(startCatch(s));assert.equal(startCatch(s),false);for(let i=0;i<32*fps&&s.game;i++){const target=s.game.cookies[0];const dx=target?target.x-s.x:0,dz=target?target.z-s.z:0;tick(s,1/fps,{x:Math.abs(dx)<.15?0:Math.sign(dx),z:Math.abs(dz)<.15?0:Math.sign(dz)});}assert.equal(s.game,null);assert.equal(s.lastCatch,10);assert.ok(s.badges.cookies);}});
test('Misses and cancellation never grant a catch badge; trajectories land on markers',()=>{const s=createState();s.x=-9;s.z=-8;startCatch(s);s.x=0;s.z=12;step(s,32);assert.equal(s.lastCatch,0);assert.equal(s.badges.cookies,false);s.x=-9;s.z=-8;startCatch(s);stopCatch(s);assert.equal(s.game,null);const p=cookiePosition({age:2.4,x:-12,z:1});assert.ok(Math.abs(p.x+12)<1e-9&&Math.abs(p.y-1.6)<1e-9&&Math.abs(p.z-1)<1e-9);});
test('Counters are solid and the baker stays within the bakery',()=>{const s=createState();s.x=10;s.z=4;step(s,2,{x:0,z:-1});assert.ok(s.z>=2.8);s.x=0;s.z=12;step(s,20,{x:0,z:1});assert.equal(s.z,15);});
test('Walking close automatically mixes, launches beyond the bakery and returns safely at every frame rate',()=>{
 for(const fps of [30,60,120]){
  const s=createState();s.badges.cake=true;s.cakes=2;s.tasted=3;
  step(s,3,{x:0,z:-1},fps);assert.ok(s.mixerRide);assert.equal(s.mixerRides,1);
  const phases=new Set();let highest=0,farthest=0;
  for(let i=0;i<12*fps&&s.mixerRide;i++){
   phases.add(s.mixerRide.phase);jump(s);assert.equal(s.jumpV,0);
   assert.equal(taste(s),false);assert.equal(openOrder(s),null);assert.equal(startCatch(s),false);
   tick(s,1/fps,{x:1,z:-1});highest=Math.max(highest,s.y);farthest=Math.max(farthest,s.x);
  }
  assert.deepEqual([...phases],['scoop','mix','launch','return']);assert.ok(highest>35);assert.ok(farthest>32);
  assert.equal(s.mixerRide,null);assert.deepEqual([s.x,s.y,s.z],[0,0,12]);assert.equal(s.jumpV,0);
  assert.equal(s.cakes,2);assert.equal(s.tasted,3);assert.ok(s.badges.cake);
  assert.ok(s.mixerCooldown>0);s.x=MIXER.x;s.z=MIXER.triggerZ;tick(s,1/fps);assert.equal(s.mixerRide,null);
  step(s,4.2,undefined,fps);assert.equal(s.mixerRides,2);assert.ok(s.mixerRide);
 }
});
test('Mixer trajectory is continuous at phase joins and clears the walls on the return',()=>{
 const ride={time:0,start:{x:1,y:0,z:-6}};
 for(const t of [MIXER.scoop,MIXER.scoop+MIXER.mix,MIXER.scoop+MIXER.mix+MIXER.launch,MIXER.scoop+MIXER.mix+MIXER.launch+MIXER.return]){
  const a=mixerPose({...ride,time:t-1e-6}),b=mixerPose({...ride,time:t+1e-6});
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);
 }
 for(let t=0;t<MIXER.return;t+=.01){const p=mixerPose({...ride,time:MIXER.scoop+MIXER.mix+MIXER.launch+t});if(p.x>17&&p.x<20)assert.ok(p.y>8);}
});
test('Mixer does not interrupt a cookie round or cake order; home cancels every ride phase',()=>{
 for(const mode of ['game','order']){const s=createState();if(mode==='game'){s.x=-9;s.z=-8;startCatch(s);}else s.order={flavor:0,topping:0};s.x=MIXER.x;s.z=MIXER.triggerZ;step(s,1);assert.equal(s.mixerRide,null);}
 for(const phaseTime of [.2,2,5,9]){const s=createState();s.x=MIXER.x;s.z=MIXER.triggerZ;tick(s,.01);step(s,phaseTime);assert.ok(s.mixerRide);s.badges.treats=true;returnHome(s);tick(s,1/60);assert.equal(s.mixerRide,null);assert.deepEqual([s.x,s.y,s.z],[0,0,12]);assert.ok(s.badges.treats);}
});
