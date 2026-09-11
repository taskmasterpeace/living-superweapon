import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5182';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
page.setDefaultTimeout(20000);

try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.LSW?.hud?._selOpen&&window.LSW.hud._sel?.three?.fig);
 const vega=page.locator('#hSelect .scard').filter({hasText:'VEGA'}).first();
 await vega.evaluate(card=>card.click());
 await page.waitForFunction(()=>window.LSW?.hud?._sel?.three?.fig?.g);

 assert.equal(await page.locator('#hSelect .selfilt').count(),0,'selection screen still exposes the Filters & Registry button');

 const pose=await page.evaluate(()=>{
  const P=window.LSW.hud._sel.three.fig,T=window.LSW.THREE;
  P.g.updateMatrixWorld(true);
  const point=o=>o.getWorldPosition(new T.Vector3()).toArray();
  return {
   leftShoulder:point(P.armL),leftHand:point(P.armL.children[2]),
   rightShoulder:point(P.armR),rightHand:point(P.armR.children[2]),
   leftZ:P.armL.rotation.z,rightZ:P.armR.rotation.z,
  };
 });
 assert.ok(pose.leftHand[0]<pose.leftShoulder[0],`left arm folds inward (${pose.leftHand[0]} >= ${pose.leftShoulder[0]})`);
 assert.ok(pose.rightHand[0]>pose.rightShoulder[0],`right arm folds inward (${pose.rightHand[0]} <= ${pose.rightShoulder[0]})`);
 assert.ok(pose.leftZ<0&&pose.rightZ>0,`portrait arm splay has reversed signs (${pose.leftZ}, ${pose.rightZ})`);
 await page.screenshot({path:'artifacts/character-select-neutral-pose-2026-09-11.png'});
 console.log('PASS character selection uses a neutral outward arm pose and has no registry escape button',pose);
}finally{await browser.close();}
