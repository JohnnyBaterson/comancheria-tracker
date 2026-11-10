/** Contextual board interactions backed by the actual Comanchería engine.
 * Never treats visually adjacent spaces as legal connections or a manual relocation as a move. */
import {perform,SPACE} from './engine.js';
export function tryBoardCommand(state,command){
 try{perform(state,command);return {ok:true,reason:''};}
 catch(error){return {ok:false,reason:String(error?.message||error)};}
}
export function counterActionStatus(state,pieceId){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece)return {piece:null,active:false,ap:{ok:false,reason:'Piece not found.'},medicine:{ok:false,reason:'Piece not found.'},moves:[]};
 const band=piece.type==='Band';
 const active=band&&state.activeBandId===pieceId;
 const ap=band?tryBoardCommand(state,{type:'ACTIVATE_BAND',id:pieceId,mode:'ap'}):{ok:false,reason:'Only Bands can activate.'};
 const medicine=band?tryBoardCommand(state,{type:'ACTIVATE_BAND',id:pieceId,mode:'rancheria',ack:true}):{ok:false,reason:'Only Bands can activate.'};
 const destinations=active&&SPACE[piece.location]?boardMoveOptions(state,pieceId):{legal:[],blocked:[]};
 return {piece,active,ap,medicine,moves:destinations.legal,blockedMoves:destinations.blocked};
}
export function boardMoveStatus(state,pieceId,to){
 if(!SPACE[to])return {ok:false,reason:'Not a numbered or special board space.'};
 const item=state.pieces.find(p=>p.id===pieceId);
 if(!item)return {ok:false,reason:'Select a recorded counter first.'};
 if(item.type!=='Band')return {ok:false,reason:'This counter does not have an ordinary Band Move action. Use its dedicated game procedure; administrative relocation is separate.'};
 if(item.id!==state.activeBandId)return {ok:false,reason:'Activate this Band before attempting a gameplay move.'};
 return tryBoardCommand(state,{type:'MOVE_BAND',to});
}

/** Returns only engine-accepted one-edge Band moves, with exact MP costs.
 * Also reports physically recorded adjacent links whose MOVE_BAND command is rejected.
 * Never marks a destination legal based solely on reachability/pathfinding. */
export function boardMoveOptions(state,pieceId){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece||piece.type!=='Band'||piece.id!==state.activeBandId||!SPACE[piece.location])return {legal:[],blocked:[]};
 const adjacent=new Set();
 for(const edge of state.edges||[]){
  if(edge.a===piece.location)adjacent.add(edge.b);
  if(edge.b===piece.location)adjacent.add(edge.a);
 }
 const legal=[],blocked=[];
 for(const to of [...adjacent].sort()){
  if(!SPACE[to]||to===piece.location)continue;
  try{
   const after=perform(state,{type:'MOVE_BAND',to});
   legal.push({to,cost:state.tracks.movement-after.tracks.movement,remaining:after.tracks.movement});
  }catch(error){blocked.push({to,reason:String(error?.message||error)});}
 }
 return {legal,blocked};
}
