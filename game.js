"use strict";

/* =========================
   CANVAS / CONTEXT
========================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

/* =========================
   HELPERS
========================= */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const aabb = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

/* =========================
   ASSETS
========================= */
function img(src) {
  const i = new Image();
  i.src = src;
  return i;
}

const SPRITES = {
  player: img("assets/sprites/knight.png"),
  demon: img("assets/sprites/demon.png"),
  demonAttack: img("assets/sprites/demon_attack.png"),
  goblin: img("assets/sprites/goblin.png"),
  wizard: img("assets/sprites/wizard.png"),
  angel: img("assets/sprites/angel.png"),
  sword: img("assets/sprites/sword.png"),
  gate: img("assets/sprites/gate.png"),
  dropWizard: img("assets/sprites/drop_wizard.png"),
  dropAngel: img("assets/sprites/drop_angel.png"),
};

/* =========================
   INPUT
========================= */
const KEY = {};
addEventListener("keydown", e => KEY[e.key] = true);
addEventListener("keyup", e => KEY[e.key] = false);

/* =========================
   WORLD
========================= */
const GRAVITY = 0.85;
const world = {
  platforms: [
    { x: 0, y: 470, w: 960, h: 50 },
    { x: 120, y: 380, w: 200, h: 18 },
    { x: 380, y: 310, w: 180, h: 18 },
    { x: 640, y: 380, w: 200, h: 18 },
    { x: 260, y: 240, w: 180, h: 18 }
  ]
};

/* =========================
   PLAYER
========================= */
const player = {
  x: 120, y: 200,
  w: 32, h: 36,
  vx: 0, vy: 0,
  facing: 1,
  onGround: false,

  hpHalf: 10,
  maxHpHalf: 10,

  energy: 6,
  maxEnergy: 6,

  invuln: 0,
  atkCd: 0
};

/* =========================
   GAME STATE
========================= */
const state = {
  enemies: [],
  projectiles: [],
  drops: [],
  kills: 0,
  healCounter: 0,
  wave: 1,
  spawnTimer: 0
};

/* =========================
   PLATFORM COLLISION
========================= */
function resolvePlatforms(body) {
  body.onGround = false;

  for (const p of world.platforms) {
    if (!aabb(body, p)) continue;

    const prevBottom = body.y + body.h - body.vy;
    const falling = body.vy >= 0;

    if (falling && prevBottom <= p.y) {
      body.y = p.y - body.h;
      body.vy = 0;
      body.onGround = true;
    }
  }
}

/* =========================
   ENEMIES
========================= */
function spawnEnemy() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const r = Math.random();

  let kind = "demon";
  if (r > 0.85) kind = "goblin";
  if (r > 0.95) kind = "wizard";

  state.enemies.push({
    kind,
    x: side === -1 ? -40 : canvas.width + 40,
    y: 420,
    w: 32,
    h: 36,
    vx: side === -1 ? 1.2 : -1.2,
    vy: 0,
    facing: side === -1 ? 1 : -1,
    hp: kind === "wizard" ? 5 : 3,
    onGround: false
  });
}

/* =========================
   COMBAT
========================= */
function swordAttack() {
  if (player.atkCd > 0 || player.energy <= 0) return;

  player.energy--;
  player.atkCd = 18;

  const hit = {
    x: player.x + (player.facing === 1 ? player.w : -40),
    y: player.y + 8,
    w: 40,
    h: 20
  };

  for (const e of state.enemies) {
    if (aabb(hit, e)) {
      e.hp -= 2;
      e.vx += player.facing * 3;
    }
  }
}

/* =========================
   UPDATE
========================= */
function update() {
  /* ---- PLAYER ---- */
  if (KEY["ArrowLeft"]) { player.vx -= 0.8; player.facing = -1; }
  if (KEY["ArrowRight"]) { player.vx += 0.8; player.facing = 1; }
  if (KEY["ArrowUp"] && player.onGround) player.vy = -15;
  if (KEY["z"] || KEY["Z"]) swordAttack();

  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;
  player.vx *= 0.82;

  resolvePlatforms(player);

  player.atkCd = Math.max(0, player.atkCd - 1);
  player.invuln = Math.max(0, player.invuln - 1);

  /* ---- ENEMIES ---- */
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];

    e.vy += GRAVITY;
    e.x += e.vx;
    e.y += e.vy;

    resolvePlatforms(e);

    const dist = Math.abs((player.x + player.w/2) - (e.x + e.w/2));
    if (dist < 30 && player.invuln === 0) {
      player.hpHalf -= 1;
      player.invuln = 40;
    }

    if (e.hp <= 0) {
      state.enemies.splice(i, 1);
      state.kills++;
      state.healCounter++;

      if (state.healCounter >= 2) {
        state.healCounter = 0;
        player.hpHalf = Math.min(player.maxHpHalf, player.hpHalf + 1);
      }
    }
  }

  /* ---- SPAWNING ---- */
  state.spawnTimer--;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = 90;
  }
}

/* =========================
   DRAW
========================= */
function drawSprite(img, x, y, w, h, flip = 1) {
  if (!img.complete) return;
  ctx.save();
  ctx.translate(x + w/2, y + h/2);
  ctx.scale(flip, 1);
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSprite(SPRITES.gate, 430, 260, 100, 100);

  ctx.fillStyle = "#444";
  for (const p of world.platforms) {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  drawSprite(SPRITES.player, player.x, player.y, 48, 54, player.facing);

  for (const e of state.enemies) {
    const img =
      e.kind === "wizard" ? SPRITES.wizard :
      e.kind === "goblin" ? SPRITES.goblin :
      SPRITES.demon;

    drawSprite(img, e.x, e.y, 48, 54, e.facing);
  }
}

/* =========================
   LOOP
========================= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
