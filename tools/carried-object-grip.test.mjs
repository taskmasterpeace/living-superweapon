import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';import {animateCarriedObjectGrip} from '../src/engine/held-grip-pose.js';
test('carried box directs both real arms to its underside without moving the payload',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='vega'));f._openSky=true;f._animate(0);
 const mesh=new T.Mesh(new T.BoxGeometry(6,2,3));mesh.position.set(0,10,0);f._carry={mesh};const before=f.parts.armR.quaternion.clone(),position=mesh.position.clone();
 assert.equal(animateCarriedObjectGrip(f),true);assert.ok(before.angleTo(f.parts.armR.quaternion)>.3);assert.ok(position.equals(mesh.position));
 assert.ok(f._carry.gripBounds.min.y===-1);const cached=f._carry.gripBounds;animateCarriedObjectGrip(f);assert.equal(f._carry.gripBounds,cached);
 for(const arm of [f.parts.armL,f.parts.armR]){arm.updateWorldMatrix(true,true);assert.ok(arm.children[2].getWorldPosition(new T.Vector3()).y>arm.getWorldPosition(new T.Vector3()).y,'hand did not reach upward');}
 f._carry=null;mesh.geometry.dispose();mesh.material.dispose();f.dispose();
});
