// DEATH & REACTION acceptance, in the real browser (needs the WebGL context + GLB fetch).
// Runs LSW.deathSuite() — real soldier KOs through takeDamage → authored death → ragdoll handoff,
// and the nonlethal knockdown → impact-recovery get-up. Needs a dev server on 127.0.0.1:5193.
import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/death-reaction';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:1280,height:800}});
const logs=[];p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
let code=1;
try{
 await p.goto('http://127.0.0.1:5193/powerworld.html');
 await p.waitForFunction(()=>window.LSW&&window.LSW.game,null,{timeout:60000});
 await p.locator('#hSelect.on').waitFor({timeout:60000}).catch(()=>{});
 const res=await p.evaluate(async()=>await window.LSW.deathSuite(),{timeout:180000});
 await writeFile(out+'/result.json',JSON.stringify(res,null,1));
 await p.screenshot({path:out+'/corpse.png'}).catch(()=>{});
 console.log(JSON.stringify(res,null,1));
 console.log('--- console (death) ---\n'+logs.filter(l=>/death|Modular|error|Error|✗|deathSuite/i.test(l)).slice(-20).join('\n'));
 code=res.fail===0?0:2;
}catch(e){console.log('RUN ERROR',e.message);console.log(logs.slice(-30).join('\n'));}
finally{await b.close();}
process.exit(code);
