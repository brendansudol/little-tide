import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PLANETS,SUN,NEW_MOON,MOON_INDEX,SUN_HITS,sunRadius,sunIsOut,restoreSun,meteorPosition,UP,createState,tick,position,startFlight,landingTarget,requestLanding,sphereContact,SUN_DURATION,knockIntoSun,sunPose,jump,home,surface,unit,length,sub,dot,starNormals,padNormal} from '../dist/space/rules.js';
function step(s,time,input={x:0,z:0},fps=60){for(let i=0;i<time*fps;i++)tick(s,1/fps,input);}
function near(a,b,epsilon=1e-6){assert.ok(length(sub(a,b))<epsilon,`${a} versus ${b}`);}
test('Walking follows each curved planet, crosses poles, and keeps an orthonormal movement frame',()=>{
 for(const fps of [30,60,120])for(let i=0;i<8;i++){const s=createState();s.planet=i;s.nextMeteor=1000;s.padCooldown=1000;const p=PLANETS[i];step(s,Math.PI*2*p.r/5.5,{x:0,z:-1},fps);assert.equal(s.mode,'walk');assert.ok(length(sub(s.n,UP))<.05);assert.ok(Math.abs(dot(s.n,s.north))<1e-8);assert.ok(Math.abs(length(s.north)-1)<1e-8);assert.ok(Math.abs(length(sub(position(s),p.p))-p.r)<1e-8);}
});
test('The pilot controls all three axes, can reverse course, and hovers on release at every frame rate',()=>{
 for(const fps of [30,60,120]){const s=createState();assert.ok(startFlight(s));assert.equal(startFlight(s),false);assert.equal(jump(s),false);step(s,1,undefined,fps);const launch=position(s);assert.ok(launch[1]>10);
  step(s,1,{flight:[1,1,0]},fps);assert.ok(position(s)[0]>launch[0]+8&&position(s)[1]>launch[1]+8);const right=position(s)[0];step(s,1,{flight:[-1,0,0]},fps);assert.ok(position(s)[0]<right-8);
  step(s,1,undefined,fps);const hover=[...position(s)];step(s,2,undefined,fps);near(position(s),hover,.002);assert.equal(s.mode,'flight');
 }
});
test('Manual flight can reach and land on all eight planets without selecting a destination',()=>{
 for(const fps of [30,60,120]){const s=createState();
  function steerTo(target){for(let i=0;i<20*fps;i++){const delta=sub(target,position(s));if(length(delta)<.4)return;assert.equal(s.mode,'flight');tick(s,1/fps,{flight:length(delta)<2?delta.map(v=>v/2):unit(delta),heading:unit(delta)});}assert.fail('Unable to reach waypoint');}
  for(let i=0;i<8;i++){if(i===s.planet)continue;assert.ok(startFlight(s));steerTo([position(s)[0],60,position(s)[2]]);steerTo([PLANETS[i].p[0],60,PLANETS[i].p[2]]);
   for(let j=0;j<12*fps&&s.mode==='flight';j++)tick(s,1/fps,{flight:[0,-1,0]});assert.equal(s.mode,'walk');assert.equal(s.planet,i);near(position(s),surface(PLANETS[i],s.n));
  }assert.equal(s.visited.length,8);
 }
});
test('Automatic touchdown works on sides and undersides, and easy landing is nearby only and cancellable',()=>{
 for(const n of [UP,[0,-1,0],[1,0,0],[0,0,-1]]){const s=createState();s.n=n;startFlight(s);step(s,1);assert.ok(length(sub(position(s),PLANETS[2].p))>PLANETS[2].r+2);assert.ok(requestLanding(s));tick(s,.05,{flight:[1,0,0]});assert.equal(s.ride.landing,null);assert.ok(requestLanding(s));for(let i=0;i<180&&s.mode==='flight';i++)tick(s,1/60);assert.equal(s.mode,'walk');assert.ok(dot(s.n,n)>.99);assert.ok(Math.abs(dot(s.n,s.north))<1e-8);startFlight(s);step(s,1);assert.equal(s.mode,'flight');}
 const s=createState();assert.equal(requestLanding(s),false);startFlight(s);step(s,2,{flight:[0,1,0]});assert.ok(landingTarget(s).clearance>6);assert.equal(requestLanding(s),false);
});
test('Swept collisions stop fast flight from crossing a planet or sun',()=>{
 assert.ok(sphereContact([-10,0,0],[10,0,0],[0,0,0],1)>0);assert.equal(sphereContact([-10,3,0],[10,3,0],[0,0,0],1),null);
 const s=createState();startFlight(s);s.ride.time=2;s.ride.position=[-20,0,0];s.ride.velocity=[1200,0,0];tick(s,.05,{flight:[1,0,0]});assert.equal(s.mode,'sun');assert.equal(s.ride.phase,'hot');assert.equal(s.event,"Oh, that's hot, hot, hot!");assert.equal(s.hits,0);step(s,6);assert.equal(s.mode,'walk');assert.equal(s.planet,2);
 const fast=createState();startFlight(fast);fast.ride.time=2;fast.ride.position=[PLANETS[7].p[0]-20,...PLANETS[7].p.slice(1)];fast.ride.velocity=[1200,0,0];tick(fast,.05,{flight:[1,0,0]});assert.equal(fast.mode,'walk');assert.equal(fast.planet,7);
});
test('New Moon telegraphs a meteor, hits a still astronaut, says hot-hot-hot, and returns with discoveries intact',()=>{for(const fps of [30,60,120]){const s=createState();s.stars=['2:0'];s.nextMeteor=0;tick(s,1/fps);assert.equal(s.meteors.length,1);assert.ok(s.meteors[0].age<1.8);step(s,3.3,undefined,fps);assert.equal(s.mode,'sun');assert.equal(s.hits,1);const phases=new Set();let spoke=false;for(let i=0;i<9*fps&&s.mode==='sun';i++){phases.add(s.ride.phase);tick(s,1/fps);spoke ||= s.event.includes('hot, hot, hot');}assert.deepEqual([...phases],['knock','hot','rescue']);assert.ok(spoke);assert.equal(s.mode,'walk');assert.equal(s.planet,2);near(position(s),surface(PLANETS[2],UP));assert.deepEqual(s.stars,['2:0']);assert.ok(s.nextMeteor>10);}});
test('Sun ride has continuous joins and stays outside the sun even from its lower hemisphere',()=>{
 for(const start of [[5,8,52],[0,-40,0],[0,35,0],[-50,-10,-40]]){const s=createState();s.n=unit(sub(start,PLANETS[2].p));knockIntoSun(s);const ride={...s.ride,start,hot:surface(SUN,unit(start),1.1)};for(let t=0;t<=SUN_DURATION;t+=.01)assert.ok(length(sunPose({...ride,time:t}).p)>SUN.r);for(const t of [2.2,4.2,5.4,8])near(sunPose({...ride,time:t-1e-7}).p,sunPose({...ride,time:t+1e-7}).p,.0001);}
});
test('A visible meteor can be dodged by walking or a well-timed jump at every frame rate',()=>{
 for(const fps of [30,60,120])for(const action of ['walk','jump']){const s=createState();s.nextMeteor=0;tick(s,1/fps);if(action==='walk')step(s,3.4,{x:1,z:0},fps);else{step(s,2.55,undefined,fps);jump(s);step(s,.9,undefined,fps);}assert.equal(s.mode,'walk');assert.equal(s.hits,0);assert.equal(s.dodges,1);}
});
test('Stardust awards once, bounce pads work, and home cancels either ride without losing discoveries',()=>{
 const s=createState();s.nextMeteor=1000;s.n=starNormals[0];step(s,.1);assert.deepEqual(s.stars,['2:0']);step(s,.3);assert.equal(s.stars.length,1);s.n=padNormal;step(s,.1);assert.equal(s.bounces,1);assert.ok(s.vy>0);step(s,.5);assert.ok(s.height>3);home(s);startFlight(s);step(s,1);home(s);assert.equal(s.mode,'walk');assert.equal(s.planet,2);knockIntoSun(s);step(s,1);home(s);assert.equal(s.mode,'walk');assert.deepEqual(s.stars,['2:0']);near(position(s),surface(PLANETS[2],UP));
});

