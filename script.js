const GRID_SIZE = 10;
const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 }
];

let term, playerGrid, aiGrid, logs, gameActive = false;

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
  $("#playerGridBtn").click(() => displayGrid(playerGrid, false));
  $("#enemyGridBtn").click(() => displayGrid(aiGrid, true));
  $("#logsBtn").click(() => showLogs());
  $("#restartBtn").click(() => resetGame());
});

function intro() {
  term.clear();
  term.writeln("🚢 Welcome to Battleship Terminal!");
  term.writeln("Click 'Start Game' to begin.\n");
}

function createGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill("⬜"));
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
    if ((dir === "H" && grid[row][col + i] !== "⬜") ||
        (dir === "V" && grid[row + i][col] !== "⬜"))
      return false;
  }
  return true;
}

function displayGrid(grid, hideShips = false) {
  if (!grid) return;
  term.writeln("   A B C D E F G H I J");
  grid.forEach((row, i) => {
    let line = (i + 1).toString().padStart(2, ' ') + " ";
    row.forEach(cell => {
      line += (hideShips && cell === "🚢" ? "⬜" : cell) + " ";
    });
    term.writeln(line);
  });
  term.writeln("");
}

function startGame() {
  playerGrid = createGrid();
  aiGrid = createGrid();
  logs = [];
  gameActive = true;

  placeShips(playerGrid);
  placeShips(aiGrid);

  term.clear();
  term.writeln("✅ Game started! Here’s your grid:\n");
  displayGrid(playerGrid, false);

  playerTurn();
}

function playerTurn() {
  if (!gameActive) return;
  term.writeln("🎯 Your turn! Click a coordinate button to fire.");
}

function handlePlayerMove(coord) {
  const col = coord.charCodeAt(0) - 65;
  const row = parseInt(coord.slice(1)) - 1;

  if (!coord.match(/^[A-J](10|[1-9])$/) || row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    term.writeln("❌ Invalid coordinate selected somehow!"); // Should not happen with buttons
    // playerTurn(); // Don't recall playerTurn, wait for next button click
    return;
  }

  if (aiGrid[row][col] === "🚢") {
    aiGrid[row][col] = "💥";
    term.writeln("💥 HIT!");
  } else if (["⬜"].includes(aiGrid[row][col])) {
    aiGrid[row][col] = "🌊";
    term.writeln("🌊 MISS!");
  } else {
    term.writeln("⚠️ Already targeted! Try again.");
    // playerTurn(); // Don't recall playerTurn, wait for next button click
    return;
  }

  logs.push(`Player fired at ${coord}`);
  if (checkWin(aiGrid)) {
    term.writeln("🎉 YOU WIN! All enemy ships destroyed!");
    endGame();
    return;
  }

  setTimeout(() => aiTurn(), 1000);
}

function aiTurn() {
  let row, col;
  do {
    row = Math.floor(Math.random() * GRID_SIZE);
    col = Math.floor(Math.random() * GRID_SIZE);
  } while (["💥", "🌊"].includes(playerGrid[row][col]));

  const coord = `${String.fromCharCode(65 + col)}${row + 1}`;
  term.writeln(`🤖 AI attacks ${coord}...`);

  if (playerGrid[row][col] === "🚢") {
    playerGrid[row][col] = "💥";
    term.writeln("💥 AI HIT your ship!");
  } else {
    playerGrid[row][col] = "🌊";
    term.writeln("🌊 AI missed.");
  }

  logs.push(`AI fired at ${coord}`);
  if (checkWin(playerGrid)) {
    term.writeln("💀 YOU LOSE! All your ships are gone.");
    endGame();
    return;
  }

  setTimeout(() => playerTurn(), 1000);
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
  intro();
}
