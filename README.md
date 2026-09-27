# Burhanuddin Racing — Cairo Karting 🏁

A go-kart racing game set in Cairo, built for playing on a laptop — with a
trackpad or the keyboard. See [PLAN.md](PLAN.md) for the full plan and what's next.

![Steering wheel view on the Giza Pyramids Circuit](screenshot.png)

## How to play

1. Download or clone this folder.
2. Double-click **`index.html`** (opens in Chrome, Edge, Firefox or Safari). Nothing to install.
3. Click **START**. In the garage pick your team (◀ ▶), buy upgrades, and click **RACE**.

Everything can be clicked — you never need the keyboard for the menus.

### Driving with the trackpad (the default)

- **Steer:** slide your finger left and right. The further from the middle, the harder
  you turn. The steering wheel on screen shows exactly how much you're turning.
- **Accelerate:** automatic.
- **Brake:** press and hold the trackpad (or hold Space).

### Driving with the keyboard

Switch **Controls** to *Keyboard* on the title screen (or press T there).
↑ / W = accelerate · ↓ / S = brake · ← → / A D = steer.

### Views

Click the 👁 button (top right) or press **C** to switch between:

| View | What you see |
|---|---|
| **Steering wheel** (main) | From the driver's seat: the wheel, your hands, the kart's nose |
| **Rear** | A camera following behind your kart |
| **Top down** | The whole track from above |

A minimap in the corner shows the whole track in the 3D views.

**II** / P = pause · **Esc** = back to the garage.

You start at the back of a 6-kart grid — the computer drivers (Omar, Mariam,
Youssef, Nour and Karim) start in front. Fight your way to the front!

Tips: stay off the sand — it slows you right down. Brake *before* the corner, not in it.
If you cut across the sand and miss a checkpoint the lap won't count.
Your best lap on each track is saved as the track record.

## What's in the game so far

![Rear view](screenshot-rear.png)


- Giza Pyramids Circuit, 3 laps
- Three views: steering wheel (3D, from the driver's seat), rear (3D), top down
- Trackpad driving (steer by sliding, auto-accelerate, hold to brake) or keyboard
- Realistic-ish kart handling: grip, sliding, skid marks, sand run-off, tyre walls
- You against 5 computer drivers on a 6-kart grid
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
- **Change how the trackpad steers:** `TRACKPAD_FULL_LOCK` in `src/input.js` (smaller = more sensitive).
- **Move the cameras:** `CAMERAS` at the top of `src/view3d.js`.
- **Change how the kart drives:** edit `KART_BASE_STATS` at the top of `src/kart.js`.
- **Add a team or change team colours:** `TEAMS` in `src/teams.js`.
- **Change prices, prizes or how much upgrades help:** everything is in `src/economy.js`.
- **Rename the computer drivers or change their colours / skill:** `AI_DRIVERS` in `src/ai.js`.
- **Make the computer drivers faster or slower:** `DIFFICULTIES` in `src/ai.js`.

## Code map

| File | What it does |
|---|---|
| `index.html` | The page — open it to play |
| `src/main.js` | Game loop and screens (menu, race, pause), switching views |
| `src/input.js` | Trackpad and keyboard controls |
| `src/view3d.js` | The 3D views: ground, sky, 3D karts/pyramids/palms, steering wheel |
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
