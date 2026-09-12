import {equipmentPolicy} from './equipment-policy.js';
import {firearmAmmo} from './firearm-ammo.js';
import {OPERATION_GADGETS} from '../data/operation-gadgets.js';
export function mountInventory(game){
 const dialog=document.createElement('dialog');dialog.className='pw-inventory';dialog.setAttribute('aria-label','Inventory');document.body.append(dialog);
 const style=document.createElement('style');style.textContent=`.pw-inventory{margin:auto;width:min(640px,92vw);max-height:85vh;overflow:auto;background:var(--ink,#11110f);color:var(--text,#eee6d6);padding:24px;border:1px solid var(--gold,#dfb347);border-radius:10px;font-family:var(--f-display,system-ui)}.pw-inventory::backdrop{background:#080909c9}.pw-inventory h2{color:var(--gold,#dfb347)}.pw-inventory section{padding:14px 0;border-top:1px solid #514b3d}.pw-inventory button{min-height:44px;margin:6px 8px 0 0;padding:10px 16px;background:#24231e;color:inherit;border:1px solid #716044;border-radius:6px;cursor:pointer}.pw-inventory button:hover{border-color:#dfb347}.pw-inventory button[aria-pressed=true]{background:#594522}.pw-inventory p{line-height:1.5}`;document.head.append(style);
 const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};let previousOverlay=false;
 function close(){if(dialog.open)dialog.close();}
 dialog.addEventListener('close',()=>{game.combatOverlayOpen=previousOverlay;game.retireCombatViewInput(game.player,{preserveCarry:true});});
 function render(){
  const f=game.player,policy=equipmentPolicy(f);dialog.replaceChildren(el('h2',`${f.def.name} · INVENTORY`));
  dialog.append(el('p',policy.soldier?'Soldier equipment and carried gadgets.':'Living Superweapon · two gadgets · no backpack or personal weapons.'));
  if(policy.soldier){const section=el('section','');section.append(el('h3','Weapons'));const weapon=f._gearHeld,slot=weapon?f.slots._gear:f.slots.lmb,a=firearmAmmo(slot);section.append(el('p',`${slot?.def.name??'Unarmed'}${a?` · ${a.loaded}/${a.capacity} · ${a.reserve} reserve`:''}`));if(weapon){const drop=el('button','Drop carried weapon');drop.onclick=()=>{game.dropGear(f,true);render();};section.append(drop);}dialog.append(section);}
  const powers=el('section','');powers.append(el('h3','Powers'));
  for(const [key,slot] of Object.entries(f.slots)){if(!slot?.def||(key==='_gear'&&slot===f.slots.lmb))continue;const row=el('p',slot.def.name||key);for(const secondary of [false,true]){const b=el('button',secondary?'Secondary':'Primary');b.setAttribute('aria-pressed',String(f[secondary?'_selSecondary':'_selSlot']===key));b.onclick=()=>{f[secondary?'_selSecondary':'_selSlot']=key;game.hud?.selectSlot(f._selSlot,f._selSecondary);render();};row.append(b);}powers.append(row);}dialog.append(powers);
  const items=f.items.slice(0,policy.gadgetLimit);if(!items.length)dialog.append(el('p','No gadgets carried.'));
  if(game.ms?.threatLab?.state==='preparing'){
   const issue=el('section','');issue.append(el('h3','Threat Lab · mission issue'));
   issue.append(el('p','Choose either gadget slot. Issued gear replaces that slot for this attempt.'));
   for(const def of OPERATION_GADGETS)for(let index=0;index<2;index++){
    const b=el('button',`${def.name} → slot ${index+1}`);
    b.onclick=()=>{const old=f.items[index];if(old?.state==='deployed'){game.hud?.feed('Recall the deployed gadget before replacing it','#d5bd80');return;}if(index>f.items.length){game.hud?.feed('Fill slot 1 first','#d5bd80');return;}f.items[index]={def,state:'ready',cd:0,pos:null,mesh:null,charges:def.charges};f._selectedGadget=index;render();};issue.append(b);
   }dialog.append(issue);
  }
  for(const [index,it] of items.entries()){
   const section=el('section','');section.append(el('h3',`${index+1} · ${it.def.name??it.def.kind}`));section.append(el('p',`${it.charges??0} charges · ${it.state}${it.cd>0?` · ${Math.ceil(it.cd)}s`:''}`));
   const select=el('button','Select gadget');select.setAttribute('aria-pressed',String((f._selectedGadget??0)===index));select.onclick=()=>{f._selectedGadget=index;render();};section.append(select);
   const use=el('button','Use and return');use.disabled=!['ready','deployed'].includes(it.state);use.onclick=()=>{f._selectedGadget=index;close();game.useItem(f,index);};section.append(use);dialog.append(section);
  }
  const back=el('button','Return to game');back.onclick=close;dialog.append(back);
 }
 function open(){if(dialog.open||!game.player?.alive||!game.running||game.hud?.titleOpen||game.matchOver||game.combatOverlayOpen)return;previousOverlay=!!game.combatOverlayOpen;game.retireCombatViewInput(game.player,{preserveCarry:true});game.combatOverlayOpen=true;render();dialog.showModal();}
 const key=e=>{if(e.code==='KeyI'&&!e.repeat&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)){e.preventDefault();if(dialog.open)close();else open();}};window.addEventListener('keydown',key);
 return {open,close,get isOpen(){return dialog.open;},dispose(){window.removeEventListener('keydown',key);dialog.remove();style.remove();}};
}
