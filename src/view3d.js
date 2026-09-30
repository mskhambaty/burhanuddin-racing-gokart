// 3D views: "steering wheel" (from the driver's seat) and "rear" (camera
// following behind the kart).
//
// How it works — the same trick old kart games like Super Mario Kart used
// ("Mode 7"): the flat top-down track picture is laid on the ground and
// drawn in perspective, row by row, out to the horizon. Pyramids, palm trees,
// the grandstand and the karts are then drawn on top as simple 3D shapes,
// furthest first.
//
// World units are the same pixels as the top-down map (1 pixel ≈ 10 cm).

const CAMERAS = {
  // back: how far behind the kart · height: eye height · horizon: where the
  // horizon sits (0 = top, 1 = bottom) · zoom: bigger = more zoomed in.
  cockpit: { back: 3, height: 9, horizon: 0.42, zoom: 1.1 },
  chase:   { back: 60, height: 20, horizon: 0.36, zoom: 1.27 },
};

const FOG = { start: 320, end: 1050, rgb: [228, 216, 192] }; // hazy desert air
const NEAR = 3;     // don't draw things closer than this
const FAR = 1400;   // or further than this

// '#rrggbb' -> the colour as a packed pixel (little-endian ABGR), darkened by k.
function hexToPixel(hex, k = 1) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

// ---------- The ground ----------

class Ground {
  constructor(track) {
    const tex = track.renderGround();
    this.tw = tex.width;
    this.th = tex.height;
    const data = tex.getContext('2d').getImageData(0, 0, this.tw, this.th);
    this.tex = new Uint32Array(data.data.buffer);
    this.buf = null;
    // What the ground looks like beyond the edge of the map: plain ground
    // in the track's colour, with a few darker patches so you can feel the speed.
    this.outPx = hexToPixel(track.colors.desert);
    this.outPxDark = hexToPixel(track.colors.desert, 0.93);
  }

  // Draw the ground for a camera into a small off-screen picture (w x h),
  // which is then stretched to fill the view.
  render(cam, w, h) {
    if (!this.buf || this.buf.width !== w || this.buf.height !== h) {
      this.buf = document.createElement('canvas');
      this.buf.width = w;
      this.buf.height = h;
      this.bctx = this.buf.getContext('2d');
      this.img = this.bctx.createImageData(w, h);
      this.out = new Uint32Array(this.img.data.buffer);
    }
    const out = this.out;
    out.fill(0);
    const f = h * cam.zoom;               // focal length in buffer pixels
    const hy = cam.horizon * h;
    const fx = Math.cos(cam.heading), fy = Math.sin(cam.heading);
    const rx = -fy, ry = fx;
    const [fr, fg, fb] = FOG.rgb;
    const { tw, th, tex, outPx, outPxDark } = this;

    for (let y = Math.max(0, Math.ceil(hy)); y < h; y++) {
      const d = cam.height * f / (y + 0.5 - hy);   // distance to this row
      const a = Math.round(clamp((d - FOG.start) / (FOG.end - FOG.start), 0, 1) * 256);
      const ia = 256 - a;
      const fogR = fr * a, fogG = fg * a, fogB = fb * a;
      const k = d / f;
      let wx = cam.x + fx * d - rx * (w / 2) * k;
      let wy = cam.y + fy * d - ry * (w / 2) * k;
      const sx = rx * k, sy = ry * k;
      let o = y * w;
      for (let x = 0; x < w; x++) {
        let c;
        if (wx >= 0 && wy >= 0 && wx < tw && wy < th) {
          c = tex[(wy | 0) * tw + (wx | 0)];
        } else {
          // Beyond the map: plain desert with a few speckles so you can feel the speed.
          c = (((wx >> 3) * 73856093) ^ ((wy >> 3) * 19349663)) & 7 ? outPx : outPxDark;
        }
        const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
        out[o++] = 0xff000000 | (((b * ia + fogB) >> 8) << 16) | (((g * ia + fogG) >> 8) << 8) | ((r * ia + fogR) >> 8);
        wx += sx;
        wy += sy;
      }
    }
    this.bctx.putImageData(this.img, 0, 0);
    return this.buf;
  }
}

// ---------- Sky and distant skyline ----------

let skylineCanvas = null;

