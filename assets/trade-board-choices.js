/** Legal on-board Trade choices. Never advertise a reward that the game
 * reducer would reject for the current Band, inventory, location or cards.
 * Calling perform here is a dry run: it clones the supplied state. */
import {perform} from './engine.js';
export function tradeBoardChoices(state){
  const bandId=state.activeBandId;
  if(!bandId)return [];
  const resources=state.pieces.filter(p=>p.location===`held:${bandId}`&&
    (p.type==='Bison'||p.type==='Resource'&&['Horse','Captives','Bison'].includes(p.subtype)));
  const receiveTypes=['Food','Trade Goods','Guns'];
  const choices=[];
  for(const resource of resources)for(const receive of receiveTypes){
    const command={type:'TRADE',resourceId:resource.id,receive};
    try{perform(state,command);choices.push({resourceId:resource.id,receive,command});}catch{}
  }
  return choices;
}
