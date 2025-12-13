// Wave Game (canvas)
// - Arrow keys move/jump
// - Z: sword slash (1 energy)
// - X: throw (1 energy)
// Enemy hits: 0.5 heart
// Heal: every 2 kills -> +0.5 heart

'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const UI = {
  hearts: document.getElementById('hearts'),
  energy: document.getElementById('energy'),
  waveNum: document.getElementById('waveNum'),
  killNum: document.getElementById('killNum'),
  dropNum: document.getElementById('dropNum'),
  start: document.getElementById('start'),
  btnStart: document.getElementById('btnStart'),
  gameover: document.getElementById('gameover'),
  finalWave: document.getElementById('finalWave'),
  finalKills: document.getElementById('finalKills'),
  btnPause: document.getElementById('btnPause'),
};

const ASSETS = {
  // Brackeys
  platforms: loadImage('assets/sprites/platforms.png'),
  knight: loadImage('assets/sprites/knight.png'),
  sndJump: loadSound('assets/sounds/jump.wav', 0.35),
  sndHurt: loadSound('assets/sounds/hurt.wav', 0.4),
  sndTap: loadSound('assets/sounds/tap.wav', 0.35),

  // Your sprites
  demon: loadImage('assets/sprites/demon.png'),
  demonAttack: loadImage('assets/sprites/demon_attack.png'),
  goblin: loadImage('assets/sprites/goblin.png'),
  wizard: loadImage('assets/sprites/wizard.png'),
  angel: loadImage('assets/sprites/angel.png'),
  sword: loadImage('assets/sprites/sword.png'),
  gate: loadImage('assets/sprites/gate.png'),
  dropAngel: loadImage('assets/sprites/drop_angel.png'),
  dropWizard: loadImage('assets/sprites/drop_wizard.png'),
};

function loadImage(src){
  const img = new Image();
  img.src = src;
  return img;
}
function loadSound(src, vol=0.5){
  const a = new Audio(src);
  a.volume = vol;
  return a;
}
function play(sound){
  // clone so multiple can overlap
  if (!sound) return;
  const s = sound.cloneNode();
  s.volume = sound.volume;
  s.play().catch(()=>{});
}

const KEY = { left:false, right:false, up:false, z:false, x:false };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key === 'ArrowLeft') KEY.left = true;
  if (e.key === 'ArrowRight') KEY.right = true;
  if (e.key === 'ArrowUp') KEY.up = true;
  if (e.key.toLowerCase() === 'z') KEY.z = true;
  if (e.key.toLowerCase() === 'x') KEY.x = true;

  if (e.key.toLowerCase() === 'p') togglePause();
  if (e.key.toLowerCase() === 'r' && state.gameOver) resetGame();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') KEY.left = false;
  if (e.key === 'ArrowRight') KEY.right = false;
  if (e.key === 'ArrowUp') KEY.up = false;
  if (e.key.toLowerCase() === 'z') KEY.z = false;
  if (e.key.toLowerCase() === 'x') KEY.x = false;
});

const world = {
  w: canvas.width,
  h: canvas.height,
  gravity: 0.9,
  friction: 0.82,
  tileScale: 3,
  platforms: [
    // x,y,w,h
    {x:0, y:480, w:960, h:60},
    {x:110, y:380, w:200, h:20},
    {x:390, y:320, w:180, h:20},
    {x:640, y:380, w:210, h:20},
    {x:260, y:240, w:180, h:18},
    {x:520, y:210, w:170, h:18},
  ],
};

