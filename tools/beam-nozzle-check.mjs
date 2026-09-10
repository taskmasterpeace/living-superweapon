// Production tube geometry: the live opening follows emission, without moving
// historical energy or smoothing the visible centerline outside its hit volume.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/beam-nozzle';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const f=g.player;f.pos.set(0,1000,0);f._openSky=true;f.aim3.set(0,0,1);
  const b=g.spawnBeamFor(f,f.slots.lmb.def,1);b.radius=4;
  const fixtures=[
   {name:'straight',dir:[0,0,1],points:[[0,0,0],[0,0,3],[0,0,7],[0,0,11]]},
   {name:'close-crossing',dir:[.6087438,-.6491745,.456074],points:[[0,0,0],[.6834724,-.8007355,3.2349656],[.7981288,-.8951721,7.0934217],[.8632157,-.9141083,10.8396032]]},
   {name:'right-angle',dir:[1,0,0],points:[[0,0,0],[2,0,2],[2,0,6],[2,0,10]]},
   {name:'fold',dir:[0,0,-1],points:[[0,0,0],[0,0,2],[0,0,0],[0,0,-3]]},
   {name:'newborn',dir:[0,1,0],points:[[0,0,0],[0,0,0]]},
   {name:'released-tail',released:true,dir:[-1,0,0],points:[[0,0,0],[0,0,3],[1,0,7],[3,0,11]]},
  ];
  const rows=[],failures=[],v=new T.Vector3(),w=new T.Vector3(),a=new T.Vector3(),c=new T.Vector3();
  for(const fixture of fixtures){
   b.path.fill(0);fixture.points.forEach((p,i)=>b.path.set(p,i*3));b.pn=fixture.points.length;b.dir.fromArray(fixture.dir).normalize();b.sustaining=!fixture.released;
   const before=Array.from(b.path),velBefore=Array.from(b.pvel);b._sweep(b._coreGeo,b.radius*.5,1);
   const pos=b._coreGeo.attributes.position,norm=b._coreGeo.attributes.normal,centers=[];
   for(let ring=0;ring<pos.count/b.RADIAL;ring++){
    c.set(0,0,0);for(let r=0;r<b.RADIAL;r++)c.add(v.fromBufferAttribute(pos,ring*b.RADIAL+r));centers.push(c.clone().multiplyScalar(1/b.RADIAL));
   }
   const axis=v.fromBufferAttribute(pos,1).sub(a.fromBufferAttribute(pos,0)).cross(w.fromBufferAttribute(pos,2).sub(a)).normalize();
   const expectedAxis=fixture.released?new T.Vector3().fromArray(fixture.points[1]).sub(new T.Vector3().fromArray(fixture.points[0])).normalize():b.dir;
   const openingError=Math.acos(Math.max(-1,Math.min(1,axis.dot(expectedAxis))))*180/Math.PI;
   const firstDirection=centers[1].clone().sub(centers[0]),firstError=firstDirection.lengthSq()>1e-9?firstDirection.angleTo(b.dir)*180/Math.PI:0;
   let deviation=0;
   for(const center of centers){let closest=Infinity;
    for(let i=1;i<fixture.points.length;i++){
     a.fromArray(fixture.points[i-1]);v.fromArray(fixture.points[i]).sub(a);const t=Math.max(0,Math.min(1,w.copy(center).sub(a).dot(v)/(v.lengthSq()||1)));
     closest=Math.min(closest,center.distanceTo(a.addScaledVector(v,t)));
    }deviation=Math.max(deviation,closest);
   }
   if(openingError>(fixture.released?5:.1))failures.push(`${fixture.name}: opening misses its travel axis by ${openingError.toFixed(2)} degrees`);
   if(fixture.name==='close-crossing'&&firstError>20)failures.push(`close-crossing: near-hand segment still kinks ${firstError.toFixed(2)} degrees`);
   if(deviation>b.radius*.251)failures.push(`${fixture.name}: curve leaves allowed collision corridor`);
   if(Array.from(pos.array).some(x=>!Number.isFinite(x))||Array.from(norm.array).some(x=>!Number.isFinite(x)))failures.push(`${fixture.name}: invalid rendered geometry`);
   if(before.some((x,i)=>x!==b.path[i])||velBefore.some((x,i)=>x!==b.pvel[i]))failures.push(`${fixture.name}: rendering changed emitted energy`);
   rows.push({name:fixture.name,openingError,firstError,deviation,rings:centers.length});
  }
  return {rows,failures};
 });result.errors=errors;await writeFile(`${out}/${process.argv.includes('--before')?'before':'after'}-check.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
