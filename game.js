'use strict';

/* =====================
   CANVAS
===================== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* =====================
   UI
===================== */
const UI = {
  hearts: document.getElementById('hearts'),
  energy: document.getElementById('energy'),
  waveNum: document.getElementById('waveNum'),
  killNum: document.getElementById('killNum'),
  start: document.getElementById('start'),
  btnStart: document.getElementById('btnStart'),
  gameover: document.getElementById('gameover'),
};

/* =====================
   ASSETS
===================== */
function img(src){
  const i = new Image();
  i.src = src;
  return i;
}

const ASSETS = {
  knight: img('assets/sprites/knight.png'),
  goblin: img('assets/sprites/goblin.png'),
  sword: img('assets/sprites/sword.png'),
};

/* =====================
   INPUT
===================== */
const KEY = {};
addEventListener('keydown', e => {
  KEY[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'r' && state.gameOver) resetGame();
});
addEventListener('keyup', e => KEY[e.key.toLowerCase()] = false);

/* =====================
   WORLD
===================== */
const world = {
  gravity: 0.9,
  friction: 0.82,
  leftWall: 0,
  rightWall: canvas.width,
  platforms: [
    {x:0, y:480, w:960, h:60},
    {x:110, y:380, w:200, h:18},
    {x:390, y:320, w:180, h:18},
    {x:640, y:380, w:210, h:18},
    {x:260, y:240, w:180, h:18},
    {x:520, y:210, w:170, h:18},
  ]
};

/* =====================
   HELPERS
===================== */
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const aabb = (a,b)=>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

