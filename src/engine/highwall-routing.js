// Route known orders/beliefs, never hidden opponents' actual positions.
export function routeHighwallIntent(nav,f,it,dt,objective){
 if(f.flying||f.pos.y>3||f.grabbedBy||f.launchT>0||f._thrownT>0||f.stunT>0)return it;
 const goal=it.target?.pos||((f.ai?.belief&&f.ai?._mem>0)?it.navigationGoal:null)||objective;
 if(!goal)return it;
 const shape={radius:Math.max(.5,(f.radius||2.2)-.01),height:12*(f.sizeScale||1)};
 // Preserve native combat range/strafe choices when the visible target has a clear route.
 if(it.target&&nav.segmentClear(f.pos,goal,shape))return it;
 let state=f._highwallRoute;
 if(!state||state.revision!==nav.revision||Math.hypot(goal.x-state.goal.x,goal.z-state.goal.z)>12||state.ttl<=0){
  const path=nav.route(f.pos,goal,shape);
  state=f._highwallRoute={revision:nav.revision,goal:{x:goal.x,z:goal.z},points:path?.points.slice(1)||[],ttl:2,blocked:!path};
 }
 state.ttl-=dt;
 while(state.points.length&&Math.hypot(state.points[0].x-f.pos.x,state.points[0].z-f.pos.z)<3)state.points.shift();
 const p=state.points[0];
 if(!p||!nav.segmentClear(f.pos,p,shape)){it.move={x:0,z:0};if(p)state.ttl=0;return it;}
 const dx=p.x-f.pos.x,dz=p.z-f.pos.z,d=Math.hypot(dx,dz);
 it.move={x:dx/d,z:dz/d};
 if(!it.target)it.aimDir=it.move;
 return it;
}
