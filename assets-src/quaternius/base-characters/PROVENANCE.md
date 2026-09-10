# Quaternius Universal Base Characters provenance

The files in this directory are unmodified source assets by **Quaternius** from
the **Universal Base Characters** pack. Quaternius dedicates the pack to the
public domain under **CC0 1.0 Universal**. The full license text retained with
the source is [`../LICENSE.txt`](../LICENSE.txt), and the official pack page is:

https://quaternius.com/packs/universalbasecharacters.html

## Reproducible source

The local files were retrieved from this community source mirror at the pinned
revision `0cc5dc351f4fffbe13a25381e73cb0a1aea67f47`:

https://codeberg.org/jamesonBradfield/Quaternius_IK_Rigged_with_animations/commit/0cc5dc351f4fffbe13a25381e73cb0a1aea67f47

| File | SHA-256 |
| --- | --- |
| `Superhero_Male_FullBody.gltf` | `e7fcea214ecf8855afbf910b50de6f9c7d1decfb71ca28bad8a4481452dafeb4` |
| `Superhero_Male_FullBody.bin` | `459003f9745853ae562a85506a2b94dd56515c1f37728f9fa3d2ce1a3e4cd92f` |
| `Superhero_Female_FullBody.gltf` | `adedf28000a0716f689b009a70314506fc62f827498f77ba852acb5610f3f3f4` |
| `Superhero_Female_FullBody.bin` | `3a8220a485b33d05d879115a50697728b45a151781106033afb8b8c243fca208` |
| `T_Eye_Brown.png` | `d08e3356a83211bc6ca21fe3a8e39f4b5c1a3b8f85457fc2c0fb57be09935025` |

`tools/ingest-hero-bodies.mjs` verifies these bytes through its regression and
generates the bundled runtime bank. The loader embeds the `.bin` in an in-memory
copy of each glTF and removes texture references from that copy, so ingestion
does not perform a network request and does not modify the source files.
