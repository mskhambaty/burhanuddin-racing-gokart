# Burhanuddin Racing — Cairo Go-Kart Game Plan

A simple go-kart racing game set in Cairo. You race against computer drivers,
win prize money (Egyptian pounds, EGP), and spend it in your garage to upgrade
your kart and hire drivers for your team. It runs in a web browser on a laptop
and is built in small steps so it can grow over time.

---

## 1. The game in one paragraph

You start with a slow kart, 500 EGP, and a dream. You enter a race on a Cairo
track, drive 10 laps against 5 computer drivers, and get paid depending on where
you finish. Back in the garage you buy a better engine, grippier tyres, or hire
a teammate who races alongside you and brings in extra money. Win enough races
and you unlock new tracks, from the Giza Pyramids to the streets of Downtown.

## 2. Core game loop

```
  ┌──────────┐     pick a race      ┌──────────┐
  │  GARAGE  │ ───────────────────▶ │   RACE   │
  │ upgrade  │                      │ 10 laps  │
  │ hire     │ ◀─────────────────── │ vs AI    │
  └──────────┘   prize money (EGP)  └──────────┘
```

1. **Garage** – see your money, kart stats, and team. Buy upgrades or hire drivers.
2. **Pick a race** – choose a track (locked tracks need a certain number of wins or trophies).
3. **Race** – countdown, 10 laps, finish position decides the prize.
4. **Results** – prize money added, teammates' earnings added, salaries paid.
5. Back to the garage. Progress saves automatically.

## 3. Key decisions (recommended)

| Decision | Recommendation | Why |
|---|---|---|
| View | **2D top-down** (like classic Micro Machines) | Much simpler to build and change than 3D; still fun and fast. 3D can come much later. |
| Technology | **Plain JavaScript + HTML5 Canvas**, no install | Open `index.html` in Chrome and play. Easy for a 14-year-old to read and tweak. |
| Controls | **Trackpad** (slide to steer, auto-accelerate, hold to brake), or keyboard | The MacBook Air's small arrow keys are hard to use; the trackpad is easier. |
| Views | **Steering wheel** (main), **rear**, **top down** — switch with C or the 👁 button | 3D views use the "Mode 7" trick from classic kart games: no install, runs in any browser. |
| Driving feel | **Realistic karting** — no power-ups or boosts | Grip, braking points and racing lines matter. Sand run-off slows you down; tyre walls stop you. |
| Saving | Browser `localStorage` | Money and upgrades survive closing the laptop. No server needed. |
| Money | Egyptian pounds (EGP) | Makes it feel local. |
| Language | English first, Arabic labels later | Arabic text support is an easy later add-on. |

## 4. Cairo tracks (start with 1, add more over time)

Each track is just a list of points (the centre line) plus a width, so new tracks
can be designed by editing numbers — a great thing for your nephew to try himself.

| # | Track | Idea |
|---|---|---|
| 1 | **Giza Pyramids Circuit** | Wide, sandy, flowing. The three pyramids in the infield, palm trees, grandstand. |
| 2 | **Cairo City Circuit** | Tight downtown streets between buildings: 90° corners, two zig-zags and a square notch. |
| 3 | **Nile Corniche** | Fast straights and big sweepers around the river, with Zamalek island, the Cairo Tower and feluccas. |

The tracks are on a map four screens big (twice as wide and twice as high): laps take about 25–50 seconds.
The top-down view follows the kart, and there is a minimap in the 3D views.

All three are available from the start and picked in the garage (unlocking by wins is still an idea for later).

Later: Khan el-Khalili, Zamalek & Cairo Tower, Downtown night race, and other Middle East
cities (Dubai Marina, Riyadh, Amman/Petra desert, Alexandria seaside).

## 5. Karts, upgrades and money

### Kart stats
- **Top speed** – how fast on straights
- **Acceleration** – how quickly you get up to speed
- **Grip** – how well it turns without sliding
- **Brakes** – how quickly it slows down

