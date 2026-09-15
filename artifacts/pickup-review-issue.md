Ground pickup is not ready for gameplay assignment. Browser review on character-foundation.html?study=Ground%20pickup at commit a92dc64/261d2fb definitions showed:

- At 0.45 s contact, flexing hips/knees does not lower the visual body root to preserve foot support; the reach is near the thighs rather than a floor payload.
- At 1.20 s support/release, hands converge near the face instead of supporting a payload at chest/waist height.
- Technical rig tests establish joint motion only and did not catch these visual failures.

Required: add an explicit support/root-height authoring contract (visual body channel, never simulation movement), author hand targets against an actual payload, review all phases from front and both sides, verify feet and forearm volumes, and retain contact/release/control markers. Flying pickup requires separate visual review and must not inherit ground support correction. Keep both as candidates until reviewed; do not auto-assign to gameplay.
