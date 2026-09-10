import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true}),errors=[],results=[];
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const out='artifacts/interception';await mkdir(out,{recursive:true});
async function number(label,value){const f=page.getByLabel(label+' value',{exact:true});await f.fill(String(value));await f.press('Tab');}
async function snapshot(time){return page.evaluate(time=>{
  const p=STUDIO.preview;p.playing=false;p.seek(time);const c=p.combat;
  return {events:c.interceptions.map(e=>({kind:e.kind,time:e.time,retired:e.retired,at:e.at})),shots:c.game.projectiles.list.filter(p=>!p.dead).length,
    counters:c.interceptionStats(),pattern:c.pattern,priority:p.fighter.slots[c.slot].def.collisionPriority,damage:c.damage,phase:c.phase};
},time);}
try{
  await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  assert.equal(await page.getByLabel('Contact test',{exact:true}).count(),1,'editor needs a real opposing-fire selector');
  await page.evaluate(()=>{STUDIO.preview.playing=false;});
  await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('q');
  await number('Shot priority (−1 = off)',2);
  await page.locator('#state').selectOption('attack');await page.getByLabel('Contact test',{exact:true}).selectOption('priority');
  let r=await snapshot(.78);results.push(r);assert.ok(r.events.length>0);assert.equal(r.events[0].kind,'priority');assert.equal(r.events[0].retired,1);assert.equal(r.counters.own,1);assert.equal(r.counters.opposing,0);
  await page.screenshot({path:`${out}/priority-desktop.png`});
  await number('Shot priority (−1 = off)',1);r=await snapshot(.9);results.push(r);assert.equal(r.events[0].retired,2);
  await number('Shot priority (−1 = off)',-1);r=await snapshot(.9);results.push(r);assert.equal(r.events.length,0);
  // Editing and reload carry the production capability, not the test pattern.
  await number('Shot priority (−1 = off)',2);await page.locator('#save').click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.evaluate(()=>{STUDIO.preview.playing=false;});
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.q.def.collisionPriority),2);
  await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
  await page.getByLabel('Absorb ballistic bullets',{exact:true}).check();await number('Minimum invested energy',10);
  await page.locator('#state').selectOption('attack');await page.getByLabel('Contact test',{exact:true}).selectOption('bullets');
  r=await snapshot(3.1);results.push(r);assert.ok(r.events.some(e=>e.kind==='beam'));assert.ok(r.counters.investedKi>=10);
  assert.equal(await page.evaluate(()=>STUDIO.preview.combat.testShots.every(p=>p.bullet&&p.ballistic&&p.weapon==='rifle')),true);
  assert.equal(await page.locator('#opposing-priority-control').isVisible(),false);
  await page.screenshot({path:`${out}/beam-desktop.png`});
  await number('Minimum invested energy',1000);r=await snapshot(3.1);results.push(r);assert.equal(r.events.length,0);
  await number('Minimum invested energy',10);await page.locator('#save').click();
  await page.setViewportSize({width:390,height:844});await snapshot(3.1);await page.screenshot({path:`${out}/beam-mobile.png`,fullPage:true});
  const layout=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('#contact-test')].map(e=>({id:e.id,width:e.getBoundingClientRect().width}))}));
  assert.ok(layout.body<=layout.width+1);assert.ok(layout.controls.every(c=>c.width>=44));
  assert.deepEqual(errors,[]);await writeFile(`${out}/studio-results.json`,JSON.stringify({results,layout,errors},null,2));
  console.log('PASS real Studio opposing fire, priority matrix, energy threshold, persistence and mobile layout');
}finally{await browser.close();}
