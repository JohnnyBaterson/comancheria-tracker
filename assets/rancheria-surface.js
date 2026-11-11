/** A read-only projection of the physical Ranchería box and its Medicine tracks.
 * No inferred resources or Medicine: this draws only counters actually recorded
 * in the game reducer's state. Clicking UI objects never mutates this model. */
export function rancheriaSurfaceModel(state, rancheriaId) {
 const pieces=state?.pieces||[];
 const ranch=pieces.find(p=>p.id===rancheriaId&&p.type==='Rancheria');
 if(!ranch)return null;
 const box=`box:${ranch.id}`;
 const contents=pieces.filter(p=>p.location===box&&p.id!==ranch.id);
 const members=pieces.filter(p=>['Mahimiana','Paraibo'].includes(p.type)&&p.location!=='reserve'&&p.location!=='removed'&&(
  p.affiliatedRancheriaId===ranch.id||p.location===box||Boolean(ranch.subtype)&&String(p.subtype||'').toUpperCase()===String(ranch.subtype).toUpperCase()));
 const headmen=members.map(p=>{
  const success=pieces.filter(q=>q.type==='Marker'&&q.subtype==='Success'&&q.location===`medicine:${p.id}`);
  const fallback=members.filter(x=>x.type===p.type).length===1&&pieces.filter(x=>x.type==='Rancheria'&&x.location!==`box:${x.id}`&&x.location!=='removed').length===1
   ?state.medicine?.[p.type==='Mahimiana'?'mahimiana':'paraibo']:null;
  const value=Number.isInteger(p.medicine)?p.medicine:Number.isInteger(fallback)?fallback:null;
  return {...p,medicineValue:value,success};
 });
 const localBands=pieces.filter(p=>p.type==='Band'&&(p.location===box||p.location===ranch.location));
 const carried=localBands.map(band=>({band,counters:pieces.filter(p=>p.location===`held:${band.id}`)})).filter(entry=>entry.counters.length);
 return {ranch,contents,headmen,carried, stored:contents.filter(p=>['Resource','Bison'].includes(p.type)),
  bands:contents.filter(p=>p.type==='Band'),
  missingHeadmanTypes:['Mahimiana','Paraibo'].filter(type=>headmen.filter(p=>p.type===type).length!==1),
  onMap:ranch.location!==box&&ranch.location!=='reserve'&&ranch.location!=='removed'};
}
