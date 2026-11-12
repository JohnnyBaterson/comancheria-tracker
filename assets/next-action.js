/** Turn director: an advisory layer, never a replacement for rule validation.
 * Each proposed engine command is checked by perform before it can commit.
 * Stand-in simulations use the same proposals; no physical-board attestations.
 */
import {activeBandChoices} from './band-action-menu.js';
import {cupDrawable} from './cup-system.js';
import {planningActionChoices} from './planning-action-menu.js';
import { OPERATIONS, requiredPassage, warAutomationStatus, passageAutomationStatus, battleSafeRoundPreview, battleSafeStartPreview, eligibleBattleUnits, battleAutoResolutionPreview, rancheriaFightPreview, rancheriaSacrificePreview, warRancheriaObligations, warBattleObligations, safeNext, checklist, cultureGainPreview, cultureCardEffectAudit, culturePurchaseOptions, santaFeTrailPlacementPreview, raidPeaceResolutionPreview, enemyAutomationPreview, enemyApPreview, peaceTargetPreview, verifiedHistoryEnemy,VERIFIED_HISTORY_NAMED_ENEMIES, DISPLAY_ROWS, SPACE, SPACES, getStackingProblems, allyTargetPreview, recoverTargetAudit, settleTargetAudit, subjugateTargetAudit, activeCardEffects, DEVELOPMENT_EFFECT_CATALOG, cultureActive, perform, cultureWarEvasionOptions, historyObjectiveAudit, openingLedgerAudit, scenarioSetupOptions, SCENARIOS, cupColonialTargetPreview, cupWarRaidAutoPreview, safeNext as setupSafeNext } from './engine.js';

const stepLabels = {
  WAR_AUTO_UNTIL_CHOICE: 'Resolve the War phase',
  PASSAGE_AUTO_PROGRESS: 'Apply the next Passage rule',
  ADVANCE: 'Continue to the next phase',
};
const auto = (title, detail, command) => ({kind:'automatic', title, detail, command});
const decision = (title, detail, choices=[]) => ({kind:'player',title,detail,choices});
const blocked = (title, detail) => ({kind:'evidence',title,detail});
// Show an automatic cup option only when the reducer's safety preconditions hold.
// A card override or Recover priority remains a real decision, never a fake auto-move.
function sameTerritoryBison(s){
 const bison=s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round');
 return bison.length>1&&new Set(bison.map(p=>SPACE[p.location].territory)).size===1;
}
function cupForcedEncroach(s,drawn){
 if(!drawn||!['Encroach','Ally'].includes(String(drawn.subtype||'')))return false;
 if(!cupEffectCanAuto(s,drawn,'Encroach'))return false;
 if(drawn.subtype==='Ally'&&(!cupEffectCanAuto(s,drawn,'Ally')||allyTargetPreview(s,drawn.owner).candidates.length))return false;
 const stock=s.pieces.filter(p=>p.type==='Tribe'&&p.location==='reserve');
 const free=Object.values(SPACE).filter(q=>q.type==='round'&&!s.pieces.some(p=>p.location===q.id&&['Rancheria','Settlement','Tribe','Band'].includes(p.type)));
 return stock.length===1&&free.length===1;
}
function cupEmptyRedirect(s,drawn){
 if(!drawn||!cupEffectCanAuto(s,drawn,'Hunt')||!cupEffectCanAuto(s,drawn,'Encroach'))return false;
 const kind=String(drawn.subtype||'').toLowerCase();
 if(!['encroach','ally'].includes(kind))return false;
 if(kind==='ally'&&(!cupEffectCanAuto(s,drawn,'Ally')||allyTargetPreview(s,drawn.owner).candidates.length))return false;
 const tribeStock=s.pieces.some(p=>p.type==='Tribe'&&p.location==='reserve');
 const empty=Object.values(SPACE).some(space=>space.type==='round'&&!s.pieces.some(p=>p.location===space.id&&['Rancheria','Settlement','Tribe','Band'].includes(p.type)));
 return !(tribeStock&&empty)&&!s.pieces.some(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round');
}
function cupEffectCanAuto(s,drawn,kind){
 if(!drawn||!['Hunt','Ally','Encroach'].includes(kind))return false;
 const recover=recoverTargetAudit(s,drawn.owner);
 if(recover.candidates.length||recover.ambiguousRavaged.length)return false;
 if(activeCardEffects(s).some(e=>e.blockedInstructions?.includes(kind)&&(!e.enemies||e.enemies.includes(drawn.owner))))return false;
 return !s.cards.some(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone)&&(
  !DEVELOPMENT_EFFECT_CATALOG[String(c.identifier||'').replace(/\D/g,'')]
  ||DEVELOPMENT_EFFECT_CATALOG[String(c.identifier||'').replace(/\D/g,'')].mode.startsWith('manual-required')));
}

// Automatic cup Peace is safe only if its §6.3.5 War, Recover,
// replacement and active-card exceptions are all known to be absent.
function cupSafeSimplePeace(s,p){
 if(!p||p.type!=='Instruction'||!['North','South','East','West'].includes(p.owner))return false;
 const target=peaceTargetPreview(s,p.owner);
 if(target.recoverFirst||target.unknownRavaged||target.requiresWarProcedure||target.replace.length)return false;
 const rec=recoverTargetAudit(s,p.owner);
 if(rec.candidates.length||rec.ambiguousRavaged.length)return false;
 const known=activeCardEffects(s);
 if(known.some(x=>x.blockedInstructions?.includes('Peace')&&(!x.enemies||x.enemies.includes(p.owner))))return false;
 return !s.cards.some(c=>c.kind==='Development'&&['In play','Display'].includes(c.zone)&&(!DEVELOPMENT_EFFECT_CATALOG[String(c.identifier||'').replace(/\D/g,'')]||DEVELOPMENT_EFFECT_CATALOG[String(c.identifier||'').replace(/\D/g,'')].mode.startsWith('manual-required')));
}
/** Optional, reproducible computer-player setup: never silently chooses for a human.
 * Test every proposed placement against the production reducer, including
 * the real two-territory-control requirement. */
function autoDownfallRancherias(s){
 const occupied=new Set(s.pieces.filter(p=>['Tribe','Settlement','Bison','Band','Rancheria'].includes(p.type)).map(p=>p.location));
 const spaces=SPACES.filter(p=>p.type==='round'&&!occupied.has(p.id));
 for(const a of spaces)for(const b of spaces){
  if(b.territory===a.territory)continue;
  for(const c of spaces){
   if(c.territory===a.territory||c.territory===b.territory)continue;
   const command={type:'SETUP_DOWNFALL_RANCHERIAS',spaces:{A:a.id,B:b.id,C:c.id}};
   try{perform(s,command);return command;}catch{}
  }
 }
 return null;
}
const downfallStockChoice={type:'SETUP_DOWNFALL_RESOURCES',allocation:{
 A:{band2:2,band1:0,horses:3,trade:1},
 B:{band2:1,band1:1,horses:3,trade:0},
 C:{band2:1,band1:1,horses:2,trade:0}
}};
const downfallMedicineChoice={type:'SETUP_DOWNFALL_MEDICINE',medicine:Object.fromEntries(
 ['A','B','C'].flatMap(letter=>['paraibo','mahimiana'].map(kind=>[`${letter}-${kind}`,2])))};
