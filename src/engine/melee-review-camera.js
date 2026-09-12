// Editorial replay only: never drives the live gameplay camera or simulation.
const ANGLES=[[1,.3,-.65],[1,.22,.55],[1,.65,.05]];
export function cinematicReviewShot(events,time,start=0){
 let last=start-.4,index=0;
 for(const event of events){
  if(event.time>time)break;
  if(event.time<start||event.kind!=='contact'||event.time-last<.4)continue;
  last=event.time;index++;
 }
 return {index,offset:ANGLES[index%ANGLES.length]};
}

// Fit every recorded actor with body-height padding in either viewport orientation.
export function reviewGroupFrame(points,fov=45,aspect=1){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of points)for(const [i,key]of ['x','y','z'].entries()){min[i]=Math.min(min[i],p[key]);max[i]=Math.max(max[i],p[key]);}
 const center=min.map((v,i)=>(v+max[i])/2);center[1]+=5;
 let radius=12;for(const p of points)radius=Math.max(radius,Math.hypot(p.x-center[0],p.y+5-center[1],p.z-center[2])+12);
 const vertical=fov*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*Math.max(.1,aspect));
 return {center,distance:radius/Math.sin(Math.min(vertical,horizontal))};
}
