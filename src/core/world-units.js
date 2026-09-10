// Preserve the established character/environment scale. Simulation positions
// use world units; velocity u/s; acceleration u/s²; all durations use seconds.
// Metres and km/h are presentation/import units, never alternate physics axes.
export const METERS_PER_UNIT=.19;
export const UNITS_PER_METER=1/METERS_PER_UNIT;
export const unitsToMeters=units=>units*METERS_PER_UNIT;
export const metersToUnits=meters=>meters/METERS_PER_UNIT;
export const unitsPerSecondToKmh=speed=>unitsToMeters(speed)*3.6;
export const kmhToUnitsPerSecond=speed=>metersToUnits(speed/3.6);
export const travelSeconds=(distance,speed)=>distance<=0?0:speed>0?distance/speed:Infinity;
// Constant deceleration only; exponential flight braking has a different model.
export const stoppingDistance=(speed,deceleration)=>speed===0?0:deceleration>0?speed*speed/(2*deceleration):Infinity;
