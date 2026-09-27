# Burhanuddin Racing — Cairo Karting 🏁

A top-down go-kart racing game set in Cairo, built for laptop play.
See [PLAN.md](PLAN.md) for the full plan and what's coming next.

![Two karts on the Giza Pyramids Circuit](screenshot.png)

## How to play

1. Download or clone this folder.
2. Double-click **`index.html`** (opens in Chrome, Edge, Firefox or Safari). Nothing to install.
3. On the title screen:
   - **1 = Career.** Pick your team in the garage (← →), race for prize money
     (Egyptian pounds), then spend it on engine, gearbox, tyres and brake upgrades.
     Progress saves automatically.
   - **2 = Two players.** Each player picks a team (P1: A / D, P2: ← / →), then a
     quick race on one keyboard.
   - **D** changes how good the computer drivers are (Easy / Medium / Hard).
     Harder drivers pay bigger prizes: ×1.5 on Medium, ×2 on Hard.

In the garage use ↑ ↓ and Enter, or just click. Press **R** twice to start a new career.

| | Player 1 | Player 2 |
|---|---|---|
| Accelerate | W (or ↑ in 1-player) | ↑ |
| Brake / reverse | S (or ↓) | ↓ |
| Steer | A / D (or ← / →) | ← / → |

**P** = pause · **Esc** = back to menu · **Enter** = race again after the finish.

You start at the back of a 6-kart grid — the computer drivers (Omar, Mariam,
Youssef, Nour and Karim) start in front. Fight your way to the front!

Tips: stay off the sand — it slows you right down. Brake *before* the corner, not in it.
If you cut across the sand and miss a checkpoint the lap won't count.
Your best lap on each track is saved as the track record.

## What's in the game so far (Phases 1–3)

- Giza Pyramids Circuit, 3 laps
- Realistic-ish kart handling: grip, sliding, skid marks, sand run-off, tyre walls
- 1 or 2 players on one keyboard, plus computer drivers to fill a 6-kart grid
- Pick your team: Burhanuddin Racing (red & gold), Mercedes, BMW, Ferrari,
  Red Bull or McLaren (team colours only — no official logos)
- Computer drivers follow a racing line, brake for corners, overtake, and make the odd mistake
- Easy / Medium / Hard difficulty (remembered between games)
- Live race order at the top of the screen, full results table at the end
- Lap timer, last/best lap, speedometer, saved track record
- Career mode: prize money for every finishing position, and a garage with
  4 upgrades × 5 levels that really change how the kart drives

## Make it your own

- **Change the track:** edit the points in `src/tracks/giza.js` and reload the page.
- **Change how the kart drives:** edit `KART_BASE_STATS` at the top of `src/kart.js`.
- **Add a team or change team colours:** `TEAMS` in `src/teams.js`.
- **Change prices, prizes or how much upgrades help:** everything is in `src/economy.js`.
- **Rename the computer drivers or change their colours / skill:** `AI_DRIVERS` in `src/ai.js`.
- **Make the computer drivers faster or slower:** `DIFFICULTIES` in `src/ai.js`.

## Code map

| File | What it does |
|---|---|
| `index.html` | The page — open it to play |
| `src/main.js` | Game loop and screens (menu, race, pause) |
| `src/input.js` | Keyboard controls |
| `src/kart.js` | Kart physics and drawing |
| `src/track.js` | Turns points into a track; drawing helpers (pyramids, palms, grandstand) |
| `src/tracks/` | One file per track |
| `src/ai.js` | Computer drivers: racing line, braking, overtaking |
| `src/economy.js` | Prices, prizes, upgrades and the saved career |
| `src/garage.js` | The garage screen |
| `src/teams.js` | The teams players can pick and their kart colours |
| `src/race.js` | Countdown, laps, checkpoints, positions, results |
| `src/hud.js` | Lap panels, countdown, menus |
| `src/save.js` | Saves records in the browser |
