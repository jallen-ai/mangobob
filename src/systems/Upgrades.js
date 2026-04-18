// Permanent upgrade pool. `apply(stats)` mutates a stats object at Player build
// time; effects stack additively/multiplicatively per `apply`. `unlock` keys are
// used by future weapons/shield systems.

export const UPGRADES = [
  {
    id: 'hp-1', name: '+2 Max HP', cost: 5,
    desc: 'Take more hits before falling.',
    apply: (s) => { s.maxHealth += 2; },
  },
  {
    id: 'hp-2', name: '+3 Max HP (stack)', cost: 10, stacksWith: 'hp-1',
    desc: 'Another 3 points of health.',
    apply: (s) => { s.maxHealth += 3; },
  },
  {
    id: 'speed-1', name: 'Nimble Feet (+10% speed)', cost: 6,
    desc: 'MangoBob moves a little faster.',
    apply: (s) => { s.speed = Math.round(s.speed * 1.1); },
  },
  {
    id: 'club-dmg', name: 'Heavier Club (+30% club damage)', cost: 8,
    desc: 'Every club swing hits harder.',
    apply: (s) => { s.primaryDamage = Math.round(s.primaryDamage * 1.3 * 10) / 10; },
  },
  {
    id: 'club-reach', name: 'Longer Club Reach', cost: 6,
    desc: 'Club swings a bit further.',
    apply: (s) => { s.primaryReach = Math.round(s.primaryReach * 1.25); },
  },
  {
    id: 'bazooka-dmg', name: 'Bigger Bazooka Boom', cost: 12,
    desc: '+50% bazooka damage and splash.',
    apply: (s) => { s.heavyDamage = Math.round(s.heavyDamage * 1.5); },
  },
  {
    id: 'fury-faster', name: 'Faster Fury (−1 mango to fill)', cost: 10,
    desc: 'Mango Fury triggers sooner.',
    apply: (s) => { s.furyMax = Math.max(2, (s.furyMax || 5) - 1); },
  },
  {
    id: 'fury-longer', name: 'Longer Fury (+2s)', cost: 12,
    desc: 'Mango Fury lasts longer per use.',
    apply: (s) => { s.furyDuration = (s.furyDuration || 6000) + 2000; },
  },
  {
    id: 'dodge-range', name: 'Longer Roll', cost: 6,
    desc: 'Roll covers more ground.',
    apply: (s) => { s.dodgeDistanceMult = (s.dodgeDistanceMult || 1) * 1.35; },
  },
  {
    id: 'jump-higher', name: 'Higher Jump', cost: 6,
    desc: 'Jump higher (more air time).',
    apply: (s) => { s.jumpHeightMult = (s.jumpHeightMult || 1) * 1.4; },
  },
  {
    id: 'extra-life', name: '+1 Life (one-time)', cost: 15, oneTime: false,
    desc: 'Start the next level with an extra life.',
    apply: (s) => { s.bonusLives = (s.bonusLives || 0) + 1; },
  },
  {
    id: 'life-regen', name: 'Pickup Heals More', cost: 8,
    desc: 'Regular mangoes heal 4 HP instead of 2.',
    apply: (s) => { s.mangoHealAmount = 4; },
  },
];

export const getUpgradeById = (id) => UPGRADES.find((u) => u.id === id);

// Build effective stats by folding all owned upgrades over a base stats dict.
export function buildEffectiveStats(baseStats, ownedIds) {
  const s = { ...baseStats };
  (ownedIds || []).forEach((id) => {
    const u = getUpgradeById(id);
    if (u && u.apply) u.apply(s);
  });
  return s;
}

// Returns up to N upgrades the player doesn't own yet, prioritising cheap ones
// so the first shop visit always feels affordable.
export function pickShopOffer(ownedIds, n = 4) {
  const owned = new Set(ownedIds || []);
  const pool = UPGRADES.filter((u) => !owned.has(u.id));
  // Sort by cost so the cheapest are always shown first
  pool.sort((a, b) => a.cost - b.cost);
  return pool.slice(0, n);
}
