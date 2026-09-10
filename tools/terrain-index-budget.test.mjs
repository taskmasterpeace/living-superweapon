import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshTerrainSurface} from '../src/engine/mesh-terrain-surface.js';

function fixture(){
 const geometry=new THREE.PlaneGeometry(100000,100000,64,64),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*.0001)*80+Math.cos(p.getY(i)*.00013)*40);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());mesh.rotation.x=-Math.PI/2;mesh.position.set(13,24,-31);
 const started=performance.now(),surface=new MeshTerrainSurface(mesh);
 return {mesh,surface,buildMs:performance.now()-started,dispose(){surface.dispose();geometry.dispose();mesh.material.dispose();}};
}

test('wide shallow terrain index does not multiply triangle storage across spatial cells',t=>{
 const f=fixture();try{
  let references=0,nodes=0;const visit=n=>{nodes++;references+=n.triangles.length;for(const child of n.subTrees)visit(child);};visit(f.surface.index);
  const sourceTriangles=f.mesh.geometry.index.count/3;
  t.diagnostic(JSON.stringify({sourceTriangles,references,nodes,buildMs:f.buildMs}));
  assert.ok(references<=sourceTriangles*2,`${references} stored references for ${sourceTriangles} terrain triangles`);
 }finally{f.dispose();}
});

test('budgeted index retains nearest rendered contact for oblique, vertical and long rays',()=>{
 const f=fixture();try{
  const ray=new THREE.Raycaster(),a=new THREE.Vector3(),b=new THREE.Vector3(),delta=new THREE.Vector3();
  for(let i=0;i<100;i++){
   a.set(-45000+i*883,600,Math.sin(i*1.7)*44000);b.set(a.x+Math.sin(i*.4)*20000,-300,a.z+Math.cos(i*.9)*18000);
   delta.subVectors(b,a);const length=delta.length();ray.set(a,delta.normalize());ray.far=length;
   const hit=ray.intersectObject(f.mesh,false)[0],entry=f.surface.entry(a,b);
   if(hit)assert.ok(Math.abs(entry-hit.distance/length)<1e-7,`ray ${i} picked a different triangle contact`);else assert.equal(entry,Infinity);
  }
  assert.equal(f.surface.heightAt(100001,0),undefined);assert.equal(f.surface.entry(new THREE.Vector3(0,-1000,0),new THREE.Vector3(0,-1001,0)),0);
 }finally{f.dispose();}
});
