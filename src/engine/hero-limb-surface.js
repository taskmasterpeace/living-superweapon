import * as THREE from 'three';
import { ShoulderSurface } from './hero-shoulder-surface.js';
import { WaistSurface } from './hero-waist-surface.js';
import { NeckSurface } from './hero-neck-surface.js';

// A continuous loft over the existing two driven meshes. Drivers retain their children
// (costume, weapon and grip sockets); only their own capped geometry stops rendering.
// Deformation reads the FINAL driver transforms, including IK, hit reactions and ragdoll.
const point=new THREE.Vector3(),normal=new THREE.Vector3();
// Shared by rendering and shoulder contact. Deep flexion moves the fillet
// boundary along both bones; a fixed sample near the elbow is not that join.
export function limbJoinTrim(upper,lower,upperScale,lowerScale,angle){
 const upEnd=upper[0],downEnd=lower.at(-1);
 const available=Math.min((upper.at(-1)[0]-upEnd[0])*upperScale.y,(downEnd[0]-lower[0][0])*lowerScale.y)*.78;
 const restTrim=Math.max((upper[1][0]-upEnd[0])*upperScale.y,(downEnd[0]-lower.at(-2)[0])*lowerScale.y);
 const jointRadius=Math.max(upEnd[1]*upperScale.x,upEnd[2]*upperScale.z,downEnd[1]*lowerScale.x,downEnd[2]*lowerScale.z);
 return Math.min(available,Math.max(restTrim,jointRadius*1.35*Math.tan(Math.min(angle,3.08)*.5)));
}
class LimbSurface {
  constructor(upper,lower) {
    this.upper=upper;this.lower=lower;
    const a=upper.geometry.userData.anatomy,b=lower.geometry.userData.anatomy;
    this.upperProfile=a.rings;this.lowerProfile=b.rings;
    this.segments=Math.max(a.segments,b.segments);
    this.rows=[];
    for(const ring of b.rings.slice(0,-1))this.rows.push({ring,driver:lower});
    this.bottom=b.rings.at(-2);this.top=a.rings[1];
    // Eight intermediate sections round the bend, without a separate spherical joint.
    for(let i=1;i<=8;i++)this.rows.push({t:i/9});
    for(const ring of a.rings.slice(1))this.rows.push({ring,driver:upper});
    const count=this.rows.length*this.segments,indices=[],geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array((count+2)*3),3).setUsage(THREE.DynamicDrawUsage));
    for(let r=0;r<this.rows.length-1;r++){
      const start=indices.length;
      for(let i=0;i<this.segments;i++){
        const j=(i+1)%this.segments,a=r*this.segments+i,b=r*this.segments+j,c=a+this.segments,d=b+this.segments;
        indices.push(a,b,c,b,d,c);
      }
      const row=this.rows[r];
      geo.addGroup(start,indices.length-start,row.driver===upper||row.t>=.5?0:1);
    }
    for(const end of [0,this.rows.length-1]){
      const start=indices.length,center=count+(end===0?0:1);
      for(let i=0;i<this.segments;i++){
        const a=end*this.segments+i,b=end*this.segments+(i+1)%this.segments;
        if(end===0)indices.push(center,b,a);else indices.push(center,a,b);
      }
      geo.addGroup(start,indices.length-start,end===0?1:0);
    }
    // Batch by material, not ring: section-by-section groups would turn one limb
    // into a dozen draw calls. Matching costume materials need only one draw.
    const buckets=[[],[]],sameMaterial=upper.material===lower.material;
    for(const group of geo.groups)for(let i=group.start;i<group.start+group.count;i++)buckets[sameMaterial?0:group.materialIndex].push(indices[i]);
    geo.clearGroups();geo.setIndex([...buckets[0],...buckets[1]]);geo.setDrawRange(0,buckets[0].length);
    geo.userData.deformsWithRig=true;
    this.mesh=new THREE.Mesh(geo,upper.material);
    this.mesh.name='hero-limb-surface';this.mesh.castShadow=true;this.mesh.receiveShadow=upper.receiveShadow;
    if(buckets[1].length){
      // Two draw views over the same connected surface, retaining the single-
      // material Mesh contract used by invisibility, duplicates and holograms.
      const view=new THREE.BufferGeometry();view.setIndex(geo.index);view.setAttribute('position',geo.attributes.position);
      view.setDrawRange(buckets[0].length,buckets[1].length);view.userData.deformsWithRig=true;
      this.lowerView=new THREE.Mesh(view,lower.material);this.lowerView.name='hero-limb-lower';this.lowerView.castShadow=true;
      this.mesh.add(this.lowerView);
    }
    upper.add(this.mesh);upper.geometry.setDrawRange(0,0);lower.geometry.setDrawRange(0,0);
    this.inverse=new THREE.Matrix4();this.relative=new THREE.Matrix4();this.last=new THREE.Matrix4();this.valid=false;
    this.up={position:new THREE.Vector3(),rotation:new THREE.Quaternion(),scale:new THREE.Vector3()};
    this.down={position:new THREE.Vector3(),rotation:new THREE.Quaternion(),scale:new THREE.Vector3()};
    this.lo=new THREE.Vector3();this.hi=new THREE.Vector3();this.c1=new THREE.Vector3();this.c2=new THREE.Vector3();
    this.center=new THREE.Vector3();this.rotation=new THREE.Quaternion();
    this.upAxis=new THREE.Vector3();this.downAxis=new THREE.Vector3();
    this.tangent=new THREE.Vector3();this.crossAxis=new THREE.Vector3();this.correction=new THREE.Quaternion();
    this.curveSecond=new THREE.Vector3();this.curveDiff=new THREE.Vector3();
    this.hiRadius=new THREE.Vector2();this.loRadius=new THREE.Vector2();this.rigidRadius=new THREE.Vector2();
  }
  update(force=false) {
    const {upper,lower,mesh}=this;
    this.inverse.copy(upper.matrixWorld).invert();this.relative.multiplyMatrices(this.inverse,lower.matrixWorld);
    if(!force&&this.valid&&this.relative.elements.every((v,i)=>Math.abs(v-this.last.elements[i])<1e-6))return;
    this.valid=true;this.last.copy(this.relative);
    upper.matrixWorld.decompose(this.up.position,this.up.rotation,this.up.scale);
    lower.matrixWorld.decompose(this.down.position,this.down.rotation,this.down.scale);
    this.upAxis.set(0,1,0).applyQuaternion(this.up.rotation);this.downAxis.set(0,1,0).applyQuaternion(this.down.rotation);
    const angle=this.upAxis.angleTo(this.downAxis),tan=Math.tan(Math.min(angle,3.08)*.5);
    const upEnd=this.upperProfile[0],downEnd=this.lowerProfile.at(-1);
    // A fillet needs trim = radius*tan(bend/2). A fixed narrow strip collapses
    // at a deep bend and turns its inside triangles backwards. Let the flexion
    // zone spread along the limb instead, bounded before the shoulder/wrist.
    const trim=limbJoinTrim(this.upperProfile,this.lowerProfile,this.up.scale,this.down.scale,angle);
    const upperY=upEnd[0]+trim/this.up.scale.y,lowerY=downEnd[0]-trim/this.down.scale.y;
    const radius=tan>.001?trim/tan:Infinity;
    let limit=radius*.8;
    this.lo.set(0,lowerY,0).applyMatrix4(lower.matrixWorld);
    this.hi.set(0,upperY,0).applyMatrix4(upper.matrixWorld);
    const tangent=angle>.01?4/3*Math.tan(angle/4)*radius:this.lo.distanceTo(this.hi)/3;
    this.c1.copy(this.downAxis).multiplyScalar(tangent).add(this.lo);
    this.c2.copy(this.upAxis).multiplyScalar(-tangent).add(this.hi);
    // Verlet constraints can separate the two joint endpoints slightly. At a
    // near-folded joint that is significant: bound thickness by the ACTUAL
    // curve curvature, not just the ideal circular fillet above.
    for(let i=0;i<=16;i++){
      const t=i/16,s=1-t;this.curveTangent(t,this.tangent);
      this.curveSecond.copy(this.c2).add(this.lo).addScaledVector(this.c1,-2).multiplyScalar(6*s);
      this.curveDiff.copy(this.hi).add(this.c1).addScaledVector(this.c2,-2);this.curveSecond.addScaledVector(this.curveDiff,6*t);
      const length=this.tangent.length(),cross=this.curveSecond.cross(this.tangent).length();
      if(cross>1e-12)limit=Math.min(limit,.65*length*length*length/cross);
    }
    const hiRadius=profileRadius(this.upperProfile,upperY,this.up.scale,limit,this.hiRadius);
    const loRadius=profileRadius(this.lowerProfile,lowerY,this.down.scale,limit,this.loRadius);
    const pos=mesh.geometry.attributes.position;
    for(let r=0;r<this.rows.length;r++){
      const row=this.rows[r],t=row.t;
      let rigidY,rigidRadius;
      if(row.driver){
        const isUpper=row.driver===upper,profile=isUpper?this.upperProfile:this.lowerProfile,scale=isUpper?this.up.scale:this.down.scale;
        const outer=isUpper?profile.at(-1)[0]:profile[0][0],oldInner=isUpper?this.top[0]:this.bottom[0],inner=isUpper?upperY:lowerY;
        const mix=(row.ring[0]-outer)/(oldInner-outer);
        rigidY=THREE.MathUtils.lerp(outer,inner,mix);
        rigidRadius=profileRadius(profile,rigidY,scale,mix>.999?limit:Infinity,this.rigidRadius);
      }
      if(t!==undefined){
        const s=1-t;
        this.center.copy(this.lo).multiplyScalar(s*s*s).addScaledVector(this.c1,3*s*s*t)
          .addScaledVector(this.c2,3*s*t*t).addScaledVector(this.hi,t*t*t);
        this.rotation.slerpQuaternions(this.down.rotation,this.up.rotation,t);
        // Independently oriented ragdoll bones can carry substantial roll.
        // Keep that roll, but swing the interpolated cross section onto the
        // actual curve tangent so it cannot tilt through neighboring rings.
        this.curveTangent(t,this.tangent);
        if(this.tangent.lengthSq()>1e-12){
          this.crossAxis.set(0,1,0).applyQuaternion(this.rotation);
          this.correction.setFromUnitVectors(this.crossAxis,this.tangent.normalize());
          this.rotation.premultiply(this.correction);
        }
      }
      for(let i=0;i<this.segments;i++){
        const angle=i/this.segments*Math.PI*2;
        if(row.driver){
          const scale=row.driver===upper?this.up.scale:this.down.scale;
          point.set(Math.sin(angle)*rigidRadius.x/scale.x,rigidY,Math.cos(angle)*rigidRadius.y/scale.z).applyMatrix4(row.driver.matrixWorld);
        }else{
          const width=THREE.MathUtils.lerp(loRadius.x,hiRadius.x,t);
          const depth=THREE.MathUtils.lerp(loRadius.y,hiRadius.y,t);
          point.set(Math.sin(angle)*width,0,Math.cos(angle)*depth).applyQuaternion(this.rotation).add(this.center);
        }
        point.applyMatrix4(this.inverse);pos.setXYZ(r*this.segments+i,point.x,point.y,point.z);
      }
    }
    for(const end of [0,this.rows.length-1]){
      point.set(0,0,0);
      for(let i=0;i<this.segments;i++){normal.fromBufferAttribute(pos,end*this.segments+i);point.add(normal);}
      point.multiplyScalar(1/this.segments);pos.setXYZ(this.rows.length*this.segments+(end===0?0:1),point.x,point.y,point.z);
    }
    pos.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
    if(this.lowerView){
      const view=this.lowerView.geometry;view.setAttribute('normal',mesh.geometry.attributes.normal);
      view.boundingBox=mesh.geometry.boundingBox;view.boundingSphere=mesh.geometry.boundingSphere;
    }
  }
  curveTangent(t,out){
    const s=1-t;
    out.copy(this.c1).sub(this.lo).multiplyScalar(3*s*s);
    this.curveDiff.copy(this.c2).sub(this.c1);out.addScaledVector(this.curveDiff,6*s*t);
    this.curveDiff.copy(this.hi).sub(this.c2);return out.addScaledVector(this.curveDiff,3*t*t);
  }
}

