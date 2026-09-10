// Clip source anatomy inside the boot cuff, in bind space, once at construction.
// Removing the actual triangles keeps the visible surface, shadow and picking
// passes consistent; a fragment-only discard would leave bare-toe shadows.
export function aboveBootCuff(source,y){
 const out={...source,position:[],normal:[],uv:[],skinIndex:[],skinWeight:[],index:[]},seen=new Map();
 const put=(key,a,b=a,t=0)=>{
  if(seen.has(key))return seen.get(key);
  const index=out.position.length/3;seen.set(key,index);
  for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
   for(let k=0;k<size;k++)out[name].push(source[name][a*size+k]*(1-t)+source[name][b*size+k]*t);
  }
  const n=index*3,length=Math.hypot(...out.normal.slice(n,n+3));
  for(let k=0;k<3;k++)out.normal[n+k]/=length||1;
  const weights=new Map();
  for(const [vertex,factor] of [[a,1-t],[b,t]])for(let k=0;k<4;k++){
   const joint=source.skinIndex[vertex*4+k],weight=source.skinWeight[vertex*4+k]*factor;
   weights.set(joint,(weights.get(joint)||0)+weight);
  }
  const influences=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),total=influences.reduce((s,p)=>s+p[1],0);
  for(let k=0;k<4;k++){out.skinIndex.push(influences[k]?.[0]??0);out.skinWeight.push((influences[k]?.[1]??0)/total);}
  return index;
 };
 for(let i=0;i<source.index.length;i+=3){
  const triangle=source.index.slice(i,i+3),polygon=[];
  for(let j=0;j<3;j++){
   const a=triangle[j],b=triangle[(j+1)%3],ay=source.position[a*3+1],by=source.position[b*3+1];
   if(ay>=y)polygon.push(put(`v${a}`,a));
   if((ay>=y)!==(by>=y))polygon.push(put(`e${Math.min(a,b)}:${Math.max(a,b)}`,a,b,(y-ay)/(by-ay)));
  }
  for(let j=1;j<polygon.length-1;j++)out.index.push(polygon[0],polygon[j],polygon[j+1]);
 }
 return out;
}

// Front surface depth at a bind-space XY point, using the real source triangles.
// Used to fit modular chest insignia instead of burying it inside a deeper torso.
export function frontDepth(source,x,y){
 let depth=-Infinity;const p=source.position;
 for(let i=0;i<source.index.length;i+=3){
  const a=source.index[i]*3,b=source.index[i+1]*3,c=source.index[i+2]*3;
  if(y<Math.min(p[a+1],p[b+1],p[c+1])||y>Math.max(p[a+1],p[b+1],p[c+1]))continue;
  const den=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(den)<1e-12)continue;
  const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/den;
  const v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/den,w=1-u-v;
  if(Math.min(u,v,w)>=-1e-7)depth=Math.max(depth,u*p[a+2]+v*p[b+2]+w*p[c+2]);
 }
 return depth;
}
