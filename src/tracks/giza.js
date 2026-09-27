// Track 1: Giza Pyramids Circuit.
//
// The points are the middle of the road, in the order you drive them.
// The first point is the start/finish line. The screen is 1280 x 720.
// Try moving a point and reloading the page to see the track change!

TRACKS.giza = new Track({
  id: 'giza',
  name: 'Giza Pyramids Circuit',
  subtitle: 'Giza, Cairo',
  laps: 3,
  seed: 2026,
  points: [
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
  ],

  decorate(ctx, track, rand) {
    // Pyramids of Khufu, Khafre and Menkaure (biggest first): [x, y, size].
    const pyramids = [
      [390, 390, 130],
      [645, 84, 80],
      [52, 668, 56],
    ];
    for (const [x, y, size] of pyramids) {
      if (track.isClear(x, y, size * 0.72)) drawPyramid(ctx, x, y, size);
    }

    // Grandstand beside the start/finish straight.
    const stand = { x: 600, y: 484, w: 200, h: 24 };
    const standClear = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1]]
      .every(([fx, fy]) => track.isClear(stand.x + fx * stand.w, stand.y + fy * stand.h, 0));
    if (standClear) drawGrandstand(ctx, stand.x, stand.y, stand.w, stand.h, rand);

    // Palm trees scattered wherever there is space.
    for (let i = 0; i < 120; i++) {
      const x = 20 + rand() * (GAME_WIDTH - 40);
      const y = 20 + rand() * (GAME_HEIGHT - 40);
      const size = 12 + rand() * 8;
      const nearPyramid = pyramids.some(([px, py, s]) => Math.hypot(px - x, py - y) < s * 0.8 + size);
      const onStand = x > stand.x - size && x < stand.x + stand.w + size && y > stand.y - size && y < stand.y + stand.h + size;
      if (!nearPyramid && !onStand && track.isClear(x, y, size) && rand() < 0.45) {
        drawPalm(ctx, x, y, size, rand);
      }
    }
  },
});
