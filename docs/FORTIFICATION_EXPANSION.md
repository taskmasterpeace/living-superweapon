# Fortification expansion

Added `tall-long-wall`: 128u long (four standard panels), 48u high, 12u deep. Highwall's authored wall-chain builder uses these whenever 128u remains, retaining the existing route layout and end positions. Smaller remainders retain standard/half panels. The same module recipe supplies render, collision, navigation and sight solids.

Added `tall-long-curve`: 128u square footprint, 122u centerline radius, 12u wall thickness, 48u height. Quarter-circle endpoints are (-64,0,-58) facing west and (58,0,64) facing south; rotate in quarter turns. This is a reusable faceted bend with 2u collision strips, not a smooth-physics arc. It reduces authoring placements, not necessarily runtime solid count. It is available for future longer corridors; the existing maze has not been enlarged or rerouted.

Added complete portal variants `gate-closed/open/damaged/destroyed` and `door-closed/open/damaged/destroyed`. Gates are 64x52x16u with 40x44u passage; doors 24x28x16u with 16x24u passage. Closed and damaged leaves block; open and destroyed variants clear the middle. Destroyed variants leave side supports. These are authored rebuild/reload states, not automatic weapon-damage transitions. The existing interactive service gate remains on its tested controller.

Visual evidence: `artifacts/fortification-expansion/module-lineup.png`. This is an isolated rendered asset review, not a new native gameplay acceptance run. Existing kit bounds/skins, portal contact, long-wall sockets, curve hollow space and elevated navigation are regression-tested. No editor UI was added.

Validation: 28 focused regression tests passed using the repository CSS import hook; production build passed (630 modules). Browser asset capture reported zero page errors.
