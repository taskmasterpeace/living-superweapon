# The Superhero Combat Engine — 20 Enhancements

Goal: not a Smash clone — a **comic-book combat engine** where any character concept drops in as data
and the world reacts like it matters. Each item lists what it builds on (we ship nothing from scratch).

## Combat depth
1. **Damage taxonomy — Force / Piercing / Energy / Elemental.** Every hit gets a `class`. Force pushes
   (scaled vs Strength), piercing ignores a slice of guard and *holes* blocks instead of craters,
   energy feeds clashes, elemental applies status (frost/burn/gas already exist). Beams EAT bullets:
   sustained beams destroy piercing projectiles in their path — a deflector walks a gunman's magazine right back to him.
   *Builds on: slam physics, DoTs, beam segment-damage.*
2. **Counter/parry layer.** Tap guard in the first 0.12s of an incoming strike = parry: attacker staggers,
   you get a free back-grab window. Turns jab-vs-guard into a real mind game. *Builds on: guard-crush stagger.*
3. **Clash everything.** Haymaker-vs-haymaker = fist clash (mash), grab-vs-grab = struggle, beam-vs-cone =
   push-through. One generic `clash(a, b, statA, statB)` resolver reused everywhere. *Builds on: beam clash.*
4. **Armor as a third bar.** Metal characters get an armor bar that soaks hits and regens out of combat;
   sparks intensify as it strips. Humans get gear durability instead. *Builds on: metal trait.*
5. **Status matrix.** Freeze (have) + burn (have) + poison/gas (have) + **shock** (stuns constructs/robots),
   **blind** (gas reduces AI vision cone + player fog), **polymorph** (the Majin Buu: turned into a small
   harmless critter for 3s — model swap, moveset locked to hop). *Builds on: frost/dot systems, fog vision.*
6. **Mind control / reflect fields.** Channeled beam that flips a bot's team for 4s (never the player);
   magic mirror buff that reflects ALL projectiles for its duration (deflect guard, automated). *Builds on: deflect.*

## Movement & the third dimension
7. **Altitude bands.** Ground (0) · Building (block-top, ~10–30) · Sky (30+). Attacks declare which bands
   they can reach; jumpers own band 2, flyers own band 3, ground powers dominate band 1. HUD shows the
   band of your target. *Builds on: flight, block-top standing, aim3.*
8. **Movement archetypes.** `move: 'fly' | 'leap' | 'walljump' | 'grapple' | 'teleport-hop'`. The Batman:
   no flight, wall-jumps off cover faces, grapple-zips to block tops, sticky grenades (smoke tell) and
   spider mines as traps. *Builds on: leap evade, cover AABBs.*
9. **Directional descent.** Hold C while flying + a move direction = 45° power-dive along facing (your
   "between 6 and 9 o'clock" dive); dive-into-ground = self-slam AoE (safe landing if you brake). *Builds on: flight, slam.*

## World & spectacle
10. **City block kit.** Procedural district assembler: `street × building-category` tiles snapped to a grid
    (residential/commercial/military base occupying N×M squares, named districts). Buildings are just tall
    cover with window textures + interior debris — the destructible system already handles the rest.
    *Builds on: cover/coverAll, shatter, fog boxes.*
11. **Pedestrians & collateral.** Cheap boid crowds (instanced, 2D nav on streets) that flee explosions.
    Hero-mode scoring: collateral damage subtracts, saves add. Suddenly beam discipline matters — melee
    near civilians, beams only with a clear lane. *Builds on: minion update loop, instancing.*
12. **Environment mileage.** Grass burns (have) + craters persist (have) → add: fires that spread between
    grass patches, dust clouds that linger as soft-cover (vision blockers in fog shader), rubble piles
    that become new low cover when buildings die. *Builds on: grass instancing, fog boxes, shatter.*
13. **Weather & time-of-day.** Rain (particle sheet + wet emissive ground), night fights (fog tighter,
    lightning characters glow harder). One uniform block, big mood payoff. *Builds on: sky shader, fog.*

## Characters as data
14. **Character Foundry.** A JSON schema + validator so a whole hero is ONE file: stats, colors, threat,
    guardType, meleeTiers, movement archetype, 7 ability slots from the 20-type registry, evade, voice pack.
    In-game "custom hero" folder auto-loads. This is the "I design, you drop in" harness. *Builds on: data/characters.js already being pure data.*
15. **Skills & stat screen.** Per-hero persistent profile (localStorage): matches, KOs, damage, favorite
    tier reached, unlocked skill nodes (+5% guard, +1 drone, new evade kind). A stat sheet screen off the
    roster. *Builds on: progression/XP.*
16. **Training room = Scribblenauts mode.** Summon anything from the registry by name: dummies with set
    guardTypes, walls, portals, frozen targets, DPS meters floating over dummies. Every system becomes
    testable and BALANCEABLE by numbers on screen. *Builds on: training mode, spawn helpers.*

## Presentation & fairness
17. **Readability pass II.** Kick vs punch icons at the strike point (foot/fist pictograms), block-spark
    color = damage class, target band indicator, and a match roster strip (portraits + threat + tier +
    power level) on TAB-hold. *Builds on: impact stars, hud.*
18. **Camera drama.** KO cam (orbit the ragdoll for 1.2s), clash zoom (already punches — add slight dolly),
    ult cinematic letterbox for Extreme-threat Rs. *Builds on: world.follow/punch/slowmo.*

## Scale
19. **Netcode (LAN first).** The humans[] abstraction is transport-ready: serialize intents per tick,
    lockstep 2P LAN skirmish, then rollback later. *Builds on: intent symmetry (already a hard rule).*
20. **THRESHOLD meta-shell.** The planetary interface: log in → globe of the Consequences-of-Failure world →
    pick a treaty bloc → skirmishes/patrols on district maps → threat-level career from Low to Extreme
    (tier system becomes canonical progression). Single-player patrol: fly the city, incidents spawn as
    encounter arenas. *Builds on: modes framework, tiers, city kit (#10).*

### Suggested order
Foundry (14) → damage taxonomy (1) → training room (16) → city kit (10) → readability II (17) →
altitude bands (7) → pedestrians (11) → parry (2) → stat screen (15) → LAN (19). Everything else rides on those.
