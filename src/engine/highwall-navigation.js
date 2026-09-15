// Bounded ground and support-surface routing. Native collision owns movement.
export class HighwallNavigation {
 constructor({bounds,solids=[],cellSize=4,revision=1}){
  if(!bounds||!Object.values(bounds).every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid navigation bounds');
  this.bounds={...bounds};this.cellSize=Math.max(1,Number.isFinite(cellSize)?cellSize:4);
  this.replace(solids,revision);
 }
 replace(solids,revision){this.solids=solids.map(s=>({...s}));this.hasSupports=this.solids.some(s=>this._standable(s));this.revision=revision;this.cache=new Map();this.searchCache=new Map();this.buckets=new Map();this.candidates=new Map();
  for(const o of this.solids)for(let z=Math.floor((o.z-o.hz)/32);z<=Math.floor((o.z+o.hz)/32);z++)for(let x=Math.floor((o.x-o.hx)/32);x<=Math.floor((o.x+o.hx)/32);x++){
   const key=x+','+z;if(!this.buckets.has(key))this.buckets.set(key,[]);this.buckets.get(key).push(o);
  }
 }
 _shape({radius=3,height=10}={}){return {radius:Math.max(0,Number.isFinite(radius)?radius:3),height:Math.max(0,Number.isFinite(height)?height:10)};}
 _boxes(shape,a,b=a){
  const r=shape.radius,low=Math.min(a.y||0,b.y||0),high=Math.max(a.y||0,b.y||0)+shape.height,x0=Math.floor((Math.min(a.x,b.x)-r)/32),x1=Math.floor((Math.max(a.x,b.x)+r)/32),z0=Math.floor((Math.min(a.z,b.z)-r)/32),z1=Math.floor((Math.max(a.z,b.z)+r)/32);
  const key=[x0,x1,z0,z1,low,high].join(',');let found=this.candidates.get(key);if(found)return found;
  const unique=new Set();for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)for(const o of this.buckets.get(x+','+z)||[])if((o.bottom??0)<=high&&(o.top??Infinity)>low+.05)unique.add(o);
  found=[...unique];if(this.candidates.size>=1024)this.candidates.delete(this.candidates.keys().next().value);this.candidates.set(key,found);return found;
 }
 isClear(p,options){
  const s=this._shape(options),b=this.bounds,r=s.radius;
  if(!p||!Number.isFinite(p.x+p.z)||p.x-r<b.minX||p.x+r>b.maxX||p.z-r<b.minZ||p.z+r>b.maxZ)return false;
  return !this._boxes(s,p).some(o=>Math.abs(p.x-o.x)<=o.hx+r&&Math.abs(p.z-o.z)<=o.hz+r);
 }
 segmentClear(a,b,options){
  if((a.y||0)>.05||(b.y||0)>.05)return this.walkSegmentClear(a,b,options);
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
  const shape=this._shape(options),key=JSON.stringify([start.x,start.y||0,start.z,end.x,end.y||0,end.z,shape]);
  if(this.cache.has(key))return this._copy(this.cache.get(key));
  const finish=points=>{if(!points&&this.hasSupports)points=this._routeLayered(start,end,shape);const result=points?{points,revision:this.revision}:null;if(this.cache.size>=128)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,result);return this._copy(result);};
  if((start.y||0)>.05||(end.y||0)>.05)return finish(null);
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

