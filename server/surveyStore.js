import db from './db.js';

async function saveSurvey({ albumId, albumName, artistName, rating }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO survey_responses (album_id, album_name, artist_name, rating)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(album_id) DO UPDATE SET rating = excluded.rating`,
      [albumId, albumName, artistName, rating],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export default { saveSurvey };
