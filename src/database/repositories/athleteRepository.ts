import { getDatabase } from '../db';
import { Athlete, AthleteLevel, PlayStyle, AthleteStats } from '@/types/athlete';
import { v4 as uuidv4 } from 'uuid';

export class AthleteRepository {
  static async getAll(): Promise<Athlete[]> {
    const db = getDatabase();
    const result = await db.getAllAsync<Athlete>('SELECT * FROM athletes ORDER BY name ASC');
    return result;
  }

  static async getById(id: string): Promise<Athlete | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<Athlete>('SELECT * FROM athletes WHERE id = ?', [id]);
    return result || null;
  }

  static async create(data: Omit<Athlete, 'id' | 'createdAt'>): Promise<Athlete> {
    const db = getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO athletes (id, name, nickname, photo_uri, level, play_style, elo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.nickname || null, data.photoUri || null, data.level, data.playStyle, data.elo, createdAt]
    );

    const athlete = await this.getById(id);
    if (!athlete) throw new Error('Failed to create athlete');
    return athlete;
  }

  static async update(id: string, data: Partial<Omit<Athlete, 'id' | 'createdAt' | 'elo'>>): Promise<Athlete> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.nickname !== undefined) {
      fields.push('nickname = ?');
      values.push(data.nickname);
    }
    if (data.photoUri !== undefined) {
      fields.push('photo_uri = ?');
      values.push(data.photoUri);
    }
    if (data.level !== undefined) {
      fields.push('level = ?');
      values.push(data.level);
    }
    if (data.playStyle !== undefined) {
      fields.push('play_style = ?');
      values.push(data.playStyle);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE athletes SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const athlete = await this.getById(id);
    if (!athlete) throw new Error('Failed to update athlete');
    return athlete;
  }

  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.runAsync('DELETE FROM athletes WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async search(query: string): Promise<Athlete[]> {
    const db = getDatabase();
    const searchQuery = `%${query.toLowerCase()}%`;
    const result = await db.getAllAsync<Athlete>(
      'SELECT * FROM athletes WHERE LOWER(name) LIKE ? OR LOWER(nickname) LIKE ? ORDER BY name ASC',
      [searchQuery, searchQuery]
    );
    return result;
  }
}
