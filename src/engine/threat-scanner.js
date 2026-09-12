import {resistanceGuide} from './combat-guide.js';
import {operationSound} from './operation-audio.js';
export function visibleScanTarget(g,f,target){return !!(target?.alive&&g.isFoe(f,target)&&target.pos.distanceTo(f.pos)<=180&&(target._vis??1)>=.4&&g.canSee(f,target));}
export function startThreatScan(g,f,item,commit){
 if(f._threatScan?.phase==='scanning')return false;
 const target=g.hardLock||g.nearestFoe(f,f.pos,180);
 if(!visibleScanTarget(g,f,target)){if(g.isHuman(f))g.hud?.feed('Scanner: look at a visible target within 180u','#d5bd80');return false;}
 f._threatScan={phase:'scanning',target,item,commit,left:.65};return true;
}
export function updateThreatScan(g,f,dt){
 const s=f._threatScan;if(!s)return;
 const previousPhase=s.phase;
 if(!f.alive||!f.items.includes(s.item)){f._threatScan=null;return;}
 if(s.phase==='scanning'){
  if(g.combatOverlayOpen||!visibleScanTarget(g,f,s.target)){s.phase='lost';s.left=2;if(f===g.player)operationSound(g,'op.scanner.lost');return;}
  s.left-=dt;
  if(s.left<=0){s.commit();s.commit=null;s.phase='locked';s.left=6;s.snapshot={name:s.target.def.name,hp:Math.ceil(s.target.hp),maxHp:s.target.maxHp,resistances:resistanceGuide(s.target.def,s.target.resist).map(r=>r.label)};}
 }else if(s.phase==='locked'){
  s.left-=dt;if(s.left<=0||!visibleScanTarget(g,f,s.target)){s.phase='lost';s.left=2;}
 }else if((s.left-=dt)<=0)f._threatScan=null;
 if(f!==g.player)return;
 if(previousPhase!==s.phase)operationSound(g,s.phase==='locked'?'op.scanner.acquire':'op.scanner.lost');
 document.body.classList.add('scanner-active');
 if(!g._scannerPanel){const panel=document.createElement('aside');panel.setAttribute('aria-label','Threat scanner');panel.style.cssText='position:fixed;top:160px;left:16px;width:240px;padding:12px;background:#111713ed;border:1px solid #bfa153;color:#e8dfbd;font:600 13px var(--f-display,system-ui);z-index:13;pointer-events:none';document.body.append(panel);g._scannerPanel=panel;}
 g._scannerPanel.textContent=s.phase==='locked'?`SCANNER · LOCKED SNAPSHOT — ${s.snapshot.name} · ${s.snapshot.hp}/${s.snapshot.maxHp} HP · ${s.snapshot.resistances.join(' · ')||'No special resistance detected'}`:`SCANNER · ${s.phase.toUpperCase()}`;
}
export function clearScannerPanel(g){g._scannerPanel?.remove();g._scannerPanel=null;globalThis.document?.body?.classList.remove('scanner-active');}
