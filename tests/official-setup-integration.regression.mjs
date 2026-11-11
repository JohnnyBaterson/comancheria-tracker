import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,openingLedgerAudit,basicIntegrity,SCENARIOS,TERRITORY_DIE_ORDER,rollSeededDie} from '../assets/engine.js';
import {nextPlayerPrompt} from '../assets/next-action.js';

for (const [id] of SCENARIOS){
 test(`${id}: setup director offers legal opening actions`,()=>{
  const blank=newGame(id);
  const first=nextPlayerPrompt(blank);
  assert.equal(first.kind,'player');
  assert(first.choices.some(c=>c.command.type==='APPLY_SCENARIO_SETUP'&&c.command.scenario===id));
  const s=perform(blank,{type:'APPLY_SCENARIO_SETUP',scenario:id});
  const next=nextPlayerPrompt(s);
  assert(next.command||next.kind==='evidence'||next.choices?.length);
  if(id!=='downfall')assert.equal(next.command?.type,'SETUP_AUDIT_LEDGER');
  else assert.equal(next.command?.type,'SETUP_DOWNFALL_ROLL_BISON');
 });
}
for(const id of ['plains','rise','lords','campaign']){
 test(`${id}: official ledger validation enforces real starting inventories`,()=>{
  const s=perform(newGame(id),{type:'APPLY_SCENARIO_SETUP',scenario:id});
  const audit=openingLedgerAudit(s);
  assert.equal(audit.checks.length,5);
  assert(audit.checks.every(x=>x.ok));
  assert.throws(()=>perform(s,{type:'CONFIRM_SETUP',key:'enemy-display',value:true}));
  const verified=perform(s,{type:'SETUP_AUDIT_LEDGER'});
  for(const c of audit.checks)assert.equal(verified.setupConfirmed[c.key],true);
  assert.equal(nextPlayerPrompt(verified).kind,'player');
  assert.equal(verified.setupConfirmed.bands,undefined);
  assert.equal(verified.setupConfirmed['cards-war'],undefined);
  assert(basicIntegrity(verified));
  assert.throws(()=>perform(verified,{type:'SETUP_AUDIT_LEDGER'}));
  const tampered=structuredClone(s);tampered.tracks.ap=5;
  assert( openingLedgerAudit(tampered).checks.find(x=>x.key==='operations').ok===false);
  assert.throws(()=>perform(tampered,{type:'SETUP_AUDIT_LEDGER'}));
 });
}
test('Downfall: random Bison positions use two printed dice, respect occupied spaces and preserve reproducibility',()=>{
 const s=perform(newGame('downfall'),{type:'APPLY_SCENARIO_SETUP',scenario:'downfall'});
 const first=perform(s,{type:'SETUP_DOWNFALL_ROLL_BISON'});
 const second=perform(s,{type:'SETUP_DOWNFALL_ROLL_BISON'});
 const pieces=first.pieces.filter(p=>p.id.startsWith('setup-downfall-bison-'));
 assert.equal(pieces.length,9);
 assert.equal(new Set(pieces.map(p=>p.location)).size,9);
 assert.deepEqual(first.setupBisonRolls,second.setupBisonRolls);
 assert.deepEqual(pieces.map(p=>p.location),second.pieces.filter(p=>p.id.startsWith('setup-downfall-bison-')).map(p=>p.location));
 assert(first.setupBisonRolls.length>=9);
 assert.equal(first.setupBisonRolls.filter(x=>x.accepted).length,9);
 assert.equal(first.rng.rolls-s.rng.rolls,2*first.setupBisonRolls.length);
 let seed=s.rng.seed;
 const blocked=new Set(s.pieces.filter(p=>['Tribe','Settlement'].includes(p.type)&&p.location!=='reserve').map(p=>p.location));
 for(const record of first.setupBisonRolls){
  const a=rollSeededDie(seed);seed=a.seed;
  const b=rollSeededDie(seed);seed=b.seed;
  assert.equal(record.territoryDie,a.face);
  assert.equal(record.areaDie,b.face);
  assert.equal(record.space,`${TERRITORY_DIE_ORDER[a.face-1]}-${b.face}`);
  assert.equal(record.accepted,!blocked.has(record.space));
  if(record.accepted)blocked.add(record.space);
 }
 assert.equal(first.rng.seed,seed);
 assert.equal(nextPlayerPrompt(first).title,'Downfall: three Rancherías');
 assert.throws(()=>perform(first,{type:'SETUP_DOWNFALL_ROLL_BISON'}));
 assert(basicIntegrity(first));
 const altered=structuredClone(first);
 altered.setupBisonRolls[0].areaDie=altered.setupBisonRolls[0].areaDie%6+1;
 assert.throws(()=>basicIntegrity(altered));
 const alteredSeed=structuredClone(first);
 alteredSeed.setupBisonStartSeed=0xffffffff;
 assert.throws(()=>basicIntegrity(alteredSeed));
});

