export const FIREARM_RECORDINGS={ak762:'wpn.ak',ar556:'wpn.m16',smg9:'wpn.smg',lmg762:'wpn.saw',pistol9:'wpn.pistol',sniper762:'wpn.bolt',battle762:'wpn.battle',shotgun12:'wpn.pump',magnum:'wpn.magnum',amr50:'wpn.m107'};
export const FIREARM_SAMPLES=Object.fromEntries(Object.entries({ak:['gun_ak_a','gun_ak_b'],m16:['gun_ar15_a'],smg:['gun_smg_a'],saw:['gun_smg2_a'],pistol:['gun_pistol2_a'],bolt:['gun_bolt_a'],battle:['gun_battle_a'],pump:['sfx_shotgun_fire_a']}).map(([id,files])=>['wpn.'+id,{f:files.map(f=>'sfx-cc0/final/'+f),g:.55,reach:200}]));

Object.assign(FIREARM_SAMPLES,{'wpn.magnum':{f:['ai-pass/final/wpn-magnum'],g:.55,reach:200},'wpn.m107':{f:['ai-pass/final/wpn-m107'],g:.55,reach:350}});
