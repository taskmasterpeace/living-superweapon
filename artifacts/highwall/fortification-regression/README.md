# Highwall fortification runtime regression evidence

This folder records six scoped checks in the actual browser runtime. It is not overall art, performance, vehicle-crew, or combat-AI acceptance.

## Method and results

- **Corridor / multiple corners:** native keyboard movement followed the current navigation route from Blue spawn `(-247,0,240)` to Red area. Final position `(-167.31,0,-1.02)`. `corridor-corners.png`.
- **Gate:** native walking first stopped against the closed barrier. Native E then opened it from contact after the shared gate-radius correction; no step-back workaround. Navigation changed from blocked revision 2 to clear revision 34. Native passage reached `(-169,0,64.37)`. `gate-open-passed.png`.
- **Rifle / tall wall:** native LMB consumed one existing rifle round and native projectile contact reported `spine-0-0-1/part-4`. `projectile-wall.png`.
- **Rifle / low cover:** a second native firing action consumed a round and reported contact with `cover-2/part-1`. `projectile-low-cover.png`.
- **Flight / sight:** an actor across the real cross-wall stayed hidden through native Alt orbit input. A separately initialized airborne Sol crossed the tall wall using native W, from x=-310 to x=-266.38 at y=68.72. `orbit-hidden.png`, `flyer-crossed-wall.png`.
- **Enemy pursuit / memory, latest rerun:** the native zombie acquired the player, lost sight behind corners, and reacquired them. Of 726 intent samples, 602 recorded sight and 124 retained belief without sight. Initial corner loss occurred at game time 8.9845, reacquisition at 10.1315; after the next corner, stable reacquisition began at 11.2952 and continued through 15.9968. Final zombie position was `(-216.35,0,152.20)`, player `(-219.94,0,147.02)`. No hidden target position was substituted. The final cached route says blocked because it describes an earlier briefly airborne target; current visible-target direct movement bypasses that cache. `ai-pursuit.png`. This is one successful bounded scenario, not a guarantee for every layout or search.
- **Tank lane:** native J boarded the preset tank. W/A/D/Space followed the actual clearance route around low cover in the armored lane, ending `(65.57,0,-199.12)` from `(66,0,210)`. This is a test driver issuing keys, not an implemented AI crew. `tank-lane-crossing.png`.

Initial actor positioning and participant isolation are described per case in `result.json`. Positions were not teleported during the actions. Projectile wrappers only recorded contacts before invoking the unmodified native resolver. Enemy intent wrappers only recorded the real AI return values.

## Runs and timing

The first run used Playwright's headless shell, confirmed by OS process arguments `--use-angle=swiftshader-webgl` and `--disable-gpu-compositing`. The projectile and flyer/occlusion checks passed in that run. Movement wall-clock timeouts from that run are historical failures, not collision acceptance. Failure images remain for traceability.

The corridor, gate, pursuit and tank checks were rerun with full Chrome on the **NVIDIA GeForce RTX 4090 / ANGLE D3D11**. These completed through native controls. The latest six case checks have `pass:true`; prior attempt snapshots are retained in `previousRun`. No browser page exceptions were reported. Engine error-state checks were added for later hardware cases; the initial two software cases do not have separate engine-error snapshots.

The latest pursuit-only rerun measured **36.2 FPS**, with 4.318 game seconds over 5.028 wall seconds on the RTX 4090. Hardware READY samples across runs varied roughly **25–51 FPS**, with changing warm-up and adaptive rendering state. This is **not a performance acceptance result**. The optional observer-depth A/B measured 68.3 versus 79.4 FPS, but adaptive pixel ratio changed from 0.86 to 1.0, so it is **not a controlled causal comparison**. Exact wall time, game time, renderer and drawing sizes are in the JSON.

## Reproduce

Run from the worktree with Vite on port 5193:

```powershell
$env:HEADLESS='0'
Remove-Item Env:CASES -ErrorAction SilentlyContinue
node tools/highwall-fortification-regression-browser.mjs
```

`CASES` accepts comma-separated case IDs for targeted retries; existing case results are retained with previous-attempt metadata. The runner exits nonzero for a failed case, page errors, or captured engine errors. Do not run alongside another heavy browser capture when comparing timing.

## Remaining scope

- Visual style acceptance requires the separate module-lineup and composed-architecture captures.
- Interior/elevated navigation browser proof belongs to the associated tower/bunker witnesses and native movement tests.
- The earlier run exposed an obstructed cold-search goal. The shared navigation seam now projects exploratory requests within a bounded 32u same-floor neighborhood, with at most eight full candidate routes and a revision-invalidated cache. It preserves the original belief/request and does not redirect explicit orders or visible targets. Exact recorded coordinates are covered by a native movement regression in `tools/highwall-navigation-search.test.mjs`; that test walks from the stalled position to a reachable projected area. Generic grounded patrol sampling now honors `world.groundNavigation.bounds` instead of the larger flight arena. Unreachable/disconnected floors or neighborhoods without a legal nearby candidate still explicitly return blocked; no route is fabricated.
- No population/performance guarantee, aircraft flight acceptance, mounted combat, or AI vehicle piloting is claimed here.
