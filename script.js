const GRID_SIZE = 15;
const NUM_BOMBS = 30;
const RADIUS = 25; // 正六角形の外心の半径

let grid = [];
let opened = [];
let flagged = [];
let gameStarted = false;
let gameOver = false;
let timerInterval;
let timeElapsed = 0;
let totalCells = GRID_SIZE * GRID_SIZE;
let openedCells = 0;
let longPressTimer;

function initializeGrid() {
  grid = [];
  opened = [];
  flagged = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[i] = [];
    opened[i] = [];
    flagged[i] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      grid[i][j] = 0;
      opened[i][j] = false;
      flagged[i][j] = false;
    }
  }
}

function placeBombs(firstClickRow, firstClickCol) {
  let bombsPlaced = 0;
  while (bombsPlaced < NUM_BOMBS) {
    const row = Math.floor(Math.random() * GRID_SIZE);
    const col = Math.floor(Math.random() * GRID_SIZE);
    if (grid[row][col] !== -1 && (row !== firstClickRow || col !== firstClickCol)) {
      grid[row][col] = -1;
      bombsPlaced++;
    }
  }
}

function calculateNumbers() {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] !== -1) {
        const count = countAdjacentBombs(i, j);
        grid[i][j] = count;
      }
    }
  }
}

function countAdjacentBombs(row, col) {
  let count = 0;
  const neighbors = getNeighbors(row, col);
  for (const [r, c] of neighbors) {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r][c] === -1) {
      count++;
    }
  }
  return count;
}

function getNeighbors(row, col) {
  const neighbors = [
    [row - 1, col],
    [row + 1, col],
    [row - 2, col],
    [row + 2, col],
  ];
  if (row % 2 === 0) {
    neighbors.push([row - 1, col - 1], [row + 1, col - 1]);
  } else {
    neighbors.push([row - 1, col + 1], [row + 1, col + 1]);
  }
  return neighbors;
}

function renderGrid() {
  const hexGrid = document.getElementById("hexGrid");
  hexGrid.innerHTML = "";
  const height = (RADIUS * Math.sqrt(3)) / 2;
  const width = RADIUS * 1.5;
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = document.createElement("div");
    row.className = "hex-row";
    for (let j = 0; j < GRID_SIZE; j++) {
      const hex = document.createElement("div");
      hex.className = "hex";
      hex.style.position = "absolute";
      hex.style.left = `${width * 2 * (j + (i % 2) * 0.5)}px`;
      hex.style.top = `${height * i}px`;
      hex.dataset.row = i;
      hex.dataset.col = j;
      hex.addEventListener("click", handleLeftClick);
      hex.addEventListener("contextmenu", handleRightClick);
      hex.addEventListener("mousedown", handleMiddleClick);
      hex.addEventListener("touchend", handleMiddleClick);
      hex.addEventListener("touchcancel", handleMiddleClick);
      hex.addEventListener("mousedown", handleMiddleClick);
      hex.addEventListener("touchstart", handleMiddleClick);
      hex.addEventListener("touchend", removeSurroundingClass);
      hex.addEventListener("touchcancel", removeSurroundingClass);

      // hex.innerText = [i, j];
      row.appendChild(hex);
    }
    hexGrid.appendChild(row);
  }
  hexGrid.style.width = `${width * (GRID_SIZE + 0.5)}px`;
  hexGrid.style.height = `${height * GRID_SIZE * 0.75 + RADIUS}px`;
  hexGrid.style.position = "relative";
}

function handleLeftClick(event) {
  if (gameOver) return;
  const row = parseInt(event.target.dataset.row);
  const col = parseInt(event.target.dataset.col);
  if (!gameStarted) {
    startGame(row, col);
  }
  openCell(row, col);
  updateGameState();
}

function handleRightClick(event) {
  event.preventDefault();
  if (gameOver) return;
  const row = parseInt(event.target.dataset.row);
  const col = parseInt(event.target.dataset.col);
  toggleFlag(row, col);
  updateGameState();
}

function handleMiddleClick(event) {
  if (event.type === "mousedown" && event.button !== 1) return;
  if (event.type === "touchstart") {
    longPressTimer = setTimeout(() => {
      event.preventDefault();
      if (gameOver) return;
      const row = parseInt(event.target.dataset.row);
      const col = parseInt(event.target.dataset.col);
      if (opened[row][col]) {
        if (autoFlagAdjacentCells(row, col)) {
          updateGameState();
        } else {
          openAdjacentCells(row, col);
          updateGameState();
          changeAdjacentCellsColor(row, col);
        }
      }
      document.addEventListener("touchend", removeSurroundingClass);
      document.addEventListener("touchcancel", removeSurroundingClass);
    }, 500); // Adjust the duration for long press as needed
  } else {
    clearTimeout(longPressTimer);
    if (event.type === "touchend" || event.type === "touchcancel") return;
    event.preventDefault();
    if (gameOver) return;
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    if (opened[row][col]) {
      if (autoFlagAdjacentCells(row, col)) {
        updateGameState();
      } else {
        openAdjacentCells(row, col);
        updateGameState();
        changeAdjacentCellsColor(row, col);
      }
    }
    document.addEventListener("mouseup", removeSurroundingClass);
  }
}

