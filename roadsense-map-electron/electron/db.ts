import Database from 'better-sqlite3';

const db = new Database('roadsense.db');

// create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL,
    lon REAL,
    created_at TEXT
  )
`);

export default db;