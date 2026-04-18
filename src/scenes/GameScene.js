import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { Player, CHAR_CONFIG } from '../entities/Player.js';
import { Companion } from '../entities/Companion.js';
import { Projectile } from '../entities/Projectile.js';
import { Monkey, Boss } from '../entities/Enemy.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { LEVEL1 } from '../levels/Level1.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.save = SaveSystem.load();
    this.mangobobLives = this.save.mangobobLives;
    this.jeffLives = this.save.jeffLives;
    this.mangoesCollected = this.save.mangoesCollected;
    this.currentZoneIdx = Math.max(0, this.save.zone - 1);
    this.paused = false;

    // Mango Fury super-move
    this.furyCharge = 0;
    this.furyMax = 5;
    this.furyActive = false;
    this.furyUntil = 0;

    // World bounds = the full level width
    const level = LEVEL1;
    this.physics.world.setBounds(0, 0, level.width, level.height);
    this.cameras.main.setBounds(0, 0, level.width, level.height);
    this.cameras.main.setZoom(1.15);

    // Tiled background
    this.drawFloor(level);

    // Static obstacle group
    this.obstacles = this.physics.add.staticGroup();
    this.gates = this.physics.add.staticGroup();

    level.zones.forEach((zone) => {
      zone.obstacles.forEach((o) => this.placeObstacle(o));
      if (zone.gateAt) {
        const gate = this.gates.create(zone.gateAt.x, zone.gateAt.y, 'gate');
        gate.zoneId = zone.id;
        gate.setDepth(5);
        gate.refreshBody();
      }
    });

    // Zone label
    this.zoneLabel = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '36px',
      color: '#ffb347',
      stroke: '#3a2510',
      strokeThickness: 6,
    }).setScrollFactor(0).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Start zone depending on save
    const spawnZone = level.zones[this.currentZoneIdx] || level.zones[0];
    const spawnX = this.currentZoneIdx === 0 ? level.playerSpawn.x : spawnZone.bounds.x + 80;
    const spawnY = level.playerSpawn.y;

    // Players
    this.mangobob = new Player(this, spawnX, spawnY, 'mangobob');
    this.jeff = new Player(this, spawnX + 50, spawnY + 10, 'jeff');

    this.activeKey = 'mangobob';
    this.mangobob.setActiveCharacter(true);
    this.jeff.setActiveCharacter(false);
    this.companion = new Companion(this.jeff);

    this.mangobob.on('died', () => this.handleActiveDeath('mangobob'));
    this.jeff.on('died', () => this.handleActiveDeath('jeff'));

    // Groups
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.bossGroup = this.physics.add.group({ runChildUpdate: false });
    this.projectilesPlayer = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.projectilesEnemy = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.pickups = this.physics.add.group();

    // Collisions
    this.physics.add.collider(this.mangobob, this.obstacles);
    this.physics.add.collider(this.jeff, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.collider(this.bossGroup, this.obstacles);

    this.physics.add.overlap(this.projectilesPlayer, this.obstacles, (p) => p.explode(true), null, this);
    this.physics.add.overlap(this.projectilesEnemy, this.obstacles, (p) => p.explode(true), null, this);

    this.physics.add.overlap(this.projectilesPlayer, this.enemies, (p, e) => this.hitEnemy(p, e), null, this);
    this.physics.add.overlap(this.projectilesPlayer, this.bossGroup, (p, b) => this.hitBoss(p, b), null, this);
    this.physics.add.overlap(this.projectilesEnemy, [this.mangobob, this.jeff], (p, pl) => this.hitPlayer(p, pl), null, this);

    this.physics.add.overlap([this.mangobob, this.jeff], this.pickups, (pl, pk) => this.pickUp(pl, pk), null, this);

    this.physics.add.overlap([this.mangobob, this.jeff], this.enemies, (pl, e) => this.contactDamage(pl, e), null, this);
    this.physics.add.overlap([this.mangobob, this.jeff], this.bossGroup, (pl, b) => this.contactDamage(pl, b), null, this);

    // Gates physically block players until their zone is cleared
    this.physics.add.collider([this.mangobob, this.jeff], this.gates, (pl, g) => this.showGateHint(pl, g), (pl, g) => {
      const zIdx = LEVEL1.zones.findIndex((zz) => zz.id === g.zoneId);
      return zIdx >= 0 && !this.zoneState[zIdx].cleared;
    }, this);

    // Camera
    this.cameras.main.startFollow(this.getActive(), true, 0.12, 0.12);

    // Input
    this.keys = this.input.keyboard.addKeys({
      W: 'W', A: 'A', S: 'S', D: 'D',
      UP: 'UP', DOWN: 'DOWN', LEFT: 'LEFT', RIGHT: 'RIGHT',
      SPACE: 'SPACE', E: 'E', F: 'F', R: 'R', SHIFT: 'SHIFT', Q: 'Q', P: 'P', M: 'M', ESC: 'ESC',
    });
    this.input.keyboard.on('keydown-Q', () => this.swapCharacters());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-R', () => this.tryActivateFury());
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));

    // Wave state per zone
    this.zoneState = level.zones.map((z) => ({
      spawned: false,
      clearedInitial: false,
      totalSpawned: 0,
      wavesRun: 0,
      cleared: z.isBoss ? false : z.waves.length === 0,
    }));

    this.enteredZone(this.currentZoneIdx, true);

    // Timer for enemy update (we'll manage in our own update loop)
    this.events.emit('hud-refresh', this.getHudState());
  }

  drawFloor(level) {
    const tile = 32;
    for (let x = 0; x < level.width; x += tile) {
      for (let y = 0; y < level.height; y += tile) {
        // Path through middle row-ish
        const isPath = y >= 288 && y < 352;
        this.add.image(x + tile / 2, y + tile / 2, isPath ? 'path' : 'grass').setDepth(0);
      }
    }
    // Zone tint overlays for visual distinction
    const overlay2 = this.add.rectangle(960 + 480, 320, 960, 640, 0x804020, 0.06).setDepth(0.5);
    const overlay3 = this.add.rectangle(1920 + 480, 320, 960, 640, 0x400030, 0.12).setDepth(0.5);
  }

  placeObstacle(o) {
    const sprite = this.obstacles.create(o.x, o.y, o.type);
    sprite.setDepth(o.type === 'tree' ? 15 : 6);
    if (o.type === 'tree') {
      sprite.body.setSize(sprite.width * 0.4, sprite.height * 0.25);
      sprite.body.setOffset(sprite.width * 0.3, sprite.height * 0.7);
    } else if (o.type === 'rock') {
      sprite.body.setSize(sprite.width * 0.85, sprite.height * 0.7);
      sprite.body.setOffset(sprite.width * 0.08, sprite.height * 0.2);
    }
    sprite.refreshBody();
  }

  getActive() { return this.activeKey === 'mangobob' ? this.mangobob : this.jeff; }
  getCompanion() { return this.activeKey === 'mangobob' ? this.jeff : this.mangobob; }

  swapCharacters() {
    const newActive = this.activeKey === 'mangobob' ? 'jeff' : 'mangobob';
    const newP = newActive === 'mangobob' ? this.mangobob : this.jeff;
    if (!newP.isAlive) return;
    this.activeKey = newActive;
    this.mangobob.setActiveCharacter(this.activeKey === 'mangobob');
    this.jeff.setActiveCharacter(this.activeKey === 'jeff');
    this.companion = new Companion(this.getCompanion());
    this.cameras.main.startFollow(this.getActive(), true, 0.12, 0.12);

    // Little flash
    const p = this.getActive();
    const ring = this.add.circle(p.x, p.y, 4, 0xffe24a, 0).setStrokeStyle(3, 0xffe24a);
    this.tweens.add({ targets: ring, radius: 40, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    this.events.emit('hud-refresh', this.getHudState());
  }

  togglePause() {
    this.paused = !this.paused;
    this.physics.world.isPaused = this.paused;
    this.events.emit('hud-pause', this.paused);
  }

  enteredZone(idx, isFirst = false) {
    const level = LEVEL1;
    const zone = level.zones[idx];
    if (!zone) return;

    this.currentZoneIdx = idx;

    // Show label
    const label = this.zoneLabel;
    label.setText(zone.name).setPosition(GAME_WIDTH / 2, 80).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, duration: 300, hold: 1500, yoyo: true });

    const zs = this.zoneState[idx];
    if (zs.spawned) return;
    zs.spawned = true;

    if (zone.isBoss) {
      this.spawnBoss(zone);
      return;
    }

    // Spawn first wave (non "afterCleared") immediately with its delay
    zone.waves.forEach((w, wIdx) => {
      if (w.afterCleared) return;
      this.time.delayedCall(w.delay, () => this.runWave(idx, wIdx));
    });
  }

  runWave(zoneIdx, waveIdx) {
    const zone = LEVEL1.zones[zoneIdx];
    const wave = zone.waves[waveIdx];
    if (!wave) return;
    const zs = this.zoneState[zoneIdx];
    wave.spawns.forEach((s) => {
      if (s.type === 'monkey') {
        const m = new Monkey(this, s.x, s.y);
        this.enemies.add(m);
        m.zoneIdx = zoneIdx;
        zs.totalSpawned++;
      }
    });
    zs.wavesRun++;
  }

  onZoneInitialCleared(zoneIdx) {
    const zone = LEVEL1.zones[zoneIdx];
    const zs = this.zoneState[zoneIdx];
    if (zs.clearedInitial) return;
    zs.clearedInitial = true;

    // Run "afterCleared" waves if any
    const afterWaves = zone.waves.filter((w) => w.afterCleared);
    if (afterWaves.length === 0) {
      this.markZoneCleared(zoneIdx);
      return;
    }
    afterWaves.forEach((w) => this.time.delayedCall(Math.max(600, w.delay), () => this.runWave(zoneIdx, zone.waves.indexOf(w))));
  }

  markZoneCleared(zoneIdx) {
    const zs = this.zoneState[zoneIdx];
    zs.cleared = true;

    // Open gate
    this.gates.getChildren().forEach((g) => {
      if (g.zoneId === LEVEL1.zones[zoneIdx].id) {
        this.tweens.add({
          targets: g,
          alpha: 0,
          scaleX: 0.2,
          duration: 500,
          onComplete: () => { g.body.enable = false; g.destroy(); },
        });
        // Drop a golden mango reward
        this.spawnPickup(g.x, g.y + 40, 'golden-mango');
      }
    });

    // Save progress
    this.save = SaveSystem.save({
      ...this.save,
      zone: Math.min(LEVEL1.zones.length, zoneIdx + 2),
      mangoesCollected: this.mangoesCollected,
      mangobobLives: this.mangobobLives,
      jeffLives: this.jeffLives,
    });

    this.cameras.main.flash(180, 255, 200, 100);
  }

  showGateHint(player, gate) {
    if (this.gateHintShownAt && this.time.now - this.gateHintShownAt < 1400) return;
    this.gateHintShownAt = this.time.now;
    const msg = this.add.text(gate.x, gate.y - 60, 'Clear the zone!', {
      fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#ffb347',
      stroke: '#3a2510', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: msg, y: gate.y - 90, alpha: 0, duration: 1200, onComplete: () => msg.destroy() });
  }

  update(time, delta) {
    if (this.paused) return;

    const active = this.getActive();
    const companion = this.getCompanion();

    const input = {
      up: this.keys.W.isDown || this.keys.UP.isDown,
      down: this.keys.S.isDown || this.keys.DOWN.isDown,
      left: this.keys.A.isDown || this.keys.LEFT.isDown,
      right: this.keys.D.isDown || this.keys.RIGHT.isDown,
      dodgePressed: Phaser.Input.Keyboard.JustDown(this.keys.SHIFT),
    };

    active.update(time, delta, input);
    companion.update(time, delta, null);
    this.companion.update(active, time, delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.tryPrimary(active, time);
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.trySecondary(active, time);
    if (Phaser.Input.Keyboard.JustDown(this.keys.F)) this.tryHeavy(active, time);

    // Enemy update + check current zone
    this.enemies.getChildren().forEach((e) => e.update(time, delta, active));
    this.bossGroup.getChildren().forEach((b) => b.update(time, delta, active));

    // Fury timer + aura follow
    if (this.mangobob.furyAura && this.mangobob.furyAura.visible) {
      this.mangobob.furyAura.setPosition(this.mangobob.x, this.mangobob.y);
    }
    if (this.furyActive && time > this.furyUntil) this.deactivateFury();

    // Zone transition: detect based on active char x
    const curZone = LEVEL1.zones[this.currentZoneIdx];
    if (curZone) {
      const nextIdx = LEVEL1.zones.findIndex((z) =>
        active.x >= z.bounds.x && active.x < z.bounds.x + z.bounds.width
      );
      if (nextIdx !== -1 && nextIdx !== this.currentZoneIdx) {
        this.currentZoneIdx = nextIdx;
        this.enteredZone(nextIdx);
      }
    }

    // Refresh HUD periodically
    if (!this.lastHud || time - this.lastHud > 100) {
      this.lastHud = time;
      this.events.emit('hud-refresh', this.getHudState());
    }
  }

  tryPrimary(player, time) {
    if (!player.tryPrimary(time)) return;
    const aim = player.getAimDirection();
    if (player.charKey === 'mangobob') {
      // Mango Club swing
      const empowered = this.furyActive;
      const damage = empowered ? player.cfg.primaryDamage * 2 : player.cfg.primaryDamage;
      const reach = empowered ? player.cfg.primaryReach * 1.5 : player.cfg.primaryReach;
      this.meleeHit(player, aim, reach, damage);
      player.swingClub(aim, empowered);
      this.cameras.main.shake(empowered ? 80 : 40, empowered ? 0.004 : 0.002);

      if (empowered) {
        // Radial mini-mango shockwave on every Fury hit
        const baseAngle = Math.atan2(aim.y, aim.x);
        for (let i = 0; i < 5; i++) {
          const a = baseAngle + (i - 2) * 0.35;
          const dir = { x: Math.cos(a), y: Math.sin(a) };
          this.firePlayerProjectile(player, 'mango', dir, {
            speed: 420, damage: 2, ttl: 450, scale: 0.85, spin: 14,
          });
        }
      }
    } else {
      // Slingshot: fast small projectile
      this.firePlayerProjectile(player, 'mango', aim, {
        speed: 520, damage: player.cfg.primaryDamage, ttl: 800, scale: 0.9, spin: 12,
      });
    }
  }

  tryActivateFury() {
    if (this.paused) return;
    if (this.furyActive) return;
    if (this.furyCharge < this.furyMax) return;
    if (!this.mangobob.isAlive) return;

    this.furyActive = true;
    this.furyUntil = this.time.now + 6000;
    this.furyCharge = 0;

    const mb = this.mangobob;
    mb.setTint(0xffe24a);
    if (mb.furyAura) {
      mb.furyAura.setVisible(true).setAlpha(0.9).setScale(1);
      this.furyPulse = this.tweens.add({
        targets: mb.furyAura,
        scale: { from: 1, to: 1.4 },
        alpha: { from: 0.9, to: 0.5 },
        duration: 420,
        yoyo: true,
        repeat: -1,
      });
    }

    this.cameras.main.flash(260, 255, 220, 100);
    this.cameras.main.shake(260, 0.008);

    const banner = this.add.text(GAME_WIDTH / 2, 140, 'MANGO FURY!', {
      fontFamily: 'Trebuchet MS', fontSize: '56px', fontStyle: 'bold',
      color: '#ffe24a', stroke: '#3a2510', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setScale(0.5);
    this.tweens.add({
      targets: banner,
      scale: { from: 0.5, to: 1.4 },
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => banner.destroy(),
    });

    this.events.emit('fury-activated');
    this.events.emit('hud-refresh', this.getHudState());
  }

  deactivateFury() {
    this.furyActive = false;
    this.mangobob.clearTint();
    if (this.mangobob.furyAura) this.mangobob.furyAura.setVisible(false);
    if (this.furyPulse) { this.furyPulse.stop(); this.furyPulse = null; }
    this.events.emit('fury-ended');
    this.events.emit('hud-refresh', this.getHudState());
  }

  gainFury(amount) {
    if (this.furyActive) return;
    const before = this.furyCharge;
    this.furyCharge = Math.min(this.furyMax, this.furyCharge + amount);
    if (before < this.furyMax && this.furyCharge === this.furyMax) {
      this.cameras.main.flash(180, 255, 220, 80);
      const hint = this.add.text(GAME_WIDTH / 2, 110, 'FURY READY — press R', {
        fontFamily: 'Trebuchet MS', fontSize: '22px', color: '#ffe24a',
        stroke: '#3a2510', strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      this.tweens.add({ targets: hint, alpha: 0, y: 90, duration: 1600, delay: 400, onComplete: () => hint.destroy() });
    }
  }

  trySecondary(player, time) {
    if (!player.trySecondary(time)) return;
    const aim = player.getAimDirection();
    if (player.charKey === 'mangobob') {
      // Thrown mango
      this.firePlayerProjectile(player, 'mango', aim, {
        speed: 360, damage: player.cfg.secondaryDamage, ttl: 1000, scale: 1.3, spin: 8,
      });
    } else {
      // Grenade arc with splash
      this.firePlayerProjectile(player, 'grenade', aim, {
        speed: 320, damage: 0, ttl: 900, splashRadius: 78, splashDamage: player.cfg.secondaryDamage,
        scale: 1.2, spin: 10, explodeOnImpact: true,
      });
    }
  }

  tryHeavy(player, time) {
    if (!player.tryHeavy(time)) return;
    if (player.charKey !== 'mangobob') return;
    const aim = player.getAimDirection();
    this.firePlayerProjectile(player, 'bazooka-shot', aim, {
      speed: 440, damage: player.cfg.heavyDamage, ttl: 1400, splashRadius: 80,
      splashDamage: Math.floor(player.cfg.heavyDamage * 0.5), scale: 1.5, spin: 0,
    });
    this.cameras.main.shake(120, 0.006);
  }

  meleeHit(player, aim, reach, damage) {
    const cx = player.x + aim.x * reach;
    const cy = player.y + aim.y * reach;
    const hitbox = new Phaser.Geom.Circle(cx, cy, 26);
    this.enemies.getChildren().forEach((e) => {
      if (Phaser.Geom.Intersects.CircleToRectangle(hitbox, e.getBounds())) {
        e.takeDamage(damage, player);
        this.checkZoneClear(e.zoneIdx);
      }
    });
    this.bossGroup.getChildren().forEach((b) => {
      if (Phaser.Geom.Intersects.CircleToRectangle(hitbox, b.getBounds())) {
        b.takeDamage(damage, player);
      }
    });
  }

  firePlayerProjectile(player, texture, aim, opts) {
    const p = this.projectilesPlayer.get(player.x + aim.x * 20, player.y + aim.y * 20, texture);
    if (!p) return;
    p.setTexture(texture);
    p.fire({
      vx: aim.x * opts.speed,
      vy: aim.y * opts.speed,
      damage: opts.damage,
      ttl: opts.ttl,
      splashRadius: opts.splashRadius || 0,
      splashDamage: opts.splashDamage || 0,
      scale: opts.scale || 1,
      spin: opts.spin || 0,
      explodeOnImpact: opts.explodeOnImpact !== false,
      fromPlayer: true,
    });
  }

  applySplash(proj) {
    const enemies = this.enemies.getChildren().concat(this.bossGroup.getChildren());
    enemies.forEach((e) => {
      const d = Phaser.Math.Distance.Between(proj.x, proj.y, e.x, e.y);
      if (d <= proj.splashRadius) {
        e.takeDamage(proj.splashDamage, proj);
        if (e.zoneIdx !== undefined) this.checkZoneClear(e.zoneIdx);
      }
    });
    // Also damages players caught in enemy splashes
    if (!proj.fromPlayer) {
      [this.mangobob, this.jeff].forEach((pl) => {
        const d = Phaser.Math.Distance.Between(proj.x, proj.y, pl.x, pl.y);
        if (d <= proj.splashRadius) pl.takeDamage(proj.splashDamage, proj, this.time.now);
      });
    }
  }

  hitEnemy(proj, enemy) {
    if (!proj.active) return;
    if (proj.damage > 0) enemy.takeDamage(proj.damage, proj);
    this.checkZoneClear(enemy.zoneIdx);
    proj.explode(true);
  }

  hitBoss(proj, boss) {
    if (!proj.active) return;
    if (proj.damage > 0) boss.takeDamage(proj.damage, proj);
    proj.explode(true);
  }

  hitPlayer(proj, player) {
    if (!proj.active || !player.isAlive) return;
    if (proj.damage > 0 && player.takeDamage(proj.damage, proj, this.time.now)) {
      this.events.emit('hud-refresh', this.getHudState());
    }
    proj.explode(true);
  }

  contactDamage(player, enemy) {
    if (!player.isAlive || !enemy.active) return;
    if (player.takeDamage(1, enemy, this.time.now)) {
      this.events.emit('hud-refresh', this.getHudState());
    }
  }

  checkZoneClear(zoneIdx) {
    if (zoneIdx === undefined) return;
    const remaining = this.enemies.getChildren().filter((e) => e.zoneIdx === zoneIdx && e.active).length;
    if (remaining === 0) {
      const zs = this.zoneState[zoneIdx];
      if (!zs.clearedInitial) this.onZoneInitialCleared(zoneIdx);
      else if (!zs.cleared) this.markZoneCleared(zoneIdx);
    }
  }

  enemyThrow(enemy, target) {
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const p = this.projectilesEnemy.get(enemy.x, enemy.y, 'mango');
    if (!p) return;
    p.setTexture('mango');
    p.fire({
      vx: (dx / len) * 260, vy: (dy / len) * 260,
      damage: 1, ttl: 1400, scale: 1, spin: 10, fromPlayer: false,
    });
  }

  // Boss attacks
  spawnBoss(zone) {
    const boss = new Boss(this, zone.bounds.x + zone.bounds.width / 2, zone.bounds.y + 240);
    this.bossGroup.add(boss);
    boss.zoneIdx = LEVEL1.zones.indexOf(zone);
    this.events.emit('boss-appeared', boss);
    this.cameras.main.shake(400, 0.01);
    this.events.once('bossDefeated', () => this.onBossDefeated());
  }

  bossSpreadShot(boss, target) {
    const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const count = boss.phase >= 3 ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.25;
      const a = baseAngle + spread;
      const p = this.projectilesEnemy.get(boss.x, boss.y, 'mango');
      if (!p) continue;
      p.setTexture('mango');
      p.fire({
        vx: Math.cos(a) * 240, vy: Math.sin(a) * 240,
        damage: 1, ttl: 1800, scale: 1.3, spin: 12, fromPlayer: false,
      });
    }
  }

  bossSlam(boss, target) {
    // Telegraph ring, then AOE
    const tele = this.add.circle(target.x, target.y, 10, 0xff3e3e, 0).setStrokeStyle(3, 0xff3e3e).setDepth(50);
    this.tweens.add({ targets: tele, radius: 90, alpha: 0.8, yoyo: true, duration: 550, onComplete: () => tele.destroy() });
    this.time.delayedCall(550, () => {
      // Spawn an "immobile" projectile as AOE at target location
      const p = this.projectilesEnemy.get(target.x, target.y, 'splash');
      if (!p) return;
      p.setTexture('splash');
      p.fire({
        vx: 0, vy: 0, damage: 0, ttl: 120,
        splashRadius: 90, splashDamage: 2, scale: 1, spin: 0, fromPlayer: false,
      });
      // Instant explode
      this.time.delayedCall(30, () => p.explode(true));
      this.cameras.main.shake(220, 0.008);
    });
  }

  bossBarrage(boss, target) {
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 140, () => {
        if (!boss.active) return;
        const ox = Phaser.Math.Between(-40, 40);
        const oy = Phaser.Math.Between(-40, 40);
        const tx = target.x + Phaser.Math.Between(-80, 80);
        const ty = target.y + Phaser.Math.Between(-80, 80);
        const dx = tx - (boss.x + ox);
        const dy = ty - (boss.y + oy);
        const len = Math.hypot(dx, dy) || 1;
        const p = this.projectilesEnemy.get(boss.x + ox, boss.y + oy, 'mango');
        if (!p) return;
        p.setTexture('mango');
        p.fire({
          vx: (dx / len) * 300, vy: (dy / len) * 300,
          damage: 1, ttl: 1600, scale: 1.1, spin: 10, fromPlayer: false,
        });
      });
    }
  }

  bossSummon(boss) {
    for (let i = 0; i < 2; i++) {
      const ox = Phaser.Math.Between(-100, 100);
      const oy = Phaser.Math.Between(-80, 80);
      const m = new Monkey(this, boss.x + ox, boss.y + oy);
      m.maxHealth = 3;
      m.health = 3;
      m.zoneIdx = boss.zoneIdx;
      this.enemies.add(m);
    }
  }

  onBossDefeated() {
    this.save = SaveSystem.save({
      ...this.save, bossDefeated: true,
      mangobobLives: this.mangobobLives, jeffLives: this.jeffLives,
      mangoesCollected: this.mangoesCollected,
    });
    this.time.delayedCall(1400, () => {
      this.scene.stop('UI');
      this.scene.start('Victory', {
        mangoes: this.mangoesCollected,
        mangobobLives: this.mangobobLives,
        jeffLives: this.jeffLives,
      });
    });
  }

  spawnPickup(x, y, forceType) {
    let type = forceType;
    if (!type) {
      type = Phaser.Math.Between(0, 99) < 70 ? 'mango' : 'golden-mango';
    }
    const pk = this.pickups.create(x, y, type);
    pk.pickupType = type;
    pk.setDepth(8);
    pk.body.setSize(14, 14);
    this.tweens.add({ targets: pk, y: y - 4, yoyo: true, duration: 500, repeat: -1 });
  }

  pickUp(player, pk) {
    if (pk.pickupType === 'mango') {
      player.heal(2);
      this.gainFury(1);
    } else if (pk.pickupType === 'golden-mango') {
      this.mangoesCollected++;
      [this.mangobob, this.jeff].forEach((p) => p.heal(1));
      this.gainFury(2);
    }
    const fx = this.add.image(pk.x, pk.y, 'splash').setScale(0.3).setAlpha(0.7).setDepth(14);
    this.tweens.add({ targets: fx, scale: 0.9, alpha: 0, duration: 260, onComplete: () => fx.destroy() });
    pk.destroy();
    this.events.emit('hud-refresh', this.getHudState());
  }

  handleActiveDeath(key) {
    const dead = key === 'mangobob' ? this.mangobob : this.jeff;
    const other = key === 'mangobob' ? this.jeff : this.mangobob;
    const livesKey = key === 'mangobob' ? 'mangobobLives' : 'jeffLives';

    dead.setVisible(false);
    dead.body.enable = false;

    // Decrement THIS character's personal lives
    this[livesKey] = Math.max(0, this[livesKey] - 1);
    this.save = SaveSystem.save({
      ...this.save,
      mangobobLives: this.mangobobLives,
      jeffLives: this.jeffLives,
    });

    // If they were the active character and the partner is still alive, swap to partner
    if (this.activeKey === key && other.isAlive) {
      this.activeKey = key === 'mangobob' ? 'jeff' : 'mangobob';
      this.mangobob.setActiveCharacter(this.activeKey === 'mangobob');
      this.jeff.setActiveCharacter(this.activeKey === 'jeff');
      this.cameras.main.startFollow(this.getActive(), true, 0.12, 0.12);
      this.companion = new Companion(this.getCompanion());
    }

    this.events.emit('hud-refresh', this.getHudState());

    if (other.isAlive) {
      // Partner still fighting — auto-revive this one if they have lives left
      if (this[livesKey] > 0) {
        this.time.delayedCall(5000, () => {
          if (!dead.isAlive && this[livesKey] > 0 && other.isAlive) {
            const active = this.getActive();
            dead.revive(active.x + 40, active.y + 20);
            this.events.emit('hud-refresh', this.getHudState());
          }
        });
      }
      // Else: they sit out permanently, partner plays solo
      return;
    }

    // Both down now.
    if (this.pendingWipe) return; // debounce if both died in the same frame
    this.pendingWipe = true;

    const bothOut = this.mangobobLives <= 0 && this.jeffLives <= 0;
    if (bothOut) {
      this.time.delayedCall(900, () => {
        this.scene.stop('UI');
        this.scene.start('GameOver', { mangoes: this.mangoesCollected });
      });
    } else {
      this.time.delayedCall(1000, () => {
        this.pendingWipe = false;
        this.respawnAtZoneStart();
      });
    }
  }

  respawnAtZoneStart() {
    const zone = LEVEL1.zones[this.currentZoneIdx];
    const x = this.currentZoneIdx === 0 ? LEVEL1.playerSpawn.x : zone.bounds.x + 80;
    const y = LEVEL1.playerSpawn.y;

    let firstUp = null;
    if (this.mangobobLives > 0) {
      this.mangobob.revive(x, y);
      firstUp = 'mangobob';
    }
    if (this.jeffLives > 0) {
      this.jeff.revive(x + (firstUp ? 50 : 0), y + (firstUp ? 10 : 0));
      if (!firstUp) firstUp = 'jeff';
    }

    this.activeKey = firstUp;
    this.mangobob.setActiveCharacter(this.activeKey === 'mangobob');
    this.jeff.setActiveCharacter(this.activeKey === 'jeff');
    this.companion = new Companion(this.getCompanion());
    this.cameras.main.startFollow(this.getActive(), true, 0.12, 0.12);
    this.cameras.main.flash(200, 255, 220, 140);
    this.events.emit('hud-refresh', this.getHudState());
  }

  getHudState() {
    const boss = this.bossGroup.getChildren()[0];
    return {
      activeKey: this.activeKey,
      mangobob: { hp: this.mangobob.health, max: this.mangobob.maxHealth, alive: this.mangobob.isAlive, lives: this.mangobobLives },
      jeff: { hp: this.jeff.health, max: this.jeff.maxHealth, alive: this.jeff.isAlive, lives: this.jeffLives },
      mangoes: this.mangoesCollected,
      zoneName: LEVEL1.zones[this.currentZoneIdx]?.name || '',
      boss: boss && boss.active ? { hp: boss.health, max: boss.maxHealth } : null,
      fury: {
        charge: this.furyCharge,
        max: this.furyMax,
        active: this.furyActive,
        remaining: this.furyActive ? Math.max(0, this.furyUntil - this.time.now) : 0,
      },
    };
  }
}
