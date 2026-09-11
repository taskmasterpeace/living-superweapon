import * as THREE from 'three';

// Carry the displayed limb pose into physics. A bone direction alone loses roll,
// wrist articulation, boot heading and mesh-center offsets. Transport the captured
// frame with the core, then swing it onto the new bone direction without a bind reset.
export class RagdollLimbPose {
  constructor(parts,points){
    this.points=points;this.segments=[];
    this.direction=new THREE.Vector3();this.up=new THREE.Vector3();this.offset=new THREE.Vector3();
    this.swing=new THREE.Quaternion();this.core=new THREE.Quaternion();this.delta=new THREE.Quaternion();
    this.worldRotation=new THREE.Quaternion();this.parentRotation=new THREE.Quaternion();this.parentScale=new THREE.Vector3();
    for(const side of ['L','R']){
      const a=parts['arm'+side],u=parts['leg'+side].userData;
      this.add('sh'+side,'el'+side,parts.torso,[[a.children[0],false]]);
      this.add('el'+side,'ha'+side,parts.torso,[[a.children[1],false],[a.children[2],true]]);
      this.add('hi'+side,'knee'+side,parts.pelvis,[[u.thigh,false]]);
      this.add('knee'+side,'ft'+side,parts.pelvis,[[u.shin,false],[u.boot,true],[u.kneeCap,false]]);
    }
  }
  add(a,b,core,meshes){
    const frame=core.getWorldQuaternion(new THREE.Quaternion()),lastCore=frame.clone();
    this.direction.subVectors(this.points[a].pos,this.points[b].pos).normalize();
    this.up.set(0,1,0).applyQuaternion(frame);frame.premultiply(this.swing.setFromUnitVectors(this.up,this.direction));
    const inverse=frame.clone().invert();
    const records=meshes.filter(([mesh])=>mesh).map(([mesh,end])=>({
      mesh,end,position:mesh.getWorldPosition(new THREE.Vector3()).sub(this.points[end?b:a].pos).applyQuaternion(inverse),
      rotation:inverse.clone().multiply(mesh.getWorldQuaternion(new THREE.Quaternion())),scale:mesh.getWorldScale(new THREE.Vector3()),
    }));
    this.segments.push({a,b,core,frame,lastCore,records,length:this.points[a].pos.distanceTo(this.points[b].pos)});
  }
  apply(){
    for(const s of this.segments){
      s.core.getWorldQuaternion(this.core);
      this.predictFrame(s,s.frame,this.core);s.lastCore.copy(this.core);
      const length=this.points[s.a].pos.distanceTo(this.points[s.b].pos);
      for(const r of s.records){
        const m=r.mesh;this.offset.copy(r.position);this.offset.y*=s.length>1e-7?length/s.length:1;
        m.position.copy(this.offset).applyQuaternion(s.frame).add(this.points[r.end?s.b:s.a].pos);
        this.worldRotation.copy(s.frame).multiply(r.rotation);m.scale.copy(r.scale);
        if(m.parent){
          m.parent.worldToLocal(m.position);m.parent.getWorldQuaternion(this.parentRotation).invert();
          this.worldRotation.premultiply(this.parentRotation);m.parent.getWorldScale(this.parentScale);m.scale.divide(this.parentScale);
        }
        m.quaternion.copy(this.worldRotation);
      }
    }
  }
  // Physics contact can inspect the same transported frame without changing
  // its history or requiring an intermediate scene-graph/render update.
  predictFrame(s,target,coreRotation){
    this.delta.copy(s.lastCore).invert().premultiply(coreRotation);
    target.copy(s.frame).premultiply(this.delta);
    this.direction.subVectors(this.points[s.a].pos,this.points[s.b].pos);
    if(this.direction.lengthSq()>1e-14){
      this.direction.normalize();this.up.set(0,1,0).applyQuaternion(target);
      target.premultiply(this.swing.setFromUnitVectors(this.up,this.direction)).normalize();
    }
    return target;
  }
}
