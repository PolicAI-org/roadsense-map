import Database from 'better-sqlite3';

const db = new Database('roadsense.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS coordinates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL,
    lon REAL,
    quality INTEGER
  )
`);

export default db;