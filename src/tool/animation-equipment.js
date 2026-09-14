import * as T from 'three';
import {createModularWeaponPreview} from '../engine/modular-weapon-preview.js';
import {buildWeapon} from '../engine/figure.js';
const swordTakes=new Set(['Sword_Idle','Sword_Attack','Sword_Block','Sword_Dash','Sword_Regular_A','Sword_Regular_A_Rec','Sword_Regular_B','Sword_Regular_B_Rec','Sword_Regular_C','Sword_Regular_Combo','Sword_Heavy_Combo']);
const shieldTakes=new Set(['Idle_Shield_Loop','Shield_OneShot','Shield_Dash','Idle_Shield_Break']);
export function recommendationForTake(take){return {weapon:swordTakes.has(take)?'sword':['TreeChopping_Loop','Throwing axe / left','Throwing axe'].includes(take)?'axe':['Boomerang throw / left','Boomerang throw'].includes(take)?'boomerang':'none',shield:shieldTakes.has(take),hand:['Throwing axe / left','Boomerang throw / left'].includes(take)?'left':'right'};}
export const ANIMATION_EQUIPMENT_CHOICES=['auto','none','sword','axe','boomerang','rifle','pistol'];
// Preview-only mounts. No fighter inventory, profile, clip or bone pose is changed.
export function createAnimationEquipment(actor){
 const native=createModularWeaponPreview(actor),right=actor.getObjectByName('DEF-handR'),left=actor.getObjectByName('DEF-handL');
 const owned=new Set(),geometries=new Set(),extras={};
 const mat=new T.MeshStandardMaterial({color:'#485151',roughness:.6,metalness:.3});owned.add(mat);
 for(const kind of ['rifle','pistol','boomerang']){
  const root=new T.Group();root.name='animation-preview-'+kind;root.position.set(0,.075,.028);root.rotation.x=Math.PI/2;right.add(root);extras[kind]=root;
  if(kind!=='boomerang'){const mesh=buildWeapon(kind,{armor:mat});mesh.scale.setScalar(.25);mesh.rotation.z=Math.PI;root.add(mesh);}
  else {const shape=new T.Shape();shape.moveTo(-.24,.22);shape.lineTo(-.3,.16);shape.lineTo(-.035,-.035);shape.lineTo(.035,-.035);shape.lineTo(.3,.16);shape.lineTo(.24,.22);shape.lineTo(0,.075);shape.closePath();root.add(new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),mat));}
  root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material){for(const m of Array.isArray(n.material)?n.material:[n.material])owned.add(m);}});
 }
 let state={weapon:'none',shield:false,hand:'right'},disposed=false;
 const api={get state(){return {...state};},set(choice={},take=''){
  if(disposed)throw Error('Animation equipment disposed');const auto=recommendationForTake(take);
  const selected={...state,...choice};if(selected.hand==='auto'||(choice.weapon==='auto'&&!choice.hand))selected.hand=auto.hand;if(selected.weapon==='auto'){selected.weapon=auto.weapon;selected.shield=choice.shield??auto.shield;}
  if(!ANIMATION_EQUIPMENT_CHOICES.includes(selected.weapon))throw Error('Unknown animation equipment');
  if(!['left','right'].includes(selected.hand))throw Error('Unknown preview hand');
  state={weapon:selected.weapon,shield:!!selected.shield,hand:selected.hand};
  native.set({weapon:['sword','axe'].includes(state.weapon)?state.weapon:'none',shield:state.shield&&(state.hand!=='left'||state.weapon==='none')});
  for(const [kind,group]of Object.entries({...native.weapons,...extras})){
   if(!['sword','axe',...Object.keys(extras)].includes(kind))continue;
   (state.hand==='left'?left:right).add(group);if(extras[kind])group.visible=kind===state.weapon;
  }
  return {...state,warning:state.weapon==='rifle'?'Rifle prop only: support-hand IK/contact is unproven. Source motion unchanged.':state.shield&&state.hand==='left'&&state.weapon!=='none'?'Shield hidden: left hand is occupied by weapon. Preview only.':'Preview grip only; source motion and gameplay assignment unchanged'};
 },clear(){return api.set({weapon:'none',shield:false,hand:'right'});},dispose(){if(disposed)return;disposed=true;native.dispose();for(const root of Object.values(extras))root.removeFromParent();for(const g of geometries)g.dispose();for(const m of owned)m.dispose();}};
 api.clear();return api;
}
