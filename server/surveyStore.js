import db from './db.js';

async function saveSurvey({ 
  albumId, 
  albumName, 
  artistName, 
  artworkUrl, 
  rating, 
  releaseDate = null,
  trackCount = null,
  primaryGenreName = null,
  favoriteSong = null,
}) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO survey_responses (
        album_id, album_name, artist_name, artwork_url, rating, date_logged,
        release_date, track_count, primary_genre_name, favorite_song
      )
       VALUES (?, ?, ?, ?, ?, datetime('now','localtime'), ?, ?, ?, ?)
       ON CONFLICT(album_id) DO UPDATE 
       SET 
          album_id = excluded.album_id,
           album_name = excluded.album_name,
           artist_name = excluded.artist_name,
           artwork_url = excluded.artwork_url,
           rating = excluded.rating,
           date_logged = COALESCE(survey_responses.date_logged, datetime('now','localtime')),
           release_date = excluded.release_date,
           track_count = excluded.track_count,
           primary_genre_name = excluded.primary_genre_name,
           favorite_song = excluded.favorite_song`,

      [albumId, albumName, artistName, artworkUrl, rating, releaseDate, trackCount, primaryGenreName, favoriteSong],
      function (err) {
        if (err) {
          console.error('Database save error:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export default { saveSurvey };