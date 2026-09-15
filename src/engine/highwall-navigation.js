// Ground-only bounded routing. Collision remains authoritative during movement.
export class HighwallNavigation {
 constructor({bounds,solids=[],cellSize=6,revision=1}){
  if(!bounds||!Object.values(bounds).every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid navigation bounds');
  this.bounds={...bounds};this.cellSize=Math.max(1,Number.isFinite(cellSize)?cellSize:6);
  this.replace(solids,revision);
 }
 replace(solids,revision){this.solids=solids.map(s=>({...s}));this.revision=revision;this.cache=new Map();this.buckets=new Map();this.candidates=new Map();
  for(const o of this.solids)for(let z=Math.floor((o.z-o.hz)/32);z<=Math.floor((o.z+o.hz)/32);z++)for(let x=Math.floor((o.x-o.hx)/32);x<=Math.floor((o.x+o.hx)/32);x++){
   const key=x+','+z;if(!this.buckets.has(key))this.buckets.set(key,[]);this.buckets.get(key).push(o);
  }
 }
 _shape({radius=3,height=10}={}){return {radius:Math.max(0,Number.isFinite(radius)?radius:3),height:Math.max(0,Number.isFinite(height)?height:10)};}
 _boxes(shape,a,b=a){
  const r=shape.radius,x0=Math.floor((Math.min(a.x,b.x)-r)/32),x1=Math.floor((Math.max(a.x,b.x)+r)/32),z0=Math.floor((Math.min(a.z,b.z)-r)/32),z1=Math.floor((Math.max(a.z,b.z)+r)/32);
  const key=[x0,x1,z0,z1,shape.height].join(',');let found=this.candidates.get(key);if(found)return found;
  const unique=new Set();for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)for(const o of this.buckets.get(x+','+z)||[])if((o.bottom??0)<=shape.height&&(o.top??Infinity)>0)unique.add(o);
  found=[...unique];if(this.candidates.size>=1024)this.candidates.delete(this.candidates.keys().next().value);this.candidates.set(key,found);return found;
 }
 isClear(p,options){
  const s=this._shape(options),b=this.bounds,r=s.radius;
  if(!p||!Number.isFinite(p.x+p.z)||p.x-r<b.minX||p.x+r>b.maxX||p.z-r<b.minZ||p.z+r>b.maxZ)return false;
  return !this._boxes(s,p).some(o=>Math.abs(p.x-o.x)<=o.hx+r&&Math.abs(p.z-o.z)<=o.hz+r);
 }
 segmentClear(a,b,options){
  if(!this.isClear(a,options)||!this.isClear(b,options))return false;
  const s=this._shape(options),dx=b.x-a.x,dz=b.z-a.z;
  for(const o of this._boxes(s,a,b)){
   let lo=0,hi=1;
   for(const [v,d,mn,mx] of [[a.x,dx,o.x-o.hx-s.radius,o.x+o.hx+s.radius],[a.z,dz,o.z-o.hz-s.radius,o.z+o.hz+s.radius]]){
    if(Math.abs(d)<1e-10){if(v<mn||v>mx){lo=2;break;}}
    else {const t1=(mn-v)/d,t2=(mx-v)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
   }
   if(lo<=hi)return false;
  }
  return true;
 }
 route(start,end,options){
  const shape=this._shape(options),key=JSON.stringify([start.x,start.z,end.x,end.z,shape]);
  if(this.cache.has(key))return this._copy(this.cache.get(key));
  const finish=points=>{const result=points?{points,revision:this.revision}:null;if(this.cache.size>=128)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,result);return this._copy(result);};
  if(!this.isClear(start,shape)||!this.isClear(end,shape))return finish(null);
  if(this.segmentClear(start,end,shape))return finish([{...start},{...end}]);
  const b=this.bounds,c=this.cellSize,nx=Math.floor((b.maxX-b.minX)/c)+1,nz=Math.floor((b.maxZ-b.minZ)/c)+1;
  if(nx*nz>65536)return finish(null);
  const point=id=>({x:b.minX+(id%nx)*c,z:b.minZ+Math.floor(id/nx)*c});
  const nearby=p=>{const list=[],ix=Math.round((p.x-b.minX)/c),iz=Math.round((p.z-b.minZ)/c);for(let z=iz-2;z<=iz+2;z++)for(let x=ix-2;x<=ix+2;x++)if(x>=0&&z>=0&&x<nx&&z<nz){const id=z*nx+x,q=point(id);if(this.segmentClear(p,q,shape))list.push({id,d:Math.hypot(p.x-q.x,p.z-q.z)});}return list.sort((a,b)=>a.d-b.d).slice(0,8);};
  const starts=nearby(start),ends=new Set(nearby(end).map(v=>v.id));if(!starts.length||!ends.size)return finish(null);
  const open=[],cost=new Map(),parent=new Map(),closed=new Set();
  const h=id=>{const p=point(id);return Math.hypot(p.x-end.x,p.z-end.z);};
  for(const s of starts){cost.set(s.id,s.d);open.push({id:s.id,f:s.d+h(s.id)});}
  let found=null,expanded=0;
  while(open.length&&expanded++<8192){
   let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
   const {id}=open.splice(best,1)[0];if(closed.has(id))continue;closed.add(id);
   if(ends.has(id)){found=id;break;}
   const x=id%nx,z=Math.floor(id/nx),p=point(id);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dz||x+dx<0||z+dz<0||x+dx>=nx||z+dz>=nz)continue;
    const next=(z+dz)*nx+x+dx,q=point(next);if(closed.has(next)||!this.segmentClear(p,q,shape))continue;
    if(dx&&dz&&(!this.isClear(point(z*nx+x+dx),shape)||!this.isClear(point((z+dz)*nx+x),shape)))continue;
    const g=cost.get(id)+Math.hypot(dx,dz)*c;if(g>=(cost.get(next)??Infinity))continue;
    cost.set(next,g);parent.set(next,id);open.push({id:next,f:g+h(next)});
   }
  }
  if(found===null)return finish(null);
  const raw=[{...end}];for(let id=found;id!==undefined;id=parent.get(id))raw.push(point(id));raw.push({...start});raw.reverse();
  const smooth=[raw[0]];for(let i=0;i<raw.length-1;){let j=raw.length-1;while(j>i+1&&!this.segmentClear(raw[i],raw[j],shape))j--;smooth.push(raw[j]);i=j;}
  return finish(smooth);
 }
 _copy(result){return result?{revision:result.revision,points:result.points.map(p=>({...p}))}:null;}
}
