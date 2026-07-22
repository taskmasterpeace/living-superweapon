// Living Superweapon — melee trifecta: Strike (beats Grab) · Grab (beats Guard) · Guard (beats Strike).
// Per-character variants: teleport-escape & energy-intangibility break front grabs; thorns hurt the holder;
// grabHeal lifesteals throws. Back-grabs (from behind) are guaranteed and hit harder.

export class MeleeSystem {
  constructor(game) { this.game = game; }

  canAct(f) { return f.alive && f.hitstop <= 0 && f.staggerT <= 0 && !f.grabbedBy && f.grabState !== 'clinch'; }

  strike(f) {
    if (!this.canAct(f) || f.grabbing || f.guarding || f.strikeActive > 0) return;
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

  guard(f, on) {
    if (on && (!this.canAct(f) || f.strikeActive > 0 || f.grabState || f.grabbing)) { f.guarding = false; return; }
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
    v.takeDamage(dmg, { src: holder, unblockable: true, hitstop: 0.14, kb: { x: dir.x * spd, y: back ? 22 : 15, z: dir.z * spd } });
    if (holder.grabHeal) holder.heal(dmg * holder.grabHeal);
    holder.hitstop = Math.max(holder.hitstop, 0.08);
    g.vfx.impact(v.pos.clone().setY(5.6), { x: dir.x, z: dir.z }, { color: holder.def.colors.accent, power: back ? 1.9 : 1.4 });
    g.world.shake(back ? 1.7 : 1.2); g.world.punch(0.72); g.audio.impact(back ? 1.4 : 1.1); g.audio.boom(0.4);
    g.slowmo(0.1, 0.42); if (g.hud) g.hud.flashScreen('#fff', 0.14);
  }

  update(f, dt) {
    const g = this.game;

    // --- strike active window ---
    if (f.strikeActive > 0) {
      f.strikeActive -= dt;
      const foe = g.coneFoe(f, 13, 0.75);
      if (foe && f.strikeHit && !f.strikeHit.has(foe.id)) {
        f.strikeHit.add(foe.id);
        const fin = f.strikeIdx === 2;
        const dmg = (fin ? 17 : 8) * f.powerBuff;
        const hs = fin ? 0.14 : 0.07;
        const blocked = foe.guarding && foe.staggerT <= 0;
        foe.takeDamage(dmg, { src: f, strike: true, hitstop: hs, kb: { x: f.aim.x * (fin ? 14 : 8), y: fin ? 30 : 2, z: f.aim.z * (fin ? 14 : 8) } });
        f.hitstop = Math.max(f.hitstop, hs * (fin ? 0.9 : 0.6));      // attacker freezes too — meaty impact
        const imp = foe.pos.clone().set((f.pos.x + foe.pos.x) / 2, 5.7, (f.pos.z + foe.pos.z) / 2);
        if (blocked) { g.vfx.impactStar(imp, 7, '#bfe0ff', 0.16); g.world.shake(0.35); g.audio.zap(520); }
        else {
          g.vfx.impact(imp, { x: f.aim.x, z: f.aim.z }, { color: f.def.colors.accent, power: fin ? 1.7 : 0.65 });
          g.world.shake(fin ? 1.5 : 0.6); g.audio.impact(fin ? 1.3 : 0.65);
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
