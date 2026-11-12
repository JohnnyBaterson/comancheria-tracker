/** Pointer-drop decisions. All placements use validated reducer commands; no raw relocation. */
import {boardMoveStatus} from './board-counter-actions.js';
import {SPACE,perform} from './engine.js';
export function resolveBoardPieceDrop(state,pieceId,to){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece)return {ok:false,reason:'The selected counter is no longer available.'};
 if(!SPACE[piece.location])return {ok:false,reason:'This counter is not currently on a map space.'};
 if(!to||!SPACE[to])return {ok:false,reason:'Drop the counter on a printed map space; it has returned to its original position.'};
 if(to===piece.location)return {ok:false,reason:'The counter is already in that space.'};
 if(piece.type!=='Band')return {ok:false,reason:`${piece.type} counters move through their dedicated rules procedures. Select the counter to see its legal actions.`};
 const legal=boardMoveStatus(state,pieceId,to);
 return legal.ok?{ok:true,command:{type:'MOVE_BAND',to}}:{ok:false,reason:legal.reason};
}
/** Only the exact current turn-director commands may create drop targets.
 * Stock counters are draggable only for explicit on-board placement decisions. */
export function directorPieceDropOptions(state,pieceId,prompt){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece||prompt?.kind!=='player'||!Array.isArray(prompt.choices))return [];
 const legal=[];
 for(const choice of prompt.choices){
  const command=choice.command;
  if(!command)continue;
  let to=null;
  if(piece.type==='Rancheria'&&SPACE[piece.location]&&command.type==='PLANNING_MOVE_RANCHERIA'&&command.rancheriaId===pieceId)to=command.to;
  else if(piece.type==='Tribe'&&SPACE[piece.location]&&command.type==='CULTURE_POLITICS_MOVE_ALLY'&&command.tribeId===pieceId)to=command.to;
  else if(piece.type==='Tribe'&&SPACE[piece.location]&&command.type==='DEVELOPMENT_NUEVO_APACHERIA'&&command.tribeId===pieceId)to=command.space;
  else if(piece.type==='Rancheria'&&piece.location===`box:${piece.id}`&&command.type==='PASSAGE_CREATE_RANCHERIA'&&command.rancheriaId===pieceId){
   const band=state.pieces.find(p=>p.id===command.bandId&&p.type==='Band');
   to=band?.location;
  }
  else if(piece.type==='Settlement'&&piece.location==='reserve'&&command.type==='ENEMY_SETTLE'&&command.settlementId===pieceId)to=command.space;
  else if(['Band','Rancheria'].includes(piece.type)&&SPACE[piece.location]&&command.type==='CULTURE_WAR_EVADE'&&command.id===piece.id&&command.kind===(piece.type==='Band'?'band':'ranch'))to=command.to;
  if(!SPACE[to])continue;
  try{perform(state,command);legal.push({to,command,label:choice.label});}catch{}
 }
 return legal;
}
export function resolveDirectorPieceDrop(state,pieceId,to,prompt){
 const options=directorPieceDropOptions(state,pieceId,prompt).filter(x=>x.to===to);
 if(options.length===1)return {ok:true,command:options[0].command};
 if(options.length>1)return {ok:false,reason:'Multiple legal choices exist here. Choose the exact action from the board decision panel.'};
 return {ok:false,reason:'This drop is not a legal placement for the current game decision.'};
}

/** Resource/possession drops are physical gestures for existing rule commands.
 * Never infer the recipient from an arbitrary counter move: only an in-play
 * Ranchería in a printed destination may receive the counter. */
export function resourceDropOptions(state,pieceId){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece||!['Resource','Bison','Mahimiana'].includes(piece.type))return [];
 const targets=state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
 const possible=[];
 for(const ranch of targets){
  let command=null;
  if(piece.location==='operations'&&['Resource','Bison'].includes(piece.type)){
   if(state.phase==='cleanup')command={type:'CLEANUP_TRANSFER_RESOURCE',pieceId,rancheriaId:ranch.id};
   else if(state.phase==='execution'&&state.operation==='Passage of Time')command={type:'PASSAGE_TRANSFER_RESOURCE',pieceId,rancheriaId:ranch.id};
  } else if(piece.location.startsWith('held:')&&state.phase==='cleanup'){
   command={type:'CLEANUP_RELINQUISH',pieceId,bandId:piece.location.slice(5),rancheriaId:ranch.id};
  }
  if(!command)continue;
  try{perform(state,command);possible.push({to:ranch.location,command,label:`Give ${piece.label||piece.type} to ${ranch.label||ranch.id}`});}catch{}
 }
 return possible;
}
export function resolveResourceDrop(state,pieceId,to){
 const options=resourceDropOptions(state,pieceId).filter(option=>option.to===to);
 if(options.length===1)return {ok:true,command:options[0].command};
 if(options.length>1)return {ok:false,reason:'More than one Ranchería can receive this counter here. Choose the recipient in the decision controls.'};
 return {ok:false,reason:'This is not a legal Resource transfer at the current game step. The counter has returned to its original position.'};
}

/** Physical take-actions exchanges. A drop token is a named player decision,
 * never an arbitrary stock relocation. Check every candidate with perform(). */
