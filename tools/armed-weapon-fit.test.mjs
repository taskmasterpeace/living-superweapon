import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

function posedStormcall(body,stage){
  const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
  const combat=new StudioCombat(scene,world),def=structuredClone(ROSTER.find(hero=>hero.id==='stormcall'));
  def.model={...def.model,body};
  const fighter=new Fighter(def);fighter._openSky=true;scene.add(fighter.obj);
  combat.meleeSequence='heavy';combat.meleeStage=stage;combat.reset(fighter,true,'melee');
  for(let frame=1;frame<=Math.round(1.12*60);frame++)combat.step(frame/60,1/60);
  combat.step(1.12,0);fighter.obj.updateMatrixWorld(true);
  return {fighter,combat};
}

function vertices(mesh){
  const position=mesh.geometry.attributes.position,out=[];
  for(let i=0;i<position.count;i++)out.push(mesh.isSkinnedMesh?mesh.getVertexPosition(i,new THREE.Vector3()):new THREE.Vector3().fromBufferAttribute(position,i));
  return out;
}

function worldFaces(mesh,{trunkOnly=false}={}){
  const points=vertices(mesh),index=mesh.geometry.index,count=index?index.count:points.length;
  const skinIndex=mesh.geometry.attributes.skinIndex,skinWeight=mesh.geometry.attributes.skinWeight,out=[];
  const trunkWeight=id=>{
    if(!mesh.isSkinnedMesh)return 1;
    let score=0;
    for(let k=0;k<4;k++){
      const name=mesh.skeleton.bones[skinIndex.getComponent(id,k)].name;
      if(/^(root|pelvis|spine_)/.test(name))score+=skinWeight.getComponent(id,k);
    }
    return score;
  };
  for(let i=0;i<count;i+=3){
    const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
    if(trunkOnly&&ids.reduce((sum,id)=>sum+trunkWeight(id),0)/3<.5)continue;
    out.push(ids.map(id=>points[id].clone().applyMatrix4(mesh.matrixWorld)));
  }
  return out;
}

function surfaceIntersections(weapon,bodyFaces){
  const weaponFaces=[];weapon.traverse(mesh=>{if(mesh.isMesh)weaponFaces.push(...worldFaces(mesh));});
  const hit=new THREE.Vector3(),direction=new THREE.Vector3(),ray=new THREE.Ray(),points=[];
  const crosses=(a,b,face)=>{
    direction.subVectors(b,a);const length=direction.length();
    ray.set(a,direction.multiplyScalar(1/length));
    if(!ray.intersectTriangle(face[0],face[1],face[2],false,hit))return;
    if(hit.distanceTo(a)>length+1e-5)return;
    if(!points.some(point=>point.distanceToSquared(hit)<1e-6))points.push(hit.clone());
  };
  for(const weaponFace of weaponFaces)for(const bodyFace of bodyFaces){
    crosses(weaponFace[0],weaponFace[1],bodyFace);crosses(weaponFace[1],weaponFace[2],bodyFace);crosses(weaponFace[2],weaponFace[0],bodyFace);
    crosses(bodyFace[0],bodyFace[1],weaponFace);crosses(bodyFace[1],bodyFace[2],weaponFace);crosses(bodyFace[2],bodyFace[0],weaponFace);
  }
  return points;
}

function trunkSurfaceCrossings(fighter){
  const fist=fighter.parts.armR.children[2];
  const weapon=fist.children.find(child=>child.isGroup&&child.children.some(part=>part.isMesh));
  assert.ok(weapon,'STORMCALL must carry the production axe in the primary hand');
  const bodies=fighter.parts.skin
    ? fighter.parts.skin.meshes.filter(mesh=>mesh.name==='hero-skin-body')
    : [fighter.parts.torso,fighter.parts.pelvis];
  // The source body is one continuous skin, so whole-body containment also counts the
  // intentional shaft overlap with its gripping hand/arm. Test only weighted trunk
  // triangles to distinguish chest/abdomen penetration from that occupied grip.
  const trunkFaces=bodies.flatMap(mesh=>worldFaces(mesh,{trunkOnly:mesh.isSkinnedMesh}));
  return surfaceIntersections(weapon,trunkFaces).map(point=>fighter.parts.torso.worldToLocal(point.clone()).toArray().map(value=>Number(value.toFixed(4))));
}

for(const stage of ['grounded','airborne'])for(const body of ['procedural','superhero-male','superhero-female'])test(`STORMCALL's axe clears the rendered ${body} trunk at ${stage} heavy startup`,()=>{
  const {fighter,combat}=posedStormcall(body,stage);
  try{
    assert.equal(combat.phase,'startup');
    assert.equal(fighter.mId,'power');
    assert.equal(fighter._authoredStrike?.applied??false,false,'armed power must retain its weapon-compatible procedural path');
    const crossings=trunkSurfaceCrossings(fighter);
    assert.equal(crossings.length,0,`the occupied primary-hand startup guard crosses the rendered trunk surface at torso-local ${JSON.stringify(crossings)}`);
  }finally{combat.dispose();fighter.dispose();}
});
