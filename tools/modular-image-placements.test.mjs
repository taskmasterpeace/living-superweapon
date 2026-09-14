import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createImagePlacements} from '../src/engine/modular-image-placements.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
test('image placements follow real bones, rebuild only on change, and release owned resources',async()=>{
 const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');
 const {scene:actor,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const original=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=()=>new T.Texture();
 try{
  const placements=createImagePlacements(actor),bones=[];actor.traverse(o=>{if(o.isBone)bones.push(o);});
  const recipe={tattooImage:'legacy',tattooRegion:'chest',tattoos:[{image:'head',region:'wholeHead'},{image:'left',region:'upperArmL'},{image:'right',region:'upperArmR'}],emblem:'custom',emblemImage:'test-shared-emblem',emblemPlacement:'cape',cape:true};
  placements.set(recipe);
  const marks=[];actor.traverse(o=>{if(o.isMesh&&o.parent.name.startsWith('ImagePlacement.'))marks.push(o);});assert.equal(marks.length,9);
  placements.set({...recipe});for(const mark of marks)assert.ok(mark.parent);
  const mixer=new T.AnimationMixer(actor);mixer.clipAction(animations[0]).play();mixer.setTime(.4);
  const poses=bones.map(b=>[b.position.toArray(),b.quaternion.toArray(),b.scale.toArray()]);placements.update(.4,true);actor.updateMatrixWorld(true);
  assert.deepEqual(bones.map(b=>[b.position.toArray(),b.quaternion.toArray(),b.scale.toArray()]),poses);
  for(const mark of marks){assert.ok(mark.matrixWorld.elements.every(Number.isFinite));assert.ok(Array.from(mark.geometry.attributes.position.array).every(Number.isFinite));}
  const resources=new Set(marks.flatMap(m=>[m.geometry,m.material,...(m.name==='ImagePlacement.cape'?[]:[m.material.map])]));let released=0;for(const r of resources)r.addEventListener('dispose',()=>released++);
  placements.set({});assert.equal(released,resources.size);for(const mark of marks)assert.equal(mark.parent.parent,null);
  for(const emblemPlacement of ['shoeLeft','shoeRight']){placements.set({emblem:'custom',emblemImage:'test-shared-emblem',emblemPlacement});actor.updateMatrixWorld(true);let group;actor.traverse(o=>{if(o.name.startsWith('ImagePlacement.'))group=o;});assert.equal(group.parent.name,T.PropertyBinding.sanitizeNodeName('DEF-foot.'+(emblemPlacement==='shoeLeft'?'L':'R')));}
  placements.dispose();placements.dispose();assert.throws(()=>placements.set({}),/disposed/);
 }finally{T.TextureLoader.prototype.load=original;}
});
