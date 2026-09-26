# Burhanuddin Racing — Cairo Go-Kart Game Plan

A simple go-kart racing game set in Cairo. You race against computer drivers,
win prize money (Egyptian pounds, EGP), and spend it in your garage to upgrade
your kart and hire drivers for your team. It runs in a web browser on a laptop
and is built in small steps so it can grow over time.

---

## 1. The game in one paragraph

You start with a slow kart, 500 EGP, and a dream. You enter a race on a Cairo
track, drive 3 laps against 5 computer drivers, and get paid depending on where
you finish. Back in the garage you buy a better engine, grippier tyres, or hire
a teammate who races alongside you and brings in extra money. Win enough races
and you unlock new tracks, from the Giza Pyramids to the streets of Downtown.

## 2. Core game loop

```
  ┌──────────┐     pick a race      ┌──────────┐
  │  GARAGE  │ ───────────────────▶ │   RACE   │
  │ upgrade  │                      │ 3 laps   │
  │ hire     │ ◀─────────────────── │ vs AI    │
  └──────────┘   prize money (EGP)  └──────────┘
```

1. **Garage** – see your money, kart stats, and team. Buy upgrades or hire drivers.
2. **Pick a race** – choose a track (locked tracks need a certain number of wins or trophies).
3. **Race** – countdown, 3 laps, finish position decides the prize.
4. **Results** – prize money added, teammates' earnings added, salaries paid.
5. Back to the garage. Progress saves automatically.

## 3. Key decisions (recommended)

| Decision | Recommendation | Why |
|---|---|---|
| View | **2D top-down** (like classic Micro Machines) | Much simpler to build and change than 3D; still fun and fast. 3D can come much later. |
| Technology | **Plain JavaScript + HTML5 Canvas**, no install | Open `index.html` in Chrome and play. Easy for a 14-year-old to read and tweak. |
| Controls | Arrow keys or WASD, Space = handbrake/drift | Works on any laptop keyboard. |
| Saving | Browser `localStorage` | Money and upgrades survive closing the laptop. No server needed. |
| Money | Egyptian pounds (EGP) | Makes it feel local. |
| Language | English first, Arabic labels later | Arabic text support is an easy later add-on. |

## 4. Cairo tracks (start with 1, add more over time)

Each track is just a list of points (the centre line) plus a width, so new tracks
can be designed by editing numbers — a great thing for your nephew to try himself.

| # | Track | Idea | Unlock |
|---|---|---|---|
| 1 | **Giza Pyramids Circuit** | Wide, sandy, easy. Pyramids and camels at the side of the track. | Start |
| 2 | **Nile Corniche Sprint** | Long straights along the river, a few sharp turns, feluccas on the water. | 1 win |
| 3 | **Khan el-Khalili Bazaar** | Narrow, twisty market alleys, lanterns and stalls. | 3 wins |
| 4 | **Zamalek & Cairo Tower** | Island loop around the tower, bridges. | 6 wins |
| 5 | **Downtown Tahrir Night Race** | Night race, tight city blocks, busy roundabout. | 10 wins |

Later: other Middle East cities (Dubai Marina, Riyadh, Amman/Petra desert, Alexandria seaside).

## 5. Karts, upgrades and money

### Kart stats
- **Top speed** – how fast on straights
- **Acceleration** – how quickly you get up to speed
- **Grip** – how well it turns without sliding
- **Brakes** – how quickly it slows down

### Upgrades (each has levels 1 → 5)
| Part | Improves | Price per level (EGP) |
|---|---|---|
| Engine | Top speed | 400, 800, 1,500, 3,000 |
| Gearbox | Acceleration | 300, 600, 1,200, 2,500 |
| Tyres | Grip | 300, 600, 1,200, 2,500 |
| Brakes | Braking | 200, 400, 800, 1,600 |
| Paint & number | Looks only | 100 each |

### Prize money (per race, 6 karts)
| Place | 1st | 2nd | 3rd | 4th | 5th | 6th |
|---|---|---|---|---|---|---|
| Prize (EGP) | 1,000 | 600 | 400 | 200 | 100 | 50 |

Harder tracks multiply prizes (e.g. ×1.5, ×2) and the computer drivers get faster.
Numbers will be tuned by playtesting — they all live in one file so they are easy to change.

