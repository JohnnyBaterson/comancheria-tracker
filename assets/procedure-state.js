import {developmentAllowedCommands,developmentProcedureIssues} from './development-procedure-machine.js';
import {enemyProcedureIssues} from './enemy-procedure-machine.js';
/** Read-only, serializable interpretation of the active game procedure.
 * These are *derived* stages: no duplicate writable progress flags.
 * Nested effects are reported rather than silently discarded when a
 * higher-priority effect temporarily owns the action window.
 */
const PHASES = new Set(['setup','war','selection','execution','cleanup','gameover']);
const OPERATIONS = new Set(['Take Actions','Culture','Planning','Passage of Time']);
export function procedureState(s){
  const active=[];
  const add=(name,stage,detail={})=>active.push({name,stage:String(stage),...detail});
  if(s.countermeasureWindow)add('war-countermeasure','choice');
  if(s.developmentPending)add('development',s.developmentPending.kind||'resolve',{card:s.developmentPending.number??null,commands:developmentAllowedCommands(s.developmentPending)});
  if(s.battlePending)add('battle','reconcile');
  if(s.battleContinuation)add('battle','continue');
  if(s.warMovement)add('war-movement',s.warMovement.remaining??'moving');
  if(s.enemyFlow)add('enemy-instruction',s.enemyFlow.stage||'resolve',{enemy:s.enemyFlow.enemy||null,kind:s.enemyFlow.kind||null,selectedId:s.enemyFlow.currentId||null});
  if(s.pending)add('raid',s.pending.stage||s.pending.type||'pending');
  if(s.successCheck)add('success-check',s.successCheck.stage||'pending');
  if(s.cleanupCupResult)add('cleanup-cup',s.cleanupCupResult.stage||s.cleanupCupResult.kind||'resolve');
  if(s.cleanupFinishedPending)add('cleanup-finished',s.cleanupFinishedPending.stage||'resolve');
  if(s.rancheriaActivation)add('rancheria-activation',s.rancheriaActivation.stage||'activate');
  if(s.planningRanchTransit)add('rancheria-transit',s.planningStage||'moving');
  if(s.phase==='execution'&&s.operation==='Planning')add('planning',s.planningStage||1);
  if(s.phase==='execution'&&s.operation==='Passage of Time'){
    const next=Array.from({length:15},(_,i)=>`pt${i+1}`).find(key=>!['done','na'].includes(s.steps?.[key]));
    add('passage',next||'complete');
    if(s.passageDevelopment)add('passage-development',s.passageDevelopment.stage||'refill');
    if(s.passageBison)add('passage-bison',s.passageBison.currentTerritory||'select');
  }
  if(s.phase==='cleanup')add('cleanup',Array.from({length:4},(_,i)=>`cl${i+1}`).find(key=>!['done','na'].includes(s.steps?.[key]))||'complete');
  if(s.phase==='war')add('war',Array.from({length:5},(_,i)=>`w${i+1}`).find(key=>!['done','na'].includes(s.steps?.[key]))||'complete');
  const errors=[];
  for(const issue of enemyProcedureIssues(s.enemyFlow))errors.push(issue);
  for(const issue of developmentProcedureIssues(s.developmentPending))errors.push(issue);
  if(!PHASES.has(s.phase))errors.push(`Unknown phase ${s.phase}`);
  if(s.phase==='execution'&&!OPERATIONS.has(s.operation))errors.push(`Unknown operation ${s.operation}`);
  if(s.phase==='gameover'&&!s.gameResult)errors.push('Game over without result');
  // Return addresses are derived from the recorded phase/operation rather
  // than stored as another editable counter. Interruptions are visible in the
  // snapshot; the reducer remains responsible for their actual resolution.
  const root={name:s.phase==='execution'?(s.operation||'execution'):s.phase,
    stage:s.phase==='execution'?(s.operation==='Planning'?String(s.planningStage||1):s.operation==='Passage of Time'?(active.find(x=>x.name==='passage')?.stage||'complete'):'active'):s.phase};
  const owner=active[0]||root;
  const stack=[root];
  for(const entry of [...active].reverse()){
    if(entry===root)continue;
    stack.push({...entry,returnTo:stack.at(-1).name});
  }
  const ordered=active.map((entry,index)=>({...entry,
    status:index===0?'active':'suspended',
    blockedBy:index===0?null:active[0].name}));
  return {phase:s.phase,operation:s.operation||null,period:s.period||null,
    owner,active,stack,ordered,errors};
}
