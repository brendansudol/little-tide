import assert from 'node:assert/strict';
import {HOOPS,hoopAt,createState,climb,nearestHoop,startShot,tick,jump,WIDTH,DEPTH,TOP} from '../dist/gym/rules.js';
assert.deepEqual(HOOPS.map(h=>h.height),[3,6,9]);
for(const h of HOOPS)assert.notDeepEqual(hoopAt(h.id,0),hoopAt(h.id,3));
// All four walls can be climbed by walking toward them; climbing has a ceiling.
for(const axis of ['x','z'])for(const sign of [-1,1]){
 const s=createState();s.x=s.z=0;s[axis]=sign*((axis==='x'?WIDTH:DEPTH)-.6);s.cooldown=100;
 for(let i=0;i<400;i++)tick(s,1/60,{x:axis==='x'?sign:0,z:axis==='z'?sign:0});
 assert.equal(s.mode,'climb');assert.ok(s.y>10&&s.y<=TOP);jump(s);assert.equal(s.mode,'fall');
 for(let i=0;i<300;i++)tick(s,1/60);
 assert.equal(s.y,0);assert.equal(s.mode,'walk');assert.ok(Math.abs(s[axis])<(axis==='x'?WIDTH:DEPTH)-1);
}
// Each moving hoop receives its shot before the ball hits and knocks the player off.
for(const h of HOOPS){
 const s=createState(),p=hoopAt(h.id,0);Object.assign(s,{x:p.x,z:p.z,y:p.y-.9,cooldown:0});
 if(h.id===0)s.z=-DEPTH+.45;else s.x=(h.id===1?-1:1)*(WIDTH-.45);
 assert.ok(climb(s));assert.equal(nearestHoop(s).id,h.id);assert.ok(startShot(s));assert.equal(s.shot.hoop,h.id);
 assert.equal(startShot(s),false);
 let scored=false,hit=false;
 for(let i=0;i<300;i++){
  tick(s,1/120);
  if(s.scored&&!scored){scored=true;const hoop=hoopAt(h.id,s.time),ball=s.shot.ball;assert.ok(Math.hypot(ball.x-hoop.x,ball.z-hoop.z)<.08);assert.ok(Math.abs(ball.y-hoop.y)<.01);assert.equal(s.hits,0);}
  if(s.hits){hit=true;assert.ok(scored);assert.equal(s.mode,'fall');assert.equal(s.shot,null);break;}
 }
 assert.ok(hit);
 for(let i=0;i<300;i++)tick(s,1/120);
 assert.equal(s.mode,'walk');assert.equal(s.y,0);assert.equal(s.hits,1);assert.equal(s.shots,1);
}
assert.equal(startShot(createState()),false);
console.log('PASS: three moving hoop heights, all four climbable walls, climb ceiling, jump-off, nearest-hoop targeting, basket before impact, knockback and landing.');
