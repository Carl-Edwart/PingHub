import { Player } from '@/types/match';
import { Bracket, AllVsAllTable, BracketType, TournamentMatch } from '@/types/tournament';

/**
 * Serviço de geração e gerenciamento de chaveamentos
 */
export class BracketService {
  /**
   * Gera chaveamento com sorteio aleatório
   * Suporta byes para números ímpares
   */
  static generateBracket(players: Player[], type: BracketType): Bracket | AllVsAllTable {
    if (type === BracketType.SINGLE_ELIMINATION) {
      return this.generateSingleElimination(players);
    } else {
      return this.generateAllVsAll(players);
    }
  }

  private static generateSingleElimination(players: Player[]): Bracket {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const bracket: Bracket = { rounds: [] };

    // Primeira rodada com byes se necessário
    const firstRoundMatches: TournamentMatch[] = [];

    if (shuffled.length % 2 !== 0) {
      // Se ímpar, um bye automático
      const byePlayer = shuffled[shuffled.length - 1];
      firstRoundMatches.push({
        id: `bye-${byePlayer.name}`,
        player1: byePlayer,
        player2: byePlayer,
        result: { winner: byePlayer, score: 'BYE' },
        status: 'finished',
      });

      // Parear resto
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        firstRoundMatches.push({
          id: `match-0-${i}`,
          player1: shuffled[i],
          player2: shuffled[i + 1],
          status: 'pending',
        });
      }
    } else {
      // Par: parear todos
      for (let i = 0; i < shuffled.length; i += 2) {
        firstRoundMatches.push({
          id: `match-0-${i}`,
          player1: shuffled[i],
          player2: shuffled[i + 1],
          status: 'pending',
        });
      }
    }

    bracket.rounds.push({
      roundNumber: 1,
      matches: firstRoundMatches,
    });

    return bracket;
  }

  private static generateAllVsAll(players: Player[]): AllVsAllTable {
    const table: AllVsAllTable = {
      participants: players,
      results: {},
    };

    players.forEach((p1) => {
      if (!table.results[p1.name]) {
        table.results[p1.name] = {};
      }

      players.forEach((p2) => {
        if (p1.name !== p2.name) {
          table.results[p1.name][p2.name] = '-'; // Pendente
        }
      });
    });

    return table;
  }

  /**
   * Avança para a próxima rodada com resultado da partida
   */
  static advanceBracket(bracket: Bracket, matchId: string, winner: Player, score: string): Bracket {
    const newBracket: Bracket = JSON.parse(JSON.stringify(bracket));

    // Encontrar match e marcar resultado
    let currentRound = -1;
    let currentMatchIndex = -1;

    outerLoop: for (let r = 0; r < newBracket.rounds.length; r++) {
      for (let m = 0; m < newBracket.rounds[r].matches.length; m++) {
        if (newBracket.rounds[r].matches[m].id === matchId) {
          currentRound = r;
          currentMatchIndex = m;
          break outerLoop;
        }
      }
    }

    if (currentRound !== -1 && currentMatchIndex !== -1) {
      newBracket.rounds[currentRound].matches[currentMatchIndex].result = { winner, score };
      newBracket.rounds[currentRound].matches[currentMatchIndex].status = 'finished';

      // Criar próxima rodada se necessário
      const currentRoundMatches = newBracket.rounds[currentRound].matches;
      const allFinished = currentRoundMatches.every((m) => m.status === 'finished');

      if (allFinished) {
        const winners = currentRoundMatches
          .map((m) => m.result?.winner)
          .filter((w) => w !== undefined) as Player[];

        if (winners.length > 1) {
          const nextRoundMatches: TournamentMatch[] = [];

          // Parear vencedores
          for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
              nextRoundMatches.push({
                id: `match-${currentRound + 1}-${i}`,
                player1: winners[i],
                player2: winners[i + 1],
                status: 'pending',
              });
            } else {
              // Último com bye
              nextRoundMatches.push({
                id: `bye-${winners[i].name}`,
                player1: winners[i],
                player2: winners[i],
                result: { winner: winners[i], score: 'BYE' },
                status: 'finished',
              });
            }
          }

          newBracket.rounds.push({
            roundNumber: currentRound + 2,
            matches: nextRoundMatches,
          });
        }
      }
    }

    return newBracket;
  }

  /**
   * Atualiza resultado na matrix todos-contra-todos
   */
  static updateAllVsAllResult(table: AllVsAllTable, player1Name: string, player2Name: string, result: string): AllVsAllTable {
    const newTable = JSON.parse(JSON.stringify(table));

    if (newTable.results[player1Name] && newTable.results[player1Name][player2Name] !== undefined) {
      newTable.results[player1Name][player2Name] = result;
    }

    return newTable;
  }

  /**
   * Calcula classificação final de todos-contra-todos
   */
  static calculateAllVsAllStandings(table: AllVsAllTable): Array<{ player: Player; points: number; position: number }> {
    const points: { [playerName: string]: number } = {};

    table.participants.forEach((p) => {
      points[p.name] = 0;
    });

    // Somar pontos: vitória = 3, empate = 1
    Object.entries(table.results).forEach(([player1, results]) => {
      Object.entries(results).forEach(([player2, result]) => {
        if (result === 'W') points[player1] += 3;
        else if (result === 'D') points[player1] += 1;
      });
    });

    const standings = table.participants
      .map((p) => ({
        player: p,
        points: points[p.name],
      }))
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({
        ...entry,
        position: index + 1,
      }));

    return standings;
  }
}
