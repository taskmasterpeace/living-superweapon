import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
import {updateMovementGears} from '../src/core/movement-gears.js';
const view=await import('../src/engine/movement-gear-view.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const fighter=id=>({def:ROSTER.find(d=>d.id===id),alive:true,vel:{x:0,y:0,z:100},ki:100});
test('gear HUD reports actual output, authored maximum, hold progress and honest capability limit',()=>{
 assert.equal(typeof view.movementGearStatus,'function','Missing gear HUD state');
 const f=fighter('sol');updateMovementGears(f,{held:true,selectGear:3},.1);let s=view.movementGearStatus(f);
 assert.equal(s.label,'GEAR III / III');assert.equal(s.max,true);assert.equal(s.speed,68);assert.ok(s.progress>0&&s.progress<1);
 updateMovementGears(f,{held:true},.35);assert.equal(view.movementGearStatus(f).progress,1);
 updateMovementGears(f,{held:false},.01);assert.equal(view.movementGearStatus(f).max,false);
 const soldier=fighter('sarge');updateMovementGears(soldier,{held:true,selectGear:3},.1);s=view.movementGearStatus(soldier);
 assert.equal(s.label,'GEAR II / II');assert.equal(s.limited,true);assert.equal(s.max,true);assert.equal(s.maxGear,2);
});

class Element {
 constructor(){this.children=[];this.attrs={};this.handlers={};this.style={};this.classList={toggle:(name,on)=>this[name]=on};}
 append(...nodes){this.children.push(...nodes);}appendChild(node){this.append(node);return node;}
 setAttribute(key,value){this.attrs[key]=String(value);}addEventListener(key,fn){this.handlers[key]=fn;}
}

function mount(t){
 const old=globalThis.document;globalThis.document={createElement:()=>new Element()};t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old;});
 const parent=new Element(),v=new view.MovementGearView(parent);return {parent,v};
}

test('desktop strip groups live readout and status without removing accessible hold controls',t=>{
 const {v}=mount(t),f=fighter('sol');v.update({player:f,running:true});
 const readout=v.el.children.find(n=>n.className==='gear-readout'),state=v.el.children.find(n=>n.className==='gear-state');
 assert.ok(readout?.children.includes(v.label)&&readout.children.includes(v.speed));assert.ok(state?.children.includes(v.form)&&state.children.includes(v.detail));
 assert.equal(v.detail.attrs['data-idle'],'true');assert.equal(v.form.textContent,'BASE');assert.equal(v.form.title,'NO AUTHORED FORM');
 assert.match(v.el.title,/SHIFT \/ R1/);assert.equal(v.buttons.length,3);for(const b of v.buttons)assert.match(b.attrs['aria-label'],/Hold movement gear/);
 updateMovementGears(f,{held:true,selectGear:3},.1);v.update({player:f,running:true});assert.equal(v.detail.attrs['data-idle'],'false');assert.match(v.detail.textContent,/MAX/);assert.ok(v.progress.value>0);assert.equal(v.speed.textContent,'68 km/h');
 f.powerUp={activeT:4.2,def:{name:'STORM CROWN'}};v.update({player:f,running:true});assert.equal(v.form.textContent,'STORM CROWN · ACTIVE 5s');assert.equal(v.form.attrs['aria-live'],'polite');
});

test('responsive CSS confines compact strip to fine-pointer desktop and retains 44px touch targets',t=>{
 const {parent}=mount(t),css=parent.children[0].textContent;
 assert.match(css,/\.movement-gears\[hidden\]\{display:none!important\}/,'Pause/overlay hiding must beat the more specific desktop grid display');
 assert.match(css,/\.movement-gears button\{[^}]*min-width:44px[^}]*min-height:44px/);
 const compact=css.match(/@media\s*\(min-width:701px\)\s*and\s*\(pointer:fine\)\{([\s\S]*?)\n\}/)?.[1];assert.ok(compact,'Compact rules must require wide viewport AND a fine pointer');
 assert.match(compact,/body:not\(\.phone\):not\(\.tablet\) \.movement-gears\{/);
 assert.match(compact,/grid-template-rows:32px 16px 3px/);assert.match(compact,/gap:4px/);assert.match(compact,/padding:8px/);
 assert.equal(32+16+3+4*2+8*2+2,77,'Declared strip budget remains within the 60–80px target');
 assert.match(compact,/grid-template-columns:minmax\(0,1fr\) 104px/);assert.match(compact,/min-width:32px;min-height:32px/);
 assert.match(compact,/\.gear-detail\[data-idle=true\]\{display:none\}/);assert.doesNotMatch(compact,/\.gear-buttons\{display:none/);
 assert.match(css,/@media\(max-width:700px\)\{[^}]*width:180px/);
 // Narrow touch card: 180px border-box minus padding/borders still accommodates
 // three actual 44px targets plus the two 4px gaps. No shrinking or hiding.
 assert.ok(180-8*2-2>=44*3+4*2);
});

test('touch cancellation and overlay hiding never leave a held gear behind',t=>{
 const {v}=mount(t),f=fighter('sol'),g={player:f,running:true};v.update(g);
 const event={button:0,pointerId:7,pointerType:'touch',preventDefault(){},stopPropagation(){}};
 for(const cancel of ['pointercancel','lostpointercapture','blur']){v.buttons[1].handlers.pointerdown(event);assert.equal(f._gearUiHeld,true);v.buttons[1].handlers[cancel](event);assert.equal(f._gearUiHeld,false);}
 for(const flag of ['paused','combatOverlayOpen','matchOver']){v.buttons[0].handlers.pointerdown(event);g[flag]=true;v.update(g);assert.equal(f._gearUiHeld,false,flag);assert.equal(v.el.hidden,true,flag);g[flag]=false;v.update(g);assert.equal(v.el.hidden,false);}
 // A pointer arriving on the hidden overlay must not restart the semantic hold.
 g.paused=true;v.update(g);v.buttons[2].handlers.pointerdown(event);assert.equal(f._gearUiHeld,false);
});
test('explicit stage buttons hold the semantic action and retire it on release, pause and fighter replacement',t=>{
 assert.equal(typeof view.MovementGearView,'function','Missing accessible gear selector');
 const old=globalThis.document;globalThis.document={createElement:()=>new Element()};t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old;});
 const parent=new Element(),v=new view.MovementGearView(parent),f=fighter('sol'),g={player:f,running:true};v.update(g);
 const event={button:0,pointerId:1,preventDefault(){},stopPropagation(){}};
 v.buttons[2].handlers.pointerdown(event);assert.equal(f._gearUiHeld,true);assert.equal(f._gearUiSelection,3);
 v.buttons[2].handlers.pointerup(event);assert.equal(f._gearUiHeld,false);
 v.buttons[1].handlers.keydown({...event,key:'Enter',repeat:false});assert.equal(f._gearUiHeld,true);
 v.buttons[1].handlers.keyup({...event,key:'Enter'});assert.equal(f._gearUiHeld,false);
 v.buttons[0].handlers.pointerdown(event);g.running=false;v.update(g);assert.equal(f._gearUiHeld,false);assert.equal(v.el.hidden,true);
 g.running=true;v.update(g);v.buttons[0].handlers.pointerdown(event);g.player=fighter('sarge');v.update(g);assert.equal(f._gearUiHeld,false);
});
