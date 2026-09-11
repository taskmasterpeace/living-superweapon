// Authored fractured bedrock benches, in world units. These are sampled into
// the native heightfield, never drawn as non-colliding rocks over the ground.
// Width/depth describe the surviving cap; 1:1 bevel planes connect its broken
// edges into adjacent talus and the valley sediment below.
const NEAR=[
 [-220,-185,70,90,62,-.20],[-235,170,110,95,87,.15],
 [-225,370,100,125,78,-.10],[-235,560,90,120,65,.25],
 [-420,90,150,160,117,.10],[-390,340,135,115,110,-.12],
 [230,-145,110,115,76,.18],[235,190,110,100,90,-.15],
 [240,420,130,110,96,.22],[230,640,110,100,77,-.18],
 [410,40,155,140,120,.10],[440,390,135,150,117,-.08],
 // Fallen neighbouring sections form stepped foothills rather than a single
 // giant smooth bank. Their caps are tilted differently along the fault.
 [-180,300,48,66,41,-.33],[-175,475,42,60,37,.25],
 [-305,275,62,54,92,.38],[-335,-90,64,82,96,-.26],
 [185,355,46,62,45,.32],[175,525,42,58,37,-.27],
 [310,265,68,60,101,-.32],[335,-80,80,62,105,.21],
];
const DISTANT=[
 [-680,1180,380,260,155,.11],[740,1250,430,270,168,-.15],
 [-1080,1660,520,340,230,-.14],[1200,1800,610,390,244,.12],
 [-520,2190,430,370,142,.19],[560,2480,460,350,159,-.20],
 [-1740,2650,720,470,280,.13],[1870,2860,780,480,305,-.08],
 [-1150,3520,620,510,232,-.17],[1260,3800,720,550,257,.19],
 [-2550,4360,1050,650,370,.13],[2680,4630,1120,760,390,-.11],
];

export const FRONTLINE_BEDROCK=[...NEAR,...DISTANT].map(([x,z,width,depth,top,yaw],i)=>({
 x,z,hx:width*.5,hz:depth*.5,top,cos:Math.cos(yaw),sin:Math.sin(yaw),
 reach:Math.hypot(width*.5,depth*.5)+(top+32)/.8,
 tiltX:Math.sin(i*2.3)*.035,tiltZ:Math.cos(i*1.7)*.025,
}));

export function sampleFrontlineBedrock(x,z){
 let height=0;
 for(const s of FRONTLINE_BEDROCK){
  const dx=x-s.x,dz=z-s.z;
  if(Math.abs(dx)>s.reach||Math.abs(dz)>s.reach)continue;
  const lx=dx*s.cos+dz*s.sin,lz=-dx*s.sin+dz*s.cos;
  // Intersected planar fracture faces produce angular chamfered slabs, not
  // rounded cones. Max-union joins their feet into one physical land surface.
  const outside=Math.max(0,Math.abs(lx)-s.hx,Math.abs(lz)-s.hz,
   Math.abs(lx+lz)*.70710678-(s.hx+s.hz)*.57,
   Math.abs(lx-lz)*.70710678-(s.hx+s.hz)*.61);
  height=Math.max(height,s.top+lx*s.tiltX+lz*s.tiltZ-outside*.85);
 }
 // A geologically open battle corridor, independent of individual slab spans.
 return Math.max(0,Math.min(height,(Math.abs(x)-125)*.9));
}
