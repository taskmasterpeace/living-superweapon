// Shared families, not a separate animation per hero. Values are tuning defaults.
export const MELEE_APPROACHES=Object.freeze({
 step:{range:10,speed:55,arc:0},rush:{range:40,speed:175,arc:0},pounce:{range:60,speed:210,arc:7},
 bound:{range:72,speed:200,arc:12},flight:{range:80,speed:240,arc:0}
});
export function meleeApproach(def,airborne=false){
 const family=def.meleeApproach||(def.archetype==='soldier'||def.id==='sarge'?'step':airborne&&(def.flightTier??3)>0?'flight':def.id==='webline'?'pounce':def.id==='rage'?'bound':'rush');
 return {...(MELEE_APPROACHES[family]||MELEE_APPROACHES.step),family};
}
