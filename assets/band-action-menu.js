/** Game-facing Band action menu. Options are derived by executing the real
 * reducer against a throwaway state, never by assuming illustrated adjacency.
 * This is advisory; the authoritative reducer validates again on click. */
import {perform,SPACE} from './engine.js';
import {boardMoveOptions} from './board-counter-actions.js';

function permitted(state,command){
  try { perform(state,command);return true; } catch { return false; }
}
export function activeBandChoices(state){
  if(state.phase!=='execution'||state.operation!=='Take Actions'||!state.activeBandId)return [];
  const band=state.pieces.find(p=>p.id===state.activeBandId&&p.type==='Band');
  if(!band)return [];
  // Do not offer new activities while a pending Raid, Success Check or card
  // decision is unresolved. Finishing an activation is not a shortcut.
  if(state.pending||state.successCheck||state.battlePending||state.enemyFlow||state.developmentPending||state.countermeasureWindow)return [];
  const actions=[];
  if(permitted(state,{type:'HUNT'}))actions.push({id:'hunt',kind:'hunt',label:'Hunt Bison',detail:'Collect one Bison; movement cost calculated by the game.',command:{type:'HUNT'}});
  if(permitted(state,{type:'CULTURE_WARPATH_START'}))actions.push({id:'warpath',kind:'raid',label:'Warpath against Tribe/Settlement',detail:'Warfare I: spend MP equal to Band strength; each Success places Ravaged.',command:{type:'CULTURE_WARPATH_START'}});
  if(permitted(state,{type:'BEGIN_RAID'}))actions.push({id:'raid',kind:'raid',label:'Raid this space',detail:'Spend 1 movement point, then resolve the Success Check.',command:{type:'BEGIN_RAID'}});
  for(const move of boardMoveOptions(state,band.id).legal){
    actions.push({id:`move:${move.to}`,kind:'move',to:move.to,label:`Move to ${SPACE[move.to]?.name||move.to}`,detail:`${move.cost} MP · ${move.remaining} left`,command:{type:'MOVE_BAND',to:move.to}});
  }
  const owned=state.pieces.filter(p=>p.location===`held:${band.id}`&&(p.type==='Bison'||p.type==='Resource'&&['Bison','Captives','Horse'].includes(p.subtype)));
  for(const resource of owned){
    for(const receive of ['Food','Trade Goods']){
      const command={type:'TRADE',resourceId:resource.id,receive};
      if(permitted(state,command))actions.push({id:`trade:${resource.id}:${receive}`,kind:'trade',label:`Trade ${resource.subtype||resource.type} for ${receive}`,detail:'Validated trade: AP and movement costs applied automatically.',command});
    }
  }
  for(const counter of state.pieces.filter(p=>p.location===band.location&&p.faceDown===true)){
    const reveal={type:'CULTURE_LORDS_REVEAL',counterId:counter.id};
    if(permitted(state,reveal))actions.push({id:`harass-reveal:${counter.id}`,kind:'scout',label:`Harass: reveal ${counter.id} · 2 MP`,detail:'Lords II: reveal and send Success to cup or Enemy AP to the available box.',command:reveal});
    const scout={type:'CULTURE_TACTICS_UNKNOWN_SCOUT',counterId:counter.id};
    if(permitted(state,scout))actions.push({id:`scout-unknown:${counter.id}`,kind:'scout',label:`Scout the unknown counter · 1 MP`,detail:'Tactics III: return the counter to the cup without seeing its face.',command:scout});
  }
  for(const war of state.pieces.filter(p=>p.type==='War Column'&&p.location===band.location)){
    const command={type:'CULTURE_LORDS_HARASS',warId:war.id};
    if(permitted(state,command))actions.push({id:`harass:${war.id}`,kind:'attack',label:`Harass ${war.label||war.id} · 2 MP`,detail:'Lords II: reduce this War Column by one strength; War Ends if reduced to zero.',command});
  }
  if(permitted(state,{type:'CULTURE_TACTICS_SCOUT'}))actions.push({id:'culture-scout',kind:'scout',label:'Scout the War deck · 1 MP',detail:'Tactics II: reveal the next War Card and leave it on top of the deck.',command:{type:'CULTURE_TACTICS_SCOUT'}});
  if(permitted(state,{type:'SPEND_HORSE'}))actions.push({id:'horse',kind:'horse',label:'Spend Horse for +1 MP',detail:'Returns one Horse to stock.',command:{type:'SPEND_HORSE'}});
  if(permitted(state,{type:'FINISH_BAND'}))actions.push({id:'finish',kind:'finish',label:'Finish this Band',detail:'End this activation.',command:{type:'FINISH_BAND'}});
  return actions;
}
