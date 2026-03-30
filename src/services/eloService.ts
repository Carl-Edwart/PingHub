import { ELO_K_MATCH, ELO_K_TOURNAMENT } from '@/constants/matchConfig';
import { EloResult } from '@/types/ranking';

/**
 * Calcula novo rating ELO após uma partida
 * Usando algoritmo ELO padrão
 */
export class EloService {
  /**
   * Calcula variação de rating ELO
   * @param ratingA Rating do jogador A
   * @param ratingB Rating do jogador B
   * @param result 1 = A venceu, 0 = B venceu, 0.5 = empate
   * @param isTournament true = usa K=16, false = usa K=32
   */
  static calculateElo(ratingA: number, ratingB: number, result: 0 | 1 | 0.5, isTournament: boolean = false): EloResult {
    const K = isTournament ? ELO_K_TOURNAMENT : ELO_K_MATCH;

    // Expected score para A
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 - expectedA;

    // Novo rating
    const newRatingA = Math.round(ratingA + K * (result - expectedA));
    const newRatingB = Math.round(ratingB + K * ((1 - result) - expectedB));

    return {
      newRatingA,
      newRatingB,
      deltaA: newRatingA - ratingA,
      deltaB: newRatingB - ratingB,
    };
  }

  /**
   * Calcula ELO para múltiplos jogadores após torneio
   * Cada jogador recebe bônus baseado na sua posição
   */
  static calculateTournamentElo(
    ratings: { [athleteId: string]: number },
    standings: Array<{ athleteId: string; position: number }>,
    isTournament: boolean = true
  ): { [athleteId: string]: EloResult } {
    const results: { [athleteId: string]: EloResult } = {};

    standings.forEach((entry) => {
      const athleteId = entry.athleteId;
      const oldRating = ratings[athleteId] || 1000;
      const K = isTournament ? ELO_K_TOURNAMENT : ELO_K_MATCH;

      // Bônus por posição (1º: 1.0, 2º: 0.5, 3º: 0.33, outros: 0.1)
      let bonus = 0.1;
      if (entry.position === 1) bonus = 1.0;
      else if (entry.position === 2) bonus = 0.5;
      else if (entry.position === 3) bonus = 0.33;

      const newRating = Math.round(oldRating + K * bonus);
      const delta = newRating - oldRating;

      results[athleteId] = {
        newRatingA: newRating,
        newRatingB: oldRating,
        deltaA: delta,
        deltaB: 0,
      };
    });

    return results;
  }
}
