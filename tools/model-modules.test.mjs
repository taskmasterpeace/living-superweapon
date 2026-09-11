import test from 'node:test';
import assert from 'node:assert/strict';
import {figure} from '../src/engine/figure.js';
import {ROSTER} from '../src/data/characters.js';
import {anatomyGeometry} from '../src/engine/hero-rig.js';
import {Vector3,Box3,Mesh,MeshBasicMaterial,Raycaster} from 'three';
// These are procedural geometry oracles; weighted-skin surface checks live in
// hero-skin tests and must not probe the hidden procedural face underneath it.
const sourceSol=ROSTER.find(d=>d.id==='sol');
const sol={...sourceSol,model:{...sourceSol.model,body:'procedural',surface:'standard'}};

test('open palms keep thumbs on the anatomical inside without adding finger draw calls',()=>{
 const p=figure(sol),v=new Vector3();
 for(const [arm,side] of [[p.armL,-1],[p.armR,1]]){
  const hand=arm.children[2],box=new Box3();hand.morphTargetInfluences[0]=1;
  for(let i=0;i<hand.geometry.attributes.position.count;i++)box.expandByPoint(hand.getVertexPosition(i,v));
  const inside=side<0?box.max.x:-box.min.x,outside=side<0?-box.min.x:box.max.x;
  assert.ok(inside>outside+.1,'thumb belongs toward the other hand, not beyond the little finger');
  assert.equal(hand.geometry.groups.length,0,'one material draw, not separate digit groups');
  let insideReach=0,outsideReach=0;
  for(let i=0;i<hand.geometry.attributes.position.count;i++){
   hand.getVertexPosition(i,v);
   if(Math.abs(v.x)>.17&&Math.abs(v.x)<.3){
    if(v.x*side<0)insideReach=Math.max(insideReach,-v.z);else outsideReach=Math.max(outsideReach,-v.z);
   }
  }
  assert.ok(insideReach>outsideReach+.04,'index finger must extend farther than the little finger on both hands');
 }
 p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
});
test('elliptical loft closes its shading seam',()=>{const g=anatomyGeometry([[-1,1,.6],[0,1.3,.8],[1,.5,.4]]);const n=g.attributes.normal;for(let r=0;r<3;r++)for(const axis of ['X','Y','Z'])assert.ok(Math.abs(n['get'+axis](r*13)-n['get'+axis](r*13+12))<1e-6);g.dispose();});
test('body lofts have solid end surfaces rather than visible holes',()=>{
 const mesh=new Mesh(anatomyGeometry([[-1,.8,.6],[0,1,.8],[1,.6,.4]]),new MeshBasicMaterial());mesh.updateMatrixWorld(true);
 for(const side of [-1,1]){
  const hits=new Raycaster(new Vector3(.25,side*3,0),new Vector3(0,-side,0)).intersectObject(mesh);
  assert.ok(hits.length&&Math.abs(hits[0].point.y-side)<1e-6,'ray through end must hit the cap');
  assert.ok(hits[0].face.normal.y*side>.99,'cap faces outward');
 }
 mesh.geometry.dispose();mesh.material.dispose();
});
test('human eye center has a readable pupil without moving optic sockets',()=>{
 const p=figure(sol);p.g.updateMatrixWorld(true);
 for(const eye of [p.eyeL,p.eyeR]){
  const at=eye.getWorldPosition(new Vector3());
  const center=new Raycaster(at.clone().add(new Vector3(0,0,4)),new Vector3(0,0,-1)).intersectObject(eye,true)[0];
  const edge=new Raycaster(at.clone().add(new Vector3(.14,0,4)),new Vector3(0,0,-1)).intersectObject(eye,true)[0];
  const brightness=hit=>{const c=hit?.object.material.color;return c?c.r*.2126+c.g*.7152+c.b*.0722:0;};
  assert.ok(center&&edge&&brightness(center)<brightness(edge)*.5,'dark pupil must be visible against the eye white');
  assert.equal(eye.position.z,.65,'optic launch anchor remains stable');
 }
 p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
});
test('eyelid silhouettes mirror across the face',()=>{
 const p=figure(sol),left=p.eyeL.geometry.attributes.position,right=p.eyeR.geometry.attributes.position;
 for(let i=0;i<left.count;i++){
  const mirrored=new Vector3(-left.getX(i),left.getY(i),left.getZ(i));let gap=Infinity;
  for(let j=0;j<right.count;j++)gap=Math.min(gap,mirrored.distanceTo(new Vector3(right.getX(j),right.getY(j),right.getZ(j))));
  assert.ok(gap<1e-6,'left and right eyelids must have mirrored inner/outer corners');
 }
 p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
});
test('the facial bridge presents an outward surface, not a culled back face',()=>{
 const p=figure(sol);p.g.updateMatrixWorld(true);
 const at=p.head.localToWorld(new Vector3(0,-.1,3));
 const hits=new Raycaster(at,new Vector3(0,0,-1)).intersectObject(p.head,true);
 assert.equal(hits[0]?.object.name,'face-bridge','the shaped nose must be visible ahead of the head surface');
 p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
});
test('martial costume has an inset neckline instead of raised decorative bars',()=>{
 const p=figure(ROSTER.find(d=>d.id==='kano'));p.g.updateMatrixWorld(true);
 for(const y of [.2,.5,.8,1.12,1.25]){
  const point=p.torso.localToWorld(new Vector3(0,y,3));
  const hit=new Raycaster(point,new Vector3(0,0,-1)).intersectObject(p.torso,true).find(h=>h.object.visible);
  assert.equal(hit?.object.material,p.mats.suit2,`neckline at ${y} must not intersect the chest`);
 }
 assert.equal(p.pelvis.material,p.mats.suit,'trousers stay continuous beneath the sash');
 assert.equal(p.armL.children.length,3);assert.equal(p.armR.children.length,3);
 p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
});
test('procedural neck and open collars leave scaled faces visible from the front',()=>{
 for(const id of ['sol','kano','vega','aurum','rime']){
  const def=ROSTER.find(d=>d.id===id),p=figure({...def,model:{...def.model,body:'procedural',surface:'standard'}});p.g.updateMatrixWorld(true);
  for(const y of [-.49,.05]){
   const at=p.head.localToWorld(new Vector3(0,y,4));
   const hit=new Raycaster(at,new Vector3(0,0,-1)).intersectObjects([p.head,p.torso],true)[0];
   let node=hit?.object;while(node&&node!==p.head)node=node.parent;
   assert.ok(node===p.head,`${id}: face at ${y} is hidden by chest construction`);
  }
  const chest=p.torso.localToWorld(new Vector3(0,1.26,3));
  const chestHit=new Raycaster(chest,new Vector3(0,0,-1)).intersectObject(p.torso,true)[0];
  assert.ok(chestHit?.object!==p.neck,`${id}: neck base must stay inside the chest`);
  p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
 }
});
test('large procedural heads stay above short framed chests',()=>{
 for(const id of ['sol','vega','rime'])for(const neck of [.6,1.6]){
  const def=ROSTER.find(d=>d.id===id),p=figure({...def,model:{...def.model,body:'procedural',surface:'standard'},frame:{scale:.65,bulk:1.65,head:1.4,neck}});p.g.updateMatrixWorld(true);
  const at=p.head.localToWorld(new Vector3(0,-.49,4));
  const hit=new Raycaster(at,new Vector3(0,0,-1)).intersectObjects([p.head,p.torso],true)[0];
  let node=hit?.object;while(node&&node!==p.head)node=node.parent;
  assert.ok(node===p.head,`${id}: custom proportions must not bury the lower face`);
  const crown=p.head.localToWorld(new Vector3(0,.92,4));
  const crownHit=new Raycaster(crown,new Vector3(0,0,-1)).intersectObjects([p.head,p.cowl],true)[0];
  assert.ok(crownHit?.object!==p.head,`${id}: hair must cover the enlarged crown`);
  p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
 }
});
test('costume choice owns armor shells without changing the driven rig',()=>{
 for(const costume of ['fitted','martial','plated','tactical']){
  const p=figure({...sol,model:{costume}});const shells=[];p.g.traverse(o=>{if(o.name==='costume-pauldron')shells.push(o);});
  assert.equal(shells.length,costume==='plated'?2:0,costume);
  assert.equal(p.armL.children.length,3);assert.ok(p.rig.sockets.leftHand===p.armL.children[2]);
  assert.ok(p.legL.userData.knee&&p.legL.userData.shin&&p.legL.userData.boot);
  assert.equal(p.armL.children[0].geometry.type,'BufferGeometry','shaped upper-arm loft');
  p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
 }
});
