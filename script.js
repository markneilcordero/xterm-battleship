const GRID_SIZE = 10;
const SHIPS = [
  { name: "Carrier", size: 1, count: 5 },
  { name: "Battleship", size: 1, count: 4 },
  { name: "Cruiser", size: 1, count: 3 },
  { name: "Submarine", size: 1, count: 3 },
  { name: "Destroyer", size: 1, count: 2 }
];

let term, playerGrid, aiGrid, logs, gameActive = false;
let randomPlacementConfirmed = false;
let randomPlacementLocked = false; // Add this line

// Init Xterm
document.addEventListener("DOMContentLoaded", () => {
  term = new Terminal({
    theme: { background: "#000", foreground: "#0f0" },
    fontSize: 14,
    cursorBlink: true
  });
  term.open(document.getElementById("terminal"));
  intro();

  // Generate Coordinate Buttons
  const coordGrid = document.getElementById("coordGrid");
  const letters = "ABCDEFGHIJ";

  letters.split('').forEach(rowLetter => {
    for (let col = 1; col <= 10; col++) {
      const coord = rowLetter + col;
      const btn = document.createElement("button");
      // Apply Bootstrap classes for styling and layout within the grid
      btn.className = "btn btn-sm btn-outline-info"; // Removed margin, grid gap handles spacing
      btn.innerText = coord;
      btn.dataset.coord = coord;
      btn.id = `btn-${coord}`;

      btn.addEventListener("click", () => {
        if (!gameActive) return;

        // Check if ships have been placed via the random button
        if (!randomPlacementConfirmed) {
          term.writeln("⚠️ Please place your ships first using '🎲 Place Your Ships'!");
          return;
        }

        const result = handlePlayerMove(coord); // returns true if valid move

        if (result === true) {
          term.writeln(`> Player fires at ${coord}`);
          btn.disabled = true; // Disable button after firing
          btn.classList.remove("btn-outline-info");
          btn.classList.add("btn-secondary"); // Change style to indicate it's used
        }
      });

      coordGrid.appendChild(btn); // Directly append button to the grid container
    }
  });

  $("#startBtn").click(() => startGame());
  $("#logsBtn").click(() => showLogs());
  $("#restartBtn").click(() => resetGame());

  // Random Placement Handler
  $("#randomPlaceBtn").click(() => {
    // Check if placement is locked (happens after first shot)
    if (randomPlacementLocked) {
        term.writeln("🚫 Placement is locked after the first shot!");
        return;
    }
    // Allow placement even if game hasn't formally started via Start button
    performRandomPlacement();
    // No modal needed now
  });

  // Remove the modal confirmation button handler entirely
  // $("#confirmRandomPlacement").click(() => { ... }); // DELETE THIS

  $("#playerGridBtn").click(() => {
    if (!playerGrid) {
      term.writeln("⚠️ Player grid not initialized yet.");
      return;
    }
    printGrid(term, playerGrid, "Your Grid", true); // Show ships
  });

  $("#enemyGridBtn").click(() => {
    if (!aiGrid) {
      term.writeln("⚠️ Enemy grid not initialized yet.");
      return;
    }
    printGrid(term, aiGrid, "Enemy Grid", false); // Hide ships
  });
});

function intro() {
  term.clear();
  term.writeln("🚢 Welcome to Battleship Terminal!");
  term.writeln("Click 'Start Game' to begin.\n");
}

function createGrid() {
  // Use "~" for empty water cells as expected by the new printGrid
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill("~"));
}

function placeShips(grid) {
  for (const ship of SHIPS) {
    let shipsPlaced = 0;
    while (shipsPlaced < ship.count) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      // Always try horizontal placement first for simplicity in this version
      // A more robust version would try both directions or randomly choose one
      if (canPlaceShip(grid, row, col, ship.size, "H")) {
        for (let i = 0; i < ship.size; i++) {
          grid[row][col + i] = "🚢"; // Use ship marker
        }
        shipsPlaced++;
      }
      // Note: This simple version might struggle if the grid gets very full
      // and horizontal placement keeps failing. A real implementation
      // might need a maximum attempt count or try vertical placement too.
    }
  }
}

function canPlaceShip(grid, row, col, size, dir) {
  if ((dir === "H" && col + size > GRID_SIZE) || (dir === "V" && row + size > GRID_SIZE))
    return false;
  for (let i = 0; i < size; i++) {
    // Check against "~" for empty cells
    if ((dir === "H" && grid[row][col + i] !== "~") ||
        (dir === "V" && grid[row + i][col] !== "~"))
      return false;
  }
  return true;
}

