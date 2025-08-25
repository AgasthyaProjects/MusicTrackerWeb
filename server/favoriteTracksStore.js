import db from './db.js';

async function saveFavoriteTrack({ albumId, trackId, trackName = null, artistName = null, albumName = null }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO favorite_tracks (album_id, track_id, track_name, artist_name, album_name)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(album_id, track_id) DO NOTHING`,
      [albumId, trackId, trackName, artistName, albumName],
      function (err) {
        if (err) {
          console.error('Database save favorite error:', err);
          reject(err);
        } else {
          resolve({ added: this.changes > 0 });
        }
      }
    );
  });
}

async function removeFavoriteTrack({ albumId, trackId }) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM favorite_tracks WHERE album_id = ? AND track_id = ?`,
      [albumId, trackId],
      function (err) {
        if (err) {
          console.error('Database remove favorite error:', err);
          reject(err);
        } else {
          resolve({ removed: this.changes > 0 });
        }
      }
    );
  });
}
// Get ALL favorite tracks across all albums
async function getAllFavoriteTracks() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM favorite_tracks 
       ORDER BY date_favorited DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Get favorite tracks by artist
async function getFavoritesByArtist(artistName) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM favorite_tracks 
       WHERE artist_name = ? 
       ORDER BY album_name, track_number`,
      [artistName],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}
async function getFavoriteTracksByAlbum(albumId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT track_id, track_name, artist_name, album_name, date_favorited 
       FROM favorite_tracks 
       WHERE album_id = ? 
       ORDER BY  date_favorited ASC`,
      [albumId],
      (err, rows) => {
        if (err) {
          console.error('Database get favorites error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

export default { saveFavoriteTrack, removeFavoriteTrack, getFavoriteTracksByAlbum, getAllFavoriteTracks, getFavoritesByArtist };