-- Trade Saathi schema v1
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE',
  qty REAL NOT NULL,
  avg_price REAL NOT NULL,
  buy_date TEXT,
  broker TEXT NOT NULL DEFAULT 'Groww',
  danger_level REAL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('above','below','day_move','danger','buy_level','portfolio_green')),
  symbol TEXT,
  value REAL NOT NULL DEFAULT 0,
  label TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One row per alert key per IST day => dedupe.
CREATE TABLE IF NOT EXISTS alert_log (
  date TEXT NOT NULL,
  key TEXT NOT NULL,
  message TEXT,
  sent_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (date, key)
);

CREATE TABLE IF NOT EXISTS holidays (
  date TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  qty REAL NOT NULL,
  price REAL NOT NULL,
  segment TEXT NOT NULL DEFAULT 'delivery',
  reason TEXT,
  note TEXT,
  emotion TEXT,
  account TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
