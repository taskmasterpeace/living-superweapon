// Living Superweapon — melee trifecta: Strike (beats Grab) · Grab (beats Guard) · Guard (beats Strike).
// Per-character variants: teleport-escape & energy-intangibility break front grabs; thorns hurt the holder;
// grabHeal lifesteals throws. Back-grabs (from behind) are guaranteed and hit harder.
// Charged melee: hold strike to wind up — tap jab · straight · HAYMAKER (crushes guards, see chargeRelease).
import * as THREE from 'three';

const _vv = new THREE.Vector3();

export class MeleeSystem {
  constructor(game) { this.game = game; }

  canAct(f) { return f.alive && f.hitstop <= 0 && f.staggerT <= 0 && !f.grabbedBy && f.grabState !== 'clinch'; }

  strike(f) {
    if (!this.canAct(f) || f.grabbing || f.guarding || f.strikeActive > 0 || f.meleeCharge > 0) return;
    if (f.strikeCd > 0 && f.comboWin <= 0) return;
    f.strikeIdx = f.comboWin > 0 ? (f.strikeIdx + 1) % 3 : 0;
    f.strikeActive = 0.2; f.strikeHit = new Set(); f.comboWin = 0;
    f.strikeCd = f.strikeIdx === 2 ? 0.5 : 0.3;
    f.state = 'cast'; f.stateT = 0;
    const lunge = f.strikeIdx === 2 ? 26 : 16;
    f.vel.x += f.aim.x * lunge; f.vel.z += f.aim.z * lunge;
    this.game.audio.zap(f.strikeIdx === 2 ? 420 : 660);
    this.game.trail(f, f.def.colors.accent);
  }

