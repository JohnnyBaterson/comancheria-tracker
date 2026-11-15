/** Read-only board history. History snapshots remain the authoritative source;
 * inspection never calls the reducer, persistence, Undo or Redo. */
const tracked = ['military','culture','ap','enemyAp','movement','operations','passage'];
const describePiece = piece => piece?.label || piece?.subtype || piece?.id || 'Counter';
const location = value => value === 'removed' ? 'out of play' : value === 'reserve' ? 'supply' : value || 'unknown';
export function replayCheckpoints(history, live) {
  const past = Array.isArray(history?.past) ? history.past : [];
  return [...past, live].filter(Boolean);
}
export function compareCheckpoints(before, after) {
  if (!before || !after) return {pieces:[], tracks:[], cards:[], phase:null, message:'Opening setup'};
  const originals=new Map((before.pieces||[]).map(p=>[p.id,p]));
  const updated=new Map((after.pieces||[]).map(p=>[p.id,p]));
  const pieces=[];
  for (const id of new Set([...originals.keys(),...updated.keys()])) {
    const a=originals.get(id),b=updated.get(id);
    if(!a||!b){pieces.push({id,label:describePiece(b||a),before:a?location(a.location):'not present',after:b?location(b.location):'not present'});continue;}
    const fields=['location','strength','finished','flipped','medicineValue','owner'];
    const changed=fields.filter(f=>a[f]!==b[f]);
    if(changed.length){
      const detail=changed.filter(f=>f!=='location').map(f=>`${f==='medicineValue'?'medicine':f}: ${a[f]??'—'} → ${b[f]??'—'}`).join(', ');
      pieces.push({id,label:describePiece(b),before:location(a.location),after:location(b.location),detail});
    }
  }
  const tracks=[];
  for(const key of new Set([...tracked,...Object.keys(before.tracks||{}),...Object.keys(after.tracks||{})])){
    if(before.tracks?.[key]!==after.tracks?.[key]&&(before.tracks?.[key]!=null||after.tracks?.[key]!=null))tracks.push({name:key,before:before.tracks?.[key]??'—',after:after.tracks?.[key]??'—'});
  }
  if(before.operationsPosition!==after.operationsPosition)tracks.push({name:'Operations position',before:before.operationsPosition??'—',after:after.operationsPosition??'—'});
  if(before.passagePosition!==after.passagePosition)tracks.push({name:'Passage position',before:before.passagePosition??'—',after:after.passagePosition??'—'});
  const oldCards=new Map((before.cards||[]).map(c=>[c.id,c]));
  const cards=(after.cards||[]).filter(c=>!oldCards.has(c.id)||oldCards.get(c.id).zone!==c.zone).map(c=>({name:c.title||c.identifier||c.id,before:oldCards.get(c.id)?.zone||'not present',after:c.zone||'unknown'}));
  const phase=(before.phase!==after.phase||before.operation!==after.operation)?`${before.phase||'setup'}${before.operation?' · '+before.operation:''} → ${after.phase||'setup'}${after.operation?' · '+after.operation:''}`:null;
  const beforeIds=new Set((before.log||[]).map(e=>e.seq));
  const newEvents=(after.log||[]).filter(e=>!beforeIds.has(e.seq));
  return {pieces,tracks,cards,phase,events:newEvents};
}
export function replayEntry(checkpoints,index){
  const after=checkpoints[index];
  if(!after)return null;
  const before=checkpoints[index-1];
  const difference=compareCheckpoints(before,after);
  const event=difference.events?.[0];
  return {index,after,before,difference,summary:event?.description|| (index===0?'Opening board position':difference.phase||`${difference.pieces.length} counter changes, ${difference.tracks.length} track changes`),command:event?.command||'',live:index===checkpoints.length-1};
}
