import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioBus} from '../src/core/audio.js';
import {SampleBank,MANIFEST} from '../src/core/samples.js';

// Node has no WebAudio backend. Keep production bus/bank intact and inspect the
// graph/automation it submits; real rendered channel-energy checks run separately.
class Param {
  constructor(value=0){this.events=[];this.value=value;}
  set value(v){assert.ok(Number.isFinite(v)&&Math.abs(v)<=3.4e38,`invalid AudioParam ${v}`);this._value=v;}
  get value(){return this._value;}
  event(kind,v,t){assert.ok(Number.isFinite(t));this.value=v;this.events.push([kind,v,t]);}
  setValueAtTime(v,t){this.event('set',v,t);}
  linearRampToValueAtTime(v,t){this.event('linear',v,t);}
  setTargetAtTime(v,t,k){assert.ok(k>0&&Number.isFinite(k));this.event('target',v,t);}
  cancelScheduledValues(t){assert.ok(Number.isFinite(t));this.events.push(['cancel',t]);}
}
function fixture(panner=true,channels=1){
  const nodes=[],make=type=>{const n={type,connections:[],disconnects:0,connect(to){this.connections.push(to);},disconnect(){this.disconnects++;this.connections=[];}};nodes.push(n);return n;};
  const a=new AudioBus();a.ok=true;a.master=make('master');a.bus={sfx:make('sfx'),ui:make('ui')};
  a.ctx={currentTime:5,createGain(){return Object.assign(make('gain'),{gain:new Param(1)});},createBufferSource(){return Object.assign(make('source'),{playbackRate:new Param(1),starts:[],stops:[],start(t=0){this.starts.push(t);},stop(t=0){this.stops.push(t);}});}};
  if(panner)a.ctx.createStereoPanner=()=>Object.assign(make('pan'),{pan:new Param()});
  a.listen(0,0,0,{x:1,y:0,z:0});const bank=a._bank=new SampleBank(a);
  for(const m of Object.values(MANIFEST))for(const file of m.f)bank.buf.set(file,{duration:1,numberOfChannels:channels});
  const of=type=>nodes.filter(n=>n.type===type),last=type=>of(type).at(-1);
  return {a,bank,nodes,of,last};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('distance gain uses height with unchanged horizontal curve and legacy listen',()=>{
  const a=new AudioBus();a.listen(10,20,30);
  near(a._pg({x:10,y:95,z:20},130),.62);near(a._pg({x:75,y:30,z:20},130),.62);
  a.listen(10,20);near(a._pg({x:75,z:20},130),.62);assert.equal(a._pg(null),1);
});
test('invalid coordinates and reach cannot poison audio or turn malformed emitters loud',()=>{
  const a=new AudioBus();a.listen(0,0,20);a.listen(NaN,Infinity,NaN);
  near(a._pg({x:0,y:85,z:0},130),.62);
  for(const pos of [{x:NaN},{z:Infinity},{y:NaN}])assert.equal(a._pg(pos),0);
  for(const reach of [0,-1,NaN,Infinity])assert.equal(a._pg({x:0,y:20,z:0},reach),0);
  assert.equal(new AudioBus()._pg({x:NaN}),0);
});
test('camera-relative pan copies normalized right, rotates in 3D and softens nearby events',()=>{
  const a=new AudioBus(),right={x:8,y:0,z:0};a.listen(0,0,0,right);assert.equal(typeof a._pan,'function');
  right.x=-8;near(a._pan({x:100,y:0,z:0}),.85);near(a._pan({x:-100,y:0,z:0}),-.85);
  near(a._pan({x:6,y:0,z:0}),.425);a.listen(0,0,0,{x:0,y:3,z:4});near(a._pan({x:0,y:30,z:40}),.85);
  near(a._pan({x:50,y:0,z:0}),0);assert.equal(a._pan(null),0);assert.equal(a._pan({x:NaN}),0);
  for(const axis of [null,{x:0,y:0,z:0},{x:NaN,y:0,z:0}]){a.listen(0,0,0,axis);assert.equal(a._pan({x:100}),0);}
});
test('recorded one-shots route stereo once, snapshot launch pan, center UI and disconnect on end',()=>{
  const {a,bank,last}=fixture(),pos={x:60,y:0,z:0};assert.equal(bank.play('ki.blast',{pos,delay:.2}),true);
  const src=last('source'),g=last('gain'),pan=last('pan');assert.ok(pan,'recording must route through stereo node');
  assert.deepEqual(src.connections,[g]);assert.deepEqual(g.connections,[pan]);assert.deepEqual(pan.connections,[a.bus.sfx]);near(pan.pan.value,.85);near(src.starts[0],5.2);
  pos.x=-60;a.listen(60,0,0,{x:-1,y:0,z:0});near(pan.pan.value,.85);
  src.onended();assert.equal(src.disconnects,1);assert.equal(g.disconnects,1);assert.equal(pan.disconnects,1);
  bank.play('ui.click',{bus:'ui'});assert.equal(last('pan').pan.value,0);assert.deepEqual(last('pan').connections,[a.bus.ui]);
});
test('recordings safely fall back to mono when StereoPanner is absent or fails',()=>{
  for(const broken of [false,true]){const {a,bank,last}=fixture(false);if(broken)a.ctx.createStereoPanner=()=>{throw Error('unsupported');};
    assert.equal(bank.play('ki.blast',{pos:{x:60}}),true);assert.deepEqual(last('gain').connections,[a.bus.sfx]);
    const h=bank.loop('engine.charge',{pos:{x:60}});assert.ok(h);h.set(.5);h.stop();
  }
});
test('muted and out-of-earshot events are handled without falling through to synth',()=>{
  const {a,bank,of}=fixture();a.muted=true;assert.equal(bank.play('absent'),true);a.muted=false;
  assert.equal(bank.play('ki.blast',{pos:{x:0,y:1000,z:0}}),true);assert.equal(of('source').length,0);
  assert.equal(bank.play('absent'),false);for(const file of MANIFEST['ki.blast'].f)bank.buf.set(file,null);
  assert.equal(bank.play('ki.blast'),false);
});
test('recorded loops start attenuated and follow source motion, listener movement and mute',()=>{
  const {a,bank,last}=fixture(),pos={x:0,y:1000,z:0},h=bank.loop('engine.charge',{pos});
  const g=last('gain'),pan=last('pan');assert.equal(g.gain.value,0,'distant onset must never ramp to full-volume');assert.ok(pan);
  Object.assign(pos,{x:60,y:0});h.set(1);assert.ok(g.gain.value>0);near(pan.pan.value,.85);
  pos.x=-60;h.set(1);near(pan.pan.value,-.85);a.listen(-120,0,0,{x:1,y:0,z:0});h.set(1);near(pan.pan.value,.85);
  a.muted=true;h.set(1);assert.equal(g.gain.value,0);a.muted=false;h.set(1);assert.ok(g.gain.value>0);
  h.set(1,{x:NaN});assert.equal(g.gain.value,0);assert.equal(pan.pan.value,0);h.stop();
});
test('loop stop is idempotent, rejects post-stop setters and releases all nodes on end',()=>{
  const {a,bank,last}=fixture(),h=bank.loop('engine.low'),src=last('source'),g=last('gain');h.stop();
  const after=g.gain.events.length,stamp=h.last;h.set(1,{x:20});h.stop();assert.equal(g.gain.events.length,after);assert.equal(h.last,stamp);assert.equal(src.stops.length,1);assert.equal(a._sus.size,0);
  assert.equal(typeof src.onended,'function');src.onended();src.onended();for(const n of [src,g,last('pan')])assert.equal(n.disconnects,1);
});
test('numeric guardrails keep sample and loop AudioParams finite for malformed and extreme inputs',()=>{
  const {bank,last}=fixture();
  for(const value of [NaN,Infinity,-Infinity,Number.MAX_VALUE,-10]){
    assert.doesNotThrow(()=>bank.play('ki.blast',{rate:value,gain:value,delay:NaN}));
    const h=bank.loop('engine.charge',{rate:value});assert.ok(h);assert.doesNotThrow(()=>h.set(value));assert.ok(last('gain').gain.value>=0);h.stop();
  }
});
test('charge adapter retains its live position and watchdog reaps abandoned recordings',()=>{
  const {a,last}=fixture(),pos={x:-60,y:0,z:0},h=a.charge(pos);assert.ok(h);assert.equal(typeof h.ramp,'function');
  assert.ok(last('pan'));near(last('pan').pan.value,-.85);pos.x=60;h.ramp(.5);near(last('pan').pan.value,.85);
  h.last=performance.now()-500;a.sweep();assert.equal(h._dead,true);assert.equal(a._sus.size,0);assert.equal(last('source').stops.length,1);
});

test('loop reach overrides are validated and natural source end retires watchdog ownership',()=>{
  const {a,bank,last}=fixture();
  for(const reach of [0,-1,NaN,Infinity]){const h=bank.loop('engine.low',{pos:{x:50},reach});h.set(1);assert.equal(last('gain').gain.value,0);h.stop();}
  const h=bank.loop('engine.low',{pos:{x:50},reach:100}),src=last('source'),g=last('gain');h.set(1);near(g.gain.value,.4384062043356595);
  a.sweep();assert.equal(h._dead,undefined,'fresh handles use the watchdog millisecond clock');
  src.onended();assert.equal(a._sus.size,0);const events=g.gain.events.length;h.set(1);h.stop();assert.equal(g.gain.events.length,events);assert.equal(src.stops.length,0);
});

for(const [channels,panner,shot,onset,target] of [
  [1,true,.7071067811865476,.3535533905932738,.7071067811865476],
  [2,true,.5,.25,.5],
  [1,false,.5,.25,.5],
  [2,false,.5,.25,.5],
])test(`centered mix preserves legacy level for ${channels}-channel recording with panner=${panner}`,()=>{
  const {a,bank,last}=fixture(panner,channels);
  bank.play('engine.charge');const played=last('gain').gain.value;
  const h=bank.loop('engine.charge'),started=last('gain').gain.value;
  h.set(1);const sustained=last('gain').gain.value;
  a.muted=true;h.set(1);assert.equal(last('gain').gain.value,0);h.stop();
  assert.deepEqual([played,started,sustained],[shot,onset,target]);
});
