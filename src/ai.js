// Computer drivers.
//
// Each AI driver:
//  1. follows a "racing line" that cuts to the inside of corners,
//  2. brakes before corners based on how tight they are,
//  3. moves over to get past karts in front,
//  4. makes the odd small mistake (more on Easy, fewer on Hard).

const AI_DRIVERS = [
  { name: 'Omar', number: 14,    body: '#1f6fd1', trim: '#ffffff', helmet: '#ffffff', skill: 0.9 },
  { name: 'Mariam', number: 27,  body: '#8e44ad', trim: '#ffffff', helmet: '#f5d0fe', skill: 1.0 },
  { name: 'Youssef', number: 8, body: '#1f9d55', trim: '#111111', helmet: '#111111', skill: 0.8 },
  { name: 'Nour', number: 33,    body: '#e84393', trim: '#ffffff', helmet: '#ffffff', skill: 0.85 },
  { name: 'Karim', number: 52,   body: '#9acd32', trim: '#111111', helmet: '#111111', skill: 0.75 },
];

// How good the computer drivers are.
//   topKmh    their top speed on the straights (what the speedometer shows)
//   pace      how hard they push through corners (1 = the safe limit)
//   mistakes  how often they make small steering mistakes
// Your own kart starts at 90 km/h and reaches 104 km/h with a maxed engine,
// so on Hard you need some upgrades to keep up on the straights!
const DIFFICULTIES = {
  easy:   { label: 'Easy',   topKmh: 60,  pace: 0.85, mistakes: 0.30 },
  medium: { label: 'Medium', topKmh: 78,  pace: 0.95, mistakes: 0.15 },
  hard:   { label: 'Hard',   topKmh: 100, pace: 1.06, mistakes: 0.05 },
};
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

// The corner-speed table is worked out for a kart this fast (px/s); each
// driver is then held to their own top speed (see AIDriver).
const AI_SPEED_CEILING = 320;

// Work out the racing line and the fastest safe speed at every point of a
// track. Done once per track and remembered.
function prepareTrackForAI(track) {
  if (track.ai) return track.ai;
  const pts = track.points;
  const n = pts.length;
  const spacing = track.length / n;

  // Signed curvature (how sharply the road bends, and which way).
  const w = 4;
  const curve = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = track.tangent((i - w + n) % n);
    const b = track.tangent((i + w) % n);
    const turn = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
    curve[i] = turn / (2 * w * spacing);
  }

  // Racing line: move towards the inside of each corner, smoothly.
  const maxOffset = track.roadWidth / 2 - 10;
  let offset = curve.map((k) => clamp(k * 2600, -maxOffset, maxOffset));
  for (let pass = 0; pass < 6; pass++) {
    offset = offset.map((_, i) => {
      let sum = 0;
      for (let j = -6; j <= 6; j++) sum += offset[(i + j + n) % n];
      return sum / 13;
    });
  }
  const line = pts.map((p, i) => {
    const t = track.tangent(i);
    // Positive curvature = turning right on screen, so the inside is +normal.
    return { x: p.x - t.y * offset[i], y: p.y + t.x * offset[i] };
  });

  // Fastest speed the kart can steer round each bit of the line.
  const s = KART_BASE_STATS;
  const speed = new Array(n);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = 0; j <= 6; j++) k = Math.max(k, Math.abs(curve[(i + j) % n]));
    // The kart's turn rate drops a little with speed; solve for the speed
    // where the turn it can manage matches the corner (with a safety margin).
    const v = (s.steer * 0.8) / (k + (0.3 * s.steer) / s.topSpeed);
    speed[i] = Math.min(AI_SPEED_CEILING, v);
  }
  // Brake early: you must be able to slow down in time for the next corner.
  const decel = s.brake * 0.6;
  for (let loop = 0; loop < 2; loop++) {
    for (let i = n - 1; i >= 0; i--) {
      const next = speed[(i + 1) % n];
      speed[i] = Math.min(speed[i], Math.sqrt(next * next + 2 * decel * spacing));
    }
  }

  track.ai = { line, speed };
  return track.ai;
}

