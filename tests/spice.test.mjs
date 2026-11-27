import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TAU,START,FINISH,SPAWN,SHOWER,BOUNCE,MIXER,SAUCES,MAX_MINIS,RACE_SPEED,RACE_HEAD_START,RACE_FINISH_TIME,FINISH_LINE_Z,SPICES,WALLS,LINKS,ROUTE,ROUTE_CELLS,ROUTE_LENGTH,cellPoint,cellRoute,createState,nearby,act,addSauce,clearRecipe,stirSauces,rideMixer,mixerRidePose,closeMixer,sauceResult,takeSauce,sauceAim,squirtSauce,sauceShotPosition,jump,home,tick,move,dist,clearSight,routePose,recoveryPose,shotPosition} from '../dist/spice/rules.js';
const step=(s,seconds,input={x:0,z:0},fps=60)=>{for(let i=0;i<Math.ceil(seconds*fps);i++)tick(s,1/fps,input);};
const place=(s,p)=>Object.assign(s,{x:p.x,z:p.z,y:0,vy:0});
const close=(a,b)=>assert.ok(dist(a,b)<.001,`${JSON.stringify(a)} / ${JSON.stringify(b)}`);
function startRace(){const s=createState();place(s,START);assert.ok(act(s));step(s,3.1);assert.equal(s.mode,'race');return s;}
function followRoute(s,fps=60){
 for(const p of ROUTE.slice(1)){
  let frames=0;while(dist(s,p)>.04&&s.mode==='race'&&frames++<fps*8){const dx=p.x-s.x,dz=p.z-s.z,d=dist(s,p),a=Math.min(1,d/(7.2/fps));tick(s,1/fps,{x:dx/d*a,z:dz/d*a});}
 }
}
test('The barbecue maze is connected, all twelve spices are reachable, and every graph edge matches its walls',()=>{
 assert.equal(LINKS.length,30);assert.equal(LINKS.reduce((n,a)=>n+a.length,0),58);assert.equal(new Set(SPICES.map(p=>p.id)).size,12);
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
test('Racing around either side of the maze counts, including a rear approach to the stripe',()=>{
 const routes=[
  [{x:-20,z:11},{x:-20,z:-27},{x:15,z:-27}],
  [{x:20,z:11},{x:20,z:-27},{x:15,z:-27}],
  [{x:-20,z:11},{x:-20,z:-29},{x:15,z:-29},{x:15,z:-27}],
 ];
 for(const fps of [30,60,120])for(const path of routes){const s=startRace();walkPath(s,path,fps);assert.equal(s.wins,1);assert.equal(s.losses,0);assert.ok(s.badges.race);step(s,15,undefined,fps);assert.equal(s.losses,0);assert.equal(s.wins,1);}
});
test('A loss launches the explorer onto a fry and requires two actual laps before returning',()=>{
 for(const fps of [30,60,120]){const s=startRace();s.found=[0,1];s.badges.spices=true;step(s,RACE_FINISH_TIME,undefined,fps);assert.equal(s.mode,'flick');assert.equal(jump(s),false);assert.equal(home(s),false);step(s,2.4,undefined,fps);assert.equal(s.mode,'orbit');assert.equal(s.orbit.angle,0);close(s,{x:50,z:0});step(s,3,undefined,fps);assert.equal(s.orbit.angle,0);assert.equal(home(s),false);
  step(s,TAU/1.05,{x:0,z:-1},fps);assert.equal(s.mode,'orbit');assert.ok(Math.abs(s.orbit.angle)>=TAU);assert.equal(s.badges.comeback,false);assert.ok(Math.hypot(s.x,s.z)>=48);
  step(s,TAU/1.05+.1,{x:0,z:-1},fps);assert.equal(s.mode,'return');assert.equal(home(s),false);step(s,2.5,undefined,fps);assert.equal(s.mode,'explore');close(s,SPAWN);assert.equal(s.y,0);assert.ok(s.badges.comeback);assert.deepEqual(s.found,[0,1]);assert.ok(s.badges.spices);assert.ok(s.shield>0);
 }
});
test('Orbit pause, direction changes, and tap-to-fly never award laps by wiggling',()=>{
 const s=startRace();step(s,RACE_FINISH_TIME+2.5);assert.equal(s.mode,'orbit');step(s,2,{x:0,z:-1});step(s,2,{x:0,z:1});assert.ok(Math.abs(s.orbit.angle)<.00001);assert.equal(s.mode,'orbit');assert.ok(act(s));step(s,3);const angle=s.orbit.angle;assert.ok(angle>3);act(s);step(s,3);assert.equal(s.orbit.angle,angle);act(s);step(s,10);assert.equal(s.mode,'return');
});
test('Flick and return arcs meet their endpoints and the monster follows every route segment',()=>{
 const s=createState();s.mode='flick';s.ride={time:0,start:{x:2,y:0,z:3}};close(recoveryPose(s),s.ride.start);s.ride.time=2.3;close(recoveryPose(s),{x:50,z:0});assert.ok(Math.abs(recoveryPose(s).y-5)<.001);s.mode='return';s.ride={time:2.4,start:{x:50,y:5,z:0}};close(recoveryPose(s),SPAWN);assert.ok(Math.abs(recoveryPose(s).y)<.001);
 close(routePose(0),START);close(routePose(ROUTE_LENGTH),FINISH);let distance=0;for(let i=1;i<ROUTE.length;i++){distance+=dist(ROUTE[i-1],ROUTE[i]);close(routePose(distance),ROUTE[i]);}
});
test('Twelve spice friends award one crown, pickle jumps land safely, and Home preserves prizes',()=>{
 const s=createState();s.shield=1000;for(const p of SPICES){place(s,p);step(s,.1);step(s,.1);}assert.equal(s.found.length,12);assert.ok(s.badges.spices);place(s,BOUNCE);step(s,.1);assert.equal(s.bounces,1);step(s,.5,{x:1,z:0});assert.ok(s.y>4);step(s,2);assert.equal(s.y,0);assert.equal(s.bounces,1);home(s);assert.equal(s.found.length,12);assert.ok(s.badges.spices);
 const racing=startRace();home(racing);assert.equal(racing.mode,'explore');assert.equal(racing.race,null);assert.equal(racing.wins,0);
});

test('Squeeze is a fast, fair rival: brief head start, steady pace, and no time for a long pause',()=>{
 assert.equal(RACE_HEAD_START,1);assert.ok(RACE_SPEED>=7);assert.ok(RACE_FINISH_TIME<12.5);
 for(const fps of [30,60,120]){const s=startRace();step(s,3,undefined,fps);assert.ok(Math.abs(s.race.monsterDistance-(s.race.elapsed-RACE_HEAD_START)*RACE_SPEED)<.001);step(s,4,undefined,fps);followRoute(s,fps);assert.equal(s.wins,0);assert.ok(['flick','orbit'].includes(s.mode));}
});
function openLab(){const s=createState();place(s,MIXER);assert.equal(nearby(s).kind,'mixer');act(s);assert.equal(s.mode,'mixing');return s;}
test('The Sauce Lab accepts valid sauces and limits the bowl to four squirts',()=>{
 const s=createState();assert.equal(addSauce(s,'ketchup'),false);place(s,MIXER);act(s);assert.equal(stirSauces(s),false);assert.equal(addSauce(s,'mystery'),false);assert.equal(s.mixer.recipe.length,0);
 addSauce(s,'ketchup');assert.equal(stirSauces(s),false);addSauce(s,'ketchup');addSauce(s,'mustard');addSauce(s,'berry');assert.equal(s.mixer.recipe.length,4);assert.equal(addSauce(s,'pesto'),false);assert.equal(stirSauces(s),true);assert.equal(addSauce(s,'pesto'),false);assert.equal(clearRecipe(s),false);assert.equal(stirSauces(s),false);
});
test('Mixing finishes once with a named blended color, a fountain, and a matching apron at all frame rates',()=>{
 for(const fps of [30,60,120]){const s=openLab();addSauce(s,'ketchup');addSauce(s,'mustard');const expected=sauceResult(s.mixer.recipe);assert.equal(expected.name,'Lava sauce');stirSauces(s);step(s,3,undefined,fps);assert.equal(s.mixer.batches,0);step(s,.6,undefined,fps);assert.equal(s.mixer.phase,'party');assert.equal(s.mixer.batches,1);assert.deepEqual(s.mixer.result,expected);assert.equal(s.apronColor,expected.color);step(s,6,undefined,fps);assert.equal(s.mixer.phase,'idle');assert.equal(s.mixer.batches,1);assert.ok(clearRecipe(s));addSauce(s,'berry');addSauce(s,'garlic');stirSauces(s);step(s,3.6,undefined,fps);assert.equal(s.mixer.result.name,'Purple Cloud');assert.equal(s.mixer.batches,2);}
 const a=sauceResult(['ketchup','mustard']),b=sauceResult(['mustard','ketchup']);assert.deepEqual(a,b);assert.notEqual(sauceResult(['ketchup','ketchup','mustard']).color,a.color);assert.equal(sauceResult(SAUCES.map(s=>s.id)).name,'Rainbow Ruckus');
});
test('Lab play prevents ketchup attacks and leaving cancels unfinished mixes without a reward',()=>{
 for(const exit of ['walk','jump','close','home']){const s=openLab();s.shield=0;Object.assign(s.monster,{x:s.x+1,z:s.z,cooldown:0});addSauce(s,'pesto');addSauce(s,'berry');stirSauces(s);step(s,1);assert.equal(s.squirts,0);assert.equal(s.monster.shot,null);
  if(exit==='walk')step(s,.2,{x:1,z:0});if(exit==='jump')assert.ok(jump(s));if(exit==='close')assert.ok(closeMixer(s));if(exit==='home')assert.ok(home(s));assert.equal(s.mode,'explore');assert.equal(s.mixer.phase,'idle');assert.equal(s.mixer.batches,0);assert.equal(s.mixer.result,null);assert.deepEqual(s.mixer.recipe,['pesto','berry']);assert.ok(s.shield>0);
 }
 const s=openLab();addSauce(s,'berry');addSauce(s,'mustard');stirSauces(s);step(s,4);const color=s.apronColor;closeMixer(s);assert.equal(s.mixer.phase,'idle');assert.equal(s.mixer.batches,1);assert.equal(s.apronColor,color);place(s,SHOWER);act(s);assert.equal(s.apronColor,'#fff1cd');
});


function walkPath(s,path,fps=60){
 for(const p of path){let frames=0;while(dist(s,p)>.025&&s.mode==='race'&&frames++<fps*8){const d=dist(s,p),a=Math.min(1,d/(7.2/fps));tick(s,1/fps,{x:(p.x-s.x)/d*a,z:(p.z-s.z)/d*a});}if(s.mode==='race')assert.ok(dist(s,p)<.025,'Path must traverse real walls');}
}
test('Wall-hugging through the maze wins at the visible stripe and can never be flicked afterward',()=>{
 // The first corridor hugs the wall, outside the old invisible center checkpoints.
 const path=[{x:-17.22,z:11},{x:-17.22,z:6.22},{x:-3,z:6.22},...ROUTE.slice(4)];
 for(const fps of [30,60,120]){const s=startRace();walkPath(s,path,fps);assert.equal(s.wins,1);assert.equal(s.losses,0);assert.equal(s.mode,'explore');assert.ok(s.badges.race);step(s,20,undefined,fps);assert.equal(s.losses,0);assert.equal(s.mode,'explore');}
});
test('Both edges of the finish stripe count, including jumps',()=>{
 for(const fps of [30,60,120])for(const side of [-1,1]){const s=startRace();walkPath(s,ROUTE.slice(1,-1),fps);walkPath(s,[{x:15,z:-24.5},{x:15+side*2.8,z:-24.5}],fps);jump(s);walkPath(s,[{x:s.x,z:-27}],fps);assert.equal(s.wins,1);assert.equal(s.losses,0);}
 const s=startRace();place(s,{x:19,z:-27});tick(s,.02);assert.equal(s.wins,0);assert.equal(s.mode,'race');
});
test('Close finishes compare actual crossing times within the frame; ties favor the player',()=>{
 for(const fps of [30,60,120])for(const margin of [-.003,0,.003]){const s=startRace();walkPath(s,ROUTE.slice(1,-1),fps);place(s,{x:15,z:FINISH_LINE_Z+.05});const crossing=.05/7.2;s.race.elapsed=RACE_FINISH_TIME-crossing+margin;tick(s,1/fps,{x:0,z:-1});assert.equal(s.wins,margin<=0?1:0);assert.equal(s.losses,margin<=0?0:1);}
});
function bottledSauce(first='berry',second='garlic'){const s=openLab();addSauce(s,first);addSauce(s,second);stirSauces(s);step(s,3.6);assert.ok(takeSauce(s));return s;}
test('Only finished sauce can be bottled, and the carried recipe survives clearing, travel, and unfinished mixes',()=>{
 const s=openLab();assert.equal(takeSauce(s),false);addSauce(s,'berry');addSauce(s,'garlic');stirSauces(s);assert.equal(takeSauce(s),false);step(s,3.6);assert.ok(takeSauce(s));assert.equal(s.mode,'explore');const bottle={...s.carriedSauce};assert.equal(bottle.name,'Purple Cloud');
 place(s,MIXER);act(s);clearRecipe(s);assert.deepEqual(s.carriedSauce,bottle);addSauce(s,'ketchup');addSauce(s,'mustard');stirSauces(s);step(s,1);home(s);assert.deepEqual(s.carriedSauce,bottle);place(s,SHOWER);act(s);assert.deepEqual(s.carriedSauce,bottle);
 place(s,MIXER);act(s);stirSauces(s);step(s,4);takeSauce(s);assert.equal(s.carriedSauce.name,'Lava sauce');
});
test('Aiming is forgiving, visible sauce travels before painting, and Squeeze keeps the mixed color',()=>{
 for(const fps of [30,60,120]){const s=bottledSauce();place(s,{x:7,z:17});Object.assign(s.monster,{x:5,z:15,cooldown:0});s.shield=0;tick(s,1/fps);assert.ok(s.monster.shot);assert.equal(sauceAim(s),'ready');const color=s.carriedSauce.color;assert.ok(squirtSauce(s));assert.equal(squirtSauce(s),false);assert.equal(s.monster.color,'#d83c23');close(sauceShotPosition(s.sauceShot),s.sauceShot.from);step(s,.25,undefined,fps);assert.equal(s.sauceHits,0);step(s,.25,undefined,fps);assert.equal(s.sauceHits,1);assert.equal(s.monster.color,color);assert.equal(s.monster.shot,null);assert.ok(s.monster.painted>0);step(s,1,undefined,fps);assert.equal(s.sauceHits,1);assert.ok(squirtSauce(s));step(s,.5,undefined,fps);assert.equal(s.sauceHits,2);home(s);assert.equal(s.monster.color,color);assert.equal(s.carriedSauce.color,color);}
});
test('Sauce cannot shoot through walls, out of reach, without a bottle, or during lab and recovery',()=>{
 const s=bottledSauce();place(s,{x:-16,z:-20});Object.assign(s.monster,{x:-20,z:-20});assert.equal(sauceAim(s),'blocked');assert.equal(squirtSauce(s),false);place(s,{x:25,z:25});assert.equal(sauceAim(s),'far');assert.equal(squirtSauce(s),false);
 for(const mode of ['mixing','countdown','flick','orbit','return']){s.mode=mode;assert.equal(sauceAim(s),'unavailable');assert.equal(squirtSauce(s),false);}assert.equal(squirtSauce(createState()),false);
 // A clear shot cannot pass through a wall if Squeeze moves behind it during flight.
 s.mode='explore';place(s,{x:-22,z:15});Object.assign(s.monster,{x:-22,z:12});assert.ok(squirtSauce(s));Object.assign(s.monster,{x:-15,z:0});step(s,.5);assert.equal(s.sauceHits,0);assert.equal(s.monster.color,'#d83c23');
});
test('Painting during a race never changes its pace or winner',()=>{
 const s=bottledSauce();place(s,START);act(s);step(s,3.1);assert.ok(squirtSauce(s));step(s,.5);assert.equal(s.sauceHits,1);assert.equal(s.mode,'race');assert.equal(s.race.monsterDistance,Math.max(0,s.race.elapsed-RACE_HEAD_START)*RACE_SPEED);followRoute(s);assert.equal(s.wins,1);assert.equal(s.losses,0);
});


test('Repeated colors mix, bottle and paint correctly; ketchup plus mustard is always Lava sauce',()=>{
 for(const sauce of SAUCES){const s=openLab();addSauce(s,sauce.id);addSauce(s,sauce.id);assert.ok(stirSauces(s));step(s,3.6);assert.equal(s.mixer.result.color,sauce.color);assert.ok(takeSauce(s));assert.equal(s.carriedSauce.color,sauce.color);}
 for(const recipe of [['ketchup','mustard'],['mustard','ketchup'],['ketchup','ketchup','mustard'],['mustard','mustard','ketchup','ketchup']])assert.equal(sauceResult(recipe).name,'Lava sauce');
});
test('The bowl ride hops in, mixes the explorer, rewards once, and returns safely at every frame rate',()=>{
 for(const fps of [30,60,120]){const s=openLab();addSauce(s,'ketchup');addSauce(s,'ketchup');assert.ok(rideMixer(s));step(s,.95,undefined,fps);assert.ok(s.mixer.ride);assert.ok(s.y>2.7);assert.ok(dist(s,{x:MIXER.x,z:MIXER.z-.6})<2);assert.equal(s.mixer.batches,0);const before={x:s.x,z:s.z};step(s,.5,undefined,fps);assert.ok(dist(s,before)>.5);assert.equal(s.squirts,0);
  assert.equal(rideMixer(s),false);assert.equal(addSauce(s,'berry'),false);assert.equal(clearRecipe(s),false);assert.equal(takeSauce(s),false);
  step(s,3.1,undefined,fps);assert.equal(s.mixer.batches,1);assert.equal(s.apronColor,SAUCES[0].color);assert.ok(s.mixer.ride);assert.equal(takeSauce(s),false);step(s,1.2,undefined,fps);assert.equal(s.mixer.ride,null);assert.equal(s.mode,'mixing');assert.equal(s.y,0);close(s,{x:MIXER.x,z:MIXER.z+3.8});step(s,6,undefined,fps);assert.equal(s.mixer.batches,1);assert.ok(takeSauce(s));assert.equal(s.mode,'explore');
 }
});
test('The bowl ride is continuous and can be exited early with movement, jump, close, or Home',()=>{
 const ride={time:0,start:{x:MIXER.x,y:0,z:MIXER.z+3.8}};close(mixerRidePose(ride),ride.start);assert.equal(mixerRidePose(ride).y,0);
 for(const time of [.9,4.4,5.6]){const a=mixerRidePose({...ride,time:time-1e-7}),b=mixerRidePose({...ride,time:time+1e-7});assert.ok(dist(a,b)<.001);assert.ok(Math.abs(a.y-b.y)<.001);}
 for(const exit of ['walk','jump','close','home'])for(const time of [.4,2,4.8]){const s=openLab();addSauce(s,'berry');addSauce(s,'mustard');rideMixer(s);step(s,time);const earned=s.mixer.batches;
  if(exit==='walk')tick(s,.02,{x:1,z:0});if(exit==='jump')jump(s);if(exit==='close')closeMixer(s);if(exit==='home')home(s);
  assert.equal(s.mode,'explore');assert.equal(s.mixer.ride,null);assert.equal(s.mixer.phase,'idle');assert.ok(s.y<.1);assert.equal(s.mixer.batches,earned);step(s,7);assert.equal(s.mixer.batches,earned);
 }
 const s=openLab();assert.equal(rideMixer(s),false);assert.equal(s.mixer.ride,null);
});
test('Painted Squeeze squirts the mixed color back, including the projectile, puddle and apron stain',()=>{
 for(const fps of [30,60,120]){const s=bottledSauce();place(s,{x:5,z:19});Object.assign(s.monster,{x:5,z:15,cooldown:0});s.shield=0;assert.ok(squirtSauce(s));step(s,.5,undefined,fps);assert.equal(s.monster.sauceName,'Purple Cloud');s.monster.cooldown=0;s.monster.shot=null;tick(s,1/fps);const shot=s.monster.shot;assert.ok(shot);assert.equal(shot.color,s.carriedSauce.color);assert.equal(shot.name,'Purple Cloud');step(s,1.4,undefined,fps);assert.ok(s.splats.some(p=>p.color===s.carriedSauce.color));assert.equal(s.stainColor,s.carriedSauce.color);assert.equal(s.squirts,1);
  s.carriedSauce=sauceResult(['ketchup','mustard']);s.bump={x:0,z:0};s.sauceCooldown=0;place(s,{x:s.monster.x+1,z:s.monster.z+2});assert.ok(squirtSauce(s));step(s,.5,undefined,fps);s.shield=0;s.monster.cooldown=0;tick(s,1/fps);assert.equal(s.monster.shot.color,s.carriedSauce.color);assert.equal(s.monster.shot.name,'Lava sauce');
 }
});

function startBackwards(fps=60){const s=createState();place(s,FINISH);assert.equal(nearby(s).name,'Race backwards!');assert.ok(act(s));assert.equal(s.race.reverse,true);close(s,FINISH);step(s,3.1,undefined,fps);return s;}
test('Backwards races start at the golden arch and are winnable through the actual maze',()=>{
 for(const fps of [30,60,120]){const s=startBackwards(fps);assert.equal(s.mode,'race');assert.equal(s.race.monsterDistance,0);close(s.monster,FINISH);tick(s,1/fps);assert.equal(s.wins,0,'The departure stripe must not count');walkPath(s,[...ROUTE].reverse().slice(1),fps);assert.equal(s.wins,1);assert.equal(s.losses,0);assert.ok(s.badges.race);assert.match(s.event,/BACKWARDS VICTORY/);step(s,20,undefined,fps);assert.equal(s.losses,0);assert.equal(s.monster.returnDistance,0);}
});
test('Backwards races accept either outside route and either edge of the original start stripe',()=>{
 for(const fps of [30,60,120])for(const side of [-1,1]){const s=startBackwards(fps);const x=side*20;walkPath(s,[{x,z:-27},{x,z:11},{x:START.x,z:11}],fps);assert.equal(s.wins,1);assert.equal(s.losses,0);}
 for(const side of [-1,1]){const s=startBackwards();place(s,{x:START.x+side*2.8,z:START.z-1});jump(s);walkPath(s,[{x:s.x,z:START.z}]);assert.equal(s.wins,1);}
});
test('Backwards close finishes, losses, cancellation and return keep Squeeze on his route',()=>{
 for(const fps of [30,60,120])for(const margin of [-.003,0,.003]){const s=startBackwards(fps);place(s,{x:START.x,z:START.z-.4});s.race.elapsed=RACE_FINISH_TIME-.05/7.2+margin;tick(s,1/fps,{x:0,z:1});assert.equal(s.wins,margin<=0?1:0);assert.equal(s.losses,margin<=0?0:1);}
 close(routePose(0,true),FINISH);close(routePose(ROUTE_LENGTH,true),START);
 const s=startBackwards();step(s,3);const before={x:s.monster.x,z:s.monster.z};home(s);tick(s,.02);assert.ok(dist(s.monster,before)<.13,'Cancel should walk home without teleporting');step(s,20);assert.equal(s.monster.returnDistance,0);
 const lost=startBackwards();step(lost,RACE_FINISH_TIME);assert.equal(lost.losses,1);assert.ok(dist(lost.monster,START)<.4);const atLoss={x:lost.monster.x,z:lost.monster.z};step(lost,2.4);act(lost);for(let i=0;i<1200&&lost.mode!=='explore';i++)tick(lost,1/60);assert.equal(lost.mode,'explore');assert.ok(dist(lost.monster,atLoss)<2,'Recovery must not jump Squeeze to the opposite end');
});
test('All twelve spices must be collected for the crown, with no duplicate rewards',()=>{
 const s=createState();s.shield=1000;for(const p of SPICES.slice(0,6)){place(s,p);tick(s,.02);}assert.equal(s.found.length,6);assert.equal(s.badges.spices,false);
 for(const p of SPICES.slice(6)){assert.ok(cellRoute(24,p.id).length);place(s,p);tick(s,.02);}assert.equal(s.found.length,12);assert.ok(s.badges.spices);assert.equal(s.effect,'badge');tick(s,.02);assert.equal(s.effect,null);assert.equal(s.found.length,12);home(s);assert.equal(s.found.length,12);
});
function hitWithSauce(s,color='#d83c23'){s.shield=0;s.monster.shot={age:1.34,from:{x:s.x-2,z:s.z},target:{x:s.x,z:s.z},color,name:'Test sauce'};s.monster.cooldown=4;tick(s,.02);}
test('Each direct sauce hit pops out one matching Mini Squeeze; misses and dodges create none',()=>{
 for(const fps of [30,60,120]){const s=createState();place(s,{x:5,z:19});s.shield=0;s.monster.cooldown=0;step(s,1.5,undefined,fps);assert.equal(s.minis.length,1);assert.equal(s.miniSerial,1);assert.equal(s.minis[0].color,'#d83c23');assert.ok(s.minis[0].y>0);s.shield=100;step(s,2,undefined,fps);assert.equal(s.minis.length,1);assert.equal(s.minis[0].y,0);const buddy={...s.minis[0]};step(s,1,{x:1,z:0},fps);step(s,2,undefined,fps);assert.ok(dist(buddy,s.minis[0])>1);assert.ok(dist(s.minis[0],s)<5);
  s.bump={x:0,z:0};hitWithSauce(s,'#b883f5');assert.equal(s.minis.length,2);assert.equal(s.minis[0].color,'#d83c23');assert.equal(s.minis[1].color,'#b883f5');home(s);assert.equal(s.minis.length,2);
 }
 for(const dodge of ['walk','jump','shield']){const s=createState();place(s,{x:5,z:19});s.shield=0;s.monster.cooldown=0;tick(s,.01);step(s,.7);if(dodge==='jump')jump(s);if(dodge==='shield')s.shield=10;step(s,.7,dodge==='walk'?{x:1,z:0}:undefined);assert.equal(s.minis.length,0);}
});
test('Mini buddies respect maze walls, pause for races and the lab, and stay bounded across many hits',()=>{
 const s=createState();place(s,{x:-19,z:-20});Object.assign(s.monster,{x:-20,z:-20});for(let i=0;i<MAX_MINIS+5;i++){s.bump={x:0,z:0};hitWithSauce(s);}assert.equal(s.minis.length,MAX_MINIS);assert.equal(s.miniSerial,MAX_MINIS+5);assert.equal(new Set(s.minis.map(m=>m.id)).size,MAX_MINIS);s.shield=100;step(s,3);assert.ok(s.minis.every(m=>m.x<-18.7));
 const before=JSON.stringify(s.minis);place(s,FINISH);act(s);step(s,3.5);assert.equal(JSON.stringify(s.minis),before);assert.equal(s.squirts,MAX_MINIS+5);home(s);place(s,MIXER);act(s);step(s,5);assert.equal(JSON.stringify(s.minis),before);
});
