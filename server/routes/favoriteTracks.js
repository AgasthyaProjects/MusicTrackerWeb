import express from 'express';
import favoriteTracksStore from '../favoriteTracksStore.js';

const router = express.Router();

// Add/remove favorite track
router.post('/', async (req, res) => {
  const { albumId, trackId, trackName, artistName, albumName, action } = req.body;
  
  if (!albumId || !trackId || !action) {
    return res.status(400).json({ error: 'Missing required fields: albumId, trackId, action' });
  }

  try {
    let result;
    if (action === 'add') {
      result = await favoriteTracksStore.saveFavoriteTrack({
        albumId: String(albumId),
        trackId: String(trackId),
        trackName,
        artistName,
        albumName
      });
    } else if (action === 'remove') {
      result = await favoriteTracksStore.removeFavoriteTrack({
        albumId: String(albumId),
        trackId: String(trackId)
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "add" or "remove"' });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Favorite track operation error:', err);
    res.status(500).json({ error: 'Failed to update favorite track' });
  }
});

// Get favorite tracks for an album
router.get('/album/:albumId', async (req, res) => {
  const { albumId } = req.params;
  
  if (!albumId) {
    return res.status(400).json({ error: 'Missing albumId' });
  }

  try {
    const favorites = await favoriteTracksStore.getFavoriteTracksByAlbum(albumId);
    res.json({
      albumId,
      favorites: favorites.map(row => ({
        trackId: row.track_id,
        trackName: row.track_name,
        dateFavorited: row.date_favorited
      }))
    });
  } catch (err) {
    console.error('Failed to fetch favorite tracks:', err);
    res.status(500).json({ error: 'Failed to fetch favorite tracks' });
  }
});

export default router;