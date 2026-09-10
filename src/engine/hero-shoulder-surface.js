import * as THREE from 'three';

// The shoulder belongs to BOTH the chest and humerus. A cap parented only to
// the arm exposes the joint when raised and cannot span independently authored
// chest width / shoulder breadth. This garment volume reads final driven parts.
export class ShoulderSurface {
  constructor(parts,arm,side) {
    this.torso=parts.torso;this.upper=arm.children[0];this.side=side;
    this.frame=parts.g.userData.frame;
    this.segments=16;this.sections=10;
    const geo=new THREE.BufferGeometry(),indices=[];
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array((2+(this.sections-1)*this.segments)*3),3).setUsage(THREE.DynamicDrawUsage));
    const end=geo.attributes.position.count-1;
    for(let j=0;j<this.segments;j++){
      const k=(j+1)%this.segments;indices.push(0,1+j,1+k);
      for(let r=0;r<this.sections-2;r++){
        const a=1+r*this.segments+j,b=1+r*this.segments+k;
        indices.push(a,a+this.segments,b,b,a+this.segments,b+this.segments);
      }
      const last=1+(this.sections-2)*this.segments;
      indices.push(end,last+k,last+j);
    }
    geo.setIndex(indices);geo.userData.deformsWithRig=true;
    this.mesh=new THREE.Mesh(geo,this.upper.material);this.mesh.name='hero-shoulder-surface';this.mesh.castShadow=true;
    this.torso.add(this.mesh);
    this.inverse=new THREE.Matrix4();this.relative=new THREE.Matrix4();this.last=new THREE.Matrix4();this.valid=false;
    this.a=new THREE.Vector3();this.b=new THREE.Vector3();this.axis=new THREE.Vector3();
    this.up=new THREE.Vector3();this.unit=new THREE.Vector3();this.point=new THREE.Vector3();this.center=new THREE.Vector3();
    this.rotation=new THREE.Quaternion();
  }
  update(force=false) {
    this.inverse.copy(this.torso.matrixWorld).invert();this.relative.multiplyMatrices(this.inverse,this.upper.matrixWorld);
    if(!force&&this.valid&&this.relative.elements.every((v,i)=>Math.abs(v-this.last.elements[i])<1e-6))return;
    this.valid=true;this.last.copy(this.relative);
    this.a.set(this.side*.85,1.05,0).applyMatrix4(this.torso.matrixWorld);
    this.b.set(0,.4,0).applyMatrix4(this.upper.matrixWorld);
    this.axis.copy(this.b).sub(this.a);const length=this.axis.length();
    if(length<1e-6)this.axis.set(this.side,0,0).transformDirection(this.torso.matrixWorld);else this.axis.divideScalar(length);
    this.torso.getWorldQuaternion(this.rotation);
    this.up.set(0,1,0).applyQuaternion(this.rotation);
    this.up.addScaledVector(this.axis,-this.up.dot(this.axis));
    this.center.addVectors(this.a,this.b).multiplyScalar(.5);
    const bulk=this.frame.bulk,scale=this.frame.scale,radius=.35*bulk;
    const major=length*.5+radius,height=.35*Math.min(scale,bulk*1.25);
    const flatten=length*length/(length*length+.04*bulk*bulk);
    const pos=this.mesh.geometry.attributes.position;
    let index=0;
    for(let r=0;r<=this.sections;r++){
      const angle=Math.PI*r/this.sections,sin=Math.sin(angle);
      for(let j=0;j<(r===0||r===this.sections?1:this.segments);j++){
        const theta=j/this.segments*Math.PI*2;
        this.unit.set(-Math.cos(angle),Math.sin(theta)*sin,Math.cos(theta)*sin).applyQuaternion(this.rotation);
        // Symmetric positive-definite stretch of a fixed chest-space sphere.
        // aaᵀ is sign-invariant and the unnormalized up projection vanishes
        // smoothly at alignment. No moving basis, singularity switch, or history
        // state: ragdoll playback and arbitrary editor seeks use the same shape.
        this.point.copy(this.center).addScaledVector(this.unit,radius)
          .addScaledVector(this.axis,(major-radius)*this.unit.dot(this.axis))
          .addScaledVector(this.up,(height-radius)*flatten*this.unit.dot(this.up)).applyMatrix4(this.inverse);
        pos.setXYZ(index++,this.point.x,this.point.y,this.point.z);
      }
    }
    pos.needsUpdate=true;this.mesh.geometry.computeVertexNormals();this.mesh.geometry.computeBoundingBox();this.mesh.geometry.computeBoundingSphere();
  }
}
