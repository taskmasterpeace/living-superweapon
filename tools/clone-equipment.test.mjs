import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
const api=await import('../src/engine/clone-equipment.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function fixture(){
 const scene=new T.Group(),material=new T.MeshStandardMaterial();
 for(const name of ['clone_helmet_head','clone_vest_torso']){const part=new T.Group();part.name=name;part.add(new T.Mesh(new T.BoxGeometry(),material));scene.add(part);}
 const fighter=()=>{const head=new T.Group(),torso=new T.Group(),cowl=new T.Group(),g=new T.Group();g.add(head,torso,cowl);const hair=new T.Group();hair.name='hair-back';head.add(hair);const old=new T.Group();old.name='field-torso_harness';torso.add(old);return {obj:g,parts:{head,torso,cowl},_formDisposed:false};};
 return {asset:{scene},fighters:[fighter(),fighter()]};
}
test('clone kit attaches to driven parts with per-fighter resources and hides replaced gear',async()=>{
 assert.equal(typeof api.loadCloneEquipment,'function');const f=fixture(),owner={soldiers:f.fighters,disposed:false};
 await api.loadCloneEquipment(owner,{loader:{loadAsync:async()=>f.asset}});
 const [a,b]=f.fighters;assert.ok(a.parts.head.getObjectByName('clone_helmet_head'));assert.ok(a.parts.torso.getObjectByName('clone_vest_torso'));
 assert.equal(a.parts.head.getObjectByName('clone_helmet_head').userData.ragdollSupport.length,24,'Eight hull corners preserve the box support without duplicate face vertices');
 assert.equal(a.parts.cowl.visible,false);assert.equal(a.parts.head.getObjectByName('hair-back').visible,false);assert.equal(a.parts.torso.getObjectByName('field-torso_harness').visible,false);
 const am=a.parts.head.getObjectByName('clone_helmet_head').children[0],bm=b.parts.head.getObjectByName('clone_helmet_head').children[0];assert.notEqual(am.geometry,bm.geometry);assert.notEqual(am.material,bm.material);assert.ok(am.userData.heroGear);
});
test('late equipment after leaving the encounter cannot resurrect disposed fighters',async()=>{
 assert.equal(typeof api.loadCloneEquipment,'function');const f=fixture(),owner={soldiers:f.fighters,disposed:false};let resolve,disposed=0;f.asset.scene.children[0].children[0].geometry.addEventListener('dispose',()=>disposed++);
 const loading=api.loadCloneEquipment(owner,{loader:{loadAsync:()=>new Promise(r=>resolve=r)}});owner.disposed=true;resolve(f.asset);await loading;
 assert.equal(disposed,1);assert.equal(f.fighters[0].parts.head.getObjectByName('clone_helmet_head'),undefined);
});