 // Search beliefs can fall inside geometry. Resolve only the exploratory endpoint,
 // retaining its floor and a bounded 32u neighborhood, never moving the actor.
 projectSearchGoal(start,goal,options){
  const shape=this._shape(options),key=JSON.stringify([start,goal,shape]);
  const copy=v=>v?{goal:{...v.goal},path:this._copy(v.path)}:null;
  if(this.searchCache.has(key))return copy(this.searchCache.get(key));
  const candidates=[],y=goal.y||0;
  if(Number.isFinite(goal.x+goal.z+y)&&this.supported(start,shape)){
   for(let z=-32;z<=32;z+=4)for(let x=-32;x<=32;x+=4){
    const d=Math.hypot(x,z);if(d>32)continue;
    const p={x:goal.x+x,y,z:goal.z+z};
    if(this.supported(p,shape)&&this.isClear(p,shape))candidates.push({p,d});
   }
  }
  candidates.sort((a,b)=>a.d-b.d||Math.hypot(a.p.x-start.x,a.p.z-start.z)-Math.hypot(b.p.x-start.x,b.p.z-start.z));
  let result=null;
  // Full searches are the expensive part; eight candidates is a hard work bound.
  for(const {p} of candidates.slice(0,8)){const path=this.route(start,p,shape);if(path){result={goal:p,path};break;}}
  if(this.searchCache.size>=64)this.searchCache.delete(this.searchCache.keys().next().value);
  this.searchCache.set(key,result);return copy(result);
 }
 _standable(o){return !!o.standable||['step','deck','platform','walkway'].includes(o.kind);}
 _step(o){return o.buildingRole==='step'||o.kind==='step';}
 // Same feet-rooted footprint as native box contact, including its edge overlap.
 // Layer lookup is spatial only: an upper floor must not hide a lower support.
 _supports(p,shape){
  const found=[{y:0,step:false}],r=shape.radius,seen=new Set();
  for(let z=Math.floor((p.z-r)/32);z<=Math.floor((p.z+r)/32);z++)for(let x=Math.floor((p.x-r)/32);x<=Math.floor((p.x+r)/32);x++)for(const o of this.buckets.get(x+','+z)||[]){
   if(seen.has(o)||!this._standable(o))continue;seen.add(o);
   if(Math.abs(p.x-o.x)<=o.hx+r+1e-9&&Math.abs(p.z-o.z)<=o.hz+r+1e-9)found.push({y:o.top,step:this._step(o)});
  }
  return found;
 }
 supported(p,options){const shape=this._shape(options);return this._supports(p,shape).some(s=>Math.abs(s.y-(p.y||0))<=.15);}
 // Test actual successive support contacts, not a straight airborne chord. Small
 // authored step risers are the only upward transitions native walking supports.
 walkSegmentClear(a,b,options){
  const shape=this._shape(options),dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),endY=b.y||0;
  if(!Number.isFinite(d+endY)||!this.supported(a,shape))return false;
  let y=a.y||0;
  // Subdivide at every physical footprint edge as well as at 0.75u intervals.
  // Thus even a very narrow unsupported gap or obstruction cannot be skipped.
  const cuts=new Set([0,1]),steps=Math.max(1,Math.ceil(d/.75));for(let i=1;i<steps;i++)cuts.add(i/steps);
  const boxes=this._boxes({...shape,height:Infinity},{...a,y:-Infinity},{...b,y:Infinity});
  for(const o of boxes)for(const [v,delta,center,half] of [[a.x,dx,o.x,o.hx],[a.z,dz,o.z,o.hz]])if(Math.abs(delta)>1e-10)for(const sign of [-1,1]){
   const t=(center+sign*(half+shape.radius)-v)/delta;if(t>0&&t<1){cuts.add(Math.max(0,t-1e-6));cuts.add(Math.min(1,t+1e-6));}
  }
  for(const t of [...cuts].sort((u,v)=>u-v)){
   const p={x:a.x+dx*t,z:a.z+dz*t,y};
   const possible=this._supports(p,shape).filter(s=>s.y>=y-2.5-.001&&s.y<=y+2.5+.001&&(s.y<=y+.05||s.step)).sort((u,v)=>v.y-u.y);
   const support=possible.find(s=>this.isClear({...p,y:s.y},shape));
   if(!support)return false;y=support.y;
  }
  return Math.abs(y-endY)<=.15;
 }
 _routeLayered(start,end,shape){
  if(!this.hasSupports||!this.supported(start,shape)||!this.supported(end,shape))return null;
  const b=this.bounds,c=this.cellSize,nx=Math.floor((b.maxX-b.minX)/c)+1,nz=Math.floor((b.maxZ-b.minZ)/c)+1;
  if(nx*nz>65536)return null;
  const nodes=new Map(),columns=new Map();
  const column=(x,z)=>{const id=z*nx+x;if(columns.has(id))return columns.get(id);const p={x:b.minX+x*c,z:b.minZ+z*c},list=[];
   for(const y of new Set(this._supports(p,shape).map(s=>s.y))){const q={...p,y};if(this.isClear(q,shape)){const key=id+':'+y;nodes.set(key,q);list.push(key);}}
   columns.set(id,list);return list;};
  const nearby=(p,outgoing)=>{const list=[],ix=Math.round((p.x-b.minX)/c),iz=Math.round((p.z-b.minZ)/c);
   for(let z=iz-2;z<=iz+2;z++)for(let x=ix-2;x<=ix+2;x++)if(x>=0&&z>=0&&x<nx&&z<nz)for(const key of column(x,z)){const q=nodes.get(key);if(outgoing?this.walkSegmentClear(p,q,shape):this.walkSegmentClear(q,p,shape))list.push({key,d:Math.hypot(p.x-q.x,p.z-q.z,(p.y||0)-q.y)});}
   return list.sort((a,b)=>a.d-b.d).slice(0,8);};
  if(this.walkSegmentClear(start,end,shape))return [{...start,y:start.y||0},{...end,y:end.y||0}];
  const starts=nearby(start,true),ends=new Set(nearby(end,false).map(v=>v.key));if(!starts.length||!ends.size)return null;
  const open=[],cost=new Map(),parent=new Map(),closed=new Set();
  const h=key=>{const p=nodes.get(key);return Math.hypot(p.x-end.x,p.z-end.z,p.y-(end.y||0));};
  for(const s of starts){cost.set(s.key,s.d);open.push({key:s.key,f:s.d+h(s.key)});}
  let found=null,expanded=0;
  while(open.length&&expanded++<16384){let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;const {key}=open.splice(best,1)[0];if(closed.has(key))continue;closed.add(key);if(ends.has(key)){found=key;break;}
   const p=nodes.get(key),x=Math.round((p.x-b.minX)/c),z=Math.round((p.z-b.minZ)/c);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz||x+dx<0||z+dz<0||x+dx>=nx||z+dz>=nz)continue;
    for(const next of column(x+dx,z+dz)){const q=nodes.get(next);if(closed.has(next)||!this.walkSegmentClear(p,q,shape))continue;const g=cost.get(key)+Math.hypot(q.x-p.x,q.z-p.z,q.y-p.y);if(g>=(cost.get(next)??Infinity))continue;cost.set(next,g);parent.set(next,key);open.push({key:next,f:g+h(next)});}
   }
  }
  if(found===null)return null;
  const raw=[{...end,y:end.y||0}];for(let key=found;key!==undefined;key=parent.get(key))raw.push({...nodes.get(key)});raw.push({...start,y:start.y||0});raw.reverse();
  const smooth=[raw[0]];for(let i=0;i<raw.length-1;){let j=raw.length-1;while(j>i+1&&!this.walkSegmentClear(raw[i],raw[j],shape))j--;smooth.push(raw[j]);i=j;}return smooth;
 }
 _copy(result){return result?{revision:result.revision,points:result.points.map(p=>({...p}))}:null;}
}
