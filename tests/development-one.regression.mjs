/** Rule oracles: original Development I card-face transcription D10 and D15.
 * These are isolated eligible positions from an official scenario inventory;
 * they do NOT certify reaching them from a fresh setup or full-game completion.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,perform,passageAutomationStatus} from '../assets/engine.js';
function passageWithHeldProminent(){
 const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 s.phase='execution';s.operation='Passage of Time';
 s.steps={pt1:'done',pt2:'done',pt3:'done',pt4:'done',pt5:'done'};
 s.tracks.passage=2;
 const card=s.cards.find(c=>c.kind==='Development'&&c.identifier==='10');
 assert(card);card.zone='Hand';
 return s;
}
test('D10 printed outcome: play held card instead of one Headman Death Check; card discarded and Passage advances',()=>{
 const s=passageWithHeldProminent();
 assert.equal(passageAutomationStatus(s).ready,false,'Do not auto-skip the card-play window');
 const next=perform(s,{type:'PASSAGE_PLAY_PROMINENT_HEADMAN',headmanId:'setup-mahimiana-A'});
 assert.equal(next.cards.find(c=>c.kind==='Development'&&c.identifier==='10').zone,'Discard');
 assert.equal(next.tracks.passage,3,'Card discarded during Passage advances the track one space');
 assert.deepEqual(next.passageProminentExemptIds,['setup-mahimiana-A']);
 const finish=perform(next,{type:'PASSAGE_AUTO_HEADMAN_DEATH'});
 assert.equal(finish.pieces.find(p=>p.id==='setup-mahimiana-A').medicine,2,'Selected Mahimiana must not undergo a check');
 assert.equal(finish.steps.pt6,'done');
});
test('D10 cannot be played after the Headman Death Checks are complete',()=>{
 const s=passageWithHeldProminent();s.steps.pt6='done';
 assert.throws(()=>perform(s,{type:'PASSAGE_PLAY_PROMINENT_HEADMAN',headmanId:'setup-mahimiana-A'}),/Passage|step|already/i);
});
test('D15 printed Headman Action may not be played without an available actor',()=>{
 const s=perform(newGame('plains'),{type:'APPLY_SCENARIO_SETUP',scenario:'plains'});
 s.phase='execution';s.operation='Planning';s.planningStage=4;
 const card=s.cards.find(c=>c.kind==='Development'&&c.identifier==='15');assert(card);card.zone='Hand';
 assert.throws(()=>perform(s,{type:'DEVELOPMENT_PLAY_NEGOTIATION',warId:'not-a-war'}),/Headman Action|Paraibo|eligible/i);
});
