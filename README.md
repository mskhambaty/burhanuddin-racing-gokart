# Burhanuddin Racing — Cairo Karting 🏁

A top-down go-kart racing game set in Cairo, built for laptop play.
See [PLAN.md](PLAN.md) for the full plan and what's coming next.

![Two karts on the Giza Pyramids Circuit](screenshot.png)

## How to play

1. Download or clone this folder.
2. Double-click **`index.html`** (opens in Chrome, Edge, Firefox or Safari). Nothing to install.
3. On the title screen press **1** for one player or **2** for two players.
   Press **D** to change how good the computer drivers are (Easy / Medium / Hard).

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

## What's in the game so far (Phases 1–2)

- Giza Pyramids Circuit, 3 laps
- Realistic-ish kart handling: grip, sliding, skid marks, sand run-off, tyre walls
- 1 or 2 players on one keyboard, plus computer drivers to fill a 6-kart grid
- Computer drivers follow a racing line, brake for corners, overtake, and make the odd mistake
- Easy / Medium / Hard difficulty (remembered between games)
- Live race order at the top of the screen, full results table at the end
- Lap timer, last/best lap, speedometer, saved track record

## Make it your own

- **Change the track:** edit the points in `src/tracks/giza.js` and reload the page.
- **Change how the kart drives:** edit `KART_BASE_STATS` at the top of `src/kart.js`.
- **Change the colours:** `PLAYER_SETUPS` in `src/race.js`.
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
| `src/race.js` | Countdown, laps, checkpoints, positions, results |
| `src/hud.js` | Lap panels, countdown, menus |
| `src/save.js` | Saves records in the browser |
