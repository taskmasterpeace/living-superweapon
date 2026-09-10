import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';

function fixture(flags={}){
 const game={scene:new THREE.Scene()},caster={team:1,...flags};
 const shot=new Projectiles(game).spawnProjectile(caster,{pos:new THREE.Vector3(),vel:new THREE.Vector3(0,0,170),
  radius:.55,damage:4,blast:2.2,bullet:true,ballistic:true,weapon:'rifle'});
 return{shot,game,close:()=>shot._dispose(game)};
}
for(const flags of [{_openSky:true},{_frontlineClone:true}])test(`third-person rifle uses slender metal and tracer, not the city-sized rod (${Object.keys(flags)[0]})`,()=>{
 const f=fixture(flags);try{
  const [slug,tracer]=f.shot.obj.children;
  f.shot.obj.updateMatrixWorld(true);
  const slugSize=new THREE.Box3().setFromObject(slug).getSize(new THREE.Vector3());
  const tracerSize=new THREE.Box3().setFromObject(tracer).getSize(new THREE.Vector3());
  assert.ok(slugSize.x<=.14&&slugSize.y<=.14&&slugSize.z<=.55,'compact physical bullet silhouette');
  assert.ok(tracerSize.x<=.14&&tracerSize.y<=.14&&tracerSize.z>=9,'thin readable motion streak');
  assert.equal(slug.material.isMeshStandardMaterial,true);assert.equal(tracer.material.blending,THREE.NormalBlending);
  assert.equal(f.shot.light,null);assert.equal(f.shot.radius,.55);assert.equal(f.shot.damage,4);
  assert.deepEqual(f.shot.vel.toArray(),[0,0,170]);
 }finally{f.close();}
});
test('city retains its readable overhead bullet and both views reuse the same resources',()=>{
 const city=fixture(),field=fixture({_frontlineClone:true});try{
  const [slug,tracer]=city.shot.obj.children;
  assert.deepEqual(slug.scale.toArray(),[1,1,1]);assert.equal(tracer.scale.x,1);
  for(let i=0;i<2;i++){
   assert.equal(city.shot.obj.children[i].geometry,field.shot.obj.children[i].geometry);
   assert.equal(city.shot.obj.children[i].material,field.shot.obj.children[i].material);
  }
  let disposed=0;slug.material.addEventListener('dispose',()=>disposed++);city.close();field.close();assert.equal(disposed,0);
  assert.equal(city.game.scene.children.length,0);assert.equal(field.game.scene.children.length,0);
 }finally{city.close();field.close();}
});
