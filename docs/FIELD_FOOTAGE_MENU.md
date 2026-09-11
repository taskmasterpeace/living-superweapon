# PowerWorld field footage

The PowerWorld selection screen now shows the field crew's actual captured JPEG sequences. Press **Tab** after combat to return to selection; the panel is beside the roster on desktop and below match setup on narrow screens.

## Viewer

- Latest available clip selected first; titled clip list and previous/next navigation.
- Play/pause, frame scrubber, ¼×/½×/1×/2× playback, optional current-clip looping.
- Click the picture for an expanded player. Escape or backdrop click closes it; keyboard focus stays inside while expanded.
- Space toggles playback; left/right seek one second when not editing a form control. Tab navigates the viewer rather than resuming combat.
- Save still downloads the displayed frame as PNG. This is not a video export.
- Empty and pending-encoding states are explicit. Captured audio is not implemented: the panel truthfully labels footage silent.

## Lifetime and performance boundaries

The selection-screen player borrows frame URLs, uses one image decoder and a 20Hz timer, and never renders another Three.js camera. The timer/decoder are released when the screen closes. Background tabs do not advance playback. Roster changes reparent the same player without resetting its selected clip or transport settings.

Opening the menu finalizes the current recording and allows asynchronous encodes to finish. At the next PowerWorld match, boot transfers the recorder's bounded reel to `_fieldClips`; the previous archive is revoked only when a nonempty replacement exists. The new live reel and one previous reel are available, not an unbounded history. The City opening/broadcast lifetime is unchanged. Reloading or closing the tab loses these session-only recordings.

## Verification

- `node --test tools/field-footage.test.mjs tools/news-capture.test.mjs tools/frontline-recorder-hud.test.mjs tools/news-arena-report.test.mjs`: 20 passing tests, including archive replacement and empty-match preservation.
- `node tools/field-footage-browser.mjs`: headed Chromium, native combat inputs and real crew frames; selection, pause/scrub/speed/loop, expansion, download, roster rebuild, 1600/1280/390px layouts and next-match handoff. No injected clips or gameplay-state overrides.
- `node tools/field-footage-ui-browser.mjs`: separately labeled UI fixtures verify multiple-clip browsing, modal click blocking, keyboard focus and revoked-clip removal. These fixtures are not combat/capture evidence.
- Screenshots and machine results: `artifacts/field-footage/`. The displayed screenshots show real native footage.

This pass does not increase recording resolution, add recording audio, persistent disk storage, or a video export format.
