import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {highwallLayout,HIGHWALL_HEIGHT} from '../src/data/highwall.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {earliestOrdinaryContact} from '../src/engine/attack-interception.js';
function fixture(){const x=mainCombatFixture();x.w.ARENA=1200;x.w.cover=highwallLayout().pieces.map(p=>({...p,h:p.top,finiteBuilding:true,projectileShape:'box'}));x.w.coverAll=x.w.cover;return x;}
function trace(x,a,b){return earliestOrdinaryContact({pos:new T.Vector3(...a),radius:.01,ballistic:true,caster:x.p,life:10},new T.Vector3(...b),1,x.g);}
test('authored Highwall wall and roof agree for native sight and ordinary projectile contact',()=>{
 const x=fixture();try{
 const checks=[{a:[-310,0,-220],b:[-270,0,-220],visible:false,hit:'spine-'},{a:[-310,HIGHWALL_HEIGHT+4,-220],b:[-270,HIGHWALL_HEIGHT+4,-220],visible:true},{a:[-40,0,-160],b:[-16,0,-160],visible:true},{a:[-28,0,-160],b:[-28,35,-160],visible:false,hit:'roof-'}];
 for(const {a,b,visible,hit} of checks){assert.equal(x.g.canSee({pos:new T.Vector3(...a)},{pos:new T.Vector3(...b)}),visible,JSON.stringify({a,b}));const result=trace(x,[a[0],a[1]+5,a[2]],[b[0],b[1]+5,b[2]]);if(hit){assert.equal(result?.kind,'cover');assert.ok(result.target.id.startsWith(hit));}else assert.equal(result,null);}
 }finally{x.close();}
});
for(const hz of [30,60,120])for(const air of [false,true])test(`native ${air?'flyer crosses over':'walker stops at'} authored wall at ${hz}Hz`,()=>{
 const x=fixture();try{const f=x.p;f._openSky=true;f._altTag=()=>{};f.pos.set(-310,air?HIGHWALL_HEIGHT+15:0,-220);f.obj.position.copy(f.pos);f.flying=air;f.gait=air?'airborne':'grounded';f.ki=f.maxKi=1000;f.faceDir(1,0);
 for(let i=0;i<hz*2;i++){const dt=1/hz;x.g.time+=dt;x.g.dt=dt;f.move(new T.Vector3(1,0,0),dt);f.update(dt,x.g);}
 if(air)assert.ok(f.pos.x>-280,`flyer stopped ${f.pos.toArray()}`);else assert.ok(f.pos.x<-289,`walker crossed wall ${f.pos.toArray()}`);
 }finally{x.close();}
});
