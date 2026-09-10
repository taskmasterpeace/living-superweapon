import * as THREE from 'three';

// The chest is still a rigid animation/socket driver. Only its lower garment
// follows the pelvis, so independent upper-body aiming cannot open the waist.
// Read final transforms (including hit reactions / ragdoll), never change them.
export class WaistSurface {
  constructor(parts) {
    this.torso=parts.torso;this.pelvis=parts.pelvis;
    parts.g.updateWorldMatrix(true,true);
    const bind=new THREE.Matrix4().copy(this.pelvis.matrixWorld).invert().multiply(this.torso.matrixWorld);
    this.anchor=new THREE.Vector3(0,-1.6,0).applyMatrix4(bind);
    const geometry=this.torso.geometry;
    this.rest=geometry.attributes.position.array.slice();
    this.rows=[];
    const groups=new Map();
    for(let i=0;i<this.rest.length;i+=3){
      const y=this.rest[i+1];if(y>=-.25)continue;
      if(!groups.has(y)){
        const t=THREE.MathUtils.clamp((y+1.6)/1.35,0,1);
        const row={t,weight:1-t*t*(3-2*t),indices:[]};groups.set(y,row);this.rows.push(row);
      }
      groups.get(y).indices.push(i/3);
    }
    geometry.userData.deformsWithRig=true;
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    this.inverse=new THREE.Matrix4();this.relative=new THREE.Matrix4();this.last=new THREE.Matrix4();
    this.basis=new THREE.Matrix3();this.valid=false;
    this.vertex=new THREE.Vector3();this.center=new THREE.Vector3();
    // The shipped pelvis is a closed convex loft. Fit the hidden hem INSIDE its
    // actual triangle planes, including nonuniform custom proportions and roll.
    const pg=this.pelvis.geometry,planes=[];
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<pg.index.count;i+=3){
      a.fromBufferAttribute(pg.attributes.position,pg.index.getX(i));
      b.fromBufferAttribute(pg.attributes.position,pg.index.getX(i+1));
      c.fromBufferAttribute(pg.attributes.position,pg.index.getX(i+2));
      const plane=new THREE.Plane().setFromCoplanarPoints(a,b,c);
      if(!planes.some(p=>p.normal.distanceToSquared(plane.normal)<1e-10&&Math.abs(p.constant-plane.constant)<1e-6))planes.push(plane);
    }
    this.planes=planes;
    // Cache unchanged triangle contributions. Rebuilding all 3,744 triangles
    // plus two full bounds scans cost more than the actual vertex deformation.
    this.staticNormals=new Float32Array(this.rest.length);this.faces=[];
    const affected=new Set(),indices=geometry.index.array,changed=new Set(this.rows.flatMap(row=>row.indices));
    for(let i=0;i<indices.length;i+=3){
      const ids=[indices[i],indices[i+1],indices[i+2]];
      if(ids.some(id=>changed.has(id))){this.faces.push(...ids);ids.forEach(id=>affected.add(id));continue;}
      a.fromArray(this.rest,ids[0]*3);b.fromArray(this.rest,ids[1]*3);c.fromArray(this.rest,ids[2]*3);
      c.sub(b).cross(a.sub(b));
      for(const id of ids){this.staticNormals[id*3]+=c.x;this.staticNormals[id*3+1]+=c.y;this.staticNormals[id*3+2]+=c.z;}
    }
    this.affected=[...affected];this.staticBounds=new THREE.Box3();
    for(let i=0;i<geometry.attributes.position.count;i++)if(!changed.has(i))this.staticBounds.expandByPoint(a.fromArray(this.rest,i*3));
  }
  update(force=false) {
    const {torso,pelvis}=this;
    this.inverse.copy(torso.matrixWorld).invert();
    this.relative.multiplyMatrices(this.inverse,pelvis.matrixWorld);
    if(!force&&this.valid&&this.relative.elements.every((v,i)=>Math.abs(v-this.last.elements[i])<1e-6))return;
    this.last.copy(this.relative);this.valid=true;
    this.center.copy(this.anchor).applyMatrix4(this.relative);
    this.basis.setFromMatrix4(this.relative).invert();let fit=1;
    const segments=torso.geometry.userData.anatomy.segments;
    for(let i=0;i<segments;i++){
      this.vertex.set(this.rest[i*3],0,this.rest[i*3+2]).applyMatrix3(this.basis);
      for(const plane of this.planes){
        const denominator=plane.normal.dot(this.vertex);
        if(denominator>1e-9)fit=Math.min(fit,(-plane.distanceToPoint(this.anchor)-.0005)/denominator);
      }
    }
    // Parallel cross sections and monotone axial spacing cannot fold through
    // their neighbors like slerped row frames. Only the hidden hem tapers to
    // fit the hips; the chest silhouette and anatomical/socket drivers stay put.
    const geometry=torso.geometry,attribute=geometry.attributes.position;
    geometry.boundingBox.copy(this.staticBounds);
    for(const row of this.rows){
      const radial=1+(fit-1)*row.weight,y=THREE.MathUtils.lerp(this.center.y,-.25,row.t);
      for(const index of row.indices){
        attribute.setXYZ(index,this.rest[index*3]*radial+this.center.x*row.weight,y,this.rest[index*3+2]*radial+this.center.z*row.weight);
        geometry.boundingBox.expandByPoint(this.vertex.fromBufferAttribute(attribute,index));
      }
    }
    attribute.needsUpdate=true;this.updateNormals(geometry);
    // anatomyGeometry duplicates the radial seam; retain a continuous normal.
    const {rings}=geometry.userData.anatomy,n=geometry.attributes.normal;
    for(let row=0;row<rings.length;row++){
      const a=row*(segments+1),b=a+segments;
      this.vertex.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();
      n.setXYZ(a,this.vertex.x,this.vertex.y,this.vertex.z);n.setXYZ(b,this.vertex.x,this.vertex.y,this.vertex.z);
    }
    n.needsUpdate=true;
    geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);
  }
  updateNormals(geometry){
    const p=geometry.attributes.position.array,n=geometry.attributes.normal.array;
    for(const id of this.affected){const i=id*3;n[i]=this.staticNormals[i];n[i+1]=this.staticNormals[i+1];n[i+2]=this.staticNormals[i+2];}
    for(let i=0;i<this.faces.length;i+=3){
      const a=this.faces[i]*3,b=this.faces[i+1]*3,c=this.faces[i+2]*3;
      const ux=p[c]-p[b],uy=p[c+1]-p[b+1],uz=p[c+2]-p[b+2],vx=p[a]-p[b],vy=p[a+1]-p[b+1],vz=p[a+2]-p[b+2];
      const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;
      n[a]+=x;n[a+1]+=y;n[a+2]+=z;n[b]+=x;n[b+1]+=y;n[b+2]+=z;n[c]+=x;n[c+1]+=y;n[c+2]+=z;
    }
    for(const id of this.affected){const i=id*3,length=Math.hypot(n[i],n[i+1],n[i+2])||1;n[i]/=length;n[i+1]/=length;n[i+2]/=length;}
  }
}
