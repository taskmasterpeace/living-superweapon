# Sound library — event map (what we HAVE vs what's MISSING)

The lesson from review: a weapon is not one sound, it's a set of **events**. A grenade =
pin-pull → throw → bounce → cook → detonate. A blade = swing → hit-flesh → hit-armor → (thrown) thunk.
This maps the library by event so gaps are visible. Grounded in `src/data/armory.js`,
`src/data/audio-cues.js`, and `docs/infantry/weapons.md`.

## HAVE — generated, in the audition harnesses (candidates to vote on)

**Firearm FIRE** (one per weapon, re-rolled punchier): M16, AK, battle rifle, M24 bolt sniper,
M107 .50, SAW, MP5, suppressed PDW, combat shotgun, auto shotgun, 9mm, .44 magnum, machine pistol.

**Melee**
- swing / slash (per blade: katana, knife, tomahawk, claws, baton, great blade)
- hit **FLESH** (wet cut) · hit **ARMOR/WALL** (metallic clang) · **thrown blade** thunk-into-wood
- fist hit body (bare)

**Throw & grenade verbs** (the ones we were missing): throw whoosh · grenade pin-pull ·
grenade bounce on concrete · fuse cook.

**Explosives**: frag · breaching charge · directional (claymore) mine · planted-charge detonate.

**Deployable mine**: arm (the one you liked → spider mines) · countdown timer · detonate.

**Gadgets — deploy one-shots**: flashbang, extraction beacon, motion ping, ballistic plate hit,
riot-shield hit, CS/mustard/smoke release, NVG flip-on, jammer activate, trauma kit.

**Gadgets — RUNNING loops** (new, seamless): comms jammer · night-vision hum · motion tracker ·
thermal optic · rappel/winch reel-in.

**Ability / combat cues** (separate file, `audition-all.html`): melee light/heavy, beams, blasts,
charge/release, shields, deflect, constructs, nanites, movement (walk/run/hover/flight/boost/brake/
landing), weather beds + thunder, research/objective/correspondent/UI.

## MISSING — the next batches to build (say the word)

**#1 Bullet impacts — the biggest gap for a shooter.** Where rounds LAND:
- impact **flesh** (body hit) · **concrete/stone** · **metal** (clang + spark) · **dirt/sand** · **wood** · **glass** (shatter) · **water**
- **ricochet** (whine-off) · **whiz-by / supersonic crack** overhead · **shell casings** hitting the ground

**#2 Weapon handling**: draw/equip · holster · mag-out / mag-in per weapon (we only have generic
reload phases) · shotgun shell-by-shell load · empty/dry-fire (have) · weapon jam.

**#3 Melee handling**: block / parry (blade-on-blade) · draw / sheathe · whiff (pure miss).

**#4 Surface footsteps**: per-surface (concrete, dirt, metal grating, water, gravel) — we only have
generic walk/run.

**#5 Vehicle detail**: door, damage/impact, boost — we have rotor/jet/flyby/explosion.

**Skipped on purpose**: any spoken lines, grunts, gas-mask breathing, pain vocals — voice is a
separate authored category (no fake speech), per the handoff.
