// Money, prizes, upgrades and the saved career.
// ALL the prices and prizes live here, so they're easy to change.

const ECONOMY = {
  startingMoney: 500,

  // Prize money (EGP) for 1st, 2nd, 3rd, 4th, 5th, 6th.
  prizes: [1000, 600, 400, 200, 100, 50],

  // Harder computer drivers = bigger prizes.
  difficultyBonus: { easy: 1, medium: 1.5, hard: 2 },

  maxLevel: 5,

  // Each upgrade improves one kart stat by `perLevel` (0.05 = 5%) per level.
  // `prices` are the cost of level 2, 3, 4 and 5.
  upgrades: {
    engine:  { name: 'Engine',  improves: 'Top speed',    stat: 'topSpeed', perLevel: 0.04, prices: [400, 800, 1500, 3000] },
    gearbox: { name: 'Gearbox', improves: 'Acceleration', stat: 'accel',    perLevel: 0.08, prices: [300, 600, 1200, 2500] },
    tyres:   { name: 'Tyres',   improves: 'Grip',         stat: 'grip',     perLevel: 0.08, prices: [300, 600, 1200, 2500] },
    brakes:  { name: 'Brakes',  improves: 'Braking',      stat: 'brake',    perLevel: 0.10, prices: [200, 400, 800, 1600] },
  },
};

const UPGRADE_ORDER = ['engine', 'gearbox', 'tyres', 'brakes'];

function formatMoney(amount) {
  return 'EGP ' + Math.round(amount).toLocaleString('en-US');
}

function prizeFor(position, difficulty) {
  const base = ECONOMY.prizes[position - 1] || 0;
  return Math.round(base * (ECONOMY.difficultyBonus[difficulty] || 1));
}

// The player's career: money, upgrades and results. Saved automatically.
const Career = {
  data: null,

  fresh() {
    const upgrades = {};
    for (const key of UPGRADE_ORDER) upgrades[key] = 1;
    return { money: ECONOMY.startingMoney, upgrades, races: 0, wins: 0, podiums: 0, earned: 0 };
  },

  load() {
    const saved = Save.get('career', null);
    this.data = Object.assign(this.fresh(), saved || {});
    this.data.upgrades = Object.assign(this.fresh().upgrades, (saved && saved.upgrades) || {});
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

  // Called once when a career race finishes. Returns the prize.
  recordRace(position, difficulty) {
    const prize = prizeFor(position, difficulty);
    this.data.money += prize;
    this.data.earned += prize;
    this.data.races++;
    if (position === 1) this.data.wins++;
    if (position <= 3) this.data.podiums++;
    this.save();
    return prize;
  },
};

function statsForUpgrades(upgrades) {
  const stats = Object.assign({}, KART_BASE_STATS);
  for (const key of UPGRADE_ORDER) {
    const u = ECONOMY.upgrades[key];
    stats[u.stat] = KART_BASE_STATS[u.stat] * (1 + u.perLevel * (upgrades[key] - 1));
  }
  return stats;
}
