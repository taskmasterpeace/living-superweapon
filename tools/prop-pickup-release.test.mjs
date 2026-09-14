import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {previewPropThrow} from '../src/engine/thrown-prop-contact.js';
function rock(x,{y=2,z=4,w=.1}={}){const mesh=new T.Mesh(new T.DodecahedronGeometry(2),new T.MeshBasicMaterial());mesh.position.set(0,y,z);x.g.scene.add(mesh);const ref={x:0,z,w,s:2,mesh};x.w.rocks=[ref];return ref;}
test('flying pickup requires actual vertical proximity to prop',()=>{const x=mainCombatFixture();try{const r=rock(x);x.p.pos.y=90;x.p.flying=true;assert.ok(x.g.propInReach(x.p)===null,'must not hoist a ground prop from 90 units above it');x.p.pos.y=7;assert.equal(x.g.propInReach(x.p)?.ref,r,'low flying pickup remains reachable');}finally{x.close();}});
test('lift capacity still rejects a nearby overweight prop',()=>{const x=mainCombatFixture();try{rock(x,{w:1e12});assert.equal(x.g.propInReach(x.p),null);assert.equal(x.p._tooHeavyProp.kind,'rock');}finally{x.close();}});
test('throw and its preview begin at the carried mesh without muzzle teleport',()=>{const x=mainCombatFixture({mode:'powerworld'});try{const r=rock(x);const mesh=r.mesh;mesh.position.set(1,16,2);x.p._carry={kind:'rock',mesh,w:.1,spd:70,ratio:2,size:2};x.p._openSky=true;x.g.heroYell=()=>{};const release=mesh.position.clone(),cue=previewPropThrow(x.p,x.g);assert.ok(cue.points[0].distanceTo(release)<1e-8,'prediction starts at actual payload');x.g.throwProp(x.p);assert.ok(mesh.position.distanceTo(release)<1e-8,'release cannot jump to muzzle');}finally{x.close();}});


test('native low-flight pickup initializes the payload before immediate release',()=>{const x=mainCombatFixture({mode:'powerworld'});try{const r=rock(x);x.p.pos.y=7;x.p.flying=true;x.p._openSky=true;x.g.heroYell=()=>{};assert.equal(x.g.grabProp(x.p),true);const c=x.p._carry;assert.equal(r.carried,true);assert.equal(r.mesh.visible,false);assert.ok(c.mesh.position.y>x.p.pos.y+10,'new carry must not flash at origin');const release=c.mesh.position.clone();x.g.throwProp(x.p);assert.ok(c.mesh.position.distanceTo(release)<1e-8);assert.equal(x.p._carry,null);}finally{x.close();}});
