/**
 * Derived visual guidance for the original, player-transcribed Comanchería map.
 * The rules engine remains the authority for any move. This module NEVER turns
 * geometric proximity into a legal connection, and NEVER reads remote assets.
 */
import {SPACE, SPACES} from './engine.js';

function graphFor(edges){
  const graph=new Map(SPACES.map(space=>[space.id, []]));
  for(const edge of edges||[]){
    if(!edge||!graph.has(edge.a)||!graph.has(edge.b)||edge.a===edge.b||!['solid','dashed'].includes(edge.kind))continue;
    graph.get(edge.a).push({to:edge.b,kind:edge.kind});
    graph.get(edge.b).push({to:edge.a,kind:edge.kind});
  }
  // Stable results regardless of input order or when old saves contain duplicates.
  for(const neighbors of graph.values())neighbors.sort((a,b)=>a.to.localeCompare(b.to));
  return graph;
}

/** A completeness *audit of the user-entered ledger*, not of the printed map. */
export function boardNetworkAudit(state){
  const graph=graphFor(state.edges);
  const visited=new Set(),components=[];
  for(const id of graph.keys()){
    if(visited.has(id))continue;
    const queue=[id];visited.add(id);
    for(let i=0;i<queue.length;i++)for(const step of graph.get(queue[i])){
      if(!visited.has(step.to)){visited.add(step.to);queue.push(step.to);}
    }
    components.push(queue.sort());
  }
  const isolated=components.filter(group=>group.length===1).map(group=>group[0]);
  const occupied=new Set((state.pieces||[]).map(p=>p.location).filter(id=>graph.has(id)));
  return {
    spaceCount:graph.size,
    enteredEdges:(state.edges||[]).length,
    connectedSpaces:graph.size-isolated.length,
    components:components.filter(group=>group.length>1).sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0])),
    isolated,
    occupiedIsolated:isolated.filter(id=>occupied.has(id)),
    occupiedSpaceCount:occupied.size
  };
}

/** Movement-point visibility only: a printed card or space may forbid a step. */
export function bandMovementOverlay(state,bandId){
  const band=(state.pieces||[]).find(p=>p.id===bandId&&p.type==='Band');
  if(!band||!SPACE[band.location]||state.phase!=='execution'||state.operation!=='Take Actions'||state.pending||state.successCheck){return null;}
  const graph=graphFor(state.edges);
  const costPerEdge=state.pieces.some(p=>p.location===`held:${band.id}`&&p.subtype==='Horse')?1:2;
  const available=Number(state.tracks?.movement)||0;
  const reachable={[band.location]:{cost:0,hops:0,path:[band.location]}};
  const queue=[band.location];
  for(let i=0;i<queue.length;i++){
    const from=queue[i],previous=reachable[from];
    for(const step of graph.get(from)){
      const cost=previous.cost+costPerEdge;
      if(cost>available||reachable[step.to])continue;
      reachable[step.to]={cost,hops:previous.hops+1,path:[...previous.path,step.to]};
      queue.push(step.to);
    }
  }
  return {bandId:band.id,from:band.location,available,costPerEdge,reachable,
    reachableCount:Object.keys(reachable).length-1};
}
