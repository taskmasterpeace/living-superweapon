import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {VFX} from '../src/engine/vfx.js';
import {Particles3D} from '../src/engine/particles3d.js';
function fixture(run){const scene=new Scene(),camera=new PerspectiveCamera(60,16/9,.1,1000);camera.position.set(0,160,-30);const f=new Fighter(ROSTER.find(d=>d.id==='sol')),p=new Particles3D(scene,32),vfx=new VFX({scene,camera},p);scene.add(f.obj);Object.assign(f,{_openSky:true,flying:true,gait:'airborne',cruiseHeld:true,_burnT:2});f.pos.set(0,160,0);f.vel.set(0,0,110);try{run({f,vfx,camera});}finally{f.dispose();vfx.update(1);p.geo.dispose();p.mat.dispose();}}
function trail(f,vfx){vfx.flightWake(f);for(let i=0;i<20;i++){f.pos.z+=1;vfx.update(1/120);}return f._flightWake;}
test('non-finite fighter motion cannot poison wake geometry or retain an effect forever',()=>fixture(({f,vfx})=>{
 const wake=trail(f,vfx);f.pos.x=NaN;for(let i=0;i<60;i++)vfx.update(1/60);
 assert.ok(Array.from(wake.mesh.geometry.attributes.position.array).every(Number.isFinite),'invalid upstream position reached GPU vertices');
 assert.ok(wake.disposed,'invalid owner must expire its effect');
}));
test('removing or disposing a fighter releases wake geometry and material',()=>{
 for(const remove of [true,false])fixture(({f,vfx})=>{const wake=trail(f,vfx);let geo=false,mat=false;wake.mesh.geometry.addEventListener('dispose',()=>geo=true);wake.mesh.material.addEventListener('dispose',()=>mat=true);if(remove)f.obj.removeFromParent();else f.dispose();vfx.update(1);assert.ok(geo&&mat&&!wake.mesh.parent);assert.ok(!f._flightWake);});
});
test('a visibility change after the VFX tick still suppresses the render',()=>fixture(({f,vfx})=>{
 const wake=trail(f,vfx);f._vis=0;wake.mesh.onBeforeRender();assert.equal(wake.mesh.material.uniforms.uVisible.value,0);
}));
test('invalid owners never allocate a wake',()=>fixture(({f,vfx})=>{
 f.vel.x=NaN;vfx.flightWake(f);assert.ok(!f._flightWake);
 f.vel.x=0;f.pos.x=Infinity;vfx.flightWake(f);assert.ok(!f._flightWake);
}));

test('zero trail strength prevents allocation even when afterburner requests a wake',()=>fixture(({f,vfx})=>{
 f.def={...f.def,model:{...f.def.model,wake:{life:.62,width:.5,intensity:0}}};vfx.flightWake(f);assert.ok(!f._flightWake);assert.equal(vfx.fx.length,0);
}));
test('curved near-axial ribbons keep adjacent edges on the same side',()=>fixture(({f,vfx,camera})=>{
 vfx.flightWake(f);const wake=f._flightWake;f.cruiseHeld=false;camera.position.set(0,160,-30);
 for(let i=0;i<20;i++)wake._sample(Math.sin(i*.5)*.3,160,i*.75,1,0,0,0);
 wake.update(1/120);const p=wake.mesh.geometry.attributes.position;
 for(let i=1;i<wake.n;i++){let dot=0;for(let k=0;k<3;k++)dot+=(p.array[i*12+3+k]-p.array[i*12+k])*(p.array[(i-1)*12+3+k]-p.array[(i-1)*12+k]);assert.ok(dot>=0,`ribbon swapped edges at ${i}`);}
}));
