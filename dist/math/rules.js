export const FRIENDS=[
 {n:1,name:'Pip',topic:'Counting',color:'#ffad40',x:-8,z:9,prize:'Pocket star',icon:'★'},
 {n:2,name:'Sunny',topic:'Addition',color:'#f7839d',x:8,z:9,prize:'Happy balloon',icon:'●'},
 {n:3,name:'Sprout',topic:'Subtraction',color:'#64b9a1',x:15,z:-3,prize:'Daisy buddy',icon:'✿'},
 {n:4,name:'Loop',topic:'Patterns',color:'#9b8cdd',x:8,z:-15,prize:'Tiny rocket',icon:'↑'},
 {n:5,name:'Dot',topic:'Equal groups',color:'#6dbce0',x:-8,z:-15,prize:'Number crown',icon:'♛'},
 {n:6,name:'Clover',topic:'Fair sharing',color:'#e9a65d',x:-15,z:-3,prize:'Little rainbow',icon:'⌒'}
];
export function createProgress(){return{rounds:[0,0,0,0,0,0],stars:0,active:null};}
export function makeQuestion(index,round=0){
 if(!Number.isInteger(index)||index<0||index>=FRIENDS.length)throw new Error('Unknown number friend');
 const a=2+round%4,b=1+Math.floor(round/4)%4;
 let prompt,answer,hint,visual;
 switch(index){
 case 0:answer=a+b;prompt='How many stars can you count?';visual=Array(answer).fill('★').join(' ');hint='Touch each star with your eyes and count: 1, 2, 3…';break;
 case 1:answer=a+b;prompt=`${a} + ${b} = ?`;visual=`${'● '.repeat(a)} + ${'● '.repeat(b)}`;hint=`Start at ${a}, then count ${b} more.`;break;
 case 2:answer=a;prompt=`${a+b} − ${b} = ?`;visual=`${a+b} apples. Take away ${b}.`;hint=`Count back ${b} from ${a+b}. How many are left?`;break;
 case 3:answer=(a+3)*2;prompt=`${a*2}, ${(a+1)*2}, ${(a+2)*2}, ?`;visual='Follow the number stepping stones';hint='Each number gets 2 bigger. Add 2 to the last number.';break;
 case 4:answer=a*2;prompt=`${a} groups of 2. How many altogether?`;visual=Array(a).fill('(● ●)').join('  ');hint=`Count by twos ${a} times, or count every dot.`;break;
 case 5:answer=a;prompt=`Share ${a*2} cookies equally between 2 friends. How many each?`;visual=`${'● '.repeat(a*2)}`;hint='Give one to each friend, then another to each. Keep taking turns.';break;
 }
 const options=[answer,answer+1,Math.max(0,answer-1)];
 // Rotate the answer position so it is not always the first button.
 const shift=(round+index)%3;for(let i=0;i<shift;i++)options.push(options.shift());
 return{id:`${index}:${round}`,index,prompt,answer,hint,visual,options,solved:false};
}
export function beginQuestion(progress,index){progress.active=makeQuestion(index,progress.rounds[index]);return progress.active;}
export function submitAnswer(progress,value){
 const q=progress.active;if(!q||q.solved||!q.options.includes(value))return{status:'ignored'};
 if(value!==q.answer)return{status:'retry',hint:q.hint};
 q.solved=true;const first=progress.rounds[q.index]===0;progress.rounds[q.index]++;progress.stars++;
 return{status:'correct',first,friend:FRIENDS[q.index],complete:progress.rounds.every(n=>n>0)};
}
