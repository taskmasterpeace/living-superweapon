import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/roster-before-rebuild';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1000,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:5184/studio.html');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
const roster=await page.evaluate(async()=>{
 const {ROSTER}=await import('/src/data/characters.js');const {profileFromDef}=await import('/src/tool/studio-profile.js');const T=await import('/node_modules/three/build/three.module.js');
 const p=STUDIO.preview;p.playing=false;cancelAnimationFrame(p.raf);p.controls.enabled=false;
 window.archiveHero=(id,rear)=>{const d=ROSTER.find(x=>x.id===id);p.setProfile(d,profileFromDef(d));p.setState('hover');const f=p.fighter;f.obj.updateMatrixWorld(true);const center=f.parts.pelvis.getWorldPosition(new T.Vector3());const head=f.parts.head.getWorldPosition(new T.Vector3());const distance=Math.max(9,head.distanceTo(center)*7);p.camera.fov=38;p.camera.updateProjectionMatrix();p.camera.position.copy(center).add(new T.Vector3(rear?-distance*.18:distance*.18,1,rear?-distance:distance));p.camera.lookAt(center);p.camera.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);};
 return ROSTER.map(d=>({id:d.id,name:d.name,threat:d.threat,strength:d.strength,flightTier:d.flightTier,role:d.role,class:d.class,abilities:Object.values(d.abilities||{}).map(a=>({name:a.name,type:a.type}))}));
});
for(const d of roster){for(const rear of [false,true]){await page.evaluate(({id,rear})=>archiveHero(id,rear),{id:d.id,rear});await page.locator('.viewport canvas').first().screenshot({path:`${out}/${d.id}-${rear?'rear':'front'}.png`});}}
const esc=v=>String(v??'Unspecified').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await writeFile(`${out}/roster.json`,JSON.stringify({commit:'77e7e59',source:'Source defaults; no personal browser profiles; neutral hover preview, not gameplay validation',errors,roster},null,2));
await writeFile(`${out}/index.html`,`<!doctype html><meta charset="utf-8"><title>Power World — Roster archive</title><style>body{background:#141713;color:#eee;font:16px system-ui;margin:32px}h1,h2{color:#ffc94a}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px}article{border:1px solid #555;border-radius:10px;padding:16px}img{width:50%}p{line-height:1.5}input{padding:12px;margin:12px 0 24px;width:300px}</style><h1>Roster before rebuild · ${roster.length} characters</h1><p>Source defaults at 77e7e59. Front and rear hover views. Personal saved outfits are not included. These record existing appearances, not approved anatomy or animations.</p><input placeholder="Find a name, threat or power" oninput="document.querySelectorAll('article').forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(this.value.toLowerCase()))"><main>${roster.map(d=>`<article><h2>${esc(d.name)} · ${esc(d.id)}</h2><a href="${d.id}-front.png"><img loading="lazy" src="${d.id}-front.png"></a><a href="${d.id}-rear.png"><img loading="lazy" src="${d.id}-rear.png"></a><p>Threat: ${esc(d.threat)} · Strength: ${esc(d.strength)} · Flight tier: ${esc(d.flightTier)}</p><p>${d.abilities.map(a=>`${esc(a.name)} (${esc(a.type)})`).join(' · ')}</p></article>`).join('')}</main>`);
console.log(JSON.stringify({characters:roster.length,images:roster.length*2,out,errors}));
}finally{await browser.close();}

