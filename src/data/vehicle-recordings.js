// Locked real CC0 vehicle picks: public/audio/sfx-veh/final/veh-winners.json.
// Keep the acceleration transient separate from the sustained idle loop.
export const VEHICLE_SAMPLES=Object.fromEntries([
 ['start',['start_a'],.6,140],
 ['idle',['idle_a'],.5,160,true],
 ['accel',['accel_a','accel_b'],.6,180],
 ['off',['off_a'],.6,120],
 ['door.open',['door_open_a'],.6,90],
 ['door.close',['door_close_a'],.6,90],
 ['hood',['hood_a','hood_b'],.6,90],
 ['trunk',['trunk_a'],.6,90],
 ['horn',['horn_a'],.6,220],
 ['brake',['brake_a'],.6,120],
 ['impact',['impact_a','impact_b','impact_c'],.7,160],
].map(([id,files,g,reach,loop=false])=>['veh.'+id,{f:files.map(f=>'sfx-veh/final/veh_'+f),g,reach,loop}]));
export const VEHICLE_RECORDINGS=Object.fromEntries(Object.keys(VEHICLE_SAMPLES).map(sample=>['vehicle-'+sample.slice(4).replaceAll('.','-'),sample]));
