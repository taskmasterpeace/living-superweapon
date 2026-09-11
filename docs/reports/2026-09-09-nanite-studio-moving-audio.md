# Native Studio nanite moving/audio checkpoint

## Outcome

The missing Studio icon is fixed by reusing the root page's existing self-contained gold SVG in `studio.html`. The previously failing unfiltered resource trace now passes at the actual5180 server. This closes that specific404 cause, not the separate unexplained Chromium crashes or cold rendering stalls.

Evidence:

- RED: `artifacts/nanite-resource-trace/`, two real console/CDP404s naming `/favicon.ico`.
- Served-root check: both root and Studio HTTP200; their inline icon URLs match exactly.
- GREEN: `artifacts/nanite-resource-trace-fixed/`, native Studio RAF past7s, two paid cannon launches, one local shield contact, zero errors/failed sample buffers, no resource interception, zero retained audio handles on pause.
- Moving/audio: `artifacts/nanite-studio-reel-verified/`, native8s rehearsal and actual local mixer captured; zero console/resource errors, no interception, two launches, one incoming contact. Local cell absorbed12; residual body damage7.56; all9 shield cells repaired by the end; final cannon muzzle error0.

The parent-owned harness is `tools/nanite-studio-reel.mjs`. It imports a genuine FERRO custom recipe through actual Studio dialogs, enables Sound through its UI, and configures native preview APIs. Trace-only uses unchanged Studio RAF. The recorder retires only the outer preview RAF and calls its public `advancePlayback` with measured elapsed wall time, retaining native mixer maintenance; it does not replace pose, contact, payment or projectile simulation. This remains a configured rehearsal, not free player gameplay or an AI battle.

Capture used installed Chromium151/ANGLE RTX4090 D3D11, native canvas1089×713, pixel ratio1. Simulation8s, wall8.3236s,1738 outer frames, audio peak.3763, zero retained sustained handles. Reported dropped wall time is0, **but loop reset submitted a284.9ms frame**; warmup reset took308ms. Do not relabel this hitch-free. Cold preparation and broader stability remain open.

`native-nanite-studio.mp4` contains H2641090×714 and AAC48kHz, duration8.022284s (ffprobe). First transcode correctly failed on odd native dimensions; final encode pads one pixel on the right/bottom rather than cropping the scene. Original WebM retained.

## Visual acceptance limit

Parent inspected the contact-time frame at2.6s. Full-encounter orbit framing is too distant to establish detailed cell breakup, hand pose or reform quality from this clip. It is functional moving/audio evidence only, not an awe-inspiring presentation reel or final nanite visual acceptance. Prior closer source/contact captures remain separately scoped. No character/cape/map/beam-physics change was made in this checkpoint.
