// Route known orders/beliefs, never hidden opponents' actual positions.
export function routeHighwallIntent(nav,f,it,dt,objective){
 if(f.flying||f.grabbedBy||f.launchT>0||f._thrownT>0||f.stunT>0)return it;
 const goal=it.target?.pos||((f.ai?.belief&&f.ai?._mem>0)?it.navigationGoal:null)||objective;
 if(!goal)return it;
 // Small steering margin keeps waypoint arrival from grazing reinforced corners.
 const shape={radius:Math.max(.5,(f.radius||2.2)+.6),height:12*(f.sizeScale||1)};
 if(!nav.supported(f.pos,shape))return it;
 // Preserve native combat range/strafe choices when the visible target has a clear route.
 if(it.target&&nav.walkSegmentClear(f.pos,goal,shape))return it;
 let state=f._highwallRoute;
 if(!state||state.revision!==nav.revision||Math.hypot(goal.x-state.goal.x,goal.z-state.goal.z,(goal.y||0)-(state.goal.y||0))>3||state.ttl<=0){
  let path=nav.route(f.pos,goal,shape),projected=null;
  const exploring=!it.target&&!f._highwallOrder&&it.navigationGoal&&goal===it.navigationGoal;
  if(!path&&exploring){projected=nav.projectSearchGoal(f.pos,goal,shape);path=projected?.path;}
  state=f._highwallRoute={revision:nav.revision,goal:{x:goal.x,y:goal.y||0,z:goal.z},projectedGoal:projected?.goal||null,points:path?.points.slice(1)||[],ttl:2,blocked:!path};
 }
 state.ttl-=dt;
 while(state.points.length&&Math.hypot(state.points[0].x-f.pos.x,state.points[0].z-f.pos.z)<3&&Math.abs((state.points[0].y||0)-(f.pos.y||0))<.2)state.points.shift();
 const p=state.points[0];
 if(!p||!nav.segmentClear(f.pos,p,shape)){it.move={x:0,z:0};if(p)state.ttl=0;return it;}
 const dx=p.x-f.pos.x,dz=p.z-f.pos.z,d=Math.hypot(dx,dz);
 it.move=d>1e-5?{x:dx/d,z:dz/d}:{x:0,z:0};
 if(!it.target)it.aimDir=it.move;
 return it;
}