function aabb(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolvePlatformCollisions(body){
  body.onGround = false;
  for (const p of world.platforms){
    if (!aabb(body, p)) continue;

    const prevX = body.x - body.vx;
    const prevY = body.y - body.vy;

    // Determine the side of collision using previous position
    const wasAbove = prevY + body.h <= p.y;
    const wasBelow = prevY >= p.y + p.h;
    const wasLeft  = prevX + body.w <= p.x;
    const wasRight = prevX >= p.x + p.w;

    if (wasAbove){
      body.y = p.y - body.h;
      body.vy = 0;
      body.onGround = true;
    } else if (wasBelow){
      body.y = p.y + p.h;
      body.vy = 0;
    } else if (wasLeft){
      body.x = p.x - body.w;
      body.vx = 0;
    } else if (wasRight){
      body.x = p.x + p.w;
      body.vx = 0;
    }
  }
}

function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

const state = {
  started: false,
  paused: false,
  gameOver: false,
  time: 0,
  wave: 1,
  kills: 0,
  drops: 0,
  killStreakForHeal: 0,
  spawnTimer: 0,
  enemiesToSpawn: 4,
  aliveMax: 3,
  projectiles: [],
  enemies: [],
  dropsOnGround: [],
};

const player = {
  x: 120, y: 200, w: 34, h: 38,
  vx: 0, vy: 0,
  onGround: false,
  facing: 1, // 1 right, -1 left
  maxHearts: 5,
  hpHalf: 10, // 5 hearts * 2
  maxEnergy: 6,
  energy: 6,
  energyRegenTimer: 0,
  invuln: 0,
  attackCooldown: 0,
  throwCooldown: 0,
};

function resetGame(){
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  state.time = 0;
  state.wave = 1;
  state.kills = 0;
  state.drops = 0;
  state.killStreakForHeal = 0;
  state.spawnTimer = 0;
  state.enemiesToSpawn = 4;
  state.aliveMax = 3;
  state.projectiles.length = 0;
  state.enemies.length = 0;
  state.dropsOnGround.length = 0;

  player.x = 120; player.y = 200;
  player.vx = 0; player.vy = 0;
  player.facing = 1;
  player.hpHalf = player.maxHearts * 2;
  player.energy = player.maxEnergy;
  player.invuln = 0;
  player.attackCooldown = 0;
  player.throwCooldown = 0;

  UI.gameover.classList.add('hidden');
  UI.start.classList.add('hidden');
  UI.waveNum.textContent = String(state.wave);
  UI.killNum.textContent = String(state.kills);
  UI.dropNum.textContent = String(state.drops);
  rebuildHUD();
}

function togglePause(){
  if (!state.started || state.gameOver) return;
  state.paused = !state.paused;
  UI.btnPause.textContent = state.paused ? 'RESUME' : 'PAUSE';
}
UI.btnPause.addEventListener('click', togglePause);

UI.btnStart.addEventListener('click', () => {
  state.started = true;
  resetGame();
});

function rebuildHUD(){
  // hearts (pixel text)
  UI.hearts.innerHTML = '';
  const fullHearts = Math.floor(player.hpHalf / 2);
  const halfHeart = (player.hpHalf % 2) === 1;

  for (let i=0;i<player.maxHearts;i++){
    const el = document.createElement('span');
    const type = (i < fullHearts) ? 'full' : (i === fullHearts && halfHeart ? 'half' : 'empty');
    el.className = 'heart ' + type;
    el.textContent = '♥';
    UI.hearts.appendChild(el);
  }

  // energy pips
  UI.energy.innerHTML = '';
  for (let i=0;i<player.maxEnergy;i++){
    const pip = document.createElement('div');
    pip.className = 'pip' + (i < player.energy ? ' full' : '');
    UI.energy.appendChild(pip);
  }
}


// --------- Enemies & Drops ---------
function makeEnemy(kind, side){
  // side: -1 left spawn, 1 right spawn
  const x = (side === -1) ? -40 : world.w + 40;
  const y = 420; // ground-ish; will fall onto ground
  const base = {
    kind,
    x, y, w: 38, h: 40,
    vx: 0, vy: 0,
    onGround: false,
    facing: side === -1 ? 1 : -1,
    hp: 3,
    speed: 1.4,
    jumpPower: 14,
    attackRange: 34,
    attackCooldown: 0,
    damage: 1, // half-heart units => 1 = 0.5 heart
    dropType: null,
    isElite: false,
  };

  if (kind === 'demon'){
    base.hp = 4;
    base.speed = 1.5;
  } else if (kind === 'goblin'){
    base.hp = 3;
    base.speed = 1.8;
    base.isElite = true;
    base.dropType = 'wizard'; // placeholder drop type, later used for upgrades
  } else if (kind === 'wizard'){
    base.hp = 5;
    base.speed = 1.2;
    base.isElite = true;
    base.dropType = 'angel';
  } else if (kind === 'angel'){
    base.hp = 6;
    base.speed = 1.25;
    base.isElite = true;
    base.dropType = 'angel';
  }
  return base;
}

function spawnLogic(dt){
  // spawn a finite amount each wave, with small max alive
  state.spawnTimer -= dt;
  if (state.enemiesToSpawn <= 0) return;
  if (state.enemies.length >= state.aliveMax) return;
  if (state.spawnTimer > 0) return;

  const side = (Math.random() < 0.5) ? -1 : 1;

  // weighted enemy selection: elites are rarer
  const r = Math.random();
  let kind = 'demon';
  if (r < 0.72) kind = 'demon';
  else if (r < 0.90) kind = 'goblin';
  else if (r < 0.97) kind = 'wizard';
  else kind = 'angel';

  state.enemies.push(makeEnemy(kind, side));
  state.enemiesToSpawn -= 1;
  state.spawnTimer = 0.8 + Math.random() * 0.5;
}

function enemyAI(e){
  // simple chase + jump-if-needed
  const cx = e.x + e.w/2;
  const px = player.x + player.w/2;

  const dir = (px > cx) ? 1 : -1;
  e.facing = dir;
  e.vx += dir * 0.45;
  e.vx = clamp(e.vx, -e.speed*3, e.speed*3);

  // If player is above and we are near a platform edge, try a jump sometimes
  const playerAbove = (player.y + player.h) < (e.y + e.h - 6);
  const closeX = Math.abs(px - cx) < 160;
  if (playerAbove && closeX && e.onGround && Math.random() < 0.04){
    e.vy = -e.jumpPower;
  }

  // try to jump over short obstacles if stuck
  if (e.onGround && Math.abs(e.vx) < 0.2 && Math.random() < 0.08){
    e.vy = -e.jumpPower * 0.9;
  }

  // attack if close
  e.attackCooldown = Math.max(0, e.attackCooldown - 1);
  const dist = Math.abs((player.x+player.w/2) - (e.x+e.w/2));
  const vertOk = Math.abs((player.y+player.h/2) - (e.y+e.h/2)) < 42;
  if (dist < e.attackRange && vertOk && e.attackCooldown === 0){
    hitPlayer(e.damage);
    e.attackCooldown = 60; // frames
  }
}

function hitPlayer(dmgHalfHearts){
  if (player.invuln > 0 || state.gameOver) return;
  player.hpHalf = Math.max(0, player.hpHalf - dmgHalfHearts);
  player.invuln = 40; // frames
  play(ASSETS.sndHurt);
  rebuildHUD();
  if (player.hpHalf <= 0){
    doGameOver();
  }
}

function doGameOver(){
  state.gameOver = true;
  UI.finalWave.textContent = String(state.wave);
  UI.finalKills.textContent = String(state.kills);
  UI.gameover.classList.remove('hidden');
}

// --------- Attacks ---------
function canSpendEnergy(){
  return player.energy > 0;
}
function spendEnergy(){
  player.energy = Math.max(0, player.energy - 1);
  rebuildHUD();
}

function swordSlash(){
  if (player.attackCooldown > 0) return;
  if (!canSpendEnergy()) return;

  spendEnergy();
  play(ASSETS.sndTap);
  player.attackCooldown = 20;

  const range = 56;
  const hitbox = {
    x: player.x + (player.facing === 1 ? player.w : -range),
    y: player.y + 8,
    w: range,
    h: player.h - 16,
  };

  for (const e of state.enemies){
    if (aabb(hitbox, e)){
      e.hp -= 2;
      // knockback
      e.vx += player.facing * 4.2;
      e.vy -= 4.0;
    }
  }

  // show a brief slash effect
  state.projectiles.push({
    type: 'slash',
    x: hitbox.x + (player.facing === 1 ? 8 : -10),
    y: player.y - 20,
    w: 46, h: 46,
    life: 10,
    facing: player.facing
  });
}

function throwBlade(){
  if (player.throwCooldown > 0) return;
  if (!canSpendEnergy()) return;

  spendEnergy();
  play(ASSETS.sndTap);
  player.throwCooldown = 28;

  const speed = 9.0;
  state.projectiles.push({
    type: 'blade',
    x: player.x + player.w/2 - 10,
    y: player.y + 10,
    w: 20, h: 16,
    vx: speed * player.facing,
    vy: -1.2,
    life: 120,
    facing: player.facing,
    dmg: 2,
  });
}

// --------- Drops ---------
function spawnDropAt(x,y,dropType){
  const img = (dropType === 'wizard') ? ASSETS.dropWizard : ASSETS.dropAngel;
  state.dropsOnGround.push({
    x, y,
    w: 26, h: 26,
    vy: -6,
    img,
    type: dropType,
  });
}

function collectDrops(){
  for (let i=state.dropsOnGround.length-1;i>=0;i--){
    const d = state.dropsOnGround[i];
    if (aabb(player, d)){
      state.drops += 1;
      UI.dropNum.textContent = String(state.drops);
      state.dropsOnGround.splice(i,1);
      // later: unlock attacks / upgrades
    }
  }
}

// --------- Wave handling ---------
function checkWaveClear(){
  if (state.enemiesToSpawn > 0) return;
  if (state.enemies.length > 0) return;

  // next wave
  state.wave += 1;
  UI.waveNum.textContent = String(state.wave);

  // scaling
  state.enemiesToSpawn = 4 + Math.floor(state.wave * 1.5);
  state.aliveMax = Math.min(9, 2 + Math.floor(state.wave / 2) + 2);
  state.spawnTimer = 1.2;
}

// --------- Main loop ---------
let last = performance.now();
function loop(now){
  const dt = Math.min(32, now - last) / 16.666; // 60fps units
  last = now;

  if (state.started && !state.paused && !state.gameOver){
    update(dt);
    draw();
  } else {
    // still render a frame to show pause
    if (state.started) draw(true);
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt){
  state.time += dt;

  // Player input
  const accel = 0.9;
  if (KEY.left){ player.vx -= accel; player.facing = -1; }
  if (KEY.right){ player.vx += accel; player.facing = 1; }

  if (KEY.up && player.onGround){
    player.vy = -16;
    play(ASSETS.sndJump);
  }

  // attacks
  if (KEY.z) swordSlash();
  if (KEY.x) throwBlade();

  // physics
  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // friction + bounds
  player.vx *= Math.pow(world.friction, dt);
  player.x = clamp(player.x, 0, world.w - player.w);
  if (player.y > world.h + 200){
    hitPlayer(2); // fall damage = 1 heart
    player.x = 120; player.y = 120;
    player.vx = 0; player.vy = 0;
  }

  resolvePlatformCollisions(player);

  // timers
  player.invuln = Math.max(0, player.invuln - 1*dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - 1*dt);
  player.throwCooldown = Math.max(0, player.throwCooldown - 1*dt);

  // energy regen
  player.energyRegenTimer += dt;
  if (player.energyRegenTimer >= 1.6){
    player.energyRegenTimer = 0;
    if (player.energy < player.maxEnergy){
      player.energy += 1;
      rebuildHUD();
    }
  }

  // enemies
  spawnLogic(dt);

  for (let i=state.enemies.length-1;i>=0;i--){
    const e = state.enemies[i];

    enemyAI(e);

    e.vy += world.gravity * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // friction
    e.vx *= Math.pow(0.88, dt);

    resolvePlatformCollisions(e);

    // keep in world bounds a bit
    if (e.x < -120 || e.x > world.w + 120){
      // if they got knocked out, remove
      state.enemies.splice(i,1);
      continue;
    }

    // dead?
    if (e.hp <= 0){
      // drops are rarer (harder to spawn in general) and also not guaranteed
      if (e.isElite && Math.random() < 0.55){
        spawnDropAt(e.x + e.w/2 - 10, e.y + 6, e.dropType || 'wizard');
      }
      state.enemies.splice(i,1);
      state.kills += 1;
      UI.killNum.textContent = String(state.kills);

      // heal every 2 kills: +0.5 heart
      state.killStreakForHeal += 1;
      if (state.killStreakForHeal >= 2){
        state.killStreakForHeal = 0;
        player.hpHalf = Math.min(player.maxHearts*2, player.hpHalf + 1);
        rebuildHUD();
      }

      continue;
    }
  }

  // projectiles / effects
  for (let i=state.projectiles.length-1;i>=0;i--){
    const pr = state.projectiles[i];
    pr.life -= 1*dt;

    if (pr.type === 'blade'){
      pr.vy += 0.25 * dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      // hit enemies
      for (const e of state.enemies){
        if (aabb(pr, e)){
          e.hp -= pr.dmg;
          e.vx += Math.sign(pr.vx) * 3.2;
          pr.life = 0;
          break;
        }
      }

      // collide with platforms
      for (const p of world.platforms){
        if (aabb(pr, p)){
          pr.life = 0;
          break;
        }
      }
    }

    if (pr.life <= 0){
      state.projectiles.splice(i,1);
    }
  }

  // drops physics + collect
  for (const d of state.dropsOnGround){
    d.vy += world.gravity * 0.35 * dt;
    d.y += d.vy * dt;
    // simple ground collision
    for (const p of world.platforms){
      if (aabb(d,p)){
        d.y = p.y - d.h;
        d.vy = 0;
      }
    }
  }
  collectDrops();

  // wave clear check
  checkWaveClear();
}

// --------- Drawing ---------
function draw(pausedOverlay=false){
  ctx.clearRect(0,0,world.w,world.h);

  // background decorative gate
  drawImageCentered(ASSETS.gate, world.w/2, 310, 0.35);

  drawPlatforms();

  // player
  drawPlayer();

  // enemies
  for (const e of state.enemies){
    drawEnemy(e);
  }

  // drops
  for (const d of state.dropsOnGround){
    drawSprite(d.img, d.x, d.y, d.w, d.h);
  }

  // projectiles / effects
  for (const pr of state.projectiles){
    if (pr.type === 'slash'){
      // show sword image as effect
      const w=46, h=46;
      ctx.save();
      ctx.translate(pr.x + w/2, pr.y + h/2);
      ctx.scale(pr.facing, 1);
      ctx.rotate(-0.35);
      ctx.translate(-w/2, -h/2);
      drawSprite(ASSETS.sword, 0, 0, w, h);
      ctx.restore();
    } else if (pr.type === 'blade'){
      // tiny spinning sword
      const w=pr.w, h=pr.h;
      ctx.save();
      ctx.translate(pr.x + w/2, pr.y + h/2);
      ctx.rotate((state.time*0.25) % (Math.PI*2));
      ctx.scale(pr.facing, 1);
      ctx.translate(-w/2, -h/2);
      drawSprite(ASSETS.sword, -8, -16, w+16, h+24);
      ctx.restore();
    }
  }

  // pause tint
  if (pausedOverlay || state.paused){
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0,0,world.w,world.h);
    ctx.fillStyle = '#e9f1ff';
    ctx.font = '34px PixelOperatorBold, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', world.w/2, 70);
  }
}

