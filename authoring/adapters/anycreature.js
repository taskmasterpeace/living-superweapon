// Adapter: anyCreature JSON recipe → skinned, animated creature GLB. The vendored compiler
// (authoring/vendor/anycreature, MIT, pinned in VENDOR.json) runs as a bounded build-time
// subprocess on a COMMITTED recipe; it is never given an upload and its output is checked
// twice — by its own output contract and by the Khronos validator — before normalisation.
// anyCreature emits metres, +Y up, +Z forward; the package is rescaled to game units.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {AUTHORING_ROOT,resolveWithin} from '../lib/paths.js';
import {measureGlb,structuralReport,boundsOf,readGlb} from '../lib/measure.js';

const run=promisify(execFile);
const VENDOR=resolve(AUTHORING_ROOT,'vendor','anycreature');
const GAME_UNITS_PER_METER=1/0.19;
export default {
 name:'anycreature',version:1,kinds:['creature'],
 async build({recipe,recipeDir,sources,log}){
  const specPath=resolveWithin(recipeDir,recipe.spec||'creature.json');
  const relSpec=sources.find(s=>resolve(s.abs)===specPath);
  if(!relSpec)throw new Error('recipe must list its creature spec as a source so its hash is recorded');
  const vendorManifest=JSON.parse(await readFile(join(VENDOR,'VENDOR.json'),'utf8'));
  if(!sources.some(s=>s.path==='authoring/vendor/anycreature/VENDOR.json'))throw new Error('recipe must list authoring/vendor/anycreature/VENDOR.json as a source (pins the compiler revision)');
  const spec=JSON.parse(relSpec.bytes.toString('utf8'));
  for(const key of ['joints','chains','volumes','animations'])if(!spec[key])throw new Error(`creature spec lacks "${key}"`);
  const work=await mkdtemp(join(tmpdir(),'pw-anycreature-'));
  try{
   const out=join(work,'creature.glb');
   let stdout='',stderr='';
   try{({stdout,stderr}=await run(process.execPath,[join(VENDOR,'engine','cli.js'),specPath,out],{timeout:120000,maxBuffer:8<<20,windowsHide:true}));}
   catch(e){
    const blocks=(e.stderr||'').split(/\r?\n/).filter(l=>l.startsWith('BLOCK:'));
    throw new Error(`anyCreature refused the build (exit ${e.code}):\n${blocks.join('\n')||e.stderr||e.message}`);
   }
   for(const line of stderr.split(/\r?\n/).filter(l=>l.startsWith('warn:')))log(`  anyCreature ${line}`);
   const summary=JSON.parse(stdout.split(/\r?\n/).filter(l=>l.startsWith('{')).pop()||'{}');
   const raw=await readFile(out);
   const require=createRequire(import.meta.url);
   const {checkGLB}=require(join(VENDOR,'engine','core','contract.js'));
   const contract=checkGLB(raw);
   if(!contract.ok)throw new Error('anyCreature output contract failed: '+contract.errors.map(e=>`[${e.code}] ${e.msg}`).join('; '));
   // Normalise: wrap the scene under one node scaled to game units. Skinned meshes and their
   // skeletons share that ancestor, so bind matrices stay consistent.
   const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
   const doc=await io.readBinary(new Uint8Array(raw));
   const scene=doc.getRoot().listScenes()[0];
   const wrapper=doc.createNode('game-units').setScale([GAME_UNITS_PER_METER,GAME_UNITS_PER_METER,GAME_UNITS_PER_METER]);
   for(const child of scene.listChildren()){scene.removeChild(child);wrapper.addChild(child);}
   scene.addChild(wrapper);
   doc.getRoot().getAsset().generator=`powerworld-authoring (anyCreature v${vendorManifest.version})`;
   const bytes=Buffer.from(await io.writeBinary(doc));
   const glb=await measureGlb(bytes),structure=await structuralReport(bytes),bounds=await boundsOf(bytes);
   if(structure.errors.length)throw new Error('GLB structural validation failed: '+structure.errors.map(e=>e.message).join('; '));
   const nodeNames=new Set(doc.getRoot().listNodes().map(n=>n.getName()));
   const animations=new Map(doc.getRoot().listAnimations().map(a=>[a.getName(),a]));
   const clips=[];
   for(const c of recipe.clips){
    const anim=animations.get(c.anim||c.id);if(!anim)throw new Error(`creature GLB has no animation "${c.anim||c.id}" (has ${[...animations.keys()].join(', ')})`);
    let duration=0;for(const ch of anim.listChannels()){const input=ch.getSampler()?.getInput();if(input){const max=input.getMax([])[0];duration=Math.max(duration,max);}}
    const specAnim=spec.animations[c.anim||c.id]||{};
    const events=(c.events||[]).map(e=>({t:+e.t.toFixed(4),type:e.type,...(e.side?{side:e.side}:{}),note:e.note||'authored'}));
    clips.push({id:c.id,take:c.anim||c.id,duration:+duration.toFixed(6),loop:specAnim.loop===true,sampleRate:24,frames:Math.max(2,Math.round(duration*24)+1),mirror:null,handedness:'none',events});
   }
   const hitZones=(recipe.hitZones||[]).map(z=>{if(!nodeNames.has(z.attach))throw new Error(`hit zone ${z.zone} attaches to unknown node "${z.attach}" (nodes: ${[...nodeNames].filter(n=>n&&!n.startsWith('batch')).slice(0,40).join(', ')})`);return {...z,center:z.center.map(n=>n*GAME_UNITS_PER_METER),...(z.radius?{radius:z.radius*GAME_UNITS_PER_METER}:{}),...(z.end?{end:z.end.map(n=>n*GAME_UNITS_PER_METER)}:{}),...(z.halfExtents?{halfExtents:z.halfExtents.map(n=>n*GAME_UNITS_PER_METER)}:{})};});
   log(`  ${recipe.id}: ${glb.triangles} tris, ${glb.drawCalls} draws, ${glb.bones} bones, ${bytes.length} bytes, anims ${[...animations.keys()].join(',')} · compiler ${summary.checks||'?'} · dims ${JSON.stringify(summary.dims||{})} m`);
   return {
    manifest:{
     rig:{skeleton:'anycreature@1',bones:glb.bones},
     clips,bounds,hitZones,
     materials:doc.getRoot().listMaterials().map(m=>({name:m.getName()})),
     lods:[{level:0,output:'model.glb',triangles:glb.triangles}],
     units:{sourceConversion:{scale:+GAME_UNITS_PER_METER.toFixed(6),yawDegrees:0,mirrorX:false,sourceUp:'+Y',sourceForward:'+Z',note:'anyCreature metres wrapped under a game-units node'}},
     budgets:{measured:{triangles:glb.triangles,drawCalls:glb.drawCalls,materials:glb.materials,bones:glb.bones,textures:glb.textures,bytes:bytes.length}},
     structural:{validator:structure.validator,errors:0,warnings:structure.warnings.length,compiler:{version:vendorManifest.version,revision:vendorManifest.revision,checks:summary.checks||null}},
     provenance:{},
     ...(recipe.reference?{reference:recipe.reference}:{}),
    },
    outputs:[{path:'model.glb',role:'glb',bytes}],
   };
  }finally{await rm(work,{recursive:true,force:true});}
 },
};
