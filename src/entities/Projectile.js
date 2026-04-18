export class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(12);
  }

  fire(opts) {
    const {
      vx, vy, damage, ttl, fromPlayer, splashRadius = 0,
      splashDamage = 0, scale = 1, spin = 0, explodeOnImpact = true,
    } = opts;

    this.damage = damage;
    this.fromPlayer = fromPlayer;
    this.splashRadius = splashRadius;
    this.splashDamage = splashDamage;
    this.explodeOnImpact = explodeOnImpact;
    this.setActive(true).setVisible(true);
    this.setVelocity(vx, vy);
    this.setScale(scale);
    this.setRotation(Math.atan2(vy, vx));
    this.body.enable = true;
    this.spin = spin;

    this.scene.time.delayedCall(ttl, () => this.explode(false), [], this);
    return this;
  }

  explode(hit) {
    if (!this.active) return;
    const scene = this.scene;

    if (this.splashRadius > 0) {
      const splash = scene.add.image(this.x, this.y, 'splash').setDepth(14).setScale(0.6).setAlpha(0.95);
      scene.tweens.add({
        targets: splash,
        scale: this.splashRadius / 36 * 2,
        alpha: 0,
        duration: 340,
        onComplete: () => splash.destroy(),
      });

      // Juice droplets
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.Between(6, this.splashRadius);
        const d = scene.add.circle(this.x + Math.cos(a) * 4, this.y + Math.sin(a) * 4, 3, 0xffb347);
        scene.tweens.add({
          targets: d,
          x: this.x + Math.cos(a) * r,
          y: this.y + Math.sin(a) * r,
          alpha: 0,
          duration: 360,
          onComplete: () => d.destroy(),
        });
      }

      scene.cameras.main.shake(80, 0.003);
      scene.applySplash(this);
    } else if (hit) {
      const fx = scene.add.image(this.x, this.y, 'splash').setScale(0.3).setDepth(14).setAlpha(0.8);
      scene.tweens.add({ targets: fx, scale: 0.8, alpha: 0, duration: 200, onComplete: () => fx.destroy() });
    }

    this.setActive(false).setVisible(false);
    this.body.enable = false;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.spin) this.rotation += this.spin * delta / 1000;
  }
}
