// SCREENS
const startScreen = document.getElementById("startScreen");
const characterScreen = document.getElementById("characterScreen");
const weaponScreen = document.getElementById("weaponScreen");
const loadingScreen = document.getElementById("loadingScreen");
const canvas = document.getElementById("game");

// BUTTONS
const playBtn = document.getElementById("playBtn");
const characterChoices = document.querySelectorAll("[data-char]");
const weaponChoices = document.querySelectorAll("[data-weapon]");

// PLAYER SETUP (saved for later gameplay)
const playerData = {
  character: null,
  weapon: null
};

// START → CHARACTER SELECT
playBtn.onclick = () => {
  startScreen.classList.add("hidden");
  characterScreen.classList.remove("hidden");
};

// CHARACTER SELECT → WEAPON SELECT
characterChoices.forEach(choice => {
  choice.onclick = () => {
    playerData.character = choice.dataset.char;
    characterScreen.classList.add("hidden");
    weaponScreen.classList.remove("hidden");
  };
});

// WEAPON SELECT → LOADING → GAME
weaponChoices.forEach(choice => {
  choice.onclick = () => {
    playerData.weapon = choice.dataset.weapon;
    weaponScreen.classList.add("hidden");
    loadingScreen.classList.remove("hidden");

    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      canvas.classList.remove("hidden");
      startGame();
    }, 1200);
  };
});

// GAME START (EMPTY FOR NOW)
function startGame() {
  console.log("GAME STARTED");
  console.log("CHARACTER:", playerData.character);
  console.log("WEAPON:", playerData.weapon);

  // later: initialize player, enemies, waves, etc.
}
