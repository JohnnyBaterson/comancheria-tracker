/** Physical drop targets on the ORIGINAL printed TTS board, in 1080x720 units.
 * No synthetic trays or off-board action targets. Commands are verified by the
 * caller with the game reducer before any board state is committed.
 */
import {PRINTED_BOARD,rancheriaPrintedIndex,recordPrintedPoint} from './printed-board-anchors.js';
import {SPACE,perform} from './engine.js';
import {resourceDropOptions,possessionActionDropOptions,directorCounterActionDropOptions,allianceTribeDropOptions} from './board-piece-drag.js';

export function printedRancheriaAt(state,x,y){
 const cfg=PRINTED_BOARD.rancheria;
 if(x<cfg.resourcesX-7||x>cfg.resourcesX+cfg.resourcesWidth+8)return null;
 for(const [i,ranch] of state.pieces.filter(p=>p.type==='Rancheria'&&(SPACE[p.location]||p.location===`box:${p.id}`)).sort((a,b)=>String(a.subtype||a.label).localeCompare(String(b.subtype||b.label))).entries()){
  const base=cfg.firstY+rancheriaPrintedIndex(ranch,i)*cfg.rowGap;
  if(y>=base-12&&y<=base+54)return ranch.id;
 }
 return null;
}
export function printedMedicineSlotAt(state,x,y){
 const cfg=PRINTED_BOARD.rancheria;
 const ranches=state.pieces.filter(p=>p.type==='Rancheria'&&(SPACE[p.location]||p.location===`box:${p.id}`)).sort((a,b)=>String(a.subtype||a.label).localeCompare(String(b.subtype||b.label)));
 for(const [i,ranch] of ranches.entries()){
  const para=state.pieces.find(p=>p.type==='Paraibo'&&(p.affiliatedRancheriaId===ranch.id||p.location===`box:${ranch.id}`));
  const rating=para?.medicine;
  if(!Number.isInteger(rating)||rating<1||rating>6)continue;
  const rowY=cfg.firstY+rancheriaPrintedIndex(ranch,i)*cfg.rowGap+cfg.paraY;
  if(Math.abs(y-rowY)>13)continue;
  for(let slot=0;slot<rating;slot++)if(Math.abs(x-(cfg.medicineX+slot*cfg.medicineGap))<=12)return {rancheriaId:ranch.id,slot};
 }
 return null;
}
export function printedSupplyAt(x,y){
 for(const [name,area] of Object.entries(PRINTED_BOARD.supply))if(x>=area.x&&x<=area.x+area.w&&y>=area.y&&y<=area.y+area.h)return name;
 return null;
}
export function printedPieceDrop(state,pieceId,x,y,prompt){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece)return null;
 const ranchId=printedRancheriaAt(state,x,y);
 if(ranchId){
  const matches=resourceDropOptions(state,pieceId).filter(o=>o.command.rancheriaId===ranchId);
  if(matches.length===1)return {ok:true,command:matches[0].command};
  if(matches.length>1)return {ok:false,reason:'Multiple transfers apply here; select the exact counter and action.'};
  // Gift Giving is a physical Trade Goods counter from the printed Available
  // Resources box into the original Ranchería Resources square. The exact
  // decision and cost still come from the turn director and reducer.
  if(piece.type==='Resource'&&piece.subtype==='Trade Goods'&&piece.location==='reserve'&&prompt?.kind==='player'){
   const matches=(prompt.choices||[]).filter(choice=>choice.command?.type==='DEVELOPMENT_GIFT_GIVING'&&choice.command.rancheriaId===ranchId).filter(choice=>{try{perform(state,choice.command);return true;}catch{return false;}});
   if(matches.length===1)return {ok:true,command:matches[0].command};
   if(matches.length>1)return {ok:false,reason:'Several Headman actions can place Trade Goods here; choose the exact actor.'};
  }
  // New Band stock and returning Bands move into the original Ranchería
  // Resources square, never into an invented reserve tray or a map circle.
  if(piece.type==='Band'&&prompt?.kind==='player'){
   const choices=(prompt.choices||[]).filter(choice=>{
    const c=choice.command;
    return c&&(
     c.type==='PASSAGE_RECRUIT_BAND'&&c.bandId===pieceId&&c.rancheriaId===ranchId||
     c.type==='CLEANUP_ABSORB_BAND'&&c.bandId===pieceId&&c.rancheriaId===ranchId
    );
   }).filter(choice=>{try{perform(state,choice.command);return true;}catch{return false;}});
   if(choices.length===1)return {ok:true,command:choices[0].command};
   if(choices.length>1)return {ok:false,reason:'Several legal resource payments or Band choices apply; select the exact one.'};
  }
 }
 const supply=printedSupplyAt(x,y);
 if(supply==='out'){
  const options=directorCounterActionDropOptions(state,pieceId,prompt).filter(o=>o.target==='card:remove-bison');
  if(options.length===1)return {ok:true,command:options[0].command};
 }
 // An eligible tribe is the physical choice. Releasing it on its own space
 // selects that tribe; it does not invent an arbitrary replacement location.
 if(piece.type==='Tribe'&&SPACE[piece.location]){
  const choices=allianceTribeDropOptions(state,pieceId,prompt);
  if(choices.length===1){
   return {ok:true,command:choices[0].command,requiresOwnSpace:true};
  }
 }
 return null;
}
export function printedMedicineArrangement(state,pieceId,x,y,existing){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(piece?.type!=='Band'||!piece.location.startsWith('box:')||state.phase!=='execution'||state.operation!=='Take Actions'||state.activeBandId||state.rancheriaActivation)return null;
 const hit=printedMedicineSlotAt(state,x,y);
 const resourceRanchId=printedRancheriaAt(state,x,y);
 const ranchId=hit?.rancheriaId||resourceRanchId;
 if(!ranchId||piece.location!==`box:${ranchId}`)return null;
 const ranch=state.pieces.find(p=>p.id===ranchId);
 if(!ranch||!SPACE[ranch.location])return null;
 const bands=state.pieces.filter(p=>p.type==='Band'&&p.location===`box:${ranch.id}`);
 const para=state.pieces.find(p=>p.type==='Paraibo'&&(p.affiliatedRancheriaId===ranch.id||p.location===`box:${ranch.id}`));
 const medicine=para?.medicine||0;
 // Right-to-left ordering is the actual track order; assign one Band per slot.
 // Off-track Bands follow in a deterministic order when Medicine is lower than
 // the number of Bands, so the reducer still receives every physical Band.
 const order=(existing||[]).filter(id=>bands.some(b=>b.id===id)&&id!==piece.id);
 const desiredIndex=hit?medicine-hit.slot-1:order.length;
 if(!hit&&order.length<medicine)return null;
 if(desiredIndex<0||desiredIndex>=bands.length)return null;
 // A slot cannot be skipped: build a contiguous physical arrangement from right.
 if(desiredIndex>order.length)return {ok:false,reason:'Place Bands from the rightmost Medicine slot to the left.'};
 order.splice(desiredIndex,0,piece.id);
 const remaining=bands.filter(b=>!order.includes(b.id)).map(b=>b.id);
 const full=[...order,...remaining];
 // The user explicitly drops the counter into the final valid Medicine slot;
 // only start when all possible positions for this Ranchería are determined.
 const complete=order.length===bands.length;
 if(complete){
  const command={type:'RANCHERIA_TRACK_START',rancheriaId:ranch.id,bandIds:full};
  try{perform(state,command);return {ok:true,order:full,command};}catch(error){return {ok:false,reason:String(error.message||error)};}
 }
 return {ok:true,order};
}

