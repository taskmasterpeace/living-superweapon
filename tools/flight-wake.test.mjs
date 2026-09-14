import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {VFX} from '../src/engine/vfx.js';
import {Particles3D} from '../src/engine/particles3d.js';
function fixture(run){const scene=new Scene(),camera=new PerspectiveCamera(60,16/9,.1,1000);camera.position.set(0,160,-30);const f=new Fighter(ROSTER.find(d=>d.id==='sol')),p=new Particles3D(scene,32),vfx=new VFX({scene,camera},p);scene.add(f.obj);Object.assign(f,{_openSky:true,flying:true,gait:'airborne',cruiseHeld:true,_burnT:2});f.pos.set(0,160,0);f.vel.set(0,0,110);try{run({f,vfx,camera});}finally{f.dispose();vfx.update(1);p.geo.dispose();p.mat.dispose();}}
function trail(f,vfx){vfx.flightWake(f);for(let i=0;i<20;i++){f.pos.z+=1;vfx.update(1/120);}return f._flightWake;}

test('newest near-body wake remains readable after a long flight',()=>fixture(({f,vfx})=>{
 const wake=trail(f,vfx);for(let i=0;i<300;i++){f.pos.z+=2;vfx.update(1/120);}
 const alpha=wake.mesh.geometry.attributes.aAlpha;assert.ok(alpha.getX((wake.n-1)*4)>.15,'near-body wake was tapered away');
}));
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

test('authored runner trail follows the feet and expires after lost control',()=>fixture(({f,vfx})=>{
 f.def={...f.def,movementTrail:{life:.24,width:.16,intensity:.68}};
 f.flying=false;f.gait='grounded';f.pos.set(0,0,0);f.cruiseHeld=false;
 vfx.flightWake(f);const wake=f._flightWake;
 for(let i=0;i<60;i++){f.pos.z+=110/60;f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);vfx.update(1/60);}
 assert.ok(wake.n>2&&wake.mesh.visible,'ground running must leave a visible ribbon');
 const tail=(wake.n-1)*6;
 assert.ok(Math.abs(wake.history[tail+2]-f.pos.z)<5,'newest sample must stay near feet');
 const p=wake.mesh.geometry.attributes.position;
 const edgeWidth=Math.hypot(p.getX(1)-p.getX(0),p.getY(1)-p.getY(0),p.getZ(1)-p.getZ(0));
 assert.ok(edgeWidth<.6,'runner profile must stay narrow');
 f.launchT=2;for(let i=0;i<60;i++)vfx.update(1/60);
 assert.ok(wake.disposed,'uncontrolled body must stop emitting and retire trail');
}));


test('airborne ribbons leave clear space behind both boots and stay short at high gears',()=>{
 for(const speed of [55,110,400])for(const hz of [30,60,120])fixture(({f,vfx})=>{
  f.vel.set(0,0,speed);vfx.flightWake(f);const wake=f._flightWake;
  for(let i=0;i<hz;i++){
   f.pos.z+=speed/hz;f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);vfx.update(1/hz);
  }
  const left=new Vector3(),right=new Vector3();
  f.parts.legL.userData.boot.getWorldPosition(left);f.parts.legR.userData.boot.getWorldPosition(right);
  const bootZ=(left.z+right.z)*.5, newest=(wake.n-1)*6;
  assert.ok(wake.n>1&&wake.mesh.visible,'flight ribbon should remain visible');
  assert.ok(bootZ-wake.history[newest+2]>=2.99,'ribbon must leave boot clearance');
  assert.ok(bootZ-wake.history[newest+2]<3.8,'clearance must not drift with frame rate');
  assert.ok(wake.history[newest+2]-wake.history[2]<=33,'higher gear must not produce an oversized ribbon');
 });
});
