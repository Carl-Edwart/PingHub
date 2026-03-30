import { getDatabase } from '../db';
import { Tournament, TournamentStatus, BracketType, Bracket, AllVsAllTable, TournamentMatch } from '@/types/tournament';
import { v4 as uuidv4 } from 'uuid';

interface TournamentRow {
  id: string;
  name: string;
  date: string;
  bracket_type: string;
  match_config: string;
  bracket_json: string | null;
  status: string;
  created_at: string;
}

export class TournamentRepository {
  private static rowToTournament(row: TournamentRow): Tournament {
    const tournament: Tournament = {
      id: row.id,
      name: row.name,
      date: row.date,
      bracketType: row.bracket_type as BracketType,
      participants: [],
      matchConfig: JSON.parse(row.match_config),
      status: row.status as TournamentStatus,
      createdAt: row.created_at,
    };

    if (row.bracket_json) {
      const parsed = JSON.parse(row.bracket_json);
      if (tournament.bracketType === BracketType.SINGLE_ELIMINATION) {
        tournament.bracket = parsed;
      } else {
        tournament.table = parsed;
      }
    }

    return tournament;
  }

  static async create(data: Omit<Tournament, 'id' | 'createdAt' | 'status'>): Promise<Tournament> {
    const db = getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const bracketJson = data.bracket || data.table ? JSON.stringify(data.bracket || data.table) : null;

    await db.runAsync(
      `INSERT INTO tournaments (id, name, date, bracket_type, match_config, bracket_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.date, data.bracketType, JSON.stringify(data.matchConfig), bracketJson, 'planning', createdAt]
    );

    return this.getById(id) as Promise<Tournament>;
  }

  static async getById(id: string): Promise<Tournament | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<TournamentRow>('SELECT * FROM tournaments WHERE id = ?', [id]);
    if (!row) return null;

    const tournament = this.rowToTournament(row);

    // Carregar participantes e matches
    const matches = await db.getAllAsync<any>(
      'SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY created_at ASC',
      [id]
    );

    // Extrair participantes únicos
    const participants = new Set<string>();
    matches.forEach((match) => {
      if (match.player1_name) participants.add(JSON.stringify({ name: match.player1_name, athleteId: match.player1_id }));
      if (match.player2_name) participants.add(JSON.stringify({ name: match.player2_name, athleteId: match.player2_id }));
    });

    tournament.participants = Array.from(participants).map((p) => JSON.parse(p));

    return tournament;
  }

  static async getAll(status?: TournamentStatus): Promise<Tournament[]> {
    const db = getDatabase();
    let query = 'SELECT * FROM tournaments';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY date DESC';

    const rows = await db.getAllAsync<TournamentRow>(query, params);
    return Promise.all(rows.map((row) => this.getById(row.id) as Promise<Tournament>));
  }

  static async updateStatus(id: string, status: TournamentStatus): Promise<Tournament> {
    const db = getDatabase();
    await db.runAsync('UPDATE tournaments SET status = ? WHERE id = ?', [status, id]);

    return this.getById(id) as Promise<Tournament>;
  }

  static async updateBracket(id: string, bracket: Bracket | AllVsAllTable): Promise<Tournament> {
    const db = getDatabase();
    await db.runAsync('UPDATE tournaments SET bracket_json = ? WHERE id = ?', [JSON.stringify(bracket), id]);

    return this.getById(id) as Promise<Tournament>;
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM tournament_matches WHERE tournament_id = ?', [id]);
    const result = await db.runAsync('DELETE FROM tournaments WHERE id = ?', [id]);
    return result.changes > 0;
  }
}