/** Spending a Horse means returning it to the ACTUAL Available supply box.
 * A trade means dragging the carried counter onto the actual Resource face
 * being received within that printed supply box. No action tiles are made. */
export function printedPossessionDrop(state,sourceId,targetId,x,y){
 const source=state.pieces.find(p=>p.id===sourceId);
 if(!source)return null;
 const options=possessionActionDropOptions(state,sourceId);
 const target=state.pieces.find(p=>p.id===targetId);
 if(target?.type==='Resource'&&target.location==='reserve'&&printedSupplyAt(x,y)==='available'){
  const matches=options.filter(o=>o.target===`trade:${target.subtype}`);
  if(matches.length===1)return {ok:true,command:matches[0].command};
 }
 if(source.type==='Resource'&&source.subtype==='Horse'&&printedSupplyAt(x,y)==='available'){
  const matches=options.filter(o=>o.target==='spend-horse');
  if(matches.length===1)return {ok:true,command:matches[0].command};
 }
 return null;
}
/** The existing printed AP record is an AP-activation drop target. */
export function printedAPActivationDrop(state,pieceId,x,y,prompt){
 const [apX,apY]=recordPrintedPoint('ap',state.tracks.ap||0);
 if(Math.hypot(x-apX,y-apY)>16)return null;
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(piece?.type!=='Band'||!SPACE[piece.location]||prompt?.kind!=='player')return null;
 const choices=(prompt.choices||[]).filter(c=>c.command?.type==='ACTIVATE_BAND'&&c.command.id===pieceId&&c.command.mode==='ap');
 if(choices.length!==1)return null;
 try{perform(state,choices[0].command);return {ok:true,command:choices[0].command};}catch{return null;}
}