/** Output is intentionally plain, serializable data for UI and test harnesses. */
export function nextPlayerPrompt(s) {
  if(s.phase==='gameover')return {kind:'finished',title:'Campaign finished',detail:s.gameResult?.reason||'Review the recorded result.'};
  if(s.phase==='setup'){
    if(s.setupTemplate!=='official')return decision('Choose an official scenario','Select a printed starting scenario; the engine will load its actual starting counters.',SCENARIOS.map(([id,label])=>({label,command:{type:'APPLY_SCENARIO_SETUP',scenario:id}})));
    const audit=openingLedgerAudit(s);
    if(audit.remaining.some(x=>!x.ok))return blocked('Correct starting inventory',audit.remaining.filter(x=>!x.ok).map(x=>`${x.key}: ${x.reason}`).join(' '));
    if(audit.remaining.length)return auto('Verify printed opening inventory',`Validate ${audit.remaining.map(x=>x.key).join(', ')} from the official scenario ledger. This does not claim unknown physical evidence.`,{type:'SETUP_AUDIT_LEDGER'});
    if(s.scenario==='downfall'){
      const ordered=[['bison','nine Bison placements'],['rancherias','three Rancherías'],['resources','Band and resource allocation'],['medicine','six headman Medicine ratings']];
      const missing=ordered.find(([key])=>!s.setupConfirmed?.[key]);
      if(missing){
       if(missing[0]==='bison')return auto('Roll nine Downfall Bison positions','Use the board’s six-face territory die and numbered area die; reroll spaces already occupied by printed counters.',{type:'SETUP_DOWNFALL_ROLL_BISON'});
       const proposal=missing[0]==='rancherias'?autoDownfallRancherias(s):missing[0]==='resources'?downfallStockChoice:downfallMedicineChoice;
       if(proposal){
        try{perform(s,proposal);return decision('Downfall: '+missing[1],
          'This is a genuine player setup choice. You can arrange it yourself in the board controls, or explicitly let the computer choose the shown legal default.',
          [{label:'Let the computer choose a legal starting setup',command:proposal}]);}catch{}
       }
       return blocked('Downfall: '+missing[1],`Use the on-board setup form for ${missing[1]}; no automatically verified legal choice was available.`);
      }
    }
    if(!s.setupCultureFinished){
      const options=scenarioSetupOptions(s).availableCulture.filter(x=>x.eligible);
      return decision('Choose starting Culture cards',s.scenario==='downfall'?'Spend up to 12 points following the printed prerequisites or finish your selection.':'Choose a free Level 1 card, or decline.',[
        ...options.map(c=>({label:`${c.family} level ${c.level}`,command:{type:'SETUP_CULTURE_CARD',cultureId:c.id}})),
        {label:'Finish starting Culture selection',command:{type:'SETUP_CULTURE_FINISH'}}]);
    }
    if(s.scenario==='downfall'&&!s.setupConfirmed?.development){
      if(s.developmentPending)return blocked('Resolve the starting Development effect','The third Development card has a mandatory printed reveal effect; resolve it through the board before continuing.');
      if(s.setupDevelopmentRoll)return auto('Finish Downfall Development setup','The third starting card has been revealed and its recorded effect resolved.',{type:'SETUP_FINISH_DEVELOPMENT'});
      if(!s.setupDevelopmentPendingDie)return auto('Roll Downfall Development die','Roll a digital 1d6 to reveal #26, #28 or #38 (§9.5.L).',{type:'SETUP_DOWNFALL_DEVELOPMENT_ROLL'});
      const pending=s.setupDevelopmentPendingDie;
      const choices=[{label:`Accept die ${pending.die} and reveal card`,command:{type:'SETUP_DOWNFALL_DEVELOPMENT_COMMIT'}}];
      if(pending.rerolls===0&&s.pieces.some(p=>p.id==='setup-downfall-trade'&&p.location.startsWith('box:')))choices.push({label:'Spend Trade Goods to reroll',command:{type:'SETUP_DOWNFALL_DEVELOPMENT_REROLL'}});
      return decision('Downfall Development die: '+pending.die,'Accept the rolled die or spend a Trade Goods for one reroll before committing the card reveal.',choices);
    }
    if('cards-war' in (s.setupChecklist||{})&&!s.setupConfirmed?.['cards-war'])return auto(
      'Prepare the digital War deck',
      'Verify all 25 distinct recorded War Card identities. The engine draws randomly from the remaining cards; this does not attest to a physical shuffle.',
      {type:'SETUP_PREPARE_DIGITAL_WAR_DECK'});
    if(s.scenario==='downfall'&&s.setupChecklist?.physical&&!s.setupConfirmed?.physical){
      const proposal={type:'SETUP_AUDIT_DOWNFALL_DIGITAL_STOCK'};
      try{perform(s,proposal);return auto('Audit the Downfall digital stock','Validate recorded cards, counters and player-selected setup. This does not certify actual physical components or unverified card effects.',proposal);}catch{}
    }
    const unchecked=Object.keys(s.setupChecklist||{}).filter(key=>!s.setupConfirmed?.[key]);
    if(unchecked.length){
      // Do not strand the player at the removed setup form. Only expose manual
      // acknowledgements for keys that the authoritative reducer permits.
      // All generated/digital checks remain on their dedicated validated paths.
      const key=unchecked[0];
      const command={type:'CONFIRM_SETUP',key,value:true};
      try{
        perform(s,command);
        return decision(`Check starting board: ${key}`,s.setupChecklist[key]+' Inspect the printed board/counters, then confirm this ONE item. No printed shuffle or artwork check is claimed automatically.',[
          {label:`Verified ${key} on my board`,command}
        ]);
      }catch(error){
        return blocked(`Starting setup: ${key}`,`This step needs a specific in-game action before continuing: ${s.setupChecklist[key]}. ${error.message}`);
      }
    }
    const ready=setupSafeNext(s);
    return ready.ok?auto('Begin the official scenario','Opening ledger and all player-supplied setup decisions have been completed.',{type:'START'}):blocked('Resolve remaining setup issue',ready.message);
  }
  if(s.pending?.type==='raid'&&s.raidCupResolution){
    const c=s.raidCupResolution, drawn=s.pieces.find(p=>p.id===c.counterId);
    if(!drawn)return blocked('Missing drawn Enemy Instruction','Reconcile the cup counter ledger before proceeding.');
    const name=String(drawn.subtype||drawn.label||'');
    if(c.stage==='effect'){
      if(/^culture attack/i.test(name))return auto('Raid cup: Culture Attack','Apply the verified attack and continue to the display exchange.',{type:'RAID_CUP_CULTURE_ATTACK'});
      if(/^hunt/i.test(name)&&!s.pieces.some(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round'))return auto('Raid cup: Hunt, no Bison','Resolve the no-Bison case, subject to Recover priority.',{type:'RAID_CUP_EMPTY_HUNT'});
      if(cupEffectCanAuto(s,drawn,'Hunt')&&/^hunt/i.test(name)&&s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round').length===1)return auto('Raid cup: hunt the only Bison','The game makes the seeded territory roll, then removes the sole possible Bison.',{type:'RAID_CUP_SINGLE_BISON_HUNT'});
      if(cupEffectCanAuto(s,drawn,'Hunt')&&/^hunt/i.test(name)&&sameTerritoryBison(s))return auto('Raid cup: hunt Bison in one territory','All Bison are in the same territory. Roll the digital territory die, then randomly choose the Bison to return to stock.',{type:'RAID_CUP_SAME_TERRITORY_HUNT'});
      if(cupEffectCanAuto(s,drawn,'Hunt')&&/^hunt/i.test(name))return auto('Raid cup: full digital Hunt','Roll the territory die, cycle through empty territories, randomly remove one Bison and continue the mandatory display exchange.',{type:'RAID_CUP_GUIDED_HUNT'});
      if(cupEffectCanAuto(s,drawn,'Ally')&&/^ally/i.test(name)&&allyTargetPreview(s,drawn.owner).candidates.length===1)return auto('Raid cup: ally the only eligible Tribe','The sole eligible Tribe receives the drawn Ally Instruction.',{type:'RAID_CUP_SINGLE_ALLY'});
      if(cupEffectCanAuto(s,drawn,'Ally')&&/^ally/i.test(name)&&allyTargetPreview(s,drawn.owner).candidates.length>1)return decision('Raid cup: choose Allied Tribe','Select an eligible Tribe; the engine will place Ally and perform the mandatory exchange.',allyTargetPreview(s,drawn.owner).candidates.map(t=>({label:`Ally with ${t.label||t.id} (${t.location})`,command:{type:'RAID_CUP_CHOOSE_ALLY',tribeId:t.id}})));
      if(/^peace(?:\s|$)/i.test(name)&&cupSafeSimplePeace(s,drawn))return auto('Raid cup: place Peace','No War Column, old Peace or Recover target; place the Peace counter in its Enemy square and proceed to exchange.',{type:'RAID_CUP_PEACE'});
      if(cupForcedEncroach(s,drawn))return auto('Raid cup: forced Encroach','Exactly one stock Tribe and one legal round space. Resolve the territory roll, placement, and Bison removal automatically.',{type:'RAID_CUP_FORCED_ENCROACH'});
      if(cupEmptyRedirect(s,drawn))return auto('Raid cup: no-target Enemy redirect','No legal Tribe placement or Bison target exists, so finish the printed redirect and exchange the Instruction.',{type:'RAID_CUP_EMPTY_REDIRECT'});
      if(['War','Raid'].includes(name)&&cupWarRaidAutoPreview(s,true).ready)return auto('Raid cup: verified '+name,'The existing War/Raid resolver has one certified automatic outcome; exchange follows the effect.',{type:'RAID_CUP_AUTO_WAR_RAID'});
      if(['War','Raid'].includes(name))return blocked('Raid cup: resolve War/Raid', 'Choose a War Column, physical target and card modifiers where required; the engine will apply formation, movement and attrition, then exchange the Instruction.');
      if(['Settle','Subjugate'].includes(name)&&cupColonialTargetPreview(s,true).ready)return auto('Raid cup: automatic '+name,'The canonical map and physical stock determine the target; exchange follows the effect.',{type:'RAID_CUP_AUTO_COLONIAL'});
      if(['Settle','Subjugate'].includes(name))return blocked('Raid cup: resolve '+name+' on the board', 'Choose the real '+name+' target in the guided form. The engine validates the recorded colored route, pieces and Recovery priority and then advances to the mandatory exchange.');
      return decision('Resolve the drawn Enemy Instruction',`The ${drawn.owner} ${name} effect must be applied before exchanging Instructions. Use the guided Enemy controls to reconcile this printed rule.`,[]);
    }
    if(c.stage==='swap'){
      if(c.swapDie===null)return auto('Raid cup: roll exchange die','Roll a seeded die for the mandatory Enemy Instruction exchange.',{type:'RAID_CUP_ROLL_SWAP'});
      return auto('Raid cup: exchange Instruction',`Die ${c.swapDie} identifies the occupied display row. Exchange the physical counters and continue.`,{type:'RAID_CUP_EXCHANGE'});
    }
  }
  if(s.pending?.type==='raid'){
    if(s.successCheck){
      const check=s.successCheck, remaining=check.expected-check.drawIds.length;
      if(remaining>0){
        if(!check.drawIds.length&&!check.warfareExtra&&cultureActive(s,'C06'))return decision('Warfare II: extra Success Check draw?','Declare the extra counter BEFORE making any draws, or continue with the ordinary number.',[{label:`Draw ${remaining+1} counters (Warfare II)`,command:{type:'CULTURE_WARFARE_EXTRA_DRAW'}},{label:`Draw usual ${remaining} counters`,command:{type:'DIGITAL_CUP_DRAW',all:true}}]);
        if(!check.drawIds.length&&!check.tacticalAttempted&&s.cards.some(c=>c.kind==='Development'&&['17','42'].some(n=>String(c.identifier||'').replace(/\D/g,'')===n)&&c.zone==='Hand'))return decision('Play Tactical Advantage?', 'A Tactical Advantage card is in hand. Choose whether to attempt it before drawing.',[{label:'Draw without Tactical Advantage',command:{type:'DIGITAL_CUP_DRAW',all:true}}]);
        return auto('Raid: draw Success counters',`Draw ${remaining} more counters from your recorded cup.`,{type:'DIGITAL_CUP_DRAW',all:true});
      }
      const guns=s.pieces.some(p=>p.type==='Resource'&&p.subtype==='Guns'&&p.location===`held:${check.bandId}`);
      const enemyAp=check.drawIds.some(id=>s.pieces.some(p=>p.id===id&&p.location==='check-draw'&&/^Enemy AP [234]$/.test(p.subtype)));
      const tradeGoods=s.pieces.some(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location===`held:${check.bandId}`);
      if(tradeGoods||guns&&enemyAp){
        // These are real, reducer-validated on-board decisions. Never send
        // the player to the deprecated forms for Raid cup resources.
        const choices=[];
        const apCounters=check.drawIds.map(id=>s.pieces.find(p=>p.id===id)).filter(p=>p&&p.location==='check-draw'&&/^Enemy AP [234]$/.test(p.subtype)&&!check.gunAttempts.some(a=>a.counterId===p.id));
        const carried=s.pieces.filter(p=>p.type==='Resource'&&p.location===`held:${check.bandId}`);
        for(const gun of carried.filter(p=>p.subtype==='Guns'))for(const ap of apCounters){
          const command={type:'GUNS_CANCEL_AP',gunId:gun.id,counterId:ap.id,digitalDie:true};
          try{perform(s,command);choices.push({label:`Use ${gun.label||'Guns'} against ${ap.subtype}`,command});}catch{}
        }
        for(const good of carried.filter(p=>p.subtype==='Trade Goods')){
          const command={type:'TRADE_GOODS_REDRAW',resourceId:good.id,digital:true};
          try{perform(s,command);choices.push({label:`Spend ${good.label||'Trade Goods'} to redraw all`,command});}catch{}
        }
        choices.push({label:'Keep the draw and count results',command:{type:'FINISH_SUCCESS_CHECK'}});
        return decision('Raid: spend carried resources?',`Choose directly on the board. Guns can cancel one drawn Enemy AP with a seeded die; Trade Goods return all draws to the cup for a full redraw.`,choices);
      }
      if(check.drawIds.some(id=>s.pieces.some(p=>p.id===id&&p.type==='Instruction')))return auto('Enemy Instruction drawn in Raid','Count and stage the draw. The Enemy effects and display exchanges must resolve before Raid rewards.',{type:'FINISH_SUCCESS_CHECK'});
      return auto('Raid: count the results',`All ${check.expected} counters are drawn. Resolve Success, Enemy AP and Medicine.`,{type:'FINISH_SUCCESS_CHECK'});
    }
    if(!s.lastSuccessCheck&&!s.pieces.some(p=>p.location==='cup'&&(p.type==='Instruction'||p.type==='Marker'&&/^(Success|Enemy AP [234])$/.test(p.subtype))))return blocked('Raid cup needs setup','The digital cup has no recorded counters. Load the verified physical counter supply before resolving a Raid.');
    if(!s.lastSuccessCheck&&s.cards.some(c=>c.kind==='Development'&&String(c.identifier||'').replace(/\D/g,'')==='32'&&c.zone==='Hand'))return decision('Play Skillful Warriors?', 'Use the held card in place of a Success Check, or proceed with the digital cup.',[{label:'Play Skillful Warriors',command:{type:'DEVELOPMENT_PLAY_SKILLFUL'}},{label:'Roll normal Success Check',command:{type:'RAID_DIGITAL_START'}}]);
    if(!s.lastSuccessCheck)return auto('Raid: make a Success Check','Use the digital dice and recorded cup. An existing Mahimiana uses his recorded Medicine.',{type:'RAID_DIGITAL_START'});
    const x=s.lastSuccessCheck;
    const peacePlan=raidPeaceResolutionPreview(s,s.pending.space);
    if(x.digital&&!x.instructions&&peacePlan.ready&&!s.pending.moonCardId){
      const warpath=Boolean(s.pending.warpath);
      const eligibleBonus=cultureActive(s,'C07')&&(x.drawnSuccesses??0)>0&&s.pieces.some(p=>p.location===s.pending.space&&['Tribe','Settlement'].includes(p.type));
      const choices=warpath?[{label:`Place ${x.successes} Ravaged counter(s)`,command:{type:'RAID_DIGITAL_REWARD',horses:0}}]:Array.from({length:x.successes+1},(_,horses)=>({label:`Claim ${horses} Horse${horses===1?'':'s'} and ${x.successes-horses} Captive${x.successes-horses===1?'':'s'}`,command:{type:'RAID_DIGITAL_REWARD',horses}}));
      if(eligibleBonus)choices.push(...(warpath?[0]:Array.from({length:x.successes+1},(_,i)=>i)).map(horses=>({label:warpath?`Place ${x.successes+1} Ravaged (Warfare III bonus)`:`Claim ${horses} Horse, ${x.successes-horses} Captives + bonus Ravaged (Warfare III)`,command:{type:'RAID_DIGITAL_REWARD',horses,bonusRavaged:true}})));
      if(choices.length)return decision(warpath?'Warpath: resolve Ravaged':'Raid successful: choose your spoils',`${x.successes} Success counters. The engine handles Ravaged, any verified Peace roll and card effects.`,choices);
    }
    return decision('Complete the Raid exception','A drawn Enemy Instruction, Peace Space roll or special Development Card must be resolved in Turn controls before the Raid can finish.',[]);
  }
  // A card effect with a verified reducer is a genuine player decision, not
  // an unimplemented blocker. All offered choices are tested against the same
  // reducer used by the interactive card forms; do not infer missing card text.
  if(s.developmentPending){
    const pending=s.developmentPending;
    const proposals=[];
    const offer=(label,command)=>{
      try{perform(s,command);proposals.push({label,command});}catch{}
    };
    if(pending.kind==='epidemic'){
      // The seeded card target spaces are already fixed in the ledger. Where
      // several Bands occupy one space, selecting which Band is affected is
      // a genuine player choice. Never reroll the card or silently choose.
      const contested=(pending.spaces||[]).filter(space=>
        !(pending.phase==='reveal'&&s.pieces.some(p=>p.type==='Rancheria'&&p.location===space))&&
        !(pending.phase==='end-take-actions'&&s.pieces.some(p=>p.type==='Tribe'&&p.location===space))
      ).map(space=>({space,bands:s.pieces.filter(p=>p.type==='Band'&&p.location===space)})).filter(x=>x.bands.length>1);
      let allocations=[{}];
      for(const {space,bands} of contested){
        allocations=allocations.flatMap(map=>bands.map(b=>({...map,[space]:b.id})));
        if(allocations.length>32)break;
      }
      if(allocations.length<=32)for(const bandChoices of allocations)
        offer(contested.length?`Apply Epidemic: ${Object.entries(bandChoices).map(([space,id])=>`${space} → ${id}`).join('; ')}`:'Apply the recorded Epidemic effects',
          {type:'DEVELOPMENT_RESOLVE_EPIDEMIC',bandChoices});
    }else if(pending.kind==='ute-displacement'){
      for(const space of pending.destinations||[])offer(`Move Ranchería to ${SPACE[space]?.name||space}`,{type:'DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT',space});
    }else if(pending.kind==='buffalo-hunters'){
      for(const bisonId of pending.bisonIds||[])offer(`Remove Bison ${bisonId}`,{type:'DEVELOPMENT_BUFFALO_RESOLVE',bisonId});
    }else if(['cuerno-medicine','quanah-medicine'].includes(pending.kind)){
      for(const mahimianaId of pending.chiefIds||[])offer(`Apply Medicine to ${mahimianaId}`,{type:'DEVELOPMENT_RESOLVE_MEDICINE',mahimianaId});
    }else if(pending.kind==='smallpox-end'){
      for(const bandId of pending.bandIds||[])offer(`Reduce Band ${bandId}`,{type:'DEVELOPMENT_RESOLVE_SMALLPOX',bandId});
    }else if(pending.kind==='nuevo-apacheria'){
      for(const tribe of s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location])){
        for(const space of Object.values(SPACE).filter(x=>x.territory==='RG'&&x.type==='round'))offer(`Move ${tribe.id} to ${space.name}`,{type:'DEVELOPMENT_NUEVO_APACHERIA',tribeId:tribe.id,space:space.id});
      }
    }else if(pending.kind==='horse-discard'){
      const ids=pending.horseIds||[],count=pending.required;
      if(Number.isInteger(count)&&count>=0&&count<=ids.length){
        // A valid default is offered only when the choice is forced; otherwise
        // the card form lets the player select exactly which Horses to lose.
        if(count===0||count===ids.length)offer(`Return ${count} Horse counters`,{type:'DEVELOPMENT_RESOLVE_HORSE_DISCARD',horseIds:count?ids:[]});
      }
    }
    // Mandatory, uniquely determined printed effects do not require an extra click.
    // Multi-option effects remain genuine player decisions.
    if(proposals.length===1&&['epidemic','ute-displacement','buffalo-hunters','smallpox-end','horse-discard'].includes(pending.kind))
      return auto(`Resolve Development #${pending.number}`,pending.reason||'Apply the uniquely determined mandatory card effect.',proposals[0].command);
    if(proposals.length)return decision(`Development #${pending.number}: ${pending.kind}`,pending.reason||'Choose a legal printed card effect.',proposals);
    if(pending.kind==='horse-discard'&&Number.isInteger(pending.required)&&Array.isArray(pending.horseIds)){
      return decision(`Development #${pending.number}: return Horses`,
        `Choose ${pending.required} of the ${pending.horseIds.length} actual Horse counters on the board, then return only those counters to stock.`,[]);
    }
    return blocked(`Development #${pending.number}: card choice needs review`,pending.reason||'No verified physical-board action exists for this effect yet.');
  }
  if(s.victoryPending&&s.passageResult?.digital){
    const audit=historyObjectiveAudit(s);
    const last={plains:1,rise:2,lords:3,downfall:4,campaign:4}[s.scenario];
    // Audit results are interval-proven: unresolved territories do not
    // invalidate a result that is already certain under either bound.
    if(audit.result!=='unknown'&&(audit.result==='not-met'||s.period===last)){
      const command={type:'PASSAGE_DIGITAL_OBJECTIVE_RESOLVE'};
      try{perform(s,command);return decision(`${audit.history}: ${audit.result==='met'?'objective achieved':'objective not achieved'}`,
        audit.reason,[{label:`Resolve ${audit.history} History Check from board`,command}]);}catch{}
    }
    if(audit.result==='met'&&s.period<last){
      return decision(`${audit.history} passed — advance History`,
        `${audit.reason} Before advancing, complete the printed History transition effects. The engine will remove the old draw deck and activate the new period's available Development cards automatically.`,
        [{label:`Printed H${s.period+1} effects resolved; advance`,command:{type:'RESOLVE_VICTORY_FROM_LEDGER',ack:true,transitionAck:true}}]);
    }
    return blocked(`${audit.history} objective needs board review`,audit.reason);
  }
  // Manual or ambiguous History checks must not fall through to an empty
  // legacy-form prompt. The player verifies the actual printed objective on
  // the board; the renderer stages this acknowledgement before committing.
  if(s.victoryPending){
    const audit=historyObjectiveAudit(s);
    return decision(`${audit.history}: check the printed History objective`,
      `${audit.reason} Review the original board and current History Card. The outcome is not safe to apply automatically; explicitly verify the result below.`,
      [{label:'Printed objective achieved',command:{type:'RESOLVE_VICTORY',met:true,ack:true,objectiveNote:`Player verified ${audit.history} printed objective against current board and card.`,transitionAck:true}},
       {label:'Printed objective not achieved',command:{type:'RESOLVE_VICTORY',met:false,ack:true,objectiveNote:`Player verified ${audit.history} printed objective against current board and card.`}}]);
  }
  if(s.battlePending){
    const audit=battleAutoResolutionPreview(s);
    const reroll=s.cards.some(c=>c.kind==='Development'&&Number(c.identifier)===9&&c.zone==='Hand')&&!s.battlePending.countingCoupReroll;
    if(audit.ready&&!reroll)return auto('Apply the recorded Battle result',audit.reason,{type:'BATTLE_AUTO_RECONCILE'});
    return decision('Battle die rolled — resolve the choice',reroll?'Counting Coup may reroll one die before consequences are applied. Choose to play it or resolve normally.':audit.reason,
      audit.ready?[{label:'Keep roll and apply consequences',command:{type:'BATTLE_AUTO_RECONCILE'}}]:[]);
  }
  if(s.battleContinuation){
    const audit=battleSafeRoundPreview(s);
    if(audit.ready)return auto('Fight the next verified Battle round',audit.reason,{type:'BATTLE_SAFE_ROUND'});
    let choices=[];
    try {
      const defenders=eligibleBattleUnits(s,s.battleContinuation.warId).units;
      choices=defenders.flatMap(unit=>{
        const option=battleSafeRoundPreview(s,unit.id);
        return option.ready?[{label:`Fight with ${unit.label||unit.id} (strength ${unit.strength}) · verified digital round`,command:{type:'BATTLE_SAFE_ROUND',unitId:unit.id}}]:[];
      });
    } catch {}
    if(choices.length)return decision('Choose the next Battle defender','This is a strategic player choice. Select an eligible Band to fight; the engine will roll and apply one safe round. Optional equipment and uncertified card effects require the guided Battle panel.',choices);
    return blocked('Battle needs guided resolution',audit.reason+' Open the guided Battle scorecard to select a defender, check optional equipment and any printed card effects; do not close the Battle without an applicable rule.');
  }
  if(s.pending||s.successCheck||s.battlePending||s.battleContinuation||s.developmentPending){
    return decision('Resolve the highlighted game decision', 'This outstanding battle or card procedure needs the next verified on-board action.',[]);
  }
  if(s.enemySelection){
    const staged=s.enemySelection;
    if(staged.enemy)return auto(`Flip ${staged.enemy} Instruction`, staged.die==null?`A card selected ${staged.enemy} without an Enemy Action Table roll. ${staged.displayDie!=null?'Reveal the already rolled display die '+staged.displayDie+'.':'Roll the display die now.'}`:`Enemy Action die ${staged.die} (${staged.history}) identifies ${staged.enemy}. Roll an independent display-row die and flip exactly that counter.`, {type:'ENEMY_BEGIN',kind:staged.kind,enemy:staged.enemy,die:staged.die,...(staged.source==='politics-display'||staged.source==='development-override'||(staged.die!=null&&verifiedHistoryEnemy(s,staged.die)===staged.enemy)?{}:{ack:true})});
    const named=VERIFIED_HISTORY_NAMED_ENEMIES[staged.history]||['North','West','South','East'];
    return decision(`Identify the Enemy on ${staged.history}`, `Enemy Action die ${staged.die}. The exact History Card mapping is not source-verified; check the printed card and then the game rolls the second die.`,named.map(enemy=>({label:`Printed result: ${enemy}`,command:{type:'ENEMY_BEGIN',kind:staged.kind,enemy,die:staged.die,ack:true}})));
  }
  if(s.enemyFlow){
    // A held No Relief card is an optional interrupt BEFORE automatic Recover.
    // Never consume the enemy's Recover die without presenting that choice.
    const f=s.enemyFlow,selected=s.pieces.find(p=>p.id===f.currentId);
    const heldNoRelief=s.cards.some(c=>c.kind==='Development'&&Number(c.identifier)===18&&c.zone==='Hand');
    const activeRecover=selected&&selected.type==='Instruction'&&selected.owner===f.enemy;
    if(heldNoRelief&&f.stage==='effect'&&!f.recoverResolved&&activeRecover){
      const targets=recoverTargetAudit(s,f.enemy);
      if(targets.candidates.length&&!targets.ambiguousRavaged.length){
        const play={type:'DEVELOPMENT_PLAY_NO_RELIEF'};
        try{perform(s,play);return decision('No Relief from War: use your held card?',
          'Enemy Recover has a target. Choose whether to discard Development #18 to prevent Recover, or allow the normal enemy roll.',
          [{label:'Play No Relief from War',command:play},{label:'Allow normal Enemy Recover',command:{type:'ENEMY_AUTO_RECOVER'}}]);}catch{}
      }
    }
    const status=enemyAutomationPreview(s);
    if(status.ready)return auto('Enemy Instruction: automatic effect',status.reason,status.command);
    if(f.stage==='effect'&&selected?.subtype==='Culture Attack'&&/unimplemented|uncertified|may override/i.test(status.reason||'')){
      const verified={type:'ENEMY_CULTURE_ATTACK',ack:true};
      try{perform(s,verified);return decision('Culture Attack: verify active card exceptions',
        'An active Development Card could alter this attack. Check its actual effect before confirming. If it changes the result, resolve the exception in the on-board controls instead.',
        [{label:'Checked cards: apply standard Culture Attack',command:verified}]);}catch{}
    }
    if(f.stage==='effect'&&selected?.subtype==='Ally'&&!f.allyResolved){
      // §6.3.1 is a real PLAYER CHOICE; surface reducer-validated target
      // options on the main board instead of a dead-end instruction prompt.
      const targets=allyTargetPreview(s,f.enemy);
      if(!targets.recoverFirst&&!targets.unknownRavaged&&!targets.encroachInstead){
        const choices=targets.candidates.map(tribe=>({
          label:`Ally with ${tribe.label||tribe.id} (${SPACE[tribe.location]?.name||tribe.location})`,
          command:{type:'ENEMY_ALLY',tribeId:tribe.id,ack:true}
        })).filter(c=>{try{perform(s,c.command);return true;}catch{return false;}});
        if(choices.length)return decision('Choose an Allied Tribe',
          'The printed Ally rule lets the player select any eligible non-Allied Tribe. This is a strategic player choice, not a random Enemy target.',choices);
      }
    }
    // Complete user-confirmed printed map is authoritative for route ranking.
    // Keep card effects, random tie selection and physical counter checks separate.
    if(f.stage==='effect'&&selected&&['Settle','Subjugate'].includes(selected.subtype)&&
       ['West','South','East'].includes(f.enemy)&&!f.settleResolved&&!f.subjugateResolved&&
       (!f.recoverResolved)&&!f.cultureAttackResolved){
      const onMapTribes=s.pieces.some(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round');
      if(selected.subtype==='Subjugate'&&onMapTribes){
        // Use the confirmed graph to offer legal nearest mapped targets.
        // East Subjugate checks BOTH squares; unlike East Settle, no origin die.
        const report=subjugateTargetAudit(s,f.enemy);
        const verify='Player compared both applicable Enemy origins, every visible Tribe, printed colored routes, History Card exceptions, and closest eligible area on the original board.';
        const tribes=s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round'&&report.nearestKnown&&report.reachable.some(x=>x.tribeId===p.id&&x.distance===report.nearestKnown.distance&&x.area===report.nearestKnown.area));
        const tieIds=new Set(report.tiedKnown.map(x=>x.tribeId));
        const choices=tribes.map(tribe=>{
          const found=report.reachable.find(x=>x.tribeId===tribe.id);
          // Ties require physical random selection; never falsely attest a roll.
          if(tieIds.size>1&&tieIds.has(tribe.id))return null;
          return {label:`Confirm printed Subjugate target: ${SPACE[tribe.location].name}`,
            detail:found?`Verified printed route: ${found.distance} connection(s); card exceptions still apply.`:'No legal colored route.',
            command:{type:'ENEMY_SUBJUGATE',tribeId:tribe.id,ack:true,
              mapVerification:verify,unmappedRouteConfirmed:false,randomConfirmed:false}};
        }).filter(Boolean).filter(choice=>{try{perform(s,choice.command);return true;}catch{return false;}});
        if(tieIds.size>1)return decision(`${f.enemy} Subjugate: roll among tied nearest Tribes`,
          `Verified map identifies ${tieIds.size} equally ranked nearest Tribes. Roll digitally to select one, then apply the printed action.`,
          [{label:'Roll die and resolve nearest Tribe',command:{type:'ENEMY_AUTO_NEAREST_TARGET'}}]);
        if(choices.length)return decision(`${f.enemy} Subjugate: confirm Tribe on the board`,
          `Map-selected nearest Tribe; confirm relevant History and card effects. ${report.warning}`+(tieIds.size>1?' The nearest recorded targets tie: make the required physical random selection using the on-board Enemy controls.':''),choices);
      }
      if(selected.subtype==='Settle'||!onMapTribes){
        // A Subjugate fallback may Settle, but cannot use the East Settle die
        // while the face still says Subjugate; the engine rejects that roll.
        if(f.enemy==='East'&&selected.subtype==='Settle'&&!f.settleOrigin){
          const command={type:'ENEMY_SETTLE_ROLL_ORIGIN'};
          try{perform(s,command);return decision('East Settle: roll origin',
            'The printed rules require an origin die before selecting a settlement destination.',
            [{label:'Roll East origin die',command}]);}catch{}
        }
        // With no Tribe, guide the printed Settle redirect whenever stock and a
        // recorded destination exist. For East Subjugate check both origins;
        // its face never becomes a Settle die-roll Instruction.
        const subjugateRedirect=selected.subtype==='Subjugate';
        const report=settleTargetAudit(s,f.enemy,{eastOrigin:subjugateRedirect?null:f.settleOrigin||null});
        const stock=s.pieces.filter(p=>p.type==='Settlement'&&p.location==='reserve'&&
            (p.owner===f.enemy||p.owner===s.colonial?.[f.enemy]));
        if(stock.length&&report.candidates.length){
          // Show reachable candidates; the user checks printed colored routes
          // and clicks the actual destination, using the canonical mapped graph.
          const verify='Player confirmed the printed colored Enemy route, the nearest eligible numbered space, current History Card exceptions, stacking and settlement stock by choosing this map location.';
          const choices=report.candidates.filter(target=>report.nearestKnown&&target.distance===report.nearestKnown.distance&&target.area===report.nearestKnown.area).map(target=>({
            label:`Confirm printed route: ${target.name}${target.distance!=null?` (${target.distance} recorded links)`:''}`,
            detail:'Verified closest colored route; confirm current card exceptions and stock.',
            command:{type:'ENEMY_SETTLE',settlementId:stock[0].id,space:target.space,
              eastOrigin:subjugateRedirect?undefined:f.settleOrigin||undefined,ack:true,mapVerification:verify,
              unmappedRouteConfirmed:false,randomConfirmed:false,bisonConfirmed:true}
          })).filter(choice=>{try{perform(s,choice.command);return true;}catch{return false;}});
          if(report.tiedKnown.length>1)return decision(`${f.enemy} ${subjugateRedirect?'Subjugate → Settle':'Settle'}: nearest destinations tie`,
            `Verified board connections identify ${report.tiedKnown.length} equally ranked legal destinations; choose using a seeded die.`,
            [{label:'Roll die and place Settlement',command:{type:'ENEMY_AUTO_NEAREST_TARGET'}}]);
          if(choices.length)return decision(`${f.enemy} ${subjugateRedirect?'Subjugate → Settle':'Settle'}: choose printed destination`,
            `The verified map selects the nearest eligible unoccupied location.${subjugateRedirect&&f.enemy==='East'?' Check both East squares; no origin die applies.':''} ${report.warning} Clicking a highlighted space explicitly confirms the printed check.`,choices);
        }
        if(subjugateRedirect)return blocked('Subjugate fallback: printed War pairing required',
          status.reason+' The map and stock are already known. Do not invent a War Instruction counter or skip this printed procedure.');
      }
    }
    return decision('Enemy Instruction needs your decision',status.reason+' Open the on-board Enemy controls for printed choices.',[]);
  }
  if(s.phase==='war'){
    const evade=cultureWarEvasionOptions(s);
    if(evade.length)return decision('Lords of the Plains: evade before attrition','Choose a Band or Ranchería destination before rolling the die, or decline the optional move. The game applies the result.',[...evade.map(o=>({label:o.label,command:{type:'CULTURE_WAR_EVADE',kind:o.kind,id:o.id,to:o.to}})),{label:'Decline evasion and continue War phase',command:{type:'CULTURE_WAR_EVADE_DECLINE'}}]);
    const status=warAutomationStatus(s);
    if(status.ready)return auto('Enemy turn: rules resolve automatically',status.reason,{type:'WAR_AUTO_UNTIL_CHOICE'});
    if(safeNext(s).ok)return auto('War phase complete','Move to Operation Selection.',{type:'ADVANCE'});
    if(s.steps?.w4==='done'&&s.steps?.w5!=='done'){
      const siege=warRancheriaObligations(s).find(o=>o.bandIds.length>0);
      if(siege){
        const fight=rancheriaFightPreview(s,siege.rancheriaId);
        const sacrifice=rancheriaSacrificePreview(s,siege.rancheriaId);
        const choices=[];
        // These are explicit *player attestations*, never automatic game facts.
        // Any unresolved North return target is handled in the full siege panel.
        if(fight.ready)choices.push({label:'Defend: I verified the printed Battle rules and counters · pay 1 Military',command:{type:'WAR_RANCHERIA_FIGHT',rancheriaId:siege.rancheriaId,ack:true}});
        if(sacrifice.ready&&!sacrifice.requiresNorthTarget)choices.push({label:'Sacrifice: I verified the counter ledger and card exceptions · pay 2 Military and Captives',command:{type:'WAR_RANCHERIA_SACRIFICE',rancheriaId:siege.rancheriaId,ack:true}});
        if(choices.length)return decision('Choose Ranchería siege response',`Ranchería ${siege.rancheriaId} in ${siege.location}: select a printed §3.1 step-5 response. The button confirms you personally checked the current physical counters and card exceptions; this is NOT an automatic decision.`,choices);
      }
    }
    const battles=warBattleObligations(s).filter(o=>!o.exempt);
    if(battles.length){
      const first=battleSafeStartPreview(s);
      if(first.ready)return auto('War step 4: fight verified Battle',first.reason,{type:'BATTLE_SAFE_START'});
      if(first.warId){
        const defenders=battles.find(b=>b.warId===first.warId)?.defenders||[];
        const choices=defenders.flatMap(unitId=>{
          const candidate=battleSafeStartPreview(s,unitId);
          return candidate.ready?[{label:`Fight with ${s.pieces.find(p=>p.id===unitId)?.label||unitId} · digital Battle round`,command:{type:'BATTLE_SAFE_START',unitId}}]:[];
        });
        if(choices.length)return decision('War step 4: choose defender',
          'The printed Battle is mandatory, but choosing between eligible defenders is a player decision. Optional Guns/Mahimiana and uncertified cards still require the guided Battle scorecard.',choices);
      }
      return blocked('War step 4: resolve a Battle',
      `${status.reason} ${battles.map(b=>`${b.location}: War Column ${b.warId}, eligible defenders ${b.defenders.join(', ')}`).join('; ')}. ${first.reason} Use the guided Battle controls when the digital preflight is not certified.`);
    }
    return blocked('War phase needs a verified on-board action',status.reason+' Use the War panel to resolve the printed exception; no automatic rule is certified here.');
  }
  if(s.phase==='selection'){
    if(!s.operation){
      const mandatory=requiredPassage(s);
      const choices=OPERATIONS.filter(x=>!mandatory||x==='Passage of Time').filter(x=>x!=='Passage of Time'||mandatory||s.tracks.operations!==0).map(x=>({label:x,command:{type:'SELECT_OPERATION',value:x}}));
      return decision(mandatory?'Passage of Time is compulsory':'Choose your next operation',mandatory?'The Operations marker or Band state requires Passage.':'You decide the strategy. The game will handle verified automatic effects after your choice.',choices);
    }
    const status=safeNext(s);
    if(status.ok)return auto(`Begin ${s.operation}`,'Your selected operation is ready.',{type:'ADVANCE'});
    return blocked('Operation needs attention',status.message);
  }
  if(s.phase==='execution'){
    if(['Culture','Take Actions'].includes(s.operation) && !s.operationEvents?.operationsRoll && s.tracks.operations===0 && s.operation==='Culture' && s.operationEvents?.cultureGain)return auto('Operations marker advances','From Start to 1: no die roll or player decision is required.',{type:'OPERATIONS_START_ADVANCE'});
    if(s.operation==='Passage of Time'){
      const status=passageAutomationStatus(s);
      if(status.ready)return auto('Passage: automatic rule',status.reason,{type:'PASSAGE_AUTO_PROGRESS'});
      if(status.complete&&safeNext(s).ok)return auto('Passage complete','Continue to Cleanup.',{type:'ADVANCE'});
      const missing=['pt2','pt3','pt4'].find(k=>!['done','na'].includes(s.steps[k]));
      if(missing==='pt2'){
        const choices=[];
        for(const ranch of s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
          const nextCost=(s.passageRecruitCounts?.[ranch.id]||0)+1;
          const stock=s.pieces.filter(p=>p.type==='Band'&&p.strength===1&&['reserve','out-of-play'].includes(p.location));
          const resources=s.pieces.filter(p=>p.location===`box:${ranch.id}`&&(p.type==='Bison'||p.type==='Resource'&&['Food','Captives'].includes(p.subtype)));
          // Offer a bounded set of distinct exact-or-overpaying combinations.
          const combinations=[];
          for(let mask=1;mask<(1<<Math.min(resources.length,8));mask++){
            const picked=resources.slice(0,8).filter((_,i)=>mask&(1<<i));
            const points=picked.reduce((n,p)=>n+(p.type==='Bison'||p.subtype==='Captives'?1:2),0);
            if(points>=nextCost)combinations.push({picked,points});
          }
          combinations.sort((a,b)=>a.points-b.points||a.picked.length-b.picked.length);
          for(const set of combinations.slice(0,5))if(stock.length){
            const command={type:'PASSAGE_RECRUIT_BAND',rancheriaId:ranch.id,bandId:stock[0].id,resourceIds:set.picked.map(p=>p.id)};
            try{perform(s,command);choices.push({label:`Recruit at ${ranch.label||ranch.id}: ${set.points} Pop Point(s), ${nextCost} required`,command});}catch{}
          }
        }
        choices.push({label:'Finish recruitment without creating more Bands',command:{type:'CHECK',key:'pt2',value:'done'}});
        return decision('Passage step 2: recruit Bands', 'Each new Band costs one more Pop Point at its Ranchería. Only available strength-1 counters and actual unpossessed Food, Bison or Captives are listed.',choices);
      }
      if(missing==='pt3'){
        const choices=[];
        for(const band of s.pieces.filter(p=>p.type==='Band'&&p.strength<3&&(SPACE[p.location]||p.location.startsWith('box:')))){
          const replacements=s.pieces.filter(p=>p.type==='Band'&&p.strength>band.strength&&['reserve','out-of-play'].includes(p.location));
          const resources=s.pieces.filter(p=>(p.location===`held:${band.id}`||band.location.startsWith('box:')&&p.location===band.location)&&(p.type==='Bison'||p.type==='Resource'&&['Food','Captives'].includes(p.subtype)));
          for(const replacement of replacements.slice(0,2))for(const resource of resources.slice(0,8)){
            const command={type:'PASSAGE_STRENGTHEN_BAND',bandId:band.id,replacementBandId:replacement.id,resourceIds:[resource.id]};
            try{perform(s,command);choices.push({label:`Strengthen ${band.label||band.id} (${band.strength} → ${replacement.strength}) using ${resource.label||resource.id}`,command});}catch{}
          }
        }
        // Rule §4.4 step 3: a Food counter in one Ranchería may supply
        // 1 Pop Point to each of two separate Bands in its Resources box.
        for(const ranch of s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
          const box=`box:${ranch.id}`;
          const foods=s.pieces.filter(p=>p.location===box&&p.type==='Resource'&&p.subtype==='Food');
          const bands=s.pieces.filter(p=>p.type==='Band'&&p.location===box&&p.strength<3);
          const replacements=s.pieces.filter(p=>p.type==='Band'&&['reserve','out-of-play'].includes(p.location));
          for(const food of foods.slice(0,3))for(let i=0;i<bands.length;i++)for(let j=i+1;j<bands.length;j++){
            const a=replacements.find(p=>p.strength===bands[i].strength+1);
            const b=replacements.find(p=>p.id!==a?.id&&p.strength===bands[j].strength+1);
            if(!a||!b)continue;
            const command={type:'PASSAGE_STRENGTHEN_BANDS',resourceIds:[food.id],upgrades:[{bandId:bands[i].id,replacementBandId:a.id},{bandId:bands[j].id,replacementBandId:b.id}]};
            try{perform(s,command);choices.push({label:`Use 1 Food to strengthen ${bands[i].label||bands[i].id} and ${bands[j].label||bands[j].id}`,command});}catch{}
            if(choices.length>=25)break;
          }
        }
        choices.push({label:'Finish strengthening',command:{type:'CHECK',key:'pt3',value:'done'}});
        return decision('Passage step 3: strengthen Bands','Validated single-Band and two-Band exchanges are offered. Shared Food must be unpossessed in the same Ranchería as both Bands.',choices);
      }
      if(missing==='pt4'){
        const choices=[];
        const bands=s.pieces.filter(p=>p.type==='Band'&&SPACE[p.location]?.type==='round'&&
          s.pieces.filter(q=>q.type==='Band'&&q.location===p.location).length===1&&
          !s.pieces.some(q=>q.location===p.location&&['Rancheria','Tribe','Settlement','War Column'].includes(q.type)));
        const stock=s.pieces.filter(p=>p.type==='Rancheria'&&p.location===`box:${p.id}`);
        for(const band of bands)for(const ranch of stock){
          const command={type:'PASSAGE_CREATE_RANCHERIA',bandId:band.id,rancheriaId:ranch.id};
          try{perform(s,command);choices.push({label:`Create ${ranch.label||ranch.id} from ${band.label||band.id} at ${SPACE[band.location]?.name||band.location}`,command});}catch{}
        }
        choices.push({label:'Do not establish a Ranchería this Passage',command:{type:'CHECK',key:'pt4',value:'na'}});
        return decision('Passage step 4: establish a Ranchería?',
          'Living Rules §4.4: you may create one new Ranchería from a lone Band. Only reducer-validated placements are listed; a carried Mahimiana is exchanged with the new Ranchería’s affiliated headman when its old affiliation and Medicine are known.',choices);
      }
      if(missing)return decision('Passage: optional improvements',status.reason,[
        {label:'Skip this optional step',command:{type:'CHECK',key:missing,value:'na'}}
      ]);
      if(!['done','na'].includes(s.steps.pt5))return decision('Passage: retire a Mahimiana?',status.reason,[
        {label:'Do not retire anyone',command:{type:'PASSAGE_FINISH_RETIREMENT'}}
      ]);
      if(!['done','na'].includes(s.steps.pt14)&&s.steps.pt13==='done'){
        const eligible=culturePurchaseOptions(s).filter(x=>x.eligible);
        return decision('Buy a Culture card?',status.reason,[
          ...eligible.map(x=>({label:`Purchase ${x.family} ${x.level} (${x.cost} Culture)`,command:{type:'PASSAGE_CULTURE_PURCHASE',cultureId:x.id}})),
          {label:'Decline this purchase',command:{type:'PASSAGE_CULTURE_DECLINE'}}
        ]);
      }
      if(!s.passageResult&&['pt1','pt2','pt3','pt4','pt5','pt6','pt7','pt8','pt9','pt10','pt11','pt12','pt13','pt14'].every(k=>['done','na'].includes(s.steps[k]))){
        const command={type:'PASSAGE_DIGITAL_FINISH'};
        try{perform(s,command);return decision('Passage: final History roll', 'The engine rolls the seeded Passage die, moves the marker and checks whether the History objective must be resolved.', [{label:'Roll digital Passage die',command}]);}catch{}
      }
      return decision('Your decision: Passage of Time',status.reason,[]);
    }
    if(s.operation==='Culture'){
      if(s.operationEvents?.cultureGain&&s.operationEvents?.operationsRoll&&['cu1','cu2','cu3'].some(k=>!['done','na'].includes(s.steps[k]))){
        const safeCards=cultureCardEffectAudit(s).safe;
        if(safeCards&&!cultureGainPreview(s).mismatches.length)return auto('Culture procedure complete','Both digital Culture gain and Operations check are recorded; finish the verified checklist without asking for redundant acknowledgements.',{type:'CULTURE_AUTO_CHECKLIST'});
      }
      if(!s.operationEvents?.cultureGain){
        const p=cultureGainPreview(s);
        if(p.mismatches?.length)return blocked('Culture needs board evidence','Territory control is ambiguous. Review the map and enter the confirmed territories in Turn controls.');
        if(cultureCardEffectAudit(s).safe)return auto('Culture rises',`Gain +${p.gain} gross Culture from verified territory ledger (maximum 9).`,{type:'CULTURE_DIGITAL_GAIN'});
        return decision('Gain Culture — review card modifiers',`The ledger suggests +${p.gain} Culture. Confirm the active card effects before applying the recorded territory gain. No card modifier is assumed absent.`,[{label:'I checked the active cards; apply the ledger gain',command:{type:'CULTURE_LEDGER_GAIN',ack:true}}]);
      }
      if(!s.operationEvents?.operationsRoll){
        if(s.tracks.operations>0&&cultureCardEffectAudit(s).safe)return auto('Operations track roll', 'The game rolls a seeded die and updates Operations or mandatory Passage.',{type:'OPERATIONS_DIGITAL_ROLL',ack:true});
        return decision('Resolve Operations track — review card modifiers','Check whether an active card changes this Operations check. If it does, use the on-board exception controls instead. Otherwise authorise the engine to use its seeded digital die.',[{label:'No card changes this roll; roll digitally',command:{type:'OPERATIONS_DIGITAL_ROLL',ack:true}}]);
      }
    }
    if(s.operation==='Take Actions'){
      if(s.activeBandId){
        const band=s.pieces.find(p=>p.id===s.activeBandId);
        return decision(`Command ${band?.label||'your Band'}`,`At ${SPACE[band?.location]?.name||band?.location||'the board'} · ${s.tracks.movement} movement points. Only legal actions are shown.`,activeBandChoices(s).map(a=>({label:a.label,detail:a.detail,command:a.command,kind:a.kind,to:a.to})));
      }
      if(!s.operationEvents?.operationsRoll){
        // §4.1 steps 1–3: free activation from one Ranchería's Medicine track
        // must be available in the game director, not only a legacy counter menu.
        const track=s.rancheriaActivation;
        if(track&&track.stage!=='complete'){
          const choices=[];
          const next=track.slots?.[track.activated];
          if(next){
            const command={type:'ACTIVATE_BAND',id:next.bandId,mode:'rancheria'};
            try{perform(s,command);choices.push({label:`Activate Medicine-track Band ${next.bandId}`,command});}catch{}
          }
          for(const collectAP of [false,true]){
            const command={type:'RANCHERIA_TRACK_FINISH',collectAP};
            try{perform(s,command);choices.push({label:collectAP?'Finish track and collect eligible AP':'Finish free Medicine-track activations',command});}catch{}
          }
          return decision('Ranchería Medicine-track activation',
            'Activate the next required Band in right-to-left order, or finish the remaining eligible track slots according to §4.1.',choices);
        }
        const startChoices=[];
        if(!track){
          for(const ranch of s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
            const bandIds=s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${ranch.id}`).map(p=>p.id).sort();
            const command={type:'RANCHERIA_TRACK_START',rancheriaId:ranch.id,bandIds};
            try{perform(s,command);startChoices.push({label:`Prepare ${ranch.label||ranch.id} Medicine track`,command});}catch{}
          }
        }
        const husbandry=[];
        if(cultureActive(s,'C02')){
          const bands=s.pieces.filter(p=>p.type==='Band'&&p.location!=='reserve'&&p.location!=='removed'&&!p.finished);
          for(const band of bands.slice(0,8))for(let slot=0;slot<=9;slot++){
            const command={type:'CULTURE_HUSBANDRY',bandId:band.id,slot};
            try{perform(s,command);husbandry.push({label:`Husbandry: finish ${band.label||band.id} → Horse slot ${slot}`,command});}catch{}
          }
        }
        const candidates=s.pieces.filter(p=>p.type==='Band'&&Boolean(SPACE[p.location])&&!p.finished&&p.ratingConfirmed!==false&&s.tracks.ap>=p.strength);
        return decision('Choose your next Band',`Activate a Band by paying its strength in AP. ${candidates.length?'Or finish taking actions when ready.':'No eligible AP activations are recorded.'}`,[...startChoices,...candidates.map(p=>({label:`Activate ${p.label} (${p.strength} AP)`,command:{type:'ACTIVATE_BAND',id:p.id,mode:'ap'}})),...husbandry,...(s.tracks.operations===0?[{label:'Finish actions · advance Operations to 1',command:{type:'OPERATIONS_START_ADVANCE'}}]:[{label:'I checked printed card modifiers · roll Operations die',command:{type:'OPERATIONS_DIGITAL_ROLL',ack:true}}])]);
      }
    }
    if(s.operation==='Planning'){
      if(s.planningMedicineStarted===false && cultureActive(s,'C10')){
        const options=[];
        for(const ranch of s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]&&!(s.cultureTradeFairsDone||[]).includes(p.id)))
          for(const resource of s.pieces.filter(p=>p.location===`box:${ranch.id}`&&(p.type==='Bison'||p.type==='Resource'&&['Horse','Captives'].includes(p.subtype)))){
            const command={type:'CULTURE_TRADE_FAIR',rancheriaId:ranch.id,resourceId:resource.id};
            try{perform(s,command);options.push({label:`Trade Fair: ${ranch.label||ranch.id} · ${resource.label||resource.id}`,command});}catch{}
          }
        if(options.length)return decision('Trade Fairs: before Medicine','Trade II permits one resource exchange per Ranchería at the beginning of Planning. Choose any eligible exchange, or continue.',[...options,{label:'Finish optional Trade Fairs',command:{type:'PLANNING_MEDICINE_START'}}]);
      }
      if(s.planningMedicineStarted===false)return auto('Planning: Medicine rises','Increase each eligible Mahimiana Medicine by one. The engine checks the recorded Success counters.',{type:'PLANNING_MEDICINE_START'});
      if(s.planningStage===2){
        const chiefs=s.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='reserve'&&p.location!=='removed'&&s.pieces.some(q=>q.subtype==='Success'&&q.location===`medicine:${p.id}`));
        if(!chiefs.length)return auto('Shakedown Dance complete','Continue to Paraibo Medicine.',{type:'PLANNING_DANCE_FINISH'});
        const choices=[];
        const counts=Array.from({length:10},(_,n)=>s.pieces.filter(p=>p.subtype==='Success'&&p.location==='operations'&&p.operationsSlot===n).length);
        for(const chief of chiefs){
          const number=s.pieces.filter(p=>p.subtype==='Success'&&p.location===`medicine:${chief.id}`).length;
          for(const slot of (number>1?counts.map((v,i)=>v===Math.min(...counts)?i:null).filter(v=>v!==null):[0]))choices.push({label:`${chief.label||chief.id}: Shakedown${number>1?' · Operations slot '+slot:''}`,command:{type:'PLANNING_DANCE',mahimianaId:chief.id,slot}});
        }
        return decision('Shakedown Dance: choose a Ranchería','Success counters go to its Paraibo, with extra counters placed in least-occupied Operations slots.',choices);
      }
      if(s.planningStage===3)return auto('Planning: improve Paraibo Medicine','Each Success on a Paraibo Medicine track raises Medicine, then goes Out of Play.',{type:'PLANNING_PARAIBO_MEDICINE'});
      if(s.planningStage===4){
        const choices=[...planningActionChoices(s),{label:'Finish Headman Actions',command:{type:'PLANNING_HEADMAN_FINISH'}}];
        return decision('Planning: choose Headman Actions','Each eligible Paraibo chooses one guaranteed action or gambles for more. End this step whenever you are ready.',choices);
      }
      if(s.planningStage===5)return auto('Planning: recover Mahimiana','Roll for each zero-Medicine Mahimiana and restore the recorded counter.',{type:'PLANNING_RECOVER_MAHIMIANA'});
      if(s.planningStage===6)return auto('Planning: Band attrition','Each Finished Band loses 1 strength; zero-strength Bands and their possessions return to the appropriate supply.',{type:'PLANNING_FINISHED_BAND_ATTRITION'});
      if(s.planningStage===7){
        const choices=[];
        for(const ranch of s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
          const allowance=s.planningMoveAllowance?.[ranch.id]??s.pieces.filter(p=>p.type==='Band'&&p.location===`box:${ranch.id}`).reduce((n,p)=>n+p.strength,0);
          const spent=s.planningRanchMoves?.[ranch.id]||0;
          if(spent>=allowance)continue;
          for(const edge of s.edges.filter(e=>e.a===ranch.location||e.b===ranch.location)){
            const to=edge.a===ranch.location?edge.b:edge.a;
            const command={type:'PLANNING_MOVE_RANCHERIA',rancheriaId:ranch.id,to};
            if(SPACE[to]?.type==='square'||s.pieces.some(p=>p.location===to&&['Tribe','Settlement','War Column','Rancheria'].includes(p.type)))continue;
            if(s.pieces.some(p=>p.location===to&&p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype)))command.transit=true;
            choices.push({label:`Move ${ranch.label||ranch.id} → ${SPACE[to]?.name||to}`,detail:`${allowance-spent} movement remaining`,command});
          }
        }
        if(cultureActive(s,'C16'))for(const tribe of s.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]&&s.pieces.some(q=>q.type==='Instruction'&&q.subtype==='Ally'&&q.location===p.location))){
          for(const edge of s.edges.filter(e=>e.kind==='solid'&&(e.a===tribe.location||e.b===tribe.location))){
            const to=edge.a===tribe.location?edge.b:edge.a,command={type:'CULTURE_POLITICS_MOVE_ALLY',tribeId:tribe.id,to};
            try{perform(s,command);choices.push({label:`Politics I: move Allied Tribe ${tribe.id} → ${SPACE[to]?.name||to}`,command});}catch{}
          }
        }
        choices.push({label:'Finish Ranchería movement',command:{type:'PLANNING_FINISH_RANCHERIA_MOVEMENT'}});
        return decision('Move your Rancherías','Choose adjacent moves or finish the optional movement step. Peace Spaces may be crossed but not used as final stops.',choices);
      }
      if(s.planningStage===8){
        if(s.log.slice(0,s.log.length-(s.planningEnemyStartLog||0)).some(e=>['ENEMY_FINISH','ENEMY_AUTO_FINISH'].includes(e.command)))return auto('Planning enemy turn complete','Continue to the Operations track.',{type:'PLANNING_FINISH_ENEMY'});
        if(s.planningEnemyDie==null&&cultureActive(s,'C24')&&s.tracks.culture>=1){
          const history=String(s.cards.find(c=>c.kind==='History'&&c.zone==='In play')?.identifier||'').toUpperCase();
          const named=['H1','H2'].includes(history)?['North','West','South']:history==='H3'?['North','West','South','East']:history==='H4'?['South','West','East']:['North','West','South','East'];
          return decision('Politics III: choose the active Enemy?','Spend one Culture to name an Enemy on the History Card instead of rolling the Enemy Action Table, or roll normally.',[
            ...named.map(enemy=>({label:`Choose ${enemy} · 1 Culture`,command:{type:'CULTURE_POLITICS_CHOOSE_ENEMY',enemy,ack:true}})),
            {label:'Roll normally · no Culture cost',command:{type:'PLANNING_ROLL_ENEMY_DIE'}}
          ]);
        }
        if(s.planningEnemyDie==null)return auto('Enemy acts: roll free Instruction','The game rolls the seeded Enemy die. Only the printed History Card mapping and display row may require your input.',{type:'PLANNING_ROLL_ENEMY_DIE'});
        const enemy=s.planningPoliticsEnemy||verifiedHistoryEnemy(s,s.planningEnemyDie);
        if(enemy)return auto(`Enemy Instruction: ${enemy}`,`Enemy Action die ${s.planningEnemyDie} identified ${enemy}. Roll the independent display die and flip its row automatically.`,{type:'ENEMY_PREPARE',kind:'free'});
        if(!s.planningEnemyChoice)return decision('Who acts? Check your History Card',`The seeded die is ${s.planningEnemyDie}. Look up that number on your printed History Card and choose the matching Enemy. This is one verified player input, not an automatic guess.`,['North','West','South','East'].map(enemy=>({label:`History Card says ${enemy}`,command:{type:'PLANNING_CONFIRM_ENEMY',enemy,ack:true}})));
        return auto(`Free Enemy Instruction: ${s.planningEnemyChoice}`,`The Enemy has been confirmed. Roll the second, independent display die and flip the indicated counter.`,{type:'ENEMY_PREPARE',kind:'free'});
      }
      if(s.planningStage===9){
        const active=s.cards.some(c=>['Development','Culture','War'].includes(c.kind)&&['In play','Display','War Event'].includes(c.zone));
        const cardAudit=cultureCardEffectAudit(s);
        if(active&&cardAudit.safe)return auto('Planning: verified Operations check','All active card effects have a verified non-modifier proof for this specific Operations roll. Roll the seeded die.',{type:'PLANNING_OPERATIONS_FINISH'});
        if(active)return decision('Confirm Operations card modifiers',`Only these active card(s) remain unverified for this roll: ${cardAudit.blockers.map(c=>`${c.kind} ${c.number||c.cardId}`).join(', ')}. Review those printed cards before the digital die.`,[{label:'I checked the listed cards; roll now',command:{type:'PLANNING_OPERATIONS_FINISH',ack:true}}]);
        return auto('Planning: Operations check','Roll using the game’s seeded die, or advance from Start without rolling.',{type:'PLANNING_OPERATIONS_FINISH'});
      }
      const choices=planningActionChoices(s);
      const remaining=checklist(s).filter(([id])=>!['done','na'].includes(s.steps[id]));
      if(choices.length)return decision('Choose a Headman or card action',`You have ${s.tracks.ap} AP. Each shown action is accepted by the actual rules engine. Other Planning procedures still require their printed-rule checks.`,choices);
      if(!remaining.length&&safeNext(s).ok)return auto('Planning complete','Continue to Cleanup.',{type:'ADVANCE'});
      return decision('Complete Planning procedures',remaining.length?`Next: ${remaining[0][1]}. Open Turn controls to resolve it; do not mark it complete without applying the effect.`:safeNext(s).message,[]);
    }
    const ready=safeNext(s);
    // A completed Take Actions checklist is followed by each in-play
    // recurring Disease card. The reducer handles its own seeded target
    // roll and any ensuing Band choice; do not leave an empty prompt.
    if(s.operation==='Take Actions'&&!ready.ok&&!s.epidemicTakeActionsApplied){
      const disease={type:'DEVELOPMENT_EPIDEMIC_END'};
      try{perform(s,disease);return auto('Resolve end-of-operation Disease',ready.message,disease);}catch{}
    }
    if(ready.ok)return auto('Operation completed','Continue to Cleanup.',{type:'ADVANCE'});
    const first=checklist(s).find(([id])=>!['done','na'].includes(s.steps[id]));
    if(first){
      const [key,description,section]=first,choices=[];
      const tryChoice=(label,command)=>{try{perform(s,command);choices.push({label,command});}catch{}};
      if(s.operation==='Take Actions'&&!s.activeBandId&&(!s.rancheriaActivation||s.rancheriaActivation.stage==='complete')){
        // Only the player can decide whether to stop taking optional actions.
        // The Operations step is completed by the actual recorded roll.
        if(['a1','a2','a3','a4'].includes(key))tryChoice('I have finished this Take Actions step',{type:'CHECK',key,value:'done'});
        if(key==='a5'){
          if(s.operationEvents?.operationsRoll)tryChoice('Operations roll completed · confirm step',{type:'CHECK',key,value:'done'});
          else tryChoice('Roll the Operations die',{type:'OPERATIONS_DIGITAL_ROLL',ack:true});
        }
      }else if(s.operation==='Culture'){
        // Acknowledgement is never represented as a verified calculation.
        // No replacement for the actual culture ledger and die procedures.
        if(key==='cu1')tryChoice('I checked the Culture procedure',{type:'CHECK',key,value:'done'});
        if(key==='cu2'&&s.operationEvents?.cultureGain)tryChoice('Culture result recorded · confirm',{type:'CHECK',key,value:'done'});
        if(key==='cu3'&&s.operationEvents?.operationsRoll)tryChoice('Operations result recorded · confirm',{type:'CHECK',key,value:'done'});
      }
      return decision(`Finish ${s.operation}: ${key.toUpperCase()}`,
        `${description} (${section}). ${ready.message}. ${choices.length?'Confirm only after the printed-board procedure is complete.':'This effect still needs its printed-board procedure; it cannot be skipped.'}`,choices);
    }
    return decision('Finish your operation',ready.message,[]);
  }
  if(s.phase==='cleanup'){
    // Cleanup step 1 card triggers are compulsory. Do not make a player
    // search for the card's individual button; invoke the existing reducer.
    if(!s.steps.cl1){
      const active=n=>s.cards.some(c=>c.kind==='Development'&&String(c.identifier||'').replace(/\D/g,'').padStart(2,'0')===n&&['In play','Display'].includes(c.zone));
      if(active('44')&&!s.cards.filter(c=>c.kind==='Development'&&String(c.identifier||'').replace(/\D/g,'').padStart(2,'0')==='44'&&['In play','Display'].includes(c.zone)).every(c=>(s.louisianaDoneIds||[]).includes(c.id)))return auto('Louisiana Purchase: Cleanup effect','Resolve the seeded placement according to recorded board pieces.',{type:'DEVELOPMENT_LOUISIANA_CLEANUP'});
      if(active('60')&&!s.cards.filter(c=>c.kind==='Development'&&String(c.identifier||'').replace(/\D/g,'').padStart(2,'0')==='60'&&['In play','Display'].includes(c.zone)).every(c=>(s.americanTradersDoneIds||[]).includes(c.id)))return auto('American Traders: Cleanup effect','Apply the recorded card procedure; ask for physical stock only when required.',{type:'DEVELOPMENT_AMERICAN_TRADERS_CLEANUP'});
      const buffalo=s.cards.filter(c=>c.kind==='Development'&&['70','71'].includes(String(c.identifier||'').replace(/\D/g,'').padStart(2,'0'))&&['In play','Display'].includes(c.zone));
      if(buffalo.some(c=>!(s.buffaloDoneIds||[]).includes(c.id)))return auto('Buffalo Hunters: Cleanup effect','Select the territory using the seeded game die; if several Bison are present, you choose which to remove.',{type:'DEVELOPMENT_BUFFALO_START'});
    }
    if(!['done','na'].includes(s.steps.cl1)){
      // §2.4 / §3.4 step 1: absorbing a Band sharing a Ranchería space
      // is mandatory and must be offered BEFORE the generic stacking gate.
      // This resolves a legitimate temporary stack without administrative edits.
      const absorptions=[];
      for(const ranch of s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location])){
        for(const band of s.pieces.filter(p=>p.type==='Band'&&p.location===ranch.location&&p.id!==s.activeBandId)){
          absorptions.push({ranch,band});
        }
      }
      if(absorptions.length){
        const choices=absorptions.map(({ranch,band})=>({
          label:`Absorb ${band.label||band.id} into ${ranch.label||ranch.id}`,
          command:{type:'CLEANUP_ABSORB_BAND',bandId:band.id,rancheriaId:ranch.id}
        }));
        // Each absorption is mandatory, independent, and preserves cargo.
        // Use a stable first counter rather than interrupting the player with
        // an artificial choice between equivalent mandatory operations.
        return auto('Cleanup: absorb returning Band',
          'Required §2.4 absorption: return each Band to its Ranchería Resources box, retaining its possessions.',choices[0].command);
      }
      const stack=getStackingProblems(s);
      if(stack.length)return blocked('Cleanup: fix illegal stacking',stack.map(x=>x.message).join(' ')+' Use the on-board counter controls to resolve these before continuing.');
      if(s.pending||s.successCheck||s.enemyFlow||s.developmentPending||s.battlePending)return blocked('Cleanup: pending procedure','Resolve the pending rule or counter effect before the stacking checkpoint.');

      if(s.pieces.some(p=>p.type==='Resource'&&p.location==='operations'&&!Number.isInteger(p.operationsSlot)))return blocked('Cleanup: Resource slot unknown','Record the actual Operations-track slot for each Resource before moving a counter.');

      const due=s.pieces.filter(p=>p.location==='operations'&&p.operationsSlot===s.tracks.operations&&['Resource','Bison'].includes(p.type));
      if(due.length){
        const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
        if(!ranches.length)return blocked('Cleanup: Resource destination required','There are Resources on the Operations marker but no recorded in-play Ranchería to receive them.');
        return decision('Cleanup: distribute Resources',`${due.length} Resources are at the Operations marker. Choose a Ranchería for ${due[0].label||due[0].id}.`,ranches.map(r=>({label:`Give to ${r.label||r.id}`,command:{type:'CLEANUP_TRANSFER_RESOURCE',pieceId:due[0].id,rancheriaId:r.id}})));
      }
      if(s.pieces.some(p=>p.location==='operations'&&p.operationsSlot===s.tracks.operations&&!['Resource','Bison'].includes(p.type)&&!(p.type==='Marker'&&p.subtype==='Success')))return blocked('Cleanup: unknown Operations counter','A counter at the Operations marker is not a standard Success or Resource. Reconcile its printed effect.');
      const relinquish=[];
      for(const p of s.pieces.filter(p=>['Resource','Bison','Mahimiana'].includes(p.type)&&p.location.startsWith('held:'))){
        const band=s.pieces.find(b=>b.id===p.location.slice(5)&&b.type==='Band');
        const ranch=s.pieces.find(r=>r.type==='Rancheria'&&SPACE[r.location]&&band&&(band.location===r.location||band.location===`box:${r.id}`));
        if(ranch)relinquish.push({label:`Relinquish ${p.label||p.id} to ${ranch.label||ranch.id}`,command:{type:'CLEANUP_RELINQUISH',pieceId:p.id,bandId:band.id,rancheriaId:ranch.id}});
      }
      if(relinquish.length)return decision('Cleanup: relinquish possessions?', 'Move optional possessions back to a Ranchería, or keep them with their Bands. The engine then returns required Success counters.',[...relinquish,{label:'Keep possessions and finish step 1',command:{type:'CLEANUP_FINISH_STACKING'}}]);
      return auto('Cleanup: reconcile stacking and Success','Automatically return matching Success counters to the draw cup; finish step 1 if the recorded pieces do not violate stacking.',{type:'CLEANUP_FINISH_STACKING'});
    }
    if(!['done','na'].includes(s.steps.cl2)){
      const f=s.cleanupFinishedPending;
      if(f){
        if(f.started){
          return auto('Finished Bands: Enemy acted','The required free Enemy procedure has finished; continue with the next Ranchería.',{type:'CLEANUP_FINISH_ENEMY'});
        }
        if(f.die===null){
          const history=String(s.cards.find(c=>c.kind==='History'&&c.zone==='In play')?.identifier||'').toUpperCase();
          const named=VERIFIED_HISTORY_NAMED_ENEMIES[history]||['North','West','South','East'];
          return decision('Politics III: choose the free Enemy?', 'A Finished Band triggered a free Enemy Instruction. Spend 1 Culture to choose a named Enemy before rolling, or let the Enemy Action Table decide.',[
            ...named.map(enemy=>({label:`Choose ${enemy} · 1 Culture`,command:{type:'CULTURE_POLITICS_CHOOSE_CLEANUP_ENEMY',stage:'finished',enemy,ack:true}})),
            {label:'Roll Enemy Action Table normally',command:{type:'CLEANUP_ROLL_FINISHED_ENEMY'}}
          ]);
        }
        const enemy=f.enemy||verifiedHistoryEnemy(s,f.die);
        if(!enemy)return decision('Finished Bands triggered an Enemy','The game rolled the Enemy die. Identify the Enemy from your printed History Card.', ['North','West','South','East'].map(x=>({label:`History Card: ${x}`,command:{type:'CLEANUP_CONFIRM_FINISHED_ENEMY',enemy:x,ack:true}})));
        return auto(`Free Enemy Instruction: ${enemy}`,`Finished Band roll ${f.triggerDie} caused an Enemy action. Roll the second display die and flip its row.`,{type:'ENEMY_PREPARE',kind:'free'});
      }
      const ranches=s.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).sort((a,b)=>a.id.localeCompare(b.id)).filter(r=>s.pieces.some(p=>p.type==='Band'&&p.finished&&p.location===`box:${r.id}`));
      if((s.cleanupFinishedRolls||[]).length<ranches.length)return auto('Finished Bands: roll one Ranchería',`Roll the seeded die for ${ranches[(s.cleanupFinishedRolls||[]).length].label||'the next Ranchería'}; free Enemy action only when triggered.`,{type:'CLEANUP_ROLL_FINISHED'});
      return auto('Finished Bands: step complete',`All ${ranches.length} applicable Rancherías were checked.`,{type:'CLEANUP_FINISH_FINISHED'});
    }
    if(!['done','na'].includes(s.steps.cl3)){
      const c=s.cleanupCupResult;
      if(!c)return auto('Cleanup: draw from Success cup','Draw exactly one counter with seeded randomness; its type determines the following Enemy action.',{type:'CLEANUP_DRAW_CUP'});
      if(c.kind==='instruction'){
        const drawn=s.pieces.find(p=>p.id===c.counterId),name=String(drawn?.subtype||'');
        if(c.stage==='effect'){
          if(/^cult/i.test(name))return auto('Cup Instruction: Culture Attack','Apply the verified Culture loss and then exchange the Instruction on the display.',{type:'CLEANUP_CUP_CULTURE_ATTACK'});
          if(/^hunt/i.test(name)&&!s.pieces.some(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round'))return auto('Cup Instruction: no Bison remain','Resolve Hunt with no effect when the map has no Bison (unless Recover takes priority).',{type:'CLEANUP_CUP_EMPTY_HUNT'});
          if(cupEffectCanAuto(s,drawn,'Hunt')&&/^hunt/i.test(name)&&s.pieces.filter(p=>p.type==='Bison'&&SPACE[p.location]?.type==='round').length===1)return auto('Cup Instruction: hunt sole Bison','The sole map Bison is the forced result for every territory die.',{type:'CLEANUP_CUP_SINGLE_BISON_HUNT'});
          if(cupEffectCanAuto(s,drawn,'Hunt')&&/^hunt/i.test(name)&&sameTerritoryBison(s))return auto('Cup Instruction: hunt Bison in one territory','All Bison share a territory. The engine rolls and selects a Bison, then exchanges the drawn Instruction.',{type:'CLEANUP_CUP_SAME_TERRITORY_HUNT'});
          if(cupEffectCanAuto(s,drawn,'Hunt')&&/^hunt/i.test(name))return auto('Cup Instruction: full digital Hunt','Roll the territory die, cycle to the first territory with Bison, randomly return one Bison to stock and continue the exchange.',{type:'CLEANUP_CUP_GUIDED_HUNT'});
      if(cupEffectCanAuto(s,drawn,'Ally')&&/^ally/i.test(name)&&allyTargetPreview(s,drawn.owner).candidates.length===1)return auto('Cup Instruction: ally sole Tribe','Attach the drawn Ally Instruction to its only eligible Tribe.',{type:'CLEANUP_CUP_SINGLE_ALLY'});
          if(cupEffectCanAuto(s,drawn,'Ally')&&/^ally/i.test(name)&&allyTargetPreview(s,drawn.owner).candidates.length>1)return decision('Cup Instruction: choose Allied Tribe','Choose an eligible non-Allied Tribe. Placement and the display exchange are handled by the engine.',allyTargetPreview(s,drawn.owner).candidates.map(t=>({label:`Ally with ${t.label||t.id} (${t.location})`,command:{type:'CLEANUP_CUP_CHOOSE_ALLY',tribeId:t.id}})));
          if(/^peace(?:\s|$)/i.test(name)&&cupSafeSimplePeace(s,drawn))return auto('Cup Instruction: place Peace','No active War Column, old Peace or Recover target. Place the Peace in the Enemy square and continue the exchange.',{type:'CLEANUP_CUP_PEACE'});
          if(cupForcedEncroach(s,drawn))return auto('Cup Instruction: forced Encroach','One Tribe and one legal space remain. Resolve placement and the seeded territory roll.',{type:'CLEANUP_CUP_FORCED_ENCROACH'});
          if(cupEmptyRedirect(s,drawn))return auto('Cup Instruction: no-target redirect','Ally/Encroach has no target, no possible Tribe placement and no Bison to hunt.',{type:'CLEANUP_CUP_EMPTY_REDIRECT'});
          if(['War','Raid'].includes(name)&&cupWarRaidAutoPreview(s).ready)return auto('Cleanup cup: verified '+name,'Apply the certified War/Raid effect and proceed to the mandatory exchange.',{type:'CLEANUP_CUP_AUTO_WAR_RAID'});
          if(['War','Raid'].includes(name))return blocked('Cleanup cup: resolve War/Raid', 'Choose a War Column, physical target and card modifiers where required; the engine will apply formation, movement and attrition, then exchange the Instruction.');
          if(['Settle','Subjugate'].includes(name)&&cupColonialTargetPreview(s).ready)return auto('Cup Instruction: automatic '+name,'The verified map resolves the target, legal physical stock and random ties, then proceeds to the required display exchange.',{type:'CLEANUP_CUP_AUTO_COLONIAL'});
          if(['Settle','Subjugate'].includes(name))return blocked('Cleanup cup: resolve '+name+' on the board', 'Choose the real target in the guided form. The engine validates the route and counters, then advances to the display exchange.');
          return blocked(`Resolve ${drawn?.owner||'Enemy'} ${name} Instruction`,`The drawn Instruction acts for free under §6.2.2.C. Record and execute its specific §6.3 effect, then use the on-board cup-Instruction confirmation. Do not skip any target, battle or card effect.`);
        }
        if(c.stage==='swap'){
          if(c.swapDie===null)return auto('Drawn Instruction: roll display exchange','Roll a seeded die to determine the display row replaced by the drawn Instruction.',{type:'CLEANUP_CUP_ROLL_SWAP'});
          return auto('Cleanup: exchange drawn Instruction',`Die ${c.swapDie} identifies the occupied printed display row. The exchange is mandatory and deterministic.`,{type:'CLEANUP_CUP_EXCHANGE'});
        }
        if(c.stage==='paid'&&c.die===null&&s.tracks.enemyAp===0&&!s.pieces.some(p=>p.location==='available-enemy-aps'&&/^Enemy AP [234]$/.test(p.subtype)))return auto('Cup Instruction complete','No Enemy APs remain after the display exchange.',{type:'CLEANUP_CUP_NO_PAID'});
      }
      if(!c.die&&cultureActive(s,'C24')&&s.tracks.culture>=1&&enemyApPreview(s).total>0){
        const history=String(s.cards.find(x=>x.kind==='History'&&x.zone==='In play')?.identifier||'').toUpperCase();
        const named=VERIFIED_HISTORY_NAMED_ENEMIES[history]||['North','West','South','East'];
        return decision('Politics III: choose the paid Enemy?', 'Spend 1 Culture to choose a named Enemy before the Cleanup Enemy Action Table roll, or let the game roll.',[
          ...named.map(enemy=>({label:`Choose ${enemy} · 1 Culture`,command:{type:'CULTURE_POLITICS_CHOOSE_CLEANUP_ENEMY',stage:'paid',enemy,ack:true}})),
          {label:'Roll normally · no Culture cost',command:{type:'CLEANUP_ROLL_PAID_ENEMY'}}
        ]);
      }
      if(!c.die)return auto('Cleanup: paid Enemy check','If Enemy APs are available, roll the seeded Enemy Action die; otherwise complete step 3.',{type:'CLEANUP_ROLL_PAID_ENEMY'});
      if(c.started)return auto('Cleanup: paid Enemy procedure finished','Return to Cleanup step 4 after the recorded Enemy Instruction resolves.',{type:'CLEANUP_FINISH_CUP_ENEMY'});
      const enemy=c.enemy||verifiedHistoryEnemy(s,c.die);
      if(!enemy)return decision('Paid Enemy: identify the Enemy',`Enemy Action die ${c.die}; choose the matching printed History Card Enemy.`,['North','West','South','East'].map(x=>({label:`History Card: ${x}`,command:{type:'CLEANUP_CONFIRM_PAID_ENEMY',enemy:x,ack:true}})));
      return auto(`Paid Enemy: ${enemy}`,`Enemy Action die ${c.die} identifies the Enemy. Roll a separate die for the display flip, then execute affordable Instructions.`,{type:'ENEMY_PREPARE',kind:'paid'});
    }
    if(!['done','na'].includes(s.steps.cl4)){
      if(!s.flags?.santaFe&&!s.cards.some(c=>c.kind==='Development'&&String(c.identifier||'').replace(/\D/g,'')==='43'&&['In play','Display'].includes(c.zone)))return auto('Santa Fé Trail not active','No Wagon Train counter is required this turn.',{type:'CLEANUP_SKIP_TRAIL'});
      const trail=santaFeTrailPlacementPreview(s);
      if(!trail.choices.length)return blocked('Santa Fé Trail: no legal destination','All Wagon Train spaces are occupied or unreachable. Check the recorded physical counters before continuing.');
      if(!s.pieces.some(cupDrawable))return blocked('Santa Fé Trail: empty cup','No counter is available in the Success Check Draw Cup. Reconcile the counter stock.');
      if(trail.unique)return auto('Santa Fé Trail: place hidden counter',`The verified map identifies ${trail.choices[0].to} as the nearest eligible space to northern East (E1), ${trail.nearest} connections away. Draw the counter face-down.`,{type:'CLEANUP_TRAIL_PLACE',to:trail.choices[0].to});
      return decision('Santa Fé Trail: nearest-space tie',`Several eligible Wagon Train spaces are tied at ${trail.nearest} connections from northern East. Resolve the printed tie and choose its destination.`,trail.choices.map(x=>({label:`Place hidden counter at ${x.to}`,command:{type:'CLEANUP_TRAIL_PLACE',to:x.to,ack:true}})));
    }
    const next=safeNext(s);
    if(next.ok)return auto('Cleanup complete','Proceed to the next War phase.',{type:'ADVANCE'});
    const first=checklist(s).find(([id])=>!['done','na'].includes(s.steps[id]));
    return decision('Complete Cleanup',first?`${first[1]}. ${next.message}`:next.message,[]);
  }
  return blocked('Unrecognised game phase','Check your save and game state.');
}

/** An intentionally conservative stand-in. Picks a strategy, never asserts
 * physical board facts or makes an unverified rule exception. */
export function standInChoice(s,prompt=nextPlayerPrompt(s)){
  if(prompt.kind==='automatic')return prompt.command;
  if(prompt.kind==='player'&&prompt.choices?.some(c=>['RAID_CUP_CHOOSE_ALLY','CLEANUP_CUP_CHOOSE_ALLY'].includes(c.command.type)))
    return [...prompt.choices].sort((a,b)=>String(a.command.tribeId).localeCompare(String(b.command.tribeId)))[0].command;
  if(s.pending?.type==='raid'&&prompt.kind==='player'&&prompt.choices?.length&&prompt.choices.some(c=>c.command.type==='FINISH_SUCCESS_CHECK'))return prompt.choices.find(c=>c.command.type==='FINISH_SUCCESS_CHECK').command;
  if(s.pending?.type==='raid'&&prompt.kind==='player'&&prompt.choices?.length&&prompt.choices.some(c=>c.command.type==='DIGITAL_CUP_DRAW'))return prompt.choices.find(c=>c.command.type==='DIGITAL_CUP_DRAW').command;
  if(s.pending?.type==='raid'&&prompt.kind==='player'&&prompt.choices?.length&&prompt.choices.some(c=>c.command.type==='RAID_DIGITAL_START'))return prompt.choices.find(c=>c.command.type==='RAID_DIGITAL_START').command;
  if(s.pending?.type==='raid'&&prompt.kind==='player'&&prompt.choices?.length&&prompt.choices.every(c=>c.command.type==='RAID_DIGITAL_REWARD'))return prompt.choices.find(c=>c.command.horses===0)?.command||prompt.choices[0].command;
  if(s.phase==='cleanup'&&prompt.kind==='player'&&prompt.choices?.length){
    return prompt.choices.find(c=>c.command.type==='CLEANUP_FINISH_STACKING')?.command||null;
  }
  if(s.phase==='selection'&&prompt.kind==='player'&&prompt.choices?.length){
    const preference=requiredPassage(s)?'Passage of Time':s.tracks.culture<=4?'Culture':'Planning';
    return (prompt.choices.find(c=>c.label===preference)||prompt.choices[0]).command;
  }
  if(s.phase==='execution'&&s.operation==='Take Actions'&&prompt.kind==='player'&&prompt.choices?.length){
    if(s.activeBandId){
      // Simulated player prefers a legal Hunt/Raid, then a one-edge move to Bison
      // that can be hunted; never spends a Horse just to wander.
      const hunt=prompt.choices.find(c=>c.command.type==='HUNT');if(hunt)return hunt.command;
      const raid=prompt.choices.find(c=>c.command.type==='BEGIN_RAID');if(raid)return raid.command;
      const move=prompt.choices.find(c=>c.kind==='move'&&s.pieces.some(p=>p.type==='Bison'&&p.location===c.to));
      if(move)return move.command;
      return prompt.choices.find(c=>c.command.type==='FINISH_BAND')?.command||null;
    }
    return prompt.choices.find(c=>c.command.type==='ACTIVATE_BAND')?.command||null;
  }
  if(s.phase==='execution'&&s.operation==='Planning'&&prompt.kind==='player'&&prompt.choices?.length){
    // Strategic choices are optional: prefer a legal card acquisition, but
    // never fabricate an unrecorded Headman action or printed-board fact.
    return prompt.choices.find(c=>c.command.type==='PLANNING_DANCE')?.command
      ||prompt.choices.find(c=>c.command.type==='PLANNING_HEADMAN_START'&&c.command.mode==='guaranteed')?.command
      ||prompt.choices.find(c=>c.command.type==='PLANNING_HEADMAN_ACTION'&&c.command.action==='collect-ap')?.command
      ||prompt.choices.find(c=>c.command.type==='PLANNING_HEADMAN_ACTION'&&c.command.action==='convert-military')?.command
      ||prompt.choices.find(c=>c.command.type==='DEVELOPMENT_TAKE_VERIFIED_HAND')?.command
      ||prompt.choices.find(c=>c.command.type==='DEVELOPMENT_TAKE_HAND')?.command
      ||prompt.choices.find(c=>c.command.type==='DEVELOPMENT_COMANCHEROS')?.command
      ||prompt.choices.find(c=>c.command.type==='DEVELOPMENT_GIFT_GIVING')?.command
      ||prompt.choices.find(c=>c.command.type==='PLANNING_HEADMAN_FINISH')?.command
      ||prompt.choices.find(c=>c.command.type==='PLANNING_FINISH_RANCHERIA_MOVEMENT')?.command||null;
  }
  // Skipping an optional step is a strategic decision, not a board-data claim.
  if(prompt.kind==='player'&&s.phase==='execution'&&s.operation==='Passage of Time'&&prompt.choices?.length){
    return prompt.choices[0].command;
  }
  return null;
}
