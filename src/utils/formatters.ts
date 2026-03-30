/**
 * Formata duração em milissegundos para MM:SS ou H:MM:SS
 * Ex: 65000 → "01:05", 3661000 → "1:01:01"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formata variação de ELO com sinal
 * Ex: 12 → "+12", -8 → "-8", 0 → "0"
 */
export function formatElo(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

/**
 * Formata data ISO para formato legível (DD/MM/YYYY ou DD de MMM)
 * Ex: "2026-03-29" → "29/03/2026" ou "29 de mar"
 */
export function formatDate(isoString: string, short: boolean = false): string {
  try {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    if (short) {
      const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return `${day} de ${monthNames[date.getMonth()]}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

/**
 * Formata placar de sets
 * Ex: [{player1: 11, player2: 5}, {...}] → "2-0" ou "1-1"
 */
export function formatScore(sets: Array<{ player1Score: number; player2Score: number }>): string {
  let p1Wins = 0;
  let p2Wins = 0;

  sets.forEach((set) => {
    if (set.player1Score > set.player2Score) p1Wins++;
    else if (set.player2Score > set.player1Score) p2Wins++;
  });

  return `${p1Wins}-${p2Wins}`;
}

/**
 * Formata nome do atleta (capitaliza primeira letra)
 * Ex: "joao silva" → "Joao silva"
 */
export function formatPlayerName(name: string): string {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Formata hora com contexto (cronômetro)
 * Ex: 300 segundos → "5:00", com decimais se tempo ativo
 */
export function formatTime(seconds: number, showDecimals: boolean = false): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const baseTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (showDecimals) {
    const deciseconds = Math.floor((seconds * 10) % 10);
    return `${baseTime}.${deciseconds}`;
  }
  return baseTime;
}