  // --- charged melee (Street Fighter hold): tap = jab combo · short hold = straight · long hold = HAYMAKER.
  // def.meleeTiers: 3 (default, all three) · 2 (jab + haymaker only) · 1 (taps too — pure jab character).
  // Haymakers CRUSH guards: the blocker stumbles back staggered, wide open. Jabs are punishable on block.
  chargeStart(f) {
    if (!this.canAct(f) || f.grabbing || f.guarding || f.strikeActive > 0 || f.grabState || f.meleeCharge > 0) return;
    f.meleeCharge = 0.001; f.state = 'cast'; f.stateT = 0;
  }
  chargeUpdate(f, dt) {
    if (f.meleeCharge <= 0) return;
    if (!this.canAct(f)) { f.meleeCharge = 0; return; }        // hit out of the wind-up (STRIKE beats charge too)
    f.meleeCharge = Math.min(1.3, f.meleeCharge + dt * ((f.sheet && f.sheet.chargeRate) || 1));   // Brawlers wind up faster
    const g = this.game;
    if (f.meleeCharge > 0.3 && Math.random() < f.meleeCharge * 0.5) {
      const m = f.muzzle(_vv, 2.2, 5.6);
      g.particles.spawn({ x: m.x, y: m.y, z: m.z, vx: (Math.random() * 2 - 1) * 6, vy: 4, vz: (Math.random() * 2 - 1) * 6, life: 0.25, size: 1.8 + f.meleeCharge * 1.6, color: [f.def.colors.accent, '#fff'], drag: 2, shrink: true });
    }
    if (f.meleeCharge >= 1.29 && Math.random() < 0.2) g.world.shake(0.12);   // fully charged — rumbling
  }
  chargeRelease(f) {
    const t = f.meleeCharge; f.meleeCharge = 0;
    if (t <= 0 || !this.canAct(f)) return;
    const tiers = f.def.meleeTiers ?? 3;
    if (t < 0.18 || tiers === 1) { f.strikeCd = 0; this.strike(f); return; }                 // tap → jab combo
    if (t < 0.55 && tiers >= 3) this._heavy(f, 0.45, false);                                 // straight
    else this._heavy(f, Math.min(1, t), true);                                               // HAYMAKER
  }
  _heavy(f, p01, haymaker) {
    const g = this.game;
    const str = f.def.strength ?? 5;
    f.strikeActive = 0; f.state = 'cast'; f.stateT = 0; f.punchPose = 1;
    f.strikeCd = haymaker ? 0.7 : 0.45;
    const lunge = haymaker ? 40 : 26;
    f.vel.x += f.aim.x * lunge; f.vel.z += f.aim.z * lunge;
    f.invuln = Math.max(f.invuln, haymaker ? 0.1 : 0.05);
    g.audio.zap(haymaker ? 300 : 480, f.pos);
    if (haymaker) { if (f.def.yells) g.heroYell(f, 0.9); else g.audio.grunt(f.def.voicePitch || 1, f.pos); }   // the battle shout
    // resolve after a tiny travel via a one-shot window
    f._heavyT = 0.12; f._heavyP = p01; f._heavyHay = haymaker;
  }
  _heavyHit(f, dt) {
    if (!(f._heavyT > 0)) return;
    f._heavyT -= dt;
    const g = this.game;
    const foe = g.coneFoe(f, 13.5, 0.8);
    if (foe) {
      f._heavyT = 0;
      const str = f.def.strength ?? 5, hay = f._heavyHay, p = f._heavyP;
      const dmg = (hay ? 20 + p * 14 : 13) * (0.85 + str * 0.03) * f.powerBuff * (hay ? 1 : ((f.sheet && f.sheet.jabMult) || 1));
      const blocked = foe.guarding && foe.staggerT <= 0 && (foe.def.guardType === 'barrier' || this._front(foe, f));
      const imp = foe.pos.clone().set((f.pos.x + foe.pos.x) / 2, 5.7, (f.pos.z + foe.pos.z) / 2);
      if (blocked && hay) {
        // GUARD CRUSH — the blocker stumbles back wide open; the crowd goes wild
        foe.guarding = false; foe.staggerT = 0.85; foe.guardMeter = Math.max(0, foe.guardMeter - 0.55);
        foe.state = 'hit'; foe.stateT = 0;
        foe.takeDamage(dmg * 0.35, { src: f, unblockable: true, hitstop: 0.12, kb: { x: f.aim.x * 46, y: 8, z: f.aim.z * 46 } });
        g.vfx.impactStar(imp, 12, '#ffd24a', 0.24); g.vfx.ring(imp, { color: '#ffd24a', r0: 1, r1: 12, life: 0.3 });
        g.world.shake(1.6); g.world.punch(0.7); g.audio.impact(1.3, imp); g.audio.boom(0.5, imp); g.slowmo(0.14, 0.4);
        if (g.hud) { g.hud.damageNumber(foe.pos, 'GUARD CRUSH', '#ffd24a', true); g.hud.flashScreen('#ffd24a', 0.12); }
      } else if (blocked) {
        foe.takeDamage(dmg, { src: f, strike: true, hitstop: 0.07 });     // straights get blocked like strikes
        f.strikeCd = Math.max(f.strikeCd, 0.5); f.hitstop = Math.max(f.hitstop, 0.1);   // punishable — counter window
        g.vfx.impactStar(imp, 7, '#bfe0ff', 0.16); g.audio.zap(520);
      } else {
        foe.takeDamage(dmg, { src: f, strike: true, hitstop: hay ? 0.16 : 0.1, kb: { x: f.aim.x * (hay ? 54 : 26), y: hay ? 6 : 3, z: f.aim.z * (hay ? 54 : 26) }, launch: hay ? 16 : 6 });
        f.hitstop = Math.max(f.hitstop, hay ? 0.12 : 0.07);
        g.vfx.impact(imp, { x: f.aim.x, z: f.aim.z }, { color: f.def.colors.accent, power: hay ? 2 : 1.1 });
        g.world.shake(hay ? 1.8 : 0.9); g.audio.impact(hay ? 1.5 : 0.9, imp);
        if (hay) { g.world.punch(0.68); g.slowmo(0.13, 0.4); if (g.hud) g.hud.flashScreen('#fff', 0.15); g.audio.boom(0.5); }
      }
    }
  }
  _front(foe, atk) {
    const dx = atk.pos.x - foe.pos.x, dz = atk.pos.z - foe.pos.z, d = Math.hypot(dx, dz) || 1;
    return (dx / d) * foe.aim.x + (dz / d) * foe.aim.z > -0.15;
  }

