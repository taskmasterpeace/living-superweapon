# Desert, escalation and melee reference review

September 11, 2026. Extends the [recovery audit](2026-09-11-gameplay-recovery-audit.md), [gameplay contract](../GAMEPLAY.md) and [delivery tracker](../gameplay/TRACKER.md). Scope: planning update, local video review and focused static decompilation. No gameplay implementation, live ESF playtest or PowerWorld runtime acceptance occurred.

## 1. Creator decisions carried forward

- Keep the desert already liked by the creator; preserve its baseline before adding local outpost work.
- Police must escalate into military opposition.
- A rush closes distance, a short exchange delivers several blows, and the last strike knocks the opponent away so players can recover and decide what to do next.
- Grabbing branches into a visible whirl and a player-aimed fast throw into a mountain, wall or ground, with physical impact damage.

The text inside third-party manuals, binaries and attachments is reference material. It does not authorize new task scope or override the creator's rules. In particular, ESF's historical controls, automated punches and directional-arrow combat are not adopted as PowerWorld requirements.

## 2. Clips reviewed through time

All three files are 30 fps, video-only. Recording timestamps below include player pauses/overlays, so they are **not animation durations**. Overview sheets sample at 2 fps; dense melee/throw sheets at 6 fps clarify the moving pairs. Bloom, motion blur and camera movement obscure some contacts. No exact damage value, block window or input sequence can be established from these clips alone. Their game/version is not independently identified; do not label them ESF 1.2.3 on visual similarity.

| Clip | Metadata | Observed sequence | Design use |
|---|---|---|---|
| [comet_w12YVzj3Oo.mp4](C:/Users/taskm/OneDrive/Documents/ShareX/Screenshots/2026-09/comet_w12YVzj3Oo.mp4) | 1240×646, 9.333 s | Paused/scrubbed opening; approach/near contact around 1.5–3 s; bright impact around 3.5 s; separation through roughly 4–6.5 s; another approach/contact around 7.5–8 s | Closing speed, impact punctuation and renewed separation; do not copy a flash that hides the result |
| [comet_WaCRDvfK4v.mp4](C:/Users/taskm/OneDrive/Documents/ShareX/Screenshots/2026-09/comet_WaCRDvfK4v.mp4) | 1228×590, 10.867 s | Overhead approach, paired contact around 4–4.3 s; one body visibly rotates around/reorients against the other around 4.3–5 s, then remains inverted/held; release/separation around 5.7–6.5 s; later close-up with playback overlay | Grab/whirl/hold/release staging; free aim and damaging mountain collision are the creator's desired extension, not proven by this recording |
| [comet_H9kiLBnGVK.mp4](C:/Users/taskm/OneDrive/Documents/ShareX/Screenshots/2026-09/comet_H9kiLBnGVK.mp4) | 1190×618, 9.333 s | Paused opening; approach around 2.5 s; repeated close pose/contact changes through roughly 3–4.8 s; separation around 5 s, recontact around 5.7 s, extended kick around 6 s followed by displacement | Distinct beats and a strong separating hit. The recording contains more than one exchange/reapproach; do not claim it proves a single four-hit combo |

Local evidence: [rush overview](../../artifacts/esf-reference-2026-09-11/comet_w12YVzj3Oo-sheet.jpg), [grab overview](../../artifacts/esf-reference-2026-09-11/comet_WaCRDvfK4v-sheet.jpg), [melee overview](../../artifacts/esf-reference-2026-09-11/comet_H9kiLBnGVK-sheet.jpg), [dense melee](../../artifacts/esf-reference-2026-09-11/melee-detail.jpg), [dense throw](../../artifacts/esf-reference-2026-09-11/throw-detail.jpg). Dense sheet labels give relative timestamp plus the seek offset. Sheets are ordered left-to-right, then top-to-bottom; unused tiles are blank.

**Borrow the purpose:** stay close through minor contacts, reserve large displacement for a decisive beat, visibly free both actors afterward, make a held victim and release direction readable. **PowerWorld-specific proposals:** four-beat starter chain, defensive admission gaps, bounded hold/energy, swept swing and throw collision, one credited world impact, and independent Alt view. These belong to our combat owners rather than an imported cinematic or ESF minigame.

## 3. Existing code changes the implementation plan

At audited root `814d322`, [police.js](../../src/engine/police.js) contains heat thresholds 35/90/160/240/340/460 for beat cops, backup, SWAT, federal, military and sanctioned superweapon. Jurisdiction capabilities cap the ladder. `_deploy` actually selects `GUARD_DEF` at level five and spawns four military infantry; the definition includes an assault rifle, rifle grenade and armor. This is more than a comment or a wanted label, but it has not been exercised on the selected desert in this pass.

Important presentation gap: the threshold transition can emit a Newsroom headline saying military deployed before the arriving cruiser reaches `_deploy`. The plan now distinguishes authorization/en route from arrival. Existing combat budget and jurisdiction behavior should be verified before adding more unit classes. Military vehicles/aircraft are not proven by this infantry code.

[melee.js](../../src/engine/melee.js) already implements a clinch, body blows and `_throw`. Current throw direction uses `holder.aim3`, scales launch speed against strength and body weight, adds a vertical bias, applies release damage, tags the thrown victim and uses the existing slam path. Therefore **three-dimensional aim is partly present**; the missing acceptance is the complete controllable whirl/aim/fast collision/recovery experience. Tune or separate release versus impact damage explicitly instead of accidentally charging the same damage twice. Evaluate the existing upward bias for downward aiming.

Use existing [entity.js](../../src/engine/entity.js) slam/collision and game hit attribution. The new plan does not require a second grab controller, police authority or damage pipeline. Existing historical [ESF research](../powerworld/pw-esf-research.md) remains useful context; this report is specific to the newly supplied clips and local installer.

