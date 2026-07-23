# Balance Audit — automated AI-vs-AI baseline (2026-07-22)

**Method:** every hero's bot fights a reference bot (SOL, level 1 AI) in a fresh duel arena for an
8-second sample, headless. Score = damage dealt − damage taken. Short samples are NOISY (a 0/0 row
means both bots spent the window closing or juking, not that the hero is weak) — this is an outlier
detector, not a tier list. Re-run any time in the console:
`LSW.game` + the snippet in the repo history, or use the Danger Room DPS meters for hand testing.

## Findings & rulings

**Overtuned cluster — martial rushers** (net > +150): ONYX +197, RIPCLAW +185, VOLT +181, TALON +168,
WEBLINE +154. Root cause: the new FIGHTING/jab scaling stacked multiplicatively on already-fast rush
kits. **Tuned:** jab-family damage −10–15% on those five (claw/escrima/flurry numbers), VOLT flurry
cd 1.0→1.1.

**Undertuned cluster — standing chargers** (net < −90): TITAN −118, VEGA −98. They charge beams into
rushdown and eat it. **Tuned:** TITAN speed 26→29 + Pulse Rifle 6→7 dmg; VEGA Bakuhatsu 6→7 dmg
(his poke needed teeth). PYRE fireball speed 62→72 (his opener kept whiffing).

**Working as designed (NOT tuned):** GALE −66 and SANDRA −54 are Threat-Low/High gear humans against
a Very-High superweapon — the creator ruling is *lopsided is honest*. The LeFevre scale is supposed
to show here. KRAKEN −51 is a grappler vs a bruiser at the wrong range; grapplers feast in crowds.

**Inconclusive (0/0 rows):** RIME, TORCH, SPECTER, RIFT, TEMPEST, AEGIS, DUNE — both bots defensive
for the whole sample. Longer-window follow-up when the Danger Room gets scripted scenarios.

## Full table (net damage vs SOL, 8s)

| + | net | | − | net |
|---|---|---|---|---|
| ONYX | +197 | | TITAN | −118 (buffed) |
| RIPCLAW | +185 | | VEGA | −98 (buffed) |
| VOLT | +181 | | PYRE | −80 (buffed) |
| TALON | +168 | | GALE | −66 (honest) |
| WEBLINE | +154 | | SANDRA | −54 (honest) |
| VANGUARD | +131 | | KRAKEN | −51 (range) |
| APEX | +94 | | MAJESTY | −49 |
| ABEO | +93 | | IRONCLAD | −48 |
| JELANI | +92 | | FOUNDRY | −44 |
| STORMCALL | +85 | | RAGE | −34* |
| HIVE / CIRCUIT | +82 | | STEFANOS | −34 |

\* RAGE reads low because an 8s window barely fits one haymaker exchange; he wins long fights.
All five overtuned entries were trimmed; middle of the table left alone. Next audit after the
city map changes engagement ranges.

---

## Audit 2 — THE BLOCK LAW (2026-07-23)

**Report from live play:** "the spiderman character can beat anyone because he spams attack —
even when I block it doesn't cause him to bounce back or stop."

**Root cause (verified, not guessed).** The punish rules for a blocked strike lived only inside
`melee.js` — the V-strike trifecta. Every OTHER melee source went through `entity.takeDamage`'s
guard branch, which reduced damage but did *nothing* to the attacker:

| source | before | after |
|---|---|---|
| jab / straight (V) | punishable (already) | punishable + bounce |
| `melee` ability (Sting Kick, Sky Smash…) | **free — no cost at all** | bounce + 0.45s stagger |
| `rush` (Spider Flurry, Maximum Spider) | **free, full combo continued** | combo ENDS, bounce + 0.55s stagger |
| grabs / throws | unblockable by design | unchanged (grab beats guard) |

So a rusher could hold the attack button into a raised guard forever. Blocking was a damage
discount, not a defensive option.

**The law (one choke point).** `game.onBlockedStrike(att, blk)` fires from the guard branch of
`takeDamage` for every `strike`-flagged blocked hit — so it covers every present and FUTURE melee
source automatically. The attacker is pushed back (38u), staggered 0.45s, hitstop'd, strikeCd 0.55,
and their charge/combo window is cleared. `_bounceCd` (0.3s) prevents bounce-locking.

**PARRY.** `melee.guard` stamps `_guardUpT` on the rising edge; a block landed inside 0.22s is a
parry — 54u push, 0.8s stagger, meter *refund*, gold star + slowmo. Reactive blocking beats
pre-holding.

**Supporting fixes.** `ready()` now requires `staggerT <= 0` (staggered fighters cast NOTHING — they
could previously fire abilities mid-stagger); all three `busy` gates include stagger; `rush` hits now
pass `src`/`strike` (they were anonymous — no kill credit, no Overdrive, unblockable by accident).

**AI taught the trifecta.** Bots used to feed strikes into a shield forever. Now a foe guarding
>0.35s is read as turtling: `controlBot` prefers GRAB (grab beats guard) or a guard-crushing
HAYMAKER, reaching 13.5u for it (the bounce pushes them out of normal 11u mixup range), and
`ai.pick` stops choosing rush/melee into a raised guard, repositioning or throwing instead.

### Measured (headless, WEBLINE bot vs a defender, 40s)

| defender behaviour | before | after |
|---|---|---|
| no block | dead in 5.4s | dead in 21.9s (0–3) |
| hold block only | dead | **survives 40s**, 76/130 hp, 15 rejections, 0–0 |
| block + punish the stagger | dead | **wins**, 127/130 hp remaining |

### WEBLINE trim (data-true, not a nerf-by-feel)

Spider Flurry was 76 damage for 14 ki every 1.8s — the spam engine. Now 6 hits / 25 finisher,
16 ki, 2.4s (≈−30% sustained). His LeFevre rating moved **Moderate → High**: he was beating
Very-High subjects, so the registry was lying about him.

AI-vs-AI after (60s duels, both at level 1.15): was 4W–1L, now **2W–3L**
(beats SOL, SARGE; loses to VEGA, RIPCLAW, TITAN). Control matchups unchanged
(SOL>VEGA 3–2, RIPCLAW>SARGE 2–1, TITAN>KANO 3–0). Rumble soak clean: 4 KOs/30s, 2.5ms sim frame.

**Ruling:** blocking is now a real option at every range, spam is self-punishing, and the counter to
a turtle is the grab — the trifecta finally reads the same in live play as it does on paper.
