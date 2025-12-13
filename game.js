'use strict';

/* ================= CANVAS ================= */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* ================= UI ================= */
const UI = {
  hearts: document.getElementById('hearts'),
  energy: document.getElementById('energy'),
  killNum: document.getElementById('killNum'),
  start: document.getElementById('start'),
  btnStart: document.getElementById('btnStart'),
  gameover: document.getElementById('gameover'),
};

/* ================= ASSETS ================= */
function img(src){ const i=new Image(); i.src=src; return i; }

const ASSETS = {
  knight: img('assets/sprites/knight.png'),
  goblin: img('assets/sprites/goblin.png'),
  demon: img('assets/sprites/demon.png'),
  wizard: img('assets/sprites/wizard.png'),
  angel: img('assets/sprites/angel.png'),
  sword: img('assets/sprites/sword.png'),
  orb: img('assets/sprites/wizard-drop.png'),
  angelOrb: img('assets/sprites/angel-drop.png'),
};

/* ================= INPUT ================= */
const KEY = {};
addEventListener('keydown', e=>{
  KEY[e.key.toLowerCase()] = true;
  if(e.key==='1') useItem(0);
  if(e.key==='2') useItem(1);
  if(e.key.toLowerCase()==='r' && state.gameOver) resetGame();
});
addEventListener('keyup', e=>KEY[e.key.toLowerCase()] = false);

