/** Product acceptance: all transitions go through the same public reducer and
 * player-facing director as the app. No private state assignments, fabricated
 * pieces, manual source attestations, fabricated dice, or forced game results.
 * Failure is an actionable feature gap, not a success for refusing to play.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, perform, basicIntegrity, SCENARIOS} from '../assets/engine.js';
import {nextPlayerPrompt, standInChoice} from '../assets/next-action.js';

const MAX_ACTIONS=10000;
const LEGAL_ENDINGS=new Set(['victory','defeat']);
const FORBIDDEN=new Set([
  'CONFIRM_SETUP','SETUP_CONFIRM_BAND_RATINGS','ENEMY_VERIFY_FACE',
  'DEVELOPMENT_CONFIRM_EFFECT','DEVELOPMENT_REGISTER_PHYSICAL_STOCK',
  'DEVELOPMENT_REGISTER_TEXAS_STOCK','RECORD_PIECE','ADJUST_TRACK',
  'RESOLVE_VICTORY','RESOLVE_VICTORY_FROM_LEDGER',
]);
function describe(s,p,executed){return JSON.stringify({scenario:s.scenario,phase:s.phase,operation:s.operation,period:s.period,actions:executed.length,kind:p?.kind,title:p?.title,detail:p?.detail?.slice(0,220),available:(p?.choices||[]).map(c=>c.command?.type).slice(0,15)},null,2);}

/** Policy only chooses from choices actually exposed by the live director.
 * Alternate strategies may be tried, but no board-only claims are admitted.
 */
function choose(s,p,policy){
  if(p.kind==='automatic')return p.command;
  const options=(p.choices||[]).map(x=>x.command).filter(Boolean);
  if(!options.length)return null;
  const safe=options.filter(c=>!FORBIDDEN.has(c.type)&&!c.ack&&!c.objectiveNote&&!c.verifiedByPlayer);
  if(!safe.length)return null;
  if(s.phase==='selection'){
    const name=policy==='culture'?'Culture':policy==='planning'?'Planning':policy==='actions'?'Take Actions':'Passage of Time';
    const proposed=standInChoice(s,p);
    return safe.find(c=>c.value===name)||(proposed&&safe.some(c=>JSON.stringify(c)===JSON.stringify(proposed))?proposed:null)||safe[0];
  }
  const proposed=standInChoice(s,p);
  return (proposed&&safe.some(c=>JSON.stringify(c)===JSON.stringify(proposed))?proposed:null)||safe.find(c=>/^(PASSAGE_|CULTURE_|PLANNING_HEADMAN_FINISH|PLANNING_FINISH|FINISH_BAND|OPERATIONS_)/.test(c.type))||safe[0];
}
export function travel(id,policy='balanced',limit=MAX_ACTIONS){
  let state=newGame(id),actions=[],milestones=new Set(['new-game']);
  state=perform(state,{type:'APPLY_SCENARIO_SETUP',scenario:id});
  milestones.add('scenario-loaded');
  assert(basicIntegrity(state),`${id}: official scenario setup must preserve board integrity`);
  for(let i=0;i<limit;i++){
    if(state.phase==='gameover'){
      const result=state.gameResult;
      assert(LEGAL_ENDINGS.has(result?.outcome),`${id}: gameover lacks rules-based victory/defeat`);
      assert(result?.reason,`${id}: ending has no rules explanation`);
      return {state,actions,milestones};
    }
    const prompt=nextPlayerPrompt(state);
    const command=choose(state,prompt,policy);
    if(!command)throw new Error(`DIGITAL GAME BLOCKED (no legal complete player action): ${describe(state,prompt,actions)}`);
    if(FORBIDDEN.has(command.type)||command.ack||command.objectiveNote)throw new Error(`DIGITAL GAME REQUIRES UNVERIFIED MANUAL OVERRIDE ${command.type}: ${describe(state,prompt,actions)}`);
    const previous=state;
    try{state=perform(state,command);}catch(error){throw new Error(`PUBLIC PLAYER ACTION REJECTED ${command.type}: ${error.message}\n${describe(previous,prompt,actions)}`);}
    assert(basicIntegrity(state),`${id}: corrupt state following ${command.type}`);
    assert.notDeepEqual(state,previous,`${id}: action ${command.type} made no progress`);
    actions.push(command.type);
    if(previous.phase==='setup'&&state.phase!=='setup')milestones.add('started-playing');
    if(state.phase==='selection')milestones.add('operation-selection');
    if(state.phase==='execution')milestones.add('operation-execution');
    if(state.phase==='cleanup')milestones.add('cleanup');
    if(state.phase==='war')milestones.add('war-phase');
    if(state.period>previous.period)milestones.add('history-advanced');
    if(state.enemyFlow||command.type.startsWith('ENEMY_'))milestones.add('enemy-instruction');
  }
  throw new Error(`${id}: looped through ${limit} actions without rules-derived ending (policy=${policy}, milestones=${[...milestones]})`);
}

for(const [id,name] of SCENARIOS){
  test(`RELEASE: ${name} starts from fresh game and finishes with rules-derived victory/defeat`,()=>{
    const result=travel(id,'balanced');
    assert(result.milestones.has('started-playing'),'Never entered the playable board');
    assert(result.milestones.has('operation-execution'),'Never executed a player operation');
    assert(result.milestones.has('enemy-instruction'),'Never resolved an Enemy Instruction');
    assert(result.milestones.has('history-advanced'),'Never advanced History');
    assert(result.actions.length>0,'No real player actions');
  });
}
// Separate player strategies catch a game that happens to progress with one
// scripted choice but fails when a normal user selects another operation.
for(const policy of ['culture','planning','actions']){
  test(`RELEASE: full campaign remains playable under ${policy} player strategy`,()=>{
    const result=travel('campaign',policy);
    assert.equal(result.state.phase,'gameover');
    assert(result.milestones.has('operation-execution'));
  });
}
