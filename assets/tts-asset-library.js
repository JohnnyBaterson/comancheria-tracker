/**
 * Private image importer. The public distribution contains filenames only.
 * User-selected File objects never leave the browser; no network fetches.
 */
import {TTS_COUNTER_TILES} from './tts-source-manifest.js';
import {physicalCounterFaceIndex} from './physical-counter-catalog.js';
export const BOARD_SOURCE='httpssteamusercontentaakamaihdnetugc2472003190194663224B1953E94B1F2BBDC2032586C242EB348DA856669.png';
export const SHEETS=[
 ['Culture','httpssteamusercontentaakamaihdnetugc24742543565242199082AABB0D9657E2B3DE5614A7F580119EE72D16F83.png',24,1],
 ['War','httpssteamusercontentaakamaihdnetugc24742543565242207505161E8DC390C236F483D5C3687421D3BA20824ED.png',25,1],
 ['Development','httpssteamusercontentaakamaihdnetugc2474254356524222386199DA2975BDDE9E0F2B0EEB39195932F766DFC68.png',21,1],
 ['Development','httpssteamusercontentaakamaihdnetugc2474254356524223769A76BE03423CC903422CE2854DC62E54E4E5A68D5.png',21,22],
 ['Development','httpssteamusercontentaakamaihdnetugc2474254356524224403E660856074619230A7C6A40B802F84DA9306E75B.png',21,43],
 ['Development','httpssteamusercontentaakamaihdnetugc2474254356524226240EC4E943BE67990B4947908B9CA28533E225FE58F.png',21,64]
];
export const HISTORY_SOURCES=[
 ['history-card-01','httpssteamusercontentaakamaihdnetugc2474254356524250797BC0108600A630F000C33284A2C93229469BCA66D.png'],
 ['history-card-02','httpssteamusercontentaakamaihdnetugc2474254356524251374371D46AD143EBDB3F01BA408A434697836750E3F.png'],
 ['history-card-03','httpssteamusercontentaakamaihdnetugc2474254356524226005B3AF4017AA4F045AAB0389FB01BAC8265452EA5F.png'],
 ['history-card-04','httpssteamusercontentaakamaihdnetugc2474254356524227093BF12AA34C29BAAF2FD56562A2516C903A0920820.png']
];
export const CARD_REFERENCE=[
 ...SHEETS.flatMap(([kind,sourceSheet,count,first])=>Array.from({length:count},(_,i)=>({id:kind.toLowerCase()+'-'+String(first+i).padStart(2,'0'),kind,label:kind==='Development'?'Development #'+String(first+i).padStart(2,'0'):kind+' sheet position '+(first+i),sourceSheet,sheetIndex:i+1}))),
 ...HISTORY_SOURCES.map(([id,sourceSheet],i)=>({id,kind:'History',label:'History source face '+(i+1),sourceSheet,sheetIndex:1}))
];
export const EXPECTED_ART={cards:CARD_REFERENCE.length,sheets:SHEETS.length,history:HISTORY_SOURCES.length,board:1,counterTiles:TTS_COUNTER_TILES.length};
const DB='comancheria-local-tts-art',STORE='faces',BOARD_KEY='board-reference',MAX_SIZE=95*1024*1024,MAX_BOARD_SIZE=512*1024*1024;
const knownFilenames=new Set([BOARD_SOURCE,...SHEETS.map(s=>s[1]),...HISTORY_SOURCES.map(s=>s[1]),...TTS_COUNTER_TILES].map(s=>s.toLowerCase()));
let dbPromise=null,lastReport=null,boardUrl=null;
const available=new Set(),urls=new Map(),counterNames=new Set(),counterMappings=new Map();
// Artwork is loaded only from the user-selected local TTS folder and browser IndexedDB.
function openDB(){
 if(!('indexedDB' in globalThis))return Promise.reject(new Error('Browser-local image storage is not available.'));
 return dbPromise??=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Cannot open local artwork storage.'));
 });
}
function tx(mode,fn){return openDB().then(db=>new Promise((resolve,reject)=>{
 const t=db.transaction(STORE,mode),r=fn(t.objectStore(STORE));let value;
 if(r){r.onsuccess=()=>{value=r.result;};r.onerror=()=>reject(r.error);}
 t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error||new Error('Artwork database transaction failed.'));
 t.onabort=()=>reject(t.error||new Error('Artwork database transaction aborted.'));
}));}
function closeUrls(){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();if(boardUrl){URL.revokeObjectURL(boardUrl);boardUrl=null;}}
function encode(canvas,quality=.84){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image conversion failed.')),'image/webp',quality));}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
async function decode(file,limit=0,maxBytes=MAX_SIZE){
 if(!file||file.size<100||file.size>maxBytes||!(/\.(png|jpe?g|webp)$/i.test(file.name)))throw new Error('Image is not PNG/JPEG/WebP, is empty, or exceeds the supported file size.');
 // Resize during decoding: a full 10,000px board or 7,500px sheet should not enter JS as a massive bitmap.
 if(limit){try{return await createImageBitmap(file,{resizeWidth:limit,resizeQuality:'high'});}catch{ /* Some browsers ignore resize options. */ }}
 return createImageBitmap(file);
}
function subsetCanvas(bitmap,index){
 const col=(index-1)%10,row=Math.floor((index-1)/10),width=bitmap.width/10,height=bitmap.height/7;
 const c=canvas(450,630);c.getContext('2d').drawImage(bitmap,col*width,row*height,width,height,0,0,450,630);return c;
}
function fitCanvas(bitmap,max=2200){const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const c=canvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);return c;}
export function knownAssetName(filename){return knownFilenames.has(String(filename).toLowerCase())||/^(development|war|culture)-\d{2}\.(webp|png|jpe?g)$/i.test(filename);}
export function assetInventory(files){
 // FileList may contain many thousands of files from OTHER mods. Never read nonmatches.
 const names=new Map();let examined=0,skipped=0;
 for(let i=0;i<files.length;i++){
  const f=files[i];examined++;
  if(!knownAssetName(f.name)||f.size>(f.name.toLowerCase()===BOARD_SOURCE.toLowerCase()?MAX_BOARD_SIZE:MAX_SIZE)){skipped++;continue;}
  const key=f.name.toLowerCase();if(!names.has(key))names.set(key,f);
 }
 return {names,examined,skipped,missingSheets:SHEETS.filter(s=>!names.has(s[1].toLowerCase())).map(s=>({family:s[0],first:s[3],last:s[3]+s[2]-1,filename:s[1]})),boardFound:names.has(BOARD_SOURCE.toLowerCase()),counterMatches:TTS_COUNTER_TILES.filter(s=>names.has(s.toLowerCase())).length};
}
export async function refreshLocalCards(){
 const keys=await tx('readonly',s=>s.getAllKeys());available.clear();counterNames.clear();counterMappings.clear();
 const cardIds=new Set(CARD_REFERENCE.map(c=>c.id));
 for(const key of keys){if(cardIds.has(key))available.add(key);else if(String(key).startsWith('counter:'))counterNames.add(String(key).slice(8));}
 for(const key of keys){if(!String(key).startsWith('counter-map:'))continue;const type=String(key).slice(12);const name=await tx('readonly',store=>store.get(key));if(counterNames.has(name))counterMappings.set(type,name);}
 // Card faces are used synchronously throughout the setup gallery and board.
 // Restore all imported faces after a reload; loading only a single selected
 // reference card leaves the remaining stored artwork falsely unassociated.
 const preload=[...available,...[...counterNames].map(name=>'counter:'+name)];
 for(let i=0;i<preload.length;i+=16){
  await Promise.all(preload.slice(i,i+16).map(imageForKey));
 }
 await refreshLocalBoard();lastReport=await tx('readonly',store=>store.get('scan-report'))||null;return available.size;
}
export function localCardCount(){return available.size;}
export function counterTileCount(){return counterNames.size;}
export function counterArtAssignments(){return [...counterMappings.entries()].map(([type,filename])=>({type,filename}));}
export function counterArtUrl(type,subtype=''){const specific=subtype?counterMappings.get(type+':'+subtype):null;const name=specific||counterMappings.get(type);return name?urls.get('counter:'+name)||null:null;}
export async function assignCounterArt(type,filename){
 if(typeof type!=='string'||!type||type.length>60)throw new Error('Invalid counter type.');
 if(!counterNames.has(filename))throw new Error('Select an imported counter image.');
 await tx('readwrite',store=>store.put(filename,'counter-map:'+type));
 counterMappings.set(type,filename);await imageForKey('counter:'+filename);
 return counterArtUrl(type);
}
export async function unassignCounterArt(type){
 await tx('readwrite',store=>store.delete('counter-map:'+type));counterMappings.delete(type);
}

