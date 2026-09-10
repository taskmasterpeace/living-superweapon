// Adapter for procedural (img2threejs-style) equipment and props. The recipe names a committed,
// reviewed factory module beside it (`model.js`, exporting createModel(THREE) → THREE.Group).
// That module is build-time source under authoring/recipes/, imported like any other code in
// this package — never loaded from a package, an upload or a URL. Sockets are empty nodes named
// `socket:<name>`; their transforms are read back from the baked GLB, not from the recipe.
import {pathToFileURL} from 'node:url';
import {resolve,relative,join} from 'node:path';
import {stat} from 'node:fs/promises';
import * as THREE from 'three';
import {objectToGlb} from '../lib/glb-write.js';
import {measureGlb,structuralReport,boundsOf,readGlb} from '../lib/measure.js';
import {REPO_ROOT,AUTHORING_ROOT,resolveWithin,toPosix} from '../lib/paths.js';

const q=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3();
export default {
 name:'procedural-prop',version:1,kinds:['equipment','prop'],
 async build({recipe,recipeDir,sources,log}){
  const modelPath=resolveWithin(recipeDir,recipe.model||'model.js');
  const rel=toPosix(relative(REPO_ROOT,modelPath));
  if(!rel.startsWith('authoring/recipes/'))throw new Error('factory module must live beside its recipe under authoring/recipes/');
  if(!sources.some(src=>src.path===rel))throw new Error(`recipe must list its factory module as a source so its hash is recorded: ${rel}`);
  const module=await import(pathToFileURL(modelPath).href+'?v='+sources.find(src=>src.path===rel).sha256.slice(0,12));
  if(typeof module.createModel!=='function')throw new Error(`${rel} must export createModel(THREE)`);
  const root=module.createModel(THREE);
  if(!root||!root.isObject3D)throw new Error('createModel must return a THREE.Object3D');
  root.name=root.name||recipe.id;root.updateMatrixWorld(true);
  // One draw call per material: the runtime never needs the authoring hierarchy, only the sockets.
  const bytes=await objectToGlb(root,{name:recipe.id,mergeByMaterial:recipe.mergeByMaterial!==false});
  const glb=await measureGlb(bytes),structure=await structuralReport(bytes),bounds=await boundsOf(bytes);
  if(structure.errors.length)throw new Error('GLB structural validation failed: '+structure.errors.map(e=>e.message).join('; '));
  // Sockets: read from the written file so the manifest describes the bytes, not the intent.
  const doc=await readGlb(bytes),sockets=[];
  for(const node of doc.getRoot().listNodes()){
   const name=node.getName();if(!name.startsWith('socket-'))continue;
   const parent=node.getParentNode?.()?.getName()||root.name;
   sockets.push({name:name.slice(7),parent,position:node.getTranslation().map(n=>+n.toFixed(5)),rotation:node.getRotation().map(n=>+n.toFixed(6))});
  }
  sockets.sort((a,b)=>a.name.localeCompare(b.name));
  log(`  ${recipe.id}: ${glb.triangles} tris, ${glb.drawCalls} draws, ${glb.materials} materials, ${bytes.length} bytes, sockets ${sockets.map(x=>x.name).join(',')||'none'}${structure.warnings.length?` · ${structure.warnings.length} validator warnings`:''}`);
  const materials=[];for(const m of doc.getRoot().listMaterials())materials.push({name:m.getName()});
  return {
   manifest:{
    rig:{skeleton:'none'},sockets,bounds,materials,
    ...(recipe.kind==='equipment'?{equipment:recipe.equipment}:{}),
    lods:[{level:0,output:'model.glb',triangles:glb.triangles}],
    units:{sourceConversion:{scale:1,yawDegrees:0,mirrorX:false,sourceUp:'+Y',sourceForward:'+Z',note:'authored directly in game units along the engine weapon axis (-Y toward the muzzle)'}},
    budgets:{measured:{triangles:glb.triangles,drawCalls:glb.drawCalls,materials:glb.materials,bones:glb.bones,textures:glb.textures,bytes:bytes.length}},
    structural:{validator:structure.validator,errors:0,warnings:structure.warnings.length},
    ...(recipe.reference?{reference:recipe.reference}:{}),
    provenance:{},
   },
   outputs:[{path:'model.glb',role:'glb',bytes}],
  };
 },
};
