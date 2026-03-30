import { getDatabase } from '../db';
import { Match, Player, SetResult, MatchConfig } from '@/types/match';
import { v4 as uuidv4 } from 'uuid';

interface MatchRow {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string;
  player2_name: string;
  sets_config: string;
  result_json: string;
  mode: string;
  duration: number;
  created_at: string;
}

export class MatchRepository {
  private static rowToMatch(row: MatchRow): Match {
    return {
      id: row.id,
      player1: { athleteId: row.player1_id || undefined, name: row.player1_name },
      player2: { athleteId: row.player2_id || undefined, name: row.player2_name },
      setsConfig: JSON.parse(row.sets_config),
      sets: JSON.parse(row.result_json),
      mode: row.mode as any,
      duration: row.duration,
      createdAt: row.created_at,
    };
  }

  static async create(data: Omit<Match, 'id' | 'createdAt' | 'duration'>): Promise<Match> {
    const db = getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const duration = 0;

    await db.runAsync(
      `INSERT INTO matches (id, player1_id, player2_id, player1_name, player2_name, sets_config, result_json, mode, duration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.player1.athleteId || null,
        data.player2.athleteId || null,
        data.player1.name,
        data.player2.name,
        JSON.stringify(data.setsConfig),
        JSON.stringify(data.sets),
        data.mode,
        duration,
        createdAt,
      ]
    );

    const match = await this.getById(id);
    if (!match) throw new Error('Failed to create match');
    return match;
  }

  static async getById(id: string): Promise<Match | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<MatchRow>('SELECT * FROM matches WHERE id = ?', [id]);
    return row ? this.rowToMatch(row) : null;
  }

  static async getByAthleteId(athleteId: string, limit: number = 15): Promise<Match[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<MatchRow>(
      `SELECT * FROM matches 
       WHERE player1_id = ? OR player2_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [athleteId, athleteId, limit]
    );
    return rows.map((row) => this.rowToMatch(row));
  }

  static async getRecent(limit: number = 15): Promise<Match[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<MatchRow>(
      'SELECT * FROM matches ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map((row) => this.rowToMatch(row));
  }

  static async updateResult(id: string, sets: SetResult[], duration: number): Promise<Match> {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE matches SET result_json = ?, duration = ? WHERE id = ?',
      [JSON.stringify(sets), duration, id]
    );

    const match = await this.getById(id);
    if (!match) throw new Error('Failed to update match');
    return match;
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.runAsync('DELETE FROM matches WHERE id = ?', [id]);
    return result.changes > 0;
  }
}
