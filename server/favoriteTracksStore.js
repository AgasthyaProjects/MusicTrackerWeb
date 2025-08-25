// favoriteTracksStore.js
import db from './db.js';

/**
 * Helper wrappers for sqlite3 db.run / db.get / db.all that return Promises
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Save (idempotent) favorite track for album.
 * Returns:
 *   { added: true } when inserted
 *   { added: true, alreadyPresent: true } if it was already there
 *   { added: false } if insert failed unexpectedly
 */
async function saveFavoriteTrack({ albumId, trackId, trackName = null, artistName = null, albumName = null, artworkUrl = null, durationsMs = null, releaseDate = null, listeners = null, playcount = null, genre = null }) {
  if (!albumId || !trackId) {
    throw new Error('albumId and trackId required');
  }
  const aId = String(albumId).trim();
  const tId = String(trackId).trim();

  try {
    // Insert idempotently
    const res = await run(
      `INSERT INTO favorite_tracks (album_id, track_id, track_name, artist_name, album_name, artwork_url, durations_ms, release_date, listeners, playcount, genre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?)
       ON CONFLICT(album_id, track_id) DO NOTHING`,
      [aId, tId, trackName, artistName, albumName, artworkUrl, durationsMs, releaseDate, listeners, playcount, genre]
    );

    if (res.changes && res.changes > 0) {
      // insertion happened
      return { added: true };
    }

    // no changes -> either already existed or insert failed; check existence
    const existing = await get(
      `SELECT 1 as ok FROM favorite_tracks WHERE album_id = ? AND track_id = ? LIMIT 1`,
      [aId, tId]
    );

    if (existing) {
      return { added: true, alreadyPresent: true };
    }

    // unexpected: not inserted and not found
    return { added: false };
  } catch (err) {
    console.error('Database save favorite error:', err);
    throw err;
  }
}

/**
 * Remove favorite track
 * Returns { removed: true } if deleted, else { removed:false }
 */
async function removeFavoriteTrack({ albumId, trackId }) {
  if (!albumId || !trackId) {
    throw new Error('albumId and trackId required');
  }
  const aId = String(albumId).trim();
  const tId = String(trackId).trim();

  try {
    const res = await run(
      `DELETE FROM favorite_tracks WHERE album_id = ? AND track_id = ?`,
      [aId, tId]
    );
    return { removed: res.changes > 0 };
  } catch (err) {
    console.error('Database remove favorite error:', err);
    throw err;
  }
}

/**
 * Get favorite tracks for a single album (used by router GET /album/:albumId)
 * Returns an array of rows with columns: track_id, track_name, artist_name, album_id, album_name, artwork_url, date_favorited
 */
async function getFavoriteTracksByAlbum(albumId) {
  if (!albumId) throw new Error('albumId required');
  try {
    const rows = await all(
      `SELECT * FROM favorite_tracks WHERE album_id = ? ORDER BY date_favorited DESC`,
      [String(albumId).trim()]
    );
    return rows;
  } catch (err) {
    console.error('getFavoriteTracksByAlbum error:', err);
    throw err;
  }
}

/**
 * Get ALL favorite tracks across all albums
 */
async function getAllFavoriteTracks() {
  try {
    const rows = await all(
      `SELECT * FROM favorite_tracks ORDER BY album_name DESC`
    );
    return rows;
  } catch (err) {
    console.error('getAllFavoriteTracks error:', err);
    throw err;
  }
}

/**
 * Get favorites by artist
 */
async function getFavoritesByArtist(artistName) {
  try {
    const rows = await all(
      `SELECT * FROM favorite_tracks WHERE artist_name = ? ORDER BY album_name`,
      [artistName]
    );
    return rows;
  } catch (err) {
    console.error('getFavoritesByArtist error:', err);
    throw err;
  }
}

export default {
  saveFavoriteTrack,
  removeFavoriteTrack,
  getFavoriteTracksByAlbum,
  getAllFavoriteTracks,
  getFavoritesByArtist
};
