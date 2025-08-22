import express from 'express';
import db from '../db.js';
const router = express.Router();
import surveyStore from '../surveyStore.js';

// Save a rating
router.post('/', async (req, res) => {
  const { albumId, albumName, artistName, artworkUrl100, rating } = req.body;
  console.log("Received survey data:", req.body);
  // ✅ allow rating = 0 but disallow undefined
  if (!albumId || !albumName || !artistName || rating === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
console.log("Incoming req.body:", req.body);
    await surveyStore.saveSurvey({
      albumId: String(albumId),
      albumName,
      artistName,
      artworkUrl: artworkUrl100,   // ✅ map frontend key → backend key
      rating: Number(rating),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Survey save error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Fetch all rated albums
router.get('/rated', async (req, res) => {
  try {
    db.all(
      'SELECT album_id, album_name, artist_name, artwork_url, rating FROM survey_responses',
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
          })),
        });
      }
    );
  } catch (err) {
    console.error('Failed to fetch rated albums:', err);
    res.status(500).json({ error: 'Failed to fetch rated albums' });
  }
});

// Fetch one album’s details
router.get('/:albumId', async (req, res) => {
  const albumId = req.params.albumId;
  try {
    db.get(
      'SELECT album_id, album_name, artist_name, artwork_url, rating FROM survey_responses WHERE album_id = ?',
      [albumId],
      (err, row) => {
        if (err) {
          console.error('DB error:', err);
          return res.status(500).json({ error: 'DB error' });
        }
        if (!row) return res.json(null);

        res.json({
          albumId: row.album_id,
          albumName: row.album_name,
          artistName: row.artist_name,
          artworkUrl100: row.artwork_url, // ✅ expose artwork to frontend
          rating: row.rating,
        });
      }
    );
  } catch (err) {
    console.error('Failed to fetch rating:', err);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});



export default router;
