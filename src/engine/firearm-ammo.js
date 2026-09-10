import {resetReloadProps} from './reload-presentation.js';
import {resolveMotionClip} from './motion-banks.js';
// Physical ammunition belongs to the slot, never a mesh or the shared roster def.
export function firearmAmmo(slot){
 const d=slot?.def;if(d?.type!=='rifle'||!Number.isInteger(d.magazine)||d.magazine<1){if(slot)slot.ammo=null;return null;}
 if(!slot.ammo)slot.ammo={loaded:d.magazine,capacity:d.magazine,reserve:Math.max(0,Math.floor(d.reserveAmmo??120)),dryUntil:0};
 return slot.ammo;
}
const interrupted=f=>f.alive===false||f.state==='ko'||f.frozenT>0||f.staggerT>0||f.stunT>0||f.grabbedBy||f.grabbing||f.grabState||f.guarding||f.strikeActive>0||f.meleeCharge>0||f._disarmT>0||f._aircraftVehicle||f._scoutVehicle;
const cue=(g,id,f)=>g?.audio?.soundLibrary?.play(id,{pos:f.pos,loop:false});
const PROCEDURAL_RELOAD_TIMELINE=Object.freeze({eject:.2,drawStart:.2,drawFull:.31,handlingStart:.31,handlingFull:.42,
 handlingRelease:.44,handlingEnd:.54,insertStart:.49,insert:.65,boltStart:.78,chamber:.9,boltEnd:.94,toBoltStart:.68,toBoltEnd:.78});
function reloadTimeline(motion){
 const events=motion?.metadata?.events,sourceDuration=motion?.clip?.duration;
 if(!Array.isArray(events)||!(sourceDuration>0))return PROCEDURAL_RELOAD_TIMELINE;
 const phase=type=>{const event=events.find(e=>e.type===type);return Number.isFinite(event?.t)?event.t/sourceDuration:NaN;};
 const eject=phase('mag-out'),insert=phase('mag-in');
 if(!(eject>=0&&eject<insert&&insert<1))return PROCEDURAL_RELOAD_TIMELINE;
 const span=insert-eject,boltEvent=events.find(e=>e.type==='bolt'||e.type==='chamber'),chamber=Number.isFinite(boltEvent?.t)?boltEvent.t/sourceDuration:.9;
 return Object.freeze({eject,drawStart:Math.max(0,eject-Math.min(.08,span*.3)),drawFull:eject,
  handlingStart:eject,handlingFull:eject+span*.25,handlingRelease:eject+span*.55,handlingEnd:eject+span*.78,
  insertStart:eject+span*.7,insert,boltStart:Math.max(insert,chamber-.12),chamber,boltEnd:Math.min(1,chamber+.04),
  toBoltStart:Math.max(insert,chamber-.22),toBoltEnd:Math.max(insert,chamber-.12)});
}
export function cancelFirearmReload(f){resetReloadProps(f);f._firearmReload=null;}
export function requestReload(f,key,g){
 const slot=f.slots[key],a=firearmAmmo(slot);
 if(!a||f._throwAction||f._firearmReload||interrupted(f)||a.loaded>=a.capacity||a.reserve<=0||Object.values(f.slots).some(s=>s.charging||s.building||s.drawing||s.active?.sustaining))return false;
 const motion=resolveMotionClip(f,'reload','reload');
 f._firearmReload={key,slot,elapsed:0,duration:Math.max(.25,slot.def.reloadTime??2.2),phase:0,motion,timeline:reloadTimeline(motion)};
 slot._poseUntil=-1;if(f._rangedPose?.slot===key)f._rangedPose=null;
 cue(g,'reload',f);return true;
}
export function updateFirearmReload(f,dt,g){
 const r=f._firearmReload;if(!r)return;
 if(interrupted(f)||f.slots[r.key]!==r.slot){cancelFirearmReload(f);return;}
 if(g?.paused||g?.combatOverlayOpen||g?.hud?.titleOpen||f.hitstop>0||!Number.isFinite(dt)||dt<=0)return;
 r.elapsed+=dt;
 const phases=[[r.timeline.eject,'reload-eject'],[r.timeline.insert,'reload-insert'],[r.timeline.chamber,'reload-chamber']];
 while(r.phase<phases.length&&r.elapsed>=r.duration*phases[r.phase][0])cue(g,phases[r.phase++][1],f);
 if(r.elapsed+1e-8<r.duration)return;
 const a=firearmAmmo(r.slot),rounds=Math.min(a.capacity-a.loaded,a.reserve);a.loaded+=rounds;a.reserve-=rounds;
 cancelFirearmReload(f);
}
export function emptyFirearm(f,slot,g){
 const a=firearmAmmo(slot),now=f.animT||0;if(now>=a.dryUntil){cue(g,'empty',f);a.dryUntil=now+.6;}
 const key=Object.keys(f.slots).find(key=>f.slots[key]===slot);requestReload(f,key,g);
}
export function firearmStatus(f,key){
 const a=f.slots[key]?.ammo;if(!a)return '';
 const r=f._firearmReload;
 if(r?.key===key)return `RELOAD ${Math.ceil(100*Math.min(1,r.elapsed/r.duration))}% · ${a.loaded}/${a.reserve}`;
 return `${a.loaded} / ${a.reserve} · ${a.loaded===0&&a.reserve===0?'NO AMMO':`${f.def.archetype==='soldier'?'R':'Y'} RELOAD`}`;
}
