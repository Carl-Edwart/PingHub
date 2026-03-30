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
