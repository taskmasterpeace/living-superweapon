import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const ORIGIN='http://127.0.0.1:5182';
const OUT='artifacts/player-systems/newsroom';
await mkdir(OUT,{recursive:true});

const result={
  kind:'Newsroom UI — staged valid archive fixtures plus separate native gameplay capture',
  stagedSetup:'Canvas-encoded PNG frames inserted through the production archive API; not gameplay evidence.',
  errors:[],consoleErrors:[],screenshots:[],nativeGameplay:{attempted:false,passed:false}
};
const browser=await chromium.launch({channel:'chromium'});

function watch(page){
  page.on('pageerror',error=>result.errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});
}
async function ready(page){
  await page.goto(`${ORIGIN}/powerworld.html`);
  await page.waitForSelector('#pwTitle',{state:'visible',timeout:30_000});
  await page.waitForFunction(()=>document.fonts?.status==='loaded');
}
async function stageValidClips(page){
  await page.evaluate(async()=>{
    const {getNewsArchive}=await import('/src/engine/news-archive-adapter.js');
    const archive=getNewsArchive(),now=Date.now();
    const png=(fill,label)=>new Promise(resolve=>{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
      const ctx=canvas.getContext('2d');ctx.fillStyle=fill;ctx.fillRect(0,0,320,180);
      ctx.fillStyle='#f5c34f';ctx.font='700 28px sans-serif';ctx.fillText(label,24,96);
      canvas.toBlob(resolve,'image/png');
    });
    const rows=[
      {id:'setup-sol-ko',matchId:'setup-one',createdAt:now-2*864e5,title:'SOL holds the line',tag:'ko',heroIds:['sol','rage'],color:'#182b3a'},
      {id:'setup-vega-impact',matchId:'setup-two',createdAt:now-9*864e5,title:'VEGA impact report',tag:'impact',heroIds:['vega','sarge'],color:'#3a2118'},
      {id:'setup-sol-throw',matchId:'setup-three',createdAt:now-40*864e5,title:'SOL archival throw',tag:'throw',heroIds:['sol','titan'],color:'#1d3423'}
    ];
    for(const row of rows){
      const frame=await png(row.color,row.title);
      await archive.put({...row,favorite:false,fps:12,priority:1,width:320,height:180,slow:false,slowFrom:0,slowTo:0,t0:0,tLabel:'0:02',shotBy:'STAGED SETUP · KMK 9',shots:[],frames:[frame,frame.slice(0,frame.size,frame.type),frame.slice(0,frame.size,frame.type)]});
    }
  });
}
async function screenshot(page,name){
  const path=`${OUT}/${name}.png`;await page.screenshot({path,fullPage:false});result.screenshots.push(path);
}
async function assertNoOverflow(page){
  const measurements=await page.evaluate(()=>({
    viewport:[innerWidth,innerHeight],doc:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
    newsroom:document.querySelector('.newsroom')?.getBoundingClientRect().toJSON()
  }));
  assert.ok(measurements.doc[0]<=measurements.viewport[0]+1,`horizontal overflow at ${measurements.viewport.join('x')}`);
  assert.ok(measurements.newsroom&&measurements.newsroom.left>=-1&&measurements.newsroom.right<=measurements.viewport[0]+1,'Newsroom exceeds viewport');
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const page=await context.newPage();watch(page);await ready(page);await stageValidClips(page);

  // The compact selection TV follows the exact persisted player choice, never general/unknown footage.
  await page.evaluate(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'sol'})));await page.reload();await page.waitForSelector('#pwTitle',{state:'visible'});
  await page.waitForFunction(()=>document.querySelector('.ff-caption strong')?.textContent==='SOL holds the line');
  await page.evaluate(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega'})));await page.reload();await page.waitForSelector('#pwTitle',{state:'visible'});
  await page.waitForFunction(()=>document.querySelector('.ff-caption strong')?.textContent==='VEGA impact report');
  assert.doesNotMatch(await page.locator('.ff-caption strong').innerText(),/SOL/);
  await page.evaluate(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'sol'})));await page.reload();await page.waitForSelector('#pwTitle',{state:'visible'});
  await page.waitForFunction(()=>document.querySelector('.ff-caption strong')?.textContent==='SOL holds the line');

  // RED/GREEN contract: title entry and exact selected-hero archive scope.
  await page.getByRole('button',{name:'Newsroom',exact:true}).click();
  await page.getByRole('heading',{name:'NEWSROOM',exact:true}).waitFor();
  await page.getByRole('button',{name:'Pause footage',exact:true}).click();
  const editedId=await page.locator('.nr-clip-row[aria-pressed="true"]').getAttribute('data-clip');
  assert.match(await page.locator('.nr-scope').innerText(),/SOL/);
  assert.equal(await page.locator('.nr-clip-row').count(),2);
  const desktopFit=await page.evaluate(()=>{const action=document.querySelector('[data-action="export"]')?.getBoundingClientRect(),footer=document.querySelector('.nr-footer')?.getBoundingClientRect();return {actionBottom:action?.bottom,footerBottom:footer?.bottom,height:innerHeight};});
  assert.ok(desktopFit.actionBottom<=desktopFit.height&&desktopFit.footerBottom<=desktopFit.height,'Desktop management actions are below the viewport');
  await screenshot(page,'desktop-1440x900');await assertNoOverflow(page);

  // Persistent plain-text rename and favorite.
  await page.getByRole('button',{name:'Rename clip',exact:true}).click();
  const title=page.getByRole('textbox',{name:'Clip title',exact:true});
  await title.fill('<b>SOL newsroom lead</b>');
  await page.getByRole('button',{name:'Save title',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.nr-selected-title')?.textContent==='<b>SOL newsroom lead</b>');
  assert.equal(await page.locator('.nr-selected-title').innerText(),'<b>SOL newsroom lead</b>');
  assert.equal(await page.locator('.nr-selected-title b').count(),0,'Untrusted title rendered markup');
  await page.getByRole('button',{name:'Favorite clip',exact:true}).click();
  await page.getByRole('button',{name:'Unfavorite clip',exact:true}).waitFor();
  result.afterEdit=await page.evaluate(async id=>{
    const {getNewsArchive}=await import('/src/engine/news-archive-adapter.js');return getNewsArchive().get(id);
  },editedId);
  assert.equal(result.afterEdit.title,'<b>SOL newsroom lead</b>');assert.equal(result.afterEdit.favorite,true);
  await page.reload();await page.waitForSelector('#pwTitle',{state:'visible'});
  await page.getByRole('button',{name:'Newsroom',exact:true}).click();
  await page.getByRole('button',{name:'Pause footage',exact:true}).click();
  await page.getByRole('button',{name:'Unfavorite clip',exact:true}).waitFor();
  assert.equal(await page.locator('.nr-clip-row[aria-pressed="true"]').getAttribute('data-clip'),editedId);
  assert.equal(await page.locator('.nr-selected-title').innerText(),'<b>SOL newsroom lead</b>');

  // Filter metadata without adding a second storage query implementation.
  await page.getByRole('combobox',{name:'Hero filter',exact:true}).selectOption('vega');
  assert.equal(await page.locator('.nr-clip-row').count(),1);
  assert.match(await page.locator('.nr-selected-title').innerText(),/VEGA/);
  await page.getByRole('combobox',{name:'Date filter',exact:true}).selectOption('7');
  await page.getByText('No footage matches these filters.',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Date filter',exact:true}).selectOption('all');
  await page.getByRole('combobox',{name:'Event filter',exact:true}).selectOption('impact');
  assert.equal(await page.locator('.nr-clip-row').count(),1);
  await page.getByRole('button',{name:'Show favorites only',exact:true}).click();
  await page.getByText('No footage matches these filters.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Show all clips',exact:true}).click();

  // One clip per backup file, then cancel and confirm deletion, then restore via import.
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export clip backup',exact:true}).click();
  const download=await downloadPromise,backupPath=`${OUT}/vega-impact.powerworld-news.json`;
  await download.saveAs(backupPath);result.backup=backupPath;
  await page.getByRole('button',{name:'Delete clip',exact:true}).click();
  await page.getByRole('dialog',{name:'Delete archived clip'}).waitFor();
  await page.getByRole('button',{name:'Cancel delete',exact:true}).click();
  assert.equal(await page.locator('.nr-clip-row').count(),1);
  await page.getByRole('button',{name:'Delete clip',exact:true}).click();
  await page.getByRole('button',{name:'Confirm delete',exact:true}).click();
  await page.getByText('No footage matches these filters.',{exact:true}).waitFor();
  await page.getByLabel('Import clip backup').setInputFiles(backupPath);
  await page.getByText('Imported 1 clip backup.',{exact:true}).waitFor();
  assert.equal(await page.locator('.nr-clip-row').count(),1);

  // Mobile landscape and portrait keep 48px targets and no horizontal overflow.
  for(const [width,height,label] of [[844,390,'landscape-844x390'],[390,844,'portrait-390x844']]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
    await assertNoOverflow(page);
    if(width===390){
      const filterBounds=await page.locator('.nr-filters label,.nr-filter-favorite').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
      assert.equal(filterBounds.length,4);assert.ok(filterBounds.every(box=>box.left>=0&&box.right<=width+1),'Portrait filters are clipped or hidden offscreen');
    }
    const undersized=await page.locator('.newsroom button:visible,.newsroom select:visible,.newsroom input[type=file]:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<48||r.height<48;}).map(n=>({text:n.getAttribute('aria-label')||n.textContent.trim(),w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
    assert.deepEqual(undersized,[],`undersized mobile targets: ${JSON.stringify(undersized)}`);
    await screenshot(page,label);
  }

  // Title state restores on close; pause state and combat-input isolation restore separately.
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Close newsroom',exact:true}).click();
  assert.equal(await page.locator('#pwTitle').isVisible(),true);
  await page.locator('#pwGo').click();
  await page.getByText('Preparing the battlefield',{exact:true}).waitFor({state:'hidden',timeout:90_000});
  await page.waitForFunction(()=>PW.game.running&&PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90_000});
  await page.keyboard.press('Escape');await page.locator('#hPaused').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Newsroom',exact:true}).click();
  await page.getByRole('button',{name:'Rename clip',exact:true}).click();
  await page.getByRole('textbox',{name:'Clip title',exact:true}).focus();
  await page.keyboard.down('v');await page.waitForTimeout(80);
  assert.equal(await page.evaluate(()=>PW.game.running),false);
  assert.equal(await page.evaluate(()=>PW.input.keys.has('KeyV')),false,'Menu text input leaked to combat input');
  await page.keyboard.up('v');
  await page.getByRole('button',{name:'Close newsroom',exact:true}).click();
  assert.equal(await page.locator('#hPaused').isVisible(),true,'Pause state was not restored deliberately');
  await context.close();

  // Separate, empty storage context: actual gameplay capture -> menu -> reload -> archived playback.
  result.nativeGameplay.attempted=true;
  const nativeContext=await browser.newContext({viewport:{width:1440,height:900}});
  await nativeContext.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'sarge',p2:'nova',ai:1.75,two:false})));
  const native=await nativeContext.newPage();watch(native);await ready(native);
  await native.locator('#pwGo').click();
  await native.getByText('Preparing the battlefield',{exact:true}).waitFor({state:'hidden',timeout:90_000});
  await native.waitForFunction(()=>PW.game.running&&PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90_000});
  result.nativeGameplay.setup='Saved title choices select SARGE versus elite NOVA; native target lock, forward movement and mouse attack engage the real opponent. No clip or simulation-state injection.';
  await native.keyboard.press('KeyT');
  await native.mouse.move(720,450);await native.mouse.down();await native.keyboard.down('KeyW');
  await native.waitForTimeout(12_000);await native.keyboard.up('KeyW');await native.mouse.up();
  result.nativeGameplay.live=await native.evaluate(()=>({rec:PW.game.news?.rec&&{title:PW.game.news.rec.title,tag:PW.game.news.rec.tag,heroIds:[...(PW.game.news.rec.heroIds||[])]},clips:(PW.game.news?.clips||[]).map(clip=>({title:clip.title,tag:clip.tag,heroIds:clip.heroIds,frames:clip.frames?.length}))}));
  await native.waitForFunction(()=>PW.game.news?.clips?.some(clip=>clip.heroIds?.includes(PW.game.player?.def?.id)&&clip.frames?.some(frame=>typeof frame==='string'&&frame.startsWith('blob:'))),null,{timeout:45_000});
  await native.keyboard.press('Tab');await native.waitForSelector('#pwTitle',{state:'visible'});
  let nativeArchive;
  for(const deadline=Date.now()+45_000;Date.now()<deadline;){
    nativeArchive=await native.evaluate(async()=>{
      const {getNewsArchive}=await import('/src/engine/news-archive-adapter.js');
      return {heroId:PW.game.player?.def?.id,rows:await getNewsArchive().list({limit:10})};
    });
    if(nativeArchive.rows.length)break;
    await native.waitForTimeout(500);
  }
  result.nativeGameplay.archive=nativeArchive;
  assert.ok(nativeArchive.rows.some(row=>row.heroIds.includes(nativeArchive.heroId)),'Native clip was not tagged for the played hero');
  await native.getByRole('button',{name:'Newsroom',exact:true}).click();
  await native.waitForFunction(()=>document.querySelector('.nr-selected-title')?.textContent!=='No clip selected');
  await native.waitForFunction(()=>document.querySelector('.nr-tv-empty')?.hidden===true);
  const nativeTitle=await native.locator('.nr-selected-title').innerText();
  assert.notEqual(nativeTitle,'No clip selected');
  await native.reload();await native.waitForSelector('#pwTitle',{state:'visible'});
  await native.getByRole('button',{name:'Newsroom',exact:true}).click();
  await native.waitForFunction(()=>document.querySelector('.nr-tv-empty')?.hidden===true);
  assert.equal(await native.locator('.nr-selected-title').innerText(),nativeTitle);
  await native.getByRole('button',{name:'Pause footage',exact:true}).waitFor({state:'visible',timeout:10_000});
  await screenshot(native,'native-gameplay-reload-playback');
  result.nativeGameplay={...result.nativeGameplay,attempted:true,passed:true,title:nativeTitle,evidence:`${OUT}/native-gameplay-reload-playback.png`,audio:false};
  await nativeContext.close();

  assert.deepEqual(result.errors,[]);
  result.pass=true;
}catch(error){
  result.error=error?.stack||String(error);process.exitCode=1;
}finally{
  await writeFile(`${OUT}/results.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));await browser.close();
}
