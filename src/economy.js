// Money, prizes, upgrades and the saved career.
// ALL the prices and prizes live here, so they're easy to change.

const ECONOMY = {
  startingMoney: 500,

  // Prize money (EGP) for 1st, 2nd, 3rd, 4th, 5th, 6th.
  prizes: [1000, 500, 300, 150, 100, 50],

  // Harder computer drivers = bigger prizes.
  difficultyBonus: { easy: 1, medium: 1.5, hard: 2 },

  // Upgrades go up to level 10. Levels 2-5 are the normal levels; levels 6-10 are
  // PRO levels: they cost a lot more and each one adds a bit less.
  maxLevel: 10,
  proFrom: 5,   // levels above this are PRO

  // Each upgrade improves one kart stat by `perLevel` (0.25 = 25% more) for
  // every normal level you buy, and by `proPerLevel` for every PRO level.
  // `also` upgrades a second stat at the same time. `prices` are the cost of
  // level 2, 3, 4 ... up to 10.
  //
  //                 level 5            level 10 (PRO)
  //   Engine        126 km/h           153 km/h top speed
  //   Gearbox       twice as quick     2.75 x as quick off the line
  //   Tyres         1.6 x grip         2 x grip, and turns 26% quicker
  //   Brakes        1.8 x braking      2.4 x braking
  upgrades: {
    engine:  { name: 'Engine',  improves: 'Top speed',    stat: 'topSpeed', perLevel: 0.10, proPerLevel: 0.06,
               prices: [400, 800, 1500, 3000, 4000, 6000, 9000, 13000, 18000] },
    gearbox: { name: 'Gearbox', improves: 'Acceleration', stat: 'accel',    perLevel: 0.25, proPerLevel: 0.15,
               prices: [300, 600, 1200, 2500, 3500, 5000, 7500, 10500, 15000] },
    tyres:   { name: 'Tyres',   improves: 'Grip',         stat: 'grip',     perLevel: 0.15, proPerLevel: 0.08,
               also: { steer: 0.04 }, alsoPro: { steer: 0.02 },
               prices: [300, 600, 1200, 2500, 3500, 5000, 7500, 10500, 15000] },
    brakes:  { name: 'Brakes',  improves: 'Braking',      stat: 'brake',    perLevel: 0.20, proPerLevel: 0.12,
               prices: [200, 400, 800, 1600, 2000, 3000, 4500, 6500, 9000] },
  },
};

const UPGRADE_ORDER = ['engine', 'gearbox', 'tyres', 'brakes'];

// ---------- Paint & number shop ----------
// Every colour costs money the first time you use it, then it's yours for good.
const PAINT_COLORS = [
  { hex: '#c8102e', name: 'Red' },     { hex: '#d4a017', name: 'Gold' },    { hex: '#141414', name: 'Black' },
  { hex: '#f4f4f4', name: 'White' },   { hex: '#1f6fd1', name: 'Blue' },    { hex: '#1f9d55', name: 'Green' },
  { hex: '#ff8000', name: 'Orange' },  { hex: '#ffd400', name: 'Yellow' },  { hex: '#8e44ad', name: 'Purple' },
  { hex: '#e84393', name: 'Pink' },    { hex: '#00a19b', name: 'Teal' },    { hex: '#1e2a5a', name: 'Navy' },
  { hex: '#c4c8cc', name: 'Silver' },  { hex: '#9acd32', name: 'Lime' },
  // Special finishes cost more.
  { hex: '#dfe6ee', name: 'Chrome', special: true },    { hex: '#f7d44a', name: 'Gold plate', special: true },
  { hex: '#2c3038', name: 'Carbon', special: true },    { hex: '#a1123b', name: 'Ruby', special: true },
];
const PAINT_PRICE = 100;
const PAINT_SPECIAL_PRICE = 1500;
const NUMBER_PRICE = 100;

