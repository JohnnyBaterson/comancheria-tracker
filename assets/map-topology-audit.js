/** Exhaustive node audit of the currently recorded graph. This module never
 * invents missing map lines or certifies the publisher's board topology. */
import {SPACES} from './engine.js';
import {MAP_EVIDENCE_EDGES} from './map-evidence.js';

export const MAP_REFERENCE_URL='https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/comancheria/Comancheria_Map-72.jpg';
const canonical=(a,b)=>[a,b].sort().join('|');
const colorOf=e=>e.enemyFor?.length?[...e.enemyFor].sort().join('+'):null;
function edgeSignature(e){return `${canonical(e.a,e.b)}|${e.kind}|${colorOf(e)||'uncolored'}`;}
export function topologyReport(state){
 const ids=new Set(SPACES.map(s=>s.id)), adjacent=new Map([...ids].map(id=>[id,[]]));
 const duplicate=[], invalid=[], edgeKeys=new Set();
 for(const edge of state.edges||[]){
  if(!ids.has(edge.a)||!ids.has(edge.b)||edge.a===edge.b||!['solid','dashed'].includes(edge.kind)||colorOf(edge)&&edge.kind!=='solid'){
   invalid.push(edge);continue;
  }
  const key=canonical(edge.a,edge.b);
  if(edgeKeys.has(key)){duplicate.push(edge);continue;}
  edgeKeys.add(key);
  adjacent.get(edge.a).push(edge);adjacent.get(edge.b).push(edge);
 }
 const supportedBySource=[];const sourceConflicts=[];const missingSource=[];
 for(const expected of MAP_EVIDENCE_EDGES){
  const actual=(state.edges||[]).find(e=>canonical(e.a,e.b)===canonical(expected.a,expected.b));
  if(!actual){missingSource.push(expected);continue;}
  if(actual.kind!==expected.kind||(colorOf(actual)&&colorOf(expected)&&colorOf(actual)!==colorOf(expected)))sourceConflicts.push({expected,actual});
  else supportedBySource.push(expected);
 }
 const visited=new Set(),connectedComponents=[];
 for(const id of ids){
  if(visited.has(id))continue;
  const group=[id];visited.add(id);
  for(let i=0;i<group.length;i++){
   const current=group[i];for(const edge of adjacent.get(current)){
    const other=edge.a===current?edge.b:edge.a;
    if(!visited.has(other)){visited.add(other);group.push(other);}
   }
  }
  connectedComponents.push(group.sort());
 }
 connectedComponents.sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0]));
 const reviewed=state.mapReview||{};
 const spaces=SPACES.map(space=>{
  const touching=adjacent.get(space.id)||[];
  const actualSignature=touching.map(edgeSignature).sort().join(';');
  // Engine's historic signatures include only neighbor + solid/dashed type.
  // A review is therefore "legacy" when its signature checks adjacency but
  // did not certify Enemy Connection colors.
  const legacySignature=touching.map(e=>`${e.a===space.id?e.b:e.a}:${e.kind}`).sort().join('|');
  const old=reviewed[space.id];
  const status=!old?'unreviewed':old.signature!==legacySignature?'stale':'legacy-review';
  return {id:space.id,name:space.name,territory:space.territory||null,
   degree:touching.length,neighbors:touching.map(e=>e.a===space.id?e.b:e.a).sort(),
   colorEdges:touching.filter(e=>colorOf(e)).length,uncoloredEdges:touching.filter(e=>!colorOf(e)).length,
   status,signature:actualSignature};
 });
 const groups=Object.groupBy(spaces,x=>x.territory||'Special');
 const territories=Object.entries(groups).map(([name,rows])=>({name,total:rows.length,linked:rows.filter(r=>r.degree>0).length,
  reviewed:rows.filter(r=>r.status==='legacy-review').length,isolated:rows.filter(r=>r.degree===0).map(r=>r.id)}));
 const isolated=spaces.filter(x=>x.degree===0).map(x=>x.id);
 const colored={};
 for(const color of ['West','South','East']){
  const origins={West:['W'],South:['S'],East:['E1','E2']}[color];
  const seen=new Set(origins),queue=[...origins];
  for(let i=0;i<queue.length;i++)for(const e of adjacent.get(queue[i])||[]){
   if(!e.enemyFor?.includes(color))continue;
   const next=e.a===queue[i]?e.b:e.a;
   if(!seen.has(next)){seen.add(next);queue.push(next);}
  }
  colored[color]={origins,reachable:[...seen].filter(x=>!origins.includes(x)).sort(),
   edges:(state.edges||[]).filter(e=>e.enemyFor?.includes(color)).length};
 }
 const issues=[...(invalid.length?[`${invalid.length} malformed line(s)`]:[]),...(duplicate.length?[`${duplicate.length} duplicate line(s)`]:[]),
  ...(sourceConflicts.length?[`${sourceConflicts.length} line(s) conflict with printed reference`]:[]),
  ...(isolated.length?[`${isolated.length} space(s) have no recorded connection`]:[])];
 return {spaceCount:spaces.length,edgeCount:edgeKeys.size,spaces,territories,isolated,
  connectedComponents,componentCount:connectedComponents.length,
  sourceCovered:supportedBySource.length,sourceTotal:MAP_EVIDENCE_EDGES.length,
  missingSource,sourceConflicts,duplicate,invalid,colored,issues,
  // No publisher-certified complete graph exists in this bundle. This is
  // deliberately NEVER a claim of board-complete legality.
  officialGraphVerified:false};
}
