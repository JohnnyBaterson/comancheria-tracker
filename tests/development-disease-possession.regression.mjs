/** Printed D04/D06/D14: reduce Band strength by 1. If strength falls to zero,
 * normal defeated-Band possession cleanup must not strand held pieces.
 * Midgame possession positions use only existing official scenario counters.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,basicIntegrity,checklist} from '../assets/engine.js';
function oracleDie(seed){let x=seed>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;return {seed:x,face:x%6+1};}
function scenario(){return perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});}
function reveal(s,number){const card=s.cards.find(c=>c.kind==='Development'&&Number(c.identifier)===number);assert(card);s.phase='execution';s.operation='Passage of Time';return perform(s,{type:'DEVELOPMENT_REVEAL',id:card.id});}
function bandAndPossessions(s,{headman=false}={}){
 const band=s.pieces.find(p=>p.id==='setup-band-1');
 band.strength=1; // An eligible midgame strength-1 Band, not a forged counter.
 const horse=s.pieces.find(p=>p.id==='setup-horse-1');horse.location=`held:${band.id}`;
 const chief=s.pieces.find(p=>p.id==='setup-mahimiana-A');
 if(headman)chief.location=`held:${band.id}`;
 return {band,horse,chief};
}
for(const number of [4,14]){
 test(`D${String(number).padStart(2,'0')} Disease: reducing a strength-1 Band returns its carried resource to stock`,()=>{
  const s=scenario(),{band,horse}=bandAndPossessions(s);
  const n=reveal(s,number);
  assert.equal(n.pieces.find(p=>p.id===band.id).location,'reserve');
  assert.equal(n.pieces.find(p=>p.id===band.id).strength,0);
  assert.equal(n.pieces.find(p=>p.id===horse.id).location,'reserve');
  assert.equal(n.cards.find(c=>Number(c.identifier)===number).zone,'Discard');
  assert.ok(basicIntegrity(n));
 });
}
test('D04 Disease: a possessed Mahimiana dies when the carrying Band loses its last strength',()=>{
 const s=scenario(),{band,chief}=bandAndPossessions(s,{headman:true});
 const n=reveal(s,4);
 assert.equal(n.pieces.find(p=>p.id===band.id).location,'reserve');
 assert.equal(n.pieces.find(p=>p.id===chief.id).location,'reserve');
 assert.equal(n.pieces.find(p=>p.id===chief.id).medicine,0);
 assert.ok(basicIntegrity(n));
});
test('D06 Epidemic reveal: six territory dice apply losses in a Ranchería box and clean up a possessed resource',()=>{
 const s=scenario(),{band,horse}=bandAndPossessions(s);
 // Seed 2 produces a first numbered-area result of 1 for Upper Arkansas.
 s.rng.seed=2;
 const n=reveal(s,6);
 assert.equal(n.pieces.find(p=>p.id===band.id).location,'reserve');
 assert.equal(n.pieces.find(p=>p.id===horse.id).location,'reserve');
 assert.equal(n.rng.rolls,6);
 assert.ok(basicIntegrity(n));
});
test('D06 invalid held-counter type is rejected atomically, rather than applying some territory losses',()=>{
 const s=scenario(),{band}=bandAndPossessions(s);s.rng.seed=2;
 // An unsupported held-counter type represents an unresolved physical counter.
 const other=s.pieces.find(p=>p.type==='Tribe');assert(other);
 other.location=`held:${band.id}`;
 const before=structuredClone(s);
 assert.throws(()=>reveal(s,6),/unsupported possessed|Unsupported possessed/);
 assert.deepEqual(s.pieces,before.pieces);
});
test('D06 recurring loss: strength-zero Band cleanup is applied at end of Take Actions',()=>{
 const s=scenario(),{band,horse}=bandAndPossessions(s);
 // Move an existing Band and its real horse to one eligible numbered space.
 band.location='RR-4';s.rng.seed=5;
 s.phase='execution';s.operation='Take Actions';
 const card=s.cards.find(c=>Number(c.identifier)===6);card.zone='In play';
 // Find a seeded result selecting RR-4 (the printed two-die coordinate).
 let seed=1,found=false;
 for(;seed<100000;seed++){
  const a=oracleDie(seed),b=oracleDie(a.seed);
  if(a.face===4&&b.face===4){found=true;break;}
 }
 assert.ok(found);s.rng.seed=seed;
 // No activated Band, and normal end-of-operation checklist complete.
 s.steps=Object.fromEntries(checklist(s).map(([key])=>[key,'done']));
 const n=perform(s,{type:'DEVELOPMENT_EPIDEMIC_END'});
 assert.equal(n.pieces.find(p=>p.id===band.id).location,'reserve');
 assert.equal(n.pieces.find(p=>p.id===horse.id).location,'reserve');
 assert.ok(n.epidemicTakeActionsApplied);
 assert.ok(basicIntegrity(n));
});
