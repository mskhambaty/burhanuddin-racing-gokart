// A go-kart: how it moves and how it looks.
//
// Distances are in pixels and time in seconds. On screen, 1 pixel is roughly
// 10 cm, so 250 pixels/second is about 90 km/h — a quick rental-style kart.
//
// Later, garage upgrades will change these stats.
const KART_BASE_STATS = {
  topSpeed: 250,   // pixels per second on asphalt
  accel: 230,      // how hard the engine pushes
  brake: 420,      // how hard the brakes slow you down
  grip: 9,         // how quickly sideways sliding stops (higher = more grip)
  steer: 2.9,      // how fast the kart turns (radians per second)
};

const SAND = {
  topSpeed: 0.45,  // top speed on sand is 45% of normal
  drag: 1.6,       // extra slowing down on sand
  grip: 0.5,       // sand has half the grip
};

const KART_LENGTH = 24;
const KART_WIDTH = 15;
const KART_RADIUS = 10; // used for bumping into walls and other karts

class Kart {
  constructor(opts) {
    this.name = opts.name;
    this.shortName = opts.shortName || opts.name;
    this.body = opts.body;       // main colour
    this.trim = opts.trim;       // stripe colour
    this.stripes = opts.stripes; // optional: several thin stripes instead of one
    this.helmet = opts.helmet;
    this.stats = Object.assign({}, KART_BASE_STATS, opts.stats || {});
    this.reset(opts.x, opts.y, opts.heading);
  }

  reset(x, y, heading) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.vx = 0;
    this.vy = 0;
    this.steerVisual = 0;
    this.onSand = false;
    this.skidding = false;
    this.loc = null;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  // Speed in km/h for the speedometer.
  get kmh() {
    return Math.round(this.speed * 0.36);
  }

  update(dt, controls, track) {
    const s = this.stats;
    this.loc = track.locate(this.x, this.y);
    this.onSand = this.loc.dist > track.halfRoad;

    const topSpeed = s.topSpeed * (this.onSand ? SAND.topSpeed : 1);
    const grip = s.grip * (this.onSand ? SAND.grip : 1);

    // Steering: you can't turn when stopped, and the kart turns a little
    // slower at high speed. Reversing flips the steering like a real car.
    let forward = this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading);
    const speedFactor = clamp(forward / 60, -1, 1);
    const highSpeedFactor = 1 - 0.3 * clamp(Math.abs(forward) / s.topSpeed, 0, 1);
    this.heading += controls.steer * s.steer * speedFactor * highSpeedFactor * dt;
    this.steerVisual += (controls.steer - this.steerVisual) * Math.min(1, dt * 12);

    // Split velocity into "forwards" and "sideways" parts for the NEW heading.
    // After turning, the kart is still moving partly the old way — that
    // sideways part is what makes it slide in fast corners.
    const fx = Math.cos(this.heading), fy = Math.sin(this.heading);
    const rx = -fy, ry = fx;
    forward = this.vx * fx + this.vy * fy;
    let side = this.vx * rx + this.vy * ry;

    // Engine and brakes.
    if (controls.throttle && !controls.brake) {
      // Pushes less the closer you are to top speed.
      forward += s.accel * dt * Math.max(0, 1 - forward / topSpeed);
    } else if (controls.brake) {
      if (forward > 5) {
        forward = Math.max(0, forward - s.brake * dt);
      } else {
        // Reverse slowly (karts can't really reverse, but it helps if you get stuck).
        forward = Math.max(-60, forward - 120 * dt);
      }
    } else {
      // Rolling to a stop.
      const coast = 60 * dt;
      forward = Math.abs(forward) < coast ? 0 : forward - Math.sign(forward) * coast;
    }

    // Sand slows you down a lot, and so does going faster than top speed.
    if (this.onSand) forward -= forward * SAND.drag * dt;
    if (forward > topSpeed) forward -= (forward - topSpeed) * 3 * dt;

    // Tyres fight sideways sliding.
    side *= Math.exp(-grip * dt);
    this.skidding = Math.abs(side) > 35;

