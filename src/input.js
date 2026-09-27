// Keyboard input.
//
// Input.down(code)    -> is the key held right now?
// Input.pressed(code) -> was the key pressed since the last frame?

const CONTROL_SCHEMES = {
  wasd:   { up: 'KeyW',    down: 'KeyS',      left: 'KeyA',      right: 'KeyD' },
  arrows: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
};

const Input = {
  held: new Set(),
  justPressed: new Set(),

  init() {
    window.addEventListener('keydown', (e) => {
      // Stop arrow keys / space from scrolling the page.
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.justPressed.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    // If the window loses focus, let go of every key so karts don't drive off.
    window.addEventListener('blur', () => this.held.clear());
  },

  down(code) {
    return this.held.has(code);
  },

  pressed(code) {
    return this.justPressed.has(code);
  },

  endFrame() {
    this.justPressed.clear();
  },

  // Turn one or more control schemes into kart controls:
  // throttle 0..1, brake 0..1, steer -1 (left) .. 1 (right).
  readControls(schemeNames) {
    const c = { throttle: 0, brake: 0, steer: 0 };
    for (const name of schemeNames) {
      const k = CONTROL_SCHEMES[name];
      if (this.down(k.up)) c.throttle = 1;
      if (this.down(k.down)) c.brake = 1;
      if (this.down(k.left)) c.steer -= 1;
      if (this.down(k.right)) c.steer += 1;
    }
    c.steer = clamp(c.steer, -1, 1);
    return c;
  },
};
