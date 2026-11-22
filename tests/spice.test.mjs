import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TAU,START,FINISH,SPAWN,SHOWER,BOUNCE,SPICES,WALLS,LINKS,ROUTE,ROUTE_CELLS,ROUTE_LENGTH,cellPoint,cellRoute,createState,nearby,act,jump,home,tick,move,dist,clearSight,routePose,recoveryPose,shotPosition} from '../dist/spice/rules.js';
const step=(s,seconds,input={x:0,z:0},fps=60)=>{for(let i=0;i<Math.ceil(seconds*fps);i++)tick(s,1/fps,input);};
const place=(s,p)=>Object.assign(s,{x:p.x,z:p.z,y:0,vy:0});
const close=(a,b)=>assert.ok(dist(a,b)<.001,`${JSON.stringify(a)} / ${JSON.stringify(b)}`);
function startRace(){const s=createState();place(s,START);assert.ok(act(s));step(s,3.1);assert.equal(s.mode,'race');return s;}
function followRoute(s,fps=60){
 for(const p of ROUTE.slice(1)){
  let frames=0;while(dist(s,p)>.04&&s.mode==='race'&&frames++<fps*8){const dx=p.x-s.x,dz=p.z-s.z,d=dist(s,p),a=Math.min(1,d/(7.2/fps));tick(s,1/fps,{x:dx/d*a,z:dz/d*a});}
 }
}
test('The barbecue maze is connected, all six spices are reachable, and every graph edge matches its walls',()=>{
 assert.equal(LINKS.length,30);assert.equal(LINKS.reduce((n,a)=>n+a.length,0),58);assert.equal(new Set(SPICES.map(p=>p.id)).size,6);
 for(let id=0;id<30;id++){assert.ok(cellRoute(24,id).length);for(const n of LINKS[id]){assert.ok(LINKS[n].includes(id));assert.ok(clearSight(cellPoint(id),cellPoint(n)));}}
 assert.equal(ROUTE_CELLS[0],24);assert.equal(ROUTE_CELLS.at(-1),5);assert.ok(clearSight(START,cellPoint(24)));assert.ok(clearSight(cellPoint(5),FINISH));
});
test('Walking cannot cross sauce walls, world edges, or jump over maze collisions',()=>{
 for(const fps of [30,60,120]){const s=createState();s.shield=1000;place(s,{x:-20,z:-20});step(s,2,{x:1,z:0},fps);assert.ok(s.x<-18.7);jump(s);step(s,.6,{x:1,z:0},fps);assert.ok(s.x<-18.7);place(s,{x:29,z:25});step(s,2,{x:1,z:1},fps);assert.equal(s.x,30.8);assert.equal(s.z,30.8);assert.ok(WALLS.every(w=>!(Math.abs(s.x-w.x)<w.w/2+.4&&Math.abs(s.z-w.z)<w.d/2+.4)));}
 const s=createState();place(s,{x:-20,z:-20});move(s,40,0);assert.ok(s.x<-18.7,'A large bump cannot tunnel through a wall');
});
test('Squeeze telegraphs a fixed landing spot, splats a stationary explorer, and respects protection',()=>{
 const s=createState();place(s,{x:5,z:19});s.shield=0;s.monster.cooldown=0;tick(s,.01);assert.ok(s.monster.shot);const shot=s.monster.shot;close(shot.target,s);close(shotPosition({...shot,age:.65}),shot.from);close(shotPosition({...shot,age:1.35}),shot.target);step(s,1.4);assert.equal(s.squirts,1);assert.ok(s.stain>0);assert.ok(s.splats.length);assert.ok(Math.hypot(s.bump.x,s.bump.z)>0);
 const safe=createState();place(safe,SHOWER);safe.stain=3;act(safe);assert.equal(safe.stain,0);assert.equal(safe.shield,10);Object.assign(safe.monster,{x:safe.x+2,z:safe.z,cooldown:0});step(safe,2);assert.equal(safe.squirts,0);assert.equal(safe.monster.shot,null);
});
test('Walking away or jumping over a squirt avoids it; walls block ketchup aim',()=>{
 for(const dodge of ['walk','jump']){const s=createState();place(s,{x:5,z:19});s.shield=0;s.monster.cooldown=0;tick(s,.01);step(s,.7);if(dodge==='jump')jump(s);step(s,.7,dodge==='walk'?{x:1,z:0}:undefined);assert.equal(s.squirts,0);}
 const s=createState();place(s,{x:-16,z:-20});Object.assign(s.monster,{x:-20,z:-20,cooldown:0});s.shield=0;assert.equal(clearSight(s,s.monster),false);tick(s,.01);assert.equal(s.monster.shot,null);
});
test('The race has a countdown and head start, and is winnable through the real maze at different frame rates',()=>{
 for(const fps of [30,60,120]){const s=createState();place(s,START);act(s);const start={x:s.x,z:s.z};step(s,2,{x:1,z:0},fps);close(s,start);assert.equal(s.mode,'countdown');step(s,1.1,undefined,fps);assert.equal(s.mode,'race');assert.equal(s.race.monsterDistance,0);assert.ok(act(s));assert.equal(s.hints,true);followRoute(s,fps);assert.equal(s.mode,'explore');assert.equal(s.wins,1);assert.ok(s.badges.race);assert.equal(s.losses,0);assert.equal(s.squirts,0);assert.ok(s.monster.returnDistance>0);step(s,20,undefined,fps);assert.equal(s.monster.returnDistance,0);}
});
test('Running around the outside cannot skip the maze race checkpoints',()=>{
 const s=startRace();place(s,FINISH);step(s,.1);assert.equal(s.mode,'race');assert.equal(s.wins,0);assert.equal(s.race.checkpoint,1);step(s,68);assert.equal(s.losses,1);assert.equal(s.mode,'flick');assert.equal(s.race,null);
});
test('A loss launches the explorer onto a fry and requires two actual laps before returning',()=>{
 for(const fps of [30,60,120]){const s=startRace();s.found=[0,1];s.badges.spices=true;step(s,68,undefined,fps);assert.equal(s.mode,'flick');assert.equal(jump(s),false);assert.equal(home(s),false);step(s,2.4,undefined,fps);assert.equal(s.mode,'orbit');assert.equal(s.orbit.angle,0);close(s,{x:50,z:0});step(s,3,undefined,fps);assert.equal(s.orbit.angle,0);assert.equal(home(s),false);
  step(s,TAU/1.05,{x:0,z:-1},fps);assert.equal(s.mode,'orbit');assert.ok(Math.abs(s.orbit.angle)>=TAU);assert.equal(s.badges.comeback,false);assert.ok(Math.hypot(s.x,s.z)>=48);
  step(s,TAU/1.05+.1,{x:0,z:-1},fps);assert.equal(s.mode,'return');assert.equal(home(s),false);step(s,2.5,undefined,fps);assert.equal(s.mode,'explore');close(s,SPAWN);assert.equal(s.y,0);assert.ok(s.badges.comeback);assert.deepEqual(s.found,[0,1]);assert.ok(s.badges.spices);assert.ok(s.shield>0);
 }
});
test('Orbit pause, direction changes, and tap-to-fly never award laps by wiggling',()=>{
 const s=startRace();step(s,70.5);assert.equal(s.mode,'orbit');step(s,2,{x:0,z:-1});step(s,2,{x:0,z:1});assert.ok(Math.abs(s.orbit.angle)<.00001);assert.equal(s.mode,'orbit');assert.ok(act(s));step(s,3);const angle=s.orbit.angle;assert.ok(angle>3);act(s);step(s,3);assert.equal(s.orbit.angle,angle);act(s);step(s,10);assert.equal(s.mode,'return');
});
test('Flick and return arcs meet their endpoints and the monster follows every route segment',()=>{
 const s=createState();s.mode='flick';s.ride={time:0,start:{x:2,y:0,z:3}};close(recoveryPose(s),s.ride.start);s.ride.time=2.3;close(recoveryPose(s),{x:50,z:0});assert.ok(Math.abs(recoveryPose(s).y-5)<.001);s.mode='return';s.ride={time:2.4,start:{x:50,y:5,z:0}};close(recoveryPose(s),SPAWN);assert.ok(Math.abs(recoveryPose(s).y)<.001);
 close(routePose(0),START);close(routePose(ROUTE_LENGTH),FINISH);let distance=0;for(let i=1;i<ROUTE.length;i++){distance+=dist(ROUTE[i-1],ROUTE[i]);close(routePose(distance),ROUTE[i]);}
});
test('Six spice friends award one crown, pickle jumps land safely, and Home preserves prizes',()=>{
 const s=createState();s.shield=1000;for(const p of SPICES){place(s,p);step(s,.1);step(s,.1);}assert.equal(s.found.length,6);assert.ok(s.badges.spices);place(s,BOUNCE);step(s,.1);assert.equal(s.bounces,1);step(s,.5,{x:1,z:0});assert.ok(s.y>4);step(s,2);assert.equal(s.y,0);assert.equal(s.bounces,1);home(s);assert.equal(s.found.length,6);assert.ok(s.badges.spices);
 const racing=startRace();home(racing);assert.equal(racing.mode,'explore');assert.equal(racing.race,null);assert.equal(racing.wins,0);
});
