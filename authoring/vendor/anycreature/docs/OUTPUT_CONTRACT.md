# anyCreature GLB output contract (1.3.0)

Everything this harness emits satisfies the contract below. It is not a wish
list: every clause is enforced by `harness/glbcheck.mjs`, which runs on the
delivered file before it is offered for upload, and can be re-run by anyone
holding the file — including a server, in a Worker, with no dependencies:

```js
import { checkGLB } from './glbcheck.mjs';
const { ok, errors, warnings, info } = checkGLB(bytes);   // never throws
```

A receiving system can treat a file that satisfies this contract as
**structurally known** — not as trusted. See "What this contract is not".

## Container

| Clause | Value |
|---|---|
| Format | glTF 2.0 binary (`glTF` magic, version `2`) |
| Chunks | **exactly two**, JSON then BIN, in that order |
| Extra chunks | none — ever |
| Bytes after the last chunk | **zero**; the header's total length equals the file length exactly |
| Buffers | exactly one, embedded in the BIN chunk, **no `uri` field** |
| External references | **none**. No `http(s):`, no relative path, no `data:` URI, anywhere |
| Compression extensions | none (`extensionsRequired` is absent) |
| Direction-dependent materials | none. `KHR_materials_anisotropy` is refused on any primitive lacking `TANGENT`/`TEXCOORD_0` — it needs a direction, not a strength |
| Typical size | 150–800 KB; the 10 MB submission ceiling is never approached |

## Content

| Clause | Value |
|---|---|
| Images / textures | **none.** Colour ships in `COLOR_0` vertex colours with AO already baked in. There is no EXIF/XMP surface at all |
| `TEXCOORD_0` | absent unless the spec opts in with `keep_uv: true` |
| Mesh | one, named `creature`; primitives merged one per material |
| Skin | one, named `creature_rig`; every primitive carries `JOINTS_0` + `WEIGHTS_0` |
| Material names | the spec's part names (`hide_torso`, `tusk`, `beak`) — semantic, never paths |
| Bone names | limb bones match `^[LR][A-Z][A-Za-z]*\d+[A-Z][a-z]$` (`LArm1Sh`, `RFrontLeg1Kn`); axis bones are plain words (`Hips`, `Chest`, `Skull`) |
| Animations | lowercase names, always `idle`, `move`, `attack` |
| Orientation / units | +Z forward, +Y up, metres; `asset.extras.source_spec.height` states the intended real-world height and the build is verified within ±15% |
| Accessors | counts, `min`/`max` finite and in range; every `bufferView` inside its buffer; every animation channel targets an existing node |
| Strings | no control characters, no angle brackets, no filesystem paths in any name |

## The `asset` block

```jsonc
"asset": {
  "version": "2.0",
  "generator": "anyCreature v1.3.0",
  "copyright": "<the creator's signature, or absent>",
  "extras": {
    "harness": "anyCreature",
    "harness_version": "1.3.0",
    "spec": "<working name of the spec file>",
    "monster": "<display name the creator typed>",
    "gate": { "passed": true, "checks": [ { "name": "...", "passed": true } ] },
    "license": "CC0-1.0",          // written ONLY at publish, after consent
    "source_spec": { /* the pristine authored spec — see below */ },
    "parts": [ { "kind": "volume|part", "type": "...", "name": "...",
                 "material": "...", "host": "...", "join": "..." } ]
  }
}
```

`source_spec` is the **authored spec, verbatim** — the file the session wrote,
re-read from disk rather than serialised from memory, so it recompiles
byte-identically. It is plain JSON data: no URLs, no code, no references to
anything outside itself, typically 4–12 KB (budget: 64 KB). It exists so the
creature can be extracted, edited, recompiled, or grafted onto another
creature (`harness/graft.py`). `embed_spec: false` in the spec opts out.

`parts` is a flat manifest of what the creature is made of, so a receiver can
list its pieces without parsing the whole spec.

## Error vocabulary

`glbcheck` reports machine-readable codes. A server rejecting a submission
should quote the same code so an agent can tell the submitter what happened:

| Code | Meaning |
|---|---|
| `parse_error` | not a GLB, wrong version, truncated, unparseable JSON |
| `trailing_bytes` | bytes outside the declared file, or after the last chunk |
| `extra_chunk` | a chunk that is neither JSON nor BIN |
| `duplicate_keys` | a repeated key in one JSON object (a scanner and a loader would disagree) |
| `external_uri` | a buffer or image points outside the file |
| `unsupported_extension` | `extensionsRequired` names something we cannot read (Draco, Meshopt…) |
| `path_leak` | a name contains a local filesystem path |
| `unsafe_string` | a name contains control characters or angle brackets |
| `accessor_bomb` | counts / ranges / targets that would crash a loader |
| `anisotropy_without_direction` | a material uses `KHR_materials_anisotropy` on a primitive with neither `TANGENT` nor `TEXCOORD_0`. The extension stretches the highlight along the tangent, so with no direction field every renderer invents its own — a flat white smear that lowering the strength cannot fix |

Warnings (`data_uri`, `unknown_extension`, `large_source_spec`, `chunk_count`,
`flat_white_base`, `high_metal`, `anisotropy_derived_tangent`)
are informational: the file is usable, something is merely unusual.

## What this contract is not

**It is not a security boundary.** `glbcheck` verifies shape; it does not
rebuild, and a hostile file can satisfy every clause here and still carry
something in a place we have not thought of. A public gallery accepting files
from anyone should still rebuild each submission from the parsed data — the
whitelist-rebuild described in `docs/HANDOVER_sanitize.md`. This contract's
job is different and narrower: it makes anyCreature output *predictable*, so a
receiver can validate cheaply, fast-path what it recognises, and report
failures in words a person can act on.
