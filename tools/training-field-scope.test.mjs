import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {TrainingFieldScope} from '../src/engine/training-field-scope.js';
import {TimeFields,GravityZones} from '../src/engine/systems.js';

test('training fields cannot affect desert fields; leaving disposes practice fields only', () => {
  const x=mainCombatFixture({mode:'powerworld'});
  try {
    const {g,p}=x, pos=new Vector3();
    g.timeFields=new TimeFields(g);g.gravityZones=new GravityZones(g);
    const field=g.timeFields.add(pos,30,10,.25,null);
    const zone=g.gravityZones.add(pos,30,10,-1,null);zone.warn=0;
    const original=g.timeFields.list, gravity=g.gravityZones.list;
    const scope=new TrainingFieldScope(g);
    assert.equal(g.timeFields.scaleFor(p),1);
    assert.equal(g.gravityZones.gravityFor(p),1);
    assert.equal(field.mesh.visible,false);
    g.timeFields.update(1);g.gravityZones.update(1);
    assert.equal(field.t,10);assert.equal(zone.t,10);
    const practice=g.timeFields.add(pos,30,10,.25,null);
    const practiceGravity=g.gravityZones.add(pos,30,10,-1,null);practiceGravity.warn=0;
    assert.equal(g.timeFields.scaleFor(p),.25);
    assert.equal(g.gravityZones.gravityFor(p),-1);
    let disposed=0;practice.mesh.geometry.addEventListener('dispose',()=>disposed++);
    scope.close();scope.close();
    assert.equal(disposed,1);
    assert.equal(practice.mesh.parent,null);
    assert.equal(g.timeFields.list,original);
    assert.equal(g.gravityZones.list,gravity);
    assert.equal(field.mesh.visible,true);
    assert.equal(g.timeFields.scaleFor(p),.25);
    assert.equal(g.gravityZones.gravityFor(p),-1);
    assert.equal(g.gravityZones.list.includes(practiceGravity),false);
  } finally {x.close();}
});
