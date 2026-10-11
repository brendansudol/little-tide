import assert from 'node:assert/strict';
import {BOUNDS,HAND,HAND_DURATION,BRIDGE_X,riverZ,inRiver,ground,createState,nearHand,interact,jump,beginFlick,handPose,tick} from '../dist/tissue/rules.js';
const advance=(s,seconds,input={x:0,z:0})=>{for(let i=0;i<Math.round(seconds*120);i++)tick(s,1/120,input);};
// Monster closes the gap, tags only on foot, then gives the player time to escape.
const chased=createState();chased.monster.cooldown=0;
const before=Math.hypot(chased.x-chased.monster.x,chased.z-chased.monster.z);
advance(chased,3);assert.ok(Math.hypot(chased.x-chased.monster.x,chased.z-chased.monster.z)<before-7);
chased.monster.x=chased.x;chased.monster.z=chased.z;tick(chased,1/120);assert.equal(chased.tags,1);assert.ok(chased.jumpV>0);assert.ok(chased.monster.cooldown>5);
advance(chased,2);assert.equal(chased.tags,1);assert.equal(chased.jumpY,0);assert.ok(Number.isFinite(chased.x));
// Enter, steer, stop, and exit the car. Car and rider remain inside the walls.
const driver=createState();assert.equal(interact(driver),false);driver.x=driver.car.x;driver.z=driver.car.z;assert.ok(interact(driver));assert.equal(driver.mode,'drive');
advance(driver,4,{x:1,z:0});assert.ok(driver.driveDistance>20);assert.equal(driver.x,driver.car.x);assert.equal(driver.z,driver.car.z);
advance(driver,4,{x:1,z:1});assert.ok(driver.x<BOUNDS.x&&driver.z<BOUNDS.z);
advance(driver,3);assert.ok(driver.car.speed<.002);driver.monster.x=driver.x;driver.monster.z=driver.z;driver.monster.cooldown=0;tick(driver,1/120);assert.equal(driver.tags,0);
assert.ok(interact(driver));assert.equal(driver.mode,'walk');assert.ok(Math.abs(driver.x)<=BOUNDS.x&&Math.abs(driver.z)<=BOUNDS.z);
// Each hand phase meets the next without a teleport; the high arc ends in the palm.
const ride={age:0,from:{x:HAND.x,y:.08,z:HAND.z+4.5}};
for(const boundary of [.8,3.8,4.8]){ride.age=boundary-1e-6;const a=handPose(ride);ride.age=boundary+1e-6;const b=handPose(ride);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);}
for(const dt of [1/30,1/60,1/120]){
 const s=createState();s.x=HAND.x;s.z=HAND.z+4.5;s.monster.x=s.x;s.monster.z=s.z;s.monster.cooldown=0;tick(s,dt);assert.ok(s.ride);assert.equal(s.flicks,1);
 assert.equal(beginFlick(s),false);let peak=0,sawCatch=false;
 for(let i=0;i<Math.ceil(HAND_DURATION/dt)+2;i++){tick(s,dt);peak=Math.max(peak,s.y);if(s.mode==='catch'){sawCatch=true;assert.ok(Math.hypot(s.x-HAND.x,s.z-HAND.z)<.2);}}
 assert.ok(peak>19);assert.ok(sawCatch);assert.equal(s.catches,1);assert.equal(s.tags,0);assert.equal(s.mode,'walk');assert.equal(s.ride,null);assert.ok(s.handCooldown>4);assert.equal(nearHand(s),false);
 advance(s,6);assert.equal(s.flicks,1);
}
// Driving past the hand does not hijack the car. The bridge avoids river slowdown.
const carRide=createState();carRide.x=carRide.car.x;carRide.z=carRide.car.z;interact(carRide);carRide.car.x=HAND.x;carRide.car.z=HAND.z+4.5;tick(carRide,1/60);assert.equal(carRide.mode,'drive');assert.equal(carRide.flicks,0);
assert.equal(inRiver(10,riverZ(10)),true);assert.equal(inRiver(BRIDGE_X,riverZ(BRIDGE_X)),false);assert.ok(ground(BRIDGE_X,riverZ(BRIDGE_X))>.5);
const hopper=createState();jump(hopper);advance(hopper,.25);assert.ok(hopper.jumpY>1);advance(hopper,1);assert.equal(hopper.jumpY,0);
console.log('PASS: monster chase/tag/recovery, car steering/exit/boundaries, river bridge, jumps, continuous hand flight and catch at 30/60/120fps, safe release and no repeat ride.');
