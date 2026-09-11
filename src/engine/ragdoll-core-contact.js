import * as THREE from 'three';
const EMPTY_COVER=[];
const AXES=['x','y','z'];

// Physics support points are captured from the actual framed rigid core, not
// one radius shared by a small martial artist and a tall armored character.
// The flexible waist is bounded by its chest/pelvis endpoints. Cape seam points
// belong to the chest support so the kinematic attachment cannot bury the cloth.
export class RagdollCoreContact {
  constructor(parts,pose,jointRadii={}){
    this.pose=pose;this.records=new Map();this.rotation=new THREE.Quaternion();this.axis=new THREE.Vector3();this.bounds=new THREE.Box3();this.point=new THREE.Vector3();
    this.pointList=Object.values(pose.points);this.correction=new THREE.Vector3();
    this.intervals=new Float64Array(0);this.candidate=new THREE.Vector3();
    const point=new THREE.Vector3();
    for(const r of pose.records){
      const scale=r.mesh.getWorldScale(new THREE.Vector3()),a=r.mesh.geometry.attributes.position,vertices=[];
      for(let i=0;i<a.count;i++){
        if(r.anchor==='chest'&&a.getY(i)<-.25)continue;
        point.fromBufferAttribute(a,i).multiply(scale);vertices.push(point.x,point.y,point.z);
      }
      // Authored rigid accessories opt in explicitly. Capture their real
      // geometry once in the driver's local frame; do not enlarge every hero's
      // generic head/chest radius or let a helmet settle through the ground.
      const inv=r.mesh.matrixWorld.clone().invert();
      r.mesh.traverse(child=>{
        if(child===r.mesh||!child.visible)return;
        const support=child.userData.ragdollSupport;
        if(support){for(let i=0;i<support.length;i+=3){point.fromArray(support,i).applyMatrix4(child.matrixWorld).applyMatrix4(inv).multiply(scale);vertices.push(point.x,point.y,point.z);}return;}
        if(!child.userData.ragdollContact||!child.geometry)return;
        const position=child.geometry.attributes.position;
        for(let i=0;i<position.count;i++){
          point.fromBufferAttribute(position,i).applyMatrix4(child.matrixWorld).applyMatrix4(inv).multiply(scale);
          vertices.push(point.x,point.y,point.z);
        }
      });
      if(r.anchor==='chest'&&parts.cape){
        const cape=parts.cape,inv=r.mesh.matrixWorld.clone().invert();
        for(let i=0;i<=cape.geometry.parameters.widthSegments;i++){
          point.fromBufferAttribute(cape.geometry.attributes.position,i).applyMatrix4(cape.matrixWorld).applyMatrix4(inv).multiply(scale);
          vertices.push(point.x,point.y,point.z);
        }
      }
      this.records.set(r.anchor,{pose:r,vertices:new Float64Array(vertices),finalBounds:new THREE.Box3()});
    }
    // Final anatomical correction can carry an elbow/wrist after the ordinary
    // joint contact pass. Retain those existing joint margins in island cleanup.
    this.supports=new Map(this.records);
    for(const key of Object.keys(pose.points))if(!this.records.has(key)){
      const r=jointRadii[key]??.5;
      this.supports.set(key,{finalBounds:new THREE.Box3(new THREE.Vector3(-r,-r,-r),new THREE.Vector3(r,r,r))});
    }
  }
  floorRadius(key){
    const record=this.records.get(key);if(!record)return null;
    this.pose.frame(record.pose);this.rotation.copy(record.pose.frame).multiply(record.pose.offset).invert();
    this.axis.set(0,1,0).applyQuaternion(this.rotation);const a=record.vertices;let minimum=Infinity;
    for(let i=0;i<a.length;i+=3)minimum=Math.min(minimum,a[i]*this.axis.x+a[i+1]*this.axis.y+a[i+2]*this.axis.z);
    return Math.max(.05,-minimum+.045);
  }
  coverContact(key,point,cover){
    const record=this.records.get(key);if(!record)return false;
    this.measureBounds(record,this.bounds);
    const p=point.pos;
    for(const c of cover){
      if(!coverCorrection(p,this.bounds,c,this.correction))continue;
      p.add(this.correction);
      // Remove the into-wall velocity, retaining tangential tumble/slide.
      for(const axis of ['x','y','z'])if((p[axis]-point.prev[axis])*this.correction[axis]<0)point.prev[axis]=p[axis];
    }
    return true;
  }
  measureBounds(record,target){
    this.pose.frame(record.pose);this.rotation.copy(record.pose.frame).multiply(record.pose.offset);
    target.makeEmpty();const a=record.vertices;
    for(let i=0;i<a.length;i+=3)target.expandByPoint(this.point.set(a[i],a[i+1],a[i+2]).applyQuaternion(this.rotation));
    target.expandByScalar(.045);
  }
  settleIsland(world){
    const points=this.pointList,cover=world?.cover||EMPTY_COVER;
    // Rigid translations leave all final neck/brace orientations intact. Bounds
    // are measured from those orientations, not from the middle of relaxation.
    for(const record of this.records.values())this.measureBounds(record,record.finalBounds);
    let lift=0;
    for(const [key,record]of this.supports){
      const p=this.pose.points[key].pos;
      lift=Math.max(lift,(world?.heightAt?.(p.x,p.z)||0)-p.y-record.finalBounds.min.y);
    }
    if(lift>1e-6)for(const pt of points){pt.pos.y+=lift;pt.prev.y+=lift;}
    let embedded=false;
    for(const [key,record]of this.supports)for(const c of cover){
      if(coverCorrection(this.pose.points[key].pos,record.finalBounds,c,this.candidate)&&this.candidate.lengthSq()>1e-12)embedded=true;
    }
    if(!embedded)return;
    // The head and chest cannot independently choose opposite exits and undo
    // each other's correction. Solve forbidden translation intervals for the
    // entire compound core; every proposed exit clears every support/cover pair.
    const capacity=this.supports.size*cover.length*2;
    if(this.intervals.length<capacity)this.intervals=new Float64Array(capacity);
    let best=Infinity;
    for(const axis of AXES)for(const sign of [-1,1]){
      let count=0;
      for(const [key,record]of this.supports)for(const c of cover){
        const p=this.pose.points[key].pos,b=record.finalBounds,hx=c.hx??c.r,hz=c.hz??c.r;
        let near=-Infinity,far=Infinity,valid=true;
        for(const k of AXES){
          const min=k==='x'?c.x-hx:k==='z'?c.z-hz:-Infinity,max=k==='x'?c.x+hx:k==='z'?c.z+hz:(c.top??c.h);
          if(k!==axis){if(p[k]+b.max[k]<=min+1e-8||p[k]+b.min[k]>=max-1e-8){valid=false;break;}continue;}
          const a=(min-p[k]-b.max[k])*sign,z=(max-p[k]-b.min[k])*sign;
          near=Math.min(a,z);far=Math.max(a,z);
        }
        if(valid&&far>0){this.intervals[count++]=near;this.intervals[count++]=far;}
      }
      let end=0,changed=true;
      while(changed){changed=false;for(let i=0;i<count;i+=2)if(this.intervals[i]<=end+1e-8&&this.intervals[i+1]>end){end=this.intervals[i+1];changed=true;}}
      if(!Number.isFinite(end)||end<=0||end>=best)continue;
      this.candidate.set(0,0,0);this.candidate[axis]=sign*(end+1e-5);
      let clear=true;
      for(const [key,record]of this.supports){
        const p=this.pose.points[key].pos;
        if(p.y+record.finalBounds.min.y+this.candidate.y<(world?.heightAt?.(p.x+this.candidate.x,p.z+this.candidate.z)||0)-1e-8){clear=false;break;}
      }
      if(clear){best=end;this.correction.copy(this.candidate);}
    }
    if(Number.isFinite(best))for(const pt of points){pt.pos.add(this.correction);pt.prev.add(this.correction);}
  }
}

function coverCorrection(p,bounds,c,out){
  const min=bounds.min,max=bounds.max,hx=c.hx??c.r,hz=c.hz??c.r,top=c.top??c.h;
  if(p.x+max.x<c.x-hx||p.x+min.x>c.x+hx||p.z+max.z<c.z-hz||p.z+min.z>c.z+hz||p.y+min.y>top)return false;
  let axis='y',move=top-p.y-min.y;
  const left=c.x-hx-p.x-max.x,right=c.x+hx-p.x-min.x,back=c.z-hz-p.z-max.z,front=c.z+hz-p.z-min.z;
  if(Math.abs(left)<Math.abs(move)){axis='x';move=left;}
  if(Math.abs(right)<Math.abs(move)){axis='x';move=right;}
  if(Math.abs(back)<Math.abs(move)){axis='z';move=back;}
  if(Math.abs(front)<Math.abs(move)){axis='z';move=front;}
  out.set(0,0,0);out[axis]=move;return true;
}
