/** A printed board track can resolve a command only when its physical meaning
 * unambiguously identifies ONE reducer-validated current player choice.
 * The marker never auto-selects a Headman or assumes card exceptions absent.
 */
import {perform} from './engine.js';
const TRACK_ACTIONS={
 ap:c=>c.type==='PLANNING_HEADMAN_ACTION'&&c.action==='collect-ap',
 military:c=>c.type==='PLANNING_HEADMAN_ACTION'&&c.action==='convert-military',
 out:c=>c.type==='PLANNING_HEADMAN_ACTION'&&c.action==='return-success'
};
export function printedPlanningTrackChoice(state,track,prompt,selectedHeadmanId=null){
 if(prompt?.kind!=='player'||!Array.isArray(prompt.choices)||!TRACK_ACTIONS[track])return null;
 const selected=selectedHeadmanId?state.pieces.find(p=>p.id===selectedHeadmanId):null;
 if(selected&&selected.type!=='Paraibo')return null;
 const actor=selected?.type==='Paraibo'?selected:null;
 const actorRanchId=actor&&(actor.affiliatedRancheriaId||String(actor.location||'').replace(/^box:/,''));
 const matching=prompt.choices.filter(choice=>TRACK_ACTIONS[track](choice.command||{}))
  .filter(choice=>!actorRanchId||choice.command.rancheriaId===actorRanchId).filter(choice=>{
  try{perform(state,choice.command);return true;}catch{return false;}
 });
 if(matching.length===1)return {ok:true,command:matching[0].command};
 if(matching.length>1)return {ok:false,reason:'More than one Headman can take this action. Choose the Headman on the printed board first.'};
 return null;
}
