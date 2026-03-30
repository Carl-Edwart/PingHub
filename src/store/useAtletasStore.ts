import { create } from 'zustand';
import { Athlete, AthleteLevel, PlayStyle } from '@/types/athlete';

interface AtletasState {
  // Estado
  atletas: Athlete[];
  loading: boolean;
  error: string | null;

  // Actions
  setAtletas: (atletas: Athlete[]) => void;
  addAthlete: (athlete: Athlete) => void;
  updateAthlete: (id: string, updates: Partial<Athlete>) => void;
  deleteAthlete: (id: string) => void;
  getAthleteById: (id: string) => Athlete | undefined;
  searchAtletas: (query: string) => Athlete[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAtletasStore = create<AtletasState>((set, get) => ({
  atletas: [],
  loading: false,
  error: null,

  setAtletas: (atletas) => set({ atletas, loading: false }),

  addAthlete: (athlete) => {
    const { atletas } = get();

    // Verificar se já existe
    if (atletas.find((a) => a.id === athlete.id)) {
      set({ error: 'Atleta já existe' });
      return;
    }

    set({ atletas: [...atletas, athlete], error: null });
  },

  updateAthlete: (id, updates) => {
    const { atletas } = get();
    const index = atletas.findIndex((a) => a.id === id);

    if (index === -1) {
      set({ error: 'Atleta não encontrado' });
      return;
    }

    const updated = [...atletas];
    updated[index] = { ...updated[index], ...updates };
    set({ atletas: updated, error: null });
  },

  deleteAthlete: (id) => {
    const { atletas } = get();
    const filtered = atletas.filter((a) => a.id !== id);

    if (filtered.length === atletas.length) {
      set({ error: 'Atleta não encontrado' });
      return;
    }

    set({ atletas: filtered, error: null });
  },

  getAthleteById: (id) => get().atletas.find((a) => a.id === id),

  searchAtletas: (query) => {
    const { atletas } = get();
    const q = query.toLowerCase();

    return atletas.filter((a) => a.name.toLowerCase().includes(q) || a.nickname?.toLowerCase().includes(q));
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),
}));
