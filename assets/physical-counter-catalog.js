/** Original owner-supplied TTS counter sheets, numbered 1–184. This file
 * contains only counter identities and index references, NO copyrighted art.
 * A face index identifies artwork, not a verified physical stock quantity. */
export const PHYSICAL_FACE_COUNT=184;
export const PHYSICAL_FACES=Object.freeze(Array.from({length:PHYSICAL_FACE_COUNT},(_,i)=>{
 const n=i+1;
 const face=(family,label,extra={})=>Object.freeze({index:n,family,label,...extra});
 if(n===1)return face('Ravaged','Ravaged');
 if(n===2)return face('Tribe','Tribe front');
 if(n===3)return face('Tribe','Tribe reverse');
 if(n>=4&&n<=9){const family=['East','South','West'][Math.floor((n-4)/2)];return face('Settlement',`${family} Settlement ${n%2===0?'front':'reverse'}`,{owner:family,reverse:n%2===1});}
 if(n>=10&&n<=14)return face('Rancheria',`Ranchería ${'ABCDE'[n-10]}`,{letter:'ABCDE'[n-10]});
 if(n>=15&&n<=20)return face('Track',['APs','Culture Points','Military Points','MPs','Operations','Passage of Time'][n-15]);
 const warSeries=[['East','Texas',21,28],['East','USA',29,36],['South','Spain',37,44],['South','Mexico',45,52],['North','North',53,58],['West','Spain',59,66],['West','USA',67,74],['West','Mexico',75,82]];
 for(const [owner,faction,from,to] of warSeries)if(n>=from&&n<=to)return face('War Column',`${owner} ${faction} strength ${n-from+1}`,{owner,faction,strength:n-from+1});
 if(n>=83&&n<=88){const strength=Math.floor((n-83)/2)+1;return face('Band',`Band ${strength}–${n%2===0?'F':7-strength}`,{strength,finished:n%2===0});}
 for(const [owner,from,to] of [['East',89,102],['South',103,116],['West',117,130],['North',171,184]])if(n>=from&&n<=to){const letter='ABCDEFG'[Math.floor((n-from)/2)];return face('Instruction',`${owner} ${letter} ${((n-from)%2)?'reverse':'front'}`,{owner,letter,reverse:((n-from)%2)===1});}
 if(n===131||n===132)return face('Track','Available Enemy APs '+(n===131?'front':'reverse'));
 if(n===133||n===134)return face('Resource','Captives '+(n===133?'front':'population reverse'));
 if(n===135||n===136)return face('Resource','Food '+(n===135?'front':'population reverse'));
 if(n===137)return face('Resource','Trade Goods');
 if(n===138)return face('Resource','Re-roll / Re-draw reverse');
 if(n===139)return face('Resource','Guns');
 if(n>=140&&n<=147)return face('Enemy Space','Enemy Space '+(n-139));
 if(n>=148&&n<=152)return face('Mahimiana',`Mahimiana ${'ABCDE'[n-148]}`,{letter:'ABCDE'[n-148]});
 if(n>=153&&n<=162){const letter='ABCDE'[Math.floor((n-153)/2)];return face('Paraibo',`${letter} ${n%2===1?'Medicine':'Paraibo'}`,{letter,medicine:n%2===1});}
 if(n>=163&&n<=167)return face('Mahimiana',`Medicine ${'ABCDE'[n-163]}`,{letter:'ABCDE'[n-163],medicine:true});
 if(n===168)return face('Resource','Horses');
 if(n===169||n===170)return face('Bison',`Bison ${n===169?'front':'population reverse'}`);
 throw Error('Unindexed source face '+n);
}));

const WAR_FIRST=Object.freeze({'East:Texas':21,'East:USA':29,'South:Spain':37,'South:Mexico':45,North:53,'West:Spain':59,'West:USA':67,'West:Mexico':75});
const INSTRUCTION_FIRST=Object.freeze({East:89,South:103,West:117,North:171});
function ownerOfSettlement(piece){
 const owner=String(piece.owner||'');const subtype=String(piece.subtype||'');
 // Spain may be either West or South; a country flag alone is insufficient.
 const raw=[owner,subtype];
 const matches=raw.filter(v=>['East','South','West'].includes(v));
 return new Set(matches).size===1?matches[0]:null;
}
function letterOf(piece){
 const subtype=String(piece.subtype||'').toUpperCase();
 if(/^[A-E]$/.test(subtype))return subtype;
 const match=/\b([A-E])\b/.exec(String(piece.label||'').toUpperCase());return match?.[1]||null;
}
function instructionLetterOf(piece){
 const id=/^setup-instruction-(East|South|West|North)-([A-G])$/.exec(String(piece.id||''));
 if(id)return {owner:id[1],letter:id[2]};
 const label=/\b(East|South|West|North)\s+([A-G])\b/.exec(String(piece.label||''));
 return label?{owner:label[1],letter:label[2]}:null;
}
/** Return the one source image index justified by piece identity AND face.
 * Null indicates missing/ambiguous provenance: never guess a physical tile. */
