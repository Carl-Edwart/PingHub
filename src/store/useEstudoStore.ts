import { create } from 'zustand';
import { TechniqueContent } from '@/types/content';

interface EstudoState {
  // Estado
  techniques: TechniqueContent[];
  viewedContent: Set<string>;
  loading: boolean;
  error: string | null;

  // Actions
  setTechniques: (techniques: TechniqueContent[]) => void;
  markAsViewed: (id: string) => void;
  getTechniquesByLevel: (level: string) => TechniqueContent[];
  getTechniquesByCategory: (category: string) => TechniqueContent[];
  searchTechniques: (query: string) => TechniqueContent[];
  getCategories: () => string[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEstudoStore = create<EstudoState>((set, get) => ({
  techniques: [],
  viewedContent: new Set(),
  loading: false,
  error: null,

  setTechniques: (techniques) => set({ techniques, loading: false }),

  markAsViewed: (id) => {
    const { viewedContent } = get();
    const newViewed = new Set(viewedContent);
    newViewed.add(id);
    set({ viewedContent: newViewed });
  },

  getTechniquesByLevel: (level) => {
    const { techniques } = get();
    return techniques.filter((t) => t.level === level);
  },

  getTechniquesByCategory: (category) => {
    const { techniques } = get();
    return techniques.filter((t) => t.category === category);
  },

  searchTechniques: (query) => {
    const { techniques } = get();
    const q = query.toLowerCase();
    return techniques.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  },

  getCategories: () => {
    const { techniques } = get();
    const categories = new Set(techniques.map((t) => t.category));
    return Array.from(categories).sort();
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
