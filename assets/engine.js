/**
 * Comanchería tabletop companion — intentionally partial, versioned rules engine.
 * No GMT imagery or card text is redistributed. Source: Spring 2024 Living Rules.
 * A validated command is NOT a claim of full rules compliance. See README.
 */
export const VERSION = '0.1.0';
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
export const ENEMIES = ['North','West','South','East','Spain','Mexico','Texas','USA','None'];
export const OPERATIONS = ['Take Actions','Culture','Planning','Passage of Time'];
export const PHASES = ['setup','war','selection','execution','cleanup','gameover'];

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
      ['Resolve current History Card and start-of-operation effects',
       'Resolve effects for the current period', 'Resolve player-side changes',
       'Resolve card and counter effects', 'Apply required resource changes',
       'Resolve remaining period effects', 'Update in-play pieces',
       'Resolve Success Check cup changes', 'Assign resources from Operations track',
       'Remove Ravaged Tribes/Settlements and clear Ravaged markers',
       'Test existing Peace and Ally counters', 'Place Bison for eligible slots',
       'Discard/refill Development display and resolve card effects',
       'Optionally purchase one Culture Card', 'Reset Operations; check Victory Check / Passage marker'][i]),`4.4 step ${i+1}`])
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
const hasRavaged = (s,loc)=>s.pieces.some(p=>p.location===loc && p.subtype==='Ravaged');
const held = (s,bandId,subtype)=>s.pieces.filter(p=>p.location===`held:${bandId}` && (p.subtype===subtype || (!subtype))); 
const boxExists = (s,id)=>s.pieces.some(p=>p.id===id && p.type==='Rancheria' && p.location!=='removed');
const activeBand = s=>s.activeBandId && s.pieces.find(p=>p.id===s.activeBandId);
const asArray = list => Array.isArray(list) ? list : [];
const regular = s => s.phase!=='setup' && s.phase!=='gameover';

