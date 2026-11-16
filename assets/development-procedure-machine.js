/** Development-card pending choice contract. This module never changes dice,
 * cards or counters; the production reducer remains the effect authority.
 * Legacy kindless/manual blocks retain DEVELOPMENT_CONFIRM_EFFECT.
 */
const COMMANDS=Object.freeze({
 'physical-stock':['DEVELOPMENT_REGISTER_PHYSICAL_STOCK'],
 'texas-stock':['DEVELOPMENT_REGISTER_TEXAS_STOCK'],
 'epidemic':['DEVELOPMENT_RESOLVE_EPIDEMIC','DEVELOPMENT_SELECT_EPIDEMIC_BAND'],
 'smallpox-end':['DEVELOPMENT_RESOLVE_SMALLPOX'],
 'buffalo-hunters':['DEVELOPMENT_BUFFALO_RESOLVE'],
 'horse-discard':['DEVELOPMENT_RESOLVE_HORSE_DISCARD','DEVELOPMENT_SELECT_HORSE_DISCARD'],
 'cuerno-medicine':['DEVELOPMENT_RESOLVE_MEDICINE'],
 'quanah-medicine':['DEVELOPMENT_RESOLVE_MEDICINE','DEVELOPMENT_VERIFY_QUANAH_MEDICINE'],
 'kiowa-alliance':['DEVELOPMENT_RESOLVE_KIOWA','DEVELOPMENT_KIOWA_STAGE'],
 'indian-removal-displace':['DEVELOPMENT_INDIAN_REMOVAL_MOVE'],
 'fort-gibson-displace':['DEVELOPMENT_FORT_GIBSON_MOVE'],
 'nuevo-apacheria':['DEVELOPMENT_NUEVO_APACHERIA'],
 'ute-displacement':['DEVELOPMENT_RESOLVE_UTE_DISPLACEMENT'],
 'van-dorn-rancheria':['DEVELOPMENT_VAN_DORN_TARGET'],
 'van-dorn-battle':['DEVELOPMENT_VAN_DORN_BATTLE'],
 'special-battle-target':['DEVELOPMENT_SPECIAL_TARGET'],
 'special-battle-band':['DEVELOPMENT_SPECIAL_BAND'],
 'special-battle-roll':['DEVELOPMENT_SPECIAL_BATTLE'],
 // Missing physical map evidence still requires the documented manual path.
 'special-battle-map':['DEVELOPMENT_CONFIRM_EFFECT'],
 'van-dorn-map':['DEVELOPMENT_CONFIRM_EFFECT']
});
const LEGACY=['DEVELOPMENT_CONFIRM_EFFECT','DEVELOPMENT_CLEAR_HAND_REVEAL','DEVELOPMENT_SAN_SABA_RESOLVE'];
export function developmentAllowedCommands(p){
 if(!p)return [];
 if(!p.kind)return [...LEGACY];
 return [...(COMMANDS[p.kind]||[])];
}
export function developmentProcedureIssues(p){
 if(!p)return [];
 const issues=[];
 if(p.kind!=null&&(typeof p.kind!=='string'||!Object.hasOwn(COMMANDS,p.kind)))issues.push(`Unknown Development pending kind ${String(p.kind)}`);
 if(typeof p.number!=='string'||!/^\d{2}$/.test(p.number))issues.push('Development pending card number is not a two-digit identifier');
 if(typeof p.cardId!=='string'||!p.cardId)issues.push('Development pending cardId is missing');
 const arrays={'epidemic':['spaces'],'smallpox-end':['bandIds'],'horse-discard':['horseIds'],'kiowa-alliance':['tribeIds'],'indian-removal-displace':['rancheriaIds'],'cuerno-medicine':['chiefIds'],'quanah-medicine':['chiefIds'],'ute-displacement':['destinations'],'special-battle-band':['bandIds'],'special-battle-roll':['gunIds','chiefIds'],'van-dorn-battle':['gunIds','chiefIds']};
 for(const field of arrays[p.kind]||[])if(!Array.isArray(p[field]))issues.push(`Development ${p.kind} missing ${field} list`);
 if(p.kind==='horse-discard'&&p.selectedHorseIds!==undefined){
  if(!Array.isArray(p.selectedHorseIds)||new Set(p.selectedHorseIds).size!==p.selectedHorseIds.length||p.selectedHorseIds.some(id=>!p.horseIds?.includes(id))||p.selectedHorseIds.length>=p.required)issues.push('Invalid staged Horse discard selections');
 }
 return issues;
}
export function developmentCommandAllowed(p,type){
 return !p||type==='NOTE'||developmentAllowedCommands(p).includes(type);
}
