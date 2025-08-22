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
      rating REAL
    )
  `);
});

export default db;
