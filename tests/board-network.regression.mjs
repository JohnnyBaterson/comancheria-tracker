/** Source: COMANCHERIA_BOARD_CONNECTION_NETWORK.md, based on owner's board image.
 * Tests observable movement-network and saved-game reconciliation outcomes;
 * does not assert graph completeness or substitute code-derived expectations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,enemyColorNetwork,mapSpaceSignature} from '../assets/engine.js';
import {topologyReport} from '../assets/map-topology-audit.js';
const opening=()=>perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
const sourceCounts={solid:20,dashed:8,West:5,South:8,East:18,shared:1};
test('Official setup records 43 spaces and exactly 58 distinct documented physical links',()=>{
 const s=opening(),audit=topologyReport(s);
 assert.equal(audit.spaceCount,43);assert.equal(audit.edgeCount,58);
 assert.equal(audit.duplicate.length,0);assert.equal(audit.invalid.length,0);
 assert.equal(audit.sourceCovered,58);assert.equal(audit.sourceConflicts.length,0);
 assert.equal(audit.officialGraphVerified,false,'Partial source does not certify all board links');
 const uncolored=s.edges.filter(e=>!e.enemyFor?.length);
 assert.equal(uncolored.filter(e=>e.kind==='solid').length,sourceCounts.solid);
 assert.equal(uncolored.filter(e=>e.kind==='dashed').length,sourceCounts.dashed);
 for(const enemy of ['West','South','East'])assert.equal(s.edges.filter(e=>e.enemyFor?.includes(enemy)).length,sourceCounts[enemy]);
 assert.equal(s.edges.filter(e=>e.enemyFor?.length===2).length,1);
});
test('Enemy corridors use printed color rather than every geometrically solid line',()=>{
 const s=opening();
 const west=enemyColorNetwork(s,'West').reachable;
 assert(west.includes('LE-1')&&west.includes('RG-2'));
 assert(!west.includes('LA-1'),'West must not borrow East Enemy corridor');
 const south=enemyColorNetwork(s,'South').reachable;
 assert(south.includes('BC-4')&&south.includes('BC-6'));
 assert(!south.includes('RR-4'),'South must not borrow East Enemy corridor');
 const east=enemyColorNetwork(s,'East').reachable;
 assert(east.includes('BC-4')&&east.includes('BC-6'));
 assert(!east.includes('RG-5'),'East must not borrow South-only corridor');
});
test('An uncolored old save does not automatically gain an Enemy route or source certification',()=>{
 const s=opening(),edge=s.edges.find(e=>['BC-4','BC-6'].includes(e.a)&&['BC-4','BC-6'].includes(e.b));
 delete edge.enemyFor;
 const report=topologyReport(s);
 assert.equal(report.sourceCovered,57);assert.equal(report.sourceConflicts.length,1);
 assert(!enemyColorNetwork(s,'South','BC-4').reachable.includes('BC-6'));
 assert(!enemyColorNetwork(s,'East','BC-4').reachable.includes('BC-6'));
 const repaired=perform(s,{type:'APPLY_MAP_EVIDENCE'});
 const after=topologyReport(repaired);
 assert.equal(after.sourceCovered,58);assert.equal(after.sourceConflicts.length,0);
 assert(enemyColorNetwork(repaired,'South','BC-4').reachable.includes('BC-6'));
 assert(enemyColorNetwork(repaired,'East','BC-4').reachable.includes('BC-6'));
 assert.equal(s.edges.find(e=>e===edge)?.enemyFor,undefined,'Original game must remain unchanged');
});
test('An incorrect existing Enemy color is a conflict, not silently overwritten',()=>{
 const s=opening(),edge=s.edges.find(e=>(e.a==='BC-4'&&e.b==='BC-6'));
 edge.enemyFor=['East'];
 assert.equal(topologyReport(s).sourceConflicts.length,1);
 const original=JSON.stringify(s);
 assert.throws(()=>perform(s,{type:'APPLY_MAP_EVIDENCE'}),/conflict/i);
 assert.equal(JSON.stringify(s),original,'Failed reconciliation must be atomic');
});
test('Physical map sign-off detects enemy-color edits, not merely endpoint/style edits',()=>{
 const s=opening(),before=mapSpaceSignature(s,'BC-4');
 s.edges.find(e=>e.a==='BC-4'&&e.b==='BC-6').enemyFor=['East'];
 assert.notEqual(mapSpaceSignature(s,'BC-4'),before);
});
test('Reservation has no drawn links in current inventory; dashed lines reach Palo Duro',()=>{
 const s=opening();
 assert.equal(s.edges.filter(e=>e.a==='RESERVATION'||e.b==='RESERVATION').length,0);
 assert.equal(s.edges.filter(e=>(e.a==='PD'||e.b==='PD')&&e.kind==='dashed').length,4);
 assert.equal(s.edges.filter(e=>(e.a==='N'||e.b==='N')&&e.kind==='solid').length,1);
});
