import * as THREE from 'three';
import {ROSTER} from '../data/characters.js';
import {AI} from './ai.js';
import {loadCloneEquipment} from './clone-equipment.js';
import {SoldierLabels} from './soldier-labels.js';

// One optional local objective, using the native Fighter/AI/weapon pathways.
// The sample is already sealed in the case; combat never fabricates collection data.
function cloneDefinition(index) {
  const def = structuredClone(ROSTER.find(d => d.id === 'sarge'));
  Object.assign(def, {name:`CLONE RIFLE ${index + 1}`, title:'Recovery squad',
    hp:80, ki:60, speed:25, strength:2, flightTier:0, energyInfinite:false,
    overdrive:0, guardType:'block', guardStrong:false, items:[],
    // Rifle squad borrows SARGE's behavior, not his hero-only sword/shield.
    build:{band:0,gaunt:1,weaponR:'rifle'},
    model:{...def.model,body:'superhero-male',surface:'field',costume:'tactical',equipment:'clone'},
    evade:{kind:'dash', name:'Sidestep', power:36, iframes:.1},
    ai:{style:'zoner', range:42, aggro:.5, fly:0}});
  def.abilities = {lmb:{...def.abilities.lmb, name:'Clone service rifle',
    cost:0, magazine:12, reserveAmmo:60, reloadTime:2.6, interval:.24, damage:4, blast:.6, recoil:1.6}};
  return def;
}

// Bounded outward search checks the whole interaction footprint, including
// finite terrain and modest slopes. It never edits the authored terrain.
function clearGround(world, desired, occupied=[]) {
  const arena=world.ARENA??1800,limit=arena-14,height=(x,z)=>world.heightAt?.(x,z)??0;
  for (let ring=0;ring<30;ring++) for (let i=0;i<(ring ? 24 : 1);i++) {
    const a=i*Math.PI/12, x=desired.x+Math.cos(a)*ring*8, z=desired.z+Math.sin(a)*ring*8;
    if(!Number.isFinite(limit)||limit<0||!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>limit||Math.abs(z)>limit)continue;
    if ((world.cover || []).some(c => Math.abs(x-c.x)<(c.hx??c.r??0)+14 && Math.abs(z-c.z)<(c.hz??c.r??0)+14)) continue;
    if (occupied.some(p => Math.hypot(x-p.x,z-p.z)<28)) continue;
    const y=height(x,z);if(!Number.isFinite(y))continue;
    let supported=true;
    for(const radius of [6,12])for(let j=0;j<8;j++){
      const angle=j*Math.PI/4,h=height(x+Math.cos(angle)*radius,z+Math.sin(angle)*radius);
      if(!Number.isFinite(h)||Math.abs(h-y)>radius*.35)supported=false;
    }
    if(!supported)continue;
    return new THREE.Vector3(x,y,z);
  }
  const error=new Error('Clone recovery placement has no safe ground. Return to menu and retry.');error.code='ENCOUNTER_NO_SPAWN';throw error;
}