function drawPlatforms(){
  // tile from platforms sheet: green middle tile (0,0) 16x16
  const img = ASSETS.platforms;
  const tile = {sx:0, sy:0, sw:16, sh:16};
  const scale = world.tileScale;

  for (const p of world.platforms){
    // fill with repeated tiles
    for (let x=p.x; x<p.x+p.w; x += tile.sw*scale){
      for (let y=p.y; y<p.y+p.h; y += tile.sh*scale){
        ctx.drawImage(img, tile.sx, tile.sy, tile.sw, tile.sh, x, y, tile.sw*scale, tile.sh*scale);
      }
    }
  }
}

function drawSprite(img, x, y, w, h){
  if (!img || !img.complete) return;
  ctx.drawImage(img, x, y, w, h);
}

function drawImageCentered(img, cx, cy, scale){
  if (!img || !img.complete) return;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
}

function drawPlayer(){
  // Use the knight sheet frame 0,0 (32x32) scaled
  const sheet = ASSETS.knight;
  const frame = {sx:0, sy:0, sw:32, sh:32};
  const scale = 2.1;
  const w = frame.sw * scale;
  const h = frame.sh * scale;

  ctx.save();
  ctx.translate(player.x + player.w/2, player.y + player.h/2);
  ctx.scale(player.facing, 1);
  ctx.translate(-w/2, -h/2);

  if (sheet && sheet.complete){
    ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,w,h);
  }
  ctx.restore();

  // invuln blink
  if (player.invuln > 0 && Math.floor(state.time*10)%2===0){
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.globalAlpha = 1;
  }
}

