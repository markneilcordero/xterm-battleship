const GRID_SIZE = 10;
const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 }
];

let term, playerGrid, aiGrid, logs, gameActive = false;
let randomPlacementConfirmed = false;

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
      btn.className = "btn btn-sm btn-outline-info";
      btn.innerText = coord;
      btn.dataset.coord = coord;
      btn.id = `btn-${coord}`; // Add an ID for disabling later

      btn.addEventListener("click", () => {
        if (!gameActive) return; // Only allow clicks if game is active
        term.writeln(`> Player fires at ${coord}`);
        handlePlayerMove(coord);
        // Disable the button after clicking
        btn.disabled = true;
        btn.classList.remove("btn-outline-info");
        btn.classList.add("btn-secondary");
      });

      coordGrid.appendChild(btn);
    }
  });

  $("#startBtn").click(() => startGame());
  $("#logsBtn").click(() => showLogs());
  $("#restartBtn").click(() => resetGame());

  // Random Placement Handler
  $("#randomPlaceBtn").click(() => {
    if (!gameActive) {
      term.writeln("⚠️ Start the game first!");
      return;
    }

    if (randomPlacementConfirmed) {
      performRandomPlacement();
    } else {
      const modal = new bootstrap.Modal(document.getElementById("randomPlaceModal"));
      modal.show();
    }
  });

  $("#confirmRandomPlacement").click(() => {
    const modalElement = bootstrap.Modal.getInstance(document.getElementById("randomPlaceModal"));
    modalElement.hide();

    performRandomPlacement();
    randomPlacementConfirmed = true;
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
    let placed = false;
    while (!placed) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      const dir = Math.random() > 0.5 ? "H" : "V";

      if (canPlaceShip(grid, row, col, ship.size, dir)) {
        for (let i = 0; i < ship.size; i++) {
          // Keep using "🚢" for ships, printGrid handles display logic
          if (dir === "H") grid[row][col + i] = "🚢";
          else grid[row + i][col] = "🚢";
        }
        placed = true;
      }
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
  aiGrid = createGrid();
  logs = [];
  gameActive = true;

  placeShips(playerGrid);
  placeShips(aiGrid);

  term.clear();
  term.writeln("✅ Game started!");

  // Use printGrid to show the initial player grid
  printGrid(term, playerGrid, "Your Grid", true);
  // Optionally show the initial enemy grid (hidden)
  // printGrid(term, aiGrid, "Enemy Grid", false);

  playerTurn();
}

function playerTurn() {
  if (!gameActive) return;
  term.writeln("🎯 Your turn! Click a coordinate button to fire.");
}

function handlePlayerMove(coord) {
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
}

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
  const stored = localStorage.getItem("battleship_logs");
  if (stored) {
    term.writeln("📜 Previous Logs:");
    JSON.parse(stored).forEach(log => term.writeln("- " + log));
  } else {
    term.writeln("⚠️ No logs found.");
  }
  term.writeln("");
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
  // Re-enable random placement button
  $("#randomPlaceBtn").prop("disabled", false).text("🎲 Random Place");
  intro();
}

function performRandomPlacement() {
  playerGrid = createGrid(); // Clear grid before placing
  placeShips(playerGrid);
  term.writeln("🎲 Ships placed randomly for you!");
  printGrid(term, playerGrid, "Your Grid", true);

  // Disable the random placement button
  $("#randomPlaceBtn").prop("disabled", true).text("✅ Ships Placed");

  // Optionally disable other placement UIs if you had any manual UI
  // $("#manualPlaceSection").addClass("d-none");
}