// Owner-supplied TTS counter tiles, ordered by the verified front/back faces.
// 1–6, 1–F, 2–5, 2–F, 3–4, 3–F. Never distributed in source code.
const BAND_COUNTER_TILES=Object.freeze({
  1:Object.freeze({front:TTS_COUNTER_TILES[82],back:TTS_COUNTER_TILES[83]}),
  2:Object.freeze({front:TTS_COUNTER_TILES[84],back:TTS_COUNTER_TILES[85]}),
  3:Object.freeze({front:TTS_COUNTER_TILES[86],back:TTS_COUNTER_TILES[87]})
});
export function bandCounterArtUrl(strength,finished=false){
 const filename=BAND_COUNTER_TILES[strength]?.[finished?'back':'front'];
 return filename?urls.get('counter:'+filename)||null:null;
}
export async function loadBandCounterArt(){
 const names=[...new Set(Object.values(BAND_COUNTER_TILES).flatMap(x=>[x.front,x.back]))];
 await Promise.all(names.filter(name=>counterNames.has(name)).map(name=>imageForKey('counter:'+name)));
}
/** Automatic physical-face artwork by the exact original source tile number.
 * No guesses from piece colors, position, or mutable physical stock counts. */
export function physicalCounterImageUrlByIndex(index){
 const filename=Number.isInteger(index)&&index>=1&&index<=TTS_COUNTER_TILES.length?TTS_COUNTER_TILES[index-1]:null;
 return filename?urls.get('counter:'+filename)||null:null;
}
export function physicalCounterArtUrl(piece){return physicalCounterImageUrlByIndex(physicalCounterFaceIndex(piece));}

