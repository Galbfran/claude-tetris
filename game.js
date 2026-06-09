"use strict";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  "#4dd0e1",
  "#ffd54f",
  "#ba68c8",
  "#81c784",
  "#e57373",
  "#90caf9",
  "#ffb74d",
  "#9e9e9e",
];

const SKINS = {
  retro: {
    name: "Retro",
    colors: COLORS,
    drawBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    },
  },
  neon: {
    name: "Neon",
    colors: [null, "#00ffff", "#ffff00", "#ff00ff", "#00ff88", "#ff3355", "#3399ff", "#ff9900", "#aaaaaa"],
    drawBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    },
  },
  pastel: {
    name: "Pastel",
    colors: [null, "#b2ebf2", "#fff9c4", "#e1bee7", "#c8e6c9", "#ffcdd2", "#bbdefb", "#ffe0b2", "#e0e0e0"],
    drawBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
      ctx.globalAlpha = 1;
    },
  },
  pixel: {
    name: "Pixel",
    colors: [null, "#4dd0e1", "#ffd54f", "#ba68c8", "#81c784", "#e57373", "#90caf9", "#ffb74d", "#9e9e9e"],
    drawBlock(ctx, x, y, color, size, alpha) {
      ctx.globalAlpha = alpha;
      const px = x * size, py = y * size;
      const h = size / 2;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(px + 1, py + 1, h - 1, h - 1);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(px + h, py + h, h - 1, h - 1);
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
      ctx.globalAlpha = 1;
    },
  },
};

let currentSkin = SKINS.retro;

const PIECES = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next-canvas");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayScore = document.getElementById("overlay-score");
const pauseMenu = document.getElementById("pause-menu");
const gameoverMenu = document.getElementById("gameover-menu");
const resumeBtn = document.getElementById("resume-btn");
const restartBtn = document.getElementById("restart-btn");
const controlsBtn = document.getElementById("controls-btn");
const controlsList = document.getElementById("controls-list");
const startLevelDisplay = document.getElementById("start-level-display");
const levelUpBtn = document.getElementById("level-up");
const levelDownBtn = document.getElementById("level-down");
const gameoverRestartBtn = document.getElementById("gameover-restart-btn");

let board,
  current,
  next,
  score,
  lines,
  level,
  maxClear,
  paused,
  gameOver,
  lastTime,
  dropAccum,
  dropInterval,
  animId,
  startLevel = 1;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length,
    cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    if (cleared > maxClear) maxClear = cleared;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = currentSkin.colors[colorIndex];
  currentSkin.drawBlock(context, x, y, color, size, alpha ?? 1);
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body)
    .getPropertyValue("--grid-color")
    .trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function showPauseMenu() {
  pauseMenu.classList.remove("hidden");
  gameoverMenu.classList.add("hidden");
  overlay.classList.remove("hidden");
}

function showGameOver() {
  pauseMenu.classList.add("hidden");
  gameoverMenu.classList.remove("hidden");
  overlayTitle.textContent = "GAME OVER";
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  gameoverRestartBtn.textContent = "Reiniciar";
  if (isTopScore(score)) {
    nameSection.classList.remove("hidden");
    playerNameInput.value = "";
  } else {
    nameSection.classList.add("hidden");
  }
  renderLeaderboard();
  overlay.classList.remove("hidden");
}

