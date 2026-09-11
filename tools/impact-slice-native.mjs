// Native-input baseline/candidate capture. No actor posing or simulation overrides.
// Headless frame cadence is not a performance measurement.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const base = process.env.LSW_TEST_URL || 'http://127.0.0.1:5182';
const out = resolve(process.env.LSW_IMPACT_OUT || 'artifacts/impact-slice/baseline');
await mkdir(out, { recursive: true });
const git = args => execFileSync('git',args,{encoding:'utf8'}).trim();
const result = { base, runtimeCommit:process.env.LSW_RUNTIME_COMMIT||'unrecorded — source commit is not frozen-runtime identity', commit: git(['rev-parse','HEAD']), dirtyStart:git(['status','--short']), inputPath:[], rows:[], videos:[], errors:[], navigations:[], performanceClaim:false };
const browser = await chromium.launch({channel:'chromium'});
try {
 for (const [hero,width,height] of [['vega',1440,900],['sarge',1440,900],['vega',390,844]]) {
  const context = await browser.newContext({ viewport:{width,height}, recordVideo:{dir:out,size:{width,height}}, isMobile:width<500, hasTouch:width<500 });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror',e=>result.errors.push({hero,width,message:e.message}));
  page.on('framenavigated',f=>{if(f===page.mainFrame())result.navigations.push({hero,width,url:f.url(),at:Date.now()});});
  try {
   await page.goto(base+'/powerworld.html');
   await page.locator(`#pwRoster .pwc[data-id="${hero}"]`).click();
   await page.locator('#pwEncounter [data-encounter="frontline"]').click();
   await page.locator('#pwCamera [data-camera="character"]').click();
   await page.locator('#pwGo').click();
   await page.waitForFunction(()=>window.PW?.game?.running&&PW.game.pwStage?.frontlineReady);
   await page.evaluate(()=>document.fonts.ready);
   result.inputPath.push({hero,width,actions:['select hero','select frontline','select centered camera','enter']});
   if(width>500){
    await page.keyboard.down('w'); await page.waitForTimeout(1100); await page.keyboard.up('w');
    if(hero==='vega') {await page.keyboard.down('Space'); await page.waitForTimeout(650); await page.keyboard.up('Space');}
    await page.keyboard.down('c'); await page.waitForTimeout(300); await page.keyboard.up('c');
    result.inputPath.at(-1).actions.push('W 1.1s',...(hero==='vega'?['Space .65s']:[]),'C .3s');
    if(hero==='vega'){
     await page.keyboard.down('w');await page.keyboard.down('v');await page.waitForTimeout(650);await page.keyboard.up('v');await page.waitForTimeout(350);await page.keyboard.up('w');
     await page.mouse.down({button:'right'});await page.waitForTimeout(700);await page.mouse.up({button:'right'});
     result.inputPath.at(-1).actions.push('W + V hold .65s then release','RMB .7s');
    }else{
     await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();await page.keyboard.press('r');await page.waitForTimeout(2500);
     result.inputPath.at(-1).actions.push('LMB .45s','R reload 2.5s');
    }
   }
   await page.screenshot({path:resolve(out,`${hero}-${width}.png`)});
   result.rows.push(await page.evaluate(()=>({hero:PW.game.player.def.id,mode:PW.game.modeId,viewport:[innerWidth,innerHeight],camera:PW.game.world.camMode,fov:PW.game.world.camera.fov,alive:PW.game.player.alive,flying:PW.game.player.flying,body:document.body.className,overflow:document.documentElement.scrollWidth>innerWidth})));
  } catch(error) {result.errors.push({hero,width,message:String(error)});await page.screenshot({path:resolve(out,`${hero}-${width}-failure.png`)}).catch(()=>{});}
  finally {const video=page.video();await context.close();if(video)result.videos.push({hero,width,path:await video.path(),audio:false});}
 }
} finally {await browser.close(); result.commitEnd=git(['rev-parse','HEAD']);result.dirtyEnd=git(['status','--short']);await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2));}
if(result.errors.length)process.exitCode=1;
