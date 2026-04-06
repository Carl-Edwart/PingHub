export enum TableStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  player1Id?: string;
  player1Name?: string;
  player2Id?: string;
  player2Name?: string;
  matchId?: string;
  startedAt?: string;
  createdAt: string;
}

export interface QueueEntry {
  id: string;
  athleteId: string;
  name: string;
  nickname?: string;
  photoUri?: string;
  addedAt: string;
  preferredModality?: 'singles' | 'doubles';
}

export interface TableStats {
  totalTables: number;
  availableTables: number;
  inUseTables: number;
  maintenanceTables: number;
  queueLength: number;
  averageMatchDuration: number;
}
