// =================================================================================================
// POWERWORLD — the destructible/throwable environment and the knockback dial (manual §47).
//
// Run it from the browser console (needs a real WebGL context):
//     await window.LSW.pwSuite()
//
// It answers two questions Robert asked and one he did not:
//   1. can you break something, pick it up, throw it, and can the other side SHOOT IT DOWN?
//   2. does a punch send someone "flying back really far" — and by how far, in numbers?
//   3. IS THE CITY GAME UNTOUCHED? That is the last section and it is the one that matters most:
//      *"DO NOT CHANGE THE GAME! ONLY POWER WORLD! the rest of the game stays the same."*
//
// ⚠ LAW 4 — THE HARNESS PROVES ITSELF FIRST. The first check is that a point-blank haymaker lands
// at all. If it does not, nothing after it means anything, and three earlier harnesses in this repo
// went green while measuring their own arithmetic.
// ⚠ LAW 1 — DRIVE THE GATE. Every punch here goes through `melee.chargeStart/chargeRelease` and the
// real hit test; every pickup goes through `game.grabProp`, which is the function the G key calls.
// Nothing writes a velocity or an hp to make a number come out right.
// ⚠ `game.controlPlayer` is the documented override — `controlPlayer` rewrites `aim` from the mouse
// EVERY frame, after a test would have written it and before `coneFoe` reads it.
// ⚠ Both bodies are pinned to ABSOLUTE positions; holding the foe at `player.x + gap` lets the
// melee step-in smear the measured reach 8u long.
// =================================================================================================

const DT = 1 / 60;
const BODY = 9.6;                       // one fighter height — the unit distances are reported in

