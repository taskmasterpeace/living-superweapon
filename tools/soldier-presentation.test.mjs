import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {figure} from '../src/engine/figure.js';
import {ROSTER} from '../src/data/characters.js';
import {heroModelOf} from '../src/data/hero-models.js';
import * as equipment from '../src/engine/clone-equipment.js';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyProfile,profileFromDef} from '../src/tool/studio-profile.js';

function fighter(id='sarge') {
 const def=ROSTER.find(d=>d.id===id),parts=figure(def);
 return {def,parts,obj:parts.g,_formDisposed:false};
}

test('military anatomy is independent of weapon damage strength, including lower-strength clones',()=>{
 for(const id of ['sarge','merc']){
  const def=ROSTER.find(d=>d.id===id),base=figure(def),clone=figure({...def,strength:2});
  assert.ok(base.torso.scale.x>=1,'A trained soldier must not inherit the frail low-strength silhouette');
  assert.deepEqual(clone.torso.scale.toArray(),base.torso.scale.toArray(),'Clone damage tuning must not shrink its body');
  assert.deepEqual(clone.armL.position.toArray(),base.armL.position.toArray(),'Strength must not collapse military shoulder span');
  assert.deepEqual(base.g.scale.toArray(),[1,1,1],'Do not scale the physics/ragdoll root to bulk the soldier');
 }
});
function source(){
 const scene=new T.Group();
 for(const name of ['clone_helmet_head','clone_vest_torso']){
  const root=new T.Group();root.name=name;
  for(const key of ['kit-shell-olive','kit-webbing-khaki','kit-rubber-hardware']){
   const material=new T.MeshStandardMaterial({color:'#ffffff'});material.name=key;
   root.add(new T.Mesh(new T.BoxGeometry(.1,.1,.1),material));
  }
  scene.add(root);
 }
 return {scene};
}
test('playable military defaults bind the authored skin, while custom procedural bodies remain an option',()=>{
 for(const id of ['sarge','merc']){
  const f=fighter(id);assert.equal(f.parts.skin?.id,'superhero-male');
  assert.equal(heroModelOf(f.def).equipment,'soldier');
 }
 const custom={...ROSTER.find(d=>d.id==='sarge'),model:{body:'procedural',equipment:false}};
 assert.equal(figure(custom).skin,undefined);assert.equal(heroModelOf(custom).equipment,false);
});
test('player kit attaches source accessories, distinguishes cloth palette and never changes weapon grip',async()=>{
 assert.equal(typeof equipment.loadSoldierEquipment,'function');
 const f=fighter(),rifle=f.obj.getObjectByName('weapon-rifle'),parent=rifle.parent,matrix=rifle.matrix.clone();
 await equipment.loadSoldierEquipment(f,{loader:{loadAsync:async()=>source()}});
 assert.ok(f._soldierEquipment);assert.ok(f.parts.head.getObjectByName('clone_helmet_head'));
 assert.equal(f.parts.cowl.visible,false);
 assert.equal(f.parts.mats.suit.color.getHexString(),'525b3d');
 assert.equal(f.parts.mats.suit2.color.getHexString(),'424a36');
 const helmet=f.parts.head.getObjectByName('clone_helmet_head').children[0],vest=f.parts.torso.getObjectByName('clone_vest_torso').children[0];
 assert.notEqual(helmet.material,vest.material,'Olive helmet and tan plate carrier need independent shell colors');
 assert.equal(vest.material.color.getHexString(),'998467');
 assert.equal(rifle.parent,parent);assert.ok(rifle.matrix.equals(matrix));
});
test('late kit cannot attach to a replaced appearance or disposed fighter',async()=>{
 assert.equal(typeof equipment.loadSoldierEquipment,'function');
 for(const changed of ['parts','disposed']){
  const f=fighter();let resolve;const before=f.parts;
  const pending=equipment.loadSoldierEquipment(f,{loader:{loadAsync:()=>new Promise(r=>resolve=r)}});
  if(changed==='parts')f.parts=fighter().parts;else f._formDisposed=true;
  resolve(source());await pending;
  assert.equal(before.head.getObjectByName('clone_helmet_head'),undefined);
  assert.equal(f.parts.head.getObjectByName('clone_helmet_head'),undefined);
 }
});

