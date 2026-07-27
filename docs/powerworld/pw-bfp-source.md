# BID FOR POWER — THE ACTUAL SOURCE

Repo: **https://github.com/LegendaryGuard/BFP** (GPL, Quake III SDK 1.15c lineage). Read at commit
`d06afa2`, cloned and grepped locally — every `file:line` below is from that tree. 147 `.c`/`.h`
files under `source/{game,cgame,q3_ui}`, six `.cfg` files under `cfgs/`, format docs under `docs/`.

---

## ⚠ READ THIS FIRST — WHAT THIS REPO ACTUALLY IS

**It is a RECONSTRUCTION, not the original BFP source.** The README calls it *"WIP, not completed."*
The original mod's code was never released; this is a re-implementation on top of the Quake III SDK
by an author working from the shipped assets, the config files, demo files and network dumps.

That does not make it worthless — it is enormously better than fan wikis — but it changes how each
number must be weighted, and **the author tells you which ones he guessed.** These comments are in
the source:

| Site | The author's own comment | Trust |
|---|---|---|
| `game/g_active.c:431` | `// BFP - NOTE: On original BFP, this is handled into another way, so, the formula remains unknown, it tried the best` (ki-boost cost) | **Author's invention** |
| `game/g_active.c:457` | same comment, on the **block cost** formula | **Author's invention** |
| `game/g_active.c:453` | `random() < 0.75` — `// a weird random thingy (¬_¬') tried to get the similar result` | **Author's invention** |
| `game/g_weapon.c:258` | `// BFP - Melee range, it isn't known why, but it's the approximation` | **Approximation** |
| `game/g_client.c:1386` | `// BFP - NOTE: What the heck? Did BFP dev make this multiplying 9.00825 with powerlevel?` | **Reverse-engineered** — the odd constant is evidence it was fitted to real data, not invented |
| `game/bg_pmove.c:41,45` | `// BFP - Add less flight acceleration, before 8.0f` | **Deliberate BFP-vs-Q3 delta**, the strongest class of finding here |

**The `cfgs/*.cfg` files are the highest-trust artefact in the repo** — they are BFP's own shipped
data format, not reconstructed C. Where a number lives in a `.cfg`, treat it as real.

Second caveat: this tree has **features the original never had** — a Monster/Oozaru gamemode
(`EF_MONSTER`), Survival and Team-LMS gametypes, bot AI (`ai_bfp.c`). Anything gated on `EF_MONSTER`
or `GT_MONSTER` is not BFP.

---

## 1. FLIGHT — the most important section

### 1.1 The verdict on our premise

> *"We built PowerWorld's flight on the premise that 'forward is where you look, in 3-D, with
> momentum' — verify or refute that against the source."*

**Confirmed on both counts, and the mechanism is not what we built.**

`game/bg_pmove.c:1216` `PM_FlyMove()`, the wish-velocity line (`:1240`):

```c
wishvel[i] = scale * pml.forward[i]*pm->cmd.forwardmove
           + scale * pml.right[i]*pm->cmd.rightmove
           + scale * pml.up[i]*pm->cmd.upmove;
```

`pml.forward` is the **pitched** view vector, so forward genuinely is where you look in full 3-D.
Up/down is not a separate axis bolted on — it is the same `AngleVectors` basis, which is why BFP
flight reads as *aiming your body*.

And the pitch clamp is lifted in flight — `game/bg_pmove.c:3425`:

```c
if ( i == PITCH && !( ps->eFlags & EF_FLIGHT ) ) { // BFP - Avoid that when flying
```

**You can pitch past vertical and loop.** That is a real design decision and we do not have it.

### 1.2 But the momentum is Quake acceleration, not our velocity integrator

This is the substantive difference. BFP has **no momentum model of its own**. It uses stock Q3
`PM_Friction` + `PM_Accelerate` (`bg_pmove.c:628`, verbatim Q2/Q3 code, unmodified) and gets its
feel purely by **retuning two floats**:

| Constant | `bg_pmove.c` | Q3 stock | BFP | Effect |
|---|---|---|---|---|
| `pm_flyaccelerate` | `:41` | 8.0 | **2.0** | ¼ of Q3 — you accelerate slowly |
| `pm_flightfriction` | `:45` | 3.0 | **2.0** | ⅔ of Q3 — you coast longer |
| `pm_airaccelerate` | `:39` | 1.0 | **4.5** | 4.5× — real air control |
| `pm_wateraccelerate` | `:40` | 4.0 | **20.0** | — |
| `pm_accelerate` | `:38` | 10.0 | 10.0 | unchanged |
| `pm_friction` | `:43` | 6.0 | 6.0 | unchanged |
| `pm_stopspeed` | `:34` | 100.0 | 100.0 | unchanged |

