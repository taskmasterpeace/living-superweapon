import * as THREE from 'three';
import {sweepSplitObstacle} from './projectile-contact.js';
import {limbJoinTrim} from './hero-limb-surface.js';

const down=new THREE.Vector3(0,-1,0),reference=new THREE.Vector3(),point=new THREE.Vector3();
const inverse=new THREE.Matrix4(),start=new THREE.Quaternion(),safe=new THREE.Quaternion();
const coverStart=new THREE.Vector3(),coverScale=new THREE.Vector3(),coverContact={};
const joinA=new THREE.Vector3(),joinB=new THREE.Vector3();

// Clip a rendered join edge to each enclosing torso slab, then test its
// closest planar point against the ellipse. A sphere around the whole ring
// incorrectly fills the space along the arm's axis during prone entry.
function joinEdgeOverlaps(a,b,rings){
 for(let i=0;i<rings.length-1;i++){
  const lo=rings[i],hi=rings[i+1],dy=b.y-a.y;
  let first=0,last=1;
  if(Math.abs(dy)<1e-10){if(a.y<lo[0]||a.y>hi[0])continue;}
  else{
   const t0=(lo[0]-a.y)/dy,t1=(hi[0]-a.y)/dy;
   first=Math.max(0,Math.min(t0,t1));last=Math.min(1,Math.max(t0,t1));if(first>last)continue;
  }
  const width=Math.max(lo[1],hi[1]),depth=Math.max(lo[2],hi[2]);
  const x=(a.x+(b.x-a.x)*first)/width,z=(a.z+(b.z-a.z)*first)/depth;
  const dx=(b.x-a.x)*(last-first)/width,dz=(b.z-a.z)*(last-first)/depth;
  const t=THREE.MathUtils.clamp(-(x*dx+z*dz)/Math.max(1e-12,dx*dx+dz*dz),0,1);
  if((x+dx*t)**2+(z+dz*t)**2<1)return true;
 }
 return false;
}

// Distance to a solid ellipse in its plane. The lower bisection endpoint is
// conservative: a numerical approximation may retain contact, never erase it.
function ellipseDistanceSq(x,z,width,depth){
 const w2=width*width,d2=depth*depth;
 if(x*x/w2+z*z/d2<=1)return 0;
 let low=0,high=Math.max(width,depth)*Math.hypot(x,z);
 for(let i=0;i<14;i++){
  const t=(low+high)*.5;
  if(w2*x*x/(t+w2)**2+d2*z*z/(t+d2)**2>1)low=t;else high=t;
 }
 return (x-width*width*x/(low+w2))**2+(z-depth*depth*z/(low+d2))**2;
}

function radiusAt(mesh,y){
 const rings=mesh.geometry.userData.anatomy.rings;
 let i=0;while(i<rings.length-2&&rings[i+1][0]<y)i++;
 const a=rings[i],b=rings[i+1],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
 return Math.max(THREE.MathUtils.lerp(a[1],b[1],t)*mesh.scale.x,THREE.MathUtils.lerp(a[2],b[2],t)*mesh.scale.z);
}

