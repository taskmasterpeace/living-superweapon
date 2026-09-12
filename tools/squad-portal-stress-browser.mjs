import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
const out='artifacts/marketing/squad-portal-stress';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),results=[];
try{for(const count of (process.argv[2]?[Number(process.argv[2])]:[1,3,5,8,12])){
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 await page.bringToFront();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1000);
 await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);
 await page.evaluate(async n=>{const {ROSTER}=await import('/src/data/characters.js');const g=window.PW.game,t=g.ms.threatLab;for(const def of ROSTER.filter(d=>d.id!==g.player.def.id&&d.archetype!=='soldier').slice(0,n)){const i=t.manifest.length,f=g.spawnEnemy(def.id,{team:g.player.team,x:t.origin.x+(i%3-1)*12,z:t.origin.z+16+Math.floor(i/3)*12,aiLevel:1.15});f.pos.y=t.origin.y+1;f._squadLeader=g.player;f.noRespawn=true;g.ms.squad.members.push(f);t.manifest.push(f);}},count);
 await page.evaluate(()=>{window.operationCues=[];const audio=window.PW.game.audio,originalSample=audio.sample.bind(audio);audio.sample=(id,...args)=>{if(id.startsWith("op."))window.operationCues.push(id);return originalSample(id,...args);};window.samples=[];window.lastFrame=performance.now();window.sampleActive=true;function sample(t){if(!window.sampleActive)return;window.samples.push(t-window.lastFrame);window.lastFrame=t;requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 await page.keyboard.press('g');await page.keyboard.down('w');try{await page.waitForFunction(()=>{const g=window.PW.game;return g.ms.threatLab.deployed.has(g.player);},{},{timeout:6000});}catch{}await page.keyboard.up('w');
 let timeout=false;try{await page.waitForFunction(()=>window.PW.game.ms.threatLab.state==='field',{}, {timeout:25000});}catch{timeout=true;}
 const result=await page.evaluate(()=>{window.sampleActive=false;const g=window.PW.game,t=g.ms.threatLab,a=window.samples.slice(2).sort((a,b)=>a-b);return {state:t.state,manifest:t.manifest.length,deployed:t.deployed.size,queue:t.queue.map(f=>({id:f.def.id,alive:f.alive,distance:f.pos.distanceTo(t.origin),pos:f.pos.toArray(),target:f._deploymentTarget?.toArray(),velocity:f.vel.toArray(),flying:f.flying,ground:g.world.heightAt(f.pos.x,f.pos.z),nearCover:g.world.cover.filter(c=>Math.abs(c.x-f.pos.x)<(c.hx||c.r||0)+8&&Math.abs(c.z-f.pos.z)<(c.hz||c.r||0)+8).map(c=>({x:c.x,z:c.z,hx:c.hx,hz:c.hz,top:c.top}))})),unique:new Set(t.manifest).size,frameP50:a[Math.floor(a.length*.5)],frameP95:a[Math.floor(a.length*.95)],frameP99:a[Math.floor(a.length*.99)],reports:g.ms.squadReports||[],operationCues:window.operationCues,campaign:g.campaign.snapshot()};});
 await page.screenshot({path:out+`/${count}-companions.png`});results.push({count,timeout,result,errors});await context.close();
 if(timeout||errors.length||result.deployed!==count+1||result.unique!==count+1)break;
 }}finally{await browser.close();await writeFile(out+'/result.json',JSON.stringify({kind:'Opt-in injected companion counts into prepared Threat Lab manifest. Native G/W deployment, fresh isolated browser saves. Frame timings include loading/compositor effects; no combat performance claim.',hardware:{cpu:os.cpus()[0].model,memory:os.totalmem(),platform:os.platform()},results},null,2));}