function changeAdjacentCellsColor(row, col) {
  const neighbors = getNeighbors(row, col);
  for (const [r, c] of neighbors) {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !flagged[r][c] && !opened[r][c]) {
      const cell = document.querySelector(`.hex[data-row="${r}"][data-col="${c}"]`);
      if (cell) {
        cell.classList.add("surrounding");
      }
    }
  }
}

function removeSurroundingClass(event) {
  if (event.type === "mouseup" && event.button !== 1) return;
  document.querySelectorAll(".surrounding").forEach((cell) => {
    cell.classList.remove("surrounding");
  });
  document.removeEventListener("mouseup", removeSurroundingClass);
  document.removeEventListener("touchend", removeSurroundingClass);
  document.removeEventListener("touchcancel", removeSurroundingClass);
}

function autoFlagAdjacentCells(row, col) {
  if (grid[row][col] === 0) return false;
  const neighbors = getNeighbors(row, col);
  let unopenedCount = 0;
  for (const [r, c] of neighbors) {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      if (!opened[r][c]) {
        unopenedCount++;
      }
    }
  }
  if (unopenedCount === grid[row][col]) {
    for (const [r, c] of neighbors) {
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !opened[r][c] && !flagged[r][c]) {
        toggleFlag(r, c);
      }
    }
    return true;
  }
  return false;
}

function openAdjacentCells(row, col) {
  if (grid[row][col] === 0) return;
  const neighbors = getNeighbors(row, col);
  let flagCount = 0;
  for (const [r, c] of neighbors) {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && flagged[r][c]) {
      flagCount++;
    }
  }
  if (flagCount === grid[row][col]) {
    for (const [r, c] of neighbors) {
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !flagged[r][c]) {
        openCell(r, c);
      }
    }
  }
}

function startGame(row, col) {
  gameStarted = true;
  placeBombs(row, col);
  calculateNumbers();
  startTimer();
}

function openCell(row, col) {
  if (opened[row][col] || flagged[row][col]) return;
  opened[row][col] = true;
  openedCells++;
  const cell = document.querySelector(`.hex[data-row="${row}"][data-col="${col}"]`);
  cell.classList.add("opened");
  if (grid[row][col] === -1) {
    cell.classList.add("bomb");
    endGame(false);
  } else if (grid[row][col] === 0) {
    const neighbors = getNeighbors(row, col);
    for (const [r, c] of neighbors) {
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        openCell(r, c);
      }
    }
  } else {
    cell.textContent = grid[row][col];
  }
}

function toggleFlag(row, col) {
  if (opened[row][col]) return;
  flagged[row][col] = !flagged[row][col];
  const cell = document.querySelector(`.hex[data-row="${row}"][data-col="${col}"]`);
  cell.classList.toggle("flagged");
}

function updateGameState() {
  updateRemainingBombs();
  updateProgress();
  checkWinCondition();
}

function updateRemainingBombs() {
  const flaggedCount = flagged.flat().filter(Boolean).length;
  document.getElementById("remaining-bombs").textContent = NUM_BOMBS - flaggedCount;
}

function updateProgress() {
  const progress = ((openedCells / (totalCells - NUM_BOMBS)) * 100).toFixed(2);
  document.getElementById("progress").textContent = `${progress}%`;
}

function checkWinCondition() {
  if (openedCells === totalCells - NUM_BOMBS) {
    endGame(true);
  }
}

function endGame(isWin) {
  gameOver = true;
  stopTimer();
  revealAllBombs();
  const message = isWin ? "勝利！おめでとうございます！" : "ゲームオーバー！";
  setTimeout(() => alert(message), 100);
}

function revealAllBombs() {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === -1) {
        const cell = document.querySelector(`.hex[data-row="${i}"][data-col="${j}"]`);
        cell.classList.add("bomb");
      }
    }
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeElapsed++;
    document.getElementById("timer").textContent = timeElapsed;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function resetGame() {
  gameStarted = false;
  gameOver = false;
  timeElapsed = 0;
  openedCells = 0;
  document.getElementById("timer").textContent = "0";
  stopTimer();
  initializeGrid();
  renderGrid();
  updateGameState();
}

document.getElementById("restart-button").addEventListener("click", resetGame);

function init() {
  initializeGrid();
  renderGrid();
  updateGameState();
}

init();
