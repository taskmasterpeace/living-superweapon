# Power World thrown-body contact checkpoint

The swept fighter-body resolver now applies thrown-body impact damage before ordinary body blocking removes incoming velocity. It uses existing core bounds, movement intervals and nearest-contact ordering. Both participants receive the existing damage amounts; the throw owner retains credit. A per-throw target set prevents repeated damage. Legacy endpoint contact remains for other runtime paths. This does not introduce a new damage or mass formula.

The seven-stat display now ends in Mental. Internal res identifiers remain compatible.

Validation: 73 tests passed across fighter-body-contact, person-carry and physical-stats; production build passed with the existing bundle-size warning. New crossing regressions run at 30, 60 and 120 Hz and verify damage to both bodies, separation and no duplicate damage.

Remaining: visual acceptance of held reactions, conscious/stunned airborne reactions and landing/get-up transitions; complete playable curved rear-grab sequence. No new proof video was recorded. This checkpoint does not claim the full animation task is complete.
