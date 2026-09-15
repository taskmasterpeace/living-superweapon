import {chromium} from 'playwright';
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1440,height:900}});
try{for(const [name,id]of [['restored-m16','weapon-rifle-m16'],['restored-pistol','weapon-pistol-1']]){
 await page.goto('http://127.0.0.1:5193/asset-library.html?collection=equipment&model='+id);
 await page.waitForFunction(()=>window.ASSET_LIBRARY?.selected,null,{timeout:30000}).catch(()=>{});
 await page.waitForTimeout(500);await page.screenshot({path:'artifacts/highwall-soldier/source-'+name+'.png'});
 console.log(await page.locator('#model-status').textContent());
}}finally{await browser.close();}
