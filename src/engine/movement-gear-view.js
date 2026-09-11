import {powerUpStatus} from '../core/power-up-state.js';
import {movementProfile} from '../data/movement-gears.js';
import {POWERUP_HOLD} from '../core/movement-gears.js';
import {unitsToMeters} from '../core/world-units.js';
const ROMAN=['—','I','II','III'];
export function movementGearStatus(f){
 const s=f.movementGear,p=s?.profile??movementProfile(f),gear=s?.gear??0;
 return {gear,maxGear:p.maxGear,label:gear?`GEAR ${ROMAN[gear]} / ${ROMAN[p.maxGear]}`:`GEARS I–${ROMAN[p.maxGear]}`,
  max:gear>0&&gear===p.maxGear,limited:!!s?.limited&&gear>0,
  progress:gear>0&&s.sequence>=2?(s.ready?1:Math.min(1,s.holdTime/POWERUP_HOLD)):0,
  speed:Math.round(unitsToMeters(Math.hypot(f.vel?.x||0,f.flying?f.vel?.y||0:0,f.vel?.z||0))*3.6)};
}
const CSS=`
.movement-gears{position:fixed;right:16px;bottom:132px;z-index:24;width:180px;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--line-gold);border-radius:var(--r-2);background:var(--surface-solid);color:var(--text);font:600 var(--t-sm) var(--f-display);pointer-events:auto;box-shadow:var(--sh-1)}
.movement-gears[hidden]{display:none!important}.movement-gears strong{font-size:var(--t-md);letter-spacing:.04em}.movement-gears .gear-speed{color:var(--text-3);font-variant-numeric:tabular-nums;white-space:nowrap}
body:not(.phone):not(.tablet) #hud .combat-dock > .movement-gears{position:relative;inset:auto;order:-1;width:100%;box-sizing:border-box;flex-shrink:0}
.movement-gears .gear-readout{display:flex;justify-content:space-between;align-items:center;gap:4px;min-width:0}
.movement-gears .gear-state{display:flex;flex-direction:column;gap:3px;min-width:0;color:var(--text-2)}
.movement-gears .gear-detail,.movement-gears .gear-form{display:block;line-height:16px;min-width:0}
.movement-gears .gear-buttons{display:flex;gap:4px}.movement-gears button{flex:1;min-width:44px;min-height:44px;padding:0;border:1px solid var(--line-gold);border-radius:var(--r-2);background:transparent;color:inherit;font:700 var(--t-body) var(--f-display);cursor:pointer;touch-action:none;transition:background .2s,border-color .2s}
.movement-gears button:hover,.movement-gears button:focus-visible{background:var(--surface-hi);outline:1px solid var(--gold)}
.movement-gears button[aria-pressed=true]{background:var(--gold);color:var(--on-gold)}.movement-gears button[data-limited=true]{opacity:.45}
.movement-gears.gear-max{animation:gear-arrival .3s ease-out;border-color:var(--gold-pale);box-shadow:0 0 18px var(--line-gold)}
.movement-gears [data-state=active]{color:var(--good)}.movement-gears [data-state=energy]{color:var(--danger)}
.movement-gears progress{width:100%;height:3px;display:block;margin:0;accent-color:var(--gold)}
@media (min-width:701px) and (pointer:fine){
body:not(.phone):not(.tablet) .movement-gears{display:grid;grid-template-columns:minmax(0,1fr) 104px;grid-template-rows:32px 16px 3px;grid-template-areas:'readout buttons' 'state state' 'progress progress';gap:4px;padding:8px;width:260px}
body:not(.phone):not(.tablet) .movement-gears .gear-readout{grid-area:readout;flex-direction:column;align-items:flex-start;justify-content:center;gap:0;line-height:16px}
body:not(.phone):not(.tablet) .movement-gears .gear-buttons{grid-area:buttons}
body:not(.phone):not(.tablet) .movement-gears button{min-width:32px;min-height:32px}
body:not(.phone):not(.tablet) .movement-gears .gear-state{grid-area:state;flex-direction:row;justify-content:space-between;gap:8px}
body:not(.phone):not(.tablet) .movement-gears .gear-form{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body:not(.phone):not(.tablet) .movement-gears .gear-detail{white-space:nowrap;font-size:var(--t-label)}
body:not(.phone):not(.tablet) .movement-gears .gear-detail[data-idle=true]{display:none}
body:not(.phone):not(.tablet) .movement-gears progress{grid-area:progress}
}
@keyframes gear-arrival{from{transform:translateY(3px);outline:2px solid var(--gold)}to{transform:translateY(0);outline:2px solid transparent}}
@media(prefers-reduced-motion:reduce){.movement-gears.gear-max{animation:none}}
@media(max-width:700px){.movement-gears{right:10px;bottom:202px;width:180px;padding:8px}}
`;
export class MovementGearView {
 constructor(parent){
  const make=(tag,cls)=>{const node=document.createElement(tag);if(cls)node.className=cls;return node;};
  const style=make('style');style.textContent=CSS;parent.appendChild(style);
  this.el=make('section','movement-gears');this.el.hidden=true;this.el.setAttribute('aria-label','Movement gears');
  this.el.title='SHIFT / R1: tap, then hold. Buttons: press and hold a gear.';
  this.speed=make('span','gear-speed');this.label=make('strong');this.detail=make('span','gear-detail');this.form=make('span','gear-form');this.form.setAttribute('aria-live','polite');
  const readout=make('div','gear-readout'),state=make('div','gear-state');readout.append(this.label,this.speed);state.append(this.form,this.detail);
  const row=make('div','gear-buttons');this.buttons=[];
  this.progress=make('progress');this.progress.max=1;this.progress.value=0;this.progress.setAttribute('aria-label','Power-up hold');
  const release=()=>{if(this.fighter)this.fighter._gearUiHeld=false;};this.release=release;
  for(let gear=1;gear<=3;gear++){
   const button=make('button');button.type='button';button.textContent=ROMAN[gear];button.setAttribute('aria-label',`Hold movement gear ${ROMAN[gear]}`);
   const press=e=>{e.preventDefault();e.stopPropagation();if(this.el.hidden||!this.fighter)return;this.fighter._gearUiSelection=gear;this.fighter._gearUiHeld=true;};
   button.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;press(e);button.setPointerCapture?.(e.pointerId);});
   for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])button.addEventListener(event,release);
   button.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat)press(e);});
   button.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();release();}});
   row.appendChild(button);this.buttons.push(button);
  }
  this.el.append(readout,row,state,this.progress);parent.appendChild(this.el);
  globalThis.addEventListener?.('blur',release);
 }
 update(game){
  const f=game.player,hidden=!f||!f.alive||!game.running||game.paused||game.matchOver||game.hud?.titleOpen||game.combatOverlayOpen||f._scoutVehicle||f._aircraftVehicle;
  if(f!==this.fighter||hidden)this.release();this.fighter=f;this.el.hidden=!!hidden;if(hidden)return;
  const s=movementGearStatus(f),detail=s.limited?`CAPABILITY LIMIT · ${ROMAN[s.maxGear]}`:s.max?'◆ MAX GEAR':s.progress===1?'HOLD COMPLETE':s.progress>0?'HOLD TO POWER UP':'SHIFT / R1 · TAP, THEN HOLD';
  for(const [node,text]of [[this.label,s.label],[this.speed,`${s.speed} km/h`],[this.detail,detail]])if(node.textContent!==text)node.textContent=text;
  this.detail.setAttribute('data-idle',!s.limited&&!s.max&&s.progress===0);
  const form=powerUpStatus(f),formLabel=form.kind==='unsupported'?'BASE':form.label;if(this.form.textContent!==formLabel)this.form.textContent=formLabel;this.form.title=form.label;this.form.setAttribute('data-state',form.kind);
  this.el.classList.toggle('gear-max',s.max);this.progress.value=s.progress;
  for(let i=0;i<3;i++){const b=this.buttons[i];b.setAttribute('aria-pressed',s.gear===i+1);b.setAttribute('data-limited',i>=s.maxGear);b.title=i>=s.maxGear?`Capability limit: gear ${ROMAN[s.maxGear]}`:`Hold gear ${ROMAN[i+1]}`;}
 }
}