/** Place an eligible defending Band onto the actual War Column counter's map
 * position. The selected defender and pending War Column are engine-owned. */
export function printedBattleDrop(state,pieceId,x,y,prompt,boardImagePosition){
 const warId=state.battlePending?.warId||state.battleContinuation?.warId;
 const war=state.pieces.find(p=>p.id===warId&&p.type==='War Column');
 if(!war||!SPACE[war.location])return null;
 const point=boardImagePosition(war.location);
 if(!point||Math.hypot(x-point[0],y-point[1])>30)return null;
 const choices=directorCounterActionDropOptions(state,pieceId,prompt).filter(o=>o.target==='battle:defend');
 return choices.length===1?{ok:true,command:choices[0].command}:null;
}

/** Exchange the old physical Band counter for the exact printed replacement
 * Band in the original Out of Play/stock area. Resource payment is the
 * director's validated command, not guessed by the drag handler. */
export function printedBandExchangeDrop(state,sourceId,targetId,prompt){
 const old=state.pieces.find(p=>p.id===sourceId),replacement=state.pieces.find(p=>p.id===targetId);
 if(old?.type!=='Band'||replacement?.type!=='Band'||old.id===replacement.id||prompt?.kind!=='player')return null;
 const choices=(prompt.choices||[]).filter(choice=>{
  const c=choice.command;
  return c?.type==='PASSAGE_STRENGTHEN_BAND'&&c.bandId===old.id&&c.replacementBandId===replacement.id;
 }).filter(choice=>{try{perform(state,choice.command);return true;}catch{return false;}});
 if(choices.length===1)return {ok:true,command:choices[0].command};
 if(choices.length>1)return {ok:false,reason:'Choose the exact population Resource payment for this Band exchange.'};
 return null;
}

/** Move the next Band from its printed Medicine slot onto the Ranchería's
 * actual map space, just as the player would lift it off the track. */
export function printedMedicineBandActivationAtMap(state,pieceId,to,prompt){
 const band=state.pieces.find(p=>p.id===pieceId&&p.type==='Band');
 const track=state.rancheriaActivation;
 if(!band||!track||!SPACE[to]||!band.location.startsWith('box:')||band.location!==`box:${track.rancheriaId}`)return null;
 const ranch=state.pieces.find(p=>p.id===track.rancheriaId&&p.type==='Rancheria');
 if(!ranch||ranch.location!==to)return null;
 const candidates=(prompt?.choices||[]).filter(c=>c.command?.type==='ACTIVATE_BAND'&&c.command.id===pieceId&&c.command.mode==='rancheria');
 if(candidates.length!==1)return null;
 try{perform(state,candidates[0].command);return {ok:true,command:candidates[0].command};}catch{return null;}
}
/** The printed AP track and Ranchería Resources square are the destinations
 * for the two real Medicine-track finish decisions. */
export function printedMedicineTrackFinish(state,rancheriaId,collectAP,prompt){
 const track=state.rancheriaActivation;
 if(!track||track.rancheriaId!==rancheriaId)return null;
 const choices=(prompt?.choices||[]).filter(c=>c.command?.type==='RANCHERIA_TRACK_FINISH'&&c.command.collectAP===collectAP);
 if(choices.length!==1)return null;
 try{perform(state,choices[0].command);return {ok:true,command:choices[0].command};}catch{return null;}
}