export function possessionActionDropOptions(state,pieceId){
 const piece=state.pieces.find(p=>p.id===pieceId);
 const band=state.pieces.find(p=>p.id===state.activeBandId&&p.type==='Band');
 if(!piece||!band||state.phase!=='execution'||state.operation!=='Take Actions'||!SPACE[band.location])return [];
 const candidate=[];
 if(piece.type==='Bison'&&piece.location===band.location)candidate.push({target:'hunt',label:'Pick up Bison',command:{type:'HUNT'}});
 if(piece.location===`held:${band.id}`){
  if(piece.type==='Resource'&&piece.subtype==='Horse')candidate.push({target:'spend-horse',label:'Spend Horse for 1 MP',command:{type:'SPEND_HORSE',horseId:piece.id}});
  if(piece.type==='Bison'||piece.type==='Resource'&&['Horse','Captives'].includes(piece.subtype)){
   for(const receive of ['Food','Trade Goods','Guns'])candidate.push({target:`trade:${receive}`,label:`Trade for ${receive}`,command:{type:'TRADE',resourceId:piece.id,receive}});
  }
 }
 return candidate.filter(option=>{try{perform(state,option.command);return true;}catch{return false;}});
}
export function resolvePossessionActionDrop(state,pieceId,target){
 const options=possessionActionDropOptions(state,pieceId).filter(x=>x.target===target);
 if(options.length===1)return {ok:true,command:options[0].command};
 return {ok:false,reason:'This counter cannot be used for that action now. It has returned to its original position.'};
}

/** Direct manipulation for single-counter Battle and printed-card decisions.
 * A drop is only a gesture for the exact current director choice; unlike a
 * counter editor, it never sets location, changes strength or skips a step. */
export function directorCounterActionDropOptions(state,pieceId,prompt){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece||(!SPACE[piece.location]&&!(piece.type==='Band'&&piece.location.startsWith('box:')))||prompt?.kind!=='player'||!Array.isArray(prompt.choices))return [];
 const options=[];
 for(const choice of prompt.choices){
  const command=choice.command;
  if(!command)continue;
  let target=null;
  if(piece.type==='Band'&&command.unitId===piece.id&&['BATTLE_SAFE_START','BATTLE_SAFE_ROUND'].includes(command.type))target='battle:defend';
  else if(piece.type==='Bison'&&command.type==='DEVELOPMENT_BUFFALO_RESOLVE'&&command.bisonId===piece.id)target='card:remove-bison';
  if(!target)continue;
  try{perform(state,command);options.push({target,command,label:choice.label});}catch{}
 }
 return options;
}
export function resolveDirectorCounterActionDrop(state,pieceId,target,prompt){
 const options=directorCounterActionDropOptions(state,pieceId,prompt).filter(option=>option.target===target);
 if(options.length===1)return {ok:true,command:options[0].command};
 if(options.length>1)return {ok:false,reason:'More than one legal decision uses this counter. Choose the precise action in the decision panel.'};
 return {ok:false,reason:'This counter is not eligible for the current Battle or card effect. It has returned to its space.'};
}

/** Alliance selections are made with the chosen existing Tribe counter.
 * No piece is moved manually: the command performs the printed effect. */
export function allianceTribeDropOptions(state,pieceId,prompt){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(piece?.type!=='Tribe'||!SPACE[piece.location]||prompt?.kind!=='player'||!Array.isArray(prompt.choices))return [];
 const types=new Set(['ENEMY_ALLY','CLEANUP_CUP_CHOOSE_ALLY','RAID_CUP_CHOOSE_ALLY']);
 return prompt.choices.filter(choice=>types.has(choice.command?.type)&&choice.command.tribeId===pieceId).flatMap(choice=>{
  try{perform(state,choice.command);return [{target:'alliance:tribe',command:choice.command,label:choice.label}];}catch{return [];}
 });
}
export function resolveAllianceTribeDrop(state,pieceId,target,prompt){
 const options=allianceTribeDropOptions(state,pieceId,prompt).filter(x=>x.target===target);
 if(options.length===1)return {ok:true,command:options[0].command};
 if(options.length>1)return {ok:false,reason:'Choose the precise Allied Tribe action from the decision panel.'};
 return {ok:false,reason:'This Tribe cannot be selected for an alliance now. It has returned to the board.'};
}

/** Physical Take Actions activation. The exact director choice remains authoritative.
 * Medicine-track Bands are in Ranchería boxes, never fabricated on the map. */
export function activationCounterDropOptions(state,pieceId,prompt){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece||prompt?.kind!=='player'||!Array.isArray(prompt.choices)||state.phase!=='execution'||state.operation!=='Take Actions')return [];
 const options=[];
 for(const choice of prompt.choices){
  const command=choice.command;
  let target=null;
  if(piece.type==='Band'&&command?.type==='ACTIVATE_BAND'&&command.id===piece.id){
   if(command.mode==='rancheria'&&piece.location.startsWith('box:'))target='activate:medicine';
   else if(command.mode==='ap'&&SPACE[piece.location])target='activate:ap';
  }else if(piece.type==='Rancheria'&&SPACE[piece.location]&&command?.type==='RANCHERIA_TRACK_START'&&command.rancheriaId===piece.id)target='activate:prepare';
  if(!target)continue;
  try{perform(state,command);options.push({target,command,label:choice.label});}catch{}
 }
 return options;
}
export function resolveActivationCounterDrop(state,pieceId,target,prompt){
 const options=activationCounterDropOptions(state,pieceId,prompt).filter(x=>x.target===target);
 if(options.length===1)return {ok:true,command:options[0].command};
 if(options.length>1)return {ok:false,reason:'More than one legal activation uses this counter. Choose the exact decision in the action rail.'};
 return {ok:false,reason:'This counter cannot be activated or prepared at the current game step. It has returned to its place.'};
}