class AIDriver {
  constructor(racer, race, profile, difficulty) {
    this.racer = racer;
    this.race = race;
    this.track = race.track;
    this.ai = prepareTrackForAI(race.track);
    const d = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    // Better drivers are a little faster and make fewer mistakes.
    this.pace = d.pace * (0.94 + profile.skill * 0.06);
    // Top speed in pixels per second (1 km/h = 1 / 0.36 px/s). Drivers vary by
    // a few percent so they don't all run nose to tail.
    this.topSpeed = (d.topKmh / 0.36) * (0.96 + 0.04 * profile.skill);
    racer.kart.stats.topSpeed = this.topSpeed * 1.02; // just above the limit, so the kart can reach it but not run away
    this.mistakeRate = d.mistakes * (1.4 - profile.skill * 0.6);
    this.lane = 0;            // extra sideways offset used for overtaking
    this.laneTimer = 0;
    this.wobble = 0;          // a small mistake in progress
    this.wobbleTime = 0;
    this.stuckTime = 0;
    this.reverseTime = 0;
  }

  controls(dt) {
    const kart = this.racer.kart;
    const track = this.track;
    const n = track.points.length;
    const idx = kart.loc ? kart.loc.idx : 0;
    const speed = kart.speed;

    // Stuck against a wall or another kart? Back up for a moment.
    if (this.reverseTime > 0) {
      this.reverseTime -= dt;
      return { throttle: 0, brake: 1, steer: this.reverseSteer };
    }
    this.stuckTime = speed < 12 ? this.stuckTime + dt : 0;
    if (this.stuckTime > 1.2) {
      this.stuckTime = 0;
      this.reverseTime = 0.8;
      this.reverseSteer = Math.random() < 0.5 ? -1 : 1;
    }

    this.avoidTraffic(dt, idx);

    // Occasionally make a small steering mistake.
    if (this.wobbleTime > 0) {
      this.wobbleTime -= dt;
    } else {
      this.wobble = 0;
      if (Math.random() < this.mistakeRate * dt) {
        this.wobble = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.35);
        this.wobbleTime = 0.3 + Math.random() * 0.4;
      }
    }

    // Aim at a point further along the racing line (further when faster).
    const ahead = Math.round(7 + speed / 22);
    const ti = (idx + ahead) % n;
    const target = this.ai.line[ti];
    const t = track.tangent(ti);
    const tx = target.x - t.y * this.lane;
    const ty = target.y + t.x * this.lane;
    let angle = Math.atan2(ty - kart.y, tx - kart.x) - kart.heading;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    const steer = clamp(angle * 3.2 + this.wobble, -1, 1);

    // Speed: go as fast as the upcoming bit of track allows.
    let wanted = Math.min(this.ai.speed[(idx + 3) % n] * this.pace, this.topSpeed);
    if (this.racer.finished) wanted = 60; // cool-down lap
    let throttle = 0, brake = 0;
    if (speed < wanted) throttle = 1;
    else if (speed > wanted + 8) brake = 1;

    return { throttle, brake, steer };
  }

  // If a kart is just in front of us, pick a side and go round it.
  avoidTraffic(dt, idx) {
    const me = this.racer.kart;
    const fx = Math.cos(me.heading), fy = Math.sin(me.heading);
    let blocker = null;
    for (const other of this.race.racers) {
      if (other === this.racer) continue;
      const k = other.kart;
      const dx = k.x - me.x, dy = k.y - me.y;
      const along = dx * fx + dy * fy;
      const side = -dx * fy + dy * fx;
      if (along > 0 && along < 55 && Math.abs(side) < 16 && me.speed > k.speed - 5) {
        blocker = side;
        break;
      }
    }
    const room = this.track.roadWidth / 2 - 12;
    if (blocker !== null && this.laneTimer <= 0) {
      // Go to the side the other kart isn't on.
      this.lane = clamp(blocker > 0 ? -18 : 18, -room, room);
      this.laneTimer = 1.2;
    }
    if (this.laneTimer > 0) this.laneTimer -= dt;
    else this.lane *= Math.exp(-2 * dt); // drift back to the racing line
  }
}
