import * as THREE from 'three';

// A cloth solver cannot release a sewn point that an unconstrained shoulder
// folds into an arm. Correct that skeletal pose, not the garment attachment.
export class RagdollArmSeam {
  constructor(core,limbs,parts){
    this.core=core;this.limbs=limbs;this.points=core.points;
    this.chest=core.records.find(r=>r.anchor==='chest');core.frame(this.chest);
    const inverse=this.chest.frame.clone().invert(),cape=parts.cape,a=cape.geometry.attributes.position;
    this.seam=[];
    for(let i=0;i<=cape.geometry.parameters.widthSegments;i++){
      const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(cape.matrixWorld).sub(this.points.chest.pos).applyQuaternion(inverse);
      if(i)this.seam.push(p.clone().lerp(this.seam[this.seam.length-1],.5));
      this.seam.push(p);
    }
    const capture=(segment,hand)=>{
      const record=segment.records[0];record.mesh.geometry.computeBoundingBox();
      return {segment,record,hand,box:record.mesh.geometry.boundingBox.clone().expandByScalar(.035),
        shoulder:new THREE.Vector3().subVectors(this.points[segment.a].pos,this.points.chest.pos).applyQuaternion(inverse),
        rest:new THREE.Vector3().subVectors(this.points[segment.b].pos,this.points[segment.a].pos).normalize().applyQuaternion(inverse)};
    };
    this.arms=['L','R'].map(side=>capture(limbs.segments.find(s=>s.a==='sh'+side),this.points['ha'+side]));
    this.constraints=[...this.arms,...['L','R'].map(side=>capture(limbs.segments.find(s=>s.a==='el'+side),null))];
    this.frame=new THREE.Quaternion();this.rotation=new THREE.Quaternion();this.coreRotation=new THREE.Quaternion();
    this.matrix=new THREE.Matrix4();this.inverse=new THREE.Matrix4();this.center=new THREE.Vector3();this.sample=new THREE.Vector3();
    this.start=new THREE.Vector3();this.direction=new THREE.Vector3();this.restDirection=new THREE.Vector3();this.before=new THREE.Vector3();this.change=new THREE.Vector3();
  }
  solve(){
    this.core.frame(this.chest);this.coreRotation.copy(this.chest.frame).multiply(this.chest.offset);
    // Collar points belong to the rigid chest. Three distance braces alone
    // leave a hinge that lets BOTH shoulders drift behind its sewn back seam.
    for(const arm of this.arms){
      const s=arm.segment,shoulder=this.points[s.a];
      this.change.copy(arm.shoulder).applyQuaternion(this.chest.frame).add(this.points.chest.pos).sub(shoulder.pos);
      shoulder.pos.add(this.change);this.points[s.b].pos.add(this.change);arm.hand.pos.add(this.change);
    }
    for(const arm of this.constraints){
      const s=arm.segment,shoulder=this.points[s.a],elbow=this.points[s.b];
      if(!this.overlaps(arm))continue;
      this.before.copy(elbow.pos);this.start.subVectors(elbow.pos,shoulder.pos).normalize();
      this.restDirection.copy(arm.rest).applyQuaternion(this.chest.frame);
      elbow.pos.copy(shoulder.pos).addScaledVector(this.restDirection,s.length);
      if(this.overlaps(arm)){elbow.pos.copy(this.before);continue;}
      // Stay on the bone-length sphere; carrying the wrist by the same delta
      // also preserves forearm length and the captured weapon/wrist frame.
      let low=0,high=1;
      for(let i=0;i<10;i++){
        const t=(low+high)*.5;this.direction.lerpVectors(this.start,this.restDirection,t).normalize();
        elbow.pos.copy(shoulder.pos).addScaledVector(this.direction,s.length);
        if(this.overlaps(arm))low=t;else high=t;
      }
      this.direction.lerpVectors(this.start,this.restDirection,high).normalize();elbow.pos.copy(shoulder.pos).addScaledVector(this.direction,s.length);
      this.change.subVectors(elbow.pos,this.before);arm.hand?.pos.add(this.change);
    }
  }
  overlaps(arm){
    const s=arm.segment,r=arm.record,p=this.points;
    this.limbs.predictFrame(s,this.frame,this.coreRotation);
    this.center.copy(r.position);this.center.y*=p[s.a].pos.distanceTo(p[s.b].pos)/s.length;
    this.center.applyQuaternion(this.frame).add(p[s.a].pos);this.rotation.copy(this.frame).multiply(r.rotation);
    this.matrix.compose(this.center,this.rotation,r.scale);this.inverse.copy(this.matrix).invert();
    for(const point of this.seam){
      this.sample.copy(point).applyQuaternion(this.chest.frame).add(p.chest.pos).applyMatrix4(this.inverse);
      if(arm.box.containsPoint(this.sample))return true;
    }
    return false;
  }
}
