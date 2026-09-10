import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BeamCurve} from '../src/engine/beam-curve.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

function turnAngles(points,count){
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let max=0;
 for(let i=1;i<count-1;i++){
  a.fromArray(points,(i-1)*3);b.fromArray(points,i*3);c.fromArray(points,(i+1)*3);
  a.sub(b);c.sub(b);if(a.lengthSq()>1e-9&&c.lengthSq()>1e-9)max=Math.max(max,Math.PI-a.angleTo(c));
 }
 return max;
}
function distanceToPath(point,path,count){
 let distance=Infinity;const a=new THREE.Vector3(),ab=new THREE.Vector3(),ap=new THREE.Vector3();
 for(let i=1;i<count;i++){
  a.fromArray(path,(i-1)*3);ab.fromArray(path,i*3).sub(a);ap.copy(point).sub(a);
  const t=THREE.MathUtils.clamp(ap.dot(ab)/(ab.lengthSq()||1),0,1);distance=Math.min(distance,point.distanceTo(a.addScaledVector(ab,t)));
 }
 return distance;
}

for(const radius of [.35,1.6,4])test(`a smooth traveling arc renders rounded joins at radius ${radius}`,()=>{
 // Hand-constructed quarter circle, sampled every15 degrees. The visible
 // centerline must spread each physical join over smaller angular steps.
 const path=new Float32Array(21);for(let i=0;i<7;i++){const a=i*Math.PI/12;path.set([40*Math.sin(a),10,40*(1-Math.cos(a))],i*3);}
 const before=path.slice(),curve=new BeamCurve(7).update(path,7,new THREE.Vector3(1,0,0),radius);
 const max=turnAngles(curve.points,curve.count);
 assert.ok(max<Math.PI/18,`visible bend is still a ${max*180/Math.PI} degree corner`);
 assert.deepEqual(path,before,'smoothing cannot move the physical stream');
 const p=new THREE.Vector3();let deviation=0;
 for(let i=0;i<curve.count;i++)deviation=Math.max(deviation,distanceToPath(p.fromArray(curve.points,i*3),path,7));
 assert.ok(deviation<=radius*.251,`centerline escapes the collision corridor by ${deviation}`);
 assert.ok(new THREE.Vector3().fromArray(curve.points).distanceTo(new THREE.Vector3().fromArray(path))<1e-6);
 assert.ok(new THREE.Vector3().fromArray(curve.points,(curve.count-1)*3).distanceTo(new THREE.Vector3().fromArray(path,18))<1e-5);
});

for(const radius of [.35,1.6,4])test(`a right-angle beam bend is rounded without cutting outside its hit corridor (${radius})`,()=>{
 const path=Float32Array.from([0,10,0,0,10,20,20,10,20,40,10,20]),curve=new BeamCurve(4).update(path,4,new THREE.Vector3(0,0,1),radius);
 const max=turnAngles(curve.points,curve.count);assert.ok(max<Math.PI/12,`right-angle visual join ${max*180/Math.PI} degrees`);
 const p=new THREE.Vector3();for(let i=0;i<curve.count;i++)assert.ok(distanceToPath(p.fromArray(curve.points,i*3),path,4)<radius*.251);
});

function beamFixture(options={}){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
 f._openSky=true;f._game=combat.game;f.pos.set(0,40,0);f.aim3.set(0,0,1);scene.add(f.obj);f._animate(1/60);
 const beam=combat.game.projectiles.spawnBeam(f,{radius:1.6,tipSpeed:150,maxLen:120,dps:1,...options});beam.resolveLaunch();
 return {beam,f,combat,close(){combat.dispose();f.dispose();}};
}

test('adaptive beam geometry draws only the live smoothed stream, not its worst-case reserve',()=>{
 const {beam:b,close}=beamFixture();try{
  b.pn=44;for(let i=0;i<b.pn;i++)b.path.set([0,40,i*3],i*3);
  b._sweep(b._coreGeo,1,1);
  assert.ok(Number.isFinite(b._coreGeo.drawRange.count)&&b._coreGeo.drawRange.count<=44*8*6*4,'straight stream draws the maximum corner reserve');
  const vertexCount=b._coreGeo.drawRange.count/(b.RADIAL*6)+1;
  assert.ok(vertexCount>=2,'live stream disappeared');
 }finally{close();}
});

test('beam width grows with traveled distance, not the density of bend samples',()=>{
 const {beam:b,close}=beamFixture();try{
  b.sustaining=false;b.pn=4;b.path.set([0,40,0,0,40,1,0,40,50,0,40,100]);b._sweep(b._coreGeo,1,1);
  const p=b._coreGeo.attributes.position,point=new THREE.Vector3();let measured=null;
  for(let ring=0;ring<p.count/b.RADIAL;ring++){
   const center=new THREE.Vector3();for(let r=0;r<b.RADIAL;r++)center.add(point.fromBufferAttribute(p,ring*b.RADIAL+r));center.multiplyScalar(1/b.RADIAL);
   if(Math.abs(center.z-50)>.001)continue;
   measured=0;for(let r=0;r<b.RADIAL;r++)measured=Math.max(measured,point.fromBufferAttribute(p,ring*b.RADIAL+r).distanceTo(center));break;
  }
  assert.ok(measured!==null,'midpoint must remain on the straight beam');
  assert.ok(Math.abs(measured-.9175)<1e-4,`halfway shaft radius ${measured}, expected .9175`);
 }finally{close();}
});

