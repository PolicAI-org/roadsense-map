import Database from 'better-sqlite3';

const db = new Database('roadsense.db');

db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    title TEXT NOT NULL,
    stored_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coordinates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL,
    lon REAL,
    quality INTEGER,
    file_id INTEGER NOT NULL,
    section_id INTEGER,
    FOREIGN KEY (file_id) REFERENCES files(id),
    FOREIGN KEY (section_id) REFERENCES sections(id) 
  )
`);

export default db;