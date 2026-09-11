// Catches a charge-scaled tube beginning as a body-wide open collar instead of
// emerging from the hands. Uses the actual ability/rig/mesh at multiple elevations.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/beam-emitter';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');
 await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 const rows=[];
 for(const elevation of [-60,0,45,60]){
  await page.getByLabel('Target elevation',{exact:true}).fill(String(elevation));
  await page.getByLabel('Target elevation',{exact:true}).press('Tab');
  const row=await page.evaluate(()=>{
   const p=STUDIO.preview;p.seek(4);const b=p.combat.game.projectiles.list[0],meshes=[];
   for(const mesh of [b.core,b.glow]){
    const pos=mesh.geometry.attributes.position,v=b.muzzle.clone();let root=0,body=0;
    // Render subdivisions need not correspond one-to-one with physics packets.
    // Measure the actual ring center and widest downstream cross-section.
    for(let ring=0;ring<pos.count/b.RADIAL;ring++){
     const center=b.muzzle.clone().set(0,0,0);
     for(let r=0;r<b.RADIAL;r++)center.add(v.fromBufferAttribute(pos,ring*b.RADIAL+r));center.multiplyScalar(1/b.RADIAL);
     for(let r=0;r<b.RADIAL;r++){
      const radius=v.fromBufferAttribute(pos,ring*b.RADIAL+r).distanceTo(center);
      if(ring===0)root=Math.max(root,radius);else body=Math.max(body,radius);
     }
    }
    meshes.push({root,body,ratio:root/body});
   }
   return {elevation:p.combat.elevation,damage:p.combat.damage,meshes};
  });rows.push(row);
  await page.screenshot({path:`${out}/${process.argv.includes('--before')?'before':'after'}-${elevation}.png`});
 }
 const failures=rows.flatMap(r=>r.meshes.filter(m=>m.ratio>.2).map(m=>`${r.elevation}: emission collar is ${(100*m.ratio).toFixed(1)}% of the body radius`));
 const result={rows,failures,errors};await writeFile(`${out}/${process.argv.includes('--before')?'before':'after'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
