import * as T from 'three';
import {inventoryEntries,inventoryAttackActive,setHeldStowed} from './inventory-model.js';
import {solveModularArm} from './modular-held-pose.js';
import {traceCameraGround} from './camera-ground.js';

const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function handheldUnavailable(f){
 if(!f)return 'No active character.';
 if(!inventoryEntries(f).some(e=>e.kind==='device'))return 'This character is not carrying a game device.';
 if(!f.alive||f.stunT>0||f.staggerT>0||f.frozenT>0||f.sleepT>0||f.launchT>0||f.downedT>0||f.ragdoll)return 'Recover before using the game device.';
 if(f.flying||f.gliding||f.airborne)return 'Land before using the game device.';
 if(f.prone||f.crouching||(f._pronePose?.weight||0)>.05)return 'Stand upright before using the game device.';
 const water=f._game?._simWater;
 if(f.pos&&((f.pos.y<2&&f._game?.world.waterAt?.(f.pos.x,f.pos.z)===2)||(water&&f.pos.y<water.y&&Math.abs(f.pos.x-water.cx)<water.hw&&Math.abs(f.pos.z-water.cz)<water.hd)))return 'Leave deep water before using the game device.';
 if(f._vehicle||f.vehicle||f._fleetVehicle||f._aircraftVehicle||f._passengerTransport)return 'Leave the vehicle before using the game device.';
 if(f.grabbing||f.grabbedBy||f._carry||f._personCarry||f._guidedSpear?.hand||f._grapple||f.hanging)return 'Free both hands before using the game device.';
 if(f._firearmReload||f.meleeCharge>0||f.guarding||inventoryAttackActive(f))return 'Finish the current action before using the game device.';
 if(!f._modularCharacter?.actor)return 'This body does not yet support the device hold.';
 return '';
}

export function buildHandheldDevice(){
 const group=new T.Group();group.name='Handheld game device';
 const dark=new T.MeshStandardMaterial({color:0x292f2c,roughness:.8}),ivory=new T.MeshStandardMaterial({color:0xc8c9b9,roughness:.8}),red=new T.MeshStandardMaterial({color:0x9b3430,roughness:.8});
 const box=(name,w,h,d,x,y,z,mat)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.name=name;mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 box('body',.54,.29,.045,0,0,0,dark);box('left grip',.065,.27,.065,-.265,0,-.008,ivory);box('right grip',.065,.27,.065,.265,0,-.008,ivory);
 box('left control',.036,.036,.012,-.264,0,.032,red);box('right control',.036,.036,.012,.264,0,.032,red);
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#101d18';ctx.fillRect(0,0,640,360);ctx.strokeStyle='#9b3430';ctx.lineWidth=8;ctx.strokeRect(16,16,608,328);ctx.textAlign='center';ctx.fillStyle='#dcded1';ctx.font='bold 43px sans-serif';ctx.fillText('COMING SOON',320,185);ctx.font='20px sans-serif';ctx.fillText('WAR WORLD · POCKET SYSTEM',320,225);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const screen=new T.Mesh(new T.PlaneGeometry(.41,.230625),new T.MeshBasicMaterial({map:texture,toneMapped:false}));screen.name='device screen';screen.position.z=.024;screen.rotation.z=Math.PI;group.add(screen);
 for(const [side,x]of [['L',.285],['R',-.285]]){const grip=new T.Object3D();grip.name='device-grip-'+side;grip.position.set(x,0,-.008);group.add(grip);}
 return {group,screen,dispose(){texture.dispose();const mats=new Set();group.traverse(o=>{o.geometry?.dispose();if(o.material)mats.add(o.material);});for(const m of mats)m.dispose();group.removeFromParent();}};
}

