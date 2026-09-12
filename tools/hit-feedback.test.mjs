import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {selectHitFeedback} from '../src/engine/hit-feedback.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Game} from '../src/engine/game.js';
import {Comic} from '../src/engine/comic.js';

const baseOutcome=(extra={})=>({dtype:'ballistic',attackClass:'bullet',healthLost:0,
  absorbed:{plate:0,armor:0,shield:0,nanite:0},guard:'none',deflected:false,
  knockedOut:false,statusesAdded:[],...extra});

test('plate absorption is armor impact rather than directional guard',()=>{
  assert.equal(selectHitFeedback(baseOutcome({absorbed:{plate:8,armor:0,shield:0,nanite:0}})).id,'armor-hit');
});

test('partial armor preserves the actual health loss in its label',()=>{
  const feedback=selectHitFeedback(baseOutcome({healthLost:3.5,absorbed:{plate:0,armor:4.5,shield:0,nanite:0}}));
  assert.equal(feedback.id,'armor-hit');
  assert.match(feedback.label,/3\.5 HP/);
});

test('guard, reflection and knockout have distinct priority outcomes',()=>{
  assert.equal(selectHitFeedback(baseOutcome({guard:'blocked'})).id,'block');
  assert.equal(selectHitFeedback(baseOutcome({deflected:true})).id,'deflect');
  assert.equal(selectHitFeedback(baseOutcome({knockedOut:true,deflected:true,guard:'broken'})).id,'ko');
});

test('cold contact does not fabricate a frozen transition',()=>{
  assert.notEqual(selectHitFeedback(baseOutcome({dtype:'cold'})).id,'frozen');
  assert.equal(selectHitFeedback(baseOutcome({dtype:'cold',statusesAdded:['frozen']})).id,'frozen');
});

function fixture(t,{armor=0,plate=0,shield=0,guard=false}={}){
  const def=structuredClone(ROSTER.find(d=>d.id==='vega'));
  def.armor=plate;
  const f=new Fighter(def);
  Object.assign(f,{invuln:0,armor,_shieldHp:shield,resist:{},_physics(){},_animate(){},_sync(){}});
  f.guarding=guard;f.faceDir(0,1);
  const outcomes=[];
  f._game={onHit(_target,_amount,_opts,_blocked,outcome){outcomes.push(outcome);},
    particles:{burst(){},spawn(){}},vfx:{flash(){},contact(){}},audio:{zap(){}},world:{},
    melee:{clearInput(){},release(){}}};
  const src={def:{},pos:new Vector3(0,0,10)};
  t.after(()=>f.dispose());
  return {f,outcomes,hit(amount,extra={}){const hp=f.hp,armorBefore=f.armor,shieldBefore=f._shieldHp;
    const dealt=f.takeDamage(amount,{src,ballistic:true,...extra});
    return {dealt,hpLost:hp-f.hp,armorLost:armorBefore-f.armor,shieldLost:shieldBefore-f._shieldHp,outcome:outcomes.at(-1)};
  }};
}

test('native fully stopped bullet reports plate absorption and zero real HP loss',t=>{
  const x=fixture(t,{plate:9});const r=x.hit(4);
  assert.equal(r.hpLost,0);assert.equal(r.dealt,0);assert.equal(r.outcome.healthLost,0);
  assert.equal(r.outcome.absorbed.plate,4);assert.equal(r.outcome.guard,'none');
});

test('native partial armor-pool hit reports exact armor and HP deltas',t=>{
  const x=fixture(t,{armor:2});const r=x.hit(10,{ballistic:false,dtype:'physical'});
  assert.equal(r.outcome.healthLost,r.hpLost);assert.equal(r.outcome.absorbed.armor,r.armorLost);
  assert.ok(r.hpLost>0);assert.ok(r.armorLost>0);
});

test('native shield full soak is not reported as guard',t=>{
  const x=fixture(t,{shield:10});const r=x.hit(5,{ballistic:false,dtype:'energy'});
  assert.equal(r.hpLost,0);assert.equal(r.outcome.absorbed.shield,5);assert.equal(r.outcome.guard,'none');
});

test('native directional guard reports its own resolved state and actual chip',t=>{
  const x=fixture(t,{guard:true});const r=x.hit(5,{ballistic:false,dtype:'physical',strike:true});
  assert.equal(r.outcome.guard,'blocked');assert.equal(r.outcome.healthLost,r.hpLost);
  assert.equal(r.outcome.absorbed.armor,0);assert.ok(r.hpLost>0);
});