**Low acceleration + low friction IS the floatiness.** There is no inertia term, no drag curve, no
"launch" state. `PM_Accelerate` only ever adds velocity along `wishdir` and only up to `wishspeed`
(`addspeed = wishspeed - currentspeed; if (addspeed <= 0) return;`) — so you cannot exceed your
target speed by accelerating, and the only thing that decays you is friction.

### 1.3 `PM_Drifting` — the one genuinely BFP-specific flight function

`game/bg_pmove.c:857`. Called from ground move, fly move and water move. On **key release** it adds
a small perpendicular push, so letting go slides rather than stops:

```c
float forwardSpeed, rightSpeed, driftFactor = 0.0003;
forwardSpeed = -DotProduct( pm->ps->velocity, pml.forward );
rightSpeed   =  DotProduct( pm->ps->velocity, pml.right );
```

- Release strafe **while descending** (`velocity[2] < 0`): `driftFactor = 0.001`, pushed along
  `pml.up` — you float up slightly out of a falling strafe.
- Release forward: pushed along `pml.right`, sign following travel direction. **`driftFactor = 0.008`
  when `|forwardSpeed| < 100`** — nearly 27× the base factor, i.e. *the drift is strongest as you
  slow down*. That is the "banking to a stop" feel.

### 1.4 Flight speed is a function of POWER LEVEL

`bg_pmove.c:608`:
```c
static float PM_KiBoostPowerlevelSpeed( void ) {
	int	powerlevel = pm->ps->persistant[PERS_POWERLEVEL];
	return pm->ps->speed + ( powerlevel * 0.5 );
}
```

Ground boost adds that flat (`:1144`). **Flight boost multiplies it again** (`:1278`):
```c
float factor = 2.0f + ( (float)pm->ps->persistant[PERS_POWERLEVEL] * 0.001 );
wishspeed += PM_KiBoostPowerlevelSpeed() * factor;
```

With `g_speed 320` (`g_cvar.h:51`, Q3 stock) and PL capped at 1000:

| PL | Walk | Ground boost | **Flight boost** |
|---|---|---|---|
| 150 (spawn default) | 320 | 715 | **1,536** |
| 500 | 320 | 890 | **1,745** |
| 1000 (max) | 320 | 1,140 | **2,780** |

**Boosted flight at max PL is ~8.7× walk speed.** Power level buys the sky, literally.

Boost is suppressed while blocking and while firing a beam — `:1275` gates on
`!(pm_flags & PMF_BLOCK)` and `!PM_IsBeamFiring()`.

### 1.5 Odds and ends, all real

- **Roll is cosmetic and only while boosting.** `PM_FlyTiltView` (`:1172`) targets **±20°** at
  `rollStep 0.2` per frame (0.375 returning to level), and only when
  `(EF_KI_BOOST || BUTTON_KI_USE)`. Not player-controlled.
- **Ki charge freezes you in the air** — `:1224`, `if (pm_flags & PMF_KI_CHARGE) pm->cmd.upmove = 0;`
- **`PMF_ULTIMATE_TIER` returns before any movement** (`:1231`) — during the 5s transformation you
  are a statue (and invulnerable, §7).
- A curiosity at `:1242`: pressing forward+strafe+up simultaneously adds a flat `wishvel[i] += 12`
  to all three components. Almost certainly a reconstruction artefact; do not copy it.

---

## 2. KI / POWER

**One pool** (`STAT_KI`) pays for flight, boost, block, teleport and every attack. Both maxima
derive from power level — `game/g_client.c:1383-1392`:

```c
client->ps.stats[STAT_KI] = 999;
client->ps.stats[STAT_KI] = client->ps.stats[STAT_KI] + ( 9.00825 * client->ps.persistant[PERS_POWERLEVEL] );
client->ps.stats[STAT_MAX_KI] = client->ps.stats[STAT_KI];
if ( client->ps.stats[STAT_MAX_KI] > 10000 ) { ... = 10000; }
```
and `:1380`: `STAT_MAX_HEALTH = 1 + PERS_POWERLEVEL`, clamped to 1000.

