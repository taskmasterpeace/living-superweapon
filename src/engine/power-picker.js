import {selectedAttacks} from '../core/combat-selection.js';
import {POWERWORLD_CONTROLS} from '../core/powerworld-controls.js';
import {cancelHeldSlot} from './abilities.js';

// A modal owns its triggering gesture. Closing never releases a charged power.
export function mountPowerPicker(game){
 const dialog=document.createElement('dialog');dialog.className='pw-inventory';dialog.setAttribute('aria-label','Choose powers');document.body.append(dialog);
 let choice=null,assigned=false,padGesture=null,padRepeat=0,padDirection=0;
 const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 function assign(secondary){if(!choice||!game.player?.slots[choice])return;game.player[secondary?'_selSecondary':'_selSlot']=choice;assigned=true;game.hud?.selectSlot(game.player._selSlot,game.player._selSecondary);}
 function close(){if(dialog.open)dialog.close();}
 dialog.addEventListener('close',()=>{game.combatOverlayOpen=false;game.retireCombatViewInput(game.player,{preserveCarry:true});});
 function open(){if(dialog.open||!game.player?.alive||!game.running||game.hud?.titleOpen||game.combatOverlayOpen)return;
  game.retireCombatViewInput(game.player,{preserveCarry:true});game.combatOverlayOpen=true;assigned=false;choice=null;dialog.replaceChildren(el('h2','SELECT POWERS'),el('p','Point and release TAB: primary · Right click: secondary · TAB + wheel: cycle secondary · Esc: cancel'));
  for(const [key,slot] of Object.entries(game.player.slots)){if(!slot?.def)continue;const b=el('button',slot.def.name||key);b.onpointerenter=()=>{choice=key;};b.onfocus=()=>{choice=key;};b.onclick=()=>{choice=key;assign(false);close();};b.oncontextmenu=e=>{e.preventDefault();choice=key;assign(true);};dialog.append(b);}
  dialog.showModal();choice=null;
 }
 dialog.addEventListener('wheel',e=>{e.preventDefault();const f=game.player,{secondaryChoices}=selectedAttacks(f,POWERWORLD_CONTROLS);const i=secondaryChoices.indexOf(f._selSecondary);choice=secondaryChoices[(Math.max(0,i)+Math.sign(e.deltaY)+secondaryChoices.length)%secondaryChoices.length];assign(true);},{passive:false});
 const up=e=>{if(e.code==='Tab'&&dialog.open){if(!assigned)assign(false);close();}};window.addEventListener('keyup',up);
 function updatePad(dt){
  const pad=game.pad,f=game.player;
  if(!pad?.powerworld||!pad.connected||!f?.alive||!game.running||game.hud?.titleOpen){if(padGesture?.opened)close();padGesture=null;return;}
  if(!padGesture){
   if(dialog.open||game.combatOverlayOpen||pad.down('lmb')||pad.down('rmb'))return;
   const secondary=pad.pressed('cycleSecondary');
   if(!secondary&&!pad.pressed('cyclePrimary'))return;
   padGesture={secondary,index:secondary?15:14,age:0,opened:false,owner:f};
  }
  const gesture=padGesture;
  if(gesture.owner!==f){if(gesture.opened)close();padGesture=null;return;}
  if(!pad.raw(gesture.index)){
   if(gesture.opened&&dialog.open){assign(gesture.secondary);close();}
   else if(!gesture.opened&&!pad.down('lmb')&&!pad.down('rmb')&&!game.combatOverlayOpen){
    const field=gesture.secondary?'_selSecondary':'_selSlot',list=gesture.secondary?'secondaryChoices':'primaryChoices';
    const choices=selectedAttacks(f,POWERWORLD_CONTROLS)[list],index=choices.indexOf(f[field]);
    if(choices.length){cancelHeldSlot(f,f[field]);f[field]=choices[(index+1+choices.length)%choices.length];game.hud?.selectSlot(f._selSlot,f._selSecondary);}
   }
   padGesture=null;return;
  }
  gesture.age+=dt;
  if(!gesture.opened&&gesture.age>=.3){
   open();if(!dialog.open){padGesture=null;return;}
   gesture.opened=true;padRepeat=0;padDirection=0;
   choice=f[gesture.secondary?'_selSecondary':'_selSlot'];
   dialog.querySelector('p').textContent=`Right stick: choose · Release D-pad ${gesture.secondary?'right: secondary':'left: primary'} · B: cancel`;
  }
  if(!gesture.opened)return;
  if(!dialog.open){padGesture=null;return;}
  if(pad.pressed('evade')){close();padGesture=null;return;}
  const buttons=[...dialog.querySelectorAll('button')],keys=Object.keys(f.slots).filter(k=>f.slots[k]?.def);
  const axis=Math.abs(pad.ry)>Math.abs(pad.rx)?pad.ry:pad.rx,direction=Math.abs(axis)>.55?Math.sign(axis):0;
  padRepeat=Math.max(0,padRepeat-dt);
  if(direction&&(direction!==padDirection||padRepeat===0)){
   choice=keys[(Math.max(0,keys.indexOf(choice))+direction+keys.length)%keys.length];padRepeat=.2;
  }
  padDirection=direction;
  for(let i=0;i<buttons.length;i++)buttons[i].classList.toggle('padfocus',keys[i]===choice);
  buttons[keys.indexOf(choice)]?.focus();
 }
 return {open,close,updatePad,get isOpen(){return dialog.open;},dispose(){window.removeEventListener('keyup',up);dialog.remove();}};
}