    this.vx = fx * forward + rx * side;
    this.vy = fy * forward + ry * side;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.hitWalls(track);
  }

  // Tyre walls: if the kart goes past them it is pushed back and loses speed.
  hitWalls(track) {
    const loc = track.locate(this.x, this.y);
    const limit = track.wallDist - KART_RADIUS;
    if (loc.dist > limit) {
      const nx = (this.x - loc.x) / loc.dist;
      const ny = (this.y - loc.y) / loc.dist;
      this.x = loc.x + nx * limit;
      this.y = loc.y + ny * limit;
      this.bounce(nx, ny, 0.3, 0.6);
    }
    // Never leave the screen.
    const r = KART_RADIUS;
    if (this.x < r) { this.x = r; this.bounce(-1, 0, 0.3, 0.6); }
    if (this.x > WORLD_WIDTH - r) { this.x = WORLD_WIDTH - r; this.bounce(1, 0, 0.3, 0.6); }
    if (this.y < r) { this.y = r; this.bounce(0, -1, 0.3, 0.6); }
    if (this.y > WORLD_HEIGHT - r) { this.y = WORLD_HEIGHT - r; this.bounce(0, 1, 0.3, 0.6); }
  }

  // Bounce off a surface whose outward direction is (nx, ny).
  bounce(nx, ny, restitution, keep) {
    const into = this.vx * nx + this.vy * ny;
    if (into <= 0) return;
    this.vx -= nx * into * (1 + restitution);
    this.vy -= ny * into * (1 + restitution);
    this.vx *= keep;
    this.vy *= keep;
  }

  // Positions of the two rear wheels (for skid marks and dust).
  rearWheels() {
    const fx = Math.cos(this.heading), fy = Math.sin(this.heading);
    const rx = -fy, ry = fx;
    const back = -KART_LENGTH * 0.35, out = KART_WIDTH * 0.5;
    return [
      { x: this.x + fx * back + rx * out, y: this.y + fy * back + ry * out },
      { x: this.x + fx * back - rx * out, y: this.y + fy * back - ry * out },
    ];
  }

  draw(ctx) {
    const L = KART_LENGTH, W = KART_WIDTH;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-L / 2 + 2, -W / 2 + 3, L, W);

    // Wheels (front ones turn with the steering).
    ctx.fillStyle = '#111';
    const wheel = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillRect(-3.5, -2, 7, 4);
      ctx.restore();
    };
    const steerAngle = this.steerVisual * 0.4;
    wheel(L * 0.33, -W / 2, steerAngle);
    wheel(L * 0.33, W / 2, steerAngle);
    wheel(-L * 0.35, -W / 2 - 0.5, 0);
    wheel(-L * 0.35, W / 2 + 0.5, 0);

    // Body.
    ctx.fillStyle = this.body;
    ctx.beginPath();
    ctx.moveTo(L / 2, -W * 0.28);
    ctx.lineTo(L / 2, W * 0.28);
    ctx.lineTo(L * 0.1, W * 0.42);
    ctx.lineTo(-L / 2, W * 0.42);
    ctx.lineTo(-L / 2, -W * 0.42);
    ctx.lineTo(L * 0.1, -W * 0.42);
    ctx.closePath();
    ctx.fill();

    // Racing stripe(s) and front bumper.
    if (this.stripes) {
      const sw = 1.3;
      this.stripes.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(-L / 2, (i - this.stripes.length / 2) * sw, L, sw);
      });
    } else {
      ctx.fillStyle = this.trim;
      ctx.fillRect(-L / 2, -1.5, L, 3);
    }
    ctx.fillStyle = this.trim;
    ctx.fillRect(L / 2 - 2, -W * 0.3, 2, W * 0.6);

    // Driver's helmet.
    ctx.fillStyle = this.helmet;
    ctx.beginPath();
    ctx.arc(-L * 0.12, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-L * 0.12 + 1, -2, 2, 4); // visor

    ctx.restore();
  }
}

// Karts bumping into each other.
function collideKarts(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = KART_RADIUS * 2;
  if (dist >= min || dist === 0) return;
  const nx = dx / dist, ny = dy / dist;
  // Push apart.
  const push = (min - dist) / 2;
  a.x -= nx * push; a.y -= ny * push;
  b.x += nx * push; b.y += ny * push;
  // Swap some of their speed along the line between them.
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < 0) {
    const impulse = -rel * 0.65;
    a.vx -= nx * impulse; a.vy -= ny * impulse;
    b.vx += nx * impulse; b.vy += ny * impulse;
  }
}
