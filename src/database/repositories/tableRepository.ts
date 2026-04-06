import { getDatabase } from '../db';
import { Table, TableStatus, QueueEntry } from '@/types/table';
import { v4 as uuidv4 } from 'uuid';

interface TableRow {
  id: string;
  number: number;
  status: string;
  player1_id: string | null;
  player1_name: string | null;
  player2_id: string | null;
  player2_name: string | null;
  match_id: string | null;
  started_at: string | null;
  created_at: string;
}

interface QueueRow {
  id: string;
  athlete_id: string;
  name: string;
  nickname: string | null;
  photo_uri: string | null;
  added_at: string;
  preferred_modality: string | null;
}

export class TableRepository {
  private static rowToTable(row: TableRow): Table {
    return {
      id: row.id,
      number: row.number,
      status: row.status as TableStatus,
      player1Id: row.player1_id || undefined,
      player1Name: row.player1_name || undefined,
      player2Id: row.player2_id || undefined,
      player2Name: row.player2_name || undefined,
      matchId: row.match_id || undefined,
      startedAt: row.started_at || undefined,
      createdAt: row.created_at,
    };
  }

  private static rowToQueueEntry(row: QueueRow): QueueEntry {
    return {
      id: row.id,
      athleteId: row.athlete_id,
      name: row.name,
      nickname: row.nickname || undefined,
      photoUri: row.photo_uri || undefined,
      addedAt: row.added_at,
      preferredModality: (row.preferred_modality as 'singles' | 'doubles') || undefined,
    };
  }

  // ─────────────────────────────────────────
  // TABLE METHODS
  // ─────────────────────────────────────────

  static async getAllTables(): Promise<Table[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<TableRow>('SELECT * FROM tables ORDER BY number ASC');
    return rows.map((row) => this.rowToTable(row));
  }

  static async getTableById(id: string): Promise<Table | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<TableRow>('SELECT * FROM tables WHERE id = ?', [id]);
    return row ? this.rowToTable(row) : null;
  }

  static async createTable(number: number): Promise<Table> {
    const db = getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO tables (id, number, status, created_at)
       VALUES (?, ?, ?, ?)`,
      [id, number, TableStatus.AVAILABLE, createdAt]
    );

    const table = await this.getTableById(id);
    if (!table) throw new Error('Failed to create table');
    return table;
  }

  static async updateTable(id: string, data: Partial<Omit<Table, 'id' | 'createdAt'>>): Promise<Table> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.number !== undefined) {
      fields.push('number = ?');
      values.push(data.number);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.player1Id !== undefined) {
      fields.push('player1_id = ?');
      values.push(data.player1Id || null);
    }
    if (data.player1Name !== undefined) {
      fields.push('player1_name = ?');
      values.push(data.player1Name || null);
    }
    if (data.player2Id !== undefined) {
      fields.push('player2_id = ?');
      values.push(data.player2Id || null);
    }
    if (data.player2Name !== undefined) {
      fields.push('player2_name = ?');
      values.push(data.player2Name || null);
    }
    if (data.matchId !== undefined) {
      fields.push('match_id = ?');
      values.push(data.matchId || null);
    }
    if (data.startedAt !== undefined) {
      fields.push('started_at = ?');
      values.push(data.startedAt || null);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE tables SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const table = await this.getTableById(id);
    if (!table) throw new Error('Failed to update table');
    return table;
  }

  static async deleteTable(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.runAsync('DELETE FROM tables WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async getTablesByStatus(status: TableStatus): Promise<Table[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<TableRow>('SELECT * FROM tables WHERE status = ? ORDER BY number ASC', [status]);
    return rows.map((row) => this.rowToTable(row));
  }

  // ─────────────────────────────────────────
  // QUEUE METHODS
  // ─────────────────────────────────────────

  static async getQueue(): Promise<QueueEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<QueueRow>('SELECT * FROM queue ORDER BY added_at ASC');
    return rows.map((row) => this.rowToQueueEntry(row));
  }

  static async addToQueue(athleteId: string, name: string, nickname?: string, photoUri?: string, preferredModality?: 'singles' | 'doubles'): Promise<QueueEntry> {
    const db = getDatabase();
    const id = uuidv4();
    const addedAt = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO queue (id, athlete_id, name, nickname, photo_uri, added_at, preferred_modality)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, athleteId, name, nickname || null, photoUri || null, addedAt, preferredModality || null]
    );

    return {
      id,
      athleteId,
      name,
      nickname,
      photoUri,
      addedAt,
      preferredModality,
    };
  }

  static async removeFromQueue(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.runAsync('DELETE FROM queue WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async getQueueLength(): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM queue');
    return result?.count || 0;
  }

  static async clearQueue(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM queue');
  }

  static async getFirstInQueue(): Promise<QueueEntry | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<QueueRow>('SELECT * FROM queue ORDER BY added_at ASC LIMIT 1');
    return row ? this.rowToQueueEntry(row) : null;
  }
}
