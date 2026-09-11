// Source-only GLB pruning/deduplication; never writes public/ or src/.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
import assert from 'node:assert/strict';
const root='assets-src/frontline-clone-kit'+(process.argv.includes('--v3')?'/v3':''),from=root+'/clone-kit.raw.glb',to=root+'/clone-kit.glb';
const run=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['--yes','@gltf-transform/cli@4.5.0','optimize',from,to,'--compress','false','--flatten','false','--join','false','--instance','false','--palette','false','--simplify','false','--texture-compress','false','--prune-attributes','false'],{stdio:'inherit',shell:process.platform==='win32'});if(run.status!==0)process.exit(run.status||1);
const bytes=readFileSync(to),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
const source=JSON.parse(readFileSync(root+'/clone-kit-meshes.json')),report={sourceOnly:true,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),attachments:{},materials:new Set(),draws:0,triangles:0};
for(const name of Object.keys(source)){
 const group=gltf.scene.getObjectByName(name);assert.ok(group);assert.equal(group.userData.attachment,name.endsWith('head')?'parts.head':'parts.torso');
 const expected=new Box3(),actual=new Box3(),p=new Vector3();for(const mesh of source[name])for(let i=0;i<mesh.position.length;i+=3)expected.expandByPoint(p.fromArray(mesh.position,i));
 group.traverse(o=>{if(!o.isMesh)return;assert.ok(!Array.isArray(o.material),'Scalar material contract');report.materials.add(o.material.name);report.draws++;report.triangles+=o.geometry.index.count/3;
  for(let i=0;i<o.geometry.attributes.position.count;i++)actual.expandByPoint(p.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld));
  assert.ok(o.geometry.attributes.uv);assert.ok(o.geometry.attributes.normal);
 });
 assert.ok(expected.min.distanceTo(actual.min)<1e-4&&expected.max.distanceTo(actual.max)<1e-4,'Native attachment coordinate parity');report.attachments[name]={min:actual.min.toArray(),max:actual.max.toArray(),pivot:[0,0,0]};
}
report.materials=[...report.materials];assert.equal(report.draws,6);assert.equal(report.materials.length,3);assert.ok(report.triangles<=6000);writeFileSync(root+'/package-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
