const GRID_SIZE = 10;

const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 }
];

let playerGrid = [];
let aiGrid = [];
let isPlacingShips = true; // track if player is in placement phase
let currentShipIndex = 0; // which ship player is placing
let isPlayerTurn = true;
let isGameActive = false;
let lastHit = null; // For AI hunt mode
let huntTargets = []; // For AI hunt mode

// Create 10x10 grid
function createGrid() {
  return Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill("⬜"));
}

// Place all ships randomly for AI
function placeShipsRandomly(grid) {
  for (const ship of SHIPS) {
    let placed = false;
    while (!placed) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      const direction = Math.random() > 0.5 ? "HORIZONTAL" : "VERTICAL";

      if (canPlaceShip(grid, row, col, ship.size, direction)) {
        for (let i = 0; i < ship.size; i++) {
          if (direction === "HORIZONTAL") grid[row][col + i] = "🚢";
          else grid[row + i][col] = "🚢";
        }
        placed = true;
      }
    }
  }
}

// Check if ship can be placed at given coordinates
function canPlaceShip(grid, row, col, size, direction) {
  if (direction === "HORIZONTAL" && col + size > GRID_SIZE) return false;
  if (direction === "VERTICAL" && row + size > GRID_SIZE) return false;

  for (let i = 0; i < size; i++) {
    const r = direction === "HORIZONTAL" ? row : row + i;
    const c = direction === "HORIZONTAL" ? col + i : col;
    if (grid[r][c] !== "⬜") return false;
  }
  return true;
}

// Place ship manually for player
function placeShipManually(command) {
  const parts = command.split(" ");
  if (parts.length !== 3) {
    writeToTerminal("⚠️ Usage: place A5 HORIZONTAL");
    return;
  }

  const coord = parts[1].toUpperCase();
  const direction = parts[2].toUpperCase();
  const col = coord.charCodeAt(0) - 65;
  const row = parseInt(coord.slice(1)) - 1;

  const ship = SHIPS[currentShipIndex];
  if (!ship) {
    writeToTerminal("✅ All ships placed! Type `start` to begin the battle.");
    isPlacingShips = false;
    return;
  }

  if (
    isNaN(row) || row < 0 || row >= GRID_SIZE ||
    col < 0 || col >= GRID_SIZE ||
    (direction !== "HORIZONTAL" && direction !== "VERTICAL")
  ) {
    writeToTerminal("❌ Invalid input. Try again (e.g., place A5 HORIZONTAL)");
    return;
  }

  if (canPlaceShip(playerGrid, row, col, ship.size, direction)) {
    for (let i = 0; i < ship.size; i++) {
      const r = direction === "HORIZONTAL" ? row : row + i;
      const c = direction === "HORIZONTAL" ? col + i : col;
      playerGrid[r][c] = "🚢";
    }
    writeToTerminal(`✅ Placed ${ship.name} (${ship.size} cells)`);
    currentShipIndex++;
    if (currentShipIndex < SHIPS.length) {
      writeToTerminal(`Next: place ${SHIPS[currentShipIndex].name} (${SHIPS[currentShipIndex].size} cells)`);
    } else {
      writeToTerminal("✅ All ships placed! Type `start` to begin the battle.");
      isPlacingShips = false;
    }
  } else {
    writeToTerminal("🚫 Invalid placement (overlap or out of bounds). Try again.");
  }
}

// Game setup function
function setupGame() {
  playerGrid = createGrid();
  aiGrid = createGrid();
  placeShipsRandomly(aiGrid);
  isPlacingShips = true;
  currentShipIndex = 0;
  isGameActive = false; // Reset game state
  isPlayerTurn = true; // Player starts

  writeToTerminal("🧭 Begin placing your ships!");
  writeToTerminal(`Use: place A5 HORIZONTAL`);
  writeToTerminal(`First: ${SHIPS[0].name} (${SHIPS[0].size} cells)`);
}

// Handle fire command (player attacks AI)
function playerFire(command) {
  if (!isGameActive || !isPlayerTurn) {
    writeToTerminal("⚠️ Not your turn or game not active.");
    return;
  }

  const parts = command.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "fire") {
    writeToTerminal("⚠️ Usage: fire B3");
    return;
  }

  const coord = parts[1].toUpperCase();
  const col = coord.charCodeAt(0) - 65;
  const row = parseInt(coord.slice(1)) - 1;

  if (isNaN(row) || row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    writeToTerminal("❌ Invalid coordinates. Try again.");
    return;
  }

  const target = aiGrid[row][col];
  if (target === "💥" || target === "🌊") {
    writeToTerminal("⚠️ Already targeted! Choose another cell.");
    return;
  }

  if (target === "🚢") {
    aiGrid[row][col] = "💥";
    writeToTerminal(`💥 Hit at ${coord}!`);
  } else {
    aiGrid[row][col] = "🌊";
    writeToTerminal(`🌊 Miss at ${coord}.`);
  }

  if (checkWin(aiGrid)) {
    writeToTerminal("🎉 YOU WIN! All enemy ships are destroyed!");
    recordWin(); // Add this line
    isGameActive = false;
    return;
  }

  isPlayerTurn = false;
  writeToTerminal("⏳ AI is thinking...");
  setTimeout(aiFire, 1000); // AI turn after delay
}

