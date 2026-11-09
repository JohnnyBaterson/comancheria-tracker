/**
 * Exact, independently source-backed board facts, NOT a complete adjacency map.
 * Living Play Book (Spring 2024), printed page 11, Settling tutorial:
 * Rio Grande #4 and Brazos Colorado #6 are each exactly two Enemy
 * Connection steps from the South's square Enemy Space.
 * A directly colored South link to either is therefore a transcription error.
 * The intervening spaces are not asserted here.
 */
export const SOUTH_TWO_STEP_TARGETS=Object.freeze(['RG-4','BC-6']);

export function southMapFacts(edges){
 const graph=new Map();
 for(const e of edges||[]){
  if(e?.kind!=='solid'||!Array.isArray(e.enemyFor)||!e.enemyFor.includes('South'))continue;
  if(typeof e.a!=='string'||typeof e.b!=='string')continue;
  if(!graph.has(e.a))graph.set(e.a,[]);
  if(!graph.has(e.b))graph.set(e.b,[]);
  graph.get(e.a).push(e.b);graph.get(e.b).push(e.a);
 }
 const dist=new Map([['S',0]]),queue=['S'];
 for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])||[]){
  if(dist.has(next))continue;
  dist.set(next,dist.get(queue[i])+1);queue.push(next);
 }
 return SOUTH_TWO_STEP_TARGETS.map(target=>{
  const distance=dist.has(target)?dist.get(target):null;
  return {from:'S',to:target,publishedDistance:2,recordedDistance:distance,
   status:distance===null||distance>2?'unknown':distance===2?'consistent':'conflict'};
 });
}

export function assertNoContradictedSouthLinks(edges){
 const conflicts=southMapFacts(edges).filter(x=>x.status==='conflict');
 if(conflicts.length){
  throw new Error('Recorded South Enemy Connections contradict the two-step distances in the official playbook, p. 11: '+conflicts.map(x=>x.to).join(', ')+'.');
 }
}
