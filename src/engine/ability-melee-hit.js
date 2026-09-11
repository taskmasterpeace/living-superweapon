import * as THREE from 'three';

// Shared legacy ability payload. Contact policy chooses IF/WHERE it lands;
// this preserves the tuned damage, launch, chip/guard and impact feedback.
export function applyAbilityMeleeHit(c,def,st,g,foe,contact=null){
 if(st.hit.has(foe.id))return;
 st.hit.add(foe.id);
 const blocked=foe.guarding&&foe.staggerT<=0;
 foe.takeDamage((def.damage||20)*c.powerBuff,{src:c,strike:true,dmgClass:def.dmgClass,kb:new THREE.Vector3().copy(c.aim).setLength(def.knock||40).setY(0),launch:def.launch||12,hitstop:.13});
 c.hitstop=Math.max(c.hitstop,.08);
 const imp=contact?.clone()||foe.pos.clone().set((c.pos.x+foe.pos.x)/2,(c.pos.y+foe.pos.y)/2+5.7,(c.pos.z+foe.pos.z)/2);
 if(blocked){g.vfx.impactStar(imp,7,'#bfe0ff',.16);g.world.shake(.4);g.audio.zap(520);}
 else{
  g.vfx.impact(imp,{x:c.aim.x,z:c.aim.z},{color:def.color||c.def.colors.accent,power:1.6});
  g.world.shake(1.4);g.world.punch(.72);g.audio.impact(1.2,imp);g.audio.boom(.3,imp);
  g.slowmo(.1,.45);if(g.hud)g.hud.flashScreen('#fff',.14);
 }
}
