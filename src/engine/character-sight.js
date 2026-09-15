// Rendering visibility is derived from the character's view, never the orbit camera.
// The existing exact world LOS remains the obstruction authority.
export function characterSees(game,viewer,target){
 if(!viewer||!target?.pos)return false;
 if(viewer===target)return true;
 if(!viewer.alive||viewer.blindT>0)return false;
 const dx=target.pos.x-viewer.pos.x,dy=target.pos.y-viewer.pos.y,dz=target.pos.z-viewer.pos.z;
 const d=Math.hypot(dx,dy,dz),range=(game.visRange||96)*(viewer.sheet?.visMult||1);
 if(d>range)return false;
 const a=viewer.aim3||{x:viewer.aim.x,y:0,z:viewer.aim.z};
 const forward=(dx*a.x+dy*(a.y||0)+dz*a.z)/Math.max(d,1e-6);
 if(d>.01&&forward<(game.visCos??Math.cos(.96)))return false;
 // Even near allies and luminous attackers must be behind no solid obstruction.
 return game.canSee(viewer,target);
}
