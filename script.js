const GRID_SIZE = 10;

const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 }
];

let playerGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("~"));
let aiGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("~"));
let playerShips = [];
let aiMoves = []; // Tracks AI's past moves
let lastHit = null; // Last coordinate hit by AI
let huntTargets = []; // Queue of coordinates to try during hunt mode
let isPlayerTurn = true;
let gameOver = false;
let aiShipsRemaining = SHIPS.length;
let playerShipsRemaining = SHIPS.length;

// 1. Game Stats Structure (LocalStorage)
let gameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0
};

function loadStats() {
  const saved = localStorage.getItem("battleship_stats");
  if (saved) {
    gameStats = JSON.parse(saved);
  }
}

function saveStats() {
  localStorage.setItem("battleship_stats", JSON.stringify(gameStats));
}

// 5. Reset Game State Function
function resetGame() {
  playerGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("~"));
  aiGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill("~"));
  playerShips = [];
  aiMoves = [];
  lastHit = null;
  huntTargets = [];
  isPlayerTurn = true;
  gameOver = false;
  // Reset ship counts if needed (assuming they are tracked elsewhere or implicitly reset)
  // aiShipsRemaining = SHIPS.length;
  // playerShipsRemaining = SHIPS.length;
  // Note: AI ships need to be placed again after reset if starting a new game.
}

// 3. Add Restart Prompt
function showRestartPrompt(term) {
  term.writeln("\\n🔁 Type `restart` to play again or `stats` to view game stats.");
}


function parseCoord(coord) {
  const match = coord.match(/^([A-Ja-j])([1-9]|10)$/);
  if (!match) return null;
  const row = match[1].toUpperCase().charCodeAt(0) - 65;
  const col = parseInt(match[2], 10) - 1;
  return { row, col };
}

function canPlaceShip(grid, row, col, size, direction) {
  if (direction === 'H') {
    if (col + size > GRID_SIZE) return false;
    for (let i = 0; i < size; i++) {
      if (grid[row][col + i] !== '~') return false;
    }
  } else {
    if (row + size > GRID_SIZE) return false;
    for (let i = 0; i < size; i++) {
      if (grid[row + i][col] !== '~') return false;
    }
  }
  return true;
}

function placeShip(grid, row, col, size, direction, symbol) {
  for (let i = 0; i < size; i++) {
    if (direction === 'H') {
      grid[row][col + i] = symbol;
    } else {
      grid[row + i][col] = symbol;
    }
  }
}

function placeAIShips() {
  for (const ship of SHIPS) {
    let placed = false;

    while (!placed) {
      const direction = Math.random() < 0.5 ? "H" : "V";
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      if (canPlaceShip(aiGrid, row, col, ship.size, direction)) {
        placeShip(aiGrid, row, col, ship.size, direction, ship.name[0]);
        placed = true;
      }
    }
  }
}

function isValidCoord(row, col) {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

function enqueueHuntTargets(row, col) {
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 }   // right
  ];

  for (const { dr, dc } of directions) {
    const r = row + dr;
    const c = col + dc;
    if (isValidCoord(r, c) && !aiMoves.some(m => m.row === r && m.col === c)) {
      huntTargets.push({ row: r, col: c });
    }
  }
}

function aiTurn(term) {
  let row, col;

  // If we are hunting
  if (huntTargets.length > 0) {
    const target = huntTargets.shift();
    row = target.row;
    col = target.col;
  } else {
    // Random fire until hit
    do {
      row = Math.floor(Math.random() * GRID_SIZE);
      col = Math.floor(Math.random() * GRID_SIZE);
    } while (aiMoves.some(m => m.row === row && m.col === col));
  }

  aiMoves.push({ row, col });

  const cell = playerGrid[row][col];
  const coordStr = `${String.fromCharCode(65 + row)}${col + 1}`;

  if (cell !== "~") {
    term.writeln(`🤖 AI fires at ${coordStr} — 💥 HIT!`);
    playerGrid[row][col] = "X"; // mark as hit

    // Check if player lost
    if (checkVictory(playerGrid, "Player", term)) return; // Pass term here

    // Start hunt mode from this hit
    lastHit = { row, col };
    enqueueHuntTargets(row, col);
  } else {
    term.writeln(`🤖 AI fires at ${coordStr} — 🌊 Miss.`);
    playerGrid[row][col] = "O"; // mark as miss
  }

  // Switch turn back to player
  isPlayerTurn = true;
  term.writeln("🧠 Your turn! Type: fire [coord]");
}

// 2. Update checkVictory to Identify Winner
function checkVictory(grid, owner, term) { // Added term parameter
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Check if any part of a ship (represented by first letter) remains
      if (SHIPS.some(ship => grid[row][col] === ship.name[0])) {
        return false; // Found an unhit ship part
      }
    }
  }

  // If no ship parts found, the game is over for this grid
  gameOver = true;
  gameStats.gamesPlayed++;

  if (owner === "AI") { // AI's grid checked, means Player attacked
    gameStats.wins++; // Player wins
    term.writeln("🏆 You win! All enemy ships are destroyed.");
  } else { // Player's grid checked, means AI attacked
    gameStats.losses++; // Player loses
    term.writeln("💀 You lost. All your ships have been sunk.");
  }

  saveStats();
  showRestartPrompt(term); // Pass term here
  return true;
}