// Stripe styles for the nose and helmet. `null` = the team's own style.
const PAINT_STYLES = [
  { id: null,     name: 'Team style',     price: 0 },
  { id: 'single', name: 'Single stripe',  price: 0 },
  { id: 'none',   name: 'No stripe',      price: 0 },
  { id: 'double', name: 'Double stripe',  price: 300 },
  { id: 'triple', name: 'Triple stripe',  price: 500 },
];

// ---------- Drivers you can hire ----------
// Stars decide how fast a driver is and what they cost. A driver you hire races
// next to you in your team colours; their prize money comes to you, and you pay
// their salary after every race.
const MAX_TEAMMATES = 2;
const DRIVER_STARS = {
  1: { topKmh: 60,  pace: 0.85, mistakes: 0.30, fee: 500,   salary: 40 },
  2: { topKmh: 72,  pace: 0.90, mistakes: 0.22, fee: 1500,  salary: 90 },
  3: { topKmh: 84,  pace: 0.95, mistakes: 0.15, fee: 4000,  salary: 160 },
  4: { topKmh: 96,  pace: 1.00, mistakes: 0.08, fee: 9000,  salary: 260 },
  5: { topKmh: 108, pace: 1.06, mistakes: 0.04, fee: 20000, salary: 400 },
};
const DRIVERS = [
  { id: 'hossam',  name: 'Hossam',  nick: 'The Rocket', stars: 5, number: 11, helmet: '#ffffff' },
  { id: 'salma',   name: 'Salma',   nick: 'Desert Fox', stars: 4, number: 22, helmet: '#f5d0fe' },
  { id: 'tarek',   name: 'Tarek',   nick: 'Iron Hands', stars: 4, number: 44, helmet: '#1f6fd1' },
  { id: 'laila',   name: 'Laila',   nick: 'Quick Step', stars: 3, number: 5,  helmet: '#ffd400' },
  { id: 'ali',     name: 'Ali',     nick: 'Steady Ali', stars: 3, number: 9,  helmet: '#1f9d55' },
  { id: 'dina',    name: 'Dina',    nick: 'Rookie',     stars: 2, number: 18, helmet: '#e84393' },
  { id: 'mostafa', name: 'Mostafa', nick: 'Big Mo',     stars: 2, number: 36, helmet: '#ff8000' },
  { id: 'farida',  name: 'Farida',  nick: 'Newcomer',   stars: 1, number: 99, helmet: '#00a19b' },
];
function driverById(id) { return DRIVERS.find((d) => d.id === id) || null; }
function driverFee(d) { return DRIVER_STARS[d.stars].fee; }
function driverSalary(d) { return DRIVER_STARS[d.stars].salary; }

function formatMoney(amount) {
  return 'EGP ' + Math.round(amount).toLocaleString('en-US');
}

// A full-length race (MAX_LAPS) pays the amounts above. Shorter races pay
// less in proportion, so a 1-lap race can't be used to farm money.
function lapFactor(laps) {
  return clamp(laps, 1, MAX_LAPS) / MAX_LAPS;
}

function prizeFor(position, difficulty, laps = MAX_LAPS) {
  const base = ECONOMY.prizes[position - 1] || 0;
  return Math.round((base * (ECONOMY.difficultyBonus[difficulty] || 1) * lapFactor(laps)) / 5) * 5;
}

