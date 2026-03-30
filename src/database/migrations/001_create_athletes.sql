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