// A 360° strip of distant dunes, pyramids and Cairo minarets.
function getSkyline() {
  if (skylineCanvas) return skylineCanvas;
  const W = 2400, H = 160;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const rand = seededRandom(99);

  // Far dunes.
  ctx.fillStyle = 'rgba(214,188,140,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) {
    const y = H - 28 - 14 * Math.sin((x / W) * Math.PI * 6) - 8 * Math.sin((x / W) * Math.PI * 22);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // Distant Giza pyramids.
  const pyramid = (x, w) => {
    ctx.fillStyle = 'rgba(196,160,104,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, H - 20);
    ctx.lineTo(x, H - 20 - w * 0.62);
    ctx.lineTo(x + w / 2, H - 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(168,132,80,0.95)';
    ctx.beginPath();
    ctx.moveTo(x, H - 20 - w * 0.62);
    ctx.lineTo(x + w / 2, H - 20);
    ctx.lineTo(x + w * 0.1, H - 20);
    ctx.fill();
  };
  pyramid(300, 150);
  pyramid(440, 120);
  pyramid(540, 70);
  pyramid(1700, 90);

  // Cairo skyline: domes and minarets.
  ctx.fillStyle = 'rgba(150,140,130,0.75)';
  for (let x = 900; x < 1400; x += 14 + rand() * 20) {
    const bw = 14 + rand() * 26, bh = 12 + rand() * 30;
    ctx.fillRect(x, H - 20 - bh, bw, bh + 20);
    if (rand() < 0.35) {
      ctx.fillRect(x + bw / 2 - 2, H - 20 - bh - 40, 4, 40); // minaret
      ctx.beginPath();
      ctx.arc(x + bw / 2, H - 20 - bh - 40, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (rand() < 0.4) {
      ctx.beginPath();
      ctx.arc(x + bw / 2, H - 20 - bh, bw / 2, Math.PI, 0); // dome
      ctx.fill();
    }
  }
  // Cairo Tower.
  ctx.fillRect(1150, H - 110, 8, 100);
  ctx.fillRect(1146, H - 118, 16, 12);

  // Near dunes.
  ctx.fillStyle = 'rgba(222,196,146,1)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) {
    ctx.lineTo(x, H - 12 - 6 * Math.sin((x / W) * Math.PI * 10 + 1));
  }
  ctx.lineTo(W, H);
  ctx.fill();

  skylineCanvas = c;
  return c;
}

function drawSky(ctx, vp, cam, hy) {
  const g = ctx.createLinearGradient(0, vp.y, 0, hy);
  g.addColorStop(0, '#4f9fe0');
  g.addColorStop(0.7, '#a9d2ee');
  g.addColorStop(1, 'rgb(' + FOG.rgb.join(',') + ')');
  ctx.fillStyle = g;
  ctx.fillRect(vp.x, vp.y, vp.w, hy - vp.y + 1);

  // Sun.
  ctx.fillStyle = 'rgba(255,250,220,0.9)';
  const sunX = vp.x + vp.w / 2 - wrapAngle(cam.heading + 2.3) * vp.h * cam.zoom;
  ctx.beginPath();
  ctx.arc(sunX, vp.y + (hy - vp.y) * 0.3, vp.h * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Skyline: one full turn of the kart scrolls the whole strip past.
  const sky = getSkyline();
  const fullTurn = Math.PI * 2 * vp.h * cam.zoom; // pixels for 360°
  const bandH = vp.h * 0.2;
  const offset = -(((cam.heading / (Math.PI * 2)) % 1 + 1) % 1) * fullTurn;
  for (let x = offset; x < vp.w; x += fullTurn) {
    ctx.drawImage(sky, vp.x + x, hy - bandH + 2, fullTurn, bandH);
  }
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ---------- 3D objects ----------

// Light comes from the upper left (same as the shadows on the ground).
const LIGHT = (() => {
  const v = [-0.5, -0.6, 0.8];
  const len = Math.hypot(v[0], v[1], v[2]);
  return v.map((n) => n / len);
})();

const shadeCache = {};
function shade(hex, k) {
  const key = hex + k.toFixed(2);
  if (shadeCache[key]) return shadeCache[key];
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return (shadeCache[key] = 'rgb(' + r + ',' + g + ',' + b + ')');
}

function lightFor(nx, ny, nz) {
  const len = Math.hypot(nx, ny, nz) || 1;
  const d = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / len;
  return Math.round((0.6 + 0.45 * Math.max(0, d)) * 20) / 20; // steps keep the colour cache small
}

class Scene {
  constructor(cam, vp) {
    this.cam = cam;
    this.f = vp.h * cam.zoom;
    this.hy = vp.y + cam.horizon * vp.h;
    this.cx = vp.x + vp.w / 2;
    this.cos = Math.cos(cam.heading);
    this.sin = Math.sin(cam.heading);
    this.halfWidthRatio = vp.w / 2 / this.f; // tan of half the sideways view angle
    this.items = [];
    this.alpha = 1;  // set below 1 to draw see-through things (the ghost)
  }

  add(item) {
    item.alpha = this.alpha;
    this.items.push(item);
  }

  depth(wx, wy) {
    return (wx - this.cam.x) * this.cos + (wy - this.cam.y) * this.sin;
  }

  project(wx, wy, wz) {
    const dx = wx - this.cam.x, dy = wy - this.cam.y;
    const z = dx * this.cos + dy * this.sin;
    const x = -dx * this.sin + dy * this.cos;
    return { x: this.cx + (x * this.f) / z, y: this.hy + ((this.cam.height - wz) * this.f) / z, z };
  }

  // Is something at (wx, wy) with this radius worth drawing?
  visible(wx, wy, radius) {
    const z = this.depth(wx, wy);
    if (z < NEAR - radius || z > FAR) return false;
    const side = -(wx - this.cam.x) * this.sin + (wy - this.cam.y) * this.cos;
    return Math.abs(side) < Math.max(z, 1) * this.halfWidthRatio * 1.1 + radius;
  }

  // A flat face given by 3D corner points, with an outward direction (normal).
  face(pts, normal, color, bias = 0) {
    const c = this.cam;
    let cx = 0, cy = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= pts.length; cy /= pts.length; cz /= pts.length;
    // Skip faces pointing away from the camera.
    if (normal[0] * (c.x - cx) + normal[1] * (c.y - cy) + normal[2] * (c.height - cz) <= 0) return;
    const scr = [];
    for (const p of pts) {
      const s = this.project(p[0], p[1], p[2]);
      if (s.z < NEAR) return;
      scr.push(s);
    }
    const fill = shade(color, lightFor(normal[0], normal[1], normal[2]));
    this.add({
      depth: this.depth(cx, cy) - bias,
      draw(ctx) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(scr[0].x, scr[0].y);
        for (let i = 1; i < scr.length; i++) ctx.lineTo(scr[i].x, scr[i].y);
        ctx.closePath();
        ctx.fill();
        // A hairline of the same colour hides tiny gaps between faces.
        ctx.strokeStyle = fill;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      },
    });
  }

  // A box on an object that faces `heading`, in the object's own coordinates:
  // x forwards, y to the right, z up.
  box(ox, oy, heading, x0, x1, y0, y1, z0, z1, color) {
    const fx = Math.cos(heading), fy = Math.sin(heading);
    const rx = -fy, ry = fx;
    const P = (lx, ly, z) => [ox + fx * lx + rx * ly, oy + fy * lx + ry * ly, z];
    const a = P(x0, y0, 0), b = P(x1, y0, 0), cc = P(x1, y1, 0), d = P(x0, y1, 0);
    const at = (p, z) => [p[0], p[1], z];
    this.face([at(a, z1), at(b, z1), at(cc, z1), at(d, z1)], [0, 0, 1], color);      // top
    this.wall(b, cc, z0, z1, [fx, fy, 0], color);    // front
    this.wall(a, d, z0, z1, [-fx, -fy, 0], color);   // back
    this.wall(d, cc, z0, z1, [rx, ry, 0], color);    // right
    this.wall(a, b, z0, z1, [-rx, -ry, 0], color);   // left
  }

  // A tall flat wall from base point p to base point q. Long walls are cut
  // into pieces so they sort properly against things standing in front of them.
  wall(p, q, z0, z1, normal, color, bias = 0) {
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 60));
    for (let i = 0; i < n; i++) {
      const ax = p[0] + ((q[0] - p[0]) * i) / n, ay = p[1] + ((q[1] - p[1]) * i) / n;
      const bx = p[0] + ((q[0] - p[0]) * (i + 1)) / n, by = p[1] + ((q[1] - p[1]) * (i + 1)) / n;
      this.face([[ax, ay, z0], [bx, by, z0], [bx, by, z1], [ax, ay, z1]], normal, color, bias);
    }
  }

  kart(k) {
    if (!this.visible(k.x, k.y, 20)) return;
    const h = k.heading, x = k.x, y = k.y;
    const B = (x0, x1, y0, y1, z0, z1, color) => this.box(x, y, h, x0, x1, y0, y1, z0, z1, color);
    B(-12, 12, -6, 6, 1, 2, '#2a2a2a');              // chassis
    B(-13, -12, -6, 6, 1, 4, '#333333');             // rear bumper
    B(6, 11, 5.5, 8.5, 0, 5, '#151515');             // front wheels
    B(6, 11, -8.5, -5.5, 0, 5, '#151515');
    B(-12, -5, 5.5, 9.5, 0, 5.5, '#151515');         // rear wheels
    B(-12, -5, -9.5, -5.5, 0, 5.5, '#151515');
    B(7, 13, -5, 5, 1.5, 4.5, k.body);               // nose
    B(-6, 6, 3.5, 6.5, 1.5, 4.5, k.body);            // side pods
    B(-6, 6, -6.5, -3.5, 1.5, 4.5, k.body);
    B(-7, 7, -3.5, 3.5, 2, 6, k.body);               // body
    if (k.stripes) {
      const w = 1.1, n = k.stripes.length;
      k.stripes.forEach((c, i) => B(-7, 13, (i - n / 2) * w, (i - n / 2 + 1) * w, 4.5, 6.3, c));
    } else {
      B(-7, 13, -1.2, 1.2, 4.5, 6.3, k.trim);        // racing stripe
    }
    B(-6, -1.5, -2.5, 2.5, 6, 9.5, k.trim);          // driver's body
    // Helmet: a circle.
    const hx = x + Math.cos(h) * -3.5, hy = y + Math.sin(h) * -3.5;
    const s = this.project(hx, hy, 11.8);
    if (s.z > NEAR) {
      const r = (2.5 * this.f) / s.z;
      const color = k.helmet;
      this.add({
        depth: this.depth(hx, hy) - 0.5,
        draw(ctx) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.arc(s.x + r * 0.2, s.y + r * 0.15, r * 0.8, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
  }

  pyramid(item) {
    const { x, y, size } = item;
    const h = size / 2, top = size * 0.63;
    if (!this.visible(x, y, h * 1.5)) return;
    const apex = [x, y, top];
    const color = '#dcbc7c';
    this.face([[x - h, y - h, 0], [x + h, y - h, 0], apex], [0, -top, h], color);
    this.face([[x + h, y - h, 0], [x + h, y + h, 0], apex], [top, 0, h], color);
    this.face([[x + h, y + h, 0], [x - h, y + h, 0], apex], [0, top, h], color);
    this.face([[x - h, y + h, 0], [x - h, y - h, 0], apex], [-top, 0, h], color);
  }

  palm(item) {
    const { x, y, size, rot } = item;
    const height = size * 4.2;
    if (!this.visible(x, y, size * 1.5)) return;
    const base = this.project(x, y, 0);
    const top = this.project(x + size * 0.3, y, height);
    if (base.z < NEAR || top.z < NEAR) return;
    const f = this.f;
    this.add({
      depth: this.depth(x, y),
      draw(ctx) {
        ctx.strokeStyle = '#7a5530';
        ctx.lineWidth = Math.max(1, (2.4 * f) / base.z);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.quadraticCurveTo(base.x, (base.y + top.y) / 2, top.x, top.y);
        ctx.stroke();
        const r = (size * 1.1 * f) / top.z;
        for (let i = 0; i < 7; i++) {
          const a = rot + (i / 7) * Math.PI * 2;
          ctx.fillStyle = i % 2 ? '#3f7d2c' : '#4f9a36';
          ctx.beginPath();
          ctx.ellipse(top.x + Math.cos(a) * r * 0.55, top.y + Math.sin(a) * r * 0.22 + r * 0.12,
            r * 0.6, r * 0.18, Math.sin(a) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }

  stand(item) {
    const cx = item.x + item.w / 2, cy = item.y + item.h / 2;
    if (!this.visible(cx, cy, item.w / 2)) return;
    // A box whose front (facing the track) is full of fans.
    this.box(cx, cy, 0, -item.w / 2, item.w / 2, -item.h / 2, item.h / 2, 0, 26, '#8a8a8a');
    this.box(cx, cy, 0, -item.w / 2, item.w / 2, item.h / 2 - 1, item.h / 2 + 1, 18, 26, COLORS.red); // banner
  }

  // A city building: a tall box with rows of dark windows.
  building(b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!this.visible(cx, cy, Math.hypot(b.w, b.h) / 2)) return;
    this.box(cx, cy, 0, -b.w / 2, b.w / 2, -b.h / 2, b.h / 2, 0, b.height, b.color);
    if (this.depth(cx, cy) > 450) return; // too far away to see windows
    const sides = [
      [[b.x, b.y + b.h], [b.x + b.w, b.y + b.h], [0, 1]],     // south
      [[b.x, b.y], [b.x + b.w, b.y], [0, -1]],                // north
      [[b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [1, 0]],     // east
      [[b.x, b.y], [b.x, b.y + b.h], [-1, 0]],                // west
    ];
    for (const [p, q, nrm] of sides) {
      // Skip walls we can't see, then push the windows out a hair so they sit on the wall.
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (nrm[0] * (this.cam.x - mx) + nrm[1] * (this.cam.y - my) <= 0) continue;
      const o = 0.4;
      const pp = [p[0] + nrm[0] * o, p[1] + nrm[1] * o], qq = [q[0] + nrm[0] * o, q[1] + nrm[1] * o];
      for (let z = 7; z + 6 < b.height; z += 12) {
        this.wall(pp, qq, z, z + 6, [nrm[0], nrm[1], 0], '#34404f', 1);
      }
    }
  }

  // Cairo Tower: a tall shaft with the lattice "lotus" head.
  tower(t) {
    const k = t.r / 26; // the tower is drawn bigger on a bigger map
    if (!this.visible(t.x, t.y, 30 * k)) return;
    this.box(t.x, t.y, 0, -5 * k, 5 * k, -5 * k, 5 * k, 0, 118 * k, '#c4bcae');
    this.box(t.x, t.y, 0, -13 * k, 13 * k, -13 * k, 13 * k, 118 * k, 142 * k, '#a39b8c');
    this.box(t.x, t.y, 0, -8 * k, 8 * k, -8 * k, 8 * k, 142 * k, 150 * k, '#d8d1c3');
    this.box(t.x, t.y, 0, -2 * k, 2 * k, -2 * k, 2 * k, 150 * k, 176 * k, '#c4bcae');
  }

  // A felucca: brown hull and a white triangular sail (seen from both sides).
  felucca(f) {
    if (!this.visible(f.x, f.y, 30)) return;
    this.box(f.x, f.y, f.rot, -19, 19, -4, 4, 0, 4, '#7a4b25');
    this.box(f.x, f.y, f.rot, 12, 20, -2.5, 2.5, 0, 7, '#6a3f1f'); // raised bow
    const fx = Math.cos(f.rot), fy = Math.sin(f.rot), rx = -fy, ry = fx;
    const P = (lx, z) => [f.x + fx * lx, f.y + fy * lx, z];
    const sail = [P(-16, 4), P(17, 4), P(9, 46)];
    this.face(sail, [rx, ry, 0], '#f6f1e4');
    this.face(sail, [-rx, -ry, 0], '#f6f1e4');
  }

  draw(ctx) {
    this.items.sort((a, b) => b.depth - a.depth);
    for (const it of this.items) {
      ctx.globalAlpha = it.alpha;
      it.draw(ctx);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Putting a whole 3D view together ----------

const grounds = new Map();
function groundFor(track) {
  if (!grounds.has(track)) grounds.set(track, new Ground(track));
  return grounds.get(track);
}

// Where the camera is for a view mode, following the player's kart.
function cameraFor(mode, kart, heading, time) {
  const c = CAMERAS[mode];
  // A little shake — more on the sand.
  const shake = (kart.onSand ? 0.006 : 0.0012) * Math.min(1, kart.speed / 200) * Math.sin(time * 55);
  return {
    x: kart.x - Math.cos(heading) * c.back,
    y: kart.y - Math.sin(heading) * c.back,
    heading,
    height: c.height,
    horizon: c.horizon + shake,
    zoom: c.zoom,
  };
}

function draw3DView(ctx, vp, race, player, mode, camHeading, time) {
  const cam = cameraFor(mode, player.kart, camHeading, time);
  const hy = vp.y + cam.horizon * vp.h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(vp.x, vp.y, vp.w, vp.h);
  ctx.clip();

  drawSky(ctx, vp, cam, hy);
  ctx.fillStyle = 'rgb(' + FOG.rgb.join(',') + ')';
  ctx.fillRect(vp.x, hy, vp.w, vp.y + vp.h - hy);

  // Ground at half resolution, stretched to fit (much faster, still looks good).
  const bw = Math.round(vp.w / 2), bh = Math.round(vp.h / 2);
  const ground = groundFor(race.track).render(cam, bw, bh);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(ground, vp.x, vp.y, vp.w, vp.h);

  const scene = new Scene(cam, vp);
  for (const item of race.track.getScenery()) {
    if (item.type === 'pyramid') scene.pyramid(item);
    else if (item.type === 'palm') scene.palm(item);
    else if (item.type === 'stand') scene.stand(item);
    else if (item.type === 'building') scene.building(item);
    else if (item.type === 'tower') scene.tower(item);
    else if (item.type === 'felucca') scene.felucca(item);
  }
  for (const r of race.racers) {
    if (mode === 'cockpit' && r === player) continue; // you're sitting in it
    scene.kart(r.kart);
  }
  // Your ghost, see-through. (In your own seat you can't see it while it's on top of you.)
  if (race.ghost) {
    const gk = race.ghost.kart;
    if (mode !== 'cockpit' || Math.hypot(gk.x - player.kart.x, gk.y - player.kart.y) > 16) {
      scene.alpha = 0.5;
      scene.kart(gk);
      scene.alpha = 1;
    }
  }
  scene.draw(ctx);

  if (mode === 'cockpit') drawCockpit(ctx, vp, player.kart);
  ctx.restore();
}

// ---------- The driver's seat ----------

function drawCockpit(ctx, vp, kart) {
  const W = vp.w, H = vp.h, x0 = vp.x, y0 = vp.y;
  const steer = kart.steerVisual;

  // Front tyres, turning with the steering.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(x0 + W / 2 + side * W * 0.34, y0 + H * 0.9);
    ctx.rotate(steer * 0.3);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.roundRect(-W * 0.055, -H * 0.13, W * 0.11, H * 0.3, W * 0.02);
    ctx.fill();
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = Math.max(1, H * 0.006);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-W * 0.045, i * H * 0.035);
      ctx.lineTo(W * 0.045, i * H * 0.035);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Nose of the kart in team colours.
  ctx.fillStyle = kart.body;
  ctx.beginPath();
  ctx.moveTo(x0 + W * 0.22, y0 + H);
  ctx.lineTo(x0 + W * 0.4, y0 + H * 0.8);
  ctx.lineTo(x0 + W * 0.6, y0 + H * 0.8);
  ctx.lineTo(x0 + W * 0.78, y0 + H);
  ctx.closePath();
  ctx.fill();
  const stripes = kart.stripes || [kart.trim];
  stripes.forEach((c, i) => {
    const n = stripes.length, sw = 0.03 / n;
    const a = -0.015 + i * sw;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x0 + W * (0.5 + a * 1.6), y0 + H);
    ctx.lineTo(x0 + W * (0.5 + a), y0 + H * 0.8);
    ctx.lineTo(x0 + W * (0.5 + a + sw), y0 + H * 0.8);
    ctx.lineTo(x0 + W * (0.5 + (a + sw) * 1.6), y0 + H);
    ctx.closePath();
    ctx.fill();
  });

  // Steering wheel.
  const R = H * 0.3;
  const cx = x0 + W / 2, cy = y0 + H * 1.0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(steer * 1.4);
  ctx.lineCap = 'round';
  // Spokes.
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = R * 0.12;
  for (const a of [Math.PI, 0, Math.PI / 2]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.stroke();
  }
  // Rim.
  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = R * 0.17;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  // Grips in team colour.
  ctx.strokeStyle = kart.body;
  ctx.lineWidth = R * 0.19;
  for (const a of [Math.PI, 0]) {
    ctx.beginPath();
    ctx.arc(0, 0, R, a - 0.45, a + 0.45);
    ctx.stroke();
  }
  // Top marker so you can see which way the wheel is turned.
  ctx.strokeStyle = kart.trim;
  ctx.lineWidth = R * 0.19;
  ctx.beginPath();
  ctx.arc(0, 0, R, -Math.PI / 2 - 0.08, -Math.PI / 2 + 0.08);
  ctx.stroke();
  // Gloves.
  for (const a of [Math.PI + 0.35, -0.35]) {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R, Math.sin(a) * R, R * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kart.trim;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.12, R * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hub.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Speed display in the middle of the wheel (kept level so it's easy to read).
  ctx.fillStyle = '#0c1a0c';
  ctx.beginPath();
  ctx.roundRect(cx - R * 0.36, cy - R * 0.62, R * 0.72, R * 0.28, R * 0.05);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold ' + Math.round(R * 0.2) + 'px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kart.kmh + ' km/h', cx, cy - R * 0.48);
}
