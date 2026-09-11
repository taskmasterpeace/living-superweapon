import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {QUESTION_OPTIONS} from '../src/tool/design-question-options.js';
const browser=await chromium.launch({channel:'chromium'});
const out='artifacts/design-choices';await mkdir(out,{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5182/design-decisions.html');
 await page.locator('#answer-choices input').first().waitFor();
 assert.equal(await page.locator('#answer-choices input:checked').count(),0);
 assert.equal(await page.locator('#answer').inputValue(),'');
 const option=QUESTION_OPTIONS.q50.options[0];
 await page.locator(`#answer-choices input[value="${option.id}"]`).check();
 assert.equal(await page.locator('#answer').inputValue(),option.value);
 assert.equal(await page.locator('#decision-status').inputValue(),'Draft');
 await page.reload();await page.locator('#answer-choices input').first().waitFor();
 assert.equal(await page.locator('#answer').inputValue(),option.value);
 assert.equal(await page.locator('#answer-choices input:checked').inputValue(),option.id);
 await page.locator('#answer').fill('Keep my custom infantry rule');
 await page.locator('#notes').fill('Do not lose my exception');
 page.once('dialog',d=>d.dismiss());
 await page.locator('#answer-choices input').first().check({force:true}).catch(()=>{});
 assert.equal(await page.locator('#answer').inputValue(),'Keep my custom infantry rule');
 assert.equal(await page.locator('#answer-choices input:checked').inputValue(),'custom');
 await page.reload();await page.locator('#answer-choices input').first().waitFor();
 assert.equal(await page.locator('#answer').inputValue(),'Keep my custom infantry rule');
 assert.equal(await page.locator('#notes').inputValue(),'Do not lose my exception');
 page.once('dialog',d=>d.accept());await page.locator('#answer-choices input').first().check();
 assert.equal(await page.locator('#notes').inputValue(),'Do not lose my exception');
 const downloadPromise=page.waitForEvent('download');await page.locator('#export-json').click();
 const download=await downloadPromise;await download.saveAs(`${out}/selected.json`);
 assert.equal(JSON.parse(await readFile(`${out}/selected.json`,'utf8')).answers.q50.answer,option.value);
 for(let number=1;number<=50;number++){
  await page.locator('#jump').fill(String(number));await page.locator('#jump-form button').click();
  assert.equal(await page.locator('#answer-choices input').count(),4,`choices missing at question${number}`);
  assert.ok((await page.locator('#question-context').textContent()).length>20);
 }
 await page.screenshot({path:`${out}/desktop.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#answer-choices').scrollIntoViewIfNeeded();
 await page.screenshot({path:`${out}/mobile.png`});
 assert.deepEqual(errors,[]);await context.close();
 console.log('PASS all50 choices, no defaults, selection persistence/export, custom-answer cancellation, preserved notes and mobile overflow');
}finally{await browser.close();}
