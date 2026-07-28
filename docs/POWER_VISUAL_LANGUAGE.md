# THE POWER VISUAL LANGUAGE — the rendering spec

> Robert's ruling (2026-07-28). **The biggest mistake in a superhero game is making powers look like
> colored particles.** Every power must communicate its PHYSICAL PRINCIPLE — a player should be able
> to pause on one frame and know what kind of energy it is. This file is the *what each element looks
> like* spec. It pairs with `src/data/visual.js` (the 7-trait profile — *which* power gets *which*
> treatment, and the rule that no two share >3 traits). Profile = the contract; this = the pixels.

## The Golden Rule — every power answers six questions

| # | Question | Example |
|---|----------|---------|
| 1 | **What is the source?** | fire, electricity, gravity, sound, radiation |
| 2 | **What physical law does it resemble?** | heat transfer, charge flow, pressure, momentum |
| 3 | **What happens to the environment?** | burns, freezes, bends, cracks, melts, floods |
| 4 | **What secondary effects occur?** | smoke, sparks, dust, frost, debris, steam |
| 5 | **How does it affect lighting?** | flashes, shadows, reflections, bloom |
| 6 | **What remains afterward?** | scorch, ice, rubble, puddles, molten metal, smoke |

If every power obeys this, the player doesn't see colorful effects — they feel each ability governed
by its own believable laws. That consistency is what makes the combat memorable.

## The elements — principle → look → residue

- **🔥 FIRE** (energy release): white-hot core, orange/yellow flame, black smoke, embers, heat
  distortion, molten surfaces, dynamic light. Leaves: burn marks, char, melting metal, lingering smoke.
- **⚡ ELECTRICITY** (charge seeking ground): branching arcs, random forks, white center, blue/violet
  glow, sparks, exposure flash, ionized air. Behaves: chains between enemies, conducts through water,
  jumps to metal, shorts electronics.
- **❄ ICE** (heat *removal*, not addition): frost spreading outward, crystals growing, white vapor,
  condensation, frozen breath, surfaces cracking. Leaves: frost, snow, frozen puddles, brittle matter.
- **🌪 WIND** (pressure differences — *you never see air, you see what it moves*): dust, leaves,
  debris, cloth/hair movement, water ripples, smoke bending. **Never** a blue tornado sprite.
- **🌍 EARTH** (stored mass): rocks breaking, ground deformation, cracks, dust clouds, bouncing
  pebbles, weight. Movement: slow, powerful, momentum-driven.
- **💧 WATER** (fluid, wants the lowest point): sheets, splashes, mist, foam, ripples, reflections.
  Flows around obstacles.
- **☀ LIGHT** (pure photons): bloom, lens flare, god rays, reflection, refraction. No smoke, no
  particles unless interacting.
- **🌑 DARKNESS** (light *absorption*, not black smoke): missing light, crushed shadows, swallowed
  reflections, reduced contrast, warped silhouettes. Nearby colors disappear.
- **☢ RADIATION** (should feel terrifying): invisible waves, air shimmer, geiger clicks, glowing
  materials, skin damage, sickly green afterglow. Very few particles.
- **🧲 MAGNETISM**: metal vibrating, nails lifting, cars bending, bullets curving, sparks, metallic
  dust. Not energy beams.
- **🟣 GRAVITY** (distorts space): light bending, objects stretching, compression, debris orbiting,
  time-dilation. Think a black hole affecting the scene.
- **🌀 TELEKINESIS** (invisible hands, nothing magical): compression, flexing, dust falling off, small
  rocks lift first, large objects strain.
- **🧠 PSYCHIC** (happens in minds): minimal particles, eye glow, air ripples, screen distortion,
  chromatic aberration, floating debris.
- **🔊 SOUND** (pressure): expanding rings, windows shattering, water ripples, dust bursts, cloth
  vibrating. Never glowing waves.
- **🧪 ACID** (looks alive): bubbling, steam, dissolving, dripping, smoke, surface pitting.
- **☣ POISON** (slow): greenish vapor, floating spores, pollen, sickly haze. Minimal explosions.
- **💥 FORCE** (pure momentum, invisible until it hits): shockwaves, dust rings, flying debris,
  cracked walls, objects accelerating.
- **🧬 NANOTECH** (looks intelligent): swarming machines, formation changes, hexagonal construction,
  mechanical transformation, self-assembly.
- **✨ COSMIC** (beyond physics): gravitational lensing, nebula colors, stars, space distortion,
  impossible geometry.
- **🌌 TIME** (subtle): motion trails, frozen particles, localized blur, frame-interpolation, clock
  distortions.
- **🔥 PLASMA** (matter *becoming* energy — where the beam-laser fits): white-hot core, orange plasma,
  volumetric glow, heat shimmer, sparks, molten metal, fire, smoke, explosive impacts, intense dynamic
  light. Less a glowing beam, more a continuous stream of extreme energy interacting with the world.

## How this binds to the engine

`data/visual.js` already tags every ability's `material`/family and its 7-trait profile. This spec is
the RENDER TARGET for each of those families: when the VFX pass is built, `fire`-family powers must
produce core+flame+smoke+char (not orange particles), `electricity` must branch and chain, `force`
must be invisible-until-impact, etc. The profile guarantees no two powers *read* the same; this
guarantees each one reads as its own physics.
