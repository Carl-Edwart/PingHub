import { create } from 'zustand';
import { Tournament, BracketType, Bracket, AllVsAllTable, TournamentStatus } from '@/types/tournament';
import { Player } from '@/types/match';

interface TorneioState {
  // Estado
  currentTournament: Tournament | null;
  participants: Player[];
  bracket: Bracket | AllVsAllTable | null;
  status: TournamentStatus;

  // Actions
  createTournament: (name: string, date: string, bracketType: BracketType, matchConfig: any) => void;
  addParticipant: (player: Player) => void;
  removeParticipant: (playerName: string) => void;
  generateBracket: (bracketType: BracketType) => void;
  updateMatchResult: (matchId: string, winner: Player, score: string) => void;
  updateTournamentStatus: (status: TournamentStatus) => void;
  getFinalStandings: () => Array<{ player: Player; points: number; position: number }>;
  reset: () => void;
  getParticipantCount: () => number;
}

export const useTorneioStore = create<TorneioState>((set, get) => ({
  currentTournament: null,
  participants: [],
  bracket: null,
  status: 'planning',

  createTournament: (name, date, bracketType, matchConfig) => {
    const tournament: Tournament = {
      id: `tournament_${Date.now()}`,
      name,
      date,
      bracketType,
      participants: [],
      matchConfig,
      status: 'planning',
      createdAt: new Date().toISOString(),
    };

    set({
      currentTournament: tournament,
      participants: [],
      bracket: null,
      status: 'planning',
    });
  },

  addParticipant: (player) => {
    const { participants, currentTournament } = get();

    if (!participants.find((p) => p.name === player.name)) {
      const newParticipants = [...participants, player];
      set({ participants: newParticipants });

      if (currentTournament) {
        currentTournament.participants = newParticipants;
        set({ currentTournament });
      }
    }
  },

  removeParticipant: (playerName) => {
    const { participants, currentTournament } = get();
    const newParticipants = participants.filter((p) => p.name !== playerName);

    set({ participants: newParticipants });

    if (currentTournament) {
      currentTournament.participants = newParticipants;
      set({ currentTournament });
    }
  },

  generateBracket: (bracketType) => {
    const { participants, currentTournament } = get();

    if (participants.length < 2) {
      console.warn('Need at least 2 participants to generate bracket');
      return;
    }

    // Importar BracketService aqui para evitar circular dependency
    const { BracketService } = require('@/services/bracketService');
    const bracket = BracketService.generateBracket(participants, bracketType);

    set({
      bracket,
      status: 'active',
    });

    if (currentTournament) {
      currentTournament.bracket = bracketType === BracketType.SINGLE_ELIMINATION ? (bracket as Bracket) : undefined;
      currentTournament.table = bracketType === BracketType.ALL_VS_ALL ? (bracket as AllVsAllTable) : undefined;
      currentTournament.status = 'active';
      set({ currentTournament });
    }
  },

  updateMatchResult: (matchId, winner, score) => {
    const { bracket, currentTournament } = get();

    if (!bracket || !currentTournament) return;

    if ('rounds' in bracket) {
      // Bracket eliminatória
      const { BracketService } = require('@/services/bracketService');
      const updatedBracket = BracketService.advanceBracket(bracket as Bracket, matchId, winner, score);
      set({ bracket: updatedBracket });
      currentTournament.bracket = updatedBracket;
    } else {
      // Todos contra todos
      const { BracketService } = require('@/services/bracketService');
      const result = winner.name === matchId.split('_')[0] ? 'W' : 'L';
      const updatedTable = BracketService.updateAllVsAllResult(bracket as AllVsAllTable, winner.name, '', result);
      set({ bracket: updatedTable });
      currentTournament.table = updatedTable;
    }

    set({ currentTournament });
  },

  updateTournamentStatus: (status) => {
    const { currentTournament } = get();

    if (currentTournament) {
      currentTournament.status = status;
      set({ currentTournament, status });
    }
  },

  getFinalStandings: () => {
    const { bracket } = get();

    if (!bracket) return [];

    if ('rounds' in bracket) {
      // Eliminatória: ordenar por rodada alcançada
      const standings = bracket.rounds[bracket.rounds.length - 1]?.matches
        .filter((m) => m.winner)
        .map((m) => ({
          player: m.winner!,
          points: 0,
          position: 1,
        })) || [];

      return standings;
    } else {
      // Todos contra todos
      const { BracketService } = require('@/services/bracketService');
      return BracketService.calculateAllVsAllStandings(bracket as AllVsAllTable);
    }
  },

  reset: () =>
    set({
      currentTournament: null,
      participants: [],
      bracket: null,
      status: 'planning',
    }),

  getParticipantCount: () => get().participants.length,
}));
