# Correspondent sightline repair

The first native replay audit passed its mechanism checks but failed visual review:
the reporter's back filled the impact insert. It was not enough to have real JPEG
frames and valid event tags; the fight had to be visible in those frames.

Changes in `src/engine/newscrew.js`:

- Stand-up marks sit outside the principals' projected horizontal body envelopes,
  with space for the reporter's own body. The reporter is still physically present
  and the independent shoulder lens still frames the reporter for stand-ups.
- A cold arrival seeds focus/spread from the actual combatants before choosing the
  first vantage. It no longer approaches an unrelated world-origin focus.
- Initial reporter placement follows the opening stand-up decision. Warm movement,
  movement speeds, terrain/cover constraints, capture timing and player camera are
  unchanged. No render-only reporter hiding or gameplay teleport was added.

TDD: 7 of 9 settled native 30/60/120-Hz sightline cases failed before side staging.
Independent review then found a cold reset case omitted by the first fixture.
All three cold cases reproduced obstruction at impact frame zero before the
initialization repair. Their final checks cover every frame of the 0.3s insert.
The warm fixture's missing `spreadSm` was also initialized rather than tolerating NaN.

Final focused command:

```text
node --test tools/newscrew.test.mjs tools/broadcast-frames.test.mjs tools/broadcast-profile.test.mjs tools/broadcast-report.test.mjs tools/news-arena-report.test.mjs
51 passed, 0 failed.
```

Independent scoped review approved after reproducing the cold-init fault and
independently rerunning the three cold tests. These tests check actual reporter
Box3 ray clearance; they are not proof of every projected silhouette or city layout.

Browser evidence:

- `artifacts/correspondent/`: full native event/KO/sign-off/replay pass after side
  staging, before the final cold-init refinement. 128 real retained JPEG frames,
  every URL fetched successfully, three clips, real ragdoll on scripted forced KO,
  no page/console errors. The 4000-damage test KO is disclosed, not balance evidence.
- `artifacts/correspondent-framing/`: final cold-init version. Native Game/NewsCrew
  updates, 12 impact frames, both principal center rays clear throughout, reporter
  remains visible, zero errors. Main agent viewed opening and impact PNGs: reporter
  is framed for the opening; contact subject is unobstructed in the center afterward,
  reporter now at the edge. These are framing shots of static subjects and a
  scripted highlight, not actual beam-damage or live input footage.

The final short framing harness uses the recorder's ordinary frame-pressure gate
to avoid scheduled encoding and explicitly draws native POV frames for inspection.
It does not establish capture throughput. Generic building/boundary occlusion and
subjects running through the crew are outside this bounded repair.
