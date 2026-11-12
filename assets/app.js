import {tabletopSupplyModel} from './tabletop-supply.js';
import {briefTableEvent, chronologicalTableEvents} from './table-action-log.js';
import {cupInventory} from './cup-system.js';
import {componentStockAudit} from './component-stock.js';
import {cardRevealEvents, artReferenceForCard, revealLabel, revealDestination, BOARD_CARD_ZONES} from './card-reveal.js';
import {nextPlayerPrompt} from './next-action.js';
import {activeBandChoices} from './band-action-menu.js';
import {WAR_CARD_DATA} from './war-card-effects.js';
import {PHYSICAL_FACES,physicalCounterFace,physicalCounterCoverage,digitalCounterProxyUrl} from './physical-counter-catalog.js';
import {CARD_REFERENCE,EXPECTED_ART,localCardCount,counterTileCount,boardImageUrl,lastAssetReport,cardImageUrl,loadCardImage,loadCounterTiles,physicalCounterImageUrlByIndex,physicalCounterArtUrl,loadPhysicalCounterArt,bandCounterArtUrl,loadBandCounterArt,refreshLocalCards,importLocalCards,clearLocalArt,counterArtAssignments,counterArtUrl,assignCounterArt,unassignCounterArt} from './tts-asset-library.js';
import {southMapFacts} from './map-fact-checks.js';
import {MAP_EVIDENCE_EDGES,MAP_CONNECTION_CANDIDATES,MAP_EVIDENCE_SOURCE,MAP_EVIDENCE_URL,FINAL_MAP_URL,mapConnectionReconciliation,mapConnectionMatches} from './map-evidence.js';
import { DEVELOPMENT_EFFECT_CATALOG,DEVELOPMENT_SOURCE_INDEX,developmentSourceCoverage,developmentCardAudit,developmentCoverage,CULTURE_CARD_CATALOG,culturePurchaseOptions,santaFeTrailPlacementPreview,verifiedWarEventStatus, fastColumnEligible, travoisOptions,warCountermeasureOptions, VERSION, rollSeededDie, warAutomationStatus, passageAutomationStatus, historyObjectiveAudit, CARD_EVIDENCE_STATES, cardEvidenceAudit, TEMPLATE_SCENARIOS, SCENARIO_DETAILS, BAND_COUNTER_FACES, scenarioSetupOptions, openingLedgerAudit, TERRITORIES, TERRITORY_DIE_ORDER, SPACES, SPACE, SQUARES, SCENARIOS, PIECE_TYPES, RESOURCES, OPERATIONS, newGame, perform, migrateGame, cultureBaseTerritories, cultureGainPreview, territoryControlAudit, pointLossPreview, basicIntegrity, getStackingProblems, getProblems, requiredPassage, checklist, allChecksDone, safeNext, formatLocation, planBandRoute, mapCoverage, eligibleBattleUnits, warBattleObligations, rancheriaSacrificePreview, rancheriaFightPreview, battleAutoResolutionPreview, battleSafeRoundPreview, enemyApPreview, enemyDisplayAudit, enemyDisplayResetPlan, enemyFlowPreview, enemyAutomationPreview, mapReviewAudit, enemyColorNetwork, enemyCulturePreview, huntTargetPreview, encroachTargetPreview, allyTargetPreview, peaceTargetPreview, peaceWarColumnPreview, enemyWarRaidPreview, peaceSpaceStatus, enemyCardExceptionPreview, activeCardEffects, instructionName, verifiedHistoryEnemy, VERIFIED_HISTORY_NAMED_ENEMIES, settleTargetAudit, subjugateTargetAudit, recoverTargetAudit, ENEMY_COLUMNS, DISPLAY_ROWS, warColumnStopUnits, warColumnBattleModifier, warMoveChoices, autoWarMovementPreview } from './engine.js';
import {BOARD_WIDTH,BOARD_HEIGHT,MAP_POSITIONS,MAP_PALETTE,MAP_REGION_LABELS,boardPosition,boardImagePosition,mapEdgesForDisplay} from './board-layout.js';
import {PRINTED_BOARD,rancheriaPrintedIndex,rancheriaMedicinePoint,instructionPrintedPoint,recordPrintedPoint,spreadPrintedCounters} from './printed-board-anchors.js';
import {printedRancheriaAt,printedMedicineSlotAt,printedSupplyAt,printedPieceDrop,printedMedicineArrangement,printedPossessionDrop,printedAPActivationDrop,printedBattleDrop,printedBandExchangeDrop,printedMedicineBandActivationAtMap,printedMedicineTrackFinish} from './printed-board-interactions.js';
import {printedCounterChoice,printedHorseDiscardSelection,printedEpidemicBandSelection,printedHeadmanTargetChoice} from './printed-counter-decisions.js';
import {printedPlanningTrackChoice} from './printed-track-decisions.js';
import {boardNetworkAudit,bandMovementOverlay} from './board-analysis.js';
import {playerPhaseProgress} from './player-phase-view.js';
import {rancheriaSurfaceModel} from './rancheria-surface.js';
import {counterActionStatus,boardMoveStatus,boardMoveOptions} from './board-counter-actions.js';
import {resolveBoardPieceDrop,directorPieceDropOptions,resolveDirectorPieceDrop,resourceDropOptions,resolveResourceDrop,possessionActionDropOptions,resolvePossessionActionDrop,directorCounterActionDropOptions,resolveDirectorCounterActionDrop,allianceTribeDropOptions,resolveAllianceTribeDrop,activationCounterDropOptions,resolveActivationCounterDrop} from './board-piece-drag.js';
import {SAVE_CONFLICT_MESSAGE,revisionOf,hasStaleRevision,makeRevision} from './save-safety.js';
const KEY='comancheria-companion-v1'; // Keep the storage key to preserve existing browser games.
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=x=>structuredClone(x);
const option=(value,label,selected)=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`;
const options=(data,sel)=>data.map(x=>Array.isArray(x)?option(x[0],x[1],sel):option(x,x,sel)).join('');
const fmt=n=>n===undefined?'—':n;
const allLocations=(s,sel)=>[...SPACES.map(p=>[p.id,p.name]),...s.pieces.filter(x=>x.type==='Rancheria'&&x.location!=='removed').map(p=>[`box:${p.id}`,`${p.label} — Resources box`]),...s.pieces.filter(x=>x.type==='Band'&&x.location!=='removed').map(p=>[`held:${p.id}`,`${p.label} — possessed`]),...s.pieces.filter(x=>x.type==='Mahimiana'&&x.location!=='removed').map(p=>[`medicine:${p.id}`,`${p.label} — Success medicine track`]),...['West','South','East','North'].flatMap(enemy=>Array.from('ABCDEF',letter=>[`enemy-display:${enemy}:${letter}`,`${enemy} Enemy Instruction · ${letter}`])),...Array.from('ABCDEF',letter=>[`enemy-inactive:${letter}`,`Inactive Enemy Instruction row ${letter}`]),['reserve','Out of play / stock'],['removed','Removed from game'],['operations','Operations track'],['cup','Success Check cup'],['enemy-display','Enemy instruction display'],['deck','Deck'],['hand','Hand'],['success-out','Success Out of Play'],['available-enemy-aps','Available Enemy APs box'],['enemy-resolution','Enemy Instruction requires reconciliation']].map(x=>option(x[0],x[1],sel)).join('');
const sortedPieces=s=>[...s.pieces].sort((a,b)=>a.type.localeCompare(b.type)||a.label.localeCompare(b.label));
const labelPiece=p=>p.faceDown?'? · Face-down Wagon Train counter':`${p.label||p.type}${p.type==='Band'?` [${p.strength}–${p.finished?'F':p.mpRating} ${p.finished?'Finished':'ready'}]`:''}`;
const getOwner=(p)=>p.owner||'—';
const pieceArt=p=>physicalCounterArtUrl(p)||(!p.faceDown&&counterArtUrl(p.type,p.subtype))||digitalCounterProxyUrl(p);
const counterArtTargets=()=>[...PIECE_TYPES.map(type=>[type,type+' · all']),...new Map(state.pieces.filter(p=>p.type&&p.subtype).map(p=>[p.type+':'+p.subtype,[p.type+':'+p.subtype,p.type+' · '+p.subtype]])).values()];
const pieceIcon=p=>pieceArt(p)?`<img class="counter-art-icon" src="${esc(pieceArt(p))}" alt="" loading="lazy">`:`<span aria-hidden="true">${smallIcon(p.type)}</span>`;
const smallIcon=t=>({'Band':'♞','Rancheria':'⌂','Settlement':'▥','War Column':'⚔','Bison':'◈','Resource':'◆','Marker':'◉','Instruction':'✧','Tribe':'✽','Paraibo':'✦','Mahimiana':'✦','Other':'◌'})[t]||'◌';
const details=p=>[p.subtype,p.type==='Band'?`${p.strength}–${p.finished?'F':p.mpRating} printed Band face`:p.strength&&p.strength+' str.',p.type!=='Band'&&p.finished?'Finished':null].filter(Boolean).join(' · ');
const navItems=[['board','Play board','◎']]; // Advanced tools live in on-board drawers, not separate navigation screens.
const phases=[['war','War column'],['selection','Select operation'],['execution','Execute'],['cleanup','Cleanup']];
const stateUI={playerPanel:null,contextPieceId:null,contextRancheriaId:null,contextCardId:null,targetMoveChoices:null,tabletopDetails:false,tabletopChoices:false,choicePage:0,historyVerification:null,horseDiscardSelection:[],horseDiscardKey:null,epidemicSelection:{},epidemicKey:null,medicinePendingBandId:null,rancheriaBandOrder:{},instructionFocus:null,home:false,eventNotice:null,pendingBoardConsequences:null,cardReveals:[],cardRevealArt:null,cardRevealBusy:false,drawers:{turn:true,dice:false,cards:false,journal:false,advanced:false},toolsOpen:false,tab:'board',modal:null,selectedSpace:'UA-2',pieceFilter:'',pieceType:'All',modalId:null,toasts:'',toastError:false,showAllLog:false,referenceKind:'War',referenceSelected:'war-01',routeTarget:'UA-1',battleWarId:null,battleUnitId:null,mapZoom:1,mapConnectMode:false,digitalSelectedPieceId:null,digitalDeck:'Development',edgeStart:null,edgeTarget:null,mapShowReach:true,saveConflict:false,showCounterGallery:false,counterGalleryPage:0,selectedCounterArt:null,counterArtType:'Band',counterCorrection:false};
let state,history={past:[],future:[]},saveRevision=null;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.state){stateUI.home=false;saveRevision=revisionOf(saved);state=migrateGame(saved.state);history={past:Array.isArray(saved.past)?saved.past.slice(-70).map(migrateGame):[],future:Array.isArray(saved.future)?saved.future.slice(-70).map(migrateGame):[]};}else state=newGame();}
catch(e){state=newGame();stateUI.toasts='Saved game could not be read. Started an empty tracker.';stateUI.toastError=true;}
function ensureFreshTab(){
 if(stateUI.saveConflict)return false;
 try{
  if(hasStaleRevision(saveRevision,localStorage.getItem(KEY))){
   stateUI.saveConflict=true;notify(SAVE_CONFLICT_MESSAGE,true);return false;
  }
 }catch(e){stateUI.saveConflict=true;notify('Unable to check the local save. Reload before making further changes.',true);return false;}
 return true;
}
function persist(){
 if(!ensureFreshTab())return false;
 try{
  const revision=makeRevision();
  localStorage.setItem(KEY,JSON.stringify({state,past:history.past,future:history.future,revision}));
  saveRevision=revision;return true;
 }catch(e){stateUI.toasts='Browser storage full or unavailable. Your last changes may not be saved. Preserve site data and check available storage.';stateUI.toastError=true;return false;}
}
function notify(message,error=false){stateUI.toasts=message;stateUI.toastError=error;renderToast();}
function savingFailed(){render();notify(stateUI.saveConflict?SAVE_CONFLICT_MESSAGE:'Cannot save this change in browser storage. The action was not applied; check browser storage availability.',true);}
/** Run only rules that the engine itself certifies as ready. Stop before any
 * player decision, physical attestation, unknown map route or card exception.
 * Every transition uses the authoritative reducer, and the save is atomic. */
function resolveAutomaticFollowups(initial,maxSteps=24){
 let current=initial,applied=[];
 for(let i=0;i<maxSteps;i++){
  const prompt=nextPlayerPrompt(current);
  if(prompt.kind!=='automatic'||!prompt.command||['ENEMY_PREPARE','ENEMY_BEGIN'].includes(prompt.command.type))break;
  try{const next=perform(current,prompt.command);if(next===current)break;
    const drawn=cardRevealEvents(current,next);current=next;applied.push(prompt.command.type);
    if(drawn.length)break;
  }catch(_){break;}
 }
 return {state:current,applied};
}
// Screen-filling celebration belongs to consequential reducer events only. All
// displayed numbers are taken from the authoritative result; never invent dice.
function ceremonyChanges(before,after){
 const changes=[];
 const trackNames={operations:'Operations',ap:'Action Points',culture:'Culture',military:'Military',mp:'Movement Points'};
 for(const [key,label] of Object.entries(trackNames)){
  const old=before.tracks?.[key],now=after.tracks?.[key];
  if(typeof old==='number'&&typeof now==='number'&&old!==now)changes.push(`${label}: ${old} → ${now}${now>old?' (+'+(now-old)+')':''}`);
 }
 const ids=new Map((before.pieces||[]).map(p=>[p.id,p]));
 let changedPieces=0;
 for(const piece of after.pieces||[]){const old=ids.get(piece.id);if(old&&old.location!==piece.location){
  changedPieces++;if(changes.length<4)changes.push(`${piece.label||piece.type||'Counter'}: ${old.location} → ${piece.location}`);
 }}
 if(changedPieces>4)changes.push(`${changedPieces-4} other counters moved`);
 if(before.phase!==after.phase)changes.push(`Phase: ${before.phase} → ${after.phase}`);
 if(before.operation!==after.operation&&after.operation)changes.push(`Operation: ${after.operation}`);
 return changes;
}
function ceremonyProcedure(command,before){
 const name=String(command.type||'');
 if(name==='ROLL_DICE'||name==='RECORD_DICE')return {title:'REFERENCE DICE',why:'A reference dice roll was requested. No battle, check, or movement rule is attached to this command.',rule:'Reference roll · no automatic rule effect',manual:true};
 if(name==='OPERATIONS_DIGITAL_ROLL')return {title:'OPERATIONS TRACK',why:`The ${before.operation||'current'} operation needs an Operations-track roll to determine its next step.`,rule:'Operations track · §4.1–4.2'};
 if(name==='BATTLE_DIGITAL_ROLL'||name==='BATTLE_ROLL')return {title:'BATTLE ROLL',why:'The active War Column and its target are resolving a battle. The dice, modifiers and outcome are applied by the battle procedure.',rule:'Battle · §7.1'};
 if(name==='ENEMY_PREPARE'||name==='ENEMY_ROLL_DISPLAY')return {title:'ENEMY INSTRUCTION',why:'An Enemy action is being determined. The dice select the active Enemy or its instruction row on the printed display.',rule:'Enemy Instruction · §6.2'};
 if(name.includes('SUCCESS_CHECK')||name.includes('RAID'))return {title:'SUCCESS CHECK',why:'The active Band is resolving its Success Check or Raid. Success counters and carried resources determine the result.',rule:'Success Check · §2.9 / Raid · §5.2.3'};
 if(name.startsWith('BATTLE_'))return {title:'BATTLE RESOLVED',why:'The battle procedure is applying its recorded outcome to the counters on the board.',rule:'Battle · §7.1'};
 if(name.startsWith('SETUP_DOWNFALL_DEVELOPMENT'))return {title:'DEVELOPMENT ROLL',why:'Scenario setup requires a die result to determine the Development outcome.',rule:'Scenario setup'};
 if(name.startsWith('ENEMY_')||name.startsWith('WAR_DRAW')||name.startsWith('WAR_AUTO_'))return {title:'ENEMY ACTION',why:'The Enemy or War procedure is resolving its next instruction and updating the board.',rule:'Enemy / War procedure'};
 if(name.includes('OPERATIONS'))return {title:'OPERATIONS TRACK',why:'The current operation is advancing the Operations marker.',rule:'Operations track'};
 return {title:'GAME EVENT',why:'A rule procedure has just changed the game state.',rule:before.phase||'Current phase'};
}
// Only display recorded dice; the presentation must never invent a result.
function gameplayCeremony(before,after,cmd){
 const name=String(cmd.type||'');const log=String(after.log?.[0]?.description||'');
 const count=Math.max(0,(after.rng?.rolls||0)-(before.rng?.rolls||0));let faces=[];
 if(name==='ROLL_DICE'){let seed=before.rng.seed;for(let i=0;i<Math.min(Number(cmd.count)||1,10);i++){const roll=rollSeededDie(seed);faces.push(roll.face);seed=roll.seed;}}
 else if(name==='RECORD_DICE')faces=(cmd.rolls||[]).map(Number).filter(x=>x>=1&&x<=6);
 else if(name==='SETUP_DOWNFALL_DEVELOPMENT_ROLL'||name==='SETUP_DEV_ROLL'){if(after.setupDevelopmentPendingDie?.die)faces=[after.setupDevelopmentPendingDie.die];}
 else if(/ROLL/.test(name)&&count>0&&count<=4){let seed=before.rng.seed;for(let i=0;i<count;i++){const roll=rollSeededDie(seed);faces.push(roll.face);seed=roll.seed;}}
 const dice=faces.length>0;const phaseChanged=after.phase!==before.phase;const gameOver=!!after.gameResult&&!before.gameResult;
 const battle=/^(BATTLE_|WAR_AUTO_BATTLE)/.test(name);const enemy=/^(ENEMY_|WAR_DRAW|WAR_AUTO_|PASSAGE_AUTO_PEACE)/.test(name);const success=/SUCCESS_CHECK|RAID_DIGITAL|RAID_CUP|GUNS_CANCEL|REDRAW/.test(name);
 const dramatic=gameOver||phaseChanged||dice||battle||enemy||success||/^(OPERATIONS_DIGITAL_ROLL|SETUP_DEV_ROLL|SETUP_DOWNFALL_DEVELOPMENT_ROLL|CULTURE_DIGITAL_GAIN|CULTURE_LEDGER_GAIN)$/.test(name);
 if(!dramatic)return null;
 const kind=gameOver?'victory':dice?'dice':battle?'battle':success?'raid':enemy?'enemy':phaseChanged?'chapter':'event';
 const procedure=ceremonyProcedure(cmd,before);const delta=ceremonyChanges(before,after);
 const relevantId=cmd.bandId||cmd.pieceId||cmd.warId||cmd.unitId||cmd.counterId||null;
 const relevantPiece=after.pieces?.find(p=>p.id===relevantId)||null;
 const art=relevantPiece?pieceArt(relevantPiece):null;
 let outcome=delta.length?delta.join(' · '):procedure.manual?'No game effects were applied automatically. Use this roll only for the rule you are resolving.':log||'The procedure advanced; inspect the board for its recorded result.';
 if(procedure.manual)outcome='Reference only. No tracks, counters or game effects were changed.';
 return {changes:delta,kind,title:gameOver?'CAMPAIGN COMPLETE':phaseChanged&&!dice?`PHASE: ${after.phase.toUpperCase().replaceAll('_',' ')}`:procedure.title,rule:procedure.rule,why:procedure.why,description:log,consequence:outcome,faces,hasHiddenDice:count>0&&!dice,art,artLabel:relevantPiece?.label||relevantPiece?.type||''};
}
function gameDiePips(face){
 const locations={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
 return `<span class="chronicle-die-grid" aria-hidden="true">${Array.from({length:9},(_,i)=>`<span class="chronicle-pip-slot">${locations[face]?.includes(i+1)?'<i class="chronicle-pip"></i>':''}</span>`).join('')}</span>`;
}
function gameplayCeremonyOverlay(){
 const v=stateUI.eventNotice;if(!v)return '';
 const faces=v.faces||[];
 const dice=faces.length?`<div class="chronicle-dice" aria-label="Dice result ${faces.join(', ')}">${faces.map((face,i)=>`<div class="chronicle-die" style="--die-index:${i}" role="img" aria-label="Die ${i+1} shows ${face}">${gameDiePips(face)}</div>`).join('')}</div>`:'';
 return `<div class="game-cinematic-shade" role="presentation"><section class="game-cinematic chronicle ${esc(v.kind)}" role="dialog" aria-modal="true" aria-labelledby="game-cinematic-title" aria-describedby="game-cinematic-description"><div class="chronicle-backdrop" aria-hidden="true"></div><div class="chronicle-content"><div class="chronicle-rule">${esc(v.rule)}</div><h2 id="game-cinematic-title">${esc(v.title)}</h2><div class="chronicle-why"><strong>WHY THIS IS HAPPENING</strong><p>${esc(v.why)}</p></div><div class="chronicle-roll-area">${v.art?`<img class="chronicle-piece" src="${esc(v.art)}" alt="${esc(v.artLabel)}">`:''}${dice||'<div class="chronicle-event-glyph" aria-hidden="true">✦</div>'}${v.hasHiddenDice?'<p class="chronicle-unknown">This procedure used dice internally; exact individual faces were not retained.</p>':''}</div><div class="chronicle-effect"><strong>WHAT THE GAME DID</strong><p id="game-cinematic-description">${esc(v.consequence)}</p>${v.description&&v.description!==v.consequence?`<small>${esc(v.description)}</small>`:''}</div><button type="button" class="game-cinematic-continue" data-action="dismiss-event">${v.changes?.length?'SHOW CHANGES ON BOARD':'RETURN TO BOARD'}</button></div></section></div>`;
}
function commit(cmd){
 if(!ensureFreshTab())return;
 stateUI.choicePage=0;stateUI.spatialChoice=null;stateUI.contextPieceId=null;stateUI.contextRancheriaId=null;stateUI.contextCardId=null;stateUI.targetMoveChoices=null;
 try{
  const initial=perform(state,cmd);
  stateUI.playerPanel=null;
  const autorun=/^(SELECT_OPERATION|ADVANCE|CLEANUP_|PLANNING_|WAR_|PASSAGE_AUTO_|PASSAGE_UNFINISH|PASSAGE_FINISH|PASSAGE_CLEAR|PASSAGE_RESTORE|CHECK|BATTLE_|ENEMY_)/.test(cmd.type)||cmd.type==='CULTURE_LEDGER_GAIN'||cmd.type==='OPERATIONS_START_ADVANCE'||cmd.type==='FINISH_BAND'||cmd.type==='ACTIVATE_BAND'||cmd.type==='BEGIN_RAID'||cmd.type==='RAID_DIGITAL_START'||cmd.type==='DIGITAL_CUP_DRAW'||cmd.type==='FINISH_SUCCESS_CHECK'||cmd.type.startsWith('RAID_CUP_')||cmd.type==='RAID_DIGITAL_REWARD'||cmd.type==='CULTURE_DIGITAL_GAIN'||cmd.type==='CULTURE_AUTO_CHECKLIST'||cmd.type==='OPERATIONS_DIGITAL_ROLL'||cmd.type==='DEVELOPMENT_PLAY_SKILLFUL';
  // Never run past a newly drawn card before the player sees its face.
  const followups=autorun&&!['ENEMY_PREPARE','ENEMY_BEGIN'].includes(cmd.type)&&!cardRevealEvents(state,initial).length?resolveAutomaticFollowups(initial):{state:initial,applied:[]};
  const after=followups.state;
  const before=state,oldHistory=history,oldEvent=stateUI.eventNotice;
  const newlyDrawn=cardRevealEvents(before,after);
  const ceremony=gameplayCeremony(before,after,cmd);
  history={past:[...history.past,copy(state)].slice(-70),future:[]};state=after;
  stateUI.eventNotice=ceremony;

  if(!persist()){state=before;history=oldHistory;stateUI.eventNotice=oldEvent;savingFailed();return;}
  stateUI.epidemicSelection={};stateUI.epidemicKey=null;
  if(newlyDrawn.length){stateUI.cardReveals.push(...newlyDrawn);stateUI.cardRevealArt=null;}
  if(ceremony)stateUI.toasts='';
  const physicalOrigins=physicalPositions(),pieceOrigins=physicalPiecePositions(),markerOrigins=visualMarkerPositions();
  stateUI.pendingBoardConsequences=ceremony?{before,origins:physicalOrigins,pieces:pieceOrigins,markers:markerOrigins}:null;
  render();
  if(!ceremony){animateInstructionChanges(before,state,physicalOrigins);animatePhysicalPieceChanges(before,state,pieceOrigins);animateVisualMarkerChanges(before,state,markerOrigins);showBoardConsequenceHighlights(before,state);animateBoardConsequenceCaptions(before,state);}if(newlyDrawn.length)loadActiveCardRevealArt();const recent=state.log[0];if(recent&&!ceremony)notify(recent.description);
 }catch(e){notify(e.message||'Action rejected.',true);}
}
function undo(){
 stateUI.epidemicSelection={};stateUI.epidemicKey=null;stateUI.cardReveals=[];stateUI.cardRevealArt=null;stateUI.eventNotice=null;
 if(!history.past.length||!ensureFreshTab())return;
 const before=state,oldHistory=history;
 state=history.past.at(-1);history={past:history.past.slice(0,-1),future:[...history.future,copy(before)]};
 if(!persist()){state=before;history=oldHistory;savingFailed();return;}
 render();notify('Undid last event. Physical board must be reconciled.');
}
function redo(){
 stateUI.epidemicSelection={};stateUI.epidemicKey=null;stateUI.cardReveals=[];stateUI.cardRevealArt=null;stateUI.eventNotice=null;
 if(!history.future.length||!ensureFreshTab())return;
 const before=state,oldHistory=history;
 state=history.future.at(-1);history={past:[...history.past,copy(before)],future:history.future.slice(0,-1)};
 if(!persist()){state=before;history=oldHistory;savingFailed();return;}
 render();notify('Redid event. Check the physical board.');
}
function newSession(demo){
 stateUI.epidemicSelection={};stateUI.epidemicKey=null;stateUI.cardReveals=[];stateUI.cardRevealArt=null;
 if(!ensureFreshTab())return;
 const scenario=$('scenario-select')?.value||state.scenario;
 if((state.pieces.length||state.log.length)&&!confirm('Replace this game? Export a backup first if you wish to keep it.'))return;
 const before=state,oldHistory=history,oldTab=stateUI.tab;
 state=newGame(scenario,demo);history={past:[],future:[]};stateUI.tab='board';stateUI.home=false;stateUI.modal=null;
 if(!persist()){state=before;history=oldHistory;stateUI.tab=oldTab;savingFailed();return;}
 render();notify(demo?'Loaded an EXAMPLE, not an official game setup.':'Created blank game. Reproduce your scenario setup from the physical rulebook.');
}
function exportGame(){const payload={format:'comancheria-companion',exportedAt:new Date().toISOString(),state};download(`${state.scenario}-comancheria-save.json`,JSON.stringify(payload,null,2),'application/json');}
function download(filename,data,mime){const url=URL.createObjectURL(new Blob([data],{type:mime}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function exportMapConnections(){
 const file={format:'comancheria-verified-map-connections',schema:1,
  note:'Player-transcribed line connections only; NOT an authoritative official board graph.',
  exportedAt:new Date().toISOString(),edges:state.edges.map(({a,b,kind})=>({a,b,kind}))};
 download('comancheria-my-map-connections.json',JSON.stringify(file,null,2),'application/json');
}
function cardPanel(title,body,sub='',actions=''){return `<section class="panel"><div class="panel-header"><div><h2>${title}</h2>${sub?`<p class="panel-sub">${sub}</p>`:''}</div>${actions?`<div class="panel-actions">${actions}</div>`:''}</div><div class="panel-body">${body}</div></section>`;}
function hButton(action,text,cl='btn sm',extra=''){return `<button type="button" class="${cl}" data-action="${action}" ${extra}>${text}</button>`;}
function header(){const scenario=SCENARIOS.find(x=>x[0]===state.scenario);const titles={dashboard:'Your table at a glance',digital:'Digital tabletop',board:'Play board',pieces:'Counter inventory',operations:'Sequence of play',cards:'Card register',journal:'Action journal',settings:'Settings & local saves'};
 const desc={dashboard:'A second set of eyes for your physical Comanchería game.',digital:'Play on this screen: roll dice, draw counters and cards, select map pieces, and record game moves.',board:'Interactive spatial layout with live piece markers and player-confirmed connections.',pieces:'Every recorded counter has a single location and an individual identity.',operations:'Follow the printed sequence, log validated actions and acknowledge manual checks.',cards:'Track card identifiers, zones and reminders; read effects on physical cards.',journal:'An auditable trail of recorded actions, including manual overrides.',settings:'Set up, export archival files and configure your locally stored game.'};
 return `<header class="masthead"><div><p class="eyebrow">${stateUI.tab==='digital'?'DIGITAL TABLETOP · ALPHA':'BOARD COMPANION'} · game-first interface · ${VERSION} rules</p><h1 class="page-title">${titles[stateUI.tab]}</h1><p class="subtitle">${desc[stateUI.tab]}</p></div><div class="mast-actions">${hButton('undo','↶ Undo','btn sm',history.past.length?'':'disabled')}${hButton('redo','↷ Redo','btn sm',history.future.length?'':'disabled')}${hButton('export','⇩ Export save','btn sm')}${hButton('modal-add-piece','＋ Record piece','btn primary sm')}</div></header>`;}
function renderStats(){const scenario=SCENARIOS.find(x=>x[0]===state.scenario);const vals=[['Military',state.tracks.military,'/ 9 max'],['Culture',state.tracks.culture,'/ 9 max'],['Player AP',state.tracks.ap,'/ 9 max'],['Enemy AP',state.tracks.enemyAp,'/ 9 max'],['Movement',state.tracks.movement,'active Band'],['Counters',state.pieces.filter(p=>p.location!=='removed'&&p.location!=='reserve').length,'recorded in play']];return `<div class="stats">${vals.map(([a,b,c],i)=>`<div class="stat ${i<2?'highlight':''}"><div class="stat-title">${a}</div><div class="stat-number">${fmt(b)}</div><div class="stat-foot">${c}</div></div>`).join('')}</div>`;}
function warnings(){const p=getProblems(state);const warns=p.map(x=>`<div class="notice alert"><strong>Check:</strong> ${esc(x)}</div>`).join('');
 return `${state.phase==='setup'?`<div class="banner"><span style="font-size:22px;color:var(--gold)">✧</span><div><h3>Setup mode — not yet playing</h3><p>Enter your counters and track values from the physical scenario setup. ${esc(state.setupNote)} Game setup is not automatically enforced.</p><div style="margin-top:10px">${hButton('start','Start tracking ▶','btn primary sm')}${hButton('demo','Use example game','btn ghost sm')}</div></div></div>`:''}${warns}${state.quality.manual?`<div class="notice compact info">${state.quality.manual} entry/ies were manually verified or corrected on the physical board. These are <strong>not</strong> automatically rules-validated.</div>`:''}`;}
function phaseProgress(){return `<div class="phase-track">${phases.map(([id,t])=>`<span class="phase-pill ${state.phase===id?'now':''}">${id===state.phase?'● ':'◦ '}${t}</span>`).join('')}</div>`;}
function setupSelect(name,available,current='',extra=''){
 return `<select class="control" name="${esc(name)}" ${extra}><option value="">Select space…</option>${available.map(x=>option(x.id,x.name,current)).join('')}</select>`;
}
function cultureSetupArtId(id){return `culture-${String(id).replace(/^C/i,'').padStart(2,'0')}`;}
function setupChoiceChip(text,active=false,extra=''){return `<button type="button" class="setup-choice-chip ${active?'active':''}" ${extra}>${esc(text)}</button>`;}
function setupCultureCardFigure(card,down=false){
 const artId=cultureSetupArtId(card.id),art=cardImageUrl(artId);
 const chosen=state.cards.some(c=>c.kind==='Culture'&&c.zone==='In play'&&String(c.identifier||'')===card.id);
 const label=`${card.family} · level ${card.level}${down?` · cost ${card.cost}`:' · free'}`;
 return `<button type="button" class="setup-card-tile ${chosen?'selected':''}" data-action="setup-pick-culture" data-culture-id="${esc(card.id)}" ${card.eligible?'':'disabled'} aria-label="Choose ${esc(card.id)} ${esc(label)}">`
  +`<div class="setup-card-face">${art?`<img src="${esc(art)}" alt="${esc(card.id)} ${esc(label)}">`:`<div class="setup-card-placeholder"><strong>${esc(card.id)}</strong><span>${esc(card.family)}</span><small>Level ${card.level}${down?` · Cost ${card.cost}`:''}</small><em>Import TTS assets to see the card face</em></div>`}</div>`
  +`<div class="setup-card-meta"><strong>${esc(card.id)}</strong><span>${esc(card.family)}</span><small>Level ${card.level}${down?` · Cost ${card.cost}`:' · Free setup card'}</small>${chosen?'<b>Chosen</b>':''}</div></button>`;
}
function setupBandFacesPanel(compact=false){
 const bands=state.pieces.filter(p=>p.type==='Band'&&p.strength>0);
 if(!bands.length)return '';
 const classes=Object.values(bands.reduce((acc,p)=>{
   const key=`${p.strength}-${p.mpRating}`;
   (acc[key]??=[]).push(p);
   return acc;
 },{}));
 return `<div class="setup-band-roster"><div class="setup-band-roster-title"><h3>${state.scenario==='downfall'?'Your starting Band counters':'Your three starting Bands'}</h3><p>Movement is printed on the Band counter. It is <strong>never</strong> a separate choice.</p></div><div class="setup-band-roster-grid">${classes.map(group=>{
   const p=group[0],face=BAND_COUNTER_FACES[p.strength],art=bandCounterArtUrl(p.strength);
   return `<div class="setup-band-counter"><div class="setup-band-counter-face">${art?`<img src="${esc(art)}" alt="Original Band counter ${esc(face.front)}">`:`<div class="setup-band-counter-fallback"><b>${p.strength}</b><span>—</span><b>${p.mpRating}</b></div>`}</div><div><strong>${group.length} × ${esc(face.front)}</strong><small>Strength ${p.strength} · ${p.mpRating} MP</small>${!compact?`<small>${state.scenario==='downfall'?'Place with your chosen Ranchería':'Already in Ranchería A’s Resources box'}</small>`:''}</div></div>`;
 }).join('')}</div></div>`;
}
function downfallBandAllocationPanel(data){
 const bands=state.pieces.filter(p=>p.type==='Band'&&p.id.startsWith('setup-downfall-band'));
 const assigned=Object.fromEntries(bands.map(p=>[p.id,/^box:setup-ranch-([ABC])$/.exec(p.location)?.[1]||'']));
 const missing=bands.filter(p=>!('ABC'.includes(assigned[p.id]||'')&&assigned[p.id]?.length===1));
 const cards=bands.map(p=>{
   const face=BAND_COUNTER_FACES[p.strength],art=bandCounterArtUrl(p.strength);
   return `<div class="setup-allocation-card"><div class="setup-allocation-face">${art?`<img src="${esc(art)}" alt="Band ${esc(face.front)}">`:`<span>${esc(face.front)}</span>`}</div><div class="setup-allocation-options"><strong>${esc(face.front)}</strong>${'ABC'.split('').map(letter=>`<button type="button" data-action="setup-allocate-band" data-id="${esc(p.id)}" data-ranch="${letter}" aria-pressed="${assigned[p.id]===letter?'true':'false'}" class="setup-ranch-choice ${assigned[p.id]===letter?'selected':''}">Ranchería ${letter}</button>`).join('')}</div></div>`;
 }).join('');
 return cardPanel('3. Place your six Band counters',`<p class="intro">You receive exactly <b>four 2–5 Bands</b> and <b>two 1–6 Bands</b>. Choose a Ranchería for each counter by clicking A, B or C. The printed strength and MPs cannot be edited.</p><div class="setup-allocation-grid">${cards}</div><div class="setup-progress-strip"><span>Bands allocated</span><b>${bands.length-missing.length} / ${bands.length}</b></div><p class="intro">Optional: assign Horses and one Trade Goods counter. Leave unallocated resources in stock.</p><form id="setup-downfall-resources-form"><div class="setup-picker-grid">${'ABC'.split('').map(letter=>`<div class="setup-resource-box"><h3>Ranchería ${letter}</h3><label class="field">Horses <input type="number" name="${letter}-horses" min="0" max="8" value="${data.allocated[letter]?.horses??0}"></label><label class="field">Trade Goods <input type="number" name="${letter}-trade" min="0" max="1" value="${data.allocated[letter]?.trade??0}"></label></div>`).join('')}</div><button type="submit" class="btn primary" ${missing.length?'disabled title="Assign all six Bands first"':''}>Place these counters and continue →</button></form>`,'Band counters are fixed printed pieces, not numerical sliders.');
}
function setupCultureStepPanel(data){
 const down=data.down;
 const available=data.availableCulture.filter(x=>x.eligible);
 const chosen=state.cards.filter(c=>c.kind==='Culture'&&c.zone==='In play').map(c=>String(c.identifier||'')).filter(Boolean);
 const imported=localCardCount()>0;
 const title=down?'5. Starting Culture purchases':'1. Choose your free Level 1 Culture card';
 const intro=down
  ?'§9.5.K: spend up to 12 Culture-cost points, one card at a time, following normal prerequisites. Click a card face to add it.'
  :'§9.2.J: choose one free Level 1 Culture Card, or skip this reward. Click a card face to take it.';
 const chosenNote=chosen.length?`<div class="notice info"><strong>Chosen so far:</strong> ${chosen.map(esc).join(', ')}</div>`:'';
 const importer=imported?'':`<div class="notice info">Import your local TTS Images folder to display the original card faces here. You can still choose by name without the images.</div>`;
 const gallery=available.length?`<div class="setup-card-gallery">${available.map(card=>setupCultureCardFigure(card,down)).join('')}</div>`:'<div class="notice alert">No more eligible Culture cards remain for this setup step.</div>';
 return cardPanel(title,`${setupBandFacesPanel()}<p class="intro">${intro}</p><div class="setup-progress-strip"><span>${down?'Culture cost used':'Free card chosen'}</span><b>${data.cultureSpent}${down?' / 12':chosen.length?' / 1':' / optional'}</b></div>${importer}${chosenNote}${gallery}<div class="form-end">${hButton('choose-tts-folder',imported?'Re-import TTS assets':'Import TTS assets for card art','btn sm')}${hButton('setup-finish-culture',down?'Finish Culture purchases':'Continue without more Culture cards','btn primary sm')}</div>`,'Visual card picking replaces the old dropdown.');
}
function setupFinalReviewPanel(ledgerPanel,checklist,count,total){
 const readiness=safeNext(state);
 return `${setupBandFacesPanel(true)}${ledgerPanel}${cardPanel('Final setup review',`<p class="intro">The scenario is now loaded. Finish any remaining confirmations below, then begin the campaign.</p><details class="setup-checklist"><summary>Opening checklist (${count}/${total})</summary>${checklist}</details><div class="notice ${readiness.ok?'info':'alert'}">${readiness.ok?'Setup ready. Begin at the War Phase.':esc(readiness.message)}</div><div class="form-end">${hButton('start','Begin campaign ▶','btn primary',readiness.ok?'':'disabled')}</div>`,'The board appears after setup so the player is not dumped into admin forms first.')}`;
}
function setupFormPanel(ledgerPanel='',checklist='',count=0,total=0){
 const data=scenarioSetupOptions(state),down=data.down;
 const unverified=state.pieces.filter(p=>p.type==='Band'&&p.ratingConfirmed===false);
 if(down&&!state.setupConfirmed.bison){
  return cardPanel('1. Roll and place nine Bison',`<p class="intro">§9.5.E and §2.2: roll for each random map space on the printed board. Enter the <b>final nine legal results</b>, or let the app do the rolling digitally.</p><form id="setup-downfall-bison-form"><div class="setup-picker-grid">${data.bison.map((loc,i)=>`<label class="field">Bison ${i+1}${setupSelect(`bison${i}`,data.spaces,loc)}</label>`).join('')}</div><button type="submit" class="btn sm">Enter physical Bison rolls</button></form><div class="form-end">${hButton('setup-digital-bison','Roll and place all nine Bison digitally','btn primary sm')}</div>`);
 }
 if(down&&state.setupConfirmed.bison&&!state.setupConfirmed.rancherias){
  return cardPanel('2. Place Rancherías A, B and C',`<p class="intro">§9.5.F: choose three different territories. Two must be Comanche-controlled and the third must contain your remaining Ranchería.</p><form id="setup-downfall-rancherias-form"><div class="setup-picker-grid">${data.ranches.map(x=>`<label class="field">Ranchería ${x.letter}${setupSelect(x.letter,data.spaces,x.location)}</label>`).join('')}</div><button type="submit" class="btn primary sm">Place Rancherías</button></form>`);
 }
 if(down&&state.setupConfirmed.rancherias&&!state.setupConfirmed.resources){
  return downfallBandAllocationPanel(data);
 }
 if(down&&state.setupConfirmed.resources&&!state.setupConfirmed.medicine){
  return cardPanel('4. Assign the six headmen Medicine ratings',`<p class="intro">§9.5.H: each Paraibo and Mahimiana must have Medicine ≥1. The six ratings together must total no more than 12.</p><form id="setup-downfall-medicine-form"><div class="setup-picker-grid">${'ABC'.split('').flatMap(letter=>['paraibo','mahimiana'].map(type=>`<label class="field">${letter} · ${type==='paraibo'?'Paraibo':'Mahimiana'}<input type="number" class="control" min="1" max="6" name="${letter}-${type}" value="${state.pieces.find(x=>x.id===`setup-${type}-${letter}`)?.medicine??2}" required></label>`)).join('')}</div><button type="submit" class="btn primary sm">Set Medicine ratings</button></form>`);
 }
 if(state.setupTemplate==='official'&&!data.cultureFinished&&(!down||state.setupConfirmed.medicine)){
  return setupCultureStepPanel(data);
 }
 if(down&&state.setupConfirmed.medicine&&state.setupCultureFinished&&!state.setupConfirmed.development){
  if(!state.setupDevelopmentRoll){
   return cardPanel('6. Starting Development card',`<p class="intro">§9.5.L: Development #35 and #36 are already in play. Roll 1d6: <b>1–2 → #26</b>, <b>3–4 → #28</b>, <b>5–6 → #38</b>. If you reroll, you must spend an allocated Trade Goods counter.</p>${state.setupDevelopmentPendingDie?`<div class="notice info">Digital die: <b>${state.setupDevelopmentPendingDie.die}</b>. ${hButton('setup-dev-commit','Accept and reveal','btn primary sm')}${state.setupDevelopmentPendingDie.rerolls===0?hButton('setup-dev-reroll','Spend Trade Goods to reroll','btn sm'):''}</div>`:hButton('setup-dev-roll','Roll development die digitally','btn primary sm')}<form id="setup-downfall-development-form"><label class="field">Final die result<select name="die" class="control">${Array.from({length:6},(_,i)=>option(i+1,String(i+1),1)).join('')}</select></label><label class="check-item"><input type="checkbox" name="spent"> Spent one Trade Goods to reroll before entering this final die</label><button type="submit" class="btn primary sm">Reveal starting Development card</button></form>`);
  }
  return cardPanel('Starting Development effect',`<p class="intro">Die ${state.setupDevelopmentRoll.die}: Development <b>#${state.setupDevelopmentRoll.number}</b> is in play. ${state.developmentPending?`Resolve the printed effect before beginning the scenario. ${esc(state.developmentPending.reason||'')}`:'Effect recorded. Confirm that its printed outcome is reconciled.'}</p>${state.developmentPending?hButton('nav-cards','Review required card effect','btn sm'):hButton('setup-finish-development','Confirm starting Development effect','btn primary sm')}`);
 }
 return setupFinalReviewPanel(ledgerPanel,checklist,count,total);
}
function officialSetupPanel(){
 if(state.phase!=='setup')return '';
 const tasks=Object.entries(state.setupChecklist||{}),count=tasks.filter(([k])=>state.setupConfirmed?.[k]).length;
 const detail=SCENARIO_DETAILS[state.scenario];
 const ledger=openingLedgerAudit(state);
 const pendingLedger=ledger.remaining.length?`<div class="notice info"><strong>Digital opening inventory checks</strong><p>${ledger.remaining.map(x=>`${esc(x.key)}: ${x.ok?'ready':'MISMATCH'}`).join(' · ')}</p>${ledger.remaining.every(x=>x.ok)?hButton('setup-audit-ledger','Validate known setup inventory','btn primary sm'):'<p>Correct the displayed mismatches before validating.</p>'}<p class="small">Printed Band Movement ratings and the remaining physical checks are still yours to confirm.</p></div>`:'';

 if(!tasks.length){
  return cardPanel('New campaign · Choose an official scenario',`<p class="intro">Select the scenario printed in the <b>Comanchería Living Rules, §§9.2–9.6</b>. The app loads the actual starting counters and cards, then walks you through the few choices the rules still leave to you.</p><div class="setup-scenario-cards">${SCENARIOS.map(([id,name,periods])=>`<label class="setup-scenario-choice"><input type="radio" name="scenario-preset" value="${id}" ${id===state.scenario?'checked':''}><span class="setup-scenario-name">${esc(name)}</span><span class="small muted">${esc(periods)} · ${esc(SCENARIO_DETAILS[id].difficulty)} · ${SCENARIO_DETAILS[id].finalHistory} victory</span></label>`).join('')}</div><div class="form-end">${hButton('setup-load-selected','Prepare selected scenario','btn primary')}${hButton('choose-tts-folder','Import TTS assets','btn sm')}</div>`,'Official scenario rules from the supplied Spring 2024 GMT booklet.');
 }
 const choiceKeys=state.setupTemplate!=='official'?[]:state.scenario==='downfall'?['bison','rancherias','resources','medicine','culture','development','bands']:['cards-culture','bands',...ledger.checks.map(x=>x.key)];
 const checklist=tasks.map(([key,label])=>`<label class="check-item ${state.setupConfirmed?.[key]?'completed':''}"><input type="checkbox" class="setup-confirm" data-key="${esc(key)}" ${state.setupConfirmed?.[key]?'checked':''} ${choiceKeys.includes(key)?'disabled title="Complete this using the guided step above"':''}><span class="check-main">${esc(label)}</span></label>`).join('');
 const stepPanel=setupFormPanel(pendingLedger,checklist,count,tasks.length);
 return cardPanel(`Prepare ${esc(SCENARIOS.find(x=>x[0]===state.scenario)?.[1])}`,`<div class="setup-progress"><b>${esc(detail.difficulty)} · ${esc(detail.periods)}</b><span class="tag gold">${count}/${tasks.length} setup steps</span></div><p class="intro">Scenario §§9.1 and ${detail.rule}. Fixed counters, cards and tracks are already installed. This screen now walks you through the remaining decisions one step at a time.</p><div class="form-end">${hButton('choose-tts-folder','Import TTS art','btn sm')}${hButton('home-menu','Back to main menu','btn ghost sm')}</div>${stepPanel}`,'Setup is a guided flow, not a dump of forms.');
}

function dicePanel(){
 const recent=state.log.filter(x=>['ROLL_DICE','RECORD_DICE'].includes(x.command)).slice(0,4);
 return cardPanel('Dice tray · optional',`<p class="intro">Use digital seeded dice or record physical rolls. Results go into the journal with Undo/Redo and survive export. <b>Dice do not automatically resolve a battle, success check or card effect.</b></p>
 <div class="rowline"><span class="muted">Random seed</span><b>${state.rng.seed}</b></div><div class="rowline"><span class="muted">Digital dice rolled</span><b>${state.rng.rolls}</b></div>
 <div class="form-end">${hButton('roll-one','Roll 1d6','btn primary sm')}${hButton('roll-two','Roll 2d6','btn sm')}</div>
 <form id="physical-dice-form" class="form-grid"><label class="field"><span>Record real die faces (e.g. 2,5)</span><input name="rolls" inputmode="numeric" placeholder="2,5" required></label><div class="field" style="align-self:end"><button class="btn sm" type="submit">Record</button></div></form>
 ${recent.length?`<div class="small muted" style="margin-top:12px">Recent: ${recent.map(x=>esc(x.description)).join(' · ')}</div>`:''}
 `,'Random numbers are reproducible, not predictions of physical dice.');
}
function procedurePanel({currentOnly=false}={}){if(state.phase==='gameover')return cardPanel('Game finished',`<div class="notice ${state.gameResult?.outcome==='victory'?'info':'alert'}"><h3>${esc(state.gameResult?.grade||state.gameResult?.outcome||'Game ended')}</h3><p>${esc(state.gameResult?.reason||'Reconcile game ending with the printed rules.')}</p><p>${esc(state.gameResult?.note||'')}</p></div><p class="small muted">Final result saved to the journal. Export the record or Undo to correct the physical-board result.</p>`);if(state.phase==='setup')return cardPanel('Ready your board',`<p class="intro">Choose and prepare one of the five official scenarios on the Board screen. Finish its printed choices and confirmations before starting. The <strong>Start tracking</strong> button begins at the War Column Phase.</p>${hButton('start','Start tracking ▶','btn primary',safeNext(state).ok?'':'disabled title="Finish physical setup confirmation first"')}`,'The printed scenario instructions remain authoritative.');
 const steps=checklist(state),next=safeNext(state),phaseName=state.phase==='execution'?(state.operation||'Operation'):state.phase==='war'?'War Column Phase':state.phase==='cleanup'?'Operation Cleanup':state.phase==='selection'?'Operation selection':'Game finished';
 const passageDigital=state.phase==='execution'&&state.operation==='Passage of Time';
 const pendingStep=steps.find(([id])=>!['done','na'].includes(state.steps[id]))?.[0];
 const visibleSteps=currentOnly&&pendingStep?steps.filter(([id])=>id===pendingStep):steps;
 const stepHTML=visibleSteps.map(([id,text,rule],i)=>`<div class="check-item ${state.steps[id]==='done'?'completed':''}"><span class="step-index">${steps.findIndex(([stepId])=>stepId===id)+1}</span><div class="check-main"><div class="step-head">${esc(text)}</div><div class="step-meta">Living Rules ${esc(rule)} · check printed rules/cards before marking</div></div><div class="check-actions">${state.phase==='execution'&&state.operation==='Passage of Time'&&['pt1','pt6','pt7','pt8','pt10'].includes(id)?`<button type="button" class="btn primary sm" data-action="${id==='pt1'?'passage-unfinish':id==='pt6'?'passage-death':id==='pt7'?'passage-replace':id==='pt8'?'passage-success':'passage-ravaged'}" ${state.steps[id]==='done'?'disabled':''}>Apply digitally</button>`:''}<button type="button" ${state.phase==='execution'&&state.operation==='Passage of Time'&&['pt1','pt8','pt9','pt10','pt11','pt12','pt14','pt15'].includes(id)?'disabled title="Use the digital Passage of Time action"':''} data-action="check" data-key="${id}" data-value="${state.steps[id]==='done'?'':'done'}" class="${state.steps[id]==='done'?'selected':''}">✓ Done</button><button type="button" ${state.phase==='execution'&&state.operation==='Passage of Time'&&['pt1','pt8','pt9','pt10','pt11','pt12','pt14','pt15'].includes(id)?'disabled title="Use the digital Passage of Time action"':''} class="na ${state.steps[id]==='na'?'selected':''}" data-action="check" data-key="${id}" data-value="${state.steps[id]==='na'?'':'na'}">N/A</button></div></div>`).join('');
 const passAuto=passageDigital?passageAutomationStatus(state):null;
 const passageAssist=passAuto?`<div class="notice info"><b>Digital Passage assistant</b><p>${esc(passAuto.reason)}</p>${hButton('passage-auto-progress','Resolve next verified Passage step','btn primary sm',!passAuto.ready?'disabled':'')}</div>`:'';
 const operationSelect=state.phase==='selection'?`<div class="notice ${requiredPassage(state)?'alert':'info'}">${requiredPassage(state)?'Mandatory Passage of Time: no recorded in-play Band or Operations marker is marked mandatory.':'Choose ONE of the four Operations. Refer to rule 3.2 and relevant cards.'}</div><div class="action-grid">${OPERATIONS.map(op=>`<button class="action-card" data-action="select-operation" data-value="${op}" ${requiredPassage(state)&&op!=='Passage of Time'?'disabled':''} style="${state.operation===op?'border-color:var(--gold);background:#4b4131':''}"><b>${op==='Take Actions'?'♞ ':op==='Culture'?'✦ ':op==='Planning'?'⊞ ':'⌛ '}${op}</b><span>${state.operation===op?'Selected · ':''}Rules ${({ 'Take Actions':'4.1','Culture':'4.2','Planning':'4.3','Passage of Time':'4.4'})[op]}</span></button>`).join('')}</div>`:'';
 return `<section class="panel"><div class="panel-header"><div><h2>${esc(phaseName)}</h2><p class="panel-sub">Guided checkpoints · manual acknowledgement is required for unimplemented rules</p></div><span class="tag gold">${state.phase==='selection'?'CHOOSE':state.phase==='execution'?'IN PROGRESS':'PROCEDURE'}</span></div><div class="procedure">${phaseProgress()}${operationSelect}${state.phase==='war'?`<div class="notice info"><strong>War procedure assistant</strong><p>${esc(warAutomationStatus(state).reason)}</p>${hButton('war-auto-until-choice','Resolve all verified War steps','btn primary sm',warAutomationStatus(state).ready?'':'disabled')}</div>`:''}${passageAssist}${stepHTML}${passageDigital?passageHeadmanPanel()+passageResourcePanel()+passagePeacePanel()+passageBisonPanel()+passageCulturePanel()+passageEndPanel():''}${state.phase==='execution'&&state.operation==='Take Actions'?`<div class="divider"></div>${bandActions()}`:''}${state.phase==='cleanup'&&getStackingProblems(state).length?`<div class="notice alert">Resolve the stacking conflicts shown below before completing cleanup.</div>`:''}<div class="next-row"><div class="muted small">${steps.length?steps.filter(x=>['done','na'].includes(state.steps[x[0]])).length+' of '+steps.length+' checkpoints recorded':'Confirm the selected operation.'}</div>${hButton('advance',state.phase==='cleanup'?'Finish cleanup → War Column':state.phase==='war'?'Go to Operation selection →':state.phase==='selection'?'Execute Operation →':'Go to cleanup →','btn primary',next.ok?'':'disabled title="Complete all checkpoints first"')}</div></div></section>`;}

function passageHeadmanPanel(){
 if(state.phase!=='execution'||state.operation!=='Passage of Time'||state.steps.pt7==='done')return '';
 const ranches=state.pieces.filter(p=>p.type==='Rancheria'&&SPACES.some(x=>x.id===p.location));
 const chiefs=state.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='removed');
 const stage=state.steps.pt5!=='done'?5:state.steps.pt6!=='done'?6:7;
 if(stage===5)return cardPanel('Passage step 5 · Headman retirement',`<p class="intro">Optional: a Mahimiana with Medicine greater than 1 may retire, transferring his rating to his Ranchería Paraibo. Cuerno Verde #29 forbids retiring a Medicine-6 Mahimiana while in play. Affiliation must be unambiguous.</p><form id="passage-retire-form"><select name="mahimianaId">${options(chiefs.map(p=>[p.id,`${p.label} · Medicine ${p.medicine??'unrecorded'}`]))}</select><button class="btn sm" type="submit">Retire selected Mahimiana</button></form><div class="form-end">${hButton('passage-retirement-done','Finish optional retirement','btn primary sm')}</div>`);
 if(stage===6){const prominent=state.cards.some(c=>c.kind==='Development'&&String(c.identifier)==='10'&&c.zone==='Hand');const headmen=state.pieces.filter(p=>['Paraibo','Mahimiana'].includes(p.type)&&p.location!=='reserve'&&p.location!=='removed');const prominentForm=prominent?`<form id="passage-prominent-form"><p>Prominent Headman #10: discard the held card instead of making one Headman Death Check (Passage penalty applies).</p><select name="headmanId">${options(headmen.filter(p=>!(state.passageProminentExemptIds||[]).includes(p.id)).map(p=>[p.id,p.label||p.id]))}</select><button class="btn primary sm" type="submit">Prevent selected Headman Death Check</button></form>`:'';const quanah=state.cards.some(c=>c.kind==='Development'&&String(c.identifier)==='74'&&['In play','Display'].includes(c.zone));return quanah?cardPanel('Passage step 6 · Headman exemptions',prominentForm+`<p>Select one Mahimiana to exclude from the Headman Death Check, then resolve the remaining checks.</p><form id="passage-quanah-form"><select name="mahimianaId">${options(chiefs.map(p=>[p.id,p.label]))}</select><button class="btn primary sm">Exempt this Mahimiana</button></form>`):prominentForm?cardPanel('Passage step 6 · Prominent Headman',prominentForm):'';}
 return '';
}
function passageResourcePanel(){
 if(state.phase!=='execution'||state.operation!=='Passage of Time'||state.steps.pt9==='done')return '';
 if(state.steps.pt8!=='done')return '<p class="small muted">Passage step 9 unlocks after the Success cup reset in step 8.</p>';
 const resource=state.pieces.filter(p=>['Resource','Bison'].includes(p.type)&&p.location==='operations');
 const ranches=state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]?.type==='round');
 if(!resource.length)return `<div class="notice info"><h3>Passage step 9 — Operations Resources</h3><p>All Operations-track Resources have been transferred.</p>${hButton('passage-finish-resources','Complete step 9','btn primary sm')}</div>`;
 return `<div class="notice info"><h3>Passage step 9 — Operations Resources</h3><p>${resource.length} Resource counter(s) still require a Ranchería destination.</p>${ranches.length===1?hButton('passage-auto-resources','Transfer all to the only Ranchería','btn primary sm'):''}${!ranches.length?'<p>No in-play Ranchería is available. Reconcile the board before continuing.</p>':`<form id="passage-resource-form" class="form-grid"><label class="field"><span>Operations-track Resource</span><select name="pieceId">${resource.map(p=>option(p.id,p.label||p.subtype||p.id)).join('')}</select></label><label class="field"><span>Destination Ranchería</span><select name="rancheriaId">${ranches.map(r=>option(r.id,r.label||r.id)).join('')}</select></label><button class="btn primary sm" type="submit">Transfer Resource</button></form>`}</div>`;
}
function passagePeacePanel(){
 if(state.phase!=='execution'||state.operation!=='Passage of Time'||state.steps.pt11==='done')return '';
 if(state.steps.pt10!=='done')return '<p class="small muted">Passage step 11 unlocks after step 10.</p>';
 const all=state.pieces.filter(p=>p.type==='Instruction'&&['Peace','Ally'].includes(p.subtype)&&SPACE[p.location]);
 const remaining=all.filter(p=>!state.passagePeaceRolls?.[p.id]);
 if(!remaining.length)return `<div class="notice info"><h3>Passage step 11 — Peace/Ally</h3><p>Every Peace/Ally counter currently on the map has been checked.</p>${hButton('passage-finish-peace','Complete step 11','btn primary sm')}</div>`;
 return `<div class="notice info"><h3>Passage step 11 — Peace/Ally</h3><p>${remaining.length} counter(s) require a die roll. Roll greater than its printed AP cost to return it to the topmost empty Enemy column slot.</p>${hButton('passage-auto-peace','Roll all digitally and complete step 11','btn primary sm')}<p class="small muted">Uses the saved digital dice seed and checks all on-map Peace/Ally counters atomically. Manual rolls remain available below.</p><form id="passage-peace-form" class="form-grid"><label class="field"><span>On-map Peace/Ally Instruction</span><select name="pieceId">${remaining.map(p=>option(p.id,`${p.label||p.subtype} · ${p.location} · cost ${p.strength||'unknown'}`)).join('')}</select></label><label class="field"><span>Die result (1–6)</span><select name="die">${options(['1','2','3','4','5','6'],'1')}</select></label><button class="btn primary sm" type="submit">Resolve roll</button></form></div>`;
}
function passageBisonPanel(){
 if(state.phase!=='execution'||state.operation!=='Passage of Time'||state.steps.pt12==='done')return '';
 if(state.steps.pt11!=='done')return '<p class="small muted">Passage step 12 unlocks after Peace/Ally step 11.</p>';
 const b=state.passageBison;
 if(!b||(!b.currentTerritory&&b.records.length<b.required))return `<div class="notice info"><h3>Passage step 12 — Bison replenishment</h3><p>${b?`${b.records.length}/${b.required}`:'1–4'} attempts. The number is one plus empty Development display spaces.</p>${hButton('passage-auto-bison','Resolve all Bison attempts digitally','btn primary sm')}${hButton('passage-bison-select','Draw random territory','btn sm')}</div>`;
 if(!b.currentTerritory)return `<div class="notice info"><h3>Passage step 12</h3><p>All ${b.required} Bison attempts resolved.</p>${hButton('passage-finish-bison','Complete step 12','btn primary sm')}</div>`;
 const territory=b.currentTerritory;
 const spaces=SPACES.filter(x=>x.type==='round'&&x.territory===territory);
 const empty=spaces.filter(x=>!state.pieces.some(p=>p.location===x.id));
 const stock=state.pieces.filter(p=>p.type==='Bison'&&p.location==='reserve');
 const current=state.pieces.filter(p=>p.type==='Bison'&&spaces.some(x=>x.id===p.location));
 const mode=empty.length&&stock.length?'place':!empty.length&&current.length&&SPACES.some(x=>x.type==='round'&&!state.pieces.some(p=>p.location===x.id))?'relocate':'none';
 const targets=mode==='place'?empty:mode==='relocate'?SPACES.filter(x=>x.type==='round'&&!state.pieces.some(p=>p.location===x.id)):[];
 const source=mode==='place'?stock:current;
 return `<div class="notice info"><h3>Passage step 12 — ${esc(TERRITORIES.find(x=>x[0]===territory)?.[1]||territory)}</h3><p>Attempt ${b.records.length+1}/${b.required}. ${mode==='place'?'Place an available Bison in an empty space in this territory.':mode==='relocate'?'This territory is full: move one of its Bison to an empty non-Enemy map space.':'No valid placement or relocation is available; record no effect.'}</p>${hButton('passage-auto-bison','Resolve remaining Bison attempts digitally','btn primary sm')}<form id="passage-bison-form" class="form-grid"><input type="hidden" name="action" value="${mode}">${mode==='none'?'':`<label class="field"><span>Bison counter</span><select name="bisonId">${source.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Destination</span><select name="destination">${targets.map(x=>option(x.id,x.name)).join('')}</select></label>`}<button type="submit" class="btn primary sm">${mode==='none'?'Record no effect':'Resolve Bison '+mode}</button></form></div>`;
}
function passageCulturePanel(){
 if(state.phase!=='execution'||state.operation!=='Passage of Time'||state.steps.pt14==='done')return '';
 if(state.steps.pt13!=='done')return '<p class="small muted">Culture purchase unlocks after Passage step 13.</p>';
 const options=culturePurchaseOptions(state),eligible=options.filter(x=>x.eligible);
 return cardPanel('Culture Card purchase · Passage step 14',`<p class="small muted">One optional purchase. Spend the printed Culture cost, own the previous level of the same set, and suspend purchased abilities whenever Culture Points fall below the card level (§1.3.3).</p>
 ${eligible.length?`<form id="culture-purchase-form"><label class="field"><span>Eligible Culture Card</span><select name="cultureId">${eligible.map(c=>option(c.id,`${c.id} · ${c.family} ${c.level} · ${c.cost} Culture Point(s)`)).join('')}</select></label><button class="btn primary sm" type="submit">Purchase and apply cost</button></form>`:'<div class="notice info">No Culture Card currently meets stock, prerequisite and Culture cost requirements.</div>'}
 <div class="form-end">${hButton('culture-decline','Decline optional Culture purchase','btn sm')}</div>
 <details><summary>24 source-backed Culture cards</summary><div class="small muted">${options.map(c=>`${esc(c.id)} ${esc(c.family)} ${c.level} · ${c.cost} CP · ${c.eligible?'eligible':!c.available?'unavailable':!c.prerequisiteMet?'requires prior level':'insufficient Culture'}`).join('<p></p>')}</div></details>`);
}
function passageEndPanel(){
 if(state.phase!=='execution'||state.operation!=='Passage of Time')return '';
 const priorComplete=Array.from({length:14},(_,i)=>['done','na'].includes(state.steps[`pt${i+1}`])).every(Boolean);
 const p=state.passageResult;
 if(state.victoryPending){const audit=historyObjectiveAudit(state);return `<div class="notice alert"><h3>Mandatory Victory Check · H${state.period}</h3><p>Compare the current printed History Card objective against the physical board (Living Rules §2.10). A failed objective ends the game. Passing in a final scenario period ends the game; otherwise reveal the next History Card and complete its effects.</p></div><form id="victory-check-form"><label class="field"><span>Is the printed H${state.period} Victory Check Objective met?</span><select name="met">${option('yes','Yes — objective achieved','yes')}${option('no','No — player defeat','yes')}</select></label><label class="field"><span>Evidence from the actual board and History Card</span><textarea name="objectiveNote" minlength="12" maxlength="500" placeholder="Which H${state.period} objective, and which counters/tracks prove the result?" required></textarea></label><label class="small"><input type="checkbox" name="transitionAck"> If this is not the final period, I removed the old History/deck, revealed the next History Card and resolved its printed effects.</label><label class="small"><input type="checkbox" name="ack" required> I checked the printed History Card's Victory Check Objective.</label><div class="form-end"><button class="btn primary" type="submit">Record Victory Check outcome</button></div></form>${audit.result!=='unknown'?`<div class="notice info"><h3>Calculated ${esc(audit.history)} objective</h3><p>${esc(audit.reason)}</p><p>Ledger result: <b>${esc(audit.grade||audit.result)}</b>. This assumes the physical board is fully recorded.</p></div><label class="small"><input type="checkbox" id="history-ledger-ack"> I checked every piece and territory against the physical board.</label><div class="form-end">${hButton('history-ledger-resolve','Apply verified ledger objective','btn primary sm')}</div>`:'<p class="small muted">This Historical objective still requires the printed card and a manual decision.</p>'}`;}
 if(p)return `<div class="notice info">Passage step 15 resolved: ${p.triggered?'Victory Check recorded':'No Victory Check required'}; ${p.mandatory?'mandatory position':`die ${p.die??'not required'}`}.</div>`;
 const mandatory=Boolean(state.mustPassage);const position=state.tracks.passage;
 return `<div class="notice info"><h3>Passage of Time · step 15</h3><p>Confirm steps 1–14 against the printed game. Operations returns to Start. ${mandatory?'The Must-do-Passage marker requires a Victory Check.':position>0?`Roll one physical d6; a result ≤ ${position} requires a Victory Check.`:'The Passage marker is at Start; review the printed track before resolving.'}</p></div><form id="passage-finish-form">${mandatory||position===0?'':`<label class="field"><span>Physical die (1–6)</span><select name="die">${options(['1','2','3','4','5','6'],'1')}</select></label>`}<label class="small"><input type="checkbox" name="ack" required> I completed all printed Passage steps and checked current card effects.</label><div class="form-end"><button class="btn primary" type="submit" ${priorComplete?'':'disabled'}>Resolve Passage of Time step 15</button></div></form>${priorComplete?'':'<p class="small muted">Complete or acknowledge steps 1–14 first.</p>'}`;
}
function cultureAndOperationsPanel(){
 if(state.phase!=='execution'||!['Culture','Take Actions'].includes(state.operation))return '';
 const culture=state.operation==='Culture';
 const preview=cultureGainPreview(state);
 const ranchTerrs=preview.ranchTerritories;
 const reviewCount=preview.audit.filter(x=>x.status==='review-needed').length;
 const cultureHTML=!culture?'':`<h3>Culture gain · rule 4.2 step 1</h3><p class="small muted">Ranchería territories: <b>${ranchTerrs.length}</b>. Ledger-control preview: <b>${preview.declaredControlled.length}</b> controlled, ${reviewCount} needing review. A territory can score under both rules.</p>
 ${state.operationEvents.cultureGain?'<div class="notice info">Culture gain recorded for this Operation. Undo to correct.</div>':`<div class="form-end">${reviewCount===0?hButton('culture-ledger-gain','Apply checked digital ledger Culture','btn primary sm'):''}</div><form id="culture-form"><div class="culture-options">${preview.audit.map(t=>`<label class="small" title="${esc([...t.blockers,...t.needsReview].join('; ')||'No enemy spaces recorded in this territory')}"><input type="checkbox" name="controlled" value="${t.id}" ${t.status==='controlled'?'checked':''}> ${esc(t.name)} <span class="tag ${t.status==='controlled'?'gold':''}">${t.status==='controlled'?'Controlled':t.status==='review-needed'?'Review':'Not controlled'}</span></label>`).join('')}</div>
 <p class="small muted" style="margin:12px 0">A territory counts as controlled when it has a Band/Ranchería and no Enemy Spaces. The ledger can be incomplete; cards and Peace counters may alter the result. <strong>Any disagreement with the preview needs a documented reason.</strong></p>
 <label class="field"><span>Why does the physical board/card differ? (only if needed)</span><input name="reason" maxlength="200" placeholder="Rule/card number and corrected control"></label>
 <label class="small" style="display:block;margin:12px 0"><input type="checkbox" name="ack" required> I have confirmed the board inventory, Peace effects, and printed card exceptions.</label><button class="btn primary sm" type="submit">Apply +${preview.gain} preview Culture</button></form>`}`;
 const operationsHTML=`<h3>Operations-track step · rules 4.1 / 4.2</h3>${state.operationEvents.operationsRoll?'<div class="notice info">Operations-track step recorded. The game can proceed once the other checkpoints are complete.</div>':`<p class="small muted">Current Operations position: <b>${state.tracks.operations===0?'Start (no die roll)':state.tracks.operations}</b>. At Start, advance one position. Otherwise, enter your physical die roll; this validates the baseline transition. Check card exceptions before applying.</p><form id="operations-check-form"><div class="form-grid">${state.tracks.operations===0?'':`<label class="field"><span>Die result</span><select name="die">${options(['1','2','3','4','5','6'],'1')}</select></label>`}<label class="field"><span>Confirm</span><label class="small"><input type="checkbox" name="ack" required> Rules and card effects checked.</label></label></div><div class="form-end"><button type="submit" class="btn sm">Record physical Operations step</button>${hButton('operations-digital-roll',state.tracks.operations===0?'Advance from Start (no die)':'Roll seeded digital die','btn primary sm')}</div></form>`}`;
 return `<section class="panel"><div class="panel-header"><h2>Automated operation assistance</h2></div><div class="panel-body">${cultureHTML}${culture?'<div class="divider"></div>':''}${operationsHTML}<details class="small" style="margin-top:14px"><summary>Card exception / manual override</summary><p class="muted">Only use when a printed rule or active card changes the normal procedure. The reason is saved in the journal.</p><form id="operation-override-form"><label class="field"><span>Procedure step</span><select name="key">${culture&&!state.operationEvents.cultureGain?option('cultureGain','Culture gain'):''}${!state.operationEvents.operationsRoll?option('operationsRoll','Operations-track check'):''}</select></label><label class="field"><span>Card or rule and what happened</span><input name="reason" minlength="8" maxlength="250" placeholder="Card # / rule and override" required></label><button type="submit" class="btn sm">Record manual exception</button></form></details></div></section>`;
}
function successCheckPanel(){
 if(state.pending?.type!=='raid')return '';
 const sc=state.successCheck;
 if(state.lastSuccessCheck){const x=state.lastSuccessCheck;
  return `<div class="notice info"><strong>Guided check completed:</strong> ${x.successes} Success, ${x.enemyAPs} Enemy AP, ${x.instructions} Instruction counter(s). Enter exactly ${x.successes} successes when resolving the Raid. Verify Enemy Instruction/Peace effects.</div>`;
 }
 if(!sc)return `<div class="notice info">Digital rule 2.9 check: calculate draws from Band strength, roll Mahimiana bonus dice in-app, and draw directly from the cup. Physical rolls remain optional. You can also use a Guns cancellation or a possessed Trade Goods counter to redraw after all counters have been entered.</div>${hButton('modal-start-success-check','Begin guided Success Check','btn primary sm')}`;
 const remaining=sc.expected-sc.drawIds.length;
 const cup=state.pieces.filter(p=>p.location==='cup'&&(p.type==='Instruction'||p.type==='Marker'&&/^(Success|Enemy AP [234])$/.test(p.subtype)));
 const selected=sc.drawIds.map(id=>state.pieces.find(p=>p.id===id)).filter(Boolean);
 const attempts=sc.gunAttempts||[],canceled=sc.canceledDrawIds||[];
 const availableAP=selected.filter(p=>p.location==='check-draw'&&/^Enemy AP [234]$/.test(p.subtype)&&!attempts.some(a=>a.counterId===p.id));
 const guns=state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Guns'&&p.location===`held:${sc.bandId}`);
 const goods=state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location===`held:${sc.bandId}`);
 const gotResourceAction=attempts.length||sc.redraws;
 const extra=remaining?'':`<div class="resource-actions"><h3>Optional resource effects · §2.7.2</h3>
 <p class="small muted">Use a digital Guns die and digital Trade Goods redraw, or record the equivalent physical action. Counter cancellation does NOT replace a draw.</p>
 ${availableAP.length&&guns.length?`<form id="guns-cancel-form" class="form-grid"><label class="field"><span>Drawn Enemy AP to cancel</span><select name="counterId">${availableAP.map(p=>option(p.id,`${p.subtype} · ${p.id}`)).join('')}</select></label><label class="field"><span>Possessed Guns counter</span><select name="gunId">${guns.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Optional physical die (1–6)</span><input name="die" type="number" min="1" max="6" value="1"></label><label class="field"><span>Die source</span><select name="diceMode"><option value="digital">Roll in app</option><option value="physical">Record physical die</option></select></label><div class="field" style="align-self:end"><button class="btn sm" type="submit">Check Guns cancellation</button></div></form>`:''}
 ${goods.length?`<form id="trade-goods-redraw-form"><label class="field"><span>Possessed Trade Goods</span><select name="resourceId">${goods.map(p=>option(p.id,`${p.label} · ${p.id}`)).join('')}</select></label><label class="small" style="display:block;margin:10px 0"><input type="checkbox" name="ack" required> I confirm spending the Trade Goods counter; digital draws will be restored automatically.</label><button type="submit" class="btn sm">Spend Trade Goods · redraw all ${sc.expected}</button></form>`:''}
 ${attempts.length?`<p class="small muted">Guns attempts: ${attempts.map(a=>`${a.canceled?'canceled':'failed'} (${a.die} vs ${a.needed})`).join(', ')}.</p>`:''}
 ${sc.redraws?`<p class="small muted">Trade Goods redraws completed: ${sc.redraws}</p>`:''}
 </div>`;
 return `<div class="notice info"><b>Guided Success Check · §2.9</b><div class="small">Band Strength ${sc.base} + Mahimiana bonus ${sc.bonus} = <b>${sc.expected} draws</b> · ${remaining} left.</div><div class="small">Drawn: ${selected.length?selected.map(p=>esc(p.subtype||p.label)+(canceled.includes(p.id)?' (Guns canceled)':'')).join(', '):'None yet'}</div></div>
 ${remaining?`<div class="button-row"><button type="button" class="btn primary sm" data-action="digital-draw-cup">Draw one digitally</button><button type="button" class="btn sm" data-action="digital-draw-all">Draw all ${remaining} digitally</button></div><form id="check-draw-form" class="form-grid"><label class="field"><span>Counter you physically drew</span><select name="id">${cup.map(p=>option(p.id,`${p.subtype||p.label} · ${p.id}`)).join('')}</select></label><div class="field" style="align-self:end"><button class="btn primary sm" type="submit" ${cup.length?'':'disabled'}>Record drawn counter</button></div></form>${cup.length?'':'<div class="notice alert">No valid counters remain recorded in the cup. Reconcile physical pieces before proceeding.</div>'}`:
 `${extra}<form id="check-finish-form"><p class="small muted">Complete after resolving resource effects and any drawn Enemy Instructions. Canceled AP counters stay in the cup.</p><label class="field"><span>Instruction outcomes / physical-board note (if Instructions were drawn)</span><input name="instructionNote" placeholder="Rule 6.2.2.C, instruction resolved and display checked"></label><label class="small"><input type="checkbox" name="ack"> I physically resolved any drawn Enemy Instructions</label><div class="form-end"><button class="btn primary sm" type="submit">Finish Success Check</button></div></form>`}
 ${gotResourceAction?'<div class="small muted">To cancel or revise a check after resource use, use Undo to reverse resource effects first.</div>':hButton('cancel-success-check','Cancel check and restore cup ledger','btn sm')}`;
}
function territoryControlPanel(){
 const audit=territoryControlAudit(state);
 return cardPanel('Territory control · recorded board',`<p class="intro">Rule 1.2 checks the <strong>recorded</strong> Bands, Rancherías, Tribes, Settlements and applicable Peace counters. This is a preview only: missing counters or card effects can change the actual result.</p>${audit.map(t=>`<div class="rowline"><span><strong>${esc(t.name)}</strong><span class="small muted" style="display:block">${t.blockers.length?esc(t.blockers.join(' · ')):t.needsReview.length?esc(t.needsReview.join(' · ')):t.friendly?'No Enemy Spaces recorded':'No Band or Ranchería recorded'}</span></span><span class="tag ${t.status==='controlled'?'gold':''}">${t.status==='controlled'?'Controlled':t.status==='review-needed'?'Needs review':'Not controlled'}</span></div>`).join('')}`,'Square Peace may extend to Settlements only when their Enemy-column affiliation is known.');
}
function cupInventoryPanel(){
 const audit=cupInventory(state),b=audit.cupByType,z=audit.zones;
 const row=(label,num)=>`<div class="rowline"><span>${label}</span><strong>${num}</strong></div>`;
 const stage=state.successCheck;
 const recent=state.log.filter(x=>/^(DIGITAL_CUP_DRAW|RECORD_SUCCESS_DRAW|CLEANUP_DRAW_CUP|CLEANUP_TRAIL_PLACE|GUNS_CANCEL_AP|TRADE_GOODS_REDRAW|DEVELOPMENT_COUNTING_COUP_REDRAW|CANCEL_SUCCESS_CHECK|FINISH_SUCCESS_CHECK|ENEMY_PAY|ENEMY_FINISH|ENEMY_AUTO_FINISH|PASSAGE_RESTORE_SUCCESS|RAID_CUP_EXCHANGE|CLEANUP_CUP_EXCHANGE)$/.test(x.command)).slice(0,8);
 const apRecycled=state.log.find(x=>/^(ENEMY_PAY|ENEMY_AUTO_FINISH|ENEMY_FINISH)$/.test(x.command));
 const overview=`<div class="cup-count-banner"><div class="cup-count-circle"><b>${audit.inCup}</b><small>IN CUP</small></div><div><strong>One physical counter = one tracked identity</strong><div class="small muted">${audit.originals} of ${audit.capacity} playable starting counters accounted for; extra Enemy Instructions may enter the cup as play advances.</div></div></div>`;
 const collections=[['Draw cup',z.cup],['Success Check being resolved',z.drawn],['Available Enemy AP box',z.availableEnemyAP],['Success Out of Play',z.successOut],['Headman Medicine boxes',z.medicine],['Operations track',z.operations],['On map / Wagon Train',z.map],['Other recorded collections',z.other]];
 const allocations=collections.map(([label,items])=>`<details class="cup-location-section"><summary>${esc(label)} <strong>${items.length}</strong></summary>${items.length?`<div class="cup-token-grid">${items.map(p=>`<span class="cup-counter-token" title="${esc(p.id)} · ${esc(p.location)}">${p.type==='Face-down ?'?'<span class="cup-hidden-face">?</span>':pieceIcon(state.pieces.find(x=>x.id===p.id))}${esc(p.type)} <small>${esc(p.id)}</small></span>`).join('')}</div>`:'<p class="small muted">No counters here.</p>'}</details>`).join('');
 const active=stage?`<div class="notice info"><strong>Active Success Check</strong> · ${stage.drawIds.length}/${stage.expected} counters drawn.${stage.canceledDrawIds.length?` ${stage.canceledDrawIds.length} Enemy AP canceled and returned.`:''}<div class="form-end">${hButton('digital-draw-cup','Draw one','btn primary sm',stage.drawIds.length<stage.expected?'':'disabled')}${hButton('digital-draw-all','Draw remaining','btn sm',stage.drawIds.length<stage.expected?'':'disabled')}</div></div>`:'';
 return `<div data-cup-ledger>${cardPanel('Success Check cup · physical ledger',`${overview}${audit.issues.length?`<div class="notice alert">${esc(audit.issues.join(' '))}</div>`:''}${row('Success',b.Success)}${row('Enemy AP 4',b['Enemy AP 4'])}${row('Enemy AP 3',b['Enemy AP 3'])}${row('Enemy AP 2',b['Enemy AP 2'])}${row('Enemy Instructions',b.Instruction)}${row('Unknown face-down counters',b['Face-down ?'])}${apRecycled?`<div class="notice info"><strong>Latest Enemy AP settlement</strong><p>${esc(apRecycled.description)}</p><span class="small">Spent Enemy AP counter faces go straight back into this cup. Only their unused AP value, if any, remains on the Enemy AP track.</span></div>`:''}${active}<p class="small muted">Digital pulls use an unbiased seeded selection from the current physical IDs; drawn counters cannot be drawn again unless a game rule returns them to the cup. Undo restores the entire prior state.</p><details><summary>All starting counter locations and movements</summary>${allocations}</details>${recent.length?`<details><summary>Last ${recent.length} cup transactions</summary>${recent.map(e=>`<p class="small cup-log-line"><b>${esc(e.command)}</b> ${esc(e.description)}</p>`).join('')}</details>`:''}`,'The 22 spare counters are not mixed with the playable set. All movements remain part of the saved game.')}</div>`;
}
function pointLossPanel(){
 if(state.phase==='setup'||state.phase==='gameover')return '';
 return cardPanel('Rules-based point loss · §2.11',`<p class="intro">Automatically substitutes <b>2 points on the other track</b> for each Military/Culture point you cannot lose. The result may cause immediate defeat. Use only after confirming the physical enemy/card instruction.</p><form id="loss-form" class="form-grid"><label class="field"><span>Track to lose</span><select name="field">${option('military','Military')}${option('culture','Culture')}</select></label><label class="field"><span>Amount instructed</span><input type="number" min="1" max="99" name="amount" value="1" required></label><label class="field"><span>Instruction or card reference</span><input name="reason" placeholder="e.g. Enemy action §6.3" minlength="4" required></label><div class="field" style="align-self:end"><button class="btn sm" type="submit">Apply validated loss</button></div></form>`,'Direct track editing is still available as a logged manual correction.');
}
function bandActions(){const active=state.activeBandId&&state.pieces.find(p=>p.id===state.activeBandId);
 if(state.pending?.type==='raid')return `<div class="notice alert"><strong>Raid needs resolution.</strong> One movement point has been spent. Consult §2.9 and §5.2.3 and account for all physical draws.</div>${successCheckPanel()}<div class="form-end">${hButton('modal-resolve-raid','Resolve Raid and rewards','btn primary',state.successCheck?'disabled title="Finish cup check first"':'')}${hButton('cancel-raid','Cancel raid','btn sm',state.successCheck||state.lastSuccessCheck?'disabled title="Cancel the check first or use Undo"':'')}</div>`;
 if(active){const horses=state.pieces.filter(x=>x.location===`held:${active.id}`&&x.subtype==='Horse');const bison=state.pieces.filter(x=>x.location===active.location&&x.type==='Bison');const mahimiana=state.pieces.some(x=>x.location===`held:${active.id}`&&x.type==='Mahimiana');
  return `<div class="active-band"><div class="rowline"><div><span class="tiny-label">ACTIVE BAND</span><h3>${esc(active.label)}</h3><span class="small muted">${esc(formatLocation(state,active.location))} · ${active.strength} strength · ${horses.length} Horse counter(s)</span></div><div style="text-align:right"><span class="tiny-label">MOVEMENT LEFT</span><div style="font:40px Georgia,serif;color:var(--gold)">${state.tracks.movement}</div></div></div></div><div class="action-grid">${activeBandChoices(state).filter(x=>x.kind!=='finish').map(x=>`<button class="action-card" data-action="guided-band-choice" data-guided-id="${esc(x.id)}" title="${esc(x.detail)}"><b>${esc(x.label)}</b><span>${esc(x.detail)}</span></button>`).join('')||'<p class="small muted">No legal actions available. Finish this Band.</p>'}</div><div class="form-end">${hButton('horse-mp','Spend Horse → +1 movement','btn sm',horses.length?'':'disabled')}${hButton('finish-band','Finish Band','btn primary sm')}</div>`;}
 const bands=state.pieces.filter(x=>x.type==='Band'&&x.location!=='reserve'&&x.location!=='removed');
 return `<p class="intro">Select an eligible Band. For free Ranchería activation, you must separately verify medicine-track order using rule 4.1.</p>${bands.length?`<div class="rowline"><select class="control" id="activate-band-id" style="flex:1;min-width:170px">${bands.map(x=>option(x.id,`${x.label}${x.finished?' (Finished — AP activation)':''} · ${formatLocation(state,x.location)}`,x.id)).join('')}</select><select class="control" id="activate-mode" style="flex:1;min-width:170px">${option('rancheria','Ranchería / medicine (manual verification)')}${option('ap','Spend AP (outside Band)')}</select></div><div class="form-end"><label class="small"><input id="activate-ack" type="checkbox"> I checked Ranchería medicine prerequisites</label>${hButton('activate-band','Activate Band','btn primary sm')}</div>`:`<div class="empty">No unfinished Bands on the map or in Ranchería boxes. Add counters or finish this procedure.</div>`}`;
}
function spaceCount(id){return state.pieces.filter(x=>x.location===id).length;}
function nodePieceGlyph(p){if(p.faceDown)return '?';return ({Band:'♞',Rancheria:'⌂',Settlement:'▥','War Column':'⚔',Bison:'◈',Resource:'◆',Tribe:'✽',Instruction:'✧',Marker:'●'})[p.type]||'●';}
function mapSpaceNode(sp,overlay,routePath=[],candidate={legal:[],blocked:[]},clickDestinations=new Set()){
 const id=sp.id,pos=boardImageUrl()?boardImagePosition(id):boardPosition(id);
 if(!pos)return '';
 const [x,y]=pos,here=state.pieces.filter(p=>p.location===id),count=here.length;
 const isSelected=stateUI.selectedSpace===id;
 const active=state.pieces.some(p=>p.id===state.activeBandId&&p.location===id);
 const war=here.some(p=>p.type==='War Column');
 const neighbors=state.edges.some(e=>(e.a===stateUI.selectedSpace&&e.b===id)||(e.b===stateUI.selectedSpace&&e.a===id));
 const connected=stateUI.selectedSpace!==id&&neighbors;
 const legalMove=candidate.legal.find(x=>x.to===id);
 const blockedMove=candidate.blocked.find(x=>x.to===id);
 const canReach=!stateUI.digitalSelectedPieceId&&Boolean(overlay?.reachable[id])&&id!==overlay?.from;
 const onRoute=routePath.includes(id);
 const isClickDestination=clickDestinations.has(id);
 const classes=['map-node',isClickDestination?'click-drop-legal':'',isSelected?'selected':'',active?'active-band-node':'',war?'war-column-node':'',connected?'connected':'',count?'has-counters':'',canReach?'mp-reachable':'',legalMove?'move-valid':'',blockedMove?'move-blocked':'',onRoute?'route-preview-node':''].filter(Boolean).join(' ');
 const title=`${sp.name}${isClickDestination?' · CLICK TO PLACE SELECTED COUNTER':''}${legalMove?' · LEGAL MOVE · '+legalMove.cost+' MP':blockedMove?' · NOT LEGAL · '+blockedMove.reason:''} · ${count} recorded counter${count===1?'':'s'}${count?': '+here.slice(0,15).map(labelPiece).join(', '):''}`;
 const round=sp.type==='round';
 const fill=round?MAP_PALETTE[sp.territory]:(sp.type==='canyon'?MAP_PALETTE.canyon:sp.type==='reservation'?MAP_PALETTE.reservation:MAP_PALETTE.enemy);
 const printed=Boolean(boardImageUrl());
 const base=printed?`<circle cx="${x}" cy="${y}" r="22" fill="transparent" class="printed-hit-target"/>`:round?`<circle class="map-node-core" cx="${x}" cy="${y}" r="23" fill="${fill}"/>`:
  sp.type==='canyon'?`<polygon class="map-node-core" points="${x-25},${y-15} ${x},${y-29} ${x+25},${y-15} ${x+25},${y+15} ${x},${y+29} ${x-25},${y+15}" fill="${fill}"/>`:
  sp.type==='reservation'?`<circle class="map-node-core" cx="${x}" cy="${y}" r="43" fill="${fill}"/>`:
  `<rect class="map-node-core" x="${x-22}" y="${y-22}" width="44" height="44" rx="6" fill="${fill}"/>`;
 const label=round?`${sp.area}`:id==='RESERVATION'?'R':id==='PD'?'PD':id;
 const labelFont=sp.type==='reservation'?15:round?20:13;

 const instructionMarkers=here.filter(instructionOnBoard).map((piece,i)=>`<g class="tt-map-ally-marker" transform="translate(${x-12+i*17} ${y+2})"><foreignObject x="-18" y="-20" width="36" height="43">${instructionTile(piece,true)}</foreignObject></g>`).join('');
 // Printed map circle is the sole resting anchor. Stack counters at its exact
 // centre; spread temporarily only during inspection, never displace Tribes or
 // Bison in normal play. Sorting keeps the topmost visible face predictable.
 const stackPriority=p=>({Rancheria:1,Settlement:2,'War Column':2,Band:3,Marker:3,Resource:4,Tribe:8,Bison:9})[p.type]??5;
 const physicalHere=here.filter(p=>!instructionOnBoard(p)).sort((a,b)=>stackPriority(a)-stackPriority(b)||a.id.localeCompare(b.id));
 const piecePreview=physicalHere.map((piece,i)=>{
 const col=i%4,row=Math.floor(i/4),n=Math.min(4,physicalHere.length-row*4);
 const fanX=(col-(n-1)/2)*25,fanY=(row-(Math.ceil(physicalHere.length/4)-1)/2)*27;
 const hue=piece.type==='Band'?'#b6d2a0':piece.type==='Rancheria'?'#f4ce91':piece.type==='War Column'?'#f19a87':piece.type==='Settlement'?'#d7ad9e':piece.type==='Tribe'?'#b0c6ba':'#e1ccab';const art=pieceArt(piece);
 // Authentic board: the printed possession layer already renders every
 // carried counter once beside its actual Band. Do not draw a second copy in
 // the map-node preview (which previously duplicated up to three counters).
 const carried=piece.type==='Band'?state.pieces.filter(p=>p.location===`held:${piece.id}`):[];
 const cargo='';
 const cargoOverflow='';
 return `<g transform="translate(${x} ${y})" class="map-counter-anchor"><g class="map-mini-counter map-piece-target tt-board-counter ${stateUI.digitalSelectedPieceId===piece.id||Object.values(stateUI.epidemicSelection).includes(piece.id)?'piece-is-selected':''}" style="--fan-x:${fanX}px;--fan-y:${fanY}px" data-physical-piece-id="${esc(piece.id)}" data-action="board-select-piece" data-id="${esc(piece.id)}" role="button" tabindex="0" aria-label="Select ${esc(labelPiece(piece))}"><title>${esc(labelPiece(piece))} · select counter</title><rect x="-10" y="-11" width="20" height="21" rx="2" fill="${piece.type==='Band'&&piece.finished?'#8e7159':hue}"/>${art?`<image href="${esc(art)}" x="-9" y="-10" width="18" height="19" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`:`<text y="4" text-anchor="middle">${esc(nodePieceGlyph(piece))}</text>`}${cargo}${cargoOverflow}</g></g>`;}).join('');
 return `<g class="${classes}" data-action="select-space" data-id="${esc(id)}" role="button" tabindex="0" aria-label="${esc(title)}"><title>${esc(title)}</title>${isSelected?`<circle class="map-focus-ring" cx="${x}" cy="${y}" r="${sp.type==='reservation'?50:31}"/>`:''}${base}${printed?'':`<text class="map-node-number" x="${x}" y="${y+6}" text-anchor="middle" style="font-size:${labelFont}px">${esc(label)}</text>`}${printed?'':round?`<text class="map-node-id" x="${x}" y="${y+38}" text-anchor="middle">${esc(sp.territory)}-${sp.area}</text>`:sp.type==='enemy'?`<text class="map-node-id" x="${x}" y="${y+36}" text-anchor="middle">ENEMY</text>`:''}${piecePreview}${instructionMarkers}${legalMove?`<g class="move-valid-cost" transform="translate(${x+29} ${y-28})"><circle r="15"/><text y="5" text-anchor="middle">${legalMove.cost}</text></g>`:''}</g>`;
}
function mapLinkLine(link,routePath=[]){
 const mapper=boardImageUrl()?boardImagePosition:boardPosition;const [x1,y1]=mapper(link.a),[x2,y2]=mapper(link.b);
 const highlight=stateUI.selectedSpace===link.a||stateUI.selectedSpace===link.b;
 const onRoute=routePath.some((id,i)=>i>0&&((id===link.a&&routePath[i-1]===link.b)||(id===link.b&&routePath[i-1]===link.a)));
 return `<line class="map-verified-link ${link.kind==='dashed'?'dashed':''} ${link.enemyFor?.length>1?'enemy-shared':link.enemyFor?.length?'enemy-'+link.enemyFor[0].toLowerCase():''} ${highlight?'highlighted':''} ${onRoute?'route-preview-link':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
}
/** Printed spaces that can resolve the director's current spatial decision.
 * Only offer paths with a proven reducer command; never invent an adjacency. */
function directorSpatialTargets(prompt=nextPlayerPrompt(state)){
 if(prompt.kind!=='player'||!Array.isArray(prompt.choices))return new Map();
 const targets=new Map();
 for(const choice of prompt.choices){
  const command=choice.command;
  if(!command)continue;
  const tribeChoice=['RAID_CUP_CHOOSE_ALLY','CLEANUP_CUP_CHOOSE_ALLY'].includes(command.type);
  const target=tribeChoice?state.pieces.find(p=>p.id===command.tribeId)?.location:(command.to||command.space);
  if(!SPACE[target])continue;
  if(!tribeChoice&&!['PLANNING_MOVE_RANCHERIA','CULTURE_POLITICS_MOVE_ALLY','CULTURE_WAR_EVADE','DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT','DEVELOPMENT_NUEVO_APACHERIA','CLEANUP_TRAIL_PLACE','ENEMY_SETTLE'].includes(command.type))continue;
  try{perform(state,command);}catch{continue;}
  if(!targets.has(target))targets.set(target,[]);
  targets.get(target).push(choice);
 }
 return targets;
}
/** Legal map destinations for a selected physical counter. Shared by mouse,
 * touch click-to-place and the existing drag-drop routes; no state is mutated. */
function selectedCounterMapActions(pieceId){
 const piece=state.pieces.find(p=>p.id===pieceId);
 if(!piece)return [];
 const prompt=nextPlayerPrompt(state);
 const options=[...directorPieceDropOptions(state,pieceId,prompt)];
 if(['Resource','Bison','Mahimiana'].includes(piece.type))options.push(...resourceDropOptions(state,pieceId));
 if(piece.type==='Band'&&piece.id===state.activeBandId){
  for(const move of boardMoveOptions(state,piece.id).legal)options.push({to:move.to,command:{type:'MOVE_BAND',to:move.to},label:`Move ${piece.label||'Band'} to ${SPACE[move.to]?.name||move.to}`});
 }
 // Validate every candidate afresh against the single authoritative reducer.
 return options.filter(o=>SPACE[o.to]&&o.command).filter(o=>{try{perform(state,o.command);return true;}catch{return false;}});
}
function rancheriaBoardActions(rancheriaId){
 const prompt=nextPlayerPrompt(state);
 if(prompt.kind!=='player')return [];
 return (prompt.choices||[]).filter(choice=>choice.command?.rancheriaId===rancheriaId).filter(choice=>{
  try{perform(state,choice.command);return true;}catch{return false;}
 });
}
function printedCardActions(cardId){
 const prompt=nextPlayerPrompt(state);
 if(prompt.kind!=='player'||!state.cards.some(card=>card.id===cardId))return [];
 return (prompt.choices||[]).filter(choice=>choice.command?.cardId===cardId).filter(choice=>{
  try{perform(state,choice.command);return true;}catch{return false;}
 });
}
function boardMap(printedSurface=false){
 const edges=mapEdgesForDisplay(state.edges);
 const overlay=stateUI.mapShowReach&&(!stateUI.digitalSelectedPieceId||stateUI.digitalSelectedPieceId===state.activeBandId)?bandMovementOverlay(state,state.activeBandId):null;
 const activeBand=state.pieces.find(p=>p.id===state.activeBandId);
 const moveOptions=stateUI.digitalSelectedPieceId&&stateUI.digitalSelectedPieceId===state.activeBandId?boardMoveOptions(state,stateUI.digitalSelectedPieceId):null;
 let routePath=[];if(overlay&&activeBand&&SPACE[stateUI.routeTarget]){const route=planBandRoute(state,activeBand.id,stateUI.routeTarget);if(route.found)routePath=route.path;}
 const actualBoard=boardImageUrl();const className=(stateUI.mapConnectMode?'world-board linking':'world-board')+(actualBoard?' authentic-board':'');
 const regions=`<path class="map-region ua" d="M170,80 Q430,-10 705,103 L704,254 501,271 293,254 152,201 Z"/>
 <path class="map-region la" d="M677,125 Q860,105 1045,167 L1048,391 840,379 663,318 Z"/>
 <path class="map-region le" d="M84,206 L321,227 468,288 458,486 333,514 79,457 Z"/>
 <path class="map-region rr" d="M565,276 L785,325 1039,368 1014,555 779,542 600,494 Z"/>
 <path class="map-region rg" d="M73,467 L394,473 569,566 587,707 65,713 Z"/>
 <path class="map-region bc" d="M480,464 L762,504 1045,544 1057,712 492,709 Z"/>`;
 const labels=MAP_REGION_LABELS.map(([code,name,x,y])=>`<text class="map-region-label" data-zone="${code}" x="${x}" y="${y}" text-anchor="middle">${name}</text>`).join('');
 const guide=`<path class="map-landmark" d="M90 82 C190 152 131 240 164 311 S188 448 173 510 S292 620 314 705"/>
 <path class="map-landmark" d="M130 30 C220 82 323 80 415 135 S651 285 830 270 S959 220 1045 190"/>
 <path class="map-landmark" d="M410 45 Q464 135 507 260 T568 515 T665 708"/>
 <path class="map-landmark" d="M235 690 Q406 675 565 640 T1000 669"/>`;
 const directorTargets=printedSurface?directorSpatialTargets():new Map();
 const clickDestinations=new Set(stateUI.digitalSelectedPieceId?selectedCounterMapActions(stateUI.digitalSelectedPieceId).map(option=>option.to):[]);
 const nodes=SPACES.map(sp=>mapSpaceNode(sp,overlay,routePath,moveOptions||{legal:[],blocked:[]},clickDestinations)).join('');
 const spatialMarkers=[...directorTargets.entries()].map(([id,choices])=>{
  const [x,y]=boardImagePosition(id);
  return `<g class="director-spatial-target" data-action="director-map-target" data-id="${esc(id)}" role="button" tabindex="0" aria-label="${esc(choices.length===1?choices[0].label:`Choose action at ${SPACE[id]?.name||id}`)}" transform="translate(${x} ${y})"><title>${esc(choices.map(x=>x.label).join(' / '))}</title><circle r="28" class="director-target-halo"/><circle r="17" class="director-target-centre"/><text y="5" text-anchor="middle" pointer-events="none">${choices.length>1?choices.length:'➜'}</text></g>`;
 }).join('');
 return `${printedSurface?'':`<div class="map-toolbar"><div class="map-title"><span class="map-eyebrow">${actualBoard?'YOUR BOARD · INTERACTIVE':'BOARD · SCHEMATIC MODE'}</span><strong>Southern Plains · 1700–1875</strong><small>${actualBoard?'TTS board imported locally · select a counter to use its actions':'Select your TTS Images folder to enable the authentic board'}</small></div><div class="map-toolbar-actions">${hButton('map-zoom-out','−','btn slim',stateUI.mapZoom<=1?'disabled title="Minimum zoom"':'title="Zoom out"')}${hButton('map-zoom-in','+','btn slim',stateUI.mapZoom>=2?'disabled title="Maximum zoom"':'title="Zoom in"')}${hButton('map-connect',stateUI.mapConnectMode?'Cancel line':'Connect spaces','btn sm',stateUI.mapConnectMode?'aria-pressed="true"':'aria-pressed="false"')}${activeBand?hButton('map-toggle-reach',stateUI.mapShowReach?'Hide MP overlay':'Show MP overlay','btn sm',`aria-pressed="${stateUI.mapShowReach}"`):''}</div></div>`}
 ${!printedSurface&&moveOptions&&state.edges.length===0?'<div class="notice alert"><b>No map connections have been recorded.</b> The engine cannot show valid moves until the printed board links are entered and verified. Use <b>Connect spaces</b> to record the board network.</div>':''}
 ${!printedSurface&&moveOptions?`<div class="notice compact info"><b>Valid Band moves:</b> ${moveOptions.legal.length} highlighted in green · numbers show exact MP cost. ${moveOptions.blocked.length} connected destination(s) are blocked (red outline). Only green destinations can be clicked to move.</div>`:''}
 ${!printedSurface&&overlay?`<div class="notice compact info"><b>Movement overlay:</b> ${overlay.reachableCount} other space(s) within ${overlay.available} MP through entered lines (${overlay.costPerEdge} MP per link). Pale rings indicate ledger-reachable spaces, <b>not</b> guaranteed legal moves. Select a target to preview a path.</div>`:''}
 ${!printedSurface&&stateUI.mapConnectMode?`<div class="notice compact info"><strong>Connection entry:</strong> Selected start <b>${esc(stateUI.edgeStart||stateUI.selectedSpace)}</b>. Click a second map space, then confirm the line type against your physical board. No line is recorded until you confirm.</div>`:''}
 <div class="world-map-scroller" tabindex="0" aria-label="Entire printed Comanchería board"><svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}" style="${printedSurface?'':'min-width:'+Math.round(850*stateUI.mapZoom)+'px'}" role="group" aria-label="Spatial overview of the 36 Comanchería round spaces plus special map spaces">
 <defs><pattern id="map-speckle" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="6" cy="16" r=".9" fill="#dfc9a1" opacity=".10"/><circle cx="25" cy="6" r=".9" fill="#dfc9a1" opacity=".08"/></pattern></defs>
 <rect x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" rx="13" class="map-surface"/>
 <rect x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" fill="url(#map-speckle)"/>
 ${actualBoard?`<image href="${esc(actualBoard)}" x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" preserveAspectRatio="xMidYMid meet"/>`:`${regions}${guide}${labels}`}
 <g class="map-link-layer">${edges.filter(()=>!actualBoard||stateUI.mapConnectMode||routePath.length).map(edge=>mapLinkLine(edge,routePath)).join('')}</g>
 <g class="map-space-layer">${nodes}</g>${printedSurface?printedBoardCounters():''}<g class="director-spatial-layer">${spatialMarkers}</g>
 ${printedSurface?'':`<text class="map-corner-label" x="1054" y="696" text-anchor="end">${edges.length} RECORDED LINKS</text>`}
 </svg></div>
 ${printedSurface?'':`<p class="map-mobile-tip">${actualBoard?'Board anchors are visually aligned to the supplied TTS texture; they do not certify connections. ':'On a narrow screen, swipe horizontally. '}Zoom with +/− and select a space for its counters and actions.</p><div class="map-legend"><span><i class="legend-dot ua"></i>Upper Arkansas</span><span><i class="legend-dot la"></i>Lower Arkansas</span><span><i class="legend-dot rr"></i>Red River</span><span><i class="legend-dot le"></i>Llano Estacado</span><span><i class="legend-dot rg"></i>Rio Grande</span><span><i class="legend-dot bc"></i>Brazos Colorado</span><span><i class="legend-counter"></i>Recorded pieces</span><span><i class="legend-line"></i>Verified map line</span>${moveOptions?'<span><i class="legend-valid"></i>Legal move</span><span><i class="legend-blocked"></i>Blocked move</span>':''}</div>`}`;
}
function selectedBoardCounter(){
 const id=stateUI.digitalSelectedPieceId;
 const data=counterActionStatus(state,id);
 if(!data.piece)return '';
 const {piece,active,ap,medicine,moves,blockedMoves=[]}=data;
 const inPlace=stateUI.selectedSpace===piece.location;
 const safeLabel=esc(labelPiece(piece));
 const cleanupRanch=piece.type==='Band'&&state.phase==='cleanup'&&state.steps.cl1!=='done'&&state.pieces.find(r=>r.type==='Rancheria'&&r.location===piece.location);
 const storedRanch=piece.type==='Band'&&piece.location.startsWith('box:')?state.pieces.find(r=>r.type==='Rancheria'&&r.id===piece.location.slice(4)):null;
 const cleanupCargo=piece.type==='Band'&&state.phase==='cleanup'&&state.steps.cl1!=='done'&&storedRanch?state.pieces.filter(q=>q.location===`held:${piece.id}`&&['Resource','Bison','Mahimiana'].includes(q.type)):[];
 const actionButtons=piece.type==='Band'?`<div class="counter-action-buttons">
  ${cleanupRanch?hButton('tabletop-absorb-band',`Absorb into ${esc(cleanupRanch.label||cleanupRanch.id)}`,'btn primary sm',`data-rancheria-id="${esc(cleanupRanch.id)}" data-id="${esc(piece.id)}"`):''}
  ${cleanupCargo.map(q=>hButton('tabletop-relinquish',`Release ${esc(q.subtype||q.label||q.type)} to ${esc(storedRanch.label||storedRanch.id)}`,'btn sm',`data-id="${esc(q.id)}" data-band-id="${esc(piece.id)}" data-rancheria-id="${esc(storedRanch.id)}"`)).join('')}
  ${active?`<div class="notice compact info">Active Band · ${state.tracks.movement} movement points. Select a destination on the map, or use the verified destinations below.</div>
  ${moves.length?`<div class="legal-destinations">${moves.map(x=>hButton('board-move-selected',`${x.to} · ${x.cost} MP`,'btn primary sm',`data-to="${esc(x.to)}" title="Leaves ${x.remaining} movement points"`)).join('')}</div>`:'<p class="small muted">No legal one-edge moves currently available. Check the recorded lines and remaining movement points.</p>'}${blockedMoves.length?`<details class="blocked-moves"><summary>${blockedMoves.length} connected but unavailable destination(s)</summary>${blockedMoves.map(x=>`<p><b>${esc(x.to)}</b> — ${esc(x.reason)}</p>`).join('')}</details>`:''}
  ${hButton('hunt','Hunt','btn sm',tryBoardCommandForUI({type:'HUNT'}).ok?'':'disabled')}${hButton('horse-mp','Spend Horse','btn sm',tryBoardCommandForUI({type:'SPEND_HORSE'}).ok?'':'disabled')}${hButton('modal-trade','Trade','btn sm')}${hButton('raid','Raid','btn sm',tryBoardCommandForUI({type:'BEGIN_RAID'}).ok?'':'disabled')}${hButton('finish-band','Finish activation','btn primary sm')}`:
  `<div class="form-end">${hButton('board-activate-ap','Activate with AP','btn primary sm',ap.ok?'':`disabled title="${esc(ap.reason)}"`)}${hButton('board-activate-medicine','Activate on track','btn sm',medicine.ok?'':`disabled title="${esc(medicine.reason)}"`)}</div>
  ${medicine.ok?stateUI.medicinePendingBandId===piece.id?`<div class="tt-medicine-confirm"><strong>Verify Medicine-track order on the board</strong><p>The engine checks the occupied Medicine-track slot and requires activation from right to left.</p>${hButton('board-activate-medicine','I verified the printed rule · Activate','btn primary sm')}</div>`:'<p class="small muted">Ranchería activation requires verification of the visible Medicine track.</p>':''}`}
 </div>`:`<div class="tt-physical-status"><span class="tt-counter-symbol">${esc(smallIcon(piece.type))}</span><span><strong>${esc(piece.subtype||piece.type)}</strong><small>${piece.type==='Rancheria'?'Home for its Bands and stored resources. Select its space to inspect occupants.':piece.type==='Resource'?'Resource stock is moved only by validated Trade, Hunt and other rules actions.':piece.type==='Bison'?'Hunting removes this Bison only after a legal Hunt action.':'Moves through its corresponding rules procedure; selecting it never changes its location.'}</small></span></div>`;
 return `<section class="board-counter-selection"><div class="rowline"><strong>${pieceIcon(piece)} ${safeLabel}</strong><span class="small muted">${piece.faceDown?'Hidden ?':esc(piece.type)+(piece.subtype?' · '+esc(piece.subtype):'')}</span></div>
 <p class="small muted">${esc(formatLocation(state,piece.location))} · ${piece.faceDown?'Identity concealed until revealed by its rule':esc(details(piece)||'Recorded counter')}</p>
 ${actionButtons}<div class="form-end">${hButton('board-clear-piece','Deselect','btn sm')}${hButton('board-correct-piece','Administrative correction…','btn ghost sm')}</div>
 ${inPlace?'':'<p class="small muted">Select any map space to inspect it. For an active Band, the map only accepts legal one-edge moves.</p>'}</section>`;
}
function tryBoardCommandForUI(command){try{perform(state,command);return {ok:true};}catch(error){return {ok:false,reason:error.message};}}
function selectedDetail(){
 const sp=SPACE[stateUI.selectedSpace]||SPACES[0];
 const here=state.pieces.filter(p=>p.location===sp.id);
 const links=state.edges.filter(e=>e.a===sp.id||e.b===sp.id);
 const mapCheck=mapReviewAudit(state).rows.find(r=>r.id===sp.id);
 const reviewMark=mapCheck?.reviewed?'Reviewed against physical board':mapCheck?.stale?'Review expired after connection change':'Not yet fully reviewed';
 const active=state.pieces.find(p=>p.id===state.activeBandId);
 const canMove=active&&boardMoveStatus(state,active.id,sp.id).ok;
 const moveBtn=canMove?hButton('board-move-band',`Move active Band here →`,'btn primary sm',`data-to="${esc(sp.id)}"`):'';
 const overlay=bandMovementOverlay(state,state.activeBandId);
 const planned=overlay&&active&&SPACE[active.location]?planBandRoute(state,active.id,sp.id):null;
 const routeSummary=planned?.found&&planned.hops>0?`<div class="notice compact info">Entered-line route: <b>${planned.path.map(esc).join(' → ')}</b> · ${planned.cost} MP needed / ${planned.available} available. ${planned.affordable?'Fits remaining MP, pending other rule and card checks.':'Not affordable in this Band activation.'} ${planned.next&&planned.available>=planned.costPerEdge?hButton('route-next',`Move ONE edge to ${esc(planned.next)}`,'btn primary sm',`data-to="${esc(planned.next)}"`):''}</div>`:'';
 return `<div class="space-detail"><div class="top"><div><strong>${esc(sp.name)}</strong><div class="small muted">${sp.type==='round'?`Territory · Area Value ${sp.area}`:sp.type==='enemy'?'Square Enemy Space':sp.type==='canyon'?'Special canyon space':'Reservation'} · ${links.length} recorded link${links.length===1?'':'s'}</div></div><div class="form-end" style="margin-top:0">${moveBtn}${hButton('modal-add-here','＋ Add piece','btn sm')}</div></div><div class="pieces-in-space">${here.length?here.map(p=>`<button class="piece-chip ${stateUI.digitalSelectedPieceId===p.id?'selected':''}" data-action="board-select-piece" data-id="${esc(p.id)}">${pieceIcon(p)} ${esc(labelPiece(p))}</button>`).join(''):'<span class="small muted">No counters recorded here.</span>'}</div>${selectedBoardCounter()}${routeSummary}<div class="notice compact info"><span>${esc(reviewMark)}</span> · ${links.length} recorded links. ${hButton('map-review-space',mapCheck?.reviewed?'Recheck all connections':'Confirm all connections at this space','btn sm',`data-id="${esc(sp.id)}"`)}</div>${links.length?`<div class="map-neighbors"><span>Verified connections:</span> ${links.map(e=>`<button data-action="select-space" data-id="${esc(e.a===sp.id?e.b:e.a)}" class="btn slim">${esc(e.a===sp.id?e.b:e.a)} ${e.kind==='dashed'?'┄':'—'}</button>`).join('')}</div>`:''}</div>`;
}
function boardPanel(full=false){
 const subtitle='All 36 round spaces, Palo Duro Canyon, five Enemy Squares and the Reservation · original interactive diagram';
 return cardPanel('Game board',boardMap()+selectedDetail(),subtitle,full?hButton('modal-edge','＋ Record verified line','btn sm'):'');
}
function quickActions(){const last=state.log.slice(0,5);return cardPanel('Recent changes',last.length?last.map(x=>`<div class="log-entry"><div class="log-seq">#${x.seq}</div><div><div class="log-desc">${esc(x.description)}</div><div class="log-date">${new Date(x.date).toLocaleString()} · ${x.quality==='verified'?'rule-checked action':'physical-board entry'}</div></div></div>`).join(''):'<div class="empty">The event journal is empty. Record setup counters to begin.</div>','',hButton('go-journal','See journal','btn ghost sm'));}
function quickTracks(){return cardPanel('Adjust record tracks',`<div class="track-grid">${Object.entries({military:'Military',culture:'Culture',ap:'Player AP',enemyAp:'Enemy AP',operations:'Operations position',passage:'Passage of Time'}).map(([key,name])=>`<div class="field"><span>${name}</span><div class="track-input"><button type="button" data-action="adjust-track" data-field="${key}" data-delta="-1">−</button><input id="track-${key}" type="number" min="0" max="${['operations','passage'].includes(key)?20:9}" value="${state.tracks[key]}"><button type="button" data-action="adjust-track" data-field="${key}" data-delta="1">+</button><button type="button" data-action="track-input" data-field="${key}">Set</button></div></div>`).join('')}</div><div class="small muted">Direct changes are logged as manual board entries. Track effects from cards/Planning must be verified using printed rules.</div>`,'Manual reconciliation — never treated as an automatic legal action.');}
function dashboard(){return `${warnings()}${renderStats()}<div class="grid-main"><div class="stack">${procedurePanel()}${officialSetupPanel()}${boardPanel()}</div><div class="stack">${dicePanel()}${quickTracks()}${pointLossPanel()}${cupInventoryPanel()}${quickActions()}${cardPanel('Game snapshot',`<div class="rowline"><span class="muted">Scenario</span><b>${esc(SCENARIOS.find(x=>x[0]===state.scenario)?.[1])}</b></div><div class="rowline"><span class="muted">Colonial powers</span><b>W: ${esc(state.colonial.West)} · S: ${esc(state.colonial.South)} · E: ${esc(state.colonial.East)}</b></div><div class="rowline"><span class="muted">Medicine</span><b>Paraibo: ${state.medicine.paraibo??'—'} · Mahimiana: ${state.medicine.mahimiana??'—'}</b></div><div class="rowline"><span class="muted">Historical period</span><b>${state.period} / 4</b></div><div class="rowline"><span class="muted">Status</span><span class="tag ${state.phase==='setup'?'gold':''}">${state.phase.toUpperCase()}</span></div><div class="rowline"><span class="muted">Recorded counters</span><b>${state.pieces.length}</b></div><div class="rowline"><span class="muted">Recorded connections</span><b>${state.edges.length}</b></div><div class="rowline"><span class="muted">Action journal entries</span><b>${state.log.length}</b></div>`,'Local-only data · not synchronised to other devices.')}</div></div>`;}
function edgesPanel(){const edges=state.edges,coverage=mapCoverage(state);return cardPanel('Recorded map connections',`<p class="intro">Band moves require a recorded printed-board connection; the reference now comes from your uploaded real board photograph. The schematic space index deliberately <strong>does not invent edges.</strong></p><p class="small muted">${coverage.connected} of ${coverage.spaces} indexed spaces have at least one entered link. ${coverage.unlinked.length} remain unlinked in your ledger (not necessarily on the real board).</p><div class="form-end">${hButton('export-map','⇩ Export map lines','btn sm')}</div>${edges.length?`<div class="divider"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>From</th><th>To</th><th>Line</th><th>Evidence</th><th></th></tr></thead><tbody>${edges.map(e=>`<tr><td>${esc(e.a)}</td><td>${esc(e.b)}</td><td>${esc(e.kind)}${e.enemyFor?.length?` · ${esc(e.enemyFor.join(' + '))} enemy`: ''}</td><td>${e.source==='board-photo'?'Uploaded board photograph':e.source==='GMT-playbook'?'GMT tutorial':'Player entry'}</td><td>Verified</td></tr>`).join('')}</tbody></table></div>`:''}`,'Connections originate from your map review or your uploaded actual board. Unclear junctions are not inferred.');}
function routePlannerPanel(){
 const band=state.pieces.find(p=>p.id===state.activeBandId);
 if(state.phase!=='execution'||state.operation!=='Take Actions'||!band||!SPACE[band.location]||state.pending)return '';
 const target=SPACE[stateUI.routeTarget]?stateUI.routeTarget:band.location;
 const route=planBandRoute(state,band.id,target);
 const text=route.found?`<div class="route-summary"><div class="rowline"><span>Route (entered links only)</span><b>${route.hops} edge${route.hops===1?'':'s'} · ${route.cost} MP</b></div><div class="route-steps">${route.path.map((id,i)=>`<span class="route-step">${esc(id)}${i<route.lines.length?` <small>${route.lines[i]==='dashed'?'⇢ dashed':'→ solid'}</small>`:''}</span>`).join('')}</div><p class="small muted">${route.affordable?'Entire entered route currently fits the available movement.':'Entire route exceeds the MP currently recorded.'} A card or space effect may interrupt a move; only perform one edge at a time.</p>${route.next?hButton('route-next','Move ONE confirmed edge → '+esc(route.next),'btn primary sm',`data-to="${esc(route.next)}" ${route.available>=route.costPerEdge?'':'disabled'}`):'<div class="notice info">The active Band is already here.</div>'}</div>`:
 '<div class="notice alert">No path through the <b>entered</b> map connections. This does not mean no legal route exists on the printed board. Transcribe additional lines to explore that route.</div>';
 return cardPanel('Movement route assistant · §5.2.2',`<p class="intro">Active Band: <b>${esc(band.label)}</b> at <b>${esc(band.location)}</b> · ${route.available} MP left · ${route.costPerEdge} MP per edge (${route.costPerEdge===1?'possesses Horse':'no Horse'}). Dashed connections are allowed for Comanche Bands.</p>
 <label class="field"><span>Desired destination</span><select id="route-target" class="control">${options(SPACES.map(p=>[p.id,p.name]),target)}</select></label>${text}`,'Routes use ONLY your player-confirmed lines. They are not an authoritative digitization of the GMT board.');
}
function boardNetworkPanel(){
 const audit=boardNetworkAudit(state);
 const islands=audit.occupiedIsolated;
 const groups=audit.components.slice(0,4);
 const reviewed=mapReviewAudit(state);
 return cardPanel('Map transcription audit',`<p class="intro">How complete is <b>your recorded line network</b>? The user-confirmed map is the authoritative connection graph.</p><div class="rowline"><span>Confirmed spaces in canonical map</span><b>${reviewed.reviewed} / ${reviewed.total}</b></div><div class="rowline"><span>Stale individual map checks</span><b>${reviewed.stale}</b></div><div class="rowline"><span>Spaces with recorded connections</span><b>${audit.connectedSpaces} / ${audit.spaceCount}</b></div><div class="rowline"><span>Recorded network groups</span><b>${audit.components.length} connected group(s)</b></div><div class="rowline"><span>Occupied but unlinked in ledger</span><b>${islands.length}</b></div>${islands.length?`<div class="map-audit-nodes">${islands.slice(0,16).map(id=>hButton('select-space',id,'btn slim',`data-id="${esc(id)}"`)).join('')}</div><p class="small muted">These occupied spaces have no *entered* links. Compare with your printed board before recording a line.</p>`:'<p class="small muted">No occupied space is currently isolated in the entered graph.</p>'}${groups.length?`<p class="small muted">Largest entered connected groups: ${groups.map(x=>`${x.length} spaces`).join(' · ')}</p>`:''}`,'Record every printed link at a space and then confirm that space. Changing any adjacent link invalidates its sign-off. The complete graph has been confirmed by the player; it is not publisher-certified.');
}
function mapEvidencePanel(){
 const change=mapConnectionReconciliation(state.edges);
 const ready=change.missing;
 const conflicts=change.conflicts;
 const missingColors=change.upgradeColor;
 const confirmed=change.matching.length;
 const available=Boolean((ready.length||missingColors.length)&&!conflicts.length);
 const items=MAP_EVIDENCE_EDGES.map(e=>{
  const seen=state.edges.find(x=>x.a===e.a&&x.b===e.b||x.a===e.b&&x.b===e.a);
  return `<tr><td><b>${esc(e.a)} ↔ ${esc(e.b)}</b></td><td>${e.kind==='dashed'?'Dashed':'Solid'}${e.enemyFor?.length?` · <b>${esc(e.enemyFor.join(' + '))} enemy</b>`:''}</td><td>${esc(seen?(mapConnectionMatches(seen,e)?'Recorded':seen.kind===e.kind&&e.enemyFor?.length&&!seen.enemyFor?.length?'Missing Enemy color':'Conflict'):'Not recorded')}</td><td><span class="small muted">${e.reference==='user-board-photo'?'User-supplied board photo':e.page?`Playbook p. ${e.page}`:'Reference image'}</span></td></tr>`;
 }).join('');
 const candidates=MAP_CONNECTION_CANDIDATES.map(e=>`<div class="rowline"><span><b>${esc(e.a)} ↔ ${esc(e.b)}</b><br><small>${esc(e.detail)}</small></span>${hButton('modal-edge','Check & record','btn slim',`data-from="${esc(e.a)}" data-to="${esc(e.b)}"`)}</div>`).join('');
 const body=`<div class="notice compact info">This release includes <b>${MAP_EVIDENCE_EDGES.length} photographed links</b> traced from your actual board. Official opening templates preload these links. The verified canonical graph is installed for new and migrated games. <b>Connections are locked</b>; no per-save edits are needed.</div><div class="rowline"><span>Documented lines present</span><b>${confirmed}/${MAP_EVIDENCE_EDGES.length}</b></div>${conflicts.length?`<div class="notice alert">${conflicts.length} recorded link(s) disagree in style or Enemy color with the reference. No lines are overwritten; resolve these manually.</div>`:''}<div class="form-end">${hButton('map-documentation','Read source & details','btn sm')}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>From–to</th><th>Printed type</th><th>In your ledger</th><th>Source</th></tr></thead><tbody>${items}</tbody></table></div><h3 style="margin-top:20px">Additional adjacency to check</h3><p class="small muted">No additional connections are inferred from proximity. The canonical map is complete; no missing connection candidates remain.</p>${candidates}<div class="small muted" style="margin-top:12px">Source: ${esc(MAP_EVIDENCE_SOURCE)}. The linked official final-map reference is for checking, not included as copied artwork in this site. <a href="${MAP_EVIDENCE_URL}" rel="noopener" target="_blank">Playbook</a> · <a href="${FINAL_MAP_URL}" rel="noopener" target="_blank">GMT mounted map</a>.</div>`;
 return cardPanel('Verified board connections · locked',body,'User-confirmed complete printed board graph; map changes require source review.');
}
function enemyColorPanel(){
 const data=['West','South','East'].map(enemy=>enemyColorNetwork(state,enemy));
 const intro='<p class="intro">The game distinguishes continuous/dashed movement lines from colored Enemy Connections. This report follows <b>only explicitly color-tagged links</b> in your ledger. Missing color data is treated as unknown, never as permission to move or settle.</p>';
 const rows=data.map(v=>`<tr><td><b>${esc(v.enemy)}</b></td><td>${esc(v.origins.join(', '))}</td><td>${v.eligibleLinks}</td><td>${v.reachable.length?esc(v.reachable.join(', ')):'None traced'}</td></tr>`).join('');
 return cardPanel('Colored Enemy Connection audit',`${intro}<div class="table-wrap"><table class="data-table"><thead><tr><th>Enemy</th><th>Map square(s)</th><th>Color-tagged links</th><th>Verified reachable spaces</th></tr></thead><tbody>${rows}</tbody></table></div><div class="notice compact info">${data[0].unclassified} recorded line(s) have no verified Enemy Connection color. The map network is verified; card, stacking and stock rules still constrain Settlement targets. The locked board graph supplies route facts; stacking and card rules remain authoritative.</div>`,'Original graph-derived audit; not an automated Settlement action.');
}
function settleAdviserPanel(){
 const reports=['West','South','East'].map(enemy=>settleTargetAudit(state,enemy));
 const rows=reports.map(r=>{
   const preview=r.candidates.slice(0,4).map(x=>`${esc(x.space)} (${x.distance} steps, area ${x.area})`).join(' · ');
   return `<tr><td><b>${esc(r.enemy)}</b></td><td>${r.knownLinks}</td><td>${r.blocked.length}</td><td>${r.nearestKnown?`${esc(r.nearestKnown.space)} (${r.nearestKnown.distance} steps)`:'No known destination'}</td><td class="small">${preview||'None entered'}</td></tr>`;
 }).join('');
 return cardPanel('Settle destination adviser · verified map',`<p class="intro">Living Rules §6.3.8: count <b>colored Enemy Connection</b> steps to an available, unblocked round space, then compare its printed area value. Recorded Bison do not block placement and must return to stock if settlement occurs.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Enemy</th><th>Colored links</th><th>Known blocked</th><th>Nearest recorded</th><th>Other recorded options</th></tr></thead><tbody>${rows}</tbody></table></div><div class="notice alert"><b>Not a legal-placement verdict.</b> The map graph is complete and routes are fixed. Ordinary East Settle requires its specified origin die; East Subjugate checks both origins. Verify the physical map, supply, stacking, Ravaged counters, History Card, and all printed instruction effects before placing anything.</div>`,'Advisory only · no placement or stock mutation.');
}
function subjugateAdviserPanel(){
 const reports=['West','South','East'].map(enemy=>subjugateTargetAudit(state,enemy));
 const rows=reports.map(r=>{
   const near=r.nearestKnown;
   const label=r.recoverFirst?`Recover first (${r.ravagedIds.length} Ravaged)`:
     near?`${esc(near.space)} · ${esc(near.label)} (${near.distance} links)`:'No traced target';
   const tied=r.tiedKnown.length>1?` · ${r.tiedKnown.length} tied` : '';
   return `<tr><td><b>${esc(r.enemy)}</b></td><td>${r.recordedTribes}</td><td>${r.reachable.length}</td><td>${label}${tied}</td><td>${esc(r.next)}</td></tr>`;
 }).join('');
 return cardPanel('Subjugate adviser · provisional',`<p class="intro">Living Rules §6.3.9: first check for Ravaged counters requiring Recover. Otherwise rank Tribes by <b>colored Enemy Connection</b> steps from the active Enemy square, then by printed area value. Multiple equally eligible Tribes require a random selection.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Enemy</th><th>Tribes recorded</th><th>Traced</th><th>Nearest recorded</th><th>Instruction</th></tr></thead><tbody>${rows}</tbody></table></div><div class="notice alert"><b>Not a removal instruction.</b> The colored network is incomplete. When no Tribe can be selected, check §6.3.9's Settle/War/Culture Attack fallback; returning an Allied Tribe requires handling its Ally Instruction on the physical display. East's starting-square choice, History Card and the board must be verified.</div>`,'Read-only guidance · does not move or remove pieces.');
}
function mapFactPanel(){
 const checks=southMapFacts(state.edges);
 return cardPanel('Published map-distance checks',`<p class="intro">GMT Living Play Book p. 11 confirms that both Rio Grande #4 and Brazos Colorado #6 are two <b>South Enemy Connection</b> steps from the South square. Missing routes remain unknown; a recorded one-step shortcut is rejected.</p>${checks.map(c=>`<div class="rowline"><span><strong>${esc(c.from)} → ${esc(c.to)}</strong> · expected ${c.publishedDistance} steps</span><span class="tag ${c.status==='conflict'?'red':c.status==='consistent'?'green':'gold'}">${c.status==='unknown'?'Unverified':c.status==='consistent'?'Matches':'Conflict'}</span></div>`).join('')}`,'These checks are published examples, not certification that the full South network has been transcribed.');
}
function homePage(){
 const hasGame=Boolean(state.log.length||state.pieces.length||state.cards.length);
 return `<section class="game-home" aria-labelledby="game-home-heading"><div class="game-home-inner"><p class="eyebrow">COMANCHERÍA · LOCAL TABLETOP</p><h1 id="game-home-heading">The Rise and Fall of the Comanche Empire</h1><p>Choose an official scenario, then play on one tabletop. Saved games stay in this browser. Some printed rules still require genuine decisions or physical-card verification.</p><div class="home-choices">${hasGame?hButton('home-continue','Continue current game','btn primary'):''}${hButton('home-new','Set up a new game','btn primary')}</div><p class="small muted">No saved game imports. Exported records are archival, not restorable in this build.</p></div></section>`;
}
function boardActionDrawer(){
 return `<section class="board-command-drawers" aria-label="Game controls">
 <details class="board-drawer" data-drawer="turn" ${stateUI.drawers.turn?'open':''}><summary>▶ Turn, operations and pending decisions</summary>${operationsPage()}</details>
 <details class="board-drawer" data-drawer="dice" ${stateUI.drawers.dice?'open':''}><summary>🎲 Digital dice, decks and counters</summary>${digitalToolsPage()}</details>
 <details class="board-drawer" data-drawer="cards" ${stateUI.drawers.cards?'open':''}><summary>▤ Card reference and effects</summary>${cardsPage()}</details>
 <details class="board-drawer" data-drawer="journal" ${stateUI.drawers.journal?'open':''}><summary>☷ Event journal</summary>${journalPage()}</details>
 <details class="board-drawer" data-drawer="advanced" ${stateUI.drawers.advanced?'open':''}><summary>⚙ Correction tools and settings</summary>${piecesPage()}${settingsPage()}</details>
 </section>`;
}
function digitalToolsPage(){
 const available=state.pieces.filter(p=>p.location===stateUI.selectedSpace);
 const lastDice=state.log.find(x=>x.command==='ROLL_DICE');
 const cards=state.cards.filter(c=>['Hand','Display','War Event','In play'].includes(c.zone)).slice(0,8);
 return `<div class="grid-main"><div class="stack">${dicePanel()}${cardPanel('Quick dice',`<div class="form-end">${hButton('roll-one','Roll one D6','btn primary sm')}${hButton('roll-two','Roll two D6','btn sm')}</div><p class="small">${esc(lastDice?.description||'No digital roll yet.')}</p>`)}${cardPanel('Pieces in selected location',available.length?available.map(p=>`<div class="rowline"><span>${esc(labelPiece(p))} · ${p.faceDown?'Hidden':esc(p.type)}</span>${hButton('board-select-piece','Select','btn sm',`data-id="${esc(p.id)}"`)}</div>`).join(''):'<p>No pieces here.</p>')}</div><div class="stack">${cardPanel('Active cards',cards.length?cards.map(c=>`<div class="rowline"><b>${esc(c.title||c.identifier||c.kind)}</b><span>${esc(c.zone)}</span></div>`).join(''):'<p>No active cards.</p>')}${cupInventoryPanel()}</div></div>`;
}
function nextActionBanner(){
 const p=nextPlayerPrompt(state);
 const kind=p.kind==='automatic'?'automatic':p.kind==='player'?'player':'evidence';
 const buttons=p.kind==='automatic'?hButton('director-auto', '▶ '+(p.command.type==='ADVANCE'?'Continue':'Resolve automatic rules'), 'btn primary sm'):
    (p.choices||[]).map((c,i)=>hButton('director-choice',esc(c.label),'btn primary sm',`data-choice-index="${i}" title="${esc(c.detail||'')}"`)).join('')+ (p.title==='Gain Culture'?hButton('culture-ledger-gain','Confirm + apply Culture','btn primary sm'):'')+ (p.title==='Resolve Operations track'?hButton('operations-digital-roll','Roll digital die','btn primary sm'):'')+(p.kind==='evidence'&&p.title.startsWith('Santa Fé Trail:')?hButton('modal-cleanup-trail','Review Wagon Train placement','btn primary sm'):'');
 const strongDiplomacy=state.phase==='execution'&&state.operation==='Planning'&&state.planningStage===4&&state.cards.some(c=>c.kind==='Culture'&&c.identifier==='C15'&&c.zone==='In play')?
   state.pieces.filter(p=>p.type==='Instruction'&&p.subtype==='Peace'&&!p.flipped&&/^enemy-display:(North|West|South|East):[A-F]$/.test(p.location||'')).flatMap(instruction=>{
     const wars=state.pieces.filter(w=>w.type==='War Column'&&w.owner===instruction.owner&&SPACE[w.location]&&w.strength>0);
     if(wars.length!==1||wars[0].strength<instruction.strength||warColumnStopUnits(state,wars[0].id).length)return [];
     const adjacent=state.edges.filter(e=>(e.a===wars[0].location||e.b===wars[0].location)&&(instruction.owner==='North'||e.kind!=='dashed')).map(e=>e.a===wars[0].location?e.b:e.a).filter(id=>SPACE[id]);
     const actors=Object.entries(state.planningHeadman||{}).filter(([,h])=>h.spent<h.allowance).map(([id])=>id);
     return actors.map(rancheriaId=>`<form id="culture-diplomacy-peace-form" class="form-grid"><strong>Diplomacy III: Peace versus active ${esc(instruction.owner)} War Column</strong><p class="small muted">Choose the true one-space destination after checking §3.1 movement priority. The engine moves the paired War Instruction, rolls attrition, and places Peace in the Inactive display.</p><input type="hidden" name="instructionId" value="${esc(instruction.id)}"><input type="hidden" name="rancheriaId" value="${esc(rancheriaId)}"><label class="field"><span>Destination</span><select name="to">${adjacent.map(to=>option(to,SPACE[to]?.name||to)).join('')}</select></label><label class="field"><span>Printed target and route verification</span><textarea name="routeNote" minlength="20" maxlength="320" required></textarea></label><label class="small"><input type="checkbox" name="ack" required> Verified shortest route and active card exceptions against the printed board</label><button class="btn primary sm" type="submit">Resolve Peace and War Column</button></form>`);
   }).join(''):'';
 const cup=state.cleanupCupResult||state.raidCupResolution;
 const drawn=cup&&(state.raidCupResolution||cup.kind==='instruction')&&cup.stage==='effect'?state.pieces.find(x=>x.id===cup.counterId):null;
 const cupKind=String(drawn?.subtype||'');
 const eligibleCup=drawn&&p.kind!=='automatic'&&['Hunt','Encroach','Ally'].includes(cupKind);
 const guidedHunt=eligibleCup&&cupKind==='Hunt';
 const guidedEncroach=eligibleCup&&(cupKind==='Encroach'||cupKind==='Ally'&&!state.pieces.some(x=>x.type==='Tribe'&&SPACE[x.location]?.type==='round'&&!state.pieces.some(y=>y.location===x.location&&y.type==='Instruction'&&y.subtype==='Ally')));
 const chartFields=`<p class="small muted">Territory chart: ${TERRITORIES.map(([id,name],i)=>`${i+1} ${esc(name)}`).join(' · ')}. The game uses the printed mapping automatically.</p><label class="field"><span>Territory die (Auto for Hunt; select rolled result for Encroach)</span><select name="die">${guidedHunt?'<option value="">Auto / digital</option>':'<option value="" disabled selected>Select the rolled result</option>'}${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label>`;
 const guidedCupForm=(guidedHunt||guidedEncroach)?`<form id="${state.raidCupResolution?'raid':'cleanup'}-cup-guided-${guidedHunt?'hunt':'encroach'}-form" class="form-grid">${chartFields}${guidedHunt?`<p class="small muted">Leave the territory die on Auto to roll digitally from the saved seed.</p>`:''}${guidedEncroach?`<label class="field"><span>Available Tribe</span><select name="tribeId">${state.pieces.filter(x=>x.type==='Tribe'&&x.location==='reserve').map(x=>`<option value="${esc(x.id)}">${esc(x.label||x.id)}</option>`).join('')}</select></label><label class="field"><span>Legal placement</span><select name="space">${Object.values(SPACE).filter(x=>x.type==='round'&&!state.pieces.some(y=>y.location===x.id&&['Rancheria','Settlement','Tribe','Band'].includes(y.type))).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label>`:''}<button class="btn primary sm" type="submit">Resolve ${guidedHunt?'Hunt':'Encroach'} and exchange</button></form>`:'';
 const cupColonial=drawn&&['Settle','Subjugate'].includes(cupKind)&&['West','South','East'].includes(drawn.owner)&&cup.stage==='effect';
 const cupPrefix=state.raidCupResolution?'raid':'cleanup';
 const cupOrigin=drawn?.owner==='East'?`<label class="field"><span>Verified East start square</span><select name="eastOrigin"><option value="">Choose the printed result</option>${['E1','E2'].map(x=>option(x,x)).join('')}</select></label>`:'';
 const cupColonialForm=cupColonial?`<form id="${cupPrefix}-cup-${cupKind.toLowerCase()}-form" class="form-grid"><strong>${esc(drawn.owner)} ${esc(cupKind)} — actual counter resolution</strong><p class="small muted">The complete printed map graph is authoritative. Confirm genuine card exceptions, available counters and any remaining player choices. This form changes the actual ledger and then moves to the mandatory display exchange; it is NOT a notes-only acknowledgement.</p>${cupOrigin}${cupKind==='Subjugate'?`<label class="field"><span>Tribe to return to stock</span><select name="tribeId">${state.pieces.filter(x=>x.type==='Tribe'&&SPACE[x.location]?.type==='round').map(x=>option(x.id,(x.label||x.id)+' · '+x.location)).join('')}</select></label>`:`<label class="field"><span>Available ${esc(drawn.owner)} Settlement counter</span><select name="settlementId">${state.pieces.filter(x=>x.type==='Settlement'&&x.location==='reserve'&&(x.owner===drawn.owner||x.owner===state.colonial?.[drawn.owner])).map(x=>option(x.id,x.label||x.id)).join('')}</select></label><label class="field"><span>Verified destination</span><select name="space">${Object.values(SPACE).filter(x=>x.type==='round'&&!state.pieces.some(y=>y.location===x.id&&['Rancheria','Band','Settlement','Tribe'].includes(y.type))).map(x=>option(x.id,x.name)).join('')}</select></label><label class="small"><input type="checkbox" name="bisonConfirmed"> Returned Bison at the chosen destination to stock</label>`}<label class="field"><span>Card and special-rule verification</span><textarea name="mapVerification" minlength="25" maxlength="400" required></textarea></label><label class="small"><input type="checkbox" name="randomConfirmed"> Confirm a physically rolled tie only when using guided resolution</label><label class="small"><input type="checkbox" name="ack" required> Verified the printed §6.3 procedure and actual counter identities</label><button class="btn primary sm" type="submit">Apply ${esc(cupKind)} and exchange</button></form>`:'';
 const cupWarRaid=drawn&&['War','Raid'].includes(cupKind)&&cup.stage==='effect';
 const cupWarView=cupWarRaid?enemyWarRaidPreview({...state,enemyFlow:{stage:'effect',currentId:drawn.id,enemy:drawn.owner,currentRow:'A',fromCup:true}}):null;
 const cupWarForm=cupWarRaid?`<div class="panel"><strong>Drawn ${esc(cupKind)} — War Column procedure</strong><p class="small muted">${esc(cupWarView.reason)}</p>${cupWarView.ready&&cupWarView.automaticFormation?`<form id="${cupPrefix}-cup-war-raid-form" class="form-grid"><input type="hidden" name="automaticWarFormation" value="true"><button class="btn primary sm" type="submit">Form verified War Column automatically and exchange</button></form>`:cupWarView.ready?`<form id="${cupPrefix}-cup-war-raid-form" class="form-grid">${cupWarView.mode==='advance'?`<label class="field"><span>Verified next map connection</span><select name="to">${cupWarView.legal.map(x=>option(x,x)).join('')}</select></label>`:''}${['form-war','form-raid'].includes(cupWarView.mode)?`<label class="field"><span>Physical War Column counter</span><select name="warCounterId">${(cupWarView.warStock||state.pieces.filter(x=>x.type==='War Column'&&x.owner===drawn.owner&&x.location==='reserve')).map(x=>option(x.id,x.label||x.id)).join('')}</select></label>`:''}${cupWarView.mode==='form-raid'?cupWarView.tribes.map(x=>`<label class="small"><input type="checkbox" name="tiedTribeId" value="${esc(x.id)}"> ${esc(x.label||x.id)} (${esc(x.location)}) tied for nearest</label>`).join(''):''}${['advance','form-raid'].includes(cupWarView.mode)?'<label class="field"><span>Verified route/priority evidence</span><textarea name="routeNote" minlength="25" maxlength="400" required></textarea></label>':''}${cupWarView.mode==='form-war'?'<label class="field"><span>Printed card strength modifier</span><input name="cardModifier" type="number" min="-8" max="8" value="0"></label><label class="field"><span>Card and physical supply evidence</span><textarea name="cardNote" minlength="20" maxlength="400" required></textarea></label>':''}<label class="small"><input type="checkbox" name="ack" required> I checked the printed movement priority, target, stock and modifiers</label><button class="btn primary sm" type="submit">Apply ${esc(cupKind)} and exchange</button></form>`:''}</div>`:'';
 const cupForm=drawn&&p.kind==='evidence'?`<form id="${state.raidCupResolution?'raid-cup-effect-form':'cleanup-cup-effect-form'}" class="form-grid"><label class="field"><span>Printed §6.3 effect and its recorded counter/track changes</span><textarea name="note" minlength="25" maxlength="500" required placeholder="Identify the exact Instruction, target, dice and pieces changed using the printed rules"></textarea></label><label class="small"><input type="checkbox" name="ack" required> I performed and recorded all mandatory consequences of this Instruction before its display exchange.</label><button class="btn primary sm" type="submit">Confirm effect and proceed to exchange</button></form>`:'';
 return `<section class="next-action-banner ${kind}" aria-label="What happens next" aria-live="polite"><div class="next-action-head"><span class="eyebrow">${p.kind==='automatic'?'THE GAME ACTS':p.kind==='player'?'YOUR MOVE':p.kind==='finished'?'GAME OVER':'RULE EVIDENCE REQUIRED'}</span><strong>${esc(p.title)}</strong></div><p>${esc(p.detail)}</p><div class="form-end">${buttons}${p.kind==='player'?hButton('toggle-turn-drawer','Open choices / details','btn sm'):''}</div>${strongDiplomacy}${guidedCupForm}${cupColonialForm}${cupWarForm}${guidedCupForm||cupColonialForm||cupWarForm?'':cupForm}</section>`;
}
function boardCardLandingZones(){
 const labels={'Display':'Development display','Hand':'Your card hand','In play':'Cards in play','War Event':'War events'};
 const active=state.cards.filter(c=>BOARD_CARD_ZONES.includes(c.zone));
 return `<section class="board-card-zones" aria-label="Cards placed on the board"><div class="board-card-zones-heading"><strong>Cards on the board</strong><span class="small muted">Drawn cards land in their recorded positions</span></div><div class="board-card-zones-grid">${BOARD_CARD_ZONES.map(zone=>{
   const cards=active.filter(c=>c.zone===zone);
   return `<section class="board-card-zone" data-card-destination="${esc(zone)}" aria-label="${esc(labels[zone])}"><h3>${esc(labels[zone])} <small>${cards.length}</small></h3><div class="board-card-stack">${cards.length?cards.map(c=>`<div class="board-card-slot" data-reveal-card-id="${esc(c.id)}" title="${esc(c.kind+' '+(c.identifier||'')+' '+(c.title||''))}">${cardImageUrl(artReferenceForCard(c))?`<img class="board-card-thumbnail" src="${esc(cardImageUrl(artReferenceForCard(c)))}" alt="" loading="lazy">`:''}<span class="board-card-code">${esc(c.identifier||'?')}</span><span class="board-card-name">${esc(c.title||c.kind)}</span></div>`).join(''):'<span class="small muted">Empty</span>'}</div></section>`;
  }).join('')}</div></section>`;
}
function boardPage(){
 const here=state.pieces.filter(p=>p.location===stateUI.selectedSpace);
 if(state.phase==='setup')return `<div class="scenario-start-screen">${officialSetupPanel()}</div>`;
 return `${warnings()}${state.enemySelection||state.enemyFlow||state.phase==='execution'&&state.operation==='Planning'&&state.planningStage===8||state.phase==='cleanup'&&Boolean(state.cleanupFinishedPending)||state.phase==='cleanup'&&state.cleanupCupResult?.stage==='paid'?enemyProcedurePanel()+enemyDisplayPanel():''}${nextActionBanner()}<div class="command-bar"><div><div class="command-eyebrow">${esc(state.phase.toUpperCase())} · PERIOD ${state.period} / 4</div><div class="command-name">${esc(state.operation||'Select your next operation')}</div></div><div class="command-tracks"><span>Military <b>${state.tracks.military}</b></span><span>Culture <b>${state.tracks.culture}</b></span><span>AP <b>${state.tracks.ap}</b></span><span>Enemy AP <b>${state.tracks.enemyAp}</b></span></div><div class="command-buttons">${hButton('toggle-turn-drawer','Turn controls','btn primary sm')}${hButton('open-cup',`Cup · ${cupInventory(state).inCup}`,'btn sm')}${hButton('toggle-card-drawer','Cards','btn sm')}</div></div>${boardCardLandingZones()}<div class="play-layout"><section class="play-map"><div class="play-art-bar">${ttsStatusChip()} ${hButton('choose-tts-folder','Import TTS assets','btn sm')} ${hButton('nav-assets','Manage assets','btn sm')}</div>${boardMap()}</section><aside class="play-inspector"><div class="play-inspector-heading"><span>SELECTED SPACE</span><strong>${esc(SPACE[stateUI.selectedSpace]?.name||stateUI.selectedSpace)}</strong></div>${selectedDetail()}<div class="inspector-actions">${hButton('toggle-turn-drawer','Play turn / actions','btn primary sm')}${hButton('modal-add-here','Add counter here','btn sm')}</div>${cardPanel('This space',here.length?here.map(p=>`<div class="mini-counter"><span>${smallIcon(p.type)}</span><button class="piece-chip" data-action="board-select-piece" data-id="${esc(p.id)}">${esc(p.label)}</button><small>${esc(p.type)}</small></div>`).join(''):'<p class="small muted">No recorded counters here.</p>','Counters in the saved game, not automatic image recognition.')}${cardPanel('Current cards',state.cards.filter(c=>['Hand','In play','Display','War Event'].includes(c.zone)).slice(0,5).map(c=>`<div class="mini-counter"><span>▤</span><b>${esc(c.title||c.identifier||c.kind)}</b><small>${esc(c.zone)}</small></div>`).join('')||'<p class="small muted">No current cards recorded.</p>','Open Card library to inspect locally imported faces.')} </aside></div><div class="play-utility"><details><summary>Map tools, verified connections and audits</summary><div class="grid-main"><div class="stack">${mapEvidencePanel()}${enemyColorPanel()}${mapFactPanel()}${boardNetworkPanel()}${edgesPanel()}</div><div class="stack">${routePlannerPanel()}${territoryControlPanel()}${settleAdviserPanel()}${subjugateAdviserPanel()}</div></div></details>${physicalCounterTray()}</div>`;
}
/** Physical tabletop presentation: every tile comes from an authoritative Instruction
 * piece and its literal location. No separate visual counter state is persisted. */
function instructionOnBoard(piece){return piece.type==='Instruction'&&SPACE[piece.location]&&(piece.subtype==='Peace'||piece.subtype==='Ally');}
function instructionTile(piece,small=false){
 const label=piece.label||`${piece.owner} ${piece.subtype}`;
 const cost=piece.strength??'?';
 const art=pieceArt(piece);
 return `<button type="button" class="tt-instruction ${piece.flipped?'tt-reverse':''} ${small?'tt-instruction-map':''} ${stateUI.instructionFocus===piece.id?'tt-instruction-focused':''}" data-physical-id="${esc(piece.id)}" data-action="tabletop-instruction" data-id="${esc(piece.id)}" aria-label="${esc(label)} · ${piece.flipped?'reverse':'front'} · ${cost} Enemy AP · ${formatLocation(state,piece.location)}" title="${esc(label)} · ${piece.subtype||'Instruction'} · ${cost} Enemy AP"><span class="tt-counter-face">${art?`<img src="${esc(art)}" alt="" draggable="false">`:`<span class="tt-counter-proxy"><b>${esc(piece.subtype||'Instruction')}</b><small>${esc(cost)} AP</small></span>`}</span><span class="tt-counter-stamp">${piece.flipped?'↶ REVERSE':'FRONT'} · ${esc(cost)} AP</span></button>`;
}
function physicalInstructionRack(){
 const audit=enemyDisplayAudit(state),flow=state.enemyFlow;
 const focused=state.pieces.find(p=>p.id===stateUI.instructionFocus&&p.type==='Instruction');
 const cell=(piece,col,row)=>`<div class="tt-instruction-slot ${col==='Inactive'?'tt-inactive-slot':''}" data-slot="${esc(col)}:${row}" title="${esc(col)} row ${row}">${piece?instructionTile(piece):'<span class="tt-slot-vacant">·</span>'}</div>`;
 const rows=DISPLAY_ROWS.map((row,i)=>`<div class="tt-rack-row"><span class="tt-rack-die">${i+1}<small>${row}</small></span>${ENEMY_COLUMNS.map(col=>cell(audit.columns[col].rows[i]?.piece,col,row)).join('')}${cell(audit.inactive[i]?.piece,'Inactive',row)}</div>`).join('');
 const board=state.pieces.filter(instructionOnBoard);
 return `<section class="tt-instruction-rack" aria-label="Physical Enemy Instruction display"><div class="tt-rack-heading"><strong>ENEMY INSTRUCTIONS</strong><span>${flow?`Executing ${esc(flow.enemy||'Enemy')} · ${esc(flow.stage||'')}`:'Physical display · d6 selects a row'}</span></div>${audit.problems.length?`<p class="tt-rack-warning" role="alert">${esc(audit.problems[0])}</p>`:''}<div class="tt-rack-head"><span>D6</span>${ENEMY_COLUMNS.map(col=>`<b class="${flow?.enemy===col?'tt-active-column':''}">${esc(col)}</b>`).join('')}<b>Inactive</b></div>${rows}<div class="tt-rack-board-note"><strong>On-map Peace / Ally</strong><span>${board.length} counter${board.length===1?'':'s'} · not in Inactive</span></div>${focused?`<div class="tt-rack-inspector"><b>${esc(focused.label||focused.id)}</b><span>${esc(focused.subtype||'Instruction')} · ${focused.strength??'?'} AP · ${focused.flipped?'Reverse':'Front'} · ${esc(formatLocation(state,focused.location))}</span></div>`:''}</section>`;
}
/** FLIP-style screen-space ghosts make changes legible without ever changing
 * the reducer state. They are visual only and are removed after their flight. */
function physicalPositions(){const found=new Map();document.querySelectorAll('.tt-surface [data-physical-id]').forEach(el=>{const key=el.dataset.physicalId;if(!found.has(key)){const r=el.getBoundingClientRect();found.set(key,{left:r.left,top:r.top,width:r.width,height:r.height,html:el.querySelector('.tt-counter-face')?.innerHTML||'',flipped:el.classList.contains('tt-reverse')});}});return found;}
/** A physical piece's DOM anchor is determined by the SVG board, not a second game model. */
function physicalPiecePositions(){
 const found=new Map();
 document.querySelectorAll('.tt-surface [data-physical-piece-id]').forEach(el=>{
  const id=el.getAttribute('data-physical-piece-id'),r=el.getBoundingClientRect();
  if(!found.has(id)&&r.width&&r.height)found.set(id,{left:r.left,top:r.top,width:r.width,height:r.height,html:el.innerHTML,svg:el instanceof SVGElement});
 });
 return found;
}
/** Actual printed-board marker positions are measured in the rendered SVG. */
function visualMarkerPositions(){
 const positions=new Map();
 document.querySelectorAll('.tt-printed-board [data-visual-marker]').forEach(el=>{
  const id=el.getAttribute('data-visual-marker'),r=el.getBoundingClientRect();
  if(r.width&&r.height&&!positions.has(id))positions.set(id,{left:r.left,top:r.top,width:r.width,height:r.height,html:el.innerHTML});
 });
 return positions;
}
function animateVisualMarkerChanges(before,after,oldPositions){
 if(!document.querySelector('.tt-printed-board')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const next=visualMarkerPositions();
 for(const [id,target] of next){
  const source=oldPositions.get(id);if(!source)continue;
  const previousValue=id==='mp'?before.tracks?.movement:before.tracks?.[id];
  const newValue=id==='mp'?after.tracks?.movement:after.tracks?.[id];
  const changed=Number.isFinite(previousValue)&&Number.isFinite(newValue)&&previousValue!==newValue;
  const moved=Math.hypot(source.left-target.left,source.top-target.top)>3;
  if(!changed&&!moved)continue;
  const real=document.querySelector(`.tt-printed-board [data-visual-marker="${id}"]`);
  real?.classList.add('tt-consequence-arrival');
  if(!moved)continue;
  const ghost=document.createElement('div');ghost.className='tt-marker-flight';ghost.setAttribute('aria-hidden','true');
  Object.assign(ghost.style,{left:source.left+'px',top:source.top+'px',width:source.width+'px',height:source.height+'px'});
  ghost.innerHTML=`<svg viewBox="-14 -14 28 28" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${source.html}</svg>`;
  document.body.appendChild(ghost);
  requestAnimationFrame(()=>{ghost.style.transform=`translate(${target.left-source.left}px,${target.top-source.top}px) scale(${target.width/source.width},${target.height/source.height})`;ghost.style.opacity='0.4';});
  setTimeout(()=>ghost.remove(),1000);
 }
}
/** Animate real reducer deltas at printed positions; never fabricate a counter or effect.
 * Labels are short, temporary board annotations. The original piece is always
 * the interactive target, and each counter retains its imported artwork. */
function boardEffectDeltas(before,after){
 const previous=new Map((before.pieces||[]).map(p=>[p.id,p]));
 return (after.pieces||[]).flatMap(p=>{
  const old=previous.get(p.id);if(!old)return [];
  const moved=old.location!==p.location;
  const turned=Boolean(old.finished)!==Boolean(p.finished)||Boolean(old.flipped)!==Boolean(p.flipped)||Boolean(old.faceDown)!==Boolean(p.faceDown);
  const medicine=old.medicineValue!==p.medicineValue;
  const strength=old.strength!==p.strength;
  if(!moved&&!turned&&!medicine&&!strength)return [];
  let label='COUNTER CHANGED';
  if(moved){
   if(p.location==='reserve')label=p.type==='Resource'?`${String(p.subtype||'RESOURCE').toUpperCase()} → AVAILABLE`:'RETURNED TO STOCK';
   else if(p.location==='removed'||p.location==='success-out')label='OUT OF PLAY';
   else if(p.location.startsWith('held:'))label=`${String(p.subtype||p.type).toUpperCase()} COLLECTED`;
   else if(p.location.startsWith('box:'))label='RETURNED TO RANCHERÍA';
   else if(p.type==='Instruction')label='ENEMY INSTRUCTION MOVED';
   else label=`${p.type.toUpperCase()} MOVED`;
  }else if(p.type==='Band'&&turned)label=p.finished?'BAND FINISHED':'BAND READY';
  else if(p.type==='Instruction'&&turned)label='INSTRUCTION FLIPPED';
  else if(medicine)label=`MEDICINE ${old.medicineValue??'?'} → ${p.medicineValue??'?'}`;
  else if(strength)label=`STRENGTH ${old.strength??'?'} → ${p.strength??'?'}`;
  return [{piece:p,old,label,turned,moved}];
 });
}
function boardEffectNode(piece){
 const key=piece.type==='Instruction'?'data-physical-id':'data-physical-piece-id';
 const candidates=document.querySelectorAll(`.tt-printed-board [${key}]`);
 return [...candidates].find(el=>el.getAttribute(key)===piece.id)||null;
}
function showBoardConsequenceHighlights(before,after){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 for(const delta of boardEffectDeltas(before,after)){
  const el=boardEffectNode(delta.piece);if(!el)continue;
  el.classList.add('tt-consequence-arrival');
  if(delta.turned)el.classList.add('tt-consequence-turn');
 }
}
function animateBoardConsequenceCaptions(before,after){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const printed=document.querySelector('.tt-printed-board');if(!printed)return;
 document.querySelectorAll('.tt-board-effect-caption').forEach(el=>el.remove());
 const deltas=boardEffectDeltas(before,after);
 // Keep a busy Enemy instruction or stock refresh from flooding the board.
 const occupied=[];let placed=0;
 for(const item of deltas){
  if(placed>=6)break;
  const el=boardEffectNode(item.piece);if(!el)continue;
  const rect=el.getBoundingClientRect();if(!rect.width||!rect.height)continue;
  const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  if(occupied.some(q=>Math.hypot(q.x-x,q.y-y)<75))continue;
  occupied.push({x,y});placed++;
  const tag=document.createElement('div');tag.className='tt-board-effect-caption';tag.setAttribute('aria-hidden','true');
  tag.textContent=item.label;
  tag.style.left=`${Math.max(65,Math.min(window.innerWidth-65,x))}px`;
  tag.style.top=`${Math.max(36,Math.min(window.innerHeight-36,y))}px`;
  document.body.append(tag);tag.addEventListener('animationend',()=>tag.remove(),{once:true});
  setTimeout(()=>tag.remove(),2000);
 }
}
function animatePhysicalPieceChanges(previous,now,origins){
 if(!document.querySelector('.tt-surface')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const targets=physicalPiecePositions();const before=new Map(previous.pieces.map(p=>[p.id,p]));
 for(const piece of now.pieces){
  if(piece.type==='Instruction')continue;
  const prior=before.get(piece.id);if(!prior)continue;
  const turned=piece.type==='Band'&&Boolean(prior.finished)!==Boolean(piece.finished);
  const moved=prior.location!==piece.location;
  if(!moved&&!turned)continue;
  if(turned)document.querySelectorAll('.tt-surface [data-physical-piece-id]').forEach(el=>{
   if(el.getAttribute('data-physical-piece-id')===piece.id)el.classList.add('tt-band-turned');
  });
  if(!moved)continue;
  const source=origins.get(piece.id),target=targets.get(piece.id);
  if(target)document.querySelectorAll('.tt-surface [data-physical-piece-id]').forEach(el=>{
   if(el.getAttribute('data-physical-piece-id')===piece.id)el.classList.add('tt-piece-arrived');
  });
  if(!source||!target)continue; // Off-board gains/losses have no invented map position.
  const ghost=document.createElement('div');ghost.className='tt-piece-flight';ghost.setAttribute('aria-hidden','true');
  ghost.style.cssText=`left:${source.left}px;top:${source.top}px;width:${source.width}px;height:${source.height}px;`;
  ghost.innerHTML=source.svg?`<svg viewBox="-14 -16 28 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${source.html}</svg>`:`<div class="tt-flight-token">${source.html}</div>`;document.body.append(ghost);
  requestAnimationFrame(()=>{ghost.style.transform=`translate(${target.left-source.left}px,${target.top-source.top}px) scale(${target.width/source.width},${target.height/source.height})`;ghost.style.opacity='0.7';});
  setTimeout(()=>ghost.remove(),720);
 }
}
function animateInstructionChanges(previous,now,origins){
 if(!previous||!origins||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const ends=physicalPositions();
 const old=new Map(previous.pieces.filter(p=>p.type==='Instruction').map(p=>[p.id,p]));
 for(const piece of now.pieces.filter(p=>p.type==='Instruction')){
  const before=old.get(piece.id);if(!before)continue;
  const source=origins.get(piece.id),target=ends.get(piece.id),moved=before.location!==piece.location,turned=before.flipped!==piece.flipped;
  if(!moved&&!turned)continue;
  const destination=document.querySelectorAll('.tt-surface [data-physical-id]');
  for(const element of destination)if(element.dataset.physicalId===piece.id)element.classList.add('tt-counter-arrived');
  if(!source||!target)continue;
  const ghost=document.createElement('div');ghost.className='tt-counter-flight';ghost.setAttribute('aria-hidden','true');ghost.style.cssText=`left:${source.left}px;top:${source.top}px;width:${source.width}px;height:${source.height}px;`;ghost.innerHTML=source.html;
  document.body.append(ghost);
  requestAnimationFrame(()=>{ghost.style.transform=`translate(${target.left-source.left}px,${target.top-source.top}px) scale(${target.width/source.width},${target.height/source.height}) ${turned?'rotateY(180deg)':''}`;ghost.style.opacity=moved?'0.72':'0.3';});
  setTimeout(()=>ghost.remove(),750);
 }
}
/** Single-viewport interaction shell; engine and director stay authoritative.
 * The detailed procedure tray is a transitional escape hatch for steps whose
 * printed-rule decisions are not yet represented by legal board targets.
 */
function rancheriaPhysicalBox(rancheriaId){
 const model=rancheriaSurfaceModel(state,rancheriaId);if(!model||!model.onMap)return '';
 const {ranch,stored,bands,carried,headmen,missingHeadmanTypes}=model;
 const pickupContents=[...stored.filter(p=>p.type==='Resource'),...model.contents.filter(p=>p.type==='Mahimiana')];
 const track=state.rancheriaActivation;
 const ownTrack=track?.rancheriaId===ranch.id?track:null;
 const arranged=(stateUI.rancheriaBandOrder[ranch.id]||[]).filter(id=>bands.some(b=>b.id===id));
 const available=bands.filter(b=>!arranged.includes(b.id));
 const paraibo=headmen.find(h=>h.type==='Paraibo');
 const stage=state.phase==='execution'&&state.operation==='Take Actions';
 const canPrepare=stage&&!track&&bands.length>0&&Number.isInteger(paraibo?.medicineValue)&&paraibo.medicineValue>0;
 const left=ownTrack?.slots.filter(slot=>bands.some(b=>b.id===slot.bandId))||[];
 const trackUI=ownTrack?`<div class="tt-track-physical"><b>Paraibo track · Medicine ${ownTrack.medicine} (not spent)</b><div class="tt-track-slots">${Array.from({length:ownTrack.medicine},(_,slot)=>{const assigned=ownTrack.slots.find(x=>x.slot===slot),band=assigned&&state.pieces.find(p=>p.id===assigned.bandId);return `<button type="button" class="tt-track-slot ${band?.id===ownTrack.slots[ownTrack.activated]?.bandId?'is-next':''}" ${band?.location===`box:${ranch.id}`?`data-action="tabletop-track-select" data-id="${esc(band.id)}" data-physical-piece-id="${esc(band.id)}"`:'disabled'} aria-label="${band?`Medicine slot ${slot}: ${esc(band.label||band.id)}`:`Empty Medicine slot ${slot}`}">${slot}<strong>${band?.location===`box:${ranch.id}`?esc(band.label||band.id):'·'}</strong></button>`;}).join('')}</div><small>Rightmost occupied counter activates first. ${ownTrack.activated} already activated.</small>${ownTrack.stage==='complete'?'':`<div class="tt-track-controls">${left.length?hButton('tabletop-track-activate',`Activate ${esc(state.pieces.find(p=>p.id===ownTrack.slots[ownTrack.activated]?.bandId)?.label||'next Band')}`,'btn primary sm'):''}${ownTrack.activated?hButton('tabletop-track-finish','Return remaining','btn sm'):''}${ownTrack.activated&&left.length?hButton('tabletop-track-ap',`Collect ${left.at(-1).slot} AP & finish`,'btn sm'):''}</div>`}</div>`:canPrepare?`<div class="tt-track-physical"><b>Medicine track · click Bands to arrange right-to-left</b><div class="tt-ranch-tokens">${available.map(b=>`<button type="button" class="tt-ranch-token" data-action="tabletop-order-band" data-id="${esc(b.id)}"><strong>${esc(b.label||b.id)}</strong><small>Place next</small></button>`).join('')}${arranged.map((id,i)=>`<button type="button" class="tt-ranch-token is-queued" data-action="tabletop-unorder-band" data-id="${esc(id)}"><strong>${esc(state.pieces.find(p=>p.id===id)?.label||id)}</strong><small>${i<paraibo.medicineValue?'Slot '+(paraibo.medicineValue-i-1):'Unassigned'}</small></button>`).join('')}</div>${arranged.length===bands.length?hButton('tabletop-track-start','Place Bands on Medicine track','btn primary sm'):''}</div>`:'';
 const token=p=>`<button type="button" class="tt-ranch-token" data-physical-piece-id="${esc(p.id)}" data-action="board-select-piece" data-id="${esc(p.id)}" title="${esc(p.label||p.subtype||p.type)}" aria-label="Select ${esc(labelPiece(p))}">${pieceArt(p)?`<img src="${esc(pieceArt(p))}" alt="">`:`<span>${esc(smallIcon(p.type))}</span>`}<small>${esc(p.subtype||p.label||p.type)}</small></button>`;
 const activePickup=state.pieces.find(p=>p.type==='Band'&&p.id===state.activeBandId&&p.location===ranch.location);
 const resourceToken=p=>activePickup?`<button type="button" class="tt-ranch-token is-queued" data-physical-piece-id="${esc(p.id)}" data-action="tabletop-take-counter" data-id="${esc(p.id)}" aria-label="${esc(activePickup.label||'Band')} takes ${esc(p.label||p.subtype||p.type)}">${pieceArt(p)?`<img src="${esc(pieceArt(p))}" alt="">`:`<span>${esc(smallIcon(p.type))}</span>`}<small>Take ${esc(p.subtype||p.type)}</small></button>`:token(p);
 const headman=p=>`<div class="tt-medicine-headman"><button type="button" class="tt-headman-counter" data-action="board-select-piece" data-id="${esc(p.id)}">${pieceArt(p)?`<img src="${esc(pieceArt(p))}" alt="">`:esc(smallIcon(p.type))}<span>${esc(p.type)}</span></button><div class="tt-medicine-pips" aria-label="${esc(p.type)} recorded Medicine ${p.medicineValue===null?'unknown':p.medicineValue} out of 6">${Array.from({length:7},(_,i)=>`<span class="${p.medicineValue===i?'is-medicine':''}">${i}</span>`).join('')}</div><div class="tt-success-row" aria-label="${p.success.length} Success counters on Medicine track">${p.success.map(token).join('')}${!p.success.length?'<small>No Success</small>':''}</div></div>`;
 return `<section class="tt-rancheria-box ${stateUI.digitalSelectedPieceId===ranch.id?'tt-rancheria-focused':''}" data-rancheria-id="${esc(ranch.id)}" aria-label="${esc(ranch.label||'Ranchería')} physical resources box"><header><strong>⌂ ${esc(ranch.label||'Ranchería')}</strong><span>ALWAYS ON TABLE</span></header><div class="tt-rancheria-body"><div class="tt-ranch-shelf"><b>Stored goods</b><div class="tt-ranch-tokens">${pickupContents.map(resourceToken).join('')||'<small>Empty</small>'}</div></div><div class="tt-ranch-shelf"><b>Bands in box</b><div class="tt-ranch-tokens">${bands.map(token).join('')||'<small>None stored</small>'}</div></div><div class="tt-ranch-shelf"><b>Carried by local Bands</b>${carried.map(entry=>`<div class="tt-carried-row"><strong>${esc(entry.band.label||entry.band.id)} · ${entry.band.finished?'FINISHED':'Ready'}</strong><div class="tt-ranch-tokens">${entry.counters.map(q=>state.phase==='cleanup'&&state.steps.cl1!=='done'&&entry.band.location===`box:${ranch.id}`?`<button type="button" class="tt-ranch-token tt-release-cargo" data-action="tabletop-relinquish" data-id="${esc(q.id)}" data-band-id="${esc(entry.band.id)}" data-rancheria-id="${esc(ranch.id)}" data-physical-piece-id="${esc(q.id)}" aria-label="Relinquish ${esc(labelPiece(q))} to Ranchería resources">${pieceArt(q)?`<img src="${esc(pieceArt(q))}" alt="">`:`<span>${esc(smallIcon(q.type))}</span>`}<small>Release ${esc(q.subtype||q.type)}</small></button>`:token(q)).join('')}</div></div>`).join('')||'<small>None carried</small>'}</div><div class="tt-ranch-shelf"><b>Medicine & Success</b>${headmen.map(headman).join('')}${trackUI}${missingHeadmanTypes.length?`<small class="tt-missing-headman">Unverified: ${esc(missingHeadmanTypes.join(', '))} affiliation</small>`:''}</div></div><footer>Actual counter ledger · Medicine is not automatically spent on activation</footer></section>`;
}
/** The bottom of the table is a physical counter area, not a stock form.
 * Reserve is reusable supply. success-out / removed are explicitly separate
 * out-of-play destinations; no counter is cloned to fill a display slot.
 */
function tabletopSupplyTrays(){
 const {available,outOfPlay:out}=tabletopSupplyModel(state);
 const supplyGroups=(items)=>{
  const groups=new Map();
  for(const piece of items){const label=piece.subtype||piece.type;const group=groups.get(label)||[];group.push(piece);groups.set(label,group);}
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([label,group])=>`<div class="tt-supply-group"><span class="tt-supply-group-name">${esc(label)} <b>×${group.length}</b></span><div class="tt-supply-counters">${group.map(piece=>`<button type="button" class="tt-supply-counter ${piece.location==='removed'?'is-removed':''}" data-action="board-select-piece" data-id="${esc(piece.id)}" data-physical-piece-id="${esc(piece.id)}" aria-label="Inspect ${esc(labelPiece(piece))} in ${piece.location==='reserve'?'available supply':piece.location==='success-out'?'Success Out of Play':'removed from play'}" title="${esc(piece.label||label)} · ${esc(piece.id)} · ${esc(piece.location)}">${pieceArt(piece)?`<img src="${esc(pieceArt(piece))}" alt="">`:`<span>${esc(smallIcon(piece.type))}</span>`}</button>`).join('')}</div></div>`).join('');
 };
 const tray=(id,label,items,description)=>`<section class="tt-supply-tray" aria-label="${label}" data-supply-zone="${id}"><header><strong>${label}</strong><small>${items.length} counters · ${description}</small></header><div class="tt-supply-items">${supplyGroups(items)||'<span class="tt-supply-empty">Empty</span>'}</div></section>`;
 return `<div class="tt-supply-board" aria-label="Permanent resource supplies">${tray('available','AVAILABLE RESOURCES',available,'reusable stock')}${tray('out','OUT OF PLAY',out,'Success out / permanently removed') }</div>`;
}
/** All counters below are rendered OVER THE OWNER'S EXISTING board graphic.
 * No freestanding Ranchería/Enemy/Resource UI is used on the play screen. */
function printedCounter(piece,x,y,size=23,action='board-select-piece',attributes=''){
 const art=pieceArt(piece),name=esc(labelPiece(piece)),selected=stateUI.digitalSelectedPieceId===piece.id;
 const fill=piece.type==='Band'&&piece.finished?'#80715e':'#d4bc84';
 const discardPicked=stateUI.horseDiscardSelection.includes(piece.id)||Object.values(stateUI.epidemicSelection).includes(piece.id);
 return `<g transform="translate(${x} ${y})" class="printed-counter ${selected||discardPicked?'piece-is-selected':''}" data-physical-piece-id="${esc(piece.id)}" data-action="${action}" data-id="${esc(piece.id)}" ${attributes} role="button" tabindex="0" aria-label="${name}" title="${name}"><title>${name} · ${esc(piece.location)}</title><rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" rx="2" fill="${fill}" stroke="${selected?'#ffe79c':'#614b2e'}" stroke-width="${selected?2:1}"/>${art?`<image href="${esc(art)}" x="${-size/2+1}" y="${-size/2+1}" width="${size-2}" height="${size-2}" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`:`<text text-anchor="middle" y="4" font-size="${Math.max(10,Math.floor(size*.55))}" pointer-events="none">${esc(smallIcon(piece.type))}</text>`}${piece.type==='Band'&&piece.finished&&!physicalCounterArtUrl(piece)?'<path d="M -10,-10 L 10,10" stroke="#633" stroke-width="2" pointer-events="none"/>':''}</g>`;
}
function printedRancherias(){
 const ranches=state.pieces.filter(p=>p.type==='Rancheria'&&(SPACE[p.location]||p.location===`box:${p.id}`)).sort((a,b)=>String(a.subtype||a.label).localeCompare(String(b.subtype||b.label)));
 const cfg=PRINTED_BOARD.rancheria,track=state.rancheriaActivation;
 return ranches.map((ranch,i)=>{
  const row=rancheriaPrintedIndex(ranch,i),m=rancheriaSurfaceModel(state,ranch.id);if(!m)return '';
  const baseY=cfg.firstY+row*cfg.rowGap;
  // Transparent pointer region covers the ORIGINAL Resources square.
  const resourcesHit=`<rect data-action="printed-rancheria-resources" data-id="${esc(ranch.id)}" data-printed-rancheria-resources="${esc(ranch.id)}" x="${cfg.resourcesX-7}" y="${baseY-12}" width="${cfg.resourcesWidth+15}" height="66" fill="transparent" class="printed-resource-hit"/>`;
  // The printed Paraibo track itself is the drop target, never an overlay menu.
  const paraMed=m.headmen.find(h=>h.type==='Paraibo')?.medicineValue??0;
  const medicineHits=Array.from({length:Math.max(0,paraMed)},(_,slot)=>`<circle class="printed-medicine-slot" data-printed-medicine-slot="${esc(ranch.id)}:${slot}" cx="${cfg.medicineX+slot*cfg.medicineGap}" cy="${baseY+cfg.paraY}" r="12" fill="transparent"/>`).join('');
  const head=m.headmen.map(h=>{
   const rating=Number.isInteger(h.medicineValue)?h.medicineValue:0;
   const [x,y]=rancheriaMedicinePoint(row,h.type,rating);
   // The Medicine rating counter is stationary. The Mahimiana person may
   // separately travel under a Band, so do NOT duplicate its physical ID here.
   const medicineFace=h.type==='Mahimiana'?163+(4-row):153+2*(4-row);
   const medicineArt=physicalCounterImageUrlByIndex(medicineFace);
   // Medicine markers use the published face, not a second copy of the Headman counter.
   const markerId=h.type==='Mahimiana'?state.pieces.find(q=>q.subtype==='Mahimiana Medicine'&&q.affiliatedRancheriaId===ranch.id)?.id:null;
   const medicine=`<g ${markerId?`data-physical-piece-id="${esc(markerId)}"`:``} data-visual-marker="medicine:${esc(h.id)}" class="printed-medicine ${stateUI.digitalSelectedPieceId===h.id?'piece-is-selected':''}" data-action="board-select-piece" data-id="${esc(h.id)}" data-medicine-marker-for="${esc(h.id)}" transform="translate(${x} ${y})" role="button" tabindex="0" aria-label="${esc(h.type)} Medicine ${rating} — select headman"><title>${esc(h.label||h.type)} · Medicine ${rating}</title><rect x="-10" y="-10" width="20" height="20" rx="2" fill="${h.type==='Mahimiana'?'#a35f61':'#456389'}" stroke="#e9d3a7"/>${medicineArt?`<image href="${esc(medicineArt)}" x="-9.5" y="-9.5" width="19" height="19" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`:`<text y="3" font-size="7" fill="#fff8db" font-weight="700" text-anchor="middle" pointer-events="none">${h.type==='Mahimiana'?'MAH':'PAR'}</text>`}</g>`;
   const successes=h.success.map((p,j)=>printedCounter(p,cfg.successX+(j%2)*13,baseY+(h.type==='Mahimiana'?0:28)+Math.floor(j/2)*9,13));
   return m.onMap?medicine+successes.join(''):'';
  }).join('');
  const stored=m.contents.filter(p=>p.type==='Resource'||p.type==='Bison'||p.type==='Mahimiana'||(!m.onMap&&(p.type==='Paraibo'||p.subtype==='Mahimiana Medicine')));
  const bands=m.bands,order=(stateUI.rancheriaBandOrder[ranch.id]||[]).filter(id=>bands.some(b=>b.id===id));
  const eligible=state.phase==='execution'&&state.operation==='Take Actions'&&!track&&bands.length>0&&m.headmen.some(h=>h.type==='Paraibo'&&h.medicineValue>0);
  const own=track?.rancheriaId===ranch.id?track:null;
  const placed=own?own.slots.filter(s=>bands.some(b=>b.id===s.bandId)):[];
  // All non-track pieces use the same printed Resources square. Never allocate
  // independent grids for Bands and Horses: they would draw over one another.
  const paraiboRating=m.headmen.find(h=>h.type==='Paraibo')?.medicineValue??0;
  const boxedBands=bands.filter(b=>!placed.some(slot=>slot.bandId===b.id)&&!(order.indexOf(b.id)>=0&&order.indexOf(b.id)<paraiboRating));
  const boxedCargo=m.carried.filter(entry=>entry.band.location===`box:${ranch.id}`).flatMap(entry=>entry.counters.map(p=>({piece:p,carrier:entry.band})));
  const boxed=[...(!m.onMap?[{piece:ranch}]:[]),...boxedBands.map(piece=>({piece})),...stored.map(piece=>({piece})),...boxedCargo];
  // The board's Resources square is just 69 × 54 board units.
  // Use a full visible grid, not a 3×2 grid with subsequent pieces drawn on
  // top of the first six. Grid size adapts to the real number of counters.
  const boxColumns=boxed.length>12?5:4;
  const boxRows=Math.max(1,Math.ceil(boxed.length/boxColumns));
  const boxStepX=Math.min(14,64/boxColumns);
  const boxStepY=Math.min(13,45/Math.max(1,boxRows));
  const boxPieceSize=boxed.length>16?9:boxed.length>10?11:13;
  const positions=new Map(boxed.map((entry,j)=>{
   const col=j%boxColumns,row=Math.floor(j/boxColumns);
   return [entry.piece.id,[cfg.resourcesX+9+col*boxStepX,
    baseY-2+row*boxStepY]];
  }));
  const renderedBands=bands.map(band=>{
   const onTrack=placed.find(s=>s.bandId===band.id),queued=order.indexOf(band.id),pos=positions.get(band.id);
   const queuedOnTrack=queued>=0&&queued<paraiboRating;
   const x=onTrack?cfg.medicineX+onTrack.slot*cfg.medicineGap:queuedOnTrack?cfg.medicineX+Math.max(0,paraiboRating-queued-1)*cfg.medicineGap:pos?.[0]??cfg.resourcesX+12;
   const y=onTrack?baseY+27:queuedOnTrack?baseY+27:pos?.[1]??baseY+12;
   const action=onTrack?'tabletop-track-select':eligible?(queued>=0?'tabletop-unorder-band':'tabletop-order-band'):'board-select-piece';
   return printedCounter(band,x,y,onTrack||queuedOnTrack?17:boxPieceSize,action);
  }).join('');
  const active=state.pieces.some(b=>b.type==='Band'&&b.id===state.activeBandId&&b.location===ranch.location);
  const homePiece=!m.onMap&&positions.get(ranch.id)?printedCounter(ranch,...positions.get(ranch.id),boxPieceSize):'';
  const goods=stored.map(p=>{
   const [x,y]=positions.get(p.id);return printedCounter(p,x,y,boxPieceSize,active?'tabletop-take-counter':'board-select-piece');
  }).join('');
  const carried=boxedCargo.map(({piece:p,carrier})=>{
   const [x,y]=positions.get(p.id),release=state.phase==='cleanup'&&state.steps.cl1!=='done';
   return printedCounter(p,x,y,boxPieceSize,release?'tabletop-relinquish':'board-select-piece',release?`data-band-id="${esc(carrier.id)}" data-rancheria-id="${esc(ranch.id)}"`:'');
  }).join('');
  const prepared='';
  const ap='';
  const end='';
  return `<g class="printed-rancheria" data-rancheria-zone="${esc(ranch.id)}" aria-label="${esc(ranch.label||ranch.id)} printed Ranchería row">${resourcesHit}${medicineHits}${head}${homePiece}${renderedBands}${goods}${carried}${prepared}${ap}${end}</g>`;
 }).join('');
}
function printedInstructions(){
 const audit=enemyDisplayAudit(state);
 let html='';
 for(const col of PRINTED_BOARD.instructions.cols){
  for(const row of DISPLAY_ROWS){
   const cell=col==='Inactive'?audit.inactive.find(x=>x.row===row):audit.columns[col]?.rows.find(x=>x.row===row);
   const piece=cell?.piece;if(!piece)continue;
   const point=instructionPrintedPoint(col,row);if(!point)continue;
   // Original artwork directly on the correct printed cell, without an HTML mini-button.
   html+=printedCounter(piece,point[0],point[1],26,'tabletop-instruction');
  }
 }
 return `<g class="printed-instruction-layer" aria-label="Physical Enemy Instruction display">${html}</g>`;
}
function printedSupply(){
 const openingTribe=p=>p.type==='Tribe'&&p.location==='reserve'&&/^setup-tribe-stock-/.test(p.id);
 const available=state.pieces.filter(p=>p.location==='reserve'&&(p.type==='Resource'||p.type==='Bison'||(p.type==='Tribe'&&!openingTribe(p))));
 const out=state.pieces.filter(p=>p.location==='out-of-play'||p.location==='success-out'||(p.location==='reserve'&&['War Column','Band','Settlement','Marker'].includes(p.type))||openingTribe(p)||(p.location==='removed'&&['Resource','Marker','Tribe','Bison'].includes(p.type)));
 const pile=(items,region)=>{
  const size=items.length>18?9:items.length>9?11:16;
  const columns=Math.max(1,Math.floor((region.w-5)/(size+1)));
  const rows=Math.max(1,Math.floor((region.h-5)/(size+1)));
  return items.map((piece,i)=>{
   const j=i%(columns*rows),depth=Math.floor(i/(columns*rows));
   return printedCounter(piece,region.x+3+size/2+(j%columns)*(size+1)+Math.min(depth,3),region.y+3+size/2+Math.floor(j/columns)*(size+1)+Math.min(depth,3),size);
  }).join('');
 };
 const empty=(region,label)=>`<g transform="translate(${region.x+region.w/2} ${region.y+region.h/2})" aria-label="${esc(label)}"><rect x="-${region.w/2-3}" y="-12" width="${region.w-6}" height="24" rx="3" fill="#f6e9c9" fill-opacity=".88" stroke="#886f49" stroke-width=".8"/><text text-anchor="middle" y="-2" font-size="7" font-weight="bold" fill="#453420">${label==='Out of Play'?'None recorded':'No registered spare stock'}</text><text text-anchor="middle" y="9" font-size="6" fill="#453420">${label==='Out of Play'?'':'Quantity unverified'}</text></g>`;
 const enemyAP=state.pieces.filter(p=>p.location==='available-enemy-aps');
 return `<g class="printed-supply-layer" aria-label="Original printed supply and Out of Play boxes"><rect data-printed-supply="out" x="${PRINTED_BOARD.supply.out.x}" y="${PRINTED_BOARD.supply.out.y}" width="${PRINTED_BOARD.supply.out.w}" height="${PRINTED_BOARD.supply.out.h}" class="printed-supply-hit" fill="transparent"/>${pile(available,PRINTED_BOARD.supply.available)}${pile(out,PRINTED_BOARD.supply.out)}${pile(enemyAP,PRINTED_BOARD.supply.enemyAP)}</g>`;
}
function printedTracks(){
 const tokens=['military','culture','ap'].map(key=>{
  const [x,y]=recordPrintedPoint(key,state.tracks[key]||0);
  const face={ap:15,culture:16,military:17}[key],art=physicalCounterImageUrlByIndex(face);
  return `<g transform="translate(${x} ${y})" class="printed-track-marker" data-visual-marker="${key}" ${key==='ap'?'data-action="printed-record-ap"':key==='culture'?'data-action="printed-record-culture"':key==='military'?'data-action="printed-record-military"':''} role="button" tabindex="0" aria-label="${key} ${state.tracks[key]}"><circle r="10" fill="${key==='military'?'#ad413c':key==='culture'?'#364b9d':'#335d99'}" stroke="#e6d6a9" stroke-width="1.5"/>${art?`<image href="${esc(art)}" x="-9.5" y="-9.5" width="19" height="19" pointer-events="none"/>`:`<text y="3" text-anchor="middle" font-size="6.5" fill="#fff">${key==='military'?'MIL':key==='culture'?'CUL':'AP'}</text>`}</g>`;
 }).join('');
 const op=state.tracks.operations??0;
 const opsArt=physicalCounterImageUrlByIndex(19);
 const ops=`<g transform="translate(${PRINTED_BOARD.operations.x} ${PRINTED_BOARD.operations.yByValue[Math.min(6,Math.max(0,op))]})" class="printed-track-marker" data-visual-marker="operations" data-action="printed-operations" role="button" tabindex="0" aria-label="Operations marker ${op}. Continue automatic step when available"><rect x="-10" y="-9" width="20" height="18" fill="#eac95f" stroke="#483a23"/>${opsArt?`<image href="${esc(opsArt)}" x="-9" y="-9" width="18" height="18" pointer-events="none"/>`:'<text y="3" text-anchor="middle" font-size="8" fill="#241e15">OPS</text>'}</g>`;
 const band=state.pieces.find(p=>p.id===state.activeBandId&&p.type==='Band');
 const loc=band&&SPACE[band.location]?boardImagePosition(band.location):null;
 const mpArt=physicalCounterImageUrlByIndex(18);
 const mp=loc?`<g transform="translate(${loc[0]+39} ${loc[1]+18})" class="printed-mp-marker" data-visual-marker="mp" role="img" aria-label="${esc(band.label)} ${state.tracks.movement} Movement Points"><circle r="12" fill="#20472c" stroke="#f1dc8a" stroke-width="2"/>${mpArt?`<image href="${esc(mpArt)}" x="-11" y="-11" width="22" height="22" pointer-events="none"/>`:''}<text y="4" text-anchor="middle" font-size="10" font-weight="bold" stroke="#10221a" stroke-width="2" paint-order="stroke" fill="#ffe7a0">${state.tracks.movement}</text><title>${esc(band.label)} · ${state.tracks.movement} MP remaining</title></g>`:'';
 const operationsPieces=state.pieces.filter(p=>p.location==='operations'&&(p.type==='Resource'||p.type==='Bison'));
 const stackY=PRINTED_BOARD.operations.yByValue[Math.min(6,Math.max(0,op))];
 const operationsCounters=operationsPieces.map((p,i)=>printedCounter(p,PRINTED_BOARD.operations.x+22+(i%3)*13,stackY-12+Math.floor(i/3)*12,12)).join('');
 return `<g class="printed-board-tracks">${tokens}${ops}${operationsCounters}${mp}</g>`;
}

function printedCards(){
 // Only use card rectangles already PRINTED on the TTS image.
 // Multiple cards in a zone are genuine physical piles, not cloned counters.
 const slots=PRINTED_BOARD.cards.development;
 const dev=state.cards.filter(c=>['Development','Culture'].includes(c.kind)&&['In play','Hand','Display'].includes(c.zone));
 const war=state.cards.filter(c=>c.kind==='War'&&c.zone==='War Event');
 const history=state.cards.filter(c=>c.kind==='History'&&['In play','Display','History','Current','Active'].includes(c.zone));
 const renderCard=(c,slot,offset=0)=>{
  const art=cardImageUrl(artReferenceForCard(c)),x=slot.x+Math.min(9,offset*3),y=slot.y+Math.min(9,offset*3);
  const w=slot.w-4,h=slot.h-4;
  const label=esc((c.title||c.identifier||c.kind)+' · '+c.zone);
  return `<g class="printed-card" data-action="printed-card-inspect" data-id="${esc(c.id)}" data-reveal-card-id="${esc(c.id)}" role="button" tabindex="0" aria-label="Inspect ${label}"><title>${label}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="#c1ad83" stroke="#4d3920" stroke-width="1"/>${art?`<image href="${esc(art)}" x="${x+1}" y="${y+1}" width="${w-2}" height="${h-2}" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`:`<text x="${x+w/2}" y="${y+h/2}" font-size="7" text-anchor="middle" fill="#2e2319" pointer-events="none">${esc(c.identifier||c.kind)}</text>`}</g>`;
 };
 const h=PRINTED_BOARD.history;
 const historyHit=`<rect data-action="printed-history" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" fill="transparent" role="button" tabindex="0" aria-label="Inspect printed History Card and its mandatory check"/>`;
 return `<g class="printed-card-layer" aria-label="Cards on original printed card spaces">${historyHit}${dev.map((c,i)=>renderCard(c,slots[i%slots.length],Math.floor(i/slots.length))).join('')}${war.map((c,i)=>renderCard(c,PRINTED_BOARD.cards.warEvent,i)).join('')}${history.map((c,i)=>renderCard(c,PRINTED_BOARD.history,i)).join('')}</g>`;
}
function printedHeldOnMap(){
 const carriers=state.pieces.filter(p=>p.type==='Band'&&SPACE[p.location]);
 return carriers.flatMap(band=>{
  const goods=state.pieces.filter(p=>p.location===`held:${band.id}`);
  const pos=boardImagePosition(band.location);
  if(!pos)return [];
  // Actual possessions travel with the Band counter, not in an invented tray.
  return goods.map((p,i)=>printedCounter(p,pos[0]+20+(i%3)*11,pos[1]+17+Math.floor(i/3)*11,12));
 }).join('');
}
function printedBoardCounters(){return `<g class="printed-real-board-counters">${printedRancherias()}${printedInstructions()}${printedSupply()}${printedTracks()}${printedHeldOnMap()}${printedCards()}</g>`;}
// A staged human confirmation, kept entirely in the existing board HUD.
// There are no synthetic History effects or silent passage across printed rules.
function boardHistoryVerification(prompt){
 if(!state.victoryPending)return null;
 const audit=historyObjectiveAudit(state);
 const key=`${state.scenario}:${state.period}:${state.passageResult?.die??'mandatory'}:${state.passageResult?.markerBefore??0}:${state.victoryPending?.history}`;
 if(stateUI.historyVerification?.key!==key)stateUI.historyVerification={key,met:null,stage:0};
 const v=stateUI.historyVerification;
 const final={plains:1,rise:2,lords:3,downfall:4,campaign:4}[state.scenario]||4;
 const steps=[
  `Remove the H${state.period} History Card and the old Development deck as the printed rules require.`,
  `Reveal the H${state.period+1} History Card and place it in the printed History Card position.`,
  `Read and apply all printed H${state.period+1} transition effects, including any required card or counter changes.`
 ];
 // A verified negative or final-period outcome needs no next-card transition.
 if(v.met===null){
  const certain=audit.result!=='unknown'&&!audit.uncertainTerritories?.length;
  const grading=audit.history==='H4';
  return {headline:`${audit.history} · HISTORY CHECK`,detail:`${audit.reason} ${certain?'The digital ledger gives a definite result; check it against your printed card and board.':'The recorded state is not sufficient to determine this automatically. Check the printed card and physical counters.'}`,
   buttons:`<button class="board-turn-command primary" data-action="board-history-verdict" data-verdict="${grading?'met':certain?(audit.result==='met'?'met':'not-met'):'met'}">${grading?'Calculate final scenario victory grade':certain?(audit.result==='met'?'Confirm objective achieved':'Confirm objective not achieved'):'I checked: objective achieved'}</button>${certain||grading?'':`<button class="board-turn-command" data-action="board-history-verdict" data-verdict="not-met">I checked: objective not achieved</button>`}`};
 }
 if(v.met===false||state.period===final){
  return {headline:`${audit.history} · ${v.met?'FINAL RESULT':'OBJECTIVE NOT MET'}`,detail:'The printed objective has been checked. Apply the recorded result to the board.',buttons:`<button class="board-turn-command primary" data-action="board-history-commit">Resolve History Check</button><button class="board-turn-next" data-action="board-history-back">Review</button>`};
 }
 return {headline:`H${state.period} → H${state.period+1} · TRANSITION ${v.stage+1}/3`,detail:steps[v.stage],
  buttons:`<button class="board-turn-command primary" data-action="board-history-step">${['Old card and deck removed','Next History Card revealed','Printed effects applied'][v.stage]}</button><button class="board-turn-next" data-action="board-history-back">Back</button>`};
}
function currentPlayerPhaseProgress(){
 return playerPhaseProgress(state.phase,state.operation,checklist(state),state.steps);
}
function playerPhaseStatus(){
 if(!['war','execution','cleanup'].includes(state.phase))return '';
 const p=currentPlayerPhaseProgress();
 if(!p.total)return '';
 return `<div class="board-phase-progress" role="status" aria-label="Current procedure progress"><div class="board-phase-progress-title"><b>${esc(p.name)}</b><span>${p.completed}/${p.total} steps complete</span></div><div class="board-phase-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.completed}"><span style="width:${Math.round(p.completed/p.total*100)}%"></span></div>${p.next?`<small>Step ${esc(p.next.id.replace(/^[a-z]+/,''))}: ${esc(p.next.label)}</small>`:'<small>All checkpoints recorded. Continue when the rules engine permits.</small>'}</div>`;
}
function boardTurnGuidance(prompt){
 const history=boardHistoryVerification(prompt);if(history)return {...history,tag:'HISTORY CHECK'};
 if(state.phase==='execution'&&state.operation==='Passage of Time'){const progress=currentPlayerPhaseProgress();if(progress.next)return {headline:prompt.title,detail:prompt.detail||progress.next.label,tag:`PASSAGE ${progress.completed+1} / ${progress.total}`};}
 if(state.phase==='cleanup'){const progress=currentPlayerPhaseProgress();if(progress.next)return {headline:prompt.title,detail:prompt.detail||progress.next.label,tag:`CLEANUP ${progress.completed+1} / ${progress.total}`};}
 const active=state.pieces.find(p=>p.id===state.activeBandId&&p.type==='Band');
 if(active&&state.phase==='execution'&&state.operation==='Take Actions'&&!state.pending&&!state.successCheck&&!state.battlePending&&!state.developmentPending&&!state.enemyFlow&&!state.countermeasureWindow){
  const horse=state.pieces.some(p=>p.location===`held:${active.id}`&&p.subtype==='Horse');
  const legal=boardMoveOptions(state,active.id).legal;
  const cargo=state.pieces.filter(p=>p.location===`held:${active.id}`);
  return {headline:`${active.label||'Band'} · ${state.tracks.movement} MP`,detail:`${horse?'Mounted · 1 MP per connection':'Unmounted · 2 MP per connection'} · ${cargo.length} carried · ${legal.length} legal moves. Click a highlighted map space to move.`,tag:'BAND IN ACTION'};
 }
 const selected=state.pieces.find(p=>p.id===stateUI.digitalSelectedPieceId);
 if(state.pending||state.successCheck||state.battlePending||state.developmentPending||state.enemyFlow||state.countermeasureWindow)return {headline:prompt.title,detail:prompt.detail||'Resolve the current choice before commanding the Band.',tag:'ACTION REQUIRED'};
 const track=state.rancheriaActivation;
 if(track&&state.phase==='execution'&&state.operation==='Take Actions'&&!state.pending&&!state.successCheck)return {headline:'Ranchería Medicine',detail:'Click the next Band on the printed Paraibo Medicine track. Use the Take AP or Return counters on that Ranchería when ready.',tag:'ACTIVATE BANDS'};
 if(state.phase==='setup')return {headline:prompt.title,detail:prompt.detail||'Choose a scenario and complete its opening setup using the decisions below. The original board remains visible.',tag:'GAME SETUP'};
 if(state.phase==='execution'&&state.operation==='Take Actions')return {headline:prompt.title,detail:'Select the Bands inside a Ranchería Resource box in the order you want, then click Place Bands on that printed Ranchería.',tag:'TAKE ACTIONS'};
 return {headline:prompt.title,detail:prompt.detail||'Choose your next action on the board.',tag:prompt.kind==='automatic'?'GAME RESOLUTION':prompt.kind==='player'?'YOUR DECISION':prompt.kind==='finished'?'CAMPAIGN COMPLETE':'ACTION REQUIRED'};
}
function boardCommandButtons(commands,source,originalIndexes=null){
 const perPage=6,totalPages=Math.max(1,Math.ceil(commands.length/perPage));
 stateUI.choicePage=Math.min(stateUI.choicePage,totalPages-1);
 const page=stateUI.choicePage;
 const items=commands.slice(page*perPage,(page+1)*perPage);
 return items.map((choice,i)=>`<button type="button" class="board-turn-command" data-action="${source}" data-choice-index="${originalIndexes?originalIndexes[page*perPage+i]:page*perPage+i}" title="${esc(choice.detail||'')}" aria-label="${esc(choice.label)}">${esc(choice.label)}</button>`).join('')+
 (totalPages>1?`<button type="button" class="board-turn-next" data-action="board-next-choices" aria-label="Next action choices">${page+1} / ${totalPages} ›</button>`:'');
}
function horseDiscardBoardCommands(pending){
 const ids=(pending.horseIds||[]).filter(id=>state.pieces.some(p=>p.id===id&&p.type==='Resource'&&p.subtype==='Horse'));
 const key=`${pending.number}:${pending.kind}:${ids.join(',')}:${pending.required}`;
 if(stateUI.horseDiscardKey!==key){stateUI.horseDiscardSelection=[];stateUI.horseDiscardKey=key;}
 const selected=stateUI.horseDiscardSelection.filter(id=>ids.includes(id));
 stateUI.horseDiscardSelection=selected;
 const required=pending.required;
 const choiceButtons=ids.map(id=>{
  const piece=state.pieces.find(p=>p.id===id),picked=selected.includes(id),art=physicalCounterArtUrl(piece);
  return `<button type="button" class="board-horse-choice ${picked?'selected':''}" data-action="board-horse-discard-toggle" data-id="${esc(id)}" aria-pressed="${picked}" title="${esc(piece.label||'Horse')} at ${esc(formatLocation(state,piece.location))}">${art?`<img src="${esc(art)}" alt="">`:'♞'}<span>${esc(piece.label||'Horse')}</span><b>${picked?'✓':'+'}</b></button>`;
 }).join('');
 return `<div class="board-turn-actions board-horse-discard"><div class="board-horse-progress">Select ${required} Horses · ${selected.length} selected</div><div class="board-horse-counter-list">${choiceButtons}</div><button type="button" class="board-turn-command primary" data-action="board-horse-discard-confirm" ${selected.length===required?'':'disabled'}>Return selected Horses</button></div>`;
}
function boardTurnCommands(prompt){
 const history=boardHistoryVerification(prompt);if(history)return `<div class="board-turn-actions">${history.buttons}</div>`;
 if(state.developmentPending?.kind==='horse-discard')return horseDiscardBoardCommands(state.developmentPending);
 const band=state.pieces.find(p=>p.id===state.activeBandId&&p.type==='Band');
 if(band&&state.phase==='execution'&&state.operation==='Take Actions'&&!state.pending&&!state.successCheck&&!state.battlePending&&!state.developmentPending&&!state.enemyFlow&&!state.countermeasureWindow){
  const available=activeBandChoices(state);
  const onsite=available.filter(x=>x.kind!=='move');
  const move=available.filter(x=>x.kind==='move');
  const selection=stateUI.digitalSelectedPieceId;
  return `<div class="board-turn-actions">${boardCommandButtons(onsite,'board-band-choice')}${move.length?`<span class="board-direct-hint">${move.length} legal destination${move.length===1?'':'s'} · click a highlighted map space to move</span>`:''}${!onsite.length&&!move.length?'<span class="board-direct-hint">No legal Band action is currently available. Inspect the pending rule below rather than manually changing a counter.</span><button type="button" class="board-turn-command" data-action="player-panel-guided">Inspect blocked actions</button>':''}${selection&&selection!==band.id?'<button type="button" class="board-turn-next" data-action="board-clear-piece">Clear selection</button>':''}</div>`;
 }
 if(prompt.kind==='automatic'&&prompt.command)return `<div class="board-turn-actions"><button type="button" class="board-turn-command primary" data-action="director-auto">${esc(prompt.command.type==='ADVANCE'?'Continue turn':'Resolve next step')}</button></div>`;
 if(state.phase==='execution'&&state.operation==='Take Actions'&&!state.activeBandId&&!state.pending&&!state.successCheck&&!state.battlePending&&!state.developmentPending&&!state.enemyFlow){
  const track=state.rancheriaActivation;
  if(track){
   const next=track.slots[track.activated];
   return `<div class="board-turn-actions">${next?`<button type="button" class="board-turn-command primary" data-action="tabletop-track-activate">Activate next Band</button>`:''}${track.activated?`<button type="button" class="board-turn-command" data-action="tabletop-track-ap">Collect AP &amp; finish track</button><button type="button" class="board-turn-command" data-action="tabletop-track-finish">Return unused Bands</button>`:''}<span class="board-direct-hint">Or click the rightmost Band on the printed Medicine track.</span></div>`;
  }
  const prepared=state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]).filter(r=>{
    const bands=state.pieces.filter(b=>b.type==='Band'&&b.location===`box:${r.id}`);
    const ordered=(stateUI.rancheriaBandOrder[r.id]||[]).filter(id=>bands.some(b=>b.id===id));
    return bands.length>0&&bands.length===ordered.length&&state.pieces.some(h=>h.type==='Paraibo'&&h.location===`box:${r.id}`&&h.medicineValue>0);
  });
  if(prepared.length)return `<div class="board-turn-actions">${prepared.map(r=>`<button type="button" class="board-turn-command primary" data-action="tabletop-track-start" data-rancheria-id="${esc(r.id)}">Place ${esc(r.label||'Ranchería')} Bands</button>`).join('')}<span class="board-direct-hint">Then activate the rightmost Band directly on its printed Medicine track.</span></div>`;
 }
 const selected=state.pieces.find(p=>p.type==='Band'&&p.id===stateUI.digitalSelectedPieceId);
 if(selected){
  const status=counterActionStatus(state,selected.id);
  const direct=[status?.ap?.ok?'<button class="board-turn-command" data-action="board-activate-ap">Activate Band with AP</button>':'',status?.medicine?.ok?'<button class="board-turn-command" data-action="board-activate-medicine">Activate on Medicine</button>':''].filter(Boolean);
  if(direct.length)return `<div class="board-turn-actions">${direct.join('')}</div>`;
 }
 const rawChoices=prompt.kind==='player'?(prompt.choices||[]):[];
 const candidateIndexes=stateUI.spatialChoice?rawChoices.map((x,i)=>(x.command?.to||x.command?.space)===stateUI.spatialChoice?i:-1).filter(i=>i>=0):[];
 const choiceIndexes=candidateIndexes.length?candidateIndexes:null;
 const choices=choiceIndexes?choiceIndexes.map(i=>rawChoices[i]):rawChoices;
 const mapTargets=directorSpatialTargets(prompt);
 const mapGuidance=mapTargets.size?`<span class="board-direct-hint">${mapTargets.size} glowing board target${mapTargets.size===1?'':'s'} · click the printed location to choose</span>`:'';
 const extra=prompt.title==='Gain Culture'?'<button type="button" class="board-turn-command" data-action="culture-ledger-gain">Apply Culture</button>':prompt.title==='Resolve Operations track'?'<button type="button" class="board-turn-command" data-action="operations-digital-roll">Roll Operations</button>':'';
 return `<div class="board-turn-actions">${boardCommandButtons(choices,'director-choice',choiceIndexes)}${choiceIndexes?'<button class="board-turn-next" data-action="board-clear-map-choice">All choices</button>':''}${mapGuidance}${extra}${!choices.length&&!extra?'<button type="button" class="board-turn-command" data-action="player-panel-guided">Open guided resolution</button>':''}</div>`;
}
/** Human-first encounter presentation. This is read-only: all actions still go
 * through nextPlayerPrompt/perform, never through a UI-only combat state. */
function currentEncounter(){
 const pending=state.battlePending||state.battleContinuation;
 const obligations=state.phase==='war'?warBattleObligations(state).filter(x=>!x.exempt):[];
 if(pending||obligations.length){
  const b=pending||obligations[0];
  const war=state.pieces.find(x=>x.id===b.warId);
  const where=war?.location||b.location;
  const names=(b.defenders||[]).map(id=>state.pieces.find(x=>x.id===id)?.label||id);
  const engaged=pending?.unitId?state.pieces.find(x=>x.id===pending.unitId):null;
  return {kind:'battle',title:'Battle at '+(SPACE[where]?.name||where||'the board'),
    detail:`${war?.label||'War Column'}${war?.strength!=null?' · strength '+war.strength:''}`,
    extra:engaged?'Defending: '+(engaged.label||engaged.id):names.length?'Eligible defenders: '+names.join(', '):'Choose a defender or inspect the Battle rules',
    count:obligations.length};
 }
 const cup=state.raidCupResolution||state.cleanupCupResult;
 const fromCup=cup?.stage==='effect'&&cup.counterId?state.pieces.find(x=>x.id===cup.counterId):null;
 const instruction=state.enemyFlow?.currentId?state.pieces.find(x=>x.id===state.enemyFlow.currentId):fromCup;
 if(state.enemyFlow||state.enemySelection||fromCup){
  const owner=instruction?.owner||state.enemyFlow?.enemy||state.enemySelection?.enemy||'Enemy';
  return {kind:'enemy',title:owner+' Enemy Instruction',
    detail:instruction?`${instruction.subtype||'Instruction'} · ${instruction.label||instruction.id}`:'Determine the active Instruction',
    extra:instruction?.location&&SPACE[instruction.location]?'At '+(SPACE[instruction.location]?.name||instruction.location):'Use the displayed Instruction and its recorded counters'};
 }
 return null;
}
function encounterStrip(){
 const e=currentEncounter();if(!e)return '';
 const last=(state.log||[]).find(x=>/^(BATTLE_|WAR_|ENEMY_|RAID_CUP|CLEANUP_CUP)/.test(x.command||''));
 return `<div class="board-encounter" role="status"><span class="board-encounter-kind">${e.kind==='battle'?'BATTLE IN PROGRESS':'ENEMY INSTRUCTION'}</span><strong>${esc(e.title)}</strong><span>${esc(e.detail)}</span><span>${esc(e.extra)}</span>${last?`<small>Last event: ${esc(last.description||last.command)}</small>`:''}<button type="button" class="board-encounter-open" data-action="player-panel-guided">${e.kind==='battle'?'Battle controls':'Enemy controls'}</button></div>`;
}
function passagePlayerGuide(){
 const p=currentPlayerPhaseProgress();
 const current=p.next;
 const key=current?.id;
 const specialized=key==='pt5'||key==='pt6'||key==='pt7'?passageHeadmanPanel():
   key==='pt9'?passageResourcePanel():key==='pt11'?passagePeacePanel():
   key==='pt12'?passageBisonPanel():key==='pt14'?passageCulturePanel():
   key==='pt15'?passageEndPanel():'';
 const prompt=nextPlayerPrompt(state);
 const choices=prompt.kind==='player'?(prompt.choices||[]):[];
 return `<div class="player-phase-help"><strong>Passage of Time · ${p.completed}/${p.total} checkpoints</strong><p>${esc(current?.label||'All checkpoints recorded')}</p><p class="small muted">${esc(prompt.detail||'Resolve the printed procedure before continuing.')}</p></div>${specialized|| (choices.length?`<div class="player-panel-choices">${choices.map((c,i)=>`<button type="button" class="board-turn-command" data-action="director-choice" data-choice-index="${i}">${esc(c.label)}</button>`).join('')}</div>`:'<div class="notice info">This step requires a printed-rule confirmation. The engine will not mark it completed automatically.</div>')}${procedurePanel({currentOnly:true})}`;
}
function cleanupPlayerGuide(){
 const p=currentPlayerPhaseProgress(),prompt=nextPlayerPrompt(state);
 const choices=prompt.kind==='player'?(prompt.choices||[]):[];
 return `<div class="player-phase-help"><strong>Cleanup · ${p.completed}/${p.total} checkpoints</strong><p>${esc(p.next?.label||'Cleanup checkpoints complete')}</p><p>${esc(prompt.detail||'Follow the printed Cleanup procedure.')}</p></div>${prompt.kind==='automatic'&&prompt.command?'<button type="button" class="board-turn-command primary" data-action="director-auto">Apply verified Cleanup rule</button>':choices.length?`<div class="player-panel-choices">${choices.map((c,i)=>`<button type="button" class="board-turn-command" data-action="director-choice" data-choice-index="${i}">${esc(c.label)}</button>`).join('')}</div>`:''}${procedurePanel({currentOnly:true})}${state.cleanupCupResult||state.enemyFlow?cupInventoryPanel():''}`;
}
function guidedProcedureForPlayer(){
 if(state.phase==='setup')return officialSetupPanel();
 if(state.phase==='execution'&&state.operation==='Passage of Time')return passagePlayerGuide();
 if(state.phase==='cleanup')return cleanupPlayerGuide();
 const e=currentEncounter();
 if(e?.kind==='battle')return `<p class="small muted">Battle controls for the current War Column. Do not apply an outcome until the printed card effects and counter choices are resolved.</p>${battlePanel()}${rancheriaSacrificePanel()}`;
 if(e?.kind==='enemy')return `<p class="small muted">Current Enemy Instruction and cup controls. The printed counter and the recorded game state decide the next effect.</p>${enemyProcedurePanel()}${enemyDisplayPanel()}${cupInventoryPanel()}${procedurePanel()}`;
 return operationsPage();
}
function playerBoardPanel(){
 const mode=stateUI.playerPanel;
 if(!mode)return '';
 const prompt=nextPlayerPrompt(state);
 const guidance=boardTurnGuidance(prompt);
 const setup=state.phase==='setup';
 // Reuse the same legally filtered commands as the printed-board targets.
 // This prevents the overlay from proposing a different action set.
 const selectedPiece=stateUI.contextPieceId?state.pieces.find(piece=>piece.id===stateUI.contextPieceId):null;
 const pieceChoices=selectedPiece?printedCounterChoices(state,selectedPiece.id,prompt):[];
 const pieceContext=Boolean(mode==='piece'&&selectedPiece&&pieceChoices.length);
 const rancheria=stateUI.contextRancheriaId?state.pieces.find(piece=>piece.id===stateUI.contextRancheriaId&&piece.type==='Rancheria'):null;
 const rancheriaChoices=rancheria?rancheriaBoardActions(rancheria.id):[];
 const rancheriaContext=mode==='rancheria'&&rancheriaChoices.length>0;
 const card=stateUI.contextCardId?state.cards.find(c=>c.id===stateUI.contextCardId):null;
 const cardChoices=card?printedCardActions(card.id):[];
 const cardContext=mode==='card'&&cardChoices.length>0;
 const targetChoices=mode==='target'?(stateUI.targetMoveChoices||[]):[];
 const targetContext=mode==='target'&&targetChoices.length>0;
 const actions=cardContext?`<div class="board-turn-actions">${cardChoices.map((choice,i)=>`<button type="button" class="board-turn-command" data-action="board-card-choice" data-choice-index="${i}">${esc(choice.label)}</button>`).join('')}</div>`:targetContext?`<div class="board-turn-actions">${targetChoices.map((choice,i)=>`<button type="button" class="board-turn-command" data-action="board-target-choice" data-choice-index="${i}">${esc(choice.label)}</button>`).join('')}</div>`:rancheriaContext?`<div class="board-turn-actions">${rancheriaChoices.map((choice,i)=>`<button type="button" class="board-turn-command" data-action="board-rancheria-choice" data-choice-index="${i}">${esc(choice.label)}</button>`).join('')}</div>`:pieceContext?`<div class="board-turn-actions">${pieceChoices.map((choice,i)=>`<button type="button" class="board-turn-command" data-action="board-context-choice" data-choice-index="${i}">${esc(choice.label)}</button>`).join('')}</div>`:setup?officialSetupPanel():boardTurnCommands(prompt);
 const overview=`<div class="player-panel-meta"><small>${esc(guidance.tag||'YOUR TURN')} · PERIOD ${state.period}</small><b>${esc(guidance.headline||prompt.title)}</b><p>${esc(guidance.detail||prompt.detail||'Select a counter or location on the printed board.')}</p></div>`;
 const body=cardContext?`<div class="player-panel-meta"><small>PRINTED CARD</small><b>${esc(card.title||card.identifier||card.kind)}</b><p>Select a currently legal effect for this exact card.</p></div><div class="player-panel-choices board-legal-decisions">${actions}</div>`:targetContext?`<div class="player-panel-meta"><small>PRINTED DESTINATION</small><b>Choose exact placement</b><p>${targetChoices.length} different rules-legal actions lead here.</p></div><div class="player-panel-choices board-legal-decisions">${actions}</div>`:rancheriaContext?`<div class="player-panel-meta"><small>PRINTED RANCHERÍA</small><b>${esc(rancheria.label||rancheria.id)}</b><p>Only actions currently legal for this Ranchería are shown.</p></div><div class="player-panel-choices board-legal-decisions">${actions}</div>`:mode==='guided'?`<div class="player-phase-help"><strong>${setup?'Scenario setup':'Current rule resolution'}</strong><p>Resolve only the current printed rule or card effect, then return to the board.</p></div>${guidedProcedureForPlayer()}`:
  pieceContext?`<div class="player-panel-meta"><small>PRINTED COUNTER</small><b>${esc(selectedPiece.label||selectedPiece.type)}</b><p>${pieceChoices.length} currently legal actions for this counter. Choose one; no action is assumed.</p></div><div class="player-panel-choices board-legal-decisions">${actions}</div>`:
  `${overview}<div class="player-panel-choices board-legal-decisions">${actions}</div>`;

 return `<div class="player-panel-shade"><section class="player-panel" role="dialog" aria-modal="true" aria-label="Board decision"><div class="player-panel-head"><strong>${cardContext?'Card decision':targetContext?'Choose destination action':rancheriaContext?'Ranchería decisions':pieceContext?'Choose counter action':mode==='guided'?'Resolve current decision':'Choose an action'}</strong><button type="button" data-action="player-panel-close" aria-label="Return to board">✕</button></div><div class="player-panel-body">${body}<div class="player-panel-footer">${mode==='guided'||pieceContext||rancheriaContext||targetContext||cardContext?'<button type="button" class="board-turn-command" data-action="player-panel-decisions">All decisions</button>':'<button type="button" class="board-turn-command" data-action="player-panel-guided">Guided resolution</button>'}${setup?'':`<button type="button" class="board-turn-command" data-action="home-new">New game</button>`}<button type="button" class="board-turn-command" data-action="undo" ${history.past.length?'':'disabled'}>Undo</button><button type="button" class="board-turn-command" data-action="redo" ${history.future.length?'':'disabled'}>Redo</button></div></div></section></div>`;
}

function playerTurnStages(){
 const stages=[['war','War'],['selection','Choose operation'],['execution','Your operation'],['cleanup','Cleanup']];
 if(state.phase==='setup')return '<div class="player-turn-stages"><strong>Scenario setup</strong><span>Complete the opening decisions to begin</span></div>';
 if(state.phase==='gameover')return '<div class="player-turn-stages"><strong>Game finished</strong><span>Review victory or defeat</span></div>';
 return `<div class="player-turn-stages" aria-label="Current turn stage">${stages.map(([key,label])=>`<span class="${state.phase===key?'current':''}" ${state.phase===key?'aria-current="step"':''}>${esc(label)}</span>`).join('')}</div>`;
}
/** A permanent, deliberately plain log in the left margin of the board. */
function tabletopActionLog(){
 const events=chronologicalTableEvents(state.log);
 return `<aside class="table-action-log" aria-label="Game action log" role="log" aria-live="off" aria-relevant="additions text"><div class="table-action-log-items">${events.length?events.map(event=>`<p class="table-action-log-entry" data-log-seq="${esc(event.seq)}">${esc(briefTableEvent(event.description))}</p>`).join(''):'<p class="table-action-log-empty">Actions will appear here.</p>'}</div></aside>`;
}
function restoreTableActionLog(previous){
 const log=document.querySelector('.table-action-log');if(!log)return;
 const items=log.querySelectorAll('[data-log-seq]'),latest=items[items.length-1];
 if(!latest)return;
 const lastSeq=latest.getAttribute('data-log-seq');
 if(previous&&previous.lastSeq===lastSeq){log.scrollTop=previous.top;return;}
 // Center the newest action vertically instead of pinning it to the bottom.
 log.scrollTop=Math.max(0,latest.offsetTop-log.offsetTop-(log.clientHeight-latest.offsetHeight)/2);
}
function tabletopPage(){
 // Gameplay never mounts a toolbar, rail, menu or side panel outside the board.
 // All decisions are transient board overlays; the chronological action log
 // remains the sole separate surface.
 const importBoard=!boardImageUrl()?`<div class="printed-board-import"><h2>Load your Comanchería board image</h2><p>The printed board is the playing surface.</p><button data-action="choose-tts-folder">Select your TTS Images folder</button><small>Artwork remains in this browser.</small></div>`:'';
 const prompt=nextPlayerPrompt(state);
 const decisionAvailable=true; // Every phase must remain reachable, even with zero prompt choices.
 return `<section class="tt-surface tt-printed-only" aria-label="Comanchería printed board gameplay">
  ${tabletopActionLog()}
  <div class="tt-printed-board" aria-label="Game board. Select a counter or empty board to see legal actions">${boardImageUrl()?boardMap(true):''}${importBoard}</div>
  ${!stateUI.playerPanel&&decisionAvailable?`<button type="button" class="printed-decision-cue" data-action="player-panel-decisions" aria-label="Show current board decision">${esc(state.phase==='setup'?'Set up scenario':boardTurnGuidance(prompt).headline||prompt.title||'Choose action')}</button>`:''}
  ${gameplayCeremonyOverlay()}
  ${playerBoardPanel()}
  <div id="modal-root"></div>
  <div id="card-reveal-root">${cardRevealOverlay()}</div>
 </section>`;
}

/** Only present activation counters which the director can actually use now. */
function activationChoiceTray(prompt=nextPlayerPrompt(state)){
 if(prompt.kind!=='player'||state.phase!=='execution'||state.operation!=='Take Actions')return '';
 const entries=state.pieces.map(piece=>({piece,options:activationCounterDropOptions(state,piece.id,prompt)})).filter(x=>x.options.length);
 if(!entries.length)return '';
 const types=new Set(entries.flatMap(x=>x.options.map(o=>o.target)));
 const labels={'activate:medicine':'Activate Medicine Band','activate:ap':'Activate Band (AP)','activate:prepare':'Prepare Medicine Track'};
 const boxed=entries.filter(x=>x.piece.type==='Band'&&x.piece.location.startsWith('box:'));
 const pickup=boxed.length?`<div class="board-placement-pieces">${boxed.map(({piece})=>`<button type="button" class="board-placement-piece" data-action="board-select-piece" data-id="${esc(piece.id)}" data-physical-piece-id="${esc(piece.id)}" aria-label="Drag ${esc(labelPiece(piece))} to activate">${pieceArt(piece)?`<img src="${esc(pieceArt(piece))}" draggable="false" alt="">`:`<span>${esc(smallIcon(piece.type))}</span>`}<small>${esc(piece.label||piece.id)}</small></button>`).join('')}</div>`:'';
 return `<div class="board-counter-action-tray" aria-label="Physical Band activation"><span>Drag the eligible counter to activate or prepare. The game checks AP and Medicine order.</span>${pickup}<div class="board-possession-targets">${[...types].map(target=>`<div class="board-possession-drop" data-activation-drop="${esc(target)}" role="group" aria-label="${esc(labels[target])}">${esc(labels[target])}</div>`).join('')}</div></div>`;
}
/** Pick a printed Tribe to receive an Ally counter. The counter remains on
 * its actual map space until the director command resolves the procedure. */
function allianceChoiceTray(prompt=nextPlayerPrompt(state)){
 if(prompt.kind!=='player')return '';
 const eligible=state.pieces.filter(p=>allianceTribeDropOptions(state,p.id,prompt).length);
 if(!eligible.length)return '';
 return `<div class="board-counter-action-tray" aria-label="Choose Allied Tribe"><span>Drag an eligible Tribe counter to Ally with Tribe, or choose its normal decision.</span><div class="board-possession-targets"><div class="board-possession-drop" data-alliance-drop="alliance:tribe" role="group" aria-label="Ally with Tribe">Ally with Tribe</div></div></div>`;
}
/** Drag a printed counter onto the Battle or card-effect target instead of
 * opening a technical chooser. The same choice remains keyboard-accessible
 * in the normal decision rail. No extra controls cover or move the map. */
function directorCounterActionTray(prompt=nextPlayerPrompt(state)){
 if(prompt.kind!=='player')return '';
 const types=new Map(),eligible=[];
 for(const piece of state.pieces){
  const options=directorCounterActionDropOptions(state,piece.id,prompt);
  if(!options.length)continue;
  eligible.push(piece);
  for(const option of options)if(!types.has(option.target))types.set(option.target,option.label);
 }
 if(!types.size)return '';
 const labels={'battle:defend':'Fight with Band','card:remove-bison':'Remove Bison'};
 // Bands on Medicine tracks are not physically on the map. Give these
 // counters a pick-up surface beside the target instead of faking a map piece.
 const boxed=eligible.filter(p=>!SPACE[p.location]);
 const pickup=boxed.length?`<div class="board-placement-pieces">${boxed.map(p=>`<button type="button" class="board-placement-piece" data-action="board-select-piece" data-id="${esc(p.id)}" data-physical-piece-id="${esc(p.id)}" aria-label="Drag ${esc(labelPiece(p))} to Battle">${pieceArt(p)?`<img src="${esc(pieceArt(p))}" draggable="false" alt="">`:`<span>${esc(smallIcon(p.type))}</span>`}<small>${esc(p.label||p.type)}</small></button>`).join('')}</div>`:'';
 return `<div class="board-counter-action-tray" aria-label="Physical Battle and card choices"><span>Drag an eligible counter to the action below, or use the choice buttons above.</span>${pickup}<div class="board-possession-targets">${[...types].map(([target,label])=>`<div class="board-possession-drop" data-counter-action-drop="${esc(target)}" role="group" aria-label="${esc(label)}">${esc(labels[target]||label)}</div>`).join('')}</div></div>`;
}
/** Counter tray is shown only for actual, currently legal placement decisions. */
function playerPlacementTray(prompt=nextPlayerPrompt(state)){
 if(prompt.kind!=='player')return '';
 const stock=state.pieces.filter(p=>(p.type==='Rancheria'&&p.location===`box:${p.id}`)||(p.type==='Settlement'&&p.location==='reserve'));
 const available=stock.map(piece=>({piece,options:directorPieceDropOptions(state,piece.id,prompt)})).filter(x=>x.options.length);
 if(!available.length)return '';
 return `<div class="board-placement-tray" aria-label="Counters ready to place"><strong>Place a counter</strong><span>Drag an available piece onto a highlighted legal space, or use the decision buttons.</span><div class="board-placement-pieces">${available.map(({piece,options})=>`<button type="button" class="board-placement-piece" data-action="board-select-piece" data-id="${esc(piece.id)}" data-physical-piece-id="${esc(piece.id)}" title="${esc(options.map(x=>x.label).join(' / '))}" aria-label="Drag ${esc(labelPiece(piece))} to a legal location">${pieceArt(piece)?`<img src="${esc(pieceArt(piece))}" draggable="false" alt="">`:`<span>${esc(smallIcon(piece.type))}</span>`}<small>${esc(piece.label||piece.type)}</small></button>`).join('')}</div></div>`;
}
/** Board-side supply of only Resources that can be transferred right now.
 * The reducer validates both the source and destination again on release. */
function resourceTransferTray(){
 if(!(state.phase==='cleanup'||(state.phase==='execution'&&state.operation==='Passage of Time')))return '';
 const available=state.pieces.filter(p=>['Resource','Bison','Mahimiana'].includes(p.type))
  .map(piece=>({piece,options:resourceDropOptions(state,piece.id)})).filter(entry=>entry.options.length);
 if(!available.length)return '';
 return `<div class="board-placement-tray" aria-label="Resources ready to transfer"><strong>Move Resources</strong><span>Drag a counter onto its receiving Ranchería. The rules and stock ledger validate the transfer.</span><div class="board-placement-pieces">${available.map(({piece,options})=>`<button type="button" class="board-placement-piece" data-action="board-select-piece" data-id="${esc(piece.id)}" data-physical-piece-id="${esc(piece.id)}" title="${esc(options.map(x=>x.label).join(' / '))}" aria-label="Drag ${esc(labelPiece(piece))} to a legal Ranchería">${pieceArt(piece)?`<img src="${esc(pieceArt(piece))}" draggable="false" alt="">`:`<span>${esc(smallIcon(piece.type))}</span>`}<small>${esc(piece.label||piece.type)}</small></button>`).join('')}</div></div>`;
}
/** Physical exchanges stay in the action rail and do not change the map layout. */
function possessionActionTray(){
 if(state.phase!=='execution'||state.operation!=='Take Actions'||!state.activeBandId)return '';
 const band=state.pieces.find(p=>p.id===state.activeBandId&&p.type==='Band');
 if(!band||!SPACE[band.location])return '';
 const sources=state.pieces.filter(p=>p.location===`held:${band.id}`||(p.type==='Bison'&&p.location===band.location))
  .map(piece=>({piece,options:possessionActionDropOptions(state,piece.id)})).filter(x=>x.options.length);
 if(!sources.length)return '';
 const targets=[...new Map(sources.flatMap(x=>x.options.map(o=>[o.target,o]))).values()];
 const label=target=>target==='hunt'?'Pick up Bison':target==='spend-horse'?'Spend Horse · +1 MP':target.slice(6);
 return `<div class="board-placement-tray board-possession-tray" aria-label="Physical Band possessions"><strong>Band possessions</strong><span>Drag a carried counter onto an exchange target. Drag Bison here to Hunt. Only legal actions appear.</span><div class="board-placement-pieces">${sources.map(({piece})=>`<button type="button" class="board-placement-piece" data-action="board-select-piece" data-id="${esc(piece.id)}" data-physical-piece-id="${esc(piece.id)}" aria-label="Pick up ${esc(labelPiece(piece))}">${pieceArt(piece)?`<img src="${esc(pieceArt(piece))}" draggable="false" alt="">`:`<span>${esc(smallIcon(piece.type))}</span>`}<small>${esc(piece.subtype||piece.type)}</small></button>`).join('')}</div><div class="board-possession-targets">${targets.map(x=>`<div class="board-possession-drop" data-possession-drop="${esc(x.target)}" role="group" aria-label="${esc(x.label)}">${esc(label(x.target))}</div>`).join('')}</div></div>`;
}
function filterPieces(){return sortedPieces(state).filter(p=>(stateUI.pieceType==='All'||p.type===stateUI.pieceType) && (!stateUI.pieceFilter||`${p.label} ${p.type} ${p.subtype} ${formatLocation(state,p.location)}`.toLowerCase().includes(stateUI.pieceFilter.toLowerCase())));}
function physicalPieceTile(p){
 const face=physicalCounterFace(p),art=pieceArt(p);
 const spot=p.location==='reserve'?'Stock':p.location==='removed'?'Removed':formatLocation(state,p.location);
 return `<button type="button" class="physical-piece-card" data-action="board-select-piece" data-id="${esc(p.id)}" aria-label="Inspect ${esc(p.label||p.type)} at ${esc(spot)}"><span class="physical-piece-face">${art?`<img src="${esc(art)}" alt="${esc(face?.label||p.type)}" loading="lazy">`:`<span class="physical-piece-fallback">${esc(smallIcon(p.type))}<small>${esc(face?.label||'Face not identified')}</small></span>`}</span><span class="physical-piece-name">${esc(p.label||p.type)}</span><span class="physical-piece-detail">${esc(face?.label||'Digital proxy · no matched original face')}</span><span class="physical-piece-location">${esc(spot)}</span></button>`;
}
function originalCounterFaceGallery(){
 const families=[...new Set(PHYSICAL_FACES.map(c=>c.family))];
 const groups=families.map(family=>{
  const faces=PHYSICAL_FACES.filter(c=>c.family===family);
  return `<details class="physical-piece-family"><summary>${esc(family)} · ${faces.length} printed face${faces.length===1?'':'s'}</summary><div class="physical-piece-grid">${faces.map(face=>{
   const art=physicalCounterImageUrlByIndex(face.index);
   return `<div class="physical-piece-card"><span class="physical-piece-face">${art?`<img src="${esc(art)}" alt="${esc(face.label)}" loading="lazy">`:`<span class="physical-piece-fallback">#${face.index}</span>`}</span><span class="physical-piece-name">${esc(face.label)}</span><span class="physical-piece-detail">Source image ${face.index} / 184</span></div>`;
  }).join('')}</div></details>`;
 }).join('');
 return `<details class="physical-piece-family"><summary>Full original counter-face catalogue · 184 indexed faces</summary><p class="small muted">This catalogue identifies the art on the owner-supplied TTS sheets; it does not claim the box contains 184 separate counters. It includes reverse sides, historical War Column faces, track markers, and counters not present in your current scenario.</p>${groups}</details>`;
}
function physicalStockRoom(){
 const audit=componentStockAudit(state.pieces,state.stockVerifiedTotals||{});
 const known=audit.rows.filter(x=>x.printedTotal!==null),unknown=audit.rows.filter(x=>x.printedTotal===null);
 const renderRow=r=>{
  const detail=Object.entries(r.locations).filter(([,count])=>count).map(([location,count])=>`${location}: ${count}`).join(' · ');
  return `<tr class="${r.overstock?'stock-overrun':''}"><td><strong>${esc(r.label)}</strong><div class="small muted">${esc(r.key)}</div></td><td>${r.printedTotal===null?'<span class="tag red">Unverified</span>':`<b>${r.printedTotal}</b>`}</td><td>${r.counted}</td><td>${r.printedTotal===null?'?':`<b>${r.available}</b>`}</td><td>${r.spares?`<span class="small muted">${r.spares} separate non-playable spares</span>`:'—'}</td><td><div class="small">${esc(detail||'Not currently materialized')}</div>${r.unregistered>0?`<span class="small muted">${r.unregistered} certified counter${r.unregistered===1?'':'s'} not yet materialized</span>`:''}</td></tr>`;
 };
 const table=list=>`<div class="setup-table-wrap"><table class="data-table stock-table"><thead><tr><th>Counter family</th><th>Total</th><th>Recorded</th><th>Available</th><th>Spare set</th><th>Locations</th></tr></thead><tbody>${list.map(renderRow).join('')}</tbody></table></div>`;
 const editable=unknown.filter(r=>/^(Band:1|Bison|Settlement:(East|South|West)|Resource:(Horse|Food|Captives|Trade Goods|Guns)|Marker:Ravaged)$/.test(r.key));
 const forms=editable.map(r=>`<form class="stock-count-form" data-stock-key="${esc(r.key)}"><div class="stock-count-item"><strong>${esc(r.label)}</strong><span class="small muted">${r.counted} recorded · total unknown</span><input aria-label="Total physical ${esc(r.label)} counters" name="total" class="control" type="number" min="${r.counted}" max="150" step="1" required placeholder="Total"><label class="small"><input type="checkbox" name="ack" required> Counted the physical counters</label><button class="btn sm" type="submit">Certify stock</button></div></form>`).join('');
 return `<details class="physical-stock-room"><summary><strong>Physical stock & supplies</strong> · ${audit.registered} counters recorded · ${known.length} certified families · ${unknown.length} uncertified</summary>
 <p class="small muted">Each counter is counted once even when its two sides have separate artwork. All locations—reserve, map, Ranchería box, possessed, cup, track and removed—remain in the ledger. Available includes certified counters not yet materialized.</p>
 ${audit.overstock.length?`<div class="notice alert">Too many counters: ${audit.overstock.map(r=>`${esc(r.key)} ${r.counted}/${r.printedTotal}`).join(', ')}</div>`:''}
 <h3>Verified counter supplies</h3>${table(known)}
 <details><summary>Counter families with unknown physical totals (${unknown.length})</summary>${table(unknown)}
 ${state.setupTemplate==='official'?`<p class="small muted">For quantities not established by the supplied artwork, count your physical pieces once. Certified totals are saved locally and enforced; printed totals cannot be overridden.</p><div class="stock-count-grid">${forms}</div>`:''}</details>
 <p class="small muted">184 indexed images identify unique faces, not 184 physical pieces. An unknown total never means unlimited stock.</p></details>`;
}
function physicalCounterTray(){
 const counters=state.pieces.filter(p=>p.location!=='removed');
 if(!counters.length)return '';
 const coverage=physicalCounterCoverage(counters);
 const families=['Band','Rancheria','Paraibo','Mahimiana','Resource','Bison','Settlement','Tribe','War Column','Instruction','Marker','Other'];
 const sections=families.map(type=>{
  const items=counters.filter(p=>p.type===type);
  if(!items.length)return '';
  return `<details class="physical-piece-family"><summary><strong>${esc(type)}</strong> · ${items.length} recorded · ${items.filter(p=>physicalCounterFace(p)).length} with verified face identity</summary><div class="physical-piece-grid">${items.map(physicalPieceTile).join('')}</div></details>`;
 }).join('');
 return `${physicalStockRoom()}<details class="physical-piece-tray"><summary>Physical counter tray · ${coverage.matched}/${coverage.total} exact source-face identities</summary><p class="small muted">Each counter is a separate tracked piece, in its recorded location. Click to inspect. Original faces appear when the locally imported TTS artwork is available. Unidentified pieces are shown honestly rather than given the wrong physical image. The source-face catalogue does not establish how many duplicate counters were printed.</p>${sections}${originalCounterFaceGallery()}</details>`;
}
function piecesTable(){const rows=filterPieces();return `${rows.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Counter</th><th>Details</th><th>Position / possessor</th><th>Owner</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td><span class="mini-icon">${pieceIcon(p)}</span><b>${esc(p.label)}</b><div class="tiny muted">${esc(p.type)}</div></td><td>${esc(details(p))}</td><td>${esc(formatLocation(state,p.location))}</td><td>${esc(getOwner(p))}</td><td>${hButton('edit-piece','Edit','btn slim',`data-id="${p.id}"`)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No counters match the current filters. Use “Record piece” to add the first one.</div>`}`;}
function piecesPage(){return `${warnings()}${physicalCounterTray()}${renderStats()}${cardPanel('Piece registry',`<div class="filters"><input class="control" id="piece-filter" placeholder="Filter pieces or spaces…" value="${esc(stateUI.pieceFilter)}"><select class="control" id="piece-type-filter">${options(['All',...PIECE_TYPES],stateUI.pieceType)}</select>${hButton('modal-add-piece','＋ Add counter','btn primary sm')}</div><div id="piece-results">${piecesTable()}</div>`,'Independent counters, positions and attachments · source of truth for the tracker.')}${cardPanel('Physical counter handling',`<p class="intro">Use <b>Resources box — Ranchería</b> for Bands stored in that Ranchería, or <b>Possessed by Band</b> for Horse, Captives, Bison, Mahimiana, etc. The board is a manual mirror: you must physically move each counter to match your recorded action.</p><div class="notice info">Removed from game is permanent in the rules engine. Out of play / stock is reusable. You can set physical supply caps by category in Settings.</div>`)}`;}
function enemyInstructionPreviewPanel(){
 const data=enemyApPreview(state);
 const body=`<p class="intro">Rule 6.2.2 AP budget from counters actually recorded in your ledger. This does <b>not</b> spend APs or execute printed Instructions. Select the active Enemy on your <b>History Card</b>, and check the currently topmost instruction.</p>
 <div class="rowline"><span>Stored Enemy AP</span><b>${data.stored}</b></div>
 <div class="rowline"><span>Available AP counters (${data.counters})</span><b>${data.available}</b></div>
 <div class="rowline"><span>Combined for enemy resolution</span><b>${data.total}</b></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th>Enemy</th><th>Topmost counter</th><th>Printed cost</th><th>Budget</th></tr></thead><tbody>${data.enemies.map(x=>`<tr><td>${esc(x.enemy)}</td><td>${esc(x.top?.label||'none recorded')}</td><td>${x.cost??'<span class="muted">Unknown</span>'}</td><td>${x.affordable===null?'Verify counter':x.affordable?'Enough AP':'Not enough AP'}</td></tr>`).join('')}</tbody></table></div>
 <p class="small muted">The printed face and its AP cost are tracked together. Spent physical Enemy AP counters recycle immediately into the Success Cup, with any change credited to the AP track. Unverified card exceptions or routes still require a real player decision.</p>`;
 return cardPanel('Enemy Instructions · AP budget assistant',body,'Calculation only · §6.2.2; no unverified enemy actions');
}
function enemyProcedurePanel(){
 const {flow,budget,top,topCost,canPay,activeCounters,audit}=enemyFlowPreview(state);
 const autoEnemy=enemyAutomationPreview(state);
 const active=state.phase==='cleanup'||state.phase==='execution'&&state.operation==='Planning';
 const unready=state.phase==='setup'||state.phase==='gameover'||state.pending||state.warMovement||state.battlePending||state.battleContinuation||state.successCheck;
 if(!flow){
  if(!active)return '';
  const staged=state.enemySelection;
  if(!staged){
   const planning=state.phase==='execution'&&state.operation==='Planning'&&state.planningStage===8;
   const freeReady=planning||Boolean(state.cleanupFinishedPending&&!state.cleanupFinishedPending.started);
   const paidReady=state.phase==='cleanup'&&budget.total>0&&(!state.cleanupCupResult||state.cleanupCupResult.kind!=='instruction'||state.cleanupCupResult.stage==='paid');
   if(!freeReady&&!paidReady)return '';
   return cardPanel('Enemy Instructions · Step 1 / 3 — Active Enemy',`<p class="intro">Roll 1d6 on the current History Card Enemy Action Table. The engine reuses a die already rolled during Planning or Cleanup rather than rolling it again.</p><div class="enemy-roll-steps"><span class="current">1 · Active Enemy</span><span>2 · Flip counter</span><span>3 · Execute</span></div><div class="form-end">${freeReady?hButton('enemy-prepare-free','Roll / reveal free Enemy','btn primary'):''}${paidReady?hButton('enemy-prepare-paid','Roll / reveal paid Enemy','btn primary'):''}</div><p class="small muted">${freeReady?'Free procedure: execute one top Instruction. ':''}${paidReady?`Paid procedure: ${budget.total} Enemy APs available. `:''}No numbers need to be typed.</p>`,'§6.2.2.A–B');
  }
  const mapped=staged.enemy;
  const history=staged.history;
  const named=VERIFIED_HISTORY_NAMED_ENEMIES[history]||ENEMY_COLUMNS;
  const listed=named.map(e=>option(e,e,mapped||named[0])).join('');
  const known=mapped?`<div class="enemy-selected"><span class="enemy-die-face">${staged.die??'★'}</span><div><span class="small muted">${staged.die==null?'Card override':esc(history)+' Enemy Action Table'}</span><h3>${esc(mapped)} is the active Enemy</h3><p class="small">${staged.die==null?'No Enemy Action die was required.':staged.source==='previous-phase'?'Used the already rolled Enemy die.':'Digital die rolled and logged.'}</p></div></div>`:`<div class="enemy-selected"><span class="enemy-die-face">${staged.die??'★'}</span><div><h3>Read ${esc(history)} on your physical History Card</h3><p class="small">This History Card's exact die-to-Enemy mapping is not yet verified in the engine. Select the Enemy printed for die ${staged.die}.</p></div></div>`;
  const choose=mapped?`<div class="form-end">${hButton('enemy-roll-display',staged.displayDie!=null?'Reveal display die & flip Instruction':'Roll second die & flip Instruction','btn primary')}</div>`:`<form id="enemy-staged-history-form"><label class="field">Active Enemy from printed History Card<select name="enemy" class="control">${listed}</select></label><label class="check-item"><input name="ack" type="checkbox" required> Confirm this Enemy is the result printed for die ${staged.die} on ${esc(history)}</label><button class="btn primary" type="submit">${staged.displayDie!=null?'Reveal display die & flip Instruction':'Roll display die & flip Instruction'}</button></form>`;
  return cardPanel('Enemy Instructions · Step 2 / 3 — Flip',`<div class="enemy-roll-steps"><span class="done">✓ Active Enemy</span><span class="current">2 · Flip counter</span><span>3 · Execute</span></div>${known}<p class="intro">${staged.displayDie!=null?'Reveal the previously rolled display die.':'Roll an independent display d6.'} The result identifies row <b>A–F</b> in the selected Enemy's Instruction column. The engine flips that exact counter, or records no flip if the row is empty.</p>${choose}`,'The second die is never the Enemy Action Table die.');
 }
 const autoCulture=flow.stage==='effect'&&instructionName(state.pieces.find(p=>p.id===flow.currentId))==='Culture Attack'?hButton('enemy-auto-culture','Resolve Culture Attack + instruction automatically','btn primary sm'):'';
 const selected=state.pieces.find(p=>p.id===flow.currentId);
 const topInfo=top?`${esc(top.label)} · ${topCost??'unknown'} AP`:'No Instruction in active column';
 const heading=`${esc(flow.enemy)} · ${flow.kind==='paid'?'paid':'free'} · ${esc(flow.stage)}`;
 let body=`<div class="form-end">${hButton('enemy-auto-progress','Resolve all verified Enemy steps','btn primary sm',autoEnemy.ready?'':'disabled')}</div><p class="small muted">${esc(autoEnemy.reason)}</p><div class="enemy-roll-steps"><span class="done">✓ ${esc(flow.enemy)} · ${flow.die==null?'card choice':'die '+flow.die}</span><span class="done">✓ Row ${flow.row} · die ${flow.displayDie}</span><span class="current">3 · Execute</span></div><div class="notice info"><b>Enemy Procedure in progress</b> — ${heading}. ${flow.flippedId?`Flipped ${esc(state.pieces.find(p=>p.id===flow.flippedId)?.label||flow.flippedId)} to its ${state.pieces.find(p=>p.id===flow.flippedId)?.flipped?'reverse':'front'} side.`:`Row ${flow.row} was empty: no counter flipped.`} ${flow.executed} Instruction(s) resolved.</div>
  <div class="rowline"><span>Stored Enemy AP</span><b>${budget.stored}</b></div><div class="rowline"><span>Available counter AP</span><b>${budget.available}</b></div><div class="rowline"><span>Total</span><b>${budget.total}</b></div>
  <div class="rowline"><span>Top Instruction</span><b>${topInfo}</b></div>`;
 if(flow.stage==='choose'&&top?.subtype==='Unknown'){
   body+=`<div class="notice alert">This counter was flipped to its unverified striped face. It cannot execute using the old front-side effect or AP cost. Record the visible face once from your game counter.</div>
   <form id="enemy-verify-face-form"><label class="field"><span>Actual face effect</span><select name="kind">${options(['Ally','Culture Attack','Encroach','Hunt','Peace','Raid','Recover','Settle','Subjugate','War'])}</select></label>
   <label class="field"><span>Printed AP cost</span><input name="cost" type="number" min="1" max="9" required></label>
   <label class="small"><input type="checkbox" name="ack" required> Verified directly on the physical counter face</label>
   <div class="form-end"><button class="btn primary sm" type="submit">Save verified Instruction face</button></div></form>`;
 }
 if(flow.stage==='choose'){
   const canSelect=Boolean(top)&&(flow.kind==='free'||canPay);
   body+=`<p class="intro">${flow.kind==='free'?'Execute the top Instruction once, without AP payment.':'Paid procedure: execute the top Instruction repeatedly while it can be afforded.'}</p>
    <div class="form-end">${hButton('enemy-select','Select top Instruction →','btn primary sm',canSelect?'':'disabled')}</div>`;
 }
 if(flow.stage==='payment'){
   body+=`<div class="notice alert">Printed cost for <b>${esc(selected?.label||'Instruction')}</b>: ${selected?.strength??'?'}. Choose actual available AP counters and any amount taken from the 0–9 track. The tracker returns excess payment to the track.</div>
   <form id="enemy-pay-form"><div class="form-grid">${activeCounters.map(p=>`<label class="small"><input type="checkbox" name="counterId" value="${esc(p.id)}"> ${esc(p.label)} (${p.value} AP)</label>`).join('')||'<p class="small muted">No physical AP counters available.</p>'}
   <label class="field"><span>APs spent from track (0–${budget.stored})</span><input name="trackSpent" type="number" min="0" max="${budget.stored}" value="0" required></label></div><div class="form-end"><button class="btn primary sm" type="submit">Pay & move to effects</button></div></form>`;
 }
 if(flow.stage==='effect'){
   const culture=enemyCulturePreview(state,flow.enemy);
   const card=enemyCardExceptionPreview(state);
   if(instructionName(selected)==='Ally'){
     const ally=allyTargetPreview(state,flow.enemy);
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy Ally · §6.3.1</h3>
     ${ally.recoverFirst||ally.unknownRavaged?'<div class="notice alert">Recover priority or Ravaged ownership must be resolved first.</div>':
       ally.encroachInstead?'<div class="notice alert">No eligible non-Allied Tribe: the printed rule redirects to Encroach. Complete that separate procedure.</div>':
       flow.allyResolved?'<div class="notice info">Ally placed on Tribe. Mention Ally in the final Instruction confirmation.</div>':
       `<form id="enemy-ally-form"><label class="field"><span>Eligible non-Allied Tribe</span><select name="tribeId">${ally.candidates.map(p=>option(p.id,p.label+' · '+p.location)).join('')}</select></label>
       <label class="small"><input type="checkbox" name="ack" required> I checked the Ally placement and applicable physical card effects.</label><div class="form-end"><button class="btn primary sm" type="submit">Place Ally on Tribe</button></div></form>`}
     </div>`;
   }
   if(['War','Raid'].includes(instructionName(selected))){
     const wr=enemyWarRaidPreview(state);
     const base=`<div class="notice ${wr.ready?'info':'alert'}">${esc(wr.reason)}</div>`;
     const form=wr.ready&&!flow.warRaidResolved?`<form id="enemy-war-raid-form">
       ${wr.mode==='advance'?`<label class="field"><span>One connected space from ${esc(wr.from)}</span><select name="to">${wr.legal.map(v=>option(v,v)).join('')}</select></label>`:''}
       ${['form-war','form-raid'].includes(wr.mode)&&wr.warStock?.length>1?`<label class="field"><span>Available physical War Column strength counter</span><select name="warCounterId">${wr.warStock.map(w=>option(w.id,w.label)).join('')}</select></label>`:''}
       ${wr.mode==='form-raid'?`<p class="small muted">Mark every Tribe tied for the nearest legal position on the actual board. A seeded die selects from the marked counters.</p>${wr.tribes.map(t=>`<label class="small"><input type="checkbox" name="tiedTribeId" value="${esc(t.id)}"> ${esc(t.label||t.id)} (${esc(t.location)})</label>`).join('')}`:''}
       ${['advance','form-raid'].includes(wr.mode)?`<label class="field"><span>Printed route, nearest-target ranking and priority evidence</span><textarea name="routeNote" minlength="25" maxlength="400" required></textarea></label>`:''}
       ${wr.mode==='form-war'?`<label class="field"><span>Verified printed card strength modifier</span><input name="cardModifier" type="number" min="-8" max="8" value="0" required></label><label class="field"><span>Card modifiers, War strength and physical stock confirmation</span><textarea name="cardNote" minlength="20" maxlength="400" required></textarea></label>`:''}
       ${['advance','form-war','form-raid'].includes(wr.mode)?`<label class="small"><input type="checkbox" name="ack" required> I checked printed routes, component supply and active card exceptions</label>`:''}
       <div class="form-end"><button class="btn primary sm" type="submit">Resolve ${esc(wr.kind)} Instruction</button></div>
     </form>`:'';
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy ${esc(instructionName(selected))} · §6.3</h3>${flow.warRaidResolved?`<div class="notice info">${esc(flow.warRaidResolved.result)}</div>`:base+form}</div>`;
   }
   if(instructionName(selected)==='Peace'){
     const peace=peaceTargetPreview(state,flow.enemy);
     const pw=peaceWarColumnPreview(state);
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy Peace · §6.3.5</h3>
     <p class="small muted">Peace at ${esc(peace.square)} also grants Peace status to that Enemy's Settlements${flow.enemy==='East'?' and both East squares':''}.</p>
     ${flow.peaceResolved||flow.peaceWarResolved?'<div class="notice info">Peace effect resolved. Complete the Instruction using verified steps.</div>':
       peace.recoverFirst||peace.unknownRavaged?'<div class="notice alert">Resolve Recover priority or unclassified Ravaged markers first.</div>':
       peace.requiresWarProcedure?`<div class="notice info">${esc(pw.reason)}</div>${pw.ready?`<form id="enemy-peace-war-form">${['advance','no-targets'].includes(pw.mode)?`${pw.mode==='advance'?`<label class="field"><span>One-space movement destination from ${esc(pw.from)}</span><select name="to">${state.edges.filter(e=>e.a===pw.from||e.b===pw.from).filter(e=>e.kind!=='dashed'||flow.enemy==='North').map(e=>option(e.a===pw.from?e.b:e.a,e.a===pw.from?e.b:e.a)).join('')}</select></label>`:''}<label class="field"><span>Printed target / priority verification</span><textarea name="routeNote" minlength="20" maxlength="320" required></textarea></label><label class="small"><input type="checkbox" name="ack" required> I checked the printed movement criterion and active card effects.</label>`:''}<div class="form-end"><button class="btn primary sm" type="submit">Resolve Peace / War Column</button></div></form>`:''}`:
       
       `<form id="enemy-peace-form"><label class="small"><input type="checkbox" name="ack" required> I verified the active Enemy's square, absence of active War Columns, Recover priority and in-play card exceptions.</label><div class="form-end"><button class="btn primary sm" type="submit">Place Peace counter</button></div></form>`}
     </div>`;
   }
   if(instructionName(selected)==='Culture Attack'){
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Automatic Culture Attack · §6.3.2</h3>
       <div class="rowline"><span>Culture loss (base + enemy Settlements)</span><b>${culture.amount} = 1 + ${culture.settlements.length}</b></div>
       <div class="rowline"><span>Projected Culture / Military</span><b>${culture.pointLoss.tracks.culture} / ${culture.pointLoss.tracks.military}</b></div>
       ${culture.recoverFirst||culture.unverifiedRavaged?`<div class="notice alert">${culture.recoverFirst?'Recover takes priority; resolve that instead.':'Unknown Ravaged ownership blocks automatic resolution.'}</div>`:
       flow.cultureAttackResolved?'<div class="notice info">Culture Attack already applied. Complete the Instruction below.</div>':`<form id="enemy-culture-attack-form"><label class="small"><input type="checkbox" name="ack" required> I checked all in-play cards and the recorded Settlement owners.</label><div class="form-end"><button class="btn primary sm" type="submit">Apply calculated Culture loss</button></div></form>`}
       </div>`;
   }
   if(card?.effect){
     const blocked=flow.cardNoEffectResolved||flow.cultureAttackResolved||flow.recoverResolved||flow.subjugateResolved||flow.settleResolved;
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Verified Development card exception</h3><p class="small muted">${esc(card.effect.title)} · ${esc(card.effect.source)}: ${esc(card.kind)} has no normal effect, unless Recover redirects it. Payment is not refunded.</p>
       ${blocked?'<p class="small muted">Instruction effect has already been recorded.</p>':`<form id="enemy-card-exception-form"><label class="small"><input type="checkbox" name="ack" required> This Development card remains in play, and I checked for Recover first.</label><div class="form-end"><button class="btn sm" type="submit">Record no-effect Instruction</button></div></form>`}</div>`;
   }
   if(instructionName(selected)==='Encroach'||(instructionName(selected)==='Ally'&&allyTargetPreview(state,flow.enemy).encroachInstead)||(instructionName(selected)==='Raid'&&enemyWarRaidPreview(state).redirect==='Encroach')){
     const encroachOrder=TERRITORY_DIE_ORDER;
     const preview=encroachTargetPreview(state,1,encroachOrder);
     const canPlace=state.pieces.some(p=>p.type==='Tribe'&&p.location==='reserve');
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy Encroach · §6.3.3</h3><p class="small muted">The game knows all six printed territory symbols; enter the die and select the legal Tribe space. The engine checks the first eligible territory, stacking, Tribe stock and displaced Bison.</p>
       ${flow.encroachResolved?'<div class="notice info">Encroach has been recorded. Mention it in the final Instruction confirmation.</div>':
       `<form id="enemy-encroach-form"><div class="form-grid"><label class="field"><span>Territory die</span><select name="die">${[1,2,3,4,5,6].map(x=>option(x,String(x),1)).join('')}</select></label>
       <p class="small muted">Printed die: 1 UA · 2 LA · 3 LE · 4 RR · 5 RG · 6 BC</p>
       <label class="field"><span>Tribe in stock</span><select name="tribeId">${state.pieces.filter(p=>p.type==='Tribe'&&p.location==='reserve').map(p=>option(p.id,p.label)).join('')}</select></label>
       <label class="field"><span>New Tribe space</span><select name="space">${SPACES.filter(p=>p.type==='round').map(p=>option(p.id,p.name)).join('')}</select></label></div>
       <label class="small"><input type="checkbox" name="ack" required> I checked the counter availability, card exceptions and placement.</label>
       <div class="form-end"><button class="btn primary sm" type="submit" ${canPlace?'':'disabled'}>Resolve Encroach placement</button></div></form>`}
       ${!canPlace?'<p class="small muted">No Tribe in stock: Encroach redirects to Hunt. Use the Hunt form below.</p>':''}</div>`;
   }
   if(instructionName(selected)==='Hunt'||instructionName(selected)==='Encroach'||(instructionName(selected)==='Raid'&&enemyWarRaidPreview(state).redirect==='Encroach')){
     const huntOrder=TERRITORY_DIE_ORDER;
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy Hunt · §6.3.4</h3>
       <p class="small muted">The six territory symbols are recorded in the engine (1 UA · 2 LA · 3 LE · 4 RR · 5 RG · 6 BC). The app will cycle to the next die territory until it finds Bison, then draw one randomly without replacement.</p>
       ${flow.huntResolved?`<div class="notice info">Hunt recorded: ${esc(flow.huntResolved.bisonId||'No Bison on the board')}. Mention Hunt in the final confirmation.</div>`:
       `<form id="enemy-hunt-form"><div class="form-grid"><label class="field"><span>Territory die rolled</span><select name="die">${[1,2,3,4,5,6].map(x=>option(x,String(x),1)).join('')}</select></label>
       </div>
       <label class="small"><input type="checkbox" name="ack" required> I checked current Bison locations and that no unseen card overrides apply.</label>
       <div class="form-end"><button type="submit" class="btn primary sm">Resolve Hunt &amp; remove random Bison</button></div></form>`}
     </div>`;
   }
   const recover=recoverTargetAudit(state,flow.enemy);
   if(!flow.recoverResolved){
    body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Recover assistant · §6.3.7</h3><p class="small muted">If the printed Instruction calls for Recover (including a redirect), this assistant records its result. Verify the in-play History Card's die-roll criterion. It never decides the die result for you.</p>
    ${recover.candidates.length?`<form id="enemy-recover-form"><label class="field"><span>Eligible Ravaged counter</span><select name="ravagedId">${recover.candidates.map(p=>option(p.id,`${p.label} · ${p.location}`)).join('')}</select></label>
    <label class="field"><span>Optional physical die (1–6)</span><input name="die" type="number" min="1" max="6" value="1" required></label>
    <label class="field"><span>Printed History Card criterion / exception</span><input name="criterion" minlength="12" maxlength="240" required placeholder="History Card: Recover succeeds on…"></label>
    <label class="field"><span>Outcome according to printed card</span><select name="success"><option value="yes">Success — return Ravaged to stock</option><option value="no">Failure — leave Ravaged in place</option></select></label>
    ${recover.requiresRandomSelection?'<label class="small"><input type="checkbox" name="randomConfirmed" required> I randomly selected among eligible Ravaged spaces</label>':''}
    <label class="small"><input type="checkbox" name="ack" required> I read the current History Card and checked all eligible Enemy pieces.</label><div class="form-end"><button class="btn sm" type="submit">Record Recover result</button></div></form>`:'<div class="notice info">No Ravaged marker at a confirmed active Enemy space or owned enemy piece. Reconcile owner fields; do not guess eligibility.</div>'}
    ${recover.ambiguousRavaged.length?`<p class="small muted">${recover.ambiguousRavaged.length} other Ravaged marker(s) lack recorded ownership evidence and were not silently included.</p>`:''}</div>`;
   }else body+=`<div class="notice info">Recover recorded: ${esc(flow.recoverResolved.success?'Success':'Failure')}, die ${flow.recoverResolved.die}. Mention Recover in your final effect note. Undo to correct.</div>`;
   if(!flow.recoverResolved&&!flow.subjugateResolved&&!flow.settleResolved&&['West','South','East'].includes(flow.enemy)){
    const subjugate=subjugateTargetAudit(state,flow.enemy);
    body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Subjugate resolution · §6.3.9</h3>
    <p class="small muted">Use this form only if the printed Instruction calls for Subjugate (directly or by a verified redirect). The colored map is incomplete; the physical board and card take precedence. Allied Tribe removal also returns its recorded Ally Instruction to its home display.</p>
    ${subjugate.recoverFirst?'<div class="notice alert">Recover takes priority; do not use Subjugate until that effect is resolved.</div>':subjugate.recordedTribes?`<form id="enemy-subjugate-form">
    <label class="field"><span>Physical Tribe target</span><select name="tribeId">${state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round').map(p=>option(p.id,`${p.label} · ${p.location}`)).join('')}</select></label>
    
    <label class="field"><span>Printed-map and instruction verification</span><textarea name="mapVerification" required minlength="25" maxlength="400" placeholder="Checked Subjugate instruction and the nearest eligible Tribe on the printed colored connection network..."></textarea></label>
    <label class="small"><input type="checkbox" name="randomConfirmed"> I performed any required random selection among equally eligible targets</label>
    <label class="small"><input type="checkbox" name="unmappedRouteConfirmed"> I verified an unrecorded / conflicting colored route on my physical board</label>
    <label class="small"><input type="checkbox" name="ack" required> This is the correct, non-Allied target under the printed §6.3.9 procedure; I will return it to stock physically.</label>
    <div class="form-end"><button type="submit" class="btn primary sm">Record verified Subjugate</button></div></form>`:'<p class="small muted">There are no recorded Tribes in round spaces. Consult the printed fallback rules instead.</p>'}</div>`;
   }
   if(flow.subjugateResolved)body+=`<div class="notice info">Subjugate recorded: Tribe ${esc(flow.subjugateResolved.tribeId)} returned to stock from ${esc(flow.subjugateResolved.location)}. Mention Subjugate in the final effect note. Undo to correct.</div>`;
   if(!flow.recoverResolved&&!flow.subjugateResolved&&!flow.settleResolved&&['West','South','East'].includes(flow.enemy)){
    const settle=settleTargetAudit(state,flow.enemy),stock=state.pieces.filter(p=>p.type==='Settlement'&&p.location==='reserve'&&(p.owner===flow.enemy||p.owner===state.colonial?.[flow.enemy]));
    const targets=SPACES.filter(x=>x.type==='round'&&!state.pieces.some(p=>p.location===x.id&&['Band','Rancheria','Tribe','Settlement'].includes(p.type)));
    body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Settle resolution · §6.3.8</h3>
    <p class="small muted">Use only when the printed Instruction calls for Settle. Confirm the nearest eligible destination along <b>colored</b> Enemy Connections, not ordinary lines. The verified map graph determines route distance and area order.</p>
    ${stock.length&&targets.length?`<form id="enemy-settle-form">
    <label class="field"><span>Available physical Settlement</span><select name="settlementId">${stock.map(p=>option(p.id,`${p.label} · ${p.owner}`)).join('')}</select></label>
    <label class="field"><span>Physically verified destination</span><select name="space">${targets.map(p=>option(p.id,`${p.name}${settle.nearestKnown?.space===p.id?' · nearest recorded':''}`)).join('')}</select></label>
    ${flow.enemy==='East'?`<div class="notice info">${flow.settleOrigin?`Digital die ${flow.settleOriginDie} selected <b>${esc(flow.settleOrigin)}</b>. This origin is locked.`:'The game must roll the East Settle origin before you can place a Settlement.'}</div>${flow.settleOrigin?'':hButton('enemy-roll-settle-origin','Roll East E1/E2 origin','btn primary sm')}`:''}
    <label class="field"><span>Printed map, History Card and rule verification</span><textarea name="mapVerification" required minlength="25" maxlength="400" placeholder="Confirmed the closest legal space by printed colored routes, physical stacking and stock..."></textarea></label>
    <label class="small"><input type="checkbox" name="randomConfirmed"> I performed any necessary random tie-break</label>
    <label class="small"><input type="checkbox" name="unmappedRouteConfirmed"> I verified a card exception to the mapped route (record the card separately)</label>
    <label class="small"><input type="checkbox" name="bisonConfirmed"> I will return all Bison in the selected space to stock physically</label>
    <label class="small"><input type="checkbox" name="ack" required> I checked the printed §6.3.8 effect and the correct physical counter</label>
    <div class="form-end"><button type="submit" class="btn primary sm" ${flow.enemy==='East'&&!flow.settleOrigin?'disabled':''}>Record verified Settlement placement</button></div></form>`:'<p class="small muted">No recorded Settlement stock or unblocked numbered spaces; consult the printed Subjugate fallback instead.</p>'}</div>`;
   }
   if(flow.settleResolved)body+=`<div class="notice info">Settle recorded: Settlement ${esc(flow.settleResolved.settlementId)} placed in ${esc(flow.settleResolved.space)}; ${flow.settleResolved.bisonIds.length} Bison returned to stock. Mention Settle in the effect confirmation. Undo to correct.</div>`;

   body+=`<div class="notice info">Each Instruction must have a verified digital effect before moving to Inactive. A text note alone does not complete an Instruction. The printed colored map still requires physical route verification where the digital graph is incomplete.</div>
    <div class="form-end">${hButton('go-pieces','Open piece ledger','btn sm')}${autoEnemy.command?.type==='ENEMY_AUTO_COMPLETE'?hButton('enemy-complete-resolved','Complete resolved Instruction','btn primary sm'):''}</div>`;
 }
 if(['choose','done'].includes(flow.stage)){
   body+=`<form id="enemy-finish-form"><label class="field"><span>Printed-card exception if another top Instruction is affordable (only if relevant)</span><input name="overrideReason" maxlength="250" placeholder="Card identifier and reason this procedure stops early"></label>
   <label class="small"><input type="checkbox" name="ack" required> I checked remaining AP counters, General Records Track and Enemy Instruction Display.</label><div class="form-end"><button type="submit" class="btn sm">Finish procedure & reset display</button></div></form>`;
 }
 return cardPanel('Guided Enemy Instruction sequence · §6.2.2',body,'Step-by-step AP accounting, verified instruction effects and ordered display reset. Unverified card or map cases are blocked.');
}
function warMovementPanel(){
 if(state.phase!=='war'&&!state.warMovement)return '';
 const movement=state.warMovement;
 const warPieces=state.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0&&p.strength<=8);
 if(movement){
   const war=state.pieces.find(p=>p.id===movement.warId);
   let stopped=false, stopText='';
   try{const defenders=warColumnStopUnits(state,movement.warId);stopped=defenders.length>0;stopText=defenders.map(p=>p.label).join(', ');}catch{}
   const choices=warMoveChoices(state);
   return cardPanel('War Card movement in progress · §3.1',`
     <div class="notice ${stopped?'info':'alert'}"><b>${esc(war?.label||'War Column')}</b> · ${esc(movement.enemy)} · ${esc(war?.location||'unknown location')} · <b>${movement.remaining} / ${movement.allowed} step(s) remain</b>.<br>${stopped?`A visible defender is recorded: ${esc(stopText)}. This column must stop unless printed card effects say otherwise.`:'Choose one verified edge at a time. The printed card and board determine which destination gets closer to the correct target.'}</div>
     <p class="small muted">Card: ${esc(movement.card)} · Entered route: ${movement.route.map(esc).join(' → ')}. Missing map connections are not evidence that no official path exists.</p>
     ${choices.length?`<form id="war-move-step-form"><label class="field"><span>One recorded adjacent connection</span><select class="control" name="to">${options(choices.map(c=>[c.to,`${c.to} (${c.kind})${c.permitted?'':' — CARD EXCEPTION REQUIRED'}`]))}</select></label><label class="field"><span>Printed card exception for dashed line (if needed)</span><input name="overrideReason" maxlength="200" placeholder="Card ID and permission for colonial dashed movement"></label><label class="small"><input type="checkbox" name="cardOverride"> Card explicitly permits dashed line exception</label><label class="small"><input type="checkbox" name="ack" required> I confirmed this step moves toward the correct printed-card target and does not skip a mandatory stop.</label><div class="form-end"><button type="submit" class="btn primary sm">Record one War Column step</button></div></form>`:'<div class="notice info">No permitted next canonical connection is available, or movement is complete/stopped. Check current card exceptions before finishing.</div>'}
     <div class="divider"></div><form id="war-move-finish-form"><label class="field"><span>Reason for stopping before the full allowance, if applicable</span><textarea name="reason" maxlength="400" placeholder="Target occupied; no visible target; printed War Card effect; or not enough entered graph lines…"></textarea></label><label class="small"><input name="ack" type="checkbox" required> War Card movement and any required strength-loss/card effects were physically reconciled.</label><div class="form-end"><button type="submit" class="btn primary sm">Finish this War Column movement</button>${movement.route.length===1?hButton('war-move-cancel','Cancel before moving','btn sm'):''}</div></form>`, 'Only adjacency, allowed step count, normal dashed restrictions and visible stops are checked automatically.');
 }
 const autoCardOptions=WAR_CARD_DATA.filter(c=>c.movement).map(c=>[c.id,`${c.id} — ${Object.entries(c.movement).map(([e,n])=>e+' '+n).join(', ')}`]);
 const warNext=warAutomationStatus(state);
 const autoUI=`<div class="notice info">New: execute §3.1 War movement across all activated columns using the recorded map graph. The engine chooses the nearest visible Ranchería (else Band), applies Alphabetic Priority, and stops on defenders. Missing routes and unsupported War Ends fail closed.</div>
 <div class="form-end">${hButton('war-auto-progress','Resolve next verified War step','btn primary sm',!warNext.ready?'disabled':'')}</div><p class="small muted">${esc(warNext.reason)}</p><div class="form-end">${hButton('war-draw-movement','Draw War Card + move columns (step 1)','btn primary sm',Boolean(state.steps.w1)?'disabled':'')}</div>
 <details><summary>Manual movement-card override (for physical card reconciliation)</summary><form id="war-auto-move-form"><label class="field"><span>Printed movement card</span><select name="card" class="control">${options(autoCardOptions)}</select></label><div class="form-end"><button type="submit" class="btn sm" ${state.steps.w1?'disabled':''}>Apply selected movement</button></div></form></details>
 <div class="form-end">${hButton('war-auto-attrition','Roll all War Column attrition (step 2)','btn sm',state.steps.w1!=='done'||Boolean(state.steps.w2)?'disabled':'')} ${hButton('war-draw-event','Draw War Event (step 3)','btn primary sm',state.steps.w2!=='done'||Boolean(state.steps.w3)?'disabled':'')}</div>`;
 if(!warPieces.length)return cardPanel('War Card movement · §3.1',autoUI+'<div class="notice info">No active War Columns are recorded.</div>');
 return cardPanel('War Card movement assistant · §3.1',autoUI+`
 <p class="intro">Read the War Card and choose an <b>active</b> War Column. Enter that card’s movement allowance. The app checks each map connection, normal Colonial dashed-line restrictions and stops at visible defenders. It <b>cannot verify</b> the true nearest Ranchería, activation on the War Card or unentered connections.</p>
 <form id="war-move-begin-form"><div class="form-grid"><label class="field"><span>Active War Column</span><select name="warId" class="control">${options(warPieces.map(p=>[p.id,`${p.label} · ${p.owner} · ${p.location}`]))}</select></label><label class="field"><span>Movement allowance printed on War Card</span><input name="allowed" type="number" min="1" max="8" value="1" required></label><label class="field"><span>War Card identifier / printed trigger</span><input name="card" maxlength="120" placeholder="Card number / printed move symbol" required></label></div><label class="small"><input type="checkbox" name="ack" required> I confirmed this War Column is active under this War Card and read its movement instructions.</label><div class="form-end"><button class="btn primary sm" type="submit">Start guided movement</button></div></form>`, 'Requires printed War Card, map and card effect verification.');
}
function enemyDisplayPanel(){
 const audit=enemyDisplayAudit(state);
 const valid=state.phase!=='setup'&&state.phase!=='gameover'&&!state.pending&&!state.successCheck&&!state.battlePending&&!state.battleContinuation&&!state.warMovement&&!state.enemyFlow&&!state.enemySelection;
 const currentEnemy=state.enemyFlow?.enemy||state.enemySelection?.enemy||null;
 const flipped=state.enemyFlow?.flippedId||null;
 const plan=audit.problems.length?null:enemyDisplayResetPlan(state);
 const waiting=plan?.inactiveBottomToTop||[];
 const resetLocked=Boolean(state.enemyFlow&&['payment','effect'].includes(state.enemyFlow.stage));
 const displayCell=(piece,enemy,row)=>{
  if(!piece)return `<div class="enemy-counter-cell empty-slot" aria-label="${esc(enemy)} ${esc(row)} empty">Empty</div>`;
  const art=pieceArt(piece),effect=piece.subtype||'Unknown',cost=piece.strength??'?';
  return `<div class="enemy-counter-cell ${enemy==='Inactive'?'held-instruction':''} ${piece.id===flipped?'just-flipped':''}" title="${esc(piece.label)} · ${esc(effect)} ${esc(cost)} AP"><div class="enemy-counter-face">${art?`<img src="${esc(art)}" alt="${esc(piece.label)} ${esc(effect)} ${esc(cost)} Enemy AP">`:`<span><b>${esc(effect)}</b><small>${esc(cost)} AP</small></span>`}</div><div class="enemy-counter-id">${esc(piece.label)} ${piece.flipped?'↻':''}</div></div>`;
 };
 const rows=DISPLAY_ROWS.map(row=>`<div class="enemy-counter-row"><span class="enemy-counter-die">${DISPLAY_ROWS.indexOf(row)+1}<small>${row}</small></span>${ENEMY_COLUMNS.map(enemy=>displayCell(audit.columns[enemy].rows.find(x=>x.row===row)?.piece,enemy,row)).join('')}${displayCell(audit.inactive.find(x=>x.row===row)?.piece,'Inactive',row)}</div>`).join('');
 const reset=valid?`<form id="enemy-reset-form"><label class="field"><span>Printed source for manual reset</span><input name="source" minlength="10" maxlength="250" required placeholder="§6.2.3: end of Enemy procedure"></label><label class="small"><input type="checkbox" name="ack" required> I checked this reset against the printed rules</label><div class="form-end"><button class="btn sm" type="submit" ${audit.problems.length?'disabled':''}>Manually reset display</button></div></form>`:'';
 const holding=waiting.length?`<section class="enemy-holding-order" aria-label="Inactive column reset order"><strong>Inactive — right-hand holding column</strong><p class="small muted">${resetLocked?'Finish the currently executing Instruction before resetting.':'Counters stay here until the complete Enemy procedure ends.'} Return them in this exact order, reading row F up toward row A:</p><ol>${waiting.map((entry,i)=>{const counter=state.pieces.find(p=>p.id===entry.id);const target=plan.returns.find(x=>x.id===entry.id);return `<li><b>${i+1}. ${esc(counter?.label||entry.id)}</b> (${esc(entry.owner)} · inactive ${esc(entry.row)}) → ${esc(target?.row||'?')} after remaining active counters</li>`;}).join('')}</ol></section>`:'<p class="small muted">The Inactive holding column is empty.</p>';
 const after=plan&&waiting.length?`<details class="enemy-reset-preview"><summary>Preview exact order after reset</summary>${ENEMY_COLUMNS.map(enemy=>`<div class="rowline"><b>${esc(enemy)}</b><span>${plan.after[enemy].map(id=>esc(state.pieces.find(p=>p.id===id)?.label||id)).join(' → ')||'Empty'}</span></div>`).join('')}</details>`:'';
 return cardPanel('Enemy Instruction Display',`${audit.problems.map(v=>`<div class="notice alert">${esc(v)}</div>`).join('')}<p class="small muted">The second die flips an Instruction in the active Enemy's column. Execute the topmost remaining Instruction and move it sideways into Inactive <b>after</b> its effect. Do not reset between paid Instructions.</p><div class="enemy-display-scroll"><div class="enemy-counter-table"><div class="enemy-counter-row enemy-counter-head"><span>Die</span>${ENEMY_COLUMNS.map(enemy=>`<strong class="${currentEnemy===enemy?'active-enemy':''}">${esc(enemy)}</strong>`).join('')}<strong>Inactive ↓</strong></div>${rows}</div></div>${holding}${after}${reset?`<details><summary>Manual display reset · correction tool</summary>${reset}</details>`:''}`,'Rules §§6.2.1–6.2.3 · reset is atomic, bottom-up and preserves the unactivated counters on top.');
}
function rancheriaSacrificePanel(){
 if(state.phase!=='war'||state.steps.w4!=='done'||state.steps.w5==='done')return '';
 const obligations=state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]&&state.pieces.some(w=>w.type==='War Column'&&w.location===p.location&&w.strength>0));
 if(!obligations.length)return '';
 return cardPanel('Ranchería siege · §3.1 step 5',obligations.map(r=>{
  const preview=rancheriaSacrificePreview(state,r.id);
  const fight=rancheriaFightPreview(state,r.id);
  const northOptions=preview.northTargets||[];
  return `<div class="notice compact ${preview.ready||fight.ready?'info':'alert'}"><b>${esc(r.label)} · ${esc(r.location)}</b><p>${esc(preview.ready||fight.ready?'Choose one official Ranchería response.':fight.reason)}</p></div>${fight.ready?`<form class="rancheria-fight-form" data-rancheria-id="${esc(r.id)}"><p class="small"><b>Defend:</b> Pay 1 Military Point (Culture substitution applies) and fight a Battle. ${fight.randomWarSelection?'The game randomly chooses the attacking War Column.':''} Subsequent rounds do not charge again.</p><label class="small"><input type="checkbox" name="ack" required> Defender ledger, War Columns, active card rules and point tracks were checked.</label><button class="btn primary sm" type="submit">Defend · pay 1 Military & start Battle</button></form>`:''}${preview.ready?`<form class="rancheria-sacrifice-form" data-rancheria-id="${esc(r.id)}"><p class="small">Sacrifice alternative: lose 2 Military and every Captives counter, reduce one War Column's strength by 1, then return or displace it. ${preview.randomWarSelection?'The digital die selects the War Column with equal odds.':''}</p>${preview.requiresNorthTarget?`<label class="field">If North is selected, nearest non-Allied Tribe <select name="northTribeId" class="control">${option('','Select printed nearest Tribe')}${options(northOptions.map(p=>[p.id,`${p.label} · ${p.location}`]))}</select></label><label class="small"><input type="checkbox" name="northNearestConfirmed"> I checked the nearest North destination on the printed board (the recorded map may be incomplete).</label>`:''}<label class="small"><input type="checkbox" name="ack" required> Captive ownership, all counters and active card exceptions match the printed board.</label><button class="btn primary sm" type="submit">Sacrifice · apply all consequences</button></form>`:''}`;
 }).join(''),'Choose between the two official options. A defence payment is charged exactly once per initiated Battle.');
}
function battlePanel(){
 if(state.phase!=='war' && !state.battlePending && !state.battleContinuation)return '';
 const b=state.battlePending;
 if(b){
  const war=state.pieces.find(p=>p.id===b.warId),unit=state.pieces.find(p=>p.id===b.unitId);
  const auto=battleAutoResolutionPreview(state);
  return cardPanel('Battle round · resolve outcome',`<div class="notice ${b.won?'info':'alert'}"><strong>${b.won?'Comanche wins':'Enemy wins'} this round.</strong> Natural result ${b.natural}, modified ${b.modified}. ${esc(b.expected)}</div>
   <div class="battle-dice">${b.dice.map(d=>`<span class="battle-die">${d}</span>`).join('')}<span class="small muted">${b.gunId?'Highest die chosen; Guns spent.':'Single die.'}</span></div>
   ${state.cards.some(c=>c.kind==='Development'&&Number(c.identifier)===9&&c.zone==='Hand')&&!b.countingCoupReroll?`<form id="battle-counting-coup-form"><p class="small">D09 Counting Coup: cancel one unresolved Battle die and reroll it before applying any losses. The Battle's Guns cost remains paid.</p><label class="field"><span>Die to cancel</span><select name="dieIndex">${b.dice.map((d,i)=>option(String(i),`Die ${i+1} (${d})`)).join('')}</select></label><button type="submit" class="btn sm">Play Counting Coup · reroll die</button></form>`:''}
   <p class="intro">${auto.ready?`<b>Verified ledger procedure available:</b> ${esc(auto.reason)} Select automatic resolution to update the game counters and journal together. If your printed board differs from the ledger, use manual reconciliation instead.`:`Reconcile <b>${esc(war?.label||'War Column')}</b> and <b>${esc(unit?.label||'fighting unit')}</b> using Pieces &amp; stock. Possessed Resources and Mahimiana death are now resolved automatically when the digital counters and medicine records are complete; unresolved special counters still require verification. For War Ends, reconcile the paired Instruction; printed exceptions take priority.`}</p>
   <div class="form-end">${auto.ready?hButton('battle-auto-reconcile','Apply Battle consequences automatically','btn primary sm'):`<span class="small muted">Automatic resolution unavailable: ${esc(auto.reason)}</span>`} ${hButton('go-pieces','Edit piece ledger','btn sm')}</div>
   <form id="battle-reconcile-form"><label class="field"><span>Physical board, instruction and card reconciliation note</span><textarea name="note" minlength="12" required placeholder="What counters were changed, which War instruction returned, Mahimiana/Ally/Ranchería effects…"></textarea></label>
   ${!b.won&&b.rancheriaId&&b.unitStrength===1?`<label class="small"><input name="lossConfirmed" type="checkbox"> If the last Band was defeated: I recorded the mandatory Military losses and destruction effects under §§3.1, 2.5.3.</label>`:''}
   <label class="small"><input name="ack" type="checkbox" required> All physical effects and counter ledger changes for this round were completed.</label><div class="form-end"><button class="btn primary sm" type="submit">Confirm reconciled Battle round</button></div></form>`, 'Digital Battle results use recorded counters; verify printed card exceptions and the physical board before reconciling.');
 }
 const wars=state.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]&&p.strength>0&&p.strength<=8);
 const warId=state.battleContinuation?.warId||(wars.some(w=>w.id===stateUI.battleWarId)?stateUI.battleWarId:wars[0]?.id);
 let result=null;try{if(warId)result=eligibleBattleUnits(state,warId);}catch{}
 const units=result?.units||[];
 const unitId=units.some(u=>u.id===stateUI.battleUnitId)?stateUI.battleUnitId:units[0]?.id;
 const unit=units.find(u=>u.id===unitId);
 const guns=state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Guns'&&p.location===`held:${unitId}`);
 const chiefs=state.pieces.filter(p=>p.type==='Mahimiana'&&p.location===`held:${unitId}`);
 const during=state.battleContinuation;
 const safeRound=battleSafeRoundPreview(state);
 const printedWarCounter=result?.war?warColumnBattleModifier(state,result.war):null;
 const mustChooseRancheria=Boolean(result?.rancheria && !during && state.steps.w4==='done' && state.steps.w5!=='done');
 const outstanding=warBattleObligations(state).filter(b=>!b.exempt);
 const audit=outstanding.length?`<div class="notice alert"><b>War Phase audit:</b> ${outstanding.length} War Space(s) contain a recorded defending unit. Resolve each Battle before advancing or explicitly document a card/rule exception.</div>`:'<div class="notice info">No unresolved eligible War Spaces are detected in this counter ledger. Verify the physical board and cards.</div>';
 const exceptions=outstanding.length&&!during?`<details style="margin-top:12px"><summary class="small">Document an alternative to Battle (printed rule/card)</summary><form id="battle-exception-form"><label class="field"><span>War Column</span><select name="warId">${options(outstanding.map(o=>[o.warId,`${o.warLabel} · ${formatLocation(state,o.location)}`]))}</select></label><label class="field"><span>What printed rule/card permits no Battle?</span><textarea name="reason" minlength="15" required placeholder="For example, Ranchería chose the §3.1 alternative and the printed costs/effects were recorded…"></textarea></label><label class="small"><input type="checkbox" name="ack" required> I verified and applied the alternative procedure on the physical board.</label><div class="form-end"><button class="btn sm" type="submit">Record documented exception</button></div></form></details>`:'';
 const main=mustChooseRancheria?'<div class="notice alert">Select <b>Defend</b> above to pay the required Military Point before the Battle. You cannot roll directly against a Ranchería without this choice.</div>':!wars.length?'<div class="notice info">No recorded War Column on the map. Add the physical column and its strength counter as a War Column piece before using the adviser.</div>':!units.length?`<label class="field"><span>War Column</span><select class="control" id="battle-war-select">${options(wars.filter(w=>!during||w.id===during.warId).map(w=>[w.id,`${w.label} · ${formatLocation(state,w.location)} · strength ${w.strength}`]),warId)}</select></label><div class="notice info">No eligible Band / Allied Tribe is recorded in this War Space. Use the physical board to establish whether Battle is required, then record the defending unit.</div>`:
 `<form id="battle-roll-form"><div class="form-grid"><label class="field"><span>War Column</span><select class="control" id="battle-war-select" name="warId">${options(wars.filter(w=>!during||w.id===during.warId).map(w=>[w.id,`${w.label} · ${w.location} · strength ${w.strength}`]),warId)}</select></label>
 <label class="field"><span>Fighting unit</span><select class="control" id="battle-unit-select" name="unitId">${options(units.map(u=>[u.id,`${u.label} · ${u.type==='Band'?'strength '+u.strength:'allied Tribe'}`]),unitId)}</select></label>
 <label class="field"><span>Guns to spend (two dice)</span><select class="control" name="gunId">${option('','No Guns (one die)')}${options(guns.map(g=>[g.id,g.label]))}</select></label>
 <label class="field"><span>Participating Mahimiana (+1)</span><select class="control" name="mahimianaId">${option('','None')}${options(chiefs.map(m=>[m.id,m.label]))}</select></label>
 <label class="field"><span>Physical die result(s) 1–6 (only for physical rolls)</span><input name="dice" placeholder="4 or 2,6 if spending Guns"></label>
 ${printedWarCounter?`<div class="field"><span>War Column printed counter</span><div class="notice info"><strong>${esc(printedWarCounter.key)} strength ${result.war.strength} — DRM ${printedWarCounter.drm}</strong><p class="small">Automatically read from the original counter-face table. You cannot change this number independently.</p></div></div>`:`<label class="field"><span>Legacy War Column DRM (printed face not identified)</span><input type="number" min="0" max="8" name="warDrm" required placeholder="Enter the physical counter value"></label>`}
 <label class="field"><span>Card modifier (signed)</span><input type="number" min="-12" max="12" name="cardDrm" value="0" required></label>
 <label class="field"><span>Source for nonzero card modifier</span><input name="cardReason" placeholder="Card # and printed effect"></label></div>
 <p class="small muted">${esc(unit?.label||'Unit')}: ${unit?.type==='Band'?`strength ${unit.strength}${unit.finished?' · Finished (−1)':''}`:'Allied Tribe (+2)'}. Unmodified 1 loses; unmodified 6 wins. Spending a possessed Guns counter requires two physical dice and selects the higher die. Card overrides still require review.</p>
 <label class="small"><input type="checkbox" name="ack" required> Confirm physical dice, printed War DRM and active card effects.</label>
 <div class="form-end"><button class="btn primary sm" type="submit" name="rollMode" value="digital">Roll digital dice & calculate</button><button class="btn sm" type="submit" name="rollMode" value="physical">Use entered physical dice</button></div></form>`;
 return cardPanel('Guided Battle scorecard · §7',`${audit}${during?`<div class="notice alert"><b>Another round is required</b> against the same War Column unless a printed card/rule changes the procedure.</div>`:''}<p class="intro">Records a single round and prevents advancing the phase until the physical board has been reconciled. It derives the DRM from verified War Column counters; older unidentified counters still require physical confirmation. Card exceptions still require review.</p>${safeRound.ready?`<div class="notice info">${esc(safeRound.reason)}</div>${hButton('battle-safe-round','Roll and resolve one verified Battle round','btn primary sm')}`:''}${main}${during?`<details style="margin-top:12px"><summary class="small">Document a printed card/rule exception that ends this Battle</summary><form id="battle-close-form"><label class="field"><span>Card or rule reference and reason</span><textarea name="reason" minlength="15" required></textarea></label><label class="small"><input type="checkbox" name="ack" required> The physical board is reconciled.</label><button class="btn sm" type="submit">Close Battle with documented exception</button></form></details>`:''}${exceptions}`, 'Only regular War Column Phase Battles are supported, not card-triggered Battles.');
}
function operationsPage(){return `${warnings()}${renderStats()}<div class="grid-main"><div class="stack">${procedurePanel()}${warMovementPanel()}${rancheriaSacrificePanel()}${battlePanel()}${enemyDisplayPanel()}${enemyProcedurePanel()}${state.enemyFlow?.stage==='effect'&&instructionName(state.pieces.find(p=>p.id===state.enemyFlow.currentId))==='Culture Attack'?cardPanel('Automatic enemy resolution',hButton('enemy-auto-culture','Calculate Culture Attack and move Instruction','btn primary sm'),'Stops if Recover or unverified card exceptions apply.'):''}${developmentAutomationPanel()}${cultureAndOperationsPanel()}${routePlannerPanel()}${dicePanel()}${cardPanel('What this tracker validates',`<ul class="bullet-list"><li>Player AP, Enemy AP, Military and Culture tracks cannot exceed 9.</li><li>Mandatory Passage of Time blocks choosing other Operations when indicated.</li><li>Hunt requires a Bison and adequate movement points.</li><li>Move requires a player-recorded adjacent map connection and enough movement points.</li><li>Trade checks the target type, Ravaged restrictions, AP cost and possession.</li><li>Cleanup cannot finish with basic stacking conflicts or unchecked steps.</li></ul>`,'Full enemy AI, cards, medicine tracks and all Success Check contexts are not yet automated.')}</div><div class="stack">${quickTracks()}${pointLossPanel()}${cupInventoryPanel()}${enemyInstructionPreviewPanel()}${cardPanel('Current operation',`<div class="rowline"><span class="muted">Phase</span><span class="tag gold">${state.phase.toUpperCase()}</span></div><div class="rowline"><span class="muted">Operation</span><b>${esc(state.operation||'Not selected')}</b></div><div class="rowline"><span class="muted">Mandatory Passage</span><b>${requiredPassage(state)?'YES':'No'}</b></div><div class="rowline"><span class="muted">Active Band</span><b>${esc(state.pieces.find(p=>p.id===state.activeBandId)?.label||'None')}</b></div><div class="form-end">${hButton('toggle-mandatory',state.mustPassage?'Clear mandatory marker':'Mark must Passage','btn sm')}</div>`,'Manual marker entry for the physical Operations track.')}</div></div>`;}
/** Card inventory is a ledger of physical cards, not card-effect automation. */
function cardInventorySummary(){
 const kinds=['Development','History','Culture','War'];
 return `<div class="notice compact info"><strong>Tracked card inventory:</strong> ${kinds.map(kind=>`${kind}: ${state.cards.filter(c=>c.kind===kind).length}`).join(' · ')}. Opening War/Culture entries are unnamed physical-card placeholders; check printed cards.</div>`;
}
function ttsStatusChip(){const board=Boolean(boardImageUrl()),cards=localCardCount();return `<span class="asset-chip ${board&&cards===EXPECTED_ART.cards?'ready':''}">${board?'● Board loaded':'○ No board'} · ${cards}/${EXPECTED_ART.cards} cards · ${counterTileCount()} counter tiles</span>`;}
let viewedCounterTiles=[];
async function updateCounterGallery(){try{viewedCounterTiles=await loadCounterTiles(36,stateUI.counterGalleryPage*36);if(stateUI.tab==='cards')render();}catch(e){notify('Counter gallery unavailable: '+e.message,true);}}
function ttsAssetPanel(){
 const report=lastAssetReport(),count=localCardCount(),board=Boolean(boardImageUrl());
 let content=`<div class="asset-onboarding"><div class="asset-onboarding-icon">◎</div><div><h3>One TTS folder. Your whole board.</h3><p>Choose <code>Documents\\My Games\\Tabletop Simulator\\Mods\\Images</code> once. This folder contains images from <strong>every mod</strong>. Only recognised Comanchería source filenames are considered; unrelated files are never decoded or stored.</p><div class="form-end">${hButton('choose-tts-folder','Select TTS Images folder','btn primary')} ${hButton('clear-tts-images','Remove all cached artwork','btn sm')}</div><p id="tts-progress" class="small muted" role="status"></p><div class="asset-metrics"><span><b>${board?'1':'0'}/1</b> Board</span><span><b>${count}/${EXPECTED_ART.cards}</b> Card faces</span><span><b>${counterTileCount()}/${EXPECTED_ART.counterTiles}</b> Physical faces</span></div></div></div>`;
 if(report){content+=`<div class="asset-report"><h3>Last folder scan</h3><p>Examined <b>${report.examined}</b> files, ignored <b>${report.skipped}</b> unrelated or oversized files, recognised <b>${report.sheets}/${EXPECTED_ART.sheets}</b> card sheets and <b>${report.history}/${EXPECTED_ART.history}</b> History faces.</p>${report.missingSheets.length?`<div class="notice alert"><b>Missing or unreadable sheets:</b>${report.missingSheets.map(s=>`<p>${esc(s.kind)} ${s.first}–${s.last}: ${esc(s.reason)}<br><code>${esc(s.filename)}</code></p>`).join('')}</div>`:'<div class="notice compact info">All six known card sheets were recognised.</div>'}${report.errors.length?`<details><summary>${report.errors.length} processing issue(s)</summary><p>${report.errors.map(esc).join('</p><p>')}</p></details>`:''}</div>`;}
 content+=`<div class="counter-art-browser"><div class="form-end">${hButton('toggle-counter-gallery',stateUI.showCounterGallery?'Hide counter images':'Browse imported counter images','btn sm')}</div>${stateUI.showCounterGallery?`<p class="small muted">The 184 original counter faces are assigned to known pieces automatically. Manual assignments below are only for exceptional or unidentified custom pieces; never substitute an incorrect printed face.</p><div class="counter-map-controls"><label class="field">Counter type <select id="counter-map-type" class="control">${options(counterArtTargets(),stateUI.counterArtType)}</select></label>${hButton('apply-counter-art','Use selected image for this type','btn primary sm',stateUI.selectedCounterArt?'':'disabled')}${hButton('remove-counter-art','Remove type mapping','btn sm')}</div><p class="small muted">${stateUI.selectedCounterArt?'Selected tile: '+esc(stateUI.selectedCounterArt):'Select a tile below to assign it.'}</p><p class="small muted">${counterArtAssignments().map(({type})=>esc(type)).join(' · ')||'No counter images assigned yet.'}</p><div class="counter-art-gallery">${viewedCounterTiles.map((x,i)=>`<button class="counter-art-choice ${stateUI.selectedCounterArt===x.name?'selected':''}" data-action="choose-counter-art" data-name="${esc(x.name)}" title="Select tile ${stateUI.counterGalleryPage*36+i+1}"><img src="${esc(x.url)}" alt="Imported TTS counter tile ${stateUI.counterGalleryPage*36+i+1}" loading="lazy"><span>${stateUI.counterGalleryPage*36+i+1}</span></button>`).join('')}</div><div class="form-end">${hButton('counter-gallery-prev','Previous 36','btn sm',stateUI.counterGalleryPage?'':'disabled')}${hButton('counter-gallery-next','Next 36','btn sm',(stateUI.counterGalleryPage+1)*36>=counterTileCount()?'disabled':'')}</div>`:''}</div>`;
 content+='<p class="small muted">Artwork is cached separately from game saves in this browser. It is not sent to GitHub or to any server. The map and card functions still work when artwork is unavailable.</p>';
 return cardPanel('Local Tabletop Simulator assets',content,'One selection imports the board, six card sheets, four History cards and 184 uniquely indexed physical-counter faces.');
}
function cardReferencePanel(){
 const kind=stateUI.referenceKind,available=CARD_REFERENCE.filter(c=>c.kind===kind),selected=available.find(c=>c.id===stateUI.referenceSelected)||available[0],url=selected?cardImageUrl(selected.id):null;
 const content=`<div class="card-browser-grid"><div><label class="field"><span>Family</span><select id="reference-kind" class="control">${options(['War','Development','Culture','History'],kind)}</select></label><label class="field"><span>Card</span><select id="reference-card" class="control">${available.map(c=>option(c.id,c.label,selected?.id)).join('')}</select></label><p class="small muted">${esc(selected?.label||'Card')} · source face ${selected?.sheetIndex||0}</p>${url?'':'<p class="notice info">No artwork cached for this card. Use the TTS asset panel above.</p>'}</div><div class="card-display">${url?`<img src="${esc(url)}" alt="${esc(selected.label)} from your local game assets" loading="lazy">`:'<div class="card-placeholder">▤<span>Local card image not loaded</span></div>'}</div></div>`;
 return cardPanel('Card library',content,'The source-image order and exact printed identifiers may require individual verification.');
}
async function displayLocalCard(id){try{await loadCardImage(id);if(stateUI.tab==='cards')render();}catch(e){notify('Cannot read local image: '+e.message,true);}}
async function chooseLocalArtwork(files){
 try{
  const scanned=files.length;notify('Scanning '+scanned+' filenames locally. Only known Comanchería assets are decoded…');
  const result=await importLocalCards(files,progress=>{const e=$('tts-progress');if(e)e.textContent=`Scanning: ${progress.sheets}/${EXPECTED_ART.sheets} sheets · ${progress.cardsImported} faces · ${progress.counterTiles} counter tiles`;});
  notify(`Local import: ${result.total}/${EXPECTED_ART.cards} cards, ${result.sheets}/6 sheets, ${result.board?'board ready':'board missing'}, ${result.counterTiles} counter tiles.`,result.total!==EXPECTED_ART.cards||!result.board);
  if(!result.board && result.counterTiles===0 && result.total===0){
   notify('No known Comanchería artwork matched the selected folder. Select the original Tabletop Simulator Mods/Images folder, not an exported game folder.',true);
  }
  await loadPhysicalCounterArt();render();if(stateUI.showCounterGallery)await updateCounterGallery();await displayLocalCard(stateUI.referenceSelected);
 }catch(e){notify('Asset import failed: '+e.message,true);}
}
function verifiedWarCardPanel(){
 const event=state.cards.find(c=>c.kind==='War'&&c.zone==='War Event');
 const id=String(event?.identifier||'').trim().toUpperCase();
 const travoisPending=state.phase==='war'&&state.steps.w3==='done'&&['W12','W13'].includes(id)&&state.warEventResolved!==id;
 const surprisePending=state.phase==='war'&&state.steps.w3==='done'&&['W09','W10','W11'].includes(id)&&state.warEventResolved!==id;
 const fastPending=state.phase==='war'&&state.steps.w3==='done'&&['W03','W04','W22'].includes(id)&&state.warEventResolved!==id;
 const travoisMoves=travoisPending&&state.tracks.ap>=2?travoisOptions(state):[];
 const cw=state.countermeasureWindow;
 const cwOptions=cw?warCountermeasureOptions(state,cw.bandId):[];
 const cwControls=cw?`<div class="notice info"><b>${esc(cw.cardId)} countermeasure:</b> ${esc(cw.bandId)} was just marked Finished. Choose a legal printed outcome or decline.</div><div class="form-end">${cwOptions.map(o=>hButton('finish-war-countermeasure',`${esc(o.kind)} · ${esc(o.warId)}${o.rancheriaId?' → '+esc(o.rancheriaId):''}`,'btn sm',`data-war-id="${esc(o.warId)}" data-rancheria="${esc(o.rancheriaId||'')}"`)).join(' ')} ${hButton('finish-war-decline','Decline countermeasure','btn sm')}</div>`:'';
 const travoisControls=travoisPending?`<div class="notice info"><b>Travois (W12/W13):</b> Optional immediate move for 2 AP. This automated path only lists uncontested adjacent spaces; other printed exceptions require manual rule reconciliation. Available AP: ${state.tracks.ap}.</div><div class="form-end">${travoisMoves.map(o=>hButton('travois-move',`Move ${esc(o.rancheriaId)} ${esc(o.from)} → ${esc(o.to)} · 2 AP`,'btn sm',`data-rancheria="${esc(o.rancheriaId)}" data-to="${esc(o.to)}"`)).join(' ')} ${hButton('travois-decline','Decline Travois','btn sm')}</div>`:'';

 let current=null;
 try{if(id)current=verifiedWarEventStatus(state,id);}catch{}
 return cardPanel('Verified War Card effects · W01–W25',`<p class="intro">All 25 English War Card faces are mapped to printed movement and event timing. The guided War movement form accepts a W-number and enforces its actual allowance. Automated reveal effects: Bad Intel and Wide Open Spaces; guided Fast-moving Column extra movement; Surprise Attack; optional Travois relocation and Steal Their Mounts countermeasure are now guided. Alert Pickets suppresses named Tactics/Lords of the Plains Battle modifiers; post-Finish countermeasures now execute printed outcomes. Choice-dependent and delayed effects are explicitly held for manual decisions.</p>
 ${cwControls}
 ${surprisePending?`<div class="notice info"><b>Surprise Attack (${esc(id)}):</b> Selects a strongest eligible War Column and moves it toward the nearest prioritized defender over at most two solid connections. Any resulting Battle must be resolved.</div>${hButton('war-surprise-attack','Resolve Surprise Attack','btn primary sm')}`:''}
 ${fastPending?`<div class="notice info"><b>Fast-moving Column (${esc(id)}):</b> Draw one extra War Card for movement only when a War Column is not with a defender; no secondary attrition or War Event. ${fastColumnEligible(state).length} eligible column(s).</div>${hButton('war-fast-column','Resolve extra War movement','btn primary sm')}`:''}
 ${travoisControls}
 ${['W05','W06'].includes(id)&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId?`<div class="notice info">Steal Their Mounts: Activate a Band in a War Space containing exactly one Band, then spend 1–3 MPs. Use the controls below to target the War Column.</div>${state.pieces.filter(p=>p.type==='War Column'&&p.location===state.pieces.find(b=>b.id===state.activeBandId)?.location&&p.strength>0).flatMap(w=>[1,2,3].filter(n=>n<=state.tracks.movement).map(n=>hButton('steal-mounts',`Spend ${n} MP on ${esc(w.label||w.id)}`,'btn sm',`data-war-id="${esc(w.id)}" data-mp="${n}"`))).join(' ')}`:''}
 ${state.phase==='cleanup'&&id==='W23'?`<div class="notice info">W23 Higher Stakes ${state.warHigherStakesResolved?'has resolved':'will resolve automatically when you finish Cleanup'}; no separate button is required.</div>`:''}
 ${current?`<div class="notice info"><b>${esc(current.card)}</b> · ${esc(current.event)} · ${esc(current.trigger)} · ${current.resolved?'Applied':'Not automatically resolved'}${!current.canResolveImmediately?' · needs guided resolution':''}</div>${current.canResolveImmediately&&!current.resolved?hButton('apply-war-event','Apply verified War Event','btn primary sm',`data-card="${esc(current.card)}"`):''}`:'<p class="small muted">No identified W01–W25 card is currently in the War Event zone.</p>'}
 <details><summary>Printed movement table — all War Cards</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>Card</th><th>War Column movement</th><th>Event type</th></tr></thead><tbody>${WAR_CARD_DATA.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(c.movement?Object.entries(c.movement).map(([k,v])=>`${k} ${v}`).join(' · '):'Reshuffle')}</td><td>${esc(c.event)}</td></tr>`).join('')}</tbody></table></div></details>`);
}
function developmentAutomationPanel(){
 const coverage=developmentCoverage(state),pending=state.developmentPending;
 const active=coverage.active,deck=state.cards.filter(c=>c.kind==='Development'&&c.zone==='Deck');
 const activeUte=active.some(c=>c.number==='02');const activeHunt=active.some(c=>c.number==='12');
 const uteHand=state.cards.some(c=>c.kind==='Development'&&Number(c.identifier)===2&&c.zone==='Hand');const huntHand=state.cards.some(c=>c.kind==='Development'&&Number(c.identifier)===12&&c.zone==='Hand');
 const epidemicLive=active.some(c=>['06','24','47','48','64'].includes(c.number));
 const comancheros=active.filter(c=>['33','34','58'].includes(c.number));
 const verifiedHands=['08','09','11','13','15','16','17','18','28','32','35','36','39','40','42','54','59'];const handCards=verifiedHands.filter(n=>state.cards.some(c=>c.kind==='Development'&&Number(c.identifier)===Number(n)&&c.zone==='Hand'));
 const warColumns=state.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]);const tribes=state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]);
 const ranches=state.pieces.filter(p=>p.type==='Rancheria'&&(SPACE[p.location]||p.location===`box:${p.id}`));
 const stockGoods=state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location==='reserve');
 return cardPanel('Development effects · source-verified engine',`
 <div class="notice info"><b>${Object.keys(DEVELOPMENT_EFFECT_CATALOG).length} / 84</b> individually indexed for executable/guided behavior. Registered cards include partial, guided, and executable branches; see each card’s support mode. Registration does not mean completion. Other cards still require manual reconciliation. Evidence status alone does not imply automation.</div>
 ${epidemicLive&&state.phase==='execution'&&state.operation==='Take Actions'&&!state.epidemicTakeActionsApplied&&!pending&&!state.activeBandId?hButton('development-epidemic-end','Resolve next end-of–Take Actions epidemic/Smallpox effect','btn primary sm'):''}
 ${state.phase==='cleanup'&&!state.steps?.cl1&&active.some(c=>c.number==='44'&&!(state.louisianaDoneIds||[]).includes(c.id))&&!pending?hButton('development-louisiana-cleanup','Resolve Louisiana Purchase random Trade Goods placement','btn primary sm'):''}
 ${state.phase==='cleanup'&&!state.steps?.cl1&&active.some(c=>c.number==='60'&&!(state.americanTradersDoneIds||[]).includes(c.id))&&!pending?hButton('development-american-traders','Resolve American Traders cleanup draw','btn primary sm'):''}
 ${state.phase==='execution'&&state.operation==='Planning'&&active.some(c=>c.number==='56')&&!state.giftGivingUsed?`<form id="development-gift-giving-form"><p>Gift Giving: spend 1 AP to move one available Trade Goods to a Ranchería Resources box (once per Planning in this conservative implementation).</p><select name="rancheriaId">${ranches.map(p=>option(p.id,p.label||p.id)).join('')}</select><button class="btn sm">Perform Gift Giving Headman Action</button></form>`:''}
 ${state.phase==='cleanup'&&!state.steps?.cl1&&active.some(c=>['70','71'].includes(c.number)&&!(state.buffaloDoneIds||[]).includes(c.id))&&!pending?hButton('development-buffalo-start','Resolve next Buffalo Hunters cleanup card','btn primary sm'):''}
 ${pending?.kind==='physical-stock'?`<form id="development-physical-stock-form"><p>${esc(pending.reason)}</p><label class="small"><input type="checkbox" name="ack" required> I have checked my physical game and confirmed that this unused counter really exists.</label><button class="btn primary sm" type="submit">Register physical counter and continue card</button></form>`:''}
 ${pending?.kind==='texas-stock'?`<form id="development-texas-stock-form"><p>Texas Independence (#51) requires an East Settlement from the physical game supply. The scenario ledger has none recorded; the revealed card has not removed any Tribe yet.</p><label class="small"><input type="checkbox" name="ack" required> I have checked the physical components and have an unused East Settlement counter.</label><button class="btn primary sm" type="submit">Register counter and resolve Texas Independence</button></form>`:''}
 ${pending?.kind==='kiowa-alliance'?`<form id="development-kiowa-form"><p>Kiowa Alliance: choose the Tribe, an available Ranchería, a strength-1 or -2 Band and up to two Horse counters.</p><label class="field"><span>Tribe</span><select name="tribeId">${pending.tribeIds.map(id=>option(id,state.pieces.find(p=>p.id===id)?.location||id)).join('')}</select></label><label class="field"><span>Ranchería</span><select name="rancheriaId">${state.pieces.filter(p=>p.type==='Rancheria'&&p.location===`box:${p.id}`).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Band</span><select name="bandId">${state.pieces.filter(p=>p.type==='Band'&&p.location==='reserve'&&[1,2].includes(p.strength)).map(p=>option(p.id,p.label||p.id)).join('')}</select></label>${state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location==='reserve').map(p=>`<label class="field"><input type="checkbox" name="horseId" value="${esc(p.id)}"> ${esc(p.label||p.id)}</label>`).join('')}<button class="btn primary sm">Resolve complete Kiowa Alliance reveal</button></form>`:''}
 ${pending?.kind==='cuerno-medicine'||pending?.kind==='quanah-medicine'?`<form id="development-medicine-form"><p>${esc(pending.reason)}</p><select name="mahimianaId">${pending.chiefIds.map(id=>option(id,state.pieces.find(p=>p.id===id)?.label||id)).join('')}</select><button class="btn primary sm" ${pending.chiefIds.length?'':'disabled'}>Apply verified Medicine change</button></form>`:''}
 ${pending?.kind==='ute-displacement'?`<form id="development-ute-displacement-form"><p>End of Ute Alliance: choose a legal Upper Arkansas space for Ranchería ${esc(pending.rancheriaId)}. The Tribe then enters UA-1.</p><select name="space">${pending.destinations.map(id=>option(id,id)).join('')}</select><button class="btn primary sm">Move Ranchería and place Tribe</button></form>`:''}
 ${pending?.kind==='nuevo-apacheria'?`<form id="development-nuevo-form"><p>Nuevo Apachería: select one in-play Tribe, then one eligible Rio Grande space. Bison and Settlement counters there return to stock.</p><label class="field"><span>Tribe to move</span><select name="tribeId">${state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Rio Grande space</span><select name="space">${options(SPACES.filter(p=>p.territory==='RG').map(p=>[p.id,p.name]),'RG-1')}</select></label><button class="btn primary sm">Resolve Nuevo Apachería</button></form>`:''}
 ${pending?.kind==='buffalo-hunters'?`<form id="development-buffalo-form"><p>Buffalo Hunters selected ${esc(pending.territory)}. Remove one Bison from stock.</p><select name="bisonId">${pending.bisonIds.map(id=>option(id,state.pieces.find(p=>p.id===id)?.location||id)).join('')}</select><button class="btn primary sm">Remove selected Bison</button></form>`:''}
 ${pending?.kind==='horse-discard'?`<form id="development-horse-loss-form"><p>Development #${esc(pending.number)}: select ${pending.required} in-play Horse counters to return to stock.</p>${pending.horseIds.map(id=>`<label class="field"><input type="checkbox" name="horseId" value="${esc(id)}"> ${esc(state.pieces.find(p=>p.id===id)?.label||id)}</label>`).join('')}<button class="btn primary sm">Apply printed Horse losses</button></form>`:''}
 ${pending?.kind==='smallpox-end'?`<form id="development-smallpox-form"><p>Smallpox selected ${esc(pending.space)}. Choose the Band to reduce by one strength.</p><select name="bandId">${pending.bandIds.map(id=>option(id,id)).join('')}</select><button class="btn primary sm">Resolve Smallpox Band loss</button></form>`:''}
 ${pending?.kind==='epidemic'?`<form id="development-epidemic-form"><p>Printed Epidemic selected ${pending.spaces.map(esc).join(', ')}. Choose one affected Band in any multiply occupied selected space.</p>${pending.spaces.filter(loc=>state.pieces.filter(p=>p.type==='Band'&&p.location===loc).length>1&&!state.pieces.some(p=>p.type==='Rancheria'&&p.location===loc)).map(loc=>`<label class="field"><span>${esc(loc)}</span><select name="choice_${esc(loc)}">${state.pieces.filter(p=>p.type==='Band'&&p.location===loc).map(p=>option(p.id,p.label||p.id)).join('')}</select></label>`).join('')}<button class="btn primary sm">Apply Epidemic to selected spaces</button></form>`:''}
 ${pending&&!['epidemic','smallpox-end','buffalo-hunters','horse-discard','texas-stock','physical-stock','nuevo-apacheria'].includes(pending.kind)?`<div class="notice alert">Card ${esc(pending.number)} has an unimplemented printed effect and blocks further play.</div><form id="development-confirm-form"><input type="hidden" name="id" value="${esc(pending.cardId)}"><label class="field"><span>Actual printed effect and result</span><textarea name="note" minlength="20" maxlength="600" required></textarea></label><label class="small"><input name="ack" type="checkbox" required> I resolved this card using its actual printed face.</label><button class="btn primary sm" type="submit">Record verified outcome</button></form>`:''}
 ${state.phase==='execution'&&state.operation==='Passage of Time'&&deck.length&&!pending?hButton('development-auto-reveal','Draw next Development card automatically','btn primary sm'):''}
 ${state.phase==='execution'&&state.operation==='Passage of Time'&&deck.length&&!pending?`<form id="development-reveal-form"><label class="field"><span>Card to reveal (for physical deck reconciliation)</span><select name="id">${deck.map(c=>option(c.id,`#${c.identifier||'?'} ${c.title||''}`)).join('')}</select></label><button class="btn primary sm">Reveal & execute printed effect</button></form>`:''}
 ${activeHunt&&state.phase==='execution'&&state.operation==='Planning'?hButton('development-great-hunt-hand','Take Great Hunt into hand · 1 AP','btn sm'):''}
 ${huntHand&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId?hButton('development-great-hunt-play','Play Great Hunt for active Band · Hunts cost 1 MP','btn sm'):''}
 ${activeUte&&state.phase==='execution'&&state.operation==='Planning'?hButton('development-ute-hand','Take Ute Alliance into hand · 1 AP','btn sm'):''}
 ${uteHand&&!state.developmentUte?`<form id="development-ute-form"><label class="field"><span>Printed option</span><select name="choice">${option('band','Place available strength-3 Band')}${option('remove','Roll die to remove Tribe/Settlement')}</select></label><label class="field"><span>Map destination (Band option)</span><select name="space">${options(SPACES.filter(p=>['round','canyon'].includes(p.type)).map(p=>[p.id,p.name]),'UA-1')}</select></label><p class="small">The removal die rolls digitally. Results 1–2 have no effect; 3–6 remove the selected Tribe or Settlement.</p><p class="small">Select any eligible removal target after the digital die is rolled.</p><button class="btn sm">Play Ute Alliance</button></form>`:''}
 ${state.developmentUte?`<div class="notice info"><b>Ute Alliance die: ${state.developmentUte.die}</b><p>${state.developmentUte.die<=2?'1–2: no removal permitted.':'3–6: choose one in-play Tribe or Settlement, or decline removal.'}</p>${handCards.includes('09')&&!state.developmentUte.rerolled?hButton('development-ute-counting-reroll','Use Counting Coup to reroll Ute Alliance','btn sm'):''}</div><form id="development-ute-resolve-form"><label class="field"><span>Remove a Tribe or Settlement (optional on 3–6)</span><select name="targetId"><option value="">No removal</option>${state.developmentUte.die>=3?state.pieces.filter(p=>['Tribe','Settlement'].includes(p.type)&&SPACE[p.location]).map(p=>option(p.id,p.label||p.id)).join(''):''}</select></label><button class="btn primary sm">Finish Ute Alliance</button></form>`:''}
 ${state.phase==='execution'&&state.operation==='Planning'?verifiedHands.filter(n=>active.some(c=>c.number===n)).map(n=>hButton('development-take-verified',`Take Development #${n} into hand · 1 AP`,'btn sm',`data-number="${n}"`)).join(' '):''}
 ${state.pending?.type==='raid'&&!state.successCheck&&!state.lastSuccessCheck&&handCards.includes('32')?hButton('development-play-skillful','Use Skillful Warriors instead of Success Check','btn sm'):''}
 ${state.successCheck&&!state.successCheck.drawIds.length&&!state.successCheck.tacticalAttempted&&['17','42'].some(n=>handCards.includes(n))?hButton('development-play-tactical','Risk Tactical Advantage for this Success Check','btn sm'):''}
 ${handCards.includes('08')&&state.phase==='execution'&&!state.developmentMountedMove&&!state.pending&&!state.activeBandId?hButton('development-play-mounted','Play Mounted Society · move Rancherías','btn sm'):''}
 ${state.developmentMountedMove?`<form id="development-mounted-move-form"><p>Mounted Society: move any eligible Ranchería over one existing connection, respecting Planning step 7 restrictions. Repeat until finished.</p><label class="field">Ranchería<select name="rancheriaId">${ranches.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field">Next adjacent space<select name="to">${options(SPACES.map(p=>[p.id,p.name]))}</select></label><label class="small"><input type="checkbox" name="transit"> Cross a Peace Space (must continue out)</label><button class="btn sm">Move one connection</button></form>${hButton('development-mounted-finish','Finish Mounted Society movement','btn sm')}`:''}
 ${handCards.includes('09')&&state.successCheck?.drawIds?.length?hButton('development-counting-redraw','Counting Coup · cancel & redraw entire Success Check','btn sm'):''}
 ${handCards.includes('09')&&state.successCheck?.tacticalAttempted&&!state.successCheck.drawIds.length&&!state.successCheck.countingCoupTacticalReroll?hButton('development-counting-tactical-reroll','Counting Coup · cancel Tactical Advantage die and reroll','btn sm'):''}
 ${handCards.includes('09')&&state.successCheck?.mahimianaId&&state.successCheck?.die!=null&&!state.successCheck.drawIds.length&&!state.successCheck.tacticalAttempted&&!state.successCheck.warfareExtra?hButton('development-counting-reroll','Counting Coup · cancel Mahimiana die and reroll','btn sm'):''}
 ${state.qualityMountsPending?`<div class="notice info"><b>Quality Mounts finish: die ${state.qualityMountsPending.die}</b><p>${state.qualityMountsPending.bonusUsed} bonus MP used (of ${state.qualityMountsPending.bonus} granted). Discard only when die ≤ bonus used.</p>${handCards.includes('09')&&!state.qualityMountsPending.rerolled?hButton('development-mounts-counting-reroll','Counting Coup · reroll Quality Mounts die','btn sm'):''}${hButton('development-mounts-resolve','Resolve Quality Mounts finish die','btn primary sm')}</div>`:''}
 ${handCards.includes('16')&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId&&!state.qualityMounts?`<form id="development-quality-mounts-form"><p>Quality Mounts: choose up to 6 bonus MPs for the active Band. On Finish Band, a digital die determines whether the card is discarded.</p><select name="bonus">${options(['1','2','3','4','5','6'],'3')}</select><button class="btn sm">Gain Quality Mounts MPs</button></form>`:''}
 ${['39','40','59'].some(n=>handCards.includes(n))&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId&&!state.pending&&!state.comancheMoon?hButton('development-moon-prepare','Prepare Comanche Moon for next Raid','btn sm'):''}
 ${handCards.includes('11')?`<form id="development-siege-form"><p class="small">Siege of La Jicarilla: place two stock Ravaged counters on one Tribe, or one each on two Tribes.</p><label class="field"><span>First Tribe</span><select name="first">${tribes.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Second Tribe (optional; leave blank for both on first)</span><select name="second"><option value="">Both on first Tribe</option>${tribes.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn sm">Play Siege of La Jicarilla</button></form>`:''}
 ${handCards.includes('28')?hButton('development-play-anza','Play Juan Bautista de Anza · end West War Columns / restore Peace','btn sm'):''}
 ${handCards.includes('35')&&state.phase==='execution'&&state.operation==='Take Actions'?hButton('development-play-vibrant','Play Vibrant Population · unfinish Bands','btn sm'):''}
 ${handCards.includes('54')&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId?hButton('development-play-long-raid','Play 1,000-Mile Raid · +6 MP','btn sm'):''}
 ${handCards.includes('18')&&state.enemyFlow?.stage==='effect'?`<p class="small">No Relief from War may be played before an Enemy Recover die roll, if Recover is required.</p>${hButton('development-play-no-relief','Play No Relief from War · cancel Recover','btn sm')}`:''}
 ${handCards.includes('15')&&state.phase==='execution'&&state.operation==='Planning'&&state.planningStage===4?`<form id="development-negotiation-form"><p class="small">Negotiation: select an in-play War Column with an unambiguous paired War/Raid Instruction.</p><label class="field"><span>War Column</span><select name="warId">${warColumns.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Acting Headman</span><select name="headmanRancheriaId">${options(Object.entries(state.planningHeadman||{}).filter(([,r])=>r.spent<r.allowance).map(([id])=>[id,state.pieces.find(p=>p.id===id)?.label||id]))}</select></label><button class="btn sm">Play Negotiation</button></form>`:''}
 ${handCards.includes('13')&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId?`<form id="development-french-traders-form"><p class="small">French Traders: spend one or two possessed Bison/Horse counters for the same number of available Guns. An empty round space in LA, RR, or BC is required.</p><label class="field"><span>First possessed resource</span><select name="first">${state.pieces.filter(p=>p.location==='held:'+state.activeBandId&&(p.type==='Bison'||['Bison','Horse'].includes(p.subtype))).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Optional second resource</span><select name="second"><option value="">Only one</option>${state.pieces.filter(p=>p.location==='held:'+state.activeBandId&&(p.type==='Bison'||['Bison','Horse'].includes(p.subtype))).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn sm">Play French Traders</button></form>`:''}
 ${comancheros.length&&state.phase==='execution'&&state.operation==='Planning'&&!state.developmentPlanningApplied?`<form id="development-comancheros-form"><p class="small">${comancheros.length} Trade Goods required; ${stockGoods.length} physically available in recorded stock.</p><label class="field"><span>Receiving Ranchería</span><select name="rancheriaId">${ranches.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn primary sm" ${ranches.length&&stockGoods.length>=comancheros.length?'':'disabled'}>Resolve Comancheros at end of Planning</button></form>`:''}
 <details><summary>All 84 original Development cards: source and current automation status</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>No.</th><th>Card</th><th>Period</th><th>Implementation</th></tr></thead><tbody>${DEVELOPMENT_SOURCE_INDEX.map(x=>`<tr><td>${esc(x.number)}</td><td>${esc(x.name)}</td><td>${x.period}</td><td>${esc(x.automation)}</td></tr>`).join('')}</tbody></table></div></details>
 <details><summary>Supported Development card triggers</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>Card</th><th>Name</th><th>Trigger</th><th>Support</th></tr></thead><tbody>${Object.entries(DEVELOPMENT_EFFECT_CATALOG).map(([n,c])=>`<tr><td>#${n}</td><td>${esc(c.name)}</td><td>${esc(c.trigger)}</td><td>${esc(c.mode)}</td></tr>`).join('')}</tbody></table></div></details>`, 'Direct source: your English Tabletop Simulator Development card faces. Unverified card branches remain guarded.');
}
function cardCertificationPanel(){
 const cards=developmentCardAudit(), manual=cards.filter(c=>c.requiresManualProcedure);
 return cardPanel('Development card implementation audit',`<div class="notice alert"><strong>0 of 84 Development cards certified fully automated.</strong> ${manual.length} have explicit manual-required procedures, and the remaining ${84-manual.length} have incomplete end-to-end verification. A registered effect is not a complete card.</div><details><summary>Inspect every Development card’s implementation status</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>Card</th><th>Trigger</th><th>Status</th></tr></thead><tbody>${cards.map(c=>`<tr><td>#${esc(c.number)} ${esc(c.name)}</td><td>${esc(c.trigger)}</td><td>${c.requiresManualProcedure?'Manual procedure':'Not certified'}</td></tr>`).join('')}</tbody></table></div></details>`);
}
function cardsPage(){const audit=cardEvidenceAudit(state);return `${warnings()}${ttsAssetPanel()}${cardReferencePanel()}<details class="card-dev-tools"><summary>Card rules, automation and administration</summary>${verifiedWarCardPanel()}${developmentAutomationPanel()}${cardCertificationPanel()}${cardInventorySummary()}${cardPanel('Evidence coverage',`<p class="intro">${audit.total} registered · ${audit.unverified} unverified · ${audit.sourceLocated} source located · ${audit.checkedAgainstPrint} cross-checked. Card effects are <strong>not automated</strong> by these labels.</p>${audit.missingIdentifiers||audit.withoutSources?`<p class="small muted">${audit.missingIdentifiers} cards lack printed IDs; ${audit.withoutSources} evidence entries lack references.</p>`:''}`)}${cardPanel('Recorded cards',`<div class="form-end" style="margin-top:0;margin-bottom:15px">${hButton('modal-add-card','＋ Record card','btn primary sm')}</div>${state.cards.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Card</th><th>Type</th><th>Zone</th><th>Evidence</th><th>Notes</th><th></th></tr></thead><tbody>${state.cards.map(c=>`<tr><td><b>${esc(c.identifier||'—')}</b><div class="small">${esc(c.title||'Unlabelled')}</div></td><td>${esc(c.kind)}</td><td><select class="control card-zone" data-id="${c.id}">${options(['Deck','Display','Hand','In play','War Event','Discard','Available','Removed'],c.zone)}</select></td><td><select class="control card-evidence" data-id="${esc(c.id)}">${options(CARD_EVIDENCE_STATES,c.evidenceStatus||'unverified')}</select><div class="small muted">${esc(c.sourceReference||'No source recorded')}</div></td><td class="small muted">${esc(c.notes)}</td><td>${hButton('edit-card','Edit','btn slim',`data-id="${c.id}"`)} ${hButton('delete-card','Remove','btn slim',`data-id="${c.id}"`)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No cards entered. Record the printed card numbers or names as they appear during your game.</div>'}`,'Cards are represented by identifiers — printed card effects remain authoritative.')}${cardPanel('Rule precedence',`<p class="intro">History-card effects take precedence over other cards and general rules. Ordinary card text can change general rules, and conflicting later effects may supersede earlier card effects. This app <strong>does not interpret card text automatically</strong>. Before you complete a procedure, check the physical cards.</p><a class="rule-link" href="https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/comancheria/Comancheria_LivingRules.pdf" target="_blank" rel="noopener">Open GMT Living Rules (Spring 2024) ↗</a>`)}</details>`;}
function digitalPage(){
 const active=state.pieces.find(p=>p.id===state.activeBandId);
 const selected=state.pieces.find(p=>p.id===stateUI.digitalSelectedPieceId);
 const location=SPACE[stateUI.selectedSpace];
 const available=state.pieces.filter(p=>p.location===stateUI.selectedSpace);
 const cardKinds=['Development','War','Culture','History'];
 const countDeck=k=>state.cards.filter(c=>c.kind===k&&c.zone==='Deck').length;
 const drawn=state.cards.filter(c=>['Hand','Display','War Event','In play'].includes(c.zone)).slice(-12).reverse();
 const cup=state.pieces.filter(p=>p.location==='cup');
 const success=state.successCheck;
 const lastDice=state.log.find(x=>x.command==='ROLL_DICE');
 const pieceButtons=available.length?available.map(p=>`<button type="button" class="digital-token ${selected?.id===p.id?'selected':''}" data-action="digital-pick" data-id="${esc(p.id)}" aria-pressed="${selected?.id===p.id}"><span>${smallIcon(p.type)}</span><b>${esc(p.label)}</b><small>${esc(p.type)} · ${esc(p.owner||'')}</small></button>`).join(''):'<div class="small muted">No tokens in this space. Click another space on the map.</div>';
 const canValidated=selected&&selected.id===active?.id&&state.phase==='execution'&&state.operation==='Take Actions'&&state.edges.some(e=>e.a===selected.location&&e.b===stateUI.selectedSpace||e.b===selected.location&&e.a===stateUI.selectedSpace);
 const destText=selected?`<div class="notice compact info"><b>Selected counter:</b> ${esc(selected.label)} (${esc(formatLocation(state,selected.location))}). Only an activated Band can move by selecting a legal adjacent destination. Other counters need their game procedure.</div>`:'<p class="small muted">Select a counter to inspect legal actions. Clicking an unrelated space never relocates a counter.</p>';
 return `${warnings()}${state.phase==='setup'?officialSetupPanel():''}${renderStats()}<div class="digital-banner"><strong>Digital tabletop · experimental</strong><span>Everything is recorded in this browser, with Undo/Redo. Card effects and genuine player choices still need rule decisions; this is not a fully automated adaptation.</span></div>
 <div class="digital-grid">
 <div class="stack">${cardPanel('Your digital board',`${boardMap()}${destText}${selectedDetail()}`,'Select a space, choose a token, then choose its destination. On-screen moves are saved automatically.')}
 ${cardPanel('Tokens in selected space · '+esc(location?.name||stateUI.selectedSpace),`<div class="digital-token-grid">${pieceButtons}</div>${selected?hButton('digital-clear','Clear selection','btn sm'):''}`,'Selecting another map location while a token is selected attempts a move.')}
 </div>
 <div class="stack">
 ${cardPanel('Turn and action controls',`<div class="rowline"><span>Phase</span><b>${esc(state.phase)}</b></div><div class="rowline"><span>Operation</span><b>${esc(state.operation||'—')}</b></div><div class="rowline"><span>Active Band</span><b>${esc(active?.label||'—')}</b></div>${state.phase==='setup'?hButton('start','Start scenario','btn primary sm'):''}<div class="form-end">${hButton('digital-operations','Open guided phases','btn primary sm')}${hButton('undo','Undo','btn sm',history.past.length?'':'disabled')}${hButton('redo','Redo','btn sm',history.future.length?'':'disabled')}</div>`,'All movement rules and pending-procedure restrictions still apply.')}
 ${cardPanel('Digital dice',`<div class="digital-dice">⚄</div><div class="form-end">${hButton('roll-one','Roll D6','btn primary sm')}${hButton('roll-two','Roll 2D6','btn sm')}</div><p class="small muted">${lastDice?esc(lastDice.description):'No dice rolled yet.'}</p>`,'Deterministic pseudorandom dice, logged for replay; digital rolls are not automatically applied to card effects.')}
 ${cardPanel('Digital decks',`<label class="field"><span>Select deck</span><select id="digital-deck" class="control">${cardKinds.map(k=>option(k,k+' ('+countDeck(k)+' remaining)',stateUI.digitalDeck)).join('')}</select></label><div class="form-end">${hButton('digital-draw-card','Draw 1 card','btn primary sm',countDeck(stateUI.digitalDeck)&&stateUI.digitalDeck!=='War'?'':'disabled')}</div><div class="small muted">${drawn.length?drawn.slice(0,6).map(c=>`<div class="rowline"><span>${esc(c.identifier||c.title||c.id)}</span><b>${esc(c.zone)}</b></div>`).join(''):'No cards revealed.'}</div>`,'War Cards draw in Operations → War Column Phase (steps 1 and 3). Other decks remain manual ledger draws; unimplemented printed effects are not interpreted.')}
 ${cardPanel('Digital Success Check cup',`<div class="rowline"><span>Counters available</span><b>${cup.length}</b></div>${success?`<p class="small">Required: ${success.expected} · Drawn: ${success.drawIds.length}</p><div class="form-end">${hButton('digital-draw-cup','Draw 1 counter','btn primary sm',success.drawIds.length<success.expected?'':'disabled')}${hButton('digital-draw-all','Draw remaining','btn sm',success.drawIds.length<success.expected?'':'disabled')}</div>`:'<p class="small muted">Start a Raid Success Check in Operations to draw digital counters.</p>'}${successCheckPanel()}`,'Draws are without replacement. Undo restores the cup state; finishing the check resolves it.')}
 ${quickActions()}
 </div></div>`;
}
function journalPage(){return `${cardPanel('All recorded events',`<div class="form-end" style="margin-top:0">${hButton('export','⇩ Download save JSON','btn sm')}${hButton('undo','↶ Undo last','btn sm',history.past.length?'':'disabled')}${hButton('redo','↷ Redo','btn sm',history.future.length?'':'disabled')}</div><div class="divider"></div>${state.log.length?state.log.map(x=>`<div class="log-entry"><div class="log-seq">#${x.seq}</div><div><div class="log-desc">${esc(x.description)}</div><div class="log-date">${new Date(x.date).toLocaleString()} · <span class="log-quality">${x.quality==='verified'?'Rule-checked sub-action':'Manual / physical-board entry'}</span> · ${esc(x.command)}</div></div></div>`).join(''):'<div class="empty">No entries yet.</div>'}`,'Undo and redo restore previous game snapshots; update the physical board to match.')}${cardPanel('Rules-coverage notice',`<div class="notice alert">An event marked <b>Rule-checked sub-action</b> only passed the particular checks implemented for that command. It is <strong>not</strong> certification that the entire board position or game phase is legal.</div><p class="intro">Manual corrections are intentionally never described as automatically validated moves. Keep the printed rules and cards beside the board.</p>`)}`;}
function releaseReadinessPanel(){
 const c=developmentSourceCoverage();
 const incomplete=c.total-c.fullyAutomated;
 const copyright=false;
 return cardPanel('Release readiness — independent of test count',`<div class="notice ${incomplete||copyright?'alert':'info'}"><b>${incomplete||copyright?'NOT CERTIFIED for a complete digital game':'Card catalog certification available'}</b><p>${c.fullyAutomated} of ${c.total} Development Cards have passed complete-effect certification. ${c.manualOnly.length} still have explicit manual-only paths. Tests for individual effects are not complete-card certification.</p><p>${copyright?'This personal-use build contains GMT card artwork. Never publish this archive.':'Card images are user-selected and stored only in this browser; none are bundled with the website.'}</p><p>Enemy AI, History and Culture effects, Battle and Passage of Time still have manual paths. A passing test suite does not clear those release gates.</p></div>`,'Use npm run release-audit for the machine-readable release blockers. GitHub publishing requires a separate approval and a rights-safe artifact.');
}
function settingsPage(){return `${warnings()}${releaseReadinessPanel()}<div class="settings-grid"><div class="stack">${cardPanel('Game setup',`<label class="field"><span>Official scenario</span><select id="scenario-select" class="control" ${state.phase!=='setup'?'disabled':''}>${SCENARIOS.map(x=>option(x[0],`${x[1]} · ${x[2]}`,state.scenario)).join('')}</select></label>${state.phase==='setup'?hButton('apply-scenario','Apply scenario label','btn sm'):''}<div class="form-end">${hButton('new-blank','New blank game','btn primary sm')}${hButton('demo','Load demonstration','btn sm')}</div><p class="small muted">All five official scenarios have starting templates in the Board setup screen. Downfall requires guided placement, headmen, Culture and starting Development choices. You cannot change scenarios after starting.</p><label class="field"><span>Historical period (manual)</span><input id="period-value" type="number" min="1" max="4" value="${state.period}"></label>${hButton('set-period','Set period','btn sm')}<label class="field" style="margin-top:18px"><span>Game notes</span><textarea id="game-notes">${esc(state.notes)}</textarea></label>${hButton('save-notes','Save notes','btn sm')}`,'Create a tracker snapshot; do not treat blank setup as an official initial position.')}${cardPanel('Flags & limitations',`<div class="rowline"><span>Santa Fé Trail (#43) has been revealed</span><button class="btn sm" data-action="toggle-santafe">${state.flags.santaFe?'Yes':'No'}</button></div><div class="rowline"><span>Operations marker demands Passage of Time</span><button class="btn sm" data-action="toggle-mandatory">${state.mustPassage?'Yes':'No'}</button></div><div class="small muted">These flags are entered from the board/cards. The Operations numeric track alone is not enough to infer the mandatory box.</div>`)}</div><div class="stack">${cardPanel('Local autosave & export-only archive',`<p class="intro">Every action saves to this browser's storage. The app needs no account, internet connection after first load, server or external database. JSON exports are archival only. Importing files is disabled, and the browser stores your only restorable copy. Keep your site data intact.</p><div class="form-end" style="margin-top:0">${hButton('export','Export JSON','btn primary sm')}</div><div class="notice compact info">Saved only in this browser; save and map file imports are disabled. Downloaded JSON archives cannot be restored inside this app.</div>`)}${cardPanel('Digital dice seed',`<p class="intro">For reproducible digital rolls, set a numeric seed. Changing the seed does not affect previously logged dice or physical rolls.</p><form id="rng-form"><label class="field"><span>Unsigned 32-bit seed</span><input type="number" name="seed" min="0" max="4294967295" step="1" value="${state.rng.seed}" required></label><button type="submit" class="btn sm">Set seed</button></form>`)}${cardPanel('Stock caps (optional)',`<p class="intro">The physical counter supply is limited. This tool cannot infer every printed counter count. Add caps as you transcribe them from the countersheets to block additional in-play entries.</p><form id="limit-form" class="form-grid"><label class="field"><span>Type</span><select name="pieceType">${options(PIECE_TYPES,'Band')}</select></label><label class="field"><span>Subtype (optional)</span><input name="subtype" placeholder="e.g. Horse"></label><label class="field"><span>Maximum in play</span><input name="value" type="number" min="0" max="999" required></label><div class="field" style="align-self:end"><button class="btn sm" type="submit">Set limit</button></div></form>${Object.entries(state.limits).length?`<div class="small muted">${Object.entries(state.limits).map(([k,v])=>`${esc(k)} = ${v}`).join(' · ')}</div>`:''}`)}${cardPanel('Publisher & sources',`<p class="intro">Fan-made, independent, non-commercial companion. Not affiliated with or endorsed by GMT Games. Optional card images are selected from your own Tabletop Simulator files and cached only in this browser; they are not bundled or uploaded. All artwork remains the property of its respective rights owners.</p><a class="rule-link" target="_blank" rel="noopener" href="https://www.gmtgames.com/p-872-comancheria-the-rise-and-fall-of-the-comanche-empire-2nd-printing.aspx">GMT game page and official resources ↗</a><p><a class="rule-link" target="_blank" rel="noopener" href="https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/comancheria/Comancheria_LivingRules.pdf">Living Rules Spring 2024 ↗</a></p>`,'Please own the physical game and refer to the original rules/cards.')}</div></div>`;}
function continueAfterCardReveal(){
 if(stateUI.cardReveals.length){render();loadActiveCardRevealArt();return;}
 if(!ensureFreshTab()){render();return;}
 const before=state,oldHistory=history;
 const followup=resolveAutomaticFollowups(state);
 if(followup.state===before){render();return;}
 const drawn=cardRevealEvents(before,followup.state);
 history={past:[...history.past,copy(before)].slice(-70),future:[]};
 state=followup.state;
 if(!persist()){state=before;history=oldHistory;savingFailed();return;}
 if(drawn.length){stateUI.cardReveals.push(...drawn);stateUI.cardRevealArt=null;}
 render();if(drawn.length)loadActiveCardRevealArt();
}
function activeCardReveal(){return stateUI.cardReveals[0]||null;}
async function placeRevealedCard(){
 if(stateUI.cardRevealBusy||!activeCardReveal())return;
 stateUI.cardRevealBusy=true;
 const card=activeCardReveal(),destination=revealDestination(card);
 const face=document.querySelector('[data-reveal-flight-source]');
 const destinationElement=destination?[...document.querySelectorAll('[data-reveal-card-id]')].find(e=>e.dataset.revealCardId===destination.id):null;
 const shade=document.querySelector('.card-reveal-shade');
 const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 try{
  if(face&&destinationElement&&shade&&!reduceMotion&&typeof face.animate==='function'){
   const start=face.getBoundingClientRect();
   const end=destinationElement.getBoundingClientRect();
   if(end.bottom<0||end.top>window.innerHeight){destinationElement.scrollIntoView({block:'center',behavior:'instant'});}
   const final=destinationElement.getBoundingClientRect();
   const ghost=face.cloneNode(true);
   ghost.removeAttribute('data-action');ghost.removeAttribute('role');ghost.removeAttribute('tabindex');ghost.removeAttribute('aria-label');
   Object.assign(ghost.style,{position:'fixed',left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px',margin:'0',zIndex:'10002',pointerEvents:'none',animation:'none',transformOrigin:'top left'});
   document.body.appendChild(ghost);
   face.style.visibility='hidden';
   const dx=final.left-start.left,dy=final.top-start.top;
   const sx=Math.max(.05,final.width/start.width),sy=Math.max(.05,final.height/start.height);
   const flight=ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`,opacity:.8}],{duration:650,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'});
   const fade=shade.animate([{opacity:1},{opacity:0}],{duration:350,delay:300,fill:'forwards'});
   await Promise.all([flight.finished,fade.finished]);
   ghost.remove();
  }
 }catch(_){document.querySelectorAll('body > .card-reveal-face').forEach(e=>e.remove());}
 finally{
  if(activeCardReveal()?.id===card.id)stateUI.cardReveals.shift();
  stateUI.cardRevealArt=null;stateUI.cardRevealBusy=false;
  continueAfterCardReveal();
 }
}

function cardRevealOverlay(){
 const card=activeCardReveal();if(!card||stateUI.home)return '';
 const art=stateUI.cardRevealArt;
 const label=revealLabel(card),code=card.identifier||'Unknown';
 return `<div class="card-reveal-shade" role="presentation"><section class="card-reveal-dialog" role="dialog" aria-modal="true" aria-labelledby="card-reveal-title" aria-describedby="card-reveal-description"><div class="card-reveal-eyebrow">✦ NEW ${esc(label.toUpperCase())} ✦</div><div class="card-reveal-face" data-action="next-card-reveal" role="button" tabindex="0" aria-label="Place this card on the board" data-reveal-flight-source="true">${art?`<img src="${esc(art)}" alt="Locally imported ${esc(label)} ${esc(code)}">`:`<div class="card-reveal-placeholder"><span>${esc(card.kind)}</span><strong>${esc(code)}</strong><small>Original card art is not included</small></div>`}</div><h2 id="card-reveal-title">${esc(card.title||label+' '+code)}</h2><p id="card-reveal-description">${esc(label)} ${esc(code)} drawn to ${esc(card.zone)}. ${card.kind==='War'?'The engine applies only supported War Event effects.':'Review any printed effects not yet automated.'}</p><div class="card-reveal-footer"><small>${stateUI.cardReveals.length>1?`Card 1 of ${stateUI.cardReveals.length} queued`:'Click the card to place it on the board'}</small><button class="btn primary" type="button" data-action="next-card-reveal">${stateUI.cardReveals.length>1?'Place card · next reveal →':'Place card · continue →'}</button></div></section></div>`;
}
async function loadActiveCardRevealArt(){
 const card=activeCardReveal();if(!card)return;
 const key=artReferenceForCard(card);
 const art=key?await loadCardImage(key).catch(()=>null):null;
 if(activeCardReveal()?.id!==card.id||stateUI.cardRevealBusy)return;
 stateUI.cardRevealArt=art;
 const shade=document.querySelector('.card-reveal-shade');
 if(shade){const replacement=document.createElement('template');replacement.innerHTML=cardRevealOverlay();shade.replaceWith(replacement.content);focusCardReveal();}
}
function focusCardReveal(){document.querySelector('.card-reveal-dialog [data-action="next-card-reveal"]')?.focus({preventScroll:true});}
const setupArtPrimed=new Set();
async function primeSetupCardArt(){
 const before=Boolean(bandCounterArtUrl(1)||bandCounterArtUrl(2)||bandCounterArtUrl(3));
 await loadBandCounterArt().catch(()=>{});
 if(!before&&(bandCounterArtUrl(1)||bandCounterArtUrl(2)||bandCounterArtUrl(3))){render();return;}
 if(state.phase!=='setup'||!localCardCount())return;
 const ids=scenarioSetupOptions(state).availableCulture.filter(x=>x.eligible).map(x=>cultureSetupArtId(x.id)).filter(id=>!cardImageUrl(id)&&!setupArtPrimed.has(id));
 if(!ids.length)return;
 ids.forEach(id=>setupArtPrimed.add(id));
 const loaded=await Promise.all(ids.map(id=>loadCardImage(id).catch(()=>null)));
 if(state.phase==='setup'&&loaded.some(Boolean))render();
}
function render(){const root=$('app');
 const previousLog=document.querySelector('.table-action-log');
 const previousLogState=previousLog?{top:previousLog.scrollTop,lastSeq:previousLog.querySelector('[data-log-seq]:last-child')?.getAttribute('data-log-seq')}:null;

 root.innerHTML=`${tabletopPage()}<input id="tts-unified-picker" type="file" webkitdirectory directory multiple accept="image/png,image/jpeg,image/webp" hidden><div id="toast-root" class="toast-wrap" role="status" aria-live="polite"></div>`;
 restoreTableActionLog(previousLogState);renderModal();renderToast();if(activeCardReveal())focusCardReveal();else if(stateUI.eventNotice)root.querySelector('.game-cinematic-continue')?.focus({preventScroll:true});if(state.phase==='setup')void primeSetupCardArt();}

function renderToast(){const root=$('toast-root');if(root)root.innerHTML=stateUI.toasts?`<div class="toast ${stateUI.toastError?'error':''}"><button data-action="dismiss-toast" aria-label="Dismiss">×</button>${esc(stateUI.toasts)}</div>`:'';}
function modalContainer(title,content){return `<div class="modal-bg" data-modal-backdrop="true"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button type="button" class="close" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${content}</div></div></div>`;}
function pieceForm(p,locationOverride){const isEdit=Boolean(p);const type=p?.type||'Band';const subtype=p?.subtype||'';const location=locationOverride||p?.location||'reserve';return `<form id="piece-form"><div class="form-grid"><label class="field"><span>Counter type</span><select name="type" id="piece-type" ${isEdit?'disabled':''}>${options(PIECE_TYPES,type)}</select></label><label class="field"><span>Subtype / printed marker</span><input name="subtype" value="${esc(subtype)}" placeholder="Horse, Ravaged, Spain, …"></label><label class="field"><span>Counter label</span><input required maxlength="100" name="label" value="${esc(p?.label||'')}" placeholder="e.g. Band A1, Ranchería B"></label><label class="field"><span>Owner</span><input name="owner" value="${esc(p?.owner||'Comanche')}" placeholder="Comanche, Spain, North…"></label><label class="field"><span>${type==='Band'?'Printed Band strength (MP derives automatically)':'Strength (if printed)'}</span><input name="strength" type="number" min="${type==='Band'?1:0}" max="${type==='Band'?3:20}" value="${p?.strength??(type==='Band'?1:0)}"></label>${type==='Band'?'<p class="small muted">Band faces: 1–6, 2–5, 3–4. MP is never independently entered.</p>':`<label class="field"><span>Printed Movement rating (non-Band)</span><input name="mpRating" type="number" min="0" max="20" value="${p?.mpRating??4}"></label>`}</div><label class="field" style="margin-top:12px"><span>Location / possessor</span><select name="location" ${isEdit?'disabled':''}>${allLocations(state,location)}</select></label><label class="field"><span>Notes or printed detail</span><textarea name="notes" maxlength="1000">${esc(p?.notes||'')}</textarea></label>${isEdit?`<label class="field"><span>Finished side?</span><select name="finished">${option('false','Unfinished',!p.finished?'false':'')}${option('true','Finished',p.finished?'true':'')}</select></label>`:''}<div class="form-end"><button type="submit" class="btn primary">${isEdit?'Save counter details':'Record counter'}</button>${isEdit?hButton('modal-move-piece','Change location','btn sm'):''}${isEdit?hButton('delete-piece','Delete ledger entry','btn red sm',`data-id="${p.id}"`):''}</div></form>`;}
function modalContent(){const m=stateUI.modal;if(!m)return null;
 if(m==='inspect-history'){
  const card=state.cards.find(c=>c.id===stateUI.modalId&&c.kind==='History')||state.cards.find(c=>c.kind==='History'&&['In play','Display','History','Current','Active'].includes(c.zone));
  const art=card?cardImageUrl(artReferenceForCard(card)):null;
  const check=boardHistoryVerification(nextPlayerPrompt(state));
  return ['History Card',`${art?`<img src="${esc(art)}" alt="${esc(card?.title||'History Card')}" style="width:min(100%,390px);height:auto;display:block;margin:0 auto">`:`<p>${esc(card?.title||'Current printed History Card')}</p>`}${check?`<p>${esc(check.detail)}</p><div class="board-turn-actions">${check.buttons}</div>`:'<p>No History check is currently pending. Inspect the printed History Card on the board.</p>'}`];
 }
 if(m==='inspect-printed-card'){
  const card=state.cards.find(c=>c.id===stateUI.modalId);if(!card)return null;
  const art=cardImageUrl(artReferenceForCard(card));
  return [card.title||card.identifier||card.kind,`${art?`<img src="${esc(art)}" alt="${esc(card.title||card.kind)}" style="width:min(100%,390px);height:auto;display:block;margin:0 auto">`:`<p>Imported card artwork is not available for ${esc(card.identifier||card.kind)}.</p>`}<p>${esc(card.kind)} · ${esc(card.zone)} · ${esc(card.identifier||'')}</p><p>Use the current printed-card rules and the game's legal decisions to resolve its effect.</p>`];
 }
 if(m==='add-piece')return ['Record physical counter',pieceForm(null,stateUI.selectedSpace&&stateUI.modalId==='here'?stateUI.selectedSpace:null)];
 if(m==='edit-piece'){const p=state.pieces.find(x=>x.id===stateUI.modalId);return p?['Edit '+p.label,pieceForm(p)]:null;}
 if(m==='move-piece'){const p=state.pieces.find(x=>x.id===stateUI.modalId);if(!p)return null;return [`Reconcile ${p.label}`,`<div class="notice alert">This is a <b>manual correction</b>, not a validated game action. For Band moves, use Take Actions → Move. Reconcile the physical counter before continuing.</div><form id="move-piece-form"><label class="field"><span>Destination</span><select name="location">${allLocations(state,p.location)}</select></label><button class="btn primary" type="submit">Record physical position</button></form>`];}
 if(m==='cleanup-trail'){
   const trail=santaFeTrailPlacementPreview(state);
   if(!trail.choices.length)return ['Santa Fé Trail',`<div class="notice alert">No eligible Wagon Train space remains. Check the recorded counters before continuing.</div>`];
   if(!state.pieces.some(cupDrawable))return ['Santa Fé Trail',`<div class="notice alert">The Success Check Draw Cup has no drawable counter. Reconcile the supply before continuing.</div>`];
   return ['Santa Fé Trail · destination',`<div class="notice">The verified map is authoritative. Northern East is E1. The nearest eligible destination is ${trail.nearest} printed connections away. ${trail.unique?'The engine can place the face-down counter automatically.':'Several destinations tie; choose according to the printed tie procedure.'}</div><form id="cleanup-trail-form"><label class="field"><span>Nearest eligible Wagon Train space</span><select name="to" required>${trail.choices.map(x=>option(x.to,SPACE[x.to]?.name||x.to)).join('')}</select></label><button class="btn primary" type="submit">Place hidden counter</button></form>`];
 }
 if(m==='edge')return ['Record a verified map connection',`<div class="notice">The official map has solid and dashed connections. Read the exact connecting line from your own printed map. Only recorded connections are eligible for Band movement.</div><form id="edge-form"><div class="form-grid"><label class="field"><span>From</span><select name="a">${options(SPACES.map(x=>[x.id,x.name]),stateUI.edgeStart||stateUI.selectedSpace)}</select></label><label class="field"><span>To</span><select name="b">${options(SPACES.map(x=>[x.id,x.name]),stateUI.edgeTarget||'UA-1')}</select></label></div><label class="field"><span>Printed line type</span><select name="kind">${option('solid','Solid')}${option('dashed','Dashed')}</select></label><label class="field"><span>Colored Enemy Connection (if visibly marked)</span><select name="enemyColor">${option('','Unclassified / white')}${option('West','Yellow · West')}${option('South','Green · South')}${option('East','Blue · East')}</select></label><p class="small muted">Do not guess the color. Color tags control the Enemy Connection audit; they do not replace solid/dashed movement rules.</p><label style="display:block;font-size:12px;margin-bottom:12px"><input name="verified" type="checkbox" required> I visually verified this connection on my printed map.</label><button class="btn primary" type="submit">Add line to movement graph</button></form>`];
 if(m==='move-band'){const p=state.pieces.find(x=>x.id===state.activeBandId);if(!p)return null;const edges=state.edges.filter(e=>e.a===p.location||e.b===p.location);return ['Move active Band',`<p class="intro">${esc(p.label)} is at ${esc(formatLocation(state,p.location))}. Only verified printed adjacent spaces appear here.</p>${edges.length?`<form id="move-band-form"><label class="field"><span>Connected destination</span><select name="to">${edges.map(e=>{const target=e.a===p.location?e.b:e.a;return option(target,`${SPACE[target]?.name} · ${e.kind} line`);}).join('')}</select></label><p class="small muted">Cost: ${state.pieces.some(x=>x.location===`held:${p.id}`&&x.subtype==='Horse')?1:2} movement point(s); current: ${state.tracks.movement}.</p><button class="btn primary" type="submit">Validate & move</button></form>`:`<div class="notice alert">No legal connection from this space is recorded in the verified map.</div>`}`];}
 if(m==='trade'){const p=state.pieces.find(x=>x.id===state.activeBandId);if(!p)return null;const resources=state.pieces.filter(x=>x.location===`held:${p.id}` && (x.type==='Bison'||(x.type==='Resource'&&['Horse','Captives','Bison'].includes(x.subtype))));return ['Trade one Resource',`<div class="notice">Trade is only valid in Enemy/Peace Spaces that meet the Ravaged restrictions. This action checks AP and movement cost; it does not know all card overrides or physical stock without user caps.</div><form id="trade-form"><label class="field"><span>Spend possessed resource</span><select name="resourceId" required>${resources.map(r=>option(r.id,`${r.subtype||r.type} (${r.id})`)).join('')}</select></label><label class="field"><span>Receive from physical stock</span><select name="receive">${options(['Food','Trade Goods',...(state.cards.some(c=>c.kind==='Culture'&&c.zone==='In play'&&(c.identifier==='C09'||c.title==='Trade level 1'))&&state.tracks.culture>=1?['Guns']:[])],'Food')}</select></label><button type="submit" class="btn primary" ${resources.length?'':'disabled'}>Validate & trade</button></form>`];}
 if(m==='start-success-check'){const band=state.pieces.find(p=>p.id===state.pending?.bandId);const mah=state.pieces.find(p=>p.type==='Mahimiana'&&p.location===`held:${band?.id}`);return ['Start a digital Success Check',`<p class="intro">Rule 2.9: draw one counter per Band strength, with up to two bonus counters when a possessed Mahimiana qualifies. The app can roll the Mahimiana bonus and draw from its recorded cup. Physical entry is optional.</p><form id="start-check-form"><div class="notice info">Active Band: <b>${esc(band?.label||'Unknown')}</b> · Strength ${band?.strength??0}</div>${mah?`<div class="form-grid"><label class="field"><span>Printed medicine of ${esc(mah.label)}</span><input type="number" name="medicine" min="0" max="9" value="${state.medicine.mahimiana??0}" required></label><label class="field"><span>Optional physical die (1–6)</span><input type="number" name="die" min="1" max="6" value="1"><span>Die source</span><select name="diceMode"><option value="digital">Digital roll</option><option value="physical">Record physical result</option></select></label></div><label class="small"><input type="checkbox" name="ack"> I verified the Mahimiana medicine when recording a physical roll.</label>`:'<p class="small muted">No possessed Mahimiana: draw count equals Band strength.</p>'}<div class="form-end"><button class="btn primary" type="submit">Begin counting drawn counters</button></div></form>`];}
 if(m==='resolve-raid')return ['Resolve pending Raid',`<div class="notice alert">Enter the number of Success counters actually drawn. Also resolve any relevant Peace/Ally roll using the physical rulebook (5.2.3 step 4).</div><form id="raid-form"><div class="form-grid"><label class="field"><span>Total successes</span><input name="successes" type="number" min="0" max="20" value="${state.lastSuccessCheck?.successes??0}" ${state.lastSuccessCheck?'readonly':''} required></label><label class="field"><span>Choose as Horses (rest Captives)</span><input name="horses" type="number" min="0" max="20" value="0" required></label></div>${state.pending?.moonCardId?`<label class="field"><input type="checkbox" name="keepMoon"> Spend 1 AP to return Comanche Moon to hand (otherwise discard; fixed 1 Horse and 1 Captives reward)</label>`:''}<label style="display:block;margin:12px 0;font-size:12px"><input name="ack" type="checkbox" required> I resolved the Success Check and any applicable card/Peace effects on the physical board.</label><button class="btn primary" type="submit">Record Raid result</button></form>`];
 if(m==='add-card'||m==='edit-card'){
  const c=m==='edit-card'?state.cards.find(x=>x.id===stateUI.modalId):null;
  if(m==='edit-card'&&!c)return null;
  return [c?'Edit printed card identity':'Record a printed card',`<form id="card-form"><div class="form-grid">${c?`<div class="small muted">Card family: ${esc(c.kind)} · Zone: ${esc(c.zone)}</div>`:`<label class="field"><span>Card family</span><select name="kind">${options(['History','Development','Culture','War'],'Development')}</select></label>`}<label class="field"><span>Printed ID</span><input name="identifier" maxlength="40" value="${esc(c?.identifier||'')}" placeholder="#43, H2, etc."></label><label class="field"><span>Short name / reminder</span><input name="title" maxlength="120" value="${esc(c?.title||'')}" placeholder="Identify your physical card"></label>${c?'':`<label class="field"><span>Current zone</span><select name="zone">${options(['Deck','Display','Hand','In play','War Event','Discard','Removed'],'Display')}</select></label>`}<label class="field"><span>Evidence status</span><select name="evidenceStatus">${options(CARD_EVIDENCE_STATES,c?.evidenceStatus||'unverified')}</select></label><label class="field"><span>Specific source reference</span><input name="sourceReference" maxlength="300" value="${esc(c?.sourceReference||'')}" placeholder="Publisher PDF/page, module asset identifier"></label></div><label class="field"><span>Notes (summarise; do not reproduce entire cards)</span><textarea name="notes" maxlength="1000">${esc(c?.notes||'')}</textarea></label><button type="submit" class="btn primary">${c?'Save card evidence':'Record card'}</button></form>`];
 }

 return null;
}
function renderModal(){const root=$('modal-root');if(!root)return;const content=modalContent();root.innerHTML=content?modalContainer(content[0],content[1]):'';}
const GAMEPLAY_DIALOGS=new Set(['cleanup-trail','move-band','trade','start-success-check','resolve-raid']);
const CORRECTION_DIALOGS=new Set(['add-piece','edit-piece','move-piece','add-card','edit-card']);
function openModal(modal,id){
 // The verified connection graph is immutable; do not bring back manual edge entry.
 if(modal==='edge'){notify('The printed map connections are verified and locked. No map editing is necessary.',true);return;}
 if(!GAMEPLAY_DIALOGS.has(modal)&&!CORRECTION_DIALOGS.has(modal)&&!['inspect-history','inspect-printed-card'].includes(modal)){
  notify('This procedure has no supported guided interface.',true);return;
 }
 if(modal==='move-band'&&(!state.activeBandId||state.phase!=='execution')){
  notify('Activate a Band before attempting a movement.',true);return;
 }
 if(modal==='trade'&&(!state.activeBandId||state.phase!=='execution')){
  notify('Activate a Band before attempting to trade.',true);return;
 }
 if(modal==='cleanup-trail'&&state.phase!=='cleanup'){
  notify('Santa Fé Trail placement is only available during Cleanup.',true);return;
 }
 if(!ensureFreshTab())return;
 stateUI.modal=modal;
 stateUI.modalId=id||null;
 if(!modalContent()){
  stateUI.modal=null;stateUI.modalId=null;
  notify('This procedure is unavailable in the current game state.',true);return;
 }
 renderModal();
 document.querySelector('#modal-root [role="dialog"] button, #modal-root [role="dialog"] input, #modal-root [role="dialog"] select')?.focus({preventScroll:true});
}
function closeModal(){stateUI.modal=null;stateUI.modalId=null;stateUI.edgeStart=null;stateUI.edgeTarget=null;renderModal();}
function choose(tab){stateUI.tab=tab;stateUI.modal=null;render();window.scrollTo({top:0,behavior:'instant'});}
function val(id){return $(id)?.value;}
function confirmed(message){return confirm(message);}
function actionClick(e){
 if(performance.now()<suppressPieceDragClickUntil && e.target.closest('[data-physical-piece-id], .map-node')){e.preventDefault();return;}
 if(activeCardReveal()&&e.target.closest('[data-action]')?.dataset.action!=='next-card-reveal')return;
 const actionTarget=e.target.closest('[data-action]');
 if(actionTarget?.dataset.action==='choose-tts-folder'){document.getElementById('tts-unified-picker')?.click();return;}
 if(actionTarget?.dataset.action==='clear-tts-images'){if(!confirm('Remove all locally cached Comanchería artwork? Saved games remain untouched.'))return;clearLocalArt().then(()=>{notify('Local artwork removed; saves preserved.');render();}).catch(error=>notify(error.message,true));return;}
if(!actionTarget&&e.target.closest('.tt-printed-board')&&!stateUI.playerPanel&&!activeCardReveal()){stateUI.playerPanel='decisions';render();return;}
 const btn=e.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action;if(activeCardReveal()&&a!=='next-card-reveal')return;const d=btn.dataset;if(a==='history-ledger-resolve'){commit({type:'RESOLVE_VICTORY_FROM_LEDGER',ack:Boolean(document.getElementById('history-ledger-ack')?.checked),transitionAck:Boolean(document.querySelector('#victory-check-form [name=transitionAck]')?.checked)});return;}if(a==='passage-auto-progress'){commit({type:'PASSAGE_AUTO_PROGRESS'});return;}if(a==='war-auto-progress'){commit({type:'WAR_AUTO_PROGRESS'});return;}if(a==='war-auto-until-choice'){commit({type:'WAR_AUTO_UNTIL_CHOICE'});return;}if(a==='war-draw-movement'){commit({type:'WAR_DRAW_MOVEMENT'});return;}if(a==='war-draw-event'){commit({type:'WAR_DRAW_EVENT'});return;}if(a==='war-auto-attrition'){commit({type:'WAR_AUTO_ATTRITION'});return;}if(a==='battle-auto-reconcile'){commit({type:'BATTLE_AUTO_RECONCILE'});return;}if(a==='battle-safe-round'){commit({type:'BATTLE_SAFE_ROUND'});return;}if(a==='culture-ledger-gain'){commit({type:'CULTURE_LEDGER_GAIN',ack:confirm('Does the digital territory ledger exactly match the physical board, including Peace counters and active card effects?')});return;}if(a==='operations-digital-roll'){commit({type:'OPERATIONS_DIGITAL_ROLL',ack:confirm('Have you checked that no active printed card changes the Operations track procedure?')});return;}
 if(a==='board-clear-map-choice'){stateUI.spatialChoice=null;stateUI.choicePage=0;render();return;}
 if(a==='director-map-target'){
  const choices=directorSpatialTargets().get(d.id)||[];
  if(choices.length===1){commit(choices[0].command);return;}
  if(choices.length>1){
   stateUI.selectedSpace=d.id;
   stateUI.choicePage=0;
   stateUI.spatialChoice=d.id;
   stateUI.contextPieceId=null;
   stateUI.playerPanel='decisions';
   render();return;
  }
  notify('This map target is no longer a legal action.',true);return;
 }
 if(a==='board-horse-discard-toggle'){
  const pending=state.developmentPending;
  if(pending?.kind!=='horse-discard'||!pending.horseIds?.includes(d.id))return;
  const selected=stateUI.horseDiscardSelection;
  if(selected.includes(d.id))stateUI.horseDiscardSelection=selected.filter(x=>x!==d.id);
  else if(selected.length<pending.required)stateUI.horseDiscardSelection=[...selected,d.id];
  render();return;
 }
 if(a==='board-horse-discard-confirm'){
  const pending=state.developmentPending,selected=stateUI.horseDiscardSelection;
  if(pending?.kind!=='horse-discard'||selected.length!==pending.required||selected.some(id=>!pending.horseIds.includes(id)))return;
  commit({type:'DEVELOPMENT_RESOLVE_HORSE_DISCARD',horseIds:[...selected]});stateUI.horseDiscardSelection=[];stateUI.horseDiscardKey=null;return;
 }
 
 if(a==='board-card-choice'){
  const choice=printedCardActions(stateUI.contextCardId)[Number(d.choiceIndex)];
  if(choice?.command)commit(choice.command);
  else {stateUI.contextCardId=null;stateUI.playerPanel='decisions';render();notify('This card action is no longer legal.',true);}
  return;
 }
 if(a==='board-target-choice'){
  const choices=stateUI.targetMoveChoices||[],choice=choices[Number(d.choiceIndex)];
  if(choice?.command){try{perform(state,choice.command);commit(choice.command);}catch{stateUI.targetMoveChoices=null;stateUI.playerPanel='decisions';render();notify('That placement is no longer legal.',true);}}
  return;
 }
 if(a==='board-rancheria-choice'){
  const choice=rancheriaBoardActions(stateUI.contextRancheriaId)[Number(d.choiceIndex)];
  if(choice?.command)commit(choice.command);
  else {stateUI.contextRancheriaId=null;stateUI.playerPanel='decisions';render();notify('That Ranchería action is no longer legal.',true);}
  return;
 }
 if(a==='board-context-choice'){
  const piece=state.pieces.find(p=>p.id===stateUI.contextPieceId);
  const choice=piece?printedCounterChoices(state,piece.id,nextPlayerPrompt(state))[Number(d.choiceIndex)]:null;
  if(choice?.command){commit(choice.command);}else{stateUI.contextPieceId=null;stateUI.playerPanel='decisions';render();notify('That counter action is no longer legal.',true);}
  return;
 }
 if(a==='player-panel-decisions'||a==='player-panel-events'||a==='player-panel-guided'){stateUI.contextPieceId=null;stateUI.playerPanel=a.replace('player-panel-','');render();return;}
 if(a==='player-panel-close'){stateUI.contextPieceId=null;stateUI.contextRancheriaId=null;stateUI.contextCardId=null;stateUI.targetMoveChoices=null;stateUI.playerPanel=null;render();return;}
 if(a==='board-next-choices'){stateUI.choicePage++;render();return;}
 if(a==='board-band-choice'){
  const available=activeBandChoices(state).filter(x=>x.kind!=='move');
  const choice=available[Number(d.choiceIndex)];
  if(choice?.command){stateUI.choicePage=0;commit(choice.command);}else notify('That Band action is no longer legal.',true);
  return;
 }
 if(a==='tabletop-choices'){stateUI.tabletopChoices=true;render();return;}if(a==='tabletop-close-choices'){stateUI.tabletopChoices=false;render();return;}if(a==='tabletop-details'){stateUI.tabletopDetails=true;render();return;}if(a==='tabletop-close-details'){stateUI.tabletopDetails=false;render();return;}if(a==='tabletop-inspect-card'){stateUI.tabletopDetails=true;stateUI.drawers.cards=true;render();return;}if(a==='next-card-reveal'){void placeRevealedCard();return;}
 if(a==='dismiss-event'){
  const pending=stateUI.pendingBoardConsequences;
  stateUI.eventNotice=null;stateUI.pendingBoardConsequences=null;
  render();
  if(pending){animateInstructionChanges(pending.before,state,pending.origins);animatePhysicalPieceChanges(pending.before,state,pending.pieces);animateVisualMarkerChanges(pending.before,state,pending.markers);showBoardConsequenceHighlights(pending.before,state);animateBoardConsequenceCaptions(pending.before,state);}
  return;
 }
 if(a==='home-menu'){stateUI.playerPanel='decisions';stateUI.home=false;stateUI.modal=null;render();return;}
 if(a==='home-continue'){stateUI.playerPanel=null;stateUI.home=false;render();return;}
 if(a==='home-new'){
  stateUI.cardReveals=[];stateUI.cardRevealArt=null;
  if((state.pieces.length||state.cards.length||state.log.length)&&!confirmed('Replace the current locally saved game? Export the archival record first if needed.'))return;
  if(!ensureFreshTab())return;
  const oldState=state,oldHistory=history;
  state=newGame(state.scenario);history={past:[],future:[]};
  if(!persist()){state=oldState;history=oldHistory;savingFailed();return;}
  stateUI.playerPanel=null;stateUI.home=false;stateUI.tab='board';render();return;
 }
 if(a==='open-cup'){const drawer=document.querySelector('.board-drawer[data-drawer="dice"]');if(drawer){drawer.open=true;stateUI.drawers.dice=true;drawer.querySelector('[data-cup-ledger]')?.scrollIntoView({block:'start',behavior:'smooth'});}return;}
 if(a==='toggle-turn-drawer'||a==='toggle-card-drawer'){
  const drawers=[...document.querySelectorAll('.board-drawer')];const drawer=drawers[a==='toggle-turn-drawer'?0:2];
  if(drawer){drawer.open=true;stateUI.drawers[drawer.dataset.drawer]=true;drawer.scrollIntoView({behavior:'smooth',block:'start'});}return;
 }
 if(a==='nav'){choose(d.tab);return;}
 if(a==='digital-operations'){const drawer=document.querySelector('.board-drawer');if(drawer){drawer.open=true;drawer.scrollIntoView({block:'start'});}return;}
 if(a==='printed-card-inspect'){
  const card=state.cards.find(c=>c.id===d.id);
  if(!card)return;
  const actions=printedCardActions(card.id);
  if(actions.length===1){commit(actions[0].command);return;}
  if(actions.length>1){stateUI.contextCardId=card.id;stateUI.playerPanel='card';render();return;}
  openModal(card.kind==='History'?'inspect-history':'inspect-printed-card',d.id);return;
 }
 if(a==='printed-history'){openModal('inspect-history');return;}
 if(a==='printed-operations'){const p=nextPlayerPrompt(state);if(p.kind==='automatic'&&p.command)commit(p.command);else notify('Select the applicable printed counter or current legal decision.');return;}
 if(a==='printed-rancheria-resources'){
  const result=printedMedicineTrackFinish(state,d.id,false,nextPlayerPrompt(state));
  if(result?.ok){commit(result.command);return;}
  // The printed Ranchería itself is the contextual decision target.
  const actions=rancheriaBoardActions(d.id);
  stateUI.digitalSelectedPieceId=d.id;
  if(actions.length===1){commit(actions[0].command);return;}
  if(actions.length>1){stateUI.contextRancheriaId=d.id;stateUI.playerPanel='rancheria';render();return;}
  render();return;
 }
 if(a==='printed-record-ap'){
  const planningAP=printedPlanningTrackChoice(state,'ap',nextPlayerPrompt(state),stateUI.digitalSelectedPieceId);
  if(planningAP?.ok){commit(planningAP.command);return;}
  if(planningAP?.ok===false){notify(planningAP.reason,true);return;}
  const track=state.rancheriaActivation;
  const done=track?printedMedicineTrackFinish(state,track.rancheriaId,true,nextPlayerPrompt(state)):null;
  if(done?.ok){commit(done.command);return;}
  const selected=stateUI.digitalSelectedPieceId;
  const choice=activationCounterDropOptions(state,selected,nextPlayerPrompt(state)).find(c=>c.target==='activate:ap');
  if(choice){commit(choice.command);return;}
  notify('The AP track has no currently legal action.');return;
 }
 if(a==='printed-record-military'){
  const military=printedPlanningTrackChoice(state,'military',nextPlayerPrompt(state),stateUI.digitalSelectedPieceId);
  if(military?.ok){commit(military.command);return;}
  notify(military?.reason||'No eligible Headman can convert Culture to Military now.',true);return;
 }
 if(a==='printed-record-culture'){
  const p=nextPlayerPrompt(state);
  if(p.kind==='automatic'&&p.command?.type==='CULTURE_LEDGER_GAIN'){commit(p.command);return;}
  notify('Select the eligible printed Culture card or the current Culture decision.');return;
 }
 if(a==='tabletop-instruction'){const piece=state.pieces.find(p=>p.type==='Instruction'&&p.id===d.id);if(!piece)return;const headmanTarget=printedHeadmanTargetChoice(state,stateUI.digitalSelectedPieceId,piece.id,nextPlayerPrompt(state));if(headmanTarget?.ok){commit(headmanTarget.command);return;}if(headmanTarget?.ok===false){notify(headmanTarget.reason,true);return;}stateUI.instructionFocus=piece.id;if(SPACE[piece.location])stateUI.selectedSpace=piece.location;render();return;}
 if(a==='board-select-piece'||a==='digital-pick'){
  const piece=state.pieces.find(p=>p.id===d.id);if(!piece)return;
  if(a==='board-select-piece'){
   const headmanTarget=printedHeadmanTargetChoice(state,stateUI.digitalSelectedPieceId,piece.id,nextPlayerPrompt(state));
   if(headmanTarget?.ok){commit(headmanTarget.command);return;}
   if(headmanTarget?.ok===false){notify(headmanTarget.reason,true);return;}
   // A multi-territory Epidemic is selected on the affected Band counters,
   // one Band per printed map space, not through a synthetic allocation menu.
   const epidKey=state.developmentPending?.kind==='epidemic'?JSON.stringify(state.developmentPending):null;
   if(stateUI.epidemicKey!==epidKey){stateUI.epidemicKey=epidKey;stateUI.epidemicSelection={};}
   const epidemic=printedEpidemicBandSelection(state,piece.id,stateUI.epidemicSelection,nextPlayerPrompt(state));
   if(epidemic){
    if(!epidemic.ok){notify(epidemic.reason,true);return;}
    stateUI.epidemicSelection=epidemic.selected;
    if(epidemic.command){stateUI.epidemicSelection={};commit(epidemic.command);}
    else {render();notify(`${epidemic.remaining} affected space${epidemic.remaining===1?'':'s'} remaining. Select the Band on the printed board.`);}
    return;
   }
   // A card asking for physical Horses is resolved by choosing those actual
   // counters on the board, not through a separate horse-selection menu.
   const discard=printedHorseDiscardSelection(state,piece.id,stateUI.horseDiscardSelection);
   if(discard){
    if(!discard.ok){notify(discard.reason,true);return;}
    stateUI.horseDiscardSelection=discard.selected;
    if(discard.command){stateUI.horseDiscardSelection=[];commit(discard.command);}
    else render();
    return;
   }
   const prompt=nextPlayerPrompt(state);
   if(piece.subtype==='Success'&&['out-of-play','success-out'].includes(piece.location)){
    const returnSuccess=printedPlanningTrackChoice(state,'out',prompt,stateUI.digitalSelectedPieceId);
    if(returnSuccess?.ok){commit(returnSuccess.command);return;}
    if(returnSuccess?.ok===false){notify(returnSuccess.reason,true);return;}
   }
   const direct=printedCounterChoice(state,piece.id,prompt);
   // A unique validated physical-counter decision is a direct click; an
   // ambiguous choice must still be made explicitly by the human player.
   if(direct?.ok){commit(direct.command);return;}
   const counterChoices=printedCounterChoices(state,piece.id,prompt);
   if(counterChoices.length>1){
    stateUI.digitalSelectedPieceId=piece.id;
    if(SPACE[piece.location])stateUI.selectedSpace=piece.location;
    stateUI.contextPieceId=piece.id;
    stateUI.playerPanel='piece';render();return;
   }
  }
  stateUI.digitalSelectedPieceId=piece.id;stateUI.medicinePendingBandId=null;
  if(SPACE[piece.location])stateUI.selectedSpace=piece.location;
  render();return;
 }
 if(a==='tabletop-order-band'||a==='tabletop-unorder-band'){
  const band=state.pieces.find(p=>p.id===d.id&&p.type==='Band'&&p.location.startsWith('box:'));
  if(!band)return;const id=band.location.slice(4),order=stateUI.rancheriaBandOrder[id]||[];
  const updated=a==='tabletop-order-band'?[...order.filter(x=>x!==band.id),band.id]:order.filter(x=>x!==band.id);
  stateUI.rancheriaBandOrder[id]=updated;
  // Clicking physical Bands is an alternative to dragging them into the
  // printed Medicine slots. The final counter completes the chosen order;
  // validate it through the reducer before starting the track.
  const all=state.pieces.filter(p=>p.type==='Band'&&p.location===`box:${id}`);
  if(a==='tabletop-order-band'&&all.length===updated.length&&!state.activeBandId&&!state.rancheriaActivation){
   const command={type:'RANCHERIA_TRACK_START',rancheriaId:id,bandIds:updated};
   try{perform(state,command);commit(command);return;}catch(error){notify(String(error.message||error),true);}
  }
  render();return;
 }
 if(a==='tabletop-track-start'){
  const ranch=state.pieces.find(p=>p.type==='Rancheria'&&p.id===d.rancheriaId)||state.pieces.find(p=>p.type==='Rancheria'&&p.id===stateUI.digitalSelectedPieceId)||state.pieces.find(p=>p.type==='Rancheria'&&p.id===(state.pieces.find(x=>x.id===stateUI.digitalSelectedPieceId)?.location||'').replace('box:',''));
  if(!ranch)return;const ids=stateUI.rancheriaBandOrder[ranch.id]||[];
  commit({type:'RANCHERIA_TRACK_START',rancheriaId:ranch.id,bandIds:ids});return;
 }
 if(a==='tabletop-track-select'){
  const track=state.rancheriaActivation,band=state.pieces.find(p=>p.id===d.id&&p.type==='Band');
  if(!track||!band)return;
  stateUI.digitalSelectedPieceId=band.id;
  const next=track.slots[track.activated];
  if(next?.bandId===band.id){commit({type:'ACTIVATE_BAND',id:band.id,mode:'rancheria'});return;}
  render();notify('Select the rightmost occupied Medicine slot first.');return;
 }
 if(a==='tabletop-absorb-band'){commit({type:'CLEANUP_ABSORB_BAND',bandId:d.id,rancheriaId:d.rancheriaId});return;}
 if(a==='tabletop-relinquish'){commit({type:'CLEANUP_RELINQUISH',pieceId:d.id,bandId:d.bandId,rancheriaId:d.rancheriaId});return;}
 if(a==='tabletop-take-counter'){commit({type:'RANCHERIA_BAND_TAKE_COUNTER',counterId:d.id});return;}
 if(a==='tabletop-spend-horse'){commit({type:'SPEND_HORSE',horseId:d.id});return;}
 if(a==='tabletop-track-activate'){
  const track=state.rancheriaActivation;if(!track)return;
  const id=track.slots[track.activated]?.bandId;stateUI.digitalSelectedPieceId=id;commit({type:'ACTIVATE_BAND',id,mode:'rancheria'});return;
 }
 if(a==='tabletop-track-finish'||a==='tabletop-track-ap'){
  commit({type:'RANCHERIA_TRACK_FINISH',collectAP:a==='tabletop-track-ap'});return;
 }
 
 if(a==='board-clear-piece'){stateUI.digitalSelectedPieceId=null;render();return;}
 if(a==='board-activate-ap'||a==='board-activate-medicine'){
  const id=stateUI.digitalSelectedPieceId;
  if(!counterActionStatus(state,id)[a==='board-activate-ap'?'ap':'medicine'].ok){notify('That Band cannot activate right now.',true);return;}
  
  stateUI.medicinePendingBandId=null;
  commit({type:'ACTIVATE_BAND',id,mode:a==='board-activate-ap'?'ap':'rancheria',ack:false});return;
 }
 if(a==='board-move-selected'){
  const status=boardMoveStatus(state,stateUI.digitalSelectedPieceId,d.to);
  if(!status.ok){notify(status.reason,true);return;}
  stateUI.selectedSpace=d.to;stateUI.digitalSelectedPieceId=state.activeBandId;commit({type:'MOVE_BAND',to:d.to});return;
 }
 if(a==='board-correct-piece'){
  if(!state.pieces.some(p=>p.id===stateUI.digitalSelectedPieceId))return;
  openModal('move-piece',stateUI.digitalSelectedPieceId);return;
 }
 if(a==='digital-clear'){stateUI.digitalSelectedPieceId=null;render();return;}
 
 if(a==='finish-war-countermeasure'){commit({type:'WAR_FINISH_COUNTERMEASURE',warId:d.warId,rancheriaId:d.rancheria});return;}if(a==='finish-war-decline'){commit({type:'WAR_FINISH_COUNTERMEASURE',decline:true});return;}
 if(a==='war-surprise-attack'){commit({type:'WAR_SURPRISE_ATTACK'});return;}if(a==='war-fast-column'){commit({type:'WAR_FAST_COLUMN'});return;}if(a==='steal-mounts'){commit({type:'WAR_STEAL_MOUNTS',warId:d.warId,mp:Number(d.mp)});return;}if(a==='travois-decline'){commit({type:'WAR_TRAVOIS',decline:true});return;}if(a==='travois-move'){commit({type:'WAR_TRAVOIS',rancheriaId:d.rancheria,to:d.to});return;}
 if(a==='apply-war-event'){commit({type:'WAR_EVENT_RESOLVE',card:d.card});return;}
 if(a==='digital-draw-card'){if(stateUI.digitalDeck==='War'){choose('operations');return;}commit({type:'DIGITAL_CARD_DRAW',kind:stateUI.digitalDeck,zone:({War:'War Event',Culture:'Hand',History:'In play',Development:'Display'})[stateUI.digitalDeck]});return;}
 if(a==='digital-draw-cup'){commit({type:'DIGITAL_CUP_DRAW',all:false});return;}
 if(a==='digital-draw-all'){commit({type:'DIGITAL_CUP_DRAW',all:true});return;}

 if(a==='choose-counter-art'){stateUI.selectedCounterArt=d.name;render();return;}
 if(a==='apply-counter-art'){
  const type=val('counter-map-type');if(!counterArtTargets().some(x=>x[0]===type)||!stateUI.selectedCounterArt)return;
  assignCounterArt(type,stateUI.selectedCounterArt).then(()=>{notify('Counter image assigned to '+type+' locally.');render();}).catch(e=>notify(e.message,true));return;
 }
 if(a==='remove-counter-art'){
  const type=val('counter-map-type');if(!counterArtTargets().some(x=>x[0]===type))return;
  unassignCounterArt(type).then(()=>{notify('Removed '+type+' artwork mapping.');render();}).catch(e=>notify(e.message,true));return;
 }
 if(a==='choose-tts-folder'){document.getElementById('tts-unified-picker')?.click();return;}if(a==='nav-assets'){const drawer=document.querySelectorAll('.board-drawer')[2];if(drawer){drawer.open=true;drawer.scrollIntoView({block:'start'});}return;}if(a==='toggle-counter-gallery'){stateUI.showCounterGallery=!stateUI.showCounterGallery;render();if(stateUI.showCounterGallery)void updateCounterGallery();return;}if(a==='counter-gallery-next'){stateUI.counterGalleryPage++;void updateCounterGallery();return;}if(a==='counter-gallery-prev'){stateUI.counterGalleryPage=Math.max(0,stateUI.counterGalleryPage-1);void updateCounterGallery();return;}if(a==='nav-digital'){const drawer=document.querySelector('.board-drawer');if(drawer){drawer.open=true;drawer.scrollIntoView({block:'start'});}return;}if(a==='nav-cards'){const drawer=document.querySelectorAll('.board-drawer')[2];if(drawer){drawer.open=true;drawer.scrollIntoView({block:'start'});}return;}if(a==='dismiss-toast'){stateUI.toasts='';renderToast();return;}
 if(a==='close-modal'){closeModal();return;}
 if(a==='undo'){undo();return;}if(a==='redo'){redo();return;}if(a==='export'){exportGame();return;}
 if(a==='export-map'){exportMapConnections();return;}
 if(a==='route-next'){commit({type:'MOVE_BAND',to:d.to});return;}
 if(a==='war-move-cancel'){commit({type:'WAR_MOVE_CANCEL'});return;}
 if(a==='modal-add-piece'){openModal('add-piece');return;}if(a==='modal-add-here'){openModal('add-piece','here');return;}
 if(a==='edit-piece'){openModal('edit-piece',d.id);return;}if(a==='modal-move-piece'){openModal('move-piece',stateUI.modalId);return;}
 if(a==='modal-edge'){stateUI.edgeStart=d.from||null;stateUI.edgeTarget=d.to||null;openModal('edge');return;}if(a==='modal-move-band'){openModal('move-band');return;}
 if(a==='modal-trade'){openModal('trade');return;}if(a==='modal-resolve-raid'){openModal('resolve-raid');return;}
 if(a==='modal-start-success-check'){openModal('start-success-check');return;}
 if(a==='cancel-success-check'){if(confirmed('Return every staged counter to the physical draw cup?'))commit({type:'CANCEL_SUCCESS_CHECK'});return;}
 if(a==='modal-add-card'){openModal('add-card');return;}if(a==='edit-card'){openModal('edit-card',d.id);return;}if(a==='go-journal'){choose('journal');return;}if(a==='go-pieces'){choose('pieces');return;}
 if(a==='delete-piece'){if(confirmed('Delete the counter entry from this tracker? This is a ledger correction, not a game action.')){commit({type:'DELETE_PIECE',id:d.id});closeModal();}return;}
 if(a==='delete-edge'){if(confirmed('Remove this recorded connection?'))commit({type:'DELETE_EDGE',a:d.a,b:d.b});return;}
 if(a==='delete-card'){if(confirmed('Delete this card entry?'))commit({type:'DELETE_CARD',id:d.id});return;}
 if(a==='map-review-space'){if(confirmed('Have you examined every solid and dashed printed-map connection touching '+d.id+' and recorded all of them here? This is a personal verification, not an official map transcription.'))commit({type:'MAP_REVIEW_SPACE',space:d.id,ack:true});return;}
 if(a==='enemy-select'){commit({type:'ENEMY_SELECT'});return;}
 if(a==='map-toggle-reach'){stateUI.mapShowReach=!stateUI.mapShowReach;render();return;}
 if(a==='map-zoom-in'){stateUI.mapZoom=Math.min(2,Math.round((stateUI.mapZoom+.25)*100)/100);render();return;}
 if(a==='map-zoom-out'){stateUI.mapZoom=Math.max(1,Math.round((stateUI.mapZoom-.25)*100)/100);render();return;}
 if(a==='map-connect'){stateUI.mapConnectMode=!stateUI.mapConnectMode;stateUI.edgeStart=stateUI.mapConnectMode?stateUI.selectedSpace:null;stateUI.edgeTarget=null;render();return;}
 if(a==='board-move-band'){if(!state.activeBandId||!boardMoveStatus(state,state.activeBandId,d.to).ok){notify('This destination is not a valid current move.',true);return;}commit({type:'MOVE_BAND',to:d.to});return;}
 if(a==='select-space'){
   if(!SPACE[d.id])return;
   if(!stateUI.mapConnectMode&&stateUI.digitalSelectedPieceId){
     const options=selectedCounterMapActions(stateUI.digitalSelectedPieceId).filter(option=>option.to===d.id);
     if(options.length===1){stateUI.selectedSpace=d.id;commit(options[0].command);return;}
     if(options.length>1){stateUI.selectedSpace=d.id;stateUI.targetMoveChoices=options;stateUI.playerPanel='target';render();return;}

     const piece=state.pieces.find(p=>p.id===stateUI.digitalSelectedPieceId);
     if(!piece){stateUI.digitalSelectedPieceId=null;render();return;}
     if(piece.type==='Band'&&piece.id===state.activeBandId&&piece.location!==d.id){
       const legal=boardMoveStatus(state,piece.id,d.id);
       if(legal.ok){stateUI.selectedSpace=d.id;commit({type:'MOVE_BAND',to:d.id});return;}
       // Inspect destination without moving if it is not legal; never bypass rules.
       stateUI.selectedSpace=d.id;render();notify(legal.reason,true);return;
     }
   }
   if(stateUI.mapConnectMode && d.id!==stateUI.edgeStart){stateUI.edgeTarget=d.id;stateUI.mapConnectMode=false;openModal('edge');return;}
   stateUI.selectedSpace=d.id;if(stateUI.mapConnectMode)stateUI.edgeStart=d.id;
   else if(bandMovementOverlay(state,state.activeBandId))stateUI.routeTarget=d.id;
   render();return;
 }
 if(a==='modal-cleanup-trail'){openModal('cleanup-trail');return;}
 if(a==='guided-band-choice'){const c=activeBandChoices(state).find(x=>x.id===d.guidedId);if(c)commit(c.command);else notify('That action is no longer legal.',true);return;}
 if(a==='board-history-verdict'){
   if(!state.victoryPending)return;
   const audit=historyObjectiveAudit(state);
   if(audit.history!=='H4'&&audit.result!=='unknown'&&!audit.uncertainTerritories?.length&&
       (d.verdict==='met')!==(audit.result==='met')){notify('The verified board ledger contradicts that result. Review the map before continuing.',true);return;}
   const v=boardHistoryVerification(nextPlayerPrompt(state));stateUI.historyVerification.met=d.verdict==='met';stateUI.historyVerification.stage=0;render();return;
 }
 if(a==='board-history-step'){
   if(!state.victoryPending||!stateUI.historyVerification?.met)return;
   if(stateUI.historyVerification.stage<2){stateUI.historyVerification.stage++;render();return;}
   const audit=historyObjectiveAudit(state);
   stateUI.modal=null;commit({type:'RESOLVE_VICTORY',met:true,ack:true,transitionAck:true,objectiveNote:`Player verified ${audit.history} printed objective, removed old cards, revealed the next History Card, and applied its printed transition effects.`});stateUI.historyVerification=null;return;
 }
 if(a==='board-history-back'){
   if(!state.victoryPending)return;
   if(stateUI.historyVerification?.stage>0)stateUI.historyVerification.stage--;
   else stateUI.historyVerification.met=null;
   render();return;
 }
 if(a==='board-history-commit'){
   if(!state.victoryPending||stateUI.historyVerification?.met===null)return;
   const audit=historyObjectiveAudit(state),met=stateUI.historyVerification.met;
   stateUI.modal=null;commit({type:'RESOLVE_VICTORY',met,ack:true,objectiveNote:`Player verified ${audit.history} printed objective against the original board and active History Card.`});stateUI.historyVerification=null;return;
 }
 if(a==='director-choice'){stateUI.tabletopChoices=false;const p=nextPlayerPrompt(state),c=p.choices?.[Number(d.choiceIndex)];if(p.kind==='player'&&c?.command){if(c.command.type==='OPERATIONS_DIGITAL_ROLL'){if(confirm('Have you checked that no active printed card changes the Operations track procedure?'))commit({...c.command,ack:true});}else commit(c.command);}return;}if(a==='director-auto'){const p=nextPlayerPrompt(state);if(p.kind==='automatic'&&p.command)commit(p.command);return;}if(a==='select-operation'){commit({type:'SELECT_OPERATION',value:d.value});return;}
 if(a==='passage-retirement-done'){commit({type:'PASSAGE_FINISH_RETIREMENT'});return;}
 if(a==='passage-death'){commit({type:'PASSAGE_AUTO_HEADMAN_DEATH'});return;}
 if(a==='passage-replace'){commit({type:'PASSAGE_AUTO_REPLACE_MAHIMIANA'});return;}
 if(a==='passage-unfinish'){commit({type:'PASSAGE_UNFINISH_BANDS'});return;}
 if(a==='passage-finish-resources'){commit({type:'PASSAGE_FINISH_RESOURCES'});return;}
 if(a==='passage-success'){commit({type:'PASSAGE_RESTORE_SUCCESS'});return;}
 if(a==='passage-auto-resources'){commit({type:'PASSAGE_AUTO_RESOURCES'});return;}
 if(a==='passage-auto-peace'){commit({type:'PASSAGE_AUTO_PEACE'});return;}
 if(a==='passage-auto-bison'){commit({type:'PASSAGE_AUTO_BISON'});return;}
 if(a==='passage-bison-select'){commit({type:'PASSAGE_BISON_SELECT'});return;}
 if(a==='passage-finish-bison'){commit({type:'PASSAGE_FINISH_BISON'});return;}
 if(a==='passage-finish-peace'){commit({type:'PASSAGE_FINISH_PEACE'});return;}
 if(a==='passage-ravaged'){commit({type:'PASSAGE_CLEAR_RAVAGED'});return;}
 if(a==='check'){commit({type:'CHECK',key:d.key,value:d.value});return;}
 if(a==='advance'){commit({type:'ADVANCE'});return;}
 if(a==='start'){commit({type:'START'});return;}
 if(a==='apply-map-evidence'){commit({type:'APPLY_MAP_EVIDENCE'});return;}
 if(a==='map-documentation'){window.open(MAP_EVIDENCE_URL,'_blank','noopener');return;}
 if(a==='setup-load-selected'){
   const selected=document.querySelector('input[name="scenario-preset"]:checked')?.value;
   if(selected&&confirmed('Prepare '+SCENARIOS.find(x=>x[0]===selected)?.[1]+'? This loads an official starting ledger.'))commit({type:'APPLY_SCENARIO_SETUP',scenario:selected});return;
 }
 if(a==='setup-dev-roll'){commit({type:'SETUP_DOWNFALL_DEVELOPMENT_ROLL'});return;}
 if(a==='setup-dev-reroll'){commit({type:'SETUP_DOWNFALL_DEVELOPMENT_REROLL'});return;}
 if(a==='setup-dev-commit'){commit({type:'SETUP_DOWNFALL_DEVELOPMENT_COMMIT'});return;}
 if(a==='setup-digital-bison'){commit({type:'SETUP_DOWNFALL_ROLL_BISON'});return;}
 if(a==='setup-audit-ledger'){commit({type:'SETUP_AUDIT_LEDGER'});return;}
 if(a==='setup-allocate-band'){if(state.scenario!=='downfall'||state.setupConfirmed.resources)return;commit({type:'SETUP_DOWNFALL_PLACE_BAND',bandId:d.id,rancheria:d.ranch});return;}
 if(a==='setup-pick-culture'){commit({type:'SETUP_CULTURE_CARD',cultureId:d.cultureId});return;}
 if(a==='setup-buy-culture'){commit({type:'SETUP_CULTURE_CARD',cultureId:val('setup-culture-choice')});return;}
 if(a==='setup-finish-culture'){commit({type:'SETUP_CULTURE_FINISH'});return;}
 if(a==='setup-finish-development'){commit({type:'SETUP_FINISH_DEVELOPMENT'});return;}
 if(a==='apply-opening-template'){if(confirmed('Load the verified opening template? Existing track values will be reset to the official starting values.'))commit({type:'APPLY_OPENING_TEMPLATE'});return;}
 if(a==='roll-one'){commit({type:'ROLL_DICE',count:1});return;}
 if(a==='roll-two'){commit({type:'ROLL_DICE',count:2});return;}
 if(a==='activate-band'){commit({type:'ACTIVATE_BAND',id:val('activate-band-id'),mode:val('activate-mode'),ack:$('activate-ack')?.checked});return;}
 if(a==='enemy-prepare-free'){commit({type:'ENEMY_PREPARE',kind:'free'});return;}
 if(a==='enemy-prepare-paid'){commit({type:'ENEMY_PREPARE',kind:'paid'});return;}
 if(a==='enemy-roll-display'){
   const sel=state.enemySelection;
   if(!sel?.enemy){notify('Confirm the printed History Card Enemy first.',true);return;}
   commit({type:'ENEMY_BEGIN',kind:sel.kind,die:sel.die,enemy:sel.enemy,ack:true});return;
 }
 if(a==='enemy-roll-settle-origin'){commit({type:'ENEMY_SETTLE_ROLL_ORIGIN'});return;}
 if(a==='enemy-complete-resolved'){commit({type:'ENEMY_AUTO_COMPLETE'});return;}
 if(a==='enemy-auto-progress'){commit({type:'ENEMY_AUTO_PROGRESS'});return;}
 if(a==='enemy-auto-culture'){commit({type:'ENEMY_AUTO_CULTURE_ATTACK'});return;}
 if(a==='development-louisiana-cleanup'){commit({type:'DEVELOPMENT_LOUISIANA_CLEANUP'});return;}
 if(a==='development-american-traders'){commit({type:'DEVELOPMENT_AMERICAN_TRADERS_CLEANUP'});return;}
 if(a==='development-buffalo-start'){commit({type:'DEVELOPMENT_BUFFALO_START'});return;}
 if(a==='development-moon-prepare'){commit({type:'DEVELOPMENT_MOON_PREPARE'});return;}
 if(a==='development-play-mounted'){commit({type:'DEVELOPMENT_PLAY_MOUNTED_SOCIETY'});return;}
 if(a==='development-mounted-finish'){commit({type:'DEVELOPMENT_MOUNTED_FINISH'});return;}
 if(a==='development-mounts-counting-reroll'){commit({type:'DEVELOPMENT_COUNTING_COUP_MOUNTS_REROLL'});return;}
 if(a==='development-mounts-resolve'){commit({type:'DEVELOPMENT_QUALITY_MOUNTS_RESOLVE'});return;}
 if(a==='development-ute-counting-reroll'){commit({type:'DEVELOPMENT_COUNTING_COUP_UTE_REROLL'});return;}
 if(a==='development-counting-redraw'){commit({type:'DEVELOPMENT_COUNTING_COUP_REDRAW'});return;}
 if(a==='development-counting-reroll'){commit({type:'DEVELOPMENT_COUNTING_COUP_REROLL'});return;}
 if(a==='development-counting-tactical-reroll'){commit({type:'DEVELOPMENT_COUNTING_COUP_TACTICAL_REROLL'});return;}
 if(a==='development-play-skillful'){commit({type:'DEVELOPMENT_PLAY_SKILLFUL'});return;}
 if(a==='development-play-tactical'){commit({type:'DEVELOPMENT_TACTICAL'});return;}
 if(a==='development-play-anza'){commit({type:'DEVELOPMENT_PLAY_ANZA'});return;}
 if(a==='development-play-vibrant'){commit({type:'DEVELOPMENT_PLAY_VIBRANT_POPULATION'});return;}
 if(a==='development-play-long-raid'){commit({type:'DEVELOPMENT_PLAY_LONG_RAID'});return;}
 if(a==='development-great-hunt-hand'){commit({type:'DEVELOPMENT_GREAT_HUNT_HAND'});return;}
 if(a==='development-great-hunt-play'){commit({type:'DEVELOPMENT_GREAT_HUNT_PLAY'});return;}
 if(a==='development-play-no-relief'){commit({type:'DEVELOPMENT_PLAY_NO_RELIEF'});return;}
 if(a==='development-epidemic-end'){commit({type:'DEVELOPMENT_EPIDEMIC_END'});return;}
 if(a==='development-auto-reveal'){commit({type:'DEVELOPMENT_AUTO_REVEAL'});return;}
 if(a==='development-take-verified'){commit({type:'DEVELOPMENT_TAKE_VERIFIED_HAND',number:d.number});return;}
 if(a==='development-ute-hand'){commit({type:'DEVELOPMENT_TAKE_HAND'});return;}
 if(a==='finish-band'){commit({type:'FINISH_BAND'});return;}
 if(a==='horse-mp'){commit({type:'SPEND_HORSE'});return;}
 if(a==='hunt'){commit({type:'HUNT'});return;}
 if(a==='raid'){commit({type:'BEGIN_RAID'});if(state.pending)openModal('resolve-raid');return;}
 if(a==='cancel-raid'){commit({type:'CANCEL_RAID'});closeModal();return;}
 if(a==='adjust-track'){commit({type:'TRACK',field:d.field,value:Math.max(0,state.tracks[d.field]+Number(d.delta))});return;}
 if(a==='track-input'){commit({type:'TRACK',field:d.field,value:val('track-'+d.field)});return;}
 if(a==='culture-decline'){commit({type:'PASSAGE_CULTURE_DECLINE'});return;}
 if(a==='toggle-mandatory'){commit({type:'FLAG',field:'mustPassage',value:!state.mustPassage});return;}
 if(a==='toggle-santafe'){commit({type:'FLAG',field:'santaFe',value:!state.flags.santaFe});return;}
 if(a==='apply-scenario'){commit({type:'SET_SCENARIO',value:val('scenario-select')});return;}
 if(a==='set-period'){commit({type:'PERIOD',value:val('period-value')});return;}
 if(a==='save-notes'){commit({type:'NOTE',value:val('game-notes')});return;}

 if(a==='new-blank'){newSession(false);return;}if(a==='demo'){newSession(true);return;}
}
function submitForm(e){if(!(e.target instanceof HTMLFormElement))return;const f=e.target;
 if(f.matches('.stock-count-form')){
  e.preventDefault();const data=new FormData(f);
  commit({type:'SET_STOCK_TOTAL',key:f.dataset.stockKey,total:Number(data.get('total')),ack:data.get('ack')==='on'});return;
 }
const formId=f.getAttribute('id')||(f.matches('.rancheria-sacrifice-form')?'rancheria-sacrifice-form':f.matches('.rancheria-fight-form')?'rancheria-fight-form':null);if(!['setup-downfall-bison-form','setup-downfall-rancherias-form','setup-downfall-resources-form','setup-downfall-medicine-form','setup-downfall-development-form','piece-form','move-piece-form','edge-form','move-band-form','trade-form','raid-form','card-form','limit-form','rng-form','physical-dice-form','culture-form','operations-check-form','operation-override-form','loss-form','start-check-form','check-draw-form','check-finish-form','guns-cancel-form','trade-goods-redraw-form','rancheria-sacrifice-form','rancheria-fight-form','battle-roll-form','battle-counting-coup-form','battle-reconcile-form','battle-close-form','battle-exception-form','war-auto-move-form','war-move-begin-form','war-move-step-form','war-move-finish-form','enemy-reset-form','enemy-begin-form','enemy-staged-history-form','enemy-pay-form','enemy-recover-form','enemy-subjugate-form','enemy-settle-form','enemy-culture-attack-form','enemy-hunt-form','enemy-encroach-form','enemy-ally-form','enemy-peace-form','enemy-peace-war-form','enemy-war-raid-form','enemy-card-exception-form','enemy-confirm-form','enemy-finish-form','passage-finish-form','passage-prominent-form','passage-resource-form','passage-peace-form','passage-bison-form','victory-check-form','development-reveal-form','development-confirm-form','development-ute-form','development-ute-resolve-form','development-comancheros-form','development-siege-form','development-mounted-move-form','development-negotiation-form','development-french-traders-form','development-epidemic-form','development-smallpox-form','development-horse-loss-form','development-buffalo-form','development-gift-giving-form','development-quality-mounts-form','development-nuevo-form','development-ute-displacement-form','development-medicine-form','development-kiowa-form','culture-purchase-form','culture-diplomacy-peace-form','cleanup-trail-form','cleanup-cup-effect-form','raid-cup-effect-form','raid-cup-guided-hunt-form','cleanup-cup-guided-hunt-form','raid-cup-guided-encroach-form','cleanup-cup-guided-encroach-form','raid-cup-settle-form','cleanup-cup-settle-form','raid-cup-subjugate-form','cleanup-cup-subjugate-form','raid-cup-war-raid-form','cleanup-cup-war-raid-form'].includes(formId))return;e.preventDefault();const v=Object.fromEntries(new FormData(f).entries());
 if(formId==='setup-downfall-bison-form'){
  commit({type:'SETUP_DOWNFALL_BISON',spaces:Array.from({length:9},(_,i)=>v['bison'+i])});return;
 }
 if(formId==='setup-downfall-rancherias-form'){
  commit({type:'SETUP_DOWNFALL_RANCHERIAS',spaces:{A:v.A,B:v.B,C:v.C}});return;
 }
 if(formId==='setup-downfall-resources-form'){
  const bands=state.pieces.filter(p=>p.type==='Band'&&p.id.startsWith('setup-downfall-band'));
  if(bands.some(p=>!/^box:setup-ranch-[ABC]$/.test(p.location))){notify('Assign every Band counter to a Ranchería first.',true);return;}
  const allocation={};for(const letter of 'ABC')allocation[letter]={band2:bands.filter(p=>p.strength===2&&p.location===`box:setup-ranch-${letter}`).length,band1:bands.filter(p=>p.strength===1&&p.location===`box:setup-ranch-${letter}`).length,horses:v[letter+'-horses'],trade:v[letter+'-trade']};
  commit({type:'SETUP_DOWNFALL_RESOURCES',allocation});return;
 }
 if(formId==='setup-downfall-medicine-form'){
  const medicine={};for(const letter of 'ABC')for(const type of ['paraibo','mahimiana'])medicine[letter+'-'+type]=v[letter+'-'+type];
  commit({type:'SETUP_DOWNFALL_MEDICINE',medicine});return;
 }
 if(formId==='setup-downfall-development-form'){
  commit({type:'SETUP_DOWNFALL_DEVELOPMENT',die:v.die,tradeGoodsSpent:v.spent?1:0});return;
 }
 if(formId==='culture-diplomacy-peace-form'){commit({type:'PLANNING_HEADMAN_ACTION',action:'diplomacy-place',rancheriaId:v.rancheriaId,instructionId:v.instructionId,to:v.to,routeNote:v.routeNote,ack:Boolean(v.ack)});return;}
 if(formId==='culture-purchase-form'){commit({type:'PASSAGE_CULTURE_PURCHASE',cultureId:v.cultureId});return;}
 if(formId==='development-reveal-form'){commit({type:'DEVELOPMENT_REVEAL',id:v.id});return;}
 if(formId==='development-physical-stock-form'){commit({type:'DEVELOPMENT_REGISTER_PHYSICAL_STOCK',ack:Boolean(v.ack)});return;}
 if(formId==='development-texas-stock-form'){commit({type:'DEVELOPMENT_REGISTER_TEXAS_STOCK',ack:Boolean(v.ack)});return;}
 if(formId==='development-confirm-form'){commit({type:'DEVELOPMENT_CONFIRM_EFFECT',id:v.id,note:v.note,ack:Boolean(v.ack)});return;}
 if(formId==='development-ute-resolve-form'){commit({type:'DEVELOPMENT_UTE_RESOLVE',targetId:v.targetId});return;}
 if(formId==='development-ute-form'){commit({type:'DEVELOPMENT_PLAY_UTE',choice:v.choice,space:v.space});return;}
 if(formId==='development-kiowa-form'){commit({type:'DEVELOPMENT_RESOLVE_KIOWA',tribeId:v.tribeId,rancheriaId:v.rancheriaId,bandId:v.bandId,horseIds:new FormData(f).getAll('horseId')});return;}
 if(formId==='development-medicine-form'){commit({type:'DEVELOPMENT_RESOLVE_MEDICINE',mahimianaId:v.mahimianaId});return;}
 if(formId==='development-ute-displacement-form'){commit({type:'DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT',space:v.space});return;}
 if(formId==='development-nuevo-form'){commit({type:'DEVELOPMENT_NUEVO_APACHERIA',tribeId:v.tribeId,space:v.space});return;}
 if(formId==='development-quality-mounts-form'){commit({type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:v.bonus});return;}
 if(formId==='development-gift-giving-form'){commit({type:'DEVELOPMENT_GIFT_GIVING',rancheriaId:v.rancheriaId});return;}
 if(formId==='development-buffalo-form'){commit({type:'DEVELOPMENT_BUFFALO_RESOLVE',bisonId:v.bisonId});return;}
 if(formId==='development-horse-loss-form'){commit({type:'DEVELOPMENT_RESOLVE_HORSE_DISCARD',horseIds:new FormData(f).getAll('horseId')});return;}
 if(formId==='development-smallpox-form'){commit({type:'DEVELOPMENT_RESOLVE_SMALLPOX',bandId:v.bandId});return;}
 if(formId==='battle-counting-coup-form'){commit({type:'DEVELOPMENT_COUNTING_COUP_BATTLE_REROLL',dieIndex:Number(v.dieIndex)});return;}
 if(formId==='development-epidemic-form'){const bandChoices=Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith('choice_')).map(([k,id])=>[k.slice(7),id]));commit({type:'DEVELOPMENT_RESOLVE_EPIDEMIC',bandChoices});return;}
 if(formId==='development-mounted-move-form'){commit({type:'PLANNING_MOVE_RANCHERIA',rancheriaId:v.rancheriaId,to:v.to,transit:Boolean(v.transit)});return;}
 if(formId==='development-siege-form'){commit({type:'DEVELOPMENT_PLAY_SIEGE',tribeIds:v.second?[v.first,v.second]:[v.first]});return;}
 if(formId==='development-negotiation-form'){commit({type:'DEVELOPMENT_PLAY_NEGOTIATION',warId:v.warId,headmanRancheriaId:v.headmanRancheriaId});return;}
 if(formId==='development-french-traders-form'){commit({type:'DEVELOPMENT_PLAY_FRENCH_TRADERS',resourceIds:v.second?[v.first,v.second]:[v.first]});return;}
 if(formId==='development-comancheros-form'){commit({type:'DEVELOPMENT_COMANCHEROS',rancheriaId:v.rancheriaId});return;}
 if(formId==='passage-retire-form'){commit({type:'PASSAGE_RETIRE_MAHIMIANA',mahimianaId:v.mahimianaId});return;}
 if(formId==='passage-prominent-form'){commit({type:'PASSAGE_PLAY_PROMINENT_HEADMAN',headmanId:v.headmanId});return;}
 if(formId==='passage-quanah-form'){commit({type:'PASSAGE_SELECT_QUANAH_EXEMPTION',mahimianaId:v.mahimianaId});return;}
 if(formId==='passage-bison-form'){commit({type:'PASSAGE_BISON_RESOLVE',action:v.action,bisonId:v.bisonId,destination:v.destination});return;}
 if(formId==='passage-peace-form'){commit({type:'PASSAGE_PEACE_ROLL',pieceId:v.pieceId,die:v.die});return;}
 if(formId==='passage-resource-form'){commit({type:'PASSAGE_TRANSFER_RESOURCE',pieceId:v.pieceId,rancheriaId:v.rancheriaId});return;}
 if(formId==='passage-finish-form'){commit({type:'PASSAGE_FINISH',die:v.die||null,ack:Boolean(v.ack)});return;}
 if(formId==='victory-check-form'){commit({type:'RESOLVE_VICTORY',met:v.met==='yes',objectiveNote:v.objectiveNote,ack:Boolean(v.ack),transitionAck:Boolean(v.transitionAck)});return;}
 if(formId==='piece-form'){
  if(stateUI.modal==='edit-piece'){commit({type:'EDIT_PIECE',id:stateUI.modalId,patch:{label:v.label,owner:v.owner,subtype:v.subtype,strength:v.strength,...(v.mpRating!==undefined?{mpRating:v.mpRating}:{}),notes:v.notes,finished:v.finished==='true'}});}
  else commit({type:'ADD_PIECE',piece:v});
 }else if(formId==='move-piece-form'){commit({type:'MOVE_PIECE',id:stateUI.modalId,location:v.location});}
 else if(formId==='edge-form'){if(!v.verified){notify('Confirm the map connection was checked on the printed board.',true);return;}commit({type:'ADD_EDGE',a:v.a,b:v.b,kind:v.kind,enemyColor:v.enemyColor});}
 else if(formId==='move-band-form')commit({type:'MOVE_BAND',to:v.to});
 else if(formId==='trade-form')commit({type:'TRADE',resourceId:v.resourceId,receive:v.receive});
 else if(formId==='raid-form')commit({type:'RESOLVE_RAID',successes:v.successes,horses:v.horses,ack:Boolean(v.ack),keepMoon:Boolean(v.keepMoon)});
 else if(formId==='card-form')commit(stateUI.modal==='edit-card'?{type:'EDIT_CARD_DETAILS',id:stateUI.modalId,...v}:{type:'ADD_CARD',...v});
 else if(formId==='limit-form'){commit({type:'LIMIT',pieceType:v.pieceType,subtype:v.subtype,value:v.value});return;}
 else if(formId==='rng-form'){commit({type:'SEED_RNG',seed:v.seed});return;}
 else if(formId==='physical-dice-form'){commit({type:'RECORD_DICE',rolls:v.rolls.split(',').map(x=>x.trim())});return;}
 else if(formId==='culture-form'){commit({type:'CULTURE_GAIN',controlled:new FormData(f).getAll('controlled'),reason:v.reason,ack:Boolean(v.ack)});return;}
 else if(formId==='operations-check-form'){commit({type:'OPERATIONS_ROLL',die:v.die,ack:Boolean(v.ack)});return;}
 else if(formId==='loss-form'){commit({type:'LOSE_POINTS',field:v.field,amount:v.amount,reason:v.reason});return;}
 else if(formId==='start-check-form'){commit({type:'START_SUCCESS_CHECK',medicine:v.medicine,die:v.die,digitalDie:v.diceMode==='digital',ack:Boolean(v.ack)});if(!stateUI.toastError)closeModal();return;}
 else if(formId==='check-draw-form'){commit({type:'RECORD_SUCCESS_DRAW',id:v.id});return;}
 else if(formId==='check-finish-form'){commit({type:'FINISH_SUCCESS_CHECK',instructionNote:v.instructionNote,ack:Boolean(v.ack)});return;}
 else if(formId==='guns-cancel-form'){commit({type:'GUNS_CANCEL_AP',counterId:v.counterId,gunId:v.gunId,die:v.die,digitalDie:v.diceMode==='digital'});return;}
 else if(formId==='trade-goods-redraw-form'){commit({type:'TRADE_GOODS_REDRAW',resourceId:v.resourceId,digital:true,ack:Boolean(v.ack)});return;}
 else if(formId==='rancheria-fight-form'){commit({type:'WAR_RANCHERIA_FIGHT',rancheriaId:f.dataset.rancheriaId,ack:Boolean(v.ack)});return;}
 else if(formId==='rancheria-sacrifice-form'){commit({type:'WAR_RANCHERIA_SACRIFICE',rancheriaId:f.dataset.rancheriaId,northTribeId:v.northTribeId,northNearestConfirmed:Boolean(v.northNearestConfirmed),ack:Boolean(v.ack)});return;}
 else if(formId==='battle-roll-form'){const digital=e.submitter?.value==='digital';commit({type:digital?'BATTLE_DIGITAL_ROLL':'BATTLE_ROLL',warId:v.warId,unitId:v.unitId,gunId:v.gunId,mahimianaId:v.mahimianaId,...(digital?{}:{dice:String(v.dice||'').split(',').map(x=>x.trim())}),warDrm:v.warDrm,cardDrm:v.cardDrm,cardReason:v.cardReason,ack:Boolean(v.ack)});return;}
 else if(formId==='battle-reconcile-form'){commit({type:'BATTLE_RECONCILE',note:v.note,ack:Boolean(v.ack),lossConfirmed:Boolean(v.lossConfirmed)});return;}
 else if(formId==='battle-close-form'){commit({type:'BATTLE_CLOSE_OVERRIDE',reason:v.reason,ack:Boolean(v.ack)});return;}
 else if(formId==='battle-exception-form'){commit({type:'BATTLE_NO_COMBAT_OVERRIDE',warId:v.warId,reason:v.reason,ack:Boolean(v.ack)});return;}
 else if(formId==='operation-override-form'){commit({type:'MANUAL_OPERATION_OVERRIDE',key:v.key,reason:v.reason});return;}
 else if(formId==='war-auto-move-form'){commit({type:'WAR_AUTO_MOVE',card:v.card});return;}
 else if(formId==='war-move-begin-form'){commit({type:'WAR_MOVE_BEGIN',warId:v.warId,allowed:v.allowed,card:v.card,ack:Boolean(v.ack)});return;}
 else if(formId==='war-move-step-form'){commit({type:'WAR_MOVE_STEP',to:v.to,cardOverride:Boolean(v.cardOverride),overrideReason:v.overrideReason,ack:Boolean(v.ack)});return;}
 else if(formId==='war-move-finish-form'){commit({type:'WAR_MOVE_FINISH',reason:v.reason,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-staged-history-form'){
  const sel=state.enemySelection;
  if(!sel||!v.ack)return;
  commit({type:'ENEMY_BEGIN',kind:sel.kind,enemy:v.enemy,die:sel.die,ack:true});return;
 }
 else if(formId==='enemy-begin-form'){commit({type:'ENEMY_BEGIN',kind:v.kind,enemy:v.enemy,die:v.die,historyOverride:v.historyOverride,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-verify-face-form'){commit({type:'ENEMY_VERIFY_FACE',kind:v.kind,cost:v.cost,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-pay-form'){commit({type:'ENEMY_PAY',counterIds:new FormData(f).getAll('counterId'),trackSpent:v.trackSpent});return;}
 else if(formId==='enemy-recover-form'){commit({type:'ENEMY_RECOVER',ravagedId:v.ravagedId,die:v.die,criterion:v.criterion,success:v.success==='yes',randomConfirmed:Boolean(v.randomConfirmed),ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-subjugate-form'){commit({type:'ENEMY_SUBJUGATE',tribeId:v.tribeId,eastOrigin:v.eastOrigin||null,mapVerification:v.mapVerification,randomConfirmed:Boolean(v.randomConfirmed),unmappedRouteConfirmed:Boolean(v.unmappedRouteConfirmed),ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-settle-form'){commit({type:'ENEMY_SETTLE',settlementId:v.settlementId,space:v.space,eastOrigin:v.eastOrigin||null,mapVerification:v.mapVerification,randomConfirmed:Boolean(v.randomConfirmed),unmappedRouteConfirmed:Boolean(v.unmappedRouteConfirmed),bisonConfirmed:Boolean(v.bisonConfirmed),ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-encroach-form'){commit({type:'ENEMY_ENCROACH',die:v.die,order:TERRITORY_DIE_ORDER,tribeId:v.tribeId,space:v.space,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-hunt-form'){commit({type:'ENEMY_HUNT',die:v.die,order:TERRITORY_DIE_ORDER,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-ally-form'){commit({type:'ENEMY_ALLY',tribeId:v.tribeId,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-peace-form'){commit({type:'ENEMY_PEACE',ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-war-raid-form'){commit({type:'ENEMY_WAR_RAID',to:v.to,routeNote:v.routeNote,cardNote:v.cardNote,cardModifier:v.cardModifier??0,warCounterId:v.warCounterId,automaticWarFormation:v.automaticWarFormation==='true',tiedTribeIds:[...f.querySelectorAll('input[name=\"tiedTribeId\"]:checked')].map(x=>x.value),ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-peace-war-form'){commit({type:'ENEMY_PEACE_WAR',to:v.to,routeNote:v.routeNote,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-culture-attack-form'){commit({type:'ENEMY_CULTURE_ATTACK',ack:Boolean(v.ack)});return;}
 else if(/^(raid|cleanup)-cup-guided-(hunt|encroach)-form$/.test(formId)){const m=formId.match(/^(raid|cleanup)-cup-guided-(hunt|encroach)-form$/);commit({type:(m[1]==='raid'?'RAID':'CLEANUP')+'_CUP_GUIDED_'+m[2].toUpperCase(),die:v.die,order:TERRITORY_DIE_ORDER,tribeId:v.tribeId,space:v.space,ack:Boolean(v.ack)});return;}
 else if(/^(raid|cleanup)-cup-war-raid-form$/.test(formId)){
  const prefix=formId.startsWith('raid')?'RAID':'CLEANUP';
  commit({type:prefix+'_CUP_WAR_RAID',to:v.to,routeNote:v.routeNote,cardNote:v.cardNote,cardModifier:v.cardModifier??0,warCounterId:v.warCounterId,automaticWarFormation:v.automaticWarFormation==='true',tiedTribeIds:[...f.querySelectorAll('input[name="tiedTribeId"]:checked')].map(x=>x.value),ack:Boolean(v.ack)});return;
 }
 else if(/^(raid|cleanup)-cup-(settle|subjugate)-form$/.test(formId)){
   const prefix=formId.startsWith('raid')?'RAID':'CLEANUP';
   const kind=formId.includes('subjugate')?'SUBJUGATE':'SETTLE';
   commit({type:prefix+'_CUP_'+kind,tribeId:v.tribeId,settlementId:v.settlementId,space:v.space,eastOrigin:v.eastOrigin||null,mapVerification:v.mapVerification,randomConfirmed:Boolean(v.randomConfirmed),unmappedRouteConfirmed:Boolean(v.unmappedRouteConfirmed),bisonConfirmed:Boolean(v.bisonConfirmed),ack:Boolean(v.ack)});return;
 }
 else if(formId==='cleanup-cup-effect-form'||formId==='raid-cup-effect-form'){commit({type:formId==='raid-cup-effect-form'?'RAID_CUP_CONFIRM_EFFECT':'CLEANUP_CUP_CONFIRM_EFFECT',note:v.note,ack:Boolean(v.ack)});return;}
 else if(formId==='cleanup-trail-form'){commit({type:'CLEANUP_TRAIL_PLACE',to:v.to,ack:true});return;}
 else if(formId==='enemy-card-exception-form'){commit({type:'ENEMY_CARD_NO_EFFECT',ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-confirm-form'){commit({type:'ENEMY_CONFIRM',note:v.note,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-finish-form'){commit({type:'ENEMY_FINISH',overrideReason:v.overrideReason,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-reset-form'){commit({type:'ENEMY_RESET_DISPLAY',source:v.source,ack:Boolean(v.ack)});return;}
 if(stateUI.toasts&&!stateUI.toastError)closeModal();
}
function onChange(e){const t=e.target;if(t.id==='tts-unified-picker'){if(t.files?.length)void chooseLocalArtwork(t.files);t.value='';return;}if(t.id==='counter-map-type'){if(counterArtTargets().some(x=>x[0]===t.value))stateUI.counterArtType=t.value;return;}if(t.id==='reference-kind'){stateUI.referenceKind=t.value;stateUI.referenceSelected=CARD_REFERENCE.find(c=>c.kind===t.value)?.id||null;render();void displayLocalCard(stateUI.referenceSelected);}
 else if(t.id==='reference-card'){stateUI.referenceSelected=t.value;render();void displayLocalCard(t.value);}
 else if(t.id==='route-target'){stateUI.routeTarget=t.value;render();}
 else if(t.id==='battle-war-select'){stateUI.battleWarId=t.value;stateUI.battleUnitId=null;render();}
 else if(t.id==='battle-unit-select'){stateUI.battleUnitId=t.value;render();}
 else if(t.classList.contains('setup-confirm'))commit({type:'CONFIRM_SETUP',key:t.dataset.key,value:t.checked});
 else if(t.classList.contains('card-zone'))commit({type:'EDIT_CARD',id:t.dataset.id,zone:t.value});
 else if(t.classList.contains('card-evidence')){const source=prompt('Specific reference for this card (publisher PDF/page, or Tabletop Simulator asset ID):',state.cards.find(c=>c.id===t.dataset.id)?.sourceReference||'');if(source===null){render();return;}commit({type:'EDIT_CARD_EVIDENCE',id:t.dataset.id,evidenceStatus:t.value,sourceReference:source});}
 else if(t.id==='piece-filter'){stateUI.pieceFilter=t.value;const r=$('piece-results');if(r)r.innerHTML=piecesTable();}
 else if(t.id==='piece-type-filter'){stateUI.pieceType=t.value;const r=$('piece-results');if(r)r.innerHTML=piecesTable();}
}
if(typeof window.addEventListener==='function')window.addEventListener('storage',e=>{if(e.key===KEY&&hasStaleRevision(saveRevision,e.newValue)){stateUI.saveConflict=true;notify(SAVE_CONFLICT_MESSAGE,true);render();}});
document.addEventListener('toggle',e=>{if(e.target.matches?.('.board-drawer'))stateUI.drawers[e.target.dataset.drawer]=e.target.open;},true);
// The pointer drag is visual until the validated game command succeeds.
// It never writes piece locations directly, so save/undo and rule checks stay authoritative.
let pieceDrag=null;
let suppressPieceDragClickUntil=0;
function dragSpaceAt(x,y,svg){
 const hit=document.elementFromPoint(x,y)?.closest?.('.map-node[data-id]');
 if(hit&&svg.contains(hit))return hit.dataset.id;
 // Transparent printed-board areas are not always DOM hit targets. Resolve
 // only when close enough to the centre of an actual printed space.
 const ctm=svg.getScreenCTM();if(!ctm)return null;
 const p=new DOMPoint(x,y).matrixTransform(ctm.inverse());
 if(p.x<0||p.y<0||p.x>BOARD_WIDTH||p.y>BOARD_HEIGHT)return null;
 let winner=null,best=Infinity;
 for(const sp of SPACES){const pos=boardImageUrl()?boardImagePosition(sp.id):boardPosition(sp.id);if(!pos)continue;
  const d=Math.hypot(p.x-pos[0],p.y-pos[1]);if(d<best){winner=sp.id;best=d;}}
 return best<=31?winner:null;
}
function pointerPrintedCoordinates(svg,x,y){
 const ctm=svg?.getScreenCTM();if(!ctm)return null;
 const p=new DOMPoint(x,y).matrixTransform(ctm.inverse());
 return p.x>=0&&p.x<=BOARD_WIDTH&&p.y>=0&&p.y<=BOARD_HEIGHT?p:null;
}
function disposePieceDrag(d,back=false){
 d.source.classList.remove('piece-drag-source');
 document.querySelectorAll('.map-node.piece-drop-legal,.map-node.piece-drop-hover,.board-possession-drop.piece-drop-legal,.board-possession-drop.piece-drop-hover,.printed-medicine.piece-drop-legal,.printed-medicine.piece-drop-hover,.printed-resource-hit.piece-drop-legal,.printed-resource-hit.piece-drop-hover,.printed-supply-hit.piece-drop-legal,.printed-supply-hit.piece-drop-hover,.printed-medicine-slot.piece-drop-legal,.printed-medicine-slot.piece-drop-hover,[data-physical-piece-id].piece-drop-legal').forEach(n=>n.classList.remove('piece-drop-legal','piece-drop-hover'));
 if(!d.ghost)return;
 if(back&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches!==true){
  d.ghost.style.transition='left .17s ease-out, top .17s ease-out, opacity .17s';
  d.ghost.style.left=d.startX+'px';d.ghost.style.top=d.startY+'px';d.ghost.style.opacity='.35';
  setTimeout(()=>d.ghost.remove(),185);
 }else d.ghost.remove();
}
function onPiecePointerDown(e){
 if(e.button!==0||pieceDrag||stateUI.home||stateUI.modal||activeCardReveal())return;
 const source=e.target.closest?.('[data-physical-piece-id]');
 const svg=source?.closest('svg.world-board')||(source?.closest('.board-placement-tray, .board-counter-action-tray')?document.querySelector('.tt-printed-board svg.world-board'):null);
 if(!svg||!source)return;
 // Any real counter drawn in a printed board box can be physically picked up.
 // Its eventual drop remains strictly engine-validated; its existing click
 // action still works if the pointer never becomes a drag.
 const onPrintedBoard=Boolean(source.closest('.printed-real-board-counters'));
 if(!onPrintedBoard&&source.dataset.action!=='board-select-piece')return;
 const piece=state.pieces.find(p=>p.id===source.dataset.physicalPieceId);
 if(!piece||(!onPrintedBoard&&!SPACE[piece.location]&&!source.closest('.board-placement-tray, .board-counter-action-tray')&&!source.closest('.tt-band-cargo')))return;
 const rect=source.getBoundingClientRect();
 pieceDrag={id:piece.id,source,svg,pointerId:e.pointerId,x:e.clientX,y:e.clientY,
  startX:rect.left+rect.width/2,startY:rect.top+rect.height/2,active:false,ghost:null,over:null};
}
function onPiecePointerMove(e){
 const d=pieceDrag;if(!d||d.pointerId!==e.pointerId)return;
 if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;
 if(!d.active){
  d.active=true;d.source.classList.add('piece-drag-source');
  const piece=state.pieces.find(p=>p.id===d.id);
  const ghost=document.createElement('div');ghost.className='piece-drag-ghost';ghost.setAttribute('aria-hidden','true');
  const image=piece&&pieceArt(piece);
  if(image){const img=document.createElement('img');img.src=image;img.alt='';img.draggable=false;ghost.append(img);}
  else ghost.textContent=smallIcon(piece?.type);
  document.body.append(ghost);d.ghost=ghost;
  for(const option of resourceDropOptions(state,d.id)){
   d.svg.querySelector(`[data-printed-rancheria-resources="${CSS.escape(option.command.rancheriaId)}"]`)?.classList.add('piece-drop-legal');
  }
  if(piece?.type==='Band')for(const choice of nextPlayerPrompt(state).choices||[]){
   const c=choice.command;
   if(['PASSAGE_RECRUIT_BAND','CLEANUP_ABSORB_BAND'].includes(c?.type)&&c.bandId===piece.id){
    d.svg.querySelector(`[data-printed-rancheria-resources="${CSS.escape(c.rancheriaId)}"]`)?.classList.add('piece-drop-legal');
   }
   if(c?.type==='PASSAGE_STRENGTHEN_BAND'&&c.bandId===piece.id){
    d.svg.querySelector(`[data-physical-piece-id="${CSS.escape(c.replacementBandId)}"]`)?.classList.add('piece-drop-legal');
   }
  }
  if(piece?.type==='Band'&&piece.location.startsWith('box:')&&state.phase==='execution'&&state.operation==='Take Actions'&&!state.activeBandId&&!state.rancheriaActivation){
   const ranchId=piece.location.slice(4);
   const order=stateUI.rancheriaBandOrder[ranchId]||[];
   for(const el of d.svg.querySelectorAll(`[data-printed-medicine-slot^="${CSS.escape(ranchId)}:"]`)){
    const slot=Number(el.dataset.printedMedicineSlot.split(':').pop());
    const own=state.pieces.find(p=>p.type==='Paraibo'&&(p.affiliatedRancheriaId===ranchId||p.location===`box:${ranchId}`));
    if(own&&own.medicine-slot-1===order.length)el.classList.add('piece-drop-legal');
   }
   if(order.length>=Math.min(state.pieces.find(p=>p.type==='Paraibo'&&(p.affiliatedRancheriaId===ranchId||p.location===`box:${ranchId}`))?.medicine||0,6))
    d.svg.querySelector(`[data-printed-rancheria-resources="${CSS.escape(ranchId)}"]`)?.classList.add('piece-drop-legal');
  }
  if(directorCounterActionDropOptions(state,d.id,nextPlayerPrompt(state)).some(o=>o.target==='card:remove-bison') ||
     (state.developmentPending?.kind==='horse-discard'&&state.developmentPending.horseIds?.includes(d.id))){
   d.svg.querySelector('[data-printed-supply="out"]')?.classList.add('piece-drop-legal');
  }
  for(const option of possessionActionDropOptions(state,d.id)){document.querySelector(`[data-possession-drop="${CSS.escape(option.target)}"]`)?.classList.add('piece-drop-legal');}
  for(const option of activationCounterDropOptions(state,d.id,nextPlayerPrompt(state))){
   document.querySelector(`[data-activation-drop="${CSS.escape(option.target)}"]`)?.classList.add('piece-drop-legal');
   // The Medicine markers are on the ACTUAL PRINTED Ranchería tracks.
   // Highlight those destinations; never create a substitute activation tray.
   if(option.target==='activate:medicine'||option.target==='activate:prepare'){
    const sourcePiece=state.pieces.find(p=>p.id===d.id);
    const ranchId=sourcePiece?.type==='Rancheria'?sourcePiece.id:sourcePiece?.location?.startsWith('box:')?sourcePiece.location.slice(4):null;
    if(ranchId){
     for(const h of state.pieces.filter(p=>p.type==='Paraibo'&&p.affiliatedRancheriaId===ranchId))
      d.svg.querySelector(`[data-medicine-marker-for="${CSS.escape(h.id)}"]`)?.classList.add('piece-drop-legal');
    }
   }
  }
  for(const option of allianceTribeDropOptions(state,d.id,nextPlayerPrompt(state))){document.querySelector(`[data-alliance-drop="${CSS.escape(option.target)}"]`)?.classList.add('piece-drop-legal');}
  for(const option of directorCounterActionDropOptions(state,d.id,nextPlayerPrompt(state))){document.querySelector(`[data-counter-action-drop="${CSS.escape(option.target)}"]`)?.classList.add('piece-drop-legal');}
  if(piece?.type==='Band'&&piece.id===state.activeBandId){
   for(const move of boardMoveOptions(state,piece.id).legal){
    d.svg.querySelector(`.map-node[data-id="${CSS.escape(move.to)}"]`)?.classList.add('piece-drop-legal');
   }
  }
  // Ranchería and Allied Tribe movement uses the turn director's exact validated command.
  if(['Resource','Bison','Mahimiana'].includes(piece?.type))for(const move of resourceDropOptions(state,piece.id)){
   d.svg.querySelector(`.map-node[data-id="${CSS.escape(move.to)}"]`)?.classList.add('piece-drop-legal');
  }
  if(['Rancheria','Tribe','Settlement','Band'].includes(piece?.type)){
   for(const move of directorPieceDropOptions(state,piece.id,nextPlayerPrompt(state))){
    d.svg.querySelector(`.map-node[data-id="${CSS.escape(move.to)}"]`)?.classList.add('piece-drop-legal');
   }
  }
 }
 e.preventDefault();
 d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
 const next=dragSpaceAt(e.clientX,e.clientY,d.svg);
 document.querySelectorAll('.board-possession-drop.piece-drop-hover').forEach(n=>n.classList.remove('piece-drop-hover'));
 document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.board-possession-drop.piece-drop-legal')?.classList.add('piece-drop-hover');
 if(d.over!==next){
  d.svg.querySelector('.map-node.piece-drop-hover')?.classList.remove('piece-drop-hover');
  if(next)d.svg.querySelector(`.map-node[data-id="${CSS.escape(next)}"].piece-drop-legal`)?.classList.add('piece-drop-hover');
  d.over=next;
 }
}
function onPiecePointerUp(e){
 const d=pieceDrag;if(!d||d.pointerId!==e.pointerId)return;
 pieceDrag=null;if(!d.active)return;
 suppressPieceDragClickUntil=performance.now()+350;
 const destination=dragSpaceAt(e.clientX,e.clientY,d.svg);
 const physicalTarget=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-possession-drop]')?.dataset.possessionDrop;
 const counterActionTarget=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-counter-action-drop]')?.dataset.counterActionDrop;
 const allianceTarget=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-alliance-drop]')?.dataset.allianceDrop;
 const draggedPiece=state.pieces.find(p=>p.id===d.id);
 const activationTarget=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-activation-drop]')?.dataset.activationDrop;
 // A Band counter can physically cover the printed marker underneath it.
 // Use the marker's actual on-board screen bounds so the underlying Medicine
 // cell is a usable drop target even when stacked pieces obscure its DOM node.
 const markerAtPointer=[...d.svg.querySelectorAll('[data-medicine-marker-for]')].find(el=>{
  const box=el.getBoundingClientRect(),radius=Math.max(9,Math.min(24,box.width*.8));
  return Math.abs(e.clientX-(box.left+box.width/2))<=radius&&Math.abs(e.clientY-(box.top+box.height/2))<=radius;
 });
 const printedMedicineTarget=markerAtPointer?.dataset.medicineMarkerFor;
 const medicineHeadman=state.pieces.find(p=>p.id===printedMedicineTarget&&p.type==='Paraibo');
 const sourceRanch=state.pieces.find(p=>p.id===d.id)?.location?.replace(/^box:/,'');
 const printedActivation=(medicineHeadman&&medicineHeadman.affiliatedRancheriaId===(draggedPiece?.type==='Rancheria'?d.id:sourceRanch))
  ?activationCounterDropOptions(state,d.id,nextPlayerPrompt(state)).find(x=>x.target===(draggedPiece?.type==='Rancheria'?'activate:prepare':'activate:medicine'))?.target:null;
 const printedPoint=pointerPrintedCoordinates(d.svg,e.clientX,e.clientY);
 const horseDiscard=printedPoint&&printedSupplyAt(printedPoint.x,printedPoint.y)==='out'
  ?printedHorseDiscardSelection(state,d.id,stateUI.horseDiscardSelection):null;
 if(horseDiscard?.ok){
  disposePieceDrag(d);
  stateUI.horseDiscardSelection=horseDiscard.selected;
  if(horseDiscard.command){stateUI.horseDiscardSelection=[];commit(horseDiscard.command);}
  else render();
  return;
 }
 const arrangement=printedPoint?printedMedicineArrangement(state,d.id,printedPoint.x,printedPoint.y,stateUI.rancheriaBandOrder[draggedPiece?.location?.slice(4)]):null;
 const exactTarget=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-physical-piece-id]')?.dataset.physicalPieceId;
 const physicalExchange=printedPoint?printedPossessionDrop(state,d.id,exactTarget,printedPoint.x,printedPoint.y):null;
 const bandExchange=printedPoint?printedBandExchangeDrop(state,d.id,exactTarget,nextPlayerPrompt(state)):null;
 const actualBattle=printedPoint?printedBattleDrop(state,d.id,printedPoint.x,printedPoint.y,nextPlayerPrompt(state),boardImagePosition):null;
 const printedAP=printedPoint?printedAPActivationDrop(state,d.id,printedPoint.x,printedPoint.y,nextPlayerPrompt(state)):null;
 const physicalBoardDrop=printedPoint?printedPieceDrop(state,d.id,printedPoint.x,printedPoint.y,nextPlayerPrompt(state)):null;
 const medicineToMap=destination?printedMedicineBandActivationAtMap(state,d.id,destination,nextPlayerPrompt(state)):null;
 const sameSpace=draggedPiece&&SPACE[draggedPiece.location]&&destination===draggedPiece.location;
 const legalPrintedDrop=physicalBoardDrop?.requiresOwnSpace&&!sameSpace?null:physicalBoardDrop;
 if(arrangement?.ok){
  disposePieceDrag(d);
  stateUI.rancheriaBandOrder[draggedPiece.location.slice(4)]=arrangement.order;
  if(arrangement.command)commit(arrangement.command);else render();
  return;
 }
 const outcome=arrangement?.ok===false?arrangement
  :actualBattle?actualBattle
  :medicineToMap?medicineToMap
  :physicalExchange?physicalExchange
  :bandExchange?bandExchange
  :printedAP?printedAP
  :legalPrintedDrop?legalPrintedDrop
  :(activationTarget||printedActivation)?resolveActivationCounterDrop(state,d.id,activationTarget||printedActivation,nextPlayerPrompt(state))
  :allianceTarget?resolveAllianceTribeDrop(state,d.id,allianceTarget,nextPlayerPrompt(state))
  :counterActionTarget?resolveDirectorCounterActionDrop(state,d.id,counterActionTarget,nextPlayerPrompt(state))
  :physicalTarget?resolvePossessionActionDrop(state,d.id,physicalTarget)
  :draggedPiece?.type==='Bison'&&destination===draggedPiece.location&&possessionActionDropOptions(state,d.id).some(x=>x.target==='hunt')?resolvePossessionActionDrop(state,d.id,'hunt')
  :draggedPiece&&['Resource','Bison','Mahimiana'].includes(draggedPiece.type)
  ?resolveResourceDrop(state,d.id,destination)
  :draggedPiece&&(['Rancheria','Tribe','Settlement'].includes(draggedPiece.type)||(draggedPiece.type==='Band'&&directorPieceDropOptions(state,d.id,nextPlayerPrompt(state)).some(x=>x.to===destination)))
   ?resolveDirectorPieceDrop(state,d.id,destination,nextPlayerPrompt(state))
   :resolveBoardPieceDrop(state,d.id,destination);
 if(outcome.ok){
  disposePieceDrag(d);if(SPACE[destination])stateUI.selectedSpace=destination;stateUI.digitalSelectedPieceId=d.id;
  commit(outcome.command);
 }else{
  disposePieceDrag(d,true);
  const piece=state.pieces.find(p=>p.id===d.id);
  stateUI.digitalSelectedPieceId=d.id;
  if(piece&&SPACE[piece.location])stateUI.selectedSpace=piece.location;
  notify(outcome.reason,true);
  render();
 }
}
function cancelPiecePointerDrag(){if(!pieceDrag)return;const d=pieceDrag;pieceDrag=null;if(d.active)suppressPieceDragClickUntil=performance.now()+350;disposePieceDrag(d,true);}
document.addEventListener('pointerdown',onPiecePointerDown,{passive:true});
document.addEventListener('pointermove',onPiecePointerMove,{passive:false});
document.addEventListener('pointerup',onPiecePointerUp);
document.addEventListener('pointercancel',cancelPiecePointerDrag);
window.addEventListener('blur',cancelPiecePointerDrag);
document.addEventListener('click',actionClick);
document.addEventListener('submit',submitForm);
document.addEventListener('change',onChange);
document.addEventListener('input',e=>{if(e.target.id==='piece-filter'){stateUI.pieceFilter=e.target.value;const r=$('piece-results');if(r)r.innerHTML=piecesTable();}});
document.addEventListener('keydown',e=>{if((e.key==='d'||e.key==='D')&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.target.matches('input, textarea, select')&&!stateUI.playerPanel&&!activeCardReveal()){stateUI.playerPanel='decisions';render();return;}if(e.key==='Escape'&&pieceDrag){cancelPiecePointerDrag();return;}if(activeCardReveal()&&e.key==='Escape'){e.preventDefault();void placeRevealedCard();return;}if(activeCardReveal()&&(e.key==='Enter'||e.key===' ')&&e.target.matches('[data-reveal-flight-source]')){e.preventDefault();void placeRevealedCard();return;}if(activeCardReveal()&&e.key==='Tab'){const next=document.querySelector('.card-reveal-dialog [data-action=next-card-reveal]');if(next){e.preventDefault();next.focus();}return;}if((e.key==='Enter'||e.key===' ')&&e.target.matches('.map-node[data-action], .map-piece-target[data-action], .printed-card[data-action], .printed-track-marker[data-action], [data-action=printed-history], [data-action=printed-rancheria-resources]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}if(e.key==='Escape'&&stateUI.playerPanel){stateUI.playerPanel=null;stateUI.contextPieceId=null;stateUI.contextRancheriaId=null;stateUI.contextCardId=null;stateUI.targetMoveChoices=null;render();return;}if(e.key==='Escape'&&stateUI.tabletopChoices){stateUI.tabletopChoices=false;render();return;}if(e.key==='Escape'&&stateUI.tabletopDetails){stateUI.tabletopDetails=false;render();return;}if(e.key==='Escape'&&stateUI.mapConnectMode){stateUI.mapConnectMode=false;stateUI.edgeStart=null;render();}if(e.key==='Escape'&&stateUI.modal)closeModal();if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.target.matches('input, textarea')){e.preventDefault();undo();}});
document.addEventListener('click',e=>{if(e.target.matches('[data-modal-backdrop]'))closeModal();});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
refreshLocalCards().then(async()=>{await loadPhysicalCounterArt();render();return displayLocalCard(stateUI.referenceSelected);}).catch(error=>notify('Local artwork unavailable: '+error.message,true));