**Every drain is a cvar** (`game/g_cvar.h:74-92`) — this is the whole tuning surface:

| cvar | default | line | meaning |
|---|---|---|---|
| `g_basePL` | **150** | `:74` | spawn power level |
| `g_plKillBonusPct` | **.1** | `:75` | kill bonus fraction |
| `g_maxSpawnPL` | 0 | `:76` | off |
| `g_flightCost` | **50** | `:78` | ki **per second** while `EF_FLIGHT` |
| `g_flightCostPct` | 0 | `:79` | + % of maxKi |
| `g_boostCost` | **350** | `:81` | ki per second boosting — **7× flight** |
| `g_blockCost` | **2** | `:84` | block drain |
| `g_blockDelay` / `g_blockLength` | 2 / 2 | `:86-87` | |
| `g_kiRegen` | 0 | `:89` | flat regen |
| `g_kiRegenPct` | **0.6** | `:90` | **0.6% of maxKi per second** |
| `g_kiCharge` | 0 | `:91` | flat charge |
| `g_kiChargePct` | **15** | `:92` | manual charge rate |
| `g_chargeDelay` | **750** | `:69` | ms before the charge aura appears |

Applied in `ClientTimerActions` (`g_active.c:414`). Flight and regen tick inside
`while (timeResidual >= 1000)`, so those two are literally per-second; boost and block accumulate
per-msec through `client->kiResidual`.

**Regen is blocked while boosting or charging but NOT while flying** (`g_active.c:503`) — so level
flight is sustainable and boosting is not.

**Powering up (the charge key)** — `g_active.c:445`:
```c
float kiChargeTotal = ( g_kiCharge.value * 0.01 ) + g_kiChargePct.value * ( client->ps.stats[STAT_MAX_KI] * 0.0001 );
client->ps.stats[STAT_KI] += kiChargeTotal * rndKiCharge;
```
with `rndKiCharge = 0.8f + crandom() * 0.2f` (`:420`) — a deliberate jitter so the last digits of
the ki readout dance. **The cost of charging is that you cannot move or attack and you glow**
(`PM_FlyMove` zeroes `upmove`; `PMF_KI_CHARGE` gates the weapon path).

**Charge POINTS are a separate integer**, `ps->generic1`, 0–6, hard-capped at
`ATTACK_CHARGE_LIMIT = 6` (`bg_pmove.c:2963`). An attack declares `minCharge`/`maxCharge` and
`EF_READY_KI_ATTACK` is set once `generic1 >= minCharge` (`:2975`). This is the discrete charge
ladder our `charge` type approximates with a continuous float.

Per-attack cost (`bg_pmove.c:2947`) supports flat or percentage:
```c
float kiCost = ( pm->kiCost > 0 ) ? pm->kiCost : 0;
if ( pm->kiCostAsPct && kiPct > 0 ) { kiCost = pm->ps->stats[STAT_MAX_KI] * kiPct; }
```

---

## 3. THE POWERSTRUGGLE — the formula

`game/g_weapon.c:927` `Weapon_BFPBeamStruggle()`. **It is not mashing, and it is not the ki
reserve. It is a comparison of the two beams' current damage values, with one binary ×2 lever.**

```c
const float	BEAM_PUSH_STEP = 200.0f;
...
ent->parent->client->ps.weaponstate    = WEAPON_BEAMSTRUGGLE;   // both casters pinned
target->parent->client->ps.weaponstate = WEAPON_BEAMSTRUGGLE;

powerEnt    = (float)ent->damage;
powerTarget = (float)target->damage;
if ( EF_KI_BOOST || BUTTON_KI_USE on ent->parent )    powerEnt    *= 2;
if ( EF_KI_BOOST || BUTTON_KI_USE on target->parent ) powerTarget *= 2;
```
then (`:1001-1010`) the loser's beam has its `distance` reduced by `BEAM_PUSH_STEP`; **on an exact
tie BOTH are pushed back**, which is the anti-stalemate rule.

Three consequences worth taking:

1. **`ent->damage` is the CHARGE-SCALED damage**, so charge level is the primary input — the
   struggle is decided mostly before it starts.
2. **The ×2 is a HOLD** on the boost key, and boost costs 350 ki/s. The pressure is a resource burn
   you must decide to keep paying, not an input-rate contest.