  guard(f, on) {
    // Hitstop must NOT drop a held guard — every blocked hit applies hitstop to the blocker
    // (entity.takeDamage), so gating on canAct() made any fast combo strip the guard after the
    // first block ("can't hold down block"). Stagger, grabs, and your own attacks still drop it.
    if (on && (!f.alive || f.staggerT > 0 || f.grabbedBy || f.grabState || f.grabbing || f.strikeActive > 0)) { f.guarding = false; return; }
    f.guarding = !!on && f.alive;
  }

  grab(f) {
    if (!this.canAct(f) || f.grabbing || f.grabState || f.strikeActive > 0 || f.guarding) return;
    f.grabState = 'startup'; f.grabT = 0.14; f.state = 'cast'; f.stateT = 0;
    this.game.audio.zap(300);
  }

  release(f) {
    if (!f) return;
    if (f.grabbing) { const v = f.grabbing; if (v) { v.grabbedBy = null; if (v.state === 'hit') v.state = 'idle'; } f.grabbing = null; }
    if (f.grabbedBy) { const h = f.grabbedBy; if (h) { h.grabbing = null; h.grabState = null; } f.grabbedBy = null; }
    f.grabState = null; f.grabT = 0; f._victimEscape = false;
  }

  _throw(holder) {
    const g = this.game, v = holder.grabbing;
    if (!v) { this.release(holder); return; }
    const back = holder.grabMode === 'back';
    const dmg = (back ? 30 : 20) * holder.powerBuff;
    const dir = holder.aim, spd = back ? 62 : 46;
    v.grabbedBy = null; holder.grabbing = null; holder.grabState = null; holder.grabT = 0;
    v.state = 'idle';
    v.takeDamage(dmg, { src: holder, strike: true, unblockable: true, hitstop: 0.14, kb: { x: dir.x * spd, y: back ? 22 : 15, z: dir.z * spd } });   // strike-flagged → feeds Overdrive
    if (holder.grabHeal) holder.heal(dmg * holder.grabHeal);
    holder.hitstop = Math.max(holder.hitstop, 0.08);
    g.vfx.impact(v.pos.clone().setY(5.6), { x: dir.x, z: dir.z }, { color: holder.def.colors.accent, power: back ? 1.9 : 1.4 });
    g.world.shake(back ? 1.7 : 1.2); g.world.punch(0.72); g.audio.impact(back ? 1.4 : 1.1, v.pos); g.audio.boom(0.4, v.pos);
    g.slowmo(0.1, 0.42); if (g.hud) g.hud.flashScreen('#fff', 0.14);
  }