test('a fitted military helmet replaces the exposed hero headband, while non-military fallback retains it',async()=>{
 const f=fighter(),band=f.parts.head.children.find(o=>o.geometry?.type==='TorusGeometry');
 assert.ok(band?.visible,'The un-equipped fallback starts with its original headband');
 await equipment.loadSoldierEquipment(f,{loader:{loadAsync:async()=>source()}});
 assert.equal(band.visible,false,'A superhero headband must not protrude as a false brim through the ballistic shell');
 const fallback=fighter();assert.ok(fallback.parts.head.children.find(o=>o.geometry?.type==='TorusGeometry')?.visible);
});
test('enemy clone accessories and cloth read differently from the playable military palette',async()=>{
 const f=fighter();await equipment.loadCloneEquipment({soldiers:[f],disposed:false},{loader:{loadAsync:async()=>source()}});
 assert.equal(f.parts.mats.suit.color.getHexString(),'424746');
 assert.equal(f.parts.mats.suit2.color.getHexString(),'393e3c');
 const shell=f.parts.head.getObjectByName('clone_helmet_head').children[0];
 assert.equal(shell.material.color.getHexString(),'c1b49a');
});
test('enemy identification uses an isolated material shader so players never inherit hostile sleeve markings',async()=>{
 const player=fighter(),clone=fighter();
 await equipment.loadSoldierEquipment(player,{loader:{loadAsync:async()=>source()}});
 await equipment.loadCloneEquipment({soldiers:[clone],disposed:false},{loader:{loadAsync:async()=>source()}});
 const pm=player.parts.skin.materials.body,cm=clone.parts.skin.materials.body;
 assert.notEqual(pm.customProgramCacheKey(),cm.customProgramCacheKey());
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 cm.onBeforeCompile(shader);
 assert.ok(shader.uniforms.cloneIdentificationColor?.value.isColor);
 assert.ok(shader.uniforms.skinSuit,'Existing skin palette still compiles');
 const playerShader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 pm.onBeforeCompile(playerShader);assert.equal(playerShader.uniforms.cloneIdentificationColor,undefined);
});
test('player carrier expands only its existing rear plate; front rifle-clearance surface stays source-exact',async()=>{
 const bytes=await readFile('public/models/frontline/clone-kit.glb');
 const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const sourcePosition=asset.scene.getObjectByName('clone_vest_torso__kit-shell-olive').geometry.attributes.position;
 const before=Array.from({length:sourcePosition.count},(_,i)=>[sourcePosition.getX(i),sourcePosition.getY(i),sourcePosition.getZ(i)]).flat();
 const f=fighter();await equipment.loadSoldierEquipment(f,{loader:{loadAsync:async()=>asset}});
 const p=f.parts.torso.getObjectByName('clone_vest_torso__kit-shell-olive').geometry.attributes.position;
 let rearWidened=0;
 for(let i=0;i<p.count;i++){
  if(before[i*3+2]>=0)assert.deepEqual([p.getX(i),p.getY(i),p.getZ(i)],[...before.slice(i*3,i*3+3)],'Front plate must not approach weapon or arms');
  else if(Math.abs(before[i*3])>.1&&Math.abs(p.getX(i))>Math.abs(before[i*3])*1.2)rearWidened++;
 }
 assert.ok(rearWidened>30,'Rear authored silhouette should visibly broaden');
 const root=f.parts.torso.getObjectByName('clone_vest_torso'),hull=root.userData.ragdollSupport;
 const hullMin=Math.min(...hull.filter((_,i)=>i%3===1)),box=new T.Box3().setFromObject(root);
 assert.ok(Number.isFinite(hullMin)&&!box.isEmpty());
});
test('loading soldier gear never overwrites a creator Studio uniform palette',async()=>{
 const base=ROSTER.find(d=>d.id==='sarge'),profile=profileFromDef(base);profile.colors.primary='#944a31';profile.colors.secondary='#49392d';
 const def=applyProfile(base,profile),parts=figure(def),f={def,parts,obj:parts.g,_formDisposed:false};
 const suit=parts.mats.suit.color.clone(),legs=parts.mats.suit2.color.clone();
 await equipment.loadSoldierEquipment(f,{loader:{loadAsync:async()=>source()}});
 assert.ok(parts.mats.suit.color.equals(suit));assert.ok(parts.mats.suit2.color.equals(legs));
});
