import { create } from 'zustand';
import { Table, TableStatus, QueueEntry, TableStats } from '@/types/table';

interface MesaState {
  // Estado
  tables: Table[];
  queue: QueueEntry[];
  loading: boolean;
  error: string | null;

  // Table Actions
  setTables: (tables: Table[]) => void;
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  updateTableStatus: (id: string, status: TableStatus) => void;
  getTableById: (id: string) => Table | undefined;
  getAvailableTables: () => Table[];
  getTablesByStatus: (status: TableStatus) => Table[];

  // Queue Actions
  setQueue: (queue: QueueEntry[]) => void;
  addToQueue: (entry: QueueEntry) => void;
  removeFromQueue: (id: string) => void;
  getQueueLength: () => number;

  // Stats
  getStats: () => TableStats;

  // Generic
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMesaStore = create<MesaState>((set, get) => ({
  tables: [],
  queue: [],
  loading: false,
  error: null,

  // Table Actions
  setTables: (tables) => set({ tables, loading: false }),

  addTable: (table) => {
    const { tables } = get();
    if (tables.find((t) => t.id === table.id)) {
      set({ error: 'Mesa já existe' });
      return;
    }
    set({ tables: [...tables, table], error: null });
  },

  updateTable: (id, updates) => {
    const { tables } = get();
    const index = tables.findIndex((t) => t.id === id);

    if (index === -1) {
      set({ error: 'Mesa não encontrada' });
      return;
    }

    const updated = [...tables];
    updated[index] = { ...updated[index], ...updates };
    set({ tables: updated, error: null });
  },

  updateTableStatus: (id, status) => {
    const { tables } = get();
    const index = tables.findIndex((t) => t.id === id);

    if (index === -1) {
      set({ error: 'Mesa não encontrada' });
      return;
    }

    const updated = [...tables];
    updated[index] = { ...updated[index], status };
    set({ tables: updated, error: null });
  },

  getTableById: (id) => get().tables.find((t) => t.id === id),

  getAvailableTables: () => get().tables.filter((t) => t.status === TableStatus.AVAILABLE),

  getTablesByStatus: (status) => get().tables.filter((t) => t.status === status),

  // Queue Actions
  setQueue: (queue) => set({ queue, loading: false }),

  addToQueue: (entry) => {
    const { queue } = get();
    if (queue.find((e) => e.id === entry.id)) {
      set({ error: 'Atleta já está na fila' });
      return;
    }
    set({ queue: [...queue, entry], error: null });
  },

  removeFromQueue: (id) => {
    const { queue } = get();
    const filtered = queue.filter((e) => e.id !== id);

    if (filtered.length === queue.length) {
      set({ error: 'Entrada não encontrada na fila' });
      return;
    }

    set({ queue: filtered, error: null });
  },

  getQueueLength: () => get().queue.length,

  // Stats
  getStats: () => {
    const { tables, queue } = get();
    const available = tables.filter((t) => t.status === TableStatus.AVAILABLE).length;
    const inUse = tables.filter((t) => t.status === TableStatus.IN_USE).length;
    const maintenance = tables.filter((t) => t.status === TableStatus.MAINTENANCE).length;

    return {
      totalTables: tables.length,
      availableTables: available,
      inUseTables: inUse,
      maintenanceTables: maintenance,
      queueLength: queue.length,
      averageMatchDuration: 0, // Será calculado de forma externa
    };
  },

  // Generic
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
