// Energy per admitted HP, after passive resistance and physical interception,
// before personal armor/shield pools. These are explicit prototype
// defaults, not damage multipliers. Author def.guardEnergy by attack family.
export const GUARD_ENERGY=Object.freeze({melee:1,bullet:1,beam:1,sustained:1,impact:1});
export function guardEnergyRate(def,opts={}){
 const family=opts.ballistic?'bullet':opts.strike?'melee':Number.isFinite(opts.beamDelta)?'beam':opts.dot?'sustained':'impact';
 const authored=def.guardEnergy?.[family];
 const rate=Number.isFinite(authored)?Math.min(4,Math.max(.25,authored)):GUARD_ENERGY[family];
 return rate*(def.guardStrong?.55:1);
}
