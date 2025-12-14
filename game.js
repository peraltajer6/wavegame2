const startScreen = document.getElementById("startScreen");
const characterScreen = document.getElementById("characterScreen");
const weaponScreen = document.getElementById("weaponScreen");
const loadingScreen = document.getElementById("loadingScreen");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const playBtn = document.getElementById("playBtn");
const characterBoxes = document.querySelectorAll("[data-char]");
const weaponBoxes = document.querySelectorAll("[data-weapon]");

const playerData = {
  character: null,
  weapon: null
};

/* START → CHARACTER */
playBtn.onclick = () => {
  startScreen.classList.add("hidden");
  characterScreen.classList.remove("hidden");
};

/* CHARACTER → WEAPON */
characterBoxes.forEach(box => {
  box.onclick = () => {
    playerData.character = box.dataset.char;
    characterScreen.classList.add("hidden");
    weaponScreen.classList.remove("hidden");
  };
});

/* WEAPON → GAME */
weaponBoxes.forEach(box => {
  box.onclick = () => {
    playerData.weapon = box.dataset.weapon;

    weaponScreen.classList.add("hidden");
    loadingScreen.classList.remove("hidden");

    setTimeout(() => {
      loadingScreen.classList.add("hidden");

      document.body.classList.add("game-active");
      canvas.classList.remove("hidden");

      resizeCanvas();
      startGame();
    }, 800);
  };
});

/* TRUE FULLSCREEN CANVAS */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);

/* GAME START (TEMP VISUAL CONFIRMATION) */
function startGame() {
  ctx.fillStyle = "#1a234d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "24px monospace";
  ctx.fillText("FULLSCREEN GAME ACTIVE", 40, 60);

  console.log("Character:", playerData.character);
  console.log("Weapon:", playerData.weapon);
}
