import {warCard,warMovementAllowance,warEventPreview} from './war-card-effects.js';
import {MAP_EVIDENCE_EDGES, MAP_EVIDENCE_SOURCE, mapConnectionReconciliation} from './map-evidence.js';
import {assertNoContradictedSouthLinks} from './map-fact-checks.js';
/**
 * Comanchería tabletop companion — intentionally partial, versioned rules engine.
 * No GMT imagery or card text is redistributed. Source: Spring 2024 Living Rules.
 * A validated command is NOT a claim of full rules compliance. See README.
 */
export const VERSION = '1.18.0-setup-director';
const RAID_CUP_COMMANDS=['RAID_CUP_EMPTY_REDIRECT','RAID_CUP_SINGLE_BISON_HUNT','RAID_CUP_SAME_TERRITORY_HUNT','RAID_CUP_GUIDED_HUNT','RAID_CUP_GUIDED_ENCROACH','RAID_CUP_FORCED_ENCROACH','RAID_CUP_SINGLE_ALLY','RAID_CUP_CHOOSE_ALLY','RAID_CUP_CULTURE_ATTACK','RAID_CUP_SETTLE','RAID_CUP_SUBJUGATE','RAID_CUP_WAR_RAID','RAID_CUP_PEACE','RAID_CUP_EMPTY_HUNT','RAID_CUP_CONFIRM_EFFECT','RAID_CUP_ROLL_SWAP','RAID_CUP_REROLL_SWAP','RAID_CUP_EXCHANGE'];
export const RULES_SOURCE = 'GMT Games, Comanchería Second Edition Living Rules, Spring 2024';
// Die faces printed on the physical map; these are not geographical sort order.
// 1 UA, 2 LA, 3 LE, 4 RR, 5 RG, 6 BC.
// Sources: GMT Living Rules §2.2, Living Play Book pp. 15 and 19,
// and authentic printed board die-symbol locations.
export const TERRITORIES = [
  ['UA','Upper Arkansas'], ['LA','Lower Arkansas'], ['LE','Llano Estacado'],
  ['RR','Red River'], ['RG','Rio Grande'], ['BC','Brazos Colorado']
];
export const TERRITORY_DIE_ORDER=Object.freeze(TERRITORIES.map(([id])=>id));
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
// Source: owner-supplied Comanchería Living Rules (Spring 2024), §§9.1–9.6.
export const SCENARIO_DETAILS=Object.freeze({
 plains:{rule:'9.2',difficulty:'Easy',periods:'1700–1749',finalHistory:'H1',startPeriod:1},
 rise:{rule:'9.3',difficulty:'Moderate',periods:'1700–1799',finalHistory:'H2',startPeriod:1},
 lords:{rule:'9.4',difficulty:'Hard',periods:'1700–1849',finalHistory:'H3',startPeriod:1},
 downfall:{rule:'9.5',difficulty:'Very Hard',periods:'1800–1875',finalHistory:'H4',startPeriod:3},
 campaign:{rule:'9.6',difficulty:'Hardest',periods:'1700–1875',finalHistory:'H4',startPeriod:1}
});
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
/** Raid §5.2.3 step 4: a complete, read-only plan. Never guess the
 * instruction belonging to an inherited Peace Space or its printed AP cost. */
export function raidPeaceResolutionPreview(s,location){
 const status=peaceSpaceStatus(s,location);
 if(!status.peace)return {ready:true,peace:false};
 const candidates=s.pieces.filter(p=>p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype)&&(
   p.location===location||(['E1','E2'].includes(location)&&['E1','E2'].includes(p.location))));
 // For a Settlement inheriting Peace from its owning Enemy, use only a
 // unique square Peace Instruction belonging to the same confirmed column.
 if(!candidates.length&&SPACE[location]?.type==='round'){
   const settlers=s.pieces.filter(p=>p.type==='Settlement'&&p.location===location);
   const matching=settlers.flatMap(settlement=>{
     const direct=directionForOwner(settlement.owner);
     const owners=direct?[direct]:ENEMY_COLUMNS.filter(x=>s.colonial?.[x]===settlement.owner);
     if(owners.length!==1)return [];
     const squares=owners[0]==='East'?['E1','E2']:[{West:'W',South:'S',North:'N'}[owners[0]]];
     return s.pieces.filter(p=>p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype)&&squares.includes(p.location)&&p.owner===owners[0]);
   });
   candidates.push(...new Map(matching.map(p=>[p.id,p])).values());
 }
 if(candidates.length!==1)return {ready:false,peace:true,reason:'Peace Space requires one unambiguous recorded Peace/Ally Instruction.'};
 const instruction=candidates[0];
 if(!Number.isInteger(instruction.strength)||instruction.strength<1||instruction.strength>20)return {ready:false,peace:true,reason:'Record the printed Peace/Ally AP cost before rolling.'};
 if(!ENEMY_COLUMNS.includes(instruction.owner))return {ready:false,peace:true,reason:'Peace/Ally Instruction owner is not verified.'};
 const row=[...DISPLAY_ROWS].reverse().find(row=>!s.pieces.some(p=>p.location===`enemy-display:${instruction.owner}:${row}`));
 if(!row)return {ready:false,peace:true,reason:'No empty Enemy Instruction display slot is recorded for a possible Peace/Ally return.'};
 return {ready:true,peace:true,instructionId:instruction.id,cost:instruction.strength,row,owner:instruction.owner};
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
export const TEMPLATE_SCENARIOS = Object.freeze(SCENARIOS.map(x=>x[0]));
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
/** Narrow card-effect proof for Culture §4.2, not blanket certification.
 * 01 applies after completed player actions (see applyApacheWar dispatch), 02 is a
 * hand-play card, 03 modifies Enemy Instructions, and 35/36 are hand-play
 * cards. None modifies the Culture gain/Operations check in the listed
 * zones. Unknown and other active cards are deliberately left blocking. */
const CULTURE_NON_MODIFIER_CARDS=Object.freeze({
 '01':'Apache War: after a completed player action, remove Tribes with 3+ Ravaged markers',
 '02':'Ute Alliance: hand-play; no Culture-operation modifier',
 '03':'War of Spanish Succession: Enemy Instruction exception',
 '19':'End of Ute Alliance: Upper Arkansas control exception already evaluated in territoryControlAudit',
 '35':'Vibrant Population: played from hand to unfinish Bands',
 '36':'Painted Shields: hand-play during a Success Check'
});
export function cultureCardEffectAudit(s){
 const reviewed=[],blockers=[];
 for(const c of s.cards||[]){
  if(!['Development','Culture','War'].includes(c.kind)||!['In play','Display','War Event'].includes(c.zone))continue;
  const n=c.kind==='Development'?String(Number(c.identifier)).padStart(2,'0'):null;
  if(n&&Object.hasOwn(CULTURE_NON_MODIFIER_CARDS,n)) reviewed.push({cardId:c.id,number:n,reason:CULTURE_NON_MODIFIER_CARDS[n]});
  else blockers.push({cardId:c.id,kind:c.kind,number:n,reason:'No verified Culture/Operations non-modifier proof for this active card'});
 }
 return {safe:!blockers.length,reviewed,blockers};
}
export function cultureGainPreview(s,declaredControlled=null){
 const audit=territoryControlAudit(s);
 const controlled=declaredControlled===null?audit.filter(x=>x.status==='controlled').map(x=>x.id):declaredControlled;
 if(!Array.isArray(controlled)||new Set(controlled).size!==controlled.length||controlled.some(id=>!TERRITORIES.some(t=>t[0]===id)))fail('Select distinct, recognised controlled territories.');
 const ranchTerritories=cultureBaseTerritories(s);
 const mismatches=audit.filter(x=>x.status==='controlled'&&!controlled.includes(x.id)||x.status==='not-controlled'&&controlled.includes(x.id)||x.status==='review-needed');
 return {ranchTerritories,declaredControlled:[...controlled],gain:ranchTerritories.length+controlled.length,audit,mismatches};
}
/** Printed TTS H3 (1800–1849) Victory Objective. The player must confirm
 * the digital ledger matches the physical board before applying it.
 * H4 directs players to the scenario §9 victory grade instead. */
export function historyObjectiveAudit(s){
 const control=territoryControlAudit(s);
 const ranchTerritories=new Set(s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]?.type==='round').map(p=>SPACE[p.location].territory));
 if(s.period===1){
  // 2024 Living Play Book, p.4: control Upper Arkansas AND have a
  // Ranchería in a second, different territory.
  const upper=control.find(t=>t.id==='UA');
  const other=[...ranchTerritories].filter(id=>id!=='UA');
  const result=!other.length||upper.status==='not-controlled'?'not-met':upper.status==='review-needed'?'unknown':'met';
  return {history:'H1',source:'GMT 2024 Living Play Book p.4, H1 victory objective',result,
   controlled:upper.status==='controlled'?1:0,uncertainTerritories:upper.status==='review-needed'?[upper.name]:[],
   rancheriaTerritories:[...ranchTerritories],reason:`H1: Upper Arkansas ${upper.status}; Ranchería in another territory ${other.length?other.join(', '):'absent'}. Both are required.`};
 }
 if(s.period===2){
  // The H2 condition is stated in the official Downfall setup §9.5.F:
  // control two different territories and have a Ranchería in a third.
  const proven=control.filter(t=>t.status==='controlled').map(t=>t.id);
  const possible=control.filter(t=>t.status!=='not-controlled').map(t=>t.id);
  const eligible=ids=>[...ranchTerritories].some(r=>ids.filter(t=>t!==r).length>=2);
  const result=eligible(proven)?'met':eligible(possible)?'unknown':'not-met';
  return {history:'H2',source:'GMT 2024 Living Rules §9.5.F (explicit H2 objective)',result,
   controlled:proven.length,uncertainTerritories:control.filter(t=>t.status==='review-needed').map(t=>t.name),
   rancheriaTerritories:[...ranchTerritories],reason:`H2: ${proven.length} proven controlled territories (${proven.join(', ')||'none'}), ${[...ranchTerritories].join(', ')||'no'} Ranchería territories. Need two controlled territories plus a Ranchería in a third distinct territory.`};
 }
 if(s.period===3){
  const control=territoryControlAudit(s),certain=control.filter(x=>x.status==='controlled').length;
  const uncertain=control.filter(x=>x.status==='review-needed');
  const rancherias=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).length;
  const settlements=s.pieces.filter(p=>p.type==='Settlement'&&SPACE[p.location]).length;
  const minimum=rancherias+certain,maximum=minimum+uncertain.length;
  const result=minimum>settlements?'met':maximum<=settlements?'not-met':'unknown';
  return {history:'H3',source:'Owner-supplied TTS H3 objective face (1800–1849)',result,rancherias,settlements,controlled:certain,uncertainTerritories:uncertain.map(t=>t.name),minimum,maximum,reason:`H3: ${rancherias} in-play Rancherías + ${certain} proven controlled Territories (${uncertain.length} uncertain) versus ${settlements} in-play Settlements. Objective requires strictly more.`};
 }
 if(s.period===4&&['campaign','downfall'].includes(s.scenario)){
  const reservation=s.pieces.filter(p=>p.type==='Rancheria'&&p.location==='RESERVATION').length;
  const military=s.tracks.military;
  const grade=military>=2*reservation?'major victory':military>reservation?'minor victory':'minor defeat';
  return {history:'H4',source:'2024 Living Rules §§9.5–9.6 and owner-supplied TTS H4 objective face',result:grade==='minor defeat'?'not-met':'met',grade,military,reservation,reason:`H4 scenario grading: ${military} Military Points and ${reservation} Rancherías in the Reservation gives ${grade}.`};
 }
 return {history:`H${s.period}`,source:'Printed History Card required',result:'unknown',reason:`H${s.period} objective has not been transcribed and validated for automatic calculation.`};
}
/** Preflight the complete §3.1 step-5 sacrifice alternative without guessing
 * a North target, resolving a printed card exception, or modifying the ledger.
 * Multiple columns are selected by a seeded die during the actual command.
 */
export function rancheriaSacrificePreview(s,rancheriaId){
 if(s.phase!=='war'||!['done','na'].includes(s.steps?.w1)||!['done','na'].includes(s.steps?.w2)||!['done','na'].includes(s.steps?.w3)||s.steps?.w4!=='done'||s.steps?.w5==='done')return {ready:false,reason:'Finish War steps 1–4 before the Ranchería step-5 choice.'};
 if(s.pending||s.successCheck||s.warMovement||s.battlePending||s.battleContinuation||s.developmentPending||s.enemyFlow)return {ready:false,reason:'Finish the existing War, card or Battle procedure first.'};
 const card=activeWarCard(s),cardId=String(card?.identifier||'').toUpperCase();
 if(s.steps.w3==='done'&&card&&cardId!==s.warEventResolved&&(
  ['W09','W10','W11','W12','W13'].includes(cardId)||(['W03','W04','W22'].includes(cardId)&&fastColumnEligible(s).length)))
  return {ready:false,reason:`Resolve the ${cardId} War Event before choosing a Ranchería response.`};
 const obligation=warRancheriaObligations(s).find(x=>x.rancheriaId===rancheriaId);
 if(!obligation||!obligation.bandIds.length)return {ready:false,reason:'Choose a besieged Ranchería with at least one defending Band.'};
 if(obligation.warIds.length>6)return {ready:false,reason:'More than six columns require a separately verified random-selection procedure.'};
 const wars=obligation.warIds.map(id=>item(s,id));
 for(const w of wars){
  if(!ENEMY_COLUMNS.includes(w.owner))return {ready:false,reason:'An attacking War Column has an unknown enemy affiliation.'};
  const partners=s.pieces.filter(p=>p.type==='Instruction'&&p.owner===w.owner&&p.location===w.location&&['War','Raid'].includes(p.subtype));
  if(partners.length!==1)return {ready:false,reason:`${w.id}: requires exactly one stacked War/Raid Instruction.`};
  if(w.strength===1){try{warEndsPreview(s,w.id);}catch(err){return {ready:false,reason:err.message};}}
 }
 const captives=s.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Captives'&&!['reserve','removed'].includes(p.location));
 // Do not remove other players' or enemy-owned counters as collateral.
 if(captives.some(p=>p.owner&&p.owner!=='Comanche'))return {ready:false,reason:'Captive ownership is ambiguous; reconcile the physical ledger.'};
 const north=wars.some(w=>w.owner==='North');
 const targets=north?s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round'&&!s.pieces.some(a=>a.location===p.location&&['Instruction','Marker'].includes(a.type)&&a.subtype==='Ally')).map(p=>({id:p.id,label:p.label,location:p.location})):[];
 if(north&&!targets.length)return {ready:false,reason:'North has no recorded non-Allied Tribe destination. Confirm the printed exception manually.'};
 return {ready:true,rancheriaId,warIds:obligation.warIds,randomWarSelection:obligation.warIds.length>1,
  northTargets:targets,requiresNorthTarget:north,captiveIds:captives.map(p=>p.id),
  reason:'The sacrifice removes 2 Military Points and all Captives, reduces the selected War Column by 1, and returns or displaces it.'};
}
/** Pure preflight of the alternate §3.1 step-5 decision: pay 1 Military,
 * then fight a Battle. Does not roll a die or select a particular War Column.
 * A separate Battle action records the round only after this cost has been paid.
 */
export function rancheriaFightPreview(s,rancheriaId){
 if(s.phase!=='war'||!['done','na'].includes(s.steps?.w1)||!['done','na'].includes(s.steps?.w2)||!['done','na'].includes(s.steps?.w3)||s.steps?.w4!=='done'||s.steps?.w5==='done')return {ready:false,reason:'Complete War steps 1–4 before defending a Ranchería.'};
 if(s.pending||s.successCheck||s.warMovement||s.battlePending||s.battleContinuation||s.developmentPending||s.enemyFlow||s.victoryPending)return {ready:false,reason:'An earlier procedure or Battle must finish first.'};
 const card=activeWarCard(s),cardId=String(card?.identifier||'').toUpperCase();
 if(s.steps.w3==='done'&&card&&cardId!==s.warEventResolved&&(['W09','W10','W11','W12','W13'].includes(cardId)||(['W03','W04','W22'].includes(cardId)&&fastColumnEligible(s).length)))return {ready:false,reason:`Resolve the ${cardId} War Event first.`};
 const o=warRancheriaObligations(s).find(x=>x.rancheriaId===rancheriaId);
 if(!o||!o.bandIds.length)return {ready:false,reason:'This Ranchería has no eligible defending Band or War Column.'};
 if(o.warIds.length>6)return {ready:false,reason:'More than six War Columns requires a separate printed random-selection procedure.'};
 for(const id of o.warIds){
  const w=item(s,id);
  if(!ENEMY_COLUMNS.includes(w.owner))return {ready:false,reason:`${id} has no known Enemy affiliation.`};
  const partners=s.pieces.filter(p=>p.type==='Instruction'&&p.owner===w.owner&&p.location===w.location&&['War','Raid'].includes(p.subtype));
  if(partners.length!==1)return {ready:false,reason:`${id} must have exactly one paired War/Raid Instruction.`};
  if(w.strength===1){try{warEndsPreview(s,w.id);}catch(err){return {ready:false,reason:err.message};}}
 }
 return {ready:true,rancheriaId,warIds:o.warIds,bandIds:o.bandIds,randomWarSelection:o.warIds.length>1,reason:'Pay 1 Military Point (with 2:1 Culture substitution if needed), then fight this selected War Column until Battle Ends.'};
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
/** §3.1 step 5 is mandatory even when a Ranchería has no Bands.
 * Those exposures are NOT reported by warBattleObligations, which only
 * enumerates defenders eligible to fight. */
export function warRancheriaObligations(s){
 if(s.phase!=='war')return [];
 return s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).flatMap(r=>{
  const wars=s.pieces.filter(p=>p.type==='War Column'&&p.location===r.location&&p.strength>0);
  if(!wars.length)return [];
  const bands=s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${r.id}`&&p.strength>0);
  return [{rancheriaId:r.id,location:r.location,warIds:wars.map(w=>w.id),bandIds:bands.map(b=>b.id),mode:bands.length?'battle-or-sacrifice':'destroy-unprotected'}];
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
/** §7.2 / §2.6.1: settle a Band's defeat without orphaning possessions.
 * Unrelated Mahimianas may legally be held by this Band. All counter moves
 * remain one transactional engine command; callers preflight on a clone.
 */
function defeatedBandPossessions(s,band,{destroyedRancheria=false}={}){
 const heldCounters=s.pieces.filter(p=>p.location===`held:${band.id}`);
 if(heldCounters.some(p=>!['Resource','Mahimiana'].includes(p.type)))
  fail('Band has an unsupported possessed counter; verify its printed destination.');
 const chiefs=heldCounters.filter(p=>p.type==='Mahimiana');
 if(chiefs.length>1)fail('Multiple possessed Mahimiana counters; verify physical counter identity.');
 for(const chief of chiefs){
  const successes=s.pieces.filter(p=>p.subtype==='Success'&&p.location===`medicine:${chief.id}`);
  setMedicine(s,chief,0);
  chief.location='reserve';
  for(const counter of successes)counter.location=destroyedRancheria?'cup':'success-out';
 }
 const resources=heldCounters.filter(p=>p.type==='Resource');
 for(const resource of resources)resource.location='reserve';
 band.location='reserve';band.strength=0;band.finished=true;
 return {resources:resources.length,mahimianas:chiefs.map(p=>p.id)};
}
function defeatedBandAudit(s,band,{destroyedRancheria=false}={}){
 const heldCounters=s.pieces.filter(p=>p.location===`held:${band.id}`);
 if(heldCounters.some(p=>!['Resource','Mahimiana'].includes(p.type)))fail('Unsupported possessed counter requires physical verification.');
 const chiefs=heldCounters.filter(p=>p.type==='Mahimiana');
 if(chiefs.length>1)fail('The Band cannot automatically reconcile multiple possessed Mahimianas.');
 return {resources:heldCounters.filter(p=>p.type==='Resource').length,chiefs:chiefs.map(p=>p.id),destroyedRancheria};
}
/** Pure battle resolution audit. Never changes counters or consumes a die.
 * Only rules with deterministically known destinations are auto-resolved. */
export function battleAutoResolutionPreview(s){
 const r=s.battlePending;
 if(!r)return {ready:false,reason:'No recorded Battle round awaits reconciliation.'};
 if(r.cardDrm!==0)return {ready:false,reason:'A card-specific Battle modifier requires a verified printed effect.'};
 let war,unit;
 try{war=item(s,r.warId);unit=item(s,r.unitId);}catch(err){return {ready:false,reason:err.message};}
 if(war.type!=='War Column'||war.location!==r.warLocation||war.strength!==r.warStrength||unit.strength!==r.unitStrength||unit.location!==r.unitLocation)
  return {ready:false,reason:'A Battle counter or its location changed since the roll.'};
 if(r.won){
  if(r.warStrength>1)return {ready:true,kind:'reduce-war',reason:`Reduce the War Column to ${r.warStrength-1}; continue Battle.`};
  try{warEndsPreview(s,r.warId);}catch(err){return {ready:false,reason:err.message};}
  if(r.mahimianaId){
   const chief=s.pieces.find(p=>p.id===r.mahimianaId&&p.type==='Mahimiana'&&p.location===`held:${unit.id}`);
   if(!chief)return {ready:false,reason:'The participating Mahimiana is no longer possessed by the battling Band.'};
   if(medicineValue(s,chief)===null)return {ready:false,reason:'The participating Mahimiana Medicine rating is unknown.'};
  }
  return {ready:true,kind:'war-ends',reason:'Return the War Column and its paired Instruction; grant the participating Mahimiana +1 Medicine up to 6.'};
 }
 if(r.unitType==='Band'){
  if(r.unitStrength>1)return {ready:true,kind:'reduce-band',reason:`Reduce the Band to ${r.unitStrength-1}; continue Battle.`};
  let death;
  try{death=defeatedBandAudit(s,unit,{destroyedRancheria:Boolean(r.rancheriaId)});}catch(err){return {ready:false,reason:err.message};}
  if(r.rancheriaId){
   const ranch=s.pieces.find(p=>p.id===r.rancheriaId&&p.type==='Rancheria'&&p.location===r.warLocation);
   if(!ranch)return {ready:false,reason:'The Ranchería moved or its affiliation is no longer verifiable.'};
   const others=s.pieces.filter(p=>p.type==='Band'&&p.id!==unit.id&&p.location===`box:${r.rancheriaId}`&&p.strength>0);
   if(others.length)return {ready:true,kind:'ranch-band-defeated',reason:`Band falls: ${death.resources} possessed Resources returned, ${death.chiefs.length} Mahimiana death(s) resolved; surviving Ranchería Bands continue Battle.`};
   try{
    warEndsPreview(s,r.warId);
    const check=clone(s);
    const dead=item(check,unit.id);dead.strength=0;dead.finished=true;
    pointLossPreview(check,'military',1);
    destroyRancheriaByRule(check,r.rancheriaId);
   }catch(err){return {ready:false,reason:`Ranchería destruction requires reconciliation: ${err.message}`};}
   return {ready:true,kind:'ranch-destroyed',reason:'Last Ranchería Band falls: possessed Resources return, Mahimiana death and Success-cup exception apply with War Ends and both Military losses.'};
  }
  return {ready:true,kind:'band-defeated',reason:`Band returns to stock with ${death.resources} possessed Resources and ${death.chiefs.length} deceased Mahimiana(s); Battle ends.`};
 }
 if(r.unitType==='Tribe'){
  const allies=s.pieces.filter(p=>p.location===r.warLocation&&p.type==='Instruction'&&p.subtype==='Ally'&&ENEMY_COLUMNS.includes(p.owner));
  if(allies.length!==1)return {ready:false,reason:'Exactly one identified Allied Tribe Instruction is required for automatic return.'};
  const ally=allies[0];
  const slot=DISPLAY_ROWS.find(row=>!s.pieces.some(p=>p.id!==ally.id&&p.location===`enemy-display:${ally.owner}:${row}`));
  if(!slot)return {ready:false,reason:'The Allied Instruction display is full; confirm its printed return destination.'};
  return {ready:true,kind:'ally-defeated',allyId:ally.id,destination:`enemy-display:${ally.owner}:${slot}`,reason:'Return the uniquely paired Ally Instruction to its owner’s first vacant display slot; the Tribe stays in place and Battle ends.'};
 }
 return {ready:false,reason:'Unknown defender or unsupported Battle consequence.'};
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
// The display's SIX RED DICE are vertically printed from 1 to 6, independent
// of the History-card Enemy Action Table die. Source: GMT 2nd Printing official
// product display photograph and Living Rules §6.2.2 A/B/C. A–F below are
// ledger *positions* (not the alphabetic ID printed on each mobile counter).
export const ENEMY_DISPLAY_DIE_ROWS=Object.freeze({1:'A',2:'B',3:'C',4:'D',5:'E',6:'F'});
export function enemyDisplayRowForDie(die){
 const row=ENEMY_DISPLAY_DIE_ROWS[Number(die)];
 if(!row)fail('Enemy Instruction display die must be 1–6.');
 return row;
}
// Source-backed visible NON-STRIPED faces from GMT Games' product photograph.
// These are the 24 starting A–F counters, NOT their unknown striped backs.
// No card artwork is stored or redistributed. An unverified opposite face is
// never substituted with the visible front's action or AP value.
export const ENEMY_INSTRUCTION_FRONTS=Object.freeze({
 West:Object.freeze([['Subjugate',3],['Culture Attack',3],['Settle',4],['War',3],['Peace',3],['Settle',3]]),
 South:Object.freeze([['Settle',3],['Subjugate',4],['Settle',3],['Peace',3],['War',4],['Culture Attack',3]]),
 East:Object.freeze([['Peace',4],['Hunt',2],['Subjugate',3],['Settle',5],['Culture Attack',4],['Settle',3]]),
 North:Object.freeze([['Raid',2],['Ally',3],['Hunt',2],['Hunt',3],['Ally',3],['Hunt',2]])
});
// Four striped sides are identified by the Living Play Book tutorial:
// West D: War 3 → Culture 4; West C: Settle 4 → War 4;
// South B: Subjugate 4 → War 3; North F: Hunt 2 → Encroach 5.
// The unique West Settle 4 counter is also photographed flipped.
// Others remain unknown until checked against actual physical counters.
export const VERIFIED_ENEMY_COUNTER_BACKS=Object.freeze({
 'West:C':Object.freeze(['War',4]),
 'West:D':Object.freeze(['Culture Attack',4]),
 'South:B':Object.freeze(['War',3]),
 'North:F':Object.freeze(['Encroach',5])
});
const VALID_INSTRUCTION_KINDS=Object.freeze(['Ally','Culture Attack','Encroach','Hunt','Peace','Raid','Recover','Settle','Subjugate','War']);
/** The counter's current face, not merely its printed alphabetic ID, controls
 * both rules effect and paid AP cost. The opposite side may be source-unknown. */
function flipInstructionFace(p){
 if(p.type!=='Instruction')fail('Only a physical Enemy Instruction counter can be flipped.');
 if(p.frontKind===undefined){
  // Legacy/hand-entered counters can still be flipped, but their unseen face
  // must be verified independently; never carry the old identity across.
  p.frontKind=p.flipped?'':p.subtype;
  p.frontCost=p.flipped?0:p.strength;
  p.backKind=p.flipped?p.subtype:'';
  p.backCost=p.flipped?p.strength:0;
 }
 p.flipped=!Boolean(p.flipped);
 const side=p.flipped?'back':'front';
 p.subtype=String(p[side+'Kind']||'Unknown');
 p.strength=Number(p[side+'Cost'])||0;
 p.faceEvidence=p.subtype==='Unknown'?'unverified':'recorded';
}

/** §6.2.2.C cup draws ALWAYS resolve the non-striped face. Never
 * keep a display-flipped back side active after exchanging to the cup. */
function restoreInstructionFront(p){
 if(p.type!=='Instruction')fail('Only Enemy Instructions have a front face.');
 if(p.frontKind!==undefined){
  if(!VALID_INSTRUCTION_KINDS.includes(p.frontKind)||!Number.isInteger(p.frontCost)||p.frontCost<1)
   fail('The printed non-striped face for '+p.id+' has not been verified. Reconcile that physical counter before returning it to the cup.');
  p.flipped=false;p.subtype=p.frontKind;p.strength=p.frontCost;p.faceEvidence='recorded';
 }else{
  if(p.flipped||p.subtype==='Unknown'||!VALID_INSTRUCTION_KINDS.includes(p.subtype)||!Number.isInteger(p.strength)||p.strength<1)
   fail('An exchanged legacy counter has no verified non-striped face; reconcile the physical counter before returning it to the cup.');
  p.frontKind=p.subtype;p.frontCost=p.strength;p.backKind='';p.backCost=0;p.flipped=false;
 }
}
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
/** §6.3.5 War Column / Peace branch. State-only preview, no RNG consumed. */
export function peaceWarColumnPreview(s){
 const f=s.enemyFlow;
 if(!f||f.stage!=='effect'||!f.currentId||instructionName(s.pieces.find(p=>p.id===f.currentId))!=='Peace')
   return {ready:false,reason:'Select a Peace Instruction in an Enemy procedure.'};
 if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.peaceWarResolved,f.warRaidResolved,f.cardNoEffectResolved].some(Boolean))
   return {ready:false,reason:'An effect has already been resolved.'};
 const audit=peaceTargetPreview(s,f.enemy);
 if(audit.recoverFirst||audit.unknownRavaged)return {ready:false,reason:'Resolve Recover priority / unknown Ravaged ownership first.'};
 const wars=s.pieces.filter(p=>p.type==='War Column'&&p.owner===f.enemy&&SPACE[p.location]&&p.strength>0);
 if(wars.length!==1)return {ready:false,reason:wars.length?'Multiple active War Columns require physical adjudication.':'No active War Column; use ordinary Peace placement.'};
 const war=wars[0],peace=s.pieces.find(p=>p.id===f.currentId),row=`enemy-inactive:${f.currentRow}`;
 if(!Number.isInteger(peace.strength)||peace.strength<1||peace.strength>20)return {ready:false,reason:'Enter the verified printed Peace AP cost first.'};
 if(s.pieces.some(p=>p!==peace&&p.location===row))return {ready:false,reason:'The Inactive instruction row is occupied.'};
 const stop=warColumnStopUnits(s,war.id).length>0;
 const hasTargets=s.pieces.some(p=>(p.type==='Rancheria'||p.type==='Band'&&p.strength>0)&&SPACE[p.location]&&(war.owner==='North'||p.location!=='PD'));
 const mode=stop?'engaged':war.strength<peace.strength?'war-ends':!hasTargets?'no-targets':'advance';
 if(mode==='advance'&&!s.edges.some(e=>(e.a===war.location||e.b===war.location)&&(war.owner==='North'||e.kind!=='dashed')))return {ready:false,reason:'No recorded legal outgoing connection for the required one-space War movement. Verify the map before proceeding.'};
 if(mode==='war-ends'||mode==='no-targets'&&war.strength===1){
  try{warEndsPreview(s,war.id);}catch(e){return {ready:false,reason:e.message};}
 }
 return {ready:true,mode,warId:war.id,from:war.location,cost:peace.strength,strength:war.strength,
  reason:mode==='engaged'?'War Column shares a space with a defender: Peace has no other effect.':mode==='war-ends'?'War strength is below Peace AP cost: War Ends.':mode==='no-targets'?'No visible Ranchería/Band: verify no target, lose 1 strength, then check attrition if column survives.':'Move one map connection according to §3.1, then roll attrition.'};
}
/** Enemy War §6.3.10 and North Raid §6.3.6. Read-only preflight.
 * Printed map route/nearest-target evidence is still needed on the partial graph.
 */
export function enemyWarRaidPreview(s){
 const f=s.enemyFlow;
 if(!f||f.stage!=='effect'||!f.currentId)return {ready:false,reason:'Select an Enemy War or Raid Instruction.'};
 const instruction=s.pieces.find(p=>p.id===f.currentId),kind=instructionName(instruction);
 if(!['War','Raid'].includes(kind))return {ready:false,reason:'Selected instruction is not War or Raid.'};
 if(kind==='Raid'&&f.enemy!=='North'||kind==='War'&&f.enemy==='North')return {ready:false,reason:'Raid belongs to North; colonial enemies use War.'};
 if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.peaceWarResolved,f.warRaidResolved,f.cardNoEffectResolved].some(Boolean))return {ready:false,reason:'An Instruction effect is already resolved.'};
 if(!Number.isInteger(instruction.strength)||instruction.strength<1||instruction.strength>20)return {ready:false,reason:'Enter the printed Instruction AP cost.'};
 const inactive=`enemy-inactive:${f.currentRow}`;
 if(!f.fromCup&&s.pieces.some(p=>p!==instruction&&p.location===inactive))return {ready:false,reason:'Inactive display row occupied.'};
 const wars=s.pieces.filter(p=>p.type==='War Column'&&p.owner===f.enemy&&SPACE[p.location]&&p.strength>0);
 if(wars.length>1)return {ready:false,reason:'Multiple active War Columns require reconciliation.'};
 if(wars.length){
  const war=wars[0];
  const paired=s.pieces.filter(p=>p.type==='Instruction'&&p.owner===f.enemy&&p.location===war.location&&['War','Raid'].includes(instructionName(p)));
  if(paired.length!==1)return {ready:false,reason:'Existing War Column must have one physically paired War/Raid Instruction.'};
  if(warColumnStopUnits(s,war.id).length)return {ready:true,mode:'engaged',kind,warId:war.id,from:war.location,reason:'Column already engaged; Instruction ends without moving.'};
  const legal=s.edges.filter(e=>(e.a===war.location||e.b===war.location)&&(f.enemy==='North'||e.kind!=='dashed')).map(e=>e.a===war.location?e.b:e.a);
  if(!legal.length)return {ready:false,reason:'No recorded legal connection for one-space movement; verify map graph.'};
  return {ready:true,mode:'advance',kind,warId:war.id,from:war.location,legal,reason:'Move the active column with its paired Instruction, then roll attrition. Printed priority must be verified.'};
 }
 const recovery=recoverTargetAudit(s,f.enemy);
 if(recovery.candidates.length||recovery.ambiguousRavaged.length)return {ready:false,reason:'Recover priority applies; resolve History Card threshold before War/Raid.'};
 if(kind==='Raid'){
  const tribes=s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round'&&!s.pieces.some(q=>q.location===p.location&&q.type==='Instruction'&&instructionName(q)==='Ally'));
  if(!tribes.length)return {ready:false,redirect:'Encroach',reason:'No non-Allied Tribe: Raid redirects to Encroach §6.3.3.'};
  if(!s.pieces.some(p=>p.type==='Rancheria'&&SPACE[p.location])&&!s.pieces.some(p=>p.type==='Band'&&SPACE[p.location]))return {ready:false,reason:'No recorded Ranchería or Band to establish nearest Tribe.'};
  const stock=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='North'&&p.location==='reserve');
  if(!stock.length)return {ready:false,reason:'No available North War Column counter in physical stock.'};
  return {ready:true,mode:'form-raid',kind,warStock:stock.map(p=>({id:p.id,label:p.label})),tribes:tribes.map(p=>({id:p.id,location:p.location,label:p.label})),reason:'Verify the nearest non-Allied Tribe(s), then seeded random selection forms the Raid Column.'};
 }
 const squares=f.enemy==='West'?['W']:f.enemy==='South'?['S']:['E1','E2'];
 const peace=s.pieces.filter(p=>p.type==='Instruction'&&instructionName(p)==='Peace'&&squares.includes(p.location));
 if(peace.length){
  if(peace.length!==1)return {ready:false,reason:'Multiple Peace instructions occupy this Enemy’s squares.'};
  const row=[...DISPLAY_ROWS].reverse().find(r=>!s.pieces.some(p=>p.location===`enemy-display:${f.enemy}:${r}`));
  if(!row)return {ready:false,reason:'No empty Enemy display row to return the Peace counter.'};
  return {ready:true,mode:'peace-ends-war',kind,peaceId:peace[0].id,returnRow:row,reason:'War removes existing Peace and terminates without forming a column.'};
 }
 const stock=s.pieces.filter(p=>p.type==='War Column'&&p.owner===f.enemy&&p.location==='reserve');
 if(!stock.length)return {ready:false,reason:'No available colonial War Column strength counter in stock.'};
 const settlements=s.pieces.filter(p=>p.type==='Settlement'&&SPACE[p.location]&&(p.owner===f.enemy||p.owner===s.colonial?.[f.enemy])).length;
 return {ready:true,mode:'form-war',kind,squares,settlements,strength:Math.min(8,instruction.strength+settlements),reason:'Form colonial War Column, AP cost plus in-play Settlements, maximum 8; check card modifiers.'};
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
// These presets contain only facts printed in §§9.1–9.6. Player decisions are
// deliberately separate; in particular Downfall Ranchería/Bison positions are
// NOT fabricated from a default layout.
const DOWNFALL_SETTLEMENTS=Object.freeze([['RG-1','West'],['RG-4','South'],['RG-5','South'],['BC-6','South']]);
const DOWNFALL_TRIBES=Object.freeze(['RG-2','BC-4','RR-1','RR-2','LA-1','LA-2','LA-3']);
function setupBasePieces(s){
 for(const enemy of ['West','South','East','North']){
  for(const [index,letter] of [...'ABCDEF'].entries()){
   const [frontKind,frontCost]=ENEMY_INSTRUCTION_FRONTS[enemy][index];
   const knownBack=VERIFIED_ENEMY_COUNTER_BACKS[`${enemy}:${letter}`];
   s.pieces.push(makeTemplatePiece(`setup-instruction-${enemy}-${letter}`,'Instruction',frontKind,`${enemy} ${letter} · ${frontKind} ${frontCost}`,`enemy-display:${enemy}:${letter}`,frontCost,
      {owner:enemy,frontKind,frontCost,backKind:knownBack?.[0]||'',backCost:knownBack?.[1]||0,flipped:false,faceEvidence:'GMT-display-photo'}));
  }
  s.pieces.push(makeTemplatePiece(`setup-instruction-${enemy}-G`,'Instruction',`${enemy} G`,`${enemy} instruction G`,enemy==='North'?'operations':s.scenario==='downfall'&&enemy==='South'?'cup':'reserve',0,{owner:enemy}));
 }
 for(const [subtype,count] of [['Success',10],['Enemy AP 4',5],['Enemy AP 3',4],['Enemy AP 2',3]])
  for(let i=1;i<=count;i++)s.pieces.push(makeTemplatePiece(`setup-cup-${subtype.replaceAll(' ','-')}-${i}`,'Marker',subtype,subtype,'cup',0,{owner:'Neutral'}));
 // Reserved counters are not present on the board; they allow printed card
 // effects (notably Downfall #26 / #28) to require physical stock cleanly.
 s.pieces.push(makeTemplatePiece('setup-north-column-6','War Column','','North strength-6 Column','reserve',6,{owner:'North'}));
 s.pieces.push(makeTemplatePiece('setup-west-column-8','War Column','','West strength-8 Column','reserve',8,{owner:'West'}));
}
function setupCultureCards(s){
 for(let set=1;set<=8;set++)for(let level=1;level<=3;level++)s.cards.push({
  id:`setup-culture-set-${set}-level-${level}`,kind:'Culture',identifier:'',
  title:`${CULTURE_FAMILY_ORDER[set-1]} level ${level}`,zone:'Available',
  notes:'Printed Culture card; selected from its family/level during scenario setup.',evidenceStatus:'unverified',sourceReference:''
 });
 s.setupCultureSpent=0;s.setupCultureFinished=false;
}
function setupWarCards(s){
 s.cards.push(...Array.from({length:25},(_,i)=>({id:`setup-war-${i+1}`,kind:'War',identifier:'',title:`War deck position ${i+1}`,zone:'Deck',
   notes:'War Card identity is revealed on draw.',evidenceStatus:'unverified',sourceReference:''})));
}
function setupHistoryCards(s){
 const start=s.scenario==='downfall'?3:1;
 const end=finalPeriodForScenario(s.scenario);
 s.cards.push(...Array.from({length:4},(_,i)=>({id:`setup-history-${i+1}`,kind:'History',identifier:`H${i+1}`,title:'',
  zone:i+1===start?'In play':i+1>start&&i+1<=end?'Available':'Removed',notes:'',evidenceStatus:'unverified',sourceReference:''})));
}
function setupDevelopmentCards(s){
 const isDownfall=s.scenario==='downfall';
 const max=s.scenario==='plains'?21:s.scenario==='rise'?42:s.scenario==='lords'?63:84;
 const zone=n=>{
  if(isDownfall){
   if(n===35||n===36)return 'In play';
   if(n===40)return 'Hand';
   if(n===43||n===44||(n>=45&&n<=63))return 'Deck';
   if(n===26||n===28||n===38)return 'Available';
   return n>=64?'Available':'Removed';
  }
  return n<=3?'In play':n<=21?'Deck':n<=max?'Available':'Removed';
 };
 s.cards.push(...Array.from({length:84},(_,i)=>({id:`setup-dev-${i+1}`,kind:'Development',identifier:String(i+1),title:'',zone:zone(i+1),notes:'',evidenceStatus:'unverified',sourceReference:''})));
 s.setupDevelopmentPriority=isDownfall?['43','44']:[];
}
function setupDownfall(s){
 s.colonial={West:'Spain',South:'Spain',East:'Texas'};
 s.pieces.push(...DOWNFALL_SETTLEMENTS.map(([loc,owner])=>makeTemplatePiece(`setup-settlement-${loc}`,'Settlement',owner,`${owner} settlement`,loc,0,{owner})));
 s.pieces.push(...DOWNFALL_TRIBES.map(loc=>makeTemplatePiece(`setup-tribe-${loc}`,'Tribe','','Tribe',loc)));
 for(let i=1;i<=9;i++)s.pieces.push(makeTemplatePiece(`setup-downfall-bison-${i}`,'Bison','','Bison','reserve'));
 for(const letter of 'ABC'){
  s.pieces.push(makeTemplatePiece(`setup-ranch-${letter}`,'Rancheria',letter,`Ranchería ${letter}`,'reserve'));
  s.pieces.push(makeTemplatePiece(`setup-mahimiana-${letter}`,'Mahimiana',letter,`Mahimiana ${letter}`,`box:setup-ranch-${letter}`,0,{affiliatedRancheriaId:`setup-ranch-${letter}`}));
  s.pieces.push(makeTemplatePiece(`setup-paraibo-${letter}`,'Paraibo',letter,`Paraibo ${letter}`,`box:setup-ranch-${letter}`,0,{affiliatedRancheriaId:`setup-ranch-${letter}`}));
 }
 for(let i=1;i<=4;i++)s.pieces.push(makeTemplatePiece(`setup-downfall-band2-${i}`,'Band','','Strength-2 Band','reserve',2,{ratingConfirmed:false,mpRating:4}));
 for(let i=1;i<=2;i++)s.pieces.push(makeTemplatePiece(`setup-downfall-band1-${i}`,'Band','','Strength-1 Band','reserve',1,{ratingConfirmed:false,mpRating:4}));
 for(let i=1;i<=8;i++)s.pieces.push(makeTemplatePiece(`setup-downfall-horse-${i}`,'Resource','Horse','Horse','reserve'));
 s.pieces.push(makeTemplatePiece('setup-downfall-trade','Resource','Trade Goods','Trade Goods','reserve'));
 s.setupChecklist={
  'bison':'Enter all nine random Bison spaces from your dice (§9.5.E).',
  'rancherias':'Choose Rancherías A–C in three territories, controlling two (§9.5.F).',
  'resources':'Assign four strength-2 and two strength-1 Bands; optionally eight Horses and one Trade Goods (§9.5.G).',
  'medicine':'Assign six headmen Medicine ≥1, total ≤12 (§9.5.H).',
  'culture':'Select up to 12 Culture-cost points, respecting prerequisites (§9.5.K).',
  'development':'Resolve the 1d6 starting Development card; any reroll uses Trade Goods (§9.5.L).',
  'bands':'Confirm the printed Movement rating of all six Band counters.',
  'physical':'Check starting War Cards, Enemy Instructions/Success cup and Operations counters against §9.1.'
 };
}
function setup1700(s){
 s.colonial={West:'Spain',South:'Spain',East:'None'};
 s.medicine={paraibo:2,mahimiana:2};
 s.pieces.push(makeTemplatePiece('setup-ranch-A','Rancheria','A','Ranchería A','UA-1'));
 for(const loc of OPENING_TRIBE_SPACES)s.pieces.push(makeTemplatePiece(`setup-tribe-${loc}`,'Tribe','','Tribe',loc));
 const occupied=new Set([...OPENING_TRIBE_SPACES,'UA-1']);
 for(const loc of SPACES.filter(x=>x.type==='round').map(x=>x.id).filter(x=>!occupied.has(x)))s.pieces.push(makeTemplatePiece(`setup-bison-${loc}`,'Bison','','Bison',loc));
 for(let i=1;i<=3;i++)s.pieces.push(makeTemplatePiece(`setup-band-${i}`,'Band','',`Band A${i}`,'box:setup-ranch-A',2,{ratingConfirmed:false,mpRating:4,notes:'Confirm movement rating on printed counter.'}));
 for(let i=1;i<=4;i++)s.pieces.push(makeTemplatePiece(`setup-horse-${i}`,'Resource','Horse','Horse','box:setup-ranch-A'));
 s.pieces.push(makeTemplatePiece('setup-mahimiana-A','Mahimiana','A','Mahimiana A','box:setup-ranch-A',0,{medicine:2,affiliatedRancheriaId:'setup-ranch-A'}));
 s.pieces.push(makeTemplatePiece('setup-paraibo-A','Paraibo','A','Paraibo A','box:setup-ranch-A',0,{medicine:2,affiliatedRancheriaId:'setup-ranch-A'}));
 s.setupChecklist={
  'cards-war':'Shuffle 25 War Cards (§9.1.3).',
  'cards-culture':'Select up to one free Level 1 Culture Card (§9.2.J); declining is allowed.',
  'cards-development':'Confirm Development 1–3 in play and cards 4–21 shuffled into the deck (§9.2.I).',
  'enemy-display':'Confirm West/South/East/North Instructions A–F and North G (§9.1.2).',
  'medicine':'Confirm Paraibo and Mahimiana Medicine 2 and 2 (§9.2.F).',
  'operations':'Both Operations markers at Start; 3 Military, 3 Culture, 1 AP, 0 Enemy AP (§9.2.G–H).',
  'bands':'Record each of the three printed Band Movement ratings (§9.2.E).',
  'supply':'Check Tribes, Bison, Horse counters and the 22-counter Success cup (§9.1.1 and §9.2).'
 };
}
function installOpeningTemplate(s){
 if(s.phase!=='setup')fail('Opening templates are available only during setup.');
 if(!TEMPLATE_SCENARIOS.includes(s.scenario))fail('Unknown printed scenario.');
 if(s.pieces.length||s.cards.length)fail('Template requires an empty piece/card ledger. Start a new blank game first.');
 s.tracks={military:3,culture:3,ap:1,enemyAp:0,movement:0,operations:0,passage:0};
 s.period=s.scenario==='downfall'?3:1;
 s.pieces=[];s.cards=[];
 setupBasePieces(s);
 if(s.scenario==='downfall')setupDownfall(s);else setup1700(s);
 setupDevelopmentCards(s);setupHistoryCards(s);setupWarCards(s);setupCultureCards(s);
 s.setupConfirmed={};s.setupTemplate='official';
 for(const evidence of MAP_EVIDENCE_EDGES){
  const existing=s.edges.find(x=>(x.a===evidence.a&&x.b===evidence.b)||(x.a===evidence.b&&x.b===evidence.a));
  if(existing){const review=mapConnectionReconciliation([existing],[evidence]);if(review.conflicts.length)fail('Recorded map edge conflicts with photographic evidence.');if(review.upgradeColor.length)existing.enemyFor=[...evidence.enemyFor];continue;}
  s.edges.push({...evidence,source:'board-photo',verifiedByPlayer:false});
 }
 const label=SCENARIOS.find(x=>x[0]===s.scenario)[1];
 s.setupNote=`Official ${label} setup, GMT Living Rules §§9.1 and ${SCENARIO_DETAILS[s.scenario].rule}. Player decisions and unverified card effects are explicitly gated; supplied map evidence is partial.`;
}
/** Verifies facts already present in the official opening ledger.
 * Deliberately excludes printed Band movement ratings, shuffled card order,
 * physical/counter checks, and player decisions. These cannot be inferred. */
export function openingLedgerAudit(s){
 if(s.phase!=='setup'||s.setupTemplate!=='official')return {checks:[],remaining:[]};
 const checks=[];
 const add=(key,ok,reason)=>{if(key in (s.setupChecklist||{}))checks.push({key,ok:Boolean(ok),reason});};
 const active=s.pieces.filter(p=>p.type==='Instruction'&&p.location.startsWith('enemy-display:'));
 const faceOK=['West','South','East','North'].every(enemy=>[...'ABCDEF'].every((letter,index)=>{
  const p=active.find(x=>x.location===`enemy-display:${enemy}:${letter}`);
  const front=ENEMY_INSTRUCTION_FRONTS[enemy]?.[index];
  return p&&p.owner===enemy&&p.frontKind===front?.[0]&&p.frontCost===front?.[1]&&!p.flipped;
 }));
 add('enemy-display',active.length===24&&faceOK,'24 A–F counters must show the verified printed fronts and costs; G faces remain outside this check.');
 const markers=s.pieces.filter(p=>p.location==='cup'&&p.type==='Marker');
 const count=subtype=>markers.filter(p=>p.subtype===subtype).length;
 const cupOK=markers.length===22&&count('Success')===10&&count('Enemy AP 4')===5&&count('Enemy AP 3')===4&&count('Enemy AP 2')===3;
 // The 1700 printed setup fixes several tracks; later phases legitimately change them.
 if(s.scenario!=='downfall'){
  const chiefs=s.pieces.filter(p=>['Paraibo','Mahimiana'].includes(p.type));
  add('medicine',chiefs.length===2&&chiefs.every(p=>p.medicine===2),'1700 headmen must both start at Medicine 2.');
  add('operations',s.tracks.military===3&&s.tracks.culture===3&&s.tracks.ap===1&&s.tracks.enemyAp===0&&s.tracks.operations===0&&s.tracks.movement===0,'Verify the fixed §9.2 tracks; do not claim printed counter shuffling.');
  const cards=s.cards.filter(c=>c.kind==='Development');
  add('cards-development',cards.length===84&&cards.every(c=>{const n=Number(c.identifier);const expected=n<=3?'In play':n<=21?'Deck':n<=({plains:21,rise:42,lords:63,campaign:84}[s.scenario]||84)?'Available':'Removed';return c.zone===expected;}),'Development cards 1–3 must be in play and 4–21 in the initial deck.');
  const bands=s.pieces.filter(p=>p.type==='Band');
  const bison=s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round');
  const horses=s.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location==='box:setup-ranch-A');
  add('supply',cupOK&&bands.length===3&&bands.every(p=>p.strength===2&&p.location==='box:setup-ranch-A')&&bison.length>0&&horses.length===4,'Verify the initial piece counts and 22-counter cup, not any unknown printed Band MP ratings.');
 }
 return {checks,remaining:checks.filter(x=>!s.setupConfirmed?.[x.key])};
}
export function scenarioSetupOptions(s){
 const down=s.scenario==='downfall'&&s.setupTemplate==='official';
 const spaces=SPACES.filter(p=>p.type==='round').map(p=>({id:p.id,name:p.name}));
 const ranches=['A','B','C'].map(letter=>s.pieces.find(p=>p.id===`setup-ranch-${letter}`)).filter(Boolean);
 const bison=s.pieces.filter(p=>p.id.startsWith('setup-downfall-bison-'));
 const allocated=Object.fromEntries(ranches.map(r=>[r.subtype,{
  strength2:s.pieces.filter(p=>p.type==='Band'&&p.strength===2&&p.location===`box:${r.id}`).length,
  strength1:s.pieces.filter(p=>p.type==='Band'&&p.strength===1&&p.location===`box:${r.id}`).length,
  horses:s.pieces.filter(p=>p.subtype==='Horse'&&p.location===`box:${r.id}`).length,
  trade:s.pieces.filter(p=>p.subtype==='Trade Goods'&&p.location===`box:${r.id}`).length
 }]));
 return {down,spaces,ranches:ranches.map(r=>({letter:r.subtype,location:SPACE[r.location]?r.location:''})),
  bison:bison.map(p=>SPACE[p.location]?p.location:''),allocated,
  cultureBudget:down?12:0,cultureSpent:s.setupCultureSpent||0,cultureFinished:Boolean(s.setupCultureFinished),
  developmentRoll:s.setupDevelopmentRoll||null,
  availableCulture:CULTURE_CARD_CATALOG.map(record=>{
   const card=s.cards.find(c=>c.kind==='Culture'&&cultureIdentity(c)?.id===record.id);
   const prerequisite=record.level===1||s.cards.some(c=>c.kind==='Culture'&&c.zone==='In play'&&cultureIdentity(c)?.family===record.family&&cultureIdentity(c)?.level===record.level-1);
   return {...record,eligible:Boolean(card?.zone==='Available'&&prerequisite&&(!down?record.level===1&&!(s.setupCultureSpent||0): (s.setupCultureSpent||0)+record.cost<=12))};
  })};
}
function checkDownfallPlacement(s){
 if(s.scenario!=='downfall'||s.setupTemplate!=='official'||s.phase!=='setup')fail('This choice is only for the official Downfall setup.');
}


export function newGame(scenario='plains',demo=false){
 if(!SCENARIOS.some(s=>s[0]===scenario))fail('Unknown scenario.');
 const game={schema:3,version:VERSION,scenario,period:scenario==='downfall'?3:1,phase:'setup',operation:null,
   rng:{algorithm:'xorshift32',seed:DEFAULT_SEED,rolls:0},operationEvents:{cultureGain:false,operationsRoll:false},medicine:{paraibo:null,mahimiana:null},colonial:{West:'None',South:'None',East:'None'},setupChecklist:{},setupConfirmed:{},
   tracks:{military:0,culture:0,ap:0,enemyAp:0,movement:0,operations:0,passage:0},mustPassage:false,
   activeBandId:null,steps:{},pieces:[],cards:[],edges:[],mapReview:{},enemyFlow:null,pending:null,successCheck:null,lastSuccessCheck:null,raidCupResolution:null,revision:0,passageRetiredIds:[],passageProminentExemptIds:[],passageQuanahExemptId:null,passagePeaceRolls:{},passageBison:null,passageDevelopment:null,passageResult:null,victoryPending:null,gameResult:null,
   countermeasureWindow:null,developmentPending:null,developmentPlanningApplied:false,epidemicTakeActionsApplied:false,greatHuntBandId:null,battlePending:null,battleContinuation:null,battleRounds:[],battleExemptions:{},warMovement:null,planningEnemyChoice:null,log:[],createdAt:new Date().toISOString(),setupNote:'Select an official scenario and load its printed setup (§9).',setupTemplate:null,setupCultureSpent:0,setupCultureFinished:false,setupDevelopmentPriority:[],setupDevelopmentRoll:null,
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
function sHasHeadman(s,id){return s.pieces.some(p=>p.id===id&&['Mahimiana','Paraibo'].includes(p.type)&&p.location!=='removed');}
function validateLocation(state,location,selfId){
 if(isMap(location)||['reserve','removed','operations','cup','enemy-display','hand','deck','success-out','available-enemy-aps','enemy-resolution'].includes(location))return;
 if(location.startsWith('medicine:') && sHasHeadman(state,location.slice(9)))return;
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
 return s.edges.filter(e=>e.a===space||e.b===space).map(e=>`${e.a===space?e.b:e.a}:${e.kind}:${[...(e.enemyFor||[])].sort().join('+')||'white'}`).sort().join('|');
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
/** H1 is sourced from its printed Enemy Action Table (Vassal game image and
 * the publisher's pictured card); H3/H4 from locally held original card faces.
 * Do not guess the H2 distribution from neighbouring History Cards. */
export const VERIFIED_H1_ENEMY_ROLLS=Object.freeze({1:'North',2:'North',3:'West',4:'West',5:'South',6:'South'});
export const VERIFIED_HISTORY_NAMED_ENEMIES=Object.freeze({
 H1:Object.freeze(['North','West','South']),
 H2:Object.freeze(['North','West','South']),
 H3:Object.freeze(['North','West','South','East']),
 H4:Object.freeze(['South','West','East'])
});
export const VERIFIED_HISTORY_ENEMY_ROLLS=Object.freeze({
 H1:VERIFIED_H1_ENEMY_ROLLS,
 H3:Object.freeze({1:'North',2:'West',3:'South',4:'South',5:'East',6:'East'}),
 H4:Object.freeze({1:'South',2:'South',3:'West',4:'East',5:'East',6:'East'})
});
export function verifiedHistoryEnemy(s,die){
 const card=s.cards.find(c=>c.kind==='History'&&c.zone==='In play');
 const history=String(card?.identifier||'').trim().toUpperCase();
 return VERIFIED_HISTORY_ENEMY_ROLLS[history]?.[Number(die)]||null;
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
 '08':{name:'Mounted Society',trigger:'hand-play movement and discard-during-passage',mode:'guided-hand-movement',source:'TTS Development 08'},
 '09':{name:'Counting Coup',trigger:'hand-play reroll and discard-during-passage',mode:'digital-success-redraw-supported-other-rolls-missing',source:'TTS Development 09'},
 '10':{name:'Prominent Headman',trigger:'hand-play death-check exemption and discard-during-passage',mode:'digital-exemption-and-passage-marker',source:'TTS Development 10'},
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
 '53':{name:'Kiowa Alliance',trigger:'when-revealed',mode:'manual-required-tribe-conversion',source:'TTS Development 53'},
 '55':{name:'Indian Removal Act',trigger:'when-revealed and while-in-play',mode:'manual-required-rancheria-displacement',source:'TTS Development 55'},
 '57':{name:'Mexican Independence',trigger:'when-revealed and while-in-play',mode:'partial-regime-with-war-ends-gate',source:'TTS Development 57'},
 '63':{name:'Mexican War',trigger:'when-revealed and while-in-play',mode:'manual-required-regime-change-with-partial-execution',source:'TTS Development 63'},
 '66':{name:'Earl Van Dorn',trigger:'when-revealed and battle-result',mode:'manual-required-surprise-battle',source:'TTS Development 66'},
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
/** A registry entry is not a complete implementation. This report deliberately
 * separates source identity, declared trigger and implementation certification. */
export function developmentCardAudit(){
 return DEVELOPMENT_SOURCE_INDEX.map(record=>Object.freeze({
  number:record.number,name:record.name,period:record.period,
  identityKnown:Boolean(record.name),trigger:record.trigger,
  declaredProcedure:record.automation,requiresManualProcedure:record.automation.startsWith('manual-required'),
  fullAutomationVerified:record.complete,
  status:record.complete?'verified-complete':record.automation.startsWith('manual-required')?'manual-required':'not-certified',
  source:DEVELOPMENT_EFFECT_CATALOG[record.number]?.source||null
 }));
}
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
 if(!stock){const card=activeDevelopment(s,'60')[0];if(card)s.developmentPending={cardId:card.id,number:'60',kind:'physical-stock',context:s.phase==='cleanup'?'cleanup':'reveal',reason:'American Traders requires an available physical Trade Goods counter. Confirm a real unused counter before continuing.'};return 'American Traders: physical Trade Goods stock confirmation required; no counters changed.';}
 stock.location=loc.id;const loss=pointLossPreview(s,'culture',1);s.tracks=loss.tracks;
 return `American Traders: placed one Trade Goods at ${loc.id}; lost 1 Culture (deficit substitution applied if necessary).`;
}
function startSmallpoxEnd(s,c){
 const target=seededSelect(s,SPACES.filter(x=>x.type==='round'));
 const tribe=s.pieces.find(p=>p.type==='Tribe'&&p.location===target.id);
 if(tribe){tribe.location='reserve';markRecurringDisease(s,c.id);return `Smallpox (#64): random space ${target.id}; removed Tribe ${tribe.id}.`;}
 const bands=s.pieces.filter(p=>p.type==='Band'&&p.location===target.id);
 if(!bands.length){markRecurringDisease(s,c.id);return `Smallpox (#64): random space ${target.id}; no Tribe or Band present.`;}
 if(bands.length>1){
  s.developmentPending={cardId:c.id,number:'64',kind:'smallpox-end',phase:'end-take-actions',space:target.id,bandIds:bands.map(b=>b.id),reason:'Choose one Band in the random space, or resolve its possessed-counter loss consequences.'};
  return `Smallpox (#64): random space ${target.id}; choose one affected Band to reduce by 1.`;
 }
 preflightDiseaseBands(s,bands);reduceBandForCard(s,bands[0]);markRecurringDisease(s,c.id);
 return `Smallpox (#64): random space ${target.id}; Band ${bands[0].id} reduced by 1.`;
}

function seededSelect(s,items){if(!items.length)return null;const r=rollSeededDie(s.rng.seed);s.rng.seed=r.seed;s.rng.rolls++;return items[(r.seed>>>0)%items.length];}
/** Resolve a disease strength loss through the same zero-strength Band cleanup
 * used in battle (§2.6.1). Preflight the whole selected group before changing
 * any counter, so one ambiguous possession cannot leave a half-applied disease.
 */
function preflightDiseaseBands(s,bands){
 for(const band of bands){
  if(band.strength<1)fail('Disease selected a Band without positive strength.');
  if(band.strength===1)defeatedBandAudit(s,band);
 }
}
function reduceBandForCard(s,p){
 if(p.strength===1){
  const audit=defeatedBandPossessions(s,p);
  return {eliminated:true,resources:audit.resources,mahimianas:audit.mahimianas.length};
 }
 p.strength--;
 return {eliminated:false,resources:0,mahimianas:0};
}
// Card #06: sample uniform map spaces by verified territory/area geometry.
// Keep selection in the saved pending ledger when the printed text requires a choice.
/** D06: the printed random map-space coordinates are dice, not modulo
 * positions in an array of spaces. On reveal, each territory is known and
 * a 1d6 selects its numbered area. For a recurring single random space,
 * roll territory 1d6 then numbered area 1d6 (36 equally likely outcomes).
 * Return actual faces for an auditable digital-roll journal.
 */
function epidemicSpaces(s,perTerritory){
 const die=()=>{const result=rollSeededDie(s.rng.seed);s.rng.seed=result.seed;s.rng.rolls++;return result.face;};
 if(perTerritory){const dice=TERRITORIES.map(()=>die());return {spaces:TERRITORIES.map(([t],i)=>`${t}-${dice[i]}`),dice,method:'one numbered-area die for each of six territories'};}
 const territoryDie=die(),areaDie=die();
 return {spaces:[`${TERRITORIES[territoryDie-1][0]}-${areaDie}`],dice:[territoryDie,areaDie],method:'territory die then numbered-area die'};
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
 preflightDiseaseBands(s,bands);
 // The six revealed territories are disjoint, so the selected pieces cannot duplicate.
 for(const band of bands)reduceBandForCard(s,band);
 for(const tribe of tribes)tribe.location='reserve';
 return {bands:bands.length,tribes:tribes.length};
}
function initiateEpidemic(s,c,phase){
 const selection=epidemicSpaces(s,phase==='reveal'),spaces=selection.spaces;
 const ambiguous=epidemicAmbiguities(s,spaces,{},phase);
 if(ambiguous.length){
  s.developmentPending={cardId:c.id,number:devNumber(c),kind:'epidemic',phase,spaces,randomRolls:selection.dice,reason:'Choose a Band in each multiply occupied Epidemic space before resolving the printed card.'};
  return `Epidemic (${phase}): dice ${selection.dice.join(', ')}; selected spaces ${spaces.join(', ')}. ${ambiguous.length} space(s) require Band selection.`;
 }
 const result=applyEpidemic(s,spaces,{},phase);
 if(phase==='end-take-actions')markRecurringDisease(s,c.id);
 return `Epidemic (${phase}): dice ${selection.dice.join(', ')}; map spaces ${spaces.join(', ')}; ${result.bands} Band(s) weakened, ${result.tribes} Tribe(s) removed.`;
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
 const additionalChiefs=heldResources.filter(p=>p.type==='Mahimiana'&&p.id!==chief?.id);
 // A death always resets Medicine to zero; the old rating need not be known.
 const loss=pointLossPreview(s,'military',2);
 // All validations above precede mutations; perform() also works on a clone.
 for(const p of [...contents,...heldResources]){
  if(p===chief||additionalChiefs.some(x=>x.id===p.id))continue;
  p.location='reserve';
 }
 for(const p of success)p.location='cup';
 for(const otherChief of additionalChiefs){
  for(const counter of s.pieces.filter(p=>p.subtype==='Success'&&p.location===`medicine:${otherChief.id}`))counter.location='cup';
  setMedicine(s,otherChief,0);otherChief.location='reserve';
 }
 if(chief){
  for(const p of s.pieces.filter(p=>p.subtype==='Success'&&p.location===`medicine:${chief.id}`))p.location='cup';
  setMedicine(s,chief,0);chief.location='reserve';
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
// §4.4 Step 12 (also invoked by #21 Mild Winter). The published rule
// requires one draw plus one per currently empty Development slot.
// Deterministic first-eligible destination is a digital player policy, not
// a claimed printed priority. Every random territory is seeded and recorded.
function runBisonStepForMildWinter(s){
 const occupied=s.cards.filter(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone)).length;
 if(occupied>3)fail('Mild Winter: more than three active Development cards; correct display first.');
 const attempts=4-occupied,results=[];
 for(let i=0;i<attempts;i++){
  const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
  const territory=TERRITORIES[roll.face-1][0];
  const slots=SPACES.filter(x=>x.type==='round'&&x.territory===territory);
  const empty=slots.filter(x=>!s.pieces.some(p=>p.location===x.id));
  const stock=s.pieces.filter(p=>p.type==='Bison'&&p.location==='reserve');
  const local=s.pieces.filter(p=>p.type==='Bison'&&slots.some(x=>x.id===p.location));
  const elsewhere=SPACES.filter(x=>x.type==='round'&&!s.pieces.some(p=>p.location===x.id));
  if(empty.length&&stock.length){stock[0].location=empty[0].id;results.push(`${territory} → placed ${empty[0].id}`);}
  else if(!empty.length&&local.length&&elsewhere.length){local[0].location=elsewhere[0].id;results.push(`${territory} → relocated ${elsewhere[0].id}`);}
  else results.push(`${territory} → no effect`);
 }
 return `Mild Winter: conducted Step 12 with ${attempts} territory draw(s) (${results.join('; ')}).`;
}
function revealDevelopmentEffect(s,c){
 const number=devNumber(c),effect=DEVELOPMENT_EFFECT_CATALOG[number];
 if(number==='21')return runBisonStepForMildWinter(s);
 if(number==='44')return 'Louisiana Purchase: no when-revealed effect; apply Trade Goods during Cleanup step 1 and remove unpossessed map Trade Goods when discarded in Passage.';
 if(number==='56')return 'Gift Giving: no when-revealed effect; optional 1 AP Headman Action becomes available during Planning while this card remains in play.';
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
  const special=s.pieces.filter(p=>p.type==='Instruction'&&p.owner==='North'&&(/(?:^|\s)G$/i.test(String(p.label||'')) || /(?:^|\s)G$/i.test(String(p.subtype||''))));
  const reserveWar=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='North'&&p.location==='reserve');
  const g=special.filter(p=>['reserve','cup','operations'].includes(p.location));
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
  if(!stock){s.developmentPending={cardId:c.id,number,kind:'physical-stock',reason:'End of Ute Alliance requires a real available Tribe counter; confirm it is in your physical supply before placing one in the ledger.'};return 'End of Ute Alliance: physical Tribe supply confirmation required; no board counters changed.';}
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
  // Resolve the entire reveal atomically: a missing physical East Settlement
  // must not discard the Tribe before the player records the available stock.
  const settlement=s.pieces.find(p=>p.type==='Settlement'&&p.location==='reserve'&&['East','Texas','USA'].includes(p.owner));
  if(!settlement){s.developmentPending={cardId:c.id,number,kind:'texas-stock',reason:'Texas Independence requires a physical East Settlement counter in stock; confirm one from your game components. No counters were changed.'};return 'Texas Independence: confirm the available East Settlement counter before resolving this reveal.';}
  const tribes=s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.territory==='RR');
  const tribe=seededSelect(s,tribes);
  const candidates=SPACES.filter(x=>x.territory==='RR'&&!s.pieces.some(p=>p.location===x.id&&['Band','Rancheria','Settlement'].includes(p.type)&&p.id!==tribe?.id));
  if(!candidates.length){s.developmentPending={cardId:c.id,number,reason:'Texas Independence: no eligible Red River space after removing the randomly selected Tribe.'};return 'Texas Independence: resolve printed Settlement stacking before placement.';}
  const target=seededSelect(s,candidates);
  if(tribe)tribe.location='reserve';
  settlement.location=target.id;settlement.owner='East';
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
  for(const counter of instructions)flipInstructionFace(counter);
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
  if(!stock){s.developmentPending={cardId:c.id,number,kind:'physical-stock',reason:'Osage Expansion requires a real available Tribe counter; confirm it from the physical game supply.'};return 'Osage Expansion: physical Tribe supply confirmation required; no counters changed.';}
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
  if(!settlement){s.developmentPending={cardId:c.id,number,kind:'physical-stock',reason:'Fort Gibson requires a real available Settlement counter; confirm an unused physical East Settlement before continuing.'};return 'Fort Gibson: physical East Settlement supply confirmation required; no counters changed.';}
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
  preflightDiseaseBands(s,bands);
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
  // Preflight every selected Band (including held Resources / Mahimiana).
  preflightDiseaseBands(s,bands);
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
 if(/^settle(?:\s|$)/i.test(text))return 'Settle';
 if(/^raid(?:\s|$)/i.test(text))return 'Raid';
 if(/^recover(?:\s|$)/i.test(text))return 'Recover';
 if(/^war(?:\s|$)/i.test(text))return 'War';
 if(/^ally(?:\s|$)/i.test(text))return 'Ally';
 if(/^peace(?:\s|$)/i.test(text))return 'Peace';
 if(/^hunt(?:\s|$)/i.test(text))return 'Hunt';
 if(/^encr(?:oach)?(?:\s|$)/i.test(text))return 'Encroach';
 return 'Unknown';
}
/** The fixed printed territory die-symbol mapping (not a player preference).
 * See GMT Living Rules §2.2 and §6.3.3–4 and Living Play Book pp. 15, 19.
 */
export const VERIFIED_HUNT_DIE_TERRITORIES=Object.freeze(Object.fromEntries(TERRITORY_DIE_ORDER.map((id,index)=>[index+1,id])));
function validatedTerritoryOrder(order){
 if(order!==undefined&&(!Array.isArray(order)||order.length!==6||order.some((id,i)=>id!==TERRITORY_DIE_ORDER[i])))
   fail('Territory die chart differs from the six printed territory symbols.');
 return TERRITORY_DIE_ORDER;
}
export function huntTargetPreview(s,die,order){
 const face=Number(die);
 if(!Number.isInteger(face)||face<1||face>6)fail('Hunt die must be 1–6.');
 order=validatedTerritoryOrder(order);
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
 order=TERRITORY_DIE_ORDER;
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
 // Colonial names may be shared by multiple directions (e.g. Spain in
 // West and South). A mere owner label does not identify which Enemy owns a
 // Ravaged marker: only use a unique directional affiliation or direction tag.
 const uniquelyOwned=(owner,side)=>owner===side||Boolean(owner&&owner!=='None'&&s.colonial?.[side]===owner&&
  ENEMY_COLUMNS.filter(col=>s.colonial?.[col]===owner).length===1);
 const supported=new Set(squares);
 for(const p of s.pieces){
  if(['Settlement','War Column'].includes(p.type)&&uniquelyOwned(p.owner,enemy)&&SPACE[p.location])supported.add(p.location);
 }
 const candidates=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Ravaged'&&supported.has(p.location));
 // An explicitly owned Enemy square is not ambiguous merely because it belongs
 // to another Enemy. In particular, North's Ravaged marker does not interrupt
 // West's Recover/other Instructions (GMT Living Playbook p. 8 example).
 const knownSquares=new Set(['N','W','S','E1','E2']);
 const knownForeign=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Ravaged'&&!supported.has(p.location)&&(
    knownSquares.has(p.location)||s.pieces.some(x=>['Settlement','War Column'].includes(x.type)&&x.location===p.location&&
     ENEMY_COLUMNS.some(col=>col!==enemy&&uniquelyOwned(x.owner,col)))));
 const foreignIds=new Set(knownForeign.map(p=>p.id));
 const unknown=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Ravaged'&&!supported.has(p.location)&&!foreignIds.has(p.id));
 return {enemy,candidates:candidates.map(p=>({id:p.id,label:p.label,location:p.location})),
   knownForeignRavaged:knownForeign.map(p=>p.id),
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
/** Assisted Passage of Time: never substitutes assumed player choices for §4.4.
 * It exposes only already-implemented deterministic transitions and stops at
 * optional population, Ranchería, card, or History decisions. */
export function passageAutomationStatus(s){
 if(s.phase!=='execution'||s.operation!=='Passage of Time')return {ready:false,next:null,reason:'Select and begin a Passage of Time operation.'};
 if(s.pending||s.successCheck||s.battlePending||s.battleContinuation||s.developmentPending||s.enemyFlow||s.victoryPending)return {ready:false,next:null,reason:'Resolve the pending procedure before continuing Passage.'};
 const steps=s.steps||{},done=k=>['done','na'].includes(steps[k]);
 if(!done('pt1'))return {ready:true,next:'PASSAGE_UNFINISH_BANDS',reason:'Unfinish the in-play Bands.'};
 for(const id of ['pt2','pt3','pt4'])if(!done(id))return {ready:false,next:null,reason:`Passage ${id}: choose whether to create or strengthen Bands or create a Ranchería before advancing. These player choices are not automatic.`};
 if(!done('pt5'))return {ready:false,next:null,reason:'Passage step 5: consider optional Mahimiana retirement, then finish retirement.'};
 if(!done('pt6')){
   if(s.cards.some(c=>c.kind==='Development'&&devNumber(c)==='10'&&c.zone==='Hand'))return {ready:false,next:null,reason:'Optional Prominent Headman #10 may prevent one Headman Death Check. Play it or use Apply digitally to proceed without playing it.'};
   if(activeDevelopment(s,'74').length&&!s.passageQuanahExemptId)return {ready:false,next:null,reason:'Choose the Quanah Parker Mahimiana exemption before Death Checks.'};
   return {ready:true,next:'PASSAGE_AUTO_HEADMAN_DEATH',reason:'Roll headman Death Checks.'};
 }
 if(!done('pt7'))return {ready:true,next:'PASSAGE_AUTO_REPLACE_MAHIMIANA',reason:'Replace Medicine-0 Mahimianas.'};
 if(!done('pt8'))return {ready:true,next:'PASSAGE_RESTORE_SUCCESS',reason:'Restore Success counters to the cup.'};
 if(!done('pt9')){
   const resources=s.pieces.filter(p=>['Resource','Bison'].includes(p.type)&&p.location==='operations');
   const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]?.type==='round');
   if(resources.length&&ranches.length!==1)return {ready:false,next:null,reason:'Step 9 requires a player-selected Ranchería for each Operations Resource.'};
   return {ready:true,next:'PASSAGE_AUTO_RESOURCES',reason:'Return Operations Resources to the only eligible Ranchería (or confirm none).'};
 }
 if(!done('pt10'))return {ready:true,next:'PASSAGE_CLEAR_RAVAGED',reason:'Remove Ravaged targets and resolve any Military loss.'};
 if(!done('pt11'))return {ready:true,next:'PASSAGE_AUTO_PEACE',reason:'Roll all Peace and Ally counters.'};
 if(!done('pt12'))return {ready:true,next:'PASSAGE_AUTO_BISON',reason:'Resolve random Bison placements.'};
 if(!done('pt13'))return {ready:true,next:'PASSAGE_AUTO_DEVELOPMENT',reason:'Discard Development display left to right, resolve discard effects, then reveal each replacement separately. Stops at mandatory card choices.'};
 if(!done('pt14'))return {ready:false,next:null,reason:'Step 14: optionally purchase a Culture Card or explicitly decline.'};
 if(!done('pt15'))return {ready:false,next:null,reason:'Step 15: resolve the Passage marker and required History Victory Check.'};
 return {ready:false,next:null,complete:true,reason:'Passage steps are recorded; advance to Cleanup when safe.'};
}

/** Report the next safe War Phase action without treating missing pieces or
 * incomplete source data as evidence of a finished procedure. */
/** Culture C04/C12 optional evasion opportunities before War attrition (§3.1 step 2). */
export function cultureWarEvasionOptions(s){
 if(s.phase!=='war'||s.steps?.w1!=='done'||s.steps?.w2||s.cultureEvadeDeclined)return [];
 const options=[],tried=new Set(s.cultureEvadeTried||[]);
 const activeWars=s.pieces.filter(p=>p.type==='War Column'&&p.strength>0&&SPACE[p.location]);
 const edgeDests=loc=>s.edges.filter(e=>e.a===loc||e.b===loc).map(e=>e.a===loc?e.b:e.a);
 // Evasion is a real piece move: refuse destinations that violate the same
 // printed stacking invariant used by Cleanup, not merely graph adjacency.
 const legalArrival=(piece,to)=>{
  if(!SPACE[to])return false;
  const moved={...s,pieces:s.pieces.map(p=>p.id===piece.id?{...p,location:to}:p)};
  return !getStackingProblems(moved).some(problem=>problem.space===to);
 };
 if(cultureActive(s,'C04'))for(const war of activeWars){
  const bands=s.pieces.filter(p=>p.type==='Band'&&p.strength>0&&p.location===war.location);
  if(bands.length!==1||bands[0].strength>=6||tried.has(`band:${bands[0].id}`))continue;
  for(const to of edgeDests(war.location))if(legalArrival(bands[0],to))options.push({kind:'band',id:bands[0].id,to,label:`Lords I: evade Band ${bands[0].label||bands[0].id} → ${SPACE[to].name}`});
 }
 if(cultureActive(s,'C12'))for(const war of activeWars){
  for(const ranch of s.pieces.filter(p=>p.type==='Rancheria'&&p.location===war.location)){
   if(tried.has(`ranch:${ranch.id}`))continue;
   const strength=s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${ranch.id}`).reduce((n,p)=>n+p.strength,0);
   if(strength>=6)continue;
   for(const to of edgeDests(ranch.location)){
    if(SPACE[to]?.type!=='round'||!legalArrival(ranch,to)||s.pieces.some(p=>p.location===to&&p.type==='War Column'))continue;
    options.push({kind:'ranch',id:ranch.id,to,label:`Lords III: evade Ranchería ${ranch.label||ranch.id} → ${SPACE[to].name}`});
   }
  }
 }
 return options;
}
export function warAutomationStatus(s){
 if(s.phase!=='war')return {ready:false,next:null,reason:'Not in the War Column Phase.'};
 if(s.warMovement||s.battlePending||s.battleContinuation||s.successCheck||s.pending||s.enemyFlow||s.developmentPending)return {ready:false,next:null,reason:'Finish the pending War/card/battle procedure first.'};
 const active=s.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0);
 const steps=s.steps||{};
 if(!steps.w1)return {ready:true,next:'WAR_DRAW_MOVEMENT',reason:active.length?'Draw and resolve the War movement card.':'No War Columns: verify and close the War procedure.'};
 if(!steps.w2)return steps.w1==='done'?{ready:true,next:'WAR_AUTO_ATTRITION',reason:'Roll attrition for every surviving War Column.'}:{ready:false,next:null,reason:'War movement checkpoint is unresolved.'};
 if(!steps.w3)return steps.w2==='done'?{ready:true,next:'WAR_DRAW_EVENT',reason:'Draw and resolve the War Event after attrition (even if no War Column survived).'}:{ready:false,next:null,reason:'The War Event step is not ready.'};
 const card=activeWarCard(s),cardId=String(card?.identifier||'').toUpperCase();
 // An unresolved card exception is not permission to mark the remaining steps done.
 if(steps.w3==='done'&&card&&cardId!==s.warEventResolved){
   if(['W03','W04','W22'].includes(cardId)&&fastColumnEligible(s).length){
    try{perform(clone(s),{type:'WAR_FAST_COLUMN'});return {ready:true,next:'WAR_FAST_COLUMN',reason:`Resolve ${cardId} Fast-moving Column using the verified route graph and next War Card.`};}
    catch(err){return {ready:false,next:null,reason:`${cardId}: ${err.message}`};}
   }
   if(['W09','W10','W11','W12','W13'].includes(cardId))return {ready:false,next:null,reason:`Resolve the ${cardId} event or player choice first.`};
 }
 const obligations=warBattleObligations(s).filter(b=>!b.exempt);
 const unprotected=warRancheriaObligations(s);
 const nonRanch=obligations.filter(b=>!unprotected.some(r=>r.location===b.location));
 if(nonRanch.length)return {ready:false,next:null,reason:`${nonRanch.length} War Space(s) require step-4 Battle resolution.`,obligations:nonRanch};
 if(!steps.w4)return {ready:true,next:'WAR_AUTO_CLEAR_BATTLES',reason:'No step-4 Battle is outstanding; verify step 4.'};
 if(unprotected.length){
  const first=unprotected[0];
  if(first.warIds.length>1)return {ready:false,next:null,reason:'Multiple War Columns occupy a Ranchería: resolve the printed random selection before step 5.'};
  if(!first.bandIds.length)return {ready:true,next:'WAR_AUTO_RANCHERIA_EMPTY',reason:'An undefended Ranchería must suffer the War loss and Ranchería Destruction.'};
  return {ready:false,next:null,reason:'A Ranchería with Bands requires the printed step-5 Battle or sacrifice choice.'};
 }
 if(!steps.w5)return {ready:true,next:'WAR_AUTO_CLEAR_BATTLES',reason:'No Rancherías remain in War Spaces; complete step 5.'};
 return {ready:false,next:null,complete:safeNext(s).ok,reason:safeNext(s).ok?'War procedure is complete.':safeNext(s).message};
}

export function safeNext(s){
 if(s.victoryPending)return {ok:false,message:'The History Card Victory Check is pending. Resolve it before advancing (§2.10).'};
 if(s.phase==='execution'&&s.operation==='Passage of Time'&&!s.passageResult)return {ok:false,message:'Finish Passage of Time step 15, including the Passage die/Victory Check decision (§4.4).'};
 if(s.countermeasureWindow)return {ok:false,message:'Resolve or decline the post-Finish War countermeasure before advancing.'};
 if(s.developmentUte)return {ok:false,message:'Resolve the Ute Alliance digital die result before advancing.'};
 if(s.qualityMountsPending)return {ok:false,message:'Resolve the Quality Mounts finish die before advancing.'};
 if(s.pending)return {ok:false,message:'Resolve the pending action first.'};
 if(s.enemyFlow)return {ok:false,message:'Finish the Enemy Instruction procedure before phase advancement (§6.2.2).'};
 if(s.battlePending||s.battleContinuation)return {ok:false,message:'Finish and reconcile all required Battle rounds before advancing (§7).'};
 if(s.warMovement)return {ok:false,message:'Finish the registered War Card movement before advancing (§3.1).'};
 if(warBattleObligations(s).some(b=>!b.exempt))return {ok:false,message:'The ledger shows a War Column and eligible defending unit. Resolve the Battle or record a documented card exception before leaving the War Column Phase.'};
 if(warRancheriaObligations(s).length)return {ok:false,message:'A War Column occupies a Ranchería: resolve §3.1 step 5, even when the Ranchería has no Bands.'};
 if(s.successCheck)return {ok:false,message:'Finish or cancel the Success Check before advancing.'};
 if(s.pieces.some(p=>p.location==='enemy-resolution'))return {ok:false,message:'Reconcile drawn Enemy Instruction counters with their physical board/display locations before advancing.'};
 if(s.phase==='setup' && Object.keys(s.setupChecklist||{}).some(k=>!s.setupConfirmed?.[k]))return {ok:false,message:'Complete the official opening setup confirmation before starting.'};
 if(s.phase==='setup' && s.pieces.some(p=>p.type==='Band'&&p.ratingConfirmed===false))return {ok:false,message:'Confirm each template Band’s printed movement rating in Pieces & stock first.'};
 if(s.phase==='war'&&s.steps.w3==='done'&&['W09','W10','W11'].includes(String(activeWarCard(s)?.identifier||'').toUpperCase())&&s.warEventResolved!==String(activeWarCard(s).identifier).toUpperCase())return {ok:false,message:'Resolve Surprise Attack (W09–W11), including any required Battle, before advancing.'};
 if(s.phase==='war'&&s.steps.w3==='done'&&['W12','W13'].includes(String(activeWarCard(s)?.identifier||'').toUpperCase())&&s.warEventResolved!==String(activeWarCard(s).identifier).toUpperCase())return {ok:false,message:'Resolve or decline the optional W12/W13 Travois event before advancing.'};
 if(s.phase==='war'&&s.steps.w3==='done'&&['W03','W04','W22'].includes(String(activeWarCard(s)?.identifier||'').toUpperCase())&&fastColumnEligible(s).length&&s.warEventResolved!==String(activeWarCard(s).identifier).toUpperCase())return {ok:false,message:'Resolve the Fast-moving Column extra movement draw before advancing.'};
 if(s.phase==='cleanup'&&(s.cleanupFinishedPending||s.enemyFlow||s.cleanupCupResult))return {ok:false,message:'Finish the outstanding Cleanup Enemy or cup procedure first.'};
 if(s.phase==='war' || s.phase==='execution'||s.phase==='cleanup'){
   if(!allChecksDone(s))return {ok:false,message:'Complete or mark N/A every procedure checkpoint first.'};
   if(s.phase==='cleanup'&&getStackingProblems(s).length)return {ok:false,message:'Resolve every stacking conflict before cleanup can finish.'};
 }
 if(s.phase==='execution'&&s.activeBandId)return {ok:false,message:'Finish the active Band before leaving the operation.'};
 if(s.phase==='execution'&&s.operation==='Culture'&&!s.operationEvents?.cultureGain)return {ok:false,message:'Record the Culture gain or a documented manual override before cleanup.'};
 if(s.phase==='execution'&&['Culture','Take Actions'].includes(s.operation)&&!s.operationEvents?.operationsRoll)return {ok:false,message:'Resolve the Operations-track check (or document a card override) before cleanup.'};
 if(s.developmentPending)return {ok:false,message:'Resolve the Development card effect before advancing.'};
 if(s.phase==='execution'&&s.operation==='Take Actions'&&activeRecurringDisease(s).length&&!s.epidemicTakeActionsApplied)return {ok:false,message:'Resolve the in-play Epidemic (#06) random map-space effect at the end of Take Actions.'};
 if(s.phase==='execution'&&s.operation==='Planning'&&s.planningStage!=null&&s.planningStage!==10)return {ok:false,message:'Complete Planning steps 1–9 with the digital procedure before leaving Planning.'};
 if(s.phase==='execution'&&s.operation==='Planning'&&['33','34','58'].some(n=>activeDevelopment(s,n).length)&&!s.developmentPlanningApplied)return {ok:false,message:'Resolve Comancheros trade goods at the end of Planning before cleanup.'};
 if(s.phase==='selection'&&!s.operation)return {ok:false,message:'Choose an operation first.'};
 if(s.phase==='selection'&&s.operation==='Passage of Time'&&!requiredPassage(s)&&s.tracks.operations===0)return {ok:false,message:'Voluntary Passage of Time is not legal while Operations is at Start (§3.2.E).'};
 if(s.phase==='cleanup'&&activeDevelopment(s,'60').some(c=>!(s.americanTradersDoneIds||[]).includes(c.id)))return {ok:false,message:'Resolve in-play American Traders during Cleanup step 1 before advancing.'};
 if(s.phase==='cleanup'&&activeDevelopment(s,'44').some(c=>!(s.louisianaDoneIds||[]).includes(c.id)))return {ok:false,message:'Resolve Louisiana Purchase during Cleanup step 1 before advancing.'};
 if(s.phase==='cleanup'&&['70','71'].flatMap(n=>activeDevelopment(s,n)).some(c=>!(s.buffaloDoneIds||[]).includes(c.id)))return {ok:false,message:'Resolve every in-play Buffalo Hunters card during Cleanup step 1 before advancing.'};
 return {ok:true};
}
/** W23 delayed event: apply once on Cleanup completion, inside the same
 * immutable command transaction as the phase transition. */
function higherStakesAtCleanup(s){
 if(s.phase!=='cleanup')fail('Higher Stakes requires Cleanup.');
 const readiness=safeNext(s);
 if(!readiness.ok)fail('Finish all required Cleanup procedures before Higher Stakes: '+readiness.message);
 if(!s.cards.some(c=>c.kind==='War'&&c.zone==='War Event'&&String(c.identifier).toUpperCase()==='W23'))fail('W23 is not face-up.');
 if(s.warHigherStakesResolved)fail('Higher Stakes already resolved.');
 const columns=s.pieces.filter(p=>p.type==='War Column'&&p.strength>0&&SPACE[p.location]);
 let outcome;
 if(columns.length){
  const loss=pointLossPreview(s,'military',1);
  s.tracks.military=loss.tracks.military;
  s.tracks.culture=loss.tracks.culture;
  outcome=`${columns.length} active War Column(s): lost 1 Military${loss.substituted?', substituted '+loss.otherLoss+' Culture':''}.`;
 }else{
  const before=s.tracks.military;
  s.tracks.military=Math.min(9,before+1);
  outcome=`no active War Columns: Military ${before} → ${s.tracks.military}.`;
 }
 s.warHigherStakesResolved=true;
 return `W23 Higher Stakes at end of Cleanup — ${outcome}`;
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
 let picked;
 if(s.warDeckPeekId){
   picked=cards.find(c=>c.id===s.warDeckPeekId);
   if(!picked)fail('The previously scouted top War Card is missing from the deck.');
   s.warDeckPeekId=null;
 }else{
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   picked=cards[(roll.seed>>>0)%cards.length];
 }
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
/** Verifiable next step in §6.2.2. Stops rather than guessing dice,
 * printed territory symbol mapping, incomplete map routes or player choices.
 * Every proposed command is sent back through the real reducer. */
export function enemyAutomationPreview(s){
 const f=s.enemyFlow;
 if(!f)return {ready:false,reason:'Begin an Enemy Instruction procedure using the History Card and two recorded die results first.'};
 if(f.stage==='choose'){
  const audit=enemyDisplayAudit(s);
  if(audit.problems.length)return {ready:false,reason:audit.problems[0]};
  const top=audit.columns[f.enemy]?.top;
  if(f.kind==='free'&&f.executed)return {ready:true,command:{type:'ENEMY_AUTO_FINISH'},reason:'Reset the display after the free Instruction.'};
  if(!top)return {ready:true,command:{type:'ENEMY_AUTO_FINISH'},reason:'No further Instruction in the active column.'};
  if(top.subtype==='Unknown'||top.strength<1)return {ready:false,reason:'The top Instruction face is not yet verified. Record the actual printed effect and AP cost once; future flips will reuse it.'};
  if(f.kind==='paid'){
   if(top.strength<1)return {ready:false,reason:'The printed AP cost for '+top.label+' has not been entered.'};
   if(top.strength>enemyApPreview(s).total)return {ready:true,command:{type:'ENEMY_AUTO_FINISH'},reason:'Next Instruction is unaffordable; refund remaining APs and reset display.'};
  }
  return {ready:true,command:{type:'ENEMY_SELECT'},reason:'Select the highest Instruction in '+f.enemy+'.'};
 }
 if(f.stage==='payment'){
  const top=s.pieces.find(p=>p.id===f.currentId),cost=top?.strength;
  if(!Number.isInteger(cost)||cost<1)return {ready:false,reason:'Printed Instruction AP cost is missing.'};
  const track=Number(s.tracks.enemyAp)||0;
  const counters=s.pieces.filter(p=>apCounterValue(p)>0).sort((a,b)=>a.id.localeCompare(b.id));
  if(counters.length>14)return {ready:false,reason:'More than 14 available Enemy AP counters; review the physical supply.'};
  let chosen=null;
  for(let bits=0;bits<(1<<counters.length);bits++){
   const subset=counters.filter((_,i)=>bits&(1<<i)),value=subset.reduce((n,p)=>n+apCounterValue(p),0);
   const trackSpent=Math.max(0,cost-value);
   if(trackSpent>track||track+value<cost||track+value-cost>9)continue;
   const candidate={counterIds:subset.map(p=>p.id),trackSpent,value,extra:Math.max(0,value-cost),count:subset.length};
   if(!chosen||candidate.extra<chosen.extra||candidate.extra===chosen.extra&&candidate.count<chosen.count||candidate.extra===chosen.extra&&candidate.count===chosen.count&&candidate.trackSpent<chosen.trackSpent)chosen=candidate;
  }
  if(!chosen)return {ready:false,reason:'Recorded AP counter denominations cannot make a valid payment without exceeding the 9-AP track.'};
  return {ready:true,command:{type:'ENEMY_PAY',counterIds:chosen.counterIds,trackSpent:chosen.trackSpent},reason:'Pay '+cost+' AP with '+chosen.count+' available counters and '+chosen.trackSpent+' track AP.'};
 }
 if(f.stage==='effect'){
  const p=s.pieces.find(x=>x.id===f.currentId),name=instructionName(p);
  if(!p)return {ready:false,reason:'The selected Instruction is not in the ledger.'};
  if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.peaceWarResolved,f.warRaidResolved,f.cardNoEffectResolved].some(Boolean))
   return {ready:true,command:{type:'ENEMY_AUTO_COMPLETE'},reason:'Finish a digitally resolved '+name+' effect.'};
  const recover=recoverTargetAudit(s,f.enemy);
  if(recover.ambiguousRavaged.length)return {ready:false,reason:'Some Ravaged counters have unverified Enemy ownership.'};
  if(recover.candidates.length)return {ready:false,reason:'Recover priority requires the printed History Card die threshold and a target roll.'};
  const exceptions=enemyCardExceptionPreview(s);
  if(exceptions?.effect)return {ready:true,command:{type:'ENEMY_CARD_NO_EFFECT',ack:true},reason:'Apply the active Development Card no-effect exception.'};
  const unknown=s.cards.some(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(c)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(c)].mode.startsWith('manual-required')));
  if(unknown)return {ready:false,reason:'An in-play Development Card may override '+name+'; its effect is not certified.'};
  if(name==='Culture Attack'){
   const preview=enemyCulturePreview(s,f.enemy);
   if(preview.unverifiedRavaged)return {ready:false,reason:'Resolve ambiguous Ravaged counter ownership before Culture Attack.'};
   return {ready:true,command:{type:'ENEMY_AUTO_CULTURE_ATTACK'},reason:'Apply calculated Culture Attack loss and move the Instruction.'};
  }
  const bison=s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round');
  const hasStockTribe=s.pieces.some(p=>p.type==='Tribe'&&p.location==='reserve');
  // On the recorded complete 36-space map, an Encroach is impossible if no
  // round space can receive a Tribe, regardless of the territory die.
  const hasEncroachSpace=SPACES.some(space=>space.type==='round'&&
   !s.pieces.some(piece=>piece.location===space.id&&['Rancheria','Settlement','Tribe','Band'].includes(piece.type)));
  const canEncroach=hasStockTribe&&hasEncroachSpace;
  const noHuntTarget=bison.length===0;
  // §6.3.3 explicitly redirects a non-placeable Encroach to Hunt.
  // §6.3.1 redirects Ally to Encroach when there is no eligible Tribe.
  // With no stock Tribe and no Bison, neither redirect can change the board.
  if(name==='Encroach'&&!canEncroach&&noHuntTarget)
   return {ready:true,command:{type:'ENEMY_AUTO_EMPTY_HUNT'},reason:'Encroach redirects to Hunt: no legal Tribe placement and no Bison in play.'};
  if(name==='Encroach'&&!canEncroach&&bison.length===1)
   return {ready:true,command:{type:'ENEMY_AUTO_SINGLE_BISON_HUNT'},reason:'Encroach redirects to Hunt: no legal Tribe placement, one forced Bison target.'};
  if(name==='Hunt'&&noHuntTarget)
   return {ready:true,command:{type:'ENEMY_AUTO_EMPTY_HUNT'},reason:'No Bison are in any territory: Hunt has no effect regardless of the territory die.'};
  if(name==='Hunt'&&bison.length===1)
   return {ready:true,command:{type:'ENEMY_AUTO_SINGLE_BISON_HUNT'},reason:'Only one Bison exists on the entire territory map; it is the forced Hunt target for every territory die result.'};
  if(name==='Hunt'&&bison.length>1)
   return {ready:true,command:{type:'ENEMY_AUTO_HUNT'},reason:'Roll the printed six-face territory die, cycle to the first territory with Bison, and randomly remove one Bison using the same seeded engine procedure.'};
  if(name==='Encroach'&&!canEncroach&&bison.length>1)
   return {ready:true,command:{type:'ENEMY_AUTO_HUNT'},reason:'Encroach cannot place a stock Tribe. Execute its required Hunt redirect with verified territory mapping and digital random Bison selection.'};
  if(name==='Ally'){
   const candidates=allyTargetPreview(s,f.enemy);
   if(candidates.unknownRavaged||candidates.recoverFirst)return {ready:false,reason:'Recover must resolve before Ally.'};
   if(candidates.candidates.length===1)return {ready:true,command:{type:'ENEMY_ALLY',tribeId:candidates.candidates[0].id,ack:true},reason:'Only one eligible Tribe for Ally.'};
   if(!candidates.candidates.length&&!canEncroach&&noHuntTarget)
    return {ready:true,command:{type:'ENEMY_AUTO_EMPTY_HUNT'},reason:'Ally redirects to Encroach and Hunt: no eligible Tribe, no legal Encroach space, no Bison.'};
   if(!candidates.candidates.length&&!canEncroach&&bison.length===1)
    return {ready:true,command:{type:'ENEMY_AUTO_SINGLE_BISON_HUNT'},reason:'Ally redirects through Encroach to Hunt: only one possible Bison target.'};
   return {ready:false,reason:candidates.candidates.length?'Choose among '+candidates.candidates.length+' eligible Tribes; Ally target belongs to the player.':'Ally redirects to Encroach; a verified territory die and placement are required.'};
  }
  if(name==='Raid'){
   const wr=enemyWarRaidPreview(s);
   if(wr.redirect==='Encroach'){
    if(!canEncroach&&noHuntTarget)return {ready:true,command:{type:'ENEMY_AUTO_EMPTY_HUNT'},reason:'Raid redirects to Encroach then Hunt: no legal placement or Bison.'};
    if(!canEncroach&&bison.length===1)return {ready:true,command:{type:'ENEMY_AUTO_SINGLE_BISON_HUNT'},reason:'Raid redirects through Encroach to Hunt: single Bison target.'};
   }
  }
  if(name==='War'||name==='Raid'){
   const wr=enemyWarRaidPreview(s);
   if(wr.ready&&['engaged','peace-ends-war'].includes(wr.mode))return {ready:true,command:{type:'ENEMY_WAR_RAID'},reason:wr.reason};
   return {ready:false,reason:wr.reason};
  }
  if(name==='Peace'){
   const special=peaceWarColumnPreview(s);
   if(special.ready && ['engaged','war-ends'].includes(special.mode))return {ready:true,command:{type:'ENEMY_PEACE_WAR'},reason:special.reason};
   const target=peaceTargetPreview(s,f.enemy);
   if(target.recoverFirst||target.unknownRavaged)return {ready:false,reason:'Resolve Recover or unknown Ravaged status before Peace.'};
   if(target.requiresWarProcedure)return {ready:false,reason:special.ready?special.reason:special.reason||'Resolve active War Column before placing Peace.'};
   return {ready:true,command:{type:'ENEMY_PEACE',ack:true},reason:'Place Peace in the confirmed Enemy square.'};
  }
  return {ready:false,reason:name+' has unresolved printed choices, die tables or map requirements. Use the existing guided procedure.'};
 }
 if(f.stage==='done')return {ready:true,command:{type:'ENEMY_AUTO_FINISH'},reason:'Reset the display and complete the free Instruction.'};
 return {ready:false,reason:'Unknown Enemy Instruction stage.'};
}
/** Single legal Ravaged placement, including Tactics I fourth-marker consequence. */
function placeCultureRavaged(s,space){
 const previous=s.pieces.filter(q=>q.subtype==='Ravaged'&&q.location===space).length;
 createPiece(s,{type:'Marker',subtype:'Ravaged',label:'Ravaged',location:space,owner:'Enemy'});
 if(cultureActive(s,'C21')&&previous===3){
  const targets=s.pieces.filter(q=>q.location===space&&['Tribe','Settlement'].includes(q.type));
  if(targets.length>1)fail('Tactics I target has ambiguous Tribe/Settlement stacking.');
  if(targets.length===1){
   targets[0].location='reserve';
   for(const q of s.pieces.filter(q=>q.location===space&&q.subtype==='Ravaged'))q.location='reserve';
  }
 }
}
export function perform(original,command){
 if(command.type==='ENEMY_AUTO_HUNT'){
  // One atomic, seeded transaction: territory die first, then the existing
  // §6.3.4 reducer randomly selects Bison within the selected territory.
  // Bypass is impossible: only a certified preview can authorize this path.
  const preview=enemyAutomationPreview(original);
  if(!preview.ready||preview.command?.type!=='ENEMY_AUTO_HUNT')fail(preview.reason||'Hunt requires prior Enemy procedure validation.');
  const roll=rollSeededDie(original.rng.seed);
  const staged=structuredClone(original);
  staged.rng.seed=roll.seed;staged.rng.rolls++;
  return perform(staged,{type:'ENEMY_HUNT',die:roll.face});
 }
 if(command.type==='WAR_AUTO_UNTIL_CHOICE'){
  if(original.phase!=='war')fail('The War automation runner is only available in the War Phase.');
  // Progress over the real reducer, not a fake ledger. Stop before player
  // choices or unresolved source data. Each underlying step is journalled.
  let current=original,executed=0,stop='';
  for(let i=0;i<24;i++){
   const status=warAutomationStatus(current);
   if(status.next==='WAR_AUTO_ATTRITION'&&cultureWarEvasionOptions(current).length){stop='Optional Lords of the Plains evasion requires a player decision before War attrition.';break;}
   if(!status.ready||!status.next){stop=status.reason;break;}
   try{
    const next=perform(current,{type:status.next});
    if(JSON.stringify(next)===JSON.stringify(current))break;
    current=next;executed++;
   }catch(err){stop=err.message;break;}
  }
  if(!executed)fail(stop||'No verified War procedure can progress automatically.');
  return current;
 }
 if(command.type==='CULTURE_DIGITAL_GAIN'){
  if(original.phase!=='execution'||original.operation!=='Culture'||original.operationEvents?.cultureGain)fail('No unresolved Culture operation.');
  const evidence=cultureGainPreview(original);
  if(evidence.mismatches.length)fail('Territory control is ambiguous; Culture requires an actual board decision.');
  if(!cultureCardEffectAudit(original).safe)fail('An active card may override Culture; inspect the card before proceeding.');
  const result=perform(original,{type:'CULTURE_LEDGER_GAIN',ack:true});
  result.log[0].command='CULTURE_DIGITAL_GAIN';
  result.log[0].description=`Digital Culture §4.2: +${evidence.gain} gross points from recorded Rancherías and controlled territories; 9-point cap applied. All active cards passed the Culture-specific card-effect audit.`;
  return result;
 }
 if(command.type==='OPERATIONS_START_ADVANCE'){
  // §4.1/§4.2: the marker advances from Start to 1 without a die roll.
  // No printed die/card interpretation or testimony is needed for this step.
  if(original.phase!=='execution'||!['Culture','Take Actions'].includes(original.operation)||original.operationEvents?.operationsRoll||original.tracks.operations!==0||(original.operation==='Take Actions'&&original.activeBandId))fail('No automatic Operations Start advance is available.');
  const result=perform(original,{type:'OPERATIONS_ROLL',ack:true});
  result.log[0].command='OPERATIONS_START_ADVANCE';
  result.log[0].description='Automatic Operations Start advance: marker moves to 1 without rolling (§4.1 / §4.2).';
  return result;
 }
 if(command.type==='OPERATIONS_DIGITAL_ROLL'){
  if(!command.ack)fail('Confirm that no printed card changes the Operations-track roll.');
  if(original.phase!=='execution'||!['Take Actions','Culture'].includes(original.operation)||original.operationEvents?.operationsRoll)fail('No unresolved Operations-track check is available.');
  const tmp=clone(original);
  if(tmp.tracks.operations===0)return perform(tmp,{type:'OPERATIONS_ROLL',ack:true});
  const roll=rollSeededDie(tmp.rng.seed);tmp.rng.seed=roll.seed;tmp.rng.rolls++;
  const result=perform(tmp,{type:'OPERATIONS_ROLL',die:roll.face,ack:true});
  result.log[0].command='OPERATIONS_DIGITAL_ROLL';
  result.log[0].description=`Seeded digital Operations die ${roll.face}: `+result.log[0].description;
  return result;
 }
 if(command.type==='BATTLE_DIGITAL_ROLL'){
  // Separate audited command for digital dice; never trust client-supplied faces.
  // Printed DRM and active card modifiers remain explicit player confirmations.
  const tmp=clone(original);
  if(tmp.phase!=='war'||tmp.battlePending||!command.ack)fail('Confirm the War DRM and card effects before rolling digital Battle dice.');
  const count=command.gunId?2:1,rolls=[];
  for(let i=0;i<count;i++){
   const next=rollSeededDie(tmp.rng.seed);tmp.rng.seed=next.seed;tmp.rng.rolls++;
   rolls.push(next.face);
  }
  const result=perform(tmp,{...command,type:'BATTLE_ROLL',dice:rolls});
  // Preserve the meaningful source of the roll in the log (including seed).
  result.log[0].command='BATTLE_DIGITAL_ROLL';
  result.log[0].description=result.log[0].description.replace('Battle roll (§7.1):', 'Seeded digital Battle roll (§7.1):');
  return result;
 }
 if(command.type==='ENEMY_AUTO_PROGRESS'){
  let current=original,executed=0,lastReason='';
  for(let i=0;i<50;i++){
   const next=enemyAutomationPreview(current);
   if(!next.ready){lastReason=next.reason;break;}
   current=perform(current,next.command);executed++;
   if(!current.enemyFlow)break;
  }
  if(!executed)fail(lastReason||'No safely automatable Enemy Instruction step remains.');
  // One user action and one undo snapshot; intermediate audit entries remain in log.
  return current;
 }

 const s=clone(original);const {type}=command;let message='';let quality='verified';
 if(s.setupDevelopmentPendingDie&&!['SETUP_DOWNFALL_DEVELOPMENT_REROLL','SETUP_DOWNFALL_DEVELOPMENT_COMMIT','NOTE'].includes(type))fail('Resolve the already rolled Downfall Development die or use a Trade Goods reroll before other actions.');
 if(s.developmentUte&&!['DEVELOPMENT_UTE_RESOLVE','DEVELOPMENT_COUNTING_COUP_UTE_REROLL','NOTE'].includes(type))fail('Resolve the Ute Alliance die or use held Counting Coup before another action.');
 if(s.qualityMountsPending&&!['DEVELOPMENT_QUALITY_MOUNTS_RESOLVE','DEVELOPMENT_COUNTING_COUP_MOUNTS_REROLL','NOTE'].includes(type))fail('Resolve the Quality Mounts finish die, or use Counting Coup to reroll before committing its outcome.');
 if(s.developmentPending&&!['DEVELOPMENT_REGISTER_PHYSICAL_STOCK','DEVELOPMENT_REGISTER_TEXAS_STOCK','DEVELOPMENT_CONFIRM_EFFECT','DEVELOPMENT_RESOLVE_EPIDEMIC','DEVELOPMENT_RESOLVE_SMALLPOX','DEVELOPMENT_RESOLVE_HORSE_DISCARD','DEVELOPMENT_BUFFALO_RESOLVE','DEVELOPMENT_NUEVO_APACHERIA','DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT','DEVELOPMENT_RESOLVE_MEDICINE','DEVELOPMENT_RESOLVE_KIOWA','NOTE'].includes(type))fail('Resolve the newly revealed Development card before continuing.');
 if(s.countermeasureWindow&&!['WAR_FINISH_COUNTERMEASURE','NOTE'].includes(type))fail('Resolve or decline the post-Finish War countermeasure before continuing.');
 if(s.developmentMountedMove&&!['PLANNING_MOVE_RANCHERIA','DEVELOPMENT_MOUNTED_FINISH','NOTE'].includes(type))fail('Finish Mounted Society Ranchería movement before continuing.');
 if(s.pending && !['DEVELOPMENT_COUNTING_COUP_REDRAW','DEVELOPMENT_COUNTING_COUP_REROLL','DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL','RAID_DIGITAL_START','RAID_DIGITAL_REWARD','RESOLVE_RAID','CANCEL_RAID','NOTE','START_SUCCESS_CHECK','RECORD_SUCCESS_DRAW','DIGITAL_CUP_DRAW','FINISH_SUCCESS_CHECK','CANCEL_SUCCESS_CHECK','GUNS_CANCEL_AP','TRADE_GOODS_REDRAW','DEVELOPMENT_PLAY_SKILLFUL','DEVELOPMENT_TACTICAL','CULTURE_WARFARE_EXTRA_DRAW',...RAID_CUP_COMMANDS].includes(type))fail('Finish or cancel the unresolved Raid before doing anything else.');
 if(s.battlePending && !['EDIT_PIECE','MOVE_PIECE','NOTE','BATTLE_RECONCILE','BATTLE_AUTO_RECONCILE','DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL'].includes(type))fail('Reconcile the recorded Battle result in the counter ledger first, or Undo the roll.');
 if(s.battleContinuation && !s.battlePending && !['BATTLE_ROLL','BATTLE_CLOSE_OVERRIDE','NOTE','EDIT_PIECE','MOVE_PIECE'].includes(type))fail('A Battle requires another round. Finish it before other actions, or enter a documented card exception.');
 if(s.successCheck && !['RECORD_SUCCESS_DRAW','DIGITAL_CUP_DRAW','FINISH_SUCCESS_CHECK','CANCEL_SUCCESS_CHECK','GUNS_CANCEL_AP','TRADE_GOODS_REDRAW','DEVELOPMENT_COUNTING_COUP_REDRAW','DEVELOPMENT_COUNTING_COUP_REROLL','DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL','DEVELOPMENT_TACTICAL','CULTURE_WARFARE_EXTRA_DRAW','NOTE'].includes(type))fail('Complete or cancel the Success Check before continuing.');
 if(s.warMovement && !['WAR_MOVE_STEP','WAR_MOVE_FINISH','WAR_MOVE_CANCEL','NOTE'].includes(type))fail('Complete the registered War Card movement or Undo before other actions.');
 if(s.enemyFlow && !['ENEMY_SELECT','ENEMY_VERIFY_FACE','ENEMY_PAY','ENEMY_CONFIRM','ENEMY_FINISH','ENEMY_AUTO_COMPLETE','ENEMY_AUTO_FINISH','ENEMY_AUTO_EMPTY_HUNT','ENEMY_AUTO_SINGLE_BISON_HUNT','NOTE',...(s.enemyFlow.stage==='effect'?['EDIT_PIECE','MOVE_PIECE','ADD_PIECE','DELETE_PIECE','LOSE_POINTS','ENEMY_RECOVER','ENEMY_SUBJUGATE','ENEMY_SETTLE','ENEMY_CULTURE_ATTACK','ENEMY_AUTO_CULTURE_ATTACK','ENEMY_PEACE_WAR','ENEMY_WAR_RAID','ENEMY_HUNT','ENEMY_ENCROACH','ENEMY_ALLY','ENEMY_PEACE','ENEMY_CARD_NO_EFFECT','DEVELOPMENT_PLAY_NO_RELIEF']:[])].includes(type))fail('Finish this Enemy Instruction procedure before other actions.');
 // A pending Victory Check blocks everything except the final decision and notes.
 if(s.victoryPending&&!['RESOLVE_VICTORY','RESOLVE_VICTORY_FROM_LEDGER','NOTE'].includes(type))fail('Resolve the required History Card Victory Check before other actions.');
 // A Development-card Headman Action consumes an actual Paraibo action,
 // in addition to any printed AP cost. Legacy in-flight saves without the
 // step director keep their prior manual workflow rather than being rewritten.
 const headmanCardCommands=new Set(['DEVELOPMENT_TAKE_HAND','DEVELOPMENT_TAKE_VERIFIED_HAND','DEVELOPMENT_GIFT_GIVING','DEVELOPMENT_GREAT_HUNT_HAND','DEVELOPMENT_PLAY_NEGOTIATION']);
 if(s.phase==='execution'&&s.operation==='Planning'&&headmanCardCommands.has(type)){
   if(s.planningStage!==4)fail('Development Headman Actions belong to Planning step 4.');
   const record=s.planningHeadman?.[String(command.headmanRancheriaId||command.rancheriaId||'')];
   if(!record||record.spent>=record.allowance)fail('Choose an eligible Paraibo with an unspent Headman Action first.');
   record.spent++;
 }
 switch(type){
 case 'APPLY_SCENARIO_SETUP':{
   if(s.phase!=='setup'||s.pieces.length||s.cards.length)fail('Choose an official scenario on a fresh empty game.');
   if(!SCENARIO_DETAILS[command.scenario])fail('Unknown official scenario.');
   s.scenario=command.scenario;s.period=SCENARIO_DETAILS[s.scenario].startPeriod;
   installOpeningTemplate(s);
   message=`Prepared ${SCENARIOS.find(x=>x[0]===s.scenario)[1]} (${SCENARIO_DETAILS[s.scenario].periods}), per GMT Living Rules §§9.1 and ${SCENARIO_DETAILS[s.scenario].rule}.`;
   quality='manual';break;
 }
 case 'SETUP_AUDIT_LEDGER':{
   if(s.phase!=='setup'||s.setupTemplate!=='official')fail('Load an official scenario before validating setup.');
   const audit=openingLedgerAudit(s),unresolved=audit.checks.filter(x=>!x.ok);
   if(unresolved.length)fail(`Starting ledger does not match the printed setup: ${unresolved.map(x=>x.key).join(', ')}. Resolve discrepancies before continuing.`);
   const fresh=audit.checks.filter(x=>!s.setupConfirmed[x.key]);
   if(!fresh.length)fail('All currently machine-verifiable setup checkpoints have already been checked.');
   for(const item of fresh)s.setupConfirmed[item.key]=true;
   message=`Validated ${fresh.map(x=>x.key).join(', ')} against the official starting ledger. Printed Band ratings, deck shuffling and remaining player choices were NOT inferred.`;
   break;
 }
 case 'SETUP_CULTURE_CARD':{
   if(s.phase!=='setup'||s.setupTemplate!=='official')fail('Select Culture cards only during official setup.');
   if(s.scenario==='downfall'&&!s.setupConfirmed.medicine)fail('Set up Downfall headmen before purchasing starting Culture Cards (§9.5.H–K).');
   if(s.setupCultureFinished)fail('The optional setup Culture selection is already closed. Undo to change it.');
   const opts=scenarioSetupOptions(s),selected=opts.availableCulture.find(x=>x.id===String(command.cultureId||''));
   if(!selected?.eligible)fail('Culture card is unavailable, has an unmet prerequisite, or exceeds the scenario allowance.');
   const card=s.cards.find(c=>c.kind==='Culture'&&cultureIdentity(c)?.id===selected.id);
   card.zone='In play';card.identifier=selected.id;card.title=`${selected.family} level ${selected.level}`;
   card.evidenceStatus='checked-against-print';card.sourceReference=selected.source;
   s.setupCultureSpent+=s.scenario==='downfall'?selected.cost:1;
   message=`Official setup: selected ${selected.id} ${selected.family} level ${selected.level}${s.scenario==='downfall'?` (${s.setupCultureSpent}/12 cost points)`: ' free'}. General Record Culture track remains 3.`;
   break;
 }
 case 'SETUP_CULTURE_FINISH':{
   if(s.phase!=='setup'||s.setupTemplate!=='official'||s.setupCultureFinished)fail('No open setup Culture selection.');
   if(s.scenario==='downfall'&&!s.setupConfirmed.medicine)fail('Finish Downfall headmen Medicine before completing Culture setup.');
   s.setupCultureFinished=true;
   s.setupConfirmed['cards-culture']=true;
   if(s.scenario==='downfall')s.setupConfirmed.culture=true;
   message=`Scenario Culture setup complete: ${s.setupCultureSpent||0}${s.scenario==='downfall'?'/12':' free starting card(s)'} selected.`;break;
 }
 case 'SETUP_CONFIRM_BAND_RATINGS':{
   if(s.phase!=='setup')fail('Printed Band ratings belong to scenario setup.');
   const ids=s.pieces.filter(p=>p.type==='Band'&&p.ratingConfirmed===false).map(p=>p.id);
   const provided=command.ratings||{};
   if(!ids.length)fail('All printed Band Movement ratings are already recorded.');
   if(!ids.every(id=>Object.hasOwn(provided,id)))fail('Record every still-unverified Band rating.');
   for(const id of ids){const p=s.pieces.find(x=>x.id===id);p.mpRating=bounded(provided[id],0,20,'Band printed Movement rating');p.ratingConfirmed=true;}
   s.setupConfirmed.bands=true;
   message=`Recorded the printed Movement rating for all ${ids.length} Band counters.`;quality='manual';break;
 }
 case 'SETUP_DOWNFALL_ROLL_BISON':{
   checkDownfallPlacement(s);
   if(s.setupConfirmed.bison)fail('The Downfall starting Bison have already been placed.');
   if(s.pieces.some(p=>p.id.startsWith('setup-ranch-')&&SPACE[p.location]))fail('Roll the starting Bison before placing Rancherías.');
   const occupied=new Set(s.pieces.filter(p=>['Tribe','Settlement','Rancheria','Band','Bison'].includes(p.type)&&SPACE[p.location]?.type==='round').map(p=>p.location));
   const initialSeed=s.rng.seed;
   const records=[];const placements=[];
   // §2.2 chooses a territory using the board's printed die sequence, then
   // a numbered area. Reroll illegal or occupied spaces without biasing to a
   // hand-built set of vacant spaces.
   for(let attempts=0;placements.length<9&&attempts<1024;attempts++){
     const a=rollSeededDie(s.rng.seed);s.rng.seed=a.seed;s.rng.rolls++;
     const b=rollSeededDie(s.rng.seed);s.rng.seed=b.seed;s.rng.rolls++;
     const loc=`${TERRITORY_DIE_ORDER[a.face-1]}-${b.face}`;
     const accepted=!occupied.has(loc);
     records.push({territoryDie:a.face,areaDie:b.face,space:loc,accepted});
     if(accepted){placements.push(loc);occupied.add(loc);}
   }
   if(placements.length!==9)fail('Cannot place nine legal Downfall Bison by the printed territory/area dice.');
   const bison=s.pieces.filter(p=>p.id.startsWith('setup-downfall-bison-'));
   if(bison.length!==9)fail('Downfall requires exactly nine physical Bison counters.');
   bison.forEach((p,i)=>p.location=placements[i]);
   s.setupConfirmed.bison=true;s.setupBisonRolls=records;s.setupBisonStartSeed=initialSeed;
   message=`Rolled ${records.length} printed §2.2 territory/area pairs, rerolled ${records.length-9} blocked results and placed nine Downfall Bison: ${placements.join(', ')}.`;
   break;
 }
 case 'SETUP_DOWNFALL_BISON':{
   checkDownfallPlacement(s);
   const positions=asArray(command.spaces);
   if(positions.length!==9||new Set(positions).size!==9||positions.some(x=>SPACE[x]?.type!=='round'))fail('Choose nine distinct, numbered map spaces for the nine Bison.');
   if(positions.some(loc=>s.pieces.some(p=>p.location===loc&&['Tribe','Settlement','Rancheria','Band','Bison'].includes(p.type)&&!p.id.startsWith('setup-downfall-bison-'))))fail('A Bison cannot be set in an occupied map space. Reconcile the printed stacking rule.');
   if(s.pieces.some(p=>p.id.startsWith('setup-ranch-')&&SPACE[p.location]))fail('Place the random Bison before choosing the three Rancherías, as printed.');
   const bison=s.pieces.filter(p=>p.id.startsWith('setup-downfall-bison-'));
   bison.forEach((p,i)=>p.location=positions[i]);s.setupConfirmed.bison=true;s.setupBisonRolls=[];s.setupBisonStartSeed=null;
   message='Downfall: recorded nine distinct Bison spaces from the player’s §2.2 random-map-space rolls (including any legal stacking rerolls).';quality='manual';break;
 }
 case 'SETUP_DOWNFALL_RANCHERIAS':{
   checkDownfallPlacement(s);
   if(!s.setupConfirmed.bison)fail('Record nine starting Bison spaces first (§9.5.E).');
   const choices=command.spaces||{},positions='ABC'.split('').map(letter=>choices[letter]);
   if(positions.some(loc=>SPACE[loc]?.type!=='round')||new Set(positions).size!==3)fail('Choose three distinct numbered spaces, one for each Ranchería.');
   if(new Set(positions.map(loc=>SPACE[loc].territory)).size!==3)fail('Rancherías must occupy three different Territories (§9.5.F).');
   if(positions.some(loc=>s.pieces.some(p=>p.location===loc&&['Tribe','Settlement','Bison','Band'].includes(p.type))))fail('Ranchería placement conflicts with an existing counter; use a legally empty space.');
   const temporary=structuredClone(s);for(const letter of 'ABC')temporary.pieces.find(p=>p.id===`setup-ranch-${letter}`).location=choices[letter];
   const controlled=territoryControlAudit(temporary).filter(x=>x.status==='controlled');
   if(controlled.length<2)fail('Downfall requires controlling two different Territories and having a Ranchería in a third (§9.5.F).');
   for(const letter of 'ABC')s.pieces.find(p=>p.id===`setup-ranch-${letter}`).location=choices[letter];
   s.setupConfirmed.rancherias=true;
   message=`Downfall: placed Rancherías A/B/C in ${positions.join(', ')} with ${controlled.length} controlled Territories.`;quality='manual';break;
 }
 case 'SETUP_DOWNFALL_RESOURCES':{
   checkDownfallPlacement(s);
   if(!s.setupConfirmed.rancherias)fail('Place all three Rancherías first.');
   const allocation=command.allocation||{};
   const data='ABC'.split('').map(letter=>{
    const entry=allocation[letter]||{};
    return {letter,band2:bounded(entry.band2,0,4,'Strength-2 Bands'),band1:bounded(entry.band1,0,2,'Strength-1 Bands'),horses:bounded(entry.horses,0,8,'Horse counters'),trade:bounded(entry.trade,0,1,'Trade Goods')};
   });
   if(data.reduce((n,x)=>n+x.band2,0)!==4||data.reduce((n,x)=>n+x.band1,0)!==2)fail('Distribute all four strength-2 and both strength-1 Bands among the Rancherías.');
   if(data.reduce((n,x)=>n+x.horses,0)>8||data.reduce((n,x)=>n+x.trade,0)>1)fail('Maximum eight Horse and one Trade Goods counters.');
   for(const [type,prefix,field] of [['Band','setup-downfall-band2-','band2'],['Band','setup-downfall-band1-','band1'],['Resource','setup-downfall-horse-','horses'],['Resource','setup-downfall-trade','trade']]){
    const list=s.pieces.filter(p=>p.type===type&&p.id.startsWith(prefix));let index=0;
    for(const x of list)x.location='reserve';
    for(const record of data)for(let i=0;i<record[field];i++)list[index++].location=`box:setup-ranch-${record.letter}`;
   }
   s.setupConfirmed.resources=true;message='Downfall: assigned the starting six Bands and selected Horse/Trade Goods counters to A/B/C Resources boxes.';quality='manual';break;
 }
 case 'SETUP_DOWNFALL_MEDICINE':{
   checkDownfallPlacement(s);
   if(!s.setupConfirmed.resources)fail('Distribute the starting Bands and Resources first.');
   const selected=command.medicine||{};let total=0;
   for(const letter of 'ABC')for(const type of ['paraibo','mahimiana']){
    const value=bounded(selected[`${letter}-${type}`],1,6,'Headman Medicine');total+=value;
    s.pieces.find(p=>p.id===`setup-${type}-${letter}`).medicine=value;
   }
   if(total>12)fail(`The six Downfall headmen total ${total} Medicine; maximum is 12 (§9.5.H).`);
   s.medicine={paraibo:null,mahimiana:null};s.setupConfirmed.medicine=true;
   message=`Downfall: all six headmen assigned Medicine of at least 1 (total ${total}/12).`;quality='manual';break;
 }
 case 'SETUP_FINISH_DEVELOPMENT':{
   checkDownfallPlacement(s);
   if(!s.setupDevelopmentRoll||s.developmentPending)fail('Resolve the printed starting Development card effect before completing this setup step.');
   s.setupConfirmed.development=true;
   message='Starting Development card #'+s.setupDevelopmentRoll.number+' and its required reveal effect confirmed.';break;
 }
 case 'SETUP_DOWNFALL_DEVELOPMENT_ROLL':{
   checkDownfallPlacement(s);
   if(!s.setupConfirmed.bison||!s.setupConfirmed.rancherias||!s.setupConfirmed.resources||!s.setupConfirmed.medicine||!s.setupCultureFinished||s.setupDevelopmentRoll||s.setupDevelopmentPendingDie)fail('Complete Downfall placement, Medicine and Culture before its single Development roll.');
   const initialSeed=s.rng.seed;
   const r=rollSeededDie(s.rng.seed);s.rng.seed=r.seed;s.rng.rolls++;
   s.setupDevelopmentPendingDie={initialSeed,dice:[r.face],die:r.face,rerolls:0};
   message=`Downfall starting Development die: ${r.face}. Accept it, or spend an allocated Trade Goods to reroll once before revealing a card.`;
   break;
 }
 case 'SETUP_DOWNFALL_DEVELOPMENT_REROLL':{
   checkDownfallPlacement(s);
   const pending=s.setupDevelopmentPendingDie;
   if(!pending||pending.rerolls!==0)fail('Only a single unresolved Development die may be rerolled once.');
   if(!s.pieces.some(p=>p.id==='setup-downfall-trade'&&p.location.startsWith('box:')))fail('A Trade Goods counter must be allocated to reroll.');
   const r=rollSeededDie(s.rng.seed);s.rng.seed=r.seed;s.rng.rolls++;
   pending.dice.push(r.face);pending.die=r.face;pending.rerolls=1;
   message=`Spent the right to reroll with Trade Goods: final seeded Development die ${r.face}. The actual Trade Goods is returned to stock when the result is committed.`;
   break;
 }
 case 'SETUP_DOWNFALL_DEVELOPMENT_COMMIT':
 case 'SETUP_DOWNFALL_DEVELOPMENT':{
   checkDownfallPlacement(s);
   if(!s.setupConfirmed.bison||!s.setupConfirmed.rancherias||!s.setupConfirmed.resources||!s.setupConfirmed.medicine)fail('Complete Downfall Bison, Ranchería, Resources and Medicine choices before revealing the third Development card.');
   if(!s.setupCultureFinished)fail('Finish the starting Culture purchases before revealing the Downfall Development card (§9.5.K–L).');
   if(s.setupDevelopmentRoll)fail('Third starting Development card already selected. Undo to change this outcome.');
   const digital=type==='SETUP_DOWNFALL_DEVELOPMENT_COMMIT';
   if(digital&&!s.setupDevelopmentPendingDie)fail('Roll the digital Development die before committing it.');
   const die=bounded(digital?s.setupDevelopmentPendingDie.die:command.die,1,6,'Final Downfall Development die');
   const used=bounded(digital?s.setupDevelopmentPendingDie.rerolls:(command.tradeGoodsSpent||0),0,1,'Trade Goods spent on reroll');
   if(digital)s.setupDevelopmentPendingDie=null;
   if(used){const trade=s.pieces.find(p=>p.id==='setup-downfall-trade'&&p.location.startsWith('box:'));if(!trade)fail('The reroll requires an allocated Trade Goods counter to spend.');trade.location='reserve';}
   const number=die<=2?'26':die<=4?'28':'38';
   const c=s.cards.find(x=>x.kind==='Development'&&String(x.identifier)===number);
   c.zone='In play';s.setupDevelopmentRoll={die,number,tradeGoodsSpent:used};
   message=`Downfall: final die ${die} gives starting Development #${number}${used?'; spent Trade Goods for a reroll':''}. `+revealDevelopmentEffect(s,c);
   s.setupConfirmed.development=!s.developmentPending;
   break;
 }
 case 'START':{
   if(s.phase!=='setup')fail('Game has already been started.');
   if(!safeNext(s).ok)fail(safeNext(s).message);
   if(s.tracks.military===0 && s.tracks.culture===0)fail('Starting with 0 Military and 0 Culture would be immediate defeat. Enter the physical setup tracks first.');
   s.phase='war';s.cleanupFinishedRolls=[];s.cleanupFinishedPending=null;s.cleanupCupResult=null;s.battleExemptions={};s.steps={};message='Started tracking game. Confirm physical scenario setup matches.';quality='manual';break;}
 case 'APPLY_OPENING_TEMPLATE':{
   installOpeningTemplate(s);message=`Loaded official ${SCENARIOS.find(x=>x[0]===s.scenario)[1]} starting position from GMT Living Rules §§9.1 and ${SCENARIO_DETAILS[s.scenario].rule}. Resolve the on-screen scenario choices before starting.`;quality='manual';break;}
 case 'CONFIRM_SETUP':{
   if(s.phase!=='setup'||!s.setupChecklist||!(command.key in s.setupChecklist))fail('Unknown opening setup checkpoint.');
   if(s.setupTemplate==='official'&&openingLedgerAudit(s).checks.some(x=>x.key===command.key)&&command.value)fail('This setup checkpoint requires the digital ledger audit; a manual checkbox cannot bypass it.');
   if(s.setupTemplate==='official'&&s.scenario==='downfall'&&['bison','rancherias','resources','medicine','culture','development','bands'].includes(command.key)&&command.value)fail('Complete this Downfall setup step through its dedicated game controls first.');
   if(s.setupTemplate==='official'&&s.scenario!=='downfall'&&['cards-culture','bands'].includes(command.key)&&command.value)fail('Complete Culture and Band selection through dedicated controls first.');
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
 case 'CULTURE_LEDGER_GAIN':{
   if(s.phase!=='execution'||s.operation!=='Culture'||s.operationEvents?.cultureGain)fail('No unresolved Culture gain exists.');
   if(!command.ack)fail('Confirm that the digital inventory and current cards match the physical game.');
   const preview=cultureGainPreview(s);
   if(preview.mismatches.length)fail('Territory ownership is ambiguous or requires review; use the guided Culture form.');
   const old=s.tracks.culture;s.tracks.culture=Math.min(9,old+preview.gain);
   s.operationEvents.cultureGain=true;
   message=`Ledger-confirmed Culture §4.2: ${preview.ranchTerritories.length} Ranchería territories + ${preview.declaredControlled.length} controlled territories = ${preview.gain}; +${s.tracks.culture-old} Culture (cap 9). Physical accuracy explicitly confirmed.`;
   quality='manual';break;
 }
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
   if(r.rancheriaId && s.steps.w4==='done' && s.steps.w5!=='done' &&
      (!s.battleContinuation?.paidDefense || s.battleContinuation.rancheriaId!==r.rancheriaId))
     fail('Choose the Ranchería §3.1 step-5 defence and pay 1 Military Point before rolling a Battle round.');
   if(s.battleContinuation && (s.battleContinuation.warId!==r.warId||s.battleContinuation.warLocation!==r.warLocation))fail('Finish the ongoing Battle against the same War Column first.');
   if(r.gunId)item(s,r.gunId).location='reserve';
   s.battlePending=r;
   s.battleContinuation??={warId:r.warId,warLocation:r.warLocation};
   message=`Battle roll (§7.1): ${r.dice.join('/')} → ${r.natural} +${r.base}${r.mahimianaId?'+1 Mahimiana':''}${r.finished?'-1 Finished':''}-${r.warDrm} War DRM${r.cardDrm?` ${r.cardDrm>0?'+':''}${r.cardDrm} card`:''}${r.cultureDrm?'+1 Horsemanship':''} = ${r.modified}. ${r.won?'COMANCHE':'ENEMY'} wins. Reconcile printed counter consequences before proceeding.`;
   quality='manual';break;
 }
 case 'DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL':{
   // D09: the Battle dice have been rolled, but no combat result is yet
   // reconciled. Cancel one selected die only. Spending Guns is part of the
   // already-initiated Battle and is NOT repeated by the replacement roll.
   const prior=s.battlePending;
   const coup=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Hand');
   if(!prior||!coup||s.phase!=='war')fail('A held Counting Coup and unresolved Battle die are required.');
   if(prior.countingCoupReroll)fail('This Battle result has already been rerolled.');
   const dieIndex=Number(command.dieIndex);
   if(!Number.isInteger(dieIndex)||dieIndex<0||dieIndex>=prior.dice.length)fail('Choose one of the dice rolled in this Battle.');
   const replacement=rollSeededDie(s.rng.seed);
   const dice=prior.dice.slice(),old=dice[dieIndex];dice[dieIndex]=replacement.face;
   // The original Guns counter was already paid, so restore it only on a
   // temporary preview state while checking the original Battle modifiers.
   const previewState=clone(s);
   if(prior.gunId){const gun=item(previewState,prior.gunId);if(gun.location!=='reserve')fail('Battle Guns consumption cannot be reconciled.');gun.location=`held:${prior.unitId}`;}
   const next=battleRollPreview(previewState,{warId:prior.warId,unitId:prior.unitId,gunId:prior.gunId,mahimianaId:prior.mahimianaId,
     dice,warDrm:prior.warDrm,cardDrm:prior.cardDrm,cardReason:prior.cardReason,ack:true});
   s.rng.seed=replacement.seed;s.rng.rolls++;
   s.battlePending={...next,countingCoupReroll:{dieIndex,previous:old,replacement:replacement.face,cardId:coup.id}};
   coup.zone='Discard';
   message=`Counting Coup #09: cancelled Battle die ${dieIndex+1} (${old}), rolled ${replacement.face}; ${next.won?'Comanche':'Enemy'} wins the unresolved round. Guns are not spent twice.`;
   break;
 }
 case 'BATTLE_AUTO_RECONCILE':{
   const audit=battleAutoResolutionPreview(s);
   if(!audit.ready)fail(audit.reason);
   const r=s.battlePending,war=item(s,r.warId),unit=item(s,r.unitId);
   let effect='',ended=false;
   switch(audit.kind){
    case 'reduce-war':war.strength--;effect=`War Column reduced to ${war.strength}`;break;
    case 'war-ends':{
      // Preflight has already checked the paired Instruction and Mahimiana.
      const plan=resolveWarEnds(s,war.id);
      effect=`War Ends; paired Instruction ${plan.instructionId} returned to ${plan.destination}`;
      if(r.mahimianaId){
       const chief=item(s,r.mahimianaId);
       const old=medicineValue(s,chief);
       setMedicine(s,chief,Math.min(6,old+1));
       effect+=`; Mahimiana Medicine ${old} → ${medicineValue(s,chief)}`;
      }
      ended=true;break;
    }
    case 'reduce-band':unit.strength--;effect=`Band reduced to strength ${unit.strength}`;break;
    case 'band-defeated':{const d=defeatedBandPossessions(s,unit);effect=`Band defeated; ${d.resources} Resources to stock, ${d.mahimianas.length} Mahimiana(s) died`;ended=true;break;}
    case 'ranch-band-defeated':{const d=defeatedBandPossessions(s,unit);effect=`Ranchería Band defeated; ${d.resources} Resources to stock, ${d.mahimianas.length} Mahimiana(s) died; surviving Bands continue Battle`;break;}
    case 'ranch-destroyed':{
      unit.strength=0;unit.finished=true;
      const warLoss=pointLossPreview(s,'military',1);s.tracks=warLoss.tracks;
      const destruction=destroyRancheriaByRule(s,r.rancheriaId);
      const ends=resolveWarEnds(s,war.id);
      effect=`Last Ranchería Band defeated; War Column ${war.id} and Instruction ${ends.instructionId} returned; War -1 Military and Ranchería -2 Military (recorded direct losses ${warLoss.direct}+${destruction.militaryLost}, substituted Culture ${warLoss.otherLoss}+${destruction.cultureSubstituted})`;
      ended=true;break;
    }
    case 'ally-defeated':{
      const ally=item(s,audit.allyId);
      if(ally.location!==r.warLocation)fail('Allied Instruction location changed before reconciliation.');
      ally.location=audit.destination;
      effect=`Allied Tribe remains; ${ally.id} returned to ${audit.destination}`;
      ended=true;break;
    }
    default:fail('Unrecognised automatic Battle consequence.');
   }
   s.battlePending=null;
   if(ended)s.battleContinuation=null;
   s.battleRounds??=[];
   s.battleRounds.unshift({warId:r.warId,unitId:r.unitId,dice:r.dice,natural:r.natural,modified:r.modified,won:r.won,expected:r.expected,note:`Automatic source-constrained Battle resolution: ${effect}`,date:new Date().toISOString()});
   if(s.battleRounds.length>100)s.battleRounds.length=100;
   message=`Battle round resolved under §7: ${effect}. ${ended?'Battle ends.':'Further rounds are required.'}`;
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
   // Keep old manual command for saved clients; the normal Advance path
   // automatically calls the same resolver without a separate click.
   message=higherStakesAtCleanup(s);break;
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
   const eligible=()=>s.pieces.filter(p=>p.location==='cup'&&(p.type==='Instruction'||p.type==='Marker'&&(/^(Success|Enemy AP [234])$/.test(p.subtype)||(p.subtype==='?'&&p.faceDown===true&&/^(Success|Enemy AP [234])$/.test(p.hiddenSubtype)))));
   if(eligible().length<count)fail(`Not enough counters in the digital cup (${eligible().length} available, ${count} needed).`);
   const drawn=[];
   for(let i=0;i<count;i++){
     const list=eligible();const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     const counter=list[s.rng.seed%list.length];
     if(counter.type==='Instruction')restoreInstructionFront(counter);
     if(counter.type==='Marker'&&counter.subtype==='?'&&counter.faceDown===true){
       // Reveal only when this physical counter is actually drawn, never when Tactics III returns it.
       counter.subtype=counter.hiddenSubtype;delete counter.hiddenSubtype;counter.faceDown=false;
     }
     counter.location='check-draw';check.drawIds.push(counter.id);drawn.push(counter.subtype||counter.label);
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
   s.scenario=command.value;s.period=SCENARIO_DETAILS[command.value].startPeriod;
   message=`Scenario: ${SCENARIOS.find(x=>x[0]===s.scenario)[1]}`;quality='manual';break;}
 case 'CULTURE_WAR_EVADE_DECLINE':{
   if(s.phase!=='war'||s.steps.w1!=='done'||s.steps.w2)fail('Decline Lords of the Plains evasion before War step 2 only.');
   s.cultureEvadeDeclined=true;
   message='Declined further optional Lords of the Plains evasions; War attrition is next.';break;
 }
 case 'CULTURE_WAR_EVADE':{
   if(s.phase!=='war'||s.steps.w1!=='done'||s.steps.w2||s.cultureEvadeDeclined)fail('Lords of the Plains evasion belongs before War step 2 attrition.');
   const kind=String(command.kind||''),id=String(command.id||''),to=String(command.to||'');
   if(!cultureWarEvasionOptions(s).some(o=>o.kind===kind&&o.id===id&&o.to===to))fail('No such legal recorded evasion opportunity.');
   const counter=item(s,id),from=counter.location;
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   const strength=kind==='band'?counter.strength:s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${id}`).reduce((n,p)=>n+p.strength,0);
   const evaded=kind==='band'?roll.face>strength:roll.face>1&&roll.face>strength;
   s.cultureEvadeTried??=[];s.cultureEvadeTried.push(`${kind}:${id}`);
   if(evaded)counter.location=to;
   message=`${kind==='band'?'Lords I Band':'Lords III Ranchería'} evasion: rolled ${roll.face} against strength ${strength}; ${evaded?`moved ${id} ${from} → ${to}`:'remained in place'}.`;
   break;
 }
 case 'WAR_AUTO_PROGRESS':{
   const status=warAutomationStatus(s);
   if(!status.ready||!status.next)fail(status.reason);
   // Delegate to the existing verified commands. This command never invents
   // manual confirmations and never bypasses the card/battle gates.
   const advanced=perform(s,{type:status.next});
   Object.assign(s,advanced);
   message=`War automatic progress: ${status.next}. ${status.reason}`;
   break;
 }
 case 'WAR_RANCHERIA_FIGHT':{
   const rancheriaId=String(command.rancheriaId||'');
   const audit=rancheriaFightPreview(s,rancheriaId);
   if(!audit.ready)fail(audit.reason);
   if(!command.ack)fail('Confirm the recorded defenders, attacking War Columns, printed Battle exceptions and point tracks.');
   let choice=1,selectionRolls=[];
   if(audit.randomWarSelection){
     for(let i=0;i<40;i++){
       const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;selectionRolls.push(roll.face);
       if(roll.face<=audit.warIds.length){choice=roll.face;break;}
     }
     if(!selectionRolls.length||selectionRolls.at(-1)>audit.warIds.length)fail('Random War Column selection did not resolve.');
   }
   const war=item(s,audit.warIds[choice-1]);
   const loss=pointLossPreview(s,'military',1);
   s.tracks=loss.tracks;
   // A single continuation stores that the step-5 fee was already applied.
   // Further rounds never charge the fee a second time.
   s.battleContinuation={warId:war.id,warLocation:war.location,rancheriaId,paidDefense:true};
   message=`Ranchería ${rancheriaId} chose §3.1 step-5 defence: lost ${loss.direct} Military${loss.otherLoss?` and ${loss.otherLoss} substituted Culture`:''}; selected ${war.id} for Battle${selectionRolls.length?` (selection dice ${selectionRolls.join(', ')})`:''}. Roll the first Battle round; no second defence payment is needed during this Battle.`;
   break;
 }
 case 'WAR_RANCHERIA_SACRIFICE':{
   const rancheriaId=String(command.rancheriaId||'');
   const audit=rancheriaSacrificePreview(s,rancheriaId);
   if(!audit.ready)fail(audit.reason);
   if(!command.ack)fail('Confirm the counter ledger, all Captives, and applicable printed card exceptions.');
   // §2.2: equal die odds for each War Column; reroll outside range.
   let selectionDie=null,selectionRolls=[];
   if(audit.warIds.length>1){
     for(let i=0;i<40;i++){const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;selectionRolls.push(roll.face);
       if(roll.face<=audit.warIds.length){selectionDie=roll.face;break;}}
     if(!selectionDie)fail('Random War Column selection did not finish. No counters were changed.');
   }
   const war=item(s,audit.warIds[(selectionDie||1)-1]);
   const partner=s.pieces.find(p=>p.type==='Instruction'&&p.owner===war.owner&&p.location===war.location&&['War','Raid'].includes(p.subtype));
   let destination=null,returnDie=null;
   if(war.strength>1){
     if(war.owner==='West')destination='W';
     else if(war.owner==='South')destination='S';
     else if(war.owner==='East'){
       const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;returnDie=roll.face;
       destination=roll.face<=3?'E1':'E2';
     }else{
       const target=audit.northTargets.find(x=>x.id===String(command.northTribeId||''));
       if(!target||!command.northNearestConfirmed)fail('Choose and verify the nearest non-Allied Tribe from the physical map before moving North.');
       destination=target.location;
     }
     if(!SPACE[destination])fail('The return destination is absent from the map ledger.');
     // Never silently stack a second War Column or resolve an unknown destination collision.
     if(s.pieces.some(p=>p!==war&&p.type==='War Column'&&p.location===destination))fail('Another War Column occupies the return destination; reconcile printed stacking first.');
   }
   const loss=pointLossPreview(s,'military',2);
   s.tracks=loss.tracks;
   for(const id of audit.captiveIds)item(s,id).location='reserve';
   war.strength--;
   if(war.strength===0){resolveWarEnds(s,war.id);}
   else{war.location=destination;partner.location=destination;}
   message=`War §3.1 step 5 Ranchería ${rancheriaId} sacrifice: lost ${loss.direct} Military${loss.otherLoss?` and ${loss.otherLoss} substituted Culture`:''}; returned ${audit.captiveIds.length} Captives; ${war.id} reduced to ${war.strength}${war.strength===0?' (War Ends)':` and moved to ${destination}`}.${selectionRolls.length?` War Column selection dice ${selectionRolls.join(', ')}.`:''}${returnDie?` East return die ${returnDie}.`:''}`;
   break;
 }
 case 'WAR_AUTO_RANCHERIA_EMPTY':{
   if(s.phase!=='war'||s.steps.w4!=='done'||s.steps.w5==='done')fail('Resolve War steps 1–4 before unprotected Ranchería consequences.');
   if(s.warMovement||s.battlePending||s.battleContinuation||s.pending||s.successCheck||s.enemyFlow)fail('Finish pending War procedures first.');
   const exposed=warRancheriaObligations(s).filter(x=>x.mode==='destroy-unprotected');
   const target=exposed.find(x=>x.rancheriaId===String(command.rancheriaId||exposed[0]?.rancheriaId));
   if(!target)fail('No undefended Ranchería is in a War Space.');
   if(target.warIds.length!==1)fail('Multiple War Columns require printed random selection; do not auto-resolve.');
   const before=pointLossPreview(s,'military',1);
   s.tracks=before.tracks;
   const destruction=destroyRancheriaByRule(s,target.rancheriaId);
   message=`War §3.1 step 5: undefended Ranchería ${target.rancheriaId} destroyed; additional War -1 Military and Ranchería Destruction -2 Military with applicable substitutions. ${destruction.bands} Bands, ${destruction.resources} Resources returned.`;
   break;
 }
 case 'WAR_AUTO_CLEAR_BATTLES':{
   if(s.phase!=='war'||!['done','na'].includes(s.steps.w3))fail('Finish War movement, attrition and event first.');
   if(s.warMovement||s.battlePending||s.battleContinuation||s.successCheck||s.pending||s.enemyFlow||s.developmentPending)fail('Resolve the pending War procedure first.');
   const card=activeWarCard(s),id=String(card?.identifier||'').toUpperCase();
   if(s.steps.w3==='done'&&card&&s.warEventResolved!==id&&(
      ['W09','W10','W11','W12','W13'].includes(id)||(['W03','W04','W22'].includes(id)&&fastColumnEligible(s).length)))
      fail(`Resolve ${id} event before confirming the War Battle steps.`);
   const battles=warBattleObligations(s).filter(x=>!x.exempt);
   const ranches=warRancheriaObligations(s);
   const nonRanch=battles.filter(b=>!ranches.some(r=>r.location===b.location));
   if(nonRanch.length)fail(`Resolve ${nonRanch.length} mandatory step-4 Battle(s) first.`);
   if(s.steps.w4&&!['done','na'].includes(s.steps.w4)||s.steps.w5&&!['done','na'].includes(s.steps.w5))fail('Recorded War steps are inconsistent.');
   if(s.steps.w4&&s.steps.w5)fail('War Battle steps were already completed.');
   if(s.steps.w4&&ranches.length)fail('Ranchería step 5 remains unresolved; use the Ranchería procedure or complete its printed battle/sacrifice.');
   if(!s.steps.w4)s.steps.w4='done';
   if(ranches.length){message=`War §3.1 step 4 verified; ${ranches.length} Ranchería War Space(s) still require step-5 resolution, including empty Rancherías.`;}
   else if(battles.length)fail(`Resolve ${battles.length} remaining mandatory War Battle(s).`);
   else{s.steps.w5='done';message='War §3.1 steps 4–5 checked: no outstanding defender or Ranchería War Spaces.';}
   break;
 }
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
   if(s.phase==='cleanup'&&s.cleanupCupResult&&kind==='paid'){
     const c=s.cleanupCupResult;
     if((c.kind==='instruction'&&c.stage!=='paid')||c.started||c.die!==Number(command.die))fail('Use the actual Cleanup step-3 paid Enemy die, once.');
     if(c.enemy&&c.enemy!==enemy)fail('Use the confirmed Cleanup step-3 Enemy.');
     c.started=true;c.startLog=s.log.length;
   }
   const die=bounded(command.die,1,6,'History-card Enemy Action Table die');
   let displayDie;
   if(command.displayDie!==undefined&&command.displayDie!==null&&command.displayDie!==''){
     if(!command.ack)fail('Confirm the separately rolled physical Instruction display die.');
     displayDie=bounded(command.displayDie,1,6,'separate Instruction display die');
   }else{
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;displayDie=roll.face;
   }
   const row=enemyDisplayRowForDie(displayDie);
   if(command.row&&command.row!==row)fail('The display row must match the SECOND die, not the Enemy Action Table die.');
   if(kind==='free'&&s.phase==='execution'&&s.operation==='Planning'&&s.planningStage===8&&s.planningEnemyDie!=null&&die!==s.planningEnemyDie)fail('Use the seeded Planning Enemy die already rolled; do not reroll or substitute a physical result.');
   if(kind==='free'&&s.phase==='execution'&&s.operation==='Planning'&&s.planningStage===8&&s.planningEnemyChoice&&enemy!==s.planningEnemyChoice)fail('Use the Enemy you confirmed from the printed History Card.');
   const h1Enemy=verifiedHistoryEnemy(s,die);
   const historyId=String(s.cards.find(c=>c.kind==='History'&&c.zone==='In play')?.identifier||'').toUpperCase();
   if(h1Enemy&&enemy!==h1Enemy&&!(s.phase==='execution'&&s.operation==='Planning'&&s.planningStage===8&&s.planningPoliticsEnemy===enemy&&cultureActive(s,'C24'))&&!(s.phase==='cleanup'&&((kind==='free'&&s.cleanupFinishedPending?.politicsChosen&&s.cleanupFinishedPending.enemy===enemy)||(kind==='paid'&&s.cleanupCupResult?.politicsChosen&&s.cleanupCupResult.enemy===enemy)))){
     const reason=String(command.historyOverride||'').trim();
     if(reason.length<15||reason.length>250)fail(`${historyId==='H1'?'H1 example':historyId+' printed Enemy table'} maps die ${die} to ${h1Enemy}, not ${enemy}. Confirm a printed card/rule override (15–250 characters).`);
   }

   if(!command.ack)fail('Confirm the current History Card Enemy; the separate display die is recorded by the engine.');
   const flip=s.pieces.find(p=>p.type==='Instruction'&&p.location===`enemy-display:${enemy}:${row}`);
   if(flip)flipInstructionFace(flip);
   if(s.phase==='cleanup'&&s.cleanupFinishedPending&&kind==='free'){
     if(s.cleanupFinishedPending.started||s.cleanupFinishedPending.die!==die)fail('Use the already rolled Cleanup Finished Band die.');
     if(s.cleanupFinishedPending.enemy&&s.cleanupFinishedPending.enemy!==enemy)fail('Use the confirmed Cleanup Enemy.');
     s.cleanupFinishedPending.started=true;s.cleanupFinishedPending.startLog=s.log.length;
   }
   s.enemyFlow={kind,enemy,die,displayDie,row,stage:'choose',currentId:null,currentRow:null,executed:0,
     flippedId:flip?.id||null,startedAt:new Date().toISOString()};
   message=`Enemy §6.2.2 ${kind} procedure started for ${enemy}; Enemy Action die ${die}, separate display die ${displayDie} → row ${row}.${h1Enemy?' Source-backed '+historyId+' roll predicts '+h1Enemy+'.':''}${h1Enemy&&enemy!==h1Enemy?' History exception: '+String(command.historyOverride).trim().slice(0,250)+'.':''}${flip?' Flipped '+named(flip)+'.':' Selected row was empty: no flip.'} History Card mapping confirmed by player.`;
   quality='manual';break;}
 case 'ENEMY_VERIFY_FACE':{
   const f=s.enemyFlow;
   if(!f||!['choose','payment'].includes(f.stage))fail('Verify a face only during an active Enemy Instruction selection.');
   const top=enemyDisplayAudit(s).columns[f.enemy]?.top;
   if(!top||top.type!=='Instruction'||top.subtype!=='Unknown'||top.strength!==0)fail('The top Instruction has no unknown current face to verify.');
   const kind=String(command.kind||''),cost=bounded(command.cost,1,9,'Printed current-face AP cost');
   if(!VALID_INSTRUCTION_KINDS.includes(kind)||!command.ack)fail('Confirm the actual printed effect and cost on the selected counter face.');
   const side=top.flipped?'back':'front';
   top[side+'Kind']=kind;top[side+'Cost']=cost;
   top.subtype=kind;top.strength=cost;top.faceEvidence='physically-verified';
   message=`Recorded ${f.enemy} counter ${top.id} current ${side} face as ${kind}, ${cost} Enemy AP from the physical counter. Future flips can reuse this verified face.`;
   quality='manual';break;
 }
 case 'ENEMY_SELECT':{
   const f=s.enemyFlow;if(!f||f.stage!=='choose')fail('Complete the previous Enemy Instruction step first.');
   if(f.kind==='free'&&f.executed>0)fail('Free procedure resolves only one top Instruction before display reset.');
   const audit=enemyDisplayAudit(s);if(audit.problems.length)fail('Resolve Enemy Display conflicts: '+audit.problems[0]);
   const top=audit.columns[f.enemy].top;if(!top)fail('The selected Enemy column has no Instruction to execute; finish and reset the display.');
   if(top.subtype==='Unknown'||!Number.isInteger(top.strength)||top.strength<1)fail('Verify the current printed Instruction face and AP cost before executing it.');
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
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.warRaidResolved,f.cardNoEffectResolved].some(Boolean))fail('Instruction effect is already resolved.');
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
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.warRaidResolved,f.cardNoEffectResolved].some(Boolean))fail('Instruction effect is already resolved.');
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
 case 'RAID_CUP_WAR_RAID':
 case 'CLEANUP_CUP_WAR_RAID':
 case 'ENEMY_WAR_RAID':{
   const cupMode=type!=='ENEMY_WAR_RAID',raidCup=type.startsWith('RAID_');
   const drawnCup=cupMode?(raidCup?s.raidCupResolution:s.cleanupCupResult):null;
   const drawnCounter=drawnCup?s.pieces.find(p=>p.id===drawnCup.counterId):null;
   if(cupMode&&(!(raidCup?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!drawnCup||(!raidCup&&drawnCup.kind!=='instruction')||drawnCup.stage!=='effect'||drawnCounter?.type!=='Instruction'||!['War','Raid'].includes(instructionName(drawnCounter))||drawnCounter.location!=='enemy-resolution'))fail('A drawn War/Raid Instruction must await its mandatory cup effect.');
   const f=cupMode?{stage:'effect',currentId:drawnCounter.id,enemy:drawnCounter.owner,currentRow:'A',fromCup:true}:s.enemyFlow;
   if(cupMode){
     const recover=recoverTargetAudit(s,f.enemy);
     if(recover.candidates.length||recover.ambiguousRavaged.length)fail('Recover priority or unidentified Ravaged owner blocks this War/Raid Instruction.');
     const kind=instructionName(drawnCounter);
     if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes(kind)&&(!x.enemies||x.enemies.includes(f.enemy))))fail('An active Development effect blocks this War/Raid.');
     if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified Development effect may change War/Raid.');
   }
   const view=enemyWarRaidPreview(cupMode?{...s,enemyFlow:f}:s);
   if(!view.ready)fail(view.reason);
   const current=item(s,f.currentId);
   const originRow=f.currentRow;
   let result='',formedWarId=view.warId||null;
   if(view.mode==='engaged'){
     result=`Existing ${f.enemy} column ${view.warId} engaged: it stays in place`;
   }else if(view.mode==='peace-ends-war'){
     const peace=item(s,view.peaceId);
     peace.location=`enemy-display:${f.enemy}:${view.returnRow}`;
     result=`Returned Peace ${peace.id} to bottommost empty display row ${view.returnRow}; no new War Column`;
   }else if(view.mode==='advance'){
     if(!command.ack)fail('Verify printed §3.1 one-space target priority and active card effects.');
     const note=String(command.routeNote||'').trim();
     if(note.length<25||note.length>400)fail('Provide printed movement priority evidence (25–400 characters).');
     const to=String(command.to||'');
     if(!view.legal.includes(to))fail('War/Raid movement must use a legal recorded map connection.');
     const w=item(s,view.warId),from=w.location;
     const partner=s.pieces.find(p=>p.type==='Instruction'&&p.owner===w.owner&&p.location===from&&['War','Raid'].includes(instructionName(p)));
     if(!partner)fail('The paired War/Raid Instruction is missing.');
     // Move both components as one column; do not change the active War event.
     w.location=to;partner.location=to;
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     const loss=roll.face<w.strength;
     if(loss){if(w.strength===1)resolveWarEnds(s,w.id);else w.strength--;}
     result=`Moved ${w.id} with ${partner.id} ${from} → ${to}; attrition die ${roll.face}, ${loss?'−1 strength / War Ends if zero':'no loss'}; ${note}`;
   }else if(view.mode==='form-war'){
     if(!command.ack)fail('Confirm no printed Development/History modifier changes War strength or formation.');
     const note=String(command.cardNote||'').trim();
     if(note.length<20||note.length>400)fail('Document verified card modifiers and board supply (20–400 characters).');
     const stock=s.pieces.filter(p=>p.type==='War Column'&&p.owner===f.enemy&&p.location==='reserve').sort((a,b)=>a.id.localeCompare(b.id));
     const chosenId=String(command.warCounterId||'');
     const w=stock.length===1&&!chosenId?stock[0]:stock.find(p=>p.id===chosenId);
     if(!w)fail('Choose an available physical War Column strength counter from stock; never invent one.');
     formedWarId=w.id;
     const modifier=bounded(command.cardModifier??0,-8,8,'Printed card strength modifier');
     const strength=Math.min(8,current.strength+view.settlements+modifier);
     if(strength<1)fail('Printed modifiers leave zero War strength; this card-specific result is not yet verified.');
     const square=view.squares.length===1?view.squares[0]:seededSelect(s,view.squares);
     current.location=square;w.location=square;w.strength=strength;
     result=`Formed ${f.enemy} War Column ${w.id} with ${current.id} at ${square} (strength ${strength}: cost ${current.strength} + ${view.settlements} Settlements ${modifier>=0?'+':''}${modifier} printed modifiers, capped 8). ${note}`;
   }else if(view.mode==='form-raid'){
     if(!command.ack)fail('Verify printed nearest-Tribe ranking, dashed routes, and card exceptions.');
     const note=String(command.routeNote||'').trim();
     if(note.length<25||note.length>400)fail('Provide printed nearest-Tribe evidence (25–400 characters).');
     const ids=Array.isArray(command.tiedTribeIds)?command.tiedTribeIds.map(String):[];
     if(!ids.length||ids.length>view.tribes.length||new Set(ids).size!==ids.length||ids.some(id=>!view.tribes.some(p=>p.id===id)))fail('Select all and only the printed equal-nearest non-Allied Tribe counters.');
     const chosen=seededSelect(s,ids),tribe=item(s,chosen);
     const stock=s.pieces.filter(p=>p.type==='War Column'&&p.owner==='North'&&p.location==='reserve').sort((a,b)=>a.id.localeCompare(b.id));
     const chosenId=String(command.warCounterId||'');
     const w=stock.length===1&&!chosenId?stock[0]:stock.find(p=>p.id===chosenId);
     if(!w)fail('Choose a recorded North War Column counter from physical stock.');
     formedWarId=w.id;w.location=tribe.location;w.strength=Math.min(8,current.strength);current.location=tribe.location;
     result=`Formed North Raid ${w.id} with ${current.id} on non-Allied Tribe ${tribe.id} at ${tribe.location}, strength ${w.strength}; randomized among ${ids.join(', ')}. ${note}`;
   }else fail('Unsupported War/Raid effect mode.');
   if(!['form-war','form-raid'].includes(view.mode)&&!cupMode)current.location=`enemy-inactive:${originRow}`;
   f.warRaidResolved={instructionId:current.id,originalRow:cupMode?null:originRow,enemy:f.enemy,mode:view.mode,warId:formedWarId,result};
   if(cupMode){drawnCup.stage='swap';drawnCup.effectDone=true;drawnCup.warRaidResolved=f.warRaidResolved;}
   message=`Enemy ${view.kind} §6.3.${view.kind==='Raid'?'6':'10'}: ${result}.`;
   quality=['form-war','form-raid','advance'].includes(view.mode)?'manual':'verified';break;
 }
 case 'ENEMY_PEACE_WAR':{
   const f=s.enemyFlow;
   const special=peaceWarColumnPreview(s);
   if(!special.ready)fail(special.reason);
   // A real Peace War instruction is resolved once, in one immutable transaction.
   const w=item(s,special.warId),from=w.location;
   let movement=null,attrition=null;
   if(special.mode==='war-ends'){
     const ended=resolveWarEnds(s,w.id);
     movement=`War Ends: returned ${ended.instructionId} to ${ended.destination}`;
   }else if(special.mode==='engaged'){
     movement='Already stacked with a Band, Ranchería or Allied Tribe: no movement or attrition';
   }else{
     if(!command.ack)fail('Verify the §3.1 shortest route and movement priority against the printed map before resolving Peace movement.');
     const note=String(command.routeNote||'').trim();
     if(note.length<20||note.length>320)fail('Record the printed movement target and route evidence (20–320 characters).');
     if(special.mode==='no-targets'){
       movement=`No visible target: −1 War strength under §3.1 step 1; checked physical board: ${note}`;
       if(w.strength===1)resolveWarEnds(s,w.id);else w.strength--;
     }else{
       const to=String(command.to||'');
       const edge=s.edges.find(e=>(e.a===from&&e.b===to)||(e.b===from&&e.a===to));
       if(!edge||!SPACE[to])fail('Peace movement must use one connected space in the verified map graph.');
       if(edge.kind==='dashed'&&w.owner!=='North')fail('Colonial War Columns cannot cross dashed connections without a separate printed exception.');
       if(warColumnStopUnits(s,w.id).length)fail('War Column is already with a defender; it cannot move.');
       const partner=s.pieces.find(p=>p.type==='Instruction'&&p.owner===w.owner&&p.location===from&&['War','Raid'].includes(instructionName(p)));
       if(!partner)fail('Paired War/Raid Instruction missing before Peace movement.');
       w.location=to;partner.location=to;
       movement=`${from} → ${to} (${edge.kind}); printed movement priority confirmed: ${note}`;
     }
     if(SPACE[w.location]&&w.strength>0){
       const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
       const lose=roll.face<w.strength;
       attrition={die:roll.face,loss:lose};
       if(lose){if(w.strength===1)resolveWarEnds(s,w.id);else w.strength--;}
     }
   }
   const instr=item(s,f.currentId);instr.location=`enemy-inactive:${f.currentRow}`;
   f.peaceWarResolved={instructionId:instr.id,originalRow:f.currentRow,enemy:f.enemy,warId:special.warId,mode:special.mode,from,to:special.mode==='advance'?String(command.to):null,movement,attrition};
   message=`Peace §6.3.5 (${f.enemy}): ${special.mode}. ${movement}.${attrition?' Attrition die '+attrition.die+(attrition.loss?' caused -1 strength / War Ends.':' caused no loss.'):''} Instruction moved to Inactive. Current War Event retained.`;
   break;
 }
 case 'ENEMY_ENCROACH':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Begin a guided Enemy Instruction before resolving Encroach.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('The Instruction effect is already resolved.');
   const printedKind=instructionName(item(s,f.currentId));
   if(printedKind!=='Encroach' && !(printedKind==='Ally'&&allyTargetPreview(s,f.enemy).encroachInstead) && !(printedKind==='Raid'&&f.enemy==='North'&&enemyWarRaidPreview(s).redirect==='Encroach'))fail('The current Instruction cannot redirect to Encroach.');
   const recovery=recoverTargetAudit(s,f.enemy);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority or unidentified Ravaged owner must be resolved before Encroach.');
   // Printed territory mapping is built into the engine; the target remains a player choice.
   const report=encroachTargetPreview(s,command.die,command.order);
   if(report.huntInstead)fail('No available Tribe or valid space: perform Hunt instead under rule 6.3.3.');
   const tribe=s.pieces.find(p=>p.id===command.tribeId&&p.type==='Tribe'&&p.location==='reserve');
   if(!tribe)fail('Select a Tribe in stock.');
   const location=String(command.space||'');
   if(!report.spaces.includes(location))fail('The selected space is not eligible in the first available territory.');
   const bison=s.pieces.filter(p=>p.type==='Bison'&&p.location===location);
   tribe.location=location;for(const p of bison)p.location='reserve';
   f.encroachResolved={die:report.die,order:[...TERRITORY_DIE_ORDER],selectedFace:report.selectedFace,territory:report.territory,tribeId:tribe.id,location,bisonIds:bison.map(p=>p.id)};
   message=`Enemy Encroach §6.3.3: placed Tribe ${tribe.id} at ${location} after checking ${report.checked} territor${report.checked===1?'y':'ies'}; ${bison.length} Bison returned to stock.`;
   quality='verified';break;
 }
 case 'ENEMY_HUNT':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Begin a guided Enemy Instruction before resolving Hunt.');
   if(f.recoverResolved||f.subjugateResolved||f.settleResolved||f.cultureAttackResolved||f.huntResolved||f.encroachResolved||f.allyResolved||f.peaceResolved||f.cardNoEffectResolved)fail('The Instruction effect is already resolved. Undo to correct.');
   const currentKind=instructionName(item(s,f.currentId));
   if(currentKind!=='Hunt'){
     if(currentKind!=='Encroach'&&!(currentKind==='Raid'&&enemyWarRaidPreview(s).redirect==='Encroach'))fail('The current Instruction is not recorded as Hunt or an eligible redirect.');
     const blocked=encroachTargetPreview(s,command.die,command.order);
     if(!blocked.huntInstead)fail('Encroach has a legal Tribe placement; Hunt fallback is not allowed.');
   }
   const recovery=recoverTargetAudit(s,f.enemy);
   if(recovery.candidates.length)fail('Recover takes priority over Hunt under rule 6.3.4.');
   if(recovery.ambiguousRavaged.length)fail('Unclassified Ravaged marker ownership must be reconciled before Hunt.');
   // Printed territory die symbols are now fixed in engine data.
   const preview=huntTargetPreview(s,command.die,command.order);
   let bisonId=null;
   if(!preview.none){
     const result=rollSeededDie(s.rng.seed);s.rng.seed=result.seed;s.rng.rolls++;
     // Digital counter selection is random among the Bison in the selected territory.
     const target=preview.candidates[result.seed%preview.candidates.length];
     bisonId=target.id;item(s,bisonId).location='reserve';
   }
   f.huntResolved={die:preview.face,order:[...TERRITORY_DIE_ORDER],territory:preview.territory,selectedFace:preview.selectedFace,bisonId,redirectedFrom:['Encroach','Raid'].includes(currentKind)?currentKind:null};
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
 case 'RAID_CUP_SUBJUGATE':
 case 'CLEANUP_CUP_SUBJUGATE':
 case 'ENEMY_SUBJUGATE':{
   const cupMode=type!=='ENEMY_SUBJUGATE', raidCup=type.startsWith('RAID_');
   const drawnCup=cupMode?(raidCup?s.raidCupResolution:s.cleanupCupResult):null;
   const drawnCounter=drawnCup?s.pieces.find(p=>p.id===drawnCup.counterId):null;
   if(cupMode&&(!(raidCup?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!drawnCup||(!raidCup&&drawnCup.kind!=='instruction')||drawnCup.stage!=='effect'||drawnCounter?.type!=='Instruction'||drawnCounter?.subtype!=='Subjugate'||drawnCounter.location!=='enemy-resolution'))fail('A drawn Subjugate Instruction must await its mandatory cup effect.');
   const f=cupMode?{stage:'effect',currentId:drawnCounter.id,enemy:drawnCounter.owner}:s.enemyFlow;
   if(cupMode){
     const recover=recoverTargetAudit(s,f.enemy);
     if(recover.candidates.length||recover.ambiguousRavaged.length)fail('Resolve Recover or disputed Ravaged ownership before Subjugate.');
     if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Subjugate')&&(!x.enemies||x.enemies.includes(f.enemy))))fail('An active Development effect blocks this Instruction.');
     if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Verify the active Development cards before resolving this cup Instruction.');
   }
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
   if(cupMode){drawnCup.stage='swap';drawnCup.effectDone=true;drawnCup.subjugateResolved=f.subjugateResolved;}
   message=`Subjugate §6.3.9 (${f.enemy}): returned ${named(tribe)} from ${location} to stock after explicit physical target verification. Colored network is incomplete. ${note}`;
   quality='manual';break;}
 case 'RAID_CUP_SETTLE':
 case 'CLEANUP_CUP_SETTLE':
 case 'ENEMY_SETTLE':{
   const cupMode=type!=='ENEMY_SETTLE', raidCup=type.startsWith('RAID_');
   const drawnCup=cupMode?(raidCup?s.raidCupResolution:s.cleanupCupResult):null;
   const drawnCounter=drawnCup?s.pieces.find(p=>p.id===drawnCup.counterId):null;
   if(cupMode&&(!(raidCup?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!drawnCup||(!raidCup&&drawnCup.kind!=='instruction')||drawnCup.stage!=='effect'||drawnCounter?.type!=='Instruction'||drawnCounter?.subtype!=='Settle'||drawnCounter.location!=='enemy-resolution'))fail('A drawn Settle Instruction must await its mandatory cup effect.');
   const f=cupMode?{stage:'effect',currentId:drawnCounter.id,enemy:drawnCounter.owner}:s.enemyFlow;
   if(cupMode){
     const recover=recoverTargetAudit(s,f.enemy);
     if(recover.candidates.length||recover.ambiguousRavaged.length)fail('Resolve Recover or disputed Ravaged ownership before Settle.');
     if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Settle')&&(!x.enemies||x.enemies.includes(f.enemy))))fail('An active Development effect blocks this Instruction.');
     if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Verify active Development cards before resolving this cup Instruction.');
   }
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
   if(cupMode){drawnCup.stage='swap';drawnCup.effectDone=true;drawnCup.settleResolved=f.settleResolved;}
   message=`Settle §6.3.8 (${f.enemy}): recorded ${named(settlement)} into ${space} and returned ${bison.length} Bison to stock after physical-board confirmation. ${note}`;
   quality='manual';break;}
 case 'ENEMY_AUTO_EMPTY_HUNT':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('No Enemy Instruction is selected.');
   const printed=instructionName(item(s,f.currentId));
   const reserveTribe=s.pieces.some(p=>p.type==='Tribe'&&p.location==='reserve');
   const legalSpace=SPACES.some(space=>space.type==='round'&&
    !s.pieces.some(piece=>piece.location===space.id&&['Rancheria','Settlement','Tribe','Band'].includes(piece.type)));
   if(!['Hunt','Encroach','Ally','Raid'].includes(printed))fail('This Instruction cannot redirect to an empty Hunt.');
   if(printed==='Encroach'&&reserveTribe&&legalSpace)fail('Encroach can place a Tribe and needs a territory die.');
   if(printed==='Raid'&&s.pieces.some(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round'&&!s.pieces.some(a=>a.type==='Instruction'&&instructionName(a)==='Ally'&&a.location===p.location)))fail('Raid still has a non-Allied Tribe; Encroach redirect is not allowed.');
   if(printed==='Raid'&&reserveTribe&&legalSpace)fail('Raid redirects to a placeable Encroach first.');
   if(printed==='Ally'&&((reserveTribe&&legalSpace)||allyTargetPreview(s,f.enemy).candidates.length))fail('Ally still has an eligible Tribe or an unresolved Encroach placement.');
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.warRaidResolved,f.cardNoEffectResolved].some(Boolean))fail('Another Instruction effect is already recorded.');
   if(recoverTargetAudit(s,f.enemy).candidates.length||recoverTargetAudit(s,f.enemy).ambiguousRavaged.length)fail('Resolve Recover first.');
   if(s.pieces.some(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round'))fail('A Bison remains in a numbered territory; Hunt requires a territory roll.');
   const p=item(s,f.currentId),inactive=`enemy-inactive:${f.currentRow}`;
   if(s.pieces.some(q=>q!==p&&q.location===inactive))fail('Inactive row occupied.');
   p.location=inactive;f.currentId=null;f.currentRow=null;f.stage=f.kind==='paid'?'choose':'done';f.executed++;
   message=printed+' instruction safely completed via empty Hunt (no Bison in any territory'+(printed==='Hunt'?'':', no legal Tribe placement')+'). Instruction moved to Inactive.';
   break;
 }
 case 'ENEMY_AUTO_SINGLE_BISON_HUNT':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('Select an Enemy Instruction first.');
   const printed=instructionName(item(s,f.currentId));
   if(!['Hunt','Encroach','Ally','Raid'].includes(printed))fail('This Instruction cannot redirect to Hunt.');
   if(printed!=='Hunt'){
    const reserveTribe=s.pieces.some(p=>p.type==='Tribe'&&p.location==='reserve');
    const legalSpace=SPACES.some(space=>space.type==='round'&&
     !s.pieces.some(piece=>piece.location===space.id&&['Rancheria','Settlement','Tribe','Band'].includes(piece.type)));
    if(reserveTribe&&legalSpace)fail('Encroach can legally place a Tribe; Hunt fallback is not available.');
    if(printed==='Ally'&&allyTargetPreview(s,f.enemy).candidates.length)fail('Ally has an eligible Tribe and cannot redirect.');
    if(printed==='Raid'&&s.pieces.some(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round'&&!s.pieces.some(a=>a.type==='Instruction'&&instructionName(a)==='Ally'&&a.location===p.location)))fail('Raid still has a non-Allied Tribe and cannot redirect.');
   }
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.warRaidResolved,f.cardNoEffectResolved].some(Boolean))fail('Another Instruction effect is recorded.');
   const recovery=recoverTargetAudit(s,f.enemy);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover or Ravaged ownership must be resolved first.');
   const bison=s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round');
   if(bison.length!==1)fail('Exactly one Bison must remain on the territory map for a forced Hunt target.');
   // One mandatory territory die is still consumed so later seeded draws remain reproducible.
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   const target=bison[0],origin=target.location;
   target.location='reserve';
   const instruction=item(s,f.currentId),inactive=`enemy-inactive:${f.currentRow}`;
   if(s.pieces.some(p=>p!==instruction&&p.location===inactive))fail('Inactive instruction row is occupied.');
   instruction.location=inactive;f.currentId=null;f.currentRow=null;f.stage=f.kind==='paid'?'choose':'done';f.executed++;
   message=`Enemy ${printed}${printed==='Hunt'?'':' redirected to Hunt'}: single Bison ${target.id} returned to stock from ${origin}; it is the only possible target for every printed territory die result (digital roll ${roll.face}).`;
   break;
 }
 case 'ENEMY_AUTO_COMPLETE':{
   const f=s.enemyFlow;
   if(!f||f.stage!=='effect'||!f.currentId)fail('No selected Enemy effect to finish.');
   const p=item(s,f.currentId),kind=instructionName(p);
   const resolved={Ally:f.allyResolved,Peace:f.peaceResolved||f.peaceWarResolved,War:f.warRaidResolved,Raid:f.warRaidResolved||f.encroachResolved||f.huntResolved,'Culture Attack':f.cultureAttackResolved,Hunt:f.huntResolved,Encroach:f.encroachResolved,Settle:f.settleResolved,Subjugate:f.subjugateResolved,Recover:f.recoverResolved};
   if(!f.cardNoEffectResolved&&!f.recoverResolved&&!resolved[kind])fail('Cannot automatically complete an unverified '+kind+' effect.');
   // Digitally recorded effects have already validated physical confirmations and
   // required random results; a second manual acknowledgement adds no safety.
   const expected=f.allyResolved?.location||f.peaceResolved?.square||(f.peaceWarResolved?`enemy-inactive:${f.currentRow}`:f.warRaidResolved?(['form-war','form-raid'].includes(f.warRaidResolved.mode)?s.pieces.find(w=>w.id===f.warRaidResolved.warId)?.location||p.location:`enemy-inactive:${f.currentRow}`):`enemy-display:${f.enemy}:${f.currentRow}`);
   if(p.location!==expected)fail('Selected Instruction moved since its effect was recorded.');
   if(!f.allyResolved&&!f.peaceResolved&&!f.peaceWarResolved&&!f.warRaidResolved){
    const inactive=`enemy-inactive:${f.currentRow}`;
    if(s.pieces.some(q=>q!==p&&q.location===inactive))fail('Inactive row is occupied.');
    p.location=inactive;
   }
   f.currentId=null;f.currentRow=null;f.stage=f.kind==='paid'?'choose':'done';f.executed++;
   for(const key of ['recoverResolved','subjugateResolved','settleResolved','cultureAttackResolved','huntResolved','encroachResolved','allyResolved','peaceResolved','peaceWarResolved','warRaidResolved','cardNoEffectResolved'])f[key]=null;
   message=`Automatically completed verified ${kind} Instruction and updated its display location.`;
   break;
 }
 case 'ENEMY_AUTO_FINISH':{
   const f=s.enemyFlow;
   if(!f||!['choose','done'].includes(f.stage))fail('Resolve the selected Instruction before resetting the display.');
   const audit=enemyDisplayAudit(s);if(audit.problems.length)fail(audit.problems[0]);
   if(f.kind==='paid'){
    const top=audit.columns[f.enemy].top,budget=enemyApPreview(s).total;
    if(top&&top.strength<1&&budget>0)fail('Top Instruction cost is unknown.');
    if(top&&top.strength>0&&top.strength<=budget)fail('An affordable top Instruction remains.');
    const counters=s.pieces.filter(p=>apCounterValue(p)>0);
    const value=counters.reduce((n,p)=>n+apCounterValue(p),0);
    if(s.tracks.enemyAp+value>9)fail('Enemy AP refund exceeds the track limit.');
    s.tracks.enemyAp+=value;for(const p of counters)p.location='cup';
   }
   const result=resetEnemyDisplay(s);
   s.enemyFlow=null;
   message=`Automatically finished ${f.kind} Enemy Instruction procedure: ${f.executed} executed, ${result.moved.length} inactive counters reset.`;
   break;
 }
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

   if(p.location!== (f.allyResolved?f.allyResolved.location:f.peaceResolved?f.peaceResolved.square:f.peaceWarResolved?`enemy-inactive:${f.currentRow}`:f.warRaidResolved?(['form-war','form-raid'].includes(f.warRaidResolved.mode)?s.pieces.find(w=>w.id===f.warRaidResolved.warId)?.location:`enemy-inactive:${f.currentRow}`):`enemy-display:${f.enemy}:${f.currentRow}`))fail('The executing Instruction changed location unexpectedly; reconcile the board first.');
   if(f.recoverResolved&&!note.toLowerCase().includes('recover'))fail('Mention the recorded Recover result in the effect confirmation for a complete audit trail.');
   if(f.subjugateResolved&&!note.toLowerCase().includes('subjugate'))fail('Mention the recorded Subjugate result in the effect confirmation for a complete audit trail.');
   if(f.peaceResolved&&!note.toLowerCase().includes('peace'))fail('Mention the recorded Peace placement in the effect confirmation.');
   if(['War','Raid'].includes(instructionName(p))&&!f.warRaidResolved&&!f.encroachResolved&&!f.huntResolved&&!f.recoverResolved&&!f.cardNoEffectResolved)fail('Use the digital War/Raid effect or verified redirect before confirming.');
   if(instructionName(p)==='Peace'&&!f.peaceResolved&&!f.peaceWarResolved&&!f.recoverResolved){
     const peace=peaceTargetPreview(s,f.enemy);
     if(!peace.requiresWarProcedure||!note.toLowerCase().includes('war'))
       fail('Resolve digital Peace placement or document the War Column branch of §6.3.5 before confirming.');
   }
   if(f.warRaidResolved&&!note.toLowerCase().includes(instructionName(p).toLowerCase()))fail('Mention the digitally resolved War/Raid outcome.');
   if(f.allyResolved&&!note.toLowerCase().includes('ally'))fail('Mention the recorded Ally placement in the effect confirmation.');
   if(instructionName(p)==='Ally'&&!f.allyResolved&&!f.encroachResolved&&!f.recoverResolved)fail('Resolve the digital Ally placement, or document the Encroach redirect, before confirming.');
   if(f.encroachResolved&&!note.toLowerCase().includes('encroach'))fail('Mention the digital Encroach outcome in the effect confirmation.');
   if(f.huntResolved&&!note.toLowerCase().includes('hunt'))fail('Mention the digital Hunt outcome in the effect confirmation.');
   if(f.settleResolved&&!note.toLowerCase().includes('settle'))fail('Mention the recorded Settle result in the effect confirmation for a complete audit trail.');
   if(f.cultureAttackResolved&&!note.toLowerCase().includes('culture'))fail('Mention the automatic Culture Attack in the final confirmation.');
   if(f.cardNoEffectResolved&&!note.toLowerCase().includes('card'))fail('Mention the Development card exception in the final confirmation.');
   const inactive=`enemy-inactive:${f.currentRow}`;
   if(!f.allyResolved&&!f.peaceResolved&&!f.peaceWarResolved&&!f.warRaidResolved){
     if(s.pieces.some(q=>q!==p&&q.location===inactive))fail('Inactive row already occupied. Correct the physical display before continuing; cannot stack Instructions.');
     p.location=inactive;
   }
   const allyPlaced=Boolean(f.allyResolved),peacePlaced=Boolean(f.peaceResolved);
   f.currentId=null;f.currentRow=null;f.stage=f.kind==='paid'?'choose':'done';f.executed++;
   // Each executed Instruction has its own effect ledger; avoid carrying a
   // completed Recover/Subjugate/Settle result into a later paid Instruction.
   f.recoverResolved=null;f.subjugateResolved=null;f.settleResolved=null;f.cultureAttackResolved=null;f.huntResolved=null;f.encroachResolved=null;f.allyResolved=null;f.peaceResolved=null;f.peaceWarResolved=null;f.warRaidResolved=null;f.cardNoEffectResolved=null;
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
   // Reconcile printed endpoints, line style and Enemy colors. No overwrite
   // of contradictory player-supplied colors or geometry. Entirely atomic.
   const change=mapConnectionReconciliation(s.edges);
   if(change.conflicts.length){
     const first=change.conflicts[0];
     fail(`Map evidence conflict at ${first.expected.a}–${first.expected.b}: printed line type or Enemy color disagrees with the ledger. Resolve against the printed board first.`);
   }
   if(!change.missing.length&&!change.upgradeColor.length)fail('All documented map connections and Enemy colors are already recorded.');
   for(const {actual,expected} of change.upgradeColor)actual.enemyFor=[...expected.enemyFor];
   for(const entry of change.missing)s.edges.push({...entry,verifiedByPlayer:false,source:'board-photo'});
   s.mapReview={}; // color-sensitive space sign-offs require a fresh check
   message=`Reconciled board network: added ${change.missing.length} connections and restored ${change.upgradeColor.length} missing Enemy color classifications from ${MAP_EVIDENCE_SOURCE}. Full map still unverified.`;
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
 case 'PASSAGE_AUTO_PROGRESS':{
   const status=passageAutomationStatus(s);
   if(!status.ready||!status.next)fail(status.reason);
   const advanced=perform(s,{type:status.next});
   Object.assign(s,advanced);
   message=`Passage automatic progress: ${status.next}. ${status.reason}`;
   break;
 }
 case 'PASSAGE_AUTO_DEVELOPMENT':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||s.steps.pt13==='done')fail('Development display refresh belongs to Passage of Time step 13, once per Operation.');
   if(Array.from({length:12},(_,i)=>`pt${i+1}`).some(k=>!['done','na'].includes(s.steps[k])))fail('Resolve Passage steps 1–12 in order before Development refresh.');
   if(s.developmentPending)fail('Resolve the pending printed Development effect before refilling.');
   if(!s.passageDevelopment){
     const old=s.cards.filter(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone));
     if(old.length>3)fail('More than three Development cards are face-up; correct the display before automatic refresh.');
     const protectedCards=old.filter(c=>devNumber(c)==='68'); // #68 cannot be removed from play.
     s.passageDevelopment={stage:'discard',queue:old.filter(c=>devNumber(c)!=='68').map(c=>c.id),refillTarget:3-protectedCards.length,refilled:0};
   }
   const stage=s.passageDevelopment;
   const defeated=()=>s.tracks.military===0&&s.tracks.culture===0;
   const descriptions=[];
   // Each pass is bounded by the finite physical card supply. Resolve all
   // printed discard effects BEFORE any replacement is drawn (Living Rules 4.4.13).
   if(stage.stage==='discard'){
     while(stage.queue.length){
       const id=stage.queue.shift(),c=s.cards.find(x=>x.id===id);
       if(!c||!['In play','Display'].includes(c.zone))fail('Development display card changed during the discard sequence.');
       c.zone='Discard';
       passageDiscard(s,c);
       descriptions.push(`Discarded #${devNumber(c)}; applied its Passage discard effects.`);
       if(s.developmentPending)break;
       if(s.phase==='gameover'||defeated())break;
     }
     if(!stage.queue.length)stage.stage='reveal';
   }
   if(!s.developmentPending&&s.phase!=='gameover'&&!defeated()&&stage.stage==='reveal'){
     const floor=(s.period-1)*21+1,ceil=s.period*21;
     while(stage.refilled<stage.refillTarget){
       const deck=s.cards.filter(c=>c.kind==='Development'&&c.zone==='Deck'&&Number(c.identifier)>=floor&&Number(c.identifier)<=ceil);
       if(!deck.length){descriptions.push('Development deck exhausted; remaining display spaces stay empty.');break;}
       if(new Set(deck.map(c=>c.identifier)).size!==deck.length)fail('Duplicate Development identifiers in the deck.');
       const priority=(s.setupDevelopmentPriority||[]).find(n=>deck.some(c=>String(c.identifier)===String(n)));
       const c=priority?deck.find(c=>String(c.identifier)===String(priority)):seededSelect(s,deck);
       if(priority)s.setupDevelopmentPriority=s.setupDevelopmentPriority.filter(n=>String(n)!==String(priority));
       c.zone='In play';stage.refilled++; // No-replacement cards still consume one display draw.
       descriptions.push(`Revealed #${devNumber(c)} (slot ${stage.refilled}/${stage.refillTarget}): ${revealDevelopmentEffect(s,c)}`);
       if(s.developmentPending||s.phase==='gameover'||defeated())break;
     }
   }
   if(!s.developmentPending&&s.phase!=='gameover'&&!defeated()&&stage.stage==='reveal'&&
      (stage.refilled===stage.refillTarget||!s.cards.some(c=>c.kind==='Development'&&c.zone==='Deck'&&Number(c.identifier)>(s.period-1)*21&&Number(c.identifier)<=s.period*21))){
     s.steps.pt13='done';s.passageDevelopment=null;
     descriptions.push('Passage step 13 complete.');
   }
   message='Development display §4.4.13: '+descriptions.join(' ');
   if(s.developmentPending)message+=' Resolve the revealed/discarded card choice before continuing.';
   break;
 }
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
 case 'PASSAGE_PLAY_PROMINENT_HEADMAN':{
   passageHeadmanStep(s,6);
   const c=s.cards.find(x=>x.kind==='Development'&&devNumber(x)==='10'&&x.zone==='Hand');
   if(!c)fail('Prominent Headman #10 must be held in hand.');
   const chiefId=String(command.headmanId||'');
   const chiefs=passageHeadmen(s).flatMap(pair=>[pair.pa,pair.ma]);
   if(!chiefs.some(x=>x.id===chiefId))fail('Choose an in-play Paraibo or Mahimiana due for a Headman Death Check.');
   s.passageProminentExemptIds??=[];
   if(s.passageProminentExemptIds.includes(chiefId))fail('This Headman already has a Prominent Headman exemption.');
   s.passageProminentExemptIds.push(chiefId);
   c.zone='Discard';passageDiscard(s,c);
   message=`Prominent Headman: discarded held #10 to prevent the Headman Death Check for ${chiefId} this Passage.`;break;
 }
 case 'PASSAGE_AUTO_HEADMAN_DEATH':{
   passageHeadmanStep(s,6);
   const pairs=passageHeadmen(s);
   if(activeDevelopment(s,'74').length&&pairs.length&&!pairs.some(x=>x.ma.id===s.passageQuanahExemptId))
     fail('Quanah Parker #74 requires selection of one Mahimiana to exempt from the Headman Death Check.');
   const retired=new Set(s.passageRetiredIds||[]);
   // §4.4 step 6 exempts a Ranchería's headmen when its Mahimiana retired
   // during step 5: the new Paraibo should not immediately die on that turn.
   const exempt=new Set([s.passageQuanahExemptId,...(s.passageProminentExemptIds||[])].filter(Boolean));
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
    const medicineDice=[];
    for(let n=0;n<(cultureActive(s,'C17')?2:1);n++){
      const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;medicineDice.push(roll.face);
    }
    const value=Math.max(1,Math.floor(Math.max(...medicineDice)/2));
    if(!['reserve',`box:${pair.ranch.id}`].includes(pair.ma.location))
      fail('A Medicine-0 Mahimiana is elsewhere; reconcile his counter before replacement.');
    pair.ma.location=`box:${pair.ranch.id}`;setMedicine(s,pair.ma,value);
    outcomes.push(`${pair.ma.id}: rolled ${medicineDice.join("/")}, replacement Medicine ${value}`);
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
   const required=s.passageBison?.required??(4-s.cards.filter(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone)).length);
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
     const display=s.cards.filter(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone)).length;
     if(display>3)fail('More than three Development cards in display; reconcile before Passage step 12.');
     s.passageBison={required:4-display,records:[],currentTerritory:null};
   }
   if(s.passageBison.records.length>=s.passageBison.required)fail('All required Bison replenishment attempts have already been resolved.');
   // Territory destination is now determined by the six fixed printed die faces.
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
 case 'CULTURE_AUTO_CHECKLIST':{
   if(s.phase!=='execution'||s.operation!=='Culture'||!s.operationEvents?.cultureGain||!s.operationEvents?.operationsRoll)fail('Complete the Culture gain and Operations check before automatic checklist closeout.');
   if(s.pending||s.successCheck||s.enemyFlow||s.developmentPending||s.battlePending||s.victoryPending)fail('Resolve pending procedures before Culture closeout.');
   if(!cultureCardEffectAudit(s).safe)fail('Active card exceptions require checking the printed Culture procedure.');
   if(cultureGainPreview(s).mismatches.length)fail('Culture territory evidence is incomplete; cannot automatically close Culture.');
   if(['cu1','cu2','cu3'].some(k=>s.steps[k]&&!['done','na'].includes(s.steps[k])))fail('Invalid Culture checklist state.');
   for(const key of ['cu1','cu2','cu3'])s.steps[key]='done';
   message='Culture §4.2: all three checklist entries completed from the verified digital Culture gain and Operations check; no unresolved Culture modifiers or pending effects.';
   break;
 }
 case 'CLEANUP_RELINQUISH':{
   if(s.phase!=='cleanup'||s.steps.cl1==='done')fail('Relinquishing possessions is optional only during Cleanup step 1.');
   const p=item(s,command.pieceId),b=item(s,command.bandId),r=item(s,command.rancheriaId);
   if(!['Resource','Bison','Mahimiana'].includes(p.type)||p.location!==`held:${b.id}`||b.type!=='Band'||r.type!=='Rancheria'||!SPACE[r.location])fail('Select a possessed Resource or Mahimiana, its owning Band, and an in-play Ranchería.');
   if(b.location!==`box:${r.id}`&&b.location!==r.location)fail('Band must be in its Ranchería to relinquish a possession.');
   if(p.type==='Mahimiana'&&s.pieces.some(x=>x.type==='Mahimiana'&&x.id!==p.id&&x.location===`box:${r.id}`))fail('Reconcile headman capacity before relinquishing another Mahimiana.');
   p.location=`box:${r.id}`;message=`Cleanup step 1: ${named(b)} relinquished ${named(p)} to ${named(r)}.`;break;
 }
 case 'CLEANUP_TRANSFER_RESOURCE':{
   if(s.phase!=='cleanup'||s.steps.cl1==='done')fail('Cleanup resource transfers belong to unfinished step 1.');
   const p=item(s,command.pieceId),r=item(s,command.rancheriaId);
   if(!['Resource','Bison'].includes(p.type)||p.location!=='operations'||p.operationsSlot!==s.tracks.operations)fail('Select a Resource in the current Operations marker space.');
   if(r.type!=='Rancheria'||!SPACE[r.location])fail('Select an in-play Ranchería to receive the Resource.');
   p.location=`box:${r.id}`;delete p.operationsSlot;
   message=`Cleanup step 1: moved ${named(p)} to ${named(r)} Resources.`;break;
 }
 case 'CLEANUP_FINISH_STACKING':{
   if(s.phase!=='cleanup'||s.steps.cl1==='done')fail('Finish Cleanup step 1 once only.');
   if(getStackingProblems(s).length)fail('Resolve the stacking conflicts before proceeding.');
   if(s.pending||s.successCheck||s.enemyFlow||s.developmentPending||s.battlePending)fail('Resolve the pending game procedure before Cleanup.');
   if(['44','60','70','71'].flatMap(n=>activeDevelopment(s,n)).some(c=>!(n=>n==='44'?(s.louisianaDoneIds||[]).includes(c.id):n==='60'?(s.americanTradersDoneIds||[]).includes(c.id):(s.buffaloDoneIds||[]).includes(c.id))(devNumber(c))))fail('Finish mandatory Development Cleanup effects first.');
   if(s.pieces.some(p=>p.location==='operations'&&['Resource','Bison','Marker'].includes(p.type)&&!Number.isInteger(p.operationsSlot)))fail('Record the printed Operations slots before digital cleanup.');
   const due=s.pieces.filter(p=>p.location==='operations'&&p.operationsSlot===s.tracks.operations);
   if(due.some(p=>['Resource','Bison'].includes(p.type)))fail('Transfer Operations Resources in the marker space to an in-play Ranchería.');
   if(due.some(p=>p.type!=='Marker'||p.subtype!=='Success'))fail('Unrecognised counters in the Operations marker space need reconciliation.');
   for(const p of due){p.location='cup';delete p.operationsSlot;}
   s.steps.cl1='done';
   message=`Cleanup §3.4 step 1: no stacking conflicts; returned ${due.length} matching Success counters to cup. Optional relinquishing is a player choice.`;break;
 }
 case 'CLEANUP_ROLL_FINISHED':{
   if(s.phase!=='cleanup'||s.steps.cl1!=='done'||s.steps.cl2==='done'||s.enemyFlow)fail('Roll Finished Bands only during Cleanup step 2, after step 1.');
   const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).sort((a,b)=>a.id.localeCompare(b.id));
   const withFinished=ranches.map(r=>({id:r.id,count:s.pieces.filter(p=>p.type==='Band'&&p.finished&&p.location===`box:${r.id}`).length})).filter(x=>x.count>0);
   const prior=s.cleanupFinishedRolls||[];
   if(prior.length>=withFinished.length)fail('All Ranchería rolls are completed; finish step 2.');
   if(prior.some((x,i)=>x.id!==withFinished[i].id))fail('Finished Band configuration changed during Cleanup step 2; reconcile the board.');
   if(s.cleanupFinishedPending)fail('Resolve the triggered free Enemy Instruction before another roll.');
   const target=withFinished[prior.length],roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   const triggered=roll.face<=target.count;
   s.cleanupFinishedRolls=[...prior,{id:target.id,die:roll.face,count:target.count,triggered}];
   if(triggered){
     const politicsChoice=cultureActive(s,'C24')&&s.tracks.culture>=1;
     const enemyRoll=politicsChoice?null:rollSeededDie(s.rng.seed);
     if(enemyRoll){s.rng.seed=enemyRoll.seed;s.rng.rolls++;}
     s.cleanupFinishedPending={id:target.id,triggerDie:roll.face,die:enemyRoll?.face??null,enemy:null,started:false};
   }
   message=`Cleanup step 2: ${target.id}, ${target.count} Finished Bands, seeded die ${roll.face}; ${triggered?(s.cleanupFinishedPending.die===null?'Politics III can choose the Enemy before the Enemy Action Table roll.':'free Enemy Instruction die '+s.cleanupFinishedPending.die):'no Enemy Instruction'}.`;break;
 }
 case 'CLEANUP_FINISH_FINISHED':{
   if(s.phase!=='cleanup'||s.steps.cl1!=='done'||s.steps.cl2==='done'||s.enemyFlow||s.cleanupFinishedPending)fail('Resolve all triggered Enemy Instructions first.');
   const withFinished=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).filter(r=>s.pieces.some(p=>p.type==='Band'&&p.finished&&p.location===`box:${r.id}`));
   if((s.cleanupFinishedRolls||[]).length!==withFinished.length)fail('Roll for each Ranchería with Finished Bands first.');
   s.steps.cl2='done';message=`Cleanup step 2: resolved ${withFinished.length} Ranchería rolls and their required Enemy Instructions.`;break;
 }
 case 'CLEANUP_ROLL_FINISHED_ENEMY':{
   const f=s.cleanupFinishedPending;
   if(s.phase!=='cleanup'||!f||f.die!==null||f.started||f.enemy||s.enemyFlow)fail('Only roll when the optional Politics III free Enemy choice was not already resolved.');
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;f.die=roll.face;
   message=`Cleanup Finished Band: declined Politics III and rolled normal Enemy Action Table die ${roll.face}.`;break;
 }
 case 'CULTURE_POLITICS_CHOOSE_CLEANUP_ENEMY':{
   if(s.phase!=='cleanup'||s.enemyFlow||!cultureActive(s,'C24')||s.tracks.culture<1)fail('Politics III requires an unresolved Cleanup Enemy Action Table roll and one Culture.');
   const stage=String(command.stage||''),f=stage==='finished'?s.cleanupFinishedPending:stage==='paid'?s.cleanupCupResult:null;
   if(!f||f.die!==null||f.enemy||f.started||stage==='finished'&&(s.steps.cl1!=='done'||s.steps.cl2==='done')||stage==='paid'&&(s.steps.cl1!=='done'||s.steps.cl2!=='done'||s.steps.cl3==='done'||f.kind==='instruction'&&f.stage!=='paid'||enemyApPreview(s).total===0))fail('Select the outstanding Cleanup free or paid Enemy roll before it occurs.');
   const history=String(s.cards.find(c=>c.kind==='History'&&c.zone==='In play')?.identifier||'').toUpperCase();
   const namedEnemies=VERIFIED_HISTORY_NAMED_ENEMIES[history];
   const enemy=String(command.enemy||'');
   if(!ENEMY_COLUMNS.includes(enemy)||namedEnemies&&!namedEnemies.includes(enemy))fail('The chosen Enemy is not named on the active History Card.');
   if(!namedEnemies&&!command.ack)fail('Verify the Enemy is printed on the current History Card.');
   s.tracks.culture--;
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   f.die=roll.face;f.enemy=enemy;f.politicsChosen=true;
   message=`Politics III: spent 1 Culture, chose ${enemy} for Cleanup ${stage} Enemy activation. Seeded display-selection die ${roll.face}; Enemy Action Table not rolled.`;break;
 }
 case 'CLEANUP_CONFIRM_FINISHED_ENEMY':{
   if(s.phase!=='cleanup'||s.steps.cl1!=='done'||s.steps.cl2==='done'||!s.cleanupFinishedPending||s.enemyFlow)fail('Resolve the outstanding Finished Band Enemy first.');
   if(s.cleanupFinishedPending.die===null||!command.ack||!ENEMY_COLUMNS.includes(command.enemy))fail('Roll or choose the Enemy before confirming the History result.');
   const mapped=verifiedHistoryEnemy(s,s.cleanupFinishedPending.die);
   if(mapped&&mapped!==command.enemy)fail(`The verified History Card indicates ${mapped}.`);
   s.cleanupFinishedPending.enemy=command.enemy;
   message=`Cleanup step 2: ${command.enemy} confirmed for free Enemy Instruction.`;quality='manual';break;
 }
 case 'CLEANUP_FINISH_ENEMY':{
   if(s.phase!=='cleanup'||!s.cleanupFinishedPending||!s.cleanupFinishedPending.started||s.enemyFlow)fail('Complete the free Enemy procedure before continuing Cleanup.');
   if(!s.log.slice(0,s.log.length-(s.cleanupFinishedPending.startLog||0)).some(e=>['ENEMY_FINISH','ENEMY_AUTO_FINISH'].includes(e.command)))fail('The free Enemy Instruction has not finished.');
   s.cleanupFinishedPending=null;message='Cleanup step 2: resumed after the required free Enemy Instruction.';break;
 }
 case 'CLEANUP_DRAW_CUP':{
   if(s.phase!=='cleanup'||s.steps.cl1!=='done'||s.steps.cl2!=='done'||s.steps.cl3==='done'||s.cleanupCupResult)fail('Cleanup step 3 draws exactly one counter after step 2.');
   if(s.enemyFlow||s.successCheck||s.pending)fail('Complete the other pending procedures first.');
   const pool=s.pieces.filter(p=>p.location==='cup'&&(p.type==='Instruction'||p.type==='Marker'&&/^(Success|Enemy AP [234])$/.test(p.subtype)));
   if(!pool.length)fail('Success Check Draw Cup is empty; reconcile the real counter supply before drawing.');
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   const p=pool[s.rng.seed%pool.length];
   if(p.type==='Instruction')restoreInstructionFront(p);
   const kind=p.type==='Instruction'?'instruction':p.subtype==='Success'?'success':'enemy-ap';
   p.location=kind==='instruction'?'enemy-resolution':kind==='enemy-ap'?'available-enemy-aps':'cup';
   s.cleanupCupResult={counterId:p.id,kind,die:null,enemy:null,started:false,...(kind==='instruction'?{stage:'effect',effectDone:false,swapDie:null,swapRow:null}: {})};
   if(kind==='success'&&enemyApPreview(s).total===0){s.steps.cl3='done';s.cleanupCupResult=null;}
   message=`Cleanup step 3: seeded cup draw revealed ${named(p)} (${kind}). ${kind==='instruction'?'Resolve the drawn Instruction under §6.2.2.C before advancing.':kind==='success'&&s.steps.cl3==='done'?'No Enemy AP available; step complete.':'Resolve the required paid Enemy procedure if APs are available.'}`;break;
 }
 case 'RAID_CUP_CULTURE_ATTACK':
 case 'CLEANUP_CUP_CULTURE_ATTACK':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||instructionName(p)!=='Culture Attack'||p.location!=='enemy-resolution')fail('Only a newly drawn Culture Attack Instruction can use this automatic cup resolver.');
   const preview=enemyCulturePreview(s,p.owner);
   if(preview.recoverFirst||preview.unverifiedRavaged)fail('Resolve Recover priority or ambiguous Ravaged ownership before Culture Attack.');
   if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Culture Attack')&&(!x.enemies||x.enemies.includes(p.owner))))fail('An active card blocks automatic Culture Attack.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Review unimplemented active Development text before this Culture Attack.');
   s.tracks=preview.pointLoss.tracks;c.stage='swap';c.effectDone=true;
   message=`Draw-cup §6.2.2.C: ${p.owner} Culture Attack applied −${preview.amount} Culture (including ${preview.settlements.length} Settlement modifiers). The Instruction now requires its display exchange.`;break;
 }
 case 'RAID_CUP_EMPTY_HUNT':
 case 'CLEANUP_CUP_EMPTY_HUNT':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||instructionName(p)!=='Hunt'||p.location!=='enemy-resolution')fail('Only a drawn Hunt Instruction may use the empty-map exception.');
   const recovery=recoverTargetAudit(s,p.owner);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority must be resolved before Hunt.');
   if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Hunt')&&(!x.enemies||x.enemies.includes(p.owner))))fail('An active card blocks automatic Hunt.');
   if(s.pieces.some(q=>q.type==='Bison'&&SPACE[q.location]?.type==='round'))fail('Bison remain on the map: resolve Hunt using the printed territory die.');
   c.stage='swap';c.effectDone=true;
   message=`Draw-cup §6.2.2.C: ${p.owner} Hunt had no Bison target; the mandatory Hunt effect has no counter consequences. Display exchange remains.`;break;
 }
 case 'RAID_CUP_EMPTY_REDIRECT':
 case 'CLEANUP_CUP_EMPTY_REDIRECT':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||p.location!=='enemy-resolution')fail('Only a pending directly drawn Instruction may resolve this fallback.');
   const kind=instructionName(p);
   if(!['Encroach','Ally'].includes(kind))fail('Only Encroach and Ally may use the verified empty redirect.');
   const recovery=recoverTargetAudit(s,p.owner);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority or uncertain Ravaged ownership must resolve first.');
   if(activeCardEffects(s).some(x=>['Hunt','Encroach',kind].some(k=>x.blockedInstructions?.includes(k))&&(!x.enemies||x.enemies.includes(p.owner))))fail('An active card modifies this Enemy redirect.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified Development effect may modify this Enemy redirect.');
   if(s.pieces.some(q=>q.type==='Bison'&&SPACE[q.location]?.type==='round'))fail('Hunt has a Bison target; no-effect fallback is illegal.');
   const stock=s.pieces.some(q=>q.type==='Tribe'&&q.location==='reserve');
   const free=SPACES.some(space=>space.type==='round'&&!s.pieces.some(q=>q.location===space.id&&['Rancheria','Settlement','Tribe','Band'].includes(q.type)));
   if(stock&&free)fail('Encroach can place a Tribe; Hunt fallback is illegal.');
   if(kind==='Ally'&&allyTargetPreview(s,p.owner).candidates.length)fail('An eligible Tribe remains for Ally.');
   c.stage='swap';c.effectDone=true;
   message=`Draw-cup §6.2.2.C: ${p.owner} ${kind} redirected to Encroach/Hunt as applicable; no legal Tribe placement or Bison target remains. Display exchange follows.`;break;
 }
 case 'RAID_CUP_PEACE':
 case 'CLEANUP_CUP_PEACE':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||instructionName(p)!=='Peace'||p.location!=='enemy-resolution')fail('Only a directly drawn Peace Instruction may use this automatic placement.');
   const target=peaceTargetPreview(s,p.owner);
   if(target.recoverFirst||target.unknownRavaged||target.requiresWarProcedure)fail('Recover priority, uncertain Ravaged ownership or a War Column prevents automatic Peace placement.');
   if(target.replace.length)fail('An existing Peace counter requires return to its printed Inactive display row first.');
   if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Peace')&&(!x.enemies||x.enemies.includes(p.owner))))fail('A card exception overrides this Peace Instruction.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Review unverified active Development text before Peace placement.');
   p.location=target.square;c.stage='swap';c.effectDone=true;
   message=`Draw-cup §6.3.5: ${p.owner} Peace placed on ${target.square}; square and owned Settlements gain Peace Space status. The drawn counter remains on the map after the §6.2.2.C exchange.`;break;
 }
 case 'RAID_CUP_SINGLE_BISON_HUNT':
 case 'CLEANUP_CUP_SINGLE_BISON_HUNT':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||instructionName(p)!=='Hunt'||p.location!=='enemy-resolution')fail('Only an unresolved drawn Hunt Instruction can remove a forced single Bison.');
   const recovery=recoverTargetAudit(s,p.owner);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority or unverified Ravaged ownership blocks a forced Hunt.');
   if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Hunt')&&(!x.enemies||x.enemies.includes(p.owner))))fail('An active card blocks automatic Hunt.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified active Development text may modify Hunt.');
   const bison=s.pieces.filter(q=>q.type==='Bison'&&SPACE[q.location]?.type==='round');
   if(bison.length!==1)fail('A forced Hunt requires exactly one Bison on the map.');
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   const target=bison[0],old=target.location;target.location='reserve';
   c.stage='swap';c.effectDone=true;
   message=`Draw-cup §6.2.2.C: ${p.owner} Hunt rolled ${roll.face}; ${target.id} at ${old} was the only Bison on the map and returned to stock. Exchange the Instruction next.`;break;
 }
 case 'RAID_CUP_SAME_TERRITORY_HUNT':
 case 'CLEANUP_CUP_SAME_TERRITORY_HUNT':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||instructionName(p)!=='Hunt'||p.location!=='enemy-resolution')fail('Only an unresolved drawn Hunt Instruction can use same-territory selection.');
   const recovery=recoverTargetAudit(s,p.owner);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority or uncertain Ravaged ownership blocks Hunt.');
   if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Hunt')&&(!x.enemies||x.enemies.includes(p.owner))))fail('An active card modifies Hunt.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified Development text may modify Hunt.');
   const bison=s.pieces.filter(q=>q.type==='Bison'&&SPACE[q.location]?.type==='round');
   if(bison.length<2||new Set(bison.map(q=>SPACE[q.location].territory)).size!==1)fail('Multiple Bison must all share one territory for this deterministic result.');
   // All die-face territory cycles find this same territory. Draw once for the
   // territory die and once to select a Bison, just as regular Hunt does.
   const territoryRoll=rollSeededDie(s.rng.seed);s.rng.seed=territoryRoll.seed;s.rng.rolls++;
   const choiceRoll=rollSeededDie(s.rng.seed);s.rng.seed=choiceRoll.seed;s.rng.rolls++;
   const selected=bison[(choiceRoll.seed>>>0)%bison.length],origin=selected.location;
   selected.location='reserve';c.stage='swap';c.effectDone=true;
   message=`Draw-cup §6.2.2.C: ${p.owner} Hunt territory die ${territoryRoll.face}; all ${bison.length} Bison were in ${SPACE[origin].territory}. Random selection die ${choiceRoll.face} returned ${selected.id} from ${origin} to stock. Exchange the Instruction next.`;
   break;
 }
 case 'RAID_CUP_FORCED_ENCROACH':
 case 'CLEANUP_CUP_FORCED_ENCROACH':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||p.location!=='enemy-resolution')fail('Only an unresolved drawn Instruction can perform the forced Encroach.');
   const kind=instructionName(p);
   if(!['Encroach','Ally'].includes(kind))fail('Only Encroach or redirected Ally may use forced Encroach.');
   if(kind==='Ally'&&allyTargetPreview(s,p.owner).candidates.length)fail('Ally has an available target and cannot redirect.');
   const rec=recoverTargetAudit(s,p.owner);
   if(rec.candidates.length||rec.ambiguousRavaged.length)fail('Recover priority or uncertain Ravaged ownership blocks Encroach.');
   if(activeCardEffects(s).some(x=>['Encroach',kind].some(k=>x.blockedInstructions?.includes(k))&&(!x.enemies||x.enemies.includes(p.owner))))fail('Active card prevents automatic Encroach.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified active Development text may modify Encroach.');
   const stock=s.pieces.filter(x=>x.type==='Tribe'&&x.location==='reserve');
   const free=SPACES.filter(q=>q.type==='round'&&!s.pieces.some(x=>x.location===q.id&&['Rancheria','Settlement','Tribe','Band'].includes(x.type)));
   if(stock.length!==1||free.length!==1)fail('Forced Encroach requires exactly one stock Tribe and one eligible round space.');
   const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
   const tribe=stock[0],location=free[0].id;
   const bison=s.pieces.filter(x=>x.type==='Bison'&&x.location===location);
   tribe.location=location;for(const x of bison)x.location='reserve';
   c.stage='swap';c.effectDone=true;
   message=`Draw-cup Encroach: territory die ${die.face}, sole available Tribe ${tribe.id} placed at the sole eligible space ${location}; ${bison.length} Bison returned. Display exchange next.`;break;
 }
 case 'RAID_CUP_GUIDED_HUNT':
 case 'CLEANUP_CUP_GUIDED_HUNT':
 case 'RAID_CUP_GUIDED_ENCROACH':
 case 'CLEANUP_CUP_GUIDED_ENCROACH':{
   const raid=type.startsWith('RAID_'),encroach=type.endsWith('ENCROACH');
   const c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||p.location!=='enemy-resolution')fail('Only a pending drawn Instruction may use this guided target.');
   const kind=instructionName(p);
   if(encroach? !(['Encroach','Ally'].includes(kind)) : kind!=='Hunt')fail('This Instruction cannot use the selected guided target.');
   if(kind==='Ally'&&allyTargetPreview(s,p.owner).candidates.length)fail('Ally must place its Instruction before redirecting to Encroach.');
   const recovery=recoverTargetAudit(s,p.owner);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover takes priority over this Instruction.');
   const kinds=encroach?['Encroach',kind]:['Hunt'];
   if(activeCardEffects(s).some(x=>kinds.some(k=>x.blockedInstructions?.includes(k))&&(!x.enemies||x.enemies.includes(p.owner))))fail('Active card blocks this Instruction.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified Development text may modify this effect.');
   // Printed territory mapping is verified centrally; no chart acknowledgement required.
   const order=validatedTerritoryOrder(command.order);
   if(encroach){
     const preview=encroachTargetPreview(s,command.die,order);
     if(preview.huntInstead)fail('Encroach must redirect to Hunt; do not place a Tribe.');
     const tribe=s.pieces.find(x=>x.id===command.tribeId&&x.type==='Tribe'&&x.location==='reserve');
     if(!tribe)fail('Select an available Tribe counter.');
     const location=String(command.space||'');
     if(!preview.spaces.includes(location))fail('Space is not in the first territory with legal Encroach placement.');
     const bison=s.pieces.filter(x=>x.type==='Bison'&&x.location===location);
     tribe.location=location;for(const x of bison)x.location='reserve';
     message=`Draw-cup Encroach: territory die ${preview.die}, placed ${tribe.id} at ${location}, returned ${bison.length} Bison. Exchange follows.`;
   }else{
     const territoryDie=command.die?Number(command.die):rollSeededDie(s.rng.seed).face;
     if(!command.die){const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;}
     const preview=huntTargetPreview(s,territoryDie,order);
     let removed='none';
     if(!preview.none){const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
       const selected=preview.candidates[die.seed%preview.candidates.length];item(s,selected.id).location='reserve';removed=selected.id;}
     message=`Draw-cup Hunt: territory die ${preview.face}, searched ${preview.checked} territories, removed ${removed}. Exchange follows.`;
   }
   c.stage='swap';c.effectDone=true;break;
 }
 case 'RAID_CUP_SINGLE_ALLY':
 case 'CLEANUP_CUP_SINGLE_ALLY':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||instructionName(p)!=='Ally'||p.location!=='enemy-resolution')fail('Only an unresolved drawn Ally Instruction can use the unique-target resolver.');
   const recovery=recoverTargetAudit(s,p.owner);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority or unverified Ravaged ownership blocks Ally.');
   if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Ally')&&(!x.enemies||x.enemies.includes(p.owner))))fail('An active card blocks automatic Ally.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified active Development text may modify Ally.');
   const targets=allyTargetPreview(s,p.owner);
   if(targets.candidates.length!==1)fail('Ally requires exactly one eligible Tribe for automatic placement.');
   const tribe=targets.candidates[0];p.location=tribe.location;
   c.stage='swap';c.effectDone=true;
   message=`Draw-cup §6.2.2.C: ${p.owner} Ally placed at ${tribe.location} with the sole eligible Tribe ${tribe.id}; the drawn Instruction remains on the map after display exchange.`;break;
 }
 case 'RAID_CUP_CHOOSE_ALLY':
 case 'CLEANUP_CUP_CHOOSE_ALLY':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||instructionName(p)!=='Ally'||p.location!=='enemy-resolution')fail('Only a pending drawn Ally Instruction can select a Tribe.');
   const recovery=recoverTargetAudit(s,p.owner);
   if(recovery.candidates.length||recovery.ambiguousRavaged.length)fail('Recover priority or uncertain Ravaged ownership must resolve before Ally.');
   if(activeCardEffects(s).some(x=>x.blockedInstructions?.includes('Ally')&&(!x.enemies||x.enemies.includes(p.owner))))fail('An active card blocks Ally.');
   if(s.cards.some(x=>x.kind==='Development'&&['In play','Display'].includes(x.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[devNumber(x)]||DEVELOPMENT_EFFECT_CATALOG[devNumber(x)].mode.startsWith('manual-required'))))fail('Unverified Development text may modify Ally.');
   const candidates=allyTargetPreview(s,p.owner).candidates;
   if(candidates.length<2)fail('Use the unique-target resolver or redirect when fewer than two eligible Tribes exist.');
   const tribe=candidates.find(x=>x.id===String(command.tribeId||''));
   if(!tribe)fail('Choose an eligible non-Allied Tribe shown on the board.');
   // Player target choice is strategic. Rule-driven placement is atomic.
   p.location=tribe.location;c.stage='swap';c.effectDone=true;c.allyTargetId=tribe.id;
   message=`Draw-cup §6.2.2.C: ${p.owner} Ally attached to chosen eligible Tribe ${tribe.id} at ${tribe.location}. Resolve its mandatory display exchange next.`;
   break;
 }
 case 'RAID_CUP_CONFIRM_EFFECT':
 case 'CLEANUP_CUP_CONFIRM_EFFECT':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='effect'||p.type!=='Instruction'||!ENEMY_COLUMNS.includes(p.owner))fail('No drawn Enemy Instruction is awaiting its effect.');
   const note=String(command.note||'').trim();
   if(['Settle','Subjugate','War','Raid'].includes(instructionName(p)))fail('Resolve this printed Instruction using its guided, counter-changing reducer; a narrative confirmation cannot replace the required game effect.');
   if(instructionName(p)==='Unknown'||!Number.isInteger(p.strength)||p.strength<1)fail('Verify the physical counter’s non-striped Instruction effect and AP cost before confirming it.');
   if(!command.ack||note.length<25||note.length>500)fail('Document the specific printed §6.3 effect and physical/ledger changes (25–500 characters).');
   const loc=p.location,placed=SPACE[loc]&&['War','Raid','Peace','Ally'].includes(instructionName(p));
   if(loc!=='enemy-resolution'&&!placed)fail('The drawn Instruction must remain in resolution or be legally placed on the map.');
   if(placed&&!s.pieces.some(q=>q.id!==p.id&&q.location===loc&&q.type==='War Column')&&['War','Raid'].includes(instructionName(p)))fail('A map War/Raid Instruction needs a recorded paired War Column.');
   c.stage='swap';c.effectDone=true;c.effectNote=note;
   message=`Player-confirmed printed §6.3 ${instructionName(p)} effect for ${p.owner}: ${note}. Execute the mandatory §6.2.2.C display exchange next.`;quality='manual';break;
 }
 case 'RAID_CUP_ROLL_SWAP':
 case 'CLEANUP_CUP_ROLL_SWAP':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='swap'||!c.effectDone||c.swapDie!==null||s.enemyFlow)fail('Complete the drawn Instruction effect before the one mandatory display die.');
   if(!s.pieces.some(q=>q.type==='Instruction'&&q.owner===p.owner&&q.location.startsWith(`enemy-display:${p.owner}:`)))fail('No display Instruction is available for the required exchange; reconcile the physical counter layout.');
   const rolls=[];
   for(let tries=0;tries<256;tries++){
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;rolls.push(roll.face);
     const row=enemyDisplayRowForDie(roll.face);
     if(s.pieces.some(q=>q.type==='Instruction'&&q.owner===p.owner&&q.location===`enemy-display:${p.owner}:${row}`)){
       c.swapDie=roll.face;c.swapRow=row;break;
     }
   }
   if(c.swapDie===null)fail('The seeded row die did not select an occupied slot after 256 rolls. Verify the counter layout before continuing.');
   const recorded=rolls.length>18?`${rolls.slice(0,18).join(' → ')} → … (${rolls.length} rolls in total)`:rolls.join(' → ');
   message=`§6.2.2.C display exchange: rolled ${recorded}; selected occupied ${p.owner} row ${c.swapRow}. Empty rows automatically rerolled.`;break;
 }
 case 'RAID_CUP_REROLL_SWAP':
 case 'CLEANUP_CUP_REROLL_SWAP':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId);
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='swap'||c.swapDie===null||!command.ack)fail('Reroll only after checking an empty printed display row.');
   const occupied=s.pieces.some(q=>q.type==='Instruction'&&q.owner===p.owner&&q.location.startsWith(`enemy-display:${p.owner}:`));
   if(!occupied)fail('No occupied row remains: reconcile the display before proceeding.');
   const emptyRow=enemyDisplayRowForDie(c.swapDie);
   if(command.emptyRow&&command.emptyRow!==emptyRow)fail('Empty row must match the actual die result.');
   if(s.pieces.some(q=>q.type==='Instruction'&&q.owner===p.owner&&q.location===`enemy-display:${p.owner}:${emptyRow}`))fail('The die points to an occupied row; exchange it rather than rerolling.');
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;c.swapDie=roll.face;
   message=`§6.2.2.C: printed row was empty; seeded reroll ${roll.face}. No counters moved.`;quality='manual';break;
 }
 case 'RAID_CUP_EXCHANGE':
 case 'CLEANUP_CUP_EXCHANGE':{
   const raid=type.startsWith('RAID_'),c=raid?s.raidCupResolution:s.cleanupCupResult,p=c&&item(s,c.counterId),row=c?.swapDie?enemyDisplayRowForDie(c.swapDie):null;
   if(!(raid?s.pending?.type==='raid'&&!s.successCheck:s.phase==='cleanup')||!c||(!raid&&c.kind!=='instruction')||c.stage!=='swap'||!c.effectDone||c.swapDie===null||!DISPLAY_ROWS.includes(row))fail('Complete the effect and seeded display die before exchanging.');
   if(command.row&&command.row!==row)fail('Cannot exchange any row other than the one indicated by the display die.');
   const displaced=s.pieces.find(q=>q.type==='Instruction'&&q.owner===p.owner&&q.location===`enemy-display:${p.owner}:${row}`);
   if(!displaced||displaced.id===p.id)fail('The selected display row must contain a different same-Enemy Instruction.');
   if(p.location==='enemy-resolution')p.location=displaced.location;
   else if(!SPACE[p.location])fail('The drawn Instruction moved to an invalid place before exchange.');
   restoreInstructionFront(displaced);
   displaced.location='cup';c.stage='paid';c.swapRow=row;c.swapDie=null;
   if(raid){
     const remaining=c.remainingIds.slice(1);
     if(remaining.length){
       const next=item(s,remaining[0]);
       if(next.location!=='enemy-resolution'||next.type!=='Instruction')fail('Next drawn Enemy Instruction is not safely staged.');
       s.raidCupResolution={counterId:next.id,remainingIds:remaining,stage:'effect',effectDone:false,swapDie:null,swapRow:null};
     }else{
       s.raidCupResolution=null;
       if(s.lastSuccessCheck)s.lastSuccessCheck.instructions=0;
     }
   }
   message=`§6.2.2.C: ${displaced.id} returned to cup from ${p.owner} row ${row}; ${p.location===`enemy-display:${p.owner}:${row}`?p.id+' filled that row':p.id+' remains on map at '+p.location}. Next execute a paid Enemy procedure only if APs remain.`;quality='manual';break;
 }
 case 'CLEANUP_CUP_NO_PAID':{
   const c=s.cleanupCupResult;
   if(s.phase!=='cleanup'||!c||c.kind!=='instruction'||c.stage!=='paid'||enemyApPreview(s).total!==0||s.enemyFlow)fail('Only finish a drawn Instruction after its exchange and when no Enemy APs remain.');
   s.steps.cl3='done';s.cleanupCupResult=null;
   message='Cleanup §6.2.2.C complete: effect executed, Instruction exchange performed, no paid Enemy APs remain.';break;
 }
 case 'CLEANUP_ROLL_PAID_ENEMY':{
   const c=s.cleanupCupResult;
   if(s.phase!=='cleanup'||s.steps.cl3==='done'||!c||(c.kind==='instruction'&&c.stage!=='paid')||s.enemyFlow||c.die!==null)fail('Roll the paid Enemy procedure once after the step-3 draw.');
   if(enemyApPreview(s).total===0){s.steps.cl3='done';s.cleanupCupResult=null;message='Cleanup step 3: no Enemy APs remain; skipped paid Enemy Instructions.';break;}
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;c.die=roll.face;
   message=`Cleanup step 3: seeded paid Enemy Action die ${roll.face}. Choose its printed Enemy and display row.`;break;
 }
 case 'CLEANUP_CONFIRM_PAID_ENEMY':{
   const c=s.cleanupCupResult;
   if(s.phase!=='cleanup'||s.steps.cl3==='done'||!c||(c.kind==='instruction'&&c.stage!=='paid')||!c.die||c.enemy||s.enemyFlow)fail('Confirm the printed Enemy after rolling step 3.');
   const enemy=String(command.enemy||'');if(!command.ack||!ENEMY_COLUMNS.includes(enemy))fail('Choose the printed History Card Enemy.');
   const mapped=verifiedHistoryEnemy(s,c.die);if(mapped&&mapped!==enemy)fail(`The verified History Card identifies ${mapped}.`);
   c.enemy=enemy;message=`Cleanup step 3: confirmed ${enemy} from the History Card for die ${c.die}.`;quality='manual';break;
 }
 case 'CLEANUP_FINISH_CUP_ENEMY':{
   const c=s.cleanupCupResult;
   if(s.phase!=='cleanup'||s.steps.cl3==='done'||!c||(c.kind==='instruction'&&c.stage!=='paid')||!c.started||s.enemyFlow)fail('Finish the paid Enemy procedure first.');
   if(!s.log.slice(0,s.log.length-(c.startLog||0)).some(e=>['ENEMY_FINISH','ENEMY_AUTO_FINISH'].includes(e.command)))fail('Paid Enemy procedure has not been completed.');
   s.steps.cl3='done';s.cleanupCupResult=null;
   message='Cleanup step 3: paid Enemy action completed; Success-cup result reconciled.';break;
 }
 case 'CLEANUP_TRAIL_PLACE':{
   if(s.phase!=='cleanup'||s.steps.cl1!=='done'||s.steps.cl2!=='done'||s.steps.cl3!=='done'||s.steps.cl4==='done'||!(s.flags?.santaFe||activeDevelopment(s,'43').length))fail('Santa Fé Trail placement belongs to Cleanup step 4.');
   if(!command.ack||String(command.evidence||'').trim().length<20)fail('Confirm the nearest eligible Wagon Train space against the printed map (20+ characters of evidence).');
   const to=String(command.to||'');if(!['LE-1','UA-3','UA-4','UA-5','UA-6'].includes(to))fail('Choose a printed Wagon Train space: Llano Estacado 1 or Upper Arkansas 3–6.');
   if(s.pieces.some(p=>p.location===to&&(['Band','Rancheria','Settlement'].includes(p.type)||p.faceDown===true)))fail('The Wagon Train space is occupied by a prohibited counter.');
   const pool=s.pieces.filter(p=>p.location==='cup'&&(p.type==='Instruction'||p.type==='Marker'&&/^(Success|Enemy AP [234])$/.test(p.subtype)));
   if(!pool.length)fail('No physical draw-cup counter is available.');
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   const p=pool[s.rng.seed%pool.length];p.location=to;p.faceDown=true;p.wagonTrain=true;
   s.steps.cl4='done';message=`Cleanup step 4: placed one hidden counter face-down at verified Wagon Train space ${to}; identity remains concealed until its rule trigger. Evidence: ${String(command.evidence).trim().slice(0,250)}.`;quality='manual';break;
 }
 case 'CLEANUP_SKIP_TRAIL':{
   if(s.phase!=='cleanup'||s.steps.cl1!=='done'||s.steps.cl2!=='done'||s.steps.cl3!=='done'||s.steps.cl4==='done')fail('Complete preceding Cleanup steps first.');
   if(s.flags?.santaFe||activeDevelopment(s,'43').length)fail('Santa Fé Trail is active: draw and place its hidden counter using the real Wagon Train map procedure.');
   s.steps.cl4='na';message='Cleanup step 4 not applicable: Santa Fé Trail has not opened.';break;
 }
 case 'CHECK':{
   if(s.phase==='cleanup'&&['cl1','cl2','cl3','cl4'].includes(command.key))fail('Use the digital Cleanup procedure, not a manual checkpoint override.');
   if(s.phase==='execution'&&s.operation==='Planning'&&s.planningStage!=null&&['pl1','pl2','pl3'].includes(command.key))fail('Use the digital Planning procedure, not a manual checkpoint override.');
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
   if(s.phase==='execution'&&s.operation==='Passage of Time'&&command.key==='pt13'&&s.setupTemplate==='official')fail('Use the Development display procedure. A manual checkpoint cannot bypass mandatory card effects.');
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
   const required=mandatory || (s.period!==4 && old>0 && die!==null&&die<=old); // Printed H4 forbids non-mandatory Victory Checks.
   s.tracks.operations=0;s.steps.pt15='done';
   s.passageResult={period:s.period,markerBefore:old,mandatory,die,triggered:required};
   if(required){s.victoryPending={period:s.period,history:`H${s.period}`};message=`Passage of Time §4.4 step 15: required Victory Check for H${s.period}. Consult the printed History Card objective (§2.10).`;}
   else{s.tracks.passage=Math.min(20,old+1);s.mustPassage=false;message=`Passage of Time §4.4 step 15: no Victory Check; Passage marker ${old} → ${s.tracks.passage}. Move to Cleanup after confirming remaining rules.`;}
   quality='manual';break;
 }
 case 'RESOLVE_VICTORY_FROM_LEDGER':{
   if(s.phase!=='execution'||s.operation!=='Passage of Time'||!s.victoryPending)fail('No History Victory Check is pending.');
   const audit=historyObjectiveAudit(s);
   if(audit.result==='unknown')fail(audit.reason+' Verify the printed card instead.');
   if(audit.history==='H4'&&!s.passageResult?.mandatory)fail('H4 requires the Must do Passage of Time marker before a Victory Check.');
   if(!command.ack)fail('Confirm the physical board is completely and accurately recorded before applying the computed objective.');
   if(audit.history==='H3'&&audit.uncertainTerritories?.length&&audit.result==='met'&&!command.uncertainAck)
     fail('Territory control is uncertain; verify each ambiguous territory before recording a positive result.');
   const calculated=perform(s,{type:'RESOLVE_VICTORY',met:audit.history==='H4'||audit.result==='met',ack:true,
    objectiveNote:audit.reason,transitionAck:command.transitionAck===true});
   Object.assign(s,calculated);
   message=`Computed ${audit.history} Victory Check from confirmed ledger: ${audit.reason}`;
   quality='manual'; // Source-backed computation, but physical completeness is user-confirmed.
   break;
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
     if(['campaign','downfall'].includes(s.scenario)){
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
     s.period=nextPeriod;s.tracks.operations=0;s.tracks.passage=0;s.mustPassage=false;s.passageResult=null;s.passageDevelopment=null;s.victoryPending=null;
     s.phase='cleanup';s.steps={};s.operation=null;s.cleanupFinishedRolls=[];s.cleanupFinishedPending=null;s.buffaloDoneIds=[];s.americanTradersDoneIds=[];s.louisianaDoneIds=[];
     message=`Period ${period} objective achieved. Transitioned to H${nextPeriod}; remove old History/deck and resolve new card effects on the physical board before Cleanup (§2.10).`;
   }
   quality='manual';break;
 }
 case 'CULTURE_TRADE_FAIR':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==1||s.planningMedicineStarted||!cultureActive(s,'C10'))fail('Trade II Trade Fairs resolve at the beginning of a Planning Operation before Medicine.');
   const ranch=item(s,String(command.rancheriaId||''));
   if(ranch.type!=='Rancheria'||!SPACE[ranch.location])fail('Trade Fair requires an in-play Ranchería.');
   s.cultureTradeFairsDone??=[];
   if(s.cultureTradeFairsDone.includes(ranch.id))fail('Only one Trade Fair per Ranchería in this Planning Operation.');
   const spend=item(s,String(command.resourceId||''));
   if(!(spend.type==='Bison'||spend.type==='Resource'&&['Horse','Captives'].includes(spend.subtype))||spend.location!==`box:${ranch.id}`)fail('Trade Fair spends one Bison, Horse or Captives counter held in that Ranchería.');
   const stock=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location==='reserve');
   if(!stock)fail('Trade Fair requires a recorded unused Trade Goods counter.');
   spend.location='reserve';stock.location=`box:${ranch.id}`;s.cultureTradeFairsDone.push(ranch.id);
   message=`Trade II Fair in ${ranch.label||ranch.id}: spent ${spend.subtype||spend.type}, placed one Trade Goods from stock.`;break;
 }
 case 'PLANNING_MEDICINE_START':{
   if(s.phase!=='execution'||s.operation!=='Planning')fail('Planning Medicine requires an active Planning Operation.');
   if(s.planningMedicineStarted)fail('Planning Medicine step 1 has already resolved.');
   const chiefs=s.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='removed'&&p.location!=='reserve');
   let improved=0;
   for(const chief of chiefs){
     const success=s.pieces.filter(p=>p.subtype==='Success'&&p.location===`medicine:${chief.id}`);
     if(!success.length)continue;
     const medicine=medicineValue(s,chief);
     if(!Number.isInteger(medicine))fail(`Record ${chief.label||chief.id} medicine before Planning.`);
     setMedicine(s,chief,Math.min(6,medicine+1));improved++;
   }
   s.planningMedicineStarted=true;s.planningStage=2;
   message=`Planning §4.3 step 1: improved Medicine for ${improved} Mahimiana with Success counters.`;break;
 }
 case 'PLANNING_DANCE':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==2)fail('Shakedown Dance belongs to Planning step 2.');
   const eligible=s.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='reserve'&&p.location!=='removed'&&s.pieces.some(q=>q.type==='Marker'&&q.subtype==='Success'&&q.location===`medicine:${p.id}`));
   if(!eligible.length)fail('No Mahimiana Success counters remain; complete the dance.');
   const chief=eligible.find(p=>p.id===command.mahimianaId);
   if(!chief)fail('Choose a Mahimiana with Success counters.');
   const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]&&(p.id===chief.affiliatedRancheriaId||String(p.subtype||'').toUpperCase()===String(chief.subtype||'').toUpperCase()));
   if(ranches.length!==1)fail('The Mahimiana requires one unambiguous in-play Ranchería affiliation.');
   const ranch=ranches[0];
   const paraibos=s.pieces.filter(p=>p.type==='Paraibo'&&!['removed','reserve'].includes(p.location)&&(p.affiliatedRancheriaId===ranch.id||p.location===`box:${ranch.id}`||String(p.subtype||'').toUpperCase()===String(ranch.subtype||'').toUpperCase()));
   if(paraibos.length!==1||!Number.isInteger(paraibos[0].medicine))fail('Record the affiliated Paraibo and its Medicine.');
   const successes=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Success'&&p.location===`medicine:${chief.id}`);
   if(!successes.length)fail('No matching Success counters.');
   successes[0].location=`medicine:${paraibos[0].id}`;
   let operations=0;
   if(successes.length>=2){
     const mv=medicineValue(s,chief);
     if(!Number.isInteger(mv))fail('Record Mahimiana Medicine before the dance.');
     const slot=Number(command.slot);
     if(!Number.isInteger(slot)||slot<0||slot>9)fail('Choose a valid Operations-track slot 0–9.');
     if(s.pieces.some(p=>p.subtype==='Success'&&p.location==='operations'&&(!Number.isInteger(p.operationsSlot)||p.operationsSlot<0||p.operationsSlot>9)))fail('Record existing Operations-track Success counter positions before assigning another.');
     const counts=Array.from({length:10},(_,n)=>s.pieces.filter(p=>p.subtype==='Success'&&p.location==='operations'&&p.operationsSlot===n).length);
     if(counts[slot]!==Math.min(...counts))fail('Shakedown must place Operations Success in a least-occupied track space.');
     setMedicine(s,chief,Math.min(6,mv+1));
     successes[1].location='operations';successes[1].operationsSlot=slot;operations=1;
   }
   message=`Shakedown Dance: moved 1 Success to ${paraibos[0].label||'Paraibo'} and ${operations} to Operations.`;break;
 }
 case 'PLANNING_DANCE_FINISH':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==2)fail('Finish the Shakedown only at Planning step 2.');
   if(s.pieces.some(p=>p.type==='Marker'&&p.subtype==='Success'&&p.location.startsWith('medicine:')&&s.pieces.some(q=>q.id===p.location.slice(9)&&q.type==='Mahimiana'&&q.location!=='reserve'&&q.location!=='removed')))fail('Finish all Mahimiana Success transfers first.');
   s.planningStage=3;message='Planning step 2 completed; all eligible Mahimiana Success transferred.';break;
 }
 case 'PLANNING_PARAIBO_MEDICINE':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==3)fail('Paraibo Medicine improvement requires Planning step 3.');
   let count=0;
   for(const pa of s.pieces.filter(p=>p.type==='Paraibo'&&p.location!=='reserve'&&p.location!=='removed')){
     const successes=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Success'&&p.location===`medicine:${pa.id}`);
     if(!successes.length)continue;
     if(!Number.isInteger(pa.medicine))fail('Record Paraibo Medicine before gaining Success Medicine.');
     pa.medicine=Math.min(6,pa.medicine+successes.length);
     for(const p of successes)p.location='success-out';count+=successes.length;
   }
   s.planningStage=4;message=`Planning step 3: resolved ${count} Paraibo Success counters and improved their Medicine.`;break;
 }
 case 'PLANNING_HEADMAN_FINISH':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==4)fail('Finish Headman Actions at Planning step 4.');
   s.planningStage=5;s.steps.pl1='done';message='Finished optional Headman Actions; proceed to Mahimiana recovery.';break;
 }
 case 'PLANNING_RECOVER_MAHIMIANA':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==5)fail('Recovery requires Planning step 5.');
   const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
   let recovered=0;
   for(const ranch of ranches){
     const chiefs=s.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='removed'&&(p.affiliatedRancheriaId===ranch.id||String(p.subtype||'').toUpperCase()===String(ranch.subtype||'').toUpperCase()));
     if(chiefs.length!==1||!Number.isInteger(chiefs[0].medicine))fail('Each Ranchería needs one affiliated Mahimiana with recorded Medicine.');
     const chief=chiefs[0];
     if(chief.medicine!==0)continue;
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     const rating=Math.max(1,Math.floor(roll.face/2));setMedicine(s,chief,rating);
     if(chief.location==='reserve')chief.location=`box:${ranch.id}`;
     recovered++;
   }
   s.planningStage=6;message=`Planning step 5: recovered ${recovered} zero-Medicine Mahimiana using seeded dice.`;break;
 }
 case 'PLANNING_FINISHED_BAND_ATTRITION':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==6)fail('Finished Band attrition requires Planning step 6.');
   const bands=s.pieces.filter(p=>p.type==='Band'&&p.finished&&p.location!=='reserve'&&p.location!=='removed');
   // Every child must have a legal destination before a Band is removed.
   const moves=[];
   for(const band of bands){
     if(band.strength>1)continue;
     const children=s.pieces.filter(p=>p.location===`held:${band.id}`);
     for(const child of children){
       if(child.type==='Resource')moves.push([child,'reserve']);
       else if(child.type==='Mahimiana'){
         const ranches=s.pieces.filter(r=>r.type==='Rancheria'&&(child.affiliatedRancheriaId===r.id||String(child.subtype||'').toUpperCase()===String(r.subtype||'').toUpperCase()));
         if(ranches.length!==1)fail('Finished Band holds a Mahimiana with ambiguous Ranchería affiliation.');
         moves.push([child,`box:${ranches[0].id}`]);
       }else fail('Finished Band holds an unhandled counter; resolve its printed effect first.');
     }
   }
   for(const [piece,to] of moves)piece.location=to;
   for(const band of bands){band.strength--;band.finished=false;if(band.strength===0)band.location='reserve';}
   s.planningMoveAllowance=Object.fromEntries(s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).map(r=>[r.id,s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${r.id}`).reduce((total,b)=>total+b.strength,0)]));
   s.planningStage=7;s.steps.pl2='done';message=`Planning step 6: ${bands.length} Finished Bands lose 1 strength; ${bands.filter(b=>b.strength===0).length} return to stock.`;break;
 }
 case 'DEVELOPMENT_PLAY_MOUNTED_SOCIETY':{
   if(s.phase!=='execution'||s.operation==='Passage of Time'||s.pending||s.successCheck||s.enemyFlow||s.battlePending||s.developmentPending||s.activeBandId||s.developmentMountedMove)fail('Play Mounted Society only during an unblocked active operation, without an activated Band.');
   const c=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='08'&&c.zone==='Hand');
   if(!c)fail('Development #08 must be held in hand.');
   const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
   if(!ranches.length)fail('Mounted Society needs at least one in-play Ranchería.');
   const allowance=Object.fromEntries(ranches.map(r=>[r.id,s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${r.id}`).reduce((n,b)=>n+b.strength,0)]));
   if(!Object.values(allowance).some(n=>n>0))fail('No Ranchería has movement allowance under Planning step 7.');
   c.zone='Discard';s.developmentMountedMove={allowance,moves:{},transit:{}};
   message='Mounted Society #08 played: move up to all Rancherías using normal Planning step 7 allowance, map adjacency, Peace transit and stacking restrictions; then finish the card movement.';break;
 }
 case 'DEVELOPMENT_MOUNTED_FINISH':{
   if(!s.developmentMountedMove)fail('No Mounted Society movement is in progress.');
   if(Object.values(s.developmentMountedMove.transit).some(Boolean))fail('A Ranchería cannot end Mounted Society movement within a Peace Space.');
   s.developmentMountedMove=null;message='Mounted Society movement completed using the regular Ranchería movement rules.';break;
 }
 case 'PLANNING_MOVE_RANCHERIA':{
   if(!s.developmentMountedMove&&(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==7))fail('Ranchería movement requires Planning step 7 or an active Mounted Society card.');
   const ranch=s.pieces.find(p=>p.id===command.rancheriaId&&p.type==='Rancheria'&&SPACE[p.location]);
   if(!ranch)fail('Select an in-play Ranchería.');
   const to=String(command.to||'');if(!SPACE[to])fail('Unknown map space.');
   if(!s.edges.some(e=>e.a===ranch.location&&e.b===to||e.b===ranch.location&&e.a===to))fail('Rancherías may travel only over a recorded connection.');
   const moveBook=s.developmentMountedMove? s.developmentMountedMove.moves : (s.planningRanchMoves??={});
   const max=s.developmentMountedMove? s.developmentMountedMove.allowance[ranch.id] : (s.planningMoveAllowance?.[ranch.id]??s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${ranch.id}`).reduce((n,p)=>n+p.strength,0));
   const used=moveBook[ranch.id]||0;
   if(used>=max)fail('Ranchería has no remaining movement allowance.');
   const destination=SPACE[to];
   const peace=s.pieces.some(p=>p.location===to&&p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype));
   if((destination.type==='square'||s.pieces.some(p=>p.location===to&&['Tribe','Settlement'].includes(p.type)))&&!peace||s.pieces.some(p=>p.location===to&&p.type==='War Column'))fail('Rancherías cannot enter Enemy or War Spaces; Peace Spaces may only be crossed.');
   const others=s.pieces.filter(p=>p.location===to&&p.type==='Rancheria');
   if(others.length)fail('Resolve Ranchería stacking before movement.');
   const question=s.pieces.some(p=>p.location===to&&p.type==='Marker'&&p.subtype==='?');
   if(question)fail('A face-down counter requires the printed reveal procedure before moving here.');
   if(peace&&!command.transit)fail('Peace Space may be crossed but not used as the Ranchería final stop; select transit and continue.');
   if(peace&&used+1>=max)fail('Insufficient movement to leave the Peace Space.');
   ranch.location=to;moveBook[ranch.id]=used+1;
   if(!peace)for(const band of s.pieces.filter(p=>p.type==='Band'&&p.location===to))band.location=`box:${ranch.id}`;
   const transitBook=s.developmentMountedMove?s.developmentMountedMove.transit:(s.planningRanchTransit??={});transitBook[ranch.id]=peace;
   message=`${s.developmentMountedMove?'Mounted Society':'Planning step 7'}: ${ranch.label||ranch.id} moved to ${destination.name}, ${max-used-1} movement left${peace?' (must continue from Peace Space)':''}.`;break;
 }
 case 'CULTURE_POLITICS_MOVE_ALLY':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==7||!cultureActive(s,'C16'))fail('Politics I Allied Tribe movement belongs to Planning step 7 while that card is active.');
   if(s.culturePoliticsUsed)fail('Politics I moves only one Allied Tribe per Planning Operation.');
   const tribe=item(s,String(command.tribeId||''));
   if(tribe.type!=='Tribe'||!SPACE[tribe.location])fail('Select an in-play Tribe.');
   const ally=s.pieces.filter(p=>p.type==='Instruction'&&p.subtype==='Ally'&&p.location===tribe.location);
   if(ally.length!==1)fail('Politics I requires exactly one paired Allied Instruction.');
   const to=String(command.to||'');if(!SPACE[to])fail('Destination must be a map space.');
   const edge=s.edges.find(e=>e.a===tribe.location&&e.b===to||e.b===tribe.location&&e.a===to);
   if(!edge||edge.kind!=='solid')fail('Politics I requires a verified adjacent solid map connection.');
   if(s.pieces.some(p=>p.location===to&&['Tribe','Settlement','Rancheria','War Column'].includes(p.type)))fail('Politics I destination has incompatible stacking.');
   if(s.pieces.some(p=>p.location===to&&p.type==='Instruction'&&p.subtype==='Ally'))fail('Politics I destination already has an Ally.');
   const bison=s.pieces.filter(p=>p.location===to&&p.type==='Bison');
   tribe.location=to;ally[0].location=to;s.culturePoliticsUsed=true;
   for(const b of bison)b.location='reserve';
   message=`Politics I: moved Allied Tribe and its Ally from ${edge.a===to?edge.b:edge.a} to ${to}; returned ${bison.length} Bison to stock.`;break;
 }
 case 'PLANNING_FINISH_RANCHERIA_MOVEMENT':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==7)fail('Finish Ranchería travel at Planning step 7.');
   if(Object.values(s.planningRanchTransit||{}).some(Boolean))fail('A Ranchería cannot finish movement in a Peace Space.');
   s.planningStage=8;s.planningEnemyStartLog=s.log.length;s.planningEnemyDie=null;s.planningEnemyChoice=null;message='Planning step 7 complete; execute one free Enemy Instruction.';break;
 }
 case 'CULTURE_POLITICS_CHOOSE_ENEMY':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==8||s.enemyFlow||s.planningEnemyDie!=null||s.planningEnemyChoice||!cultureActive(s,'C24'))fail('Politics III replaces the Enemy Action Table roll only before the Planning Enemy selection.');
   if(s.tracks.culture<1)fail('Politics III costs one Culture Point.');
   const enemy=String(command.enemy||''),card=s.cards.find(c=>c.kind==='History'&&c.zone==='In play');
   const history=String(card?.identifier||'').toUpperCase();
   const table=VERIFIED_HISTORY_ENEMY_ROLLS[history];
   const named=VERIFIED_HISTORY_NAMED_ENEMIES[history];
   if(!ENEMY_COLUMNS.includes(enemy)||named&&!named.includes(enemy))fail('Selected Enemy is not named on the current verified History Card.');
   if(!named&&command.ack!==true)fail('This History Card lacks a verified Enemy list; confirm the selected Enemy is actually named on the printed card.');
   s.tracks.culture--;s.planningEnemyChoice=enemy;s.planningPoliticsEnemy=enemy;
   // Enemy chosen by card rather than Enemy Action Table. The remaining display
   // die is seeded separately, so no fake Enemy Action Table outcome is claimed.
   const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;s.planningEnemyDie=roll.face;
   message=`Politics III: spent 1 Culture, chose ${enemy} as active Enemy instead of using the History Enemy Action Table; display-selection die ${roll.face}.`;
   break;
 }
 case 'PLANNING_ROLL_ENEMY_DIE':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==8||s.enemyFlow)fail('Roll the free Enemy die only during Planning step 8 with no active Enemy procedure.');
   if(s.planningEnemyDie!=null)fail('The Planning Enemy die is already rolled; choose the printed display row without rerolling.');
   if(s.log.slice(0,s.log.length-(s.planningEnemyStartLog||0)).some(e=>['ENEMY_FINISH','ENEMY_AUTO_FINISH'].includes(e.command)))fail('Free Enemy Instruction has already been resolved.');
   const rolled=rollSeededDie(s.rng.seed);s.rng.seed=rolled.seed;s.rng.rolls++;s.planningEnemyDie=rolled.face;
   message=`Planning step 8: seeded Enemy selection die ${rolled.face}. Read the active History Card for the display row; do not treat the die face as a row letter.`;break;
 }
 case 'PLANNING_CONFIRM_ENEMY':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==8||s.enemyFlow||s.planningEnemyDie==null)fail('A seeded Planning die must be rolled before confirming the printed History result.');
   if(s.planningEnemyChoice)fail('The printed Enemy has already been confirmed; use Undo to change it.');
   const enemy=String(command.enemy||'');
   if(!ENEMY_COLUMNS.includes(enemy)||command.ack!==true)fail('Select an Enemy shown on the physical History Card and confirm the printed result.');
   const known=verifiedHistoryEnemy(s,s.planningEnemyDie);
   if(known&&enemy!==known)fail('The verified History table identifies '+known+'; use the correct Enemy.');
   s.planningEnemyChoice=enemy;
   message=`Planning step 8: player confirmed ${enemy} from the printed History Card for seeded die ${s.planningEnemyDie}. The display row still requires a separate choice.`;
   quality='manual';break;
 }
 case 'PLANNING_FINISH_ENEMY':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==8||s.enemyFlow)fail('Resolve the Planning free Enemy Instruction first.');
   if(!s.log.slice(0,s.log.length-(s.planningEnemyStartLog||0)).some(e=>['ENEMY_FINISH','ENEMY_AUTO_FINISH'].includes(e.command)))fail('An Enemy Instruction procedure must be completed before Planning step 9.');
   s.planningEnemyDie=null;s.planningEnemyChoice=null;s.planningPoliticsEnemy=null;s.planningStage=9;message='Planning step 8: free Enemy procedure completed; resolve the Operations check.';break;
 }
 case 'PLANNING_OPERATIONS_FINISH':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==9)fail('Operations check requires Planning step 9.');
   if(s.cards.some(c=>['Development','Culture','War'].includes(c.kind)&&['In play','Display','War Event'].includes(c.zone))&&!command.ack)fail('Confirm printed card modifiers to the Operations track before rolling.');
   const pos=s.tracks.operations;
   if(pos===0)s.tracks.operations=1;
   else{
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     if(roll.face<=pos)s.mustPassage=true;else s.tracks.operations=Math.min(20,pos+1);
   }
   s.planningStage=10;s.steps.pl3='done';message=`Planning step 9: Operations check resolved from position ${pos}; ${s.mustPassage?'Passage is mandatory':'marker advanced where applicable'}.`;break;
 }
 case 'PLANNING_HEADMAN_START':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==4)fail('Headman Actions require Planning step 4.');
   const ranch=s.pieces.find(p=>p.id===command.rancheriaId&&p.type==='Rancheria'&&SPACE[p.location]);
   if(!ranch)fail('Choose an in-play Ranchería.');
   const chief=s.pieces.filter(p=>p.type==='Paraibo'&&!['removed','reserve'].includes(p.location)&&(p.affiliatedRancheriaId===ranch.id||p.location===`box:${ranch.id}`||String(p.subtype||'').toUpperCase()===String(ranch.subtype||'').toUpperCase()));
   if(chief.length!==1||!Number.isInteger(chief[0].medicine))fail('Record exactly one affiliated Paraibo with verified Medicine.');
   if(chief[0].medicine<1)fail('Paraibo needs at least 1 Medicine to perform Headman Actions.');
   s.planningHeadman??={};
   if(s.planningHeadman[ranch.id])fail('This Paraibo has already selected an action allowance this Planning.');
   const mode=command.mode;
   if(!['guaranteed','gamble'].includes(mode))fail('Choose guaranteed or gamble.');
   let allowance=1,die=null,recordRolls=null;
   if(mode==='gamble'){
     const rolls=[];
     for(let count=0;count<(cultureActive(s,'C19')?2:1);count++){
       const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;rolls.push(roll.face);
     }
     // Spirituality III: choose the highest roll that actually yields actions.
     // When neither roll is within Medicine, the attempt awards zero.
     die=rolls.filter(face=>face<=chief[0].medicine).sort((a,b)=>b-a)[0]??rolls[0];
     allowance=die<=chief[0].medicine?die:0;
     if(rolls.length===2)recordRolls=rolls;
   }
   s.planningHeadman[ranch.id]={paraiboId:chief[0].id,allowance,spent:0,mode,die,rolls:recordRolls};
   message=`${chief[0].label||'Paraibo'}: ${mode==='gamble'?`rolled ${recordRolls?recordRolls.join(' and '):die}, selected ${die}; awarded ${allowance}`:'one guaranteed'} Headman Action${allowance===1?'':'s'}.`;break;
 }
 case 'PLANNING_HEADMAN_ACTION':{
   if(s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==4)fail('Headman Action requires Planning step 4.');
   const record=s.planningHeadman?.[command.rancheriaId];
   if(!record||record.spent>=record.allowance)fail('No Headman Actions remain for this Ranchería.');
   const chief=s.pieces.find(p=>p.id===record.paraiboId&&p.type==='Paraibo');
   if(!chief||!Number.isInteger(chief.medicine))fail('The assigned Paraibo or Medicine is missing.');
   if(command.action==='politics-replace-ally'){
     if(!cultureActive(s,'C20'))fail('Politics II is not active.');
     const tribe=item(s,String(command.tribeId||''));
     if(tribe.type!=='Tribe'||!SPACE[tribe.location])fail('Choose an in-play Allied Tribe.');
     const ally=s.pieces.filter(p=>p.type==='Instruction'&&p.subtype==='Ally'&&p.location===tribe.location);
     if(ally.length!==1)fail('Politics II needs one unambiguous Ally Instruction at the Tribe.');
     const displayRow=[...DISPLAY_ROWS].reverse().find(row=>!s.pieces.some(p=>p.location===`enemy-display:${ally[0].owner}:${row}`));
     if(!displayRow)fail('No free Enemy Instruction display row; Politics II cannot return the Ally.');
     const newBand=s.pieces.find(p=>p.type==='Band'&&p.location==='reserve'&&p.strength===2);
     if(!newBand)fail('Politics II requires an actual unused 2-strength Band counter.');
     const spot=tribe.location;
     if(s.pieces.some(p=>p.location===spot&&p.id!==tribe.id&&p.id!==ally[0].id&&['Tribe','Settlement','Rancheria','War Column'].includes(p.type)))fail('Politics II replacement site has unresolved stacking.');
     tribe.location='reserve';ally[0].location=`enemy-display:${ally[0].owner}:${displayRow}`;
     newBand.location=spot;newBand.finished=false;
     message=`Politics II: returned Tribe ${tribe.id} to stock, moved Ally ${ally[0].id} to ${displayRow}, placed 2-strength Band ${newBand.id} at ${spot}.`;
   }else if(command.action==='diplomacy-place'){
     // Culture 15: choose one face-up Peace/Ally Instruction from any active display row.
     // It is a Headman Action, not an Enemy AP payment. The printed Ally/Peace
     // procedures (§6.3.1/§6.3.5) still require Recover priority first.
     if(!cultureActive(s,'C15'))fail('Diplomacy III is not active.');
     const instruction=item(s,String(command.instructionId||''));
     const match=/^enemy-display:(North|West|South|East):([A-F])$/.exec(instruction.location||'');
     if(instruction.type!=='Instruction'||!match||instruction.owner!==match[1]||!['Peace','Ally'].includes(instruction.subtype)||instruction.faceEvidence==='unverified')
       fail('Diplomacy III requires a face-up Peace or Ally Instruction on an active Enemy display.');
     const display=enemyDisplayAudit(s);
     if(display.problems.length)fail('Correct the Enemy Instruction display ledger before Diplomacy III.');
     const enemy=instruction.owner,sourceRow=match[2];
     const recoverPriority=recoverTargetAudit(s,enemy);
     if(recoverPriority.candidates.length||recoverPriority.ambiguousRavaged.length)fail('Diplomacy III must resolve Recover priority or ambiguous Ravaged ownership before normal Ally/Peace placement.');
     if(instruction.subtype==='Ally'){
       const eligible=allyTargetPreview(s,enemy).candidates;
       const tribe=eligible.find(p=>p.id===String(command.tribeId||''));
       if(!tribe)fail('Diplomacy III Ally requires an eligible non-Allied Tribe target.');
       instruction.location=tribe.location;
       message=`Diplomacy III: placed ${enemy} Ally ${instruction.id} with ${tribe.id} at ${tribe.location}.`;
     }else{
       const target=peaceTargetPreview(s,enemy);
       if(target.war.length>1)fail('Diplomacy III cannot guess which of several War Columns is the printed target.');
       if(target.war.length===1){
         const war=item(s,target.war[0].id);
         if(!Number.isInteger(instruction.strength)||instruction.strength<1)fail('Peace Instruction AP cost must be recorded.');
         const inactiveRow=DISPLAY_ROWS.find(row=>!s.pieces.some(p=>p.location===`enemy-inactive:${row}`));
         if(!inactiveRow)fail('No free Inactive Instruction slot for Diplomacy III Peace.');
         // C15 invokes §6.3.5 step 2. Equality does NOT end the War.
         const engaged=warColumnStopUnits(s,war.id).length>0;
         if(engaged){
           instruction.location=`enemy-inactive:${inactiveRow}`;
           message=`Diplomacy III: War Column ${war.id} is engaged; Peace ${instruction.id} goes Inactive without movement.`;
         }else if(war.strength<instruction.strength){
           resolveWarEnds(s,war.id);
           instruction.location=`enemy-inactive:${inactiveRow}`;
           resetEnemyDisplay(s);
           message=`Diplomacy III: War Ends (strength ${war.strength} < Peace AP cost ${instruction.strength}). Peace returned via Inactive; display reset.`;
         }else{
           const from=war.location;
           const defenders=s.pieces.some(p=>SPACE[p.location]&&(p.type==='Rancheria'||p.type==='Band'&&p.strength>0)&&(enemy==='North'||p.location!=='PD'));
           if(!defenders){
             if(war.strength===1)resolveWarEnds(s,war.id);else war.strength--;
           }else{
             const to=String(command.to||'');
             const edge=s.edges.find(e=>(e.a===from&&e.b===to)||(e.b===from&&e.a===to));
             if(!edge||!SPACE[to]||(edge.kind==='dashed'&&enemy!=='North'))fail('Diplomacy III requires a verified legal adjacent War Column destination.');
             const note=String(command.routeNote||'').trim();
             if(!command.ack||note.length<20||note.length>320)fail('Confirm the printed §3.1 nearest-target movement priority and explain the route (20–320 characters).');
             const partner=s.pieces.find(p=>p.type==='Instruction'&&p.owner===enemy&&p.location===from&&['War','Raid'].includes(instructionName(p)));
             if(!partner)fail('Diplomacy III requires the paired War/Raid Instruction to move with its War Column.');
             war.location=to;partner.location=to;
           }
           let attrition='';
           if(SPACE[war.location]&&war.strength>0){
             const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
             const lost=roll.face<war.strength;
             if(lost){if(war.strength===1)resolveWarEnds(s,war.id);else war.strength--;}
             attrition=` Attrition die ${roll.face}${lost?' caused one strength loss / War Ends':' caused no loss'}.`;
           }
           instruction.location=`enemy-inactive:${inactiveRow}`;
           message=`Diplomacy III: Peace ${instruction.id} resolved §6.3.5 for strong War Column ${war.id} (${from} → ${war.location}).${attrition}`;
         }
       }else{
         for(const oldId of target.replace){
           const slot=DISPLAY_ROWS.find(row=>!s.pieces.some(p=>p.location===`enemy-inactive:${row}`));
           if(!slot)fail('Previous Peace Instruction has no free Inactive row for replacement.');
           item(s,oldId).location=`enemy-inactive:${slot}`;
         }
         instruction.location=target.square;
         message=`Diplomacy III: placed ${enemy} Peace ${instruction.id} at ${target.square}, replacing ${target.replace.length} prior Peace Instruction(s).`;
       }
     }
     record.diplomacyPlaced={instructionId:instruction.id,originalRow:sourceRow};
   }else if(command.action==='diplomacy-flip'){
     if(!cultureActive(s,'C14'))fail('Diplomacy II is not active.');
     const enemy=String(command.enemy||'');if(!ENEMY_COLUMNS.includes(enemy))fail('Choose a valid Enemy column.');
     const display=enemyDisplayAudit(s);
     if(display.problems.length)fail('Resolve invalid Instruction display before Diplomacy II.');
     const top=display.columns[enemy]?.top;
     if(!top)fail('The selected Enemy column has no top Instruction.');
     // §6.2.2 / Culture C14: flip the physical counter, not just its display flag.
     // The active instruction and printed AP cost MUST follow the new face.
     // Unknown opposite faces remain Unknown and cannot be executed by guessing.
     flipInstructionFace(top);
     message=`Diplomacy II: flipped the topmost ${enemy} Instruction (${top.id}) to ${top.subtype}${top.faceEvidence==='unverified'?' (reverse face requires printed-counter verification)':` (AP ${top.strength})`}.`;
   }else if(command.action==='spirituality-medicine'){
     if(!cultureActive(s,'C18'))fail('Spirituality II must be active to attempt this action.');
     if(record.spiritualityAttempted)fail('This Paraibo already succeeded at Spirituality II this Planning.');
     const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
     const success=die.face>chief.medicine;
     if(success){chief.medicine=Math.min(6,chief.medicine+1);record.spiritualityAttempted=true;}
     message=`Spirituality II: rolled ${die.face} against Medicine ${chief.medicine-(success?1:0)}. ${success?'Medicine +1; the same Paraibo cannot repeat this action during this Planning operation.':'No Medicine increase.'}`;
   }else if(command.action==='collect-ap'){
     if(chief.medicine<2||s.tracks.ap>=9)fail('Collecting AP requires Medicine ≥2 and room under the 9 AP cap.');
     chief.medicine--;s.tracks.ap++;message='Headman Action: Paraibo −1 Medicine; player +1 AP.';
   }else if(command.action==='convert-military'){
     if(s.tracks.culture<=s.tracks.military||s.tracks.military>=9)fail('Culture must exceed Military to convert 1 Culture into 1 Military.');
     s.tracks.culture--;s.tracks.military++;message='Headman Action: converted 1 Culture to 1 Military.';
   }else if(command.action==='return-success'){
     if(s.tracks.ap<1)fail('Returning Success costs 1 AP.');
     const counter=s.pieces.find(p=>p.type==='Marker'&&p.subtype==='Success'&&p.location==='success-out');
     if(!counter)fail('No Success counter in the Out of Play box.');
     s.tracks.ap--;counter.location='cup';message='Headman Action: paid 1 AP to return 1 Success to the cup.';
   }else fail('Unknown Headman Action.');
   record.spent++;
   break;
 }
 case 'SELECT_OPERATION':{
   if(s.phase!=='selection')fail('Select an Operation during Operation Selection only.');
   const op=command.value;if(!OPERATIONS.includes(op))fail('Unknown operation.');
   if(requiredPassage(s)&&op!=='Passage of Time')fail('Passage of Time is mandatory: no Bands in play, or the Operations marker requires it.');
   if(op==='Passage of Time'&&!requiredPassage(s)&&s.tracks.operations===0)fail('Voluntary Passage of Time requires Operations in a numbered space (§3.2.E).');
   s.operation=op;s.planningMedicineStarted=false;s.planningStage=op==='Planning'?1:null;s.cultureTradeFairsDone=[];s.culturePoliticsUsed=false;s.planningPoliticsEnemy=null;s.planningHeadman={};s.planningOperationsSlots={};s.planningRanchMoves={};s.planningRanchTransit={};s.planningMoveAllowance={};s.giftGivingUsed=false;s.developmentPlanningApplied=false;s.epidemicTakeActionsApplied=false;s.epidemicCompletedIds=[];s.passageRetiredIds=[];s.passageProminentExemptIds=[];s.passageQuanahExemptId=null;s.passagePeaceRolls={};s.passageBison=null;s.passageDevelopment=null;s.passageResult=null;s.victoryPending=null;s.operationEvents={cultureGain:false,operationsRoll:false};message=`Selected ${op}.`;break;}
 case 'ADVANCE':{
   const next=safeNext(s);if(!next.ok)fail(next.message);
   let delayedEventMessage='';
   if(s.phase==='war'){s.phase='selection';s.operation=null;}
   else if(s.phase==='selection'){if(requiredPassage(s)&&s.operation!=='Passage of Time')fail('Passage of Time is mandatory.');s.phase='execution';}
   else if(s.phase==='execution'){s.phase='cleanup';s.cleanupFinishedRolls=[];s.cleanupFinishedPending=null;s.buffaloDoneIds=[];s.americanTradersDoneIds=[];s.louisianaDoneIds=[];}
   else if(s.phase==='cleanup'){
     const higherStakesPending=s.cards.some(c=>c.kind==='War'&&c.zone==='War Event'&&String(c.identifier).toUpperCase()==='W23')&&!s.warHigherStakesResolved;
     delayedEventMessage=higherStakesPending?higherStakesAtCleanup(s):'';
     // At the beginning of the next War Column Phase, §3.1 step 1 discards the old event.
     for(const c of s.cards.filter(c=>c.kind==='War'&&c.zone==='War Event'))c.zone='Discard';
     s.warEventResolved=null;s.warHigherStakesResolved=false;s.warMovementDrawn=null;s.cultureEvadeTried=[];s.cultureEvadeDeclined=false;
     s.phase='war';s.cleanupFinishedRolls=[];s.cleanupFinishedPending=null;s.cleanupCupResult=null;s.battleExemptions={};s.operation=null;s.activeBandId=null;s.tracks.movement=0;
     /* Finished states remain as recorded; physical rule cleanup controls the next reset. */}
   else fail('Cannot advance from this phase.');
   s.steps={};message=`${delayedEventMessage?delayedEventMessage+' ':''}Advanced to ${s.phase.toUpperCase()} phase.`;break;}
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
  const baseRemaining=s.tracks.movement;
  s.tracks.movement+=bonus;s.qualityMounts={cardId:c.id,bandId:s.activeBandId,bonus,baseRemaining,bonusRemaining:bonus};
  message=`Quality Mounts: Band ${s.activeBandId} gained ${bonus} MP; roll at Finish Band to check card discard.`;break;
 }
 case 'FINISH_BAND':{
   const p=activeBand(s);if(!p)fail('No Band currently active.');p.finished=true;
   if(s.qualityMounts?.bandId===p.id){
     const grant=s.qualityMounts;
     // The printed discard threshold is MPs *used*, not MPs awarded.
     // At grant time these are added to the end of the remaining MP pool;
     // any bonus still in that pool when the Band finishes was not spent.
     if(!Number.isInteger(grant.bonusRemaining))fail('This older Quality Mounts action lacks a verified MP spending ledger; Undo the activation and replay the card.');
     const bonusUsed=grant.bonus-grant.bonusRemaining;
     const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
     s.qualityMountsPending={cardId:grant.cardId,bandId:p.id,bonus:grant.bonus,bonusUsed,die:die.face,rerolled:false};
     message=`Quality Mounts finish die ${die.face}; ${bonusUsed} of ${grant.bonus} awarded bonus MPs spent. Resolve the risk check or cancel this uncommitted die with Counting Coup. `;
     s.qualityMounts=null;
   }
   const wagonCounters=s.pieces.filter(q=>q.wagonTrain===true&&q.faceDown===true&&q.location===p.location);
   for(const counter of wagonCounters){
     counter.faceDown=false;counter.wagonTrain=false;
     if(counter.type==='Instruction')counter.location='enemy-resolution';
     else if(counter.subtype==='Success')counter.location='cup';
     else if(/^Enemy AP [234]$/.test(counter.subtype))counter.location='available-enemy-aps';
     else fail('Unrecognised Wagon Train counter; reconcile physical stock before revealing.');
   }
   if(wagonCounters.length)message+=`Revealed ${wagonCounters.length} Wagon Train counter(s): ${wagonCounters.map(q=>q.type==='Instruction'?'Enemy Instruction (resolution required)':q.subtype).join(', ')}. `;
   s.activeBandId=null;s.tracks.movement=0;s.greatHuntBandId=null;
   if(s.comancheMoon?.bandId===p.id)s.comancheMoon=null;
   const options=warCountermeasureOptions(s,p.id);
   if(options.length){s.countermeasureWindow={cardId:String(activeWarCard(s)?.identifier).toUpperCase(),bandId:p.id};
     message+=`Finished ${named(p)}. Resolve or decline the printed War countermeasure before continuing.`;
   }else message+=`Finished ${named(p)}.`;
   break;}
 case 'DEVELOPMENT_COUNTING_COUP_MOUNTS_REROLL':{
   const q=s.qualityMountsPending;
   if(!q||q.rerolled)fail('No eligible unresolved Quality Mounts die remains to reroll.');
   const coup=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Hand');
   if(!coup)fail('Counting Coup must be in hand to cancel the Quality Mounts die.');
   const old=q.die,roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
   q.die=roll.face;q.rerolled=true;coup.zone='Discard';
   message=`Counting Coup canceled Quality Mounts die ${old} and rerolled ${roll.face}. Resolve the replacement die.`;break;
 }
 case 'DEVELOPMENT_QUALITY_MOUNTS_RESOLVE':{
   const q=s.qualityMountsPending;
   if(!q)fail('No unfinished Quality Mounts die exists.');
   const card=s.cards.find(c=>c.id===q.cardId&&c.kind==='Development'&&devNumber(c)==='16'&&c.zone==='Hand');
   if(!card)fail('The recorded Quality Mounts card must still be in hand.');
   if(q.die<=q.bonusUsed)card.zone='Discard';
   message=`Quality Mounts: ${q.bonusUsed} bonus MP used, die ${q.die}; card ${q.die<=q.bonusUsed?'discarded':'retained'}.`;
   s.qualityMountsPending=null;break;
 }
 case 'CULTURE_LORDS_REVEAL':{
   if(s.phase!=='execution'||s.operation!=='Take Actions'||!cultureActive(s,'C08'))fail('Lords II Harass reveal requires an active Lords II during Take Actions.');
   const band=activeBand(s),counter=item(s,String(command.counterId||''));
   if(!band||counter.type!=='Marker'||counter.location!==band.location||counter.faceDown!==true)fail('Harass reveals only an actual face-down marker in the active Band space.');
   if(s.tracks.movement<2)fail('Harass reveal costs 2 MPs.');
   const revealFace=counter.subtype==='?'?counter.hiddenSubtype:counter.subtype;
   if(!/^(Success|Enemy AP [234])$/.test(String(revealFace||'')))fail('The hidden counter face must be a recorded Success or Enemy AP to resolve digitally.');
   if(counter.subtype==='?'){counter.subtype=revealFace;delete counter.hiddenSubtype;}
   counter.faceDown=false;
   counter.location=counter.subtype==='Success'?'cup':'available-enemy-aps';
   s.tracks.movement-=2;
   message=`Lords II Harass reveal: ${counter.subtype} moved to ${counter.location}; spent 2 MP.`;break;
 }
 case 'CULTURE_TACTICS_UNKNOWN_SCOUT':{
   if(s.phase!=='execution'||s.operation!=='Take Actions'||!cultureActive(s,'C23'))fail('Tactics III Scout requires active Tactics III during Take Actions.');
   const band=activeBand(s),counter=item(s,String(command.counterId||''));
   if(!band||counter.type!=='Marker'||counter.subtype!=='?'||counter.location!==band.location||counter.faceDown!==true)fail('Tactics III may Scout only an unrevealed question-mark marker in the active Band space.');
   if(!/^(Success|Enemy AP [234])$/.test(String(counter.hiddenSubtype||'')))fail('Tactics III needs the actual hidden Success/Enemy AP identity recorded privately to return this marker to the fully digital cup; do not guess its face.');
   if(s.tracks.movement<1)fail('Tactics III Scout costs 1 MP.');
   counter.location='cup'; // Keep faceDown: the card explicitly forbids seeing the face.
   s.tracks.movement--;
   message=`Tactics III Scout: returned face-down counter ${counter.id} to cup without revealing it; spent 1 MP.`;break;
 }
 case 'CULTURE_LORDS_HARASS':{
   if(s.phase!=='execution'||s.operation!=='Take Actions'||!cultureActive(s,'C08'))fail('Lords II Harass is a Take Actions ability requiring the active card.');
   const band=activeBand(s),war=item(s,String(command.warId||''));
   if(!band||war.type!=='War Column'||war.strength<1||war.location!==band.location||!SPACE[war.location]||SPACE[war.location].type==='enemy')fail('Harass requires the active Band and War Column together in a non-Enemy map space.');
   if(s.tracks.movement<2)fail('Harass costs 2 movement points.');
   if(war.strength===1){const plan=resolveWarEnds(s,war.id);message=`Lords II Harass: 2 MP spent; War Ends, returned ${plan.instructionId} to ${plan.destination}.`;}
   else{war.strength--;message=`Lords II Harass: War Column ${war.id} lost one strength (${war.strength} remains).`;}
   s.tracks.movement-=2;break;
 }
 case 'CULTURE_TACTICS_SCOUT':{
   if(s.phase!=='execution'||s.operation!=='Take Actions'||!cultureActive(s,'C22'))fail('Tactics II Scout requires active Tactics II during Take Actions.');
   const band=activeBand(s);
   if(!band||!s.pieces.some(p=>p.type==='War Column'&&p.strength>0&&p.location===band.location))fail('Scout requires the active Band to share a space with a War Column.');
   if(s.tracks.movement<1)fail('Scout costs 1 movement point.');
   const deck=s.cards.filter(c=>c.kind==='War'&&c.zone==='Deck');
   if(!deck.length)fail('War Deck is empty; cannot Scout.');
   const verified=new Set();
   for(const c of deck){
     const matched=/^setup-war-(\d+)$/.exec(c.id);
     const identity=matched?`W${matched[1].padStart(2,'0')}`:String(c.identifier||'').trim().toUpperCase();
     if(!warCard(identity)||verified.has(identity))fail('Tactics II requires a complete, uniquely identified War deck before revealing its next card.');
     verified.add(identity);
   }
   if(s.warDeckPeekId&&!deck.some(c=>c.id===s.warDeckPeekId))fail('Previously scouted War Card is no longer in the deck.');
   if(!s.warDeckPeekId){
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     s.warDeckPeekId=deck[(roll.seed>>>0)%deck.length].id;
   }
   const seen=s.cards.find(c=>c.id===s.warDeckPeekId);
   const match=/^setup-war-(\d+)$/.exec(seen.id);
   const number=match?`W${match[1].padStart(2,'0')}`:String(seen.identifier||'').toUpperCase();
   s.tracks.movement--;
   message=`Tactics II Scout: previewed top War Card ${number}; the card remains on top until the next War draw. Spent 1 MP.`;break;
 }
 case 'CULTURE_HUSBANDRY':{
   if(s.phase!=='execution'||s.operation!=='Take Actions'||!cultureActive(s,'C02'))fail('Horsemanship II Husbandry requires active card during Take Actions.');
   if(s.activeBandId)fail('Finish the current Band before choosing an unspent Band for Husbandry.');
   const band=item(s,String(command.bandId||''));
   if(band.type!=='Band'||!isInPlay(band)||band.finished)fail('Husbandry requires an unfinished in-play Band which has not spent movement points this operation.');
   const slot=bounded(command.slot,0,9,'Operations Track slot');
   if(s.pieces.some(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location==='operations'&&p.operationsSlot===slot))fail('An Operations Track slot can hold only one Husbandry Horse.');
   const stock=s.pieces.find(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location==='reserve');
   if(!stock)fail('Husbandry requires an actual unused Horses counter in stock.');
   band.finished=true;stock.location='operations';stock.operationsSlot=slot;
   message=`Horsemanship II Husbandry: finished Band ${band.id} without MPs spent, placed Horse ${stock.id} in Operations slot ${slot}.`;break;
 }
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
 case 'CULTURE_WARPATH_START':{
   if(s.phase!=='execution'||s.operation!=='Take Actions'||!cultureActive(s,'C05'))fail('Warfare I Warpath requires active Warfare I during Take Actions.');
   const band=activeBand(s);
   if(!band||!SPACE[band.location])fail('Warpath requires an active Band in a map space.');
   if(!s.pieces.some(q=>q.location===band.location&&['Tribe','Settlement'].includes(q.type)))fail('Warpath requires a Tribe or Settlement in the active Band space.');
   if(s.pending||s.successCheck||s.lastSuccessCheck)fail('Finish the current Raid or Success Check first.');
   if(s.tracks.movement<band.strength)fail('Warpath costs movement points equal to Band strength.');
   s.tracks.movement-=band.strength;
   s.pending={type:'raid',warpath:true,bandId:band.id,space:band.location,peace:peaceSpaceStatus(s,band.location).peace,moonCardId:null};
   message=`Warfare I Warpath begun against Tribe/Settlement at ${band.location}: spent ${band.strength} MP. Perform Success Check; each Success places one Ravaged counter.`;break;
 }
 case 'CULTURE_WARFARE_EXTRA_DRAW':{
   if(!cultureActive(s,'C06')||s.pending?.type!=='raid'||!s.successCheck||s.successCheck.bandId!==s.pending.bandId)fail('Warfare II extra draw requires the current Raid/Warpath Band’s active Success Check.');
   const sc=s.successCheck;
   if(sc.drawIds.length||sc.warfareExtra)fail('Declare the optional Warfare II extra counter before any draw, once only.');
   sc.expected++;sc.warfareExtra=true;
   message=`Warfare II: declared one extra Success Check counter before drawing; draw ${sc.expected} counters in total.`;break;
 }
 case 'BEGIN_RAID':{
   if(activeDevelopment(s,'20').length&&activeBand(s)?.location==='W')fail('Taos Pueblo Trade (#20) prohibits Raids in the West square Enemy Space.');
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Raid requires Take Actions.');
   const p=activeBand(s);if(!p)fail('Activate a Band first.');
   if(s.tracks.movement<1)fail('Need 1 movement point for Raid.');
   if(!SPACE[p.location])fail('Band is not on the board.');
   if(SPACE[p.location].type!=='enemy'&&!peaceSpaceStatus(s,p.location).peace)fail('Raid target must be an Enemy Space or Peace Space (5.2.3).');
   s.tracks.movement--;s.lastSuccessCheck=null;
   const moon=s.comancheMoon?.bandId===p.id?s.comancheMoon.cardId:null;
   s.pending={type:'raid',bandId:p.id,space:p.location,peace:peaceSpaceStatus(s,p.location).peace,moonCardId:moon};s.comancheMoon=null;
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
 case 'RAID_DIGITAL_START':
 case 'START_SUCCESS_CHECK':{
   if(!s.pending||s.pending.type!=='raid')fail('Start a guided Success Check during a pending Raid.');
   if(s.successCheck)fail('A Success Check is already in progress.');
   const digitalStart=type==='RAID_DIGITAL_START';
   if(digitalStart&&s.lastSuccessCheck)fail('Raid already has a completed Success Check.');
   const band=item(s,s.pending.bandId);
   const mahimiana=s.pieces.find(p=>p.type==='Mahimiana'&&p.location===`held:${band.id}`);
   let bonus=0,medicine=null,die=null;
   if(mahimiana){
     medicine=bounded(digitalStart?s.medicine.mahimiana:command.medicine,0,9,'Mahimiana medicine');
     if(command.digitalDie===true||digitalStart){
       const next=rollSeededDie(s.rng.seed);s.rng.seed=next.seed;s.rng.rolls++;die=next.face;
     }else die=bounded(command.die,1,6,'Mahimiana die');
     bonus=die<=Math.floor(medicine/2)?2:die<=medicine?1:0;
     if(!command.ack&&command.digitalDie!==true&&!digitalStart)fail('Verify Mahimiana medicine and bonus die on the physical board.');
   }
   const shieldBonus=s.cards.some(c=>c.kind==='Development'&&devNumber(c)==='36'&&c.zone==='Hand')?1:0;
   s.successCheck={bandId:band.id,mahimianaId:mahimiana?.id||null,expected:band.strength+bonus+shieldBonus,base:band.strength,bonus,shieldBonus,medicine,die,digital: digitalStart,drawIds:[],canceledDrawIds:[],gunAttempts:[],redraws:0};
   message=`Success Check started: Band Strength ${band.strength}${mahimiana?`, Mahimiana bonus ${bonus} (medicine ${medicine}, ${command.digitalDie===true?'digital':'physical'} die ${die})`:''}; draw ${s.successCheck.expected} counters from the digital cup or record physical draws (2.9.2).`;
   quality=(command.digitalDie===true||digitalStart)?'verified':'manual';break;}
 case 'RECORD_SUCCESS_DRAW':{
   const sc=s.successCheck;if(!sc)fail('Start a guided Success Check first.');
   if(sc.drawIds.length>=sc.expected)fail('All required counters are already recorded.');
   const p=item(s,command.id);
   if(p.location!=='cup')fail('Selected counter is not in the Success Check cup.');
   if(!((p.type==='Marker' && (/^(Success|Enemy AP [234])$/.test(p.subtype)||(p.subtype==='?'&&p.faceDown===true&&/^(Success|Enemy AP [234])$/.test(p.hiddenSubtype))))||p.type==='Instruction'))fail('The cup draw must be a Success, Enemy AP or Instruction counter with verified hidden identity.');
   if(p.type==='Marker'&&p.subtype==='?'&&p.faceDown===true){p.subtype=p.hiddenSubtype;delete p.hiddenSubtype;p.faceDown=false;}
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
 case 'DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL':{
   // D09 cancels the *Tactical Advantage die result* before the cup draw.
   // A discarded D17/D42 from a previous 1-2 is restored before applying
   // the replacement die. The outcome never stacks with the cancelled roll.
   const sc=s.successCheck;
   if(!sc||!sc.tacticalAttempted||!sc.tacticalCard||sc.tacticalDie==null)
     fail('Counting Coup requires a resolved Tactical Advantage die awaiting its Success Check draw.');
   if(sc.drawIds.length||sc.gunAttempts.length||sc.canceledDrawIds.length||sc.redraws)
     fail('Cannot cancel a Tactical Advantage die after Success Check counters or other consequences are resolved.');
   if(sc.countingCoupTacticalReroll)fail('This Tactical Advantage die was already rerolled with Counting Coup.');
   const coup=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Hand');
   if(!coup)fail('Counting Coup #09 must be in hand.');
   const tactical=s.cards.find(c=>c.id===sc.tacticalCard&&c.kind==='Development'&&['17','42'].includes(devNumber(c)));
   if(!tactical||!['Hand','Discard'].includes(tactical.zone))fail('The Tactical Advantage card is not in a reversible state.');
   const old=sc.tacticalDie,roll=rollSeededDie(s.rng.seed);
   s.rng.seed=roll.seed;s.rng.rolls++;
   sc.tacticalDie=roll.face;
   sc.tacticalSuccess=roll.face>=3?1:0;
   sc.tacticalReturnAP=roll.face>=5;
   sc.countingCoupTacticalReroll={previous:old,reroll:roll.face,cardId:coup.id};
   tactical.zone=roll.face<=2?'Discard':'Hand';
   coup.zone='Discard';
   message=`Counting Coup #09 cancelled Tactical Advantage die ${old}; replacement ${roll.face}. ${roll.face<=2?'Tactical Advantage discarded':roll.face<=4?'One Success granted':'One Success and return one drawn Enemy AP counter, if any'}.`;
   break;
 }
 case 'DEVELOPMENT_COUNTING_COUP_REROLL':{
   // Printed D09: cancel one die roll. The Mahimiana bonus die has not
   // committed any counter movement until the cup draw begins. Never use
   // this on a committed battle/history/guns roll (those need separate
   // pre-commit transaction support).
   const sc=s.successCheck;
   if(!sc||!sc.mahimianaId||sc.die==null)fail('Counting Coup requires an unresolved Mahimiana Success Check bonus die.');
   if(sc.drawIds.length||sc.gunAttempts.length||sc.tacticalAttempted||sc.canceledDrawIds.length||sc.warfareExtra)
     fail('Counting Coup die reroll must precede every cup draw or separately committed bonus.');
   const c=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Hand');
   if(!c)fail('Counting Coup #09 must be held in hand.');
   // New die is independent of the old result; source die is always seeded
   // digitally, even when the original bonus result was entered physically.
   const reroll=rollSeededDie(s.rng.seed);
   s.rng.seed=reroll.seed;s.rng.rolls++;
   const previous=sc.die;sc.die=reroll.face;
   sc.bonus=reroll.face<=Math.floor(sc.medicine/2)?2:reroll.face<=sc.medicine?1:0;
   sc.expected=sc.base+sc.bonus+(sc.shieldBonus||0);
   sc.countingCoupReroll={previous,reroll:reroll.face,cardId:c.id};
   c.zone='Discard';
   message=`Counting Coup #09: cancelled uncommitted Mahimiana die ${previous}, rerolled ${reroll.face}; revised Success Check draw count ${sc.expected}. Card discarded.`;
   break;
 }
 case 'DEVELOPMENT_COUNTING_COUP_REDRAW':{
   const sc=s.successCheck;
   if(!sc||!sc.drawIds.length)fail('Counting Coup can cancel only an actual Success Check draw already in progress.');
   if(sc.canceledDrawIds.length||sc.gunAttempts.length||sc.tacticalAttempted)fail('Resolve Guns and Tactical Advantage before attempting a whole-draw cancellation; this version cannot safely reverse their separate side effects.');
   const c=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Hand');
   if(!c)fail('Counting Coup #09 must be held in hand.');
   for(const id of sc.drawIds){const p=item(s,id);if(p.location!=='check-draw')fail('All drawn counters must still be staged before cancellation.');p.location='cup';}
   sc.drawIds=[];sc.canceledDrawIds=[];sc.gunAttempts=[];sc.redraws++;
   c.zone='Discard';message=`Counting Coup #09: cancelled the current Success Check draw, restored every staged counter to the cup and must redraw all ${sc.expected} counters.`;
   quality=sc.digital?'verified':'manual';break;
 }
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
   if(sc.tacticalReturnAP&&aps.length){const removed=seededSelect(s,aps);removed.location='cup';aps.splice(aps.indexOf(removed),1);}
   // D17: an Enemy AP counter returned by Tactical Advantage is no longer
   // part of the completed draw. Evaluate all AP thresholds from the final cup state.
   const enemyAPPoints=aps.reduce((n,p)=>n+Number(p.subtype.at(-1)),0);
   const instructions=drawn.filter(p=>p.type==='Instruction');
   if(instructions.length && s.raidCupResolution)fail('Finish the previous drawn Instruction exchange before completing this Success Check.');
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
   s.lastSuccessCheck={bandId:sc.bandId,successes:successes.length+(sc.tacticalSuccess||0),drawnSuccesses:successes.length,enemyAPs:aps.length,instructions:instructions.length,expected:sc.expected,digital:Boolean(sc.digital)};
   s.successCheck=null;
   if(instructions.length){
     s.raidCupResolution={counterId:instructions[0].id,remainingIds:instructions.map(p=>p.id),stage:'effect',effectDone:false,swapDie:null,swapRow:null};
   }
   message=`Success Check complete: ${successes.length+(sc.tacticalSuccess||0)} Success, ${aps.length} Enemy AP, ${instructions.length} Instruction; ${sc.canceledDrawIds.length} AP canceled with Guns; ${sc.redraws} Trade Goods redraw(s) from ${sc.expected} final physical draws. ${sc.mahimianaId?'Success counters assigned to Mahimiana medicine track':'Success counters sent Out of Play'}. Enemy APs moved to Available Enemy APs; ${instructions.length?'reconcile drawn Instructions with board after Raid.':''} ${String(command.instructionNote||'').slice(0,180)}`;
   quality=sc.digital&&!instructions.length?'verified':'manual';break;}
 case 'CANCEL_RAID':{
   if(!s.pending||s.pending.type!=='raid')fail('No Raid to cancel.');
   if(s.lastSuccessCheck?.bandId===s.pending.bandId)fail('A physical Success Check has already been resolved. Use Undo instead of cancelling the Raid.');
   s.tracks.movement+=s.pending.warpath?item(s,s.pending.bandId).strength:1;s.pending=null;message='Raid/Warpath cancelled; activation movement cost returned; any prepared Comanche Moon remains in hand.';break;}
 case 'RAID_DIGITAL_REWARD':
 case 'RESOLVE_RAID':{
   const pending=s.pending;if(!pending||pending.type!=='raid')fail('No Raid awaiting resolution.');
   const digitalReward=type==='RAID_DIGITAL_REWARD';
   if(digitalReward){
     if(!s.lastSuccessCheck?.digital||s.successCheck||s.lastSuccessCheck.bandId!==pending.bandId)fail('Finish a fully digital Success Check before choosing digital Raid rewards.');
     if(s.raidCupResolution||s.lastSuccessCheck.instructions)fail('Enemy Instructions drawn from the cup must resolve before Raid rewards.');
     const peacePlan=raidPeaceResolutionPreview(s,pending.space);
     if(!peacePlan.ready)fail(peacePlan.reason);
     if(pending.moonCardId)fail('Comanche Moon special rewards require its card-specific procedure.');
     if(!pending.warpath&&activeDevelopment(s,'73').length&&!s.pieces.some(p=>p.type==='Bison'&&p.location==='reserve'))fail('Texas Beef requires a recorded Bison counter in stock.');
   }
   const successes=bounded(digitalReward?s.lastSuccessCheck.successes:command.successes,0,20,'Successes');
   if(s.lastSuccessCheck?.bandId===pending.bandId && successes!==s.lastSuccessCheck.successes)fail(`Guided Success Check recorded ${s.lastSuccessCheck.successes} successes; the Raid result must match.`);
   const horses=bounded(command.horses,0,successes,'Horse rewards');
   const band=item(s,pending.bandId);
   if(successes && !command.ack&&!digitalReward)fail('Confirm you performed the physical Success Check and all required Peace rolls, if any.');
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
   }else if(!pending.warpath){
   for(let i=0;i<horses;i++)createPiece(s,{type:'Resource',subtype:'Horse',label:'Horse',location:`held:${band.id}`,owner:'Comanche'});
   for(let i=horses;i<successes;i++)createPiece(s,{type:'Resource',subtype:'Captives',label:'Captives',location:`held:${band.id}`,owner:'Comanche'});
   }
   const bonusRavaged=Boolean(command.bonusRavaged);
   if(bonusRavaged&&(!cultureActive(s,'C07')||(s.lastSuccessCheck.drawnSuccesses??0)<1||!s.pieces.some(q=>q.location===pending.space&&['Tribe','Settlement'].includes(q.type))))fail('Warfare III bonus Ravaged requires an active card, a drawn Success and a Tribe/Settlement target.');
   if(pending.warpath){
     if(horses!==0||pending.moonCardId)fail('Warpath places Ravaged counters instead of claiming Horses or Captives.');
     for(let i=0;i<(s.lastSuccessCheck.drawnSuccesses??successes)+(bonusRavaged?1:0);i++)placeCultureRavaged(s,pending.space);
   }else{
     if(successes)placeCultureRavaged(s,pending.space);
     if(bonusRavaged)placeCultureRavaged(s,pending.space);
   }
   let peaceResult='';
   if(digitalReward){
     const peacePlan=raidPeaceResolutionPreview(s,pending.space);
     if(peacePlan.peace){
       const die=rollSeededDie(s.rng.seed);s.rng.seed=die.seed;s.rng.rolls++;
       const ravaged=s.pieces.filter(p=>p.subtype==='Ravaged'&&p.location===pending.space).length;
       const modified=die.face+ravaged;
       const returning=modified>peacePlan.cost;
       if(returning)item(s,peacePlan.instructionId).location=`enemy-display:${peacePlan.owner}:${peacePlan.row}`;
       peaceResult=` Peace roll ${die.face}+${ravaged} Ravaged = ${modified} vs ${peacePlan.cost}: ${returning?'Instruction returned to '+peacePlan.row:'Peace/Ally remains'}.`;
     }
   }
   if(!pending.warpath&&successes>0&&activeDevelopment(s,'73').length){
     const stock=s.pieces.find(p=>p.type==='Bison'&&p.location==='reserve');
     if(!stock)fail('Texas Beef bonus requires an available physical Bison counter in stock.');
     stock.location=`held:${band.id}`;
   }
   if(!pending.warpath&&activeDevelopment(s,'62').length){
    const captives=pending.moonCardId?1:successes-horses;
    s.tracks.culture=Math.min(9,s.tracks.culture+captives*activeDevelopment(s,'62').length);
   }
   s.pending=null;s.lastSuccessCheck=null;message=`${pending.warpath?'Warpath':'Raid'} resolved with ${successes} Successes; ${pending.warpath?`${successes+(bonusRavaged?1:0)} Ravaged placed` : pending.moonCardId?'Comanche Moon fixed 1 Horse and 1 Captives':`${horses} Horse, ${successes-horses} Captives`}. ${digitalReward?peaceResult:'Peace result must be entered manually if applicable.'}`;
   quality=digitalReward?'verified':'manual';break;}
 case 'TRADE':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Trade requires Take Actions.');
   const p=activeBand(s);if(!p||!SPACE[p.location])fail('Activate a Band on the map first.');
   const louisianaGoods=activeDevelopment(s,'44').length? s.pieces.find(x=>x.type==='Resource'&&x.subtype==='Trade Goods'&&x.location===p.location&&SPACE[p.location]?.type==='round'):null;
   const tradeGuns=cultureActive(s,'C09')&&command.receive==='Guns';
   const hasTribe=s.pieces.some(q=>q.type==='Tribe'&&q.location===p.location);
   const gunsTradeHere=tradeGuns&&(hasTribe||p.location==='E1'||p.location==='E2'||peaceSpaceStatus(s,p.location).peace);
   if(!louisianaGoods&&SPACE[p.location].type!=='enemy'&&!peaceSpaceStatus(s,p.location).peace&&!gunsTradeHere)fail('Trade only in Enemy Spaces, Peace Spaces or the Culture Trade I Tribe exception.');
   if(tradeGuns&&!gunsTradeHere)fail('Trade I allows Guns only with a Tribe, East Enemy Space, or Peace Space.');
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
   if(!['Food','Trade Goods'].includes(command.receive)&&!tradeGuns)fail('Trade may receive Food or Trade Goods; Guns require active Trade I.');
   const gunsStock=tradeGuns?s.pieces.find(q=>q.type==='Resource'&&q.subtype==='Guns'&&q.location==='reserve'):null;
   if(tradeGuns&&!gunsStock)fail('Trade I Guns must come from a physically recorded unused counter in stock.');
   if(s.tracks.movement<1)fail('Trade costs 1 movement point.');
   const apCost=louisianaGoods?0:!(peaceSpaceStatus(s,p.location).peace||p.location==='W'&&activeDevelopment(s,'20').length)&&give.subtype!=='Captives'?1:0;
   if(s.tracks.ap<apCost)fail('Trade requires 1 player AP for a non-Captives counter outside a Peace Space.');
   s.tracks.ap-=apCost;s.tracks.movement--;
   give.location='reserve';if(louisianaGoods)louisianaGoods.location=`held:${p.id}`;else if(tradeGuns)gunsStock.location=`held:${p.id}`;else createPiece(s,{type:'Resource',subtype:command.receive,label:command.receive,location:`held:${p.id}`});
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
   const priority=(s.setupDevelopmentPriority||[]).find(n=>draw.some(c=>String(c.identifier)===n));
   const c=priority?draw.find(c=>String(c.identifier)===priority):seededSelect(s,draw);
   if(priority)s.setupDevelopmentPriority=s.setupDevelopmentPriority.filter(n=>n!==priority);
   c.zone='In play';
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
  message=applyAmericanTraders(s);if(!s.developmentPending)s.americanTradersDoneIds=[...(s.americanTradersDoneIds||[]),c.id];break;
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
  preflightDiseaseBands(s,[band]);reduceBandForCard(s,band);s.developmentPending=null;markRecurringDisease(s,pending.cardId);
  message=`Smallpox: reduced ${band.id} in random space ${pending.space}; resolved end-Take-Actions effect.`;break;
 }
 case 'DEVELOPMENT_REVEAL':{
   if(s.phase==='setup'||s.phase==='gameover')fail('Development reveal is only available during play.');
   if(!['execution','cleanup'].includes(s.phase)||s.operation!=='Passage of Time')fail('Development cards are revealed in the Passage of Time procedure.');
   const c=s.cards.find(x=>x.id===command.id&&x.kind==='Development'&&x.zone==='Deck');
   if(!c)fail('Choose an undealt Development card from the current deck.');
   c.zone='In play';message=revealDevelopmentEffect(s,c);break;
 }
 case 'DEVELOPMENT_REGISTER_PHYSICAL_STOCK':{
   const pending=s.developmentPending;
   const spec={
    '19':{type:'Tribe',subtype:'',owner:'Neutral',label:'Tribe (physically verified)'},
    '23':{type:'Tribe',subtype:'',owner:'Neutral',label:'Tribe (physically verified)'},
    '45':{type:'Settlement',subtype:'East',owner:'East',label:'East Settlement (physically verified)'},
    '60':{type:'Resource',subtype:'Trade Goods',owner:'Neutral',label:'Trade Goods (physically verified)'}
   }[pending?.number];
   if(pending?.kind!=='physical-stock'||!spec)fail('No pending card requires physical stock reconciliation.');
   if(!command.ack)fail('Verify that the required unused counter physically exists before recording it.');
   const card=s.cards.find(c=>c.id===pending.cardId&&c.kind==='Development'&&['In play','Display'].includes(c.zone));
   if(!card||devNumber(card)!==pending.number)fail('The pending card is no longer available for resolution.');
   // Do not issue an unbounded inventory command: one authenticated physical
   // counter is entered, and only for the precise active card awaiting it.
   createPiece(s,{...spec,location:'reserve'});
   s.developmentPending=null;
   message=`Registered one physically verified ${spec.label}. `+(pending.number==='60'&&pending.context==='cleanup'?applyAmericanTraders(s):revealDevelopmentEffect(s,card));
   if(pending.number==='60'&&pending.context==='cleanup'&&!s.developmentPending)s.americanTradersDoneIds=[...(s.americanTradersDoneIds||[]),card.id];
   if(s.developmentPending)message+=' Resolve any remaining required choice before progressing.';
   quality='manual';break;
 }
 case 'DEVELOPMENT_REGISTER_TEXAS_STOCK':{
   const pending=s.developmentPending;
   if(pending?.kind!=='texas-stock'||pending.number!=='51')fail('No unresolved Texas Independence physical Settlement stock.');
   if(!command.ack)fail('Confirm that one available East Settlement counter exists in your physical game before recording it.');
   const card=s.cards.find(c=>c.id===pending.cardId&&c.kind==='Development'&&['In play','Display'].includes(c.zone));
   if(!card)fail('The pending Texas Independence card is no longer face-up.');
   createPiece(s,{type:'Settlement',owner:'East',subtype:'East',label:'East Settlement (physically verified)',location:'reserve'});
   s.developmentPending=null;
   message='Physically confirmed one East Settlement in stock. '+revealDevelopmentEffect(s,card);
   if(s.developmentPending)message+=' Further printed stacking decisions are required.';
   quality='manual';break;
 }
 case 'DEVELOPMENT_CONFIRM_EFFECT':{
   const pending=s.developmentPending;
   if(!pending||pending.cardId!==command.id)fail('No matching Development effect awaiting resolution.');
   if(['physical-stock','epidemic','smallpox-end','buffalo-hunters','horse-discard','texas-stock','nuevo-apacheria','cuerno-medicine','quanah-medicine','kiowa-alliance'].includes(pending.kind))fail('Use the dedicated printed Development effect resolver; an acknowledgement cannot bypass required counter choices.');
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
   if(!['08','09','10','11','13','15','16','17','18','28','32','35','36','39','40','42','54','59'].includes(number))fail('This card has no independently verified hand action.');
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
   for(let i=0;i<2;i++){
     const target=tribes[ids.length===1?0:i];
     if(target.location==='reserve')continue; // Fourth Ravaged already removed this target.
     const location=target.location;
     stock[i].location=location;
     // Tactics I removes a Tribe immediately when the fourth Ravaged
     // counter is placed, irrespective of the action that placed it.
     if(cultureActive(s,'C21')){
       const markers=s.pieces.filter(p=>p.subtype==='Ravaged'&&p.location===location);
       if(markers.length>=4){
         target.location='reserve';
         for(const marker of markers)marker.location='reserve';
       }
     }
   }
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
     // D02 says 'any map space', but does not waive the ordinary counter
     // stacking restrictions. Check the complete printed stacking class,
     // including Rancherías, Tribes and Settlements, not just other Bands.
     if(s.pieces.some(p=>p.location===to&&
       (SPACE[to].type==='round'?['Band','Rancheria','Tribe','Settlement']:['Band','Rancheria']).includes(p.type)))
       fail('Ute Alliance Band would violate the map-space stacking rule.');
     stock[0].location=to;stock[0].finished=false;
     message=`Ute Alliance: deployed available strength-3 Band to ${to}.`;
   }else{
     // Printed D02 requires a die roll. A caller must not choose a desired
     // result through the command or the UI; the saved seeded die is authoritative.
     if(command.die!==undefined)fail('Ute Alliance uses a digital die; supplied die results are not accepted.');
     const roll=rollSeededDie(s.rng.seed);s.rng.seed=roll.seed;s.rng.rolls++;
     const die=roll.face;
     if(s.developmentUte)fail('A previous Ute Alliance result is still unresolved.');
     s.developmentUte={cardId:c.id,die,rerolled:false};
     message=`Ute Alliance rolled ${die}: ${die<=2?'no removal':'may remove one Tribe or Settlement'}. Resolve the digital die before playing further actions; held Counting Coup may cancel this roll.`;
   }
   c.zone='Discard';break;
 }
 case 'DEVELOPMENT_COUNTING_COUP_UTE_REROLL':{
   const pending=s.developmentUte;
   if(!pending||pending.rerolled)fail('No eligible unresolved Ute Alliance die remains to reroll.');
   const cc=s.cards.find(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Hand');
   if(!cc)fail('Counting Coup must be in hand to cancel this die roll.');
   const previous=pending.die,roll=rollSeededDie(s.rng.seed);
   s.rng.seed=roll.seed;s.rng.rolls++;pending.die=roll.face;pending.rerolled=true;
   cc.zone='Discard';
   message=`Counting Coup cancelled Ute Alliance die ${previous}; replacement ${roll.face}. Counting Coup discarded; resolve the replacement result.`;break;
 }
 case 'DEVELOPMENT_UTE_RESOLVE':{
   const pending=s.developmentUte;
   if(!pending)fail('No unresolved Ute Alliance die result exists.');
   const targetId=String(command.targetId||'');
   if(pending.die<=2){
     if(targetId)fail('A Ute Alliance roll of 1–2 cannot remove a Tribe or Settlement.');
     message=`Ute Alliance die ${pending.die}: no removal; completed.`;
   }else if(targetId){
     const target=s.pieces.find(p=>p.id===targetId&&['Tribe','Settlement'].includes(p.type)&&SPACE[p.location]);
     if(!target)fail('Choose an in-play Tribe or Settlement, or decline the optional removal.');
     const targetSpace=target.location;
     target.location='reserve';
     const ravaged=s.pieces.filter(p=>p.type==='Marker'&&p.subtype==='Ravaged'&&p.location===targetSpace);
     for(const marker of ravaged)marker.location='reserve';
     message=`Ute Alliance die ${pending.die}: removed ${target.type} ${target.id}; returned ${ravaged.length} attached Ravaged marker(s) to stock; completed.`;
   }else message=`Ute Alliance die ${pending.die}: player declined optional Tribe/Settlement removal; completed.`;
   s.developmentUte=null;break;
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
 // Track D16's actual bonus MP consumption across subsequent actions.
 // Later MP gains (e.g. spending a Horse) restore ordinary MPs; they must not
 // disguise already spent Quality Mounts MPs or affect the discard threshold.
 if(original.qualityMounts && s.qualityMounts && original.qualityMounts.cardId===s.qualityMounts.cardId){
   const q=s.qualityMounts,delta=s.tracks.movement-original.tracks.movement;
   if(delta>0)q.baseRemaining+=delta;
   else if(delta<0){
     const spent=-delta,fromBase=Math.min(q.baseRemaining,spent);
     q.baseRemaining-=fromBase;q.bonusRemaining-=spent-fromBase;
     if(q.bonusRemaining<0)fail('Quality Mounts MP ledger was exhausted before this action.');
   }
 }
 // D01 is triggered after any *completed player action*, not only Raid/Hunt/Trade.
 // Keep multi-step START/DRAW actions out: their player action has not finished.
 const completedPlayerActions=new Set([
   'MOVE_BAND','HUNT','TRADE','RESOLVE_RAID','RAID_DIGITAL_REWARD',
   'DEVELOPMENT_PLAY_SIEGE','DEVELOPMENT_PLAY_UTE','DEVELOPMENT_UTE_RESOLVE',
   'DEVELOPMENT_MOUNTED_FINISH',
   'DEVELOPMENT_PLAY_FRENCH_TRADERS','DEVELOPMENT_PLAY_NEGOTIATION',
   'DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL','DEVELOPMENT_COUNTING_COUP_REROLL',
   'DEVELOPMENT_COUNTING_COUP_REDRAW','DEVELOPMENT_COUNTING_COUP_UTE_REROLL','DEVELOPMENT_COUNTING_COUP_MOUNTS_REROLL','DEVELOPMENT_QUALITY_MOUNTS_RESOLVE','DEVELOPMENT_PLAY_NO_RELIEF',
   'PLANNING_HEADMAN_ACTION',
   'CULTURE_LORDS_HARASS','CULTURE_TACTICS_SCOUT',
   'CULTURE_TACTICS_UNKNOWN_SCOUT','CULTURE_HUSBANDRY',
   'CULTURE_POLITICS_MOVE_ALLY','CULTURE_TRADE_FAIR',
   'CULTURE_LORDS_REVEAL'
 ]);
 if(completedPlayerActions.has(type)&&!(type==='DEVELOPMENT_PLAY_UTE'&&s.developmentUte)){
   const eliminated=applyApacheWar(s);
   if(eliminated)message+=` Apache War: eliminated ${eliminated} Tribe(s) with 3+ Ravaged markers.`;
 }
 if(activeDevelopment(s,'30').length&&s.cards.some(c=>c.kind==='Development'&&c.zone==='Hand'&&!original.cards.some(prior=>prior.id===c.id&&prior.zone==='Hand')))
   fail('Nuevo Apachería (#30) forbids bringing new Development cards into hand.');
 if(activeDevelopment(s,'49').length&&s.pieces.some(p=>p.subtype==='Guns'&&!['reserve','removed'].includes(p.location)))
  fail('Colt-Walker Revolver (#49) prohibits acquiring Guns while it remains in play.');
 if(s.phase!=='setup' && s.phase!=='gameover' && s.tracks.military===0 && s.tracks.culture===0){s.gameResult={outcome:'defeat',period:s.period,reason:'Military and Culture both zero',note:''};s.victoryPending=null;s.passageDevelopment=null;s.phase='gameover';s.operation=null;s.activeBandId=null;s.pending=null;s.enemyFlow=null;s.battlePending=null;s.battleContinuation=null;s.warMovement=null;s.successCheck=null;s.lastSuccessCheck=null;s.countermeasureWindow=null;s.qualityMountsPending=null;s.cleanupCupResult=null;s.raidCupResolution=null;s.cleanupFinishedPending=null;s.tracks.movement=0;message+=' GAME OVER: Military and Culture are both zero (2.11.1).';}
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
 s.passageRetiredIds??=[];s.passageProminentExemptIds??=[];s.passageQuanahExemptId??=null;s.passagePeaceRolls??={};s.passageBison??=null;s.passageDevelopment??=null;s.passageResult??=null;s.victoryPending??=null;s.gameResult??=s.phase==='gameover'?{outcome:'defeat',period:s.period,reason:'Historical defeat recorded in older save',note:''}:null;
 s.countermeasureWindow??=null;s.developmentPending??=null;s.developmentUte??=null;s.qualityMountsPending??=null;s.developmentPlanningApplied??=false;s.epidemicTakeActionsApplied??=false;s.greatHuntBandId??=null;
 s.battlePending??=null;s.battleContinuation??=null;s.battleRounds??=[];s.battleExemptions??={};s.warMovement??=null;s.enemyFlow??=null;s.mapReview??={};
 if(s.developmentMountedMove===undefined)s.developmentMountedMove=null;
 if(s.successCheck){s.successCheck.canceledDrawIds??=[];s.successCheck.gunAttempts??=[];s.successCheck.redraws??=0;}
 // Old auto-loaded tutorial bundle contained shortcuts absent from the uploaded actual board.
 // Preserve any player-entered links, but quarantine those machine-authored errors.
 const disproved=new Set(['RR-3|RR-5','LE-6|RR-3']);
 const removed=(s.edges||[]).filter(e=>disproved.has([e.a,e.b].sort().join('|'))&&e.source==='GMT-playbook'&&!e.verifiedByPlayer);
 if(removed.length){s.edges=s.edges.filter(e=>!removed.includes(e));s.mapReview={};s.setupNote=(s.setupNote||'')+' MAP CORRECTION: two old machine-supplied shortcut lines were removed because the photographed actual board does not join those spaces. Reapply the updated board-photo map evidence.';}
 for(const c of s.cards||[]){c.evidenceStatus??='unverified';c.sourceReference??='';}
 s.planningEnemyChoice??=null;s.raidCupResolution??=null;
 // Legacy v0.84 saves may contain an Instruction drawn before the new
 // §6.2.2.C resolver existed. Resume at its original unresolved effect;
 // never assume that the printed procedure or display exchange happened.
 if(s.cleanupCupResult?.kind==='instruction'&&s.cleanupCupResult.stage===undefined){
   Object.assign(s.cleanupCupResult,{stage:'effect',effectDone:false,swapDie:null,swapRow:null});
 }
 s.version=VERSION;
 basicIntegrity(s);return s;
}
export function basicIntegrity(s){
 if(s?.setupDevelopmentPendingDie!==undefined&&s.setupDevelopmentPendingDie!==null){
  const p=s.setupDevelopmentPendingDie;
  if(s.phase!=='setup'||s.scenario!=='downfall'||s.setupTemplate!=='official'||
     !Number.isInteger(p.initialSeed)||p.initialSeed<0||p.initialSeed>0xffffffff||
     ![0,1].includes(p.rerolls)||!Array.isArray(p.dice)||p.dice.length!==p.rerolls+1||
     p.dice.some(n=>!Number.isInteger(n)||n<1||n>6)||p.die!==p.dice.at(-1)||s.setupDevelopmentRoll)fail('Invalid saved Downfall Development die stage.');
  let seed=p.initialSeed;
  for(const face of p.dice){const r=rollSeededDie(seed);seed=r.seed;if(r.face!==face)fail('Downfall staged Development die differs from original saved seed.');}
  if(seed!==s.rng.seed)fail('Staged Downfall Development roll has an inconsistent RNG state.');
 }
 if(s?.setupBisonRolls!==undefined){
  const rolls=s.setupBisonRolls;
  if(rolls.length){
   if(!Number.isInteger(s.setupBisonStartSeed)||s.setupBisonStartSeed<0||s.setupBisonStartSeed>0xffffffff)fail('Invalid Downfall opening die seed.');
   let seed=s.setupBisonStartSeed;
   const occupied=new Set([...DOWNFALL_TRIBES,...DOWNFALL_SETTLEMENTS.map(([loc])=>loc)]);
   let accepted=0;
   for(const record of rolls){
    const a=rollSeededDie(seed);seed=a.seed;
    const b=rollSeededDie(seed);seed=b.seed;
    if(record.territoryDie!==a.face||record.areaDie!==b.face||record.accepted===occupied.has(record.space)||accepted===9)fail('Saved Downfall Bison draws do not match the original digital dice and stacking rules.');
    if(record.accepted){occupied.add(record.space);accepted++;}
   }
  }
  if(!Array.isArray(rolls)||rolls.length>1024||s.scenario!=='downfall'||s.setupTemplate!=='official'||
     rolls.some(r=>!r||!Number.isInteger(r.territoryDie)||r.territoryDie<1||r.territoryDie>6||
       !Number.isInteger(r.areaDie)||r.areaDie<1||r.areaDie>6||r.space!==`${TERRITORY_DIE_ORDER[r.territoryDie-1]}-${r.areaDie}`||typeof r.accepted!=='boolean')||
     (rolls.length>0&&(!s.setupConfirmed?.bison||rolls.filter(r=>r.accepted).length!==9||
       new Set(rolls.filter(r=>r.accepted).map(r=>r.space)).size!==9||
       (s.phase==='setup'&&!s.setupDevelopmentRoll&&s.pieces.filter(p=>p.id.startsWith('setup-downfall-bison-')).some((p,i)=>p.location!==rolls.filter(r=>r.accepted)[i]?.space)))))
     fail('Invalid saved Downfall digital Bison die ledger.');
 }
 if(s.planningEnemyChoice!==undefined&&s.planningEnemyChoice!==null&&(!ENEMY_COLUMNS.includes(s.planningEnemyChoice)||s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==8||!Number.isInteger(s.planningEnemyDie)||s.planningEnemyDie<1||s.planningEnemyDie>6))fail('Invalid saved Planning Enemy confirmation.');
 if(s.planningEnemyDie!==undefined&&s.planningEnemyDie!==null&&(!Number.isInteger(s.planningEnemyDie)||s.planningEnemyDie<1||s.planningEnemyDie>6||s.phase!=='execution'||s.operation!=='Planning'||s.planningStage!==8))fail('Invalid saved Planning Enemy die.');
 if(s?.countermeasureWindow!==null&&s?.countermeasureWindow!==undefined){
  const w=s.countermeasureWindow;
  if(!w||s.phase!=='execution'||s.operation!=='Take Actions'||typeof w.bandId!=='string'||!s.pieces.some(p=>p.id===w.bandId&&p.type==='Band'&&p.finished)||!['W07','W08','W18','W19','W20','W21','W24'].includes(w.cardId)||String(activeWarCard(s)?.identifier||'').toUpperCase()!==w.cardId||!warCountermeasureOptions(s,w.bandId).length)fail('Invalid pending post-Finish countermeasure.');
 }

 if(s?.passageRetiredIds!==undefined){
  if(!Array.isArray(s.passageRetiredIds)||s.passageRetiredIds.length>5||new Set(s.passageRetiredIds).size!==s.passageRetiredIds.length||s.passageRetiredIds.some(id=>!s.pieces.some(p=>p.id===id&&p.type==='Mahimiana')))fail('Invalid saved Mahimiana retirement ledger.');
 }
 if(s?.passageProminentExemptIds!==undefined){
  if(!Array.isArray(s.passageProminentExemptIds)||s.passageProminentExemptIds.length>5||new Set(s.passageProminentExemptIds).size!==s.passageProminentExemptIds.length||s.passageProminentExemptIds.some(id=>!s.pieces.some(p=>p.id===id&&['Paraibo','Mahimiana'].includes(p.type))))fail('Invalid Prominent Headman exemption ledger.');
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
   if(['payment','effect'].includes(f.stage)&&(!s.pieces.some(p=>p.id===f.currentId&&p.type==='Instruction'&&p.location===(f.allyResolved?f.allyResolved.location:f.peaceResolved?f.peaceResolved.square:f.peaceWarResolved?`enemy-inactive:${f.currentRow}`:f.warRaidResolved?(['form-war','form-raid'].includes(f.warRaidResolved.mode)?s.pieces.find(w=>w.id===f.warRaidResolved.warId)?.location:`enemy-inactive:${f.currentRow}`):`enemy-display:${f.enemy}:${f.currentRow}`))||!DISPLAY_ROWS.includes(f.currentRow)))fail('Pending Enemy Instruction no longer matches the display.');
   if(f.recoverResolved){const r=f.recoverResolved;
    if(f.stage!=='effect'||typeof r.ravagedId!=='string'||!SPACE[r.location]||!Number.isInteger(r.die)||r.die<1||r.die>6||typeof r.success!=='boolean'||typeof r.criterion!=='string'||r.criterion.length<12||r.criterion.length>240||typeof r.randomConfirmed!=='boolean'||!s.pieces.some(p=>p.id===r.ravagedId&&p.type==='Marker'&&p.subtype==='Ravaged'&&p.location===(r.success?'reserve':r.location)))fail('Invalid pending Recover resolution.');
   }

   if(f.subjugateResolved){const r=f.subjugateResolved;
    if(f.stage!=='effect'||!['West','South','East'].includes(r.enemy)||r.enemy!==f.enemy||typeof r.tribeId!=='string'||SPACE[r.location]?.type!=='round'||typeof r.randomConfirmed!=='boolean'||typeof r.unmappedRouteConfirmed!=='boolean'||typeof r.mapVerification!=='string'||r.mapVerification.length<25||r.mapVerification.length>400||!(r.origin===null||r.enemy==='East'&&['E1','E2'].includes(r.origin))||!(r.recordedDistance===null||Number.isInteger(r.recordedDistance)&&r.recordedDistance>=1&&r.recordedDistance<=43)||!s.pieces.some(p=>p.id===r.tribeId&&p.type==='Tribe'&&p.location==='reserve'))fail('Invalid pending Subjugate resolution.');
   }
   if(f.settleResolved){const r=f.settleResolved;
    if(f.stage!=='effect'||!['West','South','East'].includes(r.enemy)||r.enemy!==f.enemy||typeof r.settlementId!=='string'||SPACE[r.space]?.type!=='round'||typeof r.randomConfirmed!=='boolean'||typeof r.unmappedRouteConfirmed!=='boolean'||typeof r.mapVerification!=='string'||r.mapVerification.length<25||r.mapVerification.length>400||!(r.origin===null||r.enemy==='East'&&['E1','E2'].includes(r.origin))||!(r.recordedDistance===null||Number.isInteger(r.recordedDistance)&&r.recordedDistance>=1&&r.recordedDistance<=43)||!Array.isArray(r.bisonIds)||r.bisonIds.length>30||new Set(r.bisonIds).size!==r.bisonIds.length||!s.pieces.some(p=>p.id===r.settlementId&&p.type==='Settlement'&&p.location===r.space)||r.bisonIds.some(id=>!s.pieces.some(p=>p.id===id&&p.type==='Bison'&&p.location==='reserve')))fail('Invalid pending Settle resolution.');
   }
   if(f.warRaidResolved){
     const r=f.warRaidResolved;
     if(f.stage!=='effect'||r.instructionId!==f.currentId||r.originalRow!==f.currentRow||r.enemy!==f.enemy||!['engaged','advance','peace-ends-war','form-war','form-raid'].includes(r.mode)||typeof r.result!=='string'||r.result.length>950||!s.pieces.some(p=>p.id===r.instructionId&&p.type==='Instruction'&&p.location===(['form-war','form-raid'].includes(r.mode)?s.pieces.find(w=>w.id===r.warId)?.location:`enemy-inactive:${f.currentRow}`)))fail('Invalid saved War/Raid resolution.');
   }
   if(f.peaceWarResolved){
     const r=f.peaceWarResolved;
     if(f.stage!=='effect'||r.instructionId!==f.currentId||r.originalRow!==f.currentRow||r.enemy!==f.enemy||!['engaged','war-ends','advance','no-targets'].includes(r.mode)||typeof r.warId!=='string'||!SPACE[r.from]||typeof r.movement!=='string'||r.movement.length>500||!s.pieces.some(p=>p.id===r.instructionId&&p.type==='Instruction'&&p.location===`enemy-inactive:${f.currentRow}`)||
      (r.mode==='advance'&&(!SPACE[r.to]||!r.attrition||!Number.isInteger(r.attrition.die)||r.attrition.die<1||r.attrition.die>6||typeof r.attrition.loss!=='boolean'))||
      (r.mode==='no-targets'&&(r.to!==null||r.attrition!==null&&(!Number.isInteger(r.attrition.die)||r.attrition.die<1||r.attrition.die>6||typeof r.attrition.loss!=='boolean')))||
      (['engaged','war-ends'].includes(r.mode)&&(r.to!==null||r.attrition!==null)))fail('Invalid saved Peace War Column resolution.');
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
       !(h.redirectedFrom===null||h.redirectedFrom==='Encroach'||h.redirectedFrom==='Raid')||!(h.bisonId===null||typeof h.bisonId==='string'&&s.pieces.some(p=>p.id===h.bisonId&&p.type==='Bison'&&p.location==='reserve')))
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
   if([f.recoverResolved,f.subjugateResolved,f.settleResolved,f.cultureAttackResolved,f.huntResolved,f.encroachResolved,f.allyResolved,f.peaceResolved,f.warRaidResolved,f.cardNoEffectResolved].filter(Boolean).length>1)fail('Cannot resolve multiple Enemy effect outcomes for the same Instruction.');
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
 if(s.cleanupFinishedRolls!==undefined){
   if(!Array.isArray(s.cleanupFinishedRolls)||s.cleanupFinishedRolls.length>10||s.cleanupFinishedRolls.some(x=>!s.pieces.some(p=>p.id===x.id&&p.type==='Rancheria')||!Number.isInteger(x.die)||x.die<1||x.die>6||!Number.isInteger(x.count)||x.count<1||x.count>20||x.triggered!==(x.die<=x.count)))fail('Invalid saved Cleanup Ranchería rolls.');
 }
 if(s.cleanupFinishedPending){
   const f=s.cleanupFinishedPending;
   if(s.phase!=='cleanup'||!s.cleanupFinishedRolls?.some(x=>x.id===f.id&&x.triggered)||!(f.die===null&&cultureActive(s,'C24')&&!f.enemy&&!f.started||Number.isInteger(f.die)&&f.die>=1&&f.die<=6)||!Number.isInteger(f.triggerDie)||f.triggerDie<1||f.triggerDie>6||!(f.enemy===null||ENEMY_COLUMNS.includes(f.enemy))||typeof f.started!=='boolean'||f.started&&!Number.isInteger(f.startLog))fail('Invalid pending Cleanup free Enemy procedure.');
 }
 if(s.raidCupResolution){
   const c=s.raidCupResolution;
   if(s.pending?.type!=='raid'||s.successCheck||!s.lastSuccessCheck||!['effect','swap'].includes(c.stage)||typeof c.effectDone!=='boolean'||!Array.isArray(c.remainingIds)||!c.remainingIds.length||c.remainingIds.length>25||c.remainingIds[0]!==c.counterId||new Set(c.remainingIds).size!==c.remainingIds.length||!(c.swapDie===null||Number.isInteger(c.swapDie)&&c.swapDie>=1&&c.swapDie<=6)||!(c.swapRow===null||DISPLAY_ROWS.includes(c.swapRow))||c.stage==='swap'&&!c.effectDone)fail('Invalid saved Raid Instruction procedure.');
   for(const id of c.remainingIds){const p=s.pieces.find(x=>x.id===id);if(!p||p.type!=='Instruction'||!ENEMY_COLUMNS.includes(p.owner)||p.location!=='enemy-resolution'&&!SPACE[p.location])fail('Invalid staged Raid Instruction counter.');}
 }
 if(s.cleanupCupResult){
   const c=s.cleanupCupResult;
   if(s.phase!=='cleanup'||s.steps.cl3==='done'||!['success','enemy-ap','instruction'].includes(c.kind)||!s.pieces.some(p=>p.id===c.counterId)||!(c.die===null||Number.isInteger(c.die)&&c.die>=1&&c.die<=6)||!(c.enemy===null||ENEMY_COLUMNS.includes(c.enemy))||typeof c.started!=='boolean'||c.started&&!Number.isInteger(c.startLog))fail('Invalid saved Cleanup cup procedure.');
   if(c.kind==='instruction'){
     if(!['effect','swap','paid'].includes(c.stage)||typeof c.effectDone!=='boolean'||!(c.swapDie===null||Number.isInteger(c.swapDie)&&c.swapDie>=1&&c.swapDie<=6)||!(c.swapRow===null||DISPLAY_ROWS.includes(c.swapRow)))fail('Invalid drawn Instruction resolution stage.');
     const drawn=s.pieces.find(p=>p.id===c.counterId);
     if(!drawn||drawn.type!=='Instruction'||!ENEMY_COLUMNS.includes(drawn.owner)||c.stage==='effect'&&drawn.location!=='enemy-resolution'&&!SPACE[drawn.location]||c.stage==='swap'&&!c.effectDone||c.stage==='paid'&&(!c.effectDone||!c.swapRow||drawn.location==='enemy-resolution'))fail('Drawn Instruction or exchange state is inconsistent.');
   }
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
   if(p.hiddenSubtype!==undefined&&(p.type!=='Marker'||p.subtype!=='?'||p.faceDown!==true||!/^(Success|Enemy AP [234])$/.test(String(p.hiddenSubtype))))fail('Invalid privately recorded hidden marker identity.');
   if(typeof p.location!=='string'||p.location.length>150)fail('Invalid piece location in save.');
   bounded(p.strength??0,0,20,'Strength');bounded(p.mpRating??4,0,20,'Movement rating');
 }
 const validBase=new Set([...SPACES.map(x=>x.id),'reserve','removed','operations','cup','enemy-display','hand','deck','check-draw','success-out','available-enemy-aps','enemy-resolution']);
 for(const p of s.pieces){
   const loc=p.location;
   if(validBase.has(loc)||/^enemy-display:(West|South|East|North):[A-F]$/.test(loc)||/^enemy-inactive:[A-F]$/.test(loc))continue;
   if(loc.startsWith('box:') && s.pieces.some(x=>x.id===loc.slice(4)&&x.type==='Rancheria'&&x.location!=='removed'))continue;
   if(loc.startsWith('held:') && p.type!=='Band'&&s.pieces.some(x=>x.id===loc.slice(5)&&x.type==='Band'&&x.location!=='removed'))continue;
   if(loc.startsWith('medicine:') && p.subtype==='Success'&&sHasHeadman(s,loc.slice(9)))continue;
   fail(`Invalid piece location in save: ${loc}.`);
 }
 if(s.warMovementDrawn!==undefined&&s.warMovementDrawn!==null&&!warCard(s.warMovementDrawn))fail('Invalid War movement draw record.');
 if(s.warEventResolved!==undefined&&s.warEventResolved!==null&&!warCard(s.warEventResolved))fail('Invalid resolved War Card marker.');
 if(s.warHigherStakesResolved!==undefined&&typeof s.warHigherStakesResolved!=='boolean')fail('Invalid Higher Stakes completion marker.');
 if(s.passageDevelopment!==undefined&&s.passageDevelopment!==null){
  const d=s.passageDevelopment;
  if(!d||s.phase!=='execution'||s.operation!=='Passage of Time'||!['discard','reveal'].includes(d.stage)||
    !Array.isArray(d.queue)||d.queue.length>3||new Set(d.queue).size!==d.queue.length||
    d.queue.some(id=>!s.cards.some(c=>c.kind==='Development'&&c.id===id))||
    !Number.isInteger(d.refillTarget)||d.refillTarget<0||d.refillTarget>3||
    !Number.isInteger(d.refilled)||d.refilled<0||d.refilled>d.refillTarget||s.steps.pt13==='done')
    fail('Invalid in-progress Development display procedure.');
 }
 if(s.developmentPending!==undefined&&s.developmentPending!==null){
  const p=s.developmentPending;
  if(!p||typeof p.cardId!=='string'||!s.cards.some(c=>c.id===p.cardId&&c.kind==='Development'&&(['In play','Display'].includes(c.zone)||p.kind==='horse-discard'&&c.zone==='Discard'))||typeof p.reason!=='string'||p.reason.length>200)fail('Invalid pending Development card effect.');
 }
 if(s.epidemicTakeActionsApplied!==undefined&&typeof s.epidemicTakeActionsApplied!=='boolean')fail('Invalid Epidemic operation ledger.');
 if(s.developmentPlanningApplied!==undefined&&typeof s.developmentPlanningApplied!=='boolean')fail('Invalid Planning development-effect ledger.');
 if(s.greatHuntBandId!==undefined&&s.greatHuntBandId!==null&&(!s.pieces.some(p=>p.id===s.greatHuntBandId&&p.type==='Band')||s.activeBandId!==s.greatHuntBandId))fail('Invalid Great Hunt active Band.');
 if(s.warDeckPeekId!=null&&!s.cards.some(c=>c.kind==='War'&&c.id===s.warDeckPeekId&&c.zone==='Deck'))fail('Invalid saved scouted War Card.');
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
 if(s.qualityMounts){
  const q=s.qualityMounts;
  if(!s.activeBandId||q.bandId!==s.activeBandId||!s.cards.some(c=>c.id===q.cardId&&devNumber(c)==='16'&&c.zone==='Hand')||!Number.isInteger(q.bonus)||q.bonus<1||q.bonus>6||!Number.isInteger(q.baseRemaining)||q.baseRemaining<0||!Number.isInteger(q.bonusRemaining)||q.bonusRemaining<0||q.bonusRemaining>q.bonus||q.baseRemaining+q.bonusRemaining!==s.tracks.movement)fail('Invalid Quality Mounts MP spending ledger in save.');
 }
 if(s.qualityMountsPending){
  const q=s.qualityMountsPending;
  if(s.phase!=='execution'||s.operation!=='Take Actions'||s.activeBandId||!q||!Number.isInteger(q.bonus)||q.bonus<1||q.bonus>6||!Number.isInteger(q.bonusUsed)||q.bonusUsed<0||q.bonusUsed>q.bonus||!Number.isInteger(q.die)||q.die<1||q.die>6||typeof q.rerolled!=='boolean'||!s.pieces.some(p=>p.id===q.bandId&&p.type==='Band'&&p.finished)||!s.cards.some(c=>c.id===q.cardId&&c.kind==='Development'&&devNumber(c)==='16'&&c.zone==='Hand')||q.rerolled&&!s.cards.some(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Discard'))fail('Invalid pending Quality Mounts finish die in save.');
 }
 if(s.developmentUte){
  const u=s.developmentUte;
  if(s.phase==='setup'||s.phase==='gameover'||!u||!Number.isInteger(u.die)||u.die<1||u.die>6||typeof u.rerolled!=='boolean'||!s.cards.some(c=>c.id===u.cardId&&c.kind==='Development'&&devNumber(c)==='02'&&c.zone==='Discard')||u.rerolled&&!s.cards.some(c=>c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Discard'))fail('Invalid unresolved Ute Alliance die in save.');
 }
 if(s.pending && (s.pending.type!=='raid'||!s.pieces.some(p=>p.id===s.pending.bandId&&p.type==='Band')))fail('Invalid pending procedure in save.');
 if(s.developmentMountedMove){
  const m=s.developmentMountedMove;
  if(s.phase!=='execution'||!m||typeof m!=='object'||!m.allowance||!m.moves||!m.transit||!s.cards.some(c=>c.kind==='Development'&&devNumber(c)==='08'&&c.zone==='Discard'))fail('Invalid Mounted Society movement in saved game.');
  for(const [id,n] of Object.entries(m.allowance))if(!s.pieces.some(p=>p.id===id&&p.type==='Rancheria'&&SPACE[p.location])||!Number.isInteger(n)||n<0||n>30||!Number.isInteger(m.moves[id]||0)||(m.moves[id]||0)>n||typeof(m.transit[id]??false)!=='boolean')fail('Invalid Mounted Society allowance or route history.');
 }
 if(s.successCheck){
  const c=s.successCheck;
  if(!s.pending||s.pending.type!=='raid'||c.bandId!==s.pending.bandId||!Number.isInteger(c.expected)||c.expected<0||c.expected>25||!Number.isInteger(c.base)||!Number.isInteger(c.bonus)||c.expected!==c.base+c.bonus+(c.shieldBonus||0)+(c.warfareExtra?1:0)||typeof (c.warfareExtra??false)!=='boolean'||!Number.isInteger(c.shieldBonus??0)||(c.shieldBonus??0)<0||(c.shieldBonus??0)>1||!Array.isArray(c.drawIds)||c.drawIds.length>c.expected||new Set(c.drawIds).size!==c.drawIds.length||c.mahimianaId&&!sHasMahimiana(s,c.mahimianaId))fail('Invalid pending Success Check in save.');
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
   if(r.countingCoupReroll){
    const x=r.countingCoupReroll;
    if(!x||!Number.isInteger(x.dieIndex)||x.dieIndex<0||x.dieIndex>=r.dice.length||!Number.isInteger(x.previous)||x.previous<1||x.previous>6||!Number.isInteger(x.replacement)||x.replacement<1||x.replacement>6||r.dice[x.dieIndex]!==x.replacement||!s.cards.some(c=>c.id===x.cardId&&c.kind==='Development'&&devNumber(c)==='09'&&c.zone==='Discard'))fail('Invalid Counting Coup Battle reroll in saved game.');
   }
 }
 if(s.battleContinuation&&(!s.pieces.some(p=>p.id===s.battleContinuation.warId&&p.type==='War Column')||!SPACE[s.battleContinuation.warLocation]))fail('Invalid ongoing Battle reference.');
 if(s.battleContinuation?.paidDefense && (!s.battleContinuation.rancheriaId || !s.pieces.some(p=>p.type==='Rancheria'&&p.id===s.battleContinuation.rancheriaId&&p.location===s.battleContinuation.warLocation) || !s.pieces.some(p=>p.type==='War Column'&&p.id===s.battleContinuation.warId&&p.location===s.battleContinuation.warLocation)))fail('Invalid paid Ranchería defence reference.');
 for(const [id,reason] of Object.entries(s.battleExemptions)){if(!/^[-A-Za-z0-9_]{1,100}$/.test(id)||typeof reason!=='string'||reason.length<15||reason.length>300||!s.pieces.some(p=>p.id===id&&p.type==='War Column'))fail('Invalid documented Battle exception.');}
 if(s.battleRounds&&(!Array.isArray(s.battleRounds)||s.battleRounds.length>100||s.battleRounds.some(r=>!r||!Array.isArray(r.dice)||typeof r.note!=='string'||typeof r.won!=='boolean')))fail('Invalid Battle journal.');
 if(s.pieces.some(p=>p.location==='check-draw'&&!s.successCheck?.drawIds.includes(p.id)))fail('Orphaned staged Success Check counter.');
 if(s.lastSuccessCheck && (!s.pending||!Number.isInteger(s.lastSuccessCheck.successes)||s.lastSuccessCheck.successes<0||s.lastSuccessCheck.bandId!==s.pending.bandId))fail('Invalid last Success Check result.');
 return true;
}
