const STORAGE_KEY = "battleship_stats";

function getStats() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return { wins: 0, losses: 0, games: 0 };
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function recordWin() {
  const stats = getStats();
  stats.wins++;
  stats.games++;
  saveStats(stats);
}

function recordLoss() {
  const stats = getStats();
  stats.losses++;
  stats.games++;
  saveStats(stats);
}

function showStats() {
  const stats = getStats();
  writeToTerminal("📊 Game Stats:");
  writeToTerminal(`🎮 Games Played: ${stats.games}`);
  writeToTerminal(`✅ Wins: ${stats.wins}`);
  writeToTerminal(`❌ Losses: ${stats.losses}`);
}
