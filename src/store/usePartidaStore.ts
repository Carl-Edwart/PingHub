import { create } from 'zustand';
import { Match, MatchConfig, Player, SetResult, MatchMode, Modality } from '@/types/match';

interface PartidaState {
  // Estado
  currentMatch: Partial<Match> | null;
  player1Score: number;
  player2Score: number;
  currentSet: number;
  setsWon: { player1: number; player2: number };
  pointHistory: Array<{ player: 1 | 2; score: number }>;
  timerActive: boolean;
  config: MatchConfig | null;

  // Actions
  initMatch: (player1: Player, player2: Player, config: MatchConfig) => void;
  addPoint: (player: 1 | 2) => void;
  undo: () => void;
  finishSet: () => void;
  finishMatch: () => void;
  setTimerActive: (active: boolean) => void;
  reset: () => void;
  getCurrentScore: () => { player1: number; player2: number };
  isMatchOver: () => boolean;
  getWinner: () => 1 | 2 | null;
}

const initialState = {
  currentMatch: null,
  player1Score: 0,
  player2Score: 0,
  currentSet: 1,
  setsWon: { player1: 0, player2: 0 },
  pointHistory: [],
  timerActive: false,
  config: null,
};

export const usePartidaStore = create<PartidaState>((set, get) => ({
  ...initialState,

  initMatch: (player1, player2, config) =>
    set({
      currentMatch: { player1, player2, setsConfig: config, sets: [] },
      config,
      player1Score: 0,
      player2Score: 0,
      currentSet: 1,
      setsWon: { player1: 0, player2: 0 },
      pointHistory: [],
    }),

  addPoint: (player) => {
    const { player1Score, player2Score, config, setsWon } = get();
    const pointsPerSet = config?.pointsPerSet || 11;

    if (player === 1) {
      set({ player1Score: player1Score + 1, pointHistory: [...get().pointHistory, { player: 1, score: player1Score + 1 }] });
    } else {
      set({ player2Score: player2Score + 1, pointHistory: [...get().pointHistory, { player: 2, score: player2Score + 1 }] });
    }

    // Verificar vitória do set (diferença de 2 pontos)
    const newP1 = player === 1 ? player1Score + 1 : player1Score;
    const newP2 = player === 2 ? player2Score + 1 : player2Score;

    if ((newP1 >= pointsPerSet || newP2 >= pointsPerSet) && Math.abs(newP1 - newP2) >= 2) {
      get().finishSet();
    }
  },

  undo: () => {
    const { pointHistory } = get();
    if (pointHistory.length === 0) return;

    const lastPoint = pointHistory[pointHistory.length - 1];
    const newHistory = pointHistory.slice(0, -1);

    if (lastPoint.player === 1) {
      set({ player1Score: lastPoint.score - 1, pointHistory: newHistory });
    } else {
      set({ player2Score: lastPoint.score - 1, pointHistory: newHistory });
    }
  },

  finishSet: () => {
    const { player1Score, player2Score, setsWon, currentSet, config } = get();
    const numberOfSets = config?.numberOfSets || 3;

    if (player1Score > player2Score) {
      setsWon.player1++;
    } else {
      setsWon.player2++;
    }

    set({
      setsWon,
      currentSet: currentSet + 1,
      player1Score: 0,
      player2Score: 0,
      pointHistory: [],
    });

    // Verificar se partida acabou
    get().isMatchOver();
  },

  finishMatch: () => {
    const { setsWon } = get();
    const sets: SetResult[] = [];

    set({
      currentMatch: { ...get().currentMatch, sets } as any,
      pointHistory: [],
    });
  },

  setTimerActive: (active) => set({ timerActive: active }),

  reset: () => set(initialState),

  getCurrentScore: () => ({
    player1: get().player1Score,
    player2: get().player2Score,
  }),

  isMatchOver: () => {
    const { setsWon, config } = get();
    const numberOfSets = config?.numberOfSets || 3;
    const setsToWin = Math.ceil(numberOfSets / 2);

    return setsWon.player1 >= setsToWin || setsWon.player2 >= setsToWin;
  },

  getWinner: () => {
    const { setsWon, config } = get();
    const numberOfSets = config?.numberOfSets || 3;
    const setsToWin = Math.ceil(numberOfSets / 2);

    if (setsWon.player1 >= setsToWin) return 1;
    if (setsWon.player2 >= setsToWin) return 2;
    return null;
  },
}));
