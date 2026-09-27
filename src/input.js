// Keyboard, mouse and trackpad input.
//
// Input.down(code)    -> is the key held right now?
// Input.pressed(code) -> was the key pressed since the last frame?
// Input.mouse         -> where the pointer is (in game pixels) and whether it's pressed

const CONTROL_SCHEMES = {
  wasd:   { up: 'KeyW',    down: 'KeyS',      left: 'KeyA',      right: 'KeyD' },
  arrows: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
};

// Two ways to drive:
//   trackpad: slide left/right to steer, the kart accelerates by itself,
//             press and hold the trackpad (or Space) to brake.
//   keyboard: arrow keys or W A S D.
const CONTROL_MODES = {
  trackpad: 'Trackpad',
  keyboard: 'Keyboard',
};

// How far (in game pixels) from the middle of the screen you move the pointer
// to turn the wheel all the way.
const TRACKPAD_FULL_LOCK = 380;
const TRACKPAD_DEAD_ZONE = 0.05;

const Input = {
  held: new Set(),
  justPressed: new Set(),
  mouse: { x: -1, y: -1, clicked: false, moved: false, down: false },

  init(canvas) {
    // Pointer position in game pixels (the canvas is scaled to fit the window).
    const toGame = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (GAME_WIDTH / r.width);
      this.mouse.y = (e.clientY - r.top) * (GAME_HEIGHT / r.height);
    };
    window.addEventListener('mousemove', (e) => { toGame(e); this.mouse.moved = true; });
    canvas.addEventListener('mousedown', (e) => {
      toGame(e);
      this.mouse.clicked = true;
      this.mouse.down = true;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });

    window.addEventListener('keydown', (e) => {
      // Stop arrow keys / space from scrolling the page.
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.justPressed.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    // If the window loses focus, let go of everything so the kart doesn't drive off.
    window.addEventListener('blur', () => {
      this.held.clear();
      this.mouse.down = false;
    });
  },

  down(code) {
    return this.held.has(code);
  },

  pressed(code) {
    return this.justPressed.has(code);
  },

  // Is the pointer inside this rectangle?
  mouseIn(r) {
    const m = this.mouse;
    return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
  },

  endFrame() {
    this.justPressed.clear();
    this.mouse.clicked = false;
    this.mouse.moved = false;
  },

  // Keyboard steering: -1 (left) .. 1 (right), or 0 if no steering key is held.
  keyboardSteer() {
    let steer = 0;
    for (const k of Object.values(CONTROL_SCHEMES)) {
      if (this.down(k.left)) steer -= 1;
      if (this.down(k.right)) steer += 1;
    }
    return clamp(steer, -1, 1);
  },

  // Trackpad steering: how far the pointer is from the middle of the screen.
  trackpadSteer() {
    if (this.mouse.x < 0 && this.mouse.y < 0) return 0; // pointer not seen yet
    let s = clamp((this.mouse.x - GAME_WIDTH / 2) / TRACKPAD_FULL_LOCK, -1, 1);
    if (Math.abs(s) < TRACKPAD_DEAD_ZONE) return 0;
    return Math.sign(s) * (Math.abs(s) - TRACKPAD_DEAD_ZONE) / (1 - TRACKPAD_DEAD_ZONE);
  },

  // Kart controls: throttle 0..1, brake 0..1, steer -1 (left) .. 1 (right).
  // `ignorePointerBrake` is true while the pointer is pressed on a button.
  readControls(mode, ignorePointerBrake) {
    let up = false, down = false;
    for (const k of Object.values(CONTROL_SCHEMES)) {
      if (this.down(k.up)) up = true;
      if (this.down(k.down)) down = true;
    }
    const keySteer = this.keyboardSteer();

    if (mode === 'trackpad') {
      const brake = down || this.down('Space') || (this.mouse.down && !ignorePointerBrake);
      return {
        throttle: brake ? 0 : 1,
        brake: brake ? 1 : 0,
        steer: keySteer !== 0 ? keySteer : this.trackpadSteer(),
      };
    }
    return { throttle: up ? 1 : 0, brake: down || this.down('Space') ? 1 : 0, steer: keySteer };
  },
};
