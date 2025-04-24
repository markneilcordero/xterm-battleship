// Terminal instance
let terminal;
let termBuffer = ""; // stores user-typed input

// Initialize terminal
function initTerminal() {
  terminal = new Terminal({
    cursorBlink: true,
    theme: {
      background: '#000000',
      foreground: '#00ffcc'
    }
  });

  terminal.open(document.getElementById("terminal-container"));
  terminal.focus();
  terminal.writeln("🚢 Welcome to Battleship Terminal Game!");
  terminal.writeln("Type `start` to begin or `help` for commands.");
  prompt();
}

// Display prompt
function prompt() {
  terminal.write('\r\n> ');
  termBuffer = '';
}

// Handle user keystrokes
function handleTerminalInput() {
  terminal.onKey(e => {
    const char = e.key;

    // ENTER
    if (char === '\r') {
      const command = termBuffer.trim();
      terminal.write('\r\n');
      onCommandEnter(command);
      prompt();
    }

    // BACKSPACE
    else if (e.domEvent.key === 'Backspace') {
      if (termBuffer.length > 0) {
        termBuffer = termBuffer.slice(0, -1);
        terminal.write('\b \b');
      }
    }

    // VALID CHAR
    else if (char >= ' ') {
      termBuffer += char;
      terminal.write(char);
    }
  });
}

// Output text to terminal
function writeToTerminal(text) {
  terminal.writeln(text);
}

// Command router
function onCommandEnter(command) {
  const cmd = command.toLowerCase();

  if (cmd === 'help') {
    writeToTerminal("📝 Available commands:");
    writeToTerminal("- start: Begin the game");
    writeToTerminal("- place A5 HORIZONTAL: Place ships");
    writeToTerminal("- fire B3: Attack enemy");
    writeToTerminal("- show player: Show your board");
    writeToTerminal("- show ai: Show AI board (debug only)");
    writeToTerminal("- stats: Show win/loss record");
    writeToTerminal("- reset: Restart game");
    writeToTerminal("- quit: Exit game");
  }

  else if (cmd.startsWith('place')) {
    placeShipManually(command);
  }

  else if (cmd.startsWith('fire')) {
    if (isGameActive && isPlayerTurn) {
      playerFire(command);
    } else {
      writeToTerminal("⛔ Not your turn or game hasn't started.");
    }
  }

  else if (cmd === 'start') {
    startGame();
  }

  else if (cmd === 'stats') {
    showStats();
  }

  else if (cmd === 'show player') {
    displayGrid(playerGrid);
  }

  else if (cmd === 'show ai') {
    displayGrid(aiGrid, true); // hide = false for full reveal, set to true to hide ships
  }

  else if (cmd === 'reset') {
    setupGame();
  }

  else if (cmd === 'quit') {
    terminal.clear();
    writeToTerminal("👋 Game exited. Reload the page to start again.");
    isGameActive = false;
  }

  else {
    writeToTerminal(`❓ Unknown command: ${command}`);
  }
}

// Start terminal on button click
document.getElementById("start-btn").addEventListener("click", () => {
  $("#start-btn").hide(); // hide start button
  initTerminal();
  handleTerminalInput();
});
