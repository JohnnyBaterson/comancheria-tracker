/** Finite, identity-preserving Comanchería Success Check draw cup.
 * A drawable physical piece occupies one place at a time. There is no
 * duplicated deck, imaginary replacement, or client-side random selection.
 * Source: GMT Living Rules §§2.9, 3.4, 4.4 step 8, 6.2.2 and 9.1.1. */
export const CUP_SETUP_COUNTS=Object.freeze({Success:10,'Enemy AP 4':5,'Enemy AP 3':4,'Enemy AP 2':3});
export const CUP_ORIGINAL_TOTAL=Object.values(CUP_SETUP_COUNTS).reduce((a,b)=>a+b,0);
const MARKER_NAMES=new Set(Object.keys(CUP_SETUP_COUNTS));
export function cupMarkerName(piece){
 if(piece?.type!=='Marker')return null;
 const label=piece.faceDown&&piece.hiddenSubtype?piece.hiddenSubtype:piece.subtype;
 return MARKER_NAMES.has(label)?label:null;
}
export function cupDrawable(piece){return piece?.location==='cup'&&(piece.type==='Instruction'||Boolean(cupMarkerName(piece)));}
function publicCounterName(piece){return piece.faceDown?'Face-down ?':piece.type==='Instruction'?`${piece.owner||'?'} Instruction ${piece.subtype}`:cupMarkerName(piece)||'Unknown';}
export function cupInventory(s){
 const all=s.pieces||[],originals=all.filter(p=>p.type==='Marker'&&/^setup-cup-/.test(p.id||'')),inCup=all.filter(cupDrawable);
 const zones={cup:[],drawn:[],availableEnemyAP:[],successOut:[],medicine:[],operations:[],map:[],other:[]};
 const totals=Object.fromEntries(Object.keys(CUP_SETUP_COUNTS).map(name=>[name,0]));
 for(const p of originals){
  const name=cupMarkerName(p);if(name)totals[name]++;
  const location=p.location||'';
  const key=location==='cup'?'cup':location==='check-draw'?'drawn':location==='available-enemy-aps'?'availableEnemyAP':location==='success-out'?'successOut':location.startsWith('medicine:')?'medicine':location==='operations'?'operations':/^([A-Z]{1,3}-\d+|N|W|S|E[12]|PD|RESERVATION)$/.test(location)?'map':'other';
  zones[key].push({id:p.id,type:publicCounterName(p),location});
 }
 const issues=[];
 if(s.setupTemplate==='official'){
  for(const [name,expected] of Object.entries(CUP_SETUP_COUNTS))if(totals[name]!==expected)issues.push(`Expected ${expected} ${name} physical cup markers, found ${totals[name]}.`);
  if(originals.length!==CUP_ORIGINAL_TOTAL)issues.push(`Expected ${CUP_ORIGINAL_TOTAL} original playable cup markers, found ${originals.length}.`);
  for(const [name,expected] of Object.entries(CUP_SETUP_COUNTS))for(let n=1;n<=expected;n++){const id=`setup-cup-${name.replaceAll(' ','-')}-${n}`;if(!originals.some(p=>p.id===id&&cupMarkerName(p)===name))issues.push(`Missing or incorrect physical counter ${id}.`);}
 }
 for(const p of all.filter(p=>p.location==='cup'&&!cupDrawable(p)))issues.push(`${p.id} is not a verified drawable counter.`);
 return {capacity:CUP_ORIGINAL_TOTAL,originals:originals.length,totals,inCup:inCup.length,cupContents:inCup.map(p=>({id:p.id,type:publicCounterName(p),faceDown:Boolean(p.faceDown)})),
   cupByType:Object.fromEntries(['Success','Enemy AP 4','Enemy AP 3','Enemy AP 2','Instruction','Face-down ?'].map(type=>[type,inCup.filter(p=>type==='Face-down ?'?p.faceDown:type==='Instruction'?p.type==='Instruction'&&!p.faceDown:!p.faceDown&&cupMarkerName(p)===type).length])),
   zones,issues};
}
/** Uniform sampling over the currently drawable physical IDs. PRNG state is
 * advanced with a rejection-sampled 32-bit value (not a d6 face, not modulo
 * bias). A stable ID ordering makes the same saved seed reproducible. */
export function drawCupCounter(s,nextSeededDie){
 const pool=s.pieces.filter(cupDrawable).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 if(!pool.length)throw new Error('No drawable physical counters remain in the Success Check cup.');
 const span=4294967296,limit=span-span%pool.length;
 let result,draws=0;
 do{
  result=nextSeededDie(s.rng.seed);
  s.rng.seed=result.seed;s.rng.rolls++;
  if(++draws>128)throw new Error('Could not sample the physical cup fairly.');
 }while(result.seed>=limit);
 return pool[result.seed%pool.length];
}
/** A face-down ? marker in the cup still has a private, recorded identity. */
export function revealCupCounter(p){
 if(p.type==='Marker'&&p.faceDown&&p.subtype==='?'&&cupMarkerName(p)){
  p.subtype=p.hiddenSubtype;delete p.hiddenSubtype;p.faceDown=false;
 }
}

/** A physical Enemy AP marker is recycled as soon as its AP value is spent.
 * Validate the entire selection before moving anything: duplicate, forged,
 * already-recycled and non-AP counters are never legitimate payments.
 * Track points are not physical counters and must not create cup pieces. */
export function recycleSpentEnemyAp(s,ids){
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw new Error('An Enemy AP counter may be returned only once per payment.');
 const pieces=ids.map(id=>s.pieces.find(p=>p.id===id));
 if(pieces.some(p=>!p||p.type!=='Marker'||!/^Enemy AP [234]$/.test(p.subtype||'')||p.location!=='available-enemy-aps'||p.faceDown))throw new Error('Spent Enemy AP counter must be a unique, visible physical marker from the Available Enemy AP box.');
 const value=pieces.reduce((sum,p)=>sum+Number(p.subtype.at(-1)),0);
 for(const p of pieces)p.location='cup';
 return {ids:[...ids],count:pieces.length,value};
}
