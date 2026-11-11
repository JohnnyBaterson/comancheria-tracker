/**
 * Rule-based isolated outcome checks for Development I #01 (Apache War).
 * Oracle: original printed card D01, not derived from the engine dispatch list.
 * These represent reachable midgame positions; they are NOT full campaign tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform} from '../assets/engine.js';

function eligibleMidgame(){
  const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
  // Midgame situation: Apache War in play, with a Tribe already carrying three
  // Ravaged counters. Scenario template does not yet track physical Ravaged stock;
  // markers here describe a pre-existing legal game position, NOT supplied stock.
  const tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location==='UA-4');
  assert(tribe);
  const ravaged=[1,2,3].map(n=>({id:`midgame-ravaged-${n}`,type:'Marker',subtype:'Ravaged',label:'Ravaged',location:'UA-4',owner:'Neutral',strength:0}));
  s.pieces.push(...ravaged);
  s.phase='execution';s.operation='Take Actions';s.tracks.movement=4;
  const band=s.pieces.find(p=>p.type==='Band');
  band.location='UA-1';s.activeBandId=band.id;
  return {s,tribeId:tribe.id,markerIds:ravaged.map(p=>p.id)};
}
function assertRemoved(s,tribeId,markerIds){
  assert.equal(s.pieces.find(p=>p.id===tribeId).location,'reserve','§D01 Tribe removed after a completed player action');
  for(const id of markerIds)assert.equal(s.pieces.find(p=>p.id===id).location,'reserve','§D01 Ravaged markers returned to stock');
}
test('D01: completed Band movement triggers removal of Tribe with three Ravaged counters',()=>{
  const {s,tribeId,markerIds}=eligibleMidgame();
  const next=perform(s,{type:'MOVE_BAND',to:'UA-2'});
  assertRemoved(next,tribeId,markerIds);
  assert.equal(next.pieces.find(p=>p.id===s.activeBandId).location,'UA-2');
});
test('D01: completed Ute Alliance card play triggers removal',()=>{
  const {s,tribeId,markerIds}=eligibleMidgame();
  s.cards.find(c=>c.kind==='Development'&&String(c.identifier)==='2').zone='Hand';
  const available=s.pieces.find(p=>p.type==='Tribe'&&p.location==='LA-1');
  const rolled=perform(s,{type:'DEVELOPMENT_PLAY_UTE',choice:'remove'});
  assert.equal(rolled.pieces.find(p=>p.id===tribeId).location,'UA-4','Do not trigger D01 mid-card');
  const next=perform(rolled,{type:'DEVELOPMENT_UTE_RESOLVE',targetId:rolled.developmentUte.die>=3?available.id:''});
  assertRemoved(next,tribeId,markerIds);
  assert.equal(next.cards.find(c=>c.kind==='Development'&&String(c.identifier)==='2').zone,'Discard');
});
test('D01: invalid movement does not remove Tribe or markers',()=>{
  const {s,tribeId,markerIds}=eligibleMidgame();
  assert.throws(()=>perform(s,{type:'MOVE_BAND',to:'RESERVATION'}));
  assert.equal(s.pieces.find(p=>p.id===tribeId).location,'UA-4');
  for(const id of markerIds)assert.equal(s.pieces.find(p=>p.id===id).location,'UA-4');
});
test('D01: a Band action does not remove Tribe below three Ravaged markers',()=>{
  const {s,tribeId,markerIds}=eligibleMidgame();
  s.pieces.find(p=>p.id===markerIds[2]).location='reserve';
  const next=perform(s,{type:'MOVE_BAND',to:'UA-2'});
  assert.equal(next.pieces.find(p=>p.id===tribeId).location,'UA-4');
  for(const id of markerIds.slice(0,2))assert.equal(next.pieces.find(p=>p.id===id).location,'UA-4');
});

test('D01 triggers when D08 Mounted Society finishes, not when its travel begins',()=>{
 const {s,tribeId,markerIds}=eligibleMidgame();
 s.operation='Culture';s.activeBandId=null;
 s.cards.find(c=>c.kind==='Development'&&Number(c.identifier)===8).zone='Hand';
 const started=perform(s,{type:'DEVELOPMENT_PLAY_MOUNTED_SOCIETY'});
 assert.equal(started.pieces.find(p=>p.id===tribeId).location,'UA-4','D08 is still in progress');
 const finished=perform(started,{type:'DEVELOPMENT_MOUNTED_FINISH'});
 assertRemoved(finished,tribeId,markerIds);
});