function resumeGame() {
  overlay.classList.add("hidden");
  paused = false;
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function loadRecords() {
  return JSON.parse(localStorage.getItem("tetris-records") || "[]");
}
function saveRecords(recs) {
  localStorage.setItem("tetris-records", JSON.stringify(recs));
}
function isTopScore(s) {
  const r = loadRecords();
  return r.length < 5 || s > r[r.length - 1].score;
}
function addRecord(name, s, l, mc) {
  const recs = loadRecords();
  recs.push({ name, score: s, lines: l, maxClear: mc });
  recs.sort((a, b) => b.score - a.score);
  if (recs.length > 5) recs.length = 5;
  saveRecords(recs);
}
function renderLeaderboard(highlightScore) {
  const recs = loadRecords();
  const tbody = document.getElementById("lb-body");
  tbody.innerHTML =
    recs.length === 0
      ? '<tr><td colspan="4" class="lb-empty">Sin records aún</td></tr>'
      : recs
          .map((r, i) => {
            const hl =
              highlightScore !== undefined && r.score === highlightScore
                ? " lb-new"
                : "";
            return `<tr class="${hl}"><td>${i + 1}</td><td>${r.name}</td><td>${r.score.toLocaleString()}</td><td>${r.lines} / ${r.maxClear}</td></tr>`;
          })
          .join("");
}

const nameSection = document.getElementById("name-section");
const playerNameInput = document.getElementById("player-name");
const confirmNameBtn = document.getElementById("confirm-name-btn");
const resetRecordsBtn = document.getElementById("reset-records-btn");

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  showGameOver();
}

confirmNameBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim() || "Anónimo";
  addRecord(name, score, lines, maxClear);
  nameSection.classList.add("hidden");
  renderLeaderboard(score);
});

playerNameInput.addEventListener("keydown", (e) => {
  if (e.code === "Enter") confirmNameBtn.click();
});

resetRecordsBtn.addEventListener("click", () => {
  localStorage.removeItem("tetris-records");
  renderLeaderboard();
});

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    cancelAnimationFrame(animId);
    showPauseMenu();
  } else {
    resumeGame();
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  maxClear = 0;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (startLevel - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add("hidden");
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyP" || e.code === "Escape") {
    togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case "ArrowLeft":
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case "ArrowRight":
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case "ArrowDown":
      softDrop();
      break;
    case "ArrowUp":
    case "KeyX":
      tryRotate();
      break;
    case "Space":
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

resumeBtn.addEventListener("click", resumeGame);
restartBtn.addEventListener("click", () => { overlay.classList.add("hidden"); init(); });
gameoverRestartBtn.addEventListener("click", init);

controlsBtn.addEventListener("click", () => {
  controlsList.classList.toggle("hidden");
});

levelUpBtn.addEventListener("click", () => {
  startLevel = Math.min(15, startLevel + 1);
  startLevelDisplay.textContent = startLevel;
});
levelDownBtn.addEventListener("click", () => {
  startLevel = Math.max(1, startLevel - 1);
  startLevelDisplay.textContent = startLevel;
});

function showStartScreen() {
  overlayTitle.textContent = "TETRIS";
  overlayScore.textContent = "";
  gameoverRestartBtn.textContent = "Jugar";
  nameSection.classList.add("hidden");
  renderLeaderboard();
  pauseMenu.classList.add("hidden");
  gameoverMenu.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

const themeToggle = document.getElementById("theme-toggle");
const toggleIcon = themeToggle.querySelector(".toggle-icon");
const toggleLabel = themeToggle.querySelector(".toggle-label");

function applyTheme(isLight) {
  if (isLight) {
    document.body.classList.add("light-mode");
    toggleIcon.textContent = "☀";
    toggleLabel.textContent = "DARK";
  } else {
    document.body.classList.remove("light-mode");
    toggleIcon.textContent = "☾";
    toggleLabel.textContent = "LIGHT";
  }
}

function applySkin(name) {
  currentSkin = SKINS[name] || SKINS.retro;
  localStorage.setItem("tetris-skin", name);
  document.querySelectorAll(".skin-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.skin === name)
  );
  if (current) draw();
}

document.querySelectorAll(".skin-btn").forEach((b) =>
  b.addEventListener("click", () => applySkin(b.dataset.skin))
);

const savedTheme = localStorage.getItem("tetris-theme");
applyTheme(savedTheme === "light");
applySkin(localStorage.getItem("tetris-skin") || "retro");

themeToggle.addEventListener("click", () => {
  const isLight = !document.body.classList.contains("light-mode");
  applyTheme(isLight);
  localStorage.setItem("tetris-theme", isLight ? "light" : "dark");
});

showStartScreen();
