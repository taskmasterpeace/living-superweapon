// Fixed match lighting. No extra lights, particles or per-frame allocations.
export const DAYLIGHT_PRESETS = Object.freeze({
 day: Object.freeze({id:'day',label:'Day',time:.2,sun:2.7,hemi:.68,ambient:.18,rim:.7,skyMix:1,environment:.22}),
 sunset: Object.freeze({id:'sunset',label:'Sunset',time:.6,sun:1.65,hemi:.62,ambient:.23,rim:.8,skyMix:.28,environment:.10,skyTop:'#526a77',skyHorizon:'#cc925a'}),
 night: Object.freeze({id:'night',label:'Night',time:.75,sun:.38,hemi:.48,ambient:.28,rim:.85,skyMix:0,environment:.035}),
});
export const daylightPreset=id=>Object.hasOwn(DAYLIGHT_PRESETS,id)?DAYLIGHT_PRESETS[id]:DAYLIGHT_PRESETS.day;
