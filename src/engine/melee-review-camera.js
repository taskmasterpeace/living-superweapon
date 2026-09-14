// Editorial replay only: never drives the live gameplay camera or simulation.
const ANGLES=[[1,.3,-.65],[1,.22,.55],[1,.65,.05]];
// Deterministic editorial camera: find the latest moving thrown actor rather
// than retaining mutable playback state (backward scrubbing must match).
export function throwReviewShot(frames,time){
 let selected=null;
 for(const frame of frames){
  if(frame.time>time)break;
  frame.actors.forEach((actor,index)=>{
   const v=actor.velocity;
   if(actor.thrown&&v?.length===3&&v.every(Number.isFinite)&&Math.hypot(...v)>1)selected={actor:index,velocity:v};
  });
 }
 if(!selected)return null;
 const v=selected.velocity,s=Math.hypot(...v),forward=v.map(n=>n/s);
 const horizontal=Math.hypot(forward[0],forward[2]);
 const side=horizontal>.001?[forward[2]/horizontal,0,-forward[0]/horizontal]:[1,0,0];
 const offset=forward.map((n,i)=>n*18+side[i]*16+(i===1?5:0));
 return {actor:selected.actor,offset};
}
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