// The player's career: money, upgrades and results. Saved automatically.
const Career = {
  data: null,

  fresh() {
    const upgrades = {};
    for (const key of UPGRADE_ORDER) upgrades[key] = 1;
    return {
      team: 'burhanuddin', money: ECONOMY.startingMoney, upgrades, races: 0, wins: 0, podiums: 0, earned: 0,
      paint: { body: null, trim: null, helmet: null, style: null, number: 7 },   // null = the team's own colour
      owned: { colors: [], styles: [], numbers: [7] },                          // what you have bought
      hired: [],                                                                // ids of your teammates
    };
  },

  load() {
    const saved = Save.get('career', null) || {};
    const fresh = this.fresh();
    this.data = Object.assign(fresh, saved);
    // Saves from older versions don't have the newer parts: fill them in.
    this.data.upgrades = Object.assign(this.fresh().upgrades, saved.upgrades || {});
    this.data.paint = Object.assign(this.fresh().paint, saved.paint || {});
    this.data.owned = Object.assign(this.fresh().owned, saved.owned || {});
    this.data.hired = Array.isArray(saved.hired) ? saved.hired.filter((id) => driverById(id)).slice(0, MAX_TEAMMATES) : [];
    for (const key of UPGRADE_ORDER) this.data.upgrades[key] = clamp(this.data.upgrades[key] | 0, 1, ECONOMY.maxLevel);
    return this.data;
  },

  save() {
    Save.set('career', this.data);
  },

  reset() {
    this.data = this.fresh();
    this.save();
  },

  level(key) {
    return this.data.upgrades[key];
  },

  // Price of the next level, or null if it's already maxed out.
  nextPrice(key) {
    const lvl = this.level(key);
    if (lvl >= ECONOMY.maxLevel) return null;
    return ECONOMY.upgrades[key].prices[lvl - 1];
  },

  // Returns a message to show the player.
  buy(key) {
    const price = this.nextPrice(key);
    const name = ECONOMY.upgrades[key].name;
    if (price == null) return { ok: false, text: name + ' is already at the maximum level' };
    if (this.data.money < price) {
      return { ok: false, text: 'Not enough money — you need ' + formatMoney(price - this.data.money) + ' more' };
    }
    this.data.money -= price;
    this.data.upgrades[key]++;
    this.save();
    return { ok: true, text: name + ' upgraded to level ' + this.data.upgrades[key] + '!' };
  },

  // The kart's stats with all the upgrades applied.
  kartStats() {
    return statsForUpgrades(this.data.upgrades);
  },

  // Called once when a career race finishes. `mates` are your teammates who
  // raced: [{ driver, name, position }]. Their prizes come to you and their
  // salaries are paid out of your money. Returns a breakdown for the results screen.
  recordRace(position, difficulty, mates = [], laps = MAX_LAPS) {
    const prize = prizeFor(position, difficulty, laps);
    const teamPrizes = mates.map((m) => ({ name: m.name, position: m.position, amount: prizeFor(m.position, difficulty, laps) }));
    const salaries = mates.map((m) => ({ name: m.name, amount: Math.round((driverSalary(m.driver) * lapFactor(laps)) / 5) * 5 }));
    const gross = prize + teamPrizes.reduce((a, t) => a + t.amount, 0);
    const pay = salaries.reduce((a, t) => a + t.amount, 0);
    const before = this.data.money;
    this.data.money = Math.max(0, before + gross - pay);   // money never goes below zero
    this.data.earned += gross;
    this.data.races++;
    if (position === 1) this.data.wins++;
    if (position <= 3) this.data.podiums++;
    this.save();
    return { prize, teamPrizes, salaries, gross, pay, net: this.data.money - before };
  },

  // ----- Paint & number shop -----
  colorPrice(hex) {
    const c = PAINT_COLORS.find((x) => x.hex === hex);
    return c && c.special ? PAINT_SPECIAL_PRICE : PAINT_PRICE;
  },
  ownsColor(hex) { return this.data.owned.colors.includes(hex); },
  ownsStyle(id) { return id === null || PAINT_STYLES.find((s) => s.id === id).price === 0 || this.data.owned.styles.includes(id); },
  ownsNumber(n) { return this.data.owned.numbers.includes(n); },

  // Take money for something, or say why not. Returns null if it worked.
  spend(price, what) {
    if (this.data.money < price) return 'Not enough money for ' + what + ' — you need ' + formatMoney(price - this.data.money) + ' more';
    this.data.money -= price;
    return null;
  },

  // Put a colour on the body, stripe or helmet (part = 'body' | 'trim' | 'helmet'), buying it first if needed.
  useColor(part, hex) {
    const name = PAINT_COLORS.find((c) => c.hex === hex).name;
    if (!this.ownsColor(hex)) {
      const err = this.spend(this.colorPrice(hex), name);
      if (err) return { ok: false, text: err };
      this.data.owned.colors.push(hex);
    }
    this.data.paint[part] = hex;
    this.save();
    return { ok: true, text: name + ' is on your kart!' };
  },

  useStyle(id) {
    const style = PAINT_STYLES.find((s) => s.id === id);
    if (!this.ownsStyle(id)) {
      const err = this.spend(style.price, style.name);
      if (err) return { ok: false, text: err };
      this.data.owned.styles.push(id);
    }
    this.data.paint.style = id;
    this.save();
    return { ok: true, text: style.name + ' is on your kart!' };
  },

  useNumber(n) {
    if (!this.ownsNumber(n)) {
      const err = this.spend(NUMBER_PRICE, 'number ' + n);
      if (err) return { ok: false, text: err };
      this.data.owned.numbers.push(n);
    }
    this.data.paint.number = n;
    this.save();
    return { ok: true, text: 'You are number ' + n + '!' };
  },

  resetPaint() {
    const p = this.data.paint;
    p.body = p.trim = p.helmet = p.style = null;   // back to the team's colours (you keep your number)
    this.save();
  },

  // ----- Hiring drivers -----
  hiredDrivers() { return this.data.hired.map(driverById).filter(Boolean); },
  isHired(id) { return this.data.hired.includes(id); },

  hire(id) {
    const d = driverById(id);
    if (this.isHired(id)) return { ok: false, text: d.name + ' is already on your team' };
    if (this.data.hired.length >= MAX_TEAMMATES) return { ok: false, text: 'Your team is full — release a driver first' };
    const err = this.spend(driverFee(d), d.name + "'s signing fee");
    if (err) return { ok: false, text: err };
    this.data.hired.push(id);
    this.save();
    return { ok: true, text: d.name + ' has joined your team!' };
  },

  release(id) {
    const d = driverById(id);
    this.data.hired = this.data.hired.filter((x) => x !== id);
    this.save();
    return { ok: true, text: d.name + ' has left your team' };
  },
};

