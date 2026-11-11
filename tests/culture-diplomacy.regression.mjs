/**
 * Isolated printed-rule regression for Culture C14 (Diplomacy II), sourced
 * from owner's 24 original card-face transcriptions, and the printed physical
 * fronts/backs identified by the GMT Living Playbook. These are legal-position
 * outcome contracts, NOT completed setup or campaign acceptance tests.
 * No expected result is derived from the engine's instruction metadata.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,enemyDisplayAudit} from '../assets/engine.js';

function headmanPosition(row){
 const game=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 // A legal mid-Planning position is isolated deliberately because the full
 // scenario's digital setup is incomplete. These fixture edits do not stand
 // in for a successful real-game journey.
 game.phase='execution';game.operation='Planning';game.planningStage=4;
 game.tracks.culture=3;
 const card=game.cards.find(c=>c.kind==='Culture'&&c.title==='Diplomacy level 2');
 assert(card,'Official physical Culture II card must exist');
 card.zone='In play';card.identifier='C14';
 const ranch=game.pieces.find(p=>p.type==='Rancheria');
 const paraibo=game.pieces.find(p=>p.type==='Paraibo');
 assert(ranch && paraibo,'Official scenario provides Ranchería and Paraibo');
 game.planningHeadman={[ranch.id]:{paraiboId:paraibo.id,allowance:1,spent:0}};
 // West C/D are printed known dual-face counters. Empty upper rows so the
 // chosen counter is actually the topmost instruction in that column.
 for(const p of game.pieces.filter(p=>p.type==='Instruction'&&p.owner==='West')){
  const thisRow=p.location.split(':').at(-1);
  if(thisRow<row)p.location='reserve';
 }
 return {game,ranchId:ranch.id,counter:game.pieces.find(p=>p.id===`setup-instruction-West-${row}`)};
}

for(const {row,front,back} of [
 {row:'C',front:['Settle',4],back:['War',4]},
 {row:'D',front:['War',3],back:['Culture Attack',4]},
]){
 test(`Culture C14 §6.2.2: West ${row} flips actual instruction face, and flips back`,()=>{
  const {game,ranchId,counter}=headmanPosition(row);
  assert.equal(enemyDisplayAudit(game).columns.West.top.id,counter.id);
  assert.equal(counter.subtype,front[0]);assert.equal(counter.strength,front[1]);
  const flipped=perform(game,{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranchId,action:'diplomacy-flip',enemy:'West'});
  const face=flipped.pieces.find(p=>p.id===counter.id);
  assert.equal(face.flipped,true);
  assert.equal(face.subtype,back[0],'The physically printed reverse instruction must execute');
  assert.equal(face.strength,back[1],'The physically printed reverse AP cost must be paid');
  assert.equal(face.faceEvidence,'recorded');
  assert.equal(enemyDisplayAudit(flipped).columns.West.printedCost,back[1]);
  assert.equal(flipped.planningHeadman[ranchId].spent,1,'Headman Action must be consumed');
  assert.equal(game.pieces.find(p=>p.id===counter.id).subtype,front[0],'Reducer must not mutate the input');
  // A new Planning opportunity allows the second flip; it must restore front.
  flipped.planningHeadman[ranchId].spent=0;
  const restored=perform(flipped,{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranchId,action:'diplomacy-flip',enemy:'West'});
  const face2=restored.pieces.find(p=>p.id===counter.id);
  assert.equal(face2.flipped,false);
  assert.deepEqual([face2.subtype,face2.strength],front);
 });
}

test('Culture C14: an unknown reverse is NOT allowed to reuse its front action or AP cost',()=>{
 const {game,ranchId,counter}=headmanPosition('B');
 const result=perform(game,{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranchId,action:'diplomacy-flip',enemy:'West'});
 const p=result.pieces.find(p=>p.id===counter.id);
 assert.equal(p.flipped,true);
 assert.equal(p.subtype,'Unknown');
 assert.equal(p.strength,0);
 assert.equal(p.faceEvidence,'unverified');
 assert.equal(result.planningHeadman[ranchId].spent,1);
});
