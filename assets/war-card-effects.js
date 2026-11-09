/** Verified against the owner's Tabletop Simulator W01–W25 card faces.
 * These are functional summaries, not copies of the printed text. */
const movements=[
 {East:1,West:2},{East:1,West:2},
 ...Array.from({length:6},()=>({East:1,West:1,North:1})),
 ...Array.from({length:3},()=>({South:2,West:1})),
 ...Array.from({length:5},()=>({South:1,West:1,North:1})),
 ...Array.from({length:4},()=>({East:2,South:1})),
 ...Array.from({length:4},()=>({East:1,South:1,North:1})),
 null
];
// The W03–W08 family contains six cards; W12–W16 five; W17–W20 four; W21–W24 four.
const events=['alert-pickets','alert-pickets','fast-column','fast-column','steal-mounts','steal-mounts',
 'draw-them-off','draw-them-off','surprise-attack','surprise-attack','surprise-attack',
 'travois','travois','bad-intel','bad-intel','wide-open','wide-open',
 'surrender-captives','surrender-captives','surrender-captives','surrender-captives',
 'fast-column','higher-stakes','successful-ambush','reshuffle'];
export const WAR_CARD_DATA=Object.freeze(movements.map((movement,i)=>Object.freeze({
 id:`W${String(i+1).padStart(2,'0')}`,image:`assets/card-faces/war-${String(i+1).padStart(2,'0')}.webp`,
 movement:movement?Object.freeze({...movement}):null,event:events[i],
 trigger:['alert-pickets'].includes(events[i])?'persistent':
 ['steal-mounts','draw-them-off','surrender-captives','successful-ambush'].includes(events[i])?'countermeasure':
 events[i]==='higher-stakes'?'cleanup':'reveal',
 source:`Tabletop Simulator supplied W${String(i+1).padStart(2,'0')} card face`
})));
export function warCard(id){return WAR_CARD_DATA.find(x=>x.id===String(id||'').trim().toUpperCase())||null;}
export function warMovementAllowance(card,enemy){return warCard(card)?.movement?.[enemy]||0;}
export function warEventPreview(s,id){
 const card=warCard(id);if(!card)throw new Error('Unknown printed War Card identity.');
 const columns=s.pieces.filter(p=>p.type==='War Column'&&p.strength>0&&!['reserve','removed'].includes(p.location));
 const values=columns.map(p=>p.strength);
 const selected=card.event==='bad-intel'?Math.min(...values):card.event==='wide-open'?Math.max(...values):null;
 return {card:card.id,event:card.event,trigger:card.trigger,
  targets:selected===null||!values.length?[]:columns.filter(p=>p.strength===selected).map(p=>p.id),
  requiresChoice:!['bad-intel','wide-open','alert-pickets','higher-stakes'].includes(card.event),
  canResolveImmediately:['bad-intel','wide-open'].includes(card.event),source:card.source};
}
