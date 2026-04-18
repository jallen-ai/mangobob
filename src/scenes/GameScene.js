import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { Player, CHAR_CONFIG } from '../entities/Player.js';
import { Companion } from '../entities/Companion.js';
import { Projectile } from '../entities/Projectile.js';
import { Monkey, Boss } from '../entities/Enemy.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Sound } from '../systems/Sound.js';
import { LEVEL1 } from '../levels/Level1.js';
import { LEVEL2 } from '../levels/Level2.js';

const LEVELS = { 1: LEVEL1, 2: LEVEL2 };

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create(data) {
    this.save = SaveSystem.load();
    this.mangobobLives = this.save.mangobobLives;
    this.jeffLives = this.save.jeffLives;
    this.mangoesCollected = this.save.mangoesCollected;
    this.wallet = this.save.wallet || 0;
    this.currentLevelId = data?.level || this.save.levelId || 1;
    this.currentLevel = LEVELS[this.currentLevelId] || LEVEL1;
    this.currentZoneIdx = data?.zoneIdx !== undefined ? data.zoneIdx : Math.max(0, (this.save.zone || 1) - 1);
    this.paused = false;

    // Mango Fury super-move — max and duration can be tuned by upgrades
    this.furyCharge = 0;
    this.furyMax = 5;
    this.furyDuration = 6000;
    this.furyActive = false;
    this.furyUntil = 0;

    // World bounds = the full level width
    const level = this.currentLevel;
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

    // Players — Jeff is temporarily out of the game. Keep a hidden stub so references work.
    const owned = this.save.upgrades || [];
    this.mangobob = new Player(this, spawnX, spawnY, 'mangobob', owned);
    this.jeff = new Player(this, spawnX + 9999, spawnY, 'jeff');
    this.jeff.setVisible(false);
    this.jeff.body.enable = false;
    this.jeff.isAlive = false;
    this.jeff.setActive(false);

    this.activeKey = 'mangobob';
    this.mangobob.setActiveCharacter(true);
    this.companion = null;

    this.mangobob.on('died', () => this.handleActiveDeath('mangobob'));

    // Apply any global-level upgrade effects (Fury + bonus lives)
    if (this.mangobob.cfg.furyMax) this.furyMax = this.mangobob.cfg.furyMax;
    if (this.mangobob.cfg.furyDuration) this.furyDuration = this.mangobob.cfg.furyDuration;
    if (this.mangobob.cfg.bonusLives && !this.save.bonusLivesApplied) {
      this.mangobobLives += this.mangobob.cfg.bonusLives;
      this.save = SaveSystem.save({ ...this.save, mangobobLives: this.mangobobLives, bonusLivesApplied: true });
    }

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
      const zIdx = this.currentLevel.zones.findIndex((zz) => zz.id === g.zoneId);
      return zIdx >= 0 && !this.zoneState[zIdx].cleared;
    }, this);

    // Camera
    this.cameras.main.startFollow(this.getActive(), true, 0.12, 0.12);

    // Input
    this.keys = this.input.keyboard.addKeys({
      W: 'W', A: 'A', S: 'S', D: 'D',
      UP: 'UP', DOWN: 'DOWN', LEFT: 'LEFT', RIGHT: 'RIGHT',
      SPACE: 'SPACE', E: 'E', F: 'F', R: 'R', V: 'V', SHIFT: 'SHIFT', Q: 'Q', P: 'P', M: 'M', ESC: 'ESC',
    });
    // Q swap disabled while Jeff is out of the lineup
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-R', () => this.tryActivateFury());
    this.input.keyboard.on('keydown-M', () => { Sound.toggleMute(); });
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
    const baseFloor = level.floorTile || 'grass';
    const accent = level.accentTile || 'path';
    for (let x = 0; x < level.width; x += tile) {
      for (let y = 0; y < level.height; y += tile) {
        const isPath = y >= 288 && y < 352;
        this.add.image(x + tile / 2, y + tile / 2, isPath ? accent : baseFloor).setDepth(0);
      }
    }
    // Zone tint overlays for visual distinction (same pattern regardless of level)
    this.add.rectangle(960 + 480, 320, 960, 640, 0x804020, 0.06).setDepth(0.5);
    this.add.rectangle(1920 + 480, 320, 960, 640, 0x400030, 0.12).setDepth(0.5);
  }

  placeObstacle(o) {
    const sprite = this.obstacles.create(o.x, o.y, o.type);
    sprite.setDepth(o.type === 'tree' ? 15 : 6);
    if (o.type === 'tree') {
      sprite.body.setSize(sprite.width * 0.4, sprite.height * 0.25);
      sprite.body.setOffset(sprite.width * 0.3, sprite.height * 0.7);
    } else if (o.type === 'rock' || o.type === 'metal-crate') {
      sprite.body.setSize(sprite.width * 0.85, sprite.height * 0.7);
      sprite.body.setOffset(sprite.width * 0.08, sprite.height * 0.2);
    } else if (o.type === 'pipe') {
      sprite.body.setSize(sprite.width * 0.75, sprite.height * 0.85);
      sprite.body.setOffset(sprite.width * 0.12, sprite.height * 0.1);
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
    const level = this.currentLevel;
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
    const zone = this.currentLevel.zones[zoneIdx];
    const wave = zone.waves[waveIdx];
    if (!wave) return;
    const zs = this.zoneState[zoneIdx];
    wave.spawns.forEach((s) => {
      if (s.type === 'monkey' || s.type === 'small-monkey' || s.type === 'big-monkey') {
        const variant = s.type === 'small-monkey' ? 'small' : s.type === 'big-monkey' ? 'big' : 'normal';
        const m = new Monkey(this, s.x, s.y, variant);
        this.enemies.add(m);
        m.zoneIdx = zoneIdx;
        zs.totalSpawned++;
      }
    });
    zs.wavesRun++;
  }

  onZoneInitialCleared(zoneIdx) {
    const zone = this.currentLevel.zones[zoneIdx];
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
    let gateFound = false;
    this.gates.getChildren().forEach((g) => {
      if (g.zoneId === this.currentLevel.zones[zoneIdx].id) {
        gateFound = true;
        this.tweens.add({
          targets: g,
          alpha: 0,
          scaleX: 0.2,
          duration: 500,
          onComplete: () => { g.body.enable = false; g.destroy(); },
        });
        this.spawnPickup(g.x, g.y + 40, 'golden-mango');
      }
    });
    if (gateFound) Sound.gateOpen();
    Sound.zoneCleared();

    // Save progress
    this.save = SaveSystem.save({
      ...this.save,
      levelId: this.currentLevelId,
      zone: Math.min(this.currentLevel.zones.length, zoneIdx + 2),
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
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.keys.V),
    };

    active.update(time, delta, input);
    if (this.companion && companion && companion !== active) {
      companion.update(time, delta, null);
      this.companion.update(active, time, delta);
    }

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
    const curZone = this.currentLevel.zones[this.currentZoneIdx];
    if (curZone) {
      const nextIdx = this.currentLevel.zones.findIndex((z) =>
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
      (empowered ? Sound.furyHit : Sound.swing)();
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
      Sound.slingshot();
    }
  }

  tryActivateFury() {
    if (this.paused) return;
    if (this.furyActive) return;
    if (this.furyCharge < this.furyMax) return;
    if (!this.mangobob.isAlive) return;

    this.furyActive = true;
    this.furyUntil = this.time.now + this.furyDuration;
    this.furyCharge = 0;

    Sound.furyActivate();
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
      Sound.furyReady();
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
      this.firePlayerProjectile(player, 'mango', aim, {
        speed: 360, damage: player.cfg.secondaryDamage, ttl: 1000, scale: 1.3, spin: 8,
      });
      Sound.throw();
    } else {
      this.firePlayerProjectile(player, 'grenade', aim, {
        speed: 320, damage: 0, ttl: 900, splashRadius: 78, splashDamage: player.cfg.secondaryDamage,
        scale: 1.2, spin: 10, explodeOnImpact: true,
      });
      Sound.throw();
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
    Sound.bazooka();
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
    if (proj.fromPlayer) Sound.grenade();
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
    if (proj.damage > 0) {
      enemy.takeDamage(proj.damage, proj);
      Sound.mangoSplat();
    }
    this.checkZoneClear(enemy.zoneIdx);
    proj.explode(true);
  }

  hitBoss(proj, boss) {
    if (!proj.active) return;
    if (proj.damage > 0) {
      boss.takeDamage(proj.damage, proj);
      Sound.mangoSplat();
    }
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
    if (player.airborne) return; // jumping over ground threats
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
    const encounter = this.save.bossEncounters || 0;
    // Final arena for now = Level 2 (we have 2 levels until Phase F lands Levels 3+4)
    // When 4-level campaign exists, change the condition to currentLevelId === 4.
    const isFinal = this.currentLevelId >= 2;
    const boss = new Boss(this, zone.bounds.x + zone.bounds.width / 2, zone.bounds.y + 240, {
      encounterCount: encounter,
      isFinalEncounter: isFinal,
    });
    this.bossGroup.add(boss);
    boss.zoneIdx = this.currentLevel.zones.indexOf(zone);
    this.events.emit('boss-appeared', boss);
    Sound.bossRoar();
    this.cameras.main.shake(400, 0.01);
    this.events.once('bossDefeated', () => this.onBossDefeated());
    this.events.once('bossEscaped', () => this.onBossEscaped());
  }

  onBossEscaped() {
    // Count this encounter, open transition (same door mechanic as before)
    this.save = SaveSystem.save({
      ...this.save,
      bossEncounters: (this.save.bossEncounters || 0) + 1,
      levelId: this.currentLevelId,
    });
    this.time.delayedCall(800, () => this.spawnLevelTransitionDoor());
  }

  bossShockwave(boss, target) {
    const scene = this;
    // Boss visibly hops into the air then slams down — telegraph
    const originalY = boss.y;
    scene.tweens.add({
      targets: boss,
      y: originalY - 40,
      duration: 300,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Impact: shake + expanding ring
        scene.cameras.main.shake(300, 0.01);
        Sound.bossPhase();
        const ring = scene.add.circle(boss.x, originalY + 20, 20, 0xff6a1a, 0)
          .setStrokeStyle(6, 0xff6a1a).setDepth(20);
        const ring2 = scene.add.circle(boss.x, originalY + 20, 20, 0xffd070, 0)
          .setStrokeStyle(3, 0xffd070).setDepth(20);

        const maxRadius = 320;
        const duration = 650;
        scene.tweens.add({
          targets: [ring, ring2],
          radius: maxRadius,
          alpha: 0,
          duration,
          ease: 'Quad.easeOut',
          onComplete: () => { ring.destroy(); ring2.destroy(); },
        });

        // Damage check: as the ring expands, if the player is within a band near
        // the current radius AND not airborne, they take a hit. One-shot check
        // per attack to keep it clean.
        const startTime = scene.time.now;
        const damageTimer = scene.time.addEvent({
          delay: 30,
          repeat: Math.floor(duration / 30),
          callback: () => {
            const t = (scene.time.now - startTime) / duration;
            const r = 20 + (maxRadius - 20) * t;
            const active = scene.getActive();
            if (!active.isAlive || active.airborne) return;
            const d = Phaser.Math.Distance.Between(active.x, active.y, boss.x, originalY + 20);
            if (Math.abs(d - r) < 22) {
              if (active.takeDamage(2, boss, scene.time.now)) {
                scene.events.emit('hud-refresh', scene.getHudState());
              }
              damageTimer.remove();
            }
          },
        });
      },
    });
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
      levelId: this.currentLevelId,
      bossEncounters: (this.save.bossEncounters || 0) + 1,
    });

    if (this.currentLevelId === 1) {
      // Spawn the factory door for transition to Level 2
      this.time.delayedCall(1400, () => this.spawnLevelTransitionDoor());
    } else {
      // Level 2 boss (or any further level) → Victory
      this.time.delayedCall(1400, () => {
        this.scene.stop('UI');
        this.scene.start('Victory', {
          mangoes: this.mangoesCollected,
          mangobobLives: this.mangobobLives,
          jeffLives: this.jeffLives,
        });
      });
    }
  }

  spawnLevelTransitionDoor() {
    const zone = this.currentLevel.zones[this.currentZoneIdx];
    const dx = zone.bounds.x + zone.bounds.width / 2;
    const dy = zone.bounds.y + 200;
    const door = this.physics.add.staticImage(dx, dy, 'factory-door').setDepth(5);
    door.isTransitionDoor = true;

    // Beam of light behind the door to draw the eye
    const beam = this.add.rectangle(dx, dy, 140, 200, 0xffd070, 0.25).setDepth(4);
    this.tweens.add({ targets: beam, alpha: { from: 0.15, to: 0.45 }, duration: 700, yoyo: true, repeat: -1 });

    // Floating label above the door
    const hint = this.add.text(dx, dy - 70, 'MANGO FACTORY', {
      fontFamily: 'Trebuchet MS', fontSize: '20px', fontStyle: 'bold',
      color: '#ffb347', stroke: '#3a2510', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: hint, y: dy - 85, yoyo: true, duration: 900, repeat: -1 });

    this.physics.add.overlap(this.mangobob, door, () => this.enterLevel2(), null, this);

    // Play a door-open chime
    Sound.gateOpen();
    this.cameras.main.flash(300, 255, 220, 120);
  }

  enterLevel2() {
    if (this._transitioning) return;
    this._transitioning = true;
    Sound.zoneCleared();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Go through the shop before starting Level 2
      this.scene.stop('UI');
      this.scene.start('Shop', { nextLevel: 2, nextZoneIdx: 0 });
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
      const heal = player.cfg.mangoHealAmount || 2;
      player.heal(heal);
      this.gainFury(1);
      Sound.mangoPickup();
    } else if (pk.pickupType === 'golden-mango') {
      this.mangoesCollected++;
      this.wallet++;
      this.save = SaveSystem.save({ ...this.save, wallet: this.wallet });
      [this.mangobob, this.jeff].forEach((p) => p.heal(1));
      this.gainFury(2);
      Sound.goldenPickup();
    }
    const fx = this.add.image(pk.x, pk.y, 'splash').setScale(0.3).setAlpha(0.7).setDepth(14);
    this.tweens.add({ targets: fx, scale: 0.9, alpha: 0, duration: 260, onComplete: () => fx.destroy() });
    pk.destroy();
    this.events.emit('hud-refresh', this.getHudState());
  }

  handleActiveDeath(key) {
    if (key !== 'mangobob') return; // Jeff is out of the lineup
    const dead = this.mangobob;

    dead.setVisible(false);
    dead.body.enable = false;
    this.mangobobLives = Math.max(0, this.mangobobLives - 1);
    this.save = SaveSystem.save({
      ...this.save,
      mangobobLives: this.mangobobLives,
      jeffLives: this.jeffLives,
    });

    this.events.emit('hud-refresh', this.getHudState());

    if (this.pendingWipe) return;
    this.pendingWipe = true;

    if (this.mangobobLives <= 0) {
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
    const zone = this.currentLevel.zones[this.currentZoneIdx];
    const x = this.currentZoneIdx === 0 ? this.currentLevel.playerSpawn.x : zone.bounds.x + 80;
    const y = this.currentLevel.playerSpawn.y;

    this.mangobob.revive(x, y);
    this.mangobob.setActiveCharacter(true);
    this.activeKey = 'mangobob';
    this.cameras.main.startFollow(this.mangobob, true, 0.12, 0.12);
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
      zoneName: `${this.currentLevel.name || ''} \u2022 ${this.currentLevel.zones[this.currentZoneIdx]?.name || ''}`,
      wallet: this.wallet,
      boss: boss && boss.active ? { hp: boss.health, max: boss.maxHealth } : null,
      fury: {
        charge: this.furyCharge,
        max: this.furyMax,
        active: this.furyActive,
        remaining: this.furyActive ? Math.max(0, this.furyUntil - this.time.now) : 0,
        duration: this.furyDuration,
      },
    };
  }
}