## 6. Hiring drivers (your team)

- The **Driver Market** in the garage lists drivers with a name, a skill rating
  (1–5 stars), a signing fee, and a salary per race.
  Example drivers: *Omar "The Rocket"*, *Youssef*, *Mariam*, *Karim*, *Nour*.
- A hired driver races **in the same race as you** as a teammate (in your team colours).
- Their prize money goes to your team; their salary is paid after every race.
- You can hold up to 2 teammates at first; the limit grows as your team grows.
- Later idea: upgrade your teammates' karts too, and a "team championship" table.

## 7. Build phases

Each phase ends with something playable. We only move on when the current phase is fun.

### Phase 0 — Setup (short)
- `index.html` + `src/` folder, a game loop that draws to a canvas.
- README with "how to play / how to run".

### Phase 1 — Drive a kart ✅ first playable
- One kart you can steer: accelerate, brake, turn, drift a little.
- Giza Pyramids track: road, sand off-track (slows you down), walls/barriers.
- Checkpoints so laps only count if you go all the way around.
- Lap counter and lap timer, best lap time.

### Phase 2 — Race against the computer
- 5 AI karts that follow the track line with small mistakes and different speeds.
- Start grid, 3-2-1-GO countdown, live position (1st/6th), finish screen.
- Basic kart-to-kart bumping.

### Phase 3 — Money and garage
- Prize money after each race.
- Garage screen: money, kart stats bars, buy upgrades.
- Upgrades really change how the kart drives.
- Auto-save / load with `localStorage`, plus a "New game" button.

### Phase 4 — Team and career
- Driver Market: hire / fire drivers, teammates race with you, salaries.
- Track unlocks (Nile Corniche, Khan el-Khalili, …) and a trophy count.
- A simple 3-race "Cairo Cup" championship with points.

### Phase 5 — Polish
- Sound: engine hum, countdown beeps, crowd cheer, garage music.
- Nicer art: pyramids, palm trees, Nile, minarets, kart sprites, dust from sand.
- Minimap, speedometer, "wrong way!" warning.
- Arabic / English language option.

### Future ideas (once the basics are solid)
- 2 players on one laptop (WASD vs arrow keys, split or shared screen).
- Power-ups / boost pads (optional, arcade style).
- Weather: sandstorm races with lower visibility.
- Track editor so your nephew can draw his own tracks.
- More Middle East cities and a "Middle East Grand Prix" series.
- Online leaderboards or online racing (needs a server — much later).

## 8. Project structure

```
burhanuddin-racing-gokart/
├── index.html          # open this to play
├── README.md           # how to run and play
├── PLAN.md             # this plan
├── src/
│   ├── main.js         # game loop, switching between screens
│   ├── input.js        # keyboard controls
│   ├── kart.js         # kart movement / physics
│   ├── track.js        # drawing tracks, checkpoints, on/off-road
│   ├── tracks/         # one file per track (giza.js, corniche.js, ...)
│   ├── ai.js           # computer drivers
│   ├── race.js         # laps, positions, countdown, results
│   ├── garage.js       # garage screen, upgrades, driver market
│   ├── economy.js      # ALL prices, prizes, salaries in one place
│   └── save.js         # save/load progress
└── assets/             # images and sounds
```

## 9. How we'll know each phase is done

- **Phase 1:** You can drive 3 clean laps and see your lap times; cutting across the sand doesn't count a lap.
- **Phase 2:** A full race against 5 AI karts finishes with a correct results table.
- **Phase 3:** Winning a race and buying an engine upgrade makes the kart noticeably faster, and it's still there after reloading the page.
- **Phase 4:** A hired teammate races, earns money, and costs salary; new tracks unlock.
- **Phase 5:** Your nephew wants to keep playing. 🏁

## 10. Open questions for you and your nephew

1. Top-down 2D OK to start? (Recommended — 3D is much bigger work.)
2. Realistic karting, or arcade with boost pads / power-ups?
3. Should 2-player on one laptop come early (e.g. in Phase 2) instead of later?
4. Team name and colours? (Default: *Burhanuddin Racing*, gold & black.)
5. Any real Cairo places he'd love as a track?