// Camera and prop presentation owner only. It never moves the simulation body,
// changes aim, pauses the world, or replaces the player's weapon/slot/ammo.
export class HandheldDeviceView{
 constructor(game){this.game=game;this.state=null;this.pendingRestore=null;}
 get isOpen(){return !!this.state;}
 open(f){
  const reason=handheldUnavailable(f);if(reason)return this.reject(reason);
  if(!this.game.world.camera?.isPerspectiveCamera)return this.reject('Use third-person view before inspecting the game device.');
  if(this.state)return false;
  const saved={gear:f._gearHeld,mount:f._heldMount,stowed:!!f._inventoryStowed};
  if(saved.gear&&!saved.stowed&&!setHeldStowed(f,true))return this.reject('Stow your weapon after finishing its current action.');
  const hands=[f.parts?.armL?.children[2],f.parts?.armR?.children[2]];
  if(hands.some(h=>!h||h.userData.gripOccupied||h.children.some(o=>o.visible&&o.userData.weaponKind))){if(saved.gear&&!saved.stowed)setHeldStowed(f,false);return this.reject('Free both hands before using the game device.');}
  const prop=buildHandheldDevice(),camera=this.game.world.camera;
  this.state={owner:f,actor:f._modularCharacter.actor,parts:f.parts,hp:f.hp,saved,prop,phase:'enter',elapsed:0,from:camera.position.clone(),fromQ:camera.quaternion.clone(),fromFov:camera.fov,claims:hands.map(hand=>({hand,occupied:hand.userData.gripOccupied,kind:hand.userData.gripKind}))};
  for(const claim of this.state.claims){claim.hand.userData.handheldDeviceOwner=this;claim.hand.userData.gripOccupied=true;claim.hand.userData.gripKind='handheld-device';}
  f.obj.add(prop.group);document.body?.classList.add('pw-device-view');this.game.retireCombatViewInput?.(f,{preserveCarry:true});this.game.combatOverlayOpen=true;return true;
 }
 reject(reason){this.game.hud?.feed?.(reason);return false;}
 close({immediate=false}={}){const s=this.state;if(!s)return;if(immediate){this.finish();return;}if(s.phase==='exit')return;s.phase='exit';s.elapsed=0;const c=this.game.world.camera;s.from=c.position.clone();s.fromQ=c.quaternion.clone();s.fromFov=c.fov;}
 finish(){const s=this.state;if(!s)return;for(const {hand,occupied,kind}of s.claims)if(hand.userData.handheldDeviceOwner===this){delete hand.userData.handheldDeviceOwner;hand.userData.gripOccupied=occupied;hand.userData.gripKind=kind;}s.prop.dispose();document.body?.classList.remove('pw-device-view');this.pendingRestore={owner:s.owner,...s.saved};this.state=null;this.restoreWeapon();}
 restoreWeapon(){const saved=this.pendingRestore;if(!saved)return;const f=saved.owner;if(!f.alive||f._gearHeld!==saved.gear||f._heldMount!==saved.mount){this.pendingRestore=null;return;}if(saved.stowed||!saved.gear||setHeldStowed(f,false))this.pendingRestore=null;}
 frameCamera(dt){
  this.restoreWeapon();const s=this.state,g=this.game,w=g.world;if(!s)return false;
  if(g.player!==s.owner||s.owner.parts!==s.parts||s.owner._modularCharacter?.actor!==s.actor||!g.running||g.matchOver||g.mapCam||!s.owner.alive){this.close({immediate:true});return false;}
  if((s.owner.hp<s.hp||handheldUnavailable(s.owner))&&s.phase!=='exit')this.close();
  s.elapsed+=Math.max(0,Math.min(.05,dt||0));const u=smooth(s.elapsed/.32),weight=s.phase==='exit'?1-u:u;
  const f=s.owner,c=w.camera,group=s.prop.group,scale=s.actor.getWorldScale(new T.Vector3()).x;
  group.scale.setScalar(scale);group.position.set(0,scale*(1.02+.18*weight),scale*.45);group.rotation.set(-2.05,0,0);group.visible=weight>.005;
  f.obj.updateWorldMatrix(true,true);const pose=[];
  for(const side of ['L','R']){const hand=s.actor.getObjectByName('DEF-hand'+side),upper=s.actor.getObjectByName('DEF-upper_arm'+side),fore=s.actor.getObjectByName('DEF-forearm'+side);if(!hand||!upper||!fore)continue;
   const before=[upper,fore,hand].map(b=>[b,b.quaternion.clone()]);const target=group.getObjectByName('device-grip-'+side).getWorldPosition(new T.Vector3());
   for(let i=0;i<8;i++){s.actor.updateWorldMatrix(true,true);const wrist=hand.getWorldPosition(new T.Vector3()),palm=hand.localToWorld(new T.Vector3(0,.075,.028));solveModularArm(s.actor,side,target.clone().sub(palm.sub(wrist)));}
   for(const [b,q]of before)b.quaternion.slerpQuaternions(q,b.quaternion.clone(),weight);
   s.actor.updateWorldMatrix(true,true);pose.push({side,gap:hand.localToWorld(new T.Vector3(0,.075,.028)).distanceTo(target)});
  }
  s.contacts=pose;for(const {hand}of s.claims){hand.userData.gripOccupied=true;hand.userData.gripKind='handheld-device';}
  if(s.phase==='exit'){
   w.chase(f,null,dt,'bfp');const destination=c.position.clone(),rotation=c.quaternion.clone(),fov=c.fov;
   c.position.lerpVectors(s.from,destination,u);c.quaternion.slerpQuaternions(s.fromQ,rotation,u);c.fov=T.MathUtils.lerp(s.fromFov,fov,u);c.updateProjectionMatrix();c.updateMatrixWorld(true);
   if(u>=1){this.finish();}return true;
  }
  const distance=Math.max(.29/(2*Math.tan(Math.PI/8)*.68),.61/(2*Math.tan(Math.PI/8)*Math.max(.5,c.aspect)*.8));
  const target=s.prop.screen.getWorldPosition(new T.Vector3()),eye=group.localToWorld(new T.Vector3(0,0,distance));
  // Sweep the camera path against the existing world collision, including
  // terrain. Never turn a close-device view into a wall-clipping shortcut.
  const t=Math.min(w._camNearestT?.(...s.from.toArray(),...eye.toArray(),.15)??1,traceCameraGround(w,s.from,eye,.15));eye.lerpVectors(s.from,eye,t);
  const goal=new T.PerspectiveCamera();goal.position.copy(eye);goal.up.set(0,1,0);goal.lookAt(target);
  c.position.lerpVectors(s.from,eye,u);c.quaternion.slerpQuaternions(s.fromQ,goal.quaternion,u);c.fov=T.MathUtils.lerp(s.fromFov,45,u);c.updateProjectionMatrix();c.updateMatrixWorld(true);if(u>=1)s.phase='hold';return true;
 }
 dispose(){this.close({immediate:true});this.pendingRestore=null;}
}
