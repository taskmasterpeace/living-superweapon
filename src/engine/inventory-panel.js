import {castHandMask} from './cast-channels.js';
import {portraitOf} from './player-status-portrait.js';
import {equipmentPolicy} from './equipment-policy.js';
import {firearmAmmo} from './firearm-ammo.js';
import {gadgetCatalog} from '../data/gadget-catalog.js';
import {issueTrainingGadget} from './training-equipment.js';
import {openArmory} from './armoryUI.js';
import {inventoryLayout,moveInventoryEntry,setHeldStowed} from './inventory-model.js';
import {INVENTORY_CSS} from './inventory-style.js';
import {HandheldDeviceView} from './handheld-device-view.js';

export function mountInventory(game){
 const deviceView=game.handheldDeviceView??=new HandheldDeviceView(game);
 const dialog=document.createElement('dialog');dialog.className='pw-inventory';dialog.setAttribute('aria-label','Backpack and equipment');document.body.append(dialog);
 const style=document.createElement('style');style.textContent=INVENTORY_CSS+'\nbody.pw-device-view #hud .combat-dock,body.pw-device-view #highwall-controls{visibility:hidden;pointer-events:none;}';document.head.append(style);
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(name,action)=>{const b=el('button',name);b.type='button';b.onclick=action;return b;};
 const deviceReturn=button('Put away device · Escape',()=>deviceView.close());deviceReturn.hidden=true;deviceReturn.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:100;padding:12px 20px;border:1px solid #c8c9b9;border-radius:10px;background:#292f2c;color:#efefe4;cursor:pointer;font:14px Inter,system-ui,sans-serif';document.body.append(deviceReturn);
 let previousOverlay=false,selected=null,owner=null,lastFocus=null,drag=null,loot=null;const portraits=new Map();
 function close(){if(dialog.open)dialog.close();}
 function inspectDevice(){if(deviceView.open(game.player)){close();deviceReturn.hidden=false;deviceReturn.focus();}}
 dialog.addEventListener('close',()=>{loot=null;game.combatOverlayOpen=previousOverlay||deviceView.isOpen;game.retireCombatViewInput?.(game.player,{preserveCarry:true});lastFocus?.focus?.();});
 function render(){
  const f=game.player;if(!f)return;const layout=inventoryLayout(f),policy=layout.policy;dialog.replaceChildren();
  const header=el('header'),title=el('div',undefined,'inventory-title'),img=el('img',undefined,'inventory-portrait');img.alt='';try{if(!portraits.has(f.def.id))portraits.set(f.def.id,portraitOf(f.def));img.src=portraits.get(f.def.id);}catch{}
  const titleText=el('div');titleText.append(el('h2','Backpack'),el('small',`${f.def.name} · ${policy.soldier?'Soldier equipment':'Compact field kit'}`));title.append(img,titleText);header.append(title,button('✕',close));dialog.append(header);
  header.onpointerdown=e=>{if(e.target.closest('button'))return;const r=dialog.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};header.setPointerCapture(e.pointerId);};
  header.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;dialog.style.left=Math.max(0,Math.min(innerWidth-dialog.offsetWidth,e.clientX-drag.x))+'px';dialog.style.top=Math.max(0,Math.min(innerHeight-50,e.clientY-drag.y))+'px';dialog.style.right='auto';};
  header.onpointerup=()=>{drag=null;};header.onpointercancel=()=>{drag=null;};
  if(loot){
   const check=loot.store.access(f,loot.id),section=el('section');section.append(el('h3',check.container?.name||'World backpack'));
   if(!check.ok)section.append(el('p',check.reason,'inventory-note'));
   else if(!check.container.entries.length)section.append(el('p','Empty · all equipment transferred.','inventory-note'));
   else for(const entry of check.container.entries){
    const row=el('div',undefined,'inventory-detail'),name=entry.saved?.gear.ab.name||entry.item?.def.name||entry.device?.name||'Equipment';row.append(el('b',name));
    if(entry.saved?.ammo)row.append(el('p',`${entry.saved.ammo.loaded} loaded · ${entry.saved.ammo.reserve} reserve`));
    if(entry.item)row.append(el('p',`${entry.item.charges} charges · ${Math.ceil(entry.item.cd)}s cooldown`));
    const transfer=options=>{const result=loot.store.transfer(f,loot.id,entry.id,options);if(!result.ok)game.hud?.feed(result.reason);render();};
    row.append(button('Take',()=>transfer()));if(entry.kind==='weapon')row.append(button('Take compatible ammo',()=>transfer({ammoOnly:true})));section.append(row);
   }
   dialog.append(section);
  }
  const hands=el('section');hands.append(el('h3','In your hands'));const h=el('div',undefined,'inventory-hands'),held=f._gearHeld,ab=held?.ab,occupied=!!(f._carry||f._personCarry),mask=ab?castHandMask(f,ab):0,drawn=ab&&!f._inventoryStowed;
  for(const side of ['LEFT','RIGHT']){const tile=el('div',side,'inventory-hand');tile.append(el('b',occupied?'Carried load':drawn&&(mask&(side==='LEFT'?1:2))?ab.name:'Free'));h.append(tile);}hands.append(h);
  if(held){const ammo=firearmAmmo(f.slots._gear);if(ammo)hands.append(el('p',`${ammo.loaded}/${ammo.capacity} · ${ammo.reserve} reserve`,'inventory-note'));const actions=el('div',undefined,'inventory-controls');actions.append(button(f._inventoryStowed?'Draw weapon':'Stow weapon',()=>{if(!setHeldStowed(f,!f._inventoryStowed))game.hud?.feed('Finish the current action before changing hands.');render();}),button('Drop',()=>{game.dropGear(f,true);f._inventoryStowed=false;render();}));hands.append(actions);}
  dialog.append(hands);
  const bag=el('section'),head=el('div',undefined,'inventory-heading');head.append(el('h3','Carried equipment'),el('small',`${layout.used}/${layout.capacity} cells`));bag.append(head);
  const grid=el('div',undefined,'inventory-grid');grid.style.gridTemplateColumns=`repeat(${policy.columns},minmax(0,1fr))`;grid.style.gridTemplateRows=`repeat(${policy.rows},45px)`;
  for(let y=0;y<policy.rows;y++)for(let x=0;x<policy.columns;x++){const cell=button('',()=>{if(selected&&moveInventoryEntry(f,selected,x,y))render();});cell.className='inventory-cell';cell.setAttribute('aria-label',`Move selected item to column ${x+1}, row ${y+1}`);cell.style.gridArea=`${y+1}/${x+1}`;cell.ondragover=e=>e.preventDefault();cell.ondrop=e=>{e.preventDefault();if(moveInventoryEntry(f,e.dataTransfer.getData('text/plain'),x,y))render();};grid.append(cell);}
  for(const entry of layout.placed){const item=button(entry.name,()=>{selected=entry.id;if(entry.kind==='device'){inspectDevice();return;}render();});item.className='inventory-item';item.style.gridArea=`${entry.y+1}/${entry.x+1}/span ${entry.height}/span ${entry.width}`;item.setAttribute('aria-pressed',String(selected===entry.id));item.draggable=true;item.ondragstart=e=>{selected=entry.id;e.dataTransfer.setData('text/plain',entry.id);};item.append(el('small',entry.kind==='device'?'Coming soon':entry.kind==='stored-weapon'?'Stored':entry.kind==='weapon'?(entry.held?'In hand':'Stowed'):`${entry.item.charges??0} charges`));grid.append(item);}bag.append(grid,el('p','Drag equipment, or select an item then an empty cell. Layout stays with this character for the current life.','inventory-note'));
  if(layout.overflow.length)bag.append(el('p',`Overflow: ${layout.overflow.map(e=>e.name).join(', ')}. Existing equipment is retained.`,'inventory-note'));
  const entry=[...layout.placed,...layout.overflow].find(e=>e.id===selected);
  if(entry){const detail=el('div',undefined,'inventory-detail');detail.append(el('b',entry.name),el('p',`${entry.width} × ${entry.height} cells · ${entry.massKg===null?'Weight not authored':entry.massKg+' kg'}`));if(entry.kind==='stored-weapon'){const draw=button('Equip weapon',()=>{const result=game.equipStoredWeapon?.(f,entry.id);if(!result)game.hud?.feed('Finish the current action or make room before equipping.');render();});draw.disabled=typeof game.equipStoredWeapon!=='function';detail.append(draw);}if(entry.kind==='gadget'){const it=entry.item;detail.append(el('p',`${it.state} · ${Math.ceil(it.cd||0)}s cooldown`));const select=button('Select gadget',()=>{f._selectedGadget=entry.index;render();});select.setAttribute('aria-pressed',String((f._selectedGadget??0)===entry.index));const use=button('Use and return',()=>{f._selectedGadget=entry.index;close();game.useItem(f,entry.index);});use.disabled=entry.index>=policy.gadgetLimit||!['ready','deployed'].includes(it.state)||(it.state==='ready'&&((it.charges??1)<=0||it.cd>0));detail.append(select,use);}bag.append(detail);}dialog.append(bag);
  const powers=el('section');powers.append(el('h3','Power selection'));
  for(const[key,slot]of Object.entries(f.slots||{})){if(!slot?.def||(key==='_gear'&&slot===f.slots.lmb))continue;const row=el('div',undefined,'inventory-power');row.append(el('span',slot.def.name||key));for(const secondary of [false,true]){const b=button(secondary?'Secondary':'Primary',()=>{f[secondary?'_selSecondary':'_selSlot']=key;game.hud?.selectSlot(f._selSlot,f._selSecondary);render();});b.setAttribute('aria-pressed',String(f[secondary?'_selSecondary':'_selSlot']===key));row.append(b);}powers.append(row);}dialog.append(powers);
  if(game._threatRoom?.active&&game.ms?.threatLab?.state==='preparing'){const issue=el('section');issue.append(el('h3','Training issue'));const choices=gadgetCatalog(),select=el('select');choices.forEach(({def},i)=>{const o=el('option',def.name||def.kind);o.value=i;select.append(o);});issue.append(select);const actions=el('div',undefined,'inventory-controls');for(let i=0;i<Math.min(policy.gadgetLimit,Math.max(2,f.items.length+1));i++)actions.append(button(`Slot ${i+1}`,()=>{const result=issueTrainingGadget(game,f,choices[Number(select.value)].def,i);if(!result.ok)game.hud?.feed(result.reason);render();}));issue.append(actions);dialog.append(issue);}
  const footer=el('footer');if([...layout.placed,...layout.overflow].some(e=>e.kind==='device'))footer.append(button('Game device',inspectDevice));if(policy.personalWeapons)footer.append(button('Armory',()=>{close();openArmory(game,game.hud);}));footer.append(button('Return · I',close));dialog.append(footer);
 }
 function open(){if(dialog.open||!game.player?.alive||!game.running||game.hud?.titleOpen||game.matchOver||game.combatOverlayOpen)return false;lastFocus=document.activeElement;owner=game.player;previousOverlay=!!game.combatOverlayOpen;game.retireCombatViewInput?.(owner,{preserveCarry:true});game.combatOverlayOpen=true;selected=null;render();dialog.show();dialog.querySelector('button')?.focus();return true;}
 function openContainer(store,id){const check=store.access(game.player,id);if(!check.ok){game.hud?.feed(check.reason);return false;}loot={store,id};if(dialog.open){render();return true;}if(!open()){loot=null;return false;}return true;}
 const key=e=>{if(deviceView.isOpen&&['Escape','KeyI'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();deviceView.close();return;}if(e.code==='Escape'&&dialog.open){e.preventDefault();e.stopImmediatePropagation();close();return;}if(e.code==='KeyI'&&!e.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)){e.preventDefault();e.stopImmediatePropagation();if(dialog.open)close();else open();}};window.addEventListener('keydown',key,true);
 const tick=setInterval(()=>{if(deviceView.isOpen&&(!game.running||game.matchOver||!deviceView.state.owner.alive||game.player!==deviceView.state.owner))deviceView.close({immediate:true});deviceReturn.hidden=!deviceView.isOpen;if(dialog.open&&(!game.running||game.matchOver||!owner?.alive||game.player!==owner||loot&&!loot.store.access(owner,loot.id).ok))close();},200);
 return {open,openContainer,close,render,get isOpen(){return dialog.open;},dispose(){close();deviceView.dispose();deviceReturn.remove();clearInterval(tick);window.removeEventListener('keydown',key,true);dialog.remove();style.remove();}};
}
