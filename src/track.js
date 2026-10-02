// A race track.
//
// A track is described by a handful of "control points" around the centre of
// the road (in the order you drive them). The game turns those into a smooth
// loop, draws the road, sand run-off and tyre walls, and works out things like
// "is this kart on the road?" and "which checkpoint is it in?".
//
// To make a new track, copy src/tracks/giza.js and move the points around.

const TRACKS = {};

// Track designs are drawn on a one-screen map. These scale them up to the
// real (TRACK_SCALE times bigger) map. radiusScale lets a track keep its
// corners tighter than the straights are long (Cairo does this).
function scaleControlPoints(points) {
  return points.map(([x, y]) => [x * TRACK_SCALE, y * TRACK_SCALE]);
}

function scaleCorners(corners, radiusScale = TRACK_SCALE) {
  return corners.map(([x, y, r]) => [x * TRACK_SCALE, y * TRACK_SCALE, (r || 0) * radiusScale]);
}

// The order tracks appear in the garage.
const TRACK_ORDER = ['giza', 'cairo', 'nile'];

// Design a track from its corners. Give the corners in driving order, each
// as [x, y, radius]; the road is drawn straight between them and rounded off
// with a curve of the given radius at each corner (radius 0 = just a point
// on a straight). The first point is the start/finish line.
//
//   roundedLoop([[900, 590, 0], [150, 590, 120], [150, 130, 120], ...])
function roundedLoop(corners) {
  const n = corners.length;
  const P = corners.map((c) => ({ x: c[0], y: c[1] }));
  const arcs = corners.map((c, i) => {
    let r = c[2] || 0;
    if (r <= 0) return { s: P[i], e: P[i], pts: [P[i]] };
    const prev = P[(i - 1 + n) % n], next = P[(i + 1) % n], cur = P[i];
    const l1 = Math.hypot(cur.x - prev.x, cur.y - prev.y), l2 = Math.hypot(next.x - cur.x, next.y - cur.y);
    const d1 = { x: (cur.x - prev.x) / l1, y: (cur.y - prev.y) / l1 };
    const d2 = { x: (next.x - cur.x) / l2, y: (next.y - cur.y) / l2 };
    const cross = d1.x * d2.y - d1.y * d2.x;
    const turn = Math.atan2(cross, d1.x * d2.x + d1.y * d2.y); // signed turning angle
    if (Math.abs(turn) < 0.01) return { s: cur, e: cur, pts: [cur] };
    // The curve may not use more than half of either neighbouring straight.
    const room = Math.min(l1, l2) / 2 - 1;
    r = Math.min(r, room / Math.tan(Math.abs(turn) / 2));
    const t = r * Math.tan(Math.abs(turn) / 2);
    const s = { x: cur.x - d1.x * t, y: cur.y - d1.y * t };
    const side = Math.sign(cross); // +1 = turning right on screen
    const centre = { x: s.x - d1.y * side * r, y: s.y + d1.x * side * r };
    const a0 = Math.atan2(s.y - centre.y, s.x - centre.x);
    const steps = Math.max(2, Math.ceil((Math.abs(turn) * r) / 22));
    const pts = [];
    for (let k = 0; k <= steps; k++) {
      const a = a0 + (turn * k) / steps;
      pts.push({ x: centre.x + Math.cos(a) * r, y: centre.y + Math.sin(a) * r });
    }
    return { s: pts[0], e: pts[pts.length - 1], pts };
  });
  const out = [];
  for (let i = 0; i < n; i++) {
    for (const p of arcs[i].pts) out.push([p.x, p.y]);
    // Straight bit to the next corner, with a point every ~30 pixels.
    const from = arcs[i].e, to = arcs[(i + 1) % n].s;
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    const k = Math.floor(len / 30);
    for (let j = 1; j < k; j++) out.push([from.x + ((to.x - from.x) * j) / k, from.y + ((to.y - from.y) * j) / k]);
  }
  return out;
}

// Is this rectangle (x, y, w, h) clear of the road and its run-off?
function rectIsClear(track, x, y, w, h, margin = 0) {
  const xs = [x - margin, x + w / 2, x + w + margin], ys = [y - margin, y + h / 2, y + h + margin];
  for (const px of xs) for (const py of ys) if (!track.isClear(px, py, 0)) return false;
  return true;
}

