// Sauce has momentum; pepperoni gives the player a little traction.
export const RADIUS = 26;
export const PERIOD = 28;
export function wallState(time) {
  const phase = ((time % PERIOD) + PERIOD) % PERIOD;
  const smooth = t => t*t*(3-2*t);
  if (phase < 6) return {extent:17, label:'Room to roam', phase:'open', remaining:6-phase};
  if (phase < 16) return {extent:17-12*smooth((phase-6)/10), label:'Pepperoni squeeze!', phase:'closing', remaining:16-phase};
  if (phase < 19) return {extent:5, label:'A little tight in here…', phase:'hold', remaining:19-phase};
  if (phase < 26) return {extent:5+12*smooth((phase-19)/7), label:'Opening back up', phase:'opening', remaining:26-phase};
  return {extent:17, label:'Room to roam', phase:'open', remaining:PERIOD-phase+6};
}
export function createState() {return {x:0,z:6,vx:0,vz:0,jumpY:0,jumpV:0,bumped:false};}
export function tickPlayer(s, dt, time, input, toppings) {
  const magnitude=Math.hypot(input.x,input.z), traction=toppings.some(p=>Math.hypot(s.x-p.x,s.z-p.z)<p.r);
  const friction=s.jumpY>0?.3:traction?5.5:1.1, acceleration=traction?27:11;
  const decay=Math.exp(-friction*dt);
  s.vx=s.vx*decay+input.x/Math.max(1,magnitude)*acceleration*(1-decay)/friction;
  s.vz=s.vz*decay+input.z/Math.max(1,magnitude)*acceleration*(1-decay)/friction;
  const speed=Math.hypot(s.vx,s.vz),limit=8;
  if(speed>limit){s.vx*=limit/speed;s.vz*=limit/speed;}
  s.x+=s.vx*dt;s.z+=s.vz*dt;
  const edge=wallState(time).extent-.75;s.bumped=false;
  for(const [axis,velocity] of [['x','vx'],['z','vz']]) {
    if(Math.abs(s[axis])>edge){const sign=Math.sign(s[axis]);s[axis]=sign*edge;s[velocity]=-sign*Math.max(2,Math.abs(s[velocity])*.5);s.bumped=true;}
  }
  if(s.jumpY>0||s.jumpV>0){s.jumpY+=s.jumpV*dt;s.jumpV-=14*dt;if(s.jumpY<=0){s.jumpY=0;s.jumpV=0;}}
  return traction;
}
export function jump(s){if(s.jumpY===0)s.jumpV=5.8;}
