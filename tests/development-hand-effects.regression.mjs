/** Original Development I printed-face oracles: #08 and #09.
 * These are isolated legitimate rule situations, not a claim that a full
 * scenario setup/turn sequence can yet reach every card interaction.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,basicIntegrity} from '../assets/engine.js';
function opening(){return perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});}
function held(id){const s=opening();s.phase='execution';s.operation='Culture';const c=s.cards.find(c=>c.kind==='Development'&&c.identifier===String(Number(id)));assert(c);c.zone='Hand';return s;}
function drawn(){let s=held('09');s.operation='Take Actions';const band=s.pieces.find(p=>p.type==='Band'&&p.strength>0);s.pending={type:'raid',bandId:band.id};s.successCheck={bandId:band.id,base:2,bonus:0,shieldBonus:0,expected:2,digital:true,drawIds:[],canceledDrawIds:[],gunAttempts:[],redraws:0};const ids=s.pieces.filter(p=>p.location==='cup'&&p.subtype==='Success').slice(0,2).map(p=>p.id);for(const id of ids)s=perform(s,{type:'RECORD_SUCCESS_DRAW',id});return {s,ids};}
test('D08 printed effect: playing the held card opens Ranchería travel and spends only the card',()=>{
 const s=held('08'),before=s.tracks.ap;const next=perform(s,{type:'DEVELOPMENT_PLAY_MOUNTED_SOCIETY'});
 assert.equal(next.cards.find(c=>c.identifier==='8'&&c.kind==='Development').zone,'Discard');
 assert.equal(next.tracks.ap,before);assert.equal(next.developmentMountedMove.allowance['setup-ranch-A'],6);
 assert.ok(basicIntegrity(next));
});
test('D08 printed procedure: one connected Ranchería step changes its actual location',()=>{
 let s=perform(held('08'),{type:'DEVELOPMENT_PLAY_MOUNTED_SOCIETY'});
 s=perform(s,{type:'PLANNING_MOVE_RANCHERIA',rancheriaId:'setup-ranch-A',to:'UA-2'});
 assert.equal(s.pieces.find(p=>p.id==='setup-ranch-A').location,'UA-2');
 assert.equal(s.developmentMountedMove.moves['setup-ranch-A'],1);
 assert.ok(basicIntegrity(s));
 s=perform(s,{type:'DEVELOPMENT_MOUNTED_FINISH'});assert.equal(s.developmentMountedMove,null);
});
test('D08 must not teleport across unconnected map spaces',()=>{
 const s=perform(held('08'),{type:'DEVELOPMENT_PLAY_MOUNTED_SOCIETY'});
 assert.throws(()=>perform(s,{type:'PLANNING_MOVE_RANCHERIA',rancheriaId:'setup-ranch-A',to:'RG-6'}),/recorded connection/);
});
test('D08 movement cannot be silently interrupted by an unrelated action',()=>{
 const s=perform(held('08'),{type:'DEVELOPMENT_PLAY_MOUNTED_SOCIETY'});
 assert.throws(()=>perform(s,{type:'TRACK',field:'culture',value:5}),/Mounted Society/);
});
test('D09 printed effect: cancel entire Success Check draw and replace every counter in cup',()=>{
 const {s,ids}=drawn(),before=s.tracks.ap;
 const next=perform(s,{type:'DEVELOPMENT_COUNTING_COUP_REDRAW'});
 assert.equal(next.cards.find(c=>c.identifier==='9'&&c.kind==='Development').zone,'Discard');
 assert.deepEqual(next.successCheck.drawIds,[]);assert.equal(next.successCheck.expected,2);
 assert.equal(next.successCheck.redraws,1);assert.equal(next.tracks.ap,before);
 for(const id of ids)assert.equal(next.pieces.find(p=>p.id===id).location,'cup');
 assert.ok(basicIntegrity(next));
});
test('D09 cannot be played again after its one use',()=>{
 const {s}=drawn();const next=perform(s,{type:'DEVELOPMENT_COUNTING_COUP_REDRAW'});
 const staged=perform(next,{type:'RECORD_SUCCESS_DRAW',id:next.pieces.find(p=>p.location==='cup'&&p.subtype==='Success').id});
 assert.throws(()=>perform(staged,{type:'DEVELOPMENT_COUNTING_COUP_REDRAW'}),/held in hand/);
});
test('D09 redraw cannot erase a separate Guns cancellation side effect',()=>{
 const {s}=drawn();s.successCheck.gunAttempts.push({counterId:s.successCheck.drawIds[0]});
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_COUNTING_COUP_REDRAW'}),/Guns and Tactical Advantage/);
});

test('D09 printed die option: cancel a pending Mahimiana roll and recalculate the actual draw count',()=>{
 let s=held('09');s.operation='Take Actions';
 const band=s.pieces.find(p=>p.type==='Band'&&p.strength>0);
 const chief=s.pieces.find(p=>p.type==='Mahimiana');assert(chief);
 chief.location=`held:${band.id}`;
 s.pending={type:'raid',bandId:band.id};
 s.successCheck={bandId:band.id,mahimianaId:chief.id,base:band.strength,bonus:0,shieldBonus:0,expected:band.strength,medicine:3,die:6,digital:true,drawIds:[],canceledDrawIds:[],gunAttempts:[],redraws:0};
 const previousRolls=s.rng.rolls;
 const next=perform(s,{type:'DEVELOPMENT_COUNTING_COUP_REROLL'});
 const sc=next.successCheck;
 assert.equal(next.cards.find(c=>c.kind==='Development'&&c.identifier==='9').zone,'Discard');
 assert.equal(next.rng.rolls,previousRolls+1);
 assert.ok(sc.die>=1&&sc.die<=6);
 assert.equal(sc.bonus,sc.die<=1?2:sc.die<=3?1:0);
 assert.equal(sc.expected,band.strength+sc.bonus);
 assert.equal(sc.countingCoupReroll.previous,6);
 assert.equal(next.pieces.filter(p=>p.location==='check-draw').length,0);
 assert.ok(basicIntegrity(next));
 assert.throws(()=>perform(next,{type:'DEVELOPMENT_COUNTING_COUP_REROLL'}),/held in hand/);
});

test('D09 cannot retroactively change a roll once physical Success Check counters have been drawn',()=>{
 let s=held('09');s.operation='Take Actions';
 const band=s.pieces.find(p=>p.type==='Band'&&p.strength>0);
 const chief=s.pieces.find(p=>p.type==='Mahimiana');chief.location=`held:${band.id}`;
 s.pending={type:'raid',bandId:band.id};
 s.successCheck={bandId:band.id,mahimianaId:chief.id,base:band.strength,bonus:1,shieldBonus:0,expected:band.strength+1,medicine:3,die:3,digital:true,drawIds:[],canceledDrawIds:[],gunAttempts:[],redraws:0};
 const id=s.pieces.find(p=>p.location==='cup'&&p.subtype==='Success').id;
 s=perform(s,{type:'RECORD_SUCCESS_DRAW',id});
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_COUNTING_COUP_REROLL'}),/precede every cup draw/);
});
