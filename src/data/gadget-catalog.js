import {ROSTER} from './characters.js';
import {OPERATION_GADGETS} from './operation-gadgets.js';
// One live catalog for authoring views and training equipment, preserving variants.
export function gadgetCatalog(){
 const records=new Map();
 function add(def,owner){const key=JSON.stringify(def);if(!records.has(key))records.set(key,{def,owners:[]});records.get(key).owners.push(owner);}
 for(const def of OPERATION_GADGETS)add(def,'Threat Lab issue');
 for(const hero of ROSTER)for(const def of hero.items||[])add(def,hero.name);
 return [...records.values()].sort((a,b)=>(a.def.name||a.def.kind).localeCompare(b.def.name||b.def.kind));
}
