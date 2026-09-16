# THE GOLDEN PATH — integrated-build manual test ledger

The end-to-end slice the `asset-fleet` integration is assembled to prove, on branch
`integration/asset-fleet-20260915`. Each beat records what drives it and its live status.

**Launch (manual test):**
```
cd D:/lsw/.worktrees/asset-fleet-integration && npm run dev
```
Open **http://localhost:5180/powerworld.html** (use `localhost`, not `127.0.0.1` — vite binds IPv6
localhost only). Entry for the vehicle/AA beats: **Enter → "Enter with squad" → `Shift+V`**.

| # | Beat | Status | Drives it |
|---|------|--------|-----------|
| 1 | Soldier with a real rifle | ✅ playable | Select **MERC** (Blaster Rifle LMB) or **SARGE** (carbine); soldier-family units carry m16/p9 |
| 2 | Authored death / reaction handoff | ✅ **WIRED + verified (2026-09-15)** | Registry-driven death-reaction resolver — see below. `LSW.deathSuite()` 18/18 |
| 3 | Enter / operate tank | ✅ (Gate A) | `Shift+V` → board (**J**); W/S drive, A/D steer, Space brake, **L** next vehicle |
| 4 | Turret / reticle / fire / reload | ✅ (Gate A) | Mouse aims turret (weapon-truth reticle), **LMB** fire, **R** reload, **Alt+mouse** free-look |
| 5 | Exit safely | ✅ (Gate A) | **J** — driver visible again, control restored |
| 6 | AA detects flyer → guided missile | ✅ (Gate B) | `Shift+V` brings AA online; a hostile flyer over the base is tracked, a real guided missile launches |

## Beat #2 — the death & reaction handoff (wired 2026-09-15)
Runtime resolver on the merged Mac Asset Lab registry. Flow: **lethal damage → compatible context →
accepted authored clip → one-shot on the modular actor → hold physics → clip-complete → rigid
authored-rest corpse (holds the settled pose, gravity-settles, sleeps — cannot spin).** Contexts:
grounded front → `Death01`, grounded rear → `Death02`, airborne fall→impact chain (where compatible),
nonlethal heavy knockdown → accepted `getup.from-supine` and return control. Presentation only — the
KO/loot/corpse events fire once, unchanged. See `docs/COMBAT_MANUAL.md` §50.

**Verify:** `await window.LSW.deathSuite()` — **18/18, 0 console errors** (front→Death01, rear→Death02,
authored death before ragdoll, rigid handoff, Δ0u spin over 1s, settles to sleep, corpse persists,
handleKO exactly once, a corpse cannot act, knockdown returns control). Evidence:
`artifacts/death-reaction/result.json`.

**To watch it by hand:** free roam or a duel with a HIGHWALL soldier (soldier-family, `faceted-v1` +
`equipment:'soldier'`), gun it down from the front then from behind — the fall reads backward vs
forward, then the body settles instead of flopping into an instant spinning ragdoll.
