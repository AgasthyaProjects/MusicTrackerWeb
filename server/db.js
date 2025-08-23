// server/db.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(path.resolve(__dirname, 'data.sqlite'), (err) => {
  if (err) console.error('DB connection error:', err.message);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      album_id TEXT PRIMARY KEY,
      album_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      artwork_url TEXT,
      date_logged TEXT DEFAULT (datetime('now','localtime')),
      rating REAL,
      release_date TEXT,
      track_count INTEGER,
      primary_genre_name TEXT
    )
  `);

  // Add columns to existing table if they don't exist
  const addColumnIfNotExists = (columnName, columnType) => {
    db.run(`ALTER TABLE survey_responses ADD COLUMN ${columnName} ${columnType}`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Error adding column ${columnName}:`, err.message);
      }
    });
  };

  // Add new columns for existing databases
  addColumnIfNotExists('release_date', 'TEXT');
  addColumnIfNotExists('track_count', 'INTEGER');
  addColumnIfNotExists('primary_genre_name', 'TEXT');
});

export default db;