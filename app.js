const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');

context.scale(20, 20);

const COLORS = [
  null,
  '#ff5c5c',
  '#ffd35c',
  '#6ddf6d',
  '#55d3ff',
  '#7d7dff',
  '#e07cff',
  '#ffa257',
];

const arena = createMatrix(12, 20);
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 1,
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;

function createMatrix(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

function createPiece(type) {
  switch (type) {
    case 'T': return [[0, 6, 0], [6, 6, 6], [0, 0, 0]];
    case 'O': return [[2, 2], [2, 2]];
    case 'L': return [[0, 0, 7], [7, 7, 7], [0, 0, 0]];
    case 'J': return [[5, 0, 0], [5, 5, 5], [0, 0, 0]];
    case 'I': return [[0, 0, 0, 0], [4, 4, 4, 4], [0, 0, 0, 0], [0, 0, 0, 0]];
    case 'S': return [[0, 3, 3], [3, 3, 0], [0, 0, 0]];
    case 'Z': return [[1, 1, 0], [0, 1, 1], [0, 0, 0]];
    default: return [[0]];
  }
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);

  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
  dropCounter = 0;
}

function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) {
    player.pos.x -= offset;
  }
}

function hardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  arenaSweep();
  playerReset();
  dropCounter = 0;
}

function arenaSweep() {
  let rowCount = 1;
  let cleared = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    player.score += rowCount * 100;
    rowCount *= 2;
    cleared++;
  }

  if (cleared) {
    player.lines += cleared;
    player.level = Math.min(15, 1 + Math.floor(player.lines / 10));
    dropInterval = Math.max(120, 1000 - (player.level - 1) * 65);
    updateScore();
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = COLORS[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#0a1222';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, { x: 0, y: 0 });
  if (player.matrix) {
    drawMatrix(player.matrix, player.pos);
  }
}

function update(time = 0) {
  if (gameOver) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function playerReset() {
  const pieces = 'TJLOSZI';
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    gameOver = true;
    draw();
    context.fillStyle = 'rgba(0,0,0,0.72)';
    context.fillRect(0, 8, 12, 4);
    context.fillStyle = '#fff';
    context.font = '1px sans-serif';
    context.fillText('GAME OVER', 3.3, 10);
  }
}

function updateScore() {
  scoreEl.textContent = player.score;
  linesEl.textContent = player.lines;
  levelEl.textContent = player.level;
}

function resetGame() {
  arena.forEach((row) => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  dropInterval = 1000;
  gameOver = false;
  lastTime = 0;
  playerReset();
  updateScore();
  update();
}

document.addEventListener('keydown', (event) => {
  if (gameOver) return;
  if (event.key === 'ArrowLeft') playerMove(-1);
  if (event.key === 'ArrowRight') playerMove(1);
  if (event.key === 'ArrowDown') playerDrop();
  if (event.key.toLowerCase() === 'q') playerRotate(-1);
  if (event.key.toLowerCase() === 'w' || event.key === 'ArrowUp') playerRotate(1);
  if (event.code === 'Space') hardDrop();
});

document.getElementById('restart').addEventListener('click', resetGame);

resetGame();
