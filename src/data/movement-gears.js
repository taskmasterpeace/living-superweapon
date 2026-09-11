import {MOTION_DEFAULTS} from './flight-tuning.js';

// Prototype wish-speed multipliers, applied to each actor's existing base speed.
// No XP, damage or flight permission lives here. Rates are /second; response is
// exponential (same terminal velocity at 30/60/120Hz). No shared 210u/s ceiling.
// Author an override with def.movement={profile,maxGear,ground,air,groundKi,airKi,
// acceleration,boostAcceleration,braking,turning}. VOLT is explicit, never prose-derived.
const profile=(value)=>Object.freeze(Object.fromEntries(Object.entries(value).map(([key,v])=>[key,Array.isArray(v)?Object.freeze(v):v])));
export const MOVEMENT_PROFILES=Object.freeze({
 soldier:profile({maxGear:2,ground:[1.65,1.9],air:[1,1.1],groundKi:[0,0],airKi:[0,0],acceleration:9,boostAcceleration:8,braking:9,turning:8}),
 grounded:profile({maxGear:2,ground:[1.35,1.8],air:[1,1.2],groundKi:[0,2],airKi:[0,2],acceleration:8,boostAcceleration:7,braking:8,turning:6}),
 awkward:profile({maxGear:1,ground:[1.3],air:[1.5],groundKi:[0],airKi:[2.6],acceleration:7,boostAcceleration:5.5,braking:6,turning:4.5}),
 levitator:profile({maxGear:2,ground:[1.3,1.65],air:[1.5,2.5],groundKi:[0,2],airKi:[2.6,6],acceleration:7,boostAcceleration:5.5,braking:6,turning:4.5}),
 flyer:profile({maxGear:3,ground:[1.3,1.7,2.2],air:[1.5,3,5],groundKi:[0,2,4],airKi:[2.6,6,12],acceleration:9,boostAcceleration:6,braking:5.5,turning:4}),
 speedster:profile({maxGear:3,ground:[2.2,4.2,6.5],air:[1.5,2,2.6],groundKi:[1,5,10],airKi:[2.6,6,10],acceleration:11,boostAcceleration:8,braking:9,turning:6}),
});
export const MOVEMENT_CHARACTER_PROFILES=Object.freeze({volt:'speedster'});
const cachedProfiles=new WeakMap(),NO_OVERRIDES=Object.freeze({});
const finite=(value,fallback,min,max)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
export function movementProfile(f){
 const def=f.def??f,authored=def.movement??NO_OVERRIDES,tier=def.flightTier??3;
 const id=authored.profile??MOVEMENT_CHARACTER_PROFILES[def.id]??(def.archetype==='soldier'?'soldier':tier>=3?'flyer':tier===2?'levitator':tier===1?'awkward':'grounded');
 // Authoring replaces def.movement; model sprint edits are scalar and checked too.
 const sprint=def.model?.motion?.groundSprint,cached=cachedProfiles.get(def);
 if(cached?.authored===authored&&cached.id===id&&cached.sprint===sprint)return cached.value;
 const base=MOVEMENT_PROFILES[id]??MOVEMENT_PROFILES.grounded,maxGear=Math.round(finite(authored.maxGear,base.maxGear,1,3));
 const out={...base,id,maxGear};
 for(const key of ['ground','air','groundKi','airKi'])out[key]=Array.from({length:maxGear},(_,i)=>finite(authored[key]?.[i],base[key][Math.min(i,base[key].length-1)],key.endsWith('Ki')?0:1,key.endsWith('Ki')?100:12));
 for(const key of ['acceleration','boostAcceleration','braking','turning'])out[key]=finite(authored[key],base[key],.5,30);
 if(id==='soldier'&&!authored.ground){const first=finite(def.model?.motion?.groundSprint,MOTION_DEFAULTS.groundSprint,1,2.2);out.ground=Array.from({length:maxGear},(_,i)=>Math.min(2.2,first*1.15**i));}
 const value=profile(out);cachedProfiles.set(def,{authored,id,sprint,value});return value;
}
