import {WAR_CARD_DATA} from './war-card-effects.js';
import {CARD_REFERENCE,localCardCount,cardImageUrl,loadCardImage,refreshLocalCards,importLocalCards,clearLocalCards,boardImageUrl,refreshLocalBoard,storeLocalBoard,clearLocalBoard} from './tts-asset-library.js';
import {southMapFacts} from './map-fact-checks.js';
import {MAP_EVIDENCE_EDGES,MAP_CONNECTION_CANDIDATES,MAP_EVIDENCE_SOURCE,MAP_EVIDENCE_URL,FINAL_MAP_URL} from './map-evidence.js';
import { DEVELOPMENT_EFFECT_CATALOG,DEVELOPMENT_SOURCE_INDEX,developmentSourceCoverage,developmentCoverage,CULTURE_CARD_CATALOG,culturePurchaseOptions,verifiedWarEventStatus, fastColumnEligible, travoisOptions,warCountermeasureOptions, VERSION, CARD_EVIDENCE_STATES, cardEvidenceAudit, TEMPLATE_SCENARIOS, TERRITORIES, SPACES, SPACE, SQUARES, SCENARIOS, PIECE_TYPES, RESOURCES, OPERATIONS, newGame, perform, migrateGame, cultureBaseTerritories, cultureGainPreview, territoryControlAudit, pointLossPreview, basicIntegrity, getStackingProblems, getProblems, requiredPassage, checklist, allChecksDone, safeNext, formatLocation, planBandRoute, mapCoverage, eligibleBattleUnits, warBattleObligations, enemyApPreview, enemyDisplayAudit, enemyFlowPreview, mapReviewAudit, enemyColorNetwork, enemyCulturePreview, huntTargetPreview, encroachTargetPreview, allyTargetPreview, peaceTargetPreview, peaceSpaceStatus, enemyCardExceptionPreview, activeCardEffects, instructionName, verifiedHistoryEnemy, settleTargetAudit, subjugateTargetAudit, recoverTargetAudit, ENEMY_COLUMNS, DISPLAY_ROWS, warColumnStopUnits, warMoveChoices, autoWarMovementPreview } from './engine.js';
import {BOARD_WIDTH,BOARD_HEIGHT,MAP_POSITIONS,MAP_PALETTE,MAP_REGION_LABELS,boardPosition,mapEdgesForDisplay} from './board-layout.js';
import {boardNetworkAudit,bandMovementOverlay} from './board-analysis.js';
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
const labelPiece=p=>`${p.label||p.type}${p.type==='Band'?` [${p.strength} strength / ${p.mpRating} mov.]`:''}`;
const getOwner=(p)=>p.owner||'—';
const smallIcon=t=>({'Band':'♞','Rancheria':'⌂','Settlement':'▥','War Column':'⚔','Bison':'◈','Resource':'◆','Marker':'◉','Instruction':'✧','Tribe':'✽','Paraibo':'✦','Mahimiana':'✦','Other':'◌'})[t]||'◌';
const details=p=>[p.ratingConfirmed===false?'⚠ Verify printed MP':null,p.subtype,p.strength&&p.strength+' str.',p.type==='Band'&&p.mpRating+' mov.',p.finished?'Finished':''].filter(Boolean).join(' · ');
const navItems=[['dashboard','Overview','▦'],['digital','Digital tabletop','🎲'],['board','Board map','◎'],['pieces','Pieces & stock','♞'],['operations','Operations','✧'],['cards','Cards & events','▤'],['journal','Action journal','☷'],['settings','Settings & saves','⚙']];
const phases=[['war','War column'],['selection','Select operation'],['execution','Execute'],['cleanup','Cleanup']];
const stateUI={tab:'digital',modal:null,selectedSpace:'UA-2',pieceFilter:'',pieceType:'All',modalId:null,toasts:'',toastError:false,showAllLog:false,referenceKind:'War',referenceSelected:'war-01',routeTarget:'UA-1',battleWarId:null,battleUnitId:null,mapZoom:1,mapConnectMode:false,digitalSelectedPieceId:null,digitalDeck:'Development',edgeStart:null,edgeTarget:null,mapShowReach:true,saveConflict:false};
let state,history={past:[],future:[]},saveRevision=null;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.state){saveRevision=revisionOf(saved);state=migrateGame(saved.state);history={past:Array.isArray(saved.past)?saved.past.slice(-70).map(migrateGame):[],future:Array.isArray(saved.future)?saved.future.slice(-70).map(migrateGame):[]};}else state=newGame();}
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
function commit(cmd){
 if(!ensureFreshTab())return;
 try{
  const after=perform(state,cmd);
  const before=state,oldHistory=history;
  history={past:[...history.past,copy(state)].slice(-70),future:[]};state=after;
  if(!persist()){state=before;history=oldHistory;savingFailed();return;}
  render();const recent=state.log[0];if(recent)notify(recent.description);
 }catch(e){notify(e.message||'Action rejected.',true);}
}
function undo(){
 if(!history.past.length||!ensureFreshTab())return;
 const before=state,oldHistory=history;
 state=history.past.at(-1);history={past:history.past.slice(0,-1),future:[...history.future,copy(before)]};
 if(!persist()){state=before;history=oldHistory;savingFailed();return;}
 render();notify('Undid last event. Physical board must be reconciled.');
}
function redo(){
 if(!history.future.length||!ensureFreshTab())return;
 const before=state,oldHistory=history;
 state=history.future.at(-1);history={past:[...history.past,copy(before)],future:history.future.slice(0,-1)};
 if(!persist()){state=before;history=oldHistory;savingFailed();return;}
 render();notify('Redid event. Check the physical board.');
}
function newSession(demo){
 if(!ensureFreshTab())return;
 const scenario=$('scenario-select')?.value||state.scenario;
 if((state.pieces.length||state.log.length)&&!confirm('Replace this game? Export a backup first if you wish to keep it.'))return;
 const before=state,oldHistory=history,oldTab=stateUI.tab;
 state=newGame(scenario,demo);history={past:[],future:[]};stateUI.tab='digital';stateUI.modal=null;
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
function header(){const scenario=SCENARIOS.find(x=>x[0]===state.scenario);const titles={dashboard:'Your table at a glance',digital:'Digital tabletop',board:'Board map',pieces:'Counter inventory',operations:'Sequence of play',cards:'Card register',journal:'Action journal',settings:'Settings & local saves'};
 const desc={dashboard:'A second set of eyes for your physical Comanchería game.',digital:'Play on this screen: roll dice, draw counters and cards, select map pieces, and record game moves.',board:'Interactive spatial layout with live piece markers and player-confirmed connections.',pieces:'Every recorded counter has a single location and an individual identity.',operations:'Follow the printed sequence, log validated actions and acknowledge manual checks.',cards:'Track card identifiers, zones and reminders; read effects on physical cards.',journal:'An auditable trail of recorded actions, including manual overrides.',settings:'Set up, export archival files and configure your locally stored game.'};
 return `<header class="masthead"><div><p class="eyebrow">${stateUI.tab==='digital'?'DIGITAL TABLETOP · ALPHA':'BOARD COMPANION'} · v${VERSION}</p><h1 class="page-title">${titles[stateUI.tab]}</h1><p class="subtitle">${desc[stateUI.tab]}</p></div><div class="mast-actions">${hButton('undo','↶ Undo','btn sm',history.past.length?'':'disabled')}${hButton('redo','↷ Redo','btn sm',history.future.length?'':'disabled')}${hButton('export','⇩ Export save','btn sm')}${hButton('modal-add-piece','＋ Record piece','btn primary sm')}</div></header>`;}
function renderStats(){const scenario=SCENARIOS.find(x=>x[0]===state.scenario);const vals=[['Military',state.tracks.military,'/ 9 max'],['Culture',state.tracks.culture,'/ 9 max'],['Player AP',state.tracks.ap,'/ 9 max'],['Enemy AP',state.tracks.enemyAp,'/ 9 max'],['Movement',state.tracks.movement,'active Band'],['Counters',state.pieces.filter(p=>p.location!=='removed'&&p.location!=='reserve').length,'recorded in play']];return `<div class="stats">${vals.map(([a,b,c],i)=>`<div class="stat ${i<2?'highlight':''}"><div class="stat-title">${a}</div><div class="stat-number">${fmt(b)}</div><div class="stat-foot">${c}</div></div>`).join('')}</div>`;}
function warnings(){const p=getProblems(state);const warns=p.map(x=>`<div class="notice alert"><strong>Check:</strong> ${esc(x)}</div>`).join('');
 return `${state.phase==='setup'?`<div class="banner"><span style="font-size:22px;color:var(--gold)">✧</span><div><h3>Setup mode — not yet playing</h3><p>Enter your counters and track values from the physical scenario setup. ${esc(state.setupNote)} Game setup is not automatically enforced.</p><div style="margin-top:10px">${hButton('start','Start tracking ▶','btn primary sm')}${hButton('demo','Use example game','btn ghost sm')}</div></div></div>`:''}${warns}${state.quality.manual?`<div class="notice compact info">${state.quality.manual} entry/ies were manually verified or corrected on the physical board. These are <strong>not</strong> automatically rules-validated.</div>`:''}`;}
function phaseProgress(){return `<div class="phase-track">${phases.map(([id,t])=>`<span class="phase-pill ${state.phase===id?'now':''}">${id===state.phase?'● ':'◦ '}${t}</span>`).join('')}</div>`;}
function officialSetupPanel(){
 if(state.phase!=='setup')return '';
 const tasks=Object.entries(state.setupChecklist||{});
 const count=tasks.filter(([key])=>state.setupConfirmed?.[key]).length;
 const available=TEMPLATE_SCENARIOS.includes(state.scenario);
 return cardPanel('Official opening setup assistant',`
 <p class="intro">Verified setup data for the first three scenarios, based on <b>GMT Living Rules §9.1–9.4</b>. This fills in opening Tribes, Bison, Ranchería A, Bands, Horses, Mahimiana, the Success Check cup, Enemy Instruction counters, and card identifiers. It does <b>not</b> shuffle physical cards, infer movement connections, or select Culture cards.</p>
 ${!tasks.length?`<div class="notice info">${available?'Use the opening template to avoid entering scores of counters by hand. Only works on a fresh, empty ledger.':'No independently verified one-click template for this scenario. Use the printed setup instructions.'}</div>${available?hButton('apply-opening-template','Load official opening template','btn primary sm',state.pieces.length||state.cards.length?'disabled title="Start a new blank session first"':''):''}`:
 `<div class="rowline"><b>Physical setup confirmed</b><span class="tag gold">${count} / ${tasks.length}</span></div>${tasks.map(([key,label])=>`<label class="check-item ${state.setupConfirmed?.[key]?'completed':''}" style="cursor:pointer"><input type="checkbox" class="setup-confirm" data-key="${esc(key)}" ${state.setupConfirmed?.[key]?'checked':''} aria-label="Confirm ${esc(label)}"><span class="check-main">${esc(label)}</span></label>`).join('')}<div class="notice ${count===tasks.length?'info':'alert'}">${count===tasks.length?'Opening checklist complete. Verify the three Band movement ratings in Pieces & stock, then start.':'Start tracking remains blocked until every physical setup task is checked.'}</div>`}
 `,'You can Undo the entire template or start a new blank game. Original artwork is not bundled.');
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
function procedurePanel(){if(state.phase==='gameover')return cardPanel('Game finished',`<div class="notice ${state.gameResult?.outcome==='victory'?'info':'alert'}"><h3>${esc(state.gameResult?.grade||state.gameResult?.outcome||'Game ended')}</h3><p>${esc(state.gameResult?.reason||'Reconcile game ending with the printed rules.')}</p><p>${esc(state.gameResult?.note||'')}</p></div><p class="small muted">Final result saved to the journal. Export the record or Undo to correct the physical-board result.</p>`);if(state.phase==='setup')return cardPanel('Ready your board',`<p class="intro">Confirm the physical scenario setup. Load an opening template below for the first three official scenarios, or enter counters manually. The <strong>Start tracking</strong> button begins at the War Column Phase.</p>${hButton('start','Start tracking ▶','btn primary',safeNext(state).ok?'':'disabled title="Finish physical setup confirmation first"')}`,'The printed scenario instructions remain authoritative.');
 const steps=checklist(state),next=safeNext(state),phaseName=state.phase==='execution'?(state.operation||'Operation'):state.phase==='war'?'War Column Phase':state.phase==='cleanup'?'Operation Cleanup':state.phase==='selection'?'Operation selection':'Game finished';
 const passageDigital=state.phase==='execution'&&state.operation==='Passage of Time';
 const stepHTML=steps.map(([id,text,rule],i)=>`<div class="check-item ${state.steps[id]==='done'?'completed':''}"><span class="step-index">${i+1}</span><div class="check-main"><div class="step-head">${esc(text)}</div><div class="step-meta">Living Rules ${esc(rule)} · check printed rules/cards before marking</div></div><div class="check-actions">${state.phase==='execution'&&state.operation==='Passage of Time'&&['pt1','pt6','pt7','pt8','pt10'].includes(id)?`<button type="button" class="btn primary sm" data-action="${id==='pt1'?'passage-unfinish':id==='pt6'?'passage-death':id==='pt7'?'passage-replace':id==='pt8'?'passage-success':'passage-ravaged'}" ${state.steps[id]==='done'?'disabled':''}>Apply digitally</button>`:''}<button type="button" ${state.phase==='execution'&&state.operation==='Passage of Time'&&['pt1','pt8','pt9','pt10','pt11','pt12','pt14','pt15'].includes(id)?'disabled title="Use the digital Passage of Time action"':''} data-action="check" data-key="${id}" data-value="${state.steps[id]==='done'?'':'done'}" class="${state.steps[id]==='done'?'selected':''}">✓ Done</button><button type="button" ${state.phase==='execution'&&state.operation==='Passage of Time'&&['pt1','pt8','pt9','pt10','pt11','pt12','pt14','pt15'].includes(id)?'disabled title="Use the digital Passage of Time action"':''} class="na ${state.steps[id]==='na'?'selected':''}" data-action="check" data-key="${id}" data-value="${state.steps[id]==='na'?'':'na'}">N/A</button></div></div>`).join('');
 const operationSelect=state.phase==='selection'?`<div class="notice ${requiredPassage(state)?'alert':'info'}">${requiredPassage(state)?'Mandatory Passage of Time: no recorded in-play Band or Operations marker is marked mandatory.':'Choose ONE of the four Operations. Refer to rule 3.2 and relevant cards.'}</div><div class="action-grid">${OPERATIONS.map(op=>`<button class="action-card" data-action="select-operation" data-value="${op}" ${requiredPassage(state)&&op!=='Passage of Time'?'disabled':''} style="${state.operation===op?'border-color:var(--gold);background:#4b4131':''}"><b>${op==='Take Actions'?'♞ ':op==='Culture'?'✦ ':op==='Planning'?'⊞ ':'⌛ '}${op}</b><span>${state.operation===op?'Selected · ':''}Rules ${({'Take Actions':'4.1','Culture':'4.2','Planning':'4.3','Passage of Time':'4.4'})[op]}</span></button>`).join('')}</div>`:'';
 return `<section class="panel"><div class="panel-header"><div><h2>${esc(phaseName)}</h2><p class="panel-sub">Guided checkpoints · manual acknowledgement is required for unimplemented rules</p></div><span class="tag gold">${state.phase==='selection'?'CHOOSE':state.phase==='execution'?'IN PROGRESS':'PROCEDURE'}</span></div><div class="procedure">${phaseProgress()}${operationSelect}${stepHTML}${passageDigital?passageHeadmanPanel()+passageResourcePanel()+passagePeacePanel()+passageBisonPanel()+passageCulturePanel()+passageEndPanel():''}${state.phase==='execution'&&state.operation==='Take Actions'?`<div class="divider"></div>${bandActions()}`:''}${state.phase==='cleanup'&&getStackingProblems(state).length?`<div class="notice alert">Resolve the stacking conflicts shown below before completing cleanup.</div>`:''}<div class="next-row"><div class="muted small">${steps.length?steps.filter(x=>['done','na'].includes(state.steps[x[0]])).length+' of '+steps.length+' checkpoints recorded':'Confirm the selected operation.'}</div>${hButton('advance',state.phase==='cleanup'?'Finish cleanup → War Column':state.phase==='war'?'Go to Operation selection →':state.phase==='selection'?'Execute Operation →':'Go to cleanup →','btn primary',next.ok?'':'disabled title="Complete all checkpoints first"')}</div></div></section>`;}
function passageHeadmanPanel(){
 if(state.phase!=='execution'||state.operation!=='Passage of Time'||state.steps.pt7==='done')return '';
 const ranches=state.pieces.filter(p=>p.type==='Rancheria'&&SPACES.some(x=>x.id===p.location));
 const chiefs=state.pieces.filter(p=>p.type==='Mahimiana'&&p.location!=='removed');
 const stage=state.steps.pt5!=='done'?5:state.steps.pt6!=='done'?6:7;
 if(stage===5)return cardPanel('Passage step 5 · Headman retirement',`<p class="intro">Optional: a Mahimiana with Medicine greater than 1 may retire, transferring his rating to his Ranchería Paraibo. Cuerno Verde #29 forbids retiring a Medicine-6 Mahimiana while in play. Affiliation must be unambiguous.</p><form id="passage-retire-form"><select name="mahimianaId">${options(chiefs.map(p=>[p.id,`${p.label} · Medicine ${p.medicine??'unrecorded'}`]))}</select><button class="btn sm" type="submit">Retire selected Mahimiana</button></form><div class="form-end">${hButton('passage-retirement-done','Finish optional retirement','btn primary sm')}</div>`);
 if(stage===6){const quanah=state.cards.some(c=>c.kind==='Development'&&String(c.identifier)==='74'&&['In play','Display'].includes(c.zone));return quanah?cardPanel('Passage step 6 · Quanah Parker exemption',`<p>Select one Mahimiana to exclude from the Headman Death Check, then resolve the remaining checks.</p><form id="passage-quanah-form"><select name="mahimianaId">${options(chiefs.map(p=>[p.id,p.label]))}</select><button class="btn primary sm">Exempt this Mahimiana</button></form>`):'';}
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
 if(state.victoryPending)return `<div class="notice alert"><h3>Mandatory Victory Check · H${state.period}</h3><p>Compare the current printed History Card objective against the physical board (Living Rules §2.10). A failed objective ends the game. Passing in a final scenario period ends the game; otherwise reveal the next History Card and complete its effects.</p></div><form id="victory-check-form"><label class="field"><span>Is the printed H${state.period} Victory Check Objective met?</span><select name="met">${option('yes','Yes — objective achieved','yes')}${option('no','No — player defeat','yes')}</select></label><label class="field"><span>Evidence from the actual board and History Card</span><textarea name="objectiveNote" minlength="12" maxlength="500" placeholder="Which H${state.period} objective, and which counters/tracks prove the result?" required></textarea></label><label class="small"><input type="checkbox" name="transitionAck"> If this is not the final period, I removed the old History/deck, revealed the next History Card and resolved its printed effects.</label><label class="small"><input type="checkbox" name="ack" required> I checked the printed History Card's Victory Check Objective.</label><div class="form-end"><button class="btn primary" type="submit">Record Victory Check outcome</button></div></form>`;
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
 ${state.operationEvents.cultureGain?'<div class="notice info">Culture gain recorded for this Operation. Undo to correct.</div>':`<form id="culture-form"><div class="culture-options">${preview.audit.map(t=>`<label class="small" title="${esc([...t.blockers,...t.needsReview].join('; ')||'No enemy spaces recorded in this territory')}"><input type="checkbox" name="controlled" value="${t.id}" ${t.status==='controlled'?'checked':''}> ${esc(t.name)} <span class="tag ${t.status==='controlled'?'gold':''}">${t.status==='controlled'?'Controlled':t.status==='review-needed'?'Review':'Not controlled'}</span></label>`).join('')}</div>
 <p class="small muted" style="margin:12px 0">A territory counts as controlled when it has a Band/Ranchería and no Enemy Spaces. The ledger can be incomplete; cards and Peace counters may alter the result. <strong>Any disagreement with the preview needs a documented reason.</strong></p>
 <label class="field"><span>Why does the physical board/card differ? (only if needed)</span><input name="reason" maxlength="200" placeholder="Rule/card number and corrected control"></label>
 <label class="small" style="display:block;margin:12px 0"><input type="checkbox" name="ack" required> I have confirmed the board inventory, Peace effects, and printed card exceptions.</label><button class="btn primary sm" type="submit">Apply +${preview.gain} preview Culture</button></form>`}`;
 const operationsHTML=`<h3>Operations-track step · rules 4.1 / 4.2</h3>${state.operationEvents.operationsRoll?'<div class="notice info">Operations-track step recorded. The game can proceed once the other checkpoints are complete.</div>':`<p class="small muted">Current Operations position: <b>${state.tracks.operations===0?'Start (no die roll)':state.tracks.operations}</b>. At Start, advance one position. Otherwise, enter your physical die roll; this validates the baseline transition. Check card exceptions before applying.</p><form id="operations-check-form"><div class="form-grid">${state.tracks.operations===0?'':`<label class="field"><span>Die result</span><select name="die">${options(['1','2','3','4','5','6'],'1')}</select></label>`}<label class="field"><span>Confirm</span><label class="small"><input type="checkbox" name="ack" required> Rules and card effects checked.</label></label></div><button type="submit" class="btn primary sm">Record Operations step</button></form>`}`;
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
 const cup=state.pieces.filter(p=>p.location==='cup');
 const success=cup.filter(p=>p.subtype==='Success').length;
 const aps=cup.filter(p=>/^Enemy AP [234]$/.test(p.subtype)).length;
 const instructions=cup.filter(p=>p.type==='Instruction').length;
 const available=state.pieces.filter(p=>p.location==='available-enemy-aps').length;
 const out=state.pieces.filter(p=>p.location==='success-out'||p.location.startsWith('medicine:')).length;
 return cardPanel('Physical Success Check cup',`<div class="rowline"><span>In draw cup</span><strong>${cup.length}</strong></div><div class="rowline"><span>Success counters</span><strong>${success}</strong></div><div class="rowline"><span>Enemy AP counters</span><strong>${aps}</strong></div><div class="rowline"><span>Enemy Instruction counters</span><strong>${instructions}</strong></div><div class="rowline"><span>Enemy AP counters awaiting spending</span><strong>${available}</strong></div><div class="rowline"><span>Success on medicine / Out of Play</span><strong>${out}</strong></div><p class="small muted">Counter allocation follows the guided §2.9 procedure. Guns cancellation and Trade Goods redraws are assisted when a Raid check is in progress; enemy AP spending, card exceptions and non-Raid checks remain manual.</p>`,'Entries only; never assumes the tracker contains all the physical pieces.');
}
function pointLossPanel(){
 if(state.phase==='setup'||state.phase==='gameover')return '';
 return cardPanel('Rules-based point loss · §2.11',`<p class="intro">Automatically substitutes <b>2 points on the other track</b> for each Military/Culture point you cannot lose. The result may cause immediate defeat. Use only after confirming the physical enemy/card instruction.</p><form id="loss-form" class="form-grid"><label class="field"><span>Track to lose</span><select name="field">${option('military','Military')}${option('culture','Culture')}</select></label><label class="field"><span>Amount instructed</span><input type="number" min="1" max="99" name="amount" value="1" required></label><label class="field"><span>Instruction or card reference</span><input name="reason" placeholder="e.g. Enemy action §6.3" minlength="4" required></label><div class="field" style="align-self:end"><button class="btn sm" type="submit">Apply validated loss</button></div></form>`,'Direct track editing is still available as a logged manual correction.');
}
function bandActions(){const active=state.activeBandId&&state.pieces.find(p=>p.id===state.activeBandId);
 if(state.pending?.type==='raid')return `<div class="notice alert"><strong>Raid needs resolution.</strong> One movement point has been spent. Consult §2.9 and §5.2.3 and account for all physical draws.</div>${successCheckPanel()}<div class="form-end">${hButton('modal-resolve-raid','Resolve Raid and rewards','btn primary',state.successCheck?'disabled title="Finish cup check first"':'')}${hButton('cancel-raid','Cancel raid','btn sm',state.successCheck||state.lastSuccessCheck?'disabled title="Cancel the check first or use Undo"':'')}</div>`;
 if(active){const horses=state.pieces.filter(x=>x.location===`held:${active.id}`&&x.subtype==='Horse');const bison=state.pieces.filter(x=>x.location===active.location&&x.type==='Bison');const mahimiana=state.pieces.some(x=>x.location===`held:${active.id}`&&x.type==='Mahimiana');
  return `<div class="active-band"><div class="rowline"><div><span class="tiny-label">ACTIVE BAND</span><h3>${esc(active.label)}</h3><span class="small muted">${esc(formatLocation(state,active.location))} · ${active.strength} strength · ${horses.length} Horse counter(s)</span></div><div style="text-align:right"><span class="tiny-label">MOVEMENT LEFT</span><div style="font:40px Georgia,serif;color:var(--gold)">${state.tracks.movement}</div></div></div></div><div class="action-grid"><button class="action-card" data-action="modal-move-band"><b>↗ Move</b><span>${horses.length?1:2} movement · recorded connection required</span></button><button class="action-card" data-action="hunt" ${bison.length&&state.tracks.movement>=(mahimiana?2:3)?'':'disabled'}><b>◈ Hunt</b><span>${mahimiana?2:3} movement · Bison in target space</span></button><button class="action-card" data-action="raid" ${state.tracks.movement>0?'':'disabled'}><b>⚔ Raid</b><span>1 movement · Enemy or Peace space</span></button><button class="action-card" data-action="modal-trade" ${state.tracks.movement>0?'':'disabled'}><b>⇄ Trade</b><span>1 movement per resource · may cost AP</span></button></div><div class="form-end">${hButton('horse-mp','Spend Horse → +1 movement','btn sm',horses.length?'':'disabled')}${hButton('finish-band','Finish Band','btn primary sm')}</div>`;}
 const bands=state.pieces.filter(x=>x.type==='Band'&&x.location!=='reserve'&&x.location!=='removed');
 return `<p class="intro">Select an eligible Band. For free Ranchería activation, you must separately verify medicine-track order using rule 4.1.</p>${bands.length?`<div class="rowline"><select class="control" id="activate-band-id" style="flex:1;min-width:170px">${bands.map(x=>option(x.id,`${x.label}${x.finished?' (Finished — AP activation)':''} · ${formatLocation(state,x.location)}`,x.id)).join('')}</select><select class="control" id="activate-mode" style="flex:1;min-width:170px">${option('rancheria','Ranchería / medicine (manual verification)')}${option('ap','Spend AP (outside Band)')}</select></div><div class="form-end"><label class="small"><input id="activate-ack" type="checkbox"> I checked Ranchería medicine prerequisites</label>${hButton('activate-band','Activate Band','btn primary sm')}</div>`:`<div class="empty">No unfinished Bands on the map or in Ranchería boxes. Add counters or finish this procedure.</div>`}`;
}
function spaceCount(id){return state.pieces.filter(x=>x.location===id).length;}
function nodePieceGlyph(p){return ({Band:'♞',Rancheria:'⌂',Settlement:'▥','War Column':'⚔',Bison:'◈',Resource:'◆',Tribe:'✽',Instruction:'✧',Marker:'●'})[p.type]||'●';}
function mapSpaceNode(sp,overlay,routePath=[]){
 const id=sp.id,pos=boardPosition(id);
 if(!pos)return '';
 const [x,y]=pos,here=state.pieces.filter(p=>p.location===id),count=here.length;
 const isSelected=stateUI.selectedSpace===id;
 const active=state.pieces.some(p=>p.id===state.activeBandId&&p.location===id);
 const war=here.some(p=>p.type==='War Column');
 const neighbors=state.edges.some(e=>(e.a===stateUI.selectedSpace&&e.b===id)||(e.b===stateUI.selectedSpace&&e.a===id));
 const connected=stateUI.selectedSpace!==id&&neighbors;
 const canReach=Boolean(overlay?.reachable[id])&&id!==overlay?.from;
 const onRoute=routePath.includes(id);
 const classes=['map-node',isSelected?'selected':'',active?'active-band-node':'',war?'war-column-node':'',connected?'connected':'',count?'has-counters':'',canReach?'mp-reachable':'',onRoute?'route-preview-node':''].filter(Boolean).join(' ');
 const title=`${sp.name} · ${count} recorded counter${count===1?'':'s'}${count?': '+here.slice(0,15).map(labelPiece).join(', '):''}`;
 const round=sp.type==='round';
 const fill=round?MAP_PALETTE[sp.territory]:(sp.type==='canyon'?MAP_PALETTE.canyon:sp.type==='reservation'?MAP_PALETTE.reservation:MAP_PALETTE.enemy);
 const base=round?`<circle class="map-node-core" cx="${x}" cy="${y}" r="23" fill="${fill}"/>`:
  sp.type==='canyon'?`<polygon class="map-node-core" points="${x-25},${y-15} ${x},${y-29} ${x+25},${y-15} ${x+25},${y+15} ${x},${y+29} ${x-25},${y+15}" fill="${fill}"/>`:
  sp.type==='reservation'?`<circle class="map-node-core" cx="${x}" cy="${y}" r="43" fill="${fill}"/>`:
  `<rect class="map-node-core" x="${x-22}" y="${y-22}" width="44" height="44" rx="6" fill="${fill}"/>`;
 const label=round?`${sp.area}`:id==='RESERVATION'?'R':id==='PD'?'PD':id;
 const labelFont=sp.type==='reservation'?15:round?20:13;
 const badge=count?`<g class="map-piece-badge" transform="translate(${x+25} ${y+21})"><circle r="13"/><text y="4" text-anchor="middle">${count>99?'99+':count}</text></g>`:'';
 const piecePreview=here.slice(0,3).map((piece,i)=>{const dx=(i-((Math.min(3,count)-1)/2))*19;const hue=piece.type==='Band'?'#b6d2a0':piece.type==='Rancheria'?'#f4ce91':piece.type==='War Column'?'#f19a87':piece.type==='Settlement'?'#d7ad9e':piece.type==='Tribe'?'#b0c6ba':'#e1ccab';return `<g transform="translate(${x+dx} ${y-31})" class="map-mini-counter"><rect x="-9" y="-10" width="18" height="20" rx="4" fill="${hue}"/><text y="4" text-anchor="middle">${esc(nodePieceGlyph(piece))}</text></g>`;}).join('');
 return `<g class="${classes}" data-action="select-space" data-id="${esc(id)}" role="button" tabindex="0" aria-label="${esc(title)}"><title>${esc(title)}</title>${isSelected?`<circle class="map-focus-ring" cx="${x}" cy="${y}" r="${sp.type==='reservation'?50:31}"/>`:''}${base}<text class="map-node-number" x="${x}" y="${y+6}" text-anchor="middle" style="font-size:${labelFont}px">${esc(label)}</text>${round?`<text class="map-node-id" x="${x}" y="${y+38}" text-anchor="middle">${esc(sp.territory)}-${sp.area}</text>`:sp.type==='enemy'?`<text class="map-node-id" x="${x}" y="${y+36}" text-anchor="middle">ENEMY</text>`:''}${piecePreview}${badge}</g>`;
}
function mapLinkLine(link,routePath=[]){
 const [x1,y1]=MAP_POSITIONS[link.a],[x2,y2]=MAP_POSITIONS[link.b];
 const highlight=stateUI.selectedSpace===link.a||stateUI.selectedSpace===link.b;
 const onRoute=routePath.some((id,i)=>i>0&&((id===link.a&&routePath[i-1]===link.b)||(id===link.b&&routePath[i-1]===link.a)));
 return `<line class="map-verified-link ${link.kind==='dashed'?'dashed':''} ${link.enemyFor?.length>1?'enemy-shared':link.enemyFor?.length?'enemy-'+link.enemyFor[0].toLowerCase():''} ${highlight?'highlighted':''} ${onRoute?'route-preview-link':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
}
function boardMap(){
 const edges=mapEdgesForDisplay(state.edges);
 const overlay=stateUI.mapShowReach?bandMovementOverlay(state,state.activeBandId):null;
 const activeBand=state.pieces.find(p=>p.id===state.activeBandId);
 let routePath=[];if(overlay&&activeBand&&SPACE[stateUI.routeTarget]){const route=planBandRoute(state,activeBand.id,stateUI.routeTarget);if(route.found)routePath=route.path;}
 const className=stateUI.mapConnectMode?'world-board linking':'world-board';
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
 const nodes=SPACES.map(sp=>mapSpaceNode(sp,overlay,routePath)).join('');
 return `<div class="map-toolbar"><div class="map-title"><span class="map-eyebrow">INTERACTIVE BOARD LAYOUT</span><strong>Southern Plains · 1700–1875</strong><small>Original spatial diagram · verify printed routes</small></div><div class="map-toolbar-actions">${hButton('map-zoom-out','−','btn slim',stateUI.mapZoom<=1?'disabled title="Minimum zoom"':'title="Zoom out"')}${hButton('map-zoom-in','+','btn slim',stateUI.mapZoom>=2?'disabled title="Maximum zoom"':'title="Zoom in"')}${hButton('map-connect',stateUI.mapConnectMode?'Cancel line':'Connect spaces','btn sm',stateUI.mapConnectMode?'aria-pressed="true"':'aria-pressed="false"')}${activeBand?hButton('map-toggle-reach',stateUI.mapShowReach?'Hide MP overlay':'Show MP overlay','btn sm',`aria-pressed="${stateUI.mapShowReach}"`):''}</div></div>
 ${overlay?`<div class="notice compact info"><b>Movement overlay:</b> ${overlay.reachableCount} other space(s) within ${overlay.available} MP through entered lines (${overlay.costPerEdge} MP per link). Pale rings indicate ledger-reachable spaces, <b>not</b> guaranteed legal moves. Select a target to preview a path.</div>`:''}
 ${stateUI.mapConnectMode?`<div class="notice compact info"><strong>Connection entry:</strong> Selected start <b>${esc(stateUI.edgeStart||stateUI.selectedSpace)}</b>. Click a second map space, then confirm the line type against your physical board. No line is recorded until you confirm.</div>`:''}
 <div class="world-map-scroller" tabindex="0" aria-label="Scrollable board diagram"><svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}" style="min-width:${Math.round(850*stateUI.mapZoom)}px" role="group" aria-label="Spatial overview of the 36 Comanchería round spaces plus special map spaces">
 <defs><pattern id="map-speckle" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="6" cy="16" r=".9" fill="#dfc9a1" opacity=".10"/><circle cx="25" cy="6" r=".9" fill="#dfc9a1" opacity=".08"/></pattern></defs>
 <rect x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" rx="13" class="map-surface"/>
 <rect x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" fill="url(#map-speckle)"/>
 ${regions}${guide}${labels}
 <g class="map-link-layer">${edges.map(edge=>mapLinkLine(edge,routePath)).join('')}</g>
 <g class="map-space-layer">${nodes}</g>
 <text class="map-corner-label" x="1054" y="696" text-anchor="end">${edges.length} RECORDED LINKS</text>
 </svg></div>
 <p class="map-mobile-tip">On a narrow screen, swipe the map horizontally to explore every space.</p><div class="map-legend"><span><i class="legend-dot ua"></i>Upper Arkansas</span><span><i class="legend-dot la"></i>Lower Arkansas</span><span><i class="legend-dot rr"></i>Red River</span><span><i class="legend-dot le"></i>Llano Estacado</span><span><i class="legend-dot rg"></i>Rio Grande</span><span><i class="legend-dot bc"></i>Brazos Colorado</span><span><i class="legend-counter"></i>Recorded pieces</span><span><i class="legend-line"></i>Verified map line</span></div>`;
}
function selectedDetail(){
 const sp=SPACE[stateUI.selectedSpace]||SPACES[0];
 const here=state.pieces.filter(p=>p.location===sp.id);
 const links=state.edges.filter(e=>e.a===sp.id||e.b===sp.id);
 const mapCheck=mapReviewAudit(state).rows.find(r=>r.id===sp.id);
 const reviewMark=mapCheck?.reviewed?'Reviewed against physical board':mapCheck?.stale?'Review expired after connection change':'Not yet fully reviewed';
 const active=state.pieces.find(p=>p.id===state.activeBandId);
 const canMove=active&&sp.id!==active.location&&state.phase==='execution'&&state.operation==='Take Actions'&&!state.pending&&state.edges.some(e=>(e.a===active.location&&e.b===sp.id)||(e.b===active.location&&e.a===sp.id));
 const moveBtn=canMove?hButton('board-move-band',`Move active Band here →`,'btn primary sm',`data-to="${esc(sp.id)}"`):'';
 const overlay=bandMovementOverlay(state,state.activeBandId);
 const planned=overlay&&active&&SPACE[active.location]?planBandRoute(state,active.id,sp.id):null;
 const routeSummary=planned?.found&&planned.hops>0?`<div class="notice compact info">Entered-line route: <b>${planned.path.map(esc).join(' → ')}</b> · ${planned.cost} MP needed / ${planned.available} available. ${planned.affordable?'Fits remaining MP, pending other rule and card checks.':'Not affordable in this Band activation.'} ${planned.next&&planned.available>=planned.costPerEdge?hButton('route-next',`Move ONE edge to ${esc(planned.next)}`,'btn primary sm',`data-to="${esc(planned.next)}"`):''}</div>`:'';
 return `<div class="space-detail"><div class="top"><div><strong>${esc(sp.name)}</strong><div class="small muted">${sp.type==='round'?`Territory · Area Value ${sp.area}`:sp.type==='enemy'?'Square Enemy Space':sp.type==='canyon'?'Special canyon space':'Reservation'} · ${links.length} recorded link${links.length===1?'':'s'}</div></div><div class="form-end" style="margin-top:0">${moveBtn}${hButton('modal-add-here','＋ Add piece','btn sm')}</div></div><div class="pieces-in-space">${here.length?here.map(p=>`<button class="piece-chip" data-action="edit-piece" data-id="${esc(p.id)}">${smallIcon(p.type)} ${esc(labelPiece(p))}</button>`).join(''):'<span class="small muted">No counters recorded here.</span>'}</div>${routeSummary}<div class="notice compact info"><span>${esc(reviewMark)}</span> · ${links.length} recorded links. ${hButton('map-review-space',mapCheck?.reviewed?'Recheck all connections':'Confirm all connections at this space','btn sm',`data-id="${esc(sp.id)}"`)}</div>${links.length?`<div class="map-neighbors"><span>Verified connections:</span> ${links.map(e=>`<button data-action="select-space" data-id="${esc(e.a===sp.id?e.b:e.a)}" class="btn slim">${esc(e.a===sp.id?e.b:e.a)} ${e.kind==='dashed'?'┄':'—'}</button>`).join('')}</div>`:''}</div>`;
}
function boardPanel(full=false){
 const subtitle='All 36 round spaces, Palo Duro Canyon, five Enemy Squares and the Reservation · original interactive diagram';
 return cardPanel('Game board',boardMap()+selectedDetail(),subtitle,full?hButton('modal-edge','＋ Record verified line','btn sm'):'');
}
function quickActions(){const last=state.log.slice(0,5);return cardPanel('Recent changes',last.length?last.map(x=>`<div class="log-entry"><div class="log-seq">#${x.seq}</div><div><div class="log-desc">${esc(x.description)}</div><div class="log-date">${new Date(x.date).toLocaleString()} · ${x.quality==='verified'?'rule-checked action':'physical-board entry'}</div></div></div>`).join(''):'<div class="empty">The event journal is empty. Record setup counters to begin.</div>','',hButton('go-journal','See journal','btn ghost sm'));}
function quickTracks(){return cardPanel('Adjust record tracks',`<div class="track-grid">${Object.entries({military:'Military',culture:'Culture',ap:'Player AP',enemyAp:'Enemy AP',operations:'Operations position',passage:'Passage of Time'}).map(([key,name])=>`<div class="field"><span>${name}</span><div class="track-input"><button type="button" data-action="adjust-track" data-field="${key}" data-delta="-1">−</button><input id="track-${key}" type="number" min="0" max="${['operations','passage'].includes(key)?20:9}" value="${state.tracks[key]}"><button type="button" data-action="adjust-track" data-field="${key}" data-delta="1">+</button><button type="button" data-action="track-input" data-field="${key}">Set</button></div></div>`).join('')}</div><div class="small muted">Direct changes are logged as manual board entries. Track effects from cards/Planning must be verified using printed rules.</div>`,'Manual reconciliation — never treated as an automatic legal action.');}
function dashboard(){return `${warnings()}${renderStats()}<div class="grid-main"><div class="stack">${procedurePanel()}${officialSetupPanel()}${boardPanel()}</div><div class="stack">${dicePanel()}${quickTracks()}${pointLossPanel()}${cupInventoryPanel()}${quickActions()}${cardPanel('Game snapshot',`<div class="rowline"><span class="muted">Scenario</span><b>${esc(SCENARIOS.find(x=>x[0]===state.scenario)?.[1])}</b></div><div class="rowline"><span class="muted">Colonial powers</span><b>W: ${esc(state.colonial.West)} · S: ${esc(state.colonial.South)} · E: ${esc(state.colonial.East)}</b></div><div class="rowline"><span class="muted">Medicine</span><b>Paraibo: ${state.medicine.paraibo??'—'} · Mahimiana: ${state.medicine.mahimiana??'—'}</b></div><div class="rowline"><span class="muted">Historical period</span><b>${state.period} / 4</b></div><div class="rowline"><span class="muted">Status</span><span class="tag ${state.phase==='setup'?'gold':''}">${state.phase.toUpperCase()}</span></div><div class="rowline"><span class="muted">Recorded counters</span><b>${state.pieces.length}</b></div><div class="rowline"><span class="muted">Recorded connections</span><b>${state.edges.length}</b></div><div class="rowline"><span class="muted">Action journal entries</span><b>${state.log.length}</b></div>`,'Local-only data · not synchronised to other devices.')}</div></div>`;}
function edgesPanel(){const edges=state.edges,coverage=mapCoverage(state);return cardPanel('Recorded map connections',`<p class="intro">Band moves require a recorded printed-board connection; the reference now comes from your uploaded real board photograph. The schematic space index deliberately <strong>does not invent edges.</strong></p><p class="small muted">${coverage.connected} of ${coverage.spaces} indexed spaces have at least one entered link. ${coverage.unlinked.length} remain unlinked in your ledger (not necessarily on the real board).</p><div class="form-end">${hButton('modal-edge','＋ Record printed-map line','btn primary sm')}${hButton('export-map','⇩ Export map lines','btn sm')}</div>${edges.length?`<div class="divider"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>From</th><th>To</th><th>Line</th><th>Evidence</th><th></th></tr></thead><tbody>${edges.map(e=>`<tr><td>${esc(e.a)}</td><td>${esc(e.b)}</td><td>${esc(e.kind)}${e.enemyFor?.length?` · ${esc(e.enemyFor.join(' + '))} enemy`: ''}</td><td>${e.source==='board-photo'?'Uploaded board photograph':e.source==='GMT-playbook'?'GMT tutorial':'Player entry'}</td><td>${hButton('delete-edge','Remove','btn slim',`data-a="${e.a}" data-b="${e.b}"`)}</td></tr>`).join('')}</tbody></table></div>`:''}`,'Connections originate from your map review or your uploaded actual board. Unclear junctions are not inferred.');}
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
 return cardPanel('Map transcription audit',`<p class="intro">How complete is <b>your recorded line network</b>? This never determines if a printed route exists.</p><div class="rowline"><span>Individually checked against physical board</span><b>${reviewed.reviewed} / ${reviewed.total}</b></div><div class="rowline"><span>Checks invalidated by edits</span><b>${reviewed.stale}</b></div><div class="rowline"><span>Spaces with recorded connections</span><b>${audit.connectedSpaces} / ${audit.spaceCount}</b></div><div class="rowline"><span>Recorded network groups</span><b>${audit.components.length} connected group(s)</b></div><div class="rowline"><span>Occupied but unlinked in ledger</span><b>${islands.length}</b></div>${islands.length?`<div class="map-audit-nodes">${islands.slice(0,16).map(id=>hButton('select-space',id,'btn slim',`data-id="${esc(id)}"`)).join('')}</div><p class="small muted">These occupied spaces have no *entered* links. Compare with your printed board before recording a line.</p>`:'<p class="small muted">No occupied space is currently isolated in the entered graph.</p>'}${groups.length?`<p class="small muted">Largest entered connected groups: ${groups.map(x=>`${x.length} spaces`).join(' · ')}</p>`:''}`,'Record every printed link at a space and then confirm that space. Changing any adjacent link invalidates its sign-off. This remains a player-verified transcription, NOT a publisher-certified graph.');
}
function mapEvidencePanel(){
 const ready=MAP_EVIDENCE_EDGES.filter(e=>!state.edges.some(x=>x.a===e.a&&x.b===e.b||x.a===e.b&&x.b===e.a));
 const conflicts=MAP_EVIDENCE_EDGES.filter(e=>state.edges.some(x=>(x.a===e.a&&x.b===e.b||x.a===e.b&&x.b===e.a)&&x.kind!==e.kind));
 const confirmed=MAP_EVIDENCE_EDGES.filter(e=>state.edges.some(x=>
  ((x.a===e.a&&x.b===e.b)||(x.a===e.b&&x.b===e.a)) && x.kind===e.kind)).length;
 const available=ready.length&&!conflicts.length;
 const items=MAP_EVIDENCE_EDGES.map(e=>{
  const seen=state.edges.find(x=>x.a===e.a&&x.b===e.b||x.a===e.b&&x.b===e.a);
  return `<tr><td><b>${esc(e.a)} ↔ ${esc(e.b)}</b></td><td>${e.kind==='dashed'?'Dashed':'Solid'}${e.enemyFor?.length?` · <b>${esc(e.enemyFor.join(' + '))} enemy</b>`:''}</td><td>${esc(seen?(seen.kind===e.kind?'Recorded':'Conflict'):'Not recorded')}</td><td><span class="small muted">${e.reference==='user-board-photo'?'User-supplied board photo':e.page?`Playbook p. ${e.page}`:'Reference image'}</span></td></tr>`;
 }).join('');
 const candidates=MAP_CONNECTION_CANDIDATES.map(e=>`<div class="rowline"><span><b>${esc(e.a)} ↔ ${esc(e.b)}</b><br><small>${esc(e.detail)}</small></span>${hButton('modal-edge','Check & record','btn slim',`data-from="${esc(e.a)}" data-to="${esc(e.b)}"`)}</div>`).join('');
 const body=`<div class="notice compact info">This release includes <b>${MAP_EVIDENCE_EDGES.length} photographed links</b> traced from your actual board. Official opening templates preload these links. Existing games can add them in one action. <b>Only documented or player-confirmed links are unlocked</b>; the remaining map still needs review.</div><div class="rowline"><span>Documented lines present</span><b>${confirmed}/${MAP_EVIDENCE_EDGES.length}</b></div>${conflicts.length?`<div class="notice alert">${conflicts.length} recorded link(s) disagree with the reference. No lines are overwritten; resolve these manually.</div>`:''}<div class="form-end">${hButton('apply-map-evidence',`Add ${ready.length} documented lines`,'btn primary sm',available?'':'disabled')}${hButton('map-documentation','Read source & details','btn sm')}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>From–to</th><th>Printed type</th><th>In your ledger</th><th>Source</th></tr></thead><tbody>${items}</tbody></table></div><h3 style="margin-top:20px">Additional adjacency to check</h3><p class="small muted">A few junctions are partly obscured in the uploaded photograph; confirm these candidates and their line types. They remain blocked until you check their line type.</p>${candidates}<div class="small muted" style="margin-top:12px">Source: ${esc(MAP_EVIDENCE_SOURCE)}. The linked official final-map reference is for checking, not included as copied artwork in this site. <a href="${MAP_EVIDENCE_URL}" rel="noopener" target="_blank">Playbook</a> · <a href="${FINAL_MAP_URL}" rel="noopener" target="_blank">GMT mounted map</a>.</div>`;
 return cardPanel('Documented map connection starter',body,'Transcribed from user-provided actual board photo; obscured junctions remain candidates.');
}
function enemyColorPanel(){
 const data=['West','South','East'].map(enemy=>enemyColorNetwork(state,enemy));
 const intro='<p class="intro">The game distinguishes continuous/dashed movement lines from colored Enemy Connections. This report follows <b>only explicitly color-tagged links</b> in your ledger. Missing color data is treated as unknown, never as permission to move or settle.</p>';
 const rows=data.map(v=>`<tr><td><b>${esc(v.enemy)}</b></td><td>${esc(v.origins.join(', '))}</td><td>${v.eligibleLinks}</td><td>${v.reachable.length?esc(v.reachable.join(', ')):'None traced'}</td></tr>`).join('');
 return cardPanel('Colored Enemy Connection audit',`${intro}<div class="table-wrap"><table class="data-table"><thead><tr><th>Enemy</th><th>Map square(s)</th><th>Color-tagged links</th><th>Verified reachable spaces</th></tr></thead><tbody>${rows}</tbody></table></div><div class="notice compact info">${data[0].unclassified} recorded line(s) have no verified Enemy Connection color. The network is incomplete: <b>do not use this report alone to choose Settlement targets</b>. The printed map, stacking and card rules remain authoritative.</div>`,'Original graph-derived audit; not an automated Settlement action.');
}
function settleAdviserPanel(){
 const reports=['West','South','East'].map(enemy=>settleTargetAudit(state,enemy));
 const rows=reports.map(r=>{
   const preview=r.candidates.slice(0,4).map(x=>`${esc(x.space)} (${x.distance} steps, area ${x.area})`).join(' · ');
   return `<tr><td><b>${esc(r.enemy)}</b></td><td>${r.knownLinks}</td><td>${r.blocked.length}</td><td>${r.nearestKnown?`${esc(r.nearestKnown.space)} (${r.nearestKnown.distance} steps)`:'No known destination'}</td><td class="small">${preview||'None entered'}</td></tr>`;
 }).join('');
 return cardPanel('Settle destination adviser · provisional',`<p class="intro">Living Rules §6.3.8: count <b>colored Enemy Connection</b> steps to an available, unblocked round space, then compare its printed area value. Recorded Bison do not block placement and must return to stock if settlement occurs.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Enemy</th><th>Colored links</th><th>Known blocked</th><th>Nearest recorded</th><th>Other recorded options</th></tr></thead><tbody>${rows}</tbody></table></div><div class="notice alert"><b>Not a legal-placement verdict.</b> The graph is incomplete; an unknown shorter route may exist. East requires a random choice between its two origins. Verify the physical map, supply, stacking, Ravaged counters, History Card, and all printed instruction effects before placing anything.</div>`,'Advisory only · no placement or stock mutation.');
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
function localBoardArtworkPanel(){
 const url=boardImageUrl();
 const controls='<p class="intro">Optionally choose an image of your Comanchería board from your local files. It stays in this browser and is not uploaded. This is a visual reference, not a verified map connection source.</p>'+'<div class="form-end"><button class="btn sm" data-action="choose-tts-board">Choose local board image</button>'+hButton('clear-tts-board','Remove image','btn sm')+'</div>'+'<input id="tts-board-picker" type="file" accept="image/png,image/jpeg,image/webp" hidden>';
 const preview=url?'<div style="margin-top:12px"><img src="'+esc(url)+'" alt="Your locally selected Comanchería board image" style="width:100%;height:auto;max-height:70vh;object-fit:contain" loading="lazy"></div>':'<p class="small muted">No local board image selected. The original interactive schematic remains below.</p>';
 return cardPanel('Local board image reference',controls+preview,'Browser-local artwork; map graph and counter movements still use the engine.');
}
function boardPage(){return `${localBoardArtworkPanel()}${warnings()}${renderStats()}<div class="board-page-full">${boardPanel(true)}</div><div class="grid-main"><div class="stack">${mapEvidencePanel()}${enemyColorPanel()}${settleAdviserPanel()}${subjugateAdviserPanel()}${mapFactPanel()}${boardNetworkPanel()}${territoryControlPanel()}${edgesPanel()}</div><div class="stack">${routePlannerPanel()}${cardPanel('Board assistance',`<div class="notice info">Select any numbered space on the map to inspect its physical counters. Recorded connections appear as lines; clicking a connected destination offers the validated one-edge Band action during Take Actions.</div><p class="intro">Use <b>Connect spaces</b> to select endpoints on the diagram, then confirm the line against your printed board. The diagrams' positions are original, approximate navigation coordinates—not an official board scan or proof of adjacency.</p><div class="rowline"><span class="muted">Indexed spaces</span><strong>${SPACES.length}</strong></div><div class="rowline"><span class="muted">Recorded connections</span><strong>${state.edges.length}</strong></div>`)}</div></div>`;}
function filterPieces(){return sortedPieces(state).filter(p=>(stateUI.pieceType==='All'||p.type===stateUI.pieceType) && (!stateUI.pieceFilter||`${p.label} ${p.type} ${p.subtype} ${formatLocation(state,p.location)}`.toLowerCase().includes(stateUI.pieceFilter.toLowerCase())));}
function piecesTable(){const rows=filterPieces();return `${rows.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Counter</th><th>Details</th><th>Position / possessor</th><th>Owner</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td><span class="mini-icon">${smallIcon(p.type)}</span><b>${esc(p.label)}</b><div class="tiny muted">${esc(p.type)}</div></td><td>${esc(details(p))}</td><td>${esc(formatLocation(state,p.location))}</td><td>${esc(getOwner(p))}</td><td>${hButton('edit-piece','Edit','btn slim',`data-id="${p.id}"`)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No counters match the current filters. Use “Record piece” to add the first one.</div>`}`;}
function piecesPage(){return `${warnings()}${renderStats()}${cardPanel('Piece registry',`<div class="filters"><input class="control" id="piece-filter" placeholder="Filter pieces or spaces…" value="${esc(stateUI.pieceFilter)}"><select class="control" id="piece-type-filter">${options(['All',...PIECE_TYPES],stateUI.pieceType)}</select>${hButton('modal-add-piece','＋ Add counter','btn primary sm')}</div><div id="piece-results">${piecesTable()}</div>`,'Independent counters, positions and attachments · source of truth for the tracker.')}${cardPanel('Physical counter handling',`<p class="intro">Use <b>Resources box — Ranchería</b> for Bands stored in that Ranchería, or <b>Possessed by Band</b> for Horse, Captives, Bison, Mahimiana, etc. The board is a manual mirror: you must physically move each counter to match your recorded action.</p><div class="notice info">Removed from game is permanent in the rules engine. Out of play / stock is reusable. You can set physical supply caps by category in Settings.</div>`)}`;}
function enemyInstructionPreviewPanel(){
 const data=enemyApPreview(state);
 const body=`<p class="intro">Rule 6.2.2 AP budget from counters actually recorded in your ledger. This does <b>not</b> spend APs or execute printed Instructions. Select the active Enemy on your <b>History Card</b>, and check the currently topmost instruction.</p>
 <div class="rowline"><span>Stored Enemy AP</span><b>${data.stored}</b></div>
 <div class="rowline"><span>Available AP counters (${data.counters})</span><b>${data.available}</b></div>
 <div class="rowline"><span>Combined for enemy resolution</span><b>${data.total}</b></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th>Enemy</th><th>Topmost counter</th><th>Printed cost</th><th>Budget</th></tr></thead><tbody>${data.enemies.map(x=>`<tr><td>${esc(x.enemy)}</td><td>${esc(x.top?.label||'none recorded')}</td><td>${x.cost??'<span class="muted">Unknown</span>'}</td><td>${x.affordable===null?'Verify counter':x.affordable?'Enough AP':'Not enough AP'}</td></tr>`).join('')}</tbody></table></div>
 <p class="small muted">To enter the <b>printed Instruction AP cost</b>, edit its <b>Strength / value</b> field in Pieces & stock. Zero means unrecorded, not free. For accurate budget estimates, move each drawn Enemy AP counter into the Available Enemy APs box. Enemy action tables, Instruction effects, change-making and display resets remain physical/manual.</p>`;
 return cardPanel('Enemy Instructions · AP budget assistant',body,'Calculation only · §6.2.2; no unverified enemy actions');
}
function enemyProcedurePanel(){
 const {flow,budget,top,topCost,canPay,activeCounters,audit}=enemyFlowPreview(state);
 const active=state.phase==='cleanup'||state.phase==='execution'&&state.operation==='Planning';
 const unready=state.phase==='setup'||state.phase==='gameover'||state.pending||state.warMovement||state.battlePending||state.battleContinuation||state.successCheck;
 if(!flow){
  if(!active)return '';
  return cardPanel('Guided Enemy Instruction procedure · §6.2.2',`
   <p class="intro">Choose the active Enemy using the printed History Card. Enter the physical die and manually select its <strong>matching display row</strong>. The app does not assume A=1, B=2, etc. Paid instructions spend recorded Enemy APs; free instructions resolve one top counter. Printed §6.3 effects still need physical confirmation.</p>
   <form id="enemy-begin-form"><div class="form-grid">
     <label class="field"><span>Procedure</span><select name="kind">${options(state.phase==='cleanup'?[['paid','Cleanup: spend Enemy APs'],['free','Cleanup: one free Instruction']]:[['free','Planning: one free Instruction']])}</select></label>
     <label class="field"><span>Enemy from History Card</span><select name="enemy">${options(ENEMY_COLUMNS,'North')}</select></label>
     <label class="field"><span>Die rolled (1–6)</span><input name="die" type="number" min="1" max="6" value="1" required></label>
     <label class="field"><span>Row matching printed die symbol</span><select name="row">${options(DISPLAY_ROWS,'A')}</select></label><label class="field"><span>History Card exception, only if you chose a different Enemy from the known H1 example</span><input name="historyOverride" minlength="15" maxlength="250" placeholder="Card/rule exception"></label>
   </div><label class="small"><input type="checkbox" name="ack" required> I read the History Card and printed display symbols; selected Enemy and row are correct.</label>
   <div class="form-end"><button class="btn primary sm" ${unready?'disabled':''} type="submit">Begin guided enemy procedure</button></div></form>
   <div class="small muted">Source-backed examples on H1: die 2 → North, 3 → West, 4 → West, 6 → South. Results 1 and 5, other History Cards, and card overrides still require the printed table.</div>
   <div class="small muted">Recorded Enemy AP: ${budget.stored} track + ${budget.available} from ${budget.counters} counters = ${budget.total}. The source rules require a physical die roll; this interface does not infer a result.</div>`, 'Manual game/card effects remain necessary.');
 }
 const autoCulture=flow.stage==='effect'&&instructionName(state.pieces.find(p=>p.id===flow.currentId))==='Culture Attack'?hButton('enemy-auto-culture','Resolve Culture Attack + instruction automatically','btn primary sm'):'';
 const selected=state.pieces.find(p=>p.id===flow.currentId);
 const topInfo=top?`${esc(top.label)} · ${topCost??'unknown'} AP`:'No Instruction in active column';
 const heading=`${esc(flow.enemy)} · ${flow.kind==='paid'?'paid':'free'} · ${esc(flow.stage)}`;
 let body=`<div class="notice info"><b>Enemy Procedure in progress</b> — ${heading}. Printed die ${flow.die}, row ${flow.row}; ${flow.executed} Instruction(s) confirmed.</div>
  <div class="rowline"><span>Stored Enemy AP</span><b>${budget.stored}</b></div><div class="rowline"><span>Available counter AP</span><b>${budget.available}</b></div><div class="rowline"><span>Total</span><b>${budget.total}</b></div>
  <div class="rowline"><span>Top Instruction</span><b>${topInfo}</b></div>`;
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
   if(instructionName(selected)==='Peace'){
     const peace=peaceTargetPreview(state,flow.enemy);
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy Peace · §6.3.5</h3>
     <p class="small muted">Peace at ${esc(peace.square)} also grants Peace status to that Enemy's Settlements${flow.enemy==='East'?' and both East squares':''}.</p>
     ${flow.peaceResolved?'<div class="notice info">Peace placed and saved. Mention Peace in the final Instruction confirmation.</div>':
       peace.recoverFirst||peace.unknownRavaged?'<div class="notice alert">Resolve Recover priority or unclassified Ravaged markers first.</div>':
       peace.requiresWarProcedure?'<div class="notice alert">Active War Column: apply the special Peace/War Column resolution under §6.3.5 manually. Automatic Peace placement is blocked.</div>':
       peace.replace.length?'<div class="notice alert">An earlier Peace counter is on this Enemy square. Return it to a verified Inactive row manually before recording a new Peace.</div>':
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
   if(instructionName(selected)==='Encroach'||(instructionName(selected)==='Ally'&&allyTargetPreview(state,flow.enemy).encroachInstead)){
     const encroachOrder=['UA','LA','LE','RG','BC','RR'];
     const preview=encroachTargetPreview(state,1,encroachOrder);
     const canPlace=state.pieces.some(p=>p.type==='Tribe'&&p.location==='reserve');
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy Encroach · §6.3.3</h3><p class="small muted">Verify map die symbols (1 = Upper Arkansas, 2 = Lower Arkansas, 3 = Llano Estacado); enter the die, the other four territory labels and the desired Tribe space. The engine checks the first eligible territory, stacking, Tribe stock and displaced Bison.</p>
       ${flow.encroachResolved?'<div class="notice info">Encroach has been recorded. Mention it in the final Instruction confirmation.</div>':
       `<form id="enemy-encroach-form"><div class="form-grid"><label class="field"><span>Territory die</span><select name="die">${[1,2,3,4,5,6].map(x=>option(x,String(x),1)).join('')}</select></label>
       ${[4,5,6].map(die=>`<label class="field"><span>Printed territory die ${die}</span><select name="face${die}">${TERRITORIES.filter(t=>!['UA','LA','LE'].includes(t[0])).map(t=>option(t[0],t[1],encroachOrder[die-1])).join('')}</select></label>`).join('')}
       <label class="field"><span>Tribe in stock</span><select name="tribeId">${state.pieces.filter(p=>p.type==='Tribe'&&p.location==='reserve').map(p=>option(p.id,p.label)).join('')}</select></label>
       <label class="field"><span>New Tribe space</span><select name="space">${SPACES.filter(p=>p.type==='round').map(p=>option(p.id,p.name)).join('')}</select></label></div>
       <label class="small"><input type="checkbox" name="ack" required> I verified die symbols, Tribe availability, printed card exceptions and placement.</label>
       <div class="form-end"><button class="btn primary sm" type="submit" ${canPlace?'':'disabled'}>Resolve Encroach placement</button></div></form>`}
       ${!canPlace?'<p class="small muted">No Tribe in stock: Encroach redirects to Hunt. Use the Hunt form below.</p>':''}</div>`;
   }
   if(instructionName(selected)==='Hunt'||instructionName(selected)==='Encroach'){
     const huntOrder=['UA','LA','LE','RG','BC','RR'];
     body+=`<div class="panel" style="margin:12px 0;padding:12px"><h3>Digital Enemy Hunt · §6.3.4</h3>
       <p class="small muted">GMT playbook confirms die face 1 = Upper Arkansas and 2 = Lower Arkansas. Verify the four remaining die-symbol territories on your map. The app will cycle to the next die territory until it finds Bison, then draw one randomly without replacement.</p>
       ${flow.huntResolved?`<div class="notice info">Hunt recorded: ${esc(flow.huntResolved.bisonId||'No Bison on the board')}. Mention Hunt in the final confirmation.</div>`:
       `<form id="enemy-hunt-form"><div class="form-grid"><label class="field"><span>Territory die rolled</span><select name="die">${[1,2,3,4,5,6].map(x=>option(x,String(x),1)).join('')}</select></label>
       ${[3,4,5,6].map((die,i)=>`<label class="field"><span>Printed territory die ${die}</span><select name="face${die}">${TERRITORIES.filter(t=>!['UA','LA','LE'].includes(t[0])).map(t=>option(t[0],t[1],huntOrder[die-1])).join('')}</select></label>`).join('')}</div>
       <label class="small"><input type="checkbox" name="ack" required> I verified the printed die symbols and current Bison locations. No unseen card overrides apply.</label>
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
    <p class="small muted">Use this form only if the printed Instruction calls for Subjugate (directly or by a verified redirect). The colored map is incomplete; the physical board and card take precedence. Allied Tribe removal remains manual.</p>
    ${subjugate.recoverFirst?'<div class="notice alert">Recover takes priority; do not use Subjugate until that effect is resolved.</div>':subjugate.recordedTribes?`<form id="enemy-subjugate-form">
    <label class="field"><span>Physical Tribe target</span><select name="tribeId">${state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]?.type==='round').map(p=>option(p.id,`${p.label} · ${p.location}`)).join('')}</select></label>
    ${flow.enemy==='East'?`<label class="field"><span>East starting square, physically selected</span><select name="eastOrigin"><option value="">Choose the actual square</option><option value="E1">E1</option><option value="E2">E2</option></select></label>`:''}
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
    <p class="small muted">Use only when the printed Instruction calls for Settle. Confirm the nearest eligible destination along <b>colored</b> Enemy Connections, not ordinary lines. The incomplete graph is only a guide.</p>
    ${stock.length&&targets.length?`<form id="enemy-settle-form">
    <label class="field"><span>Available physical Settlement</span><select name="settlementId">${stock.map(p=>option(p.id,`${p.label} · ${p.owner}`)).join('')}</select></label>
    <label class="field"><span>Physically verified destination</span><select name="space">${targets.map(p=>option(p.id,`${p.name}${settle.nearestKnown?.space===p.id?' · nearest recorded':''}`)).join('')}</select></label>
    ${flow.enemy==='East'?`<label class="field"><span>East starting square (randomly selected)</span><select name="eastOrigin"><option value="">Select the physical result</option><option value="E1">E1</option><option value="E2">E2</option></select></label>`:''}
    <label class="field"><span>Printed map, History Card and rule verification</span><textarea name="mapVerification" required minlength="25" maxlength="400" placeholder="Confirmed the closest legal space by printed colored routes, physical stacking and stock..."></textarea></label>
    <label class="small"><input type="checkbox" name="randomConfirmed"> I performed any necessary random tie-break</label>
    <label class="small"><input type="checkbox" name="unmappedRouteConfirmed"> I verified a route missing or different from the app's incomplete graph</label>
    <label class="small"><input type="checkbox" name="bisonConfirmed"> I will return all Bison in the selected space to stock physically</label>
    <label class="small"><input type="checkbox" name="ack" required> I checked the printed §6.3.8 effect and the correct physical counter</label>
    <div class="form-end"><button type="submit" class="btn primary sm">Record verified Settlement placement</button></div></form>`:'<p class="small muted">No recorded Settlement stock or unblocked numbered spaces; consult the printed Subjugate fallback instead.</p>'}</div>`;
   }
   if(flow.settleResolved)body+=`<div class="notice info">Settle recorded: Settlement ${esc(flow.settleResolved.settlementId)} placed in ${esc(flow.settleResolved.space)}; ${flow.settleResolved.bisonIds.length} Bison returned to stock. Mention Settle in the effect confirmation. Undo to correct.</div>`;

   body+=`<div class="notice alert">Read and resolve <b>${esc(selected?.label||'Instruction')}</b> under printed §6.3. Update counters in Pieces & stock and any point losses before confirming. The app will then put the Instruction into its same-row Inactive slot; it will block stacking.</div>
    <div class="form-end">${hButton('go-pieces','Open piece ledger','btn sm')}</div>
    <form id="enemy-confirm-form"><label class="field"><span>Record all physical outcomes / substitutions / card exceptions</span><textarea name="note" minlength="12" maxlength="600" required placeholder="Effect of printed Instruction: placement, point losses, replacements…"></textarea></label>
    <label class="small"><input type="checkbox" name="ack" required> I completed the printed Instruction effect and reconciled the physical pieces.</label><div class="form-end"><button type="submit" class="btn primary sm">Confirm effect and move Instruction</button></div></form>`;
 }
 if(['choose','done'].includes(flow.stage)){
   body+=`<form id="enemy-finish-form"><label class="field"><span>Printed-card exception if another top Instruction is affordable (only if relevant)</span><input name="overrideReason" maxlength="250" placeholder="Card identifier and reason this procedure stops early"></label>
   <label class="small"><input type="checkbox" name="ack" required> I checked remaining AP counters, General Records Track and Enemy Instruction Display.</label><div class="form-end"><button type="submit" class="btn sm">Finish procedure & reset display</button></div></form>`;
 }
 return cardPanel('Guided Enemy Instruction sequence · §6.2.2',body,'Step-by-step AP accounting and display moves; printed card effects are not automated.');
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
     ${choices.length?`<form id="war-move-step-form"><label class="field"><span>One recorded adjacent connection</span><select class="control" name="to">${options(choices.map(c=>[c.to,`${c.to} (${c.kind})${c.permitted?'':' — CARD EXCEPTION REQUIRED'}`]))}</select></label><label class="field"><span>Printed card exception for dashed line (if needed)</span><input name="overrideReason" maxlength="200" placeholder="Card ID and permission for colonial dashed movement"></label><label class="small"><input type="checkbox" name="cardOverride"> Card explicitly permits dashed line exception</label><label class="small"><input type="checkbox" name="ack" required> I confirmed this step moves toward the correct printed-card target and does not skip a mandatory stop.</label><div class="form-end"><button type="submit" class="btn primary sm">Record one War Column step</button></div></form>`:'<div class="notice info">No permitted next connection is recorded, or movement is complete/stopped. Confirm the printed board before finishing.</div>'}
     <div class="divider"></div><form id="war-move-finish-form"><label class="field"><span>Reason for stopping before the full allowance, if applicable</span><textarea name="reason" maxlength="400" placeholder="Target occupied; no visible target; printed War Card effect; or not enough entered graph lines…"></textarea></label><label class="small"><input name="ack" type="checkbox" required> War Card movement and any required strength-loss/card effects were physically reconciled.</label><div class="form-end"><button type="submit" class="btn primary sm">Finish this War Column movement</button>${movement.route.length===1?hButton('war-move-cancel','Cancel before moving','btn sm'):''}</div></form>`, 'Only adjacency, allowed step count, normal dashed restrictions and visible stops are checked automatically.');
 }
 const autoCardOptions=WAR_CARD_DATA.filter(c=>c.movement).map(c=>[c.id,`${c.id} — ${Object.entries(c.movement).map(([e,n])=>e+' '+n).join(', ')}`]);
 const autoUI=`<div class="notice info">New: execute §3.1 War movement across all activated columns using the recorded map graph. The engine chooses the nearest visible Ranchería (else Band), applies Alphabetic Priority, and stops on defenders. Missing routes and unsupported War Ends fail closed.</div>
 <div class="form-end">${hButton('war-draw-movement','Draw War Card + move columns (step 1)','btn primary sm',Boolean(state.steps.w1)?'disabled':'')}</div>
 <details><summary>Manual movement-card override (for physical card reconciliation)</summary><form id="war-auto-move-form"><label class="field"><span>Printed movement card</span><select name="card" class="control">${options(autoCardOptions)}</select></label><div class="form-end"><button type="submit" class="btn sm" ${state.steps.w1?'disabled':''}>Apply selected movement</button></div></form></details>
 <div class="form-end">${hButton('war-auto-attrition','Roll all War Column attrition (step 2)','btn sm',state.steps.w1!=='done'||Boolean(state.steps.w2)?'disabled':'')} ${hButton('war-draw-event','Draw War Event (step 3)','btn primary sm',state.steps.w2!=='done'||Boolean(state.steps.w3)?'disabled':'')}</div>`;
 if(!warPieces.length)return cardPanel('War Card movement · §3.1',autoUI+'<div class="notice info">No active War Columns are recorded.</div>');
 return cardPanel('War Card movement assistant · §3.1',autoUI+`
 <p class="intro">Read the War Card and choose an <b>active</b> War Column. Enter that card’s movement allowance. The app checks each map connection, normal Colonial dashed-line restrictions and stops at visible defenders. It <b>cannot verify</b> the true nearest Ranchería, activation on the War Card or unentered connections.</p>
 <form id="war-move-begin-form"><div class="form-grid"><label class="field"><span>Active War Column</span><select name="warId" class="control">${options(warPieces.map(p=>[p.id,`${p.label} · ${p.owner} · ${p.location}`]))}</select></label><label class="field"><span>Movement allowance printed on War Card</span><input name="allowed" type="number" min="1" max="8" value="1" required></label><label class="field"><span>War Card identifier / printed trigger</span><input name="card" maxlength="120" placeholder="Card number / printed move symbol" required></label></div><label class="small"><input type="checkbox" name="ack" required> I confirmed this War Column is active under this War Card and read its movement instructions.</label><div class="form-end"><button class="btn primary sm" type="submit">Start guided movement</button></div></form>`, 'Requires printed War Card, map and card effect verification.');
}
function enemyDisplayPanel(){
 const audit=enemyDisplayAudit(state);
 const valid=state.phase!=='setup'&&state.phase!=='gameover'&&!state.pending&&!state.successCheck&&!state.battlePending&&!state.battleContinuation&&!state.warMovement;
 const rowHTML=DISPLAY_ROWS.map(row=>`<tr><td><b>${row}</b></td>${ENEMY_COLUMNS.map(enemy=>{const piece=audit.columns[enemy].rows.find(x=>x.row===row)?.piece;return `<td>${piece?esc(piece.label):'<span class="muted">—</span>'}</td>`;}).join('')}<td>${audit.inactive.find(x=>x.row===row)?.piece?esc(audit.inactive.find(x=>x.row===row).piece.label):'<span class="muted">—</span>'}</td></tr>`).join('');
 const sourceForm=valid?`<form id="enemy-reset-form"><label class="field"><span>What printed procedure requires this reset?</span><input name="source" minlength="10" maxlength="250" required placeholder="§6.2.2.A step 6, after spending Enemy APs"></label><label class="small"><input type="checkbox" name="ack" required> I verified the printed §6.2.3 reset and will mirror its counter positions on the physical display.</label><div class="form-end"><button class="btn primary sm" type="submit" ${audit.problems.length?'disabled':''}>Reset instruction columns</button></div></form>`:'<p class="small muted">Reset is available only when the rules call for it, while no other guided procedure is unfinished.</p>';
 return cardPanel('Enemy Instruction Display audit · §§6.2.1–6.2.3',`
 <p class="intro">Original table representation of your entered <b>top-to-bottom slots</b>. Row letters here are tracker positions, not a claim about printed dice symbols or counter identities. The printed card determines active Enemy and specific Instruction effects.</p>
 ${audit.problems.map(v=>`<div class="notice alert">${esc(v)}</div>`).join('')}
 <div class="table-wrap"><table class="data-table"><thead><tr><th>Slot</th>${ENEMY_COLUMNS.map(e=>`<th>${e}</th>`).join('')}<th>Inactive</th></tr></thead><tbody>${rowHTML}</tbody></table></div>
 <p class="small muted">When §6.2.3 calls for a reset, active counters compact upward, then inactive counters move from bottom up into their own Enemy column’s topmost available slot. This is display housekeeping only: <b>no Enemy Instruction effects or AP spending are automated</b>.</p>
 ${sourceForm}`,'Explicit printed-rule confirmation · no unverified action table rolls.');
}
function battlePanel(){
 if(state.phase!=='war' && !state.battlePending && !state.battleContinuation)return '';
 const b=state.battlePending;
 if(b){
  const war=state.pieces.find(p=>p.id===b.warId),unit=state.pieces.find(p=>p.id===b.unitId);
  return cardPanel('Battle round · physical reconciliation required',`<div class="notice ${b.won?'info':'alert'}"><strong>${b.won?'Comanche wins':'Enemy wins'} this round.</strong> Natural result ${b.natural}, modified ${b.modified}. ${esc(b.expected)}</div>
   <div class="battle-dice">${b.dice.map(d=>`<span class="battle-die">${d}</span>`).join('')}<span class="small muted">${b.gunId?'Highest die chosen; Guns spent.':'Single die.'}</span></div>
   <p class="intro">Update <b>${esc(war?.label||'War Column')}</b> and/or <b>${esc(unit?.label||'fighting unit')}</b> in <b>Pieces & stock</b> to match the printed procedure before confirming. For 0-strength Bands, clear all possessions before returning the Band to stock. For War Ends, return the War Column to stock and physically reconcile its paired Instruction. Follow any card exceptions.</p>
   <div class="form-end">${hButton('battle-auto-reconcile','Apply simple Battle outcome automatically','btn primary sm')} ${hButton('go-pieces','Edit piece ledger','btn sm')}</div>
   <form id="battle-reconcile-form"><label class="field"><span>Physical board, instruction and card reconciliation note</span><textarea name="note" minlength="12" required placeholder="What counters were changed, which War instruction returned, Mahimiana/Ally/Ranchería effects…"></textarea></label>
   ${!b.won&&b.rancheriaId&&b.unitStrength===1?`<label class="small"><input name="lossConfirmed" type="checkbox"> If the last Band was defeated: I recorded the mandatory Military losses and destruction effects under §§3.1, 2.5.3.</label>`:''}
   <label class="small"><input name="ack" type="checkbox" required> All physical effects and counter ledger changes for this round were completed.</label><div class="form-end"><button class="btn primary sm" type="submit">Confirm reconciled Battle round</button></div></form>`, 'Guided calculation cannot replace physical War Ends, Band-counter replacement, or headman procedure.');
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
 const outstanding=warBattleObligations(state).filter(b=>!b.exempt);
 const audit=outstanding.length?`<div class="notice alert"><b>War Phase audit:</b> ${outstanding.length} War Space(s) contain a recorded defending unit. Resolve each Battle before advancing or explicitly document a card/rule exception.</div>`:'<div class="notice info">No unresolved eligible War Spaces are detected in this counter ledger. Verify the physical board and cards.</div>';
 const exceptions=outstanding.length&&!during?`<details style="margin-top:12px"><summary class="small">Document an alternative to Battle (printed rule/card)</summary><form id="battle-exception-form"><label class="field"><span>War Column</span><select name="warId">${options(outstanding.map(o=>[o.warId,`${o.warLabel} · ${formatLocation(state,o.location)}`]))}</select></label><label class="field"><span>What printed rule/card permits no Battle?</span><textarea name="reason" minlength="15" required placeholder="For example, Ranchería chose the §3.1 alternative and the printed costs/effects were recorded…"></textarea></label><label class="small"><input type="checkbox" name="ack" required> I verified and applied the alternative procedure on the physical board.</label><div class="form-end"><button class="btn sm" type="submit">Record documented exception</button></div></form></details>`:'';
 const main=!wars.length?'<div class="notice info">No recorded War Column on the map. Add the physical column and its strength counter as a War Column piece before using the adviser.</div>':!units.length?`<label class="field"><span>War Column</span><select class="control" id="battle-war-select">${options(wars.filter(w=>!during||w.id===during.warId).map(w=>[w.id,`${w.label} · ${formatLocation(state,w.location)} · strength ${w.strength}`]),warId)}</select></label><div class="notice info">No eligible Band / Allied Tribe is recorded in this War Space. Use the physical board to establish whether Battle is required, then record the defending unit.</div>`:
 `<form id="battle-roll-form"><div class="form-grid"><label class="field"><span>War Column</span><select class="control" id="battle-war-select" name="warId">${options(wars.filter(w=>!during||w.id===during.warId).map(w=>[w.id,`${w.label} · ${w.location} · strength ${w.strength}`]),warId)}</select></label>
 <label class="field"><span>Fighting unit</span><select class="control" id="battle-unit-select" name="unitId">${options(units.map(u=>[u.id,`${u.label} · ${u.type==='Band'?'strength '+u.strength:'allied Tribe'}`]),unitId)}</select></label>
 <label class="field"><span>Guns to spend (two dice)</span><select class="control" name="gunId">${option('','No Guns (one die)')}${options(guns.map(g=>[g.id,g.label]))}</select></label>
 <label class="field"><span>Participating Mahimiana (+1)</span><select class="control" name="mahimianaId">${option('','None')}${options(chiefs.map(m=>[m.id,m.label]))}</select></label>
 <label class="field"><span>Die result(s) 1–6</span><input name="dice" placeholder="4 or 2,6 if spending Guns" required></label>
 <label class="field"><span>Printed War Column DRM (subtract)</span><input type="number" min="0" max="8" name="warDrm" required placeholder="Read physical strength counter"></label>
 <label class="field"><span>Card modifier (signed)</span><input type="number" min="-12" max="12" name="cardDrm" value="0" required></label>
 <label class="field"><span>Source for nonzero card modifier</span><input name="cardReason" placeholder="Card # and printed effect"></label></div>
 <p class="small muted">${esc(unit?.label||'Unit')}: ${unit?.type==='Band'?`strength ${unit.strength}${unit.finished?' · Finished (−1)':''}`:'Allied Tribe (+2)'}. Unmodified 1 loses; unmodified 6 wins. Spending a possessed Guns counter requires two physical dice and selects the higher die. Card overrides still require review.</p>
 <label class="small"><input type="checkbox" name="ack" required> Confirm physical dice, printed War DRM and active card effects.</label>
 <div class="form-end"><button class="btn primary sm" type="submit">Calculate & record Battle round</button></div></form>`;
 return cardPanel('Guided Battle scorecard · §7',`${audit}${during?`<div class="notice alert"><b>Another round is required</b> against the same War Column unless a printed card/rule changes the procedure.</div>`:''}<p class="intro">Records a single round and prevents advancing the phase until the physical board has been reconciled. It never reads unentered War Column DRMs or card text automatically.</p>${main}${during?`<details style="margin-top:12px"><summary class="small">Document a printed card/rule exception that ends this Battle</summary><form id="battle-close-form"><label class="field"><span>Card or rule reference and reason</span><textarea name="reason" minlength="15" required></textarea></label><label class="small"><input type="checkbox" name="ack" required> The physical board is reconciled.</label><button class="btn sm" type="submit">Close Battle with documented exception</button></form></details>`:''}${exceptions}`, 'Only regular War Column Phase Battles are supported, not card-triggered Battles.');
}
function operationsPage(){return `${warnings()}${renderStats()}<div class="grid-main"><div class="stack">${procedurePanel()}${warMovementPanel()}${battlePanel()}${enemyDisplayPanel()}${enemyProcedurePanel()}${state.enemyFlow?.stage==='effect'&&instructionName(state.pieces.find(p=>p.id===state.enemyFlow.currentId))==='Culture Attack'?cardPanel('Automatic enemy resolution',hButton('enemy-auto-culture','Calculate Culture Attack and move Instruction','btn primary sm'),'Stops if Recover or unverified card exceptions apply.'):''}${developmentAutomationPanel()}${cultureAndOperationsPanel()}${routePlannerPanel()}${dicePanel()}${cardPanel('What this tracker validates',`<ul class="bullet-list"><li>Player AP, Enemy AP, Military and Culture tracks cannot exceed 9.</li><li>Mandatory Passage of Time blocks choosing other Operations when indicated.</li><li>Hunt requires a Bison and adequate movement points.</li><li>Move requires a player-recorded adjacent map connection and enough movement points.</li><li>Trade checks the target type, Ravaged restrictions, AP cost and possession.</li><li>Cleanup cannot finish with basic stacking conflicts or unchecked steps.</li></ul>`,'Full enemy AI, cards, medicine tracks and all Success Check contexts are not yet automated.')}</div><div class="stack">${quickTracks()}${pointLossPanel()}${cupInventoryPanel()}${enemyInstructionPreviewPanel()}${cardPanel('Current operation',`<div class="rowline"><span class="muted">Phase</span><span class="tag gold">${state.phase.toUpperCase()}</span></div><div class="rowline"><span class="muted">Operation</span><b>${esc(state.operation||'Not selected')}</b></div><div class="rowline"><span class="muted">Mandatory Passage</span><b>${requiredPassage(state)?'YES':'No'}</b></div><div class="rowline"><span class="muted">Active Band</span><b>${esc(state.pieces.find(p=>p.id===state.activeBandId)?.label||'None')}</b></div><div class="form-end">${hButton('toggle-mandatory',state.mustPassage?'Clear mandatory marker':'Mark must Passage','btn sm')}</div>`,'Manual marker entry for the physical Operations track.')}</div></div>`;}
/** Card inventory is a ledger of physical cards, not card-effect automation. */
function cardInventorySummary(){
 const kinds=['Development','History','Culture','War'];
 return `<div class="notice compact info"><strong>Tracked card inventory:</strong> ${kinds.map(kind=>`${kind}: ${state.cards.filter(c=>c.kind===kind).length}`).join(' · ')}. Opening War/Culture entries are unnamed physical-card placeholders; check printed cards.</div>`;
}
function ttsFolderPanel(){
 const content='<p class="intro">Choose your Tabletop Simulator Mods/Images folder (or a folder of pre-extracted cards). No image is uploaded.</p>'+'<div class="form-end"><button class="btn primary sm" type="button" data-action="choose-tts-folder">Select TTS images folder</button>'+hButton('clear-tts-images','Remove local images','btn sm')+'</div>'+'<input id="tts-folder-picker" type="file" webkitdirectory directory multiple accept="image/png,image/jpeg,image/webp" hidden>'+'<p class="small muted">Local card faces: <b>'+localCardCount()+' / '+CARD_REFERENCE.length+'</b>. Select the folder again to refresh. Browsers require you to grant access.</p>';
 return cardPanel('Local Tabletop Simulator artwork',content,'Art is stored in this browser only, separate from saved games.');
}
function cardReferencePanel(){
 const kind=stateUI.referenceKind,available=CARD_REFERENCE.filter(c=>c.kind===kind);
 const selected=available.find(c=>c.id===stateUI.referenceSelected)||available[0];
 const url=selected?cardImageUrl(selected.id):null;
 let content='<div class="notice compact info">The website has no bundled GMT card images. Select your local TTS files to see the real cards. Without them, gameplay remains available.</div>';
 content+='<label class="field"><span>Card family</span><select id="reference-kind" class="control">'+options(['War','Development','Culture','History'],kind)+'</select></label>';
 content+='<label class="field"><span>Select card</span><select id="reference-card" class="control">'+available.map(c=>option(c.id,c.label,selected?.id)).join('')+'</select></label>';
 if(selected&&url){content+='<div class="card-reference-view"><img src="'+esc(url)+'" alt="'+esc(selected.label)+'" loading="lazy" width="450" height="630"><div class="small muted"><b>'+esc(selected.label)+'</b><p>Source sheet: '+esc(selected.sourceSheet)+' · face '+selected.sheetIndex+'. Saved only in this browser.</p><a href="'+esc(url)+'" target="_blank" rel="noopener">Open card image</a></div></div>';}
 else if(selected){content+='<div class="notice info">'+esc(selected.label)+': no cached image. Select a local TTS images folder above.</div>';}
 return ttsFolderPanel()+cardPanel('Card reference · local artwork',content,'War/Culture positions are source-sheet ordinals, not certified printed card numbers.');
}
async function showLocalCard(id){try{await loadCardImage(id);if(stateUI.tab==='cards'&&(!id||stateUI.referenceSelected===id))render();}catch(e){notify('Cannot load local card: '+e.message,true);}}
async function importTtsFolder(files){try{notify('Processing your selected TTS images locally…');const x=await importLocalCards(files);notify(x.imported?'Cached '+x.total+' card faces from '+x.sheetsFound+' TTS sheets and '+x.individualsFound+' individual images.':'No matching Comanchería files were found in that folder.',!x.imported);render();await showLocalCard(stateUI.referenceSelected||'war-01');}catch(e){notify('Artwork import failed: '+e.message,true);}}
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
 ${state.phase==='cleanup'&&id==='W23'&&!state.warHigherStakesResolved?hButton('resolve-higher-stakes','Resolve W23 cleanup outcome','btn primary sm'):''}
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
 const verifiedHands=['11','13','15','16','17','18','28','32','35','36','39','40','42','54','59'];const handCards=verifiedHands.filter(n=>state.cards.some(c=>c.kind==='Development'&&Number(c.identifier)===Number(n)&&c.zone==='Hand'));
 const warColumns=state.pieces.filter(p=>p.type==='War Column'&&SPACE[p.location]);const tribes=state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]);
 const ranches=state.pieces.filter(p=>p.type==='Rancheria'&&SPACE[p.location]);
 const stockGoods=state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Trade Goods'&&p.location==='reserve');
 return cardPanel('Development effects · source-verified engine',`
 <div class="notice info"><b>${Object.keys(DEVELOPMENT_EFFECT_CATALOG).length} / 84</b> individually indexed for executable/guided behavior. Registered cards include partial, guided, and executable branches; see each card’s support mode. Registration does not mean completion. Other cards still require manual reconciliation. Evidence status alone does not imply automation.</div>
 ${epidemicLive&&state.phase==='execution'&&state.operation==='Take Actions'&&!state.epidemicTakeActionsApplied&&!pending&&!state.activeBandId?hButton('development-epidemic-end','Resolve next end-of–Take Actions epidemic/Smallpox effect','btn primary sm'):''}
 ${state.phase==='cleanup'&&!state.steps?.cl1&&active.some(c=>c.number==='44'&&!(state.louisianaDoneIds||[]).includes(c.id))&&!pending?hButton('development-louisiana-cleanup','Resolve Louisiana Purchase random Trade Goods placement','btn primary sm'):''}
 ${state.phase==='cleanup'&&!state.steps?.cl1&&active.some(c=>c.number==='60'&&!(state.americanTradersDoneIds||[]).includes(c.id))&&!pending?hButton('development-american-traders','Resolve American Traders cleanup draw','btn primary sm'):''}
 ${state.phase==='execution'&&state.operation==='Planning'&&active.some(c=>c.number==='56')&&!state.giftGivingUsed?`<form id="development-gift-giving-form"><p>Gift Giving: spend 1 AP to move one available Trade Goods to a Ranchería Resources box (once per Planning in this conservative implementation).</p><select name="rancheriaId">${ranches.map(p=>option(p.id,p.label||p.id)).join('')}</select><button class="btn sm">Perform Gift Giving Headman Action</button></form>`:''}
 ${state.phase==='cleanup'&&!state.steps?.cl1&&active.some(c=>['70','71'].includes(c.number)&&!(state.buffaloDoneIds||[]).includes(c.id))&&!pending?hButton('development-buffalo-start','Resolve next Buffalo Hunters cleanup card','btn primary sm'):''}
 ${pending?.kind==='kiowa-alliance'?`<form id="development-kiowa-form"><p>Kiowa Alliance: choose the Tribe, an available Ranchería, a strength-1 or -2 Band and up to two Horse counters.</p><label class="field"><span>Tribe</span><select name="tribeId">${pending.tribeIds.map(id=>option(id,state.pieces.find(p=>p.id===id)?.location||id)).join('')}</select></label><label class="field"><span>Ranchería</span><select name="rancheriaId">${state.pieces.filter(p=>p.type==='Rancheria'&&p.location===`box:${p.id}`).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Band</span><select name="bandId">${state.pieces.filter(p=>p.type==='Band'&&p.location==='reserve'&&[1,2].includes(p.strength)).map(p=>option(p.id,p.label||p.id)).join('')}</select></label>${state.pieces.filter(p=>p.type==='Resource'&&p.subtype==='Horse'&&p.location==='reserve').map(p=>`<label class="field"><input type="checkbox" name="horseId" value="${esc(p.id)}"> ${esc(p.label||p.id)}</label>`).join('')}<button class="btn primary sm">Resolve complete Kiowa Alliance reveal</button></form>`:''}
 ${pending?.kind==='cuerno-medicine'||pending?.kind==='quanah-medicine'?`<form id="development-medicine-form"><p>${esc(pending.reason)}</p><select name="mahimianaId">${pending.chiefIds.map(id=>option(id,state.pieces.find(p=>p.id===id)?.label||id)).join('')}</select><button class="btn primary sm" ${pending.chiefIds.length?'':'disabled'}>Apply verified Medicine change</button></form>`:''}
 ${pending?.kind==='ute-displacement'?`<form id="development-ute-displacement-form"><p>End of Ute Alliance: choose a legal Upper Arkansas space for Ranchería ${esc(pending.rancheriaId)}. The Tribe then enters UA-1.</p><select name="space">${pending.destinations.map(id=>option(id,id)).join('')}</select><button class="btn primary sm">Move Ranchería and place Tribe</button></form>`:''}
 ${pending?.kind==='nuevo-apacheria'?`<form id="development-nuevo-form"><p>Nuevo Apachería: select one in-play Tribe, then one eligible Rio Grande space. Bison and Settlement counters there return to stock.</p><label class="field"><span>Tribe to move</span><select name="tribeId">${state.pieces.filter(p=>p.type==='Tribe'&&SPACE[p.location]).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Rio Grande space</span><select name="space">${options(SPACES.filter(p=>p.territory==='RG').map(p=>[p.id,p.name]),'RG-1')}</select></label><button class="btn primary sm">Resolve Nuevo Apachería</button></form>`:''}
 ${pending?.kind==='buffalo-hunters'?`<form id="development-buffalo-form"><p>Buffalo Hunters selected ${esc(pending.territory)}. Remove one Bison from stock.</p><select name="bisonId">${pending.bisonIds.map(id=>option(id,state.pieces.find(p=>p.id===id)?.location||id)).join('')}</select><button class="btn primary sm">Remove selected Bison</button></form>`:''}
 ${pending?.kind==='horse-discard'?`<form id="development-horse-loss-form"><p>Development #${esc(pending.number)}: select ${pending.required} in-play Horse counters to return to stock.</p>${pending.horseIds.map(id=>`<label class="field"><input type="checkbox" name="horseId" value="${esc(id)}"> ${esc(state.pieces.find(p=>p.id===id)?.label||id)}</label>`).join('')}<button class="btn primary sm">Apply printed Horse losses</button></form>`:''}
 ${pending?.kind==='smallpox-end'?`<form id="development-smallpox-form"><p>Smallpox selected ${esc(pending.space)}. Choose the Band to reduce by one strength.</p><select name="bandId">${pending.bandIds.map(id=>option(id,id)).join('')}</select><button class="btn primary sm">Resolve Smallpox Band loss</button></form>`:''}
 ${pending?.kind==='epidemic'?`<form id="development-epidemic-form"><p>Printed Epidemic selected ${pending.spaces.map(esc).join(', ')}. Choose one affected Band in any multiply occupied selected space.</p>${pending.spaces.filter(loc=>state.pieces.filter(p=>p.type==='Band'&&p.location===loc).length>1&&!state.pieces.some(p=>p.type==='Rancheria'&&p.location===loc)).map(loc=>`<label class="field"><span>${esc(loc)}</span><select name="choice_${esc(loc)}">${state.pieces.filter(p=>p.type==='Band'&&p.location===loc).map(p=>option(p.id,p.label||p.id)).join('')}</select></label>`).join('')}<button class="btn primary sm">Apply Epidemic to selected spaces</button></form>`:''}
 ${pending&&!['epidemic','smallpox-end','buffalo-hunters','horse-discard','nuevo-apacheria'].includes(pending.kind)?`<div class="notice alert">Card ${esc(pending.number)} has an unimplemented printed effect and blocks further play.</div><form id="development-confirm-form"><input type="hidden" name="id" value="${esc(pending.cardId)}"><label class="field"><span>Actual printed effect and result</span><textarea name="note" minlength="20" maxlength="600" required></textarea></label><label class="small"><input name="ack" type="checkbox" required> I resolved this card using its actual printed face.</label><button class="btn primary sm" type="submit">Record verified outcome</button></form>`:''}
 ${state.phase==='execution'&&state.operation==='Passage of Time'&&deck.length&&!pending?hButton('development-auto-reveal','Draw next Development card automatically','btn primary sm'):''}
 ${state.phase==='execution'&&state.operation==='Passage of Time'&&deck.length&&!pending?`<form id="development-reveal-form"><label class="field"><span>Card to reveal (for physical deck reconciliation)</span><select name="id">${deck.map(c=>option(c.id,`#${c.identifier||'?'} ${c.title||''}`)).join('')}</select></label><button class="btn primary sm">Reveal & execute printed effect</button></form>`:''}
 ${activeHunt&&state.phase==='execution'&&state.operation==='Planning'?hButton('development-great-hunt-hand','Take Great Hunt into hand · 1 AP','btn sm'):''}
 ${huntHand&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId?hButton('development-great-hunt-play','Play Great Hunt for active Band · Hunts cost 1 MP','btn sm'):''}
 ${activeUte&&state.phase==='execution'&&state.operation==='Planning'?hButton('development-ute-hand','Take Ute Alliance into hand · 1 AP','btn sm'):''}
 ${uteHand?`<form id="development-ute-form"><label class="field"><span>Printed option</span><select name="choice">${option('band','Place available strength-3 Band')}${option('remove','Roll die to remove Tribe/Settlement')}</select></label><label class="field"><span>Map destination (Band option)</span><select name="space">${options(SPACES.filter(p=>['round','canyon'].includes(p.type)).map(p=>[p.id,p.name]),'UA-1')}</select></label><label class="field"><span>Die (removal option)</span><select name="die">${options(['1','2','3','4','5','6'],'3')}</select></label><label class="field"><span>Target (on 3–6)</span><select name="targetId">${state.pieces.filter(p=>['Tribe','Settlement'].includes(p.type)&&SPACE[p.location]).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn sm">Play Ute Alliance</button></form>`:''}
 ${state.phase==='execution'&&state.operation==='Planning'?verifiedHands.filter(n=>active.some(c=>c.number===n)).map(n=>hButton('development-take-verified',`Take Development #${n} into hand · 1 AP`,'btn sm',`data-number="${n}"`)).join(' '):''}
 ${state.pending?.type==='raid'&&!state.successCheck&&!state.lastSuccessCheck&&handCards.includes('32')?hButton('development-play-skillful','Use Skillful Warriors instead of Success Check','btn sm'):''}
 ${state.successCheck&&!state.successCheck.drawIds.length&&!state.successCheck.tacticalAttempted&&['17','42'].some(n=>handCards.includes(n))?hButton('development-play-tactical','Risk Tactical Advantage for this Success Check','btn sm'):''}
 ${handCards.includes('16')&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId&&!state.qualityMounts?`<form id="development-quality-mounts-form"><p>Quality Mounts: choose up to 6 bonus MPs for the active Band. On Finish Band, a digital die determines whether the card is discarded.</p><select name="bonus">${options(['1','2','3','4','5','6'],'3')}</select><button class="btn sm">Gain Quality Mounts MPs</button></form>`:''}
 ${['39','40','59'].some(n=>handCards.includes(n))&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId&&!state.pending&&!state.comancheMoon?hButton('development-moon-prepare','Prepare Comanche Moon for next Raid','btn sm'):''}
 ${handCards.includes('11')?`<form id="development-siege-form"><p class="small">Siege of La Jicarilla: place two stock Ravaged counters on one Tribe, or one each on two Tribes.</p><label class="field"><span>First Tribe</span><select name="first">${tribes.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Second Tribe (optional; leave blank for both on first)</span><select name="second"><option value="">Both on first Tribe</option>${tribes.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn sm">Play Siege of La Jicarilla</button></form>`:''}
 ${handCards.includes('28')?hButton('development-play-anza','Play Juan Bautista de Anza · end West War Columns / restore Peace','btn sm'):''}
 ${handCards.includes('35')&&state.phase==='execution'&&state.operation==='Take Actions'?hButton('development-play-vibrant','Play Vibrant Population · unfinish Bands','btn sm'):''}
 ${handCards.includes('54')&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId?hButton('development-play-long-raid','Play 1,000-Mile Raid · +6 MP','btn sm'):''}
 ${handCards.includes('18')&&state.enemyFlow?.stage==='effect'?`<p class="small">No Relief from War may be played before an Enemy Recover die roll, if Recover is required.</p>${hButton('development-play-no-relief','Play No Relief from War · cancel Recover','btn sm')}`:''}
 ${handCards.includes('15')&&state.phase==='execution'&&state.operation==='Planning'?`<form id="development-negotiation-form"><p class="small">Negotiation: select an in-play War Column with an unambiguous paired War/Raid Instruction.</p><label class="field"><span>War Column</span><select name="warId">${warColumns.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn sm">Play Negotiation</button></form>`:''}
 ${handCards.includes('13')&&state.phase==='execution'&&state.operation==='Take Actions'&&state.activeBandId?`<form id="development-french-traders-form"><p class="small">French Traders: spend one or two possessed Bison/Horse counters for the same number of available Guns. An empty round space in LA, RR, or BC is required.</p><label class="field"><span>First possessed resource</span><select name="first">${state.pieces.filter(p=>p.location==='held:'+state.activeBandId&&(p.type==='Bison'||['Bison','Horse'].includes(p.subtype))).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><label class="field"><span>Optional second resource</span><select name="second"><option value="">Only one</option>${state.pieces.filter(p=>p.location==='held:'+state.activeBandId&&(p.type==='Bison'||['Bison','Horse'].includes(p.subtype))).map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn sm">Play French Traders</button></form>`:''}
 ${comancheros.length&&state.phase==='execution'&&state.operation==='Planning'&&!state.developmentPlanningApplied?`<form id="development-comancheros-form"><p class="small">${comancheros.length} Trade Goods required; ${stockGoods.length} physically available in recorded stock.</p><label class="field"><span>Receiving Ranchería</span><select name="rancheriaId">${ranches.map(p=>option(p.id,p.label||p.id)).join('')}</select></label><button class="btn primary sm" ${ranches.length&&stockGoods.length>=comancheros.length?'':'disabled'}>Resolve Comancheros at end of Planning</button></form>`:''}
 <details><summary>All 84 original Development cards: source and current automation status</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>No.</th><th>Card</th><th>Period</th><th>Implementation</th></tr></thead><tbody>${DEVELOPMENT_SOURCE_INDEX.map(x=>`<tr><td>${esc(x.number)}</td><td>${esc(x.name)}</td><td>${x.period}</td><td>${esc(x.automation)}</td></tr>`).join('')}</tbody></table></div></details>
 <details><summary>Supported Development card triggers</summary><div class="table-wrap"><table class="data-table"><thead><tr><th>Card</th><th>Name</th><th>Trigger</th><th>Support</th></tr></thead><tbody>${Object.entries(DEVELOPMENT_EFFECT_CATALOG).map(([n,c])=>`<tr><td>#${n}</td><td>${esc(c.name)}</td><td>${esc(c.trigger)}</td><td>${esc(c.mode)}</td></tr>`).join('')}</tbody></table></div></details>`, 'Direct source: your English Tabletop Simulator Development card faces. Unverified card branches remain guarded.');
}
function cardsPage(){const audit=cardEvidenceAudit(state);return `${warnings()}${verifiedWarCardPanel()}${developmentAutomationPanel()}${cardReferencePanel()}${cardInventorySummary()}${cardPanel('Evidence coverage',`<p class="intro">${audit.total} registered · ${audit.unverified} unverified · ${audit.sourceLocated} source located · ${audit.checkedAgainstPrint} cross-checked. Card effects are <strong>not automated</strong> by these labels.</p>${audit.missingIdentifiers||audit.withoutSources?`<p class="small muted">${audit.missingIdentifiers} cards lack printed IDs; ${audit.withoutSources} evidence entries lack references.</p>`:''}`)}${cardPanel('Recorded cards',`<div class="form-end" style="margin-top:0;margin-bottom:15px">${hButton('modal-add-card','＋ Record card','btn primary sm')}</div>${state.cards.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Card</th><th>Type</th><th>Zone</th><th>Evidence</th><th>Notes</th><th></th></tr></thead><tbody>${state.cards.map(c=>`<tr><td><b>${esc(c.identifier||'—')}</b><div class="small">${esc(c.title||'Unlabelled')}</div></td><td>${esc(c.kind)}</td><td><select class="control card-zone" data-id="${c.id}">${options(['Deck','Display','Hand','In play','War Event','Discard','Available','Removed'],c.zone)}</select></td><td><select class="control card-evidence" data-id="${esc(c.id)}">${options(CARD_EVIDENCE_STATES,c.evidenceStatus||'unverified')}</select><div class="small muted">${esc(c.sourceReference||'No source recorded')}</div></td><td class="small muted">${esc(c.notes)}</td><td>${hButton('edit-card','Edit','btn slim',`data-id="${c.id}"`)} ${hButton('delete-card','Remove','btn slim',`data-id="${c.id}"`)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No cards entered. Record the printed card numbers or names as they appear during your game.</div>'}`,'Cards are represented by identifiers — printed card effects remain authoritative.')}${cardPanel('Rule precedence',`<p class="intro">History-card effects take precedence over other cards and general rules. Ordinary card text can change general rules, and conflicting later effects may supersede earlier card effects. This app <strong>does not interpret card text automatically</strong>. Before you complete a procedure, check the physical cards.</p><a class="rule-link" href="https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/comancheria/Comancheria_LivingRules.pdf" target="_blank" rel="noopener">Open GMT Living Rules (Spring 2024) ↗</a>`)}`;}
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
 const destText=selected?`<div class="notice compact info"><b>Selected token:</b> ${esc(selected.label)} (${esc(formatLocation(state,selected.location))}). Click a destination space to move it. Active Bands use legal-movement checks; other tokens require a manual board-correction confirmation.</div>`:'<p class="small muted">Select a token below. Then click another map space to set its destination.</p>';
 return `${warnings()}${state.phase==='setup'?officialSetupPanel():''}${renderStats()}<div class="digital-banner"><strong>Digital tabletop · experimental</strong><span>Everything is recorded in this browser, with Undo/Redo. Card effects and unverified routes still need rule decisions; this is not a fully automated adaptation.</span></div>
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
 return cardPanel('Release readiness — independent of test count',`<div class="notice ${incomplete||copyright?'alert':'info'}"><b>${incomplete||copyright?'NOT CERTIFIED for a complete digital game':'Card catalog certification available'}</b><p>${c.fullyAutomated} of ${c.total} Development Cards have passed complete-effect certification. ${c.manualOnly.length} still have explicit manual-only paths. Tests for individual effects are not complete-card certification.</p><p>${copyright?'This personal-use build contains GMT card artwork. Never publish this archive.':'This public-safe variant excludes the copyrighted card images.'}</p><p>Enemy AI, History and Culture effects, Battle and Passage of Time still have manual paths. A passing test suite does not clear those release gates.</p></div>`,'Use npm run release-audit for the machine-readable release blockers. GitHub publishing requires a separate approval and a rights-safe artifact.');
}
function settingsPage(){return `${warnings()}${releaseReadinessPanel()}<div class="settings-grid"><div class="stack">${cardPanel('Game setup',`<label class="field"><span>Official scenario</span><select id="scenario-select" class="control" ${state.phase!=='setup'?'disabled':''}>${SCENARIOS.map(x=>option(x[0],`${x[1]} · ${x[2]}`,state.scenario)).join('')}</select></label>${state.phase==='setup'?hButton('apply-scenario','Apply scenario label','btn sm'):''}<div class="form-end">${hButton('new-blank','New blank game','btn primary sm')}${hButton('demo','Load demonstration','btn sm')}</div><p class="small muted">The first three scenarios have verified partial opening templates available on the Overview page. Other scenario setups must be entered from the printed chapter. You cannot change the official scenario after leaving setup.</p><label class="field"><span>Historical period (manual)</span><input id="period-value" type="number" min="1" max="4" value="${state.period}"></label>${hButton('set-period','Set period','btn sm')}<label class="field" style="margin-top:18px"><span>Game notes</span><textarea id="game-notes">${esc(state.notes)}</textarea></label>${hButton('save-notes','Save notes','btn sm')}`,'Create a tracker snapshot; do not treat blank setup as an official initial position.')}${cardPanel('Flags & limitations',`<div class="rowline"><span>Santa Fé Trail (#43) has been revealed</span><button class="btn sm" data-action="toggle-santafe">${state.flags.santaFe?'Yes':'No'}</button></div><div class="rowline"><span>Operations marker demands Passage of Time</span><button class="btn sm" data-action="toggle-mandatory">${state.mustPassage?'Yes':'No'}</button></div><div class="small muted">These flags are entered from the board/cards. The Operations numeric track alone is not enough to infer the mandatory box.</div>`)}</div><div class="stack">${cardPanel('Local autosave & export-only archive',`<p class="intro">Every action saves to this browser's storage. The app needs no account, internet connection after first load, server or external database. JSON exports are archival only. Importing files is disabled, and the browser stores your only restorable copy. Keep your site data intact.</p><div class="form-end" style="margin-top:0">${hButton('export','Export JSON','btn primary sm')}</div><div class="notice compact info">Saved only in this browser; save and map file imports are disabled. Downloaded JSON archives cannot be restored inside this app.</div>`)}${cardPanel('Digital dice seed',`<p class="intro">For reproducible digital rolls, set a numeric seed. Changing the seed does not affect previously logged dice or physical rolls.</p><form id="rng-form"><label class="field"><span>Unsigned 32-bit seed</span><input type="number" name="seed" min="0" max="4294967295" step="1" value="${state.rng.seed}" required></label><button type="submit" class="btn sm">Set seed</button></form>`)}${cardPanel('Stock caps (optional)',`<p class="intro">The physical counter supply is limited. This tool cannot infer every printed counter count. Add caps as you transcribe them from the countersheets to block additional in-play entries.</p><form id="limit-form" class="form-grid"><label class="field"><span>Type</span><select name="pieceType">${options(PIECE_TYPES,'Band')}</select></label><label class="field"><span>Subtype (optional)</span><input name="subtype" placeholder="e.g. Horse"></label><label class="field"><span>Maximum in play</span><input name="value" type="number" min="0" max="999" required></label><div class="field" style="align-self:end"><button class="btn sm" type="submit">Set limit</button></div></form>${Object.entries(state.limits).length?`<div class="small muted">${Object.entries(state.limits).map(([k,v])=>`${esc(k)} = ${v}`).join(' · ')}</div>`:''}`)}${cardPanel('Publisher & sources',`<p class="intro">Fan-made, independent, non-commercial companion. Not affiliated with or endorsed by GMT Games. Optional card images are selected from your Tabletop Simulator files and cached in this browser only. None are distributed with the website. Rights remain with their owners.</p><a class="rule-link" target="_blank" rel="noopener" href="https://www.gmtgames.com/p-872-comancheria-the-rise-and-fall-of-the-comanche-empire-2nd-printing.aspx">GMT game page and official resources ↗</a><p><a class="rule-link" target="_blank" rel="noopener" href="https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/comancheria/Comancheria_LivingRules.pdf">Living Rules Spring 2024 ↗</a></p>`,'Please own the physical game and refer to the original rules/cards.')}</div></div>`;}
function render(){const root=$('app');const pages={dashboard,digital:digitalPage,board:boardPage,pieces:piecesPage,operations:operationsPage,cards:cardsPage,journal:journalPage,settings:settingsPage};
 root.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-emblem">✥</span><div><div class="brand-title">Comanchería</div><div class="brand-sub">Table companion</div></div></div><div class="nav-label">YOUR CAMPAIGN</div><nav aria-label="Main navigation">${navItems.map(([key,label,symbol])=>`<button type="button" data-action="nav" data-tab="${key}" class="nav-btn ${stateUI.tab===key?'active':''}"><span style="font-size:17px;width:19px;text-align:center">${symbol}</span>${label}</button>`).join('')}</nav><div class="sidebar-footer"><div><span class="status-dot"></span>Saved in this browser</div><div style="margin-top:6px">Static · GitHub Pages ready</div><div style="margin-top:11px"><span class="tag gold">Partial rule coverage</span></div></div></aside><main class="main">${header()}${stateUI.saveConflict?`<div class="notice alert" role="alert"><b>Autosave conflict:</b> ${esc(SAVE_CONFLICT_MESSAGE)}</div>`:''}${pages[stateUI.tab]()}</main></div><div id="modal-root"></div><div id="toast-root" class="toast-wrap" role="status" aria-live="polite"></div>`;
 renderModal();renderToast();}
function renderToast(){const root=$('toast-root');if(root)root.innerHTML=stateUI.toasts?`<div class="toast ${stateUI.toastError?'error':''}"><button data-action="dismiss-toast" aria-label="Dismiss">×</button>${esc(stateUI.toasts)}</div>`:'';}
function modalContainer(title,content){return `<div class="modal-bg" data-modal-backdrop="true"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button type="button" class="close" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${content}</div></div></div>`;}
function pieceForm(p,locationOverride){const isEdit=Boolean(p);const type=p?.type||'Band';const subtype=p?.subtype||'';const location=locationOverride||p?.location||'reserve';return `<form id="piece-form"><div class="form-grid"><label class="field"><span>Counter type</span><select name="type" id="piece-type" ${isEdit?'disabled':''}>${options(PIECE_TYPES,type)}</select></label><label class="field"><span>Subtype / printed marker</span><input name="subtype" value="${esc(subtype)}" placeholder="Horse, Ravaged, Spain, …"></label><label class="field"><span>Counter label</span><input required maxlength="100" name="label" value="${esc(p?.label||'')}" placeholder="e.g. Band A1, Ranchería B"></label><label class="field"><span>Owner</span><input name="owner" value="${esc(p?.owner||'Comanche')}" placeholder="Comanche, Spain, North…"></label><label class="field"><span>Strength (if printed)</span><input name="strength" type="number" min="0" max="20" value="${p?.strength??0}"></label><label class="field"><span>Band printed Movement rating</span><input name="mpRating" type="number" min="0" max="20" value="${p?.mpRating??4}"></label></div><label class="field" style="margin-top:12px"><span>Location / possessor</span><select name="location" ${isEdit?'disabled':''}>${allLocations(state,location)}</select></label><label class="field"><span>Notes or printed detail</span><textarea name="notes" maxlength="1000">${esc(p?.notes||'')}</textarea></label>${isEdit?`<label class="field"><span>Finished side?</span><select name="finished">${option('false','Unfinished',!p.finished?'false':'')}${option('true','Finished',p.finished?'true':'')}</select></label>`:''}<div class="form-end"><button type="submit" class="btn primary">${isEdit?'Save counter details':'Record counter'}</button>${isEdit?hButton('modal-move-piece','Change location','btn sm'):''}${isEdit?hButton('delete-piece','Delete ledger entry','btn red sm',`data-id="${p.id}"`):''}</div></form>`;}
function modalContent(){const m=stateUI.modal;if(!m)return null;
 if(m==='add-piece')return ['Record physical counter',pieceForm(null,stateUI.selectedSpace&&stateUI.modalId==='here'?stateUI.selectedSpace:null)];
 if(m==='edit-piece'){const p=state.pieces.find(x=>x.id===stateUI.modalId);return p?['Edit '+p.label,pieceForm(p)]:null;}
 if(m==='move-piece'){const p=state.pieces.find(x=>x.id===stateUI.modalId);if(!p)return null;return [`Reconcile ${p.label}`,`<div class="notice alert">This is a <b>manual correction</b>, not a validated game action. For Band moves, use Take Actions → Move. Reconcile the physical counter before continuing.</div><form id="move-piece-form"><label class="field"><span>Destination</span><select name="location">${allLocations(state,p.location)}</select></label><button class="btn primary" type="submit">Record physical position</button></form>`];}
 if(m==='edge')return ['Record a verified map connection',`<div class="notice">The official map has solid and dashed connections. Read the exact connecting line from your own printed map. Only recorded connections are eligible for Band movement.</div><form id="edge-form"><div class="form-grid"><label class="field"><span>From</span><select name="a">${options(SPACES.map(x=>[x.id,x.name]),stateUI.edgeStart||stateUI.selectedSpace)}</select></label><label class="field"><span>To</span><select name="b">${options(SPACES.map(x=>[x.id,x.name]),stateUI.edgeTarget||'UA-1')}</select></label></div><label class="field"><span>Printed line type</span><select name="kind">${option('solid','Solid')}${option('dashed','Dashed')}</select></label><label class="field"><span>Colored Enemy Connection (if visibly marked)</span><select name="enemyColor">${option('','Unclassified / white')}${option('West','Yellow · West')}${option('South','Green · South')}${option('East','Blue · East')}</select></label><p class="small muted">Do not guess the color. Color tags control the Enemy Connection audit; they do not replace solid/dashed movement rules.</p><label style="display:block;font-size:12px;margin-bottom:12px"><input name="verified" type="checkbox" required> I visually verified this connection on my printed map.</label><button class="btn primary" type="submit">Add line to movement graph</button></form>`];
 if(m==='move-band'){const p=state.pieces.find(x=>x.id===state.activeBandId);if(!p)return null;const edges=state.edges.filter(e=>e.a===p.location||e.b===p.location);return ['Move active Band',`<p class="intro">${esc(p.label)} is at ${esc(formatLocation(state,p.location))}. Only source-backed or personally recorded adjacent spaces appear here.</p>${edges.length?`<form id="move-band-form"><label class="field"><span>Connected destination</span><select name="to">${edges.map(e=>{const target=e.a===p.location?e.b:e.a;return option(target,`${SPACE[target]?.name} · ${e.kind} line`);}).join('')}</select></label><p class="small muted">Cost: ${state.pieces.some(x=>x.location===`held:${p.id}`&&x.subtype==='Horse')?1:2} movement point(s); current: ${state.tracks.movement}.</p><button class="btn primary" type="submit">Validate & move</button></form>`:`<div class="notice alert">No recorded connections from this space. Add a printed-map connection first.</div>${hButton('modal-edge','Record a map line','btn primary sm')}`}`];}
 if(m==='trade'){const p=state.pieces.find(x=>x.id===state.activeBandId);if(!p)return null;const resources=state.pieces.filter(x=>x.location===`held:${p.id}` && (x.type==='Bison'||(x.type==='Resource'&&['Horse','Captives','Bison'].includes(x.subtype))));return ['Trade one Resource',`<div class="notice">Trade is only valid in Enemy/Peace Spaces that meet the Ravaged restrictions. This action checks AP and movement cost; it does not know all card overrides or physical stock without user caps.</div><form id="trade-form"><label class="field"><span>Spend possessed resource</span><select name="resourceId" required>${resources.map(r=>option(r.id,`${r.subtype||r.type} (${r.id})`)).join('')}</select></label><label class="field"><span>Receive from physical stock</span><select name="receive">${options(['Food','Trade Goods'],'Food')}</select></label><button type="submit" class="btn primary" ${resources.length?'':'disabled'}>Validate & trade</button></form>`];}
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
function openModal(modal,id){stateUI.modal=modal;stateUI.modalId=id||null;renderModal();}
function closeModal(){stateUI.modal=null;stateUI.modalId=null;stateUI.edgeStart=null;stateUI.edgeTarget=null;renderModal();}
function choose(tab){stateUI.tab=tab;stateUI.modal=null;render();window.scrollTo({top:0,behavior:'instant'});}
function val(id){return $(id)?.value;}
function confirmed(message){return confirm(message);}
function actionClick(e){
 const assetAction=e.target.closest('[data-action]')?.dataset.action;
 if(assetAction==='choose-tts-folder'){document.getElementById('tts-folder-picker')?.click();return;}
 if(assetAction==='choose-tts-board'){document.getElementById('tts-board-picker')?.click();return;}
 if(assetAction==='clear-tts-board'){if(!confirm('Remove the locally saved board image?'))return;clearLocalBoard().then(()=>{notify('Local board image removed.');render();}).catch(e=>notify(e.message,true));return;}
 if(assetAction==='clear-tts-images'){if(!confirm('Remove locally cached card art? Game saves are unaffected.'))return;clearLocalCards().then(()=>{notify('Local images cleared.');render();}).catch(e=>notify(e.message,true));return;}
const btn=e.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action;const d=btn.dataset;if(a==='war-draw-movement'){commit({type:'WAR_DRAW_MOVEMENT'});return;}if(a==='war-draw-event'){commit({type:'WAR_DRAW_EVENT'});return;}if(a==='war-auto-attrition'){commit({type:'WAR_AUTO_ATTRITION'});return;}if(a==='battle-auto-reconcile'){commit({type:'BATTLE_AUTO_RECONCILE'});return;}
 if(a==='nav'){choose(d.tab);return;}
 if(a==='digital-operations'){choose('operations');return;}
 if(a==='digital-clear'){stateUI.digitalSelectedPieceId=null;render();return;}
 if(a==='digital-pick'){stateUI.digitalSelectedPieceId=d.id;render();return;}
 if(a==='finish-war-countermeasure'){commit({type:'WAR_FINISH_COUNTERMEASURE',warId:d.warId,rancheriaId:d.rancheria});return;}if(a==='finish-war-decline'){commit({type:'WAR_FINISH_COUNTERMEASURE',decline:true});return;}
 if(a==='war-surprise-attack'){commit({type:'WAR_SURPRISE_ATTACK'});return;}if(a==='war-fast-column'){commit({type:'WAR_FAST_COLUMN'});return;}if(a==='steal-mounts'){commit({type:'WAR_STEAL_MOUNTS',warId:d.warId,mp:Number(d.mp)});return;}if(a==='travois-decline'){commit({type:'WAR_TRAVOIS',decline:true});return;}if(a==='travois-move'){commit({type:'WAR_TRAVOIS',rancheriaId:d.rancheria,to:d.to});return;}if(a==='resolve-higher-stakes'){commit({type:'WAR_HIGHER_STAKES_CLEANUP'});return;}
 if(a==='apply-war-event'){commit({type:'WAR_EVENT_RESOLVE',card:d.card});return;}
 if(a==='digital-draw-card'){if(stateUI.digitalDeck==='War'){choose('operations');return;}commit({type:'DIGITAL_CARD_DRAW',kind:stateUI.digitalDeck,zone:({War:'War Event',Culture:'Hand',History:'In play',Development:'Display'})[stateUI.digitalDeck]});return;}
 if(a==='digital-draw-cup'){commit({type:'DIGITAL_CUP_DRAW',all:false});return;}
 if(a==='digital-draw-all'){commit({type:'DIGITAL_CUP_DRAW',all:true});return;}

 if(a==='dismiss-toast'){stateUI.toasts='';renderToast();return;}
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
 if(a==='board-move-band'){commit({type:'MOVE_BAND',to:d.to});return;}
 if(a==='select-space'){
   if(!SPACE[d.id])return;
   if(stateUI.tab==='digital'&&stateUI.digitalSelectedPieceId){
     const piece=state.pieces.find(p=>p.id===stateUI.digitalSelectedPieceId);
     if(!piece){stateUI.digitalSelectedPieceId=null;render();return;}
     if(piece.location===d.id){stateUI.selectedSpace=d.id;stateUI.digitalSelectedPieceId=null;render();return;}
     if(piece.type==='Band'&&piece.id===state.activeBandId){
       stateUI.selectedSpace=d.id;commit({type:'MOVE_BAND',to:d.id});return;
     }
     if(confirmed('This is a MANUAL counter relocation, not a rules-validated move. Move '+piece.label+' to '+SPACE[d.id].name+'?')){
       stateUI.selectedSpace=d.id;commit({type:'MOVE_PIECE',id:piece.id,location:d.id});stateUI.digitalSelectedPieceId=null;
     }return;
   }
   if(stateUI.mapConnectMode && d.id!==stateUI.edgeStart){stateUI.edgeTarget=d.id;stateUI.mapConnectMode=false;openModal('edge');return;}
   stateUI.selectedSpace=d.id;if(stateUI.mapConnectMode)stateUI.edgeStart=d.id;
   else if(bandMovementOverlay(state,state.activeBandId))stateUI.routeTarget=d.id;
   render();return;
 }
 if(a==='select-operation'){commit({type:'SELECT_OPERATION',value:d.value});return;}
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
 if(a==='apply-opening-template'){if(confirmed('Load the verified opening template? Existing track values will be reset to the official starting values.'))commit({type:'APPLY_OPENING_TEMPLATE'});return;}
 if(a==='roll-one'){commit({type:'ROLL_DICE',count:1});return;}
 if(a==='roll-two'){commit({type:'ROLL_DICE',count:2});return;}
 if(a==='activate-band'){commit({type:'ACTIVATE_BAND',id:val('activate-band-id'),mode:val('activate-mode'),ack:$('activate-ack')?.checked});return;}
 if(a==='enemy-auto-culture'){commit({type:'ENEMY_AUTO_CULTURE_ATTACK'});return;}
 if(a==='development-louisiana-cleanup'){commit({type:'DEVELOPMENT_LOUISIANA_CLEANUP'});return;}
 if(a==='development-american-traders'){commit({type:'DEVELOPMENT_AMERICAN_TRADERS_CLEANUP'});return;}
 if(a==='development-buffalo-start'){commit({type:'DEVELOPMENT_BUFFALO_START'});return;}
 if(a==='development-moon-prepare'){commit({type:'DEVELOPMENT_MOON_PREPARE'});return;}
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
function submitForm(e){if(!(e.target instanceof HTMLFormElement))return;const f=e.target;const formId=f.getAttribute('id');if(!['piece-form','move-piece-form','edge-form','move-band-form','trade-form','raid-form','card-form','limit-form','rng-form','physical-dice-form','culture-form','operations-check-form','operation-override-form','loss-form','start-check-form','check-draw-form','check-finish-form','guns-cancel-form','trade-goods-redraw-form','battle-roll-form','battle-reconcile-form','battle-close-form','battle-exception-form','war-auto-move-form','war-move-begin-form','war-move-step-form','war-move-finish-form','enemy-reset-form','enemy-begin-form','enemy-pay-form','enemy-recover-form','enemy-subjugate-form','enemy-settle-form','enemy-culture-attack-form','enemy-hunt-form','enemy-encroach-form','enemy-ally-form','enemy-peace-form','enemy-card-exception-form','enemy-confirm-form','enemy-finish-form','passage-finish-form','passage-resource-form','passage-peace-form','passage-bison-form','victory-check-form','development-reveal-form','development-confirm-form','development-ute-form','development-comancheros-form','development-siege-form','development-negotiation-form','development-french-traders-form','development-epidemic-form','development-smallpox-form','development-horse-loss-form','development-buffalo-form','development-gift-giving-form','development-quality-mounts-form','development-nuevo-form','development-ute-displacement-form','development-medicine-form','development-kiowa-form','culture-purchase-form'].includes(formId))return;e.preventDefault();const v=Object.fromEntries(new FormData(f).entries());
 if(formId==='culture-purchase-form'){commit({type:'PASSAGE_CULTURE_PURCHASE',cultureId:v.cultureId});return;}
 if(formId==='development-reveal-form'){commit({type:'DEVELOPMENT_REVEAL',id:v.id});return;}
 if(formId==='development-confirm-form'){commit({type:'DEVELOPMENT_CONFIRM_EFFECT',id:v.id,note:v.note,ack:Boolean(v.ack)});return;}
 if(formId==='development-ute-form'){commit({type:'DEVELOPMENT_PLAY_UTE',choice:v.choice,space:v.space,die:v.die,targetId:v.targetId});return;}
 if(formId==='development-kiowa-form'){commit({type:'DEVELOPMENT_RESOLVE_KIOWA',tribeId:v.tribeId,rancheriaId:v.rancheriaId,bandId:v.bandId,horseIds:new FormData(f).getAll('horseId')});return;}
 if(formId==='development-medicine-form'){commit({type:'DEVELOPMENT_RESOLVE_MEDICINE',mahimianaId:v.mahimianaId});return;}
 if(formId==='development-ute-displacement-form'){commit({type:'DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT',space:v.space});return;}
 if(formId==='development-nuevo-form'){commit({type:'DEVELOPMENT_NUEVO_APACHERIA',tribeId:v.tribeId,space:v.space});return;}
 if(formId==='development-quality-mounts-form'){commit({type:'DEVELOPMENT_QUALITY_MOUNTS',bonus:v.bonus});return;}
 if(formId==='development-gift-giving-form'){commit({type:'DEVELOPMENT_GIFT_GIVING',rancheriaId:v.rancheriaId});return;}
 if(formId==='development-buffalo-form'){commit({type:'DEVELOPMENT_BUFFALO_RESOLVE',bisonId:v.bisonId});return;}
 if(formId==='development-horse-loss-form'){commit({type:'DEVELOPMENT_RESOLVE_HORSE_DISCARD',horseIds:new FormData(f).getAll('horseId')});return;}
 if(formId==='development-smallpox-form'){commit({type:'DEVELOPMENT_RESOLVE_SMALLPOX',bandId:v.bandId});return;}
 if(formId==='development-epidemic-form'){const bandChoices=Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith('choice_')).map(([k,id])=>[k.slice(7),id]));commit({type:'DEVELOPMENT_RESOLVE_EPIDEMIC',bandChoices});return;}
 if(formId==='development-siege-form'){commit({type:'DEVELOPMENT_PLAY_SIEGE',tribeIds:v.second?[v.first,v.second]:[v.first]});return;}
 if(formId==='development-negotiation-form'){commit({type:'DEVELOPMENT_PLAY_NEGOTIATION',warId:v.warId});return;}
 if(formId==='development-french-traders-form'){commit({type:'DEVELOPMENT_PLAY_FRENCH_TRADERS',resourceIds:v.second?[v.first,v.second]:[v.first]});return;}
 if(formId==='development-comancheros-form'){commit({type:'DEVELOPMENT_COMANCHEROS',rancheriaId:v.rancheriaId});return;}
 if(formId==='passage-retire-form'){commit({type:'PASSAGE_RETIRE_MAHIMIANA',mahimianaId:v.mahimianaId});return;}
 if(formId==='passage-quanah-form'){commit({type:'PASSAGE_SELECT_QUANAH_EXEMPTION',mahimianaId:v.mahimianaId});return;}
 if(formId==='passage-bison-form'){commit({type:'PASSAGE_BISON_RESOLVE',action:v.action,bisonId:v.bisonId,destination:v.destination});return;}
 if(formId==='passage-peace-form'){commit({type:'PASSAGE_PEACE_ROLL',pieceId:v.pieceId,die:v.die});return;}
 if(formId==='passage-resource-form'){commit({type:'PASSAGE_TRANSFER_RESOURCE',pieceId:v.pieceId,rancheriaId:v.rancheriaId});return;}
 if(formId==='passage-finish-form'){commit({type:'PASSAGE_FINISH',die:v.die||null,ack:Boolean(v.ack)});return;}
 if(formId==='victory-check-form'){commit({type:'RESOLVE_VICTORY',met:v.met==='yes',objectiveNote:v.objectiveNote,ack:Boolean(v.ack),transitionAck:Boolean(v.transitionAck)});return;}
 if(formId==='piece-form'){
  if(stateUI.modal==='edit-piece'){commit({type:'EDIT_PIECE',id:stateUI.modalId,patch:{label:v.label,owner:v.owner,subtype:v.subtype,strength:v.strength,mpRating:v.mpRating,notes:v.notes,finished:v.finished==='true'}});}
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
 else if(formId==='battle-roll-form'){commit({type:'BATTLE_ROLL',warId:v.warId,unitId:v.unitId,gunId:v.gunId,mahimianaId:v.mahimianaId,dice:v.dice.split(',').map(x=>x.trim()),warDrm:v.warDrm,cardDrm:v.cardDrm,cardReason:v.cardReason,ack:Boolean(v.ack)});return;}
 else if(formId==='battle-reconcile-form'){commit({type:'BATTLE_RECONCILE',note:v.note,ack:Boolean(v.ack),lossConfirmed:Boolean(v.lossConfirmed)});return;}
 else if(formId==='battle-close-form'){commit({type:'BATTLE_CLOSE_OVERRIDE',reason:v.reason,ack:Boolean(v.ack)});return;}
 else if(formId==='battle-exception-form'){commit({type:'BATTLE_NO_COMBAT_OVERRIDE',warId:v.warId,reason:v.reason,ack:Boolean(v.ack)});return;}
 else if(formId==='operation-override-form'){commit({type:'MANUAL_OPERATION_OVERRIDE',key:v.key,reason:v.reason});return;}
 else if(formId==='war-auto-move-form'){commit({type:'WAR_AUTO_MOVE',card:v.card});return;}
 else if(formId==='war-move-begin-form'){commit({type:'WAR_MOVE_BEGIN',warId:v.warId,allowed:v.allowed,card:v.card,ack:Boolean(v.ack)});return;}
 else if(formId==='war-move-step-form'){commit({type:'WAR_MOVE_STEP',to:v.to,cardOverride:Boolean(v.cardOverride),overrideReason:v.overrideReason,ack:Boolean(v.ack)});return;}
 else if(formId==='war-move-finish-form'){commit({type:'WAR_MOVE_FINISH',reason:v.reason,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-begin-form'){commit({type:'ENEMY_BEGIN',kind:v.kind,enemy:v.enemy,die:v.die,row:v.row,historyOverride:v.historyOverride,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-pay-form'){commit({type:'ENEMY_PAY',counterIds:new FormData(f).getAll('counterId'),trackSpent:v.trackSpent});return;}
 else if(formId==='enemy-recover-form'){commit({type:'ENEMY_RECOVER',ravagedId:v.ravagedId,die:v.die,criterion:v.criterion,success:v.success==='yes',randomConfirmed:Boolean(v.randomConfirmed),ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-subjugate-form'){commit({type:'ENEMY_SUBJUGATE',tribeId:v.tribeId,eastOrigin:v.eastOrigin||null,mapVerification:v.mapVerification,randomConfirmed:Boolean(v.randomConfirmed),unmappedRouteConfirmed:Boolean(v.unmappedRouteConfirmed),ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-settle-form'){commit({type:'ENEMY_SETTLE',settlementId:v.settlementId,space:v.space,eastOrigin:v.eastOrigin||null,mapVerification:v.mapVerification,randomConfirmed:Boolean(v.randomConfirmed),unmappedRouteConfirmed:Boolean(v.unmappedRouteConfirmed),bisonConfirmed:Boolean(v.bisonConfirmed),ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-encroach-form'){commit({type:'ENEMY_ENCROACH',die:v.die,order:['UA','LA','LE',v.face4,v.face5,v.face6],tribeId:v.tribeId,space:v.space,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-hunt-form'){commit({type:'ENEMY_HUNT',die:v.die,order:['UA','LA','LE',v.face4,v.face5,v.face6],ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-ally-form'){commit({type:'ENEMY_ALLY',tribeId:v.tribeId,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-peace-form'){commit({type:'ENEMY_PEACE',ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-culture-attack-form'){commit({type:'ENEMY_CULTURE_ATTACK',ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-card-exception-form'){commit({type:'ENEMY_CARD_NO_EFFECT',ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-confirm-form'){commit({type:'ENEMY_CONFIRM',note:v.note,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-finish-form'){commit({type:'ENEMY_FINISH',overrideReason:v.overrideReason,ack:Boolean(v.ack)});return;}
 else if(formId==='enemy-reset-form'){commit({type:'ENEMY_RESET_DISPLAY',source:v.source,ack:Boolean(v.ack)});return;}
 if(stateUI.toasts&&!stateUI.toastError)closeModal();
}
function onChange(e){const t=e.target;if(t.id==='tts-folder-picker'){if(t.files?.length)void importTtsFolder(t.files);t.value='';return;}if(t.id==='tts-board-picker'){const file=t.files?.[0];if(file)storeLocalBoard(file).then(()=>{notify('Board image saved locally.');render();}).catch(e=>notify(e.message,true));t.value='';return;}if(t.id==='reference-kind'){stateUI.referenceKind=t.value;stateUI.referenceSelected=CARD_REFERENCE.find(c=>c.kind===t.value)?.id||null;render();void showLocalCard(stateUI.referenceSelected);}
 else if(t.id==='reference-card'){stateUI.referenceSelected=t.value;render();void showLocalCard(t.value);}
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
document.addEventListener('click',actionClick);
document.addEventListener('submit',submitForm);
document.addEventListener('change',onChange);
document.addEventListener('input',e=>{if(e.target.id==='piece-filter'){stateUI.pieceFilter=e.target.value;const r=$('piece-results');if(r)r.innerHTML=piecesTable();}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.map-node[data-action]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}if(e.key==='Escape'&&stateUI.mapConnectMode){stateUI.mapConnectMode=false;stateUI.edgeStart=null;render();}if(e.key==='Escape'&&stateUI.modal)closeModal();if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.target.matches('input, textarea')){e.preventDefault();undo();}});
document.addEventListener('click',e=>{if(e.target.matches('[data-modal-backdrop]'))closeModal();});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
render();
refreshLocalCards().then(()=>showLocalCard(stateUI.referenceSelected)).catch(e=>notify('Local artwork unavailable: '+e.message,true));
refreshLocalBoard().then(()=>{if(stateUI.tab==='board')render();}).catch(e=>notify('Local board image unavailable: '+e.message,true));
