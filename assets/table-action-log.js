/** Plain, player-facing journal. The game ledger remains unchanged. */
export function chronologicalTableEvents(log){
 return [...(Array.isArray(log)?log:[])].reverse();
}
export function briefTableEvent(description){
 const value=String(description??'').replace(/\s+/g,' ').trim();
 if(!value)return 'Game state updated.';
 // Discard technical rule references and journal-only labels, not game events.
 const clean=value.replace(/\s*§\s*[\d.]+(?:\.[A-Z])?/g,'').replace(/\s*\(§[^)]*\)/g,'').replace(/^(?:Seeded digital |Automatic |Verified digital )/i,'').trim();
 // Preserve meaningful numbers and names; show one concise, readable line.
 const first=clean.split(/(?<=[.!?])\s+(?=[A-Z])/)[0].replace(/;\s+/g,', ').trim();
 const clipped=first.length>150?first.slice(0,147).replace(/[,;:\s]+$/,'')+'…':first;
 return /[.!?…]$/.test(clipped)?clipped:clipped+'.';
}
