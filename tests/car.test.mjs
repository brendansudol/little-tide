import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,tick,toggleCar,nearCar,jump,home,orderSandwich,eat,social,washPhase,COURSE,CONES,CAFE,WASH,TRACK_LENGTH,trafficPose,distance,cameraDirection,planRoute,setDestination,cancelDestination,SOLIDS} from '../dist/car/rules.js';
const step=(s,seconds,input={},fps=60)=>{for(let i=0;i<Math.ceil(seconds*fps);i++)tick(s,input,1/fps);};
const driver=()=>{const s=createState();assert.ok(toggleCar(s));return s;};
test('Enter and safely exit the parked car; walk, jump, and keep progress on recovery',()=>{
 const s=createState();assert.ok(nearCar(s));assert.ok(toggleCar(s));assert.equal(s.mode,'drive');s.badges.breakfast=true;s.food=2;s.car.dirt=.8;assert.ok(toggleCar(s));assert.equal(s.mode,'walk');assert.ok(distance(s,s.car)>2.9);const parked={...s.car};step(s,1,{x:-1,z:0});assert.equal(s.car.x,parked.x);assert.equal(s.car.z,parked.z);assert.equal(toggleCar(s),false);assert.ok(jump(s));step(s,.3);assert.ok(s.y>1);step(s,1);assert.equal(s.y,0);home(s);assert.equal(s.food,2);assert.ok(s.badges.breakfast);assert.equal(s.car.dirt,.8);assert.equal(s.mode,'walk');assert.ok(nearCar(s));
 s.mode='drive';s.car.x=43;s.car.z=0;s.car.yaw=0;assert.ok(toggleCar(s));assert.ok(s.x<43); // A wall-side exit chooses the clear side.
});
test('A single direction starts and turns the car, including tight turnarounds, at 30/60/120 fps',()=>{
 for(const fps of [30,60,120])for(const [x,z] of [[0,-1],[1,0],[0,1],[-1,0]]){const s=driver();s.npcs=[];const start={...s.car};step(s,1,{x,z},fps);assert.ok((s.car.x-start.x)*x+(s.car.z-start.z)*z>2);assert.ok(Math.abs((s.car.x-start.x)*z-(s.car.z-start.z)*x)<1e-6);assert.ok(s.car.speed<=8.5);const opposite={...s.car};step(s,1,{x:-x,z:-z},fps);assert.ok((s.car.x-opposite.x)*x+(s.car.z-opposite.z)*z< -2);}
});
test('Release stops within one car length, brake is quicker, and gentle joystick input creeps',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];step(s,1,{z:-1},fps);const start={...s.car};step(s,.25,{},fps);assert.equal(s.car.speed,0);assert.ok(distance(start,s.car)<.9);const stopped={...s.car};step(s,1,{},fps);assert.equal(distance(stopped,s.car),0);
 step(s,1,{z:-1},fps);const braking={...s.car};step(s,.15,{z:-1,brake:true},fps);assert.equal(s.car.speed,0);assert.ok(distance(braking,s.car)<.6);
 step(s,1,{x:.05,z:-.05},fps);assert.equal(s.car.speed,0);const gentle=driver();gentle.npcs=[];step(gentle,1,{z:-.3},fps);assert.ok(gentle.car.speed>1&&gentle.car.speed<2);const diagonal=driver();diagonal.npcs=[];step(diagonal,1,{x:1,z:-1},fps);assert.ok(diagonal.car.speed<=8.5);}
});
test('Screen directions stay consistent at every camera angle and across opposite car headings',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){const s=driver();s.npcs=[];const start={...s.car},input=cameraDirection(x,y,yaw);step(s,1,input);const dx=s.car.x-start.x,dz=s.car.z-start.z,screenX=dx*Math.cos(yaw)-dz*Math.sin(yaw),screenY=dx*Math.sin(yaw)+dz*Math.cos(yaw);assert.ok(screenX*x+screenY*y>2);assert.ok(Math.abs(screenX*y-screenY*x)<1e-6);}
});
test('The car stops at walls, slides along them, and can turn away without reversing controls',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];Object.assign(s.car,{x:40,z:0,yaw:Math.PI/2});step(s,4,{x:1},fps);assert.ok(s.car.x<=43.35);const edge=s.car.x;step(s,1,{x:-1},fps);assert.ok(s.car.x<edge-2);
 Object.assign(s.car,{x:13,z:-5,yaw:Math.PI,speed:0});step(s,3,{z:-1},fps);assert.ok(s.car.z>=-10.16);const wall={...s.car};step(s,1,{x:1,z:-1},fps);assert.ok(s.car.x>wall.x+3);assert.ok(s.car.z>=-10.16);step(s,1,{z:1},fps);assert.ok(s.car.z>wall.z+2);}
});
test('Only moving cars collect mud; a complete continuous wash cleans and releases once',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];Object.assign(s.car,{x:7,z:14,yaw:Math.PI/2});step(s,1);assert.equal(s.car.dirt,0);step(s,1.4,{x:1},fps);assert.ok(s.car.dirt>.3);Object.assign(s.car,{x:27,z:12,yaw:Math.PI,speed:0,steer:0});for(let i=0;i<fps*3&&s.mode!=='wash';i++)tick(s,{z:-1},1/fps);assert.equal(s.mode,'wash');assert.equal(toggleCar(s),false);const phases=new Set();let previous={...s.car};for(let i=0;i<fps*10&&s.mode==='wash';i++){phases.add(washPhase(s));tick(s,{},1/fps);assert.ok(distance(previous,s.car)<.15);assert.ok(s.car.dirt<=previous.dirt);previous={...s.car};}assert.equal(phases.size,4);assert.equal(s.mode,'drive');assert.equal(s.car.dirt,0);assert.ok(Math.abs(s.car.z-WASH.exit)<1e-8);assert.equal(s.washes,1);assert.ok(s.badges.clean);step(s,3);assert.equal(s.washes,1);}
 const s=createState();s.x=13;s.z=14;step(s,2,{x:1,z:0});assert.equal(s.car.dirt,0);
});
test('Clean washes do not grant the mud badge; the entrance assists diagonal approaches but not side entries',()=>{
 const s=driver();s.npcs=[];Object.assign(s.car,{x:27,z:12,yaw:Math.PI});step(s,1,{z:-1});assert.equal(s.mode,'wash');step(s,10);assert.equal(s.badges.clean,false);
 Object.assign(s.car,{x:22,z:9,yaw:Math.PI/2,speed:0});step(s,1,{x:1});assert.equal(s.mode,'drive');
 Object.assign(s.car,{x:29.6,z:12,yaw:Math.PI,speed:0,dirt:1});step(s,1,{x:-.2,z:-1});assert.equal(s.mode,'wash');home(s);step(s,10);assert.equal(s.washes,1);assert.equal(s.badges.clean,false);
});
test('Pointing toward each gate completes the slalom without throttle, steering, or extra laps',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];function reach(target){for(let i=0;i<fps*30;i++){const d=distance(s.car,target);if(d<1.5)return;tick(s,{x:(target.x-s.car.x)/d,z:(target.z-s.car.z)/d},1/fps);}assert.fail('Could not drive to '+JSON.stringify(target));}
 reach(COURSE[0]);assert.equal(s.course.next,1);for(let i=1;i<6;i++)reach(COURSE[i]);assert.equal(s.course.runs,1);assert.ok(s.badges.course);assert.ok(s.course.best>5&&s.course.best<20);assert.equal(s.course.best,s.course.last);}
});
test('Walking and out-of-order gates cannot complete the course; cones penalize once per tumble',()=>{
 const s=createState();s.x=COURSE[0].x;s.z=COURSE[0].z;step(s,.1,{x:1});assert.equal(s.course.active,false);s.mode='drive';s.npcs=[];Object.assign(s.car,{x:COURSE[4].x,z:COURSE[4].z,yaw:0});step(s,.1,{z:-1});assert.equal(s.course.active,false);s.course.active=true;s.course.next=1;Object.assign(s.car,{x:CONES[4].x,z:CONES[4].z+.3,yaw:Math.PI,speed:1});step(s,.2,{z:-1});assert.equal(s.course.penalty,2);step(s,.2,{brake:true});assert.equal(s.course.penalty,2);assert.ok(s.cones[4]>0);toggleCar(s);assert.equal(s.course.active,false);assert.equal(s.course.runs,0);
});
test('Café orders need the window and free hands; bites and repeat orders are safe',()=>{
 const s=createState();assert.equal(orderSandwich(s),false);Object.assign(s,CAFE);assert.ok(orderSandwich(s));assert.equal(s.food,3);assert.equal(s.orders,1);assert.ok(s.badges.breakfast);assert.equal(orderSandwich(s),false);assert.ok(eat(s));assert.equal(eat(s),false);step(s,.8);assert.ok(eat(s));step(s,.8);assert.ok(eat(s));assert.equal(s.food,0);assert.equal(eat(s),false);assert.ok(orderSandwich(s));assert.equal(s.orders,2);s.mode='drive';assert.equal(eat(s),false);assert.equal(orderSandwich(s),false);
});
test('Friendly traffic loops continuously, waits for pedestrians, and replies to waves or honks',()=>{
 const start=trafficPose(0),end=trafficPose(TRACK_LENGTH-.001);assert.ok(distance(start,end)<.002);for(let d=0;d<TRACK_LENGTH;d+=.1)assert.ok(distance(trafficPose(d),trafficPose(d+.01))<.011);
 const s=createState(),n=s.npcs[0],p=trafficPose(n.d+4);s.x=p.x;s.z=p.z;const d=n.d;step(s,1);assert.equal(n.d,d);assert.ok(social(s));assert.ok(s.friends.includes(n.name));assert.ok(n.reply>0);assert.equal(social(s),false);step(s,2);social(s);assert.equal(s.friends.length,1);s.x=0;s.z=0;step(s,2);assert.ok(n.d>d);s.mode='drive';s.car.x=n.x;s.car.z=n.z;step(s,2);assert.ok(social(s));assert.equal(s.effect,'honk');assert.equal(s.friends.length,1);
 const free=createState();const initial=free.npcs.map(n=>n.d);step(free,10);assert.ok(free.npcs.every((n,i)=>n.d!==initial[i]));
});

