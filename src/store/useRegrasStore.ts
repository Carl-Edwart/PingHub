import { create } from 'zustand';
import { Rule, RuleSection } from '@/types/content';

interface RegrasState {
  // Estado
  rules: Rule[];
  sections: RuleSection[];
  loading: boolean;
  error: string | null;

  // Actions
  setRules: (rules: Rule[]) => void;
  setSections: (sections: RuleSection[]) => void;
  getRulesBySource: (source: 'ittf' | 'local') => Rule[];
  getRulesByCategory: (category: string) => Rule[];
  searchRules: (query: string) => Rule[];
  getCategories: () => string[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRegrasStore = create<RegrasState>((set, get) => ({
  rules: [],
  sections: [],
  loading: false,
  error: null,

  setRules: (rules) => set({ rules, loading: false }),

  setSections: (sections) => set({ sections, loading: false }),

  getRulesBySource: (source) => {
    const { rules } = get();
    return rules.filter((r) => r.source === source);
  },

  getRulesByCategory: (category) => {
    const { rules } = get();
    return rules.filter((r) => r.category === category);
  },

  searchRules: (query) => {
    const { rules } = get();
    const q = query.toLowerCase();
    return rules.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  },

  getCategories: () => {
    const { rules } = get();
    const categories = new Set(rules.map((r) => r.category));
    return Array.from(categories).sort();
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
