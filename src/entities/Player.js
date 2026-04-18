import { Sound } from '../systems/Sound.js';
import { buildEffectiveStats } from '../systems/Upgrades.js';

export const CHAR_CONFIG = {
  mangobob: {
    key: 'mangobob',
    displayName: 'MangoBob',
    maxHealth: 10,
    speed: 150,
    hitboxScale: 0.85,
    primaryName: 'Mango Club',
    primaryCooldown: 380,
    primaryDamage: 3,
    primaryReach: 42,
    secondaryName: 'Mango Throw',
    secondaryCooldown: 420,
    secondaryDamage: 2,
    heavyName: 'Bazooka',
    heavyCooldown: 1800,
    heavyDamage: 6,
  },
  jeff: {
    key: 'jeff',
    displayName: 'Jeff',
    maxHealth: 7,
    speed: 210,
    hitboxScale: 0.8,
    primaryName: 'Slingshot',
    primaryCooldown: 220,
    primaryDamage: 1,
    secondaryName: 'Mango Grenade',
    secondaryCooldown: 900,
    secondaryDamage: 4,
    heavyName: null,
    heavyCooldown: 0,
    heavyDamage: 0,
  },
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, charKey, ownedUpgrades = []) {
    const baseCfg = CHAR_CONFIG[charKey];
    // Fold owned upgrades over base stats (only for mangobob right now)
    const cfg = charKey === 'mangobob'
      ? buildEffectiveStats(baseCfg, ownedUpgrades)
      : baseCfg;
    super(scene, x, y, cfg.key);
    this.charKey = charKey;
    this.cfg = cfg;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    // Scale real-art sprites down to match game scale
    if (charKey === 'mangobob' && this.width > 100) {
      // Loaded texture (e.g. 256x252) — scale display to game size and set a torso-area hitbox
      const targetWidth = 40;
      const displayScale = targetWidth / this.width;
      this.setScale(displayScale);
      // Torso-ish body in texture coords; origin stays centered
      const bodyW = this.width * 0.55;
      const bodyH = this.height * 0.6;
      this.body.setSize(bodyW, bodyH);
      this.body.setOffset((this.width - bodyW) / 2, this.height - bodyH);
    } else {
      this.body.setSize(this.width * cfg.hitboxScale, this.height * cfg.hitboxScale);
      this.body.setOffset(
        (this.width - this.width * cfg.hitboxScale) / 2,
        this.height - this.height * cfg.hitboxScale,
      );
    }

    this.health = cfg.maxHealth;
    this.maxHealth = cfg.maxHealth;
    this.isActive = false;
    this.isAlive = true;
    this.facing = new Phaser.Math.Vector2(1, 0);
    this.lastAim = new Phaser.Math.Vector2(1, 0);
    this.iFramesUntil = 0;
    this.dodgeUntil = 0;
    this.dodgeCooldownUntil = 0;
    this.primaryReady = 0;
    this.secondaryReady = 0;
    this.heavyReady = 0;
    this.knockback = new Phaser.Math.Vector2(0, 0);
    this.setDepth(10);

    // Jump state: vertical visual offset + shadow on ground
    this.airborne = false;
    this.jumpUntil = 0;
    this.jumpCooldownUntil = 0;
    this.jumpVisualOffset = 0;
    this.baseY = 0; // updated each frame to current physics y

    this.shadow = scene.add.ellipse(x, y + this.displayHeight * 0.5, 28, 8, 0x000000, 0.35).setDepth(9);

    if (charKey === 'mangobob') {
      this.club = scene.add.image(x, y, 'mango-club')
        .setOrigin(0.5, 0.9)
        .setDepth(11);
      this.clubSwinging = false;
      this.furyAura = scene.add.image(x, y, 'fury-glow').setDepth(9).setVisible(false);
    }
  }

  setActiveCharacter(active) {
    this.isActive = active;
    this.setTint(active ? 0xffffff : 0xb0b0b0);
  }

  isInvulnerable(now) {
    return now < this.iFramesUntil || now < this.dodgeUntil;
  }

  takeDamage(amount, source, now) {
    if (!this.isAlive) return false;
    if (this.isInvulnerable(now)) return false;
    this.health = Math.max(0, this.health - amount);
    this.iFramesUntil = now + 700;

    // Knockback
    if (source) {
      const dx = this.x - source.x;
      const dy = this.y - source.y;
      const len = Math.hypot(dx, dy) || 1;
      this.knockback.set((dx / len) * 240, (dy / len) * 240);
    }

    // Flash
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.3, to: 1 },
      duration: 120,
      repeat: 4,
      yoyo: true,
      onComplete: () => this.setAlpha(1),
    });

    this.scene.cameras.main.shake(120, 0.004);

    if (this.health <= 0) {
      this.isAlive = false;
      Sound.playerDie();
      this.emit('died');
    } else {
      Sound.playerHurt();
    }
    return true;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  revive(x, y) {
    this.isAlive = true;
    this.health = this.maxHealth;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.setVisible(true);
    if (this.body) this.body.enable = true;
    if (this.club) this.club.setVisible(true);
  }

  setVisible(v) {
    super.setVisible(v);
    if (this.club) this.club.setVisible(v && this.isAlive);
    if (this.furyAura && !v) this.furyAura.setVisible(false);
    return this;
  }

  tryJump(now) {
    if (this.airborne) return false;
    if (now < this.jumpCooldownUntil) return false;
    this.airborne = true;
    this.jumpCooldownUntil = now + 700;
    this.jumpShadowY = this.y;
    this.jumpShadowX = this.x;

    const scene = this.scene;
    const mult = this.cfg.jumpHeightMult || 1;
    scene.tweens.add({
      targets: this,
      y: this.y - 26 * mult,
      yoyo: true,
      duration: 210,
      ease: 'Quad.easeOut',
      onComplete: () => { this.airborne = false; },
    });
    return true;
  }

  updateShadow() {
    if (!this.shadow || !this.isAlive) {
      if (this.shadow) this.shadow.setVisible(this.isAlive);
      return;
    }
    this.shadow.setVisible(true);
    if (this.airborne) {
      // Shadow tracks horizontal movement but stays on the ground
      this.shadow.setPosition(this.x, this.jumpShadowY + this.displayHeight * 0.4);
      // Shrink slightly while airborne for a sense of height
      this.shadow.setScale(0.7, 0.7).setAlpha(0.22);
    } else {
      this.shadow.setPosition(this.x, this.y + this.displayHeight * 0.4);
      this.shadow.setScale(1, 1).setAlpha(0.35);
    }
  }

  update(time, delta, input) {
    if (!this.isAlive) return;

    // Apply knockback velocity decay
    this.knockback.scale(0.85);
    if (this.knockback.lengthSq() < 1) this.knockback.set(0, 0);

    if (!this.isActive) return; // inactive player is driven by Companion AI externally

    const now = time;
    const dodging = now < this.dodgeUntil;
    const speed = dodging ? this.cfg.speed * 2.2 : this.cfg.speed;

    let vx = 0, vy = 0;
    if (!dodging) {
      if (input.left) vx -= 1;
      if (input.right) vx += 1;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;
      const len = Math.hypot(vx, vy);
      if (len > 0) { vx /= len; vy /= len; }

      if (vx !== 0 || vy !== 0) {
        this.facing.set(vx, vy);
        this.lastAim.set(vx, vy);
      }
    } else {
      vx = this.facing.x;
      vy = this.facing.y;
    }

    this.setVelocity(vx * speed + this.knockback.x, vy * speed + this.knockback.y);

    // Face left/right flip
    if (vx < -0.1) this.setFlipX(true);
    else if (vx > 0.1) this.setFlipX(false);

    this.updateClubPose();
    this.updateShadow();

    // Jump
    if (input.jumpPressed) this.tryJump(now);

    // Dodge
    if (input.dodgePressed && now > this.dodgeCooldownUntil) {
      const dodgeMult = this.cfg.dodgeDistanceMult || 1;
      this.dodgeUntil = now + 220 * dodgeMult;
      this.dodgeCooldownUntil = now + 900;
      this.iFramesUntil = Math.max(this.iFramesUntil, now + 240 * dodgeMult);
      Sound.dodge();
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.5 },
        yoyo: true,
        duration: 110,
      });
    }
  }

  tryPrimary(now) {
    if (now < this.primaryReady) return false;
    const furyActive = this.scene.furyActive && this.charKey === 'mangobob';
    const cd = furyActive ? this.cfg.primaryCooldown * 0.5 : this.cfg.primaryCooldown;
    this.primaryReady = now + cd;
    return true;
  }

  swingClub(aim, empowered) {
    if (!this.club) return;
    const baseAngle = Math.atan2(aim.y, aim.x);
    const cx = this.x + aim.x * 12;
    const cy = this.y + aim.y * 12 + 4;
    this.club.setPosition(cx, cy);
    this.club.setScale(empowered ? 1.35 : 1);
    this.club.rotation = baseAngle + Math.PI / 6; // start: 30deg behind aim
    this.clubSwinging = true;

    this.scene.tweens.add({
      targets: this.club,
      rotation: baseAngle + (5 * Math.PI) / 6, // end: 150deg past start
      duration: empowered ? 130 : 180,
      ease: 'Cubic.easeOut',
      onComplete: () => { this.clubSwinging = false; },
    });
  }

  updateClubPose() {
    if (!this.club) return;
    if (!this.isAlive) { this.club.setVisible(false); return; }
    if (this.clubSwinging) return;
    // Idle carry pose: held at the side, tilted outward
    const side = this.flipX ? -1 : 1;
    this.club.setPosition(this.x + side * 9, this.y + 6);
    this.club.rotation = side * 0.45; // ~26deg outward lean
    this.club.setScale(1);
  }

  trySecondary(now) {
    if (now < this.secondaryReady) return false;
    this.secondaryReady = now + this.cfg.secondaryCooldown;
    return true;
  }

  tryHeavy(now) {
    if (!this.cfg.heavyName) return false;
    if (now < this.heavyReady) return false;
    this.heavyReady = now + this.cfg.heavyCooldown;
    return true;
  }

  getAimDirection() {
    return this.lastAim.clone();
  }
}
