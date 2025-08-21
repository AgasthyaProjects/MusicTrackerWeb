import express from 'express';
// survey.js
import db from '../db.js';
const router = express.Router();
import surveyStore from '../surveyStore.js';

router.post('/', async (req, res) => {
  const { albumId, albumName, artistName, rating } = req.body;
  if (!albumId || !albumName || !artistName || !rating) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    await surveyStore.saveSurvey({
      albumId: String(albumId),
      albumName,
      artistName,
      rating: Number(rating)
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Survey save error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

router.get('/:albumId', async (req, res) => {
  const albumId = req.params.albumId;
  try {
    db.get(
      'SELECT rating FROM survey_responses WHERE album_id = ?',
      [albumId],
      (err, row) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ rating: row ? row.rating : null });
      }
    );
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

router.get('/rated', async (req, res) => {
  try {
    db.all('SELECT album_id FROM survey_responses', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ ratedAlbumIds: rows.map(row => row.album_id) });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rated albums' });
  }
});

export default router;
