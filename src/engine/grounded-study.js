import {Vector3} from 'three';
// Bake vertical visual-hip correction from actual rig foot anchors. This is
// authoring support, not runtime terrain collision or full foot IK.
export function groundStudyKeys(actor,motion){
 const hips=actor.getObjectByName('DEF-hips'),feet=['DEF-footL','DEF-footR'].map(n=>actor.getObjectByName(n));
 if(!hips||feet.some(f=>!f))throw Error('Grounded study requires hips and both feet');
 const saved=[];actor.traverse(o=>{if(o.isBone)saved.push([o,o.quaternion.clone()]);});const base=hips.position.clone(),point=new Vector3();let floor;
 try{
  for(const key of motion.keys){
   hips.position.copy(base);for(const [name,q]of Object.entries(key.pose))actor.getObjectByName(name)?.quaternion.fromArray(q);actor.updateMatrixWorld(true);
   const height=Math.min(...feet.map(foot=>foot.getWorldPosition(point).y));floor??=height;
   hips.getWorldPosition(point);point.y+=floor-height;hips.position.copy(hips.parent.worldToLocal(point));key.bodyPosition=hips.position.toArray();
  }
 }finally{hips.position.copy(base);for(const [bone,q]of saved)bone.quaternion.copy(q);actor.updateMatrixWorld(true);}
 return motion;
}