export class FrontlineEncounter {
  constructor(game) {
    this.game=game; this.phase='recover'; this.progress=0; this.completions=0;
    this.disposed=false; this.damagePause=0;
    this.finished=false;this.sampleOwner=null;this.sampleExtracted=false;
    this.soldiers=[];this.markers=new THREE.Group();this.markers.name='frontline-objectives';this._groundMarkers=[];
    const positions=[];
    try{
      this.extractionPosition=clearGround(game.world,game.player.pos);
      this.casePosition=clearGround(game.world,game.player.pos.clone().add(new THREE.Vector3(48,0,48)),[this.extractionPosition]);
      const used=[this.casePosition,this.extractionPosition];
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2,pos=clearGround(game.world,this.casePosition.clone().add(new THREE.Vector3(Math.cos(a)*23,0,Math.sin(a)*23)),used);
        used.push(pos);positions.push(pos);
      }
    }catch(error){
      if(error.code!=='ENCOUNTER_NO_SPAWN')throw error;
      // prepareFrontline already surfaces equipmentError and keeps its loading
      // gate active. No actors or visible markers exist in this blocked state.
      this.phase='blocked';this.equipmentError=error.message;return;
    }
    const existing=new Set(game.entities);
    try{
      for(const [i,pos] of positions.entries()){
        const f=game.addFighter(cloneDefinition(i),{team:1,x:pos.x,z:pos.z});
        this.soldiers.push(f);f.pos.copy(pos);f.groundY=pos.y;f.obj.position.copy(pos);
        f._frontlineClone=true;f.noRespawn=true;f.ai=new AI(f,1);
      }
    }catch(error){
      for(const f of [...game.entities])if(!existing.has(f)){game.entities.splice(game.entities.indexOf(f),1);f.obj.removeFromParent();f.dispose();}
      this.soldiers.length=0;this.phase='blocked';this.equipmentError=`Clone recovery setup failed: ${error.message}. Return to menu and retry.`;return;
    }
    if(game.world.renderer)this.equipmentLoading=loadCloneEquipment(this).catch(error=>{this.equipmentError=error.message;console.error('Clone equipment',error);});
    this.labels=new SoldierLabels(game,this.soldiers);
    const caseGroup=new THREE.Group();this.caseMesh=caseGroup;caseGroup.position.copy(this.casePosition);
    const box=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.7,2.3),new THREE.MeshStandardMaterial({color:'#71614a',roughness:.65,metalness:.35}));
    box.position.y=.85;caseGroup.add(box);
    const seal=new THREE.Mesh(new THREE.BoxGeometry(.5,1.76,2.36),new THREE.MeshStandardMaterial({color:'#f5bd56',emissive:'#51320c'}));
    seal.position.y=.87;caseGroup.add(seal);
    this.markers.add(caseGroup);
    this._groundMarkers.push({mesh:caseGroup,lift:0});
    for (const [pos,color] of [[this.casePosition,'#f5bd56'],[this.extractionPosition,'#ead7a2']]) {
      const ring=new THREE.Mesh(new THREE.RingGeometry(10.8,11.5,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));
      ring.geometry.rotateX(-Math.PI/2);ring.position.copy(pos);this.markers.add(ring);
      ring.userData.extractionMarker=pos===this.extractionPosition;
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,7,8),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.3}));
      post.position.copy(pos).add(new THREE.Vector3(0,3.5,4));this.markers.add(post);
      post.userData.extractionMarker=pos===this.extractionPosition;
      this._groundMarkers.push({mesh:ring,lift:.18,conform:true},{mesh:post,lift:3.5});
    }
    this._syncTerrain();
    game.scene.add(this.markers);
    if (typeof document!=='undefined') {
      this.hud=document.createElement('aside');this.hud.id='frontlineObjective';
      this.hud.setAttribute('aria-label','Clone recovery objective');
      this.hud.style.cssText='position:fixed;left:18px;top:108px;z-index:12;pointer-events:none;max-width:320px;padding:12px 14px;border:1px solid var(--line-gold);border-radius:var(--r-2);background:var(--surface-solid);color:var(--text);font:600 var(--t-body)/1.45 var(--f-display);box-shadow:var(--sh-1)';
      this.hud.innerHTML='<div style="font-size:10px;letter-spacing:.14em;color:var(--gold)">CLONE RECOVERY</div><div data-phase style="font-weight:600;margin-top:3px"></div><div data-detail style="font-size:11px;color:var(--text-2);margin-top:3px"></div><div style="height:3px;background:var(--line-2);margin-top:8px"><div data-progress style="height:100%;background:var(--gold);width:0"></div></div>';
      document.body.appendChild(this.hud);
    }
    this.render();
  }
  onHit(target,amount) {
    if (!this.disposed && target===this.game.player && amount>0) this.damagePause=1;
  }
  _syncTerrain() {
    const world=this.game.world,height=(x,z)=>world.heightAt?.(x,z)??0;
    for(const m of this.markers.children)if(m.userData.extractionMarker)m.visible=this.phase==='extract';
    for(const pos of [this.casePosition,this.extractionPosition])pos.y=height(pos.x,pos.z);
    for(const {mesh,lift,conform} of this._groundMarkers) {
      mesh.position.y=height(mesh.position.x,mesh.position.z)+lift;
      if(!conform)continue;
      // The interaction ring drapes across a bowl/rim, rather than hovering as a flat disc.
      const a=mesh.geometry.attributes.position;let changed=false;
      for(let i=0;i<a.count;i++) {
        const y=height(mesh.position.x+a.getX(i),mesh.position.z+a.getZ(i))+lift-mesh.position.y;
        if(Math.abs(a.getY(i)-y)>1e-6){a.setY(i,y);changed=true;}
      }
      if(changed){a.needsUpdate=true;mesh.geometry.computeBoundingSphere();}
    }
  }
  update(dt) {
    const g=this.game,p=g.player;
    if (this.disposed||this.finished||this.phase==='blocked'||!g.running||g.matchOver||g.hud?.titleOpen) return;
    this._syncTerrain();
    this.labels?.update();
    if(!p?.alive||p.hp<=0){this.finish(false);return;}
    if(this.phase==='extract'){
      if(this.sampleOwner&&(!this.sampleOwner.alive||this.sampleOwner.hp<=0)){this.finish(false);return;}
      if(this.sampleOwner!==p||p._formDisposed){
        this.sampleOwner=null;this.phase='recover';this.progress=0;this.damagePause=0;this.caseMesh.visible=true;
        g.hud?.announce?.('SAMPLE RETURNED','Control changed · recover the sealed case again','#ffd24a');
        this._syncTerrain();this.render();return;
      }
    }
    const interrupted=this.damagePause>0;
    this.damagePause=Math.max(0,this.damagePause-dt);
    if (this.phase==='recover' || this.phase==='extract') {
      const pos=this.phase==='recover'?this.casePosition:this.extractionPosition;
      const ground=g.world.heightAt?.(p.pos.x,p.pos.z)??0;
      const near=Math.hypot(p.pos.x-pos.x,p.pos.z-pos.z)<=12 && Math.abs(p.pos.y-ground)<1;
      const incapacitated=p.staggerT>0||p.stunT>0||p.frozenT>0||p.sleepT>0||p.downedT>0||p.hitstop>0||!!p.grabbedBy;
      if (near && p.grounded && !p.flying && !p.onBlock && !interrupted && !incapacitated) {
        const duration=this.phase==='recover'?1.5:2;
        this.progress=Math.min(duration,this.progress+Math.max(0,dt));
        if (this.progress>=duration-1e-8) {
          if (this.phase==='recover') {this.phase='extract';this.progress=0;this.sampleOwner=p;this.caseMesh.visible=false;}
          else {this.finish(true);return;}
        }
      } else this.progress=0;
    }
    this.render();
  }
  finish(win){
    if(this.finished)return;this.finished=true;this.phase=win?'complete':'failed';
    this.sampleExtracted=!!win;this.sampleOwner=null;if(win)this.completions++;
    this.render();
    this.game.endMatch?.({operation:'clone-recovery',win,title:win?'SAMPLE EXTRACTED':'RECOVERY FAILED',winner:win?this.game.player:null,
      lines:[win?'Sealed sample recovered and delivered to extraction.':'The recovery team lost this attempt.',
        win?'Mission receipt: 1 sealed sample delivered.':'No sample extracted. Retry with another approach.']});
  }
  render() {
    if (!this.hud) return;
    const alive=this.soldiers.filter(f=>f.alive && f.hp>0).length;
    const p=this.game.player,pos=this.phase==='extract'?this.extractionPosition:this.casePosition;
    const distance=p?Math.round(Math.hypot(p.pos.x-pos.x,p.pos.z-pos.z)):0;
    const title=this.phase==='recover'?'Recover the sample · fight or bypass':this.phase==='extract'?'Carrying sealed sample · return to extraction':this.phase==='failed'?'Recovery failed':'Sealed sample extracted';
    const detail=this.finished?(this.sampleExtracted?'1 sealed sample delivered · mission complete':'No sample delivered · retry from the report'):`${distance}u · land within 12u · hold ${this.phase==='recover'?'1.5':'2'}s uninterrupted · ${alive} defenders${this.damagePause>0?' · under attack':p?.flying || !p?.grounded?' · land to interact':''}`;
    this.hud.querySelector('[data-phase]').textContent=title;
    this.hud.querySelector('[data-detail]').textContent=detail;
    this.hud.querySelector('[data-progress]').style.width=`${this.phase==='complete'?100:100*this.progress/(this.phase==='recover'?1.5:2)}%`;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed=true;this.sampleOwner=null;this.hud?.remove();this.labels?.dispose();this.markers.removeFromParent();
    this.markers.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    for (const f of this.soldiers) {
      // Defeated clones may already have been removed by the native KO cleanup.
      const index=this.game.entities.indexOf(f);
      if (index>=0) {this.game.entities.splice(index,1);f.obj.removeFromParent();f.dispose();}
    }
  }
}
