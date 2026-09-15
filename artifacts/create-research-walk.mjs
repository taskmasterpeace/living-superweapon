import {readFile,writeFile} from 'node:fs/promises';
let s=await readFile('tools/field-research-browser.mjs','utf8');
s=s.replace("field-research-2026-09-12","field-research-walk-2026-09-12");
s=s.replace('at=g.ms.threatLab.clearPad(lab.x+60,lab.z+60,12)','at={x:lab.x-9,z:lab.z+40}');
s=s.replace('at.z-6','at.z+6').replace('g.world._lookYaw=0','g.world._lookYaw=Math.PI');
const a=s.indexOf(' await p.evaluate(()=>{const g=PW.game,s=g.ms.fieldResearch.samples[0]');
const b=s.indexOf(' const result=',a);
s=s.slice(0,a)+`
 await p.waitForTimeout(300);await p.keyboard.press('e');await p.waitForFunction(()=>PW.game.ms.fieldResearch.carried);await p.screenshot({path:out+'/sample.png'});
 async function walkTo(zOffset){await p.keyboard.down('w');try{await p.waitForFunction(z=>PW.game.player.pos.z<PW.game.pwStage.researchLab.site.z+z,zOffset,{timeout:15000});}finally{await p.keyboard.up('w');}await p.waitForTimeout(150);}
 await walkTo(32);await p.keyboard.press('e');await p.waitForFunction(()=>PW.game.pwStage.researchLab.doorHandle.verb==='CLOSE');await p.screenshot({path:out+'/door.png'});
 await walkTo(10);await p.keyboard.press('e');await p.waitForFunction(()=>PW.game.ms.fieldResearch.ranks===1);await p.screenshot({path:out+'/upgrade.png'});
`+s.slice(b);
s=s.replace('Native selection/portal, native V KO of staged one-HP enemy, native E pickup/analysis. Controlled positions at sample and terminal; not a full travel/navigation proof.','Native selection/portal; one initial position at lab approach and one-HP enemy. Native V KO, E collection, W walk, E door opening, W entrance and E analysis. No position changes after combat begins. Not a full transport route proof.');
await writeFile('tools/field-research-walk-browser.mjs',s);
