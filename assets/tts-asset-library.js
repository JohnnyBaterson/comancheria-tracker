
export const SHEETS=[["Culture","httpssteamusercontentaakamaihdnetugc24742543565242199082AABB0D9657E2B3DE5614A7F580119EE72D16F83.png",24,1],["War","httpssteamusercontentaakamaihdnetugc24742543565242207505161E8DC390C236F483D5C3687421D3BA20824ED.png",25,1],["Development","httpssteamusercontentaakamaihdnetugc2474254356524222386199DA2975BDDE9E0F2B0EEB39195932F766DFC68.png",21,1],["Development","httpssteamusercontentaakamaihdnetugc2474254356524223769A76BE03423CC903422CE2854DC62E54E5A68D5.png",21,22],["Development","httpssteamusercontentaakamaihdnetugc2474254356524224403E660856074619230A7C6A40B802F84DA9306E75B.png",21,43],["Development","httpssteamusercontentaakamaihdnetugc2474254356524226240EC4E943BE67990B4947908B9CA28533E225FE58F.png",21,64]];
export const HISTORY_SOURCES=[["history-source-01","httpssteamusercontentaakamaihdnetugc24742543565242258522E645D57A11F5735B6AB26A87C6F394D4483BDB9.png"],["history-source-02","httpssteamusercontentaakamaihdnetugc2474254356524226005B3AF4017AA4F045AAB0389FB01BAC8265452EA5F.png"],["history-source-03","httpssteamusercontentaakamaihdnetugc24742543565242269426F36D3F82A8815B20332CF46654D606C2ED5CE3D.png"],["history-source-04","httpssteamusercontentaakamaihdnetugc2474254356524227093BF12AA34C29BAAF2FD56562A2516C903A0920820.png"]];
export const CARD_REFERENCE=[
 ...SHEETS.flatMap(([kind,sourceSheet,count,first])=>Array.from({length:count},(_,i)=>({id:kind.toLowerCase()+'-'+String(first+i).padStart(2,'0'),kind,label:kind==='Development'?'Development #'+String(first+i).padStart(2,'0'):kind+' sheet position '+(first+i),sourceSheet,sheetIndex:i+1}))),
 ...HISTORY_SOURCES.map(([id,sourceSheet],i)=>({id,kind:'History',label:'History source face '+(i+1),sourceSheet,sheetIndex:1}))
];
const STORE='faces',DATABASE='comancheria-local-tts-art',MAX_SIZE=45*1024*1024;
let databasePromise;
const available=new Set(),urls=new Map();
function database(){
 if(!('indexedDB' in globalThis))return Promise.reject(new Error('Browser-local image storage is unavailable.'));
 return databasePromise??=new Promise((resolve,reject)=>{
  const r=indexedDB.open(DATABASE,1);
  r.onupgradeneeded=()=>r.result.createObjectStore(STORE);
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error||new Error('Cannot open image database.'));
 });
}
async function transact(mode,fn){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),r=fn(tx.objectStore(STORE));
  let result;
  if(r){r.onsuccess=()=>{result=r.result;};r.onerror=()=>reject(r.error);}
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error||new Error('Image storage failed.'));
  tx.onabort=()=>reject(tx.error||new Error('Image storage aborted.'));
 });
}
function releaseUrls(){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}
export async function refreshLocalCards(){
 const keys=await transact('readonly',s=>s.getAllKeys()),known=new Set(CARD_REFERENCE.map(c=>c.id));
 available.clear();for(const key of keys)if(known.has(key))available.add(key);
 return available.size;
}
export function localCardCount(){return available.size;}
export function cardImageUrl(id){return urls.get(id)||null;}
export async function loadCardImage(id){
 if(!available.has(id))return null;
 if(urls.has(id))return urls.get(id);
 const blob=await transact('readonly',s=>s.get(id));
 if(!(blob instanceof Blob))return null;
 const url=URL.createObjectURL(blob);urls.set(id,url);return url;
}
export async function clearLocalCards(){await transact('readwrite',store=>{for(const card of CARD_REFERENCE)store.delete(card.id);});releaseUrls();available.clear();}
function compress(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Cannot encode image.')),'image/webp',0.83));}
function canvasFrom(bitmap,index){
 const canvas=document.createElement('canvas');canvas.width=450;canvas.height=630;
 const context=canvas.getContext('2d');
 if(index===null)context.drawImage(bitmap,0,0,bitmap.width,bitmap.height,0,0,450,630);
 else {
  const col=(index-1)%10,row=Math.floor((index-1)/10),width=Math.floor(bitmap.width/10),height=Math.floor(bitmap.height/7);
  context.drawImage(bitmap,col*width,row*height,width,height,0,0,450,630);
 }
 return canvas;
}
async function decode(file){
 if(!file||file.size<100||file.size>MAX_SIZE||!file.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/))return null;
 try{return await createImageBitmap(file);}catch{return null;}
}
export async function importLocalCards(files){
 const chosen=[...files];
 if(chosen.length>20000)throw new Error('Choose a smaller folder containing the Comanchería images.');
 const names=new Map();
 for(const f of chosen)if(f.size<=MAX_SIZE&&f.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)&&!names.has(f.name.toLowerCase()))names.set(f.name.toLowerCase(),f);
 let imported=0,sheetsFound=0,individualsFound=0;
 for(const [kind,name,count,first] of SHEETS){
  const image=await decode(names.get(name.toLowerCase()));
  if(!image)continue;
  if(image.width<1000||image.height<700){image.close?.();continue;}
  try{
   for(let i=0;i<count;i++){
    const id=kind.toLowerCase()+'-'+String(first+i).padStart(2,'0');
    const blob=await compress(canvasFrom(image,i+1));
    await transact('readwrite',s=>s.put(blob,id));
    available.add(id);imported++;
   }
   sheetsFound++;
  }finally{image.close?.();}
 }
 for(const card of CARD_REFERENCE){
  const file=names.get(card.id+'.webp')||names.get(card.id+'.png')||names.get(card.id+'.jpg');
  const image=await decode(file);if(!image)continue;
  try{
   const blob=await compress(canvasFrom(image,null));
   await transact('readwrite',s=>s.put(blob,card.id));available.add(card.id);
   imported++;individualsFound++;
  }finally{image.close?.();}
 }
 for(const [id,name] of HISTORY_SOURCES){
  if(available.has(id))continue;
  const image=await decode(names.get(name.toLowerCase()));if(!image)continue;
  try{
   const blob=await compress(canvasFrom(image,null));
   await transact('readwrite',s=>s.put(blob,id));available.add(id);
   imported++;individualsFound++;
  }finally{image.close?.();}
 }
 releaseUrls();
 return {imported,sheetsFound,individualsFound,total:available.size};
}
// File input and IndexedDB only; no image upload, network fetch, or save-game import.

const BOARD_KEY='board-reference';
let currentBoardUrl=null;
function releaseBoardUrl(){if(currentBoardUrl){URL.revokeObjectURL(currentBoardUrl);currentBoardUrl=null;}}
export function boardImageUrl(){return currentBoardUrl;}
export async function refreshLocalBoard(){
 const blob=await transact('readonly',store=>store.get(BOARD_KEY));
 releaseBoardUrl();
 if(blob instanceof Blob)currentBoardUrl=URL.createObjectURL(blob);
 return Boolean(currentBoardUrl);
}
export async function storeLocalBoard(file){
 const image=await decode(file);
 if(!image)throw new Error('Choose a PNG, JPEG or WebP image smaller than 45 MB.');
 try{
  if(image.width<500||image.height<300)throw new Error('The selected image is too small to be a board reference.');
  const scale=Math.min(1,2600/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await compress(canvas);
  await transact('readwrite',store=>store.put(blob,BOARD_KEY));
  releaseBoardUrl();currentBoardUrl=URL.createObjectURL(blob);
 }finally{image.close?.();}
 return currentBoardUrl;
}
export async function clearLocalBoard(){
 await transact('readwrite',store=>store.delete(BOARD_KEY));
 releaseBoardUrl();
}