function assertExterior(geo){
 const p=geo.attributes.position,n=geo.attributes.normal,index=geo.index;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),sum=new THREE.Vector3(),v=new THREE.Vector3();
 const centers=new Float32Array(p.count*3/8),center=new THREE.Vector3(),radial=new THREE.Vector3();
 for(let ring=0;ring<p.count/8;ring++){center.set(0,0,0);for(let j=0;j<8;j++)center.add(v.fromBufferAttribute(p,ring*8+j));center.multiplyScalar(1/8).toArray(centers,ring*3);}
 let inward=0,weightedInward=0,first=null;
 for(let i=0;i<geo.drawRange.count;i+=3){
  const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
  a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);sum.set(0,0,0);
  for(const id of ids)sum.add(v.fromBufferAttribute(n,id));
  radial.copy(a).add(b).add(c);for(const id of ids)radial.sub(center.fromArray(centers,Math.floor(id/8)*3));
  const face=b.sub(a).cross(c.sub(a)),dot=face.dot(sum);
  if(face.dot(radial)<-1e-7)weightedInward++;
  if(dot<-1e-5){inward++;first||={ids,dot};}
 }
 assert.equal(inward,0,`rounded tube folds through its own inner surface: ${JSON.stringify(first)}`);
 assert.equal(weightedInward,0,'tube triangles point into their weighted centerline, not just an optical normal field');
}

for(const degrees of [90,135,170,179.9,180])test(`wide ${degrees} degree beam corners retain an exterior surface`,()=>{
 const {beam:b,close}=beamFixture();try{
  const a=degrees*Math.PI/180;b.sustaining=false;b.pn=4;
  b.path.set([0,40,0,0,40,20,20*Math.sin(a),40,20+20*Math.cos(a),40*Math.sin(a),40,20+40*Math.cos(a)]);
  b._sweep(b._coreGeo,b.radius,1);assertExterior(b._coreGeo);
 }finally{close();}
});

test('an authored high-steer beam survives reversal before its next physical packet',()=>{
 const {beam:b,f,combat,close}=beamFixture({maxLen:300,steer:100});try{
  f.aim3.set(0,0,-1);b.update(1/30,combat.game);
  assert.ok(b.dir.z<-.99,'actual source did not perform the near-reversal');
  assert.ok(b.path[5]>b.path[2],'older packet should still be traveling forward');
  assertExterior(b._coreGeo);assertExterior(b._glowGeo);
 }finally{close();}
});

for(const degrees of [9,25,90])test(`rendered chords, not just their endpoints, stay in the ${degrees} degree hit corridor`,()=>{
 const a=degrees*Math.PI/180,radius=.35,path=Float32Array.from([0,40,0,20,40,0,20+20*Math.cos(a),40,20*Math.sin(a)]);
 const curve=new BeamCurve(3).update(path,3,new THREE.Vector3(1,0,0),radius),p=new THREE.Vector3(),left=new THREE.Vector3(),right=new THREE.Vector3();
 let max=0;
 for(let i=1;i<curve.count;i++){
  left.fromArray(curve.points,(i-1)*3);right.fromArray(curve.points,i*3);
  for(let j=0;j<=20;j++)max=Math.max(max,distanceToPath(p.lerpVectors(left,right,j/20),path,3));
 }
 assert.ok(max<=radius*.251,`rendered chord is ${max} away from physical energy`);
});

test('duplicate muzzle packets retain the emission bend and a full cross-section',()=>{
 const {beam:b,close}=beamFixture();try{
  b.dir.set(0,0,1);b.pn=3;b.path.set([0,40,0,0,40,0,20,40,0]);b._sweep(b._coreGeo,1,1);
  assert.ok(b._curve.points[5]>0,'duplicate muzzle packet consumed the nozzle tangent');
  const n=b._coreGeo.attributes.normal;
  for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-4,'transported ring basis collapsed');
 }finally{close();}
});

for(const [degrees,length]of [[30,.1],[135,5],[170,5],[179,5],[180,5]])test(`sustaining nozzle at ${degrees} degrees / ${length} units does not invert its opening`,()=>{
 const {beam:b,close}=beamFixture();try{
  const angle=degrees*Math.PI/180;b.dir.set(Math.sin(angle),0,Math.cos(angle));b.pn=2;b.path.set([0,40,0,0,40,length]);
  b._sweep(b._coreGeo,b.radius*b.build.coreR,1);assertExterior(b._coreGeo);
  b._sweep(b._glowGeo,b.radius*1.5,b.build.flare);assertExterior(b._glowGeo);
 }finally{close();}
});

for(const hz of [30,60,120])test(`actual traveling core and sheath remain finite and exterior through moving 3D aim at ${hz} Hz`,()=>{
 const {beam:b,f,combat,close}=beamFixture();try{
  let rendered=0;
  for(let i=0;i<hz*3;i++){
   const time=i/hz,angle=time<1?time*1.4:time<2?Math.PI:Math.PI+(time-2)*2;
   f.pos.x=Math.sin(time*2)*8;f.aim3.set(Math.sin(angle),Math.sin(time*3)*.6,Math.cos(angle)).normalize();f.ki=f.maxKi;
   f._animate(1/hz);combat.game.time=time;b.update(1/hz,combat.game);
   assert.ok(b._curve.count<=b._curve.capacity);
   for(const g of [b._coreGeo,b._glowGeo]){
    assertExterior(g);assert.ok(g.attributes.position.array.every(Number.isFinite));
    for(const attribute of Object.values(g.attributes))assert.ok(attribute.updateRanges[0].count<=attribute.array.length);
   }
   if(b._coreGeo.drawRange.count>0)rendered++;
  }
  assert.ok(rendered>hz*2,'beam must actually sustain during the inspection');
 }finally{close();}
});
