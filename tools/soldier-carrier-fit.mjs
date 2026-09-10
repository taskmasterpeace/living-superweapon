// Staged CPU geometry audit, not live gameplay evidence.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Fighter} from '../src/engine/entity.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {loadSoldierEquipment,loadCloneEquipment} from '../src/engine/clone-equipment.js';
import {ROSTER} from '../src/data/characters.js';
import {runSlot} from '../src/engine/abilities.js';
const baseline=process.argv.includes('--baseline'),out='artifacts/soldier-carrier-fit'+(baseline?'-baseline':'');await mkdir(out,{recursive:true});
let seed=731;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const bytes=await readFile('public/models/frontline/clone-kit.glb');
const scene=new T.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){},waterAt:()=>null};
const combat=new StudioCombat(scene,world),g=combat.game;
const f=new Fighter({...ROSTER.find(d=>d.id==='sarge'),build:{gaunt:1,weaponR:'rifle'}});f._game=g;scene.add(f.obj);g.player=f;g.entities=[f];
const options={loader:{loadAsync:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')}};
if(baseline)await loadCloneEquipment({soldiers:[f],disposed:false},options);else await loadSoldierEquipment(f,options);
const snapshots=[],v=new T.Vector3();
function capture(name){
 f.obj.updateMatrixWorld(true);const meshes=[];
 const chosen=[...f.parts.skin.meshes.map(m=>({m,group:'body'}))];
 for(const key of ['clone_helmet_head','clone_vest_torso'])f.obj.getObjectByName(key).traverse(m=>{if(m.isMesh)chosen.push({m,group:'kit'});});
 f.obj.getObjectByName('weapon-rifle').traverse(m=>{if(m.isMesh)chosen.push({m,group:'rifle'});});
 for(const {m,group} of chosen){
  const a=m.geometry.attributes.position,position=[];
  for(let i=0;i<a.count;i++){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);position.push(...v.toArray());}
  meshes.push({name:m.name,group,position,index:Array.from(m.geometry.index?.array??Array.from({length:a.count},(_,i)=>i))});
 }
 snapshots.push({name,meshes});
}
f.gait='grounded';f.hasAimWorld=true;f.aim.set(0,0,1);f.facing=0;f.animT=0;
for(const target of [[0,7,40],[0,80,15],[0,0,12],[20,12,18],[-20,18,18]]){
 f.aimWorld.fromArray(target);f.aim3.copy(f.aimWorld).normalize();
 for(let i=0;i<60;i++){
  g.time+=1/60;f.animT+=1/60;f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-1/60);f.ki=f.maxKi;f.vel.set(8,0,8);
  runSlot(f,'lmb',{held:true,pressed:false,released:false,dt:1/60},g);f.advanceActionPose(1/60);f._animate(1/60);
  if([0,14,29,44,59].includes(i))capture(`${target.join(',')}:${i}`);
 }
}
await writeFile(out+'/snapshots.json',JSON.stringify(snapshots));f.dispose();combat.dispose();console.log('Wrote 25 actual source-body/kit/rifle pose snapshots');
