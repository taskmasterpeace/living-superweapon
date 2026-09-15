// Authoring coordinates are world units: .19 m/unit. Origins are ground-centred.
// A full panel is 32u; the primary wall is 48u = 9.12m, approximately thirty feet.
export const FORTIFICATION_GRID=Object.freeze({unit:32,half:16,detail:4,wallHeight:48,wallDepth:12,platformHeight:24,metresPerUnit:.19});
export const FORTIFICATION_PALETTE=Object.freeze({armor:0xd2d1bc,frame:0x303b39,base:0x46514b,inset:0x66736b,accent:0x8c332d,glass:0x253e41,light:0xc9e4d7,sandbag:0xa3a28a});
const wallSockets=(w,h=48)=>[{id:'west',position:[-w/2,0,0],normal:[-1,0,0],type:'wall'},{id:'east',position:[w/2,0,0],normal:[1,0,0],type:'wall'},{id:'top',position:[0,h,0],normal:[0,1,0],type:'fixture'}];
const def=(id,w,h,d,recipe,extra={})=>Object.freeze({id,dimensions:{width:w,height:h,depth:d},footprint:{grid:4,width:w,depth:d},rotations:[0,90,180,270],materialFamily:'warworld-fortification-ivory-red-v1',recipe,collision:'recipe-box-union',navigation:{obstruction:'solids',openings:[]},visibility:'opaque-solids',projectiles:'solid-blocking',sockets:wallSockets(w,h),mounts:[],traversalLinks:[],interactions:[],damageState:null,...extra});
const deviceMount=(id,position,type)=>({id,position,normal:[0,1,0],type});
export const FORTIFICATION_MODULES=Object.freeze(Object.fromEntries([
 def('tall-wall',32,48,12,'wall'),def('tall-half-wall',16,48,12,'wall'),
 def('tall-corner',32,48,32,'corner',{sockets:[{id:'west',position:[-16,0,-10],normal:[-1,0,0],type:'wall'},{id:'south',position:[10,0,16],normal:[0,0,1],type:'wall'}]}),
 def('tall-end-cap',8,48,16,'pillar'),def('tall-pillar',12,52,16,'pillar'),
 def('tall-gate-frame',64,52,16,'gate-frame',{navigation:{obstruction:'solids',openings:[{width:40,height:44}]},interactions:[{id:'gate-control',position:[-25,10,9],type:'gate-controller'}]}),
 def('tall-closed-gate',40,44,8,'gate',{interactions:[{id:'gate-control',position:[0,10,6],type:'gate-controller'}]}),
 def('tall-open-gate',64,52,16,'gate-frame',{navigation:{obstruction:'solids',openings:[{width:40,height:44}]},interactions:[{id:'gate-control',position:[-25,10,9],type:'gate-controller'}]}),
 def('tall-tower',32,66,32,'tower',{sockets:[...wallSockets(32),{id:'access',position:[0,48,16],normal:[0,0,1],type:'walkway'}],mounts:[deviceMount('roof-hardpoint',[0,66,0],'turret'),deviceMount('camera',[14,59,14],'camera')],navigation:{obstruction:'solids',openings:[{width:14,height:15,elevation:48}]}}),
 def('wall-tower-transition',16,48,16,'wall',{sockets:wallSockets(16),mounts:[deviceMount('walkway',[0,48,0],'walkway')]}),
 def('low-wall',32,7,8,'wall'),def('half-height-wall',32,24,12,'wall'),
 def('low-corner',24,7,24,'corner',{sockets:[{id:'west',position:[-12,0,-8],normal:[-1,0,0],type:'wall'},{id:'south',position:[8,0,12],normal:[0,0,1],type:'wall'}]}),
 def('barricade',24,6,10,'barricade'),def('sandbag-barrier',24,6,8,'sandbags'),def('fence',32,16,4,'fence',{visibility:'bar-solids',navigation:{obstruction:'solids',openings:[]}}),
 def('bunker',48,26,40,'bunker',{navigation:{obstruction:'solids',openings:[{width:16,height:22}]},mounts:[deviceMount('terminal',[14,2,-9],'terminal'),deviceMount('roof-hardpoint',[0,26,0],'fixture')],sockets:[{id:'entry',position:[0,2,20],normal:[0,0,1],type:'door'},{id:'roof-access',position:[0,26,-20],normal:[0,0,-1],type:'walkway'}],interactions:[{id:'terminal',position:[14,2,-9],type:'device'}]}),
 def('ramp',16,24,48,'ramp',{traversalLinks:[{id:'ascent',from:[0,0,24],to:[0,24,-24],type:'stepped-ramp',clearance:16}]}),
 def('stairs',16,24,48,'stairs',{traversalLinks:[{id:'ascent',from:[0,0,24],to:[0,24,-24],type:'stairs',clearance:16}]}),
 def('raised-platform',32,24,32,'platform',{sockets:[{id:'access',position:[0,24,16],normal:[0,0,1],type:'walkway'}]}),
 def('wall-walkway',32,48,16,'walkway',{sockets:[{id:'west',position:[-16,48,0],normal:[-1,0,0],type:'walkway'},{id:'east',position:[16,48,0],normal:[1,0,0],type:'walkway'}]}),
 def('ground-platform-transition',16,24,48,'stairs',{traversalLinks:[{id:'ascent',from:[0,0,24],to:[0,24,-24],type:'stairs',clearance:16}]}),
 ...[['camera-mount','camera',6],['searchlight-mount','searchlight',10],['antenna-mount','sensor',24],['aa-hardpoint','turret',4],['terminal-mount','terminal',10],['gate-interaction-point','gate-controller',10]].map(([id,type,h])=>def(id,8,h,8,'mount',{mounts:[deviceMount('device',[0,h,0],type)],interactions:type==='terminal'||type==='gate-controller'?[{id:'use',position:[0,0,6],type}]:[]})),
].map(d=>[d.id,d])));

