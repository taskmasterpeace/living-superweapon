import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundLibrary} from '../src/core/sound-library.js';
import {AudioBus} from '../src/core/audio.js';
test('moving loop gain applies distance once and panning follows its current position',()=>{
 const gains=[],panners=[],param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const node=()=>({connect(){},disconnect(){},start(){},stop(){},frequency:param()});
 const ctx={state:'running',currentTime:0,sampleRate:32,destination:{},createGain(){const n={...node(),gain:param()};gains.push(n);return n;},createStereoPanner(){const n={...node(),pan:param()};panners.push(n);return n;},createOscillator:node,createBufferSource:node,createBiquadFilter:node,createBuffer:(_,length)=>({getChannelData:()=>new Float32Array(length)})};
 let reach;
 const audio={ctx,_sus:new Set(),_pg:(p,r)=>{reach=r;return p?.x===10?.5:1;},_pan:p=>(p?.x||0)/10};
 const library=new SoundLibrary({audio,storage:null}),handle=library.play('rotor',{gain:.4,pos:{x:10}});
 handle.set(1,{x:10});assert.ok(Math.abs(gains[0].gain.value-.11)<1e-8,'Source range must not be squared');
 handle.set(1,{x:0});assert.ok(Math.abs(gains[0].gain.value-.22)<1e-8);assert.equal(panners[0].pan.value,0);
 assert.equal(reach,1200,'Aircraft engine carries across the battlefield, beyond melee range');
 assert.ok(audio._sus.has(handle),'Native aircraft loops must join the pause/orphan watchdog');
 handle.last=performance.now()-500;AudioBus.prototype.sweep.call(audio);assert.equal(library.active.size,0);assert.equal(audio._sus.size,0);
 handle.stop();assert.equal(library.active.size,0);
});
