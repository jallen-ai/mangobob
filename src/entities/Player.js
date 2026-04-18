export const CHAR_CONFIG = {
  mangobob: {
    key: 'mangobob',
    displayName: 'MangoBob',
    maxHealth: 10,
    speed: 150,
    hitboxScale: 0.85,
    primaryName: 'Punch',
    primaryCooldown: 280,
    primaryDamage: 2,
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
  constructor(scene, x, y, charKey) {
    const cfg = CHAR_CONFIG[charKey];
    super(scene, x, y, cfg.key);
    this.charKey = charKey;
    this.cfg = cfg;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(this.width * cfg.hitboxScale, this.height * cfg.hitboxScale);
    this.body.setOffset(
      (this.width - this.width * cfg.hitboxScale) / 2,
      this.height - this.height * cfg.hitboxScale,
    );

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
      this.emit('died');
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

    // Dodge
    if (input.dodgePressed && now > this.dodgeCooldownUntil) {
      this.dodgeUntil = now + 220;
      this.dodgeCooldownUntil = now + 900;
      this.iFramesUntil = Math.max(this.iFramesUntil, now + 240);
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
    this.primaryReady = now + this.cfg.primaryCooldown;
    return true;
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
