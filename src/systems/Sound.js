// Thin wrapper over Phaser's sound manager. All audio assets are preloaded in
// BootScene; Sound.attach() runs once after boot with the shared sound manager.
// The game calls Sound.swing(), Sound.clubHit(), etc. — names match asset keys.

let mgr = null;
let muted = false;

export const SOUND_KEYS = [
  'swing', 'clubHit', 'bazooka', 'grenade', 'slingshot', 'throw', 'mangoSplat',
  'mangoPickup', 'goldenPickup',
  'furyReady', 'furyActivate', 'furyHit',
  'monkeyHit', 'monkeyScreech', 'bossRoar', 'bossDamaged', 'bossPhase', 'bossDefeat',
  'playerHurt', 'playerDie', 'dodge',
  'gateOpen', 'zoneCleared', 'menuClick',
  'victory', 'gameOver',
];

const play = (key, volume = 0.55, detune = 0) => {
  if (muted || !mgr) return;
  try {
    mgr.play(key, { volume, detune });
  } catch (_) { /* missing/unloaded is non-fatal */ }
};

// Small pitch jitter for variety on frequently-repeated sounds
const jitter = (amount = 200) => (Math.random() - 0.5) * 2 * amount;

export const Sound = {
  attach(soundManager) { mgr = soundManager; },
  setMuted(v) { muted = !!v; if (mgr) mgr.mute = muted; },
  isMuted() { return muted; },
  toggleMute() { this.setMuted(!muted); return muted; },

  // Weapons
  swing:        () => play('swing', 0.45, jitter(300)),
  clubHit:      () => play('clubHit', 0.7, jitter(250)),
  bazooka:      () => play('bazooka', 0.7),
  grenade:      () => play('grenade', 0.7, jitter(150)),
  slingshot:    () => play('slingshot', 0.4, jitter(250)),
  throw:        () => play('throw', 0.45, jitter(300)),
  mangoSplat:   () => play('mangoSplat', 0.45, jitter(250)),

  // Pickups
  mangoPickup:  () => play('mangoPickup', 0.5),
  goldenPickup: () => play('goldenPickup', 0.6),

  // Fury
  furyReady:    () => play('furyReady', 0.6),
  furyActivate: () => play('furyActivate', 0.65),
  furyHit:      () => play('furyHit', 0.55, jitter(200)),

  // Enemies
  monkeyHit:    () => play('monkeyHit', 0.5, jitter(300)),
  monkeyScreech:() => play('monkeyScreech', 0.5, jitter(400)),
  bossRoar:     () => play('bossRoar', 0.75),
  bossDamaged:  () => play('bossDamaged', 0.55, jitter(200)),
  bossPhase:    () => play('bossPhase', 0.7),
  bossDefeat:   () => play('bossDefeat', 0.8),

  // Player
  playerHurt:   () => play('playerHurt', 0.55, jitter(200)),
  playerDie:    () => play('playerDie', 0.6),
  dodge:        () => play('dodge', 0.35),

  // Events + UI
  gateOpen:     () => play('gateOpen', 0.6),
  zoneCleared:  () => play('zoneCleared', 0.65),
  menuClick:    () => play('menuClick', 0.5),
  victory:      () => play('victory', 0.7),
  gameOver:     () => play('gameOver', 0.6),
};
