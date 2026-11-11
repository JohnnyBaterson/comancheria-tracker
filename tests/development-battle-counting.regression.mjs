/** GMT D09: cancel a single die roll before its outcome is applied.
 * An authentic scenario Band and War Column are positioned in a disclosed,
 * eligible midgame Battle space. No new physical counters are fabricated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,basicIntegrity} from '../assets/engine.js';
function prepare(seed=2){
 const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 const b=s.pieces.find(p=>p.id==='setup-band-1'),w=s.pieces.find(p=>p.type==='War Column');
 b.location='UA-2';w.location='UA-2';w.strength=3;
 s.phase='war';s.operation=null;s.rng.seed=seed;
 s.cards.find(c=>c.kind==='Development'&&Number(c.identifier)===9).zone='Hand';
 return {s,b,w};
}
function oracle(seed){let x=seed>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;return {face:x%6+1,seed:x};}
test('D09 Battle: only the chosen unresolved die is replaced, changing the rules-based outcome',()=>{
 const {s,b,w}=prepare(1);
 const pending=perform(s,{type:'BATTLE_ROLL',warId:w.id,unitId:b.id,dice:[1],warDrm:2,ack:true});
 assert.equal(pending.battlePending.won,false);
 const replacement=oracle(pending.rng.seed);
 const result=perform(pending,{type:'DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL',dieIndex:0});
 assert.equal(result.battlePending.dice[0],replacement.face);
 assert.equal(result.battlePending.natural,replacement.face);
 assert.equal(result.battlePending.won,replacement.face===6||(replacement.face!==1&&replacement.face+2-2>=6));
 assert.equal(result.rng.rolls,pending.rng.rolls+1);
 assert.equal(result.cards.find(c=>Number(c.identifier)===9).zone,'Discard');
 assert.equal(result.pieces.find(p=>p.id===b.id).strength,2,'No Battle loss committed before reconciliation');
 assert.ok(basicIntegrity(result));
 assert.throws(()=>perform(result,{type:'DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL',dieIndex:0}),/already been rerolled|held Counting Coup/);
});
test('D09 Battle cannot replace nonexistent die and does not consume card on rejection',()=>{
 const {s,b,w}=prepare();const pending=perform(s,{type:'BATTLE_ROLL',warId:w.id,unitId:b.id,dice:[3],warDrm:2,ack:true});
 assert.throws(()=>perform(pending,{type:'DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL',dieIndex:1}),/Choose one/);
 assert.equal(pending.cards.find(c=>Number(c.identifier)===9).zone,'Hand');
 assert.equal(pending.battlePending.dice[0],3);
});
test('D09 Battle cannot be played after Battle result has been resolved',()=>{
 const {s,b,w}=prepare();const pending=perform(s,{type:'BATTLE_ROLL',warId:w.id,unitId:b.id,dice:[3],warDrm:2,ack:true});
 const done=perform(pending,{type:'BATTLE_AUTO_RECONCILE'});
 assert.throws(()=>perform(done,{type:'DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL',dieIndex:0}),/unresolved Battle|A held Counting Coup|ongoing Battle|requires another round/);
});
test('Saved Battle cannot claim a Counting Coup reroll without the actual discarded card and replacement die',()=>{
 const {s,b,w}=prepare(1);
 const pending=perform(s,{type:'BATTLE_ROLL',warId:w.id,unitId:b.id,dice:[1],warDrm:2,ack:true});
 const rerolled=perform(pending,{type:'DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL',dieIndex:0});
 const tampered=structuredClone(rerolled);tampered.battlePending.countingCoupReroll.replacement=9;
 assert.throws(()=>basicIntegrity(tampered),/Counting Coup Battle reroll/);
 const revived=structuredClone(rerolled);revived.cards.find(c=>Number(c.identifier)===9).zone='Hand';
 assert.throws(()=>basicIntegrity(revived),/Counting Coup Battle reroll/);
});
