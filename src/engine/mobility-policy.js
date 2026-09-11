// Venue controls altitude behavior, never capability. Temporary equipment can
// grant flight, but a natural flyer cannot bypass vehicle rules by landing.
export function canUseFlight(f){return Number(f?.flightTier??f?.def?.flightTier??0)>0;}
export function canPilotVehicle(f){
 return !!f?.alive&&!f.flying&&!canUseFlight(f)&&!(Number(f.def?.flightTier)>0)
  &&!f._scoutVehicle&&!f._aircraftVehicle&&!f.grabbedBy&&!f.grabbing
  &&!(f.staggerT>0)&&!(f.frozenT>0);
}