// Fill free space with city buildings. `areas` limits where (optional).
function scatterBuildings(track, rand, opts) {
  const items = [];
  const colors = opts.colors;
  for (let i = 0; i < opts.tries; i++) {
    const w = opts.minSize + rand() * (opts.maxSize - opts.minSize);
    const h = opts.minSize + rand() * (opts.maxSize - opts.minSize);
    const x = Math.round(6 + rand() * (WORLD_WIDTH - w - 12)), y = Math.round(6 + rand() * (WORLD_HEIGHT - h - 12));
    if (opts.allowed && !opts.allowed(x, y, w, h)) continue;
    if (!rectIsClear(track, x, y, w, h, 4)) continue;
    const gap = 8;
    const clash = (opts.existing || []).concat(items).some((o) =>
      o.w !== undefined && x < o.x + o.w + gap && x + w + gap > o.x && y < o.y + o.h + gap && y + h + gap > o.y);
    if (clash) continue;
    items.push({
      type: 'building', x, y, w: Math.round(w), h: Math.round(h),
      height: Math.round(opts.minHeight + rand() * (opts.maxHeight - opts.minHeight)),
      color: colors[Math.floor(rand() * colors.length)],
    });
  }
  return items;
}

class Track {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.subtitle = def.subtitle || '';
    this.laps = def.laps || 3;
    this.roadWidth = def.roadWidth || 60;      // asphalt width
    this.kerbWidth = 6;                        // red/white kerb on each side
    this.runoff = def.runoff || 36;            // sand between kerb and tyre wall
    this.sectors = def.sectors || 12;          // checkpoints per lap
    this.colors = Object.assign({
      desert: '#d8b774',
      runoff: '#e6cf9c',
      road: '#4a4a4c',
      tyres: '#2b2b2b',
      wallStripe: '#c0392b',
      speckleDark: 'rgba(120,90,40,0.10)',
      speckleLight: 'rgba(255,245,210,0.18)',
    }, def.colors || {});
    // Optional: paint extra things on the ground (a river, plazas...) before
    // the road is drawn on top. Called as paintGround(ctx, track, rand).
    this.paintGround = def.paintGround || null;
    this.buildScenery = def.buildScenery || null;
    this.scenery = null;      // pyramids, palms, grandstand (see getScenery)
    this.seed = def.seed || 1;
    // Lap records and ghosts are kept per track *and* per map size, so a record
    // from a smaller version of the track never gets compared with a bigger one.
    this.recordKey = 'best-lap:' + def.id + ':x' + TRACK_SCALE;
    this.ghostKey = 'ghost:' + def.id + ':x' + TRACK_SCALE;

    this.halfRoad = this.roadWidth / 2 + this.kerbWidth; // kerbs count as road
    this.wallDist = this.halfRoad + this.runoff;         // distance to tyre wall

