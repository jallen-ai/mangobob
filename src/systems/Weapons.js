// Ranged-weapon registry. SPACE always swings the club; F always throws a grenade.
// E fires the weapon the player picked at the start of a run (stored in save.defaultWeapon).

export const WEAPONS = {
  bazooka: {
    id: 'bazooka',
    name: 'Mango Bazooka',
    blurb: 'Big, slow, boom. Huge splash damage and screen shake.',
    cooldown: 1600,
    damage: 6,
    speed: 440,
    ttl: 1400,
    splashRadius: 80,
    splashDamage: 3,
    scale: 1.5,
    spin: 0,
    texture: 'bazooka-shot',
    sfx: 'bazooka',
    shakeAmount: 0.006,
    shakeDuration: 120,
  },
  pistols: {
    id: 'pistols',
    name: 'Double Mango Pistols',
    blurb: 'Rapid-fire pair. Low damage per shot, but fast and sustained.',
    cooldown: 280,
    damage: 2,
    speed: 560,
    ttl: 750,
    scale: 0.9,
    spin: 12,
    texture: 'mango',
    sfx: 'slingshot',
    isPair: true, // fires a second shot ~90ms later from the other hand
  },
  slingshot: {
    id: 'slingshot',
    name: 'Mango Slingshot',
    blurb: 'Balanced single shot. Quick, accurate, and reliable.',
    cooldown: 420,
    damage: 3,
    speed: 540,
    ttl: 900,
    scale: 1,
    spin: 10,
    texture: 'mango',
    sfx: 'slingshot',
  },
};

export const WEAPON_KEYS = ['bazooka', 'pistols', 'slingshot'];

export const getWeapon = (id) => WEAPONS[id] || WEAPONS.slingshot;
