CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  target_temp_min REAL,
  target_temp_max REAL,
  target_humidity_min REAL,
  target_humidity_max REAL,
  target_ppfd_min INTEGER,
  target_ppfd_max INTEGER,
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  crop TEXT NOT NULL,
  germ_days INTEGER NOT NULL,
  light_hours INTEGER NOT NULL,
  ppfd INTEGER NOT NULL,
  humidity INTEGER NOT NULL,
  harvest_days INTEGER NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  trays INTEGER NOT NULL,
  seeded_at TEXT NOT NULL,
  expected_harvest_at TEXT NOT NULL,
  expected_yield_kg REAL NOT NULL,
  status TEXT NOT NULL,
  seed_lot TEXT,
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE IF NOT EXISTS telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  temp REAL NOT NULL,
  humidity REAL NOT NULL,
  co2 INTEGER NOT NULL,
  ppfd INTEGER NOT NULL,
  water_level INTEGER NOT NULL,
  ph REAL,
  ec REAL,
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  zone_id TEXT,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  acknowledged_at TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  label TEXT NOT NULL,
  owner TEXT NOT NULL,
  due_at TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  executed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_telemetry_zone_time ON telemetry(zone_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
