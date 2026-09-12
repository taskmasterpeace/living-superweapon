// Ground-route search uses the same clearance and support checks as manual driving.
// Every accepted edge is swept; a clear endpoint cannot bridge a wall or ravine.
export function planConvoyRoute(driving,vehicle,start,goal,{step=24,maxNodes=12000}={}){
 const key=(x,z)=>`${x},${z}`,open=[{x:0,z:0,g:0,f:0}],seen=new Map(),closed=new Set();
 const at=n=>({x:start.x+n.x*step,z:start.z+n.z*step});
 function edge(a,b){
  const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/2)),yaw=Math.atan2(b.x-a.x,b.z-a.z);let prev=driving._surface(a.x,a.z,yaw);
  if(prev===null)return false;
  for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,h=driving._surface(x,z,yaw);
   if(h===null||Math.abs(h-prev)>1||!driving._clear(x,z,vehicle.driveRadius+2,vehicle.cover,h,h+12))return false;prev=h;}
  return true;
 }
 seen.set(key(0,0),open[0]);
 while(open.length&&closed.size<maxNodes){
  open.sort((a,b)=>a.f-b.f);const current=open.shift(),k=key(current.x,current.z);if(closed.has(k))continue;closed.add(k);
  const p=at(current);
  if(Math.hypot(p.x-goal.x,p.z-goal.z)<step*1.5&&edge(p,goal)){
   const route=[goal];for(let c=current;c;c=c.parent)route.push(at(c));return route.reverse();
  }
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=current.x+dx,z=current.z+dz,nk=key(x,z);if(closed.has(nk))continue;
   const q=at({x,z}),cost=current.g+Math.hypot(dx,dz)*step;if(seen.get(nk)?.g<=cost||!edge(p,q))continue;
   const next={x,z,g:cost,f:cost+Math.hypot(q.x-goal.x,q.z-goal.z),parent:current};seen.set(nk,next);open.push(next);
  }
 }
 return null;
}
