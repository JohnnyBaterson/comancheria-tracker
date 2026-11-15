/** Read-only location resolver for the board Counter Finder. */
export function counterMapLocation(pieces, piece, knownSpaces, depth=0) {
  if (!piece || depth>5) return null;
  if (knownSpaces.has(piece.location)) return piece.location;
  if (typeof piece.location!=='string') return null;
  const match=/^(?:held|box):(.+)$/.exec(piece.location);
  if (!match) return null;
  const carrier=pieces.find(candidate=>candidate.id===match[1]);
  return carrier&&carrier.id!==piece.id?counterMapLocation(pieces,carrier,knownSpaces,depth+1):null;
}
export function findableCounters(pieces, knownSpaces) {
  return (pieces||[]).filter(p=>p&&p.id&&p.location!=='removed'&&p.location!=='reserve').map(p=>({
    id:p.id,label:p.label||p.subtype||p.type||p.id,type:p.type||'Other',subtype:p.subtype||'',
    location:p.location,mapSpace:counterMapLocation(pieces,p,knownSpaces),
    category:p.type==='Band'?'Bands':p.type==='Rancheria'?'Rancherías':
      ['Settlement','War Column','Tribe','Instruction'].includes(p.type)?'Enemies & tribes':
      ['Resource','Bison'].includes(p.type)?'Resources':'Other',
  }));
}
export function counterFinderGroups(items){
  const order=['Bands','Rancherías','Enemies & tribes','Resources','Other'];
  return order.map(name=>({name,items:items.filter(i=>i.category===name)})).filter(g=>g.items.length);
}