function drawEnemy(e){
  // pick sprite by kind
  let img = ASSETS.demon;
  if (e.kind === 'demon'){
    // show attack sprite when close
    const dist = Math.abs((player.x+player.w/2) - (e.x+e.w/2));
    img = (dist < e.attackRange*1.1) ? ASSETS.demonAttack : ASSETS.demon;
  } else if (e.kind === 'goblin'){
    img = ASSETS.goblin;
  } else if (e.kind === 'wizard'){
    img = ASSETS.wizard;
  } else if (e.kind === 'angel'){
    img = ASSETS.angel;
  }

  const targetW = e.w*2.0;
  const targetH = e.h*2.0;

  ctx.save();
  ctx.translate(e.x + e.w/2, e.y + e.h/2);
  ctx.scale(e.facing, 1);
  ctx.translate(-targetW/2, -targetH/2);
  if (img && img.complete){
    ctx.drawImage(img, 0, 0, targetW, targetH);
  } else {
    ctx.fillStyle = '#ff3355';
    ctx.fillRect(0,0,targetW,targetH);
  }
  ctx.restore();

  // small hp bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(e.x, e.y-10, e.w, 6);
  ctx.fillStyle = '#76ff9a';
  ctx.fillRect(e.x, e.y-10, (e.hp/6)*e.w, 6);
}

// init hud once
rebuildHUD();
