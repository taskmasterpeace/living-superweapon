# Attack tuning Task 1 report

Implemented Task 1 of `2026-09-06-attack-authoring.md` in place. No shipped character definitions, Studio controller/combat files, package manifest, browser state, branch, commit, or map/camera/rendering data were changed by this task.

## Exact edits

- Added `src/data/attack-tuning.js`:
  - public metadata for numeric controls already consumed by production `beam`, `projectile`, `volley`, and `charge` abilities;
  - source-existing boolean controls only, so a profile cannot add an absent mechanic flag;
  - deterministic full-source identities, JSON-safe source snapshots, sparse override normalization, finite/bounds validation, and charge pair validation (`minR < maxR`, `dmgMin < dmgMax`, `speedMin <= speedMax`);
  - `maxBlast > 8`, preserving production's fixed 8-unit starting blast and the charge-means-scale rule;
  - attack records are limited to actual production slots (`lmb`, `rmb`, `q`, `e`, `f`, `r`, `shift`); arbitrary keys fail before profile storage writes;
  - real runtime fallback defaults: zero is retained only for lanes that production honors (`cost` where applicable, `cd`, beam `steer`, optional `homing`/`grav`/`bounces`), while truthy-fallback lanes expose their actual nonzero production default;
  - immutable application from a persisted original basis, reset, stale-identity reconciliation, and conservative ORIGIN carry-forward;
  - imported `source` snapshots are never copied into runtime abilities. They must match the identity of the genuine current source before their sparse values apply.
- Updated `src/tool/studio-profile.js`:
  - version-one profiles accept optional `attacks`; legacy profiles complete it to `{}`;
  - new profiles recover persisted attack authoring from custom definitions;
  - `applyProfile` applies tuning to the real `def.abilities` object returned to gameplay/preview;
  - profile install removes stale internal tuning metadata after a reset.
- Narrowly updated `src/data/creator.js`:
  - `saveCustom` carries tuning from the live/saved previous custom only when the rebuilt ORIGIN slot has the same full source identity;
  - replacing an attack, including another attack of the same type, starts from the replacement's catalog values.
- Added `tools/attack-tuning.test.mjs` with 13 Node tests covering the four types, metadata/runtime defaults, invalid fields and values, strict paired ranges/charge growth, source preservation, repeated apply/reset, stale identities, arbitrary-slot persistence rejection, import injection resistance, legacy profiles, the complete supported shipped/ORIGIN catalog, ORIGIN edits, and portable package reconstruction.

`src/data/creator.js` and `src/tool/studio-profile.js` already contained intentional uncommitted work. Only the attack-tuning import/integration described above belongs to this task.

## Public API

All attack helpers are exported from `src/data/attack-tuning.js`:

- `ATTACK_TUNING_FIELDS`: frozen metadata keyed by supported type. Numeric entries carry `key`, readable `label`, `unit`, `min`, `max`, `step`, runtime `fallback`, and availability flags. Boolean entries carry `key`, `label`, and source-only availability.
- `attackIdentity(ability)`: deterministic versioned identity of the complete source ability.
- `attackSource(def, slot)`: defensive copy of the genuine original source, including after tuning has been applied.
- `attackFields(def, slot, attacks)`: controls available to that source with `default` and `value` added for direct inspector rendering. Unsupported types return an empty list.
- `validateAttackOverrides(attacks, def?)`: validates and normalizes the optional attacks map; when `def` is supplied, only identity-compatible entries remain.
- `setAttackOverride(attacks, def, slot, patch)`: returns a new sparse map; equal-to-runtime-default values are removed.
- `resetAttackOverride(attacks, slot)`: returns a new map without that slot.
- `reconcileAttackOverrides(def, attacks)`: rejects malformed data and drops otherwise valid entries whose genuine source identity changed.
- `applyAttackOverrides(def, attacks)`: returns a new definition whose actual abilities are rebuilt from genuine bases and sparse values. It does not mutate `def`.
- `attackOverridesFromDef(def)`: recovers a defensive copy of persisted custom authoring state.
- `carryAttackOverrides(previousDef, nextDef)`: applies only compatible previous tuning to a rebuilt ORIGIN definition.

Profile slot shape:

```js
attacks: {
  lmb: {
    identity: 'attack-v1:{...canonical full source...}',
    source: { type: 'beam', /* immutable JSON source snapshot */ },
    values: { dps: 91, steer: 0 }, // sparse authored values only
  },
}
```

The applied definition uses JSON-safe internal `_attackTuning: {version, sources, attacks}` metadata so a custom saved definition can reconstruct its Studio profile and reset from original values. Runtime application still trusts the current genuine definition, not the profile snapshot.

## RED / GREEN evidence

RED, before the production module existed:

```powershell
node --test tools/attack-tuning.test.mjs
```

Result: exit 1, `ERR_MODULE_NOT_FOUND` for `src/data/attack-tuning.js`.

RED after the first implementation, before profile/ORIGIN/package integration:

```powershell
node --test tools/attack-tuning.test.mjs
```

Result: exit 1; 6 passed / 4 failed for missing attack profile support, actual ability application, ORIGIN retention, and package reconstruction.

RED for final review findings:

```powershell
node --test tools/attack-tuning.test.mjs
```

Result: exit 1; 9 passed / 3 failed for truthy-fallback defaults, undefined/function patch rejection, and stale installer metadata cleanup.

RED for reviewer strictness gates:

```powershell
node --test tools/attack-tuning.test.mjs
```

Result: exit 1; 11 passed / 2 failed because equal charge radius/damage endpoints and an `arbitrary_slot` profile record were still accepted.

GREEN focused verification:

```powershell
node --test tools/attack-tuning.test.mjs
```

Result: exit 0; 13 passed / 0 failed.

GREEN adjacent regression verification:

```powershell
node --test tools/attack-tuning.test.mjs tools/character-package.test.mjs tools/flight-language.test.mjs
```

Result: exit 0; 25 passed / 0 failed. The focused attack suite itself exercises the profile integration without loading a browser.

Syntax/diff checks:

```powershell
git diff --check -- src/data/creator.js
node --check src/data/attack-tuning.js
node --check src/tool/studio-profile.js
node --check src/data/creator.js
node --check tools/attack-tuning.test.mjs
```

Result: exit 0. Git emitted only the existing Windows LF-to-CRLF working-copy warning for `src/data/creator.js`.

## Caveats and next-task notes

- Attack authoring is deliberately outside ORIGIN point balance; these values are not re-priced or claimed balanced.
- Type/visual/status strings and nested mechanics are preserved but are not editable in this slice. Optional numeric mechanic lanes and all booleans are exposed only when the genuine source already owns them.
- Full-source identity is conservative: any source-definition change invalidates that slot's tuning. This favors never inheriting stale tuning over attempting fuzzy migration.
- Metadata `step` is a UI suggestion, not a validator increment. The validator accepts any finite value within bounds; the controller should avoid native step mismatch for fractional positive minima.
- A preview scripted around a fixed hold duration must account for authored `maxCharge`; Task 1 changes data only and does not own preview timing.
- The charge entry-cost lifecycle fix was handled independently in `src/engine/abilities.js`; Task 1 labels charge cost as entry cost and does not claim ownership of that engine change.
- Verification correction: `tools/studio-profile.test.mjs` contains one Playwright case despite being launched through Node's test runner. It was inadvertently included in an earlier adjacent command and passed as part of a 42/42 run; an attempted name filter did not exclude it. The final completion command above therefore omits that file and is genuinely Node-only. No browser test was authored or required by Task 1.
