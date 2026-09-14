// Approved defaults. User-authored SoundLibrary bindings take precedence.
export const SOUND_LIBRARY_SAMPLES={
 grab:'library.grab',
 'grenade-prepare':'library.grenade-prepare',
 'vehicle-explosion':'boom',
 'nanite-form':'library.nanite-form','nanite-break':'library.nanite-break','nanite-reform':'library.nanite-reform',
 light:'library.melee',heavy:'library.melee','scout-gunshot':'wpn.saw',
 'weather-rain':'library.rain','weather-domain-rain':'library.domain-rain',
 'weather-domain-thunder':'library.thunder','grenade-release':'library.grenade-release',
};
export const LIBRARY_SAMPLES={
 'gear.ifak':{f:['ai-pass/final/gear-ifak'],g:.55,reach:80},
 'library.grenade-prepare':{f:['ai-pass/final/evt-grenade-pin'],g:.55,reach:80},
 'library.grab':{f:['ai-pass/grab'],g:.55,reach:150},
 ...Object.fromEntries(['nanite-form','nanite-break','nanite-reform'].map(id=>['library.'+id,{f:['ai-pass/'+id],g:.55,reach:150}])),
 'library.melee':{f:['sfx-cc0/final/sfx_punch_flesh_a','sfx-cc0/final/sfx_punch_flesh_b'],g:.7,reach:150},
 'library.rain':{f:['ai-pass/weather-rain'],g:.4,loop:true,reach:240},
 'library.domain-rain':{f:['ai-pass/weather-domain-rain'],g:.4,loop:true,reach:240},
 'library.thunder':{f:['ai-pass/weather-domain-thunder'],g:.55,reach:600},
 'library.grenade-release':{f:['ai-pass/grenade-release'],g:.5,reach:150},
};
