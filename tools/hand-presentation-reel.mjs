import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/hands';await mkdir(`${out}/reel`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.evaluate(()=>{
  const p=STUDIO.preview;p.setView('front');p.controls.enableDamping=false;
  window.handReviewView=view=>{
   const directions={front:[3,87,11],left:[-11,87,2],right:[11,87,2],rear:[3,87,-11]};
   p.camera.position.fromArray(directions[view]);p.controls.target.set(0,86,1);p.controls.update();p.renderer.render(p.scene,p.camera);
  };
 });
 for(const view of ['front','left','right','rear'])for(const time of [0,1.4,3,7]){
  await page.evaluate(({view,time})=>{STUDIO.preview.seek(time);handReviewView(view);},{view,time});
  await page.screenshot({path:`${out}/${view}-${time}.png`});
 }
 await page.evaluate(()=>{STUDIO.preview.seek(0);handReviewView('front');});
 const samples=[];
 for(let frame=0;frame<=160;frame++){
  const state=await page.evaluate(frame=>{
   const p=STUDIO.preview;if(frame)for(let i=0;i<3;i++){p.time=(frame*3-2+i)/60;p.step(1/60,true,false);}
   handReviewView('front');return {time:p.time,open:[p.fighter.parts.armL,p.fighter.parts.armR].map(a=>a.children[2].morphTargetInfluences[0])};
  },frame);
  if(frame%40===0)samples.push(state);
  await page.screenshot({path:`${out}/reel/${String(frame).padStart(4,'0')}.png`});
 }
 await writeFile(`${out}/reel/evidence.json`,JSON.stringify({samples,errors},null,2));console.log(JSON.stringify({samples,errors}));
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
