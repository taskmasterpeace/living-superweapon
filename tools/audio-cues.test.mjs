import test from 'node:test';
import assert from 'node:assert/strict';
import * as brief from '../src/data/audio-cues.js';
import * as THREE from 'three';
import {AudioBus} from '../src/core/audio.js';
import {Projectiles} from '../src/engine/projectiles.js';

// Removing phase/type/timing from the production export must fail these checks:
// a sound designer needs more than a generic sound-family name.
test('every exported cue states its attack type, phase, playback and timing',()=>{
 const pack=JSON.parse(JSON.stringify(brief.audioCuePackage()));
 assert.equal(pack.version,2);
 const ids=new Set();
 for(const cue of pack.cues){
  assert.ok(!ids.has(cue.id),`Duplicate cue ${cue.id}`);ids.add(cue.id);
  for(const key of ['label','attackType','phase','playback','timing','direction','status'])
   assert.ok(typeof cue[key]==='string'&&cue[key].trim(),`${cue.id} lacks ${key}`);
  assert.ok(['native','direction-only'].includes(cue.status));
  assert.ok(['one-shot','loop','stop','event'].includes(cue.playback));
 }
 for(const id of ['charge','release','beam','contact','light','heavy','swing','guard','construct','gun','teleport','depleted','pain','landing'])assert.ok(ids.has(id),`Lost legacy cue ${id}`);
});

test('blast release, impact, defense and stopping are separate production instructions',()=>{
 const cues=brief.audioCuePackage().cues,byId=id=>cues.find(c=>c.id===id);
 for(const [id,phase] of [['charge','charge'],['release','release'],['beam','sustain'],['contact','impact'],['blast','release'],['blast-impact','impact'],['guard','block'],['deflect','deflect'],['shutdown','shutdown']])assert.equal(byId(id)?.phase,phase,id);
 assert.equal(byId('charge').playback,'loop');assert.equal(byId('beam').playback,'loop');
 assert.equal(byId('blast').playback,'one-shot');assert.equal(byId('shutdown').playback,'stop');
 assert.match(byId('blast-impact').timing,/contact|detonat/i);
 assert.match(byId('shutdown').direction,/not|no /i,'Do not promise a new recorded shutdown tail');
});

test('two reference beam families carry distinct per-phase sound directions, not invented recordings',()=>{
 const profiles=brief.audioCuePackage().beamDirections;
 assert.ok(Array.isArray(profiles)&&profiles.length===2,'Export both narrow and pressure reference directions');
 for(const id of ['narrow','pressure']){
  const p=profiles.find(p=>p.id===id);assert.ok(p,id);
  assert.equal(p.status,'direction-only');assert.match(p.evidence,/still/i);
  for(const key of ['charge','release','sustain','impact','shutdown'])assert.ok(p.phases[key]?.length>20,`${id}/${key}`);
 }
 assert.notEqual(profiles[0].phases.sustain,profiles[1].phases.sustain);
 assert.match(profiles.find(p=>p.id==='pressure').visual,/core/i);
});

test('unproduced nanite sounds and original dialogue cannot masquerade as shipped assets',()=>{
 const pack=brief.audioCuePackage();
 for(const id of ['nanite-break','nanite-reform']){
  const cue=pack.cues.find(c=>c.id===id);assert.equal(cue?.status,'direction-only');
  assert.equal(cue.method,'none');assert.equal(cue.source,'not recorded');
 }
 assert.match(pack.recordings,/unrecorded/i);
 assert.ok(pack.dialogue.length>=14);
});

