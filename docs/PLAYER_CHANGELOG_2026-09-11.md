# PowerWorld Player Changelog — September 11, 2026

This release turns the desert prototype into a more complete superhero combat loop. Movement, melee, defense, world response, missions, weather powers, and combat reporting now work together as one playable system.

## Movement and power-up

- Added three physical speed gears. Each tier has its own acceleration, top speed, braking distance, energy pressure, camera response, and HUD state.
- Shift now controls movement gears. Tap or hold to sprint; double-tap and hold the second press to power up through the available tiers.
- The highest available speed tier gets a clear MAX presentation so players can tell when they have reached it.
- Added independent Alt camera composition. Hold Alt to slide toward a rear three-quarter view; the camera turns inward enough to keep the player and locked target together while travel and attack aim retain their original heading.
- Kept flight tier differences: grounded fighters, clumsy fliers, levitators, and full fliers still move differently.
- Separated universal power-up from combat power slots. Powering up no longer consumes an ability slot.

## Melee, defense, and carrying people

- Tab now enters melee mode. Left mouse performs the punch chain or charges a heavy attack; right mouse starts a grab or throw.
- The basic combo creates a readable exchange: quick opening blows lead into a final hit that knocks the opponent away and gives both fighters room to recover.
- Fixed blocked jabs so they actually leave the attacker punishable instead of flowing through the rest of the combo.
- Guard now spends energy before admitted frontal damage reaches health. A successful block is a real defensive choice, while sustained pressure can still drain energy and break the guard.
- Heavy melee still crushes guard and opens the defender. Grabs retain their place in the Strike–Grab–Guard combat triangle.
- Added person carry. A strong enough character can lift someone, fly while carrying them, whirl to build force, aim in three dimensions, and throw them into the ground, cover, or terrain for impact damage.

## Powers and impact feedback

- Beam contact now leaves visible ground residue along the traveling beam tip, including scorch marks and dust that conform to the terrain and fade cleanly.
- Hand-fired beams wait for the weighted hand to open before emission, improving the link between pose and power release.
- TEMPEST now creates a bounded storm layer over the current map weather. When her power ends, the original rain, haze, or clear conditions remain intact.

## Desert world response

- The desert map and outpost remain the main battlefield and now support a complete escalation loop.
- Civilian police patrols respond first. Continued destruction raises heat and brings backup, tactical units, federal response, and finally military infantry.
- Military responders use the fictional KUCHLER MK I service package with finite ammunition and PowerWorld helmet and carrier equipment.
- Response forces are bounded so escalation cannot grow without limit. Escaping and staying out of trouble lowers the response and eventually stands units down.

## Playable operations

- Added **Outbreak**, a three-wave zombie operation with grounded enemies, recovery time between waves, a clear win state, and an honest overrun report when the player falls.
- Added **Clone Recovery**, where four hostile clones guard a sealed sample. Players may defeat them or bypass them, then hold the recovery zone without interruption and extract the case.
- Recovery now resets when the operator takes damage, becomes incapacitated, leaves the zone, or goes airborne. Dropping or swapping the carrier returns the case safely.
- Operation reports now show the actual outcome and support a clean retry. Combat HUD, mood, and objective overlays no longer cover report screens.

## HUD, Newsroom, and presentation

- PowerWorld now opens directly on the full-screen character-selection ceremony, with the live fighter in the center and rendered roster portraits across the bottom. Escape opens the encounter and weather setup.
- Corrected the shared character-selection stance so arms hang naturally from lowered shoulders instead of folding inward. Removed the redundant Filters & Registry button from the footer.
- Removed the separate movement-gears card and standalone Armory/Loadout button. Flight gear and speed now appear inside the existing left-side player panel.
- Flight speed now drives the length of the fighter's world-space wake, making faster travel readable on the character instead of through another dashboard.
- Reworked VEGA as a bald Black man with a gold V fitted over both the front and back of his uniform.
- Restored the Newsroom and operation reports to the shared Impact palette and typography so they read as part of the same game.
- Added operation-specific headlines and details instead of generic success or failure copy.
- SOL now uses the weighted hero body by default and has a subtle fabric response on the suit and cape while preserving the established colors and wardrobe.
- The developer performance report now exposes the maximum cost of each measured section, making future visual passes easier to judge.

## Controls changed

- **Shift:** movement gears and sprint/power-up gesture.
- **Alt (hold):** independent free-look.
- **Tab:** melee mode.
- **F3:** roster.
- **J:** lift or set down a person when the carry conditions are met.
- **Melee mode left mouse:** punch chain; hold for heavy.
- **Melee mode right mouse:** grab and aimed throw.

## Removed or replaced

- Removed direct Shift activation of the old dash/cruise ability binding. Legacy movement powers remain available through explicit power selection where a character still owns one.
- Removed generic level-up/power-up abilities from 27 active kits; unique character buffs, healing, and transformations remain.
- Replaced Tab's roster shortcut with melee mode and moved the roster to F3.
- Removed human mood and psyche behavior from zombies.
- Removed the requirement to kill every clone before recovering the case.
- Removed combat overlays from Newsroom and operation-result screens.
- Removed the duplicate movement card and folded its useful flight readout into the existing player status presentation.
- Removed PowerWorld's floating Armory/Loadout shortcut from gameplay.
- Replaced the separate Newsroom palette with the game's shared warm-neutral, amber, and gold Impact system.

## Known presentation work

- The desert direction is established, but terrain scale, battlefield density, and distant activity still need another visual pass.
- SOL's fabric response is in place, while the cape silhouette and foreground character construction remain the largest visual gaps against the approved target.
- Police-to-military ground escalation is playable. Helicopter and jet dispatch are planned extensions and are not part of this release.
- Clone Recovery completes the field operation; persistent genome research and unlock progression remain future work.
