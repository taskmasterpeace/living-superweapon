import {pathToFileURL} from 'node:url';
import {ROSTER} from '../src/data/characters.js';
import {applyDtypes} from '../src/data/visual.js';
import {TYPES} from '../src/engine/abilities.js';
import {validateRoster} from '../src/engine/abilityMeta.js';

const cosmetic=new Set(['name','color','color2','vis','vprofile','sfx']);
function canonical(value) {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
  .sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
 return value;
}

// Static candidate inventory, not an automatic deletion list or gameplay verdict.
// Mirrors boot's dtype derivation, but intentionally excludes browser-local customs.
export function auditRoster(source) {
 const roster=structuredClone(source);applyDtypes(roster);
 const types={},exact=new Map(),sameKitFamilies=[],slots=[];
 for(const hero of roster){
  const families=new Map();
  for(const [slot,ability] of Object.entries(hero.abilities||{})){
   const key=`${hero.id}.${slot}`;
   slots.push({key,name:ability.name,type:ability.type,dtype:ability.dtype});
   types[ability.type]=(types[ability.type]||0)+1;
   const mechanical=Object.fromEntries(Object.entries(ability).filter(([k])=>!cosmetic.has(k)));
   const signature=JSON.stringify(canonical(mechanical));
   if(!exact.has(signature))exact.set(signature,[]);exact.get(signature).push(key);
   const family=[ability.type,ability.construct||ability.weapon||(ability.web?'web':ability.zip?'zip':'')].filter(Boolean).join(':');
   if(!families.has(family))families.set(family,[]);
   families.get(family).push({slot,name:ability.name,definition:ability});
  }
  for(const [family,abilities] of families)if(abilities.length>1)sameKitFamilies.push({hero:hero.id,family,abilities});
 }
 return {scope:'Checked-in roster plus boot-derived damage types; no browser-local Studio/custom overrides',
  heroes:roster.length,slots:slots.length,types,validationProblems:validateRoster(roster,TYPES),
  exactDuplicates:[...exact.values()].filter(group=>group.length>1).map(slots=>({slots})),
  sameKitFamilies,inventory:slots};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log(JSON.stringify(auditRoster(ROSTER),null,2));
