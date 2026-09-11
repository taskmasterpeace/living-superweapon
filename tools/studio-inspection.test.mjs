import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StudioPreview} from '../src/tool/studio-preview.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

function fixture({scale=1,formScale=scale,distance=32,aspect=2.4,state='melee',isolated=true,view='front'}={}){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.frame={scale};
 const fighter=new Fighter(def),target=new Fighter({...def,frame:{scale:1}});
 fighter.applyForm({frame:{scale:formScale}});fighter.pos.set(0,80,0);target.pos.set(0,80,distance);
 for(const f of [fighter,target]){f.flying=true;f._flyPose=1;f._animate(0);f.obj.updateMatrixWorld(true);}
 const camera=new THREE.PerspectiveCamera(38,aspect,.1,1000),center=new THREE.Vector3(0,85,distance*.5);
 camera.position.copy(center).add(view==='side'?new THREE.Vector3(75,0,0):new THREE.Vector3(0,0,75));
 const p=Object.assign(Object.create(StudioPreview.prototype),{fighter,combat:{target},profile:{frame:{scale}},state,view,_isolated:isolated,_meleeZoom:1,camera,
  controls:{target:center,update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);}}});
 return {p,close(){fighter.dispose();target.dispose();}};
}
function projectBody(f,camera){
 const box=new THREE.Box3();
 for(const part of ['head','cowl','torso','armL','armR','legL','legR'])box.union(new THREE.Box3().setFromObject(f.parts[part]));
 const points=[];
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
 return {height:(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*.5,points};
}

for(const [scale,formScale] of [[1.5,.65],[.65,1.5]])test(`isolated transformed body is useful and fully in frame: ${scale} → ${formScale}`,()=>{
 const f=fixture({scale,formScale});try{const {p}=f;p._frameInspection();p.controls.update();const body=projectBody(p.fighter,p.camera);
  assert.ok(body.height>.3&&body.height<.85,`body occupies ${body.height} of frame`);
  assert.ok(body.points.every(v=>Math.abs(v.x)<.96&&Math.abs(v.y)<.96),'body geometry clipped');
 }finally{f.close();}
});

for(const state of ['melee','beam','attack'])for(const distance of [12,60])test(`${state} full encounter fits both bodies after paused narrow resize at ${distance}u`,()=>{
 const f=fixture({state,distance,isolated:false,view:'side'});try{const {p}=f;
  for(const aspect of [2.4,390/360,.8]){p.camera.aspect=aspect;p.camera.updateProjectionMatrix();p._frameInspection();p.controls.update();
   for(const actor of [p.fighter,p.combat.target])assert.ok(projectBody(actor,p.camera).points.every(v=>Math.abs(v.x)<.96&&Math.abs(v.y)<.96),`${state} at aspect ${aspect} clips body`);
  }
 }finally{f.close();}
});
