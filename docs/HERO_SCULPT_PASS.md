# Hero body surface and costume attachment pass

September 7, 2026. A bounded character-model/editor improvement, not an overall game-completion or AAA-quality verdict. The existing blocking, bot-reaction limits, flight languages and authored light strikes remain the combat foundation. No map, gameplay camera, lighting or palette changes belong to this pass.

## What changed

- One continuous torso now provides chest, clavicle, abdomen, oblique and shoulder-blade planes. Body definition blends from smooth fabric to stronger relief. This is original procedural geometry, not a newly imported model or animation.
- The existing torso envelope, root scale, joint sockets, fixed limb lengths and YXZ orientation remain unchanged. Definition changes appearance, not strength, reach or collision rules.
- The chest hem blends back to the existing waist surface so the pelvis does not make a jagged edge above the belt. The two floating decorative side bars were removed.
- The chest insignia is a conforming torso child from construction onward. It follows charged torso twists, breathing, recoil, ragdoll and form replacement exactly once. Continuous surface normals remove radial shading seams between its six sampled sectors.
- Martial necklines and tactical/plated armor now follow the actual body surface. Armor uses a small rounded XY grid with explicit front/back bevel boundaries. Angle-weighted normals are shared across the actual deformed mesh's coincident vertices, avoiding both triangulation seams and backward corner highlights. These are costume meshes, not additional bones or floating muscle islands.

The torso is 3,744 triangles, with one existing material draw; the insignia is 216 triangles. All tactical torso panels total 944 triangles and plated panels 2,320. These are construction/topology counts, not a full GPU performance benchmark. Torso envelope checks, panel degeneracy checks, duplicate-position normal continuity and outward face-hemisphere checks are enforced by tests.

## Authoring

In Studio, use **Model → Body surface → Body definition**. The range is 0–1; fitted, martial, tactical and plated defaults are respectively 0.85, 0.5, 0.35 and 0.2. An explicit zero is preserved. Legacy profiles without the field remain valid and use their resolved costume's default.

The existing Undo/Redo, Save local, JSON export/import and Play Test paths carry this value. **Progression → Edit form → Form body definition** overrides it per appearance form; blank inherits from the base fighter. The change does not expand the v1 data package into an arbitrary GLB/FBX/animation/audio asset container.

## Review and evidence

Visual review found and corrected a ribbed abdomen, the waist intersection, a clipping insignia, detached torso decorations during combat, buried/floating armor, faceted panel shading, excessive intermediate tessellation and radial insignia normals. The expensive intermediate panel version was discarded, not accepted as the final result. Independent CPU review supplements, rather than replaces, rendered inspection.

- `artifacts/hero-sculpt/before/`: pre-pass production figures.
- `artifacts/hero-sculpt/final/`: final front, rear and face views for KANO, SOL, VEGA and TITAN under Studio lighting.
- `artifacts/hero-sculpt/motion/`: seven production-rig fixtures, five sampled phases each, front/both profiles/rear views and continuous playback recording (`motion.webm`). Includes hover, cruise, boost, grounded light strikes, armed aerial blocking, heavy windup/contact and sprinting. Separate isolated views hide only the rendered opponent so it cannot obscure the character; those images are labeled accordingly and are not gameplay-camera evidence.
- `artifacts/hero-sculpt/editor/`: real authoring, Undo, save/reload, form override and mobile/desktop evidence.
- `artifacts/hero-sculpt/verification/results.json`: serial named verification gates with full adjacent logs.

Close inspection uses a custom diagnostic camera, not the BFP gameplay framing. Motion uses production animation/contact; it is not a comparison to a new source animation clip. Scripted Studio opponents do not certify AI balance or subjective combat feel.

The final serial refresh completed with all 13 commands exiting 0: `test:hero-sculpt`, `test:strike-animation`, `test:poses`, `test:impacts`, `test:blocking`, `test:melee-depth`, `test:locomotion`, `test:character-packages`, `test:flight`, `test:flight-languages`, `test:camera`, `test:combat` and `build`. Earlier runs interrupted during visual/resource corrections are not used as completion evidence.

The body gate passed 61 CPU tests plus real Studio edit → Undo → Save/reload → form-preview and 390px-layout checks. Custom-character export → clean-browser import → reload → power-kit edit → PowerWorld preserved definition 0.95 and the saved animation choices. Final independent CPU review also checked seven definition values and all 53 roster figures, with no remaining concrete geometry/ownership finding. The project is JavaScript/Node; the animation skill's example TypeScript/Vitest/lint commands are not repository gates.

Combat passed 53 kits × seven checks, world 42/42 and a 30.015-second eight-fighter soak: 1,050 hits, 24 KOs, no invalid states or errors. Those randomized counts are observations, not balance scores. Camera verification retained reference hair/boot bounds of 62.13% / 88.14% against BFP's 62.22% / 87.92%, with no camera-parameter changes. This measures framing, not equality of pose, environment or feel. All six flight languages and their Studio transition/weapon/trail checks passed.

The animation-authoring and visual-polish reviews drove the attachment, shading and inspection corrections. The existing inspector/transport layout was retained, including draft/save boundaries; no unrelated editor redesign was introduced.

## Remaining quality gaps

The models remain stylized procedural figures. Better body planes do not replace professional face, costume, hand and boot art, dedicated heavy/grab/weapon/flight animation, or a real external-asset authoring pipeline. Direct BFP play-feel/timing approval, additional modes and cross-peer synchronization also remain open in the [parity ledger](BFP_PARITY_LEDGER.md). Blocking/fair-bot behavior is documented separately in [BLOCKING_AND_BOT_FAIRNESS.md](BLOCKING_AND_BOT_FAIRNESS.md).

Follow-up (2026-09-07): the [actual Studio isolation control](STUDIO_ISOLATION_PASS.md) now addresses axial opponent obstruction and narrow full-encounter framing, including transformed body sizes. A focused [hero-hover update](reference/FLIGHT_LANGUAGES.md#hero-rest-silhouette-follow-up-2026-09-07) lowers the fists and adds a tucked/long leg pair. Heavy windups and waist/shoulder silhouettes still need further pose/art review; armor shells and boots remain basic shapes. Gameplay/BFP chase framing is a separate path and was not changed to flatter inspection shots.
