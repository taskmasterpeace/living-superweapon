import * as T from 'three';
const inverse=new T.Matrix4(),start=new T.Vector3(),end=new T.Vector3(),direction=new T.Vector3(),point=new T.Vector3(),scale=new T.Vector3(),ray=new T.Ray(),box=new T.Box3();
// Native collision proxies follow the animated anatomy. This avoids deriving
// headshots from a generous whole-body cylinder or camera-space height.
export function anatomicalBulletContact(f,a,b,radius=0){
 const p=f.parts;if(!p)return null;f.obj.updateMatrixWorld(true);
 const regions=[['head',p.head],['torso',p.torso],['torso',p.pelvis]];
 for(const [side,arm,leg] of [['L',p.armL,p.legL],['R',p.armR,p.legR]]){
  if(arm)for(const part of arm.children.slice(0,3))regions.push(['arm'+side,part]);
  if(leg)for(const part of [leg.userData.thigh,leg.userData.shin,leg.userData.boot])regions.push(['leg'+side,part]);
 }
 let best=null;
 for(const [zone,part]of regions){if(!part?.geometry)continue;const geometry=part.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();
  inverse.copy(part.matrixWorld).invert();start.copy(a).applyMatrix4(inverse);end.copy(b).applyMatrix4(inverse);direction.subVectors(end,start);const length=direction.length();if(length<1e-8)continue;
  part.getWorldScale(scale);box.copy(geometry.boundingBox).expandByScalar(radius/Math.max(.001,Math.min(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z))));ray.set(start,direction.divideScalar(length));
  let t;if(box.containsPoint(start))t=0;else{if(!ray.intersectBox(box,point))continue;t=point.distanceTo(start)/length;}if(t>1||best&&t>=best.t)continue;best={t,zone};
 }return best;
}