3. **`PM_BeamStruggleStatus` (`bg_pmove.c:2915`) zeroes movement — both players are rooted.** The
   drama is positional helplessness, not button rate.

**Non-beam projectiles never struggle** — they resolve by an integer `priority` field
(`g_weapon.c:946-958`): higher priority survives and detonates the other; equal priority breaks
both. `sbeam` is explicitly excluded from struggles (`docs/bfp_weapon_config_file.md`).

---

## 4. MELEE — and the answer to `CATCH_SPD`

### 4.1 There is no speed threshold. There is no catch. It is a teleport.

`game/g_weapon.c:185` `CheckMeleeAttack()`. The entire mechanic:

1. Trace from the muzzle along `forward` out to `g_meleeDiveRange` (**700** units, `g_cvar.h:67`).
2. If the trace hits a living enemy player, and the distance to them is
   `>= g_meleeRange + 45` (**32 + 45 = 77** units, `g_cvar.h:68` and `g_weapon.c:259`) **and `>= 25`**,
   then — `g_weapon.c:298`, the comment is literally `// TELEPORT!` —
   ```c
   VectorCopy( tr.endpos, attacker->client->ps.origin );
   ```
   You are **snapped to the trace endpoint**. No travel, no interpolation, no cost.
3. Inside 77 units you skip the teleport and just hit them.

**I searched the whole function for any velocity, speed or `VectorLength` test on the target's
motion. There is none.** The only `velocity` reference in the function is *applying* knockback
(`:161`). The only guards on the dive are geometric — `tr.startsolid || tr.allsolid`, target not
under a brush, not the same team, target is `ET_PLAYER`, target not a sinking corpse.

**Our `CATCH_SPD = 132` has no counterpart in BFP whatsoever.** A body moving at any speed can be
reached, because reaching is instantaneous.

### 4.2 Melee damage, knockback and the stun

- `g_meleeDamage` default **10** (`g_cvar.h:66`). Melee is a **hold**, not a press:
  `MeleeHandling` (`g_active.c:776`) runs while `BUTTON_MELEE` is held and clears `PMF_MELEE` the
  moment it is released. There is **no combo system, no strings, no frame data** — it is a repeating
  dive-and-hit while you hold the key with the crosshair on someone.
- **Knockback** (`g_combat.c:1052-1176`):
  ```c
  float damageForce = (float)damage * 0.1;
  knockback = damage * damageForce;                    // i.e. damage² × 0.1
  if ( inflictor->extraKnockback != 0 ) knockback += inflictor->extraKnockback;
  if ( knockback > 1800 ) knockback = 1800;            // BFP raised Q3's cap of 200
  ```
  Melee takes a different curve entirely (`:1102-1112`) — `meleeFactor` is **7.5** at damage ≤10,
  ramping `7.5 + (dmg−10)×0.45` to 20, then `12.0 + (dmg−20)×0.1` to 50, capped 15.0; then
  `meleeKnockback = damage * meleeFactor`. At the default damage 10 that is **75**.
- At `g_meleeDamage < 4` the victim also loses 300 units of vertical velocity (`g_weapon.c:161`) —
  *knocked out of the sky*. At `< 30`, `pm_time = 200` plus `PMF_TIME_KNOCKBACK`.
- **Blocking costs the blocker 5% of max ki per melee hit** (`g_weapon.c:337`), on a 250ms debounce.
- **HIT STUN** (`g_weapon.c:352`): if the attacker is ki-boosting and `g_hitStun` is on, the victim
  gets `STAT_HITSTUN_TIME = 3000` (3 s) and the attacker gets a **6000 ms** self-cooldown before
  they can do it again. The Guide names this the core skill: *"Being able to knock people into hit
  stun with ki-boosted melee is one of the keys to being good at BFP."*

### 4.3 `Zanzoken` — the escape, with real constants

`game/g_active.c:801`. A **double-tap of strafe** teleports you 500 units sideways and **cancels
hit stun**. Detection constants at `g_active.c:843-846`:

```c
const int	ZANZOKEN_NUMBER_TIMES_ALLOWED = 10,
		ZANZOKEN_ABUSE_DELAY = 2000,
		MAX_ZANZOKEN_PRESS_TIME = 240,
		ZANZOKEN_COOLDOWN = 70;
```