/* =====================
   PLATFORM COLLISION
===================== */
function resolvePlatforms(b, dt){
  b.onGround = false;
  for(const p of world.platforms){
    if (b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
    const prevBottom = b.y + b.h - b.vy * dt;
    if (b.vy >= 0 && prevBottom <= p.y && b.y + b.h >= p.y){
      b.y = p.y - b.h;
      b.vy = 0;
      b.onGround = true;
    }
  }
}

/* =====================
   PLAYER
===================== */
const player = {
  x:120, y:200, w:34, h:38,
  vx:0, vy:0,
  facing:1,
  onGround:false,
  hpHalf:10,
  maxHpHalf:10,
  energy:6,
  maxEnergy:6,
  invuln:0,
  atkCd:0
};

/* =====================
   STATE
===================== */
const state = {
  started:false,
  gameOver:false,
  wave:1,
  kills:0,
  spawnTimer:0,
  enemies:[],
  healCounter:0
};

/* =====================
   HUD
===================== */
function rebuildHUD(){
  UI.hearts.innerHTML='';
  for(let i=0;i<5;i++){
    const s=document.createElement('span');
    s.textContent='♥';
    s.className =
      i*2+2<=player.hpHalf ? 'heart full' :
      i*2+1===player.hpHalf ? 'heart half' :
      'heart empty';
    UI.hearts.appendChild(s);
  }

  UI.energy.innerHTML='';
  for(let i=0;i<player.maxEnergy;i++){
    const d=document.createElement('div');
    d.className='pip'+(i<player.energy?' full':'');
    UI.energy.appendChild(d);
  }

  UI.waveNum.textContent=state.wave;
  UI.killNum.textContent=state.kills;
}

/* =====================
   START / RESTART
===================== */
function resetGame(){
  state.started = true;
  state.gameOver = false;
  state.wave = 1;
  state.kills = 0;
  state.spawnTimer = 0;
  state.enemies.length = 0;
  state.healCounter = 0;

  player.x = 120;
  player.y = 200;
  player.vx = 0;
  player.vy = 0;
  player.hpHalf = player.maxHpHalf;
  player.energy = player.maxEnergy;
  player.invuln = 0;
  player.atkCd = 0;

  UI.start.classList.add('hidden');
  UI.gameover.classList.add('hidden');

  rebuildHUD();
}

UI.btnStart.onclick = resetGame;

/* =====================
   ENEMY
===================== */
function spawnGoblin(){
  const side = Math.random()<0.5 ? -1 : 1;
  state.enemies.push({
    x: side===-1 ? 10 : canvas.width-44,
    y:420, w:34, h:38,
    vx:0, vy:0,
    facing: side===-1 ? 1 : -1,
    hp:3,
    onGround:false
  });
}

/* =====================
   ENEMY AI
===================== */
function enemyAI(e){
  const px = player.x + player.w/2;
  const ex = e.x + e.w/2;
  const dir = px > ex ? 1 : -1;

  e.facing = dir;
  e.vx += dir * 0.45;
  e.vx = clamp(e.vx, -2.1, 2.1);

  if (
    e.onGround &&
    player.y + player.h < e.y &&
    Math.abs(px - ex) < 180
  ){
    e.vy = -15;
  }

  if (Math.abs(px - ex) < 30 && player.invuln <= 0){
    player.hpHalf--;
    player.invuln = 40;
    rebuildHUD();
    if (player.hpHalf <= 0){
      state.gameOver = true;
      UI.gameover.classList.remove('hidden');
    }
  }
}

/* =====================
   ATTACK
===================== */
function swordAttack(){
  if (player.atkCd > 0 || player.energy <= 0) return;

  player.atkCd = 18;
  player.energy--;

  const hitbox = {
    x: player.x + (player.facing===1 ? player.w : -50),
    y: player.y + 6,
    w: 50,
    h: 26
  };

  for (const e of state.enemies){
    if (aabb(hitbox, e)){
      e.hp -= 2;
      e.vx += player.facing * 4;
      e.vy = -6;
    }
  }

  rebuildHUD();
}

/* =====================
   UPDATE
===================== */
function update(dt){
  /* PLAYER */
  if (KEY['arrowleft']){ player.vx -= 0.9; player.facing = -1; }
  if (KEY['arrowright']){ player.vx += 0.9; player.facing = 1; }
  if (KEY['arrowup'] && player.onGround) player.vy = -16;
  if (KEY['z']) swordAttack();

  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.vx *= Math.pow(world.friction, dt);

  player.x = clamp(player.x, world.leftWall, world.rightWall-player.w);

  resolvePlatforms(player, dt);

  player.atkCd = Math.max(0, player.atkCd - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  /* SPAWN CONTROL */
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.enemies.length < 3){
    spawnGoblin();
    state.spawnTimer = 120;
  }

  /* ENEMIES */
  for (let i=state.enemies.length-1;i>=0;i--){
    const e = state.enemies[i];
    enemyAI(e);

    e.vy += world.gravity * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    e.x = clamp(e.x, 8, canvas.width - e.w - 8);

    resolvePlatforms(e, dt);

    if (e.hp <= 0){
      state.enemies.splice(i,1);
      state.kills++;
      UI.killNum.textContent = state.kills;

      state.healCounter++;
      if (state.healCounter >= 2){
        state.healCounter = 0;
        player.hpHalf = Math.min(player.maxHpHalf, player.hpHalf + 1);
        rebuildHUD();
      }
    }
  }
}

/* =====================
   DRAW
===================== */
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = '#333';
  world.platforms.forEach(p => ctx.fillRect(p.x,p.y,p.w,p.h));

  drawSprite(ASSETS.knight, player, 2.1);
  state.enemies.forEach(e => drawSprite(ASSETS.goblin, e, 2));
}

function drawSprite(img, o, s){
  if (!img.complete) return;
  ctx.save();
  ctx.translate(o.x + o.w/2, o.y + o.h/2);
  ctx.scale(o.facing, 1);
  ctx.drawImage(img, -16*s, -16*s, 32*s, 32*s);
  ctx.restore();
}

/* =====================
   LOOP
===================== */
let last = performance.now();
function loop(t){
  const dt = (t-last)/16.666;
  last = t;
  if (state.started && !state.gameOver) update(dt);
  draw();
  requestAnimationFrame(loop);
}
loop();

rebuildHUD();
