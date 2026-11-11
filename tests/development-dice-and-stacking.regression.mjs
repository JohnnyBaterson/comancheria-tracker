/** Independent printed-effect oracles: D02, D06 and D01 (GMT Development I).
 * These tests judge rules-derived state outcomes and digital dice, not a snapshot
 * of implementation internals. Scenario midgame positioning is disclosed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,checklist,basicIntegrity} from '../assets/engine.js';
const opening=()=>perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
const dev=(s,n)=>s.cards.find(c=>c.kind==='Development'&&Number(c.identifier)===n);
function oracleDie(seed){
 let x=seed>>>0; x^=x<<13;x^=x>>>17;x^=x<<5; x>>>=0;
 return {seed:x,face:x%6+1};
}
function prepD02(seed){const s=opening();s.phase='execution';s.operation='Take Actions';s.rng.seed=seed;dev(s,2).zone='Hand';return s;}
test('D02 digital removal, 1–2: no piece removed, card consumed, exactly one die used',()=>{
 const s=prepD02(2),tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location==='LA-1');
 assert.equal(oracleDie(2).face,1);
 const before=s.rng.rolls,n=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove',targetId:tribe.id});
 assert.equal(n.pieces.find(p=>p.id===tribe.id).location,'LA-1');
 assert.equal(n.developmentUte.die,1);assert.equal(n.rng.rolls,before+1);assert.equal(dev(n,2).zone,'Discard');
 const finished=perform(n,{type:'DEVELOPMENT_UTE_RESOLVE'});assert.equal(finished.developmentUte,null);
 assert.ok(basicIntegrity(finished));
});
test('D02 digital removal, 3–6: selected real Tribe returned to reserve',()=>{
 const s=prepD02(1),tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location==='LA-1');
 assert.equal(oracleDie(1).face,4);
 const rolled=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
 assert.equal(rolled.developmentUte.die,4);assert.equal(rolled.pieces.find(p=>p.id===tribe.id).location,'LA-1');
 const n=perform(rolled,{type:'DEVELOPMENT_UTE_RESOLVE',targetId:tribe.id});
 assert.equal(n.pieces.find(p=>p.id===tribe.id).location,'reserve');
 assert.equal(dev(n,2).zone,'Discard');assert.ok(basicIntegrity(n));
});
test('D02 player-supplied die cannot force a printed 3–6 success',()=>{
 const s=prepD02(2),tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location==='LA-1');
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove',die:6}),/digital die/);
 assert.equal(dev(s,2).zone,'Hand');assert.equal(tribe.location,'LA-1');
});
test('D02 Band placement respects all printed stacking-restricted pieces',()=>{
 const s=prepD02(42);
 // Isolated legal midgame case: use an actual scenario Band counter now 3-strength
 // and returned to available stock; no invented counter is added.
 const stock=s.pieces.find(p=>p.type==='Band');assert(stock);stock.strength=3;stock.location='reserve';
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'band',space:'LA-1'}),/stacking/);
 assert.equal(stock.location,'reserve');assert.equal(dev(s,2).zone,'Hand');
 const n=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'band',space:'UA-2'});
 assert.equal(n.pieces.find(p=>p.id===stock.id).location,'UA-2');
 assert.equal(dev(n,2).zone,'Discard');assert.ok(basicIntegrity(n));
});
test('D06 reveal: one physical numbered-area die in each of six territories',()=>{
 const seed=1234,s=opening();s.phase='execution';s.operation='Passage of Time';s.rng.seed=seed;
 const expected=[],rolls=[];let x=seed;
 for(const t of ['UA','LA','LE','RR','RG','BC']){const roll=oracleDie(x);x=roll.seed;rolls.push(roll.face);expected.push(`${t}-${roll.face}`);}
 const n=perform(s,{type:'DEVELOPMENT_REVEAL',id:dev(s,6).id});
 assert.equal(n.rng.rolls,6);assert.equal(n.rng.seed,x);
 assert.ok(n.log[0].description.includes(`dice ${rolls.join(', ')}`));
 assert.ok(n.log[0].description.includes(`map spaces ${expected.join(', ')}`));
 // The two starting Tribes in these particular die-selected spaces are removed.
 for(const loc of expected){assert.equal(n.pieces.some(p=>p.type==='Tribe'&&p.location===loc),false);}
 assert.ok(basicIntegrity(n));
});
test('D06 recurring effect: territory die then numbered-area die, not seed modulo 36',()=>{
 const seed=42,s=opening();s.phase='execution';s.operation='Take Actions';s.rng.seed=seed;dev(s,6).zone='In play';
 s.steps=Object.fromEntries(checklist(s).map(([key])=>[key,'done']));
 const first=oracleDie(seed),second=oracleDie(first.seed);const loc=['UA','LA','LE','RR','RG','BC'][first.face-1]+'-'+second.face;
 const tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location===loc);
 const n=perform(s,{type:'DEVELOPMENT_EPIDEMIC_END'});
 assert.equal(n.rng.rolls,2);assert.equal(n.rng.seed,second.seed);
 assert.ok(n.log[0].description.includes(`dice ${first.face}, ${second.face}; map spaces ${loc}`));
 if(tribe)assert.equal(n.pieces.find(p=>p.id===tribe.id).location,'reserve');
 assert.ok(basicIntegrity(n));
});
test('D02 resolution is atomic: no unrelated action may run while its die outcome is pending',()=>{
 const s=prepD02(1),rolled=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
 assert.equal(rolled.developmentUte.die,4);
 assert.throws(()=>perform(rolled,{type:'TRACK',field:'culture',value:7}),/Ute Alliance die/);
 assert.throws(()=>perform(rolled,{type:'DEVELOPMENT_UTE_RESOLVE',targetId:'not-a-piece'}),/Tribe or Settlement/);
 assert.equal(rolled.pieces.find(p=>p.type==='Tribe'&&p.location==='LA-1').location,'LA-1');
 assert.equal(rolled.developmentUte.die,4);
 assert.ok(basicIntegrity(rolled));
});
test('D02 3–6 may decline optional removal without removing any counters',()=>{
 const s=prepD02(1),tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location==='LA-1');
 const rolled=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
 const n=perform(rolled,{type:'DEVELOPMENT_UTE_RESOLVE'});
 assert.equal(n.developmentUte,null);assert.equal(n.pieces.find(p=>p.id===tribe.id).location,'LA-1');
 assert.ok(basicIntegrity(n));
});
test('D09 cancels an uncommitted D02 die; fresh seeded result supersedes first',()=>{
 const s=prepD02(1);dev(s,9).zone='Hand';
 const first=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
 const roll=oracleDie(first.rng.seed);
 const n=perform(first,{type:'DEVELOPMENT_COUNTING_COUP_UTE_REROLL'});
 assert.equal(n.developmentUte.die,roll.face);assert.equal(n.rng.seed,roll.seed);
 assert.equal(n.rng.rolls,2);assert.equal(dev(n,9).zone,'Discard');
 assert.equal(dev(n,2).zone,'Discard');assert.equal(n.developmentUte.rerolled,true);
 assert.ok(basicIntegrity(n));
 assert.throws(()=>perform(n,{type:'DEVELOPMENT_COUNTING_COUP_UTE_REROLL'}),/eligible unresolved/);
});
test('D09 cannot retroactively reroll D02 after resolution',()=>{
 const s=prepD02(1);dev(s,9).zone='Hand';
 const first=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
 const finished=perform(first,{type:'DEVELOPMENT_UTE_RESOLVE'});
 assert.throws(()=>perform(finished,{type:'DEVELOPMENT_COUNTING_COUP_UTE_REROLL'}),/unresolved Ute Alliance/);
 assert.equal(dev(finished,9).zone,'Hand');
});
test('Saved Ute Alliance state rejects a tampered die or resurrected played card',()=>{
 const s=prepD02(1),first=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
 assert.ok(basicIntegrity(first));
 const altered=structuredClone(first);altered.developmentUte.die=8;
 assert.throws(()=>basicIntegrity(altered),/Ute Alliance/);
 const resurrected=structuredClone(first);dev(resurrected,2).zone='Hand';
 assert.throws(()=>basicIntegrity(resurrected),/Ute Alliance/);
});
test('D02 removal returns the target’s Ravaged markers to stock, never leaving orphaned damage',()=>{
 const s=prepD02(1);
 const target=s.pieces.find(p=>p.type==='Tribe'&&p.location==='LA-1');assert(target);
 // Midgame piece position: use an explicitly recorded physical Ravaged marker.
 const ravaged={id:'recorded-ravaged-for-ute',type:'Marker',subtype:'Ravaged',label:'Ravaged',location:target.location};
 s.pieces.push(ravaged);
 const rolled=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
 const done=perform(rolled,{type:'DEVELOPMENT_UTE_RESOLVE',targetId:target.id});
 assert.equal(done.pieces.find(p=>p.id===target.id).location,'reserve');
 assert.equal(done.pieces.find(p=>p.id===ravaged.id).location,'reserve');
 assert.ok(basicIntegrity(done));
});
