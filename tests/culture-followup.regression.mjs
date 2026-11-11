/** C15/C18/C04/C12 printed-effect regressions. Isolated positions are
 * explicitly not evidence that a complete official scenario is playable. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,cultureWarEvasionOptions} from '../assets/engine.js';
import {planningActionChoices} from '../assets/planning-action-menu.js';

function planning(id){
 const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 s.phase='execution';s.operation='Planning';s.planningStage=4;s.tracks.culture=3;
 const card=s.cards.find(c=>c.identifier===id||c.id===({C15:'setup-culture-set-5-level-3',C18:'setup-culture-set-7-level-2'}[id]));
 assert(card);card.zone='In play';
 const ranch=s.pieces.find(p=>p.type==='Rancheria');const chief=s.pieces.find(p=>p.type==='Paraibo');
 s.planningHeadman={[ranch.id]:{paraiboId:chief.id,allowance:1,spent:0}};
 return {s,ranch,chief};
}

test('C18: successful Medicine roll improves Medicine only; consumes an existing action',()=>{
 let observed=null;
 for(let seed=1;seed<=128;seed++){
  const {s,ranch,chief}=planning('C18');s.rng.seed=seed;
  const next=perform(s,{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'spirituality-medicine'});
  if(next.pieces.find(p=>p.id===chief.id).medicine===3){observed={before:s,after:next,ranchId:ranch.id};break;}
 }
 assert(observed,'Expected a successful die outcome among independent seeded rolls');
 assert.equal(observed.after.planningHeadman[observed.ranchId].allowance,1,'Printed C18 does not award extra Headman Actions');
 assert.equal(observed.after.planningHeadman[observed.ranchId].spent,1);
 assert.equal(observed.after.pieces.find(p=>p.type==='Paraibo').medicine,3);
 assert(!planningActionChoices(observed.after).some(x=>x.command?.action==='spirituality-medicine'));
});

test('C18: failed attempt does not improve Medicine or invent another action',()=>{
 let observed=null;
 for(let seed=1;seed<=128;seed++){
  const {s,ranch,chief}=planning('C18');s.rng.seed=seed;
  const next=perform(s,{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'spirituality-medicine'});
  if(next.pieces.find(p=>p.id===chief.id).medicine===2){observed={after:next,ranchId:ranch.id};break;}
 }
 assert(observed);
 assert.equal(observed.after.planningHeadman[observed.ranchId].allowance,1);
 assert.equal(observed.after.planningHeadman[observed.ranchId].spent,1);
});

test('C15: currently visible verified Peace may be placed even if counter is flipped',()=>{
 const {s,ranch}=planning('C15');
 const peace=s.pieces.find(p=>p.id==='setup-instruction-East-A');
 assert.equal(peace.subtype,'Peace');
 // Isolated face-eligibility contract, not a claim East A has a Peace reverse.
 // The actual physical reverse requires independent counter evidence.
 peace.flipped=true;peace.faceEvidence='recorded';
 const next=perform(s,{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'diplomacy-place',instructionId:peace.id});
 assert.equal(next.pieces.find(p=>p.id===peace.id).location,'E2');
 assert.equal(next.planningHeadman[ranch.id].spent,1);
});

test('C15: unknown opposite face never becomes an eligible Peace/Ally',()=>{
 const {s,ranch}=planning('C15');
 const peace=s.pieces.find(p=>p.id==='setup-instruction-East-A');peace.flipped=true;peace.faceEvidence='unverified';
 assert.throws(()=>perform(s,{type:'PLANNING_HEADMAN_ACTION',rancheriaId:ranch.id,action:'diplomacy-place',instructionId:peace.id}),/face-up Peace or Ally/);
});

test('Lords I evasion destinations do not offer illegal double Band stacking',()=>{
 const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 const war=s.pieces.find(p=>p.type==='War Column')??{id:'isolated-war',type:'War Column',strength:2,location:'UA-1'};
 if(!s.pieces.includes(war))s.pieces.push(war);else{war.location='UA-1';war.strength=2;}
 const b=s.pieces.find(p=>p.type==='Band');assert(b);b.location='UA-1';b.strength=1;
 const card=s.cards.find(c=>c.id==='setup-culture-set-2-level-1');assert(card);card.zone='In play';
 s.tracks.culture=3;s.phase='war';s.steps={w1:'done'};
 const destinations=s.edges.filter(e=>e.a==='UA-1'||e.b==='UA-1').map(e=>e.a==='UA-1'?e.b:e.a);
 assert(destinations.length);
 const to=destinations.find(loc=>loc.startsWith('UA-')&&loc!=='UA-1');assert(to);
 const other=s.pieces.find(p=>p.type==='Band'&&p!==b);assert(other);other.location=to;
 assert(!cultureWarEvasionOptions(s).some(o=>o.kind==='band'&&o.id===b.id&&o.to===to));
});

test('C12: Ranchería evasion must not offer a numbered destination occupied by a Band',()=>{
 const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 const ranch=s.pieces.find(p=>p.type==='Rancheria');assert(ranch);
 const war=s.pieces.find(p=>p.type==='War Column')??{id:'isolated-war',type:'War Column',strength:2,location:ranch.location};
 if(!s.pieces.includes(war))s.pieces.push(war);else {war.location=ranch.location;war.strength=2;}
 const card=s.cards.find(c=>c.id==='setup-culture-set-2-level-3');assert(card);card.zone='In play';
 s.tracks.culture=3;s.phase='war';s.steps={w1:'done'};
 const destinations=s.edges.filter(e=>e.a===ranch.location||e.b===ranch.location).map(e=>e.a===ranch.location?e.b:e.a);
 const to=destinations.find(loc=>/^(?:UA|LA|RR|RG|LE|BC)-/.test(loc));assert(to);
 const band=s.pieces.find(p=>p.type==='Band');assert(band);band.location=to;
 assert(!cultureWarEvasionOptions(s).some(o=>o.kind==='ranch'&&o.id===ranch.id&&o.to===to));
});

test('C15: the Planning menu offers a verified displayed Peace reverse',()=>{
 const {s}=planning('C15');
 const peace=s.pieces.find(p=>p.id==='setup-instruction-East-A');
 peace.flipped=true;peace.faceEvidence='recorded';
 assert(planningActionChoices(s).some(choice=>choice.command?.action==='diplomacy-place'&&choice.command?.instructionId===peace.id));
});
