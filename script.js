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
    switch (cmd) {
      case "start":
        term.writeln("🚀 Starting the game...");
        break;
      case "help":
        term.writeln("Available commands:");
        term.writeln("- place [ship] [coord] [H/V]");
        term.writeln("- fire [coord]");
        term.writeln("- stats");
        break;
      case "stats":
        term.writeln("📊 Games Played: 0 | Wins: 0 | Losses: 0");
        break;
      default:
        term.writeln("❌ Unknown command. Type 'help' to see available commands.");
    }
  }
  