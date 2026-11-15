/** Turn references already present in an event sentence into read-only board links.
 * Never guesses a location: only a currently mapped piece or printed map space
 * receives a link. Everything else stays plain escaped text. */
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const boundary=(value,start,end)=>!/[\p{L}\p{N}_]/u.test(value[start-1]||'')&&!/[\p{L}\p{N}_]/u.test(value[end]||'');
export function eventMapMatches(value,spaces,findable){
 const text=String(value??'');const candidates=[];
 const push=(name,space,pieceId='')=>{
  if(!name||!space||name.length<4)return;
  let at=0;
  while((at=text.toLowerCase().indexOf(name.toLowerCase(),at))>=0){
   const end=at+name.length;
   if(boundary(text,at,end))candidates.push({start:at,end,space,pieceId,label:text.slice(at,end)});
   at=end;
  }
 };
 for(const sp of spaces||[]){
  const id=sp.id,name=sp.name;
  if(!id||!name)continue;
  push(id,id);
  push(name,id);
  push(name.replace(/ (\d+)$/,' #$1'),id);
 }
 const grouped=new Map();
 for(const piece of findable||[]){
  if(!piece.mapSpace||!piece.label||piece.label.length<4)continue;
  const key=piece.label.toLowerCase();
  grouped.set(key,[...(grouped.get(key)||[]),piece]);
 }
 // Ambiguous identical piece labels must not silently pick one counter.
 for(const group of grouped.values())if(group.length===1)push(group[0].label,group[0].mapSpace,group[0].id);
 candidates.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start)||Number(!!b.pieceId)-Number(!!a.pieceId));
 const chosen=[];let end=0;
 for(const candidate of candidates){if(candidate.start>=end){chosen.push(candidate);end=candidate.end;}}
 return chosen;
}
export function linkEventLocations(value,spaces,findable){
 const text=String(value??'');let result='',cursor=0;
 for(const match of eventMapMatches(text,spaces,findable)){
  result+=escapeHTML(text.slice(cursor,match.start));
  result+=`<button type="button" class="event-map-link" data-action="event-locate" data-space="${escapeHTML(match.space)}" data-piece-id="${escapeHTML(match.pieceId)}" title="Show ${escapeHTML(match.label)} on the board" aria-label="Find ${escapeHTML(match.label)} on the board">${escapeHTML(match.label)}</button>`;
  cursor=match.end;
 }
 return result+escapeHTML(text.slice(cursor));
}
