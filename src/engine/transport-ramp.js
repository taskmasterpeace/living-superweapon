import * as THREE from 'three';
// Ramp risers are authored in vehicle coordinates at the open pose.
// Move their bounds with the same hinge that owns the visible ramp.
export function transportRampBounds(box,model,hinge,out=new THREE.Box3()){
 const center=new THREE.Vector3(...box.center).sub(hinge.position),half=new THREE.Vector3(...box.half);
 out.min.copy(center).sub(half);out.max.copy(center).add(half);
 return out.applyMatrix4(hinge.matrixWorld);
}

// Use the actual eight panel corners, not the bounding box of the open slope.
// Bounding that open box before rotating would create a thick invisible wall.
export function transportRampPanelBounds(walk,hinge,out=new THREE.Box3()){
 out.makeEmpty();
 for(const x of [-walk.width/2,walk.width/2])for(const [z,y,thickness]of [[walk.endZ,walk.endY,.7],[walk.startZ,walk.startY,.5]])for(const lower of [0,thickness]){
  const point=new THREE.Vector3(x,y-lower,z).sub(hinge.position).applyMatrix4(hinge.matrixWorld);out.expandByPoint(point);
 }
 return out;
}
