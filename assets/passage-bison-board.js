// Read-only legal candidates for the printed Passage of Time board, §4.4 step 12.
// The production reducer remains authoritative for every final relocation.
import {SPACES} from './engine.js';
export function passageBisonChoices(state){
 const territory=state?.passageBison?.currentTerritory||null;
 const none={territory,mode:'inactive',sources:[],targets:[]};
 if(!territory||state.phase!=='execution'||state.operation!=='Passage of Time'||state.steps?.pt11!=='done'||state.steps?.pt12==='done')return none;
 const spaces=SPACES.filter(x=>x.type==='round'&&x.territory===territory);
 const occupied=new Set(state.pieces.filter(p=>p.location).map(p=>p.location));
 const empty=spaces.filter(x=>!occupied.has(x.id));
 const stock=state.pieces.filter(p=>p.type==='Bison'&&p.location==='reserve');
 const here=state.pieces.filter(p=>p.type==='Bison'&&spaces.some(x=>x.id===p.location));
 if(empty.length&&stock.length)return {territory,mode:'place',sources:stock,targets:empty.map(x=>x.id)};
 const relocation=SPACES.filter(x=>['round','canyon'].includes(x.type)&&!occupied.has(x.id));
 if(!empty.length&&here.length&&relocation.length)return {territory,mode:'relocate',sources:here,targets:relocation.map(x=>x.id)};
 return {territory,mode:'none',sources:[],targets:[]};
}
