import { useEffect, useState } from 'react';
import { initializeDatabase, getDatabase } from '@/database/db';
import { AthleteRepository } from '@/database/repositories/athleteRepository';
import { RankingRepository } from '@/database/repositories/rankingRepository';
import { useAtletasStore } from '@/store/useAtletasStore';
import { useRankingStore } from '@/store/useRankingStore';
import * as SQLite from 'expo-sqlite';

interface UseDatabaseReturn {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  error: string | null;
  initializeDatabase: () => Promise<void>;
}

export function useDatabase(): UseDatabaseReturn {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAtletas = useAtletasStore((state) => state.setAtletas);
  const setRankings = useRankingStore((state) => state.setRankings);

  const initDB = async () => {
    try {
      setError(null);
      const database = await initializeDatabase();
      setDb(database);

      // Carregar dados iniciais
      const atletas = await AthleteRepository.getAll();
      setAtletas(atletas);

      // Carregar rankings (limitar a 100 atletas)
      const rankings = await RankingRepository.getRanking(100);
      setRankings(rankings);

      console.log('✅ Database and stores initialized');
      setIsReady(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
      console.error('❌ Database initialization error:', errorMessage);
      setError(errorMessage);
      setIsReady(false);
    }
  };

  useEffect(() => {
    initDB();
  }, []);

  return {
    db,
    isReady,
    error,
    initializeDatabase: initDB,
  };
}
