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
  try { // Add try...catch
    const saved = localStorage.getItem("battleship_stats");
    if (saved) {
      gameStats = JSON.parse(saved);
    }
  } catch (e) { // Add catch block
    console.error("Stats load failed:", e);
  }
}

function saveStats() {
  try { // Add try...catch
    localStorage.setItem("battleship_stats", JSON.stringify(gameStats));
  } catch (e) { // Add catch block
    console.error("Stats save failed:", e);
  }
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
    if (checkVictory(playerGrid, "Player", term)) {
        saveGameState(); // Save state on game over
        return;
    }

    // Start hunt mode from this hit
    lastHit = { row, col };
    enqueueHuntTargets(row, col);
  } else {
    term.writeln(`🤖 AI fires at ${coordStr} — 🌊 Miss.`);
    playerGrid[row][col] = "O"; // mark as miss
  }

  // Switch turn back to player
  isPlayerTurn = true;
  saveGameState(); // Auto-save after AI turn
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
  saveGameState(); // Save state when game ends
  return true;
}

// 2. Game State: saveGameState() & loadGameState()
function saveGameState() {
  const state = {
    playerGrid,
    aiGrid,
    isPlayerTurn,
    aiMoves,
    lastHit,
    huntTargets,
    gameOver,
    // Save ship counts as well
    aiShipsRemaining,
    playerShipsRemaining,
    playerShips // Save placed player ships
  };

  try {
    localStorage.setItem("battleship_game_state", JSON.stringify(state));
    // Optional: Add term.writeln("💾 Game state saved."); if needed, but might be noisy with auto-save

    // Trigger save toast
    const toastEl = document.getElementById('saveToast');
    if (toastEl) { // Check if element exists
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

  } catch (e) {
    console.error("Save failed:", e);
    // Optional: term.writeln("❌ Error saving game state.");
  }
}

function loadGameState(term) {
  try {
    const saved = localStorage.getItem("battleship_game_state");
    if (!saved) {
      term.writeln("⚠️ No saved game found.");
      return false; // Indicate failure
    }

    const state = JSON.parse(saved);
    playerGrid = state.playerGrid;
    aiGrid = state.aiGrid;
    isPlayerTurn = state.isPlayerTurn;
    aiMoves = state.aiMoves || [];
    lastHit = state.lastHit || null;
    huntTargets = state.huntTargets || [];
    gameOver = state.gameOver;
    // Restore ship counts and placed ships
    aiShipsRemaining = state.aiShipsRemaining !== undefined ? state.aiShipsRemaining : SHIPS.length;
    playerShipsRemaining = state.playerShipsRemaining !== undefined ? state.playerShipsRemaining : SHIPS.length;
    playerShips = state.playerShips || [];


    term.writeln("✅ Game state restored.");
    // Optionally display the current state/grids after loading
    // displayGrids(term); // Assuming a function to display grids exists
    if (!gameOver) {
        term.writeln(isPlayerTurn ? "🧠 Your turn!" : "🤖 AI's turn.");
    } else {
        showRestartPrompt(term);
    }
    return true; // Indicate success
  } catch (e) {
    console.error("Load failed:", e);
    term.writeln("❌ Error loading game state.");
    return false; // Indicate failure
  }
}


document.addEventListener("DOMContentLoaded", () => {
    loadStats(); // Load stats when the DOM is ready

    // ... existing terminal setup ...
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
    term.writeln("Type 'start' to begin or 'help' for commands.\n");

    // Trigger the 'start' command when the Start Game button is clicked
    document.getElementById("startGameBtn").addEventListener("click", () => {
      term.writeln("> start");
      handleCommand("start", term);
    });

    // Generate Coordinate Buttons (A1 to J10)
    const coordContainer = document.getElementById("coordButtons");
    if (coordContainer) { // Check if the container exists
      const rows = "ABCDEFGHIJ";
      for (let r = 0; r < 10; r++) {
        for (let c = 1; c <= 10; c++) {
          const coord = `${rows[r]}${c}`;
          const btn = document.createElement("button");
          btn.className = "btn btn-sm btn-outline-light m-1";
          btn.innerText = coord;
          btn.dataset.coord = coord;
          coordContainer.appendChild(btn);
        }
      }
    }

    // Handle Button Clicks and Command Execution
    let selectedShip = "";
    let selectedCoord = "";
    let selectedDir = "";

    // Highlight and store selected ship
    $("#shipButtons button").on("click", function () {
      selectedShip = this.dataset.ship;
      $("#shipButtons button").removeClass("active");
      this.classList.add("active");
    });

    // Highlight and store selected coord
    $("#coordButtons").on("click", "button", function () {
      selectedCoord = this.dataset.coord;
      $("#coordButtons button").removeClass("active");
      this.classList.add("active");
    });

    // Highlight and store selected direction
    $("#dirButtons button").on("click", function () {
      selectedDir = this.dataset.dir;
      $("#dirButtons button").removeClass("active");
      this.classList.add("active");
    });

    // Confirm & Place
    $("#confirmPlaceBtn").on("click", function () {
      if (!selectedShip || !selectedCoord || !selectedDir) {
        term.writeln("❌ Please select ship, position, and direction.");
        return;
      }

      const command = `place ${selectedShip} ${selectedCoord} ${selectedDir}`;
      term.writeln(`> ${command}`);
      handleCommand(command.toLowerCase(), term);

      // Optional: Reset selections after placing
      // selectedShip = "";
      // selectedCoord = "";
      // selectedDir = "";
      // $("#shipButtons button, #coordButtons button, #dirButtons button").removeClass("active");
    });

    // Stats Modal Content Update Listener
    const statsModal = document.getElementById('statsModal');
    if (statsModal) { // Check if element exists
        statsModal.addEventListener('show.bs.modal', () => {
            const statsContent = document.getElementById('statsContent');
            if (statsContent) { // Check if element exists
                statsContent.innerHTML = `
                    <div class="text-center">
                    <h5>📊 Your Game Stats</h5>
                    <p><strong>Games Played:</strong> ${gameStats.gamesPlayed}</p>
                    <p><strong>Wins:</strong> ${gameStats.wins}</p>
                    <p><strong>Losses:</strong> ${gameStats.losses}</p>
                    <p><strong>Win Rate:</strong> ${
                        gameStats.gamesPlayed > 0
                        ? ((gameStats.wins / gameStats.gamesPlayed) * 100).toFixed(2)
                        : "0.00"
                    }%</p>
                    </div>
                `;
            }
        });
    }

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
        term.writeln("❌ Usage: place [ShipName] [Coord] [H/V] (e.g., place Carrier A1 H)");
        return;
      }

      const [_, shipName, coord, dirRaw] = tokens;
      const direction = dirRaw.toUpperCase();
      const ship = SHIPS.find(s => s.name.toLowerCase() === shipName.toLowerCase());

      if (!ship) {
        term.writeln("❌ Invalid ship name.");
        return;
      }

      // 3. Prevent duplicate ship placements
      if (playerShips.find(s => s.name === ship.name)) {
        term.writeln(`⚠️ ${ship.name} is already placed.`);
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
        saveGameState(); // Save state on game over
        return;
      }

      isPlayerTurn = false;
      saveGameState(); // Auto-save after player's successful move

      // Delay for realism
      term.writeln("🤖 AI is thinking...");
      setTimeout(() => {
        if (!gameOver) { // Check if game didn't end on player's turn
            aiTurn(term);
            // AI's turn might end the game, checkVictory is called within aiTurn if it hits
            // saveGameState() is called within aiTurn or checkVictory
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
        // isPlayerTurn = true; // Player starts - Moved to 'ready' command
        saveGameState(); // Save initial state after placing AI ships
        break;
      // 2. Add ready command
      case "ready":
        if (playerShips.length !== SHIPS.length) {
          term.writeln(`⚠️ You haven't placed all ${SHIPS.length} ships yet. (${playerShips.length} placed)`);
        } else {
          term.writeln("✅ All ships placed. Game started! Your turn.");
          isPlayerTurn = true; // Start the game, player's turn
          saveGameState(); // Save state after player is ready
        }
        break;
      case "help":
        term.writeln("Available commands:");
        term.writeln("- place [ShipName] [Coord] [H/V] (e.g., place Carrier A1 H)");
        term.writeln("- ready (confirm ship placement and start the game)"); // Add ready to help
        term.writeln("- fire [Coord] (e.g., fire C7)");
        term.writeln("- viewgrid (show your current grid)"); // Add viewgrid to help
        term.writeln("- stats");
        term.writeln("- restart");
        // term.writeln("- start (to begin after placing ships or after restart)"); // Start is less relevant now
        term.writeln("- save (manually save game state)");
        term.writeln("- load (load last saved game state)");
        term.writeln("- clear (delete saved stats and game state)");
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
      case "save": // Add save command
        saveGameState();
        term.writeln("💾 Game state saved manually."); // Provide feedback for manual save
        break;
      case "load": // Add load command
        loadGameState(term);
        // Maybe redraw grids or show current turn after load
        break;
      case "clear": // Add clear command
        localStorage.removeItem("battleship_stats");
        localStorage.removeItem("battleship_game_state");
        gameStats = { gamesPlayed: 0, wins: 0, losses: 0 }; // Reset in-memory stats too
        term.writeln("🧹 LocalStorage cleared. Stats and saved game deleted.");
        // Optionally reset the current game state as well
        // resetGame();
        // term.writeln("🔄 Game reset. Type 'start' to begin a new game.");
        break;
      case "restart": // 4. Add restart Command
        resetGame();
        placeAIShips(); // Need to place AI ships again for the new game
        term.writeln("🔄 Game has been reset. Place your ships and type 'ready' when done."); // Updated prompt
        saveGameState(); // Save the fresh state after reset
        // Optionally clear the terminal: term.clear();
        break;
      case "viewgrid": // Add viewgrid command
        printPlayerGrid(term);
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

// Add a simple grid viewer in terminal
function printPlayerGrid(term) {
  term.writeln("🧭 Your Grid:");
  term.writeln("   1 2 3 4 5 6 7 8 9 10");
  for (let i = 0; i < GRID_SIZE; i++) {
    const rowLetter = String.fromCharCode(65 + i);
    // Display placed ships ('S'), hits ('X'), misses ('O'), and empty water ('.')
    const rowData = playerGrid[i].map(cell => {
        if (cell === "~") return "."; // Empty water
        if (cell === "X") return "X"; // Hit
        if (cell === "O") return "O"; // Miss
        return "S"; // Any other non-empty cell is a ship part
    }).join(" ");
    term.writeln(`${rowLetter}  ${rowData}`);
  }
}
