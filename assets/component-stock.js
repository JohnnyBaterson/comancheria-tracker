/** Physical stock audit: artwork faces are NOT individual printed pieces.
 * Quantities here are used only where the original countersheets / playbook
 * establish them. Unverified stock has an explicitly unknown ceiling. */
export const VERIFIED_STOCK=Object.freeze([
 {key:'Band:3',label:'3–4 Band counters',total:3,source:'Countersheet 1, front: three 3–4 counter faces'},
 {key:'Band:2',label:'2–5 Band counters',total:5,source:'Countersheet 1, front: five 2–5 counter faces'},
 {key:'Tribe',label:'Tribe hex counters',total:18,source:'Living Playbook opening: 17 Tribes on map, one remaining in Out of Play'},
 {key:'Bison',label:'Bison counters',total:18,source:'Owner-counted physical game inventory'},
 {key:'Resource:Horse',label:'Horse counters',total:16,source:'Owner-counted physical game inventory'},
 {key:'Resource:Guns',label:'Guns counters',total:4,source:'Owner-counted physical game inventory'},
 {key:'Resource:Captives',label:'Captives counters',total:5,source:'Owner-counted physical game inventory'},
 {key:'Resource:Trade Goods',label:'Trade Goods counters',total:5,source:'Owner-counted physical game inventory'},
 {key:'Resource:Food',label:'Food counters',total:5,source:'Owner-counted physical game inventory'},
 {key:'Instruction',label:'Enemy Instruction A–G',total:28,source:'Living Playbook: 24 A–F, four G counters'},
 {key:'Marker:Success',label:'Success Check counters',total:20,playableTotal:10,source:'Living Rules §9.1.1: two identical sets; only one 10-Success set in play'},
 {key:'Marker:Enemy AP 4',label:'Enemy AP 4 counters',total:10,playableTotal:5,source:'Living Rules §9.1.1: two identical sets; only one 5-AP4 set in play'},
 {key:'Marker:Enemy AP 3',label:'Enemy AP 3 counters',total:8,playableTotal:4,source:'Living Rules §9.1.1: two identical sets; only one 4-AP3 set in play'},
 {key:'Marker:Enemy AP 2',label:'Enemy AP 2 counters',total:6,playableTotal:3,source:'Living Rules §9.1.1: two identical sets; only one 3-AP2 set in play'},
 {key:'Rancheria',label:'Rancherías A–E',total:5,source:'Countersheet A–E identities (one of each)'},
 {key:'Paraibo',label:'Paraibos A–E',total:5,source:'Countersheet A–E identities (one of each)'},
 {key:'Mahimiana',label:'Mahimianas A–E',total:5,source:'Countersheet A–E identities (one of each)'},
 {key:'Marker:Mahimiana Medicine',label:'Mahimiana Medicine A–E',total:5,source:'Play Book p.3 and Living Rules §2.6: distinct Mahimiana Medicine counters'},
]);
const TOTALS=new Map(VERIFIED_STOCK.map(x=>[x.key,x]));
export const UNKNOWN_STOCK_FAMILIES=Object.freeze(['Band:1','Band:unidentified','Settlement:East','Settlement:South','Settlement:West','Marker:Ravaged','War Column']);
export function componentStockKey(p){
 if(p.type==='Band')return `Band:${Number.isInteger(p.stockStrength)&&p.stockStrength>=1&&p.stockStrength<=3?p.stockStrength:(p.strength>0?p.strength:'unidentified')}`;
 if(p.type==='Marker'&&['Success','Enemy AP 4','Enemy AP 3','Enemy AP 2','Ravaged','Mahimiana Medicine'].includes(p.hiddenSubtype||p.subtype))return `Marker:${p.hiddenSubtype||p.subtype}`;
 if(p.type==='Resource')return `Resource:${p.subtype==='Horses'?'Horse':p.subtype}`;
 if(p.type==='Settlement')return `Settlement:${p.owner}`;
 if(p.type==='War Column')return `War Column:${p.owner}:${p.counterFaction||'unknown'}`;
 return p.type;
}
export function componentStockLocation(p){
 const loc=p.location||'';
 if(loc==='reserve')return 'reserve';
 if(loc==='removed')return 'removed';
 if(loc==='out-of-play')return 'out-of-play';
 if(loc==='cup'||loc==='check-draw'||loc==='success-out'||loc==='available-enemy-aps')return loc;
 if(loc.startsWith('box:'))return 'rancheria-box';
 if(loc.startsWith('held:'))return 'possessed';
 if(loc.startsWith('medicine:'))return 'medicine-track';
 if(loc.startsWith('enemy-display:'))return 'enemy-display';
 if(loc.startsWith('enemy-inactive:'))return 'enemy-inactive';
 if(loc==='operations'||loc==='enemy-resolution')return loc;
 return 'map-or-track';
}
/** Totals are per unique piece id. A two-sided piece is counted once. */
export function stockCertifiedTotal(key,declaredTotals={}){return TOTALS.get(key)?.playableTotal??TOTALS.get(key)?.total??(Number.isInteger(declaredTotals[key])?declaredTotals[key]:null);}
export function componentStockAudit(pieces,declaredTotals={}){
 const groups=new Map();
 for(const p of pieces){
  const key=componentStockKey(p),fixed=TOTALS.get(key),declared=declaredTotals[key],total=fixed?.total??(Number.isInteger(declared)?declared:null),group=groups.get(key)||{key,label:fixed?.label||key,printedTotal:total,playableTotal:fixed?.playableTotal??total,source:fixed?.source||(Number.isInteger(declared)?'Player-certified physical inventory':'Total physical quantity not certified from available source'),counted:0,locations:{},ids:[]};
  group.counted++;group.ids.push(p.id);const location=componentStockLocation(p);group.locations[location]=(group.locations[location]||0)+1;groups.set(key,group);
 }
 for(const known of VERIFIED_STOCK)if(!groups.has(known.key))groups.set(known.key,{key:known.key,label:known.label,printedTotal:known.total,playableTotal:known.playableTotal??known.total,source:known.source,counted:0,locations:{},ids:[]});
 for(const key of new Set([...UNKNOWN_STOCK_FAMILIES,...Object.keys(declaredTotals)]))if(!groups.has(key))groups.set(key,{key,label:key,printedTotal:Number.isInteger(declaredTotals[key])?declaredTotals[key]:null,playableTotal:Number.isInteger(declaredTotals[key])?declaredTotals[key]:null,source:Number.isInteger(declaredTotals[key])?'Player-certified physical inventory':'Total physical quantity not certified from available source',counted:0,locations:{},ids:[]});
 const rows=[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(x=>({...x,unregistered:x.printedTotal==null?null:Math.max(0,x.playableTotal-x.counted),spares:x.printedTotal===null?null:x.printedTotal-x.playableTotal,available:x.playableTotal===null?(x.locations.reserve||0):Math.max(0,x.playableTotal-x.counted)+(x.locations.reserve||0),overstock:x.playableTotal!==null&&x.counted>x.playableTotal}));
 return {rows,overstock:rows.filter(x=>x.overstock),incomplete:rows.filter(x=>x.printedTotal===null),registered:pieces.length,certified:rows.filter(x=>x.printedTotal!==null).length};
}
