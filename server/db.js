const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// DATA_DIR permite apontar o banco para um disco persistente fora da pasta
// da aplicação (necessário em PaaS como Azure App Service, onde o código é
// substituído a cada deploy). Sem DATA_DIR, usa ./data como no dev local.
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'planner.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '⭐',
    category TEXT NOT NULL CHECK(category IN ('daily','weekly','extra')),
    value_cents INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL REFERENCES activities(id),
    occurred_on TEXT NOT NULL,
    week_start TEXT NOT NULL,
    value_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_completions_week ON completions(week_start);
  CREATE INDEX IF NOT EXISTS idx_completions_activity ON completions(activity_id);

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    paid_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_payments_week ON payments(week_start);
`);

module.exports = db;