// Replace displayGrid with the new printGrid function
function printGrid(term, grid, title = "Grid", revealShips = false) {
  if (!grid) return;
  term.writeln(`\n📍 ${title}`);
  // Use 1-10 for column headers
  term.writeln("   1 2 3 4 5 6 7 8 9 10");
  for (let row = 0; row < GRID_SIZE; row++) {
    // Use A-J for row labels
    const rowLabel = String.fromCharCode(65 + row);
    const line = grid[row].map(cell => {
      if (cell === "X") return "💥";    // Hit
      if (cell === "O") return "🌊";    // Miss
      // Check for ship marker "🚢"
      if (cell === "🚢" && !revealShips) return "⬜"; // Hide ship
      if (cell === "🚢") return "🚢";    // Show ship
      return "⬜";                      // Empty water ("~")
    }).join(" ");
    // Adjust spacing for row labels
    term.writeln(`${rowLabel}  ${line}`);
  }
  term.writeln(""); // Add a blank line after the grid
}


function startGame() {
  playerGrid = createGrid();
  aiGrid = createGrid(); // Initialize AI grid but don't place ships yet
  logs = [];
  gameActive = true;
  randomPlacementConfirmed = false; // Reset flag
  randomPlacementLocked = false; // Reset lock

  // Disable Start button to prevent re-init
  $("#startBtn").prop("disabled", true);
  // Enable Random Place button
  $("#randomPlaceBtn").prop("disabled", false).text("🎲 Place Your Ships");

  term.clear();
  term.writeln("✅ Game initialized!");
  term.writeln("🧭 Click '🎲 Place Your Ships' until you're satisfied.");
  term.writeln("💥 Then, start firing by clicking a coordinate button!");
  // Do NOT print grids or start turns here yet.
}

// Ensure playerTurn exists if it was removed by previous edits
function playerTurn() {
  if (!gameActive) return;
  term.writeln("🎯 Your turn! Click a coordinate button to fire.");
}

