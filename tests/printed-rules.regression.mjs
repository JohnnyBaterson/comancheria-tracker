/**
 * INDEPENDENT PRINTED-RULE REGRESSIONS
 *
 * Oracle data below is transcribed from GMT Games' Spring 2024 Living Rules,
 * not generated from ENEMY_INSTRUCTION_FRONTS, an engine helper, or a snapshot.
 * Every failure names the printed section and the observed outcome.
 *
 * Isolated legal-position fixtures are deliberately distinguished from
 * real scenario journeys. They establish rule consequences, NOT reachability.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,perform,pointLossPreview,enemyCulturePreview,huntTargetPreview,
  enemyDisplayRowForDie,enemyDisplayAudit,resetEnemyDisplay,
  finalPeriodForScenario,historyObjectiveAudit
} from '../assets/engine.js';

const official = scenario => perform(newGame(scenario),{type:'APPLY_SCENARIO_SETUP',scenario});
const inPlay = p => p.location!=='reserve' && p.location!=='removed';

// Rule 2.11.2–3: every unfulfilled Military/Culture loss is replaced by a
// loss of TWO points on the other track, which itself cannot go below zero.
// Test inputs represent legal possible track positions (0 through 9).
const LOSS_ORACLE = [
  {from:[3,3],track:'military',loss:2,to:[1,3]},
  {from:[3,3],track:'culture',loss:2,to:[3,1]},
  {from:[1,6],track:'military',loss:3,to:[0,2]},
  {from:[6,1],track:'culture',loss:3,to:[2,0]},
  {from:[0,9],track:'military',loss:2,to:[0,5]},
  {from:[9,0],track:'culture',loss:2,to:[5,0]},
  {from:[1,1],track:'military',loss:2,to:[0,0]},
  {from:[1,1],track:'culture',loss:2,to:[0,0]},
  {from:[9,9],track:'military',loss:9,to:[0,9]},
  {from:[9,9],track:'culture',loss:9,to:[9,0]},
  {from:[0,1],track:'military',loss:1,to:[0,0]},
  {from:[1,0],track:'culture',loss:1,to:[0,0]},
];
for (const {from,track,loss,to} of LOSS_ORACLE){
  test(`§2.11: ${from.join('/')} loses ${loss} ${track} -> ${to.join('/')} Military/Culture`,()=>{
    const startingTracks={military:from[0],culture:from[1],ap:0};
    const result=pointLossPreview({tracks:startingTracks},track,loss);
    assert.deepEqual([result.tracks.military,result.tracks.culture],to,
      `§2.11 substitution outcome differs from printed rule`);
    assert.equal(result.tracks.ap,0,'Point loss must not spend player AP');
    assert.deepEqual(startingTracks,{military:from[0],culture:from[1],ap:0},'Preview must not change initial position');
  });
}

// Map's six printed dice symbols, checked against publisher map / rules §2.2.
// Do not use TERRITORY_DIE_ORDER to generate expected values.
const PRINTED_TERRITORY_FACES=['UA','LA','LE','RR','RG','BC'];
for(let die=1;die<=6;die++){
  test(`§6.3.4: Hunt die ${die} targets ${PRINTED_TERRITORY_FACES[die-1]} in the printed scenario`,()=>{
    const state=official('plains');
    const expectedTerritory=PRINTED_TERRITORY_FACES[die-1];
    const expectedPieces=state.pieces.filter(p=>p.type==='Bison'&&inPlay(p)&&p.location.startsWith(`${expectedTerritory}-`));
    assert(expectedPieces.length>0,'Opening fixture should have Bison in every territory');
    const actual=huntTargetPreview(state,die);
    assert.equal(actual.territory,expectedTerritory);
    assert.equal(actual.selectedFace,die);
    assert.deepEqual(new Set(actual.candidates.map(x=>x.id)),new Set(expectedPieces.map(x=>x.id)),
      'Hunt may randomly select exactly one Bison in the selected territory, not elsewhere');
  });
}

// Legal mid-game examples after prior Bison losses. The only scenario fixture
// changes are moving already existing Bison to printed out-of-play stock.
for(const {name,cleared,die,territory,selectedFace} of [
  {name:'advance to next occupied territory',cleared:['RG'],die:5,territory:'BC',selectedFace:6},
  {name:'wrap past die 6 to die 1',cleared:['BC'],die:6,territory:'UA',selectedFace:1},
  {name:'skip several depleted territories',cleared:['LA','LE','RR'],die:2,territory:'RG',selectedFace:5},
  {name:'skip five empty territories',cleared:['LA','LE','RR','RG','BC'],die:2,territory:'UA',selectedFace:1},
]){
  test(`§6.3.4: Hunt ${name}`,()=>{
    const state=official('plains');
    for(const p of state.pieces.filter(x=>x.type==='Bison'&&cleared.some(t=>x.location.startsWith(t+'-'))))p.location='reserve';
    const output=huntTargetPreview(state,die);
    assert.equal(output.territory,territory);
    assert.equal(output.selectedFace,selectedFace);
    assert(output.candidates.length>0,'Must remove one Bison if any remains');
  });
}
test('§6.3.4: Enemy Hunt has no effect if no Bison remain anywhere',()=>{
  const state=official('plains');
  for(const p of state.pieces.filter(x=>x.type==='Bison'))p.location='reserve';
  for(let d=1;d<=6;d++){
    const result=huntTargetPreview(state,d);
    assert.equal(result.none,true);
    assert.deepEqual(result.candidates,[]);
  }
});
test('§6.3.4: invalid die result cannot be treated as a legal Hunt',()=>{
  const state=official('plains');
  for(const d of [0,7,1.5,NaN])assert.throws(()=>huntTargetPreview(state,d));
});

// Rule 6.3.2: a Culture Attack costs one Culture + one per Settlement owned
// by the active Enemy. Official Downfall §9.5 provides the counted positions.
const CULTURE_ATTACK_ORACLE={
  plains:{West:1,South:1,East:1,North:1},
  downfall:{West:2,South:4,East:1,North:1},
};
for(const [scenario,costs] of Object.entries(CULTURE_ATTACK_ORACLE)){
  for(const [enemy,loss] of Object.entries(costs)){
    test(`§6.3.2: ${scenario} ${enemy} Culture Attack loses ${loss} Culture`,()=>{
      const start=official(scenario);
      const result=enemyCulturePreview(start,enemy);
      assert.equal(result.recoverFirst,false,'This fixture has no active Ravaged recovery');
      assert.equal(result.amount,loss,'Culture Attack must be 1 + active Enemy Settlements');
      const expectedCulture=Math.max(0,3-loss);
      const shortfall=Math.max(0,loss-3);
      const expectedMilitary=Math.max(0,3-2*shortfall);
      assert.deepEqual([result.pointLoss.tracks.military,result.pointLoss.tracks.culture],
        [expectedMilitary,expectedCulture],
        'Culture Attack must apply §2.11 substitution as well as §6.3.2');
    });
  }
}

// §6.2.2.B: the Enemy Action Table die and display row die are separate;
// display die symbols map 1..6 to A..F.
for(let d=1;d<=6;d++){
  test(`§6.2.2.B: display die ${d} chooses ${'ABCDEF'[d-1]}`,()=>{
    assert.equal(enemyDisplayRowForDie(d),'ABCDEF'[d-1]);
  });
}
for(const die of [0,7,1.5]){
  test(`§6.2.2.B: illegal display die ${die} is not a playable row`,()=>{
    assert.throws(()=>enemyDisplayRowForDie(die));
  });
}

// §6.2.3: move existing column up without reordering; return Inactive from
// bottom to top into each owner's highest available empty slot.
test('§6.2.3: resetting a display returns inactive counters bottom-up, preserving column order',()=>{
  const state=official('plains');
  const westA=state.pieces.find(p=>p.id==='setup-instruction-West-A');
  const westB=state.pieces.find(p=>p.id==='setup-instruction-West-B');
  const printedIdentity=Object.fromEntries('ABCDEF'.split('').map(row=>[row,state.pieces.find(p=>p.location===`enemy-display:West:${row}`).id]));
  westA.location='enemy-inactive:A';
  westB.location='enemy-inactive:B';
  const result=resetEnemyDisplay(state);
  assert.deepEqual('ABCDEF'.split('').map(row=>state.pieces.find(p=>p.location===`enemy-display:West:${row}`)?.id),[
    printedIdentity.C,printedIdentity.D,
    printedIdentity.E,printedIdentity.F,
    printedIdentity.B,printedIdentity.A,
  ]);
  assert.equal(result.moved.length,2);
  assert.equal(enemyDisplayAudit(state).inactive.filter(slot=>slot.piece).length,0);
  assert.deepEqual(enemyDisplayAudit(state).problems,[]);
});
test('§6.2.3: a full initial display is unchanged by a reset',()=>{
  const state=official('plains');
  const before=state.pieces.filter(p=>p.type==='Instruction'&&p.location.startsWith('enemy-display:')).map(p=>[p.id,p.location]);
  const result=resetEnemyDisplay(state);
  assert.equal(result.moved.length,0);
  assert.deepEqual(state.pieces.filter(p=>p.type==='Instruction'&&p.location.startsWith('enemy-display:')).map(p=>[p.id,p.location]),before);
});

// §9.2–9.6: use printed end periods rather than the engine's scenario metadata.
const PRINTED_FINAL_PERIODS={plains:1,rise:2,lords:3,downfall:4,campaign:4};
for(const [scenario,period] of Object.entries(PRINTED_FINAL_PERIODS)){
  test(`§9: ${scenario} ends after Historical Period ${period}`,()=>{
    assert.equal(finalPeriodForScenario(scenario),period);
  });
}
test('§9/§2.10: 1700 start cannot already satisfy H1 without a second Ranchería territory',()=>{
  const state=official('plains');
  const result=historyObjectiveAudit(state);
  assert.equal(result.history,'H1');
  assert.equal(result.result,'not-met');
});
test('§9/§2.10: the incomplete Downfall setup cannot be credited with its H3 objective',()=>{
  const state=official('downfall');
  const result=historyObjectiveAudit(state);
  assert.equal(result.history,'H3');
  assert.equal(result.result,'not-met');
});

// §9.2.J: each 1700 start permits exactly ONE free Level-1 Culture Card.
// These invoke real player commands on an unmodified official scenario.
for(const scenario of ['plains','rise','lords','campaign']){
  test(`§9.2.J: ${scenario} may put exactly one free Level-1 Culture card in play`,()=>{
    const initial=official(scenario);
    const after=perform(initial,{type:'SETUP_CULTURE_CARD',cultureId:'C01'});
    const purchased=after.cards.find(c=>c.kind==='Culture'&&c.identifier==='C01');
    assert.equal(purchased?.zone,'In play','Selected card must be physically in play');
    assert.equal(after.tracks.culture,3,'Free setup selection may not deduct general-record Culture points');
    assert.equal(after.setupCultureSpent,1,'One free card allowance consumed');
    assert.throws(()=>perform(after,{type:'SETUP_CULTURE_CARD',cultureId:'C04'}),
      'Cannot grant another free Level-1 Culture card');
    assert.equal(initial.cards.find(c=>c.id===purchased.id)?.zone,'Available',
      'The previous game snapshot must remain unchanged');
  });
}
for(const scenario of ['plains','rise','lords','campaign']){
  test(`§9.1.4/§9.2.J: ${scenario} cannot purchase Level 2 before Level 1`,()=>{
    const s=official(scenario);
    assert.throws(()=>perform(s,{type:'SETUP_CULTURE_CARD',cultureId:'C02'}));
    assert.equal(s.setupCultureSpent,0);
    assert(!s.cards.some(c=>c.kind==='Culture'&&c.identifier==='C02'&&c.zone==='In play'));
  });
}
test('§9.5.K: Downfall cannot purchase Culture before headmen/medicine setup',()=>{
  const s=official('downfall');
  assert.throws(()=>perform(s,{type:'SETUP_CULTURE_CARD',cultureId:'C01'}));
  assert.equal(s.tracks.culture,3);
  assert.equal(s.setupCultureSpent,0);
});

// §9.1.1: the game's physical success cup has 22 counters, NOT both spare sets.
test('§9.1.1: the standard Success Check cup contains exactly 10/5/4/3 counters',()=>{
  const state=official('plains');
  const stock=state.pieces.filter(p=>p.location==='cup'&&p.type==='Marker');
  const tally=subtype=>stock.filter(p=>p.subtype===subtype).length;
  assert.deepEqual({success:tally('Success'),ap4:tally('Enemy AP 4'),ap3:tally('Enemy AP 3'),ap2:tally('Enemy AP 2')},
    {success:10,ap4:5,ap3:4,ap2:3});
  assert.equal(stock.length,22,'Spare counters must not double the cup');
});

test('§9.1.2: all 24 A–F Enemy Instructions start face-up in their own printed row',()=>{
  const state=official('plains');
  for(const owner of ['North','West','South','East'])for(const row of 'ABCDEF'){
    const slot=`enemy-display:${owner}:${row}`;
    const pieces=state.pieces.filter(p=>p.type==='Instruction'&&p.location===slot);
    assert.equal(pieces.length,1,`Exactly one ${owner} instruction at row ${row}`);
    assert.equal(pieces[0].owner,owner,'Instruction must belong to printed Enemy column');
    assert.equal(pieces[0].flipped,false,'Non-striped face must be showing');
  }
  assert.equal(state.pieces.filter(p=>p.type==='Instruction'&&p.location.startsWith('enemy-inactive:')).length,0);
});
test('§9.1.2/§9.5.N: G counter locations differ between 1700 and Downfall setups',()=>{
  for(const [scenario,south] of [['plains','reserve'],['downfall','cup']]){
    const state=official(scenario);
    const location=owner=>state.pieces.find(p=>p.type==='Instruction'&&p.owner===owner&&/ G(?:\b|$)/.test(p.label)).location;
    assert.equal(location('North'),'operations');
    assert.equal(location('South'),south);
    assert.equal(location('West'),'reserve');
    assert.equal(location('East'),'reserve');
  }
});

const PRINTED_1700_TRIBES = [
  'UA-4','UA-5','LE-2','LE-6','RG-1','RG-2','RG-5','RG-6',
  'BC-2','BC-4','RR-1','RR-2','RR-3','RR-5','LA-1','LA-2','LA-3'
];
for(const scenario of ['plains','rise','lords','campaign']){
  test(`§9.2.C-D: ${scenario} begins with printed Tribes and a Bison in each empty round space`,()=>{
    const state=official(scenario);
    const tribes=state.pieces.filter(p=>p.type==='Tribe'&&inPlay(p));
    const bison=state.pieces.filter(p=>p.type==='Bison'&&inPlay(p));
    assert.deepEqual(tribes.map(p=>p.location).sort(),[...PRINTED_1700_TRIBES].sort());
    const blocked=new Set([...PRINTED_1700_TRIBES,'UA-1']);
    const empty=[];
    for(const t of ['UA','LA','LE','RR','RG','BC'])for(let n=1;n<=6;n++){
      const space=`${t}-${n}`;
      if(!blocked.has(space))empty.push(space);
    }
    assert.deepEqual(bison.map(p=>p.location).sort(),empty.sort());
  });
  test(`§9.2.B,E,G: ${scenario} has one UA-1 Ranchería, three strength-2 Bands, four Horses and 3/3/1/0 tracks`,()=>{
    const state=official(scenario);
    assert.deepEqual(state.pieces.filter(p=>p.type==='Rancheria'&&inPlay(p)).map(p=>p.location),['UA-1']);
    const ranch=state.pieces.find(p=>p.type==='Rancheria'&&p.location==='UA-1');
    assert.equal(state.pieces.filter(p=>p.type==='Band'&&p.strength===2&&p.location===`box:${ranch.id}`).length,3);
    assert.equal(state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location===`box:${ranch.id}`).length,4);
    assert.deepEqual([state.tracks.military,state.tracks.culture,state.tracks.ap,state.tracks.enemyAp],[3,3,1,0]);
    assert.equal(state.tracks.operations,0);
  });
}
test('§9.2.I: official 1700 opening has Development #1–3 in play and #4–21 in the draw deck',()=>{
  const state=official('plains');
  const development=state.cards.filter(c=>c.kind==='Development');
  for(let n=1;n<=3;n++)assert.equal(development.find(c=>Number(c.identifier)===n)?.zone,'In play');
  for(let n=4;n<=21;n++)assert.equal(development.find(c=>Number(c.identifier)===n)?.zone,'Deck');
});
test('§9.5.B-D: Downfall places exact West/South Settlements and seven North Tribes',()=>{
  const state=official('downfall');
  const settlements=state.pieces.filter(p=>p.type==='Settlement'&&inPlay(p)).map(p=>`${p.owner}:${p.location}`).sort();
  assert.deepEqual(settlements,['West:RG-1','South:RG-4','South:RG-5','South:BC-6'].sort());
  const tribes=state.pieces.filter(p=>p.type==='Tribe'&&inPlay(p)).map(p=>p.location).sort();
  assert.deepEqual(tribes,['RG-2','BC-4','RR-1','RR-2','LA-1','LA-2','LA-3'].sort());
});
test('§9.5.E–G: Downfall must not invent placement of nine Bison, three Rancherías or six Bands',()=>{
  const state=official('downfall');
  assert.equal(state.pieces.filter(p=>p.type==='Bison').length,9);
  assert.equal(state.pieces.filter(p=>p.type==='Bison'&&inPlay(p)).length,0);
  assert.equal(state.pieces.filter(p=>p.type==='Rancheria'&&inPlay(p)).length,0);
  assert.equal(state.pieces.filter(p=>p.type==='Band'&&inPlay(p)).length,0);
  assert.deepEqual(state.pieces.filter(p=>p.type==='Band').map(p=>p.strength).sort(),[1,1,2,2,2,2]);
});
