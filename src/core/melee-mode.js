import {canChangeMouseTool} from './combat-selection.js';

// Change tools only between actions. A held trigger must never become a punch
// (or release a charged projectile) because Tab changed its meaning.
export function toggleMeleeMode(f,input){
 if(!f?.alive||!canChangeMouseTool(f,input)||f._firearmReload||f._throwAction||f.staggerT>0||f.frozenT>0)return false;
 if(f._tabMelee){
  const saved=f._meleePrevious||{};
  f._selSlot=f.slots[saved.primary]?saved.primary:'lmb';
  f._selSecondary=f.slots[saved.secondary]?saved.secondary:'rmb';
  f._tabMelee=false;f._meleePrevious=null;
 }else{
  f._meleePrevious={primary:f._selSlot||'lmb',secondary:f._selSecondary||'rmb'};
  f._tabMelee=true;f._selSlot='melee';f._selSecondary='grab';
 }
 f._mouseCombat=null;
 return true;
}
export const meleeKeymap=(f,map)=>f?._tabMelee?{...map,mouseMelee:true}:map;
