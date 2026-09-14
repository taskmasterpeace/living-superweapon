# Animation Library playback repair

The native authored clip loop sampled the hidden legacy rig but never transferred that pose to the asynchronously loaded faceted-v1 model. Timeline playback therefore appeared to work while the visible character remained still. Added a native-pose presentation entry point to the existing modular adapter and called it after sampling. Gameplay animation selection is unchanged.

Selecting a clip now resumes playback. Full-rig clips and editable studies load automatically (31 source clips plus 30 studies at this checkpoint), retaining the user's current selection. The library explains the distinction between clip playback, candidate studies and paired held poses. Hostile hold is not a reach/capture/throw sequence.

Added Grappling hook deploy and hang, an editable six-key full-body candidate with reach, overhead hang and release. It does not implement hook projectile, rope collision, anchor acquisition or gameplay assignment. Those must use the actual traversal controller. Study reference body is identified separately from roster appearance.

Validation: eight catalog, real modular-model pose/seek and paired-preview tests passed. Browser inspection on port 5185 showed Vegas jab extending at 0.27 seconds, the hostile pair, and the grappling overhead pose at 0.60 seconds. Build passed. This is preview verification, not a completed aerial grab/throw gameplay demonstration.

User direction retained: extra audio should remain available for later selection in Sound Library; do not discard it during selective runtime integration. No universal sweep or airborne sweep was added. Regional input design remains unresolved pending playable comparison.
