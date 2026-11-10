import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,tick,toggleCar,nearCar,jump,home,orderSandwich,eat,social,washPhase,COURSE,CONES,CAFE,WASH,TRACK_LENGTH,trafficPose,distance,clamp} from '../dist/car/rules.js';
const step=(s,seconds,input={},fps=60)=>{for(let i=0;i<Math.ceil(seconds*fps);i++)tick(s,input,1/fps);};
const driver=()=>{const s=createState();assert.ok(toggleCar(s));return s;};
test('Enter and safely exit the parked car; walk, jump, and keep progress on recovery',()=>{
 const s=createState();assert.ok(nearCar(s));assert.ok(toggleCar(s));assert.equal(s.mode,'drive');s.badges.breakfast=true;s.food=2;s.car.dirt=.8;assert.ok(toggleCar(s));assert.equal(s.mode,'walk');assert.ok(distance(s,s.car)>2.9);const parked={...s.car};step(s,1,{x:-1,z:0});assert.equal(s.car.x,parked.x);assert.equal(s.car.z,parked.z);assert.equal(toggleCar(s),false);assert.ok(jump(s));step(s,.3);assert.ok(s.y>1);step(s,1);assert.equal(s.y,0);home(s);assert.equal(s.food,2);assert.ok(s.badges.breakfast);assert.equal(s.car.dirt,.8);assert.equal(s.mode,'walk');assert.ok(nearCar(s));
 s.mode='drive';s.car.x=43;s.car.z=0;s.car.yaw=0;assert.ok(toggleCar(s));assert.ok(s.x<43); // A wall-side exit chooses the clear side.
});
test('Throttle, reversing, right steering, braking and solid boundaries work at 30/60/120 fps',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];step(s,1,{throttle:1},fps);assert.ok(s.car.z<16);const before=s.car.x;step(s,1,{throttle:1,steer:1},fps);assert.ok(s.car.x>before+2);step(s,1,{brake:true},fps);assert.equal(s.car.speed,0);const p={...s.car};step(s,1,{steer:1},fps);assert.equal(s.car.yaw,p.yaw);assert.equal(s.car.x,p.x);step(s,1,{throttle:-1},fps);assert.ok(s.car.speed<0);
 Object.assign(s.car,{x:40,z:0,yaw:Math.PI/2,speed:0,steer:0});step(s,4,{throttle:1},fps);assert.ok(s.car.x<=43.2);
 Object.assign(s.car,{x:13,z:-5,yaw:Math.PI,speed:0,steer:0});step(s,3,{throttle:1},fps);assert.ok(s.car.z>=-10.01);}
});
test('Only moving cars collect mud; a complete continuous wash cleans and releases once',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];Object.assign(s.car,{x:7,z:14,yaw:Math.PI/2});step(s,1);assert.equal(s.car.dirt,0);step(s,1.4,{throttle:1},fps);assert.ok(s.car.dirt>.3);Object.assign(s.car,{x:27,z:12,yaw:Math.PI,speed:0,steer:0});for(let i=0;i<fps*3&&s.mode!=='wash';i++)tick(s,{throttle:1},1/fps);assert.equal(s.mode,'wash');assert.equal(toggleCar(s),false);const phases=new Set();let previous={...s.car};for(let i=0;i<fps*10&&s.mode==='wash';i++){phases.add(washPhase(s));tick(s,{},1/fps);assert.ok(distance(previous,s.car)<.15);assert.ok(s.car.dirt<=previous.dirt);previous={...s.car};}assert.equal(phases.size,4);assert.equal(s.mode,'drive');assert.equal(s.car.dirt,0);assert.ok(Math.abs(s.car.z-WASH.exit)<1e-8);assert.equal(s.washes,1);assert.ok(s.badges.clean);step(s,3);assert.equal(s.washes,1);}
 const s=createState();s.x=13;s.z=14;step(s,2,{x:1,z:0});assert.equal(s.car.dirt,0);
});
test('Clean washes do not grant the mud badge; reversing or entering sideways never starts a wash',()=>{
 const s=driver();s.npcs=[];Object.assign(s.car,{x:27,z:12,yaw:Math.PI});step(s,1,{throttle:1});assert.equal(s.mode,'wash');step(s,10);assert.equal(s.badges.clean,false);Object.assign(s.car,{x:27,z:12,yaw:0,speed:0});step(s,1,{throttle:-1});assert.equal(s.mode,'drive');Object.assign(s.car,{x:22,z:9,yaw:Math.PI/2,speed:0});step(s,1,{throttle:1});assert.equal(s.mode,'drive');Object.assign(s.car,{x:27,z:12,yaw:Math.PI,speed:0,dirt:1});step(s,1,{throttle:1});assert.equal(s.mode,'wash');home(s);step(s,10);assert.equal(s.washes,1);assert.equal(s.badges.clean,false);
});
test('The slalom is drivable using throttle and steering, in order, at every frame rate',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];function reach(target){for(let i=0;i<fps*30;i++){const d=distance(s.car,target);if(d<1.5)return;const wanted=Math.atan2(target.x-s.car.x,target.z-s.car.z),error=Math.atan2(Math.sin(wanted-s.car.yaw),Math.cos(wanted-s.car.yaw));const desired=Math.abs(error)>.65?4:7;tick(s,{throttle:s.car.speed<desired?.6:0,steer:clamp(-error*2,-1,1)},1/fps);}assert.fail('Could not drive to '+JSON.stringify(target));}
 reach(COURSE[0]);assert.equal(s.course.next,1);for(let i=1;i<6;i++)reach(COURSE[i]);assert.equal(s.course.runs,1);assert.ok(s.badges.course);assert.ok(s.course.best>10&&s.course.best<90);assert.equal(s.course.best,s.course.last);}
});
test('Walking and out-of-order gates cannot complete the course; cones penalize once per tumble',()=>{
 const s=createState();s.x=COURSE[0].x;s.z=COURSE[0].z;step(s,.1,{x:1});assert.equal(s.course.active,false);s.mode='drive';s.npcs=[];Object.assign(s.car,{x:COURSE[4].x,z:COURSE[4].z,yaw:0});step(s,.1,{throttle:1});assert.equal(s.course.active,false);s.course.active=true;s.course.next=1;Object.assign(s.car,{x:CONES[4].x,z:CONES[4].z+.3,yaw:Math.PI,speed:1});step(s,.2,{throttle:1});assert.equal(s.course.penalty,2);step(s,.2,{brake:true});assert.equal(s.course.penalty,2);assert.ok(s.cones[4]>0);toggleCar(s);assert.equal(s.course.active,false);assert.equal(s.course.runs,0);
});
test('Café orders need the window and free hands; bites and repeat orders are safe',()=>{
 const s=createState();assert.equal(orderSandwich(s),false);Object.assign(s,CAFE);assert.ok(orderSandwich(s));assert.equal(s.food,3);assert.equal(s.orders,1);assert.ok(s.badges.breakfast);assert.equal(orderSandwich(s),false);assert.ok(eat(s));assert.equal(eat(s),false);step(s,.8);assert.ok(eat(s));step(s,.8);assert.ok(eat(s));assert.equal(s.food,0);assert.equal(eat(s),false);assert.ok(orderSandwich(s));assert.equal(s.orders,2);s.mode='drive';assert.equal(eat(s),false);assert.equal(orderSandwich(s),false);
});
test('Friendly traffic loops continuously, waits for pedestrians, and replies to waves or honks',()=>{
 const start=trafficPose(0),end=trafficPose(TRACK_LENGTH-.001);assert.ok(distance(start,end)<.002);for(let d=0;d<TRACK_LENGTH;d+=.1)assert.ok(distance(trafficPose(d),trafficPose(d+.01))<.011);
 const s=createState(),n=s.npcs[0],p=trafficPose(n.d+4);s.x=p.x;s.z=p.z;const d=n.d;step(s,1);assert.equal(n.d,d);assert.ok(social(s));assert.ok(s.friends.includes(n.name));assert.ok(n.reply>0);assert.equal(social(s),false);step(s,2);social(s);assert.equal(s.friends.length,1);s.x=0;s.z=0;step(s,2);assert.ok(n.d>d);s.mode='drive';s.car.x=n.x;s.car.z=n.z;step(s,2);assert.ok(social(s));assert.equal(s.effect,'honk');assert.equal(s.friends.length,1);
 const free=createState();const initial=free.npcs.map(n=>n.d);step(free,10);assert.ok(free.npcs.every((n,i)=>n.d!==initial[i]));
});
