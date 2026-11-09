/**
 * Opportunistic stale-tab guard for local-only autosave. Not an atomic database
 * lock; it prevents ordinary accidental two-tab overwrites without file imports.
 */
export const SAVE_CONFLICT_MESSAGE='This game was changed in another browser tab. This tab is read-only to avoid overwriting it. Reload this page to load the newest local save.';
export function revisionOf(saved){return typeof saved?.revision==='string'&&saved.revision.length<=120?saved.revision:null;}
export function parseSave(raw){if(raw===null||raw===undefined)return null;try{return JSON.parse(raw);}catch{return null;}}
export function hasStaleRevision(expected, raw){
  if(raw===null||raw===undefined)return expected!==null;
  const saved=parseSave(raw);
  if(!saved||typeof saved!=='object'||!('state' in saved))return true;
  return revisionOf(saved)!==expected;
}
export function makeRevision(){
  // A revision *identifier*, not a password or authentication credential.
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
