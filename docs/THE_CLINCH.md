# THE CLINCH — melee, martial arts and grappling (design spec, 2026-07-26)

Companion to the review artifact. Everything here is built on shipped systems; four new pieces.

## What Robert's own data already says

⚠ **THE MARTIAL ARTS COLUMN IS EMPTY.** `Combat Compendium REAL — Skills, Talents, Martial Art.csv`
has the column and three entries, none of which is a martial art. The slot was made and never
filled — which is why this is design work and not transcription.

⚠ **THE DODGE CHART IS THE RANK LADDER AGAIN** (1-9 Little Human … Low Cosmic, same bands, same
Threat Level designations — already implemented in `data/scale.js`). But it carries a SECOND axis
nothing else uses: **Agility + Instinct → Column Shift**, on its own 1-19 / 20-39 / 40-59 scale.
That is the spacing game's spine, and it is already authored.

⚠ **THE 63-ROW CRIT TABLE IS A WOUND TABLE.** It names Internal Bleeding, Dead Arm, Broken Ribs,
Kneecap, Minor/Major Concussion, Knock Down, Armor Crush — keyed by damage type (SMASHING MELEE,
EDGED MELEE, IMPACT, ENERGY). Those are the same zones as `addWound` and the same hidden conditions
as `data/medical.js`. The crit table is the missing LINK between a landed hit and a condition
somebody has to diagnose.

⚠ **ONE DATA DEFECT, FLAGGED NOT FIXED**: the MELEE KNOCK BACK chart is non-monotonic — 70-79 gives
10 spaces, 80-99 gives 9. Everything else climbs. `knockbackOf` uses a corrected curve; his literal
numbers are one edit away if he wants them.

## The reference games, and what each is actually for

- **GTA 2** — melee is a proximity verb. One button, no spacing. The thing NOT to do.
- **Hotline Miami** — one frame, one hit, no combos. Depth is entirely in APPROACH. The lesson: a
  top-down melee read comes from positioning and telegraph, never from move lists.
- **Jagged Alliance** — every action shows its cost and its odds BEFORE you commit. That is why a
  miss feels fair, and it is the model for the reach rings.

## 1 · The spacing game

⚠ **THE JAB OUT-RANGES THE POWER PUNCH.** Weakest and longest, because it is thrown from the
shoulder with the body behind it. That inversion IS the spacing game: the safe poke reaches further
than the thing that hurts. Robert's instinct, and it is correct.

    STRIKE   INPUT        REACH  STARTUP  DAMAGE  PUNISH IF BLOCKED
    JAB      tap           13u    0.09s   x0.55   -0.20s, you keep your turn
    CROSS    tap x2        11u    0.17s   x1.0    -0.45s, they get a jab
    POWER    hold 0.55s     9u    0.42s   x2.4    -0.85s, they get a grab

REACH RINGS: three concentric arcs on the existing ground marker, in the strike colours, each
brightening as it becomes available. Build it for development, then ship a reduced version — it is
the Jagged Alliance honesty and players will want it.

## 2 · Eleven arts as GRAMMARS (the twelfth slot stays open)

An art is not a damage bonus — it is WHICH SEQUENCES EXIST, and where a grab is allowed to appear.
That makes picking one a change in how you play, not a change in what you read on a sheet.

    BOXING        jab-jab-cross, no grab at all
    MUAY THAI     cross -> CLINCH (grab immediately off the punch)
    WRESTLING     jab only; SHOOT, a long low grab from cross range
    JUDO          block -> counter-grab on a parry
    MILITARY CQC  jab-cross-RUSH-grab (the third beat closes the gap for you)
    CAPOEIRA      evade -> strike, only from a dodge
    AIKIDO        parry converts directly to a throw
    KRAV MAGA     any strike cancels into a disarm
    SAMBO         grab -> joint branch
    SUMO          front grab unblockable, no ground game
    KUNG FU       longest chain: jab x3 -> cross -> power
    STREET        no rules, worst punish frames (the default everyone starts on)

⚠ **NEVER PER-ART DAMAGE NUMBERS.** The moment an art is STRONGER rather than DIFFERENT, everyone
picks the same one and the system is decoration.

## 3 · The grapple wheel — four options considered

Trigger: a grab that lands on a VULNERABLE target — mid-recovery, staggered, or from behind — opens
a window instead of just dealing damage.

- **A · The wheel** (Robert's instinct) — time dilates to ~0.25x, four to six options fan out, a
  ring drains. Legible and teachable; but it is a menu in a game about momentum.
- **B · The chord** — direction + button decides, no UI at all. Hotline Miami speed; undiscoverable.
- **C · The ladder** — clinch → takedown → mount → submission, each rung a fresh contest. Real
  wrestling shape; long, and it removes both fighters from a six-way fight while it runs.
- **D · THE RING WHEEL — RECOMMENDED.** The ladder's structure drawn ON THE GROUND MARKER that is
  already under the fighter. Segments light around the state ring; the drain is the ring emptying.

⚠ **WHY THE RING SPECIFICALLY.** The marker already carries the band colour, the facing wedge, the
state ring (blue guarding / green grabbing / orange winding up) and now the heading triangle. It is
the one piece of UI that is diegetic, read every second, and already understood as "what this person
is doing right now". A screen-space radial would be the only element in the entire game that does
not live in the world.

    SLAM   ground impact, crater, they get up      -> onSlam      (shipped)
    THROW  aimed hurl on the existing arc          -> _throw      (shipped)
    CHOKE  non-lethal, ends in CAPTURE not a KO    -> jail()      (shipped)
    JOINT  ends the fight, writes a limb wound     -> addWound    (shipped)

⚠ **CHOKE IS THE ONE THAT MATTERS.** Holding cells priced by threat rank exist, and the medical
chart exists — but nothing in the game currently takes a prisoner. This is the verb that fills those
cells, and it makes "win without killing" a mechanical choice with a real cost: slower, breakable,
and the only way anyone ever ends up in the vault.

## 4 · Cost

Shipped already: three strike tiers and the charge input · grab, clinch, struggle window and aimed
throw · block, parry, guard crush · slam physics, wounds, bleed, stun · capture cells.

New: reach rings (small) · `def.art` grammar table (data + a combo-window check in melee) · a
vulnerability flag on grab (one condition; the states already exist) · the ring wheel (medium) ·
crit table → wound mapping (data entry).

## What to cut

1. **Ground fighting as a position** — a downed grapple removes two fighters from a battle that has
   six people and a police response in it. The wheel resolves standing.
2. **Directional blocking** — the isometric camera cannot sell it, and the guard arc already answers
   "am I covered".
3. **Per-art damage numbers** — see above.
