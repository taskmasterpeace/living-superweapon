// WAR WORLD: ASCENDANTS — input manager
export class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();
    this.mouse = { x: 0, y: 0, clientX: 0, clientY: 0, left: false, right: false, leftEdge: false, rightEdge: false, leftUp: false, rightUp: false, b3: false, b4: false, dx: 0, dy: 0, locked: false };
    this.wheel = 0;
    this.anyGesture = false;
    // POINTER-LOCK MOUSE-LOOK (aaa-01 §2.3) — new to the project. GATED so the city is byte-unchanged:
    // nothing requests the lock unless the powerworld chase branch sets this true (a RIDER, game.js).
    // While false, absolute-coord aim behaves exactly as it always has.
    this.pointerLock = false;
  }

  bind(canvas) {
    addEventListener('keydown', (e) => {
      // Stop browser shortcuts from stealing game keys online (Ctrl+S save-page, Ctrl+D bookmark,
      // Ctrl+G find…). Ctrl+W is browser-reserved and CANNOT be blocked — which is why descend
      // is advertised as Z, not Ctrl. (Before the repeat-gate so held combos stay suppressed.)
      if (e.ctrlKey && ['KeyS', 'KeyD', 'KeyA', 'KeyF', 'KeyG', 'KeyH', 'KeyE', 'KeyQ'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      this.anyGesture = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this.justReleased.add(e.code); });

    const setMouse = (e) => {
      const r = canvas.getBoundingClientRect();
      const nx = e.clientX - r.left, ny = e.clientY - r.top;
      // THE LOOK DELTA (Robert 2026-07-29: "point the cursor and it just shoots straight"). PowerWorld
      // is JK ground / BFP air — mouse-look, the mouse TURNS THE VIEW and you shoot down the centre.
      // ⚠ THAT DEPENDED ENTIRELY ON POINTER-LOCK, which is BLOCKED in the CC preview pane (an iframe)
      // and needs a click gesture even in a real tab — so when it didn't engage, the mouse produced NO
      // delta, the view never turned, and every shot went straight forever. So the delta now has a
      // FALLBACK: when the chase view asked for a lock (`pointerLock`) but capture is NOT active, drive
      // the look from the raw change in cursor position. Captured → movementX/Y (smooth, infinite);
      // uncaptured → cursor delta (works in the pane, just runs out of room at the window edge). The
      // city game never sets `pointerLock`, so its free-cursor aim is untouched.
      if (this.mouse.locked) { this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0; }
      else if (this.pointerLock && this._lastCX != null) { this.mouse.dx += nx - this._lastCX; this.mouse.dy += ny - this._lastCY; }
      this._lastCX = nx; this._lastCY = ny;
      this.mouse.clientX = nx;
      this.mouse.clientY = ny;
      this.mouse.x = nx * (canvas.width / r.width);
      this.mouse.y = ny * (canvas.height / r.height);
    };
    canvas.addEventListener('mousemove', setMouse);
    document.addEventListener('pointerlockchange', () => { this.mouse.locked = document.pointerLockElement === canvas; });
    canvas.addEventListener('mousedown', (e) => {
      // arm the lock only when the chase view asked for it — a click in the city never grabs the pointer
      if (this.pointerLock && document.pointerLockElement !== canvas) { try { canvas.requestPointerLock(); } catch (_) {} }
      setMouse(e); this.anyGesture = true;
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftEdge = true; }
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightEdge = true; }
      if (e.button === 3) { this.mouse.b3 = true; e.preventDefault(); }        // side buttons → guard
      if (e.button === 4) { this.mouse.b4 = true; e.preventDefault(); }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) { this.mouse.left = false; this.mouse.leftUp = true; }
      if (e.button === 2) { this.mouse.right = false; this.mouse.rightUp = true; }
      if (e.button === 3) this.mouse.b3 = false;
      if (e.button === 4) this.mouse.b4 = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });
  }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.justPressed.has(code); }
  released(code) { return this.justReleased.has(code); }

  endFrame() {
    this.justPressed.clear();
    this.justReleased.clear();
    this.mouse.leftEdge = false;
    this.mouse.rightEdge = false;
    this.mouse.leftUp = false;
    this.mouse.rightUp = false;
    this.mouse.dx = 0;                 // the look delta is per-frame; consumed by world.mouseLook
    this.mouse.dy = 0;
    this.wheel = 0;
    // ungated (left the chase view) but still captured → release, so the city gets its cursor back
    if (!this.pointerLock && this.mouse.locked && typeof document !== 'undefined' && document.exitPointerLock) document.exitPointerLock();
  }
}