function profileRadius(profile,y,scale,limit,out) {
  let i=0;while(i<profile.length-2&&profile[i+1][0]<y)i++;
  const a=profile[i],b=profile[i+1],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
  const width=THREE.MathUtils.lerp(a[1],b[1],t)*scale.x,depth=THREE.MathUtils.lerp(a[2],b[2],t)*scale.z;
  const shrink=Math.min(1,limit/Math.max(width,depth));return out.set(width*shrink,depth*shrink);
}

export function bindLimbSurfaces(parts) {
  parts.rig.limbSurfaces=[];
  parts.rig.waistSurface=new WaistSurface(parts);
  if(parts.neck)parts.rig.neckSurface=new NeckSurface(parts);
  parts.rig.shoulderSurfaces=[new ShoulderSurface(parts,parts.armL,-1),new ShoulderSurface(parts,parts.armR,1)];
  for(const arm of [parts.armL,parts.armR])parts.rig.limbSurfaces.push(new LimbSurface(arm.children[0],arm.children[1]));
  for(const leg of [parts.legL,parts.legR]){
    parts.rig.limbSurfaces.push(new LimbSurface(leg.userData.thigh,leg.userData.shin));
    // The continuous knee now supplies the joint silhouette, not the old floating ball.
    leg.userData.kneeCap.visible=false;
  }
  updateLimbSurfaces(parts,true);
}

export function updateLimbSurfaces(parts,force=false) {
  if(!parts.rig?.limbSurfaces)return;
  parts.g.updateWorldMatrix(true,true);
  parts.rig.waistSurface?.update(force);
  parts.rig.neckSurface?.update(force);
  for(const surface of parts.rig.limbSurfaces)surface.update(force);
  for(const surface of parts.rig.shoulderSurfaces||[])surface.update(force);
}
