import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PLANETS,SUN,UP,createState,tick,position,startFlight,flightPose,FLIGHT_DURATION,SUN_DURATION,knockIntoSun,sunPose,jump,home,surface,unit,length,sub,dot,starNormals,padNormal} from '../dist/space/rules.js';
function step(s,time,input={x:0,z:0},fps=60){for(let i=0;i<time*fps;i++)tick(s,1/fps,input);}
function near(a,b,epsilon=1e-6){assert.ok(length(sub(a,b))<epsilon,`${a} versus ${b}`);}
test('Walking follows each curved planet, crosses poles, and keeps an orthonormal movement frame',()=>{
 for(const fps of [30,60,120])for(let i=0;i<8;i++){const s=createState();s.planet=i;s.nextMeteor=1000;s.padCooldown=1000;const p=PLANETS[i];step(s,Math.PI*2*p.r/5.5,{x:0,z:-1},fps);assert.equal(s.mode,'walk');assert.ok(length(sub(s.n,UP))<.05);assert.ok(Math.abs(dot(s.n,s.north))<1e-8);assert.ok(Math.abs(length(s.north)-1)<1e-8);assert.ok(Math.abs(length(sub(position(s),p.p))-p.r)<1e-8);}
});
test('Jetpack visits all eight planets and walking resumes after arrival',()=>{for(const fps of [30,60,120]){const s=createState();assert.equal(startFlight(s,2),false);assert.equal(startFlight(s,-1),false);for(let i=0;i<8;i++){if(i===s.planet)continue;assert.ok(startFlight(s,i));assert.equal(startFlight(s,(i+1)%8),false);assert.equal(jump(s),false);step(s,FLIGHT_DURATION+.1,undefined,fps);assert.equal(s.mode,'walk');assert.equal(s.planet,i);near(position(s),surface(PLANETS[i],UP));}assert.equal(s.visited.length,8);}});
test('Every interplanetary route is continuous and clears the sun and planets, including departures from the underside',()=>{
 for(let from=0;from<8;from++)for(let to=0;to<8;to++)if(from!==to)for(const startN of [UP,[0,-1,0],[1,0,0],[0,0,-1]]){
  const ride={from,to,startN,startHeight:0};for(let t=0;t<=FLIGHT_DURATION;t+=.04){const pose=flightPose({...ride,time:t});for(const p of [...PLANETS,SUN])assert.ok(length(sub(pose.p,p.p))>=p.r-.02,`route ${from}→${to}, t=${t} inside ${p.name||'Sun'}`);}
  for(const t of [.8,2,5.6,6.6])near(flightPose({...ride,time:t-1e-7}).p,flightPose({...ride,time:t+1e-7}).p,.0001);
 }
});
test('New Moon telegraphs a meteor, hits a still astronaut, says hot-hot-hot, and returns with discoveries intact',()=>{for(const fps of [30,60,120]){const s=createState();s.stars=['2:0'];s.nextMeteor=0;tick(s,1/fps);assert.equal(s.meteors.length,1);assert.ok(s.meteors[0].age<1.8);step(s,3.3,undefined,fps);assert.equal(s.mode,'sun');assert.equal(s.hits,1);const phases=new Set();let spoke=false;for(let i=0;i<9*fps&&s.mode==='sun';i++){phases.add(s.ride.phase);tick(s,1/fps);spoke ||= s.event.includes('hot, hot, hot');}assert.deepEqual([...phases],['knock','hot','rescue']);assert.ok(spoke);assert.equal(s.mode,'walk');assert.equal(s.planet,2);near(position(s),surface(PLANETS[2],UP));assert.deepEqual(s.stars,['2:0']);assert.ok(s.nextMeteor>10);}});
test('Sun ride has continuous joins and stays outside the sun even from its lower hemisphere',()=>{
 for(const start of [[5,8,52],[0,-40,0],[0,35,0],[-50,-10,-40]]){const s=createState();s.n=unit(sub(start,PLANETS[2].p));knockIntoSun(s);const ride={...s.ride,start,hot:surface(SUN,unit(start),1.1)};for(let t=0;t<=SUN_DURATION;t+=.01)assert.ok(length(sunPose({...ride,time:t}).p)>SUN.r);for(const t of [2.2,4.2,5.4,8])near(sunPose({...ride,time:t-1e-7}).p,sunPose({...ride,time:t+1e-7}).p,.0001);}
});
test('A visible meteor can be dodged by walking or a well-timed jump at every frame rate',()=>{
 for(const fps of [30,60,120])for(const action of ['walk','jump']){const s=createState();s.nextMeteor=0;tick(s,1/fps);if(action==='walk')step(s,3.4,{x:1,z:0},fps);else{step(s,2.55,undefined,fps);jump(s);step(s,.9,undefined,fps);}assert.equal(s.mode,'walk');assert.equal(s.hits,0);assert.equal(s.dodges,1);}
});
test('Stardust awards once, bounce pads work, and home cancels either ride without losing discoveries',()=>{
 const s=createState();s.nextMeteor=1000;s.n=starNormals[0];step(s,.1);assert.deepEqual(s.stars,['2:0']);step(s,.3);assert.equal(s.stars.length,1);s.n=padNormal;step(s,.1);assert.equal(s.bounces,1);assert.ok(s.vy>0);step(s,.5);assert.ok(s.height>3);home(s);startFlight(s,4);step(s,1);home(s);assert.equal(s.mode,'walk');assert.equal(s.planet,2);knockIntoSun(s);step(s,1);home(s);assert.equal(s.mode,'walk');assert.deepEqual(s.stars,['2:0']);near(position(s),surface(PLANETS[2],UP));
});