/* ================= WORLD ================= */
const world = {
  gravity: 0.9,
  friction: 0.82,
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
const aabb=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

/* ================= PLATFORM COLLISION ================= */
function resolvePlatforms(b,dt){
  b.onGround=false;
  for(const p of world.platforms){
    if(b.x+b.w<=p.x||b.x>=p.x+p.w) continue;
    const prevBottom=b.y+b.h-b.vy*dt;
    if(b.vy>=0&&prevBottom<=p.y&&b.y+b.h>=p.y){
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
  energyTimer:0,
  atkCd:0,invuln:0,
  slashTimer:0
};

/* ================= STATE ================= */
const state={
  started:false,
  gameOver:false,
  enemies:[],
  projectiles:[],
  drops:[],
  items:[null,null],
  orbEffectTimer:0,
  spawnTimer:0,
  kills:0,
  healCounter:0
};

/* ================= HUD ================= */
function rebuildHUD(){
  UI.hearts.innerHTML='';
  for(let i=0;i<5;i++){
    const s=document.createElement('span');
    s.textContent='♥';
    s.className=i*2+2<=player.hpHalf?'heart full':i*2+1===player.hpHalf?'heart half':'heart empty';
    UI.hearts.appendChild(s);
  }
  UI.energy.innerHTML='';
  for(let i=0;i<player.maxEnergy;i++){
    const p=document.createElement('div');
    p.className='pip'+(i<player.energy?' full':'');
    UI.energy.appendChild(p);
  }
  UI.killNum.textContent=state.kills;
}

/* ================= START / RESET ================= */
function resetGame(){
  Object.assign(state,{
    started:true,gameOver:false,
    enemies:[],projectiles:[],drops:[],
    items:[null,null],
    orbEffectTimer:0,
    spawnTimer:0,kills:0,healCounter:0
  });
  Object.assign(player,{
    x:120,y:200,vx:0,vy:0,
    hpHalf:10,energy:6,
    energyTimer:0,atkCd:0,invuln:0,slashTimer:0
  });
  UI.start.classList.add('hidden');
  UI.gameover.classList.add('hidden');
  rebuildHUD();
}
UI.btnStart.onclick=resetGame;

/* ================= ITEM SYSTEM ================= */
function addItem(type){
  if(!state.items[0]) state.items[0]=type;
  else if(!state.items[1]) state.items[1]=type;
}

function useItem(slot){
  const item=state.items[slot];
  if(!item) return;

  if(item==='wizard'){
    state.orbEffectTimer=300;
  }
  if(item==='angel'){
    state.enemies.length=0;
  }
  state.items[slot]=null;
}

/* ================= ENEMY SPAWN ================= */
function spawnEnemy(){
  const side=Math.random()<0.5?-1:1;
  const r=Math.random();
  let type='goblin';
  if(r>0.85) type='demon';
  if(r>0.95) type='wizard';
  if(r>0.985) type='angel';

  state.enemies.push({
    type,
    x:side===-1?10:canvas.width-44,
    y:420,w:34,h:38,
    vx:0,vy:0,facing:side===-1?1:-1,
    hp:type==='angel'?6:type==='wizard'?5:type==='demon'?4:3,
    onGround:false,jumpCd:0,attackCd:0
  });
}

/* ================= ENEMY AI ================= */
function enemyAI(e,dt){
  const px=player.x+player.w/2;
  const ex=e.x+e.w/2;
  const dir=px>ex?1:-1;
  e.facing=dir;
  e.vx+=dir*(e.type==='angel'?0.3:0.4);
  e.vx=clamp(e.vx,-2,2);

  if(e.onGround&&e.jumpCd<=0&&player.y+player.h<e.y-28&&Math.abs(px-ex)<160){
    e.vy=-15;
    e.jumpCd=90;
  }

  e.attackCd=Math.max(0,e.attackCd-dt);
  if(Math.abs(px-ex)<28&&Math.abs(player.y-e.y)<40&&e.attackCd<=0){
    if(player.invuln<=0){
      player.hpHalf--;
      player.invuln=40;
      rebuildHUD();
      if(player.hpHalf<=0){
        state.gameOver=true;
        UI.gameover.classList.remove('hidden');
      }
    }
    e.attackCd=60;
  }
}

/* ================= ATTACKS ================= */
function swordSlash(){
  if(player.atkCd>0||player.energy<=0) return;
  player.atkCd=18;
  player.energy--;
  player.slashTimer=8;

  const hit={x:player.x+(player.facing===1?player.w:-50),y:player.y+6,w:50,h:26};
  for(const e of state.enemies){
    if(aabb(hit,e)){ e.hp-=2; e.vx+=player.facing*4; e.vy=-6; }
  }
  rebuildHUD();
}

/* ================= UPDATE ================= */
function update(dt){
  if(KEY['arrowleft']){player.vx-=0.9;player.facing=-1;}
  if(KEY['arrowright']){player.vx+=0.9;player.facing=1;}
  if(KEY['arrowup']&&player.onGround) player.vy=-16;
  if(KEY['z']) swordSlash();

  player.energyTimer+=dt;
  if(player.energyTimer>=90){
    player.energyTimer=0;
    player.energy=Math.min(player.maxEnergy,player.energy+1);
    rebuildHUD();
  }

  player.vy+=world.gravity*dt;
  player.x+=player.vx*dt;
  player.y+=player.vy*dt;
  player.vx*=Math.pow(world.friction,dt);
  resolvePlatforms(player,dt);

  player.atkCd=Math.max(0,player.atkCd-dt);
  player.invuln=Math.max(0,player.invuln-dt);
  player.slashTimer=Math.max(0,player.slashTimer-dt);

  state.spawnTimer-=dt;
  if(state.spawnTimer<=0&&state.enemies.length<3){
    spawnEnemy();
    state.spawnTimer=120;
  }

  if(state.orbEffectTimer>0){
    state.orbEffectTimer--;
    for(const e of state.enemies) e.hp-=0.03;
  }

  for(let i=state.enemies.length-1;i>=0;i--){
    const e=state.enemies[i];
    enemyAI(e,dt);
    e.jumpCd=Math.max(0,e.jumpCd-dt);
    e.vy+=world.gravity*dt;
    e.x+=e.vx*dt;
    e.y+=e.vy*dt;
    resolvePlatforms(e,dt);

    if(e.hp<=0){
      if(e.type==='wizard') addItem('wizard');
      if(e.type==='angel') addItem('angel');
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
  ctx.fillStyle='#333';
  world.platforms.forEach(p=>ctx.fillRect(p.x,p.y,p.w,p.h));

  drawSprite(ASSETS.knight,player,2.1);

  state.enemies.forEach(e=>{
    const img=e.type==='angel'?ASSETS.angel:e.type==='wizard'?ASSETS.wizard:e.type==='demon'?ASSETS.demon:ASSETS.goblin;
    drawSprite(img,e,2);
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
