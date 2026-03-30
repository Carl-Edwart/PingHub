import { create } from 'zustand';
import { RankingEntry, RankingUpdate } from '@/types/ranking';
import { EloService } from '@/services/eloService';

interface RankingState {
  // Estado
  rankings: RankingEntry[];
  loading: boolean;
  lastUpdated: string | null;

  // Actions
  setRankings: (rankings: RankingEntry[]) => void;
  updateElo: (athleteId: string, newElo: number, deltaElo: number) => void;
  getRankingByPosition: (position: number) => RankingEntry | undefined;
  getAthleteRanking: (athleteId: string) => RankingEntry | undefined;
  topThree: () => RankingEntry[];
  setLoading: (loading: boolean) => void;
  refreshRankings: () => Promise<void>;
  calculateEloChange: (
    athleteId1: string,
    athleteId2: string,
    winner: 1 | 2,
    isTournament?: boolean
  ) => { update1: RankingUpdate; update2: RankingUpdate } | null;
}

export const useRankingStore = create<RankingState>((set, get) => ({
  rankings: [],
  loading: false,
  lastUpdated: null,

  setRankings: (rankings) => {
    const sorted = rankings.sort((a, b) => b.elo - a.elo);
    const withPositions = sorted.map((r, index) => ({
      ...r,
      position: index + 1,
    }));

    set({
      rankings: withPositions,
      lastUpdated: new Date().toISOString(),
      loading: false,
    });
  },

  updateElo: (athleteId, newElo, deltaElo) => {
    const { rankings } = get();
    const index = rankings.findIndex((r) => r.athleteId === athleteId);

    if (index === -1) {
      // Adicionar novo atleta se não existe
      const newEntry: RankingEntry = {
        athleteId,
        name: '',
        elo: newElo,
        wins: 0,
        losses: 0,
        position: rankings.length + 1,
        eloChange: deltaElo,
        lastUpdated: new Date().toISOString(),
      };

      const updated = [...rankings, newEntry].sort((a, b) => b.elo - a.elo);
      const withPositions = updated.map((r, idx) => ({ ...r, position: idx + 1 }));

      set({
        rankings: withPositions,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // Atualizar existente
      const updated = [...rankings];
      updated[index] = {
        ...updated[index],
        elo: newElo,
        eloChange: deltaElo,
        lastUpdated: new Date().toISOString(),
      };

      const sorted = updated.sort((a, b) => b.elo - a.elo);
      const withPositions = sorted.map((r, idx) => ({ ...r, position: idx + 1 }));

      set({
        rankings: withPositions,
        lastUpdated: new Date().toISOString(),
      });
    }
  },

  getRankingByPosition: (position) => get().rankings.find((r) => r.position === position),

  getAthleteRanking: (athleteId) => get().rankings.find((r) => r.athleteId === athleteId),

  topThree: () => get().rankings.slice(0, 3),

  setLoading: (loading) => set({ loading }),

  refreshRankings: async () => {
    // Este método será chamado após sincronizar com banco de dados
    set({ loading: true });
    // Lógica de atualização será feita no useDatabase hook
  },

  calculateEloChange: (athleteId1, athleteId2, winner, isTournament = false) => {
    const { rankings } = get();
    const r1 = rankings.find((r) => r.athleteId === athleteId1);
    const r2 = rankings.find((r) => r.athleteId === athleteId2);

    if (!r1 || !r2) return null;

    const result = winner === 1 ? 1 : 0;
    const eloResult = EloService.calculateElo(r1.elo, r2.elo, result, isTournament);

    return {
      update1: {
        athleteId: athleteId1,
        eloChange: eloResult.deltaA,
        newElo: eloResult.newRatingA,
        timestamp: new Date().toISOString(),
      },
      update2: {
        athleteId: athleteId2,
        eloChange: eloResult.deltaB,
        newElo: eloResult.newRatingB,
        timestamp: new Date().toISOString(),
      },
    };
  },
}));