const arrive=(s,fps=60)=>{for(let i=0;i<fps*35&&s.destination;i++){tick(s,{},1/fps);assert.ok(!SOLIDS.some(b=>Math.abs(s.car.x-b.x)<b.w/2+1.649&&Math.abs(s.car.z-b.z)<b.d/2+1.649),'Route entered a wall');}assert.equal(s.destination,null,'Trip did not finish');};
test('Tap destinations drive and park precisely, including a nearby spot and retargeting',()=>{
 for(const fps of [30,60,120]){const s=driver();s.npcs=[];assert.ok(setDestination(s,-12,12));arrive(s,fps);assert.ok(distance(s.car,{x:-12,z:12})<.23);assert.equal(s.car.speed,0);const parked={...s.car};step(s,1,{},fps);assert.equal(distance(s.car,parked),0);
 assert.ok(setDestination(s,parked.x+.1,parked.z));arrive(s,fps);assert.equal(s.car.speed,0);assert.ok(setDestination(s,-30,-20));step(s,.5,{},fps);assert.ok(setDestination(s,0,15));arrive(s,fps);assert.ok(distance(s.car,{x:0,z:15})<.23);}
});
test('Destination routes go around the café and car wash walls, and can leave a wall edge',()=>{
 for(const fps of [30,60,120])for(const [start,goal] of [[{x:13,z:-5},{x:13,z:-27}],[{x:18,z:0},{x:35,z:0}],[{x:13,z:-10.1},{x:13,z:0}]]){const s=driver();s.npcs=[];Object.assign(s.car,start);const route=planRoute(s.car,goal);assert.ok(route);if(start.z!==-10.1)assert.ok(route.length>1);assert.ok(setDestination(s,goal.x,goal.z));arrive(s,fps);assert.ok(distance(s.car,goal)<.23);}
});
test('Manual directions, brake, hopping out and home cancel automatic driving',()=>{
 for(const input of [{x:1},{z:-1},{brake:true}]){const s=driver();s.npcs=[];setDestination(s,-20,0);step(s,.5);tick(s,input,1/60);assert.equal(s.destination,null);}
 const s=driver();setDestination(s,-20,0);assert.ok(toggleCar(s));assert.equal(s.destination,null);assert.equal(setDestination(s,0,0),false);toggleCar(s);setDestination(s,-20,0);cancelDestination(s);assert.equal(s.destination,null);setDestination(s,-20,0);home(s);assert.equal(s.destination,null);
});
test('Invalid destinations stop the old route and cannot send the car inside buildings or outside the world',()=>{
 const s=driver();for(const p of [{x:13,z:-15},{x:23,z:0},{x:100,z:0},{x:0,z:100},{x:NaN,z:1},{x:Infinity,z:0}]){assert.ok(setDestination(s,-20,0));assert.equal(setDestination(s,p.x,p.z),false);assert.equal(s.destination,null);}
});
test('A tap route can start the wash, and a blocked route stops instead of driving forever',()=>{
 const s=driver();s.npcs=[];Object.assign(s.car,{x:27,z:15,dirt:1});assert.ok(setDestination(s,27,0));for(let i=0;i<300&&s.mode==='drive';i++)tick(s,{},1/60);assert.equal(s.mode,'wash');assert.equal(s.destination,null);step(s,10);assert.equal(s.washes,1);assert.ok(s.badges.clean);
 const blocked=driver(),n=blocked.npcs[0];n.d=30;n.speed=0;Object.assign(n,trafficPose(n.d));blocked.npcs=[n];Object.assign(blocked.car,{x:n.x,z:n.z+7});assert.ok(setDestination(blocked,n.x,n.z-7));step(blocked,8);assert.equal(blocked.destination,null);assert.equal(blocked.car.speed,0);assert.ok(distance(blocked.car,n)>=3.5);
});
