import {portraitOf} from './player-status-portrait.js';
import {equipmentPolicy} from './equipment-policy.js';
import {firearmAmmo} from './firearm-ammo.js';
import {gadgetCatalog} from '../data/gadget-catalog.js';
import {issueTrainingGadget} from './training-equipment.js';
export function mountInventory(game){
 const dialog=document.createElement('dialog');dialog.className='pw-inventory';dialog.setAttribute('aria-label','Inventory');document.body.append(dialog);
 const style=document.createElement('style');style.textContent=`.pw-inventory{margin:auto;width:min(640px,92vw);max-height:85vh;overflow:auto;background:var(--ink,#11110f);color:var(--text,#eee6d6);padding:24px;border:1px solid var(--gold,#dfb347);border-radius:10px;font-family:var(--f-display,system-ui)}.pw-inventory::backdrop{background:#080909c9}.pw-inventory h2{color:var(--gold,#dfb347)}.pw-inventory section{padding:14px 0;border-top:1px solid #514b3d}.pw-inventory button{min-height:44px;margin:6px 8px 0 0;padding:10px 16px;background:#24231e;color:inherit;border:1px solid #716044;border-radius:6px;cursor:pointer}.pw-inventory button:hover{border-color:#dfb347}.pw-inventory button[aria-pressed=true]{background:#594522}.pw-inventory p{line-height:1.5}`;style.textContent+=`.pw-inventory{width:min(1180px,96vw);max-width:none;max-height:94dvh;padding:28px 32px;background:#101113;display:none;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}.pw-inventory[open]{display:grid}.pw-inventory>h2,.pw-inventory>p,.pw-inventory>a,.pw-inventory>button{grid-column:1/-1}.pw-inventory h2{font-size:28px;letter-spacing:.06em;margin:0}.pw-inventory .inventory-portrait{width:100px;height:110px;object-fit:contain;grid-column:1/-1;justify-self:center}.pw-inventory>section{padding:16px;background:#191b1e;border:1px solid #414039;border-radius:6px}.pw-inventory .inventory-power{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;margin:8px 0}.pw-inventory .inventory-power button{margin:0}.pw-inventory a{color:#ffd34f}.pw-inventory button:disabled{opacity:.4;cursor:default}.pw-inventory button:focus-visible{outline:2px solid #ffd34f;outline-offset:2px}@media(max-width:640px){.pw-inventory{grid-template-columns:1fr;padding:16px}}`;document.head.append(style);
 const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};let previousOverlay=false;const portraits=new Map();
 function close(){if(dialog.open)dialog.close();}
 dialog.addEventListener('close',()=>{game.combatOverlayOpen=previousOverlay;game.retireCombatViewInput(game.player,{preserveCarry:true});});
 function render(){
  const f=game.player,policy=equipmentPolicy(f);dialog.replaceChildren(el('h2',`${f.def.name} · INVENTORY`));
  const portrait=document.createElement('img');portrait.className='inventory-portrait';portrait.alt=f.def.name+' portrait';try{if(!portraits.has(f.def.id))portraits.set(f.def.id,portraitOf(f.def));portrait.src=portraits.get(f.def.id);}catch{}dialog.prepend(portrait);
  const catalog=el('a','Browse all gadgets ↗');catalog.href='gadget-library.html';catalog.target='_blank';catalog.rel='noopener';dialog.append(catalog);
  dialog.append(el('p',policy.soldier?'Soldier equipment and carried gadgets.':'Living Superweapon · two gadgets · no backpack or personal weapons.'));
  if(policy.soldier){const section=el('section','');section.append(el('h3','Weapons'));const weapon=f._gearHeld,slot=weapon?f.slots._gear:f.slots.lmb,a=firearmAmmo(slot);section.append(el('p',`${slot?.def.name??'Unarmed'}${a?` · ${a.loaded}/${a.capacity} · ${a.reserve} reserve`:''}`));if(weapon){const drop=el('button','Drop carried weapon');drop.onclick=()=>{game.dropGear(f,true);render();};section.append(drop);}dialog.append(section);}
  const powers=el('section','');powers.append(el('h3','Powers'));
  for(const [key,slot] of Object.entries(f.slots)){if(!slot?.def||(key==='_gear'&&slot===f.slots.lmb))continue;const row=el('p','');row.className='inventory-power';row.append(el('span',slot.def.name||key));for(const secondary of [false,true]){const b=el('button',secondary?'Secondary':'Primary');b.setAttribute('aria-pressed',String(f[secondary?'_selSecondary':'_selSlot']===key));b.onclick=()=>{f[secondary?'_selSecondary':'_selSlot']=key;game.hud?.selectSlot(f._selSlot,f._selSecondary);render();};row.append(b);}powers.append(row);}dialog.append(powers);
  const items=f.items.slice(0,policy.gadgetLimit);if(!items.length)dialog.append(el('p','No gadgets carried.'));
  if(game.ms?.threatLab?.state==='preparing'){
   const issue=el('section','');issue.append(el('h3','Threat Lab · mission issue'));
   issue.append(el('p','Choose either gadget slot. Issued gear replaces that slot for this attempt.'));
   for(const {def} of gadgetCatalog())for(let index=0;index<2;index++){
    const b=el('button',`${def.name} → slot ${index+1}`);
    b.onclick=()=>{const result=issueTrainingGadget(game,f,def,index);if(!result.ok)game.hud?.feed(result.reason,'#d5bd80');render();};issue.append(b);
   }dialog.append(issue);
  }
  for(const [index,it] of items.entries()){
   const section=el('section','');section.append(el('h3',`${index+1} · ${it.def.name??it.def.kind}`));section.append(el('p',`${it.charges??0} charges · ${it.state}${it.cd>0?` · ${Math.ceil(it.cd)}s`:''}`));
   const select=el('button','Select gadget');select.setAttribute('aria-pressed',String((f._selectedGadget??0)===index));select.onclick=()=>{f._selectedGadget=index;render();};section.append(select);
   const use=el('button','Use and return');use.disabled=!['ready','deployed'].includes(it.state)||(it.state==='ready'&&((it.charges??1)<=0||it.cd>0));use.onclick=()=>{f._selectedGadget=index;close();game.useItem(f,index);};section.append(use);dialog.append(section);
  }
  const back=el('button','Return to game');back.onclick=close;dialog.append(back);
 }
 function open(){if(dialog.open||!game.player?.alive||!game.running||game.hud?.titleOpen||game.matchOver||game.combatOverlayOpen)return;previousOverlay=!!game.combatOverlayOpen;game.retireCombatViewInput(game.player,{preserveCarry:true});game.combatOverlayOpen=true;render();dialog.showModal();}
 const key=e=>{if(e.code==='KeyI'&&!e.repeat&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)){e.preventDefault();if(dialog.open)close();else open();}};window.addEventListener('keydown',key);
 return {open,close,get isOpen(){return dialog.open;},dispose(){window.removeEventListener('keydown',key);dialog.remove();style.remove();}};
}