### Upgrades (each has levels 1 → 5)
| Part | Improves | Price per level (EGP) |
|---|---|---|
| Engine | Top speed, +10% per level (90 → 126 km/h), then PRO levels 6–10 (→ 153 km/h) | 400, 800, 1,500, 3,000; PRO 4,000 … 18,000 |
| Gearbox | Acceleration, +25% per level (twice as quick at level 5); PRO 6–10 | 300, 600, 1,200, 2,500; PRO 3,500 … 15,000 |
| Tyres | Grip +15% per level, and turns 4% quicker; PRO 6–10 | 300, 600, 1,200, 2,500; PRO 3,500 … 15,000 |
| Brakes | Braking, +20% per level; PRO 6–10 | 200, 400, 800, 1,600; PRO 2,000 … 9,000 |
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

### Phase 0 — Setup ✅ done
- `index.html` + `src/` folder, a game loop that draws to a canvas.
- README with "how to play / how to run".

### Phase 1 — Drive a kart ✅ done (first playable)
- A kart you can steer with realistic-ish handling: accelerate, brake, turn, slide a little when pushing hard.
- Giza Pyramids track: road, sand off-track (slows you down), walls/barriers.
- Checkpoints so laps only count if you go all the way around.
- Lap counter and lap timer, best lap time.

### Phase 2 — Race against the computer ✅ done
- 5 AI karts that follow a racing line, brake for corners, overtake and make small mistakes.
- Easy / Medium / Hard difficulty: the computer drivers' top speed is about 60 / 78 / 100 km/h.
- Start grid, 3-2-1-GO countdown, live position (1st/6th), finish screen.
- Kart-to-kart bumping.

### Phase 3 — Money and garage ✅ done
- Prize money after each race.
- Garage screen: money, kart stats bars, buy upgrades.
- Upgrades really change how the kart drives.
- Auto-save / load with `localStorage`, plus a "New career" option (press R twice in the garage).

### Phase 4 — Team and career
- Driver Market: hire / fire drivers, teammates race with you, salaries.
- More tracks (Khan el-Khalili, Downtown night race, …), optional track unlocks, and a trophy count.
- A simple 3-race "Cairo Cup" championship with points.

### Phase 5 — Polish
- Sound: engine hum, countdown beeps, crowd cheer, garage music.
- Nicer art: pyramids, palm trees, Nile, minarets, kart sprites, dust from sand.
- Minimap, speedometer, "wrong way!" warning.
- Arabic / English language option.

### Future ideas (once the basics are solid)
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
│   ├── tracks/         # one file per track (giza.js, cairo.js, nile.js)
│   ├── ghost.js        # records races, replays your best as the ghost
│   ├── ai.js           # computer drivers
│   ├── race.js         # laps, positions, countdown, results
│   ├── hud.js          # lap panels, countdown, menus, minimap
│   ├── view3d.js       # 3D views: steering wheel + rear camera
│   ├── teams.js        # teams the player can race for
│   ├── util.js         # small shared helpers
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

## 10. Decisions made

1. **2D top-down** to start, then 3D views added (steering wheel, rear).
2. **Realistic karting** — no power-ups.
3. **One player only** (two-player mode was tried and removed). Drive with the **trackpad** (default) or keyboard.
4. Team: **Burhanuddin Racing**, **red & gold**.
5. Tracks: **Giza Pyramids, Cairo City, Nile Corniche** (picked in the garage).
6. The player picks a team: **Burhanuddin Racing** (red & gold), **Mercedes**, **BMW**,
   **Ferrari**, **Red Bull** or **McLaren** — colours and names only, no logos.
   Picked in the garage.
7. **Three views:** steering wheel (main), rear, top down.
8. **YOU mode:** race a see-through ghost of your own best race on the track (exact replay).
   Set by any finished race; per track; no prizes.
9. Computer-driver top speeds: **Easy ≈ 60, Medium ≈ 78, Hard ≈ 100 km/h.**
10. **Big tracks:** the map is `TRACK_SCALE` (2) times bigger than one screen; the top-down camera follows the kart.
11. **Upgrades are big:** engine 90 → 126 km/h, gearbox twice the acceleration, shown in real numbers in the garage.
12. **Races are 10 laps** on every track (`RACE_LAPS` in `src/util.js`). Ghosts saved from shorter races are not used.
13. **Wide roads:** 90 px of asphalt (was 60), set by `ROAD_WIDTH` in `src/util.js`.
14. **Money sinks (done):** PRO upgrade levels 6–10; the paint & number shop; hiring up to 2 teammates (signing fee + salary per race).
15. **The player chooses 1–10 laps.** Prizes and salaries scale with the number of laps; each track and lap count has its own ghost.
