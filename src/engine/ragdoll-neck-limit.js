import * as THREE from 'three';

// Limit neck swing in the captured chest frame. Distance-only neck/shoulder
// braces allow the head to fold through the upper back on impact. Keep the
// entering pose, but stop that physically impossible fold in the simulation.
export class RagdollNeckLimit {
  constructor(pose,parts){
    this.pose=pose;this.chest=pose.records.find(r=>r.anchor==='chest');
    this.inverse=new THREE.Quaternion();this.axis=new THREE.Vector3();this.direction=new THREE.Vector3();this.side=new THREE.Vector3();
    pose.frame(this.chest);
    this.rest=new THREE.Vector3().subVectors(pose.points.head.pos,pose.points.chest.pos).normalize().applyQuaternion(this.inverse.copy(this.chest.frame).invert());
    this.length=pose.points.head.pos.distanceTo(pose.points.chest.pos);this.source=new THREE.Vector3();this.restAxis=new THREE.Vector3();this.offset=new THREE.Vector3();
    this.head=pose.records.find(r=>r.anchor==='head');this.headRotation=new THREE.Quaternion();this.localAxis=new THREE.Vector3();
    this.separation=null;
    if(parts.cape){
      const mesh=parts.head,a=mesh.geometry.attributes.position,index=mesh.geometry.index;
      const vertices=Array.from({length:a.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));
      const cape=parts.cape,seam=Array.from({length:cape.geometry.parameters.widthSegments+1},(_,i)=>new THREE.Vector3().fromBufferAttribute(cape.geometry.attributes.position,i).applyMatrix4(cape.matrixWorld));
      const normal=new THREE.Vector3(),edge=new THREE.Vector3(),bestAxis=new THREE.Vector3();let best=0;
      const consider=n=>{
        if(n.lengthSq()<1e-10)return;n.normalize();
        const gap=Math.min(...vertices.map(p=>p.dot(n)))-Math.max(...seam.map(p=>p.dot(n)));
        if(gap>best){best=gap;bestAxis.copy(n);}
      };
      consider(normal.subVectors(pose.points.head.pos,pose.points.chest.pos));
      for(let i=0;i<(index?.count??a.count);i+=3){
        const v=[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]);
        normal.subVectors(v[1],v[0]).cross(edge.subVectors(v[2],v[0]));consider(normal);consider(normal.negate());
      }
      if(best>1e-5){
        const scale=mesh.getWorldScale(new THREE.Vector3()),local=new Float64Array(a.count*3);
        for(let i=0;i<a.count;i++){normal.fromBufferAttribute(a,i).multiply(scale);normal.toArray(local,i*3);}
        this.separation={axis:bestAxis.clone().applyQuaternion(this.inverse),edge:Math.max(...seam.map(p=>p.clone().sub(pose.points.chest.pos).dot(bestAxis))),margin:Math.min(.04,best*.5),vertices:local};
      }
    }
  }
  solve(){
    const p=this.pose.points;this.pose.frame(this.chest);
    this.axis.copy(this.rest).applyQuaternion(this.chest.frame);
    this.direction.subVectors(p.head.pos,p.chest.pos);const length=this.direction.length();if(length<1e-8)return;
    this.direction.divideScalar(length);const dot=this.direction.dot(this.axis),limit=.55;
    if(dot<Math.cos(limit)){
      this.side.copy(this.direction).addScaledVector(this.axis,-dot);
      if(this.side.lengthSq()<1e-10)this.side.set(1,0,0).applyQuaternion(this.chest.frame).addScaledVector(this.axis,-this.side.dot(this.axis));
      this.direction.copy(this.axis).multiplyScalar(Math.cos(limit)).addScaledVector(this.side.normalize(),Math.sin(limit));
    }
    p.head.pos.copy(p.chest.pos).addScaledVector(this.direction,this.length);
    // The angular cap alone is not a clearance guarantee for a big head on a
    // short body. Preserve a measured separating plane from the real captured
    // head and sewn shoulder row, in the moving chest frame.
    const s=this.separation;if(!s)return;
    this.source.copy(this.direction);this.restAxis.copy(this.rest).applyQuaternion(this.chest.frame);
    this.axis.copy(s.axis).applyQuaternion(this.chest.frame);
    if(this.clearance()>=s.margin)return;
    // Search toward the captured, clear neck direction on a sphere, never by
    // translating the head away from its joint. Big heads must lose unsafe
    // swing range, not acquire a longer neck when they touch a wall.
    let low=0,high=1;
    for(let it=0;it<10;it++){
      const t=(low+high)*.5;this.direction.lerpVectors(this.source,this.restAxis,t).normalize();
      p.head.pos.copy(p.chest.pos).addScaledVector(this.direction,this.length);
      if(this.clearance()>=s.margin)high=t;else low=t;
    }
    this.direction.lerpVectors(this.source,this.restAxis,high).normalize();p.head.pos.copy(p.chest.pos).addScaledVector(this.direction,this.length);
  }
  clearance(){
    const p=this.pose.points,s=this.separation;
    this.pose.frame(this.head);this.headRotation.copy(this.head.frame).multiply(this.head.offset).invert();
    this.localAxis.copy(this.axis).applyQuaternion(this.headRotation);let support=Infinity;
    for(let i=0;i<s.vertices.length;i+=3)support=Math.min(support,s.vertices[i]*this.localAxis.x+s.vertices[i+1]*this.localAxis.y+s.vertices[i+2]*this.localAxis.z);
    return this.offset.subVectors(p.head.pos,p.chest.pos).dot(this.axis)+support-s.edge;
  }
}
