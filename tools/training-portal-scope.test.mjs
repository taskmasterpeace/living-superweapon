import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {TrainingPortalScope} from '../src/engine/training-portal-scope.js';

test('training portal cannot complete a desert half-pair; closing restores it and disposes training doors',()=>{
  const x=mainCombatFixture({mode:'powerworld'});
  try {
    const {g,p}=x;
    g.portals=[];g._openPair=null;
    g.placePortal(p,{range:80,dur:20});
    const desert=g.portals, original=g._openPair;
    assert.ok(original);assert.equal(original.b,null);
    const scope=new TrainingPortalScope(g);
    assert.equal(original.a.grp.visible,false);
    g.placePortal(p,{range:80,dur:20});
    const training=g._openPair;
    assert.notEqual(training,original);assert.equal(original.b,null);
    g.placePortal(p,{range:80,dur:20});
    assert.ok(training.b);
    let disposed=0;
    training.a.ring.geometry.addEventListener('dispose',()=>disposed++);
    scope.close();scope.close();
    assert.equal(g.portals,desert);assert.equal(g._openPair,original);
    assert.equal(original.a.grp.visible,true);assert.equal(original.b,null);
    assert.equal(training.a.grp.parent,null);assert.equal(training.b.grp.parent,null);
    assert.equal(disposed,1);
    g.placePortal(p,{range:80,dur:20});
    assert.ok(original.b);assert.equal(g.portals.length,1);
    g._closePair(original);
  } finally {x.close();}
});
