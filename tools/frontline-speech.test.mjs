import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {Comic} from '../src/engine/comic.js';
import {Game} from '../src/engine/game.js';

// Minimal CPU DOM boundary: layout is supplied by the fixture, not claimed to
// validate browser typography. The native browser follow-up owns actual CSS.
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.className='';this.attrs={};this._text='';
  this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...cs)=>{this.className=[...new Set([...this.className.split(/\s+/),...cs])].join(' ').trim();},remove:(...cs)=>{this.className=this.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},toggle:(c,on)=>{if(on??!this.classList.contains(c))this.classList.add(c);else this.classList.remove(c);}};
 }
 appendChild(n){n.remove();this.children.push(n);n.parentNode=this;return n;}
 append(...ns){for(const n of ns)this.appendChild(n);}
 insertBefore(n,at){this.appendChild(n);this.children.splice(this.children.indexOf(n),1);this.children.splice(Math.max(0,this.children.indexOf(at)),0,n);}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=String(v);if(k==='id')this.id=String(v);}
 getAttribute(k){return this.attrs[k]??null;}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 set innerHTML(v){this._text=String(v).replace(/<[^>]*>/g,'');this.children=[];}get innerHTML(){return this._text;}
 querySelectorAll(s){const match=n=>s[0]==='.'?n.classList.contains(s.slice(1)):s[0]==='#'?n.id===s.slice(1):n.tagName===s.toUpperCase();return this.children.flatMap(n=>[...(match(n)?[n]:[]),...n.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 get offsetWidth(){return this.rect?.width||Math.min(parseFloat(this.style.width)|| (this.classList.contains('cmfield')?300:100),parseFloat(this.style.maxWidth)||Infinity);}
 get offsetHeight(){return this.rect?.height||(this.classList.contains('cmfield')?48:24);}
 getBoundingClientRect(){const x=this.rect?.x??(parseFloat(this.style.left)||0),y=this.rect?.y??(parseFloat(this.style.top)||0),width=this.offsetWidth,height=this.offsetHeight;return {x,y,width,height,left:x,top:y,right:x+width,bottom:y+height};}
}
function fixture(t,{mode='powerworld',width=1600,height=900}={}){
 const names=['document','innerWidth','innerHeight','getComputedStyle'],old=names.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
 const body=new Element(),document={body,createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),
  getElementById:id=>body.querySelector('#'+id),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s)};
 Object.assign(globalThis,{document,innerWidth:width,innerHeight:height,getComputedStyle:el=>({display:el.hidden?'none':el.style.display||'block',visibility:el.style.visibility||'visible',opacity:el.style.opacity||'1'})});
 t.after(()=>names.forEach((k,i)=>old[i]?Object.defineProperty(globalThis,k,old[i]):delete globalThis[k]));
 const hud={titleOpen:false,el:{}},game={modeId:mode,running:true,matchOver:false,fov:true,hud,entities:[],world:{camMode:'chase',camera:new PerspectiveCamera(),screenPosOf(){return {x:width*.5,y:height*.68,behind:false};}}};
 const speaker={name:'CLONE RIFLE 2',def:{name:'SARGE'},alive:true,isPlayer:true,pos:{x:0,y:0,z:0},obj:{visible:true},_vis:1};
 const comic=new Comic(game);game.comic=comic;game.player=speaker;
 const panel=(key,rect,id)=>{const el=new Element();el.rect=rect;if(id)el.id=id;body.appendChild(el);hud.el[key]=el;return el;};
 panel('foe',{x:540,y:16,width:520,height:62});panel('radar',{x:1400,y:16,width:184,height:184});
 panel('fieldRecorder',{x:64,y:16,width:90,height:34},'hFieldRec');
 panel('feed',{x:18,y:215,width:255,height:48});panel('objective',{x:18,y:108,width:270,height:94},'frontlineObjective');
 return {game,comic,speaker,panel};
}
const visible=node=>!node.hidden&&node.style.display!=='none'&&node.style.visibility!=='hidden'&&node.style.opacity!=='0';
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('PowerWorld dialogue routes to one named tail-less field item, retaining tone and lifetime',t=>{
 const f=fixture(t),it=f.comic.say(f.speaker,'STAY BACK!',{tone:'weak',life:2.5});
 assert.equal(it.kind,'field');assert.equal(it.speaker,f.speaker);assert.equal(it.tone,'weak');assert.equal(it.life,2.5);
 assert.ok(it.node.classList.contains('cmfield'));assert.equal(it.node.querySelector('.cmfield-speaker').textContent,f.speaker.name);
 assert.equal(it.node.querySelector('.cmfield-text').textContent,'STAY BACK!');assert.equal(it.node.querySelectorAll('svg').length,0);assert.ok(!it.tail);
});
test('field speech is latest-only without deleting captions or sound effects',t=>{
 const f=fixture(t),cap=f.comic.caption('NEXT ROUND',{drop:false}),sfx=f.comic.sfx('CRACK',{x:0,y:0,z:0}),old=f.comic.say(f.speaker,'FIRST');
 const next=f.comic.say(f.speaker,'SECOND');assert.equal(old.node.parentNode,null);
 assert.deepEqual(f.comic.items.filter(i=>i.kind==='field'),[next]);assert.ok(f.comic.items.includes(cap));assert.ok(f.comic.items.includes(sfx));
});
test('City chase keeps native SVG bubbles, multiple speakers and caption treatment',t=>{
 const f=fixture(t,{mode:'freeroam'}),one=f.comic.say(f.speaker,'FIRST'),two=f.comic.say({...f.speaker,name:'OTHER'},'SECOND');
 assert.equal(one.kind,'bub');assert.equal(two.kind,'bub');assert.ok(one.tail);assert.equal(one.node.querySelectorAll('svg').length,1);
 assert.equal(f.comic.items.filter(i=>i.kind==='bub').length,2);assert.ok(!one.node.classList.contains('cmfield'));
});
test('speaker labels and text stay inert strings; empty speech is ignored',t=>{
 const f=fixture(t);f.speaker.name='<img src=x>';const it=f.comic.say(f.speaker,'<script>alert(1)</script>');
 assert.equal(it.kind,'field');assert.equal(it.node.querySelector('.cmfield-speaker').textContent,'<img src=x>');
 assert.equal(it.node.querySelectorAll('img').length,0);assert.equal(it.node.querySelectorAll('script').length,0);assert.equal(f.comic.say(f.speaker,'   '),null);
});
for(const state of ['title','loading','paused','ended','wrongMode'])test(`field dialogue hides during ${state}`,t=>{
 const f=fixture(t),it=f.comic.say(f.speaker,'STAY BACK!',{life:10});
 if(state==='title')f.game.hud.titleOpen=true;if(state==='loading')f.game._frontlinePreparing={};if(state==='paused'){f.game.running=false;f.game.hud._paused=true;}
 if(state==='ended')f.game.matchOver=true;if(state==='wrongMode')f.game.modeId='freeroam';
 f.comic.update(.016);assert.ok(!visible(it.node)||!it.node.parentNode);
});
for(const state of ['dead','invisible','fogHidden','behind'])test(`field route does not disclose a ${state} speaker`,t=>{
 const f=fixture(t),it=f.comic.say(f.speaker,'HERE!',{life:10});
 if(state==='dead')f.speaker.alive=false;if(state==='invisible')f.speaker.obj.visible=false;
 if(state==='fogHidden'){f.speaker.isPlayer=false;f.speaker._vis=0;}
 if(state==='behind')f.game.world.screenPosOf=()=>({x:800,y:600,behind:true});
 f.comic.update(.016);assert.ok(!visible(it.node)||!it.node.parentNode);
});
test('field placement remains in bounded upper band without covering actual reserved HUD boxes',t=>{
 const f=fixture(t),it=f.comic.say(f.speaker,'STAY BACK!',{life:10});f.comic.update(.016);assert.ok(visible(it.node));
 const rect=it.node.getBoundingClientRect();assert.ok(rect.top>=0&&rect.bottom<=Math.min(180,innerHeight*.26));
 assert.ok(rect.left>=0&&rect.right<=innerWidth);
 for(const panel of Object.values(f.game.hud.el))assert.ok(!overlap(rect,panel.getBoundingClientRect()),'dialogue overlaps reserved HUD');
});
test('field lifetime and clear retire nodes; new match does not retain an old speaker',t=>{
 const f=fixture(t),it=f.comic.say(f.speaker,'FIRST',{life:.03});f.comic.update(.04);f.comic.update(.3);
 assert.equal(it.node.parentNode,null);assert.equal(f.comic.items.length,0);
 f.comic.say(f.speaker,'SECOND');f.comic.clear();assert.equal(f.comic.el.children.length,0);
 const next=f.comic.say({...f.speaker,name:'NEW MATCH'},'THIRD');assert.equal(next.kind,'field');assert.equal(f.comic.items.length,1);
});
test('native psyche admission, one-shot effects and cooldown are unchanged by presentation route',t=>{
 const f=fixture(t),e=f.speaker,seen=[];e.maxKi=100;e.ki=10;e._psyche={main:'fearful',colour:'#aaa',value:1,update(){},pendingInstant:{text:'STAY BACK!',fx:{ki:.1}}};
 Object.assign(f.game,{time:10,entities:[e],_ambientPsyche(){},audio:{sample(){throw Error('presentation added audio');}}});
 f.comic.say=(...args)=>seen.push(args);Game.prototype.updatePsyche.call(f.game,.016);
 assert.equal(e.ki,20);assert.equal(e._psyche.pendingInstant,null);assert.equal(seen.length,1);assert.deepEqual(seen[0],[e,'STAY BACK!',{tone:'weak'}]);
 e._psyche.pendingInstant={text:'SECOND',fx:{}};f.game.time=10.5;Game.prototype.updatePsyche.call(f.game,.016);assert.equal(seen.length,1);
 e._psyche.pendingInstant={text:'THIRD',fx:{}};f.game.time=12;Game.prototype.updatePsyche.call(f.game,.016);assert.equal(seen.length,2);
});
