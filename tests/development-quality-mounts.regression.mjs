/** Printed Development I D16 + D09 contracts (isolated reachable midgame positions).
 * Tests assert actual bonus-MP consumption and card fate, not code snapshots.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,basicIntegrity} from '../assets/engine.js';
const start=(mp=0)=>{
 const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 s.phase='execution';s.operation='Take Actions';
 const band=s.pieces.find(p=>p.type==='Band'&&p.location==='box:setup-ranch-A');assert(band);
 // Isolated midgame positioning: a legitimate scenario Band has left its Ranchería.
 band.location='UA-2';
 s.activeBandId=band.id;s.tracks.movement=mp;
 for(const id of ['16','09']){const c=s.cards.find(c=>c.kind==='Development'&&Number(c.identifier)===Number(id));assert(c);c.zone='Hand';}
 s.rng.seed=1;
 return {s,band};
};
const card=(s,n)=>s.cards.find(c=>c.kind==='Development'&&Number(c.identifier)===n);
test('D16 granted but unspent MP do not count toward discard threshold',()=>{
 const {s}=start(0);
 const boosted=perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:6});
 assert.equal(boosted.tracks.movement,6);
 const pending=perform(boosted,{type:'FINISH_BAND'});
 assert.equal(pending.qualityMountsPending.bonusUsed,0);
 assert.equal(card(pending,16).zone,'Hand');
 const done=perform(pending,{type:'DEVELOPMENT_QUALITY_MOUNTS_RESOLVE'});
 assert.equal(card(done,16).zone,'Hand');assert.equal(done.qualityMountsPending,null);
 assert.ok(basicIntegrity(done));
});
test('D16 partial use: actual paid movement sets the discard threshold, not full award',()=>{
 const {s}=start(0);
 const boosted=perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:6});
 const moved=perform(boosted,{type:'MOVE_BAND',to:'UA-4'});
 const pending=perform(moved,{type:'FINISH_BAND'});
 assert.equal(pending.qualityMountsPending.bonusUsed,2);
 assert.equal(pending.qualityMountsPending.bonus,6);
 assert.ok(basicIntegrity(pending));
});
test('D16 movement funded before the bonus is spent first; only excess consumes bonus',()=>{
 const {s}=start(4);
 const boosted=perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:5});
 const moved=perform(boosted,{type:'MOVE_BAND',to:'UA-4'});
 const pending=perform(moved,{type:'FINISH_BAND'});
 assert.equal(pending.qualityMountsPending.bonusUsed,0);
});
test('D09 cancels D16 pending die before result, then replacement governs card fate',()=>{
 const {s}=start(0);s.rng.seed=1;
 const pending=perform(perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:6}),{type:'FINISH_BAND'});
 const rerolled=perform(pending,{type:'DEVELOPMENT_COUNTING_COUP_MOUNTS_REROLL'});
 assert.equal(card(rerolled,9).zone,'Discard');assert.equal(rerolled.qualityMountsPending.rerolled,true);
 assert.equal(rerolled.rng.rolls,2);
 assert.throws(()=>perform(rerolled,{type:'DEVELOPMENT_COUNTING_COUP_MOUNTS_REROLL'}),/eligible unresolved/);
 const done=perform(rerolled,{type:'DEVELOPMENT_QUALITY_MOUNTS_RESOLVE'});
 assert.equal(card(done,16).zone,'Hand');assert.equal(card(done,9).zone,'Discard');
 assert.throws(()=>perform(done,{type:'DEVELOPMENT_COUNTING_COUP_MOUNTS_REROLL'}),/unresolved Quality Mounts/);
 assert.ok(basicIntegrity(done));
});
test('D16 staged die blocks other actions, rejects invalid cards and tampered saves',()=>{
 const {s}=start(0);const pending=perform(perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:6}),{type:'FINISH_BAND'});
 assert.throws(()=>perform(pending,{type:'TRACK',field:'culture',value:6}),/Quality Mounts finish/);
 const broken=structuredClone(pending);broken.qualityMountsPending.bonusUsed=7;
 assert.throws(()=>basicIntegrity(broken),/Quality Mounts finish die/);
 assert.ok(basicIntegrity(pending));
});
test('D15 cannot execute without Planning step 4 even if legacy planning stage is absent',()=>{
 const {s}=start();s.operation='Planning';s.planningStage=null;
 card(s,15).zone='Hand';
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_PLAY_NEGOTIATION',warId:'missing'}),/Planning step 4/);
});
test('D16 die 4 retains card when 2 of 6 bonus MPs used; would fail under old awarded-MP threshold',()=>{
 const {s}=start(4);s.rng.seed=1;
 let n=perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:6});
 n=perform(n,{type:'MOVE_BAND',to:'UA-4'});
 n=perform(n,{type:'MOVE_BAND',to:'UA-2'});
 n=perform(n,{type:'MOVE_BAND',to:'UA-4'});
 const rolled=perform(n,{type:'FINISH_BAND'});
 assert.equal(rolled.qualityMountsPending.bonusUsed,2);
 assert.equal(rolled.qualityMountsPending.die,4);
 const result=perform(rolled,{type:'DEVELOPMENT_QUALITY_MOUNTS_RESOLVE'});
 assert.equal(card(result,16).zone,'Hand');
 assert.ok(basicIntegrity(result));
});
test('D16 die 4 discards card if all 6 awarded MPs were actually used',()=>{
 const {s}=start(0);s.rng.seed=1;
 let n=perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:6});
 n=perform(n,{type:'MOVE_BAND',to:'UA-4'});
 n=perform(n,{type:'MOVE_BAND',to:'UA-2'});
 n=perform(n,{type:'MOVE_BAND',to:'UA-4'});
 const rolled=perform(n,{type:'FINISH_BAND'});
 assert.equal(rolled.qualityMountsPending.bonusUsed,6);
 assert.equal(rolled.qualityMountsPending.die,4);
 const result=perform(rolled,{type:'DEVELOPMENT_QUALITY_MOUNTS_RESOLVE'});
 assert.equal(card(result,16).zone,'Discard');
});
test('D16 bonus usage remains correct when Band later gains MP from spending a Horse',()=>{
 const {s,band}=start(0);
 const horse=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location==='box:setup-ranch-A');assert(horse);
 horse.location=`held:${band.id}`;
 let n=perform(s,{type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:6});
 n=perform(n,{type:'MOVE_BAND',to:'UA-4'});
 // A Horse owned by the Band adds one ordinary MP after Quality Mounts was granted.
 n=perform(n,{type:'SPEND_HORSE'});
 const pending=perform(n,{type:'FINISH_BAND'});
 assert.equal(pending.qualityMountsPending.bonusUsed,1,'Later +1 MP must not erase already used card bonus');
 assert.ok(basicIntegrity(pending));
});
