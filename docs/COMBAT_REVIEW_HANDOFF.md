# Combat candidate: GitHub and Mac handoff

Review branch: `codex/combat-release-review`, repository `taskmasterpeace/powerworld`. The target branch is `master`. At preparation, the candidate was103 commits ahead and0 behind; its diff includes earlier unpublished game work plus audio, driving and research-lab prerequisite merges. This is a broad integration review, not a small combat-only patch.

## Run on a Mac

Install Node.js and Git, then:

```sh
git clone --branch codex/combat-release-review https://github.com/taskmasterpeace/powerworld.git
cd powerworld
npm ci
npm run dev -- --host 0.0.0.0 --port 5184
```

Open `http://localhost:5184/powerworld.html` on the Mac. For an iPhone on the same local network, use the Mac's local network address and port5184, followed by `/powerworld.html`; use landscape. The development server must remain running. Physical iPhone/Safari performance and controls still require validation under #5. This is a local test route, not a production deployment.

## Transfer the campaign separately

In the old browser, open **Campaign records**, choose **Export save**, and retain `powerworld-campaign.json`. On the new browser, open **Campaign records**, choose **Import save**, select that file and confirm replacement. Export any existing destination campaign first if it needs to be retained. Git transfers code and tracked assets; it does not transfer browser storage, settings or recorded Newsroom footage. Campaign export is not a backup of every browser preference or clip.

## Footage and acceptance

Latest combat recordings remain in the Windows primary checkout under `D:/lsw/artifacts/marketing/combat-pass-2026-09-12/`; copy that directory separately for marketing work. Keep result/provenance files alongside the video and separate audio. Some older committed development images/videos also exist in the branch history. Latest native clips have not been bulk-added to Git.

Read `COMBAT_REVIEW_CHANGELOG.md` and `reports/CAMERA_FLIGHT_CANDIDATE_REVIEW.md`, `reports/LIVE_COMBO_REVIEW.md`, `reports/FINISHER_SPACING_REVIEW.md`. #14/#15 recorded audio has not been auditioned. #26 tracks lost scout steering/wheel fixes during integration. Do not describe this draft as release-complete or automatically close #14–16.
