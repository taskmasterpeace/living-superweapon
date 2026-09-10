// The sight changes observation, never projectile speed, targeting assistance or
// hit rules. Distances remain world units; rounds always travel to their contact.
export function firearmLife(def){return def.life??(def.weapon==='shotgun'?.34:1.4);}
export function firearmAimRange(f,fallback){
 let reach=fallback;
 for(const key of [f._selSlot||'lmb',f._selSecondary||'rmb']){
  const d=f.slots?.[key]?.def;
  if(d?.type==='rifle')reach=Math.max(reach,(d.speed||170)*firearmLife(d)*Math.max(1,d.stance?.rangeMult??1));
 }
 return Math.min(6000,reach);
}
export function firearmSightZoom(f){
 if(!f?._scopeHeld||!f._openSky||f.alive===false||f.flying||f._aircraftVehicle||f._scoutVehicle||f._firearmReload||f._throwAction||f.guarding||f.grabbedBy||f.staggerT>0||f.frozenT>0||f.strikeActive>0||f.meleeCharge)return 1;
 const d=f.slots?.[f._selSlot||'lmb']?.def;
 return d?.type==='rifle'?Math.max(1,Math.min(6,d.scopeZoom||1)):1;
}