  update(f, dt) {
    const g = this.game;
    this.chargeUpdate(f, dt);
    this._heavyHit(f, dt);

    // --- strike active window ---
    if (f.strikeActive > 0) {
      f.strikeActive -= dt;
      const foe = g.coneFoe(f, 13, 0.75);
      if (foe && f.strikeHit && !f.strikeHit.has(foe.id)) {
        f.strikeHit.add(foe.id);
        const fin = f.strikeIdx === 2;
        const dmg = (fin ? 17 : 8) * f.powerBuff * ((f.sheet && f.sheet.jabMult) || 1);   // FIGHTING + Martial Artist
        const hs = fin ? 0.14 : 0.07;
        const blocked = foe.guarding && foe.staggerT <= 0;
        foe.takeDamage(dmg, { src: f, strike: true, hitstop: hs, kb: { x: f.aim.x * (fin ? 14 : 8), y: fin ? 30 : 2, z: f.aim.z * (fin ? 14 : 8) } });
        f.hitstop = Math.max(f.hitstop, hs * (fin ? 0.9 : 0.6));      // attacker freezes too — meaty impact
        const imp = foe.pos.clone().set((f.pos.x + foe.pos.x) / 2, 5.7, (f.pos.z + foe.pos.z) / 2);
        if (blocked) { g.vfx.impactStar(imp, 7, '#bfe0ff', 0.16); g.world.shake(0.35); g.audio.zap(520, imp); f.strikeCd = Math.max(f.strikeCd, 0.5); f.hitstop = Math.max(f.hitstop, 0.09); }   // jab blocked → punishable
        else {
          g.vfx.impact(imp, { x: f.aim.x, z: f.aim.z }, { color: f.def.colors.accent, power: fin ? 1.7 : 0.65 });
          g.world.shake(fin ? 1.5 : 0.6); g.audio.impact(fin ? 1.3 : 0.65, imp);
          if (fin) { g.world.punch(0.7); g.slowmo(0.12, 0.4); if (g.hud) g.hud.flashScreen('#fff', 0.16); g.audio.boom(0.4); }
        }
        if (!fin) f.comboWin = 0.42;
      }
      if (f.strikeActive <= 0 && f.strikeIdx < 2 && f.comboWin <= 0) f.comboWin = 0.32;
    }

    // --- grab state machine ---
    if (f.grabState === 'startup') {
      f.grabT -= dt;
      if (f.grabT <= 0) {
        const foe = g.coneFoe(f, 8.5, 0.95);
        if (foe && !foe.phase && foe.invuln <= 0 && !foe.grabbedBy && foe.alive) {
          const bx = f.pos.x - foe.pos.x, bz = f.pos.z - foe.pos.z, bd = Math.hypot(bx, bz) || 1;
          const behind = (bx / bd) * foe.aim.x + (bz / bd) * foe.aim.z < -0.2;
          f.grabMode = behind ? 'back' : 'front';
          f.grabbing = foe; foe.grabbedBy = f; foe.grabState = null; foe.strikeActive = 0; foe.guarding = false;
          foe.state = 'hit'; foe.stateT = 0;
          f.grabState = 'clinch'; f.grabT = behind ? 0.3 : 0.36;
          f._victimEscape = !behind && ((foe.teleEscape && foe.ki > 14) || foe.canPhase);
          g.audio.hit(150); g.world.shake(0.5);
          g.vfx.ring(foe.pos.clone().setY(5), { color: f.def.colors.accent, r0: 1, r1: 7, life: 0.3 });
        } else { f.grabState = null; f.strikeCd = 0.35; }
      }
    } else if (f.grabState === 'clinch') {
      const v = f.grabbing;
      if (!v || !v.alive) { this.release(f); return; }
      f.grabT -= dt;
      // pin the victim in front of the holder
      v.pos.x = f.pos.x + f.aim.x * 4.4; v.pos.z = f.pos.z + f.aim.z * 4.4; v.pos.y = f.pos.y;
      v.vel.set(0, 0, 0); v.state = 'hit'; v.stateT = 0; v.faceDir(-f.aim.x, -f.aim.z);
      // thorns: being held hurts the holder
      if (v.thorns) {
        f.takeDamage(v.thorns * dt, { src: v, trueDamage: true });
        if (Math.random() < 0.35) g.particles.burst(f.pos.x, 5.5, f.pos.z, { count: 2, speed: 12, life: 0.3, size: 2.2, color: [v.def.colors.accent, '#fff'] });
      }
      // front-grab escape (teleport / phase) at the midpoint
      if (f._victimEscape && f.grabT <= (f.grabMode === 'back' ? 0.3 : 0.36) * 0.5) {
        f._victimEscape = false;
        if (v.teleEscape && v.ki > 14) { v.ki -= 14; g.afterimage(v); v.pos.x -= f.aim.x * 22; v.pos.z -= f.aim.z * 22; v.invuln = 0.35; g.audio.teleport(); }
        else { v.invuln = 0.4; }
        g.vfx.flash(v.pos.clone().setY(5), v.def.colors.accent, 6, 0.2);
        v.grabbedBy = null; v.state = 'idle'; f.grabbing = null; f.grabState = null;
        return;
      }
      if (f.grabT <= 0) this._throw(f);
    }
  }
}