function flyToMoon(s,fps=60){
 assert.ok(startFlight(s));
 for(let i=0;i<fps*10&&s.mode==='flight';i++){const direction=unit(sub(NEW_MOON.p,position(s)));tick(s,1/fps,{flight:direction,heading:direction});}
 assert.equal(s.mode,'walk');assert.equal(s.planet,MOON_INDEX);assert.ok(s.moonFriendly);
}
test('Fly directly from Earth to New Moon, walk his curved surface and take off again at every frame rate',()=>{
 for(const fps of [30,60,120]){const s=createState();flyToMoon(s,fps);near(position(s),surface(NEW_MOON,s.n));assert.deepEqual(s.visited,[2]);const n=[...s.n];step(s,1,{x:1,z:0},fps);assert.ok(length(sub(n,s.n))>.5);assert.ok(Math.abs(dot(s.n,s.north))<1e-8);assert.equal(s.stars.length,0);assert.ok(jump(s));step(s,.4,undefined,fps);assert.ok(s.height>1);assert.ok(startFlight(s));step(s,1,{flight:s.n},fps);assert.equal(s.mode,'flight');}
});
test('New Moon accepts side, underside and assisted landings without duplicate planet rewards',()=>{
 for(const n of [UP,[0,-1,0],[1,0,0],[0,0,1]]){const s=createState();startFlight(s);s.ride.time=2;s.ride.position=surface(NEW_MOON,n,3);assert.equal(landingTarget(s).index,MOON_INDEX);assert.ok(requestLanding(s));for(let i=0;i<180&&s.mode==='flight';i++)tick(s,1/60);assert.equal(s.planet,MOON_INDEX);assert.equal(s.mode,'walk');assert.ok(dot(s.n,n)>.99);assert.deepEqual(s.visited,[2]);}
});
test('Eight visible sun hits shrink and extinguish the sun while keeping the rider safe',()=>{
 for(const fps of [30,60,120]){const s=createState();flyToMoon(s,fps);let oldHits=0,oldRadius=sunRadius(s);const impacts=[],kinds=new Set();let movingMeteor=false;
 for(let i=0;i<fps*21;i++){tick(s,1/fps);for(const m of s.meteors){assert.equal(m.aim,'sun');kinds.add(m.kind);if(m.age>.7&&m.age<1.6){movingMeteor=true;assert.ok(length(sub(meteorPosition(m),m.from))>1);assert.ok(length(meteorPosition(m))>sunRadius(s));}}
 if(s.sunHits!==oldHits){assert.equal(s.sunHits,oldHits+1);impacts.push(s.effect);oldHits=s.sunHits;}assert.ok(sunRadius(s)<=oldRadius+1e-9);oldRadius=sunRadius(s);assert.equal(s.mode,'walk');}
 assert.equal(s.sunHits,SUN_HITS);assert.ok(sunIsOut(s));assert.equal(s.sunGlow,0);assert.ok(sunRadius(s)<SUN.r*.11);assert.equal(s.meteors.length,0);assert.equal(s.hits,0);assert.ok(movingMeteor);assert.deepEqual([...kinds].sort(),['asteroid','meteorite']);assert.deepEqual(impacts,[...Array(7).fill('sun-hit'),'sun-out']);assert.equal(knockIntoSun(s),false);
 }
});
test('The solar show survives takeoff and Home, stops after eight shots, and can be replayed without losing discoveries',()=>{
 for(const exit of ['fly','home','sun']){const s=createState();s.stars=['2:0'];flyToMoon(s);step(s,1);assert.equal(s.meteors.length,1);if(exit==='fly')startFlight(s);else if(exit==='home')home(s);else knockIntoSun(s);step(s,22);assert.ok(sunIsOut(s));assert.equal(s.sunShots,SUN_HITS);assert.equal(s.hits,exit==='sun'?1:0);home(s);assert.ok(sunIsOut(s));assert.equal(s.sunGlow,0);restoreSun(s);assert.equal(s.mode,'walk');assert.equal(s.planet,2);assert.equal(s.sunGlow,1);assert.equal(s.sunHits,0);assert.equal(s.moonFriendly,false);assert.deepEqual(s.stars,['2:0']);assert.equal(s.meteors.length,0);flyToMoon(s);step(s,21);assert.ok(sunIsOut(s));}
});
test('An extinguished sun does not start a hot ride or allow flight through its cold core',()=>{
 const s=createState();s.sunHits=s.sunShots=SUN_HITS;s.sunGlow=0;s.moonFriendly=true;startFlight(s);s.ride.time=2;s.ride.position=[-5,0,0];s.ride.velocity=[1200,0,0];tick(s,.05,{flight:[1,0,0]});assert.equal(s.mode,'flight');assert.ok(length(position(s))>sunRadius(s));assert.equal(s.hits,0);assert.equal(s.event,'Just a cool little ember now.');
});
