import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {World} from '../src/engine/world.js';
test('cutaway supports nested imported vehicle groups and excludes noCam hulls',()=>{
 const root=new T.Group(),nested=new T.Group(),m=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());nested.add(m);root.add(nested);
 const c={mesh:root,top:80},w={camera:{position:new T.Vector3()},cover:[c],interiors:[],_segBox3:()=>true,_updateCanopyCut:()=>{}};
 World.prototype.updateOcclusion.call(w,new T.Vector3(),.016);assert.equal(w._fades.get(c).mats.length,1);
 const excluded={mesh:root,top:80,noCam:true};w.cover.push(excluded);World.prototype.updateOcclusion.call(w,new T.Vector3(),.016);assert.equal(w._fades.has(excluded),false);
 m.geometry.dispose();for(const [mesh,original]of w._fades.get(c).mats){mesh.material.dispose();original.dispose();}
});
