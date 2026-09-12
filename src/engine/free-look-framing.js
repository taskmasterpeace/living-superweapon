import {Vector3} from 'three';

const point=new Vector3();

// Constrain only the viewing pitch. The separately captured combat ray and
// shoulder-relative head look remain unchanged, as does the camera lens.
export function frameFreeLook(camera,subject,focus){
 const dx=focus.x-camera.position.x,dz=focus.z-camera.position.z;
 const distance=Math.hypot(dx,dz);
 if(distance<.001)return;
 const fx=dx/distance,fz=dz/distance;
 const half=Math.atan(.86*Math.tan(camera.fov*Math.PI/360));
 let lower=-Math.PI/2+.001,upper=Math.PI/2-.001;
 const parts=subject.parts;
 subject.obj?.updateWorldMatrix(true,true);
 for(const anchor of [parts?.head,parts?.torso,parts?.legL?.userData?.boot,parts?.legR?.userData?.boot]){
  if(!anchor)continue;
  anchor.getWorldPosition(point);
  const depth=(point.x-camera.position.x)*fx+(point.z-camera.position.z)*fz;
  if(depth<=camera.near)continue;
  const angle=Math.atan2(point.y-camera.position.y,depth);
  lower=Math.max(lower,angle-half);upper=Math.min(upper,angle+half);
 }
 // A compressed boom can make the rig taller than the available frame.
 // Center that span instead of widening the lens or choosing one extremity.
 const desired=Math.atan2(focus.y-camera.position.y,distance);
 const pitch=lower<=upper?Math.max(lower,Math.min(upper,desired)):(lower+upper)*.5;
 focus.y=camera.position.y+Math.tan(pitch)*distance;
}