// One physical recipe supplies mesh, collision, projectile blocking and occlusion.
// Surface skins sit INSIDE each primitive; they never create invisible extension boxes.
export function fortificationRecipe(moduleId,options={}){
 const definition=FORTIFICATION_MODULES[moduleId];if(!definition)throw Error(`Unknown fortification module: ${moduleId}`);
 const w=options.span??definition.dimensions.width,h=options.height??definition.dimensions.height,d=options.depth??definition.dimensions.depth;
 if(![w,h,d].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid fortification dimensions');
 // Compound structures scale their complete blueprint, including physical openings
 // and device sockets. Access steps are regenerated instead to bound riser height.
 if(!['wall','stairs','ramp','gate-frame','bunker'].includes(definition.recipe)&&[w,h,d].some((v,i)=>v!==[definition.dimensions.width,definition.dimensions.height,definition.dimensions.depth][i])){
  const r=fortificationRecipe(moduleId),sx=w/definition.dimensions.width,sy=h/definition.dimensions.height,sz=d/definition.dimensions.depth;
  const scale=p=>({...p,x:p.x*sx,y:p.y*sy,z:p.z*sz,width:p.width*sx,height:p.height*sy,depth:p.depth*sz});
  return {...r,dimensions:{width:w,height:h,depth:d},solids:r.solids.map(scale),visuals:r.visuals.map(scale)};
 }
 const solids=[],visuals=[];let seq=0;
 const box=(x,y,z,width,height,depth,material='armor',kind='wall',standable=false)=>{if(Math.min(width,height,depth)<=0)return;const p={id:`part-${seq++}`,x,y,z,width,height,depth,material,kind,standable};solids.push(p);visuals.push({...p,solid:p.id});return p;};
 const skin=(p,x,y,z,width,height,depth,material)=>{if(!p||Math.min(width,height,depth)<=0)return;const core=visuals.find(v=>v.solid===p.id&&v.id===p.id);if(core&&!core.recessed){for(const key of['width','height','depth'])core[key]=Math.max(.01,core[key]-.08);core.recessed=true;}visuals.push({x,y,z,width,height,depth,material,solid:p.id});};
 const panel=(x,z,width,height,depth)=>{
  const base=Math.min(5,height*.25),cap=Math.min(3,height*.17),post=Math.min(2,width*.08),bodyDepth=depth*.76;
  box(x,base/2,z,width,base,depth,'base');box(x,height-cap/2,z,width,cap,depth,'frame');
  const core=box(x,base+(height-base-cap)/2,z,width,height-base-cap,bodyDepth,'frame');
  for(const side of[-1,1])box(x+side*(width-post)/2,height/2,z,post,height,depth,'base');
  // Recessed broad armor faces, structural edge rails, a single short identity stripe.
  for(const s of[-1,1]){const face=s*(bodyDepth/2-.12);skin(core,x,base+(height-base-cap)/2,z+face,width-post*2,height-base-cap,.2,'armor');if(height>10)skin(core,x,height*.67,z+s*(bodyDepth/2-.015),Math.max(2,width-post*4),Math.min(2,height*.07),.02,'accent');}
 };
 switch(definition.recipe){
 case 'wall':panel(0,0,w,h,d);break;
 case 'corner':{const t=moduleId==='low-corner'?8:12;panel(0,-d/2+t/2,w,h,t);const p=box(w/2-t/2,h/2,t/2,t,h,d-t,'frame');for(const s of[-1,1])skin(p,w/2-t/2+s*(t/2-.12),h/2,t/2,.2,h-4,d-t-2,'armor');break;}
 case 'pillar':{box(0,2,0,w,4,d,'base');for(const side of[-1,1]){box(0,5,side*d*.29,w*.84,6,d*.4,'base');box(0,8,side*d*.22,w*.72,4,d*.32,'base');}const p=box(0,h/2,0,w*.62,h-6,d*.48,'armor');box(0,h-2,0,w,4,d,'frame');box(0,h-5,0,w*.8,3,d*.7,'base');for(const s of[-1,1])skin(p,0,h*.6,s*(d*.24-.01),w*.22,h*.42,.02,'accent');break;}
 case 'gate-frame':{const post=Math.min(12,w*.2),lintel=Math.min(8,h*.25);for(const s of[-1,1]){panel(s*(w-post)/2,0,post,h,d);}box(0,h-lintel/2,0,w-post*2,lintel,d,'frame');break;}
 case 'gate':{const p=box(0,h/2,0,w,h,d,'frame','gate');for(const s of[-1,1]){for(const side of[-1,1]){skin(p,side*w*.245,h/2,s*(d/2-.14),w*.46,h-5,.24,'inset');for(const y of[.2,.5,.8])skin(p,side*w*.245,h*y,s*(d/2-.01),w*.36,1,.02,'base');}skin(p,0,h/2,s*(d/2-.01),1.5,h-2,.02,'accent');}break;}
 case 'tower':{const deck=h-18;for(const sx of[-1,1])for(const sz of[-1,1]){box(sx*(w/2-4),2,sz*(d/2-4),8,4,8,'frame');box(sx*(w/2-4),5,sz*(d/2-4),6,6,6,'base');box(sx*(w/2-4),deck/2,sz*(d/2-4),4,deck,4,'base');}panel(0,0,w*.62,deck,d*.7);box(0,deck-1.5,0,w,3,d,'frame','deck',true);for(const p of solids)if(Math.abs(p.y+p.height/2-deck)<.0001){p.standable=true;p.kind='deck';}box(0,h-1.5,0,w,3,d,'frame','roof',true);for(const sx of[-1,1])for(const sz of[-1,1])box(sx*(w/2-2),deck+7.5,sz*(d/2-2),4,15,4,'armor');box(0,deck+3,-d/2+1,w,6,2,'armor');for(const s of[-1,1])box(s*(w/2-1),deck+3,0,2,6,d,'armor');break;}
 case 'barricade':panel(0,0,w,h,d*.6);for(const s of[-1,1])box(s*w*.35,1,0,3,2,d,'base');break;
 case 'sandbags':{const rows=3,bw=w/6;for(let row=0;row<rows;row++)for(let col=0;col<6;col++)box(-w/2+bw*(col+.5),h/rows*(row+.5),0,bw-.15,h/rows-.08,d-(row%2)*.5,'sandbag','cover');break;}
 case 'fence':{for(const s of[-1,1])box(s*(w/2-1),h/2,0,2,h,d,'frame');for(const y of[2,h-2])box(0,y,0,w,1,1,'base');for(let x=-w/2+3;x<w/2;x+=2)box(x,h/2,0,.3,h,.3,'inset');break;}
 case 'bunker':{box(0,1,0,w,2,d,'base','deck',true);box(0,h-2,0,w,4,d,'frame','roof',true);box(0,(h-4)/2,-d/2+2,w,h-4,4,'armor');for(const s of[-1,1]){box(s*(w/2-2),5,0,4,10,d,'armor');box(s*(w/2-2),h-6,0,4,4,d,'armor');for(const end of[-1,1])box(s*(w/2-2),h/2,end*(d/2-3),4,h-4,6,'base');box(s*(w/4+4),(h-4)/2,d/2-2,w/2-8,h-4,4,'armor');}break;}
 case 'ramp':case 'stairs':{const count=Math.ceil(h/(definition.recipe==='ramp'?.5:1.5)),run=d/count;for(let i=0;i<count;i++)box(0,h*(i+1)/count/2,d/2-run*(i+.5),w,h*(i+1)/count,run,'armor','step',true);break;}
 case 'platform':case 'walkway':{box(0,h-2,0,w,4,d,'frame','deck',true);for(const sx of[-1,1])for(const sz of[-1,1])box(sx*(w/2-2),h/2-2,sz*(d/2-2),4,h-4,4,'base');break;}
 case 'mount':{box(0,1,0,w,2,d,'base');box(0,h/2,0,w*.3,h,d*.3,'frame');box(0,h-.5,0,w*.75,1,d*.75,'armor');break;}
 }
 return {definition,dimensions:{width:w,height:h,depth:d},solids,visuals};
}

export function fortificationPlacement(placement){
 const {id,moduleId,x=0,y=0,z=0,rotation=0}=placement;
 if(!id||![x,y,z,rotation].every(Number.isFinite)||rotation%90!==0)throw Error('Fortification placements require an ID, finite position and quarter-turn rotation');
 const recipe=fortificationRecipe(moduleId,placement),a=rotation*Math.PI/180,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a));
 const point=([px,py,pz])=>[x+px*c+pz*s,y+py,z-px*s+pz*c];
 const rotate=p=>{const [wx,wy,wz]=point([p.x,p.y,p.z]);return {...p,x:wx,y:wy,z:wz,width:Math.abs(c)*p.width+Math.abs(s)*p.depth,depth:Math.abs(s)*p.width+Math.abs(c)*p.depth};};
 const solids=recipe.solids.map(p=>{const q=rotate(p);return {id:`${id}/${p.id}`,moduleId,placementId:id,x:q.x,z:q.z,hx:q.width/2,hz:q.depth/2,bottom:q.y-q.height/2,top:q.y+q.height/2,h:q.y+q.height/2,kind:q.kind,standable:q.standable,finiteBuilding:true,projectileShape:'box',buildingRole:q.kind==='step'?'step':undefined};});
 // Metadata positions scale with explicit dimension overrides, then rotate identically.
 const base=recipe.definition.dimensions,dim=recipe.dimensions,scaled=p=>[p[0]*dim.width/base.width,p[1]*dim.height/base.height,p[2]*dim.depth/base.depth];
 const socket=p=>({...p,position:point(scaled(p.position)),normal:p.normal?[p.normal[0]*c+p.normal[2]*s,p.normal[1],-p.normal[0]*s+p.normal[2]*c]:undefined});
 const gateFrame=recipe.definition.recipe==='gate-frame',post=Math.min(12,dim.width*.2),lintel=Math.min(8,dim.height*.25);
 const bunker=recipe.definition.recipe==='bunker';
 const navigation={...recipe.definition.navigation,openings:gateFrame?[{width:dim.width-post*2,height:dim.height-lintel}]:bunker?[{width:16,height:dim.height-6,elevation:2}]:recipe.definition.navigation.openings.map(o=>({...o,width:o.width*dim.width/base.width,height:o.height*dim.height/base.height,...(o.elevation===undefined?{}:{elevation:o.elevation*dim.height/base.height})}))};
 const bunkerPoint=p=>{const q=socket(p);if(p.position[1]===2)q.position[1]=y+2;return q;};
 const mapPoint=bunker?bunkerPoint:socket;
 const interactions=gateFrame?[{id:'gate-control',position:point([-(dim.width-post)/2,Math.min(10,dim.height*.3),dim.depth/2+1]),type:'gate-controller'}]:recipe.definition.interactions.map(mapPoint);
 return {id,moduleId,definition:recipe.definition,dimensions:dim,navigation,solids,visuals:recipe.visuals.map(p=>({...rotate(p),solid:`${id}/${p.solid}`})),sockets:recipe.definition.sockets.map(mapPoint),mounts:recipe.definition.mounts.map(mapPoint),interactions,traversalLinks:recipe.definition.traversalLinks.map(t=>({...t,from:point(scaled(t.from)),to:point(scaled(t.to)),clearance:t.clearance*dim.width/base.width}))};
}

export function fortificationSocketsConnect(a,b,tolerance=.001){return a.type===b.type&&Math.hypot(...a.position.map((v,i)=>v-b.position[i]))<=tolerance&&a.normal.every((v,i)=>Math.abs(v+b.normal[i])<=tolerance);}
