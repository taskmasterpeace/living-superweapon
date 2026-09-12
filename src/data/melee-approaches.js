// Shared families, not a separate animation per hero. Values are tuning defaults.
export const MELEE_APPROACHES=Object.freeze({
 step:{range:10,speed:55,arc:0},pounce:{range:28,speed:120,arc:7},
 bound:{range:36,speed:130,arc:12},flight:{range:32,speed:135,arc:0}
});
export function meleeApproach(def,airborne=false){
 const family=def.meleeApproach||(airborne&&(def.flightTier??3)>0?'flight':def.id==='webline'?'pounce':def.id==='rage'?'bound':'step');
 return {...(MELEE_APPROACHES[family]||MELEE_APPROACHES.step),family};
}
