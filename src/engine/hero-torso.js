import {anatomyGeometry} from './hero-rig.js';
import {BufferGeometry,Float32BufferAttribute} from 'three';

// Original hero sculpt, not an imported animation/model. The existing chest
// envelope and driven socket remain authoritative; detail is one closed mesh.
const RINGS=[[-1.6,.82,.50],[-1.05,.94,.58],[-.25,1.30,.73],[.65,1.57,.80],[1.18,1.51,.64],[1.42,.68,.44]];
const gaussian=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function slope(i,k){
 const segment=j=>(RINGS[j+1][k]-RINGS[j][k])/(RINGS[j+1][0]-RINGS[j][0]);
 if(i===0)return segment(0);if(i===RINGS.length-1)return segment(i-1);
 const a=segment(i-1),b=segment(i);
 return a*b<=0?0:Math.sign(a)*Math.min(Math.abs((a+b)*.5),2*Math.abs(a),2*Math.abs(b));
}
function section(y,k){
 y=clamp(y,RINGS[0][0],RINGS.at(-1)[0]);
 const i=Math.min(RINGS.length-2,Math.max(0,RINGS.findIndex((r,j)=>j<RINGS.length-1&&y<=RINGS[j+1][0])));
 const a=RINGS[i],b=RINGS[i+1],span=b[0]-a[0],t=(y-a[0])/span,t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*span*slope(i,k)+(-2*t3+3*t2)*b[k]+(t3-t2)*span*slope(i+1,k);
}

// Used by cloth and insignia too: attachments follow the actual chest instead
// of floating on hard-coded planes when the author changes definition.
export function torsoDepth(x,y,definition=.7,side=1){
 const width=section(y,1),depth=section(y,2),edge=Math.max(0,1-(x/width)**2),ax=Math.abs(x);
 const hem=clamp((y+1.45)/.4,0,1);
 const d=(Number.isFinite(definition)?clamp(definition,0,1):.7)*hem*hem*(3-2*hem);
 const smooth=depth*Math.sqrt(edge);
 let relief;
 if(side>0){
  relief=.095*gaussian(ax,.68,.49)*gaussian(y,.60,.40)
   -.050*gaussian(x,0,.13)*gaussian(y,.58,.56)
   -.058*gaussian(y,.13+.08*(ax/.9)**2,.095)*gaussian(x,0,1.15)
   +.043*gaussian(ax,.34,.25)*[-.32,-.68,-1.04].reduce((n,cy)=>n+gaussian(y,cy,.17),0)
   -.037*gaussian(x,0,.09)*gaussian(y,-.66,.58)
   +.030*gaussian(ax,.86,.20)*gaussian(y,-.54,.47)
   +.032*gaussian(y,1.09-.15*(ax/.9),.075)*gaussian(ax,.66,.48);
 }else{
  relief=.095*gaussian(ax,.64,.43)*gaussian(y,.62,.43)
   -.048*gaussian(x,0,.13)*gaussian(y,.2,.92)
   +.033*gaussian(ax,.97,.25)*gaussian(y,-.02,.45)
   +.040*gaussian(ax,.27,.18)*gaussian(y,-.68,.58);
 }
 const sculpt=depth*(side>0?.90:.91)*edge**(side>0?.35:.40)+relief*Math.sqrt(edge);
 return side*clamp(smooth+(sculpt-smooth)*d,0,.8);
}

export function heroTorsoGeometry(definition=.7){
 const rings=[];
 // Keep authored anatomical landmarks, subdividing without changing the
 // envelope. Monotone interpolation avoids rings overshooting the shoulder.
 for(let i=0;i<RINGS.length-1;i++){
  const count=Math.ceil((RINGS[i+1][0]-RINGS[i][0])/.085);
  for(let j=0;j<count;j++){const y=RINGS[i][0]+(RINGS[i+1][0]-RINGS[i][0])*j/count;rings.push([y,section(y,1),section(y,2)]);}
 }
 rings.push([...RINGS.at(-1)]);
 const segments=48,geo=anatomyGeometry(rings,segments),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  // Cap centres remain internal; all boundary vertices sample the same loft.
  if(z===0&&x===0)continue;
  p.setZ(i,torsoDepth(x,y,definition,z<0?-1:1));
 }
 // The muscle relief is not an ellipse: its off-axis flanks can sit outside
 // the original loft. Bound actual Float32 vertices once, per definition.
 // Endpoint-max ellipses enclose the linear triangles between these rows.
 // This rest envelope does not claim to enclose the later animated waist hem.
 geo.userData.contactRings=rings.map(([y,width,depth],row)=>{
  let factor=1;
  for(let i=0;i<=segments;i++){
   const index=row*(segments+1)+i;
   factor=Math.max(factor,Math.hypot(p.getX(index)/width,p.getZ(index)/depth));
  }
  return [p.getY(row*(segments+1)),width*(factor+1e-7),depth*(factor+1e-7)];
 });
 geo.computeVertexNormals();const n=geo.attributes.normal;
 for(let r=0;r<rings.length;r++){
  const a=r*(segments+1),b=a+segments,x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),length=Math.hypot(x,y,z)||1;
  n.setXYZ(a,x/length,y/length,z/length);n.setXYZ(b,x/length,y/length,z/length);
 }
 geo.userData.definition=definition;
 geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}

export function heroInsigniaGeometry(definition=.7){
 const vertices=[],normals=[],indices=[],steps=6,radius=.43,epsilon=.001;
 for(let sector=0;sector<6;sector++){
  const a=sector*Math.PI/3,b=a+Math.PI/3,base=vertices.length/3;
  const at=(i,j)=>base+i*(steps+1)-i*(i-1)/2+j;
  for(let i=0;i<=steps;i++)for(let j=0;j<=steps-i;j++){
   const x=radius*(Math.cos(a)*i+Math.cos(b)*j)/steps,y=radius*(Math.sin(a)*i+Math.sin(b)*j)/steps;
   vertices.push(x,y,torsoDepth(x,y+.45,definition)+.025);
   // Sample the continuous surface normal, including duplicated sector edges.
   // Per-sector face averaging would put six differently shaded wedges here.
   const dx=(torsoDepth(x+epsilon,y+.45,definition)-torsoDepth(x-epsilon,y+.45,definition))/(2*epsilon);
   const dy=(torsoDepth(x,y+.45+epsilon,definition)-torsoDepth(x,y+.45-epsilon,definition))/(2*epsilon),length=Math.hypot(dx,dy,1);
   normals.push(-dx/length,-dy/length,1/length);
  }
  for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){
   indices.push(at(i,j),at(i+1,j),at(i,j+1));
   if(j<steps-i-1)indices.push(at(i+1,j),at(i+1,j+1),at(i,j+1));
  }
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));geometry.setIndex(indices);return geometry;
}
