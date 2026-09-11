# VEGA Rush Combo contact review — 2026-09-10

Exact action: VEGA, E, `Rush Combo`, production `melee` ability with `contact: 'fist'`. This is a procedural overlay on the final gameplay rig, not an imported animation clip.

## Defect and correction

The former ability authorized damage using a broad cone before the displayed fist arrived. After contact, its retained lunge velocity resumed after 0.08 seconds of attacker hitstop while the victim remained frozen for 0.13 seconds. PowerWorld deliberately skips ordinary separation between airborne fighters; together these allowed VEGA's entire body to fly through Kano.

The physical-contact opt-in now uses the existing post-physics/post-pose swept fist seam. A successful contact retains original damage, guard behavior, victim knockback, and impact feedback. It stops the attacker's inward rush impulse and establishes a torso/head/pelvis separation constraint before and after physics through recovery, including hitstop-only frames. Target knockback is never zeroed. Transverse movement can leave the contact constraint. The prone silhouette uses recorded incoming travel for its brief recovery blend; authoritative velocity remains stopped.

The ability still permits one hit per victim across its active window. An interrupted or missing physical pose cannot fall back to cone damage. Grounded use, moving targets, guarding, wall occlusion and interruption are covered.

## Evidence

- `node --test tools/ability-fist-contact.test.mjs`: 23 passing, including six previously failing full-body overlap cases at 30/60/120 Hz, with and without held-forward movement.
- `node --test tools/aerial-punch-articulation.test.mjs tools/ability-melee-pose.test.mjs tools/ability-melee-studio.test.mjs`: 43 passing, including 32 deterministic breathing-phase sweeps for the former intermittent hand/torso clipping.
- `node tools/aerial-punch-native.mjs`: staged airborne encounter and initial camera/AI setup, followed by real W then E inputs and native update/physics/chase camera; 24 damage and zero page/runtime errors. This is not an untouched normal-spawn combat run. Independent CPU evaluation of 1,071 rendered source-hand vertices measured a 0.00064-unit nearest distance to visible victim triangles at the recorded hit.
- `node tools/aerial-punch-review.mjs --motion`: 48 directly rendered simulation frames, moving encounter with held-forward intent and an explicitly labeled inspection camera. Body core bounds stay disjoint through contact and recovery.
- Movie: `artifacts/aerial-punch-body-stop/aerial-punch-motion.mp4`; contact/follow-through/recovery frames 011, 018 and 027 in its `frames` directory.
- `npm run build`: passes; existing large-bundle advisory remains.

## Scope and remaining limits

This fixes the contact-enabled Rush Combo, not the wider policy allowing two non-attacking fliers to pass through each other. Gameplay collision uses conservative driven core volumes; the visible-hand distance measurement is an independent diagnostic, not a per-frame triangle collision engine. The movie is an inspection camera witness, not a gameplay-camera replacement. Kano remains the existing procedural model. No claim of finished AAA animation, full-roster collision coverage, or performance certification is made.
