# Missing paired animation sources — 14 September 2026

Current direction: **reuse and adapt our existing motion first**, per the user's subsequent review. See `REUSE_FIRST_FLIGHT_MELEE_PLAN_2026-09-14.md`. These external sources remain optional references if that work leaves a concrete gap. Silent Grab & Hostage explicitly lists rear-control and victim-struggle files. No purchase or paid download was performed. This is listing verification, not frame-by-frame visual acceptance.

## 1. Raise Creation — Silent Grab & Hostage Animation Pack

[Official listing](https://www.fab.com/listings/396d0492-06c0-459c-9cc0-8228dea2a7a2) · [Creator-linked preview](https://www.youtube.com/watch?v=bu6TTvpgBDM)

Listing confirms FBX and synchronized reaction files, including `AS_S_Back_grab`, `AS_S_Back_Struggle`, `AS_S_Back_Escapes`, `AS_S_Back_idle`, plus their `_React` partners. It also lists paired pick, hold, walk, drop and throw actions and gun-shield reactions. This is the strongest documented match for a held character actively resisting.

**Unknown:** no explicitly named sustained neck-choke loop is listed. A Choker tag and back-grab family do not prove the exact one-handed neck pose, hand-prying contact or nonlethal choke-out required. Verify those in the preview; the seller's alignment claim does not establish retargeted contact on our differently sized bodies. Listing says 100+ animations, not 100+ complete pairs.

## 2. Raise Creation — Grab & Throw Takedown Animation Pack

[Official listing](https://www.fab.com/listings/23c75ad8-7c73-4e5d-bb62-18d0e01e5585) · [Creator-linked preview](https://www.youtube.com/watch?v=4yNiYIvEw5A)

Listing confirms FBX and victim reactions for takedowns such as `AS_GT_BackLift_Takedown`, `AS_GT_BackThrow_Takedown`, `AS_GT_RearArchDrop_Takedown`, `AS_GT_ClinchKnee_Takedown`, and several slams. Its 46+ animation claim includes reaction tracks; do not count it as 46 complete pairs.

Best for extending established capture into throws and close attacks. **Unknown:** sustained controllable hold, separate interrupted release, choke struggle, and seamless free-flight adaptation. These are authored takedown sequences, not an implemented grab controller. Preview URL is publisher-provided; fetch was throttled, so motion quality was not assessed here.

## 3. RamsterZ — Wrestler Finishers Volume 2

[Official direct FBX product and gallery](https://www.ramsterzanimations.com/store-buy/p/wrestler-finishers-v2-fbx-only) · [Official Fab listing with Preview Video link](https://www.fab.com/listings/d230f092-ec87-4b87-a051-1015e394bd86)

Direct store explicitly offers raw FBX for **$39.99** at review time. It states 150 animations including a 60-animation paired category, plus pins and floor states. This does not confirm 60 full attacker/victim pairs. Root-motion-ready source and UE mannequin/Unity humanoid targeting are stated; gameplay scripts are excluded.

Best as a later wrestling expansion. **Unknown:** exact choke-victim clip names, loopable holds and direct-store license grant were not exposed in the accessible product text. Fab lists Unreal format rather than the direct store's raw FBX delivery, so do not assume the two purchases supply identical files. Use the product's linked media before deciding.

## Prices, licensing and our Three.js pipeline

Raise's [official seller page](https://www.fab.com/sellers/Raise%20Creation?lang=en) showed different currency-localized prices across search/open responses: Silent Grab from $18.99 versus $29.20, Grab & Throw from $22.99 versus $35.35. Currency was not unambiguously identified; these are not quoted as USD checkout prices. Verify displayed currency and license tier before purchase.

For a purchase actually offered under the [Fab Standard License](https://www.fab.com/eula), its official summary permits modification, incorporation into commercial projects, compatible tools beyond Unreal, and project collaboration. It prohibits standalone redistribution. Reference-Only does not provide source-format rights. The selected product license still needs checking; this audit does not substitute one store's terms for another's.

Our proposed integration: FBX → offline retarget to the existing modular skeleton → export GLB clips → assign paired IDs and shared contact/release times. Preserve both partners' relative root transforms during conversion; game physics owns travel after release. This is an engineering plan, not advertised plug-and-play Three.js support. Import one rear grab/struggle pair first, verify both original-size and mixed-size contact, then extend. Keep paid source files out of public standalone asset distributions.

The already downloaded Quaternius kneeling/table pickups remain the first solo-object source choices. Free solo martial-arts packs are not evidence of paired victim coverage. None of the three listings proves all our neck-hold requirements without preview and rig review.

## Why a pair and a shared timeline matter

EA's [UFC animation workflow presentation](https://media.gdcvault.com/gdc2015/presentations/dowsett_lee_UFC.pdf), pages 8–14, describes two-person sequences, alternate exits and a relative-IK interaction controller. This supports treating a grab as coordinated entry, hold, release and interruption, rather than playing unrelated solo attacks together. We are borrowing that principle, not implementing UFC's large submission system.

Epic's [motion-warping documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-warping-in-unreal-engine) describes adapting root motion to a target during designated windows. Power World's existing Three.js simulation remains authoritative; any similar contact correction must stay bounded to the held phase, and stop at physical release.

Our minimum acceptance unit is one attacker/victim pair with entry, loopable resistance, directed release and interrupt-to-fall. Both actors use the same clock and contact/release markers. Review ground and hovering contact on equal and unequal body sizes, then moving flight. Reuse existing falls and get-ups after release; those are separate motion families. Solo pickup and overhand-throw clips can supply anticipation or follow-through, but cannot establish a neck grip or a matching victim struggle by themselves.
