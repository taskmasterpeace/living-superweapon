# THE HANDS — what you are holding, not what mode you are in

Robert, 2026-07-26: *"most games you hit 1 it's melee, you hit 2 it's pistol, you hit 3 it's your
main weapon... selecting someone as your 'stance' or something could work."* And, after a second
opinion argued against a stance setting: *"do you think we need a stance setting?"*

**No stance. Yes hands.** They are not the same feature and the difference decides the design.

---

## Why a stance toggle is wrong here, and the engine already says so

The counter-argument is right and its evidence is this codebase. Look at what the engine already
does instead of asking you to declare a mode:

- the **sniper posture** engages when you have actually stopped moving — stillness IS the input;
- **guard** is a held button, not a mode you leave on;
- **meleeCharge** grows while you hold, and reads on the state ring;
- **`_carry`** changes your entire moveset — `if (f._carry) return 'throw'` — and you never told it;
- **flight** is a real toggle, and it is the exception that proves the rule: it is readable from
  across the map because your feet leave the ground.

The test that settles it: **can the player see which mode they are in, and does the wrong one cost
them?** On a fixed isometric camera, posture fails the first half — which is exactly how a stance
toggle becomes a thing people forget they left on.

## Why "what is in your hands" passes the same test

A weapon slot is not a posture. It is an **object**, and an object is visible.

- You can see the rifle. `buildWeapon` already mounts real meshes on the fists and the poses and the
  ragdoll carry them.
- Being on the wrong one **costs** you: a sidearm at clinch range is a bad trade, and a primary in
  your hands is why you cannot grab.
- The engine already models exactly this for props. Picking up a car is a hands change, and nobody
  ever asked for a "carrying stance".

---

## THE SLOTS

Derived from the armory loadout (`threshold_loadout_v1`), never authored per fighter.

| slot | is | notes |
|---|---|---|
| **1 · FISTS** | always present | the melee trifecta. Every fighter has this |
| **2 · SIDEARM** | loadout `rmb` | one-handed — ⚠ the only slot that may keep a grab available |
| **3 · PRIMARY** | loadout `lmb` | two-handed: no grab, no carry while held |
| **4 · GEAR** | loadout `gear[]` | cycles within the slot |

⚠ **MOST OF THE ROSTER HAS NO GUNS, AND THAT IS THE POINT.** SOL has fists and nothing else, so the
selector shows one thing and effectively disappears — the "most fighters never see this control"
property falls out of the loadout instead of needing a gate. SARGE, the police and anyone who has
been to the armory get the full row.

⚠ **THE HANDS NEVER TAKE A POWER SLOT.** LMB / RMB / Q / E / H / R stay powers, always. You are not
swapping your kit, you are swapping what your fists are wrapped around — which is why this can be a
number key rather than a mode.

⚠ **THE ARMORY ALREADY SAYS "SAVED — NOT YET ISSUED".** This is the missing front end for it: the
loadout stops being a saved preference and becomes the thing in your hands.

---

## THE MAPPING — four devices, one idea

| | select | cycle | quick-swap |
|---|---|---|---|
| **PC** | `1 2 3 4` | mouse wheel (schemes where the wheel is not picking abilities) | `Q` — last-used, the shooter convention |
| **Steam Deck / PS pad** | D-pad ← → cycles | — | `L1` tap = last-used |
| **Mobile / tablet** | a vertical chip strip above the fire thumb | tap a chip | long-press the fire button |
| **Xbox pad** | D-pad ← → | — | `LB` tap |

⚠ **THE D-PAD IS ALREADY TAKEN** (`core/gamepad.js` maps it to Q / E / F and hero swap). Left/right
must move to hands and those abilities move to the face buttons, or the control fights itself. This
is a real conflict, not a detail — write it down before building.

⚠ **CLASSIC USES 1–0 FOR HERO SWAP.** Three of the four schemes leave the digits free, so hands go
on digits everywhere except CLASSIC, where hero swap keeps them and hands live on the wheel alone.
`KEYMAPS` already carries `digitsSwap`, so the scheme decides — no new branch.

⚠ **PHONE MODE HIDES THE SLOT ROW ENTIRELY** (`PHONE_CSS`). If the hands row is the one thing a
phone shows, it must be the *only* thing added back, thumb-reachable, above the fire button.

---

## Switching costs something, or it is free and therefore meaningless

- a swap takes **~0.35s** with a visible draw animation;
- ⚠ **you cannot swap mid-combo, mid-charge, or while carrying** — the same `canAct` gate the melee
  trifecta already uses, so this needs no new rule;
- swapping **drops a raised guard**, like every other committed action.

---

## The one thing that IS a stance, and it is a different feature

**Style switching for fighters trained in more than one martial art.** That is not a posture toggle —
it is a different moveset with a different reach, and `data/martial.js` already holds eight styles.
Boxing wants jab distance; Wrestling wants the clinch. The switch is a real spatial decision, it is
readable because the guard posture changes, and it gates itself: only a fighter with two trained arts
ever sees it, which is something the Kinesiology tree can sell.

**Squad doctrine** — "hold this line", "press", "protect the scientist" — is not a stance either. It
is an order, it belongs to the mission UI, and `ai.style` / `ai.aggro` are already the right place to
hang it.

---

## Build order

1. **The hands selector** — reads the armory loadout, digits + wheel on PC. One row in the HUD.
2. **The pad and phone mappings**, including resolving the D-pad conflict.
3. **Style switch**, gated to multi-art fighters, after the strike-grammar slice lands.
4. **Squad doctrine**, with the protection mission.
