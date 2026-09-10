import * as THREE from 'three';

// Ray parity against the real closed torso triangles, binned only to prune work.
// Receives a world vertex and the inverse torso matrix; no proxy capsule/box verdict.
export function trunkProbe(mesh){
 const bins=new Map();let version=-1,attribute;
 function refresh(){
  const pos=mesh.geometry.attributes.position,ix=mesh.geometry.index;
  if(pos===attribute&&version===pos.version)return;
  attribute=pos;version=pos.version;bins.clear();mesh.geometry.computeBoundingBox();
  for(let i=0;i<(ix?ix.count:pos.count);i+=3){
   const tri=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(pos,ix?ix.getX(i+k):i+k)),box=new THREE.Box3().setFromPoints(tri);
   for(let row=Math.floor(box.min.y*10);row<=Math.floor(box.max.y*10);row++){
    if(!bins.has(row))bins.set(row,[]);bins.get(row).push({tri,box});
   }
  }
 }
 const direction=new THREE.Vector3(0,0,1);
 return (world,inverse)=>{
  refresh();const point=world.clone().applyMatrix4(inverse);
  // Move the ray off shared triangle edges by sub-Float32 precision. Otherwise
  // a 1e-17 transform roundoff on x=0 can miss both triangles on the radial seam.
  point.x+=1e-9;point.y+=3e-9;
  if(!mesh.geometry.boundingBox.containsPoint(point))return false;
  const ray=new THREE.Ray(point,direction),hits=[];
  for(const {tri,box}of bins.get(Math.floor(point.y*10))||[]){
   if(point.x<box.min.x||point.x>box.max.x||point.y<box.min.y||point.y>box.max.y)continue;
   const hit=ray.intersectTriangle(...tri,false,new THREE.Vector3());
   if(hit&&hit.distanceTo(point)>1e-5&&!hits.some(p=>p.distanceTo(hit)<1e-5))hits.push(hit);
  }
  return hits.length%2===1;
 };
}