function prepareLegalDownfallForDevelopment(){
 let s=perform(newGame('downfall'),{type:'APPLY_SCENARIO_SETUP',scenario:'downfall'});
 s=perform(s,{type:'SETUP_DOWNFALL_ROLL_BISON'});
 const occupied=new Set(s.pieces.filter(p=>['Tribe','Settlement','Bison'].includes(p.type)).map(p=>p.location));
 const free=Object.values(SPACEDATA).filter(p=>p.type==='round'&&!occupied.has(p.id));
 let placed=null;
 // Iterate over legal *player choices* accepted by the production reducer.
 // No internal phase change, invented pieces, or direct stock edits.
 outer:for(const a of free)for(const b of free)for(const c of free){
  if(new Set([a.territory,b.territory,c.territory]).size!==3)continue;
  try{placed=perform(s,{type:'SETUP_DOWNFALL_RANCHERIAS',spaces:{A:a.id,B:b.id,C:c.id}});break outer;}catch{}
 }
 assert(placed,'Printed Downfall setup must admit a legal three-Ranchería placement');
 s=perform(placed,{type:'SETUP_DOWNFALL_RESOURCES',allocation:{
  A:{band2:4,band1:2,horses:1,trade:1},B:{band2:0,band1:0,horses:0,trade:0},C:{band2:0,band1:0,horses:0,trade:0}
 }});
 s=perform(s,{type:'SETUP_DOWNFALL_MEDICINE',medicine:Object.fromEntries(['A','B','C'].flatMap(l=>['paraibo','mahimiana'].map(t=>[`${l}-${t}`,2])))});
 s=perform(s,{type:'SETUP_CULTURE_FINISH'});
 return s;
}

// These are real public setup actions. The player allocation is a legal choice,
// not a guessed printed initial state or a replacement for victory tests.
const SPACEDATA=(await import('../assets/engine.js')).SPACES;
test('Downfall Development: staged digital roll, optional Trade Goods reroll, and true card reveal',()=>{
 let s=prepareLegalDownfallForDevelopment();
 assert.equal(nextPlayerPrompt(s).command?.type,'SETUP_DOWNFALL_DEVELOPMENT_ROLL');
 s=perform(s,{type:'SETUP_DOWNFALL_DEVELOPMENT_ROLL'});
 const first=s.setupDevelopmentPendingDie;
 assert(first&&[1,2,3,4,5,6].includes(first.die));
 assert.equal(s.setupDevelopmentRoll,null);
 assert.equal(s.cards.filter(c=>c.kind==='Development'&&['26','28','38'].includes(c.identifier)&&c.zone==='In play').length,0);
 assert.throws(()=>perform(s,{type:'START'}));
 const tampered=structuredClone(s);tampered.setupDevelopmentPendingDie.dice[0]=first.die%6+1;
 assert.throws(()=>basicIntegrity(tampered));
 s=perform(s,{type:'SETUP_DOWNFALL_DEVELOPMENT_REROLL'});
 assert.equal(s.setupDevelopmentPendingDie.rerolls,1);
 assert.equal(s.setupDevelopmentPendingDie.dice.length,2);
 assert.throws(()=>perform(s,{type:'SETUP_DOWNFALL_DEVELOPMENT_REROLL'}));
 const finalDie=s.setupDevelopmentPendingDie.die;
 const trade=s.pieces.find(p=>p.id==='setup-downfall-trade');
 assert.equal(trade.location.startsWith('box:'),true,'Trade Goods only moves when revealed outcome is committed');
 s=perform(s,{type:'SETUP_DOWNFALL_DEVELOPMENT_COMMIT'});
 assert.equal(s.setupDevelopmentPendingDie,null);
 assert.equal(s.setupDevelopmentRoll.die,finalDie);
 assert.equal(s.setupDevelopmentRoll.number,finalDie<=2?'26':finalDie<=4?'28':'38');
 assert.equal(s.setupDevelopmentRoll.tradeGoodsSpent,1);
 assert.equal(s.pieces.find(p=>p.id==='setup-downfall-trade').location,'reserve');
 assert(s.cards.some(c=>c.kind==='Development'&&c.identifier===s.setupDevelopmentRoll.number&&c.zone==='In play'));
 assert(basicIntegrity(s));
 assert.throws(()=>perform(s,{type:'SETUP_DOWNFALL_DEVELOPMENT_ROLL'}));
});
test('Downfall Development: one digital roll commits without costing Trade Goods',()=>{
 let s=prepareLegalDownfallForDevelopment();
 s=perform(s,{type:'SETUP_DOWNFALL_DEVELOPMENT_ROLL'});
 const face=s.setupDevelopmentPendingDie.die;
 s=perform(s,{type:'SETUP_DOWNFALL_DEVELOPMENT_COMMIT'});
 assert.equal(s.setupDevelopmentRoll.die,face);
 assert.equal(s.setupDevelopmentRoll.tradeGoodsSpent,0);
 assert(s.pieces.find(p=>p.id==='setup-downfall-trade').location.startsWith('box:'));
 assert(basicIntegrity(s));
});
