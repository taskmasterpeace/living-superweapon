# Audio integration checkpoint

Source package: local branch codex/audio-all at 40ad34d. Its wiring, integration and gap documents are copied here as source requirements; their claims about complete asset availability refer to that source branch, not this integration checkpoint.

Implemented: approved CC0 AK, M16, SMG, SAW, pistol, bolt rifle, battle rifle and shotgun reports. The existing firearm ability passes its voice key to AudioBus.gunshot; the recording leads when decoded, otherwise existing procedural audio handles the shot. Mapped reports are preloaded. The suppressed PDW, magnum and anti-materiel rifle remain on their existing voices pending suitable recordings. The approved CC0 final folder and its provenance manifest are present; non-firearm files in that folder are not yet wired by this change.

Verification: four tests exercise recording selection, no duplicate synth shot, cold-cache fallback, mute gating, bank/preload membership and file existence. Production build passes. Listening in live gameplay is still required for mix approval.

Outstanding: ai-pass import and mapping, other CC0 event mappings, SoundLibrary vehicle/weather/scout/reload path, loop lifetime and positioning review, ambient choices and the source gap analysis. ElevenLabs license clearance was supplied by the user; do not reopen that gate. Animation priorities remain pickups, grabs, punches, kicks and lunges; two-person rescue remains excluded.