export function newGame(scenario='plains',demo=false){
 if(!SCENARIOS.some(s=>s[0]===scenario))fail('Unknown scenario.');
 const game={schema:1,version:VERSION,scenario,period:scenario==='downfall'?3:1,phase:'setup',operation:null,
   tracks:{military:0,culture:0,ap:0,enemyAp:0,movement:0,operations:0,passage:0},mustPassage:false,
   activeBandId:null,steps:{},pieces:[],cards:[],edges:[],pending:null,revision:0,
   log:[],createdAt:new Date().toISOString(),setupNote:'Scenario setups are NOT automatically populated. Copy your physical board.',
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
 return game;
}
function validateLocation(state,location,selfId){
 if(isMap(location)||location==='reserve'||location==='removed'||location==='operations'||location==='cup'||location==='enemy-display'||location==='hand'||location==='deck')return;
 if(location.startsWith('box:')&&!(!exists(state,location.slice(4))|| !boxExists(state,location.slice(4))))return;
 if(location.startsWith('held:') && exists(state,location.slice(5)) && item(state,location.slice(5)).type==='Band' && location.slice(5)!==selfId)return;
 fail('Invalid location / container. Select a board space, an existing Ranchería box, a Band, or stock.');
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
 if(state.phase==='cleanup')warnings.push(...getStackingProblems(state).map(x=>x.message));
 return warnings;
}
export function requiredPassage(s){return s.mustPassage || !s.pieces.some(p=>p.type==='Band'&&isInPlay(p));}
export function checklist(s){return CHECKLIST[s.phase==='execution'?s.operation:s.phase] || [];}
export function allChecksDone(s){return checklist(s).every(([key])=>['done','na'].includes(s.steps[key]));}
export function safeNext(s){
 if(s.pending)return {ok:false,message:'Resolve the pending action first.'};
 if(s.phase==='war' || s.phase==='execution'||s.phase==='cleanup'){
   if(!allChecksDone(s))return {ok:false,message:'Complete or mark N/A every procedure checkpoint first.'};
   if(s.phase==='cleanup'&&getStackingProblems(s).length)return {ok:false,message:'Resolve every stacking conflict before cleanup can finish.'};
 }
 if(s.phase==='execution'&&s.activeBandId)return {ok:false,message:'Finish the active Band before leaving the operation.'};
 if(s.phase==='selection'&&!s.operation)return {ok:false,message:'Choose an operation first.'};
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
 if(p.location==='removed')fail('This counter was removed from the GAME and cannot return to play. Use a separate replacement counter if appropriate.');
 if(location==='removed'){
   const children=s.pieces.filter(q=>q.location===`held:${p.id}`||q.location===`box:${p.id}`);
   if(children.length)fail('First move or remove the counters contained by this piece.');
 }
 if(p.id===s.activeBandId&&location==='reserve')fail('Finish the active Band before returning it to stock.');
 const prev=p.location;p.location=location;return `${named(p)}: ${formatLocation(s,prev)} → ${formatLocation(s,location)}`;
}
export function formatLocation(s,loc){
 if(SPACE[loc])return SPACE[loc].name;
 if(loc?.startsWith('box:'))return `Resources box — ${s.pieces.find(x=>x.id===loc.slice(4))?.label||loc.slice(4)}`;
 if(loc?.startsWith('held:'))return `Possessed by ${s.pieces.find(x=>x.id===loc.slice(5))?.label||loc.slice(5)}`;
 return ({reserve:'Out of play / stock',removed:'Removed from game',operations:'Operations track',cup:'Draw cup',hand:'Player hand',deck:'Deck','enemy-display':'Enemy instruction display'})[loc]||loc;
}
function logIt(s,description,quality,command){
 s.revision+=1;s.quality[quality==='verified'?'verified':'manual']++;
 s.log.unshift({seq:s.revision,description,quality,command,date:new Date().toISOString()});
 if(s.log.length>500)s.log.length=500;
}
export function perform(original,command){
 const s=clone(original);const {type}=command;let message='';let quality='verified';
 if(s.pending && !['RESOLVE_RAID','CANCEL_RAID','NOTE'].includes(type))fail('Finish or cancel the unresolved Raid before doing anything else.');
 switch(type){
 case 'START':{
   if(s.phase!=='setup')fail('Game has already been started.');
   if(s.tracks.military===0 && s.tracks.culture===0)fail('Starting with 0 Military and 0 Culture would be immediate defeat. Enter the physical setup tracks first.');
   s.phase='war';s.steps={};message='Started tracking game. Confirm physical scenario setup matches.';quality='manual';break;}
 case 'SET_SCENARIO':{
   if(s.phase!=='setup')fail('Change the scenario only in setup.');
   if(!SCENARIOS.some(x=>x[0]===command.value))fail('Unknown scenario.');
   s.scenario=command.value;s.period=command.value==='downfall'?3:1;
   message=`Scenario: ${SCENARIOS.find(x=>x[0]===s.scenario)[1]}`;quality='manual';break;}
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
   if('mpRating' in v)p.mpRating=bounded(v.mpRating,0,20,'Printed movement');
   if('label' in v)p.label=String(v.label).slice(0,100);
   if('subtype' in v)p.subtype=String(v.subtype).slice(0,100);
   if('owner' in v)p.owner=String(v.owner).slice(0,50);
   if('notes' in v)p.notes=String(v.notes).slice(0,1000);
   if('finished' in v)p.finished=Boolean(v.finished);
   message=`Edited ${named(p)} (physical-board reconciliation).`;quality='manual';break;}
 case 'MOVE_PIECE':{
   const p=item(s,command.id);message=movePiece(s,p,command.location,true);
   quality='manual';break;}
 case 'DELETE_PIECE':{
   const p=item(s,command.id);if(s.activeBandId===p.id)fail('Finish the active Band first.');
   if(s.pieces.some(q=>q.location===`held:${p.id}`||q.location===`box:${p.id}`))fail('Move its contained counters first.');
   s.pieces=s.pieces.filter(q=>q.id!==p.id);message=`Deleted ${named(p)} from ledger (correction).`;
   quality='manual';break;}
 case 'ADD_EDGE':{
   const a=String(command.a),b=String(command.b),kind=command.kind;
   if(!SPACE[a]||!SPACE[b]||a===b)fail('Select two distinct map spaces.');
   if(!['solid','dashed'].includes(kind))fail('Choose solid or dashed.');
   if(s.edges.some(e=>e.a===a&&e.b===b||e.a===b&&e.b===a))fail('This connection has already been recorded.');
   s.edges.push({a,b,kind,verifiedByPlayer:true});message=`Physical-map connection recorded: ${a} ↔ ${b} (${kind}).`;quality='manual';break;}
 case 'DELETE_EDGE':{
   const n=s.edges.length;s.edges=s.edges.filter(e=>e.a!==command.a||e.b!==command.b);
   if(s.edges.length===n)fail('No such connection.');
   message=`Removed recorded map connection.`;quality='manual';break;}
 case 'CHECK':{
   const keys=checklist(s).map(x=>x[0]);if(!keys.includes(command.key))fail('That checkpoint is not in the current procedure.');
   if(!['done','na',''].includes(command.value))fail('Invalid checkpoint state.');
   s.steps[command.key]=command.value;message=`Checkpoint ${command.key}: ${command.value||'unmarked'}.`;
   quality='manual';break;}
 case 'SELECT_OPERATION':{
   if(s.phase!=='selection')fail('Select an Operation during Operation Selection only.');
   const op=command.value;if(!OPERATIONS.includes(op))fail('Unknown operation.');
   if(requiredPassage(s)&&op!=='Passage of Time')fail('Passage of Time is mandatory: no Bands in play, or the Operations marker requires it.');
   s.operation=op;message=`Selected ${op}.`;break;}
 case 'ADVANCE':{
   const next=safeNext(s);if(!next.ok)fail(next.message);
   if(s.phase==='war'){s.phase='selection';s.operation=null;}
   else if(s.phase==='selection'){if(requiredPassage(s)&&s.operation!=='Passage of Time')fail('Passage of Time is mandatory.');s.phase='execution';}
   else if(s.phase==='execution')s.phase='cleanup';
   else if(s.phase==='cleanup'){s.phase='war';s.operation=null;s.activeBandId=null;s.tracks.movement=0;
     /* Finished states remain as recorded; physical rule cleanup controls the next reset. */}
   else fail('Cannot advance from this phase.');
   s.steps={};message=`Advanced to ${s.phase.toUpperCase()} phase.`;break;}
 case 'ACTIVATE_BAND':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Bands activate only during Take Actions.');
   if(s.activeBandId)fail('Finish the current active Band first.');
   const p=item(s,command.id);if(p.type!=='Band'||!isInPlay(p))fail('Select an in-play Band.');
   if(p.location.startsWith('box:'))fail('First deploy the Band to its Ranchería space using a recorded physical-board correction.');
   const mode=String(command.mode||'rancheria');
   if(mode==='ap'){
     if(s.tracks.ap<p.strength)fail(`Need ${p.strength} player AP to activate an outside Band.`);
     s.tracks.ap-=p.strength;
   }else if(mode==='rancheria'){
     if(p.finished)fail('A Finished Band may be reactivated by paying APs under step 4, not by this simplified Ranchería mode.');
     if(!command.ack)fail('Confirm this Band is eligible under Ranchería medicine-track procedure 4.1. This app cannot validate the exact activation order.');
   }else fail('Unknown activation mode.');
   p.finished=false;s.activeBandId=p.id;s.tracks.movement=p.mpRating;
   message=`Activated ${named(p)}: ${p.mpRating} movement points (${mode==='ap'?'spent '+p.strength+' AP':'medicine prerequisites acknowledged'}).`;
   quality=mode==='ap'?'verified':'manual';break;}
 case 'FINISH_BAND':{
   const p=activeBand(s);if(!p)fail('No Band currently active.');p.finished=true;
   s.activeBandId=null;s.tracks.movement=0;
   message=`Finished ${named(p)}.`;break;}
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
   const cost=held(s,p.id).some(x=>x.type==='Mahimiana')?2:3;
   if(s.tracks.movement<cost)fail(`Hunt costs ${cost} movement points; only ${s.tracks.movement} remain.`);
   const b=s.pieces.find(x=>x.type==='Bison'&&x.location===p.location);
   if(!b)fail('No Bison counter at the Band’s location.');
   b.location=`held:${p.id}`;s.tracks.movement-=cost;
   message=`${named(p)} hunted at ${p.location}: gained Bison, spent ${cost} movement points (5.2.1).`;break;}
 case 'BEGIN_RAID':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Raid requires Take Actions.');
   const p=activeBand(s);if(!p)fail('Activate a Band first.');
   if(s.tracks.movement<1)fail('Need 1 movement point for Raid.');
   if(!SPACE[p.location])fail('Band is not on the board.');
   if(SPACE[p.location].type!=='enemy'&&!isPeace(s,p.location))fail('Raid target must be an Enemy Space or Peace Space (5.2.3).');
   s.tracks.movement--;s.pending={type:'raid',bandId:p.id,space:p.location,peace:isPeace(s,p.location)};
   message=`Raid initiated at ${p.location}; 1 movement point spent. Success Check and effects REQUIRED.`;break;}
 case 'CANCEL_RAID':{
   if(!s.pending||s.pending.type!=='raid')fail('No Raid to cancel.');
   s.tracks.movement++;s.pending=null;message='Raid cancelled; 1 movement point returned.';break;}
 case 'RESOLVE_RAID':{
   const pending=s.pending;if(!pending||pending.type!=='raid')fail('No Raid awaiting resolution.');
   const successes=bounded(command.successes,0,20,'Successes');
   const horses=bounded(command.horses,0,successes,'Horse rewards');
   const band=item(s,pending.bandId);
   if(successes && !command.ack)fail('Confirm you performed the physical Success Check and all required Peace rolls, if any.');
   for(let i=0;i<horses;i++)createPiece(s,{type:'Resource',subtype:'Horse',label:'Horse',location:`held:${band.id}`,owner:'Comanche'});
   for(let i=horses;i<successes;i++)createPiece(s,{type:'Resource',subtype:'Captives',label:'Captives',location:`held:${band.id}`,owner:'Comanche'});
   if(successes)createPiece(s,{type:'Marker',subtype:'Ravaged',label:'Ravaged',location:pending.space,owner:'Enemy'});
   s.pending=null;message=`Raid resolved with ${successes} Successes; ${horses} Horse, ${successes-horses} Captives. Peace result must be entered manually if applicable.`;
   quality='manual';break;}
 case 'TRADE':{
   if(s.phase!=='execution'||s.operation!=='Take Actions')fail('Trade requires Take Actions.');
   const p=activeBand(s);if(!p||!SPACE[p.location])fail('Activate a Band on the map first.');
   if(SPACE[p.location].type!=='enemy'&&!isPeace(s,p.location))fail('Trade only in Enemy Spaces or Peace Spaces (5.2.4).');
   if(hasRavaged(s,p.location))fail('Trade target is Ravaged.');
   const enemyKey=p.location==='W'?'W':p.location==='S'?'S':p.location.startsWith('E')?'E':null;
   if(enemyKey&&s.pieces.some(x=>x.subtype==='Ravaged'&&x.location!==p.location&&
      (enemyKey==='E'?['E1','E2'].includes(x.location):x.location===enemyKey)))fail('A Ravaged counter in another Enemy Space belonging to this enemy prohibits Trade.');
   const give=item(s,command.resourceId);
   if(give.location!==`held:${p.id}`||!['Bison','Captives','Horse'].includes(give.subtype==='Bison'?'Bison':give.type==='Bison'?'Bison':give.subtype))
     fail('Choose a possessed Bison, Captives or Horse counter.');
   if(!['Food','Trade Goods'].includes(command.receive))fail('Trade may receive Food or Trade Goods only.');
   if(s.tracks.movement<1)fail('Trade costs 1 movement point.');
   const apCost=!isPeace(s,p.location)&&give.subtype!=='Captives'?1:0;
   if(s.tracks.ap<apCost)fail('Trade requires 1 player AP for a non-Captives counter outside a Peace Space.');
   s.tracks.ap-=apCost;s.tracks.movement--;
   give.location='reserve';createPiece(s,{type:'Resource',subtype:command.receive,label:command.receive,location:`held:${p.id}`});
   message=`Trade: spent ${give.type==='Bison'?'Bison':give.subtype} for ${command.receive}; -1 movement${apCost?', -1 AP':''} (5.2.4).`;break;}
 case 'ADD_CARD':{
   const c={id:newId(),kind:String(command.kind||'Development'),identifier:String(command.identifier||'').slice(0,40),
    title:String(command.title||'').slice(0,120),zone:String(command.zone||'Display'),notes:String(command.notes||'').slice(0,1000)};
   if(!['History','Development','Culture','War'].includes(c.kind))fail('Unknown card deck.');
   s.cards.push(c);message=`Recorded ${c.kind} card ${c.identifier||c.title}.`;quality='manual';break;}
 case 'EDIT_CARD':{
   const c=s.cards.find(x=>x.id===command.id)||fail('Card not found.');
   if(!['Deck','Display','Hand','In play','War Event','Discard','Removed'].includes(command.zone))fail('Invalid card zone.');
   c.zone=command.zone;message=`Moved card ${c.identifier||c.title} to ${c.zone}.`;quality='manual';break;}
 case 'DELETE_CARD':{
   if(!s.cards.some(x=>x.id===command.id))fail('Card not found.');
   s.cards=s.cards.filter(x=>x.id!==command.id);message='Card removed from tracker.';quality='manual';break;}
 case 'LIMIT':{
   if(!PIECE_TYPES.includes(command.pieceType))fail('Unknown type.');
   const k=`${command.pieceType}:${String(command.subtype||'')}`;
   if(command.value==='')delete s.limits[k];else s.limits[k]=bounded(command.value,0,999,'Stock limit');
   message=`Updated entered supply limit: ${k}.`;quality='manual';break;}
 default:fail('Unknown command: '+type);
 }
 if(s.phase!=='setup' && s.phase!=='gameover' && s.tracks.military===0 && s.tracks.culture===0){s.phase='gameover';s.operation=null;s.activeBandId=null;s.pending=null;s.tracks.movement=0;message+=' GAME OVER: Military and Culture are both zero (2.11.1).';}
 logIt(s,message,quality,type);
 return s;
}
export function basicIntegrity(s){
 if(!s||s.schema!==1||!Array.isArray(s.pieces)||!Array.isArray(s.cards)||!Array.isArray(s.edges)||!s.tracks||!Array.isArray(s.log)||!PHASES.includes(s.phase))fail('Not a supported save-file schema.');
 if(s.pieces.length>5000||s.cards.length>5000||s.edges.length>300||s.log.length>10000)fail('Save file exceeds safe limits.');
 const ids=new Set();for(const p of s.pieces){if(!p||typeof p.id!=='string'||ids.has(p.id)||!PIECE_TYPES.includes(p.type))fail('Invalid or duplicate piece in save.');ids.add(p.id);}
 for(const x of ['military','culture','ap','enemyAp'])bounded(s.tracks[x],0,9,x);
 return true;
}
