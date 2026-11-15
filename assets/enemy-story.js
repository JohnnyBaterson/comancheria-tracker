/** Read-only, player-facing account of a completed or continuing Enemy procedure.
 * Uses the actual state ledger; never predicts, rerolls or changes an outcome.
 * Game log is stored newest-first; the UI presents each event in play order.
 */
const START=/\b(?:free|paid) procedure started for\b/i;
const FINISH=/\b(?:finished (?:free|paid) Enemy Instruction procedure|(?:free|paid) Enemy procedure completed)\b/i;
const RELEVANT=/\b(?:Enemy (?:Action|AP|Instruction|Hunt|Raid|Recover)|Subjugate|Settle|Culture Attack|Encroach|War Column|War Ends|Peace:|Ally:|Hunt:|Raid:|Instruction|Recover:|countermeasure)\b/i;
const NOISE=/\b(?:display reset|checkpoint|manually confirmed)\b/i;
/** Rephrase known bookkeeping records. Preserve exact result, place and cost. */
export function describeEnemyEvent(value){
 const line=String(value||'').replace(/\s+/g,' ').trim();
 let m=line.match(/^Selected (.+?) for (free execution|payment)\.?$/i);
 if(m)return `${m[1]} selected${m[2]==='payment'?' for a paid action':' as a free action'}.`;
 m=line.match(/^Paid (\d+) Enemy AP for (.+?):.*$/i);
 if(m)return `Spent ${m[1]} Enemy AP on ${m[2]}.`;
 m=line.match(/^Settle \(([^)]+)\): recorded (?:\w+ )?Settlement into ([A-Z]+-\d+) and returned (\d+) Bison to stock/i);
 if(m)return `${m[1]} placed a Settlement at ${m[2]}; ${m[3]} Bison returned to stock.`;
 m=line.match(/^Enemy Hunt: die (\d+), checked (\d+) territor(?:y|ies), removed (.+?) from (.+?) to stock/i);
 if(m)return `Hunt rolled ${m[1]} and removed ${m[3]} from ${m[4]}.`;
 if(/^Automatically completed verified .* Instruction/i.test(line))return 'Instruction resolved; display updated.';
 if(FINISH.test(line))return 'Enemy action complete. Instruction display reset.';
 if(/^Card exception:/i.test(line))return line.replace(/^Card exception:\s*/, 'Development card changed this result: ');
 return line.replace(/\s*\(\d+(?:\.\d+)+\)/g,'').replace(/\s*\(GMT Living Playbook[^)]*\)/gi,'').trim();
}
export function latestEnemyStory(log,limit=7){
 const events=[...(Array.isArray(log)?log:[])].reverse();
 // Keep the latest procedure, including a still-in-progress one. Avoid joining
 // unrelated turns or showing an invented narrative when no start is recorded.
 let start=-1;
 for(let i=events.length-1;i>=0;i--){
  const msg=String(events[i]?.description||'');
  if(START.test(msg)){start=i;break;}
 }
 if(start<0)return null;
 const first=String(events[start].description||'');
 const enemy=first.match(/started for\s+(North|South|East|West)/i)?.[1]||'Enemy';
 const isFree=/free procedure/i.test(first);
 let end=events.length;
 for(let i=start+1;i<events.length;i++){
  if(FINISH.test(String(events[i]?.description||''))){end=i+1;break;}
  if(START.test(String(events[i]?.description||''))){end=i;break;}
 }
 const all=events.slice(start,end);
 const steps=all.filter((event,i)=>i>0&&(RELEVANT.test(event.description||'')||FINISH.test(event.description||''))&&!NOISE.test(event.description||''))
  .map(event=>describeEnemyEvent(event.description))
  .filter(Boolean);
 return {enemy,kind:isFree?'Free':'Paid',completed:all.some(e=>FINISH.test(String(e.description||''))),steps:steps.slice(-limit),hidden:Math.max(0,steps.length-limit)};
}
