import { Sound } from '../systems/Sound.js';

export class Monkey extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, variant = 'normal') {
    super(scene, x, y, 'monkey');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(9);
    this.variant = variant;

    // Variant tuning: small (1 hit), normal (2-3 hits), big (5+ hits)
    let scale = 1, hp = 6, spd = 90, tint = 0xffffff;
    if (variant === 'small') { scale = 0.7; hp = 2; spd = 135; tint = 0xffd680; }
    else if (variant === 'big') { scale = 1.45; hp = 14; spd = 65; tint = 0x8b3a1a; }

    this.setScale(scale);
    if (tint !== 0xffffff) this.setTint(tint);
    this.body.setSize(this.width * 0.8, this.height * 0.8);
    this.baseTint = tint;

    this.maxHealth = hp;
    this.health = this.maxHealth;
    this.speed = spd;
    this.state = 'patrol';
    this.stateSince = scene.time.now;
    this.nextThrowAt = scene.time.now + Phaser.Math.Between(1200, 2400);
    this.patrolTarget = new Phaser.Math.Vector2(x, y);
    this.knockback = new Phaser.Math.Vector2(0, 0);
    this.aggroRadius = 260;
    this.rewardDropped = false;
  }

  takeDamage(amount, source) {
    this.health -= amount;
    const dx = this.x - source.x;
    const dy = this.y - source.y;
    const len = Math.hypot(dx, dy) || 1;
    this.knockback.set((dx / len) * 200, (dy / len) * 200);

    this.setTint(0xff7777);
    this.scene.time.delayedCall(90, () => {
      this.clearTint();
      if (this.baseTint && this.baseTint !== 0xffffff) this.setTint(this.baseTint);
    });

    if (this.health <= 0) {
      this.die();
    } else {
      Sound.monkeyHit();
      this.state = 'hurt';
      this.stateSince = this.scene.time.now;
    }
  }

  die() {
    if (!this.active) return;
    Sound.monkeyScreech();
    const scene = this.scene;
    // Small poof + drop
    const fx = scene.add.image(this.x, this.y, 'splash').setScale(0.4).setAlpha(0.8).setDepth(14);
    scene.tweens.add({ targets: fx, scale: 1, alpha: 0, duration: 300, onComplete: () => fx.destroy() });

    if (!this.rewardDropped) {
      this.rewardDropped = true;
      scene.spawnPickup(this.x, this.y);
    }

    this.destroy();
    scene.events.emit('enemyDefeated', this);
  }

  update(time, delta, target) {
    if (!this.active || !target || !target.isAlive) {
      this.setVelocity(0, 0);
      return;
    }
    this.knockback.scale(0.85);
    if (this.knockback.lengthSq() < 1) this.knockback.set(0, 0);

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    // State transitions
    if (this.state === 'hurt' && time - this.stateSince > 220) {
      this.state = 'chase';
    }
    if (this.state === 'patrol' && dist < this.aggroRadius) {
      this.state = 'chase';
    }

    if (this.state === 'patrol') {
      const pdx = this.patrolTarget.x - this.x;
      const pdy = this.patrolTarget.y - this.y;
      const pdist = Math.hypot(pdx, pdy);
      if (pdist < 16 || time - this.stateSince > 2500) {
        this.patrolTarget.set(
          Phaser.Math.Clamp(this.x + Phaser.Math.Between(-120, 120), 60, 2000),
          Phaser.Math.Clamp(this.y + Phaser.Math.Between(-120, 120), 60, 2000),
        );
        this.stateSince = time;
      }
      this.setVelocity((pdx / (pdist || 1)) * 40, (pdy / (pdist || 1)) * 40);
    } else if (this.state === 'chase') {
      // Chase but stop at ~140 to throw
      const desired = 130;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      if (dist > desired) {
        this.setVelocity(nx * this.speed + this.knockback.x, ny * this.speed + this.knockback.y);
      } else {
        this.setVelocity(this.knockback.x, this.knockback.y);
      }

      if (time > this.nextThrowAt && dist < 320) {
        this.nextThrowAt = time + Phaser.Math.Between(1400, 2400);
        this.scene.enemyThrow(this, target);
      }
    } else {
      this.setVelocity(this.knockback.x, this.knockback.y);
    }

    this.setFlipX(dx < 0);
  }
}

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(this.width * 0.8, this.height * 0.8);
    this.setCollideWorldBounds(true);
    this.setDepth(9);

    this.maxHealth = 60;
    this.health = this.maxHealth;
    this.phase = 1;
    this.state = 'idle';
    this.stateSince = scene.time.now;
    this.nextAttackAt = scene.time.now + 1200;
    this.knockback = new Phaser.Math.Vector2(0, 0);
    this.speed = 55;
    this.defeated = false;
  }

  takeDamage(amount, source) {
    if (this.defeated) return;
    this.health = Math.max(0, this.health - amount);

    const dx = this.x - source.x;
    const dy = this.y - source.y;
    const len = Math.hypot(dx, dy) || 1;
    this.knockback.set((dx / len) * 60, (dy / len) * 60);

    this.setTint(0xff9999);
    this.scene.time.delayedCall(90, () => this.clearTint());

    Sound.bossDamaged();

    // Phase transitions
    const ratio = this.health / this.maxHealth;
    if (ratio < 0.66 && this.phase < 2) {
      this.phase = 2;
      this.speed = 80;
      Sound.bossPhase();
      this.scene.cameras.main.flash(200, 200, 40, 40);
    }
    if (ratio < 0.33 && this.phase < 3) {
      this.phase = 3;
      this.speed = 105;
      Sound.bossPhase();
      this.scene.cameras.main.flash(250, 220, 60, 20);
    }

    this.scene.events.emit('bossDamaged', this);

    if (this.health <= 0) this.die();
  }

  die() {
    if (this.defeated) return;
    this.defeated = true;
    Sound.bossDefeat();
    const scene = this.scene;

    // Boss death sequence: multiple splashes
    let i = 0;
    const timer = scene.time.addEvent({
      delay: 140,
      repeat: 9,
      callback: () => {
        i++;
        const ox = this.x + Phaser.Math.Between(-40, 40);
        const oy = this.y + Phaser.Math.Between(-40, 40);
        const fx = scene.add.image(ox, oy, 'splash').setScale(0.5).setAlpha(0.9).setDepth(14);
        scene.tweens.add({ targets: fx, scale: 2, alpha: 0, duration: 400, onComplete: () => fx.destroy() });
        scene.cameras.main.shake(150, 0.006);
        if (i >= 9) {
          this.destroy();
          scene.events.emit('bossDefeated');
        }
      },
    });
    this.setVelocity(0, 0);
    this.body.enable = false;
  }

  update(time, delta, target) {
    if (this.defeated || !target || !target.isAlive) {
      this.setVelocity(0, 0);
      return;
    }

    this.knockback.scale(0.9);

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (time > this.nextAttackAt) {
      this.chooseAttack(target, time);
    }

    if (this.state === 'moving') {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      this.setVelocity(nx * this.speed + this.knockback.x, ny * this.speed + this.knockback.y);
      this.setFlipX(dx < 0);
      if (time - this.stateSince > 1600) {
        this.setVelocity(0, 0);
        this.state = 'idle';
        this.stateSince = time;
      }
    } else {
      this.setVelocity(this.knockback.x, this.knockback.y);
    }
  }

  chooseAttack(target, time) {
    const options = ['spread', 'slam'];
    if (this.phase >= 2) options.push('summon');
    if (this.phase >= 3) options.push('barrage');
    const pick = Phaser.Utils.Array.GetRandom(options);

    if (pick === 'spread') {
      this.scene.bossSpreadShot(this, target);
      this.nextAttackAt = time + (this.phase >= 3 ? 1400 : 2000);
    } else if (pick === 'slam') {
      this.scene.bossSlam(this, target);
      this.nextAttackAt = time + 2500;
    } else if (pick === 'summon') {
      this.scene.bossSummon(this);
      this.nextAttackAt = time + 3500;
    } else if (pick === 'barrage') {
      this.scene.bossBarrage(this, target);
      this.nextAttackAt = time + 2800;
    }

    this.state = 'moving';
    this.stateSince = time;
  }
}