test('real Game.onHit presents resolved shield and HP values instead of raw BLOCK damage',()=>{
  const numbers=[],flashes=[],target={pos:new Vector3(),maxHp:100,hp:98,_openSky:true,def:{colors:{accent:'#fff'}}};
  const src={pos:new Vector3(0,0,5),def:{}};
  const game={time:3,ms:null,player:null,hud:{damageNumber(_p,text){numbers.push(text);},hitDirection(){}},
    vfx:{flash(_p,_c,size){flashes.push(size);}},isHuman:()=>false,combo:0,_p1MaxCombo:0,particles:{burst(){}},world:null,noise(){}};
  game.presentHitOutcome=Game.prototype.presentHitOutcome;
  const outcome=baseOutcome({healthLost:2,absorbed:{plate:0,armor:0,shield:78,nanite:0}});
  Game.prototype.onHit.call(game,target,80,{src,ballistic:true,contactPoint:new Vector3()},true,outcome);
  assert.deepEqual(numbers,['SHIELD HIT · 78 ABS · 2 HP']);
  assert.deepEqual(flashes,[.55]);
});

test('resolved automatic deflections coalesce per target and do not call damage hooks',()=>{
  const words=[],target={pos:new Vector3()},game={time:1,comic:{impact(word){words.push(word);}},hud:null,player:null};
  const outcome=baseOutcome({deflected:true});
  Game.prototype.presentHitOutcome.call(game,target,{},outcome);
  game.time=1.1;Game.prototype.presentHitOutcome.call(game,target,{},outcome);
  game.time=1.4;Game.prototype.presentHitOutcome.call(game,target,{},outcome);
  assert.deepEqual(words,['DEFLECT!','DEFLECT!']);
});

test('Comic.impact renders a visible semantic label and family hook',t=>{
  const previousDocument=globalThis.document;t.after(()=>{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});
  const nodes=[];globalThis.document={createTextNode:text=>({textContent:text}),body:{classList:{contains:()=>false}},createElement(){return {className:'',style:{setProperty(){}},dataset:{},children:[],classList:{add(v){this.value=v;}},append(n){this.children.push(n);this.textContent=(this.textContent||'')+(n.textContent||'');},appendChild(n){this.children.push(n);},setAttribute(k,v){this[k]=v;}};}};
  const comic={sfx(){const node=document.createElement('div');nodes.push(node);return{node};}};
  Comic.prototype.impact.call(comic,'TINK!',new Vector3(),{feedback:selectHitFeedback(baseOutcome({absorbed:{plate:4,armor:0,shield:0,nanite:0}}))});
  assert.equal(nodes[0].classList.value,'impact-armor-hit');assert.equal(nodes[0].children[0].textContent,'ARMOR HIT · 4 ABS');
  delete globalThis.document;
});

test('actual downstream burn and freeze transitions emit status outcomes once',t=>{
  const {f}=fixture(t),statuses=[];f._game.presentHitOutcome=(_target,_opts,outcome)=>statuses.push(...outcome.statusesAdded);
  f.addDot({kind:'burn',src:{}});f.addDot({kind:'burn',src:{}});
  f.frost=.99;f.addFrost(.1,{});
  assert.deepEqual(statuses,['burning','frozen']);
});

test('real Game.onHit admits a sustained beam guard break and throttles repeats',()=>{
  const numbers=[],target={pos:new Vector3(),maxHp:100,hp:99,def:{colors:{accent:'#fff'}}},game={time:2,player:null,
    hud:{damageNumber(_p,text){numbers.push(text);}},comic:null,isHuman:()=>false,vfx:{flash(){}},particles:{burst(){}},noise(){}};
  const outcome=baseOutcome({attackClass:'sustained',dtype:'energy',healthLost:1,guard:'broken'});
  Game.prototype.onHit.call(game,target,1,{dot:true,src:{}},true,outcome);
  game.time=2.1;Game.prototype.onHit.call(game,target,1,{dot:true,src:{}},true,outcome);
  assert.deepEqual(numbers,['GUARD BROKEN · 1 HP']);
});

test('real Game.onHit presents resolved burn tick HP instead of suppressing it',()=>{
  const numbers=[],target={pos:new Vector3(),maxHp:100,hp:97,def:{colors:{accent:'#fff'}}},game={time:2,player:null,
    hud:{damageNumber(_p,text){numbers.push(text);}},comic:null,isHuman:()=>false,vfx:{flash(){}},particles:{burst(){}},noise(){}};
  Game.prototype.onHit.call(game,target,3,{dot:true,dtype:'fire',src:{}},false,baseOutcome({attackClass:'sustained',dtype:'fire',healthLost:3}));
  assert.deepEqual(numbers,['FIRE HIT · 3 HP']);
});

test('priority words retain independently resolved absorption and HP quantities',()=>{
  const mixed=baseOutcome({healthLost:6,absorbed:{plate:0,armor:4,shield:0,nanite:0},statusesAdded:['bleeding']});
  assert.equal(selectHitFeedback(mixed).label,'BLEEDING · 4 ABS · 6 HP');
  assert.equal(selectHitFeedback(baseOutcome({healthLost:12,knockedOut:true})).label,'K.O. · 12 HP');
  assert.equal(selectHitFeedback(baseOutcome({healthLost:2,absorbed:{plate:3,armor:0,shield:0,nanite:0},guard:'blocked'})).label,'BLOCK · 3 ABS · 2 HP');
});