document.addEventListener("DOMContentLoaded", () => {
    loadStats(); // Load stats when the DOM is ready

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      theme: {
        background: "#000000",
        foreground: "#00FF00"
      }
    });
  
    term.open(document.getElementById("terminal"));
    term.writeln("🛳️ Welcome to Battleship Terminal Game!");
    term.writeln("Type 'start' to begin or 'help' for commands.\\n");
  
    // Example input listener
    let input = "";
    term.onKey(({ key, domEvent }) => {
      if (domEvent.key === "Enter") {
        term.writeln(`> ${input}`);
        handleCommand(input.trim().toLowerCase(), term);
        input = "";
      } else if (domEvent.key === "Backspace") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        input += key;
        term.write(key);
      }
    });
  });

  function handleCommand(cmd, term) {
    if (gameOver && !["restart", "stats", "help"].includes(cmd.trim().split(" ")[0])) {
        term.writeln("⛔ The game is over. Type 'restart' to play again.");
        showRestartPrompt(term);
        return;
    }

    const tokens = cmd.trim().split(" ");

    if (tokens[0] === "place") {
      if (tokens.length !== 4) {
        term.writeln("❌ Usage: place [ShipName] [Coord] [H/V]");
        return;
      }

      const [_, shipName, coord, dirRaw] = tokens;
      const direction = dirRaw.toUpperCase();
      const ship = SHIPS.find(s => s.name.toLowerCase() === shipName.toLowerCase());

      if (!ship) {
        term.writeln("❌ Invalid ship name.");
        return;
      }

      const coords = parseCoord(coord);
      if (!coords) {
        term.writeln("❌ Invalid coordinate format. Use A1–J10.");
        return;
      }

      if (!['H', 'V'].includes(direction)) {
        term.writeln("❌ Direction must be H (Horizontal) or V (Vertical).");
        return;
      }

      if (!canPlaceShip(playerGrid, coords.row, coords.col, ship.size, direction)) {
        term.writeln("❌ Cannot place ship here. Space is occupied or out of bounds.");
        return;
      }

      placeShip(playerGrid, coords.row, coords.col, ship.size, direction, ship.name[0]);
      playerShips.push({ ...ship, placed: true });
      term.writeln(`✅ Placed ${ship.name} at ${coord.toUpperCase()} (${direction})`);
      return;
    }

    if (tokens[0] === "fire") {
      if (tokens.length !== 2) {
        term.writeln("❌ Usage: fire [Coord] (e.g., fire C7)");
        return;
      }

      if (!isPlayerTurn || gameOver) {
        term.writeln("⛔ It's not your turn or the game is over.");
        return;
      }

      const coord = tokens[1].toUpperCase();
      const { row, col } = parseCoord(coord) || {};

      if (row === undefined || col === undefined) {
        term.writeln("❌ Invalid coordinate. Use A1–J10.");
        return;
      }

      const cell = aiGrid[row][col];

      if (cell === "X" || cell === "O") {
        term.writeln("⚠️ You already fired at that spot!");
        return;
      }

      // HIT or MISS
      if (cell !== "~") {
        aiGrid[row][col] = "X";
        term.writeln(`🎯 You fired at ${coord} — 💥 HIT!`);
        // Optionally track sunk ship
      } else {
        aiGrid[row][col] = "O";
        term.writeln(`🌊 You fired at ${coord} — Miss.`);
      }

      // Check win condition
      if (checkVictory(aiGrid, "AI", term)) { // Pass term here
        // Victory message handled within checkVictory
        return;
      }

      isPlayerTurn = false;

      // Delay for realism
      term.writeln("🤖 AI is thinking...");
      setTimeout(() => {
        if (!gameOver) { // Check if game didn't end on player's turn
            aiTurn(term);
            // AI's turn might end the game, checkVictory is called within aiTurn if it hits
        }
      }, 1000);

      return;
    }

    // Other commands
    switch (cmd) {
      case "start":
        if (gameOver) {
            term.writeln("⛔ Game already finished. Type 'restart' first.");
            return;
        }
        term.writeln("🚀 Starting the game...");
        resetGame(); // Ensure clean state before starting
        placeAIShips(); // Place AI ships
        // TODO: Add logic for player ship placement phase or instructions
        term.writeln(" Ship placement phase (Use 'place' command). Type 'ready' when done?"); // Placeholder
        // For now, let's assume player places ships then starts firing
        isPlayerTurn = true; // Player starts
        break;
      case "help":
        term.writeln("Available commands:");
        term.writeln("- place [ShipName] [Coord] [H/V] (e.g., place Carrier A1 H)");
        term.writeln("- fire [Coord] (e.g., fire C7)");
        term.writeln("- stats");
        term.writeln("- restart");
        term.writeln("- start (to begin after placing ships or after restart)");
        break;
      case "stats":
        // 6. Show Stats (updated for terminal)
        const winRate = gameStats.gamesPlayed > 0
          ? ((gameStats.wins / gameStats.gamesPlayed) * 100).toFixed(2)
          : 0;
        term.writeln("📊 Game Statistics:");
        term.writeln(` Games Played: ${gameStats.gamesPlayed}`);
        term.writeln(` Wins: ${gameStats.wins}`);
        term.writeln(` Losses: ${gameStats.losses}`);
        term.writeln(` Win Rate: ${winRate}%`);
        break;
      case "restart": // 4. Add restart Command
        resetGame();
        term.writeln("🔄 Game has been reset. Place your ships and type 'start' to play again.");
        // Optionally clear the terminal: term.clear();
        break;
      case "testai": // Add testai command
        aiTurn(term);
        break;
      default:
        // Check if the default case should handle the split command or the original cmd
        const originalCmd = tokens.join(" "); // Reconstruct original command if needed
        if (originalCmd !== "place") { // Avoid re-processing place command
            term.writeln("❌ Unknown command. Type 'help' to see available commands.");
        }
    }
  }