- A tap counts if the key was held **>50 ms and ≤240 ms** (`:899`).
- Range `±500` units (`g_active.c:930`), placed `+16` on Z (`:828`).
- Costs **5% of max ki**, and requires you to have >5% (`:914`, `:942`).
- **Cannot be used in the first 100 ms of stun** — `if (STAT_HITSTUN_TIME > 2900) return;` (`:927`),
  i.e. a 0.1 s commitment window before the escape opens.
- 10 uses then a forced 2 s lockout; 70 ms between uses.
- Two trace guards: 100 units up (don't teleport into a ceiling) and the lateral path itself.

**This is the pairing that makes BFP's melee a game**: boosted melee imposes a 3 s stun, and the
victim's only out is a precise double-tap that costs ki and has an anti-spam ladder.

---

## 5. MOVEMENT

Almost all of it is **stock Quake III** and that is a real finding:

| Behaviour | Verdict |
|---|---|
| Ground accel/friction, air control, `PM_StepSlideMove`, `PM_SlideMove` | **Stock Q3** (`bg_slidemove.c` unmodified) |
| `PM_Accelerate` | **Stock Q3/Q2** (`bg_pmove.c:628`) |
| `PM_CmdScale` (127-axis normalisation) | Stock Q3 + a Monster-mode speed multiply |
| `g_speed 320`, `g_gravity 800` | **Stock Q3 defaults**, unchanged (`g_cvar.h:51-52`) |
| Flight | Q3's `PM_FlyMove` **retuned**, +`PM_Drifting`, +pitch unclamp, +PL speed scaling |
| Drift on release | **BFP** (`PM_Drifting`) |
| Dash / swoop | **Does not exist.** There is no dash. "Swoop" is ESF's word; BFP's equivalent is boosted flight. |
| Wall-jump | **Does not exist.** |
| Teleport | **BFP** — `Zanzoken` (§4.3) and the melee dive (§4.1). Two teleports, both short-range, both tied to melee. |
| Water jump | BFP-extended (`PM_CheckWaterSpot`, `:895`) — 200 horizontal / 300 vertical, applied in 4 directions where Q3 had 1 |

**There is no turbo/dash separate from ki boost.** `BUTTON_KI_USE` is the one "go faster" input and
it is the same input that doubles your beam in a struggle and enables hit-stun melee. **One key,
three effects, one resource** — that unification is the cleanest design idea in the whole codebase.

---

## 6. DAMAGE AND HEALTH

`STAT_MAX_HEALTH = 1 + PERS_POWERLEVEL`, capped 1000 (`g_client.c:1379`). So at the default
`g_basePL 150` you spawn with **151 HP and ~2,350 ki**; at PL 1000, **1000 HP and 10,000 ki**.

**Damage is multiplied by the ATTACKER's power level** — `g_combat.c:1119-1122`:
```c
max = attacker->client->ps.persistant[PERS_POWERLEVEL] + 1;
damage = damage * max * 0.01;
```
At PL 1000 that is a **×10.01 multiplier on every attack**. Both sides of the equation scale with
PL, so the ratio holds — but see §9 for why it does not hold in practice.

**Transformation is earned by kills, not pressed.** `g_combat.c:288-320`:
```c
attacker->...[PERS_POWERLEVEL] += 1 + ( self->...[PERS_POWERLEVEL] * g_plKillBonusPct.value );
```
with tier thresholds at **PL 100 / 250 / 500 / 1000** firing `EV_TIER_1..4`. Tiers 1–3 give a 2 s
aura; **tier 4 sets `PMF_ULTIMATE_TIER` for 5 s** (`tierUnlockedTime = level.time + 5000`).

Two facts about the ultimate tier:
- **It is total invulnerability** — `G_Damage` returns immediately at `g_combat.c:1061`:
  `if ( targ->client->ps.pm_flags & PMF_ULTIMATE_TIER ) return;`
- **It freezes you completely** — `PM_FlyMove` and every animation path return early on the flag.

And on any tier-up (`g_combat.c:381`): **full heal and full ki restore.**

---

## 7. WEAPON / ABILITY DEFINITIONS — the most valuable find

**Every attack in BFP is a row in a plain-text config file, not code.** `cfgs/bfp_weapon.cfg`
(21 attacks) + `cfgs/bfp_weapon2.cfg` (7 more) = **28 attack definitions, ~46 fields each**, parsed
once at server start. Format documented by the repo itself in `docs/bfp_weapon_config_file.md`.

A full definition, verbatim (`cfgs/bfp_weapon.cfg:49-96`):

```
(impact_beam)
weaponNum 11
attackType beam
weaponTime 500
randomWeaponTime 0
kiCostAsPct 0
kiPct 0
kiCost 250
chargeAttack 1
chargeAutoFire 0
minCharge 1
maxCharge 6
damage 5
splashDamage 5
chargeDamageMult 5
maxDamage 50
radius 30
explosionRadius 350
chargeRadiusMult 0
chargeExpRadiusMult 200
maxRadius 0
maxExpRadius 0
missileSpeed 2000
homing 0
homingRange 0
homingAcceleration 0
range 0
loopingAnim 0
noAttackAnim 0
alternatingXOffset 0
randYOffset 0
randXOffset 0
coneOfFireX 0
coneOfFireY 0
piercing 0
reflective 0
priority 0
blinding 0
extraKnockback 0
railTrail 0
movementPenalty 0
missileGravity 20
missileAcceleration 0
multishot 0
bounces 0
bounceFriction 0
missileDuration 10000
```

**Six attack types cover all 28** (`docs/bfp_weapon_config_file.md`):

| type | what it is |
|---|---|
| `missile` | a projectile |
| `rdmissile` | splits into N sub-projectiles by charge points; names another attack as the spawn |
| `beam` | steerable, explodes on contact, **can enter a beam struggle** |
| `sbeam` | steerable only while held; **cannot struggle** |
| `hitscan` | instant — shockwave, lightning, rail |
| `forcefield` | field/explosion centred on the caster |

The 28 attacks by name and number: `large_ki_blast` 10 · `impact_beam` 11 · `super_homing` 12 ·
`deathball` 13 · `eyebeam` 14 · `finger_beam` 15 · `finger_blast` 16 · `ultimate_blast` 17 ·
`homing_special` 18 (+`homing_special_spawn` 9) · `power_wave_blast` 19 · `tornado_blast` 20 ·
`ki_blast` 21 · `razor_disk` 22 · `homing_razor_disk` 23 · `ki_storm` 24 · `homingball` 25 ·
`corkscrew_blast` 26 · `blinding_flash` 27 · `mantis_blast` 28 · `aga` 99 · `mouthbeam` 29 ·
`multiball` 100 · `ki_storm_decel` 101 · `ki_storm_homing` 102 · `ki_storm_bounces` 103 ·
`homingball_accel` 104 · `ki_storm_gravball` 105.

### 7.1 A CHARACTER IS FIVE INTEGERS

`cfgs/bfp_attacksets.cfg` is the entire roster data model — **54 lines for six characters**:

```
attackset 1
attack 0 21
attack 1 16
attack 2 15
attack 3 23
attack 4 13
modelPrefix bfp1-
defaultModel bfp1-kyah
```

Five slots, each an index into the weapon table, plus a model prefix. Slots are bound to number
keys 1–5 and switching is instant (`docs/Guide.md:205`). Six sets ship: `kyah` · `tetsedah` ·
`ryuujin` · `pyrate` · `gothax` · `shilo`. Note **`attack 0` is `21` (`ki_blast`) for all six** — a
shared basic attack, then four signature powers.

This is the same architecture as our `data/characters.js` + `TYPES` registry, arrived at
independently, and it is a strong external validation of the "engine is the product" bet.

---

## 8. WHERE WE WERE WRONG

### 8.1 ⚠ FIRST — the brief's own premise is wrong, and this is the most important correction

> *"all of it was derived from fan documentation, wikis, videos and inference."*

**Not true of `pw-esf-research.md` §7.2–§7.5.** That document is **already source-accurate on BFP**.
It independently has `pm_flyaccelerate 2.0` / `pm_flightfriction 2.0` / `pm_airaccelerate 4.5`, the
`999 + 9.00825 × powerlevel` ki formula, the `1 + powerlevel` health formula, `PM_Drifting` by name,
the PITCH-unclamp line, the `PM_KiBoostPowerlevelSpeed` formula **including** the flight-only
`2.0 + PL×0.001` multiplier, the `Weapon_BFPBeamRun` re-anchoring code, `BEAM_PUSH_STEP = 200.0f`,
and the powerstruggle pseudocode with `powerEnt *= 2` and the tie case.

I set out to replace inference with constants and found the constants already there. **Do not
rewrite `pw-esf-research.md` §7. It is correct.** What this document adds is: `file:line` for all of
it, the reconstruction caveat (§0), and the four areas §7 did not cover — melee/teleport, Zanzoken,
knockback, and the attackset roster model.

**One thing §7.2 gets wrong:** it claims a "real discrepancy" where "the replica banks to ±20°" but
"a network dump derived from real BFP demo files records fly tilt running to ±80°". The ±20 is
confirmed (`bg_pmove.c:1181-1184`) but I found **no ±80 anywhere in this tree**. Whatever that claim
rests on, it is not this repo. Flag it as unverified rather than as a measured discrepancy.

### 8.2 `CATCH_SPD = 132` — invented, and the underlying model is wrong

**Ours:** `game.js` `intercept(f)`, refused past `CATCH_SPD 132`, reasoned from first principles.
**Theirs:** no threshold exists. `CheckMeleeAttack` teleports you to the trace endpoint at any
target velocity; the only refusals are geometric.

The deeper error is that we modelled interception as *catching a fast thing*, so speed became the
limiter. BFP models it as *closing distance you are allowed to close* — the limiter is
`g_meleeDiveRange` **700 units**, a pure reach. Supersedes **`pw-combat.md` §4** (the intercept
design, incl. the "cap the match speed at the interceptor's own air clamp × 1.15" ruling at
`pw-combat.md:376`, which has no BFP basis).

### 8.3 We built a curved beam; BFP's is a straight laser re-aimed every frame

`Weapon_BFPBeamRun` (`g_weapon.c:1043`) recomputes the beam base from the **current** muzzle and
**current** forward, every frame:
```c
distance = ent->distance + ent->speed * deltaTime;
VectorMA( muzzle, distance, forward, ent->s.pos.trBase );
```
The head travels out at `missileSpeed` but is re-projected onto the live aim ray — **swinging the
mouse sweeps the whole beam through an arc instantly, with no turn-rate cap.** BFP's visible bend is
a lagging client-side trail, not simulation.

**This is the one place we are ahead of the source.** `CLAUDE.md` §42 (THE BEAM IS A STREAM, NOT A
LASER) fixed exactly this: our packets carry the direction they were fired with, measured 122.1° of
bend after a 100° sweep. **Do not "correct" our beam toward BFP's.** Note it in
`pw-combat.md`/`pw-esf-research.md` as a deliberate divergence with the source on record.

### 8.4 There is no dash, no wall-jump, and no melee combo system

The brief asks for "dash/turbo, teleport, wall-jump, swoop" costs and speeds. **Three of the five do
not exist in BFP.** Turbo = ki boost (§5). Teleport = Zanzoken + the melee dive. Nothing else.
And melee has **no combo system, no launch, no strings** — it is one repeated hit while a key is
held, plus a stun. Any doc treating BFP as having a melee *system* is describing ESF, not BFP; BFP's
own lead coder said he intended to replace it (`pw-esf-research.md` §7.4 has that quote right).

### 8.5 Powerstruggle: our research was right, our engine is not

`pw-esf-research.md` §7.5 correctly says damage-comparison-with-a-×2. **Our engine does something
else.** `projectiles.js` `_beamClash` uses
`clashPower() = might × powerBuff × (0.35 + 0.65 × ki/maxKi)` — a *ki-reserve* contest, which is the
one model BFP explicitly does not use. Ours also slides a continuous `_clashT`; BFP steps a discrete
200 units and pushes **both** on a tie. Ours has no tie case.

---

## 9. WHAT I COULD NOT FIND

1. **The original BFP source.** It does not exist publicly. Everything here is filtered through a
   reconstruction (§0). The `.cfg` files are the only first-party artefacts.
2. **Real numbers for boost cost and block cost.** The author states in-source that the original
   formulas are unknown and his are approximations (`g_active.c:431, 457`). `g_boostCost 350` and
   `g_blockCost 2` are his fitted values, not BFP's.
3. **Why `g_meleeRange` is `32 + 45`.** The `+45` is unexplained in-source (`g_weapon.c:258`).
4. **Any per-character stats.** An attackset is five attack indices and a model prefix — nothing
   else. No per-character health, speed, ki or mass. **BFP characters differ only in their five
   powers.**
5. **Fusion, Oozaru-as-shipped, the Dragon Radar collectible hunt.** The Monster gamemode in this
   tree is the reconstruction author's own feature, not BFP's Oozaru.
6. **Camera constants.** I did not audit `cgame/cg_view.c` for third-person distance/height/FOV —
   out of the brief's scope, but `pw-camera.md` should be checked against it; `cg_flytilt`
   (`cg_cvar.h:78`) is the only camera cvar I confirmed.
7. **Frame timings for melee.** There are none — melee is a per-frame trace while held, with a
   250 ms block debounce and a 6 s attacker hit-stun cooldown. No startup/active/recovery exists.
8. **Whether `+= 12` in `PM_FlyMove` (`:1242`) is real BFP.** Undocumented and un-commented;
   I judge it a reconstruction artefact.

---

## 10. WHAT POWERWORLD SHOULD CHANGE

Ordered by payoff. Every item names the file.

**1. `game.js` — delete `CATCH_SPD` and re-model the intercept as REACH.**
Replace the speed refusal with a distance one: an intercept succeeds if the target is inside a
`diveRange` and there is line of sight, at any velocity. BFP's 700 units at Q3's ~56 u/m scale is
~12.5 m — against our 1u ≈ 0.19 m that is **~66 units**, close to our existing `teleport` range 58
(`characters.js:35`, KANO). So: **keep the range, drop the speed gate.** This makes the intercept
*reliable*, which is what makes an air fight readable — and it is the single change with the most
evidence behind it.

**2. `game.js` / `melee.js` — the boosted-melee → stun → escape triangle.**
BFP's melee is thin, but this loop is not, and we have every piece already: hit-stun 3 s
(`applyStun` exists, `entity.js`), the attacker's **6 s** self-cooldown (we have `_stunImmune 4s` on
the *victim*, which is the same idea from the other side), and a **directional double-tap escape**
that costs 5% ki with a 0.1 s commitment window — we already have double-tap detection (`TAP_DIRS`,
0.28 s) and `performEvade`. Wire `evade` to clear stun for a ki cost, gated on a short opening
delay. This is a wiring job, not a build.

