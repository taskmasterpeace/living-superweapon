import {heroModelOf} from '../data/hero-models.js';

// Equipment visibility, not weapon ownership. Attachments stay on their driven
// sockets so contact, emitter and ragdoll transforms retain the same identity.
// Call before the rifle pose AND before firearmEmitter selects a paid shot:
// rifle() publishes _poseUntil before emitter lookup, including the first shot.
export function updateSoldierLoadoutPresentation(f) {
 if(!f.parts?.rig||heroModelOf(f.def).equipment!=='soldier'||f.state==='ko')return;
 let state=f._soldierLoadoutPresentation;
 if(!state||state.rig!==f.parts.rig){
  const arms=[f.parts.armL,f.parts.armR];
  const rifleArm=arms.find(arm=>arm.children[2].children.some(o=>o.userData.weaponKind==='rifle'));
  if(!rifleArm)return;
  const arm=arms.find(a=>a!==rifleArm),hand=arm.children[2];
  const weapons=hand.children.filter(o=>['sword','pistol'].includes(o.userData.weaponKind));
  state=f._soldierLoadoutPresentation={rig:f.parts.rig,arm,hand,weapons,shield:arm.userData.shield||null,
   otherGrip:!!hand.userData.gripOccupied&&!weapons.length};
 }
 const {arm,hand,weapons,shield}=state;
 // A held axe/sword/claw attack must not summon the native off-hand sword.
 const slash=!f._abilityMeleePose?.weapon&&f._abilityMeleePose?.slot?.def?.dmgClass==='slash';
 const pistol=Object.values(f.slots).some(slot=>slot.def.type==='rifle'&&
  (slot.def.weapon||(slot.def.interval&&slot.def.interval<.2?'rifle':'pistol'))==='pistol'&&
  (slot._poseUntil??-1)>=f.animT);
 for(const weapon of weapons)weapon.visible=weapon.userData.weaponKind==='sword'?slash:pistol;
 if(shield){
  shield.visible=!!f.guarding||(f.poseGuard||0)>.02;
  // Rifle support checks the shield carrier, not only its mesh visibility.
  arm.userData.shield=shield.visible?shield:null;
 }
 hand.userData.gripOccupied=state.otherGrip||hand.children.some(o=>o.visible&&o.userData.weaponKind);
}
