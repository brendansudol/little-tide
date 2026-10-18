import assert from 'node:assert/strict';
import {FRIENDS,createProgress,makeQuestion,beginQuestion,submitAnswer} from '../dist/math/rules.js';
import {test} from 'node:test';
test('Every topic has correct elementary answers and three unique choices across repeat visits',()=>{
 for(let round=0;round<40;round++)for(let i=0;i<6;i++){
  const q=makeQuestion(i,round),a=2+round%4,b=1+Math.floor(round/4)%4;
  assert.equal(q.answer,[a+b,a+b,a,(a+3)*2,a*2,a][i]);
  assert.equal(new Set(q.options).size,3);assert.ok(q.options.includes(q.answer));assert.ok(q.options.every(n=>Number.isInteger(n)&&n>=0));assert.ok(q.hint);
 }
});
test('Wrong answers can be retried without lost progress; a question awards only once',()=>{
 const s=createProgress(),q=beginQuestion(s,0);assert.equal(submitAnswer(s,-99).status,'ignored');
 assert.equal(submitAnswer(s,q.options.find(n=>n!==q.answer)).status,'retry');assert.equal(s.stars,0);
 assert.equal(submitAnswer(s,q.answer).first,true);assert.equal(s.stars,1);
 assert.equal(submitAnswer(s,q.answer).status,'ignored');assert.equal(s.stars,1);assert.equal(s.rounds[0],1);
});
test('All six keepsakes can be collected and revisits award stars without duplicating prizes',()=>{
 const s=createProgress();for(let i=0;i<FRIENDS.length;i++){const q=beginQuestion(s,i),r=submitAnswer(s,q.answer);assert.equal(r.first,true);assert.equal(r.complete,i===5);}
 assert.equal(s.stars,6);const q=beginQuestion(s,0);assert.notEqual(q.id,'0:0');const r=submitAnswer(s,q.answer);assert.equal(r.first,false);assert.equal(s.stars,7);assert.equal(s.rounds.filter(n=>n>0).length,6);
});
test('Leaving an unfinished puzzle earns nothing and preserves the puzzle for another try',()=>{
 const s=createProgress(),q=beginQuestion(s,2);s.active=null;assert.equal(submitAnswer(s,q.answer).status,'ignored');assert.deepEqual(beginQuestion(s,2),q);assert.equal(s.stars,0);
});
