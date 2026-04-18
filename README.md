# MangoBob & Jeff: Rotten Mango King

A top-down action game where MangoBob (a strong gorilla) and Jeff (a fast young boy) team up to defeat mango-stealing monkeys and the Rotten Mango King. Built with Phaser 3.

## Controls

- **Move:** WASD or Arrow keys
- **Primary attack:** `Space` — MangoBob punches, Jeff uses his slingshot
- **Secondary attack:** `E` — MangoBob throws a mango, Jeff throws a mango grenade (splash damage)
- **Heavy attack:** `F` — MangoBob fires his mango bazooka (big splash)
- **Dodge:** `Shift` — short dash with invulnerability (900ms cooldown)
- **Swap character:** `Q` — the other character is controlled by AI
- **Pause:** `P`
- **Back to title:** `Esc`

## How to play locally

No build step required.

```bash
cd MangoBob
python3 -m http.server 8000
```

Open http://localhost:8000 in a browser.

## Gameplay

- Three zones: **Jungle Clearing → Monkey Camp → Boss Arena**
- Defeat all monkeys in a zone to open the gate to the next
- Golden mangoes heal both characters; regular mangoes heal the one who picks them up
- 3 shared lives — if both characters fall, you lose a life and respawn at the zone start
- Progress auto-saves (zone cleared, lives remaining) via browser localStorage
- Defeat the Rotten Mango King to win

## Project structure

```
index.html            Phaser CDN + canvas mount
style.css             Page framing
src/
  main.js             Phaser game config
  scenes/
    BootScene.js      Generates all placeholder art procedurally
    TitleScene.js     Main menu w/ continue
    GameScene.js      Core gameplay, combat, zone logic
    UIScene.js        HUD: health bars, lives, boss bar
    GameOverScene.js
    VictoryScene.js
  entities/
    Player.js         MangoBob & Jeff shared class + config
    Companion.js      AI follower behavior
    Enemy.js          Monkey + Boss
    Projectile.js     Mangoes, grenades, bazooka shots
  systems/
    SaveSystem.js     localStorage wrapper
  levels/
    Level1.js         Zone layouts, obstacles, enemy waves
```

## Art

All art is currently procedurally generated in `BootScene.js` (colored shapes baked into textures). To swap in real sprites, add PNGs to `assets/` and replace the `bake()` calls with `this.load.image(key, 'assets/file.png')` using the same keys — no other code changes needed.
