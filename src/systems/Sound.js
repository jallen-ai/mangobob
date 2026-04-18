// Procedural sound effects via zzfx (https://github.com/KilledByAPixel/ZzFX).
// Each preset is a tuned parameter array — trivially swappable for loaded WAV/MP3
// later without touching game code, since callers only reference Sound.swing() etc.

import { zzfx } from './zzfx.js';

let muted = false;

// Gate actual audio context start behind a user gesture to avoid autoplay warnings.
let unlocked = false;
const unlock = () => {
  if (unlocked) return;
  unlocked = true;
  // Dummy silent play to warm the audio context
  try { zzfx(0, 0, 100, 0, 0, 0.001); } catch (_) { /* no-op */ }
};
if (typeof window !== 'undefined') {
  const handler = () => { unlock(); window.removeEventListener('pointerdown', handler); window.removeEventListener('keydown', handler); };
  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
}

const play = (params) => {
  if (muted || !unlocked) return;
  try { zzfx(...params); } catch (_) { /* audio ctx errors are not fatal */ }
};

export const Sound = {
  setMuted(v) { muted = !!v; },
  isMuted() { return muted; },
  toggleMute() { muted = !muted; return muted; },

  // Weapons
  swing:        () => play([0.35,,200,.01,.02,.08,2,.5,,,,,,.3]),
  clubHit:      () => play([0.5,,90,0,.01,.07,3,5,,,,,,,,,.1]),
  bazooka:      () => play([0.6,,63,.01,.25,1.4,3,2.24,,,,,,1.4,,.1,.03]),
  grenade:      () => play([0.55,,80,.02,.3,1.2,3,2,,,,,,1.6,,.15,.02]),
  slingshot:    () => play([0.3,,430,.01,.04,.15,,1,-6,,,,,.4,,.02]),
  throw:        () => play([0.3,,340,.01,.03,.1,2,.8,-2,,,,,.2]),
  mangoSplat:   () => play([0.4,,150,.02,.04,.12,3,1.2,,,,,,.8,,.1]),

  // Pickups
  mangoPickup:  () => play([0.4,,800,.02,.06,.18,1,1.5,,,,,,,.05]),
  goldenPickup: () => play([0.55,,1675,,.06,.24,1,1.82,,,837,.06]),

  // Fury
  furyReady:    () => play([0.55,,537,.02,.02,.22,1,1.59,-6.98,4.97]),
  furyActivate: () => play([0.7,,180,.05,.3,.4,1,3,8,,,,,,,,.3]),
  furyHit:      () => play([0.3,,540,.01,.03,.12,2,.8,,,,,,.3]),

  // Enemies
  monkeyHit:    () => play([0.3,,320,.01,.04,.08,2,1,,,,,,.2]),
  monkeyScreech:() => play([0.4,,660,.03,.12,.15,2,1.2,12,,,,,,.4]),
  bossRoar:     () => play([0.7,,50,.2,.6,.8,3,2.5,,,,,,.8,,.2,.05]),
  bossDamaged:  () => play([0.35,,120,.02,.04,.12,3,1.8,,,,,,.3,,.1]),
  bossPhase:    () => play([0.65,,150,.1,.4,.6,1,2,10,,,,,1.2,,.15]),
  bossDefeat:   () => play([0.8,,100,.3,.8,1.5,3,2.5,-8,,,,,.6,,.3,.1]),

  // Player
  playerHurt:   () => play([0.4,,180,.02,.04,.12,2,1.5,,,,,,.4,,.1]),
  playerDie:    () => play([0.55,,260,.1,.3,.5,1,2,-8,,,,,,,,.3]),
  dodge:        () => play([0.25,,520,.01,.02,.06,2,.8,,,,,,.3]),

  // Events + UI
  gateOpen:     () => play([0.5,,220,.05,.3,.5,1,1.5,,,440,.1]),
  zoneCleared:  () => play([0.55,,523,.05,.15,.25,1,1.5,,,783,.1,,,,.05]),
  menuClick:    () => play([0.3,,300,.01,.02,.06,1,1]),
  victory:      () => play([0.65,,523,.05,.3,.5,1,2,,,783,.1,,,,.1]),
  gameOver:     () => play([0.5,,220,.1,.3,.6,3,2,-8,,,,,.4,,.15]),
};
