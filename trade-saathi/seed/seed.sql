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
