// Living Superweapon — input manager
export class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();
    this.mouse = { x: 0, y: 0, clientX: 0, clientY: 0, left: false, right: false, leftEdge: false, rightEdge: false, leftUp: false, rightUp: false, b3: false, b4: false };
    this.wheel = 0;
    this.anyGesture = false;
  }

  bind(canvas) {
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      this.anyGesture = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this.justReleased.add(e.code); });

    const setMouse = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.clientX = e.clientX - r.left;
      this.mouse.clientY = e.clientY - r.top;
      this.mouse.x = this.mouse.clientX * (canvas.width / r.width);
      this.mouse.y = this.mouse.clientY * (canvas.height / r.height);
    };
    canvas.addEventListener('mousemove', setMouse);
    canvas.addEventListener('mousedown', (e) => {
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
    this.wheel = 0;
  }
}
