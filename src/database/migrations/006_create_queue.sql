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