// AI fires at playerGrid (with Hunt Mode)
function aiFire() {
  if (!isGameActive) return;

  let row, col;

  // Hunt mode logic
  if (huntTargets.length > 0) {
    // Pop a target from the hunt list
    let targetFound = false;
    while(huntTargets.length > 0 && !targetFound) {
        [row, col] = huntTargets.pop();
        // Ensure the popped target hasn't already been hit
        if (playerGrid[row][col] === "⬜" || playerGrid[row][col] === "🚢") {
            targetFound = true;
        }
    }
     // If no valid hunt targets left, revert to random firing
    if (!targetFound) {
        lastHit = null; // Reset last hit as the hunt failed or completed
        do {
            row = Math.floor(Math.random() * GRID_SIZE);
            col = Math.floor(Math.random() * GRID_SIZE);
        } while (playerGrid[row][col] === "💥" || playerGrid[row][col] === "🌊");
    }

  } else {
    // Random fire mode
    do {
      row = Math.floor(Math.random() * GRID_SIZE);
      col = Math.floor(Math.random() * GRID_SIZE);
    } while (playerGrid[row][col] === "💥" || playerGrid[row][col] === "🌊");
  }

  const coord = String.fromCharCode(65 + col) + (row + 1);
  const target = playerGrid[row][col];

  if (target === "🚢") {
    playerGrid[row][col] = "💥";
    writeToTerminal(`🤖 AI fires at ${coord}: 💥 HIT!`);

    // Add neighboring targets for hunt mode if it wasn't already a hunt target
    if (lastHit === null || (lastHit[0] !== row || lastHit[1] !== col)) {
        lastHit = [row, col];
        addHuntTargets(row, col);
        // Filter huntTargets to remove already hit cells immediately
        huntTargets = huntTargets.filter(([r, c]) => playerGrid[r][c] !== "💥" && playerGrid[r][c] !== "🌊");
    } else {
         // If it was a hunt target hit, potentially refine hunt direction later (optional advanced logic)
         // For now, just remove the hit cell from potential future targets
         huntTargets = huntTargets.filter(([r, c]) => !(r === row && c === col));
    }


  } else {
    playerGrid[row][col] = "🌊";
    writeToTerminal(`🤖 AI fires at ${coord}: 🌊 MISS!`);
    // If miss was from hunt mode, remove it from targets
     huntTargets = huntTargets.filter(([r, c]) => !(r === row && c === col));
     // If huntTargets becomes empty after a miss, reset lastHit
     if (huntTargets.length === 0) {
         lastHit = null;
     }
  }

  if (checkWin(playerGrid)) {
    writeToTerminal("💀 YOU LOSE! All your ships are destroyed!");
    recordLoss(); // Add this line
    isGameActive = false;
    return;
  }

  isPlayerTurn = true;
  writeToTerminal("🫵 Your turn! Use: fire B3");
}

// Add potential targets around a hit for Hunt Mode
function addHuntTargets(row, col) {
  const dirs = [
    [row - 1, col], // up
    [row + 1, col], // down
    [row, col - 1], // left
    [row, col + 1]  // right
  ];

  for (const [r, c] of dirs) {
    if (
      r >= 0 && r < GRID_SIZE &&
      c >= 0 && c < GRID_SIZE &&
      playerGrid[r][c] !== "💥" && // Not already hit
      playerGrid[r][c] !== "🌊" && // Not already missed
      !huntTargets.some(target => target[0] === r && target[1] === c) // Not already in targets
    ) {
      huntTargets.push([r, c]);
    }
  }
   // Optional: Shuffle huntTargets to make the hunt less predictable
   huntTargets.sort(() => Math.random() - 0.5);
}


// Check if all ships are destroyed
function checkWin(grid) {
  return !grid.flat().includes("🚢");
}

// Display grid in terminal
function displayGrid(grid, hideShips = false) {
  const header = "  A B C D E F G H I J";
  writeToTerminal(header);

  for (let i = 0; i < GRID_SIZE; i++) {
    let rowStr = `${(i + 1).toString().padStart(2)} `; // Use rowStr to avoid conflict
    for (let j = 0; j < GRID_SIZE; j++) {
      const cell = grid[i][j];
      // When hiding ships (AI board during play), show water for unhit ship cells
      if (hideShips && cell === "🚢") {
          rowStr += "⬜ ";
      }
      // Show hits, misses, or empty cells normally
      else if (cell === "💥") rowStr += "💥 ";
      else if (cell === "🌊") rowStr += "🌊 ";
      else if (cell === "🚢" && !hideShips) rowStr += "🚢 "; // Show player ships or revealed AI ships
      else rowStr += "⬜ "; // Default empty cell
    }
    writeToTerminal(rowStr);
  }
}

// Start game once ships are placed
function startGame() {
  if (isPlacingShips) {
    writeToTerminal("⛔ Finish placing all ships before starting.");
    return;
  }
  if (isGameActive) {
    writeToTerminal("⚠️ Game already started!");
    return;
  }

  isGameActive = true;
  isPlayerTurn = true;
  writeToTerminal("🎯 Game started! Your turn first.");
  writeToTerminal("Use: fire B3");
}
