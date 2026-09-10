import {canChangeMouseTool} from './combat-selection.js';
import {MOTION_DEFAULTS} from '../data/flight-tuning.js';

export const soldierControlsActive=(f,game)=>f?.def?.archetype==='soldier'&&!!(f._openSky||game?.modeId==='powerworld');
const slots=['lmb','rmb','q','e','f','r'];
export function selectSoldierAttack(f,input){
 if(!canChangeMouseTool(f,input)||input.mouse.leftEdge||input.mouse.leftUp||input.mouse.rightEdge||input.mouse.rightUp||f._firearmReload||f._throwAction)return false;
 for(let i=0;i<slots.length;i++)if(input.pressed(`Digit${i+1}`)&&f.slots[slots[i]]){f._selSlot=slots[i];return true;}
 return false;
}
export function soldierSprint(f,input,mouseCombat){
 const attacks=Object.values(mouseCombat.slots).some(s=>s.held||s.pressed);
 f.sprintHeld=!!((input.down('ShiftLeft')||input.down('ShiftRight'))&&f.onFoot&&!f.flying&&!f.prone&&!f.crouching&&!f.descendHeld&&
  !attacks&&!mouseCombat.scope&&!f.guarding&&!input.mouse.b3&&!input.mouse.b4&&!f._firearmReload&&!f._throwAction&&!f.strikeActive&&!f.meleeCharge&&!f.grabState&&!f.grabbedBy&&!f.staggerT&&!f.frozenT&&
  Math.hypot(f.moveDir.x,f.moveDir.z)>.01);
 return f.sprintHeld?Math.max(1,Math.min(2.2,f.def.model?.motion?.groundSprint??MOTION_DEFAULTS.groundSprint)):1;
}
