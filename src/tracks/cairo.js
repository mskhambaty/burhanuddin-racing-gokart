// Track 2: Cairo City Circuit.
//
// Tight streets between the buildings of downtown Cairo: lots of 90° corners,
// two zig-zags and a square notch. The corners are [x, y, corner radius] in
// the order you drive them; the first point is the start/finish line.

TRACKS.cairo = new Track({
  id: 'cairo',
  name: 'Cairo City Circuit',
  subtitle: 'Downtown, Cairo',
  laps: 3,
  seed: 1952,
  colors: {
    desert: '#c9bda5',        // paving stones between the buildings
    runoff: '#ddd3bd',
    road: '#48484b',
    tyres: '#efefef',         // concrete barriers
    wallStripe: '#cf3a2f',
    speckleDark: 'rgba(90,80,60,0.10)',
    speckleLight: 'rgba(255,255,255,0.16)',
  },
  points: roundedLoop([
    [880, 605, 0],     // start / finish straight (driving left)
    [140, 605, 65],    // turn 1: tight right
    [140, 455, 55],    // zig-zag up the west side
    [290, 455, 55],
    [290, 300, 55],
    [140, 300, 55],
    [140, 120, 65],    // top-left corner
    [560, 120, 55],    // the square notch
    [560, 260, 55],
    [760, 260, 55],
    [760, 120, 55],
    [1140, 120, 65],   // top-right corner
    [1140, 330, 55],   // zig-zag down the east side
    [990, 330, 55],
    [990, 470, 55],
    [1140, 470, 55],
    [1140, 605, 65],   // last corner onto the start straight
  ]),

  buildScenery(track, rand) {
    const items = [];

    // A grandstand inside the first straight.
    const stand = { type: 'stand', x: 640, y: 496, w: 200, h: 24 };
    if (rectIsClear(track, stand.x, stand.y, stand.w, stand.h)) items.push(stand);

    // Sandstone-coloured blocks of flats, offices and shops.
    items.push(...scatterBuildings(track, rand, {
      tries: 3000,
      minSize: 28, maxSize: 90,
      minHeight: 24, maxHeight: 62,
      colors: ['#cdb89a', '#bfa987', '#d8c7ab', '#b09c82', '#c6b39b', '#a89887', '#dccdb5', '#c2a58a'],
      existing: [stand],
    }));

    // A few palm trees in the gaps.
    for (let i = 0; i < 200; i++) {
      const x = 14 + rand() * (GAME_WIDTH - 28), y = 14 + rand() * (GAME_HEIGHT - 28);
      const size = 11 + rand() * 6;
      const rot = rand() * Math.PI * 2;
      const onBuilding = items.some((o) => o.w !== undefined && x > o.x - size && x < o.x + o.w + size && y > o.y - size && y < o.y + o.h + size);
      if (!onBuilding && track.isClear(x, y, size)) items.push({ type: 'palm', x, y, size, rot });
    }
    return items;
  },
});
