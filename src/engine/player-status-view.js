import {playerStatus} from './player-status.js';
import {icon} from './icons.js';
import {HUD_LAYOUT_KEY,hudLayout,hudLayoutPosition,nudgeHudLayout} from './hud-layout.js';

export class PlayerStatusView{
 constructor(root){
  if(!document.querySelector('#player-status-style')){const style=document.createElement('link');style.id='player-status-style';style.rel='stylesheet';style.href=new URL('./player-status.css',import.meta.url).href;document.head.appendChild(style);}
  this.el=document.createElement('section');this.el.className='player-status';this.el.setAttribute('aria-label','Player status');
  this.el.innerHTML=`<div class="ps-portrait"><img alt="" hidden><span class="ps-level"></span></div><div class="ps-name"></div><div class="ps-meters">${['hp','energy','guard'].map((key,i)=>`<div class="ps-meter ps-${key}" role="meter" aria-label="${['Health','Energy','Guard'][i]}" aria-valuemin="0"><i class="ps-trail"></i><i class="ps-fill"></i><div class="ps-caption"><span>${['HP','ENERGY','GUARD'][i]}</span><strong></strong></div></div>`).join('')}</div><div class="ps-info"><span class="ps-form"></span><div class="ps-effects"></div></div><div class="ps-flight" hidden></div>`;
  root.appendChild(this.el);this.nodes={};for(const key of ['name','level','form','effects','flight'])this.nodes[key]=this.el.querySelector('.ps-'+key);
  this.meters=['hp','energy','guard'].map(k=>this.el.querySelector('.ps-'+k));this.image=this.el.querySelector('img');
  try{this.layout=hudLayout(JSON.parse(localStorage.getItem(HUD_LAYOUT_KEY)||'{}'));}catch{this.layout=hudLayout();}
  this.applyLayout();addEventListener('resize',()=>this.applyLayout());
  // Effects and flight readouts can grow the cluster. Observe that growth
  // without measuring layout on every gameplay tick.
  if(typeof ResizeObserver!=='undefined'){this.layoutObserver=new ResizeObserver(()=>this.applyLayout());this.layoutObserver.observe(this.el);}
 }
 applyLayout(){const p=hudLayoutPosition(this.layout,innerWidth,innerHeight,this.el.offsetWidth||360,Math.max(142,this.el.offsetHeight||0));this.el.style.setProperty('--ps-left',p.left+'px');this.el.style.setProperty('--ps-top',p.top+'px');this.el.style.setProperty('--ps-scale',p.scale);}
 saveLayout(){try{localStorage.setItem(HUD_LAYOUT_KEY,JSON.stringify(this.layout));}catch{/* restricted storage: current session still works */}}
 edit(hud){
  if(this.editor)return;
  const g=hud.game;g.running=false;g.retireCombatViewInput?.(g.player);hud.setPaused(false);const oldOverlay=g.combatOverlayOpen;g.combatOverlayOpen=true;
  const dialog=document.createElement('section');dialog.className='hud-layout-editor';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','HUD layout');
  dialog.innerHTML='<strong>HUD layout</strong><span>Drag the portrait cluster. Arrow keys nudge it.</span><label>Size <input aria-label="HUD size" type="range" min="60" max="140" step="5"><output></output></label><div><button type="button" data-layout="reset">Reset</button><button type="button" data-layout="done">Done</button></div>';
  document.body.appendChild(dialog);this.editor=dialog;this.el.classList.add('ps-editing');this.el.tabIndex=0;
  const slider=dialog.querySelector('input'),output=dialog.querySelector('output');const sync=()=>{slider.value=Math.round(this.layout.scale*100);output.value=slider.value+'%';this.applyLayout();};sync();
  slider.oninput=()=>{this.layout.scale=Number(slider.value)/100;sync();};
  dialog.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();});
  dialog.querySelector('[data-layout="reset"]').onclick=()=>{this.layout=hudLayout();sync();};
  let drag;
  const down=e=>{if(e.button!==0)return;e.preventDefault();const b=this.el.getBoundingClientRect();drag={x:e.clientX-b.x,y:e.clientY-b.y};this.el.setPointerCapture(e.pointerId);};
  const move=e=>{if(!drag)return;this.layout.x=(e.clientX-drag.x)/innerWidth;this.layout.y=(e.clientY-drag.y)/innerHeight;this.layout=hudLayout(this.layout);this.applyLayout();};
  const up=()=>{drag=null;};
  const keys=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const step=e.shiftKey?20:4;this.layout=nudgeHudLayout(this.layout,innerWidth,innerHeight,e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0,this.el.offsetWidth||360,Math.max(142,this.el.offsetHeight||0));this.applyLayout();};
  this.el.addEventListener('pointerdown',down);this.el.addEventListener('pointermove',move);this.el.addEventListener('pointerup',up);this.el.addEventListener('pointercancel',up);this.el.addEventListener('keydown',keys);
  const close=()=>{this.saveLayout();this.el.classList.remove('ps-editing');this.el.removeAttribute('tabindex');for(const [type,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['keydown',keys]])this.el.removeEventListener(type,fn);dialog.remove();this.editor=null;g.combatOverlayOpen=oldOverlay;hud.setPaused(true);};
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();document.removeEventListener('keydown',escape,true);}};document.addEventListener('keydown',escape,true);
  dialog.querySelector('[data-layout="done"]').onclick=()=>{document.removeEventListener('keydown',escape,true);close();};slider.focus();
 }
 update(p){
  const s=playerStatus(p),same=this.fighter===p,previous=same?this.last:null;
  this.fighter=p;if(previous?.name!==s.name)this.nodes.name.textContent=s.name;if(previous?.level!==s.level)this.nodes.level.textContent=`LV ${s.level}`;if(previous?.form!==s.form)this.nodes.form.textContent=s.form;
  const broken=s.guardBroken||(same&&this.broken&&p.staggerT>0);this.broken=broken;
  this.el.classList.toggle('ps-critical',s.critical);this.el.classList.toggle('ps-broken',broken);
  if(previous&&s.hp.value<previous.hp.value)this.flash('ps-hurt');
  if(previous&&s.form!==previous.form)this.flash('ps-form-change');
  for(const [i,key]of ['hp','energy','guard'].entries()){
   const m=this.meters[i],v=s[key];if(previous?.[key]?.ratio!==v.ratio)m.style.setProperty('--fill',v.ratio);if(previous?.[key]?.value!==v.value)m.setAttribute('aria-valuenow',v.value);if(previous?.[key]?.max!==v.max)m.setAttribute('aria-valuemax',v.max);
   const text=key==='guard'&&broken?'⛨ GUARD BREAK':v.infinite?'∞ CORE':`${v.value} / ${v.max}`;
   if(m._text!==text){m._text=text;m.querySelector('strong').textContent=text;m.setAttribute('aria-valuetext',text);}
  }
  const effects=s.effects.map(e=>`${e.id}:${e.remaining}:${e.label}`).join('|');
  if(effects!==this.effects){this.effects=effects;this.nodes.effects.replaceChildren();for(const e of s.effects){const el=document.createElement('span');el.className='ps-effect';el.title=e.label;el.setAttribute('aria-label',e.label+(e.remaining?` ${e.remaining} seconds`:''));el.innerHTML=icon(e.glyph,13);if(e.id==='speed')el.append(document.createTextNode(e.label.replace('Speed ','')));if(e.remaining)el.append(document.createTextNode(' '+e.remaining+'s'));this.nodes.effects.appendChild(el);}}
  this.nodes.flight.hidden=!s.flight;if(s.flight)this.nodes.flight.textContent=`${s.flight.label} · ${s.flight.speed} km/h`;
  const portraitKey=p.def.id+'|'+p._formKey;
  if(portraitKey!==this.portraitKey){this.portraitKey=portraitKey;this.image.alt=s.name+' — '+s.form;this.image.hidden=true;
   import('./player-status-portrait.js').then(m=>m.portraitOf(p.def)).then(url=>{if(this.portraitKey===portraitKey){this.image.src=url;this.image.hidden=false;}}).catch(error=>{console.warn('HUD portrait unavailable',error);});
  }
  this.last=s;
 }
 flash(name){this.flashes??={};const now=performance.now();if(now-(this.flashes[name]??-Infinity)<400)return;this.flashes[name]=now;this.el.classList.remove(name);void this.el.offsetWidth;this.el.classList.add(name);}
 energyWarning(){this.flash('ps-energy-denied');}
}
