import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {validateAsset,samplePose,createAuthoredParts,saveCharacterRecipe,readCharacterRecipe} from '../src/engine/character-authoring.js';
const bone='DEF-head',base={schema:'powerworld-authoring-v1',rig:'ual-deform-v1',parts:[]};
test('reject foreign skeleton, missing socket, oversized and invalid geometry',()=>{
 assert.throws(()=>validateAsset({...base,rig:'wolf'},[bone]));
 const part={name:'visor',bone,shape:'box',color:'#abcdef',size:[.2,.1,.02],position:[0,0,.1],rotation:[0,0,0]};
 assert.equal(validateAsset({...base,parts:[part]},[bone]).parts.length,1);
 for(const bad of [{...part,bone:'absent'},{...part,size:[-1,1,1]},{...part,color:'red'}])assert.throws(()=>validateAsset({...base,parts:[bad]},[bone]));
});
test('motion interpolates shortest rotation and rejects invalid control timing',()=>{
 const motion={duration:1,markers:{contact:.3,release:.5,controlReturn:.8},keys:[{time:0,pose:{[bone]:[0,0,0,1]}},{time:1,pose:{[bone]:[0,1,0,0]}}]};
 const m=validateAsset({...base,motion},[bone]).motion;
 assert.ok(Math.abs(samplePose(m,.5)[bone][1]-Math.SQRT1_2)<1e-6);
 assert.deepEqual(samplePose(m,2)[bone],[0,1,0,0]);
 assert.throws(()=>validateAsset({...base,motion:{...motion,markers:{contact:.8,release:.2,controlReturn:1}}},[bone]));
});
test('parts follow their socket and clean up on replacement',()=>{
 const actor=new T.Group(),b=new T.Bone();b.name=bone;actor.add(b);const p=createAuthoredParts(actor);
 const asset={...base,parts:[{name:'visor',bone,shape:'box',color:'#ffffff',size:[.2,.1,.02],position:[0,0,.1],rotation:[0,0,0]}]};p.set(asset);assert.equal(b.children.length,1);b.position.x=4;actor.updateMatrixWorld(true);assert.equal(b.children[0].getWorldPosition(new T.Vector3()).x,4);p.set(asset);assert.equal(b.children.length,1);p.dispose();assert.equal(b.children.length,0);
});
test('saved character survives readback and corrupt storage is safe',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};saveCharacterRecipe('vega',{name:'Vegas',neckStyle:'skin'},storage);assert.equal(readCharacterRecipe('vega',storage).neckStyle,'skin');assert.equal(readCharacterRecipe('absent',storage),null);assert.equal(readCharacterRecipe('vega',{getItem:()=>'{broken'}),null);
});
import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyModularRecipe,validateModularRecipe} from '../src/engine/modular-costume.js';
import {ACTION_DRAFTS,actionDraft,createContactRehearsal} from '../src/engine/character-action-drafts.js';
import {compileAuthoredMotion} from '../src/engine/character-authoring.js';
import {heroModelOf} from '../src/data/hero-models.js';
async function loadActual(){const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
test('actual neck has independent material and full suit covers dark waist',async()=>{
 const g=await loadActual(),meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 applyModularRecipe(meshes,{skin:'#cc9988',primary:'#112233',neckStyle:'skin',outfit:'bodysuit'});
 const neck=meshes.find(m=>m.userData.slot==='neck');assert.ok(neck,'Separate exported neck slot');assert.equal(neck.material.color.getHexString(),'cc9988');assert.equal(meshes.find(m=>m.userData.slot==='waist').material.color.getHexString(),'112233');
 applyModularRecipe(meshes,{skin:'#cc9988',primary:'#112233',neckStyle:'uniform'});assert.equal(neck.material.color.getHexString(),'112233');
});
test('every blocking study compiles against the actual skeleton',async()=>{
 const g=await loadActual(),pose={},bones=[];g.scene.traverse(o=>{if(o.isBone){bones.push(o.name);pose[o.name]=o.quaternion.toArray();}});
 for(const name of Object.keys(ACTION_DRAFTS)){const asset=validateAsset({...base,motion:actionDraft(name,pose)},bones),clip=compileAuthoredMotion(asset);assert.ok(clip.validate(),name);assert.equal(asset.motion.status,'candidate');}
});
test('small carrier and large partner preserve hand-to-torso contact',async()=>{
 const g=await loadActual(),scene=new T.Scene(),actor=g.scene;actor.scale.setScalar(.6);scene.add(actor);const r=createContactRehearsal(actor,scene),m={markers:{contact:.3,release:.8}};r.set('partner',1.6,true);r.update(.5,m);scene.updateMatrixWorld(true);
 const partner=scene.getObjectByName('Interaction partner preview'),a=actor.getObjectByName('DEF-handR').getWorldPosition(new T.Vector3()),b=partner.getObjectByName('DEF-spine003').getWorldPosition(new T.Vector3());assert.ok(a.distanceTo(b)<1e-6);r.dispose();assert.equal(scene.getObjectByName('Interaction partner preview'),undefined);
});
test('modular defaults retain explicit alternative body choice',()=>{assert.equal(heroModelOf({id:'vega'}).body,'faceted-v1');assert.equal(heroModelOf({id:'vega',model:{body:'procedural'}}).body,'procedural');});

test('full-body loop studies close every joint and animate both arms and legs',async()=>{
 const {FULL_BODY_STUDIES,fullBodyStudy}=await import('../src/engine/character-full-body-studies.js');
 const names=['DEF-hips','DEF-spine003','DEF-neck','DEF-upper_armL','DEF-upper_armR','DEF-forearmL','DEF-forearmR','DEF-thighL','DEF-thighR','DEF-shinL','DEF-shinR'];
 const pose=Object.fromEntries(names.map(n=>[n,[0,0,0,1]]));
 for(const [name,d]of Object.entries(FULL_BODY_STUDIES)){const m=fullBodyStudy(name,pose);assert.ok(m.keys.length>=4);if(d.loop)for(const n of names)assert.ok(new T.Quaternion().fromArray(m.keys[0].pose[n]).angleTo(new T.Quaternion().fromArray(m.keys.at(-1).pose[n]))<1e-6,n);}
 const m=fullBodyStudy('Flailing fall',pose);for(const n of ['DEF-upper_armL','DEF-upper_armR','DEF-thighL','DEF-thighR'])assert.ok(new T.Quaternion().fromArray(m.keys[0].pose[n]).angleTo(new T.Quaternion().fromArray(m.keys[1].pose[n]))>.2,n);
});
