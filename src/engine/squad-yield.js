// Yield through an opening when its frame prevents a sideways step.
export function squadYieldMove(f,leader,cover,side=1){
 const motion=leader.moveDir,length=motion&&Math.hypot(motion.x,motion.z);if(!(length>.2))return null;
 const mx=motion.x/length,mz=motion.z/length,dx=f.pos.x-leader.pos.x,dz=f.pos.z-leader.pos.z,d=Math.hypot(dx,dz);
 if(d<.01||d>=14||(dx*mx+dz*mz)/d<=.25||Math.abs(f.pos.y-leader.pos.y)>8)return null;
 const candidates=[{x:mz*side,z:-mx*side},{x:-mz*side,z:mx*side},{x:mx,z:mz}];
 const radius=f.radius||2.2;
 for(const move of candidates){let free=true;for(let step=1;step<=4&&free;step++){const x=f.pos.x+move.x*step*2,z=f.pos.z+move.z*step*2;free=!cover.some(c=>c.buildingRole!=='step'&&c.top>f.pos.y+1&&(c.bottom??0)<f.pos.y+9&&Math.abs(x-c.x)<(c.hx??c.r??0)+radius&&Math.abs(z-c.z)<(c.hz??c.r??0)+radius);}if(free)return move;}
 return null;
}
