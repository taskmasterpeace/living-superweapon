# Git object recovery audit

Read-only diagnosis of shared object store `D:/lsw/.git`. No Git objects were modified, moved, or deleted. Audit covers the four reported hashes, not a clean full fsck certification.

## Findings

All four blobs fail full `git cat-file blob` inflation with `incorrect data check`; reading their type alone succeeds and does not establish integrity.

| Blob | Reachability / recovery |
| --- | --- |
| `08f9a9c44afd5eff91a9f3d4a518e064d6962079` | Not found in `git rev-list --objects --all`; absent in D:/git/powerworld object database. |
| `10c11d5003d7de3b20150d89aec1910dea078451` | Not found in all-ref traversal; absent in D:/git/powerworld. |
| `1272e6a68faf5a6eb223dbd71006ddff07c44b99` | Reachable from codex/pw-vehicle-sim as `public/authored-assets/prop.reference-mothership-destroyed/v9/model.glb`. Exact healthy working-tree bytes exist; see below. |
| `1fc21562166bd0fc15731ea6bce1217ad61784f2` | Not found in all-ref traversal; absent in D:/git/powerworld. |

None of these four objects is reachable from current HEAD, codex/combat-speed-repair, or codex/pw-ground-handling. Each targeted object traversal completed successfully. Unreachable here means absent from current refs; reflogs and other unreachable history were not audited.

## Exact local recovery source

Both files below contain 1,427,796 bytes. Independently hashing `blob <length>\0` plus file bytes produces exactly `1272e6a68faf5a6eb223dbd71006ddff07c44b99`:

- `D:/lsw/public/authored-assets/prop.reference-mothership-destroyed/v9/model.glb`
- `D:/lsw/.worktrees/pw-launch-inheritance/public/authored-assets/prop.reference-mothership-destroyed/v9/model.glb`

## Recommended next steps

1. Preserve the shared object store before repair. Do not prune, garbage-collect, reset branches, or discard corrupt objects.
2. For a backup of only the immediate integration refs, try a targeted bundle of HEAD plus codex/combat-speed-repair and codex/pw-ground-handling rather than `--all`. These four hashes do not block those histories, though other corrupt objects still might.
3. If vehicle-sim history is required, reconstruct the identified blob from verified local bytes in a separate temporary object store. Verify its hash and full inflation, preserve the original corrupt object, then install the verified replacement. `hash-object -w` against the original store alone may skip an already existing corrupt object.
4. Re-run full fsck, then retry bundle creation and verify the resulting bundle before treating backup as complete. More corrupt hashes may appear; do not assume four is the full set.
5. The configured remotes are GitHub taskmasterpeace/living-superweapon and taskmasterpeace/powerworld. Remote content was not fetched or verified in this audit. A separate healthy clone may help recover additional reachable objects without modifying the damaged repository.

The three currently unreachable corrupt blobs should be preserved for later analysis, not deleted merely to make fsck quieter.

## Recovery performed after the audit

The reachable mothership blob `1272e6a...` was reconstructed from the exact healthy working-tree bytes, fully decompressed and SHA-1 verified, and installed. The original compressed corrupt file is preserved in `artifacts/integration-checkpoint-20260914-targeted/1272e6a68faf5a6eb223dbd71006ddff07c44b99.corrupt-original`. Windows read-only attributes required making only that object writable before replacement. No source asset was changed.

The targeted bundle for integration HEAD, ground handling, combat speed and audio-all succeeded and `git bundle verify` passed. This is not an all-refs backup or clean fsck certification. The other corrupt objects remain preserved and unresolved.
