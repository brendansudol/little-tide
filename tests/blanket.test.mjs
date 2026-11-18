import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FORT,TOSS,CARPET,COZY,KIDS,BOUNCES,BUTTONS,WALLS,groundHeight,inFort,weather,basketX,throwReady,createState,nearby,jump,home,act,leaveCozy,kidTarget,tick,ridePose,pillowPosition,dist} from '../dist/blanket/rules.js';
const step=(s,seconds,input={x:0,z:0},fps=60)=>{for(let i=0;i<Math.ceil(seconds*fps);i++)tick(s,1/fps,input);};
const place=(s,p)=>Object.assign(s,{x:p.x,z:p.z,y:groundHeight(p.x,p.z),vy:0});
const near=(a,b)=>{for(const k of ['x','y','z'])assert.ok(Math.abs(a[k]-b[k])<.001,`${k}: ${a[k]} / ${b[k]}`);};
test('Walking follows quilt hills, respects all walls and boundaries, and enters the fort doorway',()=>{
 for(const fps of [30,60,120]){const s=createState();s.monster.nap=1000;step(s,9,{x:1,z:1},fps);assert.equal(s.x,27);assert.equal(s.z,25);assert.equal(s.y,groundHeight(s.x,s.z));place(s,{x:-13,z:0});step(s,1.4,{x:0,z:-1},fps);assert.ok(inFort(s));step(s,2,{x:0,z:-1},fps);assert.ok(s.z>-13.4);step(s,2,{x:1,z:0},fps);assert.ok(s.x<-7.5);for(const wall of WALLS)assert.ok(!(Math.abs(s.x-wall.x)<wall.w/2+.399&&Math.abs(s.z-wall.z)<wall.d/2+.399));}
});
test('Six unique buttons unlock the fort only when returned, and Home preserves all discoveries',()=>{
 const s=createState();assert.equal(act(s),false);s.monster.nap=1000;for(const b of BUTTONS){place(s,b);step(s,.1);step(s,.2);}assert.equal(s.buttons.length,6);assert.equal(s.badges.fort,false);assert.equal(act(s),false);place(s,FORT);assert.equal(nearby(s).kind,'fort');assert.ok(act(s));assert.ok(s.badges.fort);assert.equal(s.effect,'fort');home(s);assert.equal(s.buttons.length,6);assert.ok(s.badges.fort);assert.equal(s.ride,null);
 const empty=createState();place(empty,FORT);act(empty);assert.equal(empty.badges.fort,false);
});
test('Pink quilts bounce automatically, jumping lands on terrain, and cooldowns avoid repeated launches',()=>{
 for(const fps of [30,60,120]){const s=createState();s.monster.nap=1000;assert.ok(jump(s));assert.equal(jump(s),false);step(s,1.5,undefined,fps);assert.equal(s.y,groundHeight(s.x,s.z));place(s,BOUNCES[0]);step(s,.1,undefined,fps);assert.equal(s.bounces,1);step(s,.5,undefined,fps);assert.ok(s.y>4);step(s,.5,{x:1,z:0},fps);step(s,2,undefined,fps);assert.equal(s.bounces,1);assert.equal(s.y,groundHeight(s.x,s.z));}
});
test('Flying quilt has continuous phases, completes its tour at 30/60/120 fps, and awards once safely home',()=>{
 for(const fps of [30,60,120]){const s=createState();place(s,CARPET);assert.ok(act(s));assert.equal(s.ride.kind,'flight');assert.equal(jump(s),false);assert.equal(act(s),false);const ride=s.ride;for(const time of [1.2,9.2,10.7])near(ridePose({...ride,time:time-1e-7}),ridePose({...ride,time:time+1e-7}));step(s,11,undefined,fps);assert.equal(s.ride,null);assert.ok(s.badges.flight);assert.ok(dist(s,CARPET)<.001);assert.equal(s.y,groundHeight(s.x,s.z));assert.ok(s.rideCooldown>0);assert.notEqual(nearby(s)?.kind,'flight');}
});
test('Pillow timing is winnable using the mint cue, with moving targets and physical pillow arcs',()=>{
 for(const fps of [30,60,120]){const s=createState();place(s,TOSS);assert.ok(act(s));assert.ok(s.game);let shots=0;for(let i=0;i<40*fps&&s.game;i++){if(throwReady(s)&&s.game.cooldown===0){assert.ok(act(s));shots++;assert.equal(act(s),false);const p=s.throws.at(-1);near(pillowPosition(p),p.from);near(pillowPosition({...p,age:1.15}),p.to);assert.ok(pillowPosition({...p,age:.575}).y>5);}tick(s,1/fps);}assert.ok(s.badges.toss);assert.equal(s.lastScore,5);assert.ok(shots>=5);assert.equal(s.game,null);assert.equal(s.throws.length,0);}
});
test('Pillow misses and timeouts give no badge; leaving and Home cancel a game cleanly',()=>{
 const s=createState();place(s,TOSS);act(s);s.time=(Math.PI/2)/1.15-1.15;assert.equal(throwReady(s),false);act(s);step(s,1.17);assert.equal(s.game.score,0);step(s,40);assert.equal(s.game,null);assert.equal(s.badges.toss,false);act(s);step(s,1,{x:1,z:0});assert.equal(s.game,null);assert.equal(s.throws.length,0);place(s,TOSS);act(s);home(s);assert.equal(s.game,null);
});
test('Blizzard warns, wakes Snooze, and safely rolls a caught explorer into a blanket burrito',()=>{
 for(const fps of [30,60,120]){const s=createState();s.buttons=[0,2];s.time=26.99;tick(s,.02);assert.equal(weather(s),'warning');s.time=31;place(s,{x:2,z:0});Object.assign(s.monster,{x:2,z:0,nap:0});tick(s,1/fps);assert.equal(s.ride.kind,'burrito');assert.equal(s.catches,1);assert.equal(act(s),false);assert.equal(jump(s),false);step(s,4.3,undefined,fps);assert.equal(s.ride,null);assert.equal(s.x,-13);assert.equal(s.z,-1.5);assert.equal(s.y,groundHeight(s.x,s.z));assert.deepEqual(s.buttons,[0,2]);assert.ok(s.monster.nap>0);}
});
test('Fort shelter, jumping, Pillow Toss and tickling all protect against Snooze',()=>{
 for(const mode of ['fort','jump','game','tickle']){const s=createState();s.time=32;place(s,mode==='fort'?FORT:mode==='game'?TOSS:{x:3,z:1});Object.assign(s.monster,{x:s.x,z:s.z,nap:0});if(mode==='jump')s.y+=3;if(mode==='game')act(s);if(mode==='tickle'){assert.equal(nearby(s).kind,'tickle');act(s);assert.ok(s.badges.brave);assert.ok(s.monster.nap>0);}tick(s,.02);assert.equal(s.ride,null);assert.equal(s.catches,0);}
 const s=createState();s.time=32;place(s,{x:-20,z:-9});Object.assign(s.monster,{x:-6,z:-9,nap:0});step(s,2);assert.ok(s.monster.x>-6.36,'Snooze must not pass through fort walls');
});
test('Home cancels either ride without awarding unfinished adventures or removing earned badges',()=>{
 for(const kind of ['flight','burrito']){const s=createState();s.badges.brave=true;s.buttons=[1];s.ride={kind,time:0,start:{x:s.x,y:s.y,z:s.z}};step(s,1);home(s);assert.equal(s.ride,null);assert.equal(s.badges.flight,false);assert.ok(s.badges.brave);assert.deepEqual(s.buttons,[1]);assert.equal(s.x,0);assert.equal(s.z,18);assert.equal(s.y,groundHeight(0,18));}
});