const cue=id=>brief.audioCuePackage().cues.find(c=>c.id===id);
// Actual AudioBus methods choose the samples; only the unavailable audio device
// is replaced. Changing metadata back to the inaccurate catalog names must fail.
function sampleSink(){
 const samples=[],audio=new AudioBus();audio.ok=true;
 audio.sample=(name,options)=>{samples.push({name,...options});return true;};
 return {audio,samples};
}
test('heavy impact brief names actual native layers, never an explosion on a body punch',()=>{
 const {audio,samples}=sampleSink();
 audio.meleeHit(1,null,false);audio.meleeHit(1.8,null,true);
 assert.deepEqual(samples.map(s=>s.name),['punch.med','punch.heavy','land.flesh','hit.soft']);
 assert.equal(samples[2].delay,.035);assert.equal(samples[3].delay,.012);
 for(const {name} of samples)assert.ok(cue('heavy').source.includes(name),`Missing native heavy layer ${name}`);
 assert.doesNotMatch(cue('heavy').source,/boom/);
 assert.doesNotMatch(cue('heavy').timing,/miss has only its swing/,'A miss can still have independently gated effort audio');
});
test('quick blast brief includes the sample selected by the native blast method',()=>{
 const {audio,samples}=sampleSink();audio.blast(560,.08);
 assert.deepEqual(samples.map(s=>s.name),['ki.blast']);
 assert.ok(cue('blast').source.includes(samples[0].name));
});
test('firearm brief distinguishes the wired crack and generated profile from an unused catalog sample',()=>{
 const {audio,samples}=sampleSink();
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 audio._pg=()=>1;audio._env=()=>{};
 audio.ctx={currentTime:0,createOscillator:()=>({frequency:param,start(){},stop(){}})};
 for(const power of [.4,1.5])audio.gunshot(power,null,{crack:1,body:138,tail:0,mech:0});
 assert.deepEqual(samples.map(s=>s.name),['gun.crack','gun.crack']);
 assert.match(cue('gun').source,/gun\.crack/);assert.doesNotMatch(cue('gun').source,/gun\.light/);
 assert.match(cue('gun').source,/DSP|generated/);
});
test('native contact brief is restricted to accepted Fighter or defensive receiver contact',()=>{
 assert.match(cue('contact').event,/fighter/i);
 assert.match(cue('contact').timing,/accepted/i);
 assert.match(cue('contact').direction,/cover|wall/i,'Do not imply all surfaces have the native pulse');
});
test('reached cover damage stays silent and its separate audio brief remains direction-only',()=>{
 const noop=()=>{},sounds=[],cover={x:0,z:25,hx:5,hz:8,r:8,h:10,top:10,hp:10000};
 const g={scene:new THREE.Scene(),time:0,entities:[],world:{cover:[cover],interiors:[],shake:noop,punch:noop,setBlockCracks:noop},
  particles:{spawn:noop,burst:noop},vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,contact:noop},
  audio:{impact:()=>sounds.push('impact'),zap:()=>sounds.push('zap')},isFoe:()=>false};
 const c={team:1,alive:true,_openSky:true,energyInfinite:true,ki:100,maxKi:100,powerBuff:1,def:{},
  pos:new THREE.Vector3(),vel:new THREE.Vector3(),aim3:new THREE.Vector3(0,0,1),spendKi:()=>true,muzzle:o=>o.set(0,5.2,0)};
 const p=new Projectiles(g),beam=p.spawnBeam(c,{dps:24,radius:1,maxLen:90});
 try{
  for(let i=0;i<60;i++){g.time+=1/60;beam.update(1/60,g);}
  assert.ok(cover.hp<9990,'The actual traveling hose must have reached and damaged cover');
  assert.deepEqual(sounds,[],'This test does not authorize adding runtime cover audio');
  const future=cue('beam-cover-contact');assert.equal(future?.status,'direction-only');
  assert.equal(future.method,'none');assert.equal(future.source,'not recorded');assert.equal(future.phase,'impact');
 }finally{beam._dispose(g);}
});
test('landing source brief includes native material choices and labels the generated energy case',()=>{
 const {audio,samples}=sampleSink();
 for(const [power,body] of [[.5,'flesh'],[1.2,'flesh'],[1,'metal'],[1,'stone']])audio.land(power,body);
 assert.deepEqual(samples.map(s=>s.name),['land.soft','land.flesh','land.metal','rubble']);
 for(const {name} of samples)assert.ok(cue('landing').source.includes(name),`Missing native landing material ${name}`);
 assert.match(cue('landing').source,/energy.*(?:DSP|generated)/i);
 assert.match(cue('landing').source,/punch\.med.*punch\.heavy/);
});
