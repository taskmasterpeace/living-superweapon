# Audio integration checkpoint

## Grenade preparation recording

The accepted `beginThrowAction` preparation cue now uses the approved ai-pass `final/evt-grenade-pin.mp3` recording from local `codex/audio-all`, with source provenance in the imported arsenal manifest. Existing action admission, cooldown, spatial playback and custom-source precedence are retained; no extra gameplay event was added. Nineteen recording/throwable tests and the production build pass. Listening/mix review is still required.

## Successful grab capture recording

The existing successful-enemy-capture event now uses the approved ai-pass `grab.mp3` from local `codex/audio-all` as its bundled default. Failed attempts retain their existing silence; no extra event was added. Custom recordings and explicit placeholder choices still win. Twelve recording/import tests and build pass; live listening remains pending. Add-missing import now preserves ten bundled cues and adds 27 of the 37 package entries.

Source package: local branch codex/audio-all at 40ad34d. Its wiring, integration and gap documents are copied here as source requirements; their claims about complete asset availability refer to that source branch, not this integration checkpoint.

Implemented: approved CC0 AK, M16, SMG, SAW, pistol, bolt rifle, battle rifle and shotgun reports. The existing firearm ability passes its voice key to AudioBus.gunshot; the recording leads when decoded, otherwise existing procedural audio handles the shot. Mapped reports are preloaded. The suppressed PDW, magnum and anti-materiel rifle remain on their existing voices pending suitable recordings. The approved CC0 final folder and its provenance manifest are present; non-firearm files in that folder are not yet wired by this change.

Verification: four tests exercise recording selection, no duplicate synth shot, cold-cache fallback, mute gating, bank/preload membership and file existence. Production build passes. Listening in live gameplay is still required for mix approval.

Outstanding: ai-pass import and mapping, other CC0 event mappings, SoundLibrary vehicle/weather/scout/reload path, loop lifetime and positioning review, ambient choices and the source gap analysis. ElevenLabs license clearance was supplied by the user; do not reopen that gate. Animation priorities remain pickups, grabs, punches, kicks and lunges; two-person rescue remains excluded.

## Bundled SoundLibrary defaults

SoundLibrary now resolves approved bundled samples through the shared decoded sample bank. Current defaults: CC0 light/heavy body impact and scout gunshot; licensed ai-pass rain, storm-domain rain/thunder, and grenade release. User bindings and explicit placeholder selection take precedence. Existing SoundLibrary cooldowns, event gating, positional playback and loop watchdog remain the owners. Native replacement waits for decoded data without queuing a stale impact.

Sixteen audio tests pass, including local file presence, chosen/placeholder precedence, synchronous fallback and actual buffer loop cleanup. Build passes. Remaining: listening/mix review, bundled-source presentation and audition in Sound Library UI, additional ai-pass mappings and vehicle/aircraft/reload recordings. No claim that the whole audio package is integrated.

## Workshop audition

Bundled recordings now appear in workshop source labels, counts and recording filters. Play recording is enabled for them and waits for local decode; audition does not change saved custom bindings or explicit placeholder preference. Switching selection while decoding cancels that audition. Browser verified the light punch's Play recording action reaches Playing Bundled recording. Seventeen audio tests and build pass. This checks playback wiring, not subjective mix quality.

## Additional firearm and footstep recordings

Licensed ai-pass magnum and M107 reports now resolve from the existing magnum/amr50 voice keys. Imported the source arsenal manifest for provenance. Concrete and grass ground footstep events now use the approved four-variant CC0 sets; cadence and spatial settings remain unchanged. Eleven focused audio tests pass and build passes. Suppressed PDW remains on its existing suppressed voice; auto shotgun retains the approved pump recording as permitted by the wiring specification. Listening and the remaining weapon/vehicle/power mappings are still open.

## Additive AI package precedence

The existing 37-cue embedded AI package remains available in the workshop. Add missing now preserves six bundled defaults (including the preferred CC0 light/heavy impacts), adding 31 other entries to an empty custom library. Repeat imports are no-ops; existing bindings/settings and atomic decode behavior remain intact. Eighteen pack/SoundLibrary tests and build pass. Importing preview-only entries does not wire them to gameplay.

## Nanite gameplay transitions

Approved ai-pass nanite form, break and reform MP3s now ship as bundled defaults. Fighter updates observe active module/cell transitions and emit spatial cues once; simultaneous cells coalesce, retired/locked/hidden modules stay silent. User bindings retain precedence. This connects existing forearm module gameplay, not the still-pending Dec-52 animal actor integration. Twenty-four audio import, mapping and nanite state/transition tests pass; production build passes. Live mix review remains outstanding.


## Vehicle destruction

The live vehicle-explosion SoundLibrary cue now resolves to the existing bundled boom recordings. FrontlineConvoy.destroy and aircraft-combat already emit that cue; neither caller needs a duplicate sound. User bindings and explicit placeholder preferences retain precedence. Eleven SoundLibrary/import tests pass and build passes. Live listening/mix review remains outstanding.