**3. `entity.js` — make flight speed a function of power, not a fixed tier multiplier.**
Ours is `FLY_SPEEDS` / `def.flySpeed` per tier. BFP's `speed + PL×0.5`, multiplied again in flight
by `2.0 + PL×0.001`, means **power level buys the sky** and a max-power flier moves 8.7× a walker.
Our `powerBuff`/`levelMult`/tier ladder is the same quantity — feed it into the air-speed clamp so
ascending a tier is *felt as speed*. Bound it: 8.7× is also the direct cause of BFP's own top
complaint (fights nobody can follow).

**4. `entity.js` — unclamp pitch in `_openSky`, and let it loop.**
`bg_pmove.c:3425` skips the pitch clamp while flying, deliberately (*"got around the gimble lock so
you can go upside down"*). Our flight pose already runs `'YXZ'` and caps dives at 1.85 rad. In
PowerWorld specifically — one flag we already have, four rules already hanging off it (manual §46) —
this is a natural fifth.

**5. `entity.js` — consider `PM_Drifting` for the air release.**
The strongest single feel-detail in the file: releasing forward pushes you **sideways**, and the
factor is **27× larger below 100 u/s** (`driftFactor` 0.0003 → 0.008). Slowing down is when you
drift most. Cheap to try: a small perpendicular add in the flight branch when input is released.

**6. `projectiles.js` — fix `_beamClash` to match the model our own research already documented.**
Replace `clashPower()`'s ki-reserve term with a **charge-scaled damage comparison plus one binary
×2** on a held boost, and add the **tie case that pushes both back**. Our current model rewards
having a big tank; BFP's rewards the decision to *keep paying*, which is the better fight. Keep our
curved beam (§8.3) — the two changes are independent.

**7. `characters.js` — nothing to change, but bank the validation.**
BFP: 28 data-defined attacks in a text table, characters = five indices into it. Ours: 22 `TYPES`,
364 abilities across 52 heroes, the ORIGIN creator on top. **We already built the thing BFP proved
the shape of, at ~13× the content.** Where BFP is genuinely better is that its table is a *file* a
player can edit; our catalog is a module. That is the only structural idea here worth stealing, and
it belongs in the ATLAS-style tooling lane, not in combat.

**Do not adopt:** BFP's melee (no combos, and its own author wanted it replaced), the ultimate-tier
5 s total invulnerability, the ×10 attacker-PL damage multiplier (which combined with a 1000 HP cap
makes a charged Ultimate Blast a guaranteed one-shot — the developers admitted the top-tier attacks
broke balance), or the straight re-aimed beam.
