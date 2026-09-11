// Deliberately posed A/B asset-strategy review, not gameplay acceptance.
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts/frontline-rock-strategy',{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1600,height:900}});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('#pwGo').click();await page.waitForFunction(()=>window.LSW?.game.pwStage?.frontlineReady);
 await page.evaluate(()=>{const g=LSW.game;g.player.pos.y=160;g.player.flying=true;g.player.vel.set(0,0,45);g.player.aim.set(0,0,1);g.update=()=>g.world.render();g.player._animate(.016);g.world.camera.position.set(-40,175,-130);g.world.camera.lookAt(-40,168,180);});
 await page.screenshot({path:'artifacts/frontline-rock-strategy/panels.png'});
 await page.evaluate(async()=>{
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'),{fitRockGeometry,constrainRockToCover}=await import('/src/engine/frontline-terrain.js');
  const g=LSW.game,s=g.pwStage,asset=await new GLTFLoader().loadAsync('/models/frontline/boulder-04.glb');asset.scene.updateMatrixWorld(true);let source;asset.scene.traverse(o=>{if(o.isMesh)source=o;});
  const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
  for(const mesh of s.group.children.filter(o=>o.userData.frontlineRock)){
   const old=mesh.geometry;mesh.geometry=fitRockGeometry(geometry,old);old.dispose();mesh.material=source.material;mesh.material.roughness=1;constrainRockToCover(mesh,s._cover.find(c=>c.mesh===mesh));
  }
 });
 await page.screenshot({path:'artifacts/frontline-rock-strategy/closed.png'});
}finally{await browser.close();}
