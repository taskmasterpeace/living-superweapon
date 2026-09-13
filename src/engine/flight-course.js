// A closed elevated circuit; normals follow the tangent through each gate.
export function facilityFlightCourse(count=16){
 return Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2;return {position:{x:220*Math.sin(a),y:125+35*Math.sin(a*2),z:220*Math.cos(a)},normal:{x:Math.cos(a),y:70/220*Math.cos(a*2),z:-Math.sin(a)}};});
}
// Swept segment/plane crossings prevent fast flight from skipping gates.
export function crossedFlightRings(rings,index,from,to,radius=14){
 const crossed=[];let previousT=-1;
 for(let count=0;count<rings.length;count++){
  const gate=rings[(index+count)%rings.length],ring=gate.position,n=gate.userData?.flightNormal||gate.normal||{x:0,y:0,z:1};
  const dot=p=>(p.x-ring.x)*n.x+(p.y-ring.y)*n.y+(p.z-ring.z)*n.z;
  const a=dot(from),b=dot(to);if(a===b||a*b>0)break;
  const t=a/(a-b);if(t<=previousT)break;
  const x=from.x+(to.x-from.x)*t-ring.x,y=from.y+(to.y-from.y)*t-ring.y,z=from.z+(to.z-from.z)*t-ring.z;
  if(Math.hypot(x,y,z)>=radius)break;
  crossed.push((index+count)%rings.length);previousT=t;
 }
 return crossed;
}
