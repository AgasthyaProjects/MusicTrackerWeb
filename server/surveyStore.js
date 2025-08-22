import db from './db.js';

async function saveSurvey({ albumId, albumName, artistName, artworkUrl, rating }) {
  console.log('Saving survey:', { albumId, albumName, artistName, artworkUrl, rating });

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO survey_responses (album_id, album_name, artist_name, artwork_url, rating)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(album_id) DO UPDATE 
       SET album_name = excluded.album_name,
           artist_name = excluded.artist_name,
           artwork_url = excluded.artwork_url,
           rating = excluded.rating`,
      [albumId, albumName, artistName, artworkUrl, rating],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export default { saveSurvey };
