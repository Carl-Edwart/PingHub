// src/database/migrations/index.ts
// Exporta todas as migrations SQL em ordem de execução

const migration001 = `
CREATE TABLE IF NOT EXISTS athletes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  photo_uri TEXT,
  level TEXT NOT NULL DEFAULT 'beginner',
  play_style TEXT NOT NULL DEFAULT 'all_round',
  elo INTEGER NOT NULL DEFAULT 1000,
  created_at TEXT NOT NULL
);
`;

const migration002 = `
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  player1_id TEXT,
  player2_id TEXT,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  sets_config TEXT NOT NULL,
  result_json TEXT NOT NULL,
  mode TEXT NOT NULL,
  duration INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (player1_id) REFERENCES athletes(id),
  FOREIGN KEY (player2_id) REFERENCES athletes(id)
);
`;

const migration003 = `
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  bracket_type TEXT NOT NULL,
  match_config TEXT NOT NULL,
  bracket_json TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  match_id TEXT,
  player1_id TEXT,
  player2_id TEXT,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  result_json TEXT,
  match_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (player1_id) REFERENCES athletes(id),
  FOREIGN KEY (player2_id) REFERENCES athletes(id)
);
`;

const migration004 = `
CREATE TABLE IF NOT EXISTS rankings (
  athlete_id TEXT PRIMARY KEY,
  elo INTEGER NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  tournaments_won INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id)
);

CREATE INDEX IF NOT EXISTS idx_rankings_elo ON rankings(elo DESC);
`;

const migration005 = `
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available',
  player1_id TEXT,
  player1_name TEXT,
  player2_id TEXT,
  player2_name TEXT,
  match_id TEXT,
  started_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (player1_id) REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (player2_id) REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL
);
`;

const migration006 = `
CREATE TABLE IF NOT EXISTS queue (
  id TEXT PRIMARY KEY,
  athlete_id TEXT NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  photo_uri TEXT,
  added_at TEXT NOT NULL,
  preferred_modality TEXT,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);
`;

export const MIGRATIONS = [migration001, migration002, migration003, migration004, migration005, migration006];
