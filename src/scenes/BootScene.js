// Generates all placeholder art procedurally so we have zero asset dependencies.
// Every texture created here can later be replaced by a real sprite PNG with the same key.

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeMangoBob();
    this.makeJeff();
    this.makeMonkey();
    this.makeBoss();
    this.makeMango();
    this.makeGoldenMango();
    this.makeGrenade();
    this.makeBazooka();
    this.makePunch();
    this.makeSplash();
    this.makeRock();
    this.makeTree();
    this.makeCrate();
    this.makeGrass();
    this.makePath();
    this.makeGate();
    this.makeHeart();
    this.makePixel();

    this.scene.start('Title');
  }

  // Utility to bake Graphics -> Texture
  bake(key, w, h, draw) {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makeMangoBob() {
    this.bake('mangobob', 32, 36, (g) => {
      // Body (brown gorilla)
      g.fillStyle(0x3d2817, 1).fillRoundedRect(4, 12, 24, 22, 4);
      // Chest
      g.fillStyle(0x5a3a22, 1).fillRoundedRect(10, 18, 12, 12, 3);
      // Head
      g.fillStyle(0x2f1e10, 1).fillRoundedRect(6, 0, 20, 16, 5);
      // Face
      g.fillStyle(0xc49b6b, 1).fillRoundedRect(9, 4, 14, 10, 3);
      // Eyes
      g.fillStyle(0x000000, 1).fillRect(12, 7, 2, 2).fillRect(18, 7, 2, 2);
      // Mouth
      g.fillStyle(0x000000, 1).fillRect(13, 11, 6, 1);
      // Arms
      g.fillStyle(0x3d2817, 1).fillRoundedRect(0, 14, 6, 14, 2).fillRoundedRect(26, 14, 6, 14, 2);
    });
  }

  makeJeff() {
    this.bake('jeff', 26, 34, (g) => {
      // Body (blue shirt)
      g.fillStyle(0x3a72c4, 1).fillRoundedRect(3, 12, 20, 14, 3);
      // Pants
      g.fillStyle(0x2a3f6b, 1).fillRoundedRect(3, 24, 20, 10, 2);
      // Head
      g.fillStyle(0xf4c89a, 1).fillRoundedRect(5, 0, 16, 14, 4);
      // Hair
      g.fillStyle(0x6b3e1e, 1).fillRoundedRect(4, 0, 18, 5, 2);
      // Eyes
      g.fillStyle(0x000000, 1).fillRect(9, 7, 2, 2).fillRect(15, 7, 2, 2);
      // Mouth
      g.fillStyle(0x000000, 1).fillRect(11, 10, 4, 1);
      // Arms
      g.fillStyle(0xf4c89a, 1).fillRoundedRect(0, 14, 4, 10, 2).fillRoundedRect(22, 14, 4, 10, 2);
    });
  }

  makeMonkey() {
    this.bake('monkey', 26, 28, (g) => {
      g.fillStyle(0x7a4a22, 1).fillRoundedRect(3, 10, 20, 16, 4);
      g.fillStyle(0xa87043, 1).fillRoundedRect(8, 14, 10, 8, 2);
      g.fillStyle(0x5a3318, 1).fillRoundedRect(5, 0, 16, 12, 4);
      g.fillStyle(0xf4d8a8, 1).fillRoundedRect(8, 3, 10, 7, 2);
      g.fillStyle(0x000000, 1).fillRect(10, 5, 2, 2).fillRect(14, 5, 2, 2);
      g.fillStyle(0xaa1111, 1).fillRect(11, 8, 4, 1); // angry mouth
      g.fillStyle(0x7a4a22, 1).fillRoundedRect(0, 12, 4, 10, 2).fillRoundedRect(22, 12, 4, 10, 2);
    });
  }

  makeBoss() {
    // Rotten Mango King: bigger, sickly green-brown, with a crown
    this.bake('boss', 80, 88, (g) => {
      // Body (rotten mango shape)
      g.fillStyle(0x5a5020, 1).fillRoundedRect(6, 20, 68, 60, 16);
      // Rot spots
      g.fillStyle(0x2f2810, 1).fillCircle(22, 40, 6).fillCircle(58, 50, 8).fillCircle(35, 62, 5).fillCircle(50, 32, 4);
      // Mouth (big jagged)
      g.fillStyle(0x1a0a0a, 1).fillRoundedRect(22, 52, 36, 14, 4);
      // Teeth
      g.fillStyle(0xe8dca0, 1);
      for (let i = 0; i < 6; i++) g.fillTriangle(24 + i * 6, 52, 28 + i * 6, 52, 26 + i * 6, 58);
      // Eyes (glowing red)
      g.fillStyle(0xffffff, 1).fillCircle(28, 38, 6).fillCircle(52, 38, 6);
      g.fillStyle(0xcc1818, 1).fillCircle(28, 38, 3).fillCircle(52, 38, 3);
      // Crown
      g.fillStyle(0xd4a017, 1).fillRect(14, 10, 52, 10);
      g.fillTriangle(14, 10, 22, 0, 30, 10);
      g.fillTriangle(32, 10, 40, 0, 48, 10);
      g.fillTriangle(50, 10, 58, 0, 66, 10);
      g.fillStyle(0xff3e3e, 1).fillCircle(40, 6, 3);
    });
  }

  makeMango() {
    this.bake('mango', 14, 14, (g) => {
      g.fillStyle(0xff9b2a, 1).fillCircle(7, 7, 6);
      g.fillStyle(0xffc46b, 1).fillCircle(5, 5, 2);
      g.fillStyle(0x2d6b1e, 1).fillRect(6, 0, 2, 3);
    });
  }

  makeGoldenMango() {
    this.bake('golden-mango', 14, 14, (g) => {
      g.fillStyle(0xffe24a, 1).fillCircle(7, 7, 6);
      g.fillStyle(0xffffff, 1).fillCircle(5, 5, 2);
      g.fillStyle(0xb8941a, 1).fillRect(6, 0, 2, 3);
    });
  }

  makeGrenade() {
    this.bake('grenade', 12, 14, (g) => {
      g.fillStyle(0x5a3a10, 1).fillCircle(6, 8, 5);
      g.fillStyle(0xff9b2a, 1).fillCircle(6, 8, 3);
      g.fillStyle(0x8b6a20, 1).fillRect(5, 0, 2, 4);
      g.fillStyle(0xff3e3e, 1).fillCircle(6, 0, 1.5);
    });
  }

  makeBazooka() {
    this.bake('bazooka-shot', 22, 16, (g) => {
      g.fillStyle(0xff6a1a, 1).fillRoundedRect(0, 2, 18, 12, 4);
      g.fillStyle(0xffd070, 1).fillRoundedRect(2, 4, 14, 8, 3);
      g.fillStyle(0xff3e3e, 1).fillTriangle(18, 2, 22, 8, 18, 14);
    });
  }

  makePunch() {
    this.bake('punch', 20, 20, (g) => {
      g.fillStyle(0xffffff, 1).fillCircle(10, 10, 8);
      g.fillStyle(0xffe6a0, 1).fillCircle(10, 10, 5);
    });
  }

  makeSplash() {
    this.bake('splash', 36, 36, (g) => {
      g.fillStyle(0xffb347, 0.9).fillCircle(18, 18, 16);
      g.fillStyle(0xffd070, 0.8).fillCircle(18, 18, 10);
      g.fillStyle(0xffffff, 0.9).fillCircle(18, 18, 4);
    });
  }

  makeRock() {
    this.bake('rock', 40, 36, (g) => {
      g.fillStyle(0x4a4037, 1).fillRoundedRect(2, 4, 36, 30, 10);
      g.fillStyle(0x6a5a4a, 1).fillCircle(12, 14, 4).fillCircle(26, 20, 6);
    });
  }

  makeTree() {
    this.bake('tree', 44, 60, (g) => {
      g.fillStyle(0x3d2817, 1).fillRect(18, 40, 8, 20);
      g.fillStyle(0x1d5a2a, 1).fillCircle(22, 22, 22);
      g.fillStyle(0x2d7a38, 1).fillCircle(16, 18, 12).fillCircle(30, 26, 10);
      // Mango dots on tree
      g.fillStyle(0xff9b2a, 1).fillCircle(12, 28, 2).fillCircle(30, 14, 2).fillCircle(24, 34, 2);
    });
  }

  makeCrate() {
    this.bake('crate', 32, 32, (g) => {
      g.fillStyle(0x8b5a2b, 1).fillRoundedRect(0, 0, 32, 32, 2);
      g.fillStyle(0x6b3a1b, 1).fillRect(0, 14, 32, 2).fillRect(14, 0, 2, 32);
      g.fillStyle(0x4a2a10, 1).lineStyle(2, 0x4a2a10, 1).strokeRect(1, 1, 30, 30);
    });
  }

  makeGrass() {
    this.bake('grass', 32, 32, (g) => {
      g.fillStyle(0x2a4a22, 1).fillRect(0, 0, 32, 32);
      g.fillStyle(0x3a5a2a, 1).fillRect(2, 4, 3, 3).fillRect(20, 10, 3, 3).fillRect(10, 20, 3, 3).fillRect(26, 24, 3, 3);
      g.fillStyle(0x224018, 1).fillRect(14, 6, 2, 2).fillRect(6, 26, 2, 2);
    });
  }

  makePath() {
    this.bake('path', 32, 32, (g) => {
      g.fillStyle(0x8b6a3b, 1).fillRect(0, 0, 32, 32);
      g.fillStyle(0x7a5a2b, 1).fillRect(4, 8, 4, 4).fillRect(18, 18, 5, 3).fillRect(24, 4, 3, 3);
    });
  }

  makeGate() {
    this.bake('gate', 96, 64, (g) => {
      g.fillStyle(0x3d2817, 1).fillRect(0, 0, 96, 64);
      g.fillStyle(0x5a3a22, 1).fillRect(4, 4, 88, 56);
      g.fillStyle(0x2f1e10, 1).fillRect(46, 8, 4, 56);
      g.fillStyle(0xd4a017, 1).fillCircle(36, 34, 3).fillCircle(60, 34, 3);
    });
  }

  makeHeart() {
    this.bake('heart', 20, 18, (g) => {
      g.fillStyle(0xcc1818, 1);
      g.fillCircle(6, 6, 5);
      g.fillCircle(14, 6, 5);
      g.fillTriangle(1, 7, 19, 7, 10, 17);
      g.fillStyle(0xff6a6a, 1).fillCircle(5, 5, 2);
    });
  }

  makePixel() {
    this.bake('pixel', 2, 2, (g) => {
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
    });
  }
}
