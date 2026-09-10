// Explicitly posed art/rig inspection; not player-input acceptance.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-hero-inspection';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);
 await page.locator('#pwGo').click();
 const result=await page.evaluate(async()=>{
  const g=LSW.game,definition=LSW.ROSTER.find(d=>d.id==='vega');
  definition.model={...definition.model,body:'superhero-male',flightStyle:'hero'};
  g.startMode('powerworld',{p1:'vega',p2:'kano'});await g.pwStage.frontlineLoading;
  const f=g.player;f.pos.set(-40,160,-40);f.flying=true;f.gait='airborne';f.vel.set(0,0,65);f.aim.set(0,0,1);f.aim3.copy(f.aim);
  for(let i=0;i<120;i++)f._animate(1/60);g.update=()=>g.world.render();
  g.world.camera.position.set(-32,166,-60);g.world.camera.lookAt(-40,166,-38);g.world.camera.updateProjectionMatrix();
  window.heroArtView=angle=>{g.world.camera.position.set(...(angle==='front'?[-38,168,-18]:angle==='side'?[-16,167,-40]:[-32,166,-60]));g.world.camera.lookAt(-40,165,-40);g.world.render();};
  return {model:f.def.model,skin:f.parts.skin?.id,source:f.parts.skin?.source,colors:f.def.colors,pose:'native procedural hero flight after120settling frames; posed root/camera'};
 });
 for(const angle of ['rear','front','side']){await page.evaluate(a=>heroArtView(a),angle);await page.screenshot({path:out+'/'+angle+'.png'});}
 await writeFile(out+'/results.json',JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors}));
}finally{await browser.close();}
