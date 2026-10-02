// Track 1: Giza Pyramids Circuit.
//
// The points are the middle of the road, in the order you drive them.
// The first point is the start/finish line. The points are drawn on a one-screen
// (1280 x 720) map and scaled up by TRACK_SCALE (see util.js) for the real, bigger map.
// Try moving a point and reloading the page to see the track change!

TRACKS.giza = new Track({
  id: 'giza',
  name: 'Giza Pyramids Circuit',
  subtitle: 'Giza, Cairo',
  laps: RACE_LAPS,
  seed: 2026,
  points: scaleControlPoints([
    [800, 600],  // start / finish straight (driving left)
    [560, 602],
    [330, 610],
    [185, 540],  // turn 1: long left-hander
    [150, 400],
    [190, 250],
    [310, 160],
    [470, 150],
    [560, 250],  // the "pyramid dip"
    [640, 370],
    [760, 380],
    [840, 260],
    [960, 150],
    [1100, 170], // fast right-hander
    [1160, 300],
    [1080, 420], // chicane
    [1130, 530],
    [1020, 600],
  ]),

  // Everything beside the track. Returns a list of scenery items.
  buildScenery(track, rand) {
    const items = [];
    const S = TRACK_SCALE;

    // Pyramids of Khufu, Khafre and Menkaure (biggest first): [x, y, size].
    const pyramids = [
      [390 * S, 390 * S, 130 * S],
      [645 * S, 84 * S, 80 * S],
      [52 * S, 668 * S, 56 * S],
    ];
    for (const [x, y, size] of pyramids) {
      if (track.isClear(x, y, size * 0.72)) items.push({ type: 'pyramid', x, y, size });
    }

    // Grandstand beside the start/finish straight.
    const stand = { type: 'stand', x: 600 * S, y: 1090, w: 200 * S, h: 24 };
    if (rectIsClear(track, stand.x, stand.y, stand.w, stand.h)) items.push(stand);

    // Palm trees scattered wherever there is space.
    for (let i = 0; i < 120 * S * S; i++) {
      const x = 20 + rand() * (WORLD_WIDTH - 40);
      const y = 20 + rand() * (WORLD_HEIGHT - 40);
      const size = 12 + rand() * 8;
      const rot = rand() * Math.PI * 2;
      const nearPyramid = pyramids.some(([px, py, s]) => Math.hypot(px - x, py - y) < s * 0.8 + size);
      const onStand = x > stand.x - size && x < stand.x + stand.w + size && y > stand.y - size && y < stand.y + stand.h + size;
      if (!nearPyramid && !onStand && track.isClear(x, y, size) && rand() < 0.45) {
        items.push({ type: 'palm', x, y, size, rot });
      }
    }
    return items;
  },
});
