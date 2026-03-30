import { Match } from '@/types/match';
import { Tournament } from '@/types/tournament';
import { formatDate, formatScore } from '@/utils/formatters';

/**
 * Serviço de exportação de dados
 */
export class ExportService {
  /**
   * Exporta histórico de partidas para JSON
   */
  static exportMatchesAsJSON(matches: Match[]): string {
    const data = matches.map((match) => ({
      id: match.id,
      date: match.createdAt,
      player1: match.player1.name,
      player2: match.player2.name,
      score: formatScore(match.sets),
      duration: match.duration,
      mode: match.mode,
    }));

    return JSON.stringify(data, null, 2);
  }

  /**
   * Exporta histórico de partidas para CSV
   */
  static exportMatchesAsCSV(matches: Match[]): string {
    const headers = ['Data', 'Jogador 1', 'Jogador 2', 'Placar', 'Duração (s)', 'Modo'];
    const rows = matches.map((match) => [
      formatDate(match.createdAt),
      match.player1.name,
      match.player2.name,
      formatScore(match.sets),
      match.duration,
      match.mode,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  }

  /**
   * Exporta classificação de torneio para JSON
   */
  static exportTournamentAsJSON(tournament: Tournament, standings: any[]): string {
    const data = {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        type: tournament.bracketType,
        status: tournament.status,
      },
      standings: standings.map((entry, index) => ({
        position: index + 1,
        player: entry.player.name,
        points: entry.points,
        eloBonus: entry.eloBonus,
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Exporta classificação de torneio para CSV
   */
  static exportTournamentAsCSV(tournament: Tournament, standings: any[]): string {
    const headers = ['Posição', 'Atleta', 'Pontos', 'Bônus ELO'];
    const rows = standings.map((entry, index) => [
      index + 1,
      entry.player.name,
      entry.points,
      entry.eloBonus,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  }

  /**
   * Formata dados para compartilhamento
   */
  static formatShareMessage(type: 'match' | 'tournament', data: any): string {
    if (type === 'match') {
      return `🏓 Resultado da partida\n\n${data.player1} vs ${data.player2}\nPlacar: ${data.score}\nData: ${formatDate(data.date)}`;
    } else {
      return `🏆 ${data.name}\n\n1º lugar: ${data.standings[0]?.player}\n2º lugar: ${data.standings[1]?.player}\n3º lugar: ${data.standings[2]?.player}`;
    }
  }

  /**
   * Cria blob para download
   */
  static createBlob(content: string, type: 'json' | 'csv'): Blob {
    const mimeType = type === 'json' ? 'application/json' : 'text/csv';
    return new Blob([content], { type: mimeType });
  }

  /**
   * Gera nome de arquivo com timestamp
   */
  static generateFileName(prefix: string, type: 'json' | 'csv'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}_${timestamp}.${type}`;
  }
}
