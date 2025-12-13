'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* ================= UI ================= */
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
};

/* ================= ASSETS ================= */
function img(src){ const i=new Image(); i.src=src; return i; }

const ASSETS = {
  knight: img('assets/sprites/knight.png'),
  demon: img('assets/sprites/demon.png'),
  demonAttack: img('assets/sprites/demon_attack.png'),
  goblin: img('assets/sprites/goblin.png'),
  wizard: img('assets/sprites/wizard.png'),
  angel: img('assets/sprites/angel.png'),
  sword: img('assets/sprites/sword.png'),
  gate: img('assets/sprites/gate.png'),
};

/* ================= INPUT ================= */
const KEY = {};
addEventListener('keydown', e => KEY[e.key.toLowerCase()] = true);
addEventListener('keyup', e => KEY[e.key.toLowerCase()] = false);

/* ================= WORLD ================= */
const world = {
  gravity: 0.9,
  friction: 0.82,
  leftWall: 0,
  rightWall: canvas.width,
  platforms: [
    {x:0,y:480,w:960,h:60},
    {x:110,y:380,w:200,h:18},
    {x:390,y:320,w:180,h:18},
    {x:640,y:380,w:210,h:18},
    {x:260,y:240,w:180,h:18},
    {x:520,y:210,w:170,h:18},
  ]
};

/* ================= HELPERS ================= */
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const aabb=(a,b)=>a.x<a.w+b.x&&a.x+a.w>b.x&&a.y<a.h+b.y&&a.y+a.h>b.y;

/* ================= PLATFORM COLLISION ================= */
function resolvePlatforms(b,dt){
  b.onGround=false;
  for(const p of world.platforms){
    if(b.x+b.w<=p.x||b.x>=p.x+p.w) continue;
    const prevBottom=b.y+b.h-b.vy*dt;
    if(b.vy>=0 && prevBottom<=p.y && b.y+b.h>=p.y){
      b.y=p.y-b.h;
      b.vy=0;
      b.onGround=true;
    }
  }
}

/* ================= PLAYER ================= */
const player={
  x:120,y:200,w:34,h:38,
  vx:0,vy:0,facing:1,onGround:false,
  hpHalf:10,maxHpHalf:10,
  energy:6,maxEnergy:6,
  invuln:0,atkCd:0
};

/* ================= STATE ================= */
const state={
  started:false,gameOver:false,
  wave:1,kills:0,
  spawnTimer:0,
  enemies:[],
  healCounter:0
};

/* ================= HUD ================= */
function rebuildHUD(){
  UI.hearts.innerHTML='';
  for(let i=0;i<5;i++){
    const s=document.createElement('span');
    s.textContent='♥';
    s.className=i*2+2<=player.hpHalf?'heart full':
                i*2+1===player.hpHalf?'heart half':'heart empty';
    UI.hearts.appendChild(s);
  }
}

/* ================= START ================= */
UI.btnStart.onclick=()=>{
  state.started=true;
  state.gameOver=false;
  state.wave=1;
  state.kills=0;
  state.enemies=[];
  player.hpHalf=10;
  player.energy=6;
  UI.start.classList.add('hidden');
  rebuildHUD();
};

/* ================= ENEMIES ================= */
function spawnEnemy(){
  const side=Math.random()<0.5?-1:1;
  state.enemies.push({
    x:side===-1?-40:canvas.width+40,
    y:420,w:34,h:38,
    vx:0,vy:0,facing:-side,
    hp:3,onGround:false
  });
}

/* ================= ENEMY AI ================= */
function enemyAI(e){
  const px=player.x+player.w/2;
  const ex=e.x+e.w/2;
  const dir=px>ex?1:-1;

  e.facing=dir;
  e.vx+=dir*0.5;
  e.vx=clamp(e.vx,-2.2,2.2);

  const above=player.y+player.h<e.y;
  if(above && e.onGround && Math.abs(px-ex)<160){
    e.vy=-15; // platform jump
  }

  if(Math.abs(px-ex)<30 && player.invuln<=0){
    player.hpHalf--;
    player.invuln=40;
    rebuildHUD();
    if(player.hpHalf<=0){
      state.gameOver=true;
      UI.gameover.classList.remove('hidden');
    }
  }
}

/* ================= ATTACK ================= */
function swordAttack(){
  if(player.atkCd>0||player.energy<=0) return;
  player.atkCd=20;
  player.energy--;

  const hit={
    x:player.x+(player.facing===1?player.w:-50),
    y:player.y+8,w:50,h:22
  };

  for(const e of state.enemies){
    if(aabb(hit,e)){
      e.hp-=2;
      e.vx+=player.facing*4;
      e.vy=-6;
    }
  }
}

/* ================= UPDATE ================= */
function update(dt){
  if(KEY['arrowleft']){player.vx-=0.9;player.facing=-1;}
  if(KEY['arrowright']){player.vx+=0.9;player.facing=1;}
  if(KEY['arrowup']&&player.onGround) player.vy=-16;
  if(KEY['z']) swordAttack();

  player.vy+=world.gravity*dt;
  player.x+=player.vx*dt;
  player.y+=player.vy*dt;
  player.vx*=Math.pow(world.friction,dt);

  player.x=clamp(player.x,world.leftWall,world.rightWall-player.w);

  resolvePlatforms(player,dt);

  player.atkCd=Math.max(0,player.atkCd-dt);
  player.invuln=Math.max(0,player.invuln-dt);

  state.spawnTimer-=dt;
  if(state.spawnTimer<=0){
    spawnEnemy(); spawnEnemy(); // multiple enemies
    state.spawnTimer=120;
  }

  for(let i=state.enemies.length-1;i>=0;i--){
    const e=state.enemies[i];
    enemyAI(e);
    e.vy+=world.gravity*dt;
    e.x+=e.vx*dt;
    e.y+=e.vy*dt;

    e.x=clamp(e.x,10,canvas.width-10-e.w);

    resolvePlatforms(e,dt);

    if(e.hp<=0){
      state.enemies.splice(i,1);
      state.kills++;
      UI.killNum.textContent=state.kills;
      state.healCounter++;
      if(state.healCounter>=2){
        state.healCounter=0;
        player.hpHalf=Math.min(10,player.hpHalf+1);
        rebuildHUD();
      }
    }
  }
}

/* ================= DRAW ================= */
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.drawImage(ASSETS.gate,canvas.width/2-80,140,160,160); // lifted gate

  ctx.fillStyle='#333';
  world.platforms.forEach(p=>ctx.fillRect(p.x,p.y,p.w,p.h));

  drawSprite(ASSETS.knight,player,2.1);

  state.enemies.forEach(e=>{
    drawSprite(ASSETS.demon,e,2);
  });
}

function drawSprite(img,o,s){
  if(!img.complete) return;
  ctx.save();
  ctx.translate(o.x+o.w/2,o.y+o.h/2);
  ctx.scale(o.facing,1);
  ctx.drawImage(img,-16*s,-16*s,32*s,32*s);
  ctx.restore();
}

/* ================= LOOP ================= */
let last=performance.now();
function loop(t){
  const dt=(t-last)/16.666;
  last=t;
  if(state.started&&!state.gameOver) update(dt);
  draw();
  requestAnimationFrame(loop);
}
loop();

rebuildHUD();
