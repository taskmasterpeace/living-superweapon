# Highwall courtyard pass

Layout version 4 replaces the repeated maze spines with six connected spaces: West Watch, North Yard, West Market, South Rally, Motor Yard and East Crossing. Each has four openings and two offset cover islands. Long north/south flanks and the central armored route remain. Existing gate, bunker, tower stairs and 60ft perimeter remain.

Actual Blue soldiers now start in South Rally and West Market. Red starts split between North Yard and Motor Yard. All six courtyard centers are exported as named spawnAreas for subsequent scenario authoring; no reinforcement UI or automatic reinforcement waves were added. Infected placements were checked through the 64-unit stress preset and moved off new walls. Population sizes are unchanged.

The wall-chain builder now emits the largest fitting span up to128u instead of dividing each courtyard wall into32u panels. This reduced this layout from333 placements/2434 solids to223 placements/1719 solids. Those counts do not establish frame-rate performance.

`skills/warworld-map-kit/SKILL.md` is the versioned map-making skill; an identical copy is installed at C:/Users/taskm/.codex/skills/warworld-map-kit/SKILL.md. It covers shared module recipes, sockets, clearances, connected courtyards, real spawns, scenario separation, navigation, source captures and native acceptance. The editor UI remains deferred.

The courtyard tests verify all actual squad and infected starts are clear and every named courtyard is reachable through actual navigation geometry. The source overview is artifacts/highwall-spacious/module-lineup.png. It is an architecture inspection, not player sight. This is an encounter-layout proposal implemented in the game; whether its pacing feels fun still requires a combat play session.

Validation: 14 focused tests and production build passed. Native Highwall run reached the actual tower deck and bunker floor through controlBot/Fighter.update, opened the live surveillance terminal with E, and saw a clear target900u away above the perimeter. No engine/page errors. Evidence: artifacts/highwall/courtyards-native/result.json. These checks do not replace a complete combat-pacing review.
