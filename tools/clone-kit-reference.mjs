// Source-only reference sampling. Actual current encounter definition and final
// production rig/skin. Staged pose samples are not AI gameplay evidence.
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {FrontlineEncounter} from '../src/engine/frontline-encounter.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {ROSTER} from '../src/data/characters.js';
import {runSlot} from '../src/engine/abilities.js';
const out='assets-src/frontline-clone-kit';await mkdir(out,{recursive:true});
const scene=new T.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[];g.player=new Fighter(ROSTER[0]);g.player.pos.set(-40,0,-40);
g.addFighter=(def,opts)=>{const f=new Fighter(def,opts);g.entities.push(f);scene.add(f.obj);return f;};
const encounter=new FrontlineEncounter(g),f=encounter.soldiers[0];f._game=g;f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.facing=0;f.gait='grounded';f.hasAimWorld=true;f.aimWorld.set(0,7,40);f.aim3.set(0,0,1);f.aim.set(0,0,1);
const meshes=[],seen=new Set();function collect(root,group){root.traverse(m=>{if(m.isMesh&&(m.layers.mask&1)&&!seen.has(m)){seen.add(m);meshes.push({m,group});}});}
for(const m of f.parts.skin.meshes){seen.add(m);meshes.push({m,group:'source-body'});}
for(const side of ['L','R']){collect(f.parts['arm'+side].children[1],'forearm');collect(f.parts['leg'+side].userData.boot,'boot');}
collect(f.obj.getObjectByName('weapon-rifle'),'rifle');
const sourceHashes=Object.fromEntries(['src/data/hero-body-bank.json','src/engine/rifle-pose.js'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const reference={kind:'Staged source-body + production rifle overlay; not native gameplay',body:'superhero-male',sourceHashes,definition:f.def,excludedFromPreview:['procedural headband/hair','existing torso harness'],poses:[]};
const point=new T.Vector3();
function capture(mode,phase){
 const data={mode,phase,head:f.parts.head.matrixWorld.toArray(),torso:f.parts.torso.matrixWorld.toArray(),meshes:[],supportGap:f.parts.armL.children[2].getWorldPosition(new T.Vector3()).distanceTo(f.obj.getObjectByName('weapon-support-grip').getWorldPosition(new T.Vector3()))};
 for(const {m,group}of meshes){const position=[],regions=[],trunk=[],originalIndex=Array.from(m.geometry.index?.array||Array.from({length:m.geometry.attributes.position.count},(_,i)=>i)),used=[...new Set(originalIndex)],remap=new Map(used.map((v,i)=>[v,i])),index=originalIndex.map(i=>remap.get(i));
  for(const i of used){
   m.getVertexPosition(i,point).applyMatrix4(m.matrixWorld);position.push(...point.toArray().map(v=>+v.toFixed(6)));
   let skin=false,tw=0;if(m.isSkinnedMesh&&m.geometry.attributes.skinIndex){let w=0;for(let j=0;j<4;j++){const n=m.skeleton.bones[m.geometry.attributes.skinIndex.getComponent(i,j)].name,weight=m.geometry.attributes.skinWeight.getComponent(i,j);if(/Head|neck|hand|index|middle|ring|pinky|thumb/.test(n))w+=weight;if(/root|pelvis|spine|clavicle/.test(n))tw+=weight;}skin=w>.5;}regions.push(skin?1:0);trunk.push(+tw.toFixed(4));
  }
  data.meshes.push({name:m.name,group,position,index,regions,trunk,color:m.material?.color?.toArray()||[.08,.1,.06]});
 }
 reference.poses.push(data);
}
for(const mode of ['idle','move','fire','guard','retreat'])for(let i=0;i<=120;i++){
 const dt=1/60;g.time+=dt;f.animT+=dt;f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-dt);f.ki=Math.min(f.maxKi,f.ki+dt*8);f.guarding=mode==='guard';f.poseGuard=f.guarding?1:0;f.vel.set(mode==='idle'?0:8,0,mode==='retreat'?-8:mode==='idle'?0:8);
 if(mode==='fire')runSlot(f,'lmb',{pressed:false,held:true,released:false,dt},g);f.advanceActionPose(dt);f._animate(dt);f.obj.updateMatrixWorld(true);
 if(i%30===0)capture(mode,i/120);
}
await writeFile(out+'/native-reference.json',JSON.stringify(reference));
const bounds={};for(const key of ['head','torso']){const inv=new T.Matrix4().fromArray(reference.poses[0][key]).invert(),box=new T.Box3();for(const m of reference.poses[0].meshes.filter(m=>m.name==='hero-skin-body'))for(let i=0;i<m.position.length;i+=3){point.fromArray(m.position,i).applyMatrix4(inv);if(key==='head'?point.y>-.85:Math.abs(point.y)<1.4)box.expandByPoint(point);}bounds[key]={min:box.min.toArray(),max:box.max.toArray()};}
console.log(JSON.stringify({poses:reference.poses.length,meshes:meshes.map(({m,group})=>({name:m.name,group,vertices:m.geometry.attributes.position.count})),bounds},null,2));
encounter.dispose();g.player.dispose();combat.dispose();
