import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';import {anchorStatusIndicators} from '../src/engine/status-indicator-anchor.js';
test('status indicators follow final head translation without changing body pose',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='vega'));f.stunT=1;f.sleepT=1;f._animate(0);anchorStatusIndicators(f);
 const star=f.parts.stars[0].position.clone(),sleep=f.parts.zzz[0].position.clone();
 f.parts.head.position.x+=3;f.parts.head.position.y-=4;f.obj.updateMatrixWorld(true);anchorStatusIndicators(f);
 assert.ok(f.parts.stars[0].position.distanceTo(star.add(new T.Vector3(3,-4,0)))<1e-6);
 assert.ok(f.parts.zzz[0].position.distanceTo(sleep.add(new T.Vector3(3,-4,0)))<1e-6);f.dispose();
});
