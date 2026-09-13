# Character review

Open `artifacts/character-review/index.html` for the searchable roster with preserved front/rear images. Edit `artifacts/character-review/characters.xlsx`, **Design review** tab, to supply a distinct design for each stable character ID. Amber columns are your inputs; source facts are in **Current characters**, with every ability and complete parameters in **Powers**. CSV copies support other spreadsheet tools.

Fill desired silhouette, hair/face, costume, emblem, colors/materials, equipment, sprint, flight, infected identity and power visuals. Use the two approval columns independently. Blank approvals mean no approval. Attach reference links and notes as needed. Entries do not modify the game automatically. Ordinary exporter reruns preserve every existing file in the review directory, including your edited workbook, CSV and HTML.

Before images remain the archive at commit `77e7e59`, with neutral hover poses and source-default outfits. They do not demonstrate sprint, combat, or approved anatomy. Current facts may differ from that historical archive. No new after images have been fabricated: the after link is intentionally blank until an implemented design is captured and reviewed. The infected identity field is a requested design input, not an assertion that every character already has an infected variant.

The export covers the complete checked-in `ROSTER`, including military entries. It excludes browser-local custom characters and saved personal outfits, which require a separate user-supplied export. All canonical definitions are preserved in `characters.json`; `manifest.json` records IDs, source hashes, ability count and archive coverage. Missing declared fields read **Not declared**. Runtime flight defaults and derived body frames are labeled; resolved models include existing defaults, not proposed designs. Power descriptions are copied only when authored; exact parameters are retained rather than invented descriptions.

Regenerate from the repository root:

```powershell
node tools/export-character-review.mjs
```

For Excel as well, use the bundled runtime paths from Codex's workspace dependency loader:

```powershell
$env:ARTIFACT_NODE_MODULES = 'C:/Users/taskm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
& 'C:/Users/taskm/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' tools/export-character-review.mjs
```

If the review directory already contains files, the exporter prints `status: preserved` and exits without writing anything. To deliberately replace generated outputs with a fresh source snapshot, first save your edited review files elsewhere, then pass `--replace-generated` to either command above. This explicit option resets review inputs in the newly generated files. It does not merge your decisions; reconcile saved review edits by **ID**, never by row number or display name.

Keep the preserved `artifacts/marketing/roster-before-rebuild` folder alongside the export so relative image links work. When sharing the HTML, include both folders.
