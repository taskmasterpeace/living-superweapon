import * as THREE from 'three';

// Physics points for the core are mesh CENTERS, unlike the endpoint pairs used
// by arms and legs. Preserve that anchor and the captured pose's local facing.
// Shoulder / hip spans supply roll, which a single +Y-to-bone swing cannot know.
export class RagdollCorePose {
  constructor(parts,points){
    this.points=points;
    this.x=new THREE.Vector3();this.y=new THREE.Vector3();this.z=new THREE.Vector3();
    this.matrix=new THREE.Matrix4();this.parent=new THREE.Quaternion();this.rotation=new THREE.Quaternion();
    this.records=[
      {mesh:parts.torso,anchor:'chest',up:'chest',down:'pelvis',left:'shL',right:'shR'},
      {mesh:parts.pelvis,anchor:'pelvis',up:'chest',down:'pelvis',left:'hiL',right:'hiR'},
      {mesh:parts.head,anchor:'head',up:'head',down:'chest',left:'shL',right:'shR'},
    ];
    for(const r of this.records){
      r.frame=new THREE.Quaternion();r.offset=new THREE.Quaternion();
      this.frame(r);r.offset.copy(r.frame).invert().multiply(r.mesh.getWorldQuaternion(this.rotation));
    }
  }
  frame(r){
    const p=this.points;
    this.y.subVectors(p[r.up].pos,p[r.down].pos);
    if(this.y.lengthSq()<1e-10)return;
    this.y.normalize();this.x.subVectors(p[r.right].pos,p[r.left].pos);
    this.x.addScaledVector(this.y,-this.x.dot(this.y));
    if(this.x.lengthSq()<1e-10){
      // A collapsed brace has no new roll information; transport the last one.
      this.x.set(1,0,0).applyQuaternion(r.frame).addScaledVector(this.y,-this.x.dot(this.y));
      if(this.x.lengthSq()<1e-10)return;
    }
    this.x.normalize();this.z.crossVectors(this.x,this.y).normalize();
    this.x.crossVectors(this.y,this.z);
    this.matrix.makeBasis(this.x,this.y,this.z);r.frame.setFromRotationMatrix(this.matrix);
  }
  apply(){
    for(const r of this.records){
      this.frame(r);this.rotation.copy(r.frame).multiply(r.offset);
      r.mesh.position.copy(this.points[r.anchor].pos);
      if(r.mesh.parent){
        r.mesh.parent.worldToLocal(r.mesh.position);
        r.mesh.parent.getWorldQuaternion(this.parent).invert();this.rotation.premultiply(this.parent);
      }
      r.mesh.quaternion.copy(this.rotation);
    }
  }
}
