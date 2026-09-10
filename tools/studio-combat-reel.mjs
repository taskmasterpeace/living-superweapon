import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// One complete procedural preview sequence, not captured BFP animation or a live opponent.
const out=process.argv[2]||'artifacts/flight-review/studio-combat/reel';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');
  await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
  await page.getByLabel('Target elevation',{exact:true}).fill('45');
  await page.getByLabel('Target elevation',{exact:true}).press('Tab');
  await page.getByRole('tab',{name:'Camera',exact:true}).click();
  await page.evaluate(()=>STUDIO.preview.seek(0));
  const samples=[];
  for(let frame=0;frame<=160;frame++){
    const state=await page.evaluate(frame=>{
      const p=STUDIO.preview;
      if(frame)for(let step=0;step<3;step++){p.time=(frame*3-2+step)/60;p.step(1/60,true,false);}
      p.renderer.render(p.scene,p.camera);
      return {time:p.time,damage:p.combat.damage,energy:p.fighter.ki,beams:p.combat.game.projectiles.list.length};
    },frame);
    if(frame%40===0)samples.push(state);
    await page.screenshot({path:`${out}/${String(frame).padStart(4,'0')}.png`});
  }
  await writeFile(`${out}/evidence.json`,JSON.stringify({hero:'kano',elevation:45,frames:161,fps:20,samples,errors},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({samples,errors}));
}finally{await browser.close();}
