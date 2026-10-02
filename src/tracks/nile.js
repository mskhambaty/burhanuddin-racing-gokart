// Track 3: Nile Corniche.
//
// A fast circuit around a stretch of the Nile: long straights, two big
// sweeping corners at each end and a diagonal chicane on both straights.
// The river fills the middle, with Zamalek island, the Cairo Tower and a few
// feluccas (traditional sailboats). The corners are [x, y, corner radius].

TRACKS.nile = new Track({
  id: 'nile',
  name: 'Nile Corniche',
  subtitle: 'Along the Nile, Cairo',
  laps: RACE_LAPS,
  seed: 1971,
  colors: {
    desert: '#a9bd78',        // gardens along the river
    runoff: '#e2d6b0',        // the promenade
    road: '#4a4a4c',
    tyres: '#2b2b2b',
    wallStripe: '#c0392b',
    speckleDark: 'rgba(40,90,30,0.13)',
    speckleLight: 'rgba(255,255,220,0.12)',
  },
  points: roundedLoop(scaleCorners([
    [900, 590, 0],     // start / finish straight (driving left)
    [720, 590, 55],    // bottom chicane
    [650, 520, 55],
    [550, 520, 55],
    [480, 590, 55],
    [150, 590, 150],   // big sweeper at the west end
    [150, 130, 150],
    [560, 130, 55],    // top chicane
    [630, 200, 55],
    [730, 200, 55],
    [800, 130, 55],
    [1130, 130, 150],  // big sweeper at the east end
    [1130, 590, 150],
  ])),

  // Paint the Nile inside the track, with an island in the middle.
  paintGround(ctx, track, rand) {
    // Water everywhere inside the loop (the road is drawn over its edges).
    const inside = new Path2D();
    track.points.forEach((p, i) => (i === 0 ? inside.moveTo(p.x, p.y) : inside.lineTo(p.x, p.y)));
    inside.closePath();
    const S = TRACK_SCALE;
    const g = ctx.createLinearGradient(0, 120 * S, 0, 600 * S);
    g.addColorStop(0, '#2f7fbd');
    g.addColorStop(0.5, '#4a9bd3');
    g.addColorStop(1, '#2f7fbd');
    ctx.fillStyle = g;
    ctx.fill(inside);

    // Ripples.
    ctx.save();
    ctx.clip(inside);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 260 * S * S; i++) {
      const x = rand() * WORLD_WIDTH, y = (100 + rand() * 540) * S, w = 8 + rand() * 18;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w / 2, y - 3, x + w, y);
      ctx.stroke();
    }
    ctx.restore();

    // Zamalek island: sandy edge, then gardens.
    const island = (rx, ry, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(650 * S, 372 * S, rx * S, ry * S, -0.08, 0, Math.PI * 2);
      ctx.fill();
    };
    island(250, 102, '#e6dcb8');
    island(238, 92, '#7fa64f');
    ctx.fillStyle = '#6f9a45';
    for (let i = 0; i < 80 * S * S; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
      ctx.beginPath();
      ctx.arc((650 + Math.cos(a) * d * 220) * S, (372 + Math.sin(a) * d * 80) * S, 3 + rand() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  buildScenery(track, rand) {
    const items = [];
    const S = TRACK_SCALE;

    // Cairo Tower on the island.
    items.push({ type: 'tower', x: 640 * S, y: 372 * S, r: 26 * S });

    // Buildings and palms on the island.
    const islandBuildings = [
      [500, 335, 46, 34, 30, '#d8c7ab'], [548, 400, 40, 30, 24, '#c6b39b'],
      [760, 340, 50, 34, 34, '#cdb89a'], [726, 402, 44, 30, 26, '#dccdb5'],
      [580, 320, 30, 24, 40, '#bfa987'], [700, 320, 30, 24, 28, '#b09c82'],
    ];
    for (const [x, y, w, h, height, color] of islandBuildings) {
      items.push({ type: 'building', x: x * S, y: y * S, w: w * S, h: h * S, height: height * 1.4, color });
    }
    for (let i = 0; i < 26 * S * S; i++) {
      const a = rand() * Math.PI * 2, d = 0.35 + rand() * 0.6;
      const x = (650 + Math.cos(a) * d * 215) * S, y = (372 + Math.sin(a) * d * 76) * S;
      const size = 11 + rand() * 6;
      const blocked = items.some((o) => o.w !== undefined && x > o.x - size && x < o.x + o.w + size && y > o.y - size && y < o.y + o.h + size)
        || Math.hypot(x - 640 * S, y - 372 * S) < 40 * S;
      if (!blocked) items.push({ type: 'palm', x, y, size, rot: rand() * Math.PI * 2 });
    }

    // Feluccas drifting on the river.
    const feluccas = [[300, 260, 0.2], [360, 470, -0.3], [960, 250, 2.9], [1010, 460, 0.5], [880, 330, 3.4], [430, 300, 0.1],
      [560, 250, 0.4], [740, 480, 3.0], [820, 260, -0.2], [400, 400, 2.6]];
    for (const [x, y, rot] of feluccas) {
      if (track.locate(x * S, y * S).dist > track.wallDist + 30) items.push({ type: 'felucca', x: x * S, y: y * S, rot });
    }

    // Buildings along the outside of the corniche, palms in the gardens.
    items.push(...scatterBuildings(track, rand, {
      tries: 900 * S * S,
      minSize: 40, maxSize: 90,
      minHeight: 26, maxHeight: 70,
      colors: ['#d6c6a8', '#c4b092', '#e0d3ba', '#b8a48a', '#cfbfa5'],
      existing: items,
      allowed: (x, y, w, h) => {
        // Only outside the loop, not out in the water.
        const cx = x + w / 2, cy = y + h / 2;
        return !isInsideLoop(track, cx, cy);
      },
    }));
    for (let i = 0; i < 160 * S * S; i++) {
      const x = 14 + rand() * (WORLD_WIDTH - 28), y = 14 + rand() * (WORLD_HEIGHT - 28);
      const size = 11 + rand() * 7;
      if (isInsideLoop(track, x, y)) continue;
      const onBuilding = items.some((o) => o.w !== undefined && x > o.x - size && x < o.x + o.w + size && y > o.y - size && y < o.y + o.h + size);
      if (!onBuilding && track.isClear(x, y, size) && rand() < 0.5) items.push({ type: 'palm', x, y, size, rot: rand() * Math.PI * 2 });
    }
    return items;
  },
});

// Is (x, y) inside the loop the road makes? (Counting how many times a ray crosses it.)
function isInsideLoop(track, x, y) {
  const pts = track.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
