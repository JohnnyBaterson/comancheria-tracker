/** Pure presentation events derived from authoritative game-state transitions.
 * No RNG, game-state changes or implied resolution of printed card effects.
 */
const VISIBLE_ZONES = new Set(['Display','In play','Hand','War Event']);
const KINDS = new Set(['Development','Culture','History','War']);
export function cardRevealEvents(before, after){
  const previous = new Map((before?.cards||[]).map(c=>[c.id,c]));
  const reveals=[];
  for(const card of after?.cards||[]){
    if(!KINDS.has(card.kind)||!VISIBLE_ZONES.has(card.zone))continue;
    const old=previous.get(card.id);
    if(old?.zone==='Deck' && old.zone!==card.zone){
      reveals.push({id:String(card.id),kind:card.kind,identifier:String(card.identifier||''),title:String(card.title||''),zone:card.zone});
    }
  }
  return reveals;
}
export function artReferenceForCard(card){
  if(card.kind==='History'){
    const n=Number(String(card.identifier).replace(/\D/g,''));
    return Number.isInteger(n)&&n>=1&&n<=4?'history-source-'+String(n).padStart(2,'0'):null;
  }
  if(!['Development','Culture','War'].includes(card.kind))return null;
  const n=Number(String(card.identifier).replace(/\D/g,''));
  if(!Number.isInteger(n)||n<1||n>(card.kind==='Development'?84:card.kind==='War'?25:24))return null;
  return card.kind.toLowerCase()+'-'+String(n).padStart(2,'0');
}
export function revealLabel(card){return card.kind==='War'?'War Event':card.kind+' Card';}

/** Card zones are authoritative reducer destinations, never inferred from art. */
export const BOARD_CARD_ZONES = Object.freeze(['Display','Hand','In play','War Event']);
export function revealDestination(card){
  if(!card || !BOARD_CARD_ZONES.includes(card.zone))return null;
  return {id:String(card.id),zone:card.zone};
}