export function physicalCounterFaceIndex(p){
 if(!p||p.faceDown)return null;
 switch(p.type){
  case 'Band':{const strength=p.strength>0?p.strength:p.stockStrength;return Number.isInteger(strength)&&strength>=1&&strength<=3?83+2*(strength-1)+(p.strength>0&&p.finished?1:0):null;}
  case 'War Column':{
   const key=p.owner==='North'?'North':`${p.owner}:${p.counterFaction||''}`;
   const first=WAR_FIRST[key],max=key==='North'?6:8;
   return first&&Number.isInteger(p.strength)&&p.strength>=1&&p.strength<=max?first+p.strength-1:null;
  }
  case 'Instruction':{
   const ident=instructionLetterOf(p);
   if(!ident||p.owner!==ident.owner)return null;
   return INSTRUCTION_FIRST[ident.owner]+('ABCDEFG'.indexOf(ident.letter)*2)+(p.flipped?1:0);
  }
  case 'Tribe':return 2;
  case 'Bison':return 169;
  case 'Rancheria':{const letter=letterOf(p);return letter?10+'ABCDE'.indexOf(letter):null;}
  case 'Settlement':{const owner=ownerOfSettlement(p);return owner?{East:4,South:6,West:8}[owner]:null;}
  case 'Mahimiana':{const letter=letterOf(p);return letter?148+'ABCDE'.indexOf(letter):null;}
  case 'Paraibo':{const letter=letterOf(p);return letter?154+2*'ABCDE'.indexOf(letter):null;}
  case 'Resource':return ({Horse:168,Horses:168,Food:135,'Trade Goods':137,Captives:133,Guns:139,Bison:169})[p.subtype]||null;
  case 'Marker':{if(p.subtype==='Mahimiana Medicine'){const m=String(p.affiliatedRancheriaId||'').match(/setup-ranch-([A-E])$/);return m?163+'ABCDE'.indexOf(m[1]):null;}return ({Ravaged:1,APs:15,'Culture Points':16,'Military Points':17,MPs:18,Operations:19,'Passage of Time':20,'Available Enemy APs':131})[p.subtype]||null;}
  default:return null;
 }
}
export function physicalCounterFace(p){const n=physicalCounterFaceIndex(p);return n?PHYSICAL_FACES[n-1]:null;}
export function physicalCounterCoverage(pieces){
 const byType={};let matched=0,ambiguous=0;
 for(const p of pieces){const row=byType[p.type]??={total:0,matched:0,unmatched:0};row.total++;
  if(physicalCounterFaceIndex(p)){matched++;row.matched++;}else{ambiguous++;row.unmatched++;}}
 return {matched,unmatched:ambiguous,total:pieces.length,byType};
}

// Clean, original digital stand-in artwork for counters whose TTS image was
// not locally imported or for which the 184-face source contains no image.
// This is not represented as the original printed publisher artwork.
const proxyUrls=new Map();
const xml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function digitalCounterProxyUrl(piece){
 const identified=physicalCounterFace(piece);
 const hidden=Boolean(piece?.faceDown);
 const kind=hidden?'HIDDEN':String(piece?.type||'Counter');
 const colors={Band:['#b17b3f','#e8d29d'],Rancheria:['#9f422e','#f4d5b9'],Instruction:['#225780','#d5eaff'],Marker:['#535d6a','#f2ede1'],Resource:['#7c5b23','#ffe3ab'],Bison:['#5c4734','#f8dec1'],Tribe:['#5e6868','#f0eeee'],Settlement:['#405d78','#e2efff'],'War Column':['#6e3d48','#fce5e6'],Paraibo:['#4a668d','#e6eefa'],Mahimiana:['#8e313b','#ffe4df'],Other:['#555b5c','#f7f3e9']};
 const [bg,fg]=hidden?['#55575e','#f2f2f2']:(colors[kind]||colors.Other);
 const main=hidden?'?':piece?.type==='Band'&&[1,2,3].includes(piece.strength)?`${piece.strength}–${piece.finished?'F':7-piece.strength}`:piece?.type==='War Column'&&piece.strength?String(piece.strength):piece?.type==='Marker'&&/^Enemy AP [234]$/.test(piece.subtype||'')?piece.subtype.slice(-1):piece?.type==='Instruction'?((piece.flipped?'◀ ':'')+(String(piece.subtype||'')||'ACTION')).slice(0,9):piece?.type==='Rancheria'?String(piece.subtype||'⌂'):piece?.type==='Resource'?String(piece.subtype||'RESOURCE').slice(0,10):piece?.type==='Marker'?String(piece.subtype||'MARKER').slice(0,10):piece?.type==='Bison'?'BISON':piece?.type==='Tribe'?'TRIBE':piece?.type==='Settlement'?'SETTLE':piece?.type==='Mahimiana'?'M':piece?.type==='Paraibo'?'P':String(piece?.type||'?').slice(0,10);
 const top=hidden?'FACE DOWN':kind.toUpperCase().slice(0,15);
 const foot=hidden?'':identified?`FACE #${identified.index} PROXY`:'DIGITAL PROXY';
 const cacheKey=[bg,fg,top,main,foot].join('|');if(proxyUrls.has(cacheKey))return proxyUrls.get(cacheKey);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect x="2" y="2" width="156" height="156" rx="12" fill="${bg}" stroke="${fg}" stroke-width="4"/><rect x="11" y="11" width="138" height="138" rx="8" fill="none" stroke="${fg}" stroke-opacity=".55" stroke-width="2"/><text x="80" y="35" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${fg}">${xml(top)}</text><text x="80" y="96" text-anchor="middle" font-family="sans-serif" font-size="${String(main).length>7?17:34}" font-weight="800" fill="${fg}">${xml(main)}</text><text x="80" y="135" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${fg}">${xml(foot)}</text></svg>`;
 const url='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
 if(proxyUrls.size>512)proxyUrls.clear();proxyUrls.set(cacheKey,url);return url;
}