test('Eight unique gentle little Snoozes can each become a friend without duplicating discoveries',()=>{
 const s=createState();s.monster.nap=1000;
 assert.equal(s.kids.length,8);assert.equal(new Set(s.kids.map(k=>k.name)).size,8);
 for(let i=0;i<8;i++){
  place(s,{x:0,z:18});s.kids.forEach((k,j)=>Object.assign(k,{x:j===i?1:20,z:j===i?18:-20}));s.kidCooldown=0;
  assert.equal(nearby(s).index,i);assert.ok(act(s));assert.ok(s.kids[i].met);assert.equal(s.kids[i].follow,18);assert.equal(s.kids[i].happy,3);
  assert.equal(act(s),false,'A held interaction cannot endlessly tickle');
 }
 assert.equal(s.kids.filter(k=>k.met).length,8);
 home(s);assert.equal(s.kids.filter(k=>k.met).length,8);
 s.time=32;s.kids.forEach(k=>{k.x=s.x;k.z=s.z;});step(s,.1);assert.equal(s.catches,0);assert.equal(s.ride,null);
 Object.assign(s.monster,{x:s.x,z:s.z,nap:0});s.kidCooldown=0;assert.equal(nearby(s).kind,'tickle','Snooze defense takes priority over a nearby child');
});
test('Little friends follow, settle after their playtime, and respect fort walls and world boundaries',()=>{
 for(const fps of [30,60,120]){
  const s=createState();s.monster.nap=1000;const k=s.kids[0];place(s,{x:0,z:0});Object.assign(k,{x:1,z:0});act(s);
  place(s,{x:10,z:0});step(s,3,undefined,fps);assert.ok(dist(k,kidTarget(s,0))<.1);
  step(s,16,undefined,fps);assert.equal(k.follow,0);
  Object.assign(k,{x:-6,z:-9,follow:18});place(s,{x:-20,z:-9});step(s,1,undefined,fps);assert.ok(k.x>-6.36);
  place(s,{x:27,z:25});s.kids.forEach(k=>k.follow=18);step(s,3,undefined,fps);assert.ok(s.kids.every(k=>k.x<=27&&k.z<=25));
 }
});
test('Snuggling brings all eight children to a safe circle, protects against storms, and supports repeat peekaboo',()=>{
 for(const fps of [30,60,120]){
  const s=createState();s.time=32;place(s,{x:COZY.x-2,z:COZY.z});Object.assign(s.monster,{x:s.x,z:s.z,nap:0});
  assert.equal(nearby(s).kind,'cozy');assert.ok(act(s));assert.ok(s.cozy);step(s,1,undefined,fps);assert.equal(s.x,COZY.x);assert.equal(s.z,COZY.z);assert.equal(s.ride,null);assert.equal(s.catches,0);
  step(s,22,undefined,fps);for(let i=0;i<8;i++)assert.ok(dist(s.kids[i],kidTarget(s,i))<.2,`${s.kids[i].name} reaches story time`);
  assert.ok(act(s));assert.ok(s.cozy.peek>0);assert.ok(s.kids.every(k=>k.happy>0));assert.equal(act(s),false);step(s,2.3,undefined,fps);assert.equal(s.cozy.peek,0);assert.ok(act(s));
 }
});
test('Walking, jumping, the Hop out button, and Home all leave the snuggle blanket safely',()=>{
 for(const exit of ['walk','jump','button','home']){
  const s=createState();place(s,COZY);act(s);step(s,1);s.buttons=[0,1];s.kids[0].met=true;
  if(exit==='walk')step(s,.2,{x:1,z:0});if(exit==='jump')assert.ok(jump(s));if(exit==='button')assert.ok(leaveCozy(s));if(exit==='home')home(s);
  assert.equal(s.cozy,null);assert.deepEqual(s.buttons,[0,1]);assert.ok(s.kids[0].met);assert.equal(s.ride,null);assert.ok(s.monster.nap>0);
  if(exit==='walk')assert.ok(s.x>COZY.x);if(exit==='jump')assert.ok(s.vy>0);
 }
 const s=createState();assert.equal(leaveCozy(s),false);place(s,CARPET);act(s);assert.equal(nearby(s),null);assert.equal(act(s),false);
});
