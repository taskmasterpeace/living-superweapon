// =================================================================================================
// THE DEATH & REACTION RESOLVER — acceptance suite (docs/COMBAT_MANUAL.md §49).
//
//     await window.LSW.deathSuite()
//
// Drives REAL soldier KOs through takeDamage → _ko → beginDeathPresentation and the clip-complete
// handoff, and the nonlethal knockdown → impact-recovery get-up. Nothing writes an hp or a pose to
// force a number: the fatal blow is a real ballistic hit from a real attacker, and the direction is
// read from where that attacker stood.
//
// ⚠ LAW 4 — THE HARNESS PROVES ITSELF FIRST: a soldier must carry the modular actor, the registry
//   must be loaded, and the front/rear death clips must be on the actor. If not, nothing else means
//   anything (the pwSuite went green measuring its own arithmetic once).
// ⚠ LAW 1 — DRIVE THE GATE: the kill goes through f.takeDamage; the knockdown through the real
//   stun-fall that entity.js:2096 turns into impact-recovery.
// =================================================================================================
import { createSoldierFamilyDefinition } from '../data/soldier-family.js';
import { deathReactionReady, loadDeathRegistry, attachDeathClips, deathDirection, getupTake } from '../engine/death-presentation.js';

const DT = 1 / 60;

