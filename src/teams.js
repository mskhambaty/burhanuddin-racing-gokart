// Teams the players can race for. Each team is just a name and kart colours
// (no logos). Add your own by copying one of the lines below!
//
//   body    main kart colour
//   trim    racing stripe colour
//   stripes optional: several thin stripes side by side instead of one
//   helmet  driver's helmet colour

const TEAMS = {
  burhanuddin: { name: 'Burhanuddin Racing', body: '#c8102e', trim: '#d4a017', helmet: '#d4a017' },
  mercedes:    { name: 'Mercedes', body: '#c4c8cc', trim: '#00a19b', helmet: '#111111' },
  bmw:         { name: 'BMW', body: '#f4f4f4', trim: '#0066b1', helmet: '#0066b1',
                 stripes: ['#81c4ff', '#16588e', '#e7222e'] },
  ferrari:     { name: 'Ferrari', body: '#dc0000', trim: '#fff200', helmet: '#fff200' },
  redbull:     { name: 'Red Bull', body: '#1e2a5a', trim: '#e10600', helmet: '#ffcc00' },
  mclaren:     { name: 'McLaren', body: '#ff8000', trim: '#47c7fc', helmet: '#1a1a1a' },
};

const TEAM_ORDER = ['burhanuddin', 'mercedes', 'bmw', 'ferrari', 'redbull', 'mclaren'];

// Step through the list of teams: dir = +1 (next) or -1 (previous).
function nextTeam(id, dir) {
  const i = TEAM_ORDER.indexOf(id);
  return TEAM_ORDER[((i < 0 ? 0 : i) + dir + TEAM_ORDER.length) % TEAM_ORDER.length];
}

// The stripes for a paint style, in the kart's own colours.
function stripesForStyle(style, trim, body) {
  if (style === 'none') return [];
  if (style === 'double') return [trim, body, trim];
  if (style === 'triple') return [trim, body, trim, body, trim];
  return undefined;   // 'single': one plain stripe
}

// Kart settings for a player driving for a team. `paint` (from the paint shop)
// can change the colours, the stripes and the race number; anything left empty
// (null) just uses the team's own.
function playerSetup(playerIndex, teamId, paint) {
  const team = TEAMS[teamId] || TEAMS.burhanuddin;
  const p = paint || {};
  const body = p.body || team.body, trim = p.trim || team.trim;
  return {
    name: team.name,
    shortName: 'YOU',
    body,
    trim,
    stripes: p.style ? stripesForStyle(p.style, trim, body) : team.stripes,
    helmet: p.helmet || team.helmet,
    number: p.number || 7,
  };
}
