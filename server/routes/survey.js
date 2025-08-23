import express from 'express';
import db from '../db.js';
const router = express.Router();
import surveyStore from '../surveyStore.js';
import { release } from 'os';
router.post('/', async (req, res) => {
  const { albumId, albumName, artistName, artworkUrl100, rating, releaseDate, trackCount,primaryGenreName} = req.body;
  // ✅ allow rating = 0 but disallow undefined
  if (!albumId || !albumName || !artistName || rating === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await surveyStore.saveSurvey({
      albumId: String(albumId),
      albumName,
      artistName,
      artworkUrl: artworkUrl100,   // ✅ map frontend key → backend key
      rating: Number(rating),
      releaseDate: releaseDate,
      trackCount: trackCount,
      primaryGenreName: primaryGenreName,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Survey save error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});
router.get('/individual/:albumId', async (req, res) => {
  const { albumId } = req.params;
  
  if (!albumId) {
    return res.status(400).json({ error: 'Missing albumId' });
  }

  try {
    db.get(
      `SELECT album_id, album_name, artist_name, artwork_url, date_logged, rating, 
              release_date, track_count, primary_genre_name 
       FROM survey_responses 
       WHERE album_id = ?`,
      [albumId],
      (err, row) => {
        if (err) {
          console.error('DB error:', err);
          return res.status(500).json({ error: 'DB error' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Album not found', rating: null, logdatetime: null });
        }

        res.json({
          collectionId: row.album_id,
          collectionName: row.album_name,
          artistName: row.artist_name,
          artworkUrl100: row.artwork_url,
          rating: row.rating,
          logdatetime: row.date_logged,
          releaseDate: row.release_date,
          trackCount: row.track_count,
          genre: row.primary_genre_name,
        });

        console.log('Fetched individual album:', {
          albumId,
          rating: row.rating,
          logdatetime: row.date_logged
        });
      }
    );
  } catch (err) {
    console.error('Failed to fetch album:', err);
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});
// Fetch all rated albums
router.get('/rated', async (req, res) => {
  try {
    db.all(
      'SELECT album_id, album_name, artist_name, artwork_url, date_logged,rating, release_date, track_count, primary_genre_name from survey_responses WHERE rating IS NOT NULL ORDER BY date_logged DESC',
      [],
      (err, rows) => {
        if (err) {
          console.error('DB error:', err);
          return res.status(500).json({ error: 'DB error' });
        }
        res.json({
          albums: rows.map(row => ({
            collectionId: row.album_id,
            collectionName: row.album_name,
            artistName: row.artist_name,
            artworkUrl100: row.artwork_url,
            rating: row.rating,
            logdatetime: row.date_logged,
            releaseDate: row.release_date,
            trackCount: row.track_count,
            genre: row.primary_genre_name,
          })),
        });
        console.log('Fetched rated albums:', rows);
      }
    );
  } catch (err) {
    console.error('Failed to fetch rated albums:', err);
    res.status(500).json({ error: 'Failed to fetch rated albums' });
  }
});

// Delete a rating by albumId
router.delete('/:albumId', async (req, res) => {
  const { albumId } = req.params;
  console.log('Delete request for albumId:', albumId);
  if (!albumId) {
    return res.status(400).json({ error: 'Missing albumId' });
  }

  try {
    db.run(
      'DELETE FROM survey_responses WHERE album_id = ?',
      [albumId],
      function (err) {
        if (err) {
          console.error('Delete error:', err);
          return res.status(500).json({ error: 'Failed to delete rating' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Rating not found' });
        }

        res.json({ success: true });
      }
    );
  } catch (err) {
    console.error('Unexpected delete error:', err);
    res.status(500).json({ error: 'Unexpected error during deletion' });
  }
});

export default router;