export async function deathSuite(game, hud, opts = {}) {
  const R = [], errs = [];
  const oldErr = console.error;
  console.error = (...a) => { errs.push(String(a[0]).slice(0, 160)); oldErr(...a); };
  const prevRender = game.world.render.bind(game.world);
  const prevCP = game.controlPlayer.bind(game);
  const prevRunning = game.running;
  const prevNews = game.news ? game.news.enabled : null;
  const prevKO = game.handleKO.bind(game);
  const koCount = new Map();
  game.handleKO = (f) => { koCount.set(f, (koCount.get(f) || 0) + 1); return prevKO(f); };

  const ok = (name, pass, got, want) => { R.push({ name, pass: !!pass, got, want }); return !!pass; };

  hud.hideTitle(); game.running = true; game.world.render = () => {};
  game.controlPlayer = () => {};                      // the player does nothing; we drive the victims directly
  game.startMode('duel', { p1: 'sarge', p2: 'merc' });
  if (game.news) game.news.enabled = false;
  const killer = game.humans[0].fighter;
  killer.ai = null;
  await loadDeathRegistry(typeof fetch !== 'undefined' ? fetch.bind(window) : null);

  const step = (n) => { for (let i = 0; i < n; i++) game.update(DT); };

  // Stand a fresh soldier up, wait for its modular actor, park it still and unkillable-by-anyone-else.
  const spawnSoldier = async (x, z, facing = 0) => {
    const def = createSoldierFamilyDefinition({ id: 'test-soldier', team: 1 });
    const f = game.addFighter(def, { team: 1, x, z });
    f.ai = null; f.noRespawn = true; f.persistCorpse = true;   // the highwall body-remains context
    try { await f._modularReady; } catch { /* reported below */ }
    attachDeathClips(f._modularCharacter);                      // deterministic: the real game attaches on load, async

    f.pos.set(x, 0, z); if (f.obj) f.obj.position.copy(f.pos); f.vel.set(0, 0, 0); f.facing = facing;
    return f;
  };

  // Kill a soldier with a real ballistic hit from `from` ('front'|'rear' of its facing).
  const killFrom = (f, from) => {
    const fwd = { x: Math.sin(f.facing), z: Math.cos(f.facing) }, sign = from === 'rear' ? -1 : 1;
    killer.pos.set(f.pos.x + fwd.x * 8 * sign, 0, f.pos.z + fwd.z * 8 * sign);
    if (killer.obj) killer.obj.position.copy(killer.pos);
    f.vel.set(0, 0, 0); f.hp = 100;
    f.takeDamage(400, { src: killer, dtype: 'ballistic', dmgClass: 'ballistic' });   // a lethal shot, low knockback
    return f;
  };

  // -- SELF-PROOF -------------------------------------------------------------------------------
  const proof = await spawnSoldier(-30, -30, 0);
  const c = proof._modularCharacter;
  ok('SELF: soldier carries the modular actor', !!c, !!c, 'a modular character');
  ok('SELF: death registry loaded', deathReactionReady(), deathReactionReady(), true);
  const hasFront = !!c?.clips.get('Death01'), hasRear = !!c?.clips.get('Death02');
  ok('SELF: front death clip (Death01) on actor', hasFront, hasFront, true);
  ok('SELF: rear death clip (Death02) on actor', hasRear, hasRear, true);
  const canRun = !!c && deathReactionReady() && hasFront && hasRear;

  if (canRun) {
    // -- C1/C2: the RIGHT authored death plays BEFORE any ragdoll, by direction ------------------
    const front = await spawnSoldier(-30, 0, 0); killFrom(front, 'front');
    ok('C1 front-impact kill selects Death01', front._deathPresentation?.take === 'Death01', front._deathPresentation?.take, 'Death01');
    ok('C2 authored death plays BEFORE ragdoll (front)', !!front._deathPresentation && !front.ragdoll, `pres=${!!front._deathPresentation} rag=${!!front.ragdoll}`, 'pres=true rag=false');

    const rear = await spawnSoldier(0, 0, 0); killFrom(rear, 'rear');
    ok('C1 rear-impact kill selects Death02', rear._deathPresentation?.take === 'Death02', rear._deathPresentation?.take, 'Death02');

    // -- C3: the clip completes, hands off to the authored-rest corpse, and it does NOT spin -----
    // Step past the 2.4s clip, then let it settle. Measure the body's rotation over the last second.
    step(170);                                              // ~2.83s: clip (2.4s) done + handoff
    ok('C3 handed off to a ragdoll after the clip', !!front.ragdoll && !front._deathPresentation, `rag=${!!front.ragdoll} pres=${!!front._deathPresentation}`, 'rag=true pres=false');
    ok('C3 handoff is the rigid authored-rest corpse', !!front.ragdoll?._authoredRest, !!front.ragdoll?._authoredRest, true);
    // rotation over a further second: an authored-rest corpse holds its pose (no helicopter)
    const rd = front.ragdoll, headStart = rd && { ...rd.P.head.pos }, ftStart = rd && { ...rd.P.ftL.pos };
    step(60);
    const spin = rd ? Math.hypot(rd.P.head.pos.x - headStart.x, rd.P.head.pos.z - headStart.z) + Math.hypot(rd.P.ftL.pos.x - ftStart.x, rd.P.ftL.pos.z - ftStart.z) : 999;
    ok('C3 the body does not spin (Δ<1u over 1s after settle)', spin < 1, +spin.toFixed(3), '< 1u');
    ok('C3 corpse settles to sleep', !!rd?.asleep, !!rd?.asleep, true);

    // -- C4: the corpse persists and remains a live entity (interactable per policy) --------------
    ok('C4 corpse persists as an entity', game.entities.includes(front) && !front.alive, game.entities.includes(front), 'present, not alive');

    // -- C5/C8: the death books exactly once; no duplicate at the animation→ragdoll handoff -------
    ok('C5/C8 handleKO fired exactly once for the soldier', koCount.get(front) === 1, koCount.get(front), 1);

    // -- C6: the dead cannot act ------------------------------------------------------------------
    const wasKo = front.state === 'ko' && front.alive === false;
    const slotBefore = JSON.stringify(front._slotUse || {});
    game.runSlot?.(front, 'lmb', { pressed: true, held: true }, game);   // try to make a corpse shoot
    front.melee?.strike?.(front);                                        // and swing
    step(4);
    const acted = JSON.stringify(front._slotUse || {}) !== slotBefore || front.state !== 'ko';
    ok('C6 KO state holds; a corpse cannot fire or move', wasKo && !acted, `ko=${wasKo} acted=${acted}`, 'ko=true acted=false');

    // -- C7: nonlethal HEAVY KNOCKDOWN uses the accepted reaction path and returns control --------
    const kd = await spawnSoldier(30, 0, 0);
    kd.pos.y = 22; if (kd.obj) kd.obj.position.copy(kd.pos); kd.stunT = 1.6; kd.vel.set(0, 0, 0);   // stunned, in the air → falls → impact-recovery
    let recovered = false, sawRecovery = false, getupClip = null;
    for (let i = 0; i < 320; i++) {                        // up to ~5.3s: fall + stun + get-up
      game.update(DT);
      if (kd._impactRecovery && !sawRecovery) { sawRecovery = true; getupClip = getupTake(kd, 'supine'); }
      if (sawRecovery && !kd._impactRecovery && kd.alive && kd.state !== 'ko') { recovered = true; break; }
    }
    ok('C7 heavy knockdown enters the impact-recovery reaction', sawRecovery, sawRecovery, true);
    ok('C7 the accepted get-up clip resolves', !!getupClip && !!kd._modularCharacter?.clips.get(getupClip), getupClip, 'a get-up clip on the actor');
    ok('C7 control returns after the get-up (alive, not KO)', recovered && kd.alive && kd.state !== 'ko', `recovered=${recovered} alive=${kd.alive} state=${kd.state}`, 'recovered, alive, controllable');
  }

  ok('NO CONSOLE ERRORS', errs.length === 0, errs.length, 0);

  // -- restore -------------------------------------------------------------------------------------
  game.handleKO = prevKO; game.controlPlayer = prevCP; game.world.render = prevRender;
  game.running = prevRunning; if (game.news && prevNews !== null) game.news.enabled = prevNews;
  try { game.startMode('duel', { p1: 'sarge', p2: 'merc' }); game.running = false; hud.showTitle?.(); } catch { /* leave as-is */ }

  const pass = R.filter(r => r.pass).length;
  const summary = { suite: 'death-reaction', pass, fail: R.length - pass, total: R.length, errors: errs.slice(0, 8), rows: R };
  console.log('[deathSuite]', pass + '/' + R.length, R.filter(r => !r.pass).map(r => `✗ ${r.name} (got ${r.got}, want ${r.want})`).join(' | ') || '✓ all green');
  return summary;
}
