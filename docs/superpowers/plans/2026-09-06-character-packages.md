# Portable custom characters — first BFP parity slice

User authority: continue implementation autonomously, retain BFP camera/flight priority,
make custom characters authorable, exclude map design. Preserve the current dirty workspace.

## Contract

Studio retains its existing warm-neutral Operate layout and production preview. Add direct
New character / Edit power kit actions using the existing ORIGIN authoring UI. Custom exports
carry the validated ORIGIN recipe plus current model, poses, camera and flight response.
Imports create a new local character, never overwrite another fighter. Legacy presentation-only
profiles remain supported. No arbitrary executable code or external assets in packages.

## Implementation and verification

1. RED: portable recipe/profile round-trip; malformed recipes; failed/corrupt storage preserves
   existing records and roster. GREEN: package validator and single-record persistence.
2. RED: browser create in Studio, save a presentation edit, export, import in an empty context,
   reload, play test and re-edit the power kit. GREEN: integrate existing creator and package dialogs.
3. Inspect screenshots at desktop and narrow viewport. Run package tests, existing Studio/ORIGIN
   regressions, and production build. Review the scoped changes and fix findings.
4. Record a sourced BFP parity ledger separating engine features, editor support and unverified
   subjective feel. This slice does not establish complete BFP parity or multiplayer readiness.

Do not change maps, shipped character definitions, camera calibration or beam behavior here.

## Review corrections

- Strict presentation-field allowlists and escaped color labels close an import HTML injection path.
- Blocked localStorage getters do not prevent boot; failed writes do not mutate the roster.
- Embedded presentation survives recipe edits. Studio owns appearance during embedded kit editing;
  a Model-tab cape toggle keeps that capability reachable. Custom saved state is labeled correctly.
- Independent scoped reviewer rechecked these corrections without remaining actionable findings.
