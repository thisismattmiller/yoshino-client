import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DB_PATH || './data/yoshino.db';
const dir = dirname(dbPath);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    action TEXT NOT NULL,
    request_body TEXT,
    response_summary TEXT,
    duration_ms INTEGER,
    ip TEXT,
    user_agent TEXT
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    query TEXT NOT NULL,
    action TEXT NOT NULL,
    result_id TEXT,
    rating INTEGER NOT NULL,
    comment TEXT,
    session_id TEXT
  );
`);

// Migrations
const columns = db.prepare("PRAGMA table_info(request_log)").all().map(c => c.name);
if (!columns.includes('token_usage')) {
  db.exec("ALTER TABLE request_log ADD COLUMN token_usage TEXT");
}

export default db;
