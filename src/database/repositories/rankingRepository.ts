import { getDatabase } from '../db';
import { RankingEntry, RankingUpdate, EloHistory } from '@/types/ranking';

interface RankingRow {
  athlete_id: string;
  elo: number;
  wins: number;
  losses: number;
  tournaments_won: number;
  last_updated: string;
}

export class RankingRepository {
  static async getRanking(limit?: number, offset: number = 0): Promise<RankingEntry[]> {
    const db = getDatabase();
    let query = `
      SELECT 
        r.athlete_id,
        a.name,
        a.photo_uri,
        r.elo,
        r.wins,
        r.losses,
        r.tournaments_won,
        r.last_updated
      FROM rankings r
      LEFT JOIN athletes a ON r.athlete_id = a.id
      ORDER BY r.elo DESC
    `;

    const params: any[] = [];

    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const rows = await db.getAllAsync<any>(query, params);

    return rows.map((row, index) => ({
      athleteId: row.athlete_id,
      name: row.name,
      photoUri: row.photo_uri,
      elo: row.elo,
      wins: row.wins,
      losses: row.losses,
      position: offset + index + 1,
      eloChange: 0,
      lastUpdated: row.last_updated,
    }));
  }

  static async getByAthleteId(athleteId: string): Promise<RankingEntry | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<any>(
      `
      SELECT 
        r.athlete_id,
        a.name,
        a.photo_uri,
        r.elo,
        r.wins,
        r.losses,
        r.tournaments_won,
        r.last_updated
      FROM rankings r
      LEFT JOIN athletes a ON r.athlete_id = a.id
      WHERE r.athlete_id = ?
      `,
      [athleteId]
    );

    if (!row) return null;

    // Calcular posição
    const allRankings = await this.getRanking();
    const position = allRankings.findIndex((entry) => entry.athleteId === athleteId) + 1;

    return {
      athleteId: row.athlete_id,
      name: row.name,
      photoUri: row.photo_uri,
      elo: row.elo,
      wins: row.wins,
      losses: row.losses,
      position,
      eloChange: 0,
      lastUpdated: row.last_updated,
    };
  }

  static async updateElo(athleteId: string, newElo: number, deltaElo: number): Promise<RankingUpdate> {
    const db = getDatabase();
    const timestamp = new Date().toISOString();

    const existing = await db.getFirstAsync<RankingRow>(
      'SELECT * FROM rankings WHERE athlete_id = ?',
      [athleteId]
    );

    if (existing) {
      await db.runAsync(
        'UPDATE rankings SET elo = ?, last_updated = ? WHERE athlete_id = ?',
        [newElo, timestamp, athleteId]
      );
    } else {
      await db.runAsync(
        'INSERT INTO rankings (athlete_id, elo, wins, losses, tournaments_won, last_updated) VALUES (?, ?, ?, ?, ?, ?)',
        [athleteId, newElo, 0, 0, 0, timestamp]
      );
    }

    return { athleteId, eloChange: deltaElo, newElo, timestamp };
  }

  static async addWin(athleteId: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('UPDATE rankings SET wins = wins + 1 WHERE athlete_id = ?', [athleteId]);
  }

  static async addLoss(athleteId: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('UPDATE rankings SET losses = losses + 1 WHERE athlete_id = ?', [athleteId]);
  }

  static async getEloHistory(athleteId: string): Promise<EloHistory> {
    const db = getDatabase();
    const matches = await db.getAllAsync<any>(
      `
      SELECT m.id, m.created_at, m.result_json
      FROM matches m
      WHERE m.player1_id = ? OR m.player2_id = ?
      ORDER BY m.created_at ASC
      `,
      [athleteId, athleteId]
    );

    const entries = matches.map((match) => ({
      date: match.created_at,
      elo: 0,
      change: 0,
      matchId: match.id,
    }));

    return { athleteId, entries };
  }

  static async reset(athleteId: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE rankings SET elo = 1000, wins = 0, losses = 0, tournaments_won = 0, last_updated = ? WHERE athlete_id = ?',
      [new Date().toISOString(), athleteId]
    );
  }
}
