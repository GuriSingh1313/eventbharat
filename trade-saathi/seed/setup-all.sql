-- Cloudflare D1 Console mein poora paste karke Execute dabao. (Auto-generated: node scripts/build-setup-sql.mjs)
-- ===== migrations/0001_init.sql =====
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

-- ===== seed/seed.sql =====
-- Seed data (safe to re-run: clears holdings/alerts/journal first). Edit later inside the app.
DELETE FROM holdings; DELETE FROM alerts; DELETE FROM journal;

INSERT INTO holdings (name, symbol, qty, avg_price, broker, danger_level) VALUES
 ('NMDC Steel', 'NMDCSTEEL', 59, 41.95, 'Groww', 40),
 ('Lupin', 'LUPIN', 67, 2283.34, 'Groww', 1960),
 ('HEG', 'HEG', 93, 267.16, 'Groww', 225),
 ('Infosys', 'INFY', 25, 1137.29, 'Groww', 945),
 ('TCS', 'TCS', 21, 2396.50, 'Groww', 1950);

INSERT INTO alerts (kind, symbol, value, label) VALUES
 ('danger', 'NMDCSTEEL', 40, NULL),
 ('danger', 'LUPIN', 1960, NULL),
 ('danger', 'HEG', 225, NULL),
 ('danger', 'INFY', 945, NULL),
 ('danger', 'TCS', 1950, NULL),
 ('buy_level', 'MCX', 3350, 'Part 1 of 3'),
 ('buy_level', 'MCX', 3250, 'Part 2 of 3'),
 ('buy_level', 'MCX', 3100, 'Part 3 of 3'),
 ('portfolio_green', NULL, 0, NULL);

INSERT INTO journal (date, symbol, side, qty, price, segment, reason, note, emotion, account) VALUES
 ('2026-09-24', 'NSE', 'buy', 8, 1785, 'ipo', 'IPO allotment', 'NSE IPO allot hua', 'plan', 'Account 1'),
 ('2026-09-24', 'NSE', 'buy', 8, 1785, 'ipo', 'IPO allotment', 'NSE IPO allot hua', 'plan', 'Account 2'),
 ('2026-09-24', 'NSE', 'sell', 8, 1845, 'ipo', 'Stop-loss hit', 'SL: trigger 1850, limit 1845', 'plan', 'Account 1'),
 ('2026-09-24', 'NSE', 'sell', 8, 1845, 'ipo', 'Stop-loss hit', 'SL: trigger 1850, limit 1845', 'plan', 'Account 2');

INSERT OR IGNORE INTO settings (key, value) VALUES
 ('danger_default_pct', '7'),
 ('watchlist', '["MCX"]');

-- ===== seed/holidays-2026.sql =====
-- NSE trading holidays 2026 (verify against the official NSE circular; editable in Settings).
INSERT OR IGNORE INTO holidays (date, name) VALUES
 ('2026-01-26','Republic Day'),
 ('2026-03-03','Holi'),
 ('2026-03-26','Ram Navami'),
 ('2026-03-31','Mahavir Jayanti'),
 ('2026-04-03','Good Friday'),
 ('2026-04-14','Ambedkar Jayanti'),
 ('2026-05-01','Maharashtra Day'),
 ('2026-05-28','Bakri Id'),
 ('2026-06-26','Muharram'),
 ('2026-09-14','Ganesh Chaturthi'),
 ('2026-10-02','Gandhi Jayanti'),
 ('2026-10-20','Dussehra'),
 ('2026-11-10','Diwali Balipratipada'),
 ('2026-11-24','Guru Nanak Jayanti'),
 ('2026-12-25','Christmas');