    this.points = this.buildCenterLine(def.points, 6);
    this.canvas = null;       // top-down picture, drawn lazily by render()
    this.groundCanvas = null; // just the ground (used by the 3D views)
  }

  // Smooth the control points into a loop (Catmull-Rom spline), then space the
  // points evenly every `spacing` pixels so we can measure progress easily.
  buildCenterLine(ctrl, spacing) {
    const n = ctrl.length;
    const dense = [];
    const steps = 24;
    for (let i = 0; i < n; i++) {
      const p0 = ctrl[(i - 1 + n) % n];
      const p1 = ctrl[i];
      const p2 = ctrl[(i + 1) % n];
      const p3 = ctrl[(i + 2) % n];
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        dense.push({
          x: 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          y: 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        });
      }
    }

    // Walk along the dense line and drop a point every `spacing` pixels.
    const out = [{ x: dense[0].x, y: dense[0].y }];
    let carry = 0;
    for (let i = 0; i < dense.length; i++) {
      const a = dense[i];
      const b = dense[(i + 1) % dense.length];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      let d = spacing - carry;
      while (d <= segLen) {
        const t = d / segLen;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        d += spacing;
      }
      carry = segLen - (d - spacing);
    }
    // The last point may land on top of the first one — drop it.
    const last = out[out.length - 1];
    if (Math.hypot(last.x - out[0].x, last.y - out[0].y) < spacing / 2) out.pop();

    this.length = out.length * spacing;
    return out;
  }

  // Where is (x, y) compared with the road?
  // Returns the distance to the centre line, the closest point on it, and the
  // index of the centre-line point (used for progress and checkpoints).
  locate(x, y) {
    const pts = this.points;
    const n = pts.length;
    let best = Infinity, bestIdx = 0, bestX = 0, bestY = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const abx = b.x - a.x, aby = b.y - a.y;
      const t = clamp(((x - a.x) * abx + (y - a.y) * aby) / (abx * abx + aby * aby), 0, 1);
      const px = a.x + abx * t, py = a.y + aby * t;
      const d2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (d2 < best) {
        best = d2; bestX = px; bestY = py;
        bestIdx = t < 0.5 ? i : (i + 1) % n;
      }
    }
    return { dist: Math.sqrt(best), idx: bestIdx, x: bestX, y: bestY };
  }

  sectorOf(idx) {
    return Math.floor(idx * this.sectors / this.points.length);
  }

  sectorStart(sector) {
    return Math.ceil(sector * this.points.length / this.sectors);
  }

  // Direction of travel at centre-line point idx (unit vector).
  tangent(idx) {
    const n = this.points.length;
    const a = this.points[(idx - 1 + n) % n];
    const b = this.points[(idx + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  }

  // Starting grid: slot 0 is pole position, just behind the start line.
  gridSlot(slot) {
    const n = this.points.length;
    const back = 5 + Math.floor(slot / 2) * 6 + (slot % 2) * 2; // points behind the line
    const idx = (n - back) % n;
    const p = this.points[idx];
    const t = this.tangent(idx);
    const side = slot % 2 === 0 ? -1 : 1;
    const offset = this.roadWidth * 0.22 * side;
    return {
      x: p.x - t.y * offset,
      y: p.y + t.x * offset,
      heading: Math.atan2(t.y, t.x),
    };
  }

  // Is a circle at (x, y) with radius r fully outside the tyre walls?
  // Used to place decorations so they never sit on the track. (This is asked
  // thousands of times when scenery is placed, so it uses a grid of the road's
  // points instead of checking every one.)
  isClear(x, y, r) {
    const cell = 100;
    if (!this.grid) {
      this.grid = new Map();
      for (const p of this.points) {
        const key = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell);
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(p);
      }
    }
    const limit = this.wallDist + 8 + r;
    const reach = Math.ceil(limit / cell);
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let cx = gx - reach; cx <= gx + reach; cx++) {
      for (let cy = gy - reach; cy <= gy + reach; cy++) {
        const list = this.grid.get(cx + ',' + cy);
        if (!list) continue;
        for (const p of list) {
          if ((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < limit * limit) return false;
        }
      }
    }
    return true;
  }

  // Scenery is a list of things like { type: 'pyramid', x, y, size }.
  // The same list is drawn from above (top-down view) and in 3D.
  getScenery() {
    if (!this.scenery) {
      this.scenery = this.buildScenery ? this.buildScenery(this, seededRandom(this.seed + 7)) : [];
    }
    return this.scenery;
  }

  // The full top-down picture: ground plus scenery seen from above.
  render() {
    if (this.canvas) return this.canvas;
    const c = document.createElement('canvas');
    c.width = WORLD_WIDTH;
    c.height = WORLD_HEIGHT;
    const ctx = c.getContext('2d');
    ctx.drawImage(this.renderGround(), 0, 0);
    const rand = seededRandom(this.seed + 3);
    for (const item of this.getScenery()) {
      if (item.type === 'pyramid') drawPyramid(ctx, item.x, item.y, item.size);
      else if (item.type === 'palm') drawPalm(ctx, item.x, item.y, item.size, item.rot);
      else if (item.type === 'stand') drawGrandstand(ctx, item.x, item.y, item.w, item.h, rand);
      else if (item.type === 'building') drawBuilding(ctx, item);
      else if (item.type === 'tower') drawTower(ctx, item);
      else if (item.type === 'felucca') drawFelucca(ctx, item);
    }
    this.canvas = c;
    return c;
  }

  // A small copy of the map for the minimap (made once, because shrinking the
  // whole map every frame would be slow).
  minimapImage(w, h) {
    if (!this.miniCanvas || this.miniCanvas.width !== w) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const mctx = c.getContext('2d');
      mctx.imageSmoothingQuality = 'high';
      mctx.drawImage(this.render(), 0, 0, w, h);
      this.miniCanvas = c;
    }
    return this.miniCanvas;
  }

  // Draw the ground once into an off-screen canvas; each frame just copies
  // that picture, which is much faster than redrawing everything.
  // Scenery shadows are painted on the ground so they work in 3D too.
  renderGround() {
    if (this.groundCanvas) return this.groundCanvas;
    const c = document.createElement('canvas');
    c.width = WORLD_WIDTH;
    c.height = WORLD_HEIGHT;
    const ctx = c.getContext('2d');
    const rand = seededRandom(this.seed);

    // Desert with speckles.
    ctx.fillStyle = this.colors.desert;
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 2500 * TRACK_SCALE * TRACK_SCALE; i++) {
      ctx.fillStyle = rand() < 0.5 ? this.colors.speckleDark : this.colors.speckleLight;
      const r = 1 + rand() * 2.5;
      ctx.beginPath();
      ctx.arc(rand() * c.width, rand() * c.height, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.paintGround) this.paintGround(ctx, this, rand);

    const path = new Path2D();
    this.points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
    path.closePath();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Tyre wall: a dark ring just outside the sand run-off.
    ctx.strokeStyle = this.colors.tyres;
    ctx.lineWidth = this.wallDist * 2 + 10;
    ctx.stroke(path);
    ctx.strokeStyle = this.colors.wallStripe;
    ctx.lineCap = 'butt'; // round caps would fill in the gaps between dashes
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = this.wallDist * 2 + 4;
    ctx.stroke(path);
    ctx.setLineDash([]);
    ctx.lineCap = 'round';

    // Sand run-off.
    ctx.strokeStyle = this.colors.runoff;
    ctx.lineWidth = this.wallDist * 2;
    ctx.stroke(path);

    // Kerbs: white with red stripes.
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = this.halfRoad * 2;
    ctx.stroke(path);
    ctx.strokeStyle = '#d0312d';
    ctx.lineCap = 'butt';
    ctx.setLineDash([12, 12]);
    ctx.stroke(path);
    ctx.setLineDash([]);
    ctx.lineCap = 'round';

    // Asphalt.
    ctx.strokeStyle = this.colors.road;
    ctx.lineWidth = this.roadWidth;
    ctx.stroke(path);

    this.drawStartLine(ctx);
    this.drawGridBoxes(ctx);

    for (const item of this.getScenery()) drawShadow(ctx, item);

    this.groundCanvas = c;
    return c;
  }

  drawStartLine(ctx) {
    const p = this.points[0];
    const t = this.tangent(0);
    const angle = Math.atan2(t.y, t.x);
    const sq = 6;
    const rows = Math.round(this.roadWidth / sq);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = (r + col) % 2 === 0 ? '#fff' : '#111';
        ctx.fillRect(-sq + col * sq, -this.roadWidth / 2 + r * sq, sq, sq);
      }
    }
    ctx.restore();
  }

  drawGridBoxes(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    for (let slot = 0; slot < 6; slot++) {
      const g = this.gridSlot(slot);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.heading);
      ctx.beginPath();
      ctx.moveTo(-14, -11);
      ctx.lineTo(16, -11);
      ctx.lineTo(16, 11);
      ctx.lineTo(-14, 11);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---------- Drawing helpers for track decorations ----------

// A pyramid seen from above: four triangle faces, lit from the top-left.
// Shadows on the ground (the sun is up and to the left).
function drawShadow(ctx, item) {
  ctx.fillStyle = 'rgba(70,45,10,0.28)';
  if (item.type === 'pyramid') {
    const { x, y, size } = item;
    const h = size / 2;
    ctx.beginPath();
    ctx.moveTo(x + h, y - h);
    ctx.lineTo(x + h + size * 0.35, y + h * 0.2);
    ctx.lineTo(x + h * 0.2, y + h + size * 0.35);
    ctx.lineTo(x - h, y + h);
    ctx.closePath();
    ctx.fill();
  } else if (item.type === 'palm') {
    const { x, y, size } = item;
    ctx.beginPath();
    ctx.ellipse(x + size * 0.9, y + size * 0.9, size, size * 0.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'stand') {
    ctx.fillRect(item.x + 6, item.y + 6, item.w, item.h);
  } else if (item.type === 'building') {
    // The shadow grows with the building's height.
    const o = Math.min(item.height * 0.35, 40);
    ctx.beginPath();
    ctx.moveTo(item.x, item.y);
    ctx.lineTo(item.x + o, item.y + o);
    ctx.lineTo(item.x + item.w + o, item.y + o);
    ctx.lineTo(item.x + item.w + o, item.y + item.h + o);
    ctx.lineTo(item.x + item.w, item.y + item.h);
    ctx.lineTo(item.x, item.y + item.h);
    ctx.closePath();
    ctx.fill();
  } else if (item.type === 'tower') {
    ctx.beginPath();
    ctx.ellipse(item.x + 28, item.y + 28, item.r * 0.9, item.r * 0.5, 0.78, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'felucca') {
    ctx.beginPath();
    ctx.ellipse(item.x + 4, item.y + 5, 20, 5, item.rot, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A flat-roofed city building seen from above.
function drawBuilding(ctx, b) {
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  // A rooftop water tank and air-conditioning boxes.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, Math.min(10, b.w * 0.25), Math.min(8, b.h * 0.25));
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(b.x + b.w * 0.68, b.y + b.h * 0.62, Math.min(5, b.w * 0.12), 0, Math.PI * 2);
  ctx.fill();
}

// Cairo Tower from above: a round base with the lattice "lotus" head.
function drawTower(ctx, t) {
  ctx.fillStyle = '#bdb6a8';
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8f887c';
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6d675e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r);
    ctx.stroke();
  }
  ctx.fillStyle = '#d8d1c3';
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

// A felucca (traditional Nile sailboat) from above.
function drawFelucca(ctx, f) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);
  ctx.fillStyle = '#7a4b25';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6f1e4';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(16, -9);
  ctx.lineTo(16, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawPyramid(ctx, x, y, size) {
  const h = size / 2;
  const faces = [
    { a: [x - h, y - h], b: [x + h, y - h], color: '#f1d9a0' }, // north (lit)
    { a: [x + h, y - h], b: [x + h, y + h], color: '#c9a260' }, // east
    { a: [x + h, y + h], b: [x - h, y + h], color: '#a9823f' }, // south (shade)
    { a: [x - h, y + h], b: [x - h, y - h], color: '#e2c07f' }, // west
  ];
  for (const f of faces) {
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.moveTo(f.a[0], f.a[1]);
    ctx.lineTo(f.b[0], f.b[1]);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }
  // Stone-block lines.
  ctx.strokeStyle = 'rgba(90,60,20,0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const k = h * (i / 6);
    ctx.strokeRect(x - k, y - k, k * 2, k * 2);
  }
}

// A palm tree from above.
function drawPalm(ctx, x, y, size, rot) {
  const fronds = 7;
  const start = rot;
  for (let i = 0; i < fronds; i++) {
    const a = start + (i / fronds) * Math.PI * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = i % 2 ? '#3f7d2c' : '#4f9a36';
    ctx.beginPath();
    ctx.ellipse(size * 0.55, 0, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#6b4a22';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

// A grandstand full of fans, with the team banner on the roof.
function drawGrandstand(ctx, x, y, w, h, rand) {
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(x, y, w, h);
  const fanColors = ['#e74c3c', '#ffffff', '#111111', '#f2c94c', '#3498db', '#2ecc71'];
  for (let fx = x + 5; fx < x + w - 3; fx += 6) {
    for (let fy = y + 12; fy < y + h - 3; fy += 6) {
      ctx.fillStyle = fanColors[Math.floor(rand() * fanColors.length)];
      ctx.fillRect(fx, fy, 3, 3);
    }
  }
  ctx.fillStyle = COLORS.red;
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BURHANUDDIN RACING', x + w / 2, y + 5.5);
}
