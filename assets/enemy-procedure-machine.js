/** Enemy §6.2.2 procedure state contract. No new persisted shadow state.
 * These transitions only accept progress already committed by the reducer;
 * dice, counter placement and AP calculations remain in engine.js.
 */
export const ENEMY_STAGES=Object.freeze(['choose','payment','effect','done']);
const TRANSITIONS=Object.freeze({
 choose:Object.freeze(['payment','effect']),
 payment:Object.freeze(['effect']),
 effect:Object.freeze(['choose','done']),
 done:Object.freeze([]),
});
export function enemyProcedureIssues(flow){
 if(flow==null)return [];
 const issues=[];
 if(!ENEMY_STAGES.includes(flow.stage))issues.push('Unknown Enemy procedure stage: '+String(flow.stage));
 if(!['paid','free'].includes(flow.kind))issues.push('Unknown Enemy procedure kind: '+String(flow.kind));
 if(!['North','South','East','West'].includes(flow.enemy))issues.push('Unknown Enemy procedure column: '+String(flow.enemy));
 if(['payment','effect'].includes(flow.stage)&&(!flow.currentId||!flow.currentRow))issues.push('Selected Enemy Instruction and display row are required for '+flow.stage+'.');
 if(['choose','done'].includes(flow.stage)&&(flow.currentId||flow.currentRow))issues.push('Unfinished Enemy Instruction remains selected at '+flow.stage+'.');
 if(flow.kind==='free'&&flow.stage==='payment')issues.push('Free Enemy Instruction cannot enter payment.');
 if(flow.kind==='paid'&&flow.stage==='done')issues.push('Paid Enemy Instruction cannot enter free-procedure done stage.');
 return issues;
}
export function advanceEnemyStage(flow,next){
 if(!flow||!TRANSITIONS[flow.stage]?.includes(next))throw new Error('Illegal Enemy procedure transition '+String(flow?.stage)+' → '+String(next));
 if(flow.stage==='choose'&&next!== (flow.kind==='paid'?'payment':'effect'))throw new Error('Enemy procedure cannot skip the prescribed AP payment.');
 if(flow.stage==='effect'&&next!==(flow.kind==='paid'?'choose':'done'))throw new Error('Enemy procedure cannot return to the wrong instruction cycle.');
 const previous=flow.stage;
 flow.stage=next;
 const issues=enemyProcedureIssues(flow);
 if(issues.length){flow.stage=previous;throw new Error(issues.join(' '));}
 return flow;
}
