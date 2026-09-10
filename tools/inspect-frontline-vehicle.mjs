// CPU-side native Three.js GLTFLoader contract check. GPU appearance is checked in Blender
// preview and by the game's integration verification. Bitmap upload is deliberately mocked.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});
globalThis.ProgressEvent??=class ProgressEvent{constructor(type,details){this.type=type;Object.assign(this,details);}};
const data=readFileSync('public/models/frontline/armored-scout.glb');
const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
const root=gltf.scene;root.updateMatrixWorld(true);
const names=['hull','wheels_FL','wheels_FR','wheels_RL','wheels_RR','turret','barrel'];
for(const name of names)assert.ok(root.getObjectByName(name),`Native loader missed ${name}`);
const gun=root.getObjectByName('barrel'),turret=root.getObjectByName('turret');assert.equal(gun.parent,turret);
const before=gun.getWorldPosition(new Vector3());turret.rotation.y=.4;turret.updateMatrixWorld(true);assert.ok(before.distanceTo(gun.getWorldPosition(new Vector3()))>.01,'Turret must carry gun pivot');
gun.rotation.x=.25;gun.updateMatrixWorld(true);turret.rotation.y=0;gun.rotation.x=0;root.updateMatrixWorld(true);
const report={loader:'Three.js native GLTFLoader',meshNodes:names,dimensions:new Box3().setFromObject(root).getSize(new Vector3()).toArray(),animations:gltf.animations.length,textureDecode:'Mocked bitmap for CPU-only loader contract; PNG dimensions validated separately',articulation:'Verified turret yaw carries barrel; barrel pitch and wheel X-axis pivots available'};
writeFileSync('assets-src/frontline-vehicles/native-loader-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
