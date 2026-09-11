import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {World} from '../src/engine/world.js';
import {installFrontlineGround,authorFrontlineRelief,restoreFrontlineGround} from '../src/engine/frontline-ground.js';
const world=Object.create(World.prototype);Object.assign(world,{ARENA:32000});
const stage={g:{world},group:new T.Group(),_cover:[]},material=new T.MeshBasicMaterial();
installFrontlineGround(stage,material,900,6800,50000);authorFrontlineRelief(stage);
const far=stage.group.getObjectByName('frontline-distant-ground');
after(()=>{restoreFrontlineGround(stage);stage.group.traverse(o=>o.geometry?.dispose());material.dispose();});
function camera(x,y,z,tx,ty,tz,fov=58){const c=new T.PerspectiveCamera(fov,1672/941,.6,4200);c.position.set(x,y,z);c.lookAt(tx,ty,tz);c.updateMatrixWorld(true);return c;}

test('exterior renders a camera-selected detail budget rather than the whole flight-space mesh',()=>{
 assert.ok(world._terrainDetail,'installed exterior requires a render-detail controller');
 const c=camera(0,160,1000,0,80,2500),detail=world._terrainDetail;
 detail.update(c,941);assert.ok(far.geometry.drawRange.count<far.geometry.index.count*.65,'near view still submits the entire 50km-radius mesh');
 assert.ok(detail.stats.levels[0]>0,'near ground must remain full detail');
 assert.ok(detail.stats.culled>0,'distant/off-view geometry must be excluded');
 assert.ok(detail.stats.levels[1]+detail.stats.levels[2]>0,'distance detail levels must actually be exercised');
 const ray=new T.Raycaster(new T.Vector3(0,500,1500),new T.Vector3(0,-1,0));
 far.updateWorldMatrix(true,true);const hit=ray.intersectObject(far,false)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-world.heightAt(0,1500))<1e-5);
});

test('coarse patch variants retain every full-detail border segment',()=>{
 const detail=world._terrainDetail;assert.ok(detail);
 for(const patch of detail.patches)for(const variant of patch.variants){
  const edges=new Set();for(let i=0;i<variant.indices.length;i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){const x=variant.indices[i+a],y=variant.indices[i+b];edges.add(`${Math.min(x,y)},${Math.max(x,y)}`);}
  for(const [x,y]of patch.border)assert.ok(edges.has(`${Math.min(x,y)},${Math.max(x,y)}`),'LOD opens a crack along a shared border');
 }
});

test('every detail variant covers its patch without reversed or missing triangle area',()=>{
 const p=far.geometry.attributes.position,detail=world._terrainDetail;assert.ok(detail);
 function area(indices){let sum=0;for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2];const value=(p.getX(b)-p.getX(a))*(p.getY(c)-p.getY(a))-(p.getY(b)-p.getY(a))*(p.getX(c)-p.getX(a));assert.ok(value>0,'coarse terrain has a flipped/degenerate triangle');sum+=value;}return sum;}
 for(const patch of detail.patches){const full=area(patch.variants[0].indices);for(const v of patch.variants.slice(1))assert.ok(Math.abs(area(v.indices)-full)<full*1e-8,'LOD changed the footprint of the patch');}
});

test('ordinary camera drift reuses selection buffers and avoids unchanged GPU index uploads',()=>{
 const detail=world._terrainDetail,c=camera(0,160,1000,0,80,2500);assert.ok(detail);
 detail.update(c,941);const buffer=detail.cameraCache.get(c.uuid).indices,version=far.geometry.index.version;
 c.position.x+=.001;c.updateMatrixWorld(true);detail.update(c,941);
 assert.equal(detail.cameraCache.get(c.uuid).indices,buffer,'camera motion allocated another full terrain index');
 assert.equal(far.geometry.index.version,version,'unchanged patch selection uploaded the full index again');
});

test('zoom and alternating cameras do not alter physical terrain or grow unbounded render caches',()=>{
 const detail=world._terrainDetail;assert.ok(detail);const heights=[world.heightAt(0,1500),world.heightAt(3000,-1200),world.heightAt(32000,32000)];
 const wide=camera(0,400,0,0,100,3000),zoom=camera(0,400,0,0,100,3000,12);
 detail.update(wide,941);const wideLevels=detail.stats.levels.slice(),wideSelection=detail.cameraCache.get(wide.uuid).selection.slice();detail.update(zoom,941);
 const scopeSelection=detail.cameraCache.get(zoom.uuid).selection;
 assert.ok(wideSelection.some((level,i)=>level>0&&scopeSelection[i]===0),'scope must restore full detail on at least one previously simplified visible patch');
 assert.ok(detail.stats.levels[0]>0);assert.ok(detail.stats.maxPixelError<=.75,'zoom admits visibly distorted coarse terrain');
 for(let i=0;i<20;i++)detail.update(camera(i*500,200,1000,0,0,2000),941);
 assert.ok(detail.cameraCache.size<=3);assert.deepEqual([world.heightAt(0,1500),world.heightAt(3000,-1200),world.heightAt(32000,32000)],heights);
 detail.update(wide,941);assert.deepEqual(detail.stats.levels,wideLevels);
});