function handlePlayerMove(coord) {
  // Lock random placement and place AI ships on the very first player move
  if (!randomPlacementLocked) {
    if (!randomPlacementConfirmed) {
        term.writeln("⚠️ Please place your ships first using '🎲 Place Your Ships'!");
        // Re-enable the button that was just clicked, as the turn didn't proceed
        const btnId = `btn-${coord}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove("btn-secondary");
            btn.classList.add("btn-outline-info");
        }
        return; // Prevent firing before placement
    }
    $("#randomPlaceBtn").prop("disabled", true).text("🚫 Placement Locked");
    randomPlacementLocked = true; // Set the lock flag
    placeShips(aiGrid); // Place AI ships now that player has committed
    term.writeln("🤖 AI ships have been placed. The battle begins!");
    printGrid(term, aiGrid, "Enemy Grid", false); // Show the initial empty enemy grid
  }

  // Convert A-J to 0-9 for row, 1-10 to 0-9 for col
  const row = coord.charCodeAt(0) - 65;
  const col = parseInt(coord.slice(1)) - 1;

  // Validate coordinates (adjusting for 0-based index)
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    term.writeln("❌ Invalid coordinate selected somehow!");
    return;
  }

  // Check if already targeted
  if (["X", "O"].includes(aiGrid[row][col])) {
     term.writeln("⚠️ Already targeted! Choose another coordinate.");
     // Re-enable the button that was just clicked, as the turn didn't proceed
     const btnId = `btn-${coord}`;
     const btn = document.getElementById(btnId);
     if (btn) {
         btn.disabled = false;
         btn.classList.remove("btn-secondary");
         btn.classList.add("btn-outline-info");
     }
     return; // Don't proceed, wait for next valid click
  }

  if (aiGrid[row][col] === "🚢") {
    aiGrid[row][col] = "X"; // Use "X" for hit
    term.writeln("💥 HIT!");
  } else if (aiGrid[row][col] === "~") { // Check against "~" for miss
    aiGrid[row][col] = "O"; // Use "O" for miss
    term.writeln("🌊 MISS!");
  }
  // No else needed, already handled already targeted case

  logs.push(`Player fired at ${coord}: ${aiGrid[row][col] === 'X' ? 'Hit' : 'Miss'}`);

  // Display enemy grid after player's move (before AI turn)
  printGrid(term, aiGrid, "Enemy Grid", false);

  if (checkWin(aiGrid)) {
    term.writeln("🎉 YOU WIN! All enemy ships destroyed!");
    endGame();
    return;
  }

  // AI turn proceeds after a delay
  setTimeout(() => {
      if (gameActive) { // Check if game is still active before AI moves
          aiTurn();
      }
  }, 1000);

  return true; // Indicate a valid move was processed
}

// Ensure aiTurn exists if it was removed by previous edits
function aiTurn() {
  let row, col;
  do {
    row = Math.floor(Math.random() * GRID_SIZE);
    col = Math.floor(Math.random() * GRID_SIZE);
    // Check against "X" and "O" for already targeted cells
  } while (["X", "O"].includes(playerGrid[row][col]));

  // Convert 0-9 back to A-J and 1-10 for display
  const coord = `${String.fromCharCode(65 + row)}${col + 1}`;
  term.writeln(`🤖 AI attacks ${coord}...`);

  if (playerGrid[row][col] === "🚢") {
    playerGrid[row][col] = "X"; // Use "X" for hit
    term.writeln("💥 AI HIT your ship!");
  } else { // Assumes it must be "~" if not "X" or "O"
    playerGrid[row][col] = "O"; // Use "O" for miss
    term.writeln("🌊 AI missed.");
  }

  logs.push(`AI fired at ${coord}: ${playerGrid[row][col] === 'X' ? 'Hit' : 'Miss'}`);

  // Display both grids after AI's move (before player turn)
  printGrid(term, playerGrid, "Your Grid", true);
  // printGrid(term, aiGrid, "Enemy Grid", false); // Already shown after player move

  if (checkWin(playerGrid)) {
    term.writeln("💀 YOU LOSE! All your ships are gone.");
    endGame();
    return;
  }

  // Player turn proceeds after a delay
  setTimeout(() => {
      if (gameActive) { // Check if game is still active before prompting player
          playerTurn();
      }
  }, 1000);
}

function checkWin(grid) {
  return !grid.flat().includes("🚢");
}

function showLogs() {
  term.writeln("📜 Game Logs:");

  if (logs && logs.length > 0) {
    logs.forEach(log => term.writeln("- " + log));
  } else {
    term.writeln("⚠️ No current logs yet.");
  }

  const stored = localStorage.getItem("battleship_logs");
  // Only show stored logs if there are no current logs (to avoid duplication after game ends)
  if (stored && (!logs || logs.length === 0)) {
    term.writeln("📁 Previous Logs from Last Game:");
    JSON.parse(stored).forEach(log => term.writeln("- " + log));
  }

  term.writeln(""); // extra line for spacing
}

function endGame() {
  localStorage.setItem("battleship_logs", JSON.stringify(logs));
  gameActive = false;
}

function resetGame() {
  localStorage.removeItem("battleship_logs");
  // Re-enable all coordinate buttons
  const buttons = document.querySelectorAll('#coordGrid button');
  buttons.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("btn-secondary");
    btn.classList.add("btn-outline-info");
  });
  // Clear grids
  playerGrid = null;
  aiGrid = null;
  logs = [];
  gameActive = false; // Ensure game is inactive
  randomPlacementConfirmed = false; // Reset the flag
  randomPlacementLocked = false; // Reset the lock flag
  // Re-enable random placement button and reset text
  $("#randomPlaceBtn").prop("disabled", true).text("🎲 Place Your Ships"); // Disabled until Start
  // Re-enable Start button
  $("#startBtn").prop("disabled", false); // Enable Start button again
  intro();
}

function performRandomPlacement() {
  // Ensure game is active or at least initialized to allow placement
  if (!playerGrid) {
      term.writeln("⚠️ Please click 'Start Game' first to initialize.");
      return;
  }
  // Check if placement is locked
  if (randomPlacementLocked) {
      term.writeln("🚫 Placement is locked after the first shot!");
      return;
  }

  playerGrid = createGrid(); // Clear grid before placing
  placeShips(playerGrid);
  printGrid(term, playerGrid, "Your Grid", true); // Show the newly placed ships

  term.writeln("🎲 Ships placed randomly for you!");
  $("#randomPlaceBtn").prop("disabled", false).text("🎲 Place Again"); // Keep enabled, update text
  randomPlacementConfirmed = true; // Mark that placement has occurred at least once
}
