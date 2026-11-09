import {warCard,warMovementAllowance,warEventPreview} from './war-card-effects.js';
import {MAP_EVIDENCE_EDGES, MAP_EVIDENCE_SOURCE} from './map-evidence.js';
import {assertNoContradictedSouthLinks} from './map-fact-checks.js';
/**
 * Comanchería tabletop companion — intentionally partial, versioned rules engine.
 * No GMT imagery or card text is redistributed. Source: Spring 2024 Living Rules.
 * A validated command is NOT a claim of full rules compliance. See README.
 */
export const VERSION = '0.51.0-headman-passage-release-candidate';
export const RULES_SOURCE = 'GMT Games, Comanchería Second Edition Living Rules, Spring 2024';
export const TERRITORIES = [
  ['UA','Upper Arkansas'], ['LE','Llano Estacado'], ['RG','Rio Grande'],
  ['BC','Brazos Colorado'], ['RR','Red River'], ['LA','Lower Arkansas']
];
export const SQUARES = [
  ['N','North enemy'], ['W','West enemy'], ['S','South enemy'],
  ['E1','East enemy · north'], ['E2','East enemy · south']
];
export const SPACES = [
  ...TERRITORIES.flatMap(([id,name])=>Array.from({length:6}, (_,i)=>({id:`${id}-${i+1}`,name:`${name} ${i+1}`,type:'round',territory:id,area:i+1}))),
  {id:'PD',name:'Palo Duro Canyon',type:'canyon'},
  ...SQUARES.map(([id,name])=>({id,name,type:'enemy'})),
  {id:'RESERVATION',name:'Reservation',type:'reservation'},
];
export const SPACE = Object.fromEntries(SPACES.map(x=>[x.id,x]));
export const SCENARIOS = [
  ['plains','Onto the Plains','1700–1749'],
  ['rise','Rise of Empire','1700–1799'],
  ['lords','Lords of the Southern Plains','1700–1849'],
  ['downfall','Downfall','1800–1875'],
  ['campaign','Rise and Fall of the Comanche Empire','1700–1875']
];
export const PIECE_TYPES = ['Band','Rancheria','Paraibo','Mahimiana','Resource','Bison','Settlement','Tribe','War Column','Instruction','Marker','Other'];
export const RESOURCES = ['Horse','Food','Trade Goods','Captives','Guns','Bison','Other'];
export const CARD_EVIDENCE_STATES = Object.freeze(['unverified','source-located','checked-against-print']);
export function cardEvidenceAudit(state){
 const summary={total:state.cards.length,unverified:0,sourceLocated:0,checkedAgainstPrint:0,missingIdentifiers:0,withoutSources:0};
 for(const card of state.cards){
  const evidence=card.evidenceStatus||'unverified';
  if(evidence==='source-located')summary.sourceLocated++;else if(evidence==='checked-against-print')summary.checkedAgainstPrint++;else summary.unverified++;
  if(!String(card.identifier||'').trim())summary.missingIdentifiers++;
  if(evidence!=='unverified'&&!String(card.sourceReference||'').trim())summary.withoutSources++;
 }
 return summary;
}

export const ENEMIES = ['North','West','South','East','Spain','Mexico','Texas','USA','None'];
export const OPERATIONS = ['Take Actions','Culture','Planning','Passage of Time'];
export const PHASES = ['setup','war','selection','execution','cleanup','gameover'];
// Final Historical Period for each printed scenario (§9.2–9.6).
export const SCENARIO_FINAL_PERIOD = Object.freeze({plains:1,rise:2,lords:3,downfall:4,campaign:4});
export function finalPeriodForScenario(scenario){if(!Object.hasOwn(SCENARIO_FINAL_PERIOD,scenario))fail('Unknown scenario.');return SCENARIO_FINAL_PERIOD[scenario];}


// The checklists are ORIGINAL summaries and pointers, not a reproduction of game rules.
export const CHECKLIST = {
  war: [
    ['w1','Discard prior War Event; if War Columns exist, draw movement card and move them','3.1 step 1'],
    ['w2','Roll for each War Column and apply any strength loss','3.1 step 2'],
    ['w3','Draw and resolve the next War Event card','3.1 step 3'],
    ['w4','Resolve all required Battles in War Spaces without Rancherías','3.1 step 4'],
    ['w5','Resolve all War Spaces containing Rancherías, including any repeat battles','3.1 step 5'],
  ],
  'Take Actions': [
    ['a1','Choose a Ranchería and prepare its Bands on the medicine track, if applicable','4.1 step 1'],
    ['a2','Activate required Bands in medicine-track order; complete their Actions','4.1 step 2'],
    ['a3','Collect eligible APs and return those Bands to their Ranchería','4.1 step 3'],
    ['a4','Optionally activate other Bands using APs, then finish all activations','4.1 step 4'],
    ['a5','Resolve Operations-track die roll and adjust Operations marker','4.1 step 5'],
  ],
  Culture: [
    ['cu1','Consult the Culture procedure; identify Bands and effects','4.2'],
    ['cu2','Resolve dice and Culture Point gains/losses on the physical board','4.2'],
    ['cu3','Record all other Culture-operation changes before cleanup','4.2'],
  ],
  Planning: [
    ['pl1','Complete all Headman Actions, costs and prerequisites','4.3'],
    ['pl2','Update resources, cards, medicine and Rancherías as instructed','4.3'],
    ['pl3','Resolve the required enemy procedure and track adjustments','4.3'],
  ],
  'Passage of Time': [
    ...Array.from({length:15},(_,i)=>[`pt${i+1}`,(
      [
       'Mark all in-play Bands unfinished',
       'Reconcile printed Passage of Time step 2 with the physical board',
       'Reconcile printed Passage of Time step 3 with the physical board',
       'Reconcile printed Passage of Time step 4 with the physical board',
       'Reconcile printed Passage of Time step 5 with the physical board',
       'Reconcile printed Passage of Time step 6 with the physical board',
       'Reconcile printed Passage of Time step 7 with the physical board',
       'Return Success counters from Out of Play, Operations and medicine tracks to the cup',
       'Transfer Operations-track Resource counters to Ranchería Resources boxes',
       'Remove Ravaged Tribes/Settlements, resolve Military loss if needed, and clear Ravaged markers',
       'Roll for all Peace/Ally counters; return eligible Instructions to their display columns',
       'Randomly select a territory and resolve the Bison placement rule',
       'Discard/refill Development display, applying discard/reveal card effects',
       'Optionally purchase one Culture Card after checking prerequisites and costs',
       'Reset Operations; resolve the Passage marker and any required History Card Victory Check'
      ][i]),`4.4 step ${i+1}`])
  ],
  cleanup: [
    ['cl1','Enforce stacking and return eligible possessions/resources/cup counters','3.4 step 1'],
    ['cl2','Roll once per Ranchería with Finished Bands; resolve free enemy Instructions','3.4 step 2'],
    ['cl3','Draw from Success Check cup and resolve enemy actions/APs','3.4 step 3'],
    ['cl4','If Santa Fé Trail active, resolve Wagon Train “?” counter procedure','3.4 step 4']
  ]
};
const clone = x => structuredClone(x);
const fail = message => { throw new Error(message); };
const nint = (x,name='Value') => {const v=Number(x); if(!Number.isInteger(v))fail(`${name} must be a whole number.`);return v;};
const bounded = (n,min,max,name)=>{const v=nint(n,name);if(v<min||v>max)fail(`${name} must be between ${min} and ${max}.`);return v;};
const item = (state,id)=>state.pieces.find(p=>p.id===id) || fail(`Piece ${id} does not exist.`);
const named = p=>p.label || `${p.type} ${p.id}`;
const exists = (state,id)=>Boolean(state.pieces.find(p=>p.id===id));
const isInPlay = p=>!['reserve','removed'].includes(p.location);
const isMap = loc=>Boolean(SPACE[loc]);
const isPeace = (s,loc)=>s.pieces.some(p=>p.location===loc && (p.type==='Instruction' && ['Peace','Ally'].includes(p.subtype) || p.type==='Marker'&&['Peace','Ally'].includes(p.subtype)));
/** Peace counters at an enemy square also make all of that enemy's Settlements
 * Peace Spaces, including both East squares (§1.2, §6.3.5). */
export function peaceSpaceStatus(s,loc){
 if(!SPACE[loc])fail('Unknown map space for Peace status.');
 if(isPeace(s,loc))return {peace:true,source:'counter'};
 if(['E1','E2'].includes(loc)&&['E1','E2'].some(x=>isPeace(s,x)))return {peace:true,source:'East Peace counter'};
 const settlers=s.pieces.filter(p=>p.location===loc&&p.type==='Settlement');
 for(const p of settlers){
  const owner=directionForOwner(p.owner);
  if(owner&&peaceForSquare(s,owner))return {peace:true,source:owner+' Peace counter'};
  // Colonial names need an unambiguous enemy. Spain can govern multiple.
  const colonial=ENEMY_COLUMNS.filter(enemy=>s.colonial?.[enemy]===p.owner);
  if(colonial.length===1&&peaceForSquare(s,colonial[0]))return {peace:true,source:colonial[0]+' colonial Peace counter'};
 }
 return {peace:false,source:null};
}
/** Peace placement is safely automatic only when no War Column currently
 * requires the special branch of §6.3.5. */
export function peaceTargetPreview(s,enemy){
 if(!ENEMY_COLUMNS.includes(enemy))fail('Unknown active Enemy for Peace.');
 const recovery=recoverTargetAudit(s,enemy);
 const war=s.pieces.filter(p=>p.type==='War Column'&&p.owner===enemy&&SPACE[p.location]);
 const square={North:'N',West:'W',South:'S',East:'E2'}[enemy];
 const existing=s.pieces.filter(p=>p.type==='Instruction'&&p.subtype==='Peace'&&p.location===square);
 return {enemy,square,war:war.map(p=>({id:p.id,location:p.location,strength:p.strength})),
   replace:existing.map(p=>p.id),recoverFirst:recovery.candidates.length>0,
   unknownRavaged:recovery.ambiguousRavaged.length>0,
   requiresWarProcedure:war.length>0};
}
const hasRavaged = (s,loc)=>s.pieces.some(p=>p.location===loc && p.subtype==='Ravaged');
const held = (s,bandId,subtype)=>s.pieces.filter(p=>p.location===`held:${bandId}` && (p.subtype===subtype || (!subtype))); 
const boxExists = (s,id)=>s.pieces.some(p=>p.id===id && p.type==='Rancheria' && p.location!=='removed');
const activeBand = s=>s.activeBandId && s.pieces.find(p=>p.id===s.activeBandId);
const asArray = list => Array.isArray(list) ? list : [];
const regular = s => s.phase!=='setup' && s.phase!=='gameover';
// Reproducible pseudo-random d6s are for an optional digital dice tray only.
// xorshift32 is non-cryptographic; log/seed is stored to allow replay and Undo.
const DEFAULT_SEED = 0x4d595df4;
export function normalSeed(seed){
 const v=Number(seed);
 if(!Number.isSafeInteger(v)||v<0||v>0xffffffff)fail('Random seed must be an integer between 0 and 4294967295.');
 return (v>>>0)||DEFAULT_SEED;
}
export function rollSeededDie(seed){
 let x=normalSeed(seed);
 x ^= x<<13; x ^= x>>>17; x ^= x<<5;
 x>>>=0;
 return {seed:x,face:x%6+1};
}
export const OPENING_TRIBE_SPACES = Object.freeze([
 'UA-4','UA-5','LE-2','LE-6','RG-1','RG-2','RG-5','RG-6',
 'BC-2','BC-4','RR-1','RR-2','RR-3','RR-5','LA-1','LA-2','LA-3'
]);
export const TEMPLATE_SCENARIOS = Object.freeze(['plains','rise','lords']);
export function cultureBaseTerritories(s){return [...new Set(s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]?.type==='round').map(p=>SPACE[p.location].territory))];}
const directionForOwner = owner => ({W:'West',West:'West',S:'South',South:'South',N:'North',North:'North',E:'East',East:'East',E1:'East',E2:'East'})[owner]||null;
function peaceForSquare(s,enemy){
 const locations={West:['W'],South:['S'],North:['N'],East:['E1','E2']}[enemy]||[];
 return locations.some(loc=>isPeace(s,loc));
}
/** Audit only what the entered ledger can demonstrate (Living Rules 1.2).
 * Unknown settlement affiliations are left for physical-board review, not guessed.
 * This is NOT a claim that all physical pieces and card effects have been transcribed. */
export function territoryControlAudit(s){
 return TERRITORIES.map(([id,name])=>{
   const locations=SPACES.filter(p=>p.territory===id).map(p=>p.id);
   const pieces=s.pieces.filter(p=>locations.includes(p.location));
   const friendly=pieces.some(p=>p.type==='Band'||p.type==='Rancheria');
   const blockers=[],needsReview=[];
   for(const p of pieces.filter(p=>p.type==='Tribe'||p.type==='Settlement')){
     if(peaceSpaceStatus(s,p.location).peace||p.type==='Tribe'&&p.location==='UA-1'&&activeDevelopment(s,'19').length)continue;
     if(p.type==='Settlement'){
       const direction=directionForOwner(p.owner);
       if(direction && peaceForSquare(s,direction))continue;
       if(!direction && ['West','South','East','North'].some(x=>peaceForSquare(s,x))){
         needsReview.push(`${named(p)} (${p.location}): recorded owner \"${p.owner||'unknown'}\" does not identify which Enemy column controls this Settlement`);
         continue;
       }
     }
     blockers.push(`${named(p)} (${p.location})`);
   }
   const status=!friendly||blockers.length?'not-controlled':needsReview.length?'review-needed':'controlled';
   return {id,name,status,friendly,blockers,needsReview};
 });
}
export function cultureGainPreview(s,declaredControlled=null){
 const audit=territoryControlAudit(s);
 const controlled=declaredControlled===null?audit.filter(x=>x.status==='controlled').map(x=>x.id):declaredControlled;
 if(!Array.isArray(controlled)||new Set(controlled).size!==controlled.length||controlled.some(id=>!TERRITORIES.some(t=>t[0]===id)))fail('Select distinct, recognised controlled territories.');
 const ranchTerritories=cultureBaseTerritories(s);
 const mismatches=audit.filter(x=>x.status==='controlled'&&!controlled.includes(x.id)||x.status==='not-controlled'&&controlled.includes(x.id)||x.status==='review-needed');
 return {ranchTerritories,declaredControlled:[...controlled],gain:ranchTerritories.length+controlled.length,audit,mismatches};
}
/** Guided Battle scorecard, §§3.1, 7.1–7.2. This never assumes printed War DRM or card effects. */
export function eligibleBattleUnits(s,warId){
 const war=item(s,warId);
 if(war.type!=='War Column'||!SPACE[war.location]||war.location==='RESERVATION'||war.strength<1||war.strength>8)fail('Choose an in-play War Column with strength 1–8.');
 const loc=war.location, r=s.pieces.find(p=>p.type==='Rancheria'&&p.location===loc);
 const bands=r?s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${r.id}`&&p.strength>0):s.pieces.filter(p=>p.type==='Band'&&p.location===loc&&p.strength>0);
 const tribes=s.pieces.filter(p=>p.type==='Tribe'&&p.location===loc&&s.pieces.some(a=>a.location===loc&&(a.type==='Instruction'||a.type==='Marker')&&a.subtype==='Ally'));
 // The printed Battle procedure prioritises the Ranchería's Bands, then a Band
 // in the War Space, then an Allied Tribe. Never offer a different class of unit.
 return {war, rancheria:r||null, units:r?bands:bands.length?bands:tribes};
}
/** War-phase audit using only pieces recorded in this ledger. Does NOT infer card exceptions. */
export function warBattleObligations(s){
 if(s.phase!=='war')return [];
 return s.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>=1&&p.strength<=8).flatMap(w=>{
   const r=eligibleBattleUnits(s,w.id);
   if(!r.units.length)return [];
   return [{warId:w.id,warLabel:w.label,location:w.location,defenders:r.units.map(p=>p.id),exempt:typeof s.battleExemptions?.[w.id]==='string'}];
 });
}
/** Work out a single battle roll. A natural 1 loses and a natural 6 wins even if modifiers reverse the total. */
export function battleRollPreview(s,cmd){
 const {war,rancheria,units}=eligibleBattleUnits(s,cmd.warId);
 const unit=units.find(p=>p.id===cmd.unitId);
 if(!unit)fail('Fighting unit must be an eligible Band or Allied Tribe in the War Space (or its Ranchería box).');
 if(!cmd.ack)fail('Confirm the printed War Column modifier, cards and physical dice.');
 const gunId=String(cmd.gunId||'');const mahimianaId=String(cmd.mahimianaId||'');
 if(gunId && !(unit.type==='Band'&&s.pieces.some(p=>p.id===gunId&&p.type==='Resource'&&p.subtype==='Guns'&&p.location===`held:${unit.id}`)))fail('Only a Guns counter possessed by the fighting Band may be spent.');
 if(mahimianaId && !(unit.type==='Band'&&s.pieces.some(p=>p.id===mahimianaId&&p.type==='Mahimiana'&&p.location===`held:${unit.id}`)))fail('Mahimiana modifier requires that headman to be possessed by the fighting Band.');
 const dice=asArray(cmd.dice).map(v=>bounded(v,1,6,'Battle die'));
 if(dice.length!==(gunId?2:1))fail(`Roll ${gunId?'two dice when spending Guns':'one die without Guns'}.`);
 const warDrm=bounded(cmd.warDrm,0,8,'War Column Battle modifier');
 const cardDrm=bounded(cmd.cardDrm??0,-12,12,'Card Battle modifier');
 const reason=String(cmd.cardReason||'').trim();
 if(cardDrm!==0 && reason.length<8)fail('Document the printed card that modifies the Battle (at least 8 characters).');
 if(cardDrm!==0&&alertPicketsActive(s)&&/\b(tactics|lords of the plains)\b/i.test(reason))fail('W01/W02 Alert Pickets makes Tactics and Lords of the Plains effects inoperative while the War Card is face-up.');
 const natural=Math.max(...dice),base=unit.type==='Band'?unit.strength:2;
 const cultureDrm=unit.type==='Band'&&cultureActive(s,'C01')&&held(s,unit.id,'Horse').length&&!alertPicketsActive(s)?1:0;
 const mahimiana=Boolean(mahimianaId),finished=unit.type==='Band'&&Boolean(unit.finished);
 const mountainHowitzersDrm=activeDevelopment(s,'81').length?-1:0;
 const coltWalkerDrm=activeDevelopment(s,'49').length&&['East','South'].includes(war.owner)?-1:0;
 const modified=natural+base+(mahimiana?1:0)-(finished?1:0)-warDrm+cardDrm+cultureDrm+mountainHowitzersDrm+coltWalkerDrm;
 const won=natural===6||(natural!==1&&modified>=6);
 const expected=won?(war.strength===1?'War Ends: return War Column and its paired Instruction to proper stock/display; participating Mahimiana medicine +1.':`Reduce War Column strength ${war.strength} → ${war.strength-1}; continue battle rounds.`):unit.type==='Tribe'?'Ally counter returns to its Enemy Instruction display; Tribe remains. Battle Ends; War does not end.':unit.strength===1?'Band reduced to zero: remove Band, return resources, resolve Mahimiana death; check Ranchería destruction or Battle End.':`Reduce Band strength ${unit.strength} → ${unit.strength-1}; fight another round.`;
 return {warId:war.id,warLocation:war.location,warStrength:war.strength,unitId:unit.id,unitType:unit.type,unitStrength:unit.strength,unitLocation:unit.location,rancheriaId:rancheria?.id||null,
   gunId,mahimianaId,dice,natural,warDrm,cardDrm,cultureDrm,mountainHowitzersDrm,coltWalkerDrm,cardReason:reason,base,finished,modified,won,expected};
}
/** What the currently recorded Enemy APs can pay; no instruction/card effect is invented. */
export function enemyApPreview(s){
 const counters=s.pieces.filter(p=>p.location==='available-enemy-aps'&&p.type==='Marker'&&/^Enemy AP [234]$/.test(p.subtype));
 const available=counters.reduce((n,p)=>n+Number(p.subtype.at(-1)),0);
 const stored=s.tracks.enemyAp||0;
 return {stored,available,total:stored+available,counters:counters.length,overCap:stored>9,
   enemies:['North','West','South','East'].map(enemy=>{
     const instructions=s.pieces.filter(p=>p.type==='Instruction'&&p.location?.startsWith(`enemy-display:${enemy}:`))
       .sort((a,b)=>a.location.localeCompare(b.location));
     const top=instructions[0];
     // The existing strength field may be used for PRINTED Instruction AP cost, but zero is unknown.
     const cost=top?.strength>0?top.strength:null;
     return {enemy,top:top||null,cost,affordable:cost===null?null:cost<=stored+available,unknown:cost===null};
   })};
}
/** Verified, local-only representation of the Enemy Instruction Display (§6.2.1–6.2.3).
 * The slot letters A–F are ledger slots top to bottom, not inferred die values.
 * Missing cost values and face-up/face-down status must be checked physically. */
export const ENEMY_COLUMNS = Object.freeze(['North','West','South','East']);
export const DISPLAY_ROWS = Object.freeze(['A','B','C','D','E','F']);
export function enemyDisplayAudit(s){
 const locations=new Map(), problems=[], columns={};
 const observed=s.pieces.filter(p=>p.location?.startsWith('enemy-display:')||p.location?.startsWith('enemy-inactive:'));
 for(const p of observed){
   if(p.type!=='Instruction'){problems.push(`${named(p)} is not an Instruction counter but occupies the display.`);continue;}
   if(locations.has(p.location))problems.push(`Duplicate instruction slot ${p.location}: ${named(p)} and ${named(locations.get(p.location))}.`);
   locations.set(p.location,p);
   const match=/^enemy-display:(North|West|South|East):([A-F])$/.exec(p.location);
   if(match && p.owner!==match[1])problems.push(`${named(p)} belongs to ${p.owner} but sits in ${match[1]}'s column.`);
   if(p.location.startsWith('enemy-inactive:')&&!ENEMY_COLUMNS.includes(p.owner))problems.push(`${named(p)} needs a recorded North/West/South/East owner in Inactive.`);
 }
 for(const enemy of ENEMY_COLUMNS){
   const rows=DISPLAY_ROWS.map(row=>({row,piece:locations.get(`enemy-display:${enemy}:${row}`)||null}));
   const top=rows.find(x=>x.piece)?.piece||null;
   columns[enemy]={rows,top,printedCost:top?.strength>0?top.strength:null};
 }
 const inactive=DISPLAY_ROWS.map(row=>({row,piece:locations.get(`enemy-inactive:${row}`)||null}));
 return {columns,inactive,problems};
}
/** Deterministic display housekeeping, NOT execution of Enemy Instruction effects.
 * Read and acknowledge the printed 6.2.3 procedure on the physical board. */
export function resetEnemyDisplay(s){
 const audit=enemyDisplayAudit(s);
 if(audit.problems.length)fail('Resolve display conflicts before resetting: '+audit.problems[0]);
 // Consolidate each active column from the top; preserve its existing vertical order.
 for(const enemy of ENEMY_COLUMNS){
   const pieces=audit.columns[enemy].rows.map(x=>x.piece).filter(Boolean);
   pieces.forEach((p,i)=>p.location=`enemy-display:${enemy}:${DISPLAY_ROWS[i]}`);
 }
 // Then move Inactive counters bottom-up into the topmost empty slot of their owner.
 const moved=[];
 for(const entry of [...audit.inactive].reverse()){
   const p=entry.piece;if(!p)continue;
   const target=DISPLAY_ROWS.find(row=>!s.pieces.some(q=>q!==p&&q.location===`enemy-display:${p.owner}:${row}`));
   if(!target)fail(`${p.owner} column has no room for ${named(p)}; resolve the physical display first.`);
   p.location=`enemy-display:${p.owner}:${target}`;
   moved.push({id:p.id,owner:p.owner,row:target});
 }
 return {moved,activeCount:s.pieces.filter(p=>p.location?.startsWith('enemy-display:')).length};
}
/** Safeguard only verified adjacency and normal dashed-line restriction (§1.2, §3.1).
 * Nearest Ranchería / card-selected active War Column is still a MANUAL decision.
 * A recorded graph may omit map lines, so we do not declare targets legal or illegal. */
export function warColumnStopUnits(s,warId){
 const w=item(s,warId), loc=w.location;
 if(w.type!=='War Column'||!SPACE[loc])fail('Select a War Column in a map space.');
 const enemy=String(w.owner||'');
 if(!ENEMY_COLUMNS.includes(enemy))fail('Set War Column Owner to North, West, South or East in Pieces & stock first.');
 if(loc==='PD'&&enemy!=='North')return [];
 const ally=s.pieces.some(p=>p.location===loc&&['Instruction','Marker'].includes(p.type)&&p.subtype==='Ally');
 return s.pieces.filter(p=>p.location===loc&&(p.type==='Band'||p.type==='Rancheria'||p.type==='Tribe'&&ally));
}
export function warMoveChoices(s){
 const m=s.warMovement;if(!m)return [];
 const w=item(s,m.warId);
 if(m.remaining<=0||warColumnStopUnits(s,w.id).length)return [];
 return s.edges.filter(e=>e.a===w.location||e.b===w.location).map(e=>({
   to:e.a===w.location?e.b:e.a,kind:e.kind,
   permitted:m.enemy==='North'||e.kind==='solid',
   restriction:m.enemy!=='North'&&e.kind==='dashed'?'Colonial War Columns cannot use dashed lines without a documented card exception.':null
 }));
}
/** §1.2 War Ends: the War/Raid Instruction is the counter physically
 * stacked with the War Column strength counter. Refuse ambiguous or absent
 * pairing rather than silently moving an unrelated display counter. */
export function warEndsPreview(s, warId){
 const war=item(s,warId);
 if(war.type!=='War Column'||!SPACE[war.location]||!ENEMY_COLUMNS.includes(war.owner))fail('War Ends requires an in-play War Column with a valid enemy.');
 const paired=s.pieces.filter(p=>p.type==='Instruction'&&p.owner===war.owner&&p.location===war.location&&['War','Raid'].includes(p.subtype));
 if(paired.length!==1)fail(`War Ends for ${war.id} needs exactly one stacked ${war.owner} War/Raid Instruction; found ${paired.length}. Record its physical counter before automating.`);
 const instruction=paired[0];
 if(war.specialNorthInstructionG)fail('A North G War Column is governed by the special card restriction: do not return G to the Instruction Display. Resolve its destination under the printed rules before War Ends.');
 const slot=DISPLAY_ROWS.find(row=>!s.pieces.some(p=>p.id!==instruction.id&&p.location===`enemy-display:${war.owner}:${row}`));
 return {warId:war.id,instructionId:instruction.id,enemy:war.owner,from:war.location,destination:slot?`enemy-display:${war.owner}:${slot}`:'cup'};
}
export function resolveWarEnds(s, warId){
 const plan=warEndsPreview(s,warId);
 item(s,plan.warId).location='reserve';
 item(s,plan.instructionId).location=plan.destination;
 return plan;
}
/** §3.1 pathfinding for the recorded, verified map graph. Strictly refuses
 * incomplete connectivity or ambiguous printed exceptions; does not guess. */
export function autoWarMovementPreview(s, cardId, selectedWarIds=null){
 const card=warCard(cardId);
 if(!card || !card.movement)fail('Choose a printed War Card with movement instructions (not the reshuffle card).');
 const columns=s.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0&&(!selectedWarIds||selectedWarIds.includes(p.id)));
 const outcomes=[];
 for(const column of columns){
   const allowance=warMovementAllowance(card.id,column.owner);
   if(!allowance)continue;
   const visible=p=>SPACE[p.location] && !(column.owner!=='North'&&p.location==='PD');
   const rancherias=s.pieces.filter(p=>p.type==='Rancheria'&&visible(p));
   const bands=s.pieces.filter(p=>p.type==='Band'&&p.strength>0&&visible(p));
   const targets=rancherias.length?rancherias:bands;
   if(warColumnStopUnits(s,column.id).length){outcomes.push({warId:column.id,route:[column.location],reason:'already with defender',targetId:null});continue;}
   if(!targets.length){outcomes.push({warId:column.id,route:[column.location],reason:'no visible targets: lose 1 strength',strengthLoss:1,targetId:null});continue;}
   const neighbors=from=>s.edges.filter(e=>(e.a===from||e.b===from)&&(column.owner==='North'||e.kind!=='dashed'))
     .map(e=>e.a===from?e.b:e.a).filter(x=>SPACE[x]).sort();
   const pathTo=dest=>{
     const paths=[[column.location]],visited=new Set([column.location]);
     for(let i=0;i<paths.length;i++){
       const route=paths[i],from=route.at(-1);if(from===dest)return route;
       for(const next of neighbors(from))if(!visited.has(next)){visited.add(next);paths.push([...route,next]);}
     }
     return null;
   };
   const options=targets.map(p=>({piece:p,route:pathTo(p.location)})).filter(x=>x.route);
   if(!options.length)fail(`No verifiable path from ${column.location} to any visible defender for ${column.id}; complete the map graph or use documented manual movement.`);
   // Shortest graph distance first, then the printed Alphabetic Priority (§2.3).
   const alpha=p=>String(p.subtype||p.label||p.id).toUpperCase().replace(/^RANCHER[IÍ]A\s*/,'');
   options.sort((a,b)=>a.route.length-b.route.length||alpha(a.piece).localeCompare(alpha(b.piece))||a.piece.id.localeCompare(b.piece.id));
   const target=options[0],route=[column.location];
   for(const next of target.route.slice(1,allowance+1)){
     route.push(next);
     if(s.pieces.some(p=>p.location===next&&(p.type==='Band'||p.type==='Rancheria'||p.type==='Tribe'&&
       s.pieces.some(a=>a.location===next&&['Instruction','Marker'].includes(a.type)&&a.subtype==='Ally'))))break;
   }
   outcomes.push({warId:column.id,route,targetId:target.piece.id,reason:'nearest visible target'});
 }
 return {card:card.id,outcomes};
}
/** Military/Culture deficit substitution from Living Rules 2.11.2 and 2.11.3. */
export function pointLossPreview(s,track,amount){
 if(!['military','culture'].includes(track))fail('Only Military or Culture may receive a rules-based point loss.');
 const n=bounded(amount,1,99,'Loss');
 const other=track==='military'?'culture':'military';
 const direct=Math.min(n,s.tracks[track]);
 const substituted=(n-direct)*2;
 const otherLoss=Math.min(substituted,s.tracks[other]);
 return {track,other,direct,substituted,otherLoss,unfulfilled:substituted-otherLoss,
   tracks:{...s.tracks,[track]:s.tracks[track]-direct,[other]:s.tracks[other]-otherLoss}};
}
function makeTemplatePiece(id,type,subtype,label,location,strength=0,extra={}){
 return {id,type,subtype,label,location,owner:type==='Tribe'||type==='Bison'?'Neutral':'Comanche',
   strength,mpRating:4,finished:false,notes:'',...extra};
}
function installOpeningTemplate(s){
 if(s.phase!=='setup')fail('Opening templates are available only during setup.');
 if(!TEMPLATE_SCENARIOS.includes(s.scenario))fail('This scenario does not have a verified opening template yet.');
 if(s.pieces.length||s.cards.length)fail('Template requires an empty piece and card ledger. Start a new blank game first.');
 s.tracks={military:3,culture:3,ap:1,enemyAp:0,movement:0,operations:0,passage:0};
 s.colonial={West:'Spain',South:'Spain',East:'None'};
 s.medicine={paraibo:2,mahimiana:2};
 s.pieces=[];
 s.pieces.push(makeTemplatePiece('setup-ranch-a','Rancheria','A','Ranchería A','UA-1'));
 for(const loc of OPENING_TRIBE_SPACES)s.pieces.push(makeTemplatePiece(`setup-tribe-${loc}`,'Tribe','','Tribe',loc));
 const occupied=new Set([...OPENING_TRIBE_SPACES,'UA-1']);
 for(const loc of SPACES.filter(x=>x.type==='round').map(x=>x.id).filter(x=>!occupied.has(x)))
   s.pieces.push(makeTemplatePiece(`setup-bison-${loc}`,'Bison','','Bison',loc));
 for(let i=1;i<=3;i++)s.pieces.push(makeTemplatePiece(`setup-band-${i}`,'Band','',`Band A${i}`,'box:setup-ranch-a',2,{mpRating:4,ratingConfirmed:false,notes:'Movement rating shown as placeholder until checked against the printed Band counter.'}));
 for(let i=1;i<=4;i++)s.pieces.push(makeTemplatePiece(`setup-horse-${i}`,'Resource','Horse','Horse','box:setup-ranch-a'));
 s.pieces.push(makeTemplatePiece('setup-mahimiana','Mahimiana','','Mahimiana','box:setup-ranch-a'));
 for(const enemy of ['West','South','East','North']){
   for(const letter of 'ABCDEF')s.pieces.push(makeTemplatePiece(`setup-instruction-${enemy}-${letter}`,'Instruction',`${enemy} ${letter}`,`${enemy} instruction ${letter}`,`enemy-display:${enemy}:${letter}`,0,{owner:enemy}));
   s.pieces.push(makeTemplatePiece(`setup-instruction-${enemy}-G`,'Instruction',`${enemy} G`,`${enemy} instruction G`,enemy==='North'?'operations':'reserve',0,{owner:enemy}));
 }
 for(const [subtype,count] of [['Success',10],['Enemy AP 4',5],['Enemy AP 3',4],['Enemy AP 2',3]])
   for(let i=1;i<=count;i++)s.pieces.push(makeTemplatePiece(`setup-cup-${subtype.replaceAll(' ','-')}-${i}`,'Marker',subtype,subtype,'cup',0,{owner:'Neutral'}));
 const lastAvailable=s.scenario==='plains'?21:s.scenario==='rise'?42:63;
 const devZone=n=>n<=3?'In play':n<=21?'Deck':n<=lastAvailable?'Available':'Removed';
 s.cards=Array.from({length:84},(_,i)=>({id:`setup-dev-${i+1}`,kind:'Development',identifier:String(i+1),title:'',zone:devZone(i+1),notes:'',evidenceStatus:'unverified',sourceReference:''}));
 s.cards.push(...Array.from({length:4},(_,i)=>({id:`setup-history-${i+1}`,kind:'History',identifier:`H${i+1}`,title:'',zone:i===0?'In play':i+1<=({plains:1,rise:2,lords:3}[s.scenario])?'Available':'Removed',notes:'',evidenceStatus:'unverified',sourceReference:''})));
 // The official playbook counts 25 War Cards and eight sets of three Culture
 // Cards. These are inventory placeholders, NOT invented printed card IDs.
 // Names, effects and playable Culture selections must be checked physically.
 s.cards.push(...Array.from({length:25},(_,i)=>({
   id:`setup-war-${i+1}`,kind:'War',identifier:'',
   title:`War deck counter ${i+1} (inventory only)`,zone:'Deck',
   notes:'Unidentified War Card; replace this ledger label with the printed identity after drawing.',evidenceStatus:'unverified',sourceReference:''
 })));
 for(let set=1;set<=8;set++)for(let level=1;level<=3;level++)s.cards.push({
   id:`setup-culture-set-${set}-level-${level}`,kind:'Culture',identifier:'',
   title:`${CULTURE_FAMILY_ORDER[set-1]} level ${level}`,zone:'Available',
   notes:'Check the physical Culture card set name and any starting-card conditions before use.',evidenceStatus:'unverified',sourceReference:''
 });
 s.setupChecklist={
  'cards-war':'Shuffle all 25 War Cards and place the deck by the board.',
  'cards-culture':'Arrange the 8 sets of 3 Culture Cards; optionally choose one Level 1 card.',
  'cards-development':'Shuffle Development Cards 4–21; keep other cards in indicated zones.',
  'enemy-display':'Confirm each enemy column has A through F face-up, and North G is at the Operations Track.',
  'medicine':'Set Paraibo and Mahimiana medicine both to 2.',
  'operations':'Put both Operations counters on Start; zero in this tracker denotes Start.',
  'supply':'Check physical stock, setup Tribe and Bison counters, and 22 Success Check counters in cup.'
 };
 s.setupConfirmed={};
 // Official opening templates include our documented movement subset automatically.
 // Older saves are not altered: users can opt in via APPLY_MAP_EVIDENCE.
 const known=s.edges;
 for(const evidence of MAP_EVIDENCE_EDGES){
   const existing=known.find(x=>(x.a===evidence.a&&x.b===evidence.b)||(x.a===evidence.b&&x.b===evidence.a));
   if(existing){if(existing.kind!==evidence.kind)fail(`Map evidence conflict at ${evidence.a}–${evidence.b}; compare with printed board first.`);continue;}
   known.push({...evidence,source:'board-photo',verifiedByPlayer:false});
 }
 s.setupNote=`Verified opening template (§9.1–9.4) for ${SCENARIOS.find(x=>x[0]===s.scenario)[1]}. Confirm every setup step on the physical board. The ${MAP_EVIDENCE_EDGES.length} photographed map links are preloaded; unconfirmed junctions still need verification.`;
}


export function newGame(scenario='plains',demo=false){
 if(!SCENARIOS.some(s=>s[0]===scenario))fail('Unknown scenario.');
 const game={schema:3,version:VERSION,scenario,period:scenario==='downfall'?3:1,phase:'setup',operation:null,
   rng:{algorithm:'xorshift32',seed:DEFAULT_SEED,rolls:0},operationEvents:{cultureGain:false,operationsRoll:false},medicine:{paraibo:null,mahimiana:null},colonial:{West:'None',South:'None',East:'None'},setupChecklist:{},setupConfirmed:{},
   tracks:{military:0,culture:0,ap:0,enemyAp:0,movement:0,operations:0,passage:0},mustPassage:false,
   activeBandId:null,steps:{},pieces:[],cards:[],edges:[],mapReview:{},enemyFlow:null,pending:null,successCheck:null,lastSuccessCheck:null,revision:0,passageRetiredIds:[],passageQuanahExemptId:null,passagePeaceRolls:{},passageBison:null,passageResult:null,victoryPending:null,gameResult:null,
   countermeasureWindow:null,developmentPending:null,developmentPlanningApplied:false,epidemicTakeActionsApplied:false,greatHuntBandId:null,battlePending:null,battleContinuation:null,battleRounds:[],battleExemptions:{},warMovement:null,log:[],createdAt:new Date().toISOString(),setupNote:'Scenario setups are NOT automatically populated. Copy your physical board.',
   notes:'',flags:{santaFe:false},limits:{},quality:{manual:0,verified:0}};
 if(demo){game.tracks={military:3,culture:2,ap:4,enemyAp:1,movement:0,operations:1,passage:0};
   game.pieces=[
    {id:'p1',type:'Rancheria',subtype:'A',label:'Ranchería A',location:'UA-2',strength:0,owner:'Comanche',notes:''},
    {id:'p2',type:'Rancheria',subtype:'B',label:'Ranchería B',location:'LA-5',strength:0,owner:'Comanche',notes:''},
    {id:'p3',type:'Band',subtype:'',label:'Band A1',location:'box:p1',strength:2,mpRating:5,owner:'Comanche',finished:false,notes:''},
    {id:'p4',type:'Band',subtype:'',label:'Band B1',location:'LA-5',strength:1,mpRating:4,owner:'Comanche',finished:false,notes:''},
    {id:'p5',type:'Settlement',subtype:'Spain',label:'Spanish settlement',location:'RG-1',owner:'Spain',strength:0,notes:''},
    {id:'p6',type:'Bison',subtype:'',label:'Bison',location:'UA-4',owner:'Neutral',strength:0,notes:''},
    {id:'p7',type:'Resource',subtype:'Horse',label:'Horse',location:'held:p4',owner:'Comanche',strength:0,notes:''}
   ];game.setupNote='DEMONSTRATION DATA — invented example, not official scenario setup.';}
 game.developmentPending=null;game.developmentPlanningApplied=false;game.epidemicTakeActionsApplied=false;game.greatHuntBandId=null;return game;
}
function sHasMahimiana(s,id){return s.pieces.some(p=>p.id===id&&p.type==='Mahimiana'&&p.location!=='removed');}
function validateLocation(state,location,selfId){
 if(isMap(location)||['reserve','removed','operations','cup','enemy-display','hand','deck','success-out','available-enemy-aps','enemy-resolution'].includes(location))return;
 if(location.startsWith('medicine:') && sHasMahimiana(state,location.slice(9)))return;
 if(/^enemy-display:(West|South|East|North):[A-F]$/.test(location)||/^enemy-inactive:[A-F]$/.test(location))return;
 if(location.startsWith('box:')&&!(!exists(state,location.slice(4))|| !boxExists(state,location.slice(4))))return;
 if(location.startsWith('held:') && exists(state,location.slice(5)) && item(state,location.slice(5)).type==='Band' && location.slice(5)!==selfId)return;
 fail('Invalid location / container. Select a board space, an existing Ranchería box, a Band, or stock.');
}
/** Per-space physical-board connection review. A certification is supplied by the
 * player and is invalidated automatically if any line touching that space changes.
 * Never claim the publisher's entire adjacency graph was digitally verified. */
export function mapSpaceSignature(s,space){
 if(!SPACE[space])fail('Select a valid map space.');
 return s.edges.filter(e=>e.a===space||e.b===space).map(e=>`${e.a===space?e.b:e.a}:${e.kind}`).sort().join('|');
}
export function mapReviewAudit(s){
 const rows=SPACES.map(sp=>({id:sp.id,name:sp.name,edges:s.edges.filter(e=>e.a===sp.id||e.b===sp.id).length,
   reviewed:Boolean(s.mapReview?.[sp.id] && s.mapReview[sp.id].signature===mapSpaceSignature(s,sp.id)),
   stale:Boolean(s.mapReview?.[sp.id] && s.mapReview[sp.id].signature!==mapSpaceSignature(s,sp.id))}));
 return {rows,reviewed:rows.filter(r=>r.reviewed).length,stale:rows.filter(r=>r.stale).length,total:rows.length,
   complete:rows.every(r=>r.reviewed),unreviewed:rows.filter(r=>!r.reviewed).map(r=>r.id)};
}
/** AP box counter value; counters are not points on the General Records Track. */
function apCounterValue(p){
 return p?.type==='Marker'&&p?.location==='available-enemy-aps'&&/^Enemy AP [234]$/.test(p.subtype||'')?Number(p.subtype.at(-1)):0;
}
export function enemyFlowPreview(s){
 const flow=s.enemyFlow||null, budget=enemyApPreview(s), audit=enemyDisplayAudit(s);
 const c=flow?audit.columns[flow.enemy]:null;
 const top=c?.top||null;
 return {flow,budget,audit,top,topCost:top?.strength>0?top.strength:null,
   canPay:Boolean(top&&top.strength>0&&budget.total>=top.strength),remaining:budget.total,
   activeCounters:s.pieces.filter(p=>apCounterValue(p)>0).map(p=>({id:p.id,label:p.label,value:apCounterValue(p)}))};
}
/** H1 outcomes independently demonstrated in the GMT Living Playbook.
 * This is deliberately an INCOMPLETE table; the other faces are unknown here.
 * Card-specific overrides may still apply and require explicit explanation. */
export const VERIFIED_H1_ENEMY_ROLLS=Object.freeze({2:'North',3:'West',4:'West',6:'South'});
export function verifiedHistoryEnemy(s,die){
 const card=s.cards.find(c=>c.kind==='History'&&c.zone==='In play');
 return String(card?.identifier||'').trim().toUpperCase()==='H1' ? VERIFIED_H1_ENEMY_ROLLS[Number(die)]||null : null;
}
/** Machine-readable, deliberately tiny card-effect registry. Only effects that can
 * be verified independently from the published GMT playbook are encoded.
 * No card artwork or card-face text is included. Other cards remain manual. */
export const VERIFIED_CARD_EFFECTS=Object.freeze([Object.freeze({
 key:'war-of-the-spanish-succession',title:'War of the Spanish Succession',
 source:'GMT Living Playbook p. 8, Example of Enemy Instructions',
 blockedInstructions:Object.freeze(['War','Subjugate'])
}),Object.freeze({
 key:'mexican-war',title:'Mexican War',source:'TTS Development 63 — while in play',
 enemies:Object.freeze(['South','East']),blockedInstructions:Object.freeze(['War','Subjugate'])
}),Object.freeze({
 key:'mexican-independence',title:'Mexican Independence',source:'TTS Development 57 — while in play',
 enemies:Object.freeze(['South']),blockedInstructions:Object.freeze(['War','Subjugate'])
})]);
/** W12/W13: optional immediate Ranchería relocation for 2 AP.
 * Only destinations with an evidenced adjacency and no unresolved arrivals are
 * offered. Entering a Band/unknown counter situation requires a separate rule
 * implementation; we do not silently absorb or discard pieces. */
export function travoisOptions(s){
 const available=[];
 for(const r of s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
  for(const e of s.edges.filter(e=>e.a===r.location||e.b===r.location)){
   const to=e.a===r.location?e.b:e.a;
   if(!['round','canyon'].includes(SPACE[to]?.type))continue;
   if(s.pieces.some(p=>p.location===to&&['Rancheria','Tribe','Settlement','Band','War Column','Instruction','Marker'].includes(p.type)))continue;
   available.push({rancheriaId:r.id,from:r.location,to});
  }
 }
 return available;
}
function activeWarCard(s){return s.cards.find(c=>c.kind==='War'&&c.zone==='War Event')||null;}
/** W03/W04/W22: no extra card is needed if every War Column is already with a defender. */
export function fastColumnEligible(s){
 return s.pieces.filter(p=>p.type==='War Column'&&p.strength>0&&SPACE[p.location]&&!warColumnStopUnits(s,p.id).length).map(p=>p.id);
}

/** Player-choice War countermeasures that trigger on FINISH_BAND.  A choice
 * is offered only with enough recorded pieces to satisfy its printed trigger.
 * Source: owner-supplied W07/W08, W18–W21, W24 card faces. */
function shortestRecordedDistance(s,start,destination,{war=false}={}){
 if(start===destination)return 0;
 const seen=new Set([start]),queue=[[start,0]];
 for(let i=0;i<queue.length;i++){
  const [at,depth]=queue[i];
  for(const e of s.edges){if(war&&e.kind==='dashed')continue;
   const next=e.a===at?e.b:e.b===at?e.a:null;
   if(!next||seen.has(next)||!SPACE[next])continue;
   if(next===destination)return depth+1;
   seen.add(next);queue.push([next,depth+1]);
  }
 }
 return null;
}
export function warCountermeasureOptions(s,bandId){
 const band=s.pieces.find(p=>p.id===bandId);
 const card=activeWarCard(s),id=String(card?.identifier||'').toUpperCase();
 if(!band||band.type!=='Band'||!SPACE[band.location]||!band.finished)return [];
 const at=band.location;
 const wars=s.pieces.filter(p=>p.type==='War Column'&&p.strength>0&&SPACE[p.location]);
 if(['W07','W08'].includes(id)){
  const ranch=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
  const distances=ranch.map(r=>({r,d:shortestRecordedDistance(s,at,r.location)})).filter(x=>x.d!==null);
  if(!distances.length)return [];
  const min=Math.min(...distances.map(x=>x.d));const nearest=distances.filter(x=>x.d===min);
  return wars.filter(w=>w.location!==at&&shortestRecordedDistance(s,w.location,at,{war:true})===1).flatMap(w=>nearest.map(({r})=>({kind:'draw-them-off',warId:w.id,rancheriaId:r.id,bandId,from:w.location,to:at})));
 }
 if(['W18','W19','W20','W21'].includes(id)){
  if(!held(s,bandId,'Captives').length)return [];
  return wars.filter(w=>w.location===at).map(w=>({kind:'surrender-captives',warId:w.id,bandId}));
 }
 if(id==='W24'&&s.tracks.ap>=2)return wars.filter(w=>w.location===at).map(w=>({kind:'successful-ambush',warId:w.id,bandId}));
 return [];
}
export function alertPicketsActive(s){
 return ['W01','W02'].includes(String(activeWarCard(s)?.identifier||'').toUpperCase());
}
/** W09–W11 Surprise Attack: printed range is up to two *non-dashed* connections.
 * The defender category priority is Ranchería, Allied Tribe, then Band.
 * When a target choice remains tied at the same priority and distance, stop
 * rather than inventing a tie-breaker absent from the printed card. */
export function surpriseAttackPreview(s){
 const defenders=[];
 for(const p of s.pieces){
  if(!SPACE[p.location])continue;
  const priority=p.type==='Rancheria'?0:p.type==='Tribe'&&s.pieces.some(a=>a.location===p.location&&['Instruction','Marker'].includes(a.type)&&a.subtype==='Ally')?1:p.type==='Band'&&p.strength>0?2:null;
  if(priority!==null)defenders.push({id:p.id,location:p.location,priority});
 }
 const path=(start,destination)=>{
  const queue=[[start]],seen=new Set([start]);
  for(let i=0;i<queue.length;i++){
   const route=queue[i],last=route.at(-1);
   if(last===destination)return route;
   if(route.length>=3)continue;
   for(const e of s.edges){if(e.kind!=='solid')continue;
    const next=e.a===last?e.b:e.b===last?e.a:null;
    if(next&&SPACE[next]&&!seen.has(next)){seen.add(next);queue.push([...route,next]);}
   }
  }
  return null;
 };
 const candidates=[];
 for(const w of s.pieces.filter(p=>p.type==='War Column'&&p.strength>0&&SPACE[p.location])){
  const destinations=defenders.filter(d=>d.location!==w.location).map(d=>({...d,route:path(w.location,d.location)})).filter(d=>d.route&&d.route.length>=2&&d.route.length<=3);
  if(destinations.length)candidates.push({warId:w.id,strength:w.strength,location:w.location,destinations});
 }
 const max=candidates.length?Math.max(...candidates.map(c=>c.strength)):null;
 return {candidates:candidates.filter(c=>c.strength===max),maxStrength:max};
}
export function verifiedWarEventStatus(s,id){
 const p=warEventPreview(s,id);
 return {...p,resolved:s.warEventResolved===p.card};
}
function applyVerifiedWarEvent(s,id){
 const preview=warEventPreview(s,id);
 if(s.warEventResolved===id)fail('War Event already resolved.');
 if(!preview.canResolveImmediately)return {applied:false,preview};
 for(const target of preview.targets){const w=item(s,target);
  if(preview.event==='bad-intel')w.strength=Math.min(8,w.strength+2);
  else if(preview.event==='wide-open')w.strength=Math.max(1,w.strength-2);
 }
 s.warEventResolved=id;
 return {applied:true,preview};
}
export function activeCardEffects(s){
 return VERIFIED_CARD_EFFECTS.filter(e=>s.cards.some(c=>c.kind==='Development'&&c.zone==='In play'&&
   ((e.key==='war-of-the-spanish-succession'&&(devNumber(c)==='03'||String(c.title||'').trim().toLowerCase()===e.title.toLowerCase()))||
    (e.key==='mexican-war'&&devNumber(c)==='63')||
    (e.key==='mexican-independence'&&devNumber(c)==='57'))));
}
/** Owner-supplied English TTS card faces, checked independently by number.
 * This is intentionally a behavioral summary, not a transcription of the artwork.
 * Unlisted Development cards are NOT considered implemented. */
export const DEVELOPMENT_EFFECT_CATALOG=Object.freeze({
 '06':{name:'Epidemic',trigger:'when-revealed and end-Take-Actions',mode:'random-space-with-choice',source:'TTS Development 06'},
 '01':{name:'Apache War',trigger:'after-player-action',mode:'automatic',source:'TTS Development 01'},
 '02':{name:'Ute Alliance',trigger:'hand',mode:'choice',source:'TTS Development 02'},
 '03':{name:'War of Spanish Succession',trigger:'while-in-play',mode:'enemy-exception',source:'TTS Development 03'},
 '04':{name:'Disease',trigger:'when-revealed',mode:'automatic-with-stock-validation',source:'TTS Development 04'},
 '05':{name:'Missed Opportunity',trigger:'when-revealed',mode:'automatic',source:'TTS Development 05'},
 '07':{name:'Spanish Trade Embargo',trigger:'while-in-play',mode:'trade-restriction',source:'TTS Development 07'},
 '08':{name:'Mounted Society',trigger:'discard-during-passage',mode:'passage-marker',source:'TTS Development 08'},
 '09':{name:'Counting Coup',trigger:'discard-during-passage',mode:'passage-marker',source:'TTS Development 09'},
 '10':{name:'Prominent Headman',trigger:'discard-during-passage',mode:'passage-marker',source:'TTS Development 10'},
 '11':{name:'Siege of La Jicarilla',trigger:'hand-play',mode:'ravaged-placement-and-passage-penalty',source:'TTS Development 11'},
 '12':{name:'Great Hunt',trigger:'hand-play during activation',mode:'hunting-discount',source:'TTS Development 12'},
 '13':{name:'French Traders',trigger:'hand-play during Take Actions',mode:'verified trade-for-guns',source:'TTS Development 13'},
 '18':{name:'No Relief from War',trigger:'hand-play during Enemy Recover',mode:'prevent-recover',source:'TTS Development 18'},
 '15':{name:'Negotiation',trigger:'hand-play during Planning',mode:'war-ends',source:'TTS Development 15'},
 '14':{name:'Disease',trigger:'when-revealed',mode:'automatic-with-stock-validation',source:'TTS Development 14'},
 '19':{name:'End of Ute Alliance',trigger:'while-in-play',mode:'territory-control-only',source:'TTS Development 19'},
 '20':{name:'Taos Pueblo Trade',trigger:'while-in-play',mode:'trade-exception',source:'TTS Development 20'},
 '33':{name:'Comancheros',trigger:'end-planning',mode:'choice',source:'TTS Development 33'},
 '34':{name:'Comancheros',trigger:'end-planning',mode:'choice',source:'TTS Development 34'},
 '70':{name:'Buffalo Hunters',trigger:'cleanup-step-1 and Band action',mode:'automatic-cleanup-with-choice',source:'TTS Development 70'},
 '71':{name:'Buffalo Hunters',trigger:'cleanup-step-1 and Band action',mode:'automatic-cleanup-with-choice',source:'TTS Development 71'},
 '56':{name:'Gift Giving',trigger:'Planning Headman Action',mode:'guided-choice',source:'TTS Development 56'},
 '60':{name:'American Traders',trigger:'when-revealed and cleanup-step-1',mode:'automatic',source:'TTS Development 60'},
 '73':{name:'Texas Beef',trigger:'Raid bonus',mode:'automatic-with-stock',source:'TTS Development 73'},
 '30':{name:'Nuevo Apachería',trigger:'when-revealed and while-in-play',mode:'guided-relocation-with-hand-lock',source:'TTS Development 30'},
 '39':{name:'Comanche Moon',trigger:'in-hand before Raid',mode:'fixed-raid-reward-and-rebuy-choice',source:'TTS Development 39'},
 '40':{name:'Comanche Moon',trigger:'in-hand before Raid',mode:'fixed-raid-reward-and-rebuy-choice',source:'TTS Development 40'},
 '59':{name:'Comanche Moon',trigger:'in-hand before Raid',mode:'fixed-raid-reward-and-rebuy-choice',source:'TTS Development 59'},
 '16':{name:'Quality Mounts',trigger:'in-hand Band activation and finish die',mode:'seeded-movement-and-discard-risk',source:'TTS Development 16'},
 '17':{name:'Tactical Advantage',trigger:'in-hand Success Check step 1',mode:'seeded-die-and-draw-modifier',source:'TTS Development 17'},
 '32':{name:'Skillful Warriors',trigger:'in-hand instead-of-Success-Check',mode:'automatic',source:'TTS Development 32'},
 '36':{name:'Painted Shields',trigger:'in-hand Success Check',mode:'automatic-draw-and-penalty',source:'TTS Development 36'},
 '42':{name:'Tactical Advantage',trigger:'in-hand Success Check step 1',mode:'seeded-die-and-draw-modifier',source:'TTS Development 42'},
 '21':{name:'Mild Winter',trigger:'when-revealed',mode:'passage-step-12-guided',source:'TTS Development 21'},
 '43':{name:'Santa Fé Trail',trigger:'when-revealed',mode:'automatic-flag',source:'TTS Development 43'},
 '65':{name:'Texas Rangers',trigger:'while-in-play',mode:'raid-success-check',source:'TTS Development 65'},
 '76':{name:'Off the Reservation',trigger:'hand-play and discard-during-passage',mode:'passage-penalty-guided',source:'TTS Development 76'},
 '77':{name:'Off the Reservation',trigger:'hand-play and discard-during-passage',mode:'passage-penalty-guided',source:'TTS Development 77'},
 '78':{name:'Isatai',trigger:'hand-play and discard-during-passage',mode:'passage-penalty-guided',source:'TTS Development 78'},
 '81':{name:'Mountain Howitzers',trigger:'while-in-play',mode:'battle-modifier',source:'TTS Development 81'},
 '83':{name:'Ranald Mackenzie’s 4th U.S. Cavalry',trigger:'while-in-play and discard-during-passage',mode:'horse-loss-choice-guided',source:'TTS Development 83'},
 '51':{name:'Texas Independence',trigger:'when-revealed',mode:'seeded-tribe-removal-and-settlement-placement',source:'TTS Development 51'},
 '67':{name:'American Civil War',trigger:'when-revealed and while-in-play',mode:'enemy-AP-reset-with-guided-deck-order-and-exception',source:'TTS Development 67'},
 '23':{name:'Osage Expansion',trigger:'when-revealed',mode:'automatic-with-stacking',source:'TTS Development 23'},
 '24':{name:'Smallpox Epidemic',trigger:'when-revealed and end-Take-Actions',mode:'random-space-with-choice',source:'TTS Development 24'},
 '35':{name:'Vibrant Population',trigger:'hand-play',mode:'choice',source:'TTS Development 35'},
 '45':{name:'Fort Gibson',trigger:'when-revealed',mode:'automatic-or-displacement-choice',source:'TTS Development 45'},
 '54':{name:'1,000-Mile Raid',trigger:'hand-play',mode:'choice',source:'TTS Development 54'},
 '62':{name:'Cynthia Ann Parker',trigger:'while-in-play and discard-during-passage',mode:'raid-bonus',source:'TTS Development 62'},
 '68':{name:'Medicine Lodge Treaty',trigger:'when-revealed and end-Operation-Cleanup',mode:'automatic-and-guided',source:'TTS Development 68'},
 '27':{name:'Severe Winter',trigger:'when-revealed',mode:'automatic',source:'TTS Development 27'},
 '31':{name:'Missed Opportunity',trigger:'when-revealed',mode:'automatic',source:'TTS Development 31'},
 '38':{name:'Disease',trigger:'when-revealed',mode:'automatic-with-stock-validation',source:'TTS Development 38'},
 '47':{name:'Smallpox Epidemic',trigger:'when-revealed and end-Take-Actions',mode:'random-space-with-choice',source:'TTS Development 47'},
 '48':{name:'Cholera Epidemic',trigger:'when-revealed and end-Take-Actions',mode:'random-space-with-choice',source:'TTS Development 48'},
 '49':{name:'Colt-Walker Revolver',trigger:'when-revealed and while-in-play',mode:'guns-stock-restriction',source:'TTS Development 49'},
 '52':{name:'Missed Opportunity',trigger:'when-revealed',mode:'automatic',source:'TTS Development 52'},
 '58':{name:'Comancheros',trigger:'end-planning',mode:'choice',source:'TTS Development 58'},
 '61':{name:'Colonial Pressure',trigger:'when-revealed and discard-during-passage',mode:'automatic-with-territory-audit',source:'TTS Development 61'},
 '64':{name:'Smallpox',trigger:'when-revealed and end-Take-Actions',mode:'random-rancheria-and-choice',source:'TTS Development 64'},
 '69':{name:'Cynthia Ann Parker',trigger:'when-revealed',mode:'random-rancheria',source:'TTS Development 69'},
 '75':{name:'Reservation Life',trigger:'when-revealed and while-in-play',mode:'automatic-and-planning-restriction',source:'TTS Development 75'},
 '80':{name:'Tonkawa Scouts',trigger:'when-revealed',mode:'war-movement-guided',source:'TTS Development 80'},
 '82':{name:'Superior Weaponry',trigger:'when-revealed and discard-during-passage',mode:'guns-stock',source:'TTS Development 82'},
 '84':{name:'Reservation Life',trigger:'when-revealed and while-in-play',mode:'automatic-and-planning-restriction',source:'TTS Development 84'},
 '22':{name:'San Sabá Mission',trigger:'when-revealed',mode:'manual-required-subjugation',source:'TTS Development 22'},
 '25':{name:'Manuel del Portillo Urrisola',trigger:'when-revealed',mode:'manual-required-rancheria-selection',source:'TTS Development 25'},
 '26':{name:'Pawnee War',trigger:'when-revealed and war-ends',mode:'manual-required-north-invasion-with-partial-execution',source:'TTS Development 26'},
 '28':{name:'Juan Bautista de Anza',trigger:'when-revealed and while-in-play',mode:'manual-required-history-enemy-exception',source:'TTS Development 28'},
 '29':{name:'Cuerno Verde',trigger:'when-revealed, while-in-play and passage-discard',mode:'manual-required-medicine-and-retirement',source:'TTS Development 29'},
 '37':{name:'Medicine Men',trigger:'planning headman-action while in hand',mode:'manual-required-deck-inspection',source:'TTS Development 37'},
 '41':{name:'Mounted Society',trigger:'hand-play and passage-discard',mode:'manual-required-rancheria-move',source:'TTS Development 41'},
 '44':{name:'Louisiana Purchase',trigger:'while-in-play and passage-discard',mode:'manual-required-cleanup-trade-and-discard',source:'TTS Development 44'},
 '46':{name:'Lone Star Republic',trigger:'while-in-play',mode:'manual-required-enemy-instruction-override',source:'TTS Development 46'},
 '50':{name:'Cheyenne-Arapaho Invasion',trigger:'when-revealed and war-ends',mode:'manual-required-north-invasion-with-partial-execution',source:'TTS Development 50'},
 '51':{name:'Texas Independence',trigger:'when-revealed',mode:'manual-required-random-tribe-and-settlement',source:'TTS Development 51'},
 '53':{name:'Kiowa Alliance',trigger:'when-revealed',mode:'manual-required-tribe-conversion',source:'TTS Development 53'},
 '55':{name:'Indian Removal Act',trigger:'when-revealed and while-in-play',mode:'manual-required-rancheria-displacement',source:'TTS Development 55'},
 '57':{name:'Mexican Independence',trigger:'when-revealed and while-in-play',mode:'partial-regime-with-war-ends-gate',source:'TTS Development 57'},
 '63':{name:'Mexican War',trigger:'when-revealed and while-in-play',mode:'manual-required-regime-change-with-partial-execution',source:'TTS Development 63'},
 '66':{name:'Earl Van Dorn',trigger:'when-revealed and battle-result',mode:'manual-required-surprise-battle',source:'TTS Development 66'},
 '67':{name:'American Civil War',trigger:'when-revealed and while-in-play',mode:'manual-required-enemy-ap-and-recover',source:'TTS Development 67'},
 '72':{name:'Kit Carson’s 1st NM Volunteers',trigger:'when-revealed and battle-result',mode:'manual-required-surprise-battle',source:'TTS Development 72'},
 '74':{name:'Quanah Parker',trigger:'when-revealed and while-in-play',mode:'manual-required-mahimiana-selection',source:'TTS Development 74'},
 '79':{name:'2nd Adobe Walls',trigger:'when-revealed and battle-result',mode:'manual-required-reservation-battle',source:'TTS Development 79'},

});
/** All 84 authentic card identities are sourced from the supplied TTS faces.
 * An identity and face asset are NOT evidence that its gameplay is automated. */
const DEVELOPMENT_NAMES=Object.freeze({
 '01':'Apache War',
 '02':'Ute Alliance',
 '03':'War of Spanish Succession',
 '04':'Disease',
 '05':'Missed Opportunity',
 '06':'Epidemic',
 '07':'Spanish Trade Embargo',
 '08':'Mounted Society',
 '09':'Counting Coup',
 '10':'Prominent Headman',
 '11':'Siege of La Jicarilla',
 '12':'Great Hunt',
 '13':'French Traders',
 '14':'Disease',
 '15':'Negotiation',
 '16':'Quality Mounts',
 '17':'Tactical Advantage',
 '18':'No Relief from War',
 '19':'End of Ute Alliance',
 '20':'Taos Pueblo Trade Opened to Comanches',
 '21':'Mild Winter',
 '22':'San Sabá Mission',
 '23':'Osage Expansion',
 '24':'Smallpox Epidemic',
 '25':'Manuel del Portillo Urrisola',
 '26':'Pawnee War',
 '27':'Severe Winter',
 '28':'Juan Bautista de Anza',
 '29':'Cuerno Verde',
 '30':'Nuevo Apachería',
 '31':'Missed Opportunity',
 '32':'Skillful Warriors',
 '33':'Comancheros',
 '34':'Comancheros',
 '35':'Vibrant Population',
 '36':'Painted Shields',
 '37':'Medicine Men',
 '38':'Disease',
 '39':'Comanche Moon',
 '40':'Comanche Moon',
 '41':'Mounted Society',
 '42':'Tactical Advantage',
 '43':'Santa Fé Trail',
 '44':'Louisiana Purchase',
 '45':'Fort Gibson',
 '46':'Lone Star Republic',
 '47':'Smallpox Epidemic',
 '48':'Cholera Epidemic',
 '49':'Colt-Walker Revolver',
 '50':'Cheyenne-Arapaho Invasion',
 '51':'Texas Independence',
 '52':'Missed Opportunity',
 '53':'Kiowa Alliance',
 '54':'1,000-Mile Raid',
 '55':'Indian Removal Act',
 '56':'Gift Giving',
 '57':'Mexican Independence',
 '58':'Comancheros',
 '59':'Comanche Moon',
 '60':'American Traders',
 '61':'Colonial Pressure',
 '62':'Cynthia Ann Parker',
 '63':'Mexican War',
 '64':'Smallpox',
 '65':'Texas Rangers',
 '66':'Earl Van Dorn',
 '67':'American Civil War',
 '68':'Medicine Lodge Treaty',
 '69':'Cynthia Ann Parker',
 '70':'Buffalo Hunters',
 '71':'Buffalo Hunters',
 '72':'Kit Carson’s 1st NM Volunteers',
 '73':'Texas Beef',
 '74':'Quanah Parker',
 '75':'Reservation Life',
 '76':'Off the Reservation',
 '77':'Off the Reservation',
 '78':'Isatai',
 '79':'2nd Adobe Walls',
 '80':'Tonkawa Scouts',
 '81':'Mountain Howitzers',
 '82':'Superior Weaponry',
 '83':'Ranald Mackenzie’s 4th U.S. Cavalry',
 '84':'Reservation Life'
});
export const DEVELOPMENT_SOURCE_INDEX=Object.freeze(Array.from({length:84},(_,i)=>{
 const number=String(i+1).padStart(2,'0');
 const behavior=DEVELOPMENT_EFFECT_CATALOG[number]||null;
 return Object.freeze({number,period:Math.floor(i/21)+1,name:DEVELOPMENT_NAMES[number],asset:`assets/card-faces/development-${number}.webp`,
  automation:behavior?behavior.mode:'unimplemented',trigger:behavior?.trigger||'not encoded',
  verifiedEffect:Boolean(behavior),complete:false});
}));
export function developmentSourceCoverage(){
 const manualOnly=DEVELOPMENT_SOURCE_INDEX.filter(x=>x.automation.startsWith('manual-required'));
 return {total:DEVELOPMENT_SOURCE_INDEX.length,registered:DEVELOPMENT_SOURCE_INDEX.filter(x=>x.verifiedEffect).length,
  notRegistered:DEVELOPMENT_SOURCE_INDEX.filter(x=>!x.verifiedEffect).length,
  unimplemented:DEVELOPMENT_SOURCE_INDEX.filter(x=>x.automation==='unimplemented').map(x=>x.number),
  manualOnly:manualOnly.map(x=>x.number),fullyAutomated:DEVELOPMENT_SOURCE_INDEX.filter(x=>x.complete).length};
}
function devNumber(card){const n=Number(card?.identifier);return Number.isInteger(n)&&n>=1&&n<=84?String(n).padStart(2,'0'):null;}
// Culture IDs correspond to the 24 card faces supplied in the private TTS sheet.
// Slots in older saves have no identifier; their original set/level is stable.
export const CULTURE_CARD_CATALOG=Object.freeze([
 ['Horsemanship',1,1],['Horsemanship',2,2],['Horsemanship',3,3],
 ['Lords of the Plains',1,1],['Warfare',1,1],['Warfare',2,2],['Warfare',3,3],
 ['Lords of the Plains',2,2],['Trade',1,1],['Trade',2,2],['Trade',3,3],
 ['Lords of the Plains',3,3],['Diplomacy',1,1],['Diplomacy',2,2],['Diplomacy',3,3],
 ['Politics',1,1],['Spirituality',1,1],['Spirituality',2,2],['Spirituality',3,3],
 ['Politics',2,2],['Tactics',1,1],['Tactics',2,2],['Tactics',3,3],['Politics',3,3]
].map(([family,level,cost],i)=>Object.freeze({id:`C${String(i+1).padStart(2,'0')}`,family,level,cost,source:`Supplied TTS culture-${String(i+1).padStart(2,'0')}.webp`})));
const CULTURE_FAMILY_ORDER=['Horsemanship','Lords of the Plains','Warfare','Trade','Diplomacy','Politics','Spirituality','Tactics'];
export function cultureIdentity(c){
 if(c?.kind!=='Culture')return null;
 const direct=/^C?(\d{1,2})$/i.exec(String(c.identifier||'').trim());
 if(direct){const record=CULTURE_CARD_CATALOG[Number(direct[1])-1];if(record)return record;}
 const match=/^setup-culture-set-(\d+)-level-([123])$/.exec(String(c.id||''));
 if(!match)return null;
 return CULTURE_CARD_CATALOG.find(x=>x.family===CULTURE_FAMILY_ORDER[Number(match[1])-1]&&x.level===Number(match[2]))||null;
}
export function cultureActive(s,id){
 const record=CULTURE_CARD_CATALOG.find(x=>x.id===id);
 return Boolean(record&&s.tracks.culture>=record.level&&s.cards.some(c=>c.zone==='In play'&&cultureIdentity(c)?.id===id));
}
export function culturePurchaseOptions(s){
 return CULTURE_CARD_CATALOG.map(record=>{
  const card=s.cards.find(c=>c.kind==='Culture'&&cultureIdentity(c)?.id===record.id);
  const prior=record.level===1||s.cards.some(c=>c.kind==='Culture'&&c.zone==='In play'&&cultureIdentity(c)?.family===record.family&&cultureIdentity(c)?.level===record.level-1);
  return {...record,cardId:card?.id||null,available:card?.zone==='Available',prerequisiteMet:prior,affordable:s.tracks.culture>=record.cost,
   eligible:Boolean(card?.zone==='Available'&&prior&&s.tracks.culture>=record.cost)};
 });
}
export function developmentCoverage(s){
 const cards=s.cards.filter(c=>c.kind==='Development');
 return {total:cards.length,indexed:cards.filter(c=>DEVELOPMENT_EFFECT_CATALOG[devNumber(c)]).length,
 active:cards.filter(c=>['In play','Display'].includes(c.zone)&&DEVELOPMENT_EFFECT_CATALOG[devNumber(c)]).map(c=>({id:c.id,number:devNumber(c),name:DEVELOPMENT_EFFECT_CATALOG[devNumber(c)].name})),
 unresolved:s.developmentPending??null,source:'Supplied English Tabletop Simulator card-face assets'};
}
function activeDevelopment(s,number){return s.cards.filter(c=>c.kind==='Development'&&devNumber(c)===number&&['In play','Display'].includes(c.zone));}
const EPIDEMIC_IDS=['06','24','47','48'];
function activeRecurringDisease(s){return [...EPIDEMIC_IDS,'64'].flatMap(n=>activeDevelopment(s,n));}
function refreshRecurringDisease(s){
 const resolved=new Set(s.epidemicCompletedIds||[]);
 s.epidemicTakeActionsApplied=activeRecurringDisease(s).every(c=>resolved.has(c.id));
}
function markRecurringDisease(s,cardId){
 if(!s.epidemicCompletedIds)s.epidemicCompletedIds=[];
 if(!s.epidemicCompletedIds.includes(cardId))s.epidemicCompletedIds.push(cardId);
 refreshRecurringDisease(s);
}
function applyAmericanTraders(s){
 const loc=seededSelect(s,SPACES.filter(x=>x.type==='round'));
 if(s.pieces.some(p=>p.location===loc.id&&['Tribe','Settlement'].includes(p.type)))return `American Traders: randomly selected ${loc.id} with Tribe/Settlement; no effect.`;
 const stock=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location==='reserve');
 if(!stock)fail('American Traders requires one available Trade Goods counter in physical stock.');
 stock.location=loc.id;const loss=pointLossPreview(s,'culture',1);s.tracks=loss.tracks;
 return `American Traders: placed one Trade Goods at ${loc.id}; lost 1 Culture (deficit substitution applied if necessary).`;
}
function startSmallpoxEnd(s,c){
 const target=seededSelect(s,SPACES.filter(x=>x.type==='round'));
 const tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location===target.id);
 if(tribe){tribe.location='reserve';markRecurringDisease(s,c.id);return `Smallpox (#64): random space ${target.id}; removed Tribe ${tribe.id}.`;}
 const bands=s.pieces.filter(p=>p.type==='Band'&&p.location===target.id);
 if(!bands.length){markRecurringDisease(s,c.id);return `Smallpox (#64): random space ${target.id}; no Tribe or Band present.`;}
 if(bands.length>1||bands[0].strength===1&&s.pieces.some(p=>p.location===`held:${bands[0].id}`)){
  s.developmentPending={cardId:c.id,number:'64',kind:'smallpox-end',phase:'end-take-actions',space:target.id,bandIds:bands.map(b=>b.id),reason:'Choose one Band in the random space, or resolve its possessed-counter loss consequences.'};
  return `Smallpox (#64): random space ${target.id}; choose one affected Band to reduce by 1.`;
 }
 reduceBandForCard(s,bands[0]);markRecurringDisease(s,c.id);
 return `Smallpox (#64): random space ${target.id}; Band ${bands[0].id} reduced by 1.`;
}

function seededSelect(s,items){if(!items.length)return null;const r=rollSeededDie(s.rng.seed);s.rng.seed=r.seed;s.rng.rolls++;return items[(r.seed>>>0)%items.length];}
function reduceBandForCard(s,p){
 if(p.strength===1){ // Defer complex removal of possessed resources/headmen to a guided resolution.
  if(s.pieces.some(q=>q.location===`held:${p.id}`))fail('Band has possessed counters: reconcile loss/death rules before Disease can finish.');
  p.strength=0;p.location='reserve';p.finished=true;
 }else p.strength--;
}
// Card #06: sample uniform map spaces by verified territory/area geometry.
// Keep selection in the saved pending ledger when the printed text requires a choice.
function epidemicSpaces(s,perTerritory){
 const spaces=perTerritory?TERRITORIES.map(([t])=>SPACES.filter(x=>x.type==='round'&&x.territory===t)):
   [SPACES.filter(x=>x.type==='round')];
 return spaces.map(choices=>seededSelect(s,choices).id);
}
function epidemicAmbiguities(s,spaces,chosen={},phase='reveal'){
 const required=[];
 for(const location of spaces){
  if(phase==='reveal'&&s.pieces.some(p=>p.type==='Rancheria'&&p.location===location))continue;
  if(phase==='end-take-actions'&&s.pieces.some(p=>p.type==='Tribe'&&p.location===location))continue;
  const bands=s.pieces.filter(p=>p.type==='Band'&&p.location===location);
  if(bands.length>1&&!chosen[location])required.push({space:location,bandIds:bands.map(p=>p.id)});
 }
 return required;
}
function applyEpidemic(s,spaces,chosen={},phase='reveal'){
 const ambiguities=epidemicAmbiguities(s,spaces,chosen,phase);
 if(ambiguities.length)fail('Epidemic requires choosing one Band in each multiply occupied selected space.');
 const bands=[],tribes=[];
 for(const location of spaces){
  const ranches=phase==='reveal'?s.pieces.filter(p=>p.type==='Rancheria'&&p.location===location):[];
  const localTribes=s.pieces.filter(p=>p.type==='Tribe'&&p.location===location);
  if(phase==='end-take-actions'&&localTribes.length){tribes.push(...localTribes);continue;}
  const candidates=ranches.length?s.pieces.filter(p=>p.type==='Band'&&ranches.some(r=>p.location===`box:${r.id}`)):
    s.pieces.filter(p=>p.type==='Band'&&p.location===location);
  if(!ranches.length&&candidates.length>1){
   if(!candidates.some(p=>p.id===chosen[location]))fail('Chosen Epidemic Band must be in its selected map space.');
   bands.push(candidates.find(p=>p.id===chosen[location]));
  }else bands.push(...candidates);
  if(phase==='reveal')tribes.push(...localTribes);
 }
 if(bands.some(p=>p.strength===1&&s.pieces.some(q=>q.location===`held:${p.id}`)))
   fail('Epidemic would remove a Band holding possessed counters; reconcile their printed fate before auto-resolution.');
 // The six revealed territories are disjoint, so the selected pieces cannot duplicate.
 for(const band of bands)reduceBandForCard(s,band);
 for(const tribe of tribes)tribe.location='reserve';
 return {bands:bands.length,tribes:tribes.length};
}
function initiateEpidemic(s,c,phase){
 const spaces=epidemicSpaces(s,phase==='reveal');
 const ambiguous=epidemicAmbiguities(s,spaces,{},phase);
 if(ambiguous.length){
  s.developmentPending={cardId:c.id,number:devNumber(c),kind:'epidemic',phase,spaces,reason:'Choose a Band in each multiply occupied Epidemic space before resolving the printed card.'};
  return `Epidemic (${phase}): random spaces ${spaces.join(', ')}. ${ambiguous.length} space(s) require Band selection.`;
 }
 // If a headman/possession issue requires a manual procedure, retain a pending record.
 try{
  const result=applyEpidemic(s,spaces,{},phase);
  if(phase==='end-take-actions')markRecurringDisease(s,c.id);
  return `Epidemic (${phase}): random map spaces ${spaces.join(', ')}; ${result.bands} Band(s) weakened, ${result.tribes} Tribe(s) removed.`;
 }catch(err){
  if(!/possessed counters/.test(err.message))throw err;
  s.developmentPending={cardId:c.id,number:devNumber(c),kind:'epidemic-manual',phase,spaces,reason:'Epidemic selected a Band with possessed counters that would be reduced to zero; resolve printed consequences.'};
  return `Epidemic (${phase}): selected ${spaces.join(', ')}; manual Band-possession/death consequences required.`;
 }
}
/** Printed §2.5.3. This preflighted procedure is shared by Development #25
 * and future effects which explicitly destroy a Ranchería. It intentionally
 * does not create substitute counters or infer a Mahimiana's affiliation.
 */
export function destroyRancheriaByRule(s,rancheriaId){
 const ranch=s.pieces.find(p=>p.id===rancheriaId&&p.type==='Rancheria'&&SPACE[p.location]);
 if(!ranch)fail('Ranchería Destruction requires a Ranchería on the map.');
 const group=String(ranch.subtype||'').trim().toUpperCase();
 const mahimianas=s.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='removed'&&(
   p.affiliatedRancheriaId===ranch.id || p.location===`box:${ranch.id}` ||
   group&&String(p.subtype||'').trim().toUpperCase()===group ||
   group&&new RegExp(`(?:^|\\s)${group}$`,'i').test(String(p.label||''))));
 if(mahimianas.length>1)fail('Multiple Mahimiana counters claim this Ranchería; confirm affiliation before destruction.');
 const chief=mahimianas[0]||null;
 // A Mahimiana can be held by a Band; the affiliated counter must be
 // unambiguous even if it is not physically in its Ranchería Resources box.
 const success=s.pieces.filter(p=>p.subtype==='Success'&&(
   p.location===`box:${ranch.id}` || chief&&p.location===`medicine:${chief.id}`));
 const contents=s.pieces.filter(p=>p.location===`box:${ranch.id}`&&['Band','Resource'].includes(p.type));
 // A destroyed Band may hold counters that must go back to stock as well.
 const bandIds=new Set(contents.filter(p=>p.type==='Band').map(p=>p.id));
 const heldResources=s.pieces.filter(p=>p.location.startsWith('held:')&&bandIds.has(p.location.slice(5)));
 if(heldResources.some(p=>!['Resource','Mahimiana','Marker'].includes(p.type)))
   fail('Unexpected object held by a destroyed Band; reconcile before destruction.');
 // The physical Mahimiana may be associated through a possessed Band.
 if(heldResources.some(p=>p.type==='Mahimiana'&&(!chief||p.id!==chief.id)))
   fail('Destroyed Band holds an unrelated Mahimiana; reconcile before destruction.');
 const loss=pointLossPreview(s,'military',2);
 // All validations above precede mutations; perform() also works on a clone.
 for(const p of [...contents,...heldResources]){
  if(p===chief)continue;
  p.location='reserve';
 }
 for(const p of success)p.location='cup';
 if(chief){
  for(const p of s.pieces.filter(p=>p.subtype==='Success'&&p.location===`medicine:${chief.id}`))p.location='cup';
  chief.location='reserve';chief.medicine=0;
  if(group==='A'&&s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).length===1 && typeof s.medicine?.mahimiana==='number')s.medicine.mahimiana=0;
 }
 ranch.location=`box:${ranch.id}`;
 s.tracks=loss.tracks;
 return {rancheriaId:ranch.id,bands:contents.filter(p=>p.type==='Band').length,
  resources:contents.filter(p=>p.type==='Resource').length,
  success:success.length,militaryLost:loss.direct,cultureSubstituted:loss.otherLoss,
  mahimianaKilled:Boolean(chief)};
}
function eligibleMahimianas(s){
 return s.pieces.filter(p=>p.type==='Mahimiana'&&!['reserve','removed'].includes(p.location));
}
function medicineValue(s,chief){
 // The setup compatibility track is only a fallback for the original lone
 // headman; individual counters are authoritative once they carry medicine.
 return Number.isInteger(chief.medicine)?chief.medicine:
   (eligibleMahimianas(s).length===1&&Number.isInteger(s.medicine?.mahimiana)?s.medicine.mahimiana:null);
}
function setMedicine(s,chief,value){
 if(!Number.isInteger(value)||value<0||value>6)fail('The printed Mahimiana Medicine rating must be between 0 and 6.');
 chief.medicine=value;
 if(eligibleMahimianas(s).length===1&&s.medicine)s.medicine.mahimiana=value;
}
/** Resolve the card-aware headman steps of Passage of Time (§4.4 steps 5–7).
 * Refuses to infer missing Mahimiana/Paraibo affiliation or medicine.
 */
function passageHeadmen(s){
 const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
 const pairs=[];
 for(const ranch of ranches){
  const matches=type=>s.pieces.filter(p=>p.type===type&&p.location!=='removed'&&(
   p.affiliatedRancheriaId===ranch.id ||
   p.location===`box:${ranch.id}` ||
   Boolean(ranch.subtype)&&String(p.subtype||'').toUpperCase()===String(ranch.subtype).toUpperCase()));
  const chiefs=matches('Mahimiana'),civil=matches('Paraibo');
  if(chiefs.length!==1||civil.length!==1)fail(`Passage headmen: ${ranch.id} requires exactly one affiliated Mahimiana and Paraibo in the ledger.`);
  const ma=chiefs[0],pa=civil[0];
  const mv=medicineValue(s,ma);
  const pv=Number.isInteger(pa.medicine)?pa.medicine:(ranches.length===1? s.medicine?.paraibo:null);
  if(!Number.isInteger(mv)||mv<0||mv>6||!Number.isInteger(pv)||pv<0||pv>6)
   fail(`Passage headmen: record printed Medicine 0–6 for both headmen of ${ranch.id}.`);
  if(pairs.some(x=>x.ma.id===ma.id||x.pa.id===pa.id))fail('One headman is assigned to multiple Rancherías.');
  pairs.push({ranch,ma,pa,mv,pv});
 }
 return pairs;
}
function passageHeadmanStep(s,step){
 if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Headman procedure belongs to Passage of Time.');
 if(s.steps[`pt${step}`]==='done')fail(`Passage step ${step} already resolved.`);
 if(Array.from({length:step-1},(_,i)=>`pt${i+1}`).some(k=>!['done','na'].includes(s.steps[k])))
  fail(`Complete all preceding Passage steps before step ${step}.`);
}
function revealMedicineCard(s,c,number){
 if(number==='29'){
  const chiefs=eligibleMahimianas(s).filter(p=>medicineValue(s,p)!==null);
  if(!chiefs.length){
   s.developmentPending={cardId:c.id,number,kind:'cuerno-medicine',chiefIds:eligibleMahimianas(s).map(p=>p.id),reason:'Identify the printed Medicine ratings of the Mahimiana counters before choosing one to increase to 6.'};
   return 'Cuerno Verde: Mahimiana Medicine ratings need verification.';
  }
  if(chiefs.length===1){setMedicine(s,chiefs[0],6);return `Cuerno Verde: increased ${chiefs[0].id} Medicine to 6.`;}
  s.developmentPending={cardId:c.id,number,kind:'cuerno-medicine',chiefIds:chiefs.map(p=>p.id),reason:'Choose any one in-play Mahimiana to increase its Medicine to 6.'};
  return 'Cuerno Verde: choose the Mahimiana to increase to Medicine 6.';
 }
 const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
 const ranch=seededSelect(s,ranches);
 if(!ranch)return 'Quanah Parker: no in-play Ranchería; no Mahimiana Medicine increase.';
 const chiefCandidates=s.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='removed'&&(
  p.affiliatedRancheriaId===ranch.id||p.location===`box:${ranch.id}`||
  String(p.subtype||'').trim().toUpperCase()===String(ranch.subtype||'').trim().toUpperCase()&&Boolean(ranch.subtype)));
 if(chiefCandidates.length!==1||medicineValue(s,chiefCandidates[0])===null){
  s.developmentPending={cardId:c.id,number,kind:'quanah-medicine',rancheriaId:ranch.id,chiefIds:chiefCandidates.map(p=>p.id),reason:'Randomly selected Ranchería recorded; identify its unique Mahimiana and printed Medicine rating before +3.'};
  return `Quanah Parker: selected ${ranch.id}; Mahimiana affiliation or Medicine rating needs reconciliation.`;
 }
 const chief=chiefCandidates[0],before=medicineValue(s,chief);
 setMedicine(s,chief,Math.min(6,before+3));
 return `Quanah Parker: randomly selected ${ranch.id}; ${chief.id} Medicine ${before}→${chief.medicine} (maximum 6).`;
}
function revealDevelopmentEffect(s,c){
 const number=devNumber(c),effect=DEVELOPMENT_EFFECT_CATALOG[number];
 if(number==='29'||number==='74')return revealMedicineCard(s,c,number);
 if(number==='53'){
  const tribes=s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round');
  if(!tribes.length)return 'Kiowa Alliance: no Tribe counter in a numbered map space to remove.';
  s.developmentPending={cardId:c.id,number,kind:'kiowa-alliance',tribeIds:tribes.map(p=>p.id),reason:'Choose one Tribe to remove, an available Ranchería, an eligible Band and up to two available Horse counters. Place the new headmen at Medicine 2.'};
  return 'Kiowa Alliance: choose Tribe and the available physical Ranchería/Band/Horse counters for the printed reveal.';
 }

 if(['06','24','47','48'].includes(number))return initiateEpidemic(s,c,'reveal');
 // #26 / #50: North War Column replacement. Preserve printed physical limits.
 // Existing columns with missing Instruction pairings are left unresolved;
 // do not silently erase them or invent an Instruction G counter.
 if(number==='26'||number==='50'){
  const north=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='North'&&SPACE[p.location]);
  const special=s.pieces.filter(p=>p.type==='Instruction'&&p.owner==='North'&&(/^G(?:$|\b)/i.test(String(p.label||'')) || String(p.subtype||'').toUpperCase()==='G'));
  const reserveWar=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='North'&&p.location==='reserve');
  const g=special.filter(p=>['reserve','cup'].includes(p.location));
  // Do not assume where a previous special G goes; existing War Ends for G
  // intentionally blocks until that exception is independently resolved.
  let plans=[];
  try{plans=north.map(w=>warEndsPreview(s,w.id));}catch(e){
   s.developmentPending={cardId:c.id,number,reason:'North invasion: existing War Column has an ambiguous pairing or special Instruction G destination.'};
   return `${effect.name}: existing North War Column requires physical War Ends reconciliation.`;
  }
  if(reserveWar.length!==1||g.length!==1){
   s.developmentPending={cardId:c.id,number,reason:'North invasion: verify exactly one available North strength counter and one Instruction G.'};
   return `${effect.name}: cannot unambiguously obtain the physical North War Column and G Instruction.`;
  }
  // War Ends may fill the top display slot or return instructions to cup;
  // both are governed by the existing sequential procedure.
  for(const w of north)resolveWarEnds(s,w.id);
  reserveWar[0].location='N';reserveWar[0].strength=6;
  g[0].location='N';reserveWar[0].specialNorthInstructionG=true;
  return `${effect.name}: ended ${plans.length} North War Columns; placed printed strength-6 North Column with G in North square (G never returns to normal display).`;
 }
 if(number==='25'){
  // #25 Manuel del Portillo Urrisola: distance from West square through
  // non-dashed edges; alphabetic Ranchería priority on equal distances.
  // The printed card is discarded with NO replacement after resolution.
  const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
  if(!ranches.length||ranches.every(p=>p.location==='PD')){
   c.zone='Discard';return 'Portillo Urrisola: all Rancherías in Palo Duro Canyon (or none in play); no effect; card discarded without replacement.';
  }
  const distance=(dest)=>{
   const visited=new Set(['W']),queue=[['W',0]];
   for(const [at,d] of queue){
    if(at===dest)return d;
    for(const edge of s.edges.filter(e=>(e.a===at||e.b===at)&&e.kind!=='dashed')){
     const to=edge.a===at?edge.b:edge.a;
     if(!visited.has(to)){visited.add(to);queue.push([to,d+1]);}
    }
   }
   return Infinity;
  };
  const eligible=ranches.filter(p=>p.location!=='PD').map(p=>({p,d:distance(p.location)})).filter(x=>Number.isFinite(x.d))
    .sort((a,b)=>a.d-b.d||String(a.p.subtype||a.p.label||a.p.id).localeCompare(String(b.p.subtype||b.p.label||b.p.id)));
  if(!eligible.length){
   s.developmentPending={cardId:c.id,number,reason:'Portillo Urrisola: no verified non-dashed route from West square to an in-play Ranchería.'};
   return 'Portillo Urrisola: verify West distance and map connections before selection.';
  }
  const chosen=eligible[0].p;
  const captives=s.pieces.filter(p=>p.location===`box:${chosen.id}`&&p.type==='Resource'&&p.subtype==='Captives');
  if(!captives.length){
   const result=destroyRancheriaByRule(s,chosen.id);
   c.zone='Discard';
   return `Portillo Urrisola: destroyed ${chosen.label||chosen.id} under §2.5.3; ${result.bands} Bands and ${result.resources} Resources returned to stock, ${result.success} Success counters returned to cup, Military loss 2 with any required Culture substitution. Card discarded without replacement.`;
  }
  for(const captive of captives)captive.location='reserve';
  c.zone='Discard';
  return `Portillo Urrisola: selected nearest Ranchería ${chosen.label||chosen.id} (${eligible[0].d} connections); spent ${captives.length} Captives; card discarded without replacement.`;
 }
 if(number==='28'){
  // Printed #28: end West Peace, War Ends any existing West columns, then
  // activate the topmost West Instruction and one physical strength-8 column.
  const peace=s.pieces.filter(p=>p.type==='Instruction'&&p.owner==='West'&&p.subtype==='Peace'&&p.location==='W');
  if(!peace.length){
   if(isPeace(s,'W')){
    s.developmentPending={cardId:c.id,number,reason:'West is marked Peace without an identifiable physical West Peace Instruction.'};
    return 'Anza: West Peace instruction ambiguous; resolve physical counter.';
   }
   return 'Anza: West square is not Peace; no reveal effect.';
  }
  const wars=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='West'&&SPACE[p.location]);
  const squareInstructions=s.pieces.filter(p=>p.type==='Instruction'&&p.owner==='West'&&p.location==='W');
  const stock=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='West'&&p.location==='reserve');
  // Preflight every War Ends before making any changes. Any ambiguity blocks
  // the entire effect, including the Peace counter's return.
  let plans=[];
  try{plans=wars.map(w=>warEndsPreview(s,w.id));}catch(e){
   s.developmentPending={cardId:c.id,number,reason:'Anza: West War Ends has an ambiguous or missing paired War/Raid Instruction.'};
   return 'Anza: West War Ends pairing needs reconciliation; no changes applied.';
  }
  const nonWarSquare=squareInstructions.filter(i=>!plans.some(p=>p.instructionId===i.id));
  if(peace.length!==1||nonWarSquare.length!==1||nonWarSquare[0].id!==peace[0].id||stock.length!==1){
   s.developmentPending={cardId:c.id,number,reason:'Anza: West Peace or physical reserve strength counter is ambiguous.'};
   return 'Anza: cannot identify physical West Peace and reserve War counter.';
  }
  // Simulate all column returns before mutating the real state, so a full
  // display cannot leave the game half-resolved on an unsuccessful reveal.
  const trial=clone(s);
  for(const w of wars)resolveWarEnds(trial,w.id);
  if(!DISPLAY_ROWS.some(row=>!trial.pieces.some(p=>p.location===`enemy-display:West:${row}`))){
   s.developmentPending={cardId:c.id,number,reason:'Anza: no West display slot available for the ended Peace after War Ends.'};
   return 'Anza: West display would remain full; no counter changes applied.';
  }
  // Resolve War Ends with the existing sequential slot allocation, then put
  // the ended Peace counter in the current topmost empty display slot.
  for(const w of wars)resolveWarEnds(s,w.id);
  const empty=DISPLAY_ROWS.find(row=>!s.pieces.some(p=>p.location===`enemy-display:West:${row}`));
  if(!empty){
   s.developmentPending={cardId:c.id,number,reason:'Anza: West display is full after resolving War Ends.'};
   return 'Anza: no West display slot for ended Peace.';
  }
  peace[0].location=`enemy-display:West:${empty}`;
  const top=DISPLAY_ROWS.map(row=>s.pieces.find(p=>p.type==='Instruction'&&p.owner==='West'&&p.location===`enemy-display:West:${row}`)).find(Boolean);
  if(!top)fail('Anza: no West Instruction available after Peace ends.');
  top.location='W';stock[0].location='W';stock[0].strength=8;
  return `Anza: ${wars.length} West War Columns ended; Peace returned to ${empty}; activated ${top.id} with printed strength 8.`;
 }
 if(number==='63'){
  const colonialWars=s.pieces.filter(p=>p.type==='War Column'&&['East','West','South'].includes(p.owner)&&SPACE[p.location]);
  let plans;
  try{plans=colonialWars.map(w=>warEndsPreview(s,w.id));}
  catch(err){s.developmentPending={cardId:c.id,number,reason:'Mexican War: identify every East, West and South War Column paired Instruction before War Ends; leave powers unchanged.'};return 'Mexican War: recorded War Columns need correct paired Instructions before regime change.';}
  for(const w of colonialWars)resolveWarEnds(s,w.id);
  s.colonial.East='USA';s.colonial.West='USA';s.colonial.South='Mexico';
  return `Mexican War: ${plans.length} East/West/South War Column(s) ended; USA commands East and West, Mexico commands South. The printed ongoing no-effect and Recover restriction must still be enforced.`;
 }
 if(number==='19'){
  const stock=s.pieces.find(p=>p.type==='Tribe'&&p.location==='reserve');
  if(!stock)fail('End of Ute Alliance requires an available Tribe counter in physical stock.');
  const occupying=s.pieces.filter(p=>p.location==='UA-1'&&!['Bison','Resource','Marker'].includes(p.type));
  const ranches=occupying.filter(p=>p.type==='Rancheria');
  if(occupying.length>1||occupying.some(p=>p.type!=='Rancheria')){
   s.developmentPending={cardId:c.id,number,reason:'End of Ute Alliance: Upper Arkansas 1 contains an unsupported non-Ranchería piece; reconcile the physical map.'};
   return 'End of Ute Alliance: printed placement needs occupant reconciliation.';
  }
  if(ranches.length){
   const ranch=ranches[0];
   const destinations=SPACES.filter(x=>x.territory==='UA'&&x.id!=='UA-1'&&
    !s.pieces.some(p=>p.location===x.id&&['Rancheria','Band','Tribe','Settlement'].includes(p.type))).map(x=>x.id);
   if(destinations.length>1){
    s.developmentPending={cardId:c.id,number,kind:'ute-displacement',rancheriaId:ranch.id,destinations,
     reason:'Choose a legal Upper Arkansas destination for the displaced Ranchería before placing the Tribe.'};
    return `End of Ute Alliance: choose where to move ${ranch.label||ranch.id} (${destinations.join(', ')}).`;
   }
   if(destinations.length===1)ranch.location=destinations[0];
   else destroyRancheriaByRule(s,ranch.id);
  }
  for(const bison of s.pieces.filter(p=>p.type==='Bison'&&p.location==='UA-1'))bison.location='reserve';
  stock.location='UA-1';
  return `End of Ute Alliance: placed physical Tribe at UA-1; ${ranches.length?(SPACE[ranches[0].location]?'relocated Ranchería to '+ranches[0].location:'destroyed Ranchería under §2.5.3'):'no Ranchería displacement required'}.`;
 }
 if(number==='51'){
  const tribes=s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.territory==='RR');
  const tribe=seededSelect(s,tribes);
  if(tribe)tribe.location='reserve';
  const candidates=SPACES.filter(x=>x.territory==='RR'&&!s.pieces.some(p=>p.location===x.id&&['Band','Rancheria','Tribe','Settlement'].includes(p.type)));
  if(!candidates.length){s.developmentPending={cardId:c.id,number,reason:'Texas Independence: East Settlement placement requires a stacking decision in Red River.'};return 'Texas Independence: Tribe removed when available; no unoccupied Red River map space for Settlement.';}
  const settlement=s.pieces.find(p=>p.type==='Settlement'&&p.location==='reserve');
  if(!settlement){s.developmentPending={cardId:c.id,number,reason:'Texas Independence: physical East Settlement stock is unavailable; check the component limit.'};return 'Texas Independence: cannot place a Settlement absent an available physical counter.';}
  const target=seededSelect(s,candidates);settlement.location=target.id;settlement.owner='East';
  for(const bison of s.pieces.filter(p=>p.type==='Bison'&&p.location===target.id))bison.location='reserve';
  return `Texas Independence: ${tribe?'removed random Red River Tribe '+tribe.id+'; ':'no Red River Tribe present; '}placed East Settlement at ${target.id}, returning Bison to stock.`;
 }
 if(number==='67'){
  const before=s.tracks.enemyAp;s.tracks.enemyAp=0;
  s.developmentPending={cardId:c.id,number,reason:'After current Development draws, put #68 atop deck; East Instruction and Planning exceptions need guarded resolution.'};
  return `American Civil War: Enemy AP track reset ${before}→0; deck ordering and ongoing instruction exceptions must be resolved before continuing.`;
 }
 if(number==='57'){
  // Printed #57: flip display counters in West and South, but War Ends only
  // SOUTH and EAST columns (not West).  This distinction is essential.
  const columns=s.pieces.filter(p=>p.type==='War Column'&&['South','East'].includes(p.owner)&&SPACE[p.location]);
  try{columns.forEach(w=>warEndsPreview(s,w.id));}catch(e){
   s.developmentPending={cardId:c.id,number,reason:'Mexican Independence: South/East War Ends has ambiguous or missing paired Instruction; no effects applied.'};
   return 'Mexican Independence: reconcile South/East War Ends before regime change.';
  }
  for(const w of columns)resolveWarEnds(s,w.id);
  const instructions=s.pieces.filter(p=>p.type==='Instruction'&&['South','West'].some(enemy=>String(p.location||'').startsWith(`enemy-display:${enemy}:`)));
  for(const counter of instructions)counter.flipped=!counter.flipped;
  s.colonial.South='Mexico';s.colonial.West='Mexico';
  return `Mexican Independence: ended ${columns.length} South/East War Columns, flipped ${instructions.length} South/West display instructions; Mexico commands South and West.`;
 }
 if(number==='60')return applyAmericanTraders(s);
 if(number==='43'){
  s.flags.santaFe=true;
  return 'Santa Fé Trail opened; Operation Cleanup Step 4 now applies and the printed northern East square exception remains relevant.';
 }
 if(number==='30'){
  const tribes=s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]);
  if(!tribes.length){return 'Nuevo Apachería: no in-play Tribe to relocate; new Development cards may not be taken into hand while this card is in play.';}
  s.developmentPending={cardId:c.id,number,kind:'nuevo-apacheria',reason:'Player chooses one in-play Tribe and its Rio Grande destination; remove Bison and Settlement from destination.'};
  return 'Nuevo Apachería: choose a Tribe and Rio Grande destination before continuing.';
 }
 if(number==='23'){
  const eligible=(t)=>SPACES.filter(x=>x.territory===t).filter(x=>!s.pieces.some(p=>p.location===x.id&&['Tribe','Settlement','Rancheria','Band'].includes(p.type)));
  const options=eligible('LA').length?eligible('LA'):eligible('UA');
  if(!options.length){s.developmentPending={cardId:c.id,number,reason:'Osage Expansion cannot safely place a Tribe in the recorded occupied round spaces. Reconcile stacking.'};return 'Osage Expansion: no eligible open space; resolve printed stacking rules.';}
  const stock=s.pieces.find(p=>p.type==='Tribe'&&p.location==='reserve');
  if(!stock)fail('Osage Expansion requires an available physical Tribe counter.');
  const target=seededSelect(s,options);
  for(const b of s.pieces.filter(p=>p.type==='Bison'&&p.location===target.id))b.location='reserve';
  stock.location=target.id;c.zone='Discard';
  return `Osage Expansion: placed Tribe in ${target.id}, removed Bison there, card discarded without replacement.`;
 }
 if(number==='45'){
  const spot='LA-6',ranches=s.pieces.filter(p=>p.type==='Rancheria'&&p.location===spot);
  if(ranches.length){s.developmentPending={cardId:c.id,number,reason:'Fort Gibson: move Ranchería from LA-6 to an eligible other space using printed displacement rules before placing East Settlement.'};return 'Fort Gibson: Ranchería displacement in LA-6 requires a verified destination.';}
  const blocked=s.pieces.some(p=>p.location===spot&&p.type==='Settlement');
  if(blocked){s.developmentPending={cardId:c.id,number,reason:'Fort Gibson: existing Settlement in LA-6 requires stacking reconciliation.'};return 'Fort Gibson: space already contains Settlement.';}
  const settlement=s.pieces.find(p=>p.type==='Settlement'&&p.location==='reserve');
  if(!settlement)fail('Fort Gibson requires an available physical Settlement counter.');
  for(const tribe of s.pieces.filter(p=>p.location===spot&&p.type==='Tribe'))tribe.location='reserve';
  for(const bison of s.pieces.filter(p=>p.location===spot&&p.type==='Bison'))bison.location='reserve';
  settlement.location=spot;settlement.owner='East';return 'Fort Gibson: placed East Settlement in LA-6, returned any Tribe/Bison to stock.';
 }
 if(number==='68'){
  const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).length;
  const before=s.tracks.military;
  if(before>ranches)s.tracks.military=ranches;
  return `Medicine Lodge Treaty: Military Points reduced from ${before} to ${s.tracks.military} (in-play Ranchería count ${ranches}); ongoing Reservation effect requires cleanup.`;
 }
 if(number==='27'){
  const targets=s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]&&['UA','LA'].includes(SPACE[p.location].territory));
  for(const p of targets)p.location='reserve';
  c.zone='Discard';return `Severe Winter: returned ${targets.length} Bison from Upper and Lower Arkansas to stock; no replacement.`;
 }
 if(number==='49'||number==='82'){
  const guns=s.pieces.filter(p=>p.subtype==='Guns'&&!['reserve','removed'].includes(p.location));
  for(const gun of guns)gun.location='reserve';
  return `${effect.name}: returned ${guns.length} in-play Guns counter(s) to stock; ongoing restrictions still apply.`;
 }
 if(number==='75'||number==='84'){
  const bands=s.pieces.filter(p=>p.type==='Band'&&p.location==='RESERVATION');
  for(const b of bands)b.finished=true;
  return `Reservation Life: ${bands.length} Band(s) in Reservation marked Finished; Planning restrictions remain active.`;
 }
 if(number==='61'){
  const audit=territoryControlAudit(s);
  if(audit.some(t=>t.status==='review-needed')){
   s.developmentPending={cardId:c.id,number,reason:'Colonial Pressure requires verified territory control; settlement ownership/peace status unresolved.'};
   return 'Colonial Pressure: verify territory control before awarding Military Points.';
  }
  const count=audit.filter(t=>t.status==='controlled').length;
  s.tracks.military=Math.min(9,s.tracks.military+count);
  return `Colonial Pressure: +${count} Military (subject to 9-point track cap), from ${count} controlled territories.`;
 }
 if(number==='69'){
  const eligible=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]&&s.pieces.some(x=>x.subtype==='Captives'&&x.location===`box:${p.id}`));
  const target=seededSelect(s,eligible);
  if(!target)return 'Cynthia Ann Parker: no Ranchería with Captives; no effect.';
  const captives=s.pieces.filter(x=>x.subtype==='Captives'&&x.location===`box:${target.id}`);
  for(const x of captives)x.location='reserve';
  const loss=pointLossPreview(s,'culture',1);s.tracks=loss.tracks;
  return `Cynthia Ann Parker: ${target.label||target.id} loses ${captives.length} Captives; Culture loses 1 with printed deficit substitution.`;
 }
 if(number==='64'){
  const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
  const target=seededSelect(s,ranches);
  if(!target)return 'Smallpox: no in-play Ranchería; no effect on reveal.';
  const bands=s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${target.id}`);
  if(bands.some(p=>p.strength===1&&s.pieces.some(q=>q.location===`held:${p.id}`)))fail('Smallpox would eliminate a Band holding counters; cannot safely auto-resolve possession.');
  for(const b of bands)reduceBandForCard(s,b);
  return `Smallpox: random Ranchería ${target.label||target.id}; ${bands.length} Bands reduced by 1.`;
 }
 if(!effect||!['04','05','14','31','38','52'].includes(number)){
  // Source-backed status is not equivalent to an executable effect.
  if(!['01','02','03','06','07','08','09','10','11','12','13','15','18','20','33','34'].includes(number))
   s.developmentPending={cardId:c.id,number,reason:'Printed effect requires guided/manual resolution'};
  return effect?`Development ${number}: ${effect.name} is registered (${effect.trigger}); follow its printed timing and any choices.`:`Development ${number||'?'}: printed effect is not yet implemented.`;
 }
 if(['04','14','38'].includes(number)){
  const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
  const target=seededSelect(s,ranches);
  if(!target){c.zone='Discard';return 'Disease: no in-play Ranchería; card discarded.';}
  const bands=s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${target.id}`);
  // preflight all reductions to prevent partial state mutation
  if(bands.some(p=>p.strength===1&&s.pieces.some(q=>q.location===`held:${p.id}`)))
    fail('Disease would eliminate a Band holding counters; resolve possession and headman consequences manually before revealing.');
  for(const band of bands)reduceBandForCard(s,band);
  c.zone='Discard';return `Disease: Ranchería ${target.label||target.id}; ${bands.length} Bands reduced; card discarded, no replacement.`;
 }
 // 05: discard all cards held in hand, discard itself, draw one replacement.
 for(const held of s.cards.filter(x=>x.kind==='Development'&&x.zone==='Hand')){held.zone='Discard';passageDiscard(s,held);}
 c.zone='Discard';
 const deck=s.cards.filter(x=>x.kind==='Development'&&x.zone==='Deck'&&Math.ceil(Number(x.identifier)/21)===s.period);
 const replacement=seededSelect(s,deck);
 if(!replacement)return 'Missed Opportunity: hand discarded; replacement deck empty.';
 replacement.zone='In play';
 // Card #05 can chain into another #05, but each recursion consumes a unique card.
 return `Missed Opportunity: hand discarded, replacement ${devNumber(replacement)||replacement.id}. `+revealDevelopmentEffect(s,replacement);
}
function passageDiscard(s,c){
 const n=devNumber(c);
 if(s.phase!=='execution'||s.operation!=='Passage of Time')return false;
 if(['08','09','10','11','29','32','36','41','54','62','76','77','78'].includes(n))
   s.tracks.passage=Math.min(20,s.tracks.passage+1);
 if(['61'].includes(n)){
   const without=TERRITORIES.filter(([t])=>!s.pieces.some(p=>p.type==='Rancheria'&&SPACE[p.location]?.territory===t)).length;
   if(without){const loss=pointLossPreview(s,'military',without);s.tracks=loss.tracks;}
 }
 if(['76','77','78'].includes(n)){
   const loss=pointLossPreview(s,'military',1);s.tracks=loss.tracks;
 }
 if(['44','60'].includes(n))for(const p of s.pieces.filter(p=>p.subtype==='Trade Goods'&&SPACE[p.location]&&!s.pieces.some(b=>b.type==='Band'&&p.location===`held:${b.id}`)))p.location='reserve';
 if(['82','83'].includes(n)){
   const horses=s.pieces.filter(p=>p.subtype==='Horse'&&!['reserve','removed'].includes(p.location));
   if(horses.length){
    s.developmentPending={cardId:c.id,number:n,kind:'horse-discard',required:Math.ceil(horses.length/2),horseIds:horses.map(p=>p.id),reason:'Choose which half (rounded up) of all in-play Horses counters to return to stock.'};
   }
 }
 return true;
}
function applyApacheWar(s){
 if(!activeDevelopment(s,'01').length)return 0;
 let removed=0;
 for(const tribe of s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location])){
  const ravaged=s.pieces.filter(p=>p.location===tribe.location&&(p.subtype==='Ravaged'||p.type==='Marker'&&/ravaged/i.test(p.label||'')));
  if(ravaged.length<3)continue;
  tribe.location='reserve';for(const r of ravaged)r.location='reserve';removed++;
 }
 return removed;
}
function enemyEffectStatus(s){const f=s.enemyFlow;if(!f||f.stage!=='effect'||!f.currentId)return null;
 const name=instructionName(s.pieces.find(p=>p.id===f.currentId));
 return {kind:name,canAutomate:name==='Culture Attack'&&!enemyCulturePreview(s,f.enemy).recoverFirst&&!enemyCulturePreview(s,f.enemy).unverifiedRavaged,
 manualReasons:name==='Unknown'?['Printed Instruction identity still unknown']:name==='Culture Attack'?[]:['Effect requires choices or source-confirmed targets']};
}
export {enemyEffectStatus};

export function instructionName(p){
 const text=String(p?.subtype||p?.label||'').trim();
 if(/^cult(?:ure)?(?:\s|$)/i.test(text))return 'Culture Attack';
 if(/^subjugate(?:\s|$)/i.test(text))return 'Subjugate';
 if(/^war(?:\s|$)/i.test(text))return 'War';
 if(/^ally(?:\s|$)/i.test(text))return 'Ally';
 if(/^peace(?:\s|$)/i.test(text))return 'Peace';
 if(/^hunt(?:\s|$)/i.test(text))return 'Hunt';
 if(/^encr(?:oach)?(?:\s|$)/i.test(text))return 'Encroach';
 return 'Unknown';
}
/**
 * Rule 6.3.4: a territory die selects the first territory; if it contains
 * no Bison, check the successive die-face territories (wrapping after 6).
 * Faces 1–2 are confirmed by GMT playbook examples; face 3 by GMT Living
 * Rules §2.2 (Llano Estacado). Remaining 4–6 are user-verified until
 * the full map symbol chart is independently transcribed.
 */
export const VERIFIED_HUNT_DIE_TERRITORIES=Object.freeze({1:'UA',2:'LA',3:'LE'});
export function huntTargetPreview(s,die,order){
 const face=Number(die);
 if(!Number.isInteger(face)||face<1||face>6)fail('Hunt die must be 1–6.');
 if(!Array.isArray(order)||order.length!==6||new Set(order).size!==6||order.some(x=>!TERRITORIES.some(t=>t[0]===x)))
   fail('Hunt territory chart must contain each of the six territories exactly once.');
 if(order[0]!=='UA'||order[1]!=='LA'||order[2]!=='LE')fail('Territory die faces 1, 2 and 3 must be Upper Arkansas, Lower Arkansas and Llano Estacado (GMT Living Rules §2.2).');
 const inPlay=s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round');
 for(let step=0;step<6;step++){
   const targetFace=(face-1+step)%6,territory=order[targetFace];
   const candidates=inPlay.filter(p=>SPACE[p.location].territory===territory);
   if(candidates.length)return {face:face,checked:step+1,territory,selectedFace:targetFace+1,candidates:candidates.map(p=>({id:p.id,location:p.location,label:p.label})),none:false};
 }
 return {face,checked:6,territory:null,selectedFace:null,candidates:[],none:true};
}
/** Encroach §6.3.3 uses the same territory-die cycle as Hunt. */
export function encroachTargetPreview(s,die,order){
 const validated=huntTargetPreview(s,die,order);
 const available=s.pieces.filter(p=>p.type==='Tribe'&&p.location==='reserve');
 let eligible=null;
 for(let step=0;step<6;step++){
   const face=(Number(die)-1+step)%6,territory=order[face];
   const spaces=SPACES.filter(p=>p.type==='round'&&p.territory===territory&&
      !s.pieces.some(q=>q.location===p.id&&['Rancheria','Settlement','Tribe','Band'].includes(q.type)));
   if(spaces.length){eligible={territory,selectedFace:face+1,spaces:spaces.map(p=>p.id),checked:step+1};break;}
 }
 return {die:validated.face,availableTribes:available.map(p=>({id:p.id,label:p.label})),
   ...(eligible||{territory:null,selectedFace:null,spaces:[],checked:6}),
   huntInstead:available.length===0||!eligible};
}
/** Ally §6.3.1: attach the Instruction itself to one non-Allied Tribe.
 * Only recorded board entities are treated as definite; no card overrides inferred. */
export function allyTargetPreview(s,enemy){
 if(!ENEMY_COLUMNS.includes(enemy))fail('Unknown active Enemy for Ally.');
 const recovery=recoverTargetAudit(s,enemy);
 const tribes=s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round');
 const candidates=tribes.filter(p=>!s.pieces.some(q=>q.location===p.location&&(
   q.type==='War Column'||(['Instruction','Marker'].includes(q.type)&&q.subtype==='Ally'))));
 return {enemy, candidates:candidates.map(p=>({id:p.id,location:p.location,label:p.label})),
   encroachInstead:candidates.length===0,recoverFirst:recovery.candidates.length>0,
   unknownRavaged:recovery.ambiguousRavaged.length>0};
}
export function enemyCulturePreview(s,enemy){
 if(!ENEMY_COLUMNS.includes(enemy))fail('Unknown active Enemy.');
 const ravaged=recoverTargetAudit(s,enemy),owners=new Set([enemy]);
 if(s.colonial?.[enemy]&&s.colonial[enemy]!=='None')owners.add(s.colonial[enemy]);
 const settlements=s.pieces.filter(p=>p.type==='Settlement'&&SPACE[p.location]?.type==='round'&&owners.has(p.owner));
 const amount=1+settlements.length;
 return {enemy,settlements:settlements.map(p=>({id:p.id,location:p.location,owner:p.owner})),amount,
   recoverFirst:ravaged.candidates.length>0,unverifiedRavaged:ravaged.ambiguousRavaged.length,
   pointLoss:pointLossPreview(s,'culture',amount)};
}
export function enemyCardExceptionPreview(s){
 const f=s.enemyFlow;if(!f?.currentId)return null;
 const instruction=s.pieces.find(p=>p.id===f.currentId);
 const kind=instructionName(instruction),effects=activeCardEffects(s);
 const effect=effects.find(e=>e.blockedInstructions.includes(kind)&&(!e.enemies||e.enemies.includes(f.enemy)));
 return {kind,effect,apAlreadyPaid:f.kind==='free'||f.stage==='effect'};
}
/** §6.3.7 Recover: only show Ravaged markers whose ownership is known from
 * the recorded active Enemy square or an explicitly owned Enemy piece.
 * A History Card may require a roll; the user must verify its printed test.
 * Incomplete owner records are NOT interpreted as a safe Recover target. */
export function recoverTargetAudit(s,enemy){
 if(!ENEMY_COLUMNS.includes(enemy))fail('Choose a recorded Enemy for Recover.');
 const squares=enemy==='West'?['W']:enemy==='South'?['S']:enemy==='East'?['E1','E2']:['N'];
 const owners=new Set([enemy]);if(s.colonial?.[enemy]&&s.colonial[enemy]!=='None')owners.add(s.colonial[enemy]);
 const supported=new Set(squares);
 for(const p of s.pieces){
  if(['Settlement','War Column'].includes(p.type)&&owners.has(p.owner)&&SPACE[p.location])supported.add(p.location);
 }
 const candidates=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Ravaged'&&supported.has(p.location));
 const unknown=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Ravaged'&&!supported.has(p.location));
 return {enemy,candidates:candidates.map(p=>({id:p.id,label:p.label,location:p.location})),
   ambiguousRavaged:unknown.map(p=>p.id),requiresRandomSelection:new Set(candidates.map(p=>p.location)).size>1,
   caution:'Verify the current History Card roll requirement and any unrecorded active Enemy pieces.'};
}
/** Route assistant for Comanche Bands across PLAYER-CONFIRMED physical map lines.
 * An absent route means 'not yet entered', NEVER 'no legal route on the real board'.
 * Only one actual edge is moved at a time to preserve physical step-by-step effects.
 * §1.2 (dashed lines are usable by Bands); §5.2.2 (1 MP with Horse, else 2).
 */
export function mapCoverage(state){
 const connected=new Set(state.edges.flatMap(e=>[e.a,e.b]));
 return {spaces:SPACES.length,edges:state.edges.length,connected:connected.size,
   unlinked:SPACES.filter(p=>!connected.has(p.id)).map(p=>p.id)};
}
/**
 * Enumerates ONLY explicitly recorded, color-verified enemy corridors.
 * This is map-data assistance, NOT an automatic Settle/War/Colonial target,
 * and missing color metadata never grants an enemy an unverified route.
 * Distinguish colored Enemy Connections from solid/dashed geometry.
 */
export function enemyColorNetwork(state,enemy,start=null){
 if(!['West','South','East'].includes(enemy))fail('Choose West, South, or East for colored Enemy Connections.');
 const sources=enemy==='West'?['W']:enemy==='South'?['S']:['E1','E2'];
 const origins=start?[start]:sources;
 if(origins.some(x=>!SPACE[x]))fail('Unknown origin for Enemy Connection analysis.');
 const graph=new Map(SPACES.map(x=>[x.id,[]]));
 let eligibleLinks=0,unclassified=0;
 for(const e of state.edges){
  if(!SPACE[e.a]||!SPACE[e.b])continue;
  if(!Array.isArray(e.enemyFor)||!e.enemyFor.length){unclassified++;continue;}
  if(!e.enemyFor.includes(enemy))continue;
  eligibleLinks++;
  graph.get(e.a).push(e.b);graph.get(e.b).push(e.a);
 }
 const distances=new Map(origins.map(x=>[x,0]));const queue=[...origins];
 for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i]))if(!distances.has(next)){
  distances.set(next,distances.get(queue[i])+1);queue.push(next);
 }
 return {enemy,origins,eligibleLinks,unclassified,reachable:queue.filter(x=>!origins.includes(x)),
  distances:Object.fromEntries([...distances.entries()].sort(([a],[b])=>a.localeCompare(b))),
  coverageIncomplete:true};
}

/**
 * Conservative Settle adviser (Living Rules §6.3.8).
 * Only known COLORED connections are traversed. Absence of a shorter path on
 * the partial graph is NOT proof of the nearest legal physical-board space.
 * Reports blocked stacking, area-value tie-break, and unresolved East origin.
 * Never mutates game state or permits a placement by itself.
 */
export function settleTargetAudit(state,enemy,{eastOrigin=null}={}){
 if(!['West','South','East'].includes(enemy))fail('Settle adviser requires West, South or East.');
 if(eastOrigin!==null&&(enemy!=='East'||!['E1','E2'].includes(eastOrigin)))fail('East origin must be one of its two enemy squares.');
 const origins=enemy==='East'?(eastOrigin?[eastOrigin]:['E1','E2']):enemy==='West'?['W']:['S'];
 const network=enemyColorNetwork(state,enemy,origins.length===1?origins[0]:null);
 const targets=SPACES.filter(x=>x.type==='round'&&Object.hasOwn(network.distances,x.id))
  .map(space=>{
    const blockers=state.pieces.filter(p=>p.location===space.id&&['Rancheria','Band','Settlement','Tribe'].includes(p.type));
    const bison=state.pieces.filter(p=>p.location===space.id&&p.type==='Bison');
    return {space:space.id,name:space.name,distance:network.distances[space.id],area:space.area,
      blocked:blockers.length>0,blockers:blockers.map(p=>p.id),bisonToStock:bison.map(p=>p.id)};
  }).sort((a,b)=>a.distance-b.distance||a.area-b.area||a.space.localeCompare(b.space));
 const candidates=targets.filter(x=>!x.blocked);
 const nearest=candidates[0]||null;
 const tied=nearest?candidates.filter(x=>x.distance===nearest.distance&&x.area===nearest.area):[];
 const blocked=targets.filter(x=>x.blocked);
 const settlementsAvailable=state.pieces.filter(p=>p.type==='Settlement'&&p.location==='reserve'&&
   (p.owner===enemy||p.owner===state.colonial?.[enemy])).length;
 return {enemy,origins,originSelectionRequired:enemy==='East'&&!eastOrigin,
   knownLinks:network.eligibleLinks,unclassifiedLinks:network.unclassified,
   candidates,blocked,nearestKnown:nearest,tiedKnown:tied,
   settlementsAvailable,needsStockConfirmation:settlementsAvailable===0,
   verifiedLegalTarget:false,coverageIncomplete:true,
   warning:'Provisional ordering only: unrecorded colored links, card effects, supply and printed-board rules may change the legal destination.'};
}

/**
 * Non-mutating Subjugate preview (§6.3.9, Spring 2024 rules).
 * A *known nearest* Tribe is not proof of legal target while the color graph
 * is incomplete. NEVER automatically remove Tribes or Allies from this audit.
 * Defers physical History-card checks and East origin selection.
 */
export function subjugateTargetAudit(state,enemy,{eastOrigin=null}={}){
 if(!['West','South','East'].includes(enemy))fail('Subjugate adviser requires West, South or East.');
 if(eastOrigin!==null&&(enemy!=='East'||!['E1','E2'].includes(eastOrigin)))fail('East origin must be one of its two enemy squares.');
 const origins=enemy==='West'?['W']:enemy==='South'?['S']:eastOrigin?[eastOrigin]:['E1','E2'];
 const enemySquares=enemy==='West'?['W']:enemy==='South'?['S']:['E1','E2'];
 const ravaged=state.pieces.filter(p=>p.subtype==='Ravaged'&&enemySquares.includes(p.location));
 const network=enemyColorNetwork(state,enemy,origins.length===1?origins[0]:null);
 const targetList=state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round');
 const reachable=targetList.filter(p=>Number.isInteger(network.distances[p.location]))
  .map(p=>{
    const ally=state.pieces.filter(x=>x.location===p.location&&x.subtype==='Ally'&&['Instruction','Marker'].includes(x.type));
    return {tribeId:p.id,label:p.label||p.id,space:p.location,distance:network.distances[p.location],area:SPACE[p.location].area,
      allied:ally.length>0,allyIds:ally.map(x=>x.id)};
  }).sort((a,b)=>a.distance-b.distance||a.area-b.area||a.space.localeCompare(b.space)||a.tribeId.localeCompare(b.tribeId));
 const closest=reachable[0]||null;
 const tiedKnown=closest?reachable.filter(p=>p.distance===closest.distance&&p.area===closest.area):[];
 const settlements=settleTargetAudit(state,enemy,{eastOrigin});
 const enemyPeace=enemySquares.some(square=>state.pieces.some(p=>p.location===square&&p.subtype==='Peace'));
 const fallback=settlements.nearestKnown?'Settle':enemyPeace?'Culture Attack':'War';
 const next=ravaged.length?'Recover':targetList.length===0?'No Tribe: check fallback':
   reachable.length===0?'Unresolved: no documented colored route':'Review Tribe target';
 return {enemy,origins,originSelectionRequired:enemy==='East'&&!eastOrigin,
  recoverFirst:ravaged.length>0,ravagedIds:ravaged.map(p=>p.id),
  knownLinks:network.eligibleLinks,unclassifiedLinks:network.unclassified,
  recordedTribes:targetList.length,unreachableTribes:targetList.filter(p=>!Number.isInteger(network.distances[p.location])).map(p=>p.id),
  reachable,nearestKnown:closest,tiedKnown,enemyPeace,fallbackKnown:fallback,next,
  verifiedLegalTarget:false,coverageIncomplete:true,
  warning:'Provisional only: incomplete colored map or History-card effects may change the closest Tribe; any Ally removal requires returning its Ally Instruction to the display.'};
}

export function planBandRoute(state,bandId,target){
 const band=item(state,bandId);
 if(band.type!=='Band')fail('Route planner requires a Band.');
 if(!SPACE[band.location]||!SPACE[target])fail('Choose a Band on the board and a recognised map destination.');
 const costPerEdge=held(state,band.id,'Horse').length>0?1:2;
 const adj=new Map(SPACES.map(sp=>[sp.id,[]]));
 for(const edge of state.edges){
  if(!SPACE[edge.a]||!SPACE[edge.b]||!['solid','dashed'].includes(edge.kind))continue;
  adj.get(edge.a).push({to:edge.b,kind:edge.kind});
  adj.get(edge.b).push({to:edge.a,kind:edge.kind});
 }
 const parent=new Map([[band.location,null]]),via=new Map(),queue=[band.location];
 for(let i=0;i<queue.length;i++){
  const from=queue[i];if(from===target)break;
  for(const step of adj.get(from))if(!parent.has(step.to)){
   parent.set(step.to,from);via.set(step.to,step.kind);queue.push(step.to);
  }
 }
 if(!parent.has(target))return {from:band.location,to:target,found:false,path:[],lines:[],hops:null,
   cost:null,costPerEdge,available:state.tracks.movement,affordable:false,next:null,coverage:mapCoverage(state)};
 const path=[];for(let at=target;at!==null;at=parent.get(at))path.unshift(at);
 const lines=path.slice(1).map(at=>via.get(at)),cost=(path.length-1)*costPerEdge;
 return {from:band.location,to:target,found:true,path,lines,hops:path.length-1,cost,costPerEdge,
   available:state.tracks.movement,affordable:cost<=state.tracks.movement,
   next:path[1]||null,coverage:mapCoverage(state)};
}
/** Validate an entire portable player-transcribed map-connection file. */
export function validateMapConnections(edges){
 if(!Array.isArray(edges)||edges.length>200)fail('Map import must contain at most 200 connections.');
 const keys=new Set();
 return edges.map(e=>{
  if(!e||typeof e!=='object'||!SPACE[e.a]||!SPACE[e.b]||e.a===e.b||!['solid','dashed'].includes(e.kind))fail('Map file has an invalid line or unknown space.');
  const key=[e.a,e.b].sort().join('|');
  if(keys.has(key))fail('Map file includes a duplicate connection.');
  keys.add(key);
  return {a:e.a,b:e.b,kind:e.kind,verifiedByPlayer:true};
 });
}
export function getStackingProblems(state){
 const out=[];
 for(const space of SPACES){
   const p=state.pieces.filter(x=>x.location===space.id);
   let group = [];
   if(space.type==='round')group=p.filter(x=>['Rancheria','Settlement','Tribe','Band'].includes(x.type));
   else if(space.type==='canyon')group=p.filter(x=>['Rancheria','Band'].includes(x.type));
   else if(space.type==='enemy')group=p.filter(x=>x.type==='Band');
   if(group.length>1)out.push({space:space.id,message:`${space.name}: ${group.length} stacking-restricted pieces (${group.map(named).join(', ')}).`});
 }
 return out;
}
export function getProblems(state){
 const warnings=[];
 if(state.phase!=='setup'&&state.phase!=='gameover'&&state.tracks.military===0&&state.tracks.culture===0)warnings.push('Immediate defeat condition: both Military and Culture are zero (2.11.1).');
 if(state.activeBandId&&!state.pieces.some(p=>p.id===state.activeBandId&&p.type==='Band'))warnings.push('Active Band reference no longer exists.');
 if(state.pending)warnings.push(`Unresolved ${state.pending.type} action: finish it before proceeding.`);
 if(state.battlePending)warnings.push('Battle roll awaiting physical-board reconciliation (§7).');
 if(state.battleContinuation)warnings.push('This Battle requires another round (or a documented card exception) before phase advancement.');
 if(state.warMovement)warnings.push(`War Card movement in progress: ${state.warMovement.remaining} of ${state.warMovement.allowed} step(s) remain for ${state.warMovement.warId}.`);
 const battles=warBattleObligations(state).filter(b=>!b.exempt);
 if(battles.length)warnings.push(`${battles.length} recorded War Space(s) still contain an eligible defender: resolve §3.1 Battle or document the printed exception.`);
 if(state.successCheck)warnings.push(`Success Check in progress: ${state.successCheck.drawIds.length}/${state.successCheck.expected} counters drawn.`);
 const unresolved=state.pieces.filter(p=>p.location==='enemy-resolution');
 if(unresolved.length)warnings.push(`${unresolved.length} Enemy Instruction counter(s) require physical-board reconciliation.`);
 if(state.phase==='cleanup')warnings.push(...getStackingProblems(state).map(x=>x.message));
 return warnings;
}
export function requiredPassage(s){return s.mustPassage || !s.pieces.some(p=>p.type==='Band'&&isInPlay(p));}
export function checklist(s){return CHECKLIST[s.phase==='execution'?s.operation:s.phase] || [];}
export function allChecksDone(s){return checklist(s).every(([key])=>['done','na'].includes(s.steps[key]));}
export function safeNext(s){
 if(s.victoryPending)return {ok:false,message:'The History Card Victory Check is pending. Resolve it before advancing (§2.10).'};
 if(s.phase==='execution'&&s.operation==='Passage of Time'&&!s.passageResult)return {ok:false,message:'Finish Passage of Time step 15, including the Passage die/Victory Check decision (§4.4).'};
 if(s.countermeasureWindow)return {ok:false,message:'Resolve or decline the post-Finish War countermeasure before advancing.'};
 if(s.pending)return {ok:false,message:'Resolve the pending action first.'};
 if(s.enemyFlow)return {ok:false,message:'Finish the Enemy Instruction procedure before phase advancement (§6.2.2).'};
 if(s.battlePending||s.battleContinuation)return {ok:false,message:'Finish and reconcile all required Battle rounds before advancing (§7).'};
 if(s.warMovement)return {ok:false,message:'Finish the registered War Card movement before advancing (§3.1).'};
 if(warBattleObligations(s).some(b=>!b.exempt))return {ok:false,message:'The ledger shows a War Column and eligible defending unit. Resolve the Battle or record a documented card exception before leaving the War Column Phase.'};
 if(s.successCheck)return {ok:false,message:'Finish or cancel the Success Check before advancing.'};
 if(s.pieces.some(p=>p.location==='enemy-resolution'))return {ok:false,message:'Reconcile drawn Enemy Instruction counters with their physical board/display locations before advancing.'};
 if(s.phase==='setup' && Object.keys(s.setupChecklist||{}).some(k=>!s.setupConfirmed?.[k]))return {ok:false,message:'Complete the official opening setup confirmation before starting.'};
 if(s.phase==='setup' && s.pieces.some(p=>p.type==='Band'&&p.ratingConfirmed===false))return {ok:false,message:'Confirm each template Band’s printed movement rating in Pieces & stock first.'};
 if(s.phase==='war'&&s.steps.w3==='done'&&['W09','W10','W11'].includes(String(activeWarCard(s)?.identifier||'').toUpperCase())&&s.warEventResolved!==String(activeWarCard(s).identifier).toUpperCase())return {ok:false,message:'Resolve Surprise Attack (W09–W11), including any required Battle, before advancing.'};
 if(s.phase==='war'&&s.steps.w3==='done'&&['W12','W13'].includes(String(activeWarCard(s)?.identifier||'').toUpperCase())&&s.warEventResolved!==String(activeWarCard(s).identifier).toUpperCase())return {ok:false,message:'Resolve or decline the optional W12/W13 Travois event before advancing.'};
 if(s.phase==='war'&&s.steps.w3==='done'&&['W03','W04','W22'].includes(String(activeWarCard(s)?.identifier||'').toUpperCase())&&fastColumnEligible(s).length&&s.warEventResolved!==String(activeWarCard(s).identifier).toUpperCase())return {ok:false,message:'Resolve the Fast-moving Column extra movement draw before advancing.'};
 if(s.phase==='war' || s.phase==='execution'||s.phase==='cleanup'){
   if(!allChecksDone(s))return {ok:false,message:'Complete or mark N/A every procedure checkpoint first.'};
   if(s.phase==='cleanup'&&getStackingProblems(s).length)return {ok:false,message:'Resolve every stacking conflict before cleanup can finish.'};
 }
 if(s.phase==='execution'&&s.activeBandId)return {ok:false,message:'Finish the active Band before leaving the operation.'};
 if(s.phase==='execution'&&s.operation==='Culture'&&!s.operationEvents?.cultureGain)return {ok:false,message:'Record the Culture gain or a documented manual override before cleanup.'};
 if(s.phase==='execution'&&['Culture','Take Actions'].includes(s.operation)&&!s.operationEvents?.operationsRoll)return {ok:false,message:'Resolve the Operations-track check (or document a card override) before cleanup.'};
 if(s.developmentPending)return {ok:false,message:'Resolve the Development card effect before advancing.'};
 if(s.phase==='execution'&&s.operation==='Take Actions'&&activeRecurringDisease(s).length&&!s.epidemicTakeActionsApplied)return {ok:false,message:'Resolve the in-play Epidemic (#06) random map-space effect at the end of Take Actions.'};
 if(s.phase==='execution'&&s.operation==='Planning'&&['33','34','58'].some(n=>activeDevelopment(s,n).length)&&!s.developmentPlanningApplied)return {ok:false,message:'Resolve Comancheros trade goods at the end of Planning before cleanup.'};
 if(s.phase==='selection'&&!s.operation)return {ok:false,message:'Choose an operation first.'};
 if(s.phase==='selection'&&s.operation==='Passage of Time'&&!requiredPassage(s)&&s.tracks.operations===0)return {ok:false,message:'Voluntary Passage of Time is not legal while Operations is at Start (§3.2.E).'};
 if(s.phase==='cleanup'&&activeDevelopment(s,'60').some(c=>!(s.americanTradersDoneIds||[]).includes(c.id)))return {ok:false,message:'Resolve in-play American Traders during Cleanup step 1 before advancing.'};
 if(s.phase==='cleanup'&&activeDevelopment(s,'44').some(c=>!(s.louisianaDoneIds||[]).includes(c.id)))return {ok:false,message:'Resolve Louisiana Purchase during Cleanup step 1 before advancing.'};
 if(s.phase==='cleanup'&&['70','71'].flatMap(n=>activeDevelopment(s,n)).some(c=>!(s.buffaloDoneIds||[]).includes(c.id)))return {ok:false,message:'Resolve every in-play Buffalo Hunters card during Cleanup step 1 before advancing.'};
 if(s.phase==='cleanup'&&s.cards.some(c=>c.kind==='War'&&c.zone==='War Event'&&String(c.identifier).toUpperCase()==='W23')&&!s.warHigherStakesResolved)return {ok:false,message:'Resolve W23 Higher Stakes at the end of Cleanup before starting the next turn.'};
 return {ok:true};
}
function newId(){return globalThis.crypto?.randomUUID?.() || `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;}
function verifyId(){return `p${newId()}`;}
function createPiece(s,src){
 const p={id:verifyId(),type:src.type,subtype:String(src.subtype||''),label:String(src.label||src.type).slice(0,100),
   location:String(src.location||'reserve'),owner:String(src.owner||'Comanche'),strength:nint(src.strength??0,'Strength'),
   mpRating:nint(src.mpRating??4,'Printed movement points'),finished:Boolean(src.finished),notes:String(src.notes||'').slice(0,1000)};
 if(!PIECE_TYPES.includes(p.type))fail('Unknown piece type.');
 if(p.strength<0||p.strength>20)fail('Strength must be 0–20.');
 if(p.mpRating<0||p.mpRating>20)fail('MP rating must be 0–20.');
 validateLocation(s,p.location,p.id);
 if(p.location.startsWith('medicine:')&&p.subtype!=='Success')fail('Only Success counters belong on Mahimiana medicine tracks.');
 if(p.type==='Resource' && !RESOURCES.includes(p.subtype))fail('Choose a valid resource type.');
 if(p.type==='Band' && p.location.startsWith('held:'))fail('Bands cannot be held by Bands.');
 if(p.location==='removed' && p.type==='Band') p.finished=true;
 const limit=s.limits[`${p.type}:${p.subtype}`];
 if(Number.isInteger(limit) && s.pieces.filter(q=>q.type===p.type&&q.subtype===p.subtype&&q.location!=='removed').length>=limit)
   fail(`Physical supply limit of ${limit} reached for ${p.type} (${p.subtype||'plain'}).`);
 s.pieces.push(p);return p;
}
function movePiece(s,p,location,manual=false){
 validateLocation(s,location,p.id);
 if(location.startsWith('medicine:')&&p.subtype!=='Success')fail('Only Success counters belong on Mahimiana medicine tracks.');
 if(p.location==='removed')fail('This counter was removed from the GAME and cannot return to play. Use a separate replacement counter if appropriate.');
 if(s.successCheck?.drawIds.includes(p.id))fail('This counter is in an unresolved Success Check. Finish or cancel the check before moving it.');
 if(location==='removed'){
   const children=s.pieces.filter(q=>q.location===`held:${p.id}`||q.location===`box:${p.id}`||q.location===`medicine:${p.id}`);
   if(children.length)fail('First move or remove the counters contained by this piece.');
 }
 if(p.id===s.activeBandId&&location==='reserve')fail('Finish the active Band before returning it to stock.');
 const prev=p.location;p.location=location;return `${named(p)}: ${formatLocation(s,prev)} → ${formatLocation(s,location)}`;
}
export function formatLocation(s,loc){
 if(SPACE[loc])return SPACE[loc].name;
 if(/^enemy-display:(West|South|East|North):[A-F]$/.test(loc)){const [,enemy,letter]=loc.split(':');return `${enemy} Enemy Instruction column · ${letter}`;}
 if(/^enemy-inactive:[A-F]$/.test(loc))return `Inactive Enemy Instruction display · ${loc.at(-1)}`;
 if(loc?.startsWith('box:'))return `Resources box — ${s.pieces.find(x=>x.id===loc.slice(4))?.label||loc.slice(4)}`;
 if(loc?.startsWith('held:'))return `Possessed by ${s.pieces.find(x=>x.id===loc.slice(5))?.label||loc.slice(5)}`;
 if(loc?.startsWith('medicine:'))return `Success on ${s.pieces.find(x=>x.id===loc.slice(9))?.label||loc.slice(9)} medicine track`; 
 return ({reserve:'Out of play / stock',removed:'Removed from game',operations:'Operations track',cup:'Draw cup',hand:'Player hand',deck:'Deck','enemy-display':'Enemy instruction display','check-draw':'Current Success Check draw','success-out':'Success Out of Play','available-enemy-aps':'Available Enemy APs box','enemy-resolution':'Instruction awaiting physical reconciliation'})[loc]||loc;
}
function logIt(s,description,quality,command){
 s.revision+=1;s.quality[quality==='verified'?'verified':'manual']++;
 s.log.unshift({seq:s.revision,description,quality,command,date:new Date().toISOString()});
 if(s.log.length>500)s.log.length=500;
}
/** Each draw samples a still-undrawn War Card with the persisted seeded RNG.
 * A card must be identified in the supplied source sheet before the computer
 * may use its printed instructions; W25 never supplies movement. */
function drawWarLedgerCard(s){
 const cards=s.cards.filter(c=>c.kind==='War'&&c.zone==='Deck');
 if(!cards.length)fail('War deck exhausted. No automatic reshuffle rule has been verified for this situation; reconcile the actual deck before proceeding.');
 const ids=new Set();
 for(const c of cards){
   const found=/^setup-war-(\d+)$/.exec(c.id);
   const identity=found?`W${found[1].padStart(2,'0')}`:String(c.identifier||'').trim().toUpperCase();
   if(!warCard(identity)||ids.has(identity))fail('War deck contains missing or duplicate source identities; reconcile cards before automatic drawing.');
   ids.add(identity);
 }
 const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
 const picked=cards[(roll.seed>>>0)%cards.length];
 const matched=/^setup-war-(\d+)$/.exec(picked.id);
 const id=matched?`W${matched[1].padStart(2,'0')}`:picked.identifier.toUpperCase();
 const source=warCard(id);
 picked.identifier=id;picked.title=`War event: ${source.event}`;
 picked.evidenceStatus='checked-against-print';picked.sourceReference=source.source;
 return {card:picked,source};
}
/** W25 instructs reshuffling the remaining War deck and drawing again.
 * Since draws sample uniformly from the current deck, its order is already
 * random; W25 is removed from this draw and cannot loop onto itself. */
function drawWarWithReshuffle(s,destination){
 const seen=[];
 for(let attempts=0;attempts<26;attempts++){
   const {card,source}=drawWarLedgerCard(s);
   if(source.id==='W25'){
     card.zone='Discard';seen.push('W25');
     if(!s.cards.some(c=>c.kind==='War'&&c.zone==='Deck'))fail('W25 requires a replacement card, but none remain in the deck. Reconcile the printed deck before proceeding.');
     continue;
   }
   card.zone=destination;
   return {id:source.id,source,card,reshuffles:seen.length};
 }
 fail('Unable to draw a non-reshuffle War Card.');
}
export function perform(original,command){
 const s=clone(original);const {type}=command;let message='';let quality='verified';
 if(s.developmentPending&&!['DEVELOPMENT_CONFIRM_EFFECT','DEVELOPMENT_RESOLVE_EPIDEMIC','DEVELOPMENT_RESOLVE_SMALLPOX','DEVELOPMENT_RESOLVE_HORSE_DISCARD','DEVELOPMENT_BUFFALO_RESOLVE','DEVELOPMENT_NUEVO_APACHERIA','DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT','DEVELOPMENT_RESOLVE_MEDICINE','DEVELOPMENT_RESOLVE_KIOWA','NOTE'].includes(type))fail('Resolve the newly revealed Development card before continuing.');
 if(s.countermeasureWindow&&!['WAR_FINISH_COUNTERMEASURE','NOTE'].includes(type))fail('Resolve or decline the post-Finish War countermeasure before continuing.');
 if(s.pending && !['RESOLVE_RAID','CANCEL_RAID','NOTE','START_SUCCESS_CHECK','RECORD_SUCCESS_DRAW','DIGITAL_CUP_DRAW','FINISH_SUCCESS_CHECK','CANCEL_SUCCESS_CHECK','GUNS_CANCEL_AP','TRADE_GOODS_REDRAW','DEVELOPMENT_PLAY_SKILLFUL','DEVELOPMENT_TACTICAL'].includes(type))fail('Finish or cancel the unresolved Raid before doing anything else.');
 if(s.battlePending && !['EDIT_PIECE','MOVE_PIECE','NOTE','BATTLE_RECONCILE','BATTLE_AUTO_RECONCILE'].includes(type))fail('Reconcile the recorded Battle result in the counter ledger first, or Undo the roll.');
 if(s.battleContinuation && !s.battlePending && !['BATTLE_ROLL','BATTLE_CLOSE_OVERRIDE','NOTE','EDIT_PIECE','MOVE_PIECE'].includes(type))fail('A Battle requires another round. Finish it before other actions, or enter a documented card exception.');
 if(s.successCheck && !['RECORD_SUCCESS_DRAW','DIGITAL_CUP_DRAW','FINISH_SUCCESS_CHECK','CANCEL_SUCCESS_CHECK','GUNS_CANCEL_AP','TRADE_GOODS_REDRAW','DEVELOPMENT_TACTICAL','NOTE'].includes(type))fail('Complete or cancel the Success Check before continuing.');
 if(s.warMovement && !['WAR_MOVE_STEP','WAR_MOVE_FINISH','WAR_MOVE_CANCEL','NOTE'].includes(type))fail('Complete the registered War Card movement or Undo before other actions.');
 if(s.enemyFlow && !['ENEMY_SELECT','ENEMY_PAY','ENEMY_CONFIRM','ENEMY_FINISH','NOTE',...(s.enemyFlow.stage==='effect'?['EDIT_PIECE','MOVE_PIECE','ADD_PIECE','DELETE_PIECE','LOSE_POINTS','ENEMY_RECOVER','ENEMY_SUBJUGATE','ENEMY_SETTLE','ENEMY_CULTURE_ATTACK','ENEMY_AUTO_CULTURE_ATTACK','ENEMY_HUNT','ENEMY_ENCROACH','ENEMY_ALLY','ENEMY_PEACE','ENEMY_CARD_NO_EFFECT','DEVELOPMENT_PLAY_NO_RELIEF']:[])].includes(type))fail('Finish this Enemy Instruction procedure before other actions.');
 // A pending Victory Check blocks everything except the final decision and notes.
 if(s.victoryPending&&!['RESOLVE_VICTORY','NOTE'].includes(type))fail('Resolve the required History Card Victory Check before other actions.');
 switch(type){
 case 'START':{
   if(s.phase!=='setup')fail('Game has already been started.');
   if(!safeNext(s).ok)fail(safeNext(s).message);
   if(s.tracks.military===0 && s.tracks.culture===0)fail('Starting with 0 Military and 0 Culture would be immediate defeat. Enter the physical setup tracks first.');
   s.phase='war';s.battleExemptions={};s.steps={};message='Started tracking game. Confirm physical scenario setup matches.';quality='manual';break;}
 case 'APPLY_OPENING_TEMPLATE':{
   installOpeningTemplate(s);message=`Installed verified ${SCENARIOS.find(x=>x[0]===s.scenario)[1]} opening ledger (source §9.1–9.4). Confirm all 7 physical setup tasks before starting.`;quality='manual';break;}
 case 'CONFIRM_SETUP':{
   if(s.phase!=='setup'||!s.setupChecklist||!(command.key in s.setupChecklist))fail('Unknown opening setup checkpoint.');
   s.setupConfirmed[command.key]=Boolean(command.value);
   message=`Opening setup ${command.key}: ${s.setupConfirmed[command.key]?'confirmed':'not yet confirmed'}.`;quality='manual';break;}
 case 'MANUAL_OPERATION_OVERRIDE':{
   const key=String(command.key);
   if(s.phase!=='execution'||(key==='cultureGain'?s.operation!=='Culture':key==='operationsRoll'?!['Culture','Take Actions'].includes(s.operation):true))fail('This manual override is not applicable to the current operation.');
   if(s.operationEvents[key])fail('This part of the operation has already been recorded.');
   const reason=String(command.reason||'').trim();
   if(reason.length<8)fail('Explain the card/rule exception in at least 8 characters.');
   s.operationEvents[key]=true;
   message=`Manual exception for ${key}: ${reason.slice(0,250)}. Physical rules/cards must justify this deviation.`;
   quality='manual';break;}
 case 'LOSE_POINTS':{
   if(s.phase==='setup'||s.phase==='gameover')fail('Point losses are available only while a game is in progress.');
   const why=String(command.reason||'').trim();if(why.length<4)fail('Give a brief source for the point loss (enemy instruction or rule).');
   const preview=pointLossPreview(s,command.field,command.amount);
   s.tracks=preview.tracks;
   message=`${preview.track} −${preview.direct}; ${preview.other} −${preview.otherLoss} (${preview.substituted} substitution points requested). Source: ${why.slice(0,200)}. Rule 2.11${preview.unfulfilled?'; remaining shortfall results in defeat if both tracks reach zero':''}.`;
   quality='manual';break;}
 case 'CULTURE_GAIN':{
   if(s.phase!=='execution'||s.operation!=='Culture')fail('Culture gains can only be recorded during a Culture Operation.');
   if(s.operationEvents?.cultureGain)fail('Culture gain has already been applied this operation. Undo the previous entry to correct it.');
   if(!command.ack)fail('Confirm Comanche-controlled territory choices and applicable card effects before applying Culture gain.');
   const preview=cultureGainPreview(s,command.controlled??null);
   if(preview.mismatches.length && String(command.reason||'').trim().length<8)fail('Recorded board control conflicts or needs review; supply a physical-card/board override explanation (at least 8 characters).');
   const old=s.tracks.culture;
   s.tracks.culture=Math.min(9,old+preview.gain);
   s.operationEvents.cultureGain=true;
   message=`Culture Operation (§4.2): ${preview.ranchTerritories.length} Ranchería territories + ${preview.declaredControlled.length} declared Comanche-controlled = ${preview.gain} gross Culture; recorded +${s.tracks.culture-old} (9-point cap). Territory control and card effects confirmed manually${command.reason?`; review: ${String(command.reason).slice(0,200)}`:''}.`;
   quality='manual';break;}
 case 'OPERATIONS_ROLL':{
   if(s.phase!=='execution'||!['Take Actions','Culture'].includes(s.operation))fail('Operations check is only supported after Take Actions or Culture.');
   if(s.operationEvents?.operationsRoll)fail('Operations check already recorded this operation. Undo it to correct.');
   if(!command.ack)fail('Confirm there are no card overrides to the Operations-track procedure.');
   const position=s.tracks.operations;
   if(position===0){s.tracks.operations=1;message='Operations track advanced from Start to 1; no die roll at Start (4.1 step 5 / 4.2 step 2).';}
   else{
     const die=bounded(command.die,1,6,'Operations die');
     if(die<=position){s.mustPassage=true;message=`Operations roll ${die} ≤ track position ${position}: Must do Passage of Time (4.1 / 4.2).`;}
     else{s.tracks.operations=position+1;message=`Operations roll ${die} > ${position}: advanced Operations track to ${s.tracks.operations} (4.1 / 4.2).`;}
   }
   s.operationEvents.operationsRoll=true;quality='manual';break;}
 case 'BATTLE_NO_COMBAT_OVERRIDE':{
   if(s.phase!=='war'||s.battlePending||s.battleContinuation)fail('This exception is available only before Battle in the War Column Phase.');
   const warId=String(command.warId||'');
   if(!warBattleObligations(s).some(x=>x.warId===warId))fail('No eligible defender recorded with that War Column.');
   const reason=String(command.reason||'').trim();
   if(!command.ack||reason.length<15)fail('Confirm the physical board and enter a specific card/rule exception (15 characters minimum).');
   s.battleExemptions??={};s.battleExemptions[warId]=reason.slice(0,300);
   message=`War Space Battle exception for ${named(item(s,warId))}: ${reason.slice(0,300)}. Manually checked; printed rule/card is authoritative.`;
   quality='manual';break;
 }
 case 'BATTLE_ROLL':{
   if(s.phase!=='war')fail('Guided Battles are available during the War Column Phase; card-triggered battles remain manual.');
   if(s.pending||s.successCheck||s.battlePending)fail('Finish the outstanding procedure first.');
   const r=battleRollPreview(s,command);
   if(s.battleContinuation && (s.battleContinuation.warId!==r.warId||s.battleContinuation.warLocation!==r.warLocation))fail('Finish the ongoing Battle against the same War Column first.');
   if(r.gunId)item(s,r.gunId).location='reserve';
   s.battlePending=r;
   s.battleContinuation={warId:r.warId,warLocation:r.warLocation};
   message=`Battle roll (§7.1): ${r.dice.join('/')} → ${r.natural} +${r.base}${r.mahimianaId?'+1 Mahimiana':''}${r.finished?'-1 Finished':''}-${r.warDrm} War DRM${r.cardDrm?` ${r.cardDrm>0?'+':''}${r.cardDrm} card`:''}${r.cultureDrm?'+1 Horsemanship':''} = ${r.modified}. ${r.won?'COMANCHE':'ENEMY'} wins. Reconcile printed counter consequences before proceeding.`;
   quality='manual';break;
 }
 case 'BATTLE_AUTO_RECONCILE':{
   const r=s.battlePending;if(!r)fail('Roll a Battle round before automating its consequences.');
   if(r.cardDrm!==0)fail('Card-dependent Battle outcomes require manual verification.');
   const war=item(s,r.warId),unit=item(s,r.unitId);
   if(war.location!==r.warLocation||war.strength!==r.warStrength||unit.strength!==r.unitStrength)fail('Battle counters changed since the roll: reconcile manually.');
   let effect='';let ended=false;
   if(r.won){
     if(r.warStrength===1){
       if(r.mahimianaId)fail('A participating Mahimiana gains medicine when the War Ends; use the guided reconciliation until this is implemented.');
       const plan=resolveWarEnds(s,war.id);effect=`War Ends; ${plan.instructionId} returned to ${plan.destination}`;ended=true;
     }else{war.strength-=1;effect=`War Column reduced to ${war.strength}`;}
   }else if(r.unitType==='Band'&&r.unitStrength>1){
     unit.strength-=1;effect=`Band reduced to strength ${unit.strength}`;
   }else fail('This Battle outcome involves Allied Tribe, 0-strength Band, Ranchería destruction, or other consequences needing guided resolution.');
   s.battlePending=null;
   if(ended)s.battleContinuation=null;
   s.battleRounds??=[];
   s.battleRounds.unshift({warId:r.warId,unitId:r.unitId,dice:r.dice,natural:r.natural,modified:r.modified,won:r.won,expected:r.expected,note:`Automatic uncomplicated Battle resolution: ${effect}`,date:new Date().toISOString()});
   if(s.battleRounds.length>100)s.battleRounds.length=100;
   message=`Battle round resolved under §7: ${effect}. ${ended?'Battle ends.':'Further rounds may be required.'}`;
   quality='verified';break;
 }
 case 'BATTLE_RECONCILE':{
   const r=s.battlePending;if(!r)fail('No Battle result awaits reconciliation.');
   if(!command.ack||String(command.note||'').trim().length<12)fail('Confirm the physical Board and document all changed counters in at least 12 characters.');
   const war=item(s,r.warId),unit=item(s,r.unitId);
   if(r.won){
     if(r.warStrength>1){if(war.location!==r.warLocation||war.strength!==r.warStrength-1)fail(`Reduce the War Column to strength ${r.warStrength-1} using Pieces & stock before confirming.`);}
     else if(war.location!=='reserve')fail('War Ends: move the War Column to Out of Play / stock in Pieces & stock and resolve its paired Instruction on the physical display.');
   }else if(r.unitType==='Band'){
     if(r.unitStrength>1){if(unit.strength!==r.unitStrength-1)fail(`Reduce the Band to strength ${r.unitStrength-1} using Pieces & stock before confirming.`);}
     else if(unit.location!=='reserve'||s.pieces.some(p=>p.location===`held:${unit.id}`))fail('Band strength 0: return the Band and all possessed counters to their appropriate stock/death destinations before confirming.');
   }else if(s.pieces.some(p=>p.location===r.warLocation&&(p.type==='Instruction'||p.type==='Marker')&&p.subtype==='Ally'))fail('Move the defeated Ally counter off the Tribe space and back to its display before confirming.');
   // Losing the last Band of a Ranchería destroys it, ends its War Column,
   // and incurs §2.5.3 Military losses. A remaining Band continues combat.
   let lastRancheriaBand=false;
   if(!r.won && r.unitType==='Band' && r.unitStrength===1 && r.rancheriaId){
     const survivors=s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${r.rancheriaId}`&&p.strength>0);
     if(!survivors.length){
       lastRancheriaBand=true;
       const rancheria=item(s,r.rancheriaId);
       if(rancheria.location!==`box:${r.rancheriaId}`)fail('Last Band lost: destroy the Ranchería and move its hex counter into its own Resources box (§2.5.3).');
       if(war.location!=='reserve')fail('Last Ranchería Band lost: War Ends. Return the War Column to stock before confirming.');
       if(s.pieces.some(p=>p.location===`box:${r.rancheriaId}`&&p.type!=='Rancheria'))fail('Empty destroyed Ranchería Resources box, including its Resource and Success counters.');
       if(!command.lossConfirmed)fail('Confirm you applied the Ranchería Destruction Military loss (§2.5.3) and the War Column Phase loss (§3.1), including 2:1 substitutions if required.');
     }
   }
   const note=String(command.note).trim().slice(0,300);
   const definiteEnd=(r.won&&r.warStrength===1) || (!r.won&&r.unitType==='Tribe') || (!r.won&&r.unitType==='Band'&&r.unitStrength===1&&!r.rancheriaId) || lastRancheriaBand;
   if(definiteEnd)s.battleContinuation=null;
   s.battleRounds??=[];
   s.battleRounds.unshift({warId:r.warId,unitId:r.unitId,dice:r.dice,natural:r.natural,modified:r.modified,won:r.won,expected:r.expected,note,date:new Date().toISOString()});
   if(s.battleRounds.length>100)s.battleRounds.length=100;
   s.battlePending=null;
   message=`Battle physical-board reconciliation confirmed: ${r.won?'Comanche':'Enemy'} won (${r.modified}); ${r.expected} Notes: ${note}. ${definiteEnd?'Battle ended.':'Another Battle round may be required; continuation gate remains.'}`;
   quality='manual';break;
 }
 case 'BATTLE_CLOSE_OVERRIDE':{
   if(!s.battleContinuation||s.battlePending)fail('No ongoing, reconciled Battle to close.');
   const note=String(command.reason||'').trim();
   if(!command.ack||note.length<15)fail('Only close a continuing Battle after a printed rule or card exception; document it (15 characters minimum).');
   s.battleExemptions??={};s.battleExemptions[s.battleContinuation.warId]=note.slice(0,300);
   s.battleContinuation=null;
   message=`Manual Battle continuation exception: ${note.slice(0,300)}. Printed card/rules take precedence; this app did not verify the exception.`;quality='manual';break;
 }
 case 'DIGITAL_CARD_DRAW':{
   if(s.phase==='gameover')fail('No card draws after game over.');
   const kind=String(command.kind||'');
   if(!['Development','War','Culture','History'].includes(kind))fail('Select a valid deck.');
   const destination=String(command.zone||'Display');
   if(kind==='War'&&destination==='War Event'){
     if(s.phase!=='war')fail('War Events can only be drawn during the War Column Phase (§3.1 step 3).');
     if(!s.pieces.some(p=>p.type==='War Column'&&p.strength>0&&SPACE[p.location]))fail('No War Columns: §3.1 terminates without an event draw.');
     if(s.cards.some(c=>c.kind==='War'&&c.zone==='War Event'))fail('Resolve and discard the existing War Event before drawing another.');
   }
   const permitted={Development:['Display','Hand'],War:['War Event','Hand'],Culture:['Hand','Display'],History:['In play','Hand']};
   if(!permitted[kind].includes(destination))fail('Destination not valid for this deck.');
   const available=s.cards.filter(c=>c.kind===kind&&c.zone==='Deck');
   if(!available.length)fail(`No ${kind} cards in the digital deck. Configure an official setup first.`);
   const n=rollSeededDie(s.rng.seed);s.rng.seed=n.seed;s.rng.rolls++;
   // A seeded, reproducible random draw from the whole deck. This is a ledger-level draw,
   // not a reproduction or interpretation of any copyrighted card effect.
   const index=(n.seed>>>0)%available.length,card=available[index];
   card.zone=destination;
   let extra='';
   if(kind==='Development'&&destination==='Display'){card.zone='In play';extra=' '+revealDevelopmentEffect(s,card);}
   if(kind==='War'){
     const found=/^setup-war-(\d+)$/.exec(card.id);
     const source=found?warCard(`W${found[1].padStart(2,'0')}`):warCard(card.identifier);
     if(source){card.identifier=source.id;card.title=`War event: ${source.event}`;
       card.evidenceStatus='checked-against-print';card.sourceReference=source.source;
       s.warEventResolved=null;s.warHigherStakesResolved=false;
       if(destination==='War Event'){
         const result=applyVerifiedWarEvent(s,source.id);
         extra=result.applied?` Verified ${source.event} event executed (${result.preview.targets.length} War Column targets).`:` ${source.event} requires a choice, timing, or additional card: not automatically applied.`;
       }
     }
   }
   message=`Digital ${kind} draw: ${card.identifier||card.title||card.id} → ${destination}.${extra||' Resolve any unimplemented printed effects.'}`;
   quality=extra&&extra.includes('executed')?'verified':'manual';break;
 }
 case 'WAR_HIGHER_STAKES_CLEANUP':{
   if(s.phase!=='cleanup')fail('Higher Stakes resolves at the end of the Operation Cleanup Phase.');
   if(!s.cards.some(c=>c.kind==='War'&&c.zone==='War Event'&&String(c.identifier).toUpperCase()==='W23'))fail('W23 must be face-up in the War Event box.');
   if(s.warHigherStakesResolved)fail('Higher Stakes has already resolved for this War Event.');
   const columns=s.pieces.filter(p=>p.type==='War Column'&&p.strength>0&&SPACE[p.location]);
   if(columns.length){const loss=pointLossPreview(s,'military',1);s.tracks.military=loss.tracks.military;s.tracks.culture=loss.tracks.culture;
     message=`W23 Higher Stakes at Cleanup: ${columns.length} War Column(s) remain; lose 1 Military, with point substitution if needed.`;
   }else{s.tracks.military=Math.min(9,s.tracks.military+1);
     message='W23 Higher Stakes at Cleanup: no War Columns remain; gain 1 Military (maximum 9).';}
   s.warHigherStakesResolved=true;quality='verified';break;
 }
 case 'WAR_FAST_COLUMN':{
   if(s.phase!=='war'||s.steps.w3!=='done')fail('Fast-moving Column resolves immediately after the War Event draw.');
   const id=String(activeWarCard(s)?.identifier||'').toUpperCase();
   if(!['W03','W04','W22'].includes(id))fail('The face-up event is not Fast-moving Column.');
   if(s.warEventResolved===id)fail('Fast-moving Column has already been resolved.');
   const eligible=fastColumnEligible(s);
   if(!eligible.length){s.warEventResolved=id;message=`${id}: no eligible War Columns; no extra War Card drawn.`;break;}
   const drawn=drawWarWithReshuffle(s,'Discard');
   const preview=autoWarMovementPreview(s,drawn.id,eligible);
   // Apply only currently eligible columns; do not initiate battles or an attrition roll here.
   const moves=preview.outcomes.filter(x=>eligible.includes(x.warId));
   for(const outcome of moves)if(outcome.strengthLoss&&item(s,outcome.warId).strength===1)warEndsPreview(s,outcome.warId);
   for(const outcome of moves){
     const w=item(s,outcome.warId);w.location=outcome.route.at(-1);
     if(outcome.strengthLoss){if(w.strength===1)resolveWarEnds(s,w.id);else w.strength-=outcome.strengthLoss;}
   }
   s.warEventResolved=id;
   message=`${id} Fast-moving Column: drew ${drawn.id} for movement only${drawn.reshuffles?' (W25 replacement draw)':''}; ${moves.length} eligible column(s) processed. No secondary attrition or War Event.`;
   break;
 }
 case 'WAR_SURPRISE_ATTACK':{
   if(s.phase!=='war'||s.steps.w3!=='done')fail('Surprise Attack resolves during the War phase after step 3.');
   const id=String(activeWarCard(s)?.identifier||'').toUpperCase();
   if(!['W09','W10','W11'].includes(id))fail('The face-up War Event must be Surprise Attack (W09–W11).');
   if(s.warEventResolved===id)fail('Surprise Attack already resolved.');
   const preview=surpriseAttackPreview(s),eligible=preview.candidates;
   if(!eligible.length){s.warEventResolved=id;message=`${id} Surprise Attack: no qualifying War Column within two non-dashed connections; no effect.`;break;}
   // One die gives an equal chance to 2, 3, 4, 5, or 6 eligible counters,
   // rerolling faces outside the allocated range as required by §2.2.
   if(eligible.length>6)fail('More than six equally eligible War Columns; random selection needs a documented multi-die procedure.');
   let index=0;
   if(eligible.length>1){let face,roll;
    do{roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;face=roll.face;}while(face>Math.floor(6/eligible.length)*eligible.length);
    index=(face-1)%eligible.length;
   }
   const picked=eligible[index];
   const ranked=[...picked.destinations].sort((a,b)=>a.priority-b.priority||a.route.length-b.route.length||a.location.localeCompare(b.location));
   const best=ranked[0],tied=ranked.filter(d=>d.priority===best.priority&&d.route.length===best.route.length);
   if(new Set(tied.map(d=>d.location)).size>1)fail('Two equally prioritized nearest defender spaces: resolve printed target tie before moving. No game state changed.');
   // A War Column includes its stacked War/Raid Instruction; never separate them.
   const column=item(s,picked.warId);
   const partners=s.pieces.filter(p=>p.type==='Instruction'&&p.owner===column.owner&&p.location===column.location&&['War','Raid'].includes(p.subtype));
   if(partners.length!==1)fail('Surprise Attack needs exactly one stacked War/Raid Instruction paired with the moving War Column.');
   const from=column.location,to=best.location;
   column.location=to;partners[0].location=to;
   s.warEventResolved=id;
   message=`${id} Surprise Attack: ${picked.warId} moved ${from} → ${to} (${best.route.length-1} non-dashed connection(s)) toward ${best.id}. Resolve any required Battle before advancing.`;
   break;
 }
 case 'WAR_TRAVOIS':{
   if(s.phase!=='war'||s.steps.w3!=='done')fail('Travois is an immediate War Event, after step 3 draws the card.');
   const card=activeWarCard(s),id=String(card?.identifier||'').toUpperCase();
   if(!['W12','W13'].includes(id))fail('The face-up War Event is not Travois (W12/W13).');
   if(s.warEventResolved===id)fail('Travois has already been resolved or declined.');
   if(command.decline){s.warEventResolved=id;message=`Declined optional ${id} Travois move; no AP spent.`;break;}
   if(s.tracks.ap<2)fail('Travois requires 2 player AP.');
   const choice=travoisOptions(s).find(o=>o.rancheriaId===command.rancheriaId&&o.to===command.to);
   if(!choice)fail('Travois destination must be adjacent, evidenced, and free of unresolved stacking/arrival effects.');
   const r=item(s,choice.rancheriaId);r.location=choice.to;
   if(getStackingProblems(s).some(p=>p.space===choice.to))fail('Travois would violate stacking.');
   s.tracks.ap-=2;s.warEventResolved=id;
   message=`${id} Travois: spent 2 AP; moved ${named(r)} ${choice.from} → ${choice.to}.`;break;
 }
 case 'WAR_FINISH_COUNTERMEASURE':{
   const win=s.countermeasureWindow;
   if(!win)fail('No War countermeasure choice is pending after marking a Band Finished.');
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('This countermeasure belongs to Take Actions.');
   const id=String(activeWarCard(s)?.identifier||'').toUpperCase();
   if(id!==win.cardId)fail('The face-up War Card changed; cannot apply a stale countermeasure.');
   if(command.decline){s.countermeasureWindow=null;message=`Declined optional ${id} countermeasure for ${win.bandId}.`;break;}
   const options=warCountermeasureOptions(s,win.bandId);
   const selected=options.find(o=>o.warId===command.warId&&(!o.rancheriaId||o.rancheriaId===command.rancheriaId));
   if(!selected)fail('Countermeasure choice is not legal for this Finished Band, card, and target.');
   const war=item(s,selected.warId),band=item(s,win.bandId);
   if(selected.kind==='draw-them-off'){
     const partners=s.pieces.filter(p=>p.type==='Instruction'&&p.owner===war.owner&&p.location===war.location&&['War','Raid'].includes(p.subtype));
     if(partners.length!==1)fail('Draw Them Off requires exactly one paired War/Raid Instruction.');
     const ranch=item(s,selected.rancheriaId);
     const prev=war.location;war.location=band.location;partners[0].location=band.location;
     band.location=`box:${ranch.id}`;
     // Possessions remain associated with their Band; this is not a free transfer.
     message=`${id} Draw Them Off: moved War Column ${war.id} ${prev} → ${war.location}, then Finished ${band.id} to ${ranch.id} Resources box.`;
   }else if(selected.kind==='surrender-captives'){
     const captive=held(s,band.id,'Captives');
     const plan=warEndsPreview(s,war.id);
     for(const p of captive)p.location='reserve';
     resolveWarEnds(s,war.id);
     message=`${id} Surrender Captives: spent ${captive.length} Captives from ${band.id}; War Ends for ${war.id}, Instruction to ${plan.destination}.`;
   }else if(selected.kind==='successful-ambush'){
     if(s.tracks.ap<2)fail('Successful Ambush costs two AP.');
     const plan=warEndsPreview(s,war.id);
     s.tracks.ap-=2;resolveWarEnds(s,war.id);
     message=`${id} Successful Ambush: spent 2 AP; War Ends for ${war.id}, Instruction to ${plan.destination}.`;
   }else fail('Unsupported printed War countermeasure.');
   s.countermeasureWindow=null;break;
 }
 case 'WAR_STEAL_MOUNTS':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Steal Their Mounts is an Action during Take Actions.');
   const card=activeWarCard(s),id=String(card?.identifier||'').toUpperCase();
   if(!['W05','W06'].includes(id))fail('Steal Their Mounts requires the face-up W05/W06 War Event.');
   const b=item(s,s.activeBandId||''),w=item(s,command.warId);
   if(b.type!=='Band'||!SPACE[b.location])fail('Activate a Band in a War Space first.');
   if(w.type!=='War Column'||w.location!==b.location||w.strength<1)fail('Choose an active War Column in the Band’s War Space.');
   if(s.pieces.filter(p=>p.type==='Band'&&p.location===b.location).length!==1)fail('The War Space must contain exactly one Band.');
   const spend=bounded(command.mp,1,3,'Steal Their Mounts movement cost');
   if(s.tracks.movement<spend)fail('Not enough movement points.');
   if(w.strength<=spend)warEndsPreview(s,w.id); // preflight instruction pairing
   s.tracks.movement-=spend;
   if(w.strength<=spend)resolveWarEnds(s,w.id);else w.strength-=spend;
   message=`${id} Steal Their Mounts: ${named(b)} spent ${spend} MP, reducing ${named(w)} by ${spend}${w.location==='reserve'?' (War Ends)':''}.`;break;
 }
 case 'WAR_EVENT_RESOLVE':{
   if(s.phase!=='war')fail('Resolve a War Event during the War Column Phase.');
   const id=String(command.card||'').trim().toUpperCase();
   const result=applyVerifiedWarEvent(s,id);
   if(!result.applied)fail(`${id} requires a player choice or later timing and cannot be automatically resolved.`);
   message=`Applied ${id} (${result.preview.event}): ${result.preview.targets.length} War Column(s) changed.`;
   quality='verified';break;
 }
 case 'DIGITAL_CUP_DRAW':{
   const check=s.successCheck;
   if(!check)fail('Begin a Success Check before drawing from the cup.');
   const remaining=check.expected-check.drawIds.length;
   if(remaining<=0)fail('All required counters have already been drawn.');
   const count=command.all?remaining:1;
   const eligible=()=>s.pieces.filter(p=>p.location==='cup'&&(p.type==='Instruction'||p.type==='Marker'&&/^(Success|Enemy AP [234])$/.test(p.subtype)));
   if(eligible().length<count)fail(`Not enough counters in the digital cup (${eligible().length} available, ${count} needed).`);
   const drawn=[];
   for(let i=0;i<count;i++){
     const list=eligible();const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     const counter=list[s.rng.seed%list.length];counter.location='check-draw';check.drawIds.push(counter.id);drawn.push(counter.subtype||counter.label);
   }
   message=`Digital cup draw ${check.drawIds.length}/${check.expected}: ${drawn.join(', ')}. Drawn counters are removed from the cup until resolved.`;
   quality='verified';break;
 }
 case 'SEED_RNG':{
   s.rng={algorithm:'xorshift32',seed:normalSeed(command.seed),rolls:0};
   message=`Set digital dice seed to ${s.rng.seed}. No dice were rolled.`;quality='manual';break;}
 case 'ROLL_DICE':{
   const count=bounded(command.count,1,10,'Dice count');
   const rolls=[];
   for(let i=0;i<count;i++){
     const next=rollSeededDie(s.rng.seed);s.rng.seed=next.seed;rolls.push(next.face);s.rng.rolls++;
   }
   message=`Digital dice (seeded): ${rolls.join(', ')}. Reference roll only; resolve any game effects manually.`;
   quality='manual';break;}
 case 'RECORD_DICE':{
   const vals=asArray(command.rolls);
   if(!vals.length||vals.length>10)fail('Record between 1 and 10 physical dice.');
   const rolls=vals.map(v=>bounded(v,1,6,'Die face'));
   message=`Physical dice recorded: ${rolls.join(', ')}. Resolve any effects manually.`;
   quality='manual';break;}
 case 'SET_SCENARIO':{
   if(s.phase!=='setup')fail('Change the scenario only in setup.');
   if(!SCENARIOS.some(x=>x[0]===command.value))fail('Unknown scenario.');
   if(s.pieces.length||s.cards.length)fail('Scenario cannot be changed after adding pieces or cards. Start a new blank game instead.');
   s.scenario=command.value;s.period=command.value==='downfall'?3:1;
   message=`Scenario: ${SCENARIOS.find(x=>x[0]===s.scenario)[1]}`;quality='manual';break;}
 case 'WAR_DRAW_MOVEMENT':{
   if(s.phase!=='war'||s.steps.w1||s.warMovement||s.battlePending||s.enemyFlow||s.successCheck||s.pending)fail('Draw War movement only at the start of an unblocked War Column Phase.');
   if(!s.pieces.some(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0)){
     s.steps.w1='na';s.steps.w2='na';s.steps.w3='na';
     message='No War Columns in play: §3.1 terminates before movement, attrition and War Event draws.';break;
   }
   const drawn=drawWarWithReshuffle(s,'Discard');
   const preview=autoWarMovementPreview(s,drawn.id);
   for(const outcome of preview.outcomes)if(outcome.strengthLoss&&item(s,outcome.warId).strength===1)warEndsPreview(s,outcome.warId);
   for(const outcome of preview.outcomes){
     const w=item(s,outcome.warId);w.location=outcome.route.at(-1);
     if(outcome.strengthLoss){if(w.strength===1)resolveWarEnds(s,w.id);else w.strength-=outcome.strengthLoss;}
   }
   s.warMovementDrawn=drawn.id;s.steps.w1='done';
   message=`Drew ${drawn.id}${drawn.reshuffles?' after W25 reshuffle':''} and automatically moved ${preview.outcomes.length} activated column(s): ${preview.outcomes.map(o=>o.warId+': '+o.route.join(' → ')).join('; ')||'none'}.`;
   break;
 }
 case 'WAR_DRAW_EVENT':{
   if(s.phase!=='war'||s.steps.w1!=='done'||s.steps.w2!=='done'||s.steps.w3||s.battlePending||s.enemyFlow||s.successCheck||s.pending)fail('Draw War Event only after movement and attrition (§3.1 step 3), once per War phase.');
   if(!s.pieces.some(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0))fail('No War Columns remain: verify whether the War phase ended before the event draw.');
   if(s.cards.some(c=>c.kind==='War'&&c.zone==='War Event'))fail('A War Event is already face-up.');
   const drawn=drawWarWithReshuffle(s,'War Event');
   s.warEventResolved=null;s.warHigherStakesResolved=false;
   const effect=applyVerifiedWarEvent(s,drawn.id);
   s.steps.w3='done';
   message=`Drew ${drawn.id} (${drawn.source.event})${drawn.reshuffles?' after W25 reshuffle':''}. ${effect.applied?'Verified reveal effect applied.':'Card event remains active; unimplemented choice/timing effects require rule-guided resolution.'}`;
   quality=effect.applied?'verified':'manual';break;
 }
 case 'WAR_AUTO_MOVE':{
   if(s.phase!=='war'||s.warMovement||s.enemyFlow||s.battlePending||s.battleContinuation||s.pending||s.successCheck)fail('Automatic War movement requires an unblocked War Column Phase.');
   if(['done','na'].includes(s.steps.w1))fail('War movement step has already been recorded.');
   const result=autoWarMovementPreview(s,command.card);
   for(const outcome of result.outcomes){
     const w=item(s,outcome.warId);
     if(outcome.strengthLoss && w.strength===1)warEndsPreview(s,w.id);
   }
   for(const outcome of result.outcomes){
     const w=item(s,outcome.warId);w.location=outcome.route.at(-1);
     if(outcome.strengthLoss){if(w.strength===1)resolveWarEnds(s,w.id);else w.strength-=outcome.strengthLoss;}
   }
   s.steps.w1='done';
   message=`Automatically moved ${result.outcomes.length} activated War Column(s) using ${result.card}, shortest eligible paths and Alphabetic Priority. ${result.outcomes.map(o=>o.warId+': '+o.route.join(' → ')+(o.strengthLoss?' (-1 strength / War Ends if strength was 1)':'')).join('; ')||'No eligible columns'}. Confirm map evidence and card exceptions before relying on results.`;
   quality='verified';break;
 }
 case 'WAR_AUTO_ATTRITION':{
   if(s.phase!=='war'||s.steps.w1!=='done'||['done','na'].includes(s.steps.w2))fail('Finish War movement step 1 before rolling War attrition once.');
   if(s.warMovement||s.battlePending||s.enemyFlow)fail('Finish pending War procedures first.');
   const cols=s.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0);
   const rolls=[];
   for(const w of cols){
     const r=rollSeededDie(s.rng.seed);s.rng.seed=r.seed;s.rng.rolls++;
     rolls.push({id:w.id,die:r.face,loss:r.face<w.strength});
   }
   for(const r of rolls)if(r.loss&&item(s,r.id).strength===1)warEndsPreview(s,r.id);
   for(const r of rolls)if(r.loss){const w=item(s,r.id);if(w.strength===1)resolveWarEnds(s,r.id);else w.strength--;}
   s.steps.w2='done';
   message=`War attrition (§3.1 step 2): ${rolls.map(r=>r.id+' rolled '+r.die+(r.loss?' (-1 strength / War Ends at strength 1)':' (no loss)')).join('; ')||'no War Columns'}.`;
   quality='verified';break;
 }
 case 'WAR_MOVE_BEGIN':{
   if(s.phase!=='war'||s.pending||s.successCheck||s.battlePending||s.battleContinuation||s.warMovement)fail('Start War Card movement only in the War Column Phase with no unresolved procedure.');
   const w=item(s,command.warId);
   if(w.type!=='War Column'||!SPACE[w.location]||w.strength<1||w.strength>8)fail('Select an in-play War Column with strength 1–8.');
   if(!ENEMY_COLUMNS.includes(w.owner))fail('First record War Column Owner as North, West, South or East.');
   const card=String(command.card||'').trim().toUpperCase();
   const printed=warCard(card);
   const printedAllowance=printed?warMovementAllowance(card,w.owner):null;
   if(printed&&!printedAllowance)fail(`${card} does not activate the ${w.owner} War Column (or is a reshuffle card).`);
   const allowed=printed?printedAllowance:bounded(command.allowed,1,8,'Printed movement allowance');
   if(!command.ack||card.length<3||card.length>120)fail('Confirm the printed War Card selected this column and enter its identifier.');
   if(printed&&command.allowed!==undefined&&Number(command.allowed)!==allowed)fail(`Printed ${card} requires ${allowed} movement for ${w.owner}; do not override its value.`);
   s.warMovement={warId:w.id,enemy:w.owner,card,allowed,remaining:allowed,route:[w.location],exceptions:[],date:new Date().toISOString()};
   message=`Registered printed War Card ${card}: ${named(w)} may move up to ${allowed} space(s). Follow the physical card for target/priority.`;quality='manual';break;}
 case 'WAR_MOVE_STEP':{
   const m=s.warMovement;if(!m)fail('Register a War Card movement before moving.');
   const w=item(s,m.warId);
   if(!SPACE[w.location]||w.owner!==m.enemy)fail('War Column location or owner changed unexpectedly. Undo or reconcile first.');
   if(m.remaining<1)fail('No War Card movement steps remain.');
   if(warColumnStopUnits(s,w.id).length)fail('War Column must stop at a visible Band, Ranchería or Allied Tribe (unless printed card overrides).');
   const to=String(command.to);
   const edge=s.edges.find(e=>e.a===w.location&&e.b===to||e.b===w.location&&e.a===to);
   if(!edge)fail('Movement requires a connection verified against your physical board.');
   if(edge.kind==='dashed'&&m.enemy!=='North'){
     if(!command.cardOverride||String(command.overrideReason||'').trim().length<12)fail('Colonial War Columns cannot cross dashed lines unless a printed card explicitly permits it. Document that exception.');
   }
   if(!command.ack)fail('Confirm this step moves nearer to the correct printed-card target and does not skip a mandatory stop.');
   const from=w.location;w.location=to;m.remaining--;m.route.push(to);
   if(edge.kind==='dashed'&&m.enemy!=='North')m.exceptions.push({from,to,reason:String(command.overrideReason).trim().slice(0,200)});
   message=`War Card ${m.card}: ${named(w)} ${from} → ${to} (${edge.kind}); ${m.remaining} step(s) remain. Target choice confirmed on printed board.${edge.kind==='dashed'&&m.enemy!=='North'?' Exception: '+String(command.overrideReason).slice(0,160):''}`;
   quality='manual';break;}
 case 'WAR_MOVE_FINISH':{
   const m=s.warMovement;if(!m)fail('No War Card movement in progress.');
   const w=item(s,m.warId);
   const stopped=warColumnStopUnits(s,w.id).length>0;
   const reason=String(command.reason||'').trim();
   if(!command.ack)fail('Confirm the War Card and physical board are reconciled.');
   if(m.remaining>0&&!stopped&&reason.length<15)fail('Unspent steps require a documented reason (target reached, no visible target, or printed-card effect).');
   if(reason.length>400)fail('Movement explanation must be 400 characters or fewer.');
   s.warMovement=null;
   message=`War Card movement complete: ${m.card}, ${named(w)}, ${m.allowed-m.remaining}/${m.allowed} edges, ${m.route.join(' → ')}.${stopped?' Stopped by visible defender.':''}${reason?' '+reason:''}`;
   quality='manual';break;}
 case 'WAR_MOVE_CANCEL':{
   const m=s.warMovement;if(!m)fail('No movement to cancel.');
   if(m.route.length>1)fail('Movement already changed the ledger. Use Undo to restore the previous state.');
   s.warMovement=null;message='Canceled War Card movement before any counter was moved.';quality='manual';break;}
 case 'MAP_REVIEW_SPACE':{
   const space=String(command.space||'');if(!SPACE[space])fail('Unknown map space.');
   if(!command.ack)fail('Confirm every solid and dashed connection at this space against the physical board.');
   const note=String(command.note||'').trim();if(note.length>200)fail('Map note is too long.');
   s.mapReview??={};s.mapReview[space]={signature:mapSpaceSignature(s,space),note:note.slice(0,200),at:new Date().toISOString()};
   message=`Physically reviewed every visible connection at ${space} (${s.edges.filter(e=>e.a===space||e.b===space).length} recorded). Changing its lines invalidates this review.`;
   quality='manual';break;}
 case 'ENEMY_BEGIN':{
   if(s.phase==='setup'||s.phase==='gameover'||s.pending||s.successCheck||s.battlePending||s.battleContinuation||s.warMovement||s.enemyFlow)fail('Start Enemy Instructions only when no other guided procedure is underway.');
   const kind=String(command.kind||''),enemy=String(command.enemy||'');
   // Printed persistent Development overrides apply before selecting the Enemy.
   // Only one of these mutually exclusive Enemy Action Table overrides may control
   // the procedure. A later card conflict requires a chronological adjudication.
   const overrides=s.cards.filter(c=>c.kind==='Development'&&c.zone==='In play'&&['28','46'].includes(devNumber(c)));
   if(overrides.length>1)fail('Overlapping Enemy Action Table overrides require printed card-order adjudication.');
   if(overrides.length){const only=devNumber(overrides[0])==='28'?'West':'East';
    if(enemy!==only)fail(`${overrides[0].title||'Development card #'+devNumber(overrides[0])}: only ${only} executes Enemy Instructions while this card is in play.`);
   }
   if(!['paid','free'].includes(kind)||!ENEMY_COLUMNS.includes(enemy))fail('Choose a paid or free procedure and the active Enemy.');
   if(kind==='paid'&&s.phase!=='cleanup')fail('Paid Enemy AP processing belongs to the Operation Cleanup procedure.');
   if(kind==='free'&&!(s.phase==='cleanup'||s.phase==='execution'&&s.operation==='Planning'))fail('Free Enemy Instructions belong to Cleanup or Planning.');
   if(kind==='paid'&&enemyApPreview(s).total<1)fail('No Enemy APs recorded; verify the physical board first.');
   const die=bounded(command.die,1,6,'Enemy display die');const row=String(command.row||'');
   const h1Enemy=verifiedHistoryEnemy(s,die);
   if(h1Enemy&&enemy!==h1Enemy){
     const reason=String(command.historyOverride||'').trim();
     if(reason.length<15||reason.length>250)fail(`H1 example maps die ${die} to ${h1Enemy}, not ${enemy}. Confirm a printed card/rule override (15–250 characters).`);
   }

   if(!DISPLAY_ROWS.includes(row)||!command.ack)fail('Read the printed History Card and choose the corresponding physical display row; tracker row letters are not die faces.');
   const flip=s.pieces.find(p=>p.type==='Instruction'&&p.location===`enemy-display:${enemy}:${row}`);
   if(flip)flip.flipped=!Boolean(flip.flipped);
   s.enemyFlow={kind,enemy,die,row,stage:'choose',currentId:null,currentRow:null,executed:0,
     flippedId:flip?.id||null,startedAt:new Date().toISOString()};
   message=`Enemy §6.2.2 ${kind} procedure started for ${enemy}; physical die ${die}, selected display row ${row}.${h1Enemy?' Source-backed H1 roll predicts '+h1Enemy+'.':''}${h1Enemy&&enemy!==h1Enemy?' History exception: '+String(command.historyOverride).trim().slice(0,250)+'.':''}${flip?' Flipped '+named(flip)+'.':' Selected row was empty: no flip.'} History Card mapping confirmed by player.`;
   quality='manual';break;}
 case 'ENEMY_SELECT':{
   const f=s.enemyFlow;if(!f||f.stage!=='choose')fail('Complete the previous Enemy Instruction step first.');
   if(f.kind==='free'&&f.executed>0)fail('Free procedure resolves only one top Instruction before display reset.');
   const audit=enemyDisplayAudit(s);if(audit.problems.length)fail('Resolve Enemy Display conflicts: '+audit.problems[0]);
   const top=audit.columns[f.enemy].top;if(!top)fail('The selected Enemy column has no Instruction to execute; finish and reset the display.');
   if(f.kind==='paid'){
     if(top.strength<1)fail('Enter and verify the printed AP cost on the top Instruction before spending Enemy APs.');
     if(top.strength>enemyApPreview(s).total)fail('Not enough Enemy APs to execute the top Instruction. Finish the procedure.');
   }
   f.currentId=top.id;f.currentRow=top.location.split(':').at(-1);f.stage=f.kind==='paid'?'payment':'effect';
   message=`Selected ${named(top)} (${f.enemy} row ${f.currentRow}) for ${f.kind==='paid'?'payment':'free execution'}. Resolve printed §6.3 effects before confirmation.`;
   quality='manual';break;}
 case 'ENEMY_PAY':{
   const f=s.enemyFlow;if(!f||f.kind!=='paid'||f.stage!=='payment')fail('Select a paid Enemy Instruction first.');
   const top=item(s,f.currentId),cost=bounded(top.strength,1,20,'Printed Instruction cost');
   const ids=asArray(command.counterIds).map(String);if(new Set(ids).size!==ids.length)fail('The same Enemy AP counter cannot be spent twice.');
   const counters=ids.map(id=>item(s,id));if(counters.some(p=>apCounterValue(p)===0))fail('Choose only Enemy AP counters in the Available Enemy APs box.');
   const value=counters.reduce((v,p)=>v+apCounterValue(p),0),track=bounded(command.trackSpent??0,0,9,'Enemy AP track expenditure');
   if(track>s.tracks.enemyAp||value+track<cost)fail('Selected counters and track expenditure do not cover the printed AP cost.');
   const change=value+track-cost,after=s.tracks.enemyAp-track+change;
   if(after>9)fail('The resulting Enemy AP track would exceed its 9-point limit. Check the physical payment selection.');
   for(const p of counters)p.location='cup';s.tracks.enemyAp=after;
   f.stage='effect';f.lastPayment={cost,counters:ids,totalCounterValue:value,trackSpent:track,change};
   message=`Paid ${cost} Enemy AP for ${named(top)}: ${value} from ${ids.length} cup counter(s), ${track} from track, ${change} returned as track change. Resolve printed Instruction effect next.`;
   break;}
 case 'ENEMY_ALLY':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Start a guided Enemy Ally Instruction first.');
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.cardNoEffectResolved].some(Boolean))fail('Instruction effect is already resolved.');
   const instruction=item(s,f.currentId);
   if(instructionName(instruction)!=='Ally')fail('Current Instruction is not Ally.');
   const target=allyTargetPreview(s,f.enemy);
   if(target.recoverFirst||target.unknownRavaged)fail('Resolve Recover priority or uncertain Ravaged markers before Ally.');
   if(target.encroachInstead)fail('No eligible non-Allied Tribe; resolve the Encroach redirect under §6.3.1.');
   if(!command.ack)fail('Confirm the eligible non-Allied Tribe and all current card effects.');
   const tribe=target.candidates.find(p=>p.id===command.tribeId);
   if(!tribe)fail('Choose an eligible non-Allied Tribe without a War Column.');
   instruction.location=tribe.location;
   f.allyResolved={tribeId:tribe.id,location:tribe.location,instructionId:instruction.id,originalRow:f.currentRow};
   message=`Ally §6.3.1: ${named(instruction)} now accompanies Tribe ${tribe.id} at ${tribe.location}; this space gains Peace status. If Tribe leaves play, return Ally to its owner's display.`;
   quality='verified';break;
 }
 case 'ENEMY_PEACE':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Start a guided Enemy Peace Instruction first.');
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.cardNoEffectResolved].some(Boolean))fail('Instruction effect is already resolved.');
   const instruction=item(s,f.currentId);
   if(instructionName(instruction)!=='Peace')fail('Current Instruction is not Peace.');
   const target=peaceTargetPreview(s,f.enemy);
   if(target.recoverFirst||target.unknownRavaged)fail('Recover priority or unclassified Ravaged markers block Peace.');
   if(target.requiresWarProcedure)fail('An active War Column requires the special §6.3.5 War procedure first; use manual resolution.');
   if(!command.ack)fail('Confirm the Peace square and applicable card effects.');
   // §6.3.5 replaces an existing Peace counter on the same enemy square.
   // We preserve the counter in its original inactive row when possible.
   for(const old of target.replace){
     const previous=item(s,old),row=String(previous.displayRow||'').toUpperCase();
     if(!DISPLAY_ROWS.includes(row)||s.pieces.some(p=>p!==previous&&p.location===`enemy-inactive:${row}`))
       fail('Previous Peace counter needs a verified empty Inactive row; return it manually before resolving.');
     previous.location=`enemy-inactive:${row}`;
   }
   instruction.location=target.square;
   f.peaceResolved={instructionId:instruction.id,square:target.square,enemy:f.enemy,originalRow:f.currentRow,replaced:target.replace};
   message=`Peace §6.3.5: placed ${named(instruction)} at ${target.square}; ${target.replace.length} previous Peace counter(s) returned. Enemy Settlements now gain Peace status. ${f.enemy==='East'?'Both East squares are Peace Spaces.':''}`;
   quality='verified';break;
 }
 case 'ENEMY_ENCROACH':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Begin a guided Enemy Instruction before resolving Encroach.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('The Instruction effect is already resolved.');
   const printedKind=instructionName(item(s,f.currentId));
   if(printedKind!=='Encroach' && !(printedKind==='Ally'&&allyTargetPreview(s,f.enemy).encroachInstead))fail('The current Instruction is neither Encroach nor an Ally with no legal target.');
   const recovery=recoverTargetAudit(s,f.enemy);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority or unidentified Ravaged owner must be resolved before Encroach.');
   if(!command.ack)fail('Confirm the die-symbol territories and the selected free stacking space.');
   const report=encroachTargetPreview(s,command.die,command.order);
   if(report.huntInstead)fail('No available Tribe or valid space: perform Hunt instead under rule 6.3.3.');
   const tribe=s.pieces.find(p=>p.id===command.tribeId&&p.type==='Tribe'&&p.location==='reserve');
   if(!tribe)fail('Select a Tribe in stock.');
   const location=String(command.space||'');
   if(!report.spaces.includes(location))fail('The selected space is not eligible in the first available territory.');
   const bison=s.pieces.filter(p=>p.type==='Bison'&&p.location===location);
   tribe.location=location;for(const p of bison)p.location='reserve';
   f.encroachResolved={die:report.die,order:[...command.order],selectedFace:report.selectedFace,territory:report.territory,tribeId:tribe.id,location,bisonIds:bison.map(p=>p.id)};
   message=`Enemy Encroach §6.3.3: placed Tribe ${tribe.id} at ${location} after checking ${report.checked} territor${report.checked===1?'y':'ies'}; ${bison.length} Bison returned to stock.`;
   quality='verified';break;
 }
 case 'ENEMY_HUNT':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Begin a guided Enemy Instruction before resolving Hunt.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('The Instruction effect is already resolved. Undo to correct.');
   const currentKind=instructionName(item(s,f.currentId));
   if(currentKind!=='Hunt'){
     if(currentKind!=='Encroach')fail('The current Instruction is not recorded as Hunt or its Encroach redirect.');
     const blocked=encroachTargetPreview(s,command.die,command.order);
     if(!blocked.huntInstead)fail('Encroach has a legal Tribe placement; Hunt fallback is not allowed.');
   }
   const recovery=recoverTargetAudit(s,f.enemy);
   if(recovery.candidates.length)fail('Recover takes priority over Hunt under rule 6.3.4.');
   if(recovery.ambiguousRavaged.length)fail('Unclassified Ravaged marker ownership must be reconciled before Hunt.');
   if(!command.ack)fail('Confirm the die-symbol territory mapping against the printed board.');
   const preview=huntTargetPreview(s,command.die,command.order);
   let bisonId=null;
   if(!preview.none){
     const result=rollSeededDie(s.rng.seed);s.rng.seed=result.seed;s.rng.rolls++;
     // Digital counter selection is random among the Bison in the selected territory.
     const target=preview.candidates[result.seed%preview.candidates.length];
     bisonId=target.id;item(s,bisonId).location='reserve';
   }
   f.huntResolved={die:preview.face,order:[...command.order],territory:preview.territory,selectedFace:preview.selectedFace,bisonId,redirectedFrom:currentKind==='Encroach'?'Encroach':null};
   message=preview.none?'Enemy Hunt: no Bison on any numbered space; no effect.':
     `Enemy Hunt §6.3.4: die ${preview.face}, checked ${preview.checked} territor${preview.checked===1?'y':'ies'}, removed ${bisonId} from ${preview.territory} to stock.`;
   quality='verified';break;
 }
 case 'ENEMY_AUTO_CULTURE_ATTACK':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId||instructionName(item(s,f.currentId))!=='Culture Attack')fail('Select the Culture Attack Instruction first.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('Instruction already resolved.');
   const preview=enemyCulturePreview(s,f.enemy);
   if(preview.recoverFirst)fail('Recover takes priority over Culture Attack.');
   if(preview.unverifiedRavaged)fail('Unclassified Ravaged counters prevent safe automation.');
   // A live Development/History exception not in the executable registry must still be checked.
   const unknown=s.cards.some(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(c)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(c)].mode.startsWith('manual-required')));
   if(unknown)fail('An active Development card has unimplemented text; review card exceptions before automatic Culture Attack.');
   const p=item(s,f.currentId),inactive=`enemy-inactive:${f.currentRow}`;
   if(s.pieces.some(q=>q!==p&&q.location===inactive))fail('Inactive display slot is occupied.');
   s.tracks=preview.pointLoss.tracks;
   p.location=inactive;
   f.currentId=null;f.currentRow=null;f.stage=f.kind==='paid'?'choose':'done';f.executed++;
   message=`Culture Attack auto-resolved: ${f.enemy}, -${preview.amount} Culture (with deficit conversion), ${preview.settlements.length} Settlements, Instruction moved to Inactive. Display reset is still required at procedure completion.`;break;
 }
 case 'ENEMY_CULTURE_ATTACK':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Select and pay for the Culture Attack Instruction first.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('Instruction effect is already resolved. Undo to correct it.');
   const instruction=item(s,f.currentId);
   if(instructionName(instruction)!=='Culture Attack')fail('Current printed Instruction is not recorded as Culture Attack.');
   const result=enemyCulturePreview(s,f.enemy);
   if(result.recoverFirst)fail('Recover takes priority over Culture Attack (6.3.2).');
   if(result.unverifiedRavaged)fail('Unclassified Ravaged markers exist; confirm Enemy ownership before resolving automatically.');
   if(!command.ack)fail('Confirm all Settlement counters and current in-play card exceptions were checked.');
   s.tracks=result.pointLoss.tracks;
   f.cultureAttackResolved={enemy:f.enemy,settlementIds:result.settlements.map(p=>p.id),amount:result.amount,
      militaryAfter:s.tracks.military,cultureAfter:s.tracks.culture};
   message=`Automated Culture Attack §6.3.2: ${f.enemy} inflicted ${result.amount} Culture loss (1 base + ${result.settlements.length} Settlements); applied §2.11 deficit conversion. Confirm instruction completion.`;
   quality='verified';break;
 }
 case 'ENEMY_CARD_NO_EFFECT':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Select and pay for the affected Instruction first.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('Instruction effect already recorded.');
   const info=enemyCardExceptionPreview(s);
   if(!info?.effect)fail('No verified active-card exception applies to this Instruction.');
   const recover=recoverTargetAudit(s,f.enemy);
   if(recover.candidates.length)fail('Recover redirects this Instruction; resolve Recover before applying a no-effect card exception.');
   if(recover.ambiguousRavaged.length)fail('Ravaged marker ownership is incomplete; cannot determine Recover priority.');
   if(!command.ack)fail('Confirm the Development card is in play and its printed exception applies.');
   f.cardNoEffectResolved={effect:info.effect.key,instruction:info.kind};
   message=`Card exception: ${info.effect.title} makes ${info.kind} ineffective for this Enemy Instruction (GMT Living Playbook p. 8). APs remain spent; move Instruction to Inactive after confirmation.`;
   quality='verified';break;
 }
 case 'ENEMY_RECOVER':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Recover is only available while an Enemy Instruction effect is being resolved.');
   if(f.recoverResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('An effect has already been resolved for this Instruction.');
   const audit=recoverTargetAudit(s,f.enemy),target=audit.candidates.find(p=>p.id===command.ravagedId);
   if(!target)fail('Ravaged marker does not have a verifiable active Enemy piece in its space. Reconcile the piece owners first.');
   const die=bounded(command.die,1,6,'History Card Recover die');
   const criterion=String(command.criterion||'').trim();
   if(!command.ack||criterion.length<12||criterion.length>240)fail('Confirm and describe the printed History Card Recover roll requirement (12–240 characters).');
   if(audit.requiresRandomSelection&&!command.randomConfirmed)fail('Multiple Ravaged targets: confirm random selection on the physical board.');
   if(typeof command.success!=='boolean')fail('Record whether the printed History Card says the roll succeeded.');
   if(command.success)item(s,target.id).location='reserve';
   f.recoverResolved={ravagedId:target.id,location:target.location,die,success:command.success,criterion,randomConfirmed:Boolean(command.randomConfirmed)};
   message=`Recover §6.3.7 for ${f.enemy}: ${target.label} in ${target.location}; History Card die ${die}, ${command.success?'successful — marker returned to stock':'failed — marker remains'}. ${criterion}`;
   quality='manual';break;}
 case 'ENEMY_SUBJUGATE':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Subjugate is only available during the current Enemy Instruction effect.');
   if(!['West','South','East'].includes(f.enemy))fail('Subjugate is only available to a Colonial Enemy.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('This Instruction effect already has a Recover/Subjugate/Settle result; use Undo to correct it.');
   if(f.enemy==='East'&&s.cards.some(c=>c.kind==='Development'&&c.zone==='In play'&&devNumber(c)==='46')&&command.eastOrigin!=='E2')fail('Lone Star Republic: East Subjugate and Settle must use southern East square E2.');
   const report=subjugateTargetAudit(s,f.enemy,{eastOrigin:command.eastOrigin||null});
   if(report.recoverFirst)fail('Recover has priority over Subjugate: resolve the printed Recover effect first.');
   if(report.originSelectionRequired)fail('Confirm the East Enemy square selected on the physical board.');
   const tribe=s.pieces.find(p=>p.id===command.tribeId&&p.type==='Tribe'&&SPACE[p.location]?.type==='round');
   if(!tribe)fail('Select a Tribe counter currently on a numbered map space.');
   const allyMarkers=s.pieces.filter(p=>p.location===tribe.location&&p.subtype==='Ally'&&['Instruction','Marker'].includes(p.type));
   if(allyMarkers.length)fail('Allied Tribe: reconcile the Ally Instruction return to North display manually before removing this Tribe. Use the manual procedure rather than automatic Subjugate.');
   const candidates=report.reachable;
   const chosen=candidates.find(x=>x.tribeId===tribe.id);
   const note=String(command.mapVerification||'').trim();
   if(!command.ack||note.length<25||note.length>400)fail('Confirm the selected Tribe and physical colored routes, History Card, and printed §6.3.9 selection (25–400 characters).');
   if(report.tiedKnown.length>1&&chosen&&report.tiedKnown.some(x=>x.tribeId===chosen.tribeId)&&!command.randomConfirmed)fail('Recorded nearest candidates tie: confirm a random target was selected physically.');
   if(!chosen&&!command.unmappedRouteConfirmed)fail('The selected Tribe lacks a verified colored route in the incomplete ledger. Confirm its actual route on the physical board.');
   if(chosen&&report.nearestKnown&&chosen.distance>report.nearestKnown.distance&&!command.unmappedRouteConfirmed)fail('Another recorded Tribe is closer: document the actual printed-board route before overriding this provisional ranking.');
   if(chosen&&report.nearestKnown&&chosen.distance===report.nearestKnown.distance&&chosen.area>report.nearestKnown.area&&!command.unmappedRouteConfirmed)fail('Another recorded Tribe has a lower area value: confirm the physical map or explain the difference.');
   const location=tribe.location;
   tribe.location='reserve';
   f.subjugateResolved={tribeId:tribe.id,location,enemy:f.enemy,origin:command.eastOrigin||null,recordedDistance:chosen?.distance??null,
     randomConfirmed:Boolean(command.randomConfirmed),unmappedRouteConfirmed:Boolean(command.unmappedRouteConfirmed),mapVerification:note};
   message=`Subjugate §6.3.9 (${f.enemy}): returned ${named(tribe)} from ${location} to stock after explicit physical target verification. Colored network is incomplete. ${note}`;
   quality='manual';break;}
 case 'ENEMY_SETTLE':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Settle is only available during the current Enemy Instruction effect.');
   if(!['West','South','East'].includes(f.enemy))fail('Settle is only available to a Colonial Enemy.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('This Instruction effect already has a Recover/Subjugate/Settle result; use Undo to correct it.');
   if(f.enemy==='East'&&s.cards.some(c=>c.kind==='Development'&&c.zone==='In play'&&devNumber(c)==='46')&&command.eastOrigin!=='E2')fail('Lone Star Republic: East Subjugate and Settle must use southern East square E2.');
   const report=settleTargetAudit(s,f.enemy,{eastOrigin:command.eastOrigin||null});
   const enemySquares=f.enemy==='West'?['W']:f.enemy==='South'?['S']:['E1','E2'];
   if(s.pieces.some(p=>p.subtype==='Ravaged'&&enemySquares.includes(p.location)))fail('Recover has priority over Settle on an active Enemy square.');
   if(report.originSelectionRequired)fail('Confirm the randomly selected East starting square from your physical board.');
   const space=String(command.space||'');
   if(SPACE[space]?.type!=='round')fail('Settle requires a numbered round map space.');
   const blockers=s.pieces.filter(p=>p.location===space&&['Rancheria','Band','Settlement','Tribe'].includes(p.type));
   if(blockers.length)fail('Settle destination is occupied by a counter that blocks stacking.');
   const settlement=s.pieces.find(p=>p.id===command.settlementId&&p.type==='Settlement'&&p.location==='reserve'&&
     (p.owner===f.enemy||p.owner===s.colonial?.[f.enemy]));
   if(!settlement)fail('Choose an available Settlement counter belonging to the active Enemy.');
   const candidate=report.candidates.find(x=>x.space===space);
   const note=String(command.mapVerification||'').trim();
   if(!command.ack||note.length<25||note.length>400)fail('Confirm the printed §6.3.8 route, History Card, stacking and physical stock (25–400 characters).');
   if(!candidate&&!command.unmappedRouteConfirmed)fail('No verified colored route to the selected space; confirm the missing printed connection before proceeding.');
   if(candidate&&report.nearestKnown&&
       (candidate.distance>report.nearestKnown.distance||candidate.distance===report.nearestKnown.distance&&candidate.area>report.nearestKnown.area)&&
       !command.unmappedRouteConfirmed)fail('A nearer or lower-area eligible destination is recorded; verify the printed-board exception.');
   if(candidate&&report.tiedKnown.length>1&&report.tiedKnown.some(x=>x.space===space)&&!command.randomConfirmed)
     fail('Multiple best known destinations tie; confirm the printed random selection.');
   const bison=s.pieces.filter(p=>p.location===space&&p.type==='Bison');
   if(bison.length&&!command.bisonConfirmed)fail('Confirm that every Bison in the destination was physically returned to stock.');
   settlement.location=space;
   for(const p of bison)p.location='reserve';
   f.settleResolved={settlementId:settlement.id,space,enemy:f.enemy,origin:command.eastOrigin||null,
     bisonIds:bison.map(p=>p.id),recordedDistance:candidate?.distance??null,
     randomConfirmed:Boolean(command.randomConfirmed),unmappedRouteConfirmed:Boolean(command.unmappedRouteConfirmed),mapVerification:note};
   message=`Settle §6.3.8 (${f.enemy}): recorded ${named(settlement)} into ${space} and returned ${bison.length} Bison to stock after physical-board confirmation. ${note}`;
   quality='manual';break;}
 case 'ENEMY_CONFIRM':{
   const f=s.enemyFlow;if(!f||f.stage!=='effect'||!f.currentId)fail('Choose and, when required, pay for an Instruction first.');
   const p=item(s,f.currentId),note=String(command.note||'').trim();
   if(!command.ack||note.length<12||note.length>600)fail('Confirm the physical §6.3 effect and describe its counter/track consequences (12–600 characters).');
   const knownCard=enemyCardExceptionPreview(s);
   if(knownCard?.effect&&!f.cardNoEffectResolved&&!f.recoverResolved){
     const possibleRecover=recoverTargetAudit(s,f.enemy);
     if(!possibleRecover.candidates.length)fail('Apply the verified in-play Development card exception before confirming this Instruction.');
   }
   if(['Hunt','Encroach'].includes(instructionName(p))&&!f.huntResolved&&!f.encroachResolved&&!f.recoverResolved)fail('Resolve the digital Hunt/Encroach action before confirming this Instruction.');
   if(instructionName(p)==='Culture Attack'&&!f.cultureAttackResolved&&!f.recoverResolved){
     const culture=enemyCulturePreview(s,f.enemy);
     if(!culture.recoverFirst&&!culture.unverifiedRavaged)fail('Resolve the automatic Culture Attack calculation before confirming this Instruction.');
   }

   if(p.location!== (f.allyResolved?f.allyResolved.location:f.peaceResolved?f.peaceResolved.square:`enemy-display:${f.enemy}:${f.currentRow}`))fail('The executing Instruction changed location unexpectedly; reconcile the board first.');
   if(f.recoverResolved&&!note.toLowerCase().includes('recover'))fail('Mention the recorded Recover result in the effect confirmation for a complete audit trail.');
   if(f.subjugateResolved&&!note.toLowerCase().includes('subjugate'))fail('Mention the recorded Subjugate result in the effect confirmation for a complete audit trail.');
   if(f.peaceResolved&&!note.toLowerCase().includes('peace'))fail('Mention the recorded Peace placement in the effect confirmation.');
   if(instructionName(p)==='Peace'&&!f.peaceResolved&&!f.recoverResolved){
     const peace=peaceTargetPreview(s,f.enemy);
     if(!peace.requiresWarProcedure||!note.toLowerCase().includes('war'))
       fail('Resolve digital Peace placement or document the War Column branch of §6.3.5 before confirming.');
   }
   if(f.allyResolved&&!note.toLowerCase().includes('ally'))fail('Mention the recorded Ally placement in the effect confirmation.');
   if(instructionName(p)==='Ally'&&!f.allyResolved&&!f.encroachResolved&&!f.recoverResolved)fail('Resolve the digital Ally placement, or document the Encroach redirect, before confirming.');
   if(f.encroachResolved&&!note.toLowerCase().includes('encroach'))fail('Mention the digital Encroach outcome in the effect confirmation.');
   if(f.huntResolved&&!note.toLowerCase().includes('hunt'))fail('Mention the digital Hunt outcome in the effect confirmation.');
   if(f.settleResolved&&!note.toLowerCase().includes('settle'))fail('Mention the recorded Settle result in the effect confirmation for a complete audit trail.');
   if(f.cultureAttackResolved&&!note.toLowerCase().includes('culture'))fail('Mention the automatic Culture Attack in the final confirmation.');
   if(f.cardNoEffectResolved&&!note.toLowerCase().includes('card'))fail('Mention the Development card exception in the final confirmation.');
   const inactive=`enemy-inactive:${f.currentRow}`;
   if(!f.allyResolved&&!f.peaceResolved){
     if(s.pieces.some(q=>q!==p&&q.location===inactive))fail('Inactive row already occupied. Correct the physical display before continuing; cannot stack Instructions.');
     p.location=inactive;
   }
   const allyPlaced=Boolean(f.allyResolved),peacePlaced=Boolean(f.peaceResolved);
   f.currentId=null;f.currentRow=null;f.stage=f.kind==='paid'?'choose':'done';f.executed++;
   // Each executed Instruction has its own effect ledger; avoid carrying a
   // completed Recover/Subjugate/Settle result into a later paid Instruction.
   f.recoverResolved=null;f.subjugateResolved=null;f.settleResolved=null;f.cultureAttackResolved=null;f.huntResolved=null;f.encroachResolved=null;f.allyResolved=null;f.peaceResolved=null;f.cardNoEffectResolved=null;
   message=`Executed ${named(p)} for ${f.enemy}, ${allyPlaced?'retained on allied Tribe space':peacePlaced?'retained on Peace square':'moved to Inactive row '+inactive.at(-1)}. Physical §6.3 confirmation: ${note}.`;
   quality='manual';break;}
 case 'ENEMY_FINISH':{
   const f=s.enemyFlow;if(!f||!['choose','done'].includes(f.stage))fail('Complete the selected Instruction effect before finishing.');
   if(!command.ack)fail('Confirm the printed Enemy Instruction sequence and counter locations are reconciled.');
   const audit=enemyDisplayAudit(s);if(audit.problems.length)fail('Resolve Enemy Display conflicts: '+audit.problems[0]);
   if(f.kind==='paid'){
     const top=audit.columns[f.enemy].top,budget=enemyApPreview(s).total;
     if(top&&top.strength<1&&budget>0)fail('Top Instruction AP cost is unknown. Record it before ending the paid procedure.');
     if(top&&top.strength>0&&top.strength<=budget){
       const reason=String(command.overrideReason||'').trim();
       if(reason.length<15||reason.length>250)fail('Affordable top Instruction remains. Continue paying or document a printed-card exception (15–250 characters).');
     }
     const leftovers=s.pieces.filter(p=>apCounterValue(p)>0);const total=leftovers.reduce((v,p)=>v+apCounterValue(p),0);
     if(s.tracks.enemyAp+total>9)fail('Returning available Enemy AP counters would exceed 9 saved APs; reconcile the printed board.');
     s.tracks.enemyAp+=total;for(const p of leftovers)p.location='cup';
   }
   const result=resetEnemyDisplay(s);
   message=`Completed ${f.kind} Enemy Instruction procedure (${f.enemy}, ${f.executed} executed). Reset display: ${result.moved.length} Inactive counter(s) returned to columns. ${f.kind==='paid'?'Unspent box Enemy AP counters returned to cup and credited to 0–9 track.':''}${String(command.overrideReason||'').trim()?' Exception: '+String(command.overrideReason).trim().slice(0,250):''}`;
   s.enemyFlow=null;quality='manual';break;}
 case 'ENEMY_RESET_DISPLAY':{
   if(s.phase==='setup'||s.phase==='gameover'||s.pending||s.successCheck||s.battlePending||s.battleContinuation||s.warMovement||s.enemyFlow)fail('Reset the Enemy Display during a valid active procedure, without another unresolved action.');
   const source=String(command.source||'').trim();
   if(!command.ack||source.length<10||source.length>250)fail('Confirm the printed §6.2.3 reset was required and name the source rule/step.');
   const result=resetEnemyDisplay(s);
   message=`Enemy Instruction Display reset (§6.2.3): moved ${result.moved.length} Inactive counter(s), compacted active columns. Physical source: ${source}.`;
   quality='manual';break;}
 case 'TRACK':{
   const field=command.field;if(!(field in s.tracks))fail('Unknown track.');
   const max=['military','culture','ap','enemyAp'].includes(field)?9:20;
   const val=bounded(command.value,0,max,field);
   s.tracks[field]=val;
   message=`Updated ${field} to ${val} (entered from physical board).`;quality='manual';break;}
 case 'PERIOD': s.period=bounded(command.value,1,4,'Historical period');message=`Historical period ${s.period} set manually.`;quality='manual';break;
 case 'FLAG': {
   if(!['santaFe','mustPassage'].includes(command.field))fail('Unknown toggle.');
   if(command.field==='mustPassage')s.mustPassage=Boolean(command.value);else s.flags[command.field]=Boolean(command.value);
   message=`${command.field} = ${Boolean(command.value)}`;quality='manual';break;}
 case 'NOTE': s.notes=String(command.value).slice(0,6000);message='Updated game notes.';quality='manual';break;
 case 'ADD_PIECE':{
   const p=createPiece(s,command.piece);message=`Recorded ${named(p)} at ${formatLocation(s,p.location)}.`;quality='manual';break;}
 case 'EDIT_PIECE':{
   const p=item(s,command.id);if(p.location==='removed')fail('Removed-from-game counters cannot be edited.');
   const v=command.patch;
   if(v.type && v.type!==p.type)fail('Piece type cannot be changed. Remove/add a new piece instead.');
   if('strength' in v)p.strength=bounded(v.strength,0,20,'Strength');
   if('mpRating' in v){p.mpRating=bounded(v.mpRating,0,20,'Printed movement');p.ratingConfirmed=true;}
   if('label' in v)p.label=String(v.label).slice(0,100);
   if('subtype' in v){const subtype=String(v.subtype).slice(0,100);if(p.location.startsWith('medicine:')&&subtype!=='Success')fail('Only Success counters belong on Mahimiana medicine tracks.');p.subtype=subtype;}
   if('owner' in v)p.owner=String(v.owner).slice(0,50);
   if('notes' in v)p.notes=String(v.notes).slice(0,1000);
   if('finished' in v)p.finished=Boolean(v.finished);
   message=`Edited ${named(p)} (physical-board reconciliation).`;quality='manual';break;}
 case 'MOVE_PIECE':{
   const p=item(s,command.id);message=movePiece(s,p,command.location,true);
   quality='manual';break;}
 case 'DELETE_PIECE':{
   const p=item(s,command.id);if(s.activeBandId===p.id)fail('Finish the active Band first.');
   if(s.pieces.some(q=>q.location===`held:${p.id}`||q.location===`box:${p.id}`||q.location===`medicine:${p.id}`))fail('Move its contained counters first.');
   s.pieces=s.pieces.filter(q=>q.id!==p.id);message=`Deleted ${named(p)} from ledger (correction).`;
   quality='manual';break;}
 case 'APPLY_MAP_EVIDENCE':{
   // All-or-nothing source-backed preset. The user may retain their own
   // transcription; never silently override a conflicting connection type.
   const proposals=[];
   for(const entry of MAP_EVIDENCE_EDGES){
     const old=s.edges.find(e=>(e.a===entry.a&&e.b===entry.b)||(e.a===entry.b&&e.b===entry.a));
     if(old){if(old.kind!==entry.kind)fail(`Map evidence conflict at ${entry.a}–${entry.b}; compare with printed board and resolve before applying.`);continue;}
     proposals.push({...entry,verifiedByPlayer:false,source:'board-photo'});
   }
   if(proposals.length===0)fail('All source-backed map lines are already recorded.');
   s.edges.push(...proposals);
   message=`Added ${proposals.length} numbered map connections from ${MAP_EVIDENCE_SOURCE}. Other lines still require checking.`;
   quality='verified';break;
 }
 case 'ADD_EDGE':{
   const a=String(command.a),b=String(command.b),kind=command.kind;
   if(!SPACE[a]||!SPACE[b]||a===b)fail('Select two distinct map spaces.');
   if(!['solid','dashed'].includes(kind))fail('Choose solid or dashed.');
   if(s.edges.some(e=>e.a===a&&e.b===b||e.a===b&&e.b===a))fail('This connection has already been recorded.');
   const color=command.enemyColor??'';
   if(!['','West','South','East'].includes(color))fail('Unsupported printed Enemy Connection color.');
   if(color&&kind!=='solid')fail('Colored Enemy Connections require a solid printed connection.');
   const added={a,b,kind,...(color?{enemyFor:[color]}:{}),verifiedByPlayer:true};
   assertNoContradictedSouthLinks([...s.edges,added]);
   s.edges.push(added);message=`Physical-map connection recorded: ${a} ↔ ${b} (${kind}${color?', '+color+' Enemy Connection':''}).`;quality='manual';break;}
 case 'DELETE_EDGE':{
   const n=s.edges.length;s.edges=s.edges.filter(e=>e.a!==command.a||e.b!==command.b);
   if(s.edges.length===n)fail('No such connection.');
   message=`Removed recorded map connection.`;quality='manual';break;}
 case 'PASSAGE_CULTURE_PURCHASE':{
  if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt13!=='done'||s.steps.pt14==='done')fail('Culture purchase belongs to Passage of Time step 14, after step 13, once only.');
  const candidate=culturePurchaseOptions(s).find(x=>x.id===String(command.cultureId||''));
  if(!candidate||!candidate.cardId)fail('Select one of the 24 identified Culture Cards.');
  if(!candidate.available)fail('This Culture Card is not in available stock.');
  if(!candidate.prerequisiteMet)fail('Purchase the previous Culture level in this family first.');
  if(!candidate.affordable)fail(`Need ${candidate.cost} Culture Points to purchase ${candidate.id}.`);
  const card=s.cards.find(c=>c.id===candidate.cardId);
  card.identifier=candidate.id;card.title=`${candidate.family} level ${candidate.level}`;card.zone='In play';
  card.evidenceStatus='checked-against-print';card.sourceReference=candidate.source;
  s.tracks.culture-=candidate.cost;s.steps.pt14='done';
  message=`Passage step 14 (§4.4): bought ${candidate.id} ${candidate.family} level ${candidate.level} for ${candidate.cost} Culture Point(s). Active only while Culture Points ≥ ${candidate.level} (§1.3.3).`;
  break;
 }
 case 'PASSAGE_CULTURE_DECLINE':{
  if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt13!=='done'||s.steps.pt14==='done')fail('Decline the optional Culture purchase only at Passage step 14, after step 13.');
  s.steps.pt14='done';message='Passage step 14: declined optional Culture purchase; no Culture Points spent.';break;
 }
 case 'PASSAGE_RETIRE_MAHIMIANA':{
   passageHeadmanStep(s,5);
   const pairs=passageHeadmen(s);
   const pair=pairs.find(x=>x.ma.id===command.mahimianaId);
   if(!pair)fail('Choose an affiliated in-play Mahimiana to retire.');
   if((s.passageRetiredIds||[]).includes(pair.ma.id))fail('Mahimiana has already retired this Passage.');
   if(pair.mv<=1)fail('Mahimiana needs Medicine greater than 1 to retire (§4.4 step 5).');
   if(pair.mv===6&&activeDevelopment(s,'29').length)fail('Cuerno Verde #29 prohibits retirement of a Medicine-6 Mahimiana while in play.');
   if(pair.ma.location.startsWith('held:')&&!s.pieces.some(p=>p.id===pair.ma.location.slice(5)&&p.type==='Band'))fail('Invalid Mahimiana possession.');
   pair.pa.medicine=pair.mv;setMedicine(s,pair.ma,0);pair.ma.location=`box:${pair.ranch.id}`;
   if(pairs.length===1)s.medicine.paraibo=pair.mv;
   s.passageRetiredIds=[...(s.passageRetiredIds||[]),pair.ma.id];
   message=`Passage step 5: retired ${pair.ma.id}; transferred Medicine ${pair.mv} to ${pair.pa.id}; Mahimiana reset to 0 and returned to ${pair.ranch.id}.`;break;
 }
 case 'PASSAGE_FINISH_RETIREMENT':{
   passageHeadmanStep(s,5);passageHeadmen(s);
   s.steps.pt5='done';message='Passage step 5: all optional Mahimiana retirements recorded.';break;
 }
 case 'PASSAGE_SELECT_QUANAH_EXEMPTION':{
   passageHeadmanStep(s,6);
   if(!activeDevelopment(s,'74').length)fail('Quanah Parker #74 is not in play.');
   const pairs=passageHeadmen(s),id=String(command.mahimianaId||'');
   if(!pairs.some(x=>x.ma.id===id))fail('Select one in-play Mahimiana to exempt from Headman Death Check.');
   s.passageQuanahExemptId=id;message=`Quanah Parker: ${id} exempted from this Passage Headman Death Check.`;break;
 }
 case 'PASSAGE_AUTO_HEADMAN_DEATH':{
   passageHeadmanStep(s,6);
   const pairs=passageHeadmen(s);
   if(activeDevelopment(s,'74').length&&pairs.length&&!pairs.some(x=>x.ma.id===s.passageQuanahExemptId))
     fail('Quanah Parker #74 requires selection of one Mahimiana to exempt from the Headman Death Check.');
   const retired=new Set(s.passageRetiredIds||[]);
   // §4.4 step 6 exempts a Ranchería's headmen when its Mahimiana retired
   // during step 5: the new Paraibo should not immediately die on that turn.
   const exempt=new Set([s.passageQuanahExemptId].filter(Boolean));
   for(const pair of pairs)if(retired.has(pair.ma.id)){exempt.add(pair.ma.id);exempt.add(pair.pa.id);}
   const outcomes=[];
   for(const pair of pairs){
    for(const [headman,before] of [[pair.ma,pair.mv],[pair.pa,pair.pv]]){
     if(exempt.has(headman.id)){outcomes.push(`${headman.id} exempt`);continue;}
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     const after=roll.face<before?roll.face:before;
     headman.medicine=after;
     if(pairs.length===1&&headman===pair.pa)s.medicine.paraibo=after;
     if(pairs.length===1&&headman===pair.ma)s.medicine.mahimiana=after;
     outcomes.push(`${headman.id}: rolled ${roll.face}, ${before}→${after}`);
    }
   }
   s.steps.pt6='done';message=`Passage step 6: Headman Death Checks resolved (${outcomes.join('; ')||'no headmen'}).`;break;
 }
 case 'PASSAGE_AUTO_REPLACE_MAHIMIANA':{
   passageHeadmanStep(s,7);
   const pairs=passageHeadmen(s),outcomes=[];
   for(const pair of pairs){
    if(pair.mv!==0)continue;
    const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
    const value=Math.max(1,Math.floor(roll.face/2));
    if(!['reserve',`box:${pair.ranch.id}`].includes(pair.ma.location))
      fail('A Medicine-0 Mahimiana is elsewhere; reconcile his counter before replacement.');
    pair.ma.location=`box:${pair.ranch.id}`;setMedicine(s,pair.ma,value);
    outcomes.push(`${pair.ma.id}: rolled ${roll.face}, replacement Medicine ${value}`);
   }
   s.steps.pt7='done';message=`Passage step 7: ${outcomes.join('; ')||'no replacements needed'}.`;break;
 }
 case 'PASSAGE_UNFINISH_BANDS':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Band reset belongs to Passage of Time step 1.');
   if(s.steps.pt1==='done')fail('Passage step 1 already resolved.');
   const bands=s.pieces.filter(p=>p.type==='Band'&&(Boolean(SPACE[p.location])||(p.location.startsWith('box:')&&boxExists(s,p.location.slice(4)))));
   for(const p of bands)p.finished=false;
   s.steps.pt1='done';message=`Passage step 1 (§4.4): marked ${bands.length} in-play Bands unfinished.`;
   break;
 }
 case 'PASSAGE_AUTO_RESOURCES':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt8!=='done'||s.steps.pt9==='done')fail('Auto resource transfer requires completed step 8 and unfinished step 9.');
   const resources=s.pieces.filter(p=>['Resource','Bison'].includes(p.type)&&p.location==='operations').map(p=>p.id);
   const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]?.type==='round');
   if(resources.length&&ranches.length!==1)fail('Automatic allocation requires exactly one in-play Ranchería; choose manually when there are multiple or none.');
   for(const pieceId of resources)Object.assign(s,perform(s,{type:'PASSAGE_TRANSFER_RESOURCE',pieceId,rancheriaId:ranches[0].id}));
   Object.assign(s,perform(s,{type:'PASSAGE_FINISH_RESOURCES'}));
   message=`Automatic Passage step 9: transferred ${resources.length} Operations Resources to ${ranches[0]?.label||'the sole Ranchería'} and completed the step.`;
   break;
 }
 case 'PASSAGE_TRANSFER_RESOURCE':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Resource transfer belongs to Passage of Time step 9.');
   if(s.steps.pt8!=='done'||s.steps.pt9==='done')fail('Resolve Passage step 8 first; step 9 cannot be repeated.');
   const p=item(s,command.pieceId),r=item(s,command.rancheriaId);
   if(!['Resource','Bison'].includes(p.type)||p.location!=='operations')fail('Only a Resource counter on the Operations track can be transferred.');
   if(r.type!=='Rancheria'||!SPACE[r.location]||SPACE[r.location].type!=='round')fail('Choose an in-play Ranchería for the Resource.');
   p.location=`box:${r.id}`;
   message=`Passage step 9 (§4.4): transferred ${named(p)} into ${named(r)} Resources box.`;
   break;
 }
 case 'PASSAGE_FINISH_RESOURCES':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Resource transfer belongs to Passage of Time step 9.');
   if(s.steps.pt8!=='done'||s.steps.pt9==='done')fail('Resolve Passage step 8 first; step 9 cannot be repeated.');
   if(s.pieces.some(p=>['Resource','Bison'].includes(p.type)&&p.location==='operations'))fail('Transfer all Operations-track Resources before finishing step 9.');
   s.steps.pt9='done';message='Passage step 9 (§4.4): all Operations-track Resources accounted for.';
   break;
 }
 case 'PASSAGE_RESTORE_SUCCESS':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Success counter reset belongs to Passage of Time step 8.');
   if(s.steps.pt8==='done')fail('Passage step 8 already resolved.');
   if(Array.from({length:7},(_,i)=>`pt${i+1}`).some(k=>!['done','na'].includes(s.steps[k])))fail('Complete Passage steps 1–7 before resetting the Success cup.');
   if(s.successCheck||s.pending)fail('Finish the pending Success Check or Raid before returning counters to the cup.');
   const moved=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Success'&&(
     p.location==='success-out'||p.location==='operations'||p.location.startsWith('medicine:')));
   for(const p of moved)p.location='cup';
   s.steps.pt8='done';message=`Passage step 8 (§4.4): returned ${moved.length} Success counter(s) from Out of Play, Operations and medicine tracks to the cup.`;
   break;
 }
 case 'PASSAGE_CLEAR_RAVAGED':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Ravaged removal belongs to Passage of Time step 10.');
   if(s.steps.pt10==='done')fail('Passage step 10 already resolved.');
   if(!['done','na'].includes(s.steps.pt9)||s.steps.pt8!=='done')fail('Finish Passage steps 8 and 9 before removing Ravaged counters.');
   const ravaged=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Ravaged'&&SPACE[p.location]);
   const locations=new Set(ravaged.map(p=>p.location));
   const targets=s.pieces.filter(p=>locations.has(p.location)&&['Tribe','Settlement'].includes(p.type));
   // A ravaged Settlement/Tribe with an unresolved Ally marker must be reconciled
   // before removing it; the Ally counter belongs on the Instruction Display.
   for(const target of targets){
     if(s.pieces.some(p=>p.location===target.location&&['Instruction','Marker'].includes(p.type)&&p.subtype==='Ally'))
       fail('Ravaged space has an Allied Tribe: reconcile the associated Ally Instruction first.');
   }
   for(const p of targets)p.location='reserve';
   for(const p of ravaged)p.location='reserve';
   if(targets.length===0){const loss=pointLossPreview(s,'military',1);s.tracks=loss.tracks;}
   s.steps.pt10='done';
   message=`Passage step 10 (§4.4): removed ${targets.length} Ravaged Tribe/Settlement counter(s); returned ${ravaged.length} Ravaged marker(s) to stock.${targets.length===0?' No target removed: -1 Military, with point substitution if required.':''}`;
   break;
 }
 case 'PASSAGE_AUTO_PEACE':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt10!=='done'||s.steps.pt11==='done')fail('Auto Peace/Ally rolls require Passage step 10 and unfinished step 11.');
   // Execute the very same validated commands as the manual workflow. A failed
   // sub-command aborts the whole atomic outer command; no partial save occurs.
   const pending=s.pieces.filter(p=>p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype)&&SPACE[p.location]&&!s.passagePeaceRolls?.[p.id]).map(p=>p.id);
   const choices=[];
   for(const pieceId of pending){
     const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
     Object.assign(s,perform(s,{type:'PASSAGE_PEACE_ROLL',pieceId,die:die.face}));
     choices.push(`${pieceId}: ${die.face}`);
   }
   Object.assign(s,perform(s,{type:'PASSAGE_FINISH_PEACE'}));
   message=`Automatic Passage step 11: digitally rolled ${pending.length} on-map Peace/Ally counters (${choices.join(', ')||'none'}), and completed step 11.`;
   break;
 }
 case 'PASSAGE_AUTO_BISON':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt11!=='done'||s.steps.pt12==='done')fail('Auto Bison replenishment requires completed step 11 and unfinished step 12.');
   const choices=[];
   // If the player already selected a territory, respect that pending selection.
   const required=s.passageBison?.required??(4-s.cards.filter(c=>c.kind==='Development'&&c.zone==='Display').length);
   if(required<1||required>4)fail('Invalid Development display; reconcile before automatic Bison replenishment.');
   for(let i=s.passageBison?.records.length??0;i<required;i++){
     if(!s.passageBison?.currentTerritory)Object.assign(s,perform(s,{type:'PASSAGE_BISON_SELECT'}));
     const territory=s.passageBison.currentTerritory;
     const slots=SPACES.filter(x=>x.type==='round'&&x.territory===territory);
     const empty=slots.filter(x=>!s.pieces.some(p=>p.location===x.id));
     const stock=s.pieces.filter(p=>p.type==='Bison'&&p.location==='reserve');
     const local=s.pieces.filter(p=>p.type==='Bison'&&slots.some(x=>x.id===p.location));
     const other=SPACES.filter(x=>x.type==='round'&&!s.pieces.some(p=>p.location===x.id));
     let action='none',bisonId=null,destination=null;
     if(empty.length&&stock.length){action='place';bisonId=stock[0].id;destination=empty[0].id;}
     else if(!empty.length&&local.length&&other.length){action='relocate';bisonId=local[0].id;destination=other[0].id;}
     // Placement destinations have no printed priority: pick a numbered empty
     // space deterministically. The territory draw itself is seeded and logged.
     Object.assign(s,perform(s,{type:'PASSAGE_BISON_RESOLVE',action,bisonId,destination}));
     choices.push(`${territory}: ${action}${destination?' '+destination:''}`);
   }
   Object.assign(s,perform(s,{type:'PASSAGE_FINISH_BISON'}));
   message=`Automatic Passage step 12: resolved ${choices.length} outstanding Bison attempt(s) (${choices.join('; ')||'none outstanding'}) and completed step 12.`;
   break;
 }
 case 'PASSAGE_PEACE_ROLL':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Peace/Ally renewal belongs to Passage of Time step 11.');
   if(s.steps.pt10!=='done'||s.steps.pt11==='done')fail('Complete Passage step 10 before step 11; step 11 cannot be repeated.');
   const p=item(s,command.pieceId);
   if(p.type!=='Instruction'||!['Peace','Ally'].includes(p.subtype)||!SPACE[p.location])fail('Choose an on-map Peace or Ally Instruction.');
   if(!ENEMY_COLUMNS.includes(p.owner))fail('Record the Peace/Ally Instruction owner first.');
   if(!Number.isInteger(p.strength)||p.strength<1||p.strength>9)fail('Record the printed Instruction AP cost before rolling.');
   s.passagePeaceRolls??={};
   if(s.passagePeaceRolls[p.id])fail('This Peace/Ally Instruction has already been rolled in step 11.');
   const die=bounded(command.die,1,6,'Peace/Ally die');
   const location=p.location, cost=p.strength;let returned=false,row=null;
   if(die>cost){
     row=DISPLAY_ROWS.find(x=>!s.pieces.some(q=>q!==p&&q.location===`enemy-display:${p.owner}:${x}`));
     if(!row)fail('No empty display slot for the returning Peace/Ally Instruction; reconcile display manually first.');
     p.location=`enemy-display:${p.owner}:${row}`;returned=true;
   }
   s.passagePeaceRolls[p.id]={die,cost,location,returned,row};
   message=`Passage step 11 (§4.4): ${named(p)} rolled ${die} against AP cost ${cost}; ${returned?'returned to '+p.owner+' column row '+row:'remains at '+location}.`;
   break;
 }
 case 'PASSAGE_FINISH_PEACE':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Peace/Ally renewal belongs to Passage of Time step 11.');
   if(s.steps.pt10!=='done'||s.steps.pt11==='done')fail('Complete Passage step 10 before finishing step 11.');
   const remaining=s.pieces.filter(p=>p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype)&&SPACE[p.location]&&!s.passagePeaceRolls?.[p.id]);
   if(remaining.length)fail(`Roll for all on-map Peace/Ally Instructions first: ${remaining.length} remaining.`);
   s.steps.pt11='done';message=`Passage step 11 (§4.4): resolved ${Object.keys(s.passagePeaceRolls||{}).length} Peace/Ally counter(s).`;
   break;
 }
 case 'PASSAGE_BISON_SELECT':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt11!=='done'||s.steps.pt12==='done')fail('Passage Bison replenishment requires completed step 11.');
   if(s.passageBison?.currentTerritory)fail('Resolve the already selected territory before drawing another.');
   if(!s.passageBison){
     const display=s.cards.filter(c=>c.kind==='Development'&&c.zone==='Display').length;
     if(display>3)fail('More than three Development cards in display; reconcile before Passage step 12.');
     s.passageBison={required:4-display,records:[],currentTerritory:null};
   }
   if(s.passageBison.records.length>=s.passageBison.required)fail('All required Bison replenishment attempts have already been resolved.');
   // Choose one of the six territories directly. No unverified printed die-face mapping is used.
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   s.passageBison.currentTerritory=TERRITORIES[roll.face-1][0];
   message=`Passage step 12 (§4.4): digital random territory ${TERRITORIES[roll.face-1][1]}; select an empty destination if possible.`;
   break;
 }
 case 'PASSAGE_BISON_RESOLVE':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt11!=='done'||s.steps.pt12==='done'||!s.passageBison?.currentTerritory)fail('Draw a Passage step 12 territory first.');
   const territory=s.passageBison.currentTerritory;
   const inTerritory=SPACES.filter(x=>x.type==='round'&&x.territory===territory);
   const empty=inTerritory.filter(x=>!s.pieces.some(p=>p.location===x.id));
   const stock=s.pieces.filter(p=>p.type==='Bison'&&p.location==='reserve');
   const bisonHere=s.pieces.filter(p=>p.type==='Bison'&&inTerritory.some(x=>x.id===p.location));
   const action=String(command.action||'');let bison=null,destination=null;
   if(empty.length&&stock.length){
     if(action!=='place')fail('An empty space and available Bison exist: place one Bison from stock.');
     bison=item(s,command.bisonId);
     if(bison.type!=='Bison'||bison.location!=='reserve')fail('Select an available Bison from stock.');
     destination=String(command.destination||'');
     if(!empty.some(x=>x.id===destination))fail('Destination must be empty and within the selected territory.');
     bison.location=destination;
   }else if(!empty.length&&bisonHere.length&&SPACES.some(x=>x.type==='round'&&!s.pieces.some(p=>p.location===x.id))){
     if(action!=='relocate')fail('No empty space in the selected territory: relocate one of its Bison.');
     bison=item(s,command.bisonId);
     if(bison.type!=='Bison'||!bisonHere.some(p=>p.id===bison.id))fail('Select a Bison already in the selected territory.');
     destination=String(command.destination||'');
     if(!SPACES.some(x=>x.id===destination&&x.type==='round')||s.pieces.some(p=>p.location===destination&&p.id!==bison.id))fail('Relocation destination must be an empty, non-Enemy map space.');
     bison.location=destination;
   }else{
     if(action!=='none')fail('No legal stock placement or relocation is available: record no effect.');
   }
   const record={territory,action,bisonId:bison?.id||null,destination};
   s.passageBison.records.push(record);s.passageBison.currentTerritory=null;
   message=`Passage step 12 (§4.4): ${territory} — ${action==='none'?'no effect':action+' '+named(bison)+' → '+destination}; ${s.passageBison.records.length}/${s.passageBison.required} attempts.`;
   break;
 }
 case 'PASSAGE_FINISH_BISON':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt11!=='done'||s.steps.pt12==='done')fail('Finish Passage Bison replenishment after step 11.');
   if(!s.passageBison||s.passageBison.currentTerritory||s.passageBison.records.length!==s.passageBison.required)fail('Resolve every required Bison attempt before completing step 12.');
   s.steps.pt12='done';message=`Passage step 12 (§4.4): completed ${s.passageBison.required} Bison replenishment attempt(s).`;break;
 }
 case 'CHECK':{
   if(s.phase==='execution'&&s.operation==='Passage of Time'&&['pt1','pt8','pt9','pt10','pt11','pt12','pt14','pt15'].includes(command.key))fail('Passage steps 1, 5–12, 14 and 15 must be resolved through their dedicated digital procedures.');
   const keys=checklist(s).map(x=>x[0]);if(!keys.includes(command.key))fail('That checkpoint is not in the current procedure.');
   if(!['done','na',''].includes(command.value))fail('Invalid checkpoint state.');
   if(s.phase==='war'&&['w1','w2'].includes(command.key)&&command.value==='na'&&s.pieces.some(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0))fail('Cannot skip mandatory War movement or attrition while War Columns are active. Use automatic resolution or document completion as done.');
   // Rule §2.1: procedure steps must complete in printed order.
   if(['war','cleanup'].includes(s.phase)&&['done','na'].includes(command.value)){
     const earlier=keys.slice(0,keys.indexOf(command.key));
     if(earlier.some(k=>!['done','na'].includes(s.steps[k])))fail('Complete preceding procedure steps in printed order (§2.1).');
   }
   if(s.phase==='cleanup'&&command.key==='cl1'&&['done','na'].includes(command.value)&&
      activeDevelopment(s,'44').some(c=>!(s.louisianaDoneIds||[]).includes(c.id)))fail('Resolve Louisiana Purchase during Cleanup Step 1.');
   if(s.phase==='cleanup'&&command.key==='cl1'&&['done','na'].includes(command.value)&&
      activeDevelopment(s,'60').some(c=>!(s.americanTradersDoneIds||[]).includes(c.id)))
      fail('Resolve American Traders during Cleanup Step 1.');
   if(s.phase==='cleanup'&&command.key==='cl1'&&['done','na'].includes(command.value)&&
      ['70','71'].flatMap(n=>activeDevelopment(s,n)).some(c=>!(s.buffaloDoneIds||[]).includes(c.id)))
      fail('Resolve each Buffalo Hunters card before completing Cleanup Step 1.');
   s.steps[command.key]=command.value;message=`Checkpoint ${command.key}: ${command.value||'unmarked'}.`;
   quality='manual';break;}
 case 'PASSAGE_FINISH':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Finish Passage of Time only during its execution phase.');
   if(s.passageResult||s.victoryPending)fail('Passage step 15 has already been resolved.');
   if(Array.from({length:14},(_,i)=>`pt${i+1}`).some(k=>!['done','na'].includes(s.steps[k])))fail('Finish or acknowledge Passage of Time steps 1–14 before step 15.');
   if(!command.ack)fail('Confirm that the printed Passage of Time and card effects were applied.');
   const old=s.tracks.passage, mandatory=Boolean(s.mustPassage);
   const die=(mandatory||old===0)?null:bounded(command.die,1,6,'Passage of Time die');
   // Physical Passage counter in Start cannot force the check, and does not require a die.
   const required=mandatory || (old>0 && die!==null&&die<=old);
   s.tracks.operations=0;s.steps.pt15='done';
   s.passageResult={period:s.period,markerBefore:old,mandatory,die,triggered:required};
   if(required){s.victoryPending={period:s.period,history:`H${s.period}`};message=`Passage of Time §4.4 step 15: required Victory Check for H${s.period}. Consult the printed History Card objective (§2.10).`;}
   else{s.tracks.passage=Math.min(20,old+1);s.mustPassage=false;message=`Passage of Time §4.4 step 15: no Victory Check; Passage marker ${old} → ${s.tracks.passage}. Move to Cleanup after confirming remaining rules.`;}
   quality='manual';break;
 }
 case 'RESOLVE_VICTORY':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||!s.victoryPending)fail('No required Victory Check is pending.');
   if(!command.ack||String(command.objectiveNote||'').trim().length<12)fail('Check the printed History Card objective and provide a verification note (at least 12 characters).');
   const met=command.met===true;
   const period=s.period;const last=finalPeriodForScenario(s.scenario);
   if(period>last)fail('Historical period exceeds the scenario ending period. Reconcile the physical setup.');
   if(!met){s.gameResult={outcome:'defeat',period,reason:'History Card objective not met',note:String(command.objectiveNote).slice(0,500)};s.phase='gameover';s.operation=null;s.activeBandId=null;s.tracks.movement=0;s.victoryPending=null;message=`GAME OVER: Historical Period ${period} objective not met (§2.10). Player defeat.`;}
   else if(period===last){
     let grade='victory';
     if(s.scenario==='campaign'){
       const reservation=s.pieces.filter(p=>p.type==='Rancheria'&&p.location==='RESERVATION').length;
       if(s.tracks.military>=2*reservation)grade='major victory';
       else if(s.tracks.military>reservation)grade='minor victory';
       else grade='minor defeat';
     }
     const won=grade!=='minor defeat';
     s.gameResult={outcome:won?'victory':'defeat',grade,period,reason:'Final scenario History Card objective resolved',note:String(command.objectiveNote).slice(0,500)};
     s.phase='gameover';s.operation=null;s.activeBandId=null;s.tracks.movement=0;s.victoryPending=null;
     message=`GAME OVER: ${grade.toUpperCase()} after period ${period} (§2.10 / scenario §9).`;
   }else{
     if(!command.transitionAck)fail('Confirm the old History Card/deck were removed, the next History Card was revealed, and its printed effects were resolved (§2.10 steps 2–4).');
     const nextPeriod=period+1;
     for(const c of s.cards){
       if(c.kind==='History'&&String(c.identifier).toUpperCase()===`H${period}`)c.zone='Removed';
       if(c.kind==='Development'&&c.zone==='Deck')c.zone='Removed';
       if(c.kind==='History'&&String(c.identifier).toUpperCase()===`H${nextPeriod}`)c.zone='In play';
     }
     s.period=nextPeriod;s.tracks.operations=0;s.tracks.passage=0;s.mustPassage=false;s.passageResult=null;s.victoryPending=null;
     s.phase='cleanup';s.steps={};s.operation=null;s.buffaloDoneIds=[];s.americanTradersDoneIds=[];s.louisianaDoneIds=[];
     message=`Period ${period} objective achieved. Transitioned to H${nextPeriod}; remove old History/deck and resolve new card effects on the physical board before Cleanup (§2.10).`;
   }
   quality='manual';break;
 }
 case 'SELECT_OPERATION':{
   if(s.phase!=='selection')fail('Select an Operation during Operation Selection only.');
   const op=command.value;if(!OPERATIONS.includes(op))fail('Unknown operation.');
   if(requiredPassage(s)&&op!=='Passage of Time')fail('Passage of Time is mandatory: no Bands in play, or the Operations marker requires it.');
   if(op==='Passage of Time'&&!requiredPassage(s)&&s.tracks.operations===0)fail('Voluntary Passage of Time requires Operations in a numbered space (§3.2.E).');
   s.operation=op;s.giftGivingUsed=false;s.developmentPlanningApplied=false;s.epidemicTakeActionsApplied=false;s.epidemicCompletedIds=[];s.passageRetiredIds=[];s.passageQuanahExemptId=null;s.passagePeaceRolls={};s.passageBison=null;s.passageResult=null;s.victoryPending=null;s.operationEvents={cultureGain:false,operationsRoll:false};message=`Selected ${op}.`;break;}
 case 'ADVANCE':{
   const next=safeNext(s);if(!next.ok)fail(next.message);
   if(s.phase==='war'){s.phase='selection';s.operation=null;}
   else if(s.phase==='selection'){if(requiredPassage(s)&&s.operation!=='Passage of Time')fail('Passage of Time is mandatory.');s.phase='execution';}
   else if(s.phase==='execution'){s.phase='cleanup';s.buffaloDoneIds=[];s.americanTradersDoneIds=[];s.louisianaDoneIds=[];}
   else if(s.phase==='cleanup'){
     // At the beginning of the next War Column Phase, §3.1 step 1 discards the old event.
     for(const c of s.cards.filter(c=>c.kind==='War'&&c.zone==='War Event'))c.zone='Discard';
     s.warEventResolved=null;s.warHigherStakesResolved=false;s.warMovementDrawn=null;
     s.phase='war';s.battleExemptions={};s.operation=null;s.activeBandId=null;s.tracks.movement=0;
     /* Finished states remain as recorded; physical rule cleanup controls the next reset. */}
   else fail('Cannot advance from this phase.');
   s.steps={};message=`Advanced to ${s.phase.toUpperCase()} phase.`;break;}
 case 'ACTIVATE_BAND':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Bands activate only during Take Actions.');
   if(s.activeBandId)fail('Finish the current active Band first.');
   const p=item(s,command.id);if(p.type!=='Band'||!isInPlay(p))fail('Select an in-play Band.');
   if(p.location.startsWith('box:'))fail('First deploy the Band to its Ranchería space using a recorded physical-board correction.');
   if(p.ratingConfirmed===false)fail('Confirm this Band’s printed movement rating in the piece editor before activation.');
   const mode=String(command.mode||'rancheria');
   if(mode==='ap'){
     if(s.tracks.ap<p.strength)fail(`Need ${p.strength} player AP to activate an outside Band.`);
     s.tracks.ap-=p.strength;
   }else if(mode==='rancheria'){
     if(p.finished)fail('A Finished Band may be reactivated by paying APs under step 4, not by this simplified Ranchería mode.');
     if(!command.ack)fail('Confirm this Band is eligible under Ranchería medicine-track procedure 4.1. This app cannot validate the exact activation order.');
   }else fail('Unknown activation mode.');
   p.finished=false;s.activeBandId=p.id;s.tracks.movement=p.mpRating+(cultureActive(s,'C03')&&held(s,p.id,'Horse').length?2:0);
   message=`Activated ${named(p)}: ${p.mpRating} movement points (${mode==='ap'?'spent '+p.strength+' AP':'medicine prerequisites acknowledged'}).`;
   quality=mode==='ap'?'verified':'manual';break;}
 case 'DEVELOPMENT_QUALITY_MOUNTS':{
  if(s.phase!=='execution'||s.operation!=='Take Actions'||!activeBand(s))fail('Quality Mounts can be used only during the current active Band activation.');
  const c=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='16'&&c.zone==='Hand');
  if(!c)fail('Quality Mounts must be held in hand.');
  if(s.qualityMounts&&s.qualityMounts.bandId===s.activeBandId)fail('Quality Mounts already granted bonus MPs to this active Band.');
  const bonus=bounded(command.bonus,1,6,'Quality Mounts bonus MP');
  if(s.tracks.movement+bonus>20)fail('Cannot represent Quality Mounts movement above the recorded MP track maximum; resolve manually.');
  s.tracks.movement+=bonus;s.qualityMounts={cardId:c.id,bandId:s.activeBandId,bonus};
  message=`Quality Mounts: Band ${s.activeBandId} gained ${bonus} MP; roll at Finish Band to check card discard.`;break;
 }
 case 'FINISH_BAND':{
   const p=activeBand(s);if(!p)fail('No Band currently active.');p.finished=true;
   if(s.qualityMounts?.bandId===p.id){
     const used=s.qualityMounts;
     const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
     if(die.face<=used.bonus){const c=s.cards.find(c=>c.id===used.cardId);if(c?.zone==='Hand')c.zone='Discard';}
     message=`Quality Mounts finish check: die ${die.face}, bonus ${used.bonus}, ${die.face<=used.bonus?'card discarded':'card retained'}. `;
     s.qualityMounts=null;
   }
   s.activeBandId=null;s.tracks.movement=0;s.greatHuntBandId=null;
   if(s.comancheMoon?.bandId===p.id)s.comancheMoon=null;
   const options=warCountermeasureOptions(s,p.id);
   if(options.length){s.countermeasureWindow={cardId:String(activeWarCard(s)?.identifier).toUpperCase(),bandId:p.id};
     message+=`Finished ${named(p)}. Resolve or decline the printed War countermeasure before continuing.`;
   }else message+=`Finished ${named(p)}.`;
   break;}
 case 'SPEND_HORSE':{
   const p=activeBand(s);if(!p)fail('No active Band.');
   const horse=held(s,p.id,'Horse')[0];if(!horse)fail('Band possesses no Horse counters.');
   horse.location='reserve';s.tracks.movement+=1;
   message=`Spent a Horse to grant ${named(p)} +1 movement point (4.1.1.C).`;break;}
 case 'MOVE_BAND':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Band movement requires Take Actions.');
   const p=activeBand(s);if(!p)fail('Activate a Band first.');
   if(!SPACE[p.location]||!SPACE[command.to])fail('Band and destination must be board spaces.');
   const edge=s.edges.find(e=>e.a===p.location&&e.b===command.to||e.b===p.location&&e.a===command.to);
   if(!edge)fail('Connection not yet recorded. Check the LINE on your printed board, then add it in Board → Connections. No unverified move is accepted.');
   if(p.location===command.to)fail('Cannot move to current space.');
   const cost=held(s,p.id,'Horse').length?1:2;
   if(s.tracks.movement<cost)fail(`Need ${cost} movement points; only ${s.tracks.movement} remain.`);
   const from=p.location;p.location=command.to;s.tracks.movement-=cost;
   message=`Moved ${named(p)} ${from} → ${command.to}, cost ${cost} movement point(s) via player-confirmed ${edge.kind} connection (5.2.2).`;
   quality='manual';break;}
 case 'HUNT':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Hunt requires Take Actions.');
   const p=activeBand(s);if(!p)fail('Activate a Band first.');
   const cost=s.greatHuntBandId===p.id?1:held(s,p.id).some(x=>x.type==='Mahimiana')?2:3;
   if(s.tracks.movement<cost)fail(`Hunt costs ${cost} movement points; only ${s.tracks.movement} remain.`);
   const b=s.pieces.find(x=>x.type==='Bison'&&x.location===p.location);
   if(!b)fail('No Bison counter at the Band’s location.');
   b.location=`held:${p.id}`;s.tracks.movement-=cost;
   message=`${named(p)} hunted at ${p.location}: gained Bison, spent ${cost} movement points (5.2.1).`;break;}
 case 'DEVELOPMENT_MOON_PREPARE':{
  if(s.phase!=='execution'||s.operation!=='Take Actions'||!activeBand(s)||s.pending||s.successCheck||s.comancheMoon)fail('Comanche Moon must be prepared once before a Raid by an active Band.');
  const c=s.cards.find(c=>c.kind==='Development'&&['39','40','59'].includes(devNumber(c))&&c.zone==='Hand'&&(!command.cardId||c.id===command.cardId));
  if(!c)fail('Comanche Moon must be held in hand.');
  s.comancheMoon={cardId:c.id,bandId:s.activeBandId};message=`Comanche Moon #${devNumber(c)} prepared for this Band’s next Raid; fixed rewards will apply.`;break;
 }
 case 'BEGIN_RAID':{
   if(activeDevelopment(s,'20').length&&activeBand(s)?.location==='W')fail('Taos Pueblo Trade (#20) prohibits Raids in the West square Enemy Space.');
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Raid requires Take Actions.');
   const p=activeBand(s);if(!p)fail('Activate a Band first.');
   if(s.tracks.movement<1)fail('Need 1 movement point for Raid.');
   if(!SPACE[p.location])fail('Band is not on the board.');
   if(SPACE[p.location].type!=='enemy'&&!isPeace(s,p.location))fail('Raid target must be an Enemy Space or Peace Space (5.2.3).');
   s.tracks.movement--;s.lastSuccessCheck=null;
   const moon=s.comancheMoon?.bandId===p.id?s.comancheMoon.cardId:null;
   s.pending={type:'raid',bandId:p.id,space:p.location,peace:isPeace(s,p.location),moonCardId:moon};s.comancheMoon=null;
   message=`Raid initiated at ${p.location}; 1 movement point spent. Success Check and effects REQUIRED.`;break;}
 case 'DEVELOPMENT_PLAY_SKILLFUL':{
   if(!s.pending||s.pending.type!=='raid'||s.successCheck||s.lastSuccessCheck)fail('Skillful Warriors replaces a pending Raid Success Check before drawing counters.');
   const c=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='32'&&c.zone==='Hand');
   if(!c)fail('Skillful Warriors must be held in hand to substitute for a Success Check.');
   s.lastSuccessCheck={bandId:s.pending.bandId,successes:1,enemyAPs:0,instructions:0,expected:0,card:'32'};
   c.zone='Discard';message='Skillful Warriors: replaced Raid Success Check with exactly one Success; no counters drawn, no Medicine impact.';break;
 }
 case 'DEVELOPMENT_TACTICAL':{
   const sc=s.successCheck;if(!sc||sc.drawIds.length||sc.tacticalAttempted)fail('Tactical Advantage can be attempted only once at the beginning of a Success Check, before counters are drawn.');
   const c=s.cards.find(c=>c.kind==='Development'&&['17','42'].includes(devNumber(c))&&c.zone==='Hand'&&(!command.cardId||c.id===command.cardId));
   if(!c)fail('A printed Tactical Advantage (#17 or #42) must be held in hand.');
   const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
   sc.tacticalAttempted=true;sc.tacticalDie=die.face;sc.tacticalCard=c.id;
   if(die.face<=2){c.zone='Discard';sc.tacticalSuccess=0;sc.tacticalReturnAP=false;}
   else{sc.tacticalSuccess=1;sc.tacticalReturnAP=die.face>=5;}
   message=`Tactical Advantage #${devNumber(c)}: digital die ${die.face}; ${die.face<=2?'card discarded':die.face<=4?'one Success with no Medicine impact':'one Success and a random drawn Enemy AP counter returned to cup, if present'}.`;break;
 }
 case 'START_SUCCESS_CHECK':{
   if(!s.pending||s.pending.type!=='raid')fail('Start a guided Success Check during a pending Raid.');
   if(s.successCheck)fail('A Success Check is already in progress.');
   const band=item(s,s.pending.bandId);
   const mahimiana=s.pieces.find(p=>p.type==='Mahimiana'&&p.location===`held:${band.id}`);
   let bonus=0,medicine=null,die=null;
   if(mahimiana){
     medicine=bounded(command.medicine,0,9,'Mahimiana medicine');
     if(command.digitalDie===true){
       const next=rollSeededDie(s.rng.seed);s.rng.seed=next.seed;s.rng.rolls++;die=next.face;
     }else die=bounded(command.die,1,6,'Mahimiana die');
     bonus=die<=Math.floor(medicine/2)?2:die<=medicine?1:0;
     if(!command.ack&&command.digitalDie!==true)fail('Verify Mahimiana medicine and bonus die on the physical board.');
   }
   const shieldBonus=s.cards.some(c=>c.kind==='Development'&&devNumber(c)==='36'&&c.zone==='Hand')?1:0;
   s.successCheck={bandId:band.id,mahimianaId:mahimiana?.id||null,expected:band.strength+bonus+shieldBonus,base:band.strength,bonus,shieldBonus,medicine,die,drawIds:[],canceledDrawIds:[],gunAttempts:[],redraws:0};
   message=`Success Check started: Band Strength ${band.strength}${mahimiana?`, Mahimiana bonus ${bonus} (medicine ${medicine}, ${command.digitalDie===true?'digital':'physical'} die ${die})`:''}; draw ${s.successCheck.expected} counters from the digital cup or record physical draws (2.9.2).`;
   quality=command.digitalDie===true?'verified':'manual';break;}
 case 'RECORD_SUCCESS_DRAW':{
   const sc=s.successCheck;if(!sc)fail('Start a guided Success Check first.');
   if(sc.drawIds.length>=sc.expected)fail('All required counters are already recorded.');
   const p=item(s,command.id);
   if(p.location!=='cup')fail('Selected counter is not in the Success Check cup.');
   if(!((p.type==='Marker' && /^(Success|Enemy AP [234])$/.test(p.subtype))||p.type==='Instruction'))fail('The cup draw must be a Success, Enemy AP or Instruction counter.');
   p.location='check-draw';sc.drawIds.push(p.id);
   message=`Physical cup draw ${sc.drawIds.length}/${sc.expected}: ${named(p)}. Result is staged until check completed.`;
   quality='manual';break;}
 case 'GUNS_CANCEL_AP':{
   const sc=s.successCheck;
   if(!sc||sc.drawIds.length!==sc.expected)fail('Finish recording all physical cup draws before attempting Guns cancellation.');
   const ap=item(s,command.counterId),gun=item(s,command.gunId);
   if(!sc.drawIds.includes(ap.id)||ap.location!=='check-draw'||!/^Enemy AP [234]$/.test(ap.subtype))fail('Select an uncancelled Enemy AP counter drawn in this check.');
   if(sc.gunAttempts.some(x=>x.counterId===ap.id))fail('That Enemy AP counter already had a Guns attempt; do not retry the same counter.');
   if(gun.type!=='Resource'||gun.subtype!=='Guns'||gun.location!==`held:${sc.bandId}`)fail('Select a Guns counter possessed by the checking Band.');
   let face;
   if(command.digitalDie===true){const next=rollSeededDie(s.rng.seed);s.rng.seed=next.seed;s.rng.rolls++;face=next.face;}
   else face=bounded(command.die,1,6,'Guns die');
   const needed=Number(ap.subtype.slice(-1));
   const canceled=face>=needed;
   if(canceled){ap.location='cup';sc.canceledDrawIds.push(ap.id);}
   else gun.location='reserve';
   sc.gunAttempts.push({counterId:ap.id,gunId:gun.id,die:face,needed,canceled});
   message=`Guns cancellation (§2.7.2.D): ${command.digitalDie===true?'digital':'physical'} roll ${face} against Enemy AP ${needed}; ${canceled?'counter returned to cup':'Guns spent; Enemy AP remains drawn'}.`;
   quality=command.digitalDie===true?'verified':'manual';break;}
 case 'TRADE_GOODS_REDRAW':{
   const sc=s.successCheck;
   if(!sc||sc.drawIds.length!==sc.expected)fail('Record the entire physical draw before using Trade Goods to redraw.');
   const good=item(s,command.resourceId);
   if(good.type!=='Resource'||good.subtype!=='Trade Goods'||good.location!==`held:${sc.bandId}`)fail('Select a Trade Goods counter possessed by the checking Band.');
   if(!command.ack&&command.digital!==true)fail('Confirm all counters from the prior draw were physically returned to the cup.');
   good.location='reserve';
   for(const id of sc.drawIds){const counter=item(s,id);if(counter.location==='check-draw')counter.location='cup';}
   sc.drawIds=[];sc.canceledDrawIds=[];sc.gunAttempts=[];sc.redraws++;
   message=`Spent possessed Trade Goods for Success Check redraw (§2.7.2.F). All staged counters returned to the recorded cup; draw ${sc.expected} again. Guns previously spent remain spent.`;
   quality=command.digital===true?'verified':'manual';break;}
 case 'CANCEL_SUCCESS_CHECK':{
   const sc=s.successCheck;if(!sc)fail('No guided Success Check to cancel.');
   if(sc.gunAttempts.length||sc.redraws||sc.tacticalAttempted)fail('Guns/Trade Goods/Tactical Advantage already changed the physical board. Use Undo to reverse those actions before cancelling.');
   for(const id of sc.drawIds)item(s,id).location='cup';
   s.successCheck=null;
   message='Cancelled Success Check; staged counters restored to cup ledger. Return drawn pieces to physical cup.';
   quality='manual';break;}
 case 'FINISH_SUCCESS_CHECK':{
   const sc=s.successCheck;if(!sc)fail('No guided Success Check to finish.');
   if(sc.drawIds.length!==sc.expected)fail(`Record all ${sc.expected} drawn counters first (${sc.drawIds.length} entered).`);
   const drawn=sc.drawIds.filter(id=>!sc.canceledDrawIds.includes(id)).map(id=>item(s,id));
   const successes=drawn.filter(p=>p.subtype==='Success');
   const aps=drawn.filter(p=>/^Enemy AP [234]$/.test(p.subtype));
   const enemyAPPoints=aps.reduce((n,p)=>n+Number(p.subtype.at(-1)),0);
   if(sc.tacticalReturnAP&&aps.length){const removed=seededSelect(s,aps);removed.location='cup';aps.splice(aps.indexOf(removed),1);}
   const instructions=drawn.filter(p=>p.type==='Instruction');
   if(instructions.length && (!command.ack||String(command.instructionNote||'').trim().length<8))fail('Resolve every drawn Enemy Instruction physically and record an explanation (at least 8 characters) before completing.');
   for(const p of successes)p.location=sc.mahimianaId?`medicine:${sc.mahimianaId}`:'success-out';
   for(const p of aps)p.location='available-enemy-aps';
   if(enemyAPPoints>=6){for(const c of s.cards.filter(c=>c.kind==='Development'&&devNumber(c)==='36'&&c.zone==='Hand'))c.zone='Discard';}
   for(const p of instructions)p.location='enemy-resolution';
   if(activeDevelopment(s,'65').length&&successes.length+(sc.tacticalSuccess||0)===0&&s.pending?.type==='raid'&&
      s.pieces.some(p=>p.type==='Settlement'&&p.location===s.pending.space)){
      const band=item(s,sc.bandId);
      if(band.strength===1&&s.pieces.some(p=>p.location===`held:${band.id}`))fail('Texas Rangers would remove a Band possessing counters; reconcile printed resource/Headman consequences.');
      reduceBandForCard(s,band);
   }
   s.lastSuccessCheck={bandId:sc.bandId,successes:successes.length+(sc.tacticalSuccess||0),enemyAPs:aps.length,instructions:instructions.length,expected:sc.expected};
   s.successCheck=null;
   message=`Success Check complete: ${successes.length+(sc.tacticalSuccess||0)} Success, ${aps.length} Enemy AP, ${instructions.length} Instruction; ${sc.canceledDrawIds.length} AP canceled with Guns; ${sc.redraws} Trade Goods redraw(s) from ${sc.expected} final physical draws. ${sc.mahimianaId?'Success counters assigned to Mahimiana medicine track':'Success counters sent Out of Play'}. Enemy APs moved to Available Enemy APs; ${instructions.length?'reconcile drawn Instructions with board after Raid.':''} ${String(command.instructionNote||'').slice(0,180)}`;
   quality='manual';break;}
 case 'CANCEL_RAID':{
   if(!s.pending||s.pending.type!=='raid')fail('No Raid to cancel.');
   if(s.lastSuccessCheck?.bandId===s.pending.bandId)fail('A physical Success Check has already been resolved. Use Undo instead of cancelling the Raid.');
   s.tracks.movement++;s.pending=null;message='Raid cancelled; 1 movement point returned; any prepared Comanche Moon remains in hand.';break;}
 case 'RESOLVE_RAID':{
   const pending=s.pending;if(!pending||pending.type!=='raid')fail('No Raid awaiting resolution.');
   const successes=bounded(command.successes,0,20,'Successes');
   if(s.lastSuccessCheck?.bandId===pending.bandId && successes!==s.lastSuccessCheck.successes)fail(`Guided Success Check recorded ${s.lastSuccessCheck.successes} successes; the Raid result must match.`);
   const horses=bounded(command.horses,0,successes,'Horse rewards');
   const band=item(s,pending.bandId);
   if(successes && !command.ack)fail('Confirm you performed the physical Success Check and all required Peace rolls, if any.');
   if(pending.moonCardId){
     if(!command.ack)fail('Confirm the printed Comanche Moon Raid result, even with zero Successes.');
     const c=s.cards.find(c=>c.id===pending.moonCardId&&c.kind==='Development'&&c.zone==='Hand');
     if(!c||!['39','40','59'].includes(devNumber(c)))fail('Prepared Comanche Moon is no longer held.');
     const horse=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location==='reserve');
     const captive=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Captives'&&p.location==='reserve');
     if(!horse||!captive)fail('Comanche Moon requires an available Horse and Captives counter from stock.');
     if(command.keepMoon&&s.tracks.ap<1)fail('Returning Comanche Moon to hand costs 1 AP.');
     horse.location=`held:${band.id}`;captive.location=`held:${band.id}`;
     if(command.keepMoon)s.tracks.ap--;else c.zone='Discard';
   }else{
   for(let i=0;i<horses;i++)createPiece(s,{type:'Resource',subtype:'Horse',label:'Horse',location:`held:${band.id}`,owner:'Comanche'});
   for(let i=horses;i<successes;i++)createPiece(s,{type:'Resource',subtype:'Captives',label:'Captives',location:`held:${band.id}`,owner:'Comanche'});
   }
   if(successes)createPiece(s,{type:'Marker',subtype:'Ravaged',label:'Ravaged',location:pending.space,owner:'Enemy'});
   if(successes>0&&activeDevelopment(s,'73').length){
     const stock=s.pieces.find(p=>p.type==='Bison'&&p.location==='reserve');
     if(!stock)fail('Texas Beef bonus requires an available physical Bison counter in stock.');
     stock.location=`held:${band.id}`;
   }
   if(activeDevelopment(s,'62').length){
    const captives=pending.moonCardId?1:successes-horses;
    s.tracks.culture=Math.min(9,s.tracks.culture+captives*activeDevelopment(s,'62').length);
   }
   s.pending=null;s.lastSuccessCheck=null;message=`Raid resolved with ${successes} Successes; ${pending.moonCardId?'Comanche Moon fixed 1 Horse and 1 Captives':`${horses} Horse, ${successes-horses} Captives`}. Peace result must be entered manually if applicable.`;
   quality='manual';break;}
 case 'TRADE':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Trade requires Take Actions.');
   const p=activeBand(s);if(!p||!SPACE[p.location])fail('Activate a Band on the map first.');
   const louisianaGoods=activeDevelopment(s,'44').length? s.pieces.find(x=>x.type==='Resource'&&x.subtype==='Trade Goods'&&x.location===p.location&&SPACE[p.location]?.type==='round'):null;
   if(!louisianaGoods&&SPACE[p.location].type!=='enemy'&&!peaceSpaceStatus(s,p.location).peace)fail('Trade only in Enemy Spaces or Peace Spaces (except Louisiana Purchase Trade Goods spaces).');
   if(louisianaGoods&&command.receive!=='Trade Goods')fail('Louisiana Purchase lets this Band acquire the existing Trade Goods counter only.');
   const westTarget=p.location==='W'||s.pieces.some(q=>q.type==='Settlement'&&q.location===p.location&&directionForOwner(q.owner)==='West');
   if(westTarget&&activeDevelopment(s,'07').length&&activeDevelopment(s,'20').length)fail('Both Spanish Trade Embargo and Taos Pueblo Trade are in play. Verify card precedence before trading in West.');
   if(westTarget&&activeDevelopment(s,'07').length)fail('Spanish Trade Embargo (#07) prohibits Trade in West square and West Settlements.');
   if(hasRavaged(s,p.location))fail('Trade target is Ravaged.');
   const enemyKey=p.location==='W'?'W':p.location==='S'?'S':p.location.startsWith('E')?'E':null;
   if(enemyKey&&s.pieces.some(x=>x.subtype==='Ravaged'&&x.location!==p.location&&
      (enemyKey==='E'?['E1','E2'].includes(x.location):x.location===enemyKey)))fail('A Ravaged counter in another Enemy Space belonging to this enemy prohibits Trade.');
   const give=item(s,command.resourceId);
   if(give.location!==`held:${p.id}`||!['Bison','Captives','Horse'].includes(give.subtype==='Bison'?'Bison':give.type==='Bison'?'Bison':give.subtype))
     fail('Choose a possessed Bison, Captives or Horse counter.');
   if(!['Food','Trade Goods'].includes(command.receive))fail('Trade may receive Food or Trade Goods only.');
   if(s.tracks.movement<1)fail('Trade costs 1 movement point.');
   const apCost=louisianaGoods?0:!(peaceSpaceStatus(s,p.location).peace||p.location==='W'&&activeDevelopment(s,'20').length)&&give.subtype!=='Captives'?1:0;
   if(s.tracks.ap<apCost)fail('Trade requires 1 player AP for a non-Captives counter outside a Peace Space.');
   s.tracks.ap-=apCost;s.tracks.movement--;
   give.location='reserve';if(louisianaGoods)louisianaGoods.location=`held:${p.id}`;else createPiece(s,{type:'Resource',subtype:command.receive,label:command.receive,location:`held:${p.id}`});
   if(peaceSpaceStatus(s,p.location).peace&&cultureActive(s,'C11'))s.tracks.culture=Math.min(9,s.tracks.culture+1);
   message=`Trade: spent ${give.type==='Bison'?'Bison':give.subtype} for ${command.receive}; -1 movement${apCost?', -1 AP':''} (5.2.4). Trade level 3 bonus applied only in Peace Spaces when active.`;break;}
 case 'DEVELOPMENT_AUTO_REVEAL':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time')fail('Development cards are revealed during Passage of Time only.');
   const floor=(s.period-1)*21+1,ceil=s.period*21;
   const draw=s.cards.filter(c=>c.kind==='Development'&&c.zone==='Deck'&&Number(c.identifier)>=floor&&Number(c.identifier)<=ceil);
   if(!draw.length)fail(`Historical period ${s.period} has no remaining Development cards in its recorded deck.`);
   const shown=s.cards.filter(c=>c.kind==='Development'&&['Display','In play'].includes(c.zone)&&Number(c.identifier)>=floor&&Number(c.identifier)<=ceil);
   if(shown.length>=3)fail('The three Development display positions are occupied; resolve Passage step 13 discard rules first.');
   if(new Set(draw.map(c=>Number(c.identifier))).size!==draw.length)fail('Duplicate printed Development identifiers in deck; correct the card inventory.');
   const c=seededSelect(s,draw);c.zone='In play';
   message=`Digitally drew Development #${devNumber(c)} from the period ${s.period} deck. `+revealDevelopmentEffect(s,c);break;
 }
 case 'DEVELOPMENT_EPIDEMIC_END':{
  if(s.phase!=='execution'||s.operation!=='Take Actions'||!activeRecurringDisease(s).length)fail('An in-play epidemic/Smallpox card is required at the end of Take Actions.');
  if(s.activeBandId||s.pending||s.successCheck||!allChecksDone(s))fail('Finish all Take Actions steps and pending checks before resolving end-of-operation Epidemic.');
  const next=activeRecurringDisease(s).find(c=>!(s.epidemicCompletedIds||[]).includes(c.id));
  if(!next)fail('All recurring epidemic/Smallpox cards already resolved this Take Actions operation.');
  if(devNumber(next)==='64')message=startSmallpoxEnd(s,next);
  else message=initiateEpidemic(s,next,'end-take-actions');
  break;
 }
 case 'DEVELOPMENT_RESOLVE_EPIDEMIC':{
  const pending=s.developmentPending;
  if(!pending||!EPIDEMIC_IDS.includes(pending.number)||pending.kind!=='epidemic')fail('There is no pending Epidemic Band choice to resolve digitally.');
  const choices=command.bandChoices||{};
  if(!choices||typeof choices!=='object'||Array.isArray(choices))fail('Band choices must map selected spaces to Band IDs.');
  const result=applyEpidemic(s,pending.spaces,choices,pending.phase);
  if(pending.phase==='end-take-actions')markRecurringDisease(s,pending.cardId);
  s.developmentPending=null;
  message=`Epidemic ${pending.phase}: selected ${pending.spaces.join(', ')}; reduced ${result.bands} Band(s), removed ${result.tribes} Tribe(s).`;break;
 }
 case 'DEVELOPMENT_LOUISIANA_CLEANUP':{
  if(s.phase!=='cleanup'||s.steps?.cl1)fail('Louisiana Purchase must be resolved during Cleanup step 1.');
  const c=activeDevelopment(s,'44').find(c=>!(s.louisianaDoneIds||[]).includes(c.id));
  if(!c)fail('No unprocessed Louisiana Purchase card in play.');
  // Printed two-die map-space selection: six territories and six round spaces each.
  const target=seededSelect(s,SPACES.filter(x=>x.type==='round'));
  const occupied=s.pieces.some(p=>p.location===target.id);
  const stock=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location==='reserve');
  if(!occupied&&stock)stock.location=target.id;
  s.louisianaDoneIds=[...(s.louisianaDoneIds||[]),c.id];
  message=`Louisiana Purchase: random ${target.id}; ${occupied?'occupied, no placement':stock?'placed available physical Trade Goods':'no Trade Goods counter in stock'}.`;break;
 }
 case 'DEVELOPMENT_AMERICAN_TRADERS_CLEANUP':{
  if(s.phase!=='cleanup'||s.steps.cl1)fail('American Traders must resolve during Cleanup step 1.');
  const c=activeDevelopment(s,'60').find(c=>!(s.americanTradersDoneIds||[]).includes(c.id));
  if(!c)fail('No unprocessed American Traders card in play.');
  message=applyAmericanTraders(s);s.americanTradersDoneIds=[...(s.americanTradersDoneIds||[]),c.id];break;
 }
 case 'DEVELOPMENT_GIFT_GIVING':{
  if(s.phase!=='execution'||s.operation!=='Planning'||!activeDevelopment(s,'56').length)fail('Gift Giving is an in-play Development Headman Action during Planning only.');
  if(s.giftGivingUsed)fail('Gift Giving already used this Planning operation; additional Paraibo eligibility has not been verified.');
  if(s.tracks.ap<1)fail('Gift Giving costs 1 player AP.');
  const ranch=s.pieces.find(p=>p.id===command.rancheriaId&&p.type==='Rancheria'&&SPACE[p.location]);
  if(!ranch)fail('Choose an in-play Ranchería Resources box.');
  const goods=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location==='reserve');
  if(!goods)fail('Gift Giving requires an available physical Trade Goods counter.');
  s.tracks.ap--;goods.location=`box:${ranch.id}`;s.giftGivingUsed=true;
  message=`Gift Giving: spent 1 AP and placed Trade Goods in ${ranch.label||ranch.id} Resources.`;break;
 }
 case 'DEVELOPMENT_BUFFALO_START':{
  if(s.phase!=='cleanup'||s.steps.cl1)fail('Buffalo Hunters must resolve during Cleanup step 1.');
  const card=['70','71'].flatMap(n=>activeDevelopment(s,n)).find(c=>!(s.buffaloDoneIds||[]).includes(c.id));
  if(!card)fail('No outstanding Buffalo Hunters cleanup effect.');
  const territory=seededSelect(s,TERRITORIES)[0];
  const bison=s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.territory===territory);
  if(!bison.length){s.buffaloDoneIds=[...(s.buffaloDoneIds||[]),card.id];message=`Buffalo Hunters #${devNumber(card)}: randomly selected ${territory}; no Bison in Territory.`;break;}
  s.developmentPending={cardId:card.id,number:devNumber(card),kind:'buffalo-hunters',territory,bisonIds:bison.map(p=>p.id),reason:'Choose one Bison counter in the selected Territory to remove.'};
  message=`Buffalo Hunters: selected ${territory}; select one of ${bison.length} Bison to remove.`;break;
 }
 case 'DEVELOPMENT_BUFFALO_RESOLVE':{
  const pending=s.developmentPending;
  if(!pending||pending.kind!=='buffalo-hunters')fail('No pending Buffalo Hunters cleanup selection.');
  const bison=item(s,String(command.bisonId||''));
  if(bison.type!=='Bison'||!pending.bisonIds.includes(bison.id)||SPACE[bison.location]?.territory!==pending.territory)fail('Choose a Bison in the selected Territory.');
  bison.location='reserve';s.buffaloDoneIds=[...(s.buffaloDoneIds||[]),pending.cardId];s.developmentPending=null;
  message=`Buffalo Hunters #${pending.number}: returned ${bison.id} from ${pending.territory} to stock.`;break;
 }
 case 'DEVELOPMENT_RESOLVE_KIOWA':{
  const pending=s.developmentPending;
  if(!pending||pending.kind!=='kiowa-alliance'||pending.number!=='53')fail('No Kiowa Alliance reveal is pending.');
  const tribe=s.pieces.find(p=>p.id===command.tribeId&&pending.tribeIds.includes(p.id)&&p.type==='Tribe'&&SPACE[p.location]?.type==='round');
  const ranch=s.pieces.find(p=>p.id===command.rancheriaId&&p.type==='Rancheria'&&p.location===`box:${p.id}`);
  const band=s.pieces.find(p=>p.id===command.bandId&&p.type==='Band'&&p.location==='reserve'&&[1,2].includes(p.strength));
  const horseIds=Array.isArray(command.horseIds)?command.horseIds.map(String):[];
  if(!tribe||!ranch||!band||horseIds.length>2||new Set(horseIds).size!==horseIds.length)fail('Choose an eligible Tribe, available Ranchería, strength-1/2 Band and at most two different Horse counters.');
  const horses=horseIds.map(id=>s.pieces.find(p=>p.id===id&&p.type==='Resource'&&p.subtype==='Horse'&&p.location==='reserve'));
  if(horses.some(p=>!p))fail('Kiowa Alliance Horses must exist in available physical stock.');
  const related=type=>s.pieces.filter(p=>p.type===type&&p.location!=='removed'&&(
   p.affiliatedRancheriaId===ranch.id||p.location===`box:${ranch.id}`||
   String(p.subtype||'').trim().toUpperCase()===String(ranch.subtype||'').trim().toUpperCase()&&Boolean(ranch.subtype)));
  const chiefs=related('Mahimiana'),parai=related('Paraibo');
  if(chiefs.length!==1||parai.length!==1)fail('Kiowa Alliance needs exactly one identifiable Mahimiana and Paraibo belonging to the selected Ranchería.');
  if(SPACE[tribe.location]?.type!=='round'||s.pieces.some(p=>p!==tribe&&p.location===tribe.location&&['Rancheria','Band','Settlement'].includes(p.type)))fail('The selected Tribe space has a stacking conflict.');
  const location=tribe.location;tribe.location='reserve';
  ranch.location=location;band.location=`box:${ranch.id}`;
  for(const p of s.pieces.filter(p=>p.type==='Bison'&&p.location===location))p.location='reserve';
  for(const h of horses)h.location=`box:${ranch.id}`;
  chiefs[0].medicine=2;parai[0].medicine=2;
  if(s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).length===1&&s.medicine){s.medicine.mahimiana=2;s.medicine.paraibo=2;}
  s.developmentPending=null;
  message=`Kiowa Alliance #53: removed Tribe from ${location}, placed ${ranch.id} with ${band.id} and ${horses.length} Horse(s), and set both headmen Medicine to 2.`;break;
 }
 case 'DEVELOPMENT_RESOLVE_MEDICINE':{
  const pending=s.developmentPending;
  if(!pending||!['cuerno-medicine','quanah-medicine'].includes(pending.kind))fail('No Development Medicine choice is pending.');
  const chief=s.pieces.find(p=>p.id===String(command.mahimianaId||'')&&p.type==='Mahimiana'&&pending.chiefIds.includes(p.id));
  if(!chief)fail('Choose the Mahimiana identified by this card.');
  const before=medicineValue(s,chief);
  if(before===null)fail('Record the authentic Mahimiana Medicine rating before resolving this card.');
  const updated=pending.number==='29'?6:Math.min(6,before+3);
  setMedicine(s,chief,updated);s.developmentPending=null;
  message=`Development #${pending.number}: ${chief.id} Medicine ${before}→${updated}.`;break;
 }
 case 'DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT':{
  const pending=s.developmentPending;
  if(!pending||pending.kind!=='ute-displacement'||pending.number!=='19')fail('No End of Ute Alliance Ranchería displacement is pending.');
  const destination=String(command.space||'');
  if(!pending.destinations.includes(destination)||SPACE[destination]?.territory!=='UA')fail('Choose a recorded legal Upper Arkansas destination.');
  if(s.pieces.some(p=>p.location===destination&&['Rancheria','Band','Tribe','Settlement'].includes(p.type)))fail('Destination is no longer a legal stacking space.');
  const ranch=s.pieces.find(p=>p.id===pending.rancheriaId&&p.type==='Rancheria'&&p.location==='UA-1');
  const tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location==='reserve');
  if(!ranch||!tribe)fail('Ranchería or available physical Tribe changed before displacement.');
  ranch.location=destination;
  for(const bison of s.pieces.filter(p=>p.type==='Bison'&&p.location==='UA-1'))bison.location='reserve';
  tribe.location='UA-1';s.developmentPending=null;
  message=`End of Ute Alliance: moved Ranchería ${ranch.id} to ${destination}; placed Tribe ${tribe.id} at UA-1.`;break;
 }
 case 'DEVELOPMENT_NUEVO_APACHERIA':{
  const pending=s.developmentPending;
  if(!pending||pending.kind!=='nuevo-apacheria')fail('No pending Nuevo Apachería Tribe relocation.');
  const tribe=s.pieces.find(p=>p.id===command.tribeId&&p.type==='Tribe'&&SPACE[p.location]);
  const dest=String(command.space||'');
  if(!tribe||SPACE[dest]?.territory!=='RG')fail('Choose one in-play Tribe and a numbered Rio Grande space.');
  if(s.pieces.some(p=>p.id!==tribe.id&&p.location===dest&&['Tribe','Rancheria','Band'].includes(p.type)))fail('Chosen Rio Grande space has a stacking conflict; choose another destination.');
  const origin=tribe.location;tribe.location=dest;
  for(const p of s.pieces.filter(p=>p.location===dest&&p.id!==tribe.id&&['Settlement','Bison'].includes(p.type)))p.location='reserve';
  s.developmentPending=null;message=`Nuevo Apachería: Tribe ${tribe.id} moved ${origin} → ${dest}; displaced Bison/Settlement returned to stock.`;break;
 }
 case 'DEVELOPMENT_RESOLVE_HORSE_DISCARD':{
  const pending=s.developmentPending;
  if(!pending||pending.kind!=='horse-discard')fail('No pending Development Horse loss to resolve.');
  const ids=asArray(command.horseIds).map(String);
  if(ids.length!==pending.required||new Set(ids).size!==ids.length||ids.some(id=>!pending.horseIds.includes(id)))fail(`Choose exactly ${pending.required} distinct eligible in-play Horse counters.`);
  for(const id of ids){const h=item(s,id);if(h.subtype!=='Horse'||['reserve','removed'].includes(h.location))fail('Horse is no longer eligible for the printed discard loss.');h.location='reserve';}
  s.developmentPending=null;message=`Development #${pending.number}: returned ${ids.length} chosen Horses to stock at Passage of Time discard.`;break;
 }
 case 'DEVELOPMENT_RESOLVE_SMALLPOX':{
  const pending=s.developmentPending;
  if(!pending||pending.kind!=='smallpox-end'||pending.number!=='64')fail('No pending end-of-Take-Actions Smallpox decision.');
  const band=s.pieces.find(p=>p.id===String(command.bandId||'')&&p.type==='Band'&&p.location===pending.space);
  if(!band||!pending.bandIds.includes(band.id))fail('Choose an eligible Band in the selected Smallpox space.');
  if(band.strength===1&&s.pieces.some(p=>p.location===`held:${band.id}`))fail('This Band has possessed counters; reconcile death and possession under printed rules before automatic loss.');
  reduceBandForCard(s,band);s.developmentPending=null;markRecurringDisease(s,pending.cardId);
  message=`Smallpox: reduced ${band.id} in random space ${pending.space}; resolved end-Take-Actions effect.`;break;
 }
 case 'DEVELOPMENT_REVEAL':{
   if(s.phase==='setup'||s.phase==='gameover')fail('Development reveal is only available during play.');
   if(!['execution','cleanup'].includes(s.phase)||s.operation!=='Passage of Time')fail('Development cards are revealed in the Passage of Time procedure.');
   const c=s.cards.find(x=>x.id===command.id&&x.kind==='Development'&&x.zone==='Deck');
   if(!c)fail('Choose an undealt Development card from the current deck.');
   c.zone='In play';message=revealDevelopmentEffect(s,c);break;
 }
 case 'DEVELOPMENT_CONFIRM_EFFECT':{
   const pending=s.developmentPending;
   if(!pending||pending.cardId!==command.id)fail('No matching Development effect awaiting resolution.');
   if(['epidemic','smallpox-end','buffalo-hunters','horse-discard','nuevo-apacheria','cuerno-medicine','quanah-medicine','kiowa-alliance'].includes(pending.kind))fail('Use the dedicated printed Development effect resolver; an acknowledgement cannot bypass required counter choices.');
   const note=String(command.note||'').trim();
   if(!command.ack||note.length<20||note.length>600)fail('Document the printed card, actual action, and results (20–600 characters).');
   s.developmentPending=null;if([...EPIDEMIC_IDS,'64'].includes(pending.number)&&pending.phase==='end-take-actions')markRecurringDisease(s,pending.cardId);message=`Manual Development ${pending.number} outcome verified against printed card: ${note}`;quality='manual';break;
 }
 // Nuevo Apachería (#30) prohibits ANY new Development Card being taken into hand.
 case 'DEVELOPMENT_TAKE_HAND':{
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='02'&&['In play','Display'].includes(x.zone));
   if(!c||s.phase!=='execution'||s.operation!=='Planning')fail('Ute Alliance can be taken into hand as a Planning Headman Action only while it is in play.');
   if(s.tracks.ap<1)fail('Ute Alliance costs 1 AP to take into hand.');
   s.tracks.ap--;c.zone='Hand';message='Ute Alliance: paid 1 AP, card taken into hand.';break;
 }
 case 'DEVELOPMENT_TAKE_VERIFIED_HAND':{
   const number=String(command.number||'').padStart(2,'0');
   if(!['11','13','15','16','17','18','28','32','35','36','39','40','42','54','59'].includes(number))fail('This card has no independently verified hand action.');
   if(s.phase!=='execution'||s.operation!=='Planning')fail('Taking a Development card into hand is a Planning Headman Action.');
   const c=activeDevelopment(s,number)[0];
   if(!c||s.tracks.ap<1)fail('The selected Development card must be in play and the player needs 1 AP.');
   s.tracks.ap--;c.zone='Hand';message=`Development ${number} taken into hand for 1 AP.`;break;
 }
 case 'DEVELOPMENT_PLAY_ANZA':{
  const card=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='28'&&c.zone==='Hand');
  if(!card)fail('Juan Bautista de Anza must be held in hand.');
  if(s.phase==='setup'||s.phase==='gameover'||s.operation==='Passage of Time')fail('Anza cannot be played during Passage of Time or outside active play.');
  const wars=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='West'&&SPACE[p.location]);
  // War Ends can release a Peace instruction into the display, so choose
  // only after the entire group has been safely reconciled.
  wars.forEach(w=>warEndsPreview(s,w.id));
  const inWest=s.pieces.filter(p=>p.type==='Instruction'&&p.owner==='West'&&p.location==='W');
  if(inWest.some(i=>i.subtype==='Peace'))fail('Anza: West already contains Peace; do not stack a second Peace counter.');
  if(inWest.length>1)fail('Anza: ambiguous West square Instructions.');
  for(const w of wars)resolveWarEnds(s,w.id);
  const peace=DISPLAY_ROWS.map(row=>s.pieces.find(p=>p.type==='Instruction'&&p.owner==='West'&&p.subtype==='Peace'&&p.location===`enemy-display:West:${row}`)).find(Boolean);
  if(peace)peace.location='W';
  card.zone='Discard';
  message=`Juan Bautista de Anza played from hand: ${wars.length} West War Columns ended; ${peace?'face-up West Peace '+peace.id+' moved to W':'no face-up West Peace Instruction available'}; card discarded.`;
  break;
 }
 case 'DEVELOPMENT_PLAY_VIBRANT_POPULATION':{
  const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='35'&&x.zone==='Hand');
  if(!c||s.phase==='setup'||s.phase==='gameover'||s.phase==='execution'&&s.operation==='Passage of Time')fail('Vibrant Population must be played from hand outside Passage of Time.');
  let count=0;for(const b of s.pieces.filter(x=>x.type==='Band'&&SPACE[x.location])){b.finished=false;count++;}
  c.zone='Discard';message=`Vibrant Population: marked ${count} in-play Bands Unfinished; card discarded.`;break;
 }
 case 'DEVELOPMENT_PLAY_LONG_RAID':{
  const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='54'&&x.zone==='Hand');
  if(!c||s.phase!=='execution'||s.operation!=='Take Actions'||!activeBand(s))fail('1,000-Mile Raid requires a held card and an active Band during Take Actions.');
  s.tracks.movement+=6;c.zone='Discard';message='1,000-Mile Raid: active Band gains 6 MP; card discarded.';break;
 }
 case 'DEVELOPMENT_PLAY_SIEGE':{
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='11'&&x.zone==='Hand');
   if(!c||s.phase==='setup'||s.phase==='gameover'||s.phase==='execution'&&s.operation==='Passage of Time')fail('Siege of La Jicarilla must be played from hand outside Passage of Time.');
   const ids=asArray(command.tribeIds).map(String);
   if(!(ids.length===1||ids.length===2)||new Set(ids).size!==ids.length)fail('Choose one Tribe to receive two Ravaged counters, or two distinct Tribes to receive one each.');
   const tribes=ids.map(id=>item(s,id));
   if(tribes.some(x=>x.type!=='Tribe'||!SPACE[x.location]))fail('Each target must be an in-play Tribe.');
   const stock=s.pieces.filter(x=>x.type==='Marker'&&x.subtype==='Ravaged'&&x.location==='reserve');
   if(stock.length<2)fail('Two Ravaged counters are required from physical stock.');
   for(let i=0;i<2;i++)stock[i].location=tribes[ids.length===1?0:i].location;
   c.zone='Discard';message=`Siege of La Jicarilla: placed two stock Ravaged markers across ${ids.length} Tribe(s), card discarded.`;break;
 }
 case 'DEVELOPMENT_PLAY_NO_RELIEF':{
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='18'&&x.zone==='Hand');
   if(!c)fail('No Relief from War must be held in hand.');
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Play No Relief from War only during an executing Enemy Recover effect, before its die roll.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)
     fail('The selected Enemy Instruction has already been resolved.');
   const audit=recoverTargetAudit(s,f.enemy);
   if(!audit.candidates.length)fail('The executing Enemy Instruction has no Recover target; No Relief from War cannot be used.');
   if(audit.ambiguousRavaged?.length)fail('Unclassified Ravaged marker ownership prevents verifying the Enemy Recover target.');
   f.recoverResolved={card:'18',prevented:true,ravagedIds:audit.candidates.map(p=>p.id)};
   c.zone='Discard';message=`No Relief from War: ${f.enemy} Enemy Recover is prevented without removing any Ravaged counter; Enemy APs already paid remain spent. Discarded #18.`;break;
 }
 case 'DEVELOPMENT_PLAY_NEGOTIATION':{
   if(s.phase!=='execution'||s.operation!=='Planning')fail('Negotiation is played during Planning.');
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='15'&&x.zone==='Hand');
   if(!c)fail('Negotiation must be in hand.');
   const w=item(s,String(command.warId||''));const plan=warEndsPreview(s,w.id);
   resolveWarEnds(s,w.id);c.zone='Discard';
   message=`Negotiation: ${w.id} War Ends; paired instruction ${plan.instructionId} returned to ${plan.destination}.`;break;
 }
 case 'DEVELOPMENT_PLAY_FRENCH_TRADERS':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('French Traders is played during Take Actions.');
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='13'&&x.zone==='Hand');
   if(!c)fail('French Traders must be in hand.');
   const b=activeBand(s);if(!b||!SPACE[b.location]||SPACE[b.location].type!=='round'||!['LA','RR','BC'].includes(SPACE[b.location].territory))
     fail('French Traders requires an active Band in a round space of Lower Arkansas, Red River or Brazos Colorado.');
   if(s.pieces.some(x=>x!==b&&x.location===b.location))fail('French Traders requires the Band to occupy an empty map space.');
   const ids=asArray(command.resourceIds).map(String);
   if(ids.length<1||ids.length>2||new Set(ids).size!==ids.length)fail('Spend one or two distinct Bison/Horse counters.');
   const spent=ids.map(id=>item(s,id));
   if(spent.some(x=>x.location!==`held:${b.id}`||!(x.type==='Bison'||x.subtype==='Horse'||x.subtype==='Bison')))
     fail('French Traders only spends Bison or Horse counters possessed by the active Band.');
   const stock=s.pieces.filter(x=>x.type==='Resource'&&x.subtype==='Guns'&&x.location==='reserve');
   if(stock.length<ids.length)fail('Not enough Guns counters available in recorded stock.');
   for(const x of spent)x.location='reserve';
   for(const x of stock.slice(0,ids.length))x.location=`held:${b.id}`;
   c.zone='Discard';message=`French Traders: ${ids.length} possessed Bison/Horse spent for ${ids.length} available Guns without paying an AP; card discarded.`;break;
 }
 case 'DEVELOPMENT_GREAT_HUNT_HAND':{
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='12'&&['In play','Display'].includes(x.zone));
   if(!c||s.phase!=='execution'||s.operation!=='Planning'||s.tracks.ap<1)fail('Great Hunt requires in-play card, Planning Headman Action, and 1 AP.');
   s.tracks.ap--;c.zone='Hand';message='Great Hunt taken into hand for 1 AP.';break;
 }
 case 'DEVELOPMENT_GREAT_HUNT_PLAY':{
   if(s.phase!=='execution'||s.operation!=='Take Actions'||!s.activeBandId)fail('Play Great Hunt only during an active Band’s Take Actions activation.');
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='12'&&x.zone==='Hand');
   if(!c||s.greatHuntBandId)fail('Great Hunt must be in hand and not already active.');
   c.zone='Discard';s.greatHuntBandId=s.activeBandId;
   message='Great Hunt: this Band pays 1 MP per Hunt during its current activation.';break;
 }
 case 'DEVELOPMENT_PLAY_UTE':{
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='02'&&x.zone==='Hand');
   if(!c||!['band','remove'].includes(command.choice))fail('Ute Alliance must be in hand; choose printed Band or die-removal option.');
   if(command.choice==='band'){
     const stock=s.pieces.filter(p=>p.type==='Band'&&p.strength===3&&p.location==='reserve');
     if(!stock.length)fail('No available strength-3 Band counter; printed stock is a strict limit.');
     const to=String(command.space||'');if(!SPACE[to]||!['round','canyon'].includes(SPACE[to].type))fail('Select a valid map space.');
     if(s.pieces.some(p=>p.location===to&&p.type==='Band'))fail('Adding a Band here may violate stacking: choose an empty Band slot.');
     stock[0].location=to;stock[0].finished=false;
     message=`Ute Alliance: deployed available strength-3 Band to ${to}.`;
   }else{
     const die=bounded(command.die,1,6,'Ute Alliance die');
     const target=s.pieces.find(p=>p.id===command.targetId&&['Tribe','Settlement'].includes(p.type)&&SPACE[p.location]);
     if(die>=3){
       if(!target)fail('Select the Tribe or Settlement removed by a successful result.');
       target.location='reserve';
       message=`Ute Alliance die ${die}: removed ${target.type} ${target.id} from play.`;
     }else message=`Ute Alliance die ${die}: no effect.`;
   }
   c.zone='Discard';break;
 }
 case 'DEVELOPMENT_COMANCHEROS':{
   if(s.phase!=='execution'||s.operation!=='Planning')fail('Comancheros applies at the end of Planning.');
   const cards=['33','34','58'].flatMap(n=>activeDevelopment(s,n));
   if(!cards.length)fail('No Comancheros card is in play.');
   if(s.developmentPlanningApplied)fail('Comancheros has already been resolved for this Planning Operation.');
   const ranch=s.pieces.find(p=>p.id===command.rancheriaId&&p.type==='Rancheria'&&SPACE[p.location]);
   if(!ranch)fail('Select an in-play Ranchería to receive the goods.');
   const goods=s.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location==='reserve');
   if(goods.length<cards.length)fail('Insufficient Trade Goods counters in physical stock; reconcile stock before resolving.');
   for(const g of goods.slice(0,cards.length))g.location=`box:${ranch.id}`;
   s.developmentPlanningApplied=true;
   message=`Comancheros: ${cards.length} Trade Goods assigned to ${ranch.label||ranch.id} (cumulative in-play cards).`;break;
 }
 case 'ADD_CARD':{
   const c={id:newId(),kind:String(command.kind||'Development'),identifier:String(command.identifier||'').slice(0,40),
    title:String(command.title||'').slice(0,120),zone:String(command.zone||'Display'),notes:String(command.notes||'').slice(0,1000),
    evidenceStatus:String(command.evidenceStatus||'unverified'),sourceReference:String(command.sourceReference||'').trim().slice(0,300)};
   if(!['History','Development','Culture','War'].includes(c.kind))fail('Unknown card deck.');
   if(!['Deck','Display','Hand','In play','War Event','Discard','Available','Removed'].includes(c.zone))fail('Unknown card zone.');
   if(c.kind==='War'&&c.zone==='War Event'&&s.cards.some(x=>x.kind==='War'&&x.zone==='War Event'))fail('Only one War Event may be face-up.');
   if(!CARD_EVIDENCE_STATES.includes(c.evidenceStatus))fail('Unknown card evidence status.');
   if(c.evidenceStatus!=='unverified'&&(!c.identifier.trim()||c.sourceReference.length<8))fail('Evidence status requires a printed card ID and a specific source reference.');
   s.cards.push(c);message=`Recorded ${c.kind} card ${c.identifier||c.title}.`;quality='manual';break;}
 case 'EDIT_CARD_DETAILS':{
   const c=s.cards.find(x=>x.id===command.id)||fail('Card not found.');
   const identifier=String(command.identifier||'').trim();
   const title=String(command.title||'').trim();
   const notes=String(command.notes||'').trim();
   const evidenceStatus=String(command.evidenceStatus||'unverified');
   const sourceReference=String(command.sourceReference||'').trim();
   if(identifier.length>40||title.length>120||notes.length>1000||sourceReference.length>300||!CARD_EVIDENCE_STATES.includes(evidenceStatus))fail('Invalid card details.');
   if(evidenceStatus!=='unverified'&&(!identifier||sourceReference.length<8))fail('Evidence status requires a printed card ID and source reference.');
   c.identifier=identifier;c.title=title;c.notes=notes;c.evidenceStatus=evidenceStatus;c.sourceReference=sourceReference;
   message=`Updated card ${identifier||title||'placeholder'} identity and evidence. Effects remain manually verified.`;quality='manual';break;}
 case 'EDIT_CARD_EVIDENCE':{
   const c=s.cards.find(x=>x.id===command.id)||fail('Card not found.');
   const status=String(command.evidenceStatus||'unverified');
   const source=String(command.sourceReference||'').trim();
   if(!CARD_EVIDENCE_STATES.includes(status)||source.length>300)fail('Invalid card evidence details.');
   if(status!=='unverified'&&(!String(c.identifier||'').trim()||source.length<8))fail('Evidence status requires a printed card ID and source reference.');
   c.evidenceStatus=status;c.sourceReference=source;
   message=`Updated card evidence for ${c.identifier||c.title||'unlabelled card'}: ${status}. Card effects are not automated.`;quality='manual';break;}
 case 'EDIT_CARD':{
   const c=s.cards.find(x=>x.id===command.id)||fail('Card not found.');
   if(!['Deck','Display','Hand','In play','War Event','Discard','Available','Removed'].includes(command.zone))fail('Invalid card zone.');
   if(c.kind==='War'&&command.zone==='War Event'&&s.cards.some(x=>x.id!==c.id&&x.kind==='War'&&x.zone==='War Event'))fail('Only one War Event may be face-up.');
   if(c.kind==='Development'&&devNumber(c)==='68'&&['In play','Display'].includes(c.zone)&&!['In play','Display'].includes(command.zone))fail('Medicine Lodge Treaty (#68) can never be removed from play.');
   const wasDeck=c.zone==='Deck',wasInPlay=['In play','Hand','Display'].includes(c.zone);c.zone=command.zone;if(c.kind==='Development'&&wasInPlay&&c.zone==='Discard')passageDiscard(s,c);if(c.kind==='Development'&&wasDeck&&['Display','In play'].includes(c.zone)){message=revealDevelopmentEffect(s,c);quality='verified';}
   if(c.kind==='War'&&c.zone==='War Event'){s.warEventResolved=null;s.warHigherStakesResolved=false;}message+=` Moved card ${c.identifier||c.title} to ${c.zone}.`;quality='manual';break;}
 case 'DELETE_CARD':{
   if(!s.cards.some(x=>x.id===command.id))fail('Card not found.');
   const target=s.cards.find(x=>x.id===command.id);
   if(target.kind==='Development'&&devNumber(target)==='68'&&['In play','Display'].includes(target.zone))fail('Medicine Lodge Treaty (#68) cannot be removed from play.');
   s.cards=s.cards.filter(x=>x.id!==command.id);message='Card removed from tracker.';quality='manual';break;}
 case 'LIMIT':{
   if(!PIECE_TYPES.includes(command.pieceType))fail('Unknown type.');
   const k=`${command.pieceType}:${String(command.subtype||'')}`;
   if(command.value==='')delete s.limits[k];else s.limits[k]=bounded(command.value,0,999,'Stock limit');
   message=`Updated entered supply limit: ${k}.`;quality='manual';break;}
 default:fail('Unknown command: '+type);
 }
 if(['RESOLVE_RAID','HUNT','TRADE'].includes(type)){const eliminated=applyApacheWar(s);if(eliminated)message+=` Apache War: eliminated ${eliminated} Tribe(s) with 3+ Ravaged markers.`;}
 if(activeDevelopment(s,'30').length&&s.cards.some(c=>c.kind==='Development'&&c.zone==='Hand'&&!original.cards.some(prior=>prior.id===c.id&&prior.zone==='Hand')))
   fail('Nuevo Apachería (#30) forbids bringing new Development cards into hand.');
 if(activeDevelopment(s,'49').length&&s.pieces.some(p=>p.subtype==='Guns'&&!['reserve','removed'].includes(p.location)))
  fail('Colt-Walker Revolver (#49) prohibits acquiring Guns while it remains in play.');
 if(s.phase!=='setup' && s.phase!=='gameover' && s.tracks.military===0 && s.tracks.culture===0){s.gameResult={outcome:'defeat',period:s.period,reason:'Military and Culture both zero',note:''};s.victoryPending=null;s.phase='gameover';s.operation=null;s.activeBandId=null;s.pending=null;s.enemyFlow=null;s.battlePending=null;s.battleContinuation=null;s.warMovement=null;s.successCheck=null;s.countermeasureWindow=null;s.tracks.movement=0;message+=' GAME OVER: Military and Culture are both zero (2.11.1).';}
 logIt(s,message,quality,type);
 return s;
}
// Upgrade old v1 saves without mutating them. Historical setup is never inferred.
export function migrateGame(original){
 const s=clone(original);
 if(!s||typeof s!=='object'||![1,2,3].includes(s.schema))fail('Not a supported save-file schema.');
 if(s.schema===1){
   s.schema=2;
   s.version='0.2.0';
   s.rng={algorithm:'xorshift32',seed:DEFAULT_SEED,rolls:0};
   s.medicine={paraibo:null,mahimiana:null};
   s.colonial={West:'None',South:'None',East:'None'};
   s.setupChecklist={};s.setupConfirmed={};s.operationEvents={cultureGain:false,operationsRoll:false};
   s.setupNote=`Imported v0.1 save. Original setup was manual; no counters or rules were inferred. ${s.setupNote||''}`;
 }
 if(s.schema===2){s.schema=3;s.version=VERSION;s.successCheck=null;s.lastSuccessCheck=null;}
 s.passageRetiredIds??=[];s.passageQuanahExemptId??=null;s.passagePeaceRolls??={};s.passageBison??=null;s.passageResult??=null;s.victoryPending??=null;s.gameResult??=s.phase==='gameover'?{outcome:'defeat',period:s.period,reason:'Historical defeat recorded in older save',note:''}:null;
 s.countermeasureWindow??=null;s.developmentPending??=null;s.developmentPlanningApplied??=false;s.epidemicTakeActionsApplied??=false;s.greatHuntBandId??=null;
 s.battlePending??=null;s.battleContinuation??=null;s.battleRounds??=[];s.battleExemptions??={};s.warMovement??=null;s.enemyFlow??=null;s.mapReview??={};
 if(s.successCheck){s.successCheck.canceledDrawIds??=[];s.successCheck.gunAttempts??=[];s.successCheck.redraws??=0;}
 // Old auto-loaded tutorial bundle contained shortcuts absent from the uploaded actual board.
 // Preserve any player-entered links, but quarantine those machine-authored errors.
 const disproved=new Set(['RR-3|RR-5','LE-6|RR-3']);
 const removed=(s.edges||[]).filter(e=>disproved.has([e.a,e.b].sort().join('|'))&&e.source==='GMT-playbook'&&!e.verifiedByPlayer);
 if(removed.length){s.edges=s.edges.filter(e=>!removed.includes(e));s.mapReview={};s.setupNote=(s.setupNote||'')+' MAP CORRECTION: two old machine-supplied shortcut lines were removed because the photographed actual board does not join those spaces. Reapply the updated board-photo map evidence.';}
 for(const c of s.cards||[]){c.evidenceStatus??='unverified';c.sourceReference??='';}
 s.version=VERSION;
 basicIntegrity(s);return s;
}
export function basicIntegrity(s){
 if(s?.countermeasureWindow!==null&&s?.countermeasureWindow!==undefined){
  const w=s.countermeasureWindow;
  if(!w||s.phase!=='execution'||s.operation!=='Take Actions'||typeof w.bandId!=='string'||!s.pieces.some(p=>p.id===w.bandId&&p.type==='Band'&&p.finished)||!['W07','W08','W18','W19','W20','W21','W24'].includes(w.cardId)||String(activeWarCard(s)?.identifier||'').toUpperCase()!==w.cardId||!warCountermeasureOptions(s,w.bandId).length)fail('Invalid pending post-Finish countermeasure.');
 }

 if(s?.passageRetiredIds!==undefined){
  if(!Array.isArray(s.passageRetiredIds)||s.passageRetiredIds.length>5||new Set(s.passageRetiredIds).size!==s.passageRetiredIds.length||s.passageRetiredIds.some(id=>!s.pieces.some(p=>p.id===id&&p.type==='Mahimiana')))fail('Invalid saved Mahimiana retirement ledger.');
 }
 if(s?.passageQuanahExemptId!==undefined&&s.passageQuanahExemptId!==null&&(!s.pieces.some(p=>p.id===s.passageQuanahExemptId&&p.type==='Mahimiana')||!activeDevelopment(s,'74').length))fail('Invalid saved Quanah Parker death-check exemption.');
 if(s?.passageBison!==undefined&&s.passageBison!==null){
   const b=s.passageBison;
   if(!b||!Number.isInteger(b.required)||b.required<1||b.required>4||!Array.isArray(b.records)||b.records.length>b.required||
      !(b.currentTerritory===null||TERRITORIES.some(x=>x[0]===b.currentTerritory))||
      b.records.some(r=>!r||!TERRITORIES.some(x=>x[0]===r.territory)||!['place','relocate','none'].includes(r.action)||
        (r.action==='none'?(r.bisonId!==null||r.destination!==null):
          typeof r.bisonId!=='string'||!s.pieces.some(p=>p.id===r.bisonId&&p.type==='Bison')||
          !SPACE[r.destination]||SPACE[r.destination].type!=='round'||
          r.action==='place'&&SPACE[r.destination].territory!==r.territory)))fail('Invalid saved Passage Bison ledger.');
 }
 if(s?.passagePeaceRolls!==undefined){
  if(!s.passagePeaceRolls||typeof s.passagePeaceRolls!=='object'||Array.isArray(s.passagePeaceRolls))fail('Invalid Passage Peace roll ledger.');
  for(const [id,r] of Object.entries(s.passagePeaceRolls)){
    if(!s.pieces.some(p=>p.id===id&&p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype))||
      !r||!Number.isInteger(r.die)||r.die<1||r.die>6||!Number.isInteger(r.cost)||r.cost<1||r.cost>9||!SPACE[r.location]||typeof r.returned!=='boolean'||
      (r.returned!==Boolean(r.die>r.cost))||(r.returned&&!DISPLAY_ROWS.includes(r.row))||(!r.returned&&r.row!==null))fail('Invalid saved Passage Peace roll result.');
  }
 }
 if(s?.passageResult!==null&&s?.passageResult!==undefined){const p=s.passageResult;
  if(!p||!Number.isInteger(p.period)||p.period<1||p.period>4||!Number.isInteger(p.markerBefore)||p.markerBefore<0||p.markerBefore>20||typeof p.mandatory!=='boolean'||typeof p.triggered!=='boolean'||!(p.die===null||Number.isInteger(p.die)&&p.die>=1&&p.die<=6))fail('Invalid Passage of Time result in save.');
 }
 if(s?.victoryPending!==null&&s?.victoryPending!==undefined){const p=s.victoryPending;
  if(!p||s.phase!=='execution'||s.operation!=='Passage of Time'||!s.passageResult?.triggered||p.period!==s.period||p.history!==`H${s.period}`)fail('Invalid pending Victory Check.');
 }
 if(s?.gameResult!==null&&s?.gameResult!==undefined){const g=s.gameResult;
  if(!g||s.phase!=='gameover'||!['victory','defeat'].includes(g.outcome)||!Number.isInteger(g.period)||g.period<1||g.period>4||typeof g.reason!=='string'||g.reason.length>300||typeof g.note!=='string'||g.note.length>500)fail('Invalid game ending record.');
 }
 if(!s||s.schema!==3||!Array.isArray(s.pieces)||!Array.isArray(s.cards)||!Array.isArray(s.edges)||!s.tracks||!Array.isArray(s.log)||!PHASES.includes(s.phase))fail('Not a supported save-file schema.');
 if(s.pieces.length>5000||s.cards.length>5000||s.edges.length>300||s.log.length>10000)fail('Save file exceeds safe limits.');
 if(!s.mapReview||typeof s.mapReview!=='object'||Array.isArray(s.mapReview)||Object.keys(s.mapReview).length>SPACES.length)fail('Invalid saved map review ledger.');
 for(const [space,entry] of Object.entries(s.mapReview)){
   if(!SPACE[space]||!entry||typeof entry.signature!=='string'||entry.signature.length>500||typeof entry.note!=='string'||entry.note.length>200||typeof entry.at!=='string'||entry.at.length>60)fail('Invalid saved map review entry.');
 }
 if(s.enemyFlow!==null&&s.enemyFlow!==undefined){
   const f=s.enemyFlow;
   if(!f||!['paid','free'].includes(f.kind)||!ENEMY_COLUMNS.includes(f.enemy)||!DISPLAY_ROWS.includes(f.row)||!Number.isInteger(f.die)||f.die<1||f.die>6||!['choose','payment','effect','done'].includes(f.stage)||!Number.isInteger(f.executed)||f.executed<0||f.executed>30||f.kind==='free'&&f.executed>1)fail('Invalid pending Enemy Instruction procedure.');
   if(['payment','effect'].includes(f.stage)&&(!s.pieces.some(p=>p.id===f.currentId&&p.type==='Instruction'&&p.location===(f.allyResolved?f.allyResolved.location:f.peaceResolved?f.peaceResolved.square:`enemy-display:${f.enemy}:${f.currentRow}`))||!DISPLAY_ROWS.includes(f.currentRow)))fail('Pending Enemy Instruction no longer matches the display.');
   if(f.recoverResolved){const r=f.recoverResolved;
    if(f.stage!=='effect'||typeof r.ravagedId!=='string'||!SPACE[r.location]||!Number.isInteger(r.die)||r.die<1||r.die>6||typeof r.success!=='boolean'||typeof r.criterion!=='string'||r.criterion.length<12||r.criterion.length>240||typeof r.randomConfirmed!=='boolean'||!s.pieces.some(p=>p.id===r.ravagedId&&p.type==='Marker'&&p.subtype==='Ravaged'&&p.location===(r.success?'reserve':r.location)))fail('Invalid pending Recover resolution.');
   }

   if(f.subjugateResolved){const r=f.subjugateResolved;
    if(f.stage!=='effect'||!['West','South','East'].includes(r.enemy)||r.enemy!==f.enemy||typeof r.tribeId!=='string'||SPACE[r.location]?.type!=='round'||typeof r.randomConfirmed!=='boolean'||typeof r.unmappedRouteConfirmed!=='boolean'||typeof r.mapVerification!=='string'||r.mapVerification.length<25||r.mapVerification.length>400||!(r.origin===null||r.enemy==='East'&&['E1','E2'].includes(r.origin))||!(r.recordedDistance===null||Number.isInteger(r.recordedDistance)&&r.recordedDistance>=1&&r.recordedDistance<=43)||!s.pieces.some(p=>p.id===r.tribeId&&p.type==='Tribe'&&p.location==='reserve'))fail('Invalid pending Subjugate resolution.');
   }
   if(f.settleResolved){const r=f.settleResolved;
    if(f.stage!=='effect'||!['West','South','East'].includes(r.enemy)||r.enemy!==f.enemy||typeof r.settlementId!=='string'||SPACE[r.space]?.type!=='round'||typeof r.randomConfirmed!=='boolean'||typeof r.unmappedRouteConfirmed!=='boolean'||typeof r.mapVerification!=='string'||r.mapVerification.length<25||r.mapVerification.length>400||!(r.origin===null||r.enemy==='East'&&['E1','E2'].includes(r.origin))||!(r.recordedDistance===null||Number.isInteger(r.recordedDistance)&&r.recordedDistance>=1&&r.recordedDistance<=43)||!Array.isArray(r.bisonIds)||r.bisonIds.length>30||new Set(r.bisonIds).size!==r.bisonIds.length||!s.pieces.some(p=>p.id===r.settlementId&&p.type==='Settlement'&&p.location===r.space)||r.bisonIds.some(id=>!s.pieces.some(p=>p.id===id&&p.type==='Bison'&&p.location==='reserve')))fail('Invalid pending Settle resolution.');
   }
   if(f.peaceResolved){
     const p=f.peaceResolved;
     if(f.stage!=='effect'||p.instructionId!==f.currentId||p.originalRow!==f.currentRow||p.enemy!==f.enemy||p.square!==({North:'N',West:'W',South:'S',East:'E2'}[f.enemy])||
       !s.pieces.some(q=>q.id===p.instructionId&&q.type==='Instruction'&&q.subtype==='Peace'&&q.location===p.square)||
       !Array.isArray(p.replaced)||p.replaced.some(id=>!s.pieces.some(q=>q.id===id&&q.type==='Instruction'&&q.subtype==='Peace'&&q.location.startsWith('enemy-inactive:'))))
       fail('Invalid saved Peace resolution.');
   }
   if(f.allyResolved){
     const a=f.allyResolved;
     if(f.stage!=='effect'||a.instructionId!==f.currentId||a.originalRow!==f.currentRow||SPACE[a.location]?.type!=='round'||!s.pieces.some(p=>p.id===a.tribeId&&p.type==='Tribe'&&p.location===a.location)||!s.pieces.some(p=>p.id===a.instructionId&&p.type==='Instruction'&&p.subtype==='Ally'&&p.location===a.location)||s.pieces.some(p=>p.location===a.location&&p.type==='War Column'))fail('Invalid saved Ally resolution.');
   }
   if(f.encroachResolved){
     const h=f.encroachResolved;
     if(f.stage!=='effect'||!Number.isInteger(h.die)||h.die<1||h.die>6||!Array.isArray(h.order)||h.order.length!==6||new Set(h.order).size!==6||h.order[0]!=='UA'||h.order[1]!=='LA'||h.order.some(x=>!TERRITORIES.some(t=>t[0]===x))||
       !Number.isInteger(h.selectedFace)||h.selectedFace<1||h.selectedFace>6||h.order[h.selectedFace-1]!==h.territory||SPACE[h.location]?.type!=='round'||SPACE[h.location]?.territory!==h.territory||
       !s.pieces.some(p=>p.id===h.tribeId&&p.type==='Tribe'&&p.location===h.location)||!Array.isArray(h.bisonIds)||new Set(h.bisonIds).size!==h.bisonIds.length||h.bisonIds.some(id=>!s.pieces.some(p=>p.id===id&&p.type==='Bison'&&p.location==='reserve')))
       fail('Invalid saved Encroach resolution.');
   }
   if(f.huntResolved){
     const h=f.huntResolved;
     if(f.stage!=='effect'||!Number.isInteger(h.die)||h.die<1||h.die>6||!Array.isArray(h.order)||h.order.length!==6||new Set(h.order).size!==6||h.order[0]!=='UA'||h.order[1]!=='LA'||h.order.some(x=>!TERRITORIES.some(t=>t[0]===x))||
       !(h.territory===null||TERRITORIES.some(t=>t[0]===h.territory))||!(h.selectedFace===null||Number.isInteger(h.selectedFace)&&h.selectedFace>=1&&h.selectedFace<=6)||
       !(h.redirectedFrom===null||h.redirectedFrom==='Encroach')||!(h.bisonId===null||typeof h.bisonId==='string'&&s.pieces.some(p=>p.id===h.bisonId&&p.type==='Bison'&&p.location==='reserve')))
       fail('Invalid saved Hunt resolution.');
     if((h.bisonId===null)!==(h.territory===null)||(h.selectedFace===null)!==(h.territory===null))fail('Invalid Hunt result state.');
     if(h.territory!==null&&h.order[h.selectedFace-1]!==h.territory)fail('Hunt territory mapping is inconsistent.');
   }
   if(f.cultureAttackResolved){
     const r=f.cultureAttackResolved;
     if(f.stage!=='effect'||r.enemy!==f.enemy||!Number.isInteger(r.amount)||r.amount<1||r.amount>99||!Array.isArray(r.settlementIds)||new Set(r.settlementIds).size!==r.settlementIds.length||
       !Number.isInteger(r.cultureAfter)||r.cultureAfter!==s.tracks.culture||!Number.isInteger(r.militaryAfter)||r.militaryAfter!==s.tracks.military)
       fail('Invalid saved automated Culture Attack.');
   }
   if(f.cardNoEffectResolved){
     const r=f.cardNoEffectResolved,effect=VERIFIED_CARD_EFFECTS.find(x=>x.key===r.effect);
     if(f.stage!=='effect'||!effect||!effect.blockedInstructions.includes(r.instruction)||!activeCardEffects(s).some(x=>x.key===r.effect&&(!x.enemies||x.enemies.includes(f.enemy)))||instructionName(s.pieces.find(p=>p.id===f.currentId))!==r.instruction)
       fail('Invalid saved card exception.');
   }
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.cardNoEffectResolved].filter(Boolean).length>1)fail('Cannot resolve multiple Enemy effect outcomes for the same Instruction.');
   if(f.kind==='paid'&&s.phase!=='cleanup'||f.kind==='free'&&!['cleanup','execution'].includes(s.phase))fail('Pending Enemy procedure is in the wrong game phase.');
 }
 if(s.warMovement!==null&&s.warMovement!==undefined){
   const m=s.warMovement;
   if(s.phase!=='war'||!m||!/^[-A-Za-z0-9_]{1,100}$/.test(m.warId)||!ENEMY_COLUMNS.includes(m.enemy)||typeof m.card!=='string'||m.card.length<3||m.card.length>120||!Number.isInteger(m.allowed)||m.allowed<1||m.allowed>8||!Number.isInteger(m.remaining)||m.remaining<0||m.remaining>m.allowed||!Array.isArray(m.route)||m.route.length!==m.allowed-m.remaining+1||m.route.some(x=>!SPACE[x])||!Array.isArray(m.exceptions)||m.exceptions.length>m.allowed||m.exceptions.some(x=>!x||!SPACE[x.from]||!SPACE[x.to]||typeof x.reason!=='string'||x.reason.length<12||x.reason.length>200))fail('Invalid pending War Card movement.');
   for(let i=1;i<m.route.length;i++){
     const from=m.route[i-1],to=m.route[i];const edge=s.edges.find(e=>e.a===from&&e.b===to||e.a===to&&e.b===from);
     if(!edge)fail('Saved War Card movement references an unrecorded map connection.');
     if(edge.kind==='dashed'&&m.enemy!=='North'&&!m.exceptions.some(x=>x.from===from&&x.to===to))fail('Saved Colonial dashed-line movement lacks its printed-card exception.');
   }
   const w=s.pieces.find(p=>p.id===m.warId&&p.type==='War Column'&&p.owner===m.enemy&&p.location===m.route.at(-1));
   if(!w)fail('Pending War Card movement does not match the recorded War Column.');
 }
 if(!SCENARIOS.some(x=>x[0]===s.scenario))fail('Unknown saved scenario.');
 if(!s.rng||s.rng.algorithm!=='xorshift32'||!Number.isInteger(s.rng.seed)||s.rng.seed<0||s.rng.seed>0xffffffff||!Number.isSafeInteger(s.rng.rolls)||s.rng.rolls<0)fail('Invalid digital dice state.');
 if(!s.medicine||!s.colonial||!s.setupChecklist||!s.setupConfirmed||!s.operationEvents)fail('Incomplete saved setup state.');
 if(!s.battleExemptions||Array.isArray(s.battleExemptions)||typeof s.battleExemptions!=='object'||Object.keys(s.battleExemptions).length>40)fail('Invalid Battle exception ledger.');
 if(typeof s.operationEvents.cultureGain!=='boolean'||typeof s.operationEvents.operationsRoll!=='boolean')fail('Invalid Operations progress flags.');
 for(const medicine of ['paraibo','mahimiana'])if(s.medicine[medicine]!==null)bounded(s.medicine[medicine],0,9,medicine);
 const ids=new Set();
 for(const p of s.pieces){
   if(!p||typeof p.id!=='string'||!/^[-A-Za-z0-9_]{1,100}$/.test(p.id)||ids.has(p.id)||!PIECE_TYPES.includes(p.type))fail('Invalid or duplicate piece in save.');
   ids.add(p.id);
   if(typeof p.location!=='string'||p.location.length>150)fail('Invalid piece location in save.');
   bounded(p.strength??0,0,20,'Strength');bounded(p.mpRating??4,0,20,'Movement rating');
 }
 const validBase=new Set([...SPACES.map(x=>x.id),'reserve','removed','operations','cup','enemy-display','hand','deck','check-draw','success-out','available-enemy-aps','enemy-resolution']);
 for(const p of s.pieces){
   const loc=p.location;
   if(validBase.has(loc)||/^enemy-display:(West|South|East|North):[A-F]$/.test(loc)||/^enemy-inactive:[A-F]$/.test(loc))continue;
   if(loc.startsWith('box:') && s.pieces.some(x=>x.id===loc.slice(4)&&x.type==='Rancheria'&&x.location!=='removed'))continue;
   if(loc.startsWith('held:') && p.type!=='Band'&&s.pieces.some(x=>x.id===loc.slice(5)&&x.type==='Band'&&x.location!=='removed'))continue;
   if(loc.startsWith('medicine:') && p.subtype==='Success'&&sHasMahimiana(s,loc.slice(9)))continue;
   fail(`Invalid piece location in save: ${loc}.`);
 }
 if(s.warMovementDrawn!==undefined&&s.warMovementDrawn!==null&&!warCard(s.warMovementDrawn))fail('Invalid War movement draw record.');
 if(s.warEventResolved!==undefined&&s.warEventResolved!==null&&!warCard(s.warEventResolved))fail('Invalid resolved War Card marker.');
 if(s.warHigherStakesResolved!==undefined&&typeof s.warHigherStakesResolved!=='boolean')fail('Invalid Higher Stakes completion marker.');
 if(s.developmentPending!==undefined&&s.developmentPending!==null){
  const p=s.developmentPending;
  if(!p||typeof p.cardId!=='string'||!s.cards.some(c=>c.id===p.cardId&&c.kind==='Development'&&['In play','Display'].includes(c.zone))||typeof p.reason!=='string'||p.reason.length>200)fail('Invalid pending Development card effect.');
 }
 if(s.epidemicTakeActionsApplied!==undefined&&typeof s.epidemicTakeActionsApplied!=='boolean')fail('Invalid Epidemic operation ledger.');
 if(s.developmentPlanningApplied!==undefined&&typeof s.developmentPlanningApplied!=='boolean')fail('Invalid Planning development-effect ledger.');
 if(s.greatHuntBandId!==undefined&&s.greatHuntBandId!==null&&(!s.pieces.some(p=>p.id===s.greatHuntBandId&&p.type==='Band')||s.activeBandId!==s.greatHuntBandId))fail('Invalid Great Hunt active Band.');
 const cardIds=new Set();for(const c of s.cards){
   if(!c||typeof c.id!=='string'||!/^[-A-Za-z0-9_]{1,100}$/.test(c.id)||cardIds.has(c.id)||!['History','Development','Culture','War'].includes(c.kind)||!['Deck','Display','Hand','In play','War Event','Discard','Removed','Available'].includes(c.zone))fail('Invalid or duplicate card in save.');
   if(!CARD_EVIDENCE_STATES.includes(c.evidenceStatus??'unverified')||typeof (c.sourceReference??'')!=='string'||(c.sourceReference??'').length>300||
      (c.evidenceStatus??'unverified')!=='unverified'&&(!String(c.identifier||'').trim()||(c.sourceReference??'').trim().length<8)||
      typeof c.identifier!=='string'||c.identifier.length>40||typeof c.title!=='string'||c.title.length>120||typeof c.notes!=='string'||c.notes.length>1000)fail('Invalid card evidence or text in save.');
   cardIds.add(c.id);
 }
 const edgeIds=new Set();for(const e of s.edges){
   if(!SPACE[e.a]||!SPACE[e.b]||e.a===e.b||!['solid','dashed'].includes(e.kind))fail('Invalid map connection in save.');
   if(e.enemyFor!==undefined&&(!Array.isArray(e.enemyFor)||(e.enemyFor.length<1||e.enemyFor.length>2)||new Set(e.enemyFor).size!==e.enemyFor.length||!e.enemyFor.every(c=>['West','South','East'].includes(c))||e.kind!=='solid'))fail('Invalid colored Enemy Connection in save.');
   const id=[e.a,e.b].sort().join('|');if(edgeIds.has(id))fail('Duplicate map connection in save.');edgeIds.add(id);
 }
 assertNoContradictedSouthLinks(s.edges);
 for(const x of ['military','culture','ap','enemyAp'])bounded(s.tracks[x],0,9,x);
 for(const x of ['movement','operations','passage'])bounded(s.tracks[x],0,20,x);
 if(s.activeBandId&&!s.pieces.some(p=>p.id===s.activeBandId&&p.type==='Band'))fail('Invalid active Band in save.');
 if(s.pending && (s.pending.type!=='raid'||!s.pieces.some(p=>p.id===s.pending.bandId&&p.type==='Band')))fail('Invalid pending procedure in save.');
 if(s.successCheck){
  const c=s.successCheck;
  if(!s.pending||s.pending.type!=='raid'||c.bandId!==s.pending.bandId||!Number.isInteger(c.expected)||c.expected<0||c.expected>25||!Number.isInteger(c.base)||!Number.isInteger(c.bonus)||c.expected!==c.base+c.bonus+(c.shieldBonus||0)||!Number.isInteger(c.shieldBonus??0)||(c.shieldBonus??0)<0||(c.shieldBonus??0)>1||!Array.isArray(c.drawIds)||c.drawIds.length>c.expected||new Set(c.drawIds).size!==c.drawIds.length||c.mahimianaId&&!sHasMahimiana(s,c.mahimianaId))fail('Invalid pending Success Check in save.');
  const canceled=c.canceledDrawIds??[],attempts=c.gunAttempts??[];
  if(!Array.isArray(canceled)||!Array.isArray(attempts)||canceled.length>c.drawIds.length||attempts.length>c.drawIds.length||!Number.isInteger(c.redraws??0)||(c.redraws??0)<0||(c.redraws??0)>1000||new Set(canceled).size!==canceled.length||new Set(attempts.map(a=>a.counterId)).size!==attempts.length)fail('Invalid pending Success Check resource history.');
  if(c.drawIds.some(id=>!s.pieces.some(p=>p.id===id&&p.location===(canceled.includes(id)?'cup':'check-draw'))))fail('Invalid pending Success Check draw locations.');
  if(canceled.some(id=>!c.drawIds.includes(id)||!s.pieces.some(p=>p.id===id&&/^Enemy AP [234]$/.test(p.subtype))))fail('Invalid canceled Enemy AP in save.');
  if(attempts.some(a=>!a||!c.drawIds.includes(a.counterId)||!s.pieces.some(p=>p.id===a.gunId&&p.type==='Resource'&&p.subtype==='Guns')||!Number.isInteger(a.die)||a.die<1||a.die>6||!([2,3,4].includes(a.needed))||typeof a.canceled!=='boolean'||a.canceled!==(a.die>=a.needed)||canceled.includes(a.counterId)!==a.canceled))fail('Invalid Guns attempt in save.');
  if(canceled.some(id=>!attempts.some(a=>a.counterId===id&&a.canceled)))fail('Canceled AP lacks its Guns attempt in save.');
 }
 if(s.battlePending){
   const r=s.battlePending;
   if(!r||!s.battleContinuation||r.warId!==s.battleContinuation.warId||!s.pieces.some(p=>p.id===r.warId&&p.type==='War Column')||!s.pieces.some(p=>p.id===r.unitId&&['Band','Tribe'].includes(p.type))||!Array.isArray(r.dice)||r.dice.length!==(r.gunId?2:1)||r.dice.some(n=>!Number.isInteger(n)||n<1||n>6)||![true,false].includes(r.won)||!Number.isInteger(r.modified)||r.warStrength<1||r.warStrength>8||r.unitStrength<0||r.unitStrength>20)fail('Corrupted pending Battle result.');
   if(r.gunId&&!s.pieces.some(p=>p.id===r.gunId&&p.subtype==='Guns'&&p.location==='reserve'))fail('Spent Battle Guns must be in stock.');
 }
 if(s.battleContinuation&&(!s.pieces.some(p=>p.id===s.battleContinuation.warId&&p.type==='War Column')||!SPACE[s.battleContinuation.warLocation]))fail('Invalid ongoing Battle reference.');
 for(const [id,reason] of Object.entries(s.battleExemptions)){if(!/^[-A-Za-z0-9_]{1,100}$/.test(id)||typeof reason!=='string'||reason.length<15||reason.length>300||!s.pieces.some(p=>p.id===id&&p.type==='War Column'))fail('Invalid documented Battle exception.');}
 if(s.battleRounds&&(!Array.isArray(s.battleRounds)||s.battleRounds.length>100||s.battleRounds.some(r=>!r||!Array.isArray(r.dice)||typeof r.note!=='string'||typeof r.won!=='boolean')))fail('Invalid Battle journal.');
 if(s.pieces.some(p=>p.location==='check-draw'&&!s.successCheck?.drawIds.includes(p.id)))fail('Orphaned staged Success Check counter.');
 if(s.lastSuccessCheck && (!s.pending||!Number.isInteger(s.lastSuccessCheck.successes)||s.lastSuccessCheck.successes<0||s.lastSuccessCheck.bandId!==s.pending.bandId))fail('Invalid last Success Check result.');
 return true;
}
