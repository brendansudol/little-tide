export const STATIONS={oven:{x:-9,z:-9,name:'Cookie catch'},cake:{x:10,z:0,name:'Cake studio'},treats:{x:8,z:10,name:'Tasting counter'}};
export const DOUGH={x:-10,z:11,r:2.2};
export const FLAVORS=[{name:'Strawberry',color:'#ee9eae'},{name:'Chocolate',color:'#865343'},{name:'Vanilla',color:'#fff0ca'}];
export const TOPPINGS=['Berries','Sprinkles','Candles'];
export const TREATS=['a buttery croissant','a cinnamon swirl','a chocolate-chip cookie','a strawberry doughnut','a berry cupcake'];
export const SOLIDS=[{x:0,z:-11,w:4,d:3},{x:-9,z:-12,w:7,d:4},{x:10,z:0,w:5.6,d:4.8},{x:8,z:10,w:9,d:2.6},{x:9,z:-12.5,w:12,d:3},{x:-16,z:0,w:2,d:10}];
export function createState(){return{x:0,z:12,y:0,yaw:Math.PI,jumpV:0,time:0,bounceCooldown:0,bounces:0,tasted:0,tasteCooldown:0,cakes:0,order:null,displayCake:{flavor:0,topping:0},badges:{cake:false,cookies:false,treats:false},game:null,lastCatch:0,rounds:0,event:''};}
export function nearby(s){return Object.entries(STATIONS).map(([id,p])=>({id,...p,d:Math.hypot(s.x-p.x,s.z-p.z)})).filter(p=>p.d<5.1).sort((a,b)=>a.d-b.d)[0]||null;}
export function jump(s){if(s.y===0)s.jumpV=7;}
export function taste(s){if(nearby(s)?.id!=='treats'||s.game||s.tasteCooldown>0)return false;const treat=TREATS[s.tasted%TREATS.length];s.tasted++;s.tasteCooldown=1.2;s.badges.treats=s.tasted>=5;s.event=`You tried ${treat}. Yum!`;return true;}
export function openOrder(s){if(s.game||nearby(s)?.id!=='cake')return null;s.order={flavor:s.cakes%3,topping:Math.floor(s.cakes/3)%3};return s.order;}
export function serveCake(s,flavor,topping){if(!s.order)return'ignored';if(s.order.flavor!==flavor||s.order.topping!==topping)return'retry';s.displayCake={flavor,topping};s.order=null;s.cakes++;s.badges.cake=true;s.event='Order up! A perfect cake for the bakery window.';return'correct';}
export function startCatch(s){if(s.game||nearby(s)?.id!=='oven')return false;s.game={time:0,spawned:0,resolved:0,caught:0,cookies:[]};s.rounds++;s.x=-8;s.z=1;s.y=s.jumpV=0;s.event='Cookie catch! Stand on the glowing spots. Catch 5 for a badge.';return true;}
export function stopCatch(s){if(!s.game)return;s.lastCatch=s.game.caught;s.game=null;s.event='Back to exploring. The oven is ready whenever you are!';}
export function tick(s,dt,input={x:0,z:0}){
 s.time+=dt;s.event='';s.bounceCooldown=Math.max(0,s.bounceCooldown-dt);s.tasteCooldown=Math.max(0,s.tasteCooldown-dt);
 const len=Math.max(1,Math.hypot(input.x,input.z));s.x+=input.x/len*6.8*dt;s.z+=input.z/len*6.8*dt;
 if(Math.hypot(input.x,input.z)>.1)s.yaw=Math.atan2(input.x,input.z);
 s.x=Math.max(-17.5,Math.min(17.5,s.x));s.z=Math.max(-14,Math.min(15,s.z));
 for(const b of SOLIDS){const dx=s.x-b.x,dz=s.z-b.z,px=b.w/2+.4-Math.abs(dx),pz=b.d/2+.4-Math.abs(dz);if(px>0&&pz>0){if(px<pz)s.x+=Math.sign(dx||1)*px;else s.z+=Math.sign(dz||1)*pz;}}
 if(s.y>0||s.jumpV>0){s.y+=s.jumpV*dt;s.jumpV-=15*dt;if(s.y<0)s.y=s.jumpV=0;}
 if(!s.game&&s.y<.15&&s.bounceCooldown===0&&Math.hypot(s.x-DOUGH.x,s.z-DOUGH.z)<DOUGH.r){s.jumpV=12;s.y=.16;s.bounceCooldown=2;s.bounces++;s.event='Boing! That dough is extra fluffy.';}
 const g=s.game;if(!g)return;g.time+=dt;
 if(g.spawned<10&&g.time>=1+g.spawned*2.8){const lane=[1,0,2,1,2,0,1,0,2,1][g.spawned];g.cookies.push({id:g.spawned++,age:0,x:-12+lane*4,z:1});}
 for(const c of g.cookies){c.age+=dt;if(c.age>=2.4&&!c.done){c.done=true;g.resolved++;if(Math.hypot(s.x-c.x,s.z-c.z)<1.8){g.caught++;s.event='Caught! One warm cookie for you.';}else s.event='Crumbs! Follow the next glowing spot.';}}
 g.cookies=g.cookies.filter(c=>!c.done);
 if(g.resolved===10){s.lastCatch=g.caught;s.badges.cookies ||= g.caught>=5;s.game=null;s.event=g.caught>=5?`Cookie champion! You caught ${g.caught} / 10.`:`You caught ${g.caught} / 10. Try again for 5!`;}
}
export function cookiePosition(c){const u=Math.min(1,c.age/2.4);return{x:-9+(c.x+9)*u,y:3.5+(1.6-3.5)*u+Math.sin(u*Math.PI)*5,z:-10+(c.z+10)*u};}
