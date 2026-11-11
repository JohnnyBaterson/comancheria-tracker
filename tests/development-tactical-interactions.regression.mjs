/** Independent oracle: D09 cancels a die roll; D17 on 1–2 is discarded,
 * 3–4 adds one Success, 5–6 adds one Success and returns one drawn Enemy AP.
 * These are isolated midgame rule positions; full-campaign acceptance is separate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,basicIntegrity} from '../assets/engine.js';
const card=(s,n)=>s.cards.find(c=>c.kind==='Development'&&Number(c.identifier)===n);
function setup(){
 let s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 const band=s.pieces.find(p=>p.type==='Band');assert(band);
 s.phase='execution';s.operation='Take Actions';s.pending={type:'raid',bandId:band.id};
 s.successCheck={bandId:band.id,base:band.strength,bonus:0,expected:band.strength,digital:true,drawIds:[],canceledDrawIds:[],gunAttempts:[],redraws:0};
 card(s,9).zone='Hand';card(s,17).zone='Hand';return s;
}
test('D09 cancels D17 die, replaces rather than stacks bonus, and consumes exactly D09',()=>{
 let s=setup();s=perform(s,{type:'DEVELOPMENT_TACTICAL',cardId:card(s,17).id});
 const old=s.successCheck.tacticalDie;
 const count=s.rng.rolls;
 s=perform(s,{type:'DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL'});
 assert.equal(s.rng.rolls,count+1);
 assert.equal(s.successCheck.countingCoupTacticalReroll.previous,old);
 const face=s.successCheck.tacticalDie;
 assert.equal(s.successCheck.tacticalSuccess,face>=3?1:0);
 assert.equal(s.successCheck.tacticalReturnAP,face>=5);
 assert.equal(card(s,17).zone,face<=2?'Discard':'Hand');
 assert.equal(card(s,9).zone,'Discard');
 assert.equal(s.successCheck.expected,s.successCheck.base);
 assert.ok(basicIntegrity(s));
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL'}));
});
test('D09 cannot cancel Tactical Advantage after the first physical draw',()=>{
 let s=setup();s=perform(s,{type:'DEVELOPMENT_TACTICAL',cardId:card(s,17).id});
 const counter=s.pieces.find(p=>p.location==='cup'&&p.subtype==='Success');assert(counter);
 s=perform(s,{type:'RECORD_SUCCESS_DRAW',id:counter.id});
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL'}),/after Success Check counters/);
});
test('D17 roll 5–6 returns one Enemy AP before D36 evaluates the final AP total',()=>{
 let scenario=setup();const shield=card(scenario,36);shield.zone='Hand';
 const selection=[scenario.pieces.find(p=>p.location==='cup'&&p.subtype==='Enemy AP 4'),
                  scenario.pieces.find(p=>p.location==='cup'&&p.subtype==='Enemy AP 2')];
 assert.ok(selection.every(Boolean),'Official Success cup must contain printed AP 4 and AP 2 counters');
 let s;
 for(let seed=1;seed<=100;seed++){
   const candidate=structuredClone(scenario);candidate.rng.seed=seed;
   const rolled=perform(candidate,{type:'DEVELOPMENT_TACTICAL',cardId:card(candidate,17).id});
   if(rolled.successCheck.tacticalDie>=5){s=rolled;break;}
 }
 assert.ok(s,'Seeded Tactical Advantage 5–6 branch must be reachable');
 s.successCheck.expected=selection.length;
 for(const p of selection)s=perform(s,{type:'RECORD_SUCCESS_DRAW',id:p.id});
 s=perform(s,{type:'FINISH_SUCCESS_CHECK'});
 const kept=selection.filter(p=>s.pieces.find(x=>x.id===p.id).location==='available-enemy-aps');
 assert.equal(kept.length,1,'D17 must return one of the printed Enemy AP counters to the cup');
 assert.equal(card(s,36).zone,'Hand','D36 must evaluate the final AP total, not the pre-return 6 AP');
 assert.equal(s.lastSuccessCheck.enemyAPs,1);
 assert.ok(basicIntegrity(s));
});
