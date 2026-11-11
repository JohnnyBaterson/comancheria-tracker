/** Independent player-observable product contracts. These do NOT certify game completion.
 * Do not alter state or fabricate evidence; invoke only the production public API.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,basicIntegrity,SCENARIOS,ENEMY_INSTRUCTION_FRONTS} from '../assets/engine.js';
import {nextPlayerPrompt} from '../assets/next-action.js';

for(const [id,name] of SCENARIOS){
 test(`SCENARIO LOAD: ${name} produces playable official component inventory`,()=>{
  const before=newGame(id);
  assert.equal(before.phase,'setup');
  const s=perform(before,{type:'APPLY_SCENARIO_SETUP',scenario:id});
  assert.equal(s.scenario,id);
  assert.equal(s.setupTemplate,'official');
  assert(basicIntegrity(s),'Official starting state violates core game invariants');
  assert(s.pieces.some(p=>p.type==='Band'),'Scenario has no Band pieces');
  assert(s.pieces.some(p=>p.type==='Instruction'&&p.location.startsWith('enemy-display:')),'Scenario has no Enemy Instruction display');
  assert(s.pieces.some(p=>p.location==='cup'&&p.subtype==='Success'),'Scenario has no Success Check cup');
  assert(s.cards.some(c=>c.kind==='History'),'Scenario has no History cards');
  assert.notDeepEqual(s,before,'Scenario setup had no effect');
 });
 test(`DIGITAL SETUP: ${name} exposes executable next steps, not an empty prompt`,()=>{
  const s=perform(newGame(id),{type:'APPLY_SCENARIO_SETUP',scenario:id});
  const prompt=nextPlayerPrompt(s);
  assert(prompt.kind==='automatic'||(prompt.choices||[]).some(c=>c.command),
   `Setup cannot progress through the player-facing director: ${prompt.title} (${prompt.detail})`);
 });
}

test('ENEMY DISPLAY: each colonial enemy supplies six distinct starting instruction actions',()=>{
 for(const owner of ['West','South','East','North']){
  const rows=ENEMY_INSTRUCTION_FRONTS[owner];
  assert(rows,`Missing enemy ${owner}`);
  for(const label of 'ABCDEF'){
   const front=rows['ABCDEF'.indexOf(label)];
   assert(Array.isArray(front)&&typeof front[0]==='string'&&front[0].length>0&&Number.isInteger(front[1])&&front[1]>0,
     `${owner}:${label} missing a usable front instruction and printed AP cost`);
  }
 }
});