export async function loadPhysicalCounterArt(){
 const filenames=TTS_COUNTER_TILES.filter(name=>counterNames.has(name));
 await Promise.all(filenames.map(name=>imageForKey('counter:'+name)));
 return filenames.length;
}
export function cardImageUrl(id){return urls.get(id)||null;}
export function boardImageUrl(){return boardUrl;}
export function lastAssetReport(){return lastReport;}
export async function imageForKey(key){
 if(urls.has(key))return urls.get(key);
 const blob=await tx('readonly',s=>s.get(key));if(!(blob instanceof Blob))return null;
 const url=URL.createObjectURL(blob);urls.set(key,url);return url;
}
export async function loadCardImage(id){if(!available.has(id))return null;return imageForKey(id);}
export async function loadCounterTiles(limit=36,offset=0){
 return Promise.all([...counterNames].sort().slice(offset,offset+limit).map(async name=>({name,url:await imageForKey('counter:'+name)})));
}
export async function refreshLocalBoard(){
 if(boardUrl){URL.revokeObjectURL(boardUrl);boardUrl=null;}
 const image=await tx('readonly',s=>s.get(BOARD_KEY));if(image instanceof Blob)boardUrl=URL.createObjectURL(image);
 return Boolean(boardUrl);
}
export async function clearLocalCards(){
 await tx('readwrite',store=>{for(const card of CARD_REFERENCE)store.delete(card.id);});
 for(const [key,url] of urls){if(CARD_REFERENCE.some(c=>c.id===key)){URL.revokeObjectURL(url);urls.delete(key);}}
 available.clear();
}
export async function clearLocalArt(){
 await tx('readwrite',s=>s.clear());closeUrls();available.clear();counterNames.clear();counterMappings.clear();lastReport=null;
}
export async function importLocalCards(files,onProgress=()=>{}){
 const inv=assetInventory(files),names=inv.names;
 const status={examined:inv.examined,skipped:inv.skipped,board:false,boardFound:inv.boardFound,sheets:0,history:0,cardsImported:0,counterTiles:0,missingSheets:[],errors:[],total:0};
 const progress=()=>onProgress({...status});progress();
 for(const [kind,name,count,first] of SHEETS){
  const file=names.get(name.toLowerCase());
  if(!file){status.missingSheets.push({kind,first,last:first+count-1,reason:'not found',filename:name});continue;}
  let image=null;
  try{
   image=await decode(file,4500);
   if(image.width<900||image.height<750)throw new Error('Unexpected sheet dimensions');
   for(let i=0;i<count;i++){
    const id=kind.toLowerCase()+'-'+String(first+i).padStart(2,'0');
    const blob=await encode(subsetCanvas(image,i+1));
    await tx('readwrite',s=>s.put(blob,id));available.add(id);status.cardsImported++;
   }
   status.sheets++;
  }catch(err){status.missingSheets.push({kind,first,last:first+count-1,reason:'could not decode/store: '+err.message,filename:name});status.errors.push(kind+' '+first+'–'+(first+count-1)+': '+err.message);}
  finally{image?.close?.();}progress();
 }
 for(const [id,name] of HISTORY_SOURCES){
  const file=names.get(name.toLowerCase());if(!file)continue;
  let image=null;
  try{image=await decode(file,800);const blob=await encode(fitCanvas(image,750));await tx('readwrite',s=>s.put(blob,id));available.add(id);status.cardsImported++;status.history++;}
  catch(err){status.errors.push(id+': '+err.message);}finally{image?.close?.();}
 }
 // Individually extracted development-01.webp, etc., can fill a missing TTS sheet.
 for(const card of CARD_REFERENCE){
  if(available.has(card.id))continue;
  const file=names.get(card.id+'.webp')||names.get(card.id+'.png')||names.get(card.id+'.jpg');if(!file)continue;
  let image=null;
  try{image=await decode(file,750);const blob=await encode(fitCanvas(image,750));await tx('readwrite',s=>s.put(blob,card.id));available.add(card.id);status.cardsImported++;}
  catch(err){status.errors.push(card.id+': '+err.message);}finally{image?.close?.();}
 }
 progress();
 const boardFile=names.get(BOARD_SOURCE.toLowerCase());
 if(boardFile){
  let image=null;
  try{image=await decode(boardFile,2600,MAX_BOARD_SIZE);if(image.width<900||image.height<500)throw new Error('Unexpected board dimensions');
   const blob=await encode(fitCanvas(image,2600),.89);await tx('readwrite',s=>s.put(blob,BOARD_KEY));status.board=true;
  }catch(err){status.errors.push('Board ('+Math.round(boardFile.size/1024/1024)+' MB): '+err.message+'; try a browser with large-image decoding support.');}finally{image?.close?.();}
 }
 progress();
 // All 184 source tiles have verified face identities in physical-counter-catalog.js.
 // This indexes artwork only, NOT the quantity of physical duplicate tokens in the box.
 for(const name of TTS_COUNTER_TILES){
  const file=names.get(name.toLowerCase());if(!file)continue;
  let image=null;
  try{image=await decode(file,240);const blob=await encode(fitCanvas(image,200));await tx('readwrite',s=>s.put(blob,'counter:'+name));counterNames.add(name);status.counterTiles++;}
  catch(err){status.errors.push('Counter tile '+name+': '+err.message);}finally{image?.close?.();}
 }
 closeUrls();await refreshLocalCards();status.total=available.size;status.reusedFromCache=Math.max(0,status.total-status.cardsImported);
 await tx('readwrite',store=>store.put(status,'scan-report'));lastReport=status;progress();return {...status};
}
