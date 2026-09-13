export function operationGuidance(operation){
 const o=operation,p=o.g.player;
 const sample=o.g.ms?.fieldResearch?.carried,lab=o.g.pwStage?.researchLab?.site;
 if(!p||(!(sample&&lab)&&(!o.scientist||!o.vehicle||!o.destination)))return '';
 let target=sample&&lab?lab:o.scientist.pos,label=sample&&lab?`Sample ${Math.ceil(sample.left)}s · Lab`:'Scientist';
 if(!(sample&&lab)){
  if(o.state==='travel'||o.state==='loaded'||o.state==='boarding'&&o.scientistLeader===p){target=o.vehicle.mesh.position;label='Convoy';}
  if(o.state==='disabled'&&o.scientistLeader===p){target=o.cargoOwner?o.destination:o.vehicle.mesh.position;label=o.cargoOwner?'Extraction':'Cargo';}
 }
 const dx=target.x-p.pos.x,dz=target.z-p.pos.z,d=Math.hypot(dx,dz);
 const angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-(o.g.world._lookYaw||0)),Math.cos(Math.atan2(dx,dz)-(o.g.world._lookYaw||0)));
 const directions=['ahead','ahead-right','right','behind-right','behind','behind-left','left','ahead-left'];
 const direction=d<12?'nearby':directions[(Math.round(angle/(Math.PI/4))+8)%8];
 return `${label} · ${Math.round(d)}u · ${direction}`;
}
