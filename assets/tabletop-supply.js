/** Permanent tabletop supply bins. Classify by authoritative ledger location,
 * never clone a counter between trays. Reserve means reusable stock, while
 * success-out is a temporary Success holding area and removed is permanent.
 */
export function tabletopSupplyModel(state){
 const pieces=Array.isArray(state?.pieces)?state.pieces:[];
 const available=pieces.filter(piece=>piece.type==='Resource'&&piece.location==='reserve');
 const outOfPlay=pieces.filter(piece=>piece.location==='success-out'||(piece.location==='removed'&&['Resource','Marker'].includes(piece.type)));
 const ids=new Set();
 for(const piece of [...available,...outOfPlay]){
  if(!piece.id||ids.has(piece.id))throw Error('Duplicate or missing physical supply counter identity.');
  ids.add(piece.id);
 }
 return {available,outOfPlay};
}
