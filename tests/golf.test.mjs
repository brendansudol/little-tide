import assert from 'node:assert/strict';
import {CatmullRomCurve3,Vector3} from '../dist/vendor/three.module.js';
import {HOLES,MILL,START,tubePoints,createState,tickState,enterHole,canEnter,nextHole} from '../dist/golf/course.js';
const curves=HOLES.map((_,i)=>new CatmullRomCurve3(tubePoints(i).map(p=>new Vector3(...p))));
const sample=(i,t)=>curves[i].getPointAt(t);
function step(s,seconds,input={x:0,z:0},startTime=0){for(let t=0;t<seconds;t+=1/120)tickState(s,1/120,startTime+t,input,sample);}
for(let i=0;i<6;i++){
 const s=createState(),h=HOLES[i],next=HOLES[nextHole(i)];s.x=h.x;s.z=h.z;
 step(s,.02);assert.equal(s.mode,'tube',`Hole ${i+1} must trigger by walking into it`);
 assert.deepEqual([s.ride.from,s.ride.to],[i,nextHole(i)]);
 step(s,2);assert.ok(s.y< -2,'Avatar must descend into the underground tube');
 step(s,3.7);assert.equal(s.mode,'walk');assert.equal(s.rides,1);
 assert.ok(Math.abs(s.x-next.x)<.001&&Math.abs(s.z-(next.z+1.9))<.001,'Avatar must emerge beside the next cup');
 assert.ok(s.visited.has(next.id));step(s,2);assert.equal(s.rides,1,'Landing must not create an automatic ride loop');
 s.x=next.x;s.z=next.z;step(s,.02);assert.equal(s.mode,'tube','Walking back into the next cup must work');
}
const far=createState();assert.equal(canEnter({...far,mode:'flight'},0),false);assert.equal(enterHole({...far,mode:'tube'},0),false);
const mill=createState();mill.x=MILL.x;mill.z=MILL.z;let hitTime=0;
for(;hitTime<7&&mill.mode==='walk';hitTime+=1/120)tickState(mill,1/120,hitTime,{x:0,z:0},sample);
assert.equal(mill.mode,'flight','Standing in the actual club sweep must launch the player');assert.equal(mill.launches,1);
step(mill,1.55,undefined,hitTime);assert.ok(mill.y>11,'Windmill flight should visibly rise above the course');
step(mill,2,undefined,hitTime+1.55);assert.equal(mill.mode,'walk');assert.equal(mill.x,18);assert.equal(mill.z,12);assert.equal(mill.y,.08);assert.equal(mill.launches,1);
step(mill,5);assert.equal(mill.launches,1,'Landing should not accidentally retrigger the windmill');
const edge=createState();step(edge,120,{x:1,z:1});assert.ok((edge.x/29)**2+(edge.z/25)**2<=1.00001,'Walking stays on the island');
const jump=createState();jump.jumpV=5;step(jump,.3);assert.ok(jump.y>.7);step(jump,1.2);assert.equal(jump.y,.08);
assert.deepEqual([createState().x,createState().z],[START.x,START.z]);
console.log('PASS: all 6 automatic tube routes, 6→1 wrap, underground travel, safe exits and re-entry, rotating-club collision, cross-course flight and landing, walking boundary, and jump.');
