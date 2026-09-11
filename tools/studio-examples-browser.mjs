import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='artifacts/examples';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const open=()=>page.getByRole('button',{name:'Example characters',exact:true}).click();
const create=name=>page.getByRole('button',{name:`Create local copy of ${name}`,exact:true}).click();
const count=()=>page.locator('.hero-row').count();
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.evaluate(()=>STUDIO.preview.playing=false);const initial=await count();
 await open();await page.locator('dialog').screenshot({path:`${out}/library-desktop.png`});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await count(),initial);
 // Discard/cancel follows the existing draft guard and cannot install by opening.
 await page.getByLabel('Bulk value',{exact:true}).fill('1.15');await page.getByLabel('Bulk value',{exact:true}).press('Tab');
 await open();assert.equal(await page.locator('dialog h2').textContent(),'Keep your draft?');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.evaluate(()=>STUDIO.history.dirty),true);
 await open();await page.getByRole('button',{name:'Discard draft',exact:true}).click();
 // Hold the actual lazy module response; cancel then reopen the same shared dialog.
 let release,requested;const held=new Promise(r=>release=r),seen=new Promise(r=>requested=r);
 await page.route('**/examples/helion-character.mjs*',async route=>{requested();await held;await route.continue();});
 await create('HELION');await seen;
 assert.equal(await page.getByRole('button',{name:'Create local copy of COMET',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await open();await page.getByRole('button',{name:'Discard draft',exact:true}).click();release();
 await page.evaluate(()=>import('/examples/helion-character.mjs'));
 assert.equal(await count(),initial);assert.equal(await page.locator('dialog').isVisible(),true);
 await page.unroute('**/examples/helion-character.mjs*');
 // The package importer commits storage before installing its roster entry.
 await page.evaluate(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Test storage full','QuotaExceededError');};});
 await create('HELION');await page.waitForFunction(()=>document.querySelector('.example-feedback')?.textContent.startsWith('Not created:'));
 assert.equal(await count(),initial);assert.equal(await page.locator('dialog').isVisible(),true);
 await page.evaluate(()=>Storage.prototype.setItem=window.savedSetItem);
 await create('HELION');await page.waitForFunction(()=>STUDIO.preview.fighter.name==='HELION');
 assert.equal(await count(),initial+1);assert.equal(await page.evaluate(()=>STUDIO.history.dirty),false);
 assert.equal(await page.locator('#tab-progression').getAttribute('aria-selected'),'true');
 const id=await page.evaluate(()=>STUDIO.preview.fighter.def.id);
 const forms=[];
 for(const [level,style,name] of [[4,'hero','Ignition'],[7,'twin','Corona'],[10,'thruster','White Star']]){
  await page.getByLabel('Preview level',{exact:true}).selectOption(String(level));
  await page.locator('#state').selectOption('forward');
  const form=await page.evaluate(()=>{const p=STUDIO.preview;p.seek(2);return {name:p.fighter.formName,style:p.fighter.def.model.flightStyle};});
  assert.deepEqual(form,{name,style});forms.push({level,...form});await page.screenshot({path:`${out}/helion-level${level}.png`});
 }
 await page.getByLabel('Preview level',{exact:true}).selectOption('1');await page.locator('#state').selectOption('attack');
 await page.getByLabel('Preview attack',{exact:true}).selectOption('q');
 assert.equal(await page.evaluate(()=>{STUDIO.preview.seek(.8);return STUDIO.preview.combat.phase;}),'locked-level-4');
 await page.getByLabel('Preview level',{exact:true}).selectOption('4');
 assert.ok(await page.evaluate(()=>{STUDIO.preview.seek(.8);return STUDIO.preview.combat.game.projectiles.list.length>0;}));
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
 await download.saveAs(`${out}/helion.character.json`);const pack=JSON.parse(await readFile(`${out}/helion.character.json`,'utf8'));
 assert.equal(pack.profile.progression.forms[10].name,'White Star');assert.equal(pack.picks.name,'HELION');
 await page.goto(`http://127.0.0.1:5180/studio.html?hero=${id}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter?.name==='HELION');
 assert.equal(await page.evaluate(()=>STUDIO.history.value.progression.unlocks.r),7);
 await open();await create('HELION');await page.waitForFunction(previous=>STUDIO.preview.fighter.def.id!==previous,id);
 assert.equal(await count(),initial+2);assert.equal(await page.getByLabel('Preview level',{exact:true}).inputValue(),'1');
 await open();await create('COMET');await page.waitForFunction(()=>STUDIO.preview.fighter.name==='COMET');
 assert.equal(await count(),initial+3);assert.equal(await page.locator('#tab-attacks').getAttribute('aria-selected'),'true');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.def.abilities.q.splitCount),4);
 await page.setViewportSize({width:390,height:844});await open();await page.locator('dialog').screenshot({path:`${out}/library-mobile.png`});
 assert.ok(await page.evaluate(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1;}));
 await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);await writeFile(`${out}/library-results.json`,JSON.stringify({initial,created:3,forms,errors},null,2));
 console.log('PASS example library: cancel/reopen during load, draft guard, quota/retry, fresh copies, real forms/gated attacks, export/reload and desktop/mobile');
}catch(error){await page.screenshot({path:`${out}/library-failure.png`,fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
