import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import {createAuthoredAssetLoader} from '../src/engine/authored-assets.js';
import {createEquipmentMount} from '../src/engine/authored-equipment.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
const root=resolve('public/authored-assets');
const loader=createAuthoredAssetLoader({baseUrl:'https://assets.test/',fetch:async input=>{try{return new Response(await readFile(resolve(root,new URL(input).pathname.slice(1))));}catch{return new Response('',{status:404});}}});
for(const [ref,kind,twoHanded]of [['prop.reference-weapon-rifle-m16@4','rifle',true],['prop.reference-weapon-pistol-1@5','pistol',false]])test(`restored ${kind} preserves source art and maps actual grip/muzzle into native axes`,async()=>{
 const asset=await loader.loadEquipmentInstance(ref),geometry=[];
 asset.root.traverse(o=>{if(o.isMesh)geometry.push([o,o.geometry,Array.from(o.geometry.attributes.position.array)]);});
 const original=JSON.stringify(asset.manifest),mounted=createEquipmentMount(asset,{weaponKind:kind});
 assert.equal(mounted.userData.equipmentSource,ref);assert.equal(mounted.userData.twoHanded,twoHanded);
 assert.equal(mounted.userData.reloadPresentation,'static-source-no-action-parts');
 assert.equal(mounted.getObjectByName('weapon-magazine'),undefined);assert.equal(mounted.getObjectByName('weapon-charging-handle'),undefined);
 for(const [mesh,g,positions]of geometry){assert.equal(mesh.geometry,g);assert.deepEqual(Array.from(g.attributes.position.array),positions);}
 mounted.updateMatrixWorld(true);
 const primary=mounted.getObjectByName('weapon-primary-grip').getWorldPosition(new T.Vector3());
 const muzzle=mounted.getObjectByName('weapon-muzzle').getWorldPosition(new T.Vector3());
 assert.ok(primary.length()<1e-6);assert.ok(muzzle.y<-.8);assert.ok(muzzle.z>0,'source muzzle remains above primary grip');
 const sourceMuzzle=asset.root.getObjectByName('socket-attachment-muzzle').getWorldPosition(new T.Vector3());
 assert.ok(sourceMuzzle.distanceTo(muzzle)<1e-6,'runtime origin remains at the source muzzle');
 if(twoHanded)assert.ok(mounted.getObjectByName('weapon-support-grip').position.y<0);
 assert.equal(JSON.stringify(asset.manifest),original);mounted.userData.disposeEquipment();
});
test('restored source cannot be mounted as a different weapon class',async()=>{
 const asset=await loader.loadEquipmentInstance('prop.reference-weapon-pistol-1@5');
 assert.throws(()=>createEquipmentMount(asset,{weaponKind:'rifle'}),/class does not match/);
});
