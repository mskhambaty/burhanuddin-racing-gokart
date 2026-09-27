// A race track.
//
// A track is described by a handful of "control points" around the centre of
// the road (in the order you drive them). The game turns those into a smooth
// loop, draws the road, sand run-off and tyre walls, and works out things like
// "is this kart on the road?" and "which checkpoint is it in?".
//
// To make a new track, copy src/tracks/giza.js and move the points around.

const TRACKS = {};

class Track {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.subtitle = def.subtitle || '';
    this.laps = def.laps || 3;
    this.roadWidth = def.roadWidth || 60;      // asphalt width
    this.kerbWidth = 6;                        // red/white kerb on each side
    this.runoff = def.runoff || 36;            // sand between kerb and tyre wall
    this.sectors = def.sectors || 8;           // checkpoints per lap
    this.colors = Object.assign({
      desert: '#d8b774',
      runoff: '#e6cf9c',
      road: '#4a4a4c',
      tyres: '#2b2b2b',
    }, def.colors || {});
    this.buildScenery = def.buildScenery || null;
    this.scenery = null;      // pyramids, palms, grandstand (see getScenery)
    this.seed = def.seed || 1;

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
  // Used to place decorations so they never sit on the track.
  isClear(x, y, r) {
    return this.locate(x, y).dist > this.wallDist + 8 + r;
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
    c.width = GAME_WIDTH;
    c.height = GAME_HEIGHT;
    const ctx = c.getContext('2d');
    ctx.drawImage(this.renderGround(), 0, 0);
    const rand = seededRandom(this.seed + 3);
    for (const item of this.getScenery()) {
      if (item.type === 'pyramid') drawPyramid(ctx, item.x, item.y, item.size);
      else if (item.type === 'palm') drawPalm(ctx, item.x, item.y, item.size, item.rot);
      else if (item.type === 'stand') drawGrandstand(ctx, item.x, item.y, item.w, item.h, rand);
    }
    this.canvas = c;
    return c;
  }

  // Draw the ground once into an off-screen canvas; each frame just copies
  // that picture, which is much faster than redrawing everything.
  // Scenery shadows are painted on the ground so they work in 3D too.
  renderGround() {
    if (this.groundCanvas) return this.groundCanvas;
    const c = document.createElement('canvas');
    c.width = GAME_WIDTH;
    c.height = GAME_HEIGHT;
    const ctx = c.getContext('2d');
    const rand = seededRandom(this.seed);

    // Desert with speckles.
    ctx.fillStyle = this.colors.desert;
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = rand() < 0.5 ? 'rgba(120,90,40,0.10)' : 'rgba(255,245,210,0.18)';
      const r = 1 + rand() * 2.5;
      ctx.beginPath();
      ctx.arc(rand() * c.width, rand() * c.height, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const path = new Path2D();
    this.points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
    path.closePath();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Tyre wall: a dark ring just outside the sand run-off.
    ctx.strokeStyle = this.colors.tyres;
    ctx.lineWidth = this.wallDist * 2 + 10;
    ctx.stroke(path);
    ctx.strokeStyle = '#c0392b';
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
  }
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
