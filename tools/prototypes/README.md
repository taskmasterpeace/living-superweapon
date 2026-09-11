# Rejected coupled-cloth experiment

These files are **not imported by the game or Studio**. They preserve a tested
mathematical experiment so its useful counterexamples are not lost.

`ragdoll-cape-coupled.mjs` retains weighted triangle contacts and uses the small
nine-coordinate projector in `cloth-contact-solver.mjs`. It includes jointly
validated/atomic cover corrections and coupled velocity response. Run its
isolated checks with `npm run test:cloth-prototype`.

Do not enable it from those isolated results. Its production integration failed
12 of 58 checks before withdrawal, including actual body/cover intersections and
settling. At 30 Hz the fixed-launch CPU test measured 13.07 ms active mean and
70.70 ms p95 for cloth alone. It also looks crumpled/self-overlapping in motion.
See `docs/CLOTH_COMPATIBILITY_PASS.md` and the explicitly rejected footage under
`artifacts/cloth-landing/coupled-contact-wip/`.

The runtime was restored from the independently frozen compatible-contact
snapshot, without touching unrelated work. The active runtime still has four
known cloth failures; restoring it is not general clipping acceptance.
