# Fortification expansion

Added `tall-long-wall`: 128u long (four standard panels), 48u high, 12u deep. Highwall's authored wall-chain builder uses these whenever 128u remains, retaining the existing route layout and end positions. Smaller remainders retain standard/half panels. The same module recipe supplies render, collision, navigation and sight solids.

Added `tall-long-curve`: 128u square footprint, 122u centerline radius, 12u wall thickness, 48u height. Quarter-circle endpoints are (-64,0,-58) facing west and (58,0,64) facing south; rotate in quarter turns. This is a reusable faceted bend with 2u collision strips, not a smooth-physics arc. It reduces authoring placements, not necessarily runtime solid count. It is available for future longer corridors; the existing maze has not been enlarged or rerouted.

Added complete portal variants `gate-closed/open/damaged/destroyed` and `door-closed/open/damaged/destroyed`. Gates are 64x52x16u with 40x44u passage; doors 24x28x16u with 16x24u passage. Closed and damaged leaves block; open and destroyed variants clear the middle. Destroyed variants leave side supports. These are authored rebuild/reload states, not automatic weapon-damage transitions. The existing interactive service gate remains on its tested controller.

Visual evidence: `artifacts/fortification-expansion/module-lineup.png`. This is an isolated rendered asset review, not a new native gameplay acceptance run. Existing kit bounds/skins, portal contact, long-wall sockets, curve hollow space and elevated navigation are regression-tested. No editor UI was added.

Validation: 28 focused regression tests passed using the repository CSS import hook; production build passed (630 modules). Browser asset capture reported zero page errors.

## Revision: L corners and spacious perimeter
The rounded module was replaced by `tall-long-corner`, a 128u right-angle L with the same endpoint sockets. Main north/south maze lanes now have 156u center spacing rather than 78u. Three large L placements add western/southern space. Bounds expand from 648x600u to 992x832u. Existing spawn, gate, tank and bunker coordinates remain.

`border-wall` defaults to 256x96x24u: twice long-panel length, height and thickness. Authored perimeter spans adapt to the outer boundary; Highwall height is exactly twice the 30ft main wall. The south has a 128u ground entrance. No invisible ceiling. Layout version is 3; reload/reset to rebuild geometry and navigation. Existing saves may retain their authored old layout.

24 focused tests passed, including actual fighter stair navigation and current tower access. Production build passed. `artifacts/highwall-spacious/module-lineup.png` is an isolated layout inspection, not player vision or full battle acceptance. Expanded encounter balance still needs play review.
