// Drives the non-active player to follow behind the active one.
// Simple steering: catch up when far, stop when close, gentle slow-down.

const FOLLOW_DISTANCE = 70;
const MAX_DISTANCE = 420;

export class Companion {
  constructor(player) {
    this.player = player;
    this.target = new Phaser.Math.Vector2(player.x, player.y);
  }

  update(leader, time, delta) {
    const p = this.player;
    if (!p.isAlive) return;

    const dx = leader.x - p.x;
    const dy = leader.y - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > MAX_DISTANCE) {
      const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
      p.setPosition(leader.x + Math.cos(angle) * 80, leader.y + Math.sin(angle) * 80);
      p.setVelocity(0, 0);
    } else if (dist < FOLLOW_DISTANCE) {
      p.setVelocity(p.body.velocity.x * 0.7, p.body.velocity.y * 0.7);
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = p.cfg.speed * (dist > 180 ? 1.1 : 0.85);
      p.setVelocity(nx * speed + p.knockback.x, ny * speed + p.knockback.y);

      if (nx < -0.1) p.setFlipX(true);
      else if (nx > 0.1) p.setFlipX(false);

      p.facing.set(nx, ny);
      p.lastAim.set(nx, ny);
    }

    if (p.updateClubPose) p.updateClubPose();
  }
}
