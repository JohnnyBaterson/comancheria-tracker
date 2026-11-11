/** Evidence prerequisites for trustworthy digital gameplay. Completeness is
 * necessary but never a substitute for full scenario journeys. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,ENEMY_INSTRUCTION_FRONTS,VERIFIED_ENEMY_COUNTER_BACKS,cardEvidenceAudit,enemyColorNetwork} from '../assets/engine.js';

test('FULLY DIGITAL ENEMY INSTRUCTIONS: every initial counter can execute after a flip without inventing a face',()=>{
 const unverified=[];
 for(const owner of Object.keys(ENEMY_INSTRUCTION_FRONTS))for(const row of 'ABCDEF'){
  const actual=VERIFIED_ENEMY_COUNTER_BACKS[`${owner}:${row}`];
  if(!actual||!actual[0]||!Number.isInteger(actual[1])||actual[1]<=0)unverified.push(`${owner}:${row}`);
 }
 assert.deepEqual(unverified,[],`Incomplete physical counters mean legal Enemy turns halt awaiting transcription: ${unverified.join(', ')}`);
});
test('ENEMY MAP: printed-color routes are sufficiently defined to execute each colonial Enemy from its origins',()=>{
 const state=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 const stops=[];
 for(const enemy of ['West','South','East']){
  const map=enemyColorNetwork(state,enemy);
  if(map.coverageIncomplete||!map.eligibleLinks||!map.reachable.length)stops.push(`${enemy}: ${map.eligibleLinks} verified color edges, coverageIncomplete=${map.coverageIncomplete}`);
 }
 assert.deepEqual(stops,[],`Settle, War and Subjugate cannot make guaranteed correct targets: ${stops.join('; ')}`);
});
test('CARD-DRIVEN GAMEPLAY: all cards used in an official campaign have verified rule evidence',()=>{
 const state=perform(newGame('campaign'),{type:'APPLY_SCENARIO_SETUP',scenario:'campaign'});
 const audit=cardEvidenceAudit(state);
 assert.equal(audit.unverified,0,`${audit.unverified} card records have no verified text/effect evidence; a green unit suite cannot validate actual rules`);
 assert.equal(audit.missingIdentifiers,0,`${audit.missingIdentifiers} cards lack IDs`);
});
