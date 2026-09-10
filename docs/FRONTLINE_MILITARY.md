# Front Line military slice

Open `powerworld.html`, choose **Clone recovery · 1P**, and deploy. The superhero remains the player. The four rifle clones, sample-case recovery and ground extraction are the small encounter; there is no vehicle possession or full-scale war simulation yet.

## Parked scouts

The nearest undestroyed scout within 260 units can engage. Its actual turret turns before firing and it must maintain acquired aim. It fires three small, finite-speed rounds, then pauses. Other scouts remain cover instead of multiplying the same fire pressure.

- Break line of sight with terrain or cover.
- Rise above its limited barrel elevation, or close inside its minimum engagement range.
- Use normal guard; a deflect-capable hero can return the rounds.
- Use powers to destroy it through the existing cover damage/explosion system.

Sparring leaves all scout weapons disabled. These vehicles are parked: no steering, driving, occupancy or track/suspension simulation is implied. Helicopter/jet remain moving presentation actors, not armed or player-pilotable aircraft.

## Equipment and audio authoring

The clone-only helmet and carrier use separate named head and torso attachments. They ride the existing animation/ragdoll drivers, have independent per-fighter GPU ownership, and are loaded before graphics preparation completes. They do not replace the player or canonical SARGE. Original source and fit limitations are documented under `assets-src/frontline-clone-kit`.

The sound harness has **Scout mounted rifle** (`scout-gunshot`, vehicles / discharge). Its brief describes one muzzle report, not a prerecorded burst. It plays a synthesized placeholder until a chosen recording is bound. **Armored vehicle explosion** remains a separate impact cue. Existing spatial distance/pan, concurrency and cooldown handling applies; no remote audio service is required.

## Arma / CWR boundary

The CWR source release was studied for separation of driver, gunner, turret, weapon and aircraft-control responsibilities. No CWR source was copied into the runtime. Its Arma-only game assets are not imported into Three.js. See the original project's README and separate asset license:

- https://github.com/BohemiaInteractive/CWR
- https://www.bohemia.net/en/licenses/arma-public-license-share-alike

This is a measured incremental implementation, not a claim of Arma parity or a finished Dream Loop target.
