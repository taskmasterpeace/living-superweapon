// Canyon walls are authored geological bands, not a radial obstacle ring.
// Spans are full widths/depths; each mass still registers native destructible
// cover and gets its detailed closed sandstone skin asynchronously.
import composition from './frontline-escarpment-layout.json' with {type:'json'};
import background from './frontline-background-layout.json' with {type:'json'};
export const FRONTLINE_FORMATIONS=composition.formations;
export const FRONTLINE_FAR_BANDS=background.far;
// Exterior ground was accepted with these supporting features. Moving only the
// rendered backdrop must not silently reshape its physical/visual base.
export const FRONTLINE_BASE_FAR_BANDS=composition.far;

// Four composed three-fragment talus piles. Negative X is screen-right in the
// native forward camera. Leave the convoy corridor x=-170..-290,z=180..500 free.
export const FRONTLINE_TALUS=[
 [-185,128,44,46,22,.16],[-219,118,48,43,28,-.12],[-188,163,38,36,16,.31],
 [-288,642,48,50,26,-.18],[-322,663,43,44,20,.14],[-278,682,40,36,15,-.28],
 [195,106,44,48,23,-.13],[229,119,48,45,29,.16],[200,145,38,36,17,-.27],
 [195,382,46,48,24,.18],[220,414,43,46,28,-.15],[178,417,38,35,15,.29],
].map(([x,z,width,depth,height,yaw],i)=>({x,z,width,depth,height,yaw,variant:i%4}));
