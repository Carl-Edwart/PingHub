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