// A final joint constraint, not a replacement muzzle. Short arms on a broad
// frame may not reach a common two-hand target without cutting through ribs.
// Preserve bone lengths/elbow flexion, opening the shoulder only as far as its
// volume needs. The emitting wrist is solved AFTER this correction.
export function constrainArmTorso(f,arm,side){
 const torso=f.parts.torso,rings=torso.geometry.userData.contactRings||torso.geometry.userData.anatomy?.rings;
 if(!rings?.length)return false;
 torso.updateMatrix();inverse.copy(torso.matrix).invert();
 const {upperLength:u,foreLength:v}=arm.userData,bend=-arm.children[1].rotation.x;
 const upper=arm.children[0],fore=arm.children[1],foreRings=fore.geometry.userData.anatomy.rings;
 const upperRings=upper.geometry.userData.anatomy.rings;
 const trim=limbJoinTrim(upperRings,foreRings,upper.scale,fore.scale,Math.abs(bend));
 const upperJoin=upperRings[0][0]+trim/upper.scale.y;
 let joinIndex=0;while(joinIndex<upperRings.length-2&&upperRings[joinIndex+1][0]<upperJoin)joinIndex++;
 const ja=upperRings[joinIndex],jb=upperRings[joinIndex+1],jt=THREE.MathUtils.clamp((upperJoin-ja[0])/(jb[0]-ja[0]),0,1);
 const joinWidth=THREE.MathUtils.lerp(ja[1],jb[1],jt),joinDepth=THREE.MathUtils.lerp(ja[2],jb[2],jt);
 const joinSegments=upper.geometry.userData.anatomy.segments;upper.updateMatrix();
 const sin=Math.sin(bend),cos=Math.cos(bend);
 const world=f._game?.world,hand=arm.children[2],sphere=hand.geometry.boundingSphere;
 const cover=world&&(world.cover?.length||world.interiors?.length)&&!hand.userData.gripOccupied&&sphere;
 let coverRadius=0;
 if(cover){
  arm.parent.updateWorldMatrix(true,false);hand.getWorldScale(coverScale);
  coverRadius=(sphere.radius+sphere.center.length())*Math.max(Math.abs(coverScale.x),Math.abs(coverScale.y),Math.abs(coverScale.z))+.04;
  coverStart.copy(arm.position).applyMatrix4(arm.parent.matrixWorld);
 }
 const overlaps=()=>{
  // The rendered upper join replaces the old fixed -.85*upperLength sphere.
  // Flexion trims that hidden driver into a fillet; retaining its sphere would
  // collide with volume that is no longer drawn and snap a clear incoming arm.
  joinA.set(0,upperJoin,joinDepth).applyMatrix4(upper.matrix).applyQuaternion(arm.quaternion).add(arm.position).applyMatrix4(inverse);
  for(let i=1;i<=joinSegments;i++){
   const angle=i/joinSegments*Math.PI*2;
   joinB.set(Math.sin(angle)*joinWidth,upperJoin,Math.cos(angle)*joinDepth).applyMatrix4(upper.matrix).applyQuaternion(arm.quaternion).add(arm.position).applyMatrix4(inverse);
   if(joinEdgeOverlaps(joinA,joinB,rings))return true;joinA.copy(joinB);
  }
  // Forearm profile samples retain physical radius. This sampled envelope is
  // not a proof of continuous triangle clearance; tests inspect real joins.
  for(let i=0;i<foreRings.length;i++){
   const ring=foreRings[foreRings.length-1-i];
   const t=THREE.MathUtils.clamp(.5-ring[0]*fore.scale.y/v,0,1),radius=radiusAt(fore,ring[0]);
   point.set(0,-u-v*cos*t,v*sin*t).applyQuaternion(arm.quaternion).add(arm.position).applyMatrix4(inverse);
   const ry=radius/torso.scale.y,x=point.x*torso.scale.x,z=point.z*torso.scale.z;
   if(point.y<rings[0][0]-ry||point.y>rings.at(-1)[0]+ry)continue;
   for(let j=0;j<rings.length-1;j++){
    const a=rings[j],b=rings[j+1];
    const dy=Math.max(a[0]-point.y,point.y-b[0],0)*torso.scale.y;
    if(dy>=radius)continue;
    // A short enclosing elliptical slab bounds this loft segment. The limb
    // sphere's cross-section shrinks away from its center; using its full
    // radius at every chest height created phantom contact during flight entry.
    const width=Math.max(a[1],b[1])*torso.scale.x,depth=Math.max(a[2],b[2])*torso.scale.z;
    const planeRadiusSq=radius*radius-dy*dy;
    if(Math.abs(x)>width+radius||Math.abs(z)>depth+radius)continue;
    if(ellipseDistanceSq(x,z,width,depth)<planeRadiusSq)return true;
   }
  }
  // A body-safe shoulder can still put the fist through a nearby wall. Retain
  // a high endpoint that satisfies both constraints, including the wrist's
  // full rotation-independent envelope used by the cover retraction pass.
  if(cover){
   point.set(0,-u-v*cos,v*sin).applyQuaternion(arm.quaternion).add(arm.position).applyMatrix4(arm.parent.matrixWorld);
   return sweepSplitObstacle(world,coverStart,point,coverRadius,coverContact,false,coverRadius);
  }
  return false;
 };
 if(!overlaps())return false;
 start.copy(arm.quaternion);
 reference.set(side*.35,-.05,1).normalize();safe.setFromUnitVectors(down,reference).premultiply(torso.quaternion);
 arm.quaternion.copy(safe);
 if(overlaps()){
  // Beside a front wall, widening laterally can be feasible when extending
  // forward is not. Never accept an unvalidated fallback.
  reference.set(side,0,.35).normalize();safe.setFromUnitVectors(down,reference).premultiply(torso.quaternion);arm.quaternion.copy(safe);
  if(overlaps()){arm.quaternion.copy(start);return false;}
 }
 let low=0,high=1;
 for(let i=0;i<9;i++){
  const t=(low+high)*.5;arm.quaternion.slerpQuaternions(start,safe,t);
  if(overlaps())low=t;else high=t;
 }
 arm.quaternion.slerpQuaternions(start,safe,high);
 return true;
}
