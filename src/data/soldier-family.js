import {FIREARMS} from './armory.js';

// Ordinary units use the same Fighter, modular rig, melee and weapon systems as
// Sarge. Deliberately do not clone his hero kit: it includes jump jets/airstrike.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const SOLDIER_FOUNDATION=freeze({
 origin:'skilled',archetype:'soldier',family:'soldier',threat:'Low',
 hp:100,ki:80,speed:31,strength:3,rank:18,flightTier:0,guardType:'block',meleeTiers:2,
 model:{body:'faceted-v1',surface:'field',equipment:'soldier',costume:'tactical'},
 equipment:{personalWeapons:true},items:[],
 evade:{kind:'dash',name:'Combat Roll'},
});

// Appearance never grants armor, flight, training, allegiance or a weapon.
export const SOLDIER_APPEARANCES=freeze({
 olive:{name:'Olive field uniform',primary:'#596747',secondary:'#333e30',accent:'#d4bb72',skin:'#815333',headwear:'tactical',hair:'none',eyeColor:'#634c32'},
 desert:{name:'Desert patrol uniform',primary:'#a68b5c',secondary:'#5d503b',accent:'#d7c69a',skin:'#c2926d',headwear:'cap',hair:'none',eyeColor:'#5b694e'},
 urban:{name:'Urban security uniform',primary:'#435765',secondary:'#27333b',accent:'#bccbd0',skin:'#543824',headwear:'helmet',hair:'none',eyeColor:'#59422b'},
 winter:{name:'Winter field uniform',primary:'#c8ccbf',secondary:'#536157',accent:'#b7a273',skin:'#d9ae8b',headwear:'none',hair:'buzz',eyeColor:'#698082'},
});
export const SOLDIER_TEAM_MARKINGS=freeze({0:'#4e93c9',1:'#c95a4f'});

// These are established firearm definitions and AI preferences, not new AI
// classes. "Support" means sustained fire; no unimplemented squad orders.
export const SOLDIER_ROLES=freeze({
 rifleman:{name:'Rifleman',loadoutId:'m16',range:48,aggro:.55,talents:['marksman']},
 breacher:{name:'Breacher',loadoutId:'pump',range:22,aggro:.7,talents:['marksman']},
 marksman:{name:'Marksman',loadoutId:'m24',range:70,aggro:.4,talents:['marksman','tactician']},
 support:{name:'Support Gunner',loadoutId:'saw',range:52,aggro:.55,talents:['marksman']},
});
export const SOLDIER_TRAINING=freeze({
 cqc:{name:'Military CQC',art:'cqc'},boxing:{name:'Boxing',art:'boxing'},judo:{name:'Judo',art:'judo'},
});
export const SOLDIER_PRESETS=freeze([
 {id:'highwall-rifleman',name:'HIGHWALL RIFLEMAN',appearance:'olive',role:'rifleman',training:'cqc'},
 {id:'highwall-breacher',name:'HIGHWALL BREACHER',appearance:'desert',role:'breacher',training:'cqc'},
 {id:'highwall-marksman',name:'HIGHWALL MARKSMAN',appearance:'urban',role:'marksman',training:'boxing'},
 {id:'highwall-support',name:'HIGHWALL SUPPORT',appearance:'winter',role:'support',training:'judo'},
]);

function pick(table,key,label){if(!Object.hasOwn(table,key))throw new RangeError(`Unknown soldier ${label}: ${key}`);return table[key];}

/** Fresh native definition. Team is spawn metadata: pass it to addFighter opts. */
export function createSoldierFamilyDefinition({id,name,appearance='olive',role='rifleman',training='cqc',faction='highwall',team=1}={}){
 const look=pick(SOLDIER_APPEARANCES,appearance,'appearance'),job=pick(SOLDIER_ROLES,role,'role'),school=pick(SOLDIER_TRAINING,training,'training');
 if(typeof faction!=='string'||!faction.trim())throw new TypeError('Soldier faction needs a name');
 if(!Number.isInteger(team)||team<0)throw new RangeError('Soldier team must be a nonnegative integer');
 const weapon=FIREARMS.find(row=>row.id===job.loadoutId);
 if(!weapon)throw new Error(`Missing soldier armory weapon: ${job.loadoutId}`);
 const colors={primary:look.primary,secondary:look.secondary,accent:look.accent,skin:look.skin};
 const marking=SOLDIER_TEAM_MARKINGS[team]??look.accent;
 const result={...structuredClone(SOLDIER_FOUNDATION),
  id:id??`${faction}-${role}-${appearance}`,name:name??`${faction} ${job.name}`.toUpperCase(),
  title:job.name,role:`Military / ${job.name}`,combatRole:role,faction,team,appearanceId:appearance,trainingId:training,
  colors,art:school.art,talents:[...job.talents,'martial'].slice(0,3),
  ai:{style:'zoner',range:job.range,aggro:job.aggro,fly:0},
  build:{gaunt:1,weaponR:weapon.mesh},loadoutId:job.loadoutId,
  blurb:`${job.name} using standard field equipment and ${school.name} training.`,
  sig:[weapon.n,school.name,'Ground movement · standard guard'],
  abilities:{lmb:{...structuredClone(weapon.ab),voice:weapon.voice},shift:{type:'dash',name:'Combat Roll',cost:4,cd:.8,power:72,iframes:.2,color:look.accent}},
  modularRecipe:{schema:1,skeleton:'ual-deform-v1',body:'faceted-v1',name:look.name,
   frame:'hero',anatomy:'male',primary:look.primary,secondary:look.secondary,trim:'#252b28',skin:look.skin,emblemColor:marking,
   headwear:look.headwear,hair:look.hair,hairColor:'#302821',eyeColor:look.eyeColor,eyeGlow:false,
   armor:true,backpack:false,belt:true,beltStyle:'utility',knees:true,gloves:'full',footwear:'boots',
   emblem:'shield',emblemPlacement:'both',emblemScale:.7,regionColors:{belt:marking},cape:false,shoulders:false,gauntlets:false,muscle:1},
 };
 return result;
}

/** Clone before handing to equipFrom so per-fighter authoring cannot alter the bank. */
export function soldierLoadout(def){
 const row=FIREARMS.find(row=>row.id===def.loadoutId);
 if(!row)throw new RangeError(`Unknown soldier loadout: ${def.loadoutId}`);
 return structuredClone(row);
}
