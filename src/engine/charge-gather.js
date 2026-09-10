import * as THREE from 'three';

// Two bounded draw calls, fixed buffers, no particle-pool churn. Local space follows the
// articulated hand socket and the orb's existing charge-to-scale relationship.
export class ChargeGather extends THREE.LineSegments {
  constructor(color,{intensity=1}={}) {
    const count=20,geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*6),3).setUsage(THREE.DynamicDrawUsage));
    const tint=new THREE.Color(color),colors=new Float32Array(count*6);
    for(let i=0;i<count;i++){
      tint.toArray(colors,i*6);tint.toArray(colors,i*6+3);
      for(let j=0;j<3;j++)colors[i*6+j]*=.18;
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),4);
    super(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.name='charge-gather';
    this.intensity=Number.isFinite(intensity)?Math.max(0,Math.min(2,intensity)):1;
    this.readyRing=new THREE.Mesh(new THREE.TorusGeometry(.72,.024,6,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
    this.readyRing.rotation.x=.8;this.add(this.readyRing);
    this.update(0);
  }

  update(time,charge=0) {
    time=Number.isFinite(time)?Math.max(0,time):0;charge=Number.isFinite(charge)?Math.max(0,Math.min(1,charge)):0;
    this.visible=this.intensity>0;
    this.material.opacity=Math.min(1,this.intensity*(.32+charge*.5));
    this.readyRing.visible=charge>=.85&&this.visible;
    this.readyRing.material.opacity=Math.min(1,Math.max(0,Math.min(.85,(charge-.85)/.15*.65))*this.intensity);
    this.readyRing.rotation.z=time*2.2;
    this.readyRing.scale.setScalar(1+Math.sin(time*14)*.035);
    const positions=this.geometry.attributes.position,count=positions.count/2;
    for(let i=0;i<count;i++){
      // A tiny bias makes exact cycle boundaries identical after accumulated
      // 30/60/120Hz dt (otherwise one rate can wrap a frame before another).
      const phase=(time*1.8+i/count+1e-9)%1;
      const latitude=(i/(count-1)-.5)*1.3,flat=Math.sqrt(1-latitude*latitude);
      const angle=i*2.399963229728653+phase*.65;
      const radius=2.6+(i*7%11)/10;
      for(let end=0;end<2;end++){
        const r=.35+Math.pow(1-Math.min(1,phase+end*.12),1.4)*radius;
        positions.setXYZ(i*2+end,Math.cos(angle)*flat*r,latitude*r,Math.sin(angle)*flat*r);
      }
    }
    positions.needsUpdate=true;
  }

  dispose() { this.geometry.dispose();this.material.dispose();this.readyRing.geometry.dispose();this.readyRing.material.dispose(); }
}
