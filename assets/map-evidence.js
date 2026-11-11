/**
 * Printed board topology transcribed from the user-supplied first, flat photograph
 * of the actual Comanchería board (2026-11-09). The photo is a visual reference,
 * not bundled or redistributed. Source categories: white continuous, white
 * interrupted, yellow West, green South, blue East and shared blue/green.
 *
 * This is not an assurance of complete official movement-line coverage:
 * ambiguous obscured routes remain separate candidates until checked.
 */
export const MAP_EVIDENCE_VERSION=6;
export const MAP_EVIDENCE_SOURCE='User-provided photograph of the authentic Comanchería game board (9 Nov 2026); cross-checked with GMT Living Playbook';
export const MAP_EVIDENCE_URL='https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/comancheria/Comancheria_LivingPlaybook_Low-Res.pdf';
export const FINAL_MAP_URL='https://www.gmtgames.com/p-789-comanchera-mounted-map.aspx';
export const GMT_MAP_PHOTO_WEST='https://www.gmtgames.com/images/product/medium/872_10_.jpg';
export const GMT_MAP_PHOTO_EAST='https://www.gmtgames.com/images/product/medium/872_5_.jpg';
export const MAP_EVIDENCE_EDGES=Object.freeze([
  {a:'UA-1',b:'UA-2',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'UA-2',b:'UA-4',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'UA-2',b:'UA-5',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'UA-3',b:'UA-4',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'UA-4',b:'UA-5',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'UA-5',b:'UA-6',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'UA-6',b:'N',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'LE-2',b:'LE-3',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'LE-2',b:'LE-4',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'LE-4',b:'LE-5',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'LE-5',b:'LE-6',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'RG-2',b:'RG-3',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'RG-3',b:'RG-4',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'RR-6',b:'RR-5',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'RR-5',b:'RR-4',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'RR-3',b:'LA-1',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'RR-6',b:'LA-5',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'BC-3',b:'LE-6',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'LE-6',b:'BC-5',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'BC-2',b:'BC-3',kind:'solid',reference:'user-board-photo',detail:'Visible uninterrupted printed board line'},
  {a:'UA-1',b:'W',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'UA-4',b:'PD',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'UA-4',b:'RR-6',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'LE-3',b:'PD',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'LE-4',b:'PD',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'LE-4',b:'RG-3',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'PD',b:'BC-3',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'RG-3',b:'S',kind:'dashed',reference:'user-board-photo',detail:'Visible interrupted white line on uploaded board'},
  {a:'W',b:'LE-1',kind:'solid',enemyFor:['West'],reference:'user-board-photo',detail:'Visible yellow West Enemy Connection on uploaded board'},
  {a:'W',b:'LE-2',kind:'solid',enemyFor:['West'],reference:'user-board-photo',detail:'Visible yellow West Enemy Connection on uploaded board'},
  {a:'W',b:'RG-1',kind:'solid',enemyFor:['West'],reference:'user-board-photo',detail:'Visible yellow West Enemy Connection on uploaded board'},
  {a:'LE-1',b:'UA-3',kind:'solid',enemyFor:['West'],reference:'user-board-photo',detail:'Visible yellow West Enemy Connection on uploaded board'},
  {a:'RG-1',b:'RG-2',kind:'solid',enemyFor:['West'],reference:'user-board-photo',detail:'Visible yellow West Enemy Connection on uploaded board'},
  {a:'S',b:'RG-5',kind:'solid',enemyFor:['South'],reference:'user-board-photo',detail:'Visible green South Enemy Connection on uploaded board'},
  {a:'RG-4',b:'RG-5',kind:'solid',enemyFor:['South'],reference:'user-board-photo',detail:'Visible green South Enemy Connection on uploaded board'},
  {a:'RG-5',b:'RG-6',kind:'solid',enemyFor:['South'],reference:'user-board-photo',detail:'Visible green South Enemy Connection on uploaded board'},
  {a:'RG-5',b:'BC-6',kind:'solid',enemyFor:['South'],reference:'user-board-photo',detail:'Visible green South Enemy Connection on uploaded board'},
  {a:'RG-6',b:'LE-5',kind:'solid',enemyFor:['South'],reference:'user-board-photo',detail:'Visible green South Enemy Connection on uploaded board'},
  {a:'RG-6',b:'LE-6',kind:'solid',enemyFor:['South'],reference:'user-board-photo',detail:'Visible green South Enemy Connection on uploaded board'},
  {a:'RG-6',b:'BC-5',kind:'solid',enemyFor:['South'],reference:'user-board-photo',detail:'Visible green South Enemy Connection on uploaded board'},
  {a:'E1',b:'LA-1',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'E1',b:'RR-1',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'E2',b:'UA-6',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'UA-6',b:'LA-6',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'LA-6',b:'LA-5',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'LA-5',b:'LA-4',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'LA-4',b:'LA-3',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'LA-3',b:'LA-2',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'LA-2',b:'LA-1',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'RR-1',b:'RR-2',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'RR-2',b:'RR-3',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'RR-2',b:'BC-1',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'RR-2',b:'BC-2',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'RR-3',b:'RR-4',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'RR-4',b:'BC-3',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'BC-1',b:'BC-4',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'BC-4',b:'BC-5',kind:'solid',enemyFor:['East'],reference:'user-board-photo',detail:'Visible blue East Enemy Connection on uploaded board'},
  {a:'BC-4',b:'BC-6',kind:'solid',enemyFor:['South','East'],reference:'user-board-photo',detail:'Green and blue shared South/East connection; both may Settle/Subjugate across this line'},
].map(e=>Object.freeze(e)));
/** Every plausible nearby pair was checked against the full uploaded board photo;
 * these two formerly uncertain pairs have no joining printed line. */
export const MAP_CONNECTION_CANDIDATES=Object.freeze([]);

/** Compare physical connection type AND full Enemy-color membership.
 * An uncolored solid is not equivalent to a green/blue/yellow Enemy line. */
export function mapConnectionMatches(actual,source){
 if(!actual||!source)return false;
 if(actual.kind!==source.kind)return false;
 const a=Array.isArray(actual.enemyFor)?[...actual.enemyFor].sort():[];
 const b=Array.isArray(source.enemyFor)?[...source.enemyFor].sort():[];
 return a.length===b.length&&a.every((color,index)=>color===b[index]);
}
export function mapConnectionReconciliation(current,source=MAP_EVIDENCE_EDGES){
 const key=e=>[e.a,e.b].sort().join('|');
 const byKey=new Map((current||[]).map(e=>[key(e),e]));
 const missing=[],upgradeColor=[],conflicts=[],matching=[];
 for(const expected of source){
  const actual=byKey.get(key(expected));
  if(!actual){missing.push(expected);continue;}
  if(mapConnectionMatches(actual,expected)){matching.push(expected);continue;}
  // A recorded solid without color metadata is geometrically correct but
  // not safe for colored Enemy traversal until upgraded from photo evidence.
  if(actual.kind===expected.kind&&expected.enemyFor?.length&&!actual.enemyFor?.length){
   upgradeColor.push({actual,expected});continue;
  }
  conflicts.push({actual,expected});
 }
 return {missing,upgradeColor,conflicts,matching};
}
