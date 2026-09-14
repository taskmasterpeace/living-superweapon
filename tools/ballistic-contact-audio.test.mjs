import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {Projectiles} from '../src/engine/projectiles.js';import {ballisticContactAudio} from '../src/engine/ballistic-contact-audio.js';
import {MANIFEST,HOT_SET} from '../src/core/samples.js';import {SoundLibrary} from '../src/core/sound-library.js';

for(const body of ['flesh','metal','stone'])test(`native fast ballistic contact emits ${body} recording before piercing continues`,()=>{
 const noop=()=>{},calls=[],g={scene:new T.Scene(),modeId:'powerworld',world:{cover:[],interiors:[],shake:noop},audio:{soundLibrary:{native:(id,o)=>{calls.push({id,pos:o.pos.clone()});return true;}}},particles:{burst:noop,spawn:noop},vfx:{flash:noop,borrowLight:()=>new T.PointLight(),returnLight:noop},noise:noop,hitFlung:()=>false,isFoe:(a,b)=>a.team!==b.team};
 const caster={team:1,alive:true,powerBuff:1,pos:new T.Vector3(0,45,-20),aim3:new T.Vector3(0,0,1)};
 const foe={body,team:2,alive:true,pos:new T.Vector3(0,45,5),radius:2,def:{},takeDamage:()=>4};g.entities=[foe];g.overlapFoe=()=>foe;
 const manager=g.projectiles=new Projectiles(g),shot=manager.spawnProjectile(caster,{pos:new T.Vector3(0,50,0),vel:new T.Vector3(0,0,600),radius:1,damage:4,ballistic:true,pierce:1});
 try{manager.update(1/60,g);assert.equal(calls.length,1);assert.equal(calls[0].id,'bullet-hit-'+body);assert.equal(shot.dead,false);assert.ok(calls[0].pos.z<10);}finally{shot._dispose(g);}
});
test('non-ballistic, blocked and unknown body events do not fake flesh impacts',()=>{
 const g={audio:{soundLibrary:{native:()=>assert.fail('unexpected material recording')}}};
 for(const [ballistic,body,dealt]of [[false,'flesh',5],[true,'flesh',0],[true,'metal',0],[true,'energy',5],[true,undefined,5]])assert.equal(ballisticContactAudio(g,{ballistic,pos:{}},{body},dealt),false);
});
test('CC0 body impacts retain selected sources and user assignments',async()=>{
 const p=JSON.parse(await fs.readFile('public/audio/sfx-cc0/final/ballistic-body.provenance.json'));assert.equal(p.pickedBy,'Robert');assert.match(p.license,/CC0/);
 for(const file of p.files)assert.equal(createHash('sha256').update(await fs.readFile(file.path)).digest('hex'),file.sha256);
 const lib=new SoundLibrary({storage:null});
 for(const [body,sample]of [['flesh','impact.flesh'],['metal','impact.metal'],['stone','impact.concrete']]){assert.ok(HOT_SET.includes(sample));assert.ok(MANIFEST[sample].f.length);assert.equal(lib.source('bullet-hit-'+body),'bundled-recording');lib.setSettings('bullet-hit-'+body,{source:'placeholder'});assert.equal(lib.source('bullet-hit-'+body),'synthesized-placeholder');}
});
