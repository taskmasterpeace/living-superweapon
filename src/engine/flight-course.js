// Ordered swept crossings: one fast simulation step may pass several rings.
export function crossedFlightRings(rings,index,from,to,radius=14){
 const crossed=[];let previousT=-1;
 for(let count=0;count<rings.length;count++){
  const ring=rings[(index+count)%rings.length].position,a=from.z-ring.z,b=to.z-ring.z;
  if(a===b||a*b>0)break;
  const t=a/(a-b);if(t<=previousT)break;
  const x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t;
  if(Math.hypot(x-ring.x,y-ring.y)>=radius)break;
  crossed.push((index+count)%rings.length);previousT=t;
 }
 return crossed;
}