// How much better a part is after `steps` upgrades: the normal levels add
// `per` each, and the PRO levels (after the first 4 steps) add `pro` each.
function upgradeBoost(steps, per, pro) {
  const normal = ECONOMY.proFrom - 1;
  return Math.min(steps, normal) * per + Math.max(0, steps - normal) * pro;
}

function statsForUpgrades(upgrades) {
  const stats = Object.assign({}, KART_BASE_STATS);
  for (const key of UPGRADE_ORDER) {
    const u = ECONOMY.upgrades[key];
    const steps = upgrades[key] - 1;
    stats[u.stat] = KART_BASE_STATS[u.stat] * (1 + upgradeBoost(steps, u.perLevel, u.proPerLevel));
    for (const [stat, perLevel] of Object.entries(u.also || {})) {
      stats[stat] = KART_BASE_STATS[stat] * (1 + upgradeBoost(steps, perLevel, (u.alsoPro || {})[stat] || 0));
    }
  }
  return stats;
}

// Seconds to get from a standstill up to `kmh`, for a kart with these stats
// (worked out from the same rule the kart uses to accelerate).
function secondsToReach(stats, kmh) {
  const v = Math.min(kmh / 0.36, stats.topSpeed * 0.995), T = stats.topSpeed;
  return (T / (2 * stats.accel)) * Math.log((T + v) / (T - v));
}

// What an upgrade does, in numbers a player can picture. `level` is the level of
// that one upgrade; the others stay as they are now.
function upgradeReadout(key, level) {
  const upgrades = Object.assign({}, Career.data.upgrades);
  upgrades[key] = level;
  const s = statsForUpgrades(upgrades);
  if (key === 'engine') return { label: 'Top speed', value: Math.round(s.topSpeed * 0.36) + ' km/h' };
  if (key === 'gearbox') return { label: '0–60 km/h', value: secondsToReach(s, 60).toFixed(2) + ' s' };
  if (key === 'tyres') return { label: 'Grip', value: Math.round((s.grip / KART_BASE_STATS.grip) * 100) + '%' };
  return { label: '60–0 km/h', value: (60 / 0.36 / s.brake).toFixed(2) + ' s' };
}
