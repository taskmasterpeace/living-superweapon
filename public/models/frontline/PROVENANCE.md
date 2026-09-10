# Frontline rock asset

Current mesa runtime is `eroded-mesa-kit.glb`, approximately 1.71 MB: four complete project-authored Blender fault-block volumes plus four distant LODs. Explicit sediment-bed rings, broad asymmetric shoulders and a fractured outer rim replace the former vertical-curtain silhouette. Low fracture pieces derived from CC0 Namaqualand Boulder 04 (Jenelle van Heerden) are CPU-unioned into each apron/lower shoulder. Crown and base stay closed, with a level central native landing plane. Editable source and reproducible numerical authoring/export scripts are preserved. Runtime uses photographed CC0 sandstone materials at world scale. Full methodology, license links and commands are in `assets-src/frontline-mesas/README.md`. This supersedes the wrapped cliff-panel strategy below; `cliff-shell-02.glb` remains a legacy diagnostic asset and is not loaded by the current terrain runtime.

Shipping `boulder-04.glb`: [Namaqualand Boulder 04](https://polyhaven.com/a/namaqualand_boulder_04), by Jenelle van Heerden, Poly Haven. [CC0](https://polyhaven.com/license). Downloaded 2026-09-09 via the public asset API.

`fractured-talus-kit.glb` (~541 KB) contains four closed short fragments derived from that same licensed Boulder04 scan, cut and capped along authored fracture planes in Blender. Twelve native rock covers form four three-fragment talus piles; no separate landing lids are added. Original source, editable `.blend`, repeatable authoring/export commands and topology/landing tests are documented in `assets-src/frontline-talus/README.md`.

Source glTF, binary and 1K textures preserved in `assets-src/polyhaven/namaqualand_boulder_04`. Fetch script verifies publisher MD5 and byte sizes for each new download; runtime never contacts a CDN.

Optimization: glTF Transform 4.5.0, compression false (no runtime decoder), WebP textures 1024px, simplify ratio 0.09/error 0.002. 3.72MB source -> approximately 974KB local GLB. Dynamic PBR lighting. Cover remains explicitly registered; scanned render geometry is constrained to its collision proxy.

The open [Namaqualand Cliff 02](https://polyhaven.com/a/namaqualand_cliff_02) scan (photography Dario Barresi/modeling Rico Cilliers, CC0) is now used only as an overlapping-face formation building block: `cliff-shell-02.glb`, 613.8KB, optimized ratio 0.018/error 0.009 with WebP 1K textures and uncompressed geometry. Source files remain in `assets-src/polyhaven/namaqualand_cliff_02`. Multi-face assembly is an intermediate terrain treatment, not a watertight authored final canyon; visible cap/seam quality still needs review.

Rejected standalone candidates are retained under `assets-src/optimized-candidates`, not shipped: `cliff-02.glb` was unsuitable as a freestanding open scan; `boulder-02.glb` has a flat profile unsuitable for the intended forms. Their source packages remain in `assets-src/polyhaven`. Boulder 02 source: [Namaqualand Boulder 02](https://polyhaven.com/a/namaqualand_boulder_02), CC0.
