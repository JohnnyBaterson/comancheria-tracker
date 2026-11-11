/** Verified Planning choices. No rules shortcuts or player-asserted setup facts.
 * Preview with the real reducer so the menu cannot propose an invalid command.
 */
import {perform,SPACE,cultureActive} from './engine.js';
const HAND_NUMBERS=new Set(['08','09','10','11','13','15','16','17','18','28','32','35','36','39','40','42','54','59']);
const number=c=>String(c.identifier||'').replace(/\D/g,'').padStart(2,'0');
const active=c=>c.kind==='Development'&&['In play','Display'].includes(c.zone);
const legal=(state,command)=>{
 try { perform(state,command); return true; }catch{return false;}
};
export function planningActionChoices(state){
 if(state.phase!=='execution'||state.operation!=='Planning'||(state.planningStage!==undefined&&state.planningStage!==null&&state.planningStage!==4)||state.pending||state.developmentPending||state.enemyFlow||state.battlePending||state.successCheck||state.victoryPending)return [];
 const choices=[],add=(label,detail,command)=>{
  if(legal(state,command))choices.push({label,detail,command});
 };
 // Paraibo action allowances are assigned once per Ranchería; all spending is reducer-validated.
 for(const ranch of state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
  const paraibos=state.pieces.filter(p=>p.type==='Paraibo'&&p.location!=='removed'&&(p.affiliatedRancheriaId===ranch.id||p.location===`box:${ranch.id}`||String(p.subtype||'').toUpperCase()===String(ranch.subtype||'').toUpperCase()));
  if(paraibos.length!==1||!Number.isInteger(paraibos[0].medicine)||paraibos[0].medicine<1)continue;
  const record=state.planningHeadman?.[ranch.id],who=paraibos[0].label||ranch.label||ranch.id;
  if(!record){
   add(`${who}: one guaranteed Headman Action`,'Choose one action, without a die roll.',{type:'PLANNING_HEADMAN_START',rancheriaId:ranch.id,mode:'guaranteed'});
   add(`${who}: gamble for more actions`,'Roll a seeded die. If it exceeds Medicine, receive zero actions.',{type:'PLANNING_HEADMAN_START',rancheriaId:ranch.id,mode:'gamble'});
  }else if(record.spent<record.allowance){
   add(`${who}: improve Medicine (Spirituality II)`,'Roll one die; on a result above Medicine, gain 1 Medicine; no extra action is awarded.',{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'spirituality-medicine'});
   if(cultureActive(state,'C20'))for(const tribe of state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]&&state.pieces.some(q=>q.type==='Instruction'&&q.subtype==='Ally'&&q.location===p.location)))
     add(`${who}: Politics · replace Ally Tribe ${tribe.label||tribe.id}`,'Return Tribe and Ally Instruction, then deploy a real two-strength Band counter.',{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'politics-replace-ally',tribeId:tribe.id});
   if(cultureActive(state,'C15'))for(const instruction of state.pieces.filter(p=>p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype)&&p.faceEvidence!=='unverified'&&/^enemy-display:(North|West|South|East):[A-F]$/.test(p.location||''))){
     if(instruction.subtype==='Ally'){
       for(const tribe of state.pieces.filter(p=>p.type==='Tribe'&&p.location&&!p.location.startsWith('reserve'))){
         add(`${who}: Diplomacy III · ${instruction.owner} Ally → ${tribe.label||tribe.id}`,
           'Deploy a face-up Ally Instruction to the selected eligible Tribe.',
           {type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'diplomacy-place',instructionId:instruction.id,tribeId:tribe.id});
       }
     }else add(`${who}: Diplomacy III · ${instruction.owner} Peace`,
       'Place a displayed Peace Instruction or end a sufficiently weakened War Column.',
       {type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'diplomacy-place',instructionId:instruction.id});
   }
   if(cultureActive(state,'C14'))for(const enemy of ['North','West','South','East'])add(`${who}: Diplomacy · flip ${enemy} Instruction`,'Flip the topmost Instruction in the selected Enemy column.',{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'diplomacy-flip',enemy});
   add(`${who}: collect 1 AP`,'Spend 1 Paraibo Medicine (requires Medicine ≥2).',{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'collect-ap'});
   add(`${who}: convert Culture to Military`,'Spend 1 Culture to gain 1 Military (Culture must exceed Military).',{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'convert-military'});
   add(`${who}: return Success to cup`,'Pay 1 AP and return 1 out-of-play Success counter to the draw cup.',{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'return-success'});
  }
 }
 const cards=state.cards.filter(active);
 const cardActors=state.planningStage===4?Object.entries(state.planningHeadman||{}).filter(([,r])=>r.spent<r.allowance).map(([id])=>id):[null];
 const addCardAction=(label,detail,command)=>{
  for(const actor of cardActors)add(actor?`${label} · ${state.pieces.find(p=>p.id===actor)?.label||actor}`:label,detail,actor?{...command,headmanRancheriaId:actor}:command);
 };

 // Negotiation is itself a Headman Action, not a free hand-card effect.
 if(state.cards.some(c=>c.kind==='Development'&&number(c)==='15'&&c.zone==='Hand')){
   for(const war of state.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]))
     addCardAction(`Negotiation → end ${war.label||war.id}`,'Spend a Headman Action to end this War Column.',{type:'DEVELOPMENT_PLAY_NEGOTIATION',warId:war.id});
 }
 if(state.tracks.ap>=1){
  for(const c of cards){
   const n=number(c);
   if(n==='02')addCardAction('Take Ute Alliance into hand · 1 AP','A verified Headman Action; the card enters your hand.',{type:'DEVELOPMENT_TAKE_HAND'});
   else if(HAND_NUMBERS.has(n))addCardAction(`Take ${c.title||'Development #'+n} (#${n}) · 1 AP`,'Move this in-play Development card into your hand.',{type:'DEVELOPMENT_TAKE_VERIFIED_HAND',number:n});
  }
  if(cards.some(c=>number(c)==='56')&&!state.giftGivingUsed){
   for(const ranch of state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
    addCardAction(`Gift Giving → ${ranch.label||ranch.id} · 1 AP`,'Spend 1 AP and place one available Trade Goods counter in this Ranchería.',{type:'DEVELOPMENT_GIFT_GIVING',rancheriaId:ranch.id});
   }
  }
 }
 if(!state.developmentPlanningApplied&&cards.some(c=>['33','34','58'].includes(number(c)))){
  for(const ranch of state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
   add(`Comancheros → ${ranch.label||ranch.id}`,'Resolve the outstanding end-of-Planning Trade Goods effect.',{type:'DEVELOPMENT_COMANCHEROS',rancheriaId:ranch.id});
  }
 }
 return choices;
}
