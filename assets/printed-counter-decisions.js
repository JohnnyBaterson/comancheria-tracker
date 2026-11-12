/** Match a printed counter to the current, reducer-validated physical choice.
 * Never translate a generic click into arbitrary relocation. A counter alone
 * cannot choose between different legal destinations or different operations.
 */
import {perform,SPACE} from './engine.js';

const SAME_COUNTER_ACTIONS={
  PASSAGE_CREATE_RANCHERIA:['bandId','rancheriaId'],
  PASSAGE_RECRUIT_BAND:['rancheriaId','bandId'],
  PASSAGE_STRENGTHEN_BAND:['bandId'],
  BATTLE_SAFE_START:['unitId'],
  BATTLE_SAFE_ROUND:['unitId'],
  DEVELOPMENT_BUFFALO_RESOLVE:['bisonId'],
  DEVELOPMENT_RESOLVE_MEDICINE:['mahimianaId'],
  DEVELOPMENT_RESOLVE_SMALLPOX:['bandId'],
  RAID_CUP_CHOOSE_ALLY:['tribeId'],
  CLEANUP_CUP_CHOOSE_ALLY:['tribeId'],
  ENEMY_ALLY:['tribeId'],
  CLEANUP_ABSORB_BAND:['bandId','rancheriaId'],
  CLEANUP_RELINQUISH:['pieceId','bandId'],
  RANCHERIA_BAND_TAKE_COUNTER:['counterId'],
  PLANNING_DANCE:['mahimianaId'],
};
const POSITION_REQUIRED=new Set([
  'PLANNING_MOVE_RANCHERIA','CULTURE_POLITICS_MOVE_ALLY',
  'CULTURE_WAR_EVADE','DEVELOPMENT_NUEVO_APACHERIA',
  'DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT','ENEMY_SETTLE',
  'CLEANUP_TRAIL_PLACE'
]);
export function printedCounterChoices(state,id,prompt){
  if(prompt?.kind!=='player'||!Array.isArray(prompt.choices))return [];
  const piece=state.pieces.find(p=>p.id===id);
  if(!piece)return [];
  return prompt.choices.flatMap(choice=>{
    const command=choice.command;
    if(!command||POSITION_REQUIRED.has(command.type))return [];
    const fields=SAME_COUNTER_ACTIONS[command.type];
    if(!fields||!fields.some(field=>command[field]===id))return [];
    // The Band/Tribe/Rancheria must really be the printed object being selected.
    if(piece.location==='removed'||piece.location==='out-of-play')return [];
    try{perform(state,command);return [{label:choice.label,command}];}catch{return [];}
  });
}
export function printedCounterChoice(state,id,prompt){
  const choices=printedCounterChoices(state,id,prompt);
  return choices.length===1?{ok:true,command:choices[0].command}:choices.length>1?{ok:false,reason:'This counter has several valid actions; choose the exact one.'}:null;
}
/** Horse-discard cards: touch the physical horse counters one at a time. */
export function printedHorseDiscardSelection(state,pieceId,selected=[]){
  const p=state.developmentPending;
  if(p?.kind!=='horse-discard'||!Array.isArray(p.horseIds)||!p.horseIds.includes(pieceId))return null;
  const chosen=selected.filter(id=>p.horseIds.includes(id));
  const next=chosen.includes(pieceId)?chosen.filter(id=>id!==pieceId):[...chosen,pieceId];
  if(next.length>p.required)return {ok:false,reason:'All required Horses are already selected.'};
  if(next.length===p.required){
    const command={type:'DEVELOPMENT_RESOLVE_HORSE_DISCARD',horseIds:next};
    try{perform(state,command);return {ok:true,selected:next,command};}
    catch(error){return {ok:false,reason:String(error?.message||error)};}
  }
  return {ok:true,selected:next};
}

/** Epidemic asks the human to choose one Band at each contested printed map
 * space. Selection is kept in transient view state; only the full, exact
 * reducer-validated allocation may change the game. No combination is guessed.
 */
export function printedEpidemicBandSelection(state,bandId,chosen={},prompt){
 if(state.developmentPending?.kind!=='epidemic'||prompt?.kind!=='player')return null;
 const band=state.pieces.find(p=>p.id===bandId&&p.type==='Band'&&SPACE[p.location]);
 if(!band)return null;
 const candidates=(prompt.choices||[]).filter(c=>c.command?.type==='DEVELOPMENT_RESOLVE_EPIDEMIC'&&
   c.command.bandChoices&&typeof c.command.bandChoices==='object');
 if(!candidates.some(c=>c.command.bandChoices[band.location]===bandId))return null;
 // A new click in the same territory changes that territory's choice; another
 // click on the same Band toggles its selection without ever mutating the game.
 const next={...chosen};
 if(next[band.location]===bandId)delete next[band.location];
 else next[band.location]=bandId;
 const compatible=candidates.filter(c=>Object.entries(next).every(([space,id])=>c.command.bandChoices[space]===id));
 if(!compatible.length)return {ok:false,reason:'That Band does not belong to a legal Epidemic allocation.'};
 const spaces=Object.keys(candidates[0].command.bandChoices);
 const complete=spaces.every(space=>next[space]);
 if(complete){
  const exact=compatible.filter(c=>spaces.every(space=>c.command.bandChoices[space]===next[space]));
  if(exact.length!==1)return {ok:false,reason:'Several card consequences remain; review the printed effect.'};
  try{perform(state,exact[0].command);return {ok:true,selected:next,command:exact[0].command};}
  catch(error){return {ok:false,reason:String(error.message||error)};}
 }
 return {ok:true,selected:next,remaining:spaces.length-Object.keys(next).length};
}

/** A Headman is chosen on its actual printed Medicine row, followed by the
 * counter on the printed board that receives the effect. No synthetic menu or
 * implicit choice between two legal actions. */
export function printedHeadmanTargetChoice(state,headmanId,targetId,prompt){
 const headman=state.pieces.find(p=>p.id===headmanId&&p.type==='Paraibo');
 const target=state.pieces.find(p=>p.id===targetId);
 if(!headman||!target||prompt?.kind!=='player')return null;
 const rancheriaId=headman.affiliatedRancheriaId||String(headman.location||'').replace(/^box:/,'');
 if(!rancheriaId||!state.pieces.some(p=>p.id===rancheriaId&&p.type==='Rancheria'))return null;
 const matches=(prompt.choices||[]).filter(choice=>{
  const c=choice.command||{};
  if(c.type==='PLANNING_HEADMAN_ACTION'){
   if(c.rancheriaId!==rancheriaId)return false;
   return (c.action==='politics-replace-ally'&&target.type==='Tribe'&&c.tribeId===targetId)
     ||(c.action==='diplomacy-place'&&((target.type==='Instruction'&&c.instructionId===targetId&&!c.tribeId)||(target.type==='Tribe'&&c.tribeId===targetId)));
  }
  if(c.type==='DEVELOPMENT_PLAY_NEGOTIATION')return c.headmanRancheriaId===rancheriaId&&target.type==='War Column'&&c.warId===targetId;
  return false;
 }).filter(choice=>{try{perform(state,choice.command);return true;}catch{return false;}});
 if(matches.length===1)return {ok:true,command:matches[0].command};
 if(matches.length>1)return {ok:false,reason:'More than one legal effect applies to this printed counter. Choose the exact card or instruction first.'};
 return null;
}
