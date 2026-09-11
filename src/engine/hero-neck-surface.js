import * as THREE from 'three';

// Skin between two independently animated drivers. The head/eyes and chest
// remain authoritative; this adapter only updates the existing neck's vertices.
export class NeckSurface {
  constructor(parts){
    this.parts=parts;this.mesh=parts.neck;this.rest=this.mesh.geometry.attributes.position.array.slice();
    this.mesh.geometry.userData.deformsWithRig=true;
    this.mesh.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    this.inverse=new THREE.Matrix4();this.relative=new THREE.Matrix4();this.last=new THREE.Matrix4();this.valid=false;
    this.neckInverse=new THREE.Matrix4();this.headInverse=new THREE.Matrix4();
    this.base=new THREE.Vector3();this.tip=new THREE.Vector3();this.direction=new THREE.Vector3();
    this.x=new THREE.Vector3();this.z=new THREE.Vector3();this.scale=new THREE.Vector3();this.point=new THREE.Vector3();
    this.offset=new THREE.Vector3();this.local=new THREE.Vector3();
    this.rotation=new THREE.Quaternion();this.matrix=new THREE.Matrix4();
    this.baseLocal=new THREE.Vector3(0,1.2,0);this.tipLocal=new THREE.Vector3(0,-.6,0);
    // Only the chest's unchanged upper region can meet the neck. Do not cache
    // the now-deforming waist, or rescan that geometry on every head turn.
    this.chestTriangles=triangles(parts.torso.geometry,this.baseLocal,-.25);this.headTriangles=triangles(parts.head.geometry,this.tipLocal);
  }
  update(force=false){
    const {torso,head}=this.parts,mesh=this.mesh;
    this.inverse.copy(torso.matrixWorld).invert();this.relative.multiplyMatrices(this.inverse,head.matrixWorld);
    if(!force&&this.valid&&this.relative.elements.every((v,i)=>Math.abs(v-this.last.elements[i])<1e-6))return;
    this.valid=true;this.last.copy(this.relative);
    this.base.copy(this.baseLocal).applyMatrix4(torso.matrixWorld);this.tip.copy(this.tipLocal).applyMatrix4(head.matrixWorld);
    this.direction.subVectors(this.tip,this.base).normalize();
    torso.getWorldQuaternion(this.rotation);this.x.set(1,0,0).applyQuaternion(this.rotation);
    this.x.addScaledVector(this.direction,-this.x.dot(this.direction));
    if(this.x.lengthSq()<1e-10){this.x.set(0,0,1).applyQuaternion(this.rotation);this.x.addScaledVector(this.direction,-this.x.dot(this.direction));}
    this.x.normalize();this.z.crossVectors(this.x,this.direction).normalize();
    this.matrix.makeBasis(this.x,this.direction,this.z);this.rotation.setFromRotationMatrix(this.matrix);
    mesh.getWorldScale(this.scale);this.neckInverse.copy(mesh.matrixWorld).invert();this.headInverse.copy(head.matrixWorld).invert();
    const geometry=mesh.geometry,{radiusTop,radiusBottom,radialSegments}=geometry.parameters;
    const bottom=this.fit(this.baseLocal,this.base,radiusBottom,this.inverse,this.chestTriangles,radialSegments);
    const top=this.fit(this.tipLocal,this.tip,radiusTop,this.headInverse,this.headTriangles,radialSegments);
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const upper=this.rest[i*3+1]>0,fit=upper?top:bottom;
      this.point.set(this.rest[i*3]*this.scale.x*fit,0,this.rest[i*3+2]*this.scale.z*fit).applyQuaternion(this.rotation)
        .add(upper?this.tip:this.base).applyMatrix4(this.neckInverse);
      pos.setXYZ(i,this.point.x,this.point.y,this.point.z);
    }
    pos.needsUpdate=true;geometry.computeVertexNormals();
    const n=geometry.attributes.normal;
    for(let row=0;row<2;row++){
      const a=row*(radialSegments+1),b=a+radialSegments;
      this.point.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();
      n.setXYZ(a,this.point.x,this.point.y,this.point.z);n.setXYZ(b,this.point.x,this.point.y,this.point.z);
    }
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
  }
  fit(anchor,worldAnchor,radius,inverse,faces,segments){
    let fit=1;
    for(let i=0;i<segments;i++){
      const angle=i/segments*Math.PI*2;
      this.offset.set(Math.sin(angle)*radius*this.scale.x,0,Math.cos(angle)*radius*this.scale.z).applyQuaternion(this.rotation);
      this.local.copy(worldAnchor).add(this.offset).applyMatrix4(inverse).sub(anchor);
      const length=this.local.length();if(length<1e-10)continue;
      this.local.divideScalar(length);const dx=this.local.x,dy=this.local.y,dz=this.local.z;
      for(let j=0;j<faces.length;j+=17){
        // Most triangles cannot be the first outward crossing. Test their
        // cached plane before the barycentric containment calculation.
        const denominator=faces[j]*dx+faces[j+1]*dy+faces[j+2]*dz;
        if(denominator<=1e-10)continue;
        const distance=-faces[j+3]/denominator;
        if(distance<=1e-7||distance>=length*fit)continue;
        const x=anchor.x+dx*distance-faces[j+4],y=anchor.y+dy*distance-faces[j+5],z=anchor.z+dz*distance-faces[j+6];
        const d20=x*faces[j+7]+y*faces[j+8]+z*faces[j+9],d21=x*faces[j+10]+y*faces[j+11]+z*faces[j+12];
        const u=(faces[j+15]*d20-faces[j+14]*d21)*faces[j+16],v=(faces[j+13]*d21-faces[j+14]*d20)*faces[j+16];
        if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)fit=distance/length*.995;
      }
    }
    return fit;
  }
}

function triangles(geometry,anchor,minY=-Infinity){
  const pos=geometry.attributes.position,index=geometry.index,out=[];
  for(let i=0;i<index.count;i+=3){
    const face=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(pos,index.getX(i+k)));
    if(!face.every(p=>p.y>=minY))continue;
    const [a,b,c]=face,u=b.clone().sub(a),v=c.clone().sub(a),n=u.clone().cross(v).normalize();
    const d00=u.dot(u),d01=u.dot(v),d11=v.dot(v),denominator=d00*d11-d01*d01;
    if(denominator<1e-14)continue;
    out.push(n.x,n.y,n.z,n.dot(anchor)-n.dot(a),a.x,a.y,a.z,u.x,u.y,u.z,v.x,v.y,v.z,d00,d01,d11,1/denominator);
  }
  return new Float64Array(out);
}
