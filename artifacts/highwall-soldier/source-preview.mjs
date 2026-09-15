import {chromium} from 'playwright';
const browser=await chromium.launch({headless:false});const page=await browser.newPage({viewport:{width:1440,height:900}});
try{for(const [name,ref]of [['carbine','equipment.carbine@1'],['sidearm','equipment.sidearm@1'],['kuchler','equipment.kuchler-rifle@2']]){
 await page.goto('about:blank');await page.goto('http://127.0.0.1:5193/authoring/viewer/index.html#'+ref);
 await page.waitForFunction(ref=>document.querySelector('#meta')?.textContent.includes(ref.split('@')[0]),ref,{timeout:30000});
 await page.waitForTimeout(500);await page.screenshot({path:'artifacts/highwall-soldier/source-'+name+'.png'});
}}finally{await browser.close();}
