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
