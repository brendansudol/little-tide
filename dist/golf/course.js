// Shared course rules, also used by the deterministic gameplay checks.
export const HOLES = [
  { id: 1, x: -13, z: 12, color: '#f07965', name: 'The first drop' },
  { id: 2, x: -15, z: -5, color: '#efa632', name: 'Round the bend' },
  { id: 3, x: 0, z: -17, color: '#ad8cd7', name: 'Rainbow run' },
  { id: 4, x: 16, z: -6, color: '#55bfc7', name: 'Duck lagoon' },
  { id: 5, x: 15, z: 12, color: '#ed819f', name: 'The far side' },
  { id: 6, x: 0, z: 7, color: '#7dba60', name: 'The happy return' },
];
export const MILL = { x: -1, z: -1, hubY: 3.4, radius: 3.05, speed: 1.05 };
export const START = { x: -13, z: 17 };
export const nextHole = index => (index + 1) % HOLES.length;
export function tubePoints(index) {
  const a=HOLES[index],b=HOLES[nextHole(index)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),bend=index%2?1:-1;
  return [[a.x,.85,a.z],[a.x,-1.1,a.z],[a.x+dx*.18-dz/len*bend*2,-4.4,a.z+dz*.18+dx/len*bend*2],[(a.x+b.x)/2-dz/len*bend*3,-5-index*.13,(a.z+b.z)/2+dx/len*bend*3],[b.x-dx*.18-dz/len*bend*2,-4.4,b.z-dz*.18+dx/len*bend*2],[b.x,-1.1,b.z],[b.x,.85,b.z]];
}
export function clubHeads(time) {
  return Array.from({length:4},(_,i)=>{const a=time*MILL.speed+i*Math.PI/2;return{x:MILL.x+.32*Math.cos(a)-MILL.radius*Math.sin(a),y:MILL.hubY+.32*Math.sin(a)+MILL.radius*Math.cos(a),z:MILL.z};});
}
export function createState(){return{x:START.x,z:START.z,y:.08,mode:'walk',ride:null,flight:null,blockedHole:null,cooldown:0,visited:new Set([1]),rides:0,launches:0,jumpY:0,jumpV:0};}
export function canEnter(state,index){return state.mode==='walk'&&state.cooldown<=0&&state.blockedHole!==index&&state.jumpY<.15;}
export function enterHole(state,index){if(!canEnter(state,index))return false;state.mode='tube';state.ride={from:index,to:nextHole(index),elapsed:0,duration:4.6};state.visited.add(HOLES[index].id);state.jumpY=state.jumpV=0;return true;}
export function startFlight(state){if(state.mode!=='walk'||state.cooldown>0)return false;state.mode='flight';state.flight={fromX:state.x,fromZ:state.z,toX:18,toZ:12,elapsed:0,duration:3.2};state.launches++;state.jumpY=state.jumpV=0;return true;}
export function tickState(state,dt,time,input={x:0,z:0,run:false},sampleTube){
  state.cooldown=Math.max(0,state.cooldown-dt);
  if(state.mode==='tube'){
    const r=state.ride;r.elapsed+=dt;const t=Math.min(r.elapsed/r.duration,1),p=sampleTube(r.from,t);state.x=p.x;state.y=p.y-.77;state.z=p.z;
    if(t===1){state.mode='emerge';r.elapsed=0;state.visited.add(HOLES[r.to].id);state.rides++;}return;
  }
  if(state.mode==='emerge'){
    const r=state.ride;r.elapsed+=dt;const t=Math.min(r.elapsed/.8,1),h=HOLES[r.to];state.x=h.x;state.z=h.z+1.9*t;state.y=.08+Math.sin(t*Math.PI)*1.9;
    if(t===1){state.mode='walk';state.blockedHole=r.to;state.cooldown=1.1;state.ride=null;}return;
  }
  if(state.mode==='flight'){
    const f=state.flight;f.elapsed+=dt;const t=Math.min(f.elapsed/f.duration,1);state.x=f.fromX+(f.toX-f.fromX)*t;state.z=f.fromZ+(f.toZ-f.fromZ)*t;state.y=.08+Math.sin(Math.PI*t)*12;
    if(t===1){state.mode='walk';state.cooldown=1.5;state.flight=null;state.visited.add(5);}return;
  }
  if(state.blockedHole!==null){const h=HOLES[state.blockedHole];if(Math.hypot(state.x-h.x,state.z-h.z)>1.7)state.blockedHole=null;}
  const mag=Math.hypot(input.x,input.z),speed=input.run?7:4.8;
  if(mag>.01){state.x+=input.x/Math.max(1,mag)*speed*dt;state.z+=input.z/Math.max(1,mag)*speed*dt;const edge=Math.sqrt((state.x/29)**2+(state.z/25)**2);if(edge>1){state.x/=edge;state.z/=edge;}}
  if(state.jumpV!==0||state.jumpY>0){state.jumpY+=state.jumpV*dt;state.jumpV-=13*dt;if(state.jumpY<0){state.jumpY=0;state.jumpV=0;}}state.y=.08+state.jumpY;
  for(let i=0;i<HOLES.length;i++){const h=HOLES[i],d=Math.hypot(state.x-h.x,state.z-h.z);if(d<4.4)state.visited.add(h.id);if(d<.69&&canEnter(state,i)){enterHole(state,i);return;}}
  if(state.cooldown<=0&&Math.abs(state.z-MILL.z)<.85&&clubHeads(time).some(h=>Math.hypot(h.x-state.x,h.y-(state.y+.8))<1.05)){startFlight(state);}
}
