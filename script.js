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

    // Start hunt mode from this hit
    lastHit = { row, col };
    enqueueHuntTargets(row, col);
  } else {
    term.writeln(`🤖 AI fires at ${coordStr} — 🌊 Miss.`);
    playerGrid[row][col] = "O"; // mark as miss
  }
}


document.addEventListener("DOMContentLoaded", () => {
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

    // Other commands
    switch (cmd) {
      case "start":
        term.writeln("🚀 Starting the game...");
        // TODO: Add game initialization logic, including placeAIShips()
        break;
      case "help":
        term.writeln("Available commands:");
        term.writeln("- place [ShipName] [Coord] [H/V]");
        term.writeln("- fire [Coord]");
        term.writeln("- stats");
        break;
      case "stats":
        term.writeln("📊 Games Played: 0 | Wins: 0 | Losses: 0");
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
