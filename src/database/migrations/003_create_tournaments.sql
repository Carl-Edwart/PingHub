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
