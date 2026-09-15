import fs from 'node:fs';let p='src/engine/web-zip.js',s=fs.readFileSync(p,'utf8');s="import {slotUnlocked} from '../data/progression.js';\n"+s;s=s.replace('export function beginWebZip(f,hit,def){','export function webZipDestination(f,hit){');s=s.replace(' f._grapple={...hit,zip:true,dest,', ' return dest;\n}\nexport function beginWebZip(f,hit,def){\n const dest=webZipDestination(f,hit);\n f._grapple={...hit,zip:true,dest,');s+=`
export function planWebZipAI(f,target,world){
 if(!target?.alive||f.noPowers)return null;
 const entry=Object.entries(f.slots||{}).find(([key,s])=>s.def.zip&&slotUnlocked(f,key)&&s.cd<=0&&f.ki>=(s.def.cost||0));if(!entry)return null;
 const distance=f.pos.distanceTo(target.pos);if(distance<45)return null;
 const aim=target.pos.clone().sub(f.pos).normalize(),probe=Object.create(f);probe.aim3=aim;
 const [key,slot]=entry,hit=findWebZipAnchor(probe,world,slot.def.range||150);if(!hit)return null;
 const dest=webZipDestination(f,hit),error=Math.hypot(dest.x-target.pos.x,dest.y-target.pos.y,dest.z-target.pos.z);if(error>distance*.65)return null;
 const p=new THREE.Vector3();for(let i=1;i<=24;i++){p.copy(f.pos).lerp(new THREE.Vector3(dest.x,dest.y,dest.z),i/24);if(!clearBody(f,p,world))return null;}
 return {key,hit};
}
export function driveWebZipAI(f,it,g){
 const zip=f._grapple?.zip||f.hanging?.zip;
 if(zip){it.move={x:0,z:0};it.slots={};it.fly=false;if(f.hanging){f._aiZipReleaseAt??=(g.time||0)+.35;it.fly=(g.time||0)>=f._aiZipReleaseAt;}return true;}
 f._aiZipReleaseAt=null;
 if(!f._openSky||f.flying||!f.alive||f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy||f.grabbing||f._carry||f.guarding||f.meleeCharge>0||f.strikeActive>0||f._traversalLeap?.active||Object.values(f.slots||{}).some(s=>s.active||s.charging))return false;
 if((g.time||0)<(f._aiZipNext||0)||!it.target||!g.canSee(f,it.target))return false;
 f._aiZipNext=(g.time||0)+1.5;const plan=planWebZipAI(f,it.target,g.world);if(!plan)return false;
 it.move={x:0,z:0};it.fly=false;it.aimAt={x:plan.hit.x,y:plan.hit.y-4.6,z:plan.hit.z};it.slots={[plan.key]:{pressed:true,held:false,released:false}};return true;
}
`;fs.writeFileSync(p,s);p='src/engine/game.js';s=fs.readFileSync(p,'utf8');s="import {driveWebZipAI} from './web-zip.js';\n"+s;s=s.replace('const chargingLeap=!deployment&&driveTraversalLeapAI(f,it,this,dt);','const webTraversal=!deployment&&driveWebZipAI(f,it,this);\n    const chargingLeap=!deployment&&!webTraversal&&driveTraversalLeapAI(f,it,this,dt);');fs.writeFileSync(p,s);
