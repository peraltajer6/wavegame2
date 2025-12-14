const startScreen = document.getElementById("startScreen");
const characterScreen = document.getElementById("characterScreen");
const weaponScreen = document.getElementById("weaponScreen");
const loadingScreen = document.getElementById("loadingScreen");
const canvas = document.getElementById("game");

const playBtn = document.getElementById("playBtn");

const characterBoxes = document.querySelectorAll("[data-char]");
const weaponBoxes = document.querySelectorAll("[data-weapon]");

const playerData = {
  character: null,
  weapon: null
};

playBtn.onclick = () => {
  startScreen.classList.add("hidden");
  characterScreen.classList.remove("hidden");
};

characterBoxes.forEach(box => {
  box.onclick = () => {
    playerData.character = box.dataset.char;
    characterScreen.classList.add("hidden");
    weaponScreen.classList.remove("hidden");
  };
});

weaponBoxes.forEach(box => {
  box.onclick = () => {
    playerData.weapon = box.dataset.weapon;
    weaponScreen.classList.add("hidden");
    loadingScreen.classList.remove("hidden");

    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      canvas.classList.remove("hidden");
      startGame();
    }, 1200);
  };
});

function startGame() {
  console.log("Character:", playerData.character);
  console.log("Weapon:", playerData.weapon);
}
