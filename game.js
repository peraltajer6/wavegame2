'use strict';

/* =====================
   CANVAS / CONTEXT
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
  dropNum: document.getElementById('dropNum'),
  start: document.getElementById('start'),
  btnStart: document.getElementById('btnStart'),
  gameover: document.getElementById('gameover'),
  finalWave: document.getElementById('finalWave'),
  finalKills: document.getElementById('finalKills'),
  btnPause: document.getElementById('btnPause'),
};

/* =====================
   ASSETS
===================== */
function loadImage(src){
  const i = new Image();
  i.src = src;
  return i;
}

const ASSETS = {
  platforms: loadImage('assets/sprites/platforms.png'),
  knight: loadImage('assets/sprites/knight.png'),
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

/* =====================
   INPUT
===================== */
const KEY = {};
addEventListener('keydown', e => {
  KEY[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'p') togglePause();
  if (e.key.toLowerCase() === 'r' && state.gameOver) resetGame();
});
addEventListener('keyup', e => KEY[e.key.toLowerCase()] = false);

/* =====================
   WORLD
===================== */
const world = {
  gravity: 0.9,
  friction: 0.82,
  platforms: [
    {x:0, y:480, w:960, h:60},
    {x:110, y:380, w:200, h:20},
    {x:390, y:320, w:180, h:20},
    {x:640, y:380, w:210, h:20},
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
   PLATFORM COLLISION (FIXED)
===================== */
function resolvePlatformCollisions(body, dt){
  body.onGround = false;

  for (const p of world.platforms){
    if (body.x + body.w <= p.x || body.x >= p.x + p.w) continue;

    const prevBottom = body.y + body.h - body.vy * dt;
    const currBottom = body.y + body.h;

    if (body.vy >= 0 && prevBottom <= p.y && currBottom >= p.y){
      body.y = p.y - body.h;
      body.vy = 0;
      body.onGround = true;
    }
  }
}

/* =====================
   GAME STATE
===================== */
const state = {
  started: false,
  paused: false,
  gameOver: false,
  wave: 1,
  kills: 0,
  drops: 0,
  spawnTimer: 0,
  enemiesToSpawn: 4,
  aliveMax: 3,
  enemies: [],
  projectiles: [],
  dropsOnGround: [],
  healCounter: 0,
};

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
  attackCd:0
};

/* =====================
   START / RESET
===================== */
function resetGame(){
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  state.wave = 1;
  state.kills = 0;
  state.drops = 0;
  state.enemiesToSpawn = 4;
  state.aliveMax = 3;
  state.spawnTimer = 0;
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.dropsOnGround.length = 0;

  player.x = 120;
  player.y = 200;
  player.vx = 0;
  player.vy = 0;
  player.hpHalf = player.maxHpHalf;
  player.energy = player.maxEnergy;
  player.invuln = 0;

  UI.start.classList.add('hidden');
  UI.gameover.classList.add('hidden');
  UI.waveNum.textContent = state.wave;
  UI.killNum.textContent = state.kills;
  UI.dropNum.textContent = state.drops;
  rebuildHUD();
}

UI.btnStart.onclick = () => resetGame();

/* =====================
   PAUSE
===================== */
function togglePause(){
  if (!state.started || state.gameOver) return;
  state.paused = !state.paused;
}

/* =====================
   HUD
===================== */
function rebuildHUD(){
  UI.hearts.innerHTML = '';
  for (let i=0;i<player.maxHpHalf/2;i++){
    const span = document.createElement('span');
    span.textContent = '♥';
    span.className = i*2+2 <= player.hpHalf ? 'heart full'
      : i*2+1 === player.hpHalf ? 'heart half'
      : 'heart empty';
    UI.hearts.appendChild(span);
  }

  UI.energy.innerHTML = '';
  for (let i=0;i<player.maxEnergy;i++){
    const d = document.createElement('div');
    d.className = 'pip'+(i<player.energy?' full':'');
    UI.energy.appendChild(d);
  }
}

/* =====================
   ENEMIES
===================== */
function spawnEnemy(){
  const side = Math.random()<0.5?-1:1;
  state.enemies.push({
    x: side===-1?-40:canvas.width+40,
    y:420, w:34, h:38,
    vx: side===-1?1.4:-1.4,
    vy:0,
    facing: side===-1?1:-1,
    hp:3,
    onGround:false
  });
  state.enemiesToSpawn--;
}

/* =====================
   UPDATE
===================== */
function update(dt){
  /* PLAYER */
  if (KEY['arrowleft']){ player.vx-=0.9; player.facing=-1; }
  if (KEY['arrowright']){ player.vx+=0.9; player.facing=1; }
  if (KEY['arrowup'] && player.onGround) player.vy=-16;
  if (KEY['z'] && player.attackCd<=0 && player.energy>0){
    player.attackCd=18;
    player.energy--;
    rebuildHUD();
  }

  player.vy+=world.gravity*dt;
  player.x+=player.vx*dt;
  player.y+=player.vy*dt;
  player.vx*=Math.pow(world.friction,dt);

  resolvePlatformCollisions(player,dt);

  player.attackCd=Math.max(0,player.attackCd-dt);
  player.invuln=Math.max(0,player.invuln-dt);

  /* ENEMIES */
  for (let i=state.enemies.length-1;i>=0;i--){
    const e=state.enemies[i];
    e.vy+=world.gravity*dt;
    e.x+=e.vx*dt;
    e.y+=e.vy*dt;

    resolvePlatformCollisions(e,dt);

    if (aabb(player,e)&&player.invuln<=0){
      player.hpHalf--;
      player.invuln=40;
      rebuildHUD();
      if (player.hpHalf<=0){
        state.gameOver=true;
        UI.gameover.classList.remove('hidden');
      }
    }

    if (e.hp<=0){
      state.enemies.splice(i,1);
      state.kills++;
      UI.killNum.textContent=state.kills;
      state.healCounter++;
      if (state.healCounter>=2){
        state.healCounter=0;
        player.hpHalf=Math.min(player.maxHpHalf,player.hpHalf+1);
        rebuildHUD();
      }
    }
  }

  /* SPAWN */
  state.spawnTimer-=dt;
  if (state.spawnTimer<=0 && state.enemiesToSpawn>0 && state.enemies.length<state.aliveMax){
    spawnEnemy();
    state.spawnTimer=60;
  }
}

/* =====================
   DRAW
===================== */
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.drawImage(ASSETS.gate,canvas.width/2-60,260,120,120);

  ctx.fillStyle='#333';
  world.platforms.forEach(p=>ctx.fillRect(p.x,p.y,p.w,p.h));

  drawPlayer();
  state.enemies.forEach(drawEnemy);
}

function drawPlayer(){
  const s=2.1;
  ctx.save();
  ctx.translate(player.x+player.w/2,player.y+player.h/2);
  ctx.scale(player.facing,1);
  ctx.drawImage(ASSETS.knight,0,0,32,32,-32*s/2,-32*s/2,32*s,32*s);
  ctx.restore();
}

function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x+e.w/2,e.y+e.h/2);
  ctx.scale(e.facing,1);
  ctx.drawImage(ASSETS.demon,-32,-32,64,64);
  ctx.restore();
}

/* =====================
   LOOP
===================== */
let last=performance.now();
function loop(t){
  const dt=(t-last)/16.666;
  last=t;

  if (state.started && !state.paused && !state.gameOver){
    update(dt);
  }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

rebuildHUD();