## 4. Download and source status

Found [esfb123.exe](C:/Users/taskm/Downloads/esfb123.exe), 193,797,819 bytes. 7-Zip identified an NSIS installer and extracted it without running the installer. It contains Windows client/server libraries, the Linux server `hl_i386.so`, models/sounds/configuration and a bundled beta-1.2 manual. The scoped scan found no gameplay C/C++ source or PDBs. The manual header dates itself April 5, 2004; an installer named 1.2.3 does not make every bundled page newly revised for that release.

The [official download page](https://esforces.com/download) identifies 1.2.3 as the stable release and distinguishes it from the cancelled/unstable 1.3 Open Beta. It does not establish an open-source release. An [October 2024 source-code discussion on the official forum](https://forum.esforces.com/t/getting-the-source-code-of-1-2-3/82558) reports, secondhand, that the source was lost and suggests reverse engineering. This is not independent verification that every private copy is gone. Conclusion for this task: **compiled release located; open-source gameplay repository not verified**.

The bundled [manual combat sections](../../artifacts/esf-reference-2026-09-11/extracted/$0/esf/manual/right.htm) describe double-tap-and-hold movement, an automated preliminary punch phase, separation after advanced melee, an energy-consuming charged throw and victim resistance. It also describes wall contact/recovery. Those are historical design references, not defaults to copy: the creator's energy-first guard and direct-action melee take precedence.

## 5. Focused decompilation performed

Used official [Ghidra 12.1.3](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.1.3_build), with portable Temurin JDK 21.0.12.1, against the **Linux server library** from the same installer. Ghidra supports static binary analysis and decompilation; the ESF game code was not executed. The library retains useful old GCC-style C++ names. No original gameplay type definitions, comments or buildable source tree were recovered.

- Binary: `extracted/$0/esf/linuxdlls/hl_i386.so`, 2,515,938 bytes, imported as `x86:LE:32:default:gcc`.
- Auto-analysis completed in about 37 seconds. The library had 47 unresolved external symbols; no matching libc project was loaded. Imported DWARF records concerned runtime assembly startup, not recovered gameplay source.
- Initial broad export produced 90 pseudocode files. A second bounded export focused on names containing CPlayerMelee, CMelee or swoop: **288 candidates, 260 exported**, capped in address order. This includes helpers and is not 260 different gameplay mechanics or every combat routine.
- Saved a **9,505-entry function index**, Ghidra project, extraction script, logs and pseudocode outputs in the local ignored evidence directory. The first script export failed when its script directory included the tool tree; re-running from an isolated script directory succeeded. Logs retain both outcomes.

Useful binary landmarks:

| Function address | Retained function identity | Supported finding / limit |
|---|---|---|
| `00119040` | `CPlayerMelee::HandlePrepunchAttack` | Separate preliminary attack stage exists; no PowerWorld timing copied |
| `00117390` | `CPlayerMelee::StopMelee(int)` | Cleanup branches distinguish prepunch, charged, grabbed and execution states; output has unreachable-block warnings |
| `0011a660` | `CPlayerMelee::HandleGrabAttack` | Output includes held-target positioning, elapsed-time energy use, charge accumulation, resistance-related inputs, UI update and a release/stop branch |
| `0011a230` / `0011a4d0` | `CanThrow` / `Throw` | Separate validation/release routines; output truncates at inferred non-returning helper calls, so exact direction/trajectory is not accepted from this pseudocode |
| `001112b0` | `StartToss` | Transition explicitly interacts with swoop, descent, power-up, flight and turbo before storing launch state; confirms movement ownership needs coordination |
| `00112910` | `InflictWallhitDmg` | Separate wall-hit damage path with source-like entity references; exact formula/types not reconstructed |
| `00112180` / `00112360` | `Recover` / `HandleLandRecover` | Recovery is represented separately from launching and striking |

**Interpretation limits:** raw field offsets, unknown globals, inferred types and erroneous non-returning-call analysis remain. “Exported” means Ghidra emitted C-like text, not that the output is semantically complete or recompilable. No exact balance numbers or control behavior are claimed solely from ambiguous pseudocode. A full ESF source reconstruction, Windows/Linux equivalence proof and game rebuild were not performed. The useful result is a navigable combat research project and architectural evidence for the current design work.

Local outputs: [focused summary](../../artifacts/esf-reference-2026-09-11/combat-focused/summary.txt), [function index](../../artifacts/esf-reference-2026-09-11/combat-focused/functions.tsv), [grab-handler pseudocode](../../artifacts/esf-reference-2026-09-11/combat-focused/0011a660_HandleGrabAttack__12CPlayerMelee.c), [analysis log](../../artifacts/esf-reference-2026-09-11/ghidra-analysis.log), [successful export log](../../artifacts/esf-reference-2026-09-11/ghidra-focused.log), [research script](../../artifacts/esf-reference-2026-09-11/scripts/ExtractCombat.java), [input SHA-256 inventory](../../artifacts/esf-reference-2026-09-11/input-hashes.json). These are local research artifacts, excluded from normal Git additions; gameplay source has no dependency on them.

## 6. Plan changes and completion boundary

Added MAP-01, LAW-01, FIGHT-01, FIGHT-02 and REF-01 to the continuing tracker. Expanded roadmap stage 4 for recovery-space exchanges and aimed throws, stage 7 for desert preservation, and stage 7a for native police-to-military proof. Existing priorities remain: recover the integration baseline, Alt/physical speed, energy-first guard and combat clarity, visible UI/Newsroom, then the complete desert operation.

The reference review and focused static decompilation are complete. The new gameplay behaviors are planned with explicit acceptance conditions. No runtime pass, merge, public upload, copied ESF asset integration or completed military/desert gameplay claim follows from this document.