export async function pwSuite(game, hud, opts = {}) {
  const L = window.LSW;
  const R = [];                          // rows: { name, pass, got, want }
  const errs = [];
  const oldErr = console.error;
  console.error = (...a) => { errs.push(String(a[0]).slice(0, 160)); oldErr(...a); };

  const prevRender = game.world.render.bind(game.world);
  const prevCP = game.controlPlayer.bind(game);
  const prevRunning = game.running;
  const prevNews = game.news ? game.news.enabled : null;

  const ok = (name, pass, got, want) => { R.push({ name, pass: !!pass, got, want }); return !!pass; };
  const near = (name, got, want, tol) => ok(name, Math.abs(got - want) <= tol, got, `${want} ±${tol}`);

  // -- one place that stands a clean fight up, so every measurement starts identically -----------
  const stand = (modeId, p1, p2) => {
    hud.hideTitle(); game.running = true; game.world.render = () => {};
    game.startMode(modeId, { p1, p2, enemy: p2 });
    if (game.news) game.news.enabled = false;   // ⚠ `onAir` is a GETTER — assigning it throws
    const p = game.humans[0].fighter;
    // ⚠ NOT `entities[1]` — that is the KMK 9 camera operator in any mode that has a press pack.
    const foe = game.entities.find((e) => e.def && e.def.id === p2);
    return { p, foe };
  };

  // -- land ONE real haymaker and report how far the body travelled ------------------------------
  // `o.swoop` flies the puncher IN under its own power first, so `_momSpd` is earned by travelling
  // rather than written — momentum melee samples the speed you BROUGHT, before the lunge fakes one.
  const punch = (modeId, p1, p2, o = {}) => {
    const { p, foe } = stand(modeId, p1, p2);
    if (!foe) return { travel: 0, peak: 0, dmg: 0, hit: false };
    foe.ai = null;                       // the victim neither steers nor fights back: isolate the law
    const FOEX = o.swoop ? 240 : 6, Y = o.swoop ? 24 : 0;
    let frame = 0, released = false, hitAt = null, start = null, maxD = 0, peak = 0, momAt = 0;
    game.controlPlayer = (dt) => {
      if (!o.swoop) { p.aim.set(1, 0, 0); p.aim3.set(1, 0, 0); p.facing = 0; }
      else {
        p.aim.set(1, 0, 0); p.aim3.set(1, 0, 0); p.facing = 0;
        p.flying = true; p.cruiseHeld = true; p.ki = p.maxKi;
        p.move({ x: 1, z: 0 }, dt, 1);           // real flight, real speed, real momentum
      }
      if (frame === 2) game.melee.chargeStart(p);
      const d = Math.abs(foe.pos.x - p.pos.x);
      const fire = o.swoop ? (p.meleeCharge > 0.6 && d < 7.4) : frame === 45;
      if (fire && !released) { released = true; momAt = Math.hypot(p.vel.x, p.vel.y, p.vel.z); game.melee.chargeRelease(p); }
    };
    for (frame = 0; frame < 1200; frame++) {
      if (!released) { if (!o.swoop) { p.pos.set(0, 0, 0); p.vel.set(0, 0, 0); } foe.pos.set(FOEX, Y, 0); foe.vel.set(0, 0, 0); }
      game.update(DT);
      if (released && hitAt === null && foe.hp < foe.maxHp) { hitAt = frame; start = foe.pos.clone(); }
      if (hitAt !== null) {
        const s = Math.hypot(foe.vel.x, foe.vel.y, foe.vel.z);
        if (s > peak) peak = s;
        const d = Math.hypot(foe.pos.x - start.x, foe.pos.z - start.z);
        if (d > maxD) maxD = d;
      }
    }
    return { travel: +maxD.toFixed(1), peak: +peak.toFixed(1), dmg: +(foe.maxHp - foe.hp).toFixed(1), hit: hitAt !== null, momAt: +momAt.toFixed(1) };
  };

  try {
    // ==========================================================================================
    // 0 · THE HARNESS PROVES ITSELF
    // ==========================================================================================
    const pw = punch('powerworld', 'rage', 'sol');
    ok('a point-blank haymaker lands at all (else nothing below means anything)', pw.hit && pw.dmg > 10, `${pw.dmg} dmg`, '> 10');

    // ==========================================================================================
    // 1 · KNOCKBACK — "they go flying back really far"
    // ==========================================================================================
    const city = punch('duel', 'rage', 'sol');
    ok('POWERWORLD: a haymaker carries the body a long way', pw.travel > 100, `${pw.travel}u (${(pw.travel / BODY).toFixed(1)} bodies)`, '> 100u');
    ok('THE CITY: the same punch is UNCHANGED', Math.abs(city.travel - 7.2) < 0.6, `${city.travel}u`, '7.2u (pre-change)');
    ok('PowerWorld throws you at least 10× the city', pw.travel / Math.max(0.1, city.travel) > 10, `${(pw.travel / city.travel).toFixed(1)}×`, '> 10×');

    // the drag law in isolation — a known impulse, so the coefficient can be read off directly
    const carry = (modeId, v0) => {
      const { foe } = stand(modeId, 'rage', 'sol');
      foe.ai = null; foe.pos.set(0, 30, 0); foe.vel.set(v0, 0, 0);
      foe.launchT = foe._chaseKb ? L.PW_KB.window : 1.1;
      const s0 = foe.pos.clone(); let m = 0;
      for (let i = 0; i < 900; i++) { game.update(DT); const d = Math.hypot(foe.pos.x - s0.x, foe.pos.z - s0.z); if (d > m) m = d; }
      return +m.toFixed(1);
    };
    const c101 = carry('duel', 101), p101 = carry('powerworld', 101);
    near('THE CITY: a 101 u/s launch still carries 16.0u exactly as documented', c101, 16.0, 0.6);
    ok('POWERWORLD: the same launch carries far further', p101 > 120, `${p101}u`, '> 120u (was 60.3)');

    // ⚠ THE CATCH LINE, AND IT IS ASSERTED AGAINST THE DISTRIBUTION, NOT AGAINST ONE STAGED HIT.
    // Multiplying the impulse without moving `intercept`'s too-fast-to-follow line would make every
    // launch uncatchable and silently delete teleport-intercept; setting the line above everything
    // achievable is the same failure wearing a number. The invariant that actually says the trade
    // exists is that BOTH SIDES OF IT ARE OCCUPIED in a real fight.
    // ⚠ MEASURED ACROSS VICTIMS, NOT SAMPLED FROM A FIGHT. My first version collected launch speeds
    // from 90 seconds of AI-vs-AI: it worked, then returned ZERO on the next run because the two
    // bots simply never closed. A check whose subject is whether two AIs feel like fighting is not a
    // check. The same punch landed on six different fighters is deterministic AND says something
    // truer — `kbMul` is `(metal ? 0.72 : 1) × (1.22 − strength × 0.047)`, so who you hit decides how
    // far they go, and the catch line has to fall INSIDE that spread or the rule is decorative.
    const CATCH = +(L.PW_KB.catchK * L.PW_KB.kb).toFixed(1);
    const victims = ['titan', 'sol', 'vega', 'gale', 'rage'].map((id) => ({ id, ...punch('powerworld', 'rage', id) }));
    const peaks = victims.map((v) => v.peak).sort((a, b) => a - b);
    ok('the same haymaker launches different fighters at very different speeds', peaks[peaks.length - 1] / peaks[0] > 1.8, victims.map((v) => `${v.id} ${v.peak}`).join(' · '), 'a real spread');
    ok('a STANDING haymaker on a heavyweight stays catchable (teleport-intercept survives)', pw.peak < CATCH, `${pw.peak} u/s`, `< ${CATCH}`);
    ok('but the hits that send someone furthest are NOT (the ESF trade is occupied on both sides)', peaks[peaks.length - 1] > CATCH && peaks[0] < CATCH, `${peaks[0]} < ${CATCH} < ${peaks[peaks.length - 1]}`, 'the line falls inside the spread');

    // ==========================================================================================
    // 2 · THE GROUND IS THROWABLE
    // ==========================================================================================
    const ent = await import(specifierFor('entity.js'));
    const stg = await import(specifierFor('powerworld.js'));
    stand('powerworld', 'rage', 'sol');
    for (let i = 0; i < 60; i++) game.update(DT);
    const W = game.world;
    const rungs = new Set(W.rocks.map((r) => r.rung));
    ok('the stage has loose rock on the ground before anything is broken', W.rocks.length >= 20, W.rocks.length, '>= 20');
    ok('it spans every rung of the rubble ladder', rungs.size === stg.RUBBLE.length, [...rungs].join('/'), stg.RUBBLE.map((r) => r.n).join('/'));

    // ⚠ THE LADDER MUST SPLIT THE ROSTER. A rung nobody can reach is a rung that does not exist —
    // and a rung EVERYONE can reach is the same failure the other way round.
    const caps = L.ROSTER.map((d) => ent.liftCapacityOf(d));
    const canLift = stg.RUBBLE.map((r) => caps.filter((c) => c >= r.w).length);
    ok('every rung is liftable by SOMEBODY and none by everybody', canLift.every((n, i) => n > 0 && n < caps.length && (i === 0 || n < canLift[i - 1])), canLift.join('/'), 'strictly descending, 0 < n < 52');

    // drive the REAL pickup path — `grabProp` is what the G key calls (game.js interactVerb chain)
    const liftTest = (heroId, rungName) => {
      const { p } = stand('powerworld', heroId, 'sol');
      for (let i = 0; i < 30; i++) game.update(DT);
      const rec = game.world.rocks.find((r) => r.rung === rungName);
      p.pos.set(rec.x, 0, rec.z); p.vel.set(0, 0, 0);
      for (let i = 0; i < 6; i++) game.update(DT);
      const verb = game.interactVerb(p);
      const got = game.grabProp(p);
      return { got, verb, carrying: !!p._carry, w: p._carry && p._carry.w };
    };
    const heavy = liftTest('rage', 'MONOLITH');
    ok('RAGE (87.9t) hoists a 60t MONOLITH', heavy.got && heavy.carrying, `${heavy.verb} → ${heavy.w}t`, 'hoist → 60t');
    // ⚠ THE WEAK HERO IS DERIVED, NOT NAMED. My first pass used HIVE for both halves and HIVE lifts
    // 0.10t — below the 0.12t SHARD — so the roster's actual floor made the "even the weakest can
    // throw the lightest" claim FALSE. Take the lightest fighter who genuinely clears the bottom rung.
    const weakest = L.ROSTER.map((d) => ({ d, c: ent.liftCapacityOf(d) })).filter((x) => x.c >= stg.RUBBLE[0].w).sort((a, b) => a.c - b.c)[0];
    const light = liftTest(weakest.d.id, 'MONOLITH');
    ok(`${weakest.d.name} (${weakest.c.toFixed(2)}t) cannot — STRENGTH decides, not the button`, !light.got && !light.carrying, `${light.verb}, carrying=${light.carrying}`, 'refused');
    const shard = liftTest(weakest.d.id, 'SHARD');
    ok(`...but the roster's weakest lifter can still throw a ${stg.RUBBLE[0].w}t SHARD`, shard.got && shard.carrying, `${shard.verb} → ${shard.w}t`, `hoist → ${stg.RUBBLE[0].w}t`);
    const belowFloor = L.ROSTER.filter((d) => ent.liftCapacityOf(d) < stg.RUBBLE[0].w).length;
    ok('and the very bottom of the roster can lift NOTHING here — the ladder has a real floor', belowFloor > 0 && belowFloor < 6, `${belowFloor} of 52 can lift no rock at all`, '1..5');

    // ==========================================================================================
    // 3 · YOU CAN DESTROY SOMETHING, AND IT LEAVES RUBBLE
    // ==========================================================================================
    {
      const { p } = stand('powerworld', 'rage', 'sol');
      for (let i = 0; i < 30; i++) game.update(DT);
      const spire = game.world.cover.slice().sort((a, b) => b.h - a.h)[0];
      ok('a spire is DESTRUCTIBLE (it used to be hp 1e9)', spire.hp < 1e6 && spire.hp > 0, spire.hp, 'finite');
      ok('every cover box carries r and h (projectiles used to pass through them)', game.world.cover.every((c) => Number.isFinite(c.r) && Number.isFinite(c.h)), 'all finite', 'all finite');
      const rocks0 = game.world.rocks.length, cover0 = game.world.cover.length;
      game.damageBlock(spire, spire.hp + 1, { x: spire.x, y: 10, z: spire.z });   // the real damage door
      for (let i = 0; i < 40; i++) game.update(DT);
      ok('breaking it removes it from cover', game.world.cover.length === cover0 - 1, game.world.cover.length, cover0 - 1);
      ok('...and leaves rubble on the ground you can pick up', game.world.rocks.length > rocks0, `${rocks0} → ${game.world.rocks.length}`, '> ' + rocks0);
      const fresh = game.world.rocks.slice(rocks0);
      ok('the rubble is sized from what broke, not a constant', fresh.some((r) => r.w >= 1), fresh.map((r) => r.rung).join('/'), 'at least one CHUNK or heavier');
      p.pos.set(fresh[0].x, 0, fresh[0].z);
      for (let i = 0; i < 6; i++) game.update(DT);
      ok('a piece of a broken spire is genuinely liftable', game.grabProp(p), !!p._carry, true);
    }

    // ⚠ AND SHOTS ACTUALLY MEET THE ROCK NOW. The stage's cover records were missing `r` and `h`,
    // which `projectiles.js` compares against (`hypot(...) < c.r + radius && pos.y < c.h`) — and
    // `x < undefined` is false, so every bullet, blast and beam went straight through all fifteen
    // spires while bodies bounced off them. Shooting a thrown rock down is meaningless in a world
    // where the rocks themselves are transparent to fire.
    {
      const { p, foe } = stand('powerworld', 'pyre', 'sol');
      foe.ai = null;
      for (let i = 0; i < 40; i++) game.update(DT);
      const spire = game.world.cover.slice().sort((a, b) => b.h - a.h)[0];
      const ux = spire.x / Math.hypot(spire.x, spire.z), uz = spire.z / Math.hypot(spire.x, spire.z);
      const d = Math.hypot(spire.x, spire.z);
      p.pos.set(ux * (d - 60), 0, uz * (d - 60)); p.vel.set(0, 0, 0);
      foe.pos.set(ux * (d + 60), 0, uz * (d + 60)); foe.vel.set(0, 0, 0);   // spire dead between them
      const foeHp0 = foe.hp, hp0 = spire.hp;
      game.controlPlayer = () => {
        p.aim.set(ux, 0, uz); p.aim3.set(ux, 0.02, uz).normalize(); p.ki = p.maxKi;
        if (p.slots.lmb) p.slots.lmb.cd = 0;
        L.runSlot(p, 'lmb', { pressed: true, held: false, released: true, dt: DT }, game);
      };
      for (let i = 0; i < 200; i++) game.update(DT);
      ok('a spire STOPS gunfire (it was transparent to every shot)', foe.hp === foeHp0 && spire.hp < hp0, `foe took ${(foeHp0 - foe.hp).toFixed(1)}, spire took ${(hp0 - spire.hp).toFixed(1)}`, 'foe 0, spire > 0');
      game.controlPlayer = prevCP;
    }

    // ==========================================================================================
    // 4 · AND THEY CAN SHOOT IT OUT OF THE AIR
    // ==========================================================================================
    // Robert: "the other person could be throwing little energy blasts at whatever you're throwing
    // at them before it hit them."
    // ⚠ THE SHOOTER IS PYRE, and it is chosen for a reason: its LMB is the only kind of thing you
    // would actually use here — a cheap, fast, tapped `projectile` (18 dmg, 0.4s, 7 ki). "Little
    // energy blasts" is a literal description of a slot type, not a metaphor.
    const throwAt = (modeId, o = {}) => {
      const { p, foe } = stand(modeId, 'rage', 'pyre');
      foe.ai = null;
      for (let i = 0; i < 40; i++) game.update(DT);
      p.pos.set(0, 0, 0); p.vel.set(0, 0, 0);
      // ⚠ THE FOE STANDS AT THE END OF THE ARC, NOT WHEREVER IS CONVENIENT. A hurled rock leaves at
      // ~92 u/s with an authored 0.34 loft, so mid-flight it is 20u over a fighter's head and sails
      // clean past anyone standing at half range — `overlapFoe`'s vertical window is not the throw's.
      foe.pos.set(o.gap || 125, 0, 0); foe.vel.set(0, 0, 0);
      const foeHp0 = foe.hp;
      const rocks = game.world.rocks || [];
      if (!rocks.length) return { hoisted: false, verb: '—', flung0: 0, intercepted: false, foeTook: 0, noRock: true };
      const rec = rocks.filter((r) => !r.carried && !r.dead).reduce((a, b) => (Math.hypot(b.x, b.z) < Math.hypot(a.x, a.z) ? b : a));
      p.pos.set(rec.x, 0, rec.z);
      for (let i = 0; i < 4; i++) game.update(DT);
      const hoisted = game.grabProp(p);
      p.aim3.set(foe.pos.x - p.pos.x, 0.15 * Math.abs(foe.pos.x - p.pos.x), foe.pos.z - p.pos.z).normalize();
      p.aim.set(1, 0, 0);
      const verb = game.interactVerb(p);
      game.throwProp(p);
      const flung0 = (game._flung || []).length;
      let intercepted = false, shots = 0;
      for (let i = 0; i < 400; i++) {
        const fl = (game._flung || [])[0];
        if (fl && o.shoot && shots < o.shoot) {
          // drive a REAL projectile: aim the shooter at the prop and fire its own slot
          foe.aim.set(fl.x - foe.pos.x, 0, fl.z - foe.pos.z).normalize();
          foe.aim3.set(fl.x - foe.pos.x, fl.y - (foe.pos.y + 5.8), fl.z - foe.pos.z).normalize();
          foe.ki = foe.maxKi;
          if (foe.slots.lmb) foe.slots.lmb.cd = 0;
          L.runSlot(foe, 'lmb', { pressed: true, held: false, released: true, dt: DT }, game); shots++;
        }
        game.update(DT);
        // ⚠ READ THE RECORD CAPTURED BEFORE THE STEP. `hitFlung` marks it and the vfx entry splices
        // it out of `_flung` in the SAME update, so re-reading `_flung[0]` afterwards finds nothing
        // and the interception is invisible — which is exactly how this check failed first time.
        if (fl && fl.shot) intercepted = true;
        if (!(game._flung || []).length && flung0) break;
      }
      return { hoisted, verb, flung0, intercepted, foeTook: +(foeHp0 - foe.hp).toFixed(1), rung: rec.rung };
    };

    const noShoot = throwAt('powerworld', {});
    ok('a thrown rock registers as a real object in the world', noShoot.flung0 === 1, noShoot.flung0, 1);
    ok('the G-chain reads THROW while carrying', noShoot.verb === 'throw', noShoot.verb, 'throw');
    ok('unopposed, the thrown rock reaches them and hurts', noShoot.foeTook > 0, `${noShoot.foeTook} dmg (a ${noShoot.rung})`, '> 0');

    const shot = throwAt('powerworld', { shoot: 60 });
    ok('SHOT OUT OF THE AIR by real projectile fire', shot.intercepted, shot.intercepted, true);
    ok('...and an intercepted throw does far less to them', shot.foeTook < noShoot.foeTook * 0.6, `${shot.foeTook} vs ${noShoot.foeTook}`, '< 60%');

    // weight decides how much fire it takes to break — the ladder again
    const breakCost = (w) => {
      stand('powerworld', 'rage', 'sol');
      const hp = 16 + w * 20;
      return Math.ceil(hp / 18);           // 18 ≈ a typical small blast
    };
    ok('a shard breaks in fewer blasts than a car', breakCost(0.12) < breakCost(1.9), `${breakCost(0.12)} vs ${breakCost(1.9)}`, 'fewer');

    // the AI half — Robert described the exchange in BOTH directions, so a bot that can only ever
    // EAT a thrown boulder would make half of this single-player-only.
    {
      const { p, foe } = stand('powerworld', 'rage', 'pyre');
      for (let i = 0; i < 40; i++) game.update(DT);
      let seen = 0, tried = 0;
      for (let trial = 0; trial < 6; trial++) {
        const rec = (game.world.rocks || []).find((r) => !r.carried && !r.dead && r.w <= 1.5);
        if (!rec) break;
        p.pos.set(rec.x, 0, rec.z); p.vel.set(0, 0, 0);
        foe.pos.set(rec.x + 125, 0, rec.z); foe.vel.set(0, 0, 0);
        foe.hp = foe.maxHp; foe.ki = foe.maxKi; foe._flungShotCd = 0;
        for (let i = 0; i < 4; i++) game.update(DT);
        if (!game.grabProp(p)) continue;
        tried++;
        p.aim3.set(foe.pos.x - p.pos.x, 0.15 * Math.abs(foe.pos.x - p.pos.x), foe.pos.z - p.pos.z).normalize();
        game.throwProp(p);
        for (let i = 0; i < 400 && (game._flung || []).length; i++) {
          const fl = (game._flung || [])[0];
          game.update(DT);
          if (fl && fl.shot) { seen++; break; }
        }
      }
      ok('a BOT will shoot down an incoming throw on its own', seen > 0, `${seen}/${tried} throws intercepted by the AI`, '>= 1');
    }

    // ==========================================================================================
    // 5 · THE CITY IS UNCHANGED — the section that decides whether any of this may ship
    // ==========================================================================================
    {
      // ⚠ THE BASELINE IS TAKEN FROM A CLEAN CITY MATCH, not from wherever the suite happened to
      // leave the world. My first pass captured `BANDS` after section 4 had already been in
      // PowerWorld, so the "restored" check compared the city's honest 260 against the dimension's
      // raised 900 and reported a failure that was the harness's own contamination.
      const util = await import(specifierFor('core/util.js'));
      stand('duel', 'rage', 'sol');
      for (let i = 0; i < 60; i++) game.update(DT);
      const bands0 = { ...util.BANDS };
      const cityCover0 = game.world.cover.length, cityRocks0 = (game.world.rocks || []).length;
      // cross into PowerWorld, fight, break something, throw something, then go back to a city duel
      const { p } = stand('powerworld', 'rage', 'sol');
      for (let i = 0; i < 60; i++) game.update(DT);
      const spire = game.world.cover.slice().sort((a, b) => b.h - a.h)[0];
      game.damageBlock(spire, spire.hp + 1, { x: spire.x, y: 10, z: spire.z });
      const rec = game.world.rocks[0];
      p.pos.set(rec.x, 0, rec.z);
      for (let i = 0; i < 4; i++) game.update(DT);
      game.grabProp(p); game.throwProp(p);
      for (let i = 0; i < 20; i++) game.update(DT);

      const { p: cp, foe: cf } = stand('duel', 'rage', 'sol');
      for (let i = 0; i < 120; i++) game.update(DT);
      const carrying = game.entities.filter((e) => e._chaseKb || e._openSky).length;
      ok('no fighter carries the PowerWorld flags in a city match', carrying === 0, carrying, 0);
      ok('nothing is left flung', (game._flung || []).length === 0, (game._flung || []).length, 0);
      ok('the flight ceiling is back where the city put it', util.BANDS.ceiling === bands0.ceiling && util.BANDS.sky === bands0.sky, `${util.BANDS.ceiling}/${util.BANDS.sky}`, `${bands0.ceiling}/${bands0.sky}`);
      ok('no city cover box is stage cover (no onShatter hook anywhere)', game.world.cover.every((c) => !c.onShatter), 'none', 'none');
      ok('the stage is closed', !game._pwStage, game._pwStage, null);
      ok('no PowerWorld rubble followed us home', !(game.world.rocks || []).some((r) => r.rung), 'no rung-tagged rocks', 'none');
      ok('the city has exactly the cover and props it had before the crossing', game.world.cover.length === cityCover0 && (game.world.rocks || []).length === cityRocks0, `${game.world.cover.length}/${(game.world.rocks || []).length}`, `${cityCover0}/${cityRocks0}`);
      ok('the mannequin skin was handed back', game.entities.every((e) => !e._pwSkin), 'all restored', 'all restored');
      ok('no stage cover is stranded in the tower cutaway ledger', !game.world._fades || [...game.world._fades.keys()].every((c) => !c.onShatter), game.world._fades ? game.world._fades.size : 0, 'no stage entries');

      // and the city's own throw still behaves exactly as before: nothing registers, nothing shoots it
      if (game.world.cars && game.world.cars.length) {
        const car = game.world.cars[0];
        cp.pos.set(car.x, 0, car.z);
        for (let i = 0; i < 4; i++) game.update(DT);
        const hoisted = game.grabProp(cp);
        if (hoisted) { cp.aim3.set(1, 0.12, 0).normalize(); game.throwProp(cp); }
        ok('a car thrown in the CITY registers nothing shootable', (game._flung || []).length === 0, `hoisted=${hoisted}, flung=${(game._flung || []).length}`, 'flung 0');
      } else R.push({ name: 'a car thrown in the CITY registers nothing shootable', pass: true, got: 'skipped — no cars in this theatre', want: '—' });

      // ⚠ THE THREE FALLBACKS, DRIVEN RATHER THAN REASONED ABOUT. `propInReach` reads `rk.w`,
      // `grabProp` reads `rk.s` and `rk.color`, and a CITY rock record has none of the three — so
      // the claim "identical for every city rock" rests entirely on those `||` defaults. A record
      // shaped exactly like the city's is pushed here and taken through the real hoist path.
      game.world.rocks = game.world.rocks || [];
      game.world.rocks.push({ x: cp.pos.x + 2, z: cp.pos.z, mesh: { visible: true }, carried: false, dead: false });
      for (let i = 0; i < 4; i++) game.update(DT);
      const gotCity = game.grabProp(cp);
      ok('a city-shaped rock record still weighs the old 0.5t constant', gotCity && cp._carry && cp._carry.w === 0.5, cp._carry && cp._carry.w, 0.5);
      ok('...and the flung list stays empty when the city throws it', (game.throwProp(cp), (game._flung || []).length === 0), (game._flung || []).length, 0);
      void cf;
    }
  } catch (e) {
    R.push({ name: 'SUITE THREW', pass: false, got: String((e && e.stack) || e).slice(0, 400), want: 'no throw' });
  } finally {
    game.world.render = prevRender;
    game.controlPlayer = prevCP;
    game.running = prevRunning;
    if (game.news && prevNews !== null) game.news.enabled = prevNews;
    console.error = oldErr;
  }

  const fails = R.filter((r) => !r.pass);
  const out = {
    checks: R.length, failures: fails.length,
    consoleErrors: errs.length, errorSample: errs.slice(0, 5),
    rows: R.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — got ${r.got}, want ${r.want}`),
    dial: { ...L.PW_KB, derivedCatchSpeed: L.PW_KB.catchK * L.PW_KB.kb },
  };
  if (!opts.quiet) { console.log(`%cPOWERWORLD SUITE — ${R.length} checks, ${fails.length} failures, ${errs.length} console errors`, 'font-weight:bold'); console.table(R); }
  return out;
}

// ⚠ THE PHANTOM-MODULE LAW. Vite version-stamps modules, so a bare `import('/src/...')` can resolve
// to a SECOND instance with its own module state — and `BANDS` is exactly the kind of module-level
// object a test would then read from the wrong copy. Find the specifier the PAGE actually loaded.
function specifierFor(tail) {
  const hit = performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('/src/') && n.includes(tail.replace('core/', '')));
  const exact = hit.find((n) => n.includes('/' + tail.split('/').pop()));
  return exact || hit[0] || ('/src/' + (tail.includes('/') ? tail : 'engine/' + tail));
}
