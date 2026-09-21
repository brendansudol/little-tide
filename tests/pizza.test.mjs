import assert from 'node:assert/strict';
import {wallState,createState,tickPlayer,jump} from '../dist/pepperoni/pizza.js';
const still={x:0,z:0};
assert.equal(wallState(0).extent,17);
assert.equal(wallState(16).extent,5);
assert.equal(wallState(28).extent,17);
// Sliding continues after release, but pepperoni reduces stopping distance.
const sauce=createState(),grip=createState();sauce.vx=grip.vx=5;
for(let i=0;i<60;i++){tickPlayer(sauce,1/60,0,still,[]);tickPlayer(grip,1/60,0,still,[{x:0,z:6,r:50}]);}
assert.ok(sauce.x>grip.x*2);assert.ok(sauce.vx>1);assert.ok(grip.vx<.03);
// Every wall constrains the avatar even while shrinking and under outward input.
for(const axis of ['x','z'])for(const sign of [-1,1]){
 const s=createState();s.x=s.z=0;s[axis]=sign*16;
 for(let i=0;i<60*56;i++){const t=i/60;tickPlayer(s,1/60,t,{x:axis==='x'?sign:0,z:axis==='z'?sign:0},[]);const edge=wallState(t).extent-.75;assert.ok(Math.abs(s.x)<=edge+1e-8);assert.ok(Math.abs(s.z)<=edge+1e-8);assert.ok(Number.isFinite(s.vx+s.vz));}
}
const airborne=createState();jump(airborne);let peak=0;
for(let i=0;i<120;i++){tickPlayer(airborne,1/60,0,still,[]);peak=Math.max(peak,airborne.jumpY);}
assert.ok(peak>1);assert.equal(airborne.jumpY,0);
console.log('PASS: sauce momentum, pepperoni traction, all four closing walls, two full squeeze cycles, jumping and landing.');
