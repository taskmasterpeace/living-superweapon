import fs from 'node:fs';
const path='src/engine/flight-course.js';
fs.writeFileSync(path,`// A closed elevated circuit; normals follow the tangent through each gate.
export function facilityFlightCourse(count=16){
 return Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2;return {position:{x:220*Math.sin(a),y:125+35*Math.sin(a*2),z:220*Math.cos(a)},normal:{x:Math.cos(a),y:70/220*Math.cos(a*2),z:-Math.sin(a)}};});
}
// Swept segment/plane crossings prevent fast flight from skipping gates.
export function crossedFlightRings(rings,index,from,to,radius=14){
 const crossed=[];let previousT=-1;
 for(let count=0;count<rings.length;count++){
  const gate=rings[(index+count)%rings.length],ring=gate.position,n=gate.userData?.flightNormal||gate.normal||{x:0,y:0,z:1};
  const dot=p=>(p.x-ring.x)*n.x+(p.y-ring.y)*n.y+(p.z-ring.z)*n.z;
  const a=dot(from),b=dot(to);if(a===b||a*b>0)break;
  const t=a/(a-b);if(t<=previousT)break;
  const x=from.x+(to.x-from.x)*t-ring.x,y=from.y+(to.y-from.y)*t-ring.y,z=from.z+(to.z-from.z)*t-ring.z;
  if(Math.hypot(x,y,z)>=radius)break;
  crossed.push((index+count)%rings.length);previousT=t;
 }
 return crossed;
}
`);
let p='src/engine/threat-room.js',s=fs.readFileSync(p,'utf8');s=s.replace('import {crossedFlightRings}', 'import {crossedFlightRings,facilityFlightCourse}');s=s.replace(/for\(let i=0;i<6;i\+\+\)\{const ring=.*?this.rings.push\(ring\);\}/,`for(const [i,gate]of facilityFlightCourse().entries()){const ring=new THREE.Mesh(new THREE.TorusGeometry(16,.7,8,48),new THREE.MeshBasicMaterial({color:i===0?0xffd24a:0x6caabb}));ring.position.set(gate.position.x,gate.position.y,gate.position.z);ring.userData.flightNormal=new THREE.Vector3(gate.normal.x,gate.normal.y,gate.normal.z).normalize();ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),ring.userData.flightNormal);this.group.add(ring);this.rings.push(ring);}`);s=s.replace("this.ringIndex+'/6 · LAPS '","this.ringIndex+'/'+this.rings.length+' · LAPS '");fs.writeFileSync(p,s);
p='src/engine/squad-transport.js';s=fs.readFileSync(p,'utf8');s=s.replace(' handleInput(input){',` cycleSeat(f){
  const current=this.passengers.get(f);if(!current||!f.alive||this.state==='destroyed')return false;
  const seats=this.manifest.seats,index=seats.findIndex(s=>s.id===current.id),next=seats[(index+1)%seats.length];if(!next||next===current)return false;
  const occupant=[...this.passengers].find(([other,seat])=>other!==f&&seat.id===next.id)?.[0];
  if(occupant)this.passengers.set(occupant,current);
  this.passengers.set(f,next);this.sync();this.g.world._chaseSnap=true;
  this.g.hud?.announce?.((next.role==='pilot'?'PILOT SEAT · Autopilot route':'PASSENGER SEAT')+' · Z: change seat · J: exit when parked');return true;
 }
 handleInput(input){`);s=s.replace("if(input.pressed?.('KeyJ')", "if(input.pressed?.('KeyZ')){input.justPressed?.delete('KeyZ');this.cycleSeat(f);}\n  if(input.pressed?.('KeyJ')");s=s.replace(' · J: exit while parked',' · Z: change seat · J: exit while parked');
// Reuse the authored chair meshes for a centered front flight-deck station.
s=s.replace('this.hinge=this.model.getObjectByName',`const pilot=manifest.seats.find(s=>s.role==='pilot');if(pilot){
    const chair=new THREE.Group();chair.name='pilot-station';
    for(const o of [...this.model.children])if(o.name.startsWith('passenger_2_')){const copy=o.clone();copy.position.x+=6.8;copy.position.z-=3;chair.add(copy);}
    const console=new THREE.Mesh(new THREE.BoxGeometry(5,2,2),new THREE.MeshStandardMaterial({color:0x263b48}));console.position.set(0,10,-19);chair.add(console);this.model.add(chair);
   }
   this.hinge=this.model.getObjectByName`);fs.writeFileSync(p,s);
p='public/models/squad-transport/manifest.json';let m=JSON.parse(fs.readFileSync(p));m.seats.push({id:'pilot',position:[0,3.9,-15],role:'pilot',anchor:'seated actor root',yaw:Math.PI});fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
p='tools/author-squad-transport.py';s=fs.readFileSync(p,'utf8');s=s.replace("manifest={'version':1", "# Runtime mounts a shared chair and console here; manual flight is a later pass.\nseats.append({'id':'pilot','position':[0,3.9,-15],'role':'pilot','anchor':'seated actor root','yaw':math.pi})\nmanifest={'version':1");fs.writeFileSync(p,s);
