# Character Studio design contract

Scope: character presentation and supported attack authoring, not ATLAS or the game's arena.
Working-world layout: compact fighter library, dominant live turntable, inspectable properties,
and a motion transport. Warm charcoal/gold inherits the game; bright neutral lighting exposes model faults.
No decorative statistics or claims of quality. Show shipped default, unsaved draft and saved local state.

Model / Pose / Camera / Flight / Attacks / Progression map directly to data consumed by the game. Controls must never suggest
that a separate preview animation is authoritative. Import/export/reset stay reachable below the inspector.
Small screens stack the inspector below the stage rather than squeezing the character out of view.
Use Inter/system fallback, OKLCH chrome, visible keyboard focus, associated tabs and confirmation dialogs.
References are explicitly labeled footage/reconstruction, distinct from our authored targets.

Combat inspection has an explicit **Isolate fighter** checkbox in the existing view toolbar.
It hides only the rendered partner and frames the active body/form. The viewport note states that
combat still runs; it does not imply an empty simulation or change the measured contact results.
Game camera clears isolation and restores the encounter. Fixed inspection views and paused resize
must fit the current subject(s). This is ephemeral view state, never a dirty/saved profile field.

Attacks is an Operate inspector within this established shell: select a real kit slot, edit bounded
production parameters, see actual contact in the central stage, then save or undo. Remote attacks
show their charge/fire/second-press sequence. The stationary measurement partner is explicitly a
test target, not a gameplay opponent or a claim of balanced damage. Sparse attack edits travel with
character packages and are dropped visibly when the source power changes. Authored values are outside
ORIGIN's point budget; do not imply they are balanced. No new dashboard or decorative charts.

Example characters are explicit local-copy recipes, not automatic installs or overwrites. The modal describes which authored mechanisms each kit demonstrates. Progression preview is test-only; it does not change match starting level or simulate XP/stat growth. Save/Discard/Cancel guards apply before leaving a draft; delayed loading must respect cancellation even if the shared dialog reopens.

The Impeccable and frontend-design skills informed this focused editor layout, visible storage state,
responsive inspector, and independent finish review. No map or navigation-shell redesign was involved.
