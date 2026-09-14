import {Vector3} from 'three';
const head=new Vector3(),scale=new Vector3();
// Apply after body articulation. Indicators stay world-upright but follow the
// final head, including prone/airborne poses and differently sized characters.
export function anchorStatusIndicators(f){
 const p=f.parts;if(!p.head||(!f.stunT&&!f.sleepT))return;
 p.head.getWorldPosition(head);f.obj.worldToLocal(head);
 p.head.getWorldScale(scale);const size=Math.max(.2,Math.abs(scale.y));
 const t=(f._game?.time??f.animT??0);
 if(f.stunT>0)for(let i=0;i<(p.stars?.length||0);i++){
  const a=t*5.2+i*2.094;p.stars[i].position.set(head.x+Math.cos(a)*2.3,head.y+size+Math.sin(t*5.2*.7+i)*.25,head.z+Math.sin(a)*2.3);
 }
 if(f.sleepT>0)for(let i=0;i<(p.zzz?.length||0);i++){
  const a=t*1.1+i*2.094,rise=((t*1.1*.55+i*.333)%1);
  p.zzz[i].position.set(head.x+Math.cos(a)*1.5,head.y+size+rise*2.8,head.z+Math.sin(a)*1.5);
 }
}
